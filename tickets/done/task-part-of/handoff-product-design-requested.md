# Handoff — Product Design Requested (New Request) — task-part-of

- Classification: `Product Design Requested`, purpose `New Request`.
- Package identifier: `task-part-of`; Project Task `autobyteus-171` ("Task relationships, step 2: a "part of" relationship between Project Tasks").
- Current solution revision: `SR-003` (SR-003 adds only the user's no-compatibility decision; nothing in it affects the UI).
- From: Solution Designer. Returned to: `/project_task_manager` (the delegating agent). No handoff rule covers Product design, so the Project Task Manager dispatches the design work to the Product Team. The Solution Designer does not prescribe a Product mode, repository work or process.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-part-of`, branch `codex/task-part-of`, base `origin/personal@cba6b85122`, finalization target `origin/personal`. Ticket folder `tickets/in-progress/task-part-of/` (not committed yet).

## Original request (the user's direction, through the Project Task Manager, 2026-10-19)

Add a "part of" relationship next to `depends on`, "because it will make Project Task management easier". The user and the Project Task Manager want "to see a bigger Task with its parts, how many parts are done, and to stop copying 'follow-up of X' notes into descriptions". App surfaces: "Task cards, the Task page, the Depends on / Required by area, and the board; follow the approved design language of step 1. A UI/UX design step first (Product Team) if the Solution Designer finds the interface needs it." "The UI/UX design repository (autobyteus-web-design) keeps the baseline: update it for this change, as the user asked for earlier changes." "Keep it small … do not add graphs, automatic status changes or notices unless the user asks."

The Solution Designer found that the interface needs the design step (requirements DEC-006): it adds new visible elements to four approved surfaces, new en / zh-CN strings, and a card indication that must respect the user's earlier taste for keys.

## The user's decisions (2026-10-19, in the Solution Designer's conversation)

- **One parent per Task**: "Of course one parent one task can only have one parent." The parent is a Task of the same Project, of any status.
- **One level only**: "we don't allow parts of parts … we just allow like one level … a flat level." A part cannot have parts; a Task with parts cannot be a part. The user's principle: "more than three layer … it's actually not practical at all … we kind of need to think about … what is actually practical."
- **Closing the last part does not close the parent**: the Project Task Manager closes the parent deliberately.
- **Closing the parent closes its open parts**: "when the parent has been canceled or finished … all the sub tasks should be canceled or finished as well … no doubt." Parent DONE → open parts DONE; parent CANCELLED → open parts CANCELLED; Done / Cancelled parts unchanged; reopening the parent changes no part. Status is changed only by agents (`update_task`); the app only displays status.
- **Deleting a parent**: its parts stay and simply have no parent ("i think you are right in this decision").
- "In general we want to make it simple."

## What to design (requirements REQ-008 to REQ-012; the content is decided, the look is the design's)

- **Parent** (Task page and the right-panel tab's Task view): every part (Done and Cancelled ones too) with key, status and summary, each opening that Task; progress "N of M done", where Cancelled parts are listed but not counted (2 Done + 1 To Do + 1 In Progress + 1 Cancelled → "2 of 4 done"); an empty state when it has no parts.
- **Parent's board card**: its progress.
- **Part** (Task page and tab Task view): its parent, with key and summary, opening the parent; the parent's status visible (a part of a Cancelled or Done parent).
- **Part's board card**: an indication that it is part of a parent.
- **The Dependencies card** (Depends on / Required by): how it holds the new relation alongside, or whether a separate area fits better.
- **New / Edit task**: a field to choose, change and clear the parent, in the step-1 picker pattern (search this Project's Tasks by key or text). Tasks that cannot be chosen: the Task itself and Tasks that are already parts. A Task that has parts cannot get a parent (how that shows is the design's). A server refusal shows in the editor's existing error line.
- **Optional, the designer's call**: a "new part" shortcut from a parent; a hint that closing a parent also closes its open parts; whether a parent's delete confirmation mentions its parts.
- **Strings**: every new string in en and zh-CN.
- **States**: parent with no / some / all parts done, with Cancelled parts; part of a To Do / Done / Cancelled parent; long summaries and long keys; page and compact tab.

## Constraints and non-goals

- Follow step 1's approved design language: `autobyteus-web-design/tickets/done/task-keys-and-dependencies/ui-ux-spec.md`, with its 2026-10-17 revision `task-keys-off-lists`. The user's direction on keys there: "we don't need to show that on the UI… it's only used to link". Board cards and the Workspaces tree show no key line; keys appear where they link to or refer to a Task.
- The board stays flat: status lanes, order, search and the Cancelled toggle are unchanged; no grouping of parts under parents, no tree or graph views, no filter by parent.
- `depends on`, its badge, lists and picker stay exactly as they are.
- No notices; nothing blocks work. Temp tasks have no parent and no parts. The Workspaces-tree Task summary is unchanged.
- Agent tools are out of the design's scope: `create_task` / `update_task part_of`, and `partOf` / `parts` in `list_project_tasks` and `search_project_tasks`, are engineering.

## Context and links

- Requirements (approved for the model, SR-002): `/Users/normy/autobyteus_org/autobyteus-worktrees/task-part-of/tickets/in-progress/task-part-of/requirements-doc.md`: UC-001–UC-007, REQ-001–REQ-017, AC-001–AC-018, SCN-001–SCN-011, DEC-001–DEC-019.
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-part-of/tickets/in-progress/task-part-of/investigation-notes.md`.
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-part-of/tickets/in-progress/task-part-of/solution-revision-record.md`.
- Current web source: `autobyteus-web` at `origin/personal@cba6b85122` (v1.5.6-beta.8). Relevant components: `components/projects/ProjectTaskRow.vue`, `ProjectTaskDetail.vue`, `TaskDependenciesSection.vue`, `TaskDependencyBadge.vue`, `TaskDependencyPicker.vue`, `ProjectTaskDraftEditor.vue`, `panel/ProjectsPanelTaskDetail.vue`; derivations in `utils/projects/taskDependencies.ts`.
- Design repository: `/Users/normy/autobyteus_org/autobyteus-web-design` (Product-owned), currently `personal@e5ad9d8`, baseline autobyteus-web `2f21134` (v1.5.6-beta.1).
- Real example the user cares about: `autobyteus-25` (cross-node collaboration), to be split into parts.

## Approval state, risks and next action

- Requirements: `Approved` for the model at SR-002 (see Document Status in the requirements doc). The visual details become normative only with the user's approval of the returned UI/UX spec.
- Open risks: one call can close several parts and stop their task agents (intended by the user). Mixed versions of the desktop app and nodes are not supported, and the user keeps them updated (DEC-009); the design needs no state for it.
- Expected output: a Product-owned UI/UX spec with a runnable reference and final visual references, confirmed by the user, plus the design repository updated as its owner decides.
- Next expected action: `/project_task_manager` dispatches this to the Product Team. The returned, user-approved design package comes back to the Solution Designer (this run) for integration (next solution revision) and architecture design.
- Route applied: `get_handoff_rules` has no rule for `Product Design Requested`, so the result goes back to the calling workflow, `/project_task_manager`.

## Route update (2026-10-19)

- The user asked the Solution Designer to delegate the design to `/product_team` itself. Delegated with `delegate_task`: team run `product_team_64366851ea5c4de9b858ed9e83ad92a5`, coordinator run `product_ui_ux_designer_2370fe58150647bcbefc42c11cbeae97`.
- `/project_task_manager` was told not to dispatch the earlier request.
- The approved package returns to the Solution Designer.
