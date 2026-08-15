# Compaction Output Contract Decision

## Status And Authority

- Status: `Approved — 2026-08-14`
- Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/compaction-output-contract-decision.md`
- Purpose: define the intended model-to-host compaction response behavior and record why the original six-array JSON contract is preserved while arbitrary Markdown and generic filesystem tools remain rejected.
- Scope: transient compactor response, task framing, and bounded invalid-output recovery. Canonical episodic/semantic storage, lineage, exact raw-trace archive, and final prompt projection remain host-owned.
- Requirements relationship: constrains `REQ-001` through `REQ-010` and `AC-001` through `AC-013` in `requirements.md`.
- Approval applicability: `User approved`; this supplement defines authoritative intended behavior.

## Evidence-Backed Problem

In the reported Daily Assistant run, two earlier compactions returned valid six-array JSON summaries and committed successfully. Two later attempts received the same 71,043-character conversation-history input and instead resumed the source CER/Vue task. Their output began with source-task commentary such as “Let me first read...” and emitted `run_bash` tool-call markup. Neither output contained any compaction JSON object.

The task builder currently produces only `<conversation_history>...</conversation_history>`, and normal user-input processing prefixes that block with `**[User Requirement]**`. The authored compactor description refers to “earlier work” and “the same agent” rather than explicitly identifying a target agent. The history then ends after a successful source-task tool result. Together these signals made the latest “user requirement” look like the compactor's own unfinished workspace task. The model selected that wrong task twice. The user reviewed the complete generated system prompt, found the original authored `agent.md` approximately 99% correct, and approved only minimal target-agent/conversation-history wording changes, a rename of the sole outer tag to `<target_agent_conversation_history>`, and the operation-message boundary.

The current parser is not defeated merely by surrounding prose: runtime probes show it accepts an exact object, prose before and after a valid object, and fenced JSON. It fails the observed outputs because no compaction object exists. It also selects the first parseable object before applying the compaction schema, so an unrelated JSON object before a valid compaction object causes a false rejection.

## Causal Order

The incident was caused by prompt-role confusion, not by the six-array response contract. Prompt correction is the root fix. Schema-aware candidate selection and one bounded repair are defense in depth. The original six-array response section is preserved verbatim because it is detailed, repeatedly tested, and succeeded earlier in the same parent run when the model selected the correct task.

## Required End Result

A successful operation must yield the existing typed content so the host can:

1. retain at least one concise continuation episode;
2. preserve critical issues, unresolved work, durable facts, user preferences, and important artifacts when present;
3. normalize, deduplicate, order, and assign salience;
4. allocate host-controlled IDs and timestamps;
5. append lineage and replace working context atomically; and
6. reject unrelated or unusable model output without mutating the current memory generation.

The model does **not** author persisted rows, identifiers, timestamps, salience, lineage, a working-context snapshot, or the final Markdown headings. Those remain derived by the host.

## Decision Matrix

| Option | Robustness Against Observed Failure | Integrity / Semantic Signal | Change Risk | Decision |
| --- | --- | --- | --- | --- |
| Preserve the exact original six-array response section; fix task framing; harden parsing/repair | Directly addresses task drift while retaining the proven response contract | Preserves every current category explanation and internal mapping | Lowest prompt/schema churn | **Approved** |
| Replace the six arrays with an `items`/`kind`/`text` envelope | Does not itself address wrong-task selection | Could preserve semantics, but rewrites a repeatedly tested prompt section | Unnecessary parser/mapping/test churn for this incident | Reject for this task |
| Accept arbitrary Markdown as the final result | Could accept the observed wrong-task prose/tool markup as memory | Cannot reliably distinguish memory categories or completeness | High silent-corruption risk | Reject |
| Give the compactor generic `write_file` access | Does not clarify the task; a confused model could act on source files | Requires an additional file protocol and validation | Broad authority and large redesign | Reject |
| Future isolated file-backed provider | Could address a future proven transport/truncation problem | Can be strong with staged schema and validation | Separate substantial design | Defer |

## Approved Model Response Contract

The response section in `memory-compactor-prompt-spec.md` is preserved verbatim from the original `agent.md`:

```json
{
  "episodes": [{ "summary": "string" }],
  "critical_issues": [{ "fact": "string" }],
  "unresolved_work": [{ "fact": "string" }],
  "durable_facts": [{ "fact": "string" }],
  "user_preferences": [{ "fact": "string" }],
  "important_artifacts": [{ "fact": "string" }]
}
```

Contract invariants:

- All six top-level arrays remain required.
- At least one nonblank `episodes[].summary` remains required.
- Episode entries retain `summary`; entries in the five fact categories retain `fact`.
- Category meanings and the instruction to return an empty array when a fact category is irrelevant remain exactly as authored.
- The model is still instructed to return exactly one JSON object without fences or surrounding prose.
- As host-side defense in depth, visible prose/fences and harmless extra fields may be tolerated around one unambiguous schema-valid object.
- Candidate extraction is schema-aware: an unrelated JSON object must not mask a later valid six-array object.
- More than one distinct schema-valid compaction object is rejected as ambiguous.
- Tool-call markup, source-task commentary without a six-array object, and arbitrary Markdown are not successful compaction results.
- No `items`/`kind`/`text` response contract is introduced.

The existing parser-to-`CompactionResult` mapping remains authoritative; no new transient response DTO or category mapper is needed.

## Task / Evidence Boundary

The sole outer history wrapper is renamed cleanly from `<conversation_history>...</conversation_history>` to `<target_agent_conversation_history>...</target_agent_conversation_history>`. Its rendered inner content and other rendering rules remain unchanged, with delimiter-collision escaping updated for the renamed tag. No old-tag alias, dual wrapper, or hierarchy of additional XML tags is introduced. The shared context-building processor cleanly removes its generic sender-heading map; no compatibility switch, alias, dual rendering path, or fallback retains it. Messages without concatenated readable context keep their authored content unchanged; messages with readable context use only neutral `[Context]` and `[Message]` boundaries. This does not change provider roles or sender metadata. Native tool results remain provider-native, text-only tool continuation still adds no LLM user message, and origin-specific tool/inter-agent/system builders retain ownership of any source wording their payload needs.

The per-operation compaction message adds only the exact approved identification sentence and one plain-text `START` / `END` separator outside the existing block. There is no repeated compaction instruction after the end separator because the system prompt owns that task.

The system prompt receives only minimal wording refinement: it summarizes the conversation history of a target agent so the target agent can continue. The remainder—including the complete response instructions—is preserved verbatim. No new prohibitive text about continuing tasks, performing actions, or emitting tool calls is added. The generated system-prompt section order and common environment/practice sections remain unchanged.

## Bounded Repair Behavior

If the first returned text contains no unambiguous valid six-array object or fails semantic validation, the operation makes one automatic repair attempt. The correction identifies the validation class and reasserts the existing response contract; it does not broaden permissions, change the schema, or commit the first output.

- If repair succeeds, the operation commits once and reports one completed compaction lifecycle. Attempt-level diagnostics remain operational evidence rather than a user-visible failure followed by success.
- If repair fails, the operation reports one final failure containing the validation stage and both compactor run identifiers when available. The pending compaction remains retryable, and no raw traces, memory rows, lineage, or working-context snapshot are advanced.
- No unbounded retry loop or fallback-model selection is introduced.

## Why Generic `write_file` Is Out Of Scope

The screenshot's `write_file` error belongs to the normal Daily Assistant. Its configured tools did not include `write_file`; the agent recovered by using a `run_bash` heredoc successfully. It did not cause the compaction parser failure.

The compactor definition currently has no tools, its child run uses `autoExecuteTools: false`, and the output collector treats a tool approval request as a compaction failure. Adding `write_file` would require changes to tool configuration, approval/execution behavior, output discovery, path confinement, and cleanup. Because the compactor is launched with the parent workspace, generic file access would also expose source files to a model that has demonstrated source-task prompt confusion.

A future file-backed provider is acceptable only as a separate, least-authority design with an isolated per-operation staging directory, a single enforced output path, size limits, host validation, cleanup, and the same host-owned atomic commit.

## Persistence And Compatibility

The transient response schema remains unchanged. Existing `episodic.jsonl`, `semantic.jsonl`, schema-v1 `compaction_lineage.jsonl`, raw-trace archives, and working-context snapshots remain directly usable and are not rewritten.

New successful lineage records use `promptContractVersion: 3` because the task framing and authored prompt version change; the normal reader continues accepting immutable versions 1 and 2 alongside version 3. No response-shape compatibility parser, migration, dual read, or dual write is needed.
