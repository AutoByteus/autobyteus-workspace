# API/E2E Test Progress — mcp-real-server-test-fixtures

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 15:08 | API-01 | Started | — | worktree, TESTING.md row command, warm cache; scratch /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/mcp189-api |
| 15:09 | API-01 | Completed | Pass | 22 passed, 1 skipped (opt-in ungated); 17.0 s; ignored set unchanged; no leftovers |
| 15:09 | API-02 | Started | — | clone at /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/mcp189-api/clone/autobyteus-workspace; pnpm install (autobyteus-ts filter) |
| 15:10 | API-02 | Completed | Pass | clone, fresh uv env+cache (network): 22 passed, 1 skipped; clone ignored set unchanged |
| 15:10 | API-03..05 | Started | — | clone: offline-cached, no-uv, forced prep failure |
| 15:11 | API-03..05 | Completed | Pass | offline-cached: python used, 22 passed; no-uv: node 11 passed, python skipped 'uv unavailable (not on PATH)'; forced prep failure: node 11 passed, python skipped with uv offline error; skip reasons in suite titles |
| 15:11 | API-06 | Started | — | opt-in variants |
| 15:12 | API-06 | Completed | Pass | skips: no dir / missing folder; pptx-mcp 4 tools; yt-dlp-mcp 2 tools; start-pptx-mcp fails to spawn (deviation confirmed); user repos identical |
| 15:12 | API-07 | Started | — | opt-in call path on restored video-audio-mcp (test-owned) |
| 15:12 | API-07 | Completed | Pass | video-audio-mcp 32 tools; get_media_duration isError=false |
| 15:12 | API-08 | Started | — | src mutations (stdio env, http headers), restore with git checkout |
| 15:13 | API-08 | Completed | Pass (expected red) | 10 failed with src mutations; restored clean |
| 15:13 | API-09 | Started | — | matrix suite, Claude live cell |
| 15:14 | API-09 | Completed | Pass | claude cell: DONE, env+cwd, http expected |
| 15:16 | API-10 | Completed | Pass | repo ignored set identical to start (after removing the API-08 .venv side effect); scan clean; report written; committing |
