# Implementation Handoff — delegated-copy-task-locator

Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-task-locator`, branch
`codex/delegated-copy-task-locator`. It contains `origin/personal` @ `359d2c0ef`, checked 2026-10-11. No rebase was
needed because `origin/personal` has not moved. Finalization target: `origin/personal`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result:
  - Independent architecture review selected (Large / High). ARCH-REV-002 Pass on SR-003.
  - SR-004 changed the change sequence only (no waiting on `codex/delegated-team-aggregate-status`). The Solution
    Designer recorded that it needs no re-review.
  - Handoff rule applied: implementation complete, Large/High → `/software_engineering_team/code_reviewer`.
- Requirements doc: `tickets/in-progress/delegated-copy-task-locator/requirements-doc.md` (Approved, SR-002)
- Investigation notes: `tickets/in-progress/delegated-copy-task-locator/investigation-notes.md`
- Solution revision record: `tickets/in-progress/delegated-copy-task-locator/solution-revision-record.md` (SR-001..SR-004)
- Design spec: `tickets/in-progress/delegated-copy-task-locator/design-spec.md` (SR-004, Ready)
- Supplemental task artifacts, read only, from `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/delegated-copy-task-locator/`:
  - `ui-ux-spec.md`;
  - `product-ticket.md`;
  - `visual-references/VIS-001..014`.
- Design review report: `tickets/in-progress/delegated-copy-task-locator/design-review-report.md` (ARCH-REV-002, Pass)
- Architecture review revision record: `tickets/in-progress/delegated-copy-task-locator/architecture-review-revision-record.md`
- Triggering rework report: N/A (initial implementation)

All ticket paths are relative to the workspace above.

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `tickets/in-progress/delegated-copy-task-locator/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-002` (requirements), `SR-003` (design), `SR-004` (sequence)
- Related architecture-review revision IDs: `ARCH-REV-001`, `ARCH-REV-002`
- Related code-review / API/E2E / delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

Commits on the branch, oldest first:

| Commit | Content |
| --- | --- |
| `40b689078` | Server: `ProjectTaskService.currentTasksOfTaskWorkers`, domain `TaskWorkerTaskView` / `TaskWorkerTaskResult`, GraphQL `taskWorkerTasks(agentRunIds, teamRunIds)` |
| `6bd2b694a` | Web data: types, `GetTaskWorkerTasks` (+ only its `generated/graphql.ts` hunks), `taskWorkerTaskStore`, `taskLocatorStore`, `useTaskWorkerTasks`, the feed's `deliver` |
| `96791230a` | Projects surfaces: shell reveal and registration, panel back to the board, board visibility steps, card scroll / focus / complete / highlight, Tailwind `utils/` glob |
| `1949fa92d` | Tree: `TaskWorkerTaskSummary`, row `task` prop + `locate-task`, branches `anchor`, Agent and Team hosts, `open-run` / `onOpenTeamRun` (`openTeam` core split), en / zh-CN strings |
| `e97adddf8` | Fix found in the rendered check: a leaving two-line row collapses from its measured height instead of jumping to 2rem |

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section: `design-spec.md` → Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence:
  - Two packages and a new public GraphQL query.
  - A new client cache with live invalidation, per-key epochs and feed retention.
  - A request that crosses the tree, the shell, the panel, the boards and the cards.
  - A shared tree row that another branch also changes.
  - No persistence or security change was found.
- Selected route: `Code Review`
- Lightweight self-review for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. No server assignment rule, `/ws/projects` schema or persisted data
  changed. The center route changes only for REQ-012. QR-003 is kept.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001/002/010) | Summary line under Task-worker rows (Agent and Team hosts) | `useTaskWorkerTasks` → `taskWorkerTaskStore` → `GetTaskWorkerTasks` → `ProjectTaskService.currentTasksOfTaskWorkers` → `WorkspaceTransientExecutionRow` + `TaskWorkerTaskSummary`; `WorkspaceHierarchyBranches` `anchor="name-line"` | Rendered at 11/16 px, weight 400, `#808080`; `#4338ca` when selected or hovered, with underline and 2 px offset; 2 px gap; text aligned with the name; 46 / 28 px rows; ellipsis; elbow and chevron 14 px from the row top. Members and collaborators keep one line |
| BEH-002 (REQ-003) | Row click unchanged; the summary is a separate target | `TaskWorkerTaskSummary` (`@click.stop`, `@keydown.enter.stop`, `@keydown.space.stop`) | Row tests: the summary never emits `select` / `toggle`; the name still does |
| BEH-003 (REQ-004) | Reveal like the strip | `WorkspaceToolShell` registers in `onMounted` and reveals a `pending` request: start tools, then `revealTool('projects')`, then `markRevealed` | Docked, reopened when hidden, drawer at 900×800, start surface (unit) |
| BEH-004 (REQ-008) | Server current-Task rule | `rootTaskLocationOf` → `readTaskChangeView` | Server tests: agent / team / Temp; follow-up; closed current Task; sub-work → null; deleted Task / Project → null; one failing worker → null |
| BEH-005 (REQ-009) | Live summaries | Feed `deliver` → `taskWorkerTaskStore.applyChange`: `connected`, `task_upserted` (root key or cached `taskId`), `task_removed`, `project_removed` → batched re-read with per-key epochs | Live rename and delete seen in the browser; store tests cover every invalidation, epochs and rebinding |
| BEH-006 (REQ-007) | A just-closed Task still locates; closed rows leave | Board `showCancelled` step; row leave (`e97adddf8`) | Cancelled lane located in the browser (request issued in-page; see Known Risks) and in component tests |
| BEH-008 (QR-003) | Selection reveal unchanged | `aria-current` / `aria-selected` stay on the outer row only; the row stays focusable; dot and icon boxes and `teamStatus` are untouched | Row tests; PMU-018 / PMU-019 (see Local Checks) |
| BEH-009 (REQ-003..007, REQ-012) | Locate journey | `taskLocatorStore` steps: shell → `ProjectsPanel` → `ProjectTaskBoard` / `TempTaskBoard` (settled list only) → `ProjectTaskRow`. No shell → host `open-run` → `selectAgentRun(run)` / `actions.onOpenTeamRun` | All locate journeys checked in the browser, including REQ-012 docked and in the drawer |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. Org rows were not touched.

## Key Files Or Areas

- Server:
  - `autobyteus-server-ts/src/projects/services/project-task-service.ts`
  - `autobyteus-server-ts/src/projects/domain/models.ts`
  - `autobyteus-server-ts/src/api/graphql/types/project-tasks.ts`
- Web data:
  - `autobyteus-web/stores/taskWorkerTaskStore.ts`
  - `autobyteus-web/stores/taskLocatorStore.ts`
  - `autobyteus-web/composables/projects/useTaskWorkerTasks.ts`
  - `autobyteus-web/services/projects/projectChangeFeed.ts`
  - `autobyteus-web/types/project.ts`
  - `autobyteus-web/graphql/queries/projectTaskQueries.ts`
  - `autobyteus-web/generated/graphql.ts`
- Projects UI:
  - `autobyteus-web/components/layout/WorkspaceToolShell.vue`
  - `components/projects/panel/ProjectsPanel.vue`
  - `components/projects/ProjectTaskBoard.vue`
  - `components/projects/TempTaskBoard.vue`
  - `components/projects/ProjectTaskRow.vue`
- Tree:
  - `components/workspace/history/TaskWorkerTaskSummary.vue`
  - `components/workspace/history/WorkspaceTransientExecutionRow.vue`
  - `components/workspace/history/WorkspaceHierarchyBranches.vue`
  - `components/workspace/history/AgentRunTaskRows.vue`
  - `components/workspace/history/WorkspaceTeamExecutionTree.vue`
  - `components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`
  - `components/workspace/history/workspaceHistorySectionContracts.ts`
  - `components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
  - `composables/useWorkspaceHistorySelectionActions.ts`
  - `components/workspace/history/treeRowLeave.css`
  - `components/workspace/history/useLeavingTreeRows.ts`
- Strings and build:
  - `localization/messages/{en,zh-CN}/workspace.ts`
  - `tailwind.config.js`

## Important Assumptions

- The server's current-entry rule realizes the spec's "open updated last, else updated last" (ASM-001, adopted).
- The feed's `connected` frame re-reads every interested worker. So when the tree first retains the feed, the
  workers are read twice: once for interest and once on `connected`. Both are batched reads.
- Summaries exist only where the Projects tab exists (`isFeatureAvailableInRuntime('projects')`). There are no
  queries on mobile.

## Known Risks

- **Overlap with `codex/delegated-team-aggregate-status`** (not merged yet). The row diff is kept local:
  - the `task` prop, the emit and the summary inside the name column;
  - the chevron class;
  - the branches `anchor`;
  - the accessible-name suffix.

  Whichever branch lands second resolves the `teamStatus` prop beside `task` (design SR-004 step 5). Their branch
  also edits `localization/messages/*/workspace.ts`. Our two keys are additive.
- **Route redirect timing.** Selecting a standalone run on `/workspace` redirects to `/chat`, which remounts the
  shell.
  - A summary click inside that window (about 100 ms after the run click) loses a drawer reveal in narrow windows.
  - This was observed only when a script clicked in that window. No supported user path hits it; REQ-012 from the
    Agents page works in both docked and drawer modes.
  - Not changed.
- **Cancelled-lane check.** The "closed just before the click" case (DEC-006) can't be clicked in the product,
  because the row leaves at once. The rendered Cancelled-lane locate was therefore issued through the same store call
  in-page. The component test covers it with a real board read.
- **Row moves.** When a summary appears, the existing tree-row move transition (200 ms) slides the rows below it. A
  capture mid-move shows a momentary overlap; the settled layout is correct.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature
- Reviewed root-cause classification: No Design Issue Found
- Reviewed refactor decision: Refactor Needed Now (the `openTeam` core split only), done in
  `useWorkspaceHistorySelectionActions.ts`. `onSelectTeam` and `onOpenTeamRun` share it, and `onSelectTeam`'s
  behaviour is unchanged (tests).
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. There is no client fallback scan.
- Legacy old-behavior retained in scope: `No`
- Dead code in touched files removed: `Yes`. None was found. ESLint and `vue-tsc` are not installed, so imports and
  usages were checked by hand.
- Dead code found elsewhere, listed as follow-up: `autobyteus-web/generated/graphql.ts` was already out of step with
  the server schema before this work (for example `ProjectWorkspace.workspaceId` / `addedAt`, and
  `archiveStoredAgentRunGroup` is missing). Only the `taskWorkerTasks` hunks were applied. A full regeneration is a
  separate cleanup.
- Shared structures remain tight: `Yes`. `TaskWorkerRef` and `TaskWorkerTask` are separate from `ProjectTask`, and
  nothing was added to `AgentRunTaskTreeRow`.
- Canonical shared design guidance reapplied: `Yes`
- Size guardrails: `Yes`.
  - `project-task-service.ts` has 499 effective lines; the method is kept compact.
  - `WorkspaceAgentRunsTreePanel.vue` has 495, after 2 added lines.
  - No changed source file grew by more than 220 lines.

## Persisted Data Transition Check

- Approved decision: `Not Affected`
- Implementation follows it: `Yes`. Reads are read-only. The Projects tab choice goes through
  `projectsPanelStore.choose`, with the same key and shape.

## Environment Or Dependency Notes

- Install the worktree with `pnpm install --frozen-lockfile`, then run `pnpm -C autobyteus-server-ts prebuild` (Prisma
  client) and `pnpm -C autobyteus-web exec nuxt prepare`.
- `autobyteus-application-*-sdk*/dist/` are untracked build outputs. They are not staged.

## Local Implementation Checks Run

- Server:
  - `pnpm -C autobyteus-server-ts typecheck`: pass.
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/projects tests/unit/api/graphql --no-watch`: 38 files,
    255 tests pass. These include the new `task-worker-current-tasks.test.ts` and the `taskWorkerTasks` schema case.
  - `pnpm -C autobyteus-server-ts test:unit` (full, final): 670 files pass, 4 skipped; 5261 tests pass, 7 skipped.
- Web:
  - `pnpm -C autobyteus-web test:nuxt --run` (full, final, after all commits): 602 files pass, 2 skipped; 4178 tests
    pass, 5 skipped.
  - Focused runs after the tree work: `components/workspace/history` (18 files, 196 tests), selection actions,
    section and composable specs all pass.
  - `guard:web-boundary`, `guard:localization-boundary` and `audit:localization-literals` (zero findings) pass.
- REQ-011: a Tailwind build with the config generates `.ring-slate-300` only after the change.
- Reveal / tree-state preservation:
  - `node autobyteus-web/tests/e2e/project-manager-ux-probe.mjs --cases PMU-018,PMU-019` on the worktree build
    (server `dist` rebuilt from this branch): **Pass**. Cleanup receipt: browser closed, frontend and backend
    terminated, data root removed.
  - Evidence: `tickets/in-progress/delegated-copy-task-locator/implementation-evidence/pmu-018-019/`.

## Frontend Rendered-Result Check

- Affected surfaces / journeys: UIS-001 (tree rows under Agent-run and Team-run hosts), UIS-002 (Projects tab);
  UXJ-001..004; REQ-012.
- References: `ui-ux-spec.md`, VIS-001..014.
- Surface used, following the TESTING.md "Renderer UI" path:
  - A real built backend: the scripted AGY CLI, a private data root and free ports. Delegated copies were created
    with the real `delegate_task` tool.
  - Nuxt dev from this worktree, driven in fresh headless Chrome.
  - Scripts, all under `implementation-evidence/`: `locator-stack.mjs` (holds the stack; the cleanup receipt
    `run1/cleanup.json` shows everything removed) and `locator-drive.mjs` (the checks).
  - Results: `run1/drive-results.json`, and `run2/drive-results.json` for the keyboard check, re-recorded on a fresh
    stack after `run1`'s live check deleted its fixture Task. Screenshots: `run1/R*.png`.
  - Both stacks were stopped with everything removed (`run*/cleanup.json`).
- States inspected, all passing:
  - **Rows** (R1, R2, R3):
    - summaries under the agent copy, the team copy and the Temp-task copy;
    - none under team members;
    - the computed values listed in the BEH-001 trace;
    - hover `rgb(67,56,202)`, underlined.
  - **Selected copy** (R15): summary `#4338ca`; the row surface covers both lines; nothing is located.
  - **Keyboard** (R11): Tab from the row reaches the summary (2 px indigo-500 ring). Enter / Space locate and move
    focus to the card. The center is unchanged.
  - **Locate, docked** (R4 vs VIS-005):
    - the picker switches to the Task's Project;
    - the card is centred (smooth), focused and highlighted (`#eef2ff`, inset `#6366f1`);
    - the center and the tree selection are unchanged.
  - **Other Project and Temp tasks** (R5): the picker changes to Temp tasks. Enter on the card opens the Task.
    Locating from an open Task returns to the board (R6).
  - **Only the latest card highlighted** after two quick locates.
  - **Search** (R7a, R7b): a search that still shows the Task is kept; one that hides it is cleared.
  - **Cancelled lane** (R8 vs VIS-010).
  - **Hidden panel reopened** (R9a, R9b). **Narrow 900×800 drawer** (R10) with reduced motion: static highlight,
    `animation: none`.
  - **REQ-012**: from the Agents page the run opens and the Task is located, docked (R13) and in the drawer (R14).
  - **Team-run host** (R12): a delegated member copy shows its summary.
  - **Live**: a Task rename updates the summary, and a Task delete removes it, without a reload.
- Issue found and corrected: a leaving two-line row clipped to 2rem before collapsing (`e97adddf8`).
- Not inspected in the browser: zh-CN. It is covered by component tests (summary and row names) and by the
  localization audit.

## Downstream Coverage Hints / Suggested Scenarios

- Follow-up assignment (VIS-008):
  1. Close a copy's Task.
  2. Assign it a new Task with `delegate_task` and its run ID.
  3. The row returns and shows the follow-up. Covered by server and store tests, not checked in the browser.
- `project_removed` while a summary is shown: the summary should disappear (AC-015 via AR-001).
- Team copy summary → coordinator conversation is unchanged (BEH-002) while the summary still locates.
- Feed reconnect (backend restart) re-reads the summaries.
- After the aggregate-status branch lands: re-run the row specs and PMU-018 / PMU-019 on the rebased branch.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Durable API/E2E coverage of the locate journey and live summaries. The self-check scripts are evidence, not product
  probes.
- An isolated desktop instance check, before user verification in the desktop app.
