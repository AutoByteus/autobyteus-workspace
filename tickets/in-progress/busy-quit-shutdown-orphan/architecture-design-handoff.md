# Architecture Design Complete — busy-quit-shutdown-orphan (SR-007)

From `/solution_designer`, 2026-10-30. Task `autobyteus-284` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`),
requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`). The SR-003 handoff
that stood in this file before is in git history.

## Result
- Classification: `Architecture Design Complete`. **task_size = Medium, architectural_risk = High.**
- Requirements: **Approved**. REQ-001 to REQ-005 in SR-002 (2026-10-05). DEC-005 (application terminate also
  interrupts, AC-008) and DEC-007 (desktop window stays 20 s) were approved in SR-007 on 2026-10-30: the user left both
  to the Solution Designer's recommendation. The Solution Designer decided DEC-006 (BEH-007, AC-009, AC-010) and AC-011
  within the direction.
- Design: `design-spec.md` SR-007 (SR-006 design with the two answers applied).
- Requested review round: **ARCH-REV-002**. ARCH-REV-001 (`design-review-report.md`) reviewed SR-003 at base
  `02d6ddf05`. Its AR-002 (one stop promise) is now satisfied by code another ticket shipped. AR-001 is answered by
  DEC-005. AR-003 is carried in the sweep design (native commands now have their own owner).

## Original request and goal
Quitting, updating or terminating while an agent is mid-turn must finish within a bound, leave no server, runtime CLI
or tool command behind, and a relaunch must start one server. This is step 0 of restart-and-resume (autobyteus-283):
a resume on top of a leftover server would duplicate work. The user decided on 2026-10-30 that the later resume after
an update is automatic (autobyteus-285, not this ticket).

## What changed since ARCH-REV-001 (read this first)
- The branch was rebased twice (docs only, clean). Base is now `origin/personal` @ `1a4453e553`.
- `backend-port-conflict-20261024` (merged 2026-10-26, `tickets/done/backend-port-conflict-20261024/` on `personal`)
  shipped:
  - `ServerProcessShutdown`: one owner for signals and the Windows IPC request, but with **no bound**;
  - `NativeCommandProcessScope`: native commands drained at `preClose`, 3 s;
  - `ApplicationShutdown`: memoized stop, deferred `will-quit`, the updater prepares through it;
  - `stopManagedBackend`: a 20 s window, then POSIX SIGKILL of the server PID only, or Windows `taskkill /f /t`.
- Still true: RC-1 (stop-now never interrupts) and RC-2 (no server bound). Also, the POSIX force orphans the Claude CLI
  (E9, E-A28).
- So the design is now:
  - **D1:** unchanged. Fence first in `AgentRunManager.terminateAgentRun` and `stopAllAgentRuns`.
  - **D2:** moved into the existing `ServerProcessShutdown`: a 10 s bound after the startup barrier, then always a
    process-tree sweep (new `src/shutdown/server-process-tree-sweep.ts`, AGY's selector moved to
    `src/utils/process-tree.ts`). Exit 1 and IPC `failed` when the bound expires or the sweep cannot confirm.
  - **D3:** reduced to the POSIX `BaseServerManager.forceStop` sweeping the server's tree.

## Review focus
1. D1 limited to the two stop-now entry points: does interrupt-first break any caller? The Team, Org, copy and
   Mixed-Team drain flows and `forceTerminate` are left alone (E-A2, E-A14).
2. D2 inside `ServerProcessShutdown`:
   - the bound starts after the startup barrier;
   - the sweep always runs, not only on expiry;
   - exit code and IPC result semantics stay consistent with backend-port-conflict's "never report unconfirmed cleanup
     as clean".
3. Sweep ownership next to `NativeCommandProcessScope`. The sweep is a net limited to descendants recorded before
   signalling, never the server's own group, never by port.
4. D3 desktop force order: SIGTERM the descendants, SIGKILL the server, wait 1.5 s, SIGKILL survivors. Does it fit
   inside the force confirmation budget (raise 2 s to 3 s if needed)?
5. The resume step's recording point: nothing is interrupted before `ServerProcessShutdown` cleanup starts, and
   shutdown never writes `terminatedAt` (BEH-007).

## Constraints
- Prove from a clean clone with isolated data (desktop `e2e` profile or a temporary data root). Never touch the user's
  installed app or data; any change to real data needs his approval and a backup first.
- Live Codex tests use **`gpt-6.1-terra`** (user, 2026-10-30), effort `medium`, with a throwaway `CODEX_HOME`. Its
  support in autobyteus-ts and the `TESTING.md` rule come from autobyteus-336 (another team copy); if that has not
  merged when validation runs, select it as the run's Codex model directly.
- No release unless asked. Finalize to `personal`.
- Ask `/project_task_manager` before removing the old worktree.

## Evidence status
- All SR-005/SR-006 findings are `Read` (E-A13 to E-A32). The root causes were reproduced and measured on 2026-10-05
  (E1–E9).
- Open measurements for validation: U-A1 (several busy Claude runs and the 10 s bound), U-A2 (CLI versions; the Claude
  CLI still survives EOF), U-A3 (Claude CLI tool cleanup inside the desktop force budget).

## Workspace
Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan`, branch
`codex/busy-quit-shutdown-orphan`, base `origin/personal` @ `1a4453e553`, target `personal`. Ticket folder
`tickets/in-progress/busy-quit-shutdown-orphan/`.

## Artifacts
- `requirements-doc.md` (Approved, SR-007)
- `investigation-notes.md` (E1–E9, E-A1 to E-A32)
- `design-spec.md` (SR-007)
- `solution-revision-record.md` (SR-001 to SR-007)
- `follow-ups.md` (FU-001 to FU-006; FU-006 already sent to `/project_task_manager` and absorbed into autobyteus-336)
- Prior review: `design-review-report.md`, `architecture-review-revision-record.md` (ARCH-REV-001, basis SR-003)

## Next expected action
Independent architecture review (ARCH-REV-002) of SR-007. On Pass, implementation per the design's change sequence.

## Route
The handoff rule "Architecture Design Complete with task_size=Large or architectural_risk=High" matches
(architectural_risk=High). Sent to `/software_engineering_team/architecture_reviewer` on 2026-10-30.
