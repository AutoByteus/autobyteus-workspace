# Scope Expansion Rework Note

## Status

Design re-entry completed — architecture review pending.

## Trigger

After the direct duplicate-header removal was implemented and delivery finalization began, the user expanded the scope on 2026-06-30. The new request reframes `By Task` / `By Model` as a result grouping/filter control that should live with the date range filter in the top controls card instead of in a separate tab row.

## Impact

- The prior direct-implementation delivery package is no longer final.
- Delivery was asked to pause finalization.
- Existing delivery-owned docs/build artifacts in this worktree describe only the header-removal scope and must be updated or regenerated after the expanded layout change is implemented and validated.
- The task now requires a design-principles pass because the UI ownership question changed from removing duplicate text to clarifying the control surface boundary.

## Design Direction Under Evaluation

Treat Settings > Token Statistics as one query/control surface:

`Settings sidebar selection -> Token statistics controls/filter card -> Token usage statistics store -> Task/Model result projection -> table/empty state`

The date range and grouping selector both belong to the token statistics controls owner. The separate tab row is stale presentation structure and should be removed if the expanded requirements are approved.

## Upstream Artifacts To Revise

- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-remove-header/tickets/done/token-statistics-remove-header/requirements.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-remove-header/tickets/done/token-statistics-remove-header/investigation-notes.md`
- Design spec produced after expanded requirements approval: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-remove-header/tickets/done/token-statistics-remove-header/design-spec.md`.

## Delivery Artifacts To Treat As Superseded Until Updated

- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-remove-header/tickets/done/token-statistics-remove-header/docs-sync-report.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-remove-header/tickets/done/token-statistics-remove-header/handoff-summary.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-remove-header/tickets/done/token-statistics-remove-header/release-deployment-report.md`
- The delivery edits in `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-remove-header/ui-prototypes/token-statistics-task-cost/` should be revisited after the new design/implementation lands.
