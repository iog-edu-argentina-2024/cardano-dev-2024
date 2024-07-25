use aiken/hash.{Blake2b_224, Hash}
use aiken/interval.{Finite}
use aiken/list
use aiken/time.{PosixTime}
use aiken/transaction.{ValidityRange}
use aiken/transaction/credential.{Script, VerificationKey}

pub type PKH =
  Hash<Blake2b_224, VerificationKey>

pub type ScriptHash =
  Hash<Blake2b_224, Script>

pub fn must_be_signed_by(people_that_signed, beneficiary) {
  list.has(people_that_signed, beneficiary)
}

pub fn must_be_after_deadline(range: ValidityRange, deadline: PosixTime) {
  when range.lower_bound.bound_type is {
    Finite(tx_earliest_time) -> deadline <= tx_earliest_time
    _ -> False
  }
}
