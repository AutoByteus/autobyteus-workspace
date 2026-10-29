# Implementation Handoff — task-comments

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-comments/tickets/in-progress/task-comments/`
Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-comments`, branch `codex/task-comments`, base `origin/personal@786055f3d7`.
Code commits: `52035832a6` (server), `e014c349b8` (web). Evidence and these documents: the ticket-artifact commit that follows them (named in the handoff message).

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Medium / High → independent architecture review selected; `Pass` (ARCH-REV-002, no open findings, five non-blocking implementation notes).
- Requirements doc: `requirements-doc.md` (Approved, SR-013)
- Investigation notes: `investigation-notes.md` (AF-001–AF-009; the "Part 2 Investigation" section belongs to a separate Task and was not used)
- Solution revision record: `solution-revision-record.md`
- Design spec: `design-spec.md` (SR-013, Ready)
- Supplemental task artifacts: none (DEC-005); style reference: the task-part-of Parts card
- Design review report: `design-review-report.md`
- Architecture review revision record: `architecture-review-revision-record.md`
- Follow-ups: `follow-ups.md` (FU-001, FU-002 out of scope; nothing added by implementation)
- Triggering rework report: N/A (initial implementation)

## Current Implementation Summary

A Project Task stores `comments: [{id, createdAt, text}]` in its `task.json`. Comments are only added, through `ProjectTaskService`'s shared `update()` body, inside the Task's locked write. Agents add them with `update_task add_comment`, and the app uses the GraphQL mutation `addProjectTaskComment`. Agents read the texts: `list_project_tasks` `comments`, `search_project_tasks` `commentCount`, and a "Comments:" block in delegated work. The exact search tier, which the board shares, also matches comment text. The app shows a "Comments" card with an add box on the Task page and in the tab's Task view. `update_task` now names the parts a parent's close could not close (`partsNotClosed`, autobyteus-187).

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-013` (requirements basis SR-011 / SR-013)
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: about 45 files across server Projects, the GraphQL / feed / tool contracts, the collaboration work text, and web Projects. All changes sit inside existing owners, with no new owner or subsystem. The contract changes are material: the `update_task` parameter and result field, the list / search fields, a GraphQL field and mutation, the strict `/ws/projects` schema, and the text every task agent receives. One persisted field was added without migration.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (High)
- New design impact or escalation trigger: `None`. No migration and no old-shape reading. Comments stay in `task.json` under the existing lock, and meaning-search items are unchanged. Nothing notifies runs, and comments have no edit or delete.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (agent) | `update_task add_comment` appends one comment; description untouched; blank / Temp / unknown refused with nothing written (REQ-001, 002, 004, 005) | `project-task-tool-contract.ts` `taskComment` (string; `normalizeCommentText`) → manifest `addComment` → `ProjectTaskService.updateTaskById` (normalized before the Temp-task check and before `update()`) → `update()` patch `addComment` → `ProjectStore.updateTask` locked updater `appendComment(current, text, now)` (`domain/task-comments.ts`) → publisher | Implemented. The ack is unchanged (no comment field). A combined status + comment call is one write, and a refused one writes nothing, not even the status (tested). `add_comment` counts as a patch in the parser and in `updateTaskById`. |
| BEH-001 (app) | The user adds a comment (REQ-006) | `TaskCommentsSection` → `projectTaskStore.addComment` → GraphQL `addProjectTaskComment` → `ProjectTaskService.addComment` → same `update()` body | Implemented. The returned Task replaces the listed one, and the feed updates other views. |
| BEH-002 | Thread in the Task page and tab, oldest first, number, time, full text; live (REQ-007, 014) | GraphQL `ProjectTask.comments`; `projectTaskWire` + strict schema `comments`; web `TaskCommentsSection` on `ProjectTaskDetail` (after Description, before Parts) and `ProjectsPanelTaskDetail` (compact) | Implemented. Live update checked in two browser pages (IMP-07). |
| BEH-004 | List texts; search count; exact tier on comments, board included (REQ-008, DEC-025) | manifest `taskBusinessRead` `comments` (only when any); search result `commentCount` (only when > 0); `ProjectTaskSearchService.search` exact filter over description and comment texts; meaning items (`itemsOf`) unchanged | Implemented. Board search for a comment-only word showed only that Task (IMP-07). Adding a comment leaves the index state unchanged (unit test). |
| BEH-006 | `partsNotClosed` (REQ-011, autobyteus-187) | `TaskPartClosure.closeOpenParts` → `{closed, notClosed}`; `update()` returns `parts`; ack `partsNotClosedReferences` → tool `partsNotClosed` (only when any) | Implemented. |
| BEH-007 | Delegated work contains the comments after the description (REQ-012) | `ProjectTaskService.resolveAssignment` + port type `comments: string[]` → `RootTaskExecutionLifecycle` (new copy and existing copy) → `taskBodyLines` "Comments:" block of `- ` bullets, no block when none | Implemented for both paths. Described work and remote packets have no comments. |
| REQ-013 | Existing data: no comments, no conversion | `readTaskFile` keeps well-formed comments in ID order (absent / invalid → `[]`); `taskFileContent` always writes `comments` | `Directly Usable — No Migration` followed. |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

### Architecture-review implementation notes (ARCH-REV-002)

| Note | How it is handled |
| --- | --- |
| 1 Validate before `update()` | The parser normalizes `add_comment`. `updateTaskById` calls `normalizeCommentText` before the Temp-task branch, and the Temp refusal and unknown-Task resolution also come before `update()`. A combined DONE + blank comment never reaches `closeAndWrite`: the test asserts no store write and the agent run still open. |
| 2 Patch-required checks | Both checks count `add_comment` / `addComment`; error texts updated ("… depends_on, part_of and/or add_comment …"; "… dependencies, a parent and/or a comment …"). |
| 3 Size | `project-task-service.ts` 474 → 486 effective lines (+30 −18). The rules live in `domain/task-comments.ts`, and nothing needed moving. |
| 4 Views spread the Task | No mapping change in `ProjectTaskViews`. The strict feed schema and the wire, as well as the GraphQL mapping, gained `comments`. |
| 5 Exact-tier ordering | Unchanged. A comment bumps `updatedAt` (DEC-008). |

## Key Files Or Areas

Server (`autobyteus-server-ts/`):
- `src/projects/domain/task-comments.ts` (new): `normalizeCommentText`, `appendComment`.
- `src/projects/domain/models.ts` (`ProjectTaskComment`, `ProjectTask.comments`, `UpdateTaskByIdCommand.addComment`, `AddProjectTaskCommentCommand`, `TaskAcknowledgementView.partsNotClosedReferences`), `project-errors.ts` (`TASK_COMMENT_INVALID`).
- `src/projects/stores/project-store.ts` (reader / writer).
- `src/projects/services/project-task-service.ts` (patch, Temp refusal, `addComment`, ack, `resolveAssignment`), `task-part-closure.ts` (`{closed, notClosed}`).
- `src/projects/search/project-task-search-service.ts` (exact tier).
- `src/api/graphql/types/project-tasks.ts` (`ProjectTaskComment`, field, `AddProjectTaskCommentInput`, mutation), `src/projects/changes/project-change-messages.ts`.
- `src/agent-tools/project-tasks/project-task-tool-contract.ts`, `project-task-tool-manifest.ts`.
- `src/agent-collaboration/execution/task/task-execution-resource-port.ts`, `task-execution-input.ts`, `root-task-execution-lifecycle.ts`.
- Docs: `docs/modules/projects.md` (new "Task comments" section and the affected paragraphs), `docs/modules/agent_tools_mcp_server.md`.

Web (`autobyteus-web/`):
- `components/projects/TaskCommentsSection.vue` (new); `ProjectTaskDetail.vue`, `panel/ProjectsPanelTaskDetail.vue`.
- `stores/projectTaskStore.ts` (`addComment`), `types/project.ts`, `graphql/queries/projectTaskQueries.ts`, `graphql/mutations/projectTaskMutations.ts`, `generated/graphql.ts` (comment hunks only), `localization/messages/{en,zh-CN}/projects.ts`, `docs/projects.md`.

Tests:
- New server tests: `tests/unit/projects/task-comment-rules.test.ts`, `project-task-comments.test.ts`, `tests/unit/agent-tools/project-tasks/project-task-comments-tools.test.ts`.
- Added server cases:
  - store reader / key set: `project-store-task-keys.test.ts`;
  - search exact tier: `project-task-search.test.ts`;
  - GraphQL mutation: `project-tasks-schema.test.ts`;
  - work text: `root-task-execution-lifecycle.test.ts`, `root-task-existing-copy-assignment.test.ts`.
- New web tests: `components/projects/__tests__/TaskCommentsSection.spec.ts`, and a store case in `stores/__tests__/projectTaskStore.spec.ts`.
- The rest are fixture and shape updates for the new field. Among them, the shared port fake `tests/fixtures/task-execution-resource-fixtures.ts` returns `comments`.

## Important Assumptions

- Row layout: each comment shows a meta line "#<n> · <relative time>" (full local time in the hover title and a `<time datetime>`), with the full text on its own wrapped line below. The design's "#1 · time · text" reads as one row; I put the text on its own line so multi-line comments stay readable. Number, time and text are all shown, in the existing card language. The relative time reuses `utils/notificationTime.ts` (`shortRelativeTime` / `fullLocalTime`).
- `buildTaskWorkText`'s `comments` input is optional: described work and remote work packets have no comments. `buildExistingCopyTaskMessage` requires it, because it always serves a saved Task.
- The card's add button is the only way to post. Enter adds a line break, as the design says.
- `generated/graphql.ts`: codegen against this worktree's schema also produced unrelated drift, because the checked-in file is stale (already task-part-of's follow-up FU-CR-002). Only the comment hunks are committed, and they match codegen line for line (IMP-06).

## Known Risks

- The `update_task` description gained one line about `add_comment`. Tool text shapes agent behavior; kept to the design's one line.
- Long threads enlarge `list_project_tasks` and the app's `projectTasks` payload (accepted in the design; `autobyteus-260`, FU-001).
- In the test stack, the board's first search started a meaning-model download ("Preparing meaning search: downloading the model …"). This is existing behavior, unrelated to comments, and the exact tier answered at once.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature
- Reviewed root-cause classification: No Design Issue Found
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: existing owners extended; one pure domain file and one web component; no new lock or file.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (no mixed-version handling, no migration)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. The service's `closedParts: string[]` return was replaced by `parts: PartClosureResult`, with no leftover path. An import scan of the touched files finds no unused imports, and server typecheck passes.
- Dead code found elsewhere, added to `follow-ups.md`: None new. `drainRuntimeReleases` (test-only) is already task-part-of's follow-up.
- Shared structures remain tight: `Yes`. `ProjectTaskComment` has no author or edit fields. Agents see texts only. `TaskAcknowledgementView` gained only `partsNotClosedReferences`, present only when non-empty.
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. The largest is `project-task-service.ts` at 486 effective lines (+30 −18); `root-task-execution-lifecycle.ts` is at 462. The largest delta is `TaskCommentsSection.vue` +78 (new). `generated/graphql.ts` is generated.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: design-spec.md "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence (`project-store-task-keys.test.ts`):
  - a `task.json` without `comments` reads as `[]` and is left byte-for-byte unchanged until a save, which then writes `"comments": []`;
  - malformed entries are dropped and the rest kept in ID order;
  - the written key set includes `comments`.
- Deviation: `None`

## Environment Or Dependency Notes

- macOS (darwin), corepack pnpm 10.28.2. In the worktree I ran `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild` and `pnpm -C autobyteus-server-ts build`. The resulting `dist/` was used for the UI stack and the schema print.
- The rendered check used a test-owned data root under `/tmp` (removed), its own SQLite DB, and free ports. I stopped both processes afterwards, and nothing touched `~/.autobyteus`.

## Checks Run

Evidence folder: `evidence/`. Each file name starts with its check ID. Large suite logs are an excerpt plus the gzipped full log.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `e014c349b8` | macOS, Node, worktree install | all server `src` | — | Pass | `IMP-01-server-typecheck.log` | `tsc -p tsconfig.build.json --noEmit`, `exit=0` |
| IMP-02 | `pnpm -C autobyteus-server-ts test:unit` | `e014c349b8` | same | all server unit suites; new `task-comment-rules`, `project-task-comments`, `project-task-comments-tools`; added search, store, GraphQL, work-text cases | BEH-001, 002 (wire), 004, 006, 007; REQ-013; AC-001, 002, 005, 008, 009, 010, 011 | Pass | `IMP-02-server-test-unit.log`, `IMP-02-server-test-unit.full.log.gz` | `Test Files  780 passed \| 4 skipped (784)`, `Tests  6414 passed \| 7 skipped (6421)`, `exit=0` |
| IMP-03 | `pnpm -C autobyteus-server-ts test:integration:prepare` then `test:integration` | `e014c349b8` | same | server integration suites (green-suite guard) | — | Pass | `IMP-03-server-integration-prepare.log`, `IMP-03-server-test-integration.log`, `IMP-03-server-test-integration.full.log.gz` | `Test Files  78 passed \| 20 skipped (98)`, `Tests  421 passed \| 69 skipped (490)`, `exit=0` |
| IMP-04 | `pnpm -C autobyteus-web test:nuxt --run` | `e014c349b8` | same, happy-dom | all web suites; new `TaskCommentsSection.spec.ts`; store `addComment` case; updated Task-page specs | BEH-001 (app), BEH-002; AC-003, 004, 012 | Pass | `IMP-04-web-test-nuxt.log`, `IMP-04-web-test-nuxt.full.log.gz` | `Test Files  649 passed \| 2 skipped (651)`, `Tests  4633 passed \| 5 skipped (4638)`, `exit=0` |
| IMP-05 | `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `e014c349b8` | same | the new component and strings | AC-012 | Pass | `IMP-05-web-guard-web-boundary.log`, `IMP-05-web-guard-localization-boundary.log`, `IMP-05-web-audit-localization-literals.log` | `[guard:web-boundary] Passed.`, `[guard:localization-boundary] Passed.`, `[audit:localization-literals] Passed with zero unresolved findings.` |
| IMP-06 | Schema printed from the built server; `pnpm -C autobyteus-web codegen` against it; comment lines compared | source of `e014c349b8` | same | `generated/graphql.ts` | REQ-007 | Pass | `IMP-06-codegen-comment-lines.txt`, `IMP-06-print-schema.mjs` | `comment lines identical: True 25` |
| IMP-07 | Rendered check on a test-owned stack (built backend + Nuxt dev). Seeded through the built tools: `add_comment` by key in two letter cases, combined status + comment, a blank comment refused. Headless Chrome at 1440×900 and 760 px | working tree equal in source to `e014c349b8` | macOS, Chrome headless | Task page thread and order, add flow (blank disabled, Enter = line break, post, clear, focus), live update in a second page, empty state, board search by comment text, narrow layout | BEH-001, 002, 004; AC-001 (tool path), 003, 004, 016 | Pass | `IMP-07-ui-README.txt`, `IMP-07-ui-run1/` (`result.json`, PNGs), `IMP-07-ui-scripts/` | `result.json`: 5 × `"result": "Pass"`, `"errors": []`; `board-search-quokka-1440.png` shows only "Release notes for 1.5.6" |

- Not run, and why:
  - Server E2E (GraphQL omitted / blank refusal, tool E2E for AC-001, AC-005, AC-009 and AC-010) belongs to API/E2E. As far as I can see, no existing E2E assertion pins a shape this change alters: comment fields are absent when empty, and the update input is unchanged.
  - The browser probe and the isolated desktop instance (AC-013) are left to API/E2E.
  - The tab Task view was not rendered: the `/chat` route stays blank without a run in the test stack. It is covered by the component test (compact card with the add box).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: the Task page Comments card (thread, empty state, add box), live update across open views, the board search by comment text, the narrow layout.
- Approved references: requirements REQ-006, REQ-007, REQ-014, AC-003, AC-004, AC-016; the design's App example and strings; style reference: the task-part-of Parts card (DEC-005).
- Existing design system reviewed: `TaskPartsSection` / `TaskDependenciesSection` card classes, the editor's textarea and button styles, `utils/notificationTime.ts`.
- Rendered surface used: the TESTING.md browser-probe pattern (test-owned backend + Nuxt dev + headless Chrome), driven by an implementation-scoped script.
- States inspected:
  - a thread of 3 (one multi-line, one long wrapped) plus a 4th added from the app;
  - the "No comments yet." state;
  - the Add button disabled for empty and whitespace text, then enabled;
  - after posting: the box cleared, focus kept in it, and the new comment appearing in a second open page without Refresh;
  - the card order: Description → Comments → Parts → Dependencies;
  - the board search for a comment-only word;
  - 760 px, with no horizontal overflow.
- Visual or interaction issues found and corrected: none.
- Limitations: the tab Task view (compact) was not rendered (see above), and zh-CN was checked in the component test only.

## Downstream Coverage Hints / Suggested Scenarios

- Tool E2E through a running server:
  - `update_task add_comment` by key, any case and long ID;
  - status + comment in one call;
  - blank / Temp / unknown refused with nothing written;
  - `list_project_tasks` `comments` (absent when none);
  - `search_project_tasks` for a comment-only word (`match: exact`, `commentCount`).
- `delegate_task task_id` of a Task with two comments to a new and to an existing task agent: the work text has the "Comments:" block (AC-010).
- A parent close where a part fails (damaged run data): `partsNotClosed` (AC-009).
- GraphQL `addProjectTaskComment` (blank → `TASK_COMMENT_INVALID`); `/ws/projects` `task_upserted` carries `comments`.
- Isolated desktop instance (AC-013): the page and the tab, adding from the tab, zh-CN, board search.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes: the scenarios above, including AC-013 on an isolated desktop instance.
