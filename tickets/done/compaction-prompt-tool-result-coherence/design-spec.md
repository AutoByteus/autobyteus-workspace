# Design Spec

## Current-State Read

Runtime compaction is already working-context based for prompt input and rebuilt-context output. The active path is:

`PendingCompactionExecutor.executeIfRequired(...) -> WorkingContextMessageWindowPlanner.plan(...) -> WorkingContextCompactor.compactWorkingContext(...) -> AgentCompactionSummarizer.summarizeMessageUnits(...) -> WorkingContextCompactionPromptBuilder.buildTaskPrompt(...) -> visible compactor-agent run -> CompactionResponseParser.parse(...) -> MemoryStore.add(...) -> Retriever.retrieve(...) -> WorkingContextSnapshotRebuilder.rebuild(...) -> CompactedMemoryMessageBuilder.build(...) -> MemoryManager.resetWorkingContextSnapshot(...)`.

Current ownership boundaries are mostly healthy:

- `MemoryManager` owns canonical working-context ingestion and persistence.
- `WorkingContextSnapshotSerializer` persists `ToolResultPayload.toolCallId` as `tool_call_id`.
- `WorkingContextMessageUnitBuilder` owns conversion from canonical `Message[]` into compaction units and already groups tool-call messages with immediately following matching tool-result messages as `tool_protocol_group`.
- `WorkingContextCompactionPromptBuilder` owns the LLM-facing compaction task envelope and transcript rendering for active working-context compaction.
- `CompactionTaskPromptBuilder` remains a legacy raw-trace block prompt builder.
- `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent.md` owns the default visible compactor agent instructions, category meanings, JSON-only discipline, and manual-test guidance.
- `Retriever`, `WorkingContextSnapshotRebuilder`, and `CompactedMemoryMessageBuilder` own the post-compaction rebuild/resume-context path that sends the compacted-memory summary back to the working agent as LLM-facing context.

The issue is local to prompt/template copy and prompt rendering:

- The active prompt says “Compact the settled working-context transcript below into durable AutoByteus memory.” This exposes product/internal wording and the term `settled`, which is an internal eligibility concept. The user clarified that `settled` does not help the LLM and should not be in the model-facing copy.
- The active prompt renders tool calls with call IDs but tool results without the originating call ID, even though the source `ToolResultPayload` has it.
- The legacy raw-block prompt has similar product-branded copy and omits available tool-result call IDs.

The target design must preserve the compactor JSON output contract and canonical storage shape while improving every in-scope LLM-facing prompt/context view. Internal code/status terms can remain internal, but generated model-facing text should be written from the receiving LLM's perspective.

## Intended Change

1. Replace product/internal prompt copy with natural context-refresh wording.
2. Do not use `settled` in LLM-facing compaction instructions or section labels. Keep `settled` only as an internal planning/eligibility concept if the code uses it.
3. Render tool-call/tool-result content in the active compaction prompt as grouped tool interactions when a `tool_protocol_group` contains an assistant tool call followed by matching result messages.
4. Keep storage unchanged: tool calls and tool results remain separate canonical messages/traces.
5. Render unmatched/orphan tool results explicitly with their `toolCallId` when available.
6. Align the default compactor agent template and legacy raw-block prompt copy with the same natural wording and tool-result identity rule.
7. Naturalize the compacted-memory message constructed for future continuation by `CompactedMemoryMessageBuilder`; avoid phrases such as “after compacting earlier working memory.”
8. Add tests for prompt copy, grouped tool interactions, multi-call pairing, unmatched results, template copy, and compacted-memory message copy.

Recommended active prompt opening:

```text
Summarize the earlier conversation history below so future work can continue with refreshed context.
Preserve user goals, decisions, progress, findings, artifacts, tool outcomes, open questions, and next steps.
Focus on useful conversation facts; omit bookkeeping identifiers and low-level event details.
```

Recommended section label:

```text
[CONVERSATION_HISTORY_TO_SUMMARIZE]
```

Recommended compacted-memory resume message opening:

```text
You are continuing an ongoing task. Here is a concise summary of earlier work to help you resume.
Use it as context for previous reasoning, actions, findings, decisions, constraints, and open work.
```

Recommended grouped transcript shape:

```text
Assistant work notes: Need exact inventory before deciding.
Assistant: I will query the inventory service before deciding.
Tool interaction call_123:
- Request: inventory_lookup with arguments {"sku":"A-1"}.
- Result for call call_123 from inventory_lookup: {"count":7}
```

Unmatched result shape:

```text
Unmatched tool result for call call_999 from inventory_lookup: {"count":7}
```

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Cleanup
- Current design issue found (`Yes`/`No`/`Unclear`): Yes, localized
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant / Local Implementation Defect
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No broad refactor; local rendering cleanup only
- Evidence: `ToolResultPayload.toolCallId` is preserved by ingestion and snapshot serialization. `WorkingContextMessageUnitBuilder` already groups tool protocol messages. The prompt builder simply omits the ID from result lines and uses unnatural copy. `CompactedMemoryMessageBuilder` also emits LLM-facing process wording (“after compacting earlier working memory”) that should be naturalized.
- Design response: Strengthen the existing prompt-builder owner; do not alter canonical storage or runtime provider protocol.
- Refactor rationale: The right owner and grouping model already exist. Creating a new storage shape or parallel transcript renderer would duplicate authority.
- Intentional deferrals and residual risk, if any: Existing user-edited compactor agent definitions may retain old wording because the bootstrapper preserves edits. This is acceptable for this scope; delivery docs/final handoff should note that template changes affect newly seeded/missing template files unless a separate migration is requested.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.
- Internal jargon for this task: implementation terms such as `settled`, `working context`, `raw trace`, `source event`, `turn id`, `block`, `tool protocol`, and product-specific branding such as `AutoByteus`. These may remain in code/log/status/docs where accurate, but must not appear in generated LLM-facing prompt/context text unless part of the required JSON field contract or genuinely useful natural language.
- `Tool interaction`: a derived rendering view that pairs a tool request with matching result messages by `toolCallId`; it is not a storage model.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: no storage legacy path is removed in this scope because storage is not the defect. Remove/replace obsolete LLM-facing wording in both active and legacy prompt builders.
- Treat removal as first-class design work: remove “AutoByteus memory”, “AutoByteus conversation”, “AutoByteus Memory Compactor”, and LLM-facing `settled working-context transcript` wording from in-scope prompt/template copy.
- Decision rule: the design must not introduce a dual renderer that preserves old wording or old result-without-ID rendering for active working-context compaction.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Compaction requested after budget pressure | Rebuilt working-context message containing natural resume context | `PendingCompactionExecutor` / `WorkingContextCompactor` / `WorkingContextSnapshotRebuilder` | Shows the full active compaction path: prompt rendering, compactor execution, memory persistence, retrieval, and rebuilt context returned to the working agent. |
| DS-002 | Bounded Local | `WorkingContextMessageUnit[]` | Prompt transcript lines | `WorkingContextCompactionPromptBuilder` | This is the exact place where copy and tool grouping are wrong. |
| DS-003 | Bounded Local | Tool protocol unit messages | Grouped tool interaction lines | `WorkingContextCompactionPromptBuilder` using `WorkingContextMessageUnitBuilder` output | Ensures result pairing is explicit without changing storage. |
| DS-004 | Return-Event | Compactor agent JSON text | Parsed `CompactionResult` and persisted episodic/semantic items | `CompactionResponseParser` / `WorkingContextCompactor` | Protects the existing output contract before resume-context rebuild. |
| DS-005 | Bounded Local | Default built-in compactor template | Seeded visible compactor agent instructions | Built-in agent template/bootstrap subsystem | Removes product/internal system-prompt wording while preserving behavior. |
| DS-006 | Return-Event | Persisted compacted memory | Rebuilt working-context message for the future LLM call | `WorkingContextSnapshotRebuilder` / `CompactedMemoryMessageBuilder` | Makes post-compaction context reconstruction first-class and ensures the constructed memory itself is LLM-natural. |

## Primary Execution Spine(s)

`Compaction request -> WorkingContextMessageWindowPlanner -> WorkingContextCompactor -> AgentCompactionSummarizer -> WorkingContextCompactionPromptBuilder -> Compactor agent -> CompactionResponseParser -> MemoryStore -> Retriever -> WorkingContextSnapshotRebuilder -> CompactedMemoryMessageBuilder -> rebuilt working-context message`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A pending compaction request selects compactable earlier history, renders it into a natural grouped prompt, sends it to the configured compactor agent, parses JSON, persists episodic/semantic memory, retrieves the updated memory bundle, and rebuilds the working context with a natural resume-context message for the next LLM call. | compaction request, planner, compactor, prompt builder, compactor agent, parser, memory store, retriever, snapshot rebuilder, compacted-memory message builder, rebuilt working-context message | `PendingCompactionExecutor` for lifecycle and rebuild sequencing; `WorkingContextCompactor` for compaction persistence; `WorkingContextSnapshotRebuilder` for rebuilt context shape | prompt copy, unit selection, output contract parsing, resume-context wording |
| DS-002 | The prompt builder turns compactable working-context units into model-facing transcript lines. | message units, prompt builder, transcript lines | `WorkingContextCompactionPromptBuilder` | max line clamp, role labels, section labels |
| DS-003 | For tool protocol units, the prompt builder derives grouped interaction sections from existing tool call IDs and matching result payloads. | tool protocol unit, tool call payload, result payloads, grouped lines | `WorkingContextCompactionPromptBuilder` | orphan result handling, multi-call ordering |
| DS-004 | The compactor result comes back as JSON and remains parsed by the existing parser before persistence and rebuild. | compactor output, parser, normalized memory entries | `CompactionResponseParser` / `WorkingContextCompactor` | output contract text remains unchanged |
| DS-005 | Server seeding supplies a default visible compactor agent with natural instructions. | built-in template, bootstrapper, agent definition | built-in agent subsystem | preservation of user edits, tests |
| DS-006 | After compaction persists episodic/semantic memory, `PendingCompactionExecutor` retrieves the memory bundle and asks `WorkingContextSnapshotRebuilder` to rebuild the working context. The rebuilder delegates the resume-context text to `CompactedMemoryMessageBuilder`, then the memory manager resets the snapshot. That message should read like a helpful summary for resuming work, not a statement about an internal compaction process. | memory store, retriever, memory bundle, snapshot rebuilder, compacted-memory message builder, rebuilt working-context message | `WorkingContextSnapshotRebuilder` for shape; `CompactedMemoryMessageBuilder` for message copy | category labels, empty bundle behavior, reset sequencing |

## Spine Actors / Main-Line Nodes

- `PendingCompactionExecutor`
- `WorkingContextMessageWindowPlanner`
- `WorkingContextCompactor`
- `AgentCompactionSummarizer`
- `WorkingContextCompactionPromptBuilder`
- visible compactor agent runtime
- `CompactionResponseParser`
- `MemoryStore`
- `Retriever`
- `WorkingContextSnapshotRebuilder`
- `CompactedMemoryMessageBuilder`
- rebuilt working-context message

## Ownership Map

- `PendingCompactionExecutor`: compaction lifecycle, status, execution timing, snapshot rebuild after completion.
- `WorkingContextMessageWindowPlanner`: compactable/retained/protected unit selection.
- `WorkingContextMessageUnitBuilder`: message-to-unit grouping, including tool protocol grouping.
- `WorkingContextCompactor`: summarize selected units and persist compacted memory.
- `AgentCompactionSummarizer`: boundary to configured compactor agent runner and parser.
- `WorkingContextCompactionPromptBuilder`: active LLM-facing compaction task copy and transcript rendering.
- `CompactionTaskPromptBuilder`: legacy raw-block compaction prompt copy/rendering.
- Default compactor `agent.md`: stable compactor-agent behavior instructions.
- `CompactionResponseParser`: output contract parsing/validation.
- `CompactedMemoryMessageBuilder`: LLM-facing resume-context message built from compacted memory.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentCompactionSummarizer.summarizeMessageUnits(...)` | `WorkingContextCompactionPromptBuilder` for prompt text; `CompactionResponseParser` for output parsing | Bridges memory compaction to visible agent runtime | Prompt-copy policy beyond delegating to builder |
| `Compactor` subclass | `WorkingContextCompactor` | Preserves current class name/use in `AgentFactory` while active method is working-context compaction | New storage shape or alternate prompt policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| “AutoByteus memory” in active compaction task prompt | Product-branded wording does not help the LLM and confused the user | Natural continuation/context-refresh wording in `WorkingContextCompactionPromptBuilder` | In This Change | Keep JSON categories unchanged. |
| “settled working-context transcript” in active compaction task prompt | `settled` and `working-context` are internal concepts | “earlier conversation history” / `[CONVERSATION_HISTORY_TO_SUMMARIZE]` | In This Change | `settled` can remain internal code/docs terminology only. |
| Tool result lines without call ID | They hide existing identity and make pairing ambiguous | Grouped tool interaction renderer including `toolCallId` | In This Change | Applies to active working-context prompt. |
| Product-branded opening in default compactor template | Unnecessary in system prompt; user sees it as strange | Product-neutral memory compaction specialist wording | In This Change | Preserve output discipline and categories. |
| Product-branded/missing-ID legacy raw-block prompt copy | Keeps same confusing language in compatibility path | Aligned natural raw-block prompt and ID-bearing result lines | In This Change | No new dual behavior. |
| “after compacting earlier working memory” in rebuilt memory message | Exposes internal process language to the future working LLM | Natural resume-context wording in `CompactedMemoryMessageBuilder` | In This Change | Keep semantic categories; change opening only. |

## Return Or Event Spine(s) (If Applicable)

DS-004 parser/persistence return:

`Compactor agent JSON output -> CompactionResponseParser.parse -> CompactionResultNormalizer -> EpisodicItem/SemanticItem -> MemoryStore.add(...)`

DS-006 post-compaction rebuild/resume-context return:

`MemoryStore.add(...) -> Retriever.retrieve(...) -> MemoryBundle -> WorkingContextSnapshotRebuilder.rebuild(...) -> CompactedMemoryMessageBuilder.build(...) -> natural resume-context message -> MemoryManager.resetWorkingContextSnapshot(...) -> next LLM call sees resumable context`

The parser/persistence part of the return path is intentionally unchanged. Prompt wording and transcript rendering must not alter parser shape. The post-persistence rebuild part is first-class in this design because it constructs the resume-context message consumed by the future LLM call.

## Bounded Local / Internal Spines (If Applicable)

Parent owner: `WorkingContextCompactionPromptBuilder`

`WorkingContextMessageUnit -> render natural message lines OR render tool_protocol_group -> clamp lines -> prompt body`

Parent owner: `WorkingContextCompactionPromptBuilder` tool interaction rendering

`ToolCallPayload.toolCalls -> map following ToolResultPayloads by toolCallId -> emit Tool interaction <id> request/result lines -> emit unmatched result lines if present`

Parent owner: `CompactedMemoryMessageBuilder` local text rendering inside DS-006

`MemoryBundle -> natural resume-context opening -> earlier progress + categorized facts -> resume-context message body`

The DS-006 return-event spine above owns the full rebuild path. This local detail matters because the text builder should present compacted memory as usable context while canonical storage stays event/message based.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Output JSON contract text | DS-001, DS-004 | `AgentCompactionSummarizer` / `CompactionResponseParser` | Keep parser-compatible schema in every task prompt | Prevents stale edited compactor instructions from breaking parser shape | Parser details leak into unit grouping or storage |
| Line clamping | DS-002, DS-003 | prompt builders | Keep long values bounded by `maxItemChars` | Prevent oversized prompt lines | Planner starts owning string formatting |
| Built-in template tests | DS-005 | built-in agent subsystem | Keep default compactor behavior stable | Protects seed template behavior | Runtime compaction code starts owning server template behavior |
| Legacy raw-block alignment | DS-001 | `CompactionTaskPromptBuilder` | Avoid contradictory old prompt copy | Existing path still exists and should not preserve bad wording | New active prompt cleanup looks inconsistent |
| Resume-memory wording | DS-006 | `CompactedMemoryMessageBuilder` | Turn compacted memory into natural context for future LLM calls | The memory itself is LLM-facing after compaction | Future LLM sees internal process jargon |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Working-context prompt rendering | `autobyteus-ts/src/memory/compaction/working-context-compaction-prompt-builder.ts` | Extend | Existing owner of active prompt copy/rendering | N/A |
| Tool protocol grouping | `WorkingContextMessageUnitBuilder` and unit model | Reuse | Already groups call/result messages by ID | N/A |
| Tool-result identity storage | `ToolResultPayload`, `WorkingContextSnapshotSerializer`, `MemoryManager` | Reuse | Identity already preserved | N/A |
| Default compactor system prompt | built-in agent template subsystem | Extend | Existing owner for seeded visible agent instructions | N/A |
| Rebuilt compacted-memory message | `CompactedMemoryMessageBuilder` | Extend | Existing owner for memory-to-context-message rendering | N/A |
| JSON parser contract | `CompactionTaskPromptBuilder` constant + `CompactionResponseParser` | Reuse | Contract is correct and parser-compatible | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Memory compaction | compaction execution, prompt rendering, unit grouping | DS-001, DS-002, DS-003, DS-004 | `WorkingContextCompactor`, `WorkingContextCompactionPromptBuilder` | Extend | No storage refactor. |
| Built-in agent templates | default visible compactor agent instructions | DS-005 | built-in agent bootstrapper | Extend | Preserve user edit behavior. |
| Compacted-memory context construction | natural resume-context message from memory bundle | DS-006 | `CompactedMemoryMessageBuilder` | Extend | Avoid LLM-facing internal process wording. |
| Memory model/storage | `Message[]`, `ToolCallPayload`, `ToolResultPayload`, raw traces, snapshot serializer | DS-001, DS-003 | `MemoryManager` | Reuse unchanged | Storage stays separate. |
| Test suites | prompt/template invariants | all | implementation validators | Extend | Unit-level coverage is enough for this design stage; API/E2E can decide broader validation later. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `working-context-compaction-prompt-builder.ts` | Memory compaction | active prompt builder | Natural task prompt, section labels, natural message rendering, grouped tool interaction rendering | Existing exact owner | Reuses `WorkingContextMessageUnit`, `ToolCallPayload`, `ToolResultPayload` |
| `compaction-task-prompt-builder.ts` | Memory compaction | legacy raw-block prompt builder | Aligned natural raw-block prompt and call-ID-bearing raw tool result lines | Existing legacy owner | Reuses `RawTraceItem` |
| `memory-compactor/agent.md` | Built-in agent templates | default compactor template | Natural system prompt while preserving JSON-only/category behavior | Existing template owner | N/A |
| `compacted-memory-message-builder.ts` | Memory compaction | resume-context message builder | Natural compacted-memory message for future LLM calls | Existing owner | `MemoryBundle`, semantic category labels |
| `working-context-compaction-prompt-builder.test.ts` | Tests | unit prompt coverage | Natural copy, grouped interactions, unmatched result coverage | Existing test file for builder | Reuses message/unit fixtures |
| `built-in-agent-templates.test.ts` | Tests | template coverage | Assert product-neutral wording and existing categories | Existing template test | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Tool interaction rendering helpers | none for this scope; private helpers in `WorkingContextCompactionPromptBuilder` | Memory compaction | Only active prompt needs grouped working-context unit rendering | Yes | Yes | Generic provider renderer or storage model |
| Natural prompt opening/labels | constants local to prompt builders if reused | Memory compaction | Active and legacy prompt copy should align | Yes | Yes | Separate compatibility prompt policy |
| Natural resume-context opening | local to `CompactedMemoryMessageBuilder` | Memory compaction | Only resume message builder needs it | Yes | Yes | Prompt-builder global that couples unrelated outputs |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ToolResultPayload.toolCallId` | Yes | Yes | Low | Render it; do not duplicate it in `ToolCallPayload`. |
| `ToolProtocolMessageUnit.toolCallIds/matchedToolCallIds` | Yes | Yes | Low | Reuse for grouping context; no new unit type needed. |
| Compactor output contract | Yes | Yes | Low | Keep unchanged. |
| Compacted-memory resume message | Yes after wording change | Yes | Low | Replace internal process wording with natural context-resume wording. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-prompt-builder.ts` | Memory compaction | active prompt builder | Build natural working-context compactor prompt and grouped tool interaction transcript | Existing owner; no new file needed | `WorkingContextMessageUnit`, `ToolCallPayload`, `ToolResultPayload` |
| `autobyteus-ts/src/memory/compaction/compaction-task-prompt-builder.ts` | Memory compaction | legacy prompt builder | Keep legacy raw-block prompt copy/tool result IDs coherent | Existing owner | `RawTraceItem` |
| `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent.md` | Built-in agent templates | default compactor instructions | Natural product-neutral compactor role/instructions | Existing owner | N/A |
| `autobyteus-ts/src/memory/compaction/compacted-memory-message-builder.ts` | Memory compaction | resume-context message builder | Build natural context message from retrieved compacted memory | Existing owner | `MemoryBundle` |
| `autobyteus-ts/tests/unit/memory/working-context-compaction-prompt-builder.test.ts` | Tests | prompt builder unit tests | Validate natural copy and tool interaction pairing | Existing test file | message fixtures |
| `autobyteus-server-ts/tests/unit/built-in-agents/built-in-agent-templates.test.ts` | Tests | template invariant tests | Validate natural copy plus existing behavior | Existing test file | N/A |
| Optional: `autobyteus-ts/tests/unit/memory/compaction-task-prompt-builder.test.ts` | Tests | legacy prompt builder unit tests | Validate raw-block prompt naturalness and result IDs if no existing file fits | Create only if implementation updates legacy builder and no existing test is suitable | raw trace fixtures |

## Ownership Boundaries

`WorkingContextCompactionPromptBuilder` is the authoritative boundary for active compaction prompt text. It may inspect `WorkingContextMessageUnit.kind` and `ToolPayload` shapes, but it must not change message storage or unit selection policy.

`WorkingContextMessageUnitBuilder` remains the owner of grouping eligibility. The prompt builder should consume the produced grouping; it should not rescan the full message list outside a unit or redefine compactability.

`MemoryManager` and `WorkingContextSnapshotSerializer` remain authoritative for storage. Implementation must not embed results into tool calls or mutate previous tool-call records as part of rendering.

`CompactedMemoryMessageBuilder` is authoritative for the LLM-facing memory/context message built after compaction; prompt builders and storage code should not duplicate that wording.

The built-in agent template subsystem remains authoritative for seeded compactor instructions. Memory compaction runtime must not inline the entire system prompt or bypass template seeding.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `WorkingContextCompactionPromptBuilder.buildTaskPrompt` | role rendering, section labels, tool interaction grouping, line clamping | `AgentCompactionSummarizer` | Summarizer assembles prompt strings directly | Add private/public builder helper methods |
| `WorkingContextMessageUnitBuilder.build` | tool protocol grouping and matched ID detection | `WorkingContextMessageWindowPlanner` | Prompt builder tries to select compactable ranges from raw messages | Extend unit shape if needed, but current shape is enough |
| `MemoryManager` ingestion APIs | raw trace + working-context snapshot append | agent loop/tool result processors | Prompt/template code rewriting storage to nest tool results | Keep prompt grouping derived only |
| Built-in compactor `agent.md` | default compactor instructions | server bootstrapper | Runtime compaction code owning system-prompt copy | Update template/tests |
| `CompactedMemoryMessageBuilder.build` | resume-context opening, category labels, memory bundle formatting | `WorkingContextSnapshotRebuilder` | Rebuilder or prompt builder assembling compacted-memory strings directly | Add/adjust builder methods/constants |

## Dependency Rules

Allowed:

- `WorkingContextCompactionPromptBuilder` may depend on `WorkingContextMessageUnit`, `ToolCallPayload`, `ToolResultPayload`, `formatToCleanString`, and line-clamping utilities.
- `AgentCompactionSummarizer` may depend on `WorkingContextCompactionPromptBuilder`.
- Tests may instantiate message units and payloads directly.

Forbidden:

- Do not make `MemoryManager` depend on compaction prompt rendering.
- Do not make prompt rendering mutate `Message`, `ToolCallPayload`, `ToolResultPayload`, raw traces, or snapshots.
- Do not store tool results inside tool calls for this task.
- Do not keep old and new LLM-facing wording in separate active prompt branches.
- Do not use `settled`, `working-context transcript`, `blocks`, `raw traces`, `turn ids`, `source events`, `runtime internals`, `tool protocol`, or product-branded “AutoByteus memory” in generated LLM-facing compaction/context-summary copy. Use natural omission guidance instead, such as “bookkeeping identifiers” and “low-level event details.” Required JSON field names from the output contract are the only allowed schema-specific terms.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `WorkingContextCompactionPromptBuilder.buildTaskPrompt(units, options)` | working-context compaction prompt | Render task envelope and transcript | `WorkingContextMessageUnit[]` | No raw trace identity required for active path. |
| private `renderToolProtocolGroup(unit, maxItemChars)` | derived tool interaction view | Render request/result grouped by call ID | `ToolProtocolMessageUnit` with `ToolCallPayload` / `ToolResultPayload` | Proposed private helper. |
| `CompactionTaskPromptBuilder.buildTaskPrompt(blocks, options)` | legacy raw-block prompt | Render raw block compaction prompt | `InteractionBlock[]` | Align wording/IDs; do not make active path depend on it. |
| `CompactionResponseParser.parse(text)` | compactor JSON output | Parse result | JSON object with existing keys | Unchanged. |
| `CompactedMemoryMessageBuilder.build(bundle)` | compacted-memory context message | Render resumed context for future LLM calls | `MemoryBundle` | Naturalize opening; categories can remain user-readable. |

Rule:
- Do not use one generic boundary when the subject or identity meaning differs.
- Split boundaries by subject or require an explicit compound identity shape.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `buildTaskPrompt(units)` active | Yes | Yes | Low | Keep unit-based. |
| `renderToolProtocolGroup(unit)` private | Yes | Yes | Low | Pair by `toolCallId`; orphan fallback. |
| `buildTaskPrompt(blocks)` legacy | Yes | Mostly | Low | Include `trace.toolCallId` in raw result lines when present. |
| `CompactedMemoryMessageBuilder.build` | Yes | Yes | Low | Naturalize resume-context wording. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Active section label | `[WORKING_CONTEXT_TRANSCRIPT]` -> `[CONVERSATION_HISTORY_TO_SUMMARIZE]` | Yes after change | Low | Replace in prompt builder. |
| Opening task copy | “settled working-context transcript” -> “earlier conversation history” | Yes after change | Low | Replace. |
| Group label | `Tool interaction <callId>` | Yes | Low | Use in active prompt. |
| Reasoning label | `Assistant reasoning` -> `Assistant work notes` | Yes after change | Medium | Prefer `Assistant work notes` to avoid model-internal feel while preserving content. |
| Resume-memory opening | `after compacting earlier working memory` -> `Here is a concise summary of earlier work to help you resume` | Yes after change | Low | Replace in `CompactedMemoryMessageBuilder` and prefix detection if necessary. |

## Applied Patterns (If Any)

- Derived view pattern: `Tool interaction` is a derived prompt-rendering view over separate canonical call/result messages.
- Bounded local renderer helper pattern: private helpers inside `WorkingContextCompactionPromptBuilder` keep grouping/rendering local to the prompt owner.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-prompt-builder.ts` | File | active compaction prompt builder | Natural prompt copy and grouped tool interaction rendering | Existing active prompt owner | Storage mutation, unit selection policy |
| `autobyteus-ts/src/memory/compaction/compaction-task-prompt-builder.ts` | File | legacy raw-block prompt builder | Aligned legacy prompt copy and tool-result IDs | Existing legacy owner | Active working-context grouping policy |
| `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent.md` | File | built-in compactor template | Product-neutral compactor instructions | Existing template | Runtime-specific prompt labels beyond generic automated-task guidance |
| `autobyteus-ts/src/memory/compaction/compacted-memory-message-builder.ts` | File | resume-context message builder | Natural compacted-memory context for future LLM calls | Existing builder | Prompt-building or storage policy |
| `autobyteus-ts/tests/unit/memory/working-context-compaction-prompt-builder.test.ts` | File | prompt builder tests | Validate active prompt behavior | Existing tests | Runtime/E2E setup |
| `autobyteus-server-ts/tests/unit/built-in-agents/built-in-agent-templates.test.ts` | File | template tests | Validate seeded template invariants | Existing tests | Memory runtime assertions |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/compaction` | Main-Line Domain-Control plus local prompt rendering | Yes | Low | Compaction prompt rendering belongs beside compaction execution. |
| `autobyteus-server-ts/src/built-in-agents/templates` | Off-Spine Concern | Yes | Low | Template seeding is server-owned and separate from runtime memory code. |
| `tests/unit/memory` | Test | Yes | Low | Active builder unit tests live with memory tests. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Prompt opening | `Summarize the earlier conversation history below so future work can continue with refreshed context.` | `Compact the settled working-context transcript below into durable AutoByteus memory.` | Removes product/internal words and `settled`. |
| Compacted-memory message | `You are continuing an ongoing task. Here is a concise summary of earlier work to help you resume.` | `You are continuing an ongoing task after compacting earlier working memory.` | Makes the constructed memory understandable as context, not internal process metadata. |
| Tool result rendering | `Tool interaction call_1:` then `- Result for call call_1 from search: {...}` | `Tool result from search: {...}` | Makes call/result pairing explicit. |
| Storage shape | Separate `ToolCallPayload` message and `ToolResultPayload` message | Mutating the tool call payload to contain a result | Preserves provider-compatible append-only lifecycle. |
| Unmatched result | `Unmatched tool result for call call_x from search: {...}` | Dropping the result because no local request exists | Preserves partial history facts. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep old active prompt copy in a fallback branch | Avoid changing prompt wording | Rejected | Replace active prompt copy directly. |
| Store tool results inside tool calls while also keeping result messages | User wondered about nesting | Rejected | Keep storage separate and render derived grouped view. |
| Leave legacy raw-block prompt wording unchanged | It is not the active screenshot path | Rejected for in-scope prompt cleanup | Align legacy builder copy/IDs if implementation touches prompt builders. |
| Migrate all existing user-edited compactor agent files | Would force template copy into user-edited definitions | Rejected for this scope | Update seed template and document that user-edited definitions may need manual refresh. |
| Leave compacted-memory resume message unchanged | It is not the immediate compactor prompt | Rejected | Naturalize `CompactedMemoryMessageBuilder` because its output is LLM-facing context after compaction. |

Hard block:
- Any design that depends on backward-compatibility wrappers, dual-path behavior, or retained legacy flow for in-scope replaced behavior fails review.

## Derived Layering (If Useful)

- Runtime/lifecycle layer: `PendingCompactionExecutor`, `WorkingContextCompactor`.
- Prompt-rendering layer inside memory compaction: `WorkingContextCompactionPromptBuilder`, `CompactionTaskPromptBuilder`.
- Storage layer: `MemoryManager`, `WorkingContextSnapshotSerializer`, `MemoryStore` unchanged.
- Server template layer: built-in compactor `agent.md` unchanged structurally but copy updated.

## Migration / Refactor Sequence

1. Update `WorkingContextCompactionPromptBuilder.buildTaskPrompt(...)` opening lines and section label.
2. Change `renderUnits(...)` to render whole units rather than only nested messages when `unit.kind === 'tool_protocol_group'`.
3. Add private grouped tool interaction helpers:
   - render assistant envelope once;
   - collect result payloads in the unit by `toolCallId`;
   - render each call in original call order with request and matching result lines;
   - render unmatched results explicitly;
   - keep existing clamp behavior per emitted line.
4. Change standalone `ToolResultPayload` rendering to include `toolCallId` and label unmatched/orphan when not inside a protocol group.
5. Optionally rename `Assistant reasoning:` rendering to `Assistant work notes:` in the compaction prompt for more natural copy.
6. Update `CompactionTaskPromptBuilder` opening/section copy and raw trace result rendering to include `trace.toolCallId` when present.
7. Update default `memory-compactor/agent.md` wording while preserving JSON categories, output discipline, preservation/drop rules, and manual-testing guidance.
8. Update `CompactedMemoryMessageBuilder` opening and any compacted-memory prefix detection so compacted-memory units are still recognized after wording changes.
9. Add/update unit tests:
   - active prompt lacks “AutoByteus memory”, “working-context transcript”, “blocks”, “runtime internals”, “turn ids”, “raw trace ids”, “source events”, and LLM-facing “settled”;
   - active prompt uses `[CONVERSATION_HISTORY_TO_SUMMARIZE]`;
   - grouped single call/result includes call ID;
   - multi-call group pairs correct IDs/results;
   - standalone/orphan result includes call ID and unmatched label;
   - template body no longer contains product-branded/internal opening;
   - compacted-memory message uses natural resume-context wording and does not contain “compacting earlier working memory”.
10. Run focused package tests for changed files. Broader build can be deferred to implementation/API validation stages if expensive.

## Key Tradeoffs

- Adding IDs to result lines only would be the smallest fix, but grouped interaction rendering better matches the user-approved mental model and uses existing unit grouping.
- Keeping storage separate avoids redundant mutable state and stays aligned with provider protocols, but requires derived renderers to present paired views where helpful.
- Removing internal jargon from LLM-facing copy sacrifices some developer precision, but improves model comprehension. The planner/storage/logs still enforce and record exact internal concepts; the model does not need those terms unless the task itself is to discuss them.

## Risks

- Existing installed/user-edited compactor templates may keep old wording unless manually refreshed.
- If a unit contains multiple results for one call ID, implementation must decide whether to render all or first; design recommends rendering all in observed order to avoid dropping information.
- If `maxItemChars` truncates a line containing the call ID, the ID could be clipped. Implementation should put the ID near the beginning of request/result lines.

## Guidance For Implementation

- Do not touch `ToolCallPayload`, `ToolResultPayload`, snapshot schema, or `MemoryManager` ingestion for this task.
- Keep call IDs near the start of every tool interaction/result line.
- Prefer private helper methods in `WorkingContextCompactionPromptBuilder`; do not create a new generic renderer unless repeated logic appears after implementation.
- Keep the compactor output contract unchanged.
- Tests should inspect strings directly; no real compactor agent or LLM call is required for the core behavior.
- Treat this as an LLM-facing vocabulary audit: before implementation is done, grep the changed prompt/context outputs for the disallowed internal terms and remove them from generated prompt/context copy unless they are mandatory JSON field names from the output contract.
