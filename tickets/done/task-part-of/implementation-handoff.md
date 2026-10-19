# Implementation Handoff — task-part-of

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-part-of/tickets/in-progress/task-part-of/`
Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-part-of`, branch `codex/task-part-of`, base `origin/personal@cba6b85122`.
Code commits: `6cc6c22d2e` (server), `179ddb9f77` (web). Evidence and these documents: the ticket-artifact commit that follows them (see the handoff message).

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Large / High → independent architecture review selected; `Pass` (ARCH-REV-001, no findings, seven non-blocking implementation notes).
- Requirements doc: `tickets/in-progress/task-part-of/requirements-doc.md` (Approved, SR-004)
- Investigation notes: `tickets/in-progress/task-part-of/investigation-notes.md` (AF-001–AF-009)
- Solution revision record: `tickets/in-progress/task-part-of/solution-revision-record.md` (SR-001–SR-005)
- Design spec (required on every route): `tickets/in-progress/task-part-of/design-spec.md` (SR-005, Ready)
- Supplemental task artifacts: Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-part-of/ui-ux-spec.md` (Approved, VIS-001–VIS-017); reference implementation `autobyteus-web-design` `git diff e5ad9d8 c406879`.
- Design review report: `tickets/in-progress/task-part-of/design-review-report.md`
- Architecture review revision record: `tickets/in-progress/task-part-of/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence: N/A (initial implementation)

## Current Implementation Summary

A Project Task stores an optional `partOfTaskId` (another current Task of the same Project, one level only). The server validates it under the per-Project relations lock for create and update (GraphQL and tools), clears it on parts when their parent is deleted, publishes it on `/ws/projects`, and shows `partOf` / `parts` / `closedParts` by key in tool results. When `update()` changes a parent's status to DONE or CANCELLED, the service closes each open part through its own `update()`. The web ports the approved design: Parts / Part of card, card pill and "Part of" line, the Part of field, "New part", the close hint, the delete note and the 17 strings.

- Implementation cycle: `Initial`
- Implementation revision record: `tickets/in-progress/task-part-of/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-004` (requirements), `SR-005` (design)
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: as designed: about 50 files across server Projects domain/store/services, GraphQL / feed / tool contracts and web Projects UI; changed agent-facing tool contract (`part_of`, `partOf`, `parts`, `closedParts`, descriptions); extended GraphQL and WebSocket contracts; a one-level invariant under concurrency; and a new lifecycle effect (one `update_task` closes several Tasks and stops their task agents). No migration was needed.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (Large / High)
- New design impact or escalation trigger: `None`. None of the escalation triggers fired: no migration or old-shape reading, the only status path is `update()`, no cross-Task transaction, nothing blocks work, no mixed-version handling.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Store, set, replace, clear the parent; refuse invalid ones with no change (REQ-001–004, 011, 013, 018) | GraphQL `CreateProjectTaskInput` / `UpdateProjectTaskInput.partOfTaskId` → `ProjectTaskService.createTask` / `updateTask`; tools `part_of` → `createTaskWithLocalContextFiles` / `updateTaskById` (`TaskRelationWrites.parentIdOf` resolves key / long ID) → `TaskRelationWrites.changesOf` (decides by value: undefined keeps, null / "" clears) → `TaskRelationWrites.write` (`withTaskRelations` lock → `listTasks` → `assertDependenciesValid` / `assertParentValid`) → `update()` / `ProjectStore.createTask` | Implemented. `TASK_PARENT_INVALID` for self, unknown, other-Project, Temp task, parent-is-part, has-parts. A new Task without relations takes no lock. A supplied `part_of` / `partOfTaskId` (also the clear value) counts as a patch. `create_task part_of=""` is `PROJECT_TOOL_ARGUMENT_INVALID`. Concurrent "B part of A" / "A part of B": exactly one succeeds. |
| BEH-002 | Parent shows parts and progress; part shows parent (card, Task page, tab), per the spec (REQ-007–012, 019) | `projectTaskStore` (list incl. `partOfTaskId`) → `utils/projects/taskParts.ts` → `TaskPartsSection` (page / compact), `TaskPartsProgress`, `TaskPartOfMarker` in `ProjectTaskRow`, `ProjectTaskDetail` (incl. delete note), `ProjectsPanelTaskDetail` | Ported from the reference. Rendered and checked at 1440 and 760 px (IMP-07). |
| BEH-003 | Tools read parent and parts by key (REQ-013, 014, 017) | `project-task-tool-manifest.ts` `relationKeys` (one ID → Task map; parts in numeric key order); `search_project_tasks` lists the Project once more; acks load the list when `dependsOnTaskIds` or `partOfTaskId` is set | Implemented; no long ID in `partOf` / `parts`. |
| BEH-004 | Deleting a parent leaves its parts without a parent, `updatedAt` kept, republished (REQ-006, 019) | `ProjectTaskService.deleteTask` → `TaskRelationWrites.removeDeleted` (one pass; per-file updater clears `partOfTaskId` only if it still names the deleted Task) | Implemented; log code `TASK_RELATION_CLEANUP_FAILED`. Checked live in the UI (IMP-07). |
| BEH-005 | Parent DONE / CANCELLED closes its open parts the same way; result lists them; reopen / same status / a part's own close never cascade (REQ-005, 016, 017) | `ProjectTaskService.update()` notes `closesParts` (`current.status !== status` for DONE / CANCELLED) inside the store updater → after commit and publish, `TaskPartClosure.closeOpenParts` (listTasks → TODO / IN_PROGRESS parts in key order → service `update(part, {status}, no context, cascade=false)` → `closeAndWrite` closes runs, asks release) → `closedParts` → ack `closedPartReferences` → tool `closedParts` | Implemented. A failing part is logged `TASK_PART_CLOSE_FAILED` (project, parent, part IDs) and skipped. The per-part update never goes through `TaskRelationWrites.write` (non-reentrant lock). |
| BEH-006 | Existing Tasks read as having no parent; no conversion (REQ-015) | `readTaskFile`: `partOfTaskId` non-empty string, else `null`; `taskFileContent` always writes it | `Directly Usable — No Migration` followed; files change only at their next ordinary save. |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

### Architecture-review implementation notes (ARCH-REV-001)

| Note | How it is handled |
| --- | --- |
| 1 GraphQL presence by value | `TaskRelationWrites.changesOf`: `partOfTaskId === undefined` keeps, null / "" clears, a string replaces; no `Object.hasOwn`. Pinned by `project-tasks-schema.test.ts` (omitted reaches the service as `undefined`, `null` as `null`). The planned `projects-graphql.e2e` case is left to API/E2E. |
| 2 Patch-required checks | `parseUpdateTaskInput`, `updateTaskById`, `updateTask` treat a supplied parent, also the clear value, as a change; `part_of` added to both `rejectUnsupported` lists; `create_task part_of=""` → argument error. |
| 3 Numeric key order | `compareTaskKeys` in `domain/task-keys.ts`, used for tool `parts` and for the cascade order. |
| 4 Ack list loading | `projectTaskList` loads when `dependsOnTaskIds?.length || partOfTaskId`. |
| 5 Cascade inside the lock | The cascade can run inside `withTaskRelations` (same call also changes relations); parts close through `update()` directly. Covered by a test. |
| 6 Conditional clear | `partOfTaskId: task.partOfTaskId === taskId ? null : task.partOfTaskId` inside the per-file updater. Covered by a test that re-parents between list and write. |
| 7 Log-code rename | `project-task-keys-and-dependencies.test.ts` updated to `TASK_RELATION_CLEANUP_FAILED`. |

## Key Files Or Areas

Server (`autobyteus-server-ts/`):
- `src/projects/domain/task-parts.ts` (new): `normalizePartOf`, `assertParentValid`, `notAProjectParent`.
- `src/projects/domain/models.ts`, `project-errors.ts` (`TASK_PARENT_INVALID`), `task-keys.ts` (`compareTaskKeys`).
- `src/projects/stores/project-store.ts`: reader / writer; `withTaskRelations` (`.task-relations`).
- `src/projects/services/task-relation-writes.ts` (renamed from `task-dependency-writes.ts`): `dependencyIdsOf`, `parentIdOf`, `changesOf`, `write`, `removeDeleted`.
- `src/projects/services/task-part-closure.ts` (new): the cascade loop (`closeOpenParts`).
- `src/projects/services/project-task-service.ts`: inputs, `update()` patch and cascade trigger, acks.
- `src/projects/services/task-assignment-eligibility.ts` (new, moved code): see Legacy / size notes.
- `src/api/graphql/types/project-tasks.ts`, `src/projects/changes/project-change-messages.ts`, `src/agent-tools/project-tasks/project-task-tool-contract.ts`, `project-task-tool-manifest.ts`.
- Docs: `docs/modules/projects.md`, `docs/design/collaboration_model.md` (CM-6).

Web (`autobyteus-web/`):
- New: `components/projects/TaskPartsSection.vue`, `TaskPartsProgress.vue`, `TaskPartOfMarker.vue`, `TaskPartOfPicker.vue`, `utils/projects/taskParts.ts`.
- Changed: `ProjectTaskRow.vue`, `ProjectTaskDetail.vue`, `ProjectTaskDraftEditor.vue`, `panel/ProjectsPanelTaskDetail.vue`, `composables/projects/useProjectTaskDraft.ts`, `stores/projectTaskStore.ts`, `types/project.ts`, `graphql/queries/projectTaskQueries.ts`, `generated/graphql.ts`, `localization/messages/{en,zh-CN}/projects.ts`, `docs/projects.md`.

Tests: server `tests/unit/projects/task-part-rules.test.ts`, `project-task-parts.test.ts`, `tests/unit/agent-tools/project-tasks/project-task-parts-tools.test.ts` (new) plus updated shape assertions; web `components/projects/__tests__/TaskParts.spec.ts`, `ProjectTaskDetail.parts.spec.ts`, `utils/projects/__tests__/taskParts.spec.ts` (new) plus updated draft / editor specs.

## Important Assumptions

- Implementation-level placements that differ from the design's file table but keep its ownership:
  - The cascade loop is in `TaskPartClosure` (`task-part-closure.ts`), owned and constructed by `ProjectTaskService` with its own `update()` as the close callback, rather than a private method. Reason: `project-task-service.ts` was at the 500-effective-line limit before the change (see size notes).
  - Relation input normalization (`changesOf`) sits in `TaskRelationWrites`, next to the rules it feeds.
- Web, beyond the reference: (1) New task uses `?partOf=` only while it names a current Task of the Project. The list may not be loaded when the draft starts, so the check runs once the list is known (design guidance). (2) `TaskPartOfPicker` starts its active option on the first choosable option. The reference started at index 0, so Enter right after opening did nothing when the newest Task was a part. Found in the rendered check (QR-004 keyboard rule).
- `generated/graphql.ts`: I ran codegen against the schema printed from this worktree's build. It produced the `partOfTaskId` lines and also unrelated drift (the checked-in file is stale: `Delegated*`, `MeaningSearch*` types, …). Only the part-of hunks are committed. They match codegen's output line for line.

## Known Risks

- Existing server E2E files pin exact tool-result shapes and GraphQL input field lists. They need the additive `partOf` field (and `partOfTaskId` in the update-input field list) and will fail until updated. E2E is API/E2E-owned, so I did not edit them:
  - `tests/e2e/projects/project-task-boundaries.e2e.test.ts` lines ~173, 180, 498, 531, 539, 545, 548, 556, 559, 690–692, 735, 760, 764, 783, 784, 788, 810 (`toEqual({... dependsOn: [...] })` acks without `partOf`);
  - `tests/e2e/projects/project-task-context-files-delegation.e2e.test.ts` lines ~160, 165, 212;
  - `tests/e2e/projects/projects-graphql.e2e.test.ts` line ~540 (`UpdateProjectTaskInput` field list).
- One `update_task` can stop several task agents (user decision); `closedParts` names them. A part that fails to close is only logged, not named in the result (accepted residual risk in the design review).
- Tool-description wording changes agent behavior; kept minimal in the existing voice (FU-001 covers the Project Task Manager's skill).
- The extraction to `TaskAssignmentEligibility` moves runtime-facing eligibility code. It is a verbatim move (same methods, texts and call order; `this.store` became a getter callback), covered by the existing assignment / reopen unit suites, which pass.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature
- Reviewed root-cause classification: No Design Issue Found
- Reviewed refactor decision: `Refactor Needed Now` (small: rename and generalize `TaskDependencyWrites` → `TaskRelationWrites`, fold `forNewTask` / `replace` into `write`)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: rename done with history (`git mv`; Git shows the rename). `forNewTask`, `replace` and `idsOf` were folded into `write` and renamed to `dependencyIdsOf`. One extra mechanical split (`TaskAssignmentEligibility`) was needed for the size guardrail; it changes no ownership.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (no alias for the old writer or lock name, no mixed-version code, no migration)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. Removed or replaced: `TaskDependencyWrites.forNewTask`, `.replace`, `.idsOf`; manifest `dependencyKeys`; the service's `normalizeDependsOn` import; the service's private `assertReopenTaskNotTerminal` / `readTaskAt` / `assertAssignableTask` / `assertCopyAssignable` (moved, not duplicated). An import scan of the touched files finds no unused imports, and server typecheck passes.
- Dead code found elsewhere, listed as follow-up:
  - `ProjectTaskService.drainRuntimeReleases()` has no `src` caller (14 test files use it to settle async releases; its doc says "tests and orderly shutdown", but no shutdown caller exists). It is a test-only seam in a touched file. Removing it means reworking the synchronization of 14 test files, which is out of proportion for this ticket. Follow-up for the Task's manager.
- Shared structures remain tight: `Yes`. `TaskAcknowledgementView` gains only the Project-Task fields `partOfTaskId` and `closedPartReferences` (present only when non-empty).
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. `project-task-service.ts` was exactly 500 effective non-empty lines at base, and the feature would have taken it to 541. I moved the new cascade loop into `task-part-closure.ts`, input normalization into `TaskRelationWrites`, and the untouched private eligibility checks into `task-assignment-eligibility.ts`. It is now 474. Every other changed source file is under 500, and no source delta exceeds 220 lines (largest: `TaskPartOfPicker.vue` +146, a new file).
- Notes: other follow-ups found (not dead code, out of scope):
  - `TaskDependencyPicker.vue` has the same latent initial-active-option issue fixed here for the Part of field (Enter right after opening does nothing when the newest option is a loop Task). Preserved behavior in this ticket (REQ-004), so not changed.
  - `autobyteus-web/generated/graphql.ts` is stale against the current server schema (unrelated types missing); a full codegen refresh belongs to its own change.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: design-spec.md "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence: `project-store-task-keys.test.ts` reads a `task.json` without the field as `partOfTaskId: null`, leaves the bytes unchanged until a save, and then writes `"partOfTaskId": null`. Non-string values read as `null`. The written key set includes `partOfTaskId`. `projects-per-folder-v1` migration test: released-shape files read with `partOfTaskId: null`. The isolated UI stack's data was created by the worktree build from scratch.
- Migration implementation: N/A
- Deviation: `None`

## Environment Or Dependency Notes

- macOS (darwin), Node via corepack pnpm 10.28.2; `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-server-ts prebuild` run in the worktree; `pnpm -C autobyteus-server-ts build` produced `dist/` (used by the UI stack and the schema print).
- The application SDK `dist/` folders are untracked build outputs and were not staged.
- The rendered check used a test-owned data root under `/tmp` (removed afterwards), its own SQLite database, a backend from `dist/app.js` and a Nuxt dev server on free ports. Both processes were stopped; nothing touched `~/.autobyteus`.

## Checks Run

Evidence folder: `tickets/in-progress/task-part-of/evidence/`. Each file name starts with its check ID. Logs of large suites are committed as a short excerpt plus the gzipped full log.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `179ddb9f77` | macOS, Node, worktree install | all server `src` | — | Pass | `IMP-01-server-typecheck.log` | `tsc -p tsconfig.build.json --noEmit`, `exit=0` |
| IMP-02 | `pnpm -C autobyteus-server-ts test:unit` | `179ddb9f77` | same | all server unit suites; new `task-part-rules`, `project-task-parts`, `project-task-parts-tools`, updated GraphQL schema / store / tool suites | BEH-001–006; AC-001–008, 014–016, 018 | Pass | `IMP-02-server-test-unit.log` (excerpt), `IMP-02-server-test-unit.full.log.gz` | `Test Files  736 passed \| 4 skipped (740)`, `Tests  6007 passed \| 7 skipped (6014)`, `exit=0` |
| IMP-03 | `pnpm -C autobyteus-server-ts test:integration:prepare` then `test:integration` | `179ddb9f77` | same | server integration suites (green-suite guard) | — | Pass | `IMP-03-server-integration-prepare.log`, `IMP-03-server-test-integration.log` (excerpt), `IMP-03-server-test-integration.full.log.gz` | `Test Files  77 passed \| 19 skipped (96)`, `Tests  415 passed \| 70 skipped (485)`, `exit=0` |
| IMP-04 | `pnpm -C autobyteus-web test:nuxt --run` | `179ddb9f77` | same, happy-dom | all web unit / component suites; new `TaskParts.spec.ts`, `ProjectTaskDetail.parts.spec.ts`, `taskParts.spec.ts`, updated draft / editor specs | BEH-002, BEH-004 web; AC-001, 002, 009–013, 019, 020 | Pass | `IMP-04-web-test-nuxt.log` (excerpt), `IMP-04-web-test-nuxt.full.log.gz` | `Test Files  639 passed \| 2 skipped (641)`, `Tests  4538 passed \| 5 skipped (4543)`, `exit=0` |
| IMP-05 | `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `179ddb9f77` | same | web boundary and localization rules over the new components and strings | AC-013 | Pass | `IMP-05-web-guard-web-boundary.log`, `IMP-05-web-guard-localization-boundary.log`, `IMP-05-web-audit-localization-literals.log` | `[guard:web-boundary] Passed.`, `[guard:localization-boundary] Passed.`, `[audit:localization-literals] Passed with zero unresolved findings.` |
| IMP-06 | Print the schema from the built server (`buildGraphqlSchema` → `printSchema`), `BACKEND_GRAPHQL_BASE_URL=<schema file> pnpm -C autobyteus-web codegen`, compare the `partOfTaskId` lines with the committed file | source of `179ddb9f77` | same | `generated/graphql.ts` | REQ-007 | Pass | `IMP-06-codegen-partOf-lines.txt`, `IMP-06-print-schema.mjs` | `partOf lines identical to codegen` |
| IMP-07 | Rendered UI check: test-owned backend (`dist/app.js`, own data root and DB) + `pnpm dev` bound to it; Tasks seeded through the built `create_task` / `update_task` (`tests/fixtures/project-task-tool-writer.mjs`); headless Chrome via playwright-core at 1440×900 and 760 px | working tree whose source equals `179ddb9f77` (no source change after the run) | macOS, Chrome headless | board cards, Task page (parent / part), delete confirmation, New part, editor (search, chosen, has-parts), live delete cleanup | BEH-001, 002, 004; AC-001, 009–012, 019, 020, 007, 008 | Pass (run 2; run 1 found the picker defect, fixed) | `IMP-07-ui-run1/`, `IMP-07-ui-run2/` (`result.json` + PNGs), `IMP-07-ui-delete-live.txt`, `IMP-07-ui-delete-live-board-after-parent-delete-1440.png`, `IMP-07-ui-scripts/` | run 2 `editor-search-blocked` Pass; `{"note":"Its 2 parts stay as separate Tasks.","before":[true,true],"after":[false,false],"errors":[]}`. Run 2's three count mismatches (`2 of 5 done`, `Its 6 parts`) are the extra part run 1's "New part" save created, so the live counts are correct. |

- Not run, and why: server E2E (`tests/e2e/projects/*`, incl. the planned `projects-graphql.e2e` omitted-vs-null case and tool E2E for AC-014, AC-015, AC-018). These belong to API/E2E, and several existing E2E shape assertions need the additive field first (Known Risks). Browser probe, isolated desktop instance (AC-017) and cascade-with-a-real-running-task-agent are left to API/E2E as well.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: board (page) cards; Task page of a parent and of a part; delete confirmation; New task via "New part"; Edit task Part of field (search, greyed parts, chosen row, has-parts state); narrow board.
- Approved references: ui-ux-spec.md (UXJ-001–005, VIS-001, 002a–f, 003, 007a, 011a–e, 012, 013, 015); compared side by side with VIS-003.
- Existing design system reviewed: step-1 `TaskDependenciesSection`, `TaskDependencyBadge`, `TaskDependencyPicker`, `TaskKey`, status pill classes. The ported components reuse them unchanged.
- Rendered surface used: the TESTING.md browser-probe pattern (test-owned backend + Nuxt dev + headless Chrome), driven by an implementation-scoped script, not a committed probe.
- States inspected: parent "2 of 4 done · 1 cancelled" with rows in key order, ✓ on Done, close hint, New part; all-done green pill "2 of 2 done"; only-Cancelled parent with no pill; plain card with no relation line; part card with Blocked badge and "↳ Part of autobyteus-1" on one line, hover titles; part page "Part of" row opening the parent; New part prefilled and saved; editor search with greyed "Already part of a Task" options, Enter choosing, "Choose another Task" placeholder; has-parts note; 760 px board with the relation line inside its card; deleting a parent removes its parts' lines live.
- Visual or interaction issues found and corrected: the Part of field's initial active option could be a greyed part, so Enter did nothing (fixed; regression test added).
- Limitations: the tab Task view (compact), zh-CN, long keys and the Cancelled lane were checked in component tests only, not rendered. A live cascade on a running task agent was not rendered, because the external tool writer does not drive the running server's change feed. The server unit test covers the publication.

## Downstream Coverage Hints / Suggested Scenarios

- GraphQL E2E: `updateProjectTask` without `partOfTaskId` keeps the parent; with `null` clears it; with an ID replaces it; refusals map to `TASK_PARENT_INVALID`.
- Tool E2E through the running server: `create_task part_of="AutoByteus-25"` (any case and long ID); `update_task part_of=""`; Temp task refusals; `list_project_tasks` / `search_project_tasks` `partOf` / `parts` in numeric order; `update_task status=CANCELLED` on a parent with a running task agent: parts closed, agent stopped, `closedParts` listed, boards update live (AC-018).
- `/ws/projects` `task_upserted` carries `partOfTaskId` for create, re-parent, cascade and delete cleanup.
- Isolated desktop instance with test data for AC-017 (board, Task page, tab, editor, zh-CN).

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. Run all of the above, and update the existing E2E shape assertions listed in Known Risks.
