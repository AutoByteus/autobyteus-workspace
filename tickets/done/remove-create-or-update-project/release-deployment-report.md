# Delivery / Release / Deployment Report — remove-create-or-update-project

## Release / Publication / Deployment Scope

- Finalize `codex/remove-create-or-update-project` into `origin/personal`, then publish beta `v1.5.6-beta.2`.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` @ `9b72c8d1c8` (2026-10-18, integrated from the base; only its NFS section changed)
- Deviations from the guide and why: `None`
- Proposed guide fixes, and whether the user agreed: `None`

## Handoff Summary

- Handoff summary artifact: `tickets/done/remove-create-or-update-project/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/remove-create-or-update-project/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `2f211340ee`
- Latest tracked remote base reference checked: `origin/personal` @ `f3124db10f`
- Base advanced since bootstrap: `Yes` (16 commits: standalone NFS extraction, PB-001 input-state cadence fix, unused-import cleanups)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed` (`20f554c6f2`, the untracked API/E2E and review artifacts, including the code reviewer's CRR reports; `*/dist/` excluded)
- Integration method: `Merge` (`8b3a202d27`, no conflicts, no file overlap)
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes`. Targeted, proportionate to the base change; logs in `evidence/delivery/dr-001/`:
  - `pnpm install --frozen-lockfile`: Pass
  - `pnpm -C autobyteus-server-ts build`: Pass
  - `pnpm -C autobyteus-server-ts typecheck`: Pass
  - unit tests in this ticket's scope, clean env (`vitest run tests/unit/agent-tools/project-tasks tests/unit/agent-execution/shared/project-tool-runtime-parity.test.ts tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.test.ts`): 5 files, 135 tests pass
  - `vitest run tests/e2e/projects/project-task-boundaries.e2e.test.ts`, clean env: 13/13
  - AC-004 `git grep create_or_update_project -- ':!tickets'` after the merge: only the allowed references
- Post-integration verification result: `Passed`
- Delivery edits started only after the integrated state was current: `Yes`
- Handoff state current with the latest tracked remote base: `Yes` (rechecked before the merge; see DR-001)

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on:
  - `api-e2e-execution-coverage-report.md` (API-REV-001): 96%, no category below 90%, every critical AC directly proven.
  - Delivery opened:
    - `app/picker-available-tool-names.json` (AC-001);
    - `app/journey/APP-OLD-MIXED.json`, `APP-OLD-ALONE.json`, `NATIVE-LAUNCH.json` and `app/instance-log-excerpt.txt` (AC-002, AC-006).
  - The integrated-state checks above.
- More evidence requested: `None`
- User check: the Task's done condition lists "the user's check". The user chose a beta (2026-10-18: "lets do for a new beta then"). The check is done by upgrading to the published beta, as for `v1.5.6-beta.1`. Recorded in DR-001.

## Release Decision

- Decision: `Beta` (`v1.5.6-beta.2`, the next unused beta according to `scripts/release_versions.py next-beta`)
- Decided by: the user, 2026-10-18: "lets do for a new beta then" (DEC-001 gives the type to the user).
- Release notes: pre-release tags use GitHub-generated notes (RELEASE.md). `.github/release-notes/release-notes.md` holds the **v1.5.5** stable notes and is left unchanged; it is accurate for v1.5.5. The ticket's `release-notes.md` (the removal note) is kept in the archive for the next stable release, whose curated notes must cover everything since v1.5.5.

## Docs Sync Result

- Docs sync artifact: `tickets/done/remove-create-or-update-project/docs-sync-report.md`
- Docs sync result: `Updated` in `6ba0389741`, and verified accurate on the integrated state. Delivery made no doc edit.

## Ticket State Transition

- Ticket moved to `tickets/done/remove-create-or-update-project`: `Yes`

## Version / Tag / Release Commit, Repository Finalization, Release Rollout

- Recorded in `delivery-revision-record.md` DR-001 (final refs appended after publishing).

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-create-or-update-project`
- Removal of the worktree and the local ticket/finalize branches: after the rollout is checked and the record pushed, confirmed in the terminal message.
- Remote branch cleanup result: `Not required`
- Isolated instances: none started by delivery.

## Deployment Steps

- None beyond the release workflows. The server rollout is the Docker image `autobyteus/autobyteus-server:1.5.6-beta.2`, which also moves `:beta`.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected`. Agent definitions that still list the old name launch without it (APP-OLD-*).
- Delivery action required: `None`

## Rollback Criteria

- If agents that list the old name fail to launch, or Project creation or update fails: revert the merge on `personal` and cut the next beta. Desktop updates never downgrade. Docker users pin `1.5.6-beta.1`.
