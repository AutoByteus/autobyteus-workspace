# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Large`
- Call Stack Version: `v6`
- Requirements: `tickets/in-progress/external-channel-receipt-state-machine/requirements.md` (status `Design-ready`)
- Source Artifact: `tickets/in-progress/external-channel-receipt-state-machine/proposed-design.md`
- Source Design Version: `v6`
- Referenced Sections:
  - `Data-Flow Spine Inventory`
  - `Proposed Architecture`
  - `Turn Correlation Strategy`
  - `Receipt-Centric Behavioral Rules`

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope | Governing Owner | Source Type | Requirement ID(s) | Design-Risk Objective | Use Case Name | Coverage Target |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `UC-001` | `DS-001`, `DS-005` | Primary End-to-End | `ReceiptWorkflowRuntime` | Requirement | `R-001`, `R-005`, `R-007`, `R-009` | N/A | Dispatch-known turn binds immediately and publishes once | Primary/Fallback/Error |
| `UC-002` | `DS-001`, `DS-002`, `DS-005` | Primary End-to-End | `ReceiptWorkflowRuntime` | Requirement | `R-001`, `R-003`, `R-004`, `R-006`, `R-008` | N/A | AutoByteus delayed turn is captured authoritatively at the adapter boundary before the receipt enters the accepted workflow | Primary/Fallback/Error |
| `UC-003` | `DS-001`, `DS-003`, `DS-005` | Primary End-to-End | `ReceiptWorkflowRuntime` | Requirement | `R-003`, `R-004`, `R-005` | N/A | Multi-leg tool-using turn finalizes once after full turn completion | Primary/Fallback/Error |
| `UC-004` | `DS-001`, `DS-004`, `DS-005` | Primary End-to-End | `ReceiptWorkflowRuntime` | Requirement | `R-004`, `R-006`, `R-010` | N/A | Restart resumes a bound receipt through known-turn recovery | Primary/Fallback/Error |
| `UC-005` | `DS-001`, `DS-003`, `DS-004`, `DS-005` | Primary End-to-End | `ReceiptWorkflowRuntime` | Requirement | `R-006`, `R-010` | N/A | Missing or deleted run leads to truthful recovery or failure | Primary/Fallback/Error |
| `UC-006` | `DS-001`, `DS-002`, `DS-003`, `DS-005` | Primary End-to-End | `ReceiptWorkflowRuntime` | Requirement | `R-005`, `R-007` | N/A | Team-member dispatch uses the same authoritative adapter-boundary capture model | Primary/Fallback/Error |
| `UC-007` | `DS-001`, `DS-004` | Primary End-to-End | `ReceiptWorkflowRuntime` | Requirement | `R-001`, `R-003`, `R-005` | N/A | Duplicate inbound re-enters the same receipt workflow | Primary/Fallback/Error |
| `UC-008` | `DS-002`, `DS-005` | Design-Risk | `ReceiptWorkflowRuntime` | Design-Risk | `R-006`, `R-008` | Verify the design keeps client-specific correlation out of generic runtime/core events | No core-event pollution | Primary/Fallback/Error |

## Transition Notes

- These are future-state call stacks. Transitional compatibility code is intentionally excluded.
- The active design assumes no legacy accepted-runtime orchestration remains.
- Delayed turn capture belongs to the runtime adapter boundary, not to the generic agent-core event schema.
- Chronology is not represented in the live or degraded turn-binding path.
- Same-run delayed dispatches serialize at the facade boundary before awaiting `TURN_STARTED`, so one capture window owns one accepted dispatch.

## Use Case: UC-001 Dispatch-known turn binds immediately and publishes once

### Goal

When dispatch already knows `turnId`, persist the accepted receipt as `TURN_BOUND` immediately and publish once after finalization.

### Primary Runtime Call Stack

```text
[ENTRY] channel-ingress-service.ts:handleInboundMessage(envelope)
├── channel-message-receipt-service.ts:createPendingIngressReceipt(...) [IO]
├── channel-binding-service.ts:resolveBinding(...) [IO]
├── channel-message-receipt-service.ts:claimIngressDispatch(...) [IO]
├── channel-run-facade.ts:dispatchToBinding(binding, envelope) [ASYNC]
│   └── channel-agent-run-facade.ts:dispatchToAgentBinding(...)
│       ├── activeRun.postUserMessage(message) -> AgentOperationResult(turnId)
│       └── return ChannelRunDispatchResult(agentRunId, turnId, dispatchedAt)
├── channel-message-receipt-service.ts:recordAcceptedDispatch(... turnId ...) [IO]
│   └── receipt persisted as workflowState=TURN_BOUND
└── receipt-workflow-runtime.ts:registerAcceptedReceipt(receipt)
    └── advanceCollectingReceipt(receipt)
        ├── persist LIVE_OBSERVATION_STARTED [IO]
        ├── receipt-effect-runner.ts:startLiveReplyObservation(receipt) [ASYNC]
        └── publish after FINAL_REPLY_READY / TURN_COMPLETED
```

### Fallback / Error Paths

```text
[FALLBACK] if live observation closes with empty reply
advanceCollectingReceipt -> TURN_COMPLETED
└── advanceCompletedReceipt -> recoverFinalReplyText(receipt)
```

```text
[ERROR] if callback publish cannot route the source
publishFinalReply(receipt) -> BINDING_MISSING
└── persist terminal UNBOUND
```

## Use Case: UC-002 AutoByteus delayed turn is captured at the adapter boundary without core-event changes

### Goal

When AutoByteus dispatch does not know `turnId` immediately, capture the delayed turn in the server adapter/client boundary before the receipt is recorded as accepted, without adding external-channel-specific fields to the generic agent-core event schema.

### Primary Runtime Call Stack

```text
[ENTRY] channel-ingress-service.ts:handleInboundMessage(envelope)
├── channel-message-receipt-service.ts:claimIngressDispatch(...) [IO]
├── channel-run-facade.ts:dispatchToBinding(...)
│   └── channel-agent-run-facade.ts:dispatchToAgentBinding(...)
│       ├── channel-dispatch-lock-registry.ts:runExclusive("agent:<runId>") [ASYNC]
│       │   ├── channel-dispatch-turn-capture.ts:startDirectDispatchTurnCapture(...) [ASYNC listener]
│       │   ├── activeRun.postUserMessage(message) -> AgentOperationResult(turnId=null)
│       │   └── await authoritative capture future
│       └── return ChannelRunDispatchResult(agentRunId, turnId, dispatchedAt)
├── channel-message-receipt-service.ts:recordAcceptedDispatch(... turnId ...) [IO]
│   └── receipt persisted as TURN_BOUND
└── receipt-workflow-runtime.ts:registerAcceptedReceipt(receipt)
    └── continue from TURN_BOUND
```

### Fallback / Error Paths

```text
[ERROR] if the dispatch boundary cannot obtain authoritative turn binding
dispatchToBinding(...) fails the dispatch contract
└── receipt remains in dispatching state until retry / expiration policy applies
```

```text
[ERROR] generic agent-core events remain unchanged
no notifier payload enrichment
└── external-channel-specific correlation must not appear in runtime/core event schemas
```

## Use Case: UC-003 Multi-leg tool-using turn finalizes once after full turn completion

### Goal

Keep one receipt active across pre-tool and post-tool assistant legs and publish once after the full turn completes.

### Primary Runtime Call Stack

```text
[ENTRY] receipt already in TURN_BOUND or COLLECTING_REPLY
└── receipt-effect-runner.ts:startLiveReplyObservation(receipt)
    ├── channel-agent-run-reply-bridge.ts:observeAcceptedTurnToSource(...)
    ├── on assistant segment before tool call -> accumulate buffered text for same turnId
    ├── on assistant segment after tool call -> accumulate buffered text for same turnId
    └── on TURN_COMPLETED -> FINAL_REPLY_READY or TURN_COMPLETED
```

### Fallback / Error Paths

```text
[FALLBACK] if buffered live reply is empty at turn completion
advanceCompletedReceipt(receipt)
└── recoverFinalReplyText(receipt)
```

```text
[ERROR] if observation fails transiently
handleLiveObservationResult(CLOSED:ERROR or TIMEOUT)
└── schedule RETRY_TIMER_FIRED for the same receipt
```

## Use Case: UC-004 Restart resumes a bound receipt through known-turn recovery

### Goal

After restart or live-observation loss, recover truthful reply evidence for an already bound turn without restoring any guessed turn-binding logic.

### Primary Runtime Call Stack

```text
[ENTRY] receipt-workflow-runtime.ts:start()
├── listReceiptsByWorkflowStates(nonTerminalStates) [IO]
└── enqueue PROCESS for each active receipt
    └── for TURN_BOUND / COLLECTING_REPLY / TURN_COMPLETED receipt
        └── advanceCollectingReceipt or advanceCompletedReceipt(receipt)
            ├── reattach known-turn observation if the run still exists
            ├── otherwise recover reply text by known turnId [IO]
            └── publish or fail truthfully
```

### Fallback / Error Paths

```text
[FALLBACK] if recovery finds reply text directly
recoverFinalReplyText(receipt)
└── enqueue FINAL_REPLY_READY(replyText)
```

```text
[ERROR] if neither live observation nor known-turn recovery can resolve the reply
advanceCompletedReceipt(receipt)
└── persist WORKFLOW_FAILED
```

## Use Case: UC-005 Missing or deleted run leads to truthful recovery or failure

### Goal

When the run no longer exists, recover if truthful evidence exists; otherwise fail explicitly.

### Primary Runtime Call Stack

```text
[ENTRY] advanceCollectingReceipt(receipt)
└── receipt-effect-runner.ts:startLiveReplyObservation(receipt)
    ├── resolveAgentRun/resolveTeamRun returns null
    └── observation result = RUN_MISSING
        └── receipt-workflow-runtime.ts:enqueue TURN_COMPLETED
            └── advanceCompletedReceipt(receipt)
                ├── recoverFinalReplyText(receipt)
                └── if empty -> WORKFLOW_FAILED("TURN_COMPLETED_WITHOUT_RECOVERABLE_REPLY")
```

## Use Case: UC-006 Team-member dispatch uses the same adapter-boundary capture model

### Goal

Keep the team-member path on the same receipt-owned model as direct runs.

### Primary Runtime Call Stack

```text
[ENTRY] channel-team-run-facade.ts:dispatchToTeamBinding(binding, envelope)
├── channel-dispatch-lock-registry.ts:runExclusive("team:<runId>") [ASYNC]
│   ├── teamRun.postMessage(message, targetMemberName) -> AgentOperationResult(memberRunId, turnId?)
│   ├── if turnId missing -> channel-dispatch-turn-capture.ts awaits delayed turn for the targeted member [ASYNC]
│   └── return ChannelRunDispatchResult(teamRunId, memberRunId, turnId)
├── recordAcceptedDispatch(teamRunId, memberRunId, turnId) [IO]
└── receipt-workflow-runtime
    ├── immediate TURN_BOUND after authoritative binding
    └── later route all observation by (teamRunId, memberRunId, turnId)
```

## Use Case: UC-007 Duplicate inbound re-enters the same receipt workflow

### Goal

Duplicate delivery must never create a second workflow owner for the same external message.

### Primary Runtime Call Stack

```text
[ENTRY] channel-ingress-service.ts:handleInboundMessage(envelope)
├── getReceiptByExternalMessage(...) [IO]
├── existing receipt ingressState=ACCEPTED
└── receipt-workflow-runtime.ts:registerAcceptedReceipt(existing)
    └── enqueue PROCESS on the same receipt key
```

## Use Case: UC-008 No core-event pollution

### Goal

Keep client-specific receipt correlation out of generic runtime/core events.

### Primary Runtime Call Stack

```text
[ENTRY] external-channel delayed-turn design decision
├── delayed turn capture required for AutoByteus
├── capture is hosted in autobyteus-server-ts backend/client helpers
├── generic runtime events remain TURN_STARTED(turnId), segment events, status events
└── receipt workflow consumes adapter-produced facts instead of changing runtime-core payloads
```

### Fallback / Error Paths

```text
[ERROR] if a proposed design requires adding external-channel receipt fields to generic notifier payloads
└── reject the design and return to adapter-boundary capture alternatives
```
