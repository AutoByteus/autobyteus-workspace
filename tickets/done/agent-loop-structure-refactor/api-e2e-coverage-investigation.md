# API/E2E Coverage Investigation — agent-loop-structure-refactor

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-loop-structure-refactor/tickets/in-progress/agent-loop-structure-refactor/` (paths below are relative to it unless repository-relative).

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved 2026-10-11; SR-003; DEC-001 named outcome handlers, DEC-002 ToolPhase assess only)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (Ready, SR-003; D-01..D-08)
- Supplemental Task Artifacts: `task-brief.md`, `approval-request.md`, `handoff-architecture-design-complete.md`, `evidence/` (implementation live runs)
- Design Review Report: `design-review-report.md` (Pass, ARCH-REV-001)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (Pass, CRR-001, 9.4/10)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: code review pass CRR-001 (IR-001)
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file, round 1

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` only if API/E2E changes durable test code (none planned; the golden suite and collector test were added by implementation and already reviewed)

## Current Requirement And Design Basis

Pure refactor of the AutoByteus-runtime agent loop (`autobyteus-ts/src/agent/loop`). In scope for API/E2E: AC-001 (all suites pass with unchanged assertions), AC-002 (gated live suites: same results as before), AC-003 (golden event/status sequences identical), AC-007 (compaction cache-reuse invariants CON-001..CON-006 unchanged). AC-004/005/006/008 are code/doc review criteria (CRR-001 Pass) and are not re-litigated here; AC-005's "dead state removed" is spot-checked by grep.

Design: D-01 `LlmResponseStreamCollector`; D-02 `LlmCallCompaction`; D-03/D-04 `LlmPhase` named steps, outcome carries invocations; D-05 runner owns the tool batch, dead state removed; D-06 runner outcome handlers; D-07 `ToolPhase` unchanged; D-08 docs. The one intended internal move (tool-batch start from `LlmPhase` to `runToolStep`) was judged unobservable (P-001).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (any agent turn: final answer, tool cycles, interrupt, provider error, output-limit recovery, compaction blocked), SCN-002 (compaction cache reuse).
- Real-use scenarios added: RU-201 — a turn through the real server with real providers (WS frames, raw traces, reload), exercised by the three gated live suites; RU-202 — the golden suite's fidelity: a deliberate ordering change in the refactored loop must make it fail (otherwise AC-003 evidence is weak).
- Contrived: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 agent-loop observable behavior | Preserved | REQ-001 | Golden suite (CI=1), unit/integration, live suites |
| BEH-002 compaction cache-reuse invariants | Preserved | CON-001..006 | Compaction unit/integration suites, CCR live suite |
| Internal ownership (collector, LlmCallCompaction, runner handlers, batch owner) | Changed (structure only) | D-01..D-06 | No new external observable; covered through BEH-001 evidence |
| Dead state (`toolInvocationBatches`, `activeTurn` fallback) | Removed | REQ-004 | grep spot-check |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `autobyteus-ts` agent loop | Golden (12 scenarios, scripted LLM), unit, agent integration | Real provider stream timing/shapes, real server event projection | Live API (gated suites) |
| API / transport / contract | No (no server/web change) | — | Server unit/integration | — | — |
| Frontend / browser / desktop shell | No | — | — | — | Not required |
| Process / lifecycle | Yes (turn lifecycle, interrupt) | Runner/LlmPhase sequencing | Golden interrupt scenarios | Live interrupt through the server (APC-E2E-002) | Live API |
| Persisted data | No (memory writes asserted identical) | — | Golden working context / raw traces | — | — |
| External integration | Indirect | Same provider adapters | — | Live provider behavior through the refactored loop | Live API |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-loop-structure-refactor` @ `261ab15dc` (base `beb6b3b49`).
- Testing guideline: `TESTING.md` (worktree root). `pnpm -C autobyteus-ts test` is a stub → `pnpm -C autobyteus-ts exec vitest run …`. Core integration and live suites under `env -i` (implementer's shell exports provider keys); use the real HOME path for core unit (a temp HOME under TMPDIR makes `file-utils` traversal test pass-through — seen on the previous ticket).
- Golden suite must run with `CI=1` so snapshots are never rewritten.
- Server Vitest processes share `autobyteus-server-ts/tests/.tmp` per worktree: serialize server unit runs and live suites.
- Credentials: `evidence/run-live.sh <GATE> <dir> <spec> [filter]` (names only, per-run vault, clean env).

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/integration/agent/agent-loop-event-sequence.test.ts` + snapshot | 12 golden event/memory/request sequences | AC-003 | Still Valid | Added in `cd03cd74b` (test + snapshot only, on the unchanged base); snapshot byte-identical at HEAD | Run with `CI=1`; fidelity check by a temporary mutation |
| `autobyteus-ts/tests/unit/agent/loop/llm-response-stream-collector.test.ts` | Collector finalization modes | AC-004 | Still Valid | New, reviewed | Run |
| `tests/unit/agent/tool-invocation.test.ts`, `pipelines/llm-response-pipeline.test.ts` | One-line structural edits | AC-001 | Still Valid (structural, justified in handoff) | Diff | Run |
| Core unit + agent integration (incl. `agent-runtime-compaction`, output-limit recovery flow) | Existing behavior | AC-001, AC-007 | Still Valid | Unchanged assertions | Run (sanitized) |
| Server unit / integration / typecheck | Server over the core | AC-001 | Still Valid | — | Run unit + typecheck |
| Gated live: `autobyteus-native-output-limit-recovery-live`, `autobyteus-native-output-limit-live`, `autobyteus-anthropic-prompt-caching-live`, `autobyteus-compaction-cache-reuse-live` | Real-provider agent loop through the real server | AC-002, AC-007 | Still Valid | Prior tickets: all pass on base | Re-run (CCR fully, twice if needed; base comparison if CCR-E2E-002 recurs) |

## Durable Coverage To Add / Update / Remove

None planned.

## Repository Coverage Execution Plan

| Order | Command | Boundary Or Scenario Proven | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | `env -i PATH HOME=$HOME TMPDIR CI=1 pnpm -C autobyteus-ts exec vitest run tests/integration/agent/agent-loop-event-sequence.test.ts` | AC-003 | Planned | `evidence/api-e2e/golden.log` |
| 2 | Golden fidelity: temporary reorder of two notifier calls in the refactored loop, `CI=1` golden must fail; reverted | AC-003 strength | Planned | `evidence/api-e2e/golden-mutation.log` |
| 3 | `env -i … pnpm -C autobyteus-ts exec vitest run tests/unit` | AC-001 | Planned | `evidence/api-e2e/ts-unit.log` |
| 4 | `env -i … CI=1 pnpm -C autobyteus-ts exec vitest run tests/integration/agent` | AC-001, AC-007 | Planned | `evidence/api-e2e/ts-integration-agent.log` |
| 5 | `pnpm -C autobyteus-ts build`; `pnpm -C autobyteus-server-ts typecheck` | AC-001 | Planned | `evidence/api-e2e/build.log`, `typecheck.log` |
| 6 | `pnpm -C autobyteus-server-ts test:unit` (after live suites) | AC-001 | Planned | `evidence/api-e2e/server-unit.log` |
| 7 | grep: `toolInvocationBatches`, `activeTurn` fallback absent | AC-005 spot-check | Planned | report |

## Test-Case Ledger Decision

- Required: `Yes` (multiple gated live suites, paid calls, possible base comparison). Path: `api-e2e-test-case-ledger.md`.

## Broader Validation Decision

- Decision: `Required` — Live API (gated real-provider suites through the in-process real server) for AC-002/AC-007; the golden suite covers ordering with a scripted LLM only.
- Browser / desktop: Not required — no renderer/shell/server-contract change; the live suites assert the WebSocket frames and reload projections the app consumes. The handoff's optional desktop comparison would add no boundary not already exercised.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| Desktop UI | No UI change | None | — |
| Providers without a usable key (Qwen, Kimi, Mistral, Ollama) | Out of scope per the user (2026-10-10) | — | — |

## Ambiguities Or Reroute Triggers

CCR-E2E-002 variance: if it recurs, compare against the base (`beb6b3b49`) before classifying.

## Investigation Decision

- Proceed: `Yes`; durable coverage changes: `No`; broader validation: `Required` (Live API); reroute before execution: `No`.

---

## Round 2 (re-entry after IR-002 / CRR-003) — investigation update

- Trigger: delivery DR-001 (merge conflict with `origin/personal` @ `e305a20a5`) → IR-002 Local Fix → CRR-003 Pass. Head `b12e8c113` (`6c88ddc71` merge; `b12e8c113` golden snapshot re-recorded on the merged base).
- Delta vs API-REV-001 in the loop: one token-usage payload field, `context_compaction_threshold_tokens`, ported from the base's `9e8e5bf26` into `LlmPhase.notifyTokenUsage` via `LlmCallCompaction.triggerThresholdTokens`. Equivalence checked by source: base computes the budget only when automatic compaction is `enabled` **and** a request capacity exists; the refactor creates `LlmCallCompaction` only when enabled and its budget only with a capacity → same number/null cases. Runner, collector, `agent-turn.ts`, pipeline, docs unchanged since round 1.
- Golden snapshot validity: changed only by that field (24 payloads: 10 numeric, 14 null); test file unchanged; the reviewer verified the new snapshot on the unchanged base `e305a20a5` (12/12, `CI=1`). Decision: `Still Valid` (re-recorded for a base-side contract addition, not a refactor change).
- Reachability: the server's native backend always enables automatic compaction (`autobyteus-agent-run-backend-factory.ts` → `createEnabledMemoryCompactionConfiguration`); there is no app setting to turn it off. Numeric = reachable through the app; null = core-level only (disabled configuration or unknown capacity), covered by the golden suite. Not a gap: the "off" path has no real-use trigger in the app.
- Round-2 plan:
  1. Repository re-run on the merged head: golden `CI=1`, core unit, agent integration (`env -i`), build, server typecheck, server unit, server token-usage suites (after a current server build for the e2e restart case).
  2. Live (real server, real Anthropic): a ticket-local probe (temporary spec, copy kept in `evidence/api-e2e/round2/`) asserting the native `TOKEN_USAGE_UPDATED` frames and the persisted run record carry a numeric `context_compaction_threshold_tokens` below the effective window, and that it moves with `AUTOBYTEUS_COMPACTION_TRIGGER_RATIO` (live value, not a constant).
  3. Output-limit recovery live suite as a merged-head sanity of the loop (cheap; broadest live loop exercise). Prompt-caching and compaction-cache-reuse not re-run: their boundaries are unchanged by the delta and covered by the golden compaction scenarios.

---

## Round 3 (re-entry after IR-003 / CRR-006) — investigation update

- Trigger: user-requested CND-003 → IR-003 → CRR-006 Pass. Head `002207b11` on top of `5f1b45f46` (delivery DR-003 base refresh).
- Delta vs my round 2 (`b12e8c113`): delivery's base merges (DR-002 `4612c8066`, DR-003 `5f1b45f46`) change nothing under `autobyteus-ts/src/agent`, `memory/` or `llm/` (`git diff --stat` empty); delivery re-ran checks for them (DR-002/DR-003). The only loop change is `002207b11`: +5 lines in `agent-turn-runner.ts`, an exhaustive `default` (`const unhandled: never = llmOutcome; throw …`) on the outcome `switch`; the four cases are untouched.
- Behavior impact: none for existing outcomes (`LlmPhaseOutcome` has exactly the four handled kinds, so the `default` is unreachable at run time); it turns a future unhandled outcome into a compile error.
- Plan (proportional): golden `CI=1`, core unit, agent integration (`env -i`), core build and build-config typecheck, server typecheck; an independent compile-guard check (temporarily remove one case → `tsc` must fail with TS2322 at the `never` assignment; revert). Live suites not re-run: no runtime path changed (API-REV-001/002 stand).
- Durable coverage changes: none planned.

---

## Round 4 (re-entry after IR-004 / CRR-008) — investigation update

- Trigger: delivery DR-004 (merge `origin/personal` @ `c2e366806`, output-tps-precision) → IR-004 → CRR-008 Pass. Head `04b879d55` (`78bf3f910` merge; `bc78c81f2` golden re-recorded; `04b879d55` doc).
- Delta in the loop: the base's per-call timing ported into the refactored `LlmPhase`. Source equivalence checked against `c2e366806:llm-phase.ts`: `llm-call-throughput.ts` byte-identical; `timing.start()` immediately before `streamMessages` after the same `llm_request_assembly`/`llm_stream_start` fences; `observeChunk` per chunk after the `llm_stream_chunk` fence and before accumulation (new optional observer on `collector.consume`); `output_throughput: timing.throughput(tokenUsage)` in the token-usage payload.
- Golden snapshot: re-recorded for `output_throughput` only (24 payloads, all `end_to_end`), reviewer-verified on the unchanged base. CND-004 noted: `method` is timing-dependent; a golden diff on `method` alone would be that, not a product change.
- Existing suites: `token-meter-tps-live` needs a local LM Studio model for its native case (unavailable here) or an external built server for its DeepSeek case; `token-meter-tps-transport` uses a scripted AGY CLI (not the native loop). Neither exercises the refactored native timing directly → a temporary live probe on the native runtime through the real server is the most direct evidence.
- Plan: golden `CI=1`, core unit, agent integration, build, server typecheck; live probe TPS-001..005 (both methods, minimum-sample null, numerator, duration bounds). Live suites not re-run (no other runtime path changed).
- Environment note: the Anthropic account returned `credit balance is too low` on 2026-10-17, so the probe's Anthropic cases were replaced by DeepSeek/OpenAI/Gemini (the timing is provider-agnostic in `LlmPhase`).
