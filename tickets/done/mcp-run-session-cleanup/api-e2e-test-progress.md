# API/E2E Test Progress — mcp-run-session-cleanup

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 16:28 | API-01 | Started | — | cleanup e2e, AGY scripted, clean env; scratch /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/mcp193-api |
| 16:29 | API-01 | Completed | Pass | 5 passed: terminate 816 ms, delete 780, wake 1420, pair 1856, idle 60983 ms |
| 16:29 | API-02a | Started | — | matrix: AGY scripted + Codex MCP client |
| 16:29 | API-02a | Completed | Pass | agy + codex-mcp-client: stdioProcessGoneAfterTermination true |
| 16:29 | API-02b | Started | — | matrix live: native, claude, grok |
| 16:31 | API-02b | Completed | Pass (native, claude); grok not run | native + claude stdioProcessGoneAfterTermination true; grok ERROR 429 subscription:free-usage-exhausted mid-turn (after its stdio call succeeded) |
| 16:31 | API-03 | Started | — | core build + server build + pnpm test:e2e (background) |
| 16:40 | API-03 | Completed | Pass | full e2e: 89 passed / 90 skipped files; 370 passed / 405 skipped; exit 0 |
| 16:40 | API-04 | Started | — | isolated-app start --build (background) |
| 16:48 | API-04 | Completed | Pass | baseline 6; runs 11 (4 mcp); after terminate 6 (mcp gone 1078 ms); wake new pair, then 6; app stopped clean |
| 16:48 | API-05 | Completed | Pass | user repo identical; scan clean; stray workspaces.json and server-ts/autobyteus-web removed |
