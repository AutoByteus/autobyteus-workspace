# Design-Based Runtime Call Stacks (Debug-Trace Style)

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint (API/CLI/event)
  - `[ASYNC]` async boundary (`await`, queue handoff, callback)
  - `[STATE]` in-memory mutation
  - `[IO]` file/network/database/cache IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path
- Do not include legacy/backward-compatibility branches.

## Design Basis

- Scope Classification: `Medium`
- Source Artifact:
  - `tickets/messaging-setup-multi-provider-assistant/proposed-design.md`
- Referenced Sections:
  - `Requirements And Use Cases`
  - `Change Inventory (Delta)`
  - `File And Module Breakdown`

## Use Case Index

- Use Case 1: Bootstrap messaging setup and select provider scope.
- Use Case 2: WhatsApp/WeChat personal-session lifecycle with QR progression.
- Use Case 3: Discord business setup with peer discovery and scoped binding save.
- Use Case 4: Provider-scoped readiness and binding list evaluation.
- Use Case 5: Live verification run with actionable blocked state.

---

## Use Case 1: Bootstrap Messaging Setup And Select Provider Scope

### Goal
Initialize gateway/capability/binding/target-option state and derive initial journey step for selected provider.

### Preconditions
- Settings page opens messaging section.
- Gateway config may exist in runtime config or local storage.

### Expected Outcome
- Provider options are populated.
- Active step is derived from scoped readiness states.

### Primary Runtime Call Stack

```text
[ENTRY] pages/settings.vue:render() -> MessagingSetupManager
└── [ASYNC] components/settings/MessagingSetupManager.vue:onMounted()
    └── [ASYNC] components/settings/MessagingSetupManager.vue:bootstrapSetupState()
        ├── [STATE] stores/gatewaySessionSetupStore.ts:initializeFromConfig()
        ├── [ASYNC][IO] stores/gatewayCapabilityStore.ts:loadCapabilities()
        ├── [STATE] stores/messagingProviderScopeStore.ts:initialize(capabilities)
        ├── [ASYNC][IO] stores/gatewayCapabilityStore.ts:loadWeComAccounts()
        ├── [ASYNC][IO] stores/messagingChannelBindingSetupStore.ts:loadCapabilities()
        ├── [ASYNC][IO] stores/messagingChannelBindingSetupStore.ts:loadBindingsIfEnabled()
        ├── [ASYNC][IO] stores/messagingChannelBindingOptionsStore.ts:loadTargetOptions()
        └── [STATE] components/settings/MessagingSetupManager.vue:activeStepKey (computed from setupStore.stepStates)
```

### Branching / Fallback Paths

```text
[ERROR] any bootstrap request fails
components/settings/MessagingSetupManager.vue:bootstrapSetupState()
└── [STATE] bootstrapError.value = normalize(error)
```

### State And Data Transformations

- Runtime/local storage config -> gateway config state.
- Capability payload -> available provider options + selected provider.
- Binding/target datasets -> scoped readiness and journey step derivation.

### Observability And Debug Points

- Bootstrap error banner in manager.
- Capability and binding store error states.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`

### Open Questions

- None.

---

## Use Case 2: WhatsApp/WeChat Personal-Session Lifecycle With QR Progression

### Goal
Drive personal provider flow from gateway readiness through active session and QR state transitions.

### Preconditions
- Selected provider is `WHATSAPP` or `WECHAT`.
- Gateway has valid base URL/token.

### Expected Outcome
- Session starts.
- QR eventually available.
- Session reaches `ACTIVE` and unlocks binding progression.

### Primary Runtime Call Stack

```text
[ENTRY] components/settings/messaging/PersonalSessionSetupCard.vue:onStartSession()
└── [ASYNC] stores/gatewaySessionSetupStore.ts:startPersonalSession(accountLabel)
    ├── [IO] services/gatewayClientFactory.ts:createGatewayClient(...)
    ├── [ASYNC][IO] services/messagingGatewayClient.ts:startWhatsAppPersonalSession(...) | startWeChatPersonalSession(...)
    ├── [ASYNC][IO] stores/gatewaySessionSetupStore.ts:fetchPersonalSessionQr(sessionId)
    │   └── [ASYNC][IO] services/messagingGatewayClient.ts:getWhatsAppPersonalQr(...) | getWeChatPersonalQr(...)
    ├── [STATE] stores/gatewaySessionSetupStore.ts:startSessionStatusAutoSync(sessionId)
    └── [STATE] components/settings/MessagingSetupManager.vue:activeStepKey (reactive recompute)
```

### Branching / Fallback Paths

```text
[FALLBACK] QR not ready race
stores/gatewaySessionSetupStore.ts:fetchPersonalSessionQr(sessionId)
└── [ERROR->STATE] GatewayClientError(status=409, code=SESSION_QR_NOT_READY)
    ├── session.status = PENDING_QR
    └── sessionError = 'QR code is not ready yet...'
```

```text
[FALLBACK] existing personal session conflict
stores/gatewaySessionSetupStore.ts:startPersonalSession(accountLabel)
└── [ERROR->ASYNC] GatewayClientError(status=409, code=SESSION_ALREADY_RUNNING, details.sessionId)
    └── stores/gatewaySessionSetupStore.ts:attachToExistingSession(sessionId)
```

```text
[ERROR] personal mode disabled
stores/gatewaySessionSetupStore.ts:startPersonalSession(accountLabel)
└── [ERROR->STATE] GatewayClientError(status=403) -> personalModeBlockedReason
```

### State And Data Transformations

- `accountLabel` input -> provider-specific session start request.
- Session status payloads -> auto-sync decisions and step progression.
- Raw QR text -> SVG data URL via `services/qr/qrCodeDataUrlService.ts:toQrCodeDataUrl`.

### Observability And Debug Points

- Session status badge and auto-sync state messages.
- QR render state (`rendering`, `image`, `error`) in QR panel.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`

### Open Questions

- None.

---

## Use Case 3: Discord Business Setup With Peer Discovery And Scoped Binding Save

### Goal
Support Discord business setup without personal-session dependency while preserving identity validation and discovery controls.

### Preconditions
- Selected provider is `DISCORD`.
- Gateway capability advertises `discordEnabled`.

### Expected Outcome
- Peer candidates load using discord account context.
- Binding save validates discord identity and scope.

### Primary Runtime Call Stack

```text
[ENTRY] components/settings/messaging/ChannelBindingSetupCard.vue:onRefreshPeerCandidates()
└── [ASYNC] composables/useMessagingChannelBindingSetupFlow.ts:onRefreshPeerCandidates()
    └── [ASYNC] stores/messagingChannelBindingOptionsStore.ts:loadPeerCandidates(accountId, options, provider=DISCORD)
        ├── [IO] stores/gatewaySessionSetupStore.ts:createClient()
        └── [ASYNC][IO] services/messagingGatewayClient.ts:getDiscordPeerCandidates({ accountId, includeGroups, limit })

[ENTRY] components/settings/messaging/ChannelBindingSetupCard.vue:onSaveBinding()
└── [ASYNC] composables/useMessagingChannelBindingSetupFlow.ts:onSaveBinding()
    ├── [STATE] stores/messagingChannelBindingOptionsStore.ts:assertSelectionsFresh(...)
    └── [ASYNC][IO] stores/messagingChannelBindingSetupStore.ts:upsertBinding(draft)
        ├── [STATE] stores/messagingChannelBindingSetupStore.ts:validateDraft(draft)
        │   └── utils/discordBindingIdentityValidation.ts:validateDiscordBindingIdentity(...)
        └── [ASYNC][IO] graphql/mutations/externalChannelSetupMutations.ts:UPSERT_EXTERNAL_CHANNEL_BINDING
```

### Branching / Fallback Paths

```text
[FALLBACK] discovery requested before gateway ready
components/settings/messaging/ChannelBindingSetupCard.vue:onRefreshPeerCandidates()
└── [STATE] optionsStore.peerCandidatesError = 'Validate gateway connection first...'
```

```text
[ERROR] Discord identity invalid
stores/messagingChannelBindingSetupStore.ts:upsertBinding(draft)
└── [STATE] fieldErrors.{peerId|threadId|accountId} set from validator or GraphQL error extensions
```

### State And Data Transformations

- Discord capability account id -> default `accountId` draft.
- Peer candidate selection -> `peerId` + `threadId` materialized draft.
- Draft -> GraphQL mutation input.

### Observability And Debug Points

- Peer candidate error message and stale selection guard.
- Per-field validation errors surfaced in binding card.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`

### Open Questions

- None.

---

## Use Case 4: Provider-Scoped Readiness And Binding List Evaluation

### Goal
Prevent cross-provider false positives by evaluating readiness and binding visibility for current provider/transport/account scope only.

### Preconditions
- Bindings can contain rows for multiple providers/transports/accounts.

### Expected Outcome
- Step state and verification use scoped binding set.
- UI binding list emphasizes current provider scope.

### Primary Runtime Call Stack

```text
[ENTRY] stores/messagingSetupStore.ts:stepStates (getter)
├── stores/gatewaySessionSetupStore.ts:getReadinessSnapshot()
├── [STATE] stores/messagingChannelBindingSetupStore.ts:getReadinessSnapshotForScope({ provider, transport, accountId? })
└── [STATE] components/settings/MessagingSetupManager.vue:activeStepKey (reactive recompute)

[ENTRY] components/settings/messaging/ChannelBindingSetupCard.vue:render()
└── [STATE] stores/messagingChannelBindingSetupStore.ts:bindingsForScope({ provider, transport, accountId? })
```

### Branching / Fallback Paths

```text
[FALLBACK] binding capability disabled
stores/messagingChannelBindingSetupStore.ts:getReadinessSnapshotForScope(...)
└── returns capability-blocked readiness for selected scope
```

```text
[FALLBACK] no scoped bindings found
stores/messagingSetupStore.ts:stepStates
└── binding step -> PENDING with scoped guidance detail
```

### State And Data Transformations

- Full binding table -> scoped binding subset.
- Scoped subset -> readiness boolean + detail message.

### Observability And Debug Points

- Scoped empty-state message and provider badge.
- Setup step status transitions after save/delete/reload.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`

### Open Questions

- None.

---

## Use Case 5: Live Verification Run With Actionable Blocked State

### Goal
Execute live verification checks and surface targeted remediation actions when blocked.

### Preconditions
- User clicks `Run Verification`.

### Expected Outcome
- Verification shows in-progress checks.
- Final result is either `READY` or `BLOCKED` with explicit actions.

### Primary Runtime Call Stack

```text
[ENTRY] components/settings/messaging/SetupVerificationCard.vue:onRunVerification()
└── [ASYNC] stores/messagingSetupStore.ts:runSetupVerification()
    ├── [STATE] verificationChecks[*] => RUNNING
    ├── [ASYNC][IO] stores/gatewaySessionSetupStore.ts:validateGatewayConnection(optional-refresh)
    ├── [ASYNC] stores/messagingSetupStore.ts:evaluateSessionReadinessForProvider(provider)
    ├── [ASYNC][IO] stores/messagingChannelBindingSetupStore.ts:loadBindingsIfEnabled()
    ├── [ASYNC][IO] stores/messagingChannelBindingOptionsStore.ts:loadTargetOptions()
    ├── [STATE] stores/messagingChannelBindingSetupStore.ts:getReadinessSnapshotForScope(...)
    ├── [STATE] stores/messagingSetupStore.ts:buildVerificationResult(checks, blockers, actions)
    └── [STATE] components/settings/MessagingSetupManager.vue:activeStepKey (reactive recompute)
```

### Branching / Fallback Paths

```text
[FALLBACK] blocked by inactive target runtime
stores/messagingSetupStore.ts:buildVerificationResult(...)
└── blocker code TARGET_RUNTIME_NOT_ACTIVE + action OPEN_AGENT_RUNTIME | OPEN_TEAM_RUNTIME
```

```text
[FALLBACK] provider without personal session requirement (DISCORD)
stores/messagingSetupStore.ts:evaluateSessionReadinessForProvider(provider)
└── returns PASSED for session check with not-required detail
```

```text
[ERROR] verification execution failure
stores/messagingSetupStore.ts:runSetupVerification()
└── verificationError + synthetic VERIFICATION_ERROR blocker
```

### State And Data Transformations

- Live check results -> `VerificationCheckState[]`.
- Failed checks -> `SetupBlocker[]` with `action` metadata.
- Result -> UI status badge + blocker action buttons.

### Observability And Debug Points

- Check-level timestamps and statuses.
- Blocker code/action mapping visible in verification panel.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`

### Open Questions

- Confirm final routing target for `OPEN_AGENT_RUNTIME` and `OPEN_TEAM_RUNTIME` actions.

---

## Store-Split Addendum (2026-02-11)

The call stacks above were drafted before the final separation-of-concern refinement. Final implementation keeps behavior but splits orchestration across dedicated stores:

- Provider step progression:
  - from `stores/messagingSetupStore.ts:stepStates*`
  - to `stores/messagingProviderFlowStore.ts:stepStatesForProvider(...)`
- Verification execution:
  - from `stores/messagingSetupStore.ts:runSetupVerification(...)`
  - to `stores/messagingVerificationStore.ts:runSetupVerification(...)`
- Shared scope derivation:
  - extracted to `utils/messagingSetupScope.ts`

Validation:
- Regression suite passes after refactor, and provider-switch leakage behavior is resolved.
