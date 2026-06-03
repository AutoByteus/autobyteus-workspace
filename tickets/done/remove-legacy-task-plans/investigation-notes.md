# Investigation Notes

## Investigation Status

- Bootstrap Status: Completed
- Current Status: Investigation complete; design spec produced from findings
- Investigation Goal: Identify all legacy task-plan code paths in `autobyteus-ts` and frontend code, determine relationship to server dedicated tasks, and define a clean removal design without backward compatibility.
- Scope Classification (`Small`/`Medium`/`Large`): Large
- Scope Classification Rationale: Task-plan removal crosses active `autobyteus-ts` source/exports/tests/docs, server AutoByteus bridge and WebSocket protocol naming/tests/docs, and desktop/mobile frontend state/UI/protocol/tests.
- Scope Summary: Remove obsolete native task-plan model/API/UI and cut dedicated task-delegation transport over to explicit task-delegation naming while preserving server dedicated tasks, task-agent projections, team communication, and personal ToDo tools.
- Primary Questions Resolved:
  - Which `task plan` files/types/APIs in `autobyteus-ts` are legacy and safe to remove? See `autobyteus-ts` relevant files table; active native task-plan subsystem is legacy relative to server dedicated tasks.
  - Which frontend components/composables/queries render or depend on task plans? See frontend relevant files table; TeamOverviewPanel, TaskPlanDisplay, MobileActivityDigest, AgentTeamContext, streaming handler/protocol.
  - Does `autobyteus-server-ts` still expose any task-plan contract required by current dedicated task behavior? Dedicated task behavior uses `TeamRunEventSourceType.TASK_DELEGATION`; only WebSocket naming uses legacy `TASK_PLAN_EVENT`. Native `TASK_PLAN` bridge is separate and removable.
  - What validations should prove task-plan removal and dedicated-task continuity? Type/build/tests plus targeted source searches and dedicated task-delegation/task-agent projection tests.

## Request Context

User reports that server dedicated tasks are now the new way to manage tasks, while `autobyteus-ts` still contains legacy task-plan code. User expects legacy task-plan code to be removed and notes the frontend also likely has invalid `Task Plan` UI. Supplied screenshot shows the Team tab with a `Task Plan` section, `0 Tasks`, and `No task plan yet` above `Messages`.

Reference image path: `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_bf675026/solution_designer_42a08dbb368defa7/context_files/ctx_626bd0833afd__image.png`.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-legacy-task-plans`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-legacy-task-plans/tickets/done/remove-legacy-task-plans`
- Current Branch: `codex/remove-legacy-task-plans`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-legacy-task-plans`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch --all --prune` succeeded on 2026-06-03
- Task Branch: `codex/remove-legacy-task-plans`, created from latest `origin/personal`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Authoritative artifacts live in this dedicated worktree, not the user's shared `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` checkout. `node_modules` are absent in the dedicated worktree, so package validation requires install or workspace dependency setup before execution.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-03 | Command | `pwd`; `git rev-parse --is-inside-work-tree`; `git status --short --branch`; `git remote -v`; `git symbolic-ref refs/remotes/origin/HEAD` | Bootstrap repo and branch context | Initial checkout was `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` on `personal`, tracking `origin/personal`, behind by one commit; remote default resolves to `origin/personal`. | No |
| 2026-06-03 | Command | `git fetch --all --prune` | Refresh tracked refs before task worktree creation | Succeeded. | No |
| 2026-06-03 | Command | `git worktree add -b codex/remove-legacy-task-plans /Users/normy/autobyteus_org/autobyteus-worktrees/remove-legacy-task-plans origin/personal` | Create mandatory dedicated task worktree/branch | Succeeded; branch tracks `origin/personal`; worktree at commit `2e78e6b7`. | No |
| 2026-06-03 | Data | User-provided screenshot at `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_bf675026/solution_designer_42a08dbb368defa7/context_files/ctx_626bd0833afd__image.png` | Understand reported UI impact | Team tab contains obsolete-looking `Task Plan` panel with `0 Tasks` and `No task plan yet`. | No |
| 2026-06-03 | Command | `rg -n --hidden -S -i "task[ _-]?plan|TaskPlan|taskPlan|task_plan|TASK_PLAN" autobyteus-ts autobyteus-web autobyteus-server-ts -g '!node_modules/**' -g '!dist/**' ...` | Inventory task-plan references by project | Found active references across all three packages, including source, tests, docs, frontend UI, and server protocol. | No |
| 2026-06-03 | Command | `rg -l ...` file-list searches for `autobyteus-ts`, `autobyteus-web`, `autobyteus-server-ts` | Build exact file inventory | `autobyteus-ts`: 45 task-plan files including docs/tickets; active source/tests include native task-plan runtime. `autobyteus-web`: 37 files including UI/protocol/tests/localization. `autobyteus-server-ts`: 16 files including source/tests/docs. | No |
| 2026-06-03 | Code | `autobyteus-ts/src/task-management/*` | Inspect native task-plan model | `BaseTaskPlan`, `InMemoryTaskPlan`, `TaskStatus`, task schemas/events/converter/report are active and exported from root `src/index.ts`. ToDo tools are separate and active. | No |
| 2026-06-03 | Code | `autobyteus-ts/src/agent-team/bootstrap-steps/team-context-initialization-step.ts` | Inspect team runtime integration | Creates `TaskPlan`, attaches it to `context.state.taskPlan`, and bridges `TASK_PLAN_TASKS_CREATED` / `TASK_PLAN_STATUS_UPDATED` to team notifier. | No |
| 2026-06-03 | Code | `autobyteus-ts/src/agent-team/bootstrap-steps/task-notifier-initialization-step.ts`; `src/agent-team/task-notification/*`; `src/agent-team/context/agent-team-config.ts`; `src/agent-team/context/agent-team-runtime-state.ts` | Inspect native task-notification mode | `TaskNotificationMode` can enable `SystemEventDrivenAgentTaskNotifier`, which monitors `TaskPlan`, queues runnable tasks, and wakes agents with generic notification. Runtime state carries `taskPlan` and `taskNotifier`. | No |
| 2026-06-03 | Code | `autobyteus-ts/src/agent-team/streaming/agent-team-stream-events.ts`; `agent-team-stream-event-payloads.ts`; `agent-team-event-notifier.ts` | Inspect stream contract | Native team stream source type includes `'TASK_PLAN'`; payload validation imports `BaseTaskPlanEventSchema`; notifier publishes task-plan events. | No |
| 2026-06-03 | Code | `autobyteus-ts/src/cli/agent-team/state-store.ts`; `widgets/focus-pane.tsx`; `widgets/task-plan-panel.tsx`; `widgets/shared.ts` | Inspect native CLI UI | TUI stores `taskPlans`/`taskStatuses`, handles `TASK_PLAN` stream events, renders `TaskPlanPanel`, and defines task-status icons. | No |
| 2026-06-03 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/*`; `src/agent-tools/task-delegation/*`; `src/agent-team-execution/domain/team-run-event.ts` | Inspect dedicated task owner | Dedicated task delegation is server-owned (`TaskDelegationService` and task-delegation tools) and publishes domain events as `TeamRunEventSourceType.TASK_DELEGATION`. | No |
| 2026-06-03 | Code | `autobyteus-server-ts/src/services/agent-streaming/team-run-event-websocket-message-mapper.ts`; `src/services/agent-streaming/models.ts` | Inspect WebSocket mapping | Dedicated `TASK_DELEGATION` domain events are currently flattened into legacy `ServerMessageType.TASK_PLAN_EVENT`; native `TASK_PLAN` domain events also map to `TASK_PLAN_EVENT`. | No |
| 2026-06-03 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-event-processor.ts` | Inspect native AutoByteus bridge | Imports `TaskPlanEventPayload` from `autobyteus-ts` and maps native `event_source_type === "TASK_PLAN"` into server `TeamRunEventSourceType.TASK_PLAN`. | No |
| 2026-06-03 | Code | `autobyteus-web/types/agent/AgentTeamContext.ts`; `types/taskManagement.ts`; `services/agentStreaming/handlers/teamHandler.ts`; `TeamStreamingService.ts`; `protocol/messageTypes.ts` | Inspect frontend state/protocol | Frontend stores `taskPlan` and `taskStatuses`; `handleTaskPlanEvent` maps `TASKS_CREATED` / `TASK_STATUS_UPDATED`; `TeamStreamingService` routes `TASK_PLAN_EVENT` to that handler before other routing. | No |
| 2026-06-03 | Code | `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue`; `TaskPlanDisplay.vue`; `localization/messages/*/workspace*.ts` | Inspect desktop UI | `TeamOverviewPanel` renders collapsible `Task Plan` section, task count, and empty copy. `TaskPlanDisplay` renders table. Localization contains task-plan keys. | No |
| 2026-06-03 | Code | `autobyteus-web/components/mobile/MobileActivityDigest.vue` | Inspect mobile UI | Mobile digest defaults to `tasks` filter and renders `Task plan` card from `activeTeamContext.taskPlan`/`taskStatuses`. | No |
| 2026-06-03 | Command | `pnpm -C autobyteus-ts exec tsc -p tsconfig.build.json --noEmit`; `pnpm -C autobyteus-web exec vitest ...` | Probe validation availability | Failed immediately: `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "tsc" not found`; `vitest` also not found. Dedicated worktree lacks installed `node_modules`. | Yes; implementation/validation should install deps or use project setup. |
| 2026-06-03 | Command | Count searches: `rg -l ... autobyteus-ts/src autobyteus-ts/tests autobyteus-ts/examples`; web source/test/localization; server source/test | Quantify active footprint | `autobyteus-ts` active source/test/example task-plan count: 38 files. `autobyteus-web` source/test/localization count: 30 files. Server source/test count: 12 files. | No |
| 2026-06-03 | Doc | `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md`; `docs/agent_team_design.md`; `docs/agent_team_streaming_protocol.md` | Inspect active docs | Docs explicitly say native internal `TaskPlan` and `TaskNotificationMode` are retained. Must be updated. | No |
| 2026-06-03 | Doc | `autobyteus-server-ts/docs/modules/agent_team_execution.md`; `agent_tools.md`; `codex_integration.md`; `autobyteus-web/docs/agent_execution_architecture.md` | Inspect server/web docs | Server docs describe dedicated task delegation but still state events flatten to WebSocket `TASK_PLAN_EVENT`; AutoByteus native path described as task-plan-aware. Web docs mention native task-plan updates. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary:
  - Native runtime: `AgentTeamBootstrapper` runs `TeamContextInitializationStep`, which creates a `TaskPlan` and bridges task-plan events to `AgentTeamExternalEventNotifier`.
  - Server dedicated tasks: model tool call enters `TaskDelegationToolService` / `TaskDelegationService`, publishes `TeamRunEventSourceType.TASK_DELEGATION`, then WebSocket mapper emits `TASK_PLAN_EVENT`.
  - Frontend: `TeamStreamingService.dispatchMessage` handles every `TASK_PLAN_EVENT` by calling `handleTaskPlanEvent`; desktop Team tab reads `AgentTeamContext.taskPlan` and renders `TaskPlanDisplay`.
- Current execution flow:
  - Legacy native task-plan flow: `TaskPlan.addTasks/updateTaskStatus -> EventType.TASK_PLAN_* -> AgentTeamExternalEventNotifier.handleAndPublishTaskPlanEvent -> AgentTeamStreamEvent(event_source_type: 'TASK_PLAN') -> server AutoByteus event processor -> TeamRunEventSourceType.TASK_PLAN -> TASK_PLAN_EVENT -> frontend handleTaskPlanEvent -> AgentTeamContext.taskPlan/taskStatuses -> TaskPlanDisplay/MobileActivityDigest`.
  - Dedicated task-delegation flow: `delegate_tasks/mark_task_completed/mark_task_failed/accept_task -> TaskDelegationService/Ledger -> TaskDelegationEventPublisher -> TeamRunEventSourceType.TASK_DELEGATION -> TASK_PLAN_EVENT with event_type TASK_DELEGATION_* -> frontend handleTaskPlanEvent ignores non-legacy event_type`.
- Ownership or boundary observations:
  - Dedicated task ownership is already server-side; native `autobyteus-ts` task-plan ownership is now a competing legacy owner.
  - Frontend stores task-plan state even though dedicated task-agent projection and team communication are separate newer surfaces.
  - Server transport name `TASK_PLAN_EVENT` conflates native task plans and dedicated task delegation.
- Current behavior summary: The product visibly exposes obsolete task-plan UI and keeps source-level support for a parallel task-plan state machine even though the authoritative model-facing workflow is dedicated task delegation.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / Refactor / Behavior Change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure, Boundary Or Ownership Issue, Shared Structure Looseness
- Refactor posture evidence summary: Clean removal is required. Hiding the UI alone would leave native task-plan state/events/bootstrap and legacy transport naming active; keeping server `TASK_PLAN_EVENT` would preserve a legacy protocol wrapper around dedicated tasks.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User request and screenshot | Legacy `Task Plan` UI remains visible in Team tab. | Frontend UI/state must be removed, not just collapsed by default. | No |
| `autobyteus-ts/src/task-management/*` | Native task-plan classes/events/converters are active and exported. | Legacy source must be decommissioned from package API. | No |
| `TeamContextInitializationStep` / `TaskNotifierInitializationStep` | Team bootstrap creates a `TaskPlan` and optional notifier. | Team lifecycle includes obsolete task owner; bootstrap sequence must be shortened. | No |
| Server mapper | Dedicated task events flatten to `TASK_PLAN_EVENT`. | Transport shape preserves legacy name and should be cut over to `TASK_DELEGATION_EVENT`. | No |
| Frontend `AgentTeamContext` / `TeamOverviewPanel` / `MobileActivityDigest` | Frontend persists and renders task-plan state in desktop and mobile. | UI/state removal crosses both desktop and mobile. | No |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/task-management/base-task-plan.ts` | Abstract native task plan and `TaskStatus` enum | Core legacy model | Remove; dedicated task status is server-owned. |
| `autobyteus-ts/src/task-management/in-memory-task-plan.ts` | Native in-memory task ledger and event emission | Parallel task ledger | Remove. |
| `autobyteus-ts/src/task-management/task.ts` | Task schema and compatibility preprocessors | Legacy task shape (`task_name`, `assignee_name`, dependencies) | Remove with task-plan model. |
| `autobyteus-ts/src/task-management/events.ts` | Task-plan event schemas | Feeds native stream validation | Remove. |
| `autobyteus-ts/src/task-management/converters/task-plan-converter.ts` | Task plan to status report mapping | Legacy polling/report shape | Remove. |
| `autobyteus-ts/src/task-management/schemas/task-definition.ts` / `task-status-report.ts` | Legacy task tool/report schemas | Not used by dedicated tasks | Remove. |
| `autobyteus-ts/src/task-management/todo*.ts` and `tools/todo-tools/*` | Personal ToDo list/tooling | Active non-team task-management feature | Keep. |
| `autobyteus-ts/src/agent-team/bootstrap-steps/team-context-initialization-step.ts` | TaskPlan creation and event bridge | File responsibility is only legacy task-plan setup | Remove file and default step. |
| `autobyteus-ts/src/agent-team/bootstrap-steps/task-notifier-initialization-step.ts` | Optional task notifier setup | Depends on `TaskPlan` | Remove file and default step. |
| `autobyteus-ts/src/agent-team/task-notification/*` | Native task activation policy/notifier/mode | Obsolete relative to server task-agent activation | Remove folder and tests. |
| `autobyteus-ts/src/agent-team/context/agent-team-config.ts` | Team config | Reads `TaskNotificationMode` from env | Remove task-notification config property/validation. |
| `autobyteus-ts/src/agent-team/context/agent-team-runtime-state.ts` | Runtime state | Carries `taskPlan` and `taskNotifier` | Remove fields/imports. |
| `autobyteus-ts/src/agent-team/streaming/*` | Native team stream contracts/notifier | Includes `TASK_PLAN` source/payload | Remove task-plan source and notifier method. |
| `autobyteus-ts/src/events/event-types.ts` | Shared event enum | Includes `TASK_PLAN_TASKS_CREATED`, `TASK_PLAN_STATUS_UPDATED` | Remove enum values; update generic event tests to use non-task event types. |
| `autobyteus-ts/src/cli/agent-team/state-store.ts` | Native TUI state | Stores/render task plans | Remove task-plan state and event handling. |
| `autobyteus-ts/src/cli/agent-team/widgets/task-plan-panel.tsx` | Native TUI task-plan panel | Legacy UI | Delete. |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-event.ts` | TeamRun event source union | Has `TASK_PLAN` and `TASK_DELEGATION` | Remove `TASK_PLAN`; keep `TASK_DELEGATION`. |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-event-processor.ts` | Native AutoByteus team stream adapter | Imports and maps native `TaskPlanEventPayload` | Remove native task-plan branch/import. |
| `autobyteus-server-ts/src/services/agent-streaming/models.ts` | WebSocket server message enum | Has `TASK_PLAN_EVENT` | Replace with `TASK_DELEGATION_EVENT`. |
| `autobyteus-server-ts/src/services/agent-streaming/team-run-event-websocket-message-mapper.ts` | Domain event to WebSocket mapping | Maps both native task-plan and dedicated task delegation to `TASK_PLAN_EVENT` | Remove native task-plan mapping; map dedicated task to `TASK_DELEGATION_EVENT`. |
| `autobyteus-web/types/agent/AgentTeamContext.ts` | Frontend team context | Contains `taskPlan`/`taskStatuses` | Remove fields/imports. |
| `autobyteus-web/types/taskManagement.ts` | Frontend task-plan data types | Only legacy task-plan UI/handler uses it | Delete. |
| `autobyteus-web/services/agentStreaming/handlers/teamHandler.ts` | Team-specific stream handlers | Contains task-plan mapper/normalizer | Remove task-plan handler; optionally add dedicated task-delegation handler that only projects task-agent identity. |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | Team WebSocket dispatch | Routes `TASK_PLAN_EVENT` before task-agent/member routing | Remove route; add `TASK_DELEGATION_EVENT` route if server sends explicit event. |
| `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | Desktop Team tab | Renders task-plan section and messages section | Remove task-plan section; messages becomes sole Team tab content. |
| `autobyteus-web/components/workspace/team/TaskPlanDisplay.vue` | Task-plan table | Legacy UI | Delete. |
| `autobyteus-web/components/mobile/MobileActivityDigest.vue` | Mobile summary filters | Defaults to `tasks`, renders task-plan card | Remove tasks filter/card; default to messages or activity. |
| `autobyteus-web/localization/messages/*/workspace*.ts` | Localization | Contains task-plan keys | Remove unused keys and regenerated counterparts. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-03 | Probe | User screenshot inspection | Desktop Team tab shows `Task Plan`, `0 Tasks`, `No task plan yet` above Messages. | Confirms visible frontend cleanup target. |
| 2026-06-03 | Probe | `pnpm -C autobyteus-ts exec tsc -p tsconfig.build.json --noEmit` | Failed because `tsc` command not found in dedicated worktree. | Install/setup dependencies before implementation validation. |
| 2026-06-03 | Probe | `pnpm -C autobyteus-web exec vitest ...` | Failed because `vitest` command not found in dedicated worktree. | Install/setup dependencies before frontend validation. |

## External / Public Source Findings

Not applicable. All relevant facts came from local repository source and user-provided screenshot.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: For implementation validation, package dependencies must be installed/available in the dedicated worktree. Live dedicated-task E2E remains opt-in as documented in server tests.
- Required config, feature flags, env vars, or accounts: None for source investigation. `AUTOBYTEUS_TASK_NOTIFICATION_MODE` exists in current code and should be removed.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch --all --prune`; `git worktree add`; source searches.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. Native task-plan source in `autobyteus-ts` is active runtime code, not purely historical.
2. The legacy model-facing task-plan tools are already removed from `autobyteus-ts/src/task-management/tools/task-tools/index.ts`, but the underlying task-plan model/runtime/stream/CLI remain.
3. Server dedicated task delegation already has a clear service/ledger/tool owner. The design should preserve that owner rather than recreating task state in `autobyteus-ts` or the frontend.
4. Server WebSocket `TASK_PLAN_EVENT` is a legacy compatibility name for both native task-plan events and dedicated task-delegation events. Clean removal should introduce `TASK_DELEGATION_EVENT` and remove `TASK_PLAN_EVENT`.
5. Frontend desktop and mobile both render task-plan-derived UI. Removing only `TeamOverviewPanel` would leave mobile and protocol/state drift.
6. Personal ToDo tools share the `task-management` folder but are not the team task-plan subsystem. They remain active through tool registration and `TODO_LIST_UPDATE` streams.

## Constraints / Dependencies / Compatibility Facts

- No backward compatibility wrappers, aliases, or dual-path behavior should remain for removed task-plan flows.
- Server dedicated task events must continue to reach frontend/task-agent projections. If the transport is renamed to `TASK_DELEGATION_EVENT`, frontend protocol and tests must be updated in lockstep.
- Historical archived tickets may mention old task-plan behavior; active code/docs/tests should not depend on it.
- Dependency installation is required before executable validation in the dedicated worktree.

## Open Unknowns / Risks

- External consumers may import removed `autobyteus-ts` task-plan paths or expect `TASK_PLAN_EVENT`; breaking them is expected but may need release-note documentation.
- A future dedicated-task ledger UI may be desired, but it should be server-dedicated-task-owned and is outside this removal.

## Notes For Architect Reviewer

- The key design decision is clean-cut removal plus transport rename. Hiding the UI or leaving `TASK_PLAN_EVENT` as a dedicated-task alias would preserve the legacy path and contradict the stated no-compatibility policy.
- Confirm whether server WebSocket `TASK_DELEGATION_EVENT` rename belongs in this same task. The design includes it because it is the remaining active task-plan transport contract.
