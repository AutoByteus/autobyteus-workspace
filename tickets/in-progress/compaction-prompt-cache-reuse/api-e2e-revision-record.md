# API/E2E Revision Record — compaction-prompt-cache-reuse

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code_reviewer / `code-review-report.md` CRR-001 (round 1), then CRR-002 for IR-002 | SR-005, SR-006, ARCH-REV-002, IR-001, IR-002, CRR-001, CRR-002 | N/A | Fail / 93% |
| API-REV-002 | code_reviewer / CRR-004 (round 2, IR-003 `1153984ee`) | SR-007, ARCH-REV-003, IR-003, CRR-003, CRR-004 | Fail / 93% | Fail / 93% (F-1, F-2 resolved; new F-3, F-4) |
| API-REV-003 | code_reviewer / CRR-007 (round 3, IR-004/IR-005 `97fd9a814`) | SR-008, SR-009, SR-010, ARCH-REV-005/006, IR-004, IR-005, CRR-006, CRR-007 | Fail / 93% | Fail / 92% (F-3, F-4, C-020 resolved; new F-5; DeepSeek gate fails) |
| API-REV-004 | code_reviewer / CRR-009 (round 4, IR-006 `090353579`) | SR-011, ARCH-REV-007, IR-006, CRR-008, CRR-009 | Fail / 92% | Fail / 94% (F-5/F-6 resolved except Sonnet B: new F-9) |
| API-REV-005 | code_reviewer / CRR-011 (round 5, IR-007 `097192731`) | SR-012, ARCH-REV-008, IR-007, CRR-010, CRR-011 | Fail / 94% | **Pass / 94.6%** |

## Revision Entries

### API-REV-001 — Baseline: live validation of the cached compaction summary

- **Triggering role and report:** code_reviewer, CRR-001 Pass. Assigned CR-001 plus the API/E2E items:
  - AC-002, AC-003, AC-006, AC-008;
  - C-010;
  - the migrated `test-support/live-e2e` harness;
  - the desktop card.
- **Mid-round revision:** CRR-002 (IR-002, `8d0a98eb5`) arrived during the round, carrying the SR-006 AC-003 additions and CR-002 for carry-forward.
- **Why recorded:** first completed API/E2E result.
- **Durable test paths changed (uncommitted in the worktree):**
  - added `autobyteus-server-ts/tests/e2e/runtime/autobyteus-compaction-cache-reuse-live.e2e.test.ts` (gated `RUN_COMPACTION_CACHE_E2E=1`);
  - updated `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-output-limit-recovery-live.e2e.test.ts` (OLR-E2E-010, CR-001);
  - extended `autobyteus-server-ts/tests/e2e/helpers/native-runtime-live-harness.ts` (opt-in).
- **Cases:**
  - Pass: CCR-E2E-001..003, OLR-E2E-010, RE2E-DS, DSK-CCR.
  - Fail: AC3-CMP (AC-003 rule) and C010-GEM.
- **Commands and environment:**
  - repository checks on `8d0a98eb5`;
  - live suites in a clean `env -i` with keys from `/Users/normy/.autobyteus/server-data/.env`, loaded in-process into the test-owned vault (the in-process suites reset their DB);
  - real-e2e runner and desktop app with keys imported by `pnpm secrets:import` from that `.env`;
  - isolated desktop instance driven with browser automation.
- **Execution history within the round:**
  - CCR rounds 1–2 (IR-001): a stall from an invalid trigger. Diagnosed as pre-existing DEF-C (base-identical).
  - Rounds 3–6 (IR-002): trigger sizing and settings inheritance (DEF-D) fixed.
  - Round 7: 3/3 Pass.
  - AC-003: runs 1–2 were invalid (envelope, unfair plan); run 3 is the IR-001 reference; runs 4A/4B are IR-002; run 5 is the IR-001 reference on B.
  - Desktop: run 1 was blocked correctly (history too small); run 2 passed.

#### Prior Failure Resolution

None. This is the first round.

- **Canonical artifacts and sections updated:**
  - `api-e2e-coverage-investigation.md` (results, scorecard, decision);
  - `api-e2e-execution-coverage-report.md`;
  - `api-e2e-test-case-ledger.md` (rows 1–17);
  - `ac003-summary-quality-report.md` (for the user).
- **Prior result and confidence:** N/A
- **Current result and confidence:** Fail / 93%
- **New or remaining failure IDs:**
  - **C-010:** a regression. The Gemini transcript fallback drops the summary prompt; base passed it as the compaction LLM's `systemMessage`.
  - **AC-003:** the cached summary is worse on 2 checklist items. User decision needed.
- **Observations and pre-existing defects:**
  - OBS-1: summary length is bounded by the agent's own `max_tokens`.
  - DEF-C: an override smaller than max output hangs the run (pre-existing).
  - DEF-D: predefined compaction settings are not deletable (pre-existing).
  - CR-002 carried forward (design-spec lines 254 and 352).
- **Recommended owners:**
  - C-010: code_reviewer for failure-origin review; likely an implementation local fix, or Design Impact if the transcript request contract must change.
  - AC-003: Solution Designer, with the user's decision.
  - DEF-C and DEF-D: separate tickets.
- **Remaining risks, blocked evidence, or untested scope:**
  - AC-009 release on AutobyteusLLM is unit-only (no host).
  - No durable test pins C-010; a fix should add one, for example a Gemini transcript-attempt case in the CCR suite.

### API-REV-002: Round 2 on IR-003 (nine-heading note, Gemini system prompt from the request)

- **Triggering role and report:** code_reviewer, CRR-004 Pass (full re-audit 9.35). The package answers API-REV-001 F-1/F-2. Items assigned to API/E2E:
  - AC-003 rerun on v4/v6;
  - AC-010 live (Gemini API and Vertex);
  - rerun of the cached-path live cases on `1153984ee`;
  - CR-003;
  - CR-001, which is verified in the post-API/E2E test review.
- **User instruction during the round:** judge, for each provider tested, whether the summary is good quality and better. Done for Anthropic, Gemini and DeepSeek.
- **Durable test paths changed (uncommitted):**
  - `autobyteus-server-ts/tests/e2e/helpers/native-runtime-live-harness.ts`: `summaryRequestMode` matched by position;
  - `autobyteus-server-ts/tests/e2e/runtime/autobyteus-compaction-cache-reuse-live.e2e.test.ts`: CR-003 headings, AC-010 assertions, `assertNoInstructionEcho`, header.
  - OLR-E2E-010 file unchanged.
- **Cases:** ledger rows 18–30.
  - Pass: repository checks; CCR-E2E-001..003 (r3-final); OLR-E2E-010; AC-003 Opus; AC-010 on Vertex Express.
  - Fail: RE2E-DS (F-3); CCR-E2E-003 in r1/r2 (F-4).
  - Blocked: AC-010 on the Gemini API key (429 quota).
  - Judged per provider: Opus better; DeepSeek equal or better; Gemini not better.
- **Commands and environment:**
  - keys loaded in-process from `/Users/normy/.autobyteus/server-data/.env` (test vault / env), or already imported into `autobyteus-server-ts/db/test.db` with `pnpm secrets:import`;
  - `autobyteus-ts/dist` checked against HEAD;
  - source histories copied read-only to `/tmp`.

#### Prior Failure Resolution

| Prior Failure | Resolution Evidence | Status |
| --- | --- | --- |
| F-1 (C-010 Gemini transcript prompt lost) | Vertex Express: transcript `systemInstruction` = `COMPACTION_SUMMARY_PROMPT`, replies parse (A, B, probe); agent and cached requests carry the agent prompt (probe + CCR-E2E-003 assertions) | Resolved (Vertex); Gemini API key blocked by quota |
| F-2 (AC-003 two worse items) | Opus rerun: weakness B fixed in the note and the continuation; weakness A fixed in the continuation (one contradictory duplicate remains in the note) | Resolved, for user review |
| CR-003 | Test checks all `COMPACTION_SUMMARY_HEADINGS` | Resolved |

- **Canonical artifacts updated:**
  - execution report (§ Round 2);
  - ledger (rows 18–30);
  - quality report (§ Round 2 and § Per-provider judgment);
  - this record;
  - investigation (post-execution note).
- **Prior result and confidence:** Fail / 93%
- **Current result and confidence:** Fail / 93%
- **New or remaining failure IDs:**
  - **F-3:** the repository's real-provider scenario `deepseek.compaction-agent-flow` fails at HEAD. The nine-heading note does not fit the scenario agent's `max_tokens: 1_024`: 5/5 attempts `length`, then blocked. It passes at 4,096.
  - **F-4:** a Gemini note can record the compaction instruction as an open user request (2/3 live runs).
- **Recommended owners:**
  - F-3: owner decision between a scenario fixture change (implementation) and a design response for small agent output limits (Solution Designer).
  - F-4: Solution Designer (instruction wording).
  - Gemini quality ("not better"): Solution Designer, together with the user.
- **Remaining risks:**
  - The Gemini API key has no usable quota.
  - AC-003 still uses single samples per context.
  - Desktop not repeated: IR-003 does not touch UI or metering.

### API-REV-003: Round 3 on IR-004/IR-005 (per-model mode, fitted summary output limit, instruction v5)

- **Trigger:** code_reviewer CRR-007 Pass (9.35). Items assigned to API/E2E:
  - AC-003 v5 on Opus, one other Anthropic model and DeepSeek (the REQ-002 gate);
  - AC-011 live;
  - F-4 on Gemini (transcript-only);
  - AC-010 on the Gemini API key;
  - C-020 / CR-001 (OLR-E2E-010).
- **Durable test paths changed (uncommitted):**
  - `autobyteus-server-ts/tests/e2e/runtime/autobyteus-compaction-cache-reuse-live.e2e.test.ts`: CCR-E2E-003 transcript-only; new CCR-E2E-004;
  - `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-output-limit-recovery-live.e2e.test.ts`: OLR-E2E-010 re-scoped.
- **Cases:** ledger rows 31–38.
  - Pass: repository checks; CCR-E2E-001..004; OLR-E2E-010; RE2E-DS (AC-011); Opus AC-003.
  - Blocked: AC-010 Gemini API key (quota).
  - Fail: F-5; DeepSeek gate (gap A).
  - Inconclusive: Sonnet family check.

#### Prior Failure Resolution

| Prior Failure | Resolution Evidence | Status |
| --- | --- | --- |
| F-3 | Real-provider scenario at 1,024 passes; CCR-E2E-004 (16,384 on the wire, cache read 96.9 %); OLR-E2E-010 (15,000 on the wire) | Resolved |
| F-4 | Gemini transcript-only, no echo; no Opus echo | Resolved |
| C-020 / CR-001 | OLR-E2E-010 asserts the fitted limit and the per-model sequence | Resolved (re-scoped) |

- **Current result and confidence:** Fail / 92%
- **New failure:** **F-5.** The v6 transcript prompt loses the summary-block markers: Sonnet 5 0/8, DeepSeek 3/9 parsed. The base v5 prompt kept them (Sonnet 3/3), so this is a regression from SR-007/IR-003.
- **Gate results:**
  - DeepSeek fails on gap A (by REQ-002 → transcript), but its transcript path is unreliable until F-5 is fixed.
  - Sonnet 5 shows gap A, and there is no valid transcript to compare against.
- **Recommended owners:** Solution Designer for F-5 (prompt or parser rule), the DeepSeek catalog value and the Sonnet family question, via code_reviewer failure-origin review.
- **Remaining risks:**
  - Gemini API key quota;
  - single samples per context;
  - the real-provider harness cannot see per-request output options (the wire limit is covered by CCR-E2E-004 and OLR-E2E-010).

### API-REV-004: Round 4, SR-011 release bar (parser accepts a summary without markers)

- **Trigger:** code_reviewer CRR-009 Pass. Items:
  - the SR-011 transcript-only bar (Sonnet 5 and DeepSeek, A/B, within 3 attempts; no regression on Opus or Gemini);
  - AC-010;
  - then the test review.
- **Durable test change:** `autobyteus-compaction-cache-reuse-live.e2e.test.ts` gains `expectStrictWhenThinking` (strict mode asserted exactly when the request carries a `thinking` parameter) and a model-neutral CCR-E2E-001 name.
- **Cases:** ledger rows 39–45.
  - Pass: everything except Sonnet B.
  - Blocked: AC-010 (Gemini API key quota).
- **Prior failure resolution:** F-5 (summaries without markers rejected) is resolved by the parser rule for DeepSeek A/B and Sonnet A.
- **Current result and confidence:** Fail / 94%
- **New failure F-9:** Sonnet 5's transcript summary of history B fails 6/6 attempts. Each is a complete summary with `(none) — explanation` under "Files created or changed", which the validator rejects.
- **Owner:** Solution Designer via failure-origin review (parser `(none)` rule or prompt).
- **Remaining:** AC-010 Gemini API key; N-3 not observed.

### API-REV-005: Round 5, F-9 rerun and final runs (Pass)

- **Trigger:** code_reviewer CRR-011 Pass (IR-007: an explained empty section is accepted).
- **Durable test paths changed:** none this round. The full set is listed in the execution report § Round 5 for the post-API/E2E test review.
- **Cases:** ledger rows 46–50. All pass except AC-010 on the Gemini API key (blocked by quota).

#### Prior Failure Resolution

| Prior Failure | Resolution Evidence | Status |
| --- | --- | --- |
| F-9 | Sonnet 5 transcript B accepted on attempt 1 (`(none) — …`); A accepted on attempt 1 | Resolved |

- **Current result and confidence:** **Pass / 94.6%**. No category is below 90.
- **Remaining:**
  - AC-010 Gemini API key (quota);
  - AC-003 user review before release;
  - the gap-A follow-up Task;
  - N-3 not observed.
- **Next:** proportional test-code review by code_reviewer.
