# Investigation Notes

## Sources Consulted
- User report + screenshots showing mixed-node team (`Professor` embedded, `Student` Docker remote) where only professor row displays workspace.
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/components/workspace/history/TeamRunsSection.vue`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/stores/runTreeStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/stores/agentTeamContextsStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/stores/agentTeamRunStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/utils/teamMemberWorkspaceRouting.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/components/workspace/config/RunConfigPanel.vue`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/api/graphql/types/agent-team-instance.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/default-distributed-runtime-composition.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/distributed/bootstrap/bootstrap-payload-normalization.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/agent-team-execution/services/agent-team-instance-manager.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/stores/__tests__/agentTeamContextsStore.spec.ts`

## Key Findings
1. The sidebar member workspace chip is rendered from `member.workspaceRootPath`.
   - `TeamRunsSection.vue` shows workspace only when `member.workspaceRootPath` is present.

2. In the live local-team projection path, `workspaceRootPath` is computed only from `memberContext.config.workspaceId`.
   - In `runTreeStore.ts#getTeamNodes`, fallback rows from active team contexts set:
     - `workspaceRootPath: resolveWorkspaceRootPath(workspaceStore, memberContext.config.workspaceId)`.

3. Remote members intentionally have `workspaceId = null` in local team contexts.
   - `resolveWorkspaceIdForTeamMember()` returns `null` for non-embedded nodes.
   - `agentTeamContextsStore.createInstanceFromTemplate()` uses that function for each member.
   - Existing tests assert this behavior (`agentTeamContextsStore.spec.ts`, remote member workspaceId is null).

4. Remote member workspace path is carried separately as `memberOverrides[memberName].workspaceRootPath` and is used for backend launch payload.
   - `agentTeamRunStore.sendMessageToFocusedMember()` includes:
     - `workspaceId: null` for remote member,
     - `workspaceRootPath` from member override.
   - Existing tests verify this payload shape (`agentTeamRunStore.spec.ts`).

5. The observed bug appears before/without backend history hydration.
   - Clicking Run in config creates a temporary local team context (`RunConfigPanel.handleRun -> createInstanceFromTemplate`) without backend dispatch.
   - At that moment, the UI projection path uses local member context (workspaceId-based), so remote member has no workspace chip even when override path exists.

6. Backend distributed bootstrap path preserves `workspaceRootPath` once run payload is dispatched.
   - Host bootstrap includes `memberBindings` snapshot.
   - Worker normalizes `workspaceRootPath` and creates team instance with those bindings.
   - No evidence of workspaceRootPath being dropped in host->worker bootstrap normalization.

## Root Cause (High Confidence)
`runTreeStore` local team fallback projection derives member workspace display strictly from `memberContext.config.workspaceId`. For remote members, `workspaceId` is intentionally null, and their configured path lives in `team config memberOverrides.workspaceRootPath`. The fallback projection does not consult this override path, so the remote member workspace is not displayed.

## Scope / Layer of Bug
- Primary: Frontend state projection / UI display (`autobyteus-web`).
- Not primary: Distributed backend workspace propagation (appears intact after launch payload stage).

## Open Unknowns / Validation Gaps
- Whether this issue should be display-only fix vs also reflected in focused-member active workspace behavior (Files/Terminal tabs) for remote members.
- Exact UX expectation for temporary team contexts before first message dispatch (show configured remote path label even if workspace is not locally mountable).

## Implications for Requirements/Design
- Requirements should explicitly separate:
  - local mountable workspace (`workspaceId`) vs
  - remote configured workspace path (`workspaceRootPath`).
- Team member row projection must use both sources and prioritize member-specific override path for remote members in local draft contexts.
