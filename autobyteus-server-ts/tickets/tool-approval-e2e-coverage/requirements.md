# Requirements - tool-approval-e2e-coverage

## Goal
- Add backend E2E coverage for team tool approval workflow so correctness is validated without manual UI execution.

## Scope
- Add one E2E test that validates websocket team approval lifecycle at server boundary:
  - stream `TOOL_APPROVAL_REQUESTED` event to client,
  - return `APPROVE_TOOL` message from client,
  - verify backend dispatch receives canonical target member routing.

## Acceptance Criteria
- A new test exists under `tests/e2e`.
- Test covers both:
  - approval with token from streamed event,
  - approval without token (fallback token issuance from active run context).
- Test passes with `pnpm exec vitest --run tests/e2e/agent/team-tool-approval-websocket.e2e.test.ts`.

## Constraints / Dependencies
- Keep test deterministic (no external LLM/network calls).
- Reuse existing websocket route and team handler stack.

## Assumptions
- Singleton ingress/team-manager method spying is acceptable for deterministic E2E-style boundary verification.

## Risks
- Singleton behavior can leak between tests if mocks are not restored.

## Triage
- Scope: `Small`
- Rationale: single-file E2E test addition, no production behavior changes.
