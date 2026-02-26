# Simulated Runtime Call Stacks (Debug-Trace Style)

Simulation basis: clean-slate orchestrator architecture from `TOOL_EXECUTION_INTERRUPTION_STRATEGY.md`.
Frame format: `path/to/file.ts:functionName(...)`.

## Conventions

- `[ENTRY]` external entry
- `[ASYNC]` async boundary
- `[STATE]` state mutation (business/control/projection)
- `[IO]` external side effect
- `[FALLBACK]` branch path

## Use Case Index

- Use Case 1: Declaration-before-invocation ordering
- Use Case 2: Missing declaration rejection
- Use Case 3: Auto invocation flow
- Use Case 4: Approval-required invocation flow
- Use Case 5: Approved decision flow
- Use Case 6: Denied decision flow
- Use Case 7: Pending-approval interruption flow
- Use Case 8: Stale approval decision flow
- Use Case 9: Mixed outcomes exact-once completion
- Use Case 10: Continuation ownership enforcement
- Use Case 11: Terminal tool outcome processor flow
- Use Case 12: Active tool interruption
- Use Case 13: Active LLM interruption
- Use Case 14: Re-entrant/unsupported interrupt branches
- Use Case 15: Late tool settlement stale-drop
- Use Case 16: Late LLM chunk stale-drop
- Use Case 17: Interrupt precedence over late success
- Use Case 18: Shutdown interlock + continuity
- Use Case 19: Runtime context not business source-of-truth
- Use Case 20: Scheduler has no tool-result business logic
- Use Case 21: Idle detection via quiescence service
- Use Case 22: Status projection without pending-map lookup
- Use Case 23: Legacy contracts removed from wiring
- Use Case 24: Handler/adapter concern purity
- Use Case 25: Execution-control boundary purity
- Use Case 26: Turn aggregation ownership purity
- Use Case 27: Single-writer preservation under fast interrupt path
- Use Case 28: Projection idempotency and event-order safety
- Use Case 29: Internal dispatch boundary and quiescence lag safety
- Use Case 30: Interrupt-start race safety (pre-bind intent handling)

---

## Use Case 1: Declaration-before-invocation ordering

```text
[ENTRY] adapters/inbound/user-message-adapter.ts:onUserMessage(...)
└── orchestration/command-queue.ts:submit(UserMessageCommand) [ASYNC]
    └── orchestration/conversation-orchestrator.ts:handle(UserMessageCommand)
        └── modules/llm-execution/llm-turn-runner.ts:startTurn(...) [ASYNC]
            └── modules/tool-execution/tool-call-coordinator.ts:declareTurn(...) [STATE]
```

---

## Use Case 2: Missing declaration rejection

```text
[ENTRY] orchestration/command-queue.ts:submit(ToolInvocationRequestedCommand) [ASYNC]
└── orchestration/conversation-orchestrator.ts:handle(ToolInvocationRequestedCommand)
    └── modules/tool-execution/tool-call-coordinator.ts:requestInvocation(...)
        ├── modules/tool-execution/tool-call-coordinator.ts:validateTurnDeclared(...) -> false [STATE]
        └── orchestration/domain-event-hub.ts:publish(ToolAuditEvent.missingTurnDeclaration) [ASYNC]
```

---

## Use Case 3: Auto invocation flow

```text
[ENTRY] orchestration/command-queue.ts:submit(ToolInvocationRequestedCommand.auto) [ASYNC]
└── orchestration/conversation-orchestrator.ts:handle(ToolInvocationRequestedCommand.auto)
    └── modules/tool-execution/tool-call-coordinator.ts:requestInvocation(auto)
        └── modules/tool-execution/tool-runner.ts:startExecution(invocation) [ASYNC]
            ├── modules/execution-control/active-execution-registry.ts:registerToolHandle(...) [STATE]
            ├── ports/outbound/tool-host-port.ts:execute(...) [IO]
            └── orchestration/execution-completion-gateway.ts:onToolSettled(...) [ASYNC]
                └── ports/inbound/system-command-port.ts:dispatch(ToolSettledCommand) [ASYNC]
```

---

## Use Case 4: Approval-required invocation flow

```text
[ENTRY] orchestration/command-queue.ts:submit(ToolInvocationRequestedCommand.needsApproval) [ASYNC]
└── orchestration/conversation-orchestrator.ts:handle(ToolInvocationRequestedCommand.needsApproval)
    └── modules/tool-execution/tool-call-coordinator.ts:requestInvocation(needsApproval)
        ├── orchestration/conversation-state.ts:pendingApprovals.set(...) [STATE]
        └── orchestration/domain-event-hub.ts:publish(ToolApprovalRequestedEvent) [ASYNC]
            └── projections/notification-projection.ts:onDomainEvent(...) [IO]
```

---

## Use Case 5: Approved decision flow

```text
[ENTRY] adapters/inbound/tool-approval-adapter.ts:onApproval(approved)
└── orchestration/command-queue.ts:submit(ApprovalDecisionCommand) [ASYNC]
    └── orchestration/conversation-orchestrator.ts:handle(...) [STATE]
        ├── modules/tool-execution/tool-call-coordinator.ts:consumePendingApproval(...) [STATE]
        └── modules/tool-execution/tool-runner.ts:startExecution(...) [ASYNC]
```

---

## Use Case 6: Denied decision flow

```text
[ENTRY] adapters/inbound/tool-approval-adapter.ts:onApproval(denied)
└── orchestration/command-queue.ts:submit(ApprovalDecisionCommand.denied) [ASYNC]
    └── orchestration/conversation-orchestrator.ts:handle(ApprovalDecisionCommand.denied)
        ├── modules/tool-execution/tool-outcome-policy.ts:normalizeDenied(...) [STATE]
        ├── modules/tool-execution/tool-result-processor-pipeline.ts:process(deniedOutcome) [ASYNC]
        ├── modules/tool-execution/turn-completion-policy.ts:onOutcome(...) [STATE]
        └── orchestration/domain-event-hub.ts:publish(ToolOutcomeEvent.denied)
```

---

## Use Case 7: Pending-approval interruption flow

```text
[ENTRY] adapters/inbound/runtime-control-adapter.ts:onInterruptPending(invocationId)
└── orchestration/command-queue.ts:submit(InterruptPendingApprovalCommand)
    └── orchestration/conversation-orchestrator.ts:handle(...) [STATE]
        ├── modules/tool-execution/tool-call-coordinator.ts:interruptPendingApproval(...) [STATE]
        ├── modules/tool-execution/tool-result-processor-pipeline.ts:process(interruptedBeforeExecutionOutcome) [ASYNC]
        ├── modules/tool-execution/turn-completion-policy.ts:onOutcome(...) [STATE]
        └── orchestration/domain-event-hub.ts:publish(ToolOutcomeEvent.interruptedBeforeExecution)
```

---

## Use Case 8: Stale approval decision flow

```text
[ENTRY] adapters/inbound/tool-approval-adapter.ts:onApproval(unknownInvocation)
└── orchestration/command-queue.ts:submit(ApprovalDecisionCommand) [ASYNC]
    └── orchestration/conversation-orchestrator.ts:handle(ApprovalDecisionCommand)
        ├── modules/tool-execution/tool-call-coordinator.ts:findPending(invocationId) -> miss [STATE]
        └── orchestration/domain-event-hub.ts:publish(ToolAuditEvent.staleApprovalDecision)
```

---

## Use Case 9: Mixed outcomes exact-once completion

```text
[ENTRY] orchestration/command-queue.ts:submit(ToolSettledCommand or ExecutionInterruptedCommand) [ASYNC]
└── orchestration/conversation-orchestrator.ts:handle(settlement-like command)
    └── modules/tool-execution/tool-call-coordinator.ts:onOutcome(turnId, invocationId, outcome)
        └── modules/tool-execution/turn-completion-policy.ts:accept(...) [STATE]
            ├── compare declared vs terminal sets [STATE]
            └── first-complete -> orchestration/domain-event-hub.ts:publish(TurnCompletedEvent)
```

---

## Use Case 10: Continuation ownership enforcement

```text
[ENTRY] projections/continuation-projection.ts:onDomainEvent(TurnCompletedEvent)
└── ports/outbound/scheduler-port.ts:enqueueUserContinuation(...) [IO]
```

---

## Use Case 11: Terminal tool outcome processor flow

```text
[ENTRY] orchestration/command-queue.ts:submit(ToolSettledCommand) [ASYNC]
└── orchestration/conversation-orchestrator.ts:handle(ToolSettledCommand)
    ├── modules/tool-execution/tool-outcome-policy.ts:normalize(settlement) [STATE]
    ├── modules/tool-execution/tool-result-processor-pipeline.ts:process(outcome) [ASYNC]
    ├── modules/tool-execution/tool-call-coordinator.ts:recordProcessedOutcome(...) [STATE]
    ├── modules/tool-execution/turn-completion-policy.ts:accept(...) [STATE]
    └── orchestration/domain-event-hub.ts:publish(ToolOutcomeProcessedEvent)
```

---

## Use Case 12: Active tool interruption

```text
[ENTRY] adapters/inbound/runtime-control-adapter.ts:onInterruptActive("user_ctrl_c")
└── ports/inbound/interrupt-command-port.ts:interruptActive(...) [ASYNC]
    └── modules/execution-control/interrupt-coordinator.ts:interruptActive(...) [ASYNC]
        ├── modules/execution-control/active-execution-registry.ts:getActiveToolHandle().interrupt(...) [IO]
        └── ports/inbound/system-command-port.ts:dispatch(ExecutionInterruptedCommand) [ASYNC]
            └── orchestration/conversation-orchestrator.ts:handle(ExecutionInterruptedCommand) [STATE]
```

---

## Use Case 13: Active LLM interruption

```text
[ENTRY] adapters/inbound/runtime-control-adapter.ts:onInterruptActive("user_ctrl_c")
└── ports/inbound/interrupt-command-port.ts:interruptActive(...) [ASYNC]
    └── modules/execution-control/interrupt-coordinator.ts:interruptActive(...)
        ├── modules/execution-control/active-execution-registry.ts:getActiveLlmHandle().interrupt(...) [IO]
        ├── modules/llm-execution/llm-turn-runner.ts:onAbort(...) [ASYNC]
        └── ports/inbound/system-command-port.ts:dispatch(ExecutionInterruptedCommand) [ASYNC]
            └── orchestration/conversation-orchestrator.ts:handle(ExecutionInterruptedCommand) [STATE]
```

---

## Use Case 14: Re-entrant/unsupported interrupt branches

```text
[FALLBACK] modules/execution-control/interrupt-coordinator.ts:interruptActive(...)
├── if lifecycle already interrupting -> return interrupt_in_progress
└── if handle.interrupt unsupported -> return unsupported
```

---

## Use Case 15: Late tool settlement stale-drop

```text
[ENTRY] orchestration/execution-completion-gateway.ts:onToolSettled(lateSettlement) [ASYNC]
└── orchestration/command-queue.ts:submit(ToolSettledCommand) [ASYNC]
    └── orchestration/conversation-orchestrator.ts:handle(ToolSettledCommand)
        └── modules/execution-control/stale-event-gate.ts:acceptToolSettlement(...) -> false [STATE]
            └── orchestration/domain-event-hub.ts:publish(ToolAuditEvent.staleOutcomeDropped)
```

---

## Use Case 16: Late LLM chunk stale-drop

```text
[ENTRY] modules/llm-execution/llm-turn-runner.ts:onChunkReceived(...)
└── modules/execution-control/stale-event-gate.ts:acceptLlmChunk(...) -> false [STATE]
    └── drop chunk
```

---

## Use Case 17: Interrupt precedence over late success

```text
[ENTRY] ports/inbound/interrupt-command-port.ts:interruptActive(...) [ASYNC]
└── modules/execution-control/interrupt-coordinator.ts:interruptActive(...) [STATE]

[ASYNC] orchestration/execution-completion-gateway.ts:onToolSettled(lateSuccess) [ASYNC]
└── orchestration/command-queue.ts:submit(ToolSettledCommand)
    └── orchestration/conversation-orchestrator.ts:handle(ToolSettledCommand)
        └── modules/execution-control/stale-event-gate.ts:acceptToolSettlement(...) -> false [STATE]
```

---

## Use Case 18: Shutdown interlock + continuity

```text
[ENTRY] adapters/inbound/runtime-control-adapter.ts:onInterruptActive("user_ctrl_c")
└── ports/inbound/interrupt-command-port.ts:interruptActive(...) [ASYNC]
    └── modules/execution-control/interrupt-coordinator.ts:interruptActive(...)
        └── orchestration/command-queue.ts:submit(ExecutionInterruptedCommand) [ASYNC]

[FALLBACK] user continues after interrupt (no shutdown)
adapters/inbound/user-message-adapter.ts:onUserMessage(next)
└── orchestration/command-queue.ts:submit(UserMessageCommand) [ASYNC]

[FALLBACK] shutdown path
adapters/inbound/runtime-control-adapter.ts:onShutdownRequested()
└── orchestration/command-queue.ts:submit(ShutdownCommand)
    ├── ports/inbound/interrupt-command-port.ts:interruptActive("shutdown_requested") [ASYNC]
    └── orchestration/command-queue.ts:awaitDrain(timeout)
```

---

## Use Case 19: Runtime context not business source-of-truth

```text
[ENTRY] any tool/approval lifecycle command
└── orchestration/conversation-orchestrator.ts:handle(...) [STATE]
    └── orchestration/conversation-state.ts:applyMutation(...) [STATE]
    └── runtime context remains transport/config holder only
```

---

## Use Case 20: Scheduler has no tool-result business logic

```text
[ENTRY] projections/continuation-projection.ts:onDomainEvent(...)
└── ports/outbound/scheduler-port.ts:enqueueUserContinuationIfAbsent(sessionId, turnId, key=sessionId:turnId) [IO]
    └── no tool outcome normalization/aggregation in scheduler layer
```

---

## Use Case 21: Idle detection via quiescence service

```text
[ENTRY] orchestration/command-queue.ts:afterCommandHandled(...)
└── orchestration/quiescence-service.ts:isIdleEligible(conversation-state, execution-control-state, projection-offset-state.blockingOnly) [STATE]
    └── orchestration/domain-event-hub.ts:publish(IdleEligibleEvent)
        └── projections/status-projection.ts:onDomainEvent(...) [IO]
```

---

## Use Case 22: Status projection without pending-map lookup

```text
[ENTRY] projections/status-projection.ts:onDomainEvent(event)
└── derive status from event payload only
    └── ports/outbound/notifier-port.ts:emitStatus(...) [IO]
```

---

## Use Case 23: Legacy contracts removed from wiring

```text
[ENTRY] composition root wiring
└── only command adapters + command queue + orchestrator + projections wired
    └── no ToolResultEvent/ApprovedToolInvocationEvent registrations
```

---

## Use Case 24: Handler/adapter concern purity

```text
[ENTRY] adapters/inbound/user-message-adapter.ts:onUserMessage(...)
└── build command DTO -> orchestration/command-queue.ts:submit(...)
    └── return (no execution/aggregation/business decisions)
```

---

## Use Case 25: Execution-control boundary purity

```text
[ENTRY] modules/tool-execution/tool-runner.ts:startExecution(...)
└── depends on control interfaces (active-execution-registry API), not runtime/adapter concretes

[ENTRY] modules/llm-execution/llm-turn-runner.ts:startTurn(...)
└── depends on control interfaces and stale gate only

[ENTRY] adapters/inbound/runtime-control-adapter.ts:onInterruptActive(...)
└── depends on interrupt-command-port only (no orchestrator/module implementation imports)

[ENTRY] modules/execution-control/interrupt-coordinator.ts:interruptActive(...)
└── mutates orchestration/execution-control-state.ts only; business state updates happen via submitted commands
```

---

## Use Case 26: Turn aggregation ownership purity

```text
[ENTRY] orchestration/conversation-orchestrator.ts:handle(settlement-like command)
└── modules/tool-execution/tool-result-processor-pipeline.ts:process(...) [ASYNC]
    └── modules/tool-execution/turn-completion-policy.ts:accept(...) [STATE]
        └── emits TurnCompletedEvent when complete
            └── no adapter/handler/runtime-state aggregation path exists
```

---

## Use Case 27: Single-writer preservation under fast interrupt path

```text
[ENTRY] ports/inbound/interrupt-command-port.ts:interruptActive(...) [ASYNC]
└── modules/execution-control/interrupt-coordinator.ts:interruptActive(...)
    ├── orchestration/execution-control-state.ts:setInterruptLifecycle(...) [STATE]
    └── ports/inbound/system-command-port.ts:dispatch(ExecutionInterruptedCommand) [ASYNC]
        └── orchestration/conversation-orchestrator.ts:handle(ExecutionInterruptedCommand) [STATE]
```

---

## Use Case 28: Projection idempotency and event-order safety

```text
[ENTRY] orchestration/domain-event-hub.ts:publish(domainEvent)
└── orchestration/domain-event-record.ts:wrapWithSequence(sessionId, seqNo, event) [STATE]
    └── projections/continuation-projection.ts:onDomainEvent(envelope)
        ├── projections/projection-checkpoint-store.ts:hasSeen(seqNo) -> false [STATE]
        ├── ports/outbound/scheduler-port.ts:enqueueUserContinuationIfAbsent(sessionId, turnId, key=sessionId:turnId) [IO]
        └── projections/projection-checkpoint-store.ts:markSeen(seqNo) [STATE]

[FALLBACK] duplicate/replayed envelope
└── projections/projection-checkpoint-store.ts:hasSeen(seqNo) -> true [STATE]
    └── skip side effect
```

---

## Use Case 29: Internal dispatch boundary and quiescence lag safety

```text
[ENTRY] modules/execution-control/interrupt-coordinator.ts:interruptActive(...) OR orchestration/execution-completion-gateway.ts:onToolSettled(...)
└── ports/inbound/system-command-port.ts:dispatch(...) [ASYNC]
    └── orchestration/command-queue.ts:submit(...) [ASYNC]

[ENTRY] orchestration/quiescence-service.ts:isIdleEligible(...)
└── requires blocking projection-offset-state == drained before emitting IdleEligibleEvent
```

---

## Use Case 30: Interrupt-start race safety (pre-bind intent handling)

```text
[ENTRY] orchestration/conversation-orchestrator.ts:handle(UserMessageCommand)
└── modules/execution-control/execution-intent-registry.ts:reserveIntent(intentId) [STATE]
    └── modules/tool-execution/tool-runner.ts:startExecution(...) or modules/llm-execution/llm-turn-runner.ts:startTurn(...) [ASYNC]

[ASYNC] interrupt arrives before handle bind
└── ports/inbound/interrupt-command-port.ts:interruptActive(...)
    └── modules/execution-control/interrupt-coordinator.ts:interruptActive(...)
        └── modules/execution-control/execution-intent-registry.ts:markPendingInterrupt(intentId) [STATE]

[ASYNC] handle eventually binds
└── modules/execution-control/active-execution-registry.ts:bindHandle(intentId, handle) [STATE]
    └── modules/execution-control/execution-intent-registry.ts:hasPendingInterrupt(intentId) -> true [STATE]
        └── handle.interrupt(...) [IO]
```

---

## Requirements Coverage Matrix

| Requirement ID | Covered By Use Case(s) | Status |
| --- | --- | --- |
| 1 | 1 | Covered |
| 2 | 2 | Covered |
| 3 | 3 | Covered |
| 4 | 4 | Covered |
| 5 | 5 | Covered |
| 6 | 6 | Covered |
| 7 | 7 | Covered |
| 8 | 8 | Covered |
| 9 | 9 | Covered |
| 10 | 10 and 28 | Covered |
| 11 | 6 and 7 and 11 | Covered |
| 12 | 12 and 30 | Covered |
| 13 | 13 and 30 | Covered |
| 14 | 14 | Covered |
| 15 | 14 | Covered |
| 16 | 15 | Covered |
| 17 | 16 | Covered |
| 18 | 17 | Covered |
| 19 | 18 | Covered |
| 20 | 18 | Covered |
| 21 | 19 | Covered |
| 22 | 20 | Covered |
| 23 | 22 | Covered |
| 24 | 21 and 29 | Covered |
| 25 | 23 | Covered |
| 26 | 26 | Covered |

---

## Design Smells / Gaps (Current Pass)

- Remaining use-case coverage gaps: None.
- Remaining separation-of-concerns smells in target design: None.
- Implementation risk: medium (large removal/recomposition surface), controlled by decommission gates.

## Completeness Verdict

- Primary criterion: every use case must be fulfilled completely by the modeled call stacks.
- Result in this pass: `PASS (100% use-case fulfillment in scope)`.
