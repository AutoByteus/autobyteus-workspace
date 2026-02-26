# Design Document (autobyteus-server-ts: WeChat Integration)

## Summary
Server remains provider-agnostic runtime orchestration. It accepts `WECHAT` provider envelopes, enforces provider/transport binding invariants, and exposes server-side compatibility metadata for web preflight checks.

## Goals
- Support `WECHAT` in ingress/callback workflows.
- Enforce provider/transport invariants at binding write boundary.
- Expose server-owned compatibility info for setup preflight.

## Non-Goals
- No provider protocol integration.
- No gateway runtime/mode ownership.

## Requirements And Use Cases
- Use Case 1: Inbound `WECHAT + PERSONAL_SESSION` is accepted and dispatched.
- Use Case 2: Assistant callback can publish `WECHAT` envelope.
- Use Case 3: Binding mutation rejects unsupported provider/transport combinations.
- Use Case 4: Web reads server compatibility pairs for setup preflight.

## File And Module Breakdown

| File/Module | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/external-channel/domain/models.ts` | channel domain models | include `WECHAT` in provider usage | model parse/typing | autobyteus-ts |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts` | inbound orchestration | `handleInboundMessage` | envelope -> dispatch/receipt | binding/runtime/receipt |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts` | outbound callback orchestration | `publishAssistantReply` | runtime event -> callback publish | receipt + callback |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/external-channel/services/channel-binding-constraint-service.ts` (new) | provider/transport invariant policy | `validateProviderTransport` | provider+transport -> pass/fail | none |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/api/graphql/types/external-channel-setup.ts` | setup GraphQL + binding CRUD | add compatibility metadata fields + invariant validation | GraphQL input/output | binding + constraint services |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/api/graphql/schema.ts` | resolver registration | schema build | resolver list -> schema | type-graphql |

## Public API Changes (GraphQL)

Extend `externalChannelCapabilities` with server compatibility metadata:
- `acceptedProviderTransportPairs: [String!]!`

Example values:
- `WHATSAPP:BUSINESS_API`
- `WHATSAPP:PERSONAL_SESSION`
- `WECOM:BUSINESS_API`
- `WECHAT:PERSONAL_SESSION` (when server release supports it)

Mutation validation (hard guard):
- `provider=WECHAT` requires `transport=PERSONAL_SESSION`.
- `provider=WECOM` requires `transport=BUSINESS_API` (phase 1).

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation |
| --- | --- | --- | --- | --- |
| `channel-ingress-service.ts` | idempotency/binding/runtime | REST route | Low | orchestration only |
| `reply-callback-service.ts` | receipt + callback publisher | assistant subscriber | Low | provider-neutral service |
| `channel-binding-constraint-service.ts` | none | GraphQL resolver/service | Low | pure policy module |
| `external-channel-setup.ts` | binding+target+constraint services | web setup | Medium | keep GraphQL transport thin |

## Error Handling And Edge Cases
- Invalid provider/transport pair -> `UNSUPPORTED_PROVIDER_TRANSPORT_COMBINATION`.
- Missing binding/target inactive -> existing error behavior unchanged.

## Migration / Rollout
1. Consume `autobyteus-ts` with `WECHAT` enum.
2. Add binding constraint service and resolver enforcement.
3. Add capability compatibility field.
4. Add tests for constraints and compatibility field output.

## Open Questions
- None blocking design.
