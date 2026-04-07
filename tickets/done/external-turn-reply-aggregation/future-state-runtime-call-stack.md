# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v1`
- Requirements: `tickets/in-progress/external-turn-reply-aggregation/requirements.md` (status `Design-ready`)
- Source Artifact: `tickets/in-progress/external-turn-reply-aggregation/proposed-design.md`
- Source Design Version: `v1`
- Referenced Sections:
  - Spine inventory sections: `DS-001`, `DS-002`, `DS-003`
  - Ownership sections: `Ownership Map`, `Proposed Behavior`

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001, DS-002, DS-003 | Primary End-to-End | `AcceptedReceiptRecoveryRuntime` | Requirement | R-001, R-002, R-003, R-004 | N/A | Active accepted turn with multiple LLM legs and tool calls | Yes/Yes/Yes |
| UC-002 | DS-001, DS-003 | Primary End-to-End | `AcceptedReceiptRecoveryRuntime` | Requirement | R-001, R-003, R-004, R-005 | N/A | Accepted turn falls back to persisted recovery after live observation is unavailable or unresolved | Yes/Yes/Yes |
| UC-003 | DS-001 | Primary End-to-End | `AcceptedReceiptRecoveryRuntime` | Requirement | R-001, R-004, R-005 | N/A | Single-leg or already-completed turn still publishes once | Yes/N/A/Yes |

## Transition Notes

- No protocol migration is required.
- The change is control-flow reordering inside accepted receipt recovery.
- Existing early persisted publish behavior is retired rather than preserved behind a compatibility switch.

## Use Case: UC-001 Active accepted turn with multiple LLM legs and tool calls

### Spine Context

- Spine ID(s): `DS-001`, `DS-002`, `DS-003`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `AcceptedReceiptRecoveryRuntime`
- Why This Use Case Matters To This Spine: This is the core user-visible failure mode.
- Why This Spine Span Is Long Enough: It starts at accepted receipt orchestration, crosses live observation and accumulation, and ends at final external callback enqueue.

### Goal

Publish one final external reply containing the full same-turn assistant-visible text after the turn completes.

### Preconditions

- Receipt is in `ACCEPTED`.
- `agentRunId` and `turnId` are known.
- Agent run is resolvable and can be observed.

### Expected Outcome

- Live observation accumulates same-turn content across pre-tool and post-tool LLM legs.
- No persisted partial reply is published while observation is active.
- Exactly one callback is enqueued when the turn is complete.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-recovery-runtime.ts:registerAcceptedReceipt(receipt)
└── autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-recovery-runtime.ts:processReceipt(key) [ASYNC]
    ├── autobyteus-server-ts/src/external-channel/services/channel-message-receipt-service.ts:getReceiptByExternalMessage(...) [IO]
    ├── autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-recovery-runtime.ts:tryStartLiveObservation(receipt) [ASYNC]
    │   ├── autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts:resolveAgentRun(...) [IO]
    │   └── autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-reply-bridge.ts:observeAcceptedTurnToSource(...) [ASYNC]
    │       └── autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-reply-bridge.ts:handleRuntimeEvent(...) [ASYNC]
    │           ├── autobyteus-server-ts/src/external-channel/runtime/channel-reply-bridge-support.ts:mergeAssistantText(...) [STATE]
    │           ├── autobyteus-server-ts/src/external-channel/runtime/channel-reply-bridge-support.ts:mergeAssistantText(...) [STATE]
    │           └── autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-reply-bridge.ts:publishPendingTurnReply(...) [ASYNC] # after TURN_COMPLETED
    ├── autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-recovery-runtime.ts:handleObservationResult(receipt, result) [ASYNC]
    └── autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-recovery-runtime.ts:publishReply(receipt, reply) [ASYNC]
        ├── autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts:publishAssistantReplyToSource(...) [ASYNC]
        │   └── autobyteus-server-ts/src/external-channel/runtime/gateway-callback-outbox-store.ts:enqueueOrGet(...) [IO]
        └── autobyteus-server-ts/src/external-channel/services/channel-message-receipt-service.ts:markReplyPublished(...) [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] if live observation is already pending on a retry tick
accepted-receipt-recovery-runtime.ts:processReceipt(...)
└── accepted-receipt-recovery-runtime.ts:scheduleProcessing(...) [STATE]
```

```text
[ERROR] if observation fails
channel-agent-run-reply-bridge.ts:handleRuntimeEvent(...)
└── accepted-receipt-recovery-runtime.ts:scheduleProcessing(...) [STATE]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 Accepted turn falls back to persisted recovery after live observation is unavailable or unresolved

### Spine Context

- Spine ID(s): `DS-001`, `DS-003`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `AcceptedReceiptRecoveryRuntime`
- Why This Use Case Matters To This Spine: Preserves startup recovery and retry behavior without premature publication.
- Why This Spine Span Is Long Enough: It still spans accepted receipt orchestration through final callback enqueue even though the text source changes.

### Goal

Allow persisted reply recovery only after live observation cannot provide the reply.

### Preconditions

- Receipt is in `ACCEPTED`.
- Known `turnId` exists.
- Live observation cannot start, times out, or closes without a reply.

### Expected Outcome

- Runtime retries the receipt.
- Persisted recovery resolves the final turn reply only after the live path is unavailable or unresolved.
- Final publish still uses one callback idempotency key and routes the receipt once.

### Primary Runtime Call Stack

```text
[ENTRY] accepted-receipt-recovery-runtime.ts:processReceipt(key)
├── channel-message-receipt-service.ts:getReceiptByExternalMessage(...) [IO]
├── accepted-receipt-recovery-runtime.ts:tryStartLiveObservation(receipt) [ASYNC]
│   └── accepted-receipt-recovery-runtime.ts:scheduleProcessing(...) [STATE] # live path unavailable or unresolved
├── accepted-receipt-recovery-runtime.ts:tryPublishPersistedReply(receipt) [ASYNC] [FALLBACK]
│   └── channel-turn-reply-recovery-service.ts:resolveReplyText(...) [IO]
└── accepted-receipt-recovery-runtime.ts:publishReply(receipt, reply) [ASYNC]
    ├── reply-callback-service.ts:publishAssistantReplyToSource(...) [ASYNC]
    └── channel-message-receipt-service.ts:markReplyPublished(...) [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] if persisted reply still missing
accepted-receipt-recovery-runtime.ts:tryPublishPersistedReply(...)
└── accepted-receipt-recovery-runtime.ts:scheduleProcessing(...) [STATE]
```

```text
[ERROR] if callback publish reports missing binding
accepted-receipt-recovery-runtime.ts:publishReply(...)
└── channel-message-receipt-service.ts:markIngressUnbound(...) [IO]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-003 Single-leg or already-completed turn still publishes once

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `AcceptedReceiptRecoveryRuntime`
- Why This Use Case Matters To This Spine: Prevents regressions on normal non-tool or already-finished turns.
- Why This Spine Span Is Long Enough: It still begins at receipt orchestration and ends at callback enqueue and receipt routing.

### Goal

Preserve successful publication for turns that do not require multi-leg accumulation.

### Preconditions

- Receipt is in `ACCEPTED`.
- Turn reply is complete by the time recovery evaluates it.

### Expected Outcome

- Runtime publishes once.
- Dedupe and receipt lifecycle continue to behave identically.

### Primary Runtime Call Stack

```text
[ENTRY] accepted-receipt-recovery-runtime.ts:processReceipt(key)
├── channel-message-receipt-service.ts:getReceiptByExternalMessage(...) [IO]
├── accepted-receipt-recovery-runtime.ts:tryStartLiveObservation(receipt) [ASYNC]
│   └── channel-agent-run-reply-bridge.ts:publishPendingTurnReply(...) [ASYNC]
└── accepted-receipt-recovery-runtime.ts:publishReply(receipt, reply) [ASYNC]
    ├── reply-callback-service.ts:publishAssistantReplyToSource(...) [ASYNC]
    └── channel-message-receipt-service.ts:markReplyPublished(...) [IO]
```

### Branching / Fallback Paths

```text
[ERROR] if callback enqueue reports duplicate
reply-callback-service.ts:publishAssistantReplyToSource(...)
└── accepted-receipt-recovery-runtime.ts:publishReply(...) # treats duplicate as handled and routes receipt once
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
