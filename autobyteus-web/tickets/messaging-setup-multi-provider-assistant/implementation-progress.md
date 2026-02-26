# Implementation Progress

This document tracks implementation and test progress at file level, including dependency blockers.

## When To Use This Document

- Created at implementation kickoff after required pre-implementation artifacts are ready:
  - proposed design doc
  - design-based runtime call stack
  - runtime call stack review
  - implementation plan

## Legend

- File Status: `Pending`, `In Progress`, `Blocked`, `Completed`, `N/A`
- Unit/Integration Test Status: `Not Started`, `In Progress`, `Passed`, `Failed`, `Blocked`, `N/A`
- Design Follow-Up: `Not Needed`, `Needed`, `In Progress`, `Updated`

## Progress Log

- 2026-02-11: Implementation kickoff baseline created from approved design/call-stack/plan artifacts.
- 2026-02-11: Second-pass review completed; per-use-case cost/time baseline added to design and implementation plan.
- 2026-02-11: Final-pass code-stack review found unresolved blockers in scoped readiness, verification action UX, and binding-card SoC boundary; gate set to `No`.
- 2026-02-11: Implemented blocker set (`C-004`, `C-006`, `C-007`, `C-009`, `C-011`, `C-013`) and reran targeted messaging suite (`9 files / 46 tests passed`).
- 2026-02-11: Completed naming/legacy cleanup pass (`C-014..C-023`) to remove `external*` naming from messaging setup module paths, store APIs, and settings section key; reran targeted regression suite (`13 files / 89 tests passed`).
- 2026-02-11: Refined step-focused UX: hide Gateway detail card after Step 1 is complete so Session step remains focused; added manager regression test for this behavior.
- 2026-02-11: Post-refinement targeted regression suite rerun is green (`13 files / 90 tests passed`).
- 2026-02-11: Implemented provider-isolated flow split and provider-keyed setup state (`flows/*`, `useMessagingProviderStepFlow`, `messagingSetupStore` refactor); regression suite rerun is green (`13 files / 91 tests passed`).
- 2026-02-11: Applied second SoC refinement: split provider progression and verification concerns into dedicated stores (`messagingProviderFlowStore`, `messagingVerificationStore`), extracted shared scope utility, and removed combined `messagingSetupStore`; regression suite rerun is green (`14 files / 91 tests passed`).

## Use-Case Effort Baseline

| Use Case | Estimated Effort (Engineer Days) | Estimated Elapsed Time | Status |
| --- | --- | --- | --- |
| UC-1 Provider-scoped bootstrap + journey | 1.0 | 1-2 days | In Progress |
| UC-2 WhatsApp session + QR + verify alignment | 1.5 | 2 days | Completed |
| UC-3 WeChat parity on personal-session path | 1.0 | 1-2 days | Completed |
| UC-4 Discord flow correctness + scoped bindings | 1.5 | 2 days | Completed |
| UC-5 Live verification with blocker actions | 2.0 | 2-3 days | Completed |
| UC-6 Runtime remediation handoff actions | 1.0 | 1-2 days | Completed |
| SoC hardening (`C-013`) | 1.0 | 1-2 days | Completed |

## Scope Change Log

| Date | Previous Scope | New Scope | Trigger | Required Action |
| --- | --- | --- | --- | --- |
| 2026-02-11 | Medium | Medium | Initial planning complete; no expansion required. | Continue with planned dependency order. |

## Completion Gate

- Mark `File Status = Completed` only when implementation is done and required tests are in a passing state (`Passed`) or explicitly `N/A`.
- For `Remove` refactor tasks, verify obsolete references and dead branches are removed.

## File-Level Progress Table

| Change ID | Change Type | File | Depends On | File Status | Unit Test File | Unit Test Status | Integration Test File | Integration Test Status | Cross-Reference Smell | Design Follow-Up | Last Verified | Verification Command | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-010 | Modify | `types/messaging.ts` | N/A | Completed | N/A | N/A | N/A | N/A | None | Not Needed | 2026-02-11 | N/A | Verification/check/action contracts + scoped binding types added. |
| C-004 | Modify | `stores/messagingChannelBindingSetupStore.ts` | C-010 | Completed | `stores/__tests__/messagingChannelBindingSetupStore.spec.ts` | Passed | N/A | N/A | None | Not Needed | 2026-02-11 | `pnpm test:nuxt stores/__tests__/messagingChannelBindingSetupStore.spec.ts --run` | Added `bindingsForScope(...)` and `getReadinessSnapshotForScope(...)`; removed transport fallback branch. |
| C-002 | Add | `stores/messagingSetupJourneyStore.ts` | C-010 | N/A | N/A | N/A | N/A | N/A | None | Updated | 2026-02-11 | N/A | De-scoped: active step derivation is implemented in provider flow components via `useMessagingProviderStepFlow`; no extra journey store retained. |
| C-006 | Modify | `stores/messagingVerificationStore.ts` | C-004, C-010 | Completed | `stores/__tests__/messagingVerificationStore.spec.ts` | Passed | N/A | N/A | None | Not Needed | 2026-02-11 | `pnpm test:nuxt stores/__tests__/messagingVerificationStore.spec.ts --run` | Live check pipeline + scoped readiness + runtime blocker mapping implemented in dedicated verification store. |
| C-003 | Modify | `components/settings/messaging/SetupChecklistCard.vue` | C-006 | Completed | N/A | N/A | N/A | N/A | None | Not Needed | 2026-02-11 | covered in manager/feature regression suite | Guided stepper behavior implemented and validated via manager + messaging flow tests. |
| C-001 | Modify | `components/settings/MessagingSetupManager.vue` | C-003, C-006 | Completed | `components/settings/__tests__/MessagingSetupManager.spec.ts` | Passed | N/A | N/A | None | Not Needed | 2026-02-11 | `pnpm test:nuxt components/settings/__tests__/MessagingSetupManager.spec.ts --run` | Guided step visibility + bootstrap/unmount lifecycle verified. |
| C-013 | Add | `composables/useMessagingChannelBindingSetupFlow.ts` | C-004, C-010 | Completed | `components/settings/messaging/__tests__/ChannelBindingSetupCard.spec.ts` | Passed | N/A | N/A | None | Not Needed | 2026-02-11 | `pnpm test:nuxt components/settings/messaging/__tests__/ChannelBindingSetupCard.spec.ts --run` | Extracted binding interaction state machine into composable boundary. |
| C-005 | Modify | `components/settings/messaging/ChannelBindingSetupCard.vue` | C-013 | Completed | `components/settings/messaging/__tests__/ChannelBindingSetupCard.spec.ts` | Passed | N/A | N/A | None | Not Needed | 2026-02-11 | `pnpm test:nuxt components/settings/messaging/__tests__/ChannelBindingSetupCard.spec.ts --run` | Card now consumes composable and renders provider-scoped binding list. |
| C-007 | Modify | `components/settings/messaging/SetupVerificationCard.vue` | C-006, C-010 | Completed | `components/settings/messaging/__tests__/SetupVerificationCard.spec.ts` | Passed | N/A | N/A | None | Not Needed | 2026-02-11 | `pnpm test:nuxt components/settings/messaging/__tests__/SetupVerificationCard.spec.ts --run` | Check-level UI + blocker action buttons wired. |
| C-009 | Modify | `components/settings/messaging/ScannableQrCodePanel.vue` | C-010 | Completed | `components/settings/messaging/__tests__/ScannableQrCodePanel.spec.ts` | Passed | N/A | N/A | None | Not Needed | 2026-02-11 | `pnpm test:nuxt components/settings/messaging/__tests__/ScannableQrCodePanel.spec.ts --run` | Provider-aware instruction and alt text implemented. |
| C-008 | Modify | `components/settings/messaging/PersonalSessionSetupCard.vue` | C-009 | Completed | `components/settings/messaging/__tests__/PersonalSessionSetupCard.spec.ts` | Passed | N/A | N/A | None | Not Needed | 2026-02-11 | `pnpm test:nuxt components/settings/messaging/__tests__/PersonalSessionSetupCard.spec.ts --run` | Passes provider context into shared QR panel. |
| C-011 | Modify | `pages/settings.vue` | N/A | Completed | `pages/__tests__/settings.spec.ts` | Passed | N/A | N/A | None | Not Needed | 2026-02-11 | `pnpm test:nuxt pages/__tests__/settings.spec.ts --run` | Sidebar label aligned to `Messaging`. |
| C-012 | Modify | `components/settings/**/__tests__`, `stores/__tests__`, `pages/__tests__/settings.spec.ts` | all above | Completed | multiple | Passed | N/A | N/A | None | Not Needed | 2026-02-11 | `pnpm test:nuxt components/settings/__tests__/MessagingSetupManager.spec.ts components/settings/messaging/__tests__/PersonalSessionSetupCard.spec.ts components/settings/messaging/__tests__/ChannelBindingSetupCard.spec.ts components/settings/messaging/__tests__/ScannableQrCodePanel.spec.ts components/settings/messaging/__tests__/SetupVerificationCard.spec.ts stores/__tests__/messagingProviderFlowStore.spec.ts stores/__tests__/messagingVerificationStore.spec.ts stores/__tests__/messagingChannelBindingSetupStore.spec.ts stores/__tests__/messagingProviderScopeStore.spec.ts stores/__tests__/messagingChannelBindingOptionsStore.spec.ts stores/__tests__/gatewaySessionSetupStore.spec.ts stores/__tests__/gatewayCapabilityStore.spec.ts services/__tests__/messagingGatewayClient.spec.ts pages/__tests__/settings.spec.ts --run` | Targeted regression suite green after SoC refinement (14 files, 91 tests). |

## Provider-Isolated Flow Addendum Progress (C-024..C-033)

| Change ID | File(s) | File Status | Test Status | Last Verified | Notes |
| --- | --- | --- | --- | --- | --- |
| C-024/C-031 | `components/settings/MessagingSetupManager.vue` | Completed | Passed | 2026-02-11 | Manager now acts as shell and mounts provider-specific flows. |
| C-025/C-026/C-027 | `components/settings/messaging/flows/*.vue` | Completed | Passed | 2026-02-11 | Added provider-separated flow components (WhatsApp, WeChat, WeCom, Discord). |
| C-028/C-032 | `stores/messagingProviderFlowStore.ts`, `stores/messagingVerificationStore.ts`, `utils/messagingSetupScope.ts` | Completed | Passed | 2026-02-11 | Applied strict SoC split: provider flow store + verification store; removed combined setup store. |
| C-029/C-030 | `composables/useMessagingProviderStepFlow.ts` + step derivation | Completed | Passed | 2026-02-11 | Enforced provider-specific step order; non-required steps omitted from the order. |
| C-033 | `stores/__tests__/messagingProviderFlowStore.spec.ts`, `stores/__tests__/messagingVerificationStore.spec.ts`, `components/settings/__tests__/MessagingSetupManager.spec.ts`, `components/settings/messaging/__tests__/SetupVerificationCard.spec.ts` | Completed | Passed | 2026-02-11 | Added/updated isolation coverage and provider-scoped verification assertions after store split. |

## Blocked Items

| File | Blocked By | Unblock Condition | Owner/Next Action |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Design Feedback Loop Log

| Date | Trigger File(s) | Smell Description | Proposed Design Doc Section Updated | Update Status | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-02-11 | `components/settings/messaging/ChannelBindingSetupCard.vue` | Interaction flow/state logic too concentrated in one component. | `Change Inventory` -> `C-013` | Updated | Added composable extraction task before card refactor. |

## Remove/Rename/Legacy Cleanup Verification Log

| Date | Change ID | Item | Verification Performed | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-02-11 | C-004 | Legacy provider/transport fallback branch | Removed fallback branch; updated store tests to require advertised capability pairs. | Passed | Clean-cut policy aligned. |
| 2026-02-11 | C-006 | Snapshot-only verification behavior | Replaced with check-level live verification and blocker-action mapping; store tests updated. | Passed | Includes runtime inactivity blocker coverage. |
| 2026-02-11 | C-009 | WhatsApp-only shared QR copy | Shared panel now uses provider-aware instruction/alt text; component tests updated. | Passed | WeChat and WhatsApp variants covered through provider prop. |

## Naming Cleanup Execution Log

| Date | Change IDs | Scope | Verification Performed | Result |
| --- | --- | --- | --- | --- |
| 2026-02-11 | C-014..C-015 | Component/module path rename (`MessagingSetupManager`, `externalMessaging/*`) | Imports/tests updated to `MessagingSetupManager` and `components/settings/messaging/*`; component tests executed. | Passed |
| 2026-02-11 | C-016..C-020 | Store/type module rename (`messaging*` paths + hooks + store IDs + type module path) | Store tests executed (`messagingSetup`, `messagingProviderScope`, `messagingChannelBinding*`). | Passed |
| 2026-02-11 | C-021..C-022 | Service/composable rename (`messagingGatewayClient`, `useMessagingChannelBindingSetupFlow`) | Service + component tests executed; imports/path resolution validated by Vitest run. | Passed |
| 2026-02-11 | C-023 | Settings section key rename (`external-messaging` -> `messaging`) | `pages/__tests__/settings.spec.ts` updated and passed. | Passed |
