# Investigation Notes

## Stage

- Stage: `1` (Investigation + Triage)
- Date: `2026-03-07`

## Request Understanding

1. Team history rows should show `teamRunId` instead of `teamDefinitionName`.
2. Team rows should keep stable ordering; they must not jump due to activity-time updates.

## Entrypoints And Boundaries

- UI entry: `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
- Team row render: `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`
- Team projection/build boundary: `autobyteus-web/stores/runHistoryReadModel.ts` -> `buildRunHistoryTeamNodes(...)`
- Team node ordering logic: `autobyteus-web/stores/runHistoryTeamHelpers.ts` -> `buildTeamNodes(...)`

## Current Behavior

- Team row label now targeted to use `teamRunId`.
- Team list order currently sorts by `lastActivityAt` descending:
  - `buildTeamNodes(...)` returns `Array.from(nodesByTeamRunId.values()).sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))`.
- This causes live reordering when active conversations update timestamps.

## Impacted Files (Expected)

- `autobyteus-web/stores/runHistoryTeamHelpers.ts` (remove dynamic recency sort; keep stable insertion/source order)
- `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` (already changed label render)
- `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` (already includes run-id label assertion)
- `autobyteus-web/stores/__tests__/runHistoryReadModel.spec.ts` (add regression: no dynamic recency reordering)

## Risks / Unknowns

- If backend reorder occurs between fetches, frontend will reflect backend order; this change only removes client-side recency reordering.
- No `createdAt` field currently exists on `TeamTreeNode`; stable source/insertion order is the safest non-breaking behavior.

## Scope Triage

- Classification: `Small`
- Reason: one projection-ordering rule change + tests.
