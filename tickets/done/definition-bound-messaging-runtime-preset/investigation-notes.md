# Investigation Notes

- Date: `2026-03-09`
- Scope triage: `Medium`

## Sources Consulted

- Server external-channel domain and services:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/external-channel/domain/models.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/external-channel/services/channel-binding-service.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/external-channel/services/channel-binding-target-options-service.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/external-channel/runtime/channel-runtime-facade.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/external-channel/runtime/default-channel-runtime-facade.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/external-channel/runtime/default-channel-ingress-route-dependencies.ts`
- Server external-channel GraphQL boundary:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/api/graphql/types/external-channel-setup/types.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/api/graphql/types/external-channel-setup/resolver.ts`
- Server runtime launch / resume model:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/runtime-execution/runtime-adapter-port.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/runtime-execution/runtime-composition-service.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/api/graphql/types/agent-run.ts`
- Server run-history manifest shape:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/run-history/domain/models.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/api/graphql/types/run-history.ts`
- Server persistence layer:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/external-channel/providers/channel-binding-provider.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/external-channel/providers/provider-proxy-set.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/external-channel/providers/file-channel-binding-provider.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/external-channel/providers/sql-channel-binding-provider.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/prisma/schema.prisma`
- Web messaging setup flow:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-web/types/messaging.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-web/graphql/queries/externalChannelSetupQueries.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-web/graphql/mutations/externalChannelSetupMutations.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-web/components/settings/messaging/ChannelBindingSetupCard.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-web/stores/messagingChannelBindingSetupStore.ts`
- Web run-config and reusable selectors:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-web/types/agent/AgentRunConfig.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-web/stores/agentRunConfigStore.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-web/stores/agentDefinitionStore.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-web/stores/workspace.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-web/stores/llmProviderConfig.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-web/components/workspace/config/AgentRunConfigForm.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-web/components/workspace/config/WorkspaceSelector.vue`
- Team-run complexity check:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-web/stores/teamRunConfigStore.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts`

## Key Findings

1. The current binding model is runtime-bound end to end.
   - GraphQL exposes only `targetRunId`.
   - Domain storage persists only `agentRunId` / `teamRunId`.
   - The binding UI only lists active target runtimes.

2. Inbound dispatch currently requires an already-running runtime.
   - `DefaultChannelRuntimeFacade` looks up a live agent/team run and throws if it does not exist.
   - `ChannelIngressService` has no auto-start branch before dispatch.

3. Runtime creation already needs exactly the fields users should not type in chat.
   - `createAgentRun` requires `agentDefinitionId`, `llmModelIdentifier`, and runtime/tool/skill settings.
   - Workspace is also part of the launch contract.
   - Therefore a persisted launch preset is required for messaging-triggered startup.

4. A reusable preset shape already exists in the system.
   - Run history persists a `RunManifest` with `agentDefinitionId`, `workspaceRootPath`, `llmModelIdentifier`, `llmConfig`, `autoExecuteTools`, `skillAccessMode`, and `runtimeKind`.
   - This shape is close to what messaging bindings need, with the main difference that messaging should store a reusable startup preset instead of a historical runtime reference.

5. The frontend already has the selectors needed for a preset-driven binding UX.
   - Agent definitions are queryable in `agentDefinitionStore`.
   - Workspaces can be selected or created from a root path in `workspace.ts` + `WorkspaceSelector.vue`.
   - Model and runtime selectors already exist in `AgentRunConfigForm.vue`.
   - This supports a clean dropdown/path-based setup flow without mobile chat configuration.

6. Team-definition auto-start is materially more complex than agent-definition auto-start.
   - Team run creation needs `teamDefinitionId`, per-member configs, and extra team runtime semantics.
   - The current requirement from the user is “bind a specific agent”.
   - V1 should therefore scope to `AGENT` definition bindings only, even though the transport abstraction remains provider-generic.

7. Persistence changes are unavoidable in both storage profiles.
   - File persistence stores run IDs directly in `bindings.json`.
   - SQL persistence stores run IDs directly in `channel_bindings` with Prisma fields/indexes.
   - Replacing run-bound bindings with definition-bound presets requires changes in both file and SQL providers and Prisma schema.

## Constraints

- Managed messaging is server-owned and must remain provider-generic across Telegram/Discord/WeCom/WhatsApp.
- The gateway transport layer should remain transport-only; runtime startup policy belongs in the main server.
- Settings UX must remain workable for desktop and remote-node usage, so the binding cannot depend on ephemeral local run IDs.
- The workflow rules in this repository disallow source edits until Stage 6 unlock.

## Module / File Placement Observations

- Canonical owning area for binding contract, persistence, and dispatch orchestration is `autobyteus-server-ts/src/external-channel/...`.
- Canonical owning area for runtime create/restore behavior is `autobyteus-server-ts/src/runtime-execution/...`; messaging should call into this layer, not duplicate GraphQL resolver startup logic.
- Canonical owning area for agent-definition launch inputs on the web is the existing run-config surface under `autobyteus-web/components/workspace/config/...`; messaging should reuse or extract from there instead of inventing a disconnected selector stack.
- Canonical owning area for provider-specific transport remains the existing gateway package and managed gateway setup UI. The new preset logic should not move into the gateway itself.

## Open Unknowns

- Whether v1 should migrate existing run-bound bindings automatically or require a one-time reconfiguration.
- Whether workspace should be stored in the binding preset as `workspaceId`, `workspaceRootPath`, or both. Existing run-history code favors root path for re-resolution.
- Whether to add an explicit runtime policy field in v1 or start with a single `auto-start-and-reuse-while-running` behavior.
- Whether peer restriction / owner-only allowlist belongs in the same change or should stay out of v1.
- Whether `/start` and `/stop` chat commands add enough value for v1 compared with pure first-message auto-start.

## Implications For Requirements / Design

- The feature is achievable.
- This is `Medium` scope because it crosses GraphQL, domain model, persistence, runtime orchestration, settings UI, and tests.
- The clean v1 is:
  - replace `targetRunId` bindings with `agentDefinition + launch preset`,
  - scope startup automation to `AGENT` targets only,
  - auto-start a runtime on first inbound message,
  - reuse the current live runtime while it exists,
  - keep provider transport generic.
- The design should explicitly avoid mobile chat configuration of model/workspace/runtime identifiers.
