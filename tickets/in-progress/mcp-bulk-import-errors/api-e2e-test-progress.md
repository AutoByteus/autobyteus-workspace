# API/E2E Test Progress — mcp-bulk-import-errors

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 05:39 | API-01 | Started | — | builds, then 3 e2e files; scratch /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/mcp190-api |
| 05:40 | API-01 | Completed | Pass | 6 passed (bulk import 2, 181 redirect/transport 2, 179 auth 2) |
| 05:40 | API-02/03 | Started | — | full server e2e then full web suite (background) |
| 05:54 | API-02 | Completed | Pass for MCP; 2 out-of-scope failures | 89 passed, 91 skipped, 2 failed files (memory-collaboration-graphql, team-task-event-current-contract): fixtures lack 'source', required since 65ae647bc9 (autobyteus-197); not touched by this branch |
| 05:54 | API-03 | Completed | Pass | web 642 files / 4571 tests passed |
| 05:54 | API-04 | Started | — | isolated-app start --build (instance A) |
| 06:05 | API-04/05 | Completed | Pass | A file imported into B identically (8/8); mixed/none/whole-input in B's window as required; restart identical; logs clean (first journey run had driver faults, fixed and fully rerun) |
| 06:05 | API-06 | Completed | Pass | both instances stopped; strays removed; committing |
