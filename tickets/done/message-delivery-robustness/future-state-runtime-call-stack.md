# Future-State Runtime Call Stacks (Debug-Trace Style)

Use this document as a future-state (`to-be`) execution model derived from the design basis.
Prefer exact `file:function` frames, explicit branching, and clear state/persistence boundaries.
Do not treat this document as an as-is trace of current code behavior.

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint (API/CLI/event)
  - `[ASYNC]` async boundary (`await`, queue handoff, callback)
  - `[STATE]` in-memory mutation
  - `[IO]` file/network/database/cache IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v3`
- Requirements: `tickets/in-progress/message-delivery-robustness/requirements.md` (status `Refined`)
- Source Artifact: `tickets/in-progress/message-delivery-robustness/proposed-design.md`
- Source Design Version: `v3`
- Referenced Sections: `Target State`, `Change Inventory`, `Error Handling And Edge Cases`

## Future-State Modeling Rule (Mandatory)

- Model target design behavior even when current code diverges.
- If migration from as-is to to-be requires transition logic, describe that logic in `Transition Notes`; do not replace the to-be call stack with current flow.

## Use Case Index (Stable IDs)

| use_case_id | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Requirement | R-001, R-004 | N/A | Queue outbound reply and hand it off to gateway | Yes/N/A/Yes |
| UC-002 | Requirement | R-001, R-002, R-005 | N/A | Retry queued reply while gateway is down and recover later | Yes/Yes/Yes |
| UC-003 | Requirement | R-002, R-004, R-005 | N/A | Exhaust retries and dead-letter the callback | Yes/N/A/Yes |
| UC-004 | Requirement | R-003 | N/A | Deduplicate repeated callback processing | Yes/N/A/Yes |
| UC-005 | Requirement | R-006 | N/A | Restart managed gateway after unexpected exit | Yes/N/A/Yes |
| UC-006 | Requirement | R-007 | N/A | Restart managed gateway after heartbeat/liveness stall | Yes/Yes/Yes |

## Transition Notes

- Any temporary migration behavior needed to reach target state: none.
- Retirement plan for temporary logic (if any): none.

## Use Case: UC-001 [Queue outbound reply and hand it off to gateway]

### Goal

Accept a generated reply for external delivery without depending on immediate gateway availability, then let the worker hand it off to the gateway queue.

### Preconditions

- A source receipt exists for the turn.
- Callback delivery is configured (`AVAILABLE` or `UNAVAILABLE`, but not `DISABLED`).
- No prior callback idempotency reservation exists for the same callback key.

### Expected Outcome

- A delivery event exists in `PENDING`.
- A callback outbox record exists in `PENDING`.
- The worker POSTs the callback envelope to the gateway and marks the record `SENT` once the gateway returns success.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-customization/processors/response-customization/external-channel-assistant-reply-processor.ts:processResponse(...)
├── autobyteus-server-ts/src/external-channel/runtime/gateway-callback-delivery-runtime.ts:buildDefaultReplyCallbackService()
├── autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts:publishAssistantReplyByTurn(...) [ASYNC]
│   ├── autobyteus-server-ts/src/external-channel/runtime/gateway-callback-dispatch-target-resolver.ts:resolveGatewayCallbackDispatchTarget(...) [ASYNC]
│   ├── autobyteus-server-ts/src/external-channel/services/channel-message-receipt-service.ts:getSourceByAgentRunTurn(...) [IO]
│   ├── autobyteus-server-ts/src/external-channel/services/channel-binding-service.ts:isRouteBoundToTarget(...) [IO]
│   ├── autobyteus-server-ts/src/external-channel/services/callback-idempotency-service.ts:reserveCallbackKey(...) [IO]
│   ├── autobyteus-server-ts/src/external-channel/services/delivery-event-service.ts:recordPending(...) [IO]
│   └── autobyteus-server-ts/src/external-channel/runtime/gateway-callback-outbox-service.ts:enqueueOrGet(...) [IO]
└── autobyteus-server-ts/src/external-channel/runtime/gateway-callback-dispatch-worker.ts:runOnce() [ASYNC]
    ├── autobyteus-server-ts/src/external-channel/runtime/gateway-callback-outbox-service.ts:leaseBatch(...) [IO]
    ├── autobyteus-server-ts/src/external-channel/runtime/gateway-callback-dispatch-target-resolver.ts:resolveGatewayCallbackDispatchTarget(...) [ASYNC]
    ├── autobyteus-server-ts/src/external-channel/runtime/gateway-callback-publisher.ts:publish(...) [IO]
    ├── autobyteus-server-ts/src/external-channel/runtime/gateway-callback-outbox-service.ts:markSent(...) [IO]
    └── autobyteus-server-ts/src/external-channel/services/delivery-event-service.ts:recordSent(...) [IO]
```

### Branching / Fallback Paths

```text
[ERROR] if callback delivery is disabled
autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts:publishAssistantReplyByTurn(...)
└── return { published: false, duplicate: false, reason: "CALLBACK_NOT_CONFIGURED", envelope: null }
```

### State And Data Transformations

- Reply processor output -> external reply text + metadata.
- Source receipt + reply content -> `ExternalOutboundEnvelope`.
- Envelope + callback key -> durable outbox record.

### Observability And Debug Points

- Delivery event written at `PENDING` then `SENT`.
- Callback outbox record state transitions: `PENDING -> DISPATCHING -> SENT`.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-module dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-005 [Restart managed gateway after unexpected exit]

### Goal

Recover a server-managed gateway automatically after an unexpected process exit so queued callback work can drain without manual intervention.

### Preconditions

- Managed messaging is enabled.
- The gateway runtime exits unexpectedly.
- The managed gateway service still owns restart responsibility for this runtime.

### Expected Outcome

- The managed service records degraded recovery state instead of remaining indefinitely blocked on first failure.
- A bounded restart timer triggers a new runtime launch attempt.
- Once the gateway becomes healthy again, queued callback outbox records can resume delivery.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-process-supervisor.ts:onExit(...)
└── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:handleProcessExit(...) [ASYNC]
    └── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-supervision.ts:handleProcessExit(...) [ASYNC]
        ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-lifecycle.ts:reconcileReachableRuntime(...) [ASYNC]
        ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-supervision.ts:scheduleManagedRestart(...) [STATE]
        ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-supervision.ts:restartManagedRuntimeNow(...) [ASYNC]
        │   ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-lifecycle.ts:restartActiveRuntime(...) [ASYNC]
        │   └── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-lifecycle.ts:startInstalledRuntime(...) [ASYNC]
        └── autobyteus-server-ts/src/external-channel/runtime/gateway-callback-dispatch-worker.ts:runOnce() [ASYNC]
            ├── autobyteus-server-ts/src/external-channel/runtime/gateway-callback-dispatch-target-resolver.ts:resolveGatewayCallbackDispatchTarget(...) [ASYNC]
            ├── [FALLBACK] while target unavailable -> autobyteus-server-ts/src/external-channel/runtime/gateway-callback-outbox-service.ts:markRetry(...) [IO]
            └── after recovery -> autobyteus-server-ts/src/external-channel/runtime/gateway-callback-publisher.ts:publish(...) [IO]
```

### Branching / Fallback Paths

```text
[ERROR] if restart attempts exceed bounded policy
autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-supervision.ts:restartManagedRuntimeNow(...)
└── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-supervision.ts:writeBlockedRestartState(...) [IO]
```

### State And Data Transformations

- Managed lifecycle state: `RUNNING -> DEGRADED -> STARTING -> RUNNING`.
- Repeated restart failure path: `DEGRADED -> BLOCKED`.
- Callback outbox records remain retryable while the managed runtime is unavailable.

### Observability And Debug Points

- Managed gateway lifecycle message includes unexpected-exit restart context.
- Callback outbox transitions show retry pressure until the runtime returns.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-module dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-006 [Restart managed gateway after heartbeat/liveness stall]

### Goal

Detect a wedged managed gateway that is still present but no longer healthy, then restart it automatically so queued reply callbacks can resume delivery.

### Preconditions

- Managed messaging is enabled.
- The managed service supervision loop is active.
- The gateway runtime reliability endpoint is stale, unhealthy, or reports missing/frozen heartbeats beyond the configured threshold.

### Expected Outcome

- The managed service classifies the runtime as unhealthy instead of leaving it running forever.
- A bounded restart is attempted through the existing managed service boundary.
- Callback work remains queued and retryable until the gateway recovers.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:ensureRuntimeSupervisionLoop() [ASYNC]
└── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-supervision.ts:runRuntimeSupervisionCheck() [ASYNC]
    ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-lifecycle.ts:findReachableRuntime(...) [ASYNC]
    ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-health.ts:readManagedRuntimeReliabilityStatus(...) [STATE]
    ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-health.ts:isHeartbeatStale(...) [STATE]
    ├── [FALLBACK] if runtime healthy -> continue supervision without restart
    └── [ERROR] if runtime unhealthy/stale
        ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-supervision.ts:scheduleManagedRestart(...) [STATE]
        ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-supervision.ts:restartManagedRuntimeNow(...) [ASYNC]
        │   ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-lifecycle.ts:stopTrackedOrReachableRuntime(...) [ASYNC]
        │   └── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-lifecycle.ts:startInstalledRuntime(...) [ASYNC]
        └── autobyteus-server-ts/src/external-channel/runtime/gateway-callback-dispatch-worker.ts:runOnce() [ASYNC]
            ├── autobyteus-server-ts/src/external-channel/runtime/gateway-callback-dispatch-target-resolver.ts:resolveGatewayCallbackDispatchTarget(...) [ASYNC]
            └── autobyteus-server-ts/src/external-channel/runtime/gateway-callback-outbox-service.ts:markRetry(...) [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] if the gateway process still responds but reports critical runtime state
autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-supervision.ts:evaluateManagedRuntimeHealth(...)
└── treat reliability state as unhealthy and restart through the same bounded policy [STATE]
```

```text
[ERROR] if the gateway process is unresponsive during shutdown
autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-lifecycle.ts:stopTrackedOrReachableRuntime(...)
└── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-process-supervisor.ts:stop() [ASYNC]
```

### State And Data Transformations

- Reliability snapshot heartbeat timestamps + lifecycle state -> health classification.
- Healthy runtime: no lifecycle change.
- Unhealthy runtime: `RUNNING -> DEGRADED -> STARTING -> RUNNING` or `BLOCKED`.

### Observability And Debug Points

- Managed lifecycle message identifies heartbeat/liveness-triggered restart.
- Runtime reliability payload shows stale or unhealthy lock/worker state before restart.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-module dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 [Retry queued reply while gateway is down and recover later]

### Goal

Keep a reply durable while the gateway is down or temporarily unavailable, then deliver it once the gateway recovers.

### Preconditions

- A callback outbox record already exists.
- The gateway callback target currently resolves as `UNAVAILABLE`, or publish attempts fail with a retryable error.

### Expected Outcome

- The record cycles through retryable states with increasing `nextAttemptAt`.
- Once the gateway becomes available, the same record is accepted by the gateway and marked `SENT`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/external-channel/runtime/gateway-callback-dispatch-worker.ts:runOnce()
├── autobyteus-server-ts/src/external-channel/runtime/gateway-callback-outbox-service.ts:leaseBatch(...) [IO]
└── autobyteus-server-ts/src/external-channel/runtime/gateway-callback-dispatch-worker.ts:handleRecord(...) [ASYNC]
    ├── autobyteus-server-ts/src/external-channel/runtime/gateway-callback-dispatch-target-resolver.ts:resolveGatewayCallbackDispatchTarget(...) [ASYNC]
    ├── [FALLBACK] if target state = UNAVAILABLE
    │   └── autobyteus-server-ts/src/external-channel/runtime/gateway-callback-outbox-service.ts:markRetry(...) [IO]
    ├── [FALLBACK] if target state = AVAILABLE but publish throws retryable error
    │   ├── autobyteus-server-ts/src/external-channel/runtime/gateway-callback-publisher.ts:publish(...) [IO]
    │   └── autobyteus-server-ts/src/external-channel/runtime/gateway-callback-outbox-service.ts:markRetry(...) [IO]
    └── when target later becomes AVAILABLE
        ├── autobyteus-server-ts/src/external-channel/runtime/gateway-callback-publisher.ts:publish(...) [IO]
        ├── autobyteus-server-ts/src/external-channel/runtime/gateway-callback-outbox-service.ts:markSent(...) [IO]
        └── autobyteus-server-ts/src/external-channel/services/delivery-event-service.ts:recordSent(...) [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] if managed gateway is enabled but not currently running
autobyteus-server-ts/src/external-channel/runtime/gateway-callback-dispatch-target-resolver.ts:resolveGatewayCallbackDispatchTarget(...)
└── return { state: "UNAVAILABLE", reason: "Managed gateway target unavailable." }
```

```text
[ERROR] if worker process exits after leasing
autobyteus-server-ts/src/external-channel/runtime/gateway-callback-outbox-store.ts:leaseBatch(...)
└── expired lease makes the record eligible again on the next worker run [STATE]
```

### State And Data Transformations

- `PENDING` outbox record -> leased `DISPATCHING` record with `leaseToken` and `leaseExpiresAt`.
- Retryable failure -> `FAILED_RETRY` with incremented attempt count and `nextAttemptAt`.

### Observability And Debug Points

- Outbox transition log: `PENDING -> DISPATCHING -> FAILED_RETRY -> DISPATCHING -> SENT`.
- Delivery event stays `PENDING` until the gateway accepts the callback.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-module dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-003 [Exhaust retries and dead-letter the callback]

### Goal

Move a persistently failing callback into an inspectable terminal state after bounded retry attempts.

### Preconditions

- The callback outbox record has already retried.
- The current attempt hits a terminal callback error or exceeds the configured retry budget.

### Expected Outcome

- The outbox record is marked `DEAD_LETTER`.
- The delivery event is marked `FAILED`.
- Attempt count and last error remain available for diagnosis.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/external-channel/runtime/gateway-callback-dispatch-worker.ts:handleRecord(...)
├── autobyteus-server-ts/src/external-channel/runtime/gateway-callback-dispatch-target-resolver.ts:resolveGatewayCallbackDispatchTarget(...) [ASYNC]
├── autobyteus-server-ts/src/external-channel/runtime/gateway-callback-publisher.ts:publish(...) [IO]
└── autobyteus-server-ts/src/external-channel/runtime/gateway-callback-dispatch-worker.ts:handleFailure(...)
    ├── autobyteus-server-ts/src/external-channel/runtime/gateway-callback-outbox-service.ts:markDeadLetter(...) [IO]
    └── autobyteus-server-ts/src/external-channel/services/delivery-event-service.ts:recordFailed(...) [IO]
```

### Branching / Fallback Paths

```text
[ERROR] if callback target is disabled after queueing or publisher returns terminal 4xx
autobyteus-server-ts/src/external-channel/runtime/gateway-callback-dispatch-worker.ts:handleFailure(...)
└── autobyteus-server-ts/src/external-channel/runtime/gateway-callback-outbox-service.ts:markDeadLetter(...) [IO]
```

### State And Data Transformations

- `FAILED_RETRY` record + final failure classification -> `DEAD_LETTER`.
- Delivery event `PENDING` -> `FAILED` with error message.

### Observability And Debug Points

- Outbox record exposes `attemptCount`, `lastError`, `updatedAt`.
- Delivery event exposes failure state separately from queue record state.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-module dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-004 [Deduplicate repeated callback processing]

### Goal

Guarantee that repeated reply-processing attempts for the same callback key do not create duplicate durable work or duplicate gateway delivery.

### Preconditions

- A previous reply callback attempt already reserved the callback idempotency key.

### Expected Outcome

- The second attempt returns `DUPLICATE`.
- No new outbox record is created.
- The original queued or delivered record remains authoritative.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts:publishAssistantReplyByTurn(...)
├── autobyteus-server-ts/src/external-channel/services/callback-idempotency-service.ts:reserveCallbackKey(...) [IO]
└── return { published: false, duplicate: true, reason: "DUPLICATE", envelope: null }
```

### Branching / Fallback Paths

```text
[ERROR] if a duplicate POST still reaches the gateway callback endpoint later
autobyteus-message-gateway/src/http/routes/server-callback-route.ts:registerServerCallbackRoutes(...)
└── autobyteus-message-gateway/src/application/services/outbound-outbox-service.ts:enqueueOrGet(...) [IO] # existing gateway-side dedupe safety net
```

### State And Data Transformations

- Callback idempotency key reservation -> duplicate decision.

### Observability And Debug Points

- Duplicate result returned to caller.
- Existing outbox record remains unchanged.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-module dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
