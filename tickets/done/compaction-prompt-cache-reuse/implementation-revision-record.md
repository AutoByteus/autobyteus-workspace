# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record only locates the baseline and later deltas.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer pass handoff, `design-review-report.md` round 2 | N/A (implementation note N-1 applied) | `Initial Baseline` | SR-004, ARCH-REV-002 | Implementation complete; ready for Code Review |
| IR-002 | User instruction in conversation (2026-10-11), after CRR-001 Pass | N/A | `Requirement Gap` (user-approved directly) | SR-005, ARCH-REV-002, CRR-001 | Cached summary instruction rewritten in the agent's own voice; back to Code Review |
| IR-003 | Architecture Reviewer pass handoff, ARCH-REV-003 (SR-007) | N/A (ARCH-004 and N-1 respected) | `Solution Revision` (reviewed) | SR-007, ARCH-REV-003, CRR-002 | Nine-heading contract, instruction v4, prompt v6, Gemini `systemInstruction` from the request; back to Code Review |
| IR-004 | Architecture Reviewer pass handoff, ARCH-REV-005 (SR-009), from CRR-005 | CRR-005 F-3, F-4, F-5 | `Solution Revision` (reviewed) | SR-008, SR-009, ARCH-REV-005, CRR-004, CRR-005 | Per-model summary mode, summary output-limit override (REQ-009), instruction v5; back to Code Review |
| IR-005 | Architecture Reviewer pass handoff, ARCH-REV-006 (SR-010), from CRR-006 | CRR-006 CR-004 | `Solution Revision` (reviewed) | SR-010, ARCH-REV-006, CRR-006 | Summary output limit fitted to each request's room; both paths accept with the agent budget; back to Code Review |
| IR-006 | Architecture Reviewer pass handoff, ARCH-REV-007 (SR-011), from code-review Round 8 | F-6, F-7, F-8 | `Solution Revision` (reviewed) | SR-011, ARCH-REV-007 | Unwrapped valid summary accepted; DeepSeek cached mode final; back to Code Review |
| IR-007 | Architecture Reviewer pass handoff, ARCH-REV-008 (SR-012), from CRR-010 | F-9 | `Solution Revision` (reviewed) | SR-012, ARCH-REV-008, CRR-009, CRR-010 | Explained empty section accepted; back to Code Review |
| IR-008 | Delivery Engineer DR-001 (after base merge `fffdc5c2f`) | DR-001 | `Local Fix` | SR-012 (REQ-002 unchanged), DR-001 | New Anthropic catalog entries set to the cached summary; back to Code Review |

## Revision Entries

### IR-001 — Compaction on the agent's own model: cached summary request, transcript fallback, isolated attempts, metering, compaction-model setting removed

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/design-review-report.md`, ARCH-REV-002 (round 2, Pass).
- Triggering finding IDs: N/A. N-1 is applied: each attempt's conversation is released in a `finally` block, on its own controller with a 10 s timer, and the abort case is tested.
- Classification: `Initial Baseline`.
- Prior authoritative result: `N/A`.
- Current authoritative result: implementation complete. Local checks pass, except for documented base-identical failures.
- Related solution revision IDs: SR-004 (design); SR-005 (AC-003 requirements strengthening, carried into the handoff for API/E2E).
- Related architecture-review revision IDs: ARCH-REV-002.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: it is the first complete implementation handoff of the reviewed SR-004 design.
- Approved behavior or requirement IDs affected:
  - REQ-001..REQ-007;
  - BEH-001..BEH-004;
  - AC-001, AC-004, AC-005 (web/server), AC-006 (unit), AC-007 (unit), AC-008 (no provider branch) and AC-009, all at unit level;
  - left for API/E2E and delivery: AC-002 and AC-003 live, AC-006 live, AC-007 user check, AC-008 live on a non-Anthropic provider.
- Implementation delta: see `implementation-handoff.md` § Current Implementation Summary and § Key Files Or Areas.
- Changed files or areas:
  - autobyteus-ts: memory/compaction (summarizer, port contract, executor, configuration, instruction, execution types; the direct strategy is deleted), agent (`LlmPhase`, `llm-phase-summary-port.ts`, `conversation-request.ts`, assembler), llm (`BaseLLM.releaseConversation`, `AutobyteusLLM` override), exports;
  - server: the compaction LLM factory, the settings parser and settings entry are removed, along with the backend/provider-builder wiring;
  - web: the compaction model UI, util and i18n are removed;
  - test-support live harness;
  - tests in all three packages;
  - docs.
- Local validation and result: see `implementation-handoff.md` § Local Implementation Checks Run.
- Base update before handoff: merged `origin/personal@e50826755` (commit `846fff306`), resolved against `isTurnContinuation` and the new stream `finish`, and re-ran all suites on the merged code.
- Next recipient or routing: Code Review, because the route is Large/High (`get_handoff_rules`).
- Remaining limitations or risks: live provider validation (AC-002/003/006/008); the latest-prompt reading clears after a compaction event; a leftover setting value is listed as a generic custom setting; AC-003 strengthened in SR-005 (side-by-side comparison plus continuation check on a large real run, user review) is live API/E2E work, and the handoff gives the recipe. Details are in the handoff.

### IR-002 — Cached summary instruction rewritten in the agent's own voice

- Triggering role, report path, and round: the user, directly in conversation with the implementation engineer (2026-10-11), after CRR-001 Pass. The user reviewed the old wording (the third-person transcript prompt "You summarize the conversation history of a target agent … supplied history" plus a corrective suffix) and approved a second-person rewrite: "Exactly. I think now it's much natural. Please update."
- Triggering finding IDs: N/A.
- Classification: `Requirement Gap`, resolved by direct user approval. It changes the approved summary instruction wording; the output contract (REQ-003) is unchanged. The Solution Designer is informed so the requirements and solution records can reflect it.
- Prior authoritative result: IR-001 (CRR-001 Pass, 9.35/10).
- Current authoritative result: the instruction has been rewritten; local checks pass; returning to Code Review.
- Related solution revision IDs: SR-005 (the record update is pending with the Solution Designer).
- Related architecture-review revision IDs: ARCH-REV-002.
- Related code-review revision IDs: CRR-001.
- Related API/E2E revision IDs: N/A (API/E2E was validating IR-001 when this changed).
- Related delivery revision IDs: N/A.
- Why this implementation revision is recorded: the cached summary request is the agent summarizing its own conversation. The old prompt was written for a separate summarizer given someone else's history as text, so in the cached request it read as an unnatural role switch. Models are sensitive to that framing.
- Approved behavior or requirement IDs affected: REQ-001/REQ-003 (wording of the appended instruction); AC-003 (the comparison now uses the new wording).
- Implementation delta:
  - `COMPACTION_SUMMARY_INSTRUCTION` is now a standalone second-person request: context nearly full, the earlier conversation will be replaced by your summary, you continue from it and the recent messages only; what to keep; keep requests close to their original wording; nothing invented; no tools, do not continue the task; system instructions stay in place.
  - It ends with the same `<compaction_summary>` block and six headings as `COMPACTION_SUMMARY_PROMPT`, and states the parser's rule (bullets starting with "- " or "(none)").
  - `COMPACTION_SUMMARY_PROMPT` (hash-pinned v5) is unchanged and remains the transcript fallback prompt.
- Changed files or areas:
  - `autobyteus-ts/src/memory/compaction/compaction-summary-prompt.ts`;
  - `autobyteus-ts/tests/unit/memory/compaction-summary-prompt.test.ts` (new hash `536583bc…`; a contract test pins the instruction's block skeleton to the transcript prompt's and the headings order);
  - `autobyteus-ts/docs/agent_memory_design.md`.
- Local validation and result:
  - core production typecheck passes;
  - core memory + agent unit: 119 files, 780 tests passed;
  - summarizer, port, prompt and runtime compaction integration: 44/44;
  - server live-boundary and compaction-recovery unit: 17/17 (after `prepare:shared`).
- Next recipient or routing: Code Review (`get_handoff_rules`: updated implementation on the Large/High route returns for source review).
- Remaining limitations or risks:
  - The new wording has not been run on a real model.
  - Unrelated uncommitted API/E2E edits in `autobyteus-server-ts/tests/e2e/helpers/native-runtime-live-harness.ts` and `.../autobyteus-native-output-limit-recovery-live.e2e.test.ts` (their CR-001 work) are present in the worktree and were not touched or committed by this revision.

### IR-003 — Nine-heading contract, approved texts v4/v6, Gemini system prompt from the request

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/design-review-report.md`, ARCH-REV-003 (SR-007, Pass, Large/High). The reviewer's request: resume from paused commit `8d0a98eb5` and apply design § Intended Change 8–9.
- Triggering finding IDs: N/A. ARCH-004 is respected: no test requires the transcript fallback to cover the kept tail. N-1 (bounded release in a `finally`) is unchanged.
- Classification: `Solution Revision` (reviewed). The behavior-defining texts come from the user-approved supplement `supplements/cached-summary-instruction.md`.
- Prior authoritative result: IR-002 (CRR-002 Pass).
- Current authoritative result: implemented; local checks pass; returning to Code Review.
- Related solution revision IDs: SR-007 (REQ-003 nine headings, REQ-008, AC-003 checks, AC-010).
- Related architecture-review revision IDs: ARCH-REV-003.
- Related code-review revision IDs: CRR-002.
- Related API/E2E revision IDs: see `api-e2e-revision-record.md`. The AC-003 rerun on histories A and B and AC-010 follow this revision.
- Related delivery revision IDs: N/A.
- Why this implementation revision is recorded: SR-007 changes the shared output contract and both summary texts, and aligns Gemini with the other adapters, so the fallback prompt reaches Gemini as its system prompt.
- Approved behavior or requirement IDs affected: REQ-003, REQ-008, REQ-004 (fallback on Gemini); AC-003 (rerun), AC-010 (unit part done here).
- Implementation delta:
  - `COMPACTION_SUMMARY_HEADINGS`: nine headings, one contract and one parser for both paths. The parser's heading error states the count.
  - `COMPACTION_SUMMARY_INSTRUCTION` v4 and `COMPACTION_SUMMARY_PROMPT` v6: extracted by script from the supplement's two fenced blocks and verified byte-equal. SHA-256 values: instruction `9349dc8ea05e2bf95edb0ed5e908933487594e788b1c09fbca7eaff347e4ba82`, prompt `c3105f73f70ae7ceb43941cb617f25b57f809842875a33920ff23c046ab224f6`.
  - `GeminiLLM`: `systemInstruction` comes from `leadingSystemMessages(messages)` (non-empty contents joined with `\n`) in both config builders, for sync and stream, on Gemini API and Vertex. With no leading SYSTEM message, no key is sent.
  - Server docs: the stale strategy paragraph in `ARCHITECTURE.md` now describes the summarizer.
- Changed files or areas:
  - `autobyteus-ts/src/memory/compaction/compaction-summary-parser.ts`, `compaction-summary-prompt.ts`; `autobyteus-ts/src/llm/api/gemini-llm.ts`;
  - `autobyteus-ts/tests/unit/memory/compaction-summary-prompt.test.ts`, `tests/unit/llm/api/gemini-llm.test.ts`, `tests/integration/llm/api/gemini-llm-wire-contract.test.ts`;
  - `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-compaction-quality.e2e.test.ts`;
  - `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-server-ts/docs/ARCHITECTURE.md`.
- Local validation and result:
  - core production typecheck: pass;
  - core unit: 305 files, 1977/1977;
  - runtime compaction integration 6/6; Gemini installed-SDK wire contract 4/4;
  - server `prepare:shared` + typecheck: pass; server unit: 5232 passed, 7 skipped.
- Next recipient or routing: Code Review (`get_handoff_rules`, Large/High).
- Remaining limitations or risks:
  - The new texts have not been run on a real model here (API/E2E: AC-003 A/B rerun, AC-010 live Gemini fallback).
  - The API/E2E-owned untracked `autobyteus-server-ts/tests/e2e/runtime/autobyteus-compaction-cache-reuse-live.e2e.test.ts:220` still expects `## Goal and constraints` and needs the new first heading.
  - Accepted risks from ARCH-REV-003 still apply: OBS-1, the slightly higher cached-path cost, and the Gemini renderer dropping late system notes.
  - The uncommitted API/E2E edits (`native-runtime-live-harness.ts`, `autobyteus-native-output-limit-recovery-live.e2e.test.ts`) and the other roles' ticket docs were not touched or committed.

### IR-004 — Per-model summary mode, summary output-limit override, instruction v5

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/design-review-report.md`, ARCH-REV-005 (SR-009, Pass, Large/High). The reviewer's request: resume from `1153984ee` (IR-003) and apply design § Intended Change 10–12. Evidence: `code-review-report.md` § Round 5 (CRR-005) and `ac003-summary-quality-report.md` § Round 2.
- Triggering finding IDs: CRR-005 F-3 (small output limit blocks compaction), F-4 (instruction echo), F-5 (per-provider quality), resolved through SR-008/SR-009.
- Classification: `Solution Revision` (reviewed).
- Prior authoritative result: IR-003 (CRR-004 Pass; then API-REV-002 Fail → CRR-005).
- Current authoritative result: implemented; local checks pass; returning to Code Review.
- Related solution revision IDs: SR-008, SR-009.
- Related architecture-review revision IDs: ARCH-REV-004 (findings), ARCH-REV-005 (Pass).
- Related code-review revision IDs: CRR-004, CRR-005.
- Related API/E2E revision IDs: API-REV-002 (see `api-e2e-revision-record.md`).
- Related delivery revision IDs: N/A.
- Why this implementation revision is recorded: the cached summary becomes a per-model choice; a small known output limit no longer makes compaction impossible; the instruction no longer invites recording itself.
- Approved behavior or requirement IDs affected: REQ-002, REQ-009, REQ-001/REQ-003 (instruction wording); AC-011 (unit cases done here), AC-003 (rerun).
- Implementation delta:
  - `LLMModel.compactionSummaryMode` (default `'transcript'`). The 8 Anthropic catalog entries and the 2 DeepSeek-provider entries are `'cached_conversation'`; the DeepSeek value is pending the rerun.
  - `ConversationSummaryPort.usesCachedSummary()`, implemented by `LlmPhaseSummaryPort`; `CompactionSummarizer` skips the cached path when it is false.
  - `LLMInvocationOptions.maxOutputTokens`; `BaseLLM.resolveMaxOutputTokens(options)` with a required parameter, threaded through every adapter. Anthropic's non-streaming path checks the override first.
  - `resolveSummaryOutputTokenOverride` and `SUMMARY_OUTPUT_TOKEN_FLOOR` in the port. Both summary requests carry the override; `fitsInputBudget` reserves it.
  - `COMPACTION_SUMMARY_INSTRUCTION` v5, extracted by script from the named normative section and byte-verified. SHA-256 `43da1ce9d9df6b1a00f76d17cc146077d7d9be9699fbef83b023457f445af666`.
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas (IR-004 bullet).
- Local validation and result:
  - core production typecheck: pass;
  - core unit: 306 files, 2005/2005;
  - runtime compaction integration 6/6; Gemini wire 4/4;
  - server `prepare:shared` + typecheck: pass; server unit: 5232 passed; server compaction-related integration: 39/39.
- Next recipient or routing: Code Review (`get_handoff_rules`, Large/High).
- Remaining limitations or risks:
  - The transcript input-budget check does not reserve the override; the design names only `fitsInputBudget`. This is a reviewer/design call.
  - The DeepSeek catalog value is provisional.
  - API/E2E's uncommitted OLR-E2E-010 premise (summary `max_tokens` equal to the cut limit; cached-first mode sequence) conflicts with REQ-009/REQ-002 and needs their update.
  - The live checks (AC-011 1,024-token scenario, AC-003 v5 rerun) are API/E2E work.
  - The uncommitted API/E2E edits and the other roles' ticket docs were not touched or committed.

### IR-005 — Summary output limit fitted to each request (SR-010, CR-004)

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/design-review-report.md`, ARCH-REV-006 (SR-010, Pass). Applied on top of IR-004 (`13648b147`).
- Triggering finding IDs: CRR-006 CR-004. Under IR-004, a transcript request in the window `(context − L − margin, context − R − margin]` could overflow the context, and a cached request in that window gave up the cache.
- Classification: `Solution Revision` (reviewed).
- Prior authoritative result: IR-004.
- Current authoritative result: implemented; local checks pass; returning to Code Review.
- Related solution revision IDs: SR-010. Related architecture-review revision IDs: ARCH-REV-006. Related code-review revision IDs: CRR-006. Related API/E2E revision IDs: see `api-e2e-revision-record.md`. Related delivery revision IDs: N/A.
- Why this implementation revision is recorded: it keeps today's input acceptance and today's minimum output on both paths, while never letting input plus output exceed `context − margin`.
- Approved behavior or requirement IDs affected: REQ-009, AC-011.
- Implementation delta (local to `LlmPhaseSummaryPort`; no interface change):
  - the port holds `R` and the ceiling `L` (`resolveSummaryOutputTokenOverride`, unchanged);
  - the new private `summaryOutputLimit(E)` computes `max(R, min(L, context − E − margin))`, gives `L` for an unknown context, and gives none without an override;
  - `estimateCachedRequest` is shared by `fitsInputBudget` and the cached limit (N-2); the transcript limit uses the estimate its own check computes;
  - `fitsInputBudget` returns `E ≤ requestCapacity.inputBudget`;
  - `cachedSummaryInputBudget` is removed.
- Changed files or areas: `autobyteus-ts/src/agent/loop/llm-phase-summary-port.ts`; tests `tests/unit/agent/loop/llm-phase-summary-fitted-limit.test.ts` (new) and `tests/unit/agent/loop/llm-phase-summary-output-limit.test.ts`; `autobyteus-ts/docs/agent_memory_design.md`.
- Local validation and result:
  - core production typecheck: pass;
  - core unit: 307 files, 2017/2017;
  - runtime compaction integration: pass;
  - server `prepare:shared` + typecheck: pass; server unit: 5232 passed; server compaction integration: 39/39.
- Next recipient or routing: Code Review (`get_handoff_rules`, Large/High).
- Remaining limitations or risks:
  - `E` is an estimate (characters ÷ 4 and so on). The limit is as accurate as the existing input checks, which use the same estimator.
  - Open items owned by API/E2E: CR-001/C-020 (OLR-E2E-010), CR-003, the DeepSeek AC-003 rerun, AC-010 and AC-011 live.
  - The uncommitted API/E2E edits and the other roles' ticket docs were not touched or committed.

### IR-006 — Unwrapped valid summary accepted; DeepSeek cached mode final (SR-011)

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/design-review-report.md`, ARCH-REV-007 (SR-011, Pass). Applied on top of IR-005 (`97fd9a814`).
- Triggering finding IDs: code-review-report § Round 8, F-6, F-7, F-8.
- Classification: `Solution Revision` (reviewed).
- Prior authoritative result: IR-005 (CRR-007 Pass).
- Current authoritative result: implemented; local checks pass; returning to Code Review.
- Related solution revision IDs: SR-011. Related architecture-review revision IDs: ARCH-REV-007. Related code-review revision IDs: CRR-007, Round 8. Related API/E2E revision IDs: see `api-e2e-revision-record.md`. Related delivery revision IDs: N/A.
- Why this implementation revision is recorded: some models return a valid nine-heading summary without the envelope markers. Those replies were failed attempts; they are now accepted, while partial or repeated markers still fail.
- Approved behavior or requirement IDs affected: REQ-003 (output contract acceptance), REQ-002 (DeepSeek mode final); AC-003 (SR-011 bar).
- Implementation delta:
  - `parseCompactionSummary`: a reply with neither marker is validated as the body by the unchanged `validateCompactionSummaryBody`; all other marker handling is unchanged.
  - DeepSeek catalog entries: the "pending rerun" comment is removed; the value stays `'cached_conversation'`.
  - No prompt or instruction text changes.
- Changed files or areas: `autobyteus-ts/src/memory/compaction/compaction-summary-parser.ts`, `autobyteus-ts/src/llm/supported-model-definitions.ts`, `tests/unit/memory/compaction-summary-prompt.test.ts`, `tests/unit/memory/compaction-summarizer.test.ts`, `autobyteus-ts/docs/agent_memory_design.md`.
- Local validation and result:
  - core production typecheck: pass;
  - core unit: 307 files, 2030/2030;
  - runtime compaction integration 6/6;
  - server `prepare:shared` + typecheck: pass; server unit: 5232 passed; server compaction integration: 33/33.
- Next recipient or routing: Code Review (`get_handoff_rules`, Large/High).
- Remaining limitations or risks:
  - N-3: truncation inside the last section is undetectable without the closing marker on providers that report `'unknown'` completion (accepted, non-blocking; API/E2E to note it if seen).
  - Open items owned by API/E2E: CR-003, AC-010, the AC-003 SR-011 bar (transcript-only on Sonnet 5 and DeepSeek, histories A and B).
  - The uncommitted API/E2E edits and the other roles' ticket docs were not touched or committed.

### IR-007 — Explained empty section accepted (SR-012, F-9)

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/design-review-report.md`, ARCH-REV-008 (SR-012, Pass). Applied on top of IR-006 (`090353579`).
- Triggering finding IDs: CRR-010 F-9. Sonnet 5 writes `(none) — reason` or `(none — reason)` for the legitimately empty "Files created or changed", so its transcript summary of history B was rejected 6 of 6 times.
- Classification: `Solution Revision` (reviewed).
- Prior authoritative result: IR-006 (CRR-009 Pass).
- Current authoritative result: implemented; local checks pass; returning to Code Review.
- Related solution revision IDs: SR-012 (SR-013 is a separate pending proposal, not implemented). Related architecture-review revision IDs: ARCH-REV-008. Related code-review revision IDs: CRR-009, CRR-010. Related API/E2E revision IDs: see `api-e2e-revision-record.md`. Related delivery revision IDs: N/A.
- Why this implementation revision is recorded: it widens the empty-section rule of the shared output contract, so an explained empty section no longer blocks compaction.
- Approved behavior or requirement IDs affected: REQ-003; AC-003 (Sonnet 5 transcript-only rerun).
- Implementation delta: `EMPTY_SECTION = /^\(none(\)|[\s\u2013\u2014-])/i` is tested against the first line of each trimmed section; any other section still needs a bullet. Nothing else changes.
- Changed files or areas: `autobyteus-ts/src/memory/compaction/compaction-summary-parser.ts`, `tests/unit/memory/compaction-summary-prompt.test.ts`, `tests/unit/memory/compaction-summarizer.test.ts`, `autobyteus-ts/docs/agent_memory_design.md`.
- Local validation and result:
  - core production typecheck: pass;
  - core unit: 307 files, 2045/2045;
  - runtime compaction integration 6/6;
  - server `prepare:shared` + typecheck: pass; server unit: 5232 passed;
  - one-off check: the 3 recorded Sonnet 5 history B replies that include their text now parse.
- Next recipient or routing: Code Review (`get_handoff_rules`, Large/High).
- Remaining limitations or risks:
  - N-3 still applies.
  - A section starting with `(none)` and then listing bullets is accepted (harmless per N-4).
  - Delivery should note that the server test `native-compaction-terminal-drain.test.ts` is load-sensitive.
  - The uncommitted API/E2E edits and the other roles' ticket docs were not touched or committed.

### IR-008 — New Anthropic catalog entries use the cached summary (DR-001)

- Triggering role, report path, and round: `/software_engineering_team/delivery_engineer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/delivery-revision-record.md`, DR-001. Delivery merged `origin/personal@6314c4ee2` (merge `fffdc5c2f`), which brought in base commit `bc1777e02` adding `claude-sonnet-5-5` and `claude-haiku-5-5` without `compactionSummaryMode`.
- Triggering finding IDs: DR-001. The core unit test `per-model summary mode (REQ-002)` failed on the merged code.
- Classification: `Local Fix`. The approved REQ-002 and design § 10 already cover every Anthropic catalog model, so intended behavior does not change.
- Prior authoritative result: IR-007 (CRR-011 Pass).
- Current authoritative result: fixed; core unit 2072/2072; returning to Code Review.
- Related solution revision IDs: SR-012 (REQ-002 unchanged). Related architecture-review revision IDs: ARCH-REV-008. Related code-review revision IDs: CRR-011. Related API/E2E revision IDs: see `api-e2e-revision-record.md`. Related delivery revision IDs: DR-001.
- Why this implementation revision is recorded: the merge added catalog entries that the ticket's per-model rule must cover.
- Approved behavior or requirement IDs affected: REQ-002.
- Implementation delta: `compactionSummaryMode: 'cached_conversation'` on `claude-sonnet-5-5` and `claude-haiku-5-5`. All 10 Anthropic entries are now cached.
- Changed files or areas: `autobyteus-ts/src/llm/anthropic-supported-model-definitions.ts`; `implementation-handoff.md`. No code doc names the Anthropic models individually; they say "the Anthropic models".
- Local validation and result: core production typecheck passes; core unit 309 files, 2072/2072.
- Next recipient or routing: Code Review (`get_handoff_rules`: implementation-owned Local Fix on the Large/High route), then delivery resumes with DR-002.
- Remaining limitations or risks: AC-003 measured Opus 5.5 plus one family check (Sonnet 5). Sonnet 5.5 and Haiku 5.5 inherit the cached mode by the approved per-provider-catalog rule without their own quality run; the Solution Designer may want to note that. The delivery-owned uncommitted files (`delivery-revision-record.md`, `delivery-evidence/`) were not touched or committed.
