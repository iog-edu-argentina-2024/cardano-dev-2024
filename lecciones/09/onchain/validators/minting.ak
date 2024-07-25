use aiken/list
use aiken/transaction.{
  DatumHash, InlineDatum, Input, Mint, NoDatum, Output, ScriptContext,
  Transaction, find_script_outputs,
}
use aiken/transaction/credential.{ScriptCredential}
use aiken/transaction/value.{PolicyId, lovelace_of}
use onchain/stablecoin_shared.{CollateralDatum, get_total_minted_stablecoin}
use onchain/utils.{PKH, ScriptHash}

/// ///////////////////////////////////////////////////////////////////////////////////
/// //////////////////////////////// NOTES ////////////////////////////////////////////
///
/// ALGORITHM:
/// This script contains the bulk of the checks for minting, burning, and liquidating.
/// You can't use it by itself because there are some checks that need to be made on
/// the collaterall script. The algorithm is one of the simplest stablecoin algorithms
/// you could implement. This means it's great as an introduction to the topic, but
/// it has flaws that make it unsuitable for a real-world application. We'll talk about
/// them in class.
///
/// IMPLEMENTATION:
/// The script is divided into three parts: Minting, Burning, and Liquidating. Each part
/// has its own checks, although some of the logic is shared between them. The script
/// is optimized for readibility and simplicity, so it's not the most efficient one.
/// We'll talk about how to optimize it in class.
///
/// ///////////////////////////////////////////////////////////////////////////////////
/// ////////////////////////////// VALIDATOR //////////////////////////////////////////
///
type MintingParams {
  mp_oracle_validator: ScriptHash,
  mp_collateral_validator: ScriptHash,
  mp_collateral_minPercent: Int,
}

type MintingRedeemer {
  Minting
  Burning
  Liquidating
}

validator(params: MintingParams) {
  fn mint_stablecoins(redeemer: MintingRedeemer, ctx: ScriptContext) -> Bool {
    // Pattern-match to get policy_id and Fail if it's not a minting transaction
    expect Mint(policy_id) = ctx.purpose
    // Extract values needed from the context
    let ScriptContext {
      transaction: Transaction {
        inputs,
        outputs,
        reference_inputs,
        extra_signatories,
        ..
      },
      ..
    } = ctx
    when redeemer is {
      Minting -> {
        // Get oracle's reference rate.
        let oracle_rate: Int =
          get_oracle_rate(reference_inputs, params.mp_oracle_validator)
        // /// Get collateral output
        expect [collateral_output]: List<Output> =
          find_script_outputs(outputs, params.mp_collateral_validator)
        // /// Parse collateral output datum
        let collateral_output_datum: CollateralDatum =
          get_collateral_datum(collateral_output)
        // /// Get collateral's output amount of lovelaces being locked
        let collateral_output_amount: Int = lovelace_of(collateral_output.value)

        // /// Get amount of stablecoins minted in this transaction
        let stablecoin_minted_amount: Int =
          get_total_minted_stablecoin(ctx, policy_id)
        // /// Check that the amount of stablecoins minted is positive
        let check_mint_positive = stablecoin_minted_amount > 0
        // /// Check that the amount of stablecoins minted does not exceed the maximum
        let check_max_mint =
          max_mint(
            collateral_output_amount,
            oracle_rate,
            params.mp_collateral_minPercent,
          ) >= stablecoin_minted_amount
        // Check that the collateral datum has the correct values
        let check_collateral_output_datum =
          check_collateral_output_datum(
            collateral_output_datum,
            stablecoin_minted_amount,
            extra_signatories,
            policy_id,
          )
        // FINAL CHECKS
        and {
          check_mint_positive?,
          check_max_mint?,
          check_collateral_output_datum?,
        }
      }
      Burning -> {
        // Get collateral input
        expect [collateral_input]: List<Output> =
          find_script_outputs(
            list.map(inputs, fn(i) { i.output }),
            params.mp_collateral_validator,
          )
        // Parse collateral input datum
        let collateral_input_datum: CollateralDatum =
          get_collateral_datum(collateral_input)

        // Check that collateral's owner signature is present
        let check_owner_signature: Bool =
          list.has(extra_signatories, collateral_input_datum.col_owner)

        // Get amount of stablecoins minted in this transaction
        let stablecoin_minted_amount: Int =
          get_total_minted_stablecoin(ctx, policy_id)

        // Check that the amount of stablecoins burned is negative
        let check_burn_negative = stablecoin_minted_amount < 0

        // Check that the amount of stablecoins burned matches the amont at the collateral's datum
        let check_burn_matches_datum: Bool =
          -collateral_input_datum.col_stablecoin_amount == stablecoin_minted_amount
        // FINAL CHECKS
        and {
          check_burn_negative?,
          check_burn_matches_datum?,
          check_owner_signature?,
        }
      }
      Liquidating -> {
        // Get oracle's reference rate.
        let oracle_rate: Int =
          get_oracle_rate(reference_inputs, params.mp_oracle_validator)
        // Get collateral input
        expect [collateral_input]: List<Output> =
          find_script_outputs(
            list.map(inputs, fn(i) { i.output }),
            params.mp_collateral_validator,
          )
        // Parse collateral input datum
        let collateral_input_datum: CollateralDatum =
          get_collateral_datum(collateral_input)
        // Get collateral's input amount of lovelaces being unlocked
        let collateral_input_amount: Int = lovelace_of(collateral_input.value)
        // Get amount of stablecoins minted in this transaction
        let stablecoin_minted_amount: Int =
          get_total_minted_stablecoin(ctx, policy_id)
        // Check that the amount of stablecoins burned is negative
        let check_burn_negative = stablecoin_minted_amount < 0
        // Check that the amount of stablecoins burned matches the amont at the collateral's datum
        let check_burn_matches_datum: Bool =
          -collateral_input_datum.col_stablecoin_amount == stablecoin_minted_amount
        // Check if the collateral's value is low enough to liquidate
        let check_liquidation: Bool =
          max_mint(
            collateral_input_amount,
            oracle_rate,
            params.mp_collateral_minPercent,
          ) < -stablecoin_minted_amount
        // FINAL CHECKS
        and {
          check_liquidation?,
          check_burn_matches_datum?,
          check_burn_negative?,
        }
      }
    }
  }
}

// //////////////////////////////////////////////////////////////////////////////////////
// //////////////////////////////// HELPERS /////////////////////////////////////////////

fn check_collateral_output_datum(
  collateral_output_datum: CollateralDatum,
  stablecoin_minted_amount: Int,
  extra_signatories: List<PKH>,
  policy_id: PolicyId,
) -> Bool {
  // /// Check that the collateral's output datum has the correct values
  and {
    (collateral_output_datum.col_stablecoin_amount == stablecoin_minted_amount)?,
    (collateral_output_datum.col_minting_policy_id == policy_id)?,
    list.has(extra_signatories, collateral_output_datum.col_owner)?,
  }
}

fn get_oracle_rate(reference_inputs: List<Input>, oracle_val: ScriptHash) -> Int {
  // /// Filter all reference inputs to only the ones that come from the oracle script
  expect [oracle_input] =
    list.filter(
      reference_inputs,
      fn(i) {
        when i.output.address.payment_credential is {
          // /// If the input is from a script, save it if it's the oracle's one
          ScriptCredential(scriptHash) -> scriptHash == oracle_val
          // /// If the input is from a PKH, drop it 
          _ -> False
        }
      },
    )
  // /// Get oracle's rate from the datum
  expect oracle_rate: Int =
    when oracle_input.output.datum is {
      NoDatum -> fail @"Couldn't find oracle's datum"
      DatumHash(_datum_hash) -> fail @"Oracle's datum is not inlined"
      InlineDatum(datum) -> datum
    }
  oracle_rate
}

fn get_collateral_datum(output: Output) -> CollateralDatum {
  expect output_datum: CollateralDatum =
    when output.datum is {
      NoDatum -> fail @"Collateral output datum is missing"
      DatumHash(_datum_hash) -> fail @"Collateral output datum is not inlined"
      InlineDatum(datum) -> datum
    }
  output_datum
}

// /// max_mint calculates the maximum amount of stablecoins that can be minted with the given collateral.
//
// /// Oracle has ada price in USD cents [USD¢] ($1 is ¢100 in the oracle's datum). So rate needs to be divided by 100.
// /// Also, collateral_output_amount is in lovelaces [L], so final calculation needs to be divided by 1_000_000.
//
// /// ca = col_amount
// /// CMP = mp_collateral_min_percent
//
//
// ///                   ca [L]        rate [USD¢/ADA]                 ca [L]       
// ///              --------------- * ------------------           --------------- * rate [USD/ADA]
// ///                   CMP [%]        100 [USD¢/USD]                   CMP                         
// ///                 ---------                                               
// ///                   100 [%]                                               
// /// max_mint = ------------------------------------------- =  ------------------------------------- = [USD]
// ///                     1_000_000 [L/A]                                1_000_000 [L/A]
// /// 
fn max_mint(col_amount: Int, rate: Int, col_min_percent: Int) -> Int {
  col_amount / col_min_percent * rate / 1_000_000
}
