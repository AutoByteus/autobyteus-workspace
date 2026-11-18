# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-18 06:44 | API-01 | Started | — | SIGTERM stop probe x10, log /tmp/524r2/API-01.log |
| 2026-11-18 06:46 | API-01 | Completed | Pass | 10/10 exit 0, 47–71 ms, load 45–55, fseventsd 168 % |
| 2026-11-18 06:46 | API-02 | Started | — | IPC shutdown probe x10 |
| 2026-11-18 06:47 | API-02 | Completed | Pass | 10/10 reply complete 35–56 ms, exit 0 51–71 ms |
| 2026-11-18 06:47 | API-01/02 | Checkpoint | — | temporary mutation (exit stop removed): SIGTERM 0.35–12.5 s, 2/5 exit 1; IPC 2.4–17.3 s, 2/5 failed; restored, rebuilt, rechecked 49–64 ms |
| 2026-11-18 06:52 | API-03 | Started | — | test:integration:prepare + test:integration, /tmp/524r2/API-03.log |
| 2026-11-18 07:25 | API-03 | Completed | Pass | 495 passed, 11 failed in package-auto-refresh + file-system-watcher; branch vs base source overlap (3–8 vs 3–5); watch events 2.8–12.5 s or none; change cannot reach them |
| 2026-11-18 07:26 | API-04 | Started | — | whole pnpm test:e2e, /tmp/524r2/API-04.log |
| 2026-11-18 08:05 | API-04 | Completed | Pass | 555 passed, 9 failed in 8 files; AAR 6/6; no shutdown failures; all traced (FSEvents, FU-001 stale prompt test, FU-002 Grok probe), others pass alone |
