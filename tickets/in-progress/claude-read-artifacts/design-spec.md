# Design Spec

## Current-State Read

Current backend event flow is runtime-specific conversion followed by direct fan-out:

```txt
Claude/Codex/AutoByteus raw event
  -> runtime-specific converter
  -> AgentRunEvent
  -> backend listener dispatch
  -> AgentRun subscribers / streaming / sidecar services
```

The Artifacts bug comes from an ownership leak after this conversion. `RunFileChangeService` is attached to every active `AgentRun` by `AgentRunManager.registerActiveRun(...)`. It listens to broad normalized events (`SEGMENT_*`, `TOOL_EXECUTION_*`, `TOOL_DENIED`) and derives/publishes `FILE_CHANGE_UPDATED` itself. That means the projection/persistence owner also tries to understand every tool's semantics.

The specific Claude bug path is:

```txt
Claude Read(file_path)
  -> ClaudeSessionEventConverter emits TOOL_EXECUTION_STARTED / TOOL_EXECUTION_SUCCEEDED
  -> RunFileChangeService sees file_path while looking for generated outputs
  -> RunFileChangeService publishes FILE_CHANGE_UPDATED
  -> frontend Artifacts tab shows a read-only source file
```

Codex appears correct because its file-change path is already closer to a semantic normalized edit-file event. But the current global derivation approach is still fragile: any non-file tool with an ambiguous path-like field can be misclassified.

Current event names also encode a projection action (`FILE_CHANGE_UPDATED`) rather than the normalized domain fact (`FILE_CHANGE`). The user explicitly requested clean code and no compatibility retention, so the target should remove the old name rather than alias it.

## Intended Change

Introduce a single post-normalization event processing boundary. Runtime converters keep converting provider events to base normalized events. Then an ordered `AgentRunEventPipeline` runs processors that may append additional normalized events. `FILE_CHANGE` becomes one derived event produced by a `FileChangeEventProcessor`.

Target flow:

```txt
Runtime raw event
  -> runtime-specific normalizer
  -> base AgentRunEvent[]
  -> AgentRunEventPipeline
       -> FileChangeEventProcessor and future processors
  -> final AgentRunEvent[]
  -> publish to subscribers/frontend/sidecar services
```

For the reported case:

```txt
Claude Read(file_path)
  -> TOOL_EXECUTION_STARTED / TOOL_EXECUTION_SUCCEEDED
  -> FileChangeEventProcessor emits nothing
  -> no Artifacts row
```

For real file impact:

```txt
Claude Write(file_path)
  -> TOOL_EXECUTION_STARTED / TOOL_EXECUTION_SUCCEEDED
  -> FileChangeEventProcessor emits FILE_CHANGE
  -> RunFileChangeService persists projection
  -> frontend Artifacts tab renders the changed file
```

`RunFileChangeService` must stop deriving and publishing file-change events. It becomes a durable projection/persistence consumer of `FILE_CHANGE` only.



### Existing Autobyteus Customization Processors

`autobyteus-server-ts` already has server-owned customization processors for the AutoByteus runtime. They are useful evidence, but they are **not** the right owner for this file-change design.

Current categories found:

- input processors under `agent-customization/processors/prompt` and `security-processor`;
- LLM response processors under `persistence` and `response-customization`;
- tool invocation preprocessor under `tool-invocation`;
- backend factory support for `toolExecutionResultProcessors` and `lifecycleProcessors`;
- startup registration currently covers input, LLM response, and tool invocation preprocessors, but not a server-owned tool execution result processor.

Final design decision for this task:

- Do **not** use AutoByteus customization processors to emit server/web Artifacts file-change events.
- Use the cross-runtime `AgentRunEventPipeline` as the sole server-side derivation boundary.
- `FileChangeEventProcessor` checks normalized tool lifecycle/segment events from AutoByteus, Claude, and Codex, then appends `AgentRunEventType.FILE_CHANGE` when the tool is known to write/edit/produce a file.
- Native `autobyteus-ts` `StreamEventType.FILE_CHANGE` is out of scope for this task. It can be considered later only if standalone `autobyteus-ts` consumers need first-class file-change streaming outside `autobyteus-server-ts`.

### Autobyteus-ts Generated Media Coverage

The design explicitly covers the `autobyteus-ts` multimedia tools:

- `autobyteus-ts/src/tools/multimedia/image-tools.ts` `GenerateImageTool` requires `output_file_path`, writes the downloaded image to the resolved path, and returns `{ file_path: resolvedPath }`.
- `autobyteus-ts/src/tools/multimedia/image-tools.ts` `EditImageTool` has the same output contract.
- `autobyteus-ts/src/tools/multimedia/audio-tools.ts` `GenerateSpeechTool` requires `output_file_path`, writes the downloaded audio to the resolved path, and returns `{ file_path: resolvedPath }`.

So the implementation must not rely on generic `file_path` for every tool. It should recognize these known generated-output tools and emit `FILE_CHANGE` only after successful execution.

Final placement for this task:

```txt
autobyteus-ts tool lifecycle stream
  -> AutoByteusStreamEventConverter
  -> normalized TOOL_EXECUTION_STARTED/SUCCEEDED
  -> AgentRunEventPipeline
  -> FileChangeEventProcessor
  -> FILE_CHANGE
```

The individual multimedia tool classes remain simple: they write files and return results. The AutoByteus customization processor system is not used for this server/web file-change path.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug fix + behavior change + refactor.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary or ownership issue, shared-structure looseness, and missing invariant.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence: `RunFileChangeService` currently listens to unrelated normalized events, interprets tool semantics broadly, treats projection output as event output, and emits `FILE_CHANGE_UPDATED` itself. A Claude `Read` probe produced a false artifact row.
- Design response: Add an authoritative event-processing boundary after normalization. Move file-change derivation into `FileChangeEventProcessor`. Rename `FILE_CHANGE_UPDATED` to `FILE_CHANGE`. Make `RunFileChangeService` consume only file-change events.
- Refactor rationale: A local classifier tweak would fix this one symptom but preserve the wrong owner. The user explicitly identified the better long-term event-chain design, and the bug is caused by the absence of that boundary.
- Intentional deferrals and residual risk, if any: Historical cleanup of already-persisted polluted `file_changes.json` rows is deferred because the user asked for runtime bug/design correction, not migration of old run state.

## Terminology

- `Base normalized event`: an `AgentRunEvent` emitted directly by a runtime-specific normalizer from a provider/raw runtime event.
- `Derived normalized event`: an `AgentRunEvent` appended by a post-normalization processor.
- `AgentRunEventPipeline`: the ordered post-normalization boundary that applies processors before publishing events.
- `FileChangeEventProcessor`: the processor that emits `AgentRunEventType.FILE_CHANGE` for explicit file-impacting semantics only.
- `RunFileChangeService`: the durable run-scoped projection/persistence consumer for `FILE_CHANGE` events.

## Design Reading Order

1. Runtime event normalization spine.
2. Post-normalization processor spine.
3. File-change derivation and projection spine.
4. File/folder responsibility mapping.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove `FILE_CHANGE_UPDATED` as an event/protocol name; remove broad file-change derivation from `RunFileChangeService`; remove tactical helper files that only support the old service-side derivation path.
- No `FILE_CHANGE_OBSERVED` / `FILE_CHANGE_UPDATED` two-event split.
- No frontend compatibility branch that accepts both event names.
- No generic `file_path` generated-output heuristic.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Claude/Codex/AutoByteus raw runtime event | Final normalized event stream to subscribers | `AgentRunEventPipeline` after runtime converter | Establishes where derived events are appended once before fan-out. |
| DS-002 | Primary End-to-End | Normalized file-impact base event | `FILE_CHANGE` event | `FileChangeEventProcessor` | Replaces broad `RunFileChangeService` guessing. |
| DS-003 | Primary End-to-End | `FILE_CHANGE` event | Artifacts tab and `file_changes.json` | `RunFileChangeService` + frontend file-change handler | Keeps projection/persistence separate from derivation. |
| DS-004 | Primary End-to-End | Claude `Read(file_path)` | Activity-only stream; no artifacts | `FileChangeEventProcessor` exclusion invariant | Directly validates the reported bug. |
| DS-005 | Bounded Local | One normalized event batch | Processed accumulated event batch | `AgentRunEventPipeline` | Defines safe future custom processor behavior. |
| DS-006 | Return-Event | Hydrated run file changes query | Frontend Artifacts store | `RunFileChangeService` projection query | Preserves reopen/hydration behavior. |

## Primary Execution Spine(s)

- DS-001: `Runtime raw event -> Runtime-specific normalizer -> base AgentRunEvent[] -> AgentRunEventPipeline -> final AgentRunEvent[] -> backend subscriber fan-out`
- DS-002: `base normalized write/edit/generated-output event -> FileChangeEventProcessor -> canonical FILE_CHANGE payload -> final event batch`
- DS-003: `FILE_CHANGE -> RunFileChangeService projection/persistence -> file_changes.json + getRunFileChanges hydration -> frontend Artifacts store`
- DS-004: `Claude Read -> TOOL_EXECUTION_STARTED/SUCCEEDED -> FileChangeEventProcessor no-op -> activity stream only`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Every runtime still owns provider-specific translation, but it must pass the converted batch through one post-normalization pipeline before publishing. | Raw event, runtime normalizer, event pipeline, backend dispatch | `AgentRunEventPipeline` for derived events; runtime converter for raw translation | Processor registration, batch ordering, listener fan-out |
| DS-002 | File changes are now explicit derived events. The processor recognizes known file-impact semantics and appends `FILE_CHANGE`; it ignores read-only events. | Normalized tool/segment event, file-change processor, `FILE_CHANGE` | `FileChangeEventProcessor` | Tool semantics registry, invocation state, path canonicalization, type inference |
| DS-003 | Artifacts projection receives first-class file-change events and persists them. It no longer has to understand arbitrary tool lifecycle events. | `FILE_CHANGE`, run-file-change projection, projection store, frontend store | `RunFileChangeService` for durable projection | Store write queue, hydration, frontend protocol mapping |
| DS-004 | Claude reads remain visible as activity because base lifecycle events remain unchanged, but no file-change event is appended. | Claude converter, base lifecycle events, file-change processor no-op | `FileChangeEventProcessor` exclusion invariant | Regression logging |
| DS-005 | Processors run in deterministic order against one accumulated batch. Future processors can append custom events without creating event-bus loops. | Initial batch, ordered processors, accumulated batch | `AgentRunEventPipeline` | Processor contracts, no recursive self-publication |
| DS-006 | Reopened runs hydrate persisted projection entries using the existing run-history/file-change query shape, renamed to the new event semantics where needed. | Projection store, query service, frontend hydration | `RunFileChangeService` | Projection normalization |

## Spine Actors / Main-Line Nodes

- Runtime-specific event normalizers:
  - `ClaudeSessionEventConverter`
  - `CodexThreadEventConverter`
  - `AutoByteusStreamEventConverter`
- `AgentRunEventPipeline`
- `AgentRunEventProcessor` implementations
- `FileChangeEventProcessor`
- Backend event dispatch/fan-out
- `RunFileChangeService`
- Agent streaming protocol mapper and frontend file-change handler

## Ownership Map

- Runtime normalizers own provider/raw event translation into base normalized event semantics. They must not own durable artifact projection.
- `AgentRunEventPipeline` owns ordered post-normalization processing before event publication. It owns sequencing, processor invocation, and append-only derived event flow.
- `AgentRunEventProcessor` owns a single derived-event concern. Processors return events; they must not publish to listeners directly.
- `FileChangeEventProcessor` owns the invariant: only explicit file-impacting operations emit `FILE_CHANGE`.
- `RunFileChangeService` owns durable run-scoped file-change projection and persistence. It consumes `FILE_CHANGE` only.
- Frontend file-change handler owns client projection into `runFileChangesStore`; it must not infer file changes from unrelated activity events.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Backend `subscribeToEvents(...)` | Runtime backend + `AgentRunEventPipeline` | Exposes the final normalized event stream to subscribers | Processor policy or file-change projection |
| Agent streaming message mapper | Streaming protocol | Converts normalized event names/payloads to websocket messages | Runtime/tool classification |
| Frontend `fileChangeHandler` | `runFileChangesStore` | Applies file-change events to client state | Filtering bad backend semantics |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `AgentRunEventType.FILE_CHANGE_UPDATED` | Redundant event name; old projection-oriented wording | `AgentRunEventType.FILE_CHANGE` | In This Change | Clean rename; no alias. |
| `ServerMessageType.FILE_CHANGE_UPDATED` and frontend protocol type | Same public event rename | `FILE_CHANGE` protocol message | In This Change | Update tests/docs. |
| `RunFileChangeService` handling of `SEGMENT_*` / `TOOL_EXECUTION_*` / `TOOL_DENIED` | Projection service must not derive file changes from broad events | `FileChangeEventProcessor` | In This Change | Service consumes `FILE_CHANGE` only. |
| `RunFileChangeService.publishEntry(...)` as local event emitter | Service should not issue file-change events | Event pipeline emits `FILE_CHANGE` before fan-out | In This Change | Service persists/projections only. |
| Generic generated-output derivation from arbitrary successful tools | Caused read-file false positives | Known generated-output registry in `FileChangeEventProcessor` | In This Change | Explicit output semantics only. |
| `FILE_CHANGE_OBSERVED` addendum idea | User rejected two events as redundant | Single `FILE_CHANGE` event | In This Change | Superseded design note only. |
| Tactical service-side classifier helper files from earlier draft | Belong to old derivation owner if not reused by processor | Processor-owned semantics files | In This Change | Move/recreate under processor ownership or delete. |

## Return Or Event Spine(s) (If Applicable)

Live event spine:

```txt
Final AgentRunEvent[]
  -> Agent streaming mapper
  -> websocket ServerMessage(FILE_CHANGE)
  -> frontend fileChangeHandler
  -> runFileChangesStore
  -> ArtifactsTab
```

Durable projection spine:

```txt
Final AgentRunEvent(FILE_CHANGE)
  -> RunFileChangeService
  -> run-scoped projection upsert
  -> <memoryDir>/file_changes.json
  -> getRunFileChanges(runId)
  -> frontend hydration
```

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `AgentRunEventPipeline`
  - Chain: `base events -> accumulated events -> processor[0] appends -> processor[1] sees accumulated events -> final events`
  - Why it matters: enables future custom derived events while preventing recursive event-bus loops. A processor must not publish directly and must not reprocess its own emitted events in the same pass.

- Parent owner: `FileChangeEventProcessor`
  - Chain: `normalized tool/segment event -> tool semantics lookup -> invocation/path state -> canonical FILE_CHANGE payload`
  - Why it matters: generated-output and streaming write events may need invocation context, but that context belongs to explicit file-change derivation, not durable projection.

- Parent owner: `RunFileChangeService`
  - Chain: `FILE_CHANGE -> per-run operation queue -> projection upsert -> projection store write`
  - Why it matters: persistence must remain serialized per run and robust to rapid streaming updates.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Processor registration | DS-001, DS-005 | `AgentRunEventPipeline` | Provide default ordered processors | Keeps backends from knowing every processor | Backend-specific duplication |
| File-impact tool semantics | DS-002, DS-004 | `FileChangeEventProcessor` | Map known tool names/events to `write_file`, `edit_file`, or `generated_output` | Avoids generic path heuristics | Read-only path pollution |
| Invocation context cache | DS-002 | `FileChangeEventProcessor` | Correlate start/success/failure and output args/results | Needed for generated output and streaming | Projection service becomes detector again |
| Path canonicalization | DS-002, DS-003 | File-change event contract | Canonical path identity before live frontend update | Prevents live/hydrated path drift | Frontend/backend disagree on artifact rows |
| Artifact type inference | DS-002, DS-003 | File-change event contract | Infer image/audio/pdf/etc. from canonical path | Drives preview and icon behavior | UI-specific guessing |
| Projection persistence | DS-003, DS-006 | `RunFileChangeService` | Store durable entries and hydrate reopened runs | Artifacts must survive reopen | Event processor becomes storage owner |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Runtime event conversion | Existing backend converters | Reuse | They already own provider translation | N/A |
| Post-normalization derived events | No current common boundary | Create New | Current direct fan-out has no single safe hook | `RunFileChangeService` is too narrow and projection-specific |
| Durable file-change projection | `services/run-file-changes` | Extend/Refocus | It already owns persistence/hydration | Must remove detection concern |
| Agent streaming transport | `services/agent-streaming` and web streaming handlers | Extend/Rename | Existing protocol maps event names to UI handlers | N/A |
| Tool semantics for file change | Current tactical helpers / RFS logic | Move/Refactor | Semantics are needed, but ownership moves to normalized event processor | Keeping under RFS preserves wrong boundary |
| AutoByteus-only tool-result customization | Existing `autobyteus-ts` / server customization processor registries | Do Not Reuse In This Task | It is AutoByteus-only and would bypass the cross-runtime normalized event boundary | Could be a future standalone `autobyteus-ts` concern, but not server/web Artifacts |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent execution event processing | Processor contract, pipeline sequencing, default pipeline wiring | DS-001, DS-005 | Backends, runtime event stream | Create New | Main new architecture boundary. |
| File-change event derivation | Tool semantics, invocation context, canonical `FILE_CHANGE` payload emission | DS-002, DS-004 | `AgentRunEventPipeline` | Create New under event processing | Not a persistence service. |
| Run file changes | Projection store, projection normalization, hydration | DS-003, DS-006 | `RunFileChangeService` | Extend/Refocus | Detection removed. |
| Agent streaming protocol | Event-to-server-message mapping | DS-003 | Streaming services | Extend/Rename | `FILE_CHANGE_UPDATED` -> `FILE_CHANGE`. |
| Frontend run artifacts | Client projection and UI rendering | DS-003, DS-006 | `runFileChangesStore`, `ArtifactsTab` | Extend/Rename | Must not infer file changes. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-run-event-processor.ts` | Agent execution event processing | Processor contract | Define processor input/output contract | Stable public boundary for processors | `AgentRunEvent` |
| `agent-run-event-pipeline.ts` | Agent execution event processing | Pipeline | Ordered append-only processing | One sequencing owner | Processor contract |
| `default-agent-run-event-pipeline.ts` | Agent execution event processing | Pipeline factory | Register default processors | Keeps backend wiring thin | Processor classes |
| `file-change-event-processor.ts` | File-change event derivation | Processor | Emit `FILE_CHANGE` from known semantics | One derived-event concern | File-change contract |
| `file-change-tool-semantics.ts` | File-change event derivation | Semantics registry | Known write/edit/generated-output tools | Prevents scattered tool-name checks | Source tool type |
| `file-change-payload-builder.ts` | File-change event derivation | Payload builder | Canonical path/id/type/status construction | Keeps payload contract tight | Path identity/type inference |
| `run-file-change-service.ts` | Run file changes | Projection service | Consume `FILE_CHANGE`, persist/hydrate | Durable state owner | File-change payload type |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| File-change event payload/status/source/type | `agent-execution/domain/agent-run-file-change.ts` | Agent execution domain events | Used by processor, streaming mapper, RFS, tests | Yes: one `FILE_CHANGE` event name | Yes: no observed/updated split | A kitchen-sink artifact model |
| Canonical path identity | `agent-execution/domain/agent-run-file-change-path.ts` or moved current path identity | Agent execution domain events | Event payload must be canonical before live UI | Yes | Yes | UI-only path normalizer |
| Processor contract | `agent-run-event-processor.ts` | Agent execution event processing | Used by all processors | Yes | Yes | Generic service locator |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentRunEventType.FILE_CHANGE` | Yes | Yes | Low | Rename and remove old enum value. |
| `AgentRunFileChangePayload` | Yes | Yes | Medium | Keep it specific to file-change state: id/path/type/status/source/content; do not mix published-artifact metadata. |
| Processor output contract | Yes | Yes | Low | Append-only events; no direct publication. |
| Tool semantics registry | Yes | Yes | Medium | Split mutation tools from generated-output tools; do not let `file_path` alone imply output. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-event.ts` | Agent execution domain | Event enum | Rename `FILE_CHANGE_UPDATED` to `FILE_CHANGE` | Domain event names live here | N/A |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-file-change.ts` | Agent execution domain | File-change event contract | Define payload/status/source/type for `FILE_CHANGE` | Shared event contract | `AgentRunEvent` |
| `autobyteus-server-ts/src/agent-execution/events/agent-run-event-processor.ts` | Event processing | Processor API | Define `AgentRunEventProcessor` and input context | One boundary for future processors | Domain events |
| `autobyteus-server-ts/src/agent-execution/events/agent-run-event-pipeline.ts` | Event processing | Pipeline | Ordered processor execution and accumulation | One sequencing owner | Processor API |
| `autobyteus-server-ts/src/agent-execution/events/default-agent-run-event-pipeline.ts` | Event processing | Factory | Construct default pipeline with `FileChangeEventProcessor` | Keeps backends thin | Pipeline + processors |
| `autobyteus-server-ts/src/agent-execution/events/dispatch-processed-agent-run-events.ts` | Event processing | Dispatch helper | Process a batch once, then fan out final events | Prevents duplicate backend wiring | Pipeline + dispatch helper |
| `autobyteus-server-ts/src/agent-execution/events/processors/file-change/file-change-event-processor.ts` | File-change derivation | Processor | Emit `FILE_CHANGE` from explicit semantics | Single derived-event owner | File-change contract |
| `autobyteus-server-ts/src/agent-execution/events/processors/file-change/file-change-tool-semantics.ts` | File-change derivation | Semantics registry | Known mutation/generated-output tool mapping | Avoids scattered checks | Source tool type |
| `autobyteus-server-ts/src/agent-execution/events/processors/file-change/file-change-output-path.ts` | File-change derivation | Output path extractor | Extract explicit output/destination paths for known output tools | Prevents generic `file_path` pollution | Semantics registry |
| `autobyteus-server-ts/src/agent-execution/events/processors/file-change/file-change-payload-builder.ts` | File-change derivation | Payload builder | Build canonical payload/id/type/timestamps/content | Keeps event payload consistent | Path/type helpers |
| `autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts` | Run file changes | Projection service | Consume only `FILE_CHANGE`, persist projection, hydrate | Durable state owner | File-change payload contract |
| `autobyteus-server-ts/src/services/agent-streaming/agent-run-event-message-mapper.ts` | Streaming protocol | Mapper | Map `FILE_CHANGE` to websocket `FILE_CHANGE` | Protocol boundary | Event enum |
| Frontend streaming protocol/handler/store files | Frontend artifacts | Client projection | Rename and handle `FILE_CHANGE` | UI state owner | Payload contract mirrored in web types |
| `autobyteus-ts/src/tools/multimedia/image-tools.ts` / `audio-tools.ts` | AutoByteus tools | File-writing tools | No event ownership change; continue writing files and returning `{ file_path: resolvedPath }` | Tool classes own file creation, not server event derivation | `FILE_CHANGE` emission |
| `autobyteus-server-ts/src/startup/agent-customization-loader.ts` | AutoByteus runtime customization | Registration boundary | No change for this task | Customization processors are not the server/web `FILE_CHANGE` owner | Cross-runtime event pipeline wiring |

## Ownership Boundaries

`AgentRunEventPipeline` is the authoritative boundary for derived normalized events. Backends must call the pipeline after conversion and before listener fan-out. Backends must not call `FileChangeEventProcessor` directly.

`FileChangeEventProcessor` is the authoritative owner for deciding whether a normalized event implies file impact. `RunFileChangeService`, frontend handlers, and streaming mappers must not duplicate that decision.

`RunFileChangeService` is the authoritative durable projection owner. The event processor must not write `file_changes.json`, and callers above the service must not bypass it to read/write projection files.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentRunEventPipeline.process(...)` | Ordered processor list, accumulated event batch | Runtime backends | Backend invokes specific processor directly | Add pipeline context/options |
| `FileChangeEventProcessor.process(...)` | Tool semantics registry, invocation cache, payload builder | Event pipeline only | RFS or frontend reclassifies tool names | Add processor tests/semantics entries |
| `RunFileChangeService.attachToRun(...)` / `getProjectionForRun(...)` | Projection queue/store/normalizer | AgentRunManager, run-history query | Direct projection-store access by higher-level callers | Add service method |
| Streaming mapper | Server message type mapping | Streaming services | Frontend receives raw backend event names directly | Add mapper case |

## Dependency Rules

- Runtime converters may depend on domain event types, not on file-change projection services.
- Runtime backends may depend on the event pipeline boundary and dispatch helper, not on individual processors.
- Processors may depend on domain event contracts and their own processor-local helpers.
- `FileChangeEventProcessor` may use file-change domain payload helpers and explicit tool semantics; it must not import or call `RunFileChangeService` or projection store.
- `RunFileChangeService` may depend on file-change domain payload types and projection store; it must not inspect unrelated tool lifecycle events for derivation.
- Frontend may consume `FILE_CHANGE`; it must not inspect `TOOL_EXECUTION_*` / `SEGMENT_*` to infer artifacts.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentRunEventPipeline.process(input)` | Event batch | Return final base + derived events | `{ runContext, events }` | Append-only ordered processors. |
| `AgentRunEventProcessor.process(input)` | One processor concern | Return derived events | `{ runContext, events, sourceEvents }` | No direct publication. |
| `FileChangeEventProcessor.process(input)` | File-change derivation | Emit `FILE_CHANGE` for explicit file impact | Normalized events with runId/payload/tool metadata | Read-only tools no-op. |
| `RunFileChangeService.attachToRun(run)` | Durable projection | Subscribe and persist `FILE_CHANGE` only | `AgentRun` | Ignores unrelated events. |
| `getRunFileChanges(runId)` path | Projection hydration | Return persisted entries | Run id | Existing query semantics retained with renamed event contract. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentRunEventPipeline.process` | Yes | Yes | Low | Keep batch context explicit. |
| `FileChangeEventProcessor.process` | Yes | Yes | Medium | Use explicit semantics registry; reject unknown path-only tools. |
| `RunFileChangeService.attachToRun` | Yes after refactor | Yes | Low | Filter to `FILE_CHANGE` immediately. |
| Streaming protocol `FILE_CHANGE` | Yes | Yes | Low | Remove old event name. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| File-change event | `FILE_CHANGE` | Yes | Low | Clean rename from `FILE_CHANGE_UPDATED`. |
| Event pipeline | `AgentRunEventPipeline` | Yes | Low | Use for post-normalization events only. |
| Processor contract | `AgentRunEventProcessor` | Yes | Low | Keep append-only semantics in docs/tests. |
| Projection service | `RunFileChangeService` | Acceptable | Medium | Its implementation must become projection-only; optional future rename to `RunFileChangeProjectionService` not required for this scope. |

## Applied Patterns (If Any)

- Pipeline / ordered processor chain: used inside `AgentRunEventPipeline` to support future derived/custom events without backend-specific wiring.
- Registry: used only for file-change tool semantics lookup inside `FileChangeEventProcessor`; it must not become a business coordinator.
- Projection service: `RunFileChangeService` remains the persistence/projection owner.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/events/` | Folder | Event processing subsystem | Post-normalization pipeline and processor contracts | Event-processing boundary belongs with agent execution | Durable artifact persistence |
| `autobyteus-server-ts/src/agent-execution/events/processors/file-change/` | Folder | File-change event derivation | Processor-local file-change semantics/helpers | Derived event concern, not projection | Projection store writes |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-file-change.ts` | File | Domain event contract | Shared file-change event payload types | `FILE_CHANGE` is a normalized agent-run event | Published artifact model fields |
| `autobyteus-server-ts/src/services/run-file-changes/` | Folder | Durable projection | Persist/hydrate file-change projection | Existing store/hydration capability | Tool-name classification from unrelated events |
| `autobyteus-server-ts/src/services/agent-streaming/` | Folder | Transport mapping | Map `FILE_CHANGE` to websocket protocol | Existing stream protocol boundary | Derivation/persistence logic |
| `autobyteus-web/services/agentStreaming/` | Folder | Frontend stream ingestion | Handle `FILE_CHANGE` messages | Existing frontend stream boundary | Runtime-specific artifact filters |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-execution/events` | Main-Line Domain-Control | Yes | Low | Owns final event stream before fan-out. |
| `events/processors/file-change` | Off-Spine Concern serving event pipeline | Yes | Low | One derived-event concern. |
| `services/run-file-changes` | Persistence-Provider / projection service | Yes after refactor | Medium | Remove detector logic to restore clarity. |
| `services/agent-streaming` | Transport | Yes | Low | Rename protocol only. |
| `autobyteus-web/services/agentStreaming` | Transport/client projection | Yes | Low | Consume server event; no runtime semantics. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Read-only Claude file read | `Read -> TOOL_EXECUTION_* -> no FILE_CHANGE` | `Read -> file_path heuristic -> FILE_CHANGE` | Locks the bug fix. |
| File mutation | `Write -> TOOL_EXECUTION_SUCCEEDED -> FILE_CHANGE(path, write_file, available)` | `RunFileChangeService scans every tool success` | Shows new owner. |
| Processor chain | `base events -> FileChangeEventProcessor appends FILE_CHANGE -> future CustomProcessor appends CUSTOM_EVENT` | Processors publish recursively to subscribers | Enables extension without loops. |
| Generated output | `generate_image(output_file_path) -> FILE_CHANGE(generated_output)` | Unknown tool with `file_path` -> artifact | Keeps output semantics explicit. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `FILE_CHANGE_UPDATED` alias | Avoid frontend/protocol churn | Rejected | Rename all runtime/protocol/frontend/test/docs usage to `FILE_CHANGE`. |
| Add `FILE_CHANGE_OBSERVED` and keep `FILE_CHANGE_UPDATED` | Separate observation from projection | Rejected by user as redundant | One public `FILE_CHANGE` event; RFS persists but does not re-emit. |
| Frontend filter for Claude `Read` | Quick symptom fix | Rejected | Backend event pipeline must not emit false file changes. |
| Keep RFS broad listener plus tighter heuristic | Smaller patch | Rejected for final design | Move derivation into processor; RFS consumes `FILE_CHANGE` only. |
| Let generic `file_path` count as output for unknown tools | Preserve ambiguous generated-output behavior | Rejected | Known generated-output tools must expose explicit output metadata. |

## Derived Layering (If Useful)

```txt
Provider/raw runtime layer
  -> Runtime normalizer layer
  -> Agent-run event-processing layer
  -> Streaming / sidecar subscriber layer
  -> Projection persistence and frontend presentation layers
```

The important rule is not the layer names; it is that no lower presentation/projection layer re-derives file-change semantics from unrelated activity events.

## Migration / Refactor Sequence

1. Add the domain file-change event contract and rename `AgentRunEventType.FILE_CHANGE_UPDATED` to `FILE_CHANGE`.
2. Add `AgentRunEventProcessor` and `AgentRunEventPipeline` with deterministic append-only processor execution.
3. Add a shared dispatch helper so Claude, Codex, and AutoByteus backends run the pipeline once per converted event batch before listener fan-out.
4. Add `FileChangeEventProcessor` with:
   - known file mutation tool mapping (`Write`, `Edit`, `MultiEdit`, `NotebookEdit`, `write_file`, `edit_file`),
   - known generated-output tool mapping (`generate_image`, `edit_image`, `generate_speech`, equivalent approved names),
   - explicit output path extraction,
   - explicit support for `autobyteus-ts` multimedia tools that require `output_file_path` and return `{ file_path: resolvedPath }`,
   - no `Read` mapping,
   - no generic unknown-tool `file_path` output heuristic.
5. Refactor `RunFileChangeService` to subscribe to and persist only `FILE_CHANGE` events. Remove service-side event publication and old broad handlers.
6. Rename streaming server message enum, mapper, frontend protocol types, handlers, stores/tests/docs from `FILE_CHANGE_UPDATED` to `FILE_CHANGE`.
7. Remove or relocate tactical service-side helper files introduced for the earlier classifier design if their ownership no longer matches.
8. Add/update tests:
   - pipeline order and append behavior,
   - Claude `Read` no `FILE_CHANGE`,
   - Claude `Write`/`Edit` emits `FILE_CHANGE`,
   - Codex file-change emits `FILE_CHANGE`,
   - generated image/speech emits `FILE_CHANGE`,
   - unknown `file_path` tool emits no `FILE_CHANGE`,
   - `RunFileChangeService` ignores unrelated events.
9. Update docs: `agent_artifacts.md`, `agent_execution_architecture.md`, and any protocol docs mentioning the old event name.

## Key Tradeoffs

- This is larger than a local heuristic fix, but it removes the owner confusion that caused the bug and creates the future custom-event extension point the user wants.
- Running a processor chain before fan-out requires touching backend dispatch paths, but it prevents every subscriber from running its own derivation and avoids duplicated state.
- A single `FILE_CHANGE` event is simpler than observed/updated, but it means the processor must emit canonical payloads suitable for live UI and durable projection. That is acceptable because file-change derivation is now the processor's explicit responsibility.
- Not using AutoByteus customization processors means standalone `autobyteus-ts` consumers do not gain native file-change stream events in this task. That is an intentional tradeoff: this bug is in the unified server/web Artifacts path and needs one cross-runtime owner.

## Risks

- If pipeline wiring is accidentally per-subscriber instead of pre-fan-out, stateful processors could duplicate or miss derived events. Implementation must process once per backend event batch before listener dispatch.
- Streaming write content needs careful tests so moving logic from `RunFileChangeService` to `FileChangeEventProcessor` does not regress live preview.
- Any existing generated-output tool that only exposes ambiguous `file_path` will stop producing artifacts until corrected with explicit output metadata.
- Existing uncommitted tactical changes in the worktree may need cleanup or replacement to avoid mixing old and new designs.

## Guidance For Implementation

- Treat the pipeline as an append-only transformation, not an event bus.
- Processors return derived events; they do not call listeners, services, or frontend transports.
- `FileChangeEventProcessor` should be explicit and conservative: unknown tool + `file_path` means no file change.
- Keep `Read` test coverage at the converter-to-pipeline boundary because that is the bug path.
- Keep `RunFileChangeService` tests focused on projection from `FILE_CHANGE`, not on tool semantics.
- Remove old names and broad derivation code in the same change; do not leave compatibility branches.
