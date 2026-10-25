# API/E2E Coverage Investigation — agent-tool-results-omit-empty (autobyteus-260)

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision are in [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md).

## Investigation Meta

- Requirements Doc: [requirements-doc.md](requirements-doc.md) (Approved; SR-010 basis, document at SR-011)
- Investigation Notes: [investigation-notes.md](investigation-notes.md)
- Solution Revision Record: [solution-revision-record.md](solution-revision-record.md) (SR-001–SR-011)
- Design Spec (required on every route): [design-spec.md](design-spec.md) (SR-011)
- Supplemental Task Artifacts: `evidence/SD-*` (before sizes, first-line lengths, Task-file shape inventory, Codex probe)
- Design Review Report: [design-review-report.md](design-review-report.md) (rounds 1–3, AR-001–AR-008, MP-001–MP-003)
- Architecture Review Revision Record: [architecture-review-revision-record.md](architecture-review-revision-record.md)
- Implementation Handoff: [implementation-handoff.md](implementation-handoff.md) (IR-001)
- Implementation Revision Record: [implementation-revision-record.md](implementation-revision-record.md)
- Code Review Report: [code-review-report.md](code-review-report.md) (CRR-001, Pass, no findings)
- Code Review Revision Record: [code-review-revision-record.md](code-review-revision-record.md)
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: [api-e2e-revision-record.md](api-e2e-revision-record.md) (created after the first completed result)
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: `2`
- Trigger: round 2: code review CRR-004 pass after CR-001/CR-002/CR-003 (head `fccf1227a6`); round 1: CRR-001 pass
- Prior Investigation Reviewed: round 1 (this file; Planned Cases unchanged, F-001/F-002 in Ambiguities resolved by SR-012 / CR-002)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

To prove (REQ-001–REQ-017, AC-001–AC-015):

- **One result rule** (REQ-001/002, AC-001/002): every platform tool result on both routes leaves out `null`/`""`/`[]`/`{}`, keeps `false`/`0`, is compact; refusals keep `code`/`message`; MCP `structuredContent` matches the advertised `outputSchema`; `send_message_to` refusals carry no `target_agent_run_id`.
- **Task title** (REQ-003–REQ-006, REQ-009, REQ-011, AC-003–AC-005, AC-009): required, trimmed, not blank, no length limit; `create_task` requires it, `update_task` changes it; GraphQL `title: String!`; change feed carries it; startup migration `20261025_project_task_titles` titles released Tasks from their first non-empty line (≤ 200, "…"), changes nothing else, never blocks startup, and a second start changes nothing; the app's forms require it and its labels show it.
- **Short lists, search, context files** (REQ-007, REQ-008, REQ-013, AC-006, AC-007, AC-011): `list_project_tasks` = `{projectId, tasks:[short entry]}`, no `task_ids`; search hits carry `title`, `meaningSearch` only when not ready; acknowledgements' `attachedContextFiles` are `{name, path}` and `path` reads the saved file.
- **`get_project_task`** (REQ-014–REQ-016, AC-012–AC-014): full Task by key (any case) or long ID within the Project; other Project / unknown → `TASK_NOT_FOUND`; a worker (task agent, task team member, agent it delegated to) reads only its current Task, others refused `TASK_READ_OUT_OF_SCOPE` with no data; a caller on no Task reads any; damaged run data is a refusal, never "any" (AR-008); opt-in exposure on both routes.
- **First message** (REQ-017, AC-015): saved Task, new copy and existing copy → `Task: <key> in Project <projectId>` + the `get_project_task` sentence; described work has neither.
- **Sizes** (REQ-010, AC-008, QR-001): before/after table for delivery; default list ≤ 10% of before.
- **Skill** (REQ-012, AC-010): the Project Task Manager skill text matches the shipped shapes (autobyteus-agents `82b7bae`).

Persisted data: `Migration Required` (design-spec "Persisted Data / State Transition Decision").

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001, SCN-002, SCN-003, SCN-004, SCN-005, SCN-006, SCN-007, and the design-review explicit edge MP-003 (damaged run data).
- Real-use scenarios added from the implemented behavior, each with its real trigger:
  - SCN-A1 **Damaged run data is found at app start** (a Task's `agent_run_resources.json` cannot be read when the server loads it): the resource view marks the Task damaged only at load, so the real trigger is a restart with the damaged file on disk. Then a caller whose Task can still be told reads its own Task, while a caller whose scope can't be told is refused `TASK_AGENT_RESOURCES_UNAVAILABLE`.
  - SCN-A2 **The Project Task Manager delegates a second saved Task to an existing copy** (the existing-copy first message, AR-006 two open Tasks): `delegate_task target_agent_run_id + task_id`.
  - SCN-A3 **An existing user's data root of the released build is opened by the new build**: four released Task shapes (inventory), Temp tasks beside them, a file the released reader already skips, and a description whose first line is longer than 200 characters.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 result rule, both routes | Changed | REQ-001/002; design DS-001/002 | Existing E2E asserting empty fields, pretty JSON or `target_agent_run_id: null` must be updated; MCP over real HTTP keeps proving `content` == `structuredContent` |
| BEH-002 stored title | Added | REQ-003–006, 009 | Every E2E that creates a Task (GraphQL or tool) must give a title; GraphQL Task field lists gain `title`; stored `task.json` assertions gain `title` |
| BEH-002 title migration | Added | REQ-005, AC-004; design Migration Plan | New startup E2E on built `dist/app.js` with synthesized released shapes; existing startup E2E that compare `task.json` exactly now see `title` after keys-v1 |
| BEH-003 short list | Changed | REQ-007 | E2E reading description/comments/context files from `list_project_tasks` must read them from GraphQL or `get_project_task` |
| BEH-004 search `title` | Changed | REQ-008 | Search E2E: `summary` → `title`; no `meaningSearch` when ready |
| BEH-005 `{name, path}` | Changed | REQ-013, REQ-014 | Ack assertions with `storedFilename`/`displayName` → `{name, path}` |
| BEH-006 `get_project_task`, scope, first message | Added | REQ-014–017 | New tool E2E on real HTTP MCP; new worker-scope E2E with real roots on both routes |
| Web labels / forms | Changed | REQ-004, REQ-006 | Web probes must create Tasks with titles; label assertions now read titles |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | title rules, manifest, scope, migration | IMP-04 unit (6,847), IMP-05 integration (428) | none material at unit level | — |
| API / transport / contract | Yes | MCP `tools/call` results and `outputSchema`; GraphQL `title`; change feed | unit MCP adapters invoked directly; IMP-05 calls adapters in process | real HTTP MCP session → sender context → scope; real runtime clients reading results | Server E2E (real HTTP/MCP/WS), scripted AGY, one real Codex run |
| Frontend component / state | Yes | Title field, labels | IMP-06 (1,587) | — | — |
| Browser integration / user journey | Yes | board, Task page, Workspaces tree with real stack | IMP-10 (desktop) partial | the web probes still create Tasks without titles; tree label from a live Task worker not seen | Browser probes (probe-owned stack) |
| Authentication / session / permissions | Yes | `get_project_task` caller scope from the MCP session's sender | unit/integration with hand-made sessions | the real session authority of a runtime's MCP session | Worker-scope E2E (scripted AGY) |
| Desktop renderer / web-equivalent UI | Yes | same as browser | IMP-10 | right-panel Projects tab, Workspaces tree with live worker | Isolated desktop instance |
| Desktop shell / Electron-specific | No | — | — | — | — |
| Process / lifecycle | Yes | startup migration; restart with damaged run data | migration unit tests on fixtures | the built startup entrypoint and runner ledger | Built-server startup E2E |
| Persisted-data transition | Yes | `task.json` gains `title` | migration unit tests | through real startup + GraphQL; second start | Built-server startup E2E |
| Worker / queue / distributed coordination | Yes | delegated copies, existing copies, remote delegation shapes | integration with fake backend | real roots, runtimes and a second node | Worker-scope E2E; remote two-server E2E |
| External integration | Yes | Codex / AGY / native clients of the MCP / native result | Codex 0.164 probe (design) | Codex validating the new `send_message_to` refusal against `outputSchema` | Gated real Codex E2E (one run) |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tool-results-omit-empty` (branch `codex/agent-tool-results-omit-empty`); second repository `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tool-results-omit-empty-agents` (`82b7bae`).
- Project type and runtime stack: pnpm monorepo; Node 22; TypeScript server (Fastify, GraphQL, MCP), Nuxt web, Electron desktop.
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tool-results-omit-empty/TESTING.md` (no closer `TESTING*.md` under `autobyteus-server-ts/` or `autobyteus-web/`).
- Conflicting, missing, or unclear project instructions: none found so far.
- Required environment variables or secrets available: `N/A` for the scripted runs (no keys); the Codex run uses the user's signed-in `codex` CLI with the real `HOME` (TESTING.md "A live suite that uses a signed-in CLI").

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global test layers and rules | Server E2E: `vitest run <file> --no-watch` from `autobyteus-server-ts`; E2E inherit the shell → run with `env -i PATH HOME=<resolved temp> TMPDIR`; one heavy run at a time across worktrees; suites running `dist/app.js` need `pnpm -C autobyteus-server-ts build`; migrations tested on synthesized released-shape data, prove conversion, no loss, second start no-op; browser probes own their stack, pass a fresh `--output-dir`; isolated desktop via `pnpm --silent isolated-app start --build`, stop afterwards |
| `AGENTS.md`, `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md` | Repository rules | Read before planning (no conflicting rule) |
| `autobyteus-server-ts/vitest.config.ts` | Runner | `pool: forks`, `fileParallelism: false`; Prisma global setup |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Scripted AGY CLI (`RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND=<abs>`, `AGY_FAKE_CASE=linked_skills`) | `CALL_TOOL:{…}` / `CALL_TOOLS:[…]` make the agent call the real tool and reply `CALLED:` / `CALLED_ALL:` |
| Each E2E file header | Gate and command | `RUN_AGY_FAILURE_E2E` (most projects files, remote two-server, MCP matrix AGY lane), `RUN_CODEX_E2E` (Codex routing), `RUN_LMSTUDIO_E2E` (native lane, real LM Studio) |
| `docs/isolated-app-instances.md` | Isolated desktop | `start --build`, control port for browser-automation, `stop <instanceId>` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | worktree root | `pnpm -C autobyteus-server-ts build` | needed by every `dist/app.js` suite | `dist/app.js` newer than the source commit | — |
| Server E2E (in process or spawned `dist/app.js`) | `autobyteus-server-ts` | `env -i PATH HOME=<temp> TMPDIR [gates] pnpm exec vitest run <file> --no-watch` | test-owned temp data roots, port 0 | each file's own readiness | each file's `afterAll` |
| Web probes | `autobyteus-web` | `pnpm test:e2e:<name> -- --output-dir <fresh>` | probe-owned Nuxt dev server, headless Chrome, backend and data root | the probe's own | the probe's cleanup receipt |
| Isolated desktop | worktree root | `pnpm --silent isolated-app start --build` | own data root and ports | `start` JSON | `pnpm --silent isolated-app stop <instanceId>`; `list` shows none |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Projects and Tasks | GraphQL `createProject` / `createProjectTask` and the agents' own tool calls | test-owned data roots only | removed with the temp root |
| Released Task files (migration) | synthesized `task.json` files with the inventoried key sets (`SD-task-file-shape-inventory-output-20261025.txt`); no real data copied | never run on user data | temp root removed |
| Damaged run data | write an unreadable `agent_run_resources.json` into a test-owned Task folder before a restart (same mechanism as CMT-API-002) | test-owned root | temp root removed |
| Runtimes | scripted AGY CLI; emulated LM Studio HTTP server (inference only) for the native route | no provider keys; no inference | processes stopped by the tests |

## Persisted Data Transition Coverage Basis

- Approved decision: `Migration Required`.
- Design-spec and implementation-handoff references: design "Migration Plan"; handoff "Persisted Data Transition Check".
- Representative existing-data setup and required behavior: a data root with per-folder, keyed Projects (the state after `project-task-keys-v1`) holding one Task of each of the four released shapes, a released keyless Project (so keys-v1 then titles run in order), Temp tasks, an invalid Task file, a whitespace-only description, a > 200-character first line with an astral character at the cut. After start: each released Task has `title` from its first non-empty line (≤ 200, "…"); every other key and value unchanged; Temp tasks unchanged; invalid file unchanged; GraphQL `projectTasks` returns titles; the agents' `list_project_tasks` returns them; the ledger records the migration; a second start changes no byte.
- Evidence planned: built-server startup E2E (API-08).
- Migration-specific completion/recovery scenarios: per-Task failure and retry are covered by the migration unit tests (IMP-04, `tests/app-data-migrations/project-task-titles/`); the E2E proves completion through the real entrypoint and the no-op second start.
- Upstream ambiguity or reroute required: none.

## Existing Durable Coverage Inventory

The baseline run of `tests/e2e` (gated, on `45a0a7ea08`) records every failing case; the decisions below are refined from it in the execution report.

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/e2e/projects/*.e2e.test.ts` (all files that create a Task by GraphQL or `create_task`) | Task journeys (delegation, closure, comments, parts, search, context files, feed, startup) | REQ-004, REQ-007, REQ-008, REQ-013 | `Needs Update` | `create_task`/`createProjectTask` without title → `TASK_TITLE_REQUIRED` (probe run of `project-task-boundaries`, 13 of 16 failed) | add titles; read full Tasks from GraphQL/`get_project_task`; `title` in place of search `summary`; `{name, path}`; `task.json` with `title` |
| `tests/e2e/projects/project-task-boundaries.e2e.test.ts` tool-description assertions | exact tool texts | REQ-002 (descriptions match shapes), AR-002 | `Needs Update` | received text differs (list description rewritten) | assert the shipped texts |
| `tests/e2e/projects/projects-startup-migration.e2e.test.ts` | released per-folder / keys-v1 startup | REQ-005 (titles now run after keys) | `Needs Update` | exact `task.json` comparisons | expect `title` added by the titles migration |
| `tests/e2e/app-data-migrations/remove-built-in-project-task-manager-startup.e2e.test.ts` | retired built-in PTM; repository PTM tool list | — (named in handoff Known Risks) | `Needs Update` if the baseline shows it | handoff Known Risks | update the asserted tool shape |
| `tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | saved Tasks to a peer node (RC-09 …) | REQ-004, REQ-007, REQ-017 | `Needs Update` | creates Tasks without title, reads lists | add titles; first-message Task line on the remote side |
| `tests/e2e/runtime/mcp-runtime-tool-matrix.e2e.test.ts` | each runtime uses every MCP tool kind incl. `create_task` | REQ-001, REQ-004 | `Needs Update` | `create_task` without title | add title |
| `tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts` | Codex sends `send_message_to`; a refusal | REQ-001 (refusal has no receiver) | `Needs Update` | `target_agent_run_id: null` at line 763 | expect the field absent |
| Other `tests/e2e/**` files | unrelated features | — | `Still Valid` unless the baseline shows a failure caused by this change | baseline | none |
| `autobyteus-web/tests/e2e/{projects-feature,project-manager-ux,task-closure-tree,delegated-copies-large-hub,delegated-team-default-collapse,embedding-settings,team-status-live}-probe.mjs`, `project-manager-ux-task-locator-cases.mjs` | renderer journeys on a probe-owned stack | REQ-004, REQ-006 | `Needs Update` | `createProjectTask` input without `title`; tool writes without title; labels asserted from the first line ("summary") | add titles; assert titles where a label is shown; keep Temp-task first-line labels |
| `autobyteus-server-ts/tests/fixtures/project-task-tool-writer.mjs` (used by the projects probe) | external tool writer | REQ-004 | `Needs Update` if it builds the input itself | probe line 273 | pass the title through |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-00 | — | all server E2E | Existing Test (baseline, discovery) | gated `vitest run tests/e2e` on `45a0a7ea08` before any test edit | find every file that fails because of the changed shapes, and any other failure, before editing |
| API-R1 | AC-001–AC-007, AC-009, AC-011–AC-015 | unit, integration, typecheck, web unit, guards | Reused | IMP-01, IMP-03, IMP-04, IMP-05, IMP-06, IMP-07 | ran on `17d631c704` (`010e4eb2ab`/`24fee53dc9` for unchanged packages); `45a0a7ea08` adds only ticket files, and this round changes only E2E files and probes, which those checks do not run |
| API-01 | AC-003, AC-006, AC-007, AC-011, AC-012, AC-001 | real HTTP GraphQL + MCP `tools/call` on a test-owned Studio (`project-task-boundaries`, `project-task-search*`, `projects-graphql`, `project-change-feed`, `project-task-context-files-delegation`, comments, parts) | Durable (update) | per file `vitest run` (gated) | the Project Task tool contract at the real transport; add `get_project_task` key / any case / long ID / other Project / unknown; `create_task` blank/missing title; long title whole; `update_task title`; `attachedContextFiles` path readable |
| API-02 | AC-013, AC-015, AC-001 | delegation and Task journeys (`tests/e2e/projects/*` gated AGY files) | Durable (update) | per file `vitest run` with `RUN_AGY_FAILURE_E2E=1` | preserved Task/delegation journeys keep working with titles and short lists |
| API-03 | AC-004 | built `dist/app.js` startup: keys-v1 then titles; `projects-startup-migration` | Durable (update) | `vitest run tests/e2e/projects/projects-startup-migration.e2e.test.ts` | its exact `task.json` comparisons now include the title |
| API-04 | REQ-001, REQ-004 (preserved) | `remove-built-in-project-task-manager-startup` | Durable (update, if the baseline fails) | `vitest run <file>` | handoff names it |
| API-05 | AC-004, QR-002 | built `dist/app.js` startup, runner ledger, GraphQL, MCP `list_project_tasks`, second start | Durable (add) `tests/e2e/app-data-migrations/project-task-titles-startup.e2e.test.ts` | `vitest run <file>` | migration through the real entrypoint on synthesized released shapes; second start no-op |
| API-06 | AC-012, AC-013, AC-015, AC-014, AC-001 | built `dist/app.js`, real roots, MCP session authority (scripted AGY) and native resolver (emulated LM Studio): task agent, task team coordinator, sub-agent it delegated to, Manager on no Task, existing copy (two open Tasks), described work, damaged run data after restart | Durable (add) `tests/e2e/projects/get-project-task-worker-scope.e2e.test.ts` | `RUN_AGY_FAILURE_E2E=1 … vitest run <file>` | the scope at the real session boundary on both routes; first-message lines on both saved-Task paths; fail-closed with real damaged data |
| API-07 | REQ-004, REQ-007, REQ-017 | two built servers, remote delegation | Durable (update) | `remote-delegation-two-server` (gated) | saved Tasks to a peer still work; the remote first message |
| API-08 | REQ-001, REQ-004 | MCP runtime matrix, AGY lane (and native lane only if LM Studio is free) | Durable (update) | `RUN_AGY_FAILURE_E2E=1 … vitest run mcp-runtime-tool-matrix` | `create_task` with title through each runtime's MCP client |
| API-09 | REQ-001 (refusal), external MCP contract | real Codex CLI (`RUN_CODEX_E2E=1`) | Durable (update) | `codex-standalone-send-message-global-routing` | the one real external MCP client reading the changed `send_message_to` refusal and its `outputSchema` |
| API-10 | regression | every server E2E (gated AGY) | Existing Test | gated `vitest run tests/e2e` after the updates | nothing else broke |
| API-11 | AC-003, AC-005 | browser probes (probe-owned stacks): projects-feature, project-manager-ux (+ locator cases), task-closure-tree, delegated-copies-large-hub, delegated-team-default-collapse, embedding-settings, team-status-live | Durable (update) | `pnpm -C autobyteus-web test:e2e:<name> -- --output-dir <fresh>` | renderer journeys create Tasks with titles and show titles |
| API-12 | AC-003, AC-005 | isolated desktop instance (worktree build): New/Edit Title, board, Task page, right-panel Projects tab, Workspaces-tree Task line of a live worker, delete confirmation | Journey | `pnpm --silent isolated-app start --build`, browser-automation | the surfaces IMP-10 did not reach (panel, live tree) |
| API-13 | AC-008, QR-001 | sizes | Reused (IMP-09) + Temporary Probe | IMP-09; plus an independent after-measure through real MCP HTTP on a built server with synthesized Tasks | delivery's before/after table, with one figure measured at the real transport |
| API-14 | AC-009 | code, wire, UI text, docs | Temporary Probe (grep) | `rg` for Task-one-liner "summary" uses | AC-009 verification is grep + review |
| API-15 | AC-010 | autobyteus-agents skill vs observed results | Temporary Probe (review) | compare `SKILL.md` sentences and `agent-config.json` with the results observed in API-01/API-06 | AC-010 verification is review |

- Test progress log needed: `Yes` ([api-e2e-test-progress.md](api-e2e-test-progress.md)).

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-05 | `autobyteus-server-ts/tests/e2e/app-data-migrations/project-task-titles-startup.e2e.test.ts` | the migration must keep working through the real startup entrypoint (the per-migration startup E2E convention of this folder) |
| API-06 | `autobyteus-server-ts/tests/e2e/projects/get-project-task-worker-scope.e2e.test.ts` | the caller scope is an access rule at the session boundary; only real roots and runtimes give the caller identity |
| API-01 | new cases in `project-task-boundaries.e2e.test.ts` (`get_project_task` reference forms, title refusals, `update_task title`) | the tool contract at real HTTP MCP |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-01/02/03 | `tests/e2e/projects/*` | titles on create; short lists; `title` in search; `{name, path}`; `task.json` with `title`; tool texts | exact list from API-00 |
| API-04 | `tests/e2e/app-data-migrations/remove-built-in-project-task-manager-startup.e2e.test.ts` | per baseline | — |
| API-07 | `tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | titles; short lists | — |
| API-08 | `tests/e2e/runtime/mcp-runtime-tool-matrix.e2e.test.ts` | title on `create_task` | — |
| API-09 | `tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts` | refusal without `target_agent_run_id` | — |
| API-11 | `autobyteus-web/tests/e2e/*.mjs` listed above (and the server's `tests/fixtures/project-task-tool-writer.mjs` if needed) | titles; title labels | — |

## Durable Coverage To Remove

None planned. An assertion that only protects an old shape is updated to the new shape, not kept.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron (`autobyteus-web`), embedded server.
- Testing guideline used: `TESTING.md` "Isolated desktop instance", `docs/isolated-app-instances.md`.
- Web-equivalent behavior: forms, board, Task page, panel, Workspaces tree (browser probes and the instance).
- Shell-specific or lifecycle behavior: none changed.
- Chosen validation approach: browser probes for the journeys they own; one isolated desktop instance for the surfaces IMP-10 did not reach.
- How the run avoids disturbing an already-running desktop application: `isolated-app` own data root, ports and process group; stopped with `stop <instanceId>`.

## Live Environment And Fixture Plan

- Startup order: server build → server E2E files → web probes → isolated desktop.
- Environment choices: clean env (`env -i PATH HOME=<resolved temp> TMPDIR`), `RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs`; the Codex run with the real `HOME`, `USER`, `LOGNAME` (signed-in CLI), as TESTING.md requires.
- Seed data: GraphQL and the agents' tool calls; synthesized released `task.json` files for API-05.
- Evidence to capture: per-case logs with headers, excerpts, probe `result.json` and screenshots, desktop DOM observations.
- Owned processes and temporary state: test temp roots, spawned servers, AGY script processes, emulated LM Studio, probe stacks, the isolated instance.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| AGY and Grok real CLIs showing the model both MCP copies | unchanged by this ticket (design Risks); no paid inference needed | low | No | none |
| Native route with a real LM Studio model calling `get_project_task` | inference is emulated (deterministic tool calls); real-model choice of tools is not this ticket's behavior | low | No | none |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| F-001: with keys-v1 `FAILED` (one unkeyable Project), the prerequisite-gated titles migration stays `NOT_RUN`, so no Project's Tasks are listed until keys-v1 succeeds (preserved behavior: only the unkeyable Project is hidden) | `Design Impact` | `evidence/API-03-startup-migration-keys-failed-titles-not-run.txt`; runner `assertPrerequisites` | Solution Designer (via failure-origin review) |
| F-002: `autobyteus-web/stores/taskWorkerTaskStore.ts` drops `title` from the worker's Task; `taskWorkerTaskLabel` crashes the app (Error 500) on a Project-Task worker's tree row | `Local Fix` | `evidence/API-11c-project-manager-ux-probe.txt`, `evidence/API-11c-PMU-002-error-500-task-worker-row.png` | implementation engineer (via failure-origin review) |
| Existing E2E failing on the base for other reasons | out of scope (follow-ups) | `evidence/API-00b-out-of-scope-failures-base-comparison.txt`, `evidence/API-09-codex-mcp-client.txt` | FU-002 … FU-006 |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added and updated)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: `N/A`
- Notes: API-00 refined the update list before edits (23 files failed on the changed shapes; `remove-built-in-project-task-manager-startup` needed no change). Round 1 ended `Fail` (F-001, F-002); API-11d and API-12 run in the next round.
