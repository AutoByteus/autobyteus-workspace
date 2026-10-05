# Architecture Review Revision Record — busy-quit-shutdown-orphan

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / initial review of SR-003 | SR-002, SR-003 | N/A | Fail (Design Impact) | AR-001, AR-002, AR-003 |

## Revision Entries

### ARCH-REV-001 — Initial baseline: D1 and D2 sound; deferred-quit re-entry and coverage outside the server's group must be fixed

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/design-review-report.md`
- Review round and trigger: Round 1. `/solution_designer` sent SR-003 as `Architecture Design Complete` (Large/High).
- Triggering role, report path, and finding IDs: `/solution_designer`; `architecture-design-handoff.md`; N/A.
- Relevant solution revision IDs: SR-002 (approval), SR-003 (design).
- Prior authoritative decision: N/A.
- Current authoritative decision: Fail (Design Impact).
- Baseline established (code at `5f3aefd24`/`02d6ddf05`):
  - Limiting D1 to the two stop-now entry points is correct, because the Team/Org/copy flows rely on drain-and-cancel. Those entry points also have application callers (AR-001).
  - The D2 bound and the flag-gated group signal are coherent with D3's 15 s.
  - Process groups are right for runtime CLIs.
  - The native AutoByteus shell and background processes are detached. Native `BackgroundProcessManager.stopAll()` has no caller, and AGY daemons survive a SIGTERM to AGY (AR-003).
  - `ElectronApplication.stop()` returns early on re-entry, so the design's deferred-quit example exits early on a second quit (AR-002).

#### Prior Finding Resolution

None (first round).

- New or remaining finding IDs:
  - AR-001 (Low, Design Impact): map and disposition the application callers of `terminateAgentRun`/`stopAllAgentRuns`.
  - AR-002 (Medium, blocking): key the `will-quit` deferral to one memoized stop promise; add a re-entry test.
  - AR-003 (Medium, blocking; Unclear part): complete ASM-002 for native and AGY; disposition the native background processes (which have no stop owner), the forced path for detached groups, and the non-leader forced path (the Claude CLI survives EOF).
- Non-blocking notes:
  - N-1: scope the env flag (remove it from `process.env`; ESRCH; correct the rationale).
  - N-2: verify the updater path.
  - N-3: Terminate has no bound for a non-ending runtime.
  - N-4: second-signal behavior.
- Material classification changes: none. The classification stays Large/High.
- Recommended recipient: `/solution_designer`.
- Remaining risks or uncertainty: whether native and AGY interrupts end their turns, which determines how reachable the forced path is for them.
