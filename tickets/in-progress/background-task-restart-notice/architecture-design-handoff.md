# Architecture Design Handoff — autobyteus-448 `background-task-restart-notice` (part 1)

- Result: `Architecture Design Complete` (part 1 of 2), `task_size: Medium`, `architectural_risk: High` → independent architecture review
- From: Solution Designer, 2026-11-17; solution revision `SR-004` (SR-002 reviewed in ARCH-REV-001, SR-003 passed ARCH-REV-002)
- Project Task: `autobyteus-448` (merged with 481), Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`; requested by `/project_task_manager` for the user
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-restart-notice`, branch `codex/background-task-restart-notice`, base `origin/personal` @ `4cbf9e78812f0c6d063d243e84ac37a1b2119fe9` (verified current 2026-11-17); finalization target `origin/personal`
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-restart-notice/tickets/in-progress/background-task-restart-notice/`

## Request

After any restart (automatic update, plain restart, crash), tell every agent that was mid-turn or waiting on a background task, with a short friendly reminder, so it checks and continues. Part 2 (show such agents as "Background task running") follows in this ticket after part 1 is delivered.

## Approval basis (the user, 2026-11-17, in the Solution Designer conversation)

- DEC-003: a short reminder, no task list ("the agent is very smart, it just needs a reminder").
- DEC-001 B: after an update, agents are woken; after a plain restart or an unexpected stop, the reminder is given with the agent's next input. This replaces the user's 285 DEC-001 (update only) and 285 DEC-003 (idle not recorded).
- DEC-004 (part 2): "Background task running", styled active, no Stop; DEC-005: messages delivered at once.

## Round 2 (SR-003)

ARCH-REV-001 answered: AR-001 one delivery path through the reminder store (wake claims; input first carries it; exactly once); AR-002 durable take before `setCleanup`, `record()` inert before `startSession()`, waits for an in-flight tick, compares without `recordedAt`; AR-003 requirement text aligned with DEC-003. Details: `solution-revision-record.md` SR-003.

## Round 3 (SR-004)

From validation (code review CRR-002, API/E2E F-1, evidence RR-02): after an unexpected stop, native background commands survive the server (a crash runs no cleanup) while the reminder said the restart stopped them. The user decided DEC-008 (2026-11-17): option (a), a cause-specific background-task line for `unexpected_stop` (requirements DEC-008 text; design-spec Concrete Examples). Only `restart-notice.ts` text changes; update and restart wording unchanged. Stopping survivors at the next start stays follow-up FU-004 (the user declined it here). Validation reruns RR-02 with the new line.

## Package

`requirements-doc.md` (Approved), `investigation-notes.md`, `design-spec.md` (Ready, part 1, SR-003), `solution-revision-record.md` (SR-003).

## Review focus

1. The live busy-run record (2 s ticks, writes on change) and its crash semantics (no `shutdownAt` = unexpected stop).
2. Startup order: previous record taken before listen, then the session starts.
3. The cause rule and the reading of a record written by the previous release (tolerant reader; update entries woken).
4. The new notice source (`RestartReminderService`) in the studio's slot after the runtime hand-over; persistence until delivered; replace rule.
5. Codex coverage only at a graceful stop; ACP none.

## Open risks

Codex after a crash not covered; ACP background tasks not reported; agents nobody talks to after a plain restart wait until someone does (the user's choice B).

## Follow-ups

None.

## Next expected action

Architecture review; findings return to the Solution Designer; a pass goes to implementation.

## Route

Rule "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/architecture_reviewer` (the address the handoff rules return; sent 2026-11-17).
