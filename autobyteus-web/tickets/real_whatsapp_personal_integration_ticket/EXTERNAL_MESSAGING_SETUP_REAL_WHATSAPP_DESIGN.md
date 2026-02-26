# Design Document (Web Setup For Real WhatsApp Personal)

## Feasibility Verdict
It is feasible to complete user setup from `autobyteus-web` only. The required backend setup surfaces already exist:
- gateway admin APIs for personal session lifecycle;
- server GraphQL APIs for channel binding capability and CRUD.

No direct provider API is required in web.

## Summary
Keep `autobyteus-web` as a setup-only control panel for:
- gateway connectivity validation;
- WhatsApp personal QR onboarding;
- channel binding setup;
- final readiness verification.

The web app should not become a runtime monitoring console.

## Goals
- Align web setup flow with real gateway behavior (not mock behavior).
- Make first-time setup easy in a single settings area.
- Keep clean separation of concerns across component/store/service boundaries.
- Handle gateway lifecycle edge cases (`SESSION_QR_NOT_READY`, `SESSION_ALREADY_RUNNING`) clearly.
- Render a scannable QR in web UI from gateway QR payload.

## Non-Goals
- No chat/message timeline in web.
- No provider transport implementation in web.
- No agent runtime monitoring.
- No replacement of gateway/server ownership boundaries.

## Requirements And Use Cases
- Use Case 1: Validate gateway URL/token.
- Use Case 2: Start personal session and show QR.
- Use Case 3: If gateway reports existing running session, attach to it from web.
- Use Case 4: Start personal session while personal mode is disabled and show actionable blocked state.
- Use Case 5: Automatically synchronize session status until `ACTIVE` after QR scan.
- Use Case 6: Configure binding and run final setup verification.
- Use Case 7: Before any session is started, checklist state remains `PENDING` (not `BLOCKED`).
- Use Case 8: When session status transitions to `STOPPED` or `ACTIVE`, stale QR must be cleared from UI state.
- Use Case 9: If auto sync is paused/stopped by retry budget, operator can use manual status refresh as fallback.
- Use Case 10: Auto-sync timer is always cleaned up on view unmount/navigation and session stop.

## Architecture Overview
Three-layer architecture remains:
1. Composition layer (`ExternalMessagingManager.vue` + cards).
2. State/orchestration layer (Pinia stores).
3. Transport layer (gateway REST client + GraphQL docs).

## File And Module Breakdown

| File/Module | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web/pages/settings.vue` | Settings section registration | route section state | input: selected section; output: mount manager | settings shell |
| `/Users/normy/autobyteus_org/autobyteus-web/components/settings/ExternalMessagingManager.vue` | Setup section composition only | component mount lifecycle | input: store snapshots; output: card orchestration | setup stores |
| `/Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/GatewayConnectionCard.vue` | Gateway config + validate action UI | `@validate-connection` | input: baseUrl/token; output: validate action | `gatewaySessionSetupStore` |
| `/Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/PersonalSessionSetupCard.vue` | Session lifecycle UI | `@start-session`, `@refresh-qr`, `@refresh-status`, `@stop-session` | input: session/error/auto-sync state; output: lifecycle actions | `gatewaySessionSetupStore` |
| `/Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/ScannableQrCodePanel.vue` (new) | QR payload rendering only (string -> image) | `props.qrCode` | input: QR text; output: renderable data URL image state | `services/qr/qrCodeDataUrlService.ts` |
| `/Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/ChannelBindingSetupCard.vue` | Binding CRUD UI | `@save-binding`, `@delete-binding` | input: binding draft/list; output: CRUD actions | `externalChannelBindingSetupStore` |
| `/Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/SetupVerificationCard.vue` | Final readiness verification UI | `@run-verification` | input: verification result; output: run check | `externalMessagingSetupStore` |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/gatewaySessionSetupStore.ts` | Gateway/session state orchestration | `validateGatewayConnection`, `startPersonalSession`, `fetchPersonalSessionQr`, `fetchPersonalSessionStatus`, `startSessionStatusAutoSync`, `stopSessionStatusAutoSync`, `stopPersonalSession`, `getReadinessSnapshot` | input: UI actions; output: session + readiness/auto-sync state | gateway client + status-sync policy |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/externalChannelBindingSetupStore.ts` | Binding capability + CRUD state | `loadCapabilities`, `loadBindingsIfEnabled`, `upsertBinding`, `deleteBinding`, `getReadinessSnapshot` | input: GraphQL ops; output: binding/capability state | GraphQL docs + Apollo |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/externalMessagingSetupStore.ts` | Setup checklist + verification aggregation | `stepStates`, `runSetupVerification` | input: child snapshots; output: checklist/verdict | gateway + binding stores |
| `/Users/normy/autobyteus_org/autobyteus-web/services/externalMessagingGatewayClient.ts` | Gateway REST boundary and typed errors | `getHealth`, `startWhatsAppPersonalSession`, `getWhatsAppPersonalQr`, `getWhatsAppPersonalStatus`, `stopWhatsAppPersonalSession` | input: DTOs; output: typed payload/errors | axios |
| `/Users/normy/autobyteus_org/autobyteus-web/services/sessionSync/personalSessionStatusSyncPolicy.ts` (new) | Auto-sync timing/retry policy only | `createPersonalSessionSyncPolicy()`, `shouldContinuePolling(...)` | input: current status/error counters; output: next delay + continue/stop decision | none |
| `/Users/normy/autobyteus_org/autobyteus-web/services/qr/qrCodeDataUrlService.ts` (new) | Pure QR encoding boundary | `toQrCodeDataUrl(qrText)` | input: QR string payload; output: PNG/SVG data URL for view | `qrcode` |
| `/Users/normy/autobyteus_org/autobyteus-web/types/externalMessaging.ts` | Setup domain contracts | type exports | input: REST/GraphQL payload models; output: app contracts | none |

## Gateway Contract Alignment (Real)
Gateway admin contracts consumed by web:
- `POST /api/channel-admin/v1/whatsapp/personal/sessions` -> `201 { sessionId, accountLabel, status }`
- `GET /api/channel-admin/v1/whatsapp/personal/sessions/:sessionId/qr` -> `200 { code, expiresAt, qr? }`
- `GET /api/channel-admin/v1/whatsapp/personal/sessions/:sessionId/status` -> `200 { sessionId, accountLabel, status, updatedAt }`
- `DELETE /api/channel-admin/v1/whatsapp/personal/sessions/:sessionId` -> `204`

Session status enum:
- `PENDING_QR`
- `ACTIVE`
- `DEGRADED`
- `STOPPED`

Known error contracts:
- `403 PERSONAL_SESSION_DISABLED`
- `404 SESSION_NOT_FOUND`
- `409 SESSION_QR_NOT_READY`
- `409 SESSION_ALREADY_RUNNING` (includes `sessionId`)
- `410 SESSION_QR_EXPIRED`

## Locked Design Decisions (Iteration 3)
1. `SESSION_ALREADY_RUNNING` attach flow is first-class:
   - `externalMessagingGatewayClient.ts` parses optional structured error context:
     - `GatewayClientError.details?: { sessionId?: string }`
   - `gatewaySessionSetupStore.ts:startPersonalSession(...)`:
     - on `409 SESSION_ALREADY_RUNNING`, call:
       - `attachToExistingSession(sessionId)`
       - `fetchPersonalSessionStatus(sessionId)`
       - `fetchPersonalSessionQr(sessionId)` (best effort)
     - return attached session result instead of throwing.
2. `SESSION_QR_NOT_READY` is non-fatal and expected:
   - `gatewaySessionSetupStore.ts:fetchPersonalSessionQr(...)`:
     - on `409 SESSION_QR_NOT_READY`, keep session in `PENDING_QR`;
     - set `sessionError` to informational retry text only;
     - do not mark personal mode blocked.
3. Checklist semantics are deterministic:
   - `gatewaySessionSetupStore.ts:getReadinessSnapshot()` returns:
     - `personalSessionBlockedReason: null` when session is absent and no hard error;
   - `externalMessagingSetupStore.ts:stepStates` maps:
     - no session + no blocker => `PENDING`;
     - explicit blocker => `BLOCKED`;
     - `ACTIVE` => `READY`.
4. QR rendering is scannable by default:
   - `ScannableQrCodePanel.vue` renders `img src=dataUrl` from QR string;
   - `qrCodeDataUrlService.ts` is the only QR encoding boundary;
   - raw QR text shown only as fallback/debug when encoding fails.
5. Setup flow remains setup-only:
   - no runtime monitoring, no transport logic in components/stores.
6. Session status drives QR visibility deterministically:
   - QR is renderable only when `session.status === PENDING_QR`;
   - `fetchPersonalSessionStatus(...)` must normalize session state so `ACTIVE` and `STOPPED` clear `session.qr`;
   - `SESSION_QR_NOT_READY` branch also clears stale QR before waiting/retry.
7. Session status synchronization is store-owned and automatic during onboarding:
   - `gatewaySessionSetupStore.ts:startSessionStatusAutoSync(sessionId?)` starts bounded polling;
   - `gatewaySessionSetupStore.ts:stopSessionStatusAutoSync(reason)` stops timer and updates sync state;
   - auto sync is started after `startPersonalSession(...)` and after `attachToExistingSession(...)`;
   - auto sync stops on terminal session states (`ACTIVE`, `STOPPED`), explicit `stopPersonalSession`, hard `404`, or view unmount;
   - manual `Refresh Status` remains available as operator fallback, not primary mechanism.
8. Polling policy is a dedicated concern:
   - `services/sessionSync/personalSessionStatusSyncPolicy.ts` defines interval, retry budget, and timeout;
   - store consumes policy results but does not hardcode timing constants inline.
9. Fallback resume behavior is deterministic:
   - if auto sync is paused/stopped and manual refresh returns `PENDING_QR` or `DEGRADED`, store auto-resumes bounded sync;
   - no separate "resume" decision UI is required.

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation |
| --- | --- | --- | --- | --- |
| `ExternalMessagingManager.vue` | setup stores | setup cards | Low | composition-only manager |
| setup cards | setup stores | none | Low | no direct REST/GraphQL calls in cards |
| `gatewaySessionSetupStore.ts` | gateway client + sync policy | manager + personal card + setup store | Medium | keep all gateway logic and timer orchestration in this store only |
| `externalChannelBindingSetupStore.ts` | Apollo + GraphQL docs | manager + binding card + setup store | Medium | no imports from gateway client/store internals |
| `externalMessagingSetupStore.ts` | gateway/binding snapshots | checklist + verification card | Medium | read-only aggregation boundary |
| `externalMessagingGatewayClient.ts` | axios + runtime config | gateway store | Low | no Pinia imports |
| `personalSessionStatusSyncPolicy.ts` | none | gateway store | Low | pure policy module, no IO/store imports |
| `ScannableQrCodePanel.vue` | qr data-url service | personal session card | Low | no store imports, render-only component |
| `qrCodeDataUrlService.ts` | `qrcode` library | `ScannableQrCodePanel.vue` | Low | pure deterministic function boundary |

## Error Handling And Edge Cases
- Gateway unreachable/invalid token -> gateway step blocked with actionable error.
- Personal mode disabled -> personal step blocked with explicit provider message.
- QR not ready (`409`) -> show waiting state and retry.
- Existing running session (`409 SESSION_ALREADY_RUNNING`) -> attach to existing session.
- QR expired (`410`) -> clear QR and allow refresh.
- Status transitions (`PENDING_QR` -> `ACTIVE` or `STOPPED`) -> clear stale QR immediately.
- Transient status polling errors/timeouts during onboarding -> non-blocking warning and fallback to manual refresh.
- QR render failure in browser -> show fallback raw QR text + retry rendering action.
- Session missing (`404`) -> clear local session, prompt restart.
- Binding capability disabled -> binding step blocked with rollout/capability reason.

## Public API/Type Additions (Web Internal)
- `services/externalMessagingGatewayClient.ts`
  - `GatewayClientError.details?: { sessionId?: string }`
- `stores/gatewaySessionSetupStore.ts`
  - `attachToExistingSession(sessionId: string): Promise<GatewayPersonalSessionModel>`
  - `startSessionStatusAutoSync(sessionId?: string): void`
  - `stopSessionStatusAutoSync(reason?: string): void`
- `services/sessionSync/personalSessionStatusSyncPolicy.ts`
  - `createPersonalSessionSyncPolicy(): PersonalSessionStatusSyncPolicy`
- `services/qr/qrCodeDataUrlService.ts`
  - `toQrCodeDataUrl(qrText: string): Promise<string>`
- `types/externalMessaging.ts`
  - `SessionStatusAutoSyncState` (`idle` | `running` | `paused` | `stopped`)

## Security And UX Constraints
- Admin token remains runtime/in-memory only.
- Setup should stay single-screen and operator-driven.
- Error details surfaced should be actionable but not leak sensitive payloads.

## Defaults Chosen
- Auto status sync is default during onboarding when session is `PENDING_QR` or `DEGRADED`.
- Default polling policy: 2-second base interval, bounded to 120 seconds, with error backoff up to 5 seconds.
- Auto sync is scoped to onboarding view lifecycle and is stopped on unmount/navigation.
- Manual refresh remains available as explicit operator fallback.
- Start-session conflict policy is always `attach-existing` in phase 1.
- QR rendering fallback policy is always `show raw text` if image encoding fails.

## Open Questions
- None blocking design. Implementation can proceed in web ticket iteration.
