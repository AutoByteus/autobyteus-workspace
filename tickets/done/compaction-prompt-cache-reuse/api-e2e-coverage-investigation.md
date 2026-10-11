# API/E2E Coverage Investigation — compaction-prompt-cache-reuse

## Investigation Meta

All paths below are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/`.

- Requirements Doc: `requirements-doc.md`. Approved baseline SR-002; SR-005 at intake, **SR-006** during the round.
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-004)
- Supplemental Task Artifacts: `probes/`. Evidence only; `fork-summary-probe.mjs` is the live recipe.
- Design Review Report: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, Pass 9.35, with CR-001 assigned to API/E2E)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: code review pass CRR-001 from `/software_engineering_team/code_reviewer`
- Prior Investigation Reviewed: N/A
- Code under validation: branch `codex/compaction-prompt-cache-reuse` @ `faee47a48` at intake (implementation `cec24ca48`, merge `846fff306`). **Final: `8d0a98eb5`** (IR-002, CRR-002); all authoritative live, AC-003 and desktop evidence is on it.

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review)
- Proportional test-code review decision: `Required` (CR-001 migration plus the new and extended durable live tests)

## Current Requirement And Design Basis

What must be proven:

- **The cached summary request** (REQ-001). It is the agent's own conversation request, byte-identical, plus one appended instruction. It is sent on the agent's LLM with the conversation cache scope (AC-001 unit; AC-002 live: cache read ≥ 90% of input, summary parses, run continues, meter shows the `autobyteus_compaction` call).
- **Summary quality and continuation** (REQ-003, AC-003, SR-005).
  - Side-by-side comparison with the transcript summarizer on one real history of ≥ 200k tokens, on Opus 5.5.
  - Continuation check from both compacted contexts.
  - The user accepts the report before release. A worse cached result goes back to the Solution Designer.
- **Same-model fallback** (REQ-004, AC-004 unit): 2 cached attempts, then 3 transcript attempts, each exactly one provider call.
- **Isolation** (AC-009 unit): per-attempt conversation ids, released after each attempt.
- **Setting removed** (REQ-005, AC-005): web/server unit tests, plus the desktop Settings card.
- **Prefix guard before and after compaction** (REQ-006, AC-006). Unit, plus live: change tools before a compaction turn under strict `"error"` mode, expect no 400.
- **Metering** (REQ-007, AC-007). Unit, plus live meter, plus user verification.
- **All native providers** (REQ-002, AC-008). Live on Anthropic and one other provider.
- **Reviewer items:**
  - CR-001: migrate OLR-E2E-010.
  - C-010: on the transcript fallback, the summary prompt sits beside the adapter's own system instruction (Gemini `systemInstruction`).
  - Validate the migrated `test-support/live-e2e` harness semantics.
  - Desktop: the Settings card has no model option.

## Supported Scenarios And Real Usage

- **Designer scenarios covered:**
  - SCN-001: a native agent reaches compaction (Anthropic Opus 5.5, Gemini, DeepSeek).
  - SCN-002: Settings → Compaction (desktop).
  - SCN-003: fallback, unit-proven. Transcript requests are also exercised live directly through the port for the AC-003 comparison and C-010.
- **Real-use scenarios added:**
  - **Trigger-ratio change during a run.** The user lowers the trigger ratio in Settings while a run is open. The core resolves compaction settings from the environment on every LLM phase (`llm-phase.ts:98`), and `updateServerSetting` applies the value to the running server. This places compaction at a chosen turn, as a user's settings change would.
  - **Tools change, then compaction** (AC-006). Settings → default image model is changed between turns. The next turn compacts before its own request.
- **Contrived scenarios not tested:** none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 cached summary request on the agent's LLM, then same-model fallback | Changed | REQ-001..004 | Unit (existing) + live wire capture (Anthropic strict, Gemini, DeepSeek) + AC-003 comparison |
| BEH-001 isolation (`compaction_<op>_<n>`, release) | Added | AC-009 | Unit (existing). API providers ignore the id. AutobyteusLLM is not live-testable (no AutoByteus LLM host) → unit-only |
| BEH-002 setting removed | Removed | REQ-005 | Unit + GraphQL e2e (existing) + desktop card check |
| BEH-003 compaction metered | Added | REQ-007 | Unit + live `TOKEN_USAGE_UPDATED` `autobyteus_compaction` + GraphQL run summary |
| BEH-004 guard before and after compaction | Changed | REQ-006 | Unit + live strict AC-006 |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | summarizer, port, executor, assembler binding | Core unit (summarizer, port, executor, integration) | Provider behavior on the fork (instruction-following, cache read, preserved thinking) | Live API |
| API / transport / contract | Yes | Provider request bodies of the cached and transcript summary | Port test compares real Anthropic bodies with a mocked client | Real cache hits; strict acceptance; Gemini system-instruction placement | Live API |
| Frontend component / state | Yes | Compaction card without the model control | Web component spec | Rendered packaged app | Desktop instance |
| Browser integration / user journey | No | — | — | — | — |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer | Yes (card) | Settings page | Web spec | Rendered card | Desktop |
| Desktop shell | No | — | — | — | — |
| Process / lifecycle | Yes | Compaction at settled points; run continues after commit | Integration tests (scripted LLM) | Real provider continuation after the commit | Live |
| Persisted-data transition | Yes | Leftover setting value inert | Server unit + GraphQL e2e | — | None needed |
| Worker / queue | No | — | — | — | — |
| External integration | Yes | Anthropic, Gemini, DeepSeek | None live | Everything provider-side | Live API |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse`
- Stack: pnpm TypeScript monorepo, Vitest. The core is `autobyteus-ts`, the server `autobyteus-server-ts`, the web app `autobyteus-web`.
- Testing guideline: `TESTING.md` (root). No closer guideline exists.
- Secrets: Anthropic, DeepSeek, Gemini/Vertex and OpenAI keys exist in the user's server `.env`. The user permitted using that key file for testing (previous tickets and this team's practice). Keys are passed in-process to test-owned vaults or the importer, and never logged.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Layers, rules | Unit/integration baselines; real-provider E2E; isolated desktop; Rule 2 (never the user's app/data); Rule 9 |
| `autobyteus-server-ts/tests/e2e/helpers/native-runtime-live-harness.ts` | Shared live harness | Real studio server in-process, request recorder, settings helpers |
| `test-support/live-e2e/run-live-e2e.mjs`, `live-e2e-scenarios.mjs` | Real-provider runner | `pnpm test:e2e:real -- --scenarios=deepseek.compaction-agent-flow`; DB from `.env.test` (`server/db/test.db`), keys via `pnpm secrets:import` |
| `autobyteus-ts/src/memory/compaction/compaction-runtime-settings.ts` | Trigger settings | Resolved per LLM phase from env (`AUTOBYTEUS_COMPACTION_TRIGGER_RATIO`, `AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE`) |
| `docs/isolated-app-instances.md` | Desktop | `pnpm isolated-app start --build`, importer, browser-automation |

## Persisted Data Transition Coverage Basis

- Decision: `Directly Usable — No Migration`. The leftover setting value is inert; the compaction output shape is unchanged.
- Evidence: existing server settings unit test + GraphQL e2e. A live run does not need a leftover value.
- Reroute: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/memory/compaction-summarizer.test.ts` | Attempt budget and classification | AC-004 | Still Valid | Code review | Keep |
| `autobyteus-ts/tests/unit/agent/loop/llm-phase-summary-port.test.ts` | Real Anthropic request-body equality; isolation and release | AC-001, AC-009 | Still Valid | Code review | Keep |
| `autobyteus-ts` assembler, executor, integration tests | Guard order; lifecycle | AC-006 | Still Valid | — | Keep |
| server `token-usage-compaction-ingestion.test.ts` | Compaction events fold into totals | AC-007 | Still Valid | — | Keep |
| server settings unit + GraphQL e2e; web `CompactionConfigCard` spec | Setting removed, leftover inert | AC-005 | Still Valid | — | Keep |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-output-limit-recovery-live.e2e.test.ts` › OLR-E2E-010 | Sets the removed `AUTOBYTEUS_COMPACTION_MODEL_SETTINGS` (max_tokens 24); picks compaction calls with `!call.stream` | AR-004 intent (incomplete summary rejected) | **Needs Update (CR-001)** | Code review CR-001; the setting is deleted, and compaction now streams on the agent's LLM | Migrate: cut via the run's own `max_tokens`; identify compaction calls by request shape |
| `test-support/live-e2e/live-e2e-harness.ts` + `real-e2e-compaction-quality.e2e.test.ts`, `real-e2e-provider-capabilities.e2e.test.ts` | Migrated `summary*` evidence | Harness semantics | **Unclear → validate by running** | Not run live after migration | Run `deepseek.compaction-agent-flow` |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable |
| --- | --- | --- | --- | --- |
| CCR-E2E-001 | Opus 5.5 compaction on the cached summary request; cache read ≥ 90%; parse; continue; meter | AC-002, AC-007, QR-001 | `autobyteus-server-ts/tests/e2e/runtime/autobyteus-compaction-cache-reuse-live.e2e.test.ts` (gated `RUN_COMPACTION_CACHE_E2E=1`) | Provider cache behavior; rerun on core, adapter or SDK changes |
| CCR-E2E-002 | Tools changed (media default model) then compaction under strict mode: no thinking in the fork, no 400 | AC-006, REQ-006 | same | Preserved-thinking contract |
| CCR-E2E-003 | Gemini (Vertex Express) compaction: mode, parse, continue | AC-008 | same | Second provider |
| Harness extension | Strict Anthropic option + raw usage capture in `native-runtime-live-harness.ts` (opt-in) | AC-002/006 | `autobyteus-server-ts/tests/e2e/helpers/native-runtime-live-harness.ts` | Shared, opt-in; default behavior unchanged |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Evidence | Notes |
| --- | --- | --- | --- | --- |
| OLR-E2E-010 (CR-001) | `autobyteus-native-output-limit-recovery-live.e2e.test.ts` | Remove the setting; set the run's own `max_tokens` (DeepSeek) small enough to cut a summary but not an "ok" reply; select compaction calls by the summary instruction or prompt in the body; keep the `incomplete`/`length` and blocked assertions; update the header comment | CR-001; REQ-005; AR-004 intent | — |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-ts exec tsc --noEmit -p tsconfig.build.json` | root | core typecheck | Pass (`8d0a98eb5`) | `api-e2e-evidence/core-tsc-build-ir002.log` |
| 2 | `pnpm -C autobyteus-server-ts typecheck` (+ `tsc -p tsconfig.json` for test files) | root | server typecheck | Pass; 0 type errors in changed test files | `api-e2e-evidence/server-typecheck-ir002.log` |
| 3 | `env -i … pnpm -C autobyteus-ts exec vitest run tests/unit` | root | core unit | 1956/1956 Pass (`8d0a98eb5`) | `api-e2e-evidence/core-unit-ir002.log` |
| 4 | `pnpm -C autobyteus-server-ts test:unit` | root | server unit | 5232 Pass (`faee47a48`); the prompt-importing test was rerun on `8d0a98eb5`: 10/10 | `api-e2e-evidence/server-unit.log`, `server-unit-ir002-focused.log` |
| 5 | `pnpm test:nuxt run components/settings/__tests__/{CompactionConfigCard,ServerSettingsCompactionFailure}.spec.ts` | `autobyteus-web` | card spec | 8/8 Pass | `api-e2e-evidence/web-compaction-card.log` |
| 6 | Live suites (see below) | `autobyteus-server-ts` | CCR-E2E-001..003, OLR-E2E-010 | All Pass (CCR round 7) | `api-e2e-evidence/live-ccr-run-7/`, `live-olr010/` |
| 7 | `pnpm test:e2e:real -- --scenarios=deepseek.compaction-agent-flow` | root | Migrated harness semantics | 3/3 Pass (OBS-1) | `api-e2e-evidence/real-e2e-*` |
| 8 | AC-003 comparison harness (temporary; `LlmPhaseSummaryPort` on Opus 5.5, real ≥ 200k history) | `autobyteus-ts` | AC-003, C-010 (Gemini transcript) | AC-003: Fail on 2 items (user decision); C-010: Fail (regression) | `api-e2e-evidence/ac003/`, `ac003-summary-quality-report.md` |
| 9 | Isolated desktop instance | root | Settings card; one real compaction run in the app; meter | Pass | `api-e2e-evidence/electron/` |

## Test-Case Ledger Decision

- Ledger required: `Yes`. There are many paid, long-running, dependent cases.
- Path: `api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard

| Category | Post-Repository | Basis |
| --- | --- | --- |
| Requirement and AC proof | 55% | Unit proofs of AC-001/004/005/006/007/009; nothing provider-side |
| Changed-boundary directness | 55% | Request bodies proven only against mocked clients |
| Cross-boundary realism | 50% | Scripted LLM integration only |
| Environment fidelity | 65% | — |
| Failure / lifecycle | 55% | Attempt budget unit-proven |
| User surface / desktop | 40% | Web component spec only |
| Durable coverage quality | 70% | OLR-E2E-010 stale (CR-001) |

Overall post-repository: 56%. Broader validation required. Final scorecard: `api-e2e-execution-coverage-report.md` (93%).

## Broader Validation Decision

- Decision: `Required`
- Mode: Live API through the real studio server; a temporary AC-003 comparison harness on the core port; Project Desktop Validation for the card and one real run.
- Gap addressed: everything provider-side; the summary quality on a real large history (AC-003, user acceptance); the real UI card.
- Browser: not separately needed; the desktop instance covers the card.

## Live Environment And Fixture Plan

- **Server live suites:**
  - clean `env -i`, temp HOME, keys from the user's server `.env` (`ANTHROPIC_API_KEY`, `DEEPSEEK_API_KEY`, `VERTEX_AI_API_KEY`) saved into the test-owned vault by the harness;
  - compaction is placed by lowering `AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE` and `AUTOBYTEUS_COMPACTION_TRIGGER_RATIO` through `updateServerSetting` at the chosen turn.
  - **Revised during execution:** predefined settings cannot be deleted (DEF-D), so each case sets an explicit high trigger at its start. The low trigger is sized from the observed prompt H: override = maxOutput + 256 + 4H, ratio 0.2125, trigger 0.85H. An override below max output hangs the run (pre-existing DEF-C).
- **AC-003:**
  - read-only copy of one real long native run snapshot (≥ 200k tokens, current snapshot format) from the user's memory folder into a temp directory. Never modified; the copy is deleted after use;
  - only derived summaries and transcripts go into the ticket evidence.
- **Real-e2e runner:** DeepSeek key via `pnpm secrets:import` into `autobyteus-server-ts/db/test.db` (test-owned).
- **Desktop:** isolated instance (own data root), Anthropic key via the importer, stopped and deleted after.

## Temporary Executable Validation Plan

| Case ID | Probe / Harness | Behavior Proven | Why Not Durable |
| --- | --- | --- | --- |
| AC3-CMP | Core-level script: `LlmPhaseSummaryPort` cached + transcript on one real history; two compacted contexts via `MemoryManager`; continuation turns | AC-003 (user review) | Depends on a private real history and on human judgment; one-off acceptance evidence |
| C010-GEM | Same harness on Gemini: transcript request body capture | C-010 | Diagnostic for a reviewer question |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| AutobyteusLLM release live | No AutoByteus LLM host configured | Low (unit with a fake client) | None |

## Ambiguities Or Reroute Triggers

A fork 400 or a worse cached summary is `Design Impact`/`Requirement Gap` and goes to the Solution Designer.

**Post-execution outcomes:**
- No fork 400 occurred.
- AC-003 found a worse cached summary on 2 checklist items → Solution Designer + user decision.
- C-010 is a regression on Gemini → failure-origin review.

## Investigation Decision

- Proceed: `Yes`
- Durable coverage: `Yes`. Update OLR-E2E-010; add the CCR live suite; opt-in harness extension. All done and passing.
- Reroute before validation: `No`
- **Post-execution (API-REV-001):** result **Fail / 93%**. Reasons: C-010 and AC-003. See `api-e2e-execution-coverage-report.md`.

## Round 2 Post-Execution Note (API-REV-002, IR-003 `1153984ee`)

- **Scope added:**
  - AC-010 (Gemini system prompt taken from the request);
  - the AC-003 rerun on v4/v6;
  - a per-provider quality judgment (user instruction) for Anthropic, Gemini and DeepSeek;
  - CR-003.
- **Durable coverage changed:**
  - `summaryRequestMode` now matches by position;
  - AC-010 and instruction-echo assertions added to the CCR suite.
- **Result: Fail / 93%.**
  - F-1 and F-2 are resolved.
  - New F-3: the real-provider DeepSeek scenario fails at its 1,024-token agent output limit.
  - New F-4: the Gemini note records the compaction request as an open user request.
  - AC-010 on the Gemini API key is blocked by quota.
- Details: `api-e2e-execution-coverage-report.md` § Round 2; `ac003-summary-quality-report.md` § Round 2 and § Per-provider judgment.

## Round 3 Post-Execution Note (API-REV-003, `97fd9a814`)

- **Scope:**
  - REQ-002 per-model mode;
  - REQ-009/SR-010 fitted summary output limit (AC-011);
  - instruction v5;
  - AC-003 gate on Opus, Sonnet 5 and DeepSeek;
  - OLR-E2E-010 re-scope (C-020).
- **New durable case:** CCR-E2E-004.
- **Result: Fail / 92%.**
  - F-3, F-4 and C-020 are resolved.
  - New F-5: the v6 transcript prompt drops the summary-block markers on Sonnet 5 and DeepSeek.
  - The DeepSeek gate fails on gap A.
- Details: `api-e2e-execution-coverage-report.md` § Round 3; `ac003-summary-quality-report.md` § Round 3.

## Round 4 Post-Execution Note (API-REV-004, `090353579`)

- **Scope:** the SR-011 release bar (transcript-only acceptance on Sonnet 5 and DeepSeek; no regression on Opus or Gemini); cached-note acceptance and cache read for Sonnet 5 and DeepSeek.
- **Durable test change:** a model-aware strict assertion.
- **Result: Fail / 94%** on F-9 (Sonnet 5 history B transcript: `(none) — explanation` rejected 6/6).
- Details: `api-e2e-execution-coverage-report.md` § Round 4.

## Round 5 Post-Execution Note (API-REV-005, `097192731`)

- **Result: Pass / 94.6%.**
  - F-9 is resolved.
  - The final durable runs, repository checks (idle machine) and the real-provider scenario pass on the final commit.
  - AC-010 on the Gemini API key is blocked by quota.
- **Next:** proportional test-code review.
