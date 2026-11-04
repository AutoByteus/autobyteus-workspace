# API/E2E Test Progress — autobyteus-381

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 14:34 | API-05 | Started | | git grep at HEAD 67ed4d9e03 |
| 14:37 | API-07 | Started | | probe tests/agent-work-journal/zz-api07-probe.test.ts (temporary), phases base→reuse→grow→rebuild |
| 14:38 | API-05 | Completed | Pass | only release note, tickets/, test-results/ |
| 14:38 | API-07 | Checkpoint | | run 1: base/grow/rebuild pass; reuse fails on the OPEN file only (rendered on every ensureCurrent by design). Adding a memory-search skip phase and rerunning from a fresh dir |
| 14:39 | API-07 | Completed | Pass | run 2 authoritative; probe removed, copy in evidence; temp dirs removed |
| 14:39 | API-06 | Started | | server test:unit, then autobyteus-ts tests/unit, clean env |
| 14:49 | API-06 | Checkpoint | | first server test:unit attempt killed by my 10-min background limit (no result); restarting with 60-min limit, raw output /tmp/api06-server-raw.log |
| 15:01 | API-06 | Completed | Pass | server 925 passed/5 skipped; core 311 passed |
| 15:01 | API-08 | Started | | live journal e2e, RUN_LMSTUDIO_E2E=1, qwen3.6-35b-a3b; before: no model loaded |
| 15:03 | API-08 | Checkpoint | Fail | run 1 failed: model read_file('notes.txt') refused (relative path, policy since 4cb3167a26); cause in test prompt; baseline fix: task names absolute paths. Model unloaded. Next: rerun once |
| 15:03 | API-08 | Started | | run 2 with the baseline fix (uncommitted in worktree); before: no model loaded |
| 15:04 | API-08 | Completed | Pass | run 2 pass with baseline fix; model unloaded |
| 15:04 | API-09 | Started | | server typecheck gate over the baseline-fix test file |
| 15:06 | API-09 | Completed | Pass | 1184/366 = baseline; PASS |
