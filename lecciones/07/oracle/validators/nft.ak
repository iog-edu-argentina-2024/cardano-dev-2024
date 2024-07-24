use aiken/dict.{to_pairs}
use aiken/list
use aiken/transaction.{Mint, OutputReference, ScriptContext, Transaction}
use aiken/transaction/value.{AssetName, from_minted_value, tokens}

type Action {
  Minting
  Burning
}

validator(utxo_ref: OutputReference, token_name: AssetName) {
  fn nft(action: Action, ctx: ScriptContext) -> Bool {
    expect Mint(policy_id) = ctx.purpose
    let ScriptContext { transaction: Transaction { inputs, mint, .. }, .. } =
      ctx
    expect [Pair(asset_name, amount)] =
      mint |> from_minted_value |> tokens(policy_id) |> to_pairs()
    let is_output_consumed =
      list.any(inputs, fn(input) { input.output_reference == utxo_ref })
    when action is {
      Minting ->
        is_output_consumed? && (1 == amount)? && (asset_name == token_name)?
      Burning -> (-1 == amount)? && (asset_name == token_name)?
    }
  }
}
