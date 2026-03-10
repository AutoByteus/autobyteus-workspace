# Implementation Plan

- Ticket: `runtime-termination-separation-of-concerns`
- Scope: `Medium`
- Last Updated: `2026-03-10`

## Inputs

- Workflow state: `tickets/done/runtime-termination-separation-of-concerns/workflow-state.md`
- Investigation notes: `tickets/done/runtime-termination-separation-of-concerns/investigation-notes.md`
- Requirements: `tickets/done/runtime-termination-separation-of-concerns/requirements.md`
- Proposed design: `tickets/done/runtime-termination-separation-of-concerns/proposed-design.md`
- Runtime call stacks: `tickets/done/runtime-termination-separation-of-concerns/future-state-runtime-call-stack.md`
- Runtime review: `tickets/done/runtime-termination-separation-of-concerns/future-state-runtime-call-stack-review.md`

## Implementation Goal

Move agent-run termination route selection and shared cleanup out of the GraphQL resolver into a dedicated service that chooses the correct path for native vs non-native runtimes without regressing native `autobyteus` removal semantics.

## Planned Code Changes

### `I-001` Add termination coordinator service

- File:
  - `autobyteus-server-ts/src/agent-execution/services/agent-run-termination-service.ts`
- Work:
  - add a small service with dependency injection for `AgentRunManager`, `RuntimeCompositionService`, `RuntimeCommandIngressService`, and `RunHistoryService`
  - expose `terminateAgentRun(runId)` returning a structured result
  - choose the route using:
    - runtime session `runtimeKind` when present
    - native active-agent presence as fallback
  - centralize shared cleanup after success

### `I-002` Simplify GraphQL resolver

- File:
  - `autobyteus-server-ts/src/api/graphql/types/agent-run.ts`
- Work:
  - replace inline mixed termination logic with delegation to the new service
  - keep GraphQL response shape stable

### `I-003` Add unit coverage for routing and cleanup

- File:
  - `autobyteus-server-ts/tests/unit/agent-execution/agent-run-termination-service.test.ts`
- Work:
  - cover native route selection
  - cover non-native route selection
  - cover not-found behavior
  - cover shared cleanup being executed once on success

### `I-004` Add GraphQL regression coverage

- File:
  - `autobyteus-server-ts/tests/e2e/run-history/runtime-termination-routing-graphql.e2e.test.ts`
- Work:
  - add a dedicated resolver-level scenario proving non-native runtime runs bypass native `terminateAgentRun(...)`
  - assert run-history cleanup still occurs
  - keep the existing `run-history-graphql` suite green without increasing that file beyond the ticket hard-limit expectations

## Verification Plan

- Focused unit test:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/agent-run-termination-service.test.ts --no-watch`
- GraphQL regression:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/run-history/runtime-termination-routing-graphql.e2e.test.ts --no-watch`
- Broader targeted safety net if needed:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/run-history/run-history-graphql.e2e.test.ts tests/unit/agent-team-execution/team-member-runtime-orchestrator.test.ts tests/unit/runtime-execution/runtime-command-ingress-service.test.ts --no-watch`

## Risk Notes

- Avoid changing native `autobyteus` adapter terminate semantics in this slice.
- Avoid introducing new runtime-specific branches in GraphQL.
- Keep any new service file under the Stage 8 file-size hard limit.
