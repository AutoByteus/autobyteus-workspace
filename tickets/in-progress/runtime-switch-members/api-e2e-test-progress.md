# API/E2E Test Progress

Progress log of the autobyteus-348 validation. Note: the run was long and the conversation was compacted once; rows before the compaction were reconstructed from the saved logs (times are the log start times, UTC date 2026-11-02), later rows were written as the cases ran.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 04:41 | R0 | Completed | Pass | MS-01..04 baseline on `3261712e06`: 4 passed |
| 04:4x | EX-01..EX-03 | Completed | Pass | first extended run (3 cases); mutations X-A and X-B failed the matching cases, `dist/` restored with cmp |
| 05:3x | EX-04 | Completed | Pass | added after the first run |
| 05:54 | LV-01..03 | Completed | Fail | first live run: my own record-count threshold was too strict for Codex's shorter turn (3 records) in LV-01 and LV-02; assertion changed to "Codex recorded the message and its answer" |
| 05:55 | LV-01..03 | Completed | Pass | live Claude↔Codex run 2: 3 passed in 102 s |
| 05:58 | RSM-01..05 | Started | | exploratory runs against a held stack while the probe was written (selectors, sidebar reveal, Org stopped state) |
| 06:00 | RSM-02, RSM-03 | Checkpoint | Fail | found: Save of an Org member's switch shows a raw schema error (`pendingRuntimeSwitch` unrecognized key); confirmed with the contract schema directly |
| 06:01 | RSM-04 | Checkpoint | Fail | found: the saved copy row keeps showing the previous runtime until Settings is reopened |
| 06:0x | DCP-001..005 | Completed | Fail | existing copy probes: 5/5 fail at the obsolete `chat-model-locked-runtime` wait (screenshot shows the open runtime menu); probe updated |
| 06:1x | DCP-001..005 | Completed | Pass | after the update: 5/5 pass |
| 05:58 | RSM-01..05 | Completed | Fail | final run on a fresh stack: RSM-01 Pass, RSM-02 Fail, RSM-03 Fail, RSM-04 Fail, RSM-05 Pass |
| 06:03 | EX-01..04 | Completed | Pass | final run of the extended file: 4 passed |
| 06:05 | API-06 | Completed | Fail (pre-existing) | `existing-run-model-config`: the same 4 checks as at the base (FU-C2) |
| 06:07 | X-C | Completed | Fail (expected) | live LV-01 under a mutated recorder fails; `dist/` restored with cmp |
| 06:08 | API-07 | Completed | Fail | contract test red: Org tree DTO rejects a member's `pendingRuntimeSwitch` |
