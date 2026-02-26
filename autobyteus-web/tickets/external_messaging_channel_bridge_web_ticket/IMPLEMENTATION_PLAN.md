# Implementation Plan

## Scope Classification

- Classification: `Medium`
- Reasoning:
  - Adds a new setup surface in settings with new store/service/types/graphql boundaries.
  - Crosses UI composition, Pinia state, runtime config, GraphQL, and REST integration.
- Workflow Depth:
  - `Medium/Large` -> design doc -> runtime simulation -> implementation plan -> progress tracking

## Plan Maturity

- Current Status: `Ready For Implementation`
- Notes:
  - Design and runtime simulation were iterated to remove coupling smells and lock phase-1 decisions.

## Solution Sketch (Required For `Small`, Optional Otherwise)

- Use Cases In Scope:
  - Open external messaging setup section.
  - Validate gateway connection.
  - Start WhatsApp personal session and fetch QR.
  - Create/update/delete channel binding.
  - Run setup verification.
- Touched Files/Modules:
  - Settings page navigation/content wiring.
  - New setup manager/cards.
  - New setup stores.
  - New gateway REST client.
  - New GraphQL setup operation docs.
  - New external messaging domain types.
  - Runtime config and env example updates.
- API/Behavior Delta:
  - New settings section: `external-messaging`.
  - New runtime public config: `messageGatewayBaseUrl`, `messageGatewayAdminToken`.
  - New client-side setup flows; no runtime conversation send-path changes.
- Key Assumptions:
  - Gateway endpoints follow the phase-1 contract from design.
  - Server GraphQL includes capability query and binding CRUD APIs (or safely degrades via capability gating).
- Known Risks:
  - Capability query and mutation schema drift.
  - UI-state drift if setup stores cross-call each other imperatively.

## Use Case Simulation Gate (Required Before Implementation)

| Use Case | Simulation Location | Primary Path Covered | Fallback/Error Covered (If Relevant) | Gaps | Status |
| --- | --- | --- | --- | --- | --- |
| Open External Messaging Setup Section | `/Users/normy/autobyteus_org/autobyteus-web/tickets/external_messaging_channel_bridge_web_ticket/EXTERNAL_MESSAGING_WEB_RUNTIME_SIMULATION.md` | Yes | Yes | None | Completed |
| Validate Gateway Connection | `/Users/normy/autobyteus_org/autobyteus-web/tickets/external_messaging_channel_bridge_web_ticket/EXTERNAL_MESSAGING_WEB_RUNTIME_SIMULATION.md` | Yes | Yes | None | Completed |
| Start WhatsApp Personal Session + QR | `/Users/normy/autobyteus_org/autobyteus-web/tickets/external_messaging_channel_bridge_web_ticket/EXTERNAL_MESSAGING_WEB_RUNTIME_SIMULATION.md` | Yes | Yes | None | Completed |
| Create/Update Channel Binding | `/Users/normy/autobyteus_org/autobyteus-web/tickets/external_messaging_channel_bridge_web_ticket/EXTERNAL_MESSAGING_WEB_RUNTIME_SIMULATION.md` | Yes | Yes | None | Completed |
| Run Setup Verification | `/Users/normy/autobyteus_org/autobyteus-web/tickets/external_messaging_channel_bridge_web_ticket/EXTERNAL_MESSAGING_WEB_RUNTIME_SIMULATION.md` | Yes | Yes | None | Completed |

## Simulation Cleanliness Checklist (Pre-Implementation Review)

| Check | Result | Notes |
| --- | --- | --- |
| Use case is fully achievable end-to-end | Pass | All 5 use cases have explicit primary + fallback/error traces. |
| Separation of concerns is clean per file/module | Pass | One-way dependency policy enforced (`externalMessagingSetupStore` as read orchestrator). |
| Boundaries and API ownership are clear | Pass | REST boundary in gateway client, GraphQL boundary in setup docs, state in stores. |
| Dependency flow is reasonable (no accidental cycle/leaky cross-reference) | Pass | Child stores do not import parent orchestrator store. |
| No major structure/design smell in call stack | Pass | Final inspection round found no blocking smell. |

## Go / No-Go Decision

- Decision: `Go`
- If `No-Go`, required refinement target:
  - `Medium/Large`: refine design document, then re-simulate.

## Principles

- Bottom-up: implement dependencies before dependents.
- Test-driven: add focused unit tests and integration tests where cross-boundary behavior matters.
- One file at a time is the default: complete file + tests, then move to next dependency.
- Exception rule for rare cross-referencing: record in progress doc if any emerges.
- Update progress after each meaningful status change.

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `/Users/normy/autobyteus_org/autobyteus-web/types/externalMessaging.ts` | N/A | Domain contracts unblock service/stores/components/tests. |
| 2 | `/Users/normy/autobyteus_org/autobyteus-web/graphql/queries/external_channel_setup_queries.ts` | N/A | GraphQL operation constants for binding store. |
| 3 | `/Users/normy/autobyteus_org/autobyteus-web/graphql/mutations/external_channel_setup_mutations.ts` | N/A | GraphQL mutation constants for binding store. |
| 4 | `/Users/normy/autobyteus_org/autobyteus-web/services/externalMessagingGatewayClient.ts` | types + runtime config | REST boundary for gateway setup actions. |
| 5 | `/Users/normy/autobyteus_org/autobyteus-web/stores/gatewaySessionSetupStore.ts` | gateway client + types | Session/health setup state. |
| 6 | `/Users/normy/autobyteus_org/autobyteus-web/stores/externalChannelBindingSetupStore.ts` | gql docs + apollo + types | Capability + binding setup state. |
| 7 | `/Users/normy/autobyteus_org/autobyteus-web/stores/externalMessagingSetupStore.ts` | gateway/binding stores + types | Orchestration and verification (read-only aggregation). |
| 8 | `/Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/SetupChecklistCard.vue` | setup store + types | Foundational display card. |
| 9 | `/Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/GatewayConnectionCard.vue` | gateway store | Gateway setup UI. |
| 10 | `/Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/PersonalSessionSetupCard.vue` | gateway store | Personal session setup UI. |
| 11 | `/Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/ChannelBindingSetupCard.vue` | binding store | Binding CRUD setup UI. |
| 12 | `/Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/SetupVerificationCard.vue` | setup store | Final setup verification UI. |
| 13 | `/Users/normy/autobyteus_org/autobyteus-web/components/settings/ExternalMessagingManager.vue` | cards + stores | Composition root for setup section. |
| 14 | `/Users/normy/autobyteus_org/autobyteus-web/pages/settings.vue` | manager | Integrate new settings section. |
| 15 | `/Users/normy/autobyteus_org/autobyteus-web/nuxt.config.ts` | N/A | Expose runtime config entries for gateway setup. |
| 16 | `/Users/normy/autobyteus_org/autobyteus-web/.env.local.example` | runtime config keys | Local setup docs for operators/devs. |

## Step-By-Step Plan

1. Implement core external messaging types and GraphQL setup operation docs.
2. Implement gateway REST client with robust response/error normalization.
3. Implement gateway session setup store; add unit tests.
4. Implement binding setup store with capability gate + CRUD; add unit tests.
5. Implement setup orchestration store (`stepStates` getter + `runSetupVerification`); add unit tests.
6. Implement setup UI cards and manager composition component.
7. Wire settings page section and runtime config/env docs.
8. Add/adjust component-level tests for critical card interactions.
9. Run targeted test suites, then broader Nuxt test run for regression.
10. Update progress doc to completion state and record any design feedback-loop changes.

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web/types/externalMessaging.ts` | Type contracts compile and reflect design models | Type-level checks via consuming store tests | N/A | Keep plain type-only module. |
| `/Users/normy/autobyteus_org/autobyteus-web/services/externalMessagingGatewayClient.ts` | REST methods implemented for health/session lifecycle | Service tests cover headers, URL assembly, error mapping | N/A | No store imports allowed. |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/gatewaySessionSetupStore.ts` | Health/session actions and readiness snapshot implemented | Store tests cover success + 401/403/404/410 + timeout flows | Optional integration via manager tests | Keep independent from setup orchestrator imports. |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/externalChannelBindingSetupStore.ts` | Capability gating + binding CRUD + snapshots implemented | Store tests cover capability disabled, stale schema, CRUD paths | Optional integration via manager tests | Use GraphQL docs only via Apollo client. |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/externalMessagingSetupStore.ts` | `stepStates` getter and verification aggregation implemented | Store tests cover all blocker combinations | Optional integration via manager tests | Must remain read-orchestrator. |
| `/Users/normy/autobyteus_org/autobyteus-web/components/settings/ExternalMessagingManager.vue` | Renders all setup cards and triggers initial setup load | Component test covers section bootstrap and card visibility | N/A | Setup-only; no monitoring views. |
| `/Users/normy/autobyteus_org/autobyteus-web/pages/settings.vue` | Sidebar section + content routing for external messaging | Existing settings tests updated or new focused page test | N/A | Preserve embedded-window rules for server sections. |
| `/Users/normy/autobyteus_org/autobyteus-web/nuxt.config.ts` | Runtime config keys added and usable at runtime | Covered by service/store tests using mocked runtime config | N/A | No env secrets persisted in local storage. |

## Cross-Reference Exception Protocol

| File | Cross-Reference With | Why Unavoidable | Temporary Strategy | Unblock Condition | Design Follow-Up Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| None expected | N/A | N/A | N/A | N/A | `Not Needed` | N/A |

## Design Feedback Loop

| Smell/Issue | Evidence (Files/Call Stack) | Design Section To Update | Action | Status |
| --- | --- | --- | --- | --- |
| None at kickoff | Final runtime verification pass | N/A | Start implementation | Pending |

## Test Strategy

- Unit tests:
  - `services/__tests__/externalMessagingGatewayClient.spec.ts`
  - `stores/__tests__/gatewaySessionSetupStore.spec.ts`
  - `stores/__tests__/externalChannelBindingSetupStore.spec.ts`
  - `stores/__tests__/externalMessagingSetupStore.spec.ts`
- Integration tests:
  - `components/settings/__tests__/ExternalMessagingManager.spec.ts` (card composition + bootstrap behavior)
- Test data / fixtures:
  - Mocked gateway REST responses and GraphQL query/mutation payloads.
