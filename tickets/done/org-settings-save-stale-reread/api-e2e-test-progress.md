# API/E2E Test Progress

Your own progress log while tests run. Read it first whenever you pick the run back up, or are unsure what has already run. Only add rows.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)
- Probe runs write to `/tmp/ab265e2e/<case>/` (output dir, ledger, stdout log); copied into `evidence/` after each case.

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-10-24T16:36:05Z | API-01..API-04 | Completed | Pass | Reused IMP-01, IMP-00, IMP-02, IMP-03 (code unchanged since 29b51ebcef); no rerun |
| 2026-10-24T16:36:05Z | setup | Completed | Pass | Server prebuild+build on a4e1a89993, exit 0 (/tmp/ab265e2e/build.log); observer copy at autobyteus-web/tests/.e2e-ab265-observer/ (remove at the end) |
| 2026-10-24T16:36:05Z | API-05 | Started | | probe --cases DCP-001..005,DCR-001..003, out /tmp/ab265e2e/API-05/out, ledger /tmp/ab265e2e/API-05/ledger.md; next API-06 |
| 2026-10-24T16:43:29Z | API-05 | Completed | Pass | 8 Pass / 0 Fail, 0 browser errors, cleanup receipt OK; 7 Saves, 0 "could not be refreshed"; DCP-003 Save took 2 reads (race met, handled). Evidence copied to evidence/API-05-* |
| 2026-10-24T16:43:29Z | API-06 | Started | | probe --cases (DCP-003,DCR-003)x6, out /tmp/ab265e2e/API-06/out, ledger /tmp/ab265e2e/API-06/ledger.md |
| 2026-10-24T16:50:13Z | API-06 | Completed | Pass | 12/12 cases Pass (ledger 12 "Completed Pass"), 0 browser errors, cleanup OK; observer: 12 Saves, reload after 12, Saved. 12, could-not-be-refreshed 0; 0 Saves met the race (publish after the read every time) |
| 2026-10-24T17:13:11Z | API-07 | Started | | NEW calibration: same 12-Save loop with the BASE agentOrgContextsStore.ts (git show 1138e8fbef:…) swapped in temporarily; out /tmp/ab265e2e/API-07; afterwards restore with git checkout and check git diff is empty |
| 2026-10-24T17:21:40Z | API-07 | Completed | Pass | Calibration as expected: BASE store 10/12 Pass, 2 DCP-003 Fail "Timed out waiting for saved" with the note "Settings were saved, but could not be refreshed…" (screenshot); store restored, git diff empty; cleanup receipt OK |
| 2026-10-24T17:22:26Z | cleanup | Completed | | removed autobyteus-web/tests/.e2e-ab265-observer; no probe processes left; next: report, revision record, commit, handoff |
