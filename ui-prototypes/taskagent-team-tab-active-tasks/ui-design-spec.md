# UI Design Spec: Team Tab Active Tasks

Status: supporting UI implementation notes. The canonical visible UX source is `complete-ux-ui-design.md`; this file exists to make implementation details easy to scan. If these files ever conflict, `complete-ux-ui-design.md` wins.

## 1) Design Intent

Active Tasks must feel like the existing Messages UI, not like a technical task ledger. The left side is navigation and reference-file selection. The right side is selected content: either a selected task body or a selected task reference preview. Messages content/reference UI must not change visibly; the Messages section header intentionally gets the Activity-style left chevron.

The design optimizes for:
- fast task understanding,
- fast focus of the responsible agent/team/member,
- first-class task reference access,
- no duplicated approval surface,
- no visible implementation jargon in the main scan path,
- no user-visible Messages content/reference changes, except the required section-header left chevron.

## 2) Messages Content Frozen + Header Chevron Exception

Messages content/reference UI is the approved baseline. The Messages section header intentionally gets the Activity-style left chevron. Internal refactoring/reuse is acceptable only below the visible content/reference boundary. The following must remain visually and behaviorally identical from the user's perspective:

- message list rows and nested reference rows;
- selected, hover, and keyboard focus states;
- message detail body;
- message reference preview controls, layout, spacing, loading, unavailable, forbidden, and error states.

If exact preservation is uncertain, leave Messages-visible components untouched and implement task-specific wrappers/helpers separately.

## 3) Default Team Tab State

Visible default:

```text
v Messages                                      3 Messages
[existing Messages list/detail/reference UI unchanged]

Active Tasks                                  2 tasks     >
```

Rules:
- Messages is open by default with an Activity-style left chevron; its content/reference UI is unchanged.
- Active Tasks is collapsed by default.
- Messages and Active Tasks use leading/Activity-style disclosure headers.
- Active Tasks count text is `0 tasks`, `1 task`, or `N tasks`, not `N Active`.
- Active Tasks must not auto-open just because tasks exist.
- Messages list rows, nested reference rows, detail pane, preview controls/layout/states, spacing/classes, and selected states are frozen from the user's perspective.

## 4) Active Tasks Expanded Layout

Expanded Active Tasks uses a two-pane layout:

```text
Active Tasks                                  2 tasks     v
┌──────────────────────────────┬────────────────────────────────────┐
│ left task navigator           │ right selected content             │
│                               │                                    │
│ ▸ Student                    │ Student                    Running│
│   Improve the Team tab...     │                         Focus      │
│   design-spec.md              │                                    │
│   requirements.md             │                                    │
│                               │ Improve the Team tab so it...      │
│   Study Group                 │                                    │
│   Review the implementation...│ > Technical details                │
└──────────────────────────────┴────────────────────────────────────┘
```

Rules:
- The section, not each row, owns selection and right-pane mode.
- Only the selected task shows nested reference rows in the left navigator.
- The right task detail does not duplicate reference rows by default.
- Clicking a nested reference row switches the entire right pane to reference preview.

## 5) Left Task Navigator

Each task row shows only what is needed to select and understand the item:
- target name: agent name, group name, or team name,
- concise task preview,
- calm status marker when useful,
- nested reference rows only for the selected task.

Reference row rules:
- show as clean file rows matching Messages as closely as possible,
- use filename/path truncation behavior consistent with Messages,
- highlight the selected reference row,
- do not add a visible `Reference files` heading unless the layout is ambiguous; the rows should be self-explanatory like Messages.

## 6) TaskAgent Right Detail

TaskAgent detail shape:

```text
Student                                               [Running]
                                                        [Focus]

Improve the Team tab so active delegated tasks are easy to scan...

> Technical details
```

Rules:
- The compact header/action area owns target, useful status, and generic `Focus`.
- The task body is rendered nicely as the primary content.
- Do not show a visible `Task brief` heading when the body is self-evident.
- Do not list task reference files in the right detail by default.
- Do not show Approve/Deny controls.

## 7) TaskTeam Right Detail

TaskTeam detail shape:

```text
Study Group                                        [Awaiting review]
                                                        [Focus]

Review the implementation against the approved design and verify...

solution_designer                                      [Focus]
implementation_engineer                                [Focus]
code_reviewer                                          [Focus]

> Technical details
```

Rules:
- There is no separate second row such as `Review implementation [Focus team]`.
- The target/group/team name, status, and generic `Focus` action stay in one compact header/action area.
- The task body remains the main reading content.
- Member rows are visible because focusing a member is a primary user action.
- References remain nested under the selected task in the left navigator; they are not duplicated in this right detail by default.

## 8) Reference Preview Right Detail

When the user clicks a task reference filename in the left navigator:

```text
[← Back to task]  design-spec.md                         [Open]

# Design Spec
...
```

Rules:
- The whole right pane switches to file preview, matching Messages.
- The selected reference row remains highlighted on the left.
- A clear Back to task action returns to the selected task body.
- Loading, unavailable, unsupported, and permission/error states are handled inside the preview pane.
- The preview uses shared FileViewer-style behavior where possible.

## 9) Waiting / Blocked Status

Active Tasks may show calm status text when the task is blocked:
- `Waiting approval`
- `Waiting input`
- `Waiting action`
- `Awaiting review`

Rules:
- No dominant `Approval required` badge.
- No Approve/Deny buttons in Active Tasks.
- If user action is needed, Activity remains the approval/action surface.

## 10) Technical Details

`Technical details` is collapsed by default and contains only secondary data:
- task id,
- run id,
- team id / member ids,
- target identifiers,
- original task arguments if needed for debugging,
- event/provenance timestamps.

Rules:
- Reference files do not live only in Technical details.
- Technical details must never be required to understand or use the task.
- Technical details is not the place for Focus actions.

## 11) Empty, Loading, And Error States

Empty:
```text
No active delegated tasks
```

Loading:
- lightweight skeleton/spinner that preserves section layout.

Task fetch/projection missing refs:
- render the task body normally and omit reference rows.
- do not infer references from Messages.

Reference preview error:
- keep selected file highlighted on the left.
- show a concise error and Back to task.

## 12) Implementation Guardrails

Must do:
- preserve exact user-visible Messages behavior,
- use task-owned data for task references,
- use shared reference presentation/viewer primitives only where Messages visible output remains identical,
- keep task and message route identities explicit,
- run Electron-backed UI and visually inspect the final result.

Must not do:
- no duplicated reference rows in right task detail by default,
- no visible `Task Agent` / `Task Team` badges in left task rows or right detail headers,
- no visible `Focus agent` / `Focus team`; use `Focus`,
- no Messages content/reference restyle,
- no visible `Task brief` / `Reference files` headings unless necessary for disambiguation,
- no `Review implementation [Focus team]` second row,
- no Approve/Deny controls in Active Tasks,
- no scraping communication messages to reconstruct task references,
- no generic message route reused with fake task/message IDs.

## 13) Visual Acceptance Checklist

- Team tab default: Messages open with left Activity-style chevron and unchanged content/reference UI; Active Tasks collapsed.
- Active Tasks header count reads naturally: `2 tasks`, not `2 Active`.
- Chevrons visually match Activity placement.
- Selecting a task highlights it and shows only its reference rows nested below it on the left.
- Individual-target right detail is clean: compact target/status/Focus header, task body, collapsed Technical details, no task-kind badge.
- Group/team-target right detail is clean: compact target/status/Focus header, task body, visible member Focus rows, collapsed Technical details, no task-kind badge.
- Clicking a left reference row switches the whole right pane to file preview.
- Task reference preview visually matches the Messages reference experience without changing Messages itself.
- Waiting/blocked status is calm and status-only.
- No approval buttons appear in Active Tasks.
