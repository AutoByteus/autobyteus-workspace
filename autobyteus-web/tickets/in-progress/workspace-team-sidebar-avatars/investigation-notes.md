# Investigation Notes

## Sources Consulted
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/stores/runHistoryStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/stores/agentDefinitionStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/stores/agentTeamDefinitionStore.ts`

## Key Findings
1. The left tree shown in the screenshot is rendered by `WorkspaceAgentRunsTreePanel.vue`.
2. Agent rows already render avatar images with fallback initials and broken-image recovery logic.
3. Team rows and team member rows currently render status dot + text only (no avatar UI).
4. Team avatar URLs are available in `agentTeamDefinitionStore` (`avatarUrl`) keyed by team definition id.
5. Member avatar URLs are available in `agentDefinitionStore` (`avatarUrl`) and can be resolved by member display name in current UX.
6. Existing tests in `WorkspaceAgentRunsTreePanel.spec.ts` already validate avatar behavior for agent rows and can be extended for team/member rows.
7. Team conversation area uses `AgentTeamEventMonitor -> AgentEventMonitor -> AIMessage`; `AgentTeamEventMonitor` was not forwarding focused member `agentName/agentAvatarUrl`, so AI bubbles used initials fallback.
8. Team header in `TeamWorkspaceView.vue` was still hardcoded to emoji (`👥`) and did not consume focused member avatar data.
9. Agent header in `AgentWorkspaceView.vue` already supported avatars, but only from run-context config; adding definition-store fallback improves restored/history cases where context avatar is absent.

## Constraints
- Keep existing status indicator behavior and row interactions unchanged.
- Keep fallback behavior when avatars are missing or image load fails.
- Avoid broad refactor of run-history projection or backend payload contracts.

## Open Questions
- None blocking for this ticket. Member name-to-definition-name matching may be imperfect in edge cases, but acceptable for this small UX enhancement.

## Implications
- Best implementation points:
  - `WorkspaceAgentRunsTreePanel.vue` for left-tree team/member avatar rendering and fallback tracking.
  - `AgentTeamEventMonitor.vue` for focused-member avatar/name pass-through into `AgentEventMonitor`.
  - Extend related component tests for both paths.
