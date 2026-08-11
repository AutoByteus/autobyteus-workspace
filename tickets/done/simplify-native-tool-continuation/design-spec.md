# Design Spec

## Current-State Read

The current `autobyteus-ts` agent runtime is already one provider-native tool loop, but its structure still carries coordination shapes from the former multi-transport design:

- `AgentTurnRunner` governs the outer turn loop, yet `ToolResultContinuationBuilder` still performs the core result-memory commit before constructing the next internal input.
- The automatically registered `MemoryIngestToolResultProcessor` exists mainly to detect the runner's active batch and defer each result so the later builder can commit the batch. This creates two apparent memory owners for one write.
- A text-only continuation crosses the input pipeline as `tool_continuation_mode=native_api`, becomes `llmRequestMode=tool_history_only`, and selects a duplicate request-assembler method. The real fact is only that no additional user message exists.
- `MemoryIngestInputProcessor` persists that internal loop transition as a `tool_continuation` raw trace with content such as `Native API tool continuation`, although the actual call/result facts are already persisted and no production semantic reader consumes the marker.
- `LlmPhase` asks a one-caller factory to select between a native-tool handler and a pass-through handler. The native handler already owns ordinary text, interruption, failure, and finalization behavior, while the abstract base provides no shared implementation.
- `ToolInvocationBatch` still owns required active invocation identity/order, but also contains result-settlement state and APIs with no production caller.
- On the integrated server path, `AutoByteusAgentRunBackendFactory` constructs `ServerCompactionAgentRunner` without a timeout override. The runner therefore passes its literal `120_000` millisecond default to `CompactionRunOutputCollector.waitForFinalOutput`; if no terminal compactor output arrives first, the collector rejects and the runner's existing `finally` block unsubscribes and terminates the child run.

The current source, investigation evidence, focused 8-file/45-test baseline, and post-implementation server timeout investigation are recorded in `investigation-notes.md`, especially BEH-001 through BEH-011. The target must preserve provider schemas/renderers, normalized indexed native calls, approval/external-result admission, custom processor execution, ordered exactly-once result ingestion, context-file carriers, no-tool behavior, compaction/recovery order, and mixed interruption/failure/finalization semantics.

## Intended Change

Contract the surviving runtime around its real owners and data facts:

1. `AgentTurnRunner` becomes the single orchestration owner of final post-processor result-batch commit and next-leg construction.
2. A pure `ToolContinuationInputBuilder` constructs only semantic display text plus extracted context-file carriers and the existing factual `turn_id`/`tool_result_count` processor metadata.
3. `AgentInputPipelineResult` carries `llmUserMessage: LLMUserMessage | null`; null means canonical history is already sufficient. No continuation/request mode exists.
4. `LLMRequestAssembler` has one `prepareRequest` method that optionally appends an additional user message while preserving the current safety/compaction/recovery/render order.
5. One concrete `LlmStreamingResponseHandler` handles text and, only when configured tools are present, provider-native tool/file deltas. `LlmPhase` constructs it and provider schemas directly.
6. Internal TOOL input remains part of the input-processor lifecycle but produces no continuation raw-trace write. `ToolContinuationReadyEvent` remains runtime-only.
7. `ToolInvocationBatch` retains only active batch identity/order and admission behavior.
8. Obsolete files, exports, auto-registration, wrappers, duplicated branches, and dead state are deleted cleanly.
9. Downstream documentation and durable coverage are reclassified against the data-flow spine matrix rather than preserved merely because they assert old structure (REQ-011, AC-014).
10. In `autobyteus-server-ts`, replace only the ordinary compaction-agent completion default with a module-local named constant of exactly `300_000` milliseconds. Keep `ServerCompactionAgentRunnerOptions.timeoutMs` as the explicit override, keep the collector as a value consumer rather than a policy owner, and do not introduce an application setting or alter unrelated 120-second limits.

This is a behavior-preserving architectural refactor except for two explicitly approved observable changes: new raw traces no longer contain the coordination-only `tool_continuation` item, and an ordinary server compaction child may wait five minutes rather than two minutes for final output before the existing timeout failure/cleanup path runs.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | REQ-001, REQ-008, REQ-012; AC-001, AC-010, AC-015 | Accepted user, system, or inter-agent input | Investigation BEH-001; input pipeline, inbox, and memory processor | Preserve first-leg processing/memory/request behavior; remove only continuation mode/trace concerns from shared input processing | External event -> runner -> input pipeline/processors -> external user memory -> request assembler -> provider; DS-001, DS-006, DS-008 |
| BEH-002 | System | REQ-002, REQ-003, REQ-009; AC-002, AC-003, AC-009, AC-012 | Configured tools and normalized provider stream | Investigation BEH-002; factory/handler/phase source | Replace factory/hierarchy with one guarded handler and direct schema setup; preserve native schemas/invocations | Runner -> LlmPhase -> ToolSchemaProvider + LlmStreamingResponseHandler -> provider -> normalized calls; DS-002, DS-009 |
| BEH-003 | System | REQ-004, REQ-005, REQ-008; AC-004, AC-005, AC-008, AC-010 | A native invocation batch completes | Investigation BEH-003; runner, result processor, builder, MemoryManager, focused logs | All custom processors run; runner commits one final ordered batch; remove processor deferral and builder memory mutation | ToolPhase -> custom result pipeline -> runner lifecycle/clear -> MemoryManager batch commit -> continuation input; DS-002, DS-010, DS-012 |
| BEH-004 | System | REQ-001, REQ-005, REQ-006, REQ-007; AC-001, AC-005, AC-006, AC-007 | Completed result batch without context files | Investigation BEH-004; pipeline/assembler/provider integrations | Null additional user message replaces native/tool-history modes; emit runtime continuation-ready status and render canonical history | Result commit -> input builder -> processors -> null message -> ToolContinuationReadyEvent -> one assembler -> provider; DS-004, DS-008 |
| BEH-005 | System | REQ-006, REQ-007; AC-006, AC-007 | Completed result batch containing supported context files | Investigation BEH-005; media continuation integration | Carrier presence produces exactly one LLM user/media message; no mode selection | Result commit -> context extraction -> processors -> one carrier -> one assembler -> sanitizer/renderer; DS-005, DS-008, DS-013 |
| BEH-006 | System | REQ-002, REQ-003, REQ-008; AC-003, AC-008, AC-009 | Turn resolves zero configured tools | Investigation BEH-006; factory/pass-through source/tests | Use the same handler with tool-delta acceptance disabled and no request schemas | Input -> LlmPhase -> no schemas + guarded handler -> provider text/reasoning/media -> final memory/events; DS-006, DS-009 |
| BEH-007 | Contract | REQ-004; AC-004, AC-011 | Approval or externally supplied tool result targets active invocation | Investigation BEH-007; AgentTurn, ToolPhase, TurnToolInputPort | Retain batch ID/order/admission; remove only unused settlement map/methods | Native invocation -> active batch -> ToolPhase approval/wait -> TurnToolInputPort -> ordered result -> runner; DS-003, DS-010 |
| BEH-008 | System | REQ-008; AC-008, AC-010 | Abort or failure at supported awaited seams | Investigation BEH-008; runner/phase/handler/recovery coverage | Preserve closure, partial facts, snapshot commit/restore, protocol repair, and truthful outcome while changing setup inputs only | Abort/error -> handler terminalization -> LlmPhase snapshot decision -> runner repair/recovery -> outcome/events; DS-007, DS-008, DS-009 |
| BEH-009 | Contract | REQ-009, REQ-010; AC-012, AC-013 | TypeScript consumer imports package surfaces | Investigation BEH-009; index/export search | Export the supported concrete handler/schema/segment and custom processor contracts; remove obsolete symbols without aliases | Consumer import -> package root/index -> canonical current exports; DS-011 |
| BEH-010 | Operational/User | REQ-001, REQ-005, REQ-008, REQ-012; AC-001, AC-005, AC-006, AC-008, AC-015 | Internal TOOL continuation reaches configured input processors | Investigation BEH-010; user screenshot, writer/reader search | Delete continuation-boundary writer/method; preserve actual tool facts and runtime status, with no replacement trace | Tool results -> MemoryManager call/result facts -> TOOL processors (no memory write) -> runtime continuation; DS-004, DS-005, DS-012 |
| BEH-011 | System/Operational | REQ-008, REQ-013; AC-008, AC-016 | Ordinary server-created compaction run is still awaiting final output after two minutes | Investigation BEH-011; runner, backend factory, collector, focused tests, and real-model evidence | Change only the omitted-option default from 120,000 to exactly 300,000 ms; preserve explicit overrides, earlier terminal/failure settlement, error wrapping, unsubscription, child termination, and surrounding interruption behavior | Parent request -> pending compaction executor -> backend factory -> server compaction runner -> collector final-output wait -> result or existing failure/cleanup return; DS-014 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/simplify-native-tool-continuation/surviving-native-loop-responsibility-inventory.md` | Classifies every suspected layer as remove, contract, or retain using production reachability | REQ-001–REQ-012; AC-001–AC-015 | Supplies the evidence boundary for the removal plan and prevents deletion of still-valid lifecycle owners | Complete / Approval N/A (evidence/context) |

## Task Design Health Assessment (Mandatory)

- Change posture: `Refactor` / `Cleanup`, plus one bounded operational behavior correction in the integrated server compaction path.
- Current design issue found: `Yes`
- Root cause classification: `Legacy Or Compatibility Pressure`, `Duplicated Policy Or Coordination`, `Boundary Or Ownership Issue`, `File Placement Or Responsibility Drift`, and a local default-policy defect for BEH-011.
- Refactor needed now: `Yes`
- Evidence: A one-value mode crosses four runtime layers; the result processor's normal action is to defer to a later writer; the builder combines persistence with carrier projection; the request assembler duplicates an entire lifecycle for one missing append; a raw trace persists internal coordination with no reader; one factory selects between handlers that duplicate text behavior; batch settlement APIs have no production caller. Separately, the ordinary server backend omits `timeoutMs`, so a runner-local 120-second default governs every normal compaction child even though supported slow local-model execution can legitimately exceed four minutes.
- Design response: Recenter orchestration in the existing runner and LLM phase, keep persistence behind `MemoryManager`, keep request lifecycle in the assembler, keep stream-local state in one concrete handler, and retain the pure context-carrier transformation as a small off-spine concern. Correct the server timeout at its existing policy owner with one named default constant; do not convert a local default correction into a new cross-application configuration architecture.
- Refactor rationale: These changes reduce competing owners and parallel representations while preserving every approved path. The runner does not absorb provider streaming, tool execution, memory internals, or context extraction; simplification strengthens separation of concerns rather than creating a coordinator blob.
- Intentional deferrals and residual risk: No historical raw-trace rewrite is performed, so old `tool_continuation` cards remain visible in old data. Tool execution remains sequential. Provider-specific renderers and bounded indexed delta/file-projector state remain because they serve current contracts. The five-minute default may retain a genuinely stalled child for up to three minutes longer, but preserves the existing earlier terminal/failure and explicit-override paths. A runtime/user-configurable timeout is intentionally not added without an approved selection use case. Exact durable-test edits remain owned by `api_e2e_engineer`.

## Terminology

- **Additional user message:** The nullable `LLMUserMessage` appended during one request assembly. External inputs always supply one; text-only tool continuations do not; context-file continuations do.
- **Context carrier:** The single semantic user/media message created when processed tool results contain supported `ContextFile` values.
- **Tool calls enabled:** A construction fact derived from whether the resolved tool-name list is non-empty. It gates schema sending and native tool-delta acceptance; it is not a selectable transport mode.
- **Core result commit:** The one ordered `MemoryManager.ingestToolResults` call made by the runner after custom result processors finish.
- **Continuation-ready event:** The ephemeral `ToolContinuationReadyEvent` used for same-turn runtime status when no additional message exists. It is not persisted.
- **Compaction-agent completion timeout:** The maximum wait passed by `ServerCompactionAgentRunner` to `CompactionRunOutputCollector.waitForFinalOutput` when an ordinary caller omits `timeoutMs`. It does not mean parent-request cancellation latency, provider client timeout, server startup timeout, or a general test/process timeout.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove the one-value tool-continuation metadata file, request-mode type/branches, duplicate assembler entrypoint, built-in result-memory processor/registration/export, active-batch deferral, continuation raw-trace writer, streaming factory/result wrapper/abstract base/pass-through handler, old concrete handler name/path if renamed, and unused batch settlement state/methods.
- Do not add aliases, deprecated forwarding exports, no-op processors, boolean native modes, dual request methods, trace replacement markers, or a generic continuation/setup manager.
- Keep historical raw traces readable through the current generic reader; this is current-schema direct use, not a compatibility path.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Per-agent raw-trace JSONL and working-context snapshots. Existing data may contain `tool_call`, `tool_result`, and historical `tool_continuation` records such as the supplied `Native API tool continuation` card. Volume is per-agent/run and can grow until existing archival/compaction mechanisms act.
- Relevant code-model, serialization, semantic, or physical-store change: Stop writing one coordination-only raw-trace type and remove its writer method. Canonical user/assistant/tool message payloads, raw-trace generic shape, call/result payloads, provider context, snapshots, and stores do not change.
- Normal reader/writer behavior and representative evidence: `RawTraceItem.fromDict` accepts generic trace/source strings; tool lifecycle reconstruction selects `tool_call`/`tool_result`; repository production has no semantic `tool_continuation` reader. `MemoryManager.ingestToolResults` remains the canonical ordered result writer.
- Required semantics and invariants under direct use: Existing call/result identity, order, provider context, media paths, compaction lineage, recovery facts, and history remain readable. Historical continuation markers add no required state and remain inert.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: Existing JSONL files must not be bulk rewritten or deleted. A rewrite would add I/O, corruption, recovery, and rollout risk without correctness or privacy benefit.
- Decision: `Directly Usable — No Migration`
- Decision rationale: Current version-agnostic readers already tolerate historical records, and no invariant requires removing old bytes. Stopping future writes achieves the approved behavior without a maintenance window, dual reader, or migration framework.
- Acceptance criteria or design constraints supported by this decision: AC-005, AC-006, AC-007, AC-008, AC-010, AC-015; no new trace marker, no old-data rewrite, and unchanged canonical call/result rendering.
- BEH-011 state impact: `Not Affected`. Changing a runtime wait default writes no new schema, does not reinterpret stored context, and adds no configuration record; therefore it creates no migration requirement.

### Migration Plan

N/A — the approved decision is `Directly Usable — No Migration`.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-008 | Accepted external input | Completed final response/outcome | `AgentTurnRunner` | Preserves the ordinary non-tool/full-turn behavior across the edited input/request/stream areas |
| DS-002 | Primary End-to-End | BEH-002, BEH-003, BEH-004, BEH-005 | Accepted external input | Next provider leg after native tool results | `AgentTurnRunner` | Exposes the complete native tool loop rather than only the local continuation code |
| DS-003 | Primary End-to-End | BEH-007, BEH-008 | Native invocation requiring approval/external result | Accepted result returned to the active turn | `ToolPhase` under active `AgentTurn` | Protects active-batch identity, waiting, and rejection semantics during batch contraction |
| DS-004 | Return-Event | BEH-003, BEH-004, BEH-010 | Final processed text-only result batch | Next provider request with no appended user message | `AgentTurnRunner` | Defines the native history-only outcome without retaining a “history mode” |
| DS-005 | Return-Event | BEH-003, BEH-005, BEH-010 | Final processed result batch with context files | Next provider request with one media carrier | `AgentTurnRunner` | Preserves the one legitimate additional-message exception |
| DS-006 | Primary End-to-End | BEH-001, BEH-006 | Accepted input for an agent with no tools | Final text/reasoning/media response and completed outcome | `AgentTurnRunner` / `LlmPhase` | Proves one handler does not change pass-through behavior |
| DS-007 | Return-Event | BEH-008 | Supported abort or runtime failure | Interrupted/recovered/failed outcome plus repaired memory/events | `AgentTurnRunner` | Preserves terminalization and recovery across all changed seams |
| DS-008 | Bounded Local | BEH-001, BEH-004, BEH-005, BEH-008 | Optional additional user message plus request identity | Rendered request package and recovery snapshot | `LLMRequestAssembler` | Locks the exact safety/compaction/append/sanitize/render order under one API |
| DS-009 | Bounded Local | BEH-002, BEH-006, BEH-008 | Normalized provider `ChunkResponse` stream | Segment events and normalized tool invocations/finalization | `LlmStreamingResponseHandler` | Retains bounded indexed native delta/file state while removing handler selection |
| DS-010 | Bounded Local | BEH-003, BEH-007, BEH-008 | Ordered raw tool results | Committed final results plus continuation input | `AgentTurnRunner` | Makes custom processing, terminal lifecycle, active-batch clearing, and exactly-once commit order explicit |
| DS-011 | Primary End-to-End | BEH-009 | External TypeScript import | Resolved supported package contract | `autobyteus-ts` package export boundary | Makes intentional public contraction reviewable rather than accidental |
| DS-012 | Return-Event | BEH-003, BEH-004, BEH-005, BEH-010 | Normalized tool invocation/result facts | Raw trace + working context used by next provider rendering | `MemoryManager` | Shows what is actually durable and why no continuation trace is needed |
| DS-013 | Bounded Local | BEH-005 | Final processed result values | Internal TOOL input with semantic text/context files | `ToolContinuationInputBuilder` | Keeps recursive context extraction out of the runner without restoring a framework |
| DS-014 | Primary End-to-End | BEH-011 | Parent agent request reaches an already-requested pending compaction on the ordinary server backend | Parent request resumes from final compacted output, or receives the existing typed timeout/failure outcome after child cleanup | `ServerCompactionAgentRunner` for the child completion lifecycle, invoked from the parent request-assembly spine | Proves the five-minute policy correction at the real production owner without altering earlier terminal/failure settlement, explicit overrides, or surrounding interruption and cleanup semantics |

### Use-Case-To-Spine Coverage

| Use Case | Required Spine Coverage | Coverage Rationale |
| --- | --- | --- |
| UC-001 External first request | DS-001, DS-008 | Covers supported entry, processors, memory, assembly, provider, response, and outcome |
| UC-002 One/multiple native tool calls | DS-002, DS-009, DS-010, DS-012 | Covers schemas/deltas, execution, ordered result processing/commit, and durable native history |
| UC-003 Approval/external result | DS-003, DS-010 | Covers active identity, wait/rejection contract, and ordered return to the runner |
| UC-004 Text-only continuation | DS-002, DS-004, DS-008, DS-012 | Covers no appended user message, runtime status, canonical history, and next provider call |
| UC-005 Context-file continuation | DS-002, DS-005, DS-008, DS-013 | Covers extraction, one carrier, sanitation/rendering, and next provider call |
| UC-006 No-tool stream | DS-006, DS-009 | Covers absence of schemas, disabled tool deltas, and unchanged text/reasoning/media lifecycle |
| UC-007 Interruption/failure | DS-007, DS-008, DS-009, DS-010 | Covers each changed awaited/local seam plus memory/outcome recovery |
| UC-008 Pending compaction | DS-004 or DS-005 plus DS-008 | Covers native suffix preservation for both continuation shapes under one assembler |
| UC-009 Contracted package import | DS-011 | Covers supported exports and clean failure of removed symbols |
| UC-010 No continuation raw-trace card | DS-004, DS-005, DS-012 | Covers actual durable facts, side-effect-free TOOL processing, and continued runtime transition |
| UC-011 Slow server compaction completion | DS-014 | Covers ordinary construction, exact five-minute default propagation, earlier success/failure, typed timeout, unsubscription/termination, and return to the parent request lifecycle |

## Primary Execution Spine(s)

### DS-001 — Ordinary Final Turn

`Agent / Runtime external event -> AgentEventInbox / turn start -> AgentTurnRunner -> AgentInputPipeline + configured processors -> LlmPhase -> LLMRequestAssembler -> provider stream -> MemoryManager + LLMResponsePipeline / notifier -> completed TurnOutcome`

### DS-002 — Provider-Native Tool Loop

`External input -> AgentTurnRunner -> LlmPhase + ToolSchemaProvider -> provider-native stream -> LlmStreamingResponseHandler -> active ToolInvocationBatch -> ToolPhase -> custom ToolResultPipeline -> AgentTurnRunner core result commit -> ToolContinuationInputBuilder + AgentInputPipeline -> LlmPhase / provider-native renderer`

### DS-003 — Approval Or External Tool Result

`Normalized ToolInvocation -> AgentTurn.startToolInvocationBatch -> ToolPhase approval/wait -> TurnToolInputPort -> active batch identity admission -> accepted ToolResultEvent -> ToolPhase ordered result array -> AgentTurnRunner`

### DS-006 — No-Tool Turn

`External input -> AgentTurnRunner -> AgentInputPipeline -> LlmPhase (empty resolved tool list) -> LlmStreamingResponseHandler(toolCallsEnabled=false) -> provider stream without tools -> text/reasoning/media events + assistant memory -> completed TurnOutcome`

### DS-011 — Package Contract

`External TypeScript import -> autobyteus-ts package root -> agent streaming/processor indices -> retained LlmStreamingResponseHandler / schema / segment / custom processor contracts -> consumer build`

### DS-014 — Ordinary Server Compaction Completion

`Parent AgentTurnRunner / LlmPhase request assembly -> LLMRequestAssembler detects pending compaction -> PendingCompactionExecutor -> structured compaction strategy/summarizer -> AutoByteusAgentRunBackendFactory ordinary construction -> ServerCompactionAgentRunner(default 300_000 ms) -> visible child AgentRun -> CompactionRunOutputCollector -> final JSON or existing timeout/failure -> runner unsubscribe + terminate child -> compacted output or typed error returns through parent request assembly`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A supported external event starts one turn; the pipeline processes/persists it, one assembled provider request streams, and the final response is persisted/published before the turn completes. | Inbox, TurnRunner, InputPipeline, LlmPhase, MemoryManager | AgentTurnRunner | system-task notification, compaction, renderer, response processors |
| DS-002 | The first request supplies native schemas, the handler normalizes provider deltas, ToolPhase executes an active batch, the runner processes/commits results, and an internal input starts the next provider leg. | TurnRunner, LlmPhase, StreamHandler, ToolInvocationBatch, ToolPhase, MemoryManager | AgentTurnRunner | schema formatter, lifecycle notifier, context input builder |
| DS-003 | ToolPhase pauses only at supported approval/external-result seams and admits results solely through the active turn/batch identity before returning them in provider order. | AgentTurn, ToolInvocationBatch, ToolPhase, TurnToolInputPort | ToolPhase / AgentTurn | approval notifier, external transport |
| DS-004 | After ordered commit, a text-only TOOL message runs processors; absence of context files becomes a null additional message, emits continuation-ready status, and assembles existing history directly. | TurnRunner, InputBuilder, InputPipeline, RequestAssembler | AgentTurnRunner | status derivation, compaction, provider renderer |
| DS-005 | Context extraction produces one TOOL carrier; processors may transform it, and the resulting media message is appended once before sanitation/rendering. | InputBuilder, InputPipeline, RequestAssembler | AgentTurnRunner | context hydration, media sanitizer |
| DS-006 | An empty resolved tool list sends no schemas and disables tool-delta acceptance in the same handler while preserving ordinary stream output and final memory. | TurnRunner, LlmPhase, StreamHandler, MemoryManager | AgentTurnRunner / LlmPhase | token usage, reasoning segments, media output |
| DS-007 | A supported abort/failure terminalizes open segments, settles or restores the request snapshot, preserves completed facts, repairs incomplete tool protocol, and derives a truthful turn outcome. | StreamHandler, LlmPhase, TurnRunner, MemoryManager | AgentTurnRunner | diagnostics, lifecycle notifier |
| DS-008 | One assembler method performs the existing request-preparation lifecycle; only the presence of an additional message changes whether append occurs. | RequestAssembler, MemoryManager, Renderer | LLMRequestAssembler | compaction executor, media sanitizer |
| DS-009 | One handler projects ordinary text for every stream and gated indexed tool/file deltas when tools are configured, then creates invocations only at successful finalization. | LlmStreamingResponseHandler | LlmStreamingResponseHandler | file content projectors, event callback |
| DS-010 | The runner processes raw results in order, emits final transformed lifecycle facts, closes batch admission, commits the final array once, then constructs continuation input. | ToolResultPipeline, TurnRunner, MemoryManager, InputBuilder | AgentTurnRunner | custom result processors, terminal lifecycle formatting |
| DS-011 | Package indices expose only current contracts; removed concrete/framework symbols fail resolution rather than forwarding. | Package export boundary | Package export boundary | release documentation |
| DS-012 | Assistant calls and processed results enter raw trace/working context through MemoryManager and feed provider-native renderers; no coordination-only trace participates. | MemoryManager, RawTraceStore, WorkingContext, Renderer | MemoryManager | tool protocol safety, compaction |
| DS-013 | A small pure builder recursively recognizes ContextFile values/shapes and emits the semantic TOOL input used by processors. | ToolContinuationInputBuilder | ToolContinuationInputBuilder | display-text formatter, ContextFile hydrator |
| DS-014 | An ordinary server compaction child is created without an override; the runner supplies its five-minute default to the collector, while terminal output or failure can settle earlier and the runner always performs its existing cleanup before the parent request proceeds or fails. | Parent request assembler, PendingCompactionExecutor, backend factory, ServerCompactionAgentRunner, child AgentRun, output collector | ServerCompactionAgentRunner | structured summarizer, agent manager/event subscription, error wrapper |

## Spine Actors / Main-Line Nodes

| Node | Main-Line Role |
| --- | --- |
| `AgentTurnRunner` | Governs the outer turn/LLM/tool loop and settlement/recovery sequencing |
| `AgentInputPipeline` | Validates external versus same-turn input and runs configured input transformations |
| `LlmPhase` | Owns one provider request/stream, request recovery snapshot settlement, and response/tool-intent memory |
| `LlmStreamingResponseHandler` | Converts normalized chunks into segment events and optional normalized tool invocations |
| `ToolInvocationBatch` | Represents active turn-scoped invocation identity/order |
| `ToolPhase` | Owns approval, execution/external waiting, and ordered raw result collection |
| `ToolResultPipeline` | Applies configured custom result transformations in order |
| `MemoryManager` | Authoritative canonical/raw memory mutation, protocol safety, compaction state, and request snapshots |
| `LLMRequestAssembler` | Owns one request-preparation transaction from canonical memory to rendered payload |
| `ToolContinuationInputBuilder` | Purely projects processed results into the internal semantic/context carrier |
| `ServerCompactionAgentRunner` | Owns one server compaction child lifecycle, including the omitted-option completion-wait policy, event subscription, typed failure projection, and terminal cleanup |
| `CompactionRunOutputCollector` | Settles one child run from final/failure events or the explicit timeout value supplied by the runner; it does not choose the default |

## Ownership Map

- `AgentTurnRunner` owns ordering across phases, abort fences, active-batch closure, the one core result commit call, continuation construction, and status/outcome transitions. It must not own provider chunk parsing, tool execution, memory validation internals, or context-file-recognition algorithms.
- `LlmPhase` owns one LLM-call lifecycle: resolved-tool setup, handler construction, schema request kwargs, streaming, token/media/reasoning accumulation, invocation batch start, assistant memory, and snapshot commit/restore. It must not introduce a new setup factory when setup is local and single-use.
- `LlmStreamingResponseHandler` owns bounded stream-local text/tool/file segment state and normalized invocation construction. It does not select transports, resolve configured tools, build schemas, call providers, execute tools, or persist memory.
- `ToolPhase` owns tool preparation/approval/execution/external waiting and returns ordered results. It does not persist final normal batches.
- `ToolResultPipeline` owns custom extension ordering/transformation. It is not the core memory owner.
- `MemoryManager` owns validation, deduplication, canonical/raw call/result persistence, working context, protocol repair, compaction, and recovery snapshots. The runner uses its public batch boundary and does not bypass stores.
- `AgentInputPipeline` owns input identity validation, processor ordering, and construction of the nullable additional LLM user message. It does not persist coordination state or choose request methods.
- `LLMRequestAssembler` owns the transactional safety/compaction/append/sanitize/render sequence. It receives the structural optional message instead of interpreting modes.
- `ToolContinuationInputBuilder` owns only display summary, context-file extraction/hydration, and factual `turn_id`/`tool_result_count` message metadata. It accepts a turn ID value but has no `AgentContext`, `AgentTurn`, memory, status, or transport dependency.
- `ServerCompactionAgentRunner` owns the server-specific child-run lifecycle and the default completion-wait policy. Omitted `timeoutMs` resolves to exactly `300_000`; an explicitly supplied value always wins. Its existing catch/finally behavior continues to wrap failures, unsubscribe, and terminate the child.
- `CompactionRunOutputCollector` owns event-to-promise settlement for the value it receives. It clears its timer when a final or failure event settles and must not acquire a default or application-config dependency.
- `AutoByteusAgentRunBackendFactory` remains a thin ordinary constructor and intentionally supplies no timeout override; this makes the runner's named default the sole ordinary production policy.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `Agent` / `AgentRuntime` external input surface | `AgentTurn` + `AgentTurnRunner` | Stable public event submission/runtime lifecycle | Continuation construction, memory batch commit, provider stream internals |
| Package root and subpath indices | Underlying concrete classes/registries | TypeScript module discovery | Compatibility aliases, alternate handler selection, hidden behavior |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `src/agent/message/tool-continuation-metadata.ts` | One accepted value; structural data already expresses the request shape | `AgentInputPipelineResult.llmUserMessage: LLMUserMessage | null` | In This Change | Remove constants, parser, imports, tests |
| `LlmRequestMode` and `llmRequestMode` branches | Propagate one append/no-append decision as mode vocabulary | Nullable additional message | In This Change | No boolean/native-mode replacement |
| `LLMRequestAssembler.prepareToolContinuationRequest` | Duplicates request lifecycle except append | One `prepareRequest(additionalUserMessage, identity, systemPrompt)` | In This Change | Preserve ordering and unified rollback diagnostic |
| `MemoryIngestToolResultProcessor` | Normal production action is deferral; creates competing memory ownership | Runner -> `MemoryManager.ingestToolResults` | In This Change | Remove file, root export, and factory auto-registration; keep custom pipeline/base/registry |
| Active-batch deferral branch/logs | Exists only because core persistence is split | Runner-owned one-call commit | In This Change | No no-op replacement |
| `ToolResultContinuationBuilder` current file/class | Mixes memory, turn resolution, mode metadata, and carrier responsibilities | Pure `ToolContinuationInputBuilder` | In This Change | Clean rename/rewrite; accept explicit turn ID, retain factual turn/count metadata, no forwarding wrapper |
| `MemoryManager.ingestToolContinuationBoundary` and caller | Persists internal coordination with no semantic reader | Ephemeral runner status event; actual call/result records | In This Change | No replacement trace; historical records remain |
| `StreamingResponseHandlerFactory` | One caller and one resulting handler | Direct local setup in `LlmPhase` | In This Change | No setup manager replacement |
| `StreamingHandlerResult` | Behavior-free pairing wrapper | Local `streamingHandler` and optional `toolSchemas` values | In This Change | Remove export |
| Abstract `StreamingResponseHandler` | No shared behavior after one implementation remains | Concrete `LlmStreamingResponseHandler` | In This Change | Remove abstract hierarchy |
| `PassThroughStreamingResponseHandler` | Duplicates ordinary stream lifecycle | Guarded `LlmStreamingResponseHandler` | In This Change | No compatibility export |
| `ApiToolCallStreamingResponseHandler` name/path and top-level wrapper | Tool-specific name becomes misleading when it is the only general LLM stream owner | `LlmStreamingResponseHandler` canonical file/export | In This Change | Move implementation; do not retain forwarding alias |
| `ToolInvocationBatch` settled-result map/APIs | No production caller; ToolPhase already returns ordered final array | Retained immutable identity/order fields and `accepts` APIs | In This Change | Remove `settleResult`, `hasSettled`, `isComplete`, ordered-settled/result-ID methods |
| Obsolete exports in streaming/result processor indices | Expose removed architecture | Current concrete/schema/segment/custom extension exports | In This Change | Release-note intentional contraction |

## Return Or Event Spine(s) (If Applicable)

- **DS-004 text-only return:** `processed results -> runner clears active batch -> MemoryManager.ingestToolResults -> ToolContinuationInputBuilder -> AgentInputPipeline/custom processors -> llmUserMessage=null -> ToolContinuationReadyEvent -> LLMRequestAssembler -> provider renderer/request`.
- **DS-005 context return:** `processed results -> batch commit -> ToolContinuationInputBuilder extracts files -> AgentInputPipeline/custom processors -> LLMUserMessage carrier -> LLMUserMessageReadyEvent -> assembler optional append -> media sanitizer -> provider renderer/request`.
- **DS-007 failure return:** `abort/error -> handler finalizeInterrupted/finalizeFailed -> LlmPhase commit/restore snapshot -> runner completed-fact projection/protocol repair -> status/notifier -> interrupted/recovered/failed TurnOutcome`.
- **DS-012 memory return:** `normalized assistant tool calls -> MemoryManager tool_call facts -> processed result batch -> MemoryManager tool_result facts + canonical tool messages -> provider renderer on next request`. There is deliberately no `tool_continuation` persistence node.
- **DS-014 compaction return:** `collector final event -> parsed compacted JSON -> runner returns output -> pending executor applies it -> parent request assembly resumes`; or `collector failure/300_000 ms timeout -> typed runner error -> runner finally unsubscribes and terminates the child -> existing parent failure path`. Parent cancellation/interruption behavior remains the existing surrounding behavior and is not delayed by replacing unrelated cancellation seams.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner `LLMRequestAssembler` (DS-008): `ensure system prompt -> pre-compaction protocol safety -> execute pending compaction -> capture recovery snapshot -> append optional message if present -> pre-render protocol safety -> read canonical context -> sanitize media -> render payload -> return package`; on failure after snapshot: `restore snapshot -> rethrow`.
- Parent owner `LlmStreamingResponseHandler` (DS-009): `ChunkResponse -> emit text segment data -> if toolCallsEnabled, merge indexed native deltas -> stream write/edit file content -> finalize complete calls -> emit normalized ToolInvocation`; interruption/failure closes started segments without publishing incomplete invocations.
- Parent owner `AgentTurnRunner` (DS-010): `ToolPhase ordered results -> each custom processor pipeline -> abort fence -> status -> terminal lifecycle -> post-batch fence -> clear active batch -> one MemoryManager.ingestToolResults -> pure continuation input build`.
- Parent owner `ToolContinuationInputBuilder` (DS-013): `ordered results + explicit turnId -> recurse result values -> retain ContextFile instances or hydrate supported serialized shapes -> build semantic summaries -> AgentInputUserMessage(SenderType.TOOL, files, {turn_id, tool_result_count})`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `ToolSchemaProvider` | DS-002, DS-006 | LlmPhase | Provider-specific native schema mapping | Provider contracts differ | A schema factory would again appear to own stream mode selection |
| Provider prompt renderers | DS-001, DS-002, DS-004, DS-005 | LLMRequestAssembler | Render canonical history to each provider API | Native history formats differ | Generic continuation rendering would recreate protocol modes |
| Pending compaction executor | DS-008, DS-014 | LLMRequestAssembler | Execute requested compaction before stable request snapshot | Existing memory constraint | Moving it into the agent runner would overload outer sequencing and alter timing |
| Server compaction runner default constant | DS-014 | ServerCompactionAgentRunner | Define the ordinary child completion-wait policy as exactly `300_000` ms while retaining explicit injection | Slow local-model compaction can exceed the current two-minute wait | AppConfig/global placement would create a new selection surface and spread one owner-local policy |
| Media sanitizer | DS-005, DS-008 | LLMRequestAssembler | Project supported outbound media without mutating canonical history | Provider multimodal capability differences | Builder or runner would absorb provider request policy |
| Context-file/display helpers | DS-005, DS-013 | ToolContinuationInputBuilder | Recognize files and create semantic carrier text | Tool results may contain file values/shapes | Inlining would bloat runner and obscure the return spine |
| File content projectors | DS-009 | LlmStreamingResponseHandler | Incrementally project write/edit deltas | Native args arrive chunked | Removing them as “parsing” would break file segment behavior |
| Status derivation/notifiers | DS-001–DS-007, DS-010 | AgentTurnRunner/LlmPhase | Emit lifecycle/status/segment/tool diagnostics | External observability contract | Making them persistence owners would recreate continuation trace leakage |
| Raw trace/working-context stores | DS-012 | MemoryManager | Physical storage | Durable memory implementation | Direct runner/store access would bypass canonical validation/deduplication |

## Ownership Boundaries

1. `AgentTurnRunner` is the authoritative outer-loop boundary. It calls phases and the public memory batch commit, but phases do not call back into the runner or own outer continuation sequencing.
2. `MemoryManager` is the authoritative memory boundary. Runner, phase, and assembler call its methods; none accesses `RawTraceStore` or snapshot stores directly.
3. `LlmPhase` is the authoritative one-provider-call boundary. It owns direct local construction of schemas/handler because no reusable multi-implementation selection policy remains.
4. `ToolPhase` is the authoritative execution/approval boundary. The runner receives its ordered result array and must not reimplement tool wait/admission logic.
5. `AgentInputPipeline` is the authoritative input-processing boundary. The runner must not run processors directly or infer context-file presence before processor transformations finish.
6. `LLMRequestAssembler` is the authoritative request transaction boundary. `LlmPhase` passes an optional message and identity; it must not separately append memory or duplicate compaction/recovery sequencing.
7. `LlmStreamingResponseHandler` encapsulates stream-local maps and file projectors. `LlmPhase` consumes only emitted events/invocations and lifecycle methods.
8. `ServerCompactionAgentRunner` is the authoritative server child-lifecycle boundary for DS-014. The backend factory constructs it; the runner chooses the omitted-option default and passes an explicit duration to the collector. Neither the factory nor collector independently selects a timeout policy.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `MemoryManager.ingestToolResults` | call/result identity validation, dedupe, raw trace, canonical tool messages | AgentTurnRunner, interruption projection where already supported | Runner -> raw store + working context separately | Strengthen the batch method, not direct store calls |
| `LLMRequestAssembler.prepareRequest` | safety, compaction, snapshot, optional append, sanitation, render | LlmPhase | LlmPhase -> MemoryManager append/renderer around assembler | Extend `RequestPackage` or assembler inputs explicitly |
| `ToolPhase.run` | preprocess, approval, in-process/external execution, ordered collection | AgentTurnRunner | Runner -> TurnToolInputPort/tool executor directly | Add explicit ToolPhase callback/option |
| `AgentInputPipeline.processToolContinuation` | same-turn validation, processor order, carrier decision | AgentTurnRunner | Runner -> individual input processors/buildLLMUserMessage | Extend pipeline result with a semantically singular field |
| `LlmStreamingResponseHandler` | text/tool/file segment state and invocation normalization | LlmPhase | LlmPhase -> activeTools/file projectors | Add a handler method/options fact, not expose internal maps |
| `ServerCompactionAgentRunner.runCompaction` | server child creation, output wait policy, error projection, subscription cleanup, child termination | Pending compaction executor through `CompactionAgentRunner` / backend factory | Caller -> output collector or child AgentRun internals | Extend the runner option or lifecycle implementation, not its callers |

## Dependency Rules

- Allowed: `AgentTurnRunner -> AgentInputPipeline`, `LlmPhase`, `ToolPhase`, `ToolResultPipeline`, `MemoryManager`, `ToolContinuationInputBuilder`.
- Allowed: `LlmPhase -> LLMRequestAssembler`, `ToolSchemaProvider`, provider LLM client, `LlmStreamingResponseHandler`, `MemoryManager`.
- Allowed: `LLMRequestAssembler -> MemoryManager`, compaction executor, sanitizer, renderer.
- Allowed: `ToolContinuationInputBuilder -> ToolResultEvent`, `ContextFile`, display formatter, `AgentInputUserMessage`.
- Allowed: `MemoryIngestInputProcessor -> MemoryManager.ingestUserMessage` for external inputs only.
- Allowed: parent pending-compaction execution -> `CompactionAgentRunner` -> ordinary backend factory -> `ServerCompactionAgentRunner` -> `CompactionRunOutputCollector.waitForFinalOutput(explicitDuration)`.
- Forbidden: result processors or continuation builder acting as the core normal batch-memory owner.
- Forbidden: input pipeline, metadata parser, or LlmPhase selecting among continuation transport/request modes.
- Forbidden: `AgentTurnRunner` or `LlmPhase` reaching into raw trace/snapshot stores behind `MemoryManager`.
- Forbidden: stream handler resolving tool configurations, building schemas, calling providers, or executing tools.
- Forbidden: factory/base/pass-through compatibility layers or forwarding exports.
- Forbidden: persisting `ToolContinuationReadyEvent`, `SenderType.TOOL` transition, or any renamed replacement continuation marker.
- Forbidden: moving the compaction-agent default into `CompactionRunOutputCollector`, adding `AppConfig`/environment/UI plumbing for this bounded correction, or globally replacing unrelated `120_000` literals and test/process/server-start timeouts.
- Forbidden: implementing the longer default with a real five-minute sleep in deterministic coverage, or weakening explicit injected short timeouts and prompt earlier event settlement.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentTurnRunner.run(trigger)` | One active agent turn | Sequence external input, LLM/tool loops, recovery, outcome | explicit runner-bound `AgentTurn` + external trigger | Existing authoritative outer boundary |
| `AgentInputPipeline.processToolContinuation(message, context, turn, notifier)` | Same-turn internal input | Validate/process and return optional LLM carrier | `SenderType.TOOL` + explicit active `AgentTurn` | No metadata mode |
| `AgentInputPipelineResult.llmUserMessage` | Additional request user message | Carry message or explicit absence | `LLMUserMessage | null` | Singular structural meaning |
| `MemoryManager.ingestToolResults(events, turnId, options)` | Ordered tool result batch | Validate/dedupe/persist canonical and raw result facts | explicit `turnId` + per-event invocation IDs | Existing authoritative batch API |
| `ToolContinuationInputBuilder.build(events, turnId)` | Continuation carrier projection | Build semantic TOOL input/context files | ordered processed `ToolResultEvent[]` + explicit non-empty turn ID | No `AgentContext`/`AgentTurn`/memory dependency; retain factual `turn_id` and `tool_result_count`, remove mode metadata |
| `LLMRequestAssembler.prepareRequest(additionalUserMessage, identity, systemPrompt)` | One provider request transaction | Prepare current memory plus optional append | nullable message + `{turnId, requestId}` | Replaces two entrypoints |
| `LlmStreamingResponseHandler` constructor | One normalized provider stream projection | Configure callbacks, turn identity, tool-delta gate | `{turnId, segmentIdPrefix?, toolCallsEnabled, callbacks?}` | Gate is resolved data fact, not mode |
| `ToolInvocationBatch.accepts(invocationId, turnId?)` | Active batch admission | Validate invocation/optional turn identity | invocation ID + optional turn ID | Retain; settlement APIs removed |
| `ServerCompactionAgentRunnerOptions.timeoutMs` | One server compaction child completion wait | Allow an explicit caller/test override while defining omission at the owner | Optional positive duration in milliseconds; omission selects `300_000` | Existing option contract retained; no new configuration surface |
| `CompactionRunOutputCollector.waitForFinalOutput(timeoutMs)` | One child output settlement | Await terminal output/failure or reject after the caller-supplied duration | Required explicit duration in milliseconds | Remains a mechanism consumer with no default-policy knowledge |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Runner `run` | Yes | Yes | Low | None |
| Input pipeline continuation | Yes | Yes | Low | Remove mode parsing and derive optional message after processors |
| Memory batch ingestion | Yes | Yes | Low | Keep as sole normal commit boundary |
| Input builder `build` | Yes | Yes | Low | Accept explicit turn ID; remove context/turn-object options and persistence |
| Assembler `prepareRequest` | Yes | Yes | Low | Use nullable message; delete duplicate method |
| Stream handler constructor | Yes | Yes | Low | Require explicit turn and tool-call gate |
| Batch `accepts` | Yes | Yes | Low | Make stored identities readonly/private |
| Server compaction runner timeout option | Yes | Yes | Low | Replace the runner's literal fallback with a named `300_000` constant; retain `??` precedence |
| Collector final-output wait | Yes | Yes | Low | Keep the duration required and explicit; do not add a second default |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Outer turn owner | `AgentTurnRunner` | Yes | Low | Retain |
| One provider call | `LlmPhase` | Yes | Low | Retain |
| Stream projection owner | `ApiToolCallStreamingResponseHandler` -> `LlmStreamingResponseHandler` | Yes (target) | High if old name serves no-tool streams | Rename cleanly; no alias |
| Continuation carrier projection | `ToolResultContinuationBuilder` -> `ToolContinuationInputBuilder` | Yes (target) | High in current name because it also writes memory | Rename after removing memory ownership |
| Optional message | `llmRequestMode` -> `llmUserMessage` nullable | Yes (target) | High in current mode name | Use the data itself |
| Active identity | `ToolInvocationBatch` | Yes | Low | Retain and contract |
| Server runner default | `DEFAULT_COMPACTION_AGENT_COMPLETION_TIMEOUT_MS` | Yes | Low | Name the owner, subject, and unit; avoid generic `TIMEOUT_MS` or transport/mode vocabulary |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Ordered call/result persistence | Memory / `MemoryManager` | Reuse | Already validates/deduplicates and projects canonical/raw facts | N/A |
| Request safety/compaction/rendering | `LLMRequestAssembler` | Extend | Existing owner; only API duplication is removed | N/A |
| Stream text/native delta projection | Agent streaming handlers | Extend/contract | Existing native implementation already has required behavior | N/A |
| Context-file extraction | Existing continuation/display/context message area | Contract | Real cohesive local transformation remains; explicit turn ID supports factual processor metadata without runtime ownership | N/A |
| Custom input/result transformations | Existing processor pipelines/registries | Reuse | Approved extension points | N/A |
| Continuation setup manager | None | Do not create | Existing runner/pipeline/assembler owners are sufficient | A new generic owner would only relocate coordination |
| Server compaction timeout policy | Existing `ServerCompactionAgentRunnerOptions.timeoutMs` and runner fallback | Reuse/adjust locally | The runner already owns the child lifecycle and explicit override; only the omitted default is wrong | N/A; reject a new AppConfig/environment/UI setting because no runtime selection use case is approved |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent loop | Outer sequencing, phase fences, result commit timing, continuation status | DS-001–DS-007, DS-010 | AgentTurnRunner | Extend/contract | More explicit ownership, not more responsibilities overall |
| Input processing/message projection | Identity validation, configured processors, optional carrier | DS-001, DS-004, DS-005, DS-013 | AgentInputPipeline | Contract | Remove modes/trace side effect only |
| LLM request assembly | Canonical request transaction | DS-001, DS-004–DS-008 | LLMRequestAssembler | Contract | One entrypoint |
| LLM streaming | Chunk-to-segment/invocation projection | DS-002, DS-006, DS-007, DS-009 | LlmStreamingResponseHandler | Contract | One concrete handler |
| Tool execution | Approval/execution/external wait | DS-002, DS-003, DS-010 | ToolPhase | Reuse | No redesign |
| Memory | Canonical/raw facts, protocol safety, compaction, recovery | DS-001, DS-002, DS-007, DS-008, DS-012 | MemoryManager | Contract | Delete only continuation boundary writer |
| Package exports | Current supported API surface | DS-011 | Package index | Contract | No aliases |
| Server compaction execution | Child creation, final-output wait policy, typed error projection, cleanup | DS-014 | ServerCompactionAgentRunner | Local policy correction | Collector and ordinary factory retain their current contracts |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-turn-runner.ts` | Agent loop | AgentTurnRunner | Outer loop plus final result-batch commit sequencing | Existing lifecycle owner | Reuses MemoryManager/phase boundaries |
| `tool-continuation-input-builder.ts` | Input/message projection | ToolContinuationInputBuilder | Pure display/context carrier projection | One cohesive transform | Reuses ContextFile/display formatter |
| `agent-input-pipeline.ts` | Input processing | AgentInputPipeline | Processor lifecycle and nullable carrier construction | Existing boundary | Reuses LLMUserMessage |
| `llm-request-assembler.ts` | Request assembly | LLMRequestAssembler | One optional-append transaction | Existing owner | Reuses RequestPackage/recovery identity |
| `llm-phase.ts` | Agent loop/LLM | LlmPhase | Direct schema/handler setup and one stream lifecycle | Existing owner | Reuses ToolSchemaProvider/handler |
| `llm-streaming-response-handler.ts` | LLM streaming | LlmStreamingResponseHandler | Text and guarded native tool/file projection | One bounded local state owner | Reuses SegmentEvent/ToolInvocation |
| `memory-manager.ts` | Memory | MemoryManager | Retain canonical APIs; remove continuation writer | Existing authority | Reuses RawTraceItem/store internally |
| `memory-ingest-input-processor.ts` | Input processing/memory adapter | MemoryIngestInputProcessor | External user ingestion; TOOL pass-through | One processor concern | Reuses MemoryManager user API |
| `tool-invocation-batch.ts` | Agent turn state | ToolInvocationBatch | Immutable active ID/order and admission | Tight subject | Reuses ToolInvocation IDs |
| `server-compaction-agent-runner.ts` | Server compaction execution | ServerCompactionAgentRunner | Ordinary completion-wait default plus existing child lifecycle | Existing authoritative owner | Reuses existing options, collector, AgentManager, and error type |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Additional-message/request selection | No new file; `AgentInputPipelineResult.llmUserMessage` | Input processing | A single existing result shape is enough | Yes — remove `llmRequestMode` | Yes — data absence replaces mode | New continuation options/mode object |
| Request assembly lifecycle | Existing `llm-request-assembler.ts` | Request assembly | Both paths are identical apart from append | Yes — one method | Yes — no parallel request entrypoints | Generic workflow engine |
| Stream handler contract | No abstract shared file; one concrete class | LLM streaming | Only one implementation remains | Yes — factory/result wrapper removed | Yes — no pass-through/native variants | Kitchen-sink provider client |
| Context file extraction | `tool-continuation-input-builder.ts` | Input/message projection | Used only for continuation carrier construction | Yes — remove context/turn/mode dependencies | Yes — one carrier representation | General continuation manager |
| Compaction completion default | No shared file; module-local constant in `server-compaction-agent-runner.ts` | Server compaction execution | Only the runner owns omission policy | N/A | No — the explicit option and resolved duration are one contract | Global timeout/config registry |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentInputPipelineResult` | Yes | Yes (`llmRequestMode`) | Low | `llmUserMessage` is nullable and is the sole append fact |
| `ToolInvocationBatch` | Yes | Yes (settled map) | Low | Keep private readonly ID list/set and explicit copy getter |
| `RequestPackage` | Yes | N/A | Low | Retain unchanged |
| `AgentInputUserMessage` TOOL carrier | Yes after mode removal | Yes (`tool_continuation_mode`) | Low | Sender type identifies lifecycle; context files identify carrier; `turn_id`/`tool_result_count` remain factual processor context only |
| Raw trace tool lifecycle | Yes | Future coordination marker removed | Low | Persist calls/results only; tolerate historical extras generically |
| `ServerCompactionAgentRunnerOptions.timeoutMs` | Yes | N/A | Low | Preserve the one optional override; omission resolves once to the runner-local `300_000` default |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/agent/loop/agent-turn-runner.ts` | Agent loop | AgentTurnRunner | Turn sequencing, result processing/status, active-batch clear, one core commit, continuation | Keeps the end-to-end owner visible | Yes |
| `src/agent/loop/tool-continuation-input-builder.ts` | Input projection | ToolContinuationInputBuilder | Pure semantic/context carrier construction | Prevents runner overload without a framework | Yes |
| `src/agent/pipelines/agent-input-pipeline.ts` | Input processing | AgentInputPipeline | Validate/run processors and return nullable LLM message | One entry boundary for both leg kinds | Yes |
| `src/agent/input-processor/memory-ingest-input-processor.ts` | Input/memory adapter | MemoryIngestInputProcessor | Persist external input only; TOOL no-op after validation | Keeps general input memory policy localized | Yes |
| `src/agent/llm-request-assembler.ts` | Request assembly | LLMRequestAssembler | Single transactional request assembly | One lifecycle, one method | Yes |
| `src/agent/loop/llm-phase.ts` | LLM call lifecycle | LlmPhase | Direct tool schema/handler setup and provider stream | Setup is small and single-use | Yes |
| `src/agent/streaming/handlers/llm-streaming-response-handler.ts` | LLM streaming | LlmStreamingResponseHandler | General text plus gated native tool/file deltas | One concrete bounded state owner | Yes |
| `src/agent/tool-invocation-batch.ts` | Turn state | ToolInvocationBatch | Active identity/order/admission only | Tight batch subject | Yes |
| `src/agent/factory/agent-factory.ts` | Agent construction | AgentFactory | Stop auto-registering removed core memory result processor | Construction only | Yes |
| `src/memory/memory-manager.ts` | Memory | MemoryManager | Retain canonical memory APIs; remove continuation-boundary method | Authoritative memory surface | Yes |
| Streaming/result processor/package index files | Package exports | Export boundary | Export only supported current symbols | Current contract projection | Yes |
| `autobyteus-server-ts/src/agent-execution/compaction/server-compaction-agent-runner.ts` | Server compaction execution | ServerCompactionAgentRunner | Define the named `300_000` ms omitted-option default and retain existing wait/error/cleanup lifecycle | One owner-local policy correction in the existing lifecycle file | Yes |

## Applied Patterns (If Any)

- **Owner-orchestrated phase loop:** `AgentTurnRunner` sequences existing focused phases and off-spine transforms without absorbing their internals.
- **Structural optionality instead of strategy/mode selection:** nullable `llmUserMessage` and resolved-tool presence express real data facts.
- **Transactional request assembly:** one stable-base snapshot encloses optional append, sanitation, render, and rollback.
- **Bounded local stream state:** indexed native deltas/file projections remain inside one handler and do not define the top-level architecture.
- **Current-schema direct use:** historical generic raw-trace records remain readable without migration branches.
- **Owner-local default policy:** the server runner resolves an omitted timeout beside the lifecycle it governs; mechanisms below receive an explicit value and callers above do not duplicate the policy.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/loop/agent-turn-runner.ts` | File | AgentTurnRunner | Outer native turn loop and result commit timing | Existing main-line control folder | Provider delta parsing or store writes |
| `autobyteus-ts/src/agent/loop/tool-continuation-input-builder.ts` | File | ToolContinuationInputBuilder | Pure result-to-input carrier projection | Serves the loop return path | Memory/context/turn ownership or modes |
| `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts` | File | AgentInputPipeline | Processor execution and optional LLM message | Existing pipeline boundary | Request modes or assembler selection |
| `autobyteus-ts/src/agent/input-processor/memory-ingest-input-processor.ts` | File | MemoryIngestInputProcessor | External input persistence | Existing processor concern | TOOL continuation trace writes |
| `autobyteus-ts/src/agent/llm-request-assembler.ts` | File | LLMRequestAssembler | One canonical request transaction | Existing request boundary | Separate continuation method |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | File | LlmPhase | One provider-call setup/stream/settlement | Existing phase owner | Factory selection or duplicate assembly branch |
| `autobyteus-ts/src/agent/streaming/handlers/llm-streaming-response-handler.ts` | File | LlmStreamingResponseHandler | Text and gated native tool/file chunk projection | Streaming concern folder | Provider calls, tool execution, persistence |
| `autobyteus-ts/src/agent/tool-invocation-batch.ts` | File | ToolInvocationBatch | Active batch identity/order/admission | Existing domain subject location | Settled result aggregation |
| `autobyteus-ts/src/memory/memory-manager.ts` | File | MemoryManager | Canonical memory authority | Existing persistence boundary | Continuation-only marker method |
| `autobyteus-ts/src/agent/streaming/{index.ts,handlers/index.ts}` | File | Package export boundary | Export current handler/segments as applicable | Existing module discovery | Legacy aliases/factory/pass-through |
| `autobyteus-ts/src/agent/tool-execution-result-processor/index.ts` | File | Package export boundary | Export base/definition/registry only | Existing extension surface | Removed built-in memory processor |
| `autobyteus-server-ts/src/agent-execution/compaction/server-compaction-agent-runner.ts` | File | ServerCompactionAgentRunner | Resolve omitted `timeoutMs` to named `300_000` ms default; preserve child wait/error/cleanup | Existing server compaction lifecycle boundary | AppConfig/env/UI setting, adaptive timeout logic, collector-default duplication, unrelated timeout edits |

Deleted paths are listed in the removal plan. The existing layout remains deliberately compact because the codebase already separates loop, pipelines, input processors, streaming handlers, tool-result processors, and memory. Creating new folders/modules would add structural depth that the contracted responsibilities do not need.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/agent/loop` | Main-Line Domain-Control | Yes | Low | Runner/phases/input projection serve one turn loop; pure builder is small and return-path-specific |
| `src/agent/pipelines` | Off-Spine Concern | Yes | Low | Processor ordering stays separate from phase sequencing |
| `src/agent/input-processor` | Off-Spine Concern | Yes | Low | Concrete input transformations only |
| `src/agent/streaming/handlers` | Bounded Local | Yes | Low after contraction | One stream-state owner; delete hierarchy/factory variants |
| `src/agent/tool-execution-result-processor` | Off-Spine Concern | Yes | Low | Custom extension contracts only after built-in memory owner is removed |
| `src/memory` | Persistence-Provider | Yes | Medium but justified existing subsystem | MemoryManager encapsulates stores/protocol/compaction; this ticket removes drift rather than reorganizing the subsystem |
| `autobyteus-server-ts/src/agent-execution/compaction` | Main-Line Server Execution Boundary | Yes | Low | Runner owns lifecycle/default; collector owns event settlement for the supplied duration; no new folder or layer is justified |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Text-only continuation | `processToolContinuation(...) -> { llmUserMessage: null } -> prepareRequest(null, identity)` | `native_api -> tool_history_only -> prepareToolContinuationRequest()` | The data absence is the behavior; there is no mode to select |
| Context carrier | `contextFiles.length > 0 -> LLMUserMessage -> prepareRequest(message, identity)` | A general continuation payload with mode/type/renderer branches | Preserves the one exceptional append without a framework |
| Result ownership | `custom processors -> runner -> MemoryManager.ingestToolResults(finalArray)` | Per-result memory processor defers, then builder writes later | One batch lifecycle owner invokes one memory authority |
| No-tool stream | `new LlmStreamingResponseHandler({toolCallsEnabled:false})` and no `tools` kwarg | Select `PassThrough` from a handler factory | Same stream contract, explicit safety fact, no implementation selection |
| Durable history | `tool_call + tool_result`; continuation status remains in memory only as runtime state | Persist `Native API tool continuation` or rename it | Internal control flow is not a semantic conversation fact |
| Runner decomposition | Runner sequences `LlmPhase`, `ToolPhase`, pipelines, memory boundary, pure builder | Merge all parsing, execution, persistence, media, and recovery into runner | Simplification must clarify ownership, not create a god object |
| Compaction timeout default | `const DEFAULT_COMPACTION_AGENT_COMPLETION_TIMEOUT_MS = 300_000; this.timeoutMs = options.timeoutMs ?? DEFAULT_...` | Add a general app setting, replace every `120_000`, move the fallback into the collector, or wait five real minutes in a test | Expresses one approved owner-local policy, preserves explicit injection, and avoids unrelated behavior/configuration expansion |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `native_api` constant/metadata with one value | Unknown imports/tests | Rejected | Delete; use optional message |
| Retain `tool_history_only` alias/type | Minimize caller edits | Rejected | Delete every branch and duplicate assembler method |
| Keep no-op `MemoryIngestToolResultProcessor` | Unknown external config imports | Rejected | Runner calls MemoryManager; release-note public contraction |
| Keep factory returning the sole handler | Minimize LlmPhase edits | Rejected | Direct local setup in LlmPhase |
| Keep pass-through as subclass/alias | Unknown external imports | Rejected | One guarded concrete handler |
| Export old `ApiToolCallStreamingResponseHandler` as alias | Preserve old class name | Rejected | Export only `LlmStreamingResponseHandler` |
| Retain `ingestToolContinuationBoundary` as no-op | Preserve method calls | Rejected | Remove the only caller and method; no replacement marker |
| Hide old trace cards with a reader filter | Improve historical UI appearance | Rejected | No migration/filter compatibility; old generic data remains, future writer removed |

## Derived Layering (If Useful)

The target can be read as four derived depths after ownership is established:

1. **Turn control:** `AgentTurnRunner`, `LlmPhase`, `ToolPhase`.
2. **Owned transformations:** input/result pipelines, `ToolContinuationInputBuilder`, `LlmStreamingResponseHandler`, `LLMRequestAssembler`.
3. **Authoritative state/persistence:** `AgentTurn`/`ToolInvocationBatch`, `MemoryManager`.
4. **Provider/external adapters:** ToolSchemaProvider/renderers/LLM client, approval/external input port, notifiers.

This layering is explanatory only. Dependency rules and authoritative boundaries above govern implementation.

## Change / Refactor Sequence

1. Lock the result-return spine first: add runner-owned final batch commit after custom processors/status/terminal lifecycle and after active-batch admission is closed; make the existing builder pure. Keep native provider behavior unchanged.
2. Replace `ToolResultContinuationBuilder` with `ToolContinuationInputBuilder` accepting ordered processed events plus the explicit active turn ID; remove memory/context-object/turn-object/mode ownership while retaining factual turn/count processor metadata.
3. Contract `AgentInputPipelineResult` to nullable `llmUserMessage`; derive null versus carrier after configured processors; update runner status derivation from message presence.
4. Merge assembler methods into one optional-message transaction while preserving the exact pre-compaction, snapshot, optional append, pre-render, sanitation, render, and rollback sequence.
5. Remove `MemoryIngestToolResultProcessor`, AgentFactory auto-registration, deferral logic/logs, and exports.
6. Make `MemoryIngestInputProcessor` side-effect free for TOOL input and delete `MemoryManager.ingestToolContinuationBoundary`; ensure no replacement raw-trace record is added.
7. Create/rename the one concrete `LlmStreamingResponseHandler`, add the explicit tool-delta gate, move ordinary/no-tool behavior into it, and update `LlmPhase` to build schemas/handler directly.
8. Delete factory/result wrapper/abstract base/pass-through/old handler paths and update package indices without aliases.
9. Contract `ToolInvocationBatch` to readonly identity/order/admission state; remove unused settlement APIs and imports.
10. Remove all mode symbols, duplicate branches, obsolete exports/tests references, and stale documentation vocabulary. Confirm repository-wide absence of deleted production symbols and raw-trace writer.
11. Run implementation-scoped type/build checks; after code review, let `api_e2e_engineer` investigate/update durable coverage and execute the approved use-case/spine matrix.
12. For SR-002, add the module-local `DEFAULT_COMPACTION_AGENT_COMPLETION_TIMEOUT_MS = 300_000` in `server-compaction-agent-runner.ts` and replace only the existing `options.timeoutMs ?? 120_000` fallback. Do not alter the option type, backend factory construction, collector, cancellation seams, or unrelated timeout literals.
13. Run focused server implementation checks. After code review, let `api_e2e_engineer` add or update deterministic direct coverage of the omission/override contract using spies or fake timers; no check should spend five minutes waiting.

No temporary compatibility seam may remain at the end of any implementation commit. If sequencing requires a transient compile break locally, complete each conceptual step before handoff.

## Key Tradeoffs

- Direct setup adds a few lines to the already substantial `LlmPhase`, but removes a one-caller factory and makes the one-call lifecycle visible. Schema formatting and stream state remain separate owners, so the phase does not become a blob.
- Runner-owned result commit increases its explicit sequencing by one authoritative call, but removes persistence from a processor and builder. This is appropriate because the runner already owns the final batch lifecycle.
- A pure continuation input builder remains instead of merging everything into the runner. The small class is justified by recursive context-file hydration and semantic carrier formatting; it is not a mode framework.
- Renaming the sole handler improves domain naming but intentionally breaks unknown imports. The requirements approve clean public contraction and reject aliases.
- Historical continuation cards remain in old raw traces. Avoiding a migration is safer and does not affect runtime correctness; new traces become clean immediately.
- A five-minute ordinary compaction wait reduces premature failures for slow local inference at the cost of holding a genuinely stalled child up to three minutes longer. The explicit option remains available for bounded tests/custom constructors, while a product configuration surface is rejected until a real selection use case exists.

## Risks

- A no-tools handler without a strict `toolCallsEnabled` guard could emit tool segments/invocations for unexpected provider deltas. Construction and feed behavior must enforce the gate.
- Incorrect result-commit placement could allow late external results or duplicate facts. Preserve current active-batch clearing before the one commit and use the final processed array in raw invocation order.
- Request-method consolidation could change compaction/recovery timing. Follow DS-008 exactly and keep snapshot restore on any failure after capture.
- Context files could be evaluated before custom input processors and lose supported transformations. Decide nullable message only after processor completion.
- Custom result processors can alter IDs/results. Commit their final events and rely on `MemoryManager` canonical identity validation rather than bypassing it.
- Renamed/deleted root exports may break unknown consumers. Do not mask this with aliases; record the contraction in release documentation.
- Old durable tests assert removed architecture (factory selection, deferral, continuation trace). Downstream coverage investigation must distinguish stale structural assertions from behavior evidence.
- `LlmPhase` separately emits reasoning segments while the handler owns text/tool/file segments. This existing split must remain coherent during handler contraction; it is not in scope to redesign reasoning ownership.
- A broad search-and-replace of `120_000` could silently change server startup, process, provider, or test budgets. Scope implementation and review to the runner's omitted-option fallback.
- If the five-minute default were placed in the collector or duplicated in the backend factory, policy ownership would fragment. The collector must continue receiving an explicit duration and the ordinary factory must continue omitting the override.
- Longer waiting must not be mistaken for slower cancellation or delayed earlier failure. Preserve timer clearing on terminal/failure settlement and the runner's existing `finally` cleanup; do not add sleeps or swallow events.

## Guidance For Implementation

- Treat the spine map and use-case mapping as the behavioral guardrail. A smaller diff is not better if any spine becomes incomplete.
- Preserve the exact current ordering around result processing: per-result custom processors, abort fences, status, terminal lifecycle, batch closure, one core memory commit, then continuation input/pipeline/status.
- Keep `MemoryManager.ingestToolResults` as the only normal core result writer. Never write raw/canonical result storage separately from the runner.
- Implement `AgentInputPipelineResult.llmUserMessage` as required-but-nullable, not optional, so callers must handle absence explicitly.
- Build the context carrier only after all configured input processors have run. External input must never return null.
- Keep `ToolContinuationReadyEvent` only for a no-carrier same-turn transition. A carrier leg continues to use `LLMUserMessageReadyEvent` as today.
- Do not persist either status event as `tool_continuation`; actual input/tool facts remain the memory authority.
- In the unified assembler, perform optional append after the stable recovery snapshot exactly where the current external-user append occurs.
- In the unified handler, process text regardless of tool configuration; process `chunk.tool_calls` only when `toolCallsEnabled` is true. Keep indexed call state and write/edit streamers unchanged.
- Keep provider schema creation conditional on a non-empty resolved tool list and omit the `tools` stream kwarg when no schemas exist.
- Contract `ToolInvocationBatch` fields to private/readonly where practical and expose copies through existing identity getters; do not remove `accepts`, `expectsInvocation`, or expected-ID ordering.
- Remove old files/exports rather than leaving forwarding shims. Repository-wide searches for all removal-plan symbols are part of implementation completion evidence.
- Do not modify unrelated XML context utilities, JSON parsing/schema formatting, provider renderers, queue sentinel objects, custom processor registries, compaction, protocol repair, or external tool result transport.
- In the SR-002 server delta, change exactly the runner-local omitted-option fallback to a named constant with value `300_000`. Keep `options.timeoutMs ?? constant` so explicit values such as the existing 10 ms and 1,000 ms test injections remain authoritative.
- Do not add `AppConfig`, environment variables, settings UI/schema/docs, adaptive context-size calculations, or a second timeout default in `CompactionRunOutputCollector` or the backend factory. Those would be new unapproved product/architecture surfaces rather than this bounded correction.
- Preserve DS-014: earlier final output and failure events settle immediately, timeout still produces the existing typed/wrapped failure, and the runner still unsubscribes and terminates the child in `finally`. Do not change surrounding parent interruption/cancellation behavior.
- Direct coverage must prove the ordinary omitted-option value is `300_000` and the explicit override still wins without a real five-minute wait. A spy on `CompactionRunOutputCollector.prototype.waitForFinalOutput`, constructor observation, or fake timers is appropriate; exact durable coverage edits remain `api_e2e_engineer`-owned.
- Implementation-scoped checks should cover type/build viability and focused changed-source tests where possible. Durable repository coverage changes and broader execution remain downstream team responsibilities.
