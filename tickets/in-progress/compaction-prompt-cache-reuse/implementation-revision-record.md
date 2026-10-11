# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record only locates the baseline and later deltas.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer pass handoff, `design-review-report.md` round 2 | N/A (implementation note N-1 applied) | `Initial Baseline` | SR-004, ARCH-REV-002 | Implementation complete; ready for Code Review |
| IR-002 | User instruction in conversation (2026-10-11), after CRR-001 Pass | N/A | `Requirement Gap` (user-approved directly) | SR-005, ARCH-REV-002, CRR-001 | Cached summary instruction rewritten in the agent's own voice; back to Code Review |

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
