# Design Spec

## Current-State Read

The in-scope UI is the desktop Team tab right-side panel under `autobyteus-web/components/workspace/team/`.

Current section flow:

- `TeamOverviewPanel.vue` owns top-level Messages/Tasks section expansion and delegates section internals.
- `TeamCommunicationPanel.vue` owns message list/detail state. It already has the desired master/detail split: a left list width state (`leftPaneWidth = 232`), a vertical resize separator, clamp bounds (`168..360`), and direct reference display through `TeamCommunicationReferenceViewer.vue` with no back button.
- `TeamActiveTasksSection.vue` owns task list/detail state. It has a similar master/detail shape, but its navigator is fixed width (`w-[15.5rem]`) and has no resize separator.
- Task reference preview currently flows through `TeamActiveTasksSection.vue -> TeamTaskReferenceViewer.vue -> TeamReferenceFileViewer.vue`. The task wrapper passes `back-label` and emits `back`; the file viewer renders `data-test="team-reference-viewer-back"` when that prop exists. That is the redundant `Back to task` button in the screenshot.
- Clicking a task row already calls `selectTask()`, which clears `selectedReferenceId`. This is already the correct message-like return path from reference preview back to task body.

Coupling/fragmentation observations:

- Horizontal split resize policy is currently embedded inside `TeamCommunicationPanel.vue`. Copying it into `TeamActiveTasksSection.vue` would create duplicated drag/clamp policy.
- The task reference back-button API is a stale UI navigation path. It is only used by the task wrapper and can be removed cleanly.
- There is broader duplication between task and message reference-file viewers/presentation utilities, but full unification is not required to satisfy this request and would expand behavior risk.

## Intended Change

- Extract the existing message horizontal split resizing behavior into a small shared composable.
- Keep the message UI behavior unchanged while moving its resize state/listener logic to the composable.
- Add the same resize affordance to the task split.
- Remove the task reference `Back to task` button path; reference preview remains direct, and selecting the task row returns to task content.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UI consistency improvement
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: `TeamCommunicationPanel.vue` owns local split-resize logic that `TeamActiveTasksSection.vue` now needs. Task preview back navigation is wired through `TeamTaskReferenceViewer.vue` and `TeamReferenceFileViewer.vue`, but message reference preview proves the desired direct-display pattern and task row selection already returns to task content.
- Design response: Extract shared horizontal split resize behavior and decommission task-specific back navigation.
- Refactor rationale: A tiny composable prevents two components from owning identical pointer listener/clamp policy. Removing the back prop/event/button is a clean-cut replacement, not a compatibility wrapper.
- Intentional deferrals and residual risk, if any: Full unification of `TeamReferenceFileViewer.vue` and `TeamCommunicationReferenceViewer.vue`, plus their duplicate reference presentation utilities, is deferred. Residual risk is small because this task only needs task preview to stop rendering back navigation; route-specific content fetching remains correctly separated.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

Read this design as:

1. Team tab task/message split spines.
2. Shared split-resize ownership and task preview cleanup.
3. Concrete file changes and tests.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the task reference back-button UI path instead of hiding it.
- Obsolete in scope:
  - `backLabel` prop and `back` event in `TeamReferenceFileViewer.vue`.
  - `back-label`/`@back` usage and `back` emit in `TeamTaskReferenceViewer.vue`.
  - `@back="selectedReferenceId = null"` usage in `TeamActiveTasksSection.vue`.
  - `TeamActiveTasksSection.back_to_task` locale entries if no production usage remains.
  - Tests that expect clicking a back button to return to task content.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User drags Team task split handle | Task navigator/detail widths update | `TeamActiveTasksSection.vue` using shared resize composable | Delivers requested task slider. |
| DS-002 | Primary End-to-End | User clicks task reference row | Task reference content renders in detail pane | `TeamActiveTasksSection.vue` / `TeamTaskReferenceViewer.vue` | Removes redundant back flow and aligns with messages. |
| DS-003 | Primary End-to-End | User clicks task row while reference preview is open | Task body renders in detail pane | `TeamActiveTasksSection.vue` | Defines replacement return path. |
| DS-004 | Primary End-to-End | User drags Team message split handle | Message list/detail widths update | `TeamCommunicationPanel.vue` using shared resize composable | Ensures existing message behavior survives extraction. |
| DS-005 | Bounded Local | Mouse down on split handle | Mouse up/removal of global listeners | `useHorizontalSplitResize.ts` | Centralizes pointer listener lifecycle and clamp policy. |

## Primary Execution Spine(s)

- DS-001: `Task Split Handle -> useHorizontalSplitResize.startResize -> paneWidth -> TeamActiveTasksSection navigator style -> Task Detail Pane layout`
- DS-002: `Task Reference Row -> TeamActiveTasksSection.selectReference -> selectedReference -> TeamTaskReferenceViewer -> TeamReferenceFileViewer -> FileViewer content`
- DS-003: `Task Row -> TeamActiveTasksSection.selectTask -> selectedReferenceId cleared -> selectedEntry detail branch -> MarkdownRenderer task body`
- DS-004: `Message Split Handle -> useHorizontalSplitResize.startResize -> paneWidth -> TeamCommunicationPanel left list style -> Message Detail Pane layout`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The task section renders a handle between navigator and detail panes. Dragging updates the shared composable width, and the task navigator binds that width inline. | Task split handle, split resize state, task navigator, task detail pane | `TeamActiveTasksSection.vue` | Shared resize listener/clamp policy. |
| DS-002 | The task row owns reference selection. Selecting a reference switches the detail pane to the reference viewer and fetches content through the task content route. | Task reference row, selected reference state, task reference viewer, file viewer | `TeamActiveTasksSection.vue` | Content URL adaptation in `TeamTaskReferenceViewer.vue`. |
| DS-003 | Selecting/clicking the task row clears the selected reference and returns the detail pane to the task body. | Task row, selected task state, selected reference state, task detail renderer | `TeamActiveTasksSection.vue` | Markdown rendering and focus controls. |
| DS-004 | Message resizing keeps the same visible behavior, but listener/clamp logic comes from the shared composable. | Message split handle, split resize state, message list, message detail pane | `TeamCommunicationPanel.vue` | Shared resize listener/clamp policy. |
| DS-005 | The composable owns drag lifecycle: start coordinates, width calculation, clamping, global listener registration, cleanup on mouseup/unmount. | Start resize, mousemove, clamp, paneWidth, cleanup | `useHorizontalSplitResize.ts` | None; it must stay UI-policy-only. |

## Spine Actors / Main-Line Nodes

- `TeamOverviewPanel.vue`: section composer; not a split/detail owner.
- `TeamCommunicationPanel.vue`: message split and message/reference selection owner.
- `TeamActiveTasksSection.vue`: task split and task/reference selection owner.
- `useHorizontalSplitResize.ts`: shared bounded local resize policy owner.
- `TeamTaskReferenceViewer.vue`: task reference content route adapter.
- `TeamReferenceFileViewer.vue`: task reference file display owner.
- `TeamActiveTaskRow.vue`: task row/reference row event source.

## Ownership Map

- `TeamOverviewPanel.vue` owns only top-level Team section expansion/collapse and focused-member routing into child panels.
- `TeamCommunicationPanel.vue` owns message perspective rendering, selected message/reference state, and message detail branch selection. It remains the public component boundary for message split UI.
- `TeamActiveTasksSection.vue` owns active task entry rendering, selected task/reference state, task detail branch selection, and focus event emission. It remains the public component boundary for task split UI.
- `useHorizontalSplitResize.ts` owns horizontal split drag state and listener cleanup. It must not know about messages, tasks, Team context, references, or file content.
- `TeamTaskReferenceViewer.vue` owns only conversion from task identity (`teamRunId`, `taskId`, `referenceId`) to the task reference content URL.
- `TeamReferenceFileViewer.vue` owns loading/rendering the passed reference file content URL, file type resolution, raw/preview toggle, and maximize/restore. It must not own task navigation.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TeamTaskReferenceViewer.vue` | `TeamReferenceFileViewer.vue` for display; task REST route for content identity | Adapts task reference identity into a content URL. | Back navigation, task selection state, task detail switching. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `TeamActiveTasksSection.vue` `@back="selectedReferenceId = null"` | Task row selection is the intended return path. | `selectTask()` clearing `selectedReferenceId`. | In This Change | Remove event wiring. |
| `TeamTaskReferenceViewer.vue` `back-label` binding and `back` emit | File preview should not expose task-specific back control. | Direct file display plus task row selection. | In This Change | Wrapper remains for URL adaptation. |
| `TeamReferenceFileViewer.vue` `backLabel` prop, `back` emit, `team-reference-viewer-back` button | No production caller should request a back button after task cleanup. | Header with filename/path plus raw/preview/maximize controls. | In This Change | Clean-cut removal. |
| `TeamActiveTasksSection.back_to_task` locale entries | Production code no longer references them. | N/A | In This Change | Remove from English and Chinese locale files if unused. |
| Back-button test assertions/stubs | They encode the rejected behavior. | Tests for no back button and task-row return. | In This Change | Update task tests. |
| Full task/message reference viewer unification | Broader cleanup outside this UI request. | Future shared reference viewer if needed. | Follow-up | Do not block this fix. |

## Return Or Event Spine(s) (If Applicable)

- Task reference return path is not a special emitted `back` event anymore.
- Replacement event spine: `Task row click -> TeamActiveTasksSection.selectTask -> selectedReferenceId = null -> task body detail branch`.
- Resize completion event spine: `mouseup -> useHorizontalSplitResize.stopResize -> remove window listeners -> preserve current paneWidth`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `useHorizontalSplitResize.ts`
- Chain: `mousedown -> record startX/startWidth -> mousemove -> clamp width -> update paneWidth -> mouseup/unmount -> remove listeners`
- Why it matters: both message and task panels need the same bounded drag lifecycle without duplicating listener cleanup and clamp behavior.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| File content fetching | DS-002 | `TeamReferenceFileViewer.vue` | Fetch bytes from supplied `contentUrl`; resolve text/blob display. | Separates file loading from task selection. | Task section would become a file loader. |
| Task content URL composition | DS-002 | `TeamTaskReferenceViewer.vue` | Build task reference content URL using window-node REST endpoint. | Keeps route identity at task wrapper boundary. | Generic file viewer would need task identity. |
| Markdown task body rendering | DS-003 | `TeamActiveTasksSection.vue` detail branch | Render task description through existing markdown renderer. | Keeps content rendering separate from row selection. | Selection code would mix with presentation details. |
| Focus controls | DS-003 | `TeamActiveTasksSection.vue` | Emit `select-member` for task target/member focus. | Existing task detail action should remain. | Reference preview could accidentally own focus actions. |
| Resize pointer listener cleanup | DS-001, DS-004, DS-005 | `useHorizontalSplitResize.ts` | Add/remove global listeners; clamp width. | Shared UI policy. | Message/task components would duplicate policy. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Team horizontal list/detail split resize | `TeamCommunicationPanel.vue` local resize code | Extend via extraction | Existing behavior is right, but ownership is too local for reuse. | New composable needed because existing generic resize composables are vertical/area-specific. |
| Task reference file display | `TeamReferenceFileViewer.vue` | Reuse/Modify | Already displays task reference content from a supplied URL. | N/A |
| Message reference file display | `TeamCommunicationReferenceViewer.vue` | Reuse unchanged | Already implements desired no-back behavior for messages. | N/A |
| Back-to-task navigation | Existing task back prop/event path | Remove | Redundant and explicitly rejected by user. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Team tab components | Message/task selection, list/detail rendering, task focus actions. | DS-001..DS-004 | `TeamCommunicationPanel.vue`, `TeamActiveTasksSection.vue` | Extend | Add task resizer and remove task back event. |
| Shared frontend composables | Reusable UI state/pointer behavior. | DS-001, DS-004, DS-005 | Message/task panels | Create New | Add focused horizontal split resize composable. |
| File viewer components | Reference content preview/rendering. | DS-002 | `TeamReferenceFileViewer.vue` | Modify | Remove task navigation affordance. |
| Localization | User-facing strings. | DS-002 | Team task components | Modify | Remove obsolete back-to-task key. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/composables/useHorizontalSplitResize.ts` | Shared frontend composables | Horizontal split resize policy | Pane width state, clamped drag lifecycle, cleanup. | Reusable by task/message split panes without domain coupling. | N/A |
| `TeamCommunicationPanel.vue` | Team tab components | Message split/detail owner | Use composable for existing message split width/handle. | Keeps message selection/rendering together. | Yes, resize composable. |
| `TeamActiveTasksSection.vue` | Team tab components | Task split/detail owner | Use composable; render handle; remove back wiring. | Owns task selection/detail branching. | Yes, resize composable. |
| `TeamTaskReferenceViewer.vue` | Team tab components | Task reference URL adapter | Build content URL and pass to file viewer. | Thin task-specific adapter. | Existing file viewer. |
| `TeamReferenceFileViewer.vue` | File viewer components | Task reference display | Display fetched reference content with no task navigation. | Owns generic display for task reference URL. | Existing `FileViewer`. |
| Task/message component tests | Durable coverage | Component behavior checks | Update expected interactions. | Tests should stay near components. | N/A |
| Locale files | Localization | Locale string catalog | Remove unused back key. | Existing locale owner. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Horizontal split drag/clamp/listener cleanup | `autobyteus-web/composables/useHorizontalSplitResize.ts` | Shared frontend composables | Both message and task panels need identical split resize behavior. | Yes | Yes | A Team-specific coordinator or layout god composable. |
| Reference file display/fetching | Existing duplicated task/message viewers | Future candidate only | Full unification is broader than this task. | No | No | In-scope blocker. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `useHorizontalSplitResize` options (`initialWidth`, `minWidth`, `maxWidth`) | Yes | Yes | Low | Keep generic; no message/task fields. |
| Task/message reference file types | Mostly | No | Medium | Defer broader unification; do not expand for this task. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/composables/useHorizontalSplitResize.ts` | Shared frontend composables | Horizontal split resize policy | Export composable returning pane width and resize-start handler with cleanup. | One focused UI behavior reused by two panels. | N/A |
| `autobyteus-web/components/workspace/team/TeamCommunicationPanel.vue` | Team tab components | Message panel | Replace local resize refs/functions with composable; keep template/test behavior. | Selection/rendering remains message-owned. | `useHorizontalSplitResize`. |
| `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | Team tab components | Task panel | Add dynamic navigator width, message-style handle, remove reference viewer `@back`. | Task selection/detail/focus remains one owner. | `useHorizontalSplitResize`. |
| `autobyteus-web/components/workspace/team/TeamTaskReferenceViewer.vue` | Team tab components | Task reference content adapter | Stop passing `back-label`; remove `back` emit; preserve content URL. | Thin adapter only. | `TeamReferenceFileViewer`. |
| `autobyteus-web/components/workspace/team/TeamReferenceFileViewer.vue` | File viewer components | Reference display | Remove `backLabel` prop, `back` emit, back button. | Display component should not own task navigation. | `FileViewer`. |
| `autobyteus-web/localization/messages/en/workspace.ts` | Localization | English workspace messages | Remove `back_to_task` if unused. | Prevent stale locale key. | N/A |
| `autobyteus-web/localization/messages/zh-CN/workspace.ts` | Localization | Chinese workspace messages | Remove `back_to_task` if unused. | Prevent stale locale key. | N/A |
| `autobyteus-web/components/workspace/team/__tests__/TeamCommunicationPanel.spec.ts` | Test coverage | Message panel behavior | Ensure resize/reference tests still pass. | Guards extraction. | N/A |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts` | Test coverage | Task panel behavior | Add resize test; update reference preview return path. | Guards requested behavior. | N/A |
| `autobyteus-web/components/workspace/team/__tests__/TeamTaskReferenceViewer.spec.ts` | Test coverage | Task reference wrapper behavior | Assert content URL and absence of back control. | Guards removed UI path. | N/A |

## Ownership Boundaries

- `TeamCommunicationPanel.vue` and `TeamActiveTasksSection.vue` are peer domain-specific panel owners. They may both use shared UI behavior but should not call into each other.
- `useHorizontalSplitResize.ts` is below both panels and must remain domain-agnostic. It returns state and handlers only.
- `TeamTaskReferenceViewer.vue` adapts task content identity; it must not reach back into `TeamActiveTasksSection.vue` state or emit navigation events.
- `TeamReferenceFileViewer.vue` displays file content from a URL; it must not know whether its caller is a task, message, artifact, or future reference source.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TeamActiveTasksSection.vue` | selected task/reference state, task detail branch, focus emit | `TeamOverviewPanel.vue` | Parent directly clearing selected task reference state. | Add explicit task section props/events only if needed. |
| `TeamCommunicationPanel.vue` | selected message/reference state, message detail branch | `TeamOverviewPanel.vue` | Task code importing message internals for resize. | Extract domain-neutral composable. |
| `useHorizontalSplitResize.ts` | drag listener lifecycle and clamp policy | Task/message panels | Components duplicating same listener/clamp implementation. | Add options to composable. |
| `TeamReferenceFileViewer.vue` | file loading/rendering from supplied content URL | `TeamTaskReferenceViewer.vue` | File viewer emitting task navigation events. | Keep navigation in task section selection. |

## Dependency Rules

Allowed:

- Team panels may import `useHorizontalSplitResize.ts`.
- `TeamActiveTasksSection.vue` may render `TeamTaskReferenceViewer.vue` and `TeamActiveTaskRow.vue`.
- `TeamTaskReferenceViewer.vue` may render `TeamReferenceFileViewer.vue` and use `windowNodeContextStore` to build the task content URL.
- Tests may stub child display components while asserting parent selection behavior.

Forbidden:

- `TeamActiveTasksSection.vue` must not copy/paste message panel resize implementation after the shared composable exists.
- `TeamReferenceFileViewer.vue` must not expose task-specific back navigation.
- `TeamTaskReferenceViewer.vue` must not emit a back event for this behavior.
- `TeamOverviewPanel.vue` must not manipulate task reference selection state.
- Do not introduce dual behavior where task previews sometimes show a back button based on legacy props.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `useHorizontalSplitResize(options)` | Horizontal split resize | Return pane width and resize-start handler. | `{ initialWidth?: number; minWidth?: number; maxWidth?: number }` | No task/message fields. |
| `TeamActiveTasksSection` props/events | Active task section | Render tasks for a team context; emit focus target selection. | `teamContext`, `collapsed`, `select-member(memberRouteKey)` | No back event. |
| `TeamTaskReferenceViewer` props | Task reference content | Adapt task reference identity to URL. | `teamRunId`, `taskId`, `reference`, `refreshSignal` | No back emit. |
| `TeamReferenceFileViewer` props | Reference file display | Display content from URL. | `reference`, `contentUrl`, optional preview controls | No task navigation prop. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `useHorizontalSplitResize` | Yes | Yes | Low | Keep options generic. |
| `TeamTaskReferenceViewer` | Yes | Yes | Low | Remove back emit. |
| `TeamReferenceFileViewer` | Yes after cleanup | Yes | Low | Remove `backLabel`. |
| `TeamActiveTasksSection` | Yes | Yes | Low | Add resize without changing focus contract. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Task panel | `TeamActiveTasksSection` | Yes | Low | Keep. |
| Message panel | `TeamCommunicationPanel` | Yes | Low | Keep. |
| Shared resize composable | `useHorizontalSplitResize` | Yes | Low | Use horizontal because it controls width via horizontal mouse movement. |
| Reference display | `TeamReferenceFileViewer` | Yes | Low | Keep, but remove navigation concern. |

## Applied Patterns (If Any)

- Composable: `useHorizontalSplitResize.ts` for reusable UI state and event-listener lifecycle inside component owners.
- Adapter: `TeamTaskReferenceViewer.vue` remains a thin adapter from task reference identity to a content URL.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/composables/useHorizontalSplitResize.ts` | File | Shared frontend UI composables | Generic horizontal split drag/clamp state. | Existing project places reusable Vue composables here. | Team task/message domain logic. |
| `autobyteus-web/components/workspace/team/TeamCommunicationPanel.vue` | File | Message panel | Message selection/rendering; use shared resize composable. | Existing owner for Team messages. | Duplicated resize listener implementation. |
| `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | File | Task panel | Task selection/rendering/focus; use shared resize composable. | Existing owner for Team tasks. | File loading internals or message-specific logic. |
| `autobyteus-web/components/workspace/team/TeamTaskReferenceViewer.vue` | File | Task reference adapter | Build task reference content URL. | Existing task reference wrapper. | Back navigation. |
| `autobyteus-web/components/workspace/team/TeamReferenceFileViewer.vue` | File | Reference display | Fetch/render supplied reference content URL. | Existing display component. | Task navigation or task selection state. |
| `autobyteus-web/localization/messages/en/workspace.ts` | File | English localization | Workspace strings. | Existing locale catalog. | Unused back-to-task key. |
| `autobyteus-web/localization/messages/zh-CN/workspace.ts` | File | Chinese localization | Workspace strings. | Existing locale catalog. | Unused back-to-task key. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/` | Main-Line Domain-Control / UI composition | Yes | Low | Existing Team tab component folder. |
| `autobyteus-web/composables/` | Off-Spine Concern | Yes | Low | Shared Vue UI behavior belongs here. |
| `autobyteus-web/localization/messages/` | Off-Spine Concern | Yes | Low | Locale strings remain separate. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Task resize reuse | `const { paneWidth: leftPaneWidth, startResize } = useHorizontalSplitResize({ initialWidth: 248, minWidth: 168, maxWidth: 360 })` | Copying `startResize`, `stopResize`, and listener cleanup from `TeamCommunicationPanel.vue` into `TeamActiveTasksSection.vue` | Avoids duplicated drag policy. |
| Return from file preview | `click task row -> selectTask() -> selectedReferenceId = null -> task body` | `TeamReferenceFileViewer -> emit('back') -> TeamActiveTasksSection clears reference` | Matches message behavior and removes redundant UI. |
| File viewer responsibility | `TeamReferenceFileViewer(reference, contentUrl)` | `TeamReferenceFileViewer(reference, contentUrl, backLabel='Back to task')` | Keeps file display independent from task navigation. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `backLabel` prop but stop passing it | Would minimize code deletion. | Rejected | Remove prop/event/button because no production caller remains and user explicitly rejects the control. |
| Add task slider by copying message resize methods | Fastest local patch. | Rejected | Extract `useHorizontalSplitResize.ts` and migrate both panels. |
| Keep `back_to_task` locale keys unused | Avoids locale churn. | Rejected | Remove keys if no production references remain. |
| Make back button optional behind a feature flag | Preserves old behavior. | Rejected | No dual UI flow for in-scope behavior. |

## Derived Layering (If Useful)

UI composition layer:

- `TeamOverviewPanel.vue` composes sections.
- `TeamCommunicationPanel.vue` and `TeamActiveTasksSection.vue` own domain-specific list/detail state.

Shared UI behavior layer:

- `useHorizontalSplitResize.ts` owns generic resize state/listener lifecycle.

Content display layer:

- `TeamTaskReferenceViewer.vue` adapts task route identity.
- `TeamReferenceFileViewer.vue` displays the file content.

## Migration / Refactor Sequence

1. Add `autobyteus-web/composables/useHorizontalSplitResize.ts` with default-compatible behavior:
   - width ref initialized from `initialWidth`
   - min/max clamp options
   - `startResize(event: MouseEvent)` using `clientX`
   - listener cleanup on mouseup and unmount
   - optional body cursor cleanup if implemented.
2. Update `TeamCommunicationPanel.vue`:
   - import/use the composable with `initialWidth: 232`, `minWidth: 168`, `maxWidth: 360`
   - remove local `leftPaneWidth`, `removeResizeListeners`, `startResize`, `stopResize`, and `onBeforeUnmount` cleanup.
   - keep template data-test names and handle styling unchanged.
3. Update `TeamActiveTasksSection.vue`:
   - import/use the composable, preferably `initialWidth: 248`, `minWidth: 168`, `maxWidth: 360`
   - replace fixed `w-[15.5rem]` navigator width with `:style="{ width: `${leftPaneWidth}px` }"`
   - add a separator matching message styling with `role="separator"`, `aria-orientation="vertical"`, `data-test="team-active-tasks-resize-handle"`, and `@mousedown="startResize"`
   - remove `@back="selectedReferenceId = null"` from `TeamTaskReferenceViewer`.
4. Update `TeamTaskReferenceViewer.vue`:
   - stop passing `back-label`
   - remove `defineEmits` for `back`.
5. Update `TeamReferenceFileViewer.vue`:
   - remove the back button block
   - remove `backLabel` prop and `back` emit declaration.
6. Remove `TeamActiveTasksSection.back_to_task` locale entries from English and Chinese locale files if `rg "back_to_task"` shows no production references.
7. Update tests:
   - `TeamCommunicationPanel.spec.ts`: existing resize/reference tests should pass; adjust only if composable extraction changes implementation details but not assertions.
   - `TeamActiveTasksSection.spec.ts`: add task resize clamp test; update reference preview test to assert no back button and return via task row click.
   - `TeamTaskReferenceViewer.spec.ts`: assert route fetch and absence of back button; remove emitted-back expectation.
8. Run targeted tests:
   - `cd autobyteus-web && pnpm test:nuxt -- components/workspace/team/__tests__/TeamCommunicationPanel.spec.ts components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts components/workspace/team/__tests__/TeamTaskReferenceViewer.spec.ts`

## Key Tradeoffs

- Extracting a small composable is slightly more work than copying the message resize block, but it prevents duplicated drag/listener policy and protects message/task parity.
- Keeping task reference display separate from message reference display avoids a wider refactor while still removing the rejected back UI.
- Keeping the current task default navigator width (`248px`) preserves existing readability; using the message default (`232px`) would be more visually identical but may unnecessarily shift current task layout.

## Risks

- If the new composable changes subtle message drag behavior, existing `TeamCommunicationPanel.spec.ts` should catch clamp regressions.
- If locale removal misses test-only labels, tests may need local fixture updates.
- Manual visual review is still useful because component tests can verify structure/behavior but not the full drag feel in the desktop shell.

## Guidance For Implementation

- Keep the task resize handle visually identical to the message handle unless there is a strong local styling reason.
- Do not add a new "back", "close", or breadcrumb control for task file previews.
- Treat clicking the task row as the only in-panel return-to-task action.
- Keep the task `Focus` button only in task-detail mode; file preview mode should remain focused on file content and generic viewer controls.
- Prefer targeted component tests before broader test runs.
