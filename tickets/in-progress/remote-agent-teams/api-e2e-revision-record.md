# API/E2E Revision Record — autobyteus-247 (Remote Agent Teams)

| Revision | Trigger | Code validated | Investigation round | Result | Durable coverage | Key evidence | Next |
| --- | --- | --- | --- | --- | --- | --- | --- |
| API-REV-001 | CRR-001 pass of IR-001 (Large / High) | `9ec78440e2` + `13131733b9` (HEAD `824562b6a2`) | 1 | **Fail**: F-001 (REQ-304/AC-301; the remote Team `delegate_task` result has no `node`). Everything else passes: two-server E2E runs 2 and 3, 23/24 each; same-node suites with the switch on, 44/45 files (only 191's pre-existing FU-003); browser journey on beta | two-server E2E: `targetRoot` contract; RC-04 Team refusals; RC-21 … RC-24 new; RC-12/RC-13 extended | `api-e2e-execution-coverage-report.md`; `evidence/api-e2e/API-run2`, `API-run3`, `F-001-remote-team-result-without-node.log`, `API-25-…`, `API-26-…` | Code reviewer: failure-origin review of F-001 (preliminary Local Fix, Implementation Engineer) |
| API-REV-002 | CRR-003 pass of IR-002 (F-001 fix) | `351b4dd93f` (HEAD `8df22369d9`), rebuilt dist | 1 (unchanged) | **Pass**: F-001 resolved. The two-server E2E passes 24/24 in runs 4 and 5; the fix's unit tests pass 13/13. API-25 and API-26 remain valid | RC-21's soft `node` check is now a hard check of the exact result keys | `API-00-server-build-round2.log`, `API-R2-unit-f001.log`, `API-run4`, `API-run5` | Code reviewer: proportional test-code review (Large / High) |

## API-REV-001 notes

- Run 1 also failed RC-23 because of my test defect: it used an ad-hoc Task ID for the saved-Task refusal, which needs a saved Project Task. I fixed it before runs 2 and 3, and I kept run 1's evidence.
- The first API-25 attempt was stopped by my tool's 10-minute background limit. The full rerun is the evidence.
- To rerun after the F-001 fix: build, run the whole two-server E2E once (one shared sequence), and run the serializer unit test. API-25 and API-26 stay valid, because the fix changes only result serialization.
