# Investigation Notes

- Ticket: `runtime-termination-separation-of-concerns`
- Stage: `1`
- Last Updated: `2026-03-10`

## Investigation Scope

Investigate why `terminateAgentRun(...)` attempts native agent removal for Codex and Claude runs, determine whether the warning is just logging noise or a deeper ownership mismatch, and identify the correct separation-of-concerns boundary for a follow-up refactor.

## Evidence Reviewed

- GraphQL terminate mutation:
  - `autobyteus-server-ts/src/api/graphql/types/agent-run.ts`
- Native agent termination:
  - `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`
  - `autobyteus-ts/src/agent/factory/agent-factory.ts`
- Runtime session ownership and terminate ingress:
  - `autobyteus-server-ts/src/runtime-execution/runtime-composition-service.ts`
  - `autobyteus-server-ts/src/runtime-execution/runtime-command-ingress-service.ts`
  - `autobyteus-server-ts/src/runtime-execution/adapters/autobyteus-runtime-adapter.ts`
- Shared termination cleanup:
  - `autobyteus-server-ts/src/run-history/services/run-history-service.ts`
- Existing direct-runtime terminate usage:
  - `autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-orchestrator.ts`
- Existing coverage:
  - `autobyteus-server-ts/tests/e2e/run-history/run-history-graphql.e2e.test.ts`

## Current Behavior

`AgentRunResolver.terminateAgentRun(...)` currently performs four responsibilities inline:

1. Calls `agentRunManager.terminateAgentRun(id)` unconditionally.
2. Looks up `runtimeCompositionService.getRunSession(id)`.
3. If a runtime session exists, calls `runtimeCommandIngressService.terminateRun(...)`.
4. If either path reports success, removes the runtime session and marks run history `IDLE`.

This means non-native runtime runs first pass through the native agent-removal path even when there is no native `Agent` instance behind that run ID.

## Verified Root Cause

The warning the user observed is real but non-fatal:

- `AgentRunManager.terminateAgentRun(...)` delegates to `AgentFactory.removeAgent(...)`.
- `AgentFactory.removeAgent(...)` warns and returns `false` when the run ID is not present in `activeAgents`.
- Codex and Claude runs are runtime-managed and do not create native `AgentFactory.activeAgents` entries.
- After the false native attempt, the runtime terminate path still succeeds, so the run closes normally.

Conclusion:
- The warning is a symptom of incorrect routing/ownership in the GraphQL resolver.
- It is not a failure in the Codex skill implementation.

## Important Ownership Nuance

A naive fix of "if a runtime session exists, always terminate through runtime ingress only" is not correct.

Why:

- `RuntimeCompositionService.createAgentRun(...)` registers a runtime session for every runtime kind, including the default `autobyteus` runtime.
- `DEFAULT_RUNTIME_KIND` is `autobyteus`.
- `AutobyteusRuntimeAdapter.terminateRun(...)` only calls `stop()` on the agent; it does not remove the agent from `AgentFactory.activeAgents`.
- Native cleanup currently relies on `AgentRunManager.terminateAgentRun(...)` -> `AgentFactory.removeAgent(...)`, which deletes the active agent entry before stopping it.

Conclusion:
- Runtime-session presence alone is not the right routing discriminator.
- The decision must at least consider `runtimeKind`.

## Existing Good Pattern

`TeamMemberRuntimeOrchestrator.terminateMemberRuntimeSessionsWithSnapshot(...)` already routes runtime-managed member shutdown directly through `runtimeCommandIngressService.terminateRun(...)` without first attempting native agent removal.

This indicates the repository already has the correct runtime-boundary concept; the agent GraphQL mutation is the place that still mixes native and runtime concerns.

## Coverage Gap

Existing GraphQL terminate coverage proves success and history state changes, but it does not assert:

- which termination path was chosen,
- whether native termination was incorrectly attempted for Codex/Claude,
- whether shared cleanup is executed exactly once.

So the current warning can exist even while all terminate tests remain green.

## Triage Outcome

- Scope classification: `Medium`
- Reason:
  - the issue spans GraphQL API orchestration, native agent lifecycle, runtime session routing, and termination cleanup ownership;
  - a good fix likely introduces a new coordinator/service rather than another conditional in the resolver.

## Recommended Direction

Create a dedicated termination coordinator service that:

1. Resolves active runtime session ownership first.
2. Routes non-`autobyteus` runs through runtime ingress only.
3. Routes native `autobyteus` runs through `AgentRunManager` until native adapter semantics are brought to parity.
4. Performs shared post-success cleanup exactly once in one place.

This preserves current native behavior while removing the false Codex/Claude native-removal attempt and tightening ownership boundaries.
