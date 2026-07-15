# Task Left-Panel Team Context Analysis Recommendation

## Summary Opinion

The proposed direction is strong: putting the live task owner context on the left makes the workspace feel more alive and makes the hierarchy easier to scan. The left side already functions as the navigation/context spine, while the right side is better suited to details, files, messages, terminal, browser, artifacts, and inspectors.

The best product shape is not to move the whole right Team/Tasks tab to the left. Instead, keep full task/content detail on the right, keep the existing task summary/short-description row as the left-side selector, and place only the compact live agent/team/member roster underneath that task row.

## Recommended UX Shape

For a team-delegated task, render a compact left-side hierarchy like:

```text
Task summary / short description   [text only]
Software Engineering Team          [team status]
  solution_designer                [member status]
  architecture_reviewer            [member status]
  implementation_engineer          [member status]
```

For a task assigned to a single agent:

```text
Task summary / short description   [text only]
solution_designer                  [agent status]
```

This intentionally inverts the work-tree order for active delegated tasks:

- Work tree: team -> run/task summary -> members.
- Proposed active task context: task summary -> responsible agent/team -> members.

That inversion is correct because the user's immediate question is “who is working on this task?”, not “which team does this run belong to?”

## Why This Feels Better

- It matches where users already scan for navigation: the left panel.
- It makes the task feel live without opening the right panel.
- It preserves the same visual language as the work tree: disclosure arrows, status dots, avatars/initials, indentation, selected row highlight, relative-time affordance where useful.
- It makes team execution visible at the task level, especially when a task is delegated to another team.
- It reduces the right panel's burden: right side can remain detail/inspection rather than primary orientation.

## Keep / Change Recommendation

Keep:

- The right Team/Tasks surface for messages, full task detail, reference preview, and deeper inspection.
- Existing click-to-focus semantics for members.
- Existing work-tree status color language.

Change:

- Keep the task summary/short-description row as the left-side parent and right-side content selector.
- Add a compact live roster under that task row.
- Under the task row, show the responsible agent or team as the root roster row with no extra indentation.
- If the responsible target is a team, show its members underneath.
- Clicking an agent/member should focus that target the same way work-tree member selection does.

Avoid:

- Duplicating a second independent Team/Tasks system with different status colors or selection behavior.
- Removing the right Team tab immediately.
- Showing too much task body text in the narrow left panel.
- Mixing task execution status and member runtime status without clear visual placement.

## Implementation Direction If Approved

1. Reuse `deriveActiveTaskEntries()` as the data input for task-first rows.
2. Add a reusable compact task context tree component instead of embedding a large new block directly into `WorkspaceHistoryWorkspaceSection.vue`.
3. Reuse/extract work-tree status presentation helpers so status dots stay consistent.
4. Host the compact task context under selected/expanded team rows in the left work tree, or in a small “Live tasks” section immediately associated with the active team.
5. Keep right-side `TeamActiveTasksSection` as the detail view initially; only lift selected-task state if left-side task selection should drive the right-side detail pane.

## Open Product Decision

The main decision is interaction depth:

- Option A: left-side rows are compact live context and focus controls only. This is simpler and lower risk.
- Option B: left-side task selection becomes the canonical active-task selector and drives the right-side task detail pane. This is stronger UX but requires shared task selection state.

Recommendation: start with Option A unless you want the right-side task detail pane to follow left-side task selection immediately.


## Clarified Scope

The intended move is only the compact live responsibility context:

- Keep task summary / short description on the left as the parent row.
- Keep full task/content/detail rendering on the right when that summary is selected.
- Move/show the responsible agent, agent team, and team members under the left task summary.
- Reuse the same status language as the work tree for agent/team/member rows: a tiny left-side circular dot, blue animated for running, green for idle/ready, gray for inactive/offline, red for error. Do not put this dot on the task summary row.

This is feasible with the current frontend architecture because the work tree already has the status-dot/member-row UX and active task data already exists in `deriveActiveTaskEntries()`.


## Status Dot Clarification

The compact left roster should not use large status badges. The status indicator should be the same small circle/dot placed on the left side of agent/team/member rows as in the current work tree screenshot. The task summary row itself remains text-only. The dot is part of the live experience for execution actors: users can scan the responsible team and members without reading text labels.


## Indentation Clarification

The task summary is text-only. The responsible agent/team row should sit directly below it as the root roster row, not as an indented child. Indentation starts only when showing members under a team.


## Live-Feeling UX Rationale

This change should materially improve the feeling that the system is alive. The task summary tells the user what is being worked on, while the non-indented agent/team row and indented member rows show who is actively working. The small blue/green status dots are not decorative; they are the at-a-glance signal that agents are present, running, idle, or waiting. This makes multi-agent work feel observable without forcing the user to open the right-side Team/Tasks detail panel.

The implementation should keep this signal truthful and calm: use the existing small work-tree dots, keep animation only for genuinely running/active states, and avoid large badges or noisy status labels in the compact left roster.


## Reference File Placement

Correction: reference file **names/rows** belong in the left-side clickable structure, consistent with the current implementation where a file name appears on the left and the file content/preview appears on the right. The content/preview should stay on the right; the left side should provide the navigable file list.

Recommended placement:

```text
Task summary / short description   [text only]
Software Engineering Team          [status dot]
  solution_designer                [status dot]
  architecture_reviewer            [status dot]
  References
    file-a.md                      [click -> right preview]
    screenshot.png                 [click -> right preview]
  Technical details                [collapsed metadata]
```

For a single-agent task, the same structure sits under the agent row.


## Technical Details Placement

Moving technical details to the left can make sense because they are metadata/navigation context rather than the main content. The right side should stay focused on readable task content, messages, and selected reference previews. Technical details should be compact and preferably collapsed by default because the left panel is narrow. Avoid letting IDs or JSON blobs visually compete with the live agent/team status roster.

---

## Design-Impact Correction Addendum — 2026-06-29

The earlier recommendation to move compact task context to the “left side” must be read as the **left navigator inside the active task UI**, not the global Workspaces/run-history tree.

Corrected product recommendation:

- Keep the existing Team active-task master/detail UI.
- In each left navigator task item, render:
  1. task summary / short description as text only;
  2. responsible agent or agent team row with tiny status dot and no extra team-level indent;
  3. indented member rows with tiny status dots if the responsible target is a team;
  4. References label and file-name rows;
  5. compact/collapsed Technical details.
- The right detail pane continues to show the selected task body or selected reference content/preview.
- Do not render active-task summary blocks, references, or technical details inside the global Workspaces tree.
- Task summary/reference clicks should not focus the center subteam/composer; only explicit actor/member row clicks should invoke focus behavior.

This addendum supersedes any reading of the prior analysis that suggested `WorkspaceAgentRunsTreePanel.vue` or `WorkspaceHistoryWorkspaceSection.vue` should host active-task context.
