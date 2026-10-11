# Example: the draft v4 instruction applied to the Solution Designer's own conversation

Written on 2026-10-11 by the Solution Designer as the next simulated round, at the user's request ("think about how to improve the … instruction … let's do another round of testing … a simulated one … and then we check again"). It follows `cached-summary-instruction.md` draft v4, as if this conversation were compacted now. Compare with the v3 and v2 examples. Illustration only.

<compaction_summary>
## Task and constraints
- First task, Project Task `project_task_e08c9081`: native Anthropic prompt caching for the AutoByteus runtime. Finished and released in v1.4.99-beta.9.
- Current task, Project Task `project_task_1c0ac46f-8157-4a26-9085-9726326ea1a5`: "compaction-prompt-cache-reuse". At compaction, the summary request is the agent's own cached conversation request plus one appended user message, on the agent's own model.
- Constraints from this conversation:
  - the history stays append-only;
  - no compaction during a tool round;
  - the prefix guard runs before and after compaction;
  - each summary attempt uses its own conversation id `compaction_<operationId>_<attempt>`, released afterwards;
  - `retryMode: 'single_attempt'`;
  - the cached path and the fallback path share one output contract;
  - seam names stay stable for the agent-loop refactor (Project Task `project_task_0e310af7`).

## Requests and instructions received
- OPEN, user: improve the summary instruction, then run another simulated round and check again. This note is that round; it needs comparison and the user's verdict.
- OPEN, user: approve or edit the summary instruction text, now draft v4. Nothing approved yet.
- OPEN, user: confirm whether to continue with the cached approach after the cost correction. Not answered.
- OPEN, code reviewer, CRR-003:
  - F-1: Gemini fallback loses the summary prompt (Design Impact);
  - F-2: AC-003 quality gaps A and B (user decision);
  - OBS-1: whether the summary gets its own output limit;
  - CR-002: stale design-spec.md lines 254 and 352.
- OPEN, project task manager: this task lands before `project_task_0e310af7`; tell the manager when it lands.
- DONE, user: write the note like a person's handover after an hour of work, starting from the first user message, without restating my system prompt (applied in v3/v4).
- DONE, user: list every file the agent writes, with path, what it is and where it stands (applied from v2).
- DONE, user: "work out the best … summary user message … write it down so that the implementation engineer later can take it directly" (the supplement file).
- DONE, user: evaluate summary quality including continuation; added to AC-003 (SR-005).
- DONE, user (2026-10-11, to the implementation engineer): "Exactly. I think now it's much natural. Please update." This is the instruction in the agent's own voice (IR-002).
- DONE, user: "ask the implementation engineer to continue". Resume sent.
- DONE, user (2026-10-09): compaction always uses the agent's own model; a separate model "seems to be like a flexibility, but actually it's not". The compaction-model setting is removed (SR-002).

## Decisions and findings
- **Live results for the cached summary:**
  - first probe: 9,423 tokens cached vs 8,279 at full price;
  - Opus 5.5 validation: 98.58 % cache read under the strict preserved-thinking check, no 400;
  - Gemini cached path: 90.9 %;
  - desktop compaction: 99.44 %, meter correct.
- **F-1 decision:** `GeminiLLM` takes its system prompt from the leading SYSTEM run of the messages it is given, as all other adapters already do.
  - Inventory: Anthropic uses the leading SYSTEM run; the OpenAI-chat family, OpenAI Responses, Ollama, Mistral and AutoByteus render SYSTEM messages.
  - Gemini today sends `this.systemMessage` and drops SYSTEM messages.
- **F-2 cause** (histories A 464,106 tokens and B 194,548 tokens): the agent summarizes from its latest point of view.
  - Gap A: it kept its unverified claim "pre-existing / unrelated, tests verified" as fact.
  - Gap B: it dropped the early finding "Skill Improver intentionally visible", which conflicts with the later "hide it".
  - The IR-001 wording shows the same gaps.
- **Instruction design:**
  - a handover note to oneself;
  - nine headings: Task and constraints; Requests and instructions received; Decisions and findings; Unverified points and open conflicts; Files created or changed; Completed work; Current state; Open work and next steps; Essential references;
  - an evidence rule and "careful reviewer" framing;
  - from v3: start from the first user message and do not restate system instructions (v2 had restated my role and process);
  - from v4: full paths, requests marked open/done/cancelled, each point once, open items specific (the v3 note had shortened paths, mixed done and open requests, repeated one status four times, and had vague open items);
  - the parser, the transcript fallback prompt and the tests move to the nine headings together.
- **OBS-1 decision:** no separate summary output limit. The default max_tokens is now the catalog limit (128k on Opus 5.5); the risk is recorded.
- **Cost (measured, current):**
  - history A: transcript $0.08 vs cached $0.12;
  - history B: transcript $0.37 vs cached $0.10;
  - the old summarizer sends only the older part, with each item truncated to 2,000 characters;
  - the main benefit is summary quality.

## Unverified points and open conflicts
- UNVERIFIED: v4 fixes gaps A and B and keeps every other checklist item. Check: rerun AC-003 on histories A and B with v4.
- UNVERIFIED: models follow "do not restate system instructions", "full paths" and "mark open/done". Check: the new AC-003 items in that rerun.
- UNVERIFIED: the nine-heading contract parses reliably on non-Anthropic providers. Check: a Gemini live run (AC-008).
- UNVERIFIED: the Gemini fix leaves normal Gemini request content unchanged; checked by code reading only. Check: Gemini unit tests and a live run. Notes carried over by compaction would newly reach Gemini.
- UNVERIFIED: "Claude Code's compaction uses a separate user-messages section". I told the user this from memory, without a source.
- RESOLVED CONFLICT: my first estimate "$3.20 → $0.17 per compaction" is superseded by the measured costs above; the user was told.
- UNVERIFIED: these example notes were written by me, knowing what is being tested, so they are not a neutral test. Check: the AC-003 rerun with a fresh model.

## Files created or changed
- /Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/supplements/cached-summary-instruction.md — exact cached summary instruction (draft v4), rationale and validation conditions — waiting for user approval.
- /Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/supplements/example-self-summary-v4.md — this example note — done; waiting for the user's comparison.
- /Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/supplements/example-self-summary-v3.md — v3 example — superseded, kept for comparison.
- /Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/supplements/example-self-summary.md — v2 example — superseded, kept for comparison.
- /Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/requirements-doc.md — requirements, approved through SR-006 — still needs SR-007: REQ-003 nine-heading contract; AC-003 checks for file paths, system-prompt restatement, full paths and request status; Gemini fix; cost correction.
- /Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/design-spec.md — design — still needs the Gemini adapter fix, the v4 instruction and the nine-heading contract for both paths, and the CR-002 fix.
- /Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/solution-revision-record.md — revision history SR-001..SR-006 — still needs an SR-007 entry.
- /Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/investigation-notes.md — evidence — still needs the adapter inventory and the AC-003 cost facts.
- /Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/solution-handoff.md — handoff (SR-004) — still needs an SR-007 update before routing.
- /Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/probes/fork-summary-probe.mjs, fork-summary-probe-result.json, compaction-prompt.txt — feasibility probe — final, evidence only.
- /Users/normy/autobyteus_org/ticket-media/anthropic-prompt-caching/solution-designer-receipt-verification.md — receipt verification for the first task — final.
- /tmp/sd-maxtok/probe.mjs — probe showing max_tokens truncation without `content_block_stop` — final, throwaway.

## Completed work
- First task: delivered and verified; v1.4.99-beta.9 released (gh release with 17 assets; 4 workflows succeeded).
- Current task:
  - requirements SR-001..SR-006 approved by the user;
  - design ARCH-REV-001 Fail, then ARCH-REV-002 Pass;
  - implemented in commits cec24ca48, 846fff306 (merge of origin/personal e50826755), faee47a48 and 8d0a98eb5 (IR-002);
  - code review CRR-002 Pass;
  - API-REV-001 Fail at 93 % (evidence in CRR-003).
- Root cause of the write_file "Anthropic content block is incomplete" bug found by a live probe and sent to the project task manager. The fix shipped in v1.5.0 (tag ancestry checked).

## Current state
- Waiting for the user's verdict on the v4 example note and instruction, and on continuing with the cached approach. Implementation is paused at 8d0a98eb5; nothing has been routed since CRR-003.

## Open work and next steps
- Very next step: present the v4 example to the user next to v3 and get the verdict (approve v4 or name changes).
- After approval:
  - write SR-007 into requirements-doc.md, design-spec.md (including CR-002), investigation-notes.md and solution-revision-record.md;
  - update solution-handoff.md;
  - run `get_handoff_rules` and route to `/software_engineering_team/architecture_reviewer` (High).
- Then: implementation → code review → API/E2E reruns AC-003 on histories A and B with v4 → user reviews the report → delivery → tell the project task manager it landed.
- OPEN: two base-identical separate-ticket candidates from CRR-003 are not yet passed to the project task manager:
  - DEF-C: an override smaller than the maximum output hangs the run;
  - DEF-D: predefined compaction settings cannot be deleted.

  Closes when they are sent.

## Essential references
- Worktree /Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse; branch codex/compaction-prompt-cache-reuse; target origin/personal.
- Reports:
  - /Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/ac003-summary-quality-report.md
  - /Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/code-review-report.md (§ Round 3)
  - /Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/api-e2e-evidence/ac003/run-4-ir002-A/ac003-results.json (`c010`, `geminiBodies`)
- Code:
  - /Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/autobyteus-ts/src/memory/compaction/compaction-summary-prompt.ts (`COMPACTION_SUMMARY_INSTRUCTION`, `COMPACTION_SUMMARY_PROMPT`, `COMPACTION_SUMMARY_HEADINGS`)
  - /Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/autobyteus-ts/src/llm/api/gemini-llm.ts (lines 142, 182)
  - /Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/autobyteus-ts/src/llm/prompt-renderers/gemini-prompt-renderer.ts (lines 46–54)
  - /Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/autobyteus-ts/src/agent/loop/llm-phase-summary-port.ts
  - /Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/autobyteus-ts/src/agent/loop/conversation-request.ts
- Stable seams: ConversationSummaryPort, SummaryAttemptResult, SummaryRequestIdentity, LlmPhaseSummaryPort, conversationRequestKwargs, conversationRequestOptions, LLMRequestAssembler.bindRequestPrefix(tools), BaseLLM.releaseConversation(id, {signal}).
- Agent runs:
  - project task manager: project_task_manager_7c8dce0c4a8b44f88e776a83809dee03
  - implementation engineer: implementation_engineer_f9037e3d4e6a428b82f8907897e9c62f
  - code reviewer: code_reviewer_27bc694943a44dd3bcfec2c3ea5dff41
  - API/E2E engineer: api_e2e_engineer_64e031cf6eb341f393b60716cff4a42e
  - architecture reviewer: architecture_reviewer_925a92ce16934f4b9e1606a2b0436df8
- Related tasks: project_task_0e310af7 (agent-loop refactor, waiting on this task), project_task_3c6c098c (write_file fix, shipped in v1.5.0), project_task_cb40258d (Claude Agent SDK Token Meter).
- Live-test key: /Users/normy/.autobyteus/server-data/.env. Read it in-process; never print it.
</compaction_summary>
