# Compacted-Memory Working-Context Evidence

## Status And Scope

- Investigation status: Complete; SR-010 aligned to the actual implemented SR-004 baseline and the full natural-count accepted path, prompt audit version transition, and message-only predecessor boundary
- Artifact type: Evidence/context supplement
- Approval applicability: N/A
- Intended-behavior authority: `memory-context-and-lineage-contract.md` and `use-case-data-flow-spine-map.md`
- Related requirements: REQ-007 through REQ-012
- Related acceptance criteria: AC-007 through AC-016
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
12. `Assistant work notes:` was a historical pre-SR-004 compaction-only label over private `reasoning_content`. The implemented SR-004 renderer already excludes it and private reasoning; SR-010 does not reimplement that removal.
13. The LLM-facing compaction input should not expose the storage/lineage distinction as separate “current memory” and “new evidence” sections. The planner still distinguishes them internally, but the renderer presents the projected compacted-memory user region plus selected later units as the one ordered logical conversation prefix that influenced the working LLM.
14. SR-004 already installed the design-principles-compliant shared `ReadableValueRenderer`/`CondensedToolCallRenderer` with explicit head/tail omission while preserving distinct sources/envelopes. SR-010 preserves it unchanged.
15. Current compactor sizing is duplicated and mechanically constrained in the built-in system prompt, per-operation builder, parser, normalizer, accepted builder, and `normalizeCompactionLineageRecord`. The lineage store invokes that last gate after the committer has archived R(n) and persisted output rows.
16. The tight target split is: `agent.md` owns natural task/JSON/quality policy; the operation message is renderer history only; parser/normalizer/acceptance/lineage validation enforce structure/per-entry/record safeguards without count caps; `MemoryManager` writes prompt audit version 2; readers preserve supported 1/2 records. Launch/provider configuration is unchanged.
17. API-REV-006 used the actual persisted built-in compactor and default runner. DeepSeek produced one episode; Qwen produced one and then three; both live journeys continued exactly. Those focused incident journeys validate the existing path but do not prove that the old one-to-three/twenty limits preserve a diverse approximately 200k-token selected history. This is a real coverage gap, not evidence that every compaction should produce more items.
18. The implemented unit builder expands message-local constituent ranges for selection, so the LLM-facing renderer must pass selected visible messages through `WorkingContextFinalizer` before labels. This reuse affects turn presentation only. Constituents keep local kind/range/raw refs; `MemoryManager` separately captures the lineage head and maps it to `previousCompactionId`.
19. `promptContractVersion` audits the producing contract. Value 1 truthfully identifies current SR-004 fixed-count/duplicated-operation records; new target records use 2. The lineage reader preserves supported 1/2 mixed chains without structural branching or migration.
20. Natural-count verification must continue beyond parser/acceptance through output persistence, lineage append/read, exact-head projection, and typed origin membership.

## SR-006 Quality-First Output Contract Evidence

The target wording deliberately avoids “as many as possible” and follows origin/personal's concise ordinary-language style. Compaction is successful when the successor can continue the same work correctly, not when it maximizes item count. The model therefore receives these stable priorities:

- use the smallest number of episodes sufficient to preserve distinct task phases, important outcomes, and current state;
- do not merge unrelated work merely to reduce the number of episodes;
- do not create episodes for chatter, repetition, or obsolete activity;
- preserve continuation-critical facts; and
- prioritize constraints, decisions and rationale, unresolved work, user preferences, and important artifacts.

The per-operation user message is source data only:

```text
<conversation_history>...</conversation_history>
```

The user explicitly rejected a ticket-specific numeric token ceiling. The LLM chooses the natural number of episodes and facts under the existing resolved model/provider behavior; `agent-config.json` and launch/output-token configuration do not change. Exact-count live assertions would reintroduce the policy being removed; SCN-019 instead verifies semantic anchors, separation of genuinely distinct phases, and omission of noise. Deterministic unit/integration cases prove that all structurally valid entries are retained.

The exact future boundary is not left to downstream interpretation. `memory-compactor-prompt-content-contract.md` contains the complete natural target `agent.md` and requires the operation user message to byte-equal one renderer-produced history block with no static prefix or suffix. It is the wording authority; this investigation remains evidence for why that owner split is required.

## Current AutoByteus Production Path

### Implemented recurrent planning and accepted publication

`memory-ingest-input-processor.ts` records user input before request assembly. When compaction runs, `WorkingContextMessageUnitBuilder` exposes typed units/constituents, and `WorkingContextMessageWindowPlanner` includes the current `compacted_memory` unit in `compactableUnits` while collecting archive refs only from selected natural R(n) units.

`StructuredJsonCompactionStrategy` returns an IDless proposal. `MemoryManager` separately captures/verifies the lineage head, maps it to `previousCompactionId`, assigns output IDs, and uses `AcceptedCompactionCommitter` for:

```text
archive R(n) -> persist output rows -> append lineage -> install finalized context -> write v5 snapshot -> clear pending
```

The lineage tail loads the exact current output. Snapshot v5 stores messages and message-local ranges only.

### Implemented compactor and Work Evidence rendering

`CompactionConversationHistoryRenderer` already emits one escaped `<conversation_history>` block containing reasoning-free `User`, `Assistant`, and settled `Tool` entries. Tool bodies use the shared core renderer; oversized variable values use explicit head/tail omission. Generated Work Evidence also uses the shared core presentation but remains raw-backed, timestamped Markdown/files/manifest. It is not compactor input.

The operation builder still prepends duplicate task/schema/count text before the renderer block. The unit builder also expands one composed user message into separate constituent units; the renderer currently labels those units independently. Therefore the real SR-010 rendering delta is:

1. `agent.md` becomes the sole stable task/JSON/quality policy;
2. the operation builder returns only the renderer block; and
3. selected visible messages pass through `WorkingContextFinalizer` before labeling, so one canonical user turn retains one `User:` label.

### Full remaining cardinality and audit path

Current enforcement sites are:

- system prompt: 1–3 episodes / <=20 facts;
- operation builder: duplicate count policy;
- parser: `.slice(0, 3)` and a 20-fact budget;
- normalizer: episode/total/category caps;
- accepted builder: >3/>20 rejection; and
- lineage record normalization: >3/>20 membership rejection and prompt version exactly 1.

`FileCompactionLineageStore.appendNext` invokes the lineage normalizer. Because the committer archives and writes rows before append, a normal >3/>20 proposal would otherwise fail after those writes. SR-010 removes only upper count gates and preserves all structural/per-entry/lineage invariants.

Prompt contract value 1 remains truthful for current SR-004 records. New target records use value 2. Readers accept/preserve supported 1/2 mixed chains, and projection/origin behavior is version-agnostic because the relationship shape is unchanged.

### Historical pre-SR-004 evidence (not current behavior)

Earlier source used top-K mixed projection, excluded current memory from later compaction, emitted `Assistant work notes`, used prefix-only clipping/server-local redaction, restored v4/fallback state, and allowed adjacent unfinalized user messages. Those observations motivated SR-004 and remain useful historical rationale, but every named behavior has already been replaced. They must not be described as current or reimplemented in SR-010.

### Reachable compactor failure distinction

Runner/parser rejection is still pre-write and retryable under the same pending `compactionId`. The hidden lineage count rejection is a different accepted-publication path and is removed by eliminating the invalid cardinality rule. No journal or crash-recovery mechanism is added.

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
You are continuing an ongoing task. Here is a concise summary of earlier work to help you resume.
Use it as context for previous reasoning, actions, findings, decisions, constraints, and open work.

Earlier progress:
1. <earlier-work summary>

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
13. a normal Work Evidence generation containing long user/assistant/tool values, proving that timestamps/order/Markdown/files/manifest remain while the same core omission marker/count preserves head and tail under the larger Work Evidence limit; and
14. a long multi-threaded quality journey without exact-count assertions, plus deterministic >3/>20 coverage through parser, normalizer, accepted builder, archive/output persistence, lineage append/read, exact-head projection, and typed origin lookup; a mixed prompt-version-1 predecessor/version-2 head preserves both audit values; launch/provider configuration remains unchanged.

The durable normative scenarios are SCN-003 through SCN-009, SCN-013 through SCN-016, and SCN-019 in `memory-context-and-lineage-contract.md`. SCN-017 and SCN-018 remain reserved for the downstream API-REV-006 evidence already recorded in that package.

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
7. `compaction-lineage-record.ts` owns structural record validation and prompt audit values 1/2; it owns no semantic count maximum. `MemoryManager`/accepted builder owns the new-write value 2.

The fixed behavior remains: later compaction consumes the prior compacted-memory message region plus new raw-backed activity while `MemoryManager` supplies the previous lineage-head ID, only the successful successor becomes current, and every current-format lineage chain must resolve completely or fail with an integrity error.
