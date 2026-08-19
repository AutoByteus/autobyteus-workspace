# Team Run Offline Delete Action

## User Request

Investigate why an offline Classroom Simulation AgentTeam run has no visible delete action in the desktop UI. The screenshot shows multiple similarly titled Classroom Simulation runs; the focused `professor` member is offline, but the user cannot find a delete button for the run.

The ticket was initially bootstrapped from `origin/codex/agent-team-universal-task-delegation`. After that integration was finalized and promoted, the user explicitly requested deleting the old ticket worktree and re-bootstrapping the ticket from the refreshed `origin/personal` branch. The current authoritative ticket branch and worktree now use that promoted base.

## User Evidence

- Screenshot: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_8547bc07df6c42f5940cf357bfb54850/solution_designer_b648c1b32f264b3bbe09532b95c3ec33/context_files/ctx_26850298b17c__image.png`

## Requested Outcome

- Provide deletion for the whole persisted AgentTeam history run; configured member rows remain focus/navigation subjects and are not independently deleted.
- Resolve the observed mismatch in which the root TeamRun is active/resumable while the focused member is offline, causing the current UI to show only a small stop action and suppress permanent delete.
- Fix the exact shutdown defect reproduced from the user's sequence: when a member is waiting for tool approval, stop must cancel/interrupt that pending turn and complete without requiring the user to approve or deny the tool first.
- Define the smallest correct product fix: keep stop-only, expose permanent delete for active or inactive persisted TeamRuns, require explicit confirmation, reliably terminate an active exact root before deleting its exact stored history, and preserve truthful retry behavior on partial failure.

## User-Approved Runtime Reproduction

The user authorized an isolated experiment against the already-running Electron server. A newly allocated Classroom Simulation fixture reproduced `autoExecuteTools=false -> TOOL_APPROVAL_REQUESTED -> terminateAgentTeamRun`. The Team lifecycle stopped advertising active, but the termination mutation remained pending beyond 60 seconds until the experiment explicitly denied the pending tool for cleanup. A subsequent clean restore produced the supported state `root active + both configured members offline`, then successfully lazily activated the professor on new input. The exact fixture was terminated and deleted after evidence capture; neither reported run was mutated. See `runtime-reproduction-evidence.md`.
