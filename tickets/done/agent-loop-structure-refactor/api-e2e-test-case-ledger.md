# API/E2E Test-Case Ledger — agent-loop-structure-refactor

## Ledger Meta

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-loop-structure-refactor` @ `261ab15dc`
- Coverage investigation: `api-e2e-coverage-investigation.md`
- Execution coverage report: `api-e2e-execution-coverage-report.md`
- API/E2E revision record: `api-e2e-revision-record.md`
- Scope: repository checks plus four gated live suites (paid calls) and a golden fidelity mutation
- Evidence: `evidence/api-e2e/`

## Planned Cases

| Case ID | Case / Journey | AC IDs | Surface | Command / Entry | Order |
| --- | --- | --- | --- | --- | --- |
| REP-001 | Golden suite (`CI=1`) | AC-003 | core integration, scripted LLM | `vitest run tests/integration/agent/agent-loop-event-sequence.test.ts` | 1 |
| REP-002 | Core unit | AC-001 | core | `vitest run tests/unit` | 2 |
| REP-003 | Agent integration (`CI=1`, `env -i`) | AC-001, AC-007 | core | `vitest run tests/integration/agent` | 3 |
| REP-004 | Build + server typecheck | AC-001 | build | `pnpm -C autobyteus-ts build`; `pnpm -C autobyteus-server-ts typecheck` | 4 |
| REP-005 | AC-005 grep spot-check + zero-diff seams | AC-005, AC-007 | source | grep / `git diff --stat` | 5 |
| LIVE-CCR | Compaction cache reuse live (4 cases) | AC-002, AC-007 | real server, Opus + Gemini | `run-live.sh RUN_COMPACTION_CACHE_E2E …` | 6 |
| LIVE-APC | Anthropic prompt caching live (7 cases) | AC-002 | real server, Opus | `run-live.sh RUN_ANTHROPIC_CACHE_E2E …` | 7 |
| LIVE-OLR | Output-limit recovery live (15 cases) | AC-002 | real server, Opus/DeepSeek/OpenAI/Gemini | `run-live.sh RUN_NATIVE_OUTPUT_LIMIT_E2E …recovery…` | 8 |
| LIVE-OLM | Output limits live (11 cases) | AC-002 | real server, 6 providers | `run-live.sh RUN_NATIVE_OUTPUT_LIMIT_E2E …output-limit-live…` | 9 |
| FID-001 | Golden fidelity: temporary reorder in `LlmPhase.settleCompleted`, golden must fail; reverted | AC-003 strength | core | manual edit + golden + `git checkout` | 10 |
| REP-006 | Golden after revert + server unit | AC-001, AC-003 | core + server | `vitest` / `test:unit` | 11 |

## Execution Events

| Seq | Case ID | Date | Event | Command / Configuration | Expected | Observed | Result | Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | REP-001 | 2026-10-12 | Completed | `env -i PATH HOME=$HOME TMPDIR CI=1 …golden` | 12/12, snapshot unchanged | 12/12; snapshot byte-identical since `cd03cd74b` (which adds only the test + snapshot on the base) | Pass | `golden.log` | — |
| 2 | REP-002 | 2026-10-12 | Completed | `env -i … vitest run tests/unit` | all pass | 310 files / 2081 tests | Pass | `ts-unit.log` | — |
| 3 | REP-003 | 2026-10-12 | Completed | `env -i … CI=1 vitest run tests/integration/agent` | all pass except known baseline | 56 passed / 15 skipped / 1 failed: `read-media-file-continuation-flow` (stale `gemini-3.5-flash` catalog lookup; file unchanged) | Pass (baseline failure) | `ts-integration-agent.log` | — |
| 4 | REP-004 | 2026-10-12 | Completed | build; server typecheck | clean | clean | Pass | `build.log`, `typecheck.log` | — |
| 5 | REP-005 | 2026-10-12 | Completed | grep / diff | dead state gone; seams zero-diff | `toolInvocationBatches` and the response-pipeline `activeTurn` fallback absent; only `AgentTurnRunner` starts batches; zero diff: `tool-phase.ts`, `llm-request-assembler.ts`, `conversation-request.ts`, `memory/`, `agent/streaming/`, server and web source | Pass | report | — |
| 6 | LIVE-CCR | 2026-10-12 | Completed | `run-live.sh RUN_COMPACTION_CACHE_E2E api-e2e/ccr-run1 …` | 4/4 | 4/4 incl. CCR-E2E-002 (T3 max input 38.2k; implementer's failing run 45.8k, its passing rerun 29.8k → output-size variance, not code) | Pass | `ccr-run1.log`, `ccr-run1/` | — |
| 7 | LIVE-APC | 2026-10-12 | Completed | `run-live.sh RUN_ANTHROPIC_CACHE_E2E api-e2e/apc-run1 …` | 7/7 | 7/7 (incl. interrupt note, Stop/reopen, Settings change, strict control) | Pass | `apc-run1.log`, `apc-run1/` | — |
| 8 | LIVE-OLR | 2026-10-12 | Completed | `run-live.sh RUN_NATIVE_OUTPUT_LIMIT_E2E api-e2e/olr-run1 …recovery…` | 15/15 | 15/15 | Pass | `olr-run1.log` | — |
| 9 | LIVE-OLM | 2026-10-12 | Completed | `run-live.sh RUN_NATIVE_OUTPUT_LIMIT_E2E api-e2e/olm-run1 …output-limit-live…` | 10 pass + Qwen | 10/11; OLM-E2E-008 Qwen 401 invalid key (out of scope per user 2026-10-10) | Pass (Qwen out of scope) | `olm-run1.log` | — |
| 10 | FID-001 | 2026-10-12 | Completed | move `notifyTokenUsage` after `commitRequest` in `settleCompleted`; golden `CI=1`; `git checkout` | golden fails | 7 failed (every normal-completion scenario) / 5 passed (exhaustion, interrupts, provider error, content filter — never reach `settleCompleted`); file restored, `git diff` clean | Pass (suite detects ordering change) | `golden-mutation.log` | — |
| 11 | REP-006 | 2026-10-12 | Completed | golden after revert; `env -i … test:unit` | pass | golden 12/12; server unit 5242 pass / 7 skip | Pass | `golden-after-revert.log`, `server-unit.log` | — |

---

# Round 2 — re-entry after IR-002 / CRR-003 (API-REV-002), head `b12e8c113`

Evidence: `evidence/api-e2e/round2/`.

| Seq | Case ID | Date | Event | Command / Configuration | Expected | Observed | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R2-1 | REP-001 golden | 2026-10-12 | Completed | `env -i … CI=1` | 12/12 | 12/12 (snapshot re-recorded on the merged base; delta = `context_compaction_threshold_tokens` only, reviewer-verified on unchanged `e305a20a5`) | Pass | `golden.log` |
| R2-2 | REP-002 core unit | 2026-10-12 | Completed | `env -i … tests/unit` | all pass | 299 files / 2027 (base removed the AutoByteus-provider tests) | Pass | `ts-unit.log` |
| R2-3 | REP-003 agent integration | 2026-10-12 | Completed | `env -i … CI=1 tests/integration/agent` | as round 1 | 56 pass / 15 skip / 1 baseline (`read-media-file`) | Pass (baseline) | `ts-integration-agent.log` |
| R2-4 | REP-004 build + typecheck | 2026-10-12 | Completed | core build; server typecheck; server build | clean | clean | Pass | `build.log`, `typecheck.log`, `server-build.log` |
| R2-5 | TU-001 threshold equivalence (source) | 2026-10-12 | Completed | base `e305a20a5:llm-phase.ts` vs refactor | same number/null cases | base: budget only when compaction enabled AND capacity; refactor: `LlmCallCompaction` only when enabled, budget only with capacity | Pass | report |
| R2-6 | ALSR-TU-001 live threshold probe | 2026-10-12 | Completed | temporary spec via `run-live.sh RUN_ALSR_PROBE` (Opus, real server); probe removed after (copy kept) | numeric in frame = stored summary; follows trigger ratio | default 0.8: 697,395 (frame) = 697,395 (summary); ratio 0.5: 435,872 = 435,872; input budget 1,000,000 − 128,000 − 256 = 871,744 → exact | Pass | `threshold-probe.log`, `threshold-probe/`, `tmp-alsr-threshold-probe.e2e.test.ts.copy` |
| R2-7 | REP-006 server unit + token-usage | 2026-10-12 | Completed | `test:unit`; `vitest run tests/unit/token-usage tests/e2e/token-usage` (after server build) | all pass | 5322 pass / 7 skip; token-usage 32 files / 167 tests | Pass | `server-unit.log`, `server-token-usage.log` |
| R2-8 | LIVE-OLR | 2026-10-12 | Completed | `run-live.sh RUN_NATIVE_OUTPUT_LIMIT_E2E round2/olr-run …recovery…` | 15/15 | 15/15 | Pass | `olr-run.log`, `olr-run/` |

- Not re-run in round 2 (unchanged boundaries; covered by the golden compaction scenarios and round-1 runs): LIVE-APC, LIVE-CCR, LIVE-OLM.
- Null-threshold path: core-only (the server's native backend always enables compaction); covered by the golden suite's 14 null payloads.
- Reconciled into the report: `Yes` (round 2).

---

# Round 3 — re-entry after IR-003 / CRR-006 (API-REV-003), head `002207b11`

Evidence: `evidence/api-e2e/round3/`.

| Seq | Case ID | Date | Event | Command / Configuration | Expected | Observed | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R3-1 | REP-001 golden | 2026-10-17 | Completed | `env -i … CI=1` | 12/12, snapshot unchanged | 12/12 | Pass | `golden.log` |
| R3-2 | REP-002 core unit | 2026-10-17 | Completed | `env -i … tests/unit` | all pass | 299 files / 2027 | Pass | `ts-unit.log` |
| R3-3 | REP-003 agent integration | 2026-10-17 | Completed | `env -i … CI=1 tests/integration/agent` | as before | 56 pass / 15 skip / 1 baseline (`read-media-file`) | Pass (baseline) | `ts-integration-agent.log` |
| R3-4 | REP-004 build + server typecheck | 2026-10-17 | Completed | core build; server typecheck | clean | clean | Pass | `build.log`, `server-typecheck.log` |
| R3-5 | GUARD-001 exhaustive-switch guard | 2026-10-17 | Completed | temporarily removed the `compaction_blocked` case; `tsc -p tsconfig.build.json --noEmit`; `git checkout`; `tsc` again | compile error at the `never` assignment; clean after revert | `agent-turn-runner.ts(84,19): error TS2322: Type '{ kind: "compaction_blocked"; }' is not assignable to type 'never'.` (exit 2); after revert `git diff` clean, tsc exit 0 | Pass | `guard-mutation-tsc.log`, `guard-after-revert-tsc.log` |

- Not re-run: live suites (no runtime path changed; API-REV-001/002 stand).

---

# Round 4 — re-entry after IR-004 / CRR-008 (API-REV-004), head `04b879d55`

Evidence: `evidence/api-e2e/round4/`.

| Seq | Case ID | Date | Event | Command / Configuration | Expected | Observed | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R4-1 | Golden | 2026-10-17 | Completed | `env -i … CI=1` | 12/12 | 12/12 | Pass | `golden.log` |
| R4-2 | Core unit | 2026-10-17 | Completed | `env -i … tests/unit` | all pass | 300 files / 2035 (incl. base `llm-call-throughput` tests) | Pass | `ts-unit.log` |
| R4-3 | Agent integration | 2026-10-17 | Completed | `env -i … CI=1 tests/integration/agent` | as before | 56 pass / 15 skip / 1 baseline (`read-media-file`) | Pass (baseline) | `ts-integration-agent.log` |
| R4-4 | Build + server typecheck | 2026-10-17 | Completed | core build; server typecheck | clean | clean | Pass | `build.log`, `server-typecheck.log` |
| R4-5 | TPS equivalence (source) | 2026-10-17 | Completed | base `c2e366806:llm-phase.ts` vs refactor | same hooks and order | identical `llm-call-throughput.ts`; start/observe/throughput at the same seams | Pass | report |
| R4-6 | TPS probe run 1 | 2026-10-17 | Completed | temporary spec, Opus + DeepSeek | — | Opus cases: provider `400 credit balance is too low` (account, not code); TPS-003 DeepSeek Pass | Environment-limited | `tps-probe-run1-anthropic-credit.log` |
| R4-7 | TPS probe run 2 (TPS-001..005) | 2026-10-17 | Completed | `run-live.sh RUN_ALSR_PROBE …` (DeepSeek, OpenAI, Gemini); spec removed after (copy kept) | method per DEC-002; numerator = reported output; 250 ms ≤ duration ≤ elapsed; null below 20 tokens | DeepSeek off: generation 193/1523 ms; DeepSeek reasoning: generation 172/1051; OpenAI (0 reasoning): generation 135/726; Gemini (972 hidden reasoning): end_to_end 143/9080 (elapsed 9314); pong: 2 tokens → null | Pass 5/5 | `tps-probe.log`, `tps-probe/`, `tmp-alsr-tps-probe.e2e.test.ts.copy` |
