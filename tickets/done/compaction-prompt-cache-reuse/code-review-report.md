# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md`. SR-005 is current; the approved baseline is SR-002, and SR-005 only strengthens AC-003.
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-004)
- Supplemental Task Artifacts Reviewed As Context: `probes/` (evidence only); repository `DESIGN.md` and `TESTING.md`
- Relevant Solution Revision IDs: SR-004, SR-005
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002, Pass, with implementation note N-1)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: 2
- Review Scope: `Targeted Delta Review`
- Review Scope Evidence (round 2): IR-002 is commit `8d0a98eb5`. It changes only the `COMPACTION_SUMMARY_INSTRUCTION` literal in `compaction-summary-prompt.ts`, its unit test (`compaction-summary-prompt.test.ts`) and `agent_memory_design.md`. No spine, interface, data shape or call-site change. The summarizer, port, executor and parser are unchanged. Round-1 evidence for all other checks is carried forward.
- Trigger: IR-002 handoff from `/software_engineering_team/implementation_engineer`. The user approved the second-person instruction rewrite on 2026-10-11, recorded as SR-006.
- Prior Review Round Reviewed: round 1 (CRR-001, Pass). Latest Authoritative Round: 2.
- Relevant upstream revisions this round: SR-006 (requirements: REQ-003 wording), IR-002.
- Coverage / execution / API-E2E / delivery records: N/A (implementation review)
- Code reviewed: branch `codex/compaction-prompt-cache-reuse` (`cec24ca48` implementation, `846fff306` merge of origin/personal@`e50826755`, `faee47a48` post-merge fixes). The diff is `e50826755..HEAD`, which isolates this branch's changes after the merge.

All artifact paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/`.

## Round 13 — Implementation Review of IR-008 (CRR-013, latest; round 12 was the CRR-012 test review)

- Review Entry Point: `Implementation Review`. Review Scope: `Targeted Delta Review`.
- Trigger: IR-008 (commit `71b15db4f`, range `fffdc5c2f..71b15db4f`), an implementation-owned Local Fix requested by delivery (DR-001) after delivery's merge with `origin/personal@6314c4ee2`.
- Delivery revision record reviewed: `delivery-revision-record.md` (DR-001).
- **Change:**
  - `compactionSummaryMode: 'cached_conversation'` on `claude-sonnet-5-5` and `claude-haiku-5-5`. The base commit `bc1777e02` added these entries without the field, so they defaulted to transcript, and the ticket's catalog test caught it.
  - All 10 Anthropic entries are now cached (reviewer count: 10 of 10).
  - The handoff count is corrected.
- **Basis:** REQ-002 (SR-011) selects "the Anthropic catalog models"; enabling a model is one catalog value. So this restores approved behavior for models that arrived through the merge. It is not a behavior change.
- **Reviewer runs:**
  - core `tsc -p tsconfig.build.json`: exit 0;
  - `vitest run tests/unit/agent/loop tests/unit/llm/supported-model-definitions.test.ts tests/unit/memory/compaction-summarizer.test.ts`: 13 files, 102/102 passed. This includes the catalog-mode test.
- **Non-blocking notes:**
  - **C-022, quality basis:** AC-003 measured Opus 5.5 plus the Sonnet 5 family check. Sonnet 5.5 and Haiku 5.5 inherit the cached mode under the approved rule without their own quality run. If a cached summary fails, the transcript fallback (accepted live on Anthropic models) still applies, so this is a quality residual, not a correctness risk. It goes to the user's AC-003 review and the follow-up Task (per-model strategies). Not promoted.
  - **N-T3, cosmetic:** the catalog test title still says "(pending the rerun) DeepSeek", although DeepSeek is final since SR-011.
- **Result:** `Pass`. Scorecard unchanged at 9.35/10.

## Round 11 — Implementation Review of IR-007 (CRR-011)

- Review Entry Point: `Implementation Review`. Review Scope: `Targeted Delta Review`.
- IR-007 (`090353579..097192731`) changes one validator rule in `compaction-summary-parser.ts`, its tests and one doc line, implementing SR-012 (ARCH-REV-008 Pass) for F-9. SR-013 (the output-approach comparison) is pending the user's approval and is not implemented.
- **Rule:** a section counts as empty when the first line of the trimmed section matches `^\(none(\)|[\s–—-])` (case-insensitive). Any other section still needs a `-`/`*`/`+` bullet.
  - Accepted: `(none)`, `(None)`, `(none) — x`, `(none — x)`, `(none) - x`, `(none – x)`, and `(none)` followed by bullets.
  - Rejected: `(nonexistent…)`, a bare `none`, `none — x`, an empty section, prose, and prose ending in `(none)`.
  - Unchanged: headings, order, start-with-first-heading, marker handling, both prompts; the body is returned verbatim.
- **Fit with F-9:** the recorded round-4 Sonnet shapes are accepted on the first transcript attempt (summarizer test). The implementer also ran a one-off check that the 3 recorded B replies with stored text now parse.
- **False-accept risk:** negligible. The `(none` prefix must open the section, and all other structural checks still apply.
- **Reviewer runs:**
  - core `tsc -p tsconfig.build.json`: exit 0;
  - `vitest run tests/unit/memory tests/unit/agent` + runtime compaction integration: 122 files, 847/847 passed.
- **F-9:** resolved in code; the live Sonnet 5 B (and A) transcript-only rerun is pending.
- **Scorecard:** unchanged at 9.35/10, every category ≥ 9.0.

## Round 10 — API/E2E Failure-Origin Review of API-REV-004 (CRR-010)

- Review Entry Point: `API/E2E Failure-Origin Review`. Review Scope: `N/A`.
- Trigger: API-REV-004 **Fail / 94%** on `090353579` (IR-006).
- Reviewed:
  - `api-e2e-execution-coverage-report.md` § Round 4;
  - ledger rows 39–45;
  - `api-e2e-revision-record.md` (API-REV-004);
  - `ac003-summary-quality-report.md` § Round 4;
  - `api-e2e-evidence/round4/`. I re-read `ac003-sonnet-tonly-B/ac003-results.json` myself: all 3 attempts are `complete`, each rejected only because the "Files created or changed" section is `(none) — this has been a read-only investigation…` or `(none — this has been a read-only investigation…)`. The run-1 file records 3 more unparsed `complete` attempts.
- **Met the SR-011 bar:**
  - transcript-only Opus, Gemini and DeepSeek on A and B, and Sonnet on A: accepted on attempt 1. The unwrapped DeepSeek A and Sonnet A replies are accepted thanks to F-6.
  - cached notes: Opus 96.4–96.7%; Sonnet 5 96.6% and 97.4%; DeepSeek 96.7% with the 15,000 limit.
  - the 1,024 real-provider scenario 3/3; no echo; no Gemini regression; N-3 not observed.
- **Environment:**
  - AC-010 on the Gemini API key: 429 again (quota).
  - One load-timing failure in the server test `native-compaction-terminal-drain.test.ts` while four model harnesses ran in parallel. It passed 5/5 in isolation and in a full rerun on an idle machine. Recorded as a load-sensitivity residual for delivery's final run; no source origin.

### F-9 — The parser rejects a `(none)` with an explanation, so Sonnet 5's transcript summary of history B is never accepted → `Design Impact` (summary parse contract / wording)

- Scenario: Supported Normal Scenario. The transcript summary is the fallback for cached models, including Sonnet 5 (REQ-004), and the only path for transcript models. History B is a read-only investigation, so "Files created or changed" is legitimately empty.
- Path: `validateCompactionSummaryBody` accepts a section only if it is exactly `(none)` or contains a `-`/`*`/`+` bullet. That rule is unchanged since before the ticket. Sonnet writes `(none) — <reason>` or `(none — <reason>)`, so the reply is rejected 6 of 6 times, and on that path compaction blocks.
- Origin: the contract and the content no longer fit together. SR-007 added "Files created or changed", which is often legitimately empty, and an explained empty is natural model output for it. The strict bare-`(none)` rule and the v6 wording ("Write "(none)" only when…") did not anticipate that. Not an implementation defect: the code implements REQ-003 exactly. Not reasonably detectable in source review (model behavior).
- Options for the Solution Designer:
  - (a) a parser rule accepting a section whose first line starts with `(none` (`(none)` plus optional explanation on the same line, or `(none — …)`), with nothing else that looks like a bullet. This is a parse-contract change (REQ-003) with low false-accept risk.
  - (b) wording ("write exactly `(none)` on its own line"). Text changes need user approval and a rerun, and model adherence varies.
  - (a) is the more robust option, given F-6's experience with models drifting from formatting instructions. Rerun Sonnet B transcript-only afterwards.

### Routing

- F-9 `Design Impact` → `/software_engineering_team/solution_designer`. No implementation defect at `090353579`.
- The durable test changes (including this round's `expectStrictWhenThinking` and the CCR-E2E-001 rename) are reviewed after a passing run.

## Round 9 — Implementation Review of IR-006 (CRR-009)

- Review Entry Point: `Implementation Review`. Round 9.
- Review Scope: `Targeted Delta Review`. IR-006 (`97fd9a814..090353579`) changes:
  - `parseCompactionSummary` (one added branch);
  - two catalog comments;
  - parser and summarizer tests;
  - `agent_memory_design.md`.

  There is no interface, spine or prompt change. Round-7 evidence for everything else is carried forward.
- Trigger: IR-006, implementing SR-011 (ARCH-REV-007 Pass), which resolves CRR-008 F-6 (parser), F-7 and F-8. F-7 and F-8 were decided by the user (delegated in SR-011): DeepSeek and Sonnet 5 keep the cached summary; gap A goes to follow-up Task `project_task_9bf18aea…`.

### Checks

- **REQ-003 (SR-011) acceptance:** a reply with **neither** marker goes to the unchanged `validateCompactionSummaryBody`. It must:
  - be non-empty after trimming;
  - start with the first heading;
  - have exactly the nine headings in order;
  - have a bullet or `(none)` in every section.

  A reply with only one marker, markers out of order, or two blocks still fails. A preamble or a code fence fails because the body must start with the first heading. A wrapped reply follows the unchanged path.
- **Summarizer order unchanged:** tool calls and `incomplete` completion are rejected before parsing. Tests cover an `incomplete` unwrapped valid reply (rejected on all 3 attempts) and a valid body that came with tool calls (rejected).
- **Callers:** the summarizer and the test-support harness only, so the contract change reaches exactly the intended paths.
- **False-accept risk:** an off-task answer would have to reproduce all nine exact headings in order with bullets, which is not credible. N-3 (truncation without a closing marker on a provider that reports `unknown` completion) is accepted by ARCH-REV-007: it is bounded to the last section, and not established as reachable. No promotion.
- **Catalog:** DeepSeek stays `cached_conversation` (final, per SR-011). Gemini and all other models stay transcript, as the catalog test pins.
- **Reviewer runs:**
  - core `tsc -p tsconfig.build.json`: exit 0;
  - `vitest run tests/unit/memory tests/unit/agent tests/unit/llm` + runtime compaction integration: 194 files, 1357/1357 passed.

### Prior findings

- **F-6:** resolved in code (parser). The live AC-003 SR-011 bar is still pending: Sonnet 5 and DeepSeek transcript-only runs on A and B, each accepted within 3 attempts.
- **F-7, F-8:** resolved by requirement decision (SR-011).
- **CR-001 (C-020), CR-003:** pending the post-API/E2E test review.

### Scorecard (round 9)

9.35/10, unchanged:
- Runtime Correctness 9.0 (the live SR-011 bar is pending);
- API/E2E Readiness 9.0;
- Cleanup 9.0;
- every other category 9.5.

## Round 8 — API/E2E Failure-Origin Review of API-REV-003 (CRR-008)

- Review Entry Point: `API/E2E Failure-Origin Review`. Review Scope: `N/A`.
- Trigger: API-REV-003 **Fail / 92%** on `97fd9a814` (IR-004/IR-005). `dist` was verified against HEAD (v5 `43da1ce9`, v6 `c3105f73`).
- Reviewed:
  - `api-e2e-execution-coverage-report.md` § Round 3;
  - `api-e2e-test-case-ledger.md` rows 31–38;
  - `api-e2e-revision-record.md` (API-REV-003);
  - `ac003-summary-quality-report.md` § Round 3;
  - `api-e2e-evidence/round3/`.

  I re-read the `transcriptAttempts` records myself:
  - Sonnet A and B: 6/6 attempts complete, marker absent, not parsed;
  - Sonnet with the v5 base prompt on A: 3/3 marker present (rejected only because the current parser expects nine headings);
  - DeepSeek A: 3/3 marker absent; DeepSeek B: 1/1 parsed.
- ID note: API/E2E's "F-5" in round 3 is recorded here as **F-6**, so the round-5 F-5 (per-provider quality) keeps its ID.
- **Resolved:**
  - F-3: live. AC-011: the 1,024 real-provider scenario passes 3/3; CCR-E2E-004 has L_eff 16,384 on the wire, 96.9% cache, strict accepted; OLR-E2E-010 has 15,000 = ctx÷4.
  - F-4: Gemini is transcript-only, with no echo.
  - CR-004: live via OLR-E2E-010 and CCR-E2E-004.
  - C-020: OLR-E2E-010 is re-scoped.
  - AC-003 v5 on Opus: gap A is fixed, so Opus keeps the cached summary.
- **Environment:** AC-010 on the Gemini API key is still quota-blocked (429); Vertex passed. Residual risk, not a code origin.

### F-6 — The v6 transcript prompt loses the `<compaction_summary>` envelope on some models → `Design Impact` (normative wording / parser contract)

- Scenario: Supported Normal Scenario. The transcript summary is the **only** path for every non-cached model (REQ-002) and the fallback for cached ones (REQ-004).
- Evidence:
  - Sonnet 5 transcript: 0/8 parsed. Each reply was a complete nine-heading summary without the markers.
  - DeepSeek: 3/9 parsed across rounds 2–3. History A failed all 4 round-3 attempts, so compaction would block there.
  - Opus and Gemini always keep the markers.
  - Control: the same Sonnet runs with the pre-ticket v5 prompt (`e50826755`) kept the markers 3/3.
- Origin: a regression from the SR-007 normative prompt v6 (`supplements/cached-summary-instruction.md`), not from the implementation. The code sends v6 byte-exactly, and the parser is unchanged.
  - The likely mechanism, from a text diff: v6 puts a nine-item per-heading guidance list between "using the markers below" and the block. The block then reads as a heading template, and the envelope instruction is weakened.
- Not reasonably detectable in source review. CRR-004 verified the textual contract (the block is present, the headings are in order); model adherence is a runtime outcome.
- Response options (Solution Designer, with user approval of any text change):
  - (a) restate the envelope rule immediately before or after the block (for example "Wrap the summary in `<compaction_summary>` … `</compaction_summary>`; replies without these markers are rejected"), or move the per-heading guidance after the block;
  - (b) a parser rule accepting a reply whose body is exactly the nine headings in order with no markers. That changes the parse contract for both paths; weigh it against false accepts;
  - rerun on Sonnet and DeepSeek, histories A and B.

### F-7 — DeepSeek fails the REQ-002 cached-mode gate, and its transcript path is unreliable until F-6 is fixed → `Requirement Gap` / design decision

- Paths pass, but gap A fails in 2 of 3 samples: the note and its continuation state "unrelated failures" as fact.
- Under REQ-002 DeepSeek should drop to the transcript path, but that path parses only 3/9 for DeepSeek (F-6). Either choice currently risks blocked compactions or a known quality gap. The Solution Designer and the user decide, ideally after the F-6 fix and a DeepSeek transcript rerun.

### F-8 — The Anthropic family check (Sonnet 5) is inconclusive and shows gap A on the cached path → `Requirement Gap`

- REQ-002 enables `cached_conversation` for **all** Anthropic catalog models, based on Opus evidence plus "one other Anthropic model (family check)".
- The Sonnet 5 cached note parses 2/2 but shows gap A: "Completed work" claims the full suite was "executed … confirmed" though it timed out, and the continuation calls the failures "unrelated … not blockers". There is no valid transcript baseline to compare against because of F-6.
- Whether the family-wide enablement stands, or is narrowed per model, is a user decision to be made after the F-6 rerun.

### Routing

- F-6 `Design Impact`, and F-7 and F-8 `Requirement Gap`, all go to `/software_engineering_team/solution_designer`.
- No implementation defect at `97fd9a814`. Source structure stands as in CRR-007.
- The durable test changes are reviewed after a passing run: CCR-E2E-003 transcript-only, the new CCR-E2E-004, re-scoped OLR-E2E-010 with the settings reset, the harness `summaryRequestMode` and `assertNoInstructionEcho`.

## Round 7 — Implementation Review of IR-005 (CRR-007)

- Review Entry Point: `Implementation Review`. Round 7.
- Review Scope: `Targeted Delta Review`. IR-005 (`13648b147..97fd9a814`) changes only `agent/loop/llm-phase-summary-port.ts` (the CR-004 behavior), its two unit-test files and `agent_memory_design.md`. There is no interface, summarizer, adapter or data-shape change. Round-6 evidence for everything else is carried forward.
- Trigger: IR-005, implementing SR-010 (design § 11 "Fitted to each request" and "Budget"), ARCH-REV-006 Pass.

### CR-004 recheck

- **Rule:** `summaryOutputLimit(E)` = `null` without an override; `L` when the context is unknown; otherwise `max(R, min(L, ctx − E − margin))`. This matches design § 11 (SR-010) exactly.
- **Applied to both paths:**
  - the transcript request uses the same `estimate` as its unchanged input check;
  - the cached request uses `estimateCachedRequest` (messages + instruction + tool schemas), the same function `fitsInputBudget` uses (N-2). It works on the unsanitized messages, which are never smaller than what is sent, so the accept decision and the limit see the identical `E`.
- **Invariant holds:** acceptance is `E ≤ inputBudget = min(ctx − R, cap) − margin`, so `room ≥ R` and input plus output stays within `ctx − margin` whenever `L_eff > R`. That is the same tolerance as the agent's own requests. No input that the code before IR-004 accepted is now rejected, and every accepted request sends at least `R`.
- **Removed:** `cachedSummaryInputBudget`, the "reserve L" budget. No dead code is left.
- **Boundary rows match the design's table** (margin 256): Ollama 8k with E 4,000 → 2,048, 6,500 → 1,436, 6,912 → 1,024, 7,000 → `input_budget_exceeded` with no provider call; Ollama 32k with E 26,000 → 6,512; Opus at E 990,000 → accepted against 998,720, sends 9,744; the cached accept boundary at 6,912/6,913; tool schemas affect both the decision and the limit; unknown context sends L; no override sends no `maxOutputTokens`.
- **Reviewer runs:**
  - core `tsc -p tsconfig.build.json`: exit 0;
  - `vitest run tests/unit/agent tests/unit/memory tests/unit/llm` + runtime compaction integration: 194 files, 1344/1344 passed.
- **Result: CR-004 resolved.**

### Scorecard (round 7)

9.35/10. Runtime Correctness is back to 9.0: the CR-004 invariant is now proven at unit level; the live AC-011, DeepSeek AC-003 and F-4 checks are pending. API/E2E Readiness and Cleanup stay at 9.0 (CR-001/C-020 and CR-003 are open in API/E2E). All other categories are 9.5.

## Round 6 — Implementation Review of IR-004 (CRR-006)

- Review Entry Point: `Implementation Review`. Round 6.
- Review Scope: `Full Re-Audit`. IR-004 changes shared interfaces and data shapes:
  - `LLMInvocationOptions.maxOutputTokens`;
  - the `BaseLLM.resolveMaxOutputTokens(options)` signature, threaded through six adapters;
  - the `LLMModel.compactionSummaryMode` field and catalog values;
  - the `ConversationSummaryPort.usesCachedSummary()` method.

  Evidence for unchanged files is carried forward from rounds 1, 2 and 4.
- Trigger: IR-004 (commit `13648b147`; range `1153984ee..13648b147`), implementing SR-008/SR-009, design § Intended Change 10–12, ARCH-REV-005 Pass.
- Upstream: `requirements-doc.md` SR-009 (REQ-002, REQ-009, AC-011; user delegation 2026-10-11); `design-spec.md` § 10–12; `supplements/cached-summary-instruction.md` (v5 normative).

### Basis confirmation

| Change | Status | Evidence |
| --- | --- | --- |
| § 10 per-model summary mode (REQ-002) | Confirmed | `LLMModel.compactionSummaryMode` defaults to `'transcript'`. The 8 Anthropic entries and the 2 DeepSeek-provider entries set `'cached_conversation'`; DeepSeek is commented "pending rerun", as the design says (API/E2E confirms or returns it). `CompactionSummarizer` checks `port.usesCachedSummary()` before the budget. No provider name appears in memory or agent code. |
| § 11 output-limit override (REQ-009) | Confirmed for the rule, the plumbing and the cached-path budget | `resolveSummaryOutputTokenOverride` implements the REQ-009 formula exactly (null, or ≥ 16,384 → none; otherwise max(R, min(16,384, model max, ⌊ctx/4⌋))). `BaseLLM.resolveMaxOutputTokens(options)` is required, and every adapter caller passes options (Anthropic stream and non-stream, OpenAI Responses, OpenAI-compatible including LM Studio, DeepSeek and Qwen, Gemini both builders, Mistral, Ollama). The agent's own requests never set it. `fitsInputBudget` reserves L. Anthropic budget thinking is safe: the budget comes from `extraParams` and stays below R, which is at most L. |
| § 12 instruction v5 | Confirmed | Reviewer byte check: the module literal equals the supplement block at line 168 ("Cached summary instruction v5 — normative text"), SHA-256 `43da1ce9…`; the v6 prompt is unchanged (`c3105f73…`). |

Reviewer runs:
- core `tsc -p tsconfig.build.json`: exit 0;
- `vitest run tests/unit/agent tests/unit/memory tests/unit/llm` + runtime compaction integration + Gemini wire contract: 1336/1336 passed.

### Candidate gate (round 6)

| Candidate | Observation | Scenario / Contract | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C-018 | The transcript request's input check still reserves the agent's R, but the request is sent with output limit L > R | REQ-009 ("no model may lose today's behavior"); AC-011 worked examples (Ollama `maxTokens` 1,024 with `num_ctx` 8,192 → L 2,048; with 32,768 → L 8,192). Ollama and other dynamic models use the **transcript** path only (REQ-002), so this path is the only one where those approved worked examples apply. | **Promote → CR-004** | Input up to `ctx − R − margin` plus output L exceeds the context whenever L − R > margin. The overflow window is about 1,024 tokens at 8k and about 7,168 tokens at 32k, inside the range where compaction runs (trigger at 80%, or above after a large tool result). Before IR-004 the same transcript request fit, because it used L = R. Consequence: a context-length rejection (OpenAI-compatible / LM Studio) or prompt truncation (Ollama), so the summary fails and compaction blocks. That is the dead end REQ-009 is meant to remove, on models that worked before. |
| C-019 | `AutobyteusLLM` does not read `resolveMaxOutputTokens`, so the override has no effect for RPA models | REQ-009 | Reject (out of scope) | It never applied the agent's output limit through the shared resolver; the design names only the adapters that do. Not a regression. |
| C-020 | OLR-E2E-010 (uncommitted, API/E2E) asserts summary `max_tokens == SUMMARY_CUT_LIMIT` and a cached-first sequence | REQ-009, REQ-002 | Promote (API/E2E-owned; folded into CR-001) | Must be updated to the new rule and modes, or re-scoped. It is checked in the post-API/E2E test review. |
| C-021 | The DeepSeek catalog sets `cached_conversation` before the rerun | REQ-002 ("if the v5 rerun shows…") | Reject (design-sanctioned) | Design § 10 makes API/E2E confirm or return it. It is tracked as an AC-003 gate item. |

### CR-004 — The transcript summary request can exceed the context when the output override applies (Medium; `Design Impact` → Solution Designer)

- Protected authority: REQ-009 ("A small known output limit must not make compaction impossible, and no model may lose today's behavior"); AC-011 (Ollama worked examples).
- Evidence:
  - `LlmPhaseSummaryPort.requestTranscriptSummary` checks `estimateMessagesTokens(messages) > capacity.inputBudget`, where `inputBudget = min(ctx − R, provider cap) − margin` (`token-budget.ts`). It then sends with `withOutputLimit(...)`, i.e. `maxOutputTokens = L`.
  - The cached path's `fitsInputBudget` reserves L (`cachedSummaryInputBudget`); the transcript path does not.
  - Design § 11 "Budget" names only `fitsInputBudget`. The implementer followed the design and flagged this in handoff § Important Assumptions.
- Scenario: Supported Explicit Edge, taken from the design's own worked examples. A local small-context model (Ollama or LM Studio) with an explicit `max_tokens` below 16,384 reaches compaction. These models are always on the transcript path. Whenever the transcript estimate falls in `(ctx − L − margin, ctx − R − margin]`, input plus output exceeds the context. Before IR-004 that request fit.
- Why it is a design decision, not a local fix: reserving L in the check (the implementer's one-line option) turns those cases into `input_budget_exceeded`, which also blocks compaction. A non-regressing rule would instead clamp the override to the room available, for example `L_eff = max(R, min(L, ctx − estimatedInput − margin))` for the transcript request (and equally for the cached one). The Solution Designer should pick the rule and update design § 11 and AC-011; implementation then follows.

### Structural re-audit (changed files)

| Check | Result | Evidence |
| --- | --- | --- |
| Ownership and boundaries | Pass | The model owns its summary mode (as with `defaultCompactionRatio`). The port owns the summary output rule. Adapters only honor a provider-neutral option. Memory and agent name no provider. |
| Interface clarity | Pass | `maxOutputTokens` is documented as per-call and never set by agent requests. The required `options` parameter forces every adapter to thread it. |
| Shared-structure tightness | Pass | One field, one literal union, one port method |
| Dead code / legacy | Pass | The removed `resolveMaxOutputTokens()` no-argument form has no callers left. The v4 text is kept only as history in the supplement, not in code. |
| Tests | Pass | Every worked example; the Anthropic wire check at 1,024 (summary 16,384 with an equal prefix and cache_control; agent request 1,024); the per-adapter override for sync and stream; the transcript-only summarizer branch; catalog modes; the runtime integration through the real `LlmPhase` |
| Correctness | **Fail → CR-004** | See above |

### Scorecard (round 6, re-audited)

Overall 9.25/10. The decision follows CR-004.

| Category | Score | Note |
| --- | --- | --- |
| Data-flow | 9.5 | — |
| Ownership | 9.5 | — |
| API | 9.5 | — |
| Separation of concerns | 9.5 | — |
| Data-model | 9.5 | — |
| Naming | 9.5 | — |
| API/E2E Readiness | 9.0 | OLR-E2E-010 is in conflict (C-020); the DeepSeek rerun is pending |
| **Runtime Correctness** | **8.5** | CR-004: the transcript-path context overflow on small-context models with a configured limit |
| No legacy | 9.5 | — |
| Cleanup | 9.0 | CR-001 and C-020 are open in API/E2E |

## Round 5 — API/E2E Failure-Origin Review of API-REV-002 (CRR-005)

- Review Entry Point: `API/E2E Failure-Origin Review`. Review Scope: `N/A`. The scorecard is not repeated.
- Trigger: `/software_engineering_team/api_e2e_engineer` API-REV-002, **Fail / 93%**, on `1153984ee` (IR-003). The `autobyteus-ts/dist` the server uses was checked against HEAD, and both texts were confirmed byte-equal to the supplement.
- Reviewed:
  - `api-e2e-execution-coverage-report.md` § Round 2;
  - `api-e2e-test-case-ledger.md` rows 18–30;
  - `api-e2e-revision-record.md` (API-REV-002);
  - `ac003-summary-quality-report.md` § Round 2 and § Per-provider judgment;
  - `api-e2e-evidence/round2/` (`real-e2e-deepseek-compaction.log`: 3× `COMPACTION_BLOCKED`, 2× `incomplete_summary`, 2× `LIVE_E2E_COMPACTION_FLOW_TIMEOUT`; the 4,096 probe log; `live-ccr-r1`, `live-ccr-r2-gemini`).
- **Resolved:**
  - F-1 (AC-010): verified live on Vertex Express. The transcript `systemInstruction` equals `COMPACTION_SUMMARY_PROMPT`; normal and cached requests carry the agent prompt.
  - F-2 (Opus): weakness B is fixed; weakness A is fixed in the continuation.
  - CR-003: fixed in the durable test.
- **Environment limit (not a code origin):** the Gemini API key returned 429 `RESOURCE_EXHAUSTED` on every request (the project's quota). The `api_key` runtime is covered at request-body level by the unit tests (`gemini-llm.test.ts` API × sync/stream) and live by the same adapter code on Vertex Express. Residual risk, owned by API/E2E or delivery for a later run.

### F-3 — An agent with an explicit small output limit can never compact → `Design Impact` (reclassifies accepted risk OBS-1)

- Scenario: Supported Explicit Edge Scenario. A user sets the agent's `max_tokens` in the model config (a supported surface). The product supports and tests small output limits (OLR suite, 400–1,200), and the repository's own real-provider scenario configures `max_tokens: 1_024` (`test-support/live-e2e/live-e2e-harness.ts:762`).
- Path: the summary request inherits the agent's `max_tokens` (REQ-001 "same LLM settings"; design OBS-1). The nine-heading note does not fit in 1,024 tokens on either path: 5 of 5 attempts were `length` / `incomplete`, ending in `COMPACTION_BLOCKED`. Every retry hits the same limit, so the agent cannot compact again until the user raises the limit. With 4,096 it passes 3/3, with the cached note accepted on the first attempt.
- Before this ticket, the separate compaction LLM had its own limit (default 8,192, capped by the model), so such agents compacted fine. The six-heading summary also fit in 1,024. This is a reachable regression with a severe consequence for that configuration.
- Origin: the design accepted OBS-1 on the premise that only "a very small agent-configured limit" is affected. The evidence shows the threshold is an ordinary configured value, made worse by the longer nine-heading format. This is a design premise, not an implementation defect: the code implements the approved "same settings" rule.
- Options for the Solution Designer (the choice changes REQ-001's "same LLM settings", so the user must approve):
  - (a) give summary requests an output-limit floor, for example `max(agent max_tokens, N)`. On Anthropic `max_tokens` is not part of the cached prefix; confirm per provider.
  - (b) keep the accepted risk, raise the fixture, and give users a clear blocked-compaction message that names the limit.
  - (c) a shorter format for small limits.
  - The fixture change alone (option b without a product response) would hide a real user-facing dead end.

### F-4 — The cached note can record the compaction instruction itself as an open user request → `Design Impact` (instruction wording; user-approved text)

- Evidence: in 2 of 3 live Gemini runs, the note's "Requests and instructions received" lists `User: "Your context window is nearly full…" (open - responding now)` (`round2/live-ccr-r1/calls-full.json` call 55; `round2/live-ccr-r2-gemini/`). Opus did this 0 of 6 times. The line persists in the compacted context, so after compaction the agent sees a phantom open request.
- Origin: the instruction is appended as a user message inside the conversation it asks to summarize ("starting from the first user message … latest first"). v4 does not exclude itself. This is a wording-level design gap in the user-approved supplement, not an implementation defect.
- Response for the Solution Designer and the user: one exclusion sentence (for example, "this request to write the note is not part of the work; do not record it"), plus a rerun. The durable assertion `assertNoInstructionEcho`, which makes CCR-E2E-003 fail intermittently today, is correct and should stay.

### F-5 — Per-provider quality → `Requirement Gap` (user decision under AC-003 / AC-008)

- Opus: the cached note is clearly better. Residuals: one point stated both as a finding and as unverified; one class name not in the history (`FileAgentDefinitionProvider`).
- DeepSeek: equal or better and parses more reliably (4/4 vs 2/3). One wrong path in B (missing `autobyteus_org/`); weakness A recurred in 1 of 2 samples.
- Gemini: **not better.** The continuations were equivalent. The note drops open doubts and commit hashes (A) and an earlier user decision (B), which the transcript summary kept. Plus F-4.
- REQ-002 / AC-008 require one provider-neutral path. Whether to accept Gemini at "equal continuation, thinner note", or change the instruction for all providers (no provider branch), is a user decision presented by the Solution Designer. The AC-003 report § Round 2 is ready for that review.

### Origin summary and routing

- No implementation defect was found at `1153984ee`. The code implements SR-007 as reviewed (CRR-004 stands for source structure).
- F-3 and F-4 are **Design Impact**; F-5 is a **Requirement Gap**. All route to `/software_engineering_team/solution_designer`. Any wording or limit change needs user approval, then returns through implementation, source review and API/E2E.
- Review gap check: F-3 was raised as OBS-1 in CRR-003 and accepted by the design, so it was not missed. F-4 and F-5 are model-behavior outcomes, not detectable in source review.
- Durable test changes are reviewed in the post-API/E2E test review after a passing run: the harness `summaryRequestMode` narrowing, `assertNoInstructionEcho`, CR-003, and OLR-E2E-010 (CR-001).

## Round 4 — Implementation Review of IR-003 (CRR-004)

- Review Entry Point: `Implementation Review`. Round 4.
- Review Scope: `Full Re-Audit`. IR-003 changes a shared contract (the summary heading list used by both prompts and the parser) and a provider adapter's request construction (Gemini `systemInstruction` for every request). The structural checks were re-run on the changed files. Evidence for the unchanged files (summarizer, port, executor, assembler, release, metering, settings removal) is carried forward from rounds 1–2, because their code is unchanged since `8d0a98eb5`.
- Trigger: IR-003 (commit `1153984ee`; range `8d0a98eb5..1153984ee`), implementing SR-007, design § Intended Change 8–9, ARCH-REV-003 Pass.
- Upstream: `requirements-doc.md` SR-007; `design-spec.md` SR-007; `supplements/cached-summary-instruction.md` (user-approved 2026-10-11, instruction v4 and prompt v6); ARCH-REV-003.

### Basis confirmation

| Behavior / Change | Status | Evidence |
| --- | --- | --- |
| F-1 fix: Gemini takes `systemInstruction` from the request's leading SYSTEM run (design § 9) | Confirmed | `gemini-llm.ts` `systemInstructionOf(messages)` = `leadingSystemMessages` non-empty contents joined with `\n`. Used by both config builders (3.8 and older), so sync, stream, API and Vertex are all covered. No key is sent when the request has no leading SYSTEM message. The renderer still skips SYSTEM messages. Production callers checked: `LlmPhase` (the working context leads with `processedSystemPrompt ?? config.systemMessage`, the same text as the bootstrap `configureSystemPrompt`); the summary port (cached: the agent's leading run; transcript: `COMPACTION_SUMMARY_PROMPT`); `BaseLLM.send/streamUserMessage` (they add `buildSystemMessage()`). No production caller relied on the configured fallback without a SYSTEM message. Other adapters comply, per the inventory in `investigation-notes.md:103+`; `grok-llm.ts` only copies the config. |
| F-2 change: the nine-heading contract and the approved texts (design § 8) | Confirmed | `COMPACTION_SUMMARY_HEADINGS` matches design § 8 exactly; the parser rules are unchanged. **Reviewer byte check:** both fenced blocks of the supplement were extracted and compared with the module literals. The instruction equals block 1 and the prompt equals block 2 (SHA-256 prefixes `9349dc8e`, `c3105f73`). |
| Persisted data | Confirmed `Not Affected` | `rg`: `parseCompactionSummary` / `validateCompactionSummaryBody` run only on newly generated replies (summarizer, executor, test-support harness). Stored six-heading summaries are never re-parsed, matching design § Persisted Data line 165. |
| OBS-1 | Accepted risk | Design line 442: the agent's `max_tokens` defaults to the catalog output limit; no separate summary limit. Not a finding. |

### Candidate gate (round 4)

| Candidate | Observation | Basis | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C-014 | Gemini normal requests now also carry system notes moved to the front by compaction | Design § 9 ("accepted"), REQ-008 | Reject (approved change) | Consistent with Anthropic. Normal-request text is otherwise unchanged (the "normal agent request keeps the same systemInstruction text" test). |
| C-015 | Requests with no leading SYSTEM message lose Gemini's former default `systemInstruction` (the configured text or "You are a helpful assistant.") | Production callers | Reject (Not Reachable in product) | Every production path supplies a leading SYSTEM message (callers above). |
| C-016 | The untracked API/E2E test `autobyteus-compaction-cache-reuse-live.e2e.test.ts:220` still expects `## Goal and constraints` | AC-002/003 live coverage | Promote (Low, API/E2E-owned) | CR-003. That test fails against the nine-heading contract until it is updated. |
| C-017 | v6 and v4 quality versus the AC-003 checklist (including the earlier C-012) | AC-003 / SR-007 | Hold for Evidence (AC-003 rerun) | The new headings ("Unverified points and open conflicts", the evidence rule for "Completed work") target F-2 directly. Quality is still gated by the user-reviewed rerun on histories A and B. |

### Structural re-audit (changed files)

The authoritative boundary, ownership, placement, naming, dead-code and legacy checks all pass:
- `systemInstructionOf` is a private adapter concern that reuses the shared `leadingSystemMessages`. There is no new cross-layer dependency.
- The heading list stays the single contract in the parser module, and both prompts are pinned to it by test.
- `this.systemMessage` is no longer read by any adapter request. `BaseLLM.buildSystemMessage` still uses it for the user-message helpers, so it is not dead.
- File sizes are unchanged in class.

Tests:
- Gemini request bodies: 3.8 and 3.1 Pro × API and Vertex × sync and stream, joined run, late note excluded, configured prompt ignored, no key without SYSTEM, normal request equality, and the transcript fallback through the real port;
- the SDK wire-contract integration;
- prompt hash pins, the shared nine-heading block, per-heading guidance order, and rejection of the retired six-heading body.

Reviewer runs:
- core `tsc -p tsconfig.build.json`: exit 0;
- `vitest run tests/unit/memory tests/unit/agent tests/unit/llm` + Gemini wire contract + runtime compaction integration: 1308/1308 passed.

### Prior findings

- **F-1:** resolved in code (live AC-010 pending in API/E2E).
- **F-2:** design response implemented (AC-003 rerun pending, with user review).
- **CR-002:** resolved (`design-spec.md:266`, `:364` now describe the v4/v6 texts from the supplement).
- **CR-001:** still API/E2E-owned. It is verified in the post-API/E2E test review.
- **CR-003 (new):** see C-016.

### Scorecard (re-audited)

Unchanged at 9.35/10:
- Data-flow 9.5, Ownership 9.5, API 9.5, SoC 9.5, Data-model 9.5, Naming 9.5, No legacy 9.5.
- **API/E2E Readiness 9.0:** CR-003, and the AC-003 / AC-010 live reruns are pending.
- **Runtime Correctness 9.0:** the F-1 fix is proven at request-body and SDK-wire level, but the live Gemini fallback and AC-003 quality are not yet proven.
- **Cleanup 9.0:** the untracked stale heading assertion (CR-003) and CR-001 are open in API/E2E.

## Round 3 — API/E2E Failure-Origin Review (CRR-003)

- Review Entry Point: `API/E2E Failure-Origin Review`. Review Scope: `N/A` (failure-origin round). The source scorecard is not repeated.
- Trigger: `/software_engineering_team/api_e2e_engineer` API-REV-001, **Fail / 93%**, on code `8d0a98eb5` (IR-002).
- Coverage investigation, execution report, ledger and API/E2E revision record reviewed: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `api-e2e-revision-record.md`, `ac003-summary-quality-report.md`.
- Failing scenario IDs: C-010 (Gemini transcript fallback, AC-008/REQ-004); AC-003 (summary quality comparison).
- Failure evidence: `api-e2e-evidence/ac003/run-4-ir002-A/ac003-results.json` (`c010`, `geminiBodies`); `api-e2e-evidence/ac003/ac003-side-by-side.md`; `api-e2e-evidence/ac003/run-*/`.
- Passed scenarios, for context: CCR-E2E-001 (Opus 5.5 strict mode: 98.58% cache read, accepted, metered); CCR-E2E-002 (AC-006, no 400); CCR-E2E-003 (Gemini cached path, 90.9%); migrated OLR-E2E-010; DeepSeek real-e2e; desktop AC-005 and a real compaction (99.44%).

### F-1 — C-010: the Gemini transcript fallback loses the summary prompt → `Design Impact`

- Scenario validity: Supported Explicit Edge Scenario. SCN-003 (REQ-004 fallback) on a supported native provider (Gemini API / Vertex, AC-008). The failing scenario still represents approved behavior.
- Production path, confirmed in source:
  - `LlmPhaseSummaryPort.requestTranscriptSummary` sends `[SYSTEM COMPACTION_SUMMARY_PROMPT, USER transcript]` on the agent's own LLM, exactly as the design specified (design-spec § Concrete Examples, "Fallback").
  - `GeminiLLM` builds `systemInstruction: this.systemMessage` (`gemini-llm.ts:142`, `:182`), which is the agent's own prompt set at bootstrap through `configureSystemPrompt` (`system-prompt-processing-step.ts:34`).
  - `GeminiPromptRenderer` maps SYSTEM messages to no role and skips them (`gemini-prompt-renderer.ts:46-54`).
  - Result: the provider gets the agent's system prompt plus a bare transcript, with no summary instructions, and the reply fails the parser.
  - Base `e50826755` avoided this because the deleted compaction-LLM factory created a separate LLM with `config.systemMessage = COMPACTION_SUMMARY_PROMPT`.
- Origin: the reviewed design's transcript-request contract assumes every provider adapter takes the system prompt from a leading SYSTEM message. That is false for Gemini, and the code implements the design faithfully. Fixing it means choosing a provider-facing request contract, for example:
  - (a) a per-invocation system-prompt override in `LLMInvocationOptions` that adapters honor;
  - (b) Gemini, and any similar adapter, honoring the leading SYSTEM run as Anthropic does. This also changes Gemini's normal requests: working-context SYSTEM notes are dropped there today, a pre-existing behavior;
  - (c) moving the summary instructions into the transcript request's user message for every provider.

  Each option changes an approved contract or provider behavior, so the classification is **`Design Impact`**, not a local fix. The Solution Designer should inventory the adapters by where they take the system prompt from (only `gemini-llm.ts` reads `this.systemMessage` in requests; `grok-llm.ts` passes `config.systemMessage` through) and also check `AutobyteusLLM`.
- **Review gap (owned):** CRR-001 recorded C-010 but held it for live evidence instead of tracing it. The source evidence above (two `rg` hits plus the renderer's role mapping) was available and reasonably detectable in source review. C-010 is reclassified from `Hold for Evidence` to a confirmed defect of the design premise.

### F-2 — AC-003: the cached summary is worse on 2 checklist items → `Requirement Gap` (user decision)

- Scenario validity: Supported Normal Scenario. SCN-001 on real user histories (464,106 tokens, which meets the ≥200k bar; and 194,548). The checklist and the routing rule are approved (SR-005, SR-006).
- Observed: the cached IR-002 summary is better or equal on most items, but worse on two:
  - (A) it repeats the agent's unverified claim that the test failures were "pre-existing/unrelated" and the tests "verified";
  - (B) it drops an earlier finding (the Skill Improver is intentionally visible) that conflicts with a later recommendation, and the continuation then missed the conflict.

  The IR-001 wording, which has the full v5 guidance, shows the same two weaknesses. So the cause is the cached-request approach: the agent summarizes from its latest point of view. It is not the IR-002 rewrite and not an implementation defect.
- Origin: not detectable in source review (a quality outcome). AC-003's rule ("worse on any checklist item → back to the Solution Designer before release") makes it a **`Requirement Gap`** for the user to decide:
  - accept as is; or
  - approve an instruction or design change (the tester proposes one instruction line: keep earlier findings that conflict with later decisions, and label the agent's own unverified conclusions as unverified), then rerun the comparison on the same two histories.
- Material evidence for that decision: the report's cost section shows the transcript path sends only the older part, with items truncated to 2,000 characters. So the real saving depends on the history's shape: about equal on history A, about 3.7× on history B. That is far below the requirement's premise ("$3.20 → $0.16"). The Solution Designer should present this to the user with the quality result.
- Limitations noted by API/E2E: one sample per context; history B is just under 200k tokens; continuations were answered from memory.

### Other API/E2E observations (routed for awareness, no defect attributed)

- **OBS-1:** the summary inherits the agent's `max_tokens`. Under REQ-001 this is approved ("same model and LLM settings"). But with adaptive thinking, a modest agent `max_tokens` can truncate both modes and block compaction. Before, the compaction LLM used the model's default limit. `max_tokens` is not part of Anthropic's cached prefix. Recorded as `Unclear` for the Solution Designer to decide whether the summary request needs its own output limit.
- **DEF-C** (an override smaller than max output hangs the run) and **DEF-D** (predefined compaction settings cannot be deleted) are base-identical and suitable as separate tickets.
- CR-002 (design-spec `:254`, `:352`) carried forward. The latest-prompt-null risk is confirmed harmless in the app.
- Durable test changes (the new cache-reuse live e2e, the migrated OLR-E2E-010 and the harness extension) are reviewed in the post-API/E2E test review after a later passing run. CR-001 looks addressed (OLR-E2E-010 passed migrated) but is verified only then.

### Round 3 routing

- Classification: F-1 `Design Impact` and F-2 `Requirement Gap`, both owned by `/software_engineering_team/solution_designer`. After the Solution Designer revises, the implementation-owned change returns through source review and API/E2E.

## Routing Classification Review

- Task size: `Large`. Architectural risk: `High`.
- Selected route: `Implementation Review`. Independent source review required: `Yes`.
- Classification evidence or correction required: None. The work spans core, server, web and test-support. It changes the shared `EnabledMemoryCompactionConfiguration` contract and the executor options, adds `BaseLLM.releaseConversation`, removes a persisted user setting, and interacts with Anthropic's preserved-thinking check.

## Review Scope

- Changed implementation and behavior reviewed:
  - BEH-001: cached summary request, same-model transcript fallback, isolation and release;
  - BEH-002: setting removal across server, web and harness;
  - BEH-003: compaction metering;
  - BEH-004: prefix guard before and after compaction.
- Files / areas reviewed:
  - all 15 changed core source files (full diff);
  - the server source removals and the settings service;
  - the web card and i18n;
  - `test-support/live-e2e/live-e2e-harness.ts`;
  - the new and adapted tests in all packages;
  - the docs.
- Workspace-wide `rg` for the removed symbols and the setting key (excluding `node_modules`, `dist` and `tickets`): `COMPACTION_MODEL_SETTINGS`, `compactionLlmFactory`, `DirectLlmCompressionStrategy`, `createCompressionStrategy`, `getParentModelIdentifier`, `CompactionCompressionExecution`, `CompactionModelSettings`, `setDurably`.
- Reviewer-run checks:
  - core `tsc -p tsconfig.build.json`: exit 0;
  - server `pnpm typecheck`: exit 0;
  - core `vitest run tests/unit/memory tests/unit/agent tests/unit/llm/base.test.ts tests/unit/llm/api tests/integration/agent/runtime/agent-runtime-compaction.test.ts`: 143 files, 1047 tests passed;
  - server `vitest run tests/unit/token-usage tests/unit/services/server-settings-service.test.ts tests/unit/agent-execution tests/unit/live-e2e`: 141 files passed, 4 skipped; 1494 tests passed;
  - web `CompactionConfigCard.spec.ts` and `ServerSettingsCompactionFailure.spec.ts`: 8 tests passed.
- Explicit exclusions:
  - live provider behavior: AC-002/003/006/008 and the AC-003 side-by-side and continuation comparison, which belong to API/E2E and user review;
  - full integration suites, which the handoff records as base-identical.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. REQ-001..007 and AC-001..009. AC-003 is strengthened in SR-005 to a live side-by-side comparison plus a continuation check, with user review before release.
- Design-spec behavior map verified against the implementation: Yes (rows below).
- Design review report and round confirmed: ARCH-REV-002 (round 2) Pass. N-1 is applied: release in `finally` on its own controller, bounded to 10 s, abort case tested.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: None blocking. See Residual Risks for the latest-prompt reading after compaction.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | **Prefix identity.** `PendingCompactionExecutor` passes `baseline.context.copy().buildMessages()` (the working context: `captureBaseline` → `contextController.getContext()`) to `CompactionSummarizer.summarize`. That calls `LlmPhaseSummaryPort.requestCachedSummary`: the same `sanitizeMediaInputMessages` with the same `llm.model.multimodalCapabilities` as the assembler, the same `toolSchemas` instance, and kwargs/options from the shared `conversation-request.ts` that `LlmPhase` itself now uses, plus `retryMode:'single_attempt'`. It runs on the agent's own `llmInstance`. The AC-001 port test compares real `AnthropicLLM` bodies: system, tools, thinking, max_tokens and cache_control are equal, normal messages are a prefix, and the request ends with the instruction. **Attempts.** 2 cached attempts, then 3 transcript attempts with 1 s / 2 s backoff. Tool calls, `incomplete`, parse failure and provider error count as failures. The budget check sends overflow straight to the transcript path. **Isolation.** `compaction_<op>_<attempt>`, released in `finally` via `BaseLLM.releaseConversation` (default no-op; `AutobyteusLLM` runs `client.cleanup(id)` only for used ids). | — |
| BEH-002 | Confirmed | Server: factory, parser, settings registration and the `setDurably` special case removed; the backend builds `createEnabledMemoryCompactionConfiguration(new CompactionPolicy())`. Web: component, util, i18n and card parts removed. A leftover value is inert and listed only as a generic deletable custom setting, which the design's persisted-data section allows. | — |
| BEH-003 | Confirmed | `LlmPhaseSummaryPort.reportUsage` emits one `TOKEN_USAGE_UPDATED` per attempt that has usage: `ingestion_kind:'autobyteus_compaction'`, `llm_call_id = <execTurn>:compaction:<op>:<attempt>`, idempotency key scoped to the agent. The server fold test prices it with cache components. | — |
| BEH-004 | Confirmed | `LLMRequestAssembler.prepareRequest` binds before compaction (only when compaction can run), then again before the checkpoint. `LlmPhase` binds before the after-final compaction using `request.tools`, which equals the port's `toolSchemas` for the same call. A test with the real `MemoryManager` proves thinking is gone before the baseline is captured. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface / Event | Shape | Forward Path / Lifecycle | Expected Outcome | Independent Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | REQ-001..004, 006, 007 | System | Native agent | Keep a long run going | Compaction gate at `before_parent_request` (first call of a turn) or `after_final_response` | Normal | Bind → executor (gate → baseline → plan → transcript content) → summarizer → port cached request on the agent's LLM (isolated id) → parse → validate → commit → bind | Cached summary; cost metered | requirements; design DS-001/002; probe | Supported Normal Scenario | Use |
| SCN-003 | REQ-004 | System | Native agent | Robustness | Cached request does not fit, or gives no valid summary twice | Explicit Edge | Summarizer → transcript request on the same LLM, 3 attempts | Compaction still succeeds | requirements SCN-003 (explicitly supported) | Supported Explicit Edge Scenario | Use |
| SCN-002 | REQ-005 | User | User | Edit compaction settings | Settings → Compaction card | Normal | Card without model controls; server ignores the key | No model choice; leftover inert | requirements | Supported Normal Scenario | Use |
| SCN-004 | REQ-001, ARCH-001 | System | Native agent on an AutoByteus (RPA) model | Compaction must not post into the agent's remote session | Same as SCN-001 on `AutobyteusLLM` | Normal | Isolated id → `releaseConversation` → `client.cleanup(id)` | Agent session untouched; no session leak | ARCH-REV-001 P-001 | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | Cached request prefix equals the agent's normal request | SCN-001, AC-001 | Compaction gate | Same baseline (working context), sanitizer, capabilities, tools, kwargs/options builder, LLM instance → cache read | Code trace; AC-001 test with real Anthropic bodies | Reject (no defect) | — |
| C-002 | Guard order: bind → compaction → bind → checkpoint; after-final bind | SCN-001, REQ-006 | Settings tool change before a compaction turn | Thinking stripped before the baseline is captured, so the fork never replays it under a changed prefix | Assembler order test + AC-006 test (real `MemoryManager`); mutation check in the handoff | Reject (no defect) | — |
| C-003 | Release lifecycle (N-1) | SCN-004 | Abort or interruption during an attempt | `finally` → own controller → 10 s race → warn only | Port code; AC-009 abort and hanging-release tests | Reject (no defect) | — |
| C-004 | Attempt budget and classification | SCN-003, REQ-004 | Provider error, tool call, truncation, invalid block | 2 cached attempts + 3 transcript attempts, each `single_attempt`; unique attempt ids 1..5; abort stops immediately | Summarizer tests (11) | Reject (no defect) | A non-retryable provider error now costs up to 5 calls instead of 3; this is what REQ-004 specifies. |
| C-005 | Live e2e `OLR-E2E-010` (`autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-output-limit-recovery-live.e2e.test.ts:521-560`) still sets the removed `AUTOBYTEUS_COMPACTION_MODEL_SETTINGS` (`max_tokens: 24`), selects compaction calls as non-streamed (`!call.stream`), and asserts `max_tokens` 24 on them | REQ-005 (setting removed end to end); engineering contract: no tests of removed behavior (Core Principle 7) | It arrived through the merge of origin/personal (`2b93f0fc6`, `8f4ee1633`) and was not migrated | When run with `DEEPSEEK_API_KEY`, it will fail or prove nothing: the setting is ignored, compaction now streams on the agent's LLM with the agent's `max_tokens`. Its product intent (a summary cut by the output limit → `incomplete` → compaction blocked) is still supported behavior. | `rg AUTOBYTEUS_COMPACTION_MODEL_SETTINGS`; source lines; design escalation trigger "any other consumer of AUTOBYTEUS_COMPACTION_MODEL_SETTINGS" | Promote | **CR-001.** A durable e2e test, so it is API/E2E-owned. Migrate or re-scope it in the API/E2E stage. |
| C-006 | Compaction usage events (null `latest_prompt_tokens`) clear the server's latest-prompt and context-fill reading until the agent's next call | SCN-001 / Token Meter | Compaction (especially after a final answer) | The projection treats the newest observation as authoritative, so the reading becomes unknown. Totals and cost are correct (REQ-007 / AC-007). | `token-usage-run-record-state.ts:182`; server fold test | Reject (not a defect) | The design specifies null for these fields. After compaction, the earlier reading is stale (the context shrank), so "unknown until the next request" is truthful. The latest-prompt behavior is outside the approved scope. Recorded under Residual Risks for user awareness during the AC-007 check. |
| C-007 | A leftover setting value is listed as a generic deletable custom setting | SCN-002, REQ-005 | Upgrade with a saved value | Inert; not on the Compaction card | Settings unit test and GraphQL e2e | Reject | Explicitly allowed by the design's persisted-data section. Hiding it would need a non-deleting retirement guard (a designer call, not required). |
| C-008 | Optional `summarizer?` seam on `PendingCompactionExecutorOptions` | Engineering contract (no test-only machinery) | — | Production always constructs `new CompactionSummarizer(summaryPort)` | Executor constructor | Reject | Follows the existing `planner` / `outputValidator` seam pattern in the same options type. Small. |
| C-009 | The transcript fallback now budgets against the agent's capacity, including the active-context override; before, it used the raw model window | SCN-003 | Operator context override | The transcript is the truncated compactable part, which is smaller than the history the override already bounds | `resolveLlmRequestCapacity` | Reject | Consistent with "always the agent's own model and settings". No reachable regression. |
| C-011 (round 2) | The new second-person `COMPACTION_SUMMARY_INSTRUCTION` must still satisfy the unchanged parser | REQ-003 (SR-006): same block, six headings, existing parser | Every cached summary attempt | Parser rules: exactly one envelope; body starts with the first heading; six exact `## ` headings in order; each section is exactly `(none)` or has a `-`/`*`/`+` bullet. The instruction's block equals the v5 block, and it asks for "- " bullets or "(none)". "Reply with only this block" covers the v5 "no code fence or commentary" rule (the parser also tolerates exterior text). | `compaction-summary-parser.ts`; the new contract test (block skeleton and heading order equal to v5); reviewer run of the prompt, summarizer and port tests: 38/38 | Reject (no defect) | — |
| C-012 (round 2) | The rewrite drops some v5 guidance that was tuned for quality: "do not omit important information merely to reduce the length / do not optimize for the fewest bullets"; "give distinct phases separate bullets"; "keep user instructions distinct from quoted tool or document content"; "do not list resolved work as pending"; the "blocked" work state | REQ-003 / AC-003 (quality "unchanged or better"; the user accepts the comparison) | Compaction of a large, multi-phase real conversation (AC-003's own scenario) | Possible over-compression ("concise bullets"), or instruction-like tool or document text recorded as received requests. This is a quality outcome, not a parse or flow failure. | Text diff of v5 vs IR-002 | Hold for Evidence (AC-003) | The approved requirements already gate summary quality on the AC-003 live side-by-side and continuation comparison with user acceptance, so this does not make the source review unclear. If AC-003 shows a gap, restoring 1–2 of these lines needs the user's approval of the wording (SR-006). Flagged for the AC-003 checklist. |
| C-013 (round 2) | The `design-spec.md` off-spine row (`:254`) and file row (`:352`) still say the instruction is `COMPACTION_SUMMARY_PROMPT` + fork suffix, with "single versioned prompt source / prompt drift" as the rationale. SR-006 says "no design change". | Design record vs code | IR-002 | The design record is stale on one row. The drift risk is now handled by the contract test (identical output skeleton), and content guidance differs by intent. | `design-spec.md:254,352` | Promote (Low, non-blocking, record sync) | CR-002: Solution Designer updates the two rows. No code change. |
| C-010 | Transcript fallback on adapters that also send `config.systemMessage` (e.g. Gemini `systemInstruction`) | SCN-003, AC-008 | Fallback on a non-Anthropic provider | The summary prompt is a SYSTEM message beside the agent's configured system instruction | Handoff risk | Hold for Evidence (live) | Already assigned to the AC-008 live check. No source prescription without evidence. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | The ownership fix landed as designed: the server no longer picks a compaction model; core owns the summarizer; the agent provides the port | — |
| Matches behavior-defining supplements | Pass | None defined; probe shape (agent request + instruction) matches | — |
| Data-flow spine clarity | Pass | DS-001/002/003/004 are traceable | — |
| Ownership boundary preservation | Pass | `LlmPhase` owns the LLM, tools, request construction and notifier. Compaction sees only `ConversationSummaryPort`. The provider adapter is unchanged. | — |
| Off-spine concern clarity | Pass | The instruction constant, budget check, release and metering each sit with their owner | — |
| Existing capability reuse | Pass | Reuses `sanitizeMediaInputMessages`, `estimateMessagesTokens`, `parseCompactionSummary`, `CompactionContentBuilder`, `notifyAgentTokenUsageUpdated`, `completionStatusOf` | — |
| Reusable owned structures | Pass | `conversation-request.ts` is the single kwargs/options builder for the agent call and the cached summary | — |
| Shared-structure tightness | Pass | `SummaryAttemptResult` drops the designed `completion` field, which would have duplicated `metadata.completionStatus`. `mode` was added to the metadata. | — |
| Repeated coordination ownership | Pass | Attempt policy lives only in `CompactionSummarizer` | — |
| Empty indirection | Pass | The port is a real dependency-inversion boundary | — |
| Separation of concerns / file responsibility | Pass | New files: summarizer 97 lines, port contract 33, port implementation 138, request builder 22 | — |
| Ownership-driven dependency | Pass | New `memory/compaction` files import no `agent/**` or `llm/api/**`. `agent/loop` → `memory/compaction` is the allowed direction. | — |
| Authoritative Boundary Rule | Pass | Compaction no longer creates or holds LLMs. Release goes through a `BaseLLM` method, not `AutobyteusClient` internals. | — |
| File placement | Pass | Contract and summarizer in `memory/compaction/`; implementation and request builder in `agent/loop/` | — |
| Flat-vs-over-split | Pass | — | — |
| Interface boundary clarity | Pass | Three port methods with explicit `SummaryRequestIdentity`. `releaseConversation(id, {signal})` is single-subject. | — |
| Naming | Pass | `CompactionSummarizer`, `ConversationSummaryPort`, `requestCachedSummary` / `requestTranscriptSummary`, `compactionConversationId` | — |
| No unjustified duplication | Pass | The old strategy's cleanup pattern moved, not copied. The old strategy is deleted. | — |
| Patch-on-patch control | Pass | The merge resolution is integrated: `isTurnContinuation`, terminal `finish`, AR-002 ids | — |
| Dead code removed in touched scope | Pass | `rg` finds no product references to the removed symbols. `setDurably` is still used by `llm-provider-service`. | — |
| Tests clear and requirement-aligned | Pass | AC-001 (real request bodies), AC-004, AC-006, AC-007, AC-009 (including abort and hanging release), executor lifecycle with the fake port, server fold, web card | — |
| Fixtures/helpers reusable and coherent | Pass | The executor harness was adapted to the fake port | — |
| No stale, duplicated or compatibility-only tests retained | Fail → CR-001 | `OLR-E2E-010` still drives the removed setting and the old compactor shape | API/E2E migrates or re-scopes it (CR-001) |
| API/E2E readiness | Pass | Live recipe and the AC-003 comparison recipe are in the handoff. The harness migration is flagged for validation. | — |

## Source File Size And Structure Audit (If Applicable)

| Source File | Effective Non-Empty Lines | `>500` | `>220` Delta | SoC | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/.../autobyteus-agent-run-backend-factory.ts` | 478 (shrank) | Pass | Pass | Pass | Pass | OK | — |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | 367 | Pass | Pass | Pass | Pass | OK | — |
| `autobyteus-ts/src/agent/loop/llm-phase-summary-port.ts` (new) | ≈121 | Pass | Pass | Pass | Pass | OK | — |
| `autobyteus-ts/src/memory/compaction/compaction-summarizer.ts` (new) | ≈85 | Pass | Pass | Pass | Pass | OK | — |
| `autobyteus-ts/src/agent/llm-request-assembler.ts` | ≈120 | Pass | Pass | Pass | Pass | OK | — |
| Other changed sources (executor, execution types, configuration, prompt, port contract, request builder, `base.ts`, `autobyteus-llm.ts`, settings service, provider builders, web card) | Below thresholds | Pass | Pass | Pass | Pass | OK | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | No strategy injection kept; no dual path. The transcript request is only the summarizer's recovery path. |
| No legacy behavior retained | Pass | Compaction-model selection removed end to end in product code |
| Dead code removed in touched modules | Pass | See the checks above. The stale live test is tracked as CR-001. |
| Persisted-data transition followed | Pass | `Directly Usable — No Migration`: the leftover key is inert; startup with a saved value is tested |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match design | Pass | No migration |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

| Item / Path | Type | Evidence | Why | Required Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-output-limit-recovery-live.e2e.test.ts` › `OLR-E2E-010` (setting at `:526`; `!call.stream` selection; `assertLimit(…, 24, …)`) | `UnusedTest` (stale: tests removed behavior) | `rg`; the test body | It drives a removed setting and asserts the removed compactor request shape | CR-001. API/E2E migrates it to the new design or re-scopes it with a documented reason. |

## Docs-Impact Verdict

- Docs impact: `Yes`. Already updated: `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-server-ts/docs/{ARCHITECTURE.md,modules/agent_memory.md}`, `autobyteus-web/docs/{settings.md,agent_execution_architecture.md}`. The spot-checked statements on the inert leftover key and the summarizer flow match the code.

## Additional Material Premise Validation (When Required)

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| P-001 (AutoByteus remote session reuse) | Confirmed, handled | Isolated ids plus `releaseConversation`; AC-009 tests |
| P-002 (SDK retries inside an attempt) | Confirmed, handled | `retryMode:'single_attempt'` on both requests; the AC-001 test asserts `maxRetries: 0` |

No new or reclassified premise.

## Review Scorecard (Mandatory)

- Overall score: 9.35 / 10 (93.5 / 100). This is a simple average; the decision follows the findings and checks.

| Priority | Category | Score | Why | Weakness | Improvement |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Bind → executor → summarizer → port → the agent's LLM → commit → bind reads straight through | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Compaction holds no LLM. The agent owns request construction. Release goes through `BaseLLM`. | The executor still imports pre-existing `agent/**` error and reporter types (unchanged) | Separate cleanup |
| 3 | API / Interface / Query / Command Clarity | 9.5 | Narrow port with explicit identity; single-subject `releaseConversation` | — | — |
| 4 | Separation of Concerns and File Placement | 9.5 | Small single-concern files, correctly placed | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.5 | No duplicated completion field; `mode` added; one request builder | — | — |
| 6 | Naming Quality and Local Readability | 9.5 | Clear domain names and comments that state the invariants | — | — |
| 7 | API/E2E Readiness | 9.0 | Strong unit coverage, including real Anthropic request bodies | Stale live test (CR-001); the live harness migration is not yet executed | API/E2E fixes CR-001 and validates the harness |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.0 | Prefix identity, guard order, attempt budget, isolation and metering verified | Live cache read, quality (AC-003) and the non-Anthropic fallback (C-010) are unproven | API/E2E + user review |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Clean removal; inert leftover tolerated by design | — | — |
| 10 | Cleanup Completeness | 9.0 | Product removal complete; docs updated | One consumer of the removed setting (a live test from the merge) was missed | CR-001 |

## Findings

### CR-001 — Live test OLR-E2E-010 still depends on the removed compaction-model setting (Medium; Local Fix → API/E2E; does not block source review)

- Candidate: C-005. Protected authority: REQ-005 (setting removed end to end; a saved value has no effect); Core Principle 7 (no tests of removed behavior); the design's escalation trigger "any other consumer of `AUTOBYTEUS_COMPACTION_MODEL_SETTINGS`".
- Evidence: `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-output-limit-recovery-live.e2e.test.ts`:
  - `:526` sets `AUTOBYTEUS_COMPACTION_MODEL_SETTINGS = {modelIdentifier:null, llmConfig:{max_tokens:24}}`;
  - it selects compaction calls with `turnCalls.filter((call) => !call.stream)`;
  - it asserts `assertLimit(call, "max_tokens", 24, …)` and `stopSignals` `length` on them.

  The case came in with the merge of origin/personal (commits `2b93f0fc6`, `8f4ee1633`) and was not migrated.
- Consequence: when run with `DEEPSEEK_API_KEY`, the case no longer tests what it claims. The setting is ignored, and compaction requests now stream on the agent's own LLM with the agent's `max_tokens` (1024 in this case), so the selection finds no compaction calls or asserts the wrong limit. Its product intent (a compaction summary cut by the output limit reports `incomplete` with the provider reason and is rejected) is still supported behavior. It is now reachable through the agent's own output limit, and it is unit-covered by the port's terminal-`finish` test (`incomplete_summary`).
- Required action (API/E2E stage): migrate the case to the new design. For example:
  - drive the cut through the agent's own `max_tokens`, if a configuration can make the summary, but not the agent's short replies, hit the limit;
  - identify compaction calls by the `compaction_` conversation id or the summary-request shape, not by `!stream`;
  - remove the setting line.

  Alternatively, re-scope or remove the case with a documented reason, if the unit coverage plus the AC-002 live run cover the intent. Then the post-API/E2E test review checks it.
- Owner: `/software_engineering_team/api_e2e_engineer`. Durable e2e test code; no product source change needed.

### CR-002 — Design spec still describes the old instruction composition (Low; non-blocking; design-record sync → Solution Designer)

- Candidate: C-013.
- Evidence: `design-spec.md:254` and `:352` say `COMPACTION_SUMMARY_INSTRUCTION` = `COMPACTION_SUMMARY_PROMPT` + fork suffix, as a "single versioned prompt source" against "prompt drift between paths". Since IR-002 (user-approved, SR-006) the instruction is a separate second-person text that shares only the output contract with v5. A unit test now pins that contract (block skeleton and heading order). SR-006 records "no design change".
- Required action: update those two rows to the IR-002 shape and rationale, with the shared output contract pinned by `compaction-summary-prompt.test.ts`. No code change. This can be done at the next design-record touch or in delivery docs sync.

## Classification

Not a failing classification: the source review passes. CR-001 is an API/E2E-owned `Local Fix` on a durable test, handled in the next stage. It must be resolved before the post-API/E2E test review can pass.

## Recommended Recipient

`/software_engineering_team/api_e2e_engineer`. The implementation engineer gets an informational notice.

## Residual Risks

- **Latest-prompt reading after compaction (C-006).** After a compaction call, the Token Meter's latest-prompt and context-fill fields show unknown until the agent's next request. Totals and cost are correct. I judge this truthful (the earlier value is stale after compaction) and within the design. The user should see it noted during the AC-007 check. The Solution Designer may revisit it as a separate projection change if wanted.
- **Leftover setting (C-007).** Listed as a deletable generic custom setting with no effect, as the design allows.
- **Non-Anthropic transcript fallback (C-010).** The summary prompt sits beside the adapter's `config.systemMessage`. Covered by the AC-008 live check.
- **AC-003 quality gate.** Side-by-side and continuation comparison on a large real conversation, with user acceptance, before release.
- **AutoByteus RPA.** No cache benefit for compaction there (fresh session per attempt), as accepted in the design.
- **Pre-existing:** the executor's imports of `agent/**` error and reporter types (unchanged).

## Latest Authoritative Result

**Round 13 (CRR-013), latest:**
- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (Targeted Delta of IR-008, a delivery-stage Local Fix)
- Score: 9.35/10. Every category ≥ 9.0.
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer` (re-validation after an implementation-owned fix; proportionate to a catalog-value change)
- Notes:
  - C-022: Sonnet 5.5 and Haiku 5.5 are cached by rule without their own AC-003 run (for the user's review and the follow-up Task);
  - N-T3: a cosmetic test title.

**Round 11 (CRR-011), superseded:**
- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (Targeted Delta of IR-007)
- Score: 9.35/10. Every category ≥ 9.0.
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Open items:
  - Sonnet 5 transcript-only rerun on B (and A);
  - AC-010 (quota);
  - the post-API/E2E test review of the durable test changes (CR-001/C-020, CR-003, `expectStrictWhenThinking`, CCR-E2E-003/004, OLR-E2E-010, harness).

**Round 10 (CRR-010), superseded:**
- Review Decision: `Fail` (API/E2E failure-origin)
- Failure Origin: F-9, `Design Impact`. A `(none)` with an explanation is rejected by the strict section rule, so Sonnet 5's transcript summary of read-only history B never parses. No implementation defect.
- Recommended Recipient: `/software_engineering_team/solution_designer`
- Everything else meets the SR-011 bar.
- Residuals: AC-010 (quota); server test load sensitivity (`native-compaction-terminal-drain`).

**Round 9 (CRR-009), superseded for routing:**
- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (Targeted Delta of IR-006)
- Supported Product Scenario Gate: `Pass`. Material-Premise Gate: `Pass`.
- Score: 9.35/10. Every category ≥ 9.0.
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Open items (API/E2E):
  - the AC-003 SR-011 bar (Sonnet 5 and DeepSeek transcript-only on A and B, each accepted within 3 attempts);
  - AC-010 on the Gemini API key;
  - CR-001/C-020 and CR-003, plus the durable test changes, for the test review.

**Round 8 (CRR-008), superseded:**
- Review Decision: `Fail` (API/E2E failure-origin)
- Failure Origin:
  - F-6 (v6 transcript prompt loses the envelope on Sonnet and DeepSeek; a regression from the base v5): `Design Impact`;
  - F-7 (DeepSeek REQ-002 gate fails while its transcript path is unreliable): `Requirement Gap`;
  - F-8 (Sonnet family check inconclusive, gap A on cached): `Requirement Gap`.
  - No implementation defect.
- Recommended Recipient: `/software_engineering_team/solution_designer`
- Resolved this round, live: F-3, F-4, CR-004, C-020, AC-011, Opus AC-003.

**Round 7 (CRR-007), superseded for routing:**
- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (Targeted Delta of IR-005)
- Supported Product Scenario Gate: `Pass`. Material-Premise Gate: `Pass`.
- Score: 9.35/10. Every category ≥ 9.0.
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Open items (API/E2E):
  - CR-001/C-020: OLR-E2E-010 must assert the REQ-009/SR-010 fitted limit and the per-model modes;
  - CR-003, the harness narrowing and `assertNoInstructionEcho`, for the test review;
  - live: the DeepSeek AC-003 rerun (decides its mode), the AC-003 family check, AC-010, AC-011 (1,024 scenario) and F-4 on Gemini (now transcript-only).

**Round 6 (CRR-006), superseded:**
- Review Decision: `Fail`
- Review Entry Point: `Implementation Review` (Full Re-Audit of IR-004)
- Classification: `Design Impact`. CR-004: the transcript summary input check does not account for the raised output limit, contradicting REQ-009 for the design's own small-context worked examples.
- Everything else in IR-004 is confirmed: mode selection, the override formula and its plumbing, the cached-path budget, and v5 byte-equal to the supplement.
- Score: 9.25/10 (Runtime Correctness 8.5).
- Recommended Recipient: `/software_engineering_team/solution_designer`
- Open items:
  - CR-001 and C-020 (OLR-E2E-010; API/E2E);
  - the DeepSeek mode, pending the AC-003 rerun.

**Round 5 (CRR-005), superseded:**
- Review Decision: `Fail` (API/E2E failure-origin)
- Review Entry Point: `API/E2E Failure-Origin Review`
- Failure Origin:
  - F-3 (a small agent `max_tokens` permanently blocks compaction): `Design Impact`;
  - F-4 (the instruction echoed as an open request on Gemini): `Design Impact`;
  - F-5 (Gemini note not better; Opus and DeepSeek residuals): `Requirement Gap`.
  - No implementation defect; source structure as in CRR-004.
- Recommended Recipient: `/software_engineering_team/solution_designer`
- Open items:
  - the Gemini API-key live run (quota environment);
  - post-API/E2E test review of the durable test changes (CR-001, CR-003, the harness narrowing, `assertNoInstructionEcho`).

**Round 4 (CRR-004), superseded for routing by round 5:**
- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (Full Re-Audit of IR-003)
- Supported Product Scenario Gate: `Pass`. Material-Premise Gate: `Pass`.
- Score Summary: 9.35/10. Every category ≥ 9.0.
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Open items:
  - CR-001 and CR-003 (API/E2E-owned test fixes);
  - AC-003 rerun on histories A and B with v4/v6, for user review;
  - AC-010 live Gemini fallback on API and Vertex.

**Round 3 (CRR-003), superseded by round 4:**
- Review Decision: `Fail` (API/E2E failure-origin)
- Review Entry Point: `API/E2E Failure-Origin Review`
- Failure Origin:
  - F-1 (C-010, Gemini transcript fallback): `Design Impact`. The reviewed design's request contract is wrong for Gemini. It also includes a CRR-001 review gap (C-010 was held instead of traced).
  - F-2 (AC-003, two weaker checklist items): `Requirement Gap` for the user to decide.
- Recommended Recipient: `/software_engineering_team/solution_designer`
- Open items: CR-001 (verify in the post-API/E2E test review), CR-002, OBS-1 (`Unclear`, Solution Designer).

**Round 2 implementation-review result (kept for reference):**
- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.35/10. Every category ≥ 9.0.
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes:
  - Round 2 (CRR-002): the IR-002 instruction rewrite passes. It is parser-compatible and contract-pinned by a unit test, and all other round-1 checks and scores are unchanged.
  - Open items:
    - CR-001 (stale live test; API/E2E);
    - CR-002 (design-record sync; Solution Designer; non-blocking);
    - C-012 (quality guidance dropped from v5), held for the AC-003 comparison, which must now use the IR-002 wording.
  - Live AC-002/003/006/008 and the AC-003 user review remain.
