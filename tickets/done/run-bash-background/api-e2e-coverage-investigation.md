# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved, SR-005)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-005)
- Design Spec (required on every route): `design-spec.md` (Ready, SR-005)
- Supplemental Task Artifacts: `prototype/wrapper-skeleton-probe.{sh,log}`, `prototype/kill-pid-probe.{mjs,log}`, `prototype/background-completion.prototype.test.ts` + `prototype-run.log`, `options-report.md`, `agents-package-files-naming-background-tools.txt`
- Design Review Report: `design-review-report.md` (ARCH-REV-003, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-002)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-002, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code reviewer, CRR-002 Pass (2026-11-10); code reviewed `374e35a60e..ddd594d07b`
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: this file, round 1

All paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/run-bash-background/tickets/in-progress/run-bash-background/` unless they start with a package name.

## Current Requirement And Design Basis

Every `run_bash` call runs through one command wrapper (`command-wrapper.ts`). The call returns at the foreground end; `&` jobs still running become background tasks (`backgroundTasksStarted`), `run_in_background: true` returns `{pid, status: running, effectiveCwd, outputFile}` at once, and `kill <pid>` stops the whole background command (REQ-001, REQ-007, REQ-011). Each end is reported once: in the agent's own `run_bash` result (`backgroundTasksEnded`, REQ-015) or in one batched SYSTEM notice from `BackgroundTaskNoticeService` (sender `system.background_task_notifier`, header `[Platform notice — background tasks finished]`), which waits for a busy run's turn to end and wakes an idle run after a 2 s settle (REQ-002 to REQ-005). Output goes to `<os tmpdir>/autobyteus-background-tasks/<agentId>/call-*.log`, read with `tail` (REQ-006, QR-004). The native backend publishes `BACKGROUND_TASK_UPDATED` and `hasRunningBackgroundTasks` (REQ-010, panel and delegated idle shutdown). Run end stops the commands and removes the output folder, with no notice (REQ-009). Stop leaves background commands running (REQ-014). The four background tools are removed; definitions naming them still start (REQ-008). The journal renders `Command: … (background)` and `Notice:` (REQ-012).

Acceptance criteria AC-001 to AC-013 are the proof targets. Critical: AC-001, AC-002, AC-003, AC-005, AC-006, AC-010 (the user's DEC-006), AC-013 (preserved). The open assumption ASM-002 (models read output with `tail`) is validated with a live model here.

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001 to SCN-012, all `Supported Normal`.
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - RU-01: a model that reads the `outputFile` path from the start result and passes it to `tail` in a later `run_bash` call (the path crosses the model boundary as text). Trigger: the start result in the model's next request.
  - RU-02: a background command killed by something other than the agent's own `run_bash` while the agent is idle (another terminal, OOM killer). The end is a signal and must arrive as a notice (AC-002 alternate "signal endings are named"; design R-B fallback). Trigger: `kill` from outside the agent.
  - RU-03: a dev server started with a real `npm run dev` (npm → `sh -c` → node → child node), the shape AC-005 names.
  - RU-04: the notice's last lines compared with the output file's tail on Linux (code review C-02/C-03).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 `run_in_background` start | Added | REQ-001, DS-001 | live and scripted start through the real server; timing < 2 s |
| BEH-002 end reported with exit code/signal, duration, last lines | Added | REQ-002, DS-002 | notice text read from the model's next request |
| BEH-003 idle wake | Added | REQ-003, DS-004 | idle notice ≤ 5 s after the end |
| BEH-004 output file + `tail` | Added (replaces `get_process_output`) | REQ-006 | `tail` while running and after the end; file under the OS temp area |
| BEH-005 `kill <pid>` stops everything | Added | REQ-007 | `npm run dev` kill, process table check |
| BEH-006 four tools retired | Removed | REQ-008 | tools absent from the model's tool list; definition naming them starts |
| BEH-007 run end stops commands | Changed | REQ-009 | Terminate: group gone ≤ 10 s, no notice, folder removed |
| BEH-008/009 panel + idle shutdown | Added for native | REQ-010 | `BACKGROUND_TASK_UPDATED` frames, `agentBackgroundTaskView`, delegated copy kept |
| BEH-010 per-run list | Added | REQ-013 | notice's `Still running:` list; unit tests |
| BEH-011 Stop keeps background | Preserved | REQ-014 | Stop during a foreground call |
| BEH-012 stored definitions | Preserved | REQ-008 | definition with retired names starts, unchanged |
| BEH-013 journal | Changed | REQ-012 | journal file of a real run |
| BEH-014 `&` jobs as tasks | Changed | REQ-011 | `(sleep 2; exit 7) &`, kill of a job, job with children, `disown` |
| Every foreground `run_bash` call (wrapper) | Changed | design R-0 | R-0 suite reused (macOS, Linux); WSL not available |
| Shutdown fixtures | Changed (test) | handoff | run both once |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | manager, notice service, reporter, cleanup step | IMP-02/03/04/06/07 (manager and wrapper with real processes; notice service with a fake `AgentRun`) | the service never ran against a real `AgentRun` and native turn | in-process server E2E with a scripted model |
| API / transport / contract | Yes | `run_bash` schema/results seen by the model; `BACKGROUND_TASK_UPDATED`; `SYSTEM_TASK_NOTIFICATION`; `agentBackgroundTaskView` | unit tests of the mapping | what the model receives (tool list, results, notice) and what the WebSocket carries | E2E reading the provider requests and WS frames |
| Frontend component / state | No (no web change) | — | existing panel probe (fixture data) | native payloads in the real panel | real panel journey |
| Browser integration / user journey | Yes (panel rows for native) | existing panel, new producer | none for native | the panel showing a native run's rows | isolated desktop instance |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes (same as panel) | — | — | — | isolated desktop instance |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes | wrapper ending, run end stop, Stop, server shutdown | IMP-02/08 | real server Terminate, SIGTERM, standalone host | shutdown fixtures; E2E Terminate |
| Persisted-data transition | Yes (Directly Usable — No Migration) | stored definitions, journals | IMP-06 bootstrapper and translation tests | a real run started from a definition naming the tools | E2E |
| Worker / queue / distributed coordination | Yes | delegated copy idle shutdown | unit (quiet check input) | a real delegated copy with a running command | E2E delegated team |
| External integration | Yes | real model reading the tool contract (ASM-002) | none | whether models use `tail` and wait for the notice | live model E2E |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-bash-background`, branch `codex/run-bash-background`
- Project type and runtime stack: pnpm monorepo; Node 22; `autobyteus-ts` core library, `autobyteus-server-ts` (Fastify/GraphQL/WebSocket, Prisma SQLite), `autobyteus-web` (Nuxt/Electron); vitest
- Project testing guideline path(s): `/TESTING.md` (root). No closer `TESTING*.md` under `autobyteus-ts/` or `autobyteus-server-ts/`.
- Conflicting, missing, or unclear project instructions: none
- Changed build-input paths: `None` (`git diff --name-only 374e35a60e...HEAD` contains no manifest, lockfile, tsconfig, scripts, contract package, workflow or Prisma path, and no new workspace-package import). No fresh-start build case.
- Required environment variables or secrets available: `Yes` (test vault READY: Anthropic, OpenAI, DeepSeek and others; values never read)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/AGENTS.md` | repository rules | test vault only (`AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault`); never keys from env/.env |
| `/TESTING.md` | testing guideline | layers and commands; `test:integration:prepare` then `test:integration`; E2E and live suites with `env -i PATH HOME=<resolved temp> TMPDIR`; one heavy run at a time; never the user's app or data; stage paths explicitly |
| `autobyteus-server-ts/package.json`, `vitest.config.ts` | server scripts | `exec vitest run <file> --no-watch`; e2e runs with isolation setup files and the test DB |
| `autobyteus-server-ts/tests/e2e/helpers/native-runtime-live-harness.ts` | in-process studio server for native runs | GraphQL + agent WebSocket as the desktop app; records outgoing provider POSTs (not localhost) |
| `autobyteus-server-ts/tests/e2e/shutdown/*.e2e.test.ts` headers | gated shutdown suites | need `pnpm -C autobyteus-server-ts build`; `RUN_BUSY_STOP_NOW_E2E=1`, `RUN_NATIVE_STANDALONE_SHUTDOWN_E2E=1`; scripted LM Studio model, no credentials |
| `autobyteus-server-ts/tests/e2e/runtime/claude-delegated-background-task.e2e.test.ts` | pattern for a delegated copy with a background task | `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS` ≥ 60000 (minimum), team run with `delegate_task` |
| `autobyteus-ts/src/llm/lmstudio-provider.ts` | scripted model path | `LMSTUDIO_HOSTS` read from `process.env`; discovery `GET /api/v1/models`; chat completions streamed |
| `docs/isolated-app-instances.md` | desktop journey | `pnpm --silent isolated-app start --build`, `stop`, `list` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build + integration prerequisites | worktree root | `pnpm -C autobyteus-server-ts test:integration:prepare` | builds autobyteus-ts, SDKs, server `dist/`, devkit, Brief Studio | `check` passes | untracked build output, not committed |
| In-process studio server (E2E) | `autobyteus-server-ts` | started by the suite (`NativeRuntimeLiveHarness`) | own temp data dir and DB | `CONNECTED` frame | suite `afterAll` terminates runs, deletes definitions, removes temp dirs |
| Scripted LM Studio model | in the suite | `http.createServer` on `127.0.0.1:0`, `LMSTUDIO_HOSTS` | deterministic tool calls per turn | catalog lists the model | closed in `afterAll` |
| Real model (live suite) | in the suite | test vault | Anthropic / OpenAI | provider 200 | none |
| Linux container (C-02 probe) | worktree, read-only mount | `docker run --rm node:22-bookworm` | bash 5.2 | — | `--rm` |
| Isolated desktop instance (panel) | worktree root | `pnpm --silent isolated-app start --build` | own data root and ports | `start` receipt | `isolated-app stop <id>`, `list` empty |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent definitions, team definition | GraphQL `createAgentDefinition`, `createAgentTeamDefinition` | test-owned data dir | deleted by the suite |
| Workspaces with `package.json` (`npm run dev`) | written by the suite into a temp workspace | temp dir | removed |
| Owner credential | `startStudioE2eRuntimeServer` / fixture helpers | never printed | process lifetime |
| Provider keys | test vault (read-only) | never logged | — |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check"
- Representative existing-data setup and required behavior: an agent definition stored with `run_bash` plus the four retired names, created through the public API as a user's definition would have been before this change; the run starts, the model sees `run_bash` only, the definition's `toolNames` read back unchanged. Historical journals: `runtime-translations.test.ts` keeps the recorded-call rows (IMP-06, reused).
- Evidence planned: API-04 (definition), API-R05 (journal converters).
- Migration-specific completion/recovery scenarios: N/A
- Upstream ambiguity or reroute required: none

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/integration/tools/terminal/run-bash-wrapper.test.ts` | R-0 list, probe cases 1-12, background start, kill in place, run end, CR-001 logout | REQ-001/007/011/015, R-0 | Still Valid | IMP-02, IMP-08 | reuse |
| `autobyteus-ts/tests/unit/tools/terminal/**`, launcher/output-lifetime tests | decoder, manager, cleanup step | BEH-001..007/010/014 | Still Valid | IMP-03 | reuse |
| `autobyteus-server-ts/tests/integration/background-task-notices/background-task-notice-service.integration.test.ts` | delivery policy with a fake run | REQ-003/004/005/015 | Still Valid (fake `AgentRun`: does not prove the real wiring) | IMP-07 | reuse + new E2E |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-background-tasks.test.ts` | mapping, publication, capability | REQ-010/013 | Still Valid | IMP-07 | reuse |
| `autobyteus-server-ts/tests/agent-work-journal/rendering/runtime-translations.test.ts` | `(background)`, retired converters | REQ-012 | Still Valid | IMP-06/07 | reuse + journal check in E2E |
| `autobyteus-server-ts/tests/e2e/shutdown/busy-run-stop-now.e2e.test.ts` + fixture | Terminate and SIGTERM with a busy run (background via `run_bash(run_in_background)`) | REQ-009, BEH-010 | Still Valid (updated by implementation) | not run yet | run (API-02) |
| `autobyteus-server-ts/tests/e2e/shutdown/native-standalone-host-shutdown.e2e.test.ts` + fixture | standalone host drains active/ended-run commands; asserted that an application-ended run's commands keep serving (`ordinary agent end retains previews`) | REQ-009, BEH-010 | Needs Update (found at execution: the turn-1 assertion is the behavior REQ-009 / DEC-003 removed; API-03 run 1) | API-03 run 1 | update the assertion to run-end stop, rerun (API-03) |
| `autobyteus-server-ts/tests/e2e/runtime/claude-*background*`, `agy-*background*` | other runtimes | out of scope | Out Of Scope | — | none |
| `autobyteus-server-ts/tests/e2e/helpers/native-runtime-live-harness.ts` | shared harness of the native live suites | — | Needs Update (found at execution: `gql` bypassed the owner-credential attachment, every call refused `NODE_CREDENTIAL_REQUIRED`) | first BGT run | baseline fix, own commit |
| `autobyteus-web/tests/e2e/background-tasks-panel-probe.mjs` | panel rendering from fixture events (Claude-shaped) | REQ-010 (runtime-neutral panel) | Still Valid | — | not needed: the panel journey is proven on the real app (API-15) |
| Server `tests/integration/**` (full) | all in-process integration | regression | Still Valid | never run on this branch | run (API-01) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R01 | R-0, AC-001/005/007/010 (local) | wrapper on macOS bash 3.2 | Reused | IMP-02 | ran on `ddd594d07b`; no code changed since (`b09e5fdbb7` touches `tickets/` only) |
| API-R02 | BEH-001..007/010/011/014, AC-008 (tool absent), AC-012 | terminal package units | Reused | IMP-03 | ran on `ddd594d07b` |
| API-R03 | R-0, R-6, `sh` fallback | wrapper on Linux bash 5.2 + dash | Reused | IMP-08 | ran on `ddd594d07b` |
| API-R04 | regression | autobyteus-ts full | Reused | IMP-04 | ran on `e26460bf57`; the only later code change is the wrapper's final line (CR-001), whose paths IMP-02/03/08 reran |
| API-R05 | regression; AC-011 (converters), AC-012 | server typecheck, unit, targeted | Reused | IMP-05, IMP-06, IMP-07 | server code unchanged since `e26460bf57`; same CR-001 argument |
| API-01 | regression | server in-process integration (never run on this branch) | Existing Test | `pnpm -C autobyteus-server-ts test:integration` after `test:integration:prepare` | green-suite rule |
| API-02 | AC-006, REQ-009 | real `dist/app.js` server: Terminate and SIGTERM with a busy run holding a `run_in_background` command | Existing Test | `RUN_BUSY_STOP_NOW_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/shutdown/busy-run-stop-now.e2e.test.ts --no-watch` | changed fixture |
| API-03 | REQ-009, BEH-010 | real standalone application host | Existing Test | `RUN_NATIVE_STANDALONE_SHUTDOWN_E2E=1 … native-standalone-host-shutdown.e2e.test.ts` | changed fixture |
| API-04 | AC-001, AC-003, AC-007, AC-008, AC-011, REQ-010 (panel contract), QR-002, QR-004 | real server + native runtime + scripted model; real processes | Durable | `autobyteus-background-task-transport.e2e.test.ts` case BGT-01 | the end-to-end path the fake-run integration test cannot prove |
| API-05 | AC-002 (busy, exit code ≠ 0) | same | Durable | BGT-02: background `exit 3` ends while the model is still answering; notice right after the turn | — |
| API-06 | AC-004, AC-012 (still-running list, DEC-013) | same | Durable | BGT-03: three commands ending within 1 s plus one long one | — |
| API-07 | AC-005, REQ-007, REQ-015 | same + real `npm run dev` with a child process | Durable | BGT-04: `kill <pid>` in `run_bash`; process table; panel `stopped`; no notice | — |
| API-08 | AC-010 | same | Durable | BGT-05: `(sleep 2; exit 7) & echo started`; kill of a job; job with children; `& disown` | — |
| API-09 | AC-006, REQ-009, QR-004, AC-010 alternate | same | Durable | BGT-06: Terminate; group and disowned process gone ≤ 10 s; no notice; output folder removed | — |
| API-10 | AC-013, REQ-014 | same | Durable | BGT-07: Stop during a foreground `run_bash`; background keeps running; notice arrives | — |
| API-11 | AC-002 alternate (signal), RU-02 | same | Durable | BGT-08: command killed from outside while idle → notice `killed by SIGTERM` | — |
| API-12 | AC-009, REQ-010 | a standalone native agent delegates to a top-level native agent (delegating to a teammate is refused: `COLLABORATION_SELF_TARGET_REJECTED`); idle shutdown grace 60 s | Durable | BGT-09: copy kept past the grace while its command runs; notice wakes it; reports; shut down one grace after it is quiet | — |
| API-13 | ASM-002, AC-001/002/003/004/007 with a real model; the requirements' "observable definition of success" | real server + real models (test vault) | Durable (gated live) | `autobyteus-background-task-live.e2e.test.ts`: two builds in the background, `tail` while running, end turn, one notice, the model reports both results | only a real model answers ASM-002 |
| API-14 | AC-002/AC-007 last lines (C-02/C-03) | manager on Linux bash 5.2 and macOS bash 3.2 | Temporary Probe | node script on built `autobyteus-ts/dist`: 200 tasks whose last line is written right before exit; compare `end.lastLines` and the file tail | an ordering probe with many repetitions does not fit a durable suite; durable lastLines assertions exist in the wrapper suite |
| API-15 | AC-009 panel part, BEH-009 | real desktop app (worktree build) with a native run | Journey | isolated instance; native agent starts a background command; Activity → Background Tasks row running, then completed with `exit code 0` | panel rows for native runs on the real surface |
| API-16 | R-0/R-6 on WSL, bridge exit | Windows + WSL | Not runnable here | — | no Windows host |
| API-17 | test-code type safety | server typecheck with the new tests | Existing Test | `pnpm -C autobyteus-server-ts typecheck` | baseline rule for test files (added at execution) |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-04 to API-12 | `autobyteus-server-ts/tests/e2e/runtime/autobyteus-background-task-transport.e2e.test.ts` (gate `RUN_NATIVE_BACKGROUND_TASK_E2E=1`, no credentials) | no test runs the real chain wrapper → manager → backend → `AgentRun` → notice service → native turn → model; a scripted model makes busy/idle timing deterministic and lets the test read exactly what the model received |
| API-13 | `autobyteus-server-ts/tests/e2e/runtime/autobyteus-background-task-live.e2e.test.ts` (gate `RUN_NATIVE_BACKGROUND_TASK_LIVE_E2E=1` + test vault) | ASM-002 and the success definition with real models; same pairing as the AGY transport/live suites |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-03 | `tests/e2e/shutdown/native-standalone-host-fixture.mjs`, `native-standalone-host-shutdown.e2e.test.ts` | turn 1: after the application ends the run, wait until both commands are gone (≤ 10 s) instead of asserting they still serve; test title and header | stale assertion of removed behavior (REQ-009) |
| API-04..13 | `tests/e2e/helpers/native-runtime-live-harness.ts` | `gql` through `globalThis.fetch` (owner credential); fail on non-OK; `url` getter | baseline fix `60900cd0f7` |

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron + Nuxt renderer, embedded server
- Testing guideline used: `/TESTING.md` (Isolated desktop instance), `docs/isolated-app-instances.md`
- Web-equivalent behavior: the Background Tasks panel rendering native `BACKGROUND_TASK_UPDATED` rows
- Shell-specific or lifecycle behavior: none changed
- Chosen approach: an isolated instance of this worktree's build; a native agent run whose model starts a background command; DOM assertions on the Activity tab's Background Tasks rows
- Server/frontend setup: the instance's own embedded server and data root
- How the run avoids disturbing an already-running desktop application: isolated instance with its own ports and data; the user's app is never touched

## Live Environment And Fixture Plan

- Startup order: build (`test:integration:prepare`) → server integration → shutdown fixtures → transport suite → live suite → Linux probe → isolated instance (one heavy run at a time)
- Environment: `env -i PATH HOME=<resolved temp> TMPDIR` for E2E; `AUTOBYTEUS_TEST_VAULT` only on the live suite and the isolated instance
- Health / readiness: `CONNECTED` frame; server `/rest/health` in fixtures; isolated-app `start` receipt
- Seed data: definitions and workspaces created per case through GraphQL
- Evidence: WS frame digests, the model's received requests (tool lists, tool results, notice text), process-table snapshots, journal excerpts, DOM state and screenshots
- Owned processes and state: suite-owned servers, temp data dirs, workspaces, command processes (tag in argv); isolated instance

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| WSL: R-0/R-6 and the bridge exit when a detached process outlives a call (API-16) | no Windows host or WSL on this machine; WSL cannot be emulated on macOS | Windows runs every call in WSL bash 4+; the same wrapper text runs there (Linux bash 5.2 proven by IMP-08) and the decoder chain is unit-tested | Yes | delivery takes it to the user (Windows machine) |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (two new gated suites)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: updated after execution (round 1): API-03 fixture and the harness moved to Needs Update; API-12 delegation shape; API-17 added; API-13 builds released together after the first turn (ends seconds apart are separate notices by REQ-004).
