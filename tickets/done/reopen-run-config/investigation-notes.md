# Investigation Notes

## Status
- Completed for re-entry understanding pass (Stage 1)

## Date
- 2026-02-27

## Re-Entry Trigger
- User feedback after prior handoff: row-level config buttons add visual clutter in history tree.
- Requested UX direction:
  - move config access to the selected run's event/chat header,
  - keep explicit view switch back from config to event view,
  - avoid adding more per-row actions.

## Problem Statement (Updated)
- Current implementation (`07d9db0`) opens config from run/team row cog buttons in `WorkspaceAgentRunsTreePanel`.
- This works functionally, but action density in the tree is high (terminate/delete/cog/time + team actions), reducing scan clarity.
- Better UX target: one contextual config action near the event monitor header for the selected run/team.

## Sources Consulted
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-codex-reopen-run-config/autobyteus-web/components/workspace/common/WorkspaceHeaderActions.vue`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-codex-reopen-run-config/autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-codex-reopen-run-config/autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-codex-reopen-run-config/autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-codex-reopen-run-config/autobyteus-web/components/workspace/config/RunConfigPanel.vue`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-codex-reopen-run-config/autobyteus-web/components/workspace/agent/__tests__/AgentWorkspaceView.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-codex-reopen-run-config/autobyteus-web/components/workspace/team/__tests__/TeamWorkspaceView.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-codex-reopen-run-config/autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`

## Key Findings
1. `WorkspaceHeaderActions.vue` is already shared by both `AgentWorkspaceView` and `TeamWorkspaceView` and currently emits only `newAgent`; this is the cleanest extension point for an `editConfig` action.
2. Event/chat views already have clear header context (agent/team identity + status), so config action there is contextually stronger than tree-row actions.
3. `workspaceCenterViewStore` already supports deterministic view switching (`chat`/`config`) and can be reused for header-triggered config opening.
4. `RunConfigPanel` already supports returning to chat via `showConversationView`; wording can shift to `Back to event view` to match user language.
5. Removing row cog buttons from history tree reduces crowded action clusters and decreases pressure on already-large `WorkspaceAgentRunsTreePanel.vue`.

## Constraints
- Keep backend/API untouched.
- Preserve existing selection semantics: selecting a row still opens event/chat view by default.
- Keep one explicit way to return from config to event view.

## Open Unknowns / Risks
- Need to decide icon/text for header config action so it is distinct from `New` (`+`) and avoids accidental run creation taps.
- Team header action should open config for active team context without changing focused member semantics.

## Scope Classification (Re-entry)
- Small
- Signals:
  - UI/store wiring only.
  - No cross-service dependencies.
  - Primary changes expected in header action component + view wiring + tree cleanup + tests.

## Implications For Requirements / Design
- Requirements must shift config-entry source from history row actions to selected event-header action.
- Runtime model should treat history selection as context-establishing step, then header action as mode switch trigger.
- Keep explicit config-exit action in panel for round-trip navigation.
