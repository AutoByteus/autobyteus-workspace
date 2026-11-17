# Handoff — autobyteus-524 round 1 (`native-follow-ups-524`): FU-003

- Status: `Architecture Design Complete` — `task_size: Small`, `architectural_risk: Low` → direct implementation route (handoff rule "Small or Medium and Low"). Independent architecture review not required; implementation self-checks and executable validation still apply.
- Package: `native-follow-ups-524`, revision `SR-001`
- Task: `autobyteus-524`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`; requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), dispatched on the founder's word
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/native-follow-ups-524`, `codex/native-follow-ups-524`; base `origin/personal` at `ff13782f36`; finalization target `origin/personal`
- Release: only on the founder's word; the Task says FU-003 "may ship in the next beta"

## Request

The founder (dispatch comment of 2026-11-17): "Why do we have a deadline so strange? I think make the deadline longer." Direction: decide the number by measurement under load, check the scope's other short limits, no retry unless needed, clear failure message.

## What to build (design-spec.md)

- Name the native command scope's time limits in `command-deadline.ts`: start 30 s, observation/retirement 10 s, stop confirmation 30 s; the graces (500 ms, 500 ms, 1 s) and the 3 s shutdown budget named with their current values.
- Remove the 500 ms cap on single `ps` and WSL-kill runs: bounded by the step's deadline.
- Executor: start deadline `min(start limit, call timeout)`; failure text `Command did not start within N s: <reason>`.
- Unit tests AC-002…AC-005; AC-001 with the burst probe before/after; `autobyteus-ts` tests; both typechecks.

## Evidence

Under load 133–184 on this Mac: today 60/60 and 200/200 burst calls fail (RF-001); healthy starts take up to 18.4 s in a 200-burst (RF-004); with the candidate values 0/520 fail and every output is complete (RF-005).

## Artifacts

- `/Users/normy/autobyteus_org/autobyteus-worktrees/native-follow-ups-524/tickets/in-progress/native-follow-ups-524/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/native-follow-ups-524/tickets/in-progress/native-follow-ups-524/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/native-follow-ups-524/tickets/in-progress/native-follow-ups-524/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/native-follow-ups-524/tickets/in-progress/native-follow-ups-524/solution-revision-record.md`
- `evidence/run-bash-burst-probe.mjs`, `evidence/measure-command-start-handshake.mjs`

## Open risks

ASM-001: WSL not measured. Later rounds of this Task (FU-004…FU-008) are not part of this round.
