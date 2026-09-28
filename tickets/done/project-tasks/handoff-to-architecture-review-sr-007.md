# Handoff — Architecture Design Complete (SR-007: revision after user-verification rejection)

- Result classification: `Architecture Design Complete` (revised)
- Package identifier: `PROJ-TASKS-20260926-001` (`project-tasks`)
- Current solution revision: `SR-007`. It supersedes the `SR-004` web design; the `SR-004` server design is kept.
- Classification: `task_size=Medium`, `architectural_risk=High` (unchanged for the package; the `SR-007` delta is web-only).
- Route: `get_handoff_rules` rule "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/architecture_reviewer`.
- Expected output: re-review of the web design revision (Pass/Fail/Blocked). The server portion was already reviewed in `ARCH-REV-001` and is unchanged.

## Why This Revision Exists

On 2026-09-27 the user tested the delivered candidate `a0fd103af` (delivery DR-001, awaiting verification) and rejected the two-pane page and Task list as "terrible… super squeezed".

- **User-fixed direction:**
  - the released Projects grid;
  - clicking a card opens a separate full-width Project page with Back at the top-left;
  - Tasks inside it as three columns.
- **Detailed UX:** the user delegated this ("do a deep thinking… pick the best… continue"). The user then constrained it: "Don't make the UI complicated. The UI should stay clean enough."
- **Measured cause:** 1200×800 default window, minus a 320 px app panel and a 320 px list pane, left about 560 px for Tasks.

The delivered DR-001 candidate must not be finalized. The revised package re-enters implementation after this review.

## Approval Basis

- Requirements `Approved`, `SR-007`: `APPROVAL-PROJ-TASKS-20260927-002`. Direction fixed by the user; details delegated and simplified by the user.
- `APPROVAL-PROJ-TASKS-20260926-001` is superseded for `REQ-006`, `REQ-007`, `REQ-009`, `REQ-016`, `AC-002`, `AC-005`, `AC-007` and `AC-011`.

## Workspace Context

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks`, branch `codex/project-tasks`, head `a0fd103af` (contains the `SR-004` implementation and the merge of `origin/personal@fa5919da1`).
- Base `e06080b00`; finalization target `origin/personal`.

## Artifacts (absolute paths)

- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/investigation-notes.md` (see "UX Analysis For SR-005/SR-006" and "Simplification")
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/design-spec.md` (`SR-007`)
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/solution-revision-record.md` (`SR-005`–`SR-007`)
- Prior review: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/design-review-report.md` (`ARCH-REV-001` Pass on `SR-003` + `SR-004`) and `architecture-review-revision-record.md`
- Prior downstream artifacts (for context): `implementation-handoff.md`, `code-review-report.md`, `api-e2e-*.md`, `handoff-summary.md`, `delivery-revision-record.md` in the same folder

## Design Delta Summary

- Remove:
  - `pages/projects.vue`;
  - `ProjectListPane.vue`, `ProjectListItem.vue`;
  - `ProjectTasksPanel.vue`, `ProjectTaskRow.vue`;
  - the status filter;
  - the related specs and i18n keys.
- Restore from `e06080b00`:
  - `pages/projects/index.vue`, `[id].vue`;
  - `ProjectsList.vue`, `ProjectCard.vue` (the card's bottom line becomes "N open tasks · N workspaces");
  - `ProjectsList.spec.ts`.
- Rework `ProjectDetail.vue`: full width with no `max-w`; "← Projects"; `line-clamp-2` description; plain Tasks/Workspaces tabs.
- Add `ProjectTaskBoard.vue`: search + New task; three equal columns with counts; muted "No tasks"; no-match with clear; page scroll; stacks below `md`.
- Add `ProjectTaskCard.vue`: description only, `line-clamp-3`; opens the existing dialog.
- The e2e probe restores the v1.4.86 journeys and adds board cases, including a non-squeezed guard at 1200×800.
- Server, storage, GraphQL, `projectTaskStore` and `ProjectTaskDialog` are unchanged.

## Open Risks

- Churn from restoring released tests.
- The width guard must run in the real shell.
- `RISK-001` is carried over (the exploratory prototype exists only in the container).
