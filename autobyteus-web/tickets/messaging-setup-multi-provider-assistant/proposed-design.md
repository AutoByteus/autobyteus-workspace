# Proposed Design Document

## Summary
Improve the Settings messaging setup journey for `WHATSAPP`, `WECHAT`, and `DISCORD` by aligning runtime behavior with the approved `ui-prototypes/messaging-setup-assistant` interaction model: clear step progression, one dominant next action, provider-scoped readiness, and actionable verification blockers.

The current implementation already supports provider scope selection and core APIs, but readiness and verification are not provider-scoped enough, verification is snapshot-only, and some UX copy/controls remain WhatsApp-specific.

## Goals
- Make setup progression explicit and deterministic for WhatsApp, WeChat, and Discord.
- Enforce provider-scoped readiness (no cross-provider false positives).
- Add live verification checks with actionable blocker remediation.
- Keep one dominant next action per state to reduce setup friction.
- Preserve clean separation between UI components, orchestration stores, and API boundaries.

## Non-Goals
- No gateway/backend API contract changes in this ticket.
- No new external provider onboarding beyond WhatsApp/WeChat/Discord.
- No changes to external-channel dispatch semantics.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: identify and remove obsolete legacy paths/files included in this scope.

## Requirements And Use Cases
- Use Case 1: User opens Settings -> Messaging and selects provider scope.
- Use Case 2: WhatsApp setup progresses Gateway -> Session (QR lifecycle) -> Binding -> Verify.
- Use Case 3: WeChat setup uses same personal-session lifecycle with WeChat-specific copy.
- Use Case 4: Discord setup skips personal-session dependency and supports business peer discovery.
- Use Case 5: Binding readiness and verification are computed only for selected provider scope.
- Use Case 6: Verification blocked state provides explicit remediation action(s), including runtime launch navigation.

## Estimated Cost/Time By Use Case

Assumptions:
- 1 engineer, focused execution.
- Existing gateway/server contracts remain unchanged.
- Estimates include implementation + unit/component test updates in `autobyteus-web`.

| Use Case | Primary Changes | Estimated Effort (Engineer Days) | Estimated Elapsed Time | Confidence | Notes |
| --- | --- | --- | --- | --- | --- |
| Use Case 1: Messaging open + provider scope journey boot | `C-001`, `C-002`, `C-003` | 1.0 | 1-2 days | High | Mostly frontend orchestration and step UI behavior. |
| Use Case 2: WhatsApp session flow alignment | `C-006`, `C-008`, `C-009` | 1.5 | 2 days | Medium | Depends on verification/live-state UX wiring and QR state copy cleanup. |
| Use Case 3: WeChat parity with personal session flow | `C-008`, `C-009`, `C-012` | 1.0 | 1-2 days | Medium | Shared path with WhatsApp, but needs provider-specific assertions. |
| Use Case 4: Discord non-session flow + discovery/binding correctness | `C-004`, `C-005`, `C-012` | 1.5 | 2 days | Medium | Scoped binding readiness and discovery gating are main risk areas. |
| Use Case 5: Scoped readiness + live verification + remediation actions | `C-004`, `C-006`, `C-007`, `C-010` | 2.0 | 2-3 days | Medium | Most complex behavioral delta; requires robust test coverage. |
| Use Case 6: Verification blocked action routing and runtime handoff | `C-007`, `C-011`, `C-012` | 1.0 | 1-2 days | Medium | Final route targets still an open question in this ticket. |
| SoC hardening: binding-flow composable extraction | `C-013` | 1.0 | 1-2 days | High | Improves maintainability and testability; low product risk. |

Estimated total:
- Engineering effort: ~9.0 engineer-days
- Calendar elapsed: ~8-12 working days (single engineer)

## Current State (As-Is)
- `components/settings/MessagingSetupManager.vue` renders all setup cards at once and uses a checklist list, not step-focused progression.
- `stores/messagingSetupStore.ts` merges readiness from global snapshots; binding readiness is effectively global (`hasBindings`), not provider-scoped.
- `stores/messagingChannelBindingSetupStore.ts:getReadinessSnapshot()` has no provider filter.
- `components/settings/messaging/ScannableQrCodePanel.vue` copy and alt text are WhatsApp-specific even in WeChat flow.
- `components/settings/messaging/SetupVerificationCard.vue` shows final blocked list but does not model check-by-check in-progress states or remediation actions.
- `components/settings/messaging/ChannelBindingSetupCard.vue` mixes rendering with provider/session discovery rules, selection synchronization, and mutation orchestration in one large SFC.
- `ui-prototypes/messaging-setup-assistant` contains high-fidelity WhatsApp journey references that are style-accurate enough to guide implementation.

## Target State (To-Be)
- Messaging setup becomes provider-scoped and step-focused for WhatsApp/WeChat/Discord.
- Detailed setup cards are active-step focused: once a step is complete, its full form is hidden while the user advances to the next step.
- Readiness and verification run against selected provider scope and current live state (gateway/session/binding/target runtime).
- Verification includes check-level progress and action mapping for blockers.
- Session card and QR panel use provider-aware copy and accessibility labels.
- Binding list and readiness use provider/transport/account scope rather than global binding presence.

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Modify | `components/settings/MessagingSetupManager.vue` | `components/settings/MessagingSetupManager.vue` | Move from always-visible cards to active-step-focused journey orchestration. | Settings messaging UX | Keep existing bootstrap ordering; hide prior-step detail cards once completed. |
| C-002 | Add | N/A | `stores/messagingSetupJourneyStore.ts` | Centralize active step + dominant next action logic. | Journey state, component coordination | New store to avoid cross-component coupling. |
| C-003 | Modify | `components/settings/messaging/SetupChecklistCard.vue` | `components/settings/messaging/SetupChecklistCard.vue` | Replace passive status list with explicit progression stepper behavior. | Visual journey clarity | Keep data-driven input from setup store. |
| C-004 | Modify | `stores/messagingChannelBindingSetupStore.ts` | `stores/messagingChannelBindingSetupStore.ts` | Add provider-scoped readiness and provider-filtered binding view helpers. | Binding readiness correctness | Remove global binding readiness dependency from verification path. |
| C-005 | Modify | `components/settings/messaging/ChannelBindingSetupCard.vue` | `components/settings/messaging/ChannelBindingSetupCard.vue` | Show selected-provider scoped bindings + success feedback + scope-safe save/reload behavior. | Binding UX, multi-provider correctness | Keep GraphQL mutation contract unchanged. |
| C-006 | Modify | `stores/messagingSetupStore.ts` | `stores/messagingSetupStore.ts` | Run live verification pipeline with check progress and provider-specific blocker mapping. | Verification correctness | No fallback to legacy snapshot-only verification path. |
| C-007 | Modify | `components/settings/messaging/SetupVerificationCard.vue` | `components/settings/messaging/SetupVerificationCard.vue` | Render per-check running/completed/blocked states and remediation action buttons. | Verification UX | Includes re-run action and runtime navigation action hooks. |
| C-008 | Modify | `components/settings/messaging/PersonalSessionSetupCard.vue` | `components/settings/messaging/PersonalSessionSetupCard.vue` | Tighten provider-aware copy and control emphasis for WhatsApp vs WeChat vs Discord. | Session UX | Discord remains no-personal-session path. |
| C-009 | Modify | `components/settings/messaging/ScannableQrCodePanel.vue` | `components/settings/messaging/ScannableQrCodePanel.vue` | Remove WhatsApp-only copy/alt text; use provider-aware semantics. | Accessibility + correctness | Add provider prop from session card. |
| C-010 | Modify | `types/messaging.ts` | `types/messaging.ts` | Extend verification/check/action typing for richer UI states. | Type system, store/component contracts | Keep compatibility with existing setup step keys. |
| C-011 | Modify | `pages/settings.vue` | `pages/settings.vue` | Align visible nav wording to `Messaging` (prototype language). | Top-level settings UX copy | Route section key can remain internal. |
| C-012 | Modify | `components/settings/**/__tests__`, `stores/__tests__/*.spec.ts`, `pages/__tests__/settings.spec.ts` | same paths | Cover provider-scoped readiness, live verification flow, and provider-aware copy changes. | Regression safety | Remove obsolete assertions for legacy behavior. |
| C-013 | Add | N/A | `composables/useMessagingChannelBindingSetupFlow.ts` | Extract binding flow orchestration out of `ChannelBindingSetupCard.vue` to restore clean view-vs-flow separation. | Separation of concerns, maintainability | Card becomes presentational/orchestration-light and delegates interaction state machine. |

## Architecture Overview
- UI entrypoint (`MessagingSetupManager`) orchestrates bootstrap and computes active step from setup state.
- Gateway/session store remains transport/API boundary for health and personal-session lifecycle.
- Binding setup store owns CRUD + provider-scoped readiness helpers.
- Binding options store owns target/peer catalog freshness and stale-selection guards.
- Binding flow composable owns UI-facing interaction state machine for peer/target selection modes and provider-dependent discovery gating.
- Setup store owns live verification execution and blocker/action mapping.

## File And Module Breakdown

| File/Module | Change Type | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- |
| `components/settings/MessagingSetupManager.vue` | Modify | Compose messaging setup sections and drive active-step visibility. | `bootstrapSetupState()` | store snapshots -> rendered journey | capability, provider scope, setup stores |
| `components/settings/messaging/SetupChecklistCard.vue` | Modify | Render stepper/progress UI for messaging journey. | props-driven | setup steps -> stepper visuals | setup store types |
| `stores/messagingChannelBindingSetupStore.ts` | Modify | Provide scoped readiness and scoped binding list helpers. | `getReadinessSnapshotForScope(...)`, `bindingsForScope(...)` | bindings + provider scope -> scoped readiness | binding state, provider metadata |
| `components/settings/messaging/ChannelBindingSetupCard.vue` | Modify | Binding form + scoped listing + provider-specific guidance. | existing UI actions | user draft -> store mutations | binding setup/options/provider scope/gateway stores |
| `stores/messagingSetupStore.ts` | Modify | Execute live verification checks and blocker action mapping. | `runSetupVerification()`, `stepStates` | current runtime + API snapshots -> verification result | gateway store, binding store/options, provider scope |
| `composables/useMessagingChannelBindingSetupFlow.ts` | Add | Encapsulate binding-card interaction state machine and derived UI behavior. | `useMessagingChannelBindingSetupFlow()` | stores + provider scope + draft -> UI event handlers + computed states | binding setup/options/provider scope/gateway stores |
| `components/settings/messaging/SetupVerificationCard.vue` | Modify | Verification trigger + check progress + blocker actions rendering. | `onRunVerification()` | verification model -> UX state | setup store |
| `components/settings/messaging/PersonalSessionSetupCard.vue` | Modify | Provider-aware personal-session setup controls/copy. | existing UI actions | provider + session -> controls | gateway + provider scope stores |
| `components/settings/messaging/ScannableQrCodePanel.vue` | Modify | Provider-aware QR instructions and alt text. | `renderQrCode()` | qr payload + provider -> render state | qr service |
| `types/messaging.ts` | Modify | Shared model contracts for richer verification/check/action states. | type exports | typed contracts | setup components/stores/tests |
| `pages/settings.vue` | Modify | Settings navigation label alignment (`Messaging`). | section rendering | active section -> label/display | settings page UI |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `stores/messagingSetupStore.ts` | gateway/binding/options/provider stores | verification card + manager | Medium | Isolate verification pipeline in store actions; UI consumes typed result only. |
| `stores/messagingChannelBindingSetupStore.ts` | GraphQL + capability store | binding card + setup store | Medium | Add scoped helpers without moving CRUD concerns into components. |
| `composables/useMessagingChannelBindingSetupFlow.ts` | binding/options/provider/gateway stores | binding card | Medium | Consolidate branching/watcher-heavy UI orchestration behind composable boundary. |
| `components/settings/messaging/ChannelBindingSetupCard.vue` | composable + stores | none | Low | Keep component mostly presentational; invoke composable handlers only. |
| `components/settings/MessagingSetupManager.vue` | all setup stores | settings page | Low | Keep bootstrap + view composition; no API calls outside stores. |

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| Global binding readiness usage in verification | Remove code paths that treat any binding as ready for all providers. | No legacy fallback branch retained. | Unit tests for provider-scoped readiness + verification blockers. |
| Snapshot-only verification behavior | Replace with live check execution path. | No dual-mode verification retained. | Verification store tests for running->blocked/ready transitions. |
| WhatsApp-only QR copy in shared panel | Remove hardcoded text and replace with provider-aware text. | No hidden fallback to WhatsApp wording. | Component tests for WeChat/WhatsApp text variants. |
| Legacy top-level wording `External Messaging` in settings nav/title | Update visible copy to `Messaging`. | No mixed label variants retained. | Settings page/component snapshot and text assertions. |

## Data Models (If Needed)
- Extend setup verification model with check-level details:
  - `VerificationCheckKey` (`gateway`, `session`, `binding`, `target_runtime`)
  - `VerificationCheckState` (`PENDING`, `RUNNING`, `PASSED`, `FAILED`)
  - `VerificationBlockerAction` (`OPEN_AGENT_RUNTIME`, `OPEN_TEAM_RUNTIME`, `RERUN_VERIFICATION`, `REFRESH_TARGETS`)

## Error Handling And Edge Cases
- Gateway unreachable or unauthorized during live verification.
- Personal session conflict (`SESSION_ALREADY_RUNNING`) with missing `sessionId` detail.
- QR race states (`SESSION_QR_NOT_READY`, `SESSION_QR_EXPIRED`).
- Discord peer discovery available but gateway account mismatch.
- Binding exists but selected target runtime no longer active.
- Provider switched mid-verification (cancel current pass and reset verification state).

## Performance / Security Considerations
- Verification must avoid aggressive polling; reuse existing session status sync policy semantics where possible.
- No token value exposure in UI messages/logs.
- Keep verification calls bounded to required checks for selected provider only.

## Migration / Rollout (If Needed)
- Frontend-only migration with no schema changes.
- Rollout via normal web desktop release process.
- Gateway config storage key is renamed to `messaging_gateway_config_v1` as part of legacy naming cleanup.

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/Manual) | Status |
| --- | --- | --- | --- |
| C-001 | T-003 | `MessagingSetupManager` component tests | Planned |
| C-002 | T-001 | journey store unit tests | De-scoped |
| C-003 | T-004 | checklist component tests | Planned |
| C-004 | T-002 | binding setup store unit tests | Planned |
| C-005 | T-005 | binding card component tests | Planned |
| C-006 | T-006 | setup store unit tests | Planned |
| C-007 | T-007 | verification card component tests | Planned |
| C-008 | T-008 | personal-session card component tests | Planned |
| C-009 | T-009 | QR panel component tests | Planned |
| C-010 | T-010 | type compile + impacted unit tests | Planned |
| C-011 | T-011 | settings page tests | Planned |
| C-012 | T-012 | targeted test run | Planned |
| C-013 | T-013 | composable unit tests + channel binding card component tests | Planned |

## Design Feedback Loop Notes (From Review/Implementation)

| Date | Trigger (Review/File/Test/Blocker) | Design Smell | Design Update Applied | Status |
| --- | --- | --- | --- | --- |
| 2026-02-11 | Source review | Binding readiness was global across providers. | Added scoped readiness helper and verification requirement. | Applied |
| 2026-02-11 | Prototype alignment review | Verification lacked remediation actions. | Added blocker-action model and verification card action mapping. | Applied |
| 2026-02-11 | Core stack review | Channel binding card had excessive interaction orchestration in SFC. | Added composable extraction change (`C-013`) for flow boundary cleanup. | Applied |
| 2026-02-11 | Final-pass code-stack review | Implemented code still diverges from target design on scoped readiness + verification action UX + provider-aware QR copy. | Marked `C-004`, `C-006`, `C-007`, `C-009`, `C-013` as mandatory pre-merge execution set in review/progress artifacts. | Applied |
| 2026-02-11 | Implementation verification pass | Blocker set from final-pass review resolved in code and tests. | Runtime review gate updated to `Yes`; progress tracker updated to completed/in-progress statuses. | Applied |

## Open Questions
- Preferred runtime destination for remediation actions: `/agents` list, `/agents?view=team-list`, or `/workspace` running panel.

## Naming And SoC Cleanup Addendum (2026-02-11)

This pass applied the mandatory clean-cut policy to remove legacy `external*` naming in the messaging setup web stack so file/module names reflect the current business domain (`Messaging`).

### Addendum Change Inventory

| Change ID | Change Type | Current Path | Target Path | Rationale | Status |
| --- | --- | --- | --- | --- | --- |
| C-014 | Rename/Move | `components/settings/ExternalMessagingManager.vue` | `components/settings/MessagingSetupManager.vue` | Align section root component naming with current product language. | Completed |
| C-015 | Rename/Move | `components/settings/externalMessaging/*` | `components/settings/messaging/*` | Remove legacy folder naming and keep feature boundaries explicit. | Completed |
| C-016 | Rename/Move | `stores/externalMessagingSetupStore.ts` | `stores/messagingSetupStore.ts` | Keep setup orchestration store naming domain-aligned. | Completed |
| C-017 | Rename/Move | `stores/externalMessagingProviderScopeStore.ts` | `stores/messagingProviderScopeStore.ts` | Keep provider-scope state naming domain-aligned. | Completed |
| C-018 | Rename/Move | `stores/externalChannelBindingSetupStore.ts` | `stores/messagingChannelBindingSetupStore.ts` | Keep binding setup state colocated under messaging domain boundary. | Completed |
| C-019 | Rename/Move | `stores/externalChannelBindingOptionsStore.ts` | `stores/messagingChannelBindingOptionsStore.ts` | Keep target/peer option state naming aligned with messaging setup. | Completed |
| C-020 | Rename/Move | `types/externalMessaging.ts` | `types/messaging.ts` | Remove legacy type module naming and align imports across stores/services/components. | Completed |
| C-021 | Rename/Move | `services/externalMessagingGatewayClient.ts` | `services/messagingGatewayClient.ts` | Unify gateway client naming with messaging domain. | Completed |
| C-022 | Rename/Move | `composables/useChannelBindingSetupFlow.ts` | `composables/useMessagingChannelBindingSetupFlow.ts` | Make composable ownership explicit to messaging setup concern. | Completed |
| C-023 | Modify | `pages/settings.vue` (`external-messaging` section key) | `pages/settings.vue` (`messaging` section key) | Remove legacy section key and align route state with visible label. | Completed |

Scope adjustment:
- `C-002` (`stores/messagingSetupJourneyStore.ts`) is de-scoped and not retained; active-step derivation is implemented directly in `components/settings/MessagingSetupManager.vue` from `setupStore.stepStates`.

### Addendum Cost/Time

- Incremental effort for C-014..C-023: ~1.5 engineer-days.
- Incremental elapsed time: 1-2 working days.
- Confidence: High (rename/move + import rewrite + targeted regressions).

### Open Question Resolution

- Section key rename question is resolved: internal key is now `messaging` in page state/query handling.

## Provider-Isolated Flow Design Revision (Design-First, 2026-02-11)

### Trigger
- User-observed behavior shows cross-provider step semantics appearing inconsistent:
  - Switching provider can show later steps as green based on "not required" semantics.
  - Discord can appear to jump ahead in progression after unrelated provider actions.

### Root-Cause Summary
- Current step model is shared and normalized across all providers, while providers have different setup semantics.
- "Not required" is currently represented too close to "completed" in the shared stepper contract.
- Provider switching relies on shared derived state, which is correct for data reuse but weak for UX isolation.

### Design Decision
- Keep shared infrastructure stores for gateway/binding/options APIs.
- Introduce provider-isolated setup flow components and provider-scoped flow state.
- Represent per-provider step definitions explicitly so WhatsApp/WeCom/Discord can diverge cleanly.

### Target Component Architecture

`components/settings/messaging/`
- `MessagingSetupShell.vue` (provider selector + flow host only)
- `flows/WhatsAppSetupFlow.vue`
- `flows/WeComSetupFlow.vue`
- `flows/DiscordSetupFlow.vue`
- `steps/shared/GatewayStepCard.vue` (optional shared card)
- `steps/shared/VerificationStepCard.vue` (optional shared card)
- Provider-specific step cards where behavior diverges (`DiscordBindingStepCard.vue`, etc.)

Rules:
- Shell selects provider and mounts only that provider flow component.
- Each provider flow owns its step order and visible cards.
- Stepper renders provider-specific step definitions, not a universal fixed sequence.

### Target State Architecture

New store:
- `stores/messagingProviderFlowStore.ts`

State shape:
- `flowByProvider[provider] = {`
- `  stepStates,`
- `  activeStep,`
- `  verificationResult,`
- `  uiState,`
- `  lastUpdatedAt`
- `}`

Important modeling rules:
- Add explicit step status `NOT_REQUIRED` (not rendered as green completed).
- Enforce prerequisite gating in the flow store:
  - Step N cannot become `READY/DONE` if required predecessors are not `READY/DONE`.
- Provider switch reads/writes only that provider's flow slice.

Shared store boundaries (kept):
- `gatewaySessionSetupStore`: gateway and personal-session transport primitives.
- `messagingChannelBindingSetupStore`: binding CRUD and scoped queries.
- `messagingChannelBindingOptionsStore`: targets/peer candidates.

Provider flow store responsibilities:
- Convert shared store snapshots into provider-specific step states.
- Keep progression semantics isolated per provider.
- Expose normalized UI contract to each provider flow component.

### Separation-Of-Concern Boundary

- Shell: provider routing + mount orchestration only.
- Provider flow component: provider-specific UX and step composition only.
- Provider flow store: provider-specific progression semantics only.
- Shared infra stores: API and reusable domain operations only.

### Change Inventory Addendum (V2)

| Change ID | Change Type | Current Path | Target Path | Rationale |
| --- | --- | --- | --- | --- |
| C-024 | Add | N/A | `components/settings/messaging/MessagingSetupShell.vue` | Isolate provider switch host from provider-specific flow rendering. |
| C-025 | Add | N/A | `components/settings/messaging/flows/WhatsAppSetupFlow.vue` | Isolate WhatsApp step composition and UX. |
| C-026 | Add | N/A | `components/settings/messaging/flows/WeComSetupFlow.vue` | Isolate WeCom step composition and UX. |
| C-027 | Add | N/A | `components/settings/messaging/flows/DiscordSetupFlow.vue` | Isolate Discord step composition and UX. |
| C-028 | Add | N/A | `stores/messagingProviderFlowStore.ts` | Provider-scoped progression state and gating rules. |
| C-029 | Modify | `types/messaging.ts` | `types/messaging.ts` | Add `NOT_REQUIRED` status and provider-specific step-definition contracts. |
| C-030 | Modify | `components/settings/messaging/SetupChecklistCard.vue` | `components/settings/messaging/SetupChecklistCard.vue` | Render provider-specific step definitions and status semantics (`NOT_REQUIRED`). |
| C-031 | Modify | `components/settings/MessagingSetupManager.vue` | `components/settings/messaging/MessagingSetupShell.vue` | Replace shared monolith with shell + provider flow mount strategy. |
| C-032 | Modify | `stores/messagingSetupStore.ts` | `stores/messagingSetupStore.ts` | Narrow to shared verification primitives or move provider-facing progression to `messagingProviderFlowStore`. |
| C-033 | Modify | `components/settings/**/__tests__`, `stores/__tests__/**` | same paths | Add provider-switch isolation tests and step-semantic tests. |

### Cost/Time Addendum (V2)

| Use Case | Estimated Effort (Engineer Days) | Estimated Elapsed Time | Notes |
| --- | --- | --- | --- |
| Provider-flow component split (`C-024..C-027`) | 2.0 | 2-3 days | Mostly UI composition + wiring. |
| Provider flow store + step semantics (`C-028..C-030`) | 2.5 | 3-4 days | Core behavior change; highest risk/highest value. |
| Manager migration + test migration (`C-031..C-033`) | 1.5 | 2 days | Integration and regression stabilization. |

Incremental V2 total:
- ~6.0 engineer-days
- ~7-9 working days (single engineer)

### Acceptance Criteria (Design Gate)

- Switching provider must not mark steps complete unless that provider's prerequisites are satisfied.
- Discord and WeCom can skip session without showing false "completed" semantics.
- Provider flow components can diverge in step count/order without branching inside one monolithic component.
- Regression tests include provider-switch sequences reproducing the reported issue and passing after refactor.

### Implementation Decision (2026-02-11)

Final implementation now follows full provider/store separation:

- Implemented:
  - Provider flow components:
    - `components/settings/messaging/flows/WhatsAppSetupFlow.vue`
    - `components/settings/messaging/flows/WeChatSetupFlow.vue`
    - `components/settings/messaging/flows/WeComSetupFlow.vue`
    - `components/settings/messaging/flows/DiscordSetupFlow.vue`
  - Provider flow host behavior in `components/settings/MessagingSetupManager.vue` (manager as shell boundary).
  - Provider progression store:
    - `stores/messagingProviderFlowStore.ts`
  - Verification orchestration store:
    - `stores/messagingVerificationStore.ts`
  - Shared scope utility:
    - `utils/messagingSetupScope.ts`
  - Provider-step derivation composable:
    - `composables/useMessagingProviderStepFlow.ts`
  - Old combined store removed:
    - `stores/messagingSetupStore.ts`
  - Regression tests for provider-scoped progression and verification isolation updated and passing.

Design outcome:
- Component concern, flow concern, and verification concern are now isolated in separate modules.
- Provider switching no longer leaks step/verification state.
- Step-order omission continues to avoid false-green “not required” progression semantics.
