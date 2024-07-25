use aiken/dict.{to_pairs}
use aiken/list
use aiken/transaction.{Mint, OutputReference, ScriptContext, Transaction}
use aiken/transaction/value.{from_minted_value, tokens}

// NFT policy (same as week05's one)
validator(utxo_ref: OutputReference, token_name: ByteArray) {
  fn nft_policy(_r: Data, ctx: ScriptContext) -> Bool {
    // Pattern-match to get policy_id and Fail if it's not a minting transaction
    expect Mint(policy_id) = ctx.purpose
    // Pattern-match to get the transaction inputs and minted values
    let ScriptContext { transaction: Transaction { inputs, mint, .. }, .. } =
      ctx
    // Pattern-match to get the minted tokens and Fail if it's not a single asset minted
    expect [Pair(asset_name, amount)] =
      mint |> from_minted_value() |> tokens(policy_id) |> to_pairs()
    // Check if the transaction consumes the utxo_ref passed as parameter
    let is_ouput_consumed =
      list.any(inputs, fn(input) { input.output_reference == utxo_ref })
    // Final checks
    is_ouput_consumed? && (1 == amount)? && (asset_name == token_name)?
  }
}
