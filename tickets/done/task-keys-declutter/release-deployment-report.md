# Delivery / Release / Deployment Report — task-keys-declutter

## Release / Publication / Deployment Scope

- Repository finalization into `origin/personal`, then a **stable release `v1.5.5`**, which includes every change merged since `v1.5.4`.
- `task_size=Small`, `architectural_risk=Low`, Direct route (SR-001 → IR-001 → API-REV-001). Architecture, source and test-code review: Not Applicable.

## Project Release Guide

- Release guide: `RELEASE.md` at `origin/personal@aa84fd026c`.
- Deviations: none.
- Proposed guide fixes: none. The user notes that the AutoByteus NFS Release workflow, which also runs on `v*` tags, is not part of this repository's release outcome (NFS is moving out of the superrepo).

## Handoff Summary

- Handoff summary artifact: `handoff-summary.md`
- Delivery revision record: `delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal@aa84fd026c`
- Latest tracked remote base checked: `origin/personal@aa84fd026c` (fetched at delivery start)
- Base advanced: `No`
- Local checkpoint commit: `Not needed`
- Integration method: `Already current`
- Post-integration executable checks rerun: `Yes`, as an extra check. `pnpm -C autobyteus-server-ts test:unit`: 715 files, 5,811 tests passed, 0 failed (`evidence/delivery/server-unit.log`). API/E2E had run only the Projects/GraphQL subset, and this change removes a GraphQL field.
- No-rerun rationale: not applicable. API/E2E's other runs were made on this exact state.
- Handoff state current with latest tracked remote base: re-checked before the merge (Repository Finalization).

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on:
  - API-REV-001: 97.2%, every category ≥ 96%, every AC (AC-001 to AC-005) directly proven.
  - Delivery read `evidence/api-e2e/desktop/dsk-declutter.json` (packaged worktree build, isolated instance):
    - board: 0 key lines on every card, each card starts with its summary, and the badge reads "Blocked by autobyteus-1" with its key tooltip;
    - tree: the copy and Temp rows show the summary only, with title and aria "Show Task in Projects: <summary>";
    - Task page: chip `autobyteus-2`, rows, picker options and the key URL;
    - schema: `TaskWorkerTaskView` without `taskKey`.
  - Delivery viewed the screenshots `dsk-d1-board-page-1440x900.png` and `dsk-d3-tree-1440x900.png`.
  - The full server unit suite passed (above).
- More evidence requested: `None`
- User check needed: `Yes`. The Task's Done-when asks for the user's check of the released build. It is pending until after the release.

## Release Decision

- Decision: **`Stable` `v1.5.5`**
- Decided by: the user. They said in advance (2026-10-17) "for the new task, we need to release a stable version", then answered "stable please" when asked. This supersedes the Task's Done-when wording "a beta release".

## Docs Sync Result

- Docs sync artifact: `docs-sync-report.md`
- Docs sync result: `Updated`. The change updated the server and web `projects.md`, and delivery corrected the opening of the web "Task keys" section.

## Release Notes Summary

- Release notes artifact: `release-notes.md`. Curated and user-facing, covering every change since `v1.5.4`; passed to `desktop-release.sh release 1.5.5 --release-notes tickets/done/task-keys-declutter/release-notes.md`.
- Release notes status: `Updated`. The draft was shown to the user in full on 2026-10-17. The user's reply confirmed stable ("i think we release stable version right? not beta") and raised no change to the notes, so they are used as drafted.

## Ticket State Transition, Repository Finalization, Release, Cleanup

- Ticket archived to `tickets/done/task-keys-declutter/`.
- Path hygiene: three implementation evidence logs had `:` in their names, which a Windows checkout rejects. This is the `v1.5.2-beta.1` failure that `RELEASE.md` warns about. They were renamed before any push, with `:` → `-`: `web-audit-localization-literals.log`, `web-guard-localization-boundary.log`, `web-guard-web-boundary.log`. No document referenced the old names. `check_repository_artifact_hygiene.py` now passes.

Recorded in the next revision entries as each step completes.

## Environment Or Persisted-Data Transition Notes

- None for this ticket (display-only, plus removal of one read field). The release also carries `20261017_project_task_keys_v1` from task-keys-and-dependencies, which users of `v1.5.4` run on first start; the beta channel already ran it.

## Rollback Criteria

- Roll back on a broken board, tree or Task page.
- Method: revert on `personal` and cut `v1.5.6`. Updates never downgrade. Docker users can pin `1.5.4`.
