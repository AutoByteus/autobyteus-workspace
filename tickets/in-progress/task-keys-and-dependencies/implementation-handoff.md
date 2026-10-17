# Implementation Handoff — task-keys-and-dependencies (SR-001 + SR-002 + SR-003)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large / High); ARCH-REV-001 Pass (SR-001), ARCH-REV-003 Pass (combined SR-001 + SR-002 + SR-003). Route: Code Review per handoff rules.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies/requirements-doc.md` (SR-003; REQ-001–022, AC-001–027, DEC-001–013)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies/design-spec.md` (SR-001 body, "SR-002 Extension", "SR-003 Corrections")
- Supplemental task artifacts: Product `ui-ux-spec.md` + VIS-001–015 (`/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-keys-and-dependencies/`); design repo `personal@1ebf4c6` (ported from `git diff b31a5b1 1ff2edf`).
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies/architecture-review-revision-record.md`
- Triggering rework report: N/A (no downstream round yet).

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-001 SR-001 base; IR-002 SR-002 / SR-003; IR-003 CRR-001 Local Fix)
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies/implementation-revision-record.md`
- Current implementation revision ID: `IR-003` (delta: CR-001 `TaskDependencyWrites.idsOf` collapses resolved IDs; CR-002 wording in server `docs/modules/projects.md` and web `types/project.ts`)
- Related solution revision IDs: `SR-001`, `SR-002`, `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-001`, `ARCH-REV-003`
- Related code-review revision IDs: `CRR-001` (Fail, Local Fix CR-001/CR-002 → IR-003), `CRR-002` (Pass, targeted delta, 9.4/10; `code-review-report.md`); API-E2E / delivery: `N/A` (package forwarded to API/E2E by the code reviewer)
- Triggering finding IDs: `CR-001`, `CR-002` (REC-001–REC-004, REC-007, REC-008 applied as guidance)

Every Project Task has an immutable `taskKey` (`<prefix>-<number>`), allocated by `ProjectStore.createTask` from the Project's `taskKeys {prefix, lastNumber}` under the catalog lock. `ProjectService` reserves a prefix unique among current and retired (deleted Projects') prefixes. Released data is keyed by the startup migration `project-task-keys-v1`. Tasks store `dependsOnTaskIds`, validated (self / unknown / other-Project / loop) before any context step or write; updates that supply a list are serialized per Project; delete drops the Task from dependents. GraphQL, the feed and `taskWorkerTasks` carry the new fields. For agents the key is the Task ID: tool results show it, `task_id` / `depends_on` accept key or long ID (resolved once by `TaskReferences`, only the long ID travels inward), agent-facing texts name Tasks by key or "a deleted Task". The web ports the approved prototype components, derives badges and lists client-side, and uses key URLs (`taskPagePath`; `useProjectTaskPage` the only resolver; long-ID URLs replaced by the key URL).

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design spec "Task Size And Architectural Risk".
- Classification confirmed or changed: `Confirmed`
- Evidence: new persisted required fact + startup migration and a new retired-prefix file; extended GraphQL, strict feed and agent tool contract (Task-ID values, `depends_on`), collaboration port shape; concurrency (allocation under the catalog lock, per-Project dependency lock). Three subsystems (server Projects + migrations, agent tools / collaboration, web).
- Selected route: `Code Review` (from `get_handoff_rules`).
- Lightweight self-review for the direct route: `Not Applicable`.
- New design impact or escalation trigger: `None`. Implementation-level notes for the reviewer: (1) two service-owned files were split out of `project-task-service.ts` to keep it under the 500-line guardrail (below); (2) allocation is an exact current-shape save of `project.json`, so obsolete link extras (`workspaceId`, `addedAt`) of a released file drop at the first Task create after upgrade, as on any Project save (tolerant-reader policy; the migration itself keeps them); (3) after resolution, a Task deleted in a race is refused with "The Task was deleted." so no long ID reaches agent text (REQ-018).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Key at creation (UI or tool), per-Project numbers, never reused, immutable | `ProjectTaskService.create` → `ProjectStore.createTask` → `allocateTaskKey` (catalog lock; `lastNumber+1`; `updatedAt` kept) → first `task.json` write; `updateTask` always keeps `taskKey` | Done. Allocation after the context step succeeds (a failed prepare spends no number). |
| BEH-002 | Existing Tasks keyed on upgrade; no lockout | `migrations/project-task-keys-v1/` (frozen `released-project-files-v2.ts`, `task-key-prefix-v1.ts`), prerequisite per-folder v1 | Done. Additive writes, Tasks first, Project marker last; retry recognizes planned keys; a conflicting key fails only that Project. |
| BEH-003 | Prefix fixed at first keying, unique among current and deleted Projects, kept on rename | `ProjectService.createProjectRecord` in `store.createProject(check(existing, retired))`; `ProjectStore.updateProject` forces stored `taskKeys`; `deleteProject` appends the prefix to `retired-task-key-prefixes.json` under the catalog lock before removing `project.json` | Done (SR-002 DEC-001 revision). |
| BEH-004 | Store / validate `dependsOnTaskIds`; no lock on create; lock on update with a list | `TaskDependencyWrites` (`forNewTask`, `replace`, `idsOf`, `removeDeleted`) over `domain/task-dependencies.ts`; `ProjectStore.withTaskDependencies` | Done. Validation precedes context prepare and writes. |
| BEH-005 / 006 | Card key line + badge; key chip + Dependencies card | `ProjectTaskRow`, `TaskDependencyBadge`, `TaskKey`, `TaskKeyChip`, `TaskDependenciesSection`, `ProjectTaskDetail`, `ProjectsPanelTaskDetail`, `utils/projects/taskDependencies.ts` | Done. Temp tasks keyless (`'taskKey' in task`). |
| BEH-007 | Tree summary leads with key; Temp unchanged | `currentTasksOfTaskWorkers` (`taskKey`, null for Temp), GraphQL `TaskWorkerTaskView.taskKey`, `taskWorkerTaskStore`, `TaskWorkerTaskSummary` | Done. |
| BEH-008 | Delete drops the Task from dependents; their `updatedAt` kept; republished | `ProjectTaskService.deleteTask` → `TaskDependencyWrites.removeDeleted` | Done; failure logged, never fails the delete. |
| BEH-009 | Feed carries `taskKey`, `dependsOnTaskIds` | `project-change-messages.ts` strict schema + `projectTaskWire` | Done. |
| BEH-010 | The key is the agent-facing Task ID; inputs accept key or long ID; `depends_on`; texts by key | `TaskReferences.projectTask` (resolveProjectTaskReference: long ID exact, else key lower-cased via `ProjectStore.findTaskByKey`) serves `resolveAssignment` and `depends_on`; `updateTaskById` = resolveTaskReference (Temp-task ID first); `resolveAssignment` → `{taskId, taskReference, description, referenceFiles}`; `RootTaskExecutionLifecycle` resolves first (REC-005), stored ID inward, key in `buildExistingCopyTaskMessage` and the undelivered text; `task-execution-resources.ts` builders take references ("a deleted Task" for null); manifest maps `taskId` → key, `dependsOn` → keys; contract `depends_on`, descriptions; `DELEGATE_TASK_ID_DESCRIPTION` | Done. Saved-context data (`storedFilename`, `locator`, `localPath`, delegated reference-file paths) unchanged (DEC-011). `delegate_task` with a Temp-task ID or unknown reference → `TASK_NOT_FOUND` (DEC-012). Unresolvable `depends_on` → `TASK_DEPENDENCY_INVALID`, nothing written (REC-008). References naming one Task more than once (repeated key, other letter case, key + long ID) collapse to one stored ID on create and update (CR-001). |
| BEH-011 | Key URLs; long-ID URLs still open and switch to the key URL | `utils/projects/taskPagePath.ts`; `useProjectTaskPage(projectId, taskReference, pageSuffix)` (the only resolver; `router.replace` keeping the query); pages pass `taskReference`; `ProjectTaskDetail` context client from the resolved `taskId` (created once), delete with it; `ProjectTaskEditor`, `ProjectTaskDraftEditor`, `ProjectTaskRow`, `ProjectsPanelTaskDetail`, `TaskDependenciesSection` link via `taskPagePath` | Done. Temp-task URLs unchanged. |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`.

## Key Files Or Areas

Server (`autobyteus-server-ts/`):
- New: `src/projects/domain/{task-keys,task-dependencies}.ts`; `src/projects/services/{task-dependency-writes,project-task-views,task-references}.ts`; `src/app-data-migrations/migrations/project-task-keys-v1/{project-task-keys-v1-app-data-migration,released-project-files-v2,task-key-prefix-v1}.ts`.
- Modified: `src/projects/domain/{models,project-errors,task-execution-resources}.ts`; `src/projects/stores/{project-store,projects-layout}.ts`; `src/projects/services/{project-service,project-task-service}.ts`; `src/projects/changes/project-change-messages.ts`; `src/api/graphql/types/project-tasks.ts`; `src/app-data-migrations/app-data-migration-registry.ts`; `src/agent-collaboration/execution/task/{task-execution-resource-port,task-execution-input,root-task-execution-lifecycle}.ts`; `src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts`; `src/agent-tools/project-tasks/{project-task-tool-contract,project-task-tool-manifest}.ts`; docs `docs/modules/{projects,agent_team_execution}.md`, `docs/design/collaboration_model.md`.
- Tests new: `tests/unit/projects/{project-store-task-keys,project-task-keys-and-dependencies,task-key-and-dependency-rules}.test.ts`, `tests/unit/app-data-migrations/project-task-keys-v1-app-data-migration.test.ts`, `tests/unit/agent-tools/project-tasks/project-task-keys-tools.test.ts`. Updated: fixture port `tests/fixtures/task-execution-resource-fixtures.ts`; unit tests in `projects`, `agent-tools`, `agent-collaboration` (keys in texts and results, REC-005 order, catalogue M-43), `api/graphql`, `app-data-migrations`; e2e `projects-graphql` (API-010 new), `projects-startup-migration` (key-migration startup case new), `project-task-boundaries`, and the gated scripted-AGY suites `project-change-feed`, `project-task-context-files-delegation`, `task-existing-copy-assignment`, `task-reactivation-root-visibility`.

Web (`autobyteus-web/`):
- New: `components/projects/{TaskKey,TaskKeyChip,TaskDependencyBadge,TaskDependenciesSection,TaskDependencyPicker}.vue`, `utils/projects/{taskDependencies,taskPagePath}.ts`.
- Modified: `types/project.ts`, `graphql/queries/projectTaskQueries.ts`, `generated/graphql.ts` (ticket fields only), `stores/{projectTaskStore,taskWorkerTaskStore}.ts`, `composables/projects/{useProjectTaskDraft,useProjectTaskPage}.ts`, `components/projects/{ProjectTaskRow,ProjectTaskDetail,ProjectTaskEditor,ProjectTaskDraftEditor}.vue`, `components/projects/panel/{ProjectsPanel,ProjectsPanelTaskDetail}.vue`, `components/workspace/history/TaskWorkerTaskSummary.vue`, `pages/projects/[id]/tasks/[taskId]/{index,edit}.vue`, `localization/messages/{en,zh-CN}/projects.ts`, `docs/projects.md`.
- Tests new: `components/projects/__tests__/{TaskKeysAndDependencies,ProjectTaskDetail.taskReference}.spec.ts`, `composables/projects/__tests__/useProjectTaskPage.spec.ts`, `utils/projects/__tests__/taskDependencies.spec.ts`. Updated: `ProjectTaskDraftEditor.spec.ts`, `ProjectTaskBoard.spec.ts` (row link by key), `useProjectTaskDraft.spec.ts`, `taskWorkerTaskStore.spec.ts`, `TaskWorkerTaskSummary{Row,Hosts}.spec.ts`.

## Important Assumptions

- Prototype design-only code dropped; the unused prototype string `projects.deps.optionLabel` not ported.
- Edit task starts "Depends on" from existing dependencies only; Save sends the whole list.
- Prefix rule lower-cases before the NFD Latin-mark strip ("İstanbul" → `istanbul`); the frozen migration copy matches the runtime rule (tested).
- `resolveTaskReference` is the inline Temp-first branch of `updateTaskById` (its only caller), followed by `TaskReferences.projectTask`.
- A long-ID URL with a `notice` query: the notice composable may consume the query before the replace; such URLs are not produced by the app (in-app navigation uses key URLs).

## Known Risks

- Server and web must ship together (required fields; strict feed; key URLs). The desktop app bundles both.
- Migration I/O failure hides that Project until a restart (outside operating assumptions; MP-001).
- Tool description wording changes may shift agent behavior; changes were kept minimal and in the existing voice.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature. Root cause: No Design Issue Found. Refactor decision: No Refactor Needed.
- Implementation matched the reviewed assessment: `Yes`, with file-level splits inside the Task service's ownership, forced by the 500-line guardrail (`project-task-service.ts` had 498 effective lines): `task-dependency-writes.ts` (dependency orchestration), `project-task-views.ts` (the existing `toView` / `toTaskWithoutProjectView` / `taskRoot`, moved verbatim), `task-references.ts` (reference resolution; replaced the private `uniqueTask`). `ProjectTaskService` is their only user and remains the Task boundary; it ends at 499.
- Routed as `Design Impact`: `N/A`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. Long-ID inputs and URLs are approved behavior through one resolver to the stored identity (design "Backward-compatibility note").
- Legacy old-behavior retained in scope: `No`.
- Dead code in touched files removed: `Yes` (private `uniqueTask` replaced by `TaskReferences`; unused imports removed).
- Dead code found elsewhere, listed as follow-up: None.
- Shared structures remain tight: `Yes` (`ProjectView` omits `taskKeys` at type and runtime; tool acks carry one Task ID).
- Changed source files within size guardrails: `Yes` (largest: `project-task-service.ts` 499; largest change 173 lines).
- Notes: stale server-doc statement that `projects-per-folder-v1` imports the current `readTaskFile` corrected.

## Persisted Data Transition Check

- Approved decision: `Migration Required` (`taskKey`, `taskKeys`); `Directly Usable — No Migration` (`dependsOnTaskIds`; `retired-task-key-prefixes.json` is a new file, missing = none).
- Implementation follows it without version-specific runtime fallback: `Yes`.
- Migration: `20261017_project_task_keys_v1`, STARTUP_ONLY, required, prerequisite per-folder v1; frozen readers for classification, current readers only to validate output; tests on synthesized released-shape data and a real-startup e2e (no lockout, restart retry, unchanged third start).
- REC-003 / guideline item 8: `dependsOnTaskIds`, agent run resources and every stored reference use `taskId`, which the migration never changes; nothing stored references keys (also in `docs/modules/projects.md`).
- Deviation: `None`.

## Environment Or Dependency Notes

- All changes are uncommitted in the worktree (branch `codex/task-keys-and-dependencies`); no commit was made without the user asking.

- `generated/graphql.ts` was already behind the server schema at the base (delegated-launch types). Only this ticket's fields were applied by hand, matching the regenerated output. Follow-up: regenerate once to catch up the unrelated drift.
- Pre-existing failures outside scope (TESTING Rule 9; both also fail on base `c600028072`, checked in temporary base worktrees):
  - server `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` 3/4 (ENOENT on the converted `team_run_execution_tree.json`; ledger row count). With this change the count is +1 for the new migration's ledger row.
  - web `components/layout/__tests__/RightSideTabs.workspaceTarget.spec.ts` "retains A while canonical B metadata fails; prior consumers mounted: true" (file explorer content).

## Local Implementation Checks Run

- `pnpm -C autobyteus-server-ts typecheck` — pass (also after IR-003).
- IR-003 delta: `tests/unit/agent-tools` + `tests/unit/projects` — 60 files / 535 tests pass, including the new CR-001 case.
- `pnpm -C autobyteus-server-ts test:unit` — pass: 710 files / 5752 tests (4 files / 7 tests skipped by their gates).
- `tests/architecture` — pass: 4 files.
- Server e2e run locally because the change alters their asserted contract (clean env, current dist): `tests/e2e/projects/projects-graphql.e2e.test.ts` 11/11, `projects-startup-migration.e2e.test.ts` 6/6, `project-task-boundaries.e2e.test.ts` 11/11; gated scripted-AGY (`RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND=tests/fixtures/agy-failure-cli.mjs`, no provider calls): `project-change-feed`, `project-task-context-files-delegation`, `task-reactivation-root-visibility`, `task-existing-copy-assignment` — all pass (2 cases skipped: `RUN_CLAUDE_E2E` real model, not run). The last edit to tool description wording came after the dist build these e2e runs used; the affected description tests and schema snapshot were rerun and pass. These are local checks, not API/E2E sign-off.
- `pnpm -C autobyteus-web test:nuxt --run` — 4446 passed, 5 skipped, 1 failed: the pre-existing `RightSideTabs.workspaceTarget` case listed above (also fails on the base).
- `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` — pass.
- `vue-tsc` over the web project: no errors in changed source files (the repo has ~420 baseline errors; not a gate). Fixtures in some unchanged spec files type-lack the new required fields (vitest does not typecheck; all pass). An edit adding them was rejected by the user and reverted, so they stay as they are.

## Frontend Rendered-Result Check

- Surfaces: board cards (UXJ-001), Task page (UXJ-002), Edit task picker (UXJ-003), long keys (UXJ-005), key URLs (BEH-011). Tree summary (UXJ-004) and the right-panel tab (UIS-002/004) by unit tests only.
- References: `ui-ux-spec.md`, VIS-001–015, prototype components; status pills, section cards, `CopyButton` pattern.
- Surface: this worktree's built server (`dist/app.js`, test-owned data root seeded through the real services, cleared env) + `nuxt dev` (`BACKEND_NODE_BASE_URL`) in a browser tab (400×738 one-column board as VIS-015, and ~855 px for the Task page).
- Inspected: key lines; blocked (+1), blocked (one), cancelled, follow-up (no badge); badge tooltip; chip after status, Depends on in key order with Done ✓, informs note, Required by; copy → "Copied" (`role=status`) gone after 1.5 s; picker label/help/placeholder, newest-first options, greyed loop option, Enter adds, list closes, focus stays; Save stored the dependency (`task.json`); long keys whole on cards, badge middle-shortened with "-11" kept; live clear of a badge from another client's GraphQL edit; long-ID Task URL and long-ID Edit URL replaced by the key URLs; `AutoByteus-2` URL replaced by `autobyteus-2`; board row links, Edit link, dependency rows and Cancel link use key URLs.
- Issues found and corrected: none in rendering.
- Remaining unverified: 1440-wide three-lane layout and right-panel tab in the browser; tree summary with real delegated copies; zh-CN rendering (strings unit-tested). The isolated desktop instance (AC-021) is for API/E2E.

## Downstream Coverage Hints / Suggested Scenarios

- Isolated desktop instance with a released-shape (per-folder, no keys) test data root: first start keys Projects in creation order; second start changes nothing; VIS-001–015 journeys at 1440×900 and 760×900; right-panel tab; tree summary with a delegated copy.
- Agents: `list_project_tasks` shows keys and `dependsOn`; `create_task depends_on=[key]` → board "Blocked by <key>"; `update_task` / `delegate_task` by key (any case) and by long ID; refusals and the assignment message name keys; a blocked Task can be started and delegated.
- Delete a Project and re-create the same name → `autobyteus-2-…`; the old key resolves to nothing.
- Old long-ID Task links (bookmarks) open and switch to key URLs.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-021 (isolated Electron instance with a test data package) and the desktop journeys above.
- Gated live suites needing real providers (`RUN_CLAUDE_E2E`) were not run.
- Follow-ups outside scope: FU-002 (board search by key), FU-003 (Project Task Manager uses keys / dependencies), FU-004 (the "still works on a deleted Task" refusal advises an impossible step); `generated/graphql.ts` regeneration; the two pre-existing failures above.
