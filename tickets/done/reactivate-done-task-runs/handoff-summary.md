# Handoff Summary — reactivate-done-task-runs

## Status

- Delivery state: **DR-001: waiting for your verification.** Nothing has been pushed, merged or released yet.
- Classification (unchanged): `task_size=Large`, `architectural_risk=High`, reviewed route.

| Stage | Revision | Result |
| --- | --- | --- |
| Requirements | SR-002 | User-approved 2026-10-07 |
| Design | SR-002 | Done |
| Architecture review | ARCH-REV-002 | Pass |
| Implementation | IR-001 (`3394e7078`) | Done |
| Code review | CRR-001 | Pass, 9.4/10 |
| API/E2E | API-REV-001 | Pass, 96% confidence |
| Test-code review | CRR-002 | Pass, no findings |
| Docs sync | DR-001 | Updated: 5 docs and 2 test comments (`docs-sync-report.md`) |

| Item | Value |
| --- | --- |
| Worktree | `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs` |
| Ticket branch | `codex/reactivate-done-task-runs` (local, not pushed) |
| Finalization target | `origin/personal` (bootstrap) |
| Validated candidate | `3394e7078` (implementation) + local delivery checkpoint `dfe83c96d` (API/E2E tests, `TESTING.md`, review and validation artifacts) |
| Integrated base | `origin/personal@cfeda548b`, re-fetched at delivery start. The base had not advanced and the branch was already current, so no merge was needed. |
| Post-integration check | Not required (no new base commits). Delivery smoke on the docs-synced tree: 4 files / 37 tests pass. `node --check` passes on both browser probes. |
| Uncommitted (until finalization) | Docs-sync edits and delivery artifacts |
| Never committed | `autobyteus-application-backend-sdk/dist/`, `autobyteus-application-sdk-contracts/dist/` (build output) |

## What Changed (for you)

1. After DONE, the delegating agent can continue with the **same** worker:
   - it first sets the Task back to TODO or IN_PROGRESS with `create_or_update_task`;
   - then it calls `send_message_to(target_agent_run_id=<run ID from delegate_task>)`. For a Team copy, that is the coordinator's run ID.
2. The worker is restored with its conversation and receives the message. The tool result ends with "… was reactivated."
   - A Team copy comes back as the same TeamRun with the same members.
3. The worker's row reappears in the Workspaces tree live, and stays after reload and restart, for Agent, Team and Org roots. Helpers the worker had started stay closed and hidden.
4. The app never changes the Task status. These are refused, with guidance, and change nothing:
   - a message while the Task is DONE;
   - a message from anyone other than the assigner;
   - a message to a Team member that is not the coordinator.
5. `delegate_task` results carry `target_kind` (`agent` or `team`). The tool texts explain reopen-then-message and no longer say DONE is final.
6. No migration. Entries closed by earlier versions can be reactivated.

## Verification Evidence

- **Desktop journey** (`api-e2e-evidence/user-journey/`): an isolated desktop build of this worktree with real Claude, driven like a user.
  - The flow covered: delegate, DONE, reopen and message (the row is back about 5 s later, and the worker used round-1 facts), the same for a Team copy, DONE again, an app restart, reactivation after the restart, and a second restart.
  - All steps passed.
- **Server E2E** (`task-reactivation-root-visibility.e2e.test.ts`, gated): Agent/Team/Org matrix, refusals, DONE-vs-reactivation race, and a live Claude case. 5/5 pass. The Projects E2E folder ran 31 pass + 1 gated skip.
- **Browser probe** `test:e2e:task-closure-tree`: BR-001..BR-011 all pass, including live, reload and two real backend restarts.
- **Live mixed runtimes** (LM Studio, Codex, Claude): 4/4 pass.
- Unit, integration, contract and web suites pass. The only failures are pre-existing and fail identically on base `cfeda548`.

## Suggested Checks For You

1. Ask an agent to delegate work, then ask it to mark the Task DONE. The worker row disappears.
2. Ask the agent for another round with the same worker. It should set the Task to IN_PROGRESS, then message the worker. The row comes back, and the worker remembers round one.
3. Optional: restart the app. The reactivated row stays visible, and anything still closed stays hidden.

## Residual Risks / Non-goals

- AC-009 (assignment never started) and the `TASK_EXECUTION_CONTEXT_UNAVAILABLE` / `TASK_REACTIVATION_STOP_PENDING` refusals are tested at unit level only.
- O-1 (informational, for the Solution Designer): if a DONE from another root lands right after a reactivation commits, the reply says "(its Task work is open again)". That is already out of date when it arrives. Messaging again gives the correct DONE hint.
- Team and Org roots were not driven in the desktop journey; the browser probe and server E2E cover them.
- `teamExecutionViewState.ts` is at 494 non-empty lines, close to the 500 limit.
- Out of scope: reactivating from the UI, reopening helpers, any automatic status change.
- Follow-up outside this repository: update the DONE wording in the agent repository's `project-task-management` skill.

## Pending After Your Verification

1. Archive the ticket to `tickets/done/`.
2. Commit and push the ticket branch, then merge into `origin/personal` and push.
3. Run a release only if you ask for one (for example "release a new beta").
4. Clean up the worktree and the branch.
