# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` (Planned Cases)

- Note: this log was written after the local cases had run while the remote run was building (they were parallel and short). The `Time` column is exact where it comes from a log header or a GitHub timestamp (API-01 start and end, API-03, API-04, API-04b) and approximate for the other rows; the evidence files carry their own header dates.

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-01T06:44Z | API-01 | Started | — | pushed `codex/packaging-dependencies-build` at 92ff204d33; dispatched release-desktop.yml, publish_release=false: run 41282003912 |
| 2026-11-01T06:44Z | API-03 | Started/Completed | Pass | invalid override ×3 and no git: each exits 1 in ≤1 s with no build output |
| 2026-11-01T06:45Z | API-04 | Started | — | mutations on a copy; first harness lacked the sibling test-support folder (every case failed to load, control included): discarded and redone |
| 2026-11-01T06:45Z | API-04 | Completed | Pass | control 5/5; M-A, M-B, M-C, M-D each fail the matching cases; control again 5/5 |
| 2026-11-01T06:45Z | API-04b | Completed | Pass | control exit 0; dev-only import and undeclared import exit 1; type-only import exit 0 |
| 2026-11-01T06:48Z | API-05 | Completed | Pass | clone at 6777be781f, override 2026-10-30T12:00:00Z: `npm install is bounded to packages published before 2026-10-30T12:00:00Z`, 321 packages, stops at the POSIX symlink check as in IMP-06; 0 direct dependencies installed after the bound, 3 had newer versions kept out |
| 2026-11-01T06:55Z | API-02 | Completed | Pass | new 674.1 → 833.3 MB, base 827.3 → 986.6 MB (du); startup passes on both |
| 2026-11-01T07:11Z | API-01 | Completed | Pass | run 41282003912 success on all five targets; publish job skipped |
| 2026-11-01T07:14Z | API-06 | Completed | Pass | Python 15 tests OK; npm-before 10; server architecture 6; declared imports; codegen:check current |
