# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Improve the right-side Team tab UI for TaskAgent and TaskAgent-team active work so it feels as clean and efficient as the existing Messages UI while preserving task ownership, task focus behavior, and Activity-owned approval semantics.

The final UX direction is:

- Messages opens by default, uses the Activity-style left disclosure chevron in its section header, and keeps its message list/detail/reference experience unchanged from the pre-task baseline.
- Active Tasks is collapsed by default and shows a human task count (`2 tasks`, not `2 Active`).
- Active Tasks opens as a Messages-like master/detail layout.
- Active Tasks primary UI uses target names and task body, not visible `Task Agent` / `Task Team` badges.
- The left navigator owns task selection and task reference-file rows.
- The right pane shows either the selected task body or, after clicking a left-side reference row, the selected reference file preview.
- Reference rows are **not duplicated in the right task detail by default**.
- Active Tasks never renders Approve/Deny controls.
- Implementation must run the Electron-backed frontend/backend and visually iterate until the UI is acceptable.

## Investigation Findings

- The right-side Team tab is rendered by `autobyteus-web/components/layout/RightSideTabs.vue` and `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue`.
- Activity tab section behavior is the comparator: `ProgressPanel.vue` owns section state, initializes one section open, and child panels use leading SVG disclosure icons before titles with counts on the right.
- Existing Team tab behavior drifted from Activity: Team headers used trailing text chevrons and Active Tasks owned child-local expansion/auto-open behavior.
- Messages UI is the UX model: `TeamCommunicationPanel.vue` shows a left list of messages with nested reference rows; clicking a reference switches the right pane to the file preview.
- Existing Active Tasks projection loses task reference files and original delegation data: `teamTaskExecutionProjection.ts`, `AgentTeamContext.ts`, and `teamActiveTaskEntries.ts` only carry task identity/label/description/target/status.
- Backend task delegation already stores `TaskDelegationRecord.referenceFiles` from `delegate_task.reference_files`, but `TaskDelegationEventPublisher` does not emit reference files or normalized original delegation data in `TASK_DELEGATION_EVENT` payloads.
- The current `delegate_task` input shape is `target`, `description`, and `reference_files`; future structured input may be carried as normalized `taskArguments`, but that must remain secondary UI data.
- The implementation engineer already produced pre-gap UI changes; the requirement/design now need a clean rework before downstream implementation resumes.
- A second implementation gap clarified that Messages content/reference UX is already correct from the user's perspective and is now a hard no-visible-change invariant for message list rows, nested reference rows, detail pane, reference preview controls/layout/states, selected states, spacing, and behavior.
- The latest user clarification supersedes the earlier Messages-header freeze: the Messages section header should still get the Activity-style left chevron, like Activity. Only the Messages content/reference experience remains frozen.
- A third live-validation gap clarified that visible `Task Agent` / `Task Team` labels add clutter in Active Tasks. The primary UI should identify tasks by target name, task body/preview, status when useful, and explicit Focus actions; task kind remains internal/technical detail only.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): UI behavior change / UI quality bug fix with bounded task-metadata feature.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing invariant for Team section header pattern and Active Tasks section state; shared structure looseness for task metadata DTO/projection; boundary risk if task refs are sourced from Messages instead of task delegation; legacy/compatibility pressure if a shared extraction changes the already-correct Messages content/reference UI.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed.
- Evidence basis: Activity tab already has the desired left disclosure/header pattern for section headers; Messages already has the desired reference-row/preview interaction and its content/reference UI must remain visually unchanged; latest user clarification says the Messages header left chevron remains valid; live validation showed visible task-kind labels can clutter Active Tasks because target names and Focus controls already communicate the subject; backend task records own task refs but the event/projection path drops them.
- Requirement or scope impact: Requirements include UI-state refactor, Active Tasks master/detail redesign, backend event payload extension, frontend projection/model extension, task-owned reference preview route/viewer reuse, and live Electron visual verification.

## Recommendations

- Treat Messages content/reference UX as a frozen user-visible baseline, while intentionally updating the Messages section header disclosure to the Activity-style left chevron.
- Reuse Messages interaction semantics, not message ownership or visible implementation: references appear as nested rows under the selected task in the left navigator; clicking a reference switches the whole right pane to file preview.
- Keep task domain language in data/model names (`taskDescription`, `taskReferenceFiles`, `taskArguments`, task kind/type) while keeping visible UI label-light; do not show `Task Agent` / `Task Team` badges in primary Active Tasks UI.
- Make `TeamOverviewPanel.vue` own the Team section expansion state and render Activity-style left chevrons for both Messages and Active Tasks headers, while preserving Messages list/detail/reference content.
- Treat Active Tasks as a task-reading/focus surface only; Activity remains the action surface for runtime approvals.
- Emit task refs/original delegation data from the backend task delegation owner through `TASK_DELEGATION_EVENT`; do not infer it from messages or scrape raw tool calls in frontend UI code.
- Extract/genericize only reusable reference viewer/presentation internals when Messages list/detail/reference content remains visually/behaviorally identical; the intentional Messages header chevron change is handled separately by the Team section header owner. Keep message and task route wrappers owner-specific.
- Require implementation handoff evidence from the Electron-backed UI and visual iteration.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

Rationale: the visible UI surface is localized to the right-side Team tab, but satisfying the final task-reference UX requires bounded backend event/content-route changes and frontend projection/model/viewer changes.

## In-Scope Use Cases

- `UC-001`: User opens a team run and sees Messages expanded by default with an Activity-style left disclosure chevron in the Messages header, message detail visible when messages exist, and unchanged Messages list/detail/reference content from the pre-task baseline.
- `UC-002`: User sees Active Tasks collapsed below Messages with a leading disclosure icon and `N tasks` count.
- `UC-003`: User opens Active Tasks and sees a Messages-like split layout.
- `UC-004`: User selects a task assigned to an individual target and reads the task body in the right pane without a visible task-kind badge.
- `UC-005`: User selects a task assigned to a group/team target and reads the task body, then focuses the target or a child member from explicit focus controls without a visible task-kind badge.
- `UC-006`: User sees task reference files as nested rows under the selected task in the left navigator.
- `UC-007`: User clicks a task reference row and the whole right pane switches to a read-only file preview, like Messages.
- `UC-008`: User returns from reference preview to the selected task body.
- `UC-009`: User sees a calm status when a task is waiting for Activity-owned approval/action but never sees Approve/Deny controls in Active Tasks.
- `UC-010`: User optionally opens `Technical details` for IDs/provenance without losing the clean primary task view.
- `UC-011`: Implementation engineer runs the Electron-backed app and iterates visually until the Team tab UI is acceptable.
- `UC-012`: Implementation engineer verifies that the Messages header has the Activity-style left chevron while existing Messages list, nested reference rows, detail pane, and reference preview remain visually/behaviorally unchanged after any internal reuse.

## Out of Scope

- Reframing delegated tasks as messages or using message history as the authoritative task metadata source.
- Reconstructing task metadata by scraping raw frontend tool-call lifecycle events.
- Showing or submitting Approve/Deny controls from Active Tasks.
- Adding per-task auto-approve controls.
- Reintroducing center-pane active-task strips.
- Redesigning the full Activity tab beyond using it as comparator.
- Persisted historical completed-task reference browsing if existing run-history models do not already support it.
- Broad right-panel or shared-header component refactors not needed for this Team tab change.
- Any user-visible Messages content/reference redesign, including changing list/reference-row styling, selected states, detail layout, message body rendering, or reference preview controls/layout/states. The Messages header left chevron is explicitly in scope.
- Visible `Task Agent` / `Task Team` badges or labels in Active Tasks left rows or right detail headers.
- Visible target-type wording in primary Focus button labels such as `Focus agent` or `Focus team`; use generic `Focus` with accessible labels/tooltips if needed.

## UI Design Source Of Truth

Canonical pure-text UI/UX contract:

- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/ui-prototypes/taskagent-team-tab-active-tasks/complete-ux-ui-design.md`

Supporting text artifacts:

- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/ui-prototypes/taskagent-team-tab-active-tasks/experience-story.md`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/ui-prototypes/taskagent-team-tab-active-tasks/ui-behavior-test-matrix.md`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/ui-prototypes/taskagent-team-tab-active-tasks/ui-design-spec.md`

If implementation details appear ambiguous, the canonical complete UX/UI design file wins for visible behavior.

## Functional Requirements

- `REQ-001` Messages and Active Tasks section headers must use an Activity-style leading disclosure icon before the title and lightweight count/status metadata at the right; no trailing text chevron after the count. This header restyle applies to both section headers.
- `REQ-002` `TeamOverviewPanel.vue` must own Team tab section expansion state and section header rendering. Initial expanded section must be `messages`; this ownership must not change user-visible Messages list/detail/reference content.
- `REQ-003` Messages must remain opened by default for a selected team run; when messages exist, the message detail pane must be populated automatically exactly as in the pre-task baseline, while the section header follows `REQ-001`.
- `REQ-004` Active Tasks must remain visible as a collapsed header by default and show a human task count (`0 tasks`, `1 task`, `2 tasks`).
- `REQ-005` Opening Active Tasks must show a Messages-like master/detail layout: left task navigator, right selected-task body or selected-reference preview.
- `REQ-006` Active task rows must use compact, label-light task presentation centered on target name, brief task preview, and low-emphasis status only when useful. They must not show visible `Task Agent` / `Task Team` badges, visible target-type labels, or raw task IDs by default.
- `REQ-007` Selecting a task row must select it for reading only; it must not focus the agent/team execution and must not submit any approval action.
- `REQ-008` The right task detail must show a compact header with target name, low-emphasis status when useful, and a generic visible `Focus` action in one header/action area. It must not show visible task-kind labels/badges and must not render a separate task-label row such as `Review implementation [Focus team]`.
- `REQ-009` Task body rendering must be message-like and label-light. `Task brief` is an internal/component term and should not be a required visible heading.
- `REQ-010` For group/team-target tasks, the right detail must show member focus rows as primary controls below the task body when member data exists, with explicit per-member generic `Focus` actions.
- `REQ-011` Task reference files must appear as nested rows under the selected task in the left navigator, matching Messages reference-row behavior. They must not be duplicated in the right task detail by default and must not be hidden in `Technical details`.
- `REQ-012` Clicking a left-navigator task reference row must select/highlight that row and switch the whole right pane to a read-only reference preview using shared FileViewer-style behavior from Messages where possible.
- `REQ-013` Reference preview must support Back to task body, maximize/restore, raw/preview mode where supported, loading, unavailable, forbidden, and error states consistent with Messages reference behavior.
- `REQ-014` Backend task delegation events must carry task reference files and normalized original delegation data (`taskArguments`) from `TaskDelegationRecord` / normalized delegate-task input.
- `REQ-015` Frontend projection must propagate `taskReferenceFiles` and `taskArguments` through `TaskDelegationProjectionDetails`, `TeamMemberNodeBase`, `ActiveTaskEntry`, and Active Tasks rendering.
- `REQ-016` Active Tasks may expose non-empty original delegation data only inside optional collapsed `Technical details`; it must not expose `arguments` as primary UI copy or use details as the reference-file access path.
- `REQ-017` Active Tasks must never present Approve/Deny controls. Pending approvals remain handled through Activity; Active Tasks may show only calm status/notice copy such as `Waiting approval` or `Waiting for user action`.
- `REQ-018` Delegated TaskAgent/TaskTeam executions must inherit effective auto-approve/manual approval policy from the team/member run configuration unless a separate backend policy change is explicitly approved.
- `REQ-019` The Team tab layout must preserve full-height right-panel behavior with `min-h-0`/overflow boundaries so Messages/Active Tasks do not create nested scroll traps.
- `REQ-020` Relevant frontend/backend tests must cover Messages and Active Tasks section header placement, Active Tasks section state, task metadata projection, task reference rows/preview, member focus, absence of Active Tasks approval controls, unchanged Messages content/reference behavior, and task-kind label removal.
- `REQ-021` Implementation must perform live visual validation with the Electron-started backend/server and iterate if the UI is not visually acceptable.
- `REQ-022` Messages list/detail/reference content must remain visually and behaviorally unchanged from the pre-task baseline: message list rows, nested reference rows, selected states, detail pane, message body rendering, reference preview controls/layout/states, loading, unavailable, forbidden, and error states. The only intentional Messages visible change is the section header disclosure placement required by `REQ-001`.
- `REQ-023` Shared reference viewer/presentation extraction may touch Messages only when it preserves the exact visible Messages list/detail/reference content, including row structure/classes/spacing/control placement and preview controls/layout/states. If exact preservation is uncertain, keep the existing Messages content path stable and build task-specific reuse separately.
- `REQ-024` Active Tasks must keep task kind/type available only as internal data or collapsed `Technical details` when useful for debugging/accessibility; it must not be required for primary visual comprehension. Visible Focus button text should be `Focus`; accessible labels/tooltips may include the concrete target name.

## Acceptance Criteria

- `AC-001` Messages and Active Tasks headers show a leading Activity-style disclosure icon and no trailing `▾`/`▸` text chevron after the count.
- `AC-002` Initial Team tab render opens Messages and collapses Active Tasks.
- `AC-003` Messages auto-selects and displays message detail when messages exist; Messages list/detail/reference-row behavior remains the same as the pre-task baseline while the header uses the `AC-001` left chevron.
- `AC-004` Active Tasks collapsed header shows `N tasks`, not `N Active`.
- `AC-005` Clicking Active Tasks opens it and collapses Messages; clicking Messages opens it and collapses Active Tasks, following parent-owned section state.
- `AC-006` Opening Active Tasks shows a split layout with a left task navigator and right content pane.
- `AC-007` Selecting an individual-target task shows compact target/status/Focus header and rendered task body on the right; no visible `Task Agent` badge and no `Task brief` heading are shown.
- `AC-008` Selecting a group/team-target task shows compact target/status/Focus header, rendered task body, and member Focus rows on the right; no visible `Task Team` badge and no separate task-label/focus header row appear.
- `AC-009` Selecting a task does not change workspace focus. Clicking explicit generic `Focus` controls for the target or a member changes focus and leaves the selected task visible.
- `AC-010` Task references appear as nested rows under the selected task in the left navigator with icon, filename, tooltip/full path affordance, keyboard focusability, and selected state.
- `AC-011` The selected task's right detail does not duplicate reference rows by default.
- `AC-012` Clicking a task reference row switches the whole right pane to the reference preview; Back returns to the selected task body.
- `AC-013` Reference preview uses shared FileViewer-style behavior and handles loading/unavailable/error states clearly.
- `AC-014` A `TASK_DELEGATION_EVENT` containing task reference files and original delegation data yields populated `ActiveTaskEntry.taskReferenceFiles` and `ActiveTaskEntry.taskArguments` for TaskAgent and TaskTeam projections.
- `AC-015` Technical details, when useful, is collapsed by default and shows only secondary IDs/provenance; it is not the reference-file access path.
- `AC-016` Active Tasks never renders Approve/Deny controls or per-task auto-approve toggles.
- `AC-017` Waiting approval/action appears only as calm status/notice copy and points users to Activity when needed.
- `AC-018` Existing Messages list/detail/reference UX remains unchanged after any shared viewer/presentation extraction: message list, nested reference rows, selected states, detail pane, reference preview controls/layout/states, loading, unavailable, forbidden, and error states. The Messages header chevron follows `AC-001`.
- `AC-019` Frontend component/projection tests and backend event/route tests or equivalent executable checks are updated for the new behavior.
- `AC-020` Implementation handoff includes Electron-backed visual validation evidence: startup commands, route/scenario inspected, screenshots or concise observations, Messages left-chevron header evidence, Messages content/reference no-change evidence, and iteration notes if changes were made after inspection.
- `AC-021` Active Tasks primary UI contains no visible `Task Agent` / `Task Team` labels in left task rows or right detail headers; status remains low-emphasis and only useful, and visible Focus controls say `Focus`.

## Constraints / Dependencies

- Work in `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui` on branch `codex/taskagent-team-tab-ui`.
- Preserve the right-side Team tab as the delegated task visibility surface.
- Preserve the user-visible Messages list/detail/reference content exactly from the user's perspective when extracting/genericizing reference viewer pieces. The Messages section header left chevron is in scope and the earlier both-section chevron requirement remains valid for section headers.
- Use task delegation event payload/projection as authoritative task metadata source.
- Use task-owned reference content route/wrapper; do not fake message IDs for task references.
- Respect Activity-owned approval boundaries.
- Implementation live validation should use `BUILD_TARGET=electron pnpm -C autobyteus-web dev` after server preparation if needed.

## Assumptions

- Task reference content can be resolved for active task records by `teamRunId`, `taskId`, and `referenceId` or equivalent stable identity.
- If a local live run with references is unavailable, implementation may create a minimal delegation scenario or use a documented fixture/probe for visual inspection.
- Existing `FileViewer` behavior is sufficient for supported file types after route-independent extraction.
- `taskArguments` is a normalized input/provenance snapshot, not a new primary user-facing task body.

## Risks / Open Questions

- Live TaskAgent/TaskTeam data with reference files may be hard to create locally; mitigation: create a minimal reference-file delegation scenario or document a fallback fixture for visual validation.
- Extracting reference viewer code can regress Messages content/reference UX; mitigation: keep message wrapper stable, run message reference tests, and provide Electron visual evidence for the default Messages list/detail and message reference preview against the pre-task baseline/current approved Messages content UX.
- Reference paths may be invalid, non-absolute, deleted, or forbidden; mitigation: keep rows visible and show clear preview error/unavailable states.
- Visual acceptability is subjective; mitigation: compare Active Tasks against Messages/Activity while keeping Messages content/reference UX unchanged, remove clutter such as task-kind badges, and require visual iteration.

## Requirement-To-Use-Case Coverage

| Requirement | Use Case(s) |
| --- | --- |
| `REQ-001` | `UC-001`, `UC-002` |
| `REQ-002` | `UC-001`, `UC-002`, `UC-003` |
| `REQ-003` | `UC-001` |
| `REQ-004` | `UC-002` |
| `REQ-005` | `UC-003` |
| `REQ-006` | `UC-004`, `UC-005` |
| `REQ-007` | `UC-004`, `UC-005`, `UC-009` |
| `REQ-008` | `UC-004`, `UC-005` |
| `REQ-009` | `UC-004`, `UC-005` |
| `REQ-010` | `UC-005` |
| `REQ-011` | `UC-006` |
| `REQ-012` | `UC-007`, `UC-008` |
| `REQ-013` | `UC-007`, `UC-008` |
| `REQ-014` | `UC-006`, `UC-007`, `UC-010` |
| `REQ-015` | `UC-006`, `UC-007`, `UC-010` |
| `REQ-016` | `UC-010` |
| `REQ-017` | `UC-009` |
| `REQ-018` | `UC-009` |
| `REQ-019` | `UC-003` |
| `REQ-020` | All implementation-verifiable use cases |
| `REQ-021` | `UC-011`, `UC-012` |
| `REQ-022` | `UC-001`, `UC-012` |
| `REQ-023` | `UC-001`, `UC-007`, `UC-012` |
| `REQ-024` | `UC-004`, `UC-005`, `UC-010` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| `AC-001` | Verifies both Messages and Active Tasks use the Activity-style left header chevron. |
| `AC-002` | Verifies Messages default initial state. |
| `AC-003` | Verifies message detail is readable by default and Messages content/reference behavior remains baseline. |
| `AC-004` | Verifies non-redundant Active Tasks count copy. |
| `AC-005` | Verifies parent-owned Team section accordion behavior. |
| `AC-006` | Verifies Active Tasks master/detail layout. |
| `AC-007` | Verifies individual-target selected-detail behavior without visible task-kind label. |
| `AC-008` | Verifies group/team-target selected-detail/member-focus behavior without visible task-kind label. |
| `AC-009` | Verifies selection and generic Focus controls remain distinct. |
| `AC-010` | Verifies task references live in the left navigator like Messages. |
| `AC-011` | Verifies right task detail stays clean and does not duplicate refs. |
| `AC-012` | Verifies reference click switches right pane to preview. |
| `AC-013` | Verifies file-preview behavior and error states. |
| `AC-014` | Verifies task metadata event/projection path. |
| `AC-015` | Verifies Technical details is secondary and safe. |
| `AC-016` | Verifies Activity remains approval action surface. |
| `AC-017` | Verifies calm waiting status copy. |
| `AC-018` | Verifies Messages content/reference regression safety while allowing the intentional header chevron update. |
| `AC-019` | Verifies executable coverage scope. |
| `AC-020` | Verifies mandatory live visual validation. |
| `AC-021` | Verifies task-kind label removal and final uncluttered Active Tasks visual language. |

## Approval Status

Requirements are refined after user discussion on final UX direction and subsequent implementation gaps. The user confirmed the cleaner Active Tasks version: task references show under the selected task in the left navigator, not repeated in the right detail by default; clicking a reference shows file content in the right pane like Messages. The user clarified that Messages content/reference UX is excellent and must remain unchanged, but the Messages section header still needs the Activity-style left chevron. Round 3 live validation further clarified that visible `Task Agent` / `Task Team` labels are unnecessary clutter; Active Tasks should identify work by target name, task body/preview, useful status, references, and generic Focus controls.
