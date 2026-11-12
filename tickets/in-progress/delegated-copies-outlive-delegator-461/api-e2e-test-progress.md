# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-12 00:21 | build | Started | | server build on bc223a8ae0; then API-E01 baseline whole server E2E (log /tmp/api461/API-E01-baseline.log) |
| 2026-11-12 01:34 | API-E01 | Completed | Fail | baseline: Test Files 54 failed, 129 passed, 71 skipped (254); Tests 152 failed; triage next |
| 2026-11-12 01:34 | API-E02 | Started | | contract stories acceptance test, first run |
| 2026-11-12 02:40 | API-E02 | Checkpoint | | runs 1–8: test-harness fixes (file-authored Study Group, runOf/receiverSaw from run files, default launches, result kinds); known differences listed with reasons |
| 2026-11-12 03:05 | API-E02 | Completed | Fail | run 9 (`/tmp/api461/stories-run9.log`): 5.1 14/25 clean (S17 contract vs REQ-009, S18–S24 follow; S10/S11/S14 update_task result shape, test fixed after the run); 5.2 8/9 (U2 delivery text); 5.3 5/9 (O5 TC-12 refusal; O6–O8 follow) |
| 2026-11-12 03:10 | API-E03 | Started | | built-server faithful upgrade on hand-built data |
| 2026-11-12 03:35 | API-E03 | Completed | Pass | run 8 (`/tmp/api461/API-E03-run8.log`); runs 1–7 were test/fixture fixes (listing rule BEH-007, package logs, org record fields, restart resume of P) |
| 2026-11-12 03:40 | API-E01 | Started | | in-process suites with the composition stand-ins (token-usage, projects-graphql, recent-run-projection, run-projection-toolcalls, archive) |
| 2026-11-12 03:45 | API-E01 | Checkpoint | | 6 in-process files pass (`/tmp/api461/API-E01-inprocess-r1.log`, `-r2.log`) |
| 2026-11-12 03:46 | API-B01/B02 | Started | | stopped-delegator-views probe SDV-01…03 (`/tmp/api461/API-B01-run1.log`) |
| 2026-11-12 04:05 | API-B01/B02 | Checkpoint | | runs 1–2: probe signal fixed (agent activity from the run's own status); frames sent recorded |
| 2026-11-12 04:20 | API-B02 | Completed | Pass | run 3 SDV-01: the stream closed at Stop, the view reconnected (`/tmp/api461/sdv-ev3`) |
| 2026-11-12 04:30 | API-B01 | Completed | Fail | run 3 SDV-02 (F-2: message sent to the coordinator, team restored); run 4 SDV-03 (F-3: org inspection refused with a delegated child) |
| 2026-11-12 04:40 | report | Completed | Fail | execution report, revision record API-REV-001, evidence committed next |
| 2026-11-12 (round 2) | build | Completed | Pass | round 2 on `f75cf6b96b` (code `9f4709571b`): server prebuild + build (`/tmp/api461/r2-build.log`); contract states regenerated from the SR-054 model (`--check` matches) |
| 2026-11-12 (round 2) | API-E02 | Started | | all three stories, drivers for S17/S19/S25 and O5–O7 updated (`/tmp/api461/r2-stories-run1.log`) |
| 2026-11-12 (round 2) | API-E02 | Started | | rerun after a power-off interrupted run 1 (`/tmp/api461/r2-stories-run2.log`) |
| 2026-11-12 (round 2) | API-E02 | Completed | Fail | run 2 (`/tmp/api461/r2-stories-run2.log`): 5.2 9/9 Pass; 5.1 12/26 (F-6 delivery text S4/S7/S9; model notes S11, S17+ B workspace; test fix S14); 5.3 6/9 (O6/O7 F-7; O8 follows). Diagnostics: `/tmp/api461/r2-o6-ev` (debug run 3) |
| 2026-11-12 (round 2) | API-B01/B02 | Started | | desktop probe SDV-01…03 with the O-1 rendered-status samples (`/tmp/api461/r2-sdv-run1.log`) |
| 2026-11-12 (round 2) | API-B01/B02 | Checkpoint | | desktop: SDV-01 Pass (O-1 agent: shown stopped throughout), SDV-03 Pass ×3 (O-1 org: `bg-gray-300`), SDV-02 Fail 3 of 4 (F-8: message to the child cleared, never sent) (`/tmp/api461/r2-sdv-ev*`) |
| 2026-11-12 (round 2) | API-B01 phone | Started | | build:mobile-web, then mobile-shell probe `--cases=MSP-37,MSP-38,MSP-39` |
| 2026-11-12 (round 2) | API-B01 phone | Completed | Fail | MSP-37 Pass ×2 (agent root; O-1 `offline` throughout); MSP-38/39 Fail (F-10: a stopped team's/org's delegated worker is not listed on the phone) (`/tmp/api461/r2-msp-ev`; temporary probe copy with the base's duplicate MSP-32 renamed, deleted after) |
| 2026-11-12 (round 2) | API-E01 | Started | | whole server E2E with the round-2 test updates (`/tmp/api461/r2-E01-run1.log`) |
| 2026-11-12 (round 2) | API-E01 | Completed | Fail | whole suite (`/tmp/api461/r2-E01-run1.log`): Test Files 47 failed, 138 passed, 71 skipped (256); 9 files fixed since baseline; stale hosting-model files remain (Next Round under the updated skill) |
| 2026-11-12 (round 2) | API-E01 | Checkpoint | | file-explorer-websocket-lifecycle alone: 3/3 passed twice (not stale) |
| 2026-11-12 (round 2) | API-B01 phone | Completed | Fail | final run (`/tmp/api461/r2-msp-final`): MSP-37 Pass, MSP-38/39 F-10 |
| 2026-11-12 (round 2) | API-E03 | Completed | Pass | rerun on f75cf6b96b (`/tmp/api461/r2-API-E03.log`) |
| 2026-11-12 (round 2) | report | Completed | Fail | API-REV-002; stale rewrites Next Round per the updated skill |
| 2026-11-12 (round 3) | build | Started | | round 3 on `da80596b0a` (merged state `8a47481617`); server prebuild + build |
| 2026-11-12 (round 3) | build | Completed | Pass | `/tmp/api461/r3-build.log` |
| 2026-11-12 (round 3) | API-E01 rewrite | Started | | shared harness: one-hop child reads (`runCollaborationStatuses`), own-run reads; batch 1 = harness-based project suites (`/tmp/api461/r3-batch1.log`) |
| 2026-11-12 (round 3) | API-E01 rewrite | Completed | Fail | batch 1: 5 files failed, 3 passed, 1 skipped; delegation-forest-restore, owner-scoped-member-file-changes, delegated-copy-project-folder rewritten; agent-run-collaboration-member-file-changes removed (CR-461-022) |
| 2026-11-12 (round 3) | CPW (collaboration-prompt-wording) | Checkpoint | Fail | checked against the requirements' non-goal ("no change to … collaboration texts") and contract §2.3/§2.5: product failures F-11 (prompt of a delegated run), F-12 (sender address that does not reach), F-13 (`@` in a message to a child row refused); focused runs `/tmp/api461/cpw-{p,h1,m2,m5}.log` |
| 2026-11-12 (round 3) | API-E01 rewrite | Started | | rerun of the rewritten files, background job (`/tmp/api461/r3-batch1b.log`) |
| 2026-11-12 (round 3) | API-E01 rewrite | Completed | Fail | `/tmp/api461/r3-batch1b.log`: delegated-copy-project-folder 8/8, owner-scoped-member-file-changes 2/2, team-task-event-current-contract 2/2 pass; collaboration-prompt-wording fails on F-11 … F-13 (valid); delegation-forest-restore (DF-1 … DF-3) and project-task-boundaries (4) still need rewriting: Next Round (the round ends at a product Fail) |
| 2026-11-12 (round 3) | API-E02 | Started | | stories §5.1 … §5.3 on the merged state, with the SR-057 peer-child poll check in S17; background job (`/tmp/api461/r3-API-E02.log`) |
| 2026-11-12 (round 3) | API-E02 | Completed | Fail (one known-difference text) | `/tmp/api461/r3-API-E02.log` (1375 s): §5.2 Pass, §5.3 Pass (F-7 resolved; C8-09: O6/O7 return their results), §5.1: only S11 differs = K-9 note with the corrected today's text (F-6 fix restored "Message delivered. X continues …"); S17's SR-057 poll check passed. K-9 pattern corrected |
| 2026-11-12 (round 3) | API-E02 §5.1 | Started | | rerun of §5.1 with the corrected K-9, background job (`/tmp/api461/r3-API-E02-5.1.log`) |
| 2026-11-12 (round 3) | API-E02 §5.1 | Completed | Pass | `/tmp/api461/r3-API-E02-5.1.log`: 26/26 states clean (814 s). API-E02 overall Pass (§5.2, §5.3 from the first run) |
| 2026-11-12 (round 3) | API-B01 desktop | Started | | SDV-01 … SDV-03 with the F-9 Team-tab check, background job (`/tmp/api461/r3-B01-desktop.log`) |
| 2026-11-12 (round 3) | API-B01 desktop | Checkpoint | | interrupted by a power-off after its stack started (no case result); rerun (`/tmp/api461/r3-B01-desktop-2.log`) |
| 2026-11-12 (round 3) | API-B01 desktop | Completed | Fail | `/tmp/api461/r3-B01-desktop-2.log`: SDV-02 Pass (F-8 resolved; Team tab "No team messages yet": F-9 resolved). SDV-01, SDV-03: the helper the worker delegated to is not shown under the worker within 30 s (REQ-002) — first real check of this step (round 2's query found no helper and skipped it). SDV-02 found no helper either: the step is made strict and SDV-02 rerun |
| 2026-11-12 (round 3) | API-B01 desktop | Started | | all cases with the strict helper step, background job (`/tmp/api461/r3-B01-desktop-3.log`) |
| 2026-11-12 (round 3) | API-B01 desktop | Completed | Fail | `/tmp/api461/r3-B01-desktop-3.log`: SDV-01, SDV-03 — the helper (delegated by the worker) is created but no row under the worker (`rowsShown` = the worker only): F-14. SDV-02 — the worker's second message refused in the browser: "already has a pending Team message admission": F-15. Team tab without the error panel in agent and team views (F-9 resolved); SDV-02's first child message answered live, root stays stopped |
| 2026-11-12 (round 3) | API-B01 phone | Started | | phone bundle rebuilt (`/tmp/api461/r3-mobile-build.log`), then MSP-50 … MSP-52 |
| 2026-11-12 (round 3) | API-B01 phone | Completed | Fail (probe) | `/tmp/api461/r3-msp.log`: MSP-50 Pass; MSP-51, MSP-52 list and reach the worker, the worker answers live and the root stays stopped (F-10 resolved), then the probe's own-member step clicked a row that is not on the run screen (no return to the list; the team member row is not named after the definition): probe fixed |
| 2026-11-12 (round 3) | API-B01 phone | Started | | rerun MSP-50 … MSP-52, background job (`/tmp/api461/r3-msp-2.log`) |
| 2026-11-12 (round 3) | API-B01 phone | Completed | Pass | `/tmp/api461/r3-msp-2.log`: MSP-50, MSP-51, MSP-52 Pass (F-10 resolved) |
| 2026-11-12 (round 3) | API-E03 | Started | | rerun: the run-history readers it reads through changed since round 2 (`team-run-service.ts`, `agent-run-history-service.ts`, `run-own-agents-reader.ts`, …); background job (`/tmp/api461/r3-API-E03.log`) |
| 2026-11-12 (round 3) | API-E03 | Completed | Pass | `/tmp/api461/r3-API-E03.log`: 1/1; "Scanned 14; migrated 14; skipped 0; failed 0."; second start "changed": [] |
| 2026-11-12 (round 3) | report | Completed | Fail | API-REV-003: F-6 … F-10 resolved (F-8 → F-15); new F-11 … F-15; remaining rewrites Next Round |
| 2026-11-12 (round 3) | type gate | Completed | Pass | `pnpm -C autobyteus-server-ts typecheck`: one new error fixed (DCF-03's helper type); baseline shrunk by the removed suite (1013 in 317 files); changed web probes pass `node --check` |
