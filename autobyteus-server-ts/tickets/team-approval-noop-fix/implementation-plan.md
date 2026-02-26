# Implementation Plan - team-approval-noop-fix

## Small-Scope Solution Sketch
- Backend: harden `AgentTeamStreamHandler.handleToolApproval` to avoid silent token drop.
  - Parse tokens with numeric-string tolerance.
  - If token missing, synthesize from active run using invocation + target member from payload.
  - Use token target as canonical dispatch target to prevent route/display mismatch rejections.
- Frontend: in `TeamStreamingService`, prefer token target member for `agent_name` payload over caller-provided name.
- Tests:
  - Server integration test for missing-token fallback and string-version token acceptance.
  - Web unit test for canonical token target in approve payload.

## Tasks
1. Modify backend team approval token handling and dispatch target selection.
2. Modify frontend team approve/deny payload target canonicalization.
3. Add/update tests.
4. Run focused verification suites.

## Verification Strategy
- Backend integration: `tests/integration/agent/agent-team-websocket.integration.test.ts`.
- Frontend unit: `services/agentStreaming/__tests__/TeamStreamingService.spec.ts`.

## Cleanup
- Remove silent no-op path for invalid/missing token when fallback can be derived.
