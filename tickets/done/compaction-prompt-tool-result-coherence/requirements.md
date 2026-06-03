# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready - approved/refined by user on 2026-06-03 and revised after architecture review round 1. All LLM-facing compaction/context-summary prompts and compacted-memory messages must avoid internal jargon that does not help the model. Keep such terms only as internal code/status concepts when needed.

## Goal / Problem Statement

The memory compaction agent prompt, transcript rendering, and rebuilt compacted-memory message should feel like natural context-refresh/summarization inputs for an LLM, not like implementation-branded internal jobs. The current automated compaction user message says “Compact the settled working-context transcript below into durable AutoByteus memory” and uses `[WORKING_CONTEXT_TRANSCRIPT]`. The default compactor agent instructions also identify the agent as “AutoByteus Memory Compactor” and describe “AutoByteus conversation” history. The user finds this unnatural because compacting is conceptually like a human summarizing earlier work when context bandwidth is full. The user further clarified that any LLM-facing internal jargon that does not help the model understand the task should be removed or translated into natural language, including in the memory message constructed after compaction.

The compaction transcript also renders assistant tool calls with call IDs, but renders tool results only as “Tool result from <tool>: <result>”, despite the underlying stored `ToolResultPayload` already containing `toolCallId`. This makes the LLM-facing prompt less self-consistent than the stored data and makes call/result pairing rely on adjacency instead of explicit identity.

## Investigation Findings

- `autobyteus-ts/src/memory/compaction/working-context-compaction-prompt-builder.ts` owns the active working-context compaction prompt used by `AgentCompactionSummarizer.summarizeMessageUnits(...)`. Lines 16-25 contain the exact wording seen in the screenshot: “working-context transcript”, “AutoByteus memory”, and `[WORKING_CONTEXT_TRANSCRIPT]`.
- The same prompt builder renders tool calls with IDs at lines 36-40 but renders tool results without `toolCallId` at lines 44-50.
- `WorkingContextMessageUnitBuilder` already groups an assistant tool-call message with immediately following matching tool-result messages into a `tool_protocol_group` and records `toolCallIds` / `matchedToolCallIds`. Therefore compaction has a grouping owner; it does not need to change storage to know the relationship.
- `WorkingContextSnapshotSerializer` persists tool results with `tool_call_id`, and `MemoryManager.ingestToolResults(...)` constructs `ToolResultPayload(event.toolInvocationId, ...)`. The identity is not lost in storage; it is dropped only during compaction transcript rendering.
- The durable memory design docs define `ToolInteraction` as a derived view paired by `tool_call_id`, while the underlying snapshot remains event/message based. This supports keeping storage as separate tool-call/tool-result messages while improving the compaction-specific view.
- The legacy `CompactionTaskPromptBuilder` for raw-trace block compatibility also uses “AutoByteus memory” and omits tool call IDs from tool result lines. It is not the active screenshot path, but it should be aligned if touched to avoid a second inconsistent compaction prompt.
- `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent.md` is the default visible compactor agent system prompt/template; lines 3 and 8 contain AutoByteus-specific phrasing. Tests assert the template’s behavior/category/output guidance but not the AutoByteus wording specifically.
- `autobyteus-ts/src/memory/compaction/compacted-memory-message-builder.ts` constructs the post-compaction memory message that is later sent back to the working agent. Its opening currently says “after compacting earlier working memory”, which is also LLM-facing internal process language and should be replaced with a natural resume-context framing.
- Architecture review round 1 found that the active prompt guardrail must not name the very internal concepts it tells the model to ignore; the guardrail should use natural language such as “Focus on useful conversation facts; omit bookkeeping identifiers and low-level event details.”

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Cleanup
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes, localized
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant / Local Implementation Defect
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed
- Evidence basis: Tool result identity exists in `ToolResultPayload`, snapshot serialization, and ingestion, but the compaction prompt builder omits it. Prompt-copy naturalness spans the active prompt builder, default compactor template, legacy raw-block prompt builder, and compacted-memory message builder.
- Requirement or scope impact: Requirements should require natural prompt copy and explicit tool-result call identity in compaction transcript rendering, but should not require changing the canonical message/storage model.

## Recommendations

- Treat the underlying event/message storage as correct for this scope: keep tool calls and tool results as separate canonical messages/traces because provider histories, streaming lifecycle, partial failures, retries, and append-only persistence all benefit from separate records.
- Improve the LLM-facing compaction transcript instead of changing storage. The active prompt builder should render tool results with the originating call ID, preferably in a compact natural sentence: `Tool result for call <id> from <tool>: <result>`.
- Optionally render each `tool_protocol_group` as a visually grouped “tool interaction” section in the compaction prompt, but do not nest results into the stored `ToolCallPayload`; if grouping is added, keep unmatched/orphan tool results explicit.
- Naturalize all LLM-facing compaction/context-summary copy: active task envelope, default compactor agent template, legacy raw-block prompt builder, and compacted-memory message builder. Replace product-specific/internal phrasing with “summarize earlier conversation/history so future work can continue” language. Keep the JSON output contract unchanged.
- Align the legacy raw-block prompt builder if implementation touches prompt-copy constants, so old/manual compatibility paths do not continue the same odd wording.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- A memory compaction run renders conversation history containing plain user/assistant messages, assistant reasoning/work notes, tool calls, tool results, artifacts, open questions, and next steps.
- The compactor prompt asks an LLM to summarize/refresh context in natural language without unnecessary product or implementation branding.
- Tool results in the compaction transcript can be unambiguously matched to their originating tool calls.
- Existing canonical storage remains event/message based; compaction may render a clearer derived view over that storage.
- A post-compaction working agent receives a rebuilt compacted-memory message that should read as helpful resumable context rather than an internal compaction artifact.

## Out of Scope

- Changing provider-runtime tool-call protocol semantics.
- Rewriting the memory storage schema to store tool results inside `ToolCallPayload`.
- Migrating existing user-edited compactor agent definitions beyond updating the seed template used for new/missing files.
- Redesigning semantic memory categories or the compactor JSON output contract.

## Functional Requirements

- REQ-001: The active automated working-context compaction prompt must describe the task as natural context summarization/refreshing for future continuation, without unexplained product-specific branding such as “AutoByteus memory” and without internal eligibility jargon such as “settled” in the model-facing instruction.
- REQ-002: The default memory compactor agent template body must use natural, product-neutral task language while preserving its JSON-only discipline, category meanings, preservation/drop guidance, and manual-testing guidance.
- REQ-003: All generated LLM-facing compaction/context-summary text must avoid internal jargon that does not help the model, including `settled`, `working context`, `blocks`, `raw traces`, `source events`, `turn ids`, `runtime internals`, and `AutoByteus` branding. The prompt may still use required JSON field names from the mandatory output contract, and may use natural, user-understandable terms such as “bookkeeping identifiers” or “low-level event details” when instructing the model what to omit.
- REQ-004: The compaction transcript renderer must preserve all semantically important conversation context: user goals, assistant conclusions/progress, assistant work notes, tool calls, tool results, artifacts, open questions, and next steps.
- REQ-005: Every rendered tool result in the compaction transcript must expose the originating tool call identifier when the source message/trace contains one.
- REQ-006: The tool call/result transcript shape must be consistent enough for an LLM to understand call/result pairing without relying only on chronological proximity.
- REQ-007: The canonical storage/message model must remain single-source and non-redundant: do not store tool results inside tool calls for this scope; only derive grouped/nested views for compaction rendering if needed.
- REQ-008: If a rendered view groups or nests tool results under tool calls, unmatched/orphan tool results must remain visible as explicit unmatched results rather than being dropped.
- REQ-009: The compacted-memory message constructed for future continuation must read as natural resumable context, not as an internal artifact; avoid wording such as “after compacting earlier working memory”.
- REQ-010: Automated validation must cover prompt-copy naturalness, compacted-memory message naturalness, and tool-call/result pairing in compaction transcript rendering, including multiple tool calls and at least one tool result.
- REQ-011: If legacy raw-block compaction prompt rendering remains available, it must not retain contradictory product-branded/internal wording or omit available tool-call IDs from tool result lines.

## Acceptance Criteria

- AC-001: A working-context compaction prompt does not contain the phrase “AutoByteus memory”, “settled working-context transcript”, “runtime internals”, “turn ids”, “raw trace ids”, “source events”, or “block ids”, and uses continuation/context-refresh wording such as “earlier conversation history” plus natural omission guidance.
- AC-002: The default memory compactor agent template body no longer describes itself as “AutoByteus Memory Compactor” or its input as “AutoByteus conversation”, while still containing the required JSON categories and preservation/drop guidance.
- AC-003: A rendered compaction transcript containing a tool call with ID `call_123` and its result shows `call_123` on the result record, or shows the result under an explicitly labeled `call_123` interaction group.
- AC-004: A transcript with two tool calls and two result events remains unambiguous after rendering: each result is associated with the correct originating call ID.
- AC-005: A transcript with a tool result whose originating call is absent renders an explicit unmatched/orphan result with its call ID when available.
- AC-006: Existing compaction output JSON contract remains valid and unchanged.
- AC-007: A compacted-memory message built for future continuation does not say “after compacting earlier working memory” and instead frames the content as a concise summary/context for resuming earlier work.
- AC-008: Unit tests or focused executable checks demonstrate prompt-copy changes and tool-call/result correlation behavior in `WorkingContextCompactionPromptBuilder`; template tests are updated for natural wording.
- AC-009: If `CompactionTaskPromptBuilder` is updated, corresponding validation covers raw-trace tool result ID rendering.

## Constraints / Dependencies

- Work must occur on dedicated branch/worktree `codex/compaction-prompt-tool-result-coherence` from `origin/personal`.
- Preserve the compactor JSON output contract and parser compatibility.
- Avoid compatibility wrappers, dual transcript renderers, or redundant storage of results inside tool calls.
- Distinguish internal code/status terminology from LLM-facing text. Internal variable/type names may stay if they do not reach the model, but generated prompts/messages must be natural.
- Existing user-edited compactor definitions may be preserved by bootstrap; template changes primarily affect newly seeded/missing template files unless a separate migration is explicitly added.

## Assumptions

- The screenshot shows a generated compactor task prompt, not a manually authored user message.
- Tool call IDs are available in `ToolResultPayload` for normal tool-result messages and in raw traces for legacy raw-block paths.
- The primary concern is LLM-facing clarity and durable memory quality, not UI-only wording.

## Risks / Open Questions

- Existing installed/user-edited compactor agent files may not automatically receive template wording changes because the bootstrapper preserves user edits.
- If implementation chooses grouped rendering rather than only adding IDs to result lines, tests must cover incomplete/out-of-order/unmatched results carefully.
- The final replacement label should avoid internal words such as `working context`, `blocks`, and `settled`; recommended label: `[CONVERSATION_HISTORY_TO_SUMMARIZE]`.
- A full LLM-facing vocabulary audit is needed for this scope: prompt builder, default compactor template body, legacy raw-block prompt, and compacted-memory message builder. The audit must specifically catch contradictions where a prompt uses internal jargon while instructing the model not to include it.

## Requirement-To-Use-Case Coverage

- REQ-001, REQ-002, REQ-003, and REQ-009 cover natural LLM-facing prompt/template/compacted-memory framing.
- REQ-004 covers semantic preservation during compaction.
- REQ-005 and REQ-006 cover tool call/result correlation.
- REQ-007 covers the storage/model decision.
- REQ-008 covers unmatched result edge cases.
- REQ-010 and REQ-011 cover validation and legacy-path alignment.

## Acceptance-Criteria-To-Scenario Intent

- AC-001 validates active prompt naturalness.
- AC-002 validates default system prompt/template naturalness.
- AC-003 validates simple tool-result correlation.
- AC-004 validates multi-call/nontrivial correlation.
- AC-005 validates robust handling of partial history.
- AC-006 protects downstream compactor JSON parsing.
- AC-007 validates natural compacted-memory message construction.
- AC-008 and AC-009 validate executable coverage.

## Approval Status

Approved/refined by user on 2026-06-03. User specifically agreed to grouped tool-call/result rendering in compaction prompt while keeping storage unchanged, clarified that `settled` should not be used if it does not help the LLM, and broadened the wording requirement to all LLM-facing internal jargon in prompts/user messages and constructed compacted memory. Revised after architecture review round 1 to remove internal jargon from the recommended prompt guardrail itself.
