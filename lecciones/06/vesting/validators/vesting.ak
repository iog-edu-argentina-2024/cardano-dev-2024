use aiken/hash.{Blake2b_224, Hash}
use aiken/interval.{Finite, is_entirely_after}
use aiken/list
use aiken/time.{PosixTime}
use aiken/transaction.{ScriptContext, Spend, Transaction}
use aiken/transaction/credential.{VerificationKey}

type VestingDatum {
  beneficiario: Hash<Blake2b_224, VerificationKey>,
  deadline: PosixTime,
}

validator {
  fn vesting(d: VestingDatum, _r, ctx: ScriptContext) -> Bool {
    let ScriptContext {
      transaction: Transaction { extra_signatories, validity_range, .. },
      purpose,
    } = ctx
    when purpose is {
      Spend(_) -> {
        let is_beneficiary = list.has(extra_signatories, d.beneficiario)
        //let is_after_deadline =
        //  when validity_range.lower_bound.bound_type is {
        //    Finite(lb) -> d.deadline <= lb
        //    _ -> False
        //  }
        let is_after_deadline = is_entirely_after(validity_range, d.deadline)
        is_beneficiary && is_after_deadline
      }
      _ -> False
    }
  }
}
