# Team Task Results And Reviews UI/UX Specification

## Status

`Refined — user-approved; final solution package review pending`

## Confirmed Product Direction

The following points are now locked by user feedback:

1. **Do not update Messages at all.** Its current design and behavior are already good.
2. **Preserve the current Tasks foundation:** task-description row on the left, reference rows below it, full selected content on the right, resizable divider, and reference preview on the right.
3. **Extend only the missing lifecycle content in the left pane:** submitted results, review comments, revision requests, revised results, acceptance, and interruption form the timeline beneath their task in the left navigator.
4. **Remove Technical details entirely.** Internal task/run identity and routing metadata are not user-facing content.
5. **Keep the right pane detail-only.** Clicking a left-side timeline item changes the right pane to that one item's full content; the timeline itself never moves to or duplicates into the right pane.
6. **Do not duplicate reference rows.** A reference is listed only under its owning task/update in the left navigator. The right detail view never repeats a `Reference files` section; it shows file content only after the user selects that left-side reference.

The proposed extension is to treat each task as a small thread in the existing left navigator:

```text
Task description
├─ original reference files
├─ submitted result
│  └─ result reference files
├─ revision requested / review comment
│  └─ review reference files
├─ revised result
└─ accepted
```

Every task/result/review row is selectable. The right pane always displays the full content of the selected row. Every reference remains selectable and opens through the existing right-side viewer.

## UX Goal

Without disturbing the current task interaction, let a user answer:

- What was delegated?
- What result was submitted?
- What review comment came back?
- Was revision requested?
- Which result was revised and eventually accepted?
- Which files belonged to the task, result, or review?

## Related Requirements And Acceptance Criteria

- Behaviors: BEH-001–BEH-006
- Requirements: REQ-001–REQ-015
- Acceptance criteria: AC-001–AC-015
- Authoritative requirements: [requirements.md](./requirements.md)

## User-Journey Inventory

| Journey ID | User / Context | Starting State | User Goal | Completion State | Related IDs |
| --- | --- | --- | --- | --- | --- |
| UXJ-001 | Any task participant | Current task row with initial references | Read the assignment exactly as today | Task row remains selected and full description appears on the right | REQ-003, REQ-005; AC-001, AC-004 |
| UXJ-002 | Delegator | Assignee submitted a result | Find and read the result | Result row is visible below the task; full result appears on the right | REQ-006–REQ-009; AC-005–AC-007 |
| UXJ-003 | Assignee | Delegator requested revision | Read review feedback | Revision row and full review comment are visible | REQ-006–REQ-010; AC-005–AC-007 |
| UXJ-004 | Either participant | Revision cycle completed | Understand the full sequence | Result, revision request, revised result, and acceptance appear in order | REQ-006–REQ-010; AC-005–AC-008 |
| UXJ-005 | Any task participant | Task/update has a reference | Preview it and return | Existing viewer opens; selecting the owning row restores its content | REQ-009, REQ-011; AC-007, AC-009 |
| UXJ-006 | Live observer | Selected task receives an update | See it without losing context | New row appears exactly once and existing selection remains stable | REQ-004, REQ-013; AC-003, AC-008 |

## Primary Interaction Model

### What remains exactly the same

- `Tasks` remains a separate Team-tab section.
- The left pane remains the task navigator.
- The right pane remains task content or reference preview.
- The task description remains the primary task row.
- Initial reference files remain directly under that task row.
- Clicking the task row shows the full task description.
- Clicking a reference shows the existing preview.
- Clicking the owning row again returns from the preview to that row's content.
- The divider remains draggable.

### What is added

- A status badge on the task root.
- One nested row for every task lifecycle update.
- Reference rows below the update that owns them.
- Full update content on the right when an update row is selected.
- Human-readable event names and participant direction.

### Non-negotiable pane ownership

- **Left pane:** owns the complete task timeline and all navigation—task root, submitted results, review/revision comments, revised results, acceptance/interruption, and each item's reference rows.
- **Right pane:** owns only the full detail for the currently selected left-side item or the existing preview for the currently selected reference.
- Selecting an item updates the right pane but does not remove, relocate, copy, or replace the timeline on the left.
- The right pane must never render the full lifecycle list, timeline controls, or another set of event rows.
- Task/update detail must not repeat reference cards already present in the left navigator.

## Production-Fidelity UI Contract

The interactive prototype is the reviewable rendering contract for this proposal:

`/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/tickets/done/team-task-conversation-ui/task-timeline-ui-prototype.html`

It is grounded in the current production components rather than a greenfield mockup:

| Existing production owner | Behavior preserved in the prototype |
| --- | --- |
| `TeamOverviewPanel.vue` / `TeamDelegatedTasksSection.vue` | Separate Messages/Tasks sections, task count, collapsible Tasks body, resizable task master/detail split |
| `TeamDelegatedTaskNavigator.vue` | Description-first task root, initial references directly under the root, selected task group treatment |
| `TeamDelegatedTaskDetailPane.vue` | One right-side mode at a time: selected content or selected reference viewer |
| `TeamTaskReferenceViewer.vue` / `TeamReferenceFileViewer.vue` | Filename/path header; icon-only pencil/raw, eye/preview, and maximize/restore controls; Markdown defaults to rendered preview; Escape restores a maximized viewer |

Hard fidelity rules:

- Do not add a visible control, tab, reference card, disclosure, or alternate navigation surface unless it exists in the current production UI or is explicitly approved in this specification.
- Text such as `Preview` and `Raw` is tooltip/accessible-label content for the existing icons, not visible tab copy.
- The current internal split defaults to `248px` with `168px` minimum and `360px` maximum; the divider remains draggable.
- Task groups are not independently collapsible. Their complete timelines stay visible while the Tasks section is open.
- On initial render, select the first task's root item—not its newest update—and show `Task assigned` plus the full task description on the right.

## Exact Click/Result Contract

| User action | Left pane after action | Right pane after action |
| --- | --- | --- |
| Open Tasks with related tasks | Both task groups and their complete timelines are visible; first task root is selected | `Task assigned` header, readable participant/time/status context, and full first-task Markdown description |
| Click a task root | That task group is selected; its timeline stays visible | `Task assigned` and that task's full Markdown description; no repeated reference section |
| Click an initial task reference | The exact reference row is selected under the task root; timeline stays visible | Existing task reference viewer for that file |
| Click `Result submitted · Result n` | That submission row is selected | Matching result header, participant/time context, and full submission Markdown; no repeated reference section |
| Click `Revision requested · Result n` | That review row is selected | `Revision requested for Result n`, participant/time context, and full review comment; no repeated reference section |
| Click `Revised result submitted · Result n` | That revised-submission row is selected | Matching revised-result header/context and full submitted Markdown; no repeated reference section |
| Click `Result n accepted` | The acceptance row is selected and remains the visible terminal event | Matching acceptance header/context and full comment, or `Result accepted.` when the contract comment is null |
| Click `Task interrupted` | The interruption row is selected and remains the visible terminal event | `Task interrupted`, time, and full interruption reason |
| Click a submission/review reference | The exact file row remains selected under its owning update; all timeline rows stay visible | Existing reference viewer for that file; no item detail or second reference list |
| Click the owning task/update while its file is open | The owning row becomes selected and its file row is no longer selected | Returns to the owning item's full content |
| Click pencil icon for a Markdown/HTML reference | Left selection is unchanged | Same viewer switches to read-only raw source; only the icon receives active treatment |
| Click eye icon | Left selection is unchanged | Same viewer switches to rendered preview; only the icon receives active treatment |
| Click maximize, then press Escape or click restore | Left selection is unchanged | Viewer maximizes, then returns to the same embedded file and mode |
| Drag the divider | Timeline and selection are unchanged | Split follows the pointer within the existing `168–360px` left-pane bounds |
| Collapse and reopen Tasks | Task body hides and returns without changing its task data | The prior exact task/update/reference selection is restored |

Final browser revalidation on 2026-08-20 exercised 51/51 task-area click/state assertions with no failures, plus a separate passing divider-boundary check confirming `248px` initial, `168px` minimum, `360px` maximum, and restoration to `248px`. The checks covered both tasks, every represented lifecycle type, participant direction, root/update references, owner return, icon-only raw/preview switching, maximize/Escape restore, collapse/reopen selection retention, persistent left timeline, latest-update time, and absence of right-side duplicate reference lists. An earlier accessibility-focused pass also verified complete accessible names for truncated task/update/reference rows.

## Markdown Wireframes

### 1. Proposed Tasks pane

```text
┌──────────────────────────────────────────────────────────────┐
│ ▾ Tasks                                             2 tasks  │
├─────────────────────────────┬─┬──────────────────────────────┤
│ TASK NAVIGATOR              │⋮│ SELECTED CONTENT             │
│                             │⋮│                              │
│ ┌─────────────────────────┐ │⋮│ Task assigned     [Accepted] │
│ │ Review the task display │ │⋮│ solution_designer            │
│ │ [Accepted]              │ │⋮│   → architecture_reviewer    │
│ │ Updated 11:18           │ │⋮│ Aug 20, 10:10                │
│ └─────────────────────────┘ │⋮│                              │
│   📄 screenshot.png         │⋮│ Analyze the current frontend │
│                             │⋮│ task display and propose a   │
│   ↗ Result 1 submitted 10:28│⋮│ clearer delegated-task UI.   │
│     architecture → solution │⋮│                              │
│     Initial proposal ready… │⋮│                              │
│     📄 ui-ux-spec.md         │⋮│                              │
│                             │⋮│                              │
│   ↙ Revision · Result 1 10:42│⋮│                             │
│     solution → architecture │⋮│                              │
│     Please keep the current…│⋮│                              │
│     📄 feedback.md           │⋮│                              │
│                             │⋮│                              │
│   ↗ Revised result 2   11:06│⋮│                              │
│     architecture → solution │⋮│                              │
│     Updated proposal ready… │⋮│                              │
│                             │⋮│                              │
│   ✓ Result 2 accepted  11:18│⋮│                              │
│     solution → architecture │⋮│                              │
│                             │⋮│                              │
│                             │⋮│                              │
├─────────────────────────────┼─┼──────────────────────────────┤
│ Another task… [Awaiting]    │⋮│                              │
│   📄 requirements.md         │⋮│                              │
└─────────────────────────────┴─┴──────────────────────────────┘
```

The existing task row and initial reference placement are preserved. New lifecycle rows use the same compact summary/detail concept as Messages but remain visually nested under their owning task.

### 2. Selecting the original task

```text
LEFT                                      RIGHT

▌ Review the task display                Task assigned               [Accepted]
  [Accepted]                              solution_designer → architecture_reviewer
  solution → architecture                Aug 20, 10:10
  📄 screenshot.png
                                           Review the frontend task display.
  ↗ Result submitted · Result 1            Keep the task description and reference
  ↙ Revision requested · Result 1          preview easy to use.
  ↗ Revised result submitted · Result 2
  ✓ Result 2 accepted
```

This is the current task-description experience with a small readable header added. It is not replaced by an all-events detail page.

### 3. Selecting a submitted result

```text
LEFT                                      RIGHT

  Review the task display                Result submitted · Result 1
  📄 screenshot.png                       architecture_reviewer → solution_designer
                                          Aug 20, 10:28
▌ ↗ Result submitted · Result 1  10:28
    architecture → solution               I analyzed the existing components.
    Initial proposal ready…               The first UI proposal is ready for review.
    📄 ui-ux-spec.md
  ↙ Revision requested · Result 1
  ↗ Revised result submitted · Result 2
```

The result row behaves like the current task row: a summary on the left and full Markdown on the right.

### 4. Selecting a review/revision comment

```text
LEFT                                      RIGHT

  ↗ Result submitted · Result 1          Revision requested for Result 1
                                          solution_designer → architecture_reviewer
▌ ↙ Revision requested · Result 1 10:42   Aug 20, 10:42
    solution → architecture
    Keep the current task…                Keep the current task and reference layout.
    📄 feedback.md                         Add result and review entries underneath it.

  ↗ Revised result submitted · Result 2
```

The arrow direction changes because the review travels from delegator back to assignee.

### 5. Reference preview remains unchanged

```text
LEFT                                      RIGHT

  ↙ Revision requested · Result 1        feedback.md                 ✎  👁  ⛶
    solution → architecture              tickets/…/feedback.md
    Keep the current task…               ───────────────────────────────
▌   📄 feedback.md                        Review feedback
                                          Keep the current task layout…

Click `Revision requested` again to return to its full comment.
```

The pencil, eye, and maximize controls are icon-only, matching the current viewer. `Raw`, `Preview`, and `Maximize view` are tooltips/accessible labels, not visible text tabs. No new back button and no new reference viewer are introduced.

## Navigator Row Specification

### Task root row

Preserve the current description-first treatment and add only compact context:

```text
Review the task display              ← existing description summary
[Revision requested]                 ← added task lifecycle status
solution_designer → architecture…    ← readable participants
```

Original reference files remain immediately below this row using the current file-row style.

### Submitted-result row

```text
↗ Result submitted · Result 1      10:28
  architecture_reviewer → solution_designer
  Initial proposal ready for review…
```

- Arrow/icon communicates assignee-to-delegator direction.
- Two-line or shorter preview uses submission message text.
- Result number is derived from submission order.
- Its references appear immediately below it.

### Revision-request row

```text
↙ Revision requested · Result 1     10:42
  solution_designer → architecture_reviewer
  Keep the current task layout…
```

- Arrow/icon communicates delegator-to-assignee direction.
- Preview uses review comment.
- The reviewed result ordinal is resolved using `reviewed_submission_id`.
- Its references appear immediately below it.

### Revised-result row

```text
↗ Revised result submitted · Result 2   11:06
  architecture_reviewer → solution_designer
  Updated proposal ready…
```

A submission is labeled revised when an earlier review requested revision and this submission follows that request.

### Acceptance row

```text
✓ Result 2 accepted                    11:18
  solution_designer → architecture_reviewer
  Accepted.                            ← fallback if no comment
```

Acceptance is still selectable even with no comment, so the terminal decision remains part of the visible history.

### Interruption row

```text
! Task interrupted                     11:18
  System lifecycle event
  Root TeamRun terminated.
```

Do not invent a sender where the task record does not contain one.

## Right Detail Specification

The right pane renders exactly one selected subject. Reference rows are never repeated in task/update detail:

| Selected Subject | Header | Body | Right-Pane Reference Rule |
| --- | --- | --- | --- |
| Task root | `Task assigned`, current status, delegator → assignee, created time | Full task description via existing Markdown renderer | No reference list; original references remain under the task on the left |
| Submission | `Result submitted` or `Revised result submitted`, Result N, assignee → delegator, time | Full submission message via existing Markdown renderer | No reference list; submission references remain under the submission on the left |
| Revision review | `Revision requested for Result N`, delegator → assignee, time | Full required review comment | No reference list; review references remain under the review on the left |
| Acceptance review | `Result N accepted`, delegator → assignee, time | Full review comment or `Result accepted.` | No reference list; any contract-owned references remain on the left |
| Interruption | `Task interrupted`, time | Full interruption reason | None in current contract |
| Reference | Existing filename/path header and icon-only viewer controls | Existing reference content state | File content replaces item detail; no second reference list |

The right pane does not display the lifecycle list at all. The complete timeline and every event row remain in the left navigator at all times; the right side is only the full detail or reference preview for one current left-side selection. This is consistent with the current task master/detail pattern.

## Status Presentation

| Authoritative Condition | Visible Task Badge | Meaning |
| --- | --- | --- |
| `active`, no unresolved revision request | `In progress` | Assignee is working |
| `awaiting_review` | `Awaiting review` | Result needs delegator review |
| `active`, latest update is `request_revision` | `Revision requested` | Feedback returned; revised work expected |
| `accepted` | `Accepted` | Result formally accepted |
| `interrupted` | `Interrupted` | Work ended without acceptance |

Each badge includes text and an icon; color is supplemental only.

## Selection And Live-Update Rules

- Every selectable subject has a stable internal key:
  - task root;
  - submission ID;
  - review ID;
  - interruption ID.
- These IDs are selection keys only; they do not appear in ordinary copy.
- When a full task record is replaced by a live update:
  - keep the selected subject if its stable key still exists;
  - append the new lifecycle row exactly once;
  - do not force the user from a selected task/result/review into the newest item;
  - if the selected reference still exists, keep the preview; otherwise return to its owning item.
- Lifecycle rows remain in durable record order. Do not sort reviews/submissions independently.
- Task groups retain the current order returned by the Team execution view. Do not introduce a separate newest-first or timestamp sort; live new tasks continue to appear using the current append behavior.
- Initial selection is the first visible task's root item. Do not automatically select the latest lifecycle update.
- Collapsing/reopening the Tasks section preserves the exact valid task/item/reference selection.

## Participant Rules

| Lifecycle Item | Visible From | Visible To |
| --- | --- | --- |
| Task root | Readable task delegator | Readable Agent or AgentTeam assignee |
| Submission | Assignee | Delegator |
| Review / revision / acceptance | Delegator | Assignee |
| Interruption | `System` | Task |

For a task Team, display the Team name as the assignee/submission source. The current update record does not identify one specific submitting member, so the UI must not invent one.

If a participant label cannot be resolved, use `Task delegator` or `Task assignee`; never place a raw AgentRun ID in primary UI.

## Reference Ownership

References remain directly under the item that introduced them:

```text
Task row
  task reference A
  task reference B

Result 1 row
  result reference C

Revision request row
  review reference D
```

The existing task reference endpoint already resolves all three categories. No API change is required.

References are deliberately not repeated in the right-side task/update detail. The left row is the single navigation affordance; the right pane becomes the file viewer only after that row is selected.

## Technical Details Removal

Remove the existing `Technical details` disclosure in full. Do not replace it with another diagnostic disclosure, copy-ID action, target-kind row, address row, run-ID row, or raw JSON view.

Exact identities remain necessary inside the presentation projection and selection/reference routing, but they have no visible representation. The user-facing participant labels and lifecycle content provide the only task metadata shown.

## Non-Happy-Path States

### Empty

Preserve the current Tasks empty state and task count. No Messages empty-state work is in scope.

### Loading / reference failure

Preserve the existing task reference viewer's loading, unavailable, retry-by-reselect, raw-source/preview mode, and maximize behavior. Raw source is the pencil icon, rendered preview is the eye icon, and maximize/restore uses the existing expand/collapse icon. These labels are tooltips/accessible names only.

### Acceptance without a comment

Show `Result accepted.` The acceptance row still appears because the decision itself is meaningful. A revision request always has a comment under the current validated task-record contract, so the UI does not add an unreachable missing-revision-comment state.

### Accepted / interrupted

Terminal tasks remain readable and selectable. This read-only surface adds no disabled task action buttons.

### Invalid task record

Existing strict stream/hydration boundaries reject malformed records. The UI does not attempt to fabricate partial update history.

## Accessibility And Keyboard Behavior

- Task and lifecycle summary rows are native buttons.
- `Enter`/`Space` select task/result/review/interruption rows.
- Reference rows remain native buttons.
- Selected task/update/reference uses the current visible left-border/background treatment plus accessible selected semantics.
- Lifecycle row accessible names include event type, result ordinal where applicable, participants, and timestamp.
- Status always includes text; it never relies only on color.
- Truncated summary/participant text exposes the complete accessible name/title.
- Existing divider semantics and behavior remain unchanged.

## Responsive And Platform Behavior

- Scope remains the desktop/web Team sidebar in the supplied screenshot.
- Preserve the existing resizable master/detail split: `248px` initial left width, `168px` minimum, and `360px` maximum.
- Lifecycle rows use compact stacked metadata rather than chat bubbles, so they remain readable at the current minimum left-pane width.
- The left navigator already scrolls and will contain the additional rows.
- No Messages or mobile UI production change is included.

## Content Labels

| Concept | English |
| --- | --- |
| Task detail | `Task assigned` |
| First submission row/detail | `Result submitted · Result {n}` |
| Later submission row/detail | `Revised result submitted · Result {n}` |
| Revision review row | `Revision requested · Result {n}` |
| Revision review detail | `Revision requested for Result {n}` |
| Acceptance | `Result {n} accepted` |
| Interruption | `Task interrupted` |
| Active status | `In progress` |
| Waiting status | `Awaiting review` |
| Revision status | `Revision requested` |
| Accepted status | `Accepted` |
| Interrupted status | `Interrupted` |

All new labels require English and Simplified Chinese catalog entries. Raw enum values such as `request_revision` and `awaiting_review` are never shown.

## Data And API Dependencies

No new API or stored data is required:

```text
existing full TaskDelegationRecordDto
  -> task root display item
  -> ordered submission/review/interruption display items
  -> nested task navigator
  -> selected item Markdown detail
  -> existing TeamTaskReferenceViewer
```

## Explicitly Out Of Scope

- Any production change to Messages.
- Merging ordinary messages into tasks.
- Task submit/review action buttons.
- Backend, GraphQL, shared-contract, persistence, or migration changes.
- Global workspace tree or mobile task redesign.

## Approval Status

The requirements and UI behavior basis were explicitly approved by the user on 2026-08-20 after iterative review of the production-fidelity prototype. Approval covers the exact click/result contract above, unchanged Messages, complete Technical details removal, persistent left-side task timelines, selected task/update detail on the right, references listed only beneath their owning left-side item, and the existing icon-only file viewer on the right after a reference is selected.

The user separately requires a final review of the completed, aligned solution package before architecture review. Do not route this package downstream until the user reviews that completed package and explicitly instructs the solution designer to continue to architecture review.
