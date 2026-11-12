# Investigation Notes — phone-background-tasks-473 (autobyteus-473)

## Meta

- Package `phone-background-tasks-473`; Project Task `autobyteus-473`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-background-tasks-473`, `codex/phone-background-tasks-473`; base `origin/personal` @ `931a1feeb6` (2026-11-12); finalization target `origin/personal`
- Authorities read: requirements-engineering, ticket-scope (re-read after the 2026-11-11 skill update), finding-the-cause, handoff

## Source Log

| Source | Finding | Established |
| --- | --- | --- |
| `autobyteus-web/components/mobile/views/MobileActivity.vue` (29 lines) | The phone's Activity lists only `agentActivityStore.getActivities(runId)` (tool calls); no background tasks | Read |
| `autobyteus-web/components/progress/BackgroundTaskPanel.vue:118-131`, `composables/useBackgroundTaskPanelView.ts` | Desktop panel: `useBackgroundTaskPanelView(runId, expanded)` asks GraphQL `agentBackgroundTaskView`; `snapshot` runtimes are polled every 2 s; `event-stream` runtimes read `agentBackgroundTaskStore` | Read |
| `autobyteus-web/stores/agentBackgroundTaskStore.ts` | Live tasks per run, fed by `BACKGROUND_TASK_UPDATED` stream events (`services/agentStreaming/handlers/backgroundTaskHandler.ts`); "Not persisted: the list starts empty after a reload" | Read |
| `services/agentStreaming/teamStreamDtoAdapters.ts:86,162`, `agentStreamMessageProjector.ts:206` | The same stream services (agent and team streams) run on the phone, so the phone's store is fed too | Read |
| Server `agent-execution/backends/*/…-agent-run-backend.ts` `backgroundTaskInspection` | `event-stream`: Claude (`claude-agent-run-backend.ts:26`), AutoByteus (`autobyteus-agent-run-backend.ts:110`), Antigravity (`agy-agent-run-backend.ts:36`); `snapshot`: Codex (`codex-agent-run-backend.ts:50`); `unsupported`: ACP runtimes (`acp-agent-run-backend.ts:67`) | Read |
| `services/agent-streaming/agent-team-stream-handler.ts:139-150`, `team-execution-view-projector.ts`; `agent-stream-handler.ts` | On connect a stream sends `CONNECTED`, the execution view snapshot and the lifecycle; no background tasks. An `event-stream` run's task that started before the viewer connected is not shown until it changes (usually when it ends) | Read |
| `agent-execution/backends/claude/session/claude-background-task-registry.ts:84-97,238-249` | The Claude registry keeps the live view (`view: Map<taskId, AgentBackgroundTask>`) | Read |
| `agent-execution/backends/agent-run-backend.ts:66-73`, `domain/agent-run-termination.ts:81` | `hasRunningBackgroundTasks()` exists on every backend (ACP false); "Read only by the idle-shutdown quiet check": the shown status is the turn lifecycle | Read |
| User data (read-only): `~/.autobyteus/server-data/memory/agent_teams/software_engineering_team_90d2d82493b440c8807db86dfe28c6b8/api_e2e_engineer_41e8df546bee40d8b3e59b3b742fd86c/raw_traces_active.jsonl` | The reported run ("The full phone probe (API-05) is running now and takes about 25 minutes") is a Software Engineering Team member on `claude_agent_sdk`; it started background jobs with Bash `run_in_background: true` (11 times) | Read |

## Behaviors

| ID | Current | Evidence |
| --- | --- | --- |
| BEH-001 | Phone Activity shows no background tasks | above |
| BEH-002 | Event-stream runtimes (Claude, AutoByteus, Antigravity): a viewer that connects after a task started does not see it (desktop after a reload too) | above |
| BEH-003 | The run's shown status reads "Idle" while a background task runs (status = turn lifecycle, all runtimes) | above |

## Scope judgement

- BEH-002 is this ticket: without it the user's case (opening the phone while a job runs) shows nothing.
- BEH-003 is its own Task (proposed to the PM): consistent "busy" needs the node to publish it with the run status for every runtime and every list (run lists, team member lists, desktop and phone), and touches how messages to an agent are handled; the wording and meaning are the user's decision.

## Status while a background task runs, and autobyteus-448 (PM question, 2026-11-12)

| Source | Finding | Established |
| --- | --- | --- |
| `agent-execution/domain/agent-run.ts:196` `getStatusSnapshot()`; backends' lifecycle | Every runtime's run status is its **turn** lifecycle (`initializing`/`running` while a turn runs, `idle` after it ends). A background task that outlives its turn does not change it on any runtime; each backend reports the task separately (`hasRunningBackgroundTasks()`: Claude, Codex, AutoByteus, Antigravity; ACP runtimes report none) | Read |
| `agent-execution/domain/agent-run-termination.ts:81` | Only the idle-shutdown check reads `hasRunningBackgroundTasks()` (a run with a running task is not shut down for idleness) | Read |
| `restart-resume/busy-run-recorder.ts:36-46` (autobyteus-285) | At a graceful shutdown the node records only runs whose status is `initializing` or `running`; the restart notice goes only to those. An agent idle with a running background task is not recorded, so it gets no message after the restart | Read |

- **Cause of autobyteus-448's gap:** yes, the recorder's rule "status is initializing or running". The direct fix belongs to 448: also record a run whose backend `hasRunningBackgroundTasks()` (and tell it its background tasks were stopped by the shutdown). It does not need the shown status to change.
- **Shown/stored status reading "busy":** a product decision for its own Task. Changing the status itself would change message handling (an idle agent takes a message and starts a turn at once, so it can answer while its job runs; a busy one queues it) and idle shutdown, on every runtime. The alternative is to keep the status as the turn and publish "background task running" with it, shown as "Busy" (or "Idle · background task") in every list, desktop and phone.

## Architecture evidence (2026-11-12)

| Source | Finding |
| --- | --- |
| `autobyteus-server-ts/src/agent-execution/domain/agent-background-task.ts` | Runtime-neutral `AgentBackgroundTask` (`taskId`, `kind`, `description`, `command`, `status`, `summary`, `startedAt`); events carry a complete snapshot of one task, applied as an upsert |
| `agent-execution/backends/claude/session/claude-background-task-registry.ts:97,238-249` | Claude keeps the live view `view: Map<taskId, AgentBackgroundTask>` (running and ended until cleared) |
| `agent-execution/backends/antigravity/stream/agy-background-task-monitor.ts:30-76` | Antigravity keeps `running: Map<number, AgentBackgroundTask>` (running only) |
| `autobyteus-ts/src/tools/terminal/background-process-manager.ts:136` `list()`; `agent-execution/backends/autobyteus/autobyteus-background-task-reporter.ts` `toAgentBackgroundTask` | AutoByteus: the manager lists every task with its end; the reporter maps one to `AgentBackgroundTask` |
| `agent-execution/domain/agent-background-task-view.ts` | `AgentBackgroundTaskInspection` = snapshot (Codex rows: `kind: 'shell'`, `command: null`, basename description) / event-stream / unsupported |
| `api/graphql/types/agent-background-task-view.ts:54-75` | The resolver returns the run's inspection; `AgentBackgroundTaskEventStream` has only `agentRunId` |
| `autobyteus-web/types/backgroundTask.ts:9-20`; `stores/agentBackgroundTaskStore.ts` | The web `BackgroundTask` has the same fields as the domain type; the store upserts by `taskId` |
