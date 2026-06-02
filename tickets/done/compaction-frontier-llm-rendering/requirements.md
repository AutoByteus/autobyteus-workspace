# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — user approved the working-context-first redesign direction in conversation on 2026-06-02; design spec drafted.

## Goal / Problem Statement

AutoByteus memory compaction currently rebuilds the LLM working context from compacted memory plus a “raw frontier” text dump. That raw frontier appears in the LLM-facing prompt with product-internal metadata such as `[RAW_FRONTIER]`, `[BLOCK ...]`, `turn_0004`, sequence numbers, and trace-type labels. This is useful for storage/debugging, but it violates the agent mental model: from the LLM’s perspective, compaction should feel like an agent summarizing older work, keeping recent working memory fresh, and continuing naturally.

The same path also risks breaking native tool-call continuation semantics after compaction, because recent tool calls and tool results are converted into a single user text message instead of remaining canonical `Message` objects with `ToolCallPayload` / `ToolResultPayload` for provider/chat renderers.

## Investigation Findings

- `CompactionSnapshotBuilder` currently appends a literal `[RAW_FRONTIER]` section and delegates frontier rendering to `FrontierFormatter`.
- `FrontierFormatter` renders product-internal block and trace coordinates directly into LLM-facing text: block id, turn id, block kind, raw per-turn sequence, and raw trace type.
- `PendingCompactionExecutor` resets the working context snapshot to the `CompactionSnapshotBuilder` output. That output is currently only `system` plus one `user` memory/context message, so structured frontier tool messages are not preserved across compaction.
- The normal non-compacted path already has the correct abstraction: `WorkingContextSnapshot.appendToolCalls(...)` appends assistant `ToolCallPayload`, `appendToolResults(...)` appends tool `ToolResultPayload`, and provider renderers serialize those shapes to native API payloads or legacy text-history variants.
- The compaction path bypasses that renderer boundary by serializing frontier raw traces itself.
- The raw trace order for tool-call responses is not identical to provider message order: `LlmPhase` stores tool-call raw traces before the assistant response raw trace, while the working context snapshot stores a single assistant message with tool-call payload and assistant envelope. Any fix needs an owned projection/mapping, not a line-oriented formatter.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UX-quality bug / architecture cleanup
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue, with File Responsibility Drift in the current `FrontierFormatter` role.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed now if implementing this behavior.
- Evidence basis: `CompactionSnapshotBuilder` and `FrontierFormatter` leak raw trace metadata into the LLM-facing snapshot and bypass canonical `Message`/provider renderer handling for tool history.
- Requirement or scope impact: Need a clean LLM-facing frontier transcript/message projection boundary that keeps internal trace metadata internal while preserving provider-valid tool-call/tool-result continuity.

## Recommendations

- Replace the LLM-facing use of `FrontierFormatter` with an owned frontier projection component that emits canonical `Message[]` for recent frontier context.
- Keep any internal/debug raw trace formatter separate from the LLM-facing context renderer.
- Let existing provider renderers decide native API vs text-history representation from canonical `Message` objects; compaction should not hand-render provider-specific tool text.
- Close the MemoryManager mutation boundary so all working-context appends and provenance attachment happen through MemoryManager APIs.
- Use neutral message metadata plus memory-owned provenance helpers; forbid memory imports in LLM core message definitions.
- Add regression tests for compaction-before-tool-continuation in native API mode and for no internal metadata in LLM-facing frontier text.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: After compaction, the next LLM request includes compacted older memory plus recent active context in a natural LLM-facing form, not internal turn/block/sequence metadata.
- UC-002: If compaction runs before a tool continuation, the provider request still carries required recent assistant tool calls and tool results in the correct structured/API-compatible format, or in the existing renderer-owned text fallback for non-native tool modes.
- UC-003: Internal trace ids, turn ids, block ids, and sequence ids remain available for planning, pruning, logs, persistence, and debugging, but are not exposed in normal LLM-facing prompts.
- UC-004: Existing provider renderer behavior remains authoritative for how canonical `Message` objects become provider payloads.
- UC-005: A very long active turn with many completed tool-call/result cycles can be compacted without keeping the entire turn raw; only the live/unconsumed native tool protocol suffix remains structured.

## Out of Scope

- Changing the threshold formula for when compaction is requested.
- Changing the compactor agent output schema.
- Removing internal trace metadata from persisted memory/logs.
- Full provider renderer redesign unrelated to compaction frontier rendering.
- Historical/reopen native compaction cards in the center feed are out of scope for this change; live center-feed compaction execution feedback is now separately scoped in the UI addendum below.


## Case Taxonomy

Compaction behavior must be defined by settlement/consumption state, not by assuming a single huge active turn or a fixed number of prior turns. Required cases:

- CASE-001: Many older settled turns, current turn small/no live tool protocol. Older turns may be compacted; recent natural messages may remain.
- CASE-002: Few older turns, current turn huge with many tool cycles. Settled/LLM-consumed prefix of the active turn may be summarized; live unconsumed tool suffix remains structured.
- CASE-003: Many older settled turns plus current huge turn. Both older settled turns and consumed active-turn prefix may be compacted; only recent natural context and live tool suffix remain.
- CASE-004: Compaction before a new user turn while idle. No native tool result is pending; compact settled history and append the new user message after compaction.
- CASE-005: Compaction before same-turn tool continuation. The latest unconsumed assistant tool-call batch and matching tool result messages must remain structured for provider API rendering.
- CASE-006: Assistant issued tool calls but results are not available yet. Do not ask the LLM to continue from a summarized version of an unexecuted native tool call; execute tools first or fence as interrupted/recovery.
- CASE-007: Non-native text parser mode. Canonical message history remains the source of truth; renderer-owned text-history formatting is used only for the live suffix that genuinely needs continuation semantics.

## Functional Requirements

- REQ-001: Compaction snapshot frontier rendering must not expose internal `turn_id`, raw sequence number, block id, block kind, or trace id labels to the LLM unless an explicit diagnostic/debug mode is requested.
- REQ-002: Recent active conversation context after compaction must be represented as canonical `Message` objects with correct roles, not as a line-oriented raw trace dump.
- REQ-003: Recent tool-call and tool-result continuity must remain valid for the next provider call. Tool results that need to be sent back to the LLM must not be lost, reordered into an invalid provider shape, or demoted into an unrelated user log dump in native API mode.
- REQ-004: Storage/debug trace metadata must remain internal and available to compaction planning, pruning, status, and diagnostics.
- REQ-005: Existing compacted episodic and semantic memory sections must still be included before recent active context.
- REQ-006: The compaction path must reuse or extend the existing `Message`, `ToolCallPayload`, `ToolResultPayload`, and provider renderer boundary rather than duplicating provider-specific tool-history serialization.
- REQ-007: Raw trace-to-message projection must handle tool-call response grouping explicitly, including assistant content/reasoning envelopes and matching tool results.
- REQ-008: Compaction must distinguish settled/LLM-consumed tool cycles from the live protocol suffix. Settled active-turn tool cycles may be summarized naturally; the latest unconsumed assistant tool-call batch plus its tool result messages must remain structured until the LLM consumes them.
- REQ-009: The frontier policy must not equate `same active turn` with `must keep all raw`. A single long active turn must be splittable into compactable settled prefix plus live structured suffix.
- REQ-010: Compaction selection must be based on ordered memory units and token/safety budget, not on a fixed number of turns. The system must decide how many settled units to summarize and how many recent/live units to keep.
- REQ-011: The raw trace stream remains the durable source of events, but compaction should project those events into higher-level compactable units such as conversation messages, tool-call batches, tool-result batches, and LLM-consumed interaction segments.
- REQ-012: The compaction-agent summarization prompt should receive an LLM-facing transcript/projection of selected settled units, not raw trace coordinates such as turn id, sequence id, source event, or block id in normal mode.
- REQ-013: LLM-facing compaction selection and summarization must be based primarily on the `WorkingContextSnapshot` messages because those messages are the source rendered into the provider chat/template payload and are what caused prompt-token pressure.
- REQ-014: Raw traces may support provenance, pruning, archiving, diagnostics, and optional summarization enrichment, but raw traces must not be the authoritative LLM-facing prompt/history representation.
- REQ-015: Compaction must run only against a working context snapshot that already includes the just-completed assistant response/tool-call message, and for tool continuations, the latest tool result messages.
- REQ-016: The message-window planner must choose a compacted prefix and retained suffix from the `Message[]` list, preserving system/developer-equivalent context, memory summary messages, provider-required live tool protocol groups, and a budget-bounded recent natural suffix.
- REQ-017: If a completed LLM response has no tool calls and triggers compaction, the runtime should start compaction immediately after the assistant message is committed, without waiting for the next user input.
- REQ-018: The runtime must check the compaction threshold after every completed LLM response is committed. If that response has tool calls and triggers compaction, the runtime must not compact before required tool execution/results; it should request compaction, execute tools first, then compact before the next LLM continuation using the updated working context.
- REQ-019: Newly issued/unconsumed tool-call messages and their matching tool-result messages must be a protected suffix and must never be included in the compacted prefix for that continuation.
- REQ-020: The message compaction planner must retain enough recent natural working-context messages to make the continuation feel like a human agent resuming from fresh short-term memory, not only a summary plus the latest tool result. The exact retained count/size should be budget-based and configurable.
- REQ-021: The compacted replacement loaded into working context must be agent-natural memory: concise summary of earlier reasoning/actions, current goal, decisions, constraints, open questions, artifacts/results, and next intended step.
- REQ-022: Message retention budgeting must use a strategy interface so the initial estimated-token implementation can later be replaced by exact per-message token accounting without changing planner policy.
- REQ-023: LLM core `Message` may carry only neutral renderer-ignored metadata; memory-specific provenance must be owned by memory helper functions and `llm/utils/messages.ts` must not import `src/memory/*`.
- REQ-024: `MemoryManager` must be the authoritative working-context mutation boundary. Higher-level callers must use `MemoryManager` system/user/assistant/tool append or ingest APIs and must not call `workingContextSnapshot.append*` directly.
- REQ-025: Non-native/text-parser tool continuations must use canonical working-context tool-call/tool-result messages plus renderer-owned text-history conversion. The legacy synthetic aggregate tool-result user message must not be appended as an additional LLM-facing continuation message.

## Acceptance Criteria

- AC-001: A compaction snapshot containing recent frontier traces renders without literal `[RAW_FRONTIER]`, `[BLOCK`, `turn=`, `turn_000`, raw `seq`, or trace-coordinate labels in normal LLM-facing text.
- AC-002: A compaction-before-tool-continuation scenario in native API mode preserves an assistant tool-call message followed by matching tool result message(s) in the canonical message sequence after compaction, and the selected provider renderer emits a provider-valid tool continuation payload.
- AC-003: A normal recent user/assistant frontier compacts older memory while preserving recent context as role-correct messages after the compacted memory message.
- AC-004: Tests cover both normal recent user/assistant frontier and active tool-call/tool-result frontier.
- AC-005: Internal raw-trace planning/pruning/archival behavior remains unchanged.
- AC-006: Existing renderer tests or new tests show that native API renderers, not compaction code, own native tool payload formatting after compaction.
- AC-007: A test with one long active turn containing multiple completed tool cycles verifies that older consumed cycles are summarized and omitted from native tool history, while the latest unconsumed tool-call/result batch remains as provider-valid structured messages.
- AC-008: Tests verify that compaction decisions are not tied to a fixed turn count: many small prior turns, one huge turn, and mixed histories all use the same settled-prefix/live-suffix unit policy.
- AC-009: The compaction-agent prompt for settled units is natural transcript-style or canonical-message-derived and does not expose `turn_`, `[BLOCK`, raw sequence ids, or `source_event` in normal mode.
- AC-010: A compaction test proves the kept/summarized split is computed from canonical working-context messages while raw trace ids are only used to prune/archive corresponding records after successful compaction.
- AC-011: Timing tests prove compaction sees the latest assistant message/tool-call payload after LLM output and sees latest tool result payloads before tool continuation rendering.
- AC-012: Message-window tests verify the planner compacts a prefix of a long `Message[]` while retaining a valid suffix, including provider-required live tool-call/result groups.
- AC-013: A no-tool final response that crosses the compaction threshold emits `requested`, then `started`/`completed` for the same operation without requiring another user message.
- AC-014: A tool-call response that crosses the threshold does not compact until after tool results are ingested; the next continuation still sees the live structured tool suffix.
- AC-015: Tests prove newly issued tool-call/result messages are excluded from the compacted prefix and appear unchanged in the post-compaction working context.
- AC-016: Tests or golden prompts prove the compacted memory message is natural and action-oriented, carrying current goal/decisions/open work rather than internal trace metadata.
- AC-017: Planner tests can inject a fake/exact budget strategy and verify the planner uses the strategy output rather than hard-coded token estimation.
- AC-018: Dependency tests or static checks verify `llm/utils/messages.ts` does not import memory modules and provider renderers ignore neutral metadata.
- AC-019: Tests verify `LLMRequestAssembler` and continuation builders mutate working context only through `MemoryManager` APIs, including system prompt insertion and user message append.
- AC-020: Non-native parser-mode tests verify tool results are committed before compaction, pending compaction runs before continuation rendering, no duplicate synthetic aggregate user message is appended, and text-history renderers produce the live tool history.

## Constraints / Dependencies

- Must respect provider tool-call ordering requirements for OpenAI-compatible, OpenAI Responses, Anthropic, Gemini, Mistral, and Ollama native renderers where applicable.
- Must preserve existing text-history renderer behavior for non-native parser modes.
- Must not remove raw trace metadata from the store; the change is about LLM-facing projection.
- Must account for current raw-trace ordering where tool-call raw traces can precede the assistant content raw trace that belongs to the same model response.
- Must treat a matched tool call/result as API-complete but not necessarily LLM-consumed; the result is consumed only after a subsequent LLM continuation has completed.
- Must estimate or bound retained context by rendered/token size of units where possible, not raw count alone.
- Must keep compaction planner semantics: eligible settled blocks are summarized, frontier blocks are preserved/reprojected.

## Assumptions

- The user's desired behavior is normal-product behavior, not a diagnostic mode.
- The current working context snapshot model is the right canonical LLM-facing abstraction.
- Some implementation detail may need either raw trace-to-message projection logic or trace/message correlation to faithfully preserve frontier tool protocol.

## Risks / Open Questions

- OQ-001: Should the new frontier projection reconstruct from raw traces only, or should compaction preserve/copy relevant messages from the pre-reset working context snapshot using a trace/message correlation bridge?
- OQ-002: How should assistant reasoning content be preserved for recent tool-call frontier when raw traces do not carry the same envelope as `WorkingContextSnapshot.appendToolCalls(...)`?
- OQ-003: Should internal raw frontier text remain available in a debug artifact/log while being removed from LLM-facing messages?
- OQ-004: How much existing test expectation around `[RAW_FRONTIER]` should be replaced versus relocated to internal/debug formatter tests?

## Requirement-To-Use-Case Coverage

- REQ-001 -> UC-001, UC-003
- REQ-002 -> UC-001, UC-004
- REQ-003 -> UC-002, UC-004
- REQ-004 -> UC-003
- REQ-005 -> UC-001, UC-002
- REQ-006 -> UC-002, UC-004
- REQ-007 -> UC-002
- REQ-008 -> UC-002, UC-005
- REQ-009 -> UC-005
- REQ-010 -> UC-001, UC-002, UC-005
- REQ-011 -> UC-001, UC-002, UC-003
- REQ-012 -> UC-001, UC-003
- REQ-013 -> UC-001, UC-002, UC-004, UC-005
- REQ-014 -> UC-003
- REQ-015 -> UC-002, UC-004, UC-005
- REQ-016 -> UC-001, UC-002, UC-005
- REQ-017 -> UC-001, UC-004
- REQ-018 -> UC-002, UC-005
- REQ-019 -> UC-002, UC-005
- REQ-020 -> UC-001, UC-005
- REQ-021 -> UC-001, UC-003
- REQ-022 -> UC-001, UC-005
- REQ-023 -> UC-003, UC-004
- REQ-024 -> UC-001, UC-002, UC-004, UC-005
- REQ-025 -> UC-002, UC-004, UC-005

## Acceptance-Criteria-To-Scenario Intent

- AC-001 validates no internal metadata leak in normal LLM-facing frontier context.
- AC-002 validates provider/API-compatible tool continuity after compaction-before-continuation.
- AC-003 validates ordinary recent conversation continuity after compaction.
- AC-004 validates durable regression coverage for both key paths.
- AC-005 validates no storage/pruning regression.
- AC-006 validates correct ownership: provider renderers own provider payload formatting.
- AC-007 validates bounded active-turn compaction without losing the live native tool protocol suffix.
- AC-008 validates that the compaction policy is unit/budget based rather than turn-count based.
- AC-009 validates that the summarizer LLM also sees agent-natural history, not runtime trace coordinates.
- AC-010 validates the ownership split: working context owns LLM-facing history; raw traces support storage/provenance.
- AC-011 validates compaction timing relative to message mutation.
- AC-012 validates message-list prefix/suffix planning and live tool protocol preservation.
- AC-013 validates immediate post-final-response compaction for no-tool turns.
- AC-014 validates deferred-until-tool-results compaction for tool-call turns.
- AC-015 validates protected live tool suffix behavior.
- AC-016 validates the human-working-memory quality of the compacted replacement.
- AC-017 validates Strategy-pattern separability for estimated vs exact message budgeting.
- AC-018 validates neutral metadata dependency direction.
- AC-019 validates MemoryManager working-context mutation authority.
- AC-020 validates non-native text-parser continuation behavior.

## Approval Status

Approved/refined for design by user direction on 2026-06-02. UI compaction feed behavior was additionally clarified and incorporated on 2026-06-02.


## UI Compaction Feed Addendum (2026-06-02)

The user clarified a post-implementation UI behavior requirement after running the Electron app: compaction lifecycle cards in the center agent monitor should not appear as queued/internal rows interleaved awkwardly with streamed tool calls. The history/reopen view does not need native compaction cards; it only needs complete ordered replay of user/assistant/tool raw traces, including traces archived by compaction.

### Additional In-Scope Use Case

- UC-006: During a live run, the center agent monitor gives natural feedback when actual memory compaction is executing, without showing internal queued/requested state before pending tool results; after restart/reopen, historical rendering focuses on the actual work trace rather than compaction lifecycle cards.

### Additional Functional Requirements

- REQ-026: The right-side Activity feed must keep compaction lifecycle visibility as a single logical row/card per compaction operation, keyed by stable `compaction_operation_id` when available, updating `requested -> started -> completed/failed` rather than appending duplicate lifecycle rows for the same operation.
- REQ-027: The center live agent monitor must not render `requested`/queued compaction as an in-feed card. Queued/requested compaction is internal scheduling state and must not appear between a streamed assistant tool call and its pending tool result.
- REQ-028: The center live agent monitor may render a compaction card only for execution-phase statuses: `started`, terminal `completed` when `started` was not observed, or `failed` when execution failed or blocks continuation.
- REQ-029: For tool-call responses that trigger compaction, the center live monitor must naturally order display as assistant/tool-call segment(s), tool-result segment(s), compaction execution card, then post-compaction assistant continuation.
- REQ-030: The frontend center-feed compaction boundary must split the current visual AI message only at the first execution-phase compaction status, never at queued/requested; this split is display-only and must not alter backend turns, working context, LLM messages, raw traces, or tool-call/result protocol.
- REQ-031: Historical/reopen rendering is not required to show native compaction cards in the center feed. It must instead render user, assistant, reasoning, tool-call, and tool-result history from the complete raw-trace corpus, including active and archived traces, without dropping compacted history.

### Additional Acceptance Criteria

- AC-021: A live tool-call run that emits compaction `requested` before tool execution does not show a queued compaction card in the center feed, while the Activity feed shows or updates one lifecycle row.
- AC-022: When the same operation emits `started` and then `completed`, the Activity feed still contains one compaction row for that operation, and the center feed shows one execution card updated to the latest execution/terminal status.
- AC-023: A live tool-call run renders tool call/result content above the center compaction execution card and renders post-compaction assistant continuation below it.
- AC-024: Marking the current frontend AI visual message complete at compaction execution causes later streamed assistant/tool segments to create a new visual block, without changing working-context or raw-trace persistence.
- AC-025: Reopening a run after native compaction renders the actual user/assistant/tool history from active plus archived raw traces; absence of native compaction cards in the center historical replay is acceptable.
- AC-026: Tests or static assertions verify center-feed compaction rows use execution/timeline timing, not the original queued/request timestamp, for placement.

### Additional Requirement-To-Use-Case Coverage

- REQ-026 -> UC-006
- REQ-027 -> UC-006
- REQ-028 -> UC-006
- REQ-029 -> UC-006
- REQ-030 -> UC-006
- REQ-031 -> UC-006

### Additional Acceptance-Criteria-To-Scenario Intent

- AC-021 validates that internal queued compaction does not pollute the center live monitor.
- AC-022 validates one Activity lifecycle row and one center execution row per operation.
- AC-023 validates natural live ordering around tool results and compaction execution.
- AC-024 validates the display-only nature of the AI visual-block split.
- AC-025 validates historical replay correctness without requiring historical compaction cards.
- AC-026 validates the timestamp distinction between Activity lifecycle and center timeline placement.
