# Design-Based Runtime Call Stacks (Revised v13)

## Conventions

- Frame format: `path/to/file.ts:functionName(...)`
- `[ENTRY]` inbound boundary
- `[ASYNC]` async boundary
- `[STATE]` state mutation
- `[IO]` outbound event/stream effect
- `[FALLBACK]` guarded fallback branch

## Design Basis

- Scope: `Medium`
- Source Artifact: `/Users/normy/autobyteus_org/autobyteus-ts/tickets/multi_tool_incremental_ui_feedback_ticket/proposed-design.md`
- Referenced Sections:
  - `3) Target Architecture (Clean-Cut)`
  - `5) Separation Of Concerns Contract`
  - `7) Runtime Use-Case Guarantees`

## Use Case Index

- Use Case 1: Auto-execute invocation emits started then succeeded immediately
- Use Case 2: Auto-execute invocation emits started then failed immediately
- Use Case 3: Approval-required invocation emits `TOOL_APPROVAL_REQUESTED`
- Use Case 4: Approve path emits `TOOL_APPROVED` then executes via unified execution handler
- Use Case 5: Deny path emits `TOOL_DENIED` and enqueues normalized denied result
- Use Case 6: Multi-tool turn continuation remains batch-gated
- Use Case 7: Mixed approved+denied invocations still complete one turn
- Use Case 8: Duplicate result does not increase settled count
- Use Case 9: Late duplicate after cleanup is suppressed
- Use Case 10: Queue priority processes result before pending invocation request
- Use Case 11: Stream mapping uses explicit lifecycle event family
- Use Case 12: Legacy `TOOL_INVOCATION_AUTO_EXECUTING` lifecycle path does not exist
- Use Case 13: `TOOL_LOG` is diagnostics-only, not lifecycle authority
- Use Case 14: Unknown invocation result cannot corrupt active turn
- Use Case 15: Completed turn cleanup resets state correctly
- Use Case 16: No denial bypass to direct `LLMUserMessageReadyEvent`
- Use Case 17: Stale or unknown approval decision is ignored safely
- Use Case 18: Turn-mismatched result is ignored and cannot settle active turn
- Use Case 19: Denied invocation is terminal-without-execution-start
- Use Case 20: Recent-settled guard stays bounded without breaking suppression
- Use Case 21: CLI/team stream consumers use explicit lifecycle family (no legacy dependency)

## Use Case 1: Auto-execute invocation emits started then succeeded immediately

```text
[ENTRY] autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts:handle(...)
└── [ASYNC] enqueue PendingToolInvocationEvent(invocation=A)
    └── autobyteus-ts/src/agent/handlers/tool-invocation-request-event-handler.ts:handle(...)
        └── [ASYNC] enqueue ExecuteToolInvocationEvent(A)
            └── autobyteus-ts/src/agent/handlers/tool-invocation-execution-event-handler.ts:handle(...)
                ├── [IO] notifier.emit TOOL_EXECUTION_STARTED(A)
                ├── [ASYNC] tool.execute(...)
                └── [ASYNC] enqueue ToolResultEvent(A success)
                    └── autobyteus-ts/src/agent/handlers/tool-result-event-handler.ts:handle(...)
                        ├── [IO] notifier.emit TOOL_EXECUTION_SUCCEEDED(A)
                        └── [STATE] active turn still incomplete -> return
```

## Use Case 2: Auto-execute invocation emits started then failed immediately

```text
[ENTRY] ExecuteToolInvocationEvent(B)
└── tool-invocation-execution-event-handler executes tool B
    ├── [IO] notifier.emit TOOL_EXECUTION_STARTED(B)
    └── [ASYNC] execution throws -> enqueue ToolResultEvent(B error)
        └── tool-result-event-handler emits TOOL_EXECUTION_FAILED(B)
```

## Use Case 3: Approval-required invocation emits `TOOL_APPROVAL_REQUESTED`

```text
[ENTRY] PendingToolInvocationEvent(C) with autoExecute=false
└── tool-invocation-request-event-handler
    ├── [STATE] AgentRuntimeState.storePendingToolInvocation(C)
    └── [IO] notifier.emit TOOL_APPROVAL_REQUESTED(C)
```

## Use Case 4: Approve path emits `TOOL_APPROVED` then executes via unified execution handler

```text
[ENTRY] ToolExecutionApprovalEvent(C approved=true)
└── tool-execution-approval-event-handler
    ├── [STATE] retrieve pending invocation C
    ├── [IO] notifier.emit TOOL_APPROVED(C)
    └── [ASYNC] enqueue ExecuteToolInvocationEvent(C)
        └── tool-invocation-execution-event-handler starts + executes C
```

## Use Case 5: Deny path emits `TOOL_DENIED` and enqueues normalized denied result

```text
[ENTRY] ToolExecutionApprovalEvent(D approved=false)
└── tool-execution-approval-event-handler
    ├── [STATE] retrieve pending invocation D
    ├── [IO] notifier.emit TOOL_DENIED(D)
    └── [ASYNC] enqueue ToolResultEvent(D denied,error)
        └── tool-result-event-handler counts D toward active turn completion
```

## Use Case 6: Multi-tool turn continuation remains batch-gated

```text
[ENTRY] first ToolResultEvent in turn T
└── tool-result-event-handler
    ├── [STATE] ToolInvocationTurn.settleResult(invocation=A)
    └── turn incomplete -> return

[ENTRY] last ToolResultEvent in turn T
└── tool-result-event-handler
    ├── [STATE] ToolInvocationTurn completion reached
    ├── reorder by expected invocation order
    ├── [ASYNC] enqueue UserMessageReceivedEvent(SenderType.TOOL)
    └── [STATE] clear active tool turn
```

## Use Case 7: Mixed approved+denied invocations still complete one turn

```text
[ENTRY] turn T with invocations [E,F]
├── E approved -> execution result settled
└── F denied -> denied result settled
    └── settled set size reaches expected size -> one continuation dispatch
```

## Use Case 8: Duplicate result does not increase settled count

```text
[ENTRY] ToolResultEvent(invocation=G)
└── settle map adds G once

[ASYNC] duplicate ToolResultEvent(invocation=G)
└── settle map replace/no-size-increase semantics
    └── completion condition unchanged
```

## Use Case 9: Late duplicate after cleanup is suppressed

```text
[ENTRY] turn T completed and cleared
└── [STATE] runtime recent-settled cache includes invocation H

[ASYNC] stale ToolResultEvent(H) arrives
└── tool-result-event-handler consults recent-settled guard
    └── drop stale duplicate, no continuation enqueue
```

## Use Case 10: Queue priority processes result before pending invocation request

```text
[ENTRY] AgentInputEventQueueManager.getNextInputEvent(...)
└── queuePriority order selects toolResultInputQueue before toolInvocationRequestQueue
    └── result event dequeued first
```

## Use Case 11: Stream mapping uses explicit lifecycle event family

```text
[ENTRY] notifier emits EventType.AGENT_TOOL_EXECUTION_SUCCEEDED
└── autobyteus-ts/src/agent/streaming/streams/agent-event-stream.ts:handleNotifierEventSync(...)
    └── StreamEventType.TOOL_EXECUTION_SUCCEEDED with typed lifecycle payload
```

## Use Case 12: Legacy `TOOL_INVOCATION_AUTO_EXECUTING` lifecycle path does not exist

```text
[ENTRY] runtime lifecycle emission path for execution start
└── notifier emits TOOL_EXECUTION_STARTED only
    └── no emission of legacy auto-executing lifecycle event
```

## Use Case 13: `TOOL_LOG` is diagnostics-only, not lifecycle authority

```text
[ENTRY] tool-result-event-handler emits terminal lifecycle for invocation J
[ASYNC] diagnostic TOOL_LOG(J) emitted
└── lifecycle state machine ignores TOOL_LOG for status transitions
```

## Use Case 14: Unknown invocation result cannot corrupt active turn

```text
[ENTRY] ToolResultEvent(invocation=unknownX) while turn expects [K,L]
└── tool-result-event-handler validates invocation membership
    └── [FALLBACK] ignore unknown invocation for completion accounting
```

## Use Case 15: Completed turn cleanup resets state correctly

```text
[ENTRY] ToolInvocationTurn completion true
└── tool-result-event-handler
    ├── [STATE] move settled ids to recent-settled cache
    └── [STATE] activeToolInvocationTurn = null
```

## Use Case 16: No denial bypass to direct `LLMUserMessageReadyEvent`

```text
[ENTRY] ToolExecutionApprovalEvent denied
└── tool-execution-approval-event-handler
    └── enqueue ToolResultEvent(denied)
        └── all continuation dispatches go through tool-result-event-handler barrier
```

## Use Case 17: Stale or unknown approval decision is ignored safely

```text
[ENTRY] ToolExecutionApprovalEvent(invocation=staleY)
└── tool-execution-approval-event-handler
    ├── [STATE] pending lookup misses staleY
    └── [FALLBACK] no-op (optionally diagnostic log), no execution/result enqueue
```

## Use Case 18: Turn-mismatched result is ignored and cannot settle active turn

```text
[ENTRY] active turn id=T2, ToolResultEvent(turnId=T1, invocation=M)
└── tool-result-event-handler
    ├── validate result.turnId against active turn id
    └── [FALLBACK] mismatch -> ignore for settlement/completion
```

## Use Case 19: Denied invocation is terminal-without-execution-start

```text
[ENTRY] ToolExecutionApprovalEvent(N denied)
└── tool-execution-approval-event-handler emits TOOL_DENIED(N)
    └── enqueue denied ToolResultEvent(N)
        └── no TOOL_EXECUTION_STARTED(N) emission on this path
```

## Use Case 20: Recent-settled guard stays bounded without breaking suppression

```text
[ENTRY] tool-result-event-handler completes many turns over time
└── AgentRuntimeState.recentSettledCache
    ├── [STATE] insert settled IDs with timestamp
    ├── [STATE] evict by capacity (LRU) and TTL
    └── stale duplicate within retention still suppressed; old entries safely expire
```

## Use Case 21: CLI/team stream consumers use explicit lifecycle family (no legacy dependency)

```text
[ENTRY] AgentEventStream emits StreamEventType.TOOL_EXECUTION_STARTED
├── src/cli/agent/cli-display.ts:handleStreamEvent(...) renders per-invocation started state
├── src/cli/agent-team/widgets/focus-pane-history.ts:renderHistoryLines(...) renders started status line
└── src/cli/agent-team/state-store.ts:processEventRecursively(...) tracks lifecycle/pending status without legacy auto-executing branch
```
