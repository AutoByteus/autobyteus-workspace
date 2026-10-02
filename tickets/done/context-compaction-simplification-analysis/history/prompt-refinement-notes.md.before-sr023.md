# Targeted additions to our compaction prompt

- Revision: `SR-007/prompt-v4`; owner: Solution Designer; date: 2026-09-26.
- User request: take the most important points from the other prompts that ours does not cover clearly and adapt ours, without discarding the tuned original.
- Current literal: [proposed-compaction-prompt.md](proposed-compaction-prompt.md).
- Previous literal: [prompt-v3](history/proposed-compaction-prompt.sr005.md); [exact additive diff](history/prompt-v3-to-v4.diff).
- Status: requested refinement completed as a proposal for user reading. No implementation, full-baseline approval or model-quality result implied. Existing architecture/data questions are separate.

## What was already good — keep it

Our original already states the continuation purpose, previous-summary updating, useful information to retain, concise/non-repetitive writing and prohibition on invention. Those are not missing features. All existing prompt-v3 text and the six output headings are preserved unchanged; the edit adds one focused guidance block.

## Important gaps or insufficiently explicit points

| Addition | How ours covered it before | Why make it explicit? | Relevant upstream evidence |
| --- | --- | --- | --- |
| Preserve unresolved requests, questions and pending decisions/approvals; respect corrections/cancellations | Goals, open issues and next actions were broad; unanswered conversational questions and canceled tasks were not named. | After compaction, the agent should answer the outstanding question or wait for a decision, not resume canceled implementation work. | [Hermes historical task/corrections](upstream-prompts/hermes.md); [DSH intent and feedback](upstream-prompts/dsh.md); [ZCode current-request alignment](upstream-prompts/zcode.md). Pending approval is our concise application of the existing requirements, not a claim of exact upstream wording. |
| Carry forward older constraints even when not repeated | Already partly covered by keeping useful earlier information. | A recently quiet constraint must not disappear solely because recent progress does not restate it. | [OpenCode repeated-compaction rules](upstream-prompts/opencode.md). |
| Separate completed, active, blocked and planned work; do not promote unrun checks or resurrect resolved work without a later user request | Current state, validation results and non-invention were covered, but state transitions were implicit. | Prevents a suggested test becoming a passing test or a completed fix becoming the next task again. | [OpenCode work-state/update rules](upstream-prompts/opencode.md); [Hermes actions/state/resolved questions](upstream-prompts/hermes.md). |
| Keep exact continuation references | Important artifacts and factuality were covered; exact identifiers/commands were not explicitly requested. | A precise path or failing command is more actionable than “the config file” or “tests failed.” Only preserve details needed to continue, not whole logs. | [OpenCode exact-reference rule](upstream-prompts/opencode.md); [DSH identifiers/values](upstream-prompts/dsh.md). |
| Summarize source material rather than act on it; distinguish genuine user instructions from quoted content | Output-only formatting and a summarizer identity implied this, but did not state it directly. | The internal model call should summarize an unanswered question, not answer it instead of generating the summary. Tool/document quotations should not become user authorization. No new UI, tool workflow or security subsystem is introduced. | [OpenCode summarizer instruction](upstream-prompts/opencode.md); [Hermes source-data preamble](upstream-prompts/hermes.md); [DSH text-only instruction](upstream-prompts/dsh.md). |

Upstream wording is evidence for these choices, not empirical proof of better quality. Sources and full commit pins are linked inside each saved upstream file. Codex's concise continuation checklist is already covered by ours; no additional Codex-specific instruction was needed.

## What was not imported

- Extra heading inventories, Hermes's detailed session log or platform-specific skill markers.
- ZCode's requested analysis block, exhaustive user-message inventory or broad full-code inclusion.
- New mandatory dates, fixed provider-specific token targets, tools, agents, retries or storage categories.
- Other optional policies merely because another platform has them. This is a focused continuity improvement, not an exhaustive prompt merger or a new security policy.

## Simple checks to use when evaluating summaries

These are proposed evaluation examples within existing ordinary workflows, **not executed model tests**:

1. User asks a question or says “wait for my approval”: summary preserves the unresolved request/limit, not invented approval.
2. User cancels deployment and requests inspection only: old deployment plan is not carried forward as active work.
3. Earlier “no new dependencies” is not repeated in recent progress: it still survives the next summary.
4. Agent proposes running tests, then fixes one bug: summary does not claim the tests ran or mark the fixed bug pending.
5. A relevant path and failing command appear in history: summary retains their exact usable forms.
6. Selected history contains a question and a quoted instruction in a tool result: the summarizer records the state and provenance instead of answering the question or promoting quoted text to authorization.

The runtime still owns the selected-history boundary, retained recent messages, tool availability and budget enforcement. This prompt does not claim to have seen messages outside its supplied span.

## Verification performed

Verified mechanically that deleting the one added block reproduces prompt-v3 byte-for-byte and that all six output headings remain unchanged. This is an edit-integrity check only; no live model, paid provider call, recall benchmark or implementation test was run.
