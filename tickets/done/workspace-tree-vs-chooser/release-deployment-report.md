# Delivery / Release / Deployment Report

## Scope

The left panel's three views, Remove moved to the chat chooser, and the run-history read windows (server and web). Finalization target `origin/personal`. No release.

## Project Release Guide

- `RELEASE.md` as on `origin/personal` @ `3ef5e33eec`, read in the ticket worktree. Deviations: `None`. Proposed fixes: `None`.

## Integration Refresh

- Already current with `3ef5e33eec`. Post-integration checks: the full clean-clone run DEL-00…10 (handoff summary).

## Verification

- Evidence judged: `Sufficient`.

| Acceptance-Criteria ID | Cases | Judgement |
| --- | --- | --- |
| AC-002 | WVC-002 (screenshots read), IMP-20 | Proven |
| AC-005 | WVC-002 refusal screenshot | Proven |
| AC-009 | WVC-003, PLN-01, PLN-10 | Proven |
| AC-010 | IMP-20 VIS-001 | Proven |
| AC-011 | WVC-003, API-02 | Proven |
| AC-012 | WVC-001, PLN-01/02/08 | Proven |
| AC-013 | IMP-20 VIS-001 | Proven |
| AC-014 | PLN-01, IMP-20 VIS-014…016 | Proven |
| AC-007 | DEL-01…10 (clean clone) | Proven; release only on the user's word |
| Read budget (250 ms) | API-02 | Within budget (p95 151 ms) |

- User check needed: `No`.

## Release Decision

- `No release`. AC-007: "release only on the user's word". He has said a separate beta release ticket is coming.

## Docs Sync Result

- `docs-sync-report.md`. The change's seven docs are verified. `DESIGN.md`, `TESTING.md` and `RELEASE.md` were reviewed and need no change. Delivery made no doc edits.

## Ticket State Transition

- Moved to `tickets/done/workspace-tree-vs-chooser/`: `Yes`

## Environment Or Persisted-Data Transition Notes

- No migration. Removing a folder unregisters it; files and history stay.

## Rollback Criteria

- Revert the merge on `personal`. No data change.

## Finalization Record

Recorded after the merge below.
