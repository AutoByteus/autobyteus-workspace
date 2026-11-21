# API/E2E Test Progress — cross-node-file-transfer-587 (autobyteus-587)

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` § Planned Cases

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-21T13:48:40Z | API-02 | Completed | Pass (server) | server typecheck 1005 = baseline after my test edits |
| 2026-11-21T13:48:40Z | API-06 | Started | — | two-server suite, log /tmp/api587/API-06.log |
| 2026-11-21T13:58:33Z | API-06 | Checkpoint | 53/54 | RC-19 expected the old linked-route text; with node (RF-14) the unknown-node refusal is right; rewritten. Rerun RC-01..05+19 |
| 2026-11-21T13:59:14Z | API-06 | Completed | Pass | run 1 53/54 (RC-19 expectation), run 2 RC-19 Pass |
| 2026-11-21T13:59:14Z | API-07 | Started | — | contract stories |
| 2026-11-21T14:11:04Z | API-07 | Checkpoint | Fail (S18) | S18/S19 drivers sent without node: refused NODE_REQUIRED (RF-14); drivers now pass node node-a; rerun all three stories |
| 2026-11-21T14:33:08Z | API-07 | Completed | Fail (pre-existing, out of scope) | S18 delivered with node; only diff: 565's counterpart records the 461 model lacks (U9 too); §5.3 Pass; FU-002 |
| 2026-11-21T14:33:08Z | API-08 | Started | — | CPW suite |
| 2026-11-21T14:34:02Z | API-08 | Completed | Pass | 14/14 |
| 2026-11-21T14:34:06Z | API-09 | Started | — | build:mobile-web then mobile-shell --cases=MSP-08 |
| 2026-11-21T14:35:31Z | API-09 | Completed | Pass | MSP-08 |
| 2026-11-21T14:35:31Z | API-04 | Started | — | test:integration |
| 2026-11-21T14:40:23Z | API-04 | Completed | Pass after test fixes | 3 files stale from this change (Team manager remoteFiles, Claude timeout, node description); fixed, 29 passed |
| 2026-11-21T14:40:24Z | API-05 | Started | — | pnpm test:e2e |
| 2026-11-21T15:02:55Z | API-05 | Completed | Pass | 128 files passed, 574 tests, 0 failed |
| 2026-11-21T15:02:55Z | API-10 | Completed | Pass | tracked imports, 102275 files |
| 2026-11-21T15:02:55Z | API-02 | Started | — | web typecheck |
| 2026-11-21T15:04:13Z | API-02 | Completed | Pass (web) | 86 test-file errors = baseline; production 0 |
| 2026-11-21T16:21:45Z | API-11 | Started | — | round 2, T-001 of CRR-002: the 461 model states RF-14 (send_by_run_id node; NODE_REQUIRED/NODE_MISMATCH); S18/S19 pass node |
| 2026-11-21T16:21:45Z | API-11 | Checkpoint | Pass (model) | fixture regenerated: only S18/S19 call texts change; --check matches; walkthrough exit 0; probe 18 rows as the server orders them |
| 2026-11-21T16:21:45Z | API-07 | Started | — | rerun of gated §5.1 against the regenerated fixture |
| 2026-11-21T16:32:59Z | API-07 | Completed | Fail (FU-002 only) | rerun of §5.1: S18 differs only by the two counterpart lines (565), as in round 1 |
| 2026-11-21T16:32:59Z | API-11 | Completed | Pass | T-001 resolved |
| 2026-11-21T17:52:41Z | R3 plan | — | — | round 3 (IR-002 + merged base): rerun API-04, API-05, API-08, API-10 on 008981c6bd; reuse IMP-06 (whole unit), DEL-01 (typechecks), DEL-02 (two-server 54/54) |
| 2026-11-21T17:52:41Z | API-04 | Completed (R3) | Pass | 514 passed, 0 failed |
| 2026-11-21T17:52:41Z | API-05 | Completed (R3) | Pass | 128 files, 574 passed, 0 failed |
| 2026-11-21T17:52:41Z | API-08 | Completed (R3) | Pass | 14/14 |
| 2026-11-21T17:52:41Z | API-10 | Completed (R3) | Pass | 102566 files |
| 2026-11-21T19:18:24Z | R4 | Completed | Pass | merge 575c4ec9ed: integration 517, E2E 574, two-server 55 (cases renumbered RC-55..58), CPW 14, MSP-08, imports, fresh start; contract stories red (FU-002, FU-006); autobyteus-22 TF-04 red also on the base (FU-005) |
