# Design Spec

## Current-State Read

The right-side workspace tab shell is `autobyteus-web/components/layout/RightSideTabs.vue`. When a team run is selected, the `teamMembers` tab renders `TeamOverviewPanel.vue`.

The comparable Activity tab path is healthier for the Team section disclosure/header problem: `RightSideTabs.vue` -> `ProgressPanel.vue` -> `TodoListPanel.vue` / `ActivityFeed.vue`. `ProgressPanel.vue` owns one `expandedSection` value, initializes it, and passes collapsed state down. Activity child headers use leading SVG disclosure icons before section titles and show counts at the right. This comparator applies to both Messages and Active Tasks section headers. Messages content/reference UI remains user-approved and must stay unchanged.

The Team tab current/recent implementation path has two design problems:

- Section-state/header invariant drift: Team section headers had trailing text chevrons instead of Activity-style left chevrons, and Active Tasks owned child-local expansion/auto-open behavior instead of parent-owned section state. Messages content/list/detail/reference UI must not be restyled, but the Messages section header chevron should move left like Activity.
- Delegated-task metadata loss: the frontend task projection path carries task id/label/body/target/status but not task reference files or original delegation data; backend `TaskDelegationRecord` already stores `referenceFiles`, but `TaskDelegationEventPublisher` does not emit them.

Messages provide the exact UX model for references and are a frozen content/reference baseline. `TeamCommunicationPanel.vue` renders message rows and nested reference rows in the left list. Clicking a reference changes the whole right pane from message body to reference preview via `TeamCommunicationReferenceViewer.vue`. The final Active Tasks UX should mirror this interaction conceptually: task reference rows appear under the selected task in the left task navigator, and clicking one switches the whole right pane to file preview. The right task detail does **not** duplicate reference rows by default. Any internal reuse/refactor beneath Messages is allowed only if the visible Messages list, nested reference rows, selected states, detail pane, and reference preview controls/layout/states remain unchanged from the pre-task baseline/current approved UX. The Messages section header is the exception: it intentionally gets the Activity-style left chevron. Round 3 live validation also clarified that visible `Task Agent` / `Task Team` labels are unnecessary clutter in Active Tasks; target names, task body/preview, useful status, references, and generic Focus controls are the visible identity.

The target must preserve the documented delegated-task visibility boundary in `autobyteus-web/docs/agent_execution_architecture.md`: delegated task visibility belongs in the right-side Team tab, not a center-pane active-task strip.

## Intended Change

1. Make `TeamOverviewPanel.vue` the single Team section accordion owner.
2. Initialize Team tab with Messages expanded and Active Tasks collapsed.
3. Render both Messages and Active Tasks section headers with Activity-style leading disclosure icons and right-side count/status metadata.
4. Convert `TeamActiveTasksSection.vue` into a controlled section that receives `collapsed` and emits `toggle`.
5. Redesign Active Tasks as Messages-like master/detail:
   - left task navigator with compact task items and nested reference rows under the selected task;
   - right pane showing selected task body by default;
   - right pane switching to selected reference preview after left reference click.
6. Keep task UI label-light: no visible `Task Agent` / `Task Team` badges, no required visible `Task brief` or `Reference files` headings when content/rows are self-evident.
7. Keep selection, focus, and approval separate: task click reads; generic visible `Focus` controls focus; Activity owns Approve/Deny.
8. Emit task refs/original delegation data from backend task delegation events and preserve them through frontend projection to Active Tasks entries.
9. Reuse/extract generic reference presentation and viewer internals only under a hard Messages no-visible-change invariant; keep message and task route wrappers owner-specific.
10. Require Electron-backed visual validation and iteration.

## Messages Content Frozen + Header Chevron Exception

Messages content/reference UX is an approved user-visible baseline, not a redesign target. The Messages section header is intentionally updated to use the Activity-style left chevron. The implementation may refactor internals under Messages only when the visible content/reference output remains identical from the user's perspective. This frozen baseline includes:

- message list rows;
- nested message reference rows;
- selected/hover/focus states;
- message detail body rendering;
- message reference preview controls, layout, spacing, loading, unavailable, forbidden, and error states.

Activity-style header changes apply to both Messages and Active Tasks section headers. If exact preservation of Messages content/reference output is uncertain, do not route Messages content/reference UI through newly extracted pieces; keep the existing Messages content component path stable and build task-specific wrappers/helpers around it.

## Active Tasks Label-Light Identity Rule

Visible `Task Agent` / `Task Team` badges are removed from Active Tasks primary UI. Task kind/type remains data for routing, accessibility labels if useful, and collapsed `Technical details`, but it is not primary visual identity. The primary visible identity is:

- target name, e.g. `Student` or `Study Group`;
- concise task preview/body;
- low-emphasis status only when useful, e.g. `Running`, `Awaiting review`, `Waiting input`; omit or de-emphasize redundant generic `Active`;
- nested reference rows under the selected task;
- generic visible `Focus` controls, with target-specific accessible labels/tooltips if needed.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): UI behavior change / UI quality bug fix with bounded protocol/projection feature.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing invariant for Team section header behavior and Active Tasks accordion behavior; Shared Structure Looseness for task metadata DTO/projection; Boundary/Ownership Issue risk if task references are inferred from Messages; Legacy/Compatibility Pressure if an internal reuse refactor changes the approved Messages content/reference UX.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, bounded.
- Evidence: Activity tab already has the target left disclosure pattern for section headers; Messages already has the target left-reference/right-preview interaction and the user called that experience excellent; latest user clarification says the Messages header left chevron remains valid; live validation showed visible task-kind badges add clutter because target names and Focus controls already communicate the subject; `TaskDelegationRecord` stores refs but events/projections drop them; Active Tasks currently has row expansion and approval controls that conflict with final UX.
- Design response: Refactor Team section ownership and section headers, preserve Messages content/reference UI, replace Active Tasks row expansion with master/detail selection, remove visible task-kind badges from primary Active Tasks UI, extend task event/projection structures, add task-owned reference content path, and extract shared route-independent viewer/presentation pieces only when Messages content/reference output remains visually identical.
- Refactor rationale: A UI-only patch cannot show task refs because the data is missing upstream. A message-scraping solution would violate the task metadata owner. A dual old/new row expansion path would preserve UI debt.
- Intentional deferrals and residual risk, if any: Historical completed-task reference browsing remains deferred unless existing history data already supports it. A broad shared right-panel header component remains deferred. Any visible Messages content/reference redesign is explicitly out of scope; the Messages section header chevron update is in scope.

## Terminology

- `Task body`: the rendered user-visible delegated task description/instructions.
- `Task brief`: internal/component/data concept for the task body; not a required visible heading.
- `Task reference file`: a reference supplied by `delegate_task.reference_files`, owned by the delegated task record.
- `Task reference row`: the left-navigator file row under the selected task. This is the primary visible access point for task references.
- `Original delegation data` / `taskArguments`: normalized task input/provenance snapshot. It is secondary and belongs only in optional `Technical details`.
- `Task reference preview`: read-only right-pane file preview after selecting a task reference row.

## Design Reading Order

1. Data-flow spine inventory.
2. Ownership and boundary map.
3. Reusable structures and subsystem allocation.
4. File responsibilities and target path mapping.
5. Migration/refactor sequence and implementation guidance.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove trailing Team section header text chevrons, add Activity-style left chevrons to Messages and Active Tasks headers, remove Active Tasks child-owned expansion/auto-open behavior, remove Active Tasks row expansion as the primary detail UI, remove visible Active Tasks task-kind badges, and remove Active Tasks approval action controls. Do not change Messages list/detail/reference content as part of this requirement.
- The design must not keep a compatibility flag for old row expansion or an alternate path that sources task refs from messages/tool-call scraping.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | Primary End-to-End | User opens Team tab | Messages default with left chevron + Active Tasks collapsed | `TeamOverviewPanel.vue` | Establishes initial section state and section-header parity while preserving Messages content/reference baseline. |
| `DS-002` | Primary End-to-End | User opens Active Tasks and selects task | Right task body/member detail | `TeamActiveTasksSection.vue` | Main task-reading flow. |
| `DS-003` | Primary End-to-End | User clicks task reference row | Right reference preview | `TeamActiveTasksSection.vue` + task reference wrapper/route | Main task-reference inspection flow. |
| `DS-004` | Return/Event | `TASK_DELEGATION_EVENT` from backend | Renderable `ActiveTaskEntry` with refs/args | Backend task delegation + frontend projection owners | Ensures authoritative task metadata reaches UI. |
| `DS-005` | Bounded Local | Team section header click | `expandedSection` update | `TeamOverviewPanel.vue` | Required accordion state invariant and Activity-style section-header placement. |
| `DS-006` | Bounded Local | Task/reference click | Selected task/reference state update | `TeamActiveTasksSection.vue` | Keeps read selection separate from execution focus. |
| `DS-007` | Primary End-to-End | Implementation visual validation start | Iterated acceptable UI evidence | Implementation engineer | User made live visual validation mandatory. |

## Primary Execution Spine(s)

- `DS-001`: `RightSideTabs -> TeamOverviewPanel section headers -> existing TeamCommunicationPanel content + TeamActiveTasksSection -> visible Team tab state`.
- `DS-002`: `Active Tasks header click -> TeamActiveTasksSection split layout -> task navigator item selection -> right task detail pane`.
- `DS-003`: `Left task reference row click -> selected reference state -> TeamTaskReferenceViewer wrapper -> task reference REST route -> TaskDelegationService reference resolver -> FileViewer preview/error`.
- `DS-004`: `delegate_task input -> TaskDelegationRecord -> TaskDelegationEventPublisher -> TASK_DELEGATION_EVENT -> teamTaskExecutionProjection -> AgentTeamContext node -> deriveActiveTaskEntries -> TeamActiveTasksSection`.
- `DS-007`: `Electron dev startup -> selected team run scenario -> visual comparison with Messages/Activity -> code iteration -> handoff evidence`.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | Team tab mounts with Messages open and Active Tasks collapsed; both section headers use Activity-style left affordances; Messages content/reference UI remains baseline. | `RightSideTabs`, `TeamOverviewPanel`, `TeamCommunicationPanel`, `TeamActiveTasksSection` | `TeamOverviewPanel.vue` | Localization, counts, waiting status summary. |
| `DS-002` | Active Tasks opens into a split view; task item click selects for reading; right pane renders clean task body and member focus rows when applicable, without visible task-kind badges. | `TeamActiveTasksSection`, task navigator item, task detail pane | `TeamActiveTasksSection.vue` | `deriveActiveTaskEntries`, Markdown rendering, focus event emission. |
| `DS-003` | User clicks a nested left task reference row; the whole right pane switches to file preview using task-owned route identity and shared viewer behavior. | Task navigator reference row, task reference wrapper, task content route, `FileViewer` | `TeamActiveTasksSection.vue` for selection; task reference route/service for content | Reference presentation, authorized fetch, file type detection, preview/error state. |
| `DS-004` | Backend task metadata travels from task record to frontend projection so UI does not infer refs from messages. | `TaskDelegationRecord`, `TaskDelegationEventPublisher`, `teamTaskExecutionProjection`, `AgentTeamContext`, `ActiveTaskEntry` | Backend task delegation owner + frontend projection owner | Reference normalization, taskArguments shaping, protocol typing. |
| `DS-005` | Header clicks update one parent-owned expanded section state. | `TeamOverviewPanel` | `TeamOverviewPanel.vue` | Leading chevrons, count text. |
| `DS-006` | Task/reference clicks update local selected task/reference state without changing focused member. | `TeamActiveTasksSection` | `TeamActiveTasksSection.vue` | Selection stability, keyboard/focus state. |
| `DS-007` | Implementation runs Electron-backed app and iterates visually. | Electron/Nuxt app, embedded server, Team tab | Implementation engineer | Fixture/scenario creation, screenshots/observations. |

## Spine Actors / Main-Line Nodes

- `RightSideTabs.vue`: thin right-side tab entry wrapper.
- `TeamOverviewPanel.vue`: Team tab composition and section state owner.
- `TeamCommunicationPanel.vue`: Messages list/detail/reference owner; frozen content/reference UX baseline and comparator to preserve.
- `TeamActiveTasksSection.vue`: Active Tasks section, task/ref selection, and split layout owner.
- Task navigator item/detail components: task item, task body, member focus presentation.
- `TaskDelegationRecord` / task delegation ledger: backend delegated-task metadata owner.
- `TaskDelegationEventPublisher`: backend live event payload owner.
- `teamTaskExecutionProjection.ts`: frontend task event normalization owner.
- `AgentTeamContext.ts`: frontend transient team/task node model.
- `teamActiveTaskEntries.ts`: frontend active task entry mapper.
- Task reference route/service/wrapper: task-owned reference content path.
- Shared reference viewer/presentation utilities: route-independent file preview/presentation internals that must not alter Messages visible output.

## Ownership Map

| Owner | Owns | Notes |
| --- | --- | --- |
| `RightSideTabs.vue` | Right-side tab mounting only. | Thin facade; must not own Team section state. |
| `TeamOverviewPanel.vue` | Team tab section composition, `expandedSection`, default Messages-open state, Messages and Active Tasks header rendering/metadata. | Authoritative Team accordion owner; must preserve Messages content/reference UI. |
| `TeamCommunicationPanel.vue` | Message list/detail/reference selection and message route wrapper use. | Preserve exact existing user-visible behavior. |
| `TeamActiveTasksSection.vue` | Active task split layout, selected task/ref state, task count/waiting summary, focus event emission. | Must not own backend metadata parsing or approval actions. |
| Task navigator item component | Compact target-name/task-preview row and nested selected-task reference rows; no visible task-kind badge. | Left-side navigation only. |
| Task detail pane component | Right-side target/status/Focus header, task body, member focus rows, Technical details. | No task-kind badge or reference-row duplication by default. |
| Task reference wrapper/viewer | Task reference content URL and right-pane preview. | Task route identity, not message route identity. |
| `teamActiveTaskEntries.ts` | Map transient task nodes to UI entries. | Propagate refs/args; no protocol parsing. |
| `teamTaskExecutionProjection.ts` | Normalize `TASK_DELEGATION_EVENT` task metadata. | Source of frontend task metadata. |
| `TaskDelegationRecord` / service | Canonical backend task metadata and active record/reference lookup. | Authoritative source for refs. |
| `TaskDelegationEventPublisher` | Event payload shape for delegated-task metadata. | Emits refs/args. |
| Activity approval boundary | Approval target construction/action submission. | Active Tasks status only; no actions. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `RightSideTabs.vue` | `TeamOverviewPanel.vue` for Team content | Mounts active right-side tab. | Team section state, task selection. |
| `TeamCommunicationReferenceViewer.vue` | Message content route and existing visible message preview contract, optionally delegating to generic internals | Message route wrapper and exact visible Messages preview. | Task route identity; visible control/layout changes. |
| `TeamTaskReferenceViewer.vue` (new) | Generic viewer shell + task content route | Task route wrapper. | Message messageId/reference assumptions. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Trailing Team section header text chevrons | Violates Activity comparator for Team section headers. | Leading SVG disclosure icons in Messages and Active Tasks headers. | In This Change | Messages content/reference UI remains frozen. |
| `TeamActiveTasksSection` child-owned whole-section expansion | Parent must own accordion. | `TeamOverviewPanel.expandedSection`. | In This Change | Active Tasks keeps only task/ref selection. |
| Active-count auto-open watcher | Conflicts with Messages default. | Collapsed header count/status metadata. | In This Change | `N tasks` remains visible. |
| Active Tasks expanding-row detail as primary UI | Final UX is split master/detail. | Task navigator + right detail pane. | In This Change | Row component may be split/renamed. |
| Active Tasks Approve/Deny controls | Activity owns approval actions. | Status-only waiting copy in Active Tasks; existing Activity approval UI. | In This Change | Remove `postToolExecutionApproval` calls from Active Tasks UI. |
| Frontend inference of task refs from messages/tool events | Boundary bypass. | Backend task event payload + projection. | In This Change | Do not add fallback scraping. |
| Direct use of message reference route for task refs | Fake message identity. | Task-owned reference wrapper/route. | In This Change | Generic shell is okay. |
| Right-detail reference-row duplication by default | Final UX mirrors Messages: refs left, preview right on click. | Left navigator nested refs + right file preview. | In This Change | Right task body remains clean. |

## Return Or Event Spine(s) (If Applicable)

- Backend task metadata return/event spine: `TaskDelegationEventPublisher -> websocket mapper -> teamTaskExecutionProjection -> AgentTeamContext task node -> ActiveTaskEntry -> TeamActiveTasksSection render`.
- Reference preview return spine: `Task reference REST route -> authorizedFetch -> generic TeamReferenceFileViewer shell -> FileViewer preview/error state`.
- Focus return/update spine: `Focus button/member row -> existing focus store/event boundary -> workspace focused member changes -> Team tab focused/selected states remain readable`.

## Bounded Local / Internal Spines (If Applicable)

- Parent accordion local spine inside `TeamOverviewPanel`: `Header click -> toggleSection('messages' | 'activeTasks') -> expandedSection update -> child collapsed props -> body visibility`; both Messages and Active Tasks receive Activity-style left chevrons.
- Active Tasks selection local spine inside `TeamActiveTasksSection`: `Task item click -> selectedTaskRouteKey update -> selectedReferenceId cleared -> right task body rendered`.
- Reference selection local spine inside `TeamActiveTasksSection`: `Reference row click -> selectedTaskRouteKey retained -> selectedReferenceId update -> right reference preview rendered`.
- Technical details local spine inside task detail pane: `Disclosure click -> detailsExpanded update -> secondary IDs/provenance visible/hidden`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Localization labels | `DS-001`, `DS-002`, `DS-003` | UI owners | User-facing strings/counts/statuses. | Avoid hardcoded UI copy. | Locale drift. |
| Count/waiting summary | `DS-001`, `DS-002` | `TeamActiveTasksSection` / `TeamOverviewPanel` | Provide collapsed header metadata. | User needs task visibility while collapsed. | Parent parsing task internals. |
| Reference presentation | `DS-003` | Message/task reference rows | Filename/icon/type display. | Keep Messages and task refs visually consistent. | Duplicate icon logic drift. |
| Reference content fetching | `DS-003` | Generic viewer shell | Authorized fetch, content/object URL/error cleanup. | Reuse robust viewer behavior. | Duplicated fetch lifecycle bugs. |
| Markdown/task body rendering | `DS-002` | Task detail pane | Render task body with message-like readability. | Clean readable task content. | Raw/cluttered UI. |
| Technical details rendering | `DS-002`, `DS-004` | Task detail pane | Compact secondary provenance display. | Preserve IDs/debug data without primary clutter. | Raw JSON dominating UI. |
| Visual validation evidence | `DS-007` | Implementation workflow | Commands/screenshots/observations/iterations. | User made it mandatory. | Static-only implementation misses UX issues. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Team section header comparator | Activity tab components | Reuse as comparator for Messages and Active Tasks headers | Existing requested pattern, reconfirmed by user. | Messages content/reference no-change invariant. |
| Message-like reference rows | `TeamCommunicationPanel` | Reuse interaction semantics | User praised this exact UX. | N/A |
| File preview shell | `TeamCommunicationReferenceViewer` + `FileViewer` | Extract/Extend only beneath stable visible contract | Viewer shell behavior is generic; route is message-specific. | Must not change visible Messages preview controls/layout/states. |
| Task metadata source | Task delegation record/event subsystem | Extend | Already owns task refs and lifecycle. | N/A |
| Active task UI | `TeamActiveTasksSection` / entries utilities | Extend/refactor | Existing delegated-task UI owner. | N/A |
| Approval actions | Activity approval boundary | Preserve outside Active Tasks | Correct action owner already exists. | N/A |
| Task reference content route | Message reference route pattern | Create task-owned analogue | Subject identity differs: taskId/referenceId, not messageId/referenceId. | Message route would require fake identity. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Right-side Team overview UI | Section composition/state/header counts. | `DS-001`, `DS-005` | `TeamOverviewPanel` | Extend | Parent accordion owner. |
| Team active task UI | Task/ref selection, split layout, task body/member focus/details. | `DS-002`, `DS-003`, `DS-006` | `TeamActiveTasksSection` | Refactor/Extend | Replace row expansion. |
| Team reference UI | Generic ref type/presentation/viewer shell. | `DS-003` | Message/task wrappers | Extract/Create | Shared behavior, owner-specific route wrappers. |
| Team communication UI | Existing message list/detail/reference behavior. | `DS-001`, `DS-003` | `TeamCommunicationPanel` | Preserve exact content/reference output; section header is owned by parent and intentionally updated. | No content/reference behavior or visual regression. |
| Frontend streaming projection | Task event metadata normalization. | `DS-004` | `teamTaskExecutionProjection` | Extend | Authoritative frontend task metadata path. |
| Backend task delegation | Task records, event payloads, active task reference resolution. | `DS-004`, `DS-003` | Task delegation service/publisher | Extend | Source of task refs/args. |
| REST API | Task reference content route. | `DS-003` | Task reference route/service | Extend | Subject-specific route. |
| Electron dev runtime | Live visual validation. | `DS-007` | Implementation workflow | Reuse | Evidence required. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `TeamOverviewPanel.vue` | Team overview UI | Team accordion owner | `expandedSection`, initial Messages open, Messages and Active Tasks header rendering. | Existing parent. | Existing stores/components. |
| `TeamActiveTasksSection.vue` | Team active task UI | Active Tasks master/detail owner | Controlled section body, task/ref selection, split layout. | Existing section owner. | `deriveActiveTaskEntries`. |
| `TeamActiveTaskNavigatorItem.vue` (optional extraction) | Team active task UI | Task navigator item | Compact task item and nested selected-task refs. | Clarifies left-navigation concern. | Reference presentation helper. |
| `TeamActiveTaskDetailPane.vue` (optional extraction) | Team active task UI | Task body/member detail | Right task body, compact header, focus/member rows, Technical details. | Clarifies right-detail concern. | Markdown renderer. |
| `TeamTaskReferenceViewer.vue` | Team active task UI / Team reference UI | Task route wrapper | Build task reference content URL and delegate to generic viewer. | Keeps task route explicit. | Generic viewer shell. |
| `TeamReferenceFileViewer.vue` | Team reference UI | Generic viewer shell | Fetch/render/maximize/error behavior independent of route owner. | Shared behavior. | `FileViewer`. |
| `types/teamReferenceFile.ts` | Team reference UI | Shared reference type owner | Generic `TeamReferenceFile` shape. | Avoid message-named type in task code. | Used by message/task. |
| `utils/teamReferences/referenceFilePresentation.ts` | Team reference UI | Presentation helper owner | Filename/icon/type helpers. | Existing logic is generic. | `TeamReferenceFile`. |
| `teamTaskExecutionProjection.ts` | Frontend projection | Task event normalizer | Extract refs/args from task events. | Existing projection owner. | Reference normalizer. |
| `AgentTeamContext.ts` | Frontend model | Team/task node contract | Add optional task refs/args fields. | Existing node contract. | `TeamReferenceFile`. |
| `teamActiveTaskEntries.ts` | Active task UI | Entry mapper | Add `teamRunId`, `taskReferenceFiles`, `taskArguments`. | Existing active task mapper. | `TeamReferenceFile`. |
| `task-delegation-event-publisher.ts` | Backend task delegation | Event payload builder | Emit refs/args. | Existing event owner. | Backend ref payload helper. |
| `task-delegation-service.ts` | Backend task delegation | Active task service | Resolve task reference content. | Service owns ledger access. | N/A |
| `api/rest/task-delegation.ts` | REST API | Task reference route | Serve content by teamRunId/taskId/referenceId. | Subject-specific route. | Message route pattern. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Reference file type/presentation | `types/teamReferenceFile.ts`, `utils/teamReferences/referenceFilePresentation.ts` | Team reference UI | Tasks should reuse Messages-like semantics without changing Messages output. | Yes, if exact Messages visible output is preserved | Yes | Message-owned type imported by tasks, or refactor that changes Messages styling. |
| Reference viewer shell | `TeamReferenceFileViewer.vue` | Team reference UI | Same fetch/render/maximize/error lifecycle. | Yes | Yes | Route-aware component that knows every owner. |
| Task metadata projection fields | `TaskDelegationProjectionDetails`, `TeamMemberNodeBase`, `ActiveTaskEntry` | Frontend task projection/UI | Same task metadata must flow consistently; task kind remains internal. | Yes | Yes | Kitchen-sink message/task mixed DTO or visible kind-badge dependency. |
| Backend task reference payload | Task delegation payload type/helper | Backend task delegation | Same ref payload emitted on task events. | Yes | Yes | Message reference ID reuse. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamReferenceFile` | Yes | Yes | Low | Keep generic: `referenceId`, `path`, `type`, timestamps. |
| `TaskDelegationProjectionDetails` | Yes after extension | Yes | Medium -> Low | Add task refs/args; keep task body/target first-class. |
| `TeamMemberNodeBase` task fields | Yes after extension | Yes | Medium -> Low | Add optional task refs/args, not message fields. |
| `ActiveTaskEntry` | Yes after extension | Yes | Medium -> Low | Add `teamRunId`, `taskReferenceFiles`, `taskArguments`; keep selection/focus separate. |
| `taskArguments` | Mostly | Partially | Medium | Treat only as normalized provenance shown in Technical details when useful. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | Team overview UI | Team accordion owner | Parent `expandedSection`, Messages/Active Tasks headers, initial Messages open, pass `collapsed` while keeping Messages content/reference baseline. | Existing parent owner. | Stores/components. |
| `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | Team active task UI | Active Tasks master/detail owner | Controlled section, task/ref selection, split layout, count/waiting summary. | Existing section owner, refactored. | `deriveActiveTaskEntries`. |
| `autobyteus-web/components/workspace/team/TeamActiveTaskRow.vue` or extracted navigator/detail components | Team active task UI | Task navigator/detail owner | Compact task item, nested left refs, right task body/member/detail state. | Split if needed for readability. | Reference viewer/presentation. |
| `autobyteus-web/components/workspace/team/TeamReferenceFileViewer.vue` | Team reference UI | Generic viewer shell | Route-independent fetch/render/maximize/error using supplied content URL. | Shared behavior. | `FileViewer`. |
| `autobyteus-web/components/workspace/team/TeamCommunicationReferenceViewer.vue` | Team communication UI | Message route wrapper | Build message ref content URL and delegate to generic shell. | Preserve message subject identity. | Generic viewer shell. |
| `autobyteus-web/components/workspace/team/TeamTaskReferenceViewer.vue` | Team active task UI | Task route wrapper | Build task ref content URL and delegate to generic shell. | Preserve task subject identity. | Generic viewer shell. |
| `autobyteus-web/types/teamReferenceFile.ts` | Team reference UI | Shared type owner | Generic reference file type. | Avoid message-owned type leakage. | Message/task code. |
| `autobyteus-web/utils/teamReferences/referenceFilePresentation.ts` | Team reference UI | Shared presentation owner | Filename/icon/type helpers. | Reusable presentation only. | `TeamReferenceFile`. |
| `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | Frontend protocol types | Streaming payload owner | Type task refs/args fields. | Existing protocol location. | Payload-compatible refs. |
| `autobyteus-web/services/agentStreaming/teamTaskExecutionProjection.ts` | Frontend projection | Task event normalizer | Normalize refs/args from task events. | Existing projection owner. | Ref normalizer. |
| `autobyteus-web/services/agentStreaming/teamTaskAgentContextProjection.ts` | Frontend projection | Task-agent node builder | Preserve refs/args on task-agent nodes. | Existing builder. | Node fields. |
| `autobyteus-web/services/agentStreaming/teamTaskTeamExecutionProjection.ts` | Frontend projection | Task-team node builder | Preserve refs/args on task-team roots. | Existing builder. | Node fields. |
| `autobyteus-web/types/agent/AgentTeamContext.ts` | Frontend model | Team/task node contract | Add optional task refs/args. | Existing context model. | `TeamReferenceFile`. |
| `autobyteus-web/utils/teamActiveTaskEntries.ts` | Active task UI | Entry mapper | Expose `teamRunId`, refs, args. | Existing mapper. | `TeamReferenceFile`. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record.ts` | Backend task delegation | Task record/payload types | Add/confirm event payload/reference payload types. | Existing record owner. | Ref helper. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-event-publisher.ts` | Backend task delegation | Event publisher | Emit refs and taskArguments. | Existing publisher. | Ref payload helper. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | Backend task delegation | Active task service | Resolve record/reference for route. | Ledger access owner. | N/A |
| `autobyteus-server-ts/src/api/rest/task-delegation.ts` | REST API | Task reference content route | Serve content by teamRunId/taskId/referenceId. | Subject-specific REST route. | Content service pattern. |
| Relevant tests | Coverage | Component/projection/backend route owners | Verify behavior and regressions. | Colocated with owners. | Existing fixtures. |

## Ownership Boundaries

`TeamOverviewPanel.vue` is the authoritative boundary for Team section state. `TeamActiveTasksSection.vue` receives collapsed state and emits toggles; it owns only Active Tasks body state such as selected task/reference.

`TeamCommunicationPanel.vue` remains the authoritative boundary for message selection/reference route identity and for the frozen user-visible Messages UX. Task code may reuse a generic viewer shell and presentation helpers, but must not use message IDs or message route wrappers for task references. Any reuse underneath Messages must be invisible to users.

`TaskDelegationRecord` / `TaskDelegationEventPublisher` are the authoritative task metadata boundary. Frontend Active Tasks depends on `TASK_DELEGATION_EVENT` projection for task refs/args, not Messages or raw tool-call scraping.

Activity remains the authoritative approval action boundary. Active Tasks may display status-only waiting copy and must not submit approval decisions.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TeamOverviewPanel` section state/header | Expanded/collapsed Team sections and section header affordances | Team child panels | Child-owned Active Tasks whole-section expansion, or Messages content/reference restyling while moving state | Add parent props/events and section headers while preserving Messages content/reference markup/classes/spacing. |
| `TaskDelegationEventPublisher` + projection | Task refs/args event payload | Active Tasks UI | Scrape communication messages/tool events | Extend event/projection fields. |
| Message reference wrapper | Message content URL and visible preview contract | Message UI | Task references using fake message IDs, or refactors that alter visible message preview | Add task wrapper/route and keep message wrapper stable. |
| Task reference wrapper/route | Task content URL | Active Tasks UI | Direct filesystem fetch in component | Add REST/service resolver. |
| Activity approval boundary | Approval target construction/submission | User approval actions | Active Tasks approve/deny buttons | Keep actions in Activity. |

## Dependency Rules

- `RightSideTabs` may mount `TeamOverviewPanel`; it must not own Team section state.
- `TeamOverviewPanel` may pass `collapsed` and receive `toggle` from `TeamActiveTasksSection`.
- `TeamActiveTasksSection` may consume `deriveActiveTaskEntries` and emit focus events through existing focus boundaries.
- Active Tasks UI may render `taskReferenceFiles` from `ActiveTaskEntry`; it must not parse raw protocol payloads or messages directly.
- Generic reference viewer shell may accept a content URL; route construction belongs in message/task wrappers, and the message wrapper must preserve exact visible Messages output.
- Backend REST route may call `TaskDelegationService`; it must not reach into private ledgers from route code if service API can provide a narrow resolver.
- Active Tasks must not call `postToolExecutionApproval` or build `ToolApprovalTarget` for decisions.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `toggleSection(section)` | Team section | Open/collapse Team sections | `'messages' | 'activeTasks'` | Local to `TeamOverviewPanel`. |
| `deriveActiveTaskEntries(teamContext)` | Active task entries | Map task nodes to UI entries | `AgentTeamContext` | Adds refs/args/teamRunId. |
| `normalizeTaskDelegationDetails(payload)` (existing/proposed within projection) | Task event metadata | Extract refs/args/body/target/status | `TaskDelegationEventPayload` | Frontend protocol normalization. |
| `GET /team-runs/:teamRunId/task-delegations/:taskId/references/:referenceId/content` | Task reference content | Serve selected task reference content | `teamRunId + taskId + referenceId` | Explicit task subject identity. |
| `GET /team-runs/:teamRunId/team-communication/messages/:messageId/references/:referenceId/content` | Message reference content | Existing message reference content | `teamRunId + messageId + referenceId` | Preserve unchanged. |
| `resolveTaskReference(teamRunId, taskId, referenceId)` | Task reference resolver | Locate active task reference path/content eligibility | `teamRunId + taskId + referenceId` | Narrow service method. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Team section toggle | Yes | Yes | Low | Keep local literal union. |
| Task reference content route | Yes | Yes | Low | Use task-specific route, not generic mixed refs. |
| Message reference content route | Yes | Yes | Low | Preserve. |
| Active task entry derivation | Yes | Yes | Low | Do not add protocol parsing here. |
| Task event projection | Yes | Yes | Medium -> Low | Add typed refs/args extraction. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Team tab parent | `TeamOverviewPanel` | Yes | Low | Keep. |
| Active task section | `TeamActiveTasksSection` | Yes | Low | Keep as section owner. |
| Task navigator item | `TeamActiveTaskNavigatorItem` optional | Yes | Low | Extract if component grows. |
| Task detail pane | `TeamActiveTaskDetailPane` optional | Yes | Low | Extract if component grows. |
| Generic ref viewer | `TeamReferenceFileViewer` | Yes | Low | Route-independent shell. |
| Task ref wrapper | `TeamTaskReferenceViewer` | Yes | Low | Task-specific identity. |

## Applied Patterns (If Any)

- Controlled component pattern: `TeamActiveTasksSection` receives collapsed state from `TeamOverviewPanel`.
- Master/detail UI pattern: left navigator, right content/detail/preview.
- Adapter/wrapper pattern: message/task reference wrappers adapt owner-specific route identity to a generic viewer shell.
- Bounded local state: task/reference selection lives inside Active Tasks section.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | File | Team overview UI | Parent section state and headers. | Existing Team parent. | Active task item selection internals. |
| `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | File | Team active task UI | Split layout and selection owner. | Existing Active Tasks section. | Backend REST internals; approval actions. |
| `autobyteus-web/components/workspace/team/TeamActiveTaskRow.vue` or extracted components | File(s) | Team active task UI | Task item/detail presentation. | Existing UI location. | Whole-section expansion policy. |
| `autobyteus-web/components/workspace/team/TeamReferenceFileViewer.vue` | File | Team reference UI | Generic viewer shell. | Existing team workspace UI area. | Message/task route construction. |
| `autobyteus-web/components/workspace/team/TeamCommunicationReferenceViewer.vue` | File | Team communication UI | Message route wrapper. | Existing message wrapper. | Task route construction. |
| `autobyteus-web/components/workspace/team/TeamTaskReferenceViewer.vue` | File | Team active task UI | Task route wrapper. | Task UI wrapper near owner. | Message route construction. |
| `autobyteus-web/types/teamReferenceFile.ts` | File | Team reference UI | Shared ref type. | Cross message/task team ref concept. | Message-only fields. |
| `autobyteus-web/utils/teamReferences/` | Folder | Team reference UI | Reference presentation helpers. | Avoid message namespace for generic helpers. | Fetching or route construction. |
| `autobyteus-web/services/agentStreaming/*` | Files | Frontend projection | Protocol typing and task node preservation. | Existing streaming projection area. | UI layout logic. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/*` | Files | Backend task delegation | Event payloads, service resolver. | Existing task domain owner. | REST transport details beyond narrow support. |
| `autobyteus-server-ts/src/api/rest/task-delegation.ts` | File | REST API | Task reference content route. | Transport boundary. | Ledger internals/business rules. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/workspace/team` | UI composition/presentation | Yes | Medium | Several Team UI concerns already live here; optional component extraction keeps readable. |
| `utils/teamReferences` | Off-spine presentation concern | Yes | Low | Shared helper only, not business owner. |
| `services/agentStreaming` | Projection/transport adapter | Yes | Low | Correct owner for event normalization. |
| `agent-team-execution/task-delegation` | Main-line backend task owner | Yes | Low | Correct owner for task refs/args. |
| `api/rest` | Transport | Yes | Low | Route only delegates to service. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Final Active Tasks reference UX | Left: target-name task row with nested `[md] design-spec.md`; Right: target/status/`Focus`, then task body. Click file -> whole right pane preview. | Left/right primary UI shows `Task Agent`/`Task Team` badges or right task detail lists duplicate refs by default. | Mirrors the approved Messages interaction without changing Messages content/reference UI and removes label clutter. |
| Group/team-target right detail | `Study Group [Awaiting review] [Focus]` then body, member rows, Technical details. | `[Task Team] Study Group [Focus team]`, or `Review implementation [Focus team]` second header row. | Avoids type-label clutter and confusing command-like rows. |
| Task metadata source | `TaskDelegationRecord -> TASK_DELEGATION_EVENT -> projection -> ActiveTaskEntry`. | `ActiveTaskRow` scraping team communication messages. | Preserves authoritative boundary. |
| Reference route wrappers | `TeamTaskReferenceViewer` builds task URL, generic viewer fetches; `TeamCommunicationReferenceViewer` remains visually identical. | Task UI uses `TeamCommunicationReferenceViewer` with fake message id, or genericization changes Messages preview UI. | Keeps subject identity explicit and preserves approved Messages UX. |
| Approval separation | Active Tasks shows `Waiting approval`; Activity owns Approve/Deny. | Active Tasks renders Approve/Deny buttons. | Keeps runtime decision surface consistent. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep old Active Tasks expanding rows behind a branch | Could minimize code churn. | Rejected | Replace with master/detail selection. |
| Keep child-owned expansion and add parent state around it | Could be incremental. | Rejected | `TeamOverviewPanel` is sole section state owner. |
| Keep old Team section trailing chevrons | Could minimize header change. | Rejected | Activity-style leading chevrons for both Messages and Active Tasks section headers; Messages content/reference remains baseline. |
| Source task refs from messages when event lacks refs | Could avoid backend changes. | Rejected | Emit refs from task delegation events. |
| Use message reference route for task refs | Could reuse route directly. | Rejected | Generic viewer shell + task-owned route wrapper. |
| Keep Active Tasks approval buttons | Existing behavior. | Rejected | Activity-owned approval actions; Active Tasks status only. |
| Duplicate ref rows in right detail by default | Earlier considered for visibility. | Rejected | Final user-approved design keeps refs under selected task in left navigator, like Messages. |
| Visible `Task Agent` / `Task Team` badges | Earlier used to distinguish task kinds. | Rejected after Round 3 live feedback | Target names, status, body/preview, member rows, and generic `Focus` controls communicate enough; kind stays internal/Technical details only. |
| Visible `Focus agent` / `Focus team` copy | Earlier used to distinguish target type. | Rejected after Round 3 live feedback | Visible button copy is generic `Focus`; accessible labels/tooltips may include target name. |

## Derived Layering (If Useful)

- UI composition layer: `TeamOverviewPanel`, `TeamActiveTasksSection`, task navigator/detail components.
- UI reference shell layer: generic reference viewer/presentation helpers.
- Frontend projection layer: streaming event protocol/projection/context/entry mapping.
- Backend task domain layer: task delegation record/service/event publisher.
- REST transport layer: task reference content route.

Layering is descriptive only; ownership boundaries above are authoritative.

## Migration / Refactor Sequence

1. Align UI contract and tests with final UX plus the hard Messages no-visible-change invariant.
2. Refactor `TeamOverviewPanel` to own `expandedSection`, initial `messages`, and Activity-style headers for both Messages and Active Tasks while preserving existing Messages list/detail/reference UI.
3. Refactor `TeamActiveTasksSection` to controlled collapsed/toggle props and split master/detail state.
4. Remove Active Tasks approval action controls, old row-expansion-as-detail behavior, visible task-kind badges, and visible `Focus agent`/`Focus team` copy.
5. Add generic `TeamReferenceFile` type and presentation helpers only where Messages visible output stays identical; otherwise keep Messages-specific presentation and adapt task refs separately.
6. Extract route-independent `TeamReferenceFileViewer` shell only beneath stable wrappers; keep message wrapper stable and visually identical.
7. Extend backend task delegation payloads with `referenceFiles` and `taskArguments`.
8. Add task reference resolver/service method and REST content route.
9. Extend frontend protocol/projection/context/entry mapping for task refs/args.
10. Add `TeamTaskReferenceViewer` or equivalent task wrapper and wire left reference rows to right preview.
11. Add/update tests for UI, projection, backend event/route, Messages content/reference regression safety, both section headers, and task-kind label removal.
12. Run targeted checks and `git diff --check`.
13. Run Electron-backed visual validation. Verify both Messages and Active Tasks headers use the left Activity-style chevron; compare Active Tasks against Activity/Messages; separately verify Messages default list/detail and message reference preview content are unchanged. If any Messages content/reference files changed, provide before/after screenshot evidence or an equivalent visual baseline comparison. Iterate until acceptable.

## Key Tradeoffs

- References left-only by default keeps the UI closest to Messages and avoids duplicate clutter, but requires users to recognize the left nested file rows as the reference access point. This is acceptable because Messages already teaches that pattern.
- Removing visible task-kind badges reduces clarity for edge cases where a target name is ambiguous, but target names, member rows, status, references, and generic Focus controls are cleaner for the primary scan path; task kind remains available in technical/accessibility metadata.
- Backend event extension is more work than frontend inference, but preserves task ownership and testability.
- Generic viewer shell plus owner-specific wrappers adds small structure, but avoids mixed message/task identity and allows internal reuse without altering Messages output.
- Removing Active Tasks approval buttons may reduce action proximity, but keeps a single approval surface and avoids duplicated approval logic.

## Risks

- Live task reference scenario may not be readily available locally; implementation must create/document a fixture or probe if needed.
- Reference files may be unavailable; preview route/viewer must show clear errors.
- Shared viewer extraction can regress Messages content/reference UX; tests and Electron visual evidence must cover existing Messages list/detail/reference behavior, not just fetch behavior. If exact preservation is uncertain, avoid touching Messages content/reference code.
- Visual acceptability is subjective; implementation must iterate after actual Electron-backed inspection.

## Guidance For Implementation

- Work only in `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui`.
- Treat `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/ui-prototypes/taskagent-team-tab-active-tasks/complete-ux-ui-design.md` as the canonical visible UX source.
- Preserve the existing user-visible Messages section exactly; internal reuse is allowed only when invisible to users.
- Apply the Activity-style left chevron to both Messages and Active Tasks section headers; the earlier both-section chevron requirement remains valid for headers.
- Preserve Messages list/detail/reference content exactly; only the Messages section header disclosure placement changes.
- Do not show visible `Task Agent` / `Task Team` badges in Active Tasks left rows or right detail headers.
- Use visible `Focus` copy, not `Focus agent` / `Focus team`; add target-specific accessible labels/tooltips if needed.
- Do not duplicate task reference rows in the right task detail by default.
- Do not add visible `Task brief` or `Reference files` headings unless an implementation-specific layout is truly ambiguous; prefer Messages-like label-light UI.
- Do not implement task refs by scraping Messages or raw tool-call events.
- Do not use message IDs/routes for task references.
- Do not render Approve/Deny controls in Active Tasks.
- Suggested checks:
  - Frontend targeted tests for Team overview, Active Tasks, Communication panel/viewer visible-regression behavior, projection task-agent/task-team paths.
  - Backend task delegation event/route tests.
  - `git diff --check`.
- Required live UI validation:
  1. Prepare embedded server if needed: `pnpm -C autobyteus-web prepare-server`.
  2. Start Electron-backed dev UI: `BUILD_TARGET=electron pnpm -C autobyteus-web dev`.
  3. Confirm embedded server route from Electron path, expected `http://127.0.0.1:29695`.
  4. Inspect Team tab default state: Messages open with left Activity-style header chevron and existing list/detail content; Active Tasks collapsed with left chevron.
  5. Inspect an existing message reference preview and verify Messages content controls/layout/states remain unchanged.
  6. Inspect Active Tasks: left task navigator, right task body, member focus rows, no visible task-kind badges, generic `Focus` controls, no duplicate right refs.
  7. Click a left task reference row and verify the whole right pane switches to file preview like Messages.
  8. If the UI is cramped/confusing, Active Tasks should be revised; if Messages changed visibly, revert or refactor underneath until Messages is identical.
  9. Handoff must include commands, inspected scenario, screenshots or concise observations, Messages no-visible-change evidence, and iteration notes.
