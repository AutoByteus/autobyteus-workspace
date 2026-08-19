# Team Run Offline Delete Action

## User Request

Investigate why a Classroom Simulation AgentTeam history run can show every member as `Offline` while the parent TeamRun still behaves as active and therefore shows no permanent-delete action. Preserve the established safe workflow: an active TeamRun exposes **Stop**, Stop fully terminates the runtime while retaining all history, and only the resulting inactive history row exposes a separate **Delete** action with permanent-deletion confirmation.

The ticket was initially bootstrapped from `origin/codex/agent-team-universal-task-delegation`. After that integration was finalized and promoted, the user explicitly requested deleting the old ticket worktree and re-bootstrapping from refreshed `origin/personal`. This ticket worktree/branch is the current authority.

## User Evidence

- Screenshot: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_8547bc07df6c42f5940cf357bfb54850/solution_designer_b648c1b32f264b3bbe09532b95c3ec33/context_files/ctx_26850298b17c__image.png`

## Requested Outcome

- Preserve whole-TeamRun actions on the parent row; member rows remain focus/navigation subjects and are never independently deleted.
- Fix Stop so it cancels/interruption-resolves pending tool approval, stops every materialized configured/delegated/nested execution, and reaches a truthful inactive state without requiring Approve or Deny.
- Stop retains the exact TeamRun history and never initiates permanent deletion or opens a deletion confirmation.
- While the root remains active or Stop is pending/failed, Delete is not offered.
- After complete Stop, the same exact history row becomes inactive and offers a separate Delete action. Delete then opens permanent-deletion confirmation and, when confirmed, removes only that exact stored TeamRun.
- Remove the ticket WIP's added active-row Delete and combined “stop and permanently delete” workflow; those were based on a superseded interpretation and are not approved product behavior.

## User-Approved Runtime Reproduction

The user authorized an isolated experiment against the already-running Electron server. A newly allocated Classroom Simulation fixture reproduced `autoExecuteTools=false -> TOOL_APPROVAL_REQUESTED -> terminateAgentTeamRun`. The Team lifecycle stopped advertising active too early, but the termination mutation remained pending beyond 60 seconds until the experiment explicitly denied the pending tool for cleanup. A clean restore then produced the supported state `root active + both configured members offline` and successfully lazily activated the professor on new input. The exact fixture was terminated and deleted after evidence capture; neither reported production run was mutated. See `runtime-reproduction-evidence.md`.
