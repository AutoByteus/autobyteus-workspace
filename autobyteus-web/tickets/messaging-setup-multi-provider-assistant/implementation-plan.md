# Implementation Plan

## Scope Classification

- Classification: `Medium`
- Reasoning:
  - Cross-cutting UI/store behavior changes across messaging setup journey.
  - Provider-scoped readiness correction impacts verification logic and binding state semantics.
  - Requires synchronized updates in components, stores, shared types, and targeted tests.
- Workflow Depth:
  - `Medium/Large` -> proposed design doc -> design-based runtime call stack -> runtime call stack review -> implementation plan -> progress tracking

## Plan Maturity

- Current Status: `Call-Stack-Review-Validated`
- Notes:
  - Design and runtime traces are complete and review-passed.
  - Ready to begin implementation in dependency order.

## Solution Sketch (Required For `Small`, Optional Otherwise)

- Use Cases In Scope:
  - Provider-scoped messaging progression for WhatsApp, WeChat, Discord.
  - Scoped binding readiness and live verification with remediation actions.
- Touched Files/Modules:
  - `components/settings/MessagingSetupManager.vue`
  - `components/settings/messaging/SetupChecklistCard.vue`
  - `components/settings/messaging/ChannelBindingSetupCard.vue`
  - `components/settings/messaging/SetupVerificationCard.vue`
  - `components/settings/messaging/PersonalSessionSetupCard.vue`
  - `components/settings/messaging/ScannableQrCodePanel.vue`
  - `stores/messagingSetupStore.ts`
  - `stores/messagingChannelBindingSetupStore.ts`
  - `composables/useMessagingChannelBindingSetupFlow.ts` (new)
  - `types/messaging.ts`
  - `pages/settings.vue`
  - targeted test files under `components/settings/**/__tests__`, `stores/__tests__`, `pages/__tests__/settings.spec.ts`
- API/Behavior Delta:
  - No backend contract changes; frontend behavior and state model only.
- Key Assumptions:
  - Existing GraphQL `externalChannelBindingTargetOptions` remains source of active runtime targets.
  - Current gateway endpoints already sufficient for verification refresh steps.
- Known Risks:
  - Over-coupling verification orchestration if setup store grows too broad.
  - UI complexity increase if step/journey derivation is distributed instead of centralized.

## Use-Case Cost/Time Baseline

| Use Case | Planned Change IDs | Estimated Effort (Engineer Days) | Estimated Elapsed Time | Delivery Order |
| --- | --- | --- | --- | --- |
| UC-1 Provider-scoped bootstrap + guided step focus | C-001, C-003 | 1.0 | 1-2 days | Phase 1 |
| UC-2 WhatsApp session + QR + verify alignment | C-006, C-008, C-009 | 1.5 | 2 days | Phase 2 |
| UC-3 WeChat parity on shared personal-session path | C-008, C-009, C-012 | 1.0 | 1-2 days | Phase 2 |
| UC-4 Discord flow correctness and scoped binding behavior | C-004, C-005, C-012 | 1.5 | 2 days | Phase 3 |
| UC-5 Live verification pipeline with blocker actions | C-004, C-006, C-007, C-010 | 2.0 | 2-3 days | Phase 3 |
| UC-6 Runtime remediation handoff actions | C-007, C-011, C-012 | 1.0 | 1-2 days | Phase 4 |
| SoC hardening for binding interaction flow | C-013 | 1.0 | 1-2 days | Phase 2 |

Total baseline:
- Effort: ~9.0 engineer-days
- Expected elapsed: ~8-12 working days (single engineer)

## Runtime Call Stack Review Gate (Required Before Implementation)

| Use Case | Call Stack Location | Review Location | Business Flow Completeness | Structure & SoC Check | Dependency Flow Smells | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Bootstrap and provider scope selection | `tickets/messaging-setup-multi-provider-assistant/design-based-runtime-call-stack.md` | `tickets/messaging-setup-multi-provider-assistant/runtime-call-stack-review.md` | Pass | Pass | Low | Pass |
| Personal-session lifecycle (WhatsApp/WeChat) | `tickets/messaging-setup-multi-provider-assistant/design-based-runtime-call-stack.md` | `tickets/messaging-setup-multi-provider-assistant/runtime-call-stack-review.md` | Pass | Pass | Low | Pass |
| Discord business flow and binding save | `tickets/messaging-setup-multi-provider-assistant/design-based-runtime-call-stack.md` | `tickets/messaging-setup-multi-provider-assistant/runtime-call-stack-review.md` | Pass | Pass | Low | Pass |
| Scoped readiness and live verification | `tickets/messaging-setup-multi-provider-assistant/design-based-runtime-call-stack.md` | `tickets/messaging-setup-multi-provider-assistant/runtime-call-stack-review.md` | Pass | Pass | Medium | Pass |

## Go / No-Go Decision

- Decision: `Go`
- If `No-Go`, required refinement target:
  - `Medium/Large`: refine proposed design document, then regenerate call stack and re-review.

## Principles

- Bottom-up: implement dependencies before dependents.
- Test-driven: write unit tests (and integration tests when needed) before or alongside implementation.
- Mandatory modernization rule: no backward-compatibility shims or legacy branches.
- One file at a time is the default: complete a file and its tests before moving on when dependency graph is clean.
- Exception rule for rare cross-referencing: allow temporary partial implementation only when necessary, and record the design smell and follow-up design change.
- Update progress after each meaningful status change (file state, test state, blocker state, or design follow-up state).

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `types/messaging.ts` | N/A | Establish contracts for verification/check/action models first. |
| 2 | `stores/messagingChannelBindingSetupStore.ts` | C-010 types | Add scoped readiness primitives used by setup/journey layers. |
| 3 | `stores/messagingSetupStore.ts` | C-004, C-010 | Implement live verification and scoped readiness aggregation. |
| 4 | `components/settings/messaging/SetupChecklistCard.vue` | C-003 | Stepper rendering depends on updated step state models. |
| 5 | `components/settings/MessagingSetupManager.vue` | C-003, C-006 | Orchestrate active-step-focused card visibility using updated stores. |
| 6 | `composables/useMessagingChannelBindingSetupFlow.ts` | C-004, C-010 | Extract and centralize binding interaction state machine before card rewrite. |
| 7 | `components/settings/messaging/ChannelBindingSetupCard.vue` | C-013 | Consume composable and remain presentational/orchestration-light. |
| 8 | `components/settings/messaging/SetupVerificationCard.vue` | C-006, C-010 | Render detailed check progress + blocker actions. |
| 9 | `components/settings/messaging/ScannableQrCodePanel.vue` | C-010 | Provider-aware QR copy for WhatsApp/WeChat. |
| 10 | `components/settings/messaging/PersonalSessionSetupCard.vue` | C-009 | Pass provider context and refined copy/CTA behavior. |
| 11 | `pages/settings.vue` | N/A | Final top-level copy alignment to Messaging terminology. |
| 12 | targeted tests | all above | Lock in behavior and prevent regressions. |

## Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from proposed design doc) | Change Type | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- | --- |
| C-001 | Modify | T-003 | No | manager component tests |
| C-002 | Add | T-001 | No | De-scoped in execution addendum |
| C-003 | Modify | T-004 | No | checklist component tests |
| C-004 | Modify | T-002 | No | binding store unit tests |
| C-005 | Modify | T-005 | No | binding card component tests |
| C-006 | Modify | T-006 | Yes | setup store unit tests |
| C-007 | Modify | T-007 | No | verification card component tests |
| C-008 | Modify | T-008 | No | personal-session card tests |
| C-009 | Modify | T-009 | Yes | QR panel tests |
| C-010 | Modify | T-010 | No | type-check + impacted tests |
| C-011 | Modify | T-011 | No | settings page tests |
| C-012 | Modify | T-012 | Yes | targeted pnpm test runs |
| C-013 | Add | T-013 | No | composable + component tests for extracted binding flow |

## Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| T-DEL-001 | Global binding readiness usage in verification | Remove | Delete non-scoped readiness usage and update tests accordingly. | Medium: can flip readiness behavior unexpectedly if tests are incomplete. |
| T-DEL-002 | Snapshot-only verification logic | Remove | Replace with live check pipeline and remove old assertions. | Medium: async timing in tests. |
| T-DEL-003 | WhatsApp-only shared QR text | Remove | Replace with provider-aware prop + copy assertions. | Low. |

## Step-By-Step Plan

1. Implement foundational contracts and scoped readiness primitives (C-010, C-004).
2. Implement verification orchestration changes (C-006), then stepper rendering/manager gating updates (C-003, C-001).
3. Extract binding interaction flow into a composable and migrate channel-binding card to use it (C-013, C-005).
4. Update session/verification cards to consume new scoped models (C-007, C-008, C-009).
5. Apply top-level copy alignment in settings navigation/title (C-011).
6. Add/update tests and run targeted suites (C-012).

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `stores/messagingSetupJourneyStore.ts` | De-scoped. | N/A | N/A | Removed from execution scope in post-execution addendum. |
| `stores/messagingChannelBindingSetupStore.ts` | Scoped readiness/binding helpers implemented and consumed. | Existing store tests expanded for provider-scoped readiness. | N/A | No CRUD contract changes. |
| `stores/messagingSetupStore.ts` | Live verification check pipeline + blocker action mapping works. | Tests cover ready, blocked, provider-skip, runtime-inactive scenarios. | N/A | Deterministic async behavior required. |
| `composables/useMessagingChannelBindingSetupFlow.ts` | Peer/target selection and discovery gating logic extracted from card; no behavior regression. | New composable tests cover provider switches, discovery gating, and stale-selection sync. | N/A | Keeps card lightweight and declarative. |
| `components/settings/MessagingSetupManager.vue` | Journey-driven visibility and bootstrap remain stable. | Existing manager tests updated for journey usage. | N/A | Maintain unmount sync-stop behavior. |
| `components/settings/messaging/SetupVerificationCard.vue` | Check-level states and action buttons render correctly. | Component tests verify running/blocked/ready transitions and actions. | N/A | |
| `components/settings/messaging/ChannelBindingSetupCard.vue` | Scoped list/readiness and success feedback are correct. | Component tests verify scoped rendering + Discord flow still valid. | N/A | |
| `components/settings/messaging/ScannableQrCodePanel.vue` | Provider-aware copy/alt text and QR rendering still stable. | QR panel tests include provider text variants. | N/A | |
| `components/settings/messaging/PersonalSessionSetupCard.vue` | Provider-aware copy/CTA and QR panel props are correct. | Existing tests expanded for WeChat copy and no-session providers. | N/A | |
| `pages/settings.vue` | Visible nav text updated to Messaging. | Settings page tests updated for label assertions. | N/A | |

## Cross-Reference Exception Protocol

| File | Cross-Reference With | Why Unavoidable | Temporary Strategy | Unblock Condition | Design Follow-Up Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | N/A | `Not Needed` | N/A |

## Design Feedback Loop

| Smell/Issue | Evidence (Files/Call Stack) | Design Section To Update | Action | Status |
| --- | --- | --- | --- | --- |
| Readiness false positives from global bindings | `stores/messagingSetupStore.ts` + call stack Use Case 4 | `Change Inventory` C-004/C-006 | Shift to provider-scoped readiness helpers and live checks. | Planned |
| Blocked verification lacks actionable recovery | `components/settings/messaging/SetupVerificationCard.vue` + Use Case 5 | `Change Inventory` C-007 | Add blocker action model + action buttons. | Planned |
| Channel binding card orchestration is too broad | `components/settings/messaging/ChannelBindingSetupCard.vue` | `Change Inventory` C-013 | Extract interaction flow state machine to composable boundary. | Planned |

## Test Strategy

- Unit tests:
  - `stores/__tests__/messagingChannelBindingSetupStore.spec.ts`
  - `stores/__tests__/messagingSetupStore.spec.ts`
  - `stores/__tests__/messagingProviderScopeStore.spec.ts` (regression checks)
  - `stores/__tests__/messagingChannelBindingOptionsStore.spec.ts`
  - `stores/__tests__/gatewaySessionSetupStore.spec.ts`
  - `stores/__tests__/gatewayCapabilityStore.spec.ts`
- Integration tests:
  - N/A for this web-only ticket; rely on existing server contracts.
- Component tests:
  - `components/settings/__tests__/MessagingSetupManager.spec.ts`
  - `components/settings/messaging/__tests__/ChannelBindingSetupCard.spec.ts`
  - `components/settings/messaging/__tests__/PersonalSessionSetupCard.spec.ts`
  - new/updated tests for `SetupVerificationCard.vue`, `SetupChecklistCard.vue`, `ScannableQrCodePanel.vue`
  - `pages/__tests__/settings.spec.ts`
- Test data / fixtures:
  - Multi-provider binding arrays with mixed provider/transport/account rows.
  - Verification states for running, blocked (inactive runtime), and ready flows.

## Post-Execution Addendum (2026-02-11)

- Executed additional clean-code rename pass after core UX/verification work:
  - `ExternalMessaging*` / `externalMessaging/*` -> `Messaging*` / `messaging/*`
  - `externalMessaging*.ts` and `externalChannelBinding*.ts` setup stores -> `messaging*.ts` equivalents
  - `types/externalMessaging.ts` -> `types/messaging.ts`
  - `services/externalMessagingGatewayClient.ts` -> `services/messagingGatewayClient.ts`
  - `composables/useChannelBindingSetupFlow.ts` -> `composables/useMessagingChannelBindingSetupFlow.ts`
  - settings section key `external-messaging` -> `messaging`
- Scope adjustment: planned `stores/messagingSetupJourneyStore.ts` (`C-002`) was removed from execution scope; active-step derivation remains in `components/settings/MessagingSetupManager.vue` to avoid unnecessary store indirection.
- This addendum resolves the naming/domain-alignment question and removes legacy naming from the active messaging setup stack without compatibility aliases.

## Design-First Addendum: Provider-Isolated Flow Refactor (2026-02-11)

Status:
- `Design Only` (no implementation in this addendum yet).
- This addendum supersedes prior assumptions of one shared provider flow component for the next iteration.

Planned Change Set:
- `C-024..C-033` from `proposed-design.md` (Provider-Isolated Flow Design Revision).

Execution Order (Planned):
1. Add provider flow contracts/types (`C-029`).
2. Add provider flow store (`C-028`) with `flowByProvider` and strict prerequisite gating.
3. Add provider flow components (`C-025..C-027`) and shell (`C-024`).
4. Migrate manager entrypoint (`C-031`) and integrate provider flow store.
5. Update stepper semantics (`C-030`) and messaging setup store boundary (`C-032`).
6. Add/adjust regression tests for provider-switch isolation (`C-033`).

Design Risks Called Out:
- Medium risk: step semantics migration (`READY` vs `NOT_REQUIRED`) may require broad test updates.
- Medium risk: deciding final responsibility split between `messagingSetupStore` and `messagingProviderFlowStore`.
- Low risk: component split itself (mostly structural).

Go/No-Go For Implementation:
- `Pending user approval of design addendum`.

## Execution Addendum (2026-02-11, Completed)

Implemented change set for provider-isolated flow refinement:

- Added:
  - `components/settings/messaging/flows/WhatsAppSetupFlow.vue`
  - `components/settings/messaging/flows/WeChatSetupFlow.vue`
  - `components/settings/messaging/flows/WeComSetupFlow.vue`
  - `components/settings/messaging/flows/DiscordSetupFlow.vue`
  - `composables/useMessagingProviderStepFlow.ts`
- Modified:
  - `components/settings/MessagingSetupManager.vue` (provider-flow shell mounting).
  - `stores/messagingSetupStore.ts` (provider-keyed verification state + provider-specific step derivation + prerequisite gating).
  - `stores/__tests__/messagingSetupStore.spec.ts`
  - `components/settings/__tests__/MessagingSetupManager.spec.ts`
  - `components/settings/messaging/__tests__/SetupVerificationCard.spec.ts`

Scope adjustments against V2 design addendum:
- `C-028` (`stores/messagingProviderFlowStore.ts`) was merged into `stores/messagingSetupStore.ts` to keep orchestration layers minimal.
- `C-029/C-030` `NOT_REQUIRED` status path was replaced by provider-specific step-order omission.
- `C-031` shell behavior was implemented in `components/settings/MessagingSetupManager.vue` (no additional shell file).

Verification:
- Targeted regression suite passed:
  - `pnpm test:nuxt components/settings/__tests__/MessagingSetupManager.spec.ts components/settings/messaging/__tests__/PersonalSessionSetupCard.spec.ts components/settings/messaging/__tests__/ChannelBindingSetupCard.spec.ts components/settings/messaging/__tests__/ScannableQrCodePanel.spec.ts components/settings/messaging/__tests__/SetupVerificationCard.spec.ts stores/__tests__/messagingProviderFlowStore.spec.ts stores/__tests__/messagingVerificationStore.spec.ts stores/__tests__/messagingChannelBindingSetupStore.spec.ts stores/__tests__/messagingProviderScopeStore.spec.ts stores/__tests__/messagingChannelBindingOptionsStore.spec.ts stores/__tests__/gatewaySessionSetupStore.spec.ts stores/__tests__/gatewayCapabilityStore.spec.ts services/__tests__/messagingGatewayClient.spec.ts pages/__tests__/settings.spec.ts --run`

## SoC Refinement Addendum (2026-02-11, Completed)

User-directed structural refinement applied after initial implementation pass:

- Added:
  - `stores/messagingProviderFlowStore.ts`
  - `stores/messagingVerificationStore.ts`
  - `utils/messagingSetupScope.ts`
- Removed:
  - `stores/messagingSetupStore.ts`
- Updated:
  - `components/settings/messaging/SetupVerificationCard.vue` -> consumes verification store directly.
  - `composables/useMessagingProviderStepFlow.ts` -> consumes provider flow store directly.
  - Provider/verification test split:
    - `stores/__tests__/messagingProviderFlowStore.spec.ts`
    - `stores/__tests__/messagingVerificationStore.spec.ts`

Boundary result:
- `messagingProviderFlowStore` owns provider step progression semantics.
- `messagingVerificationStore` owns verification execution and blocker/action mapping.
- Shared scope math is pure utility logic in `utils/messagingSetupScope.ts`.
