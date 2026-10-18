# Implementation Revision Record — agent-loop-structure-refactor

The current code and `implementation-handoff.md` are authoritative. This record locates each implementation round's delta.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-004 | Delivery Engineer, `delivery-revision-record.md` DR-004 | DR-004 (integration conflict) | `Local Fix` | SR-003; ARCH-REV-001; CRR-006; API-REV-002; DR-004 | Merged `c2e366806`; per-call TPS hooks ported; golden re-proven on the new base; ready for code review |
| IR-003 | Code Reviewer, CRR-005 recommendation CND-003, applied at the user's request (2026-10-17) | CND-003 | `Local Fix` | SR-003; ARCH-REV-001; CRR-005; API-REV-001/002; DR-003 | Exhaustive `never` default in the runner switch; ready for code review |
| IR-002 | Delivery Engineer, `delivery-revision-record.md` DR-001 | DR-001 (integration conflict) | `Local Fix` | SR-003; ARCH-REV-001; CRR-001; API-REV-001; DR-001 | Merged `e305a20a5`; token-meter field ported; golden re-proven on the new base; ready for code review |
| IR-001 | Architecture Reviewer, `design-review-report.md` Pass (ARCH-REV-001 on SR-003) | N/A | `Initial Baseline` | SR-003; ARCH-REV-001; CRR N/A; API-REV N/A; DR N/A | Pure refactor implemented in the design's 7 steps; ready for code review |

## Revision Entries

### IR-001 — Agent-loop ownership refactor (D-01..D-08)

- Triggering role, report path, and round: Architecture Reviewer pass, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-loop-structure-refactor/tickets/in-progress/agent-loop-structure-refactor/design-review-report.md` (ARCH-REV-001).
- Triggering finding IDs: N/A. Review notes R-1..R-7 applied (see the handoff).
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implemented on `codex/agent-loop-structure-refactor`, one commit per design step, with the golden suite green after each step.
- Related solution revision IDs: SR-003
- Related architecture-review revision IDs: ARCH-REV-001
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: the user-approved pure refactor (REQ-001..REQ-008; DEC-001 named outcome handlers, DEC-002 ToolPhase assess only).
- Approved behavior or requirement IDs affected: REQ-001..REQ-006 and REQ-008 (REQ-007 was satisfied by the base); AC-001..AC-008.
- Implementation delta, one commit per step:
  1. `cd03cd74b`: golden event-sequence suite on the unchanged base (12 scenarios).
  2. `2b3ef12cb`: `LlmResponseStreamCollector` (D-01).
  3. `61bcf28f8`: `LlmCallCompaction` (D-02).
  4. `98130f5bf`: `LlmPhase` named steps; the outcome carries the invocations (D-03, D-04).
  5. `7fddc2000`: the runner owns the tool batch; `toolInvocationBatches` and the `activeTurn` fallback are removed (D-05).
  6. `5ecd6f661`: runner outcome handlers and `runToolStep` (D-06).
  7. `261ab15dc`: docs (D-08).
- Changed files or areas: `autobyteus-ts/src/agent/loop/` (`llm-phase.ts`, `llm-response-stream-collector.ts` (new), `llm-phase-compaction.ts`, `agent-turn-runner.ts`), `autobyteus-ts/src/agent/agent-turn.ts`, `autobyteus-ts/src/agent/pipelines/llm-response-pipeline.ts`, two docs, the new golden and collector tests, and two structural test edits.
- Local validation and result: see `implementation-handoff.md` "Local Implementation Checks Run".
- Next recipient or routing: `/software_engineering_team/code_reviewer` (High risk rule).
- Remaining limitations or risks: see the handoff "Known Risks".

- Downstream note (informational, 2026-10-12): code review `Pass`, CRR-001 on IR-001 (9.4/10, no findings; `code-review-report.md`). The reviewer forwarded the package to API/E2E. CCR-E2E-002 classification accepted (CND-002); API/E2E will re-run it. Optional CND-003 (exhaustive `never` default in the runner switch) is not applied: it is non-blocking and would change the reviewed tree.

### IR-002 — Delivery Local Fix: merge origin/personal, port the token-meter field

- Triggering role, report path, and round: Delivery Engineer, `release-deployment-report.md` / `delivery-revision-record.md` DR-001. The integration refresh conflicted in `autobyteus-ts/src/agent/loop/llm-phase.ts`.
- Triggering finding IDs: DR-001 requested items 1–5.
- Classification: `Local Fix`
- Prior authoritative result: IR-001 passed CRR-001 and API-REV-001; delivery was blocked by the conflict.
- Current authoritative result:
  - Merged `origin/personal` @ `e305a20a5` (`6c88ddc71`).
  - `context_compaction_threshold_tokens` ported to `LlmPhase.notifyTokenUsage` via `LlmCallCompaction.triggerThresholdTokens`.
  - Golden snapshot re-recorded on the merged base's unchanged loop; the refactored head matches it (`b12e8c113`).
- Related solution revision IDs: SR-003
- Related architecture-review revision IDs: ARCH-REV-001
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: DR-001
- Why this revision is recorded: delivery cannot integrate until the refactor sits on the current base with the base's token-usage field preserved.
- Approved behavior or requirement IDs affected: REQ-001 (identical behavior, now relative to the new base); AC-001, AC-003.
- Implementation delta:
  - `llm-phase.ts`: one payload field.
  - `llm-phase-compaction.ts`: one getter.
  - The snapshot re-recorded (base-caused key only).
  - The rest of the merge is the base's own content.
- Changed files or areas: `autobyteus-ts/src/agent/loop/llm-phase.ts`, `autobyteus-ts/src/agent/loop/llm-phase-compaction.ts`, `autobyteus-ts/tests/integration/agent/__snapshots__/agent-loop-event-sequence.test.ts.snap`.
- Local validation and result:
  - Golden: merged-base snapshot equals merged head, 12/12.
  - Core unit: 2027/2027.
  - Agent integration: baseline-only failure.
  - Server: typecheck clean; unit 5322 pass.
  - Token usage: unit 125/125, E2E 42/42.
  - `fdb7635f3`: no interaction.
- Next recipient or routing: `/software_engineering_team/code_reviewer` (Local Fix, High risk rule).
- Remaining limitations or risks: server integration and gated live suites were not rerun this round (the merge changes one payload field in the loop). Baseline failures are as before.

- Downstream note (informational, 2026-10-12): code review `Pass`, CRR-003 (round 2, Targeted Delta Review) on IR-002. The reviewer confirmed the field port is equivalent and independently re-verified the golden re-record on `e305a20a5` (12/12, `CI=1`). Forwarded to API/E2E.

### IR-003 — CND-003: exhaustive outcome switch in the turn runner

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` "Round 3 (CRR-005)" Recommendations #1 (round-1 candidate CND-003). The user asked for it to be applied (relayed 2026-10-17).
- Triggering finding IDs: CND-003
- Classification: `Local Fix`
- Prior authoritative result: CRR-005 Pass on head `5f1b45f46`; delivery holding for the user's verification (DR-003).
- Current authoritative result: commit `002207b11` on `codex/agent-loop-structure-refactor`.
- Related solution revision IDs: SR-003
- Related architecture-review revision IDs: ARCH-REV-001
- Related code-review revision IDs: CRR-005
- Related API/E2E revision IDs: API-REV-001, API-REV-002
- Related delivery revision IDs: DR-003
- Why this revision is recorded: the user asked for the optional recommendation. A future `LlmPhaseOutcome` variant without a handler should fail to compile instead of silently re-running `LlmPhase` in `while (true)`.
- Approved behavior or requirement IDs affected: REQ-005 (explicit outcome handling). No behavior change for the four existing outcomes (REQ-001).
- Implementation delta: `autobyteus-ts/src/agent/loop/agent-turn-runner.ts`, +5 lines. A `default` case does `const unhandled: never = llmOutcome` and throws `Unhandled LLM outcome: …`. A throw there reaches the runner's existing non-interrupt recovery path.
- Changed files or areas: `autobyteus-ts/src/agent/loop/agent-turn-runner.ts` only.
- Local validation and result:
  - `tsc -p autobyteus-ts/tsconfig.build.json --noEmit`: clean.
  - Negative check: removing the `compaction_blocked` case gives `TS2322: Type '{ kind: "compaction_blocked"; }' is not assignable to type 'never'`; the file was restored.
  - `env -i … CI=1 vitest run` golden + `output-limit-recovery-flow` + `tests/integration/agent/runtime`: 40/40. Golden 12/12; snapshot file unchanged.
  - `pnpm -C autobyteus-ts exec vitest run tests/unit`: 2027/2027.
- Next recipient or routing: `/software_engineering_team/code_reviewer` (Local Fix, High risk rule); delivery informed because the branch is held.
- Remaining limitations or risks: none new. The default is unreachable today (all four variants are handled).

- Downstream note (informational, 2026-10-17): code review `Pass`, CRR-006 on IR-003 (9.5/10, no findings; CND-003 resolved). The reviewer independently confirmed the negative check (TS2322) and ran golden + loop + runtime suites 116/116 with `CI=1`, snapshot unchanged. Forwarded to API/E2E.

### IR-004 — Delivery Local Fix: merge origin/personal, port the per-call TPS hooks

- Triggering role, report path, and round: Delivery Engineer, `release-deployment-report.md` / `delivery-revision-record.md` DR-004 (trial merge log `delivery-evidence/dr-004/trial-merge.log`). The integration refresh conflicted in `autobyteus-ts/src/agent/loop/llm-phase.ts` only.
- Triggering finding IDs: DR-004 requested items 1–4.
- Classification: `Local Fix`
- Prior authoritative result: IR-003 passed CRR-006; delivery was blocked by the conflict.
- Current authoritative result: head `04b879d55` on `codex/agent-loop-structure-refactor`.
  - `78bf3f910` merges `origin/personal` @ `c2e366806` (179 commits). The conflict was resolved to the refactored file. Output-tps-precision's (`5fe746ab5`) three `LlmCallTiming` hooks are ported with the same timing semantics:
    - the `LlmCall` record holds the call's `LlmCallTiming`;
    - `LlmPhase.startStream` calls `timing.start()` after the `llm_request_assembly` and `llm_stream_start` fences, immediately before `llm.streamMessages(...)`;
    - `LlmResponseStreamCollector.consume` takes a chunk observer, called for every chunk after the `llm_stream_chunk` fence and before accumulation (`timing.observeChunk`);
    - `LlmPhase.notifyTokenUsage` adds `output_throughput: timing.throughput(usage)` after `context_compaction_threshold_tokens`.
  - `bc78c81f2` re-records the golden snapshot on the merged base.
  - `04b879d55` doc: the runtime-loop doc names where call timing lives.
  - The base's `llm-call-throughput.ts`, `notifiers.ts` and the stream payload merged automatically. Nothing else in `autobyteus-ts/src/agent` changed in the base since `1ea74caa2`.
- Related solution revision IDs: SR-003
- Related architecture-review revision IDs: ARCH-REV-001
- Related code-review revision IDs: CRR-006
- Related API/E2E revision IDs: API-REV-002
- Related delivery revision IDs: DR-004
- Why this revision is recorded: delivery cannot integrate until the refactor carries the base's per-call TPS timing.
- Approved behavior or requirement IDs affected: REQ-001 (identical behavior relative to the new base); AC-001, AC-003.
- Implementation delta:
  - `llm-phase.ts`: timing in the call record, `start()` in `startStream`, observer passed to `consume`, payload field.
  - `llm-response-stream-collector.ts`: optional `observeChunk` parameter on `consume`.
  - The snapshot re-recorded (base-caused object only).
  - The runtime-loop doc: one bullet.
- Changed files or areas: `autobyteus-ts/src/agent/loop/llm-phase.ts`, `autobyteus-ts/src/agent/loop/llm-response-stream-collector.ts`, `autobyteus-ts/tests/integration/agent/__snapshots__/agent-loop-event-sequence.test.ts.snap`, `autobyteus-ts/docs/agent_runtime_loop_and_interrupt.md`.
- Local validation and result:
  - **Golden:**
    - The merged head against the old snapshot differs only by `output_throughput` in 24 token-usage payloads.
    - Re-recorded on the merged base's unchanged loop: a temp worktree at `c2e366806` plus the golden test file only, recorded, then 2× `CI=1` passing. The only diff from the old snapshot is that object.
    - The refactored head matches it exactly (12/12, twice).
  - Core: build tsc clean; unit 2035/2035; `tests/unit/agent/loop` 83/83, including the base's `llm-call-throughput.test.ts` (7/7, with its LlmPhase-level TPS scenarios).
  - Agent integration (`env -i`, `CI=1`): 56 passed, 15 skipped, 1 failed (baseline `read-media-file`, stale `gemini-3.5-flash`).
  - Server: typecheck clean; build OK; `test:unit` 5687 passed, 7 skipped.
  - Token usage: `tests/unit/token-usage` 125/125; `tests/e2e/token-usage` 42/42.
  - `token-meter-tps-transport.e2e.test.ts` (gated `RUN_TOKEN_TPS_E2E=1`, scripted AGY CLI, no paid inference): 1/1. It needed `PLAYWRIGHT_CHROME_EXECUTABLE_PATH` set to the local Chrome on macOS (the probe defaults to `/usr/bin/chromium`) and a not-yet-existing `TEST_TPS_OUTPUT_DIR`.
- Next recipient or routing: `/software_engineering_team/code_reviewer` (Local Fix, High risk rule).
- Remaining limitations or risks:
  - Server integration and the paid live suites were not rerun (the loop change is the ported timing hooks).
  - The golden scenarios always produce `method: "end_to_end"`, because scripted calls finish under the 250 ms generation window. A very slow machine could in principle cross it; this timing dependence comes from the base's field.

- Downstream note (informational, 2026-10-17): code review `Pass`, CRR-008 on IR-004 (9.5/10, no findings). The reviewer confirmed the `LlmCallTiming` port is equivalent and independently re-verified the golden re-record on `c2e366806` (12/12 twice, `CI=1`). Forwarded to API/E2E. New non-blocking note CND-004 (make the golden suite independent of the timing-dependent `output_throughput.method` by injecting a deterministic clock or normalizing `method`) is recorded and not applied, so the reviewed tree stays unchanged.
