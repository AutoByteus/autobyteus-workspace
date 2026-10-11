# API/E2E Coverage Investigation — delegated-copy-task-locator

## Investigation Meta

All ticket paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-task-locator/tickets/in-progress/delegated-copy-task-locator/`.

- Requirements Doc: `requirements-doc.md` (Approved, SR-002)
- Investigation Notes: `investigation-notes.md` (AF-001..AF-014)
- Solution Revision Record: `solution-revision-record.md` (SR-001..SR-004)
- Design Spec (required on every route): `design-spec.md` (SR-004, Ready)
- Supplemental Task Artifacts: Product `ui-ux-spec.md`, `product-ticket.md`, `visual-references/VIS-001..014` in `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/delegated-copy-task-locator/` (read only)
- Design Review Report: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, Pass 9.4)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: CRR-001 Pass from `/software_engineering_team/code_reviewer`
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: this file, round 1

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review of the durable test changes)
- Proportional test-code review decision: `Required`

## Current Requirement And Design Basis

Task Agent and task Team copy rows under Agent-run and Team-run hosts show their **current** Task's summary
(server `taskWorkerTasks`, one batched read per batch of newly listed workers), kept live by `/ws/projects`
(`connected`, `task_upserted`, `task_removed`, `project_removed`). The summary is its own button: click / Enter /
Space locate the Task in the right panel's Projects tab (`taskLocatorStore` steps: shell reveal → panel board →
board visibility (search cleared, Cancelled lane, Show all) → card scroll / focus / 2.4 s highlight), never open
or toggle the row. On a page without a right panel the row's run opens first (REQ-012, Agent: `selectAgentRun`;
Team: `onOpenTeamRun`, no collapse). en / zh-CN strings (REQ-010). Tailwind generates `ring-slate-300` (REQ-011).
Preserved: row click (BEH-002), selection reveal PMU-018 / PMU-019 (BEH-008), closed rows leave (BEH-006).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001, SCN-002, SCN-003, SCN-004, SCN-005 (open Task, hidden panel, narrow drawer,
  start surface), SCN-006a, SCN-006b (Cancelled; Done Temp past ten — component only, see Not Tested), SCN-006c,
  SCN-008, SCN-009, SCN-010, SCN-011, SCN-012, SCN-013, SCN-014.
- Real-use scenarios added from investigating the implemented behavior:
  - RU-001 — **a Team copy row click still opens its coordinator** while its summary locates (handoff hint; BEH-002
    on a `task_team` row). Trigger: click the task Team row's name.
  - RU-002 — **sub-work copy** started by a Task worker's own `delegate_task` stays one line (AC-002 via the real
    tool, not a component mount). Trigger: the worker copy's own tool call.
  - RU-003 — **`@` collaborator** brought in by the Manager's `send_message_to` stays one line (AC-002). Trigger: the
    Manager's tool call.
  - RU-004 — **Project deleted** while a summary is shown (ARCH-REV P-001): the summary disappears live. Trigger:
    Projects page delete (GraphQL `deleteProject`, the same call the page makes).
  - RU-005 — **feed reconnect** after a missed change: the browser's `/ws/projects` connection drops while a Task is
    renamed, then reconnects; the summary re-reads (REQ-009 "a reconnect re-reads it"). Trigger: network loss of
    the feed socket (emulated with Playwright `routeWebSocket`) and a backend restart.
  - RU-006 — **picker choice remembered like a manual pick** after reload (REQ-005).
  - RU-007 — **closed just before the click** (SCN-006c, VIS-010) entered through the real summary click: the Task is
    cancelled by the Manager's tool; the browser's root-run stream frames that remove the row are held briefly
    (network delay between two sockets, emulated with `routeWebSocket` on the run stream only), so the still-shown
    summary is clicked after `/ws/projects` already moved the Task to Cancelled.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): C-003 (summary
  click inside the ~100 ms `/workspace` → `/chat` redirect window), C-004 (board read error), C-005 (reconnect
  concurrent with a click), C-007 (two shells).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 summary line (REQ-001/002/010) | Added | design DS-001 | Browser: row kinds, values, en / zh-CN |
| BEH-002 row click | Preserved | REQ-003 | Browser: agent and Team copy row click opens the copy, nothing located |
| BEH-003 reveal (REQ-004) | Added (reuse) | DS-002 | Browser: docked, hidden, drawer, start surface |
| BEH-004 current Task (REQ-008) | Added read | DS-001 | Browser + GraphQL: follow-up via real `delegate_task` with run ID |
| BEH-005 liveness (REQ-009) | Added | DS-003 | Browser: rename, follow-up, delete, Project delete, reconnect; request count |
| BEH-006 closed rows leave | Preserved + edge | REQ-007 | Browser: closed-just-before click; `task-closure-tree` leave cases |
| BEH-008 selection reveal | Preserved | QR-003 | PMU-018 / PMU-019, full PMU run |
| BEH-009 locate (REQ-003..007, REQ-012) | Added | DS-002, DS-004 | Browser: every locate journey incl. REQ-012 Agent and Team hosts |
| REQ-011 Cancelled pill ring | Changed (build) | Tailwind glob | Browser computed ring colour on a Cancelled pill |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `currentTasksOfTaskWorkers` | Unit test with real stores (`task-worker-current-tasks.test.ts`) | Assignment produced by the real `delegate_task` tool, sub-work and collaborators from real tools | Live API through the built backend (in the browser probe) |
| API / transport / contract | Yes | GraphQL `taskWorkerTasks` | Schema unit test with mocked service | Real HTTP GraphQL | Live API |
| Frontend component / state | Yes | stores, composable, row, summary, boards, card, shell | 10 web spec files, 65 tests | Real mount timing, real feed | Browser |
| Browser integration / user journey | Yes | tree → shell → panel → board → card; REQ-012 route change | Implementer self-check scripts (not durable) | Durable regression of the journeys | Browser (durable PMU cases) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Same renderer | — | — | Browser, then isolated desktop smoke |
| Desktop shell / Electron-specific integration | No | No main / preload / IPC change | — | Packaged renderer build (Tailwind CSS, bundling) | Isolated desktop instance |
| Process / lifecycle | Yes (feed) | Feed retention, reconnect | Store unit tests | Real socket drop and backend restart | Browser with backend restart |
| Persisted-data transition | No | `Not Affected` (picker choice uses existing key) | Panel spec | — | Reload check |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-task-locator`, branch `codex/delegated-copy-task-locator`
- Project type and runtime stack: pnpm workspace; Nuxt 3 / Vue 3 / Pinia web + Electron shell; Node TS server (GraphQL, WebSockets); Vitest; Playwright-core probes
- Project testing guideline path(s): `TESTING.md` (root; no closer `TESTING*.md` in `autobyteus-web` or `autobyteus-server-ts`)
- Conflicting, missing, or unclear project instructions: none. RSK-001 rebase is not actionable: `origin/personal` is still `359d2c0ef` and `codex/delegated-team-aggregate-status` is not on the remote (checked with `git fetch`, 2026-10-11).
- Required environment variables or secrets available: `N/A` (scripted AGY CLI, no provider calls)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` § Test layers, Choosing the path, Rules | Root testing guideline | Renderer/client–server → web unit + browser dev-path probe; full product → isolated desktop instance; never the user's app/data; stop what you start |
| `TESTING.md` § Live Projects pages | `test:e2e:project-manager-ux` (PMU-001..019) | Rebuild the server first; probe owns backend, Nuxt, Chrome, data root; fails on any browser error |
| `TESTING.md` § Task closure in the Workspaces tree | `test:e2e:task-closure-tree` | Leave motion of closed rows (touched by `e97adddf8`) |
| `TESTING.md` § Team identity glyph | `test:e2e:team-group-icon` | Needs `pnpm --filter 'autobyteus^...' build`, `nuxt prepare` |
| `docs/isolated-app-instances.md` | Isolated desktop instances | `pnpm --silent isolated-app start --build`, `stop <instanceId>` |
| `AGENTS.md`, `autobyteus-web/AGENTS.md`, `autobyteus-server-ts/AGENTS.md` | Package rules | Stage paths explicitly; no `git add -A` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server dist | repo root | `pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build` | Built 2026-10-11 from this worktree (`api-e2e-evidence/server-build.log`) | build smoke passed | — |
| Backend + Nuxt + Chrome | repo root | `pnpm -C autobyteus-web test:e2e:project-manager-ux --output-dir <fresh>` | Free ports, private data root, scripted AGY CLI | probe waits for `listening`, GraphQL, frontend | probe `finally`: Chrome closed, process groups terminated, data root removed |
| Fixture-page probes | repo root | `pnpm -C autobyteus-web test:e2e:<name>` | Own Nuxt + Chrome | per probe | per probe |
| Isolated desktop | repo root | `pnpm --silent isolated-app start --build` | Own ports and data folder; user app (pid 593) and another worktree's isolated instance (pid 972) are running and must not be touched | `start` output | `pnpm --silent isolated-app stop <instanceId>` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent / Team definitions, Projects, Tasks | Public GraphQL (`createAgentDefinition`, `createProject`, `createProjectTask`) | Probe-owned data root | Removed with the data root |
| Delegated copies (agent, team, Temp, Team-hosted, sub-work, collaborator, follow-up) | Real `delegate_task` / `send_message_to` / `create_or_update_task` through the scripted AGY actor (`CALL_TOOL:`) | No model calls | Removed with the data root |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/projects/task-worker-current-tasks.test.ts` | Current Task per worker, follow-up, sub-work null, deleted Task / Project null, per-worker error | REQ-008, REQ-009, AR-001 | Still Valid | Reviewer re-run | Run |
| `autobyteus-server-ts/tests/unit/api/graphql/project-tasks-schema.test.ts` (taskWorkerTasks case) | Transport mapping (mocked service) | DS-001 | Still Valid | — | Run |
| `autobyteus-web/stores/__tests__/taskWorkerTaskStore.spec.ts` | Batching, release, invalidations, epochs, rebinding | REQ-009, QR-001 | Still Valid | — | Run |
| `autobyteus-web/stores/__tests__/taskLocatorStore.spec.ts` | Steps, supersede, expiry | DS-005 | Still Valid | — | Run |
| `autobyteus-web/components/layout/__tests__/WorkspaceToolShell.taskLocate.spec.ts` | Reveal modes | REQ-004 | Still Valid | — | Run |
| `autobyteus-web/components/projects/panel/__tests__/ProjectsPanelTaskLocate.spec.ts` | Board steps, card, highlight, reduced motion, Show all | REQ-005..007 | Still Valid | — | Run |
| `autobyteus-web/components/workspace/history/__tests__/TaskWorkerTaskSummary*.spec.ts`, section, selection actions, `useTaskWorkerTasks.spec.ts`, `useLeavingTreeRows.spec.ts` | Row kinds, isolation, a11y names en/zh-CN, REQ-012 wiring, leave height | REQ-001..003, REQ-010, REQ-012 | Still Valid | — | Run |
| `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` PMU-001..PMU-019 | Projects pages, right-panel tab, Cancelled, collapsed strip reveal | BEH-008 (PMU-018/019), Projects surfaces touched | Still Valid | — | Run all |
| `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` | Closed rows leave (motion, focus hand-off) | BEH-006, `e97adddf8` | Still Valid | — | Run leave cases |
| 5 fixture pages (`tests/e2e/fixtures/*.page.vue`) implementing `WorkspaceHistorySectionActions` | Fixture conformance | C-002 | Needs Update | Missing required `onOpenTeamRun` | Add `onOpenTeamRun`; run probes |
| Probes over those fixtures and other tree fixtures: `nested-team-hierarchy`, `nested-team-aggregate-status`, `background-contention`, `team-group-icon`, `task-agent-peer-sidebar`, `composer-mention-discoverability`, `standalone-agent-error-stop`, `team-activity-presentation` | Tree / row rendering; fail on browser errors and failed requests | C-002, QR-003 | Still Valid (unclear under the new read until run) | Probe lines 345–349, 712–715 | Run |
| Implementer scripts `implementation-evidence/locator-*.mjs` | Self-check, not product tests | — | Replace | Not durable, in-page store call for VIS-010 | Replaced by durable PMU-020..PMU-025 |

## Durable Coverage To Add

New module `autobyteus-web/tests/e2e/project-manager-ux-task-locator-cases.mjs`, registered in
`project-manager-ux-probe.mjs` (same owned stack, real built backend, real tools, fails on any browser error).

| Case ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| PMU-020 | Rows: summaries under task Agent / task Team / Temp copies (Agent host) and a Team-host copy; none for members, sub-work (RU-002), `@` collaborator (RU-003); spec values; hover; one batched read and no Task-list reads (QR-001); GraphQL answers match | REQ-001, REQ-002, REQ-008, QR-001; AC-001, AC-002, AC-003, AC-016 | PMU module | Real server data and real tree; regressions in either side |
| PMU-021 | Locate docked: other-Project switch, card centred / focused / highlighted, centre and selection unchanged; Temp tasks; Enter opens the Task; from an open Task back to board; twice → only latest; search kept / cleared; picker remembered after reload (RU-006); row click (agent and Team copy, RU-001) opens the copy and locates nothing; Tab / Enter / Space | REQ-003..REQ-007; AC-004..AC-007, AC-009, AC-013, AC-014 | PMU module | Cross-surface step order with real mount timing |
| PMU-022 | Reveal variants: hidden panel reopened; narrow 900×800 drawer with reduced motion (static highlight); start surface (New chat) opens tools | REQ-004, REQ-006; AC-008 | PMU module | Shell layout variants only exist in a real layout |
| PMU-023 | REQ-012 from pages without a right panel: Agents page → Agent-host summary; Skills page → Team-host summary (Team run already selected is not collapsed) | REQ-012; AC-020 | PMU module | Route change + late shell mount |
| PMU-024 | Live: rename (UI write), follow-up via real `delegate_task` with the copy's run ID (VIS-008, earlier Task stays in Done with the worker), closed just before the click → Cancelled lane (RU-007), Task delete, Project delete (RU-004), feed drop + reconnect re-read (RU-005), backend restart re-read; Cancelled pill ring slate-300 (REQ-011) | REQ-007, REQ-008, REQ-009, REQ-011; AC-010, AC-012, AC-015, AC-018 | PMU module | Live feed boundary only exists end to end |
| PMU-025 | zh-CN: summary text, tooltip / accessible name, row accessible name suffix | REQ-010; AC-017 | PMU module | Locale only proven in components so far |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Requirement / AC / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| C-002 | 5 fixture pages | Add `onOpenTeamRun` to the actions object | design: contract `WorkspaceHistorySectionActions.onOpenTeamRun` | Done before this file was written (one line each); recorded here |
| PMU list | `project-manager-ux-probe.mjs` | Register PMU-020..PMU-025; expose helpers to the module | — | — |
| C-002 follow-up | `nested-team-hierarchy`, `nested-team-aggregate-status`, `background-agent-renderer-contention`, `team-group-icon`, `task-agent-peer-sidebar` probes | Supply the two new boundaries through the shared helper `tests/e2e/fixtures/task-worker-boundaries.mjs` (`GetTaskWorkerTasks` answers "no Task", quiet `/ws/projects`) | design DS-001 / DS-003: Task-worker rows read and retain the feed | Their pages render task rows; without the boundaries the probes fail on browser errors (base Pass → branch Fail for hierarchy and group-icon) |
| Baseline fix | `task-agent-peer-sidebar-probe.mjs` | Fixture answers `GetRunFileChanges` with `[]` | TESTING.md Rule 9 | Failed on base too: the catch-all `{}` made Apollo log missing-field errors |
| Docs (user-directed) | `TESTING.md` | Rewritten as the global testing strategy (1,102 → 169 lines) with an update policy; suite detail lives in test files; 7 inbound links repointed; 2 suite commands moved into their test headers | User direction 2026-10-11 | Separate `docs(testing):` commit |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts prebuild && build` | repo root | Current dist | Pass | `api-e2e-evidence/server-build.log` |
| 2 | Server: `vitest run tests/unit/projects tests/unit/api/graphql`; `typecheck` | `autobyteus-server-ts` | Server read and transport | Pass (38 files / 255 tests; clean) | `api-e2e-evidence/repo/` |
| 3 | Web: full `test:nuxt --run` | `autobyteus-web` | Client units | Pass (602 files / 4178 tests; 2 / 5 skipped pre-existing) | same |
| 4 | Guards: `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `autobyteus-web` | Strings / boundaries | Pass | same |
| 5 | Fixture probes (8), then base comparison, then fixes | repo root | C-002 | See report (branch-caused failures fixed; 3 base failures reported) | `fixture-probes*/` |
| 6 | `test:e2e:project-manager-ux` PMU-001..PMU-025 | repo root | New journeys + regression | Pass 25 / 25 | `pmu-full/` |
| 7 | `test:e2e:task-closure-tree` BR-001..006, 008, 009, 012, 013 | repo root | BEH-006 leave motion, rows returning | Pass 10 / 10 | `task-closure-tree/` |
| 8 | Isolated desktop instance smoke | repo root | Packaged renderer | Pass | `desktop/` |

## Test-Case Ledger Decision

- Ledger required: `Yes` — many independent cases, long runs (PMU full run ~30+ min), interruption risk.
- Canonical ledger path: `api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

After repository checks only (before browser and desktop runs):

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | Unit / component tests for every REQ | Journeys only in mounted components | Browser on a real stack |
| Changed-boundary execution directness | 75% | Real service + stores in server unit tests | GraphQL transport mocked; tree ↔ shell ↔ Projects never mounted together | Live API + browser |
| Cross-boundary integration realism and mock gap | 70% | — | Apollo, feed and route mocked in web specs | Real backend and feed |
| Environment, configuration, identity, and fixture fidelity | 80% | Real stores on disk (server) | Assignments not produced by real tools | Real `delegate_task` |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | Invalidation, epochs, expiry in units | Reconnect, close race, Project delete never end to end | Browser with feed control |
| User-surface, browser, and desktop-shell confidence | 60% | Implementer's self-check (not durable) | No durable browser proof; packaged renderer unchecked | PMU cases + desktop smoke |
| Durable regression coverage quality and relevance | 80% | Good unit coverage | No durable journey coverage; fixture pages stale (C-002) | PMU-020..025, fixture fixes |

- Overall post-repository confidence: 74% (simple average). Below the gate: broader validation `Required`.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Browser` (durable probe on a real built backend), then `Project Desktop Validation` (isolated instance smoke)
- Specific confidence gap: cross-surface journeys, live feed, route change (REQ-012), real tool-produced assignments; packaged CSS / bundling
- Why the selected mode can materially improve confidence: it is the only surface where the tree, the shell and the Projects tab are mounted together against the real server and feed
- Expected confidence after the selected validation: ≥ 95 %
- Browser-specific decision: required (UI journeys, WebSockets, layout variants)

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron
- Testing guideline used: `TESTING.md`, `docs/isolated-app-instances.md`
- Web-equivalent behavior: everything in this change
- Shell-specific or lifecycle behavior: none changed
- Chosen approach: browser probe for the journeys; isolated desktop instance smoke for the packaged renderer
- Effect on any already-running desktop application: none (own instance, own ports and data)
- Behavior not directly proven: see report

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| AC-011 Done Temp task past ten via a real click | The current Task of a shown copy is open; a Done Temp Task past ten is only reachable in the closed-just-before race with ten more Done Temp tasks; the board step is the same code as the Cancelled path proven in the browser | Low | Component test `ProjectsPanelTaskLocate.spec.ts` (Show all) |
| Org-run hosts | Out of scope (DEC-001 b) | — | — |

## Ambiguities Or Reroute Triggers

None at investigation time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added PMU-020..PMU-025; updated 5 fixture pages, probe registration, TESTING.md)
- Post-repository confidence: 74%; final: 95% (see report)
- Broader validation decision: `Required`
- Reroute Required Before Validation Execution: `No`
