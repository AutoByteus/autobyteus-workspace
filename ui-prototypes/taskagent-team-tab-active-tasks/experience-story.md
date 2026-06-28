# Experience Story: Team Tab Active Tasks

## 1) Product Story
A user is supervising a TaskAgent or TaskAgent-team run from the right-side Team tab. They want to understand what the system is doing, read the active delegated task, inspect any task reference files, and focus the responsible agent, team, or member without learning a second UI pattern. Success means Active Tasks feels like Messages while Messages content/reference UI remains exactly as the user already likes it: internal reuse/refactor is invisible, both section headers use the Activity-style left chevron, Active Tasks gains the cleaner pattern, and no approval clutter or implementation-looking labels enter the primary scan path.

## 2) Main Journey
1. User opens the Team tab. System shows `screen_id: team_tab_default`: Messages is open by default with an Activity-style left chevron and unchanged list/detail/reference content, and Active Tasks is collapsed by default.
2. User scans Messages. System keeps the existing Messages list, nested reference rows, detail pane, and reference preview behavior unchanged.
3. User opens Active Tasks. System shows `screen_id: active_tasks_master_detail`: a leading chevron header, a human count such as `2 tasks`, a left task navigator, and a right selected-content pane.
4. User selects a TaskAgent task. System shows `screen_id: task_agent_detail`: the selected task is highlighted on the left; if it has reference files, those references appear nested directly under the selected task in the left navigator; the right pane shows the task body with a compact task header and Focus action.
5. User selects a TaskTeam task. System shows `screen_id: task_team_detail`: references, if any, appear under the selected team task on the left; the right pane shows the task body, compact team status/focus header, member Focus rows, and collapsed Technical details.
6. User clicks a task reference filename in the left navigator. System shows `screen_id: task_reference_preview`: the reference row is highlighted and the whole right pane switches to a read-only file preview, like Messages.
7. User clicks Back to task or reselects the task row. System returns to `task_agent_detail` or `task_team_detail` with the same task selected.
8. User clicks `Focus` on a target/member. System focuses the requested target in the main workspace while preserving the current Team tab selection.

## 3) Cognitive Load Criteria
- Learning order: keep Messages first with unchanged content/reference behavior, then let Active Tasks reuse the same left-navigation/right-content mental model.
- Connection strategy: group task references under the selected task in the left navigator so users connect files to the task without a separate heading or repeated right-side block; copy the Messages mental model, not the visible Messages implementation.
- Chunking limit: a task row shows kind/target, concise preview, status, and nested file rows only for the selected task. The right task detail shows one compact header/action area, task body, optional member list, and collapsed Technical details.
- Interference control: remove Approve/Deny controls and prominent `Approval required` wording from Active Tasks; Activity remains the single approval/action surface.
- Progression policy: show task understanding first, then member focus, then technical IDs only behind disclosure; task references are never hidden behind Technical details.

## 4) Screen Stories

### screen_id: team_tab_default
- User arrives from: opening a TaskAgent or TaskAgent-team workspace and selecting the Team tab.
- User sees:
  - Messages section open with the existing message list/detail UI.
  - Active Tasks section collapsed below Messages.
  - Messages and Active Tasks headers use Activity-style leading chevrons; Messages content/reference UI remains unchanged.
  - Active Tasks count shown as `0 tasks`, `1 task`, or `N tasks`.
- User can do:
  - `open_active_tasks`: expand Active Tasks.
  - `continue_messages`: select messages or message references exactly as today, with no visible Messages UI change.
- System behavior:
  - when `open_active_tasks` -> expand Active Tasks and select the first task when available -> go to `active_tasks_master_detail`.
  - when `continue_messages` -> keep existing Messages visible behavior -> remain in the Messages flow.
- Cognitive objective: let users start with the already-good communication context before task execution details.
- Cognition controls:
  - chunking: only one lower-priority task section is collapsed initially.
  - progressive disclosure: Active Tasks details appear only when requested.
  - clarity guardrails: no auto-opening Active Tasks just because tasks exist; no Messages restyle.
- States to prototype: default, loading, empty.

### screen_id: active_tasks_master_detail
- User arrives from: `open_active_tasks`.
- User sees:
  - Left task navigator with active delegated tasks.
  - First task selected by default when no previous selection exists.
  - References nested under the selected task only, when files exist.
  - Right pane showing selected task detail, not duplicate reference rows.
- User can do:
  - `select_task`: select another task row.
  - `select_task_reference`: select a nested reference row under the selected task.
  - `collapse_active_tasks`: collapse the section.
- System behavior:
  - when `select_task` -> left selection moves and right pane shows the selected task detail -> go to `task_agent_detail` or `task_team_detail`.
  - when `select_task_reference` -> reference row highlights and right pane switches to preview -> go to `task_reference_preview`.
  - when `collapse_active_tasks` -> section collapses -> go to `team_tab_default`.
- Cognitive objective: make tasks browsable in the same way messages are browsable.
- Cognition controls:
  - chunking: file rows appear only under the selected task, avoiding repeated files across all rows.
  - progressive disclosure: technical IDs stay collapsed.
  - clarity guardrails: right detail remains a clean reading surface for the task body.
- States to prototype: default, loading, empty, error.

### screen_id: task_agent_detail
- User arrives from: selecting a TaskAgent task in `active_tasks_master_detail`.
- User sees:
  - Compact header with target name, calm status chip when useful, and generic `Focus` action; no visible `Task Agent` badge.
  - Nicely rendered task body/instructions without a visible `Task brief` heading when the content is self-evident.
  - Collapsed `Technical details` disclosure for IDs/provenance only.
  - No Approve/Deny controls.
- User can do:
  - `focus_agent`: focus the responsible TaskAgent.
  - `open_technical_details`: reveal secondary IDs/provenance.
  - `select_task_reference`: select a nested reference row on the left, when present.
- System behavior:
  - when `focus_agent` -> workspace focuses the target agent and Team tab state remains intact.
  - when `open_technical_details` -> IDs/provenance appear below primary content -> remain on `task_agent_detail`.
  - when `select_task_reference` -> right pane switches to file preview -> go to `task_reference_preview`.
- Cognitive objective: make the task understandable first and operational controls obvious but not noisy.
- Cognition controls:
  - chunking: one header, one body, one optional disclosure.
  - progressive disclosure: technical fields delayed.
  - clarity guardrails: no duplicated reference list in the right detail by default.
- States to prototype: default, loading, error.

### screen_id: task_team_detail
- User arrives from: selecting a TaskTeam task in `active_tasks_master_detail`.
- User sees:
  - Compact header with target group/team name, status when useful, and generic `Focus` action; no visible `Task Team` badge.
  - Nicely rendered task body/instructions without a visible `Task brief` heading when obvious.
  - Members rows with member role/name and per-member `Focus` action.
  - Collapsed `Technical details` disclosure for task/team/member IDs and provenance only.
  - No separate row like `Review implementation [Focus team]`.
- User can do:
  - `focus_team`: focus the task team.
  - `focus_member`: focus one member.
  - `open_technical_details`: reveal IDs/provenance.
  - `select_task_reference`: select a nested reference row on the left, when present.
- System behavior:
  - when `focus_team` -> workspace focuses the task team.
  - when `focus_member` -> workspace focuses that member.
  - when `open_technical_details` -> secondary IDs appear below the member list.
  - when `select_task_reference` -> right pane switches to file preview -> go to `task_reference_preview`.
- Cognitive objective: connect one delegated team task to the team and its members without making the user parse technical run data.
- Cognition controls:
  - chunking: task body first, then member focus list, then technical disclosure.
  - progressive disclosure: IDs stay hidden until requested.
  - clarity guardrails: reference files remain left navigation items, not a repeated right-side section.
- States to prototype: default, loading, error.

### screen_id: task_reference_preview
- User arrives from: clicking a nested task reference row in the left navigator.
- User sees:
  - The selected reference row highlighted under its task in the left navigator.
  - Whole right pane replaced by file preview content.
  - File name, file type affordance, loading/error state, and a small way to return to task detail.
- User can do:
  - `return_to_task`: return to the selected task body.
  - `select_another_reference`: preview a different reference under the same selected task.
  - `select_task`: select another task row.
- System behavior:
  - when `return_to_task` -> right pane returns to the selected task body -> go to `task_agent_detail` or `task_team_detail`.
  - when `select_another_reference` -> right pane loads and displays that file -> remain on `task_reference_preview`.
  - when `select_task` -> reference selection clears and right pane shows the new task body.
- Cognitive objective: give reference files the same efficient reading experience as message references.
- Cognition controls:
  - chunking: preview replaces task detail instead of competing with it.
  - progressive disclosure: the user requests the file before the pane changes.
  - clarity guardrails: no separate right-side reference list is needed.
- States to prototype: loading, success, error, unsupported file.

## 5) Alternate And Error Paths
- If Active Tasks has no active tasks, show a calm empty state such as `No active delegated tasks` and keep the header count `0 tasks`; user can continue using Messages.
- If a task has no reference files, show no nested reference rows and no empty reference block in the right detail.
- If a reference file is unavailable, keep the selected reference row highlighted and show a recoverable preview error with Back to task.
- If a task is waiting for user approval/input/action, show a calm status such as `Waiting approval`, `Waiting input`, or `Waiting action`; do not show Approve/Deny buttons in Active Tasks.
- If focus target is unavailable, keep the task selected and show a non-blocking focus failure message.
- If task metadata arrives without reference files due to an old backend payload, render the task body normally and omit reference rows; do not infer files from Messages.

## 6) Transition Index
| transition_id | trigger | from_screen | to_screen | expected_feedback |
| --- | --- | --- | --- | --- |
| `T-001` | open Team tab | workspace | `team_tab_default` | Messages open with left Activity-style chevron and unchanged content/reference UI; Active Tasks collapsed with matching header/count. |
| `T-002` | `open_active_tasks` | `team_tab_default` | `active_tasks_master_detail` | Active Tasks expands; first available task selected. |
| `T-003` | `collapse_active_tasks` | `active_tasks_master_detail` | `team_tab_default` | Active Tasks collapses and count remains visible. |
| `T-004` | `select_task` TaskAgent | `active_tasks_master_detail` | `task_agent_detail` | Left task selected; references, if any, appear nested under it; right pane shows task body. |
| `T-005` | `select_task` TaskTeam | `active_tasks_master_detail` | `task_team_detail` | Left team task selected; references nested under it; right pane shows body, team focus, member focus rows. |
| `T-006` | `select_task_reference` | `task_agent_detail` or `task_team_detail` | `task_reference_preview` | Reference row highlighted; whole right pane switches to loading then file content/error. |
| `T-007` | `return_to_task` | `task_reference_preview` | `task_agent_detail` or `task_team_detail` | Right pane returns to selected task body. |
| `T-008` | `focus_agent` | `task_agent_detail` | `task_agent_detail` | Workspace focuses agent; Team tab selection remains. |
| `T-009` | `focus_team` | `task_team_detail` | `task_team_detail` | Workspace focuses team; Team tab selection remains. |
| `T-010` | `focus_member` | `task_team_detail` | `task_team_detail` | Workspace focuses member; Team tab selection remains. |

## 7) Blocking Questions
- None. The final UX decision is locked: task reference files are shown under the selected task in the left navigator, not duplicated in the right task detail by default; clicking a reference switches the whole right pane to file preview like Messages.
