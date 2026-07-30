# Compacted-Memory Working-Context Evidence

## Status And Scope

- Investigation status: Complete; recurrent-replacement/work-evidence-rendering evidence aligned and SR-004 lineage-tail/message-only-snapshot/fail-closed-startup ownership recorded as of 2026-07-30
- Artifact type: Evidence/context supplement
- Approval applicability: N/A
- Intended-behavior authority: `memory-context-and-lineage-contract.md` and `use-case-data-flow-spine-map.md`
- Related requirements: REQ-007 through REQ-011
- Related acceptance criteria: AC-007 through AC-015
- Explicit exclusion: Work-evidence chunking and intra-file localization are not part of this artifact or ticket.

This supplement records the current request, compaction, snapshot, renderer, and provider-contract evidence behind the foundation contract. It does not define an independent checkpoint, active-context journal, or alternative source of truth.

## Investigated Question

When compaction replaces an agent's working context, which layer must own the final message order and source boundaries? In particular, is a request shaped as `system -> user(compacted memory) -> user(current or retained input)` a safe provider-neutral invariant, and should raw activity be modified to reconstruct what the model sees?

## Evidence-Backed Conclusion

1. Consecutive user messages do not inherently break a transformer, and several current endpoints accept them.
2. They are not a portable provider/template contract: current Gemini guidance expects alternating history roles, and published Mistral templates can reject non-alternation.
3. Provider renderers must not own semantic repair. The provider-neutral `WorkingContext` must already be naturally composed before snapshot persistence and rendering.
4. Compatible compacted-memory, retained-user, and current-user regions may be represented as one canonical user message with explicit constituent provenance. No merge may cross an assistant/tool boundary or flatten media.
5. Raw traces remain original activity evidence. Selected rows may move from active storage to immutable archive segments, but no synthetic compacted-memory row is inserted into the raw activity stream.
6. The projected compacted-memory user constituent actually influenced the later activity. Repeated target compaction therefore includes it in the same selected logical conversation prefix as the later natural units and produces one complete replacement output: `M(n) = compact(M(n-1) + R(n))`.
7. Only the newest successful compaction output is projected. Earlier outputs remain immutable lineage history, so after C3 the context contains M3 rather than `M1 + M2 + M3` or a mixed top-K projection.
8. A valid schema-v5 `working_context_snapshot.json` is the runtime continuation/resume representation for finalized messages and message-local constituent ranges only. It stores no compaction/output/current-state identity; the absent/empty lineage file or its last successful record independently identifies no/current compacted memory. One required startup migration deletes pre-lineage episode/semantic rows, WorkingContext snapshots, and compacted-memory manifests before runtime while preserving raw traces and raw-trace manifests.
9. The reachable compactor failure boundary is before writes: a runner failure or parser-rejected response reached through normal compaction must leave the lineage head and baseline state unchanged and retain the current in-memory pending `compactionId` for retry. No broader publication-journal premise is established.
10. There is no separate tool-result condenser in the current strategy or target ticket. Internally settled tool-call/result groups are rendered directly into normal compactor input; live/incomplete tool protocol remains protected. The LLM-facing form is the same straightforward shape already established by Work Evidence: one `Tool` block containing `name`, `status`, `arguments`, and `result` or `error`, without an `Assistant tool call` label or backend call ID.
11. Compaction provenance is reference-only. Raw activity/archive and durable current-format memory remain the content authorities; one lineage record keyed by the existing successful `compactionId` relates optional `previousCompactionId` and the completed selected-record raw-trace archive file's existing run-relative `file_name` to produced episode/semantic IDs without an ambiguous mixed-subject list, invented activity/generation/segment IDs, exposed internal boundary key, repeated raw IDs, or copied messages, memory, tool/media payloads, or rendered prompts.
12. `Assistant work notes:` is not a raw-evidence field or a generated Work Evidence concept. It is a compaction-only label emitted by `WorkingContextCompactionPromptBuilder.renderAssistantEnvelope()` when a `Message` has `reasoning_content`; `MemoryManager` populates that field from `response.reasoning`. The target natural conversation-history rendering excludes this private reasoning.
13. The LLM-facing compaction input should not expose the storage/lineage distinction as separate “current memory” and “new evidence” sections. The planner still distinguishes them internally, but the renderer presents the projected compacted-memory user region plus selected later units as the one ordered logical conversation prefix that influenced the working LLM.
14. Generated Work Evidence and core compaction currently duplicate visible-value formatting/bounding: Work Evidence redacts then silently slices each cleaned value to 20,000 characters; compaction uses a different serializer and roughly 2,000-character whole-line prefix clamp. The design-principles-compliant reuse boundary is one general core `CondensedToolCallRenderer`. Its input contains `name`, `arguments`, one `result(value)`/`error(value)`/`no_outcome(status)` variant, and the consumer bound; its output is only the condensed Tool body. Terminal status is derived, and a genuine no-outcome renders the supplied status plus `result: not available`. Source correlation, selection, waiting, headers, timestamps, and consumer envelopes remain separate.

## Current AutoByteus Production Path

### Input is recorded before request assembly

`autobyteus-ts/src/agent/input-processor/memory-ingest-input-processor.ts` records processed user input through `MemoryManager.ingestUserMessage()` before the LLM phase prepares a request.

The raw event therefore already exists when pending compaction executes, but it has not yet been appended to the pre-request `WorkingContext` used by the compaction planner.

### Compaction projection and request assembly

`autobyteus-ts/src/memory/projection/compacted-memory-context-projector.ts` currently:

- preserves leading system messages;
- retrieves episodic and semantic memory;
- inserts one synthetic `MessageRole.USER` message with `sourceKind: "compacted_memory"`; and
- appends retained non-system continuation messages unchanged.

`WorkingContextMessageUnitBuilder` classifies that synthetic message as `compacted_memory`, and `WorkingContextMessageWindowPlanner` currently excludes it from the natural candidates supplied to later compaction. `Retriever` then selects a bounded mixture across outputs of multiple successful compactions: the latest three episodic rows and at most twenty semantic rows by salience/recency.

The target intentionally changes both behaviors. The projected compacted-memory user constituent stays in its natural logical position within the recurrent compaction input and carries only its message-local kind/range. Separately, `MemoryManager` captures the lineage tail before planning and maps that unchanged baseline to `previousCompactionId`. If lineage is absent/empty, no current derived-memory output exists. Appending the new successful lineage record makes its output bundle the only current compacted-memory projection.

`autobyteus-ts/src/agent/llm-request-assembler.ts` then:

1. executes pending compaction;
2. appends the already-ingested current user input to `WorkingContext`; and
3. renders the resulting messages.

A normal post-compaction request can consequently contain:

```text
system
user     // compacted memory
user     // retained user continuation or current request
```

### Current tests intentionally preserve adjacency

- `autobyteus-ts/tests/unit/memory/compacted-memory-context-projector.test.ts` expects `[system, user, user]` when retained continuation begins with user content.
- `autobyteus-ts/tests/unit/agent/llm-request-assembler.test.ts` expects `[system, user(compacted memory), user(current input)]` after pending compaction.
- `autobyteus-ts/tests/unit/memory/structured-json-compaction-strategy.test.ts` verifies that sequential compactions retain exactly one synthetic compacted-memory message.

These tests prove current behavior. They do not prove that the shape is the desired portable contract.

### Current compactor transcript versus generated Work Evidence

The current compactor does **not** consume generated Work Evidence Markdown. It independently renders selected `WorkingContextMessageUnit` values in:

- `autobyteus-ts/src/memory/compaction/working-context-compaction-prompt-builder.ts`.

`renderAssistantEnvelope()` currently emits:

```text
Assistant work notes: <Message.reasoning_content>
Assistant: <Message.content>
```

This label was introduced by the completed `compaction-prompt-tool-result-coherence` ticket. That design renamed the earlier `Assistant reasoning:` presentation to `Assistant work notes:` so the content would feel less like model-internal reasoning while still preserving it for the compactor. The newer generated Work Evidence contract made a different and stricter choice: separate reasoning is not observable work evidence and is omitted. For the present memory-compaction contract, renaming private reasoning is not sufficient; it must not enter the rendered conversation history.

The reasoning value enters WorkingContext through:

- `autobyteus-ts/src/memory/memory-manager.ts`, where normal assistant responses set `reasoning_content: response.reasoning`, and accepted assistant tool responses set `reasoning_content: assistantReasoning`.

The whole rendered prompt is then supplied as one task-level user message by:

- `autobyteus-server-ts/src/agent-execution/compaction/server-compaction-agent-runner.ts`.

The existing generated Work Evidence path is separate:

- `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-renderer.ts`;
- `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-redactor.ts`;
- `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-projection-service.ts`; and
- its current product caller, which consumes generated package locations rather than compactor input.

That path reconstructs normalized historical replay events from authoritative raw records, renders timestamped `user`, `assistant`, and combined `tool` blocks, returns `null` for separate `reasoning` events, redacts visible values, writes Markdown/manifest files, and gives the caller their paths. A Tool block already contains `name`, `status`, optional `arguments`, and `result` or `error`. `AgentWorkTraceRedactor` then silently applies `.slice(0, 20_000)` to each cleaned value; it does not emit an omission marker or retain a suffix. The generated Markdown body is not copied into the caller's trigger message.

| Concern | Current compactor prompt | Current generated Work Evidence | Target compactor conversation history |
| --- | --- | --- | --- |
| Source | Planner-selected natural WorkingContext units; compacted-memory unit currently excluded | Explicit archive-plus-active raw sources | One planner-selected logical WorkingContext prefix containing projected M(n-1), when present, followed by selected R(n) |
| User/assistant | Compaction-specific `User:` / `Assistant:` lines | Timestamped `user:` / `assistant:` blocks | Natural `User:` / `Assistant:` entries in the same logical order seen by the working LLM; no injected timestamps |
| Private reasoning | Rendered as `Assistant work notes:` | Explicitly omitted | Omitted |
| Tools | Call-ID-oriented request/result lines | One combined `tool:` block with name/status/arguments/result-or-error | One `Tool:` block with the same body; no `Assistant tool call` label or tool-call/backend IDs |
| Redaction | No equivalent evidence redactor in the prompt builder | `AgentWorkTraceRedactor` | Shared core redaction mechanism with consumer-owned source/envelope policy |
| Oversized visible value | Default 2,000-character whole-line prefix plus ` …[truncated]` | Silent 20,000-character prefix slice per cleaned string | Both consumers use configurable per-value head and tail with one explicit omitted-character marker/count |
| Wrapper/storage | One task prompt under `[CONVERSATION_HISTORY_TO_SUMMARIZE]`; no prompt file | Generated Markdown files and manifest | One natural task prompt; exactly one application-owned `<conversation_history>...</conversation_history>` boundary around the complete selected logical prefix; no separate prior-memory section, generated Markdown dependency, or persisted prompt copy |

The target does not consume or rebuild generated Work Evidence as compactor input. `autobyteus-ts` compaction remains sourced from planner-selected WorkingContext units, while server projection remains sourced from raw historical replay. Both source adapters call the same core `CondensedToolCallRenderer`. It emits only `name`, `status`, `arguments`, and `result` or `error`; for `no_outcome(status)` the result line is exactly `result: not available`. The compactor wrapper is exactly one `<conversation_history>...</conversation_history>` pair around the selected logical prefix; Work Evidence retains its timestamped Markdown/file/manifest envelope; source-originated instances of the compactor's reserved delimiter are escaped before insertion.

### Renderers forward the semantic shape

The OpenAI Chat/Responses, Anthropic, Gemini, and Mistral renderers map the source message list without a common same-role finalizer. They still legitimately own provider-specific media and tool encoding.

`working-context-compaction-output-validator.ts` protects message shape, leading system preservation, and tool protocol, but does not enforce a provider-neutral adjacent-role invariant.

### Raw storage and active/archive projection

`autobyteus-ts/src/memory/store/run-memory-file-store.ts` currently:

- appends original raw events to `raw_traces_active.jsonl`;
- archives selected compaction rows under a completed boundary;
- rewrites the active file to the retained keep set;
- reads the complete raw corpus as archive plus active rows when an evidence/history consumer explicitly asks for it; and
- separately reads/writes `working_context_snapshot.json`.

The current Event Monitor/run-history path is different from archive-aware evidence projection:

- `LocalMemoryRunViewProjectionProvider.buildProjection` requests `includeArchive: false`;
- active earlier-page reads remain within the active snapshot and do not fall back to archives; and
- active-file replacement expires the cursor.

Therefore Event Monitor answers “what recent active activity is visible?”, not “what exact context will the LLM receive?”

### Snapshot bootstrap

`autobyteus-ts/src/memory/restore/working-context-snapshot-bootstrapper.ts` prefers a valid schema-versioned snapshot and restores it directly. When the snapshot cannot be used, current fallback reads the complete archive-plus-active corpus and separately injects retrieved durable memory.

A verified normal product trigger exists at server startup: the existing app-data migration runner executes before built-in-agent bootstrap. The approved target registers a required, idempotent migration that discovers standalone and team-member run directories and deletes exactly `episodic.jsonl`, `semantic.jsonl`, `working_context_snapshot.json`, and `compacted_memory_manifest.json`. It preserves active/archive raw traces and `raw_traces_manifest.json`. The reset returns `FAILED` for any discovery/deletion failure. `AppDataMigrationRunner.runPending()` persists every attempted required result and throws after a non-startable result; `startConfiguredServer` logs and rethrows before bootstrap/build/listen. Existing `SUCCEEDED` and `SUCCEEDED_WITH_WARNINGS` remain startable. After that clean epoch boundary, snapshot bootstrap supports only v5 messages; absent/empty lineage means no current derived memory and the last valid lineage record lists exact current outputs. There is no old-schema reader, row-selection fallback, or complete-corpus replay branch.

### Reachable compactor failure

Current runner or response-parser failure occurs before `StructuredJsonCompactionStrategy` writes episodic/semantic items or archives raw IDs. `PendingCompactionExecutor` emits a failed lifecycle event and leaves the pending operation in memory. The next normal user request invokes it again with the same operation ID; existing integration coverage verifies that no episode/archive output exists after failure.

The target lineage/context design preserves that boundary by requiring an IDless strategy proposal and `MemoryManager`-built/validated accepted candidate before writes. Normal commit order is archive -> output rows -> append lineage as the new head -> installed context -> message-only v5 snapshot -> clear pending. Interrupted filesystem writes, invalid test-only strategies, and crash recovery do not establish a product premise for staged files or an operation journal.

## Provider Contract And Probe Matrix

| Provider path | Official/current evidence | 2026-07-22 live probe | Conclusion |
| --- | --- | --- | --- |
| OpenAI Responses | Ordered input message items carry roles; no alternation rule was found in the current reference. | `gpt-5.4-mini`, two consecutive user messages: HTTP 200, output `ORCHID`. | Current endpoint accepts the shape; this is not a universal provider invariant. |
| Anthropic Messages | Official SDK contract states that models use alternating turns and consecutive same-role request turns are combined. | `claude-sonnet-4-6`: HTTP 200, output `ORCHID`. | Anthropic currently normalizes the shape, but AutoByteus need not depend on provider-owned merging. |
| DeepSeek Chat | Current adapter uses an OpenAI-compatible chat endpoint. | `deepseek-v4-flash`, thinking disabled: HTTP 200, output `ORCHID`. | Current endpoint evidence only. |
| Grok Chat | Current adapter uses the xAI OpenAI-compatible chat endpoint. | `grok-4.5`: HTTP 200, output `ORCHID`. | Current endpoint evidence only. |
| Gemini GenerateContent | Official guidance tells REST callers to alternate `user` and `model` history. | Not run; no Gemini/Google API key was available. | Adjacent users are not a safe canonical shape. |
| Mistral chat templates | Official tokenizer documentation publishes templates that reject nonalternating user/assistant roles for covered families. | Not run; no Mistral API key was available. | Adjacent users are a concrete compatibility risk. |

Every live probe sent the equivalent of:

```json
[
  {"role":"user","content":"Background memory: the project codename is ORCHID. Treat this as context, not a request to answer yet."},
  {"role":"user","content":"What is the project codename? Reply only with the codename."}
]
```

Credentials came from the existing environment and were not printed or retained. These probes establish current acceptance and basic semantic use, not long-context quality or future compatibility.

## Evidence For Canonical WorkingContext Ownership

The renderer boundary is too late to own composition because:

- snapshot state could diverge from what was actually rendered;
- each provider would duplicate semantic policy;
- provider updates could silently change merging behavior;
- a renderer lacks the full domain meaning of compacted memory versus retained history versus current input; and
- source boundaries could be lost before they are persisted.

The provider-neutral boundary can instead represent compatible regions as one logical user message:

```text
You are continuing an ongoing task. Here is the compacted memory of earlier work:

<compacted memory>

The user's current message is:

<current request>
```

The message retains separate structured constituent metadata for the memory and current-input regions. Historical retained user input must be labeled as retained history rather than the current request.

If the first retained continuation is assistant/tool content, the memory remains one standalone user message before that suffix. A finalizer must never coalesce through a tool-call/result boundary merely to alternate roles.

On the next compaction, the same typed metadata lets the planner extract the memory constituent as `M(n-1)` even when it shares one physical user message with natural retained/current content. The memory constituent is always supplied to the compactor; the natural constituent is independently selected or retained. The raw archive set contains only selected natural raw refs.

## Why Raw Activity Is Not The Reconstruction Authority

The raw activity and current cognition serve different questions:

- archived and active originals answer “what happened?”;
- durable episodes/claims answer “what was learned?”;
- finalized `WorkingContext` answers “what will the model receive now?”; and
- the snapshot answers “how is that current context resumed?”

Mutating an original raw user/assistant/tool record into summary text would destroy evidence truth. Adding a synthetic memory row to the raw stream would mix derived context with observed activity and contaminate Event Monitor/evidence readers. The existing archive-and-rewrite behavior should therefore change active membership only; it should not convert raw records into memory records.

## Verification Implications

If implementation is later authorized, coverage must include:

1. finalized `WorkingContext` after compaction plus current user input;
2. renderer input equality with the latest finalized/snapshotted logical context;
3. retained-first-user versus retained-first-assistant/tool cases;
4. sequential compaction proving `M2 = compact(M1 + R2)`, with only M2 current afterward and M1 immutable/inactive;
5. a one-thousand-compaction case whose WorkingContext remains one bounded latest output while recursive lineage remains traversable;
6. multimodal user content and constituent provenance preservation;
7. complete tool-call/result suffix preservation;
8. valid schema-v5 snapshot direct restore of messages/message-local ranges with no compaction/output/current-state IDs, plus separate lineage-tail current-output lookup;
9. the real `startConfiguredServer -> AppDataMigrationRunner.runPending` path with pre-lineage derived files in standalone and team-member run directories, proving exact four-file deletion, raw-trace/raw-manifest byte preservation, idempotent retry, `FAILED` on any discovery/deletion failure, persistence of all attempted required results, runner rejection after a non-startable result, caller rethrow, and explicit non-invocation of `bootstrapBuiltInAgents`, `buildApp`, and `app.listen`; also prove that existing `SUCCEEDED` and `SUCCEEDED_WITH_WARNINGS` remain startable, followed by v5 message restore and absent/empty-versus-non-empty lineage lookup cases without archive replay;
10. a compactor-runner failure or invalid response leaving the lineage head/baseline unchanged and retrying the same pending `compactionId`; and
11. active-only Event Monitor paging and cursor expiry after active rewrite; and
12. a recurrent compaction input containing projected M1 followed by selected R2 user/assistant content, separate reasoning, a settled multi-call tool group, an error, long arguments/results, redactable values, and literal source-provided `<conversation_history>`/`</conversation_history>` strings, proving that the compactor receives one naturally ordered conversation-history block with no separate M1 section, source delimiter collisions escaped, straightforward Tool blocks, and no `Assistant work notes`, `Assistant tool call`, reasoning, synthetic timestamps, backend/tool-call IDs, or silent prefix-only clipping; and
13. a normal Work Evidence generation containing long user/assistant/tool values, proving that timestamps/order/Markdown/files/manifest remain while the same core omission marker/count preserves head and tail under the larger Work Evidence limit.

The durable normative scenarios are SCN-003 through SCN-009 and SCN-013 through SCN-016 in `memory-context-and-lineage-contract.md`.

## Primary Sources

- [OpenAI Responses create API](https://developers.openai.com/api/reference/resources/responses/methods/create)
- [Anthropic official TypeScript SDK Messages contract at `c58a55b`](https://github.com/anthropics/anthropic-sdk-typescript/blob/c58a55b01e62a308e2ffbed01b4d5c19a97868fc/src/resources/messages/messages.ts#L3077-L3081)
- [Google Gemini text-generation conversation-history guidance](https://ai.google.dev/gemini-api/docs/generate-content/text-generation)
- [Mistral tokenizer/chat-template documentation](https://docs.mistral.ai/resources/cookbooks/concept-deep-dive-tokenization-templates)

## Design Decisions Now Owned By The Design Spec

The former physical/structural questions are resolved in `design-spec.md`:

1. `WorkingContextFinalizer`, invoked through `MemoryManager`, owns compatible user composition and range validation.
2. `working-context-provenance.ts` owns message-local constituent kinds/ranges and raw-backed message provenance only; v5 contains no compaction, episode, semantic, lineage, or current-state identity.
3. run-local append-only `compaction_lineage.jsonl` owns both direct history and the current head through its last successful record; absent/empty means none, and no current-state file or replacement manifest exists; recursive indexes remain optional and rebuildable.
4. `readable-value-renderer.ts` and `condensed-tool-call-renderer.ts` own the tight shared presentation core; source-specific compaction and Work Evidence adapters retain their separate models/envelopes.
5. `compaction-conversation-history-renderer.ts` owns natural selected-WorkingContext rendering and the one escaped outer boundary.
6. The existing app-data migration subsystem owns the one-time pre-runtime derived-state reset; `CompactedMemorySchemaGate`, global compacted-memory manifest authority, historical dictionary access, and old snapshot readers are removed.

The fixed behavior remains: later compaction consumes the prior compacted-memory message region plus new raw-backed activity while `MemoryManager` supplies the previous lineage-head ID, only the successful successor becomes current, and every current-format lineage chain must resolve completely or fail with an integrity error.
