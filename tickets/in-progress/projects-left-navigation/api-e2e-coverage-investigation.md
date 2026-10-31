# API/E2E Coverage Investigation — projects-left-navigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/requirements-doc.md` (R4; REQ-008 / DEC-013 / AC-007 refined in SR-008)
- Investigation Notes: `…/tickets/in-progress/projects-left-navigation/investigation-notes.md` (E-001…E-042)
- Solution Revision Record: `…/solution-revision-record.md` (SR-001…SR-009)
- Design Spec: `…/design-spec.md` (SR-009)
- Supplemental Task Artifacts: Product `ui-ux-spec.md` and VIS-001…VIS-025 in `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/projects-left-navigation/` (normative for AC-017); `follow-ups.md` (FU-001…FU-005)
- Design Review Report: `…/design-review-report.md` (ARCH-REV-003 Pass)
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Implementation Handoff: `…/implementation-handoff.md` (IR-002)
- Implementation Revision Record: `…/implementation-revision-record.md`
- Code Review Report: `…/code-review-report.md` (CRR-002 Pass)
- Code Review Revision Record: `…/code-review-revision-record.md`
- Delivery Revision Record: N/A (first API/E2E entry)
- API/E2E Revision Record: `…/api-e2e-revision-record.md` (created with the first result)
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code reviewer's CRR-002 pass, HEAD `e1d9a58a13` (code commits `97706524b1`, `2f3cb2f411`, `dacdceed36`, `467cff24c0`)
- Prior Investigation Reviewed: none
- Latest Authoritative Investigation: this round

(`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation`.)

## Current Requirement And Design Basis

- The left panel gets a `Workspaces | Projects` switch (REQ-001). Projects mode lists the node's Projects. Each expands to its runs grouped like a workspace (REQ-002): runs started under it plus top-level runs that host any assignment of its Tasks (REQ-003).
- An Agent or Team can be started under a Project from a Project's "+", a group's "+" or the New chat chip (REQ-004). Its folder is the Project's first linked folder, else the temp workspace, unless the user picked one (REQ-005). It is told its Project in a `## Project` system-instruction section on all five runtimes, at start, restore and for Team members (REQ-006, DS-005).
- Delegated rows under a root are scoped to the Project (REQ-008, DEC-013):
  - P's Task work, plus Temp-task work only when the root was started under P;
  - a copy holding open Tasks of P and Q is listed under both; after P's Task closes, only under Q.
- Closure removes rows live; reopen plus the assigner's message brings them back (REQ-009). Every listed run opens beyond the Workspaces cap of 6 (REQ-010). The mode is live and re-reads after reconnect (REQ-011). Archive and delete work as in Workspaces, and a group "Archive all" is scoped to the Project (REQ-014). A deleted Project leaves Projects mode (REQ-013).
- Storage (SR-009): `projects/<projectId>/project_runs.json` is a new Projects-owned file, the only record of "started under". Run metadata, index rows and Team trees keep the released keys. An unknown Project at start is refused with `PROJECT_NOT_FOUND` before any run record.
- Code review residual risks to close here:
  - the `## Project` text in a live run, on restore and for a Team member;
  - a Team appearing after one re-read (AC-005);
  - the multi-Project copy's Task line under P;
  - the Org scope filter;
  - real delegation, closure, the cap and the desktop journey (AC-006, 008, 009, 014).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001…SCN-011. SCN-010 (remote delegated run) is covered only by the shared scope rule (local and remote copies are linked by the same Task link step, E-024) and the existing remote-row tests. No peer node is stood up (see Not Tested).
- Real-use scenarios added from the implementation:
  - RU-01, the web's real start path: the first send on a New chat draft creates the run through `prepareAgentRun` (Agent) or `createAgentTeamRun` (Team) with `projectId`. Trigger: typing and sending in the start surface.
  - RU-02, the Project is deleted between choosing it and sending. Trigger: Project Delete on the Projects page while a draft is open. This proves `PROJECT_NOT_FOUND` at start.
  - RU-03, a run started under a Project whose Project is later deleted, then restored. Trigger: open and send after the delete. The `## Project` section must be omitted (`contextOfRun` → null).
  - RU-04, a backend restart while Projects mode is shown. Trigger: the desktop server restarting, or a node restart.
- Contrived scenarios (not tested): none recorded by the designer.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 switch, Projects tree | Added | REQ-001/002, DS-006/007 | Web tests reused (IMP-07); browser journey |
| BEH-002 start under a Project, record, `## Project` | Added | REQ-003…006, DS-001/002/005 | Server E2E through real GraphQL plus the AGY capsule prompt; browser start journeys |
| BEH-003 scoped delegated rows, live | Added | REQ-007/008/011, DS-003/004 | Real `delegate_task` (scripted AGY) in server E2E and the browser |
| BEH-004 closure / reopen | Preserved (new surface) | REQ-009 | Real closure in the browser and the server E2E |
| BEH-005 folder rule | Added | REQ-005 | Web tests reused; browser start; server check of the run's folder |
| BEH-006 open beyond cap | Added | REQ-010 | Server E2E with more than 6 runs; browser open |
| BEH-007 archive / delete | Preserved + group scope | REQ-013/014 | Browser journeys; server E2E |
| BEH-008 live / reconnect | Added | REQ-011 | Browser with a real backend restart |
| Run-record files (rollback) | Preserved | SR-009, IMP-10 | Reused IMP-10; server E2E asserts no `projectId` in metadata or index rows |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `ProjectRunService`, `runLinksOf`, `ProjectRunHistoryService` | IMP-06 unit tests (132) | Real Task records written by real delegation; composition load order | Server E2E (real HTTP/GraphQL/WS, scripted AGY) |
| API / transport / contract | Yes | `projectRunHistory`, `projectId` inputs, `PROJECT_NOT_FOUND` | IMP-08/11 dev-stack curls | Team input path, refusal codes through GraphQL, joins after archive and delete | Server E2E |
| Frontend component / state | Yes | stores, projection, tree, chip | IMP-04/07 | Real feed events and real server scopes | Browser probe on a real stack |
| Browser integration / user journey | Yes | full Projects mode | IMP-09 (no delegation) | Delegation, closure, cap, Team start, archive in Projects mode | Browser probe (real backend, scripted AGY) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | same renderer | as above | — | Browser probe |
| Desktop shell / Electron-specific | No code change | Strip label only (renderer) | — | The integrated journey in the packaged build (AC-014) | Isolated desktop instance |
| Process / lifecycle | Yes | composition load before the supervisor; restore prompt | IMP-11 restart listing | Restore of a real run; reconnect re-read | Server E2E restore; browser backend restart |
| Persisted-data transition | Yes (additive) | `project_runs.json` | IMP-06, IMP-10, IMP-11 | — | Server E2E file assertions |
| Worker / queue / distributed | Partly | remote delegated rows (SCN-010) | shared rule tests | A real peer node | Not stood up (see Not Tested) |
| External integration | Yes | the five runtime composers | IMP-06 composer unit tests | A real runtime's received instructions | AGY capsule prompt (real backend path; scripted CLI) |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation`, branch `codex/projects-left-navigation`.
- Project type: pnpm monorepo; `autobyteus-server-ts` (Fastify, type-graphql, Vitest); `autobyteus-web` (Nuxt 3, Pinia, Vitest, Electron).
- Testing guideline: `TESTING.md` (root; no closer `TESTING*.md` under `autobyteus-server-ts` or `autobyteus-web`). It sets:
  - real delegation through the scripted AGY CLI (`ANTIGRAVITY_CLI_COMMAND=…/agy-failure-cli.mjs`, `RUN_AGY_FAILURE_E2E=1`);
  - browser probes with a probe-owned real stack;
  - the isolated desktop instance for full product journeys;
  - one heavy run at a time;
  - never the user's running app (`/Applications/AutoByteus.app` is running, PID 80546; untouched).
- Conflicting instructions: none. The isolated instance's embedded server receives only a system-baseline environment, so `ANTIGRAVITY_CLI_COMMAND` reaches it only through the data root's own `.env` (the server loads it with `dotenv` before it imports runtimes; `app.ts` initializes config first). This is to verify at start.
- Secrets: not needed. Scripted runtime only; no provider credits are spent.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global test strategy | Layers and commands above; Rule 2 (never the user's app); one heavy run at a time; rerun by impact |
| `AGENTS.md` (root) | Repository rules | Follow TESTING / DESIGN / RELEASE |
| `docs/isolated-app-instances.md` | Desktop instance | `pnpm --silent isolated-app start --build`, `stop <id>`, `--data-root`; CDP control port |
| `autobyteus-web/electron/server/serverRuntimeEnv.ts` | Isolated server environment | Baseline names only; login-shell PATH |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Scripted AGY | `AGY_FAKE_CASE=linked_skills`; `CALL_TOOL:{…}` |
| `autobyteus-server-ts/tests/e2e/helpers/collaboration-root-harness.ts` | Server E2E harness | `promptOf(runId)` reads the AGY capsule's composed prompt; `reopenRoot` |
| `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` | Probe template | Built `dist/app.js` + Nuxt dev + Chrome + scripted AGY; real backend restart |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server E2E | `autobyteus-server-ts` | `env -i PATH HOME=<tmp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs> pnpm exec vitest run <file> --no-watch` | In-process Studio server, temp data dir | Test setup | `afterAll` removes the data dir |
| Server build | `autobyteus-server-ts` | `pnpm build` | Needed by the browser probe | `dist/app.js` | — |
| Browser probe | `autobyteus-web` | `pnpm test:e2e:projects-left-navigation --output-dir <fresh>` | Own ports, data root, Nuxt and backend process groups, Chrome | GraphQL ready, Nuxt 200 | Probe `finally`; cleanup receipt in `evidence.json` |
| Isolated desktop instance | repo root | `pnpm --silent isolated-app start --build --data-root <own dir>` | Packaged worktree build | `start` JSON | `pnpm --silent isolated-app stop <id>`; `list` shows none |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent / Team / Org definitions, Projects, Tasks, folders | Public GraphQL mutations (as the app does) | Test-owned data roots only | Removed with the data root |
| Real delegation | Scripted AGY `CALL_TOOL` → real scoped MCP `delegate_task` / `update_task` / `send_message_to` | No provider inference | — |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected` for existing data; a new additive file per Project (SR-009).
- References: design spec § Persisted Data / State Transition Decision; implementation handoff § Persisted Data Transition Check.
- Representative existing data: runs started in Workspaces that dispatched Tasks of three Projects, with no `project_runs.json` anywhere, read by the new `projectRunHistory` (AC-002, SCN-005). This is created by the current build through the public API, which writes the released shapes; IMP-10 proves the readers and writers are byte-identical to the base.
- Evidence planned:
  - the server E2E asserts the exact `project_runs.json` shape and that metadata and index rows carry no `projectId`;
  - existing runs appear under the Projects they served with no data change;
  - reused IMP-10 for rollback reading.
- Migration-specific scenarios: N/A.
- Reroute: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| IMP-06 server tests (`project-run-service.test.ts`, `project-run-history-service.test.ts`, `task-execution-resource-service` `runLinksOf`, provisioning order, Team manager, composer paths, `run-records-rollback-shape.test.ts`) | Units of the new server rules | REQ-003/004/006/008/010/013 | Still Valid | IMP-06 at `467cff24c0` | Reuse |
| IMP-07 web tests (`projectRunsStore`, `projectRunsProjection`, scope filter, draft folder rule, mode store, switch, `ProjectsRunsTree`, chip) | Units and components | REQ-001/002/004/005/008/011/014 | Still Valid | IMP-07; only a comment moved since | Reuse |
| `tests/e2e/projects/collaboration-prompt-wording.e2e.test.ts` | Complete collaboration prompt views per role | Prompt composition (the `## Project` insertion must not change runs that are not under a Project) | Still Valid | Gated suite | Run as regression |
| `tests/e2e/projects/task-closure-root-visibility`, `task-reactivation-root-visibility`, `task-existing-copy-assignment`, `ad-hoc-task-delegation`, `projects-graphql`, `project-change-feed` | Closure, reactivation, follow-up Tasks, Temp tasks, Projects API, feed | BEH-004, BEH-003 preserved | Still Valid | Gated suites | Run as regression |
| `tests/e2e/run-history/*`, `tests/e2e/agent-team-runs/*` | History listing and Team creation over GraphQL | Preserved Workspaces history; Team creation input changed | Still Valid | — | Run as regression |
| `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` | Workspaces tree closure | REQ-013 preserved Workspaces | Still Valid | — | Out of scope to rerun (Workspaces rows unchanged; IMP-04 covers the shared row components). Reconsidered if the new probe finds a shared-row problem |
| `WorkspaceAgentOrgDelegatedRows.spec.ts` | Org delegated rows | Org scope filter (REQ-008) | Still Valid; no scope case | Handoff "Not run" | Add a scoped case (API-03) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R01 | all server | server unit | Reused | IMP-01 (+ IMP-01b) | Ran at `467cff24c0`; `git diff --name-only 467cff24c0 HEAD` touches only `tickets/` |
| API-R02 | — | server typecheck | Reused | IMP-02 | Same commit, same reason |
| API-R03 | all web; REQ-015 | web suite, typecheck, guards, new web tests | Reused | IMP-03, IMP-04, IMP-05, IMP-07 | Ran at `dacdceed36`; since then only a moved doc comment in `utils/runTreeProjection.ts` |
| API-R04 | AC-002/003/007/009 units; rollback | server new tests; rollback shape | Reused | IMP-06, IMP-10 | Ran at `467cff24c0` |
| API-01 | AC-002, 003, 004 (server), 005 (server), 006 (server), 007, 008 (server), 009 (server), 012 (server); RU-02, RU-03 | real GraphQL/WS, scoped MCP, Projects files, AGY capsule prompt | Durable | `tests/e2e/projects/project-run-history.e2e.test.ts` (gated `RUN_AGY_FAILURE_E2E`) | Real Task records and real composition; the units mock both sides of the ports |
| API-02 | Preserved behavior: prompt, closure, reactivation, follow-up, Temp tasks, history, Team creation | existing gated server E2E | Existing Test | the folders `tests/e2e/projects`, `tests/e2e/run-history`, `tests/e2e/agent-team-runs` with the gate | The prompt composer, run creation and history listing changed underneath them |
| API-03 | AC-007 (Org rows), REQ-008 | web component | Durable | Org scope case in `WorkspaceAgentOrgDelegatedRows.spec.ts` | Handoff names the gap |
| API-04 | AC-001, 002, 003, 004, 005, 006, 007, 008, 009, 010, 011, 012, 013 (part), 015, 016, 017 (part) | Browser on a real stack (built backend, Nuxt dev, Chrome, scripted AGY) | Durable | `pnpm -C autobyteus-web test:e2e:projects-left-navigation --output-dir <fresh>` (new probe `tests/e2e/projects-left-navigation-probe.mjs`) | The UI journeys with real delegation; the repository's probe convention |
| API-05 | AC-014 (and AC-003 folder and AC-017 in the packaged build) | Isolated desktop instance of the worktree build | Journey | `isolated-app start --build --data-root <own>`; drive through CDP with a ticket-owned driver; stop | Integrated desktop journey; scripted runtime, labeled |
| API-06 | AC-017 | Rendered screenshots vs VIS-001…VIS-025 | Journey | Screenshots from API-04/API-05 compared side by side with the references | Visual fidelity |

- Test progress log needed: Yes.

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-01 | `autobyteus-server-ts/tests/e2e/projects/project-run-history.e2e.test.ts` | The only server proof of scopes from real Task records, the prompt on restore and for Team members, and the cap with real runs |
| API-03 | `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentOrgDelegatedRows.spec.ts` (new case) | The Org scope filter is untested |
| API-04 | `autobyteus-web/tests/e2e/projects-left-navigation-probe.mjs` and the `test:e2e:projects-left-navigation` script | Projects-mode journeys with real delegation; repeatable by delivery and later tickets |

## Durable Coverage To Update

None planned.

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Shell: Electron; the change is renderer and server only (no main, preload or IPC change).
- Web-equivalent behavior: API-04 on Nuxt dev with the built server.
- Shell-specific: none changed. AC-014 asks for the integrated journey in the worktree build: API-05.
- Approach: `pnpm --silent isolated-app start --build` with an own `--data-root` whose server `.env` sets the scripted AGY CLI; drive the renderer over the instance's CDP control port with `playwright-core` `connectOverCDP`.
- Avoiding disturbance: the user's running app (PID 80546) and its data are never touched. The instance has its own ports and data root, and `stop` ends only its own process group.

## Live Environment And Fixture Plan

- Order: server `pnpm build` → API-01/API-02 (in-process) → API-04 probe (own stack) → electron build → API-05.
- Environment choices: scripted AGY (`linked_skills`); locale en-US, plus zh-CN for AC-013; viewports 1440×900 and 600×800.
- Seed: definitions (Manager with the Project tools, Writer, Checker, a Team, an Org), Projects P (one linked folder), Q (no folder), R (two folders), Tasks of P, Q, R, all through public GraphQL.
- Evidence: per-case JSON, DOM assertions, screenshots, backend logs, the stored `project_runs.json`, the composed prompts.
- Cleanup: probe data roots, process groups, Chrome; isolated instance stopped and `list` checked.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| SCN-010 remote delegated run on a peer node | A second node needs a Docker or remote setup beyond this change's surface; remote copies use the same Task link step (E-024) and the same scope key (`transientRowCopyKey` uses `remote.runId`) | Low | No | None |
| `## Project` on Codex, Claude, ACP/Grok and native with a live model | Real runtimes need paid or local models; the composer is shared and unit-tested on all five paths (IMP-06); AGY proves the real composition path end to end | Low | No | None |
| Paid-provider inference under a Project | Not required; the scripted runtime proves the transport (AC-014 note) | — | No | None |

## Ambiguities Or Reroute Triggers

None found before execution.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added: API-01, API-03, API-04)
- Reroute Required Before Validation Execution: `No`
- Notes: case order follows TESTING.md (narrow first, one heavy run at a time).

## Updates During Execution (round 1)

- **API-04 drafts.** API-04 picks the AGY model in each draft (a target switch keeps the earlier model, CR-004). It runs under `env -i` and strips provider credentials, after the first run inherited the shell's `*_API_KEY` variables; no provider call was made.
- **AC-011 scope.** The reconnect proof covers what Projects mode owns (listing re-read, last good tree, a Project change made after the restart). The run's own stream after a restart is existing behavior shared with Workspaces mode (FU-008).
- **API-05 build.** The DMG step of `isolated-app start --build` failed on `hdiutil` (environment), so the unpacked app of the same build was started with `--from-worktree`.
- **New in-scope finding.** PLN-09: Stop is not reflected in Projects mode (AC-012, REQ-011/014). Classification: `Local Fix`; see the execution report.
- **Out-of-scope findings.** FU-007 (existing-copy race, API-02) and FU-008, added to `follow-ups.md`.
