# API/E2E Coverage Investigation — `task-closed-status`

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/requirements-doc.md` (Approved, SR-003 basis)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/design-spec.md` (Ready, SR-004)
- Supplemental Task Artifacts: None
- Design Review Report: `N/A — not applicable` (Medium/Low direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/implementation-revision-record.md` (IR-001)
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: direct-route handoff from Implementation Engineer (IR-001, commit `17e4299a6`)
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

A fourth Task status `CLOSED` ("dropped as not needed, not completed") is set and cleared only by agents through `create_or_update_task`. It is terminal like DONE (one `isTerminalTaskStatus` predicate): it closes and stops the Task's workers through the unchanged `closeAndWrite`, refuses `delegate_task {task_id}` and run-ID reactivation with a message naming the status, and after a reopen the assigner-only reactivation works as after DONE. `list_project_tasks` filters CLOSED; the GraphQL enum, tool enums/descriptions, LLM contract texts and the `/ws/projects` strict schema carry CLOSED; open count = TODO + IN_PROGRESS. Web boards hide Closed by default behind a "Closed (N)" toggle (absent at 0, `aria-pressed`) that reveals a full-width Closed lane; Task/Temp/right-panel pages show a muted "Closed" pill; Temp tasks: Closed is neither Open nor Done and is excluded from the header count. Persisted data: `Directly Usable — No Migration`; the released projects-per-folder-v1 migration reads tasks via a frozen 3-status reader.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-002 (agent closes), SCN-003 (agent reopens), SCN-004 (list CLOSED), SCN-005 (user sees board/Task page/right panel), SCN-006 (user sees Temp Closed).
- Real-use scenarios added from the implementation:
  - SCN-A1: an agent changes its mind between terminal statuses (DONE → CLOSED, CLOSED → DONE) — real trigger: two consecutive `create_or_update_task` calls by the Manager; design says equal to a repeated DONE.
  - SCN-A2: an agent repeats CLOSED to retry the stop — real trigger: repeated `create_or_update_task {status: CLOSED}`.
  - SCN-A3: an agent closes a Temp task (no Project) it created with described `delegate_task` — real trigger: `create_or_update_task {task_id: ad_hoc_task_…, status: CLOSED}`.
  - SCN-A4: a user has the board open while the agent closes and reopens a Task (live lane move into the hidden Closed lane, toggle appearing/disappearing, search over visible tasks).
- Unsupported/contrived scenarios: none recorded by the designer; no user status control exists, so no UI status write is tested.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 CLOSED closes/stops like DONE; repeat retries; DONE↔CLOSED | Added | REQ-002/004, AC-001/004 | Real server/wire E2E with live workers (closure event, closedAt, no live process) |
| BEH-002 no status write in app/GraphQL | Preserved | REQ-006, AC-002 | Existing API-007 schema assertion + web component tests |
| BEH-003 board hides Closed, toggle, Closed lane | Added | REQ-008/009, AC-008 | Web component tests + real browser journey |
| BEH-004 Temp Closed neither Open nor Done, header count | Added | REQ-010, AC-009 | Web component tests + real browser journey |
| BEH-005 list filter CLOSED | Added | REQ-005, AC-006 | MCP + native tool E2E |
| BEH-006 terminal refusals name status; reopen → reactivation | Changed | REQ-003/007, AC-005 | Real server/wire E2E |
| BEH-007 open count = TODO+IN_PROGRESS | Changed | REQ-011, AC-010 | GraphQL E2E + browser project card |
| BEH-008 feed carries CLOSED | Changed | REQ-012, AC-011 | Strict-schema feed frames in E2E + browser live move |
| BEH-009 existing data directly usable | Preserved | REQ-013, AC-012 | Existing migration/startup/E-007 suites + store unit tests |
| BEH-010 CLOSED exists (enum/labels) | Added | REQ-001 | GraphQL introspection, catalog parity spec |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `task-status.ts`, `ProjectTaskService` trigger/refusals | Unit `task-closed-status.test.ts` (doubles for runtime release) | Real host-root stop, real runtime fence | Gated scripted-AGY server E2E |
| API / transport / contract | Yes | MCP tool schema/parse, GraphQL enum, `/ws/projects` zod schema | Unit contract tests | Real HTTP MCP/GraphQL/WS serialization | Ungated + gated server E2E |
| Frontend component / state | Yes | boards, toggle, pills, store `laneOf`/counts | Web specs (981 tests) | Real rendering with live feed | Browser probe |
| Browser integration / user journey | Yes | live close → hide → toggle → reopen | Implementer manual check (statuses written to disk, no agent) | Agent-driven live journey | Browser probe (project-manager-ux) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | same renderer | as above | — | Browser probe (web-equivalent) |
| Desktop shell / Electron-specific | No | no shell code changed | — | — | None |
| Process / lifecycle | Yes | worker stop on CLOSED | unit (release doubles) | physical stop of the worker process | Gated E2E (pgrep of scripted AGY workers) |
| Persisted-data transition | Yes (additive enum) | readers + frozen migration reader | store/migration unit + startup-migration E2E | — | Re-run existing suites |
| Worker / queue / distributed | Yes | Task serialization + release | unit | real roots | Gated E2E |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status` (branch `codex/task-closed-status`, commit `17e4299a6`)
- Project type: pnpm monorepo; Fastify/GraphQL/WS server (`autobyteus-server-ts`, Vitest); Nuxt 3 renderer (`autobyteus-web`, Vitest + Playwright-core probes); Electron shell unaffected.
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/TESTING.md` (no closer `TESTING*.md` in `autobyteus-server-ts/` or `autobyteus-web/`).
- Conflicting/unclear instructions: TESTING.md L521-525 still says the released migration "still imports current … `readTaskFile`: freeze those dependencies"; this change froze `readTaskFile`, so that sentence is now stale (doc-only; recorded for delivery docs sync, not a validation blocker).
- Secrets: N/A (scripted AGY CLI; no provider inference).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` › Project Task Agent Run Resources And Projects Migration Regressions | Server layers for Tasks | unit dirs; `tests/e2e/projects`; gated suites need `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`; e2e needs rebuilt dist |
| `TESTING.md` › Live Projects pages | browser probe | `pnpm -C autobyteus-web test:e2e:project-manager-ux --output-dir <fresh>` after `prebuild && build`; probe owns backend/Nuxt/Chrome/data |
| `TESTING.md` › Rules | safety | never use user app/data; stop what you start; assertions first |
| `AGENTS.md`, `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md` | package rules | stage paths explicitly; never `git add -A` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | worktree root | `pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build` | dist + SDK dist (untracked) | exit 0 | n/a |
| In-process Studio server (Vitest E2E) | `autobyteus-server-ts` | `pnpm -C autobyteus-server-ts exec vitest run <file> --no-watch` | temp data dir per suite | suite `beforeAll` | suite `afterAll` removes data dir |
| Browser probe stack | `autobyteus-web` | `pnpm -C autobyteus-web test:e2e:project-manager-ux --cases … --output-dir <ticket evidence dir>` | free ports, owned backend (dist), Nuxt dev, headless Chrome | probe readiness checks | probe `finally` (evidence `cleanup`) |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Projects/Tasks/agents/roots | public GraphQL + scripted AGY Manager tool calls | test-owned temp data roots only | removed by suites/probe |
| Live workers | `delegate_task` by scripted Manager | scripted CLI processes | root terminate + data removal |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- References: design-spec › Persisted Data / State Transition Decision; implementation-handoff › Persisted Data Transition Check
- Representative existing data: current-format Project/Temp `task.json` with TODO/IN_PROGRESS/DONE (existing E-007, projects-startup-migration fixtures, store unit fixtures).
- Evidence planned: re-run `projects-startup-migration.e2e`, migration unit test, `project-task-boundaries` E-007 (current data survives reader reconstruction), plus a new case asserting a CLOSED write keeps the exact `task.json` key set and reads back after reader reconstruction.
- Migration-specific scenarios: N/A.
- Upstream ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Req / AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/projects/task-closed-status.test.ts` (new, impl) | CLOSED closure/refusals/repeat/DONE↔CLOSED with service doubles | AC-001/004/005 | Still Valid | read | run |
| `tests/unit/agent-tools/project-tasks/project-task-tools.test.ts` | enums, parse, descriptions | AC-004/006/007 | Still Valid | diff | run |
| `tests/unit/agent-collaboration/agent-team-collaboration-llm-contract.test.ts` | pinned hashes/wording | AC-007 | Still Valid (updated by impl) | diff | run |
| `tests/e2e/projects/project-task-boundaries.e2e.test.ts` API-MCP | 3-status patch loop, `todo` invalid | AC-004/006 | Still Valid | read | add CLOSED case beside it |
| `tests/e2e/projects/projects-graphql.e2e.test.ts` API-007 | no status mutation, UpdateProjectTaskInput fields | AC-002 | Still Valid | read | run |
| `tests/e2e/projects/task-reactivation-root-visibility.e2e.test.ts` | DONE refusal/reopen/reactivation in 3 roots | AC-005 (DONE analogue) | Still Valid (messages still name DONE for DONE) | read | add CLOSED journey |
| `tests/e2e/projects/task-closure-root-visibility.e2e.test.ts` | DONE closure events/ordering | AC-001 analogue | Still Valid | impl ran | run |
| `tests/e2e/projects/project-change-feed.e2e.test.ts` | strict feed schema, DONE views | AC-011 analogue | Still Valid | impl ran | run |
| `tests/e2e/projects/ad-hoc-task-delegation.e2e.test.ts` | ad-hoc DONE | AC-004 analogue | Still Valid | impl ran | run |
| `tests/e2e/projects/projects-startup-migration.e2e.test.ts` + migration unit | released migration | AC-012 | Still Valid | impl ran | run |
| Web `ProjectTaskBoard.spec.ts`, `TempTasks.spec.ts`, `ProjectsPanel.spec.ts`, `projectLiveChanges.spec.ts`, `taskStatusPresentation.spec.ts`, `projectsCatalog.spec.ts` | toggle/lane/pill/live move/parity | AC-008/009/011, QR-001/002 | Still Valid | diff | run |
| `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` PMU-001..016 | live Projects pages (DONE journeys) | regression | Still Valid | read | add PMU-017 |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Req / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| CLS-API-001 | MCP + native: CLOSED patch/ack, DONE↔CLOSED, reopen, list filter CLOSED (only Closed) and unfiltered (all four), `tools/list` enums + descriptions, invalid-status message lists four, create-with-status refused, GraphQL enum values, openTaskCount/taskCount, persisted key set + reader reconstruction | AC-004, AC-006, AC-007, AC-010, AC-012, REQ-001 | `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts` (new `it`) | Real HTTP MCP/GraphQL boundary; ungated, runs in every `tests/e2e/projects` run |
| CLS-E2E-001/002 | Agent root and Team root: Manager closes a delegated Task (CLOSED) → live closure event with exact refs, `closedAt`, no live worker process, strict `/ws/projects` frames with CLOSED and root closed; repeated CLOSED re-publishes with resources unchanged; `delegate_task {task_id}` and run-ID message refused naming CLOSED (files byte-identical); DONE→CLOSED and CLOSED→DONE equal a repeated DONE; reopen (status only, nothing starts), assigner message reactivates; ad-hoc Temp task CLOSED by `task_id`, fenced, reopened, reactivated | AC-001, AC-003, AC-004, AC-005, AC-011, REQ-002/003/007/012 | `autobyteus-server-ts/tests/e2e/projects/task-reactivation-root-visibility.e2e.test.ts` (new `closedScenario` + 2 `it`) | Unit tests use runtime doubles; this proves real host-root stop/fence/reactivation |
| PMU-017 | Browser: agent closes on an open board → row leaves To Do live, toggle "Closed (1)" appears `aria-pressed=false`, lane hidden; toggle reveals full-width Closed lane after Done; Task page "Closed" pill distinct from Done; project card open count; agent reopens → row back in lane with `moved`, toggle gone; Temp board/header count; right-panel compact board toggle | AC-008, AC-009, AC-010, AC-011, REQ-008/009/010, QR-001 | `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` (new case) | Only implementer's disk-written manual check exists; agent-driven live rendering is unproven |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Evidence | Notes |
| --- | --- | --- | --- | --- |
| — | `TESTING.md` | Document the new cases (CLS-API-001, CLS-E2E, PMU-017) beside their suites | TESTING.md conventions | Doc-only |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Configuration | Boundary Or Scenario Proven | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 0 | `pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build` | worktree | current dist for E2E/probe | Pass | `api-e2e-evidence/server-build.log` |
| 1 | CLS-API-001 (`project-task-boundaries.e2e.test.ts -t CLS-API-001`) | ungated | MCP/native/GraphQL CLOSED contract | Pass | console |
| 2 | CLS-E2E-001/002 (`task-reactivation-root-visibility.e2e.test.ts -t CLS-E2E`) | gated scripted AGY | live closure/stop/refusals/reactivation/feed | Pass | `api-e2e-evidence/cls-e2e/` |
| 3 | CLS-MUT-001 mutation (CLOSED non-terminal) | temporary | test sensitivity | 3/3 new cases fail as expected; restored | ledger |
| 4 | server unit layers (TESTING.md list + `tests/unit/api`) | — | unit | Pass 70/649 | `server-regression/unit.log` |
| 5 | server integration (2 files) | — | integration | Pass 2/16 | `server-regression/integration.log` |
| 6 | `tests/e2e/projects` ungated | — | all Projects E2E | Pass 4 files/27 (gated files skipped) | `server-regression/e2e-projects-ungated.log` |
| 7 | `tests/e2e/projects` gated | scripted AGY | all 9 files | Pass 47 (1 live-Claude skipped) | `server-regression/e2e-projects-gated.log` |
| 8 | web Projects specs + localization guards | — | components/store/catalog | Pass 102/981 | `web/` |
| 9 | full `test:nuxt` | — | whole web | Pass 587 files, 0 failed | `web/full-test-nuxt.log` |

## Test-Case Ledger Decision

- Ledger required: `Yes` — multiple independent long-running gated E2E and browser cases.
- Canonical ledger path: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | AC-001/003..007/010..012 proven at server boundaries | AC-008/009 rendered behavior only via component tests | browser journey |
| Changed-boundary execution directness | 92% | real MCP/GraphQL/WS/roots/processes | rendered boards not exercised end to end | browser journey |
| Cross-boundary integration realism and mock gap | 90% | only the CLI/model scripted on the server | web components tested with mocked store inputs | browser journey with live feed |
| Environment, configuration, identity, and fixture fidelity | 95% | rebuilt dist, owned data roots | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | retry, DONE↔CLOSED, input-before-closure, refusals, physical stop, reopen/reactivation, mutation sensitivity | — | — |
| User-surface, browser, and desktop-shell confidence | 80% | component specs (981) | no agent-driven live rendering | browser probe PMU-017 |
| Durable regression coverage quality and relevance | 90% | new server cases | no durable browser case | PMU-017 |

- Overall post-repository confidence: 90%
- Calculation method: simple average
- Every critical acceptance criterion directly proven: `No` (AC-008/AC-009 rendered behavior not yet at a real surface)
- Applicable category below 90%: `Yes` — user surface 80%
- 95% target met: `No` → broader validation Required
- Final scores after broader validation: see execution coverage report (final 95%).

## Broader Validation Decision

- Decision: `Required` (executed; Pass — see execution coverage report)
- Selected execution mode: `Browser` (repository-resident `project-manager-ux` probe with a real built backend, Nuxt dev and scripted agent)
- Gap: live agent-driven rendering of hidden Closed lane/toggle/pill/counts across Project board, Temp board and right panel.
- Desktop shell: no shell code changed; web-equivalent renderer proof is the matching surface. Packaged desktop verification remains explicit user verification at delivery.

## Desktop Application Validation Decision

- Desktop framework: Electron wrapping the Nuxt renderer.
- Web-equivalent behavior: all changed UI.
- Shell-specific behavior: none changed.
- Chosen approach: browser dev-path probe (TESTING.md: renderer UI → web unit tests + browser dev-path probe).
- Effect on any running desktop app: None (probe owns its own stack and data).

## Live Environment And Fixture Plan

- Startup: the `project-manager-ux` probe owns the built backend (`autobyteus-server-ts/dist/app.js`, free port, private SQLite/data), Nuxt dev (free port, warmed up) and headless Chrome.
- Environment: 1440×1000, en-US; scripted AGY CLI (`AGY_FAKE_CASE=linked_skills`).
- Seed data: agent definitions, an Agent root, a Project with 3 Tasks, delegations, and a Temp task, all through public GraphQL and the Manager's tool calls.
- Journeys: PMU-017 (close → hidden + toggle → lane → keyboard → Task page pill → revisit → card → reopen → Temp → right panel); regression PMU-001/002/003/005/009/015.
- Evidence: DOM/state assertions, computed styles, lane boxes, `evidence.json`, screenshots, backend/frontend logs.
- Cleanup: probe `finally` (browser, process groups, data root), recorded in `evidence.json` `cleanup`.

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| CLS-MUT-001 | one-line source mutation of `isTerminalTaskStatus`, then restore | the new durable cases detect a non-terminal CLOSED | mutation checks are a one-off sensitivity proof |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| Org root CLOSED journey | Closure/refusal is root-kind-agnostic below `ProjectTaskService`; Org uses the same `ROOT_EXECUTION_EVENT` path as Agent and its DONE analogue is covered | Low | none |
| Real-model agent choosing CLOSED from the tool description | No provider inference in scope; descriptions asserted textually | Low | user verification |
| Packaged desktop app | No shell change; delivery-owned user verification | Low | delivery |

## Ambiguities Or Reroute Triggers

None at investigation time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Durable coverage will be added: `Yes` (CLS-API-001, CLS-E2E-001/002, PMU-017; TESTING.md updated)
- Post-repository confidence: 90% → final 95% after browser validation
- Broader validation decision: `Required` → executed, Pass
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
