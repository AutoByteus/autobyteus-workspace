# API/E2E Test Progress — autobyteus-261 (Remote discovery)

Evidence: `evidence/api-e2e/` (beside this file).

| # | Step | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Investigation written (round 1) | — | `api-e2e-coverage-investigation.md` |
| 2 | Brief Studio importable package (`pnpm -C autobyteus-server-ts test:integration:prepare`) | exit 0 | `API-00-server-build.log` (last line) |
| 3 | API-00 server build at `d7bcd1b768` (code `93dc932920`) | exit 0 | `API-00-server-build.log` |
| 4 | Test changes: the scripted CLI's `LIST_TOOLS`; E2E RC-04 (new texts, `target`), RC-20 (two routes, answers), RC-26 … RC-29 (new); set-up: alpha's Scout (both tools), beta's Plain Helper (no description), Brief Studio on beta | — | test files |
| 5 | Full two-server E2E run 1 (exploratory) | 27/29: RC-26 (my regex `/writer$/` matched "Codex Writer") and RC-19 (the old unknown-node text); both test defects, fixed | `API-run1.log`, `API-run1/` |
| 6 | Full two-server E2E run 2 | 29/29 (281 s) | `API-run2.log`, `API-run2/` |
| 7 | API-30 real-model check: AutoByteus + DeepSeek (two nodes, test vault), then a Claude-runtime node (haiku, real HOME) | SCN-401 followed by the real model; AutoByteus exposure 8 vs 6 tools; Claude tool lists; C-1 not observed; all stopped, temp roots removed, the test's Claude session folder removed | `API-30/`, `API-30-*.mjs`, `API-30b-claude-node.mjs` |
| 8 | API-31 same-node suites, switch on | 42/43 files; the only failure is 191 FU-003 (:521/:639, same errors) | `API-31-same-node-e2e-switch-on.log` |
| 9 | E2E header updated; type check (no errors in the file apart from the config-wide TS6059) | — | test file |
| 10 | Full two-server E2E run 3 (final file) | 29/29 (279 s); cleanup clean | `API-run3.log`, `API-run3/` |
| 11 | FU-003 added (Claude connectors); report, revision record (API-REV-001 Pass, 95%) | → code reviewer | `api-e2e-execution-coverage-report.md` |
