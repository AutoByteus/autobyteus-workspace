# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

All paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-tree-open-tasks-only-469/`; the ticket folder is `tickets/in-progress/collaboration-tree-open-tasks-only-469/`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved; SR-004 baseline, wording at SR-005, REQ-007/AC-009 restated at SR-008)
- Investigation Notes: `investigation-notes.md` (A-1 … A-8, B-1 … B-8)
- Solution Revision Record: `solution-revision-record.md` (SR-001 … SR-008)
- Design Spec (required on every route): `design-spec.md` (SR-008)
- Supplemental Task Artifacts: `evidence/unlink-cases-2026-11-10.txt`, `evidence/links-without-task-2026-11-10.txt`, `evidence/team-tab-messages-2026-11-10.txt`; `follow-ups.md`
- Design Review Report: `design-review-report.md` (ARCH-REV-005, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code review pass CRR-001 (Large / High), from `/software_engineering_team/code_reviewer`
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: this file, round 1

Code under test: branch `codex/collaboration-tree-open-tasks-only-469`, base `origin/personal` `bff4faa6f6`, code commits `832f0a4572` and `42652879b3` (`7ec463393b` and later commits are ticket documents only).

## Current Requirement And Design Basis

A top run (standalone Agent run, Team run, Org run) no longer stores a list of its local delegated runs. Its tree is composed in memory from the Task records: a local delegated run is in the tree while it has an open Task entry naming this top run (D-1, D-2). A save writes own files and the remote links; it leaves out a stored local entry only when it has the exact link key set and its run's own file exists (D-3, SR-008). Startup admission and the history-index repair read only a run's own parts (D-11). In a loaded root, a run is dropped after a confirmed stop and added back from its own file inside the reopen step (D-4). The Team tab, the Memory page and a standalone run's token total read closed runs from their own files (D-5 … D-7). The web reloads a view for a "reopened" run it does not hold and names a past participant from its address (D-8).

What must be proven, by acceptance criterion: AC-001 … AC-003 per root kind on a real stack (closure leaves the tree and the file; reopen + run-ID message and follow-up Task bring it back, live in the web); AC-004 (two Tasks); AC-005 (temporary Task stays; no-Task run absent with its folder intact and listed on the Memory page; unreadable Task record hides its runs with a warning naming the Task, back when readable); AC-006 (token total unchanged by a closure); AC-007 (an earlier attachment of a dismissed run opens); AC-008 (full server start with Team and Org runs whose trees list local runs); AC-009 (upgrade read/load/save per shape); AC-010 (a load reads no file of a closed run); AC-011 (Team tab rendered before/after closure and after restart); AC-012 (Memory page lists a dismissed run).

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001 … SCN-006, all `Supported Normal Scenario`.
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - RU-1 (from SCN-006 + SCN-001): an upgraded top run whose old tree file still lists links is loaded, then used (a new delegation or a closure), which is the first save after the upgrade. Trigger: the user opens the run and sends its manager a message.
  - RU-2 (from MP-002, ARCH-REV-005): an install whose released migration `20261017_task_agent_own_run_v1` is interrupted still completes at the next start. Trigger: server start (covered by the existing `task-agent-own-run-startup.e2e.test.ts` TAU-2 and the migration unit test).
  - RU-3 (from SCN-004 and C-06): after a closure, the user keeps the Team tab of the manager open while the view rebuilds; then reloads, then restarts the app.
  - RU-4 (from D-12, remote links): a top run with a link to a run on another node still lists it and the node-to-node delegation still works (existing `remote-delegation-two-server.e2e.test.ts`).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): none recorded. C-03, C-04 (code review) were rejected as not reachable through a supported workflow; not tested.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 delegation writes own file only | Changed (no link written) | D-3; handoff trace | Tree file on disk after a delegation holds no local entry (probe extension, API-E02) |
| BEH-002 closure removes the run from tree and file | Changed | D-1, D-4; AC-001, AC-004 | Real stack per root kind; tree file read on disk |
| BEH-003 load reads only open runs | Changed | D-2; AC-010 | Unit read counts (IMP-01) + a real-start probe that makes closed runs' own files unreadable |
| BEH-004 reopen / follow-up by run ID | Preserved outcome, new mechanism | D-4; AC-002, AC-003 | Real stack per root kind, live web and after restart |
| BEH-005 Team tab | Preserved (new data path `pastParticipants`) | D-5; AC-011 | Rendered Team tab before/after closure and after restart |
| BEH-006 Memory page | Preserved (new rule) | D-6; AC-012 | GraphQL memory explorer on a real server after closure and after restart |
| BEH-007 token total, attachments, Team/Org load | Preserved | D-7, D-11; AC-006 … AC-008 | Real server totals with recorded usage; real start of an upgraded data root |
| Persisted tree files (REQ-007) | Changed (obsolete content ignored, dropped at next save) | Persisted Data decision; D-3 | Real start on upgraded data root, file hashes before/after read and after save |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Task-side source, compose/split, lifecycle steps | IMP-01, IMP-06 | Behavior across a real server, its stores and the Task records loaded at startup | Server E2E (scripted AGY) |
| API / transport / contract | Yes | GraphQL `collaborationParticipantMessages.pastParticipants`; contract DTO | IMP-04, IMP-06 | Real HTTP/WS with a closed run | Server E2E, browser probe |
| Frontend component / state | Yes | identity `past`; unknown "reopened" reload | IMP-05, IMP-07 | Real event sequence from a real backend | Browser probe |
| Browser integration / user journey | Yes | Tree rows leave and return; Team tab | none rendered | All of it | Browser probe on a probe-owned real stack |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes (same renderer) | as frontend | — | — | Browser probe (web-equivalent) |
| Desktop shell / Electron-specific integration | No | No Electron main, preload or packaging change | — | — | None |
| Process / lifecycle | Yes | Server start (admission before Task records), restart, root load and restore | Admission test at readiness-index level | Full start of the built server on upgraded data | Built server start (`dist/app.js`) |
| Persisted-data transition | Yes | Tree files lose local entries at the next save | Store unit tests per shape | A real start, read, load and save on an upgraded data root | Built server E2E on test-owned data |
| Worker / queue / distributed coordination | Yes | Drop/add inside the root's command queue; remote links | Unit membership tests | Real AGY processes stopping and resuming | Server E2E; existing two-server remote delegation E2E |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-tree-open-tasks-only-469`
- Project type and runtime stack: pnpm monorepo; Node/TypeScript server (`autobyteus-server-ts`, Fastify, GraphQL, WebSockets, Vitest), Nuxt web (`autobyteus-web`), Electron desktop.
- Project testing guideline path(s): `TESTING.md` (repository root; no closer `TESTING*.md` on the changed paths).
- Conflicting, missing, or unclear project instructions: none. The requirements name an "isolated instance" for AC-001 … AC-003, AC-006, AC-007, AC-009, AC-011, AC-012. The isolated desktop instance passes only a system-baseline environment to its embedded server, so the scripted AGY CLI (`ANTIGRAVITY_CLI_COMMAND`) cannot reach it, and only a real model could drive delegations there. The probe-owned real stack (built `dist/app.js` + Nuxt + Chrome, `test:e2e:task-closure-tree`) exercises the same server and renderer with deterministic agents; no Electron shell code changed. Recorded as the chosen surface (Desktop Application Validation Plan).
- Changed build-input paths (`git diff --name-only bff4faa6f6...HEAD` against TESTING.md "Fresh-start build"): `autobyteus-collaboration-stream-contracts/**` (src, dist, tests) and `autobyteus-server-ts/typecheck-baseline.json`. Fresh-start build case API-F01 is planned.
- Required environment variables or secrets available: `N/A`. No real provider is needed (scripted AGY CLI).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global testing strategy | Layers and commands; scripted AGY (`ANTIGRAVITY_CLI_COMMAND`, `RUN_AGY_FAILURE_E2E=1`); clean env for E2E (`env -i … HOME=<resolved temp>`); one heavy run at a time; built `dist/app.js` for built-server suites; fresh-start build rules; never user data |
| `AGENTS.md` (root) | Repository rules | Follow DESIGN/TESTING/RELEASE; test vault only for real keys (not needed) |
| `autobyteus-server-ts/package.json`, root `package.json` | Scripts | `pnpm test:e2e` = `vitest run tests/e2e` in the server; `build`; `test:integration:prepare` |
| `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` header | Browser probe | Needs `pnpm -C autobyteus-server-ts build`, Chrome; `--output-dir <fresh>`, `--cases`; owns its stack and cleans up |
| `autobyteus-server-ts/tests/e2e/helpers/collaboration-root-harness.ts` | E2E harness | Real Agent/Team/Org roots on an in-process Studio server with the scripted AGY CLI |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/task-agent-own-run-startup.e2e.test.ts` | Built-server start pattern | Spawns `dist/app.js` with `builtServerLaunchEnvironment()` on a test-owned data root |
| `.github/workflows/release-desktop.yml`, `release-server-docker.yml` | Release jobs | Fresh-start build commands (TESTING.md "Fresh-start build") |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | repo root | `pnpm -C autobyteus-server-ts build` | Serialized; one heavy run at a time | `EXIT 0`, `dist/app.js` | — |
| In-process Studio server (E2E) | `autobyteus-server-ts` | started by the test (`startStudioE2eRuntimeServer`) | Test-owned temp data dir | test helpers | test `afterAll` |
| Built server (E2E) | `autobyteus-server-ts` | spawned `dist/app.js --data-dir <temp> --port 0` | Test-owned data root | `listening` in output, GraphQL answers | SIGTERM/SIGKILL in `afterAll`; data root removed |
| Probe stack | `autobyteus-web` | `pnpm -C autobyteus-web test:e2e:task-closure-tree --output-dir <fresh>` | Free ports, private data root, headless Chrome | probe's own checks | probe `finally` + cleanup receipt in `evidence.json` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent/Team/Org roots with delegated runs and Tasks | Created through GraphQL and the managers' scripted `CALL_TOOL` messages (real tools) | Test-owned temp data roots only; never `~/.autobyteus` | Removed by the test/probe |
| Old-build tree entries (local links, older Org entry, full record without own file, link without own file, remote link) | Hand-built entries written into the test-owned tree files after the runs exist, with the released key set (`taskExecutionLinkOf` at `bff4faa6f6`; shapes in `evidence/unlink-cases-2026-11-10.txt`) | Synthesized, never copied from user data (TESTING.md "Migrations and upgrades") | Removed with the data root |
| A run with no Task record | A delegated run whose Task record entry is removed from the test-owned `agent_run_resources.json`, which is what a run delegated before Task records existed looks like | Test-owned data | Removed with the data root |
| Token usage | Scripted AGY replies carry a `usage` object when `AGY_FAKE_REPLY_USAGE` is set (durable fixture addition) | Deterministic, no provider | — |
| Node credential | `builtServerLaunchEnvironment()` / harness | Never printed | — |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design-spec "Persisted Data / State Transition Decision", D-3 (SR-008); handoff "Persisted Data Transition Check".
- Representative existing-data setup and required behavior: a test-owned data root with a standalone run, a Team run and an Org run, each with a closed-Task run, an open-Task run, a no-Task-record run, a link without own file and a full record without own file in its tree file, plus a remote link (Agent) and an older Org entry in a configured Team's list. Start: admitted; read: open runs + remote link, nothing written; first save after a load: only remote link, full record and link without own file remain, in place; own files byte-identical.
- Evidence planned: API-E02 (built server start, file hashes, GraphQL trees); store unit tests (IMP-01) for every shape per kind; `task-agent-own-run-startup.e2e.test.ts` (TAU-1/TAU-2) inside API-E01 for the released migration.
- Migration-specific completion/recovery scenarios: N/A (no migration). MP-002 (interrupted released migration) is proven by the migration unit test and TAU-2.
- Upstream ambiguity or reroute required: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| Server unit suite (IMP-01), incl. new `open-delegated-run-trees.test.ts`, `task-execution-tree-membership.test.ts`, `task-execution-open-delegated-runs.test.ts`, `closed-delegated-run-reader.test.ts`, `root-run-package-admission-own-parts.test.ts` | Compose, save rule per shape, read counts, membership, admission | AC-001, AC-004, AC-005, AC-009, AC-010, D-11 | Still Valid | Code review CRR-001 traced them | Reuse IMP-01 |
| Server integration (IMP-06) | Team manager, delegation lifecycle, context files, Team-tab API | AC-001, AC-007, AC-011 | Still Valid | Ran on `42652879b3` | Reuse IMP-06 |
| Web specs (IMP-05, IMP-07), contracts (IMP-04), typechecks (IMP-02, IMP-03) | DTO, past identity, reopened reload | AC-002, AC-011 | Still Valid | Ran on `832f0a4572`/`42652879b3` | Reuse |
| `tests/e2e/projects/task-closure-root-visibility.e2e.test.ts` | Closure hides runs in every root view (wire) | AC-001 | Still Valid (expected) / Unclear until run: it may read stored trees | Not run by implementation | Run in API-E01 |
| `tests/e2e/projects/task-reactivation-root-visibility.e2e.test.ts` | Reopen + run-ID message reactivates, three kinds | AC-002 | Still Valid (expected) | Not run | Run in API-E01 |
| `tests/e2e/projects/task-existing-copy-assignment.e2e.test.ts` | Follow-up Task by run ID, three kinds | AC-003 | Still Valid (expected) | Not run | Run in API-E01 |
| Other `tests/e2e/projects/*`, `run-history/*`, `app-data-migrations/*` (`task-agent-own-run-startup`, `team-run-v1-production-upgrade`, `collaborators-to-delegated-runs-startup`), `memory/*`, `remote-collaboration/*`, `agent-team-runs/*`, `agent-org-runs/*` | Delegation, restore, migrations on released shapes, memory listing, remote links | AC-005, AC-007, AC-008, AC-012, D-9, D-12 | Still Valid (expected); any test asserting stored local links becomes `Needs Update` | Not run | Run in API-E01 (whole server E2E) |
| `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` BR-001 … BR-016 | Rendered closure, reactivation, follow-up Task, restarts, damaged Task data | AC-001 … AC-003, AC-005 (unreadable record), AC-011 (message kept) | Still Valid (expected); BR-016 `Unclear` (DEC-010 now hides the runs of an unreadable record) | Not run | Run in API-B01; extend (below) |

### Validity decisions after API-E01's first run (round 1)

The first full server E2E run (17 failing files) settled the `Unclear` and expected rows above. Each failing file was classified as one of:
- `Needs Update`: stale under D-2/D-4, DEC-006, DEC-008, DEC-010;
- a test process without a bound source;
- a fixture gap: the released data lacked the Task records real installs keep;
- a baseline wording drift from base commits `40b9d79e1e` and `432d1c3af2`.

All were updated except EXC-E2E-007. It stays `Still Valid`: it asserts an agent-facing text that the requirements preserve, and it fails. The full triage, with the cause of each, is in the execution report ("API-E01 triage"). BR-016 (`Unclear` above) passed unchanged.

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R01 | AC-001, AC-004, AC-005, AC-009, AC-010 (unit parts) | Server unit | Reused | IMP-01 | Ran on `832f0a4572`; `42652879b3` changed integration tests only |
| API-R02 | — | Server and web typecheck, contracts | Reused | IMP-02, IMP-03, IMP-04 | Same commit; no source change since |
| API-R03 | AC-002 (DS-R1), AC-011 (web logic) | Web specs | Reused | IMP-05, IMP-07 | IMP-07 ran on `42652879b3` |
| API-R04 | AC-001, AC-007, AC-011 (in-process) | Server integration | Reused | IMP-06 | Ran on `42652879b3` |
| API-E01 | AC-001 … AC-005, AC-007, AC-008, AC-012; D-9, D-12; regressions | Real Studio server HTTP/WS/MCP, scripted AGY | Existing Test | `env -i PATH HOME=<resolved temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e` | No E2E ran on this change; tree storage is read by every root and the contracts changed (TESTING.md: rerun all) |
| API-E02 | AC-005, AC-006, AC-008, AC-009, AC-010, AC-012 | Built server start on an upgraded test-owned data root; GraphQL; files on disk | Durable (new) | `tests/e2e/run-history/open-task-tree-upgrade-startup.e2e.test.ts` (same env as API-E01) | No test starts the server on data whose trees list local runs; the admission test runs at readiness-index level only |
| API-B01 | AC-001, AC-002, AC-003, AC-004 (Task B vs A), AC-005 (temporary Task, unreadable record), AC-011 | Probe-owned real stack: built server, Nuxt, Chrome | Existing Test + durable extension | `pnpm -C autobyteus-web test:e2e:task-closure-tree --output-dir <fresh>` (all 16 cases) | The only rendered journey per root kind with restarts |
| API-F01 | Release build of a changed build input | Fresh clone, frozen install, desktop build job | Existing (release job) | TESTING.md "Fresh-start build", macOS ARM64 desktop command | Contract `dist/` and `typecheck-baseline.json` changed |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-E02 | `autobyteus-server-ts/tests/e2e/run-history/open-task-tree-upgrade-startup.e2e.test.ts` | AC-008 and AC-009 at a real server start; AC-010 at a real load; AC-006 and AC-012 across closure and restart. The design asked for this server-start test ("Guidance For Implementation", last bullet) |
| API-E02 | `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`: `AGY_FAKE_REPLY_USAGE` | Lets a scripted run record token usage, so AC-006 compares non-zero totals |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-B01 | `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` | (1) After a closure, the root's tree file on disk holds no local entry (AC-001). (2) Team tab: the closed worker's row keeps the counterpart name before and after the closure, without a lasting gap (C-06), and after reload and a real restart (AC-011) | Narrow additions to BR-001 … BR-003 and BR-005 |

## Durable Coverage To Remove

None planned. Any E2E assertion found asserting stored local links is updated, not removed, and recorded here.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron wrapping the Nuxt renderer and the embedded Node server.
- Testing guideline used: `TESTING.md` "Choosing the path", "Browser probes", "Isolated desktop instance".
- Web-equivalent behavior: everything this change makes visible (tree rows, Team tab, live reload on "reopened") is renderer + server behavior.
- Shell-specific or lifecycle behavior: none changed (no Electron main, preload, IPC, packaging or embedded-server-start code in the diff).
- Chosen validation approach and why: the probe-owned real stack (built server, Nuxt dev, headless Chrome) with the scripted AGY CLI. It drives real delegations deterministically and restarts the real backend. The isolated desktop instance cannot receive the scripted CLI (system-baseline environment) and would need a real model to delegate.
- Server/frontend setup: owned by the probe (free ports, private data root, `AUTOBYTEUS_ALLOWED_ORIGINS`, launch credential).
- How the run avoids disturbing an already-running desktop application: separate ports, data roots and processes; the user's AutoByteus (`/Applications/AutoByteus.app`, `~/.autobyteus`) is never touched.

## Live Environment And Fixture Plan

- Startup order and commands: server build → API-E01 (whole server E2E) → API-E02 → API-B01 probe → API-F01 fresh clone build. One heavy run at a time.
- Environment choices that materially affect the run: `env -i` with a resolved temp `HOME`; `RUN_AGY_FAILURE_E2E=1`; `ANTIGRAVITY_CLI_COMMAND` absolute path.
- Health / readiness checks: the suites' and probe's own.
- Seed data / fixtures: created through public APIs and the agents' real tools; hand-built old tree entries as above.
- Test identities: the test launch credential.
- Requirement-linked journeys: as in Planned Cases.
- Evidence to capture: command output headers and summaries, probe `evidence.json` and screenshots, server log excerpts, file listings and hashes.
- Owned processes and temporary state to clean up: temp data roots, spawned servers, the probe stack, the fresh clone.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| The Electron shell around these journeys | No shell code changed; the isolated instance cannot run the scripted CLI | Low | No | None |
| Signing, notarization and non-macOS release builds | Need the release runner | Low (no change to them) | No | Delivery's release run |
| The user's real data after the upgrade (145-entry hub) | Never loaded by tests (TESTING.md) | Medium (volume only; shapes are covered) | Yes (on upgrade) | Delivery to tell the user what to watch |

## Ambiguities Or Reroute Triggers

None at planning time. Execution found F-1, F-2, F-3 (execution report, "Failures Found"), routed for failure-origin review.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added and updated)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: the plan is updated in place if a run changes a validity decision.
