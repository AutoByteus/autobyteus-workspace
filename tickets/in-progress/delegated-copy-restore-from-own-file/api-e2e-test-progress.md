# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-19 | API-01..API-05 | Completed | Pass | Reused IMP-01, IMP-02, IMP-07, IMP-04/05/06, IMP-09 (see investigation) |
| 2026-10-19T18:10:06Z | API-08 | Started | | server build |
| 2026-10-19T18:10:33Z | API-08 | Completed | Pass | `# Exit code: 0`; API-08-server-build.log |
| 2026-10-19T18:10:33Z | API-06 | Started | | web guards |
| 2026-10-19T18:10:41Z | API-06 | Completed | Pass | exit 0 0 0 |
| 2026-10-19T18:10:41Z | API-07 | Started | | server integration (background) |
| 2026-10-19T18:14:43Z | API-07 | Completed | Pass | 419 passed, 70 skipped; exit 0 |
| 2026-10-19T18:32:22Z | API-09 | Started | | startup + production-upgrade e2e, env -i, temp HOME |
| 2026-10-19T18:33:22Z | API-09 | Completed | Pass | 3 files, 9 tests passed; exit 0 |
| 2026-10-19T18:33:22Z | API-10..API-13 | Started | | full probe incl. DCR-001..003 (background); output /tmp/ab197e2e/probe-full-1, ledger /tmp/ab197e2e/probe-full-1.ledger.md |
| 2026-10-19T18:44:59Z | API-10 | Completed | Pass | probe 18 Pass 0 Fail; exit 0 |
| 2026-10-19T18:44:59Z | API-11 | Completed | Pass | probe 18 Pass 0 Fail; exit 0 |
| 2026-10-19T18:44:59Z | API-12 | Completed | Pass | probe 18 Pass 0 Fail; exit 0 |
| 2026-10-19T18:44:59Z | API-13 | Completed | Pass | probe 18 Pass 0 Fail; exit 0 |
