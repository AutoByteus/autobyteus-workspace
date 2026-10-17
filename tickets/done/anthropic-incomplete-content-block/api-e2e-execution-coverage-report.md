# API/E2E Execution Coverage Report — anthropic-incomplete-content-block

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-incomplete-content-block/tickets/in-progress/anthropic-incomplete-content-block/`. Evidence for this round: `api-e2e-evidence/step2/`.

Latest authoritative round: **2 (Step 2 of DEC-004), API-REV-003 — Result `Pass`** after the CRR-005 Local Fix. API-REV-002's Fail (OLR-E2E-009) was ruled an invalid test premise by failure-origin review CRR-005; the case was removed, AC-012 on Anthropic is `Not Applicable`, and the suite was re-run (11/11). Round 1 (Step 1, API-REV-001, Pass 95%) is summarized at the end and re-validated here as preserved behavior.

## Execution Round Meta

- Requirements Doc: `requirements-doc.md` (Approved; SR-008 basis)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (Ready, SR-008)
- Supplemental Task Artifacts: `probes/` (incl. `finish-smoke.e2e.test.ts`, `finish-smoke-results.jsonl`), `follow-up-autobyteus-provider-removal.md`, `handoff-architecture-design-complete.md`
- Design Review Report: `design-review-report.md` (Pass, ARCH-REV-003)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-003)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (Pass, CRR-004)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A for this round
- Coverage Investigation: `api-e2e-coverage-investigation.md` (round 2)
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md` (round 2 section)
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-003`
- Current Execution Round: 2
- Trigger: code review pass CRR-004 (IR-003, Step 2); re-entry: failure-origin review CRR-005 (Local Fix → API/E2E)
- Prior Round Reviewed: round 1 (Step 1, Pass)
- Latest Authoritative Round: 2

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (requested with this handoff)

## Investigation And Execution Basis

- Investigation completed before final execution: `Yes` (round-2 investigation written before the first live run; durable edits started in parallel with repository checks and are recorded there)
- Investigation plan followed: `Yes`, with case-design corrections found by early runs (below)
- Existing coverage decisions revised during execution:
  - The round-1 live suite's plumbing moved into `tests/e2e/helpers/native-runtime-live-harness.ts`; cases unchanged.
  - Test-design corrections before the final run (not product issues): the unique-call-id check reads the live `TOKEN_USAGE_UPDATED.llm_call_id` feed (the in-process ledger table is not written in this setup); Opus 5.5 at `max_tokens: 400` often spends whole attempts on adaptive thinking, so the CND-102 case uses 1,200 tokens / 100 lines and the tool-cut semantics moved to a dedicated case (OLR-E2E-011) that asserts on whichever attempt is the tool cut; the compaction case needed settings that leave a reachable post-compaction target and must end on `COMPACTION_BLOCKED`; OLR-E2E-009b no longer treats an unrelated tool error (relative path) as an LLM failure.
- Reroute: API-REV-002 sent OLR-E2E-009 to failure-origin review; CRR-005 returned it as an invalid test premise (Local Fix → API/E2E). Applied: case removed, artifacts updated, suite re-run.

## Test-Case Ledger Reconciliation

- Ledger initialized before execution: `Yes`; every attempt recorded immediately: `Yes`; reconciled: `Yes`
- Last durably recorded event: R2-9

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| OLR-E2E-001 | Pass | R2-8 | `step2/olr-rerun/` | CND-102 resolved |
| OLR-E2E-002 | Pass | R2-8 | same | — |
| OLR-E2E-003 | Pass | R2-8 | same | — |
| OLR-E2E-004 | Pass | R2-8 | same | — |
| OLR-E2E-005 | Pass | R2-8 | same | — |
| OLR-E2E-006 | Pass | R2-8 | same | — |
| OLR-E2E-007 | Pass | R2-8 | same | — |
| OLR-E2E-008 | Pass | R2-8 | same | — |
| OLR-E2E-009 | N/A (removed) | R2-7 | `code-review-report.md` (CRR-005) | Invalid premise; AC-012 on Anthropic Not Applicable |
| OLR-E2E-009b | Pass | R2-8 | same | — |
| OLR-E2E-010 | Pass | R2-8 | same | — |
| OLR-E2E-011 | Pass | R2-8 | same | — |
| OLR-E2E-012 (OPENAI, GEMINI) | Pass | R2-13 | `step2/olr-tr001/` (also `olr-popular2/`, `olr-popular4/`) | Note asserted by content and cut-derived variant (TR-001); variants exercised: OpenAI `tool_call`, Gemini `nothing_kept` |
| OLR-E2E-013 (OPENAI, GEMINI) | Pass | R2-13 | `step2/olr-tr001/` (also `olr-popular1/`, `olr-final2/`) | Variant exercised: `kept_text` on both; its `nothing_kept` branch has not occurred live |
| OLM-E2E-001..010 (Step 1 preserved) | Pass (008 Blocked: Qwen credential) | R2-5 | `step2/olm-step2/` | — |
| RPE-002 | Pass | R2-6 | `step2/real-provider-regression.log` | — |

## Compatibility / Legacy Scope Check

- Upstream backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed: `No`
- Approved persisted-data transition followed: `Yes` (additive note trace; reload hides it — OLR-E2E-001/003)
- Durable coverage for compatibility-only behavior: `No`

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| Repository | All Step 2 ACs (agent level) | Agent loop, adapters | Core unit/integration (sanitized), server unit | Durable | Pass | `step2/ts-*.log`, `server-*.log` |
| OLR-E2E-001 | AC-003, REQ-003, D-08, CND-102 | Recovery after a first-call cut | Real server, Opus 5.5, `max_tokens 1200` | Durable + Live | Pass | `olr-final/case-results.json` |
| OLR-E2E-011 | AC-003, REQ-003 | Discarded tool call | Real server, Opus, `max_tokens 400` | Durable + Live | Pass | same |
| OLR-E2E-002 | AC-003, CND-102 | Note after tool result | Real server, Opus | Durable + Live | Pass | same |
| OLR-E2E-003 | AC-005 | Kept text, resume note, reload | Real server, Opus `max_tokens 300` | Durable + Live | Pass | same |
| OLR-E2E-004 | AC-006, D-08 | Exhaustion; next message | Real server, Opus `max_tokens 20` | Durable + Live | Pass | same |
| OLR-E2E-005 | AC-011, AC-010 | OpenAI-compatible `length` | Real server, DeepSeek | Durable + Live | Pass | same |
| OLR-E2E-006/007 | AC-004 | Refusal / context-window stop | Real server, Opus (real response, stop reason edited) | Durable + Live (emulated stop) | Pass | same |
| OLR-E2E-008 | AC-007 | Missing `message_stop` | Real server, Opus (real response, `message_stop` removed) | Durable + Live (emulated network cut) | Pass | same |
| OLR-E2E-009 | AC-012 on Anthropic | — | Removed (CRR-005): buffered streaming validates tool input; not a supported scenario | — | N/A | `code-review-report.md` |
| OLR-E2E-009b | AC-012 | Malformed tool arguments, OpenAI-compatible | Real server, DeepSeek | Durable + Live (emulated) | Pass | same |
| OLR-E2E-012 | AC-011 | OpenAI Responses (`response.incomplete` / `max_output_tokens`) and Gemini (`MAX_TOKENS`) cut of a write_file request | Real server, gpt-5.4-mini / gemini-3.8-flash (Vertex Express), `max_tokens 1200`, reasoning/thinking low | Durable + Live | Pass | `olr-popular4/` |
| OLR-E2E-013 | AC-005, AC-011 | OpenAI and Gemini text-only cut | same, `max_tokens 300` | Durable + Live | Pass | `olr-popular1/`, `olr-final2/` |
| OLR-E2E-010 | AR-004 | Output-limited compaction summary | Real server settings, DeepSeek non-streaming | Durable + Live | Pass | same |
| OLM-E2E-* | AC-001, AC-008, AC-013 (preserved) | Output limits | Real server | Durable + Live | Pass (008 Blocked) | `olm-step2/` |
| RPE-002 | Regression | Agent flows, compaction | Built test server | Durable + Live | Pass | `real-provider-regression.log` |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 7 | `env -i … vitest run <both live suites>` (no gate) | `autobyteus-server-ts` (Step 2) | Clean skip | Pass (23 skipped) | `step2/ungated-skip.log` |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 95% | +15 | AC-002..AC-007, AC-010, AC-011 (Anthropic, DeepSeek, OpenAI Responses, Gemini), AC-012 (where reachable: OpenAI-compatible), AR-004, D-08 and Step 1 ACs proven live through the real server; AC-012 on Anthropic `Not Applicable` (CRR-005) | AC-009 is user verification by definition |
| Changed-boundary execution directness | 80% | 97% | +17 | Real server, real provider streams, recorded requests, WS frames, reload projection, live Token Meter call ids | — |
| Cross-boundary integration realism and mock gap | 70% | 94% | +24 | Provider acceptance of every post-recovery/post-failure request; the only emulation is a one-shot edit of a real response | Refusal / context-window / network-cut / malformed shapes cannot be requested on demand (not closable) |
| Environment, configuration, identity, and fixture fidelity | 70% | 95% | +25 | Clean `env -i`; per-run vault; server settings via `updateServerSetting`; every provider with a usable key exercised | — (providers without a usable API key are out of scope per the user, 2026-10-10) |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | +10 | Exhaustion, counter reset after a successful call (DeepSeek), rollback paths, compaction rejection/block, reasoning-only cuts | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | — | No renderer change; WS frames (Discarded segment, ERROR codes, text segments) asserted directly | — |
| Durable regression coverage quality and relevance | 85% | 95% | +10 | Gated live recovery suite (11 cases) + shared harness; Step 1 suite unchanged in behavior; model nondeterminism handled by tolerant/dedicated cases | Gated (credentials, small cost) |

- Overall post-repository confidence: 78%
- Overall final confidence: 95.2% (simple average of the six applicable categories: (95+97+94+95+95+95)/6)
- Every critical acceptance criterion directly proven: `Yes` (AC-012 on Anthropic is Not Applicable per CRR-005; AC-009 is user verification)
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: unedited provider-issued refusal / context-window / network-cut shapes (cannot be requested on demand). Providers without a usable API key (Qwen — key rejected; Kimi, Mistral, Ollama) are out of scope per the user (2026-10-10), not a residual risk.

## Broader Validation Decision And Execution

- Decision and selected mode: `Required`; Live API through the in-process real server with real providers, plus the Step 1 live suite and the real-provider runner. One-shot edits of real provider responses only for refusal/context-window stops, a network cut, and malformed arguments.
- Startup and readiness: `api-e2e-evidence/step2/run-live.sh <dir> <spec> [filter]` (clean `env -i`; credentials by name only; per-run vault); readiness via GraphQL, WS `CONNECTED`, `TURN_COMPLETED`/`COMPACTION_BLOCKED` then idle.
- Environment choices: OLR-E2E-010 sets `AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE=60000`, `AUTOBYTEUS_COMPACTION_TRIGGER_RATIO=0.3`, `AUTOBYTEUS_COMPACTION_MODEL_SETTINGS={"modelIdentifier":null,"llmConfig":{"max_tokens":24}}` via `updateServerSetting` and deletes them in `finally`. DeepSeek runs use `extra_params.thinking_type: disabled`.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| OLR-E2E-001: 100-line write, `max_tokens 1200` | First call cut; note in next request; nothing of the cut stored; model continues the original request; reload without note; unique call ids | Call 1 `max_tokens` (tool cut in the final run and the rerun; adaptive-thinking cut in run 3); note merged under "The user's current message is:"; then write + appends, 100/100 lines; no ERROR; `turn_0001:llm:1..8`; reload shows user + final text only | `olr-final/case-results.json` | Pass |
| OLR-E2E-011: 40-line write, `max_tokens 400` | Discarded tool segments never execute; note names `write_file` + 400; cut call absent | 2 discarded segments (`toolu_…`), 0 executions; exhausted after 4 (accepted) | same | Pass |
| OLR-E2E-002: read, then write | First note after the tool result is its own message (no connector) | As expected; the turn later finished all 100 lines | same | Pass |
| OLR-E2E-003: essay, `max_tokens 300` | Partial kept; resume note; parts consecutive live and after reload | 3 calls; 3 text segments; reload = user + 3 consecutive assistant messages, seamless; note hidden | same | Pass |
| OLR-E2E-004: `max_tokens 20` | 4 calls, `LLM_OUTPUT_LIMIT_EXHAUSTED` naming 20; next message valid | As expected; follow-up 200 `end_turn` | same | Pass |
| OLR-E2E-005: DeepSeek, `max_tokens 150` | `length` mid tool call → discard + note + continue (≤3) | Final run: 4 × `length`, exhausted. Rerun: `length` ×3, a successful call (counter reset), `length`, then success — 40/40 lines. Discarded segments; note names `write_file` + 150 | `olr-final/`, `olr-rerun/` | Pass |
| OLR-E2E-006/007 | `LLM_RESPONSE_REFUSED` / `LLM_CONTEXT_WINDOW_EXCEEDED`; 1 call; no tool; next valid | As expected; failed input rolled back | same | Pass |
| OLR-E2E-008 | Failure + rollback; next valid | `LLM_PROVIDER_ERROR` "Anthropic stream ended before message_stop."; no tool; next clean | same | Pass |
| OLR-E2E-009 (first execution, removed) | — | Anthropic invalid tool-input JSON (harness edit) ended the turn with `LLM_PROVIDER_ERROR`; CRR-005: not a reachable product state under buffered streaming; nothing ran and input was rolled back | `olr-final/`; CRR-005 | N/A |
| OLR-E2E-009b | Same as above on DeepSeek | `TOOL_EXECUTION_FAILED` "…malformed… Please retry."; retry result in the next request; model retried; `hello.txt` = "hello" | same | Pass |
| OLR-E2E-012 (OpenAI) | Cut write_file discarded, never executed; note; continue | 4 × `response.incomplete`/`max_output_tokens` mid write_file; 4 discarded, 0 executed; note names `write_file` + 1200; exhausted (the request asks for one call). Earlier run without that instruction: cut, then 100/100 lines in pieces | `olr-popular4/`, `olr-popular2/` | Pass |
| OLR-E2E-012 (Gemini) | Cut handled; note; continue | `MAX_TOKENS` with no function call and no visible output (Gemini streams only complete function calls, so a cut call leaves nothing to discard) → "nothing kept" note → 100/100 lines | `olr-popular4/` | Pass |
| OLR-E2E-013 (OpenAI, Gemini) | Partial kept; resume note; reload clean | Both: cut at 300, kept text + resume note, completed in the second part; reload shows only assistant parts, no note | `olr-popular1/`, `olr-final2/` | Pass |
| OLR-E2E-010 | Summary `incomplete` + reason; rejected | 3 summary calls `max_tokens 24` → `length`; `COMPACTION_STATUS phase failed, completion_status incomplete, completion_reason length` (`incomplete_summary`); `COMPACTION_BLOCKED` | same | Pass |

## Platform / Runtime Targets

- macOS (Darwin 25.5.0) arm64; Node via the pnpm workspace; Vitest 4.x; Opus 5.5, deepseek-v4-flash (+ Step 1 providers).

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved decision: `Not Affected` (additive). Reload after recovery shows no note and no cut call (OLR-E2E-001, 003). No version-specific branch observed.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage changed: `Yes` (uncommitted in the Step 2 worktree)

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-output-limit-recovery-live.e2e.test.ts` | Added (gated `RUN_NATIVE_OUTPUT_LIMIT_E2E=1`) | AC-003..AC-007, AC-010..AC-012, AR-004, D-08, CND-102 | 15/15 Pass (11 + OpenAI/Gemini 012/013); OLR-E2E-009 removed per CRR-005 |
| `autobyteus-server-ts/tests/e2e/helpers/native-runtime-live-harness.ts` | Added | Shared in-process server, recorder (incl. one-shot real-response edit), runs, projection, settings; request parsing for Anthropic/OpenAI chat `messages`, OpenAI Responses `input`, Gemini `contents`; OpenAI `incomplete_details.reason` | Used by both suites |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-output-limit-live.e2e.test.ts` | Updated (moved onto the helper; cases unchanged) | AC-001, AC-008, AC-013 | 10 Pass, 008 Blocked (credential) |

- Attached for review: `Yes`

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary |
| --- | --- | --- |
| `api-e2e-evidence/step2/run-live.sh` | Clean-environment runner | Retained |
| `api-e2e-evidence/step2/olr-run1..3/`, `olr-final/`, `olm-step2/` (+ `.log`) | Per-call summaries, frame digests, request tails, projections, case results | Retained |
| `api-e2e-evidence/step2/ts-*.log`, `server-*.log`, `real-provider-regression.log`, `ungated-skip.log` | Repository and regression runs | Retained |

## Temporary Execution Methods / Scaffolding

None outside the durable suite (the response edits are part of the durable harness, applied one-shot per case).

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Anthropic refusal / `model_context_window_exceeded` stop | Real response, `stop_reason` edited | Cannot be requested on demand | Provider-issued shape assumed equivalent (ASM-002) |
| Network cut before `message_stop` | Real response, `message_stop` event removed | Cannot be produced on demand | — |
| Malformed tool arguments (DeepSeek) | Real response, `arguments` prefixed with `@@` | Models emit invalid JSON only occasionally | The exact invalid shape varies in practice; any non-JSON input exercises the same parse path |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | OLR-E2E-001..008, 009b, 010, 011; OLM-E2E-001..007, 009, 010; RPE-002; repository checks | Step 2 recovery, finish handling, rollback, compaction rejection, unique call ids, malformed-call retry (OpenAI-compatible); Step 1 preserved |
| Out Of Scope / N/A | OLR-E2E-009 (removed) | AC-012 on Anthropic: buffered streaming validates tool input (CRR-005); future trigger: eager input streaming |
| Out Of Scope | OLM-E2E-008 | Qwen has no usable API key (401); providers without a usable key are out of scope per the user (2026-10-10) |
| Out Of Scope | Kimi, Mistral, Ollama live | No usable API key or local model; out of scope per the user |
| Not Tested | Provider-issued (unedited) refusal / context-window stop | Cannot be requested on demand (emulated on real responses instead) |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| In-process servers, runs, definitions, temp dirs, server settings | This validation | `afterAll` / `finally` (settings deleted) | 0 leftover dirs/processes verified |
| Hung run 3 (compaction wait) | This validation | Allowed to reach its timeout so `afterAll` cleanup ran | Clean |
| Built test server (runner) | Runner | Stopped by the runner | Done |

## Preliminary Classification

N/A (Pass). History: API-REV-002 preliminarily classified OLR-E2E-009 as `Design Impact`; failure-origin review CRR-005 did not confirm it (invalid test premise; `Local Fix` → API/E2E), and the fix is applied. **Future trigger (recorded):** if a later ticket enables `eager_input_streaming` (the RSK-002 follow-up), a completed Anthropic `tool_use` with invalid JSON becomes a supported scenario; the Anthropic assembler would then have to hand unparsable input to the D-07 marker with a decided native-turn and replay shape, and an Anthropic AC-012 live case must be added.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95.2%
- Default `95%` target met: `Yes`
- Final applicable categories below `90%`: `No`
- Broader validation decision: `Required`, executed
- Critical acceptance criteria lacking direct proof: none (AC-012 on Anthropic Not Applicable per CRR-005; AC-009 user verification)
- Next recipient from `get_handoff_rules`: code reviewer (proportional test-code review)
- Notes: CND-102 resolved by observation (no reroute). Providers without a usable API key (Qwen, Kimi, Mistral, Ollama) are out of scope per the user (2026-10-10); OLM-E2E-008 (Qwen) is recorded as Out Of Scope rather than Blocked. Residuals: unmapped stops stay `other` (accepted); provider-issued (unedited) stop shapes. Observation, not a defect: with a small configured `max_tokens`, Opus 5.5 adaptive thinking can consume whole attempts ("nothing kept" notes) and reach exhaustion; with the real 128K default this does not arise.

## Manual Desktop-App Validation (Supplementary, 2026-10-10)

At the user's request an isolated desktop instance built from the Step 2 worktree (`iso-55100-137c`, keys imported, `autobyteus-agents` package imported) was driven through its UI while the user watched. All four tests behaved as designed: Test A (one large write_file on the real limit) Pass on Claude Opus 5.5, OpenAI and Gemini; Test B (cut write recovers) Pass on Claude, OpenAI (visible "Discarded" segment) and DeepSeek, Gemini reached the designed 3-retry limit with the clear error; Test C (cut text continues seamlessly, no note after reload) Pass on all four; Test D (exhaustion error, next message works) Pass. Details: `api-e2e-evidence/step2/manual/MANUAL-TEST-RESULTS.md`, guide `MANUAL-TEST-GUIDE.md`, screenshots `ui-*.png`. This is web/desktop-equivalent evidence, not user verification (AC-009).

## Round 1 Summary (Step 1, API-REV-001)

Pass, 95%: REQ-001/007/012 proven on the wire through the real server (OLM-E2E-001..010; 008 Qwen blocked by an invalid credential); live-E2E harness baseline fix `9dc55702f`; suite committed as `1c694cfea`. Re-validated in round 2 (R2-5) with the same result.
