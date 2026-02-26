# Design Document (autobyteus-server-ts: Unbound Ingress Disposition, Rev 3)

## Summary
Functional gap remains:
- unbound inbound still throws and maps to `422`.

Structure-level smell also exists:
- `channel-ingress.ts` (274 LOC) combines two route domains (message ingress + delivery events), signature verification helpers, callback idempotency normalization, and error mapping in one file.

This revision keeps functional contract fix and improves route separation.

## Goals
- Unbound inbound returns accepted `202` with explicit `UNBOUND` disposition.
- Preserve strict routing gate and current parse/auth semantics.
- Split route concerns for clearer boundaries and easier tests.

## Non-Goals
- No auto-binding.
- No replay queue.
- No runtime dispatch architecture changes.

## Requirements And Use Cases
- Use Case 1: Unknown peer inbound -> `202`, `disposition='UNBOUND'`, `bindingResolved=false`.
- Use Case 2: Bound peer inbound -> `202`, `disposition='ROUTED'`.
- Use Case 3: Duplicate inbound -> `202`, `disposition='DUPLICATE'`.
- Use Case 4: Invalid inbound payload -> `400`.
- Use Case 5: Delivery events remain isolated from ingress behavior changes.

## Architecture Overview
- Service returns typed `ChannelIngressResult` without exception for unbound state.
- Route layer split:
  - message ingress route module,
  - delivery-event route module,
  - shared helper for signature and common error mapping.

## File And Module Breakdown

| File/Module | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts` | Ingress disposition orchestration | `handleInboundMessage(envelope)` | envelope -> typed result | idempotency, binding, runtime, receipt services |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/api/rest/channel-ingress-message-route.ts` (new) | Message ingress HTTP mapping only | `POST /api/channel-ingress/v1/messages` | parsed envelope -> 202/4xx/5xx payload | ingress service + shared helpers |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/api/rest/channel-delivery-event-route.ts` (new) | Delivery-event HTTP mapping only | `POST /api/channel-ingress/v1/delivery-events` | parsed event -> persistence acknowledgement | delivery-event service + shared helpers |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/src/api/rest/channel-ingress-route-shared.ts` (new) | Shared signature verification + route error helpers | helper funcs | raw request/error -> normalized outputs | signature middleware |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/tests/unit/api/rest/channel-ingress.test.ts` | Message ingress route behavior tests | tests | request -> response | fastify inject |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/tests/integration/api/rest/channel-ingress.integration.test.ts` | End-to-end ingress/delivery integration checks | tests | route -> DB state | real providers |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `channel-ingress-service.ts` | domain services | message route | Low | service remains HTTP-agnostic |
| `channel-ingress-message-route.ts` | ingress service + shared helpers | gateway | Low | only message ingress concern |
| `channel-delivery-event-route.ts` | delivery-event service + shared helpers | gateway delivery callback | Low | no message ingress logic inside |
| `channel-ingress-route-shared.ts` | middleware types | both routes | Medium | strictly helper-only; no service calls |

## Data Models
`ChannelIngressResult` payload target fields:
- `disposition: 'ROUTED' | 'UNBOUND' | 'DUPLICATE'`
- `bindingResolved: boolean`
- existing fields preserved (`accepted`, `duplicate`, `idempotencyKey`, `bindingId`, `usedTransportFallback`).

## Error Handling And Edge Cases
- Missing binding -> no throw; return `UNBOUND`.
- Duplicate -> no dispatch.
- Parse/auth/not-configured/unexpected errors remain mapped to 4xx/5xx.
- Delivery-event route behavior unchanged by ingress disposition changes.

## Migration / Rollout
1. Implement no-throw `UNBOUND` service path.
2. Split route file while preserving path URLs.
3. Update unit tests and integration tests.
4. Deploy before gateway disposition-aware behavior.

## Design Feedback Loop Notes (From Verification)

| Date | Trigger (File/Test/Blocker) | Design Smell | Design Update Applied | Status |
| --- | --- | --- | --- | --- |
| 2026-02-09 | unbound still mapped to exception/422 | onboarding state modeled as hard error | disposition-based service result | In Progress |
| 2026-02-09 | `channel-ingress.ts` multi-domain route file | mixed concerns reduce maintainability | split message/delivery routes with shared helpers | Planned |

## Open Questions
- None blocking.
