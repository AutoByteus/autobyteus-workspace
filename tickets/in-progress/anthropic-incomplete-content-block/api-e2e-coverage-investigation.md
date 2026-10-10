# API/E2E Coverage Investigation — anthropic-incomplete-content-block

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-incomplete-content-block/tickets/in-progress/anthropic-incomplete-content-block/` (paths below are relative to it unless repository-relative).

Current round: **2, Step 2 of DEC-004 (the refactor)**. Round 1 (Step 1, real output limits) passed as API-REV-001; its decisions are summarized in "Round 1 Basis (Step 1)" and its behavior is re-validated here as preserved behavior.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved; SR-008 basis)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-001..SR-008)
- Design Spec (required on every route): `design-spec.md` (Ready, SR-008; D-02..D-09, DS-005, DS-006, Removal Plan)
- Supplemental Task Artifacts: `probes/` (Step 1 smoke; Step 2 `finish-smoke.e2e.test.ts`, `finish-smoke-results.jsonl`; design probes), `follow-up-autobyteus-provider-removal.md`, `approval-request.md`, `handoff-architecture-design-complete.md`
- Design Review Report: `design-review-report.md` (Pass, ARCH-REV-003)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-003)
- Implementation Revision Record: `implementation-revision-record.md` (IR-001..IR-003)
- Code Review Report: `code-review-report.md` (Pass, CRR-004, 9.4/10)
- Code Review Revision Record: `code-review-revision-record.md` (CRR-001..CRR-004)
- Delivery Revision Record (delivery re-entry only): N/A for this round (`delivery-revision-record.md` belongs to the Step 1 delivery)
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- Current Investigation Round: 2
- Trigger: code review pass CRR-004 (IR-003; Step 2)
- Prior Investigation Reviewed: round 1 (Step 1)
- Latest Authoritative Investigation: this file, round 2

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Current Requirement And Design Basis

Step 2 scope: REQ-002..REQ-006, REQ-009..REQ-011; AC-002..AC-007, AC-010..AC-012. Step 1 (REQ-001, REQ-007, REQ-012; AC-001, AC-008, AC-013) is preserved behavior. AC-009 is user verification after release.

- D-02 finish contract: every adapter yields one terminal chunk with `finish { reason, providerReason }`; `completionStatus`/`completionReason` are projections.
- D-03/DS-006 Anthropic: `stop_reason` recorded at `message_delta`; strict block assembly only for `stop`/`tool_calls`/unreported; no `message_stop` → throw.
- D-04 `LlmPhase`: `content_filter` → `LLM_RESPONSE_REFUSED`, `context_window_exceeded` → `LLM_CONTEXT_WINDOW_EXCEEDED` (rollback, no recovery); `output_limit` → keep partial text only, discard tool segments ("Discarded: …"), no invocations, return `output_limited`.
- D-05 `AgentTurnRunner`: ≤3 consecutive recoveries with a hidden note, then `LLM_OUTPUT_LIMIT_EXHAUSTED`.
- D-06 memory: the note is an `output_limit_recovery` raw trace + USER working-context message; replay hides it.
- D-07 malformed calls: never executed; error tool result "Your tool call was malformed and could not be parsed (…). Please retry."
- D-08 call identity: unique `llm_call_id` per request attempt.
- Code-review hold **CND-102**: a note following a user message (first-call cut) or another note is merged by `WorkingContextFinalizer` with the connector "The user's current message is:". API/E2E must observe a live first-call cut and route Design Impact if the model loses the original request.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001..SCN-008 (SCN-005 only through the "next user message after failure/exhaustion" shape; the user's real stuck run is AC-009).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - RU-101: an output-limit cut on the turn's **first** LLM call (CND-102 merge shape). Trigger: a run whose configured `max_tokens` is smaller than the first tool call.
  - RU-102: a cut after a tool result (the user's stuck-run shape). Trigger: a read step followed by a large write.
  - RU-103: a network cut of a real stream before `message_stop` (SCN-004). Real networks produce it; emulated by truncating the real provider response at the transport boundary.
  - RU-104: a provider refusal / context-window stop, and invalid tool arguments on an OpenAI-compatible provider. Real models produce them but they cannot be requested on demand; emulated by a one-shot edit of the real provider response text.
  - RU-105: a compaction summary cut by the compaction model's configured `max_tokens` (Settings → compaction model config). Trigger: server settings + a long conversation.
- `Technically Possible but Unsupported/Contrived` (CRR-005): a normally completed Anthropic `tool_use` with invalid input JSON. Without `eager_input_streaming` (AutoByteus sends neither it nor the legacy `fine-grained-tool-streaming-2025-05-14` beta header) "the API buffers and validates each parameter value before streaming it back" (platform.claude.com/docs/en/agents-and-tools/tool-use/fine-grained-tool-streaming, verified 2026-10-10); invalid/partial JSON is documented only for fine-grained streaming or a `max_tokens` cut (the latter is covered by output-limit recovery, OLR-E2E-011). Not tested; cannot produce a Fail. **Future trigger:** if a later ticket enables `eager_input_streaming` (RSK-002 follow-up), this becomes supported: the Anthropic assembler must then hand unparsable input to the D-07 marker with a decided native-turn and replay shape, and an Anthropic AC-012 case must be added.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-002 cut tool call → discard, note, auto-continue ≤3, then error | Added | REQ-002/003/005, D-04/D-05 | Live real-server cases (first-call and after-tool cuts, exhaustion) |
| BEH-003 text-only cut → keep partial, resume note | Added | REQ-004, D-04 | Live case, live frames + reload |
| BEH-005 protocol violation fails and rolls back | Preserved | REQ-006, D-03 | Live emulated network cut |
| BEH-006 history validity; nothing truncated stored natively | Preserved | REQ-003/005 | Next-request validity accepted by the provider |
| BEH-008 normalized finish on every adapter | Added | REQ-009, D-02, DS-005 | Unit + live (Anthropic, DeepSeek) |
| BEH-009 malformed tool call never runs; retry error | Added | REQ-011, D-07 | Live emulated invalid arguments; provider accepts the replay |
| AC-004 refusal / context window → clear error, no recovery | Added | REQ-002, SR-006 | Live emulated stop reasons |
| AR-004 output-limited compaction summary rejected (`incomplete` + reason) | Changed (projection) | D-02 | Live compaction under a small limit |
| D-08 unique `llm_call_id` per call | Added | D-08 | Token-usage ledger per recovery call |
| Step 1 real output limits | Preserved | REQ-001/007/012 | Re-run Step 1 live suite on the Step 2 tree |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Agent loop (`LlmPhase`, `AgentTurnRunner`, `ToolPhase`), memory note | Unit + agent-level integration with scripted/real-adapter streams | Real server wiring, real provider stream shapes, replay acceptance by the provider | Live API through the real server |
| API / transport / contract | Yes | Provider stream finish reasons; requests after recovery | `stream-finish.test.ts` with recorded shapes | Live shapes; provider acceptance of the recovery/malformed-call requests | Live API |
| Frontend component / state | No (existing segment/error display reused) | — | — | Rendering of a failed "Discarded" segment is existing UI behavior | — |
| Browser integration / user journey | No | — | — | — | — |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes (turn lifecycle) | Same-turn continuation, error/final sequencing | Agent-level tests | WS frames, idle/TURN_COMPLETED sequencing through the server | Live API (WS frames) |
| Persisted-data transition | Yes (additive) | New raw-trace type + USER note message | Unit (snapshot validate), server replay unit | Real projection after reload | Live `getRunProjection` |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | Anthropic, DeepSeek (+ OpenAI, GLM, Gemini, Grok preserved) | Implementation finish smoke (adapter level) | Agent-loop behavior on live shapes | Live API |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-incomplete-content-block-step2` (branch `codex/anthropic-incomplete-content-block-step2`, HEAD `2a65f40fa`, stacked on `1c694cfea`)
- Testing guideline: `TESTING.md` at the worktree root (no closer guideline).
- Discrepancies: `pnpm -C autobyteus-ts test` is a stub (use `pnpm -C autobyteus-ts exec vitest run …`). Core integration must run with `env -i PATH HOME TMPDIR` (the implementer's shell exports provider keys). Using a temp-dir HOME under TMPDIR makes `tests/unit/utils/file-utils.test.ts` "traversal" pass-through (TMPDIR is an allowed root), so that file is re-run with the real HOME path, still under `env -i`.
- Credentials: as round 1 (`api-e2e-evidence/run-output-limit-live.sh` pattern, names only, never printed, saved into the per-run test vault). No `.env` edits, no user app/data.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Root guideline | Core: `autobyteus-ts` tests (+ server); real providers through the vault; Rule 9 base failures |
| `autobyteus-server-ts/vitest.config.ts`, `tests/setup/*` | Server test setup | Per-run reset DB in `tests/.tmp`; serialize server Vitest processes per worktree |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | Compaction knobs | `updateServerSetting` for `AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE`, `AUTOBYTEUS_COMPACTION_TRIGGER_RATIO`, `AUTOBYTEUS_COMPACTION_MODEL_SETTINGS` |
| `autobyteus-server-ts/src/api/graphql/types/run-history.ts` | Reload | `getRunProjection(runId) { conversation }` is the app's history read |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected` (additive trace type + USER note message)
- Evidence planned: reload through `getRunProjection` shows no note; the run's next request after recovery/exhaustion is accepted by the provider (working context valid). Existing snapshots untouched (unit evidence).

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/llm/api/stream-finish.test.ts`, `nonstreaming-finish.test.ts`, `llm/utils/llm-response-finish.test.ts` | Per-adapter finish tables, terminal chunk | AC-010, AR-004 | Still Valid | Read; green | Keep |
| `autobyteus-ts/tests/integration/agent/output-limit-recovery-flow.test.ts` | Agent-level AC-003..AC-006, AC-011, AC-012, D-08 | Step 2 ACs | Still Valid | Green (sanitized) | Keep |
| `autobyteus-ts/tests/unit/agent/loop/tool-phase-malformed-call.test.ts`, handler finish-modes test, `memory/output-limit-recovery-note.test.ts` | Admission, discard, note persistence | AC-012, AC-003, D-06 | Still Valid | Green | Keep |
| `autobyteus-server-ts/tests/unit/run-history/projection/raw-trace-to-historical-replay-events.test.ts` | Hidden note on replay | D-06 | Still Valid | Green | Keep |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-output-limit-live.e2e.test.ts` (round 1) | Step 1 wire limits | AC-001/008/013 | Still Valid; **Needs Update (structure)** | Its server/recorder/run plumbing is needed by the Step 2 suite | Move plumbing into a shared helper; cases unchanged |
| `test-support/live-e2e/*` real-provider runner | Agent flows, compaction | Regression | Still Valid | Round 1 | Re-run |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| OLR-E2E-001 | First-call `write_file` cut (Opus, `max_tokens: 400`): discarded segment, no execution, note in next request, no cut call, continuation with the original request, reload without note/cut, unique call ids | AC-003, REQ-003, D-08, CND-102 | `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-output-limit-recovery-live.e2e.test.ts` | Only real-server proof of the recovery loop and the CND-102 framing on a real model |
| OLR-E2E-002 | Cut after a tool result: note not merged as "current message" | AC-003, CND-102 contrast | same | The user's stuck-run shape |
| OLR-E2E-003 | Text-only cut: partial kept, resume note, two parts live and after reload | AC-005 | same | Live frames and reload |
| OLR-E2E-004 | Exhaustion after 3 recoveries; error names the limit; unique call ids; next message valid | AC-006, D-08 | same | Real count and provider acceptance of the post-exhaustion request |
| OLR-E2E-005 | DeepSeek `length` mid tool call | AC-011, AC-010 | same | Non-Anthropic provider through the agent loop |
| OLR-E2E-006/007 | Refusal / context-window stop → coded error, no tool, no recovery, next message valid | AC-004 | same (emulated stop reason on a real response) | The stop cannot be requested on demand |
| OLR-E2E-008 | No `message_stop` after `tool_use` → failure + rollback, next message valid | AC-007 | same (emulated network cut) | Real-server rollback |
| ~~OLR-E2E-009~~ | (Anthropic malformed arguments) — **removed per CRR-005**: not a supported scenario (buffered streaming validates tool input) | AC-012 (N/A on Anthropic) | — | — |
| OLR-E2E-010 | Output-limited compaction summary → `incomplete` + reason, rejected | AR-004 | same | Real compaction path through server settings |
| OLR-E2E-011 | Anthropic tool cut (`max_tokens: 400`): discarded segment ids never execute; note names tool + limit; cut call absent from next request | AC-003, REQ-003 | same | Deterministic tool-cut semantics (OLR-E2E-001 may be cut in adaptive thinking instead) |
| OLR-E2E-009b | DeepSeek malformed arguments (emulated invalid JSON on a real response) | AC-012 | same | The supported malformed-call scenario: chat-completions `arguments` are model-generated with no documented server validation |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Requirement / AC / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| OLM-E2E-* | `autobyteus-native-output-limit-live.e2e.test.ts` | Use the new shared `tests/e2e/helpers/native-runtime-live-harness.ts`; cases and assertions unchanged | Avoid duplicating ~200 lines of plumbing in two suites | Re-run as Step 1 preserved behavior |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `env -i PATH HOME=<tmp> TMPDIR pnpm -C autobyteus-ts exec vitest run tests/unit` | Step 2 worktree | Core regression | 1946/1947; the 1 failure is the HOME-under-TMPDIR artifact (see Discovery) | `api-e2e-evidence/step2/ts-unit-full.log` |
| 1b | `env -i PATH HOME="$HOME" TMPDIR … vitest run tests/unit/utils/file-utils.test.ts` | same | The artifact re-check | Pass 7/7 | `api-e2e-evidence/step2/ts-unit-file-utils-realhome.log` |
| 2 | `env -i … vitest run tests/integration/agent/output-limit-recovery-flow.test.ts tests/integration/agent/runtime tests/integration/agent/provider-native-tool-continuation-flow.test.ts tests/integration/agent/memory-tool-call-flow.test.ts` | same | Agent-level Step 2 behavior | Pass (33 passed, 1 skipped) | `api-e2e-evidence/step2/ts-integration-focused.log` |
| 3 | `env -i … vitest run tests/integration` | same | Whole core integration | 73 pass / 9 fail / 26 skip; the 9 failing files are exactly the handoff's baseline list | `api-e2e-evidence/step2/ts-integration-full.log` |
| 4 | `pnpm -C autobyteus-ts build` | same | Production compile | Pass | `api-e2e-evidence/step2/ts-build.log` |
| 5 | `pnpm -C autobyteus-server-ts typecheck` | same | Server against changed core | Pass | `api-e2e-evidence/step2/server-typecheck.log` |
| 6 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history tests/unit/agent-execution/compaction --no-watch` | same | Replay (hidden note), compaction | Pass (50 files / 246 tests) | `api-e2e-evidence/step2/server-unit-focused.log` |

## Test-Case Ledger Decision

- Ledger required: `Yes` (multiple live cases, paid calls, emulation cases)
- Canonical ledger path: `api-e2e-test-case-ledger.md` (round 2 section)

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | Agent-level tests for every Step 2 AC through real adapters with recorded shapes | No server path; no live model behavior after the note (CND-102) | Live real-server cases |
| Changed-boundary execution directness | 80% | The agent loop is real in integration tests | Provider streams are recorded/scripted | Live provider streams |
| Cross-boundary integration realism and mock gap | 70% | — | WS frames, reload projection, provider acceptance of recovery/malformed requests | Live API through the server |
| Environment, configuration, identity, and fixture fidelity | 70% | — | Server settings (compaction), run `llmConfig` path | Live |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | Exhaustion, refusal, malformed, reasoning-only, compaction projection at agent level | Live counts and post-failure validity | Live |
| User-surface, browser, and desktop-shell confidence | N/A | Existing segment/error display reused; no renderer change | — | — |
| Durable regression coverage quality and relevance | 85% | Broad unit/integration | No real-path durable coverage for Step 2 | Gated live suite |

- Overall post-repository confidence: 78%
- Every critical acceptance criterion directly proven: `No` (not through the real server)
- Any applicable category below `90%`: `Yes` (all)
- Default clean-confidence target met: `No`

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Live API` (real in-process server, real providers, wire recorder; one-shot response-text edits only for RU-103/RU-104), plus the Step 1 live suite and the real-provider runner as regression
- Specific confidence gap addressed: real model behavior after the hidden note (CND-102), provider acceptance of every post-recovery/post-failure request, WS frames and reload projection, compaction through server settings
- Browser-specific decision: Not required (no renderer change; the WS frames the renderer consumes are asserted directly)

## Live Environment And Fixture Plan

- Runner: `api-e2e-evidence/step2/run-live.sh <evidence-dir> <spec> [filter]` (clean `env -i`, credentials by name).
- Settings changed by OLR-E2E-010 are deleted in `finally`.
- Evidence: per-call summaries, frame digests, recovery request message tails, reload projections, ledger rows.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| A genuine provider-issued refusal/context-window stop mid stream | Cannot be requested on demand; emulated at the transport (real response, edited stop reason) | Low (ASM-002; generic handling) | None |
| AC-009 | User verification after release | — | Delivery / user |
| Kimi, Qwen, Mistral, Ollama live | No usable API key/model; out of scope per the user (2026-10-10) | — | — |
| Unmapped stops (`MALFORMED_FUNCTION_CALL`, DeepSeek `insufficient_system_resource`/`aborted`, GLM `network_error`, Anthropic `pause_turn`) | Accepted design residual (`other`) | Low | — |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| OLR-E2E-009 (round 2, first execution): Anthropic invalid tool-input JSON failed the turn | Resolved by failure-origin review CRR-005: invalid test premise (`Local Fix` → API/E2E); case removed; AC-012 on Anthropic `Not Applicable` | `code-review-report.md` "Failure-Origin Review (CRR-005)"; Anthropic fine-grained tool streaming docs | — |
| CND-102 (held) | Resolved — no reroute | OLR-E2E-001: first-call cut, note merged under "The user's current message is:", the model continued the original request in pieces to 100/100 lines (runs 3 and final). OLR-E2E-002: the first note after a tool result is not merged. Consecutive notes (and, after exhaustion, the next user message) are chained in one composed message; the model still answered the latest content (OLR-E2E-004 follow-up) | — |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` (executed; first result Fail on OLR-E2E-009 → CRR-005 Local Fix → case removed and suite re-run)
- Durable coverage added/updated: `Yes` (new recovery suite; shared helper; Step 1 suite refactored onto it)
- Broader validation decision: `Required`
- Reroute Required Before Validation Execution: `No`

## Round 1 Basis (Step 1) — summary

Round 1 (API-REV-001, Pass, 95%) proved REQ-001/007/012 on the wire through the real server (OLM-E2E-001..010; OLM-E2E-008 Qwen blocked by an invalid credential) and fixed the stale live-E2E harness as a baseline (now `9dc55702f`). The round-1 execution detail is preserved in `api-e2e-revision-record.md` (API-REV-001) and the ledger's round-1 section.
