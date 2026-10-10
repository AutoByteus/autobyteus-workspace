# API/E2E Test-Case Ledger — anthropic-incomplete-content-block (Step 1)

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-incomplete-content-block`
- Coverage investigation: `api-e2e-coverage-investigation.md`
- Execution coverage report: `api-e2e-execution-coverage-report.md`
- API/E2E revision record: `api-e2e-revision-record.md`
- Ledger scope and reason it is required: multiple independent live cases, one long-running (>8K-token Opus generation), paid provider calls with rate-limit risk.
- Last updated: 2026-10-10

## Planned Cases

| Case ID | Case / Journey | Requirement / Acceptance-Criteria IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| OLM-E2E-001 | Opus 5.5 native agent, unconfigured: streamed `max_tokens` = catalog max (128000); one `write_file` response > 8,192 output tokens; file written | AC-001, SCN-001 | Real server GraphQL/WS → native agent → Anthropic wire | `autobyteus-native-output-limit-live.e2e.test.ts` | 1 | Long-running |
| OLM-E2E-002 | Anthropic run with `llmConfig.max_tokens: 4096`: 4096 on the wire | AC-001 alt, BEH-004 | Same | same | 2 | |
| OLM-E2E-003 | Anthropic non-streaming, unconfigured: 8192, accepted | AC-008, REQ-007 | Server production construction (`createAvailableLlm`) → Anthropic wire | same | 3 | |
| OLM-E2E-004 | OpenAI `gpt-5.4-mini` unconfigured: `max_output_tokens` = catalog max | AC-013 | Real server → OpenAI Responses wire | same | 4 | |
| OLM-E2E-005 | DeepSeek `deepseek-v4-flash` unconfigured: `max_tokens` = catalog max; no `max_completion_tokens` | AC-013, RSK-004 | Real server → DeepSeek wire | same | 5 | |
| OLM-E2E-006 | GLM `glm-5.3` unconfigured: `max_tokens` = catalog max | AC-013, RSK-004 | Real server → GLM wire | same | 6 | |
| OLM-E2E-007 | Gemini `gemini-3.8-flash` (Vertex Express) unconfigured: `generationConfig.maxOutputTokens` = catalog max | AC-013 | Real server → Gemini wire | same | 7 | |
| OLM-E2E-008 | Qwen unconfigured: `max_completion_tokens` = catalog max | AC-013, RSK-004 residual | Real server → Qwen wire | same | 8 | Was not live-checked by implementation |
| OLM-E2E-009 | Grok `grok-4.7` (no catalog limit): no limit field | AC-013 alt | Real server → Grok wire | same | 9 | |
| OLM-E2E-010 | DeepSeek and GLM, `max_tokens: 24`: sent as `max_tokens`, finish reason `length` | RSK-004, BEH-004 | Real server → provider wire | same | 10 | |
| RPE-001 | Real-provider runner `openai.agent-flow`, `deepseek.agent-flow`, `deepseek.compaction-agent-flow` | REQ-012 regression; CON-001 / RU-002 | Built test server | `pnpm test:e2e:real -- --scenarios=…` | 11 | Regression |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | OLM-E2E-002..010 | 2026-10-10 | Started | `api-e2e-evidence/run-output-limit-live.sh api-e2e-evidence/olm-live-run1 "OLM-E2E-(00[2-9]\|010)"` (clean `env -i`, per-run test vault) | — | — | — | `api-e2e-evidence/olm-live-run1.log` | — |
| 2 | OLM-E2E-002 | 2026-10-10 | Completed | same | `max_tokens: 4096` on the wire, 200 | `api.anthropic.com/v1/messages` stream, `{max_tokens: 4096}`, 200, `end_turn` | Pass | `olm-live-run1/calls-summary.json` | — |
| 3 | OLM-E2E-003 | 2026-10-10 | Completed | same | non-streaming `max_tokens: 8192`, 200, no SDK throw | non-stream, `{max_tokens: 8192}`, 200, `end_turn`, content returned | Pass | same | — |
| 4 | OLM-E2E-004 | 2026-10-10 | Completed | same | `max_output_tokens` = catalog max | `api.openai.com/v1/responses` stream, `{max_output_tokens: 128000}`, 200, completed | Pass | same | — |
| 5 | OLM-E2E-005 | 2026-10-10 | Completed | same | `max_tokens` = catalog max only | `api.deepseek.com` stream, `{max_tokens: 384000}`, 200, `stop` | Pass | same | — |
| 6 | OLM-E2E-006 | 2026-10-10 | Completed | same | `max_tokens` = catalog max only | `open.bigmodel.cn` stream, `{max_tokens: 128000}`, 200, `stop` | Pass | same | — |
| 7 | OLM-E2E-007 | 2026-10-10 | Completed | same (`useGeminiMode VERTEX_EXPRESS`) | `generationConfig.maxOutputTokens` = catalog max | `aiplatform.googleapis.com …:streamGenerateContent`, `{maxOutputTokens: 65536}`, 200, `STOP` | Pass | same | — |
| 8 | OLM-E2E-008 | 2026-10-10 | Completed | same (`QWEN_BASE_URL` token-plan endpoint) | `max_completion_tokens` = catalog max, 200 | Wire body `{max_completion_tokens: 65536}` (correct), but 401 `invalid_api_key`. Independent probe: the key gets 401 on `/models` at both the token-plan and the default intl endpoints | Blocked (credential invalid) | same; `olm-live-run1.log` | Needs a valid Qwen key; low residual risk |
| 9 | OLM-E2E-009 | 2026-10-10 | Completed | same | no limit field (no catalog limit) | `api.x.ai` stream, `{}`, 200, `stop` | Pass | same | — |
| 10 | OLM-E2E-010 | 2026-10-10 | Completed | same | DeepSeek and GLM: `max_tokens: 24` sent; finish `length` | DeepSeek `{max_tokens: 24}` → `length`, 24 tokens; GLM `{max_tokens: 24}` → `length`, 24 tokens | Pass | same | — |
| 11 | OLM-E2E-001 | 2026-10-10 | Started | `run-output-limit-live.sh api-e2e-evidence/olm-live-run2 "OLM-E2E-001"` | — | — | — | `api-e2e-evidence/olm-live-run2.log` | — |
| 12 | OLM-E2E-001 | 2026-10-10 | Completed | same (claude-opus-5-5, native runtime, `write_file`, autoExecuteTools) | streamed `max_tokens: 128000`; one `tool_use` response > 8,192 output tokens; file written; no ERROR | 2 streamed calls, both `{max_tokens: 128000}`, 200. Call 1 `tool_use` with 31,797 output tokens; call 2 `end_turn`. File 900 lines, 107,784 bytes. No ERROR frame (216 s) | Pass | `olm-live-run2/case-results.json`, `olm-live-run2/calls-summary.json` | — |
| 13 | RPE-001 | 2026-10-10 | Completed | `pnpm test:e2e:real --scenarios=openai.agent-flow,deepseek.agent-flow,deepseek.compaction-agent-flow,anthropic.llm,gemini.vertex-express.llm` | all pass | 3 agent-flow cases failed in ~20 ms with `LIVE_E2E_PROVIDER_OPERATION_FAILED`. A temporary, reverted diagnostic showed `TypeError: ownLlm is not a function`: the harness calls the factory's private `createBackend(config, runId)` instead of the public `beginPreparation`. Base failure (neither file changed since `d28c56d5d`) | Fail (base harness defect, not this change) | `api-e2e-evidence/real-provider-regression.log`, `real-provider-diag.log` | Baseline fix in `test-support/live-e2e/live-e2e-harness.ts` (TESTING Rule 9) |
| 14 | RPE-001 | 2026-10-10 | Completed | same, rerun with the harness baseline fix (`node test-support/live-e2e/run-live-e2e.mjs --scenarios=…`) | all pass | 11/11 pass, including `deepseek.compaction-agent-flow` and compaction quality | Pass | `api-e2e-evidence/real-provider-regression-rerun.log` | — |
| 15 | OLM-E2E-002..007, 009, 010 | 2026-10-10 | Completed | `run-output-limit-live.sh api-e2e-evidence/olm-live-run3 …` after the `afterAll` cleanup hardening | same as run 1 | 9/9 pass; no leftover temp dirs | Pass | `api-e2e-evidence/olm-live-run3.log` | — |

## Re-entry And Reconciliation

- Last durably recorded event: 15
- Last completed case and result: OLM-E2E-002..010 rerun, Pass
- Cases still running, interrupted, or not started: none
- Next case or recovery action: none
- Interruption, context-compression, or rerun note: OLM-E2E-008 (Qwen) is Blocked by an invalid credential; its wire body was correct
- Reconciled into execution coverage report: `Yes`, `api-e2e-execution-coverage-report.md` "Test-Case Ledger Reconciliation"
- Reconciliation note for any case missing a terminal result: —

---

# Round 2 — Step 2 (API-REV-002)

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-incomplete-content-block-step2` @ `2a65f40fa`. Evidence: `api-e2e-evidence/step2/`. Runner: `api-e2e-evidence/step2/run-live.sh <dir> <spec> [filter]`.

## Planned Cases (Round 2)

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| OLR-E2E-001 | First-call `write_file` cut, recovery, CND-102 observation | AC-003, REQ-003, D-08, CND-102 | Real server → native agent → Anthropic | `autobyteus-native-output-limit-recovery-live.e2e.test.ts` | 1 | |
| OLR-E2E-002 | Cut after a tool result; note not merged | AC-003, CND-102 | same | same | 2 | |
| OLR-E2E-003 | Text-only cut, two parts live and after reload | AC-005 | same | same | 3 | |
| OLR-E2E-004 | Exhaustion; unique call ids; next message valid | AC-006, D-08 | same | same | 4 | |
| OLR-E2E-005 | DeepSeek `length` mid tool call | AC-011, AC-010 | Real server → DeepSeek | same | 5 | |
| OLR-E2E-006/007 | Refusal / context-window stop (emulated stop reason on a real response) | AC-004 | Real server → Anthropic | same | 6 | |
| OLR-E2E-008 | No `message_stop` (emulated network cut) | AC-007 | same | same | 7 | |
| OLR-E2E-009 / 009b | Malformed tool arguments (emulated) on Anthropic / DeepSeek | AC-012 | same | same | 8 | |
| OLR-E2E-010 | Output-limited compaction summary | AR-004 | Real server settings → DeepSeek non-streaming | same | 9 | |
| OLM-E2E-001..010 | Step 1 live suite on the Step 2 tree | AC-001, AC-008, AC-013 (preserved) | Real server | `autobyteus-native-output-limit-live.e2e.test.ts` | 10 | |
| RPE-002 | Real-provider runner regression | REQ-012, compaction | Built test server | `pnpm test:e2e:real --scenarios=…` | 11 | |

## Execution Events (Round 2)

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R2-1 | OLR-E2E-003..009 | 2026-10-10 | Completed (run 1) | `run-live.sh step2/olr-run1 … "OLR-E2E-00[3-9]"` | per case | 003 Pass (3 parts; reload = 3 consecutive assistant messages, seamless). 005 Pass (each `length` cut discarded + noted; exhausted at 4). 006/007 Pass (`LLM_RESPONSE_REFUSED` / `LLM_CONTEXT_WINDOW_EXCEEDED`, 1 call, no tool, input rolled back, next request clean). 008 Pass (`Anthropic stream ended before message_stop`, rollback, next clean). 004 behavior correct but the test's DB-ledger lookup was empty (test defect → switched to `TOKEN_USAGE_UPDATED.llm_call_id`). **009 Fail: Anthropic malformed arguments → `LLM_PROVIDER_ERROR` "SyntaxError … is not valid JSON"; turn fails, no retry tool result** | 003,005-008 Pass; 004 test fix; **009 Fail** | `step2/olr-run1/` | 009 → failure package |
| R2-2 | OLR-E2E-001,002,003,004,009,009b,010 | 2026-10-10 | Completed (run 2) | `run-live.sh step2/olr-run2 …` | per case | 003, 004 Pass (004: 4 calls, `turn_0001:llm:1..4`? see 001; exhausted names 20 tokens; follow-up 200). 001/002 at `max_tokens: 400`: discard + note + unique ids `turn_0001:llm:1..4` correct, but Opus adaptive thinking consumed whole 400-token attempts → exhausted (test parameter too tight; merge framing observed live). 009 Fail again (same). 009b (DeepSeek) behavior correct (malformed → not run → retry result → file written); test too strict on an unrelated tool ERROR frame. 010: compaction `target_unattainable` before dispatch (test settings too small) and the wait hung to timeout | 001/002/009b/010 test fixes; **009 Fail** | `step2/olr-run2/`, `olr-run2.log` | Rerun 001, 002, 009b, 010 |
| R2-3 | OLR-E2E-001,002,009b,010 | 2026-10-10 | Completed (run 3) | `run-live.sh step2/olr-run3 …` (001/002 at `max_tokens: 1200`, 100 lines) | per case | **001 (CND-102)**: first-call cut was adaptive thinking (1,200 tokens, no visible output); the "nothing kept" note was merged after the request under "The user's current message is:". The model **continued the original request**: wrote `sea-lines.md`, then appended in pieces until 100/100 lines; turn completed, no error; `llm_call_id` `turn_0001:llm:1..7` unique. Test asserted a tool cut → made tolerant of either first-cut variant; tool-cut semantics moved to new OLR-E2E-011. 002 Pass (first note after the read_file result is its own message, no connector; later turn exhausted on thinking-only cuts). 009b Pass. 010: summary call made, `completion_status incomplete`, `completion_reason length`, `phase failed`, `incomplete_summary` → compaction blocked during the second send (test waited for TURN_COMPLETED → timeout; fixed to end on COMPACTION_BLOCKED) | 001 test fix (behavior Pass); 002/009b Pass; 010 behavior Pass, test fix | `step2/olr-run3/`, `olr-run3.log` | Full clean run |
| R2-4 | OLR-E2E-001..011 (all) | 2026-10-10 | Completed (final run) | `run-live.sh step2/olr-final tests/e2e/runtime/autobyteus-native-output-limit-recovery-live.e2e.test.ts` | per case | 11 Pass / 1 Fail. 001 Pass (first-call cut on a write_file, merged note, model then wrote all 100 lines in pieces; `turn_0001:llm:1..8`). 011 Pass (2 discarded tool calls, 0 executed, note names `write_file` + 400). 002 Pass (unmerged note after tool result; 100 lines finished). 003 Pass (3 parts live and after reload). 004 Pass (4 calls, exhausted names 20 tokens, unique ids, follow-up 200). 005 Pass (DeepSeek `length` ×4, discarded, exhausted). 006/007/008 Pass. 009b Pass. 010 Pass (3 summary calls `max_tokens 24` → `length`; `COMPACTION_STATUS failed incomplete/length`; COMPACTION_BLOCKED). **009 Fail** (Anthropic malformed arguments → `LLM_PROVIDER_ERROR` SyntaxError from `AnthropicAssistantTurnAssembler`; turn fails; no retry tool result) | **009 Fail**; others Pass | `step2/olr-final/`, `olr-final.log` | Failure-origin review |
| R2-5 | OLM-E2E-001..010 (Step 1 preserved) | 2026-10-10 | Completed | `run-live.sh step2/olm-step2 tests/e2e/runtime/autobyteus-native-output-limit-live.e2e.test.ts` | Step 1 behavior unchanged | 10 Pass; OLM-E2E-001 ~30K-token write_file still succeeds; 008 Qwen 401 (credential, as round 1) | Pass (008 Blocked) | `step2/olm-step2/`, `olm-step2.log` | — |
| R2-6 | RPE-002 | 2026-10-10 | Completed | `pnpm test:e2e:real --scenarios=openai.agent-flow,deepseek.agent-flow,deepseek.compaction-agent-flow,anthropic.llm,gemini.vertex-express.llm` (Step 2 worktree, built server, its test vault) | all pass | 11/11 | Pass | `step2/real-provider-regression.log` | — |
| R2-7 | OLR-E2E-009 | 2026-10-10 | Completed (failure-origin review) | CRR-005 (`code-review-report.md` "Failure-Origin Review (CRR-005)") | — | Invalid test premise: Anthropic buffered streaming (no `eager_input_streaming`, no fine-grained beta header — verified in the adapter and the official docs) validates tool input, so a completed `tool_use` with invalid JSON is not a supported scenario. Local Fix → API/E2E: case removed; AC-012 on Anthropic Not Applicable | N/A (removed) | `code-review-report.md`, `code-review-revision-record.md` (CRR-005) | Future trigger: eager input streaming (RSK-002 follow-up) |
| R2-8 | OLR-E2E-001..008, 009b, 010, 011 | 2026-10-10 | Completed (rerun after removal) | `run-live.sh step2/olr-rerun tests/e2e/runtime/autobyteus-native-output-limit-recovery-live.e2e.test.ts` | all pass | 11/11 Pass. 001: tool cut on call 1, merged note, 100/100 lines, `turn_0001:llm:1..8`. 005: DeepSeek recovered (`length` ×3 → successful call resets the counter → `length` → continued) and wrote 40/40 lines. Others as R2-4 | Pass | `step2/olr-rerun/`, `olr-rerun.log` | — |
| R2-9 | Ungated skip | 2026-10-10 | Completed | `env -i … vitest run <both suites>` (no gate) | clean skip | 22 skipped; 0 leftover temp dirs | Pass | `step2/ungated-skip-rerun.log` | — |
| R2-10 | OLM-E2E-008 (Qwen) | 2026-10-10 | Reclassified | User scope decision: providers without a usable API key are not tested | — | Qwen key rejected (401) → Out Of Scope (was Blocked); Kimi, Mistral, Ollama likewise out of scope | Out Of Scope | user message 2026-10-10 | — |
| R2-11 | OLR-E2E-012/013 (OPENAI, GEMINI) | 2026-10-10 | Added (user request: cover the commonly used OpenAI and Gemini) | `run-live.sh step2/olr-popular1..4 … "OLR-E2E-01[23]"`; reasoning_effort / thinking_level `low` | per case | 013 (text cut) Pass on both: partial kept, resume note, 2 parts, reload clean. 012 (tool cut) iterations: at 300 tokens OpenAI cut mid write_file ×4 (discarded, none executed); Gemini never reached a call (test param) → moved to 1200 tokens / 100 lines; Gemini then sometimes split on its own (no cut) → request asks for one write_file call; assertions now ignore ordinary `ToolExecution.*` errors the model corrects. Final (popular4): OpenAI 4 cuts mid write_file, 4 discarded, 0 executed, exhausted (keeps the one-call instruction; full recovery to 100/100 shown in popular2); Gemini `MAX_TOKENS` with no function call (Gemini emits only complete calls → "nothing kept" note), recovered, 100/100 lines | Pass | `step2/olr-popular1..4/`, `olr-final2/` | — |
| R2-12 | Full recovery suite | 2026-10-10 | Completed | `run-live.sh step2/olr-final2 …` (before the one-call change) | all pass | 14/15; only OLR-E2E-012-GEMINI precondition not met (Gemini split on its own; no cut) → fixed in R2-11; ungated: 15 skipped (both suites 26) | Pass after R2-11 | `step2/olr-final2/`, `ungated-skip-final2.log` | — |
| R2-13 | OLR-E2E-012/013 (OPENAI, GEMINI) — TR-001 Local Fix (CRR-008) | 2026-10-10 | Completed | `run-live.sh step2/olr-tr001 … "OLR-E2E-01[23]"`; ungated skip | pass; branch recorded per run | 4/4 Pass. **Branches exercised:** 012-OPENAI `tool_call` (4 cuts mid write_file, exhausted); 012-GEMINI `nothing_kept` (MAX_TOKENS with no call/no visible text after earlier successful calls; note found by content; exhausted); 013-OPENAI `kept_text`; 013-GEMINI `kept_text`. **Not exercised:** OLR-E2E-013's `nothing_kept` branch (did not occur), the merged first-call `nothing_kept` shape on Gemini (seen in `olr-popular3a` before the fix, not in this run). Ungated: 26 skipped; 0 leftovers | Pass | `step2/olr-tr001/`, `olr-tr001.log`, `ungated-skip-tr001.log` | — |

## Re-entry And Reconciliation (Round 2)

- Last durably recorded event: R2-13
- Last completed case and result: recovery suite rerun 11/11 Pass; ungated skip Pass
- Cases still running, interrupted, or not started: none
- Next case or recovery action: none (OLR-E2E-009 removed per CRR-005)
- Interruption, context-compression, or rerun note: runs 1–3 exposed test defects (ledger source, too-tight limits for adaptive thinking, compaction settings/wait), fixed before the final run; behavior evidence from those runs is consistent with the final run
- Reconciled into execution coverage report: `Yes` (round 2)
