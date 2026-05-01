# Design Spec

## Current-State Read

This design supersedes the earlier narrow bug-fix-only design for the same ticket. The current worktree already contains a partial implementation that fixes the immediate Claude Activity `Arguments` symptom through the lifecycle lane, but the user has explicitly asked to continue the broader refactor in this ticket.

Current state after the narrow implementation:

- `ClaudeSessionToolUseCoordinator` observes raw Claude SDK `tool_use` blocks, stores arguments, emits `ITEM_COMMAND_EXECUTION_STARTED` once, and includes tracked arguments on completion.
- `ClaudeSessionEventConverter` maps Claude command execution session events to normalized `TOOL_*` events and can preserve optional completion arguments.
- Frontend lifecycle handling can create/update Activity entries from `TOOL_*` events.
- Claude normal tools still do **not** synthesize `ITEM_ADDED` / `ITEM_COMPLETED` session segment events from raw `tool_use` / `tool_result`.
- Codex normal dynamic tool/file-change events generally emit both a segment event and a lifecycle event.
- Frontend Activity can currently be created by both `segmentHandler.ts` and `toolLifecycleHandler.ts`, so Activity ownership is implicit and dedupe-based rather than explicit.

The broader design problem is that Claude lacks the same normalized two-lane contract as Codex. Lifecycle-only Claude tool handling can show arguments, but it keeps transcript rendering, Activity creation, and history/memory projection pressure coupled to provider-specific event gaps.

## Intended Change

Normalize Claude normal tool calls into the same two-lane runtime-neutral contract expected for normal tool invocations:

1. **Segment lane**: `SEGMENT_START` / `SEGMENT_END` represents the assistant conversation/transcript structure for a tool call.
2. **Lifecycle lane**: `TOOL_APPROVAL_*` and `TOOL_EXECUTION_*` represents execution state, approval state, Activity state, arguments, result/error, logs, and durable tool traces.

For Claude normal tools, raw SDK events should map as follows:

```text
assistant message content tool_use(input)
  -> ClaudeSessionEventName.ITEM_ADDED(segment_type="tool_call", metadata.arguments=input)
  -> ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_STARTED(arguments=input)
  -> normalized SEGMENT_START + TOOL_EXECUTION_STARTED

user message content tool_result
  -> ClaudeSessionEventName.ITEM_COMPLETED(segment_type="tool_call", metadata.arguments=input, metadata.result/error=...)
  -> ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED(arguments=input, result/error=...)
  -> normalized SEGMENT_END + TOOL_EXECUTION_SUCCEEDED/FAILED
```

Frontend ownership should be tightened at the same time:

- `segmentHandler.ts` owns conversation segment creation/finalization and metadata merging.
- `toolLifecycleHandler.ts` owns Activity creation, Activity status, Activity result/error, and Activity arguments.
- Segment processing must not independently create tool Activity cards.

## Non-Regression Safety Assessment

The refactor is safe only if it does **not** make Activity display depend on one live-stream path everywhere. The current system has two distinct Activity sources that must remain intact:

1. **Live Activity source**: normalized lifecycle websocket events handled by `toolLifecycleHandler.ts`.
2. **Historical Activity source**: server `projection.activities` loaded on run open and hydrated by `hydrateActivitiesFromProjection`.

Design conclusions from the safety check:

- Removing Activity creation from `segmentHandler.ts` should not break Codex live Activity because Codex command execution, dynamic tool calls, and file changes have lifecycle start events that `toolLifecycleHandler.ts` can use to create cards.
- Historical Activity display when clicking/opening a run should not depend on `segmentHandler.ts` or live websocket replay. It must continue to hydrate from `projection.activities`.
- Server projection must be protected: provider-specific projections and local-memory projections can be complementary. A runtime provider that returns conversation-only data must not suppress local-memory activities. This is especially relevant for standalone Claude history because the current Claude projection provider maps session messages to conversation entries but not tool activities.

Implementation must therefore include non-regression tests for:

- Codex live command execution / dynamic tool / file-change Activity cards after segment-created Activity is removed.
- Frontend historical run open hydrating projected activities.
- Server projection merging local-memory activities with Claude conversation-only runtime projection.

## Task Design Health Assessment (Mandatory)

- Change posture: Bug fix + behavior alignment + refactor.
- Root cause classification: Missing invariant + boundary/ownership issue + duplicated policy/coordination.
- Refactor needed now: Yes.
- Why: The original missing arguments bug exposed a provider-normalization invariant gap. The implementation follow-up exposed a second invariant: a normal tool invocation should have both transcript segment projection and execution lifecycle projection. The frontend currently compensates with mixed Activity ownership, which makes provider asymmetry easy to leak into UI logic.
- Design response: Make Claude's runtime adapter emit both lanes for normal tools, and make lifecycle the one authoritative Activity owner in frontend streaming.

## Terminology

- **Normal tool**: Any Claude tool invocation except the special `send_message_to` team-communication tool path.
- **Segment lane**: Runtime-neutral transcript/conversation event stream (`SEGMENT_START`, `SEGMENT_CONTENT`, `SEGMENT_END`).
- **Lifecycle lane**: Runtime-neutral tool execution event stream (`TOOL_APPROVAL_REQUESTED`, `TOOL_APPROVED`, `TOOL_DENIED`, `TOOL_EXECUTION_STARTED`, `TOOL_EXECUTION_SUCCEEDED`, `TOOL_EXECUTION_FAILED`, `TOOL_LOG`).
- **Invocation identity**: The stable ID from Claude `tool_use.id` / `tool_result.tool_use_id`, reused as both segment ID and lifecycle `invocation_id` for normal tools.
- **Activity**: Frontend right-panel execution card, owned by lifecycle events.

## Design Reading Order

1. Read the current-state and health sections to understand why this is no longer only an arguments bug.
2. Read the data-flow spine inventory and ownership map to understand the two-lane target.
3. Read the file responsibility mapping and migration sequence for implementation guidance.
4. Read the compatibility rejection and risks before changing frontend fallback behavior.

## Legacy Removal Policy (Mandatory)

Do not add a Claude-specific frontend field, Claude-specific Activity side channel, or result-only UI workaround. The clean target is to normalize Claude raw events at the Claude runtime boundary and remove duplicated Activity creation responsibility from segment handling.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Claude normal tool start | Claude SDK `tool_use` / permission callback | Normalized `SEGMENT_START` and `TOOL_EXECUTION_STARTED` websocket messages | `ClaudeSessionToolUseCoordinator` | Establishes the two-lane start invariant and argument preservation. |
| DS-002 | Claude normal tool completion | Claude SDK `tool_result` | Normalized `SEGMENT_END` and terminal `TOOL_EXECUTION_*` websocket messages | `ClaudeSessionToolUseCoordinator` | Closes transcript segment and execution lifecycle with same invocation identity. |
| DS-003 | Frontend live rendering | Normalized websocket events | Conversation segment + one Activity card | Frontend streaming handlers | Keeps transcript and Activity responsibilities separate. |
| DS-004 | Durable projection | Normalized runtime events and run-history provider data | Memory/history/run-file projections and `projection.activities` | Memory/history/projection services | Ensures added tool segments do not duplicate lifecycle-owned tool traces and historical runs still show Activity cards. |
| DS-005 | Team communication exception | Claude `send_message_to` tool | Team/conversation segment display, no generic Activity noise | Claude send-message handler + converter suppression | Preserves existing team UX while normal tools are aligned. |

## Primary Execution Spine(s)

### DS-001 Claude normal tool start

```text
Claude SDK raw assistant tool_use / canUseTool callback
  -> ClaudeSessionToolUseCoordinator invocation projection state
  -> Claude session events: ITEM_ADDED + ITEM_COMMAND_EXECUTION_STARTED
  -> ClaudeSessionEventConverter normalized events: SEGMENT_START + TOOL_EXECUTION_STARTED
  -> Agent run websocket mapper
  -> Frontend segment handler + lifecycle handler
```

### DS-002 Claude normal tool completion

```text
Claude SDK raw user tool_result
  -> ClaudeSessionToolUseCoordinator tracked invocation state
  -> Claude session events: ITEM_COMPLETED + ITEM_COMMAND_EXECUTION_COMPLETED
  -> ClaudeSessionEventConverter normalized events: SEGMENT_END + TOOL_EXECUTION_SUCCEEDED/FAILED
  -> Agent run websocket mapper
  -> Frontend segment finalization + Activity result/status update
```

### DS-003 Frontend live rendering

```text
Normalized SEGMENT_* / TOOL_* websocket messages
  -> Segment handler owns conversation segment state
  -> Tool lifecycle handler owns lifecycle segment state and Activity state
  -> AgentActivityStore has one card per invocation
  -> ActivityItem renders Arguments/Result from lifecycle-owned Activity state
```

## Spine Narratives (Mandatory)

- Claude raw `tool_use.input` is already the authoritative provider data for arguments. The coordinator should normalize it once and fan it into both lanes.
- The segment lane's job is to make the transcript look like a tool call happened. It should not own approval, executing/success/error status, or Activity creation.
- The lifecycle lane's job is to make execution observable and durable. It should own Activity creation and memory/tool traces.
- Using the same invocation ID for segment `id` and lifecycle `invocation_id` lets frontend handlers reconcile both lanes without fuzzy matching.
- `send_message_to` is intentionally not a normal tool for Activity purposes. It uses segment display for team communication and converter-level lifecycle suppression for generic tool noise.

## Spine Actors / Main-Line Nodes

| Node | Owns | Notes |
| --- | --- | --- |
| Claude SDK raw event stream | Provider raw `tool_use` / `tool_result` data | External input only; not consumed by frontend. |
| `ClaudeSessionToolUseCoordinator` | Claude invocation state and emission sequencing | Authoritative owner for normal-tool segment+lifecycle synthesis. |
| `ClaudeSessionEventConverter` | Session event to runtime-neutral `AgentRunEvent` mapping | Should stay a field normalizer, not a state owner. |
| Websocket message mapper | Runtime-neutral transport serialization | Should not know provider raw shapes. |
| Frontend segment handler | Conversation segment creation/merge/finalization | No Activity creation for executable segments. |
| Frontend lifecycle handler | Tool execution state and Activity state | May reconcile with existing segment by invocation alias. |
| Memory/history projection | Durable tool traces from lifecycle | Should ignore tool segment events for tool-trace creation. |

## Ownership Map

| Concern | Authoritative Owner | Non-Owner Responsibilities |
| --- | --- | --- |
| Extract Claude tool arguments | `ClaudeSessionToolUseCoordinator` | Converter serializes already-normalized payloads; frontend consumes `arguments`. |
| Normal tool segment start/end synthesis | `ClaudeSessionToolUseCoordinator` | Converter maps `ITEM_ADDED`/`ITEM_COMPLETED`; frontend renders segments. |
| Normal tool lifecycle start/terminal events | `ClaudeSessionToolUseCoordinator` | Converter maps to `TOOL_*`; frontend updates Activity. |
| Activity creation/status/result | `toolLifecycleHandler.ts` + `AgentActivityStore` | Segment handler may not create Activity cards. |
| Conversation transcript structure | `segmentHandler.ts` | Lifecycle handler may create/reconcile a synthetic segment only as an ordering backstop. |
| Team communication display | `ClaudeSendMessageToolCallHandler` | Generic lifecycle path stays suppressed by converter for `send_message_to`. |

## Thin Entry Facades / Public Wrappers (If Applicable)

- `ClaudeSession` remains the entrypoint that passes raw SDK chunks and permission callbacks into the coordinator.
- `AgentRunEventMessageMapper` remains a transport mapper only.
- Vue components such as `ActivityItem.vue` remain presentation-only and do not recover missing provider data.

## Removal / Decommission Plan (Mandatory)

| Current Behavior / Code | Removal / Replacement |
| --- | --- |
| Segment handler creates Activity cards from `tool_call`, `write_file`, `run_bash`, and `edit_file` segment starts. | Remove Activity creation from segment starts. Lifecycle handler creates Activity from `TOOL_EXECUTION_STARTED` / approval events. |
| Segment handler updates Activity status/arguments on segment end. | Remove status/result/argument Activity updates from segment end; lifecycle terminal events update Activity. Segment end only finalizes conversation segment. |
| Claude normal tool lifecycle-only projection. | Add segment start/end synthesis from `tool_use`/`tool_result`. |
| Frontend tests that assert segment-created Activity cards. | Rewrite to assert transcript-only segment handling and lifecycle-owned Activity creation. |
| Any Claude-specific frontend completion-arguments workaround as primary behavior. | Keep normalized lifecycle start as the primary argument source; completion arguments remain backend defensive data only. |

## Return Or Event Spine(s) (If Applicable)

| Spine ID | Scope | Start | End | Owner | Notes |
| --- | --- | --- | --- | --- |
| ES-001 | Approval result | Frontend approval action | Claude permission promise resolution | Existing approval request/response path | Must keep same invocation ID as segment/lifecycle. |
| ES-002 | Terminal result | Claude `tool_result` | Activity result/error + memory tool result | Lifecycle lane | Segment end carries transcript closure only. |

## Bounded Local / Internal Spines (If Applicable)

### Claude coordinator per-invocation state

```text
upsert invocation -> emit segment start if needed -> emit lifecycle start if needed -> optional approval state -> emit segment end if needed -> emit lifecycle terminal -> consume/cleanup
```

The local state should include enough flags to prevent duplicate emission when raw observation and permission callback both see the same invocation.

Suggested shape:

```ts
type ObservedClaudeToolInvocation = {
  toolName: string | null;
  toolInput: Record<string, unknown>;
  segmentStartedEmitted: boolean;
  lifecycleStartedEmitted: boolean;
  segmentEndedEmitted: boolean;
};
```

## Off-Spine Concerns Around The Spine

| Concern | Serves Which Owner | Responsibility | Constraint |
| --- | --- | --- | --- |
| Raw event logging | Investigation/e2e | Capture Claude SDK events for evidence | Opt-in only. |
| Converter normalization helpers | `ClaudeSessionEventConverter` | Normalize tool names, arguments, segment metadata | No private coordinator state reads. |
| Activity store dedupe | Frontend lifecycle owner | Prevent accidental duplicate card insertion | Dedupe is a guardrail, not the ownership model. |
| Memory accumulator | Durable projection | Record tool traces from lifecycle events | Ignore tool segments for trace creation. |
| Run-file-change projection | Durable file projection | May consume segment and lifecycle events idempotently | Must not depend on segment-created Activity. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why |
| --- | --- | --- | --- |
| Claude raw tool normalization | Claude runtime session subsystem | Extend | The coordinator already owns permission/tool observation state. |
| Segment conversion | Claude session event converter | Reuse | `ITEM_ADDED`/`ITEM_COMPLETED` already map to `SEGMENT_*`. |
| Lifecycle conversion | Claude session event converter | Reuse/Minor Extend | `ITEM_COMMAND_EXECUTION_*` already map to `TOOL_*`. |
| Frontend transcript handling | Agent streaming segment handler | Refactor | Keep segment state, remove Activity ownership. |
| Frontend Activity handling | Agent streaming lifecycle handler + Activity store | Refactor/Strengthen | Make lifecycle the explicit owner. |
| Validation | Existing unit/e2e suites | Extend | Add cross-runtime and ordering coverage. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Decision | Notes |
| --- | --- | --- | --- | --- |
| Claude runtime session | Raw tool observation, permission callback coordination, two-lane event emission | DS-001, DS-002, DS-005 | Extend | Primary backend production change. |
| Agent run event conversion | Session-to-normalized mapping | DS-001, DS-002 | Reuse | Existing segment mapping is sufficient if payload shape is correct. |
| Frontend streaming handlers | Segment/lifecycle state mutation | DS-003 | Refactor | Split Activity ownership from segment handling. |
| Memory/history/run-file projection | Durable tool/file state and historical Activity payloads | DS-004 | Validate/Adjust | Confirm no duplicate tool traces and preserve local-memory activities when runtime-specific projections are conversation-only. |
| E2E/unit validation | Regression protection | All | Extend | Include raw Claude fixtures and frontend ordering tests. |

## Draft File Responsibility Mapping

| Candidate File | Owner / Boundary | Concrete Concern | Change Type |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.ts` | Claude tool invocation owner | Emit segment start/end plus lifecycle start/completion with duplicate suppression | Modify |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Claude event adapter | Preserve/verify segment metadata and lifecycle arguments | Test/Minor Modify if needed |
| `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/claude-send-message-tool-call-handler.ts` | Team communication tool path | Preserve `send_message_to` segment semantics | Test/No production change expected |
| `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | Frontend transcript owner | Remove Activity creation/update side effects; keep segment metadata merging | Modify |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | Frontend lifecycle/Activity owner | Ensure lifecycle creates one Activity and reconciles with existing/later segments | Modify |
| `autobyteus-web/stores/agentActivityStore.ts` | Activity state store | Optional alias-aware guard if needed by tests | Modify only if required |
| `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-accumulator.ts` | Memory tool trace owner | Validate no duplicate traces; likely no production change | Test/No production change expected |
| `autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts` | Run-history projection owner | Preserve/merge local-memory activities when primary runtime projection is conversation-only | Modify/Test if needed |
| `autobyteus-server-ts/src/run-history/projection/providers/claude-run-view-projection-provider.ts` | Claude history provider | Current session-message projection may be conversation-only; must not suppress local-memory activities | Test/Modify via provider or projection service |
| `autobyteus-web/services/runOpen/agentRunOpenCoordinator.ts` | Historical run open flow | Must continue calling `hydrateActivitiesFromProjection` for opened history runs | Test/No production change expected |
| `autobyteus-web/services/runHydration/runProjectionActivityHydration.ts` | Historical Activity hydration | Converts `projection.activities` directly to Activity store rows | Test/No production change expected |
| Targeted backend/frontend/e2e tests | Validation | Assert two-lane contract and no duplicate Activity | Modify/Add |

## Reusable Owned Structures Check

| Structure / Logic | Candidate Location | Decision | Rationale |
| --- | --- | --- | --- |
| Claude invocation projection state | Local type in `claude-session-tool-use-coordinator.ts` | Keep local | Provider-specific sequencing state; not a cross-runtime abstraction. |
| Segment start/end payload builder for Claude normal tools | Private helpers in coordinator | Add | Avoid duplicate payload shape between raw and permission branches. |
| Activity ownership helpers | Existing `toolLifecycleHandler.ts` helpers | Reuse/Strengthen | Lifecycle handler already creates/updates Activity. |
| Argument normalization | Existing backend/frontend helpers | Reuse | Do not add `input`/`tool_input` parallel field. |

## Shared Structure / Data Model Tightness Check

| Shared Structure | Tightness Assessment | Corrective Action |
| --- | --- | --- |
| Segment payload metadata | `metadata.arguments` has one clear meaning: transcript metadata for a tool invocation. | Use this for Claude normal tool segments. |
| Lifecycle payload `arguments` | One clear meaning: execution arguments for a tool invocation. | Continue using existing field. |
| Invocation identity | Segment `id` and lifecycle `invocation_id` should be same stable provider tool-use ID. | Do not create separate segment-only IDs for Claude normal tools. |
| Activity state | One card per invocation ID. | Creation from lifecycle only; segment updates do not create cards. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Concrete Responsibility |
| --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.ts` | Claude runtime session | Authoritative normal-tool two-lane emission and duplicate suppression. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Claude event conversion | Runtime-neutral mapping for segment/lifecycle payloads; no state ownership. |
| `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | Frontend transcript handling | Create/merge/finalize conversation segments only. |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | Frontend lifecycle/Activity handling | Create/update Activity and reconcile lifecycle state with segment state. |
| `autobyteus-web/stores/agentActivityStore.ts` | Frontend Activity state | Store/dedupe/update one Activity per invocation. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.test.ts` | Backend validation | Claude raw fixture and duplicate-suppression tests. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts` | Backend validation | Segment metadata and lifecycle argument conversion tests. |
| `autobyteus-web/services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts` | Frontend validation | Transcript-only segment behavior. |
| `autobyteus-web/services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts` and ordering tests | Frontend validation | Lifecycle-owned Activity and no duplicates across event ordering. |
| `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` | E2E validation | Gated Claude two-lane assertion and Codex no-regression where applicable. |

## Ownership Boundaries

- The Claude runtime boundary owns interpretation of Claude SDK raw event shape.
- The converter boundary owns event-name and field normalization only.
- Frontend segment handling owns transcript structure only.
- Frontend lifecycle handling owns Activity lifecycle and execution state.
- Durable memory/history tool traces are lifecycle-owned, not segment-owned.

## Boundary Encapsulation Map

| Authoritative Boundary | Encapsulates | Upstream Callers Must Use | Forbidden Bypass | If API Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ClaudeSessionToolUseCoordinator` | Raw Claude tool_use/tool_result state, duplicate flags, segment+lifecycle emission sequencing | `ClaudeSession` | Frontend or converter reading raw Claude SDK `input` | Emit complete session events. |
| `ClaudeSessionEventConverter` | Session event to `AgentRunEvent` mapping | Agent run backend/event stream | Websocket mapper adding Claude-specific fields | Add normalized payload fields in session event/converter. |
| `toolLifecycleHandler.ts` | Activity creation/status/result/arguments | Agent streaming service | `segmentHandler.ts` independently creating Activity cards | Move lifecycle state mutation into lifecycle handler. |
| `segmentHandler.ts` | Conversation segment state | Agent streaming service | Activity component reconstructing transcript from Activity | Emit/process segment events. |

## Dependency Rules

- `ClaudeSession` may pass raw SDK chunks and permission callbacks to the coordinator; it should not emit normal-tool segment/lifecycle events itself.
- `ClaudeSessionToolUseCoordinator` may emit `ITEM_ADDED`, `ITEM_COMPLETED`, and `ITEM_COMMAND_EXECUTION_*` session events for normal tools.
- `ClaudeSessionEventConverter` must not depend on coordinator private maps.
- Frontend code must not depend on Claude SDK fields such as raw `tool_use.input`.
- `segmentHandler.ts` must not import/use `AgentActivityStore` for executable segment Activity creation after this refactor.
- `toolLifecycleHandler.ts` may use segment lookup/creation helpers to reconcile conversation state, but Activity creation remains inside lifecycle handling.

## Interface Boundary Mapping

| Interface / Method | Subject Owned | Accepted Identity Shape | Target Behavior |
| --- | --- | --- | --- |
| `processToolLifecycleChunk(runContext, chunk)` | Claude raw tool observation | `block.id` / `block.tool_use_id` | Upsert invocation; for normal `tool_use`, emit segment start and lifecycle start once; for `tool_result`, emit segment end and terminal lifecycle. |
| `handleToolPermissionCheck(runContext, toolName, toolInput, options)` | Permission-mediated tool observation | `options.toolUseID` | Upsert same invocation; emit segment/lifecycle start once if raw chunk has not already done so; request approval. |
| `ClaudeSessionEventConverter.convert(event)` | Provider session event conversion | Session event `id` / `invocation_id` | Map `ITEM_ADDED`/`ITEM_COMPLETED` to `SEGMENT_*`; map command execution to `TOOL_*`. |
| `handleSegmentStart/End(payload, context)` | Frontend transcript | Segment `id` | Create/merge/finalize segment only; no Activity creation. |
| `handleToolExecutionStarted/Succeeded/Failed/...` | Frontend Activity lifecycle | Lifecycle `invocation_id` | Create/update one Activity and update matching segment lifecycle state. |

## Interface Boundary Check

| Interface | Responsibility Singular? | Identity Explicit? | Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `processToolLifecycleChunk` | Yes | Yes | Medium because it now emits both lanes | Keep helpers private and state-driven. |
| `handleToolPermissionCheck` | Yes | Yes | Medium due duplicate observation with raw event | Share same upsert/emit-if-needed helpers. |
| `SEGMENT_*` payloads | Yes | Yes | Low if metadata shape is normalized | Use `metadata.arguments`, `metadata.tool_name`. |
| `TOOL_*` payloads | Yes | Yes | Low | Use existing `arguments`, `result`, `error`. |
| Frontend segment handler | Yes after refactor | Yes | Current risk high due Activity side effects | Remove Activity side effects. |

## Main Domain Subject Naming Check

| Subject | Name | Assessment |
| --- | --- | --- |
| Claude tool lifecycle owner | `ClaudeSessionToolUseCoordinator` | Keep; name remains accurate if it owns both lanes for tool use. |
| Invocation state | `ObservedClaudeToolInvocation` or `ClaudeToolInvocationProjectionState` | Consider renaming if flags expand beyond observation. |
| Lifecycle handler | `toolLifecycleHandler.ts` | Keep; it should own Activity lifecycle. |
| Segment handler | `segmentHandler.ts` | Keep; it should return to segment-only responsibility. |

## Applied Patterns (If Any)

- **Adapter**: Claude event converter maps provider session events to runtime-neutral event types.
- **Local state machine**: Coordinator tracks per-invocation emission flags to prevent duplicate segment/lifecycle start/end.
- **Event-sourced projection**: Frontend Activity and memory/history project state from normalized lifecycle events.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Must Not Contain |
| --- | --- | --- | --- | --- |
| `backends/claude/session/claude-session-tool-use-coordinator.ts` | File | Claude session tool owner | Raw-event and permission-path normal-tool projection | Frontend display logic. |
| `backends/claude/events/claude-session-event-converter.ts` | File | Event adapter | Provider-neutral field mapping | Private invocation state. |
| `backends/claude/team-communication/claude-send-message-tool-call-handler.ts` | File | Team communication path | Segment display for `send_message_to` | Generic normal-tool lifecycle alignment. |
| `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | File | Transcript owner | Segment state only | Activity creation/status/result logic. |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | File | Lifecycle/Activity owner | Tool execution and Activity state | Provider raw parsing. |
| `autobyteus-web/stores/agentActivityStore.ts` | File | Activity store | Store mutations and dedupe | Transcript segment parsing. |

## Folder Boundary Check

| Folder | Intended Structural Depth | Ownership Clear? | Action |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session` | Main-line runtime control | Yes | Extend coordinator; do not create a parallel normalizer. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events` | Adapter | Yes | Reuse converter. |
| `autobyteus-web/services/agentStreaming/handlers` | Frontend event projection | Mixed today but correctable | Separate segment and lifecycle responsibilities within existing files. |
| `autobyteus-web/stores` | UI state store | Yes | Activity store remains simple state holder. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Claude raw start | `tool_use(input) -> ITEM_ADDED(metadata.arguments=input) + ITEM_COMMAND_EXECUTION_STARTED(arguments=input)` | `tool_use(input) -> lifecycle only` | Transcript and Activity both need normalized provider data. |
| Frontend Activity owner | `TOOL_EXECUTION_STARTED -> addActivity(...)`; `SEGMENT_START -> add segment only` | Both segment and lifecycle call `addActivity(...)` | One owner avoids duplicate/order bugs. |
| Completion | `tool_result -> ITEM_COMPLETED + ITEM_COMMAND_EXECUTION_COMPLETED(arguments, result)` | completion result only | Keeps segment closed and lifecycle projection recoverable. |
| `send_message_to` | `send_message_to -> segment display, generic lifecycle suppressed` | Treat as normal tool Activity noise | Preserves team communication UX. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why Considered | Decision | Clean Replacement |
| --- | --- | --- | --- |
| Add Claude-specific `input` support to Activity UI | Raw SDK field is named `input` | Rejected | Backend emits normalized segment metadata and lifecycle `arguments`. |
| Keep Claude lifecycle-only and let frontend synthesize everything | Smaller than two-lane alignment | Rejected | Claude emits both lanes like Codex. |
| Let both segment and lifecycle handlers create Activity cards forever | Current behavior mostly works with dedupe | Rejected | Lifecycle owns Activity; segment owns transcript. |
| Add a parallel `tool_input`/`tool_arguments` field | Could preserve raw naming | Rejected | Existing `arguments` field remains canonical. |
| Backfill old runs with synthetic segments | Could make old history uniform | Out of scope | New runs use corrected event stream; historical migration is separate. |

## Derived Layering (If Useful)

```text
Provider raw events
  -> Provider runtime coordinator/adapters
  -> Runtime-neutral AgentRunEvent stream
  -> Transport websocket messages
  -> Frontend event projection handlers
  -> UI stores/components
```

The ownership split must be preserved across layers: provider raw interpretation happens before runtime-neutral events; UI components consume projected state only.

## Migration / Refactor Sequence

1. Extend `ObservedClaudeToolInvocation` (or rename to a projection-state type) with `segmentStartedEmitted`, `lifecycleStartedEmitted`, and `segmentEndedEmitted` flags.
2. Add private coordinator helpers:
   - `upsertObservedToolInvocation(runId, invocationId, { toolName, toolInput })`
   - `emitToolSegmentStartIfNeeded(runContext, invocationId)`
   - `emitToolExecutionStartedIfNeeded(runContext, invocationId)`
   - `emitToolSegmentEndIfNeeded(runContext, invocationId, completionMetadata)`
   - `consumeObservedToolInvocation(runId, invocationId)` after terminal lifecycle emission.
3. In Claude raw assistant `tool_use` handling:
   - skip/delegate `send_message_to` to its special handler;
   - upsert invocation with normalized args;
   - emit segment start once;
   - emit lifecycle started once.
4. In `handleToolPermissionCheck`:
   - upsert the same invocation ID and args;
   - emit segment start once if raw observation has not already done so;
   - emit lifecycle started once;
   - proceed with approval request/decision as today.
5. In Claude raw user `tool_result` handling:
   - resolve tracked invocation;
   - skip/delegate `send_message_to` as today;
   - defensively emit segment start first if a terminal result arrives without a start;
   - emit segment end once with metadata including arguments and result/error summary;
   - emit terminal lifecycle event with arguments and result/error;
   - consume/cleanup invocation state.
6. Verify/adjust `ClaudeSessionEventConverter` tests for `ITEM_ADDED`/`ITEM_COMPLETED` metadata and command completion arguments.
7. Refactor `segmentHandler.ts`:
   - remove Activity creation from segment start;
   - remove Activity status/argument updates from segment end;
   - keep segment metadata merging and tool name/argument fields on conversation segments.
8. Refactor `toolLifecycleHandler.ts` as needed:
   - keep/create Activity from lifecycle events only;
   - reconcile with an existing segment by invocation alias;
   - if lifecycle arrives before segment, create a synthetic segment as an ordering backstop and let later segment events merge metadata rather than duplicate.
9. Update frontend tests:
   - segment handler tests assert conversation state only;
   - lifecycle handler and ordering tests assert one Activity across segment-before-lifecycle and lifecycle-before-segment orders.
10. Update backend tests:
   - Claude raw normal-tool start emits both session event lanes;
   - result emits both completion lanes;
   - permission callback/raw duplicate suppression works;
   - `send_message_to` suppression/display stays intact.
11. Update memory/history/projection validation:
   - add/adjust a test showing tool traces come from lifecycle once even when matching tool segments exist;
   - add server projection coverage proving local-memory activities survive when a Claude runtime/session projection is conversation-only;
   - add frontend run-open coverage proving historical `projection.activities` are hydrated into `AgentActivityStore` without live streaming.
12. Update Codex live non-regression validation:
   - command execution, dynamic tool call, and file-change lifecycle events each create exactly one Activity after segment-created Activity is removed.
13. Update gated Claude e2e:
   - capture raw events;
   - match the intended invocation by approval/request target or tool name/args;
   - assert raw `tool_use.input` appears in normalized segment metadata and lifecycle arguments;
   - avoid selecting unrelated preliminary successes.
13. Run targeted backend, frontend, and e2e/gated validation, then update downstream handoff artifacts.

## Key Tradeoffs

- Emitting both lanes for Claude normal tools is larger than the narrow lifecycle fix, but it removes provider asymmetry and avoids frontend special cases.
- Removing segment-created Activity changes frontend test expectations, but it makes ownership explicit and reduces duplicate/order risk.
- Keeping a lifecycle-created synthetic segment as an ordering backstop is acceptable only if Activity still remains lifecycle-owned and later segment events reconcile by ID.
- Completion arguments are somewhat redundant when starts are correct, but they are useful for durable projection recovery and do not create a second frontend field.

## Risks

- Accidentally dropping Activity cards for any provider that sends executable segments without lifecycle events. Implementation should identify such providers or tests before removing segment-created Activity behavior.
- Accidentally dropping historical Activity cards by assuming live segment/lifecycle handlers run during history hydration. History must remain projection-hydrated.
- Accidentally keeping standalone Claude history conversation while losing local-memory activities because the Claude provider is considered usable before fallback/merge.
- Accidentally reintroducing generic Activity noise for Claude `send_message_to`.
- Event ordering may expose existing alias/dedupe assumptions in frontend tests.
- Live Claude e2e can be slow/flaky/costly; deterministic unit fixtures must carry the core correctness burden.

## Guidance For Implementation

- Treat this as a refactor of event ownership, not a UI patch.
- Prefer coordinator-local helpers over duplicating segment/lifecycle emission logic between raw and permission branches.
- Use the same invocation ID for Claude segment `id` and lifecycle `invocation_id`.
- Keep payload fields runtime-neutral: `metadata.arguments` for segments and `arguments` for lifecycle.
- Do not change `ActivityItem.vue` to understand Claude raw SDK fields.
- Preserve `send_message_to` as a special team-communication path.
- Run at minimum:
  - backend run-history projection tests that cover Claude local-memory activity merge and no duplicate tool traces
  - frontend run-open/history hydration tests that cover projected Activity display
  - frontend Codex/live lifecycle tests for command execution, dynamic tool calls, and file changes
  - `pnpm -C autobyteus-server-ts test tests/unit/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.test.ts --run`
  - `pnpm -C autobyteus-server-ts test tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts --run`
  - relevant frontend `segmentHandler`, `toolLifecycleHandler`, and ordering tests
  - `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
  - gated Claude e2e with raw logging when credentials/environment are available
