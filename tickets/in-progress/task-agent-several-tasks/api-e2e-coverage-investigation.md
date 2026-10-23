# API/E2E Coverage Investigation — task-agent-several-tasks

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `tickets/in-progress/task-agent-several-tasks/requirements-doc.md` (Approved, SR-003)
- Investigation Notes: `tickets/in-progress/task-agent-several-tasks/investigation-notes.md` (AF-001–AF-009)
- Solution Revision Record: `tickets/in-progress/task-agent-several-tasks/solution-revision-record.md`
- Design Spec (required on every route): `tickets/in-progress/task-agent-several-tasks/design-spec.md` (SR-005, Ready)
- Supplemental Task Artifacts: `evidence/SD-probe-several-tasks.test.ts.txt` (AF-001 reproduction); `follow-ups.md` (FU-001)
- Design Review Report: `tickets/in-progress/task-agent-several-tasks/design-review-report.md` (ARCH-REV-002 Pass)
- Architecture Review Revision Record: `tickets/in-progress/task-agent-several-tasks/architecture-review-revision-record.md`
- Implementation Handoff: `tickets/in-progress/task-agent-several-tasks/implementation-handoff.md` (IR-002)
- Implementation Revision Record: `tickets/in-progress/task-agent-several-tasks/implementation-revision-record.md`
- Code Review Report: `tickets/in-progress/task-agent-several-tasks/code-review-report.md` (CRR-002 Pass, 9.5/10)
- Code Review Revision Record: `tickets/in-progress/task-agent-several-tasks/code-review-revision-record.md`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `tickets/in-progress/task-agent-several-tasks/api-e2e-revision-record.md` (on completion)
- Current API/E2E Revision ID: `API-REV-001` (on completion)
- Current Investigation Round: 1
- Trigger: implementation review Pass (CRR-002) from `/software_engineering_team/code_reviewer` (Small / High)
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file, round 1

## Current Requirement And Design Basis

A task agent (Agent or Team copy) may hold several open Project Tasks. `delegate_task task_id` + the copy's run id gives it another Task while others are open, still only from its most recent assigner; every other refusal stays (REQ-001, AC-001, AC-002). The given-Task message names the copy's other open Tasks by key and asks for the Task key in each report; with none open it is as before (REQ-002, AC-001, AC-008). Each Task records the copy as its assignment, so "Assigned to" / `list_project_tasks` show it (REQ-003). Closing a Task ends that Task's assignment; the copy is stopped only when no assignment is open; sub-work of the closed Task stops with it (REQ-004, AC-003, AC-004). A parent's close with open parts on one copy stops it once, after the last (REQ-005, AC-005). Sub-work joins the newest open Task (REQ-006, AC-006). A closed Task can be given back while another is open (REQ-007, AC-007). Tool texts and CM-6 follow (REQ-008). No data change (REQ-009, AC-009). AC-010: the journeys in an isolated desktop instance.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 to SCN-005.
- Real-use scenarios added from the implemented behavior:
  - RU-001: the Manager closes the copy's current Task and gives it the next one in the same turn (parallel tool calls, existing EXC-E2E-004): under the new rule the assignment is never refused, whichever lands first, and the copy is never stopped while the next Task is open (QR-001).
  - RU-002: a copy idle-shut-down while holding an open Task is given a second Task; the delivery wakes it (handoff hint; idle shutdown with the 60 s minimum grace).
  - RU-003: the Task a copy works on is deleted, then the copy is given another Task (TKD-AGY-001; FU-001 behavior: accepted, the deleted Task is left out of the message).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 assignment to an open copy | Changed (refusal removed) | REQ-001; AF | E2E pins asserting the refusal are stale → replaced by the accepted journey |
| BEH-004 given-Task message | Changed | REQ-002 | Live assertion of the exact sentence; unchanged text when none open |
| BEH-003 each Task shows the copy | Preserved mechanism, new state (two open roots) | REQ-003 | GraphQL roots and `list_project_tasks` assignments for both Tasks |
| BEH-002 release rule | Changed | REQ-004, AF-001 | Live: copy keeps running and accepts messages after one close; stopped once after the last (process gone, one closure frame) |
| BEH-005 parent cascade with parts on one copy | Preserved cascade, new stop timing | REQ-005 | Live: one stop after the last close |
| Sub-work owner | Changed (newest open Task) | REQ-006 | Live: helper under B stops with B; worker runs on |
| Closed Task given back while another open | New | REQ-007 | Live |
| Idle-shut-down copy given a second Task | Preserved wake path, new state | Handoff hint | Live with 60 s grace |
| `update_task` / `delegate_task` texts, CM-6 | Changed | REQ-008, CR-001 | Text pins updated |
| Data | Not affected | REQ-009 | Existing E2E suites with one-Task copies (closure, reactivation, idle lifetime) rerun |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `task-execution-resources.ts`, `TaskExecutionResourceService` release / current rules, eligibility | Server unit (IMP-02, IMP-04, IMP-07) incl. the AF-001 reproduction | Real roots, processes, delivery and closure frames | Gated E2E (scripted AGY) |
| API / transport / contract | Yes | `delegate_task` / `update_task` texts; given-Task message | Unit text pins | Real MCP tool list; real delivered message | Server E2E |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | No code; visible state changes (two Tasks with a live root) | — | — | "Assigned to" on both Tasks in the app | Isolated desktop instance |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes (state only) | Existing "Assigned to" | — | AC-010 | Isolated desktop instance |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes | Stop / keep-running / wake of copies | Unit with fakes | Real CLI processes, idle shutdown | Gated E2E |
| Persisted-data transition | No (format) | — | — | — | Existing suites rerun |
| Worker / queue / distributed | No | — | — | — | — |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-several-tasks`, branch `codex/task-agent-several-tasks`, HEAD `e421b2896d` (code `cd8c289b67`).
- Project type and runtime stack: pnpm monorepo; Node / Fastify / type-graphql server, Nuxt / Electron web, vitest.
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-several-tasks/TESTING.md`; `AGENTS.md`; `docs/isolated-app-instances.md`.
- Conflicting, missing, or unclear project instructions: none.
- Required environment variables or secrets available: `N/A` (scripted AGY CLI; no provider).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Layers, environments, rules | Server E2E from `autobyteus-server-ts` with `env -i PATH HOME=<resolved temp> TMPDIR`; gated AGY `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>`; isolated desktop instance; Rule 9 |
| `tests/e2e/projects/task-existing-copy-assignment.e2e.test.ts` | Existing-copy journeys in Agent / Team / Org roots | Helpers: closure / reopen frames, live process check by AGY cwd, Task files, roots, conversations |
| `tests/e2e/projects/task-copy-idle-lifetime.e2e.test.ts`, `src/config/task-execution-idle-shutdown-setting.ts` | Idle shutdown | `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS` (min 60 000, default 600 000), read when the idle timer arms, settable with `updateServerSetting` |
| `docs/isolated-app-instances.md` | Desktop instance | `start --from-worktree --data-root`, CDP attach, `stop`, `list` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server E2E (in-process Studio server) | `autobyteus-server-ts` | `env -i … pnpm exec vitest run <files> --no-watch` | Own temp roots | `beforeAll` | `afterAll` |
| Scripted AGY CLI | `tests/fixtures/agy-failure-cli.mjs` | `ANTIGRAVITY_CLI_COMMAND` | One process per running agent | `--version` gate | Roots terminated |
| Test-data backend for the desktop package | `autobyteus-server-ts` | `dist/app.js --data-dir <instance root>/server-data` with the scripted CLI, while the instance is stopped | Writes only the instance's own root | `/graphql` | Process killed before the instance starts |
| Isolated desktop instance | repo root | `pnpm -C autobyteus-web build:electron:mac`; `isolated-app start --from-worktree --data-root <own>` | Own root and ports | `start` result | `isolated-app stop`, root removed |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Copies holding several Tasks | Manager tools (`delegate_task`, `update_task`) over its scoped MCP session | Test-owned roots | With the root |
| A desktop data package with one Team copy assigned to two open Tasks | The real server (`dist/app.js`) with the scripted CLI on the instance's own data root, then the instance started on it | Never real data | Root removed after stop |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `task-existing-copy-assignment.e2e.test.ts` rootScenario AC-006 busy refusal (~400–412) | B refused while A open (TODO, IN_PROGRESS) | REQ-001 removes the refusal | Replace | handoff Known Risks; API-00 | Replaced by: Task E given while A open (AC-001 message, both roots), E closed (copy runs on, accepts messages; AC-003), A closed (stopped once; AC-004). The rest of the journey (closed copy reopened by B, A → B → A) stays valid |
| `task-existing-copy-assignment.e2e.test.ts` EXC-E2E-004 race | "refused-busy" branch | REQ-001; QR-001 | Needs Update | handoff | Every round must be assigned; never stopped while the next Task is open; one open entry after the DONE |
| `task-existing-copy-assignment.e2e.test.ts` TKD-AGY-001 deleted-Task refusal (~861–869) and busy refusal (~875–877) | Refused while a (deleted) Task is open | REQ-001; FU-001 | Replace | handoff | The worker holding the deleted Task is given another Task: accepted, message as "previous Task is closed" (FU-001); the helper holding C is given D by key in upper case while C is open: accepted, message names C; C DONE keeps it running |
| `project-task-boundaries.e2e.test.ts` CLS-API-001 (~663) and POF-API-001 (~846) | Old `update_task` sentences | REQ-008, CR-001 | Needs Update | handoff | New sentences |
| Other projects E2E (closure, reactivation, idle lifetime, change feed, delegation, collaboration contract) | One-Task copies | Preserved | Still Valid | API-00 | Rerun |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-00 | — | Whole `tests/e2e/projects` + `app-data-migrations`, gated, on HEAD before edits | Existing Test | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects tests/e2e/app-data-migrations --no-watch` | Every stale pin by evidence |
| REUSE-IMP-02..07 | AF-001, AC-001–AC-009 (unit), REQ-008 | Server unit / integration / typecheck | Reused | IMP-02..IMP-07 | No code change since `cd8c289b67` (`git diff --name-only` outside `tickets/` empty) |
| API-01 | REQ-008 | MCP tool texts | Durable (update) | `project-task-boundaries.e2e.test.ts` CLS-API-001, POF-API-001 | New sentences |
| API-02 | AC-001, AC-003, AC-004, REQ-003, QR-001, AC-008 (later B to a closed copy) | Agent, Team and Org roots; Team copy | Durable (replace) | `task-existing-copy-assignment.e2e.test.ts` EXC-E2E-001..003 | Removed refusal → accepted journey |
| API-03 | QR-001, QR-002, AC-003, AC-004 | Parallel DONE + next assignment | Durable (update) | EXC-E2E-004 | Never refused, never stopped while the next Task is open |
| API-04 | AC-001 (Agent copy, keys), FU-001 behavior | Agent root; Agent copies | Durable (replace) | TKD-AGY-001 | Refusals replaced by accepted assignments |
| API-05 | AC-002, AC-005, AC-006, AC-007, RU-002 | Agent root: Team copy (parent + parts), Agent copy (sub-work, give back), idle-shut-down copy | Durable (add, gated) | new `tests/e2e/projects/task-agent-several-tasks.e2e.test.ts` | Not covered end to end anywhere |
| API-06 | Preserved | Whole folder gated after edits | Existing Test | as API-00 | Regression |
| API-07 | AC-010, AC-009, REQ-003 | Isolated desktop instance | Journey | build; instance; test data from the real server with the scripted CLI; CDP journey: both Tasks' "Assigned to" show the team; the team in the Workspaces tree; `list` / stop | Required by AC-010 |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-05 | `autobyteus-server-ts/tests/e2e/projects/task-agent-several-tasks.e2e.test.ts` | Parent + parts on one copy, sub-work ownership, give-back, wake, with real processes |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-01 | `project-task-boundaries.e2e.test.ts` | New `update_task` sentences | — |
| API-02, API-03, API-04 | `task-existing-copy-assignment.e2e.test.ts` | Replace the busy refusals with the accepted journeys | See inventory |

## Durable Coverage To Remove

| Existing Path / Test | Obsolete Assertion And Why | Requirement / AC / Design Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| `task-existing-copy-assignment.e2e.test.ts` rootScenario "busy" step | "This task agent still works on Task A (TODO/IN_PROGRESS) …" refusal | REQ-001 (refusal removed), design-spec, handoff BEH-001 | Replaced in place by the accepted E-while-A journey (AC-001, AC-003, AC-004) |
| `task-existing-copy-assignment.e2e.test.ts` EXC-E2E-004 "refused-busy" branch | Assignment refused when it lands before the DONE | REQ-001 | Replaced: every round assigned, QR-001 checks |
| `task-existing-copy-assignment.e2e.test.ts` TKD-AGY-001 deleted-Task and busy refusals | Same refusal | REQ-001; FU-001 | Replaced by accepted assignments with their message texts |

## Desktop Application Validation Plan

- Desktop framework / shell: Electron wrapping the Nuxt renderer, embedded server.
- Web-equivalent behavior: "Assigned to" on Task pages, the board's root lines, the Workspaces tree. Shell-specific: none changed; no web code changed.
- Approach: build the worktree app; create the data package with this worktree's own server build and the scripted CLI on the instance's data root (the instance's server cannot be given the scripted CLI); start the instance on it; check both Tasks and the tree; stop.
- How the run avoids disturbing an already-running desktop application: own ports, process group and data root; attach only to the reported control port.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| A deleted Task's open entry keeps its copy from being stopped | FU-001, accepted behavior per REQ-004 wording | Low | No | FU-001 |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (stale refusal assertions replaced; one suite added)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: existing test files are edited only after API-00 finishes.
