# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-10-20 16:44 | API-00 | Started | — | `pnpm -C autobyteus-server-ts build` at `676ecbbb7a` |
| 2026-10-20 16:46 | API-00 | Completed | Pass | `exit=0`; log copied to `evidence/api-e2e/API-00-server-build.log`. Next: write the two-server E2E (API-01 … API-19) |
| 2026-10-20 17:20 | — | Checkpoint | — | Solution Designer hold (ARCH-REV-003, SR-015): steps 3–6 will change. Run only the stable cases now (RC-01, RC-03, RC-20 of the E2E file); hold RC-02, RC-04 … RC-19, API-20/21/22 |
| 2026-10-20 17:21 | API-01/03/20 (RC-01, RC-03, RC-20) | Started | — | `vitest run …two-server.e2e.test.ts -t "RC-(01|03|20) "`, clean env, evidence dir `evidence/api-e2e/API-stable-run1` |
| 2026-10-20 17:01 | API-01/03/20 | Completed | Fail | run 1: RC-01 Pass, RC-20 Pass, RC-03 stopped at the first assertion (non-AutoByteus page → `PEER_UNREACHABLE`). Next: make that check soft (add a 404 variant) and rerun so the rest of RC-03 reports |
| 2026-10-20 17:02 | API-01/03/20 | Started | — | run 2, same command, evidence `evidence/api-e2e/API-03-stable-run2` |
| 2026-10-20 17:02 | API-01/03/20 | Completed | Fail | run 2: RC-01 Pass, RC-20 Pass, RC-03 Fail only on the two soft checks (F-001: HTML page and 404 both reported "could not be reached"); every other RC-03 check passed (the case reached its `record`). Next: report, revision record, commit, failure-origin request for F-001; then wait for the SR-015 code |
