# Example: the draft v3 instruction applied to the Solution Designer's own conversation

Written on 2026-10-11 by the Solution Designer at the user's request ("according to the new one, you create a new … summary. So we check whether this is better or not"). It follows `cached-summary-instruction.md` draft v3, as if this conversation were being compacted now. Compare with `example-self-summary.md` (v2). Illustration only.

<compaction_summary>
## Task and constraints
- First task in this conversation: Project Task `project_task_e08c9081` "anthropic-prompt-caching", native AutoByteus runtime with 0 % cache hit on Anthropic. It is finished: Terminal, verified, released in v1.4.99-beta.9.
- Current task: Project Task `project_task_1c0ac46f-8157-4a26-9085-9726326ea1a5` "compaction-prompt-cache-reuse". When compaction runs, the summary request is the agent's own cached conversation request plus one appended user message, on the agent's own model, so the history is read from the cache.
- Constraints that came up in this conversation:
  - the history stays append-only;
  - never compact in the middle of a tool round;
  - the prefix guard runs before and after compaction;
  - each summary attempt uses its own conversation id `compaction_<operationId>_<attempt>` and releases it afterwards (ARCH-REV-001);
  - `retryMode: 'single_attempt'` (ARCH-REV-001);
  - the cached and fallback paths share one output contract;
  - the seam names stay stable for the agent-loop refactor team.

## Requests and instructions received
- User (latest): "we found the problem … update it and then according to the new one, you create a new like a summary. So we check whether this is better or not." This note is that check.
- User: the v2 example restated my system prompt (role, process): "do we really need this? … the summary should have started from the user message."
- User: "use it to create one and write it to a file. I want to have a look."
- User: the note should read like a person's handover after an hour of work: "when I come back … can I continue very well?"
- User: any files the agent writes must be in the summary, with path, what it is and where it stands.
- User: "work out the best … summary user message … write it down so that the implementation engineer later can take it directly." This became `supplements/cached-summary-instruction.md`, now draft v3. **Not yet approved.**
- User: the summary "has to be evaluated … will directly influence … the continuation". This became AC-003: side-by-side comparison plus a continuation check, reviewed by the user before release.
- User, 2026-10-11, directly with the implementation engineer: "Exactly. I think now it's much natural. Please update." This approved the instruction in the agent's own voice (IR-002).
- User: "If yes, ask the implementation engineer to continue." Done.
- User, 2026-10-09: compaction always uses the agent's own model; a separate model "seems to be like a flexibility, but actually it's not". The compaction-model setting is removed.
- Code reviewer, CRR-003:
  - F-1: the Gemini fallback loses the summary prompt (Design Impact);
  - F-2: AC-003 quality gaps A and B, which need the user's decision;
  - OBS-1: whether summaries need their own output limit;
  - CR-002: stale design-spec lines 254 and 352.
- Project Task Manager: this task lands before the agent-loop refactor `project_task_0e310af7`. I must tell the PM when it lands.

## Decisions and findings
- The cached summary works live:
  - first probe: 9,423 cached tokens vs 8,279 at full price;
  - validation on Opus 5.5: 98.58 % cache read under the strict preserved-thinking check, no 400;
  - Gemini cached path: 90.9 %;
  - desktop compaction: 99.44 %, with the Token Meter correct.
- F-1:
  - Cause: `GeminiLLM` sends `this.systemMessage`, and its renderer drops SYSTEM messages, so the fallback's summary prompt is lost.
  - Every other adapter takes the system prompt from the messages: Anthropic from the leading SYSTEM run; the OpenAI-chat family, OpenAI Responses, Ollama, Mistral and AutoByteus render SYSTEM messages.
  - Decision: Gemini takes its system prompt from the leading SYSTEM run of the messages it is given.
- F-2 (histories A, 464,106 tokens, and B, 194,548 tokens):
  - The cached summary is better or equal on most checklist items.
  - Gap A: it kept the agent's unverified "pre-existing / unrelated, tests verified" claim as fact.
  - Gap B: it dropped the early "Skill Improver intentionally visible" finding, which conflicts with the later "hide it".
  - The cause is summarizing from the latest point of view; the IR-001 wording shows the same gaps.
- Instruction draft v3:
  - framed as a handover note to oneself;
  - nine headings: Task and constraints; Requests and instructions received; Decisions and findings; Unverified points and open conflicts; Files created or changed; Completed work; Current state; Open work and next steps; Essential references;
  - an evidence rule;
  - "careful reviewer" framing;
  - a "start from the first user message, do not restate system instructions" rule placed before the headings;
  - the first heading renamed to "Task and constraints" and scoped to this conversation.
- v2 → v3 cause: the v2 heading "constraints you must respect" led me to restate my role and process from the system prompt.
- The output contract changes, so the parser, the transcript fallback prompt and the tests move to the nine headings together.
- OBS-1: no separate output limit for summaries. The default max_tokens is now the catalog limit (128k on Opus 5.5); this is recorded as a risk.

## Unverified points and open conflicts
- UNVERIFIED: v3 fixes gaps A and B and keeps every other checklist item. Check: rerun AC-003 on histories A and B.
- UNVERIFIED: models follow "do not restate system instructions" reliably under v3. Check: the new AC-003 item on system-prompt restatement.
- UNVERIFIED: the nine-heading contract parses reliably on non-Anthropic providers. Check: a Gemini live run (AC-008).
- UNVERIFIED: the Gemini fix leaves normal Gemini request content unchanged. I checked this by reading the code, not live. Notes carried over by compaction would newly reach Gemini. Check: Gemini unit tests plus a live run.
- UNVERIFIED: "Claude Code's compaction uses a separate user-messages section". I told the user this from memory.
- CONFLICT (resolved, the measured figures are current): my first estimate was "$3.20 → $0.17 per compaction". Measured: $0.08 vs $0.12 (A) and $0.37 vs $0.10 (B). The old summarizer sends only the older part, truncated to 2,000 characters. The main benefit is quality, not cost. The user has been told.
- OPEN: the user has not confirmed continuing with the cached approach after the cost correction. My recommendation is yes.

## Files created or changed
- /Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/supplements/cached-summary-instruction.md — exact cached summary instruction (draft v3) and its validation conditions — waiting for user approval.
- …/compaction-prompt-cache-reuse/supplements/example-self-summary-v3.md — this example note — done.
- …/compaction-prompt-cache-reuse/supplements/example-self-summary.md — v2 example, kept for comparison — superseded by v3.
- …/compaction-prompt-cache-reuse/requirements-doc.md — requirements, approved through SR-006 — needs SR-007: REQ-003 with the nine-heading contract, AC-003 file-path and system-restatement checks, the Gemini fix, the cost correction.
- …/compaction-prompt-cache-reuse/design-spec.md — design (SR-004 plus later edits) — needs the Gemini adapter fix, the new instruction and contract for both paths, and the CR-002 fix to lines 254 and 352.
- …/compaction-prompt-cache-reuse/solution-revision-record.md — revision history SR-001..SR-006 — needs an SR-007 entry.
- …/compaction-prompt-cache-reuse/investigation-notes.md — evidence — needs the adapter inventory and the AC-003 cost facts.
- …/compaction-prompt-cache-reuse/solution-handoff.md — handoff (SR-004) — needs an SR-007 update before routing.
- …/compaction-prompt-cache-reuse/probes/fork-summary-probe.mjs, fork-summary-probe-result.json, compaction-prompt.txt — feasibility probe — final, evidence only.
- /Users/normy/autobyteus_org/ticket-media/anthropic-prompt-caching/solution-designer-receipt-verification.md — receipt verification for the first task — final.
- /tmp/sd-maxtok/probe.mjs — probe showing max_tokens truncation without `content_block_stop` — final, throwaway.

## Completed work
- First task: delivered and verified; v1.4.99-beta.9 released (gh release and 4 successful workflows checked).
- Current task:
  - requirements SR-001..SR-006 approved by the user (quotes in requirements-doc.md);
  - design reviewed: ARCH-REV-001 failed, ARCH-REV-002 passed;
  - implemented in commits cec24ca48, 846fff306 (merge of origin/personal e50826755), faee47a48 and 8d0a98eb5 (IR-002);
  - CRR-002 passed;
  - API-REV-001 failed (93 %), per the code reviewer's CRR-003.
- Root cause of the write_file "content block is incomplete" bug, confirmed live and sent to the PM. That fix shipped in v1.5.0 (tag ancestry checked).

## Current state
- I am handling CRR-003. Draft v3 and its example note are written. I am waiting for the user to approve the v3 text and to confirm the cached approach.
- Nothing has been routed since CRR-003. The implementation is paused at 8d0a98eb5 until my revised design arrives.

## Open work and next steps
- Very next step: get the user's verdict on v3 (approve or edit) and the go-ahead on the cached approach.
- Then:
  - record SR-007 in requirements-doc.md, design-spec.md (including CR-002), investigation-notes.md and solution-revision-record.md;
  - update solution-handoff.md;
  - run `get_handoff_rules` and route to `/software_engineering_team/architecture_reviewer` (High risk).
- After that: implementation → code review → API/E2E reruns AC-003 → user reviews the report → delivery. Tell the PM when it lands.
- Not yet passed to the PM as separate-ticket candidates:
  - DEF-C: an override smaller than max output hangs the run;
  - DEF-D: predefined compaction settings cannot be deleted.

## Essential references
- Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse
  - branch codex/compaction-prompt-cache-reuse; target origin/personal.
- Reports, under tickets/in-progress/compaction-prompt-cache-reuse/:
  - ac003-summary-quality-report.md;
  - code-review-report.md (§ Round 3);
  - api-e2e-evidence/ac003/run-4-ir002-A/ac003-results.json (`c010`, `geminiBodies`).
- Code:
  - autobyteus-ts/src/memory/compaction/compaction-summary-prompt.ts (`COMPACTION_SUMMARY_INSTRUCTION`, `COMPACTION_SUMMARY_PROMPT`, `COMPACTION_SUMMARY_HEADINGS`);
  - src/llm/api/gemini-llm.ts:142,182;
  - src/llm/prompt-renderers/gemini-prompt-renderer.ts:46-54;
  - src/agent/loop/llm-phase-summary-port.ts;
  - src/agent/loop/conversation-request.ts.
- Stable seams:
  - ConversationSummaryPort, SummaryAttemptResult, SummaryRequestIdentity;
  - LlmPhaseSummaryPort;
  - conversationRequestKwargs / conversationRequestOptions;
  - LLMRequestAssembler.bindRequestPrefix(tools);
  - BaseLLM.releaseConversation(id, {signal}).
- Agent runs:
  - PM: project_task_manager_7c8dce0c4a8b44f88e776a83809dee03;
  - implementation engineer: implementation_engineer_f9037e3d4e6a428b82f8907897e9c62f;
  - code reviewer: code_reviewer_27bc694943a44dd3bcfec2c3ea5dff41;
  - API/E2E engineer: api_e2e_engineer_64e031cf6eb341f393b60716cff4a42e;
  - architecture reviewer: architecture_reviewer_925a92ce16934f4b9e1606a2b0436df8.
- Related tasks:
  - 0e310af7: agent-loop refactor, waiting on this task;
  - 3c6c098c: write_file fix, shipped in v1.5.0;
  - cb40258d: Claude SDK Token Meter;
  - Gemini caching follow-up (Gemini cache-hit accounting is merged).
- Live-test key: /Users/normy/.autobyteus/server-data/.env (read in-process; never print).
</compaction_summary>
