# Handoff — task-copy-assignment-race-464, SR-001: Architecture Design Complete

- Result: `Architecture Design Complete`
- Package: `task-copy-assignment-race-464`; Project Task `autobyteus-464` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), FU-005 of autobyteus-447
- Requested by: `/project_task_manager`
- Classification: `task_size=Small`, `architectural_risk=High`: a concurrency-ordering change in the shared root lifecycle of all three root kinds, with low uncertainty (cause reproduced, fix prototyped under load)
- Route: `/software_engineering_team/architecture_reviewer` (rule for High risk)

## Request

- **Task:** when a Manager sets a copy's Task DONE and gives the same copy its next Task as parallel tool calls, the assignment is refused under load ("Task TeamRun … is already active or reserved"). Fix it by cause, so the assignment is delivered in both orders, or refused plainly. Cover it with a test that reproduces the race, and keep it simple. Done when finalized on the base branch; release only on the user's word.
- **User comment:** design first; choices within the direction are the team's; only product direction goes to the user. This is hardening, not urgent.

## Approval basis

Requirements approved by the Solution Designer within that direction; the user was informed in the Solution Designer's conversation on 2026-11-10. Design approval by the user is not required.

## Cause (reproduced, REPRO-01)

The root's lifecycle queue orders a copy's runtime transitions, but three steps run outside it:
- the DONE-triggered closure release of the copy;
- the existing-copy assignment's commit;
- reactivation's commit.

The failing order:
1. The assignment's queue step sees the copy open.
2. DONE commits and its release starts stopping the copy.
3. B commits.
4. The wake meets a copy that is still stopping, and the restore is refused.

## Design (design-spec D1–D5)

- **D1:** the hosted closure release runs as a queue step (`kind: "release"`) and re-checks at the head that the copy is still closed. Remote fencing stays outside the queue. While the root no longer admits commands, the release runs directly, as today.
- **D2, D3:** the assignment's and the reactivation's commits run inside their `reopen` step.
- **D4:** deterministic unit cases for the missing interleaving, which fail on base.
- **D5:** module docs.

There is no change to texts, results, the Task side or the registries. PROTO-01: the prototype passed twice under load, with both orders exercised (evidence; prototype reverted).

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-copy-assignment-race-464`
- Branch: `codex/task-copy-assignment-race-464`
- Base: `origin/personal` @ `c8f303af70`
- Install and `prebuild` done. Ticket docs and `docs/design-cases.md` (Case 1 addition) are uncommitted.

## User direction in force

A failure caused by the user's Codex usage limit is recorded, not fixed; others are fixed. No live Codex calls are planned (scripted AGY).

## Artifacts

- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-copy-assignment-race-464/tickets/in-progress/task-copy-assignment-race-464/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-copy-assignment-race-464/tickets/in-progress/task-copy-assignment-race-464/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-copy-assignment-race-464/tickets/in-progress/task-copy-assignment-race-464/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-copy-assignment-race-464/tickets/in-progress/task-copy-assignment-race-464/solution-revision-record.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-copy-assignment-race-464/tickets/in-progress/task-copy-assignment-race-464/evidence/REPRO-01-race-diagnostics.log`, `evidence/PROTO-01-queued-release-prototype.log`

## Next expected action

Independent architecture review of SR-001; then implementation per the configured route.

## Route record

- 2026-11-10: handoff rules applied; the High-risk rule matched → `/software_engineering_team/architecture_reviewer`.
