# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-002, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-002, Ready)
- Supplemental Task Artifacts: `episodic-catalog-contract.md` (SR-002, behavior-defining), `follow-ups.md` (FU-001, FU-002)
- Design Review Report: `design-review-report.md` (ARCH-REV-004, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001` (on completion)
- Current Investigation Round: 3
- Trigger: round 1: code review CRR-001 Pass; round 2: CRR-003 Pass of IR-002 (SR-003), resolving round 1's API-09 failure; round 3: CRR-005 Pass of IR-003 (TR-001: a standalone run's definition from its metadata alone)
- Prior Investigation Reviewed: round 1 (this file, API-REV-001)
- Latest Authoritative Investigation: this file, round 3
- Code validated: branch `codex/per-agent-episodic-catalog`, code at `0be36462ef` (HEAD `89f35132ed` adds only ticket docs)

## Current Requirement And Design Basis

An episodic folder per agent definition, `<memory>/episodic/<encodeURIComponent(id)>/catalog.md`, plus `<memory>/episodic/index.md`, rendered exactly as `episodic-catalog-contract.md` §2–§3. Entries carry only start → last activity, run id, the current Project Task's title, workspace, and the journal folder with each file's name, range and size (or "no journal yet"); no conversation text and nothing from DEC-013's exclusion list. The catalog is rebuilt in the background at every server start (reading only; writing only changed files under `episodic/`), follows journal changes (5 s quiet / 30 s max, so ≤ 60 s) and committed deletes of agent, team and org runs; archive changes nothing; failures are logged and never reach runs (REQ-012). Both composition roots (studio, standalone application host) own an instance.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (read the files), SCN-002 (live journal changes), SCN-003 (delete / archive), SCN-004 (server start build); code review's SCN-005 (older manifests).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - **SCN-A1 team-local agent** (AC-001 alternate): the founder's agents are team-local (`team-local-agent:<team>:<agent>`), authored as files in a team folder and loaded with the app's "reload agent packages" (`reloadAgentPackageDefinitions`). Trigger: a run of a team built from such a folder.
  - **SCN-A2 server stopped inside the debounce window**: a turn ends and the user quits the app within 5 s; `stop()` drops the pending refresh, so the next start must bring that entry up to date (the real form of AC-007(b) "one run changed while stopped").
  - **SCN-A3 run from before Work Journals**: a run folder with raw traces and records but no `work_journal/` (the founder has such runs). Trigger: server start. Built from a test-owned run by removing its journal folder while stopped.
  - **SCN-A4 older manifest shape** (= SCN-005): the manifest records the runtime once per manifest, not per entry. Built from a test-owned run's manifest while stopped (synthesized shape, TESTING.md "small synthesized data"; no real data copied).
  - **SCN-A5 damaged team record** (AC-009 "a run's records are damaged"): a team run's stored execution tree is unreadable at start. Trigger: server start.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): none recorded by the designer. CF-09 (a `..` definition id) is code review's contrived case; not tested.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 catalog files per definition | Added | REQ-001…003, REQ-010, REQ-011; contract §1–§2 | E2E: files exist at the encoded path for shared and team-local ids, contract-exact lines |
| BEH-002 live upkeep | Added | REQ-005; DS-001 | E2E on a live server: turn → entry updated ≤ 60 s; new run → new entry; burst → few writes |
| BEH-003 delete / archive | Added | REQ-006; DS-002 | E2E through GraphQL for agent, team, org: delete removes, archive and refused delete change nothing |
| BEH-004 start build | Added | REQ-007, REQ-008, REQ-010; DS-003 | E2E with restarts of the built server: build from nothing, no change, changes while stopped; nothing outside `episodic/` changes |
| BEH-005 privacy | Added | REQ-004 | E2E with markers in every conversation channel and the Task description |
| BEH-006 index.md | Added | REQ-009 | E2E reads `index.md` lines; renderer unit test (IMP-01) |
| Run-folder discovery moved (memory search) | Changed (placement) | design Task Design Health | Existing memory search suites (unit + e2e) |
| `readJournalSpans`, `readManifestJournalFileNames` | Added | CF-01 | Unit (IMP-01) + E2E older-manifest case |
| Run services' delete | Changed (one call) | DS-002 | Existing run-history suites + E2E |
| Journals, memory search, archive/delete, Memory Sync, semantic memory | Preserved | AC-011 | Whole server unit, integration and E2E suites |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | catalog owner, builder, renderer, store, discovery, spans | IMP-01/06 unit tests with fakes (`FakeNode`, fake discovery) | real attribution from real team/org trees and Task records; real timing | Server E2E on a test-owned server |
| API / transport / contract | Yes | the files themselves are the contract (agents read them); GraphQL delete/archive triggers | renderer unit tests vs contract | real GraphQL deletes reaching `runDeleted`; real file content from real runs | Server E2E |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | No | no UI (requirements) | — | — | — |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | the embedded server is the same `buildStudioServer` | — | — | none needed (same composition root as the E2E server) |
| Process / lifecycle | Yes | background start pass, debounce timer, stop at close, both composition roots | lifecycle unit test (standalone host), catalog unit tests | real server start/stop/restart of `dist/app.js` | Built-server restarts in the E2E |
| Persisted-data transition | Yes | new derived files (`Discard or Rebuild`); existing files `Not Affected` | IMP-07 probe over a clone (no server start) | a full server start writing nothing outside `episodic/` | Before/after listing around real server starts |
| Worker / queue / distributed coordination | Yes (in-process queue) | debounce queue | unit tests with small timings | production timings (5 s / 30 s) on a live server | E2E with default timings |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/per-agent-episodic-catalog`
- Project type and runtime stack: pnpm monorepo; server `autobyteus-server-ts` (Node 22, Fastify, GraphQL, Vitest)
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/per-agent-episodic-catalog/TESTING.md` (no closer `TESTING*.md` under `autobyteus-server-ts/`)
- Conflicting, missing, or unclear project instructions: **AC-010 vs TESTING.md.** AC-010 asks for a copy-on-write clone of the founder's memory "on an isolated instance"; TESTING.md (Environments, credentials and data) says "never run a migration, startup or conversion on real user data or a copy of it". Decision: no server start on a clone (the rule wins; a start needs the owner's decision). AC-010's measurement is reused from IMP-07 (the catalog build alone over the clone, on the same code commit), and the server-start part of AC-010 is proven on test-owned data. Recorded in Not Tested.
- Changed build-input paths: `None` (`git diff --name-only origin/personal...HEAD` has no manifest, lockfile, tsconfig, baseline, scripts, prisma, docker, workflow or contract-package path, and no new cross-package import). No fresh-start build case.
- Required environment variables or secrets available: `N/A` (scripted AGY CLI, no provider)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` § Test layers, Choosing the path | layers | Backend → server tests + server E2E; both typechecks; whole unit/integration green |
| `TESTING.md` § Environments | isolation | E2E with `env -i PATH HOME=<resolved temp> TMPDIR`; Node 22; one heavy run at a time; `dist/` must be current for `dist/app.js` |
| `TESTING.md` § Runtimes without a model | scripted runs | `ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs`, `RUN_AGY_FAILURE_E2E=1`; `CALL_TOOL:{…}` drives real tools |
| `TESTING.md` § Node credentials | node access | in-process: `startStudioE2eRuntimeServer`; spawned `dist/app.js`: `builtServerLaunchEnvironment()` |
| `TESTING.md` § Data (migrations) | real data | never start a server on real data or a copy; synthesize small shapes from test-owned data |
| `tests/e2e/helpers/collaboration-root-harness.ts` | harness | agent/team/org roots, definitions, delegation, `stopServer()` leaves the data dir for a second process |
| `tests/e2e/run-history/standalone-unreadable-tree-containment.e2e.test.ts` | pattern | restart = spawn `dist/app.js --data-dir <same>`; ready on `Server listening on 127.0.0.1:0`; GraphQL listener probe |
| `autobyteus-server-ts/AGENTS.md` | package rules | read; no conflicting rule |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | `autobyteus-server-ts` | `pnpm -C autobyteus-server-ts build` | before the restart cases | `dist/app.js` newer than `0be36462ef` | — |
| In-process studio server | test process | `startCollaborationHarness` | test-owned temp data dir | harness returns URL | `h.stopServer()` / `h.close()` (removes data dir) |
| Built server process | `autobyteus-server-ts` | `node dist/app.js --data-dir <same> --host 127.0.0.1 --port 0` | same data dir; own output captured | output line + GraphQL probe | `SIGTERM`, wait for exit |
| Scripted AGY CLI | — | `ANTIGRAVITY_CLI_COMMAND` | `AGY_FAKE_CASE=linked_skills` (harness) | `--version` | process ends with its run |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent, team, org definitions | GraphQL `create*Definition` (harness) | test-owned data dir | removed with the data dir |
| Team-local agent | team folder files (`team.md`, `team-config.json`, `agents/<id>/agent.md`) + GraphQL `reloadAgentPackageDefinitions` (the app's reload) | test-owned data dir | removed with the data dir |
| Projects and Tasks | GraphQL `createProject`, `createProjectTask`; `delegate_task` by `task_id` | marker text in the Task description | removed |
| Older manifest, no-journal run, damaged team tree | edit test-owned run files while the server is stopped | shapes synthesized from test-owned runs (TESTING.md); no real data | removed |
| Owner credential | `tests/setup/test-launch-credential.ts`, `builtServerLaunchEnvironment()` | never printed or stored | — |

## Persisted Data Transition Coverage Basis

- Approved decision: `Discard or Rebuild` for `<memory>/episodic/**`; `Not Affected` for every existing file
- Design-spec and implementation-handoff references: design-spec § Persisted Data / State Transition Decision; handoff § Persisted Data Transition Check
- Representative existing-data setup and required behavior: real runs made on a test server; then a start with no `episodic/` folder (rebuild), a start with stale/edited catalogs (heal), a start with no change (nothing written); older manifest shape read as it is
- Evidence planned: before/after listing (path, size, mtime) of every file under `<memory>` outside `episodic/` around each server start; inode + mtime of every catalog file
- Migration-specific scenarios: N/A
- Upstream ambiguity or reroute required: none

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-episodic-catalog/*` (4 files, new) | renderer vs contract §2.5/§3; builder privacy and AC-013; store write-if-changed; owner lifecycle, debounce, delete, containment | AC-001, AC-007, AC-008, AC-009, AC-013 | Still Valid | read; IMP-01 | Reuse (IMP-01/06) |
| `tests/unit/agent-memory/run-folder-discovery.test.ts` (moved) | attribution of every family, `MemoryRun` mapping unchanged | REQ-001, AC-011 | Still Valid | IMP-06 | Reuse |
| `tests/agent-work-journal/services/work-journal-reading.test.ts` | spans; older manifest names-only read | REQ-002, SCN-005 | Still Valid | IMP-06 | Reuse |
| `tests/unit/run-history/services/run-delete-episodic-catalog.test.ts` | committed delete calls `runDeleted` once; refused and archive call nothing (3 kinds) | AC-005 (unit) | Still Valid | IMP-06 | Reuse |
| `tests/unit/standalone-application-host/standalone-application-host-lifecycle.test.ts` | host creates, passes, starts, stops the catalog | both roots | Still Valid (updated by implementation) | IMP-06 | Reuse |
| `tests/e2e/memory/memory-search-graphql.e2e.test.ts`, `work-journal-neutral-vocabulary.e2e.test.ts`, `agent-definitions/agent-semantic-memory.e2e.test.ts` | memory search, journal, semantic memory (imports follow the move) | AC-011 | Still Valid | IMP-09 | Rerun in the whole E2E suite |
| `tests/e2e/helpers/e2e-run-history-services.ts`, `run-history/archive-run-history-graphql.e2e.test.ts`, `agent/standalone-error-termination-lifecycle.e2e.test.ts`, `tests/integration/api/run-file-changes-api.integration.test.ts` | construct run services with the no-op catalog | AC-011 | Still Valid (mechanical update) | diff | Rerun in the whole suites |
| Whole server unit / integration / E2E suites | preserved behavior | AC-011 | Still Valid | — | Run |
| `skill-folder-watcher.test.ts`, `agent-package-folder-watcher.test.ts` | folder watchers (failed under load in IMP-04/05) | AC-011 | Still Valid (not in the change's import closure) | IMP-05 | Rerun when the host is quieter; find the cause if they fail (Rule 9) |

No test asserted behavior this change made untrue beyond those the implementation already updated (search of `tests/` for `memory-run-discovery`, `MemoryRunDiscovery`, `HEADER_FIRST_DAY`, `MEMORY_SEARCH_DISCOVERY_SOURCE_FAILED`, `folderRun`, `runKeyOf`: no remaining hit; checked in the report).

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-008, AC-013 (unit), AC-007 work counts, AC-009 (unit) | catalog units | Reused | IMP-01 / IMP-06 | ran on `0be36462ef`; no source changed since (`git diff --name-only 0be36462ef HEAD` lists only `tickets/`) |
| API-02 | QR-002, AC-010 (measurement) | catalog build over a clone of real data | Reused | IMP-07 (and IMP-08 privacy on the same clone) | same commit; no server start on a clone (TESTING.md); see Not Tested |
| API-03 | AC-011 | both typechecks | Reused | IMP-02, IMP-03 | same commit, logs readable |
| API-04 | AC-001, AC-002, AC-003, AC-013, REQ-011 | live server, real runs of every kind, files | Durable | `episodic-catalog.e2e.test.ts` EC-01 | the attribution, Task title and privacy across real records are only mocked in units |
| API-05 | AC-004 | live upkeep, production debounce | Durable | EC-02 | real journal writes → real timer → file |
| API-06 | AC-005 | GraphQL delete/archive of agent, team, org; refused delete | Durable | EC-03 | the three services reach `runDeleted` only through real deletes |
| API-07 | AC-009 (hand edit live, unwritable folder) | live server | Durable | EC-04 | containment on a real server: runs and journals continue |
| API-08 | AC-007 (a)(b), AC-009 (edited at start), SCN-A2 | built server restart | Durable | EC-05 | real `dist/app.js` start pass |
| API-09 | AC-006, SCN-A3, SCN-A4, SCN-A5, QR-004 | built server start with no `episodic/` | Durable | EC-06 | rebuild from nothing; listing outside `episodic/` unchanged |
| API-10 | AC-007 (a) pure | built server restart with no change | Durable | EC-07 | nothing written |
| API-11 | AC-011 | whole server unit suite | Existing Test | `pnpm -C autobyteus-server-ts test:unit` | preserved behavior |
| API-12 | AC-011 | whole server integration | Existing Test | `test:integration:prepare` then `test:integration` | preserved behavior; one integration file changed |
| API-13 | AC-011 | whole server E2E suite | Existing Test | `pnpm test:e2e` (clean env) | four e2e files and a shared helper changed |
| API-14 | AC-011 | the two folder-watcher files | Existing Test | `vitest run <two files>` on the quietest host available | IMP-04/05 residual |
| API-16 | AC-011 | server typecheck with the new test file | Durable (check) | `pnpm -C autobyteus-server-ts typecheck` | added during execution: the new TypeScript test file must stay within the test-file baseline |
| API-15 | AC-012 | docs | Docs review | read `agent_episodic_catalog.md`, `agent_memory.md`, `GLOSSARY.md` against the contract | AC-012 is "Docs review" |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-04 … API-10 | `autobyteus-server-ts/tests/e2e/memory/episodic-catalog.e2e.test.ts` (design names it; gated `RUN_AGY_FAILURE_E2E=1`, needs a current `dist/` for EC-05…EC-07) | the only test that runs the real composition root, real records, real journal writes, real deletes and real restarts together; it guards the contract, privacy and write scope for later changes |

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Live Environment And Fixture Plan

- Startup order and commands: build `dist/`; run the E2E file with `env -i PATH HOME=<resolved temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs fixture>`; the file starts an in-process server, later spawns `dist/app.js` on the same data dir three times.
- Environment choices that materially affect the run: production debounce (5 s / 30 s); Node 22.23.1; shared, loaded host (other agents' suites running).
- Health / readiness checks: harness readiness; spawned server's `Server listening on 127.0.0.1:0` + GraphQL probe.
- Seed data / fixtures: GraphQL definitions, Projects, Tasks; a file-authored team with a team-local agent; runs driven by the scripted AGY actor.
- Requirement-linked journeys: EC-01…EC-07 above.
- Evidence: the catalog and index files at each step, listings, inode/mtime tables, write counts, server output lines, written as JSON/Markdown by the test (`EPISODIC_CATALOG_E2E_EVIDENCE_DIR`).
- Owned processes and temporary state to clean up: in-process server, spawned server processes, scripted AGY processes, temp HOME and data dir.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| AC-010 as written: a **server start** on a clone of the founder's memory | TESTING.md forbids a startup on real user data or a copy; the build alone was measured over the clone (IMP-07, 9.9 s / 3.4 s) | a start on ~4,000 real runs could differ from the build alone (Task titles, other start work in parallel) | Yes (his data; his approval and backup are already delivery gates) | the founder's first start on his node, after his approval and a backup (delivery gate) |
| Task-title lookups at real-data volume | the clone has no Task records; measuring needs real Task records with a server start (same rule) | a slower start pass on his node | No (measurable on synthetic volume if needed) | recorded residual risk |
| Standalone application host's catalog | host is not driven by the E2E harness; its wiring is proven by the lifecycle unit test (fake catalog) and shares `createEpisodicCatalog` with the studio | low | No | — |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| A damaged team record (unreadable `team_run_execution_tree.json`) is left out of the catalogs silently: the shared run-package admission index records a diagnostic and logs nothing, so no warning names the run (AC-009 / REQ-012, DESIGN.md rule 7). Found by API-09 in execution | `Design Impact` (preliminary) | execution report API-09 and § Preliminary Classification | `/code_reviewer` failure-origin review |

Execution notes that refined the plan (no change of scope):
- EC-02's burst: scripted turns finish 7–11 ms after their message, so the test spaces the four turns 2 s apart (inside the 5 s quiet window), as a working run's turns come.
- EC-05 is the data dir's first `dist/app.js` start (the in-process server runs no app-data migrations); its listing allows only the run-history index migrations' files outside `episodic/`. EC-06 and EC-07 allow no change at all.
- E's catalog (an agent with no runs left) is correctly not rebuilt once `episodic/` is gone (contract §1: a definition with runs or an existing catalog folder).

## Round 2 Plan (CRR-003, code `159286c1c1`)

- Rerun by impact: IR-002 changes discovery, the journal span read and the catalog owner; every case exercises them, so every case is Rerun (build, the E2E file, unit, server typecheck), plus integration and the whole E2E suite, which were Next Round. Reused: IMP-10 (catalog/discovery units), IMP-12 (web typecheck), IMP-14/15 (AC-010 build over a clone, privacy), all on `159286c1c1`.
- EC-06 extended for IR-002's outcomes: damaged team tree (warning code now asserted), damaged org tree, damaged standalone `run_metadata.json` (left out with a warning: the readiness index does not admit it, so its history row is not offered), non-JSON journal manifest (`EPISODIC_CATALOG_RUN_LEFT_OUT`).
- Round 1's Ambiguity (damaged record without a warning) is resolved by IR-002.

## Round 3 Plan (CRR-005, code `1324c3e8f4`)

- Delta: `agentRuns` in `run-folder-discovery.ts` only (plus its unit test and the module doc). Rerun: build, the E2E file (EC-06 asserts run A's outcome; title and one comment updated), the server typecheck, and API-17 (unit files outside IMP-16's scope that reach discovery). Reused: IMP-16, IMP-17, IMP-18. Still valid: the rest of the unit, integration and whole E2E suites (they never construct discovery, or reach it only through the catalog's background pass without reading its output; the delta changes attribution values, not I/O or flow).

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: AC-010's server-start-on-clone part is not run (TESTING.md); see Not Tested. Execution result: `Fail` on API-09 (see the execution report).
