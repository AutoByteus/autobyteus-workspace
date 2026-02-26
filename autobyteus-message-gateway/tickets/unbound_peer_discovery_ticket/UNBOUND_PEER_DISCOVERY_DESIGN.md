# Design Document (autobyteus-message-gateway: Unbound Peer Discovery, Rev 4)

## Summary
Re-verification confirms both functional and structure-level issues:
- Functional gaps:
  - non-text inbound is dropped before peer observation,
  - unbound ingress still becomes error due server 422 contract,
  - bridge cannot distinguish expected `UNBOUND` from real forwarding failures.
- Structure smell:
  - `whatsapp-personal-adapter.ts` is oversized and mixes session lifecycle, reconnect policy, inbound observation/routing orchestration, outbound send, and persistence concerns.

This revision preserves the onboarding flow and improves separation of concerns with explicit module boundaries.

## Goals
- Peer discovery works before binding for text and non-text inbound.
- Expected unbound onboarding states do not generate error-noise.
- Bound routing behavior remains unchanged.
- Reduce cross-cutting responsibilities in oversized adapter file.

## Non-Goals
- No auto-binding.
- No replay/queue for pre-bind messages.
- No outbound transport semantics changes.

## Requirements And Use Cases
- Use Case 1: Unknown direct peer text before binding -> peer discovered, ingress `UNBOUND`, non-error logging.
- Use Case 2: Unknown non-text message before binding -> peer discovered, routing lane skipped.
- Use Case 3: Bound peer inbound -> routed normally.
- Use Case 4: Group message without mention -> observation still recorded, forwarding blocked by mention policy.
- Use Case 5: Network/signature/server failures -> error-level diagnostics preserved.
- Use Case 6: Mention-policy blocked inbound should be visible in non-error diagnostics to avoid "silent no-response" confusion.

## Architecture Overview
Two lanes remain:
- Observation lane (always attempt): peer extraction + candidate index update.
- Routing lane (conditional): envelope mapping + mention/idempotency checks + server forwarding.

Refactor boundary:
- keep `whatsapp-personal-adapter.ts` as high-level orchestrator,
- move concerns into focused collaborators.

## File And Module Breakdown

| File/Module | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/infrastructure/adapters/whatsapp-personal/baileys-session-client.ts` | BAILEYS event translation only | `onInboundMessage` | WA event -> `PersonalInboundMessageEvent` with `text: string | null` | BAILEYS SDK |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/infrastructure/adapters/whatsapp-personal/whatsapp-personal-adapter.ts` | Top-level adapter orchestration only | session adapter APIs | delegates to runtime helpers | session runtime + inbound processor + outbound sender |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/infrastructure/adapters/whatsapp-personal/whatsapp-session-runtime.ts` (new) | Session state lifecycle + reconnect scheduling | `attach`, `detach`, `scheduleReconnect` | connection updates -> session state transitions | session client, credential store |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/infrastructure/adapters/whatsapp-personal/whatsapp-inbound-observer.ts` (new) | Peer observation mapping/indexing | `observeInbound` | inbound event -> candidate index updates | peer-candidate-index |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/infrastructure/adapters/whatsapp-personal/whatsapp-inbound-router.ts` (new) | Envelope mapping + publish to bridge handlers | `routeInboundIfRoutable` | inbound event -> optional envelope dispatch | envelope mapper |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/infrastructure/adapters/whatsapp-personal/whatsapp-outbound-sender.ts` (new) | Account/session outbound send resolution | `sendOutbound` | outbound envelope -> provider send result | session lookup + client |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/application/services/inbound-message-service.ts` | Idempotency + mention policy + server forwarding | `handleNormalizedEnvelope` | envelope -> forwarding result | idempotency, mention policy, server client |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/application/services/session-inbound-bridge-service.ts` | Inbound forwarding error/severity policy | `handleSessionEnvelope` | envelope -> severity-specific log/report | inbound message service |
| `/Users/normy/autobyteus_org/autobyteus-message-gateway/src/infrastructure/server-api/autobyteus-server-client.ts` | Server ingress contract parsing | `forwardInbound` | ingress response -> `{disposition,...}` | fetch/signature |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `whatsapp-personal-adapter.ts` | runtime helpers | session service | Medium | keep it orchestration-only after split |
| `whatsapp-session-runtime.ts` | session client + store | adapter | Low | state machine concern only |
| `whatsapp-inbound-observer.ts` | peer index | adapter | Low | pure observation lane |
| `whatsapp-inbound-router.ts` | mapper + handlers | adapter | Low | routing-only concern |
| `inbound-message-service.ts` | mention + idempotency + server client | bridge | Low | unchanged boundary |

## Data Models
- `PersonalInboundMessageEvent.text` -> `string | null`.
- `ServerIngressResult` -> include `disposition` + `bindingResolved`.

## Error Handling And Edge Cases
- Non-text inbound: never dropped for observation; routing skipped.
- Group without mention: forwarding blocked by mention policy, still discoverable.
- Unbound ingress: non-error onboarding disposition.
- Real forwarding failures: error-level diagnostics.

## Performance / Security Considerations
- Observation is constant-time, no extra network calls.
- Signature behavior unchanged.

## Migration / Rollout
1. Server ships `202 + disposition` for unbound.
2. Gateway server client consumes disposition.
3. Adapter split/refactor without behavior changes for existing pass cases.
4. Add missing tests for non-text discovery + mention-blocked observation.

## Design Feedback Loop Notes (From Verification)

| Date | Trigger (File/Test/Blocker) | Design Smell | Design Update Applied | Status |
| --- | --- | --- | --- | --- |
| 2026-02-09 | `baileys-session-client.ts` dropped non-text | Observation lane tied to routing payload | Event model changed to optional text | In Progress |
| 2026-02-09 | `whatsapp-personal-adapter.ts` at 537 LOC with mixed concerns | Multi-concern file boundary | Split into runtime/observer/router/outbound helper modules | Planned |
| 2026-02-09 | Bridge cannot classify unbound | DTO too narrow | Disposition-aware server client contract | In Progress |
| 2026-02-09 | Mention-blocked path has no explicit bridge-level visibility | Expected fallback can appear as silent failure to operators | Add non-error mention-blocked diagnostic branch in bridge/reporter policy | Planned |

## Open Questions
- Add `UNBOUND` metric in this ticket or follow-up observability ticket?
