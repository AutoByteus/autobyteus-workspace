# Outbound Reply Delivery Redesign (autobyteus-message-gateway)

## Summary
Gateway outbound path is reused, with redesign refinements for callback authentication, provider-safe text delivery, and deterministic delivery lifecycle reporting.

## Goals
- Accept only authenticated server callback requests.
- Deliver text-only replies to WhatsApp/WeChat personal transports reliably.
- Keep retries, delivery reporting, and dead-letter behavior isolated and observable.

## Non-Goals
- Streaming responses over messaging channels.
- Tool approval interactions over channel messages.
- Rich-media send parity in phase 1.

## Requirements And Use Cases
- UC1: Authenticated server callback accepted and idempotency-protected.
- UC2: Text reply delivered via WhatsApp personal session.
- UC3: Text reply delivered via WeChat personal sidecar.
- UC4: Long text is split by provider-safe chunk planner before send.
- UC5: Failed sends retry and finally dead-letter with FAILED delivery event.
- UC6: Local dev mode without callback secret is explicitly supported.

## Architecture Overview
1. `POST /api/server-callback/v1/messages` validates callback signature when secret configured.
2. Callback idempotency prevents duplicate sends.
3. Outbound service routes by `(provider, transport)`.
4. Chunk planner splits large text payload into provider-safe pieces.
5. Adapter sends one or multiple text messages.
6. Delivery status service reports `DELIVERED` or `FAILED` back to server.

## File And Module Breakdown

| File/Module | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/http/routes/server-callback-route.ts` | HTTP callback boundary | `registerServerCallbackRoutes(app, deps)` | In: outbound envelope; Out: acceptance response | parser, idempotency, outbound service |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/http/middleware/verify-server-callback-signature.ts` (new) | Authenticate callback source | `verifyServerCallbackSignature(input)` | In: raw body + headers + secret; Out: allow/deny | signature utility |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/application/services/outbound-message-service.ts` | Outbound orchestration + retry | `handleOutbound(payload)` | In: envelope; Out: delivery result | adapters, chunk planner, delivery status, dead-letter |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/application/services/outbound-chunk-planner.ts` (new) | Provider-safe chunk sizing | `planChunks(payload)` | In: reply text + route; Out: ordered chunk list | policy constants |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/infrastructure/adapters/whatsapp-personal/whatsapp-personal-adapter.ts` | WhatsApp session send transport | `sendOutbound(payload)` | In: peer route + text chunks; Out: provider send result | session client |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/infrastructure/adapters/wechat-personal/wechat-personal-adapter.ts` | WeChat sidecar send transport | `sendOutbound(payload)` | In: peer route + text chunks; Out: provider send result | sidecar client |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/application/services/delivery-status-service.ts` | Delivery lifecycle reporting | `record(event)`, `publishToServer(event)` | In: delivery status; Out: local record + server post | server client |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/application/services/dead-letter-service.ts` | Terminal-failure diagnostics | `recordFailedOutbound(payload, error)` | In: failure context; Out: dead-letter record | none |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/config/runtime-config.ts` | Callback security/runtime policy config | `buildRuntimeConfig(env)` | env -> typed config | env parser |

### Callback Security Config Contract
- `GATEWAY_SERVER_CALLBACK_SHARED_SECRET` (preferred): secret used to verify server->gateway callback signatures.
- Backward-compat fallback: if preferred var is empty, reuse `GATEWAY_SERVER_SHARED_SECRET`.
- If neither is configured, callback signature verification is disabled (dev mode).

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| callback route | parser + signature + services | outbound pipeline | Low | HTTP route does not know provider SDK details |
| outbound service | adapters + chunk planner + status services | provider sends | Medium | Keep chunk planning separate from transport adapter concerns |
| chunk planner | provider policy table | outbound service | Low | Stateless pure function layer |
| adapters | provider SDK/sidecar | outbound service | Low | Single responsibility: send text messages |

## Data Models (If Needed)
- `ExternalOutboundEnvelope` (shared)
- `PlannedOutboundChunk`
  - `index: number`
  - `text: string`

## Error Handling And Edge Cases
- Duplicate callback idempotency key -> accepted duplicate response, no resend.
- Signature mismatch -> 401 when callback secret configured.
- Callback secret missing -> signature verification bypassed (dev mode only).
- No active personal session -> retry then dead-letter.
- Empty text after normalization -> fail fast (`INVALID_OUTBOUND_TEXT`).
- Provider message-size overflow -> prevented by chunk planner policy.

## Performance / Security Considerations
- Bounded retry backoff prevents retry storms.
- Callback auth uses HMAC signature verification over raw body.
- Log only ids/status by default (no full content dumps).

## Migration / Rollout (If Needed)
1. Add callback signature middleware and env config.
2. Add chunk planner integration in outbound service.
3. Deploy with shared callback secret aligned to server callback publisher.
4. Observe FAILED/DELIVERED ratios and dead-letter volume.

## Design Feedback Loop Notes (From Deep Inspection)

| Date | Trigger (File/Test/Blocker) | Design Smell | Design Update Applied | Status |
| --- | --- | --- | --- | --- |
| 2026-02-09 | Call-stack deep review | Callback auth boundary not explicit in runtime flow | Added dedicated callback-signature middleware layer | Updated |
| 2026-02-09 | Call-stack deep review | Text-size handling concern mixed with transport | Added `outbound-chunk-planner.ts` concern split | Updated |

## Open Questions
- Phase 2: persist dead-letter records to durable store (DB/file) instead of in-memory only.
