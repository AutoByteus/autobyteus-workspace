# Team Task Conversation UI — Requirements

## Status

`Refined — user-approved; final solution package review pending`

## Goal / Problem Statement

The Team tab currently treats a delegated task mostly as a description plus initial reference files. The durable task record already contains the task lifecycle—submission, review, revision request, resubmission, acceptance, interruption, timestamps, and update-owned reference files—but the task UI drops that information. As a result, users cannot read what happened to a task or understand its present state without inspecting technical data elsewhere.

The current task description row, its nested reference files, the resizable list/detail layout, and the right-side reference preview are already good and must remain the interaction baseline. The desired change is a focused extension: add each submitted result and review/revision update beneath its owning task as another message-like selectable item in the left navigator. The complete lifecycle sequence always stays on the left. Selecting a task, result, or review changes only the right pane to that item's full content; selecting one of that item's reference files changes only the right pane to the existing preview.

Human-readable participants, current task status, result/review labels, timestamps, and update-owned reference files must be primary. The existing `Technical details` disclosure, raw routing JSON, task/run IDs, target-kind values, and other internal execution metadata must be removed from the task UI entirely. The Messages section itself is explicitly excluded from production changes.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | The focused member's related tasks appear in the Tasks section as description rows with initial reference files; task lifecycle status and update history are not visible. | Preserve the current task row/reference presentation and add a compact meaningful lifecycle badge plus message-like update rows beneath the task. | Task visibility remains scoped to the focused member's exact relationship to the task; existing task description/reference interaction remains. | REQ-002–REQ-004; AC-001–AC-003 |
| BEH-002 | Selecting a task shows its original description as rendered Markdown, while selecting its reference shows the existing preview. | Preserve that behavior. The complete task timeline remains visible only in the left navigator; selecting a submitted-result or review row changes the right pane to that one update's full Markdown content and readable actor/timestamp header. The right pane never becomes a second timeline. | The current master/detail split, resizer, task selection, reference selection, and Markdown/reference rendering remain. | REQ-005–REQ-007; AC-004–AC-006 |
| BEH-003 | Live and restored task records already carry `updates` for submissions, reviews, and interruptions, but `deriveDelegatedTaskEntries` discards them before presentation. | Every durable update appears once beneath its task, in recorded order, with a message-style summary, human label, participants, timestamp, decision, and associated reference files. | Backend task lifecycle semantics and status transitions remain authoritative and unchanged. | REQ-006–REQ-010; AC-004–AC-008 |
| BEH-004 | Only the task's initial reference files appear in the task navigator; update-owned reference files are not exposed. The existing task reference route can resolve initial and update-owned references. | Preserve initial references under the task row. Place each update-owned reference directly under its result/review row. Any reference opens through the existing right-side task preview; selecting its owning row returns to that row's content. | Existing content route, preview/loading/error/maximize behavior, and task/reference selection semantics remain. | REQ-009, REQ-011; AC-007–AC-009 |
| BEH-005 | A collapsed `Technical details` disclosure exposes task/run IDs, target metadata, and a raw JSON reconstruction of recipient, description, and reference paths. | Remove the disclosure and every technical row/JSON block from the task UI. Exact IDs remain internal selection/routing keys only. | Internal runtime identity and routing behavior remain unchanged and unexposed. | REQ-012; AC-010 |
| BEH-006 | Messages and Tasks are separate accordion sections; Messages already has the desired message-oriented list/detail UI. | Only Tasks gain message-like submitted-result and review rows. | Messages production code, UI, model, behavior, count, selection, and reference interaction remain completely unchanged. | REQ-001, REQ-013; AC-011–AC-012 |

## Investigation Findings

- `TeamOverviewPanel.vue` owns the mutually exclusive Messages/Tasks expansion and auto-opens Tasks when a retained or newly activated task becomes visible.
- `TeamCommunicationPanel.vue` already provides the useful master/detail pattern: newest-first summaries, readable counterpart direction, timestamps, Markdown detail, reference-file selection, and a resizable divider.
- The task surface is split across `TeamDelegatedTasksSection.vue`, `TeamDelegatedTaskNavigator.vue`, and `TeamDelegatedTaskDetailPane.vue`. The navigator currently renders description, initial references, technical key/value rows, and raw JSON; the detail pane renders only `taskDescription`.
- `TaskDelegationRecordDto` already carries all information required for the requested lifecycle display: `status`, `created_at`, original references, and ordered `submission`, `review`, and `interruption` updates. Review updates identify the reviewed submission and the `accept` or `request_revision` decision.
- Both live `TASK_DELEGATION_EVENT` updates and restored GraphQL task hydration deliver the same full task record. No backend, GraphQL, shared-contract, persisted-schema, or migration change is required.
- The existing task reference REST resolver already searches both original and update-owned references, so the current `TeamTaskReferenceViewer` can preview every task/result/review attachment without a new endpoint.
- The current frontend presentation model mixes runtime Agent status with task lifecycle status and omits participants/updates. This is the in-scope design pressure.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/tickets/in-progress/team-task-conversation-ui/ui-ux-spec.md` | Intended UI/UX behavior, interaction states, content rules, and Markdown wireframes | REQ-001–REQ-015 | AC-001–AC-015 | `Refined` / user-approved behavior basis; final solution package review pending | Defines the approved observable task-conversation experience constrained by these requirements. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/tickets/in-progress/team-task-conversation-ui/task-timeline-ui-prototype.html` | Production-fidelity interactive rendering of two tasks and their click/result states | REQ-003–REQ-014 | AC-001–AC-014 | `Validated` / user-approved behavior basis | Makes the intended left-timeline/right-detail interaction visually reviewable without changing production source. |

## Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`
- Initial design issue signal: `Yes`
- Root cause classification: `Shared Structure Looseness`
- Refactor posture: `Likely Needed`
- Evidence basis: `TaskDelegationRecordDto` has one tight authoritative lifecycle shape, but `DelegatedTaskEntry` projects only the original description/references, stores task status as a formatted string, separately stores runtime Agent status under the generic name `status`, reconstructs duplicated raw JSON, and drops all lifecycle updates. The view components therefore cannot render the authoritative task history cleanly.
- Requirement or scope impact: Replace the loose task entry presentation shape with a task-conversation projection that preserves participants, task lifecycle status, stable selectable task/update items, ordered updates, and item-owned references. Do not change the backend contract or create a second lifecycle source.

## Recommendations

1. Do not modify Messages at all.
2. Preserve the current task row, its initial reference rows, the resizable split, and the right-side task/reference display.
3. Add each submission/review/interruption beneath its task as a message-like selectable row in durable order.
4. Selecting the task row shows the task description; selecting an update row shows that update's full content; selecting a reference shows the existing preview. Reselecting the owning row returns from preview to its content.
5. Use lifecycle badges that reflect user meaning: `In progress`, `Awaiting review`, `Revision requested`, `Accepted`, or `Interrupted`. `Revision requested` is a presentation refinement of authoritative `active` status when the latest update is a revision request.
6. Attach files to the task/result/review row that introduced them and reuse the existing task reference preview.
7. Remove the complete `Technical details` disclosure, including labeled IDs and reconstructed JSON. Exact identities remain internal only.

## Scope Classification

`Medium`

The change is frontend-local, but it reshapes the task presentation model and several coordinated components while covering live updates, restored history, references, accessibility, localization, and multiple lifecycle states.

## In-Scope Use Cases

- UC-001: A focused delegator scans tasks they sent and identifies who owns each task and its current state.
- UC-002: A focused assignee or member of a task Team sees a task assigned to them/their Team and reads the original task and references.
- UC-003: A delegator selects an assignee's submitted-result row and reads its full result and references on the right.
- UC-004: An assignee selects review feedback requesting revision, then sees the later revised-result and acceptance rows in sequence.
- UC-005: A user reads an interrupted task and its reason.
- UC-006: A user opens any task/submission/review reference and returns to the owning item's content.
- UC-007: A user observes a live task transition without reloading.
- UC-008: A user reopens a historical TeamRun and sees the same complete task lifecycle.
- UC-009: A keyboard or assistive-technology user navigates and understands task rows, nested lifecycle rows, status, selected content, and attachments.

## Out of Scope

- Merging ordinary Team messages into a task timeline; messages currently have no task ID association and remain a separate communication system.
- Adding frontend controls to submit, accept, or request revision. This change is a read-only observability redesign.
- Changing `delegate_task`, `submit_task_result`, `review_task_result`, task state-machine semantics, notification behavior, or execution settlement.
- Backend, GraphQL, shared-contract, persistence-schema, or migration changes.
- Redesigning the global workspace tree or main Agent conversation.
- A separate mobile task-navigation redesign; desktop/web Team sidebar behavior is authoritative for this scope.

## Functional Requirements

- **REQ-001 — Messages are untouched:** Tasks and Messages must remain separate Team-tab sections. No Messages production component, presentation model, selection/reference interaction, count, or visible behavior may be changed for this task. The task UI must not infer formal transitions from ordinary messages.
- **REQ-002 — Preserve focused perspective:** The Tasks count/list must include only tasks related to the focused Agent execution under existing delegator/assignee/task-Team membership rules.
- **REQ-003 — Preserve and extend task summaries:** The current description-first task row and its nested initial references must remain. Add a compact text-bearing lifecycle status and readable participant context without replacing the current interaction or exposing raw IDs.
- **REQ-004 — Ordered left-pane task timeline:** Each task's durable updates must appear directly beneath that task in authoritative recorded order in the left task navigator. Preserve the existing task-group order returned by the current Team execution view; do not introduce an independent newest-first or timestamp sort. The full lifecycle sequence must not move to, duplicate into, or render as navigation in the right pane. A stable task/update selection key must preserve the selected item when the full task record changes live.
- **REQ-005 — Right pane is selected detail only:** Selecting the task row must continue to show the full task description in the right pane. Selecting another lifecycle row replaces that detail with only the selected item's content. The right pane may add readable participant, status, and timestamp context, but it must never render the task timeline, become a second navigation surface, or repeat reference-file cards already listed beneath the owning item on the left.
- **REQ-006 — Selectable update rows:** Every submission, review, and interruption must render exactly once as a message-like selectable row in the left navigator beneath its task. Selecting one changes only the right pane to its full content, readable participants, label, decision, and timestamp; all lifecycle rows remain visible on the left.
- **REQ-007 — Human lifecycle labels:** Update rows/details must use human labels: `Result submitted`, `Revised result submitted`, `Revision requested`, `Result accepted`, and `Task interrupted`. Internal update IDs must not appear in normal copy.
- **REQ-008 — Correct participants:** Assignment/review events must be presented as delegator-to-assignee; submission events as assignee-to-delegator; interruption as a system lifecycle event. For a task Team, the Team is the visible assignee unless the contract explicitly identifies a more specific actor.
- **REQ-009 — Item content and references:** Preserve initial references beneath the task row. Render update-owned references beneath the submitted-result or review row that owns them. Each reference row exists only once, beneath its owning left-side item. Task description, result, review comment, and interruption reason must use the existing Markdown renderer when their owning row is selected; selecting a file replaces the right-side item detail with the existing reference viewer rather than adding a second reference list.
- **REQ-010 — Review/submission relationship:** A review must identify the human-readable submission ordinal it reviewed (for example, `Result 1`), and subsequent submissions following a revision request must be labeled as revised results. The UI must derive this from existing ordered updates and exact review/submission linkage without exposing IDs.
- **REQ-011 — Reference navigation:** Selecting any task/update-owned reference must open it in the existing detail preview. Selecting the owning task/result/review row again must return to that item's content; no new backend content route or duplicate file viewer is allowed.
- **REQ-012 — Remove technical details:** Remove the complete task `Technical details` UI and its technical row/JSON construction. Task IDs, AgentRun/TeamRun IDs, target kinds, recipient routing values, and raw arguments must not render anywhere in the task navigator or detail pane.
- **REQ-013 — Preserve surrounding task behavior:** Messages/Tasks accordion behavior, automatic opening of Tasks for visible retained/new tasks, split resizing, current task/reference selection, and current empty state must not regress. Messages remain excluded from production changes under REQ-001.
- **REQ-014 — Non-happy paths and accessibility:** Empty, reference-loading, reference-error, accepted/interrupted read-only, focus-visible, keyboard activation, status semantics, and accessible task/update labeling must follow the UI/UX specification. Status may not rely on color alone.
- **REQ-015 — Localization:** All new user-visible labels and fallback messages must be added consistently to English and Simplified Chinese catalogs.

## Acceptance Criteria

- **AC-001:** Given related tasks in different lifecycle states, each existing description-first task row and initial reference list remains recognizable and functional, with added readable participant context and text status but no raw task/run IDs.
- **AC-002:** `active` with no outstanding revision renders `In progress`; `awaiting_review` renders `Awaiting review`; `active` whose latest update is `request_revision` renders `Revision requested`; `accepted` renders `Accepted`; `interrupted` renders `Interrupted`.
- **AC-003:** When the selected task receives a live full-record update, the same task or selected lifecycle item remains selected by stable identity and each new update appears exactly once. Existing task groups retain the order supplied by `listTaskHistoryRows()`; a newly observed task follows the current append behavior.
- **AC-004:** A newly delegated task retains the current behavior: selecting the task shows its full Markdown description, and its original references remain nested under the task row and open on the right.
- **AC-005:** A `submit → request_revision → resubmit → accept` record renders in the left navigator beneath the task, in order: `Result submitted`, `Revision requested`, `Revised result submitted`, and `Result accepted`. No lifecycle list is rendered in the right pane.
- **AC-006:** Selecting each left-side lifecycle row keeps the complete timeline in place on the left and shows only that row's full Markdown content and readable actor/timestamp header on the right. No right-side reference section duplicates the owning item's left-side file rows. A review names the reviewed result ordinal; acceptance with no comment still shows meaningful acceptance content.
- **AC-007:** Initial references remain under the task row. Submission and review references appear under their respective lifecycle rows. Interruption displays its reason and no invented reference area.
- **AC-008:** A live `TASK_CHANGED` replacement updates task status and nested update rows once without refresh or duplicates; a hydrated historical record renders the same rows/content.
- **AC-009:** Clicking any task/update reference on the left opens the existing task reference viewer on the right; clicking its owning row returns to that item's content. The existing filename/path header, icon-only raw/preview controls, loading/error behavior, and maximize/restore behavior remain; no visible `Preview`/`Raw` text tabs are introduced.
- **AC-010:** No task `Technical details` disclosure, technical ID row, target metadata row, or raw task-argument JSON exists in the rendered task UI.
- **AC-011:** No Messages production source is changed; message list/detail behavior, selection, references, and count remain unchanged, and ordinary Team messages never appear as task lifecycle rows.
- **AC-012:** Existing focused-member filtering, Tasks auto-open behavior, section expansion ownership, and split-pane resizing remain unchanged.
- **AC-013:** Task rows, nested lifecycle rows, badges, disclosures, and reference controls have usable keyboard focus, semantic labels, and status text independent of color.
- **AC-014:** With no related tasks, the existing empty state remains centered and understandable; accepted/interrupted tasks remain readable and visibly terminal.
- **AC-015:** English and Simplified Chinese catalog coverage exists for every new visible label and fallback.

## Constraints / Dependencies

- Vue 3/Nuxt component and colocated Vitest patterns in `autobyteus-web`.
- Authoritative task shape: `TaskDelegationRecordDto` in `autobyteus-team-stream-contracts/src/team-task-message-dtos.ts`.
- Live owner: `TeamExecutionViewState` replaces a task record on `TASK_DELEGATION_EVENT`.
- Restored owner: `GetTaskDelegationRecords` plus `taskDelegationGraphqlDtoProjection.ts`.
- Existing task content endpoint: `/team-runs/:teamRunId/task-delegations/:taskId/references/:referenceId/content`.
- Existing `MarkdownRenderer`, `TeamTaskReferenceViewer`, reference-file presentation, and horizontal split-resize behavior must be reused.
- No compatibility-only dual presentation or legacy JSON fallback.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Root TeamRun `task_delegation_records.json`; live/restored DTO carries the same current-schema record.
- Required outcome: `Not Affected`
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve all task records unchanged; consume already-present updates and references in the frontend projection.
- Unacceptable data loss or corruption: Any omitted, duplicated, reordered, or mis-associated lifecycle update/reference in presentation.
- Relevant availability, maintenance-window, or rollout constraints: None; no stored transformation or deployment migration.
- Related requirement and acceptance-criteria IDs: REQ-006–REQ-011; AC-004–AC-009.

## Assumptions

- The request targets the desktop/web Team sidebar shown in the supplied screenshot.
- “Revision” means a formal `request_revision` review followed by a later `submit_task_result` update.
- The current durable `updates` order is authoritative and each review's `reviewed_submission_id` resolves to an earlier submission under the validated task contract.
- Task Team results should be attributed to the readable task Team in this UI because the task update DTO does not carry a distinct submitting member identity.
- This design is display-only; task lifecycle actions remain Agent-tool driven.

## Risks / Open Questions

- The user approved the nested message-like row design: keep the current task row/references, add selectable result/review rows below it, and show the selected item's full content on the right.
- The user explicitly requires complete removal of Technical details because internal execution metadata is not meaningful to the ordinary user.
- Very long task histories could make the left task group large; the initial design uses ordinary navigator scrolling and does not add collapse/pagination until real volume evidence requires it.
- For a task Team, the exact human/Agent member that submitted a result is not present in the update DTO. The UI must not invent one.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| REQ-001 | UC-001–UC-009 |
| REQ-002 | UC-001, UC-002, UC-007, UC-008 |
| REQ-003–REQ-005 | UC-001, UC-002, UC-005, UC-007, UC-008 |
| REQ-006–REQ-010 | UC-002–UC-005, UC-007, UC-008 |
| REQ-011 | UC-006 |
| REQ-012 | UC-001–UC-006 |
| REQ-013 | UC-001–UC-008 |
| REQ-014 | UC-005, UC-006, UC-009 |
| REQ-015 | UC-001–UC-009 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001–AC-003 | Task discovery, state recognition, preservation of current task-group order, and stable live selection. |
| AC-004 | Initial active task with description and assignment references. |
| AC-005–AC-007 | Full formal review/revision cycle and event-owned content/references. |
| AC-008 | Live/restored parity using the existing authoritative task record. |
| AC-009 | Existing reference preview and return interaction. |
| AC-010 | Internal-data de-emphasis. |
| AC-011–AC-012 | Preservation of message and surrounding Team-tab behavior. |
| AC-013–AC-015 | Accessibility, empty/terminal states, and localization completeness. |

## Approval Status

The requirements and UI behavior basis were explicitly approved by the user on 2026-08-20 after iterative review of the interactive prototype. Approval includes unchanged Messages, complete Technical details removal, persistent left-side task timelines, selected task/update detail on the right, single-instance reference rows on the left, and the existing icon-only reference viewer on the right after a file is selected.

The user separately requires a final review of the completed, aligned solution package before architecture review. Do not route downstream until the user reviews that completed package and explicitly instructs the solution designer to continue to architecture review.
