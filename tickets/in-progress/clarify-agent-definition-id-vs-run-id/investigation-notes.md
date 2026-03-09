# Investigation Notes

## Sources Consulted

- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/external-channel/domain/models.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/external-channel/services/channel-binding-target-options-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/api/graphql/types/external-channel-setup/types.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/api/graphql/types/external-channel-setup/mapper.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/api/graphql/types/external-channel-setup/resolver.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/external-channel/runtime/default-channel-runtime-facade.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-server-ts/src/agent-customization/processors/persistence/external-channel-turn-receipt-binding-processor.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-web/types/messaging.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-web/graphql/queries/externalChannelSetupQueries.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-web/graphql/mutations/externalChannelSetupMutations.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-web/stores/messagingChannelBindingSetupStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-web/stores/messagingChannelBindingOptionsStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-web/stores/messagingVerificationStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-web/components/settings/messaging/ChannelBindingSetupCard.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-web/composables/useMessagingChannelBindingSetupFlow.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-desktop-distribution/autobyteus-web/composables/messaging-binding-flow/draft-state.ts`
- Repo-wide scan evidence:
  - `rg -n "agentId|teamId|agentTeamId|agentDefinitionId|teamDefinitionId|agentRunId|teamRunId|runId|definitionId" autobyteus-web autobyteus-server-ts autobyteus-message-gateway`
  - `rg -n "targetId" autobyteus-web/components/settings/messaging autobyteus-web/stores/messaging* autobyteus-web/types/messaging.ts autobyteus-web/graphql autobyteus-server-ts/src/api/graphql/types/external-channel-setup autobyteus-server-ts/src/external-channel`

## Scope Triage

- Classification: `Medium`
- Reasoning:
  - The active mismatch is cross-layer (`server domain -> GraphQL -> web types/stores/components/tests`).
  - The problem is concentrated in the messaging / external-channel binding control-plane, not the full runtime system.
  - It needs schema/query/store/component/test updates, but it does not require a broader architectural redesign.

## Key Findings

### 1. The server runtime domain already uses explicit run naming in the actual dispatch path

The authoritative server-side messaging runtime path is already aligned:

- `ChannelBinding` uses `agentRunId` / `teamRunId` in `/autobyteus-server-ts/src/external-channel/domain/models.ts`.
- Runtime dispatch uses those explicit fields in `/autobyteus-server-ts/src/external-channel/runtime/default-channel-runtime-facade.ts`.
- Turn receipt persistence uses `agentRunId` / `teamRunId` in `/autobyteus-server-ts/src/agent-customization/processors/persistence/external-channel-turn-receipt-binding-processor.ts`.

Implication:

- The deep mismatch is not in the core dispatch/storage model.
- The mismatch is at the binding-control boundary exposed to GraphQL/web consumers.

### 2. The GraphQL external-channel binding surface still hides run identity behind `targetId`

The active GraphQL API for binding management currently uses:

- `targetType`
- `targetId`

in:

- `/autobyteus-server-ts/src/api/graphql/types/external-channel-setup/types.ts`
- `/autobyteus-server-ts/src/api/graphql/types/external-channel-setup/mapper.ts`
- `/autobyteus-server-ts/src/api/graphql/types/external-channel-setup/resolver.ts`

But the resolver immediately maps:

- `targetType === "AGENT" -> agentRunId = targetId`
- `targetType === "TEAM" -> teamRunId = targetId`

So the boundary value is always a run ID even though the schema does not say so.

Implication:

- `targetId` is semantically inaccurate.
- The correct boundary name for this API is `targetRunId`.

### 3. The web messaging binding flow propagates the same semantic blur end-to-end

The web messaging setup flow repeats `targetId` through:

- `/autobyteus-web/types/messaging.ts`
- `/autobyteus-web/graphql/queries/externalChannelSetupQueries.ts`
- `/autobyteus-web/graphql/mutations/externalChannelSetupMutations.ts`
- `/autobyteus-web/stores/messagingChannelBindingSetupStore.ts`
- `/autobyteus-web/stores/messagingChannelBindingOptionsStore.ts`
- `/autobyteus-web/stores/messagingVerificationStore.ts`
- `/autobyteus-web/components/settings/messaging/ChannelBindingSetupCard.vue`
- `/autobyteus-web/composables/useMessagingChannelBindingSetupFlow.ts`
- `/autobyteus-web/composables/messaging-binding-flow/*`

The UI labels also reinforce the ambiguity:

- placeholder `targetId`
- messages like `target: AGENT <id>`

Implication:

- The naming inconsistency is visible to both developers and users.
- The web layer should rename the field to `targetRunId` consistently.

### 4. The target-options service also uses `targetId` for values that are definitely run IDs

`ChannelBindingTargetOption` and the target-options service currently expose:

- `targetType`
- `targetId`

in:

- `/autobyteus-server-ts/src/external-channel/services/channel-binding-target-options-service.ts`
- `/autobyteus-server-ts/src/external-channel/domain/models.ts`

The service populates those fields directly from:

- active agent run IDs
- active team run IDs

Implication:

- `targetId` in option lists is also a run ID.
- These option contracts should rename to `targetRunId`.

### 5. No conflicting definition-ID mismatch was found in active messaging/external-channel code paths

The messaging/external-channel feature did not surface active uses where a runtime value is mislabeled as:

- `agentDefinitionId`
- `teamDefinitionId`
- `agentTeamDefinitionId`

within the audited binding/dispatch/verification flow.

Definition IDs still exist elsewhere in the repo for valid reasons, especially:

- team run creation / member runtime configuration
- run history / memory queries
- broader agent/team management surfaces

Implication:

- This round should focus on runtime-target naming in the messaging feature.
- It should not rename valid definition-ID references outside this feature scope.

### 6. Repo-wide scan confirms the global rename problem is broader than messaging

The broad repo scan still shows many `agentId` references in unrelated areas:

- agent customization context
- runtime adapters
- tests
- compatibility boundaries to `autobyteus-ts`

Implication:

- A full repo-wide identity cleanup remains a larger program of work.
- For this ticket, the concrete, user-visible inconsistency that is active in the current messaging feature is the `targetId` runtime naming blur.

## Canonical Naming Decision For This Ticket

For messaging / external-channel active paths:

- keep `targetType` as the runtime kind discriminator (`AGENT` or `TEAM`)
- rename `targetId` to `targetRunId`
- keep server domain storage/runtime dispatch on `agentRunId` / `teamRunId`
- do not rename valid definition references outside this feature

This gives the feature a consistent model:

- generic selection API: `targetType` + `targetRunId`
- runtime execution internals: `agentRunId` / `teamRunId`
- definition ownership elsewhere: `agentDefinitionId` / `teamDefinitionId`

## Module / File Placement Observations

- The server domain owner for binding contracts is correctly under `src/external-channel/`.
- The GraphQL boundary owner is correctly under `src/api/graphql/types/external-channel-setup/`.
- The web owner for the binding setup flow is correctly split across:
  - `types/messaging.ts`
  - `stores/messaging*`
  - `components/settings/messaging/*`
  - `composables/messaging-binding-flow/*`

No placement problem was found. The issue is naming coherence across already-correct module boundaries.

## Open Questions / Risks

1. Whether any GraphQL clients outside `autobyteus-web` still depend on `targetId`.
2. Whether this round should introduce a temporary compatibility alias or break the schema cleanly.
3. Whether the `SetupBlockerAction.targetId` field should also be renamed to `targetRunId` now for consistency, even though it is not heavily used.

## Implications For Requirements / Design

- Requirements should be narrowed from repo-wide rename language to the concrete messaging/external-channel boundary issue proven here.
- The design basis should describe one cross-layer rename set:
  - server GraphQL types/resolver/mapper
  - server target-option domain model/service
  - web GraphQL documents/types/stores/composables/components/tests
- Validation should prove:
  - no `targetId` remains in active messaging/external-channel server/web code
  - runtime semantics still flow through `agentRunId` / `teamRunId`
  - existing messaging binding tests still pass after the rename
