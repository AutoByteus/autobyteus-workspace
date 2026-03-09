# Implementation Plan

## Objective

Implement provider-generic AGENT-definition messaging bindings with saved launch presets, automatic runtime startup on first inbound message, cached live-run reuse, and preserved outbound reply delivery.

## Workstreams

### 1. Server Contract + Persistence

- Update `external-channel` domain models from `targetRunId` semantics to `agentDefinitionId + launchPreset + cached agentRunId`.
- Update GraphQL types/resolver for:
  - new launch preset input/output
  - removal of run-target binding input in the messaging settings flow
- Update file persistence provider for the new binding shape.
- Update SQL/Prisma schema and SQL binding provider for the new binding shape.
- Implement best-effort migration from legacy AGENT run-bound bindings where possible.

### 2. Runtime Launcher + Dispatch

- Add `ChannelBindingRuntimeLauncher` in `src/external-channel/runtime/`.
- Update runtime facade to:
  - resolve/reuse cached live run when valid,
  - auto-start from preset when no valid live run exists,
  - clear reuse on binding contract edits.
- Reuse:
  - `WorkspaceManager.ensureWorkspaceByRootPath(...)`
  - `RuntimeCompositionService.createAgentRun(...)`
  - `RuntimeCommandIngressService.bindRunSession(...)`

### 3. Web Binding UX

- Replace target-run selection in messaging binding UI with:
  - agent definition selector
  - launch preset controls for runtime/model/workspace/skill/tool options
- Update web GraphQL queries/mutations/types for the new binding contract.
- Reuse existing workspace/runtime/model selector logic rather than inventing parallel controls.

### 4. Verification

- Server unit tests:
  - binding migration / normalization
  - runtime launcher reuse-vs-create behavior
  - cached run invalidation on binding edits
- Server E2E / integration:
  - save definition-bound binding
  - first inbound message auto-starts run
  - second inbound message reuses same live run
  - outbound reply still publishes through managed gateway callback path
- Web tests:
  - binding form validation
  - saved binding reload / edit state

### 5. Docs Sync

- Update messaging docs to describe definition-bound bindings and auto-start behavior.

## Implementation Order

1. Server model / persistence contract
2. Runtime launcher and dispatch integration
3. Web GraphQL/types/store updates
4. Web binding UI updates
5. Tests
6. Docs

## Risks To Watch During Implementation

- Legacy binding migration might fail when no recoverable manifest exists.
- Prisma schema updates must stay aligned with file-persistence shape.
- Cached run invalidation must not regress live-run reuse for unchanged bindings.
