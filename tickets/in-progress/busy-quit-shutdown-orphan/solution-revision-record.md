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
