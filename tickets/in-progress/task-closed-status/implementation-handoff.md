# Implementation Handoff — `task-closed-status`

- Author: Implementation Engineer (`/software_engineering_team/implementation_engineer`), 2026-10-08
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status` / `codex/task-closed-status` (base `origin/personal` @ `3a2496c95`)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Medium/Low → direct implementation (no architecture review). Rule consulted 2026-10-08: "Small or Medium and architectural_risk=Low … ready for direct API/E2E validation without Code Reviewer" → `/software_engineering_team/api_e2e_engineer`.
- Requirements doc (Approved, SR-003 basis): `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/solution-revision-record.md`
- Design spec (Ready, SR-004): `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/design-spec.md`
- Handoff to implementation: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/handoff-to-implementation.md`
- Supplemental task artifacts: None
- Design review report: `N/A — not applicable` (Medium/Low direct route)
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report: `N/A` (initial implementation)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-004`
- Related architecture-review / code-review / API/E2E / delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

A Task status can now be `CLOSED`, meaning dropped as not needed, not completed. On the server, one vocabulary owner (`projects/domain/task-status.ts`) holds the four values, `validateTaskStatus` and `isTerminalTaskStatus` (DONE or CLOSED). All server consumers use it:
- **Service:** closure triggers in both update paths; assignment and reactivation refusals name the actual status.
- **Readers and schemas:** both store readers, the change-feed schema and the tool contract.
- **Counts and transport:** the open count and the GraphQL enum.

CLOSED reuses `closeAndWrite` unchanged. Agent-facing tool texts, the collaboration LLM contract and runtime refusal texts explain CLOSED. The released `projects-per-folder-v1` migration now reads tasks through a frozen 3-status reader.

On the web, `utils/projects/taskStatusPresentation.ts` (renamed from `taskStatusLabelKey.ts`, no shim) owns:
- labels and pill classes;
- the open predicate;
- the Project and Temp lanes.

Both boards hide Closed Tasks behind a new `ClosedTasksToggle.vue` ("Closed (N)" beside Refresh, absent at 0) that reveals a full-width Closed lane. Task page, Temp page and right-panel detail show a muted "Closed" pill. en/zh-CN strings and the generated enum value are added. Docs are synced.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` › Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: all changes stayed inside the listed Projects owners. CLOSED reused `closeAndWrite` unchanged. DONE ↔ CLOSED produced no resource-file change beyond repeated-DONE behaviour (unit test). The migration repoint left every migration test and the startup-migration E2E green. No unlisted status consumer with runtime behaviour was found: a full grep found only the listed sites plus comment/wording sites.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed: `Yes` (diff review against design, boundaries, removal list, file sizes, scope guardrail; see checks below)
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | CLOSED closes and stops workers exactly like DONE; reopen writes only | `project-task-tool-contract.ts` (parse via `validateTaskStatus`) → `ProjectTaskService.updateTaskById` / `update` → `isTerminalTaskStatus` → `closeAndWrite` (unchanged) | Done. Repeated CLOSED re-requests stop with no file change; DONE↔CLOSED = repeated DONE |
| BEH-002 | App stays display-only | No GraphQL input change; no new control (toggle only shows/hides) | Preserved |
| BEH-003 | Closed out of open lanes, hidden by default, toggle beside Refresh, full-width lane | `ProjectTaskBoard.vue`, `ClosedTasksToggle.vue`, `taskStatusPresentation.ts` (`BOARD_OPEN_LANES`) | Done, incl. compact/right-panel board |
| BEH-004 | Temp: Closed neither Open nor Done; hidden + toggle; header count excludes | `TempTaskBoard.vue`, `TempTaskDetail.vue`, `TempTasksLink.vue`, `tempTaskLaneOf` | Done |
| BEH-005 | `list_project_tasks` filters CLOSED | Tool enum from `PROJECT_TASK_STATUSES`; `listTasks` validation | Done |
| BEH-006 | Terminal refuses assignment/reactivation naming status; reopen → assigner reactivation | `resolveAssignment`, `linkAgentRun`, `assertTaskNotTerminal` (renamed from `assertTaskNotDone`) | Done. Messages: "The Task is CLOSED; move it to TODO or IN_PROGRESS before assigning new work." / "This Task is CLOSED. Move it to TODO or IN_PROGRESS with create_or_update_task first, then message this run ID again." |
| BEH-007 | Open count = TODO + IN_PROGRESS | `project-service.ts` (`!isTerminalTaskStatus`), web `projectTaskStore.publish` / `TempTasksLink` (`isOpenTaskStatus`) | Done; delete confirm unchanged |
| BEH-008 | Feed carries CLOSED; live lane moves | `project-change-messages.ts` `z.enum(PROJECT_TASK_STATUSES)`; web `laneOf` via `tempTaskLaneOf` | Done; DONE→CLOSED highlights as `moved` |
| BEH-009 | Existing data directly usable | Readers use `isProjectTaskStatus`; frozen `readReleasedTaskFileV1` for the released migration | Done; no migration |
| BEH-010 | CLOSED exists | `task-status.ts`, GraphQL enum, web type, en/zh-CN labels | Done |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Server:
- **Added:** `src/projects/domain/task-status.ts`.
- **Status logic:** `src/projects/{domain/models.ts, stores/project-store.ts, stores/ad-hoc-task-store.ts, services/project-task-service.ts, services/project-service.ts, changes/project-change-messages.ts}`.
- **Agent tools and GraphQL:** `src/agent-tools/project-tasks/project-task-tool-contract.ts`, `src/api/graphql/types/project-tasks.ts` (enum + `CLOSED`).
- **Migration:** `src/app-data-migrations/migrations/projects-per-folder-v1/{released-project-folder-v1.ts, projects-per-folder-v1-app-data-migration.ts}`.
- **Agent-facing wording:** `src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts`; runtime refusal texts in `agent-collaboration/execution/task/*`.
- **Comment-only sweep:** files in agent-team/org/standalone/run-history plus `projects/{runtime,services,domain}`.

Web:
- **Added:** `components/projects/ClosedTasksToggle.vue`.
- **Rename:** `utils/projects/taskStatusLabelKey.ts` → `taskStatusPresentation.ts`.
- **Boards and pages:** `components/projects/{ProjectTaskBoard,TempTaskBoard,TempTaskDetail,TempTasksLink,ProjectTaskDetail}.vue`, `components/projects/panel/ProjectsPanelTaskDetail.vue`.
- **Store, types and strings:** `stores/projectTaskStore.ts`, `types/project.ts`, `localization/messages/{en,zh-CN}/projects.ts`, `generated/graphql.ts`.

Docs:
- Server: `docs/modules/{projects,agent_tools_mcp_server,agent_communication,prompt_engineering}.md`, `docs/design/agent_websocket_streaming_protocol.md`.
- Web: `docs/{projects,chat}.md`, `AGENTS.md` catalog line.

Tests:
- **Server:** new `tests/unit/projects/task-closed-status.test.ts`; updated `project-service.test.ts`, `project-task-tools.test.ts`, `agent-team-collaboration-llm-contract.test.ts` (pinned hashes + wording).
- **Web:** new `utils/projects/__tests__/taskStatusPresentation.spec.ts`; updated `ProjectTaskBoard.spec.ts`, `TempTasks.spec.ts`, `ProjectsPanel.spec.ts`, `stores/__tests__/projectLiveChanges.spec.ts`.

## Important Assumptions

- Board rows carry no status label of their own today; Closed rows are labelled by their "Closed" lane heading (same as Done rows by "Done"). The Task page, Temp page and right panel show the "Closed" pill (REQ-009).
- The toggle's accessible name is its visible text "Closed (N)", with `aria-pressed` for state and a `title` "Show/Hide closed tasks". No changing aria-label.
- The web `PROJECT_TASK_STATUSES` constant became unused once the boards use `BOARD_OPEN_LANES` and was removed (dead code); the type gained `'CLOSED'`.
- The generated GraphQL enum line was applied by hand in codegen order (`Closed` first, alphabetical), which the design allowed.

## Known Risks

- R-001 (wording "closed" for agent-run closure) mitigated in tool/LLM texts and docs as designed.
- R-002: the external Project Task Manager skill (`autobyteus-agents`) does not know CLOSED. This is out of scope and a follow-up candidate.
- The pinned LLM-contract hashes changed: `sendTool`, `sendExactRun`, `delegateTool` and `collaborationPrompt`. The `prompt_engineering.md` Team example was synced to match.
- The collaborator-mention note (`agent_communication.md` L385, `@`-mention guidance text in code) still says "mark that Task DONE". It is a separate, unchanged code string outside the design's wording list; cosmetic only.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature
- Reviewed root-cause classification: Duplicated Policy Or Coordination
- Reviewed refactor decision: `Refactor Needed Now` (bounded consolidation)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: server local `STATUSES` sets (×2), service `validateTaskStatus`, contract `statuses` literal + inline error, zod literal, and all `=== "DONE"` rule checks were replaced by `task-status.ts`. Web DONE ternaries and inline pill classes in 6 files were replaced by `taskStatusPresentation.ts`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code removed in scope: `Yes` (old file renamed without shim; duplicated sets/literals/ternaries removed; unused web `PROJECT_TASK_STATUSES` removed; `assertTaskNotDone` renamed)
- Shared structures remain tight: `Yes`
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`. Largest changed: `project-task-service.ts` 439 effective lines. Comment-only files of 405–466 lines got one-line edits. No source file has a >220-line delta.
- Notes: dependency rules held:
  - The migration folder imports neither `task-status.ts` nor the current `readTaskFile`.
  - `agent-collaboration` does not import the Projects vocabulary.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: `design-spec.md` › Persisted Data / State Transition Decision
- Implementation follows it: `Yes`
- Direct-use evidence:
  - The current readers accept all four values and still reject unknown ones (unit test).
  - The existing store/migration fixtures still pass.
  - The released migration's frozen reader `readReleasedTaskFileV1` is a verbatim copy of the current `readTaskFile`, pinned to `3a2496c95`. It keeps 3 statuses and rejects CLOSED (unit test).
  - The migration unit test and `projects-startup-migration.e2e.test.ts` pass on a rebuilt dist.
- Migration implementation: N/A
- Deviation: `None`

## Environment Or Dependency Notes

- The worktree needed `pnpm install` and `pnpm -C autobyteus-server-ts prebuild` (Prisma client + SDK builds). These left untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` behind; they are not committed.
- `pnpm -C autobyteus-server-ts typecheck` fails on base for a pre-existing config reason: TS6059, tests outside `rootDir`. Source typecheck was done with `npx tsc -p tsconfig.build.json --noEmit` (clean), and `pnpm -C autobyteus-server-ts build` succeeded.
- A full `tests/unit` server run shows 16 failing files in unrelated areas: file-explorer, application-platform, agent-memory, Prisma-default-export, package-root-summary, streaming config, media, gemini, logging, workspace-skill. A sample of 5 of them fails identically on base code (verified via stash); they are environment or pre-existing and unrelated to this change.

## Local Implementation Checks Run

- Server source typecheck (`tsc -p tsconfig.build.json --noEmit`): clean. Server build: success.
- Server unit tests:
  - `tests/unit/projects tests/unit/agent-collaboration tests/unit/agent-tools/project-tasks tests/unit/agent-tools/task-delegation tests/unit/app-data-migrations/projects-per-folder-v1-app-data-migration.test.ts tests/unit/api` passed; after new tests, `tests/unit/projects/task-closed-status.test.ts` adds 10 tests;
  - `tests/unit/agent-team-execution tests/unit/agent-tools/task-delegation tests/unit/agent-execution/prompt`: 39 files / 203 tests pass;
  - `tests/unit/agent-tools/project-tasks`: 89 pass.
- Existing server regression suites re-run unchanged (not new API/E2E sign-off):
  - `tests/e2e/projects/projects-startup-migration.e2e.test.ts` and `project-mutation-node-locality.e2e.test.ts` on the rebuilt dist: 6 pass;
  - gated (fake AGY CLI, no model calls) `task-closure-root-visibility`, `project-change-feed` and `ad-hoc-task-delegation` e2e: 13 pass.
- Web (`pnpm -C autobyteus-web test:nuxt components/projects localization/messages/__tests__ stores/__tests__ utils/projects scripts/__tests__/localizationLiteralAudit.spec.ts --run`): 102 files / 981 tests pass. `audit:localization-literals` and `guard:localization-boundary` pass. Full `pnpm -C autobyteus-web test:nuxt --run`: 586 files passed, 2 skipped, 1 failed (`CollaborationMessagesOrgRoot.integration.spec.ts`). That file passes alone both with this change and on base (3/3); it is flaky under full-suite load and unrelated.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Project board (Tasks tab), Closed toggle, Task page pill; Temp board/page/header and right-panel board/detail via component tests.
- Approved references: requirements REQ-008/009/010, QR-001; design Concrete Examples (toolbar, full-width row).
- Existing design system reviewed: existing Refresh button style (toggle matches: `min-h-11`, slate border, `rounded-lg`), lane section markup (reused), pill palette.
- Surface used: `pnpm dev` (worktree-local `.autobyteus/development` state), backend `127.0.0.1:8000`, frontend `127.0.0.1:3000`, driven through the browser tool. Stopped afterwards.
- States inspected:
  - Board at narrow width (stacked lanes): Closed hidden, "Closed (2)" immediately before Refresh, unpressed.
  - Board at wide width (3 lanes): toggle pressed (`bg-slate-100`); full-width "Closed 2" lane under To Do / In Progress / Done, which are unchanged.
  - Task page for a Closed Task: muted outlined "Closed" pill, distinct from Done green.
- Issues found / corrected: none needed.
- Limitations:
  - Statuses for the rendering check were set by writing `task.json` directly in the dev data root; the agent tool path is covered by unit and E2E tests. Live feed movement was not observed in the browser; it is covered by `projectLiveChanges.spec.ts` and `project-change-feed.e2e`.
  - The Temp board and right-panel board were not opened in the browser; they are covered by component tests.
  - No packaged desktop / isolated-app run.

## Downstream Coverage Hints / Suggested Scenarios

- An agent (scripted AGY) closes a delegated Project Task with `create_or_update_task {task_id, status:"CLOSED"}`:
  - `task_executions_closed` is published before the stop;
  - the root is Offline;
  - a repeated CLOSED re-publishes;
  - DONE→CLOSED and CLOSED→DONE behave as a repeated DONE.
- While CLOSED: `delegate_task {task_id}` is refused without spawning; messaging the worker run ID is refused with "This Task is CLOSED…"; reopen → assigner reactivation works (mirror `task-reactivation-root-visibility`).
- Temp task closed by `task_id` (mirror `ad-hoc-task-delegation`); feed `task_upserted` with CLOSED for both scopes (`project-change-feed`).
- GraphQL schema exposes `ProjectTaskStatus.CLOSED` and still has no status input (`projects-graphql.e2e`). `list_project_tasks {status:"CLOSED"}` over MCP.
- Browser: the board toggle and Closed lane through a live agent close/reopen (`test:e2e:project-manager-ux` style), plus Temp board and right panel. Desktop user verification per design (`pnpm --silent isolated-app start --build`).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- New durable API/E2E coverage for CLOSED, per the design Guidance and the hints above. None of the E2E files were changed in this round; only existing suites were re-run as regressions.
- Browser probe / isolated desktop verification of the live close → hide → toggle → reopen journey.
- Pass/fail classification and confidence for AC-001…AC-013 (AC-013 docs included).
