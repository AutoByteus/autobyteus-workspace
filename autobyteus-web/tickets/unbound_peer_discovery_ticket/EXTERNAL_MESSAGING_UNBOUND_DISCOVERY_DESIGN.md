# Design Document (autobyteus-web: Unbound Peer Discovery UX, Rev 4)

## Summary
Current deep verification shows remaining structure issues and newly addressed policy gaps:
- policy gaps now addressed in current implementation:
  - peer refresh gating now requires `gatewayReady + activeSession`,
  - config edits now invalidate stale `READY` status,
  - gateway connection config now persists in local storage across reloads,
  - stale capability-disabled state now self-heals via capability re-check before binding save/delete.
- structure smells still present:
  - `ChannelBindingSetupCard.vue` (504 LOC) mixes UI rendering, form state orchestration, validation sequencing, and store command policy.
  - `gatewaySessionSetupStore.ts` (501 LOC) mixes gateway connectivity config, session lifecycle, QR flow, auto-sync scheduler, and error policy.
  - store/file boundary split from Rev 3 is still pending.

- resolved smell:
  - gateway client construction policy duplication across stores was removed via shared `services/gatewayClientFactory.ts`.

This revision keeps setup simple and stages structural split work while hardening behavior in current files.

## Goals
- Peer refresh/verification decisions follow store source-of-truth.
- Keep setup actionable before binding.
- Avoid false-negative "Binding API unavailable" blocks from stale capability state.
- Preserve gateway connection inputs across reload/restart.
- Keep setup UI beginner-friendly by hiding transport-fallback tuning from default flow.
- Reduce oversized mixed-concern files.
- Preserve manual peer/target fallback.

## Non-Goals
- No monitoring dashboard.
- No auto-binding.
- No backend behavior changes.

## Requirements And Use Cases
- Use Case 1: Config edit invalidates prior readiness and requires re-validation.
- Use Case 2: Refresh peers before binding requires `gatewayReady + activeSession`.
- Use Case 3: Empty peer list remains actionable guidance.
- Use Case 4: Save binding path succeeds for discovered peer/target.
- Use Case 5: Stale selection guard prevents invalid save.
- Use Case 6: Save/delete binding recovers from stale capability-disabled state by re-checking capabilities.
- Use Case 7: Gateway base URL/admin token persist and rehydrate on next app launch.

## Architecture Overview
Split current large files into focused pieces:
- Session/gateway stores:
  - `gatewayConnectionStore` (new): base URL/token/readiness only.
  - `personalSessionStore` (new): start/stop/status/QR.
  - `personalSessionAutoSyncService` (new helper/composable): polling policy only.
  - `useGatewayClientFactory.ts` (new helper/composable): single gateway client construction policy.
- Binding UI:
  - `ChannelBindingSetupCard.vue` keeps layout shell.
  - `useChannelBindingFormController.ts` (new composable): draft/watchers/eligibility policy.
  - `PeerSelectionPanel.vue` (new): peer-mode UI.
  - `TargetSelectionPanel.vue` (new): target-mode UI.

## Rev 4 Delta (Implemented Guardrails Before Structural Split)
- `externalChannelBindingSetupStore.ts`:
  - `upsertBinding` and `deleteBinding` now re-run `loadCapabilities()` when local state says binding API is disabled, reducing stale-state false failures.
- `gatewaySessionSetupStore.ts`:
  - gateway config is persisted to local storage key `external_messaging_gateway_config_v1`,
  - `initializeFromConfig()` now prefers persisted values when present.
- `gatewayCapabilityStore.ts` and `gatewaySessionSetupStore.ts`:
  - both use `services/gatewayClientFactory.ts` as single client-construction boundary.
- `ChannelBindingSetupCard.vue`:
  - removed `Allow transport fallback` checkbox from setup UI,
  - save path enforces deterministic default `allowTransportFallback: false`.

## File And Module Breakdown

| File/Module | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/gatewayConnectionStore.ts` (new) | Gateway config + readiness source-of-truth | `setConfig`, `validateConnection`, `getReadinessSnapshot` | config input -> readiness state | gateway client |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/personalSessionStore.ts` (new) | Session lifecycle + QR/status state | `startSession`, `refreshStatus`, `refreshQr`, `stopSession` | user action -> session state | gateway connection store |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/gatewayCapabilityStore.ts` | Capability/account inventory state only | `loadCapabilities`, `loadWeComAccounts` | gateway responses -> capability state | gateway client factory |
| `/Users/normy/autobyteus_org/autobyteus-web/composables/useGatewayClientFactory.ts` (new) | Single gateway client construction policy | `createGatewayClient()` | gateway config -> typed client | gateway connection store + client ctor |
| `/Users/normy/autobyteus_org/autobyteus-web/services/sessionSync/personalSessionAutoSyncController.ts` (new) | Auto-sync scheduler policy | `start`, `stop`, `tick` | session status transitions -> timer behavior | personal session store |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/externalChannelBindingSetupStore.ts` | Capability + binding CRUD orchestration | `loadCapabilities`, `upsertBinding`, `deleteBinding` | gql responses -> capability/binding state | apollo client |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/externalChannelBindingOptionsStore.ts` | Peer/target options + stale guard | existing APIs | query -> options/validation | gateway/pinia/apollo |
| `/Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/ChannelBindingSetupCard.vue` | Container shell and compose child panels | card-level events | store/composable state -> UI | controller + child panels |
| `/Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/PeerSelectionPanel.vue` (new) | Peer input mode rendering | peer events | options + selected peer state | controller/store |
| `/Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/TargetSelectionPanel.vue` (new) | Target input mode rendering | target events | options + selected target state | controller/store |
| `/Users/normy/autobyteus_org/autobyteus-web/composables/useChannelBindingFormController.ts` (new) | Form orchestration policy and watchers | controller methods/derived flags | store data + draft -> UI commands | options/binding/session stores |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `gatewayConnectionStore.ts` | gateway client | personal session + binding controller | Low | no session lifecycle logic |
| `personalSessionStore.ts` | gateway connection store | session setup card + checklist | Medium | keep polling scheduler out via dedicated controller |
| `gatewayCapabilityStore.ts` | gateway client factory | setup manager | Low | remove duplicated direct client construction |
| `externalChannelBindingSetupStore.ts` | apollo gql client | binding setup card/controller | Medium | self-heal capability check before save/delete to avoid stale state drift |
| `useChannelBindingFormController.ts` | options/binding/session stores | binding card + peer/target panels | Medium | single orchestration composable avoids logic scattering |
| `ChannelBindingSetupCard.vue` | controller + child panels | settings page | Low | presentational shell only after split |

## Data Models (If Needed)
No new domain entities.
Refined derived flag policy:
- `canDiscoverPeers = providerPersonal && transportPersonal && sessionActive && gatewayReady`.

## Error Handling And Edge Cases
- Gateway config changed after READY: readiness invalidated immediately.
- Gateway config survives reload via local storage and remains user-editable.
- Peer refresh when not eligible: actionable message, no API call.
- Empty candidates: instruction shown.
- Stale dropdown selection: mutation blocked with stale-selection error.
- Capability temporarily unavailable in store state: binding save/delete performs capability re-check before final failure.

## Migration / Rollout
1. Extract gateway connection concerns from current large store.
2. Extract session lifecycle from current large store.
3. Extract binding form controller and peer/target panels.
4. Update tests to match new boundaries.

## Design Feedback Loop Notes (From Verification)

| Date | Trigger (File/Test/Blocker) | Design Smell | Design Update Applied | Status |
| --- | --- | --- | --- | --- |
| 2026-02-09 | `canDiscoverPeers` ignored gateway readiness | policy drift vs source-of-truth | eligibility policy updated | In Progress |
| 2026-02-09 | `ChannelBindingSetupCard.vue` reached 504 LOC | multi-concern component | split into controller + peer/target panels | Planned |
| 2026-02-09 | `gatewaySessionSetupStore.ts` reached 501 LOC | mixed connection/session/polling concerns | split into connection/session stores + sync controller | Planned |
| 2026-02-09 | duplicated gateway client construction across stores | client construction policy can diverge between setup paths | add shared gateway client factory helper | Implemented |
| 2026-02-09 | stale `bindingCrudEnabled=false` state blocked valid save/delete | stale capability state caused false-negative blocking | add capability self-heal re-check before mutation | Implemented |
| 2026-02-09 | repeated manual gateway config entry after reload | setup friction + misconfiguration risk | persist/rehydrate gateway base URL/token in local storage | Implemented |

## Open Questions
- Keep manual refresh only, or add optional short-lived auto-refresh while setup is pending?
