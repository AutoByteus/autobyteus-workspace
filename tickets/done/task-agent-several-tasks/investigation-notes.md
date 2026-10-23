# Investigation Notes — A task agent with several Tasks

## Investigation Meta

- Package identifier: `task-agent-several-tasks`
- Request / ticket: Project Task `autobyteus-275`, delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-10-23, with the user's decision in its comment (option B) and a follow-up message the same day.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-several-tasks`, branch `codex/task-agent-several-tasks`
- Base: `origin/personal` @ `3b09fbe3085c594b75e35baf72c02d0a1f1b4895`, fetched 2026-10-23
- Finalization target: `origin/personal`
- Bootstrap: worktree created; ticket folder `tickets/in-progress/task-agent-several-tasks/`; no blocker
- Current solution revision ID: `SR-004`
- Authorities read (2026-10-23): `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md` (unchanged since read 2026-10-21); `SKILL.md` (changed: closing a delegated Product design Task, not relevant here)
- Earlier analysis reused: `autobyteus-259` investigation notes, "Part 2 Investigation" P2-001 to P2-006 (copy attached to the Task: `ctx_955e90d924fe__investigation-notes-259.md`)

## Initial Request And Clarifications

- The Task: a team copy has one current Task, so `delegate_task` refuses a second Task while the first is open (even TODO). Parts went by message: no description first, no team shown on the part, closing a part stopped nothing.
- The user's decision (Task comment, 2026-10-23), option B, general: "we shouldn't be limited to parts. The same team should be able to work on several Tasks at once (for example when the Solution Designer asks for a follow-up Task and it is assigned to the same team again, while the earlier one is still open). Only when the LAST Task is closed is the team freed." Trigger: `autobyteus-280` could not be given to the team holding `autobyteus-204` (TODO).
- Points to settle with the user (Task comment and the Project Task Manager's message):
  - how a worker's message or report is tied to its Task;
  - one current Task with the others queued;
  - resources freed only when all are closed;
  - what the app shows per Task and for a working or waiting team;
  - CM-6; closing a parent still closes its open parts;
  - the smallest safe version and the staging; whether option A is stage 1 of B.
- Done when (verbatim): "A part can be delegated to its parent's copy (or the chosen model works) with the full description as the first message and a visible link in the app; closing a part does not stop a copy that has other open work; tests; docs; the user's check; finalized on personal. No release unless he asks."
- Constraints: `part_of` one level; no version-compatibility code (DESIGN.md rule 9); coordinate the tool contract with 259 (done), 187 (done), 260.

## Source Log

| Date | Source | Finding | How established |
| --- | --- | --- | --- |
| 2026-10-23 | `src/projects/services/task-execution-resource-service.ts` `deriveCurrent` | A copy's current entry is "its open entry, else its latest linked". Two open entries are tolerated already: the latest open (`linkedAt`) is picked and a `TASK_AGENT_RESOURCE_CONFLICT` is logged as damaged data | Read |
| 2026-10-23 | same, `releasableByHostRoot`, `closedTaskExecutionsIn`, `isOpen`, `ownerOf` | A copy is released only when its current entry is closed and in the closing Task. Once a copy may hold several open entries, closing one Task re-derives its current to another open Task, so it is not released. Closing the last one releases it | Read |
| 2026-10-23 | same, `linkInherited`, `rootTaskLocationOf` | Sub-work (`role: delegated`) joins the creator's current Task; the Workspaces tree shows a worker's current Task when its root is that copy | Read |
| 2026-10-23 | `src/projects/domain/task-execution-resources.ts` `assertTaskExecutionAssignable`, `linkExistingTaskExecution` | The refusal "This task agent still works on Task … Set it to DONE or CANCELLED first …" is the only rule that keeps a copy at one open Task. `linkExistingTaskExecution` separately refuses a copy already open in that same Task | Read |
| 2026-10-23 | `src/agent-collaboration/execution/task/root-task-execution-lifecycle.ts` `assignToExistingCopy`, `prepareClosedCopyForResume` | The existing-copy path commits the new entry and delivers the Task's description as a message (waking or restoring the copy). For an open copy `prepareClosedCopyForResume` does nothing | Read |
| 2026-10-23 | `task-execution-input.ts:82` | Its text says "Your previous Task is closed; this is the work to do now." This is wrong once the copy can still have open Tasks | Read |
| 2026-10-23 | `project-task-service.ts` reopen (`reopenAssignment`, `reopenLocation`) | Reactivation happens when a closed copy is messaged by its assigner. A copy with an open Task is not closed, so it receives messages as today | Read |
| 2026-10-23 | `docs/design/collaboration_model.md` CM-6 | "Every delegated run belongs to one current Task … Closing the Task … stops its delegated runs" | Read |
| 2026-10-23 | `update_task` tool description | "Both stop the task agents whose current Task this is (never a task agent that has since been given another Task)" | Read (the tool's live description) |
| 2026-10-23 | Task assignments per Task (`agent_run_resources.json`) | Per-Task files already hold one entry per assignment period; nothing on disk limits a copy to one open entry | Read |

## Relevant Existing Behavior

| Behavior ID | Current | Evidence |
| --- | --- | --- |
| BEH-001 | `delegate_task task_id` to an existing copy is refused while the copy has an open Task (TODO or IN_PROGRESS) | `assertTaskExecutionAssignable` |
| BEH-002 | Closing a Task stops the copies whose current Task it is | `releasableByHostRoot` |
| BEH-003 | The app shows each Task's team (its latest assignment) | `latestAssignment` |
| BEH-004 | A worker's reports reach its assigner by `send_message_to`; the assigner matches the sender run id to the copy's one Task | Task text |
| BEH-005 | Closing a parent closes its open parts | `task-part-closure.ts` |

## Persisted Data

- `agent_run_resources.json` per Task; no format change; existing data has at most one open entry per copy. No migration.

## Requirement Implications

- The model the user chose needs mainly the removal of one refusal. The current-entry rule (newest open Task) and the release rule (stop when the current entry is closed) already give "freed when the last is closed".
- Option A (a part to its parent's copy) is a special case of B; it needs no separate stage.
- Open points for the user: how reports name their Task; what "current" means for the worker; app display.

## Architecture Investigation Findings

Gathered 2026-10-23 after SR-003. Design gate: `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (read this conversation; unchanged since `786055f3d7`), `docs/design/collaboration_model.md` (CM-6 at `3b09fbe308`).

| ID | Source | Finding | How established |
| --- | --- | --- | --- |
| AF-001 | Probe `evidence/SD-probe-several-tasks.test.ts.txt`; output `evidence/SD-probe-several-tasks-output.txt` | Today's refusal reproduced. With two open entries for one copy: (1) current = newest open; a `TASK_AGENT_RESOURCE_CONFLICT` is logged; (2) closing the newer Task leaves the copy open, with no release, and current returns to the older ✔; (3) **closing the last Task fences the copy but requests no release** (0 calls). `releasableByHostRoot(taskId)` only releases a copy whose current entry is in the closing Task, and after both are closed the current is the latest-linked (the other) Task | **Reproduced** (vitest probe against the real services and file store) |
| AF-002 | `task-execution-resource-service.ts` `releasableByHostRoot` | The release rule must be "an entry of this copy is in this Task and no entry of the copy is still open", the reference count | Read + AF-001 |
| AF-003 | `deriveCurrent` | Several open entries become valid; the conflict log goes. Current = newest open, else latest linked (unchanged) | Read |
| AF-004 | `task-execution-resources.ts` `assertTaskExecutionAssignable` | Remove the "still works on" refusal; the other checks stay. `linkExistingTaskExecution` still refuses the same Task twice | Read |
| AF-005 | `root-task-execution-lifecycle.ts` `assignToExistingCopy`; `prepareClosedCopyForResume` returns early for an open copy | The existing path works for an open copy; only the text and `publishTaskExecutionsReopened` for an already open copy need care (idempotent check) | Read |
| AF-006 | `task-execution-input.ts:82` `buildExistingCopyTaskMessage` | Needs the copy's other open Task keys | Read |
| AF-007 | `agent-collaboration/domain/agent-team-collaboration-llm-contract.ts:26` | `delegate_task` text: "This works only when you made its most recent assignment and its current Task is DONE or CANCELLED; that earlier Task stays closed." Must change | Read |
| AF-008 | `update_task` description (`project-task-tool-contract.ts`) | "Both stop the task agents whose current Task this is (never a task agent that has since been given another Task)". Must change | Read |
| AF-009 | Build | `pnpm prepare:shared` / build creates untracked `autobyteus-application-*/dist/` in the worktree; never commit | Measured (git status) |
