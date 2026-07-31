# Memory Compactor Prompt Content Contract

## Status And Authority

- Status: User-approved wording authority; SR-010 technical correction ready for renewed architecture review after `ARCH-REV-005`
- Purpose: Fix the exact origin/personal-style target text for the built-in Memory Compactor system prompt and the exact history-only, canonical-turn composition of its per-operation user message.
- Scope: `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent.md` and `WorkingContextCompactionPromptBuilder.buildTaskPrompt(...)`.
- Related requirements: REQ-005, REQ-007, REQ-010, REQ-012
- Related acceptance criteria: AC-006, AC-007, AC-014, AC-016
- Approval applicability: Required. User-approved on 2026-07-31.
- Implementation status: Not yet applied to production source. After architecture approval, implementation must reproduce this content exactly rather than inventing new wording. SR-010 does not change the user-approved prompt text; it completes the non-prompt validation, persistence, audit-version, and verification path required to accept the prompt's natural episode/fact counts.

This supplement is the wording authority for the two prompts. The broader behavior, ownership, and validation contract remains authoritative in `requirements.md`, `memory-context-and-lineage-contract.md`, and `design-spec.md`.

## 1. Exact Target `agent.md`

The complete target file is:

```markdown
---
name: Memory Compactor
description: Summarizes earlier work so the same agent can continue later.
category: memory
role: working memory summarizer
---

You summarize earlier work so the same agent can continue later without rereading the full history.

The supplied history may begin with a summary of earlier work followed by what happened afterward. Treat it as one continuous history. Keep earlier information that is still useful, update it when later events change it, and produce a fresh summary that stands on its own.

Keep the information that would let the agent resume safely: the goal, current state, distinct task phases, important outcomes, decisions and rationale, user preferences, constraints, important files or artifacts, implementation facts, validation results, open issues, and next actions.

Use the smallest number of episodes that still makes the work easy to resume. Give separate episodes to genuinely distinct phases or unrelated work when combining them would hide important outcomes or the current state. Do not create episodes for chatter, repeated status, repetitive activity, or obsolete detail.

Choose the number of facts based on what the work actually requires. Keep constraints, decisions and rationale, unresolved work, user preferences, important artifacts, and other stable facts that would affect future work. Prefer concise, non-overlapping facts. Do not omit an important fact merely to reduce the count, and do not create facts for chatter, repetition, or obsolete detail.

Do not invent facts, tool results, file paths, validation results, decisions, or user preferences that are not present in the supplied history.

Return one JSON object with these fields:
- `episodes`: summaries of what happened, why it matters, and the current state.
- `critical_issues`: blockers, failures, risks, regressions, or important warnings.
- `unresolved_work`: open questions, pending work, deferred work, and next actions.
- `durable_facts`: stable facts, decisions, constraints, rationale, and implementation details.
- `user_preferences`: durable user instructions, preferences, corrections, likes, and dislikes.
- `important_artifacts`: file paths, documents, branches, commits, logs, test results, generated outputs, or other artifacts needed later.

At least one non-empty episode is required. If a fact category has no relevant information, return an empty array for that field. The final answer must be exactly one JSON object, with no Markdown fences or prose around it:

{
  "episodes": [{ "summary": "string" }],
  "critical_issues": [{ "fact": "string" }],
  "unresolved_work": [{ "fact": "string" }],
  "durable_facts": [{ "fact": "string" }],
  "user_preferences": [{ "fact": "string" }],
  "important_artifacts": [{ "fact": "string" }]
}
```

### System-Prompt Invariants

- The LLM chooses the natural number of episodes and facts.
- There is no fixed episode target, total-fact cap, per-category cap, or ticket-specific output-token ceiling.
- “Smallest number of episodes” prevents unnecessary fragmentation; it does not authorize merging unrelated work or losing continuation-critical phases.
- Fact selection is quality-driven rather than count-driven.
- The exact JSON schema and complete-replacement semantics live here, not in the operation user message.
- The prompt uses only concepts needed for the summarization task. It does not teach the model internal storage, lineage, or evidence terminology.

## 2. Exact Builder-Generated User Message

`WorkingContextCompactionPromptBuilder.buildTaskPrompt(...)` must emit only the renderer-owned dynamic history:

```text
<conversation_history>
{{RENDERER_OWNED_DYNAMIC_HISTORY}}
</conversation_history>
```

`{{RENDERER_OWNED_DYNAMIC_HISTORY}}` is documentation notation only and is never emitted literally. `CompactionConversationHistoryRenderer.render(...)` owns the complete `<conversation_history>...</conversation_history>` block, including its opening tag, natural `User`/`Assistant`/`Tool` entries, reserved-boundary escaping, and closing tag.

The exact builder composition is therefore:

```text
return conversationRenderer.render(units, maxItemChars)
```

### Operation-Message Invariants

- The operation message is exactly one renderer-produced conversation-history block.
- It contains no task instruction, JSON schema, semantic-sizing guidance, category descriptions, item counts, token settings, or internal platform terminology. Those stable instructions live only in `agent.md`.
- The renderer reflects canonical conversation turns rather than exposing internal message constituents. It reuses the application-owned `WorkingContextFinalizer` composition boundary over the selected visible messages instead of defining its own connector wording. When an earlier summary and adjacent retained or current user content have been composed into one canonical user turn, the history contains one `User:` entry with both parts in their natural order—not two consecutive `User:` labels. Separate user entries remain separate only when the canonical history contains an intervening assistant or tool turn.
- It does not contain `COMPACTION_RESULT_SHAPE`; that builder-owned duplicate prompt constant and its public export are removed when no longer used.
- It does not expose the documentation placeholder.
- The dynamic conversation rendering remains governed by REQ-010 and AC-014.

For example, a canonical user turn containing both an earlier summary and the request that followed it is rendered as:

```text
<conversation_history>
User:
You are continuing an ongoing task. Here is a concise summary of earlier work to help you resume.

Earlier progress:
1. <earlier summary>

The user's current message is:
<current user content>

Assistant:
<assistant response>
</conversation_history>
```

The summary and current-input constituent ranges remain available to application planning, but they do not become artificial model-visible turns.

## 3. Forbidden Downstream Substitutions

Implementation must not replace this contract with:

- “as many as possible,” a preferred episode range, a total fact count, or per-category fact counts;
- a ticket-authored output-token ceiling or a change to `agent-config.json`, launch resolution, or provider token configuration;
- any task instruction, JSON/schema block, or policy text in the operation user message;
- a delta-style instruction that treats the previous compacted memory separately from the supplied natural history;
- defensive instructions about platform concepts that are absent from the supplied history and unnecessary for the exact output schema; or
- implementation-engineer-authored alternative wording without returning a requirement gap to `solution_designer`.

## 4. Verification Contract

Downstream coverage must compare the canonical system prompt and builder output against this artifact closely enough to prove:

1. the fixed episode/fact instructions are absent;
2. the natural quality guidance and exact JSON schema are present in `agent.md`;
3. the builder output exactly equals one `CompactionConversationHistoryRenderer` result, with no static prefix or suffix;
4. the builder no longer injects `COMPACTION_RESULT_SHAPE` or any other schema/sizing policy;
5. an earlier summary plus adjacent compatible retained/current user content renders as one natural `User:` entry, while assistant/tool boundaries remain intact;
6. neither prompt introduces storage, lineage, evidence, or other platform-internal terminology;
7. launch/provider token configuration remains unchanged; and
8. parser, result normalizer, accepted-proposal builder, lineage-record normalizer, lineage store, and accepted committer do not reintroduce hidden episode/fact cardinality limits; more-than-three episodes and more-than-twenty facts survive output persistence, lineage append/read, exact-head projection, and typed origin lookup.
