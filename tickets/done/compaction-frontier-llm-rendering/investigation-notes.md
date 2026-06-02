# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Current-state investigation updated; requirements still pending user approval
- Investigation Goal: Investigate compaction snapshot frontier rendering and provider/tool-message continuity after compaction.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The behavior spans memory compaction planning, compaction snapshot construction, raw trace formatting, working-context structured messages, provider renderers, and integration tests.
- Scope Summary: Separate internal raw trace metadata from LLM-facing compacted memory/recent-context rendering while preserving tool-call/tool-result continuation correctness.
- Primary Questions Resolved:
  - `[RAW_FRONTIER]`, `[BLOCK]`, turn ids, and sequence labels are rendered in `CompactionSnapshotBuilder` via `FrontierFormatter`.
  - Compaction currently resets the working context to system + one user text memory/context message, so frontier tool calls/results are not preserved as structured messages.
  - OpenAI/chat-style provider renderers already support native structured tool call/result messages; compaction bypasses that boundary.
- Primary Questions Still Open:
  - Whether the target projection should reconstruct from raw traces only or preserve/copy relevant pre-reset working-context messages through a correlation bridge.
  - How much debug/raw frontier formatting should remain as non-LLM diagnostic output.

## Request Context

User clarified that from the LLM perspective, compaction should resemble a human agent summarizing older work, keeping recent active context fresh, and continuing. Product-internal metadata such as turn ids, block ids, trace ids, and raw sequence numbers should not appear in the LLM-facing prompt. User also asked to check whether recent tool-call results must still be sent back through the correct API/chat renderer format after compaction.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering/tickets/done/compaction-frontier-llm-rendering`
- Current Branch: `codex/compaction-frontier-llm-rendering`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-06-01.
- Task Branch: `codex/compaction-frontier-llm-rendering` created from `origin/personal` at `b8e24ed9`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: This ticket is split from the prior compaction-queued investigation. It is about LLM-facing frontier rendering and tool-continuation correctness, not queue timing.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-01 | Command | `git fetch origin --prune` | Refresh base before worktree creation | Fetch completed. | No |
| 2026-06-01 | Command | `git worktree add -b codex/compaction-frontier-llm-rendering /Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering origin/personal` | Create dedicated task workspace | Worktree created at `b8e24ed9`. | No |
| 2026-06-01 | Code | `autobyteus-ts/src/memory/compaction-snapshot-builder.ts` lines 32-77 | Locate LLM-facing compaction snapshot construction | Builder collects memory sections, appends literal `[RAW_FRONTIER]`, formats `plan.frontierBlocks`, then returns `[system, user(summaryText)]`. | Replace/extend LLM-facing frontier projection. |
| 2026-06-01 | Code | `autobyteus-ts/src/memory/compaction/frontier-formatter.ts` lines 8-31 | Identify metadata leakage | Formatter emits `(${trace.turnId}:${trace.seq}) ${trace.traceType.toUpperCase()}:` and `[BLOCK ${block.blockId}] turn=${block.turnId} kind=${block.blockKind}`. | Move this to debug/internal use or remove from LLM path. |
| 2026-06-01 | Code | `autobyteus-ts/src/memory/compaction/compaction-window-planner.ts` lines 28-67 | Understand selected compacted vs frontier blocks | Planner keeps trailing incomplete blocks or active turn's last block as frontier; eligible blocks before frontier are compacted. | Preserve planner semantics; change only LLM-facing frontier projection. |
| 2026-06-01 | Code | `autobyteus-ts/src/memory/compaction/interaction-block.ts`; `interaction-block-builder.ts` | Understand block completeness and tool matching | Blocks begin on `user` or `tool_continuation`; complete blocks require all tool calls matched by tool results and no malformed tool trace. | Projection must respect block grouping but not expose block metadata to LLM. |
| 2026-06-01 | Code | `autobyteus-ts/src/memory/working-context-snapshot.ts` lines 1-70 | Confirm canonical LLM-facing structured message abstraction | Snapshot supports `appendToolCalls(...)` as assistant `ToolCallPayload` and `appendToolResults(...)` as tool `ToolResultPayload`. | Reuse this abstraction in compaction snapshot. |
| 2026-06-01 | Code | `autobyteus-ts/src/memory/memory-manager.ts` lines 176-326 | Trace ingestion to working-context behavior | Tool intents are stored as raw traces and appended as structured assistant tool-call messages; tool results are raw traces and structured tool messages; assistant responses are appended only when no parsed tool calls. | Raw trace reconstruction must account for separate raw trace order vs structured message order. |
| 2026-06-01 | Code | `autobyteus-ts/src/agent/loop/llm-phase.ts` lines 74-91 and 216-234 | Confirm request assembly and compaction timing | LLM phase chooses `prepareToolContinuationRequest` for native tool history, ingests tool intents, ingests assistant response, then evaluates compaction. | Compaction can run before same-turn tool continuation. |
| 2026-06-01 | Code | `autobyteus-ts/src/agent/llm-request-assembler.ts` lines 20-57 | Confirm pending compaction execution location | Pending compaction executes before appending a new user request or before tool-continuation provider dispatch. | If pending before tool continuation, snapshot reset must preserve structured tool history. |
| 2026-06-01 | Code | `autobyteus-ts/src/agent/loop/tool-result-continuation-builder.ts` lines 14-43 | Understand native tool continuation setup | In `api_tool_call` mode, processed tool results are ingested as structured tool results and continuation uses `SenderType.TOOL` metadata `native_api`. | These tool result messages must survive compaction-before-continuation. |
| 2026-06-01 | Code | `autobyteus-ts/src/llm/prompt-renderers/openai-chat-renderer.ts` lines 70-91 | Confirm renderer API shape | `ToolCallPayload` renders as assistant `tool_calls`; `ToolResultPayload` renders as `role: tool` with `tool_call_id`. | Compaction should emit canonical messages and let renderer serialize provider API. |
| 2026-06-01 | Code | `autobyteus-ts/src/llm/prompt-renderers/provider-tool-history-renderer-selection.ts` lines 1-35 | Confirm native/text renderer ownership | Native `api_tool_call` uses native renderers; non-native parser modes use text-history renderer variants. | Compaction should not duplicate provider mode decisions. |
| 2026-06-01 | Code | `autobyteus-ts/src/memory/working-context-llm-safe-projector.ts` lines 16-137 | Look for existing safe projection patterns | Projector already classifies complete vs unsafe tool protocol and can convert unsafe tool calls into assistant summaries for interruption cases. | Useful pattern, but interruption fencing is different from normal compaction frontier preservation. |
| 2026-06-01 | Test | `autobyteus-ts/tests/integration/agent/memory-compaction-tool-tail-flow.test.ts` lines 49-113 | Check current regression expectations | Existing test explicitly expects `[RAW_FRONTIER]`, `TOOL_CONTINUATION:`, `TOOL_CALL:`, and tool names in text snapshot. | Tests must be rewritten for new behavior; possibly add separate debug formatter tests. |
| 2026-06-01 | Test | `autobyteus-ts/tests/unit/memory/compaction-snapshot-builder.test.ts` lines 38-86 | Check unit snapshot expectations | Existing unit test expects `[RAW_FRONTIER]` in the user snapshot message. | Update after requirements approval. |
| 2026-06-01 | Doc | `autobyteus-ts/docs/agent_memory_design.md` lines 224-227, 269-276, 1100-1128 | Compare intended design | Docs say prompt renderers own provider adaptation and native tool continuation renders existing structured tool messages. Current compaction snapshot builder undermines that when compaction runs before continuation. | Design should realign implementation with documented boundary. |


### Additional user clarification: huge active turn

The user clarified a critical edge case: one active turn can run for a very long time, issuing many tool-call/result cycles over an hour or more. Therefore the target design must **not** keep the entire active turn raw just because it is the current turn. The correct split is:

- compact/summarize the settled prefix of the active turn after the LLM has already consumed those tool results and moved on;
- preserve only the live native tool protocol suffix as structured messages, especially the latest unconsumed assistant tool-call batch plus matching tool results that must be sent to the next LLM continuation;
- if an assistant tool call has been issued but not executed yet, execution should happen before LLM continuation; after results return, that latest batch/result pair remains structured until consumed by the next LLM response.

This means `InteractionBlock.isStructurallyComplete` is not enough by itself for compaction eligibility in a tool-continuation boundary case. A matched `tool_call`/`tool_result` pair is API-complete, but the result is not semantically settled until a later LLM continuation has consumed it.



### Raw memory data-structure clarification

Inspection confirms the durable raw memory is not stored as nested turn objects like `turn -> user -> assistant -> tool_calls -> tool_results`. It is an append-only JSONL trace stream. Each `RawTraceItem` has `turn_id`, `seq`, `trace_type`, `content`, `source_event`, and optional tool fields (`tool_name`, `tool_call_id`, `tool_args`, `tool_result`, `tool_error`). The file store appends one JSON object per memory item and `listRawTracesOrdered()` reads the ordered records back.

A local sample at `$HOME/.autobyteus/server-data/memory/agents/daily_assistant_general_agent_4240/raw_traces.jsonl` showed one turn with high sequence numbers (`turn_0005`, seq 411-422), including `tool_result`, `tool_continuation`, `tool_call`, `assistant`, then more `tool_result` and `tool_continuation` records. This supports the user's point: the practical compaction unit should not be a turn count. The raw stream needs projection into compactable semantic/protocol units.

Target selection should therefore be phrased as: from the ordered memory stream, identify settled units to summarize and a live/recent suffix to preserve. Turns can remain metadata for correlation and diagnostics, but must not be the primary retention policy.

### Case analysis requested by user

The user corrected an over-specific active-turn framing: there may be 200 prior turns and a small current turn, or few prior turns and one huge active turn, or both many prior turns and a huge current turn. Therefore the design must not hard-code “earlier in this turn” language or equate compaction policy with turn count. The correct analysis dimension is a matrix of history segments by state:

1. Settled old turns: compactable into episodic/semantic memory.
2. Recent settled turns: optionally retained as natural role messages if budget allows; otherwise compactable.
3. Active-turn consumed prefix: compactable once later LLM output proves previous tool results were consumed.
4. Live native tool suffix: not compactable into text; must remain provider-valid structured assistant/tool messages until consumed.
5. Issued-but-unexecuted tool calls: should not be sent to another LLM continuation; tools must execute first, or the protocol must be fenced/recovered after interruption.
6. New user turn after idle compaction: compact before appending new user input; no pending tool protocol suffix exists.

This case split should drive the design spec and acceptance tests.

| 2026-06-01 | Code | `autobyteus-ts/src/agent/loop/llm-phase.ts` lines 200-239 | Verify when working context is updated relative to compaction check | After stream completion, tool calls are ingested into working context or assistant response is appended, then `evaluateLlmPhaseCompaction(...)` runs. | Use this ordering in design. |
| 2026-06-01 | Code | `autobyteus-ts/src/agent/loop/tool-result-continuation-builder.ts` lines 26-48 | Verify tool result timing before same-turn continuation | Native continuation ingests tool results into memory/working context before creating the continuation input. | Ensure compaction sees these messages. |
| 2026-06-01 | Code | `autobyteus-ts/src/agent/llm-request-assembler.ts` lines 20-62 | Verify pending compaction execution point | Pending compaction executes before appending a new user message and before rendering tool continuation payload. | Design planner must operate on pre-render working context snapshot. |

### Architecture review round 1 design-impact findings

Architecture review round 1 failed with three design-impact findings that now drive the revised design:

1. **AR-001: Neutral metadata is mandatory.** `llm/utils/messages.ts` must not import memory-owned provenance. The target shape is a neutral, renderer-ignored `MessageMetadata` container in LLM core plus memory-owned helper functions in `memory/message-provenance.ts`.
2. **AR-002: MemoryManager must close the working-context authority gap.** Current code has direct higher-level calls to `memoryManager.workingContextSnapshot.appendMessage(...)`, notably in `LLMRequestAssembler.prepareRequest(...)` and `ensureSystemPrompt(...)`. The revised design requires subject-specific MemoryManager APIs for system/user/assistant/tool appends and decommissions direct snapshot mutation by callers.
3. **AR-003: Non-native/text-parser continuation needs a concrete sub-spine.** Current non-native flow builds a synthetic aggregate `SenderType.TOOL` user message and `LLMRequestAssembler.prepareRequest(...)` appends it after pending compaction. The revised design replaces that live continuation shape with canonical tool messages plus `tool_history_only` continuation and renderer-owned text-history conversion.

Additional code evidence recorded during rework:

- `autobyteus-ts/src/agent/llm-request-assembler.ts` lines 35 and 91 directly append messages to `memoryManager.workingContextSnapshot`, bypassing MemoryManager authority.
- `autobyteus-ts/src/agent/loop/tool-result-continuation-builder.ts` lines 63-134 build the non-native synthetic aggregate user message.
- `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts` lines 132-137 currently marks only native API tool continuations as `tool_history_only`; non-native continuations remain `append_user_message`.
- Text-history renderers such as `lmstudio-text-tool-history-renderer.ts` already convert canonical `ToolCallPayload` and `ToolResultPayload` messages to parser-mode text, so non-native continuation can stay renderer-owned if the runtime stops appending the duplicate synthetic aggregate user message.

## Current Behavior / Current Flow

### Non-compacted normal/tool flow

1. `AgentTurnRunner` processes the external user input and calls `LlmPhase.run(...)`.
2. `LlmPhase` creates `LLMRequestAssembler` and passes either:
   - `prepareRequest(...)` for normal/new user input, or
   - `prepareToolContinuationRequest(...)` for native API tool continuation.
3. `LLMRequestAssembler` renders `memoryManager.getWorkingContextMessages()` through the selected provider renderer.
4. When the LLM emits tool calls, `LlmPhase` calls `memoryManager.ingestToolIntents(...)`.
5. `MemoryManager.ingestToolIntents(...)` stores raw `tool_call` traces and appends one assistant message with `ToolCallPayload` to the working context snapshot.
6. Tool execution returns `ToolResultEvent`s. In native API mode, `ToolResultContinuationBuilder.buildNativeApiContinuation(...)` ingests those results into memory; `MemoryManager.ingestToolResults(...)` stores raw `tool_result` traces and appends `ToolResultPayload` messages to the working context snapshot.
7. The next LLM leg is `tool_history_only`, so `LLMRequestAssembler.prepareToolContinuationRequest(...)` sends the existing structured assistant tool-call message and tool result messages to the renderer without appending an aggregate user message.

This path is structurally correct before compaction.

### Compaction-before-continuation flow

1. After an LLM response, `evaluateLlmPhaseCompaction(...)` can mark `memoryManager.compactionRequired = true` and emit `requested`.
2. If the threshold-crossing response emitted tool calls, the tool calls still execute first.
3. Before the next LLM continuation leg, `LLMRequestAssembler.prepareToolContinuationRequest(...)` calls `PendingCompactionExecutor.executeIfRequired(...)`.
4. `PendingCompactionExecutor` plans eligible/frontier blocks from raw traces, compacts eligible blocks, retrieves compacted memory, then calls `CompactionSnapshotBuilder.build(...)`.
5. `CompactionSnapshotBuilder.build(...)` returns only:
   - one `system` message, and
   - one `user` message whose content includes compacted memory sections plus line-oriented `[RAW_FRONTIER]` text.
6. `MemoryManager.resetWorkingContextSnapshot(...)` replaces the working context snapshot with those messages.
7. The provider renderer no longer receives structured assistant `ToolCallPayload` / tool `ToolResultPayload` messages for the frontier. It receives a user text dump instead.

This is the bug/design gap the user is pointing at.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UX-quality bug / architecture cleanup
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue; File Placement Or Responsibility Drift
- Refactor posture evidence summary: Refactor needed now for this behavior. The current compaction snapshot builder uses a storage/debug formatter to create LLM-facing context, bypassing the canonical `Message` and provider renderer boundary.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User clarification | LLM should receive natural recent working context, not product-internal trace metadata. | Indicates boundary leak between internal memory trace representation and LLM-facing context rendering. | Design clean LLM-facing projection. |
| `FrontierFormatter` | Emits block id, turn id, seq, trace type into frontier lines. | Storage/debug representation is being used as prompt representation. | Remove from normal LLM path. |
| `CompactionSnapshotBuilder` | Converts all frontier blocks into text inside one user message. | Structured tool protocol cannot survive compaction as canonical messages. | Snapshot builder must output compacted memory message plus projected frontier messages. |
| `WorkingContextSnapshot` + renderers | Existing canonical message + renderer boundary already supports tool calls/results. | Correct owner exists; compaction bypasses it. | Reuse/extend this boundary instead of duplicating renderer work. |
| Current tests | Tests assert `[RAW_FRONTIER]` appears in LLM-facing snapshot. | Tests lock in the undesirable behavior. | Rewrite tests to assert no metadata leak and valid structured tool history. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/memory/compaction-snapshot-builder.ts` | Builds working context snapshot baseline after compaction. | Owns memory-section text and currently also owns raw frontier prompt formatting. | Should continue owning snapshot assembly but delegate frontier to an LLM-facing message projector. |
| `autobyteus-ts/src/memory/compaction/frontier-formatter.ts` | Formats raw frontier blocks as text. | Current output is internal/debug style and leaks metadata. | Should be removed from normal prompt path, renamed/repositioned as debug formatter, or replaced. |
| `autobyteus-ts/src/memory/compaction/compaction-window-planner.ts` | Selects eligible vs frontier blocks. | Planner semantics are sound for preserving live/incomplete context. | Keep planner; change projection of `frontierBlocks`. |
| `autobyteus-ts/src/memory/working-context-snapshot.ts` | Canonical LLM-facing message history. | Already supports structured tool-call/result messages. | Target frontier output should use this model. |
| `autobyteus-ts/src/memory/memory-manager.ts` | Ingests user/assistant/tool events into raw store and working context. | Tool ingestion writes both raw traces and structured messages. Assistant response with tool calls is raw-only after tool-call structured append. | Projection must handle trace-to-message grouping, especially tool-call assistant envelopes. |
| `autobyteus-ts/src/agent/llm-request-assembler.ts` | Assembles messages and rendered payload before provider call. | Executes pending compaction before tool continuation dispatch. | Requires compaction output to already be provider-renderable. |
| `autobyteus-ts/src/llm/prompt-renderers/*` | Converts canonical messages to provider payloads. | Native and text tool-history renderer variants already exist. | Do not duplicate provider adaptation in compaction. |
| `autobyteus-ts/src/memory/working-context-llm-safe-projector.ts` | Projects unsafe interrupted tool protocol into safe LLM context. | Existing pattern for classifying tool protocol completeness and converting invalid native history to safe text. | Can inspire but not replace normal compaction frontier preservation. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-01 | Static probe | `sed`/`rg` reads of files listed in Source Log | Confirmed the compaction path resets structured messages to text and existing tests assert raw frontier output. | Sufficient evidence for requirements/design; no runtime repro needed for this phase. |

## External / Public Source Findings

Not used. This investigation depends on local code, docs, and the user's runtime observation.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for current static investigation.
- Required config, feature flags, env vars, or accounts: None for current static investigation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation only.
- Cleanup notes for temporary investigation-only setup: None.
- Tests run: Not run; this phase updated investigation/design requirements only. Existing node dependencies are not installed in this worktree.





### Confirmed target model: compaction reconstructs `WorkingContextSnapshot` messages

User confirmed the intended mental model: compaction should produce a new working context, and the working context is represented by a `Message[]` array. After compaction, the runtime should reset `WorkingContextSnapshot` to this reconstructed message array, and future provider calls should render that array through the normal chat/provider renderer.

Target flow:

```text
old WorkingContextSnapshot Message[]
  -> message-window planner selects compacted prefix + retained suffix
  -> summarizer produces compacted memory from selected prefix
  -> snapshot rebuilder creates new Message[]
  -> MemoryManager.resetWorkingContextSnapshot(newMessages)
  -> provider renderer later renders newMessages
```

The new message array should usually contain:

```text
system/base message(s)
compacted memory message with current objective/progress/findings/decisions/open work/next step
recent natural message suffix retained by budget
protected live tool-call/result suffix retained structurally
```

This reinforces the architectural boundary: compaction is not a raw-trace-to-prompt formatter. It is a working-context transformation from one provider-renderable message array to another provider-renderable message array. Raw traces remain supporting records for provenance, pruning/archive, diagnostics, and optional enrichment.

### Human working-memory compaction model

The user framed the desired product behavior as a human working-memory process: after extended thinking/action/tool use, the agent should summarize older mental work because short-term memory bandwidth is limited, but keep the latest thinking and live tool feedback fresh. This model maps to a message-window planner:

1. The newest unconsumed tool-call/result group is a protected live suffix and must not be compacted for the continuation that needs it.
2. A recent natural message suffix should also be retained, bounded by budget, so the agent feels like it is continuing from fresh short-term memory rather than waking up from only an abstract summary.
3. The older settled message prefix becomes a compacted memory message. That replacement should be natural and action-oriented: what was done, what was learned, current objective, decisions, constraints, open issues, artifacts, and next step.
4. The planner should decide the compacted prefix/retained suffix using rendered/token budget, protected protocol groups, and configurable retention floors, not turn count or raw trace count.

Open design parameter: choose the default retention floor for recent natural messages, e.g. retain at least N recent non-compacted message units or M token budget unless the live tool suffix itself consumes the available budget.

### Working-context-first compaction clarification

The user identified the central architecture correction: compaction should be based primarily on the `WorkingContextSnapshot` because that is the canonical message list rendered into the provider/chat template, and prompt token pressure is measured from the LLM request that used those messages. Raw traces are not the same thing as the LLM-facing prompt history; they can contain internal metadata and records that are not appropriate to send to either the main LLM or the compaction LLM.

Current code confirms the trigger is based on provider token usage from the last LLM response (`tokenUsage.prompt_tokens`) compared against the input budget. That usage corresponds to the rendered LLM request, not to raw trace file size. Current code then incorrectly selects/summarizes from raw traces (`memoryManager.listRawTracesOrdered()` -> `CompactionWindowPlanner.plan(...)` -> `Compactor.compact(...)`), creating a mismatch: pressure comes from working context, but compaction uses raw trace blocks as the primary input.

Target direction: make working-context messages the authoritative LLM-facing compaction substrate. Raw traces should remain for provenance, pruning/archive, durable audit, and possibly enrichment/digests, but should not be the normal prompt/history representation for compaction. The design will need a correlation strategy from compacted message units back to raw trace ids so successful compaction can still prune/archive the corresponding raw traces.




### Timing refinement: tool-call responses execute tools before compaction

The user proposed the preferred tool-call timing explicitly: when an LLM response contains tool calls, execute the tools first, ingest the tool results, then run compaction immediately before the continuation request. This matches the safer target design because the live tool-call/result batch can be treated as the protected suffix.

Current code already largely follows this timing class: `evaluateLlmPhaseCompaction(...)` only marks compaction requested after the assistant tool-call message is ingested; tool execution then runs; `ToolResultContinuationBuilder.buildNativeApiContinuation(...)` ingests tool results; `LLMRequestAssembler.prepareToolContinuationRequest(...)` executes pending compaction before rendering the continuation payload. The remaining design bug is not the tool-call timing itself; it is that the compaction execution currently rebuilds the snapshot from raw trace frontier text instead of working-context messages and therefore can fail to preserve the newly ingested tool-call/result batch as structured messages.

Design implication: for tool-call outcomes, pending compaction should execute after tool results are present and must protect the latest unconsumed tool-call/result group as canonical `Message` objects. If the latest tool result itself is too large to fit, that is a separate tool-output summarization/truncation policy; normal compaction must not silently summarize an unconsumed provider-required tool result into plain memory text before the LLM has seen it.

### Timing refinement: immediate compaction for no-tool final responses

The user clarified that when the latest LLM response has no tool calls and triggers compaction, the runtime should not wait for the next user input. This is safe in principle because `LlmPhase` has already appended the assistant response to the working context before `evaluateLlmPhaseCompaction(...)`, and there is no pending tool execution/result dependency. The runtime can start compaction immediately after the final assistant message is committed and the response has been delivered/recorded.

Tool-call responses are different: if the threshold-crossing response contains tool calls, the runtime must execute tools and ingest results first. Only then can it compact before the next LLM continuation while preserving the live structured tool-call/result suffix.

This means the target timing policy should branch by LLM outcome:

- Final/no-tool response: request and execute compaction immediately post-response.
- Tool-call response: request compaction, execute tools, ingest tool results, then execute compaction before the continuation LLM request.
- New user while compaction is in progress: the request assembly should wait for or observe the completed compaction state before rendering the next LLM request.

### Working-context mutation timing

Current code confirms compaction is checked **after** the just-completed LLM response has been persisted into the working context snapshot:

- If the LLM response contains tool calls, `LlmPhase` collects parsed invocations, starts the active tool batch, and calls `memoryManager.ingestToolIntents(...)` before `evaluateLlmPhaseCompaction(...)`. `ingestToolIntents(...)` appends an assistant message with `ToolCallPayload` and carries assistant content/reasoning as the message envelope. Then `ingestAssistantResponse(...)` records the raw assistant trace but does not append a duplicate assistant message because `appendToWorkingContext` is false when parsed tool calls exist.
- If the LLM response contains no tool calls, `ingestAssistantResponse(...)` appends a normal assistant message before `evaluateLlmPhaseCompaction(...)`.
- For native tool-result continuation, `ToolResultContinuationBuilder.buildNativeApiContinuation(...)` calls `memoryManager.ingestToolResults(...)` before producing the internal `SenderType.TOOL` continuation input. `ingestToolResults(...)` appends structured `ToolResultPayload` messages. Then `LLMRequestAssembler.prepareToolContinuationRequest(...)` executes pending compaction before rendering the provider request.

Therefore, at the point pending compaction actually executes before a new user request or tool continuation, the working context snapshot should already contain the latest assistant/tool-call message and, for tool continuation, the latest tool result messages. This reinforces the working-context-first design: compact after the relevant messages are in the snapshot, then render from the rebuilt snapshot.

### Current prompt and summarization architecture

There are two distinct prompt paths today:

1. **Normal main-agent LLM prompt path.** The provider request is rendered from `WorkingContextSnapshot` (`Message[]`) through a provider renderer. It does not normally render raw traces directly. Raw traces are a parallel durable event stream used for memory, planning, and compaction.
2. **Compaction-agent prompt path.** When pending compaction executes, `PendingCompactionExecutor` loads ordered raw traces, `CompactionWindowPlanner` groups them into `InteractionBlock`s, and `Compactor` calls `Summarizer.summarize(eligibleBlocks)`. `AgentCompactionSummarizer` builds one task prompt with `CompactionTaskPromptBuilder`, currently rendering internal lines such as `[BLOCK block_0001] turn=... kind=...` and `(turn:seq) TRACE_TYPE: ...`. This means the compaction agent itself also receives internal runtime metadata today.

After the compactor returns JSON, `Compactor` stores an `EpisodicItem` and `SemanticItem`s, then prunes/archives the eligible raw trace ids. `PendingCompactionExecutor` retrieves compacted memory and calls `CompactionSnapshotBuilder`, which resets the main working context snapshot to synthetic messages: system prompt plus one user memory/context message containing `[MEMORY:*]` sections and currently `[RAW_FRONTIER]` text.

Therefore compaction does **not** literally replace raw traces with one new raw trace. It converts selected raw traces into episodic/semantic memory, archives those raw trace records, and replaces the main LLM working context snapshot with compacted memory plus retained frontier. The design issue is that both the compaction-agent prompt and the main-agent frontier snapshot use raw-trace/debug formatting instead of an LLM-facing transcript/message projection.

## Findings From Code / Docs / Data / Logs

1. **The user's concern is valid.** Current LLM-facing compaction snapshots do include internal runtime metadata via `[RAW_FRONTIER]`, `[BLOCK ...]`, `turn=...`, raw per-turn `seq`, and trace type labels.
2. **The current compaction path weakens native tool continuation.** If compaction executes before a same-turn tool continuation, the working context reset replaces structured assistant/tool messages with a user text dump, so provider renderers cannot render native tool history from canonical payloads.
2a. **Long active turns require a consumed-vs-live split.** The active turn itself cannot be the preservation unit; older consumed tool cycles in the same turn must be summarized, while the newest unconsumed tool-call/result batch remains structured.
3. **The correct abstraction already exists.** `Message`, `ToolCallPayload`, `ToolResultPayload`, and provider renderers are already the intended boundary for LLM-facing history.
4. **The root issue is boundary leakage.** `FrontierFormatter` is effectively an internal trace/debug renderer, but `CompactionSnapshotBuilder` uses it as normal prompt content.
5. **Implementation is non-trivial but bounded.** A fix should not be a simple string cleanup; it needs a frontier transcript/message projector that can preserve role order and tool-call/result pairing.
6. **Raw trace order is a design constraint.** Tool-call raw traces can be written before the assistant response raw trace for the same LLM output, while canonical working context represents them together as one assistant tool-call message. This needs explicit handling.

## Constraints / Dependencies / Compatibility Facts

- Must preserve provider-native tool-call ordering and role semantics.
- Must keep internal trace metadata for runtime storage, planning, pruning, logs, and diagnostics.
- Must not move provider-specific payload logic into memory compaction; renderers own provider adaptation.
- Must keep compaction trigger/timing semantics out of this ticket unless explicitly expanded.
- Existing tests currently assert old raw frontier behavior and will need deliberate updates.

## Open Unknowns / Risks

- Whether to reconstruct frontier messages from raw traces only or to correlate/copy messages from the pre-reset working context snapshot.
- How to mark or infer `LLM-consumed` tool result boundaries so long active turns can compact settled tool cycles but preserve the newest unconsumed batch.
- How to estimate retained size by rendered/token budget per projected unit rather than by number of turns.
- Whether assistant reasoning content can be fully preserved from raw traces for tool-call frontier after compaction.
- How to expose debug raw frontier output if developers still need it without sending it to the LLM.
- Whether any provider-specific renderer has stricter history requirements that require additional tests beyond OpenAI-compatible paths.

## Notes For Architect Reviewer

If/when requirements are approved, the design should start from these spines:

1. **Compaction frontier projection spine:** raw traces + compaction plan -> compacted memory bundle -> LLM-facing snapshot messages -> provider renderer -> provider payload.
2. **Tool continuation spine:** LLM emits tool calls -> structured working context tool-call message -> tool execution/result ingestion -> pending compaction executes -> structured frontier messages survive/reset -> renderer sends provider-valid tool continuation.

Initial design direction: keep `CompactionWindowPlanner` as the owner of eligible/frontier selection; introduce or extract an LLM-facing frontier message projector under memory/compaction that emits canonical `Message[]`; keep/debug any raw frontier formatter separately and remove its use from normal `CompactionSnapshotBuilder` output.


## UI Compaction Feed Investigation Addendum (2026-06-02)

A post-implementation Electron run exposed a frontend ordering problem: compaction cards were grouped below a large assistant/tool visual block instead of appearing naturally around the actual compaction execution point. Detailed evidence and recommended scope are recorded in `ui-compaction-feed-ordering-investigation.md`.

Key evidence:

- `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue` combines whole `conversation.messages` rows with `compactionActivities` and sorts only at whole-message granularity.
- `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` reuses the last incomplete `AIMessage`, so a long active turn can keep appending later tool/result/assistant segments to a visual block whose timestamp is the first assistant segment.
- `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts` upserts compaction activity status but does not split the current visual AI message.
- `agentActivityStore.upsertCompactionActivity()` preserves the original request timestamp while updating phase/details, which is correct for Activity lifecycle history but insufficient for center-feed execution placement.
- Daily Assistant run `daily_assistant_general_agent_4141` confirmed multiple native compactions during one long `turn_0001`; active and archived raw traces remain available for history replay through the complete raw-trace corpus.

Refined UX/design decision:

- Activity panel may show `requested -> started -> completed/failed` as one row keyed by stable operation identity.
- Center live monitor hides queued/requested, shows only execution-phase compaction feedback, and splits the current frontend AI visual block only at execution phase.
- Historical/reopen center replay does not need native compaction cards; it only needs complete ordered raw-trace replay from active plus archive.
