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
| 2026-11-02T07:39:59Z | round 2 | Started | | code 2dd3c665f5 (IR-002), head 5e77712afc; probes reworked (DLP/DCP/DCR/SSR/MRD); one stack run AFS + reworked cases, out /tmp/ab366e2e/r2-all |
| 2026-11-02T08:11:10Z | API-05 | Checkpoint | | reworked cases: all pass except SSR-003 (real: a failed readback after a committed Save shows 'Saved.' with a stale card); test-side fixes: focus restore, hub refocus, SSR-004 apart from DLP-007, DCR-001 member row |
| 2026-11-02T08:11:10Z | API-06 | Started | | model-routing-decisions probe (MRD-04 reworked) |
| 2026-11-02T08:15:52Z | API-02..API-04 | Completed | Pass | r2: AFS-001..003 Pass on 2dd3c665f5 (Org: settingsClosedBy [], pendingEditKept true, stopped Org copy Save 'Saved.') |
| 2026-11-02T08:15:52Z | API-05 | Completed | Fail | DLP-003..007, DCP-001..005, DCR-001..003, SSR-001/002/004 Pass after rework; SSR-003 Fail (real): committed Save + failed readback shows 'Saved.' with a stale card |
| 2026-11-02T08:15:52Z | API-06 | Completed | Pass | MRD-01..08 Pass; MRD-04 remote copy read-only with its node chip |
| 2026-11-02T08:15:52Z | observation | Completed | Follow-up | Org stopped by another client: Settings stay 'active' >= 20 s (FU-001) |
| 2026-11-02T08:33:10Z | round 3 | Started | | code 38f5a1eb1c (IR-003), head 5139b715b1; one stack: SSR-003 first, AFS-001..003, reworked cases (DLP-007 last), then MRD |
| 2026-11-02T08:40:21Z | round 3 | Interim | | stopped at the implementer's request (merge of origin/personal with autobyteus-348 overlaps the code under test). Finished before the stop, on 38f5a1eb1c: SSR-003, AFS-001, AFS-002, AFS-003, SSR-001, SSR-002, SSR-004 Pass. Full set to run on the merged head |
