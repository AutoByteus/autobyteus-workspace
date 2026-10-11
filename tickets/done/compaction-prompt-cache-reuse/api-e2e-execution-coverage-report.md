# API/E2E Execution Coverage Report — compaction-prompt-cache-reuse

## Execution Round Meta

All paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/` unless noted.

- Requirements Doc: `requirements-doc.md` (current SR-006)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-006)
- Design Spec: `design-spec.md`
- Supplemental Task Artifacts: `probes/` (evidence only)
- Design Review Report: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-002)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-002, Pass; CRR-001 assigned CR-001 to API/E2E)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Summary-quality report (AC-003, for the user): `ac003-summary-quality-report.md`
- Current API/E2E Revision ID: `API-REV-006` (round 6 on `71b15db4f`, delivery-stage re-validation, **latest authoritative: Pass**; see § Round 6 first)
- Current Execution Round: 6
- Trigger: round 1, code review pass CRR-001, then CRR-002 (IR-002) during the round; round 2, CRR-004 (IR-003 `1153984ee`; answers F-1/F-2 of API-REV-001)
- Prior Round Reviewed: round 1 (API-REV-001, Fail / 93%)
- Latest Authoritative Round: **2**. See § Round 2 below; the round-1 sections that follow are kept as history unless round 2 says otherwise.
- Code under validation: `codex/compaction-prompt-cache-reuse` @ **`8d0a98eb5`** (IR-002). The AC-002/006/008 cached-path runs, AC-003 and the desktop app all ran on `8d0a98eb5`. The early runs on `faee47a48` (IR-001) are kept as history only.

## Round 6 (API-REV-006, latest authoritative): IR-008 at `71b15db4f` (delivery merge `fffdc5c2f` + new Anthropic models set to cached)

**Scope (proportionate).** IR-008 changes only catalog values: `claude-sonnet-5-5` and `claude-haiku-5-5` → `cached_conversation`. But the delivery merge (`origin/personal` @ `6314c4ee2`) also rewrote Anthropic request shaping: `anthropic-llm.ts` and the new `anthropic-model-request-policy.ts` (per-model `thinking` policy). The cached summary depends on reproducing the agent's request exactly, so the live Anthropic cases were rerun on the merged code.

**Stale build found and fixed.** `autobyteus-ts/dist` (14:28) predated IR-008: the two new models had no mode there. It was rebuilt with `pnpm -C autobyteus-ts build` before any live run; all 10 Anthropic entries now read `cached_conversation`.

| Case | Result | Key Evidence |
| --- | --- | --- |
| Repository checks | **Pass** | Core 309 / **2072** (includes the catalog-mode test); core typecheck clean; server typecheck clean; server 666+ files / **5242** (run with live harnesses idle) |
| CCR-E2E-001..004 (Opus 5.5, merged request shaping) | **Pass 4/4** | 001 cache read 95.8 %, strict applied (Opus 5.5 always sends adaptive thinking), prefix identity including `thinking`; 002 strict 200 after the tools change; 003 Gemini `[transcript]`, `4900`; 004 summary 16,384 vs agent 4,096, cache read 95.8 % |
| CCR-E2E-001 on `claude-sonnet-5-5` (newly cached) | **Pass** | Cached summary accepted on the first attempt, cache read 95.6 %, continued, meter = provider, no echo (no `thinking` parameter on its requests, so strict mode is not applicable) |
| CCR-E2E-001 on `claude-haiku-5-5` (newly cached) | **Not achieved (test sizing)** | Before any summary request, the planner refused the compaction as `target_unattainable`, the correct product refusal. Haiku's history was about twice as long (H ≈ 53–57k tokens; Opus and Sonnet ≈ 28k), and this case's aggressive trigger (0.85 H) caps the target near 0.77 H, below the fixed reserves for this history. Tokens per character are like the other models (1.46 vs 1.35–1.42), so this is not an estimator fault. With default settings (80 % of the model context) the target is far larger. A temporary probe with a 0.95 H trigger was interrupted by the user before producing a result (`round6/live-ccr-haiku55-smoke095-interrupted-no-result.log`) and was not repeated |
| AC-010 (Gemini API key) | Not rerun (blocked by quota in rounds 2–5) | — |

**Residuals:**
- Haiku 5.5's live cached summary is unexercised. It uses the same code path as the other cached Anthropic models, which pass, and the catalog value is unit-tested.
- C-022: Sonnet 5.5 and Haiku 5.5 have no AC-003 quality run of their own (follow-up Task).
- N-T3: the catalog test title still says "(pending the rerun) DeepSeek" (cosmetic, implementation-owned).

**Durable test changes this round: none.** The test review is Not Applicable (the durable set was reviewed in CRR-012).

**Result: Pass / 94 %.**

## Round 5 (API-REV-005, latest authoritative): IR-007 at `097192731` (F-9: an explained empty section is accepted)

`autobyteus-ts/dist` contains the new empty-section rule `^\(none(\)|[\s–—-])` (case-insensitive). The other changes in the commit are tests and docs.

| Case | Result | Key Evidence |
| --- | --- | --- |
| Repository checks | **Pass** | Core 307 / **2045**; server 666 / **5232** (run with all live harnesses idle, including `native-compaction-terminal-drain.test.ts`); server typecheck clean; 0 non-rootDir type errors in test files |
| F-9 rerun: Sonnet 5 transcript-only | **Pass** | B: accepted on attempt 1 (`(none) — this has been a pure read-only investigation…`); A (regression check): accepted on attempt 1; both continuations normal |
| CCR-E2E-001..004 (final commit) | **Pass 4/4** | 001 cache read 96.8 %; 002 strict, tools changed; 003 Gemini `[transcript]`, `4900`; 004 summary 16,384 vs agent 4,096, cache read 96.3 % |
| OLR-E2E-010 (final commit) | **Pass** | `[cached]`, summary 15,000, agent 96, recall `VX-4471` |
| RE2E-DS / AC-011 (final commit) | **Pass 3/3** | — |
| AC-010 (Gemini API key) | **Blocked** | 429 `RESOURCE_EXHAUSTED` again (project quota); Vertex Express passed in rounds 2–5 |

**SR-011 release bar, cumulative (rounds 3–5):**
- **Opus:** quality conditions met (round 3).
- **Cached notes accepted and read from cache:** Opus 96–97 %, Sonnet 5 96.6 / 97.4 %, DeepSeek 96.7 %.
- **Transcript summaries accepted within 3 attempts:**
  - Sonnet 5 A/B (round 5);
  - DeepSeek A/B, Opus A/B, Gemini A/B (round 4).
- **Met.**

**Final confidence: 94.6 %**

| Category | Score |
| --- | --- |
| Requirement and AC proof | 95 |
| Changed-boundary directness | 96 |
| Cross-boundary realism | 96 |
| Environment fidelity | 92 (Gemini API key unusable) |
| Failure/lifecycle | 93 |
| User surface | 95 |
| Durable coverage | 95 |

- No category is below 90.
- Residual:
  - AC-010 on the Gemini API key only (Vertex proven);
  - AC-003 single samples per context, with user review of `ac003-summary-quality-report.md` before release;
  - gap A on Sonnet 5 and DeepSeek recorded for the follow-up Task (project_task_9bf18aea…);
  - N-3 not observed;
  - the desktop round was not repeated (no UI or metering change since round 1).

**Durable test changes (for the post-API/E2E test review), all passing on `097192731`:**

| Path | Change summary |
| --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-compaction-cache-reuse-live.e2e.test.ts` (new) | **CCR-E2E-001** cached summary = previous request + instruction, cache read ≥ 90 %, completed on the first attempt, nine headings in the next request (CR-003), meter = provider, no echo; model configurable via `COMPACTION_CACHE_E2E_ANTHROPIC_MODEL`. **CCR-E2E-002** tools changed → 0 thinking blocks, strict 200. **CCR-E2E-003** Gemini transcript-only, `systemInstruction` checks (AC-010), no echo. **CCR-E2E-004** fitted summary limit (REQ-009/SR-010), agent limit untouched, cache read. Also: `expectStrictWhenThinking`, `assertNoInstructionEcho`, per-case high/low trigger (predefined settings cannot be deleted) |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-output-limit-recovery-live.e2e.test.ts` (updated) | OLR-E2E-010 re-scoped (CR-001/C-020): fitted limit with room guard, cached first, then transcript only, completion, agent limit untouched, recall; settings reset to high values in `finally` |
| `autobyteus-server-ts/tests/e2e/helpers/native-runtime-live-harness.ts` (updated, opt-in) | `strictAnthropicThinking`, `writeBodies`, per-call `usage` (Anthropic / OpenAI-compatible / Gemini), `strictInjected`, and `summaryRequestMode`, which matches the instruction only in the last message and the prompt only in the system part (with an emptiness guard) |

## Round 4 (API-REV-004): IR-006 at `090353579` (SR-011: parser accepts a summary without markers; DeepSeek and Anthropic models stay cached)

`autobyteus-ts/dist` contains the new parser branch (`!includes(open) && !includes(close)`). The other changes in the commit are a catalog comment, docs and tests.

| Case | Result | Key Evidence |
| --- | --- | --- |
| Repository checks | Pass | Core 307 / **2030**; server 666 / **5232** (rerun on an idle machine; the first run had 1 load-timing failure in `native-compaction-terminal-drain.test.ts`, which then passed 5/5 in isolation and in the full rerun); typechecks clean |
| CCR-E2E-001..004 (Opus) | **Pass 4/4** | 001 cache read 96.7 %; 004 summary `max_tokens` 16,384 vs agent 4,096, cache read 96.4 %; 003 Gemini `[transcript]`, `4900` |
| CCR-E2E-001 on Sonnet 5 | **Pass** (second run) | Cache read 97.4 % (first run 96.6 %); accepted; continued; meter = provider; no echo. The first run failed only on the strict assertion: Sonnet 5 requests carry no `thinking` parameter, so strict mode cannot be applied. The test now asserts strict mode exactly when the request has a `thinking` parameter (Opus: applied) |
| OLR-E2E-010 (DeepSeek) | **Pass** | `[cached]`, summary `max_tokens` 15,000, cache read 96.7 %, agent 96, recall `VX-4471` |
| RE2E-DS / AC-011 | **Pass 3/3** | `summaryModes ["cached"]` |
| SR-011 transcript bar | **Sonnet B fails; all others pass** | Opus A/B, Gemini A/B, DeepSeek A/B: accepted on attempt 1 (DeepSeek A and Sonnet A without markers). **Sonnet B: 0/6** (F-9) |
| AC-010 (Gemini API key) | **Blocked** | 429 again |
| N-3 | Not observed | — |

**F-9 (new; release bar): Sonnet 5's transcript summary of history B is never accepted.**
- All 6 replies are complete nine-heading summaries with `(none) — <explanation>` or `(none — <explanation>)` under "Files created or changed". The statement is correct: the compacted part has no file writes.
- The validator accepts only a bare `(none)` or bullets.
- The same history on Opus, Gemini and DeepSeek is accepted on attempt 1.
- Evidence: `round4/ac003-sonnet-tonly-B{,-run1}/ac003-results.json` (`transcriptAttempts[].error`, `rawContent`).
- **Owner:** Solution Designer via failure-origin review. Options: a parser rule (accept `(none)` followed by an explanation) or prompt wording.

**Round-4 durable test change:** `autobyteus-compaction-cache-reuse-live.e2e.test.ts` gains `expectStrictWhenThinking` (strict mode asserted exactly when the request has a `thinking` parameter) and a CCR-E2E-001 name that reflects the configurable model.

**Round-4 result: Fail / 94%** (one release-bar item, F-9; everything else meets the bar).

## Round 3 (API-REV-003): IR-004/IR-005 at `97fd9a814`

Code under validation: `97fd9a814`. It adds the per-model summary mode (REQ-002), the fitted summary output limit (REQ-009/SR-010) and instruction v5; prompt v6 is unchanged. `autobyteus-ts/dist` was checked against HEAD: it contains the output-limit code and catalog modes, and the instruction and prompt hashes equal the pinned `43da1ce9` / `c3105f73`.

### Prior failure resolution

| Prior ID | Round-3 Evidence | Status |
| --- | --- | --- |
| F-3 (small agent limit blocked compaction) | **AC-011 live:** the repository's real-provider DeepSeek scenario at `max_tokens: 1_024` passes 3/3, cached note accepted. CCR-E2E-004 (Opus, `max_tokens` 4,096): the summary request carries **16,384** = L_eff, the agent's requests keep 4,096, cache read **96.9 %**, strict mode accepted. OLR-E2E-010 (DeepSeek, run limit 96, context 60,000): the summary request carries **15,000** = min(16,384, 60,000 ÷ 4), compaction completes, the agent's requests keep 96, and the fact is recalled | **Resolved** |
| F-4 (Gemini note echoed the instruction) | Gemini is transcript-only (REQ-002): CCR-E2E-003 has modes `[transcript]`, `systemInstruction` = summary prompt, no echo, recall `4900`. No Opus note echoed (5/5) | **Resolved** |
| C-020 / CR-001 (OLR-E2E-010) | Re-scoped to the REQ-009/SR-010 fitted limit and the per-model mode sequence. The live length-cut rejection is no longer reachable with a small run limit (it needs an input within a few hundred tokens of the context); it stays unit-proven | **Resolved (re-scoped)** |
| CR-003 | Unchanged since round 2 | Resolved |

### Round-3 case results

| Case | Result | Key Evidence |
| --- | --- | --- |
| Repository checks | Pass | Core 307 files / **2017**; server 666 files / **5232**; core and server typechecks clean; changed test files 0 type errors |
| CCR-E2E-001 (AC-001/002/007) | **Pass** | Cached request; cache read 95.9 %; 12 kept thinking blocks under strict mode; the summary request keeps the agent's 128,000 limit (no override); meter = provider |
| CCR-E2E-002 (AC-006) | **Pass** | Tools changed: 0 thinking blocks, strict 200 |
| CCR-E2E-003 (AC-008, AC-010, F-4) | **Pass** | Gemini transcript-only; `systemInstruction` = summary prompt; agent prompt unchanged on every agent request; no echo; recall correct |
| CCR-E2E-004 (AC-011 on Anthropic; new) | **Pass** | `max_tokens` 16,384 on the summary request vs 4,096 on agent requests; cache read 96.9 %; 26 kept thinking blocks under strict mode |
| OLR-E2E-010 (re-scoped) | **Pass** | Modes `[cached]`; summary `max_tokens` 15,000; agent 96; completed; recall `VX-4471` |
| RE2E-DS / AC-011 live | **Pass** | 3/3; `summaryModes ["cached"]`; `summary*Verified` true. The real-provider harness cannot see per-request output options, so the exact wire limit is covered by CCR-E2E-004 and OLR-E2E-010 |
| AC-010 (Gemini API key) | **Blocked** | 429 `RESOURCE_EXHAUSTED` on every request again (project quota) |
| AC-003 v5 rerun | **Opus: pass. Sonnet 5: gap A. DeepSeek: gate fails (gap A).** | See the quality report § Round 3 |

### New failure

**F-5: the v6 transcript prompt loses the `<compaction_summary>` markers on Sonnet 5 and DeepSeek.**
- **Sonnet 5:** 0/8 transcript replies parsed. Each was a complete nine-heading summary, but without the markers.
- **DeepSeek:** 3/9 parsed across rounds 2–3. On history A, all 4 round-3 attempts failed, so on that history its fallback (and its transcript-only path) blocks.
- **Opus (4/4) and Gemini (all runs)** keep the markers.
- **Origin:** the same Sonnet transcript runs with the pre-ticket base prompt (v5, six headings, `e50826755`) kept the markers 3/3. So this is a regression introduced by the v6 prompt (SR-007/IR-003).
- **Impact:** the transcript summary is the only path for every non-catalog-cached model and the fallback for cached ones.
- **Evidence:**
  - `round3/ac003-{sonnet,deepseek}-tonly-*/ac003-results.json` (`transcriptAttempts`, `rawContent`);
  - `round3/ac003-sonnet-tonly-v5base-A/`.
- **Owner:** the Solution Designer decides: v6 prompt wording (normative text), or a parser rule that accepts exactly the nine headings without markers.

### REQ-002 gate results (AC-003 v5)

| Model | Gate | Result |
| --- | --- | --- |
| Opus 5.5 | Cached ≥ transcript | **Pass**. Gap A fixed in the note and the continuation; gap B items kept; paths are correct joins |
| Sonnet 5 (family check) | Cached ≥ transcript | **Not shown.** No valid transcript summary to compare against (F-5). Its cached note shows gap A: "Completed work" says the full suite executed and was confirmed, and the continuation calls the failures "unrelated … not blockers" |
| DeepSeek v4 Flash | No gap A, no invented or wrong paths | Paths pass. **Gap A fails**: the note and its continuation state "unrelated" as fact, while the transcript-context answer flags the overstated report. By REQ-002 → transcript (Solution Designer), but its transcript path is unreliable until F-5 is fixed |

### Round-3 durable test changes (uncommitted, for proportional review)

| Path | Change |
| --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-compaction-cache-reuse-live.e2e.test.ts` | CCR-E2E-003 expects Gemini transcript-only. New **CCR-E2E-004** (AC-011 on Anthropic: fitted limit, cache read, agent limit untouched). `runToPendingCompaction` takes an optional agent `max_tokens`. Header updated |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-output-limit-recovery-live.e2e.test.ts` | OLR-E2E-010 re-scoped (C-020): asserts the fitted limit (ceiling computed from the REQ-009 rule with a room guard), the per-model mode sequence (cached first; transcript only after), completion, the agent's limit untouched, and recall. Settings reset to high values in `finally` (predefined settings cannot be deleted). Header updated |
| `autobyteus-server-ts/tests/e2e/helpers/native-runtime-live-harness.ts` | Unchanged since round 2 |

### Round-3 result

- **Fail.**
  - F-5: a regression in the transcript fallback on Sonnet 5 and DeepSeek.
  - The DeepSeek gate fails on gap A, so it goes back to the Solution Designer per REQ-002.
  - The Sonnet family check is inconclusive.
- **Resolved:** F-3, F-4, C-020.
- **Passing:** AC-002/006/007/008/010 (Vertex)/011.
- **Confidence: 92%**
  - Requirement and AC proof: 88%
  - Changed-boundary directness: 96%
  - Cross-boundary realism: 96%
  - Environment fidelity: 90%
  - Failure/lifecycle: 86% (F-5)
  - User surface: 95%
  - Durable coverage: 95%

## Round 2 (API-REV-002): IR-003 at `1153984ee`

Code under validation: `1153984ee`. It adds the Gemini system prompt taken from the request's leading SYSTEM messages, the nine-heading summary contract, instruction v4 and prompt v6.
- `autobyteus-ts/dist`, which the server resolves, was checked against HEAD: the Gemini fix is present, and the instruction and prompt SHA-256 values equal the pinned v4/v6 hashes.
- Both texts are byte-equal to `supplements/cached-summary-instruction.md` (checked independently).

### Prior failure resolution

| Prior ID | Round-2 Evidence | Status |
| --- | --- | --- |
| F-1 / C-010 (Gemini transcript fallback lost the summary prompt) | **Vertex Express:** in the transcript requests (histories A and B, plus a probe), `systemInstruction` is exactly `COMPACTION_SUMMARY_PROMPT` and the replies parse. The normal agent request and the cached request carry exactly the agent's prompt (probe, plus CCR-E2E-003 durable assertions in r2/r3) | **Resolved on Vertex Express.** Gemini API key: blocked (429 quota, see below) |
| F-2 / AC-003 (2 worse checklist items) | The rerun on the same two histories: weakness B is fixed in both the note and the continuation; weakness A is fixed in the continuation, with one contradictory duplicate left in the note | **Resolved for user review**, minor notes (`ac003-summary-quality-report.md` § Round 2) |
| CR-003 (retired heading in my test) | The test checks every `COMPACTION_SUMMARY_HEADINGS` entry in the post-compaction request | **Resolved** |
| CR-002 | Resolved by the Solution Designer (per CRR-004) | — |

### Round-2 case results

| Case | Result | Key Evidence |
| --- | --- | --- |
| Repository checks | Pass | Core 1977/1977; server 5232; typechecks clean (0 type errors in the changed test files) |
| CCR-E2E-001 (AC-001 live, AC-002, AC-007) | **Pass** (r1 and r3-final) | Cached request = previous request + v4 instruction; cache read 96.3 % / **96.9 %**; 21 kept thinking blocks replayed under strict mode; accepted on attempt 1; all nine headings in the next request; meter = provider |
| CCR-E2E-002 (AC-006) | **Pass** (r1, r3-final) | Tools changed: 0 thinking blocks, new tools, strict 200 |
| CCR-E2E-003 (AC-008, AC-010) | **Pass in r3-final**; failed in r1/r2 on F-4 | Cached on attempt 1; recall `4900`; meter consistent; agent and cached requests carry the agent prompt. Gemini's implicit cache read was 0 % in r3 and 89.9 % in r2 (not asserted for Gemini) |
| OLR-E2E-010 (CR-001) | **Pass** | Modes `[cached ×2, transcript ×3]`, all `length`, blocked |
| AC3-CMP (AC-003) | **Pass with minor notes**, for user review | See the quality report § Round 2 |
| AC-010 | **Pass (Vertex Express)** / **Blocked (Gemini API key)** | Every Gemini API request returned 429 `RESOURCE_EXHAUSTED` ("requests per minute per region"), even after 4 retries over ~4 min with a one-line request. This is the key's project quota. The request body is built by the same runtime-independent code path |
| RE2E-DS (`deepseek.compaction-agent-flow`) | **Fail (F-3)** | See below |
| AC3-CMP per provider (user instruction: judge quality for every provider tested) | Judged | **Opus:** cached clearly better. **DeepSeek:** equal or better; cached notes parse 4/4, transcript 2/3. **Gemini:** not better: continuations equivalent, note thinner on open doubts and earlier decisions, plus F-4. Details: `ac003-summary-quality-report.md` § Per-provider judgment |

### New failures

**F-3: the repository's real-provider DeepSeek compaction scenario now fails at HEAD.**
- The scenario agent is configured with `max_tokens: 1_024` (`test-support/live-e2e/live-e2e-harness.ts:762`). The summary inherits it (OBS-1, accepted design risk).
- The nine-heading note does not fit within 1,024 output tokens on either path. All 5 attempts (cached ×2, transcript ×3) ended `incomplete`/`length`, then `COMPACTION_BLOCKED`, then `LIVE_E2E_COMPACTION_FLOW_TIMEOUT` at turn 4 (`round2/real-e2e-deepseek-compaction.log`).
- In round 1 (six headings), the transcript attempt fit.
- With the fixture temporarily at 4,096, the scenario passes 3/3 and the cached note is accepted on the first attempt (`round2/real-e2e-deepseek-compaction-probe-4096.log`). The fixture was reverted.
- **Impact:** product agents default to the model's own maximum output (`maxTokens: null`), so only agents a user explicitly gives a small output limit are affected. For them, compaction can now never succeed and the run blocks.
- **Owner decision:**
  - raise the scenario fixture (test-support; implementation);
  - and/or a design response for small agent output limits (Solution Designer), for example a minimum output limit for summary attempts. For Anthropic and OpenAI-compatible providers, `max_tokens` is not part of the cached prefix.

**F-4: the Gemini note can record the compaction instruction itself as an open user request.**
- In 2 of 3 live Gemini runs (CCR-E2E-003 r1, r2), the note's "Requests and instructions received" contained `User: "Your context window is nearly full. The earlier part of this conversation is about to be replaced by a note that you write now..." (open - responding now)`.
- This line stays in the agent's context after compaction.
- Not seen in any Opus note (6/6: AC-003 A and B, CCR-E2E-001/002 in r1 and r3), nor in the 2 Gemini notes on the long real histories.
- The agent still answered correctly afterwards.
- The durable CCR suite now asserts against it (`assertNoInstructionEcho`), so CCR-E2E-003 fails whenever it happens: it is intermittent until resolved.
- **Owner:** Solution Designer (instruction v4 wording; for example, tell the agent not to list this request). Alternatively, accept it and relax the assertion.

### Round-2 durable test changes (uncommitted, for proportional review)

| Path | Change |
| --- | --- |
| `autobyteus-server-ts/tests/e2e/helpers/native-runtime-live-harness.ts` | `summaryRequestMode` now matches the instruction only in the request's last message (`messages`/`contents`) and the prompt only in its system part (`system`, `systemInstruction`, system/developer messages). A post-compaction request whose note quotes the instruction is no longer counted as a summary request |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-compaction-cache-reuse-live.e2e.test.ts` | CR-003: all nine headings. AC-010 assertions in CCR-E2E-003. `assertNoInstructionEcho` in all three cases (F-4). Header comment corrected (trigger sizing; predefined settings not deletable) |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-output-limit-recovery-live.e2e.test.ts` | Unchanged since round 1 (CR-001); passes with the new classifier |

### Round-2 temporary scaffolding and cleanup

- `ac003-compare.test.ts` was extended to run Gemini on both runtimes (round-1 version kept as `ac003-compare.round1.test.ts`). It was copied into `autobyteus-ts/tests/_ac003/` for the run and removed afterwards.
- The AC-010 probe was copied into `autobyteus-ts/tests/_ac010/` for the run and removed afterwards.
- The two source histories were copied read-only into `/tmp`; the copies are removed after this round. The user's `~/.autobyteus` was not modified.
- The `live-e2e-harness.ts` fixture edit for the 4,096 probe was reverted (`git status` clean for `test-support/`).
- `autobyteus-server-ts/db/test.db` (gitignored) keeps the 10 secrets imported earlier with `pnpm secrets:import` from the user's `.env`.

### Round-2 confidence

| Category | Round 1 | Round 2 | Basis |
| --- | --- | --- | --- |
| Requirement and AC proof | 86% | 90% | F-1/F-2 resolved; AC-010 is Vertex-only |
| Changed-boundary directness | 96% | 96% | — |
| Cross-boundary realism | 96% | 96% | The desktop round was not repeated: IR-003 does not touch UI or metering, and the Settings card was unchanged |
| Environment fidelity | 94% | 90% | Gemini API key unusable (quota) |
| Failure / lifecycle | 88% | 88% | F-3 (small output limits now always block); F-4 |
| User surface / desktop | 95% | 95% | Carried from round 1 |
| Durable coverage quality | 93% | 94% | Classifier hardened; AC-010 and echo assertions added; CCR-E2E-003 is now intermittent until F-4 is resolved |

Overall: **93%** (90 + 96 + 96 + 90 + 88 + 95 + 94 = 649 / 7 = 92.7). Target 95% not met. Categories below 90%: failure/lifecycle (88%).

### Round-2 result

- **Fail.**
  - F-3: the repository's own real-provider scenario fails at HEAD.
  - F-4: the product writes a phantom open user request into some Gemini notes.
- F-1 and F-2 are resolved. AC-003 is ready for user review, with minor notes.
- Next recipient per `get_handoff_rules`: code_reviewer (failure-origin), with the durable test changes for proportional review.

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`. One live E2E file was added, one was migrated (CR-001), and the shared live harness was extended (opt-in).

## Investigation And Execution Basis

- Coverage investigation artifact: `api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`, with these deviations:
  1. **Settings cleanup.** The plan was to delete the lowered compaction settings after each case. Predefined settings cannot be deleted (`deleteServerSetting` refuses them), so cases inherited the lowered trigger. Each case now sets an explicit high trigger at its start, then a low trigger sized from the observed history.
  2. **Trigger sizing.** A context override below Opus' 128k max output leaves no input budget. This made the run hang, a pre-existing defect (DEF-C below). The final sizing is an override of maxOutput + 256 + 4H with ratio 0.2125, so the trigger sits at 0.85H, where H is the observed prompt.
  3. **IR-002 mid-round.** SR-006/IR-002 changed the cached instruction during the round. The harness's mode marker was rebased on the instruction's first line, with an emptiness guard. AC-003 was rerun on the IR-002 wording, with IR-001 kept as an optional reference, as SR-006 requires.
  4. **Desktop history size.** The first desktop run had a history too small for this agent's fixed context (~15.6k system + tools). It was blocked correctly with `target_unattainable`. The second run used a ~102k history and passed.
- Existing coverage decisions revised during execution:
  - OLR-E2E-010 migrated (CR-001).
  - The `test-support/live-e2e` harness semantics went from Unclear to Still Valid (validated live).
- Reroute required: `Yes`. Two findings are not local to tests:
  - **C-010:** the Gemini transcript fallback loses the summary prompt. This is a regression from this change.
  - **AC-003:** the cached summary is worse on 2 checklist items. Under the AC-003 rule this goes to the Solution Designer, and the user decides.

## Test-Case Ledger Reconciliation

- Ledger path: `api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`. Rows 1–17; each live case writes its JSON results immediately.
- Long-running checkpoints: `Yes` (CCR rounds 1–7, AC-003 runs, desktop runs)
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: row 17 (repository checks on `8d0a98eb5`)
- Cases still running, interrupted, or not started: none

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| CCR-E2E-001 | Pass | row 10 (round 7) | `api-e2e-evidence/live-ccr-run-7/` | — |
| CCR-E2E-002 | Pass | row 10 | same | — |
| CCR-E2E-003 | Pass | row 10 | same | Gemini cached path; the first attempt was rejected and the second accepted |
| OLR-E2E-010 | Pass | row 11 | `api-e2e-evidence/live-olr010/` | CR-001 done |
| RE2E-DS | Pass (with an observation) | row 12 | `api-e2e-evidence/real-e2e-*` | Summary length is bounded by the agent's own `max_tokens` (OBS-1) |
| AC3-CMP | **Fail (AC-003 rule)**, for user review | row 7 | `ac003-summary-quality-report.md`, `api-e2e-evidence/ac003/` | Solution Designer + user decision |
| C010-GEM | **Fail (product regression)** | row 5 | `api-e2e-evidence/ac003/run-4-ir002-A/ac003-results.json` (`c010`, `geminiBodies`) | Failure-origin review |
| DSK-CCR | Pass | rows 14–16 | `api-e2e-evidence/electron/` | — |

## Compatibility / Legacy Scope Check

- Requirements/design introduce compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed: `No`. The desktop card shows no model option. The leftover setting is inert (existing unit and GraphQL coverage).
- Approved persisted-data transition followed: `Yes` (Directly Usable). AC-003 restored real v5 snapshots into a `MemoryManager` unchanged.
- Durable coverage for compatibility-only behavior: `No`

## Changed Boundary And Evidence Matrix

"Strict" means the test harness sent the Anthropic request with beta `thinking-binding-controls-2026-08-01` and `thinking.block_binding.prefix_mismatch_behavior: "error"`. Any prefix change under kept thinking then returns 400.

**CCR-E2E-001 — AC-001 (live), AC-002, AC-007, QR-001** · Opus 5.5 compaction through the real studio server, strict · Live, durable · **Pass**
- Evidence: `live-ccr-run-7/case-results.json` and `calls-full.json`.
- Compaction ran at the `before_parent_request` site: requested in T3, executed at T4's start.
- The summary request equals the agent's previous request plus the IR-002 instruction: same system, tools, model, `max_tokens`, thinking config and `cache_control`, with an identical block prefix.
- **Cache read 42,333 / 42,942 = 98.58 %.** All 33 kept thinking blocks were replayed, and strict mode accepted the request on the first attempt (`end_turn`).
- `completed`, 1 attempt, summary 880 tokens. The run continued: the next request is the compacted context (10,306 input tokens) and carries `## Goal and constraints`.
- Meter: the `autobyteus_compaction` frame cache read equals the provider's (42,333). The GraphQL run summary has 29 reports, equal to 29 provider calls, and the cache-read sum matches.

**CCR-E2E-002 — AC-006, REQ-006** · Tools changed between turns, then compaction, strict · Live, durable · **Pass**
- `DEFAULT_IMAGE_GENERATION_MODEL` was changed to `imagen-4` between T3 and T4, and compaction ran at T4.
- The summary request carries **0 thinking blocks** (32 before) and the new tools (including `imagen-4`).
- Strict mode returned **200, no 400**. Compaction completed and T4 continued.

**CCR-E2E-003 — AC-008, REQ-002** · Gemini 3.8 Flash (Vertex Express) compaction · Live, durable · **Pass**
- Cached summary requests: the first attempt was rejected by the validator and the second accepted, which is within the retry budget.
- Implicit cache read was 90.9 %.
- Metered as `autobyteus_compaction`. After compaction the agent answered the recall question correctly (`4900`).

**OLR-E2E-010 (CR-001) — REQ-004, AR-004 intent** · Summary cut by the run's own `max_tokens` (DeepSeek, 96) · Live, durable (migrated) · **Pass**
- 5 summary calls, in mode order `[cached, cached, transcript, transcript, transcript]`. All were streamed with `max_tokens: 96` and all ended with `length`.
- Status frames `incomplete`/`length`, then `COMPACTION_BLOCKED`.

**RE2E-DS — migrated `test-support/live-e2e` harness** · `pnpm test:e2e:real -- --scenarios=deepseek.compaction-agent-flow` with keys imported by `pnpm secrets:import` from the user's `.env` · Real-e2e runner · **Pass (3/3)**
- `summaryOnAgentModelVerified`, `summaryRequestFramingVerified` and `summarySourceToolTailVerified` are true. `summaryModes` is reported.
- **OBS-1:** in the agent flow, both cached attempts were `incomplete`: they were cut at the scenario agent's own `max_tokens: 1024`. The transcript fallback was then accepted. A summary inherits the agent's output limit, so an agent configured with a small `max_tokens` will usually fall back, or block as in OLR-E2E-010. This follows from REQ-001/004 (the agent's own request); recorded for the Solution Designer.

**AC3-CMP — AC-003, REQ-003, SR-005/SR-006** · Side-by-side on real histories (Opus 5.5) through the product's `LlmPhaseSummaryPort`, `prepareCompaction`, validator and commit, then continuation · Temporary harness · **Fail (AC-003 rule) → user review**
- History A: 464,106 tokens (meets ≥ 200k). History B: 194,548 tokens (second sample).
- The cached IR-002 summary is better or equal on most checklist items, but **worse on 2**:
  - **A:** it repeats the agent's unverified claim that test failures were "pre-existing / unrelated" and that tests were "verified". The run had actually timed out.
  - **B:** it drops an earlier finding (Retrospective Skill Improver intentionally visible) that conflicts with a later recommendation. The cached-context continuation then missed the conflict; the transcript-context continuation flagged it.
- The IR-001 reference wording shows the same 2 weaknesses, so they come from the cached approach, not from the IR-002 rewrite.
- SR-006 items:
  - blocked items stay blocked: Pass;
  - user instructions are kept distinct from quoted text: Pass;
  - not over-compressed: Fail on B (the dropped finding);
  - phases kept separate: Pass, with A marked acceptable (~);
  - resolved items not listed as pending: Pass.
- Cost:
  - A: transcript ≈ $0.08 vs cached (warm) ≈ $0.12;
  - B: transcript ≈ $0.37 vs cached ≈ $0.10.
- Full report: `ac003-summary-quality-report.md`.

**C010-GEM — C-010 (reviewer question), REQ-004 on Gemini** · Gemini transcript-fallback request body · Temporary harness · **Fail: product regression from this change**
- The transcript request has `systemInstruction` = the agent's own system prompt (7,461 chars), and `systemInstructionHasSummaryPrompt: false`.
- `contents` hold one message: the rendered transcript only. The v5 `COMPACTION_SUMMARY_PROMPT`, sent as a SYSTEM message, is dropped by the Gemini renderer.
- The reply does not parse as a summary (`parsed: false`). The cached request on Gemini parses.
- **Origin:**
  - Base `e50826755` built a separate compaction LLM with `config.systemMessage = COMPACTION_SUMMARY_PROMPT` (`autobyteus-server-ts/src/agent-execution/compaction/compaction-llm-factory.ts:32`), so Gemini received the prompt as `systemInstruction`.
  - Now the fallback runs on the agent's LLM. `gemini-llm.ts:142/182` takes `systemInstruction: this.systemMessage` (the agent prompt), and the renderer drops SYSTEM messages.
- **Impact:** the REQ-004 same-model fallback is ineffective on Gemini (API and Vertex). Any Gemini compaction whose 2 cached attempts fail will burn 3 transcript attempts and block.
- Scope: among the API adapters, only `gemini-llm.ts` builds the request's system prompt from `config.systemMessage` (`grok-llm.ts` only copies the config). The other adapters keep the request's SYSTEM messages, so the transcript prompt reaches them; DeepSeek was proven live (OLR-E2E-010, RE2E-DS).

**DSK-CCR — AC-005, AC-007, AC-002 in the product** · Packaged desktop app (isolated instance) built from `8d0a98eb5`; keys via `pnpm secrets:import` from the user's `.env` · Desktop, user-like · **Pass**
- **AC-005:** the Settings → Compaction card has only the trigger ratio, the effective context override and detailed logs, with the text "Compaction always summarizes with the agent's own model." There is no model option.
- **Run 1** (21 % / 262,252, H = 33.5k): blocked with `target_unattainable` and shown as "Held — waiting for compaction" then "Compaction failed — send a message to retry". This is correct behavior; the history was too small for this agent.
- **Run 2:** Daily Assistant, `claude-opus-5-5 · AutoByteus`, Summarized thinking; trigger set in the **Settings card** (21 % / 537,316).
  - T3 crossed (102,525) and requested compaction; T4 executed it.
  - Call `turn_0004:compaction:…_1:1`, `autobyteus_compaction`: **cache read 104,278 / 104,862 = 99.44 %**, output 962, $0.045. Completed on attempt 1.
  - The chat shows "Memory compacted · COMPLETED". T4's prompt fell to 18,677 tokens, and it answered `CODE: B03-11` correctly from compacted memory.
  - The Token Meter equals the sum of all 9 frames: cache hits 492,081, writes 94,416, uncached 28, output 3,986, $0.9336.
  - Token Statistics shows 765,349, equal to run 1 + run 2 exactly.

**AC-004, AC-009, AC-001 (unit), AC-005 (unit), AC-006/007 (unit)** · Durable unit/integration (existing) · **Pass**
- Core 1956/1956 on `8d0a98eb5`; server unit 5232 (on IR-001; IR-002 is core-only, and the one server test that imports the prompt was rerun: 10/10).
- Web card specs 8/8.

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-ts exec tsc --noEmit -p tsconfig.build.json` | worktree, `8d0a98eb5` | Core typecheck | Pass | `api-e2e-evidence/core-tsc-build-ir002.log` |
| 2 | `pnpm -C autobyteus-server-ts typecheck`; `tsc -p tsconfig.json --noEmit` (includes tests) | worktree, `8d0a98eb5` | Server source + changed test files | Pass; 0 type errors (TS6059 rootDir notices only) | `api-e2e-evidence/server-typecheck-ir002.log` |
| 3 | `env -i … pnpm -C autobyteus-ts exec vitest run tests/unit` | worktree, `8d0a98eb5` | Core unit | 305 files / 1956 tests Pass | `api-e2e-evidence/core-unit-ir002.log` |
| 4 | `pnpm -C autobyteus-server-ts test:unit` | worktree, `faee47a48` | Server unit | 666 files / 5232 Pass | `api-e2e-evidence/server-unit.log` |
| 5 | `vitest run tests/unit/secret-management/live-e2e-compaction-boundary.test.ts` | `autobyteus-server-ts`, `8d0a98eb5` | Server test that imports the prompt | 10/10 Pass | `api-e2e-evidence/server-unit-ir002-focused.log` |
| 6 | `pnpm test:nuxt run components/settings/__tests__/{CompactionConfigCard,ServerSettingsCompactionFailure}.spec.ts` | `autobyteus-web` | Card spec | 8/8 Pass | `api-e2e-evidence/web-compaction-card.log` |
| 7 | `env -i PATH HOME=<temp> RUN_COMPACTION_CACHE_E2E=1 ANTHROPIC_API_KEY VERTEX_AI_API_KEY=<from the user's server .env, in-process, not logged> COMPACTION_CACHE_E2E_EVIDENCE_DIR=… vitest run tests/e2e/runtime/autobyteus-compaction-cache-reuse-live.e2e.test.ts` | `autobyteus-server-ts` | CCR-E2E-001..003 | 3/3 Pass (round 7) | `live-ccr-run-7/`, `live-ccr-run-7.log` |
| 8 | `RUN_NATIVE_OUTPUT_LIMIT_E2E=1 DEEPSEEK_API_KEY=… vitest run …output-limit-recovery-live.e2e.test.ts -t OLR-E2E-010` | `autobyteus-server-ts` | OLR-E2E-010 | Pass | `live-olr010/`, `live-olr010.log` |
| 9 | `pnpm test:e2e:real:preflight`; `pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url file:…/autobyteus-server-ts/db/test.db`; `node test-support/live-e2e/run-live-e2e.mjs --scenarios=deepseek.compaction-agent-flow` | worktree | Migrated harness | 3/3 Pass | `real-e2e-*.log` |

## Validation Confidence Scorecard

| Confidence Category | Post-Repository | Final | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 55% | 86% | +31 | AC-002/005/006/007/008 proven live (strict) and in the product; AC-001/004/009 unit plus wire capture | AC-003 fails its rule on 2 items (user decision); REQ-004 fallback broken on Gemini (C-010) |
| Changed-boundary execution directness | 55% | 96% | +41 | Real request bodies of cached and transcript requests at the wire; provider acceptance and usage | — |
| Cross-boundary integration realism and mock gap | 50% | 96% | +46 | Real studio server, WebSocket, GraphQL, native runtime, file memory; packaged desktop app with the Settings card and Token Meter | — |
| Environment, configuration, identity, and fixture fidelity | 65% | 94% | +29 | Keys from the user's `.env` via the importer or the test vault; real ≥ 200k histories; user-like Settings changes | Strict mode is a harness-only beta (proven enforcing in the previous ticket's APC-E2E-008) |
| Failure, edge-case, lifecycle, and recovery evidence | 55% | 88% | +33 | Retry budget (Gemini 2nd attempt), length cut → fallback → block, `target_unattainable` block in UI, tools change under strict mode | C-010 breaks the transcript fallback on Gemini; pre-existing DEF-C hang |
| User-surface, browser, and desktop-shell confidence | 40% | 95% | +55 | Card without a model option; compaction shown in chat; meter and statistics equal the frame sums | Meter has no per-kind breakdown (not required) |
| Durable regression coverage quality and relevance | 70% | 93% | +23 | New gated CCR suite (3 cases, per-call evidence, meter reconciliation); OLR-E2E-010 migrated; harness extension opt-in | Live, paid and gated; no durable test pins C-010 (it fails today) |

- Overall post-repository confidence: 56%
- Overall final confidence: **93%** (simple average of 7 categories: 86 + 96 + 96 + 94 + 88 + 95 + 93 = 648 / 7 = 92.6)
- Every critical acceptance criterion directly proven: `No`. AC-003 needs the user's decision; REQ-004 fails on Gemini.
- Any final applicable category below 90%: `Yes`. AC proof is 86 % and failure/recovery is 88 %, both because of C-010 and AC-003.
- Default 95% target met: `No`
- Confidence-limiting residual risks: C-010, the AC-003 decision, DEF-C (pre-existing), OBS-1.

## Broader Validation Decision And Execution

- Decision: `Required`. Executed as planned:
  - Live API through the real studio server (Anthropic strict, Gemini, DeepSeek);
  - a temporary AC-003/C-010 harness on the core port;
  - the packaged desktop app.
- Gap addressed: provider acceptance of the cached summary under strict prefix binding; real cache share; summary quality on real histories; the real UI card, chat status and meter.

## Platform / Runtime Targets

- macOS (Darwin 25.5), Node 22, Vitest 4.0.18
- Models:
  - `claude-opus-5-5` (first-party Anthropic API);
  - `gemini-3.8-flash` (Vertex Express);
  - DeepSeek chat.
- Desktop: packaged AutoByteus.app (mac-arm64) built from `8d0a98eb5` in an isolated instance.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved decision: `Directly Usable — No Migration`.
- Representative data: two real v5 working-context snapshots (read-only temp copies), restored into a `MemoryManager` and compacted through the product path. The originals were not touched, and the copies were deleted.
- Version-specific branch or fallback observed: `No`.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added or updated: `Yes` (uncommitted, in the worktree)

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-compaction-cache-reuse-live.e2e.test.ts` | Added; gated `RUN_COMPACTION_CACHE_E2E=1` | CCR-E2E-001..003: AC-001 (live), AC-002, AC-006, AC-007, AC-008 | 3/3 Pass (round 7); skips cleanly without the gate |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-output-limit-recovery-live.e2e.test.ts` | Updated (CR-001): OLR-E2E-010 drops the removed setting, cuts via the run's own `max_tokens` 96, finds summary calls by `summaryRequestMode`, asserts modes `[cached ×2, transcript ×3]` | REQ-004, AR-004 intent | Pass |
| `autobyteus-server-ts/tests/e2e/helpers/native-runtime-live-harness.ts` | Extended, opt-in: `strictAnthropicThinking`, `writeBodies`, per-call `usage` (Anthropic, OpenAI/DeepSeek, Gemini), `strictInjected`, exported `summaryRequestMode` (markers from `COMPACTION_SUMMARY_INSTRUCTION` / `COMPACTION_SUMMARY_PROMPT`, with an emptiness guard) | Shared live harness | Default behavior unchanged; used by both files above |

- Attached for proportional test-code review: `Yes`
- Removed paths: none

## Other Execution Artifacts

| Artifact Path (under `api-e2e-evidence/`) | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `live-ccr-run-7/` + log | Authoritative CCR evidence (bodies, usage, frames, case results) | Retained | No secrets |
| `live-ccr-run-1..6/` + logs | Earlier rounds (trigger sizing, settings inheritance, DEF-C) | Retained | History |
| `stall-probe/{head,base}-result.json` | DEF-C, HEAD vs base | Retained | — |
| `live-olr010/`, `real-e2e-*.log` | OLR-E2E-010, RE2E-DS | Retained | — |
| `ac003/` (`ac003-side-by-side.md`, `run-*/ac003-results.json`, `ac003-compare.test.ts`, `run-ir002.sh`, `ir001-instruction.txt`) | AC-003 and C-010 harness and results | Retained (harness source kept as evidence; not in the test tree) | Summaries derived from the user's histories; no secrets |
| `electron/` (screenshots 01–06, `run1-blocked-frames.json`, `run2-compaction-frames.json`, helper scripts) | Desktop evidence | Retained | — |
| `*-ir002.log`, `core-*.log`, `server-*.log`, `web-compaction-card.log` | Repository checks | Retained | — |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `ac003-compare.test.ts` copied to `autobyteus-ts/tests/_ac003/` for each run | AC-003/C-010 harness on the core port | `ac003/` | Removed after each run (none left) |
| Read-only copies of 2 snapshots in `/tmp/ac003-src*` | AC-003 source histories | — | Deleted |
| Temporary base worktree `/tmp/ccr-base-api` | DEF-C base comparison | Base-identical | Removed |
| Isolated desktop instance `iso-49759-f02d` | Desktop validation | `electron/` | Stopped; data root removed |
| Read-only `MessageEvent.data` observer in the instance renderer | Record `TOKEN_USAGE_UPDATED`/`COMPACTION_*` frames | `electron/run*-frames.json` | Gone with the instance |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Anthropic strict prefix binding | Test-only fetch wrapper adds the beta header and `block_binding: "error"` | Production does not send it; it makes prefix violations visible as 400s | None (enforcement proven previously, APC-E2E-008) |
| AutobyteusLLM host | Not used | No host configured | AC-009 release on AutobyteusLLM is unit-only (low) |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | CCR-E2E-001, 002, 003; OLR-E2E-010; RE2E-DS; DSK-CCR; repository checks | Cached summary request proven on Anthropic (strict, 98.6 % / 99.4 % cache read) and Gemini; tools change without a 400; metering exact; card without a model option |
| **Fail** | **C010-GEM** | Regression: the transcript fallback loses the summary prompt on Gemini, so REQ-004 is ineffective there |
| **Fail (AC-003 rule; user decision)** | **AC3-CMP** | The cached summary is worse on 2 checklist items (unverified claim kept; conflicting earlier finding dropped). Better or equal elsewhere and cheaper |
| Observation | OBS-1 | The summary inherits the agent's `max_tokens`; small limits force fallback or block |
| Out Of Scope (pre-existing, base-identical) | DEF-C, DEF-D | See below |

### Pre-existing defects found (TESTING Rule 9; not caused by this change; recommended separate tickets)

**DEF-C: a context override smaller than the model's max output hangs the run.**
- `CompactionPlanningBudgetError: could not derive a positive post-compaction target` → `AgentTurnRunner` "Recovered", and the run never returns to idle.
- Reproduced on HEAD and on base `e50826755` (`stall-probe/`).
- A user can reach it by entering a small "Effective context override".

**DEF-D: predefined compaction settings cannot be deleted.**
- `deleteServerSetting` refuses `AUTOBYTEUS_COMPACTION_TRIGGER_RATIO` and `AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE`, and the test harness ignored the refusal silently.
- Clearing the override through the card ("Leave blank to disable") was not tested.
- Low impact; noted only because it affected test isolation.

### Carried forward

- **CR-002 (design-record sync, code_reviewer):** `design-spec.md:254` and `:352` still describe the instruction as "`COMPACTION_SUMMARY_PROMPT` + fork suffix". IR-002 replaced that with its own instruction text.
- **Known risk (implementation handoff):** a compaction usage event carries `latest_prompt_tokens: null`, so the meter's latest-prompt reading is empty until the agent's next request. In the desktop run the next request followed immediately (latest prompt 20,432 / 537,316). Totals and cost were exact.

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Studio servers, runs, WebSockets (live suites) | Test-owned | `afterAll` terminate and close | Done |
| Temp HOME, app-data and workspace dirs | Test-owned | Removed | Done |
| AC-003 snapshot copies, `/tmp/ir001-prompt.ts`, `tests/_ac003`, `/tmp/ccr-base-api` | Mine | Removed | Done |
| Isolated desktop instance and its data root (imported keys) | Mine | `pnpm isolated-app stop iso-49759-f02d` | Stopped; `dataRootRemoved: true` |
| `autobyteus-server-ts/db/test.db` (real-e2e, 10 imported secrets) | Test-owned | Left in place for the real-e2e runner | Test DB only; `autobyteus-server-ts/.gitignore` ignores `/db/` |
| User app and data (`~/.autobyteus`) | Not touched | Snapshots read through temp copies only; `.env` read by the importer only | — |
| Untracked `*/dist/` folders in the worktree (Oct 9–10) | Not mine (predate this round) | Left alone | — |

## Preliminary Classification

- **C-010 → `Local Fix` candidate (implementation), with failure-origin review by code_reviewer.** Getting the summary prompt to Gemini needs an adapter or summarizer change. One option is to merge SYSTEM request messages into `systemInstruction` for this request; another is to send the prompt as user-content framing. If the reviewer finds the transcript request contract itself must change, it becomes `Design Impact` → Solution Designer.
- **AC-003 → `Requirement Gap` / user decision → Solution Designer.** The options are in `ac003-summary-quality-report.md`:
  - accept as is;
  - or add one instruction line (keep conflicting earlier findings; label unverified conclusions) and rerun the comparison.

## Latest Authoritative Result

**Round 5 (API-REV-005) is the latest authoritative result: Pass / 94.6 % (see § Round 5).** Earlier: round 2 (API-REV-002) superseded this section: Fail / 93% on F-3 and F-4; F-1 and F-2 are resolved. See § Round 2 at the top. The round-1 values are kept below.

- Result (round 1): **Fail**. Two items need owners; everything else passes.
- Final validation confidence: **93%**
- Default 95% target met: `No`
- Any final applicable category below 90%: `Yes` (AC proof 86 %, failure/recovery 88 %)
- Broader validation decision: `Required` → executed
- Critical acceptance criteria lacking direct proof: AC-003 (pending the user's decision); REQ-004 on Gemini (fails).
- Next recipient: per `get_handoff_rules`
- Notes:
  - measured cached-summary cache share: 98.58 % (server, strict) and 99.44 % (desktop);
  - Gemini 90.9 %.
