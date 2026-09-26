# Implementation Handoff

Package `PROJ-TASKS-20260926-001` — `project-tasks` (description-only Project Tasks, two-pane Projects page).
Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks`, branch `codex/project-tasks`, base `origin/personal@e06080b00`, finalization target `origin/personal`.
Commits: `8d3de39a6` (server), `e8fca7771` (web). Review diff: `git diff e06080b00..e8fca7771`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Medium/High); `ARCH-REV-001` Pass → `/implementation_engineer`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/requirements-doc.md` (Approved, `SR-003`, `APPROVAL-PROJ-TASKS-20260926-001`)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/design-spec.md` (`SR-004`)
- Supplemental task artifacts: none that define behavior; released predecessor `tickets/done/projects-concept-introduction/` is context only.
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/design-review-report.md` (`ARCH-REV-001`, Pass)
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/architecture-review-revision-record.md`
- Architecture-review handoff context: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/handoff-to-architecture-review-sr-004.md`
- Triggering rework report: N/A (initial).

## Current Implementation Summary

Server:
- Tasks are embedded in each Project row (`tasks: ProjectTask[]`).
- `ProjectStore` projects a row without `tasks` to `[]` and filters invalid Tasks. There is no migration, and a read never rewrites the file.
- New `ProjectTaskService` (list, create, edit description, delete) writes only `Project.tasks` through its own locked updater. It never touches the Project's fields or `updatedAt`, and has no status mutation.
- `ProjectService.toView` omits `tasks` explicitly and computes `openTaskCount`. `deleteProject` is unchanged; Tasks go with the record atomically.
- Additive GraphQL: `ProjectTask`, `ProjectTaskStatus`, `projectTasks`, `createProjectTask`, `updateProjectTask`, `deleteProjectTask`, and `Project.openTaskCount`.

Web:
- `pages/projects.vue` is the parent route: `ProjectListPane` plus `<NuxtPage>`. Its children are the select prompt (`index.vue`) and `ProjectDetail` (`[id].vue`).
- `ProjectDetail` has a header (name, description, small Edit/Delete) and accessible tabs: Tasks by default, Workspaces via `?tab=workspaces`.
- The Workspaces section moved unchanged into `ProjectWorkspacesPanel`, keeping its test ids.
- New components:
  - `ProjectTasksPanel`: search, status filter (All/To Do/In Progress/Done), New task, and loading/error/empty/no-match states.
  - `ProjectTaskRow`: status text, first-line summary, localized relative time.
  - `ProjectTaskDialog`: create, view, edit and confirm-delete modes in one `ProjectDialogFrame`.
- New `projectTaskStore`; `projectStore` gains `setOpenTaskCount`.
- The delete confirmation states the Task count.
- `ProjectsList`, `ProjectCard` and their spec and catalogue keys are removed.
- en and zh-CN strings added.

Cycle and revision references:
- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-003`, `SR-004`
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: `CRR-001` — Pass (round 1, `code-review-report.md`, no findings; informational, no action; optional polish noted: unused `deleted` emit in `ProjectTaskDialog`, browser-locale Task dates)
- Related API/E2E and delivery revision IDs: N/A
- Triggering finding IDs: N/A

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec › Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence: the work stays inside the Projects subsystem: 54 files in `git diff --stat e06080b00..HEAD`, about half of them specs. It changes the released persisted shape additively (`tasks`), the GraphQL contract additively, and the released Projects UI. No escalation trigger was hit:
  - no migration or rewrite of existing rows;
  - no delegated-task code touched;
  - no status mutation;
  - 150-Task client filtering stays well under the limit.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-006 / BEH-001 (DS-001) | Create, edit description, delete Tasks | `ProjectTaskDialog` → `projectTaskStore.createTask/updateTaskDescription/deleteTask` → `project-tasks.ts` resolver → `ProjectTaskService` (trim/required description, `project_task_<uuid>`, `TODO`, timestamps, inside the locked updater) → `ProjectStore.updateRecords` | Empty description → `TASK_DESCRIPTION_REQUIRED` (client check + server), missing Task → `TASK_NOT_FOUND`. After each write the store applies the change to the loaded list (fetching it first if needed) and pushes `openTaskCount` via `projectStore.setOpenTaskCount`. |
| BEH-001 (DS-002, DS-005) | List with status text, summary, relative time; newest first; search; status filter | `ProjectTasksPanel` → `projectTaskStore.fetchTasks` → `projectTasks` → `ProjectTaskService.listTasks` (sorted `updatedAt` desc, `taskId`) | Client-side search (full description, case-insensitive) and filter; no-match with "Clear search and filter"; 150-Task filter spec. There is no status control anywhere; specs assert rows have a single button and no select or input. |
| BEH-002 (DS-003) | Project delete removes its Tasks; the confirmation states the count | `ProjectDetail.confirmDelete` → `projectStore.deleteProject` → `ProjectService.deleteProject` (record filter; Tasks embedded) → `projectTaskStore.forget` → `/projects` | The count comes from `openTaskCount`, with a code comment that it equals the total only while no status mutation exists (review note 1). This is correct when landing directly on `?tab=workspaces` (verified live). Server cascade test: other Projects' Tasks are untouched. |
| BEH-003 | Same flag hides Tasks | Existing `/projects*` route gate and nav filter | Unchanged; probe E2E-001, -002 and -009 pass on the new layout. |
| BEH-004 (DS-004) | Two-pane page; one-click switching; open counts; deep links | `pages/projects.vue` (`ProjectListPane` + `<NuxtPage>`), `ProjectListItem` (`NuxtLink`, `aria-current`, "N open" text) | Live checks: the pane is the same DOM node across a Project switch and a `?tab=` change; a tab change triggers no Project reload; a cached Project shows without a loading flash. `/projects` shows the select prompt; an unknown id shows the not-found state in the right pane. |
| BEH-005 | Delegated tasks unchanged and separate | No delegated-task files changed; `ProjectTask*` names only | The architecture test forbids imports between `projects/**` and `agent-collaboration`/`agent-team-execution`/`agent-execution`/`agent-org-execution`. The schema test asserts no bare `Task`/`TaskStatus` types. |
| AC-010 (REQ-013) | Released rows directly usable | `ProjectStore.normalizeRecords` | Released-row fixture: Project and links intact, `openTaskCount` 0, file not rewritten by reads. |

## Key Files Or Areas

- Server:
  - `src/projects/services/project-task-service.ts` (new)
  - `src/projects/stores/project-store.ts`
  - `src/projects/services/project-service.ts`
  - `src/projects/domain/{models,project-errors}.ts`
  - `src/api/graphql/types/{project-tasks,projects}.ts`
  - `src/api/graphql/schema.ts`
- Web routing:
  - `pages/projects.vue`
  - `pages/projects/{index,[id]}.vue`
- Web components (all in `components/projects/`):
  - `ProjectListPane.vue`, `ProjectListItem.vue`
  - `ProjectDetail.vue`
  - `ProjectTasksPanel.vue`, `ProjectTaskRow.vue`, `ProjectTaskDialog.vue`
  - `ProjectWorkspacesPanel.vue`
- Web stores:
  - `stores/projectTaskStore.ts` (new)
  - `stores/projectStore.ts` (`setOpenTaskCount`; `fetchProject` no longer sets the list's `loading`/`error`)
- Web utils (all in `utils/projects/`):
  - `taskSummary.ts`, `relativeTime.ts`, `taskStatusLabelKey.ts`
  - `projectRequestError.ts` (moved out of `projectStore`)
- Web types, catalogues and generated code:
  - `types/project.ts`
  - `localization/messages/{en,zh-CN}/projects.ts`
  - `generated/graphql.ts` (Projects-Tasks delta only: +221/−8, where the 8 removed lines are the Project fragment types that now include `openTaskCount`)
- Web tests: `tests/e2e/projects-feature-probe.mjs`

## Important Assumptions

- Review notes and how they are handled:
  1. **Delete count.** The count uses `openTaskCount`, with a comment that the Task-admission work must revisit it.
  2. **Shared list state.** `fetchProject` now leaves the list's `loading`/`error` alone; `ProjectDetail` owns its load state. The list pane also keeps the "only while no Projects are listed" rule. Specs cover both.
  3. **Orphaned copy.** The `ProjectsList`/`ProjectCard`/`backToProjects` catalogue keys and the `docs/projects.md` references are removed. A catalog spec asserts they are gone, and both guards pass.
  4. **Nested route.** Nav active-state, the mobile gate and the route gate were verified: probe E2E-001, -002, -009 and -013, plus a live check. The parent key is stable. `?tab=` doesn't re-run `load`.
  5. **`toView` and `updatedAt`.** `toView` omits `tasks` explicitly. Task writes use their own updater, and a test asserts the Project's fields and `updatedAt` are unchanged.
  6. **E2E probe.** The released cases are adapted, not deleted:
     - card clicks became list-item clicks;
     - the Back link became one-click list switching;
     - workspace operations open `?tab=workspaces`;
     - the keyboard journey switches tabs with the arrow keys.
     E2E-008's "no Task wording" assertion is replaced by a "no raw translation keys" check, because `REQ-011` supersedes released `REQ-014`/`AC-012`.
- Implementation choices within the design:
  - **Task delete dialog.** Task delete confirmation is a mode inside `ProjectDialogFrame`, not `ConfirmationModal`. That modal lacks a focus trap, which `AC-012`/`QR-003` require; the same frame was accepted in the released package.
  - **Localized time.** Relative time uses a new localized util (`projects.time.*`), because the existing formatters are English-only.
  - **Status labels.** Status labels come from a static key map, which the strict literal audit requires.
  - **Create Project.** Creating a Project now selects it (`/projects/<new id>`), which is natural in the two-pane layout.
  - **Cached Project.** A cached Project renders immediately while it refreshes in the background.
  - **Save shortcut.** Ctrl/⌘+Enter saves in the Task dialog.
  - **Error helper.** `ProjectRequestError` and the GraphQL error mapping moved from `projectStore` to `utils/projects/projectRequestError.ts` so both stores share them. Importers were updated; there is no re-export.

## Known Risks

- Single-file write amplification and lock contention will matter once agents update status often. This is deferred to Task admission with the design's trigger.
- There is no description length limit, as approved.
- Binding-revision request sequencing is now duplicated in two stores (review note 5); extract it if a third copy appears.
- The narrow stacked layout (below `md`) was not visually inspected, because the browser tool can't resize the viewport. It uses the same `flex-col md:flex-row` pattern as Settings. The probe's 1024px case passes.
- The full `docs/projects.md` and server `docs/modules/projects.md` sync is delivery's step 10. The web doc's scope paragraph still says "no Task concept".

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Feature` + `Behavior Change` (released Projects UI)
- Reviewed root-cause classification: `No Design Issue Found`
- Reviewed refactor decision: `No Refactor Needed` (server ownership); the web page structure was replaced as approved behavior.
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: one locked store path serves both services; `ProjectTaskService` owns only Task invariants.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. There is no redirect and no compatibility re-export.
- Legacy old-behavior retained in scope: `No`
- Dead or obsolete code removed in scope: `Yes`:
  - `ProjectsList.vue`, `ProjectCard.vue` and `ProjectsList.spec.ts`;
  - the Back link;
  - the released "no task text" assertions;
  - orphaned catalogue keys.
- Shared structures remain tight: `Yes`. The stored Task has no `projectId`, summary or title. `ProjectView` excludes `tasks`.
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`. The largest is `ProjectDetail.vue` at 245 effective lines.

## Persisted Data Transition Check

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: design-spec › Persisted Data / State Transition Decision
- Implementation follows the decision without migration or version-specific fallback: `Yes`. Absence of `tasks` normalizes to `[]` in the generic reader.
- Direct-use evidence: the released-row fixture test. The v1.4.86 row reads correctly, and reads don't rewrite the file. The first write persists `tasks`.
- Deviation: `None`

## Environment Or Dependency Notes

- The fresh worktree needed several setup steps before tests ran:
  - `pnpm install`;
  - builds of `autobyteus-ts` and the three application SDK packages (untracked `dist/`, not committed);
  - `prisma generate` and `nuxt prepare`.
- The shell environment sets `ENABLE_PROJECTS=true` and other `ENABLE_*` variables. The released server e2e test (`tests/e2e/projects`) fails API-001 unless they are unset, on base as well. It passes with `env -u ENABLE_PROJECTS -u ENABLE_APPLICATIONS -u ENABLE_SKILL_IMPROVEMENT -u ENABLE_SELF_EVOLUTION`.
- The probe output directory `autobyteus-web/test-results/` is untracked and not committed.

## Local Implementation Checks Run

Server:
- `tests/unit/projects/**`, `tests/unit/api/graphql/{types/projects,projects-schema,project-tasks-schema}.test.ts`, `tests/architecture/projects-boundaries.test.ts` and `tests/unit/services/server-settings-service.test.ts` pass (8 files).
- The released `tests/e2e/projects` passes, with the `ENABLE_*` variables scrubbed.
- `tsc -p tsconfig.build.json` shows no errors in the Projects files.

Web:
- `components/projects` (7 files, 52 tests), `stores/__tests__/{projectStore,projectTaskStore}.spec.ts` and `utils/projects` all pass.
- Adjacent suites pass: middleware, composables, utils, localization, layout, settings, stores and pages. The only failures are the pre-existing files below.
- Full suite: 3208 passed, 13 failed in 6 files. The same 6 files and 13 tests fail on base `e06080b00`:
  - `agentTeamRunStore`
  - `WorkspaceAgentRunsTreePanel.regressions`
  - `org-definition-navigation`
  - `workspace-history-draft-send`
  - the font-size audit
  - `StartupDelayLifecycle`
- `guard:localization-boundary` and `audit:localization-literals` pass.
- `vue-tsc` shows no errors in changed files (393 total on base).

## Frontend Rendered-Result Check

- Affected surfaces and journeys:
  - the Projects page, list pane and select prompt;
  - Project detail with tabs;
  - the Tasks list, search, filter and no-match;
  - the Task dialog in create, view, edit and validation;
  - the Project delete count;
  - the Workspaces tab;
  - zh-CN.
- References: requirements UI section, `REQ-016`, design `DS-001`–`DS-005`, Concrete Examples.
- Existing surfaces reviewed: `pages/settings.vue` two-pane pattern, the released Projects components, `ProjectDialogFrame`.
- Surface used: `pnpm dev` in the worktree (isolated `.autobyteus/development`, ports 8000/3000), driven through the browser tool, then stopped. Additionally, the adapted Playwright probe ran with its own isolated nodes and frontend: 13/13 Pass.
- States inspected:
  - no-selection prompt;
  - list with counts ("4 open", "0 open") and selection highlight;
  - Tasks list with status labels, summaries and relative times;
  - empty Project;
  - search by description and by a later line;
  - status filter no-match and clear;
  - view dialog with the full multi-line description (initial focus on Edit);
  - edit (focus in the textarea), Cancel back to view;
  - New task empty validation, then create; the count went to "5 open" live;
  - direct landing on `?tab=workspaces` with delete message "…and its 5 tasks?";
  - zh-CN list, tabs, status labels and times.
- Issues found: none requiring changes.
- Limitations:
  - The narrow stacked layout wasn't rendered live.
  - Interactions were driven by script rather than a real keyboard; the probe's keyboard journey E2E-007 covers the released flows on the new layout, but not Task-dialog keyboard flows beyond the specs.

## Downstream Coverage Hints / Suggested Scenarios

- AC-001: create a Task from a multi-line description; it shows To Do with the first-line summary; it survives reload and restart; an empty description is rejected.
- AC-002: status text, newest first, no status control; empty-Project state.
- AC-003 and AC-004: edit (Cancel discards) and delete with confirmation.
- AC-005: 100+ Tasks, search "release", clear; no-match.
- AC-006: delete a Project with 5 Tasks; the confirmation says 5, including after landing on `?tab=workspaces`; `workspaces.json` is unchanged.
- AC-007: the list pane shows "4 open"; a Project without Tasks shows "0 open".
- AC-008: flag off, then on; the same Tasks come back.
- AC-009: run a team with delegated tasks; no crossover.
- AC-010: released v1.4.86 `projects.json` fixture (no `tasks`) is intact.
- AC-011: one-click switching keeps the pane; deep link; unknown id shows not-found.
- AC-012: zh-CN and a keyboard-only Task journey (dialog modes, tabs with arrow keys).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- New Task browser cases in `tests/e2e/projects-feature-probe.mjs` (design step 9) are owned by `api_e2e_engineer`: create, view, edit, delete, search, filter, the delete count, the 100-Task timing and the released-data fixture. The released cases are already adapted and pass 13/13.
- Server API e2e for the Task operations and the cascade.
- Docs sync (design step 10) is owned by delivery.
