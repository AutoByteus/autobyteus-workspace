# API/E2E Test Progress — autobyteus-313

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation
- Note: the cases ran one after another in one sitting. This log was written after they completed, not live, and
  its times are approximate. The results and evidence are each run's own output.

| Time (2026-10-27) | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 13:46 | API-01, API-02 | Started | — | live probe, branch server rebuilt from HEAD |
| 14:05 | API-01, API-02 | Completed | Pass | refusals with the check's messages; `--effort high` → reuse → `--effort low` new run; knowledge kept |
| 14:06 | API-03 | Started | — | isolated beta.12 instance on an owned data root |
| 14:20 | API-03 | Completed | Pass | same router run reused, `llmConfig` null, migration records identical |
| 14:21 | API-04 | Started | — | two-server E2E |
| 14:29 | API-04 | Checkpoint | — | RC-39 setup refused by the new save check (stale setup) → updated to a signed-out Claude router |
| 14:37 | API-04 | Completed | Pass | 41/41 |
