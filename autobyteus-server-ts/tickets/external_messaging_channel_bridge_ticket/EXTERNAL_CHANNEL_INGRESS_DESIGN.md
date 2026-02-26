# External Channel Ingress Design (autobyteus-server-ts)

## Goal
Accept normalized external channel messages from gateway, map them to the correct agent/team context, execute using existing runtime, and return outbound callback payloads for gateway delivery.

## Scope
- In scope:
  - New REST ingress endpoints.
  - Channel binding and thread mapping.
  - Transport-aware binding policy (`BUSINESS_API` vs `PERSONAL_SESSION`) for same provider.
  - Idempotency and delivery records.
  - Channel source-context persistence in external-channel records (memory-first compatible).
  - Callback generation on assistant completion.
- Out of scope:
  - Provider-specific webhook parsing (handled by gateway).
  - Web UI implementation details.

## Separation-of-Concern Principles
1. REST routes only map HTTP to service calls.
2. Services handle orchestration and policy.
3. Providers/repositories handle data persistence.
4. Agent runtime remains unchanged and is called through existing managers.
5. External-channel ingress/callback flow must not depend on `agent-conversation` persistence.

## Concrete Use Case
Use case: gateway forwards inbound WhatsApp message for user thread `chat-123`.

1. `POST /api/channel-ingress/v1/messages` receives signed payload.
2. Signature middleware validates gateway identity when gateway secret is configured.
3. Ingress service checks idempotency key.
4. Binding resolver maps `(provider=whatsapp, transport=BUSINESS_API, peerId=chat-123)` to target:
   - existing `agentId`, or
   - lazy-creation config (`agentDefinitionId`, `workspaceId`, `llmModelIdentifier`).
5. Service calls existing `AgentRunManager` methods:
   - create instance if required
   - `postUserMessage` with metadata including external source.
6. Ingress service stores normalized source context into external-channel receipt records.
7. On assistant completion, callback service loads latest source context from external-channel provider and posts outbound envelope to gateway callback endpoint.

## Use-Case Fulfillment Matrix (Design-Level)
| Use Case | Entry Boundary | Core Orchestration | Persistence/IO Boundary | Fulfillment Verdict |
| --- | --- | --- | --- | --- |
| UC1 Inbound lazy-create + dispatch | `src/api/rest/channel-ingress.ts` | `channel-ingress-service` + `channel-runtime-facade` | `channel-binding-provider`, `channel-idempotency-provider`, `channel-message-receipt-provider` | Complete |
| UC2 Team dispatch with thread ordering | `src/api/rest/channel-ingress.ts` | `channel-ingress-service` + `channel-thread-lock-service` + `channel-runtime-facade` | `channel-binding-provider`, `channel-message-receipt-provider` | Complete |
| UC3 Assistant completion -> callback | `assistant-complete-subscriber` | `reply-callback-service` + `callback-idempotency-service` + `delivery-event-service` | `channel-message-receipt-provider`, `delivery-event-provider`, gateway callback HTTP client | Complete |
| UC4 Tool approval policy | runtime event bridge | `tool-approval-policy-service` + runtime approval port | policy config provider + optional policy event provider | Complete |
| UC5 Transport-safe routing | `src/api/rest/channel-ingress.ts` | `channel-binding-service` + ingress transport assertion | transport-aware binding uniqueness in DB | Complete |
| UC6 Delivery-event ingestion | `src/api/rest/channel-ingress.ts` (`POST /api/channel-ingress/v1/delivery-events`) | route-level callback key resolution + `delivery-event-service` | `delivery-event-provider` | Complete |

## File-Level Design

### REST API and Transport

#### `src/api/rest/channel-ingress.ts` (new)
- Concern: Register channel ingress REST endpoints.
- Public APIs:
  - `registerChannelIngressRoutes(app: FastifyInstance, deps?: ChannelIngressRouteDependencies): Promise<void>`
- Endpoints:
  - `POST /api/channel-ingress/v1/messages`
  - `POST /api/channel-ingress/v1/delivery-events`
- Delivery-event callback key resolution policy:
  1. `metadata.callbackIdempotencyKey`
  2. `metadata.callback_idempotency_key`
  3. fallback to `correlationMessageId`

#### `src/api/rest/index.ts` (modify)
- Concern: root REST router composition.
- Change:
  - include `registerChannelIngressRoutes(app, getDefaultChannelIngressRouteDependencies())`.

#### `src/api/rest/middleware/verify-gateway-signature.ts` (new)
- Concern: Authenticate gateway requests.
- Public APIs:
  - `verifyGatewaySignature(input: VerifyGatewaySignatureInput): GatewayAuthResult`
- Signature enforcement policy:
  - if `CHANNEL_GATEWAY_SHARED_SECRET` is set: enforce signature and timestamp checks.
  - if unset: skip signature verification (local/dev compatibility mode).

### Domain and Services (External Channel Module)

#### `src/external-channel/domain/models.ts` (new)
- Concern: Server-owned channel entities and result contracts.
- Public APIs:
  - `type ChannelBinding`
  - `type DeliveryEvent`

Shared contract policy:
- Import `ExternalChannelProvider` and `ExternalMessageEnvelope` from `autobyteus-ts`.
- Import `ExternalChannelTransport` from `autobyteus-ts`.
- Do not duplicate canonical envelope/provider enums in server domain models.

#### `src/external-channel/services/channel-ingress-service.ts` (new)
- Concern: End-to-end ingress orchestration.
- Public APIs:
  - `handleInboundMessage(input: ExternalMessageEnvelope): Promise<ChannelIngressResult>`
- Uses:
  - idempotency service
  - binding service
  - agent runtime facade

#### `src/external-channel/services/channel-binding-service.ts` (new)
- Concern: Resolve target agent/team mapping.
- Public APIs:
  - `resolveBinding(provider, transport, accountId, peerId, threadId): Promise<ResolvedBinding | null>`
  - `findBindingByDispatchTarget(target): Promise<ChannelBinding | null>`
  - `upsertBinding(input: UpsertBindingInput): Promise<ChannelBinding>`

#### `src/external-channel/services/channel-idempotency-service.ts` (new)
- Concern: Duplicate suppression contract.
- Public APIs:
  - `ensureFirstSeen(key: ChannelIdempotencyKey): Promise<IdempotencyDecision>`

Behavior:
- Must rely on DB-level unique constraint and transactional insert semantics for multi-instance correctness.

#### `src/external-channel/services/reply-callback-service.ts` (new)
- Concern: Convert assistant completion into outbound callback payload.
- Public APIs:
  - `publishAssistantReply(event: AssistantCompleteEvent): Promise<void>`

#### `src/external-channel/services/callback-idempotency-service.ts` (new)
- Concern: Prevent duplicate outbound callback publication on subscriber retries.
- Public APIs:
  - `reserveCallbackKey(key: string, ttlSeconds: number): Promise<{ duplicate: boolean }>`

#### `src/external-channel/services/channel-thread-lock-service.ts` (new)
- Concern: Serialize dispatch per external thread key to preserve ordering.
- Public APIs:
  - `withThreadLock(key: ChannelThreadKey, work: () => Promise<T>): Promise<T>`

Thread key composition:
- `ChannelThreadKey = (provider, transport, accountId, peerId, threadId|null)`.

#### `src/external-channel/services/tool-approval-policy-service.ts` (new)
- Concern: Resolve tool-approval behavior for channel-originated runs.
- Public APIs:
  - `resolvePolicy(context: ChannelRunContext): ToolApprovalPolicy`
  - `handleApprovalRequested(input: ApprovalRequestedInput): Promise<void>`

Phase 1 supported modes:
- `AUTO_APPROVE`
- `AUTO_DENY`
- `TIMEOUT_DENY`

`WEB_QUEUE` is explicitly deferred to Phase 2.

#### `src/external-channel/services/delivery-event-service.ts` (new)
- Concern: Process gateway delivery updates.
- Public APIs:
  - `recordPending(input: RecordChannelDeliveryEventInput): Promise<ChannelDeliveryEvent>`
  - `recordSent(input: RecordChannelDeliveryEventInput): Promise<ChannelDeliveryEvent>`
  - `recordFailed(input: RecordChannelDeliveryEventInput): Promise<ChannelDeliveryEvent>`

### Runtime Facade

#### `src/external-channel/runtime/channel-runtime-facade.ts` (new)
- Concern: Isolate calls to existing agent/team managers.
- Public APIs:
  - `dispatchToBinding(binding, envelope): Promise<RuntimeDispatchResult>`
  - internal helpers (implementation file): `dispatchToAgent(...)`, `dispatchToTeam(...)`

#### `src/external-channel/runtime/default-channel-runtime-facade.ts` (new)
- Concern: Concrete implementation for runtime dispatch and lazy create/update behavior.
- Public APIs:
  - `dispatchToBinding(binding, envelope): Promise<RuntimeDispatchResult>`

#### `src/external-channel/runtime/default-channel-ingress-route-dependencies.ts` (new)
- Concern: Compose production dependency graph for channel-ingress REST routes.
- Public APIs:
  - `getDefaultChannelIngressRouteDependencies(): ChannelIngressRouteDependencies`

#### `src/external-channel/runtime/channel-runtime-approval-port.ts` (new)
- Concern: isolate tool-approval command publication from dispatch facade concern.
- Public APIs:
  - `postToolExecutionApproval(agentId, invocationId, approved): Promise<void>`

#### `src/external-channel/subscribers/assistant-complete-subscriber.ts` (new)
- Concern: Subscribe to runtime assistant-complete events and trigger reply callbacks.
- Public APIs:
  - `startAssistantCompleteSubscriber(deps: AssistantCompleteSubscriberDeps): Promise<void>`

#### `src/external-channel/subscribers/tool-approval-requested-subscriber.ts` (new)
- Concern: Bridge runtime tool-approval events into channel policy handling.
- Public APIs:
  - `startToolApprovalRequestedSubscriber(deps: ToolApprovalSubscriberDeps): Promise<void>`

### Persistence and Providers

#### `src/external-channel/providers/channel-binding-provider.ts` (new)
- Concern: persistence abstraction for bindings.
- Public APIs:
  - `findBinding(...)`
  - `findProviderDefaultBinding(...)`
  - `findBindingByDispatchTarget(target): Promise<ChannelBinding | null>`
  - `upsertBinding(...)`
  - `upsertBindingAgentId(bindingId, agentId): Promise<ChannelBinding>`
  - `listBindings(...)`

Binding lookup key policy:
- Runtime lookup key includes `(provider, transport, accountId, peerId, threadId)`.
- This avoids collisions when one person uses both WhatsApp Business and personal-session channels.

#### `src/external-channel/providers/sql-channel-binding-provider.ts` (new)
- Concern: Prisma-backed binding storage.

#### `src/external-channel/providers/channel-idempotency-provider.ts` (new)
- Concern: idempotency key storage abstraction.

#### `src/external-channel/providers/sql-channel-idempotency-provider.ts` (new)
- Concern: Prisma-backed idempotency storage.

#### `src/external-channel/providers/delivery-event-provider.ts` (new)
- Concern: delivery event persistence abstraction.

#### `src/external-channel/providers/sql-delivery-event-provider.ts` (new)
- Concern: Prisma-backed delivery event persistence.

#### `src/external-channel/providers/channel-source-context-provider.ts` (new)
- Concern: narrow lookup abstraction used by callback path.
- Public APIs:
  - `getLatestSourceByAgentId(agentId: string): Promise<ChannelSourceContext | null>`

#### `src/external-channel/providers/sql-channel-source-context-provider.ts` (new)
- Concern: Prisma-backed lookup implementation that composes `ChannelMessageReceipt` reads.

### GraphQL Admin Surface

#### `src/api/graphql/types/channel-binding.ts` (new)
- Concern: admin mutation/query API for bindings.
- Public APIs:
  - `upsertChannelBinding(input): ChannelBindingResult`
  - `channelBindings(filter): [ChannelBindingInfo]`

Binding GraphQL input includes:
- `transport: ExternalChannelTransport`

#### `src/api/graphql/types/channel-delivery.ts` (new)
- Concern: delivery observability API.
- Public APIs:
  - `channelDeliveries(filter): [ChannelDeliveryInfo]`

#### `src/api/graphql/schema.ts` (modify)
- Concern: resolver registration.
- Change:
  - add new channel resolvers.

### Channel Source Context Persistence (Memory-First)

#### `prisma/schema.prisma` (modify)
- Concern: schema for external-channel bindings, receipts, and delivery events.
- Additions:
  - New models: `ChannelBinding`, `ChannelMessageReceipt`, `ChannelDeliveryEvent`.
  - No `AgentConversationMessage` schema changes in this feature.
  - No dependency on optional conversation persistence processors.

#### `src/external-channel/providers/channel-message-receipt-provider.ts` (new)
- Concern: persist ingress receipts and source context needed for callbacks.
- Public APIs:
  - `recordIngressReceipt(input): Promise<void>`
  - `getLatestSourceByAgentId(agentId: string): Promise<ChannelSourceContext | null>`

#### `src/external-channel/providers/sql-channel-message-receipt-provider.ts` (new)
- Concern: Prisma-backed receipt/source-context persistence.

#### `src/external-channel/services/channel-ingress-service.ts` (update)
- Concern: write source context at ingress boundary.
- Change:
  - `recordIngressReceipt(...)` stores `(provider, transport, accountId, peerId, threadId, externalMessageId, agentId/teamId)` in channel receipt table.
  - `assertTransportCompatible(...)` returns deterministic `409 CHANNEL_TRANSPORT_MISMATCH`.
  - orchestration uses one transaction boundary for lazy create + binding update + ingress receipt write.

## Existing Files Explicitly Involved
- `src/api/rest/channel-ingress.ts`
- `src/api/rest/middleware/verify-gateway-signature.ts`
- `src/api/rest/index.ts`
- `src/api/graphql/schema.ts`
- `prisma/schema.prisma`
- `src/external-channel/runtime/channel-runtime-facade.ts`
- `src/external-channel/runtime/default-channel-runtime-facade.ts`
- `src/external-channel/runtime/default-channel-ingress-route-dependencies.ts`
- `src/external-channel/runtime/channel-runtime-approval-port.ts`
- `src/external-channel/providers/channel-message-receipt-provider.ts`
- `src/external-channel/providers/sql-channel-message-receipt-provider.ts`
- `src/external-channel/providers/channel-binding-provider.ts`
- `src/external-channel/providers/sql-channel-binding-provider.ts`
- `src/external-channel/providers/channel-idempotency-provider.ts`
- `src/external-channel/providers/sql-channel-idempotency-provider.ts`
- `src/external-channel/providers/delivery-event-provider.ts`
- `src/external-channel/providers/sql-delivery-event-provider.ts`
- `src/external-channel/services/channel-ingress-service.ts`
- `src/external-channel/services/reply-callback-service.ts`
- `src/external-channel/services/callback-idempotency-service.ts`
- `src/external-channel/services/delivery-event-service.ts`
- `src/external-channel/services/tool-approval-policy-service.ts`
- `src/external-channel/subscribers/assistant-complete-subscriber.ts`
- `src/external-channel/subscribers/tool-approval-requested-subscriber.ts`

## Error Handling
- Invalid gateway signature: `401`.
- Invalid or blank `correlationMessageId` in delivery-event payload: `400` parse error (`INVALID_INPUT`, `field=correlationMessageId`).
- Idempotency duplicate: return success with `duplicate=true`, no runtime dispatch.
- Missing binding and no lazy-create config: `422` with actionable error.
- Runtime dispatch failures: persist failure event and return `500`.
- Lazy-create partial failures: rollback transaction and return `500` with stable error code.
- Tool approval unresolved: apply configured policy (`AUTO_DENY` by default) and continue run deterministically.
- Callback duplicate publication: short-circuit publish when callback idempotency key already reserved.
- Callback idempotency reservation uses configured TTL from channel callback policy config.
- Transport mismatch against binding policy: return `409` with stable code `CHANNEL_TRANSPORT_MISMATCH`.
- Gateway signature enforcement is conditional:
  - enforced when shared secret is configured,
  - bypassed when shared secret is unset.

## Testing Strategy
- Unit:
  - binding resolution precedence.
  - idempotency decisions.
  - source-context write/read via channel receipt provider.
  - tool-approval policy decisions.
  - thread lock serialization behavior.
- Integration:
  - REST ingress route -> service -> mocked runtime facade.
  - callback service posts expected payload.
  - assistant-complete subscriber -> reply callback service.
- DB:
  - Prisma migration tests for new models/columns.
  - uniqueness/transactional idempotency behavior under concurrency.

## Pre-Implementation Blocking Gate
- Follow cross-project validation matrix in:
  - `/Users/normy/autobyteus_org/autobyteus-message-gateway/tickets/external_messaging_channel_bridge_ticket/PRE_IMPLEMENTATION_VALIDATION_GATE.md`
- Server implementation starts only after all P0 scenarios pass.

## Refinements After Runtime Simulation
1. Add assistant-complete subscriber to close callback-trigger gap.
2. Add thread lock service to preserve per-thread message order.
3. Add explicit tool-approval policy service for channel-originated runs.
4. Require transactional consistency for lazy create + binding update + receipt write.
5. Enforce DB-backed idempotency guarantees for multi-instance deployments.
6. Add callback idempotency service to avoid duplicated outbound publication.
7. Add dedicated channel source context provider to avoid overloading conversation persistence proxy responsibilities.
8. Make callback-idempotency TTL explicit in service contract.
9. Defer `WEB_QUEUE` approval mode to Phase 2 for cleaner Phase 1 boundaries.
10. Add transport-aware binding resolution to support dual-mode WhatsApp in one deployment.
11. Add explicit route dependency composer to prevent unconfigured channel-ingress runtime wiring.
12. Add explicit delivery-event callback-key resolution order to keep gateway/server contracts deterministic.

## Design Iteration Verdict
- Runtime call stacks are now API-consistent with the design file and cover all five in-scope use cases end-to-end at design level.
- Separation of concerns is explicit:
  - route/middleware: transport + auth boundary
  - orchestration services: policy + branching
  - runtime dispatch facade: message dispatch boundary
  - runtime approval port: approval command boundary
  - providers: persistence boundary
  - subscribers: event ingress boundary
- No blocking design-level gap remains for Phase 1.
