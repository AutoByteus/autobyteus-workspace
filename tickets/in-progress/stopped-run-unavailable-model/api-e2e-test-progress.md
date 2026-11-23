# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` → Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-23 19:10 | BUILD | Completed | Pass | `pnpm -C autobyteus-server-ts build` on `22bc2b3415` (dist current) |
| 2026-11-23 19:15 | MH-01..MH-05 | Started | — | new built-server E2E, first runs; fixture and harness fixes (LM Studio has no verified capacity, so MH-02 moved to a custom endpoint's models; Org tree read via GraphQL) |
| 2026-11-23 19:40 | MH-01..MH-05 | Completed | Pass | 5/5 |
| 2026-11-23 19:45 | MH-MUT | Completed | Pass | two dist mutations each fail exactly the expected case, dist restored |
| 2026-11-23 19:50 | AC007 | Completed | Fail→Pass | 67/70 on first run; 3 Org-member switch suites (MS-04, EX-01, SB-01) stale in the test's own Org-tree read (Rule 9, base cause); fixed as a baseline fix; 13/13 after |
| 2026-11-23 20:05 | MH-06 | Completed | Pass | added after the first scorecard (restart + failed first start) |
| 2026-11-23 20:10 | TC, WEB-01, WEB-02 | Completed | Pass | server/web typecheck at baseline; web settings tests |
