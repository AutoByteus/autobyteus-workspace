# Proposed Design

## Summary

Replace messaging bindings that point at ephemeral active run IDs with bindings that point at a stable `AGENT` definition plus a saved launch preset. Keep the gateway/provider layer transport-focused. Move runtime auto-start and runtime reuse into the main server’s external-channel dispatch path.

This design is provider-generic for managed `TELEGRAM`, `DISCORD`, `WHATSAPP`, and `WECOM`, but the v1 execution target is intentionally `AGENT`-only. Team-definition startup remains out of scope because it requires a materially different startup contract.

## Goals

- Bind messaging routes to a stable agent definition instead of a live run.
- Let the user choose agent, workspace, model, runtime, and tool/skill settings in the app UI.
- Auto-start the bound agent when the first inbound message arrives.
- Reuse the same live run for later inbound messages while it remains active.
- Preserve existing outbound reply delivery through the external-channel callback path.

## Non-Goals

- Team-definition auto-start.
- Chat-based model/workspace/runtime configuration.
- Chat command control surface (`/start`, `/stop`, `/listagents`) in v1.
- Peer allowlist / owner-only policy in the same implementation pass.

## Current Problem

The current flow persists `targetRunId` and dispatches directly into a live runtime:

- `externalChannelBindingTargetOptions` only lists active runs.
- `upsertExternalChannelBinding` requires `targetRunId`.
- `DefaultChannelRuntimeFacade` throws if the target run is not already active.

This produces the wrong ownership boundary:

- users must pre-start a run before binding,
- bindings break when the run identity changes,
- chat becomes coupled to transient runtime state.

## Proposed Binding Model

### Domain Model

Keep the binding concept under `autobyteus-server-ts/src/external-channel/domain`, but replace the user-facing target with a stable definition-backed preset.

Proposed server-side shape:

```ts
type ChannelBindingLaunchPreset = {
  workspaceRootPath: string;
  llmModelIdentifier: string;
  runtimeKind: RuntimeKind;
  autoExecuteTools: boolean;
  skillAccessMode: SkillAccessMode | null;
  llmConfig: Record<string, unknown> | null;
};

type ChannelBinding = {
  id: string;
  provider: ExternalChannelProvider;
  transport: ExternalChannelTransport;
  accountId: string;
  peerId: string;
  threadId: string | null;
  targetType: "AGENT";
  agentDefinitionId: string;
  launchPreset: ChannelBindingLaunchPreset;
  agentRunId: string | null; // internal cached active run pointer
  targetNodeName: string | null;
  allowTransportFallback: boolean;
  createdAt: Date;
  updatedAt: Date;
};
```

### Why Keep `agentRunId`

The binding should not target a run ID conceptually, but keeping a nullable `agentRunId` field as an internal cache is useful:

- it lets the server reuse the currently active runtime for this binding,
- it avoids building a second binding-to-run registry,
- it supports one binding -> one peer-scoped runtime semantics.

`agentRunId` becomes an internal runtime cache, not the binding’s canonical target.

### Cached Run Invalidation Rule

The cached `agentRunId` is reusable only while it still matches the current binding contract.

On any binding edit that changes:

- `agentDefinitionId`, or
- any field inside `launchPreset`,

the server must clear the cached `agentRunId` before saving the updated binding. That guarantees the next inbound message launches a runtime from the new target/preset instead of routing into the previous run.

## Launch Preset Schema

The launch preset should align closely with the existing run-history `RunManifest` shape:

- `agentDefinitionId` stays on the binding root because it is the target identity.
- `workspaceRootPath` should be persisted instead of only `workspaceId`.
- `llmModelIdentifier`
- `runtimeKind`
- `autoExecuteTools`
- `skillAccessMode`
- `llmConfig`

### Why Persist `workspaceRootPath`

`workspaceId` is runtime-local and can be re-created on demand. The server already has `WorkspaceManager.ensureWorkspaceByRootPath(...)`, and run history already persists workspace as root path. Persisting root path gives stable restart behavior and avoids stale workspace IDs.

## Dispatch / Auto-Start Architecture

### New Runtime Resolution Flow

Replace the current live-run-only dispatch with a definition-aware dispatch path:

1. `ChannelIngressService` resolves the binding as today.
2. The runtime facade resolves a live run for the binding:
   - if `binding.agentRunId` exists and is still active, reuse it,
   - only while the binding contract is unchanged,
   - otherwise create a new run from `binding.agentDefinitionId + launchPreset`.
3. Persist the new `agentRunId` back onto the binding.
4. Post the inbound message to that run.
5. Persist ingress receipt using the actual resolved run ID.

### New Server Service

Add a server-side orchestration service under `autobyteus-server-ts/src/external-channel/runtime/`, for example:

```ts
class ChannelBindingRuntimeLauncher {
  async resolveOrStartAgentRun(binding: ChannelBinding): Promise<string> {
    // 1. reuse cached active run if still live
    // 2. ensure workspace by root path
    // 3. create runtime via RuntimeCompositionService
    // 4. bind session
    // 5. persist agentRunId cache back to binding
  }
}
```

This service should call:

- `WorkspaceManager.ensureWorkspaceByRootPath(...)`
- `RuntimeCompositionService.createAgentRun(...)`
- `RuntimeCommandIngressService.bindRunSession(...)`
- `ChannelBindingService.upsertBindingAgentRunId(...)`

It should not duplicate GraphQL resolver startup logic inline.

### Runtime Reuse Rule

V1 runtime reuse policy is simple:

- if the cached run is still active, reuse it,
- only when the binding contract has not changed since that cached run was stored,
- if it is gone, create a new one,
- do not add idle timeout or stop policy yet.

This keeps the first implementation small and matches the user’s current primary need.

## GraphQL / API Contract Changes

### Remove Run-ID-Centric Binding Inputs

Replace:

- `targetRunId`
- `externalChannelBindingTargetOptions`

With:

- `targetAgentDefinitionId`
- `launchPreset`

Proposed GraphQL input shape:

```ts
input ExternalChannelLaunchPresetInput {
  workspaceRootPath: String!
  llmModelIdentifier: String!
  runtimeKind: String
  autoExecuteTools: Boolean
  skillAccessMode: SkillAccessModeEnum
  llmConfig: JSON
}

input UpsertExternalChannelBindingInput {
  provider: String!
  transport: String!
  accountId: String!
  peerId: String!
  threadId: String
  targetType: String! // v1 only "AGENT"
  targetAgentDefinitionId: String!
  launchPreset: ExternalChannelLaunchPresetInput!
}
```

Binding query payload should return the same fields so the settings UI can reload and edit an existing preset.

### `externalChannelBindingTargetOptions`

This query is no longer the right abstraction for v1. The messaging settings page can reuse existing app data sources instead:

- agent definitions
- workspaces
- runtime capabilities
- LLM model list

The query can be removed from the messaging setup flow.

## Web UI Changes

### Binding Step UX

The binding step should change from:

- provider/account/peer
- target type
- target run dropdown

To:

- provider/account/peer
- target agent definition dropdown
- launch preset form:
  - runtime dropdown
  - model selector
  - workspace selector / new path loader
  - auto-approve tools toggle
  - skill access mode
  - optional model config section

### Reuse Existing Config UI

Do not build raw ad hoc inputs for model/workspace/runtime.

Instead:

- reuse or extract logic from `AgentRunConfigForm.vue`
- reuse `WorkspaceSelector.vue`
- reuse model/runtime stores already used by run config

This keeps the binding experience aligned with normal run startup and avoids duplicating business rules.

## Persistence Changes

### File Profile

`bindings.json` must move from:

- `agentRunId` / `teamRunId` only

To:

- `agentDefinitionId`
- serialized `launchPreset`
- cached `agentRunId`

### SQL Profile

`channel_bindings` must gain new columns for:

- `agent_definition_id`
- `workspace_root_path`
- `llm_model_identifier`
- `runtime_kind`
- `auto_execute_tools`
- `skill_access_mode`
- `llm_config`

The `team_id` path can remain only if needed temporarily for storage compatibility, but v1 behavior should no longer depend on it.

## Migration Strategy

Use one migration path, not dual long-term behavior.

### Existing AGENT Bindings

Best-effort migration:

1. If a binding has legacy `agentRunId` but no `agentDefinitionId + launchPreset`,
2. try to resolve a launch manifest from:
   - active run context, or
   - run history resume config for that run ID.
3. Persist the new definition-bound fields.

If migration cannot resolve a valid preset:

- leave the binding invalid,
- surface that the binding must be reconfigured in the UI,
- do not keep the old run-target behavior as an ongoing fallback mode.

This avoids permanent dual semantics while still reducing breakage for existing local test data.

## Team Scope Decision

Team-definition startup is intentionally deferred because it requires:

- `teamDefinitionId`
- per-member runtime configs
- additional team routing semantics

That is a separate design problem. V1 should complete `AGENT` definition bindings first and only then consider team-launch presets.

## Testing Strategy

Minimum required coverage:

- server unit tests for binding migration / preset validation / runtime launcher reuse-vs-create behavior
- server integration/E2E for:
  - saving a definition-bound binding,
  - first inbound message auto-starting a run,
  - second inbound message reusing the same live run,
  - outbound reply delivery still reaching the provider callback path
- web tests for the new binding form state and saved binding reload behavior

## Risks

- Binding migration may fail for old bindings whose prior run has no recoverable manifest.
- Workspace root path persistence is stable, but invalid paths on remote nodes must fail clearly.
- The first implementation should resist accidental drift back into “chat config” behavior.

## Design Decision Summary

- Provider-generic transport: `keep`
- Stable target identity: `agent definition`
- Persisted launch contract: `binding-level preset`
- Auto-start behavior: `yes`
- Runtime reuse: `cached active run pointer`
- V1 scope: `AGENT only`
- Chat commands: `later, not required for v1`
