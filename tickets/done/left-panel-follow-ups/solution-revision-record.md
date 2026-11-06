# Solution Revision Record: left-panel-follow-ups

| Revision | Date | Trigger | Requirements Change | Design Change | Approval |
| --- | --- | --- | --- | --- | --- |
| SR-001 | 2026-11-06 | Task autobyteus-388 (FU-001, FU-003, FU-004, FU-005 of autobyteus-385) | REQ-001…REQ-003, DEC-001 (keep `createAgentRun`), DEC-002 (rename), DEC-003 (re-read on the poll) | Remove the dead web document; rename to `RunSectionPanel`; `projectRunsStore` watches the root-run set. Small / Low | Solution Designer within the direction, user informed |
| SR-002 | 2026-11-06 | Code review CRR-001 CR-001: a Project's older Agent run archived elsewhere is not seen, because the Projects view's history read is windowed (E-08) | None (REQ-003 now met in full) | The Projects view reads the history with the window `null` (`historyWindowOf`: 6 only for Workspaces); a local check in a `projectRunsStore` spec; PLN-11 end to end. Same cost (E-09). Still Small / Low | Solution Designer within the direction, user informed |
