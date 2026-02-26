# Proposed-Design-Based Runtime Call Stack - tool-approval-e2e-coverage

## Use Case UC-1: Team tool approval over websocket
1. `tests/e2e/agent/team-tool-approval-websocket.e2e.test.ts:it(...)`
2. `src/api/websocket/agent.ts:registerAgentWebsocket(...)` registers `/ws/agent-team/:teamId`
3. WebSocket connect -> `src/services/agent-streaming/agent-team-stream-handler.ts:connect(...)`
4. `AgentTeamRunManager.getTeamRun(teamId)` gate validates team exists
5. `AgentTeamRunManager.getTeamEventStream(teamId)` provides async event stream
6. Stream event push (`TOOL_APPROVAL_REQUESTED`) enters `convertTeamEvent(...)`
7. `TeamCommandIngressService.issueToolApprovalTokenFromActiveRun(...)` issues token
8. Server sends `TOOL_APPROVAL_REQUESTED` payload with `approval_token`
9. Client sends `APPROVE_TOOL` message
10. `handleToolApproval(...)` parses token and canonicalizes `agentName = token.targetMemberName`
11. `TeamCommandIngressService.dispatchToolApproval(...)` receives routed approval
12. Assertion validates canonical member routing and approval metadata

## Use Case UC-2: Approval without token fallback
1. Client sends `APPROVE_TOOL` without `approval_token`
2. `handleToolApproval(...)` resolves `invocation_id + agent_name`
3. `issueToolApprovalTokenFromActiveRun(...)` fallback issuance executes
4. `dispatchToolApproval(...)` receives synthesized token and approval decision
5. Assertion validates fallback path dispatch correctness
