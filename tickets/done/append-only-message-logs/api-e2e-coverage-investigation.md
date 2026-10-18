# API/E2E Coverage Investigation — Append-Only Message Logs

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence and the broader-validation decision are in [`api-e2e-execution-coverage-report.md`](api-e2e-execution-coverage-report.md).

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved, SR-004)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-005)
- Design Spec (required on every route): `design-spec.md` (SR-005, `Ready`)
- Supplemental Task Artifacts: `probes/cost.mjs`, `probes/profile.py`, `probes/validate-cost.mts`, `probes/inventory.py` (evidence only); `implementation-design-impact-di-001.md`
- Design Review Report: `design-review-report.md` (ARCH-REV-004, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, Pass 9.4/10)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code review pass CRR-001 from `/software_engineering_team/code_reviewer`, 2026-10-18
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: this document, round 1

All paths are relative to the ticket folder `/Users/normy/autobyteus_org/autobyteus-worktrees/append-only-message-logs/tickets/in-progress/append-only-message-logs/` unless absolute.

## Current Requirement And Design Basis

Every run's message log (standalone hub, team run, organization run, agent task agent, task agent team) is now append-only JSON Lines behind `MessageLog`: `<base>_active.jsonl` plus sealed `<base>_<6 digits>.jsonl`, rotated at 4 MiB. An append writes and syncs one line, and an unfinished last line is ignored and repaired. Reading composes all files in `createdAt` order. The commit path validates only the new message. Readiness requires "the log exists" and retires the JSON names. A new task agent team gets an empty active file. The startup migration `20261018_append_only_message_logs_v1` (registered last) converts every JSON log behind a per-run gate and removes the JSON after an equal read-back. It stays non-terminal while a log-writing predecessor is pending. Logs it cannot use stay JSON with a warning (PRESERVED_*). Released migrations use a frozen JSON module and same-ID repairs R-A..R-D.

What API/E2E must prove beyond the implementer's in-process checks (IMP-01..IMP-10):

- The real built server (`dist/app.js`, the server the desktop app embeds) runs the conversion at startup, with the real runner, ledger database and registry order, on faithful released data. Then it admits the converted runs and serves their complete history over GraphQL (AC-004, AC-006, AC-009).
- AC-008: reference content resolves by `messageId` + `referenceId` over REST for migrated and new messages in every family. Context-file links still open.
- New messages, sent through real HTTP/WebSocket/MCP tool calls, append one line to each owner log in every family, including a converted, rotated log of an old run (AC-001..AC-003 at the system boundary; BEH-001).
- A new task agent team gets an empty log in the new layout (BEH-007).
- After a restart the history is complete, and a second start changes nothing (AC-006, AC-009).
- AC-009: the same on an isolated desktop instance of the worktree build, with a released-format data package and never user data.
- Every existing server E2E suite that touches message logs, startup migrations or the commit path still passes: the handoff's "Not run" list plus the gated scripted-runtime collaboration suites.

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001 (agent delivers a message), SCN-002 (open / restart / restore), SCN-003 (startup conversion + readiness), SCN-004 (open a referenced file), SCN-005 (crash / I/O failure; in-process fault injection only, see Not Tested), SCN-006 (upgrade with released migrations pending).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - RU-1, the most common upgrade: an install on the latest release `v1.5.6-beta.4`, where own-run has already run and the logs are JSON, starts the new build. Trigger: the app starts after an update. The released data package is written by the released app itself in its own isolated instance, so it is real released-runtime output and not hand-built.
  - RU-2: an old run, after conversion, is resumed and messaged. The append goes to a converted log with sealed files. Trigger: the user sends a message to a stopped old run in the UI.
  - RU-3: an install that skipped a release (pre-own-run layout; own-run and ours pending in one start). Trigger: the app starts after an update from an older release.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): none in the requirements. Code review rejected C-02 (a stored-view read during a live rotation) as contrived; it is not tested.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 message persistence (all families, task agents) | Changed | design DS-001, DS-003; IMP-04, IMP-07, IMP-08 | Real appends through the server in each family; line counts per owner log; an append to a converted, rotated log |
| BEH-002 history read / composition | Changed (format), Preserved (list) | DS-002; IMP-05 | GraphQL views after conversion equal the released messages; after restart |
| BEH-003 reference resolution | Preserved | requirements AC-008 | REST reference content for migrated and new messages, each family |
| BEH-004 readiness | Changed | DS-004; IMP-04 | Converted runs are admitted (they open); JSON-kept runs are not admitted, with a warning (R-3) |
| BEH-005 crash / tail repair | Changed | DS-003; IMP-04 | In-process fault injection (IMP-04) reused; no system-level crash injection (Not Tested) |
| BEH-006 startup conversion + released migrations | Added | DS-005; IMP-05, IMP-06 | Built server + real ledger: RU-1 (ours only pending), RU-3 (own-run + ours), production-upgrade E2E |
| BEH-007 new task agent team log | Changed | IMP-04 | Delegation of a team through the real tool; empty `team_communication_messages_active.jsonl` |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `MessageLog`, stores, commit path | IMP-02/04/07/08 unit | none material | — |
| API / transport / contract | Yes (preserved) | GraphQL views, REST reference routes, WS send | none (unit/integration only) | reference resolution and views over converted logs through the HTTP server | Server E2E on the built server |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | Yes (preserved) | history shown in the renderer | none | the renderer shows converted history and new messages | Isolated desktop instance |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes (preserved) | same | none | same | Isolated desktop instance |
| Desktop shell / Electron-specific integration | Yes (startup) | the embedded server runs the startup migration in the packaged app | none | the migration runs in the packaged server with the desktop's data layout | Isolated desktop instance (worktree build) |
| Process / lifecycle | Yes | startup migration ordering, restart, second start | IMP-05/06 (in-process runner harness, in-memory ledger) | the real runner + SQLite ledger + registry in the built server | Server E2E + desktop restart |
| Persisted-data transition | Yes | JSON → JSONL, one-way | IMP-05/06 on synthesized fixtures | released-runtime-written data (RU-1) | Desktop instance with released-app data |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Partly | runtimes deliver messages via MCP tools | none | delivery via real tools | scripted AGY CLI (no inference) |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/append-only-message-logs`, branch `codex/append-only-message-logs`, HEAD `78b42de3ae` (source identical to `201a4933c6`: `git diff --name-only 201a4933c6 HEAD` lists only ticket files)
- Project type and runtime stack: pnpm monorepo; Node 22 Fastify/GraphQL/WS server (`autobyteus-server-ts`), Nuxt renderer + Electron shell (`autobyteus-web`)
- Project testing guideline path(s): `TESTING.md` (root). No closer `TESTING*.md` under `autobyteus-server-ts/`.
- Conflicting, missing, or unclear project instructions: none. TESTING.md says "never run a migration ... on real user data or a copy". The released-app data package for RU-1 is test-made in a test-owned isolated data root, so it complies.
- Required environment variables or secrets available: `N/A`. No provider keys are needed: the scripted AGY CLI `tests/fixtures/agy-failure-cli.mjs` stands in for the model runtime.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | test layers, data rules | Server E2E: `vitest run <file> --no-watch`, clean env (`env -i PATH HOME=<temp> TMPDIR`); built `dist` must be current (`pnpm -C autobyteus-server-ts build`); migrations only on synthesized data in test-owned roots; isolated desktop instance for full journeys; stop what you start; never touch the user's app or data |
| `docs/isolated-app-instances.md` | isolated desktop lifecycle | `pnpm --silent isolated-app start --from-worktree|--app <app> --data-root <owned dir>`, `restart`, `stop <id>`; embedded server gets a system-baseline env only |
| `autobyteus-server-ts/AGENTS.md` | server commands | single file: `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch` |
| `autobyteus-server-ts/src/config/app-config.ts:233-244` | server env loading | `<data dir>/.env` is loaded with `dotenv.config` into `process.env`, so the scripted runtime (`ANTIGRAVITY_CLI_COMMAND`, `AGY_FAKE_CASE`) can be configured inside an isolated instance's own data root |
| `tests/e2e/app-data-migrations/task-agent-own-run-startup.e2e.test.ts` | pattern for a faithful upgrade root on the built server | first start on an empty root records every migration; delete only the pending migrations' ledger rows; write released data; start again |
| `tests/e2e/projects/collaboration-model-contract.e2e.test.ts` | pattern for scripted tool calls | `CALL_TOOL:{name,arguments}` in a user message makes the AGY agent call the real MCP tool (`AGY_FAKE_CASE=linked_skills`) |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | worktree | `pnpm -C autobyteus-server-ts build` | serialized with the Electron build | `server-build exit=0` | — |
| Electron worktree build | worktree | `pnpm -C autobyteus-web build:electron:mac` | several minutes | `electron-dist/mac-arm64/AutoByteus.app` | untracked output |
| Built server (E2E) | `autobyteus-server-ts` | spawned by the test: `node dist/app.js --data-dir <temp> --port 0` | test-owned temp root, SQLite DB in it | `Server listening` + `/rest/health` 200 | SIGTERM/SIGKILL in `afterEach`, temp root removed |
| Released app isolated instance | repo root | `pnpm --silent isolated-app start --app /Applications/AutoByteus.app --data-root <owned dir>` (1.5.6-beta.4) | own ports and data root; the user's running app untouched | `start` JSON `ok:true` | `isolated-app stop <id>` (owned dir kept, deleted by me at the end) |
| Worktree app isolated instance | repo root | `pnpm --silent isolated-app start --from-worktree --data-root <same dir>` | same | same | `isolated-app stop <id>` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Pre-own-run released layout (RU-3) | `tests/fixtures/app-data-migrations/released-task-agent-layout-fixtures.ts` (`writeReleasedDataRoot`), with reference files added | hand-built; test-owned temp root | removed by the test |
| Extra shapes: > 4 MiB org log, empty team run, tree-less old-address team, unreadable JSON log | written by the new E2E test in the released JSON shapes (same keys as the unit fixtures and `inventory.py`) | synthesized | removed |
| Released-runtime data package (RU-1) | runs created by the released 1.5.6-beta.4 app in its isolated instance, through GraphQL/WS with the scripted AGY CLI; then the same extra shapes added by a script, and the org's JSON log grown past 4 MiB with synthesized messages in its own shape | test-owned data root `/tmp/aoml-api/desktop-root`; never `~/.autobyteus` | data root deleted after the evidence is captured |

## Persisted Data Transition Coverage Basis

- Approved decision: `Migration Required`
- Design-spec and implementation-handoff references: design "Persisted Data / State Transition Decision", "Migration Plan" (SR-005); handoff "Persisted Data Transition Check"
- Representative existing-data setup and required behavior: RU-1 data written by the released app (JSON logs as its runtime writes them) plus synthesized shapes; RU-3 hand-built pre-own-run layout. Required: every message kept (same values and order); JSON removed after verification; large logs rotate; logs that cannot be used are kept with a warning; the app starts; a second start changes nothing.
- Evidence planned: built-server E2E (real runner, SQLite ledger, registry) and the desktop instance; on-disk listings before and after; GraphQL views; migration ledger rows and logs.
- Migration-specific completion/recovery scenarios: interruption at each step and retry are proven in-process (IMP-05 F-PARTIAL) and are reused. At system level: second start no-op; restart after new appends.
- Upstream ambiguity or reroute required: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` | production registry on predecessor data; now reads JSONL logs after startup | REQ-007, AC-007 | Still Valid (updated by implementer) | diff in handoff | Run |
| `tests/e2e/app-data-migrations/task-agent-own-run-startup.e2e.test.ts` | own-run on faithful released data through the built server; byte-equality of task agents' memory; second start no-op | REQ-007, AC-007; BEH-006 | Unclear until run (not in the handoff's list; startup now ends with the conversion) | — | Run; if it fails, decide the assertion's validity |
| `tests/e2e/app-data-migrations/collaborators-to-delegated-runs-startup.e2e.test.ts` | collaborators-v1 on released JSON fixtures; startup now converts them | REQ-007 | Still Valid (expected) | handoff | Run |
| `tests/e2e/app-data-migrations/agent-org-token-continuation.e2e.test.ts`, `remove-built-in-project-task-manager-startup.e2e.test.ts` | other startup migrations through the server | registry order | Still Valid (expected) | — | Run |
| `tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts` | Memory Sync over a current team package; fixture now JSONL | R-6 | Still Valid (updated) | diff | Run |
| `tests/e2e/runtime/context-file-startup-recovery.e2e.test.ts` | context-file recovery at startup; attachment fixture now JSONL | REQ-008 | Still Valid (updated) | diff | Run |
| Ungated server E2E (`tests/e2e/**`, gates off) | API journeys over run history, team/org runs, projections | BEH-002/004 regression | Still Valid | — | Run the whole folder |
| Gated context-file process suites (`RUN_CONTEXT_FILE_PROCESS_E2E=1`: `runtime/context-file-startup-recovery`, `runtime/context-file-storage-runtime`) | context-file startup recovery and storage through the built server; startup-recovery's attachment fixture now writes JSONL | REQ-008 | Still Valid (startup-recovery); `context-file-storage-runtime` "converts a copied retained duplicate-address package…" is Out Of Scope: it fails identically on the base because it writes a task agent's files in the pre-own-run layout | found during execution | Run with the gate; out-of-scope failure becomes follow-up FU-API-1 |
| Gated scripted-runtime suites (`RUN_AGY_FAILURE_E2E=1`: `tests/e2e/projects/*`, `agent-org-runs/controlled-org-publication-http`, `agent-team-runs/task-delegation-api-surface`, `runtime/agy-*-transport`, etc.) | real delegation, `send_message_to`, Tasks, task agent teams, reference files across all three families with the scripted AGY CLI | BEH-001, BEH-007, AC-002, AC-008 (new messages) | Still Valid | — | Run the whole folder with the gate on |
| Live provider suites (`RUN_CODEX_E2E`, `RUN_CLAUDE_E2E`, `RUN_LMSTUDIO_E2E`, …) | real inference | none specific | Out Of Scope | the commit path does not depend on the runtime; the scripted runtime drives the same tools | Not run (no credit spend; TESTING.md "Gates") |
| Implementation checks IMP-01..IMP-10 | typecheck, unit, integration, store, migration, measurement | AC-001..AC-007, AC-010 | Still Valid | ran on `265ad100ce`; `git diff --name-only 265ad100ce 201a4933c6` = one integration test (IMP-03b reran it) | Reused |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R1 | AC-010, all | typecheck, unit, integration | Reused | IMP-01, IMP-02 (+IMP-02b), IMP-03 (+IMP-03b) | Ran on `265ad100ce`. Since then only `team-communication-api.integration.test.ts` changed (`201a4933c6`), and IMP-03b reran it. |
| API-R2 | AC-001, AC-002, AC-003, AC-005 | `MessageLog`, commit path, measurement | Reused | IMP-04, IMP-07, IMP-08, IMP-10 | Same commit argument; store-level fault injection is the right layer for SCN-005 |
| API-R3 | AC-004, AC-006, AC-007 | migration + released migrations in runner order (in-process) | Reused | IMP-05, IMP-06 | Same commit argument; fixture table F-* covered |
| API-01 | AC-007, REQ-007 | built server, production registry | Existing Test | `env -i PATH HOME=<tmp> TMPDIR pnpm -C autobyteus-server-ts exec vitest run tests/e2e/app-data-migrations --no-watch` | All startup-migration E2E suites through the built server |
| API-02 | R-6, REQ-008 | Memory Sync, context-file startup | Existing Test | same env, `vitest run tests/e2e/memory-sync tests/e2e/runtime/context-file-startup-recovery.e2e.test.ts` | Changed fixtures |
| API-03 | regression BEH-002/004 | all ungated server E2E | Existing Test | same env, `vitest run tests/e2e --no-watch` | Whole server E2E folder |
| API-04 | AC-002, AC-008 (new messages), BEH-001, BEH-007 | real HTTP/WS/MCP, scripted AGY, all three families | Existing Test | same env + `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs agy-failure-cli.mjs>`, `vitest run tests/e2e --no-watch` (gated suites) | Real delegation and messaging, now persisted by `MessageLog` |
| API-05 | AC-004, AC-006, AC-007, AC-008, AC-009 (server part), REQ-009, BEH-001..004, BEH-007 | built server, real runner + SQLite ledger | Durable | new `tests/e2e/app-data-migrations/append-only-message-logs-startup.e2e.test.ts` (AOML-1, see below) | No system-level test of the conversion, reference resolution or appends on converted logs exists |
| API-06 | AC-009, AC-004, AC-006, AC-008, BEH-001, BEH-007 | isolated desktop instance (worktree build), released-app data package (RU-1) | Journey | prepare data with the released app; start the worktree build on it; open old runs in the UI; send messages in each family; restart; delegate a new task agent team | AC-009 requires the real app; RU-1 is the user's own upgrade path |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

AOML-1 (API-05) steps: build a faithful upgrade root. A first start on an empty root records every migration, then the rows of `20261017_task_agent_own_run_v1` and ours are deleted (RU-3). Write the released pre-own-run layout with reference files on hub, team, org and task-team messages, plus an org JSON log over 4 MiB, an empty team run, a tree-less old-address team and an unreadable JSON log. Start the built server and check:

- own-run and ours reach a terminal status (ours `SUCCEEDED_WITH_WARNINGS`, with warnings for the two kept logs);
- no other JSON log remains, and the org log is rotated with every file ≤ limit + one message;
- the GraphQL views of the hub, team and org list exactly the released messages in `createdAt` order;
- reference content resolves over REST for a migrated message in each family and for a task-team message, and a context-file link opens;
- a new hub run and a new team run send messages through scripted `send_message_to`, and the owner logs grow by one line each;
- a delegated team task agent gets an empty active log, and its new message resolves by reference;
- after a restart the views still hold every message and the logs are unchanged;
- a second start leaves the message-log files unchanged.

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-05 | `autobyteus-server-ts/tests/e2e/app-data-migrations/append-only-message-logs-startup.e2e.test.ts` | The conversion is a one-way startup migration on every install. Only an end-to-end start of the built server proves the runner, ledger, registry order, readiness, views and references together. It sits beside the other startup-migration E2E suites. |

## Durable Coverage To Update

Decided after API-01's first run (5 failures; each assertion was checked against the approved design before any change):

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-01 | `tests/e2e/app-data-migrations/task-agent-own-run-startup.e2e.test.ts` (TAU-1, TAU-2) | The faithful upgrade root also removes the conversion's ledger row; TAU-1 asserts the conversion `SUCCEEDED` and no JSON log left | The root's first start recorded the conversion as `SUCCEEDED`, a state an upgrading install cannot reach (the conversion is non-terminal while own-run is pending) |
| API-01 | `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` (warning scenario) | The JSON log stays unchanged while flat-families fails; assert the conversion `FAILED` with `WAITING_FOR_PREDECESSOR`; exclude its retried row from the unchanged-rows comparison | Design gate and R-3 decide this; the implementer's edit assumed conversion |
| API-01 | `tests/e2e/app-data-migrations/agent-org-token-continuation.e2e.test.ts` | Run the conversion (`convertMessageLogsAsOnStartup`) after the in-process flat-families, before the restore | As a real start does |

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron (`autobyteus-web`), embedded server = `autobyteus-server-ts` dist
- Testing guideline, README, or development instructions used: TESTING.md "Isolated desktop instance", `docs/isolated-app-instances.md`
- Web-equivalent behavior: history shown in the renderer, the composer sending a message, the reference link (served by the same REST route)
- Shell-specific or lifecycle behavior: the packaged embedded server runs the startup migration on the desktop data root; app restart (`isolated-app restart`)
- Chosen validation approach and why it fits the project: an isolated instance of the worktree build on an owned data root (TESTING.md rule 1). The data package is first written by the released `v1.5.6-beta.4` app in its own isolated instance on the same owned root. That is released-runtime output in test-owned data, the most faithful source TESTING.md allows ("what a released build wrote").
- Server/frontend setup when browser validation is used: no separate server; the instance's renderer is driven through its CDP control port (browser-automation attach-only, or the agent browser tools when they can attach)
- How the run avoids disturbing an already-running desktop application: separate instance id, ports and data root. Other instances (`iso-65187-14ae`, `iso-53150-351f`, not mine) are never stopped or restarted. The user's `~/.autobyteus` is never read or written. A listing of `~/.gemini/antigravity-cli` is taken before and after, to show the scripted runtime wrote nothing into the real home.

## Live Environment And Fixture Plan

- Startup order and commands: (1) `isolated-app start --app /Applications/AutoByteus.app --data-root /tmp/aoml-api/desktop-root` (released 1.5.6-beta.4) with `server-data/.env` setting the scripted AGY CLI; (2) create a hub with an agent task agent, a team run with a task agent team, and an org run with a task agent, with messages that carry reference files, through GraphQL/WS on the instance's backend URL; (3) stop; (4) add the synthesized shapes and grow the org's JSON log past 4 MiB in its released shape; (5) `isolated-app start --from-worktree --data-root <same>`; (6) UI journey; (7) `isolated-app restart`; (8) checks; (9) stop and delete the root.
- Environment choices that materially affect the run: the scripted AGY CLI (no inference); `AGY_FAKE_CASE=linked_skills`
- Health / readiness checks: `isolated-app start` JSON; `/rest/health`; `getAppDataMigrations`
- Seed data / fixtures: as above; every file in the owned root
- Test identities, authentication, permissions, or session state: none
- Requirement-linked journeys or scenarios: RU-1, RU-2, SCN-002, SCN-003, SCN-004, BEH-007
- Evidence to capture: migration ledger rows and log; on-disk listings before and after; DOM text of the opened runs; screenshots; REST reference responses; owner-log line counts before and after sends; instance logs
- Owned processes and temporary state to clean up: the two isolated instances, `/tmp/aoml-api/desktop-root`, the E2E temp roots

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| A process killed mid-append in a live app (SCN-005) | A kill cannot be timed to land inside one `write` on the real server. The crash shapes (torn tail, failed write/truncate/sync) are proven by injected file operations in `message-log.test.ts` (IMP-04, reused), which is the boundary where they occur. | low | No | none |
| Rotation reached by live messages | 4 MiB of real messages is impractical. Instead, a converted log that is already rotated receives live appends (API-05, API-06), and rotation itself is IMP-04. | low | No | none |
| Conversion on the user's real 113 MB data | TESTING.md forbids it. The synthesized profile is covered (IMP-07, API-05 > 4 MiB log). | low | Yes (the user's own check after the beta, DEC-001) | delivery informs the user |
| Live provider runtimes | Inference does not touch the commit path. The scripted runtime calls the same tools. | low | No | none |

## Ambiguities Or Reroute Triggers

None at investigation time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (API-05 added; three E2E tests updated after API-01, see above)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: the Electron worktree build runs in the background while the server E2E runs (the server dist build finished first; the builds are serialized).
