# Solution Revision Record — busy-quit-shutdown-orphan

## SR-001 — 2026-10-05 — Root-cause experiments and first requirements baseline (Ready for Approval)
- Trigger: a new-ticket request from `/api_e2e_engineer` (run `api_e2e_engineer_59b3926abc024b0ca092e1888f2beb5e`),
  at the user's direction, to experiment first and then design.
- Prior status: N/A. Current status: Ready for Approval.
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan`, branch
  `codex/busy-quit-shutdown-orphan`, base `origin/personal` @ `02d6ddf05`.
- Experiments E1–E9 (live Codex and Claude, Electron 42 quit lifecycle). Root causes:
  - RC-1: termination waits for the turn and never interrupts; this also affects user Terminate;
  - RC-2: shutdown is unbounded with no runtime teardown;
  - RC-3: Electron quit does not wait, and SIGKILL escalation is dead;
  - RC-4: runtime cleanup differs (Claude survives EOF; Codex interrupt leaves commands running);
  - RC-5: a second server on the same data root.
- The brief's hypothesis was corrected: Codex does end the turn on interrupt (E2); the hang exists because
  termination never sends the interrupt.
- IDs: BEH-001–006, UC-001–004, SCN-001–005, REQ-001–005, AC-001–007, QR-001–003.
- Open: DEC-001 (queued input on Terminate), DEC-002 (bounds 10 s / 15 s), DEC-003 (Codex Stop gap, out of scope),
  DEC-004 (data-root guard, deferred).
- Approval: pending. Design: not started.

## SR-002 — 2026-10-05 — Requirements approved
- Trigger: after clarifying DEC-004, the user said "Okay, I'll agree with your suggestions. Basically, we do for number
  one and number two, right? … number one and number two are what we will be done in this ticket."
- Result: DEC-001 (cancel queued input) and DEC-002 (10 s / 15 s) are applied in this ticket. DEC-003 (Codex Stop gap)
  and DEC-004 (data-root guard) are not done here and are recorded as follow-up candidates. REQ-001 to REQ-005 are the
  approved scope.
- Status: Approved. Next: architecture design.

## SR-003 — 2026-10-05 — Architecture design complete
- Evidence added: E-A1 to E-A7 (graceful drain is intended for the Team, Org and copy flows; fence reuse; runtime
  spawn ownership; desktop spawn and stop; server shutdown; non-desktop group signalling).
- Design (`design-spec.md`):
  - D1: the stop-now entry points (`terminateAgentRun`, `stopAllAgentRuns`) fence and interrupt first, using the
    existing root-shutdown fence (which cancels queued input, matching DEC-001). `prepareTermination` is unchanged.
  - D2: `server-process-shutdown.ts`, a 10 s bound. A forced exit signals the process group (SIGTERM → 1.5 s →
    SIGKILL) only when the desktop made the server the group leader.
  - D3: the desktop spawns the server detached (group leader, with an env flag); `stopServer` waits 15 s, then
    escalates on the group; `will-quit` is deferred until the server stop completes; Windows gets the same 15 s
    (tree kill already).
- Persisted data: Not Affected. Classification: `Large` / `High`.
- Follow-up candidates recorded: `/Users/normy/autobyteus_org/solution-designer-reports/busy-quit-followup-candidates.md`
  (FU-1 = DEC-003, FU-2 = DEC-004).
- Requirements: unchanged (SR-002).

## SR-004 — 2026-10-05 — Design revision for ARCH-REV-001 (Fail, Design Impact) and requirement delta DEC-005
- Trigger: ARCH-REV-001 Fail. AR-001 (Low: application callers unmapped); AR-002 (Medium, blocking: quit deferral not
  keyed to one stop promise); AR-003 (Medium, blocking: REQ-003 coverage outside the server's group). Report:
  `design-review-report.md`.
- Evidence added: E-A8 to E-A12 (application callers; native foreground abort and uncalled background `stopAll`; AGY's
  process-table selector; process-tree reachability; Electron re-entry).
- Design changes:
  - AR-001: application callers mapped (DS-001b; the application-scope `stopAll` in DS-002).
  - AR-002: memoized single stop promise; corrected example and timer wording; re-entry tests; updater verification.
  - AR-003: replaces the env-flag/process-group forced path with an always-run **process-tree sweep**, reusing AGY's
    selector moved to `utils/process-tree.ts`. It covers native foreground and background processes, AGY daemons and
    the non-leader case. The desktop sweeps a wedged server the same way. Detached spawn and the env flag are dropped.
  - Residuals: Windows server-side sweep; native background processes outliving **Terminate** (FU-3, unchanged
    behavior).
- Requirement delta: **DEC-005** (application-initiated terminate also interrupts; proposed AC-008). The requirements
  status is Ready for Approval for this delta; REQ-001 to REQ-005 remain approved (SR-002).
- Classification: Large / High (unchanged). Routing: held for the user's DEC-005 decision, then
  `/architecture_reviewer`.

## SR-005 — 2026-10-26 — Rebase on current personal and re-check against today's code (autobyteus-284)
- Trigger: Task `autobyteus-284` from `/project_task_manager` (run
  `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`): finish and ship this branch; rebase, re-check the design,
  ask the user DEC-005.
- Prior status: requirements Ready for Approval (DEC-005), design SR-004 Ready pending DEC-005. Current status: the same,
  plus DEC-006 resolved by the Solution Designer.
- Workspace: the five docs-only commits rebased cleanly onto `origin/personal` @ `d74f75a51a` (from `02d6ddf05`).
- Evidence added: E-A13 to E-A24 (all `Read`), unknowns U-A1 (several busy Claude runs and the 10 s bound) and U-A2
  (CLI versions; the Claude EOF behavior).
- Result of the re-check: D1, D2 and D3 stand. Factual deltas: refreshed line numbers; today's AGY helper names and its
  EPERM contract; the server now owns the Claude CLI process (`ClaudeSdkProcessOwner`); application workers are covered
  by the sweep; the `start-shutdown` IPC, `restart-server` and `reset-server-data` entries listed under D3.
- Requirements changes within the direction (DEC-006, Solution Designer): BEH-007 preserved (shutdown never records
  `terminatedAt`; autobyteus-283 step 1 relies on it), AC-009 (relaunch after quit gives one server; the Task's
  "Done when"), AC-010. DEC-004 unchanged (force-killed app: follow-up).
- Design spec: Change Scope section added; SR-005 re-check section; file mapping adds the AGY test move, the AGY test
  mock and the AGY doc line; validation guidance adds AC-009, AC-010, U-A1, U-A2 and clean-clone proof with isolated data.
- Follow-ups: `follow-ups.md` created (FU-001 to FU-003 carried from the 2026-10-05 candidates; FU-004 the stop grace
  value for autobyteus-283 FU-002).
- Approval: DEC-005 asked of the user again (2026-10-26). REQ-001 to REQ-005 remain approved (SR-002).
- Classification: Large / High (unchanged). Routing after DEC-005: `/architecture_reviewer` (ARCH-REV-002 of SR-004 +
  SR-005).

## SR-006 — 2026-10-30 — Second re-check after backend-port-conflict landed (autobyteus-284)
- Trigger: the user: "do the analysis again, the origin personal branch has been updated a lot". The solution-designer
  skill was also updated (2026-10-27: feasibility evidence per requirement; challenge requirements the evidence
  contradicts); its changed files were re-read.
- Prior status: requirements Ready for Approval (DEC-005), design SR-004/SR-005 Ready pending DEC-005. Current status:
  requirements Ready for Approval (DEC-005, DEC-007), design SR-006 Ready pending both.
- Workspace: six docs-only commits rebased cleanly onto `origin/personal` @ `1a4453e553` (421 commits after
  `d74f75a51a`).
- Evidence added: E-A25 to E-A32 (all `Read`), U-A3. SR-005's E-A16 and E-A21 superseded.
- Main finding: `backend-port-conflict-20261024` (merged 2026-10-26) shipped `ServerProcessShutdown` (no bound),
  `NativeCommandProcessScope` (native commands drained at shutdown), `ApplicationShutdown` (quit waits for one memoized
  stop; updater prepares through it) and `stopManagedBackend` (20 s window, POSIX force = SIGKILL of the server PID only;
  Windows IPC + `taskkill /f /t`). RC-1 and RC-2 still hold; RC-3 is solved except the POSIX force, which orphans the
  Claude CLI (E9).
- Requirements changes: problem statement and BEH-003/BEH-004 current behavior updated; Feasibility evidence column
  added to the requirements table (template change); AC-004 bound follows DEC-007; AC-011 added (desktop force leaves no
  child, within REQ-003/REQ-004, Solution Designer). New `Needs user` decision **DEC-007**: the approved 15 s desktop
  window versus the shipped 20 s (recommended: keep 20 s).
- Design changes: D1 unchanged. D2 moves into the existing `ServerProcessShutdown` (10 s bound after the startup
  barrier, then always a sweep; exit 1 and IPC `failed` on expiry or unconfirmed sweep); new
  `src/shutdown/server-process-tree-sweep.ts`; the AGY helper still moves to `src/utils/process-tree.ts`. D3 shrinks to
  the POSIX `forceStop` tree sweep and the window constant; memoized stop and `will-quit` deferral dropped (shipped).
  Docs to update named with lines.
- Follow-ups: FU-003 updated (native background now stopped at shutdown, still not on Terminate); FU-004 value 20 s;
  FU-005 added (two process-table readers).
- For the Project Task Manager: autobyteus-283's FU-001 (Windows graceful stop) is answered in code by
  backend-port-conflict's IPC shutdown request (E-A30), not verified on Windows.
- Classification: **Medium / High** (was Large / High; D3 shrank). Routing after DEC-005 and DEC-007:
  `/architecture_reviewer` (ARCH-REV-002 of SR-006). ARCH-REV-001's AR-002 is satisfied by shipped code; AR-001 and
  AR-003 dispositions carry over.

## SR-007 — 2026-10-30 — DEC-005 and DEC-007 approved; live Codex test model (autobyteus-284)
- Trigger: after the DEC-005 explanation (a custom application ending a busy agent), the user answered: "What is your
  suggestion? Yeah, I think you understand our code base much more than I do now. I guess you can make reasonable
  suggestions." He gave both decisions to the recommendations.
- Approval: **DEC-005 = yes** (application-initiated terminate interrupts; AC-008 in scope; REQ-001 text names it);
  **DEC-007 = keep 20 s** (REQ-004, AC-004, SCN-003 and QR-002 say 20 s; DEC-002's desktop value replaced).
  Requirements status: Approved (SR-002 + SR-007).
- Also from the user (2026-10-30): restart-and-resume after an update is automatic, no human (recorded in the
  requirements doc for autobyteus-285; sent to `/project_task_manager`, who recorded it on 285 and 305); live Codex
  tests use `gpt-6.1-terra` (design-spec Guidance; FU-006 for the project-wide `TESTING.md` rule, sent to
  `/project_task_manager`).
- Design: SR-006 with the answers applied: DS-001b in scope; the 20 s window unchanged, so D3 is only the POSIX
  `forceStop` sweep. A note keeps the resume step's recording point (nothing interrupted before
  `ServerProcessShutdown` cleanup starts).
- Classification: Medium / High (unchanged). Routing: `/architecture_reviewer`, review round ARCH-REV-002 on SR-007.
