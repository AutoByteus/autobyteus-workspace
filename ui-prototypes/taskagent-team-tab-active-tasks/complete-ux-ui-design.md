# Complete UX/UI Design: Team Tab Active Tasks

Status: canonical pure-text UI/UX contract for the TaskAgent / TaskAgent-team Team tab improvement.

This file is the implementation-facing source of truth for the final Team tab Active Tasks experience and section-header behavior. Active Tasks intentionally follows the existing Messages content/reference pattern: the left side is navigation and file selection; the right side is selected content. Reference files are shown under the selected task in the left navigator and are **not duplicated in the right task detail by default**. Messages content/reference UX is a frozen baseline: internal reuse/refactor is allowed only if the Messages list, nested reference rows, detail pane, and reference preview remain visually and behaviorally unchanged. Messages header disclosure is the exception: it intentionally gets the Activity-style left chevron.

## 1) Design Goal

The Team tab should feel calm, readable, and efficient:

- Messages opens first by default with an Activity-style left chevron in the section header and unchanged message content/reference behavior.
- Active Tasks is available as a collapsed section with a simple task count.
- Opening Active Tasks gives a Messages-like master/detail experience.
- The user can read the selected task, click reference files, preview file content, and focus the responsible task agent/team/member without accidental side effects.
- Active Tasks never shows Approve/Deny controls; Activity owns approval decisions.

## 2) Messages Content Frozen + Header Chevron Exception

Messages content/reference UX is not part of the visible redesign. The user already considers the Messages content/reference experience excellent. The Messages section header disclosure is intentionally updated to the Activity-style left chevron. Implementation may reuse or refactor internals only when all of the following remain visually and behaviorally unchanged from the pre-task baseline/current approved UI:

- message list rows and spacing;
- nested message reference rows;
- selected, hover, and keyboard focus states;
- message detail pane and message body rendering;
- message reference preview controls, layout, loading, unavailable, forbidden, and error states.

Activity-style header changes apply to both Messages and Active Tasks section headers. If preserving exact Messages content/reference output is uncertain, keep the Messages content component path unchanged and implement task-specific reuse separately.

## 3) Core UX Decisions

### 2.1 What is visible vs internal

| Concept | User-visible? | Rule |
| --- | --- | --- |
| `Task brief` | Usually no | Internal/component name only. The task body appears directly, like message content. Do not show a visible `Task brief` heading when content is self-evident. |
| `Reference files` | Usually no | Internal grouping only. File rows appear under the selected task in the left navigator, like Messages references. Do not show a visible `Reference files` heading unless a layout becomes genuinely ambiguous. |
| `Task Agent` / `Task Team` | No in primary UI | Internal task kind/type only. Do not show visible badges/labels in left rows or right detail headers. Technical details/accessibility metadata may retain it. |
| `Technical details` | Yes, as collapsed disclosure | Only secondary IDs/provenance/debug info. Never the access point for references. |
| `Approval required` | No | Use calm status only if needed, e.g. `Waiting approval`; no Approve/Deny buttons in Active Tasks. |

### 2.2 Primary information order

For a selected task, the right pane order is:

1. Compact target/status/Focus header with no task-kind badge.
2. Task body text rendered cleanly.
3. Task-team member focus rows, only for TaskTeam tasks.
4. Optional `Technical details` disclosure.

Reference file rows are primary, but they live in the **left task navigator** under the selected task, matching the Messages interaction pattern. Clicking a reference row changes the whole right pane into a file preview. Do not change the actual Messages UI to achieve this.

## 4) Team Tab Default Journey

### Journey J-001: User opens Team tab

1. User selects or views a running team run.
2. System opens the right-side Team tab.
3. System shows Messages expanded by default.
4. System selects a message detail automatically when messages exist.
5. System shows Active Tasks collapsed below Messages.

Visible shape:

```text
v Messages                                      3 Messages
┌──────────────────────┬──────────────────────────────┐
│ existing message list │ existing selected message     │
│ existing file rows    │ or reference preview          │
└──────────────────────┴──────────────────────────────┘
> Active Tasks                                  2 tasks
```

Rules:

- Messages content/reference UI is not redesigned: keep its existing list, nested reference rows, detail pane, and reference preview exactly as the user already likes them.
- Activity-style leading disclosure applies to both Messages and Active Tasks headers.
- Active Tasks header count says `2 tasks`, `1 task`, or `0 tasks`; not `2 Active`.
- Messages stays the initial open section even when tasks exist.

## 5) Active Tasks Open Journey

### Journey J-002: User opens Active Tasks

1. User clicks Active Tasks header.
2. System opens Active Tasks and collapses Messages.
3. System shows a split master/detail layout.
4. System selects the first active task by default if no task is selected.
5. System exposes a draggable vertical divider between the task navigator and selected-content pane.

Visible shape:

```text
> Messages                                      3 Messages
v Active Tasks                                  2 tasks
┌──────────────────────────────┬─────────────────────────────────────┐
│ left task navigator           │ right selected task or file preview │
└──────────────────────────────┴─────────────────────────────────────┘
```

Rules:

- Left pane is task/reference navigation and has a user-adjustable width.
- The divider between the left navigator and right content pane uses the same drag/clamp interaction pattern as Messages.
- Right pane is selected content: task body by default, reference file preview after a reference click.
- The layout should visually rhyme with Messages without modifying Messages content/reference behavior.

## 6) Left Task Navigator Design

### 5.1 Task item shape

Each task item is compact and scannable.

TaskAgent item:

```text
Student                              Running
Improve Team tab UI...
  [md] requirements.md
  [md] design-spec.md
```

TaskTeam item:

```text
Study Group                    Awaiting review
Review implementation...
  [md] implementation.md
  [md] design-spec.md
```

Visible row fields:

- target name: agent/member/team/group name
- one- or two-line body preview
- low-emphasis human status only when useful: `Running`, `Awaiting review`, etc.
- nested reference rows for the selected task, when references exist

Rules:

- Clicking a task item selects it for reading only.
- Clicking a task item does not focus the agent/team.
- Reference rows appear under the selected task only, like Messages.
- Clicking a nested reference switches the whole right pane to reference preview.
- Nested reference rows should feel like Messages reference rows: icon + filename, selected highlight, no verbose label.
- Do not show visible `Task Agent` / `Task Team` badges or raw task IDs by default.

## 7) Selected TaskAgent Detail Journey

### Journey J-003: User selects a TaskAgent task

1. User clicks a TaskAgent task in the left navigator.
2. System highlights that task item.
3. System renders the TaskAgent detail on the right.
4. User can read the task body or click `Focus`.
5. If the task has references, user clicks those file rows in the left navigator to preview them.

Visible shape:

```text
Student                                      [Running] [Focus]

Improve the Team tab UI so the user can read messages first,
then inspect active delegated task work without clutter...

> Technical details
```

Rules:

- No visible `Task brief` heading.
- No visible `Reference files` heading in the right detail.
- `Focus` is in the compact top header/action area; accessible label/tooltips may include the target name.
- Reference files are visible under the selected task in the left navigator, not repeated in the right detail by default.
- `Technical details` remains collapsed unless the user opens it.

## 8) Selected TaskTeam Detail Journey

### Journey J-004: User selects a TaskTeam task

1. User clicks a TaskTeam task in the left navigator.
2. System highlights that task item.
3. System renders the TaskTeam detail on the right.
4. User can read the task body, focus the whole target group/team, or focus a specific member.
5. If the task has references, user clicks those file rows in the left navigator to preview them.

Visible shape:

```text
Study Group                                  [Awaiting review] [Focus]

Review the implementation against the design and report any
issues that should be fixed before coverage and delivery.

[SD] solution_designer                           [Focus]
[IE] implementation_engineer                     [Focus]
[CR] code_reviewer                               [Focus]

> Technical details
```

Rules:

- No separate second header row like `Review implementation [Focus team]`.
- If a task label/title exists, use it in the left navigator preview, or include it naturally in the rendered body only if it adds meaning.
- `Focus` belongs in the compact top header/action area; accessible label/tooltips may include the target name.
- Member rows are visible because focusing a group/team member is a primary user need.
- Avoid a heavy visible `Members` heading if rows are self-explanatory through initials/name/Focus buttons.
- If nested subteams appear, indent child rows lightly but keep the same compact focus affordance.
- Reference rows stay in the left navigator under the selected task; they are not duplicated in the right detail by default.

## 9) Reference Preview Journey

### Journey J-005: User opens a task reference file

1. User clicks a file row under the selected task in the left navigator.
2. System highlights the selected file row.
3. The whole right pane switches from task detail to reference preview, just like Messages.
4. User can read the file, switch raw/preview mode where supported, maximize, or return to the task body by selecting the task row again.

Visible shape:

```text
requirements.md                                      [Open/maximize]
/Users/.../requirements.md
──────────────────────────────────────────────────────
# Requirements
...
```

Rules:

- Use the same `FileViewer`-style behavior and polish as Messages references.
- Do not render a task-specific `Back to task` button/control; selecting the task row again returns to the selected task body.
- Reference preview is read-only.
- Missing/unreadable reference shows a clear unavailable/error state and keeps the user in context.

## 10) Focus Journey

### Journey J-006: User focuses execution

Individual target:

1. User clicks `Focus` in the right header.
2. Workspace focus changes to the concrete task agent.
3. Active Tasks selection remains stable.

Group/team target:

1. User clicks `Focus` in the right header.
2. Workspace focus changes to the concrete task-team execution.
3. Active Tasks selection remains stable.

TaskTeam member:

1. User clicks `[Focus]` on a member row.
2. Workspace focus changes to that concrete task-team scoped member.
3. Selected task remains visible.

Rules:

- Task selection and focus are separate intentions.
- Task item click never focuses automatically.
- Focus buttons must be explicit and keyboard reachable.

## 11) Waiting Approval / Waiting Action Journey

### Journey J-007: Task is blocked on Activity-owned decision

If a task is waiting for a runtime approval/action:

- Left task item may show small status text: `Waiting approval` or `Waiting for user action`.
- Right detail may show a calm notice below the header or near the status area:

```text
Waiting for user approval in Activity
This task is paused until the approval is handled in Activity.
```

Rules:

- Do not show Approve/Deny buttons in Active Tasks.
- Do not show a dominant `Approval required` badge.
- Do not add per-task auto-approve controls.
- Activity remains the approval/denial surface.

## 12) Technical Details Disclosure

### What it contains

`Technical details` is secondary and collapsed by default.

It may show:

```text
Task ID              task_0002
Agent team run ID    team-run__software_engineering_team__task_0002
Target kind          team
Target               software_engineering_team
```

Rules:

- Do not include task body as raw JSON.
- Do not include reference-file access here.
- Hide the disclosure if it adds no useful information beyond visible content.
- Avoid user-facing word `arguments`; use `Technical details`.

## 13) Empty / Loading / Error States

### No active tasks

```text
No active delegated tasks
Delegated TaskAgent and TaskTeam work will appear here.
```

### No references

- Omit reference rows under the selected task.
- Do not show an empty `Reference files` block.

### Reference loading

```text
Loading reference…
```

### Reference unavailable

```text
Reference file unavailable
This task reference cannot be read from the current environment.
```

## 14) Transition Matrix

| ID | Trigger | From | To | Expected feedback |
| --- | --- | --- | --- | --- |
| `T-001` | Select/open team run | Workspace | Messages default | Messages expanded with left Activity-style chevron; message content/detail selected; Active Tasks collapsed with `N tasks`. |
| `T-002` | Click Active Tasks header | Messages default | Active Tasks split | Active Tasks opens; Messages collapses via Activity-style header affordance; Active Tasks leading chevron rotates. |
| `T-003` | Click Messages header | Active Tasks split | Messages default | Messages opens using Activity-style left chevron header; Active Tasks collapses. |
| `T-004` | Select task item | Active Tasks split | Task detail | Left task selection moves; right pane shows compact header, task body, member rows if TaskTeam. |
| `T-005` | Select TaskTeam item | Task detail | TaskTeam detail | Shows compact TaskTeam header, task body, member focus rows. |
| `T-006` | Click left-navigator reference row | Task detail | Reference preview | File row selected; whole right pane shows loading then content/error. |
| `T-007` | Click selected task row | Reference preview | Task detail | Right pane returns to selected task body. |
| `T-008` | Click Focus target/member | Task detail | Same task detail | Workspace focus updates; selected task remains visible. |
| `T-009` | Toggle Technical details | Task detail | Same task detail | Secondary IDs/provenance open/close below primary content. |
| `T-010` | Task waits for approval/action | Any task detail | Same task detail | Calm status/notice appears; no approval controls in Active Tasks. |

## 15) Implementation Acceptance Checklist

- Messages opens by default with Activity-style left chevron; Messages content/reference behavior remains unchanged.
- Messages and Active Tasks headers use leading Activity-style chevrons and right-side counts.
- Active Tasks opens as Messages-like split view.
- Active Tasks split has a draggable vertical divider whose width behavior matches Messages.
- Task item click selects for reading only.
- Right task detail uses label-light content: no required visible `Task brief` or `Reference files` headings.
- Task kind is not shown as a visible badge/label in primary UI.
- Status and generic `Focus` action are in one compact header/action area.
- No separate task-label row beside Focus action.
- No visible `Task Agent` / `Task Team` labels in Active Tasks left rows or right detail headers.
- Visible Focus button text is generic `Focus`.
- Reference rows appear under the selected task in the left navigator, like Messages.
- Right task detail does not duplicate reference rows by default.
- Clicking a left-navigator reference row switches the whole right pane to read-only file preview with no task-specific Back button; clicking the task row returns to task detail.
- TaskTeam detail includes member focus rows.
- Active Tasks never renders Approve/Deny controls.
- Technical details is collapsed, secondary, and never the reference-file access point.
- Implementation engineer must run the Electron-backed UI, inspect visually, compare Active Tasks to Messages/Activity, verify Messages itself did not change, and iterate until Active Tasks looks good.
