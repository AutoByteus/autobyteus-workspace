# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` Planned Cases (API-01…API-08)
- Scratch folder (logs before excerpting): `/tmp/abyt199-api/`

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 10:37 | API-01 | Started | | MCP integration folder on HEAD 7c9cadba2f, clean env; log /tmp/abyt199-api/API-01.log |
| 10:37 | API-01 | Completed | Pass | 22 passed / 1 skipped (opt-in); fixture unchanged. Next: API-02 probe |
| 10:37 | API-02 | Started | | throwaway probe autobyteus-ts/tests/integration/tools/mcp/zz-api02-probe.test.ts (delete after) |
| 10:38 | API-02 | Completed | Pass | command=/usr/bin/env, env without location vars, minimal-env prefix = temp venv; probe deleted. Next: API-03 mutation |
| 10:38 | API-03 | Started | | mutation: env: config.env removed from stdio-managed-mcp-server.ts; whole MCP folder; revert after |
| 10:39 | API-03 | Completed | Pass | expected 6 failures (env/cwd + pid cases, both impls); Python starts; fixture unchanged; reverted clean. Next: API-04 negative control |
| 10:39 | API-04 | Started | | base launcher (aac5da3112) + same mutation; stdio file; expect fixture/.venv; revert + remove .venv |
| 10:40 | API-04 | Completed | Pass | base launcher + mutation created fixture/.venv (bin/python); reverted, .venv removed, autobyteus-ts clean. Next: API-05 offline skip |
| 10:40 | API-05 | Started | | UV_OFFLINE=1, empty UV_CACHE_DIR, fresh UV_PROJECT_ENVIRONMENT; stdio file |
| 10:40 | API-05 | Completed | Pass | full uv block to .whl URL in console + describe title; 5 passed / 5 skipped. Next: API-06 no uv |
| 10:40 | API-06 | Started | | PATH minus dirs with uv; stdio file |
| 10:41 | API-06 | Completed | Pass | 'uv unavailable (not on PATH)'; 5 passed / 5 skipped. Next: API-07 contract + mutations |
| 10:41 | API-07 | Started | | contract file unmutated, then mutation A, then B; each reverted |
| 10:41 | API-07 | Completed | Pass | unmutated 2/2 pass; A fails at 91; run 3 invalid (my insert landed in payload 1); run 4 = B on payload 2 fails at 108; reverted. Next: API-08 build + residue |
| 10:42 | API-08 | Started | | /tmp/abyt199-api/api08.sh in background: build, snapshot, core, server unit, e2e; outputs /tmp/abyt199-api/api08/ (exits.txt ends with DONE) |
| 11:07 | API-08 | Completed | Pass | build 0; core 387/26 files, 2356 tests; unit 752 passed; e2e 93 passed 0 failed; diffs: core 0, unit 0, e2e only tests/.tmp db-journal removed; 0 touched-prefix temp leftovers. Next: API-09 per-file counts |
| 11:07 | API-09 | Started | | 6 core + 6 e2e touched files, verbose, clean env |
| 11:08 | API-09 | Completed | Pass | core 6 files 72 passed, e2e 6 files 23 passed, 0 skipped; declarations base=HEAD; each D-5 file logs 'Custom app data directory set to … -appdata-'. Next: reports |
| 11:09 | — | Completed | Pass | Round complete: reports, revision record, FU-002 written; commit + handoff next |
