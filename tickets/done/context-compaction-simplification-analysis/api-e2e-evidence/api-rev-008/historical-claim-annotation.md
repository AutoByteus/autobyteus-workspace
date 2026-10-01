# Historical evidence annotation — CRR012 / TR-001
The original **api-rev-007/flow.log, line 475** emits
`directSummaryShieldOmissionPressureVerified: true`.
This is an **unsupported reporting claim**, left as a literal after F006 retired
the corresponding checker. The run did not calculate or prove it. Exclude this
field from acceptance evidence; do not interpret it as successful omission
pressure, whole-history glyph absence, or a new compaction requirement.

Original log SHA256: `66411303344b6c8ca6e894822df1a04a822952f20be6076297ed4b1f6e54f250`. The file and all original observations
are unchanged. The matching reviewer excerpt at
`code-review-evidence/crr-012/stale-claim-runtime-excerpt.json` is also unchanged.
This annotation applies equally when this API007 record is quoted elsewhere.

Task framing, safe Unicode (not a U+FFFD ban), source tool-tail, exact source
immutability, actual threshold crossing, tool ordering, artifact and snapshot/
next-parent equality retain their separate evidence. API007's Pass95.0 and real
successes are not rescored or turned into product failures. CRR012 remains the
historical test-review Fail, pending independent review of this correction.

API008 removes the field from the type, returned object and consumer expectation.
The existing generic JSON serializer remains untouched; no masking/filtering
layer is added. New source-contract guards prove the field is absent in both
producer/type and registered consumer; they do not claim a new live execution.
