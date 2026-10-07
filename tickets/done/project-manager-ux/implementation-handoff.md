# Implementation Handoff — `project-manager-ux`

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review was selected (Large/High). ARCH-REV-002 = `Pass` for SR-005. Its "must follow exactly" items, AR-001 (Publication Contract) and AR-002 (openable rule), are implemented and tested (see below). Routing comes from `get_handoff_rules` at handoff time.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/requirements-doc.md` (SR-003, user-approved 2026-10-07)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/design-spec.md` (SR-005)
- Supplemental task artifacts:
  - UI/UX spec: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/project-manager-ux/ui-ux-spec.md`
  - `product-design-request.md` and `product-design-request-r2.md` (ticket folder)
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/design-review-report.md` (ARCH-REV-002, Pass)
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/architecture-review-revision-record.md`
- Triggering rework report: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/code-review-report.md` (CRR-002, Local Fix: CR-002 blocking, CR-001 non-blocking), from API/E2E F-001 (API-REV-001)
- Upstream package commit: the approved package, previously uncommitted in the worktree, is committed unchanged as its own docs commit before the implementation commit.

## Current Implementation Summary

The Projects pages are now live, and every Task shows its **root**: the one agent or team it was handed to, with that worker's own status.

**Server: change feed (AR-001)**
- Each node has one WebSocket, `/ws/projects` (`api/websocket/projects.ts`, using the same remote-access policy as the other sockets).
- Messages: `connected`, `project_upserted` / `project_removed`, `task_upserted` / `task_removed` (scope `{project}` or `{no_project}`), and `task_worker_status`. They are zod-validated and strict (`projects/changes/project-change-messages.ts`).
- `ProjectChangePublisher` (`projects/changes/project-change-publisher.ts`):
  - Triggers only mark a subject. Marking is synchronous, never throws and never reads. A Task mark also marks its Project, for counts.
  - The flush is scheduled with `setImmediate`. Builds are serialized and coalesced per subject.
  - Build order is removed → view (a view that reads as missing becomes removed) → status-only.
  - Failures are logged and never fail the write. `ProjectChangeHub` broadcasts the result.
- Mark sources are only:
  - `ProjectService`: create, update, delete.
  - `ProjectTaskService`: create, update, update-by-id ad-hoc, ad-hoc creation, delete, and deletion of ad-hoc Tasks hosted by a deleted run.
  - `TaskAgentResourceService.commit()`, i.e. `swap` plus the commit listener, on every write path.
- `load()` still uses plain `swap` and publishes nothing.

**Server: Task roots**
- The root is the latest `assigned` entry (`projects/services/task-root-view-builder.ts`).
- Assigned entries now record an optional `recipientAddress`. Readers accept entries with or without it (Directly Usable, no migration), and writers emit it only when present.
- `TaskRootView` sits on `ProjectTask.root` (GraphQL `TaskRoot`) and on the new `tasksWithoutProject` query (`TaskWithoutProject`, backed by `AdHocTaskStore.list()`).
- Live status (DEC-006):
  - `ActiveRootMessageBoundary.taskExecutionStatus` resolves through Root → `RootTaskExecutionLifecycle` → adapter (×3).
  - An agent reports its handle's status snapshot. A team folds its leaves with the shared `foldTeamAggregateStatus`, which moved into `@autobyteus/collaboration-stream-contracts` and is now used by the web too.
  - Closed or failed roots, inactive or non-admitting roots, and unknown runs are `offline`. Reading never wakes anything.
- Status changes:
  - The lifecycle forwards every agent status change inside a task execution to `TaskAgentResourcePort.taskExecutionsStatusChanged`, also after admission closed.
  - On close or fail-stop it announces all of its task executions.
  - The Task side marks a worker-status change only when the run is that Task's root.

**Web**
- `ProjectChangeFeed` service (ref-counted retain/release, backoff 1 s → 10 s, rebind on node change) and the `useProjectChangeFeed` composable, retained by every Projects page.
- `projectStore.applyChange`.
- `projectTaskStore` (rewritten), keyed by scope (`projectId` or `no_project`):
  - DS-006: a change that arrives while a read is in flight is queued and replayed onto the arriving snapshot.
  - `connected` re-reads every loaded list.
  - Highlights (`liveChanges`): arrived or moved, for 2.4 s.
- Root line:
  - `ProjectTaskWorkers` is used in rows (`ProjectTaskRow` is restructured into a div with a stretched link plus the root line) and in `TaskRootSection` ("Assigned to").
  - States: Running, Initializing, Idle, Error, Offline, plus "Couldn't start". There is no "Stopped".
  - `presentTaskRoot` (AR-002): openable only when `start === "started"`, not closed, and the host run is listed in run history. Otherwise it is a `div` with no chevron and is not focusable.
- `useTaskRootNavigation`:
  - Agent host: opens the run, then `selectChild` (a task Team is expanded and its coordinator selected).
  - Team host: the member link.
  - Org host: the Org inspect action.
- Temp tasks: `TempTasksLink` (header button with "N open"), `TempTaskBoard` (Open/Done, Done capped at 10 with Show all/fewer, search) and `TempTaskDetail` (read only). Routes are `/projects/temp-tasks` and `/projects/temp-tasks/tasks/:taskId`, gated by the existing `/projects` capability middleware.
- F-006: `AgentRunTaskRows.select` always emits `select-run`.
- en/zh-CN copy: `projects.root.*` and `projects.temp.*`.

**Implementation metadata**
- Implementation cycle: `Local Fix` (IR-002 on top of IR-001)
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: `SR-003` (requirements), `SR-005` (design)
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `CRR-001` (Pass), `CRR-002` (Local Fix)
- Related API/E2E revision IDs: `API-REV-001` (F-001)
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `CR-002` (blocking), `CR-001` (non-blocking); API/E2E `F-001`

## IR-002 Local Fix (CR-002, CR-001)

- **CR-002 (blocking; API/E2E F-001).** `audit:localization-literals` could not resolve keys built at runtime, which blocked every `build:electron*` script. The fix replaces them with literal keys and leaves the catalog entries and rendered copy unchanged:
  - Root states and kinds: typed maps `TASK_ROOT_STATE_LABEL_KEYS` (running, initializing, idle, error, offline, failed) and `TASK_ROOT_KIND_LABEL_KEYS` (agent, team) in `utils/projects/taskRootPresentation.ts`. `ProjectTaskWorkers.vue` uses them for the status label and for the kind fallback name. The kind fallback was a script-side runtime key the audit did not flag; it is fixed too.
  - Lanes: `LANE_LABEL_KEYS` in `TempTaskBoard.vue` (open, done).
  - New test: every map key exists in both the en and zh-CN catalogs (`taskRootPresentation.spec.ts`).
- **CR-001 (non-blocking).** The `forget()` doc comment in `task-agent-resource-service.ts` is moved back above `forget()`.
- No other changes. The API/E2E engineer's uncommitted durable test changes in the worktree are left untouched and not committed:
  - `project-change-feed.e2e.test.ts`
  - `project-manager-ux-probe.mjs`
  - `package.json` script
  - `TESTING.md`

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk (Mandatory)"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - The change adds a new transport (`/ws/projects`), a cross-boundary publication path (Task side ← root lifecycles ×3 ← backends), and a persisted-shape addition (`recipientAddress`).
  - It adds a status query on all three root kinds, a shared contracts-package export, a rewritten web store with queue/replay semantics, new routes, and docs on both sides.
- Selected route: `Code Review` (Large/High; confirmed by `get_handoff_rules`)
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. One clarification was made inside the approved rule; see Important Assumptions › A-1.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-002 | Live Projects list and boards (agent or UI writes) | Server: `project-service.ts` and `project-task-service.ts` marks; `task-agent-resource-service.ts` `commit` / `setCommitListener`; `projects/changes/*`; `api/websocket/projects.ts`; composition binding in `project-task-agent-resource-composition.ts`. Web: `services/projects/projectChangeFeed.ts`, `composables/projects/useProjectChangeFeed.ts`, `stores/projectStore.ts` `applyChange`, `stores/projectTaskStore.ts` `applyChange` / queue / replay / highlights, `ProjectTaskRow.vue` highlight CSS | Unit (publisher 6, publication 7, hub 1; store 7; feed 6); browser PMU-001/002/005 (Project arrival on the list in 25 ms; arrived and moved highlights) |
| BEH-003 | Root line with live worker status; opening the worker | Server: `task-root-view-builder.ts`, `models.ts`, `project-tasks.ts` (GraphQL), boundary `taskExecutionStatus` on 3 roots, `root-task-execution-lifecycle.ts` (`taskExecutionStatus`, forwarding, announce), 3 adapters + indexes, `root-task-agent-resource-scope.ts`, port `taskExecutionsStatusChanged`, `root-task-dispatch.ts` (`recipientAddress`). Contracts: `team-aggregate-status.ts`. Web: `ProjectTaskWorkers.vue`, `TaskRootSection.vue`, `utils/projects/taskRootPresentation.ts`, `composables/projects/useTaskRootNavigation.ts` | Unit (task-execution-status: 3 root kinds over real registries; task-root-view 3; presentation 12; component 6); browser PMU-002/003: agent root, task Team coordinator expanded, Team- and Org-hosted roots open |
| BEH-004 | DONE → root Offline, muted, not openable | Builder: closed → offline without asking the root; `presentTaskRoot` muted + not openable | Unit (DONE emits views in commit order, ending with offline); browser PMU-002 (`DIV`, `data-openable=false`, muted name) |
| BEH-005 | F-006: a left-panel task row opens its conversation from any page | `components/workspace/history/AgentRunTaskRows.vue` | Component test `AgentRunTaskRowsSelect.spec.ts` (mutation-checked); browser PMU-006 (from /projects with the run already selected) |
| BEH-006 | Temp tasks: button, board, page, live | Server: `ad-hoc-task-store.ts` `list()`, `ProjectTaskService.listTasksWithoutProject`, GraphQL `tasksWithoutProject`. Web: `TempTasksLink.vue`, `TempTaskBoard.vue`, `TempTaskDetail.vue`, `pages/projects/temp-tasks/**`, `graphql/queries/projectTaskQueries.ts` | Unit (Temp list, damaged folder skipped; components 5); browser PMU-005 (count follows live, Open/Done, read-only page with reference file, live move to Done) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. Agent tool contracts are unchanged (`delegate_task` / `send_message_to` / Project tools take and return the same fields). `teamExecutionViewState.ts` is untouched.

## Key Files Or Areas

- **Contracts:** `autobyteus-collaboration-stream-contracts/src/team-aggregate-status.ts` (+ `index.ts` export, rebuilt `dist/`), `tests/team-aggregate-status.test.mjs`
- **Server, Projects:**
  - `src/projects/changes/{project-change-messages,project-change-publisher,project-change-hub}.ts` (new)
  - `src/projects/services/task-root-view-builder.ts` (new)
  - `src/projects/services/{project-service,project-task-service,task-agent-resource-service}.ts`
  - `src/projects/stores/{ad-hoc-task-store,task-agent-resource-schema}.ts`
  - `src/projects/domain/{models,task-agent-resources}.ts`
- **Server, collaboration:**
  - `src/agent-collaboration/execution/task/{root-task-execution-lifecycle,root-task-execution-adapter,root-task-agent-resource-scope,root-task-dispatch,task-agent-resource-port}.ts`
  - `src/agent-collaboration/execution/services/active-collaboration-root-directory.ts`
- **Server, roots:**
  - `src/agent-execution/.../standalone-agent-run-root.ts`, `standalone-root-task-execution-adapter.ts`, `standalone-root-execution-index.ts`
  - `src/agent-team-execution/domain/root-team-run.ts`, `services/team-execution-index.ts`, `task-delegation/{team-task-execution-adapter,team-task-execution-service}.ts`
  - `src/agent-org-execution/domain/agent-org-run.ts`, `services/{agent-org-execution-index,agent-org-task-execution-adapter}.ts`
- **Server, API and composition:**
  - `src/api/websocket/{projects,index}.ts`
  - `src/api/graphql/types/project-tasks.ts`
  - `src/compositions/project-task-agent-resource-composition.ts`
- **Web:**
  - Types and transport: `types/{project,node}.ts`, `utils/nodeEndpoints.ts`, `graphql/queries/projectTaskQueries.ts`, `generated/graphql.ts` (regenerated)
  - Stores and services: `stores/{projectStore,projectTaskStore}.ts`, `services/projects/projectChangeFeed.ts`
  - Composables and utils: `composables/projects/{useProjectChangeFeed,useTaskRootNavigation}.ts`, `utils/projects/taskRootPresentation.ts`, `utils/workspaceTeamAggregateStatus.ts`
  - Components: `components/projects/{ProjectTaskRow,ProjectTaskWorkers,TaskRootSection,TempTasksLink,TempTaskBoard,TempTaskDetail,ProjectsList,ProjectDetail,ProjectTaskDetail}.vue`, `components/workspace/history/AgentRunTaskRows.vue`
  - Pages and copy: `pages/projects/temp-tasks/**`, `localization/messages/{en,zh-CN}/projects.ts`
- **Tests:**
  - Server: `tests/unit/projects/{project-change-publisher,project-change-publication,project-change-hub,task-root-view}.test.ts`, `tests/unit/agent-collaboration/task-execution-status.test.ts`, plus updated fakes and fixtures.
  - Web: `utils/projects/__tests__/taskRootPresentation.spec.ts`, `services/projects/__tests__/projectChangeFeed.spec.ts`, `stores/__tests__/projectLiveChanges.spec.ts`, `components/projects/__tests__/{ProjectTaskWorkers,TempTasks}.spec.ts`, `components/workspace/history/__tests__/AgentRunTaskRowsSelect.spec.ts`, plus updated `ProjectTaskBoard.spec.ts` and fixtures.
  - Browser probe: `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` (new). `tests/e2e/projects-feature-probe.mjs` selectors were updated for the new row structure (a row is a `div` with a stretched link).
- **Docs:** `autobyteus-server-ts/docs/modules/projects.md` (Live Change Feed And Task Roots, `recipientAddress`, `tasksWithoutProject`, "never persisted" corrected) and `autobyteus-web/docs/projects.md` (live pages, root line, Temp tasks, F-006, probe; removed "No polling…" and "no automatic board synchronization").

## Important Assumptions

- **A-1. Starting roots.** The design's label rule says "Initializing while `starting`". Before the run registers, the hosting root does not know the run and answers `offline`. The rule is therefore implemented once, in the server builder (`rootWorkerStatus`):
  - A `starting` root whose host is **active** reads `initializing` until the run reports its own status.
  - If the host is **not active** (a start left behind by a stopped root, which never settles), it reads `offline`, never a permanent Initializing.
  - To express this, the composition resolver returns `null` for "no active host". The browser found this case: the first run showed a fresh delegation as Offline.
  - The openable rule is unchanged (`starting` is never openable).
- **A-2. Terminated but listed hosts.** A root whose host run is terminated but still in history is Offline and still openable (opening it shows its conversation), as the AR-002 rule says. It stops being openable only when the host run is deleted (PMU-004).
- **A-3. Unloaded lists.** Changes for a list that was never loaded are ignored; the list reads fresh when opened. A `project_upserted` before the Project list was fetched is ignored for the same reason.

## Known Risks

- **Publication volume (measured).** In the browser run, the 7 journeys produced 64 messages: 20 `project_upserted`, 26 `task_upserted`, 16 `task_worker_status`, 2 `connected`. One delegation → move → DONE journey (PMU-002) produced 13 messages. Every Task mark also re-publishes its Project, and each Project view recomputes counts by reading that Project's Task folders. Coalescing bounds this per flush, but a Project with many Tasks and a busy agent pays one folder scan per flush. This is acceptable now; worth watching.
- **Org-hosted root opening.** It uses the existing Org inspect action. It was browser-checked once (PMU-003: the worker conversation opens). Org selection-state edge cases (an Org run not yet hydrated) were not exercised.
- **Run history must list the host.** Openability depends on the web run-history state. A root whose host run was created after the page loaded becomes openable only once the left panel's history includes it, through the existing history refresh.
- **Incident during implementation (no product impact).** While regenerating `generated/graphql.ts`, a shell-scoping mistake (a background `&` list) left the port variable empty. As a result, `pnpm codegen` ran in the **main checkout** (`autobyteus-workspace-superrepo/autobyteus-web`) and sent one read-only GraphQL introspection request to `http://127.0.0.1/graphql` (default port 80). Some local AutoByteus server answered; I could not identify it, and I did not query it again.
  - No data was written.
  - I restored the single file it changed in the main checkout (`autobyteus-web/generated/graphql.ts`, which was clean before). The other modified files in that checkout existed before and were left alone.
  - Codegen was then redone with a strict script against a private backend (temp data dir, confirmed `TaskRoot` in its schema).

## Task Design Health Assessment Implementation Check

- Ownership stays where the design put it:
  - Publication is owned by `ProjectChangePublisher`, which marks and reads through narrow reader functions.
  - Live status is owned by the hosting root (boundary → lifecycle → adapter). The Task side never reaches into runtime registries.
  - The web reads only through the stores.
- The composition remains the single place where Projects and the collaboration runtime are bound (resolver, publisher binding).
- There is one team-status fold rule, in contracts, used by both the server and the web. The web wrapper keeps its `AgentStatus` type.
- No new cyclic imports. `tests/architecture` passes.

## Legacy / Compatibility Removal Check

- Removed:
  - The docs' "No polling, status push or live subscription", "no automatic board synchronization" and "never stores addresses" statements.
  - The web's local team-status ranking implementation (now delegates to the shared fold).
  - The `!props.runSelected` guard in `AgentRunTaskRows` (F-006).
- Nothing is kept for compatibility, except reading old assigned entries without `recipientAddress` (required, below).

## Persisted Data Transition Check (When Applicable)

- Shape change: an optional `recipientAddress` on `assigned` entries in `agent_run_resources.json`. Nothing else changes.
- Classification: **Directly Usable — No Migration.**
  - Old files read unchanged; their root shows its kind ("Agent"/"Team").
  - New writes add the field only for new assignments.
  - The reader rejects it on non-assigned entries or when blank. This is tested, including a round trip.
- Older server builds reading a new file: `recipientAddress` is an extra key. The pre-change reader keeps recognized fields, so it is tolerated, but rolling back drops the name.

## Environment Or Dependency Notes

- The contracts package `dist/` is tracked and was rebuilt (`team-aggregate-status.*` plus the index).
- The untracked `autobyteus-application-*-sdk*/dist/` folders are build output from `prebuild` and are **not** committed.
- `generated/graphql.ts` was regenerated against this branch's backend, so it also picks up earlier schema drift from the base (skill sources).
- The browser probe needs a current server `prebuild` + `build` and Chrome.

## Local Implementation Checks Run

- **Server**
  - `npx tsc -p tsconfig.build.json --noEmit`: clean.
  - `pnpm -C autobyteus-server-ts prebuild && build`: pass.
  - Focused: `tests/unit/projects` + `task-execution-status`: 13 files / 120 tests pass.
  - Broad: `tests/architecture`, `tests/e2e/projects`, and unit `projects`, `agent-collaboration`, `agent-tools`, `agent-team-execution`, `agent-org-execution`, `agent-execution`, `agent-streaming`, `agent-communication`, `run-history`, `api/websocket`: 315 files, 2515 pass, 11 fail. The same 11 fail on the base checkout (`agent-api-status-projectors`, `agent-run-provisioning-service`, `root-recovery-command`, `published-artifact-projection-service`, `team-run-history-catalog-service`, `autobyteus-status-projector`).
- **Mutation checks (server)**
  - A synchronous flush fails the P-001 wake→Running test.
- **Contracts**
  - `team-aggregate-status.test.mjs` passes. Package total: 15 pass / 7 fail; the same 7 `schema_version` failures happen on the base.
- **Web**
  - `pnpm test:nuxt components/projects stores composables/projects components/workspace utils services/projects pages middleware --run`: 222 files, 1826 pass, 3 fail. All 3 also fail on the base: `workspaceSelectionComposition`, `org-definition-navigation`, `AgentCompactionLiveFlow`.
  - `npx vue-tsc --noEmit`: 386 errors, none in changed source files (389 before codegen; all pre-existing).
- **Mutation checks (web)**
  - Restoring the F-006 guard fails `AgentRunTaskRowsSelect` (runSelected=true).
  - Disabling the in-flight queue fails the DS-006 replay test.
- **Required AR-001 tests**
  - wake → Running (P-001)
  - DONE emits views in commit order
  - coalescing (publisher)
  - no publication during `load()`
  - temp-task deletion
- **Required AR-002 tests**
  - `starting` and deleted host are not openable (presentation and component).
  - Browser: terminated-but-listed host stays openable, deleted host does not (PMU-004).

- **IR-002 checks** (evidence: `implementation-evidence/ir-002/localization-checks.log`):
  - `pnpm guard:localization-boundary`: Passed.
  - `pnpm audit:localization-literals`: "Passed with zero unresolved findings" (it failed before the fix with the two M-015 findings).
  - `pnpm test:nuxt utils/projects components/projects --run`: 13 files / 85 tests pass, including `ProjectTaskWorkers` and `TempTasks` (the rendered labels are unchanged) and the new catalog-key test.
  - `npx vue-tsc --noEmit`: 386 errors, unchanged; none in changed files.
  - Server `tsc`: clean.
  - `build:electron:mac` itself was not rerun here; API/E2E reruns it, as planned in CRR-002.

## Frontend Rendered-Result Check (When Applicable)

- **Probe.** `node autobyteus-web/tests/e2e/project-manager-ux-probe.mjs --output-dir <dir>`. It runs a real built backend (private temp data root, scripted AGY CLI calling the actual tools), Nuxt dev and headless Chrome 154. It never uses user data, and the data root is removed afterwards.
- **Result: Pass, 7/7.** Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/implementation-evidence/ir-001/browser-probe/` (`evidence.json`, `feed-messages.json`, 20 screenshots, logs).
  - PMU-001: live Project arrival (25 ms); live counts; agent-created Task arrives highlighted; the highlight clears.
  - PMU-002: root line appears live (Idle, openable button, name from the address); live move to In Progress with highlight; opening selects the worker in its run (`/chat?id=…`); DONE → Done column, Offline, muted, `div`.
  - PMU-003: task Team root opens the coordinator (Team expanded, coordinator selected); Team-hosted and Org-hosted roots open their worker conversations.
  - PMU-004: AR-002 with a terminated (listed) host versus a deleted host.
  - PMU-005: Temp tasks count follows live; Open lane with root; read-only page with reference file; live move to Done.
  - PMU-006: F-006 from /projects with the run already selected.
  - PMU-007: real backend restart → reconnect and re-read (Offline roots), plus a new write after the restart; no horizontal overflow at 390 px on the board, Task page and Temp board.
- **Existing Projects regression probe** (`projects-feature-probe.mjs --skip-server-build`, PT-E2E-001–016, two real backend nodes): **Pass, 16/16**. Evidence: `implementation-evidence/ir-001/projects-feature-probe/result.json`.
  - First run: 15/16. PT-E2E-014 focused the row container, which is now a `div`.
  - The keyboard target is the row's link, so the probe now focuses that link; Enter still opens the Task.
  - This also covers AC-015 preservation (manual create/edit/delete, search, Refresh, ordering, flag gating, zh-CN forms).
- **Not certified:** reduced-motion rendering in the browser (CSS only: static tint), zh-CN rendered copy (catalog parity only), and real-provider runs.

## Downstream Coverage Hints / Suggested Scenarios

- AC-012 (preservation): navigate Chat ↔ Projects ↔ board ↔ Task page with expansion and selection kept. Not explicitly asserted.
- AC-013 beyond task-agent rows: clicking the run row itself, and team-member and Org rows, from a Projects page while selected.
- Worker status transitions on a real provider: Running during a long turn, Error, then Idle. The scripted CLI answers instantly, so Running was seen in feed messages but was not held on screen.
- Reactivation: after DONE → reopen → the assigner's message, the root becomes open, live and openable again (commit listener path; unit-covered via commit).
- Two browser windows on the same node; node switching (feed rebind).
- Volume: a Project with many Tasks and a chatty worker (count recompute per flush).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-001..023 at the API/E2E level with real backend nodes, especially AC-005..011 (root states incl. "Couldn't start" with a real start failure), AC-019..021 (Temp tasks lifecycle including deletion with the run), and AC-015 (existing Projects behavior preserved).
- A `/ws/projects` contract check: message shapes against the zod schema and the web parser; `connected` on every connection; no replay.
- Remote-access auth on `/ws/projects`.
