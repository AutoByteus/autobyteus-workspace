# Simulated Runtime Call Stacks (Debug-Trace Style)

Use this document as a debugger-like execution simulation for the setup-only External Messaging flow in `autobyteus-web`.

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint (UI action)
  - `[ASYNC]` async boundary (`await`)
  - `[STATE]` in-memory mutation
  - `[IO]` network IO (REST/GraphQL)
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path

## Simulation Basis

- Scope Classification: `Medium`
- Source Artifact:
  - `/Users/normy/autobyteus_org/autobyteus-web/tickets/external_messaging_channel_bridge_web_ticket/EXTERNAL_MESSAGING_WEB_DESIGN.md`
- Referenced Sections:
  - Architecture Overview
  - File And Module Breakdown
  - Error Handling And Edge Cases

## Use Case Index

- Use Case 1: Open External Messaging Setup Section
- Use Case 2: Validate Gateway Connection
- Use Case 3: Start WhatsApp Personal Session And Fetch QR
- Use Case 4: Create/Update Channel Binding
- Use Case 5: Run Setup Verification

---

## Use Case 1: Open External Messaging Setup Section

### Goal

Render setup-only cards and checklist status in settings.

### Preconditions

- `/Users/normy/autobyteus_org/autobyteus-web/pages/settings.vue` exposes `external-messaging` section.
- Setup stores are registered.

### Expected Outcome

- User sees checklist and setup cards (gateway/session/binding/verification).
- Initial status reflects current known state without starting heavy background monitoring.

### Primary Runtime Call Stack

```text
[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/pages/settings.vue:onSectionSelected("external-messaging")
└── /Users/normy/autobyteus_org/autobyteus-web/components/settings/ExternalMessagingManager.vue:setup()
    ├── /Users/normy/autobyteus_org/autobyteus-web/stores/gatewaySessionSetupStore.ts:initializeFromConfig() [STATE]
    ├── /Users/normy/autobyteus_org/autobyteus-web/stores/externalChannelBindingSetupStore.ts:loadCapabilities() [ASYNC]
    │   ├── /Users/normy/autobyteus_org/autobyteus-web/utils/apolloClient.ts:getApolloClient()
    │   └── /Users/normy/autobyteus_org/autobyteus-web/graphql/queries/external_channel_setup_queries.ts:EXTERNAL_CHANNEL_CAPABILITIES [IO]
    ├── /Users/normy/autobyteus_org/autobyteus-web/stores/externalChannelBindingSetupStore.ts:loadBindingsIfEnabled() [ASYNC] # executes only when capability.bindingCrudEnabled=true
    │   ├── /Users/normy/autobyteus_org/autobyteus-web/utils/apolloClient.ts:getApolloClient()
    │   └── /Users/normy/autobyteus_org/autobyteus-web/graphql/queries/external_channel_setup_queries.ts:EXTERNAL_CHANNEL_BINDINGS [IO]
    └── /Users/normy/autobyteus_org/autobyteus-web/stores/externalMessagingSetupStore.ts:stepStates(getter read) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] binding capability disabled on server
/Users/normy/autobyteus_org/autobyteus-web/stores/externalChannelBindingSetupStore.ts:loadCapabilities()
└── capability.bindingCrudEnabled=false -> set capabilityBlocked=true [STATE]
    └── /Users/normy/autobyteus_org/autobyteus-web/stores/externalChannelBindingSetupStore.ts:loadBindingsIfEnabled() # short-circuit, no binding query IO
    └── /Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/ChannelBindingSetupCard.vue:renderBlockedState()
```

```text
[ERROR] capability query transport error
/Users/normy/autobyteus_org/autobyteus-web/stores/externalChannelBindingSetupStore.ts:loadCapabilities()
└── set loadError + retry hint [STATE]
```

### State And Data Transformations

- GraphQL binding list -> `ExternalChannelBindingModel[]`.
- Child store snapshots -> `SetupStepState[]`.

### Observability And Debug Points

- `externalMessagingSetupStore` computed status transitions.
- Card-level loading/error/blocked state.

### Design Smells / Gaps

- No major smell in web layering.
- No unresolved design gap; server binding capability is explicitly modeled as rollout gate.

### Open Questions

- None for this use case.

### Verification Checklist (Per Use Case)

- End-to-end path achieves expected outcome: **Yes (with blocked-state fallback when capability is disabled)**
- Separation of concerns looks clean: **Yes**
- Boundaries/API ownership are clear: **Yes**
- Dependency flow is reasonable (no accidental cycle/leaky cross-reference): **Yes**
- Major smell detected: **No**

---

## Use Case 2: Validate Gateway Connection

### Goal

Operator verifies configured gateway endpoint/token from setup UI.

### Preconditions

- Runtime config provides gateway URL.
- Operator enters/updates optional token.

### Expected Outcome

- Health status becomes `READY` when gateway responds.
- Checklist gateway step updates accordingly.

### Primary Runtime Call Stack

```text
[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/GatewayConnectionCard.vue:onValidateConnection(payload)
└── /Users/normy/autobyteus_org/autobyteus-web/stores/gatewaySessionSetupStore.ts:validateGatewayConnection(payload) [ASYNC]
    ├── /Users/normy/autobyteus_org/autobyteus-web/services/externalMessagingGatewayClient.ts:getHealth(headers) [IO]
    ├── /Users/normy/autobyteus_org/autobyteus-web/stores/gatewaySessionSetupStore.ts:setGatewayHealthy(health) [STATE]
    └── /Users/normy/autobyteus_org/autobyteus-web/stores/externalMessagingSetupStore.ts:stepStates(getter read by UI) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] unauthorized token
/Users/normy/autobyteus_org/autobyteus-web/services/externalMessagingGatewayClient.ts:getHealth(...) [IO]
└── HTTP 401 -> /Users/normy/autobyteus_org/autobyteus-web/stores/gatewaySessionSetupStore.ts:setGatewayError("invalid token") [STATE]
```

```text
[ERROR] network timeout
/Users/normy/autobyteus_org/autobyteus-web/services/externalMessagingGatewayClient.ts:getHealth(...) [IO]
└── timeout -> /Users/normy/autobyteus_org/autobyteus-web/stores/gatewaySessionSetupStore.ts:setGatewayError("unreachable") [STATE]
```

### State And Data Transformations

- Health JSON -> typed gateway health model.
- Error object -> user-safe error message.

### Observability And Debug Points

- Gateway validate latency and success/failure count.
- Gateway step status in checklist.

### Design Smells / Gaps

- None.

### Open Questions

- None for phase 1 (token state kept in-memory only).

### Verification Checklist (Per Use Case)

- End-to-end path achieves expected outcome: **Yes**
- Separation of concerns looks clean: **Yes**
- Boundaries/API ownership are clear: **Yes**
- Dependency flow is reasonable (no accidental cycle/leaky cross-reference): **Yes**
- Major smell detected: **No**

---

## Use Case 3: Start WhatsApp Personal Session And Fetch QR

### Goal

Operator starts personal-session mode and gets QR to link WhatsApp account.

### Preconditions

- Gateway connection already validated.
- Personal mode is enabled in gateway.

### Expected Outcome

- Session starts, QR is returned, and UI displays current session state.

### Primary Runtime Call Stack

```text
[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/PersonalSessionSetupCard.vue:onStartSession(accountLabel)
└── /Users/normy/autobyteus_org/autobyteus-web/stores/gatewaySessionSetupStore.ts:startPersonalSession(accountLabel) [ASYNC]
    ├── /Users/normy/autobyteus_org/autobyteus-web/services/externalMessagingGatewayClient.ts:startWhatsAppPersonalSession(accountLabel) [IO]
    ├── /Users/normy/autobyteus_org/autobyteus-web/stores/gatewaySessionSetupStore.ts:setSessionStarted(sessionId) [STATE]
    ├── /Users/normy/autobyteus_org/autobyteus-web/stores/gatewaySessionSetupStore.ts:fetchPersonalSessionQr(sessionId) [ASYNC]
    │   └── /Users/normy/autobyteus_org/autobyteus-web/services/externalMessagingGatewayClient.ts:getWhatsAppPersonalQr(sessionId) [IO]
    ├── /Users/normy/autobyteus_org/autobyteus-web/stores/gatewaySessionSetupStore.ts:setQrPayload(qr) [STATE]
    └── /Users/normy/autobyteus_org/autobyteus-web/stores/externalMessagingSetupStore.ts:stepStates(getter read by UI) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] personal mode disabled at gateway
/Users/normy/autobyteus_org/autobyteus-web/services/externalMessagingGatewayClient.ts:startWhatsAppPersonalSession(...) [IO]
└── HTTP 403 -> /Users/normy/autobyteus_org/autobyteus-web/stores/gatewaySessionSetupStore.ts:setPersonalModeBlocked(reason) [STATE]
```

```text
[ERROR] QR expired
/Users/normy/autobyteus_org/autobyteus-web/services/externalMessagingGatewayClient.ts:getWhatsAppPersonalQr(sessionId) [IO]
└── HTTP 410 -> /Users/normy/autobyteus_org/autobyteus-web/stores/gatewaySessionSetupStore.ts:setQrExpired(expiresAt) [STATE]
```

### State And Data Transformations

- Start response -> `GatewayPersonalSessionModel`.
- QR response -> `{ code, expiresAt }` for QR renderer.

### Observability And Debug Points

- Session status transitions (`PENDING_QR -> ACTIVE`).
- QR refresh attempts and expiry events.

### Design Smells / Gaps

- None.

### Open Questions

- None for this use case.

### Verification Checklist (Per Use Case)

- End-to-end path achieves expected outcome: **Yes**
- Separation of concerns looks clean: **Yes**
- Boundaries/API ownership are clear: **Yes**
- Dependency flow is reasonable (no accidental cycle/leaky cross-reference): **Yes**
- Major smell detected: **No**

---

## Use Case 4: Create/Update Channel Binding

### Goal

Operator maps incoming external channel identity to target agent/team.

### Preconditions

- `externalChannelCapabilities.bindingCrudEnabled=true`.
- Server exposes admin GraphQL binding mutations.
- Gateway and personal setup not blocked.

### Expected Outcome

- Binding is upserted and appears in setup list.

### Primary Runtime Call Stack

```text
[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/ChannelBindingSetupCard.vue:onSaveBinding(draft)
└── /Users/normy/autobyteus_org/autobyteus-web/stores/externalChannelBindingSetupStore.ts:upsertBinding(draft) [ASYNC]
    ├── /Users/normy/autobyteus_org/autobyteus-web/stores/externalChannelBindingSetupStore.ts:validateDraft(draft) [STATE]
    ├── /Users/normy/autobyteus_org/autobyteus-web/utils/apolloClient.ts:getApolloClient()
    ├── /Users/normy/autobyteus_org/autobyteus-web/graphql/mutations/external_channel_setup_mutations.ts:UPSERT_EXTERNAL_CHANNEL_BINDING [IO]
    ├── /Users/normy/autobyteus_org/autobyteus-web/stores/externalChannelBindingSetupStore.ts:applyUpsertResult(binding) [STATE]
    └── /Users/normy/autobyteus_org/autobyteus-web/stores/externalMessagingSetupStore.ts:stepStates(getter read by UI) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] unsupported provider/transport pair
/Users/normy/autobyteus_org/autobyteus-web/stores/externalChannelBindingSetupStore.ts:upsertBinding(...)
└── setFieldErrors(validationErrors) [STATE]
```

```text
[ERROR] capability stale (enabled -> mutation unavailable)
/Users/normy/autobyteus_org/autobyteus-web/graphql/mutations/external_channel_setup_mutations.ts:UPSERT_EXTERNAL_CHANNEL_BINDING
└── GraphQL field not found -> set capabilityBlocked=true + rolloutGateError [STATE]
```

### State And Data Transformations

- Form draft -> mutation input DTO.
- Mutation response -> normalized `ExternalChannelBindingModel`.

### Observability And Debug Points

- Mutation latency + failure reason logging.
- Binding step readiness transition.

### Design Smells / Gaps

- No design smell. External capability dependency is explicit and gated.

### Open Questions

- None for phase 1 (exact-match routing only).

### Verification Checklist (Per Use Case)

- End-to-end path achieves expected outcome: **Yes**
- Separation of concerns looks clean: **Yes**
- Boundaries/API ownership are clear: **Yes**
- Dependency flow is reasonable (no accidental cycle/leaky cross-reference): **Yes**
- Major smell detected: **No**

---

## Use Case 5: Run Setup Verification

### Goal

Operator runs final readiness check from setup UI before using external channels.

### Preconditions

- Gateway check completed.
- Session setup and binding setup attempted.

### Expected Outcome

- Verification reports ready/not-ready with actionable blockers.

### Primary Runtime Call Stack

```text
[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/components/settings/externalMessaging/SetupVerificationCard.vue:onRunVerification()
└── /Users/normy/autobyteus_org/autobyteus-web/stores/externalMessagingSetupStore.ts:runSetupVerification() [ASYNC]
    ├── /Users/normy/autobyteus_org/autobyteus-web/stores/gatewaySessionSetupStore.ts:getReadinessSnapshot() [STATE]
    ├── /Users/normy/autobyteus_org/autobyteus-web/stores/externalChannelBindingSetupStore.ts:getCapabilitySnapshot() [STATE]
    ├── /Users/normy/autobyteus_org/autobyteus-web/stores/externalChannelBindingSetupStore.ts:getReadinessSnapshot() [STATE]
    ├── /Users/normy/autobyteus_org/autobyteus-web/stores/externalMessagingSetupStore.ts:mergeReadiness(...) [STATE]
    └── /Users/normy/autobyteus_org/autobyteus-web/stores/externalMessagingSetupStore.ts:setVerificationResult(result) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] non-ready setup
/Users/normy/autobyteus_org/autobyteus-web/stores/externalMessagingSetupStore.ts:mergeReadiness(...)
└── produce blockers list + recommended actions # includes SERVER_BINDING_API_UNAVAILABLE when capability disabled [STATE]
```

```text
[ERROR] unexpected store state
/Users/normy/autobyteus_org/autobyteus-web/stores/externalMessagingSetupStore.ts:runSetupVerification()
└── set verification error message and keep prior step states [STATE]
```

### State And Data Transformations

- Store snapshots -> verification result model `{ ready, blockers[], checkedAt }`.

### Observability And Debug Points

- Verification run count and failure distribution.
- Blocker category histogram (`gateway`, `session`, `binding`).

### Design Smells / Gaps

- None in current setup-only design.

### Open Questions

- None for phase 1.

### Verification Checklist (Per Use Case)

- End-to-end path achieves expected outcome: **Yes**
- Separation of concerns looks clean: **Yes**
- Boundaries/API ownership are clear: **Yes**
- Dependency flow is reasonable (no accidental cycle/leaky cross-reference): **Yes**
- Major smell detected: **No**

---

## Runtime Simulation Result

- Setup-only flow is coherent and debug-trace complete for all in-scope web use cases.
- No major separation-of-concern smell detected in proposed file boundaries.
- No unresolved design ambiguity remains for phase-1 implementation.
