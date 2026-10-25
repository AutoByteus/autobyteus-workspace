# API/E2E Test Progress — agent-tool-results-omit-empty (autobyteus-260)

Read this first whenever the run is picked back up. Only add rows.

- Execution coverage report: [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md)
- Planned cases: [api-e2e-coverage-investigation.md](api-e2e-coverage-investigation.md) Planned Cases (same case IDs)
- Scratch logs (full, uncommitted): `/tmp/api-e2e-260/`; committed copies and excerpts in `evidence/API-*`

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-25 08:05 | — | Checkpoint | — | `pnpm -C autobyteus-server-ts build` on `45a0a7ea08` passed (`/tmp/api-e2e-260/build-1.log`) |
| 2026-10-25 08:06 | API-00 | Started | — | gated baseline `vitest run tests/e2e` (RUN_AGY_FAILURE_E2E=1), JSON to `/tmp/api-e2e-260/baseline-e2e.json` |
| 2026-10-25 08:27 | API-00 | Checkpoint | — | 122 of ~195 files done; durable edits made only to files whose baseline run had completed (originals in `/tmp/api-e2e-260/orig/`), plus the two new files and the web probes; waiting for the end of the run |
| 2026-10-25 08:30 | API-00 | Completed | Pass | baseline done: 27 failed / 118 passed / 50 skipped files (`evidence/API-00-baseline-e2e-failures.txt`) |
| 2026-10-25 08:31 | API-00b | Started | — | unexplained failures: launch-config, agy-native-image, skill-update-notice; temp diagnostic in launch-config (removed) |
| 2026-10-25 08:36 | API-01 | Started | — | per-file runs of updated in-process files (`/tmp/api-e2e-260/run.sh`) |
| 2026-10-25 08:37 | API-03 | Completed | Fail | keys-v1 FAILED case: titles NOT_RUN, other Projects' Tasks unlisted (F-001); diagnostic removed |
| 2026-10-25 08:38 | API-01 | Completed | Pass | after fixing two of my own expectations (GraphQL blank description, locality link) |
| 2026-10-25 08:40 | API-02 | Started | — | gated AGY journeys |
| 2026-10-25 08:58 | API-02 | Completed | Pass | after updating Temp-task acks (no projectId), existing-copy list/get split |
| 2026-10-25 08:59 | API-07 | Completed | Pass | remote two-server 37/37 |
| 2026-10-25 09:01 | API-05 | Completed | Pass | new startup E2E (summary is a string; details from the log) |
| 2026-10-25 09:02 | API-06 | Completed | Pass | new worker-scope E2E 6/6; receipt copied |
| 2026-10-25 09:05 | API-00b | Completed | Pass | base build `fc06a7355d`: same failures → FU-002/003/004; base worktree removed |
| 2026-10-25 09:06 | API-10 | Started | — | full gated regression |
| 2026-10-25 09:37 | API-10 | Completed | Pass | 4 failed files = F-001 + FU-002/003/004 |
| 2026-10-25 09:38 | API-09 | Completed | Pass | Codex MCP-client lane Pass; Codex routing case blocked (FU-005); throwaway CODEX_HOME removed |
| 2026-10-25 09:41 | API-11a | Completed | Pass | run 2 17/17 (run 1: my two probe misses fixed; PT-E2E-013 timing FU-006) |
| 2026-10-25 09:47 | API-11b | Completed | Pass | embedding probe 8/8 |
| 2026-10-25 10:20 | API-11c | Completed | Fail | 13/25 fail, all Error 500 from taskWorkerTaskStore dropping title (F-002) |
| 2026-10-25 10:21 | API-11d, API-12 | Completed | Not Tested | blocked by F-002; next round |
| 2026-10-25 10:22 | API-13, API-14, API-15 | Completed | Pass | sizes table, AC-009 grep (docs note), AC-010 review |
