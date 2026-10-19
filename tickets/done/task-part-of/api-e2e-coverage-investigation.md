# API/E2E Coverage Investigation — task-part-of

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `tickets/in-progress/task-part-of/requirements-doc.md` (Approved, SR-004)
- Investigation Notes: `tickets/in-progress/task-part-of/investigation-notes.md` (AF-001–AF-009)
- Solution Revision Record: `tickets/in-progress/task-part-of/solution-revision-record.md` (SR-001–SR-005)
- Design Spec (required on every route): `tickets/in-progress/task-part-of/design-spec.md` (SR-005, Ready)
- Supplemental Task Artifacts: Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-part-of/ui-ux-spec.md` (Approved, VIS-001–VIS-017)
- Design Review Report: `tickets/in-progress/task-part-of/design-review-report.md` (ARCH-REV-001 Pass)
- Architecture Review Revision Record: `tickets/in-progress/task-part-of/architecture-review-revision-record.md`
- Implementation Handoff: `tickets/in-progress/task-part-of/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `tickets/in-progress/task-part-of/implementation-revision-record.md`
- Code Review Report: `tickets/in-progress/task-part-of/code-review-report.md` (CRR-001 Pass, 9.4/10, no findings)
- Code Review Revision Record: `tickets/in-progress/task-part-of/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `tickets/in-progress/task-part-of/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001` (on completion)
- Current Investigation Round: 1
- Trigger: implementation review Pass from `/software_engineering_team/code_reviewer` (Large / High)
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: this file, round 1

## Current Requirement And Design Basis

A Project Task stores one optional parent (`partOfTaskId`), another current Task of the same Project, one level only (REQ-001–003). It is set at create and replaced / cleared on update, omitted keeps (REQ-002); refused with no change for self, unknown, other-Project, Temp tasks, a parent that is a part, or a Task that has parts (`TASK_PARENT_INVALID`). `depends on` stays independent (REQ-004). Nothing blocks work (REQ-005); the only effect: a parent's change to DONE / CANCELLED sets each TODO / IN_PROGRESS part to the same status through the normal close path (task agents closed and asked to stop), the `update_task` result lists them as `closedParts`; reopen, same-status writes and a part's own close never cascade (REQ-016, REQ-017). Deleting a parent leaves parts without a parent, `updatedAt` kept, republished (REQ-006). GraphQL, create / update results and `/ws/projects` `task_upserted` carry `partOfTaskId` (REQ-007). Tools take `part_of` (key in any case or long ID; `""` clears on `update_task`; `create_task part_of=""` is an argument error) and show `partOf` / `parts` by key, parts in numeric key order (REQ-013, REQ-014). Existing data reads as no parent, no conversion (REQ-015, `Directly Usable — No Migration`). The web shows the approved UI (REQ-008–012, 018, 019) in the board, Task page, tab and editor, en and zh-CN; AC-017 requires the journeys in an isolated desktop instance.

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001 to SCN-011.
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - RU-001: the app's Edit task Save always sends `partOfTaskId` (null when none) together with the description (AF-007; the editor's draft); a GraphQL update that sends only `description` (an older or other caller) keeps the parent. Trigger: `updateProjectTask`.
  - RU-002: the Project Task Manager creates parts in a Project with 10+ Tasks, so `parts` must sort numerically (`-2` before `-10`). Trigger: `create_task part_of`, then `list_project_tasks`.
  - RU-003: a Temp task (from a described `delegate_task`) is given a parent, or named as a parent, by an agent. Trigger: `update_task part_of` / `create_task part_of=<ad hoc id>`.
  - RU-004: the user watches the board / parent Task page while the Manager cancels the parent through its tool; the parts' cards and rows change without Refresh. Trigger: live `update_task` from a running agent.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): none recorded; mixed versions are out of scope (DEC-009) and not tested.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 parent store / set / replace / clear / refuse (GraphQL, tools) | Added | REQ-001–004, 011, 013; DS-001, DS-002, DS-008 | GraphQL E2E (omitted / null / ID, refusals, nothing written) + tool E2E over MCP and native |
| BEH-002 web parts / parent / progress / editor | Added | REQ-007–012, 018, 019 | Web unit (reused IMP-04) + browser probe (live) + isolated desktop instance (AC-017) |
| BEH-003 tool reads `partOf` / `parts` / `closedParts` | Added | REQ-013, 014, 017; DS-007 | Tool E2E: list, search, acks; numeric order; no long IDs |
| BEH-004 delete parent clears parts | Added | REQ-006; DS-004 | GraphQL E2E (`updatedAt` kept) + live feed frame |
| BEH-005 parent close cascade | Added | REQ-005, 016, 017; DS-003 | Tool E2E with fixture run resources + gated live E2E with a really running task agent (CANCELLED and DONE) + browser live board |
| BEH-006 existing data no parent | Preserved (reader) | REQ-015; Directly Usable | GraphQL E2E on a synthesized step-1 `task.json` (bytes unchanged until a save) |
| Additive result shapes (`partOf`, `parts`, `partOfTaskId`, `part_of` in schemas) | Changed | design Interface Boundary Mapping | Existing E2E shape pins updated |
| `depends on`, keys, status rules, assignment / reopen (incl. the moved `TaskAssignmentEligibility`) | Preserved | Preserved Behavior Boundary | Existing E2E suites rerun (ungated and gated) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `task-parts.ts`, `TaskRelationWrites`, `TaskPartClosure`, `ProjectTaskService.update()` | Server unit (IMP-02) | Real store + lock + publisher together (unit uses the real store but not HTTP) | Server E2E |
| API / transport / contract | Yes | GraphQL fields / inputs, tool params / results, `/ws/projects` schema | Unit schema / manifest tests | Real type-graphql omitted-vs-null over HTTP; MCP tool schemas and results | Server E2E (HTTP, MCP) |
| Frontend component / state | Yes | Parts / Part of cards, row marker, picker, store, draft | Web unit (IMP-04) | Rendering against a real backend | Browser probe; desktop instance |
| Browser integration / user journey | Yes | Board, Task page, editor, tab, live feed | IMP-07 (page board, Task page, editor; no tab, no zh-CN, no live cascade) | Live cascade on the board; tab; zh-CN; long keys; Cancelled lane | Browser probe + desktop instance |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Same renderer in Electron | — | AC-017 in the real desktop app | Isolated desktop instance |
| Desktop shell / Electron-specific integration | No | No shell code changed | — | — | — |
| Process / lifecycle | Yes | One `update_task` closes several Tasks' task agents | Unit (mocked runs) | A really running task agent stopped by the cascade | Gated AGY E2E (scripted CLI, real runtime process) |
| Persisted-data transition | Yes (additive field) | `task.json` `partOfTaskId` | Store unit test | Through the real server read path | GraphQL E2E on synthesized step-1 data |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-part-of`, branch `codex/task-part-of`, HEAD `399303d039` (code `179ddb9f77`).
- Project type and runtime stack: pnpm monorepo; Node / Fastify / type-graphql server (`autobyteus-server-ts`), Nuxt 3 / Electron web (`autobyteus-web`), vitest.
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/task-part-of/TESTING.md` (the worktree copy; it is newer than the superrepo checkout's copy: "Rerun by impact", resolved temp `HOME`, Rule 9 "fix every failure"). Also `AGENTS.md` (root), `docs/isolated-app-instances.md`.
- Conflicting, missing, or unclear project instructions: none blocking. The handoff's list of shape pins misses `tests/e2e/projects/project-task-search.e2e.test.ts` (search result shape) and the `CTX-E2E-001` tool-schema key list; both found by the baseline run.
- Required environment variables or secrets available: `N/A` (no provider; the scripted AGY CLI needs none).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Test layers, environments, rules | Server E2E `vitest run <file> --no-watch` from `autobyteus-server-ts`; E2E inherits the shell → `env -i PATH HOME=<resolved temp> TMPDIR`; gated AGY: `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs`; browser probes own their stack; isolated desktop `pnpm --silent isolated-app start --build`; never touch `~/.autobyteus`; stage paths explicitly |
| `docs/isolated-app-instances.md` | Desktop instance lifecycle | `start --build` / `stop <id>`; control via CDP on the reported `controlPort` (attach only); embedded server gets a baseline env only |
| `autobyteus-server-ts/tests/e2e/projects/project-task-context-files-delegation.e2e.test.ts` | Pattern for a live Manager + worker | `CALL_TOOL:{…}` drives the real tool through the Manager's scoped MCP session; `task_executions_closed` frame on `/ws/agent-collaboration`; `agent_run_resources.json` `closedAt` |
| `autobyteus-server-ts/tests/e2e/projects/project-change-feed.e2e.test.ts` | `/ws/projects` frames | `ProjectChangeMessageSchema` strict parse of every frame |
| `autobyteus-web/tests/e2e/team-status-live-probe.mjs` | Pattern for a probe-owned live stack | `dist/app.js` backend with the scripted AGY CLI + `nuxi dev` + playwright-core Chrome; process-group cleanup |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server E2E (in-process Studio server) | `autobyteus-server-ts` | `env -i … pnpm exec vitest run <files> --no-watch` | Test-owned temp data root per suite | Suite `beforeAll` | Suite `afterAll` removes the data root |
| Scripted AGY CLI | `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | via `ANTIGRAVITY_CLI_COMMAND` | One process per running agent | `--version` gate | Agents terminated in `afterAll` |
| Probe stack (backend `dist/app.js` + Nuxt dev + Chrome) | `autobyteus-web` | temporary probe script (ticket-owned) | Free ports, own data root under `/tmp` | `/graphql` answers, Nuxt page loads | Process groups killed, data root removed in `finally` |
| Isolated desktop instance | repo root | `pnpm --silent isolated-app start --build` | Own data root and ports | `start` result | `pnpm --silent isolated-app stop <id>`; `list` shows none of mine |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Projects and Tasks with parents / parts | Public GraphQL and the real tools | Test-owned data roots only | Removed with the data root |
| A part with a running task agent | Manager `delegate_task({task_id})` to a worker definition (scripted AGY) | No provider | Agents terminated |
| Step-1-shape `task.json` (no `partOfTaskId`) | Synthesized: a current Task's file with the key removed, inside the test-owned root | Never real data | Removed with the root |
| Desktop instance data | GraphQL against the instance's own backend | Own data root | Removed by `stop` |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design-spec "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check".
- Representative existing-data setup and required behavior: a Task file in the step-1 shape (every current key except `partOfTaskId`) reads with `partOfTaskId: null` through GraphQL and the tools, its bytes stay unchanged on reads and on writes to other Tasks, and its next ordinary save writes `"partOfTaskId": null`.
- Evidence planned: API-02 (GraphQL E2E, synthesized file), plus the reused store unit test (IMP-02).
- Migration-specific scenarios: N/A.
- Upstream ambiguity or reroute required: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `project-task-boundaries.e2e.test.ts` API-MCP | Exact tool acks `{projectId, taskId, status, dependsOn}` | REQ-013 (additive `partOf`) | Needs Update | baseline: fails at line 173 | Add `partOf: null` to the pinned acks |
| `project-task-boundaries.e2e.test.ts` CTX-E2E-001 | Tool schema key lists; exact acks | REQ-013 | Needs Update | baseline: fails at line 482 (keys lack `part_of`) | Add `part_of` to both key lists; `partOf: null` to acks |
| `project-task-boundaries.e2e.test.ts` CLS-API-001 | Exact CANCELLED acks | REQ-013 | Needs Update | baseline: fails at line 690 | Add `partOf: null` |
| `project-task-boundaries.e2e.test.ts` TKD-API-001 | Exact acks for keys / dependencies | REQ-013 | Needs Update | baseline: fails at line 760 | Add `partOf: null` |
| `project-task-boundaries.e2e.test.ts` API-FILES, API-AGG, E-005–E-007, CTX-E2E-002, collisions | Files, Projects, aggregates | Preserved | Still Valid | baseline pass | Rerun |
| `projects-graphql.e2e.test.ts` API-007 | `UpdateProjectTaskInput` field list | REQ-007 | Needs Update | baseline: fails at line 540 | Add `partOfTaskId` |
| `projects-graphql.e2e.test.ts` other cases | Projects, Tasks, keys, deps, migration | Preserved | Still Valid | baseline pass | Rerun |
| `project-task-search.e2e.test.ts` exact / meaning | Exact `search_project_tasks` result shape | REQ-014 (additive `partOf`, `parts`) | Needs Update | baseline: fails at line 94 | Add `partOf: null, parts: []` |
| `project-task-context-files-delegation.e2e.test.ts` (gated) | Exact acks at ~160, 165, 212 | REQ-013 | Needs Update | handoff Known Risks; gated baseline | Add `partOf: null` |
| `project-change-feed.e2e.test.ts` (gated) | Feed equals the GraphQL snapshot | REQ-007 | Needs Update | gated baseline: `feed equals snapshot` timeouts (snapshot query lacks `partOfTaskId`) | Add `partOfTaskId` to the snapshot query |
| `task-existing-copy-assignment.e2e.test.ts` (gated) | Exact acks at 833, 835, 881 | REQ-013 | Needs Update | gated baseline: fails at 833 | Add `partOf: null` |
| Other gated projects suites (reactivation, closure, ad-hoc, copies, lifetime, …) | Task closure, assignment, reactivation | Preserved (closure path now also cascades; eligibility moved) | Still Valid | gated baseline pass | Rerun |
| `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` PMU-002, `project-manager-ux-task-locator-cases.mjs` PMU-021 | Root openable; center unchanged by a locate | Preserved (not part-of) | Needs Update (timing races) | API-07 first run and reruns | Wait for the openable root; settled center excludes `Running` |
| `tests/e2e/app-data-migrations/remove-built-in-project-task-manager-startup.e2e.test.ts` | Startup migration | Preserved | Still Valid | — | Rerun in the folder run |
| `autobyteus-web/tests/e2e/projects-feature-probe.mjs`, `project-manager-ux-probe.mjs` | Projects UI journeys on a probe-owned stack | Preserved (every other Projects surface unchanged) | Still Valid | — | Rerun as regression |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-00 | — | Server E2E (baseline) | Existing Test | Baseline of the ungated and gated projects E2E on HEAD before edits | Find every shape pin by evidence, not only the handoff's list |
| REUSE-IMP-01 | — | server typecheck | Reused | IMP-01 | `git diff --name-only 179ddb9f77 399303d039` touches only the ticket folder |
| REUSE-IMP-02 | AC-001–008, 014–016, 018 (unit level) | server unit | Reused | IMP-02 | Same: no code change since |
| REUSE-IMP-03 | — | server integration | Reused | IMP-03 | Same |
| REUSE-IMP-04 | AC-001, 002, 009–013, 019, 020 (unit level) | web unit | Reused | IMP-04 | Same |
| REUSE-IMP-05 | AC-013 | web guards | Reused | IMP-05 | Same |
| API-01 | REQ-013, 014, REQ-015 (old calls otherwise identical) | Server E2E HTTP / MCP / GraphQL | Durable (update) | Updated shape pins; `env -i … vitest run project-task-boundaries projects-graphql project-task-search` | Additive fields are approved behavior |
| API-02 | AC-001, 002, 003, 004, 005, 007, 016; REQ-002 omitted / null / ID | GraphQL over the in-process schema + real store | Durable (add) | `projects-graphql.e2e.test.ts` API-011 | type-graphql omitted-vs-null and refusals with nothing written need a real-boundary test (design Risk, AF-007) |
| API-03 | AC-003, 004, 006, 014, 015, 018 (tool level, fixture run resource), REQ-016 reopen / same status / attach to closed parent | Real Studio HTTP + scoped MCP + native tools | Durable (add) | `project-task-boundaries.e2e.test.ts` POF-API-001 | Agent-facing contract through the real MCP host |
| API-04 | AC-015 (search) | GraphQL + MCP `search_project_tasks` | Durable (add) | `project-task-search.e2e.test.ts` new case | Search adds a list read; only this suite has the fake embedding model |
| API-05 | AC-018 (CANCELLED and DONE with a really running task agent), AC-008 (feed frames for create, re-parent, cascade, delete cleanup), AC-007 live, AC-003 / AC-014 Temp tasks, AC-006 | Real Studio HTTP / WS, Manager MCP session, live delegated worker (scripted AGY process), `/ws/projects` | Durable (add, gated) | new `tests/e2e/projects/project-task-parts-live.e2e.test.ts` under `RUN_AGY_FAILURE_E2E=1` | The lifecycle effect is the highest-risk change; only unit-covered so far |
| API-06 | Preserved behavior | Whole `tests/e2e/projects` folder + `app-data-migrations` startup suite, gated | Existing Test | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=… vitest run tests/e2e/projects tests/e2e/app-data-migrations --no-watch` | Regression over closure, assignment, reactivation, feed |
| API-07 | Preserved Projects UI | Browser probes (probe-owned stack) | Existing Test | `pnpm -C autobyteus-web test:e2e:projects`, `test:e2e:project-manager-ux` with fresh `--output-dir` | Every other Projects surface unchanged |
| API-08 | AC-018 "boards update live", AC-008 (web), AC-009, AC-010 (incl. tab with a real run), AC-011 | Browser: Nuxt dev + `dist/app.js` backend with scripted AGY + headless Chrome | Temporary Probe | ticket-owned `evidence/API-08-probe/parts-live-probe.mjs` | A live cascade needs a running agent; a durable package probe for one ticket's journey is out of proportion; kept with the evidence |
| API-09 | AC-017 (board, Task page, part page, New part, editor choose / greyed / has-parts / clear, delete note, tab if reachable, zh-CN, long keys, Cancelled lane, narrow board), AC-016 (isolated instance with test data) | Isolated Electron instance of this worktree build | Journey | `pnpm --silent isolated-app start --build`, data via the instance's GraphQL, CDP automation (playwright-core `connectOverCDP`), `stop` | Required by AC-017 and TESTING.md |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-02 | `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` (API-011) | GraphQL omitted / null / ID semantics, refusals and existing-data read through the real resolver and store |
| API-03 | `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts` (POF-API-001) | Tool contract over the real MCP host, MCP equals native |
| API-04 | `autobyteus-server-ts/tests/e2e/projects/project-task-search.e2e.test.ts` | `search_project_tasks` `partOf` / `parts` |
| API-05 | `autobyteus-server-ts/tests/e2e/projects/project-task-parts-live.e2e.test.ts` (new, gated) | Cascade with a really running task agent, feed frames, Temp tasks |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-01 | `project-task-boundaries.e2e.test.ts` API-MCP, CTX-E2E-001, CLS-API-001, TKD-API-001 | `partOf: null` in exact acks; `part_of` in the schema key lists | Additive only |
| API-01 | `projects-graphql.e2e.test.ts` API-007 | `partOfTaskId` in the `UpdateProjectTaskInput` field list | Additive only |
| API-01 | `project-task-search.e2e.test.ts` | `partOf: null, parts: []` in the exact search result | Additive only; not in the handoff's list |
| API-01 | `project-task-context-files-delegation.e2e.test.ts` (gated) | `partOf: null` in exact acks | Plus any other gated pin the baseline shows |

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron wrapping the Nuxt renderer, embedded server.
- Testing guideline used: `TESTING.md` (isolated desktop instance layer), `docs/isolated-app-instances.md`.
- Web-equivalent behavior: all changed behavior (renderer components and client–server contract).
- Shell-specific or lifecycle behavior: none changed.
- Chosen validation approach: browser probe for the live-agent journey (needs the scripted AGY CLI, which the instance's baseline-only server environment cannot receive), and the isolated desktop instance of this worktree's build for AC-017's user journeys with GraphQL-created test data.
- Server/frontend setup when browser validation is used: probe-owned `dist/app.js` backend (fresh `pnpm -C autobyteus-server-ts build` already at `179ddb9f77`; rebuilt if stale) + `nuxi dev` on free ports.
- How the run avoids disturbing an already-running desktop application: own ports, own data root, own process group; never attach to any CDP port except the instance's reported `controlPort`; the AutoByteus browser tools of this agent are not used (they belong to the user's running app).

## Live Environment And Fixture Plan

- Startup order and commands: server E2E (in-process) → probe stack (backend, Nuxt, Chrome) → isolated instance (`start --build`).
- Environment choices that materially affect the run: `env -i` with a resolved temp `HOME`; `AGY_FAKE_CASE=linked_skills` for the scripted CLI; locale switched to zh-CN through the app's own language setting.
- Health / readiness checks: suite `beforeAll`; `/graphql` `{__typename}`; Nuxt page 200; instance `start` result.
- Seed data / fixtures: Projects / Tasks through GraphQL and tools; parts with keys ≥ 10 for numeric order; a long Project name for long keys.
- Test identities, authentication, permissions, or session state: none.
- Requirement-linked journeys: AC-017 journeys per UXJ-001 to UXJ-006; AC-018 live.
- Evidence to capture: test logs (excerpt + gz), suite JSON evidence, DOM / state assertions as JSON, screenshots, backend log excerpts.
- Owned processes and temporary state to clean up: probe processes and data roots, the isolated instance and its data root.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| A part whose close fails during a cascade (`TASK_PART_CLOSE_FAILED`) through the live server | Needs damaged run data; accepted residual risk (ARCH-REV-001); unit-covered | Low | No | None |
| Mixed desktop / node versions | Out of scope (DEC-009) | — | No | None |
| Real provider inference for the worker | The scripted AGY CLI runs the real runtime process and tools without a model; inference is irrelevant to the cascade | Low | No | None |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added and updated; none removed)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: the baseline run (API-00) found shape pins outside the handoff's list (`project-task-search.e2e.test.ts`, the `project-change-feed.e2e.test.ts` snapshot query, `task-existing-copy-assignment.e2e.test.ts` acks). During execution, API-07 found two timing races in the existing `project-manager-ux` probe (PMU-002 asserts a root before its host run is listed; PMU-021 accepts a center still showing `Running`). Cause in the probe, unrelated to part-of; decision: `Local Fix` by API/E2E as a separate baseline-fix commit (TESTING.md Rule 9), recorded in the report.
