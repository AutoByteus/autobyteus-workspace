# API/E2E Test Progress

Read it first whenever you pick the run back up. Only add rows.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-02T05:59:07Z | API-01 | Completed | Pass | Reused IMP-01..07 at cba2e085e7 |
| 2026-11-02T06:02:53Z | API-02..API-04 | Started | | AFS-001..003, out /tmp/ab366e2e/AFS-r1 |
| 2026-11-02T06:12:19Z | API-02, API-04 | Checkpoint | Pass | AFS-001, AFS-003 pass (r2). AFS-002: Org row clicks close Settings (clearSelection -> showChat); run to completion to see the whole Org |
| 2026-11-02T06:44:56Z | API-02, API-04 | Completed | Pass | r7: AFS-001, AFS-003 Pass incl. next-message launches and server readback |
| 2026-11-02T06:44:56Z | API-03 | Completed | Fail | r8: Org row clicks close Settings and lose pending edits (AC-005, D-IMP-1); stopped Org copy Save stored but editor stuck in refresh-required (AC-003) |
| 2026-11-02T06:44:56Z | API-07 | Started | | folder picker rerun after probe locator fix (strict mode); R07/R08 need signed-in claude+codex: next round |
| 2026-11-02T06:55:53Z | API-07 | Completed | Pass (folder picker) | FP-P01,02,04-08 Pass; FP-P03 Not Tested (native dialog); R07/R08 next round |
| 2026-11-02T06:55:53Z | API-05, API-06 | Not run this round | | deferred: probes to rework after the Org fix |
