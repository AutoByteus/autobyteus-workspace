# API/E2E Test Progress — autobyteus-661 T-3

Read it first whenever the run is picked up again. Only add rows. All runs are in API/E2E's clone `/tmp/661-api/clone` at b59628b4bf.

- Execution coverage report: `api-e2e-execution-coverage-report.md`; planned cases: `api-e2e-coverage-investigation.md`.

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-27 09:28 | setup | Completed | — | clone b59628b4bf, frozen install, prepare:source, build OK |
| 2026-11-27 09:41 | API-01/02 | Completed | Pass | new e2e file run 2: 5/5 (run 1: one expectation of mine wrong: Pair again keeps the row's name) |
| 2026-11-27 09:59 | API-03 | Completed | Pass | released 1.5.14-beta.7 → this package on the same volumes; ledger SUCCEEDED once; Pair again; second start unchanged; cleaned up |
| 2026-11-27 10:12 | API-04 | Completed | Pass | D-1, D-2a-control, D-2a, D-2b (runs 1–2 failed in the probe: desk path through the /tmp symlink, fixed) |
| 2026-11-27 10:14 | API-05 | Started | — | whole server E2E, env -i, fresh HOME; /tmp/661-api/e2e-full.log |
| 2026-11-27 10:39 | API-05 | Completed | Pass | 126 files pass; 3 suites needed test:integration:prepare (my setup), rerun 12/12 |
| 2026-11-27 10:39 | API-06 | Started | — | server test:unit then test:integration in the clone |
| 2026-11-27 10:59 | API-06 | Completed | Pass | unit 1101 files / 9199 tests; integration 93 files / 534 tests |
| 2026-11-27 10:59 | API-07 | Started | — | demo coverage spec + prepare-demo-web.sh --build + build:mobile-web, clone |
| 2026-11-27 11:01 | API-07 | Completed | Pass | demo answers all 259 operations; spec 8/8 on rerun (first run: no .nuxt yet); phone bundle rebuilt |
| 2026-11-27 11:01 | API-08 | Started | — | fresh clone /tmp/661-api/fresh at b59628b4bf; frozen install; build:electron:mac --arm64; verify steps |
| 2026-11-27 11:09 | API-08 | Completed | Pass | frozen install; build exit 0, typecheck PASS; Prisma + terminal runtime verify PASS |
