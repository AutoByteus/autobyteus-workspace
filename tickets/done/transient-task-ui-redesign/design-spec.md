# Design Spec

## Current-State Read

The current UI has one technical projection doing two jobs:

1. **Task-run routing/focus projection.** Task-agent and task-team websocket events create transient nodes in `AgentTeamContext.memberTree` so the frontend can focus task agents, scoped task-team members, conversation targets, statuses, and pending approvals.
2. **Stable left navigation projection.** Left workspace history also reads the same live `memberTree` through `buildTeamRowsFromContext`, so transient task-agent/task-team rows appear as normal tree entries and disappear after task cleanup.

The center team workspace also renders `TeamActiveTaskExecutionsBar` above `AgentTeamEventMonitor`. That bar is functional, but it puts delegated task status into the middle workspace and competes with the selected conversation/event monitor.

The right-side `Team` tab already exists through `TeamOverviewPanel`, but it currently owns only the `Messages` section. The right-side `Activity` tab owns focused-run To-Dos/tool/activity and should remain focused on the selected item, not become the active task list.

The backend task delegation domain already has the canonical simple task detail: `TaskDelegationRecord.description`. The current inspected task delegation websocket payloads expose task ID, label, target, status, and execution identity, but do not expose `description` to the frontend projection. The new UI therefore needs a small DTO/projection extension, not a task execution semantic change.

## Intended Change

Create a clean information-architecture split:

- **Left panel:** stable worktree/run navigation only. No transient task-agent/task-team/task-team-child projection rows.
- **Center workspace:** focused conversation/event monitor only. Remove the center active-task strip after equivalent Team tab behavior exists.
- **Right Team tab:** add an expandable `Active Tasks` section next to `Messages`. This section owns active delegated task visibility, simple task details, focus targets, and pending approval controls.
- **Right Activity tab:** remains focused-run To-Dos/tool/activity feed after the user focuses a task participant.

The new Team tab UI must show:

- task agent/team row label: `<target display name> · <short task ID>`;
- task description (`TaskDelegationRecord.description`);
- task status;
- target kind/name;
- task ID;
- `Agent run ID` for task agents;
- `Agent team run ID` for task teams;
- task-team members as focus/chat targets only;
- no user-facing `Runtime` label;
- no task-team phase/current-member/timeline dashboard.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UX Restructure / Focused Refactor
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: `teamTaskAgentContextProjection.ts` and `teamTaskTeamExecutionProjection.ts` insert task-run nodes into `AgentTeamContext.memberTree`; `runHistoryTeamRows.ts` maps that same tree into left navigation; `TeamWorkspaceView.vue` renders `TeamActiveTaskExecutionsBar` in the center; `TaskDelegationRecord.description` exists but is not published in inspected websocket task delegation payloads.
- Design response: split stable left navigation from task-run display, rehost active task UI into Team tab, add task detail projection fields, and expose task description through the task delegation event DTO.
- Refactor rationale: hiding or restyling task rows in the left tree would keep the same ambiguous ownership. The correct fix is to make left navigation and active delegated-task display separate projections.
- Intentional deferrals and residual risk, if any: Long-term completed task history/analytics is deferred. The first implementation may keep existing cleanup behavior so completed tasks disappear from Active Tasks, as long as the left worktree remains stable.

## Terminology

- **Task agent:** a delegated task execution targeting a single team member, backed by a task-agent run ID.
- **Task team:** a delegated task execution targeting a team/subteam, backed by a task-team run ID.
- **Task ID:** the delegated task identifier and primary row disambiguator.
- **Agent run ID:** the run ID for a task agent. User-facing label must be `Agent run ID`.
- **Agent team run ID:** the run ID for a task team. User-facing label must be `Agent team run ID`.
- **Active Tasks:** the Team tab section that owns currently active delegated task visibility.

## Design Reading Order

1. Task delegation event DTO and frontend task detail projection.
2. Active task entry read model for Team tab display.
3. Team tab Active Tasks UI and focus actions.
4. Stable left navigation filtering.
5. Center active-task bar removal.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: decommission the center `TeamActiveTaskExecutionsBar` rendering path once the Team tab Active Tasks section provides equivalent focus and approval behavior.
- No dual display: active tasks must not remain simultaneously as a center strip and a Team tab section.
- No compatibility wrapper: the left worktree must stop rendering task-run projection rows rather than retaining them with badges.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Backend task delegation event | Team tab Active Tasks row with simple details | Task delegation projection + Team tab active task read model | Carries description/status/target/task ID/run IDs into the new UI. |
| DS-002 | Primary End-to-End | User clicks active task/member | Center focuses correct task participant | `agentTeamContextsStore.focusMemberAndEnsureHydrated` | Preserves ability to communicate with task agents/task-team members. |
| DS-003 | Bounded Local | Live `AgentTeamContext.memberTree` | Left workspace history rows | Run history team-row projection | Prevents transient task nodes from leaking into stable navigation. |
| DS-004 | Return-Event | Task completion/offline/settled event | Active Tasks updates/removes row and focus fallback applies | Existing task execution projection cleanup | Ensures completion no longer destabilizes left nav. |

## Primary Execution Spine(s)

- DS-001: `TaskDelegationRecord` -> `TaskDelegationEventPublisher` -> websocket `TASK_DELEGATION_EVENT` -> frontend task execution projection -> task node detail fields -> `TeamActiveTasksSection` entries -> Team tab rows.
- DS-002: Team tab active task row/member click -> `focusMemberAndEnsureHydrated(teamRunId, memberRouteKey)` -> `focusedMemberRouteKey` update -> center workspace/composer target updated.
- DS-003: Live `AgentTeamContext.memberTree` -> stable row filter in `runHistoryTeamRows.ts` -> left workspace history rows without task-run projections.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A delegated task event now carries the simple task description. The frontend stores task details on the corresponding task-agent/task-team projection node, then the Team tab converts those nodes into active task entries. | `TaskDelegationRecord`, websocket payload, `TeamMemberNode`, `ActiveTaskEntry` | Task delegation projection + Team tab active task read model | Status labels, pending approvals, row expansion state. |
| DS-002 | A user click from Active Tasks focuses the concrete task-agent/task-team/member route without relying on a left-nav duplicate. | `teamRunId`, `memberRouteKey`, `focusedMemberRouteKey` | `agentTeamContextsStore` | Visual selected state, composer target. |
| DS-003 | The left history read model filters task-run nodes before rendering rows, so stable navigation does not react to delegated task lifecycle changes. | `TeamMemberNode`, `TeamMemberTreeRow` | Run history read model | Historical stable members, hydration. |
| DS-004 | Existing cleanup removes task-run projections on terminal/offline events. Because only Team tab renders them, disappearance is isolated to Active Tasks. | Task-agent/task-team projection nodes | Existing task execution projection cleanup | Optional future Recent subsection. |

## Spine Actors / Main-Line Nodes

- `TaskDelegationRecord`: server-side canonical delegated task state, including description/status/target/task ID.
- `TaskDelegationEventPublisher`: emits task delegation event payloads to team run streams.
- `team-run-event-websocket-message-mapper.ts`: serializes task delegation events for frontend consumption.
- `teamTaskExecutionEventRouter.ts`: dispatches task delegation events to task-agent/task-team projection handlers.
- `teamTaskAgentContextProjection.ts`: owns task-agent context/node creation and run identity.
- `teamTaskTeamExecutionProjection.ts`: owns task-team node creation, status, and cleanup.
- `TeamMemberNode`: frontend projection node carrying task identity/detail fields.
- `TeamActiveTasksSection.vue`: Team tab active task UI owner.
- `runHistoryTeamRows.ts`: left-navigation stable row projection owner.

## Ownership Map

| Node | Owns |
| --- | --- |
| `TaskDelegationRecord` | Canonical task description, status, target, task ID, result/review metadata. |
| `TaskDelegationEventPublisher` | Which task delegation fields become event payload contract. |
| Task execution projection files | Mapping websocket task identity/detail events into `AgentTeamContext` nodes. |
| `TeamActiveTasksSection.vue` | Team tab row layout, expansion state, pending approval controls, focus actions. |
| `teamActiveExecutionMembers.ts` / new active task entry helper | Finding active task-agent/task-team root nodes for display. |
| `runHistoryTeamRows.ts` | Stable left-navigation row shape; must filter task-run projection nodes. |
| `TeamWorkspaceView.vue` | Center selected team workspace; must no longer own active task list display. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `RightSideTabs.vue` | Individual tab panels | Hosts tab selection/content | Active task row derivation or task projection state. |
| `TeamOverviewPanel.vue` | Team tab sections | Composes Messages and Active Tasks sections | Backend event parsing or left-nav filtering. |
| `focusMemberAndEnsureHydrated` | `agentTeamContextsStore` | Public focus action for team members/task projections | UI-specific expansion state. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Center rendering of `TeamActiveTaskExecutionsBar` in `TeamWorkspaceView.vue` | Active task list moves to Team tab | `TeamActiveTasksSection.vue` | In This Change | Remove import and template usage. |
| `TeamActiveTaskExecutionsBar.vue` as center-only component | Its responsibilities are rehomed | `TeamActiveTasksSection.vue` plus shared active-task entry helper | In This Change | Delete if no remaining imports; otherwise rename/refactor rather than keep legacy center semantics. |
| Left navigation rendering of `isTaskAgentInstance`, `isTaskTeamInstance`, `isTaskTeamChildProjection` rows | Stable left nav must not show transient task runs | Filtered projection in `runHistoryTeamRows.ts` | In This Change | Do not retain badge-based legacy display. |
| User-facing `Runtime` label in task details | Ambiguous wording | `Agent run ID` / `Agent team run ID` labels | In This Change | Ensure localization strings use explicit labels. |

## Return Or Event Spine(s) (If Applicable)

- Task status/result/review events continue through `TASK_DELEGATION_EVENT` and update task status/detail fields on the corresponding projection node.
- Task-agent offline and task-team settled/offline events continue through existing cleanup functions; after left-nav filtering, their disappearance affects only Active Tasks/focused task projection, not stable navigation.

## Bounded Local / Internal Spines (If Applicable)

- **Team tab expansion state:** `TeamActiveTasksSection.vue` keeps a local set of expanded task route keys. Expansion is UI-local and must not mutate task projection state.
- **Pending approvals:** active task entries inspect task-agent conversation segments for `awaiting-approval` tool lifecycle segments and route approve/deny through existing `activeContextStore.postToolExecutionApproval` with the same target identity construction currently used by `TeamActiveTaskExecutionsBar`.
- **Stable navigation filtering:** `runHistoryTeamRows.ts` filters task-run projection nodes before flattening/rendering rows, preserving stable nodes and historical hydration behavior.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Localization strings | DS-001 | Team tab UI | Labels for Active Tasks, Task, Status, Target, Task ID, Agent run ID, Agent team run ID | UI text must be consistent and avoid `Runtime` | Hard-coded labels or inconsistent wording. |
| Status badge formatting | DS-001 | Team tab UI | Map projection status to compact badge text/color | Keep rows readable | Backend event parser becomes presentation owner. |
| Description clamping/expansion | DS-001 | Team tab UI | Keep long task descriptions compact but inspectable | Prevent oversized rows | Projection layer starts truncating data. |
| Approval controls | DS-001 | Existing task approval flow | Preserve approve/deny actions | No regression from center bar removal | New UI loses tool approval access. |
| Tests | All | Delivery confidence | Verify filtering, DTO projection, UI rows, focus | Prevent regressions in core UX | Visual fix ships with broken routing. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Team tab host | `TeamOverviewPanel.vue` | Extend | Existing right-side Team tab owner | N/A |
| Active task roots | `teamActiveExecutionMembers.ts` | Extend or wrap | Already finds task-agent/task-team display roots | N/A |
| Pending approvals | `TeamActiveTaskExecutionsBar.vue` logic | Reuse by extraction | Existing target construction is correct | N/A |
| Task description transport | Task delegation event publisher/payloads | Extend | Description belongs to task delegation record/event contract | N/A |
| Left nav rows | `runHistoryTeamRows.ts` | Extend | It owns stable team row projection | N/A |
| UI component for Active Tasks | Team components folder | Create New | New Team tab section has different layout/ownership than old center bar | Existing center bar should be decommissioned, not kept as active UI owner. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend task delegation | Description/status/target/task ID event contract | DS-001 | Task delegation projection | Extend | Add description to payloads. |
| Frontend task execution projection | Task-agent/team node identity and task detail fields | DS-001, DS-004 | Team tab UI, focus routing | Extend | Keep identity and details separate conceptually. |
| Team tab UI | Active Tasks section, details rows, focus actions | DS-001, DS-002 | User interaction | Extend/Create component | `TeamOverviewPanel` composes new section. |
| Run history / left nav | Stable row projection | DS-003 | Left navigation | Extend | Filter task-run projection nodes. |
| Center team workspace | Focused event/conversation surface | DS-002 | Main workspace | Remove legacy list | Remove task strip. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `task-delegation-record.ts` | Backend task delegation | Domain DTO types | Add description/reference fields to emitted payload types | Payload types already live here | N/A |
| `task-delegation-event-publisher.ts` | Backend task delegation | Event publisher | Populate description in task delegation event payloads | It builds all relevant payloads | N/A |
| `AgentTeamContext.ts` | Frontend task projection model | Node type | Add optional task detail fields | Existing projection node type | N/A |
| `teamTaskExecutionProjection.ts` or new helper | Frontend task projection | Detail extraction | Normalize task detail fields from payloads | Shared by task-agent and task-team projection | Yes |
| `teamTaskAgentContextProjection.ts` | Frontend task projection | Task-agent node owner | Apply task details to task-agent node | Already owns task-agent nodes | Yes |
| `teamTaskTeamExecutionProjection.ts` | Frontend task projection | Task-team node owner | Apply task details to task-team node | Already owns task-team nodes/status | Yes |
| `TeamActiveTasksSection.vue` | Team tab UI | Active Tasks section | Render active task rows/details/members/approvals | One cohesive UI section | Yes |
| `TeamOverviewPanel.vue` | Team tab UI | Tab panel composer | Add Active Tasks section and section layout | Existing Team tab owner | Yes |
| `runHistoryTeamRows.ts` | Left navigation | Stable row projection | Filter task-run nodes | Existing row mapper | N/A |
| `TeamWorkspaceView.vue` | Center workspace | Focused content composer | Remove active task bar render | Existing center owner | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Task delegation detail extraction from websocket payload | `teamTaskExecutionProjection.ts` or `teamTaskDelegationDetails.ts` | Frontend task execution projection | Both task-agent and task-team events need description/status/target metadata | Yes | Yes | A UI formatting helper. |
| Active task entry derivation | `utils/teamActiveTaskEntries.ts` or component-local composable | Team tab UI/read model | UI needs roots, display labels, IDs, approvals, members | Yes | Yes | A second source of task lifecycle truth. |
| Approval target construction | Extract from old bar into Active Tasks component/helper | Team tab UI + active context actions | Approval behavior must remain identical | Yes | Yes | Backend approval policy owner. |
| Task-run node filtering predicate | `runHistoryTeamRows.ts` local helper or shared predicate | Run history projection | Prevents repeated ad-hoc filters | Yes | Yes | A global deletion of projection nodes. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamMemberNode.taskDescription` | Yes | Yes | Low | Field means delegated task description only. |
| `TeamMemberNode.taskTargetKind/taskTargetName` | Yes | Yes | Low | Store simple display metadata; do not duplicate full backend target object. |
| `ActiveTaskEntry` | Yes | Yes | Medium | Derive from node/context each render; do not persist as authoritative lifecycle state. |
| DTO `description` | Yes | Yes | Low | Source remains `TaskDelegationRecord.description`. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record.ts` | Backend task delegation | Payload type owner | Add `description` to task delegation event payload types, and optionally `referenceFiles` if included | Existing type owner | N/A |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-event-publisher.ts` | Backend task delegation | Event payload builder | Populate `description` from `TaskDelegationRecord.description` for activation/status/submission/review events | Existing publisher owner | N/A |
| `autobyteus-web/types/agent/AgentTeamContext.ts` | Frontend task projection model | Projection node contract | Add optional task detail fields used by Active Tasks | Existing node type | N/A |
| `autobyteus-web/services/agentStreaming/teamTaskExecutionProjection.ts` or `teamTaskDelegationDetails.ts` | Frontend task execution projection | Shared detail parser | Extract task description, label, target, status metadata from `TASK_DELEGATION_EVENT` payloads | Shared by task-agent/team projection | Yes |
| `autobyteus-web/services/agentStreaming/teamTaskExecutionEventRouter.ts` | Frontend task execution projection | Event router | Apply task details after ensuring task-agent/team projection nodes | Existing router | Yes |
| `autobyteus-web/services/agentStreaming/teamTaskAgentContextProjection.ts` | Frontend task execution projection | Task-agent node owner | Preserve identity/display-name disambiguation and allow detail application | Existing task-agent owner | Yes |
| `autobyteus-web/services/agentStreaming/teamTaskTeamExecutionProjection.ts` | Frontend task execution projection | Task-team node owner | Preserve identity/display-name disambiguation, apply details/status, keep cleanup | Existing task-team owner | Yes |
| `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | Team tab UI | Active Tasks UI owner | Render active task rows, details, members, focus actions, approvals | One cohesive new section | Yes |
| `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | Team tab UI | Tab composer | Add Messages + Active Tasks section structure | Existing Team tab owner | Yes |
| `autobyteus-web/stores/runHistoryTeamRows.ts` | Left navigation | Stable row projection owner | Filter task-run projection nodes from left tree | Existing row builder | N/A |
| `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | Center workspace | Focused team workspace | Remove active task bar from center | Existing center owner | N/A |
| `autobyteus-web/localization/messages/en/workspace.ts`, `zh-CN/workspace.ts` | Localization | UI text owner | Add Active Tasks and explicit run-ID labels | Existing text owner | N/A |

## Ownership Boundaries

- Backend task delegation owns task description. Frontend must display it but not infer or mutate it.
- Frontend task execution projection owns transient task-agent/task-team node identity and lifecycle. Team tab reads this state but does not create task runs.
- Team tab Active Tasks owns display and interaction state such as row expansion. It must not own backend lifecycle or stable navigation.
- Left run history owns stable navigation projection. It may filter transient task-run nodes but must not delete them from `AgentTeamContext`.
- Center workspace owns focused content only and must not reintroduce a parallel active task list.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TaskDelegationEventPublisher` | Task payload field selection | Task delegation service | Frontend scraping delegate tool-call text for description | Add explicit DTO field. |
| `agentTeamContextsStore.focusMemberAndEnsureHydrated` | Team focus mutation and hydration | Active Tasks UI, run history selection | Directly mutating focus from component except through store action | Extend store action if route shape missing. |
| `runHistoryTeamRows.ts` | Stable row projection | Workspace history panel | Components individually hiding task rows | Centralize filter in row projection. |
| `TeamActiveTasksSection.vue` | Active task row display/expansion/approval UI | Team tab panel | Center workspace or Activity tab duplicating active task list | Extend Team section. |

## Dependency Rules

- Backend event publisher may depend on task delegation records, not frontend UI concepts.
- Frontend projection may depend on websocket payload shape and `TeamMemberNode`, not Vue components.
- Team tab UI may depend on active team context, task projection nodes, and store focus/approval actions.
- Left navigation may depend on `TeamMemberNode` fields for filtering, but must not mutate task projection state.
- Activity tab must not become an active task list; it may reflect the currently focused task participant only.
- Components must not use the label `Runtime`; use `Agent run ID` or `Agent team run ID`.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `TASK_DELEGATION_EVENT` payload | Delegated task metadata | Carry task description/status/target/task ID/execution IDs | `task_id`, `task_agent_run_id`, `task_team_run_id`, `target_name`, `description` | Add description. |
| `TeamMemberNode` task fields | Frontend task projection | Store displayable task details for active UI | route key + task IDs/run IDs | Optional fields; no backend lifecycle authority. |
| `focusMemberAndEnsureHydrated(teamRunId, memberRouteKey)` | Focus target | Focus task agent/team/member | concrete `teamRunId`, `memberRouteKey` | Reuse existing routing. |
| `postToolExecutionApproval` | Tool approval action | Approve/deny pending tool calls | invocation ID + approval target | Preserve current target construction. |
| `buildTeamRowsFromContext` | Left rows | Convert team context to stable rows | team context/member tree | Filter task-run projections. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TASK_DELEGATION_EVENT` | Yes | Yes | Low | Add description, keep IDs explicit. |
| `TeamMemberNode` task fields | Yes | Yes | Medium | Use field names scoped to task details; do not store full duplicate records. |
| Active task click handler | Yes | Yes | Low | Always pass `teamRunId` + concrete route key. |
| Left row projection filter | Yes | Yes | Low | Filter by explicit projection booleans. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Right Team section | `Active Tasks` | Yes | Low | Use consistently. |
| Task-agent run ID label | `Agent run ID` | Yes | Low | Avoid `Runtime`. |
| Task-team run ID label | `Agent team run ID` | Yes | Low | Avoid `Runtime`. |
| Node detail field | `taskDescription` | Yes | Low | Means delegated task description only. |
| Display entry | `ActiveTaskEntry` | Yes | Low | Derived UI entry, not lifecycle record. |

## Applied Patterns (If Any)

- **Projection split:** keep `AgentTeamContext.memberTree` as task-run routing projection, but filter it for stable left navigation and separately read it for Team tab Active Tasks.
- **Derived UI read model:** derive `ActiveTaskEntry` from `TeamMemberNode` + optional `AgentContext` instead of storing a second authoritative task lifecycle list.
- **Accordion section composition:** Team tab composes Messages and Active Tasks as independent sections so active tasks are discoverable without creating a new top-level tab.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/` | Folder | Backend task delegation | Task records, event payloads, publisher | Existing task delegation domain | Frontend UI labels. |
| `autobyteus-web/services/agentStreaming/` | Folder | Frontend stream projection | Parse/apply task details to task-run nodes | Existing event projection area | Vue rendering. |
| `autobyteus-web/types/agent/AgentTeamContext.ts` | File | Projection node type | Optional task detail fields | Existing team context contract | UI expansion state. |
| `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | File | Team tab active task UI | Active task section rendering/actions | Same folder as Team tab/messages | Backend event parsing. |
| `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | File | Team tab composer | Messages + Active Tasks sections | Existing Team tab content | Task DTO parsing. |
| `autobyteus-web/stores/runHistoryTeamRows.ts` | File | Left row projection | Filter task-run projections from stable nav | Existing row conversion owner | Task details display. |
| `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | File | Center team workspace | Focused event monitor; remove active task strip | Existing center owner | Active task list. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `task-delegation/` | Main-Line Domain-Control | Yes | Low | Description source belongs to task delegation. |
| `services/agentStreaming/` | Transport/projection | Yes | Medium | Keep parser/apply helpers here; do not move UI logic in. |
| `components/workspace/team/` | UI | Yes | Low | Team tab sections and center team workspace already live here. |
| `stores/runHistoryTeamRows.ts` | Off-Spine Concern | Yes | Low | Stable left row projection stays centralized. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Active task row label | `implementation_engineer · task_abc123` | `implementation_engineer` | Prevents duplicate-looking rows when multiple tasks target same member. |
| Run ID label | `Agent run ID: agent_run_xyz789` | `Runtime: agent_run_xyz789` | User-facing wording must be explicit. |
| Task details | `Task`, `Status`, `Target`, `Task ID`, `Agent team run ID` | current phase/current member/timeline | Scope is simple delegated task details. |
| Left nav filtering | Filter `isTaskAgentInstance || isTaskTeamInstance || isTaskTeamChildProjection` in row projection | Render task rows with a temporary badge | Stable nav should not carry transient task runs. |
| Center workspace | Focused conversation/event monitor only | Center active task strip + Team tab Active Tasks | Avoid duplicate task surfaces. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep task rows in left tree with a `temporary` badge | Minimal code change | Rejected | Filter task-run projection rows from left navigation. |
| Keep center active task bar and also add Team tab Active Tasks | Avoid moving existing component fully | Rejected | Rehost active task responsibilities into Team tab and remove center bar. |
| Scrape delegated task description from conversation/tool call text | Avoid backend DTO change | Rejected | Add explicit task description payload/projection field. |
| Use `Runtime` label for run IDs | Existing technical wording | Rejected | Use `Agent run ID` and `Agent team run ID`. |

## Derived Layering (If Useful)

Layering after the change:

1. Backend task delegation domain owns task record details.
2. Websocket event mapping transports those details.
3. Frontend stream projection stores task details on task-agent/task-team nodes.
4. Team tab active task read model derives display entries.
5. Team tab component renders rows/actions.
6. Left navigation derives a separate stable row projection that filters task-run nodes.

## Migration / Refactor Sequence

1. Extend backend task delegation payload types and publisher to include `description` from `TaskDelegationRecord.description` on relevant task delegation events.
2. Add frontend task detail fields to `TeamMemberNode` and a small parser/helper for task delegation detail payloads.
3. Apply task details in task-agent and task-team projection flows when `TASK_DELEGATION_EVENT` messages arrive.
4. Add an active-task entry helper/computed model that derives task-agent/task-team root entries, details, statuses, pending approvals, and members.
5. Implement `TeamActiveTasksSection.vue` under the Team tab using explicit labels and click/expand behavior.
6. Update `TeamOverviewPanel.vue` to compose `Messages` and `Active Tasks` as visible top-level sections.
7. Filter task-run projection nodes from `runHistoryTeamRows.ts` so left nav remains stable.
8. Remove `TeamActiveTaskExecutionsBar` rendering from `TeamWorkspaceView.vue`; delete or fully refactor the old component/tests so no center active-task list remains.
9. Update localization and tests.
10. Run frontend typecheck/unit tests and any relevant backend type/unit checks.

## Key Tradeoffs

- Adding `description` to the event DTO is cleaner than scraping tool-call text and keeps the UI deterministic.
- Keeping Active Tasks inside Team tab avoids top-level tab clutter and keeps Activity focused on the selected run.
- Filtering left rows centrally is safer than component-level hiding because it makes stable navigation ownership explicit.
- The first implementation may not preserve completed tasks as Recent; that is acceptable if left navigation remains stable and active-task disappearance is isolated to Team tab.

## Risks

- If `description` is missing from some event sequence, rows may temporarily show the placeholder. Mitigation: include description on all relevant task delegation events that can create/update projection state.
- Approval target construction could regress during rehosting. Mitigation: extract/reuse existing `TeamActiveTaskExecutionsBar` logic and add tests.
- Section layout may hide Active Tasks if Messages consumes all height. Mitigation: Team tab must use visible top-level section headers and allow Active Tasks to auto-expand when active count becomes nonzero.
- Filtering task-run rows from left nav must not remove stable historical members. Mitigation: filter only explicit task projection booleans.

## Guidance For Implementation

- Start with data contract and projection fields before building UI.
- Keep task identity (`taskId`, task-agent/team run IDs, route keys) separate from display fields (`taskDescription`, `taskTargetName`).
- Do not add a new top-level right-side tab.
- Do not reintroduce Active Tasks in the Activity tab.
- Do not use `Runtime` in UI strings.
- Prefer row label `<target display name> · <short task ID>`; use full IDs in details/tooltip.
- Preserve current focus behavior via `focusMemberAndEnsureHydrated` and current approval behavior via `activeContextStore.postToolExecutionApproval`.
- Tests should cover:
  - task-agent/task-team rows filtered from left nav;
  - task description applied from delegation events;
  - Active Tasks row labels/details use Task ID, Target, Agent run ID / Agent team run ID;
  - clicking rows/members focuses correct route key;
  - pending approval approve/deny still routes with task-agent/team identity;
  - center active task bar is no longer rendered.
