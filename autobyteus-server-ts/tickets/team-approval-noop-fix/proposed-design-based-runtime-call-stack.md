# Proposed-Design-Based Runtime Call Stack - team-approval-noop-fix (v1)

## Use Case UC-1: Approve with valid token
Coverage: primary Yes / fallback N/A / error N/A

1. `components/conversation/ToolCallIndicator.vue:approve()` calls `activeContextStore.postToolExecutionApproval(invocationId, true)`.
2. `stores/activeContextStore.ts:postToolExecutionApproval(...)` routes to `agentTeamRunStore.postToolExecutionApproval(...)` for `selectedType='team'`.
3. `stores/agentTeamRunStore.ts:postToolExecutionApproval(...)` calls `TeamStreamingService.approveTool(...)`.
4. `services/agentStreaming/TeamStreamingService.ts:approveTool(...)` resolves canonical target from token and sends websocket `APPROVE_TOOL`.
5. `src/services/agent-streaming/agent-team-stream-handler.ts:handleToolApproval(...)` parses token and dispatches to ingress.
6. `src/distributed/ingress/team-command-ingress-service.ts:dispatchToolApproval(...)` validates token and routes `ToolApprovalTeamEvent`.

## Use Case UC-2: Approve when token is missing
Coverage: primary Yes / fallback Yes / error Yes

1. Steps 1-4 same as UC-1, payload may have no `approval_token`.
2. `agent-team-stream-handler.ts:handleToolApproval(...)` attempts fallback token issuance using `issueToolApprovalTokenFromActiveRun(teamId, invocationId, targetMemberName)`.
3. If fallback token resolved, dispatch approval through ingress.
4. If fallback cannot resolve (missing invocation or target), throw `TeamCommandIngressError(APPROVAL_TOKEN_REQUIRED)`.

Decision gates:
- token present and valid -> dispatch.
- token missing + invocation+target resolvable -> synthesize token and dispatch.
- otherwise -> explicit error.

## Use Case UC-3: Token target canonicalization
Coverage: primary Yes / fallback N/A / error N/A

1. Frontend receives `TOOL_APPROVAL_REQUESTED` with token target member.
2. On approve/deny, frontend sends `agent_name` from token target first.
3. Backend dispatch target equals `token.targetMemberName`, avoiding mismatch with UI route/display names.
