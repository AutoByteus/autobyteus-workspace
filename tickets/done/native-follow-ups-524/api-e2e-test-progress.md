# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-17 22:50 | SETUP | Completed | Pass | `pnpm -C autobyteus-ts build` at 42df66c542 (source 80483cce9d) |
| 2026-11-17 22:51 | API-01 | Started | — | burst probe N=10/60/200 × 3 rounds, log /tmp/524/API-01.log |
| 2026-11-17 22:41 | API-01 | Completed | Pass | 5×200, 3×60, 3×10: 0 failures; load 106–150; 200-burst whole calls 15–36 s |
| 2026-11-17 22:41 | API-02 | Started | — | start-cut probe B=200, then B=10, 60 |
| 2026-11-17 22:43 | API-02 | Completed | Pass | texts and outcomes right; cut-short return ≤0.7 s (B=10), ≤2.8 s (B=60), ~11 s (B=200): R-1 |
| 2026-11-17 22:44 | API-03 | Started | — | server test:unit whole, then test:integration (prepare first); logs /tmp/524/API-03-*.log |
| 2026-11-17 23:38 | API-03 | Completed | Pass | unit 8293 passed / 4 failed, integration 490 / 16: all in watcher files; watch events 7.7–9.8 s or none (fseventsd). Note: the SETUP/API-01 Started times above were written as 22:50/22:51; the logs show 22:37/22:38 |
| 2026-11-17 23:39 | API-04 | Started | — | gated background-task transport, tests/e2e/shutdown, tests/e2e/terminal |
| 2026-11-17 23:45 | API-04 | Completed | Pass | background-task 9/9, terminal 4/4, shutdown 3/3 (gated) |
