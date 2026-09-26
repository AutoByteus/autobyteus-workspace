# Implementation Revision Record — claude-sdk-streaming-input-session

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | architecture_reviewer / `design-review-report.md` (ARCH-REV-003 Pass) / initial | IC-1, IC-2 (binding constraints) | `Design Impact` | SR-009; ARCH-REV-003; CRR N/A; API-REV N/A; DR N/A | Implementation largely built and checked; halted on escalation trigger IMP-DI-001 (AgentRun FIFO head-of-line blocks append) |
| IR-002 | architecture_reviewer / `design-review-report.md` (ARCH-REV-004 Pass) / round 4 resume | IMP-DI-001; IC-1..IC-4 | `Initial Baseline` (completion after Design Impact) | SR-011; ARCH-REV-004; CRR N/A; API-REV N/A; DR N/A | Implementation complete; ready for code review |

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
