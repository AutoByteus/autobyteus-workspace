# API/E2E Test Progress — autobyteus-460

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-11-13 13:05 | API-02 | Started | — | `pnpm -C autobyteus-server-ts test:unit` at `c7685b20c6`, load 12; log `evidence/api-e2e/API-02-unit-suite.log` |
| 2026-11-13 13:21 | API-02 | Completed | Pass | `Test Files  987 passed \| 5 skipped (992)`, `Tests  8441 passed \| 9 skipped (8450)`, EXIT 0 |
| 2026-11-13 13:22 | API-03 | Started | — | `pnpm -C autobyteus-server-ts test:integration`; log `evidence/api-e2e/API-03-integration-suite.full.log` |
| 2026-11-13 13:25 | API-03 | Completed | Pass | `Tests  536 passed \| 69 skipped (605)`, EXIT 0 (load 50 at start) |
| 2026-11-13 13:25 | API-04 | Started | — | five existing scripted E2E files, scripted AGY CLI |
| 2026-11-13 13:28 | API-04 | Completed | Pass | `Test Files  5 passed (5)`, `Tests  50 passed (50)` |
| 2026-11-13 13:28 | API-05 | Started | — | new agy-skill-definition-changes-transport.e2e.test.ts with GitHub gate |
| 2026-11-13 13:29 | API-05 | Completed | Pass | 3/3 (05a, 05b, 05c) first run; receipts in evidence/api-e2e/API-05/ |
| 2026-11-13 13:29 | API-08 | Started | — | web SystemTaskNotificationSegment spec |
| 2026-11-13 13:29 | API-04, API-05 | Checkpoint | — | first runs inherited the shell AUTOBYTEUS_* variables (moved to evidence/api-e2e/inherited-env-first-runs/); rerunning both under env -i as TESTING.md says |
| 2026-11-13 13:35 | API-04 | Completed | Pass | clean run: 49/50, SUN-E2E-001 AGY discovery `--help` 3 s bound timed out under five parallel E2E server starts; rerun alone 3/3 |
| 2026-11-13 13:35 | API-05 | Completed | Pass | clean env -i rerun 3/3 |
| 2026-11-13 13:35 | API-08 | Started | — | web spec |
| 2026-11-13 13:35 | API-08 | Completed | Pass | after nuxt prepare: 9/9 |
| 2026-11-13 13:35 | API-06, API-07 | Started | — | live suite, runtimes claude_agent_sdk,autobyteus,codex_app_server,grok_build,deepseek_harness; log evidence/api-e2e/API-06-07-live.full.log |
| 2026-11-13 13:39 | API-06, API-07 | Completed | Pass | 6/6 first run (5 runtimes + Claude without auto-execute), 165 s; evidence/api-e2e/live/*.json |
| 2026-11-13 13:41 | — | Checkpoint | — | reports written; dsh temp install removed; committing |
