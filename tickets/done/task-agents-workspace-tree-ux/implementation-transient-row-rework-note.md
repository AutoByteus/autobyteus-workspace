# Implementation Rework Note — Transient Row Status Icon and Disclosure

Date: 2026-07-01
Owner: implementation_engineer
Classification: Design clarification implementation rework

## Trigger

Solution design clarified two Workspaces tree requirements after user Electron review:

1. A transient task-agent/task-team row must have exactly one visible dotted/dashed circular marker, and that marker must replace the normal leading status dot.
2. A transient `task_team` row with child rows must be collapsed by default and only reveal/hide child rows through user disclosure.

Authoritative design rework artifact:
`/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/design-rework-transient-status-icon-semantics.md`

## Implementation summary

- Extended the shared Workspaces `StatusDot` system with a typed `variant="transient"` option backed by transient dashed/hollow status-color presentation helpers.
- Reworked `WorkspaceTransientExecutionRow.vue` so transient rows render:
  - one leading dashed/hollow status dot in the existing status-dot slot;
  - light ghost row background;
  - no dotted initials/avatar circle;
  - no trailing dotted/dashed marker;
  - no visible temporary text in the row body.
- Added optional disclosure handling to `WorkspaceTransientExecutionRow.vue` using the same Workspaces row disclosure styling pattern.
- Updated `WorkspaceHistoryWorkspaceSection.vue` visibility filtering so transient `task_team` rows with children use the existing `workspaceId + teamRunId + memberRouteKey` expansion state contract and are collapsed by default.
- Updated component/presentation tests to assert the single-marker anatomy and transient task-team collapsed/expand/collapse behavior.

## Files changed

- `autobyteus-web/components/workspace/common/StatusDot.vue`
- `autobyteus-web/utils/workspaceStatusDotPresentation.ts`
- `autobyteus-web/utils/__tests__/workspaceStatusDotPresentation.spec.ts`
- `autobyteus-web/components/workspace/history/WorkspaceTransientExecutionRow.vue`
- `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`
- `autobyteus-web/components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts`

## Local implementation checks

Passed after the rework:

- `pnpm exec nuxi prepare`
- `pnpm test:nuxt run utils/__tests__/workspaceStatusDotPresentation.spec.ts utils/__tests__/workspaceTeamExecutionDisplayRows.spec.ts components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts components/workspace/team/__tests__/TeamActiveTaskNavigator.spec.ts components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts components/workspace/team/__tests__/TeamOverviewPanel.spec.ts stores/__tests__/runHistoryTeamRows.spec.ts stores/__tests__/runHistoryStore.spec.ts composables/__tests__/useWorkspaceHistorySelectionActions.spec.ts composables/__tests__/useWorkspaceHistoryTreeState.spec.ts`
- `git diff --check`
- `pnpm guard:web-boundary`
- `pnpm guard:localization-boundary`
- `pnpm audit:localization-literals`

Notes:

- The localization audit still prints the pre-existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning for `localization/audit/migrationScopes.ts`; it passes with zero unresolved findings.
- `WorkspaceHistoryWorkspaceSection.vue` remains under the implementation-engineer source-file guardrail at 496 non-empty lines.
