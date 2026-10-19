# API/E2E Test Progress — mcp-http-auth-headers

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 08:34 | — | Checkpoint | — | Server rebuilt at e129930bcf (`pnpm -C autobyteus-server-ts build`, exit 0) |
| 08:34 | API-01/API-02 | Started | — | built-server e2e mcp-http-auth-remote-server.e2e.test.ts, clean env |
| 08:36 | API-01/API-02 | Completed | Pass | 2 passed; mutation check API-01M red (2 failed) then restored; evidence API-01-*. Next: write runtime test, API-03 AGY |
| 08:37 | API-03 | Started | — | AGY scripted runtime, clean env |
| 08:43 | API-03 | Checkpoint | — | attempt 1 failed: test set no AGY_FAKE_CASE (fake's default error turn); test fixed (linked_skills, stop on ERROR); rerunning |
| 08:44 | API-03 | Completed | Pass | 1 passed, 3 skipped (gates); evidence API-03-*. Next: API-04 native LM Studio |
| 08:44 | API-04 | Started | — | native runtime + LM Studio qwen, clean env |
| 08:45 | API-04 | Completed | Pass | 1 passed, 3 skipped; LM Studio model unloaded; evidence API-04-*. Next: API-05 Codex live |
| 08:45 | API-05 | Started | — | Codex live, real HOME/USER/LOGNAME |
| 08:45 | API-05 | Checkpoint | — | attempt 1: model picker found none of its preferred ids; picker now falls back to the first listed model; rerun with CODEX_E2E_TOOL_MODEL=gpt-5.6-luna |
| 08:46 | API-05 | Completed | Pass | 1 passed, 3 skipped; evidence API-05-*. Next: API-06 Claude live |
| 08:46 | API-06 | Started | — | Claude live, real HOME/USER/LOGNAME |
| 08:46 | API-06 | Completed | Pass | 1 passed, 3 skipped; evidence API-06-*. Next: typecheck new tests, default (ungated) run, API-07 scan |
| 08:48 | API-01/02, API-03, API-08 | Started | — | final rerun after type-only cleanup of test files (bracket env access, typed server vars) |
| 08:49 | API-01/02, API-03, API-08 | Completed | Pass | final: 2 passed; 1 passed 3 skipped; 4 skipped (ungated). Evidence overwritten with final runs. Next: API-07 scan |
| 08:50 | API-07 | Completed | Pass | scan clean; evidence API-07-ac008-scan.txt. Next: report, revision record, commit, handoff |
| 08:52 | — | Checkpoint | — | report, investigation, revision record written; committing |
