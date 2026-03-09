# Future-State Runtime Call Stack

## Scope

This runtime model covers the v1 AGENT-definition messaging flow for managed non-WeChat providers:

- save a definition-bound binding with a launch preset,
- auto-start an agent on the first inbound message,
- reuse the same live run for later inbound messages,
- preserve outbound replies through the existing callback path.

## Future Modules

- Web
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-web/types/messaging.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-web/stores/messagingChannelBindingSetupStore.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-web/components/settings/messaging/ChannelBindingSetupCard.vue`
  - reusable selectors under `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-web/components/workspace/config/`
- Server GraphQL / domain
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/api/graphql/types/external-channel-setup/types.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/api/graphql/types/external-channel-setup/resolver.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/external-channel/domain/models.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/external-channel/services/channel-binding-service.ts`
- Server runtime orchestration
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/external-channel/runtime/default-channel-runtime-facade.ts`
  - new launcher service under `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/external-channel/runtime/`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/runtime-execution/runtime-composition-service.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/runtime-execution/runtime-command-ingress-service.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/workspaces/workspace-manager.ts`
- Server persistence
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/external-channel/providers/file-channel-binding-provider.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/external-channel/providers/sql-channel-binding-provider.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/prisma/schema.prisma`

## Use Case 1: Save A Definition-Bound Binding

### Outcome

The user saves a provider/account/peer route that points to an agent definition plus a launch preset, without selecting an active run ID.

### Call Stack

1. `ChannelBindingSetupCard.vue`
   - renders provider/account/peer scope,
   - renders target agent definition selector,
   - renders launch preset controls using existing workspace/runtime/model selectors.
2. `messagingChannelBindingSetupStore.ts`
   - validates:
     - `accountId`
     - `peerId`
     - `targetAgentDefinitionId`
     - launch preset completeness
   - submits GraphQL mutation with the new input shape.
3. `externalChannelSetupMutations.ts`
   - sends `UpsertExternalChannelBinding(input)`.
4. `external-channel-setup/resolver.ts`
   - normalizes provider/transport/account/peer/thread,
   - validates `targetType === AGENT` for v1,
   - validates launch preset completeness,
   - optionally runs best-effort legacy migration handling if existing row is still old-shape,
   - calls `ChannelBindingService.upsertBinding(...)`.
5. `channel-binding-service.ts`
   - forwards the stable binding model into the persistence provider.
6. `file-channel-binding-provider.ts` or `sql-channel-binding-provider.ts`
   - writes:
     - route fields,
     - `agentDefinitionId`,
     - serialized launch preset,
     - `agentRunId = null` for new bindings,
     - `agentRunId = null` when the target agent or launch preset changed,
     - preserved cached active run pointer only when the binding contract is unchanged.
7. GraphQL returns the saved binding payload.
8. `messagingChannelBindingSetupStore.ts`
   - reloads/sorts bindings for the current provider scope,
   - shows the saved target agent definition + preset summary.

## Use Case 2: First Inbound Message Auto-Starts The Agent

### Outcome

The first inbound message for a bound peer starts the configured agent automatically, then delivers the inbound content to that new run.

### Call Stack

1. Managed messaging gateway receives an inbound provider message.
2. Gateway posts inbound envelope to the server’s channel ingress route.
3. `ChannelIngressService.handleInboundMessage(...)`
   - performs idempotency reservation,
   - resolves the definition-bound binding by route,
   - enters the thread lock,
   - calls `runtimeFacade.dispatchToBinding(binding, envelope)`.
4. `DefaultChannelRuntimeFacade.dispatchToBinding(...)`
   - for v1 `AGENT` bindings, calls new `ChannelBindingRuntimeLauncher.resolveOrStartAgentRun(binding)`.
5. `ChannelBindingRuntimeLauncher.resolveOrStartAgentRun(binding)`
   - checks cached `binding.agentRunId`,
   - asks `AgentRunManager` whether that run is still active,
   - if inactive or missing:
     - resolves workspace via `WorkspaceManager.ensureWorkspaceByRootPath(binding.launchPreset.workspaceRootPath)`,
     - calls `RuntimeCompositionService.createAgentRun(...)` with:
       - `agentDefinitionId = binding.agentDefinitionId`
       - `workspaceId = resolvedWorkspace.workspaceId`
       - `llmModelIdentifier`
       - `runtimeKind`
       - `autoExecuteTools`
       - `skillAccessMode`
       - `llmConfig`
     - binds the resulting runtime session into runtime ingress,
     - persists the new `agentRunId` back onto the binding through `ChannelBindingService.upsertBindingAgentRunId(...)`.
6. `DefaultChannelRuntimeFacade`
   - fetches the now-live agent run via `AgentRunManager.getAgentRun(agentRunId)`,
   - posts the converted inbound `AgentInputUserMessage`.
7. `ChannelIngressService`
   - records ingress receipt with the actual `agentRunId`.
8. Agent processes the user message normally.

## Use Case 3: Later Inbound Messages Reuse The Live Run

### Outcome

Subsequent messages from the same bound peer continue on the same live agent runtime while it remains active.

### Call Stack

1. Gateway receives another inbound provider message for the same route.
2. `ChannelIngressService` resolves the same binding.
3. `ChannelBindingRuntimeLauncher.resolveOrStartAgentRun(binding)`
   - sees `binding.agentRunId`,
   - confirms the run is still active via `AgentRunManager`,
   - reuses it only because the binding contract has not changed since that cached run was recorded,
   - returns that run ID without creating a new runtime.
4. `DefaultChannelRuntimeFacade`
   - posts the new inbound user message to the existing run.
5. `ChannelIngressService`
   - records the new ingress receipt against the same run ID.

## Use Case 4: Outbound Reply Still Reaches The Messaging Peer

### Outcome

Replies from the auto-started agent return to the original messaging peer without any user-supplied callback URL.

### Call Stack

1. The bound agent produces an assistant reply.
2. Existing response customization / external-channel reply processing runs.
3. The reply processor resolves callback destination options:
   - explicit callback override if configured for advanced external deployments,
   - otherwise managed gateway runtime address from managed messaging status.
4. `GatewayCallbackPublisher`
   - publishes the outbound message to the managed gateway callback route.
5. The gateway’s outbound queue / sender worker delivers the reply to the provider peer.
6. Delivery event persistence remains unchanged.

## Use Case 5: Stale Cached Run ID Falls Back To Fresh Startup

### Outcome

If the binding still points at a terminated run, the next inbound message starts a new runtime automatically instead of failing.

### Call Stack

1. `ChannelBindingRuntimeLauncher.resolveOrStartAgentRun(binding)`
   - sees cached `agentRunId`,
   - finds no live runtime in `AgentRunManager`,
   - treats the cached ID as stale.
2. Launcher starts a new run from the saved preset.
3. Launcher overwrites the cached `agentRunId` on the binding.
4. Dispatch proceeds normally.

## Use Case 5B: Editing The Binding Invalidates The Old Cached Run

### Outcome

Changing the bound agent or launch preset prevents accidental reuse of the previous live runtime.

### Call Stack

1. User edits an existing binding in the settings UI.
2. `messagingChannelBindingSetupStore.ts`
   - submits the updated target agent + launch preset.
3. `external-channel-setup/resolver.ts`
   - loads the existing binding if present,
   - compares the persisted binding contract with the new one.
4. `ChannelBindingService.upsertBinding(...)`
   - persists the updated contract,
   - clears cached `agentRunId` when the target or preset changed.
5. The next inbound message starts from the updated preset instead of reusing the prior runtime.

## Use Case 6: Invalid Workspace Path Blocks Startup Cleanly

### Outcome

If the saved workspace path can no longer be resolved on the node, the message is not silently dropped and the failure is surfaced as a runtime startup error.

### Call Stack

1. `ChannelBindingRuntimeLauncher.resolveOrStartAgentRun(binding)`
   - calls `WorkspaceManager.ensureWorkspaceByRootPath(...)`.
2. Workspace resolution throws.
3. Launcher propagates a structured startup failure.
4. Ingress path records failure context in logs / error response path.
5. No ingress receipt is recorded as a successful dispatch because no runtime accepted the message.

## Invariants

- The binding’s canonical target is `agentDefinitionId + launchPreset`, not `agentRunId`.
- `agentRunId` is only a cached live-run pointer.
- Cached run reuse is valid only while the binding contract is unchanged.
- Transport/provider code never decides model/workspace/runtime startup.
- Mobile/chat users do not type model IDs or workspace paths in chat.
- Outbound callback delivery stays on the existing managed gateway callback pipeline.
