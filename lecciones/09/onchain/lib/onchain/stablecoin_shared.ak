use aiken/transaction.{ScriptContext}
use aiken/transaction/value.{PolicyId, from_minted_value, quantity_of}
use onchain/utils.{PKH}

const stablecoin_token_name = "USDA"

/// Get the number (as Int) of the amount of tokens minted in this transaction.
pub fn get_total_minted_stablecoin(
  ctx: ScriptContext,
  policy_id: PolicyId,
) -> Int {
  let stablecoin_minted =
    ctx.transaction.mint
      |> from_minted_value()
      |> quantity_of(policy_id, stablecoin_token_name)
  stablecoin_minted
}

pub type CollateralDatum {
  col_minting_policy_id: PolicyId,
  col_owner: PKH,
  col_stablecoin_amount: Int,
}
