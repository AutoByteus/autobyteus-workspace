# Proposed-Design-Based Runtime Call Stacks (Debug-Trace Style)

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags: `[ENTRY]`, `[ASYNC]`, `[STATE]`, `[IO]`, `[FALLBACK]`, `[ERROR]`

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v18`
- Source Artifact: `tickets/codex-runtime-server-owned-redesign/proposed-design.md`
- Source Design Version: `v18`
- Referenced Sections: Target State, Change Inventory C-001..C-047, Use-Case Coverage Matrix UC-001..UC-008

## Future-State Modeling Rule (Mandatory)

- This document models target runtime-adapter architecture, not current local-runtime-only implementation.

## Use Case Index

- UC-001: Create run with runtime kind selection
- UC-002: Send turn on active run via command ingress
- UC-003: Continue inactive run via migrated runtime reference + active override policy
- UC-004: Stop generation via runtime interrupt
- UC-005: Tool approval/denial via command ingress
- UC-006: Runtime event normalization to websocket stream + envelope identity + pre-connect policy
- UC-007: Runtime-scoped model listing/reload/preload
- UC-008: Runtime transport/session failure handling

---

## Use Case: UC-001 Create run with runtime kind selection

### Primary Runtime Call Stack

```text
[ENTRY] src/api/graphql/types/agent-run.ts:sendAgentUserInput(...)
├── src/agent-execution/services/agent-run-manager.ts:createAgentRun(input)
│   ├── src/runtime-execution/runtime-composition-service.ts:createRun(input)
│   │   ├── src/runtime-management/runtime-kind.ts:normalizeRuntimeKind(input.runtimeKind)
│   │   ├── src/runtime-execution/runtime-adapter-registry.ts:resolveAdapter(runtimeKind)
│   │   ├── src/runtime-execution/adapters/<selected>-runtime-adapter.ts:createRun(...) [ASYNC]
│   │   └── src/runtime-execution/runtime-session-store.ts:put(runId, session) [STATE]
│   ├── src/run-history/store/run-manifest-store.ts:writeManifest(runId, manifestV2) [IO]
│   └── src/run-history/services/run-history-service.ts:upsertRunHistoryRow(...ACTIVE...) [ASYNC][IO]
└── return runId
```

### Branching / Fallback Paths

```text
[FALLBACK] runtimeKind omitted
runtime-kind.ts:normalizeRuntimeKind(undefined)
└── return configured default runtime kind
```

```text
[ERROR] model unsupported for runtime
adapters/<selected>-runtime-adapter.ts:createRun(...)
└── throw RuntimeCreateError("MODEL_UNAVAILABLE_FOR_RUNTIME")
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

---

## Use Case: UC-002 Send turn on active run via command ingress

### Primary Runtime Call Stack

```text
[ENTRY] src/services/agent-streaming/agent-stream-handler.ts:handleMessage(sessionId, SEND_MESSAGE)
├── src/services/agent-streaming/agent-session-manager.ts:getSession(sessionId)
├── src/runtime-execution/runtime-command-ingress-service.ts:sendTurn({ runId, userMessage }) [ASYNC]
│   ├── src/runtime-execution/runtime-session-store.ts:get(runId) [STATE]
│   ├── src/runtime-execution/runtime-adapter-registry.ts:resolveAdapter(runtimeKind)
│   └── src/runtime-execution/adapters/<selected>-runtime-adapter.ts:sendTurn(runId, userMessage) [ASYNC]
└── return
```

### Branching / Fallback Paths

```text
[ERROR] run session missing
runtime-command-ingress-service.ts:sendTurn(...)
└── throw RuntimeSessionNotFoundError
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

---

## Use Case: UC-003 Continue inactive run via migrated runtime reference + active override policy

### Primary Runtime Call Stack

```text
[ENTRY] src/run-history/services/run-continuation-service.ts:continueRun(input)
├── src/agent-execution/services/agent-run-manager.ts:getAgentRun(runId)
├── [if inactive] src/run-history/store/run-manifest-store.ts:readManifest(runId) [IO]
├── src/run-history/services/runtime-manifest-migration-service.ts:migrateAndValidate(manifest) [STATE]
├── src/runtime-execution/runtime-composition-service.ts:restoreRun(runId, migratedManifest) [ASYNC]
│   ├── runtime-kind.ts:normalizeRuntimeKind(migratedManifest.runtimeKind)
│   ├── runtime-adapter-registry.ts:resolveAdapter(runtimeKind)
│   ├── adapters/<selected>-runtime-adapter.ts:restoreRun(runtimeReference) [ASYNC]
│   └── runtime-session-store.ts:put(runId, restoredSession) [STATE]
├── src/runtime-execution/runtime-command-ingress-service.ts:sendTurn({ runId, userMessage }) [ASYNC]
└── src/run-history/services/run-history-service.ts:upsertRunHistoryRow(...ACTIVE...) [ASYNC][IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] run already active
run-continuation-service.ts:continueRun(...)
├── src/run-history/services/active-run-override-policy.ts:resolveOverrideDecision(currentManifest, overrides)
├── if allowed fields only: ignore or apply allowed non-runtime fields
└── runtime-command-ingress-service.ts:sendTurn(...)
```

```text
[ERROR] active override attempts to change runtime/model reference
active-run-override-policy.ts:resolveOverrideDecision(...)
└── return reject decision -> continueRun throws OVERRIDE_NOT_ALLOWED_FOR_ACTIVE_RUN
```

```text
[ERROR] runtime reference invalid after migration
runtime-manifest-migration-service.ts:migrateAndValidate(...)
└── throw RunResumeError("RUNTIME_REFERENCE_INVALID")
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

---

## Use Case: UC-004 Stop generation via runtime interrupt

### Primary Runtime Call Stack

```text
[ENTRY] src/services/agent-streaming/agent-stream-handler.ts:handleMessage(sessionId, STOP_GENERATION)
├── session-manager.ts:getSession(sessionId)
├── runtime-command-ingress-service.ts:interruptRun({ runId, turnId? }) [ASYNC]
│   ├── runtime-session-store.ts:get(runId) [STATE]
│   ├── runtime-adapter-registry.ts:resolveAdapter(runtimeKind)
│   └── adapters/<selected>-runtime-adapter.ts:interruptRun(runId, turnId?) [ASYNC]
└── handler sends deterministic interrupt outcome
```

### Branching / Fallback Paths

```text
[ERROR] no active run session
runtime-command-ingress-service.ts:interruptRun(...)
└── return outcome "not_found"
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

---

## Use Case: UC-005 Tool approval/denial via command ingress

### Primary Runtime Call Stack

```text
[ENTRY] src/services/agent-streaming/agent-team-stream-handler.ts:handleMessage(sessionId, APPROVE_TOOL|DENY_TOOL)
├── agent-team-stream-handler.ts:extractToolApprovalToken(payload)
├── runtime-command-ingress-service.ts:approveTool({ runId, token, approved, reason }) [ASYNC]
│   ├── runtime-session-store.ts:get(runId) [STATE]
│   ├── runtime-command-ingress-service.ts:resolveInvocationFromToken(token) [STATE]
│   ├── runtime-adapter-registry.ts:resolveAdapter(runtimeKind)
│   └── adapters/<selected>-runtime-adapter.ts:approveTool(runId, invocationId, approved, reason) [ASYNC]
└── runtime emits approval outcome + next events
```

### Branching / Fallback Paths

```text
[ERROR] invalid or stale approval token
runtime-command-ingress-service.ts:resolveInvocationFromToken(...)
└── throw RuntimeApprovalError("INVOCATION_NOT_FOUND")
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

---

## Use Case: UC-006 Runtime event normalization to websocket stream + envelope identity + pre-connect policy

### Primary Runtime Call Stack

```text
[ENTRY] src/api/websocket/agent.ts:registerAgentWebsocket(...)
├── websocket route initializes pending sessionId = null
├── async connect handler resolves session
└── message handler branch
    ├── if sessionId exists:
    │   └── src/services/agent-streaming/agent-stream-handler.ts:handleMessage(...)
    └── else:
        └── send protocol ERROR { code: "SESSION_NOT_READY" }
```

```text
[ENTRY] src/services/agent-streaming/agent-stream-handler.ts:connect(connection, runId, sessionId)
├── runtime-event-subscriber-hub.ts:subscribePending({ runId, sessionId, connection, mode: "buffer_live" }) -> connectAttemptId [STATE]
├── try [phase: replay+activate]
│   ├── runtime-event-catchup-service.ts:replayFromSequence({ runId, sessionId, connectAttemptId, afterSequence? }) [ASYNC][IO]
│   │   ├── run-history-service.ts:readRuntimeEventsAfter(runId, afterSequence?, { includeHighWatermark: true }) [IO]
│   │   └── runtime-event-subscriber-hub.ts:sendToSession(sessionId, replayMessage) [ASYNC]
│   └── runtime-event-subscriber-hub.ts:activateAfterReplay({ sessionId, connectAttemptId, replayHighWatermark }) [STATE]
│       └── drains buffered live events where sequence > replayHighWatermark before switching to live passthrough
├── catch replay/activation error
│   ├── runtime-event-subscriber-hub.ts:abortConnectSession({ sessionId, connectAttemptId, phase: "pending", reason }) [STATE]
│   └── fail connect with deterministic replay-abort protocol error
├── try [phase: worker-start]
│   └── runtime-run-stream-orchestrator.ts:ensureRunWorker(runId) [ASYNC]
│       ├── [first subscriber only] runtime-session-store.ts:get(runId) [STATE]
│       ├── runtime-adapter-registry.ts:resolveAdapter(runtimeKind)
│       ├── adapters/<selected>-runtime-adapter.ts:streamEvents(runId) [ASYNC]
│       ├── runtime-event-sequence-ledger.ts:initializeFromHistory(runId) [STATE]
│       └── for each runtime event:
│           ├── runtime-event-sequence-ledger.ts:nextSequence(runId) [STATE]
│           ├── runtime-event-envelope-normalizer.ts:normalizeRuntimeEnvelope({ runId, sequence, event }) [STATE]
│           ├── run-history-service.ts:onRuntimeEvent(runId, normalizedEnvelope) [ASYNC][IO]
│           ├── runtime-event-message-mapper.ts:mapRuntimeEventToServerMessage(normalizedEnvelope)
│           └── runtime-event-subscriber-hub.ts:broadcast(runId, serverMessage) [ASYNC]
│               └── per-subscriber send isolation (evict failed subscriber only)
└── catch worker-start error
    ├── runtime-event-subscriber-hub.ts:abortConnectSession({ sessionId, connectAttemptId, phase: "active", reason }) [STATE]
    └── fail connect with deterministic worker-start error
```

### Branching / Fallback Paths

```text
[FALLBACK] unknown runtime event type
runtime-event-message-mapper.ts
└── map to protocol ERROR payload with diagnostics
```

```text
[FALLBACK] upstream event id missing
runtime-event-envelope-normalizer.ts:normalizeRuntimeEnvelope(...)
└── synthesize eventId from (runId, sequence) and mark envelope source metadata
```

```text
[FALLBACK] websocket reconnect/new session for same run
runtime-event-catchup-service.ts:replayFromSequence(...)
└── replay persisted missed events + return replay high-watermark, then activation drains buffered live tail and attaches to live worker
```

```text
[FALLBACK] last subscriber disconnects while run is active
runtime-run-stream-orchestrator.ts:onSubscriberCountZero(runId)
└── switch run worker to headless persistence mode (continue normalize+persist, skip broadcast)
```

```text
[ERROR] payload schema mismatch
runtime-event-message-mapper.ts
└── throw RuntimeEventMappingError -> subscriber hub emits protocol ERROR to active subscribers and continues loop; event already persisted
```

```text
[ERROR] run-history receives non-normalized event payload
run-history-service.ts:onRuntimeEvent(...)
└── throw RuntimeEventEnvelopeMismatchError("RUNTIME_EVENT_ENVELOPE_MISMATCH")
```

```text
[ERROR] duplicate run worker acquisition race
runtime-run-stream-orchestrator.ts:ensureRunWorker(runId)
└── lock/CAS acquire fails -> attach caller to existing worker
```

```text
[ERROR] one subscriber socket send fails during broadcast
runtime-event-subscriber-hub.ts:broadcast(runId, serverMessage)
└── catch send error -> evict only failing subscriber -> continue other subscribers
```

```text
[FALLBACK] run reaches terminal runtime status/error
runtime-run-stream-orchestrator.ts:cleanupRunWorker(runId)
└── dispose worker + clear subscriber set + release sequence ledger state
```

```text
[ERROR] headless worker exceeds orphan timeout without terminal signal
runtime-run-stream-orchestrator.ts:onSubscriberCountZero(runId)
└── force cleanupRunWorker(runId) (+ optional interrupt attempt) with diagnostic event
```

```text
[ERROR] reconnect cursor malformed/out-of-range
runtime-event-catchup-service.ts:replayFromSequence(...)
└── send replay cursor error (or replay gap error) and require client full sync fallback
```

```text
[ERROR] pending reconnect buffer exceeds bounded size before activation
runtime-event-subscriber-hub.ts:broadcast(runId, serverMessage)
└── mark session replay overflow -> fail connect with REPLAY_BUFFER_OVERFLOW -> require full sync fallback
```

```text
[ERROR] replay delivery abort during catch-up (socket close/send failure)
runtime-event-catchup-service.ts:replayFromSequence(...)
└── throw REPLAY_DELIVERY_ABORTED -> agent-stream-handler calls abortConnectSession({ connectAttemptId, phase: "pending" }) -> fail connect; client must reconnect
```

```text
[ERROR] worker startup failure after session activation
runtime-run-stream-orchestrator.ts:ensureRunWorker(runId)
└── throw WORKER_START_FAILED -> agent-stream-handler aborts active connect session -> fail connect without active-subscriber leak
```

```text
[ERROR] disconnect/connect-abort race for same session
runtime-event-subscriber-hub.ts:abortConnectSession(...) or unsubscribe(...)
└── stale or already-cleaned connectAttemptId -> idempotent no-op; active newer attempt remains intact
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

---

## Use Case: UC-007 Runtime-scoped model listing/reload/preload

### Primary Runtime Call Stack

```text
[ENTRY] src/api/graphql/types/llm-provider.ts:availableLlmProvidersWithModels(runtimeKind?)
├── runtime-kind.ts:normalizeRuntimeKind(runtimeKind)
├── runtime-model-catalog-service.ts:listModels(runtimeKind) [ASYNC]
│   ├── runtime-model-provider-registry.ts:resolve(runtimeKind)
│   └── providers/<selected>.ts:listModels(...) [ASYNC][IO?]
└── resolver groups and returns provider/model payload
```

```text
[ENTRY] src/api/graphql/types/llm-provider.ts:reloadLlmProviderModels(runtimeKind, provider?)
└── runtime-model-catalog-service.ts:reloadRuntime(runtimeKind, provider?) [ASYNC]
    └── providers/<selected>.ts:reload(...)
```

```text
[ENTRY] src/startup/cache-preloader.ts:preloadCaches(...)
└── runtime-model-catalog-service.ts:preloadAllRuntimes() [ASYNC]
    └── runtime-model-provider-registry.ts:listProviders() -> providers/*.listModels(...)
```

### Branching / Fallback Paths

```text
[FALLBACK] runtimeKind omitted
runtime-kind.ts:normalizeRuntimeKind(undefined)
└── default runtime kind
```

```text
[ERROR] missing runtime provider implementation
runtime-model-provider-registry.ts:resolve(runtimeKind)
└── throw RuntimeModelProviderNotFoundError
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

---

## Use Case: UC-008 Runtime transport/session failure handling

### Primary Runtime Call Stack

```text
[ENTRY] src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts:<stream or command>
├── codex-app-server-client.ts:<network call> [IO]
└── throw transport error
    ├── agent-stream-handler.ts:catch error
    ├── runtime-session-store.ts:delete(runId) [STATE]
    ├── run-history-service.ts:onRuntimeError(runId, details) [ASYNC][IO]
    └── websocket.send(ERROR)
```

### Branching / Fallback Paths

```text
[FALLBACK] transient transport error with retry budget remaining
codex-app-server-runtime-adapter.ts
└── bounded retry then continue
```

```text
[ERROR] retry budget exhausted
codex-app-server-runtime-adapter.ts
└── terminal runtime error + cleanup
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`
