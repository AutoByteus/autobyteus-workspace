# Design Spec

## Current-State Read

`autobyteus-ts` currently exposes four native local ToDo tools from
`src/tools/register-tools.ts`. Each tool owns part of one in-memory capability:
`ToDoList` is stored on `AgentRuntimeState.todoList`, schemas validate tool input,
and tool execution emits `AGENT_DATA_TODO_LIST_UPDATED` through the native
`AgentEventStream`. The resulting `StreamEventType.AGENT_TODO_LIST_UPDATE` is
adapted by the server AutoByteus backend.

This is a coherent but obsolete capability rather than an isolated unused
class. Removing only the four registry lines would leave an ownerless model,
public exports, state field, notifier method, native stream contract, tests, and
a downstream adapter. The native list is not persisted and has no independent
reader/writer.

The server-level `AgentRunEventType.TODO_LIST_UPDATE` and WebSocket
`TODO_LIST_UPDATE` are a different boundary. Codex turn/item converters emit
that server event directly, and the web progress panel consumes it. Those
backend-owned paths remain valid and are not part of native `autobyteus-ts`
tool removal.

## Intended Change

Perform a clean-cut decommission of the native ToDo capability:

1. Remove the four native tool classes, context type, barrels, registrations,
   tests, and native ToDo model/schema files.
2. Remove `AgentRuntimeState.todoList` and the native notifier/event/stream
   payload path, including the native stream enum value and
   `streamTodoUpdates()`.
3. Remove the single AutoByteus server converter mapping and its test row that
   consume the removed native stream enum.
4. Update active `autobyteus-ts` documentation to recommend existing file/skill
   workflows and distinguish them from server/backend-owned TODO events.
5. Preserve generic local tools, skill loading, `ToolCategory.TASK_MANAGEMENT`
   for server-owned task tools, and the server/Codex/web `TODO_LIST_UPDATE`
   contract.

No replacement skill, migration, compatibility alias, registry tombstone, or
fallback native tool path is introduced.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | REQ-001; AC-001, AC-002 | Native agent tool-schema composition | `registerTools()` registers the four classes; evidence: investigation source log and `src/tools/register-tools.ts` | Remove native names from registry/exports/schema; preserve unrelated local tool schema | `DS-001` |
| BEH-002 | System | REQ-002; AC-002, AC-003 | Native agent turn invokes a local tool | Tool -> `AgentRuntimeState.todoList` -> notifier -> native stream; evidence: `todo-tools/*.ts`, runtime state, notifier, AgentEventStream | Remove the native owner and event path; preserve other runtime/event flows | `DS-002` |
| BEH-003 | Contract | REQ-003; AC-004 | Codex/server backend emits supported plan/progress event | Codex converter -> server `AgentRunEventType.TODO_LIST_UPDATE` -> WebSocket -> web handler/store/panel | Preserve backend-owned server/web TODO event; remove only the AutoByteus-native adapter entry | `DS-003` |
| BEH-004 | User/System | REQ-004; AC-005 | Agent needs task tracking | Existing file tools and skills are available through the normal tool/skill pipelines | Native replacement path is existing workspace file + skill behavior; no new native list state | `DS-001` |
| BEH-005 | Contract | REQ-005; AC-006 | Reader uses active architecture/runtime docs | Active docs currently advertise native tools | Update docs to match the new ownership boundary; historical records remain historical | `DS-001`, `DS-003` |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / Behavior Change / Refactor
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure, with file/responsibility drift
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: Native ToDo tools, model, runtime state, notifier, stream contract, and server adapter are one obsolete capability. The model has no persistence or independent caller. The server/Codex web contract has a separate owner and remains valid.
- Design response: Remove the entire native slice through its authoritative boundaries; keep generic file/skill tooling and backend-owned TODO events at their existing owners.
- Refactor rationale: A registry-only deletion would leave dead exports and contracts and would retain an impossible native event path. A broader removal of server/web TODO events would incorrectly delete Codex behavior.
- Intentional deferrals and residual risk, if any: No replacement skill is added. External consumers of removed `autobyteus-ts` ToDo exports/enum names may break intentionally; delivery must call out the breaking surface.

## Terminology

- **Native ToDo capability:** The four local `autobyteus-ts` tool names plus their in-memory `ToDoList` owner and native `AgentEventStream` event path.
- **Backend-owned TODO event:** The server `AgentRunEventType.TODO_LIST_UPDATE` / WebSocket event emitted by backend adapters such as Codex; it is not a native `autobyteus-ts` tool contract.

## Design Reading Order

The design is read from the behavior map into three spines: native tool exposure/replacement, native event decommission, and preserved server/backend TODO delivery. Ownership and file changes follow those spines.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Obsolete paths/files in this scope: the four native tool classes and context; `src/task-management` ToDo model/schema/barrels; `AgentRuntimeState.todoList`; `AGENT_DATA_TODO_LIST_UPDATED`; `notifyAgentDataTodoListUpdated`; `ToDoItemData` / `ToDoListUpdateData` / `createTodoListUpdateData`; `StreamEventType.AGENT_TODO_LIST_UPDATE`; `AgentEventStream.streamTodoUpdates()`; and the AutoByteus converter mapping/test row.
- No compatibility wrappers, dual registrations, aliases, or hidden fallback are allowed.
- The server/Codex/Web TODO event is not an obsolete native path and is explicitly preserved.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: No persisted native subject. The list was an in-memory `AgentRuntimeState.todoList` object.
- Relevant code-model, serialization, semantic, or physical-store change: Delete an in-memory field/model and transient native payload classes; no stored schema change.
- Normal reader/writer behavior and representative evidence: No native readers/writers or snapshot/restore serialization reference `todoList`; `rg` tracing found only runtime/tool/event paths.
- Required semantics and invariants under direct use: `N/A` for persisted data; server/web transient backend TODO events retain their current semantics.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: None for the removed native object.
- Decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): `Not Affected`
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: No native data exists to transform, preserve, or migrate. Adding migration machinery would be unjustified.
- Acceptance criteria or design constraints supported by this decision: REQ-006, AC-007.

### Migration Plan (Only When Decision Is `Migration Required`)

N/A — persisted-data decision is `Not Affected`.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-004 | Native agent turn / model tool-schema request | Existing workspace file or skill workflow | Local tool registry plus existing file/skill owners | Shows the supported replacement path and the absence of native ToDo tools without collapsing all tools into a generic helper |
| DS-002 | Return-Event | BEH-002 | Native tool invocation | AutoByteus server adapter | Native runtime/event owners being decommissioned | Shows every native owner and boundary that must be removed together |
| DS-003 | Primary End-to-End | BEH-003 | Codex/backend progress event | Web ToDo progress panel | Server backend event mapper | Proves the shared server/web TODO path is independent and must remain |

## Primary Execution Spine(s)

- `DS-001`: `Native Agent Turn -> Local Tool Registry -> LLM Tool Schema -> Existing File/Skill Tool -> Workspace To-Do File`
- `DS-003`: `Codex Backend Event -> Server Agent-Run Event -> Server WebSocket Mapper -> TODO_LIST_UPDATE Message -> Web Todo Handler/Store -> TodoListPanel`

The removed native branch is intentionally not retained in the target spine:
`Native ToDo Tool -> AgentRuntimeState.todoList -> Native Notifier -> Native AgentEventStream -> AutoByteus Converter` is decommissioned as `DS-002`.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A native agent turn composes tools from the default registry. The model no longer sees the four native ToDo names; when task tracking is needed it uses existing file tools and any installed skill to read/write a workspace file. | Local tool registry; file tools; skill discovery/loading; workspace file | Existing local tool/skill owners | Negative registry coverage; active docs; no replacement skill in scope |
| DS-002 | The old native tool invocation would mutate transient runtime state, notify listeners, create a typed stream event, and cross into the AutoByteus server adapter. The target design removes the branch at each owner boundary rather than leaving a no-op event. | Native tool classes; `AgentRuntimeState`; notifier; `AgentEventStream`; AutoByteus converter | Clean-cut decommission boundary across `autobyteus-ts` and its adapter | Tests and public export removal |
| DS-003 | Backend-owned Codex progress events become server agent-run events, are mapped to the existing WebSocket TODO message, and update the existing web store/panel. Nothing in this spine depends on native `autobyteus-ts` ToDo classes after the AutoByteus map row is removed. | Codex event converters; server mapper; web handler/store/panel | Server backend/event transport owners | Existing web coverage and payload shape |

## Spine Actors / Main-Line Nodes

- DS-001: native agent turn; default local tool registry/schema provider; existing file tools; skill discovery/loading; workspace file.
- DS-002: native ToDo tool classes; `AgentRuntimeState`; `AgentExternalEventNotifier`; `AgentEventStream`; AutoByteus stream converter (all removed or narrowed).
- DS-003: Codex event converter; server agent-run event; server message mapper; WebSocket client handler; web ToDo store/panel.

## Ownership Map

- **Default local tool registry / `registerTools()`:** owns first-party local tool exposure and schema availability. It will no longer register native ToDo classes.
- **File tools and skill system:** own file-based task tracking and skill behavior. They remain authoritative for the replacement workflow and are not expanded by this task.
- **`AgentRuntimeState`:** owns runtime lifecycle state, active turns, approvals, memory, and workspace identity. It no longer owns a ToDo list.
- **Native notifier / `AgentEventStream`:** continue to own remaining event adaptation; they no longer carry native ToDo events.
- **AutoByteus stream converter:** owns translation of remaining native `autobyteus-ts` stream events into server events. It no longer translates a removed native ToDo event.
- **Codex converters and server TODO mapper:** own backend-specific TODO progress event production and server transport. They remain authoritative for DS-003.
- **Web TODO handler/store/panel:** own presentation of server-level TODO messages. They remain unchanged.

No public facade secretly owns the removed ToDo capability. The package root and task-management barrels are narrowed by deletion rather than replaced with a compatibility facade.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `autobyteus-ts/src/index.ts` | Existing package subsystem barrels | Public package export boundary | Removed native ToDo state, tools, or compatibility aliases |
| `autobyteus-server-ts` AutoByteus event converter | Server event conversion owner | Backend adapter boundary | Native ToDo state or fallback event production |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/task-management/tools/todo-tools/*` and tool tests | No native model-facing ToDo capability | Existing file tools / skills | In This Change | Delete classes, context, barrels, and dedicated tests |
| `autobyteus-ts/src/task-management/{todo.ts,todo-list.ts,schemas/*,index.ts,tools/index.ts}` | No owner or caller remains after tool removal | None; file/skill workflow has different ownership | In This Change | Delete public native model/schema surface; no aliases |
| `AgentRuntimeState.todoList` | Only native tools mutate it | Existing runtime state fields | In This Change | Remove import and field/test assertion |
| `notifyAgentDataTodoListUpdated` / `AGENT_DATA_TODO_LIST_UPDATED` | Only native ToDo tools produce it | Remaining notifier/event set | In This Change | Remove method/enum/test assertion |
| `ToDoItemData`, `ToDoListUpdateData`, factory, stream enum/map, `streamTodoUpdates()` | No native producer remains | Server backend-owned TODO event path (not in this package) | In This Change | Remove imports, union entries, mapping, generator, focused tests |
| AutoByteus converter native TODO mapping | Consumes removed native enum | Remaining converter mappings | In This Change | Remove one map/test row only |
| Active docs’ native ToDo claims | They would advertise removed capability | File/skill docs and backend boundary explanation | In This Change | Historical ticket records excluded |
| New ToDo skill | Not required to remove tools and user proposed it as an alternative, not an implementation ask | Existing skill infrastructure | Follow-up / Not planned | Do not create without a separate approved skill requirement |

## Return Or Event Spine(s) (If Applicable)

- **Removed DS-002 return/event path:** `Native ToDo Tool -> AgentExternalEventNotifier -> AgentEventStream -> StreamEvent -> AutoByteusStreamEventConverter`. Every node is removed or narrowed so a native ToDo update cannot be emitted or mapped.
- **Preserved DS-003 event path:** `Codex Event Converter -> AgentRunEventType.TODO_LIST_UPDATE -> agent-run-event-message-mapper -> ServerMessageType.TODO_LIST_UPDATE -> web todoHandler/store`. This remains server-owned and does not call into native ToDo classes.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `AgentEventStream`.
  - Old bounded local dispatch: `Notifier event subscription -> event-type switch -> ToDo payload factory -> native StreamEvent -> queue`.
  - Target: remove the ToDo switch branch while keeping the remaining event-type dispatch cycle.
- Parent owner: `ToolRegistry`.
  - Target bounded cycle: `registerTools() -> register remaining local tools -> schema provider reads remaining definitions`.
  - The removed ToDo definitions do not participate in this cycle.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Negative registry coverage | DS-001 | Tool registry | Prove removed names are absent and unrelated tools remain | Clean-cut removal safety | If used as a runtime filter, stale names could remain in exports/implementations |
| Active documentation | DS-001, DS-003 | Package/server boundary readers | Explain file/skill replacement and backend TODO ownership | Prevent reintroduction/confusion | If treated as implementation logic, docs could become a hidden compatibility promise |
| Public breaking-surface note | DS-001, DS-002 | Delivery owner | Record removed imports/names for downstream consumers | Honest release handoff | If added as aliases, it would violate clean-cut removal |
| Historical ticket records | DS-001 | Delivery/review readers | Preserve historical evidence | Keep audit history accurate | Editing them as active docs would create false current-state claims |

## Ownership Boundaries

- `registerTools()` / `ToolRegistry` is authoritative for first-party local tool exposure; callers must use its resulting definitions and may not rely on removed class imports.
- `AgentRuntimeState` is authoritative for live native runtime lifecycle state; it must not retain a disconnected ToDo field after the owning tools are removed.
- `AgentEventStream` is authoritative for native internal-event-to-stream adaptation; it must not provide a native ToDo stream event with no producer.
- `AutoByteusStreamEventConverter` is authoritative for adapting remaining native stream events to server events; it must not reconstruct the removed list or accept a removed enum value.
- Codex event converters and the server WebSocket mapper are authoritative for backend-owned TODO progress events; native package removal must not bypass or mutate those boundaries.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ToolRegistry` / `registerTools()` | Local tool definitions and schema providers | Agent tool exposure and invocation setup | Importing removed ToDo classes or manually injecting legacy definitions | Strengthen generic file/skill exposure only; do not recreate ToDo tools |
| `AgentRuntimeState` | Live turn/runtime state | Runtime lifecycle and tool phases | Re-adding a `todoList` field without an owning capability | Add only state required by a separately approved feature |
| `AgentEventStream` | Native notifier subscriptions and stream queue | AutoByteus backend adapter | Synthesizing native TODO events from generic file writes | Use server/backend event owner if a backend needs progress updates |
| Server TODO event mapper | Server-level event-to-WebSocket conversion | Codex/other backend event pipelines and web clients | Routing native file/skill content through a server TODO message | Extend the owning backend event contract in a separate design |

## Dependency Rules

- `autobyteus-ts` tool registry may depend on remaining local tool modules, not on removed ToDo modules.
- `AgentRuntimeState` and native stream/event code must not import `src/task-management` after deletion.
- `autobyteus-server-ts` AutoByteus event conversion may depend on remaining `autobyteus-ts` `StreamEventType` values, not on removed ToDo values.
- Server Codex converters may continue to emit server `AgentRunEventType.TODO_LIST_UPDATE`; this must not be implemented by reintroducing native `autobyteus-ts` types.
- Web TODO handlers remain downstream of server messages and must not import native `autobyteus-ts` ToDo model classes.
- `ToolCategory.TASK_MANAGEMENT` remains a shared category for server-owned task tools; removing native ToDo tools must not remove or redefine the category.
- Forbidden shortcuts: registry-only filtering, compatibility aliases, hidden fallback registrations, generic file-write interception that fabricates TODO events, or direct frontend reconstruction of native lists.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `registerTools()` | Local tool exposure | Register supported first-party local tools | No caller identity; process-level registry | The four native ToDo names are absent after registration |
| `ToolCategory.TASK_MANAGEMENT` | Tool classification | Classify server-owned task-management tools | Enum value | Retained despite native ToDo removal |
| `AgentRuntimeState` constructor/fields | Native runtime lifecycle | Store supported live runtime state | `agentId`, optional workspace path/custom data | No `todoList` field in target |
| `AutoByteusStreamEventConverter.convert()` | Native-to-server event adapter | Translate supported native stream events | `StreamEvent` with remaining `StreamEventType` values | Native ToDo stream value is no longer accepted |
| `AgentRunEventType.TODO_LIST_UPDATE` | Server backend event | Represent backend-owned TODO progress | Server run identity plus serialized payload | Preserved for Codex and other server backends |
| `ServerMessageType.TODO_LIST_UPDATE` | WebSocket transport | Deliver server TODO progress | Existing server message payload | Preserved; not a native tool API |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `registerTools()` | Yes | Yes | Low | Remove four definitions at the owning registry boundary |
| `AgentRuntimeState` | Yes | Yes | Low | Remove ownerless `todoList` field |
| `AgentEventStream` | Yes | Yes | Low | Remove native TODO branch/generator |
| `AutoByteusStreamEventConverter` | Yes | Yes | Low | Remove native mapping; keep remaining event map |
| Server `TODO_LIST_UPDATE` | Yes | Yes | Low | Preserve as backend-owned contract |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Native tool capability | Removed | N/A | Historical native names could be reintroduced | Delete instead of aliasing |
| File/skill workflow | Existing file tools / skills | Yes | Low | Reuse existing owners |
| Backend TODO event | `TODO_LIST_UPDATE` | Yes | Medium because it resembles removed native names | Keep and document server/backend ownership explicitly |
| Tool classification | `TASK_MANAGEMENT` | Yes | Medium because native use disappears | Retain for server-owned task tools |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| File-backed task tracking | `autobyteus-ts` file tools | Reuse | Existing read/write/edit/run-bash capabilities already operate on workspace files | N/A |
| Optional task workflow guidance | `autobyteus-ts` skill system | Reuse | Existing skill discovery/loading can provide instructions without a native state owner | N/A |
| Backend progress UI | Server event + web TODO stack | Reuse | Codex already owns this flow and has coverage | N/A |
| Native ToDo list owner | None after removal | Create New | Do not create; user request removes this capability | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` local tool registry | Supported native local tools | DS-001 | `ToolRegistry` | Extend | Remove four registrations; preserve remaining tools |
| `autobyteus-ts` file/skill system | File-backed planning workflow | DS-001 | File tools / skill loader | Reuse | No new skill or abstraction |
| `autobyteus-ts` runtime/events | Single-agent lifecycle and stream | DS-002 | `AgentRuntimeState`, `AgentEventStream` | Simplify | Remove native ToDo state/event slices |
| Server AutoByteus adapter | Native stream translation | DS-002 | `AutoByteusStreamEventConverter` | Simplify | Remove one mapping only |
| Server backend event transport + web progress | Backend-owned TODO progress | DS-003 | Server mapper / web handlers | Reuse | Preserve Codex/server TODO contract |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/register-tools.ts` | Local registry | `registerTools()` | Remove native imports/registrations | Single registration composition point | Existing registry |
| `autobyteus-ts/src/agent/context/agent-runtime-state.ts` | Runtime | `AgentRuntimeState` | Remove native field/import | Single runtime state owner | Existing state types |
| `autobyteus-ts/src/events/event-types.ts` | Runtime events | `EventType` | Remove native internal event | Single enum owner | Existing event enum |
| `autobyteus-ts/src/agent/events/notifiers.ts` | Runtime events | `AgentExternalEventNotifier` | Remove native notifier method | Single notifier API owner | Existing EventType |
| `autobyteus-ts/src/agent/streaming/events/stream-event-payload-lifecycle.ts` | Native stream | Payload/factory owner | Remove native payload classes/factory | Lifecycle payloads already co-located | Existing payload utils |
| `autobyteus-ts/src/agent/streaming/events/stream-event-payloads.ts` | Native stream | Payload barrel | Remove exports/union member | Central export/type union | Existing payload classes |
| `autobyteus-ts/src/agent/streaming/events/stream-events.ts` | Native stream | `StreamEventType` | Remove enum/map entry | Central stream contract | Existing payload union |
| `autobyteus-ts/src/agent/streaming/streams/agent-event-stream.ts` | Native stream | `AgentEventStream` | Remove switch branch/generator | Single event adapter owner | Existing queue |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts` | Server adapter | `AutoByteusStreamEventConverter` | Remove native map entry | Single native adapter map | Existing server event types |
| Active docs listed below | Documentation | Docs owners | Replace obsolete claims | Each document has one boundary concern | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Native ToDo item/list shapes | None after removal | N/A | No remaining native owner or consumer | N/A | N/A | A compatibility DTO or server event mirror |
| Backend TODO event payload | Existing server domain/transport types | Server backend event transport | Already used by Codex and web path | Existing | Existing | A native `autobyteus-ts` model |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Server `TODO_LIST_UPDATE` payload | Yes | Yes | Low | Preserve existing server-owned shape; do not merge native model back in |
| `ToolCategory.TASK_MANAGEMENT` | Yes | Yes | Low | Retain shared classification for server tools |
| Native `ToDo` / `ToDoList` | N/A after removal | N/A | None | Delete rather than extract/shared-modelize |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/register-tools.ts` | Local tool registry | `registerTools()` | Supported first-party local registrations only | Existing central owner; deletion stays local | `ToolRegistry` |
| `autobyteus-ts/src/agent/context/agent-runtime-state.ts` | Agent runtime | `AgentRuntimeState` | Supported live runtime state only | Removes dead field without reshaping state | Existing turn/memory types |
| `autobyteus-ts/src/events/event-types.ts` | Agent events | `EventType` | Supported internal event names | Existing enum remains single owner | N/A |
| `autobyteus-ts/src/agent/events/notifiers.ts` | Agent events | `AgentExternalEventNotifier` | Supported notifier methods | Existing notifier remains single owner | `EventType` |
| `autobyteus-ts/src/agent/streaming/events/stream-event-payload-lifecycle.ts` | Agent stream | Lifecycle payloads | Remaining lifecycle payload classes/factories | Existing lifecycle grouping remains readable | `BaseStreamPayload` |
| `autobyteus-ts/src/agent/streaming/events/stream-event-payloads.ts` | Agent stream | Payload public barrel/union | Remaining payload exports/types | Central public stream payload boundary | Existing lifecycle payloads |
| `autobyteus-ts/src/agent/streaming/events/stream-events.ts` | Agent stream | `StreamEvent` / `StreamEventType` | Remaining native stream contract | Central enum-to-payload mapping | Payload union |
| `autobyteus-ts/src/agent/streaming/streams/agent-event-stream.ts` | Agent stream | `AgentEventStream` | Remaining event-to-stream adaptation | Single queue/adapter owner | Existing queue |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts` | Server AutoByteus adapter | Converter | Remaining native-to-server event mapping | Single backend adapter | Server `AgentRunEventType` |
| `autobyteus-ts/docs/agent_team_design.md` | Active docs | Architecture boundary doc | File/skill replacement and backend TODO distinction | Single boundary explanation | N/A |
| `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` | Active docs | Runtime/task doc | Remove native ToDo claims | Single workflow explanation | N/A |
| `autobyteus-ts/docs/agent_team_streaming_protocol.md` | Active docs | Streaming doc | Remove native ToDo stream claim | Single protocol explanation | N/A |

## Applied Patterns (If Any)

- **Clean-cut decommissioning:** delete obsolete owner, source, exports, tests, and event paths rather than retaining compatibility wrappers.
- **Authoritative boundary preservation:** use existing file/skill owners for file-backed planning and existing server backend/transport owners for TODO progress events.
- **Proportionate persisted-state handling:** classify the native list as `Not Affected` because it is not persisted; do not add migration machinery.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/register-tools.ts` | File | Local registry | Remove native ToDo registrations | Existing exposure boundary | Legacy native names |
| `autobyteus-ts/src/agent/context/agent-runtime-state.ts` | File | Runtime state | Remove `todoList` | Existing state owner | Orphaned task state |
| `autobyteus-ts/src/events/event-types.ts` | File | Internal events | Remove native ToDo event | Existing event enum owner | Compatibility event alias |
| `autobyteus-ts/src/agent/events/notifiers.ts` | File | Event notifier | Remove native notification method | Existing notifier owner | Re-emitted native list events |
| `autobyteus-ts/src/agent/streaming/events/stream-event-payload-lifecycle.ts` | File | Stream payloads | Remove ToDo classes/factory | Existing lifecycle payload owner | Server TODO payload mirror |
| `autobyteus-ts/src/agent/streaming/events/stream-event-payloads.ts` | File | Stream payload barrel | Remove ToDo exports/union | Existing public stream boundary | Removed payload names |
| `autobyteus-ts/src/agent/streaming/events/stream-events.ts` | File | Stream contract | Remove ToDo enum/map entry | Existing stream contract owner | Native TODO fallback |
| `autobyteus-ts/src/agent/streaming/streams/agent-event-stream.ts` | File | Stream adapter | Remove ToDo listener/stream generator | Existing event adapter owner | Synthesized file-write events |
| `autobyteus-ts/src/task-management/` | Folder | Removed native capability | Delete entire native ToDo folder | No owner remains after removal | Empty compatibility barrels |
| `autobyteus-ts/tests/unit/task-management/` ToDo tests | Folder content | Native capability coverage | Delete model/schema/tool tests; retain or relocate unrelated legacy negative coverage as appropriate | Tests must not assert removed behavior | Stale positive expectations |
| `autobyteus-ts/tests/unit/tools/native-todo-tools-removed.test.ts` | File | Registry continuity coverage | Add negative registry test for four names and positive generic-tool checks | Stable test location independent of deleted source folder | Tool implementation behavior |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts` | File | Server AutoByteus adapter | Remove native TODO map row | Downstream compile boundary | Native list reconstruction |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.test.ts` | File | Server adapter coverage | Remove native enum mapping row | Keeps test aligned with target contract | Codex TODO coverage changes |
| `autobyteus-ts/docs/agent_team_{design,runtime_and_task_coordination,streaming_protocol}.md` | Files | Active docs | Describe file/skill replacement and backend event split | Existing docs are the authoritative active explanation | Claims that native tools remain |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools` | Main-Line Domain-Control / tool exposure | Yes | Low | Keep registry and generic tool owners together under existing layout |
| `autobyteus-ts/src/agent/context` | Main-Line Domain-Control / runtime | Yes | Low | Remove only the dead state field |
| `autobyteus-ts/src/agent/streaming` | Transport | Yes | Low | Retain remaining stream contract and remove obsolete event |
| `autobyteus-ts/src/task-management` | Removed | N/A | N/A | Delete; retaining an empty folder/barrel would imply a supported native owner |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events` | Transport / adapter | Yes | Low | Narrow existing converter; no new cross-boundary helper |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| File-backed replacement | `Agent -> write_file({ path: "TODO.md", content: ... })` or an existing task skill using file tools | `Agent -> add_todo -> hidden ToDoList` | The replacement is ordinary workspace state with existing owners, not a new native runtime model |
| Backend TODO distinction | `Codex event -> server TODO_LIST_UPDATE -> web TodoListPanel` | `Native autobyteus-ts file write -> fabricated TODO_LIST_UPDATE` | Prevents removal from accidentally breaking valid Codex progress or recreating native coupling |
| Clean removal | `registerTools()` contains remaining local tools only; removed names have no exports | `registerTools()` filters old names while old classes/aliases remain | The target has no hidden legacy path or ambiguous public surface |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `add_todo` etc. registered but mark deprecated | Could avoid immediate model failures | Rejected | Remove definitions and use file/skill workflow |
| Export aliases for `ToDoList` / tool classes | Could keep downstream imports compiling | Rejected | Remove native source and root/barrel exports |
| Retain `AGENT_TODO_LIST_UPDATE` as a no-op/forwarding event | Could preserve native stream enum compatibility | Rejected | Remove native event; preserve server/Codex TODO event at its proper owner |
| Keep AutoByteus converter map accepting removed enum values | Could tolerate old native event producers | Rejected | Remove map entry and old producer together |
| Remove server/Web UI `TODO_LIST_UPDATE` too | Could eliminate all “todo” names globally | Rejected | Preserve backend-owned Codex/server event and UI contract |

## Derived Layering (If Useful)

N/A. The behavior is clearer as ownership-led removal and backend-boundary separation than as a new layer stack.

## Change / Refactor Sequence

1. Confirm requirements/design scope and branch/worktree context.
2. Remove native ToDo source files/tests and the `registerTools()` imports/registrations; remove package/task-management exports and `AgentRuntimeState.todoList`.
3. Remove the native event enum/notifier method, stream payload classes/factory/exports/union, native stream enum/map entry, `AgentEventStream` branch/generator, and focused tests.
4. Remove the AutoByteus converter mapping/test row so server compilation no longer refers to the deleted native enum. Do not touch server-level Codex TODO mapping.
5. Update the focused negative registry coverage and active `autobyteus-ts` docs. Keep historical ticket records unchanged.
6. Run source searches, `autobyteus-ts` type/build/focused tests, and server AutoByteus converter type/test checks. Run downstream API/E2E coverage investigation before durable coverage execution per team workflow.
7. If generated `dist` is recreated locally, treat it as ignored build output unless repository policy explicitly tracks it; ensure no generated files are staged accidentally.

No temporary seam is needed because all in-repository producers and the single downstream native consumer are changed in one clean cut.

## Key Tradeoffs

- **Remove native event wiring too:** This makes the removal coherent and prevents a dead public stream enum, but is a breaking change for external consumers of native ToDo stream types.
- **Preserve server/web TODO events:** This retains Codex/backend progress UX even though the native AutoByteus panel no longer receives updates; it respects the actual backend ownership split.
- **No replacement skill:** Avoids inventing unrequested product behavior; existing file and skill infrastructure is already sufficient.
- **No migration:** Correctly avoids work for non-persisted state, but any in-flight native list disappears with the runtime as before because it was never durable.

## Risks

- External consumers may import removed native classes, barrels, or stream enum values; this is an intentional breaking surface.
- A stale generated build directory could make local searches appear to find removed artifacts; source and tracked-file searches must distinguish ignored `dist` output.
- Documentation wording must avoid implying that all server `TODO_LIST_UPDATE` events were removed; only native `autobyteus-ts` emission is gone.

## Guidance For Implementation

- Use the exact file inventory and sequence above; do not implement a generic “disabled tool” filter.
- Keep `ToolCategory.TASK_MANAGEMENT` because server-owned task-delegation tools import and use it.
- When editing `stream-event-payload-lifecycle.ts`, remove only the ToDo classes/factory and preserve adjacent artifact/system/inter-agent payloads.
- Remove the ToDo imports from the payload barrel, stream event map, and AgentEventStream; let TypeScript identify any missed native references.
- Update stale negative tests that assert `add_todo` remains. Add a dedicated registry test asserting all four removed names are absent and generic file tools remain.
- Do not delete `autobyteus-web` ToDo handler/store/panel or server `AgentRunEventType.TODO_LIST_UPDATE`; verify they are still fed by Codex/server paths.
- Record the breaking native API/tool removal in implementation and delivery handoffs.
