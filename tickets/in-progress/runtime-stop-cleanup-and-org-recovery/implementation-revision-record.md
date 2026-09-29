# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer / `design-review-report.md` (ARCH-REV-002, Pass) / initial | N/A (non-blocking notes N-1..N-3 applied) | `Initial Baseline` | `SR-003`, `ARCH-REV-002` | D-A1, D-B1..D-B4 implemented; implementation-scoped checks green apart from failures that already exist at base; routed to Code Review |

## Revision Entries

### IR-001 — Stop AGY background groups with AGY; Org/Team termination and recovery with dead members

- Triggering role, report path, and round: Architecture Reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-stop-cleanup-and-org-recovery/tickets/in-progress/runtime-stop-cleanup-and-org-recovery/design-review-report.md`, ARCH-REV-002 round 2 (Pass)
- Triggering finding IDs: N/A. Non-blocking notes applied:
  - N-1: Team scope clears `fencing` only.
  - N-2: the `TeamRunService` guard was removed as designed.
  - N-3: the readiness assert keeps running first.
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation complete per design-spec SR-003; `task_size=Medium`, `architectural_risk=High` confirmed
- Related solution revision IDs: `SR-001`, `SR-002`, `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-001`, `ARCH-REV-002`
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: initial implementation handoff
- Approved behavior or requirement IDs affected: BEH-A1, BEH-A2 (unchanged, documented), BEH-B1, BEH-B2; REQ-A1..A3, REQ-B1..B4; AC-A1..A3 and AC-B1..B4 (unit level; live checks owned downstream)
- Implementation delta:
  - D-A1: new private helper `agy-background-process-groups.ts`. `AgyStreamProcess.stop()` SIGTERMs AGY's descendant-led groups before AGY, followed by an unref'd 1.5 s SIGKILL sweep. It only does this when the child is alive (R-1), and signals each group independently (R-2). A group is selected only when its leader descends from AGY (R-3). Skipped on win32. Fail-safe.
  - D-B1: `ConfiguredAgentExecutionHandle.isStale`, with the stale short-circuit in `prepareTermination`, `tryPrepareTerminationIfQuiescent` and `fenceForRootShutdown`. The fence latch is set before the check (R-5). A discovery failure is logged as `COLLABORATION_STALE_RUN_DISCOVERY_FAILED` and rethrown.
  - D-B2: the handle's `activationMode` is per attempt and switches to `restore` at both publication sites (R-4). `ConfiguredAgentActivationPlanner.prepare(config, platformAgentRunId, mode)`; the constructor `mode` is removed.
  - D-B3:
    - `AgentOrgRun`: persistent `failStopped` field, and the termination attempt is cleared on rejection or non-acceptance (AR-002).
    - Org frozen scope: `fencing` and `finishing` are cleared on failure.
    - Team frozen scope: `fencing` is cleared on failure (R-8).
  - D-B4:
    - `AgentOrgRunManager.completeStoppingRun` and `AgentTeamRunManager.completeStoppingRoot` run inside the restore transition and throw `AGENT_ORG_STOP_INCOMPLETE` / `TEAM_RUN_STOP_INCOMPLETE`.
    - The `TeamRunService.restoreTeamRun` pre-guard is removed (AR-001).
  - Docs: AGY runtime, Agent Team execution and Agent Orgs module docs.
- Changed files or areas: see `implementation-handoff.md` "Key Files Or Areas"
- Local validation and result: see `implementation-handoff.md` "Local Implementation Checks Run"
- Next recipient or routing: `/code_reviewer` (Large-or-High rule from `get_handoff_rules`)
- Remaining limitations or risks: live AGY and Org validation is pending (AC-A1/A2, AC-B1..B3, ASM-001 `--conversation` resume). The residual risks are listed in the handoff.
