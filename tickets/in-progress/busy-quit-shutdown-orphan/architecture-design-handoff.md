# Architecture Design Complete — busy-quit-shutdown-orphan (SR-003)

- Result: `Architecture Design Complete`. Package `busy-quit-shutdown-orphan`, revision SR-003. Requirements are
  Approved in SR-002 (the user agreed to the recommendations: DEC-001 cancel queued input; DEC-002 10 s / 15 s;
  DEC-003 and DEC-004 not in this ticket).
- Classification: **task_size=Large, architectural_risk=High.** Server run-termination semantics, the server process
  exit and the Electron quit lifecycle, with process-group signalling. Concurrency- and process-ownership-sensitive.
- From `/solution_designer`, 2026-10-05.

## Origin
- `/api_e2e_engineer`, at the user's direction: fix "quitting the app while an agent is busy leaves the embedded server
  and the agent's processes running". The user asked for experiments first.
- Experiments E1–E9 (live Codex and Claude; Electron 42 quit probe) established RC-1 to RC-5. See
  `investigation-notes.md` and `evidence/`.

## Root causes (short)
- RC-1: Terminate and shutdown never interrupt a busy standalone run; they wait for the turn. This also affects the
  user's Terminate (E8).
- RC-2: server shutdown is unbounded.
- RC-3: Electron's `will-quit` is not deferred, so main exits at once and the SIGKILL escalation never runs (E6).
- RC-4: runtime CLIs clean their tool commands on SIGTERM; Claude does not on EOF.
- RC-5: a second server on the same data (the guard is deferred, FU-2).

## Design
- D1: fence and interrupt first at `AgentRunManager.terminateAgentRun` and `stopAllAgentRuns` (concurrent fence).
- D2: `server-process-shutdown.ts` with a 10 s bound; a forced group SIGTERM → 1.5 s → SIGKILL only if
  `AUTOBYTEUS_SERVER_PROCESS_GROUP_LEADER=1`.
- D3: detached spawn plus the env flag; `stopServer` waits 15 s, then group escalation; deferred `will-quit`; Windows
  gets the same 15 s.

## Review focus
- Is limiting D1 to the two stop-now entry points correct, given the Team, Org and copy drain-and-cancel flows?
- The process-group approach versus a per-runtime registry (the Claude CLI is spawned inside the SDK).
- The env-flag contract for group leadership.
- `will-quit` deferral safety (updates, re-entry, the 8 s `before-quit` timer).

## Artifacts
- /Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/requirements-doc.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/investigation-notes.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/design-spec.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/solution-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/evidence/ (E1–E9 logs, `e6-electron-quit/`, the temporary probe and diagnostics as `.txt`/`.diff`)
- Original report: `/Users/normy/autobyteus_org/api-e2e-reports/busy-quit-shutdown-orphan/`
- Follow-up candidates: `/Users/normy/autobyteus_org/solution-designer-reports/busy-quit-followup-candidates.md`
- Prior independent review artifacts: N/A (first review).

## Workspace
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan`.
- Branch `codex/busy-quit-shutdown-orphan` (local).
- Base `origin/personal` @ `02d6ddf05`. Target `personal`.
- Dependencies are installed, shared packages built and Prisma generated.

## Route
