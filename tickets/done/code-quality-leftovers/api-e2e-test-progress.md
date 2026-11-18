# API/E2E Test Progress — code-quality-leftovers

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-01T07:00Z | API-R01/R02 | Completed | Pass | Reused IMP-01..17 (git diff 534ad1f55e..HEAD outside tickets/ empty) |
| 2026-11-01T07:00Z | API-01 | Started |  | server prebuild+build, then gated E2E folders |
| 2026-11-01T07:18Z | API-01 | Completed | Pass (after baseline fix) | 268/269 then the one failing test fixed (stale since 47f44c3df6) and passed alone; commit e2c1b604d7 |
| 2026-11-01T07:18Z | API-02 | Started |  | projects-feature-probe |
| 2026-11-01T07:22Z | API-02 | Completed | Pass (after baseline fix) | 17/17; attempt 1 PT-E2E-017 stale since cba9eca3ef; fix 8e011a01bd |
| 2026-11-01T07:22Z | API-03 | Started |  | Settings with the real LM Studio host |
| 2026-11-01T07:23Z | API-03 | Completed | Pass | READY (real host), ERROR (Ollama closed), PARTIAL, READY again; states READY/ERROR/PARTIAL seen; no modelKind |
| 2026-11-01T07:23Z | API-04 | Started |  | RUN_LMSTUDIO_E2E native run, qwen/qwen3.6-35b-a3b; LM Studio had nothing loaded before |
| 2026-11-01T07:29Z | API-04 | Completed | Pass (after baseline fix) | integration suite rotted (FU-004); token-usage LM Studio case passes after local_no_api_bill fix; model unloaded |
