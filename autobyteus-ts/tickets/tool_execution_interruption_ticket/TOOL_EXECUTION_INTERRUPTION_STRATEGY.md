# Design Document

## Summary

Clean-slate target architecture (not constrained by current layout):

- `orchestration/conversation-orchestrator` is the single business-flow owner.
- Inbound adapters only translate external signals into commands.
- Domain services (`llm`, `tools`, `control`) are pure application/domain logic.
- Projections consume domain events for status/notifier/continuation side effects.
- One serialized command queue guarantees deterministic ordering and interrupt safety.

This removes handler-spread business logic and gives strict ownership boundaries.

## Goals

- `Ctrl+C` interrupts active LLM/tool execution without tearing down session memory.
- Pending tool approvals are interruptible.
- Tool-turn completion emits continuation exactly once.
- Zero legacy tool-result/approved-tool dual-path behavior.
- File structure reflects separation-of-concerns by default.

## Non-Goals

- Replacing tool schema/registry definitions in `src/tools`.
- Replacing provider SDKs beyond interrupt-capability wrappers.
- Supporting legacy compatibility layer in final architecture.
- Expanding into exhaustive micro-edge-case handling beyond core interrupt + execution flows.

## Requirements And Use Cases

1. Turn declaration must occur before invocation commands for that turn.
2. Missing turn declaration must reject invocation and emit audit outcome.
3. Auto invocation must execute via module command + settlement flow.
4. Approval-required invocation must emit approval request outcome.
5. Approved decision must execute pending invocation.
6. Denied decision must emit terminal denied outcome from module.
7. Pending-approval interruption must emit interrupted-before-execution outcome.
8. Unknown approval decision must emit stale-approval audit outcome.
9. Mixed outcomes in one turn must finalize exactly once.
10. Only continuation projection may enqueue next user message.
11. Tool result processors must run on terminal tool-call outcomes (settled, denied, interrupted-before-execution).
12. Active tool interruption must work out-of-band, including interrupt-during-start race windows.
13. Active LLM interruption must work out-of-band, including interrupt-during-start race windows.
14. Re-entrant interrupt must return `interrupt_in_progress`.
15. Unsupported interrupt capability must return explicit `unsupported`.
16. Late tool settlement must be stale-dropped.
17. Late LLM stream events after abort must be stale-dropped.
18. Interrupt precedence: interrupted terminal wins over late success.
19. Shutdown stop path must interrupt active execution before wait.
20. Post-interrupt next message must continue normally.
21. Runtime context must not store tool-flow source-of-truth fields.
22. Queue/scheduler must not own tool result business logic.
23. Status derivation must not read pending-approval maps.
24. Idle detection must use orchestrator quiescence API.
25. Legacy approved-tool/tool-result events and handlers must be removed.
26. Turn aggregation must be orchestrator-owned, not handler-owned.

## Primary Acceptance Criterion

- The design is acceptable only if every listed requirement/use case is fulfilled end-to-end by the simulated call stacks.
- Acceptance is binary: `100% covered` or `not accepted`.
- Architectural naming/style preferences are secondary to complete requirement fulfillment.

## Architecture Principles

- Single writer principle: only `conversation-orchestrator` mutates session business state.
- Protocol boundaries: adapters talk to orchestrator through command contracts only.
- Evented side effects: projections subscribe to domain events; domain services never call notifier/status directly.
- Interrupt-first safety: execution-control module can preempt active executions and mark stale gates.
- Non-blocking command queue: long-running LLM/tool work starts asynchronously and settles back as commands/events.
- No legacy retention: final-state only.

## Current State (As-Is)

- Tool flow ownership is spread across handlers, runtime state, queue, and status utilities.
- Execution and continuation logic are duplicated in multiple handlers.
- Legacy events (`ToolResultEvent`, `ApprovedToolInvocationEvent`) still shape behavior.

## Target State (To-Be)

### Top-Level File Structure (Clean-Slate)

```text
src/agent/
  orchestration/
    conversation-orchestrator.ts
    conversation-state.ts
    execution-control-state.ts
    projection-offset-state.ts
    command-queue.ts
    command-types.ts
    domain-event-types.ts
    domain-event-record.ts
    domain-event-hub.ts
    quiescence-service.ts
    execution-completion-gateway.ts
  modules/
    llm-execution/
      llm-turn-runner.ts
      tool-call-extractor.ts
      llm-interrupt-handle-factory.ts
    tool-execution/
      tool-call-coordinator.ts
      tool-runner.ts
      tool-outcome-policy.ts
      turn-completion-policy.ts
      tool-result-processor-pipeline.ts
    execution-control/
      interrupt-coordinator.ts
      active-execution-registry.ts
      execution-intent-registry.ts
      stale-event-gate.ts
      interrupt-handle.ts
  projections/
    continuation-projection.ts
    status-projection.ts
    notification-projection.ts
    projection-checkpoint-store.ts
  adapters/
    inbound/
      user-message-adapter.ts
      tool-approval-adapter.ts
      runtime-control-adapter.ts
    outbound/
      llm-client-adapter.ts
      tool-host-adapter.ts
      notifier-adapter.ts
      scheduler-adapter.ts
  ports/
    inbound/
      agent-command-port.ts
      interrupt-command-port.ts
      system-command-port.ts
    outbound/
      llm-client-port.ts
      tool-host-port.ts
      notifier-port.ts
      scheduler-port.ts
```

### Interaction Model

- Inbound adapters publish `AgentCommand` to `command-queue`.
- Inbound user/approval adapters publish `AgentCommand` to `command-queue`.
- Runtime control adapter uses `interrupt-command-port` fast path (not queued behind long work).
- `command-queue` serializes commands and calls `conversation-orchestrator.handle(command)`.
- Orchestrator starts long-running executions asynchronously and returns immediately.
- Execution completions enter through `execution-completion-gateway` as settlement commands.
- Orchestrator emits `DomainEvent`.
- Projections consume `DomainEvent` and perform side effects (status updates, user continuation enqueue, notifications).
- Execution-control module owns interrupts, stale gates, and active execution registry.
- Execution modules and `execution-completion-gateway` submit follow-up commands through `system-command-port` (not direct `command-queue` concrete dependency).
- Execution-control module tracks execution intents so interrupt requests arriving before handle binding are applied immediately when handle registers.

### Concurrency And Ordering Guarantees

- Only `conversation-orchestrator` mutates `conversation-state` (business state single writer).
- Fast interrupt path (`interrupt-command-port`) can mutate only `execution-control-state` (active handle pointers + interrupt lifecycle flags), never `conversation-state`.
- Any business-visible interrupt effect is reintroduced into the serialized command queue as `ExecutionInterruptedCommand`.
- Execution intents are reserved before async start; if interrupt arrives pre-bind, pending interrupt is attached to intent and enforced on handle bind.
- Tool/LLM settlement callbacks never mutate business state directly; they always go through `execution-completion-gateway -> command-queue`.
- Settlement command processing order is strict within one command transaction:
  `normalize outcome -> run result processor pipeline -> apply turn completion policy -> publish domain events`.
- This same ordering is used for all terminal outcomes (settled, denied, interrupted-before-execution).
- Domain events are published with per-session monotonic sequence numbers (`domain-event-record`) and projections checkpoint consumed sequence to avoid duplicate side effects.
- Continuation projection must call scheduler with deterministic idempotency key (`sessionId:turnId`) so replay/duplicate envelopes cannot duplicate continuation enqueue.
- Quiescence is computed from `conversation-state`, `execution-control-state`, and blocking `projection-offset-state` only (status/continuation lag; not best-effort notification lag).

## Change Inventory (Delta)

| Change ID | Change Type | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Add | N/A | `src/agent/orchestration/conversation-orchestrator.ts` | single ownership of business flow | all flows | aggregate root |
| C-002 | Add | N/A | `src/agent/orchestration/conversation-state.ts` | single source-of-truth business state | tool/turn/approval state | runtime-state decoupling |
| C-003 | Add | N/A | `src/agent/orchestration/command-queue.ts` | deterministic serialized processing | runtime/worker | replaces handler-spread orchestration |
| C-004 | Add | N/A | `src/agent/orchestration/domain-event-hub.ts` | domain-event fanout to projections | status/notifier/continuation | no direct side effects in orchestration |
| C-005 | Add | N/A | `src/agent/modules/llm-execution/llm-turn-runner.ts` | LLM run + tool-call extraction trigger | llm execution | interrupt-aware |
| C-006 | Add | N/A | `src/agent/modules/tool-execution/tool-call-coordinator.ts` | declare/request/approve/deny/pending interrupt | tool lifecycle | command handlers in one place |
| C-007 | Add | N/A | `src/agent/modules/tool-execution/tool-runner.ts` | execute tool and settle result | tool host | outcome normalization entry |
| C-008 | Add | N/A | `src/agent/modules/tool-execution/turn-completion-policy.ts` | exact-once continuation decision | multi-tool turn | deterministic completion |
| C-009 | Add | N/A | `src/agent/modules/execution-control/interrupt-coordinator.ts` | global interrupt workflow | runtime ctrl-c/shutdown | unified control path |
| C-010 | Add | N/A | `src/agent/modules/execution-control/active-execution-registry.ts` | track active LLM/tool handles | interruption | supports re-entrant semantics |
| C-011 | Add | N/A | `src/agent/modules/execution-control/stale-event-gate.ts` | stale drop decisions | late settles/chunks | interrupted-wins guarantee |
| C-012 | Add | N/A | `src/agent/projections/continuation-projection.ts` | enqueue next user message | scheduler | sole continuation owner |
| C-013 | Add | N/A | `src/agent/projections/status-projection.ts` | status transitions from domain events | status manager | no pending-map reads |
| C-014 | Add | N/A | `src/agent/projections/notification-projection.ts` | stream/notifier side effects | notifier | domain logic remains pure |
| C-015 | Add | N/A | `src/agent/adapters/inbound/*.ts` | adapter-only entry translation | transport/runtime | no business logic |
| C-016 | Add | N/A | `src/agent/ports/inbound/agent-command-port.ts` | stable command contract | adapters -> orchestrator | inversion boundary |
| C-017 | Add | N/A | `src/agent/ports/outbound/*.ts` | outbound contracts for llm/tool/notifier/scheduler | modules/projections | testability |
| C-018 | Remove | `src/agent/handlers/approved-tool-invocation-event-handler.ts` | removed | remove duplicate execution path | handlers | mandatory |
| C-019 | Remove | `src/agent/handlers/tool-result-event-handler.ts` | removed | remove legacy continuation ownership | handlers | mandatory |
| C-020 | Remove | `ToolResultEvent`, `ApprovedToolInvocationEvent` legacy contracts | removed | remove legacy event model | events/status/factory | mandatory |
| C-021 | Remove | `pendingToolApprovals`, `activeMultiToolCallTurn` in runtime context/state | removed | move business state to conversation-state | context/runtime | mandatory |
| C-022 | Remove | tool-result queue ownership in queue manager | removed | scheduler is transport only | queue/events | mandatory |
| C-023 | Modify | factory/runtime wiring | orchestrator-driven assembly | compose command queue + orchestrator + projections | composition | no legacy registrations |
| C-024 | Modify | LLM handler path | inbound adapter + llm module | remove direct state mutation | llm flow | declaration via coordinator |
| C-025 | Add | N/A | `src/agent/ports/inbound/interrupt-command-port.ts` | low-latency interrupt fast path | runtime control | avoids queued-interrupt starvation |
| C-026 | Add | N/A | `src/agent/orchestration/execution-completion-gateway.ts` | completion callbacks feed settlement commands | llm/tool async tasks | keeps command queue non-blocking |
| C-027 | Modify | `src/agent/modules/llm-execution/llm-turn-runner.ts` and `src/agent/modules/tool-execution/tool-runner.ts` | same | start async work, do not block orchestrator loop | execution modules | cooperative preemption model |
| C-028 | Add | N/A | `src/agent/orchestration/execution-control-state.ts` | concurrent-safe control state separate from business state | execution-control module | preserves single-writer business rule |
| C-029 | Modify | `src/agent/modules/execution-control/interrupt-coordinator.ts` | same | fast path writes execution-control-state only and emits `ExecutionInterruptedCommand` | execution-control module | no direct business-state mutation |
| C-030 | Modify | `src/agent/orchestration/conversation-orchestrator.ts` and `src/agent/modules/tool-execution/tool-result-processor-pipeline.ts` | same | enforce settlement ordering transaction | orchestration/tool-execution module | processors always precede completion decision |
| C-031 | Add | N/A | `src/agent/orchestration/domain-event-record.ts` | monotonic event sequencing for projection order/idempotency | domain events/projections | deterministic replay-safe side effects |
| C-032 | Add | N/A | `src/agent/projections/projection-checkpoint-store.ts` | per-projection consumed-sequence checkpointing | continuation/status/notification projections | exactly-once side effect guard |
| C-033 | Modify | `src/agent/orchestration/quiescence-service.ts` | same | include execution-control active/inflight state in idle decision | idle detection | prevents false-idle while async work active |
| C-034 | Add | N/A | `src/agent/orchestration/projection-offset-state.ts` | track per-projection lag/backlog against event sequence | quiescence/projections | prevents false idle before projection catch-up |
| C-035 | Add | N/A | `src/agent/ports/inbound/system-command-port.ts` | module-agnostic command dispatch callback for internal follow-up commands | modules/execution-control, modules/tool-execution, execution-completion-gateway | removes direct command-queue dependency |
| C-036 | Modify | `src/agent/orchestration/execution-completion-gateway.ts` and `src/agent/modules/execution-control/interrupt-coordinator.ts` | same | use internal dispatch port for follow-up commands | orchestration/execution-control module | clearer module boundary |
| C-037 | Modify | `src/agent/ports/outbound/scheduler-port.ts` and `src/agent/projections/continuation-projection.ts` | same | idempotent continuation enqueue API | continuation | closes replay duplicate gap |
| C-038 | Add | N/A | `src/agent/modules/execution-control/execution-intent-registry.ts` | reserve intent before handle bind and store pre-bind interrupt requests | execution-control module | closes interrupt-start race window |
| C-039 | Modify | `src/agent/modules/execution-control/interrupt-coordinator.ts` and `src/agent/modules/execution-control/active-execution-registry.ts` | same | apply pending interrupt immediately on handle bind | execution-control module | deterministic race-safe preemption |
| C-040 | Modify | `src/agent/orchestration/conversation-orchestrator.ts` and `src/agent/modules/tool-execution/tool-result-processor-pipeline.ts` | same | use unified terminal-outcome processing order across settled/denied/interrupted paths | orchestration/tool-execution module | req-11 consistency |

## File And Module Breakdown

| Module | Responsibility | Public API | Forbidden Dependencies |
| --- | --- | --- | --- |
| `orchestration/conversation-orchestrator.ts` | command handling + execution-module orchestration | `handle(command)` | notifier/status/queue SDKs |
| `orchestration/conversation-state.ts` | business state only | getters/setters domain-safe | runtime transport objects |
| `orchestration/execution-control-state.ts` | concurrent control metadata only (active handles/interruption lifecycle) | control state APIs | business turn/approval maps |
| `orchestration/projection-offset-state.ts` | projection backlog/sequence lag tracking | lag query APIs | command orchestration logic |
| `orchestration/command-queue.ts` | serialized command execution | `submit(command)` | domain mutation outside orchestrator |
| `orchestration/domain-event-record.ts` | event sequence envelope model | envelope builders | projection side effects |
| `orchestration/execution-completion-gateway.ts` | bridge async completions back to orchestrator commands | `onLlmSettled`, `onToolSettled` | status/notifier direct calls |
| `modules/tool-execution/*` | tool lifecycle + outcomes + completion | module service methods | notifier/status/scheduler |
| `modules/llm-execution/*` | llm turn execution + extraction | `runTurn(...)` | status/notifier direct calls |
| `modules/execution-control/*` | interrupts, active handles, stale gates | `interruptActive(...)` | queue/status direct calls |
| `modules/execution-control/execution-intent-registry.ts` | pre-bind intent lifecycle and pending interrupt markers | `reserveIntent`, `markPendingInterrupt`, `bindHandle` | business turn state |
| `projections/*` | side-effect projection from domain events | `onDomainEvent(event)` | conversation-state mutation |
| `projections/projection-checkpoint-store.ts` | projection idempotency checkpoints | `hasSeen`, `markSeen` | domain-state mutation |
| `adapters/inbound/*` | translate external signals to commands | adapter handle methods | module/domain imports beyond command port |
| `ports/inbound/system-command-port.ts` | internal command dispatch interface | `dispatch(command)` | business logic |
| `ports/*` | interface boundaries | type contracts | concrete runtime classes |

## Dependency Flow And Cross-Reference Risk

| Path | Allowed Flow | Risk | Mitigation |
| --- | --- | --- | --- |
| inbound adapters -> command port -> command queue -> orchestrator | required | low | compile-time imports restricted |
| runtime control adapter -> interrupt-command-port -> interrupt coordinator | required | low | dedicated fast-path contract |
| orchestrator -> execution modules -> domain events | required | medium | keep module APIs minimal and typed |
| async execution completion -> execution-completion-gateway -> command queue | required | medium | standardized settlement command DTOs |
| fast interrupt path -> business-state mutation | forbidden | high | split `execution-control-state` from `conversation-state` |
| domain events -> projections -> outbound ports | required | low | no reverse dependency to orchestration |
| projections -> status/notifier/scheduler adapters | required | low | adapter-only side effects |
| duplicate/replayed domain events -> duplicate side effects | forbidden | medium | monotonic event envelope + projection checkpoint store |
| modules/execution-control or modules/tool-execution -> concrete command-queue dependency | forbidden | medium | use system-command-port |
| continuation replay -> duplicate user continuation enqueue | forbidden | high | scheduler idempotency key (`sessionId:turnId`) |
| interrupt request before handle bind -> lost cancellation | forbidden | high | execution-intent registry + pending interrupt on bind |
| non-blocking projection offset blocks idle forever | forbidden | medium | quiescence only checks blocking projection offset classes |
| any module -> runtime context state maps | forbidden | high | delete legacy fields and APIs |

## Decommission / Cleanup Plan

| Item To Remove | Verification Command/Condition |
| --- | --- |
| `approved-tool-invocation-event-handler.ts` | `rg "ApprovedToolInvocationEventHandler" src/agent` returns none |
| `tool-result-event-handler.ts` | `rg "ToolResultEventHandler" src/agent` returns none |
| `ToolResultEvent` | `rg "ToolResultEvent" src/agent` returns none |
| `ApprovedToolInvocationEvent` | `rg "ApprovedToolInvocationEvent" src/agent` returns none |
| `pendingToolApprovals` + store/retrieve APIs | `rg "pendingToolApprovals|storePendingToolInvocation|retrievePendingToolInvocation" src/agent` returns none |
| `activeMultiToolCallTurn`/`ToolInvocationTurn` orchestration usage | `rg "activeMultiToolCallTurn|ToolInvocationTurn" src/agent` returns none (except pure value type if intentionally retained) |
| tool-result queue ownership | `rg "toolResultInputQueue|enqueueToolResult" src/agent` returns none |

## Error Handling And Edge Cases

- Missing declaration -> audit event only, no execution.
- Unknown approval -> stale audit event.
- Late settlement/chunk after interrupt -> dropped by stale gate.
- Re-entrant interrupt -> deterministic `interrupt_in_progress`.
- Unsupported capability -> deterministic `unsupported`.
- Interrupt precedence -> stale gate blocks late success.

## Migration / Rollout (No Legacy Retention)

1. Build clean-slate orchestration + execution modules + projections + ports.
2. Rewire runtime/factory to command-queue orchestration.
3. Move side effects to projections only.
4. Remove legacy handlers/events/state fields/queues.
5. Validate with call-stack simulations and static cleanup gates.

## Design Feedback Loop Notes

| Date | Finding | Update Applied |
| --- | --- | --- |
| 2026-02-09 | logic spread across handlers/state/queue/status | introduced orchestration+modules+projections architecture |
| 2026-02-09 | interrupt and status concerns cross-coupled | split into execution-control module + status projection |
| 2026-02-09 | continuation ownership ambiguous | continuation projection made sole owner |

## Open Questions

- None blocking this design.
