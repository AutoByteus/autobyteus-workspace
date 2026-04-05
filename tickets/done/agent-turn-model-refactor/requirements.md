# Requirements

## Status

- Current Status: `Refined`
- Scope Classification: `Medium`
- Scope Rationale: the refactor changes runtime terminology, turn ownership, stream payload contracts, and validation coverage across `autobyteus-ts`, plus the downstream cleanup needed to keep `autobyteus-server-ts` and the touched `autobyteus-web` streaming protocol on the same canonical `turnId` / `turn_id` naming.

## Goal / Problem Statement

Refactor `autobyteus-ts` so the durable outer interaction lifecycle is modeled explicitly as an `AgentTurn`, the inner grouped tool-settlement lifecycle is modeled explicitly as a `ToolInvocationBatch`, and streamed segment events expose explicit outer-turn identity while keeping canonical turn naming as `turnId` / `turn_id`. Deliver the implementation, executable validation, docs sync, and handoff artifacts for the main `autobyteus-ts` refactor and the downstream cleanup needed to keep the runtime/stream contract coherent across `autobyteus-server-ts` and the touched `autobyteus-web` frontend streaming protocol.

## Scope Update

- The ticket originally stopped after reviewed architecture artifacts.
- On `2026-04-04`, the user explicitly lifted that hold and approved implementation through handoff.
- On `2026-04-04`, before verifying the Stage 10 handoff, the user clarified that canonical naming must remain `turnId` / `turn_id` and that `agentTurnId` / `agent_turn_id` should be removed from the refactor scope.
- On `2026-04-04`, before verifying the Stage 10 handoff, the user further clarified that segment events should require `turn_id` rather than carrying it only as an optional field injected later in the notifier path.
- On `2026-04-04`, before verifying the Stage 10 handoff, the user further clarified that the touched `autobyteus-web` segment payload types should also declare `turn_id` explicitly so the frontend stream contract stays symmetric with the backend even before the UI uses it.
- The Stage 3 to Stage 5 artifacts must therefore be revised and re-reviewed before source edits continue.

## Out Of Scope

- broad coordinated implementation changes in `autobyteus-server-ts` or `autobyteus-web` beyond the scoped cleanup needed to keep canonical `turnId` / `turn_id` naming coherent and keep the touched frontend segment payload types symmetric with the backend contract
- release, publication, or deployment work outside normal repository finalization
- a storage-schema migration for persisted memory trace JSON beyond the existing `turn_id` representation used by `autobyteus-ts` memory items

## In-Scope Use Cases

- UC-001: create and persist one explicit outer `AgentTurn` for a user-originated interaction cycle.
- UC-002: model one or more inner `ToolInvocationBatch` instances inside a single outer agent turn.
- UC-003: carry explicit outer-turn identity on streamed segment events and tool lifecycle payloads.
- UC-004: keep `MemoryManager` agent-scoped while making turn-local runtime state explicit.
- UC-005: validate the refactor with durable unit/integration coverage and executable Stage 7 evidence.

## Use Case Detail

| use_case_id | Name | Description | Primary/Fallback/Error Coverage Intent |
| --- | --- | --- | --- |
| UC-001 | Outer Agent Turn Lifecycle | One outer `AgentTurn` starts from user-originated input, persists across zero or more tool cycles, and remains the runtime identity for assistant completion. | Primary |
| UC-002 | Inner Tool Invocation Batch Semantics | One LLM response may emit one or many tool invocations that settle as one grouped batch inside the outer turn. | Primary |
| UC-003 | Segment Event Correlation | Streamed segment events and tool lifecycle payloads should expose explicit outer-turn identity without indirect inference from segment IDs. | Primary/Fallback |
| UC-004 | Ownership Boundary Clarity | The runtime should separate turn-local state from agent-scoped memory infrastructure and avoid embedding `MemoryManager` inside each turn. | Primary |
| UC-005 | Validation Coverage | The implemented refactor should be proven through durable tests and executable validation scenarios that cover the outer turn, inner batch, and stream identity behavior. | Primary |

## Requirements

| requirement_id | Description | Acceptance Criteria ID(s) |
| --- | --- | --- |
| R-001 | The outer durable interaction lifecycle must be modeled explicitly as an `AgentTurn` runtime concept instead of an ambiguous loose runtime turn string on `AgentRuntimeState`. | AC-001, AC-002 |
| R-002 | The current inner settlement object must be renamed away from `ToolInvocationTurn` to `ToolInvocationBatch`. | AC-003 |
| R-003 | The runtime must keep `MemoryManager` agent-scoped and must not make it a per-turn dependency. | AC-004 |
| R-004 | Streamed segment events and tool lifecycle payloads must expose explicit outer-turn identity using canonical `turn_id`, and segment events must treat `turn_id` as a required contract rather than an optional late-added field. Runtime/event fields should use canonical `turnId`, and the touched frontend segment payload types should declare that same `turn_id` contract explicitly. | AC-005, AC-006 |
| R-005 | The refactor must remove parallel `agentTurnId` / `agent_turn_id` aliases and misnamed inner-turn runtime names in the changed scope instead of preserving mixed terminology. | AC-002, AC-003, AC-006 |
| R-006 | The change must include durable unit/integration/API-executable validation coverage for the outer turn lifecycle, inner batch settlement, and segment-event correlation behavior. | AC-007 |

## Acceptance Criteria

| acceptance_criteria_id | Requirement ID | Acceptance Criteria Summary |
| --- | --- | --- |
| AC-001 | R-001 | A concrete `AgentTurn` class exists and `AgentRuntimeState` stores `activeTurn` instead of a loose `activeTurnId`. |
| AC-002 | R-001, R-005 | The changed runtime scope no longer uses `ToolInvocationTurn` or `activeToolInvocationTurn`, and the outer-turn runtime identity is no longer represented as a loose `activeTurnId`. |
| AC-003 | R-002, R-005 | The inner settlement object is implemented and referenced as `ToolInvocationBatch`, including single-invocation and multi-invocation batch handling. |
| AC-004 | R-003 | `MemoryManager` remains agent-scoped, and no `AgentTurn` instance owns a `MemoryManager`. |
| AC-005 | R-004 | `SegmentEvent`, `SegmentEventData`, and emitted segment-event payloads expose canonical `turn_id` as a required field. |
| AC-006 | R-004, R-005 | Runtime event, tool lifecycle payload, and touched frontend stream payload models use canonical `turnId` / `turn_id` consistently in the changed scope, and no `agentTurnId` / `agent_turn_id` aliases remain there. |
| AC-007 | R-006 | Durable tests and Stage 7 evidence prove user-input turn creation, tool-batch settlement, preserved outer-turn identity across tool loops, and explicit `turn_id` on segment events. |

## Acceptance Criteria Detail

| acceptance_criteria_id | Verification Intent |
| --- | --- |
| AC-001 | Validate that runtime state creates and stores `AgentTurn` explicitly. |
| AC-002 | Validate that the misnamed inner-turn runtime shape is removed from the changed source scope. |
| AC-003 | Validate grouped batch behavior for one or many tool invocations. |
| AC-004 | Validate that `MemoryManager` remains shared agent infrastructure. |
| AC-005 | Validate that segment-event payloads expose canonical `turn_id` directly and do not represent segment events without it. |
| AC-006 | Validate that runtime/tool lifecycle models and touched frontend stream payloads use canonical `turnId` / `turn_id` naming with no `agentTurnId` / `agent_turn_id` aliases in changed scope. |
| AC-007 | Validate the implemented behavior with durable unit/integration tests plus Stage 7 executable scenarios. |

## Constraints / Dependencies

- Must follow the software-engineering workflow through implementation, validation, code review, docs sync, and handoff.
- Must not edit source code while `workflow-state.md` shows `Code Edit Permission = Locked`.
- Must stay grounded in the approved Stage 3 to Stage 5 design artifacts unless classified re-entry becomes necessary.
- Must avoid backward-compatibility-first runtime naming or alias retention within the changed scope.
- Must preserve the conceptual distinction between one outer `AgentTurn` and zero-or-more inner `ToolInvocationBatch` instances.
- Must keep the persisted memory trace schema stable inside `autobyteus-ts` for this ticket; trace serialization remains `turn_id`, and runtime/stream contracts must align to canonical `turnId` / `turn_id` instead of introducing `agentTurnId` / `agent_turn_id`.
- Must keep segment-event construction honest: if `turn_id` is mandatory in the contract, the implementation must pass `turnId` when building segment events rather than creating incomplete events and mutating them later.
- Must keep the touched frontend websocket segment payload types symmetric with the backend contract by declaring `turn_id` explicitly even if current UI behavior does not depend on it yet.

## Assumptions

- The durable outer turn is agent-scoped and can contain multiple tool invocation batches.
- Stream consumers benefit from explicit outer-turn identity on segment events.
- Segment events are never valid outside the context of one outer turn in the runtime path covered by this ticket.
- The touched frontend stream protocol benefits from symmetric segment payload typing even before turn-aware UI grouping is implemented.
- The current `ToolInvocationTurn` object is an inner settlement/batching construct, not the outer business turn.
- `AgentTurn` should stay a small runtime aggregate rather than absorbing agent-wide memory infrastructure.
- The codebase will be easier to maintain if `AgentTurn` is the type name while `turnId` / `turn_id` stays the canonical field naming across runtime and payload boundaries.

## Open Questions / Risks

- Whether any consumers beyond the touched `autobyteus-server-ts` and `autobyteus-web` surfaces were already updated to `agentTurnId` / `agent_turn_id` and therefore now need cleanup back to `turnId` / `turn_id`.
- Whether additional long-lived docs beyond `turn_terminology.md` need updates once implementation is complete.

## Dependencies

- Investigation evidence in `tickets/done/agent-turn-model-refactor/investigation-notes.md`
- Approved design basis in `tickets/done/agent-turn-model-refactor/proposed-design.md`
- Approved future-state runtime call stacks in `tickets/done/agent-turn-model-refactor/future-state-runtime-call-stack.md`
- Approved Stage 5 review gate in `tickets/done/agent-turn-model-refactor/future-state-runtime-call-stack-review.md`
- Current runtime owners in:
  - `autobyteus-ts/src/agent/context/agent-runtime-state.ts`
  - `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts`
  - `autobyteus-ts/src/agent/handlers/tool-result-event-handler.ts`
  - `autobyteus-ts/src/agent/tool-invocation-turn.ts`
  - `autobyteus-ts/src/agent/streaming/segments/segment-events.ts`
  - `autobyteus-ts/src/agent/streaming/events/stream-event-payloads.ts`
  - `autobyteus-ts/src/memory/memory-manager.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts`
  - `autobyteus-server-ts/src/external-channel/runtime/channel-reply-bridge-support.ts`
  - `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts`
  - `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts`

## Requirement-To-Use-Case Coverage

| requirement_id | Covered Use Case IDs |
| --- | --- |
| R-001 | UC-001, UC-004 |
| R-002 | UC-002, UC-004 |
| R-003 | UC-004 |
| R-004 | UC-003 |
| R-005 | UC-001, UC-002, UC-003, UC-004 |
| R-006 | UC-005 |

## Acceptance-Criteria-To-Scenario Intent

| acceptance_criteria_id | Scenario Intent |
| --- | --- |
| AC-001 | Validate explicit `AgentTurn` creation and storage in runtime state. |
| AC-002 | Validate removal of loose outer-turn and misnamed inner-turn runtime state in changed scope. |
| AC-003 | Validate `ToolInvocationBatch` behavior for single-tool and multi-tool cases. |
| AC-004 | Validate ownership split between `AgentTurn` and `MemoryManager`. |
| AC-005 | Validate required `turn_id` on emitted and parsed segment events. |
| AC-006 | Validate explicit `turnId` propagation across runtime events, tool lifecycle notifications, and touched frontend stream payload types without alias fields. |
| AC-007 | Validate durable unit/integration/API-executable coverage for the implemented refactor. |

## Scope Confirmation

- Confirmed Scope Classification: `Medium`
- Why: the work spans runtime state, handlers, event models, stream payloads, tests, and docs, but remains bounded to one package and one approved architecture direction.
