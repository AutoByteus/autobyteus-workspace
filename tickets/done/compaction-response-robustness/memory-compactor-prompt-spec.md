# Memory Compactor Prompt Specification

## Status And Authority

- Status: `Approved — 2026-08-14`
- Purpose: specify the exact approved Memory Compactor `agent.md`, minimal operation user-message framing, transient model response contract, and effect of the approved global input-formatting cleanup.
- Scope: compactor prompt and transient response contract. The generated system-prompt section order and common sections remain unchanged. The sole history wrapper is renamed to `<target_agent_conversation_history>...</target_agent_conversation_history>` while its rendered inner content remains unchanged.
- Related behavior: BEH-001, BEH-002.
- Related requirement / acceptance criteria: REQ-001, REQ-002; AC-001–AC-003.
- Approval applicability: `User approved`; this file is the exact wording authority for implementation.

## Approved `agent.md`

```markdown
---
name: Memory Compactor
description: Summarizes the conversation history of a target agent so the target agent can continue later.
category: memory
role: working memory summarizer
---

You summarize the conversation history of a target agent so the target agent can continue later without rereading the full history.

The supplied conversation history may begin with a summary of the target agent's earlier work followed by what happened afterward. Treat it as one continuous history. Keep earlier information that is still useful, update it when later events change it, and produce a fresh summary that stands on its own.

Keep the information that would let the target agent resume safely: the goal, current state, distinct task phases, important outcomes, decisions and rationale, user preferences, constraints, important files or artifacts, implementation facts, validation results, open issues, and next actions.

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

## Approved Final Operation User Message Shape

The compaction input is already sent to the model with the user-message role. Under the approved global input-formatting policy, the shared context-building processor no longer adds generic sender headings. A message without separately concatenated readable context is passed through unchanged. When context and message share one payload, only neutral `[Context]` and `[Message]` section labels delimit them. Sender metadata and origin-specific content remain owned by their runtime/builders. The compaction prompt builder adds only the identification and separator text shown below. The history renderer uses the more explicit `<target_agent_conversation_history>...</target_agent_conversation_history>` wrapper while preserving the rendered content inside it, and the message ends immediately after the end separator.

```text
Here is the conversation history of the target agent whose conversation history needs to be compacted. This conversation history is contained between the START and END separators below.

---------------- START OF TARGET AGENT CONVERSATION HISTORY ----------------
<target_agent_conversation_history>
...existing rendered content, unchanged...
</target_agent_conversation_history>
----------------- END OF TARGET AGENT CONVERSATION HISTORY -----------------
```

## Explicit Preservations

- Exactly one XML-style history wrapper, renamed cleanly from `<conversation_history>` to `<target_agent_conversation_history>`; no old-tag alias or dual wrapper.
- No edits to the rendered history content inside `<target_agent_conversation_history>` other than collision escaping for the renamed delimiter itself.
- No duplicated compaction task or output schema in the user message.
- No generic sender heading added by the shared context-building processor.
- No compatibility switch, alias, or fallback for the removed generic headings.
- No post-history instruction after the end separator.
- No change to provider roles, sender metadata, or source-specific content owned by tool/inter-agent/system builders.
- No reordering/removal of generated system-prompt common sections.
- The original six-array response section is preserved verbatim; implementation must not replace it with an `items` envelope or otherwise paraphrase it.
