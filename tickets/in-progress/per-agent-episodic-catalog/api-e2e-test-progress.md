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
