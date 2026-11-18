# Implementation Handoff — phone-background-tasks-473 (autobyteus-473)

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-background-tasks-473`, branch `codex/phone-background-tasks-473`, base `origin/personal` @ `931a1feeb6`. Finalization target `origin/personal`. Release only on the user's word.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Medium / High); ARCH-REV-001 `Pass` (SR-002).
- Requirements doc: `requirements-doc.md` (REQ-001…REQ-004, AC-001…AC-005)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec: `design-spec.md` (SR-002, Ready)
- Supplemental task artifacts: none
- Design review report: `design-review-report.md` (ARCH-REV-001, Pass; recommendations R-1 and R-2, both adopted)
- Architecture review revision record: `architecture-review-revision-record.md`
- Triggering rework report: N/A (initial)

## Current Implementation Summary

An event-stream run (Claude, AutoByteus, Antigravity) now answers the background-task view with the tasks its runtime knows now, and the shared client composable seeds the store from that answer. A viewer that opens a run, or reloads, after a task started therefore sees it. The phone's Activity lists the open agent's background tasks above its tool calls, from the same data as the desktop panel.

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-002`
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review / API-E2E / delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`
- Commits (on `931a1feeb6`):
  - `db27bb8fd5`: the received package.
  - `46b128a7db`: server.
  - `e3332d8230`: web.
  - `12a1e44b7f`: docs.
  - `b9a4e05483` and `2d01ca639d`: probe cases MSP-44…46.
  - `f33b3c772a`: the locale of the phone's start time.
  - Code under test: `f33b3c772a`. The handoff and evidence are in the docs commit after it.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`. The change touches a shared runtime contract (`AgentBackgroundTaskInspection`) and the GraphQL view across three runtimes. The escalation trigger did not fire: every runtime already held its current tasks (Claude registry view, Antigravity monitor, AutoByteus manager), so no new tracking was needed.
- Selected route: `Code Review`
- Lightweight self-review for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior | Approved change / preserved outcome | Implemented production path / key files | Result / notes |
| --- | --- | --- | --- |
| BEH-002 / REQ-003, AC-004 (DS-002) | A late viewer sees a run's current tasks (Claude, AutoByteus, Antigravity) | `useBackgroundTaskPanelView.refresh` → GraphQL `agentBackgroundTaskView` → `AgentRun.inspectBackgroundTasks` → `inspection.current()`:<br>• Claude: `ClaudeSession.listBackgroundTasks()` → `ClaudeBackgroundTaskRegistry.list()` (running and ended until the process ends)<br>• Antigravity: `AgyBackgroundTaskMonitor.list()` (running only, RSK-001)<br>• AutoByteus: `BackgroundProcessManager.list()` with `toAgentBackgroundTask`, `[]` without a manager (R-2)<br>→ `AgentBackgroundTaskEventStream.tasks` → the composable maps the tasks → `agentBackgroundTaskStore.seedTasks` | Unit tests: the registry and monitor `list()`, AutoByteus `current()` (running, ended, no manager), `AgentRun`, GraphQL serialization. E2E: BGT-01, a native run's view, lists the task running, then completed with `exit code 0` (IMP-04). Phone: MSP-44. Desktop reload: MSP-46 |
| R-1 (seeding rule) | An older answer never undoes a newer event; an answer repairs an end the client missed | `seedTasks`:<br>• it adds an unknown task;<br>• it takes the answer's task when the stored one is `running` and the answer's has ended;<br>• it never replaces an ended stored task.<br>The composable's existing `online` re-read re-seeds | `agentBackgroundTaskStore.spec.ts` (2 cases), `BackgroundTaskPanel.inspection.spec.ts` (R-1 case) |
| BEH-001 / REQ-001, REQ-002, AC-001, AC-002 (DS-001) | Phone Activity: "Background tasks" above the tool calls, live, read-only, the desktop panel's data | `MobileActivity` → `useBackgroundTaskPanelView(runId, expanded = true)` → rows → `MobileBackgroundTasks` (newest first: description or command, status chip, how it ended, "Started …") | `MobileActivity.backgroundTasks.spec.ts` (4). Probe:<br>• MSP-44: a task started before Activity opened shows Running, then Failed with "Command exited with code 1".<br>• MSP-45: a task started while open appears live, then Completed |
| REQ-004 | No section for a runtime that does not report background tasks | The section renders only when there are rows; an `unsupported` answer gives none | Spec (unsupported, and event-stream with no tasks) |
| AC-003 | Desktop: after a reload, the panel lists the running task | The same composable and store (seeding) | MSP-46: after `reload`, the expanded Background Tasks section lists `sleep 60 …` as Running |
| AC-005 preserved | Codex snapshot view, desktop panel, tool calls unchanged | The snapshot path is untouched; the panel and tool-call list are unchanged | Full web suite (IMP-06), server unit suite (IMP-03), panel specs |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. The run status reading "Idle" while a task runs is DEC-002's own Task and visible in `IMP-11-MSP-46-desktop-after-reload.png`; it is not changed here.

## Key Files Or Areas

- Server (`autobyteus-server-ts/src/`):
  - `agent-execution/domain/agent-background-task-view.ts` (the `current()` and `tasks` contract);
  - `agent-execution/domain/agent-run.ts`;
  - `agent-execution/backends/claude/session/{claude-background-task-registry,claude-session}.ts`, `claude/backend/claude-agent-run-backend.ts`;
  - `agent-execution/backends/antigravity/stream/agy-background-task-monitor.ts`, `antigravity/backend/agy-agent-run-backend.ts`;
  - `agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts`;
  - `api/graphql/types/agent-background-task-view.ts`.
  - Tests: `tests/unit/agent-execution/agent-run.test.ts`, `tests/unit/api/graphql/agent-background-task-view.test.ts`, the Claude registry, Antigravity monitor and AutoByteus background-task unit tests, and `tests/e2e/runtime/autobyteus-background-task-transport.e2e.test.ts` (BGT-01).
- Web (`autobyteus-web/`):
  - `graphql/queries/agentBackgroundTaskQueries.ts`, `generated/graphql.ts`;
  - `stores/agentBackgroundTaskStore.ts`, `composables/useBackgroundTaskPanelView.ts`;
  - `components/mobile/views/MobileBackgroundTasks.vue` (new), `components/mobile/views/MobileActivity.vue`.
  - Specs: `components/mobile/views/__tests__/MobileActivity.backgroundTasks.spec.ts` (new), `stores/__tests__/agentBackgroundTaskStore.spec.ts`, `components/progress/__tests__/BackgroundTaskPanel.inspection.spec.ts`.
  - Probe: `tests/e2e/mobile-background-tasks-cases.mjs` (new), wired in `tests/e2e/mobile-shell-probe.mjs`.
- Docs: `autobyteus-server-ts/docs/modules/agent_execution.md`, `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/remote_access.md`.

## Important Assumptions

1. The client query aliases the event-stream tasks: `currentTasks: tasks`. Both union members have a field named `tasks` with different row types (`AgentBackgroundTaskViewRow` and `AgentBackgroundTask`), and GraphQL refuses to select both unaliased in one query ("Fields "tasks" conflict…"). The server field keeps the design's name `tasks`; only the one client query aliases it.
2. GraphQL `AgentBackgroundTask.kind` and `.status` are enums (`AgentBackgroundTaskKind`, `AgentBackgroundTaskStatus`) built from the domain constants, so the wire contract matches the domain vocabulary.
3. `MobileActivity` reads the rows through the shared composable and passes them to `MobileBackgroundTasks`, which only presents them. The design's DS-001 shows `MobileBackgroundTasks(runId) → useBackgroundTaskPanelView`. The screen needs both lists for its "No activity yet" state, so it owns the read. The data path is still the shared composable, so there is no phone-only path.
4. The phone also shows a snapshot runtime's rows (Codex), with "exit code N", because they are the desktop panel's data (REQ-002). Rows with `unknown` status show "Unknown".
5. Phone texts are English literals, as in the other phone views. The start time uses the app's locale (`useLocalization().resolvedLocale`, required by the localization guard).
6. The AutoByteus `current()` lists every task the manager knows, running and ended, as the Claude view does. Antigravity keeps no ended ones (RSK-001).

## Known Risks

- RSK-001: a late viewer of an Antigravity run sees its running tasks, not ones that already ended.
- An answer and a stream event can cross. The seeding rule keeps the newer state, because status only moves from running to an end, and covers both orders.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Feature` (+ missing invariant)
- Reviewed root-cause classification: `Missing Invariant`
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: one method on the shared contract, implemented by each runtime's existing tracker; no per-runtime branch in the resolver; no new process-wide lookup.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes` (none found)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`. The event-stream variant gains one method and its view one field. No new wrapper or port: each backend's `current` closes over its own tracker.
- Canonical shared design guidance reapplied: `Yes`
- Deviations from a design principle decided during implementation, each with the principle and why the reason holds for this case: `None`. The ownership change in assumption 3 follows the design's intent, with the screen owning its own state.
- Changed source files stayed within the size guardrails: `Yes`. `MobileBackgroundTasks.vue` (new) 77 lines, `MobileActivity.vue` 36; the server changes are a few lines per file.
- Notes: none.

## Persisted Data Transition Check

- Approved decision: `Not Affected`; everything is held in memory.

## Environment Or Dependency Notes

- Fresh worktree: `pnpm install --frozen-lockfile`, `nuxt prepare`. The server typecheck builds the shared packages first.
- GraphQL types were regenerated with `pnpm -C autobyteus-web codegen:local` (from the built server schema), and `codegen:check` passes (IMP-08).

## Checks Run

Evidence: `tickets/in-progress/phone-background-tasks-473/evidence/implementation/`. Each log has a header (command, commit, environment, date, ID). Environment: macOS 26.5.2, node v22.23.1, pnpm 10.28.2.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `2d01ca639d` | shell | server src and tests | all | Pass | `IMP-01-server-typecheck.log` | `production errors: 0; test-file errors: 1180 in 364 files (baseline 1180 in 364 files)` |
| IMP-02 | the five 473 server unit test files | `2d01ca639d` | shell | registry, monitor, AutoByteus backend, AgentRun, GraphQL view | AC-004 | Pass | `IMP-02-server-unit-473.log` | `Tests  114 passed (114)` |
| IMP-03 | `pnpm -C autobyteus-server-ts test:unit` | `2d01ca639d` | shell | all server unit tests | AC-005 | Pass | `IMP-03-server-unit-all-excerpt.log` | `Tests  8419 passed \| 9 skipped (8428)` |
| IMP-04 | `RUN_NATIVE_BACKGROUND_TASK_E2E=1 vitest run …autobyteus-background-task-transport.e2e.test.ts -t BGT-01` | `2d01ca639d` | clean env; in-process server; scripted model; real processes | the view through GraphQL on a native run | AC-004 | Pass | `IMP-04-server-e2e-bgt01.log` | `Tests  1 passed \| 8 skipped (9)`: the view lists the task `running`, then `completed` / `exit code 0` |
| IMP-05b | `pnpm -C autobyteus-web typecheck` | `f33b3c772a` | shell | web | all | Pass | `IMP-05b-web-typecheck.log` (IMP-05 on `2d01ca639d`, also pass) | `test-file errors: 93 in 40 files (baseline 93 in 40 files)`, `PASS` |
| IMP-06 | full web suite | `2d01ca639d` (`f33b3c772a` changes only the phone component's locale; IMP-12 reruns its specs) | shell | every web spec | AC-001…AC-005 | Pass | `IMP-06-web-nuxt-tests-excerpt.log` | `Test Files  758 passed (758)`, `Tests  5717 passed \| 2 skipped (5719)` |
| IMP-07b | web guards and localization audit | `f33b3c772a` | shell | boundaries, locales | — | Pass (IMP-07a on `2d01ca639d` failed: the start time was formatted with the OS locale; fixed) | `IMP-07b-web-guards.log`, `IMP-07a-web-guards.log` | `[guard:localization-boundary] Passed.`, `Passed with zero unresolved findings.` |
| IMP-08 | `pnpm -C autobyteus-web codegen:check` | `2d01ca639d` | shell | generated types against the built server schema | — | Pass | `IMP-08-web-codegen-check.log` | `autobyteus-web/generated/graphql.ts is current.` |
| IMP-09 / IMP-10 | server build, `build:mobile-web` | `b9a4e05483` (no product change after it until `f33b3c772a`) | shell | the probe's node and phone bundle | — | Pass | `IMP-09-server-build.log`, `IMP-10-mobile-web-build.log` | `Mobile web assets written to` |
| IMP-11 | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-44,MSP-45,MSP-46` | `2d01ca639d` (bundle from `b9a4e05483`) | clean env; test-owned nodes; scripted AGY CLI (`BACKGROUND_STEP`); headless Chrome phone 390×844 and a `nuxt dev` desktop window | phone Activity section, live updates, desktop reload | AC-001, AC-002, AC-003 | Pass (IMP-11a: probe bug, `waitFor` returns nothing; fixed in `2d01ca639d`) | `IMP-11-mobile-shell-probe.log`, `IMP-11-mobile-shell-probe-cases.json`, `IMP-11-MSP-44-activity-running.png`, `IMP-11-MSP-44-activity-failed.png`, `IMP-11-MSP-45-activity-live.png`, `IMP-11-MSP-46-desktop-after-reload.png` | `mobile-shell probe: Pass`, `"unknownBrowserErrors": 0`:<br>• MSP-44: `listed` `[running]`, then `ended` `[failed … Command exited with code 1]`<br>• MSP-45: `live` running first<br>• MSP-46: `afterReload` `[running sleep 60 …]` |
| IMP-12 | the four 473 web spec files | `f33b3c772a` | shell | phone Activity, store, panel | AC-001…AC-004 | Pass | `IMP-12-web-473-specs.log` | `Tests  35 passed (35)` |

Mutation check (observed): with the composable's seeding taken out, the late-viewer cases fail: 3 of 14, namely the phone AC-001 case, the panel late-viewer case and the R-1 case.

- Not run, and why:
  - AC-001 in the Android app on a device or emulator, and with a test-owned Claude login: left to API/E2E. The phone probe runs the production phone bundle in Chrome on a scripted Antigravity runtime. The node's answer for Claude is unit-tested (registry `list()`), and AutoByteus runs end to end in BGT-01.
  - The phone probe was not rerun after `f33b3c772a`, which only passes the app's locale to the start-time format; its spec ran (IMP-12).

## Frontend Rendered-Result Check

- Affected surfaces / journeys: the phone's Activity screen (Background tasks section above the tool calls); the desktop Background Tasks section after a reload.
- References: REQ-001…REQ-004; DS-001, DS-002.
- Design system and adjacent surfaces reviewed: the phone's Activity rows (`MobileRunActivityItem`: title, status chip, detail line); the desktop `BackgroundTaskPanel` (status colours, description or command rule).
- Surface used: TESTING.md's phone shell probe (production phone bundle served by a test-owned node; headless Chrome phone) and its `nuxt dev` desktop window.
- States inspected (screenshots looked at):
  - **Phone, running:** a task started before Activity opened shows as Running, with "Started 05:08 AM".
  - **Phone, ended:** the task shows Failed with "Command exited with code 1".
  - **Phone, live:** two tasks, newest first ("1 running"), above the tool calls.
  - **Desktop, after a reload:** the Background Tasks section lists the running task ("1 running · 1 total").
- Visual or interaction issues found and corrected: the localization guard caught the start time's OS-locale format; it now uses the app's locale.
- Remaining unverified: the Android app's WebView rendering on a device; very long descriptions (the row clamps them to 2 lines).

## Downstream Coverage Hints / Suggested Scenarios

1. AC-001 in the Android app: a Claude run (test-owned login) or a native AutoByteus run with a `run_bash` background command. Start it, then open the phone's Activity: it is listed as running; when it ends, it shows Failed or Completed with its exit code.
2. AC-002 live on the device: start another task with Activity open.
3. AC-003 in Electron: reload the window while a Claude task runs; the panel lists it.
4. R-1: drop the phone's network while a task ends, then reconnect. The `online` re-read shows the end (Claude, AutoByteus; Antigravity is RSK-001).
5. REQ-004: an ACP runtime's Activity shows no section.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-001…AC-003 on the Android app and in Electron with real runtimes (scenarios 1–3), the reconnect repair (4), and the independent validation the API/E2E role owns.
