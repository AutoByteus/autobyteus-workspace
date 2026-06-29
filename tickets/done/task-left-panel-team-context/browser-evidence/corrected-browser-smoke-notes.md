# Corrected Browser Smoke Notes — 2026-06-29

Runtime:
- Frontend: `http://127.0.0.1:3010/workspace`
- Backend health: `http://127.0.0.1:29695/rest/health` returned `{"status":"ok","message":"Server is running"}`.
- Fixture: `Nested Classroom Test Team` using live team run `nested_classroom_test_team_1e847be1287d4797b0829b7d96abb09c`.
- To create a current active task for the smoke, sent the Teacher prompt: `Please create one new delegated task for StudentStudyGroup. The delegated task must ask StudentStudyGroup to return exactly the token NESTED_CLASSROOM_OK_20260629 on its own line, with no extra text. After delegating, wait for their result.`

Observed corrected state:
- Team tab Active Tasks header showed `Tasks / 1 task`.
- Team Active Tasks contained one `team-active-task-navigator` and one `active-task-detail-pane`.
- Left task navigator showed task summary first, then `StudentStudyGroup` actor/team row, then member rows `student_one` and `student_two`, then collapsed `TECHNICAL DETAILS`.
- Summary row text: `Return exactly the following token on its own line, with no extra text before or after: NESTED_CLASSROOM_OK_20260629 ...`.
- Actor row: `StudentStudyGroup` with `TEAM` badge.
- Member rows: `student_one`, `student_two`.
- Technical details were collapsed by default; expanding them showed task type, task id, task-team run id, target kind, target, and task input JSON in the left navigator.
- Right detail pane showed task target/status (`StudentStudyGroup`, `Awaiting review`), waiting notice, Focus button, and full task body. It did not contain left active-task technical selectors.

Global Workspaces-tree absence check:
- With `Nested Classroom Test Team` scrolled into view and the live run expanded, the global Workspaces tree showed only workspace/team/member rows (`Teacher`, `StudentStudyGroup`, `student_one`, `student_two`).
- DOM selector counts outside the Team Active Tasks section: `left-active-task-summary-row = 0`, `left-active-task-reference-row = 0`, `left-active-task-technical-details = 0`.
- This satisfies the corrected requirement that the Workspaces tree is not the active-task host.

Interaction checks:
- Before summary click, center focus text began with `Teacher`; selected global row text was `Teacher`.
- After clicking `left-active-task-summary-row`, center focus still began with `Teacher`; selected global row stayed `Teacher`; right detail body showed the selected task body.
- After clicking `left-active-task-actor-row`, center focus changed to the focused subteam card for `StudentStudyGroup · task_0003`; the actor row received focused highlight classes. This matches explicit actor focus behavior.

Reference-row limitation:
- The live task created for this smoke had no reference files (`left-active-task-reference-row = 0`). Reference preview behavior remains covered by durable component coverage in `TeamActiveTasksSection.spec.ts`.

Screenshots:
- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/browser-evidence/corrected-team-active-tasks-live.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/browser-evidence/corrected-workspaces-tree-no-active-task-context.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/browser-evidence/corrected-actor-focus-behavior.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/browser-evidence/corrected-technical-details-expanded.png`
