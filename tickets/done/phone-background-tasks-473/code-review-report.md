# Code Review Report — phone-background-tasks-473 (autobyteus-473): background tasks on the phone; a late viewer sees current tasks

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-001; approved by the Solution Designer within the Task's direction)
- Design Spec Reviewed As Context: `design-spec.md` (SR-002)
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-001, Pass; R-1, R-2 adopted)
- Relevant Solution / Architecture Review Revision IDs: SR-002 / ARCH-REV-001
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001; 6 assumptions)
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Trigger: implementation engineer; code under test `f33b3c772a` (handoff `66f87db2b5`, `9b921e9489`); base `origin/personal` @ `931a1feeb6`
- Skill basis: design principles as updated on 2026-11-11/12 (The Approach: spine first, practices in context; Principle 13's empty indirection check; Principle 16).

## Routing Classification Review

- `Medium` / `High` confirmed: a shared runtime contract (`AgentBackgroundTaskInspection`) and the GraphQL view change across three runtimes. Route: `Implementation Review`.

## Review Scope

- Server: `domain/agent-background-task-view.ts`, `domain/agent-run.ts`, the three backends (`claude-agent-run-backend.ts` + `claude-session.ts` + `claude-background-task-registry.ts`, `agy-agent-run-backend.ts` + `agy-background-task-monitor.ts`, `autobyteus-agent-run-backend.ts`), `api/graphql/types/agent-background-task-view.ts`.
- Web: `graphql/queries/agentBackgroundTaskQueries.ts`, `generated/graphql.ts` (codegen check), `stores/agentBackgroundTaskStore.ts`, `composables/useBackgroundTaskPanelView.ts`, `components/mobile/views/MobileActivity.vue`, `MobileBackgroundTasks.vue`, docs.
- Read for context: `domain/agent-background-task.ts`. Tests read by case list.
- Exclusions: probe internals (`mobile-background-tasks-cases.mjs`, reviewed after API/E2E). No recorded check was rerun; none of the code it covers changed after it ran (f33b3c772a only changes the phone's time formatting, rerun as IMP-05b, IMP-07b and IMP-12).

## Upstream Behavior And Production-Path Basis Confirmation

- Behavior-basis status: `Confirmed`.

| Behavior | Status | Implementation path |
| --- | --- | --- |
| BEH-002 / DS-002 (REQ-003, AC-003/004) | Confirmed | `AgentRun.inspectBackgroundTasks` returns `{ kind: 'event-stream', agentRunId, tasks: inspection.current() }`. Claude: `session.listBackgroundTasks()` → `registry.list()` (running and ended). Antigravity: `monitor.list()` (running only, RSK-001). AutoByteus: `backgroundProcesses?.list() ?? []` mapped by `toAgentBackgroundTask` (R-2: no manager yet means no tasks yet). GraphQL `AgentBackgroundTaskEventStream.tasks: [AgentBackgroundTask]`, with enums from the domain constants. The web composable seeds the store on the event-stream answer, and stream events upsert as before. |
| R-1 merge rule | Confirmed | `seedTasks`: insert an unknown task; take the answer when the stored task is running and the answer shows it ended; never replace an ended task. A status only moves running → end, so an older answer cannot undo a newer event. |
| BEH-001 / DS-001 (REQ-001/002/004, AC-001/002) | Confirmed | `MobileActivity` → `useBackgroundTaskPanelView(runId, expanded = true)` → rows (the store's `getTasks`, newest first by `startedAt`, live) → `MobileBackgroundTasks` (presentational: title, command when different, status, end summary or exit code, start time). The section is hidden when there are no rows; an unsupported runtime has none (REQ-004). |
| Preserved (AC-005) | Confirmed | The Codex snapshot path, its 2 s polling and the desktop panel are unchanged. The phone also shows snapshot rows (assumption 4, REQ-002 "same data"). |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario | Related | Kind | Actor | Goal | Entry | Path | Outcome | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RS-01 | REQ-001/003, AC-001 | User | Owner on the phone | See a task started before Activity opened | Activity | DS-002 seed → DS-001 | Listed running, then ended live | Supported Normal | Use |
| RS-02 | REQ-001, AC-002 | User | Owner | See a task started while Activity is open | Activity | Stream event → store | Appears live | Supported Normal | Use |
| RS-03 | REQ-002/003, AC-003 | User | Owner on the desktop | See running tasks after a reload | Progress panel | DS-002 | Listed | Supported Normal | Use |
| RS-04 | REQ-004 | User | Owner of an ACP run | — | Activity | `unsupported` | No section | Supported Explicit Edge | Use |

### Candidate Finding And Mechanism Gate

| Candidate | Observation | Scenario / Contract | Trigger | Consequence | Evidence | Disposition | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Assumption 3: `MobileActivity` calls the shared composable and passes rows down, instead of `MobileBackgroundTasks(runId)` reading them (DS-001) | DS-001 ownership | — | None: one data path (the shared composable); the screen owns both lists it needs for its empty state | `MobileActivity.vue` | Reject (deviation recorded, reason holds) | The reason is concrete (the "No activity yet" state needs both lists) and the deviation causes none of the problems the ownership practice prevents. |
| C-02 | `ClaudeSession.listBackgroundTasks()` only forwards to `registry.list()` | Principle 13 empty indirection | — | — | `claude-session.ts` | Reject | It is a method on the existing session boundary the backend already uses (like `hasRunningBackgroundTasks`), not a new interface, port or wrapper type. Reaching the registry from the backend would bypass that boundary (Principle 3). |
| C-03 | Antigravity: a running task whose end event the phone missed (a network drop) can stay "running" until reload. `seedTasks` never removes, and the monitor drops ended tasks. | RSK-001 (design-accepted) | Phone offline across the end of an AGY task | A stale "Running" row until the page reloads | `agy-background-task-monitor.ts` `list()`; `seedTasks` | Reject (accepted risk) | RSK-001 records that Antigravity keeps no ended tasks; removing tasks the answer omits would be new behavior for every runtime. Noted under Residual Risks. |
| C-04 | The GraphQL alias `currentTasks: tasks` on one client query (assumption 1) | — | — | — | Query; codegen check IMP-08 | Reject | Required by GraphQL's field-merging rule for union members with different `tasks` row types; the server field keeps the design's name. |
| C-05 | The resolver keeps `AgentRunManager.getInstance()` | Principle 16 | — | — | Unchanged code | Reject | Not added by this change (design § Structural Triggers); no missing-owner fallback is introduced. |

## Structural / Design Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Design health preserved | Pass | Missing invariant fixed on the shared contract, not special-cased in the resolver |
| Matches behavior-defining artifacts | Pass | REQ-001…004; R-1, R-2 adopted |
| Spine clarity | Pass | DS-001 and DS-002 in call order |
| Ownership / boundaries | Pass — deviation recorded, reason holds | Assumption 3 (C-01); each backend owns its tracker; the store stays the only client home of tasks |
| Off-spine concerns | Pass | Seeding merge rule in the store; formatting in the presentational component |
| Capability reuse | Pass | Shared composable, store and GraphQL view reused; no phone-only path |
| Shared-structure tightness | Pass | The GraphQL `AgentBackgroundTask` mirrors the domain type field for field; enums come from the domain constants |
| Repeated coordination / empty indirection (Principle 13) | Pass | No new interface, port or wrapper; C-02 |
| Visible dependencies (Principle 16) | Pass | Each `current()` closes over its backend's own tracker; no lookup added |
| Dependency direction | Pass | Backends do not import GraphQL; phone → composable → store |
| Naming / vocabulary | Pass | "Background task" unchanged; `current()` and `seedTasks` say what they do |
| Dead code / legacy | Pass | None added; nothing obsolete |
| Tests requirement-aligned | Pass | Per-runtime `list()`/`current()` unit tests; `AgentRun` and GraphQL tests; BGT-01 e2e on a native run; store seed rules; Activity spec for AC-001/002/REQ-004/snapshot rows; MSP-44…46; mutation check (no seeding → late-viewer cases fail) |
| API/E2E readiness | Pass | The Android app, Electron with real runtimes and the reconnect repair are named for API/E2E |

## Source File Size And Structure Audit

All changed source files are small; the largest new file is `MobileBackgroundTasks.vue` at 77 lines. No `>220` delta. `Pass`.

## Legacy / Backward-Compatibility Verdict

`Pass`. Persisted data: `Not Affected` (in memory). No compatibility path. An older web page reading the new GraphQL field is not a case here, because the page and the node ship together.

## Docs-Impact Verdict

`Yes`, done: `agent_execution.md`, `agent_execution_architecture.md`, `remote_access.md`.

## Review Scorecard (Mandatory)

- Overall: `9.5/10`

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Late-viewer seed and live stream are one clear path | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Trackers stay in their backends; the deviation is recorded and holds | — | — |
| 3 | API / Interface Clarity | 9.5 | One method on the shared contract; one GraphQL field | Client alias (required) | — |
| 4 | Separation of Concerns and File Placement | 9.5 | Presentational phone component; screen owns the read | — | — |
| 5 | Shared-Structure Tightness | 9.5 | GraphQL type mirrors the domain type | — | — |
| 6 | Naming Quality | 9.5 | — | — | — |
| 7 | API/E2E Readiness | 9.3 | Strong unit/e2e/probe coverage, mutation-checked | Real runtimes on Android and Electron pending | API/E2E |
| 8 | Runtime Correctness | 9.4 | The merge rule cannot regress a newer event; R-2 handles the not-yet-created manager | AGY stale-running row after a missed end (C-03, accepted) | — |
| 9 | No Legacy Retention | 9.6 | — | — | — |
| 10 | Cleanup Completeness | 9.5 | Docs updated | — | — |

## Findings

None.

## Follow-ups

- Added: None.

## Classification / Recommended Recipient

- Pass → API/E2E engineer; informational notice to the implementation engineer.

## Residual Risks

- RSK-001 / C-03: Antigravity lists running tasks only. A late viewer does not see earlier ended ones, and a running row whose end event was missed stays until reload.
- Real runtimes on the Android app and Electron (a Claude login, or a native `run_bash` background command) and the reconnect repair (`online` re-read) are not yet exercised outside the scripted AGY probe and the BGT-01 native e2e.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.5/10, every category ≥ 9.3
- Recommended Recipient: API/E2E engineer
- Notes: assumptions 1–6 accepted; assumption 3 judged as a recorded deviation whose reason holds.
