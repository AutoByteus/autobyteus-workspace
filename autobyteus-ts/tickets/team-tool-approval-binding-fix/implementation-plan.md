# Implementation Plan - team-tool-approval-binding-fix

## Small-Scope Design Basis (Solution Sketch)
- Root cause: local routing adapter extracts `postToolExecutionApproval` into a local variable and invokes it, which can drop method `this` binding for class instances (e.g., `Agent`), causing runtime failure when the method references instance state.
- Design correction: invoke `postToolExecutionApproval` directly on `targetNode` so JS method binding is preserved.
- Keep existing behavior split:
  - agent targets (`targetNode.agentId` present): call 3-arg signature.
  - sub-team proxy targets (`targetNode.agentId` absent): call 4-arg signature with `agentName`.

## Task Breakdown (Bottom-Up)
1. `Modify` local routing adapter dispatch invocation style.
2. `Modify` unit tests for routing adapter:
  - add binding-preservation regression test,
  - keep existing coverage for sub-team signature path.
3. Build and run targeted test set.
4. Wire updated `autobyteus-ts` artifact into `autobyteus-server-ts` runtime and verify incident path no longer throws binding error.

## Verification Strategy
- Unit:
  - `autobyteus-ts/tests/unit/agent-team/routing/local-team-routing-port-adapter.test.ts`
- Integration (cross boundary evidence):
  - `autobyteus-server-ts/tests/integration/agent/agent-team-websocket.integration.test.ts`
  - Purpose: ensure websocket approval command path remains functional after library change.
- E2E feasibility:
  - Full UI-driven E2E is feasible only in combined server+web runtime, not in standalone `autobyteus-ts` package tests.
  - Compensating evidence in this ticket:
    - targeted unit regression at failure locus,
    - server integration test,
    - live backend log verification during manual reproduction.

## Requirement Traceability
- `R1` Fix approval dispatch for local agent member
  - Design basis: direct method invocation on `targetNode`.
  - Use case: `UC-1`.
  - Implementation tasks: 1, 2.
  - Tests: unit routing adapter test; server integration smoke.
- `R2` Preserve sub-team proxy approval behavior
  - Design basis: keep agent vs sub-team signature split.
  - Use case: `UC-2`.
  - Implementation tasks: 1, 2.
  - Tests: existing sub-team approval unit assertion.
- `R3` Prevent regression of unbound method call
  - Design basis: binding-focused regression test.
  - Use case: `UC-3`.
  - Implementation tasks: 2.
  - Tests: new binding regression unit test.
