# Code Review Report — agent-loop-structure-refactor

Latest authoritative result: **CRR-008, Implementation Review round 5, Targeted Delta Review of IR-004 (the delivery Local Fix for DR-004, a merge with `origin/personal` @ `c2e366806`): Pass, 9.5/10, no findings.** Earlier rounds follow below: round 4 (CRR-006), round 3 (CRR-005), round 2 (CRR-003) and round 1 (CRR-001, the full line-by-line review).

## Round 5 (CRR-008) — Merge with output-tps-precision (IR-004)

- Head: `04b879d55` (from `002207b11`).
  - `78bf3f910`: merge.
  - `bc78c81f2`: golden snapshot re-record.
  - `04b879d55`: one doc bullet.
- Review Scope: `Targeted Delta Review`. Scope evidence:
  - Across the merge, the base changed only four files in `autobyteus-ts/src/agent`:
    - `llm-phase.ts`: three timing hooks;
    - the new `llm-call-throughput.ts`;
    - `events/notifiers.ts` and `stream-event-payload-token-usage.ts`: type additions.
  - IR-004 adds `llm-phase.ts` +10/−1, `llm-response-stream-collector.ts` +8/−1 and the doc bullet.
  - The full refactor against the new base is still the same 13 files.
- **Conflict resolution verified.** Every base hook from `5fe746ab5` is ported with the same semantics:

  | Base (`c2e366806` `llm-phase.ts`) | Refactor | Equivalent? |
  | --- | --- | --- |
  | `const callTiming = new LlmCallTiming()`, one per `run()` | `LlmCall.timing = new LlmCallTiming()` in `beginCall`, one per call | Yes |
  | `callTiming.start()` after the `llm_request_assembly` and `llm_stream_start` fences, immediately before `streamMessages` | `call.timing.start()` at the same point in `startStream` | Yes |
  | `callTiming.observeChunk(chunk)` after the `llm_stream_chunk` fence, before accumulation | `consume(..., observeChunk)` calls the observer at the same point | Yes |
  | `output_throughput: callTiming.throughput(tokenUsage)` in the token-usage payload | the same field in `notifyTokenUsage` | Yes. `throughput()` depends only on the recorded chunk timestamps, not on when usage is notified |

  - Ownership is kept: the timing belongs to `LlmPhase`'s per-call record, and the collector only offers an optional per-chunk observer, so it stays free of timing knowledge.
  - Nothing from the base was dropped: `git diff 1ea74caa2 c2e366806 -- autobyteus-ts/src/agent/loop/llm-phase.ts` contains only these hooks and the import.
- **Golden re-record verified independently:**
  - The snapshot delta is only `output_throughput { method: 'end_to_end', output_tokens, duration_ms: '<clock>' }` in 24 token-usage payloads. The test file is unchanged.
  - Reviewer check: a temporary worktree at the base `c2e366806` (lockfile identical, zero `src` diff), carrying only the golden test and the new snapshot, passes **12/12 twice with `CI=1`**. The temporary worktree was removed.
  - At `04b879d55`: golden + output-limit recovery + runtime integration with `CI=1`, 40/40.
- Reviewer re-runs at the head: core unit 2035/2035 (including the base's `llm-call-throughput` tests); `tsc -p tsconfig.build.json --noEmit` clean.
- Implementation-reported checks: server typecheck, build and unit tests; token-usage unit and e2e; the gated TPS transport e2e 1/1.
- **New non-blocking recommendation (CND-004):**
  - The golden normalizer replaces `duration_ms` with `<clock>` but keeps `output_throughput.method`. That value is timing-dependent: `generation` requires at least 250 ms between the first response chunk and the final chunk.
  - Scripted calls yield synchronously, so `end_to_end` is effectively certain. A rare event-loop stall of 250 ms or more inside one scripted call on a heavily loaded runner could still flip it and fail the golden suite spuriously. That would be a test-only false alarm, not a product issue.
  - Proportionate fix, owned by the golden-suite author: inject a deterministic clock into the scripted run, or normalize `method` alongside `duration_ms`. Not blocking.
- Prior findings: none open. CND-002 (CCR fixture robustness) remains non-blocking.
- Scorecard: unchanged at 9.5/10.
- Result: `Pass`. Recommended recipient: `/software_engineering_team/api_e2e_engineer`, proportionate: repository suites plus golden and token-usage/TPS checks; live suites at API/E2E's discretion.

---


Latest authoritative result: **CRR-006 (2026-10-17), Implementation Review round 4, Targeted Delta Review of IR-003 (CND-003): Pass, 9.5/10, no findings.** Round 3 (CRR-005), round 2 (CRR-003) and round 1 (CRR-001, the full line-by-line review) follow below.

## Round 4 (CRR-006) — Exhaustive outcome `switch` (IR-003)

- Trigger: the user asked (2026-10-17) for recommendation CND-003 to be applied. It was relayed as a Local Fix and implemented as IR-003, commit `002207b11`.
- Review Scope: `Targeted Delta Review`. `git diff 5f1b45f46 002207b11` is exactly +5 lines in `autobyteus-ts/src/agent/loop/agent-turn-runner.ts`. No tests, snapshot or other files changed.
- The change: the runner's `switch (llmOutcome.kind)` gains
  `default: { const unhandled: never = llmOutcome; throw new Error(\`Unhandled LLM outcome: ...\`); }`.
  - The four existing cases are untouched.
  - A future `LlmPhaseOutcome` variant without a handler is now a compile error, instead of a silent fall-through to `while (true)` that re-runs `LlmPhase` with the same input.
  - If the throw were ever reached at runtime (only possible with an unchecked cast), it is a non-interrupt error and takes the runner's existing recovery path. It does not loop.
- Reviewer verification:
  - **Negative check, independent:** in a temporary worktree at `002207b11`, removing the `compaction_blocked` case makes `tsc` fail with `TS2322: Type '{ kind: "compaction_blocked"; }' is not assignable to type 'never'`. The temporary worktree was removed; the branch is untouched.
  - `tsc -p tsconfig.build.json --noEmit`: clean.
  - With `CI=1`: golden + output-limit recovery + runtime integration + `tests/unit/agent/loop`, 116/116. Golden is 12/12 with the snapshot unchanged.
- Prior findings: none. CND-003 is resolved by this change. CND-002 (CCR fixture robustness) remains non-blocking and is owned by the CCR suite.
- Scorecard: Cleanup Completeness 9.3 → 9.5; overall 9.4 → 9.5. All other categories are unchanged.
- Result: `Pass`. Recommended recipient: `/software_engineering_team/api_e2e_engineer`, proportionate: repository suites plus golden; a 5-line compile-time guard needs no live suites.

---


Latest authoritative result: **CRR-005 (2026-10-14, user-requested review of the change on the latest base): Pass, 9.4/10, no findings.** Rounds 2 (CRR-003) and 1 (CRR-001, the full line-by-line review) follow below.

## Round 3 (CRR-005) — User-requested review on the latest base

### What this review covers

- **Head reviewed:** `5f1b45f46` on `codex/agent-loop-structure-refactor`. Merge base with `origin/personal` is `1ea74caa2`.
- **Scope type: `Targeted Delta Review`**, with the full-review conclusions of CRR-001 carried forward. This is a deliberate choice, and here is why:
  - The complete refactor relative to the current base (`git diff 1ea74caa2 HEAD`) is the same 13 files, +9749/−439, as in CRR-001/CRR-003.
  - **`autobyteus-ts` is byte-identical** between the last reviewed head `b12e8c113` and the current head: `git diff b12e8c113 HEAD -- autobyteus-ts` is empty. The two later delivery merges (DR-002 `4612c8066`, DR-003 `5f1b45f46`) did not change the refactor or anything around it in the core library. `git diff e305a20a5 1ea74caa2 -- autobyteus-ts/src` is also empty.
  - The merges changed 84 server files, all in team/agent execution handles (`configured-agent-execution-*`, `flat-team-agent-execution-handle`, the execution registries). None of them is a caller of the native loop.
  - The only server code reading loop turn state, `media-url-transformer-processor.ts` (it reads `context.state.activeTurn?.turnId`), was already reviewed in CRR-001. The refactor removed only the response pipeline's fallback, not `state.activeTurn`, so it is unaffected.
  - A fresh line-by-line pass would re-read identical code. CRR-001 compared every path of the new `LlmPhase` with the original method line by line, and that comparison still applies unchanged. The executable checks were re-run on the current head (below).

### Verdict

**Pass. The refactor does what was approved, behavior is unchanged, and the code is cleaner.** No findings.

### What the change does (for the reader)

The agent loop's main step was one ~380-line method doing seven things at once. It is now split so each concern has one owner:

| Owner | What it owns |
| --- | --- |
| `LlmPhase.run` | A short sequence of named steps for one LLM call: `beginCall` → `assembleRequest` → `startStream` + collector → `settle` (output-limited / completed) or `settleInterrupted` / `settleFailed` → `finishCall`. It still owns commit/rollback, memory ingestion, token usage and the outcome |
| `LlmResponseStreamCollector` (new) | Reading the provider stream under the interrupt checkpoints; accumulating text, reasoning, usage and finish; reasoning segments; the stream handler. It closes them in exactly one mode, and a second close is a no-op |
| `LlmCallCompaction` | The call's compaction wiring and after-response compaction. It binds the request prefix immediately before running (cache-reuse invariant CON-002), and runs only after the stream is fully consumed and only for a final answer without tools (CON-004) |
| `AgentTurnRunner` | A plain `switch` with one handler per outcome (`handleOutputLimited`, `waitForCompactionRetry`, `completeWithFinalResponse`, `runToolStep`). It is the single owner of the tool-batch lifecycle |
| Removed (dead code) | `AgentTurn.toolInvocationBatches` (written, never read); the response pipeline's `activeTurn` turn-id fallback (`turnId` is now required) |

Untouched, with zero diff: `ToolPhase`, `conversation-request.ts`, `LlmPhaseSummaryPort`, `LLMRequestAssembler`, the stream handler, `memory/`, and all server and web code. The public `LlmPhase.run` signature and outcome type are unchanged.

### Why I'm confident behavior did not change

- **Line-by-line ordering comparison (CRR-001):** on every path (normal, output-limited, interrupted, failed, after-response compaction, runner dispatch), the new code has the same order of:
  - interrupt checkpoints;
  - stream finalization;
  - memory writes;
  - commit or rollback;
  - token-usage and error notifications.
- **The one intentional move:** the tool batch now starts in the runner's tool step instead of inside `LlmPhase`. Nothing can observe it. An external tool result needs both an active batch and a waiting `ToolPhase`, so an early result was rejected before and is still rejected.
- **Golden event-sequence suite:** 12 scenarios, recording every notifier event, memory write, LLM request, status, the working context and the raw traces.
  - It was recorded on the unchanged code.
  - After the token-meter merge, the reviewer re-checked it independently on the unchanged merged base (CRR-003).
  - API/E2E showed it has teeth: moving one call out of order failed 7 of 12 scenarios.
- **Re-run on the current head (`5f1b45f46`, this round):**
  - golden + output-limit recovery + runtime integration with `CI=1` (snapshots locked): **40/40**;
  - core unit: **2027/2027**;
  - core build typecheck and server typecheck: **clean**.
- **Earlier live validation, on the same `autobyteus-ts` code (API-REV-001/002):**
  - compaction cache reuse 4/4;
  - Anthropic prompt caching 7/7;
  - output-limit recovery 15/15;
  - the token-meter threshold field matches live and in stored summaries.

### Recommendations (non-blocking)

1. **CND-003:** add an exhaustive `default` (`const unhandled: never = outcome`) to the runner's `switch`. Today every outcome is handled. A future outcome type added without a case would loop instead of failing loudly.
2. **CND-002:** make the compaction cache-reuse live test robust to how much text the model writes. It failed once on model verbosity, not on code. This is for that suite's owner.

### Scorecard (unchanged from CRR-001)

9.4/10 overall; every category ≥ 9.2. Spine clarity 9.6, ownership 9.6, interfaces 9.4, separation 9.4, data-model tightness 9.4, naming 9.5, API/E2E readiness 9.2, runtime fidelity 9.5, no legacy 9.6, cleanup 9.3. The full table is in round 1 below.

### Routing

- No new code since the last validated state, so no re-validation is needed.
- The result goes back to the requester (`/software_engineering_team/implementation_engineer`) for the user.
- Delivery continues to hold the branch for the user's verification (DR-003).

---


Latest authoritative result: **CRR-003, Implementation Review round 2 (Targeted Delta Review of IR-002, the delivery Local Fix for DR-001): Pass.** The CRR-001 full review below remains the basis for the refactor itself.

## Round 2 (CRR-003) — Merge with `origin/personal` @ `e305a20a5` (IR-002)

- Trigger: DR-001 integration conflict, then IR-002. Workspace head `b12e8c113`.
  - `6c88ddc71`: merge.
  - `b12e8c113`: golden re-record.
- Review Scope: `Targeted Delta Review`. Scope evidence:
  - Across the merge, the base changed only three files in `autobyteus-ts/src/agent`:
    - `llm-phase.ts`: one token-usage field;
    - `events/notifiers.ts` and `streaming/events/stream-event-payload-token-usage.ts`: type additions.
  - The refactor's other files (runner, collector, `agent-turn.ts`, the pipeline) are unchanged since round 1.
  - The `fdb7635f3` remote-provider removal touches no loop file.
- Conflict resolution verified:
  - The base's only `llm-phase.ts` change (`9e8e5bf26`) adds `context_compaction_threshold_tokens: compactionTokenBudget?.triggerThresholdTokens ?? null` to the token-usage notification.
  - It is ported to `LlmPhase.notifyTokenUsage` as `call.compaction?.triggerThresholdTokens ?? null`, through a read-only getter `LlmCallCompaction.triggerThresholdTokens` (`tokenBudget?.triggerThresholdTokens ?? null`).
  - Equivalence: the base budget existed only when compaction was enabled and a request capacity was resolved. `LlmCallCompaction` exists only when compaction is enabled, and its `tokenBudget` is non-null only with a capacity. So the value is identical in every case, on every path that notifies usage (normal and output-limited, as before).
  - The getter is owned by the per-call compaction owner, which keeps the budget encapsulated. There is no bypass.
  - Nothing from the base was dropped: `git diff beb6b3b49 e305a20a5 -- autobyteus-ts/src/agent/loop/llm-phase.ts` shows that single hunk only.
- Golden snapshot re-record verified independently:
  - The snapshot delta (`261ab15dc..b12e8c113`) is only `+ "context_compaction_threshold_tokens"` in 24 token-usage payloads: 10 × `5895`, 14 × `null`. The test file is unchanged.
  - **Reviewer check:** a temporary worktree at the base `e305a20a5`, carrying only the golden test and the new snapshot from `b12e8c113` (no `src` changes, identical lockfile), passes **12/12 with `CI=1`**. The snapshot therefore records the merged base's unchanged behavior. The temporary worktree was removed and pruned.
  - At `b12e8c113`, the same snapshot passes 12/12 with `CI=1`. Refactored and unrefactored behavior are identical on the merged base (AC-003).
- Reviewer re-runs at `b12e8c113`:
  - core unit: 2027/2027 (down from 2081 because the base removed the AutoByteus provider tests);
  - `tsc -p tsconfig.build.json --noEmit`: clean.
- Implementation-reported checks: token-usage and `tests/unit/agent/loop` 94/94; server typecheck; server unit 5322; server token-usage unit 125/125 and e2e 42/42; agent integration as baseline.
- The live suites were not re-run by implementation. The loop change is one payload field, now asserted by the golden suite (numeric and null cases). API/E2E decides how much proportional validation to repeat.
- Prior findings: none open. CND-003 (exhaustive `default`) stays non-blocking.
- Scorecard: unchanged from round 1 (9.4/10). The delta adds no structural drag; the getter keeps ownership with `LlmCallCompaction`.
- Result: `Pass`. Recommended recipient: `/software_engineering_team/api_e2e_engineer`.

---

# Round 1 (CRR-001) — Full Review


## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved 2026-10-11; SR-001 text; DEC-001 named outcome handlers, DEC-002 ToolPhase assess only)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001..SR-003)
- Design Spec Reviewed As Context: `design-spec.md` (Ready, SR-003): D-01..D-08, DS-001..DS-004, Concrete Examples (settlement order)
- Supplemental Task Artifacts Reviewed As Context: `task-brief.md`; `evidence/` (`ccr-run.log`, `ccr-002-rerun.log`, `ccr/` and `ccr-002-rerun/` `calls-summary.json`, olr/apc logs)
- Relevant Solution Revision IDs: SR-003
- Design Review Report Reviewed As Context: `design-review-report.md` (Pass; notes R-1..R-7)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Trigger: Implementation Engineer handoff, IR-001 (Medium/High → code review)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: `1`
- Workspace / diff:
  - Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-loop-structure-refactor`
  - Branch: `codex/agent-loop-structure-refactor`
  - Diff: `beb6b3b49..261ab15dc`, seven commits, one per design step
- Coverage / Execution / API-E2E / Delivery inputs: N/A (implementation review)

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. The change is confined to 6 source files under `autobyteus-ts/src/agent`. Risk stays High because it restructures the call owner, the batch owner and the outcome dispatch on every AutoByteus-runtime turn.

## Review Scope

- Changed implementation reviewed:
  - `agent/loop/llm-response-stream-collector.ts` (new)
  - `agent/loop/llm-phase.ts`
  - `agent/loop/llm-phase-compaction.ts`
  - `agent/loop/agent-turn-runner.ts`
  - `agent/agent-turn.ts`
  - `agent/pipelines/llm-response-pipeline.ts`
  - docs: `agent_runtime_loop_and_interrupt.md`, `event_driven_core_design.md`
- Base comparison: `git show beb6b3b49:autobyteus-ts/src/agent/loop/llm-phase.ts`, read line by line against the new settle and finish methods.
- Context read:
  - `streaming/handlers/llm-streaming-response-handler.ts` (`getAllInvocations` is a pure copy; it produces no invocations when tools are disabled)
  - `agent-turn.ts` `postToolResult` (batch plus waiter gating)
  - `tool-phase.ts` (unchanged)
- Tests reviewed:
  - golden `tests/integration/agent/agent-loop-event-sequence.test.ts` and its snapshot
  - `tests/unit/agent/loop/llm-response-stream-collector.test.ts`
  - the 2 structural edits
- Explicit exclusions:
  - `ToolPhase`, `conversation-request.ts`, `LlmPhaseSummaryPort`, `LLMRequestAssembler`, the stream handler and `memory/`: each has a zero diff (verified)
  - compaction policy

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood:
  - REQ-001: no observable change.
  - REQ-002: same layering, no `AgentLoop`.
  - REQ-003/004/005: owners as designed.
  - REQ-006: `ToolPhase` unchanged.
  - REQ-007: the base includes compaction cache reuse `edd8f8469`.
  - REQ-008: docs.
  - CON-001..CON-006 are preserved.
- Design-spec behavior map verified against the implementation: Yes.
- Design review report and round confirmed: Pass, round 1. R-1..R-7 are verified as applied (see the table below).
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | See the ordering trace below. The golden snapshot was recorded at `cd03cd74b` on unchanged source and is untouched since (`git diff --stat cd03cd74b..261ab15dc -- autobyteus-ts/tests` lists only the collector test and the 2 structural edits). The reviewer re-ran it with `CI=1`: 12/12, alongside output-limit recovery and runtime integration (40/40 total) | — |
| BEH-002 | Confirmed | `LlmCallCompaction.create` builds the reporter, budget (+policy), executor and `LlmPhaseSummaryPort({agentId, llm, tools: toolSchemas, requestCapacity, notifier})` exactly as the base did, using the single resolver and settings (R-6). `executeAfterFinalResponse` calls `bindRequestPrefix(request.tools)` immediately before `executeIfAuthorized('after_final_response')`, with the same failure handling (CON-002). It runs only after the collector has completed and only for a final outcome without tools (CON-004). The stream is still started in `LlmPhase` with `conversationRequestKwargs`/`conversationRequestOptions` (CON-001/003) | — |

### Ordering trace (base l.220-443 vs new)

| Path | Base order | New order | Result |
| --- | --- | --- | --- |
| Stream start | inside `try`: `llm_request_assembly`, `llm_stream_start`, `streamMessages` | `startStream()` is evaluated inside the same `try` as `collector.consume(...)` | Identical |
| Consume | `iterateAbortable('llm_stream')` → `llm_stream_chunk` → accumulate → reasoning start/content → `handler.feed` | `collector.consume`: same sequence | Identical |
| Classify | `llm_stream_finalize` → stop error throw → output_limit / normal | `settle()`: `llm_stream_finalize` first (R-2) → same | Identical |
| Output-limited | `post_llm_stream` → commit → text-only ingest → `finalizeOutputLimited` → reasoning end (no metadata) → `{content, usage, finish}` response → usage | `settleOutputLimited`: same; `completeOutputLimited` = handler then `endReasoning()` (R-1 shape kept) | Identical |
| Normal | `finalize` → reasoning end → `post_llm_stream` → full response → usage → [tools: `llm_tool_intents`, batch start, `ingestAssistantToolResponse`] / [`llm_assistant_response`, `ingestAssistantResponse`] → commit | `completeNormally` (finalize, reasoning end, `getAllInvocations`, a pure copy) → `post_llm_stream` → `buildResponse` → usage → same branches without the batch start → commit | Identical, except the batch start moves to the runner (D-05) |
| Interrupted | `finalizeInterrupted` unless finalized → reasoning end `{interrupted, reason}` if open → partial ingest (text+reasoning) → commit if unsettled → rethrow | `abandonInterrupted` (guarded; a no-op after completion, R-3) → same | Identical |
| Failed | restore if unsettled → `finalizeFailed` unless finalized → reasoning end `{failed, error}` → error notification → `final/isError` with `{content: message, usage: null}` | `settleFailed`: same | Identical |
| After response | `llm_compaction` → evaluate (when compaction is enabled) → output_limited return → invocations from batch+count → after-final compaction when there are no tools → outcome | `finishCall`: same; invocations come from the settlement (D-04) | Identical |
| Runner | inline `if` chain; counter reset before `compaction_blocked` | `switch` with `handleOutputLimited` / `waitForCompactionRetry` / `completeWithFinalResponse` / `runToolStep`; the counter resets for `compaction_blocked` and `tool_invocations` (R-7); the tool block was moved verbatim | Identical |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001 | System | Agent user | Any agent turn | Chat or team run (AutoByteus runtime) | Normal | DS-001/DS-002 | Identical events, statuses, memory and outcomes | Golden suite (12 scenarios) + existing suites | Supported Normal Scenario | Use |
| SCN-002 | BEH-002, CON-001..006 | Contract | Compaction cache reuse | Cached summary request | After-final or pre-request compaction | Explicit Edge | DS-004 | Unchanged | 1c0ac46f suites; golden compaction scenarios | Supported Explicit Edge Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CND-001 | The tool-batch registration moved from inside `LlmPhase` (before `ingestAssistantToolResponse`) to `runToolStep` (after the `llm_compaction` and `post_llm_phase` fences) | SCN-001 | An external tool result or approval arriving in that window | `postToolResult` requires an active batch **and** a result waiter. Waiters and approvals exist only inside `ToolPhase`, so an early post was rejected before and is rejected now; only the rejection code differs (`no_result_consumer` vs `no_pending_invocation`). An external producer cannot learn an invocation id before `ToolPhase` starts it. Interruption handling does not read the batch | `agent-turn.ts` l.217-262; grep shows the only batch readers are `postToolResult` and the runner | Reject (Technically Possible but Unsupported/Contrived) | The design (P-001) and the golden suite agree. No action |
| CND-002 | The CCR-E2E-002 live failure (`target_unattainable` before dispatch) | BEH-002 | A live Opus run | `CCR2-T1` first call: 155 output tokens in both runs (identical first request, 8,716 vs 8,720 input tokens). The failed run then produced 600–3,400 output tokens per call vs ~130–500 in the passing rerun, so the history outgrew the case's fixed budget | `evidence/ccr/calls-summary.json` vs `evidence/ccr-002-rerun/calls-summary.json`; planner unchanged; golden compaction scenarios identical | Reject (as a defect) | Model output-size variance, not a refactor effect. Fixture robustness belongs to the CCR suite owner. API/E2E should re-run the suite |
| CND-003 | The runner `switch` has no exhaustive `default` (`never`) | Engineering contract (exhaustive dispatch) | A future `LlmPhaseOutcome` variant | Today the union is fully covered and tsc passes. An unhandled future variant would fall through to `while(true)` and re-run `LlmPhase` with the same input | Code | Reject as a finding; non-blocking recommendation | Optional `default: { const unhandled: never = llmOutcome; throw … }` |
| CND-004 | Collector construction moved after request assembly | SCN-001 | — | The constructor emits nothing; only id draws (normalized in golden) | Code; golden | Reject | Not observable |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | Responsibility drift resolved: `run()` is a 20-line sequence of named steps; the batch has one owner; dead state removed | — |
| Matches behavior-defining supplemental artifacts | Pass | None behavior-defining | — |
| Data-flow spine inventory preserved | Pass | DS-001..DS-004 implemented as drawn | — |
| Ownership boundary preservation | Pass | The collector never touches memory, snapshots or the turn; `LlmPhase` never iterates; only the runner starts and clears batches; `LlmCallCompaction` is the only after-response compaction site | — |
| Off-spine concern clarity | Pass | Collector and `LlmCallCompaction` each serve `LlmPhase` | — |
| Existing capability reuse | Pass | Handler reused (owned by the collector); `evaluateLlmPhaseCompaction` wrapped, unchanged | — |
| Reusable owned structures | Pass | Three inline reasoning-end variants collapsed into `endReasoning(payload?)` | — |
| Shared-structure tightness | Pass | `LlmCall` / `LlmCallSettlement` are private; `LlmPhaseOutcome` unchanged | — |
| Repeated coordination ownership | Pass | One finalization guard (`finalized`) replaces `streamFinalized` and `currentReasoningPartId` checks | — |
| Empty indirection | Pass | Both new owners hold state or lifecycle; no forwarding class; no `AgentLoop` | — |
| SoC / file responsibility | Pass | — | — |
| Ownership-driven dependencies | Pass | The runner imports neither the collector nor `LlmCallCompaction` | — |
| Authoritative Boundary Rule | Pass | The runner uses only `LlmPhase.run`; `LlmPhase` uses the collector API, not the handler | — |
| File placement | Pass | `agent/loop`; `LlmCallCompaction` sits beside `evaluateLlmPhaseCompaction` | — |
| Flat-vs-over-split | Pass | One new file | — |
| Interface clarity | Pass | Collector API as designed; `processFinalResponse` `turnId` is now required | — |
| Naming | Pass | `settleOutputLimited`, `completeNormally`, `abandonFailed`, `runToolStep`, `waitForCompactionRetry` | — |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch control | Pass | Step-wise commits, golden green at each | — |
| Dead code removed | Pass | `toolInvocationBatches`, the `activeTurn` fallbacks (2), closures, the inline loop, the batch re-derivation, unused imports. Grep finds no leftovers (`agent-runtime-state.ts` `activeTurn` is its own owner, unrelated) | — |
| Test scenarios requirement-aligned | Pass | The golden suite covers 12 scenarios over notifier events, 9 memory write methods, LLM requests, status events, the working context and raw traces, with normalization that keeps ordering and identity. Collector units cover each mode and idempotency (R-3) | — |
| Fixtures reusable / coherent | Pass | One scripted LLM and a scenario helper | — |
| No stale tests | Pass | 2 structural edits, each one line, justified (dead array; dead fallback context) | — |
| API/E2E readiness | Pass | — | — |

## Source File Size And Structure Audit

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `agent/loop/llm-phase.ts` | 377 (was 420) | Pass | Delta +274/−319 exceeds 220 | Pass | Pass | Planned split: the file shrinks, and the delta is the approved decomposition (D-03) | — |
| `agent/loop/agent-turn-runner.ts` | 315 | Pass | Pass (+108/−75) | Pass | Pass | OK | — |
| `agent/loop/llm-phase-compaction.ts` | 207 | Pass | Pass | Pass | Pass | OK | — |
| `agent/loop/llm-response-stream-collector.ts` (new) | 126 | Pass | Pass | Pass | Pass | OK | — |
| `agent/agent-turn.ts`, `pipelines/llm-response-pipeline.ts` | −2 / −7 net | Pass | Pass | Pass | Pass | OK | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | No re-exports or aliases |
| No legacy retention | Pass | Inline paths replaced |
| Dead code removed in touched files | Pass | — |
| Persisted-data decision followed | Pass | `Not Affected`; golden asserts identical memory writes |
| No dual reads/writes | Pass | — |
| Transition mechanics | Pass | N/A |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, done in this change (D-08). `agent_runtime_loop_and_interrupt.md` names the runner handlers, `runToolStep` and batch ownership, the `LlmPhase` steps, the collector, `LlmCallCompaction` and the collector's fences. `event_driven_core_design.md` is updated too.

## Additional Material Premise Validation

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| P-001 (batch registration window) | Confirmed | CND-001 |
| R-1..R-7 (design-review notes) | Confirmed applied | R-1: per-path shapes. R-2: finalize fence first in `settle`. R-3: collector idempotency, unit tests and golden scenario. R-4: normalization. R-5: TESTING commands. R-6: single resolver passed to `create`. R-7: counter reset on `compaction_blocked` |

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.4
- Overall score (`/100`): 94

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.6 | `run()` now reads as the spine | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.6 | One owner per concern; batch lifecycle single-owned | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | Small collector API; required `turnId` | — | — |
| 4 | Separation of Concerns and File Placement | 9.4 | Clean split | `LlmPhase` still holds several settle methods (by design) | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | Private per-call record; settlement union | `LlmCall` mixes call data with the mutable `recoverySettled` (acceptable, documented) | — |
| 6 | Naming Quality and Local Readability | 9.5 | Self-describing step names | — | — |
| 7 | API/E2E Readiness | 9.2 | Strong deterministic evidence | CCR-E2E-002 live flake (CND-002) needs a re-run | API/E2E re-run |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.5 | Line-by-line ordering equivalence; golden unchanged | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Clean cut | — | — |
| 10 | Cleanup Completeness | 9.3 | All planned removals | Optional exhaustive `default` (CND-003) | — |

## Findings

None.

Non-blocking recommendations:
- CND-003: add an exhaustive `never` default to the runner `switch`.
- CND-002: CCR-E2E-002 fixture robustness, for the CCR suite owner (bound the output or derive the budget from the observed history).

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/api_e2e_engineer`

## Residual Risks

- CCR-E2E-002 live variance (CND-002): API/E2E should re-run the compaction cache reuse suite and judge flakiness against the base.
- RSK-002 ordering drift: covered by the golden suite. The suite is only as broad as its 12 scenarios; approval-gated tools and multi-tool batches rely on the existing suites (green).
- Known baseline failures, identical on the base: `read-media-file-continuation-flow` (stale catalog model); the server status-websocket content-cadence cases.

## Latest Authoritative Result

- Review Decision: `Pass` (round 1). Round 2 (CRR-003): `Pass`, see the top section
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4/10; every category ≥ 9.2
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: reviewer re-runs:
  - golden plus output-limit recovery plus runtime integration with `CI=1` (snapshots locked): 40/40
  - core unit: 2081/2081
  - `tsc -p tsconfig.build.json --noEmit`: clean
  - server `typecheck`: clean
