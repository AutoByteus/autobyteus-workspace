# Proposed Design

- Ticket: `runtime-termination-separation-of-concerns`
- Scope: `Medium`
- Last Updated: `2026-03-10`

## Design Goal

Refactor agent-run termination so the GraphQL resolver no longer mixes native ownership checks, runtime-session checks, runtime command dispatch, and shared post-terminate cleanup in one method.

## Design Summary

Introduce a dedicated coordinator service, tentatively `AgentRunTerminationService`, that becomes the single entry point for terminating agent runs. The service will:

1. Inspect the active runtime session, if any.
2. Choose the correct termination path based on effective `runtimeKind`.
3. Execute shared cleanup exactly once after success.
4. Return a simple structured result to the GraphQL resolver.

The resolver will delegate to this service and stop composing native + runtime logic inline.

## Why `runtimeKind` Is The Correct Discriminator

Investigation showed that:

- non-native Codex/Claude runs have runtime sessions but no native `AgentFactory` ownership;
- native `autobyteus` runs also have runtime sessions;
- native `autobyteus` termination still requires `AgentRunManager.terminateAgentRun(...)` because `AutobyteusRuntimeAdapter.terminateRun(...)` currently stops the agent but does not remove it from `AgentFactory.activeAgents`.

Therefore:

- `runtimeSession != null` is insufficient;
- `runtimeSession.runtimeKind !== "autobyteus"` is the correct condition for runtime-only termination in this slice.

## Proposed Service Boundary

### New Service

- File candidate:
  - `autobyteus-server-ts/src/agent-execution/services/agent-run-termination-service.ts`

### Public API

```ts
interface AgentRunTerminationResult {
  success: boolean;
  message: string;
  route: "native" | "runtime" | "not_found";
  runtimeKind: string | null;
}

class AgentRunTerminationService {
  terminateAgentRun(runId: string): Promise<AgentRunTerminationResult>;
}
```

### Responsibilities

- Resolve runtime session ownership.
- Route native vs non-native termination.
- Remove runtime session after successful termination.
- Mark run history `IDLE` after successful termination.
- Keep not-found behavior stable.

### Non-Responsibilities

- No GraphQL schema changes.
- No runtime-specific conditional branches in the resolver.
- No deep parity refactor of `AutobyteusRuntimeAdapter.terminateRun(...)` in this slice.

## Routing Algorithm

### Case A: Non-`autobyteus` runtime session exists

1. Read `runtimeCompositionService.getRunSession(runId)`.
2. If session exists and `session.runtimeKind !== "autobyteus"`, call:
   - `runtimeCommandIngressService.terminateRun({ runId, mode: "agent" })`
3. If the runtime command is accepted:
   - remove the runtime session,
   - call `runHistoryService.onRunTerminated(runId)`,
   - return success with route `runtime`.
4. If the runtime command is not accepted:
   - return a stable not-found / failed result,
   - do not run shared cleanup.

### Case B: No runtime session, or runtime session kind is `autobyteus`

1. Call `agentRunManager.terminateAgentRun(runId)`.
2. If native termination succeeds:
   - remove any existing runtime session for that run ID,
   - call `runHistoryService.onRunTerminated(runId)`,
   - return success with route `native`.
3. If native termination fails:
   - return not found,
   - do not run shared cleanup.

## Resolver Simplification

`AgentRunResolver.terminateAgentRun(...)` becomes:

1. delegate to `AgentRunTerminationService`,
2. map the returned result to `TerminateAgentRunResult`,
3. keep only error logging / GraphQL response shaping.

This removes orchestration logic from the API layer and keeps ownership decisions in one reusable service.

## Cleanup Invariants

- `runtimeCompositionService.removeRunSession(runId)` runs only after a successful terminate result.
- `runHistoryService.onRunTerminated(runId)` runs only after a successful terminate result.
- shared cleanup is not duplicated across native and runtime paths.
- native false negatives for Codex/Claude are eliminated because native termination is never attempted for those runtime kinds.

## Alternatives Considered

### Alternative 1: Minimal conditional inside GraphQL resolver

Rejected as the preferred design.

Reason:
- it silences the warning, but keeps ownership selection and cleanup wiring inside the API layer;
- it is harder to reuse and easier to regress later.

### Alternative 2: Route everything through `RuntimeCommandIngressService`

Rejected for this slice.

Reason:
- native `autobyteus` termination would stop the agent but would not remove it from `AgentFactory.activeAgents`;
- that would weaken native lifecycle correctness unless the native runtime adapter is also refactored.

## Verification Strategy

- Unit tests for the new coordinator service:
  - native path chosen for `autobyteus`,
  - runtime path chosen for Codex/Claude,
  - cleanup executed once on success,
  - cleanup skipped on not-found/failure.
- GraphQL-level regression tests:
  - `terminateAgentRun` still returns the same success/not-found contract,
  - existing run-history state transitions remain correct.

## Out Of Scope

- Changing GraphQL API shape.
- Refactoring team-run termination.
- Full semantic parity refactor of `AutobyteusRuntimeAdapter.terminateRun(...)`.
