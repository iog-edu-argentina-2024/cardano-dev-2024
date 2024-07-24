use aiken/hash.{Blake2b_224, Hash}
use aiken/list
use aiken/transaction.{
  DatumHash, InlineDatum, Input, NoDatum, Output, ScriptContext, Spend,
  find_datum,
}
use aiken/transaction/credential.{ScriptCredential, VerificationKey}
use aiken/transaction/value.{AssetName, PolicyId}

type AssetClass {
  policy_id: PolicyId,
  name: AssetName,
}

type VerificationKeyHash =
  Hash<Blake2b_224, VerificationKey>

type OracleParams {
  o_nft: AssetClass,
  o_operator: VerificationKeyHash,
}

type OracleRedeemer {
  Update
  Delete
}

validator(params: OracleParams) {
  fn oracle(
    _datum: ByteArray,
    redeemer: OracleRedeemer,
    ctx: ScriptContext,
  ) -> Bool {
    when ctx.purpose is {
      Spend(this_script_output_reference) -> {
        let is_signed_by_operator =
          list.has(ctx.transaction.extra_signatories, params.o_operator)
        when redeemer is {
          Update -> {
            expect Some(oracle_input) =
              ctx.transaction.inputs
                |> transaction.find_input(this_script_output_reference)

            expect
              1 == value.quantity_of(
                oracle_input.output.value,
                params.o_nft.policy_id,
                params.o_nft.name,
              )

            expect ScriptCredential(oracle_hash) =
              oracle_input.output.address.payment_credential

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

            expect
              1 == value.quantity_of(
                oracle_output.value,
                params.o_nft.policy_id,
                params.o_nft.name,
              )
            let is_valid_output_datum =
              when oracle_output.datum is {
                NoDatum -> False
                DatumHash(dh) -> {
                  expect Some(d) =
                    find_datum([oracle_output], ctx.transaction.datums, dh)
                  expect _rate: ByteArray = d
                  True
                }
                InlineDatum(d) -> {
                  expect _rate: ByteArray = d
                  True
                }
              }
            is_signed_by_operator? && is_valid_output_datum?
          }
          Delete -> is_signed_by_operator?
        }
      }
      _ -> False
    }
  }
}
