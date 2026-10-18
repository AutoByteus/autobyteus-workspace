# API/E2E Coverage Investigation — task-keys-declutter

(`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-declutter/tickets/in-progress/task-keys-declutter`)

## Investigation Meta

- Requirements Doc: `…/requirements-doc.md` (Approved, SR-001)
- Investigation Notes: `…/investigation-notes.md`
- Solution Revision Record: `…/solution-revision-record.md`
- Design Spec: `…/design-spec.md`
- Supplemental Task Artifacts: the user's screenshot (path in the requirements); predecessor `ui-ux-spec.md` (superseded for the card key line and tree key)
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `…/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `…/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- API/E2E Revision Record: `…/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `…/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: IR-001 from `/software_engineering_team/implementation_engineer` (direct route)
- Prior Investigation Reviewed: none
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

- Board cards on the Projects page and in the right-panel tab show no Task key line (REQ-001). The badge "Blocked by <key>" / "Dependency cancelled: <key>" and its tooltip stay.
- The Workspaces-tree Task summary is back to summary only, with tooltip / name "Show Task in Projects: <summary>" (REQ-002).
- Every other key surface is unchanged (REQ-003): the Task page and tab chip, the dependency rows, the badge, the picker, tools and URLs.
- `TaskWorkerTaskView.taskKey` is removed end to end (REQ-004).
- No persisted data is affected.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (scan the board, page and tab), SCN-002 (tree with delegated copies of a Project Task and of a Temp task), SCN-003 (refer to and follow a Task by key).
- Added from the implementation: SCN-A1. An old renderer, or any client still asking for `taskWorkerTasks { task { taskKey } }`, now gets a schema error. The only client is this web app, which ships with the server (requirements "External Contracts"), so this is checked as a contract fact, not as a supported scenario.
- Unsupported / contrived: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 card key line | Removed | REQ-001, AC-001 | Web unit, PT-E2E-017, desktop page + tab |
| BEH-002 tree key | Removed | REQ-002, AC-002 | Web unit, PMU-020/025, desktop tree (Project + Temp copies) |
| BEH-003 other key surfaces | Preserved | REQ-003, AC-003 | Existing specs and PT-E2E-017; desktop Task page and tab Task view |
| BEH-004 worker `taskKey` | Removed (API) | REQ-004, AC-004 | Server unit schema test; live GraphQL check on a built server; the tree still locates |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes (trivial) | `currentTasksOfTaskWorkers` view shape | Server unit | — | — |
| API / transport / contract | Yes | GraphQL `TaskWorkerTaskView` | Schema unit test | Live server answer | GraphQL against the built server |
| Frontend component / state | Yes | `ProjectTaskRow`, `TaskWorkerTaskSummary`, store, query | Web unit | Rendering against a real backend | Browser probes |
| Browser integration / user journey | Yes | Board, tab, tree | Probes (implementation ran them) | Re-execution | Browser probes |
| Desktop renderer / web-equivalent UI | Yes | Same renderer, packaged | None | AC-005 asks for desktop screenshots | Isolated desktop instance |
| Desktop shell, lifecycle, persistence, workers, auth, external | No | — | — | — | — |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-declutter`, branch `codex/task-keys-declutter`, base `origin/personal@aa84fd026c`, uncommitted.
- Testing guideline: `TESTING.md` at the worktree root. Rules apply, including Rule 9 (every failure needs a cause) and "Rerun by impact".
- Instructions used: `docs/isolated-app-instances.md`; the probe headers; the round-1/2 desktop scripts of `task-keys-and-dependencies` (ticket-owned temporary automation via `playwright-core` `connectOverCDP`, since the browser-automation CLI is not installed here).
- Secrets: N/A. No real-provider run is needed: the change is display-only. Per the user's standing instruction, any real-model run would use only the Claude Agent SDK with Claude Haiku 5.5.
- Components:
  - server build and packaged app (`pnpm -C autobyteus-server-ts prebuild`, `pnpm -C autobyteus-web build:electron:mac`);
  - probes (own stacks);
  - isolated instance (`pnpm --silent isolated-app start --from-worktree --data-root <owned>`; stop own instance only).
- Data: a fresh owned data root, filled through the public GraphQL and the scripted AGY CLI (`ANTIGRAVITY_CLI_COMMAND` in the owned root's `server-data/.env`). No production data.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Action |
| --- | --- | --- | --- | --- |
| web `TaskKeysAndDependencies.spec.ts` (updated) | Card has no key line; badge keeps its key | AC-001, AC-003 | Still Valid | Rerun |
| web `TaskWorkerTaskSummaryRow.spec.ts`, `…Hosts.spec.ts`, `taskWorkerTaskStore.spec.ts` (updated) | Summary only; en / zh-CN title without key; store without key | AC-002, AC-004 | Still Valid | Rerun |
| server `project-tasks-schema.test.ts`, `task-worker-current-tasks.test.ts`, `project-task-keys-and-dependencies.test.ts` (updated) | `TaskWorkerTaskView` fields exactly `description, projectId, status, taskId` | AC-004 | Still Valid | Rerun |
| `projects-feature-probe.mjs` PT-E2E-017 (updated) | No key line on cards; badge-only key on long keys | AC-001, AC-003 | Still Valid | Rerun |
| `project-manager-ux-task-locator-cases.mjs` PMU-020/025 (updated) | Tree summaries without key; title / name without key | AC-002 | Still Valid | Rerun (full PM-UX probe) |
| `tests/e2e/fixtures/task-worker-boundaries.mjs` | Fixture GraphQL answers for fixture-page probes | — | Still Valid; extra fields are ignored by clients | No change |
| Server E2E (`tests/e2e/projects`) | No assertion reads the worker `taskKey` (grep) | — | Out Of Scope | Not rerun: server change is limited to the view shape, covered by the schema unit test and a live GraphQL check |

## Durable Coverage To Add / Update / Remove

None beyond the implementation's updates (above).

## Repository Coverage Execution Plan

| Order | Command | Boundary |
| --- | --- | --- |
| 1 | server prebuild + packaged app build | current build |
| 2 | server typecheck; `vitest run tests/unit/projects tests/unit/api/graphql` | server change |
| 3 | `pnpm -C autobyteus-web test:nuxt --run`; guards | web change |
| 4 | `test:e2e:projects` (PT-E2E-001..017) | board, Task page, keys |
| 5 | `project-manager-ux-probe.mjs` (all) | tree, tab |
| 6 | Live GraphQL on the built server: `taskWorkerTasks` without `taskKey`; a query with `taskKey` is a schema error | AC-004 |
| 7 | Isolated desktop instance (DSK-D1..D4) | AC-005 |

## Test-Case Ledger Decision

- Ledger required: `Yes` (several independent cases and a desktop session). Path: `…/api-e2e-test-case-ledger.md`.

## Broader Validation Decision

- Decision: `Required` — AC-005 names an isolated desktop instance; the renderer change is visual.
- Mode: Browser probes (durable) + Project Desktop Validation (temporary, ticket-owned script).
- Desktop: web-equivalent renderer behavior only; no shell code changed. The user's running app is not affected.

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| Beta release and the user's check | Delivery's Done-when | — | Yes (the user's look at the beta) | Delivery |

## Investigation Decision

- Proceed to execution: `Yes`; durable coverage changes by API/E2E: `No`; reroute: `No`.

## Post-Repository Confidence Scorecard

Repository layers only (unit, server typecheck), before probes and desktop. Category scores are in the execution report's scorecard (post-repository column).
- Overall post-repository confidence: 90.3%. Lowest: user surface at 85% (rendering only in unit mounts).
- Broader validation: `Required` (AC-005) and executed. Final confidence 97.2%.
