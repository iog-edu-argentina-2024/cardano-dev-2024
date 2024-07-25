use aiken/list
use aiken/transaction.{
  DatumHash, InlineDatum, Input, NoDatum, Output, ScriptContext, Spend,
  find_datum,
}
use aiken/transaction/credential.{ScriptCredential}
use aiken/transaction/value.{AssetName, PolicyId}
use onchain/utils.{PKH}

// This is not needed, but adding it to keeep it as close to the original as possible
type AssetClass {
  policy_id: PolicyId,
  name: AssetName,
}

// Script parameterized by OracleParams
type OracleParams {
  o_nft: AssetClass,
  o_operator: PKH,
}

// Oracle's Redeemer
type OracleRedeemer {
  Update
  Delete
}

// Oracle's Datum
type Rate =
  Int

validator(params: OracleParams) {
  fn oracle(_datum: Rate, redeemer: OracleRedeemer, ctx: ScriptContext) -> Bool {
    when ctx.purpose is {
      Spend(this_script_output_reference) -> {
        let is_signed_by_operator =
          list.has(ctx.transaction.extra_signatories, params.o_operator)
        when redeemer is {
          Update -> {
            // Get the oracle's input
            expect Some(oracle_input) =
              ctx.transaction.inputs
                |> transaction.find_input(this_script_output_reference)
            // Fail if oracle's input doesn't contain NFT
            expect
              1 == value.quantity_of(
                oracle_input.output.value,
                params.o_nft.policy_id,
                params.o_nft.name,
              )
            // Get the oracle's script hash
            expect ScriptCredential(oracle_hash) =
              oracle_input.output.address.payment_credential
            // Get the oracle's output
            expect [oracle_output] =
              list.filter(
                ctx.transaction.outputs,
                fn(o) {
                  when o.address.payment_credential is {
                    ScriptCredential(output_hash) -> oracle_hash == output_hash
                    _ -> False
                  }
                },
              )
            // Fail if oracle's output doesn't contain NFT
            expect
              1 == value.quantity_of(
                oracle_output.value,
                params.o_nft.policy_id,
                params.o_nft.name,
              )
            // Get and parse the oracle's output datum
            let is_valid_output_datum =
              when oracle_output.datum is {
                NoDatum -> False
                DatumHash(dh) -> {
                  // Fail if the datum is not there
                  expect Some(d) =
                    find_datum([oracle_output], ctx.transaction.datums, dh)
                  // Fail if the datum is not an integer
                  expect _rate: Rate = d
                  True
                }
                InlineDatum(d) -> {
                  // Fail if the datum is not an integer
                  expect _rate: Rate = d
                  True
                }
              }

            // Final checks
            // Only the operator can delete the oracle &&
            // Fail if the oracle's output datum is not valid
            is_signed_by_operator? && is_valid_output_datum?
          }
          Delete ->
            // Only the operator can delete the oracle
            is_signed_by_operator?
        }
      }
      _ -> False
    }
  }
}
