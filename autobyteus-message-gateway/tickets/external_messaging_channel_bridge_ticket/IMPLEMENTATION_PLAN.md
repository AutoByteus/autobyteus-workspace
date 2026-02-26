# Implementation Plan (Dual-Mode External Messaging Bridge)

## Scope Classification

- Classification: `Large`
- Reasoning:
  - Cross-project implementation (`autobyteus-ts`, `autobyteus-server-ts`, `autobyteus-message-gateway`)
  - New public contracts and parse behavior
  - New REST, GraphQL, persistence, and adapter layers
  - Multi-transport behavior (`BUSINESS_API`, `PERSONAL_SESSION`)
- Workflow Depth:
  - `Medium/Large` -> design doc -> runtime simulation -> implementation plan -> progress tracking

## Plan Version

- Current Version: `v1`
- Version Intent:
  - Final implementation plan created after design + simulation cleanup

## Use Case Simulation Gate (Required Before Implementation)

| Use Case | Simulation Location | Primary Path Covered | Fallback/Error Covered (If Relevant) | Gaps | Status |
| --- | --- | --- | --- | --- | --- |
| WhatsApp Business inbound -> agent -> callback | `MESSAGING_GATEWAY_RUNTIME_SIMULATION.md` Use Case 1 | Yes | Yes | None | Pass |
| Duplicate business inbound suppression | `MESSAGING_GATEWAY_RUNTIME_SIMULATION.md` Use Case 2 | Yes | Yes | None | Pass |
| Outbound retry/dead-letter | `MESSAGING_GATEWAY_RUNTIME_SIMULATION.md` Use Case 3 | Yes | Yes | None | Pass |
| WhatsApp personal session inbound -> agent -> callback | `MESSAGING_GATEWAY_RUNTIME_SIMULATION.md` Use Case 4 | Yes | Yes | None | Pass |
| Server ingress lazy-create + dispatch | `EXTERNAL_CHANNEL_INGRESS_RUNTIME_SIMULATION.md` Use Case 1 | Yes | Yes | None | Pass |
| Team dispatch serialization | `EXTERNAL_CHANNEL_INGRESS_RUNTIME_SIMULATION.md` Use Case 2 | Yes | Yes | None | Pass |
| Assistant completion callback publication | `EXTERNAL_CHANNEL_INGRESS_RUNTIME_SIMULATION.md` Use Case 3 | Yes | Yes | None | Pass |
| Transport-aware binding safety | `EXTERNAL_CHANNEL_INGRESS_RUNTIME_SIMULATION.md` Use Case 5 | Yes | Yes | None | Pass |
| Shared contract parse/build safety | `EXTERNAL_CHANNEL_TYPES_RUNTIME_SIMULATION.md` Use Cases 1-4 | Yes | Yes | None | Pass |
| Cross-project business/personal E2E | `CROSS_PROJECT_END_TO_END_RUNTIME_SIMULATION.md` Use Cases 1-3 | Yes | Yes | None | Pass |

## Simulation Cleanliness Checklist (Pre-Implementation Review)

| Check | Result | Notes |
| --- | --- | --- |
| Use case is fully achievable end-to-end | Pass | All documented use cases complete with fallbacks/errors |
| Separation of concerns is clean per file/module | Pass | Route/service/adapter/provider boundaries explicit |
| Boundaries and API ownership are clear | Pass | `autobyteus-ts` owns canonical contracts |
| Dependency flow is reasonable (no accidental cycle/leaky cross-reference) | Pass | Shared contracts -> server/gateway; no reverse dependency |
| No major structure/design smell in call stack | Pass | Runtime docs explicitly at no-blocking-smell state |

## Go / No-Go Decision

- Decision: `Go`
- Conditions:
  - Execute P0 scenarios from `PRE_IMPLEMENTATION_VALIDATION_GATE.md` as implementation acceptance gates.
  - If any P0 fails, pause coding on dependent files and update design/runtime docs first.

## Principles

- Bottom-up dependencies first.
- TDD execution order per file/module:
  1) create source skeleton (file + exported signatures/interfaces),
  2) author tests against the skeleton,
  3) implement behavior to green,
  4) refactor while keeping tests green.
- Memory-first guardrail:
  - Do not introduce new dependencies on `agent-conversation` persistence for external-channel source context.
  - Persist callback source context in dedicated external-channel receipt/context providers instead.
- One file at a time by default.
- If cross-reference is unavoidable, record it in progress tracker when implementation begins.
- Progress tracking document will be created at implementation kickoff (not in this step).

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `autobyteus-ts/src/external-channel/channel-transport.ts` | None | Core enum used by all layers |
| 2 | `autobyteus-ts/src/external-channel/external-message-envelope.ts` | provider/peer/transport parser | Inbound contract required by gateway+server |
| 3 | `autobyteus-ts/src/external-channel/external-outbound-envelope.ts` | transport parser, attachment parser | Callback contract + callback idempotency key enforcement |
| 4 | `autobyteus-ts/src/agent/message/external-source-metadata.ts` | routing key helper | Metadata bridge used by server runtime |
| 5 | `autobyteus-server-ts/prisma/schema.prisma` + migration | shared contract decisions | DB shape blocks server providers/services |
| 6 | `autobyteus-server-ts/src/external-channel/providers/*` | prisma models | Persistence abstractions required by services |
| 7 | `autobyteus-server-ts/src/external-channel/services/channel-binding-service.ts` | binding provider | Transport-aware routing foundation |
| 8 | `autobyteus-server-ts/src/external-channel/services/channel-idempotency-service.ts` | idempotency provider | Ingress duplicate suppression |
| 9 | `autobyteus-server-ts/src/external-channel/services/channel-thread-lock-service.ts` | none | Deterministic message ordering |
| 10 | `autobyteus-server-ts/src/external-channel/runtime/channel-runtime-facade.ts` | managers + metadata bridge | Isolated runtime dispatch boundary |
| 11 | `autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts` | steps 7-10 | Main ingress orchestration |
| 12 | `autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts` + subscriber | providers + callback idempotency | Outbound callback publication |
| 13 | `autobyteus-server-ts/src/api/rest/channel-ingress.ts` + signature middleware | ingress service | Exposed ingress APIs |
| 14 | `autobyteus-message-gateway/src/domain/models/*adapter*` | shared contracts | Adapter interfaces for both transports |
| 15 | `autobyteus-message-gateway/src/infrastructure/adapters/whatsapp-business/*` | adapter contract | Business flow implementation |
| 16 | `autobyteus-message-gateway/src/infrastructure/adapters/whatsapp-personal/*` | session adapter contract | Personal session flow implementation |
| 17 | `autobyteus-message-gateway/src/application/services/idempotency-service.ts` | idempotency store | Inbound dedupe |
| 18 | `autobyteus-message-gateway/src/application/services/callback-idempotency-service.ts` | idempotency store | Callback dedupe |
| 19 | `autobyteus-message-gateway/src/application/services/inbound-message-service.ts` | adapters + idempotency + mention policy + server client | Normalized inbound orchestration |
| 20 | `autobyteus-message-gateway/src/application/services/outbound-message-service.ts` | adapters + callback idempotency | Outbound delivery orchestration |
| 21 | `autobyteus-message-gateway/src/application/services/whatsapp-personal-session-service.ts` + `session-inbound-bridge-service.ts` | personal adapter + inbound service | Session lifecycle + convergence path |
| 22 | `autobyteus-message-gateway/src/http/routes/provider-webhook-route.ts` + callback/admin routes | services | External APIs |
| 23 | Cross-project integration tests + gate checks | all above | Final acceptance |

## Step-By-Step Plan

1. `autobyteus-ts`: create shared-contract source skeleton files first, then add unit tests for transport parsing, callback idempotency key parsing, and compatibility errors, then implement to green.
2. `autobyteus-server-ts`: create persistence model/provider skeletons and migration scaffolds first, then tests, then implement and verify uniqueness constraints for transport-aware binding and idempotency.
3. `autobyteus-server-ts`: create external-channel service skeletons (binding/idempotency/locks/runtime facade/ingress/reply callback/subscriber), then unit tests, then implement to green.
4. `autobyteus-server-ts`: create REST ingress and middleware skeletons, then integration tests for signature/duplicate/transport mismatch, then complete implementation.
5. `autobyteus-message-gateway`: create business adapter and orchestration skeletons, then integration tests, then implement inbound/outbound flow and callback idempotency behavior.
6. `autobyteus-message-gateway`: create personal-session stack skeletons (session client wrapper, credential store, session service, session event listener, session inbound bridge, admin routes), then tests, then implement.
7. Execute cross-project validation gate P0 scenarios; fix issues if any.
8. Execute P1 scenarios and finalize readiness for implementation continuation.

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/external-channel/channel-transport.ts` | enum + parser exported | valid/invalid transport parse tests pass | N/A | must include `BUSINESS_API`, `PERSONAL_SESSION` |
| `autobyteus-ts/src/external-channel/external-outbound-envelope.ts` | parser enforces required callback key | missing/invalid key tests pass | N/A | supports wire alias normalization as needed |
| `autobyteus-server-ts/src/external-channel/services/channel-binding-service.ts` | transport-aware lookup/upsert works | precedence + mismatch tests pass | ingress test uses both transports | no provider-only fallback by default |
| `autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts` | dedupe + bind + dispatch flow complete | duplicate/missing binding/mismatch tests pass | REST ingress scenario tests pass | emits deterministic error codes |
| `autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts` | callback publish with idempotency and delivery state | duplicate reservation test pass | callback post integration test pass | uses `callbackIdempotencyKey` |
| `autobyteus-message-gateway/src/application/services/callback-idempotency-service.ts` | dedupe API implemented | duplicate/non-duplicate tests pass | callback route duplicate integration passes | shared TTL config used |
| `autobyteus-message-gateway/src/application/services/inbound-message-service.ts` | webhook+session envelopes converge into one flow | dedupe/mention policy tests pass | webhook + session ingress integration passes | uses `handleNormalizedEnvelope` |
| `autobyteus-message-gateway/src/infrastructure/adapters/whatsapp-business/whatsapp-business-adapter.ts` | business parse/send/signature verify complete | parse + signature tests pass | webhook->forward integration passes | raw-body signature fidelity |
| `autobyteus-message-gateway/src/infrastructure/adapters/whatsapp-personal/whatsapp-personal-adapter.ts` | session start/stop/status/send complete | lifecycle/send tests pass | session event -> forward integration passes | credential store mocked in tests |
| `autobyteus-message-gateway/src/http/routes/channel-admin-route.ts` | session admin endpoints functional | handler validation tests pass | route integration incl. feature flag + QR expiry | internal operator guard required |

## Cross-Reference Exception Protocol

| File | Cross-Reference With | Why Unavoidable | Temporary Strategy | Unblock Condition | Design Follow-Up Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts` | `autobyteus-message-gateway` callback key handling | callback key contract must match both sides | implement against shared contract + fixed fixture | both sides pass P0-04/P0-06 | `Not Needed` | Server TS |
| `autobyteus-message-gateway/src/application/services/outbound-message-service.ts` | `autobyteus-ts` outbound parser | parser behavior defines acceptance boundary | add contract tests first in `autobyteus-ts` | shared tests green | `Not Needed` | Gateway |

## Design Feedback Loop

| Smell/Issue | Evidence (Files/Call Stack) | Design Section To Update | Action | Status |
| --- | --- | --- | --- | --- |
| None currently blocking | Runtime simulations + gate doc | N/A | Start implementation with gate monitoring | Pending |

## Test Strategy

- Unit tests:
  - contract parsers + error codes (`autobyteus-ts`)
  - server binding/idempotency/lock/callback policy services
  - gateway inbound/outbound/callback idempotency/session lifecycle services
- Integration tests:
  - gateway webhook route -> server ingress client
  - server ingress route -> runtime facade
  - server callback publish -> gateway callback route -> adapter send
  - personal session event listener -> normalized inbound pipeline
- Test data / fixtures:
  - business webhook fixtures
  - personal session event fixtures
  - mixed-transport binding fixtures
  - callback retry/duplicate fixtures

## Implementation Kickoff Note

- Progress tracking doc is intentionally deferred for now.
- Create and update progress doc in real time at the moment coding begins:
  - `/Users/normy/autobyteus_org/autobyteus-message-gateway/tickets/external_messaging_channel_bridge_ticket/IMPLEMENTATION_PROGRESS.md`
