# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Server-owned dedicated task delegation is now the authoritative task-management model for team work. The legacy native `TaskPlan` model still exists in `autobyteus-ts` as task-plan state/classes/events/notification bootstrap, the server still carries a native task-plan bridge and legacy `TASK_PLAN_EVENT` transport naming, and the frontend still renders/stores a Team-tab `Task Plan` panel. Remove the legacy task-plan model and UI cleanly so dedicated task delegation remains the only team-task workflow.

## Investigation Findings

- `autobyteus-ts` has an active native task-plan subsystem, not only stale docs:
  - `src/task-management/base-task-plan.ts`, `in-memory-task-plan.ts`, `task.ts`, `events.ts`, `converters/task-plan-converter.ts`, task schemas/report schemas, and task-plan tests.
  - `src/agent-team/bootstrap-steps/team-context-initialization-step.ts` creates `TaskPlan` and bridges `TASK_PLAN_*` events into the team stream.
  - `src/agent-team/bootstrap-steps/task-notifier-initialization-step.ts` plus `src/agent-team/task-notification/*` implement `TaskNotificationMode` and generic task wake-up.
  - `src/agent-team/streaming/*` includes `event_source_type: 'TASK_PLAN'` and task-plan payload validation.
  - The CLI TUI stores/renders task plans via `src/cli/agent-team/state-store.ts`, `widgets/focus-pane.tsx`, and `widgets/task-plan-panel.tsx`.
- `autobyteus-server-ts` dedicated task delegation already has a distinct owner (`TaskDelegationService`, `TeamRunEventSourceType.TASK_DELEGATION`, `src/agent-tools/task-delegation/*`), but current WebSocket mapping flattens dedicated task events into legacy `ServerMessageType.TASK_PLAN_EVENT`.
- `autobyteus-server-ts` still imports native `TaskPlanEventPayload` from `autobyteus-ts` and maps native `event_source_type === 'TASK_PLAN'` through the AutoByteus team backend.
- `autobyteus-web` still has legacy task-plan state and UI:
  - `AgentTeamContext.taskPlan` / `taskStatuses` and `types/taskManagement.ts`.
  - `handleTaskPlanEvent(...)` maps `TASKS_CREATED` / `TASK_STATUS_UPDATED` into team context state.
  - `TeamOverviewPanel.vue` renders the screenshot-visible `Task Plan` section and `TaskPlanDisplay.vue` table.
  - `MobileActivityDigest.vue` has a task-plan filter/card/summary.
- Personal ToDo tools in `autobyteus-ts` (`ToDoList`, `create_todo_list`, `add_todo`, `get_todo_list`, `update_todo_status`) are separate from team task plans and should not be removed in this scope.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / Refactor / Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure, with Boundary Or Ownership Issue and Shared Structure Looseness
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed now
- Evidence basis: Dedicated task delegation is server-owned, while `autobyteus-ts` still owns a parallel native task-plan state/event/notifier subsystem and the frontend renders task-plan state. Server transport naming also reuses `TASK_PLAN_EVENT` for dedicated task-delegation events.
- Requirement or scope impact: This must be a clean-cut removal/refactor across `autobyteus-ts`, server bridge/protocol, and frontend state/UI rather than a cosmetic hide of the panel.

## Recommendations

- Remove native task-plan source, tests, exports, event types, team-stream source type, bootstrap steps, notification mode, and TUI rendering from `autobyteus-ts`.
- Keep personal ToDo functionality in `autobyteus-ts`; do not remove or rename ToDo tools as part of this task.
- Remove server native task-plan event bridging and rename the dedicated-task WebSocket message from legacy `TASK_PLAN_EVENT` to explicit `TASK_DELEGATION_EVENT`; do not emit both names.
- Remove frontend task-plan state, handler, display component, Team-tab section, mobile task-plan filter/card, localization keys, and tests expecting task-plan UI.
- Preserve and validate dedicated task delegation, task-agent projection/activity, team messages, and team activity streams.

## Scope Classification (`Small`/`Medium`/`Large`)

Large

Rationale: the change crosses package exports and tests in `autobyteus-ts`, server domain-to-WebSocket mapping/tests/docs, and desktop/mobile frontend state/UI/protocol/tests. The implementation is deletion-heavy, but it cuts through shared type surfaces and stream contracts.

## In-Scope Use Cases

- `UC-001` A native `autobyteus-ts` team starts/runs without creating, storing, streaming, or notifying through a native task plan.
- `UC-002` A server-managed team delegates dedicated tasks through `delegate_tasks`, task-agent `mark_task_completed` / `mark_task_failed`, and delegator `accept_task` without any legacy task-plan model or WebSocket name.
- `UC-003` The desktop frontend Team tab no longer displays a `Task Plan` section or empty-state copy.
- `UC-004` The mobile activity digest no longer displays a task-plan filter/card/summary.
- `UC-005` Existing team messages, task-agent activity projection, member status/activity, and personal ToDo tools keep working.

## Out of Scope

- Redesigning the server dedicated-task ledger, task-agent settlement rules, or task-delegation tool schemas beyond removing legacy task-plan transport naming.
- Building a new dedicated-task ledger UI/card to replace the removed task-plan panel.
- Renaming the `autobyteus-ts/src/task-management` folder or personal ToDo import paths; that folder still hosts active personal ToDo tools.
- Editing archived historical tickets except where active docs or generated docs must be updated.
- Preserving backward compatibility for native task-plan APIs, task-plan stream events, `TASK_PLAN_EVENT`, or task-plan UI.

## Functional Requirements

- `REQ-001` `autobyteus-ts` must remove the native team task-plan subsystem from active source, exports, and tests.
- `REQ-002` `autobyteus-ts` team runtime and team stream must support only team, agent, and sub-team stream source categories; no `TASK_PLAN` source category or task-plan payload validation may remain.
- `REQ-003` `autobyteus-ts` bootstrap/config must not initialize task-plan state or task-notification mode; team startup must proceed through the remaining queue/config/coordinator lifecycle only.
- `REQ-004` `autobyteus-ts` CLI/TUI must not store or render task-plan state for teams or subteams.
- `REQ-005` Server native AutoByteus backend processing must not import or rebroadcast native task-plan events from `autobyteus-ts`.
- `REQ-006` Server dedicated task-delegation events must remain authoritative and must be exposed over an explicit `TASK_DELEGATION_EVENT` WebSocket message, not legacy `TASK_PLAN_EVENT`.
- `REQ-007` Frontend streaming protocol and dispatch must remove task-plan event/state handling and support the explicit dedicated-task delegation event without creating `taskPlan` or `taskStatuses` state.
- `REQ-008` Desktop Team-tab UI must remove the `Task Plan` section and rely on the existing team communication/task-agent/activity surfaces for current team coordination.
- `REQ-009` Mobile activity digest must remove the task-plan filter/card and default to a remaining valid filter such as messages or activity.
- `REQ-010` Personal ToDo tools and ToDo streaming (`TODO_LIST_UPDATE`) must remain unchanged.
- `REQ-011` Active docs and tests must be updated to describe only server-owned dedicated task delegation and no retained native/internal task-plan model.

## Acceptance Criteria

- `AC-001` Active `autobyteus-ts/src` no longer contains source files or exports for `BaseTaskPlan`, `InMemoryTaskPlan`, `TaskPlan`, task-plan event schemas, task-plan converter, task-plan task schemas/status-report schemas, or task-plan deliverable schemas.
- `AC-002` `AgentTeamBootstrapper` default steps no longer include `TeamContextInitializationStep` or `TaskNotifierInitializationStep`; `AgentTeamConfig` no longer exposes `taskNotificationMode` or reads `AUTOBYTEUS_TASK_NOTIFICATION_MODE`.
- `AC-003` `AgentTeamStreamEventSourceType` in `autobyteus-ts` is limited to `TEAM | AGENT | SUB_TEAM`; attempting to build or validate a native `TASK_PLAN` stream event is not part of the API.
- `AC-004` `autobyteus-ts` CLI no longer has a `TaskPlanPanel`, `taskPlans` store state, task-status icons, or props named `tasks` / `taskStatuses` for team focus rendering.
- `AC-005` Server domain no longer has `TeamRunEventSourceType.TASK_PLAN` or `TeamRunTaskPlanEventPayload`; `AutoByteusTeamRunEventProcessor` ignores/does not map native task-plan events because none should be emitted by current `autobyteus-ts`.
- `AC-006` Server WebSocket mapper emits `ServerMessageType.TASK_DELEGATION_EVENT` for `TeamRunEventSourceType.TASK_DELEGATION`, with `event_type` values `TASK_DELEGATION_ACTIVATED`, `TASK_DELEGATION_STATUS_UPDATED`, or `TASK_DELEGATION_TERMINAL_STATUS`; `ServerMessageType.TASK_PLAN_EVENT` is removed.
- `AC-007` Frontend `AgentTeamContext` no longer contains `taskPlan` or `taskStatuses`; `types/taskManagement.ts`, `TaskPlanDisplay.vue`, and `handleTaskPlanEvent` are removed.
- `AC-008` Desktop Team tab renders Messages without the screenshot-visible `Task Plan`, `0 Tasks`, or `No task plan yet` UI; tests assert absence of `team-task-plan-*` selectors and task-plan localization keys.
- `AC-009` Mobile activity digest no longer exposes a `Tasks`/`Task plan` filter or `mobile-activity-task-plan` card.
- `AC-010` Dedicated task-agent activity/projection remains functional: task-agent stream identity still creates/removes task-agent member projections from dedicated task/agent status events.
- `AC-011` Personal ToDo tool tests continue to pass and `TODO_LIST_UPDATE` frontend handling remains unchanged.
- `AC-012` Updated docs no longer state that native `autobyteus-ts` retains an internal `TaskPlan`; they direct bounded team work to server-owned dedicated task delegation.
- `AC-013` Validation includes targeted type/build/test coverage for `autobyteus-ts`, `autobyteus-server-ts`, and `autobyteus-web`, plus source searches proving no active task-plan UI/runtime source remains except explicit negative guidance about removed legacy tool names where appropriate.

## Constraints / Dependencies

- No backward compatibility wrappers, aliases, dual-emitted WebSocket messages, or retained task-plan fallbacks for the removed behavior.
- Server dedicated task delegation remains authoritative; do not move dedicated-task ownership into `autobyteus-ts` or frontend stores.
- Existing generated/localized frontend message files must stay consistent after key removal.
- The current dedicated task transport is partly named with legacy `TASK_PLAN_EVENT`; this must be cut over explicitly rather than hidden in frontend UI only.

## Assumptions

- Dedicated task delegation in `autobyteus-server-ts` is production-intended and should remain the only team-task workflow.
- Native `autobyteus-ts` task plans are not required by current supported dedicated-task behavior.
- Historical archived ticket files may continue to mention task plans as historical records unless active documentation/tests import them.

## Risks / Open Questions

- Package consumers importing `autobyteus-ts/task-management/base-task-plan.js` or `TaskPlan` will break; this is intentional under the no-compatibility policy.
- Any external WebSocket client expecting `TASK_PLAN_EVENT` for dedicated task delegation will break; this is intentional for clean protocol semantics.
- Need confirm whether release notes or public API docs require explicit breaking-change notes during delivery.

## Requirement-To-Use-Case Coverage

| Requirement | Covered Use Cases |
| --- | --- |
| `REQ-001` | `UC-001` |
| `REQ-002` | `UC-001`, `UC-002` |
| `REQ-003` | `UC-001`, `UC-005` |
| `REQ-004` | `UC-001` |
| `REQ-005` | `UC-002` |
| `REQ-006` | `UC-002` |
| `REQ-007` | `UC-002`, `UC-003`, `UC-005` |
| `REQ-008` | `UC-003` |
| `REQ-009` | `UC-004` |
| `REQ-010` | `UC-005` |
| `REQ-011` | `UC-001`-`UC-005` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| `AC-001` | Active `autobyteus-ts` task-plan model is physically removed. |
| `AC-002` | Team bootstrap no longer creates or configures a task plan. |
| `AC-003` | Native team stream source contract cannot carry task-plan events. |
| `AC-004` | Native CLI no longer shows task plans. |
| `AC-005` | Server no longer bridges native task-plan events. |
| `AC-006` | Dedicated tasks use dedicated transport naming. |
| `AC-007` | Frontend state/protocol no longer stores task plans. |
| `AC-008` | Desktop screenshot issue is resolved. |
| `AC-009` | Mobile equivalent is resolved. |
| `AC-010` | New dedicated task-agent UI behavior remains intact. |
| `AC-011` | Non-team personal ToDo task-management remains intact. |
| `AC-012` | Docs align with the new model. |
| `AC-013` | Validation proves removal plus continuity. |

## Approval Status

Design-ready requirements derived from explicit user request to remove legacy task plans. No separate user sign-off beyond the request has been obtained; architecture review should route back if it sees a requirement gap.
