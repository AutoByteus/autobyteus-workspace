# Implementation Revision Record — claude-sdk-streaming-input-session

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | architecture_reviewer / `design-review-report.md` (ARCH-REV-003 Pass) / initial | IC-1, IC-2 (binding constraints) | `Design Impact` | SR-009; ARCH-REV-003; CRR N/A; API-REV N/A; DR N/A | Implementation largely built and checked; halted on escalation trigger IMP-DI-001 (AgentRun FIFO head-of-line blocks append) |
| IR-002 | architecture_reviewer / `design-review-report.md` (ARCH-REV-004 Pass) / round 4 resume | IMP-DI-001; IC-1..IC-4 | `Initial Baseline` (completion after Design Impact) | SR-011; ARCH-REV-004; CRR N/A; API-REV N/A; DR N/A | Implementation complete; ready for code review |
| IR-003 | code_reviewer / `code-review-report.md` (CRR-001 Fail) / round 1 | CR-001 | `Local Fix` | SR-011; ARCH-REV-004; CRR-001; API-REV N/A; DR N/A | Fixed; ready for focused re-review |
| IR-004 | architecture_reviewer / `design-review-report.md` (ARCH-REV-005 Pass) / round 5 | CR-002, API-F-001, OBS-2, IC-5 | `Design Impact` resolution (SR-012) | SR-012; ARCH-REV-005; CRR-003; API-REV-001; DR N/A | Implemented; ready for code review |

## Revision Entries

### IR-001 — Streaming-input session implementation baseline; halted on IMP-DI-001

- Triggering role, report path, and round: architecture_reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/design-review-report.md`, round 3 (Pass)
- Triggering finding IDs: IC-1, IC-2 (implemented). New implementation finding: IMP-DI-001 (see handoff)
- Classification: `Design Impact`
- Prior authoritative result: N/A
- Current authoritative result: the SPINE-1..5 runtime is implemented and passes unit tests, the live gated checks, and the live manager integration suite. REQ-004 / AC-003 / AC-004 cannot be met through AgentRun as designed; this is the design escalation trigger "AgentRun needs a contract change beyond declaring append support".
- Related solution revision IDs: SR-009 (requirements SR-006)
- Related architecture-review revision IDs: ARCH-REV-003
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this revision is recorded: initial implementation round, returned upstream on an escalation trigger
- Approved behavior or requirement IDs affected: BEH-002 / REQ-004 / AC-003, AC-004 (blocked). All others are implemented at unit/integration level.
- Implementation delta: see `implementation-handoff.md` → Key Files
- Changed files or areas:
  - `runtime-management/claude/client/*`
  - `backends/claude/session/*`
  - `backends/claude/backend/*`
  - `backends/claude/events/*`
  - `shared/context-image-source.ts`
  - Codex image mapper
  - agent-memory trace
  - run-history replay
  - `autobyteus-ts` `RawTraceItem.senderId`
  - web hydration mapping
  - tests
- Local validation and result: see the handoff (Local Implementation Checks)
- Next recipient or routing: `/solution_designer` (Design Impact)
- Remaining limitations or risks: docs, the background-bash E2E replacement, provider-capabilities E2E migration, memory/replay unit tests and the web hydration test are not done yet (independent of IMP-DI-001)

### IR-002 — Shared AgentRun append claim (SR-011), IC-3/IC-4, remaining work completed

- Triggering role, report path, and round: architecture_reviewer, `design-review-report.md`, round 4 (ARCH-REV-004 Pass; resume from `26450e6b0`)
- Triggering finding IDs: IMP-DI-001 (resolved by design SR-011); IC-1..IC-4
- Classification: completion of the initial implementation after the Design Impact
- Prior authoritative result: IR-001, halted on IMP-DI-001
- Current authoritative result: implementation complete; ready for independent code review
- Related solution revision IDs: SR-011
- Related architecture-review revision IDs: ARCH-REV-004
- Related code-review / API-E2E / delivery revision IDs: N/A
- Why this revision is recorded: resumed implementation per the revised design
- Approved behavior or requirement IDs affected: BEH-002, BEH-009, REQ-004, REQ-012, AC-003, AC-004, AC-014..016; plus completion of REQ-003 history, REQ-010 suites and docs
- Implementation delta:
  - `AgentRunInputAdmissionState.claimNext` walk (skip entries forwarded into the active turn; stop at any other non-queued entry) and the `notInto` mark.
  - Requeue on `undeliveredRetryAsStart`; the optional contract flag.
  - Claude backend sets the flag for `CLAUDE_APPEND_TURN_MISMATCH` on append; the tracker uses `CLAUDE_TURN_INTERRUPTING` for a start into an interrupting turn.
  - Codex pre-RPC `CODEX_TURN_STEER_TURN_NOT_ACTIVE` is mapped to the flag (IC-3).
  - IC-4 documented as a claim-time hint.
  - Docs rewritten.
  - Tests added: memory/replay/web/builder/image-source; AgentRun, admission, Codex and Claude backend.
  - Live suites ported: manager, factory, websocket.
  - The background-bash policy E2E was replaced by the live background-task E2E; the provider-capabilities E2E was migrated.
- Changed files or areas: see `implementation-handoff.md` → Key Files
- Local validation and result: see the handoff (all changed-area suites pass; the remaining failures are identical on base; the live Claude suites pass on both CLIs)
- Next recipient or routing: `/code_reviewer`
- Remaining limitations or risks:
  - Live AC-014 (Codex steer) and the live team AC-004 are for API/E2E.
  - The rendered web check of replayed notices was not done.
  - 2 live factory MCP cases and the Claude team E2E setup are stale for reasons unrelated to this change.

### IR-003 — CR-001: requeued append no longer inherits the old turn's pending terminal

- Triggering role, report path, and round: code_reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/code-review-report.md`, CRR-001 (Fail, Local Fix)
- Triggering finding IDs: CR-001 (High)
- Classification: `Local Fix`
- Prior authoritative result: IR-002 (a requeued undelivered append kept the targeted turn's `pendingTerminal` and finished at that old terminal once forwarded into the next turn)
- Current authoritative result: the requeued input resolves only at the terminal of the turn it is actually delivered into
- Related revision IDs: SR-011; ARCH-REV-004; CRR-001. API-REV and DR are N/A.
- Why this revision is recorded: code-review Local Fix
- Approved behavior or requirement IDs affected: REQ-012, AC-016, QR-003
- Implementation delta: `AgentRunInputAdmissionState.applyDispatchResult` requeue branch now also clears `entry.pendingTerminal` and `entry.observedTurnId`, alongside state, `dispatchKind`, `associatedTurnId`, and `notInto = T`.
- Changed files or areas:
  - `src/agent-execution/input/agent-run-input-admission-state.ts`
  - `tests/unit/agent-execution/input/agent-run-input-admission-state.test.ts` (new `it.each` for T completed and T failed observed during the in-flight append claim)
  - `tests/unit/agent-execution/agent-run.test.ts` (new AgentRun-level test: T's `TURN_COMPLETED` published while the append dispatch is pending, then the undelivered result; B resolves only at `turn-B`)
- Local validation and result:
  - The 3 new tests fail with the fix reverted and pass with it.
  - Input + AgentRun suites: 48/48.
  - Changed-area regression: only the 5 pre-existing base-failing files fail (15 tests, identical on base).
  - `tsc` build config: pass.
- Next recipient or routing: `/code_reviewer` (focused re-review of CR-001)
- Remaining limitations or risks: unchanged from IR-002

### IR-004 — SR-012 usage accounting across process generations; IC-5; OBS-2

- Triggering role, report path, and round: architecture_reviewer, `design-review-report.md` round 5 (ARCH-REV-005 Pass). Evidence: `code-review-report.md` (CR-002, CRR-003) and `api-e2e-execution-coverage-report.md` (API-F-001, OBS-2).
- Triggering finding IDs: CR-002 / API-F-001 / RSK-007 (a crash reopen restarts cumulative `modelUsage`, so one turn was lost or silently under-counted); OBS-2; IC-5
- Classification: implementation of the revised design SR-012
- Prior authoritative result: IR-003 (a resume-opened generation's first result was differenced against the previous generation's checkpoint)
- Current authoritative result: the first emitted observation of every resume-opened generation carries `claude_sdk_series_restart`. The reconciler admits the per-turn main-loop usage for it and re-anchors the checkpoints; all other observations are unchanged.
- Related revision IDs: SR-012; ARCH-REV-005; CRR-003; API-REV-001. DR is N/A.
- Why this revision is recorded: resume after the round-5 design revision
- Approved behavior or requirement IDs affected: REQ-010 (token accounting preserved), REQ-008, REQ-009 (OBS-2, no override)
- Implementation delta:
  - `claude-session.ts`: `seriesRestartPending = binding.kind === "resume"` per process open, consumed only when a usage event is actually emitted (IC-5).
  - `claude-session-token-usage.ts`: `emitClaudeTokenUsageEvent` returns whether it emitted and adds `claude_sdk_series_restart: true` when asked.
  - `agent-run-token-usage.ts`: optional `claude_sdk_series_restart?: true`, preserved for SDK observations.
  - `claude-sdk-model-usage-reconciler.ts`: no regression check for a series restart; the selected delta is the main-loop counts (flag `claude_sdk_series_restart_main_loop_delta`); missing main-loop → partial with flag `claude_sdk_series_restart_main_loop_unavailable`; all rows re-anchored.
  - `claude-sdk-client.ts`: warns once per `openStreamingSession` when the spawn env sets `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS`, without overriding it (OBS-2).
  - Docs: `token_usage.md` (the clean-exit correction and the series-restart rule) and `agent_execution.md` (operator env note).
- Changed files or areas: the files above plus these tests:
  - new `tests/unit/token-usage/projections/claude-sdk-usage-series-restart.test.ts`: origin 0, a restore-time origin above the checkpoint, clean restore, same-process, missing main-loop usage;
  - `claude-session.test.ts`: first-only marker, IC-5 zeroed first result dropped then the next result carries the marker, and reopen-after-exit vs create;
  - `claude-sdk-client.test.ts`: OBS-2 warning.
- Local validation and result:
  - The reconciler restart tests fail on the old rule (3 of 5; clean restore and same-process are expected to be equal either way).
  - The IC-5 test fails when the marker is consumed on the raw result.
  - `tsc` build config: pass.
  - Changed-area regression: only the 5 pre-existing base-failing files fail (15 tests).
  - **Live `-t "RSK-007"`: 2/2 on PATH `claude` and the SDK-bundled CLI.** The post-crash turn is counted (13,727 / 13,706, flag `claude_sdk_series_restart_main_loop_delta`, not regressed), and the next same-process turn differences exactly (13,800 / 13,784).
- Next recipient or routing: `/code_reviewer`
- Remaining limitations or risks: the first observation of each resume-opened generation is an approximated, flagged main-loop delta (it excludes auxiliary selected-model calls within that turn). The API/E2E engineer's uncommitted durable test changes were left untouched in the worktree.
