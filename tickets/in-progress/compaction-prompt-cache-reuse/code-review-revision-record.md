# Code Review Revision Record

The latest `code-review-report.md` (or a later `api-e2e-test-review-report.md`) is authoritative for its current result. This record holds the initial baseline and later review deltas.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 / IR-001 handoff | N/A | Pass | CR-001 (Medium, API/E2E-owned Local Fix; does not block source review) |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2 (Targeted Delta) / IR-002 handoff | Pass | Pass | CR-001 (open, API/E2E), CR-002 (new, Low, Solution Designer record sync) |
| CRR-003 | `code-review-report.md` | API/E2E Failure-Origin Review / API-REV-001 Fail (93%) | Pass (CRR-002) | Fail → Solution Designer | F-1 (C-010, Design Impact), F-2 (AC-003, Requirement Gap); CR-001 and CR-002 carried |
| CRR-004 | `code-review-report.md` | Implementation Review, round 4 (Full Re-Audit) / IR-003 handoff | Fail (CRR-003) | Pass | F-1 resolved in code, F-2 design response implemented, CR-002 resolved, CR-001 open, CR-003 new (API/E2E) |
| CRR-005 | `code-review-report.md` | API/E2E Failure-Origin Review / API-REV-002 Fail (93%) | Pass (CRR-004) | Fail → Solution Designer | F-3 (Design Impact), F-4 (Design Impact), F-5 (Requirement Gap); F-1 verified live, F-2 Opus fixed, CR-003 fixed |
| CRR-006 | `code-review-report.md` | Implementation Review, round 6 (Full Re-Audit) / IR-004 handoff | Fail (CRR-005) | Fail → Solution Designer | CR-004 (new, Design Impact); C-020 folded into CR-001 (API/E2E) |
| CRR-007 | `code-review-report.md` | Implementation Review, round 7 (Targeted Delta) / IR-005 handoff | Fail (CRR-006) | Pass | CR-004 resolved; CR-001/C-020, CR-003 open (API/E2E) |
| CRR-008 | `code-review-report.md` | API/E2E Failure-Origin Review / API-REV-003 Fail (92%) | Pass (CRR-007) | Fail → Solution Designer | F-6 (Design Impact), F-7 and F-8 (Requirement Gap); F-3, F-4, CR-004 and C-020 resolved live |
| CRR-009 | `code-review-report.md` | Implementation Review, round 9 (Targeted Delta) / IR-006 handoff | Fail (CRR-008) | Pass | F-6 resolved in code; F-7 and F-8 resolved by the SR-011 decision; CR-001 and CR-003 open (API/E2E) |
| CRR-010 | `code-review-report.md` | API/E2E Failure-Origin Review / API-REV-004 Fail (94%) | Pass (CRR-009) | Fail → Solution Designer | F-9 (Design Impact); F-6 resolved live |
| CRR-011 | `code-review-report.md` | Implementation Review, round 11 (Targeted Delta) / IR-007 handoff | Fail (CRR-010) | Pass | F-9 resolved in code; CR-001/C-020, CR-003 open (API/E2E) |
| CRR-012 | `api-e2e-test-review-report.md` | Proportional API/E2E test review / API-REV-005 Pass (94.6%) | Pass (CRR-011) | Pass | CR-001/C-020 and CR-003 resolved; N-T1 and N-T2 cosmetic |
| CRR-013 | `code-review-report.md` | Implementation Review, round 13 (Targeted Delta) / IR-008 (delivery DR-001 Local Fix) | Pass (CRR-012) | Pass | None actionable; C-022 (quality residual), N-T3 (cosmetic) |
| CRR-014 | `api-e2e-test-review-report.md` | Proportional API/E2E test review / API-REV-006 Pass (94%) | Pass (CRR-013) | Not Applicable | None |

## Revision Entries

### CRR-001 — Initial implementation review of compaction-prompt-cache-reuse (IR-001)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-001); SCN-001..004
- Relevant solution revision IDs: SR-004 (design), SR-005 (AC-003 requirements update)
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Pass` (9.35/10; every category ≥ 9.0)
- What changed in the review result and why: initial baseline. I verified:
  - prefix identity of the cached summary request (same baseline, sanitizer, tools, request builder and LLM; real-body AC-001 test);
  - guard order;
  - attempt budget and classification;
  - isolation and release (N-1);
  - metering;
  - removal of the setting across server, web and harness.

  Reviewer checks: core and server production typecheck pass. Focused suites pass: core 1047 tests, server 1494, web 8.
- Supported product scenario / material-premise basis changes: None. P-001 and P-002 are confirmed handled. C-010 (non-Anthropic transcript fallback) is held for live AC-008 evidence.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001. The live test `OLR-E2E-010` still drives the removed `AUTOBYTEUS_COMPACTION_MODEL_SETTINGS` and the old non-streamed compactor shape. It came in with the merge of origin/personal. The owner is API/E2E, and it must be resolved before the post-API/E2E test review passes.
- Material score or classification changes: N/A (baseline)
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty:
  - latest-prompt reading shows unknown after compaction until the next request (judged truthful; for user awareness at AC-007);
  - inert leftover setting listed as a custom setting (design-allowed);
  - non-Anthropic fallback (AC-008 live);
  - AC-003 quality gate with user acceptance.

### CRR-002 — Targeted delta review of IR-002 (cached summary instruction in the agent's own voice)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review`. Commit `8d0a98eb5` changes only the instruction literal, its unit test and one doc. There is no spine, interface or call-site change.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-revision-record.md` IR-002; SCN-001
- Relevant solution revision IDs: SR-006 (REQ-003 wording, approved by the user 2026-10-11)
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A (validation in progress)
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-001, 9.35/10)
- Current authoritative result: Pass (scores unchanged, 9.35/10)
- What changed in the review result and why:
  - The new instruction is parser-compatible: its block skeleton and heading order equal v5, which the new contract test pins, and the bullet / "(none)" rule matches the parser regex.
  - The reviewer run of the prompt, summarizer and port tests passed: 38/38.
  - New CR-002: the design-spec rows `:254` and `:352` still describe "v5 prompt + suffix".
  - New C-012: v5 quality guidance was dropped, held for the AC-003 comparison.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (API/E2E-owned) | Open (API/E2E-owned; uncommitted API/E2E edits seen in the worktree, not reviewed yet) | CRR-001 | To be verified in the post-API/E2E test review |

- New or remaining finding IDs: CR-001 (open), CR-002 (new, Low, non-blocking)
- Material score or classification changes: None
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty:
  - C-012 summary quality with the new wording (AC-003, user acceptance);
  - C-010 non-Anthropic fallback (AC-008).

### CRR-003 — Failure-origin review of API-REV-001 (Fail / 93%)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/code-review-report.md` (§ Round 3)
- Review entry point and round: API/E2E Failure-Origin Review, round 3
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` and `ac003-summary-quality-report.md` (API-REV-001); C-010, AC-003
- Relevant solution revision IDs: SR-004, SR-005, SR-006
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-002)
- Current authoritative result: Fail. Routed to `/software_engineering_team/solution_designer`.
- What changed in the review result and why:
  - **F-1 (C-010):** the Gemini transcript fallback has no summary prompt.
    - `GeminiLLM` sends `systemInstruction: this.systemMessage` (the agent's prompt) at `gemini-llm.ts:142,182`, and the renderer skips SYSTEM messages (`gemini-prompt-renderer.ts:46-54`).
    - The design's fallback shape `[SYSTEM prompt, USER transcript]` therefore loses the prompt. Before, a separate LLM had `systemMessage = COMPACTION_SUMMARY_PROMPT`.
    - `Design Impact`, because the fix chooses a provider-facing request contract.
    - It is also a review gap: CRR-001 held C-010 when it was traceable in source.
  - **F-2 (AC-003):** the cached summary is worse on 2 items (an unverified claim kept as fact; a conflicting earlier finding dropped). The IR-001 wording shows the same, so the cause is the approach, not the wording. `Requirement Gap` for the user to decide. The cost evidence (the saving depends on history shape) goes to that decision.
- Supported product scenario / material-premise basis changes: C-010 is reclassified from `Hold for Evidence` to a confirmed design-premise defect. OBS-1 (the summary inherits the agent's `max_tokens`) is recorded as `Unclear` for the Solution Designer.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (API/E2E) | Likely addressed; verify in the post-API/E2E test review | API-REV-001 | OLR-E2E-010 passed migrated, according to the API/E2E report |
| CR-002 | Open (Solution Designer record sync) | Open; folded into the Solution Designer's revision | CRR-002 | design-spec `:254`, `:352` unchanged |

- New or remaining finding IDs: F-1, F-2 (failure-origin); CR-001 and CR-002 carried; OBS-1 (Unclear)
- Material score or classification changes: the classification is now Design Impact plus Requirement Gap. The source scorecard is not re-run in a failure-origin round. The "Runtime Correctness" 9.0 rationale already named C-010 as unproven.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - Gemini normal requests also drop working-context SYSTEM notes (pre-existing; relevant to fix option b);
  - DEF-C and DEF-D are pre-existing and suitable as separate tickets.

### CRR-004 — Full re-audit of IR-003 (nine-heading contract, approved v4/v6 texts, Gemini system prompt from the request)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/code-review-report.md` (§ Round 4)
- Review entry point and round: Implementation Review, round 4
- Review scope: `Full Re-Audit`. A shared contract (the heading list) and a provider adapter's request construction changed. Evidence for unchanged files is carried forward from rounds 1–2.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-revision-record.md` IR-003 (commit `1153984ee`); F-1, F-2, CR-002
- Relevant solution revision IDs: SR-007
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-001 (prior Fail)
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-003, failure-origin)
- Current authoritative result: Pass (9.35/10)
- What changed in the review result and why:
  - **Gemini:** it now takes `systemInstruction` from the leading SYSTEM run, in both builders. All production callers supply that run, so the normal-request text is unchanged and the transcript fallback carries `COMPACTION_SUMMARY_PROMPT`. Covered by request-body tests and the SDK wire test.
  - **Texts:** a reviewer byte check shows both literals equal the approved supplement blocks.
  - **Contract:** nine headings; the parser rules are unchanged; persisted six-heading summaries are never re-parsed.
  - **Reviewer runs:** core `tsc` exit 0; core memory, agent and llm units plus the Gemini wire contract and runtime compaction integration: 1308/1308.
- Supported product scenario / material-premise basis changes: C-015 (a Gemini request without a leading SYSTEM message) is rejected as Not Reachable in the product. C-017 (summary quality) is held for the AC-003 rerun.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-1 (C-010) | Open, Design Impact | Resolved in code; live AC-010 pending | SR-007, ARCH-REV-003, IR-003 | `gemini-llm.ts` `systemInstructionOf`; Gemini unit and wire tests |
| F-2 (AC-003) | Open, Requirement Gap | Design response implemented (v4/v6, nine headings); AC-003 rerun pending with user review | SR-007, IR-003 | Supplement byte check; prompt contract tests |
| CR-002 | Open | Resolved | SR-007 | `design-spec.md:266`, `:364` updated |
| CR-001 | Open (API/E2E) | Open; verify in the post-API/E2E test review | API-REV-001 | — |

- New or remaining finding IDs: CR-003 (Low, API/E2E-owned): the untracked `autobyteus-compaction-cache-reuse-live.e2e.test.ts:220` expects the retired `## Goal and constraints`. CR-001 is still open.
- Material score or classification changes: None (9.35/10)
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty:
  - AC-003 quality on histories A and B (user review);
  - AC-010 live Gemini API and Vertex;
  - OBS-1 accepted by the design.

### CRR-005 — Failure-origin review of API-REV-002 (Fail / 93%)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/code-review-report.md` (§ Round 5)
- Review entry point and round: API/E2E Failure-Origin Review, round 5
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` § Round 2 and `ac003-summary-quality-report.md` (API-REV-002); F-3, F-4, per-provider AC-003
- Relevant solution revision IDs: SR-007
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-004)
- Current authoritative result: Fail. Routed to `/software_engineering_team/solution_designer`.
- What changed in the review result and why:
  - **F-3:** the summary inherits the agent's `max_tokens`. With an explicit limit of 1,024 (a supported configuration; the repository's own real-provider scenario uses it), the nine-heading note does not fit on either path, so compaction blocks and every retry blocks again. Before this ticket, a separate compactor had its own limit. This reclassifies the accepted OBS-1 premise: `Design Impact` (a floor, or an explicit accepted risk with a clear message, needs the user's approval because it changes REQ-001's "same settings").
  - **F-4:** in 2 of 3 Gemini runs, the note lists the compaction instruction itself as an open user request, which then persists. The wording of the user-approved v4 does not exclude itself: `Design Impact` (wording plus user approval).
  - **F-5:** Gemini's cached note is not better than the transcript summary (its continuation is equal). Opus is clearly better; DeepSeek is equal or better. REQ-002 / AC-008 forbid a provider branch: `Requirement Gap` (user decision).
  - No implementation defect at `1153984ee`.
- Supported product scenario / material-premise basis changes: OBS-1 is reclassified from an accepted risk to `Reachable` / Supported Explicit Edge with a severe consequence (F-3).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-1 (C-010) | Resolved in code; live pending | Resolved live on Vertex Express. The Gemini API key is quota-blocked (environment). | API-REV-002 | `round2/ac010`; probe |
| F-2 | Design response implemented | Opus: B fixed, A fixed in the continuation. Residual quality items are folded into F-5. | API-REV-002 | `ac003-summary-quality-report.md` § Round 2 |
| CR-003 | Open (API/E2E) | Fixed (to be verified in the test review) | API-REV-002 | The test asserts every `COMPACTION_SUMMARY_HEADINGS` entry |
| CR-001 | Open (API/E2E) | Open until the test review | — | — |

- New or remaining finding IDs: F-3, F-4, F-5 (failure-origin); CR-001 and CR-003 pending the test review
- Material score or classification changes: classification Design Impact plus Requirement Gap. The source scorecard is not re-run.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - the live Gemini API-key run;
  - the DeepSeek wrong path and the Opus invented class name are model-quality residuals for the user's AC-003 review.

### CRR-006 — Full re-audit of IR-004 (per-model summary mode, summary output-limit override, instruction v5)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/code-review-report.md` (§ Round 6)
- Review entry point and round: Implementation Review, round 6
- Review scope: `Full Re-Audit`. Shared interfaces changed: `LLMInvocationOptions.maxOutputTokens`, `resolveMaxOutputTokens(options)` across six adapters, `LLMModel.compactionSummaryMode`, and `ConversationSummaryPort.usesCachedSummary`.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-revision-record.md` IR-004 (commit `13648b147`); F-3, F-4, F-5
- Relevant solution revision IDs: SR-008, SR-009
- Relevant architecture-review revision IDs: ARCH-REV-005
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-002 (prior Fail)
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-005, failure-origin)
- Current authoritative result: Fail → `/software_engineering_team/solution_designer` (Design Impact)
- What changed in the review result and why:
  - **Confirmed:**
    - the per-model mode (Anthropic and DeepSeek cached; default transcript);
    - the REQ-009 override formula, required-option plumbing through every adapter, and the cached-path budget reserving L;
    - v5 byte-equal to the supplement's normative block (`43da1ce9`).
  - **Reviewer runs:** core `tsc` exit 0; 1336/1336 focused tests.
  - **New CR-004:** the transcript request's input check reserves R but the request is sent with L > R. On the transcript-only small-context models in the design's own AC-011 examples (Ollama 8k/32k), input plus output can exceed the context, where before IR-004 it fit. That contradicts REQ-009 ("no model may lose today's behavior"). Reserving L instead turns these cases into `input_budget_exceeded`, so the right rule (for example clamping L to the available room) is a design decision.
- Supported product scenario / material-premise basis changes: C-018 is promoted (a supported explicit edge from the approved worked examples). C-019 (AutobyteusLLM ignores the override) is rejected as out of scope.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-3 | Open, Design Impact | Addressed by the REQ-009 override on the cached path; incomplete on the transcript path (CR-004) | SR-008/009, IR-004 | Port tests; Anthropic wire check at 1,024 |
| F-4 | Open, Design Impact | Addressed in v5 (self-exclusion sentence); live check pending | SR-008, IR-004 | v5 hash; prompt test |
| F-5 | Open, Requirement Gap | Resolved by the per-model mode (user delegation); DeepSeek pending the rerun | SR-008, IR-004 | Catalog-mode tests |
| CR-001 | Open (API/E2E) | Open; plus C-020 (OLR-E2E-010 conflicts with REQ-009 and REQ-002) | — | — |

- New or remaining finding IDs: CR-004 (new); CR-001 (with C-020); CR-003 (pending the test review)
- Material score or classification changes: Runtime Correctness 9.0 → 8.5; overall 9.25/10; classification Design Impact
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - the DeepSeek mode depends on the AC-003 rerun;
  - live checks for F-4 (Gemini, now on the transcript path) and AC-011.

### CRR-007 — Targeted delta review of IR-005 (summary output limit fitted to each request; CR-004)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/code-review-report.md` (§ Round 7)
- Review entry point and round: Implementation Review, round 7
- Review scope: `Targeted Delta Review`. The change is confined to `llm-phase-summary-port.ts` and the CR-004 behavior; there is no interface or data-shape change.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-revision-record.md` IR-005 (commit `97fd9a814`); CR-004
- Relevant solution revision IDs: SR-010
- Relevant architecture-review revision IDs: ARCH-REV-006
- Relevant implementation revision IDs: IR-005
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-006)
- Current authoritative result: Pass (9.35/10)
- What changed in the review result and why:
  - `L_eff = max(R, min(L, ctx − E − margin))` is applied on both paths with the estimate of exactly what each request sends. Acceptance stays on the agent's own budget, so `room ≥ R`, and input plus output stays within `ctx − margin`.
  - The "reserve L" budget is removed.
  - Every boundary row in the design is unit-tested.
  - Reviewer runs: core `tsc` exit 0; 1344/1344 focused tests.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-004 | Open, Design Impact | Resolved | SR-010, ARCH-REV-006, IR-005 | `summaryOutputLimit`; `llm-phase-summary-fitted-limit.test.ts` boundary rows; reviewer test run |
| CR-001 (with C-020) | Open (API/E2E) | Open | — | Checked in the post-API/E2E test review |
| CR-003 | Fixed per API-REV-002 | To be verified in the test review | API-REV-002 | — |

- New or remaining finding IDs: CR-001/C-020 and CR-003 (API/E2E-owned)
- Material score or classification changes: Runtime Correctness 8.5 → 9.0; overall 9.25 → 9.35
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty:
  - the DeepSeek mode decided by the AC-003 rerun;
  - live AC-011 / AC-010;
  - F-4 on Gemini.

### CRR-008 — Failure-origin review of API-REV-003 (Fail / 92%)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/code-review-report.md` (§ Round 8)
- Review entry point and round: API/E2E Failure-Origin Review, round 8
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` § Round 3 (API-REV-003). API/E2E's "F-5" is recorded as F-6. Also the DeepSeek gate and the Sonnet family check.
- Relevant solution revision IDs: SR-007 (v6 text), SR-008, SR-009, SR-010
- Relevant architecture-review revision IDs: ARCH-REV-006
- Relevant implementation revision IDs: IR-004, IR-005
- Relevant API/E2E revision IDs: API-REV-003
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-007)
- Current authoritative result: Fail. Routed to `/software_engineering_team/solution_designer`.
- What changed in the review result and why:
  - **F-6:** the v6 transcript prompt replies lose the `<compaction_summary>` markers: Sonnet 0/8, DeepSeek 3/9. With the pre-ticket v5 prompt, Sonnet kept the markers 3/3. I re-checked this in the `transcriptAttempts` records. The cause is the normative wording; the code sends it byte-exactly. `Design Impact`: change the wording or the parser contract, with user approval.
  - **F-7:** DeepSeek fails the REQ-002 cached gate (gap A in 2 of 3 samples), and its transcript fallback is unreliable (F-6). `Requirement Gap`.
  - **F-8:** the Sonnet family check is inconclusive, and its cached note shows gap A. That puts the family-wide Anthropic enablement in question. `Requirement Gap`.
  - Not reasonably detectable in source review (model adherence).
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-3 | Addressed in code | Resolved live | API-REV-003 | Real-provider 1,024 scenario 3/3; CCR-E2E-004 L_eff 16,384, 96.9% cache |
| F-4 | Addressed in v5 | Resolved live (Gemini transcript-only, no echo) | API-REV-003 | CCR-E2E-003 |
| CR-004 | Resolved in code | Resolved live | API-REV-003 | OLR-E2E-010 limit 15,000 = ctx÷4 |
| C-020 | Open (API/E2E) | Resolved (re-scoped); final check in the test review | API-REV-003 | — |
| F-5 (round 5) | Resolved by the per-model mode | Superseded by F-7 and F-8 for DeepSeek and the Anthropic family | — | — |

- New or remaining finding IDs: F-6, F-7, F-8; CR-001 and CR-003 pending the test review
- Material score or classification changes: classification Design Impact plus Requirement Gap; the source scorecard is not re-run
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: AC-010 on the Gemini API key (quota)

### CRR-009 — Targeted delta review of IR-006 (unwrapped summary accepted; DeepSeek final)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/code-review-report.md` (§ Round 9)
- Review entry point and round: Implementation Review, round 9
- Review scope: `Targeted Delta Review` (one parser branch, catalog comments, tests, one doc)
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-revision-record.md` IR-006 (commit `090353579`); F-6, F-7, F-8
- Relevant solution revision IDs: SR-011
- Relevant architecture-review revision IDs: ARCH-REV-007
- Relevant implementation revision IDs: IR-006
- Relevant API/E2E revision IDs: API-REV-003 (prior Fail)
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-008)
- Current authoritative result: Pass (9.35/10)
- What changed in the review result and why:
  - A reply with neither marker is validated as a whole body. It must start with the first heading and have the nine exact headings with bullets. Partial, misordered or repeated markers still fail.
  - The summarizer still rejects tool calls and `incomplete` before parsing.
  - DeepSeek is final as cached under the user's delegated SR-011 decision.
  - Reviewer runs: core `tsc` exit 0; 1357/1357 focused tests.
- Supported product scenario / material-premise basis changes: N-3 (an unwrapped truncation on a provider with `unknown` completion) is accepted by ARCH-REV-007 as a bounded residual risk, not promoted.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-6 | Open, Design Impact | Resolved in code; the live SR-011 bar is pending | SR-011, IR-006 | Parser branch; parser and summarizer tests |
| F-7 | Open, Requirement Gap | Resolved by decision (DeepSeek cached; gap A goes to the follow-up Task) | SR-011 | `requirements-doc.md` REQ-002 |
| F-8 | Open, Requirement Gap | Resolved by decision (Sonnet 5 cached; gap A goes to the follow-up Task) | SR-011 | `requirements-doc.md` REQ-002 |
| CR-001 / C-020, CR-003 | Open (API/E2E) | Open; checked in the test review | — | — |

- New or remaining finding IDs: CR-001/C-020, CR-003 (API/E2E)
- Material score or classification changes: None
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty:
  - live Sonnet 5 and DeepSeek transcript acceptance;
  - AC-010 on the Gemini API key;
  - N-3 (accepted residual risk).

### CRR-010 — Failure-origin review of API-REV-004 (Fail / 94%)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/code-review-report.md` (§ Round 10)
- Review entry point and round: API/E2E Failure-Origin Review, round 10
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` § Round 4 (API-REV-004); F-9
- Relevant solution revision IDs: SR-007 (heading added), SR-011
- Relevant architecture-review revision IDs: ARCH-REV-007
- Relevant implementation revision IDs: IR-006
- Relevant API/E2E revision IDs: API-REV-004
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-009)
- Current authoritative result: Fail. Routed to `/software_engineering_team/solution_designer`.
- What changed in the review result and why:
  - **F-9:** Sonnet 5's transcript summary of history B (a read-only investigation) is rejected 6 of 6 times only because "Files created or changed" is `(none) — <reason>` or `(none — <reason>)`. I confirmed this in the evidence. The section rule accepts only a bare `(none)` or bullets, and the newly added heading is often legitimately empty.
  - `Design Impact` (parse contract or wording). Recommended: accept a section whose first line starts with `(none`, then rerun.
  - No implementation defect; not detectable in source review.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-6 | Resolved in code | Resolved live (DeepSeek A and Sonnet A unwrapped replies accepted on attempt 1) | API-REV-004 | `round4/` transcript-only runs |
| CR-001 / C-020, CR-003 | Open (API/E2E) | Open; checked in the test review | — | — |

- New or remaining finding IDs: F-9; CR-001/C-020, CR-003 (test review)
- Material score or classification changes: classification Design Impact; the source scorecard is not re-run
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - AC-010 (quota);
  - load sensitivity of the server test `native-compaction-terminal-drain`;
  - N-3 (not observed).

### CRR-011 — Targeted delta review of IR-007 (explained empty section accepted)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/code-review-report.md` (§ Round 11)
- Review entry point and round: Implementation Review, round 11
- Review scope: `Targeted Delta Review` (one validator rule, tests, one doc line)
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-revision-record.md` IR-007 (commit `097192731`); F-9
- Relevant solution revision IDs: SR-012
- Relevant architecture-review revision IDs: ARCH-REV-008
- Relevant implementation revision IDs: IR-007
- Relevant API/E2E revision IDs: API-REV-004 (prior Fail)
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-010)
- Current authoritative result: Pass (9.35/10)
- What changed in the review result and why:
  - The first line of a section matching `^\(none(\)|[\s–—-])`, case-insensitive, now counts as empty; any other section still needs a bullet. All other contract checks are unchanged.
  - The boundaries are tested in both directions, and the recorded Sonnet shapes are accepted.
  - Reviewer runs: core `tsc` exit 0; 847/847 focused tests.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-9 | Open, Design Impact | Resolved in code; the live Sonnet 5 B rerun is pending | SR-012, ARCH-REV-008, IR-007 | `EMPTY_SECTION` rule; parser and summarizer tests |
| CR-001 / C-020, CR-003 | Open (API/E2E) | Open; checked in the test review | — | — |

- New or remaining finding IDs: CR-001/C-020, CR-003 (API/E2E)
- Material score or classification changes: None
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty:
  - AC-010 (quota);
  - N-3;
  - load sensitivity of `native-compaction-terminal-drain`.

### CRR-012 — Proportional review of the durable API/E2E test changes (API-REV-005)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/api-e2e-test-review-report.md`
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (proportional test review)
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` § Round 5 (API-REV-005); CCR-E2E-001..004, OLR-E2E-010
- Relevant solution revision IDs: SR-011, SR-012
- Relevant architecture-review revision IDs: ARCH-REV-008
- Relevant implementation revision IDs: IR-007
- Relevant API/E2E revision IDs: API-REV-005
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-011, implementation review)
- Current authoritative result: Pass (test review)
- What changed in the review result and why:
  - The new cache-reuse live suite, the re-scoped OLR-E2E-010 and the opt-in harness extensions are coherent and requirement-aligned.
  - Every case enters through real product triggers (GraphQL, WebSocket, Settings).
  - Isolation: a temporary app-data folder per suite and the test-owned vault.
  - `summaryRequestMode` is position-anchored; usage parsing is correctly anchored; strict mode is applied when a `thinking` parameter is present.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 / C-020 | Open (API/E2E) | Resolved | API-REV-003..005 | OLR-E2E-010 asserts the REQ-009/SR-010 fitted limit and the REQ-002 modes; no removed setting remains |
| CR-003 | Fixed per API-REV-002 | Resolved (verified) | API-REV-002 | CCR-E2E-001 checks every `COMPACTION_SUMMARY_HEADINGS` entry |

- New or remaining finding IDs: none actionable. N-T1 (stale local names in CCR-E2E-003) and N-T2 (an ineffective delete of predefined settings, harmless) are cosmetic.
- Material score or classification changes: N/A
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty:
  - the user's AC-003 and AC-007 checks before release;
  - AC-010 on the Gemini API key;
  - N-3;
  - load sensitivity of `native-compaction-terminal-drain`;
  - SR-013 pending outside this package.

### CRR-013 — Targeted delta review of IR-008 (new Anthropic catalog models use the cached summary)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/code-review-report.md` (§ Round 13)
- Review entry point and round: Implementation Review, round 13 (round 12 was the CRR-012 test review)
- Review scope: `Targeted Delta Review` (two catalog values, the handoff count)
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-revision-record.md` IR-008 (commit `71b15db4f`), at delivery's request (`delivery-revision-record.md` DR-001)
- Relevant solution revision IDs: SR-011, SR-012
- Relevant architecture-review revision IDs: ARCH-REV-008
- Relevant implementation revision IDs: IR-008
- Relevant API/E2E revision IDs: API-REV-005
- Relevant delivery revision IDs: DR-001
- Prior authoritative result: Pass (CRR-012, test review)
- Current authoritative result: Pass (9.35/10)
- What changed in the review result and why:
  - The merged base added `claude-sonnet-5-5` and `claude-haiku-5-5` without `compactionSummaryMode`. Setting them to `cached_conversation` restores REQ-002 ("the Anthropic catalog models") for all 10 entries.
  - Reviewer runs: core `tsc` exit 0; 102/102 focused tests, including the catalog-mode test.
- Supported product scenario / material-premise basis changes: C-022 is recorded as a non-promoted quality residual (no model-specific AC-003 run for Sonnet 5.5 and Haiku 5.5; the transcript fallback remains).

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none actionable (C-022 quality residual; N-T3 cosmetic)
- Material score or classification changes: None
- Recommended recipient: `/software_engineering_team/api_e2e_engineer` (proportionate re-validation)
- Remaining risks or uncertainty:
  - C-022 for the user's AC-003 review;
  - the earlier residual risks (AC-010 quota, N-3, load-sensitive server test).

### CRR-014 — Test review after API-REV-006: no durable test change (Not Applicable)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/api-e2e-test-review-report.md` (§ Round 2)
- Review entry point and round: Successful API/E2E test-code review, round 2
- Review scope: `N/A`
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` § Round 6 (API-REV-006)
- Relevant solution revision IDs: SR-012
- Relevant architecture-review revision IDs: ARCH-REV-008
- Relevant implementation revision IDs: IR-008
- Relevant API/E2E revision IDs: API-REV-006
- Relevant delivery revision IDs: DR-001
- Prior authoritative result: Pass (CRR-013)
- Current authoritative result: Not Applicable
- What changed in the review result and why: no file under `tests/` or `test-support/` changed after `d0f3fbd52` (the set reviewed in CRR-012). Live re-validation on the merged Anthropic request shaping passed, including the newly cached `claude-sonnet-5-5`.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: None
- Material score or classification changes: N/A
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty:
  - Haiku 5.5's cached path is not exercised live (test sizing); C-022;
  - AC-010 (quota);
  - N-3;
  - the stale `autobyteus-ts/dist` (rebuilt by API/E2E; delivery must build fresh).
