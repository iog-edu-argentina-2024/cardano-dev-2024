use aiken/hash.{Blake2b_224, Hash}
use aiken/interval
use aiken/list
use aiken/time.{PosixTime}
use aiken/transaction.{ScriptContext, Spend, Transaction}
use aiken/transaction/credential.{VerificationKey}

type VestingParam {
  beneficiary: Hash<Blake2b_224, VerificationKey>,
  deadline: PosixTime,
}

validator(param: VestingParam) {
  fn vesting(_d: String, _r: Void, ctx: ScriptContext) -> Bool {
    let ScriptContext {
      transaction: Transaction { validity_range, extra_signatories, .. },
      purpose,
    } = ctx
    when purpose is {
      Spend(_) -> {
        let is_signed_by_beneficiary =
          list.has(extra_signatories, param.beneficiary)
        let is_after_deadline =
          interval.is_entirely_after(validity_range, param.deadline)
        is_signed_by_beneficiary? && is_after_deadline?
      }
      _ -> False
    }
  }
}
