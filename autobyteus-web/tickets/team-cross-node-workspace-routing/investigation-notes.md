# Investigation Notes

## Sources Consulted
- `/Users/normy/autobyteus_org/worktrees/team-history-restore/autobyteus-web/stores/agentTeamRunStore.ts`
- `/Users/normy/autobyteus_org/worktrees/team-history-restore/autobyteus-web/stores/agentTeamContextsStore.ts`
- `/Users/normy/autobyteus_org/worktrees/team-history-restore/autobyteus-web/components/workspace/config/RunConfigPanel.vue`
- `/Users/normy/autobyteus_org/worktrees/team-history-restore/autobyteus-web/components/workspace/config/TeamRunConfigForm.vue`
- `/Users/normy/autobyteus_org/worktrees/team-history-restore/autobyteus-web/components/workspace/config/MemberOverrideItem.vue`
- `/Users/normy/autobyteus_org/worktrees/team-history-restore/autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts`
- `/Users/normy/autobyteus_org/worktrees/team-history-restore/autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts`
- `/Users/normy/autobyteus_org/worktrees/team-history-restore/autobyteus-server-ts/tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts`
- Repro evidence from UI screenshots and runtime errors provided by user.

## Findings
- Prior behavior leaked host `workspaceId` into remote member configs and failed on remote bootstrap.
- Frontend now routes workspace per member:
  - embedded member: inherits selected host `workspaceId`,
  - remote member: `workspaceId = null`, must provide `workspaceRootPath`.
- `sendMessageToTeam` payload now carries both `workspaceId` and `workspaceRootPath` in each `memberConfigs[]` row.
- Backend resolver preserves both values and persists `workspaceRootPath` in team run manifest member bindings.
- Backend instance manager resolves workspace with precedence:
  1) `workspaceId` lookup on local node,
  2) when `workspaceId` absent and member is local to current node, use `ensureWorkspaceByRootPath(workspaceRootPath)`.
- Local-node enforcement exists: when a member is local-to-current-node and has no `workspaceId`, missing `workspaceRootPath` is treated as creation error.

## Constraints
- Remote node workspace filesystem is independent from host filesystem.
- No backward-compatibility wrappers should be added (clean behavior change only).
- Team run payload must remain per-member and explicit; no implicit node alias rewrite behavior.

## Unknowns Reduced
- Backend is not `workspaceId`-only anymore; it now accepts and uses `workspaceRootPath` for node-local workspace materialization when needed.
- Runtime ownership boundary is explicit: each node resolves only the members local to itself.
- The required remote workspace input is a functional requirement, not only a UX hint.
