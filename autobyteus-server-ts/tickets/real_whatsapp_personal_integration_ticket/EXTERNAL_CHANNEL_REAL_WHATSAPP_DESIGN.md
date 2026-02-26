# Design Document

## Summary
`autobyteus-server-ts` already accepts transport-aware external messages through `/api/channel-ingress/v1/messages`. For real WhatsApp personal mode, server changes focus on two concerns:
- keep runtime dispatch and memory-first behavior stable;
- expose setup/admin surfaces required by web (capabilities + binding CRUD) without coupling to conversation persistence.

## Validation Snapshot (2026-02-09)
Runtime + test validation confirms this design is implemented for the current server scope.

Validated:
- GraphQL setup APIs are exposed in schema:
  - `externalChannelCapabilities`
  - `externalChannelBindings`
  - `upsertExternalChannelBinding`
  - `deleteExternalChannelBinding`
- Resolver file exists and is registered:
  - `/src/api/graphql/types/external-channel-setup.ts`
  - `/src/api/graphql/schema.ts`
- Dispatch-target source lookup is implemented:
  - `channel-message-receipt-service.ts`
  - `sql-channel-message-receipt-provider.ts`
  - consumed by `reply-callback-service.ts` with agent-id fallback for compatibility
- GraphQL setup e2e coverage exists and passes:
  - `tests/e2e/external-channel/external-channel-setup-graphql.e2e.test.ts`

Design implication:
- The architecture is valid and the previously tracked implementation gaps for this ticket are closed.

## Goals
- Keep external ingress transport-agnostic (`BUSINESS_API` and `PERSONAL_SESSION`).
- Preserve memory-first agent execution flow; do not depend on `agent-conversation` persistence.
- Ensure callback publication can resolve source context for both AGENT and TEAM targets.
- Expose GraphQL setup APIs consumed by `autobyteus-web` setup stores.

## Non-Goals
- No provider-specific webhook/session logic inside server.
- No reintroduction of mandatory conversation-message persistence.
- No web monitoring/event-stream UI backend in this phase.

## Requirements And Use Cases
- Use Case 1: Personal-session inbound envelope dispatches to target agent/team and records source context.
- Use Case 2: Assistant completion publishes callback envelope to gateway using recorded source context.
- Use Case 3: Gateway delivery-event callback updates delivery state.
- Use Case 4: Setup UI queries capability and manages binding CRUD.

## Architecture Overview

Inbound/outbound contract remains:
- Gateway sends normalized envelopes.
- Server resolves binding and dispatches to runtime.
- Runtime/memory system handles context and state.
- Reply callback service emits normalized outbound envelope.

Key refinement:
- Source context lookup should support dispatch target (`agentId` OR `teamId`) to avoid callback gaps in team-only flows.

## File And Module Breakdown

| File/Module | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/api/rest/channel-ingress.ts` | Ingress + delivery-event REST transport | `registerChannelIngressRoutes` | input: signed gateway payloads; output: accepted/error responses | ingress + delivery services |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts` | Inbound orchestration | `handleInboundMessage` | input: `ExternalMessageEnvelope`; output: idempotency/binding dispatch result | binding/idempotency/runtime/receipt services |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/external-channel/runtime/default-channel-runtime-facade.ts` | Dispatch message into agent/team runtime | `dispatchToBinding` | input: binding+envelope; output: dispatch result | instance managers |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/external-channel/services/channel-message-receipt-service.ts` | Store ingress receipt and retrieve source context | `recordIngressReceipt`, `getLatestSourceByAgentId` (compat), `getLatestSourceByDispatchTarget` (preferred) | input: receipt context and dispatch target; output: callback source | receipt provider |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/external-channel/providers/channel-message-receipt-provider.ts` | Receipt persistence abstraction | `recordIngressReceipt`, `getLatestSourceByAgentId` (compat), `getLatestSourceByDispatchTarget` (preferred) | input/output contracts | SQL provider |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/external-channel/providers/sql-channel-message-receipt-provider.ts` | Prisma receipt persistence | provider implementation | DB row upsert/fetch | prisma repository |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts` | Build and publish outbound envelope | `publishAssistantReply`, `buildAssistantReplyEnvelope` | input: assistant completion context; output: callback publish result | receipt/binding/callback services |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/external-channel/services/delivery-event-service.ts` | Delivery lifecycle recording | `recordPending`, `recordSent`, `recordFailed` | input: delivery event; output: persisted lifecycle | delivery provider |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/api/graphql/types/external-channel-setup.ts` (new) | Setup capability + binding CRUD GraphQL surface | `externalChannelCapabilities`, `externalChannelBindings`, `upsertExternalChannelBinding`, `deleteExternalChannelBinding` | input: setup mutations/queries; output: setup DTOs | binding service |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/api/graphql/schema.ts` | GraphQL resolver registration | `buildGraphqlSchema` | input: resolver set; output: executable schema | setup resolver |

## Public API Additions

GraphQL setup APIs (required by web store):
- Query `externalChannelCapabilities: ExternalChannelCapabilities!`
- Query `externalChannelBindings: [ExternalChannelBinding!]!`
- Mutation `upsertExternalChannelBinding(input: UpsertExternalChannelBindingInput!): ExternalChannelBinding!`
- Mutation `deleteExternalChannelBinding(id: String!): Boolean!`

Capability contract:
- `bindingCrudEnabled: Boolean!`
- `reason: String`

## Locked Refinements For Real Personal Mode

1. Dispatch-target source lookup
- Add receipt provider/service API:
  - `getLatestSourceByDispatchTarget(target: { agentId?: string | null; teamId?: string | null }): Promise<ChannelSourceContext | null>`
- Update `reply-callback-service.ts` to use dispatch-target lookup first and keep `getLatestSourceByAgentId` as temporary compatibility fallback.

2. Keep memory-first contract explicit
- External-channel modules only store routing/source/delivery metadata.
- No dependency on `agent-conversation` processors/tables for this feature.

3. Callback robustness
- Ensure callback metadata carries enough correlation info for both agent and team runs.

## Implementation Gate (Must Pass Before Web Setup Is Considered Complete)

1. GraphQL setup resolver exists at `/src/api/graphql/types/external-channel-setup.ts` and compiles.
2. `/src/api/graphql/schema.ts` registers the setup resolver.
3. GraphQL introspection returns all 4 setup fields:
   - `externalChannelCapabilities`
   - `externalChannelBindings`
   - `upsertExternalChannelBinding`
   - `deleteExternalChannelBinding`
4. `channel-message-receipt-service` and provider support `getLatestSourceByDispatchTarget(...)`.
5. `reply-callback-service` uses dispatch-target lookup first and agent-id lookup only as compatibility fallback.
6. GraphQL e2e tests verify setup query/mutation behavior and schema registration.

Gate status (2026-02-09): Passed.

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `channel-ingress.ts` | parse/verify + ingress services | gateway ingress caller | Low | route remains transport-only |
| `channel-ingress-service.ts` | binding/idempotency/runtime/receipt | route + tests | Medium | strict orchestration role; no provider code |
| `default-channel-runtime-facade.ts` | instance managers | ingress service | Low | runtime entry only |
| `reply-callback-service.ts` | receipt + binding + callback publisher | assistant-complete subscriber | Medium | isolate source lookup logic in receipt service |
| `external-channel-setup GraphQL resolver` | binding service | web setup UI | Low | setup-only GraphQL surface |

## Data Models (If Needed)

```ts
export interface ExternalChannelCapabilities {
  bindingCrudEnabled: boolean;
  reason?: string;
}

export interface DispatchTargetSourceLookup {
  agentId?: string | null;
  teamId?: string | null;
}
```

## Error Handling And Edge Cases
- Signature verification failure: HTTP `401`.
- Missing binding: HTTP `422` (`CHANNEL_BINDING_NOT_FOUND`).
- Duplicate inbound: accepted response with `duplicate=true`.
- Callback source missing: callback service returns `SOURCE_NOT_FOUND`.
- Team-only dispatch without agent id: resolved by dispatch-target source lookup refinement.

## Performance / Security Considerations
- Keep idempotency DB-backed for multi-instance correctness.
- Keep ingress route verification cheap and deterministic.
- Avoid storing provider payload blobs; store only minimal normalized source context.
- Ensure callback path cannot publish without reserved callback idempotency key.

## Migration / Rollout (If Needed)
1. Add GraphQL setup resolver and schema registration.
2. Add dispatch-target source lookup in receipt provider/service.
3. Update callback service to consume dispatch-target lookup.
4. Validate ingress/callback integration tests for personal transport.

## Defaults Chosen (Locked)
- Binding CRUD auth policy in phase 1: reuse existing authenticated GraphQL admin boundary; no new role-specific policy module is added in this ticket.
- Role-specific binding authorization is explicitly deferred to a dedicated hardening ticket.

## Design Feedback Loop Notes (From Implementation)

| Date | Trigger (File/Test/Blocker) | Design Smell | Design Update Applied | Status |
| --- | --- | --- | --- | --- |
| 2026-02-09 | Runtime trace review for team callbacks | source lookup too agent-centric | add dispatch-target source lookup contract | Updated |
| 2026-02-09 | Web setup store integration review | capability/binding GraphQL surface not registered in schema | introduce setup resolver and schema wiring | Updated |

## Open Questions
- None for phase 1.
