# Round 4 Browser Smoke Notes — Final Team Active Tasks UX

## Runtime

- Frontend: `http://127.0.0.1:3010/workspace`, Nuxt dev server started from `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/autobyteus-web` with `BACKEND_NODE_BASE_URL=http://127.0.0.1:29695`.
- Backend: Electron-started backend at `http://127.0.0.1:29695`; `/rest/health` returned `{"status":"ok","message":"Server is running"}`.
- Browser tab: `293121`.
- Fixture: user-designated `Nested Classroom Test Team`.

## Live Fixture Setup

Created a real readable reference file for the task-delegation reference preview:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/browser-evidence/active_left_panel_r4_reference.md`

Prompted `Teacher` in the nested classroom team to delegate a live task to `StudentStudyGroup` with `reference_files` set to that absolute file path. The live task used for final validation was `task_0006`, with task body:

> Read the referenced file, then ask the human for approval and wait; do not call submit_task_result until approved.

The UI showed `Tasks / 1 task` in the Team tab Active Tasks section.

## DOM / Behavior Checks

Observed in the real browser after creating `task_0006`:

- Team tab remained visible and Messages remained visible above Tasks.
- `team-active-task-navigator` existed and was contained by `team-active-tasks-section`.
- `active-task-detail-pane` existed and was contained by `team-active-tasks-section`.
- The global Workspaces left tree did **not** contain `team-active-task-navigator` or `left-active-task-*` selectors: count `0`.
- Active Tasks header: `Tasks 1 task`, `aria-expanded="true"`.
- Task-team navigator rows: `left-task-team-context` count `1`; root-level live single-agent task could not be created because delegating directly to `student_one` returned `TASK_MEMBER_TARGET_NOT_FOUND`. Durable navigator coverage still covers `left-task-agent-context`.
- Summary/body selection:
  - `active-task-task-body` existed.
  - Right detail text started directly with the task body.
  - No `active-task-focus-primary` selector existed.
  - No right detail Focus button was found.
  - No `active-task-waiting-notice` selector existed.
  - Right detail did not show duplicated `FOCUSED SUBTEAM`, `Awaiting review`, `Waiting for user action`, or `Focus` signals.
- Reference selection:
  - `left-active-task-reference-row` clicked successfully.
  - `active-task-reference-preview` existed.
  - Preview rendered `Reference proof for ACTIVE_LEFT_PANEL_R4` from the absolute-path reference file.
  - Reference-row class included `ml-2`, `gap-2`, `text-sm`, `hover:bg-white`, selected `bg-white`, selected text color, and `shadow-sm`.
  - Reference icon class included `h-4 w-4 shrink-0`.
- Technical details:
  - `left-active-task-technical-details` existed in the left navigator.
  - `open === false` by default, so technical metadata is collapsed.
- Actor/member focus:
  - Clicking the left actor row changed the center focus to `StudentStudyGroup · task_0006` and showed `REPLYING TO:STUDENTSTUDYGROUP · TASK_0006 (TASK TEAM)` / `Send to subteam`.
  - Summary/reference clicks only changed detail selection; focus came from the actor row.

## Screenshots

- Content-only task body detail: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/browser-evidence/round4-content-only-detail.png`
- Reference preview with readable content: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/browser-evidence/round4-reference-preview.png`
- Actor-row focus behavior: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/browser-evidence/round4-left-actor-focus.png`
- Global Workspaces tree with no active-task context selectors: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/browser-evidence/round4-workspaces-tree-no-active-task-context.png`

## Notes / Limitations

- The live browser smoke created task-team active-task rows. A direct root-level `student_one` delegated task was attempted and rejected by the runtime with `TASK_MEMBER_TARGET_NOT_FOUND`; therefore the single-agent layout is covered by the focused durable Vitest navigator test, not by this live fixture.
- The absolute-path reference task was used because task-delegation reference content routes require stored references to be absolute readable local paths.
