# Proposed Design Document

## Design Version

- Current Version: `v4`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Define explicit outer `AgentTurn`, rename inner transient object to `ToolInvocationBatch`, and align the segment-event contract with outer turn identity | 1 |
| v2 | Requirement-gap re-entry from Stage 10 | Keep `AgentTurn` and `ToolInvocationBatch` as explicit type names, but restore canonical field/payload naming to `turnId` / `turn_id` across the design | 3 |
| v3 | Requirement-gap re-entry from Stage 10 | Tighten the segment-event contract so `turn_id` is mandatory on `SegmentEvent` / `SegmentEventData` and supplied at construction time instead of late mutation | 5 |
| v4 | Requirement-gap re-entry from Stage 10 | Extend the same canonical `turn_id` contract into the touched `autobyteus-web` segment payload types so the frontend stream protocol stays symmetric with the backend | 7 |

## Artifact Basis

- Investigation Notes: `tickets/done/agent-turn-model-refactor/investigation-notes.md`
- Requirements: `tickets/done/agent-turn-model-refactor/requirements.md`
- Requirements Status: `Design-ready`
- Shared Design Principles: `shared/design-principles.md`
- Common Design Practices: `shared/common-design-practices.md`

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. In this template, `module` is not a synonym for one file and not the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Reading Rule

- This document is organized around the data-flow spine inventory first.
- Main domain subject nodes and ownership boundaries are the primary design story.
- Off-spine concerns are described in relation to the spine they serve.
- Existing capability areas/subsystems are reused or extended when they naturally fit an off-spine need.
- Files are the main concrete mapping target for concerns, and subsystems are the broader ownership context.

## Summary

The target architecture introduces an explicit outer `AgentTurn` aggregate for one full agent interaction cycle and renames the current inner `ToolInvocationTurn` settlement object to `ToolInvocationBatch`. `AgentRuntimeState` stops carrying a loose outer turn ID plus a separately named transient "turn" object; instead it holds one active `AgentTurn`, and that aggregate owns turn-local lifecycle state, batch registry, and per-turn sequencing. `MemoryManager` remains agent-scoped infrastructure and consumes outer-turn identity instead of becoming a per-turn dependency. Streamed segment events are aligned with the same outer-turn model by carrying required `turn_id` on every emitted segment event, and streaming producers must construct those events with the active turn instead of mutating them later at the notifier boundary. The touched `autobyteus-web` protocol layer mirrors that contract by declaring `turn_id` on segment payload types explicitly, even though the current UI does not group live segments by turn yet.

## Goal / Intended Change

Clarify the architecture so the runtime has:

- one explicit outer `AgentTurn` for the durable agent interaction cycle
- one or more inner `ToolInvocationBatch` instances inside that turn
- explicit outer-turn identity on segment events using canonical required `turn_id`
- agent-scoped `MemoryManager` ownership rather than per-turn `MemoryManager` ownership
- no remaining runtime class names that call the inner batch a "turn"
- no parallel `agentTurnId` / `agent_turn_id` aliases in the changed scope
- no representable segment-event state without `turn_id` in the changed scope
- touched `autobyteus-web` segment payload types explicitly declare `turn_id` so the live-stream contract is symmetric across backend and frontend

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove loose outer-turn runtime naming (`activeTurnId`), remove the misnamed `ToolInvocationTurn` type, and remove any newly introduced `agentTurnId` / `agent_turn_id` aliases so canonical field naming stays `turnId` / `turn_id`.
- Gate rule: the design is invalid if it preserves the current split of outer durable turn state as an unstructured ID while also keeping the inner batch object named as a turn.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| R-001 | The outer durable interaction lifecycle must be modeled explicitly as an `AgentTurn` instead of a loose runtime turn string on `AgentRuntimeState`. | AC-001, AC-002 | explicit outer turn concept + mapped ownership | UC-001, UC-004 |
| R-002 | The current inner settlement object must be renamed away from `ToolInvocationTurn` to terminology that reflects grouped tool invocations rather than an outer turn. | AC-003 | rename to batch semantics | UC-002, UC-004 |
| R-003 | The future design must define the ownership boundary between the outer turn object and `MemoryManager` without making `MemoryManager` a per-turn object. | AC-004 | keep memory infrastructure agent-scoped | UC-004 |
| R-004 | The future design must define how segment events correlate to the outer agent turn and carry explicit required turn identity using canonical `turn_id`. | AC-005, AC-006 | explicit segment-event turn identity contract with canonical naming | UC-003 |
| R-005 | The future design must remove parallel `agentTurnId` / `agent_turn_id` aliases and keep canonical field naming as `turnId` / `turn_id`. | AC-002, AC-003, AC-006 | one vocabulary across runtime and payloads | UC-001, UC-002, UC-003, UC-004 |
| R-006 | The implementation plan must preserve durable validation coverage for the outer turn, inner batch, and segment correlation behavior after the naming cleanup. | AC-007 | validation remains first-class in the refactor | UC-005 |

## Current-State Read

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Current Spine Or Fragmented Flow | Outer turn lifecycle begins in user-input memory ingest, is reused in LLM handling, and is referenced again in tool-result processing | `autobyteus-ts/src/agent/input-processor/memory-ingest-input-processor.ts`, `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts`, `autobyteus-ts/src/agent/handlers/tool-result-event-handler.ts` | none blocking design |
| Current Ownership Boundaries | `AgentRuntimeState` owns a loose `activeTurnId`; `MemoryManager` owns turn creation and per-turn sequencing; `ToolInvocationTurn` owns batch settlement | `autobyteus-ts/src/agent/context/agent-runtime-state.ts`, `autobyteus-ts/src/memory/memory-manager.ts`, `autobyteus-ts/src/agent/tool-invocation-turn.ts` | whether sequence generation should move into `AgentTurn` |
| Current Coupling / Fragmentation Problems | Two distinct concepts use turn terminology, segment events still allow turn-less instances until the notifier mutates them, the current in-flight refactor introduced `agentTurnId` / `agent_turn_id` aliases that now need to be removed, and the touched frontend segment payload types still omit explicit `turn_id` even though the backend contract now requires it | `autobyteus-ts/src/agent/streaming/segments/segment-events.ts`, `autobyteus-ts/src/agent/streaming/events/stream-event-payloads.ts`, `autobyteus-ts/src/agent/handlers/tool-lifecycle-payload.ts`, `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | how far the alias cleanup and protocol symmetry must propagate across touched downstream consumers |
| Existing Constraints / Compatibility Facts | Docs and downstream memory-facing APIs already align naturally around `turn_id` / `turnId`; the design should keep those canonical names while still making the outer type explicit as `AgentTurn` | `autobyteus-ts/docs/turn_terminology.md` | coordinated cleanup across touched repos only |
| Relevant Files / Components | The refactor spine crosses runtime state, handlers, tool models, streaming payloads, and memory models | investigation notes file set | none blocking design |

## Current State (As-Is)

Today the outer durable turn is not a first-class runtime object. Instead, `AgentRuntimeState` stores `activeTurnId` as a string, and the memory subsystem stores turn-local sequence state in `MemoryManager.seqByTurn`. The inner grouped set of tool invocations is represented by `ToolInvocationTurn`, even though that object only tracks expected invocation IDs plus settled tool results. This creates concept drift:

- the outer durable business turn is implicit
- the inner transient settlement barrier is called a turn
- segment events still permit construction without outer-turn identity even though emitted runtime events belong to one outer turn
- docs already describe the intended inner concept as `ToolInvocationBatch`, but code has not aligned

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | user-originated input enters the agent | assistant response or tool-result continuation completes within one outer turn | `AgentTurn` | defines the outer business turn lifecycle |
| DS-002 | Primary End-to-End | one LLM response emits tool invocations | grouped tool results settle and continuation is released | `ToolInvocationBatch` under `AgentTurn` | defines the inner batch semantics that are currently misnamed |
| DS-003 | Return-Event | segment event is produced during streaming | segment reaches stream consumers with outer-turn identity | `LLMUserMessageReadyEventHandler` as authoritative emission boundary | closes the identity gap for streamed segments |
| DS-004 | Bounded Local | batch receives tool result events | batch records settlement order and completion | `ToolInvocationBatch` | makes the internal settlement loop explicit instead of hiding it inside a generic turn label |

## Primary Execution / Data-Flow Spine(s)

### DS-001

- Arrow chain:
  - `UserMessageReceivedEvent -> MemoryIngestInputProcessor -> AgentRuntimeState.activeTurn -> LLMUserMessageReadyEventHandler -> MemoryManager trace ingestion / assistant completion`
- Short narrative:
  - a user-originated message creates a new outer `AgentTurn`, that same turn stays active while the LLM response is processed, and all memory traces plus final assistant completion are attached to that one turn until the interaction completes
- Main domain subject nodes:
  - user input
  - `AgentTurn`
  - LLM turn execution
  - memory trace ingestion
  - assistant completion
- Governing owner:
  - `AgentTurn`
- Why the span is long enough:
  - it reaches from the initiating surface through runtime ownership and down to the durable downstream memory/assistant consequence instead of stopping at one local handler

### DS-002

- Arrow chain:
  - `LLMUserMessageReadyEventHandler -> AgentTurn.startToolInvocationBatch(...) -> PendingToolInvocationEvent / approval-execution flow -> ToolResultEventHandler -> AgentTurn batch release`
- Short narrative:
  - one LLM response can create one grouped tool batch; the outer turn owns that batch, the batch settles invocation-by-invocation, and continuation is released only when the batch is complete
- Main domain subject nodes:
  - `AgentTurn`
  - `ToolInvocationBatch`
  - tool execution flow
  - tool result settlement
  - continuation release
- Governing owner:
  - `AgentTurn` with internal `ToolInvocationBatch`
- Why the span is long enough:
  - it covers the full grouped tool lifecycle from creation to continuation release, not only the batch-internal settlement map

## Spine Actors / Main-Line Nodes

| Node | Role In Spine | What It Advances |
| --- | --- | --- |
| User input pipeline | initiating surface | starts one outer interaction cycle |
| `AgentTurn` | outer lifecycle owner | provides one explicit turn identity and turn-local invariants |
| `ToolInvocationBatch` | inner grouped settlement owner | groups one LLM-emitted set of tool invocations and gates continuation |
| `MemoryManager` | agent-scoped infrastructure | persists traces, snapshots, and compaction state |
| segment event emission boundary | stream identity boundary | exposes outer-turn identity to stream consumers |

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A user-originated interaction becomes one explicit `AgentTurn`; all user/tool/assistant traces and lifecycle decisions for that cycle route through that aggregate instead of floating as unrelated `turnId` strings. | user input, `AgentTurn`, LLM handling, memory ingestion, assistant completion | `AgentTurn` | `MemoryManager`, `TurnTracker`/ID generation |
| DS-002 | One LLM output may create one inner `ToolInvocationBatch`; that batch settles tool results while the outer `AgentTurn` remains the parent owner and continuation context. | `AgentTurn`, `ToolInvocationBatch`, tool handlers, result barrier | `AgentTurn` | approval flow, execution flow, recent-settled cache |
| DS-003 | Segment events are produced by streaming components with the outer `turnId` already attached, then flow through the emission boundary into the stream payload layer without late mutation. | segment events, emission boundary, stream payloads | `LLMUserMessageReadyEventHandler` | parser/handler internals, stream consumers |

## Ownership Map

| Node / Owner | Owns | Must Not Own | Notes |
| --- | --- | --- | --- |
| `AgentRuntimeState` | active outer turn reference, agent-scoped infra references, pending approvals, caches | per-turn sequencing internals, batch settlement maps, memory persistence logic | becomes the root holder of `activeTurn: AgentTurn | null` |
| `AgentTurn` | outer turn identity, turn-local lifecycle state, turn-local sequence counter, batch registry, active batch reference | storage/compaction/snapshot logic, parser internals, tool execution mechanics | explicit outer business aggregate |
| `ToolInvocationBatch` | expected invocation IDs, settled results, batch completion checks, optional batch identity/index | outer-turn lifecycle, global memory management, stream transport logic | renamed from current `ToolInvocationTurn` |
| `MemoryManager` | trace persistence, snapshot management, compaction, retrieval, turn-ID generation helper if retained | ownership of one outer turn instance, batch settlement state | remains agent-scoped infrastructure |
| streaming parser/handlers | segment parsing and invocation extraction | authoritative outer-turn ownership | turn identity is provided by the runtime when segment events are constructed; parser internals still do not own turn lifecycle |

## Return / Event Spine(s) (If Applicable)

### DS-003

- Arrow chain:
  - `LLM stream chunk -> StreamingResponseHandler / SegmentEvent -> LLMUserMessageReadyEventHandler.emitSegmentEvent -> AgentExternalEventNotifier -> AgentEventStream / consumers`
- Why it matters:
  - this is where outer-turn identity must become explicit for segment consumers without forcing parser internals to own runtime turn state

## Bounded Local / Internal Spines (If Applicable)

### DS-004

- parent owner: `ToolInvocationBatch`
- bounded local spine:
  - `receive ToolResultEvent -> validate membership -> validate turnId -> record settlement -> test completion -> release ordered results`
- why it must be explicit in the design:
  - this is the actual behavior of the current `ToolInvocationTurn`; naming it explicitly as a bounded local batch flow prevents future confusion about the meaning of "turn"

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Serves Which Owner | Responsibility | Must Stay Off Main Line? (`Yes`/`No`) |
| --- | --- | --- | --- |
| `MemoryManager` persistence/snapshot/compaction | `AgentTurn` | store and retrieve traces and working context | Yes |
| `TurnTracker` or equivalent ID generator | `AgentTurn` creation path | generate durable outer-turn IDs | Yes |
| tool approval/execution handlers | `ToolInvocationBatch` | execute or deny concrete invocations | Yes |
| stream payload adapters | segment event emission boundary | serialize internal segment events into stream payloads | Yes |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| outer turn lifecycle aggregate | `src/agent/` runtime model | Create New | outer turn is agent-runtime state, not memory infrastructure or streaming transport | no existing class owns the outer interaction lifecycle cleanly |
| inner batch settlement owner | current `src/agent/tool-invocation-turn.ts` | Extend via Rename | existing behavior already matches batch semantics | a new subsystem is not needed; the current file is conceptually right but misnamed |
| memory persistence/snapshot logic | `src/memory/` | Reuse | already agent-scoped and coherent | new turn-local memory owner would duplicate existing infrastructure |
| segment-event identity propagation | `src/agent/handlers` + `src/agent/streaming` | Extend | emission boundary already exists in the LLM handler and stream payloads already model explicit identity for tool lifecycle events | no separate subsystem is required |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/` runtime model | `AgentTurn`, `ToolInvocationBatch`, invocation/result event identity fields | DS-001, DS-002, DS-004 | agent runtime | Extend + Create New | primary location for outer and inner runtime concepts |
| `autobyteus-ts/src/agent/context/` | runtime state reference to active turn | DS-001, DS-002 | `AgentRuntimeState` | Extend | replace loose `activeTurnId`/`activeToolInvocationTurn` split |
| `autobyteus-ts/src/memory/` | persistence, trace serialization, snapshots, compaction | DS-001 | `MemoryManager` | Reuse | remains infrastructure, not turn-local owner |
| `autobyteus-ts/src/agent/streaming/` | segment/event payload shape | DS-003 | stream emission boundary | Extend | add explicit outer-turn identity to segment payloads |

## Ownership-Driven Dependency Rules

- Allowed dependency directions:
  - `input/handler flow -> AgentTurn`
  - `AgentTurn -> ToolInvocationBatch`
  - `handlers -> MemoryManager`
  - `handlers -> stream payload adapters`
- Authoritative public entrypoints versus internal owned sub-layers:
  - outer turn lifecycle authority is `AgentTurn`
  - inner grouped settlement authority is `ToolInvocationBatch`
  - memory persistence authority is `MemoryManager`
  - segment stream serialization authority is the agent-runtime emission boundary
- Authoritative Boundary Rule per domain subject (no boundary bypass / no mixed-level dependency):
  - callers above the turn subject should depend on `AgentTurn`, not on both `AgentTurn` and one of its internal batches simultaneously when outer-turn behavior is needed
  - callers above the memory subject should use `MemoryManager`, not both `MemoryManager` and its internal persistence helpers
- Forbidden shortcuts:
  - `AgentRuntimeState` holding both a loose outer-turn ID and a separate batch-as-turn object
  - parser internals owning authoritative outer-turn state
  - per-turn `MemoryManager` ownership
- Boundary bypasses that are not allowed:
  - direct handler ownership of batch settlement maps when `ToolInvocationBatch` should own them
  - segment consumers inferring outer-turn identity only from invocation/segment ID conventions

## Architecture Direction Decision (Mandatory)

- Chosen direction:
  - add explicit `AgentTurn`, rename `ToolInvocationTurn` to `ToolInvocationBatch`, make `AgentRuntimeState` hold `activeTurn: AgentTurn | null`, and make `turn_id` mandatory on constructed segment events and parsed segment payloads
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`):
  - this removes the most confusing naming split with one coherent runtime model and reduces future refactor friction by making the outer business turn explicit
- Data-flow spine clarity assessment: `Yes`
- Spine span sufficiency assessment: `Yes`
- Spine inventory completeness assessment: `Yes`
- Ownership clarity assessment: `Yes`
- Off-spine concern clarity assessment: `Yes`
- Authoritative Boundary Rule assessment: `Yes`
- File placement within the owning subsystem assessment: `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Add` + `Rename/Move` + `Modify` + `Remove`
- Note:
  - `Keep` is not sufficient because the current code leaves the outer turn implicit and keeps the inner batch misnamed

## Common Design Practices Applied (If Any)

| Practice / Pattern | Where Used | Why It Helps Here | Owner / Off-Spine Concern | Notes |
| --- | --- | --- | --- | --- |
| explicit primary spine + bounded local spine | outer turn lifecycle and inner batch settlement | distinguishes outer business lifecycle from inner grouped settlement | `AgentTurn`, `ToolInvocationBatch` | key to resolving naming confusion |
| authoritative boundary selection | outer turn modeled as one aggregate | avoids caller dependence on both loose outer-turn IDs and inner batch state | `AgentTurn` | central cleanup decision |
| targeted rename over new subsystem sprawl | current `ToolInvocationTurn` file | behavior is already correct for batch semantics; only ownership/name are wrong | `ToolInvocationBatch` | avoids unnecessary architecture growth |
| boundary injection of contextual identity | segment event emission | keeps parsers turn-agnostic while making outbound payloads explicit | segment event emission boundary | avoids polluting parser core with runtime state |

## Ownership And Structure Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers exists and needs a clearer owner | Yes | outer turn lifecycle is currently split across input processor, runtime state, memory manager, and handlers | Extract clear owner |
| Responsibility overload exists in one file or one optional module grouping | No | current overload is conceptual split, not one god-file | Keep |
| Proposed indirection owns real policy, translation, or boundary concern | Yes | `AgentTurn` owns lifecycle and sequencing; `ToolInvocationBatch` owns settlement | Keep |
| Every off-spine concern has a clear owner on the spine | Yes | persistence -> `MemoryManager`, batching -> `AgentTurn`, streaming emission -> handler boundary | Keep |
| Primary spine is stretched far enough to expose the real business path instead of only a local edited segment | Yes | DS-001 and DS-002 both begin at initiating runtime surfaces and end at downstream consequence | Keep |
| Authoritative Boundary Rule is preserved: authoritative public boundaries stay authoritative; callers do not depend on both an outer owner and one of its internal owned mechanisms | Yes | `AgentTurn` becomes outer authority; `ToolInvocationBatch` stays internal to that turn subject | Keep |
| Existing capability area/subsystem was reused or extended where it naturally fits | Yes | `src/agent/` and `src/memory/` remain the owning areas | Reuse/Extend |
| Repeated structures were extracted into reusable owned files where needed | Yes | outer turn and inner batch become separate explicit files | Extract |
| Current structure can remain unchanged without spine/ownership degradation | No | current naming/ownership drift is the problem being fixed | Change |

### Optional Alternatives (Use For Non-Trivial Or Uncertain Changes)

| Option | Summary | Pros | Cons | Decision (`Chosen`/`Rejected`) | Rationale |
| --- | --- | --- | --- | --- | --- |
| A | Add `AgentTurn`, rename `ToolInvocationTurn` to `ToolInvocationBatch`, move turn-local sequencing into `AgentTurn`, and carry explicit `turn_id` on segment events while keeping canonical runtime fields as `turnId` | clear runtime language, aligned ownership, explicit stream correlation, docs/code alignment without mixed naming | broader rename surface across runtime and memory models | Chosen | solves the outer/inner terminology problem at the model level without introducing a second field vocabulary |
| B | Rename `ToolInvocationTurn` only, keep loose `activeTurnId` string and current segment-event payload model | smaller immediate refactor | outer turn remains implicit, segment events still lack direct correlation, naming ambiguity persists | Rejected | insufficient architectural cleanup |
| C | Make each `AgentTurn` hold its own `MemoryManager` | turn-local aggregation may look self-contained | overcouples one turn to agent-wide storage/compaction infrastructure and duplicates ownership boundaries | Rejected | violates clean ownership split and makes memory infrastructure per-turn without need |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Add | N/A | `autobyteus-ts/src/agent/agent-turn.ts` | create explicit outer turn aggregate | runtime model, handlers | new primary owner |
| C-002 | Rename/Move | `autobyteus-ts/src/agent/tool-invocation-turn.ts` | `autobyteus-ts/src/agent/tool-invocation-batch.ts` | align code with actual batch semantics and current docs | runtime model, handlers, tests | rename class to `ToolInvocationBatch` |
| C-003 | Modify | `autobyteus-ts/src/agent/context/agent-runtime-state.ts` | same path | replace `activeTurnId` + `activeToolInvocationTurn` with `activeTurn: AgentTurn | null` | runtime state, tests | convenience accessors may be added only if clearly needed |
| C-004 | Modify | `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts` | same path | create/use `AgentTurn`, start batches from it, attach outer-turn identity to segment events | streaming, tool parsing, memory ingest | main integration point |
| C-005 | Modify | `autobyteus-ts/src/agent/handlers/tool-result-event-handler.ts` | same path | settle against `ToolInvocationBatch` through `AgentTurn` instead of free runtime-state fields | tool result barrier | preserve ordered settlement semantics |
| C-006 | Modify | `autobyteus-ts/src/agent/tool-invocation.ts` | same path | keep invocation-level outer-turn field canonical as `turnId` while binding it to the explicit `AgentTurn` owner | tool models, execution handlers | aligns naming without aliasing |
| C-007 | Modify | `autobyteus-ts/src/agent/events/agent-events.ts` | same path | keep outer-turn fields on relevant events canonical as `turnId` | runtime events, tests | includes completion and tool-result events |
| C-008 | Modify | `autobyteus-ts/src/memory/memory-manager.ts` | same path | keep memory infrastructure agent-scoped; consume explicit outer-turn identity and explicit sequence input from `AgentTurn` | memory ingest path | remove internal per-turn sequence map in chosen direction |
| C-009 | Modify | `autobyteus-ts/src/memory/models/raw-trace-item.ts` | same path | keep persisted memory models on canonical `turn_id` while aligning runtime ownership terminology around `AgentTurn` | memory model, serialization | no storage-key rename is required |
| C-010 | Modify | `autobyteus-ts/src/agent/streaming/segments/segment-events.ts` | same path | add optional outer-turn identity to segment event model and outbound dict | stream contract | emit `turn_id` in target clean state |
| C-011 | Modify | `autobyteus-ts/src/agent/streaming/events/stream-event-payloads.ts` | same path | add explicit outer-turn identity to `SegmentEventData`; keep lifecycle payload naming canonical as `turn_id` | stream payloads | touched downstream consumers must stay aligned |
| C-012 | Modify | `autobyteus-ts/docs/turn_terminology.md` | same path | align docs with explicit `AgentTurn` + `ToolInvocationBatch` architecture and canonical `turnId` / `turn_id` naming | docs | design-stage artifact already points this way conceptually |
| C-013 | Remove | `activeTurnId`, `ToolInvocationTurn`, `agentTurnId`, `agent_turn_id`, and duplicate ownership paths for the outer turn | N/A | remove old loose runtime terminology, inner-turn misnaming, and newly introduced alias naming | runtime model, tests, docs | first-class removal, not wrapper retention |
| C-014 | Modify | `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | same path | declare `turn_id` explicitly on segment payload types so the frontend stream contract mirrors the backend segment-event contract | frontend protocol types, tests | current UI behavior remains unchanged |

## Removal / Decommission Plan (Mandatory)

- Remove `ToolInvocationTurn` as a class name and decommission all references to it.
- Remove `AgentRuntimeState.activeTurnId` and `AgentRuntimeState.activeToolInvocationTurn` as separate primitives.
- Remove `agentTurnId` / `agent_turn_id` alias fields from the changed scope and keep outer-turn field naming canonical as `turnId` / `turn_id`.
- Remove the current segment-event contract asymmetry where lifecycle payloads carry turn identity but segment payloads do not.
- Remove any stopgap compatibility wrapper that would keep both old and new turn names live in the same runtime layer.

## Migration / Refactor Sequence

1. Introduce `AgentTurn` and `ToolInvocationBatch` types and update `AgentRuntimeState` to hold `activeTurn`.
2. Update handlers to create/use `AgentTurn` and `ToolInvocationBatch`.
3. Standardize event/model outer-turn fields on canonical `turnId` while removing any `agentTurnId` aliases introduced by the earlier implementation wave.
4. Move turn-local sequencing into `AgentTurn` and simplify `MemoryManager`.
5. Align segment event model and payloads with canonical `turn_id`.
6. Update memory model naming and docs/tests in the same clean-cut implementation wave.
7. Clean up touched downstream repo consumers so they stay on canonical `turnId` / `turn_id` without alias handling.
8. Update the touched `autobyteus-web` segment payload types and related streaming tests so the frontend contract explicitly carries `turn_id` too.

## File Responsibility Draft

| File | Target Responsibility |
| --- | --- |
| `autobyteus-ts/src/agent/agent-turn.ts` | outer turn lifecycle, turn-local sequence, batch registry, active batch operations |
| `autobyteus-ts/src/agent/tool-invocation-batch.ts` | grouped invocation settlement and ordered result release |
| `autobyteus-ts/src/agent/context/agent-runtime-state.ts` | hold `activeTurn`, agent-scoped infra refs, caches, pending approvals |
| `autobyteus-ts/src/memory/memory-manager.ts` | agent-scoped persistence/snapshot/compaction infrastructure only |
| `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts` | outer-turn creation/use, batch start, segment-event outer-turn decoration |
| `autobyteus-ts/src/agent/handlers/tool-result-event-handler.ts` | delegate settlement through active turn and release continuation when batch completes |
| `autobyteus-ts/src/agent/streaming/segments/segment-events.ts` | runtime segment-event model with explicit outer-turn identity support |
| `autobyteus-ts/src/agent/streaming/events/stream-event-payloads.ts` | outbound typed payloads including segment outer-turn identity |

## Folder / Path Mapping

- Keep `AgentTurn` and `ToolInvocationBatch` in `autobyteus-ts/src/agent/` because both are runtime-domain aggregates rather than memory-subsystem infrastructure.
- Keep `MemoryManager` in `autobyteus-ts/src/memory/`.
- Keep stream payload/model changes in existing `autobyteus-ts/src/agent/streaming/` folders.
- No new optional module grouping is required for this scope; the design is clearer with the current flat runtime-model placement under `src/agent/`.

## Interface / API Naming Direction

- Internal runtime fields:
  - `activeTurnId` -> `activeTurn`
  - `activeToolInvocationTurn` -> `activeToolInvocationBatch` only if retained outside `AgentTurn`; preferred target is no separate runtime-state field
  - canonical outer-turn field name remains `turnId`
- Runtime model names:
  - `ToolInvocationTurn` -> `ToolInvocationBatch`
  - new `AgentTurn`
- Stream payload naming:
  - preferred target clean state: `turn_id`
  - touched downstream repos should be updated in the same refactor wave instead of carrying alias handling

## Example Shape

Good target runtime shape:

```ts
class AgentTurn {
  turnId: string;
  private sequence = 0;
  toolInvocationBatches: ToolInvocationBatch[] = [];
  activeToolInvocationBatch: ToolInvocationBatch | null = null;

  nextSeq(): number;
  startToolInvocationBatch(invocations: ToolInvocation[]): ToolInvocationBatch;
  settleToolResult(result: ToolResultEvent): boolean;
}
```

Bad target runtime shape:

```ts
class AgentRuntimeState {
  activeTurnId: string | null;
  activeToolInvocationTurn: ToolInvocationTurn | null;
  memoryManager: MemoryManager | null;
}
```

The bad shape keeps the same conceptual split and only re-labels pieces. The chosen design replaces that split with an explicit outer owner.
