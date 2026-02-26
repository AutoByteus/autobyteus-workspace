# Implementation Plan - tool-approval-e2e-coverage

## Design Basis (Small Scope)
- Validate websocket approval flow at the real route boundary (`/ws/agent-team/:teamId`) using default handler wiring.
- Stub singleton collaborator methods only where needed for deterministic test control:
  - team existence + stream source (`AgentTeamRunManager`),
  - token issuance + approval dispatch (`TeamCommandIngressService`).

## Tasks
1. Add E2E test file in `tests/e2e/agent`.
2. Build a fake async stream to drive team events into websocket.
3. Assert server emits `TOOL_APPROVAL_REQUESTED` with `approval_token`.
4. Assert server accepts `APPROVE_TOOL` and dispatches canonical target member.
5. Assert fallback approval path without token still dispatches.
6. Run targeted vitest verification.
