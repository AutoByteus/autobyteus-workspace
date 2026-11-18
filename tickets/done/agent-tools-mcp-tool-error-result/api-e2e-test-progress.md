# API/E2E Test Progress

Read it first whenever you pick the run back up. Only add rows.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-24T17:32:16Z | API-01..API-04 | Completed | Pass | Reused IMP-00, IMP-02, IMP-03, IMP-04 (code unchanged since 253854bf8d) |
| 2026-10-24T17:32:16Z | API-05 | Started | | all four gates, clean env, CODEX_HOME=/private/tmp/ab232e2e/codex-home.P4SD (empty config.toml + auth.json symlink); LM Studio had no model loaded before; log /tmp/ab232e2e/API-05.log, summaries /tmp/ab232e2e/evidence |
| 2026-10-24T17:34:18Z | API-05 | Completed | Pass | 8 passed (agy, native, codex, claude × credentials, revoked); clean env; LM Studio model this run loaded is unloaded; throwaway CODEX_HOME removed |
