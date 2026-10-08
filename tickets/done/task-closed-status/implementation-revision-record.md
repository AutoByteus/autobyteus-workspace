# Implementation Revision Record — `task-closed-status`

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-to-implementation.md`, initial | N/A | `Initial Baseline` | SR-004 | Implemented; ready for direct API/E2E |
| IR-002 | Solution Designer, `handoff-to-implementation.md` › Revision SR-005 | N/A (user direction) | `Design Impact` (designer-issued revision, implemented) | SR-005 | Cancelled lane is the last column; ready for direct API/E2E |
| IR-003 | Solution Designer, `handoff-to-implementation.md` › Revision SR-006 | N/A (user decision) | `Requirement Gap` (renewed approval upstream, implemented) | SR-006 | Status renamed CLOSED → CANCELLED; ready for direct API/E2E |

## Revision Entries

### IR-001 — Cancelled Task status, initial implementation

- Triggering role, report path, and round: Solution Designer, `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/handoff-to-implementation.md`, initial.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation complete; Medium/Low confirmed; direct API/E2E route.
- Related solution revision IDs: SR-004
- Related architecture-review / code-review / API/E2E / delivery revision IDs: N/A
- Why recorded: initial implementation baseline.
- Approved behavior or requirement IDs affected: BEH-001…BEH-010; REQ-001…REQ-014; AC-001…AC-013.
- Implementation delta:
  - **Server vocabulary:** new `projects/domain/task-status.ts` (4-value tuple, `isProjectTaskStatus`, `validateTaskStatus`, `isTerminalTaskStatus`).
  - **Server consumers:**
    - stores, service closure trigger and refusals (status-naming messages; `assertTaskNotDone` → `assertTaskNotTerminal`);
    - open count, feed schema, tool contract (enum, parse, descriptions);
    - GraphQL enum `CANCELLED`;
    - LLM contract and runtime refusal wording; comment sweep.
  - **Released migration:** repointed to a frozen `readReleasedTaskFileV1`.
  - **Web presentation owner:** `taskStatusPresentation.ts` (renamed, no shim).
  - **Web UI:** new `CancelledTasksToggle.vue`; both boards hide Cancelled behind the toggle with a full-width lane; pills and labels show Cancelled.
  - **Web store, strings and types:** store lane/open predicates; en/zh-CN strings; generated enum; unused `PROJECT_TASK_STATUSES` (web) removed.
  - **Docs:** synced (server projects, tools, communication, prompt engineering, streaming protocol; web projects, chat, AGENTS catalog).
- Changed files or areas: see `implementation-handoff.md` › Key Files Or Areas.
- Local validation and result:
  - Server: source typecheck clean, build OK, targeted unit suites pass (incl. new `task-cancelled-status.test.ts`).
  - Existing E2E regressions pass: startup migration, node locality, gated closure, change feed, ad-hoc delegation.
  - Web: Projects specs 102 files / 981 tests pass; localization audit and guard pass; full `test:nuxt` 586/589 files pass (one unrelated flaky file, below).
  - Rendered check of the board (narrow and wide, toggle off and on) and the Task page via `pnpm dev`.
- Full web suite (`pnpm -C autobyteus-web test:nuxt --run`): 586 files passed, 2 skipped, 1 failed (`components/workspace/collaboration/__tests__/CollaborationMessagesOrgRoot.integration.spec.ts`, 2 tests). That file passes alone both with this change and on base code (3/3 each); it is flaky under full-suite load and unrelated.
- Next recipient or routing: `/software_engineering_team/api_e2e_engineer` (direct route).
- Remaining limitations or risks:
  - R-002: the external manager skill does not know CANCELLED.
  - The collaborator-mention guidance text still says "mark that Task DONE" (cosmetic, outside the wording list).
  - The rendered check set statuses by file write, not by an agent.
  - 16 server unit files fail for pre-existing, environment reasons unrelated to this change.

### IR-002 — Cancelled lane becomes the last column (SR-005)

- Triggering role, report path, and round: Solution Designer, `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/handoff-to-implementation.md` › "Revision SR-005" and `design-spec.md` (SR-005); the user reviewed the full-width Cancelled row and asked for a column.
- Triggering finding IDs: N/A (user direction via SR-005)
- Classification: designer-issued design revision, implemented (`Design Impact` resolved upstream)
- Prior authoritative result: IR-001, Cancelled shown as a full-width row under the three lanes (`grid-column: 1 / -1`).
- Current authoritative result:
  - Project board: toggle on → `[To Do][In Progress][Done][Cancelled n]`, four equal columns at ≥752px.
  - Temp board: toggle on → `[Open][Done][Cancelled n]`, three equal columns at ≥752px.
  - Below 752px (and the compact right panel) the lanes stack as before. Toggle off is unchanged.
- Related solution revision IDs: SR-005
- Related architecture-review / code-review / API/E2E / delivery revision IDs: N/A (the branch already carries delivery commits `c387ce7b5`/`151a67f19`; no delivery finding drove this change)
- Why recorded: layout revision requested by the user through the Solution Designer.
- Approved behavior or requirement IDs affected: BEH-003, BEH-004; REQ-008, REQ-010; AC-008, AC-009.
- Implementation delta:
  - `ProjectTaskBoard.vue`: removed the `project-task-board__closed-lane` full-width class and its CSS; the grid gets `project-task-board__columns--with-cancelled` while toggled, which switches `repeat(3, …)` to `repeat(4, …)` at ≥752px.
  - `TempTaskBoard.vue`: the same, with `temp-board__lanes--with-cancelled` (`repeat(2)` → `repeat(3)`).
  - Comments, specs and `autobyteus-web/docs/projects.md` reworded.
- Changed files or areas: `autobyteus-web/components/projects/{ProjectTaskBoard,TempTaskBoard}.vue`, `autobyteus-web/components/projects/__tests__/{ProjectTaskBoard,TempTasks}.spec.ts`, `autobyteus-web/docs/projects.md`.
- Local validation and result:
  - `pnpm -C autobyteus-web test:nuxt components/projects stores/__tests__/projectLiveChanges.spec.ts utils/projects --run`: 16 files / 126 tests pass.
  - Rendered via `pnpm dev`: wide, toggle on → four lanes on one row with equal widths (195 px each at 0.6 zoom, same top), Cancelled last; narrow (<752px) → four stacked lanes, Cancelled last; toggle off → three lanes.
- Next recipient or routing: `/software_engineering_team/api_e2e_engineer` (Medium/Low direct route, unchanged).
- Remaining limitations or risks:
  - The API/E2E-owned browser probe PMU-017 (`autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` L1210–1218, plus the Temp lanes near L1280) still asserts the SR-004 full-width row and will fail until updated. `TESTING.md` L445 has the same wording.
  - At 752–1007px with Cancelled shown, columns are narrower than 240px (accepted in SR-005).
  - The Temp board layout was verified by spec, not in the browser (no Temp tasks in the dev data).

### IR-003 — Rename the status CLOSED → CANCELLED (SR-006)

- Triggering role, report path, and round: Solution Designer, `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/handoff-to-implementation.md` › "Revision SR-006" and `design-spec.md` › "SR-006 Rename Delta". User decision on 2026-10-08: "Closed" read as "finished" and clashed with DONE "closing" workers. The user also asked (in chat) that the ticket artifacts use the new name.
- Triggering finding IDs: N/A
- Classification: requirement revision with renewed user approval, implemented as a mechanical rename
- Prior authoritative result: IR-002, status `CLOSED` / "Closed" / "已关闭".
- Current authoritative result:
  - The status is `CANCELLED`, shown as "Cancelled" (zh-CN "已取消"), behind a "Cancelled (N)" toggle, with the Cancelled column after Done.
  - Semantics, layout and structure are unchanged.
  - There is no alias: `CLOSED` and `CANCELED` are both invalid.
- Spelling: `CANCELLED` (double L), as approved in SR-006. It matches the repository convention: 385 `cancelled` vs 34 `canceled` in tracked server/web/core sources.
- Related solution revision IDs: SR-006
- Related architecture-review / code-review / API/E2E / delivery revision IDs: N/A
- Approved behavior or requirement IDs affected: REQ-001, REQ-004, REQ-008…REQ-010 (names only); all BEH/AC wording.
- Implementation delta:
  - Server:
    - `\bCLOSED\b` → `CANCELLED` in the vocabulary, GraphQL enum, tool contract and descriptions, LLM contract, refusal/runtime texts, comments and docs.
    - Internal resource vocabulary is kept: `closeTask`, `closedAt`, `closeAndWrite`, `TASK_AGENT_RESOURCE_CLOSED`, `TASK_EXECUTIONS_CLOSED`, root `closed`, "closed task executions".
    - LLM-contract pinned hashes recomputed; `prompt_engineering.md` example synced.
  - Web:
    - `ClosedTasksToggle.vue` → `CancelledTasksToggle.vue`.
    - `showClosed`/`closedCount` → `showCancelled`/`cancelledCount`; temp lane `'closed'` → `'cancelled'`.
    - i18n keys `projects.task.status.CANCELLED`, `projects.temp.lane.cancelled`, `projects.board.{cancelledToggle,showCancelled,hideCancelled}`; en "Cancelled" / zh-CN "已取消".
    - Test IDs `…-cancelled-toggle`, `…-CANCELLED`, `temp-task-lane-cancelled`; CSS modifiers `--with-cancelled`.
    - Generated enum `Cancelled = 'CANCELLED'`.
  - Tests:
    - `tests/unit/projects/task-closed-status.test.ts` → `task-cancelled-status.test.ts`.
    - Invalid-status cases now assert `CANCELED` (US spelling) and `CLOSED` (no alias) are rejected. The previous e2e/unit case that used `CANCELLED` as an *invalid* example was replaced.
    - Server e2e `project-task-boundaries` (CLS-API-001) and `task-reactivation-root-visibility` (CLS-E2E-001/002) were renamed mechanically.
  - API/E2E-owned files, renamed in place and **left uncommitted** because they held the API/E2E engineer's uncommitted SR-005 work: `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` (PMU-017 section only; root-closure wording untouched; `node --check` OK) and `TESTING.md` (CLS and PMU-017 paragraphs).
  - Ticket artifacts: status "Closed"/CLOSED → "Cancelled"/CANCELLED in all ticket markdown, except:
    - lines that describe the SR-006 rename itself;
    - quoted user statements;
    - the external comparison (GitHub "Closed as not planned").
    - Evidence JSON under `api-e2e-evidence/` and `delivery-evidence/` was **not** rewritten: those are records of runs made under the old name.
- Local validation and result:
  - Server: source typecheck clean; build OK.
  - Server unit suites: projects, agent-collaboration, project-tasks tools, task-delegation, agent-team-execution, prompt, migration, api — 106 files / 833 tests pass.
  - Server E2E: `project-task-boundaries`, `task-reactivation-root-visibility` (gated AGY fake CLI) and `projects-startup-migration` — 22 pass, 1 gated skip.
  - Web: Projects specs, stores, utils and localization audit spec — 103 files / 990 tests pass; `audit:localization-literals` and `guard:localization-boundary` pass.
  - The design's verification grep finds no Task-status `CLOSED`/"Closed" left in server/web sources and tests. The only hits are the deliberate invalid-value cases and pre-existing, unrelated application-session `"CLOSED"` states.
- Next recipient or routing: `/software_engineering_team/api_e2e_engineer` (Medium/Low direct route).
- Remaining limitations or risks:
  - The PMU-017 browser probe was renamed but not re-run.
  - The pre-SR-006 evidence JSON still says CLOSED (historical runs).
  - No new rendered check: labels and identifiers changed only, and the component tests assert the "Cancelled" text and test IDs.
