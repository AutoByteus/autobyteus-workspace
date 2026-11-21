# Investigation Notes: cross-node-task-close-591

## Bootstrap

- **Task:** `autobyteus-591` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`, read with `get_project_task` on 2026-11-21. Its context file is the founder's phone screenshot of docker-8001.
- **Worktree:** `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-task-close-591`.
  - Branch: `codex/cross-node-task-close-591`.
  - Base: `origin/personal` at `7591aa307f` (v1.5.14-beta.5's record).
  - Finalization target: `personal`.
- **Authorities read** (phase 1 gate): the `solution-designer` skill (updated 2026-11-21) and `references/requirements-engineering.md` (updated), with `templates/requirements-doc-template.md`.
  - Earlier in this conversation: `finding-the-cause.md`, `ticket-scope.md`, `DESIGN.md`, `design-principles.md`, and `data_migration_guideline.md`.
  - `collaboration_model.md`: §1 and §2.3 earlier; §4 now.
- **Lessons applied** (`reflections/lessons.md`): read the code behind every premise, for each kind (agent and team, local and peer).

## Sources inventory

| Source | Purpose |
| --- | --- |
| The Task's screenshot (`ctx_…Screenshot_2026-11-21-10-09-22-395_org.autobyteus.mobile.jpg`) | docker-8001's run list 12 minutes after the close |
| `~/.autobyteus/server-data/logs/server.log` (Mac, read-only) | What the Mac did at the close |
| `autobyteus-server-ts/docs/design/collaboration_model.md` §2.3 (CM-7, CM-10 … CM-12) and §4 | The governing contract |
| The 380 worktree (`/Users/normy/autobyteus_org/autobyteus-worktrees/temporary-task-copy-end-380/…/requirements-doc.md`, `Ready for Approval`) | The rules to align with |

## Findings

| ID | Finding | How established |
| --- | --- | --- |
| F-1 | **Root cause.** On DONE or CANCELLED, the delegating node stops each closed run through its local Stop, but skips any run on a peer: `projects/runtime/task-execution-resource-release.ts:17-21` logs `TASK_AGENT_RESOURCE_FENCED_REMOTE` and returns. Its comment: "A run on a peer node is fenced by its closed Task, not stopped (its node owns it, CM-10)". Nothing is sent to the peer. | Read |
| F-2 | **It happened that way on the founder's Mac.** `server.log:3191044-3191048` holds `TASK_AGENT_RESOURCE_FENCED_REMOTE` for `ad_hoc_task_889b2aa6-…`, `execution: { teamRunId: 'marketing_team_a36d5425…' }`, `nodeId: 'srv_ibJio6eH…'`. No stop request follows. | Read (the founder's log) |
| F-3 | **The contract names this as a step not yet built.** `collaboration_model.md` §4: "Later steps add … the remaining lifecycle control across the link (stop on Task closure, reactivation)". CM-7: "Closing a Task stops its runs that have no other open Task, through each run's ordinary Stop". CM-10: the node that runs a delegated run owns its lifecycle (idle shutdown, wake on message, stop). | Read |
| F-4 | **A stop through the link exists.** The owner command `terminate` (`peer-client.ts:254` `ownerCommand`; `peer-gateway.ts:192-195, 286-288` → `runViews.command`) stops a whole team run (`team-run-agent-access.ts:97-98` → `terminateTeamRun`) or a standalone run's root Stop (`standalone-run-agent-access.ts:75`). It is admitted only for runs the caller's delegation started (the gateway's link check, `peer-gateway.ts` `admit`). | Read |
| F-5 | **The receiving node's backstop doesn't cover a busy run.** A delegated team run, peer-started included (`root-team-run.ts:164`, `delegatedFrom`), has an idle shutdown with a 10 min default grace (`task-execution-idle-shutdown-setting.ts`). It is cancelled while any agent is `running`/`initializing` and re-armed only on a quiet signal (`delegated-team-idle-shutdown.ts:38-46`). | Read |
| F-6 | **The screenshot's colours** (`autobyteus-web/utils/agentActivityPresentation.ts:27-33`): blue means running or background tasks running; green means idle; grey means offline. In the screenshot, the Marketing Team and its "marketing content creator" are blue, and "computer use operator" is green. So one agent was still running, the team was never quiet, and the idle shutdown never fired (F-5). | Read |
| F-7 | **Where a peer-started run shows on the receiving node.** `run-history/services/top-level-run-rule.ts`: a run is a child row only when a local Task entry names it and its delegating run is stored there. A peer-started run has no local Task entry, so it is always a top-level row on its node, stopped or not. docker-8001's own PM's delegations are child rows of that PM. | Read |
| F-8 | **autobyteus-380** (another team, `Ready for Approval`): its REQ-002 says an automatic close "does exactly what an explicit close does: the copies stop and leave the sidebar". REQ-004 reopens a closed temp Task when its delegator messages a run of it. REQ-005 (if the founder approves) releases a run the user typed into to him instead of stopping it. Nothing in 380 is about remote runs. | Read |

## Unknowns for the architecture phase

- **U-1:** whether any Task outside the delegating node (another node, or a Task local to the peer) can name a peer-started run. If one can, "its last open Task" can't be decided by the delegating node alone.
- **U-2:** how the delegating node learns that a peer is reachable again (the existing peer status, or `RETRY_PEERS` in `RunStatusService`), and what survives its restart.
- **U-3:** whether the link's `terminate` path, or a dedicated "Task closed" request, fits the closure rule of CM-7 and the reopen race (CR-461-001's `kept_open`).

## Supplement inventory

None.
