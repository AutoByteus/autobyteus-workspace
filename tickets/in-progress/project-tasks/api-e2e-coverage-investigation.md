# API/E2E Coverage Investigation

Package `PROJ-TASKS-20260926-001` — `project-tasks` (description-only Project Tasks on a two-pane Projects page).

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/requirements-doc.md` (Approved, `SR-003`)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/design-spec.md` (`SR-004`)
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/handoff-to-architecture-review-sr-004.md`; released predecessor `tickets/done/projects-concept-introduction/` (context)
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/design-review-report.md` (`ARCH-REV-001`, Pass)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/implementation-revision-record.md` (`IR-001`)
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/code-review-report.md` (`CRR-001`, Pass 9.3/10)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/api-e2e-revision-record.md` (created after the first completed result)
- Current API/E2E Revision ID: `API-REV-002` (round 2; `API-REV-001` validated the superseded two-pane UI)
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/api-e2e-test-case-ledger.md`
- Current Investigation Round: `2`
- Trigger: round 2 — `/code_reviewer` Pass `CRR-003` of `IR-002` (`ae0cd4755`, web-only rework after the user rejected the two-pane UI in `DR-001`). Basis: `SR-008` requirements (`APPROVAL-PROJ-TASKS-20260927-002`), `ARCH-REV-003`. Round 1: `CRR-001` of `IR-001` (`8d3de39a6`, `e8fca7771` on `e06080b00`).
- Prior Investigation Reviewed: N/A for this package. The released predecessor's investigation is context for the durable coverage being extended.
- Latest Authoritative Investigation: this document, round 2 (see "Round 2 — SR-008 Rework Basis And Plan"; round-1 sections below are kept where still valid and marked where superseded)

## Round 2 — SR-008 Rework Basis And Plan (authoritative for round 2)

### Changed basis

`SR-008` supersedes `REQ-006`, `REQ-007`, `REQ-009` and `REQ-016`, and `AC-002`, `AC-005`, `AC-007` and `AC-011`. The approval of record is `APPROVAL-PROJ-TASKS-20260927-002`. All other requirements are unchanged.

**Projects grid (`REQ-016`, `AC-011`)**
- The Projects page is the released v1.4.86 grid.
- Each card's bottom line reads "N open tasks · N workspaces" (`REQ-009`, `DEC-015`).
- A card opens a separate, full-width `/projects/<id>` page, which has "← Projects" at the top-left in every state.
- The page header shows name, description (clamped to 2 lines), Edit and Delete.
- It has plain Tasks (default) and Workspaces tabs (`DEC-014`).

**Task board (`REQ-006`)**
- Three columns: To Do / In Progress / Done, each headed "name count".
- Cards show the description only, up to 3 lines; the summary is the accessible name.
- Newest updated first; muted "No tasks" in empty columns; no drag or move.
- The columns stack whenever the board cannot fit three columns of at least 240 px. This depends on the board's own width (a container query at 752 px), not on the viewport.

**Search (`REQ-007`)**
- Search runs across the columns; the counts reflect the search.
- One no-match state with Clear search.
- There is no status filter.

The server, `projectTaskStore`, `projectStore`, `ProjectTaskDialog` and `ProjectWorkspacesPanel` are unchanged since `IR-001`. The merge `a0fd103af` brought no Projects changes, so the API cases from round 1 still apply.

### Surface and boundary delta

- The web renderer only: pages, `ProjectsList`/`ProjectCard` restored from `e06080b00` plus the count line, `ProjectDetail`, `ProjectTaskBoard`/`ProjectTaskCard`, the catalogues, and the probe.
- Source identity was checked with `git diff e06080b00 HEAD`:
  - `pages/projects/index.vue`, `pages/projects/[id].vue` and `ProjectsList.vue` are **byte-identical** to v1.4.86;
  - `ProjectCard.vue` differs only in the bottom-line count label.
- New risk surface: container-query layout inside the real app shell. The left side panel is resizable up to 520 px; the window size varies.

### Existing durable coverage decisions (round 2)

| Path / Scenario | Round-2 Validity | Evidence / Action |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` (API-001…009) | Still Valid (server unchanged) | Rerun with the shell `ENABLE_*` flags set: pass |
| `autobyteus-web/tests/e2e/projects-feature-probe.mjs` E2E-001…013 | Still Valid. These are restored to the v1.4.86 journeys (grid, card, Back), with `?tab=workspaces` for workspace operations and a keyboard tab switch in E2E-007. | Diffed against the v1.4.86 probe: only helper renames and the tab handling differ. Rerun. |
| Same probe, E2E-014…027 | Rewritten by `IR-002` for the board. This replaces my round-1 two-pane assertions (E2E-014…026), which are **Stale / Replaced** because `REQ-016` superseded the two-pane layout. | Each case reviewed against `SR-008`. They assert: columns, counts and "No tasks"; no drag, select or status control; newest first; card counts (none, singular, plural); search with filtered column counts and focus return; full width; Back; deep link; not-found with Back; keyboard; zh-CN; the 700 px stack; width guards at 1200 px (default and 520 px panel) and 1000 px; the released file; mixed statuses; restart. Rerun. |
| Removed specs (`ProjectListPane`, `ProjectTasksPanel`, `relativeTime`) | Stale / Remove, done by `IR-002` | They assert the rejected two-pane/list UI; replaced by the `ProjectTaskBoard`/`ProjectTaskCard`/`ProjectsList` specs (accepted in `CRR-003`) |
| Web component and store specs; delegated-task suites | Still Valid | 1184/1185 pass (1 pre-existing `org-definition-navigation`) |

### Durable coverage to add (round 2)

| Scenario ID | Behavior | Requirement / AC | Artifact | Why |
| --- | --- | --- | --- | --- |
| E2E-028 | Width **sweep**: with the default panel and with the 520 px panel, from 760 to 1600 px in 40 px steps. At every step, columns are either all ≥ 240 px side by side or stacked, and there is no horizontal overflow. | `REQ-006`, `AC-002` | `projects-feature-probe.mjs` | The existing guards sample only 3–4 widths. The invariant "stack instead of squeeze" must hold at every width, including just above and below the 752 px container threshold. |
| E2E-029 | "← Projects" is present and working in the **error** state (the GetProject query fails); the Project description is clamped to 2 lines | `REQ-016` (Back at top-left), design Concrete Examples | same | E2E-020 covers only the not-found state |

### Round-2 execution plan

1. Rerun the server suites and API e2e (done: 45 files / 275 tests pass, with the shell flags set).
2. Rerun the web suites and guards (done: as above).
3. Rebuild the server, because the merge `a0fd103af` touched non-Projects server code.
4. Run the full probe: E2E-001…029.
5. Rerun twice via `pnpm test:e2e:projects`.

### Round-2 repository results and post-repository scorecard

- Server (unchanged since `IR-001`): 45 files / 275 tests pass, including `tests/e2e/projects` API-001…009 with the shell `ENABLE_*` set, and the delegated-task suites (`/tmp/ptasks-logs/r2/server.log`).
- Web: 1184/1185. The one failure is the pre-existing `org-definition-navigation`. Both localization guards pass (`/tmp/ptasks-logs/r2/web.log`).
- Post-repository scores, before the browser rerun:

| Category | Score | Remaining Uncertainty |
| --- | --- | --- |
| Requirement/AC proof | 80% | The SR-008 UI ACs (002, 005, 007, 011, 012) are proven only by specs |
| Changed-boundary directness | 80% | The rewritten pages and board have not been rendered in a real shell |
| Integration realism | 80% | The server is proven; the web layer uses mocked Apollo |
| Environment fidelity | 90% | The hermetic harness still passes |
| Failure/edge/lifecycle | 90% | Carried server evidence |
| User-surface | 60% | Container-query layout in the real shell, and panel resize |
| Durable regression quality | 85% | Probe not yet rerun; the sweep and error-state cases are not yet added |

- Overall: 81%. Broader validation: `Required` (Browser).

### Round-2 decision

- Proceed: `Yes` (completed). Durable coverage was updated: E2E-028 and E2E-029 were added to the probe, and the header comment was corrected.
- Results: E2E-001…029 pass 29/29, three times. The final confidence is in the execution report.
- Reroute: `No`.

### Round-2 not tested / deferred

- A pixel comparison of `/projects` against a running v1.4.86 build. It is replaced by source identity (the three grid files are byte-identical; `ProjectCard` differs only in the approved count line), plus a screenshot review of the current grid. A pixel diff would only re-prove identical markup.
- AC-009: unchanged (existing suites; no live LLM team run).

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (durable coverage is added and updated)

## Current Requirement And Design Basis

A Project gets Tasks, embedded as `Project.tasks` in `projects.json`. A Task has no title. Its description is required, multi-line, and trimmed. Its status is To Do, In Progress or Done, and every new Task starts as To Do. Humans cannot change status anywhere (`REQ-003`).

**Listing and finding Tasks**
- Rows show a status label as text, the first line of the description, and a relative "updated" time.
- Rows are sorted newest-updated first.
- A status filter (All / To Do / In Progress / Done) and a search by description narrow the list, with a no-match state.
- Search must stay responsive, under 100 ms with 100+ Tasks (`QR-002`).

**Managing Tasks**
- Create, view, edit and delete happen in one dialog.
- Delete requires confirmation, and Cancel keeps the Task.

**Project deletion**
- Deleting a Project cascades to its Tasks.
- The confirmation states the Task count.
- Workspaces and run history are untouched.

**Two-pane page (`REQ-016`)**
- The left pane shows search, New Project, and each Project's name with its "N open" count.
- The right pane shows the selected Project with Tasks (the default) and Workspaces tabs.
- Switching Projects takes one click, and the left pane stays in place.
- The routes `/projects/<id>` and `/projects` (a select prompt) keep working; an unknown id shows not-found.
- At narrow widths the panes stack.

**Other constraints**
- The same `ENABLE_PROJECTS` flag hides Tasks, and data is kept while hidden.
- Released v1.4.86 rows are directly usable: no migration and no rewrite on read.
- Delegated tasks are unchanged.
- Everything is localised in en and zh-CN, and keyboard operable.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-006/BEH-001 Task CRUD, list, search, filter | Added | REQ-001–007, 014; DS-001/002/005 | Un-mocked GraphQL e2e + browser journeys, including 100+ Tasks timing |
| BEH-002 Project delete cascade + count | Changed | REQ-008; DS-003 | GraphQL cascade + browser count, cancel and confirm; registry invariance |
| BEH-003 Flag governs Tasks | Preserved (extended) | REQ-010 | Browser off → on keeps Tasks |
| BEH-004 Two-pane navigation, open counts, deep links | Changed (replaces released grid) | REQ-009, REQ-016; DS-004 | Browser: one-click switch with the same pane DOM node, deep link, prompt, not-found, counts, narrow stacking |
| BEH-005 Delegated tasks | Preserved | REQ-012 | Existing suites + unchanged files + schema/architecture tests |
| Persisted data (`tasks` added) | Changed (additive) | `Directly Usable — No Migration` | Released-shape fixture in the API e2e + a live node seeded with a v1.4.86 file |
| Released Projects behavior (workspaces, flags, rebinding, keyboard) | Preserved on the new layout | Released AC-001–AC-012 | Adapted released probe (E2E-001…013) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `ProjectTaskService`, `ProjectStore.normalizeRecords`, `ProjectService.toView`/`openTaskCount` | Unit tests with a real file store | — | Un-mocked GraphQL e2e |
| API / transport / contract | Yes | `project-tasks.ts`, `Project.openTaskCount` | `project-tasks-schema.test.ts` (resolver path) | Contract exercised by the real web client | Browser |
| Frontend component / state | Yes | Two-pane route shell, list pane, detail tabs, Task panel/row/dialog, `projectTaskStore` | Component and store specs (mocked Apollo) | Real rendering, routing, focus, timing | Browser |
| Browser integration / user journey | Yes | All ACs | Adapted released probe (13 cases) only | New Task journeys | Browser (extend the durable probe) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Renderer only | As above | As above | Browser via `pnpm dev` |
| Desktop shell / Electron-specific | No | No shell change | — | — | — |
| Process / lifecycle | Yes | Tasks persist across restart | Unit tests | Real restart | Browser + lifecycle |
| Persisted-data transition | Yes | Additive `tasks` field on released rows | Unit test with a released-row fixture | Live node starting from a v1.4.86 file; no rewrite by the UI's reads | API e2e + live-node fixture |
| Worker / queue / distributed | No | — | — | — | — |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks` (branch `codex/project-tasks`)
- Stack: the same as the released package. The server is Node 22 / type-graphql. The web app is Nuxt 3 / Pinia / Apollo, with durable browser probes in `autobyteus-web/tests/e2e/*.mjs` run by `playwright-core`.
- Conflicting or unclear instructions:
  - This developer shell now also exports `ENABLE_PROJECTS=true` (plus `ENABLE_APPLICATIONS=false`, `ENABLE_SKILL_IMPROVEMENT=true`, `ENABLE_SELF_EVOLUTION=true`).
  - With them set, the released `tests/e2e/projects` API-001 fails; with them unset it passes (confirmed). This test-environment fidelity defect in my released durable test must be fixed, so the test becomes hermetic.
  - `autobyteus-web/test-results/` is untracked output from the implementation run. It is not mine, so I leave it untouched and write my evidence to `/tmp/ptasks-logs`.
- Secrets: `N/A`

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-web/package.json` | Scripts | `test:nuxt`; `test:e2e:projects` → `node tests/e2e/projects-feature-probe.mjs`; localization guard/audit |
| `autobyteus-web/tests/e2e/projects-feature-probe.mjs` | Released durable probe (adapted by `IR-001`) | Isolated nodes A/B; scrubbed `ENABLE_*`; per-case `result.json`; `--only`, `--output-dir`, `--skip-server-build` |
| `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` | Released un-mocked API e2e | Full schema; isolated `appConfigProvider` data dir; run managers emulated as having no active runs |
| `autobyteus-server-ts/src/persistence/file/store-utils.ts` | File format | `JSON.stringify(rows, null, 2) + "\n"`, atomic tmp+rename (used for fixture realism and "no rewrite" checks) |
| `autobyteus-web/components/projects/*.vue`, `pages/projects*.vue` | Selectors | `project-list-pane`, `project-list`, `project-list-item-<id>`, `project-list-item-open-count`, `project-tab-{tasks,workspaces}`, `project-tasks-*`, `project-task-row-<id>` (`data-status`), `project-task-*` dialog ids, `project-delete-message`, `projects-select-prompt`, `project-not-found` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | `autobyteus-server-ts` | `corepack pnpm -C autobyteus-server-ts build` | `dist/` (ignored) | `dist/app.js` | — |
| Nodes A/B (+ C for the released fixture) | `autobyteus-server-ts` | Probe-owned `prisma migrate deploy` + `node dist/app.js --data-dir <tmp>` on free ports | Temp sqlite; `ENABLE_*` scrubbed | `/rest/health` | Process-group SIGTERM/SIGKILL |
| Frontend | `autobyteus-web` | Probe-owned `pnpm dev` (`BACKEND_NODE_BASE_URL=A`) | Nuxt dev | HTTP 200 | Process-group SIGTERM/SIGKILL |
| Chromium | — | `playwright-core` headless | 1440×900, plus 1024×700 and a narrow width below `md` | — | `browser.close()` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Tasks, including a 120-Task Project | Real `createProjectTask` GraphQL mutations (setup) or the UI (under test) | Probe temp nodes only | Temp root removed |
| Released v1.4.86 `projects.json` | Written in the released shape (no `tasks`) into a fresh node's data dir before start, next to a matching `workspaces.json` | Fixture node only | Temp root removed |
| No identities or secrets | — | The user's `.autobyteus` data is not touched | — |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- References: design-spec › Persisted Data / State Transition Decision; handoff › Persisted Data Transition Check
- Representative existing data: a v1.4.86 row `{projectId,name,description,createdAt,updatedAt,workspaces:[{workspaceId,workspaceRootPath,description,addedAt}]}` with no `tasks` field, in the store's own file format
- Evidence planned:
  - API e2e: the released file reads intact with `openTaskCount: 0` and `projectTasks: []`, and the file bytes are unchanged after reads. The first Task write persists `tasks` while keeping every released field.
  - Live-node fixture: the UI shows the released Project, its link and 0 open, and the bytes are unchanged after browsing. Creating a Task through the UI then persists.
- Migration scenarios: N/A
- Upstream ambiguity: none

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/projects/{project-service,project-task-service}.test.ts`, `tests/unit/api/graphql/{projects-schema,project-tasks-schema,types/projects}.test.ts`, `tests/architecture/projects-boundaries.test.ts` | Service invariants, released-row fixture, resolver/schema, import boundaries | REQ-001–013, QR-001 | Still Valid | 9 files / 110 tests pass | Keep |
| `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` API-001…006 | Released un-mocked Projects API | Released ACs; REQ-011/013 here | **Needs Update**. API-001 is not hermetic: it inherits shell `ENABLE_*`. There is also no Task, cascade or released-file coverage. | Fails with the shell env set, passes scrubbed | Scrub/restore `ENABLE_*` in the harness; add API-007…009; extend API-006 with Tasks |
| `autobyteus-web/tests/e2e/projects-feature-probe.mjs` E2E-001…013 | Released journeys adapted to two panes by `IR-001` | Released ACs; AC-008/011 in part | Still Valid (adapted assertions reviewed; E2E-008's Task-wording check correctly replaced by a raw-key check per `REQ-011`) | Implementation reports 13/13 (rerun planned) | Keep; extend with E2E-014…024 |
| `autobyteus-web/components/projects/__tests__/*` (incl. `ProjectTasksPanel`, `ProjectTaskDialog`, `ProjectListPane`, `ProjectDetail`), `stores/__tests__/{projectStore,projectTaskStore}.spec.ts`, `utils/projects/__tests__/*` | Component/store behavior with mocked Apollo | AC-001–007, 011, 012 | Still Valid | Pass (182 files / 1107 of 1108 in the broad run; the 1 failure is the pre-existing `org-definition-navigation`) | Keep |
| Delegated-task suites (`components/workspace/team`, `components/workspace/collaboration`, `utils/__tests__/teamDelegatedTaskEntries.spec.ts`, `stores/__tests__/agentTeamContextsStore.spec.ts`, `components/memory`; server `tests/unit/agent-collaboration`, `tests/unit/agent-team-execution`) | Delegated-task behavior | AC-009 / REQ-012 | Still Valid | Web 24 files / 112 tests; server 37 files / 200 tests; all pass | Keep (AC-009 evidence) |

## Stale Or Obsolete Coverage Decisions

None removed by me. `IR-001` already removed `ProjectsList.spec.ts`, which asserted the released card grid. That removal matches `REQ-016`, which replaces the grid, and `CRR-001` accepted it.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-007 | Task CRUD over GraphQL with a real store: trim, TODO, ordering, validation codes, Project `updatedAt` unchanged, `openTaskCount`, no status mutation in the schema | AC-001–004, 007; REQ-003 | `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` | The resolver specs mock nothing on this path, but they never run with the full schema plus the real store and registry together |
| API-008 | Project delete cascade; other Projects' Tasks untouched; `workspaces.json` byte-identical | AC-006, QR-001 | same | Cascade across real files |
| API-009 | Released v1.4.86 file: intact reads, no rewrite, first Task write keeps released fields | AC-010, REQ-013 | same | Persisted-data decision |
| E2E-014…024 | Task journeys, delete count, counts, flag, two-pane navigation, keyboard + zh-CN, narrow stacking, released-file node, restart | AC-001–008, 010–012, QR-002, QR-003 | `autobyteus-web/tests/e2e/projects-feature-probe.mjs` | Design step 9 |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / AC / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| API harness / API-001 | `projects-graphql.e2e.test.ts` `beforeEach`/`afterEach` | Remove and restore every `ENABLE_*` process variable around each test | Test fidelity (a fresh node must not inherit developer-shell flags) | My released test; environment defect, not product |
| API-006 | same | Also persist a Task before the simulated restart and read it back after | AC-001 "survives restart", REQ-013 | Additive |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `npx vitest run tests/unit/projects tests/unit/api/graphql/{types/projects,projects-schema,project-tasks-schema}.test.ts tests/architecture/projects-boundaries.test.ts tests/unit/services/server-settings-service.test.ts tests/unit/application-capability` | `autobyteus-server-ts` | Changed server units | Pass (9 files / 110 tests) | `/tmp/ptasks-logs/server-changed.log` |
| 2 | `npx vitest run tests/e2e/projects` with the shell env, then with `env -u ENABLE_*` | `autobyteus-server-ts` | Released API e2e | With env: API-001 fails (non-hermetic test). Scrubbed: 6/6 | `/tmp/ptasks-logs/server-e2e-env{set,unset}.log` |
| 3 | `NUXT_TEST=true npx vitest run components/projects components/settings components/common stores/__tests__/project{Store,TaskStore}.spec.ts stores/capabilities middleware composables utils localization components/workspace/config tests/stores/serverSettingsStore.test.ts components/layout pages` | `autobyteus-web` | Changed and adjacent web | 1107/1108; the 1 failure is the pre-existing `org-definition-navigation` (on the released package's base-failing list) | `/tmp/ptasks-logs/web-changed.log` |
| 4 | Localization guard + audit | `autobyteus-web` | REQ-015 strings | Pass | — |
| 5 | Delegated-task suites (web + server) | both | AC-009 | Pass (web 112; server 200) | `/tmp/ptasks-logs/{web,server}-delegated.log` |
| 6 | Updated `npx vitest run tests/e2e/projects` (shell `ENABLE_*` left set) | `autobyteus-server-ts` | API-001…009 | Pass 9/9, ×3; a combined run with the workspaces/settings e2e shows only the pre-existing `workspaces-graphql` removal failure | `/tmp/ptasks-logs/server-e2e-run{1,2,3}.log`, `server-e2e-combined.log` |
| 7 | `node tests/e2e/projects-feature-probe.mjs --skip-server-build` (run 1), then `pnpm test:e2e:projects` (runs 2, 3) | `autobyteus-web` | E2E-001…026 | Pass 26/26 ×3 | `/tmp/ptasks-logs/probe-run{1,2,3}/result.json` |

## Test-Case Ledger Plan

- Ledger required: `Yes`. About 35 cases across two surfaces, with a long-running multi-process probe.
- Canonical ledger path: `…/tickets/in-progress/project-tasks/api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Evidence Expected |
| --- | --- | --- | --- | --- | --- | --- |
| API-001…006 | Released API cases (API-001 hermetic; API-006 + Task) | Released; AC-001, REQ-013 | GraphQL e2e | `npx vitest run tests/e2e/projects` (shell env **not** scrubbed) | 1 | Vitest pass |
| API-007 | Task CRUD contract | AC-001–004, 007; REQ-003 | GraphQL e2e | same | 2 | same |
| API-008 | Cascade | AC-006; QR-001 | GraphQL e2e | same | 3 | same |
| API-009 | Released v1.4.86 file | AC-010; REQ-013 | GraphQL e2e | same | 4 | same |
| E2E-001…013 | Released journeys on two panes | Released ACs; AC-008 (flag), AC-011 in part | Browser | `pnpm test:e2e:projects` | 5 | `result.json` |
| E2E-014 | Empty state; create multi-line; To Do; first-line summary; empty rejected; "N open" live; full description in view; no status control; newest first | AC-001, AC-002, AC-007 | Browser | same | 6 | DOM + API |
| E2E-015 | Edit (Cancel discards, empty rejected, save) and delete (Cancel keeps, confirm removes) | AC-003, AC-004 | Browser | same | 7 | DOM + API |
| E2E-016 | 120 Tasks: search "release" < 100 ms; status filter; no-match + clear; Tasks unchanged | AC-005, QR-002, REQ-006 | Browser | same | 8 | Timing + DOM |
| E2E-017 | Project delete with 5 Tasks: count on both tabs; Cancel keeps; confirm cascades; registry unchanged | AC-006 | Browser + files | same | 9 | DOM + files + API |
| E2E-018 | Counts "4 open" / "0 open" | AC-007 | Browser | same | 10 | DOM |
| E2E-019 | Flag off → hidden; on → same Tasks | AC-008 | Browser | same | 11 | DOM + API |
| E2E-020 | One-click switch keeps the same pane node; deep link opens Tasks; `/projects` prompt; unknown id → not-found with a usable pane | AC-011 | Browser | same | 12 | DOM identity |
| E2E-021 | Keyboard-only Task journey + Home/End tabs + Project delete confirmation | AC-012, QR-003 | Browser keyboard | same | 13 | Focus assertions |
| E2E-022 | zh-CN Task surfaces; no raw keys or English Task strings | AC-012, REQ-015 | Browser zh-CN | same | 14 | DOM text |
| E2E-023 | Narrow width below `md`: panes stack, no overflow, dialog fits | REQ-016 | Browser 700×900 | same | 15 | Layout boxes |
| E2E-024 | Released v1.4.86 file on a live node C: intact, 0 open, no rewrite on browse; first Task write persists | AC-010 | Browser + node C + file | same | 16 | DOM + bytes |
| E2E-025 | Tasks survive a real backend restart | AC-001, REQ-013 | Lifecycle + browser | same | 17 | API + DOM |
| E2E-026 | Current-shape file with TODO/IN_PROGRESS/DONE Tasks on node C (stands in for future agent-written status): labels as text, filter per status, "2 open" excludes Done | AC-002, AC-007, REQ-006, REQ-009, QR-003 (not colour-only) | Browser + node C | same | 18 | DOM |

## Post-Repository Confidence Scorecard (Mandatory)

Scored after orders 1–6: existing suites, delegated-task suites, and the updated un-mocked API e2e. This is before the browser probe.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | AC-001–004, 006, 007 and 010 are proven at the real GraphQL/store boundary (API-007…009). AC-009 is proven by the unchanged delegated-task suites. | AC-002, 005, 008, 011 and 012 are proven only by mocked specs; QR-002 timing is unmeasured | Browser journeys |
| Changed-boundary execution directness | 80% | The server path runs un-mocked | The web ↔ server contract and two-pane routing are never executed together | Browser |
| Cross-boundary integration realism and mock gap | 75% | Real file store and registry | Web specs mock Apollo | Browser against live nodes |
| Environment, configuration, identity, and fixture fidelity | 90% | Hermetic harness (the shell flags no longer leak); released-shape fixture in the store's own format | No live node | Live nodes, including a released-file node |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | Validation codes, not-found, cascade, simulated restart, released file | Real restart; UI Cancel paths | Browser + lifecycle |
| User-surface, browser, and desktop-shell confidence | 60% | Component specs | Real layout at three widths, focus, zh-CN | Browser |
| Durable regression coverage quality and relevance | 85% | API e2e extended | No Task browser coverage | Durable probe cases |

- Overall post-repository confidence: 79% (simple average)
- Every critical AC directly proven: `No`
- Any category below 90%: `Yes` (six)
- 95% target met: `No`
- Material residual risks: Task journeys, two-pane routing, narrow layout, and search timing in a real browser

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Browser` (isolated live nodes, restart, a released-file node, three viewports, keyboard-only, zh-CN)
- Gap addressed:
  - The Task UI journeys are unexercised in a real browser.
  - The two-pane routing and DOM persistence are unexercised.
  - The narrow layout was never rendered.
  - The 100-Task timing is unmeasured.
  - The released-file upgrade on a live node is unproven.
- Why this mode helps: the ACs are user-journey ACs, and design step 9 names the browser probe.
- Expected confidence after: ≥ 95% if all pass.

## Desktop Application Validation Decision

- Web-equivalent renderer behavior only; no Electron change. Browser via `pnpm dev`. Node rebinding is exercised through `windowNodeContextStore.bindNodeContext`, as in the released probe. Effect on the running desktop app: `None`.

## Live Environment And Fixture Plan

- Startup:
  1. Server build.
  2. Probe-owned nodes A and B, with node C created lazily in E2E-024 with pre-seeded released files.
  3. Frontend bound to A.
  4. Chromium.
- Environment: every `ENABLE_*` variable is scrubbed; `en` is preset (zh-CN in its own context); UTC.
- Evidence: per-case `result.json`, screenshots, and backend and frontend logs in `/tmp/ptasks-logs/probe-*`.
- Cleanup: all owned processes and the temp root.

## Temporary Executable Validation Plan

None beyond the durable probe (exploration happens only through the probe's `--only` runs).

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| AC-009 live team run with delegated tasks | Requires a live LLM runtime/provider credentials. The proof comes from unchanged delegated-task files, existing suites (web 112, server 200 pass), and the architecture and schema separation tests. | Low | None |
| Delete-count accuracy when Done Tasks exist | Unreachable through supported paths in this ticket, because no status mutation exists. Review note 1 says the count uses `openTaskCount`. E2E-026 records the value as an observation, not an assertion. | None now; the Task-admission ticket must switch to a total count | Carried to delivery/admission as a note |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None blocking | — | — | — |
| Non-blocking recommendation: after a Task is deleted from its dialog, focus falls to `BODY`, because the row that opened the dialog no longer exists. A keyboard user must Tab from the top of the page (35 Tabs to New task). AC-012 and QR-003 are still met: every action stays reachable by keyboard. | Recommendation (no approved AC violated) | `/tmp/ptasks-logs/probe-run1/result.json` › `E2E-021.observations.focusAfterTaskDelete` | `/code_reviewer` to note, and delivery/follow-up at the owner's discretion |
| Carried note: with a Done Task present, the Project delete message counts open Tasks only ("2 tasks" for 3). This is unreachable in this ticket (no status mutation) and is the known review note 1. | Note for the Task-admission ticket | `E2E-026.observations.deleteMessageObserved` | Delivery (carry forward) |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` (completed)
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`. `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` was updated (hermetic `ENABLE_*`; API-006 with a Task; new API-007…009). `autobyteus-web/tests/e2e/projects-feature-probe.mjs` was extended (E2E-014…026; Task helpers; node C; header).
- Post-repository confidence: 79%
- Broader validation decision: `Required` (Browser); executed; final confidence 95% (see the execution report)
- Reroute Required Before Validation Execution: `No`
