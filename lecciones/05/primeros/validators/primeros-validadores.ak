use aiken/hash.{Blake2b_224, Hash}
use aiken/list.{has}
use aiken/transaction.{ScriptContext, Spend, Transaction}
use aiken/transaction/credential.{VerificationKey}

// Validador que siempre permite consumir UTxO
validator {
  fn always_true(_datum: Void, _reedemer, _ctx: ScriptContext) -> Bool {
    True
  }
}

// Validador que sólo permite consumir si el redemer es 42
validator {
  fn forty_two(_d, secreto: Int, _ctx) -> Bool {
    secreto == 42
  }
}

// Validador que solo permite que una persona específica consuma

type PKH =
  Hash<Blake2b_224, VerificationKey>

validator {
  fn signed_by(pkh: PKH, _r, ctx: ScriptContext) -> Bool {
    let ScriptContext {
      transaction: Transaction { extra_signatories, .. },
      purpose,
    } = ctx
    when purpose is {
      Spend(_) -> has(extra_signatories, pkh)
      _ -> False
    }
  }
}
