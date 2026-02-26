# Implementation Plan

## Scope

Align single-agent history identity naming from `runId` to `agentId` across backend run-history domain/API and frontend history consumers, while preserving team distributed `teamRunId` semantics.

## Task Breakdown (Bottom-Up)

1. T-001 Backend domain contracts
- Update run-history domain model field names to `agentId`.

2. T-002 Backend stores
- Rename run-history index and manifest store APIs/keys for agent identity to `agentId`.

3. T-003 Backend services
- Rename service method parameters/payload fields to `agentId` in run-history, continuation, and projection services.

4. T-004 Backend GraphQL boundary
- Rename `agent-run-history` resolver args/fields/inputs from `runId` to `agentId`.

5. T-005 Frontend GraphQL documents
- Update queries/mutations to request/pass `agentId`.

6. T-006 Frontend run-open orchestration
- Align `runOpenCoordinator` payload contracts to `agentId`.

7. T-007 Frontend run-tree store and UI contracts
- Align store state/getter/action names and component/composable contracts to agent-oriented naming (`*AgentId`).

8. T-008 Frontend derived models/utilities
- Align projection/merge utility naming for agent identity keys.

9. T-009 Generated types and tests
- Sync generated GraphQL types and update backend/frontend tests to new naming.

10. T-010 Guardrail verification
- Verify no accidental rename of distributed `teamRunId` semantics.

## Verification Plan

- Backend targeted suites:
  - `tests/unit/run-history/*`
  - `tests/unit/api/graphql/types/agent-run-history-resolver.test.ts`
  - `tests/e2e/run-history/run-history-graphql.e2e.test.ts`
  - Team lifecycle regression suites to confirm guardrail

- Frontend targeted suites:
  - `stores/__tests__/runTreeStore.spec.ts`
  - `stores/__tests__/agentRunStore.spec.ts`
  - history panel/composable tests
  - integration draft-send history flow
