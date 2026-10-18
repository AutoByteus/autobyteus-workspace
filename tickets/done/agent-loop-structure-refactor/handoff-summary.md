# Handoff Summary — agent-loop-structure-refactor

Current delivery revision: `DR-005`. The state for verification is branch head `04b879d55`; earlier held heads (`4612c8066`, `5f1b45f46`) are superseded.

## User Verification

- Status: **Verified by the user on 2026-10-17**: "finalize, no release".
- Decisions: finalize `04b879d55` into `personal`; **no release** (the change ships with the next release).

## DR-005 State (current)

- Branch `codex/agent-loop-structure-refactor` @ `04b879d55`, local only. It contains `origin/personal` @ `c2e366806`, which was still the latest on 2026-10-17 (0 commits behind).
- Since DR-003:
  - `002207b11`: exhaustive outcome `switch` (CND-003, at the user's request; CRR-006, API-REV-003).
  - `78bf3f910`: merge of `c2e366806`, porting per-call TPS (`LlmCallTiming`) into the collector and the usage notification.
  - `bc78c81f2`: golden snapshot re-recorded on the unchanged base, independently confirmed.
  - `04b879d55`: doc bullet naming where the call's output-speed timing lives.
- Review: CRR-008 Pass (9.5); API-REV-004 Pass (95.7%), with the live TPS probe 5/5 and the port byte-equivalent to the base; CRR-009 Not Applicable.
- Delivery check (`delivery-evidence/dr-005/`): golden 12/12 (`CI=1`, clean env); `autobyteus-ts` unit 300 files, 2035 passed.
- New follow-up: CND-004. The golden suite keeps the timing-dependent `output_throughput.method`; inject a deterministic clock or normalize it.
- Environment note: the Anthropic test account reported "credit balance is too low" on 2026-10-17. Anthropic live suites need credit before their next run.

The sections below are the DR-003 handoff, kept for history. Their branch head and counts are superseded by the DR-005 state above.

## State For User Verification

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-loop-structure-refactor`
- Branch: `codex/agent-loop-structure-refactor` @ `5f1b45f46`, local only, not pushed.
  - Refactor, one commit per design step:
    - `cd03cd74b`: golden suite, recorded on the base.
    - `2b3ef12cb`: `LlmResponseStreamCollector`.
    - `61bcf28f8`: `LlmCallCompaction`.
    - `98130f5bf`: `LlmPhase` steps.
    - `7fddc2000`: batch ownership and dead-state removal.
    - `5ecd6f661`: runner handlers.
    - `261ab15dc`: docs.
  - IR-002 (DR-001 Local Fix):
    - `6c88ddc71`: merges `origin/personal` @ `e305a20a5` and ports token-meter-accuracy's `context_compaction_threshold_tokens`.
    - `b12e8c113`: re-records the golden snapshot on the merged base. CRR-003 confirmed it independently on the unchanged base.
  - Delivery:
    - `4612c8066` merges `origin/personal` @ `2e9bd209c`.
    - `5f1b45f46` merges `origin/personal` @ `1ea74caa2` (257 more commits; 289 files, none under `autobyteus-ts`, none overlapping this ticket). Both merges were clean.
- Not committed yet: the ticket folder (committed at finalization). Not to be committed: untracked `*/dist/` build outputs.
- Classification: `task_size=Medium`, `architectural_risk=High`. Route: reviewed.

## What Changed

- **No behavior change.** The AutoByteus agent loop is restructured so each step has one owner:
  - `LlmPhase.run` is split into named steps (`beginCall`, `assembleRequest`, `startStream`, `settle`, `settleInterrupted`/`settleFailed`, `finishCall`).
  - Stream consumption and segments move to `LlmResponseStreamCollector`.
  - A call's compaction moves to `LlmCallCompaction`.
  - The turn runner dispatches each LLM outcome to a named handler and solely owns the tool-batch lifecycle.
  - Dead turn state is removed (`toolInvocationBatches`, the `activeTurn` fallback).
- **Proof of identical behavior:** a golden event-sequence suite (12 scenarios) was recorded on the base before the refactor and passes unchanged at every step. A mutation check showed it catches ordering drift.
- **Docs:** `agent_runtime_loop_and_interrupt.md` and `event_driven_core_design.md` (see `docs-sync-report.md`).
- **Data:** no persisted-data change.

## Validation

- Review:
  - Round 1: CRR-001 Pass (9.4/10), API-REV-001 Pass (95.8%).
  - Round 2: CRR-003 Pass, API-REV-002 Pass (96%).
  - Test-code review: Not Applicable (CRR-002, CRR-004); API/E2E changed no durable tests.
- Live (API-REV-001/002):
  - compaction cache reuse 4/4;
  - Anthropic prompt caching 7/7;
  - output-limit recovery 15/15;
  - output limits 10/11 (Qwen out of scope by user decision);
  - the ported threshold field matches the base (697,395 at ratio 0.8; 435,872 at 0.5).
- Delivery rerun on `5f1b45f46` (2026-10-14; `delivery-evidence/dr-003/`): same results as on `4612c8066`, except server unit is now 687 files, 5455 passed, 7 skipped. Golden 12/12; core unit 2027; agent integration 56/15 skipped plus the same baseline failure; build and typecheck clean.
- Delivery rerun on `4612c8066` (2026-10-12; `delivery-evidence/dr-002/`):
  - `autobyteus-ts` unit: 299 files, 2027 tests passed.
  - `env -i … CI=1 vitest run tests/integration/agent`: 56 passed, 15 skipped, 1 failed. The golden suite passes 12/12. The failure is the known baseline `read-media-file-continuation-flow` (stale `gemini-3.5-flash` id), identical on the base.
  - `autobyteus-ts` build: OK.
  - `autobyteus-server-ts` typecheck: clean.
  - `autobyteus-server-ts` `test:unit`: 679 files, 5357 passed, 7 skipped.

## Residual Risks

- The live CCR-E2E-002 fixture is sensitive to model output size (T3 history 29.8K–45.8K tokens across runs). It failed once with `target_unattainable` and passed on rerun.
- The D-05 registration window moved: tool-input-port registration now happens after response ingestion. Review judged this unobservable (P-001), and the golden suite confirms it.

## Follow-ups (non-blocking)

- CND-003: an exhaustive `never` default in the runner's outcome `switch`.
- CND-002: make the CCR-E2E-002 fixture robust to model output size (CCR suite owner).
- Baseline failures needing an owner (TESTING.md rule 9):
  - `read-media-file-continuation-flow` (stale `gemini-3.5-flash`; same cause as the earlier `llm-factory-metadata-resolution` item);
  - the server status-websocket content-cadence cases (TESTING.md exception).
- Done by delivery: removed the three leftover `compaction-cache-e2e-*` temp dirs from 2026-10-11 in `$TMPDIR` (about 380 KB; no test was running).
