# API/E2E Test Progress

Your own progress log while tests run. Read it first whenever you pick the run back up, or are unsure what has already run. Only add rows.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-11-17 18:40 | API-00 | Completed | Pass | `pnpm -C autobyteus-server-ts build` on HEAD 89f35132ed (code 0be36462ef); `evidence/API-00-server-build.log` |
| 2026-11-17 18:50 | API-04…API-10 | Started | | first run of `tests/e2e/memory/episodic-catalog.e2e.test.ts` (EC-01…EC-07), output `evidence/API-04-10-episodic-catalog-e2e.log` |
| 2026-11-17 19:05 | API-04…API-10 | Completed | Fail (test bug) | run 1: EC-01 called get_project_task without project_id (PROJECT_TOOL_ARGUMENT_INVALID); EC-02…07 cascaded. Log kept as `evidence/API-04-10-run1-test-bug.log`. Fixed in the test; rerun. |
| 2026-11-17 19:06 | API-04…API-10 | Started | | run 2 |
| 2026-11-17 19:20 | API-04…API-10 | Completed | Fail (test bug) | run 2: EC-01 sent to the task team mate before it had a run folder (RUN_NOT_FOUND from the host view). Test now has the task team coordinator message its mate. Log `evidence/API-04-10-run2-test-bug.log`. |
| 2026-11-17 19:21 | API-04…API-10 | Started | | run 3 |
| 2026-11-17 19:50 | API-04…API-10 | Completed | Fail (test) | run 3: EC-02, EC-03, EC-07 pass. EC-01: forbidden list held team/org root ids that the contract's journal paths contain (test). EC-04: a turn did not change the rendered entry (KB rounding), so nothing to write (test). EC-05: run-history index files + `.backup-<iso>` changed at the first dist/app.js start (index migrations naming; to confirm from output). EC-06: E's 0-run catalog correctly absent after episodic/ removed (test expectation). Logs `evidence/API-04-10-run3.log`. |
| 2026-11-17 19:55 | API-04…API-10 | Started | | run 4 (turns with unique ~2 KB replies; EC-04 new run in the unwritable window; EC-05 migration attribution) |
| 2026-11-17 20:10 | API-04…API-10 | Completed | Fail | run 4: EC-02…EC-05, EC-07 pass. EC-01: test read run_history_index.json from the wrong folder (test). EC-06: all rebuild/listing checks pass; no log line names the damaged team run T3 (product: readiness index records the diagnostic, logs nothing). `evidence/API-04-10-run4.log`. |
| 2026-11-17 20:12 | API-04…API-10 | Started | | run 5 (EC-01 index path fixed) |
| 2026-11-17 20:22 | API-04…API-10 | Completed | Fail (EC-06 only) | run 5: EC-01…EC-05, EC-07 Pass; EC-06 fails only on "a warning names the damaged run" (reproduced in runs 4 and 5). `evidence/API-04-10-episodic-catalog-e2e.log`, `evidence/API-04-10-e2e-evidence/`. |
| 2026-11-17 20:23 | API-11 | Started | | `pnpm -C autobyteus-server-ts test:unit`, output `evidence/API-11-server-unit-suite.log` |
| 2026-11-17 21:00 | API-11 | Completed | Fail (5, not this change) | 8321 passed / 5 failed: 4 agent-package-folder-watcher (no changed file in closure; fail alone at load 65-90, IMP-05), 1 append-only-message-logs-v1 timeout (5 s default; 1.7 s alone). `evidence/API-11-server-unit-suite.log`, `API-14-unit-failures-rerun.log`, `API-14b-…log` |
| 2026-11-17 21:05 | API-04…API-10 | Started | | run 6: burst turns instrumented (token absent before send, per-turn times) |
| 2026-11-17 21:20 | API-04…API-10 | Completed | Fail (EC-06 only) | run 6: same as run 5; burst turns proven real (token absent before send; journal 7-11 ms after send). `evidence/API-04-10-run6.log` |
| 2026-11-17 21:21 | API-04…API-10 | Started | | run 7: burst turns 2 s apart |
| 2026-11-17 21:35 | API-04…API-10 | Completed | Not Tested (environment) | run 7: first createAgentRun failed `AgyDiscoveryError: Antigravity model discovery timed out` (server spawning the scripted CLI `models` under load ~90); nothing of the catalog ran. `evidence/API-04-10-run7-env-agy-discovery-timeout.log`. Rerun. |
| 2026-11-17 21:36 | API-04…API-10 | Started | | run 8 (same test as run 7) |
| 2026-11-17 21:45 | API-04…API-10 | Completed | Not Tested (environment) | run 8: same AGY model discovery timeout at the first createAgentRun (the `--help` probe has a 3 s bound; the scripted CLI answers `models` in 38 ms when idle). `evidence/API-04-10-run8-env-agy-discovery-timeout.log`. Rerun. |
| 2026-11-17 21:46 | API-04…API-10 | Started | | run 9 |
| 2026-11-17 22:00 | API-04…API-10 | Completed | Fail (EC-06 only) | run 9 (authoritative): EC-01…EC-05, EC-07 Pass; EC-06 fails only on the damaged-run warning. `evidence/API-04-10-episodic-catalog-e2e.log` |
| 2026-11-17 22:01 | API-16 | Started | | server typecheck with the new test file |
| 2026-11-17 22:05 | API-16 | Completed | Pass | baseline 1012 in 316 files unchanged; `evidence/API-16-server-typecheck.log` |
| 2026-11-17 22:06 | API-12, API-13 | Completed | Next Round | integration and the whole E2E suite run once on the fixed commit (round ends Fail on API-09) |
| 2026-11-17 22:10 | — | Completed | Fail | round 1 closed; report, revision record and evidence committed in ba427ab13d; handoff to /code_reviewer for failure-origin review |
| 2026-11-17 23:30 | — | Checkpoint | | ROUND 2 (CRR-003, code 159286c1c1). Plan: rerun all (src changed in discovery, journal service/store, catalog): build, E2E file (EC-06 extended for IR-002), unit, both typechecks, integration, whole E2E. |
| 2026-11-17 23:31 | API-00 | Started | | build on 159286c1c1 |
| 2026-11-17 23:40 | API-00 | Completed | Pass | build on 159286c1c1 |
| 2026-11-17 23:41 | API-04…API-10 | Started | | round 2 run 1 of the E2E file; round-1 logs moved to `evidence/round1/` |
| 2026-11-17 23:50 | API-04…API-10 | Completed | Not Tested (interrupted) | round 2 run 1 stopped in EC-05 by an application restart (update to v1.5.13-beta.9); no case result; its temp data dir and HOME removed. `evidence/API-04-10-r2-run1-interrupted.log` |
| 2026-11-17 23:51 | API-04…API-10 | Started | | round 2 run 2 |
| 2026-11-18 00:05 | API-04…API-10 | Completed | Fail (test expectation) | round 2 run 2: EC-01…05, EC-07 Pass. EC-06 expected the damaged-metadata standalone run A to stay catalogued by its history row (handoff wording); in real use listCatalogRows offers only admitted rows (agent-run-history-catalog-service.ts:141), so A is left out, which REQ-012 allows with a warning. Test now expects A left out + RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE naming it; evidence captured before assertions. `evidence/API-04-10-r2-run2.log` |
| 2026-11-18 00:06 | API-04…API-10 | Started | | round 2 run 3 |
| 2026-11-18 00:15 | API-04…API-10 | Completed | Pass | round 2 run 3: 7/7 pass on 159286c1c1. `evidence/API-04-10-episodic-catalog-e2e.log` |
| 2026-11-18 00:16 | API-11 | Started | | whole server unit suite |
| 2026-11-18 00:45 | API-11 | Completed | Pass for this change (1 failure, FU-003) | 8331 passed / 1 failed: agent-package-folder-watcher (no changed file in closure; load-sensitive) |
| 2026-11-18 00:46 | API-12 | Started | | test:integration:prepare then test:integration |
| 2026-11-18 01:10 | API-12 | Completed | Pass for this change (8 watcher failures, FU-003) | 498 passed / 8 failed in file-system-watcher (no changed file in closure) and package-auto-refresh (composes no catalog/discovery/journal/run service); rerun alone fails a different set (10): file-event latency at load 70-110. `evidence/API-12-server-integration.log`, `API-12b-watcher-integration-rerun.log` |
| 2026-11-18 01:11 | API-13 | Started | | whole server E2E suite, clean env, gate RUN_AGY_FAILURE_E2E=1 with the scripted CLI (so the new file and AGY suites run) |
| 2026-11-18 01:12 | API-13 | Checkpoint | | correction: run as TESTING.md defines `pnpm test:e2e` (clean env, no gates); gated AGY suites stay skipped, the new file already ran gated (API-04…10) |
| 2026-11-18 02:40 | API-13 | Checkpoint | | whole E2E: 104 passed / 22 failed files (26 tests) / 146 skipped; rerunning the 23 failing file paths alone to find which reproduce |
| 2026-11-18 03:30 | API-13 | Checkpoint | | rerun alone: 14 files still fail; running the same 14 on the base commit 2b73308ce5 (own worktree ec493-api-e2e-base) to tell change-caused from pre-existing (Rule 9: causes of the start/stop timeouts not found from logs) |
| 2026-11-18 04:40 | API-13 | Completed | Pass for this change (22 failing files, each explained) | 9 pass alone; 11 fail on base 2b73308ce5 too; 3 (embedding-settings, grok-build-compaction-replay, file-explorer-websocket) pass alone on the branch, embedding-settings 4/4 with temporary ECDIAG timing logs (start pass <=394 ms, stop 0-1 ms; logs removed, src == 159286c1c1). Evidence API-13*.log |
| 2026-11-18 04:41 | API-16 | Started | | server typecheck with the round-2 test |
| 2026-11-18 04:50 | API-16 | Completed | Pass | baseline unchanged |
| 2026-11-18 04:55 | — | Completed | Pass | round 2 closed; base worktree removed; no leftover temp dirs or processes |
| 2026-11-18 05:00 | API-04…API-10 | Started | | round 2 run 4: EC-06 adds a damaged org tree (O3) to close the org-tree gap (was unit + reading only) |
| 2026-11-18 05:20 | API-04…API-10 | Completed | Pass | round 2 run 4 (authoritative): 7/7, damaged org tree included; API-16 rerun Pass |
| 2026-11-18 05:25 | — | Completed | Pass | round 2 closed: Pass, 95%; handoff to /code_reviewer for test-code review |
