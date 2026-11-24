# Investigation Notes — autobyteus-638 Find and wake a user's sleeping runs

- Ticket: autobyteus-638 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), from `/project_task_manager`
- Worktree: `autobyteus-worktrees/idle-run-discovery-638`, branch `codex/idle-run-discovery-638`, base `origin/personal` `c1147c8917`
- Date: 2026-11-24. Owner: Solution Designer. Code facts read at HEAD of this branch.

## 1. What happened (the incident, measured)

Sources: docker-8001 = local container `autobyteus-server-0` (server 1.5.14), read with `docker exec` (read-only). The Project Task Manager on this Mac: `~/.autobyteus/server-data/memory/agents/project_task_manager_7c8dce0c4a8b44f88e776a83809dee03/raw_traces_active.jsonl`.

| Fact | Evidence |
| --- | --- |
| The two grey Project Task Managers (44m, 6h) are runs **a person started** (no `delegatedFrom` in their `run_metadata.json`), not archived, not stopped (`terminatedAt: null` in `run_history_index.json`) | `project_task_manager_2f41a1df…` (created 2026-10-12, workspace `autobyteus-marketing-workspace`), `project_task_manager_5def73d0…` (created 2026-11-04) |
| Their last activity was before the server restarted | Last memory write of 2f41a1df: 08:39 UTC. Server log: `Server listening on 0.0.0.0:8000` at **2026-11-24T10:56:01Z**, followed by `Restart resume after the update to 1.5.14: 1 resumed, 0 skipped, 0 failed` (server.log lines 758108, 758286) |
| Grey dot = `offline` (not loaded), green = `idle` (live) | `autobyteus-web/utils/agentActivityPresentation.ts:31,33` |
| At 14:42:36 UTC the Project Task Manager on this Mac called `list_running_agents({ node: "docker-8001" })` and got `{}` | raw trace rows 851–852 (`tool_result.output: {}`) |
| One minute later it delegated a new Project Task Manager there: the 8m duplicate | `project_task_manager_e141756c…` has `delegatedFrom`; its messages appear only in the Mac PM's log; created 14:43:16Z |

**Cause.** The 10-minute idle shutdown did **not** stop the user's Project Task Managers:

- It applies only to delegated runs: `standalone-agent-run-root.ts:116-120` creates `DelegatedRunIdleShutdown` only when `options.delegatedFrom` is set, and `root-team-run.ts:197` does the same for Teams.
- The user's runs went offline because the node restarted for the update to 1.5.14.
- After a restart only *busy* runs are resumed (`docs/modules/restart_resume.md` "Who is told"); an idle run stays unloaded until its next input.
- An unloaded run is not "running" (`running-agents.ts:8-12`), so `list_running_agents` leaves it out (`running-agents-listing.ts:36-45`), and `send_message_to` refuses it "not running" (CM-13).

The founder's distinction still holds; only the cause of the sleep is the restart, not the timer. The same gap opens after any restart, crash or update, and on every node.

## 2. Current rules (code and contract)

- `list_running_agents` (autobyteus-492):
  - lists the Agent and Team runs a person started that are live now, except the caller;
  - entry `{kind, name, address?, agent_run_id | team_run_id + team_coordinator_agent_run_id, workspace?, state: running|idle|error, started_at?, project?, node?}`;
  - filters `address`, `state` (running|idle);
  - opt-in through the definition's `toolNames` (`docs/modules/agent_tools.md:201-253`; `running-agent-entry.ts`; `running-agents-listing.ts`).
- `send_message_to` by run ID (CM-13): reaches only a live agent, never wakes. A stopped run is woken only by a **related** run (shared open Task, or the assigner; CM-5). A run whose Tasks are all closed refuses everything except its assigner's reopen (`TASK_AGENT_RESOURCE_CLOSED`).
  - 492 DEC-003, decided by the Solution Designer "within the direction": "Waking spends tokens on a run a person or a Task closure stopped."
- How a run comes to be offline, and what is recorded:

| Kind of run | How it goes offline | Recorded |
| --- | --- | --- |
| Started by a person | Node restart / update / crash (not resumed when idle) | nothing (`terminatedAt` stays null) |
| Started by a person | The person presses Stop | `terminatedAt` (`agent-run-service.ts:160,173`; `standalone-agent-run-lifecycle-service.ts:137`) |
| Started by a person | Archived | `archivedAt` |
| Delegated, open Task | Idle shutdown after the grace (default 10 min) | nothing; any related message restores it |
| Delegated, all Tasks closed | Task closure stops it | `terminatedAt` (`agent-run-service.ts:328`) and the delegating node's closed state (CM-6, CM-10) |

  `terminatedAt` is cleared when a run is restored (`agent-run-history-catalog-service.ts:193`).
- Restore machinery exists: `CollaborationRootResolver.resolveOrRestore(root)`, used today by inbound remote messages and Task-related wake (`docs/modules/restart_resume.md` TS Source).
- Run recency exists: `lastActivityAt` = newest memory file of the run (`RunLastActivityReader`, `agent-run-history-index-types.ts:19-20`).

## 3. Volume (measured, read-only script `/tmp/probe-638/count.js`)

Runs a person started that are not archived, not stopped, and would therefore be "sleeping" when not live:

| Node | Agent runs (by last activity) | Team runs | Total stored |
| --- | --- | --- | --- |
| docker-8001 | 4 (<1 d: 1, 1–7 d: 1, 7–30 d: 2); all 4 are Project Task Managers | 1 (1–7 d) | 108 agent rows, 77 team rows |
| This Mac | 2 (<1 d: 1, 1–7 d: 1) | 0 | 510 agent rows, 572 team rows |

People archive what they finish, so the list stays small and needs no cap or window. It may hold several runs of one definition (4 Project Task Managers on docker-8001, in different workspaces), so entries need what tells them apart: workspace, project and the last activity.

## 3a. Memory of a loaded run (measured on docker-8001, read-only `ps`/`docker stats`, 2026-11-24)

- Container `autobyteus-server-0`: 6.7 GiB used of 15.35 GiB (most of it Chromium for computer use).
- Live runtime processes, children of the server process:
  - `/usr/bin/claude … --resume=<session>`: 274 MB and 270 MB RSS. The first resumes `0d7cc700…`, the platform run of `project_task_manager_2f41a1df…` (it is live again since the founder used it);
  - `agy --conversation …`: 330 MB.
  - Total: 3 processes, 851 MB.
- A loaded idle run of an external runtime therefore costs a runtime process of about 270–330 MB. Bringing back only the runs that were loaded keeps memory where it was before the stop. Bringing back every unarchived run a person started would load runs untouched for weeks (2 of the 4 on docker-8001 are 7–30 days old).

## 3b. Architecture-phase code facts (2026-11-24)

- Startup order: `server-runtime.ts:212-216`, then `:240-241`.
  1. `takePreviousSession()` before `recorder.startSession()`.
  2. Cleanup: `recorder.record()` first, then `app.close()`.
  3. After listen and `recoverAfterListen`: `void restartResumer.resumeAfterRestart(previousSession)`.
- `BusyRunRecorder` (`restart-resume/busy-run-recorder.ts`):
  - checks every 2 s and rewrites `busy-runs.json` only on change;
  - its final write runs at the graceful stop;
  - it records only busy runs (`busyStatusOf(run).busy`).
- `RestartResumer.resumeOne` (`restart-resume/restart-resumer.ts`) restores a root without posting: `rootResolver.resolveOrRestore(root)`, then `root.ensureAgentReady()` for a standalone host. This is the path that runs in production after an update (docker-8001 log line 758285).
- Root history states: `present | terminated | archived | gone`, from the catalogs (`compositions/restart-resume-composition.ts:39-45`).
  - `terminatedAt` is written only by a person's Stop (`agent-run-service.ts:160,173`; `standalone-agent-run-lifecycle-service.ts:137`) and by Task closure (`:328`).
  - A shutdown does not write it: docker-8001's Project Task Managers have `terminatedAt: null` after the restart.
- Who counts as a run a person started: `RunOwnAgentsReader.listingFactsOf(root).startedByPerson` (no `delegatedFrom`, no `containedIn`; `run-history/store/run-own-agents-reader.ts:162-174`). `RunningAgentsListing` uses it.
- Is the entry agent live: `RunningAgents.statusesOf(root)` and `teamCoordinatorOf(teamRunId)` (synchronous; `running-agents.ts`).
- A Team member made ready without input:
  - `ConfiguredAgentExecutionHandle.getOrCreateAgentRun()` is public (`configured-agent-execution-handle.ts:134`);
  - `FlatTeamExecutionManager` holds the handles (`getDirectAgent`, `flat-team-execution-manager.ts:105-130`);
  - `RootTeamRun` has no `ensureAgentReady` yet. The one `TeamRunBackend` is `flat-team-run-backend.ts`.

## 4. Options

| # | Option | Verdict |
| --- | --- | --- |
| A | **List sleeping runs and wake them on a message.** A run a person started that is not live, not stopped by a person and not archived is listed as `sleeping` with its last activity; `send_message_to` by its run ID restores it with its conversation and delivers. Delegated runs unchanged | **Recommended**; it is the founder's direction |
| B | After every restart, restore all runs that were live before | Rejected. Every restart starts all those runtimes (Claude/Codex processes, memory) whether used or not; a crash still leaves runs unloaded. Hides the state instead of handling it |
| C | Keep the list live-only, add a separate "sleeping" query or tool | Rejected. Two lists for one question ("whom can I message?"); agents would still spawn duplicates when they forget the second call |
| D | Only change the tool description ("delegate only if …") | Rejected. The agent cannot find the run ID at all |

Name: with A the tool lists agents that are not running, so `list_running_agents` says less than it does (Principle 15). Renaming it means a small data migration of the agent definitions that select it (`toolNames`; opt-in tool, autobyteus-492, one week old). This is a founder decision.

## 5. Supplement inventory

| Artifact | Purpose | Status |
| --- | --- | --- |
| `/tmp/probe-638/count.js` | Read-only volume count (§3) | Scratch; removed at cleanup |
| investigation-notes.md, requirements-doc.md, solution-revision-record.md | This ticket | Current |
