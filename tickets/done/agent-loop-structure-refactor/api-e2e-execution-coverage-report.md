# API/E2E Execution Coverage Report — agent-loop-structure-refactor

**Latest authoritative round: 4 (API-REV-004), head `04b879d55` — Result `Pass`, final confidence 95.7%.** Round 4 re-validated IR-004 (merge of `origin/personal` @ `c2e366806`; the base's per-call output-speed timing ported into the refactored loop). Rounds 3, 2 and 1 follow.

## Round 4 — Re-entry after IR-004 / CRR-008

- Delta in the loop: `LlmCallTiming` ported (`llm-call-throughput.ts` byte-identical to the base; `start()` before `streamMessages` after the same fences; `observeChunk` after the `llm_stream_chunk` fence and before accumulation via an optional observer on `collector.consume`; `output_throughput` in the token-usage payload). Timing owned by `LlmPhase`'s per-call record. Golden snapshot re-recorded for that field only (reviewer-verified on the unchanged base).

| Case | Result | Evidence (`evidence/api-e2e/round4/`) |
| --- | --- | --- |
| Golden `CI=1` | Pass 12/12 | `golden.log` |
| Core unit | Pass 2035/2035 | `ts-unit.log` |
| Agent integration | Pass (56/15 skip; 1 baseline `read-media-file`) | `ts-integration-agent.log` |
| Core build, server typecheck | Pass | `build.log`, `server-typecheck.log` |
| **TPS live probe** (native runtime, real server; temporary spec removed, copy kept) | **Pass 5/5**: `generation` — DeepSeek thinking off 193 tok / 1,523 ms; DeepSeek streamed reasoning 172 / 1,051; OpenAI (0 reasoning tokens) 135 / 726; `end_to_end` — Gemini with 972 hidden reasoning tokens 143 / 9,080 (≤ 9,314 elapsed); minimum sample — a 2-token answer carries `null`. Numerator = reported output in every case | `tps-probe.log`, `tps-probe/` |

- Environment limit: Anthropic returned `credit balance is too low` on 2026-10-17 (`tps-probe-run1-anthropic-credit.log`); Anthropic cases replaced by other providers — the timing code is provider-agnostic. Anthropic live suites (prompt caching, compaction cache reuse) were not due this round; if they are needed later, the account needs credit.
- Existing TPS suites not used: `token-meter-tps-live` needs a local LM Studio model (native case) or an external built server (DeepSeek case); `token-meter-tps-transport` scripts the AGY CLI and does not exercise the native loop.
- CND-004 (golden `method` timing dependence) noted; not observed.
- Durable coverage changed by API/E2E: `No`. Cleanup: probe removed; source tree clean; no temp data left.
- Scorecard: requirement/AC 97; directness 96; integration realism 95; environment/fixture 94 (Anthropic credit); failure/edge 96; user surface N/A; durable regression 96 → **95.7%**. No category below 90; every critical AC directly proven.

---

## Round 3 — Re-entry after IR-003 / CRR-006

- Delta vs round 2 (`b12e8c113`): `002207b11` only, +5 lines in `agent-turn-runner.ts` (`default: { const unhandled: never = llmOutcome; throw … }`); the four cases are untouched. Delivery's base merges since round 2 (DR-002 `4612c8066`, DR-003 `5f1b45f46`) change nothing under `autobyteus-ts/src/agent`, `memory/` or `llm/` and were re-checked by delivery.
- Behavior: unchanged for existing outcomes (the `default` is unreachable with the four `LlmPhaseOutcome` kinds); the guard turns a future unhandled kind into a compile error.

| Case | Result | Evidence (`evidence/api-e2e/round3/`) |
| --- | --- | --- |
| Golden `CI=1` | Pass 12/12 (snapshot unchanged) | `golden.log` |
| Core unit | Pass 2027/2027 | `ts-unit.log` |
| Agent integration | Pass (56/15 skip; 1 baseline `read-media-file`) | `ts-integration-agent.log` |
| Core build, server typecheck | Pass | `build.log`, `server-typecheck.log` |
| GUARD-001 compile guard (temporary removal of the `compaction_blocked` case) | Pass: `tsc` fails `TS2322 … '{ kind: "compaction_blocked"; }' is not assignable to type 'never'` at line 84; reverted, `git diff` clean, `tsc` clean | `guard-mutation-tsc.log`, `guard-after-revert-tsc.log` |

- Live suites not re-run: no runtime path changed; API-REV-001/002 live evidence stands.
- Durable coverage changed by API/E2E: `No` (the guard check was a temporary, reverted edit).
- Scorecard (unchanged from round 2 except durable regression, now also a compile-time guard): requirement/AC 97; directness 96; integration realism 95; environment/fixture 95; failure/edge 96; user surface N/A; durable regression 96 → **96%**. No category below 90; every critical AC directly proven.
- Cleanup: source tree clean for `autobyteus-ts`/`autobyteus-server-ts`; no temp data created.

---

## Round 2 — Re-entry after IR-002 / CRR-003

- Trigger: CRR-003 Pass (Targeted Delta Review) after DR-001 → IR-002. Diff vs round 1 in the loop: `context_compaction_threshold_tokens` added to `LlmPhase.notifyTokenUsage` via `LlmCallCompaction.triggerThresholdTokens`; nothing else in the refactor changed. Golden snapshot re-recorded on the merged base (field only; reviewer verified on unchanged `e305a20a5`).
- Equivalence (source): the base computed the threshold only with compaction enabled and a request capacity; the refactor constructs `LlmCallCompaction` only when enabled and its budget only with a capacity → identical number/null cases.
- Reachability: the server's native backend always enables automatic compaction, so the app path is numeric; null is core-only and covered by the golden suite (14 null payloads).

| Case | Result | Evidence (`evidence/api-e2e/round2/`) |
| --- | --- | --- |
| Golden `CI=1` | Pass 12/12 | `golden.log` |
| Core unit | Pass 2027/2027 | `ts-unit.log` |
| Agent integration | Pass (56/15 skip; 1 baseline `read-media-file`) | `ts-integration-agent.log` |
| Build, server build, server typecheck | Pass | `build.log`, `server-build.log`, `typecheck.log` |
| Server unit | Pass 5322 / 7 skip | `server-unit.log` |
| Server token-usage (unit + e2e, after server build) | Pass 167/167 | `server-token-usage.log` |
| **ALSR-TU-001 live threshold probe** (Opus, real server) | **Pass**: frame `context_compaction_threshold_tokens` = stored `getAgentRunTokenUsageSummary.contextCompactionThresholdTokens`; 697,395 at the default ratio 0.8 and 435,872 after `AUTOBYTEUS_COMPACTION_TRIGGER_RATIO=0.5` — exactly ratio × (1,000,000 − 128,000 − 256) | `threshold-probe.log`, `threshold-probe/` (temporary spec removed from the tree; copy kept) |
| Output-limit recovery live | Pass 15/15 | `olr-run.log` |

- Not re-run: prompt-caching, compaction-cache-reuse and output-limits live suites (boundaries unchanged by the delta; golden compaction scenarios cover the ported field; round-1 passes stand).
- Durable coverage changed by API/E2E: `No` (the temporary probe was removed; the re-recorded golden snapshot is implementation's, reviewed in CRR-003).
- Round-2 scorecard: requirement/AC proof 97; changed-boundary directness 96 (field proven on the real server path); integration realism 95; environment/fixture fidelity 95; failure/edge 96; user surface N/A; durable regression 96 → **96%** (simple average). No category below 90; every critical AC directly proven.
- Cleanup: probe spec removed (`git status` clean for `autobyteus-ts`/`autobyteus-server-ts`); the probe's server setting deleted in `afterAll`; no temp dirs left by this round.

---

# Round 1 (API-REV-001)

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-loop-structure-refactor/tickets/in-progress/agent-loop-structure-refactor/`. Evidence: `evidence/api-e2e/`.

## Execution Round Meta

- Requirements Doc: `requirements-doc.md` (Approved; SR-003)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (Ready, SR-003)
- Supplemental Task Artifacts: `task-brief.md`, `approval-request.md`, `handoff-architecture-design-complete.md`, `evidence/` (implementation live runs)
- Design Review Report: `design-review-report.md` (Pass, ARCH-REV-001)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (Pass, CRR-001)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: code review pass CRR-001
- Latest Authoritative Round: 1

## Routing Classification

- Task size: `Medium`; Architectural risk: `High`; Input route: `Reviewed`; Successful-output route: `Code Review`
- Proportional test-code review decision: `Not Required` for this round — API/E2E added, updated or removed no durable test code (the golden and collector tests were added by implementation and reviewed in CRR-001)

## Investigation And Execution Basis

- Investigation completed before execution: `Yes`; plan followed: `Yes`; reroute: `No`.

## Test-Case Ledger Reconciliation

- Ledger initialized before execution, every case recorded, reconciled: `Yes`. Last event: 11.

| Case ID | Final Result | Evidence |
| --- | --- | --- |
| REP-001 Golden (`CI=1`) | Pass 12/12 | `golden.log` |
| REP-002 Core unit | Pass 2081/2081 | `ts-unit.log` |
| REP-003 Agent integration | Pass (56 pass / 15 skip; 1 baseline failure `read-media-file-continuation-flow`, stale catalog model, file unchanged) | `ts-integration-agent.log` |
| REP-004 Build + server typecheck | Pass | `build.log`, `typecheck.log` |
| REP-005 Dead-state grep + zero-diff seams | Pass | ledger row 5 |
| LIVE-CCR Compaction cache reuse | Pass 4/4 | `ccr-run1.log`, `ccr-run1/` |
| LIVE-APC Anthropic prompt caching | Pass 7/7 | `apc-run1.log`, `apc-run1/` |
| LIVE-OLR Output-limit recovery | Pass 15/15 | `olr-run1.log`, `olr-run1/` |
| LIVE-OLM Output limits | Pass 10/11; Qwen 401 (out of scope per user) | `olm-run1.log`, `olm-run1/` |
| FID-001 Golden fidelity mutation | Pass (golden detected the reorder: 7 failed; reverted clean) | `golden-mutation.log` |
| REP-006 Golden after revert + server unit | Pass 12/12; server 5242 pass / 7 skip | `golden-after-revert.log`, `server-unit.log` |

## Compatibility / Legacy Scope Check

- Backward compatibility in scope: `No`; compatibility-only behavior observed: `No`; persisted-data transition: `N/A` (`Not Affected`; golden asserts identical memory writes, working context and raw traces); compatibility-only durable coverage: `No`.

## Changed Boundary And Evidence Matrix

| Case ID | AC IDs | Changed Boundary | Mode | Evidence Type | Result |
| --- | --- | --- | --- | --- | --- |
| REP-001, FID-001, REP-006 | AC-003, QR-001 | Ordered events/statuses/segments/memory writes/requests of 12 scenarios | Scripted LLM through the real agent runtime | Durable | Pass; fidelity demonstrated |
| REP-002..004 | AC-001 | Core + server | Repository | Durable | Pass |
| REP-005 | AC-005, AC-007 | Dead state; stable seams | Source | Static | Pass |
| LIVE-CCR | AC-002, AC-007 | Compaction (cached summary, tools change, Gemini transcript, raised limit) | Real server + Opus/Gemini, strict thinking check | Durable + Live | Pass 4/4 |
| LIVE-APC | AC-002 | Prompt caching, interrupt note, Stop/reopen, Settings change | Real server + Opus, strict | Durable + Live | Pass 7/7 |
| LIVE-OLR | AC-002 | Output-limit recovery, refusal/context/network-cut/malformed | Real server + Opus/DeepSeek/OpenAI/Gemini | Durable + Live | Pass 15/15 |
| LIVE-OLM | AC-002 | Real output limits | Real server + 6 providers | Durable + Live | Pass (Qwen out of scope) |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository | Final | Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 97% | AC-001 (all suites), AC-002 (all four live suites), AC-003 (golden + demonstrated fidelity), AC-007 (compaction suites + live CCR + zero-diff seams) | — |
| Changed-boundary execution directness | 90% | 96% | The refactored loop is exercised by the golden scenarios and by every live agent turn | — |
| Cross-boundary integration realism and mock gap | 80% | 95% | Real server, real providers, WS frames, reload, strict thinking-binding check | Golden uses a scripted LLM (by design); live covers the real providers |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | Clean `env -i`, per-run vaults, `CI=1` golden | CCR fixture sensitivity to model output size (pre-existing, owned by the CCR suite) |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 96% | Golden: interrupts, provider error, content filter, malformed call, exhaustion, compaction blocked; live: interrupt, Stop/reopen, recovery, compaction | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | No renderer/shell/server-contract change | — |
| Durable regression coverage quality and relevance | 90% | 96% | Golden suite proven to catch an ordering change; live suites gated | — |

- Overall final confidence: 95.8% (simple average of the six applicable categories)
- Every critical AC directly proven: `Yes`; any category below 90%: `No`; 95% target met: `Yes`.

## Broader Validation Decision And Execution

- Decision: `Required`, executed: Live API, four gated suites through the in-process real server, credentials by name into per-run test vaults, clean `env -i` (`evidence/run-live.sh`).
- CCR-E2E-002 variance (CND-002): passed in this run. Across three runs on the same commit, its largest T3 history was 45.8k (implementer, failed), 29.8k (implementer rerun, passed) and 38.2k (this run, passed), with per-call output ranging from ~130 to ~3,400 tokens. Pass/fail follows model verbosity against the case's fixed budget, not the code; it did not recur, so no base comparison was needed. Fixture robustness stays with the CCR suite owner (non-blocking).
- Desktop instance: not run (no UI/shell change; the live suites assert the WS frames and reload projections the app consumes).

## Durable Coverage Changed In The Codebase

- `No` (API/E2E changed no repository test files). FID-001 was a temporary source edit, reverted (`git diff` clean) and re-verified by REP-006.

## Temporary Execution Methods / Scaffolding

| Method | Why | Result | Cleanup |
| --- | --- | --- | --- |
| FID-001: moved `notifyTokenUsage` after `commitRequest` in `LlmPhase.settleCompleted` | Prove the golden suite detects an ordering change | 7/12 scenarios failed (all that reach a normal completion) | `git checkout`; clean; golden 12/12 again |

## Dependencies Mocked Or Emulated

- Golden suite: scripted LLM (design of the characterization test). Live suites: real providers; output-limit recovery cases 006–009b edit real responses one-shot (as in their suite).

## Result Summary

| Result | Cases | Summary |
| --- | --- | --- |
| Pass | All | Behavior identical: golden sequences unchanged and proven sensitive; all repository suites; all four live suites |
| Out Of Scope | OLM-E2E-008 | Qwen key invalid; providers without a usable key are out of scope (user, 2026-10-10) |

## Cleanup Performed

| Resource | Ownership | Action | Result |
| --- | --- | --- | --- |
| Per-run vaults, servers, temp dirs of this round | This validation | Suites' `afterAll` + runner `trap` | No leftovers from this round |
| Three `compaction-cache-e2e-*` temp dirs dated 2026-10-11 | Not this round (pre-existing, likely the implementation run) | Left untouched; reported | — |

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95.8%; target met: `Yes`; categories below 90%: `No`
- Broader validation decision: `Required`, executed
- Critical ACs lacking direct proof: none
- Next recipient: per `get_handoff_rules`
- Notes: non-blocking — CND-003 (exhaustive `never` default in the runner `switch`) stays a reviewer suggestion; CCR fixture sensitivity is the CCR suite owner's.
