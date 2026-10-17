# Implementation Handoff — agent-loop-structure-refactor

Current round: **IR-002, delivery Local Fix (DR-001)**. `origin/personal` @ `e305a20a5` is merged, the token-meter field is ported, and the golden suite is re-proven on the new base. IR-001 (the refactor itself) passed CRR-001 and API-REV-001 and is unchanged in substance.



**Latest round: IR-004 (2026-10-17), delivery Local Fix (DR-004).**
- Merged `origin/personal` @ `c2e366806` (`78bf3f910`) and ported output-tps-precision's per-call timing into the refactored owners, with the same semantics:
  - `LlmCall.timing`;
  - `timing.start()` in `startStream` right before `streamMessages`;
  - `timing.observeChunk` via a chunk observer in `LlmResponseStreamCollector.consume`, after the chunk fence and before accumulation;
  - `output_throughput` on the usage notification.
- Golden re-recorded on the unchanged merged base (`bc78c81f2`; only the base's `output_throughput` object differs); the head matches it 12/12.
- Doc bullet `04b879d55`.
- To review: `git diff 002207b11 04b879d55 -- autobyteus-ts/src/agent/loop autobyteus-ts/docs`. The full refactor against the new base is `git diff c2e366806 04b879d55 -- autobyteus-ts`.
- Checks:
  - core unit: 2035/2035;
  - loop + TPS units: 83/83;
  - agent integration: baseline-only failure;
  - server: typecheck clean, unit 5687;
  - token usage: unit 125/125, E2E 42/42;
  - gated TPS transport E2E: 1/1.
- Details: `implementation-revision-record.md` IR-004.

**Latest round: IR-003 (2026-10-17), CND-003 at the user's request.** Commit `002207b11` adds an exhaustive `never` default to `AgentTurnRunner.run`'s outcome `switch` (+5 lines in `autobyteus-ts/src/agent/loop/agent-turn-runner.ts`; review with `git diff 5f1b45f46 002207b11`). Checks:
- `tsc` build config: clean. The negative check (one case removed) fails with TS2322, then the file was restored.
- Golden + output-limit recovery + runtime integration (`CI=1`): 40/40, snapshot unchanged.
- Core unit: 2027/2027.

The sections below describe IR-001/IR-002 and remain accurate.

## Upstream Artifact Package

All paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-loop-structure-refactor/tickets/in-progress/agent-loop-structure-refactor/`.

- Upstream review applicability and handoff-rule result: independent architecture review was selected (Medium/High) and passed (ARCH-REV-001 on SR-003). `get_handoff_rules` → the "Large or High … ready for independent source review" rule → `/software_engineering_team/code_reviewer`.
- Requirements doc: `requirements-doc.md` (Approved 2026-10-11; SR-003; DEC-001 named outcome handlers, DEC-002 ToolPhase assess only)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec: `design-spec.md` (Ready, SR-003)
- Supplemental task artifacts: `task-brief.md`, `approval-request.md`, `handoff-architecture-design-complete.md`; `evidence/` (live-suite runner, logs and per-case results, this round)
- Design review report: `design-review-report.md` (Pass; notes R-1..R-7)
- Architecture review revision record: `architecture-review-revision-record.md` (ARCH-REV-001)
- Triggering rework report: `release-deployment-report.md` / `delivery-revision-record.md` (DR-001: integration refresh blocked by a merge conflict in `llm-phase.ts`)

## Current Implementation Summary

- Implementation cycle: `Rework` (delivery Local Fix)
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-002` (IR-001 = the refactor)
- Related solution revision IDs: `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: `CRR-001` (Pass, IR-001)
- Related API/E2E revision IDs: `API-REV-001` (Pass, IR-001)
- Related delivery revision IDs: `DR-001` (blocked; this round's trigger)
- Triggering finding IDs: DR-001 integration conflict (requested items 1–5)
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-loop-structure-refactor`, branch `codex/agent-loop-structure-refactor`, base `origin/personal` @ `beb6b3b49`. It includes compaction cache reuse `edd8f8469`, so REQ-007 holds.
- Review diff `beb6b3b49..261ab15dc`, one commit per design step. The golden suite was green after each step:
  1. `cd03cd74b` test: golden event-sequence characterization, recorded on the unchanged base (AC-003).
  2. `2b3ef12cb` D-01: `LlmResponseStreamCollector`.
  3. `61bcf28f8` D-02: `LlmCallCompaction`.
  4. `98130f5bf` D-03/D-04: `LlmPhase` named steps; the outcome carries the invocations.
  5. `7fddc2000` D-05: the runner owns the tool batch; dead state and fallback removed.
  6. `5ecd6f661` D-06: runner outcome handlers and `runToolStep`.
  7. `261ab15dc` D-08: docs.
- **IR-002 commits.** To review the delta: `git diff 261ab15dc b12e8c113 -- autobyteus-ts/src/agent` shows the base's two token-usage type additions (`events/notifiers.ts`, `streaming/events/stream-event-payload-token-usage.ts`) plus my ported field (`loop/llm-phase.ts`) and getter (`loop/llm-phase-compaction.ts`). The full refactor relative to the new base is `git diff e305a20a5 b12e8c113 -- autobyteus-ts`.
  - `6c88ddc71` Merge `origin/personal` (`e305a20a5`, 100 commits). The only conflict was `autobyteus-ts/src/agent/loop/llm-phase.ts`, resolved to the refactored file. Token-meter-accuracy (`9e8e5bf26`) added `context_compaction_threshold_tokens: compactionTokenBudget?.triggerThresholdTokens ?? null` to the token-usage notification inside the old `run()` body. It is ported to `LlmPhase.notifyTokenUsage` as `call.compaction?.triggerThresholdTokens ?? null`, via a read-only `LlmCallCompaction.triggerThresholdTokens` getter (`tokenBudget?.triggerThresholdTokens ?? null`) in `llm-phase-compaction.ts`. That is the same value: the budget exists exactly when compaction is enabled and a request capacity is resolved, as before.
  - `b12e8c113` Golden snapshot re-recorded on the merged base (see Local Implementation Checks).
- **AutoByteus remote-provider removal (`fdb7635f3`)** was checked for interaction. It deletes `autobyteus-llm.ts`, `autobyteus-provider.ts`, the client, the multimedia remote paths and `media-input-path-normalization-preprocessor.ts`. Nothing in the refactored loop, the collector, `LlmCallCompaction` or the new tests references any of them (grep), and the merged tree typechecks. `conversationRequestKwargs` (still sending `logicalConversationId`) is unchanged. The core unit count drops from 2081 to 2027 because the base deleted the removed provider's tests.
- Ticket artifacts are uncommitted in the ticket folder.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - 6 source files in `autobyteus-ts/src/agent`: 1 new, 5 modified.
  - 2 docs.
  - New golden and collector tests, plus 2 one-line structural test edits.
  - No provider, server or web change.
  - Risk stays High: it restructures the main agent-loop path (call owner, batch-lifecycle owner, outcome dispatch) for every AutoByteus-runtime turn.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (High risk)
- New design impact or escalation trigger: `None`. No golden sequence changed, every deterministic compaction suite passes, no public type changed outside `agent/loop` other than `AgentTurn`/`LLMResponsePipeline`, and `ToolPhase` and the compaction seams are untouched. The single live CCR-E2E-002 failure is analysed under Known Risks: output-size variance, passed on rerun, not a behavior change.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001; AC-001, AC-003) | Identical observable agent-loop behavior | All steps | The golden suite (12 scenarios, recorded on `beb6b3b49`, run with `CI=1` so snapshots are never rewritten) passes unchanged at every commit. Core unit, agent integration, server unit and integration results equal the base |
| REQ-003 / AC-004 (D-01) | One collaborator owns stream consumption, segments and response assembly | `agent/loop/llm-response-stream-collector.ts` | Fences `llm_stream`/`llm_stream_chunk`; accumulation; reasoning-segment lifecycle; owns `LlmStreamingResponseHandler`; four exactly-once finalization modes (abandon after a normal completion emits nothing, R-3). `LlmPhase` still creates the stream with `conversationRequestKwargs`/`conversationRequestOptions` (CON-001, CON-003) |
| REQ-003 (D-02) | Per-call compaction has one owner | `LlmCallCompaction` in `agent/loop/llm-phase-compaction.ts` | Reporter, budget with policy applied, executor with `LlmPhaseSummaryPort`, all built exactly as before from the call's single resolver and settings (R-6). `executeAfterFinalResponse` calls `bindRequestPrefix(request.tools)` immediately before `executeIfAuthorized('after_final_response')`, with the same failure reporting (CON-002, CON-004) |
| REQ-003 (D-03) | `LlmPhase` owns one LLM call as named steps | `agent/loop/llm-phase.ts` | `run()` = `beginCall` → `assembleRequest` → `startStream` + `collector.consume` → `settle` (stop error, `settleOutputLimited`, `settleCompleted`) → `settleInterrupted`/`settleFailed` → `finishCall`. Commit/rollback are private methods with the same `recoverySettled` guard. Each path keeps its own `CompleteResponse` shape: output-limited = content+usage+finish; interrupted partial and failed keep theirs; `buildResponse()` only on the normal path (R-1). `llm_stream_finalize` stays first in `settle`, after consumption and before stop classification (R-2) |
| REQ-004 / AC-005 (D-04, D-05) | Turn state owned by `AgentTurn`; one batch owner; dead state gone | `llm-phase.ts`, `agent-turn-runner.ts`, `agent-turn.ts`, `pipelines/llm-response-pipeline.ts` | The `tool_invocations` outcome carries the collector's invocations (no `activeToolInvocationBatch` re-derivation). `runToolStep` calls `startToolInvocationBatch` first, before the pending statuses (P-001 window unobservable; golden unchanged). `toolInvocationBatches` removed; `processFinalResponse` takes a required `turnId` (2 fallback sites removed) |
| REQ-005 / AC-006 (D-06, DEC-001) | Explicit outcome handling without a state machine | `agent-turn-runner.ts` | A plain `switch`: `handleOutputLimited` (moved verbatim; returns continue/completed), `waitForCompactionRetry`, `completeWithFinalResponse`, `runToolStep`. The counter resets for `compaction_blocked` and `tool_invocations` (R-7) |
| REQ-006 (D-07, DEC-002) | `ToolPhase` assessed, unchanged | — | `git diff beb6b3b49 -- autobyteus-ts/src/agent/loop/tool-phase.ts` is empty |
| REQ-008 / AC-008 (D-08) | Doc names the new owners | `autobyteus-ts/docs/agent_runtime_loop_and_interrupt.md`, `event_driven_core_design.md` | Turn Execution Ownership: runner handlers, batch ownership, `LlmPhase` steps, collector, `LlmCallCompaction`; the fence list names the collector |
| BEH-002 (CON-001..CON-006; AC-007) | Compaction invariants intact | Above; `conversation-request.ts`, `LlmPhaseSummaryPort`, `LLMRequestAssembler` unchanged | Core compaction unit suites, `agent-runtime-compaction` integration and the golden compaction scenarios pass. Gated CCR suite: 3 of 4 cases pass in one run; CCR-E2E-002 failed once with `target_unattainable` and passed on rerun (Known Risks) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. The stable seams (`conversation-request.ts`, `LlmPhaseSummaryPort`, `LLMRequestAssembler`, `ToolPhase`, the stream handler API) have zero diff. `LlmPhaseOutcome` and `LlmPhase.run`'s signature are unchanged.

## Key Files Or Areas

- `autobyteus-ts/src/agent/loop/llm-response-stream-collector.ts` (new, 126 effective lines)
- `autobyteus-ts/src/agent/loop/llm-phase.ts` (377; was 420)
- `autobyteus-ts/src/agent/loop/llm-phase-compaction.ts` (207; adds `LlmCallCompaction` next to the unchanged `evaluateLlmPhaseCompaction`)
- `autobyteus-ts/src/agent/loop/agent-turn-runner.ts` (315)
- `autobyteus-ts/src/agent/agent-turn.ts` (−2)
- `autobyteus-ts/src/agent/pipelines/llm-response-pipeline.ts` (−7 net)
- Tests:
  - `autobyteus-ts/tests/integration/agent/agent-loop-event-sequence.test.ts` and `__snapshots__/agent-loop-event-sequence.test.ts.snap` (golden)
  - `autobyteus-ts/tests/unit/agent/loop/llm-response-stream-collector.test.ts`
  - Structural edits only:
    - `tests/unit/agent/tool-invocation.test.ts`: drops the `toolInvocationBatches` assertion (dead array removed);
    - `tests/unit/agent/pipelines/llm-response-pipeline.test.ts`: the context no longer provides `activeTurn`; the test already passed `turnId`.

## Important Assumptions

- Golden scope. The suite records one ordered log per scenario:
  - every `AgentExternalEventNotifier` event (segments, statuses, token usage, errors, tool and turn lifecycle, assistant complete response, compaction status);
  - every call to 9 `MemoryManager` write methods (ingestion, recovery-snapshot commit/restore, recovery notes, raw traces, pending-call finalization);
  - each LLM request's messages;
  - at the end: event-store status events, the working context and the raw traces.
- Normalization (R-4) maps UUIDs, 32-hex ids, 13-digit epoch digits, `Date.now().toString(36)` ids and the agent id to first-seen tokens, and replaces clock fields. Ordering and identity relations are kept. The suite was deterministic over 4 consecutive runs before the refactor.
- Scenarios:
  - final answer with reasoning; one tool cycle;
  - output-limit recovery (tool cut; text cut); exhaustion (4 stops);
  - interrupt mid-stream; interrupt at `post_llm_stream` after reasoning (R-3);
  - provider error mid-stream; `content_filter` stop; malformed tool call;
  - after-final compaction; `compaction_blocked` then retry.
- Collector construction moved from before tool-schema/compaction setup to just after request assembly. Its constructor emits nothing and only draws random ids, so this is not observable (golden unchanged).
- `LlmCallCompaction.create` computes the budget and applies the policy after the tool schemas are built, where before it was just before. Both are pure computations on independent data; the request capacity, which reads the policy's safety margin, is still resolved first.

## Known Risks

- **CCR-E2E-002 live variance.** It failed once (`Memory compaction failed before dispatch [target_unattainable]`) and passed when rerun alone. Evidence (`evidence/ccr/calls-summary.json` vs `evidence/ccr-002-rerun/calls-summary.json`):
  - In the failed run Opus wrote 600–3,400 output tokens per call, against about 150 in the rerun. The T3 history grew to 45.8k input tokens (rerun 29.8k), so the case's fixed context-override/trigger budget could not reach its target.
  - The first request's input was identical in size (8,716 vs 8,720 tokens).
  - The planner (`working-context-message-window-planner.ts`) is unchanged, and the deterministic compaction suites plus the golden compaction scenarios are unchanged.
  - Classified as fixture sensitivity to live output size, not a behavior change. Suggested for the CCR suite owner: bound tool/output sizes, or derive the budget from the observed history. Not changed here.
- RSK-002 (subtle ordering drift) is mitigated by the golden suite written first. Any reviewer doubt can be checked by running it on any commit with `CI=1`.
- The D-05 registration window moved: tool-input-port registration now happens after the response ingestion, the `llm_compaction` fence and `post_llm_phase`. The review judged it unobservable (P-001), and the golden tool-cycle, malformed-call and recovery sequences confirm no visible change.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Refactor
- Reviewed root-cause classification: File Placement Or Responsibility Drift + Boundary Or Ownership Issue
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes:
  - Ownership is as mapped: the collector never touches memory or the turn; `LlmPhase` never iterates the stream; only the runner starts and clears batches; `LlmCallCompaction` is the only after-response compaction site.
  - Dependency rules hold: the runner imports neither the collector nor `LlmCallCompaction`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (no re-exports, no aliases)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. Removed: `toolInvocationBatches`, the `activeTurn` fallback (2 sites), the inline closures and stream loop, the batch re-derivation, and the now-unused imports in `llm-phase.ts` (`randomUUID`, handler, segment events, reporter/executor/summary port, budget helpers).
- Dead code found elsewhere, listed as follow-up: None new (earlier tickets' follow-ups are unchanged)
- Shared structures remain tight: `Yes`. `LlmCall` is a private per-call record inside `llm-phase.ts`; `LlmCallSettlement` is a two-variant private union.
- Canonical shared design guidance was reapplied: `Yes`
- Changed source files within size guardrails: `Yes`. All are under 500 effective lines. `llm-phase.ts` has a +274/−319 delta: that is this ticket's planned split of the file, which ends smaller (420 → 377). `agent-turn-runner.ts` +108/−75.
- Notes: —

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Implementation follows the approved decision: `Yes`. The golden suite asserts identical memory writes, working context and raw traces.
- Deviation: `None`

## Environment Or Dependency Notes

- Setup: `pnpm install --frozen-lockfile`; `prisma generate`; `pnpm -C autobyteus-ts build` before server suites.
- Clean environment: core integration and live suites ran under `env -i PATH HOME=<temp> TMPDIR` (TESTING.md).
- Live credentials: `evidence/run-live.sh <GATE> <dir> <spec> [filter]` reads keys by name from the importer source `/Users/normy/.autobyteus/server-data/.env`. It passes them only as the suites' credential aliases into `env -i`; each suite saves them into its own per-run test-owned vault. This is the pattern the previous tickets' API/E2E used. No `.env` was edited, the user's app database was not touched, and a scan of `evidence/` finds none of the key values.
- Known baseline failures, all identical on the base:
  - `tests/integration/agent/read-media-file-continuation-flow.test.ts`: stale `gemini-3.5-flash` catalog model, reported earlier.
  - Server `agent-status-websocket.integration.test.ts`, 2 content-cadence cases: the TESTING.md known baseline exception.

## Local Implementation Checks Run

### IR-002 (merged head `b12e8c113`)

- Golden (AC-003):
  - The previous snapshot (recorded on `beb6b3b49`) cannot match the merged base, because the base itself adds a token-usage key.
  - **Re-recorded on the merged base's unchanged loop.** Setup: a temporary worktree at `e305a20a5` plus only the golden test file, recorded, then 2× `CI=1`, deterministic.
  - **Diff from the old snapshot:** only `context_compaction_threshold_tokens` added in 24 token-usage payloads. It is numeric (e.g. 5895) in the 10 payloads of compaction-enabled scenarios and `null` in the other 14.
  - **The refactored merged head matches the merged-base snapshot exactly:** 12/12, twice with `CI=1`.
- `pnpm -C autobyteus-ts exec vitest run tests/unit`: 2027/2027.
  - Explicitly, token usage plus `tests/unit/agent/loop`: 16 files / 94 tests. This includes the base's `llm-phase-memory-compaction-configuration.test.ts`, which asserts `context_compaction_threshold_tokens` (numeric when enabled, `null` when disabled).
- `env -i … CI=1 vitest run tests/integration/agent`: 56 passed, 15 skipped, 1 failed (baseline `read-media-file-continuation-flow`, same stale `gemini-3.5-flash` cause).
- `pnpm -C autobyteus-ts build` OK. Test-tree tsc: 273 errors, none in changed or new files.
- `pnpm -C autobyteus-server-ts typecheck`: clean. `test:unit`: 5322 passed, 7 skipped.
- `tests/unit/token-usage`: 19 files / 125 tests pass.
- `env -i … vitest run tests/e2e/token-usage`: 42/42 pass. The first run's 1 failure, `token-usage-record-restart-graphql` with `TEST_SERVER_START_FAILED`, needed a current server build (TESTING.md); after `pnpm -C autobyteus-server-ts build` it passes.
- Not rerun this round:
  - Server `test:integration`.
  - The gated live suites (IR-001 results below; API-REV-001 re-ran them).
  - The merge changes only the token-usage payload field in the agent loop.

### IR-001 (refactor, base `beb6b3b49`)

- `pnpm -C autobyteus-ts exec vitest run tests/unit`: 2081/2081 (base 2072 plus 9 new collector tests).
- `env -i … CI=1 pnpm -C autobyteus-ts exec vitest run tests/integration/agent`: 56 passed, 15 skipped, 1 failed (the baseline `read-media-file` case). Includes the 12 golden scenarios, `agent-runtime-compaction`, output-limit recovery, tool approval and continuation flows.
- Golden suite run after each of the 6 refactor commits: 12/12 unchanged.
- `pnpm -C autobyteus-ts build` OK; `tsc -p autobyteus-ts/tsconfig.json --noEmit` (test tree): 277 errors, an identical set to the base worktree (sorted diff empty).
- `pnpm -C autobyteus-server-ts typecheck`: clean. `pnpm -C autobyteus-server-ts test:unit`: 5242 passed, 7 skipped. `test:integration`: 356 passed, 68 skipped, 2 failed (the known baseline exception).
- Gated live suites (AC-002, real providers, clean env, per-run vaults); logs and case results in `evidence/`:
  - `autobyteus-native-output-limit-recovery-live`: **15/15 pass** (Opus, DeepSeek, OpenAI, Gemini).
  - `autobyteus-anthropic-prompt-caching-live`: **7/7 pass**.
  - `autobyteus-compaction-cache-reuse-live`: 3/4 in the full run. CCR-E2E-002 failed with `target_unattainable` (Known Risks) and **passed** on the isolated rerun (`evidence/ccr-002-rerun.log`).
  - Prior-ticket records for these suites (base comparison): OLR all pass (anthropic-incomplete-content-block API/E2E); CCR all pass (compaction-prompt-cache-reuse API/E2E); APC all pass.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable: backend agent-loop refactor with no UI change.

## Downstream Coverage Hints / Suggested Scenarios

- Re-run the golden suite on any commit with `CI=1` (snapshots must not be rewritten).
- Optional: an isolated desktop instance, one tool-using turn plus an interrupt, compared before and after (should be identical).
- CCR-E2E-002 sensitivity: a deterministic budget would make it robust to verbose model output.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Independent code review (next).
- API/E2E validation per TESTING.md. AC-002 live suites ran here as implementation-scoped evidence; API/E2E decides on any further runs.
