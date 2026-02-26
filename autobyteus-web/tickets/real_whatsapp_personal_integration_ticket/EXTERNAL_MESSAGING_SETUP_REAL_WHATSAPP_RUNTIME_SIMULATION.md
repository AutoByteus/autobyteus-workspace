# Simulated Runtime Call Stacks (Debug-Trace Style)

This document validates setup-only web flow for real WhatsApp personal onboarding.

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` user entrypoint
  - `[ASYNC]` async boundary
  - `[STATE]` store mutation
  - `[IO]` network IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path

## Simulation Basis

- Scope Classification: `Medium`
- Source Artifact:
  - `/Users/normy/autobyteus_org/autobyteus-web/tickets/real_whatsapp_personal_integration_ticket/EXTERNAL_MESSAGING_SETUP_REAL_WHATSAPP_DESIGN.md`

## Use Case Index

- Use Case 1: Validate gateway connection.
- Use Case 2: Start personal session and display QR.
- Use Case 3: Attach to existing running gateway session.
- Use Case 4: Start personal session while personal mode is disabled.
- Use Case 5: Auto-sync session status until `ACTIVE`.
- Use Case 6: Create binding and run setup verification.
- Use Case 7: Initial checklist state before session start.
- Use Case 8: Clear stale QR when status is no longer `PENDING_QR`.
- Use Case 9: Manual status-refresh fallback after auto-sync pause/stop.
- Use Case 10: Cleanup auto-sync lifecycle on unmount/stop.

---

## Use Case 1: Validate Gateway Connection

### Goal
Confirm gateway URL/token is valid.

### Primary Runtime Call Stack

```text
[ENTRY] components/settings/externalMessaging/GatewayConnectionCard.vue:onValidateConnection()
└── stores/gatewaySessionSetupStore.ts:validateGatewayConnection(input) [ASYNC]
    ├── services/externalMessagingGatewayClient.ts:getHealth(options) [IO]
    └── stores/gatewaySessionSetupStore.ts:set gatewayStatus/gatewayError [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] unauthorized token
externalMessagingGatewayClient.ts:getHealth() => 401
└── gatewaySessionSetupStore.ts sets gatewayStatus=BLOCKED + error [STATE]
```

### Verification Checklist (Per Use Case)
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 2: Start Personal Session And Display QR

### Goal
Start personal session and show scannable QR returned by gateway.

### Primary Runtime Call Stack

```text
[ENTRY] components/settings/externalMessaging/PersonalSessionSetupCard.vue:onStartSession(accountLabel)
└── stores/gatewaySessionSetupStore.ts:startPersonalSession(accountLabel) [ASYNC]
    ├── services/externalMessagingGatewayClient.ts:startWhatsAppPersonalSession(accountLabel) [IO]
    ├── stores/gatewaySessionSetupStore.ts:set session (PENDING_QR) [STATE]
    ├── stores/gatewaySessionSetupStore.ts:fetchPersonalSessionQr(sessionId) [ASYNC]
    │   ├── services/externalMessagingGatewayClient.ts:getWhatsAppPersonalQr(sessionId) [IO]
    │   └── stores/gatewaySessionSetupStore.ts:set session.qr [STATE]
    ├── components/settings/externalMessaging/PersonalSessionSetupCard.vue:render(ScannableQrCodePanel) [STATE]
    └── services/qr/qrCodeDataUrlService.ts:toQrCodeDataUrl(qr.code) [ASYNC][STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] QR not ready yet
getWhatsAppPersonalQr(sessionId) => 409 SESSION_QR_NOT_READY
└── store keeps session as PENDING_QR + non-blocking retry hint [STATE]
```

```text
[FALLBACK] QR expired before user scans
getWhatsAppPersonalQr(sessionId) => 410 SESSION_QR_EXPIRED
└── store clears stale QR + sets qrExpiredAt + user can trigger refresh QR action [STATE]
```

```text
[ERROR] personal mode disabled
startWhatsAppPersonalSession() => 403 PERSONAL_SESSION_DISABLED
└── store sets personalModeBlockedReason + sessionError [STATE]
```

```text
[FALLBACK] QR rendering fails in browser
qrCodeDataUrlService.ts:toQrCodeDataUrl(qrText) throws
└── ScannableQrCodePanel.vue shows raw QR text fallback + retry render action [STATE]
```

### Verification Checklist (Per Use Case)
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 3: Attach To Existing Running Session

### Goal
When gateway already has a running personal session, web setup should attach to it instead of failing.

### Primary Runtime Call Stack

```text
[ENTRY] components/settings/externalMessaging/PersonalSessionSetupCard.vue:onStartSession(accountLabel)
└── stores/gatewaySessionSetupStore.ts:startPersonalSession(accountLabel) [ASYNC]
    ├── services/externalMessagingGatewayClient.ts:startWhatsAppPersonalSession(accountLabel) [IO]
    ├── receives 409 SESSION_ALREADY_RUNNING with sessionId [IO]
    ├── stores/gatewaySessionSetupStore.ts:attachToExistingSession(sessionId) [ASYNC]
    │   ├── stores/gatewaySessionSetupStore.ts:fetchPersonalSessionStatus(sessionId) [ASYNC]
    │   └── stores/gatewaySessionSetupStore.ts:fetchPersonalSessionQr(sessionId) [ASYNC]
    ├── stores/gatewaySessionSetupStore.ts:startSessionStatusAutoSync(sessionId) [STATE]
    └── stores/gatewaySessionSetupStore.ts:set attached session state + return success [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] SESSION_ALREADY_RUNNING payload missing sessionId
GatewayClientError has code but no session id detail
└── store surfaces actionable fallback message for manual session recovery [STATE]
```

### Verification Checklist (Per Use Case)
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 5: Auto-Sync Session Status Until ACTIVE

### Goal
After QR scan, session should transition to `ACTIVE` in UI without requiring manual refresh.

### Primary Runtime Call Stack

```text
[ENTRY] stores/gatewaySessionSetupStore.ts:startPersonalSession(accountLabel) [ASYNC]
└── stores/gatewaySessionSetupStore.ts:startSessionStatusAutoSync(sessionId) [STATE]
    ├── services/sessionSync/personalSessionStatusSyncPolicy.ts:createPersonalSessionSyncPolicy()
    ├── scheduler tick (interval) [ASYNC]
    │   └── stores/gatewaySessionSetupStore.ts:fetchPersonalSessionStatus(sessionId) [ASYNC]
    │       ├── services/externalMessagingGatewayClient.ts:getWhatsAppPersonalStatus(sessionId) [IO]
    │       └── stores/gatewaySessionSetupStore.ts:update session.status [STATE]
    ├── if status === ACTIVE
    │   └── stores/gatewaySessionSetupStore.ts:stopSessionStatusAutoSync('active') [STATE]
    └── if status === STOPPED
        └── stores/gatewaySessionSetupStore.ts:stopSessionStatusAutoSync('stopped') [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] session not found after gateway restart/reset
getWhatsAppPersonalStatus(sessionId) => 404 SESSION_NOT_FOUND
└── store clears stale session + stops auto sync + returns to onboarding start [STATE]
```

```text
[FALLBACK] stale QR exists from previous pending state
getWhatsAppPersonalStatus(sessionId) => status ACTIVE|STOPPED
└── gatewaySessionSetupStore.ts:mergeSessionWithStatusAwareQr(next, prev) [STATE]
    └── clears session.qr when status !== PENDING_QR
```

```text
[FALLBACK] transient network/API failure during polling
fetchPersonalSessionStatus(sessionId) throws GatewayClientError (5xx/network)
└── gatewaySessionSetupStore.ts:auto-sync loop applies policy backoff [STATE]
    ├── retry while policy budget remains
    └── stopSessionStatusAutoSync('retry_budget_exhausted') + expose manual refresh hint [STATE]
```

```text
[FALLBACK] user navigates away during onboarding
components/settings/ExternalMessagingManager.vue:onUnmounted()
└── stores/gatewaySessionSetupStore.ts:stopSessionStatusAutoSync('view_unmounted') [STATE]
```

### Verification Checklist (Per Use Case)
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 4: Start Personal Session When Personal Mode Is Disabled

### Goal
Surface a clear blocked reason when gateway personal mode is not enabled.

### Primary Runtime Call Stack

```text
[ENTRY] components/settings/externalMessaging/PersonalSessionSetupCard.vue:onStartSession(accountLabel)
└── stores/gatewaySessionSetupStore.ts:startPersonalSession(accountLabel) [ASYNC]
    ├── services/externalMessagingGatewayClient.ts:startWhatsAppPersonalSession(accountLabel) [IO]
    ├── receives 403 PERSONAL_SESSION_DISABLED [IO]
    ├── stores/gatewaySessionSetupStore.ts:set personalModeBlockedReason [STATE]
    └── stores/gatewaySessionSetupStore.ts:set sessionError (actionable) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] stale previous session exists in local state
startPersonalSession() returns 403
└── store preserves existing session data but marks setup step BLOCKED until reconfigured [STATE]
```

### Verification Checklist (Per Use Case)
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 8: Clear Stale QR When Session Is No Longer Pending

### Goal
Prevent misleading UI where expired/old QR remains visible after session transitions out of `PENDING_QR`.

### Primary Runtime Call Stack

```text
[ENTRY] stores/gatewaySessionSetupStore.ts:startSessionStatusAutoSync(sessionId) [STATE]
└── scheduler tick (interval) [ASYNC]
    └── stores/gatewaySessionSetupStore.ts:fetchPersonalSessionStatus(sessionId) [ASYNC]
        ├── services/externalMessagingGatewayClient.ts:getWhatsAppPersonalStatus(sessionId) [IO]
        ├── stores/gatewaySessionSetupStore.ts:mergeSessionWithStatusAwareQr(nextSession, prevSession) [STATE]
        │   ├── if next.status === PENDING_QR => keep qr only when fresh/known [STATE]
        │   └── if next.status !== PENDING_QR => clear qr [STATE]
        └── PersonalSessionSetupCard.vue rerender hides ScannableQrCodePanel [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] explicit manual refresh path uses same cleanup behavior
[ENTRY] components/settings/externalMessaging/PersonalSessionSetupCard.vue:onRefreshStatus(sessionId)
└── stores/gatewaySessionSetupStore.ts:fetchPersonalSessionStatus(sessionId) [ASYNC]
    ├── services/externalMessagingGatewayClient.ts:getWhatsAppPersonalStatus(sessionId) [IO]
    ├── stores/gatewaySessionSetupStore.ts:mergeSessionWithStatusAwareQr(nextSession, prevSession) [STATE]
    │   ├── if next.status === PENDING_QR => keep qr only when fresh/known [STATE]
    │   └── if next.status !== PENDING_QR => clear qr [STATE]
    └── PersonalSessionSetupCard.vue rerender hides ScannableQrCodePanel [STATE]
```

```text
[FALLBACK] QR-not-ready response while pending
fetchPersonalSessionQr(sessionId) => 409 SESSION_QR_NOT_READY
└── store sets status=PENDING_QR and clears qr to avoid stale visual state [STATE]
```

### Verification Checklist (Per Use Case)
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 6: Create Binding And Run Setup Verification

### Goal
Configure routing target and confirm setup readiness.

### Primary Runtime Call Stack

```text
[ENTRY] components/settings/externalMessaging/ChannelBindingSetupCard.vue:onSaveBinding(draft)
└── stores/externalChannelBindingSetupStore.ts:upsertBinding(draft) [ASYNC]
    ├── graphql/mutations/external_channel_setup_mutations.ts:UPSERT_EXTERNAL_CHANNEL_BINDING [IO]
    └── stores/externalChannelBindingSetupStore.ts:applyUpsertResult(binding) [STATE]

[ENTRY] components/settings/externalMessaging/SetupVerificationCard.vue:onRunVerification()
└── stores/externalMessagingSetupStore.ts:runSetupVerification() [ASYNC]
    ├── stores/gatewaySessionSetupStore.ts:getReadinessSnapshot() [STATE]
    ├── stores/externalChannelBindingSetupStore.ts:getReadinessSnapshot() [STATE]
    └── stores/externalMessagingSetupStore.ts:mergeReadiness(...) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] server capability disabled
loadCapabilities() => bindingCrudEnabled=false
└── setup verification returns SERVER_BINDING_API_UNAVAILABLE blocker
```

### Verification Checklist (Per Use Case)
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 7: Initial Checklist State Before Session Start

### Goal
User opens setup before creating any personal session and sees clean `PENDING` session step (not blocked).

### Primary Runtime Call Stack

```text
[ENTRY] components/settings/ExternalMessagingManager.vue:mount()
└── stores/externalMessagingSetupStore.ts:stepStates [STATE]
    ├── stores/gatewaySessionSetupStore.ts:getReadinessSnapshot() [STATE]
    ├── stores/externalChannelBindingSetupStore.ts:getReadinessSnapshot() [STATE]
    └── stores/externalMessagingSetupStore.ts:map personal_session step => PENDING [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] explicit personal error exists
gatewaySessionSetupStore.ts:getReadinessSnapshot() returns personalSessionBlockedReason
└── externalMessagingSetupStore.ts marks personal_session step BLOCKED [STATE]
```

### Verification Checklist (Per Use Case)
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 9: Manual Status-Refresh Fallback After Auto-Sync Pause/Stop

### Goal
If auto sync is paused or stopped due to retry budget/timeout, operator can still complete setup via manual refresh.

### Primary Runtime Call Stack

```text
[ENTRY] components/settings/externalMessaging/PersonalSessionSetupCard.vue:onRefreshStatus(sessionId)
└── stores/gatewaySessionSetupStore.ts:fetchPersonalSessionStatus(sessionId) [ASYNC]
    ├── services/externalMessagingGatewayClient.ts:getWhatsAppPersonalStatus(sessionId) [IO]
    ├── stores/gatewaySessionSetupStore.ts:update session.status [STATE]
    └── if status in (PENDING_QR, DEGRADED)
        └── stores/gatewaySessionSetupStore.ts:startSessionStatusAutoSync(sessionId) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] session already ACTIVE on manual check
fetchPersonalSessionStatus(sessionId) => ACTIVE
└── UI updates immediately and keeps auto-sync stopped [STATE]
```

```text
[ERROR] manual check still fails due to gateway outage
fetchPersonalSessionStatus(sessionId) throws
└── store keeps actionable error and does not clear previous known-safe session state [STATE]
```

### Verification Checklist (Per Use Case)
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No

---

## Use Case 10: Cleanup Auto-Sync Lifecycle On Unmount/Stop

### Goal
Ensure polling/timers never leak after onboarding view exit or explicit session stop.

### Primary Runtime Call Stack

```text
[ENTRY] components/settings/ExternalMessagingManager.vue:onUnmounted()
└── stores/gatewaySessionSetupStore.ts:stopSessionStatusAutoSync('view_unmounted') [STATE]
    └── clears active timer handle + sets sync state to stopped [STATE]
```

```text
[ENTRY] components/settings/externalMessaging/PersonalSessionSetupCard.vue:onStopSession()
└── stores/gatewaySessionSetupStore.ts:stopPersonalSession(sessionId) [ASYNC]
    ├── services/externalMessagingGatewayClient.ts:stopWhatsAppPersonalSession(sessionId) [IO]
    └── stores/gatewaySessionSetupStore.ts:stopSessionStatusAutoSync('session_stopped') [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] stop API fails but timer must still be cleaned up
stopWhatsAppPersonalSession(sessionId) throws
└── store executes stopSessionStatusAutoSync('stop_failed') in finally path [STATE]
```

### Verification Checklist (Per Use Case)
- End-to-end path achieves expected outcome: Yes
- Separation of concerns looks clean: Yes
- Boundaries/API ownership are clear: Yes
- Dependency flow is reasonable: Yes
- Major smell detected: No
