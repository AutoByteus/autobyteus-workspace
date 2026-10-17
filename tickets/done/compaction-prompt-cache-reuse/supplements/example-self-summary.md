# Example: the draft v2 instruction applied to the Solution Designer's own conversation

Written on 2026-10-11 by the Solution Designer at the user's request: "use it to create one and write it to a file. I want to have a look." It follows `cached-summary-instruction.md` (draft v2) as if this conversation were being compacted now. Illustration only; not a product artifact.

<compaction_summary>
## Goal and constraints
- Role: Solution Designer (`/software_engineering_team/solution_designer`). I own investigation, requirements, user approval, architecture design and solution revisions, and I route results via `get_handoff_rules`. I do not implement, review, test or deliver.
- Current Task: Project Task `project_task_1c0ac46f-8157-4a26-9085-9726326ea1a5`, "compaction-prompt-cache-reuse". The compaction summary request reuses the agent's cached conversation (the agent's own request + one appended user message), on the agent's own model.
- Constraints:
  - append-only history; never compact mid tool round;
  - the prefix guard runs before and after compaction;
  - every summary attempt uses its own conversation id `compaction_<op>_<n>` and releases it afterwards;
  - `retryMode: 'single_attempt'`;
  - one shared output contract for the cached and fallback paths.
- Process: a requirement change needs explicit user approval; High-risk designs go to `/software_engineering_team/architecture_reviewer`.

## Requests and instructions received
- User (latest): "use it to create one and write it to a file. I want to have a look." Apply the draft instruction to my own conversation. This is that note.
- User: asked what the appended user message will look like, and whether it works better.
- User: the summary should read like a person's note after an hour of work: "when I come back … can I continue very well?"
- User: files the agent writes are important and must be in the summary, as path, what it is, and where it stands.
- User: "work out the best … summary user message … write it down so that the implementation engineer later can take it directly." Done as `supplements/cached-summary-instruction.md`, now draft v2 with nine headings. **Not yet approved.**
- User asked whether the six fixed headings are good or limiting. I proposed adding "Requests and instructions received" and "Unverified points and open conflicts"; the files section was added after the user's file remark.
- User: "it has to be evaluated … will directly influence … the continuation." This led to the AC-003 side-by-side comparison plus the continuation check, with user review before release (SR-005).
- User (2026-10-11, directly with the implementation engineer): approved the cached instruction rewritten in the agent's own voice: "Exactly. I think now it's much natural. Please update." (IR-002, SR-006.)
- User: "If yes, ask the implementation engineer to continue". Done (resume message sent).
- User (2026-10-09): compaction should always use the agent's own model; a separate model "seems to be like a flexibility, but actually it's not". The compaction-model setting is removed (SR-002).
- Code reviewer CRR-003: F-1 (Design Impact), F-2 (Requirement Gap → user decision), OBS-1 (decide whether summaries need their own output limit), CR-002 (fix stale design-spec lines :254, :352).
- Project Task Manager: compaction lands BEFORE the agent-loop refactor `project_task_0e310af7`. Keep the seam names and shapes stable, and tell the PM when this Task lands.

## Decisions and findings
- Cached summary works live:
  - probe: 9,423 cached vs 8,279 full price;
  - validation: 98.58 % cache read on Opus 5.5 under the strict preserved-thinking check; Gemini cached path 90.9 %; desktop compaction 99.44 % with a correct meter.
- F-1 root cause: GeminiLLM uses `this.systemMessage` and its renderer drops SYSTEM messages, so the transcript fallback loses the summary prompt on Gemini.
  - Inventory: Anthropic uses the leading SYSTEM run; the OpenAI-chat family, Responses, Ollama, Mistral and AutoByteus render SYSTEM messages from the messages.
  - Decision: Gemini takes its system prompt from the leading SYSTEM run of the messages it is given. Normal Gemini requests are unchanged in content.
- F-2 (AC-003, histories A 464,106 tokens and B 194,548 tokens): the cached summary is better or equal on most items and worse on:
  - (A) it kept the agent's unverified "pre-existing / unrelated, tests verified" claim as fact;
  - (B) it dropped the early "Skill Improver intentionally visible" finding that conflicts with the later "hide it".

  The cause is the approach (summarizing from the latest point of view), not the IR-002 wording; IR-001 shows the same gaps.
- Instruction draft v2: a handover note to oneself; nine headings (added: Requests and instructions received; Unverified points and open conflicts; Files created or changed); an evidence rule; "careful reviewer" framing. The output contract changes, so the parser and the transcript prompt switch to the same nine headings.
- OBS-1: no separate summary output limit. After the incomplete-content-block fix the default max_tokens is the catalog limit (128k on Opus 5.5); recorded as a risk.
- Prior Task `project_task_e08c9081` (anthropic-prompt-caching): Terminal, verified; released v1.4.99-beta.9.

## Unverified points and open conflicts
- UNVERIFIED: draft v2 fixes gaps A and B and keeps every other checklist item. Check: rerun AC-003 on histories A and B.
- UNVERIFIED: the nine-heading contract parses reliably on non-Anthropic providers. Check: the AC-008 / Gemini live run.
- UNVERIFIED: the Gemini adapter fix leaves normal Gemini requests byte-identical. I checked by reading code, not live; post-compaction carried notes would newly reach Gemini. Check: Gemini unit tests plus a live Gemini run.
- UNVERIFIED: "Claude Code's compaction uses a separate user-messages section". I said this to the user from memory; it is not checked against a document.
- CONFLICT (resolved, measured is current): I first claimed "$3.20 → $0.17 per compaction". Measured: transcript $0.08 vs cached $0.12 (A), and $0.37 vs $0.10 (B). The old summarizer sends only the older part, truncated to 2,000 characters per item. The main benefit is quality, not cost. The user has been told.
- OPEN: the user has not yet confirmed continuing with the cached approach after the corrected cost picture. My recommendation is yes.

## Files created or changed
- /Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/supplements/cached-summary-instruction.md — exact cached summary instruction (draft v2, nine headings) plus validation conditions — waiting for user approval.
- …/compaction-prompt-cache-reuse/supplements/example-self-summary.md — this example note — done.
- …/compaction-prompt-cache-reuse/requirements-doc.md — requirements, approved through SR-006 — needs SR-007 (REQ-003 nine-heading contract, AC-003 file-path check, Gemini fix, cost correction).
- …/compaction-prompt-cache-reuse/design-spec.md — design, SR-004 plus edits — needs the Gemini adapter fix, the new instruction and contract, and CR-002 (stale lines 254 and 352).
- …/compaction-prompt-cache-reuse/solution-revision-record.md — SR-001..SR-006 plus the ARCH-REV-002 receipt — needs an SR-007 entry.
- …/compaction-prompt-cache-reuse/investigation-notes.md — evidence — needs the adapter inventory and the AC-003 cost facts.
- …/compaction-prompt-cache-reuse/solution-handoff.md — handoff (SR-004) — needs an SR-007 update before routing.
- …/compaction-prompt-cache-reuse/probes/fork-summary-probe.mjs, fork-summary-probe-result.json, compaction-prompt.txt — feasibility probe — final, evidence only.
- /Users/normy/autobyteus_org/ticket-media/anthropic-prompt-caching/solution-designer-receipt-verification.md — prior Task's receipt verification — final.
- /tmp/sd-maxtok/probe.mjs — max_tokens truncation probe (for the incomplete-content-block Task) — final, throwaway.

## Completed work
- Requirements SR-001..SR-006, approved by the user (quotes in requirements-doc.md).
- Design SR-003/SR-004; architecture review ARCH-REV-001 failed, then ARCH-REV-002 passed (report design-review-report.md).
- Implementation by the implementation engineer: commits cec24ca48, 846fff306 (merge of origin/personal e50826755), faee47a48, 8d0a98eb5 (IR-002). CRR-002 source review passed. API-REV-001 failed with 93 %, per the code reviewer's CRR-003.
- Coordination messages sent and confirmed delivered:
  - to the PM: refactor order, seams, write_file root cause;
  - to the implementation engineer: resume, merge base, AC-003 updates;
  - to API/E2E: IR-002 wording and checklist additions.

## Current state
- Handling CRR-003 (F-1, F-2, OBS-1, CR-002). Waiting for the user to approve the draft v2 instruction text and to confirm continuing with the cached approach.
- Nothing has been routed since CRR-003. The implementation is paused at 8d0a98eb5, waiting for my revised design.

## Open work and next steps
- Next step: get the user's approval of draft v2 (or their edits) and the go-ahead on the cached approach.
- Then:
  - record SR-007 in requirements-doc.md (REQ-003, AC-003 file check), design-spec.md (Gemini fix, instruction + nine-heading contract for both paths, CR-002, cost correction), investigation-notes.md and solution-revision-record.md;
  - update solution-handoff.md;
  - call `get_handoff_rules` and route to `/software_engineering_team/architecture_reviewer` (High).
- Afterwards: implementation → code review → API/E2E reruns AC-003 on histories A and B → user reviews the report → delivery. Tell the PM when it lands.
- Separate-ticket candidates from CRR-003: DEF-C (an override smaller than max output hangs the run) and DEF-D (predefined compaction settings cannot be deleted). Not yet passed to the PM.

## Essential references
- Worktree /Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse, branch codex/compaction-prompt-cache-reuse, target origin/personal.
- Reports, under tickets/in-progress/compaction-prompt-cache-reuse/: ac003-summary-quality-report.md, code-review-report.md (§ Round 3), api-e2e-evidence/ac003/run-4-ir002-A/ac003-results.json (`c010`, `geminiBodies`).
- Code locations:
  - instruction: autobyteus-ts/src/memory/compaction/compaction-summary-prompt.ts;
  - Gemini: autobyteus-ts/src/llm/api/gemini-llm.ts:142,182 and src/llm/prompt-renderers/gemini-prompt-renderer.ts:46-54;
  - port: src/agent/loop/llm-phase-summary-port.ts;
  - shared request: src/agent/loop/conversation-request.ts.
- Seams to keep stable: ConversationSummaryPort, SummaryAttemptResult, SummaryRequestIdentity, LlmPhaseSummaryPort, conversationRequestKwargs/Options, LLMRequestAssembler.bindRequestPrefix(tools), BaseLLM.releaseConversation(id, {signal}).
- Agents:
  - PM: /project_task_manager (run project_task_manager_7c8dce0c4a8b44f88e776a83809dee03);
  - implementation_engineer_f9037e3d4e6a428b82f8907897e9c62f;
  - code_reviewer_27bc694943a44dd3bcfec2c3ea5dff41;
  - api_e2e_engineer_64e031cf6eb341f393b60716cff4a42e;
  - architecture_reviewer_925a92ce16934f4b9e1606a2b0436df8.
- Related Tasks:
  - project_task_0e310af7 (agent-loop refactor, waiting on this Task);
  - project_task_3c6c098c (write_file fix, released in v1.5.0);
  - project_task_cb40258d (Claude SDK Token Meter).
- Live test key: /Users/normy/.autobyteus/server-data/.env (read in-process; never print it).
</compaction_summary>
