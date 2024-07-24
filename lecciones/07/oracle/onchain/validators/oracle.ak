use aiken/transaction.{ScriptContext}

validator {
  fn oracle(_d, _r, _ctx: ScriptContext) -> Bool {
    todo @"implement oracle validator"
  }
}
