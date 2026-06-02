# Design Spec

## Current-State Read

Current AutoByteus compaction has two different histories in play:

1. `WorkingContextSnapshot` holds the `Message[]` that is actually rendered into provider requests.
2. `raw_traces.jsonl` holds durable runtime events (`RawTraceItem[]`) with internal metadata such as `turn_id`, `seq`, `source_event`, `trace_type`, and tool bookkeeping.

The token-pressure trigger comes from the LLM response usage (`tokenUsage.prompt_tokens`) for the rendered provider request. That pressure is therefore caused by the rendered working context, not by raw trace file size.

The current execution path then crosses the wrong boundary:

`LlmPhase -> evaluateLlmPhaseCompaction -> PendingCompactionExecutor -> listRawTracesOrdered() -> CompactionWindowPlanner -> Compactor -> CompactionSnapshotBuilder -> resetWorkingContextSnapshot(...)`

The compaction executor selects and summarizes raw trace blocks, then rebuilds the working context as a system message plus one user memory message containing compacted memory sections and `[RAW_FRONTIER]` text. The raw frontier formatter emits block ids, turn ids, sequence numbers, and trace type labels directly into the LLM-facing prompt.

Current timing facts:

- The threshold check happens after every completed LLM response is committed to `WorkingContextSnapshot`, regardless of whether that response contains tool calls.
- For a no-tool assistant response, `LlmPhase` appends the assistant message to `WorkingContextSnapshot`, checks the threshold, and the target design executes compaction immediately if the threshold is reached.
- For a tool-call assistant response, `LlmPhase` appends an assistant `ToolCallPayload` message, checks the threshold, and the target design records a pending compaction request if the threshold is reached; execution waits until tools run and tool results are ingested.
- For native tool continuation, `ToolResultContinuationBuilder` ingests tool results before `LLMRequestAssembler.prepareToolContinuationRequest(...)`; the assembler then executes pending compaction before rendering the continuation request.

So the runtime already has enough timing information to compact from the updated working context. The defect is that execution currently compacts from raw traces and reconstructs raw frontier text instead of transforming one provider-renderable `Message[]` into another provider-renderable `Message[]`.

Constraints the target design must respect:

- Provider renderers own provider-specific payload shape.
- Native tool continuation requires structured assistant tool-call messages and matching tool result messages.
- Newly issued / unconsumed tool-call and tool-result messages must survive compaction unchanged.
- Older consumed tool cycles may be summarized naturally.
- Raw traces must remain useful for audit, provenance, archive/pruning, and diagnostics, but must not be the authoritative LLM-facing history representation.
- `llm/utils/messages.ts` must not import memory-owned provenance; only neutral non-rendered metadata is allowed in LLM core.
- Higher-level callers must mutate working context only through `MemoryManager` APIs, not through direct `workingContextSnapshot.append*` calls.
- Non-native/text-parser tool continuations must be modeled explicitly through canonical messages and text-history renderers, not by appending duplicate synthetic aggregate user messages.
- No compatibility dual-path should remain for the replaced runtime compaction path.

## Intended Change

Refactor compaction into a working-context transformation:

```text
old WorkingContextSnapshot Message[]
  -> message-window planner selects compacted prefix + retained suffix
  -> compaction summarizer summarizes selected settled message units
  -> compacted-memory store records episodic/semantic output
  -> working-context rebuilder creates new Message[]
  -> MemoryManager.resetWorkingContextSnapshot(newMessages)
  -> provider renderer later renders newMessages
```

The new message array should have this shape:

```text
system/base message(s)
compacted memory message with current objective/progress/findings/decisions/open work/next step
recent natural message suffix retained by budget
protected live tool-call/result suffix retained structurally
```

Compaction is therefore not raw-trace-to-prompt formatting. It is a `Message[] -> Message[]` operation, with raw traces used as supporting provenance and storage records.

### Architecture Review Round 1 Revisions

The following clarifications are mandatory and supersede any looser wording elsewhere in this spec:

1. **Neutral message metadata is mandatory.** `autobyteus-ts/src/llm/utils/messages.ts` may add only a renderer-ignored, memory-neutral `MessageMetadata` container. It must not import `src/memory/*`. `autobyteus-ts/src/memory/message-provenance.ts` owns typed helper functions and validation for reading/writing memory provenance inside that neutral metadata container. Provider renderers must ignore metadata.
2. **`MemoryManager` is the authoritative working-context mutation boundary.** Higher-level callers must not call `memoryManager.workingContextSnapshot.append*` directly. `MemoryManager` must expose explicit append/ingest APIs for system prompt insertion, user request append, assistant response append, assistant tool response append, and tool result append. Those APIs attach provenance when available and persist the snapshot consistently. `workingContextSnapshot` should become private or read-only internal after migration.
3. **Non-native/text-parser tool continuation is in scope.** Non-native modes should still use canonical working-context messages as the source of truth. Tool results must be committed as canonical tool-result messages before compaction. The legacy synthetic aggregate `SenderType.TOOL` user message must not be appended as an extra LLM-facing user message after compaction; the same-turn continuation should be represented as a `tool_history_only` request so text-history renderers convert canonical tool payloads into text.


## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior change + refactor + UX-quality bug fix.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue; File Placement Or Responsibility Drift; Shared Structure Looseness around message/raw-trace correlation.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence:
  - `CompactionSnapshotBuilder` currently emits `[RAW_FRONTIER]` as user prompt content.
  - `FrontierFormatter` emits `[BLOCK ...] turn=... kind=...` and `(turnId:seq) TRACE_TYPE:` lines.
  - `PendingCompactionExecutor` selects from `listRawTracesOrdered()` even though token pressure is measured from the rendered working context.
  - Existing provider renderers already know how to serialize `ToolCallPayload` and `ToolResultPayload`; compaction bypasses that boundary.
- Design response: Move runtime compaction authority to working-context message planning and snapshot rebuilding. Keep raw trace handling behind provenance/archive concerns. Replace raw frontier prompt formatting with canonical `Message[]` suffix retention.
- Refactor rationale: A local string cleanup would still leave compaction based on the wrong substrate. Tool continuity, natural prompt quality, and budget-based retention all require a message-window owner.
- Intentional deferrals and residual risk, if any:
  - Exact tokenizer integration can be deferred behind a size-estimator interface; initial implementation may use renderer-normalized character/token estimates.
  - Tool result content that is itself too large for the next LLM call needs a separate tool-output truncation/artifact-reference policy. This design protects live tool result messages; it does not solve arbitrary oversized tool output by silently summarizing an unconsumed native result.

## Terminology

- `Working context`: the current `WorkingContextSnapshot` and its canonical `Message[]` used for provider rendering.
- `Message unit`: a planner-level unit derived from `Message[]`, such as one normal message, one assistant tool-call message, one tool-result group, or one assistant-tool-call-plus-results protocol group.
- `Compacted prefix`: settled message units selected for summarization.
- `Retained suffix`: recent message units kept verbatim after compaction.
- `Protected live tool suffix`: newest unconsumed provider-required tool-call/result group that must remain structured.
- `Raw trace`: durable event/provenance record, not the LLM-facing history source.

## Design Reading Order

Read this design as:

1. runtime and compaction spines;
2. ownership model for message planning, summarization, rebuilding, and provenance;
3. concrete file mapping;
4. migration/refactor sequence and tests.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove normal runtime dependence on raw trace interaction blocks for LLM-facing compaction.
- Legacy behavior to eliminate:
  - `[RAW_FRONTIER]` in normal LLM-facing working context.
  - `FrontierFormatter` and `CompactionTaskPromptBuilder` emitting raw trace coordinates in normal compaction prompts.
  - `PendingCompactionExecutor` planning runtime compaction from `RawTraceItem[]` as the primary source.
- Allowable retained use:
  - raw trace archive/provenance internals;
  - one-time recovery/bootstrap projection only when no valid working context snapshot exists, and that projection must produce natural messages, not raw frontier text.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | `Primary End-to-End` | LLM response token usage exceeds threshold | Rebuilt `WorkingContextSnapshot` | `PendingCompactionExecutor` + working-context compaction owners | Main behavior: pressure turns old messages into compacted memory and retained messages. |
| DS-002 | `Primary End-to-End` | Tool-call response crosses threshold | Provider-valid continuation payload | `AgentTurnRunner`/`LlmPhase` timing plus `PendingCompactionExecutor` | Ensures tools execute first and live tool suffix survives compaction. |
| DS-007 | `Primary End-to-End` | Non-native/text-parser tool results | Text-rendered tool continuation payload | `AgentTurnRunner` + `MemoryManager` + text-history renderer | Ensures synthetic continuation mode uses canonical messages and does not duplicate or bypass compaction. |
| DS-003 | `Return-Event` | Compaction lifecycle | UI/status subscribers | `CompactionRuntimeReporter` | UI must move `requested -> started -> completed/failed` at the right time. |
| DS-004 | `Bounded Local` | `Message[]` | `MessageCompactionPlan` | `WorkingContextMessageWindowPlanner` | Determines compacted prefix, recent suffix, and protected tool suffix. |
| DS-005 | `Bounded Local` | Message units with provenance | raw trace archive/pruning | `WorkingContextCompactor` / provenance mapper | Keeps durable store maintenance behind compaction, without making raw traces prompt-authoritative. |
| DS-006 | `Primary End-to-End` | Agent bootstrap with missing/invalid snapshot | Safe working context snapshot | `WorkingContextSnapshotBootstrapper` | Prevents fallback bootstrap from reintroducing raw frontier prompts. |

## Primary Execution Spine(s)

### DS-001: No-tool final-response immediate compaction

`LlmPhase final response -> MemoryManager commits assistant Message -> evaluateLlmPhaseCompaction -> PendingCompactionExecutor.executeNow -> WorkingContextMessageWindowPlanner -> WorkingContextCompactor/Summarizer -> WorkingContextSnapshotRebuilder -> MemoryManager.resetWorkingContextSnapshot`

### DS-002: Tool-call response deferred-until-results compaction

`LlmPhase tool-call response -> MemoryManager commits assistant ToolCallPayload Message -> evaluateLlmPhaseCompaction(requested only) -> ToolPhase executes tools -> ToolResultContinuationBuilder commits ToolResultPayload Messages -> LLMRequestAssembler.prepareToolContinuationRequest -> PendingCompactionExecutor -> WorkingContextMessageWindowPlanner protects live tool suffix -> renderer renders compacted context + structured tool suffix`

### DS-007: Non-native/text-parser tool continuation

`LlmPhase tool-call response in xml/json/sentinel mode -> MemoryManager commits assistant ToolCallPayload Message -> evaluateLlmPhaseCompaction(requested only if threshold reached) -> ToolPhase executes tools -> ToolResultContinuationBuilder commits ToolResultPayload Messages through MemoryManager -> AgentInputPipeline marks SenderType.TOOL continuation as tool_history_only/text_history -> LLMRequestAssembler.prepareToolContinuationRequest -> PendingCompactionExecutor protects canonical tool-call/result suffix -> text-history renderer converts ToolCallPayload/ToolResultPayload to parser-mode text -> provider receives compacted context + text-rendered live tool history`

### DS-006: Bootstrap fallback

`AgentFactory/bootstrap -> WorkingContextSnapshotBootstrapper -> valid persisted snapshot OR compacted memory + safe natural recovery projection -> MemoryManager.resetWorkingContextSnapshot`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A final no-tool LLM response is already in the working context. If usage crosses threshold, compaction runs immediately and rebuilds the message array before the agent becomes idle. | `LlmPhase`, `MemoryManager`, `PendingCompactionExecutor`, `WorkingContextMessageWindowPlanner`, `WorkingContextSnapshotRebuilder` | `PendingCompactionExecutor` | token budget resolution, status reporting, compactor agent execution |
| DS-002 | A tool-call response is not compacted before tools run. The latest tool-call/result group is present in `Message[]` before compaction and is protected as a structured suffix. | `LlmPhase`, `ToolPhase`, `ToolResultContinuationBuilder`, `LLMRequestAssembler`, `PendingCompactionExecutor`, provider renderer | `AgentTurnRunner` for turn sequencing; `PendingCompactionExecutor` for compaction | tool lifecycle events, renderer-specific payload mapping |
| DS-007 | In non-native parser modes, tool calls/results are still canonical messages. The continuation is `tool_history_only`; text-history renderers, not synthetic aggregate user messages, turn live tool messages into parser-mode text. | `ToolResultContinuationBuilder`, `AgentInputPipeline`, `LLMRequestAssembler`, `WorkingContextMessageWindowPlanner`, text-history renderer | `AgentTurnRunner` for sequencing; `MemoryManager` for message commits | parser-mode renderer selection, media/context-file result handling |
| DS-003 | Compaction status flows outward as lifecycle events; no-tool compaction should not sit in queued state waiting for another user input. | `PendingCompactionExecutor`, `CompactionRuntimeReporter`, notifier/UI | `CompactionRuntimeReporter` | detailed logs, status metadata |
| DS-004 | The planner turns a flat `Message[]` into message units, classifies protected protocol, computes a compacted prefix and retained suffix, and returns a plan. | `WorkingContextMessageUnitBuilder`, `WorkingContextMessageWindowPlanner`, `MessageCompactionPlan` | `WorkingContextMessageWindowPlanner` | message budget calculation, retention policy |
| DS-005 | After summarization succeeds, provenance raw trace ids associated with compacted messages can be archived/pruned. Missing provenance does not alter LLM-facing context. | `MessageProvenance`, `WorkingContextCompactor`, `MemoryStore` | `WorkingContextCompactor` | archive manager, diagnostics |
| DS-006 | Bootstrap prefers persisted working context; fallback must reconstruct natural messages and compacted memory, never raw frontier text. | `WorkingContextSnapshotBootstrapper`, `WorkingContextRecoveryProjector`, `CompactedMemoryMessageBuilder` | `WorkingContextSnapshotBootstrapper` | schema gate, snapshot serializer |

## Spine Actors / Main-Line Nodes

- `LlmPhase`: owns post-stream response handling and deciding whether compaction can execute immediately or must wait for tool results.
- `AgentTurnRunner`: owns turn sequencing across LLM/tool/continuation phases.
- `LLMRequestAssembler`: owns pre-request compaction execution and provider rendering handoff.
- `MemoryManager`: authoritative working context and memory-store boundary.
- `PendingCompactionExecutor`: compaction execution coordinator.
- `WorkingContextMessageWindowPlanner`: owns `Message[]` prefix/suffix planning.
- `WorkingContextCompactor`: owns summarizer execution and compacted memory persistence for selected message units.
- `WorkingContextSnapshotRebuilder`: owns construction of the replacement `Message[]`.
- Provider renderers: own conversion from canonical `Message[]` to provider payload.

## Ownership Map

| Node | Owns | Must Not Own |
| --- | --- | --- |
| `LlmPhase` | response completion timing, parsed tool-call outcome, immediate-vs-deferred compaction branch | message-window selection policy, provider payload formatting |
| `AgentTurnRunner` | LLM/tool loop sequencing and lifecycle | compaction content decisions |
| `LLMRequestAssembler` | ensuring pending compaction is resolved before provider request rendering | raw trace planning, summarization |
| `MemoryManager` | authoritative working-context mutation, snapshot lifecycle, provenance attachment, store boundary, ingestion APIs | compaction window policy internals, provider rendering |
| `PendingCompactionExecutor` | lifecycle execution, status reporting, orchestration | tool protocol classification details, provider rendering |
| `WorkingContextMessageWindowPlanner` | message-unit planning, protected suffix classification, retention split | summarizer prompt formatting, storage writes |
| `WorkingContextCompactor` | selected unit summarization and compacted memory persistence | retained suffix construction, provider rendering |
| `WorkingContextSnapshotRebuilder` | final `Message[]` shape | selecting what to compact |
| `MessageMetadata` / `MessageProvenance` | neutral non-rendered metadata in LLM core; memory-owned provenance helpers over that metadata | LLM-visible prompt semantics; memory imports inside LLM core |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `MemoryManager.requestCompaction(...)` | `PendingCompactionExecutor` executes later/immediately | Lightweight state flag and operation id | planning or summarization |
| `LLMRequestAssembler.prepareRequest(...)` | `PendingCompactionExecutor` and provider renderer | pre-request package assembly | compaction policy |
| `WorkingContextSnapshot.reset(...)` | `MemoryManager` | low-level message replacement | compaction lifecycle or archive policy |
| `MemoryManager.appendWorkingContextUserMessage(...)` | `MemoryManager` | authoritative user-message append/persist/provenance API | rendering or request assembly |
| `MemoryManager.ensureWorkingContextSystemMessage(...)` | `MemoryManager` | authoritative system/base prompt insertion | prompt processing or provider formatting |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Normal runtime use of `CompactionWindowPlanner` over `RawTraceItem[]` | Compaction source must be `WorkingContextSnapshot Message[]` | `WorkingContextMessageWindowPlanner` | In This Change | Raw planner can be deleted or restricted to tests only; do not keep as runtime fallback. |
| `FrontierFormatter` in LLM-facing snapshot path | Leaks internal metadata | `WorkingContextSnapshotRebuilder` retaining `Message[]` suffix | In This Change | If retained, rename/move to debug-only formatter. |
| `[RAW_FRONTIER]` user-message section | Not LLM-natural and breaks structured tool history | Retained suffix `Message[]` | In This Change | Tests expecting it must be replaced. |
| `CompactionTaskPromptBuilder` raw trace block rendering | Summarizer should see natural transcript units | `WorkingContextCompactionPromptBuilder` | In This Change | Existing output JSON contract can remain. |
| Split `LlmPhase` ingestion pattern for assistant tool responses | Hard to attach provenance and creates raw trace/message order mismatch | `MemoryManager.ingestAssistantToolResponse(...)` | In This Change | Existing lower-level ingestion helpers may remain internal only if not used by main spine. |
| Direct `memoryManager.workingContextSnapshot.appendMessage(...)` in `LLMRequestAssembler` | Bypasses `MemoryManager` provenance/persistence authority | `MemoryManager.appendWorkingContextUserMessage(...)` and `MemoryManager.ensureWorkingContextSystemMessage(...)` | In This Change | `LLMRequestAssembler` must request mutation through MemoryManager only. |
| Legacy synthetic aggregate user continuation for non-native tool results | Duplicates canonical tool result history and is appended after pending compaction today | `tool_history_only` continuation + text-history renderers over canonical tool messages | In This Change | `SenderType.TOOL` remains an internal continuation signal, not an LLM-facing aggregate user message. |
| Bootstrap fallback that rebuilds snapshot from raw frontier blocks | Reintroduces wrong prompt shape when snapshot missing | `WorkingContextRecoveryProjector` + `CompactedMemoryMessageBuilder` | In This Change | Fallback may read raw traces only to produce natural messages. |

## Return Or Event Spine(s) (If Applicable)

`PendingCompactionExecutor -> CompactionRuntimeReporter.emitStatus(requested/started/completed/failed) -> notifier -> Activity UI/logs`

Design requirements for status:

- No-tool threshold crossing should emit `requested`, then `started`, then `completed` in the same post-response lifecycle without another user input.
- Tool-call threshold crossing should emit `requested` after assistant tool-call message commit, then `started/completed` after tool results are ingested and before continuation rendering.
- Failure should preserve the pending compaction state and block/avoid unsafe provider dispatch as existing preparation errors do.

## Bounded Local / Internal Spines (If Applicable)

### Parent owner: `WorkingContextMessageWindowPlanner`

`Message[] -> MessageUnit[] -> classify protected suffix -> estimate retained size -> choose compacted prefix / recent suffix -> MessageCompactionPlan`

This bounded local spine matters because the design must not use turn count or raw trace count. It must use message units, provider protocol constraints, and budget.

### Parent owner: `WorkingContextCompactor`

`Compactable MessageUnit[] -> transcript prompt -> compaction agent -> parsed CompactionResult -> EpisodicItem/SemanticItem persistence -> raw provenance archive/prune`

This bounded local spine matters because the compaction LLM should summarize natural transcript content, not internal trace coordinates.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Token/size estimation | DS-004 | `WorkingContextMessageWindowPlanner` | estimate or compute message unit token cost and retention budgets | planner needs budget awareness without knowing whether the source is heuristic or exact | LlmPhase or renderer becomes policy blob |
| Compaction prompt formatting | DS-005 | `WorkingContextCompactor` | render compactable message units into natural summarizer prompt | separates summary input from unit selection | planner starts owning LLM prompt text |
| Compacted memory message formatting | DS-001/DS-006 | `WorkingContextSnapshotRebuilder` | build natural memory message from retrieved episodic/semantic bundle | one consistent replacement message shape | summarizer or renderer owns memory-prompt wording |
| Message provenance | DS-005 | `WorkingContextCompactor` and `MemoryManager` | map messages to raw trace ids for archive/prune | raw traces stay supporting records | raw traces become prompt-authoritative again |
| Status/log reporting | DS-003 | `PendingCompactionExecutor` | external activity visibility | UI and diagnostics | business flow becomes mixed with UI concerns |
| Recovery projection | DS-006 | `WorkingContextSnapshotBootstrapper` | natural fallback when no snapshot exists | bootstrap must not depend on raw frontier | runtime path gains legacy fallback behavior |
| Text-parser continuation normalization | DS-007 | `AgentTurnRunner` / `MemoryManager` | represent non-native tool results as canonical messages and signal tool-history-only continuation | keeps parser-mode rendering renderer-owned | duplicate aggregate user messages bypass compaction and double-count tool results |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Working context lifecycle | `src/memory/working-context-snapshot.ts` / `MemoryManager` | Extend | Existing authoritative owner for LLM-facing messages | N/A |
| Provider rendering | `src/llm/prompt-renderers/*` | Reuse | Existing renderers already own native/text tool history | N/A |
| Compaction lifecycle/status | `PendingCompactionExecutor`, `CompactionRuntimeReporter` | Extend | Existing executor/reporter fit lifecycle responsibility | N/A |
| Message planning | none | Create New | Existing planner is raw trace/block based | Needs new working-context owner. |
| Summarizer prompt from messages | current `CompactionTaskPromptBuilder` raw trace based | Replace | Existing prompt builder owns wrong representation | New prompt builder owns message transcript. |
| Raw trace archive/prune | `MemoryStore.pruneRawTracesById` | Reuse behind provenance | Store already owns archive mechanics | N/A |
| Bootstrap fallback | `WorkingContextSnapshotBootstrapper` | Extend | Existing bootstrap owner should remain owner | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `memory/working-context` | canonical messages, provenance metadata, serializer | DS-001/DS-005/DS-006 | `MemoryManager` | Extend | Existing files are flat under `memory`; can stay flat unless folder split is accepted. |
| `memory/compaction` | compaction execution, planning, summarization, rebuilding | DS-001/DS-004/DS-005 | `PendingCompactionExecutor` | Extend/Create within existing subsystem | Create message-window files here. |
| `agent/loop` | response/tool timing, immediate vs deferred execution branch, native and non-native tool-continuation signaling | DS-001/DS-002/DS-007 | `LlmPhase`, `AgentTurnRunner` | Extend | Keep orchestration timing in runtime loop; do not append synthetic aggregate result messages. |
| `llm/prompt-renderers` | provider payloads | DS-002 | renderers | Reuse | No compaction-specific provider formatting. |
| `memory/store` | raw archive/prune and compacted memory persistence | DS-005 | `WorkingContextCompactor` | Reuse | Store remains persistence boundary. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `working-context-message-unit.ts` | memory/compaction | unit model | typed units derived from `Message[]` | shared by planner, prompt builder, compactor | `Message`, `ToolCallPayload`, `ToolResultPayload` |
| `working-context-message-unit-builder.ts` | memory/compaction | unit builder | group `Message[]` into normal/tool protocol units | one conversion concern | unit model |
| `working-context-message-window-planner.ts` | memory/compaction | planner | compacted prefix / retained suffix / protected suffix | central policy owner | unit model, budget strategy |
| `message-budget-strategy.ts` | memory/compaction | off-spine estimator | approximate rendered/token size by message/unit | planner support, replaceable later | unit model |
| `working-context-compaction-prompt-builder.ts` | memory/compaction | prompt builder | natural transcript prompt for compaction agent | replaces raw block formatter | unit model |
| `working-context-compactor.ts` | memory/compaction | compactor | summarize message units and persist compacted memory | replaces raw-block `Compactor` runtime role | summarizer, store |
| `working-context-snapshot-rebuilder.ts` | memory/compaction | rebuilder | build new `Message[]` from bundle + retained suffix | one output shape owner | memory message builder |
| `compacted-memory-message-builder.ts` | memory/compaction | memory message builder | natural compacted memory message content | shared by executor/bootstrapper | memory bundle |
| `message-provenance.ts` | memory | provenance model | message-to-raw-trace correlation metadata | keeps metadata typed and non-LLM-visible | serializer |
| `working-context-recovery-projector.ts` | memory/restore | bootstrap recovery | raw-trace fallback to natural messages only | not runtime compaction path | RawTraceItem |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Message unit identity/classification | `working-context-message-unit.ts` | memory/compaction | used by planner, prompt builder, compactor | Yes | Yes | generic kitchen-sink event model |
| Message provenance | `message-provenance.ts` | memory | used by ingestion, serializer, compactor | Yes | Yes | LLM-visible metadata blob |
| Compacted memory message wording | `compacted-memory-message-builder.ts` | memory/compaction | used by runtime and bootstrap | Yes | Yes | provider renderer |
| Budget calculation result | `message-budget-strategy.ts` | memory/compaction | planner support | Yes | Yes | tokenizer abstraction that pretends exactness |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `MessageProvenance` | Yes | Yes | Medium | Keep fields to `rawTraceIds`, `sourceKind`, optional `turnId`, `toolCallIds`; do not duplicate message role/content. |
| `MessageUnit` | Yes | Yes | Medium | Specialize variants: `normal`, `tool_protocol_group`, `compacted_memory`, `system`. Avoid optional-heavy base. |
| `MessageCompactionPlan` | Yes | Yes | Low | Separate `compactableUnits`, `retainedMessages`, `protectedMessages`, `rawTraceIdsToArchive`. |
| `CompactedMemoryMessage` content | Yes | Yes | Low | Keep it natural and action-oriented; no turn/seq/source metadata. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/message-provenance.ts` | memory | provenance boundary | typed metadata attached to `Message` and ignored by renderers | provenance is cross-cutting within memory, not compaction-only | N/A |
| `autobyteus-ts/src/llm/utils/messages.ts` | llm core message model | canonical message | add optional renderer-ignored `metadata?: MessageMetadata` neutral container only | all renderers already depend on this core message shape | Must not import `src/memory/*`; no memory-specific provenance types |
| `autobyteus-ts/src/memory/working-context-snapshot-serializer.ts` | memory | snapshot persistence | serialize/deserialize neutral message metadata with schema bump; memory helper validates provenance payload | existing serializer owner | `MessageMetadata`, memory helper functions |
| `autobyteus-ts/src/memory/message-provenance.ts` | memory | provenance helper | typed helper functions/constants for memory provenance stored inside neutral `Message.metadata` | keeps memory-specific schema out of LLM core | `MessageMetadata` |
| `autobyteus-ts/src/memory/memory-manager.ts` | memory | authoritative working-context boundary | expose system/user/assistant/tool append APIs, attach provenance, persist snapshots, hide direct snapshot mutation | closes boundary bypass | `MessageMetadata`, `MessageProvenance` helpers |
| `autobyteus-ts/src/memory/compaction/working-context-message-unit.ts` | memory/compaction | unit model | semantically tight message-unit variants | shared by compaction files | `Message` |
| `autobyteus-ts/src/memory/compaction/working-context-message-unit-builder.ts` | memory/compaction | unit builder | group messages into normal units and tool protocol groups | one conversion concern | unit model |
| `autobyteus-ts/src/memory/compaction/message-budget-strategy.ts` | memory/compaction | budget strategy | compute message/unit token estimates and retention budgets | swappable Strategy owner | unit model |
| `autobyteus-ts/src/memory/compaction/working-context-message-window-planner.ts` | memory/compaction | planner | select compactable prefix, recent suffix, protected suffix | primary bounded local owner | unit model, estimator |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-prompt-builder.ts` | memory/compaction | prompt builder | render selected message units to natural transcript prompt and existing JSON contract | replaces raw trace prompt builder for runtime | unit model |
| `autobyteus-ts/src/memory/compaction/working-context-compactor.ts` | memory/compaction | compactor | call summarizer, normalize result, persist episodic/semantic, archive provenance raw ids | runtime compaction persistence owner | plan, store |
| `autobyteus-ts/src/memory/compaction/compacted-memory-message-builder.ts` | memory/compaction | memory message builder | format retrieved compacted memory into one natural LLM-facing message | reused by rebuilder/bootstrapper | MemoryBundle |
| `autobyteus-ts/src/memory/compaction/working-context-snapshot-rebuilder.ts` | memory/compaction | snapshot rebuilder | produce replacement `Message[]` from system/head + compacted memory + retained suffix | output-shape owner | memory builder |
| `autobyteus-ts/src/memory/compaction/pending-compaction-executor.ts` | memory/compaction | lifecycle executor | orchestrate working-context planner/compactor/rebuilder and status | existing lifecycle owner, refactored internals | plan/rebuilder |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | agent loop | response timing owner | run no-tool compaction immediately; defer tool-call compaction until after tool results | keeps runtime sequencing in loop | executor |
| `autobyteus-ts/src/agent/llm-request-assembler.ts` | agent request assembly | pre-request guard | execute pending compaction before rendering; call MemoryManager append APIs instead of direct snapshot mutation | existing boundary remains, but mutation authority moves to MemoryManager | executor, MemoryManager APIs |
| `autobyteus-ts/src/agent/loop/tool-result-continuation-builder.ts` | agent loop | continuation signal owner | native and non-native tool result continuations commit results through MemoryManager and return tool_history_only continuation signals | keeps continuation timing explicit | MemoryManager APIs |
| `autobyteus-ts/src/memory/restore/working-context-snapshot-bootstrapper.ts` | memory/restore | bootstrap owner | stop raw frontier bootstrap; use persisted snapshot or natural recovery projection | existing owner | recovery projector |
| `autobyteus-ts/src/memory/restore/working-context-recovery-projector.ts` | memory/restore | fallback projector | convert raw traces to safe natural messages only when no valid snapshot exists | explicit recovery-only concern | RawTraceItem |

## Ownership Boundaries

- `WorkingContextSnapshot` is authoritative for LLM-facing history.
- `RawTraceItem[]` is authoritative for durable runtime audit/provenance, not prompt history.
- `WorkingContextMessageWindowPlanner` is authoritative for deciding which working-context messages are compacted or retained.
- `WorkingContextCompactor` is authoritative for converting compactable message units into persisted compacted memory.
- `WorkingContextSnapshotRebuilder` is authoritative for the final post-compaction `Message[]` shape.
- Provider renderers remain authoritative for provider payload format.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `PendingCompactionExecutor.executeIfRequired/executeNow` | planner, compactor, rebuilder, reporter | `LlmPhase`, `LLMRequestAssembler` | callers directly planning from raw traces or resetting snapshot | add executor input/options |
| `WorkingContextMessageWindowPlanner.plan(messages, budget)` | unit builder, protected suffix classifier, estimator | `PendingCompactionExecutor` | executor slicing `Message[]` by fixed count | extend planner policy inputs |
| `WorkingContextCompactor.compact(plan)` | prompt builder, summarizer, result persistence, raw archive | `PendingCompactionExecutor` | executor calling summarizer and store directly | add compactor result contract |
| Provider renderer `.render(messages)` | native/text tool history formatting | LLM request code | compaction code creating provider-specific tool text | add renderer capabilities if needed |
| `MemoryManager` working-context append APIs | `WorkingContextSnapshot.append*`, provenance helper, snapshot persistence | `LlmPhase`, `LLMRequestAssembler`, `ToolResultContinuationBuilder`, input processors | caller uses `memoryManager.workingContextSnapshot.append*` directly | add subject-specific MemoryManager methods |
| `MemoryManager.resetWorkingContextSnapshot` | snapshot persistence | compaction executor/bootstrapper | direct `workingContextSnapshot.reset` from callers | expose narrower manager method if needed |

## Dependency Rules

Allowed:

- `llm/utils/messages.ts` may define neutral `MessageMetadata`, but must not import memory modules.
- `memory/message-provenance.ts` may import/read/write `Message.metadata` and owns memory-specific provenance validation.
- Agent loop may depend on `PendingCompactionExecutor` for lifecycle/timing.
- `PendingCompactionExecutor` may depend on memory compaction planner/compactor/rebuilder and `MemoryManager`.
- Planner/prompt/rebuilder may depend on core `Message` types.
- Provider renderers may depend on core `Message` and tool payload types.
- Memory compactor may depend on memory store and summarizer.

Forbidden:

- `llm/utils/messages.ts` must not import `src/memory/*` or memory-owned provenance types.
- Higher-level callers must not directly call `memoryManager.workingContextSnapshot.append*` or `reset`; they must use `MemoryManager` APIs.
- Compaction runtime must not depend on `FrontierFormatter` or raw trace blocks for normal LLM-facing prompt construction.
- Provider renderers must not know compaction policy.
- `LlmPhase` must not slice messages or decide compacted prefix size.
- Raw trace archive/prune logic must not decide LLM-facing retained suffix.
- Working context metadata/provenance must not be rendered by provider renderers.
- Non-native text-parser continuations must not append legacy aggregate tool-result user messages as the LLM-facing live suffix; renderers own text-history conversion from canonical messages.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `WorkingContextMessageWindowPlanner.plan(input)` | working-context message window | produce `MessageCompactionPlan` | `messages + budget + policy` | no raw trace list |
| `MessageBudgetStrategy.calculate(input)` | message budget calculation | compute unit costs, recent suffix budget, compacted memory target budget | `messageUnits + inputBudget + policy` | Strategy interface; estimated now, exact later |
| `WorkingContextCompactor.compact(plan)` | compactable message units | summarize/persist selected units | `MessageCompactionPlan` | returns outcome with counts and archive info |
| `WorkingContextSnapshotRebuilder.rebuild(input)` | post-compaction snapshot | produce new `Message[]` | `system/head messages + MemoryBundle + retained messages` | no provider payloads |
| `MemoryManager.ensureWorkingContextSystemMessage(content, options)` | working-context system/base prompt | insert system message if absent and persist snapshot | `content + optional operation/provenance metadata` | replaces assembler direct system append |
| `MemoryManager.appendWorkingContextUserMessage(message, options)` | working-context user input | append external/new user messages with provenance and persist snapshot | `Message or LLMUserMessage + turnId/source/provenance` | used by request assembler after pending compaction |
| `MemoryManager.appendWorkingContextAssistantMessage(response, turnId, options)` | assistant response | append no-tool assistant response with provenance and persist snapshot | `CompleteResponse + turnId + source` | used by LlmPhase for no-tool responses |
| `MemoryManager.ingestAssistantToolResponse(response, invocations, turnId)` | model response ingestion | atomically store raw assistant/tool traces and append assistant tool message with provenance | `CompleteResponse + ToolInvocation[] + turnId` | removes ordering mismatch |
| `MemoryManager.appendWorkingContextToolResults(events, options)` | tool result ingestion | append canonical `ToolResultPayload` messages with provenance and persist snapshot | `ToolResultEvent[] + turnId/source` | used by native and non-native continuations before compaction |
| `ToolResultContinuationBuilder.build(...)` | continuation signal | commit tool results via MemoryManager and return a same-turn tool_history_only signal for native or text-history mode | `ToolResultEvent[] + context + turn` | no synthetic LLM-facing aggregate user message |
| `PendingCompactionExecutor.executeNow(input)` | compaction lifecycle | immediate post-final-response compaction | `turnId + systemPrompt + budgetSnapshot?` | used by no-tool final response |
| `PendingCompactionExecutor.executeIfRequired(input)` | pre-request compaction guard | execute pending before provider request | `turnId + systemPrompt + budgetSnapshot?` | used by assembler |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `plan(messages, budget, policy)` | Yes | Yes | Low | Keep raw trace ids out of input except provenance on messages. |
| `compact(plan)` | Yes | Yes | Low | Do not also rebuild snapshot here. |
| `rebuild(bundle, retainedMessages, head)` | Yes | Yes | Low | Do not summarize here. |
| `ingestAssistantToolResponse(...)` | Yes | Yes | Low | Make this the LlmPhase main path for tool-call responses. |
| `ensureWorkingContextSystemMessage(...)` | Yes | Yes | Low | Make this the assembler/system prompt insertion path. |
| `appendWorkingContextUserMessage(...)` | Yes | Yes | Low | Make this the assembler user append path. |
| `appendWorkingContextAssistantMessage(...)` | Yes | Yes | Low | Make this the no-tool assistant commit path. |
| `appendWorkingContextToolResults(...)` | Yes | Yes | Low | Make this native and text-parser result commit path. |
| `ToolResultContinuationBuilder.build(...)` | Yes | Yes | Low | It should signal same-turn continuation, not build LLM-facing aggregate content. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Message planner | `WorkingContextMessageWindowPlanner` | Yes | Low | Avoid vague `CompactionHelper`. |
| Unit model | `WorkingContextMessageUnit` | Yes | Low | Keep variants explicit. |
| Rebuilder | `WorkingContextSnapshotRebuilder` | Yes | Low | Do not call it formatter; it creates messages. |
| Memory message builder | `CompactedMemoryMessageBuilder` | Yes | Low | It builds LLM-facing memory message, not provider payload. |
| Provenance | `MessageProvenance` | Yes | Medium | Keep it non-rendered. |

## Applied Patterns (If Any)

- Metadata helper pattern for provenance:
  - `MessageMetadata` is neutral and owned by LLM core.
  - `memory/message-provenance.ts` owns namespaced provenance helpers over that neutral container.
  - Renderers ignore metadata, preserving provider-boundary cleanliness.
- Strategy pattern for message budget calculation:
  - Interface: `MessageBudgetStrategy`.
  - Initial implementation: `EstimatedMessageBudgetStrategy` using conservative character/JSON payload estimates plus overhead and safety margin.
  - Future implementation: `ExactMessageBudgetStrategy` using stored per-message token accounting or provider tokenizer support.
  - `WorkingContextMessageWindowPlanner` depends only on the interface, so the planner policy stays stable while the budget calculator changes.
- Planner pattern inside `WorkingContextMessageWindowPlanner`: bounded local policy flow for message prefix/suffix selection.
- Adapter/projection pattern for `WorkingContextRecoveryProjector`: recovery-only conversion from raw traces to natural messages when persisted snapshot is unavailable.
- Builder pattern for `CompactedMemoryMessageBuilder` and `WorkingContextSnapshotRebuilder`: owns message output shape separately from selection and summarization.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/compaction/` | Folder | memory compaction subsystem | working-context compaction planning/execution | Existing compaction subsystem; scope is readable without new top-level folder | provider renderers |
| `autobyteus-ts/src/memory/compaction/working-context-message-unit.ts` | File | unit model | typed message units | central compaction model | raw trace formatter |
| `autobyteus-ts/src/memory/compaction/working-context-message-unit-builder.ts` | File | unit builder | group messages/tool protocol | compaction-specific projection | summarizer calls |
| `autobyteus-ts/src/memory/compaction/working-context-message-window-planner.ts` | File | planner | compacted prefix/retained suffix/protected suffix | core policy owner | prompt text, store writes |
| `autobyteus-ts/src/memory/compaction/message-budget-strategy.ts` | File | budget strategy | estimate/compute per-message unit costs and recent suffix budgets | off-spine Strategy support for planner | provider rendering or compaction policy decisions |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-prompt-builder.ts` | File | prompt builder | natural summarizer prompt | replaces raw prompt builder | `[BLOCK]`, turn ids, seq ids |
| `autobyteus-ts/src/memory/compaction/working-context-compactor.ts` | File | compactor | summarize/persist/archive selected message units | runtime compaction persistence | snapshot rebuilding |
| `autobyteus-ts/src/memory/compaction/compacted-memory-message-builder.ts` | File | memory message builder | natural compacted memory message | shared by executor/bootstrap | provider payload formatting |
| `autobyteus-ts/src/memory/compaction/working-context-snapshot-rebuilder.ts` | File | rebuilder | final new `Message[]` | output owner | planning logic |
| `autobyteus-ts/src/memory/message-provenance.ts` | File | memory provenance | raw trace correlation for messages | memory-wide support | LLM-facing content |
| `autobyteus-ts/src/memory/restore/working-context-recovery-projector.ts` | File | recovery projector | snapshot-missing fallback | restore concern | runtime compaction policy |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/memory/compaction` | Mixed Justified | Yes | Medium | Existing subsystem already groups compaction. New files have clear names; no extra folder needed unless file count grows further. |
| `src/memory/restore` | Off-Spine Concern | Yes | Low | Bootstrap/recovery remains separate from runtime compaction. |
| `src/agent/loop` | Main-Line Domain-Control | Yes | Low | Only timing branch changes live here. |
| `src/llm/prompt-renderers` | Provider adapter | Yes | Low | Reused, not modified for compaction policy. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Post-compaction context | `system`, `user: "You are continuing... Current objective..."`, recent messages, `assistant.tool_calls`, `tool` results | one `user` message containing `[RAW_FRONTIER] (turn_0005:418) TOOL_RESULT` | Shows `Message[]` remains provider-renderable and natural. |
| Tool continuation protection | Latest assistant tool-call message + matching tool result messages are retained unchanged | summarizing latest result as `The tool returned...` before LLM has consumed it | Native provider APIs require structured relationship. |
| Older consumed tool cycles | Summarized as progress/findings after a later assistant response consumed them | sending every old `assistant.tool_calls`/`tool` pair forever | Prevents huge active turn from exhausting context. |
| Planner source | `WorkingContextSnapshot.buildMessages()` | `memoryManager.listRawTracesOrdered()` | Token pressure comes from rendered messages. |
| Raw trace use | provenance archive after compaction succeeds | raw trace formatter as LLM prompt | Keeps storage and prompt boundaries separate. |


Additional required examples:

```ts
// Good: neutral LLM-core metadata only.
type MessageMetadata = Record<string, unknown>;
class Message { metadata: MessageMetadata | null; }

// Memory-owned helper, outside llm/utils/messages.ts.
setMessageProvenance(message, { rawTraceIds: ['rt_1'], toolCallIds: ['call_1'] });

// Forbidden: llm/utils/messages.ts importing memory/message-provenance.
```

```text
// Non-native text-parser continuation target:
assistant ToolCallPayload message
tool ToolResultPayload messages
(no synthetic aggregate user message appended)
-> pending compaction protects this suffix
-> text-history renderer emits [TOOL_CALL]/[TOOL_RESULT] parser-mode text
```

```ts
// Working-context mutation target:
await pendingCompactionExecutor.executeIfRequired(...);
memoryManager.appendWorkingContextUserMessage(userMessage, { turnId, source: 'LLMRequestAssembler' });
// Forbidden: memoryManager.workingContextSnapshot.appendMessage(userMessage)
```

Example target `Message[]`:

```ts
[
  systemMessage,
  new Message(MessageRole.USER, {
    content: [
      'You are continuing an ongoing task after compacting earlier working memory.',
      'Current objective: fix working-context compaction.',
      'Progress so far: identified that raw traces are not the LLM-facing history.',
      'Decisions: compaction must transform Message[] -> Message[].',
      'Open work: implement message-window planner and protected tool suffix.',
      'Next step: continue from the latest tool result.'
    ].join('\n')
  }),
  ...recentNaturalMessages,
  assistantToolCallMessage,
  toolResultMessage
]
```

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep raw-trace compaction path and add message path beside it | Lower risk migration | Rejected | Replace runtime path with working-context path; raw path only allowed for recovery projection if no snapshot exists. |
| Keep `[RAW_FRONTIER]` but hide some ids | Smaller patch | Rejected | Retain suffix as canonical messages. |
| Convert live tool suffix to synthetic user text for all providers | Would avoid structured grouping complexity | Rejected | Provider renderers must receive structured tool payloads in native mode. |
| Summarize latest unconsumed tool result before continuation | Could save tokens | Rejected for normal compaction | Protect live suffix; handle oversized tool output via separate tool-output policy. |
| Use fixed “keep last N turns” policy | Simple | Rejected | Turns are metadata; one turn can be huge and many turns can be small. |
| Keep `LLMRequestAssembler` direct snapshot append while adding provenance elsewhere | Smaller patch | Rejected | Route all working-context mutations through MemoryManager APIs and make snapshot internals private/internal. |
| Keep non-native synthetic aggregate tool-result user message as appended live suffix | Preserves current text parser flow | Rejected | Commit canonical tool results, use tool_history_only continuation, and let text-history renderers produce parser-mode text. |

## Derived Layering (If Useful)

Layer explanation, derived from ownership:

1. Agent loop timing layer: `LlmPhase`, `AgentTurnRunner`, `LLMRequestAssembler`.
2. Memory working-context layer: `MemoryManager`, `WorkingContextSnapshot`, serializer/provenance.
3. Memory compaction policy layer: message unit builder, window planner, compactor, rebuilder.
4. Provider rendering layer: prompt renderers.
5. Persistence layer: memory store and raw archive manager.

Higher layers must not bypass lower authoritative boundaries: agent loop calls executor, not planner/store directly; compaction emits messages, not provider payloads.

## Migration / Refactor Sequence

1. **Introduce neutral metadata safely.**
   - Add `MessageMetadata` as a renderer-ignored neutral container in `llm/utils/messages.ts`.
   - Do not import memory modules from `llm/utils/messages.ts`.
   - Add `memory/message-provenance.ts` helper functions/schema over the neutral metadata.
   - Bump serializer schema and persist metadata; ensure renderers ignore it.
2. **Close the MemoryManager working-context boundary.**
   - Add `ensureWorkingContextSystemMessage(...)`, `appendWorkingContextUserMessage(...)`, `appendWorkingContextAssistantMessage(...)`, `ingestAssistantToolResponse(...)`, and `appendWorkingContextToolResults(...)`.
   - Replace `LLMRequestAssembler` direct `workingContextSnapshot.appendMessage(...)` calls with MemoryManager APIs.
   - Make `workingContextSnapshot` private/internal or enforce no direct higher-level mutation.
3. **Unify native and non-native tool result continuation.**
   - Make `ToolResultContinuationBuilder` commit results through MemoryManager for both native and text-parser modes.
   - Return a same-turn tool_history_only continuation signal; do not append synthetic aggregate user result text as live context.
   - Let native renderers or text-history renderers convert canonical tool messages into provider/parser payloads.
4. **Add message unit builder and planner.**
   - Build units from `Message[]`.
   - Detect protected live tool suffix.
   - Select compactable prefix and budget-bounded recent suffix.
5. **Add natural compaction prompt builder.**
   - Replace raw `[SETTLED_BLOCKS]` block rendering with transcript/message-unit rendering.
   - Keep existing JSON output contract initially.
6. **Add working-context compactor and snapshot rebuilder.**
   - Persist episodic/semantic items from summarizer result.
   - Rebuild `Message[]` from system/head + compacted memory + retained suffix.
   - Archive/prune raw traces only through message provenance; missing provenance should be logged and not affect LLM-facing correctness.
7. **Refactor `PendingCompactionExecutor`.**
   - Plan from `memoryManager.getWorkingContextMessages()`.
   - Remove runtime raw trace planner/frontier formatter dependency.
   - Emit status using message/unit counts.
8. **Refactor timing.**
   - In `LlmPhase`, no-tool threshold crossing executes compaction immediately after response commit.
   - Tool-call threshold crossing requests compaction but waits until tool results are ingested; assembler executes before continuation render.
9. **Refactor bootstrap fallback.**
   - Prefer persisted valid snapshot.
   - If missing, use compacted memory + safe natural recovery projection, not raw frontier.
10. **Remove/decommission obsolete tests and files.**
   - Replace tests that assert `[RAW_FRONTIER]`.
   - Delete/move `FrontierFormatter` and raw `CompactionTaskPromptBuilder` runtime usage.
11. **Validation pass.**
   - Run unit/integration tests for planner, compactor, no-tool immediate compaction, native and non-native tool continuation preservation, renderer payload shape, MemoryManager mutation authority, metadata dependency direction, and bootstrap.

## Key Tradeoffs

- **Working-context-first vs raw-trace-first:** Working-context-first matches what caused token pressure and what the LLM actually saw. Raw trace-first is easier for pruning but breaks prompt semantics.
- **Provenance metadata vs raw trace lookup heuristics:** Metadata is a cleaner refactor than trying to infer trace ids by turn/content/tool ids after the fact.
- **Immediate no-tool compaction vs deferred compaction:** Immediate compaction removes queued-idle confusion but adds post-response work before fully idle status.
- **Budget strategy: estimated now vs exact later:** A Strategy interface allows an estimated implementation now and an exact per-message token accounting implementation later without changing planner ownership.

## Risks

- Provenance must use neutral `MessageMetadata` in LLM core plus memory-owned helpers. Any implementation that imports `src/memory/*` into `llm/utils/messages.ts` violates this design.
- Existing persisted snapshots without provenance require schema handling. Clean-cut schema bump should rebuild from compacted memory/recovery projection rather than preserve old raw frontier behavior.
- If a live tool result is larger than available budget, normal compaction cannot solve it without violating native protocol. Escalate to explicit tool-output summarization/artifact policy.
- The estimated budget strategy may be imperfect; keep safety margins and tests with conservative thresholds until an exact strategy exists.

## Guidance For Implementation

- Start with unit tests for `WorkingContextMessageWindowPlanner`; do not refactor executor first.
- Model protected suffix explicitly. Do not infer by turn id.
- Use `ToolCallPayload` and `ToolResultPayload` objects as the protocol truth.
- Keep provider renderers unchanged except for ignoring neutral metadata.
- Do not call `workingContextSnapshot.append*` from `LLMRequestAssembler`, `LlmPhase`, or continuation builders; route through MemoryManager APIs.
- For non-native text-parser continuations, commit canonical tool messages and use text-history renderer output; do not append duplicate synthetic aggregate user messages.
- Make compaction memory message natural, e.g. “You are continuing an ongoing task...” rather than bracketed internal labels.
- Do not expose `turn_id`, `seq`, `source_event`, block id, or raw trace id to the main LLM or compaction LLM in normal mode.
- Ensure tests verify rendered provider payloads, not just internal `Message[]` shape, for OpenAI-compatible/DeepSeek native tool continuation.


## UI Compaction Feed Design Addendum (2026-06-02)

### Current-State Read

The frontend center monitor currently renders at two granularities at once: whole conversation `AIMessage` rows and compaction Activity rows. `AgentConversationFeed.vue` sorts these rows by timestamp, but `segmentHandler.findOrCreateAIMessage()` appends all later streaming segments to the last incomplete visual `AIMessage`. In a long tool-heavy turn, that creates one coarse visual assistant block whose timestamp is the beginning of the block, while compaction statuses are fine-grained lifecycle rows. Sorting cannot place a compaction card inside that visual block.

The right-side Activity panel is a different surface. Its compaction row is lifecycle-oriented and should continue to show operation status updates. The center feed should be timeline/narrative oriented and should not display internal queued state.

### Target UI Behavior

Activity feed:

```text
Compaction queued -> Compacting memory... -> Memory compacted / failed
```

- One row per operation, keyed by `compaction_operation_id` when present.
- Keep the original lifecycle timestamp for Activity ordering; update `updatedAt`, phase, message, and details on later statuses.

Center live feed:

```text
assistant/tool-call segment(s)
tool-result segment(s)
Compacting memory... / Memory compacted
post-compaction assistant continuation
```

- Do not render `requested`/queued in the center feed.
- Render only execution-phase compaction statuses: `started`, terminal `completed` if no `started` arrived, and `failed` if execution failed or blocks continuation.
- On the first execution-phase center boundary, close the current frontend visual `AIMessage` (`isComplete = true`) so subsequent streamed segments create a new visual block. This is display-only and must not mutate backend working context, LLM messages, turns, raw traces, or tool protocol.
- Use a center timeline/execution timestamp separate from the Activity row's original request timestamp.

Historical/reopen feed:

- Do not add native compaction cards to center historical replay in this change.
- History correctness is complete ordered rendering of user/assistant/reasoning/tool-call/tool-result raw traces from the active raw trace file plus compaction archives.
- If future product value requires historical native compaction Activity rows, synthesize them from `raw_traces_archive_manifest.json` rather than adding LLM-facing or raw-trace pseudo-messages.

### Target Frontend Ownership

Add or adjust a small frontend presentation boundary rather than pushing UI semantics into backend memory:

- `agentActivityStore`: keep lifecycle compaction activity upsert behavior for Activity panel. If needed, add execution/timeline metadata fields to `CompactionActivity` without changing its operation identity.
- `compactionActivityProjection.ts`: preserve request timestamp for Activity lifecycle row, but expose or derive execution-phase timestamp for center-feed rows.
- `AgentEventMonitor.vue` / `AgentConversationFeed.vue`: pass/render only center-eligible compaction statuses (`started`, terminal `completed`, execution `failed`) for center feed; hide `requested`.
- `agentStatusHandler.handleCompactionStatus(...)`: on first center-eligible execution phase for an operation, mark the current frontend visual AI message complete before later post-compaction segments arrive. Do not split on `requested`.
- `CompactionStatusRow.vue`: reuse visual row for execution status; wording should be `Compacting memory...`, `Memory compacted`, or failure text.

### Backend Ordering Contract

The existing backend timing already supports this target:

- No-tool threshold crossing can execute compaction immediately after the assistant message is committed.
- Tool-call threshold crossing emits/request compaction after the assistant tool-call message is committed, executes tools, ingests tool results, then runs pending compaction before continuation rendering.

Frontend center-feed correctness depends on execution-phase compaction status being emitted after pending tool-result display events have been emitted/recorded and before post-compaction assistant continuation events begin.

### Explicit Non-Goals

- Do not add historical native compaction cards to the center feed for this change.
- Do not persist product-internal compaction cards as LLM-facing messages.
- Do not alter working-context compaction, raw-trace archiving, or provider rendering to solve this UI issue.
- Do not split frontend visual messages on queued/requested compaction.

### Validation Additions

Add frontend tests covering:

1. `requested` compaction is hidden from center feed but present/updated in Activity feed.
2. `requested -> started -> completed` remains one Activity row for one operation.
3. first execution-phase compaction closes the current visual AI block and subsequent segments create a new block.
4. tool results render before the center compaction execution row and assistant continuation renders after it.
5. historical/reopen projection can render archived raw traces without requiring native compaction center cards.
