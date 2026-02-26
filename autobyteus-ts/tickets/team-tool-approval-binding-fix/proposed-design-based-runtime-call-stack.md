# Proposed-Design-Based Runtime Call Stack - team-tool-approval-binding-fix

## Version
- v1

## UC-1: Team routes tool approval to a local agent member (primary path)
1. `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts:handleToolApproval(...)`
2. `autobyteus-server-ts/src/distributed/ingress/team-command-ingress-service.ts:dispatchToolApproval(...)`
3. `autobyteus-server-ts/src/distributed/team-run-orchestrator/team-run-orchestrator.ts:dispatchToolApproval(...)`
4. `autobyteus-ts/src/agent-team/context/team-manager.ts:dispatchToolApproval(...)`
5. `autobyteus-ts/src/agent-team/routing/local-team-routing-port-adapter.ts:dispatchToolApproval(...)`
6. `autobyteus-ts/src/agent-team/routing/local-team-routing-port-adapter.ts:ensureNodeIsReady(...)` resolves local `Agent` node
7. `autobyteus-ts/src/agent-team/routing/local-team-routing-port-adapter.ts` invokes `targetNode.postToolExecutionApproval(...)` directly on the object
8. `autobyteus-ts/src/agent/agent.ts:postToolExecutionApproval(...)`
9. `autobyteus-ts/src/agent/agent.ts:submitEventToRuntime(...)`
10. `autobyteus-ts/src/agent/runtime/agent-runtime.ts:submitEvent(...)`
11. Tool approval event enqueued to runtime queue; dispatch result accepted

## UC-2: Team routes tool approval to sub-team proxy (primary path)
1. Steps 1-6 same as UC-1, but resolved node is `AgentTeam` (no `agentId`)
2. `autobyteus-ts/src/agent-team/routing/local-team-routing-port-adapter.ts` invokes 4-arg proxy signature:
   - `(agentName, toolInvocationId, isApproved, reason)`
3. `autobyteus-ts/src/agent-team/agent-team.ts:postToolExecutionApproval(...)`
4. `autobyteus-ts/src/agent-team/runtime/agent-team-runtime.ts:submitEvent(...)`
5. Approval event routed inside sub-team runtime; dispatch accepted

## UC-3: Unsupported approval target (error path)
1. Steps 1-6 attempt target resolution
2. If resolved node lacks `postToolExecutionApproval`, return:
   - `errorCode=LOCAL_TOOL_APPROVAL_UNSUPPORTED_TARGET`
3. `team-manager.ts:dispatchToolApproval(...)` throws with routing rejection message
4. Upstream caller records error event and status transitions as defined by team runtime

## Branch / Decision Gates
- Gate A: `typeof targetNode.postToolExecutionApproval === "function"` required.
- Gate B: `targetNode.agentId` presence selects local agent vs sub-team signature path.

## State Mutation / Persistence Notes
- No persistence schema writes introduced by this fix.
- Runtime queue mutation occurs at agent/team runtime `submitEvent(...)` boundaries.

## Coverage Status
- UC-1 primary path: Yes
- UC-2 primary path: Yes
- UC-3 error path: Yes
- Fallback path: N/A for this focused fix
