# Implementation Handoff

Package `PROJ-TASKS-20260926-001` — `project-tasks` (description-only Project Tasks; released Projects grid, full-width Project page, three-column Task board).
Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks`, branch `codex/project-tasks`, base `origin/personal@e06080b00`. The current head includes delivery's merge `a0fd103af` of `origin/personal@fa5919da1`. Finalization target: `origin/personal`.

Commits:
- `8d3de39a6`: server (SR-004), unchanged.
- `e8fca7771`: IR-001 two-pane web UI, rejected and superseded.
- `ae0cd4755`: IR-002 web UI (SR-008).

Review diffs:
- The IR-002 delta alone: `git show ae0cd4755`.
- The cumulative package against base: `git diff e06080b00..ae0cd4755 -- autobyteus-server-ts/src autobyteus-server-ts/tests autobyteus-web`. This also contains unrelated `origin/personal` changes from delivery's merge.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Medium/High); `ARCH-REV-003` Pass → `/implementation_engineer`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/requirements-doc.md` (SR-008 basis, `APPROVAL-PROJ-TASKS-20260927-002`)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/investigation-notes.md` (UX analysis and the width evidence from L227)
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/solution-revision-record.md` (SR-001 to SR-008)
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/design-spec.md` (SR-008)
- Supplemental task artifacts: none that define behavior.
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/design-review-report.md` (`ARCH-REV-003`, Pass)
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/architecture-review-revision-record.md`
- Architecture-review handoff context: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/handoff-to-architecture-review-sr-008.md`
- Prior downstream artifacts, for context on the superseded IR-001 web UI:
  - `code-review-report.md` (CRR-001 and CRR-002);
  - `api-e2e-*.md` (API-REV-001);
  - `delivery-revision-record.md` (DR-001, rejected by the user; must not be finalized).
- Triggering rework evidence: user verification rejection of DR-001 ("super squeezed") → SR-005 to SR-008 → `ARCH-REV-003` Pass.

## Current Implementation Summary

Server (SR-004, unchanged since `8d3de39a6`):
- Tasks are embedded in each Project row; a row without `tasks` reads as `[]`, with no migration.
- `ProjectTaskService` handles list, create, edit-description and delete, and never touches the Project's fields or `updatedAt`. There is no status mutation.
- `Project.openTaskCount` is exposed, and deleting a Project removes its Tasks atomically.
- Additive GraphQL: `ProjectTask`, `ProjectTaskStatus`, `projectTasks`, and the create/update/delete mutations.

Web (IR-002, SR-008):
- **Grid (`/projects`):** the released v1.4.86 grid (`ProjectsList`, `ProjectCard`) is restored from `e06080b00`. Each card's bottom line reads "N open tasks · N workspaces", for example "4 open tasks · 2 workspaces", "1 open task · No workspaces" or "No open tasks · 1 workspace".
- **Project page (`/projects/<id>`):**
  - full width, with padding only and no `max-w`;
  - "← Projects" at the top-left, with accessible name "Back to projects";
  - an `h1` name, a `line-clamp-2` description, and Edit and Delete (the delete confirmation still states the Task count from `openTaskCount`);
  - Tasks (default) and Workspaces tabs via `?tab=workspaces`;
  - not-found and error states keep "← Projects".
- **`ProjectTaskBoard`:**
  - a search + "New task" row;
  - three columns in order, To Do, In Progress and Done, each headed "Label count" with the count after search, cards newest-updated first;
  - an empty column shows a muted "No tasks";
  - when search matches nothing, one no-match message with "Clear search" replaces the columns;
  - the page scrolls; there is no per-column scroll;
  - the board owns the dialog state.
- **Layout rule:**
  - The board root is the CSS container (`container-type: inline-size; container-name: project-task-board`), and the column grid is its child.
  - The grid defaults to one column. A scoped `@container project-task-board (min-width: 752px)` rule switches it to `repeat(3, minmax(0, 1fr))`.
  - There is no viewport breakpoint for this switch.
- **`ProjectTaskCard`:** a `<button>` showing only the description (`line-clamp-3 whitespace-pre-line break-words`), with its accessible name from `taskSummary`. It has no status label, timestamp, icon or drag.
- **Unchanged:** `ProjectTaskDialog`, `ProjectWorkspacesPanel`, `projectTaskStore`, `projectStore`.

Cycle and revision references:
- Implementation cycle: `Rework` (upstream redesign after user rejection)
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/implementation-revision-record.md`
- Current implementation revision ID: `IR-002` (baseline `IR-001`)
- Related solution revision IDs: `SR-004` (server), `SR-005`–`SR-008` (web)
- Related architecture-review revision IDs: `ARCH-REV-002`, `ARCH-REV-003`
- Related code-review revision IDs: `CRR-001`, `CRR-002` (on the superseded web UI)
- Related API/E2E revision IDs: `API-REV-001` (on the superseded web UI)
- Related delivery revision IDs: `DR-001` (rejected; must not be finalized)
- Triggering finding IDs: N/A (user verification rejection)

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec › Task Size And Architectural Risk (SR-008)
- Classification confirmed or changed: `Confirmed`
- Evidence: the IR-002 delta is web-only (24 paths in `ae0cd4755`: restore, remove, rework, specs and probe). The package as a whole still changes the persisted shape and the GraphQL contract additively, and changes the released UI. No escalation trigger was hit:
  - no server, storage or GraphQL change;
  - no per-column scroll or drag;
  - no new shared layout component.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-004 / REQ-016, AC-011 (DS-004) | Released grid; card opens a full-width Project page; "← Projects" returns; deep link works | `pages/projects/index.vue` → `ProjectsList` → `ProjectCard` (NuxtLink) → `pages/projects/[id].vue` → `ProjectDetail` → "← Projects" NuxtLink | Restored from `e06080b00`, with no nested route. Probe E2E-020: grid → page → Back without a reload, and the page width equals the main content width (1117 px at 1440). Deep link opens Tasks; unknown id → not-found with Back. |
| BEH-004 / REQ-009, AC-007 | Card shows open Tasks as text | `ProjectCard` (`openTaskCount`, `workspaces.length`, `ProjectCard.counts` key) | Spec covers the plural, singular and none forms. Probe E2E-018 shows "4 open tasks · No workspaces", "1 open task · 1 workspace" and "No open tasks · No workspaces". |
| BEH-001 / REQ-006, AC-002 (DS-002) | Three-column board, description-only cards, counts, newest first, no drag or move | `ProjectDetail` (Tasks tab) → `ProjectTaskBoard` → `projectTaskStore.fetchTasks` → grouped `{ TODO, IN_PROGRESS, DONE }` → `ProjectTaskCard` | Spec plus probe E2E-014 and E2E-026 (one card per column from a mixed-status file). No select, draggable element or inner control on the board. |
| BEH-001 / REQ-006 layout (AR-001) | Columns side by side only when each can be at least 240 px; otherwise stacked | `ProjectTaskBoard` scoped CSS: container on the board root; `@container project-task-board (min-width: 752px)` | Probe E2E-027 in the real shell: at 1200×800 with the default 320 px panel, the columns are 260/260/260 px side by side, and a 4-line card shows 3 lines. With the 520 px panel dragged, and in a 1000×800 window, the columns stack. E2E-023 at 700 px: stacked. |
| BEH-001 / REQ-007, AC-005 (DS-005) | Search across all columns; filtered counts; one no-match state with Clear | `ProjectTaskBoard` computed `matchingTasks` → `columns` | Probe E2E-016 with 120 Tasks: max painted 32.6 ms; counts "To Do 12 / In Progress 0 / Done 0"; Clear search restores 120 and focuses search. |
| BEH-001 / REQ-005, AC-001, AC-003, AC-004 (DS-001) | Create, view, edit and delete through the dialog | `ProjectTaskCard` click → `ProjectTaskDialog` (unchanged) | Probe E2E-014, E2E-015 and E2E-021 (keyboard: create with Ctrl/⌘+Enter, card focus return, delete confirmation, tabs, Back by keyboard). |
| BEH-002 / REQ-008, AC-006 | Delete count from `openTaskCount` | Unchanged (`ProjectDetail`) | Probe E2E-017: "5 tasks" on both tabs; cascade; workspaces untouched. |
| BEH-003, BEH-005, BEH-006, AC-008–AC-010 | Unchanged | Server + gate unchanged | Probe E2E-019, E2E-024 (v1.4.86 row now reads "No open tasks · 1 workspace"; the first write keeps released fields) and E2E-025. |
| REQ-015, AC-012 | en + zh-CN; keyboard | `localization/messages/{en,zh-CN}/projects.ts` | Guards pass; probe E2E-022 checks the zh-CN board, columns, card line "4 项未完成任务 · 没有工作区" and the Back label, with no raw keys or English strings. |

## Key Files Or Areas

- New:
  - `components/projects/ProjectTaskBoard.vue` (with the scoped container-query CSS)
  - `components/projects/ProjectTaskCard.vue`
  - `__tests__/ProjectTaskBoard.spec.ts`
  - `__tests__/ProjectTaskCard.spec.ts`
- Restored from `e06080b00`:
  - `pages/projects/index.vue`, `pages/projects/[id].vue`
  - `components/projects/ProjectsList.vue`
  - `components/projects/ProjectCard.vue` (bottom line changed)
  - `__tests__/ProjectsList.spec.ts` (count-line assertions added)
- Reworked:
  - `components/projects/ProjectDetail.vue` and its spec
  - `localization/messages/{en,zh-CN}/projects.ts`
  - `localization/messages/__tests__/projectsCatalog.spec.ts`
  - `tests/e2e/projects-feature-probe.mjs`
- Removed:
  - `pages/projects.vue`
  - `ProjectListPane.vue`, `ProjectListItem.vue`, `ProjectTasksPanel.vue`, `ProjectTaskRow.vue`, and their specs
  - `utils/projects/relativeTime.ts` and its spec
  - the stale strings

## Important Assumptions

- The Back control's visible text is "Projects" with an arrow icon (the design's "← Projects"), and its accessible name is "Back to projects" / "返回项目列表".
- The "N open tasks · N workspaces" line is one translation key (`ProjectCard.counts`), so the `·` separator is not a raw template literal (the strict audit requires this).
- The released `ProjectsList` description strings ("Group related workspaces…") are restored verbatim, as the design says to change only what it specifies.
- `ProjectDetail` gets the Back link in every state and makes the name an `h1` again, since the page is standalone.
- The cached Project still renders at once from the grid's store while it refreshes (carried from IR-001).
- `relativeTime.ts` is removed, because cards show no timestamp and nothing else used it.
- In the zh-CN probe, the English-string list includes "workspace" and "No tasks".

## Known Risks

- **Stale docs:** delivery's uncommitted docs-sync edits in the worktree still describe the rejected two-pane UI: `autobyteus-web/docs/projects.md`, `autobyteus-web/AGENTS.md` and `autobyteus-server-ts/docs/modules/projects.md`. They are not part of `ae0cd4755` and must be redone in delivery's docs sync (design step 7).
- **Long boards:** page scroll with many To Do cards scrolls the toolbar away (accepted by the user).
- **Delete count:** it relies on `openTaskCount`, which equals the total Task count only while no Task can be Done. The Task-admission work must revisit it.
- **Headless icons:** icons render from the iconify CDN. In the headless probe, some screenshots show missing icons (environmental; the rendered dev app shows them).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Behavior Change` (approved UI revised after user verification)
- Reviewed root-cause classification: `No Design Issue Found` in ownership (the problem was a layout decision)
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: store, service and dialog ownership are unchanged. The board replaces the panel as a consumer of `projectTaskStore`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. There is no two-pane toggle, no list-view alternative and no redirect.
- Legacy old-behavior retained in scope: `No`
- Dead or obsolete code removed in scope: `Yes`. The two-pane route and components, the panel, row, status filter, relative-time util and their strings and specs are gone.
- Shared structures remain tight: `Yes`. There are no model changes; the board's grouping is local computed state.
- Changed source files within size guardrails: `Yes` (`ProjectDetail.vue` 278 lines, `ProjectTaskBoard.vue` 188 lines).

## Persisted Data Transition Check

- Approved decision: `Directly Usable — No Migration` (unchanged from SR-004; IR-002 makes no persistence change)
- Implementation follows it: `Yes`
- Evidence: probe E2E-024 on the v1.4.86 file.
- Deviation: `None`

## Environment Or Dependency Notes

- The worktree needed `npx nuxt prepare` after delivery's merge. `vue-tsc` now reports about 6850 errors globally, none of them in Projects files. It needs `NODE_OPTIONS=--max-old-space-size=8192` to finish.
- The shell environment sets the `ENABLE_*` flags. The probe scrubs them for its child processes.
- `autobyteus-web/test-results/` (probe output) and the SDK `dist/` folders are untracked and not committed.

## Local Implementation Checks Run

- Web Projects specs pass:
  - `ProjectDetail` (13), `ProjectsList` (6), `ProjectTaskBoard` (8) and `ProjectTaskCard` (2);
  - `ProjectTaskDialog`, `ProjectFormDialog` and the two `ProjectWorkspaceLinkDialog` specs;
  - the store specs, `utils/projects` and the catalog specs.
- Full web suite: 3213 passed, 5 failed in 5 files. The same 5 fail at `a0fd103af` with these changes stashed:
  - `WorkspaceAgentRunsTreePanel.regressions`
  - `StartupDelayLifecycle`
  - `org-definition-navigation`
  - the font-size audit
  - `workspace-history-draft-send`
- `guard:localization-boundary` and `audit:localization-literals` pass.
- `vue-tsc` shows no errors in `components/projects`, `pages/projects`, `utils/projects` or the Projects catalogues.
- The server is unchanged, so server tests were not re-run in this round (they passed at IR-001 and in API-REV-001).

## Frontend Rendered-Result Check

- Affected surfaces:
  - Projects grid;
  - Project page (Back, header, tabs);
  - Task board (columns, cards, empty, no-match);
  - Task dialog opened from cards;
  - narrow and widened-panel layouts;
  - zh-CN.
- References: SR-008 design (Ownership Map, Concrete Examples, Layout rule), requirements `REQ-006` and `REQ-016`, AC-002 width guards.
- Surface used: the adapted Playwright probe against real isolated nodes and the real app shell (`pnpm dev` frontend), 26/26 Pass. I viewed the screenshots directly:
  - `E2E-027-1200-default-panel.png`: three even columns, 3-line clamp;
  - `E2E-027-1200-panel-520.png`: stacked, no squeeze;
  - `E2E-018-pass.png`: grid with the count lines;
  - `E2E-023-narrow-stacked.png`.
- States inspected:
  - empty board ("No tasks" ×3);
  - populated To Do with filtered counts;
  - search no-match and Clear;
  - cards clamped to 3 lines;
  - Back navigation;
  - not-found with Back;
  - zh-CN board;
  - keyboard journey (probe E2E-021).
- Issues found and fixed: none remaining. During spec work, the translation key for the separator line was added so the strict audit passes.
- Limitations:
  - Visual checks came from probe screenshots rather than a hand-driven session this round.
  - Icons were missing in some headless screenshots (CDN), which doesn't affect layout.

## Downstream Coverage Hints / Suggested Scenarios

- These have executable coverage in the updated probe (E2E-001 to E2E-027), and API/E2E should re-run it:
  - grid → page → Back;
  - card count line variants;
  - board columns, counts and search;
  - width guards at 1200 px (default and 520 px panel), 1000 px and 700 px;
  - zh-CN;
  - keyboard;
  - released-data fixture;
  - mixed-status columns.
- Suggested extra: a visual comparison of `/projects` against v1.4.86 (AC-011 "visual comparison").

## API / E2E / Executable Coverage Investigation And Execution Still Required

- API/E2E re-validation of the IR-002 web UI and the updated probe. The server API e2e from API-REV-001 still applies unchanged.
- Delivery: redo the docs sync for the SR-008 UI (design step 7), replacing the uncommitted two-pane doc edits. DR-001 must not be finalized.
