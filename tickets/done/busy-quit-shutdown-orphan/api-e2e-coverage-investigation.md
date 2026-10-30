# API/E2E Coverage Investigation — busy-quit-shutdown-orphan (autobyteus-284)

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence
scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

All ticket paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved, SR-002 + SR-007)
- Investigation Notes: `investigation-notes.md` (E1–E9, RC-1..RC-5, E-A1..E-A35, U-A1..U-A3)
- Solution Revision Record: `solution-revision-record.md` (SR-001..SR-008)
- Design Spec (required on every route): `design-spec.md` (SR-008)
- Supplemental Task Artifacts: `evidence/` (E1–E9 logs, `zz-tmp-bq-probe.e2e.test.ts.txt`, `e6-electron-quit/`), `follow-ups.md` (FU-001..FU-007)
- Design Review Report: `design-review-report.md` (round 3, Pass; its ARCH-REV-003 edits are uncommitted in the worktree and owned by the architecture reviewer — not touched here)
- Architecture Review Revision Record: `architecture-review-revision-record.md` (ARCH-REV-003)
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, Pass 9.4)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code reviewer, CRR-001 Pass (code `bf2857ca29`, handoff `9e00c6fafd`, review docs `b520b51c9e`); design-spec § Change / Refactor Sequence step 6.
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: this file, round 1

## Current Requirement And Design Basis

- **REQ-001 / D1:** `AgentRunManager.terminateAgentRun` fences first (interrupt the active turn, cancel unstarted queued input), then prepare → finish; `stopAllAgentRuns` fences all runs at once, then finishes them in order. Applies to user Terminate (DS-001), application terminate (DS-001b, DEC-005) and server shutdown (DS-002).
- **REQ-002 / REQ-003 / D2:** `ServerProcessShutdown.request()` = startup barrier → `app.close()` raced against 10 s → **always** the process-tree sweep (SIGTERM recorded descendants → ≤ 1.5 s → SIGKILL survivors → ≤ 0.5 s) → IPC result → exit 0, or 1 on expiry / `unconfirmed`. Log markers: `Server shutdown exceeded 10s; forcing exit`, `Server process-tree sweep: …`, `Server process-tree sweep unconfirmed …`.
- **REQ-004 / D3:** the desktop keeps its 20 s graceful window (DEC-007) and 2 s confirmation; the POSIX `forceStop` now snapshots the server's tree, SIGTERMs descendants, SIGKILLs the server, waits ≤ 1.5 s and SIGKILLs survivors. Log markers: `Force-stopping the server and N recorded descendant target(s)`, `Server process tree unreadable; force-stopping the server only`.
- **REQ-005 / BEH-005 / BEH-007:** relaunch continues conversations; shutdown never writes `terminatedAt` (only Terminate/delete/archive do).
- Residuals to record (not to fix): N-3 (Terminate has no bound of its own), N-5/FU-007 (expired bound → exit 1 → update install not started), N-7 (cut cleanup runs beside the sweep; post-snapshot spawn not swept; startup-failure exit unbounded), CR-C1 (≈ 14.25 s worst case), CR-C5 (`ps` stall → "Backend exit not confirmed").
- Unknowns to measure: U-A1 (busy and idle Claude runs vs the 10 s bound; sequential finish), U-A2 (CLI versions; Claude CLI still survives EOF), U-A3 (desktop force path duration with real runtimes; `ps` duration).

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001 (Terminate a busy run), SCN-002 (server shutdown by SIGTERM: desktop quit/restart, `kill`/Docker), SCN-003 (desktop quit while busy: user quit and SIGTERM to the app), SCN-004 (relaunch and continue). SCN-005 (composer Stop) is out of scope (DEC-003) and not tested.
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - **SCN-001b application terminate**: an application command calling `context.agentExecution.terminate(bindingId)` (orchestration `terminateRunBinding`) while its run is busy — real trigger: the application backend command over the application host's backend route.
  - **SCN-002b desktop "Restart server"**: `window.electronAPI.restartServer()` (Settings → restart) while a run is busy; same `stopServer` → SIGTERM → DS-002 path as quit.
  - **SCN-003b wedged server at quit**: the embedded server does not exit within the 20 s window (emulated by `SIGSTOP` of the real server process, which then ignores SIGTERM exactly like a hung event loop) with real busy Codex/Claude children — the desktop force path (AC-011 with real runtimes, U-A3).
  - **SCN-003c update install while busy**: "Install update and restart" from a local test update feed (`--test-update-feed`) while a run is busy — `prepareForInstall` → memoized stop → `quitAndInstall` (N-5).
  - **SCN-002c native run with a background process at shutdown**: the native scope drains first; the sweep is the net.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): none recorded. Windows is outside the platform guardrail (no Windows host here).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 user Terminate of a busy run | Changed | REQ-001, AC-001, E8 | Live Codex + Claude Terminate timing and tool-command absence; native durable regression |
| BEH-001 (app) application terminate | Changed | DEC-005, AC-008, E-A8 | Real application host command → terminate of a busy run (durable, scripted native) |
| BEH-002 server shutdown with busy runs | Changed | REQ-001/002, AC-002, AC-003 | Real server process SIGTERM: exit ≤ 10 s, exit code, Team member + Org agent |
| BEH-003 no leftover processes | Changed | REQ-003, AC-002, AC-011 | PID/PPID/PGID snapshots before/after; system-wide marker search for orphans (PPID 1) |
| BEH-004 desktop quit | Changed (force step only) | REQ-004, AC-004, AC-011 | Isolated desktop: user quit, SIGTERM to main, wedged server force path |
| BEH-005 relaunch continuity | Preserved | REQ-005, AC-006, AC-009 | Relaunch: one server on the data root; agent, Team, Org conversations continue |
| BEH-007 shutdown writes no `terminatedAt` | Preserved | DEC-006, AC-010 | Relaunch after SIGTERM: shutdown-stopped runs `terminatedAt = null`, user-terminated run keeps it |
| Idle quit / shutdown speed | Preserved | QR-003, AC-005 | Idle quit timing on the isolated desktop |
| AGY helper move | Changed (structure only) | design step 1 | Reused IMP-01 (unit); no live AGY run (behavior-preserving move, no AGY code path changed beyond the import) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `AgentRunManager` stop-now methods | IMP-02 (unit, mocked runs) | Real runtimes honoring the interrupt (ASM-001), real tool-command teardown | Live API (real server process + real Codex/Claude) |
| API / transport / contract | Yes | GraphQL `terminateAgentRun`; application `terminate`; Windows IPC result (unchanged shape) | IMP-03 (IPC result unit) | End-to-end Terminate timing through GraphQL and the application host | Live API; durable gated E2E |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | No (no UI change) | — | — | — | — |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | Yes | `BaseServerManager.forceStop` (POSIX) | IMP-04 (real-process test double), IMP-07 | Real packaged app quit paths; real runtime CLIs under the force path | Isolated desktop instance (worktree build) |
| Process / lifecycle | Yes | Server bounded exit + sweep; desktop tree force | IMP-03 (fake sweep), IMP-04 | Real `ps`, real signals, real exit codes, real CLIs (Codex app-server, Claude CLI) and their tool groups | Lifecycle: real server process and isolated desktop |
| Persisted-data transition | No (`Not Affected`) | — | — | — | Relaunch continuity (AC-006/AC-010) only |
| Worker / queue / distributed coordination | Yes (application worker) | Application terminate via worker RPC | none at real-host level | Worker → orchestration → manager path | Durable standalone application host E2E |
| External integration | Yes | Codex CLI 0.166.0, Claude Code 2.1.314 behavior on interrupt/SIGTERM/EOF | none | Version drift (U-A2) | Live runtime probes |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan` (branch `codex/busy-quit-shutdown-orphan`). The design asks for proof "from a clean clone of the final branch": builds under test are made in a **clean detached checkout** of the validated commit (`git worktree add --detach` into a run-owned temp directory, `pnpm install --frozen-lockfile --offline`, server build, desktop build), removed at the end.
- Project type and runtime stack: pnpm monorepo; Node 22 server (`autobyteus-server-ts`, Fastify/GraphQL/WS); Nuxt + Electron 42 desktop (`autobyteus-web`); runtime CLIs Codex 0.166.0, Claude Code 2.1.314.
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/TESTING.md` (root; no closer `TESTING*.md` on the changed paths). Also `docs/isolated-app-instances.md`, `AGENTS.md`.
- Conflicting, missing, or unclear project instructions: none blocking. The user's installed AutoByteus (PID 21374, server 22293 on `~/.autobyteus/server-data`) is running and hosts this agent; it is never signalled or read. Every process check is scoped to PIDs this run started, and orphan searches use run-unique command markers.
- Required environment variables or secrets available: `Yes` — Codex and Claude are signed in on the host (real `HOME`, `USER`, `LOGNAME`); Codex runs under a throwaway `CODEX_HOME` with a symlinked `auth.json`. No provider key is needed (native cases use scripted local inference).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` § Test layers / Choosing the path | Layers | Server E2E/gated suites for backend lifecycle; Electron tests + isolated desktop instance for shell lifecycle |
| `TESTING.md` § Environments | Install/build, one heavy run at a time, clean env, CLI homes | `pnpm install`, `pnpm -C autobyteus-server-ts prebuild`, `build`; `env -i PATH HOME TMPDIR …` + real `HOME`/`USER`/`LOGNAME` for signed-in CLIs; throwaway `CODEX_HOME`; never `~/.codex/config.toml` |
| `TESTING.md` § Rules 1–5 | Isolated instances | `pnpm --silent isolated-app start --build/--from-worktree`; use reported ports; stop what you started |
| `docs/isolated-app-instances.md` | Isolated desktop lifecycle | `start --from-worktree --data-root <owned>`, `stop <id>` (signals the whole instance group — **not** used as the quit trigger), `restart`, `--test-update-feed`; only `CODEX_HOME` passes through to the embedded server; Playwright over CDP `controlPort` |
| `design-spec.md` § Guidance For Implementation | Validation constraints | PID/PPID/PGID snapshots for Codex, Claude, native; record CLI versions; clean clone; isolated data; Codex `gpt-6.1-terra`, effort `medium` |
| `autobyteus-server-ts/tests/e2e/shutdown/native-standalone-host-*.{mjs,ts}` | Existing durable pattern | Real standalone application host + scripted LM Studio inference; application backend commands at `/_autobyteus/backend/commands/<name>` |
| `tickets/done/backend-port-conflict-20261024/evidence/API-09B-selection-lifecycle.mjs` | Prior desktop probe pattern | Playwright `connectOverCDP`, `window.electronAPI.startShutdown()` / `restartServer()`, GraphQL against the instance's server port |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Clean checkout of the validated commit | run-owned temp dir | `git worktree add --detach <tmp> <commit>`; `pnpm install --frozen-lockfile --offline`; `pnpm -C autobyteus-server-ts prebuild && build`; `pnpm -C autobyteus-web build:electron:mac` | One heavy build at a time; wait for other worktrees' heavy runs | `dist/app.js`, `electron-dist/mac-arm64/AutoByteus.app` present | `git worktree remove --force` at the end |
| Standalone server process (live API cases) | clean checkout `autobyteus-server-ts` | `node dist/app.js --port <free> --data-dir <owned>` (the desktop's spawn shape) | Own data root, port, `CODEX_HOME`; real `HOME` for Claude | `GET /rest/health` | SIGTERM is the action under test; fallback cleanup only of recorded PIDs |
| Isolated desktop instance | clean checkout root | `CODEX_HOME=<owned> pnpm --silent isolated-app start --from-worktree --data-root <owned>` | Own ports, data root, process group | `start` JSON `ok:true` | Quit is the action under test; then `isolated-app stop <id>` (no signal when already exited) |
| Scripted LM Studio inference | probe process | in-probe `http.createServer` (OpenAI chat-completions SSE) | No credentials | listening port | closed by the probe |
| Local update feed (SCN-003c) | run-owned temp dir | in-probe static server with `latest-mac.yml` + zip of a re-versioned copy of the build | Unsigned local build | feed reachable | closed by the probe |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent / Team / Org definitions and runs | Public GraphQL (`createAgentDefinition`, `createAgentTeamDefinition`, `createAgentOrgDefinition`, `create*Run`) | Test-owned data roots only | Data roots removed (evidence kept) |
| Busy turn | Message asking for a foreground command with a run-unique marker: `python3 -c "import time; time.sleep(900)" BQ284_<case>` (Claude refuses a standalone `sleep`, E4) | Marker makes orphan search exact | Fallback kill only of processes whose command contains the run's marker |
| Codex identity | Throwaway `CODEX_HOME` with `config.toml` (no model override) + symlink to `~/.codex/auth.json` | Never edits `~/.codex` | temp dir removed |
| Claude identity | Host login via real `HOME`/`USER`/`LOGNAME` | Adds sessions to the user's Claude project history for the temp workspace (recorded) | — |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Not Affected`. Only continuity is exercised (AC-006, AC-010) through the normal reader after relaunch.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-run-manager.test.ts` | D1 fence-first, concurrent fence, no history | REQ-001, AC-008 (unit), AC-010 | Still Valid | IMP-02 | Reuse |
| `tests/unit/shutdown/server-process-shutdown.test.ts`, `server-process-tree-sweep.test.ts`, `server-runtime-app-data-migration-gate.test.ts` | Bound, sweep order, exit codes, IPC, win32 | REQ-002/003, AC-003 | Still Valid | IMP-03 | Reuse |
| `tests/unit/utils/process-tree.test.ts`, `agy-stream-process.test.ts` | Moved selector; AGY unchanged | design step 1 | Still Valid | IMP-01 | Reuse |
| `autobyteus-web/electron/server/__tests__/ServerForceStopTree.spec.ts`, `serverProcessTree.spec.ts` | Desktop tree force with real processes | AC-011 | Still Valid | IMP-04 | Reuse |
| `autobyteus-web` Electron main suite (`ManagedBackendShutdown`, `BaseServerManager`, Windows manager, `ApplicationShutdown`, updater) | 20 s window, 2 s confirmation, Windows path, updater prepare | AC-007, DEC-007 | Still Valid | IMP-07 | Reuse |
| Server full unit suite, typechecks, tracked imports | Regression | AC-007 | Still Valid | IMP-05, IMP-06, IMP-08, IMP-09 | Reuse |
| `autobyteus-server-ts/tests/e2e/shutdown/native-standalone-host-shutdown.e2e.test.ts` (+ fixture) | Full host close drains native foreground/background commands, retains previews on agent end | Native at shutdown (SCN-002c), AC-007 | Still Valid (idle runs; terminate of an idle run is unchanged) | read | Rerun on the clean build (it exercises `stopAllAgentRuns` and application terminate of an idle run, both changed) |
| Gated live runtime suites (`tests/e2e/runtime/*`) | Runtime behavior | — | Out Of Scope (no runtime adapter changed) | — | None |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R1 | AC-003, AC-007, AC-008 (unit), AC-010 (unit), AC-011 | Repository checks | Reused | IMP-01..IMP-09 | Ran on `bf2857ca29`; `git diff --name-only bf2857ca29 HEAD` touches only the ticket folder |
| API-00 | — (environment) | Clean checkout build | Journey (setup) | `git worktree add --detach`; install; server `prebuild`+`build`; `build:electron:mac` | Build provenance for every later case |
| API-01 | AC-007, SCN-002c | Real standalone host close with native commands | Existing Test | `RUN_NATIVE_STANDALONE_SHUTDOWN_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/shutdown/native-standalone-host-shutdown.e2e.test.ts --no-watch` (clean checkout) | Exercises changed `stopAllAgentRuns` and application terminate of idle runs |
| API-02 | AC-001 (native), AC-002 (native + background process), AC-010, REQ-002/003 | Real server process (`dist/app.js`) + native runtime, scripted inference | Durable (new, gated) | `RUN_BUSY_STOP_NOW_E2E=1 … vitest run tests/e2e/shutdown/busy-run-stop-now.e2e.test.ts`; plus once against the base build (fail-before) | Credential-free full-process regression for Terminate interrupt, bounded exit + sweep, exit code 0, and BEH-007 after relaunch |
| API-03 | AC-008 | Real standalone application host: worker → SDK → orchestration terminate | Durable (new, gated) | `RUN_BUSY_STOP_NOW_E2E=1 … vitest run tests/e2e/shutdown/busy-application-terminate.e2e.test.ts`; plus base (fail-before) | DEC-005 at its real entry; no live application path exists otherwise |
| API-04 | AC-001 (Codex) | Real server process + Codex `gpt-6.1-terra` (effort medium) | Temporary Probe | `evidence/API-live-server-probe.mjs terminate codex` | Paid live run; repository live suites are gated per runtime and the probe needs process-tree snapshots |
| API-05 | AC-001 (Claude) | Real server process + Claude CLI | Temporary Probe | `… terminate claude` | As above |
| API-06 | AC-002, AC-010, REQ-003 | Real server SIGTERM with busy Codex + Claude standalone, a busy Team member (Codex), a busy Org agent (Claude), one user-terminated run; relaunch on the same data root | Temporary Probe | `… shutdown-mixed` | Live; checks exit time/code, sweep log, snapshots, orphan search, `terminatedAt` |
| API-07 | U-A1 | Real server SIGTERM with 3 busy + 2 idle Claude runs | Temporary Probe | `… shutdown-claude-many` | Measures the sequential finish against the 10 s bound |
| API-08 | U-A2 | Claude CLI directly: busy in a tool command, stdin closed | Temporary Probe | `evidence/API-08-claude-eof-probe.mjs` | Rechecks the E9 premise the sweep rests on |
| API-10 | AC-005, AC-009 | Isolated desktop, idle quit + relaunch | Journey | `evidence/API-desktop-probe.mjs idle` | Shell lifecycle on the real packaged build |
| API-11 | AC-004(a), AC-006, AC-009 | Isolated desktop, busy user quit (`startShutdown` = menu Quit's `app.quit()`), Codex + Claude standalone, Team member, Org agent; relaunch; continue all three roots | Journey | `… busy-quit` | Real quit path with real CLIs; continuity |
| API-12 | AC-004(b), AC-009 | Isolated desktop, busy, `kill -TERM <Electron main pid>` only | Journey | `… busy-sigterm` | OS SIGTERM path |
| API-13 | AC-004 forced, AC-011 (real runtimes), U-A3, CR-C5 | Isolated desktop, busy Codex + Claude, server `SIGSTOP`ped, user quit → 20 s → force tree | Journey | `… wedged-quit` | Desktop force path with real runtime CLIs and tool groups |
| API-14 | SCN-003c, N-5, AC-009 (update restart) | Isolated desktop with `--test-update-feed`, busy run, Install update and restart | Journey | `… update-install` | Records whether a busy update install completes |
| API-15 | SCN-002b | Isolated desktop "Restart server" while busy | Journey | folded into `busy-quit` before the quit | Same DS-002 path from another real trigger |

| API-06R | AC-002 repeatability, F-API-002 | Real server: busy restart emulation + 4 busy roots, ×4 | Temporary Probe | `API-live-server-probe.mjs repeat` | Added during the run to reproduce API-11R1 |
| API-09 | "before" baseline | Base server build, busy SIGTERM | Temporary Probe | `API-live-server-probe.mjs baseline <base>` | Design step 6 asks for the before baseline where cheap |
| API-11R1 / API-11B / API-11C / API-11D | F-API-002 | Isolated desktop repeats and bisection; API-11D on a diagnostic app copy | Journey | `API-desktop-probe.mjs busy-quit / busy-quit-plain / restart-then-quit` | Added during the run (cause hunt) |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`).
- Revision (during round 1): API-14 is **not executed**. A real install relaunches the app through ShipIt outside the `e2e` profile against the user's real data (TESTING Rule 2; precedent `tickets/done/settings-update-notifications` AC-007). The shared `ApplicationShutdown.stop()` it awaits is proven by API-11/11B/12/13.

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-02 | `autobyteus-server-ts/tests/e2e/shutdown/busy-run-stop-now.e2e.test.ts` + `busy-run-stop-now-fixture.mjs` | Unit tests mock the runs and the sweep; nothing in the repository runs a real server process through SIGTERM with a busy run or Terminates a busy run end to end. Credential-free (scripted inference), gated like the existing shutdown E2E. |
| API-03 | `autobyteus-server-ts/tests/e2e/shutdown/busy-application-terminate.e2e.test.ts` (fixture shared or own `.mjs`) | DEC-005's application terminate has only the shared-entry unit proof; this drives the real application worker path. |

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan (When Applicable)

- Desktop framework / shell: Electron 42, packaged worktree build (`electron-dist`), `e2e` launch profile via `pnpm isolated-app`.
- Testing guideline, README, or development instructions used: `TESTING.md`, `docs/isolated-app-instances.md`.
- Web-equivalent behavior: none changed.
- Shell-specific or lifecycle behavior: quit sequencing (unchanged owner), server stop window, POSIX force tree, update install preparation.
- Chosen validation approach and why it fits the project: isolated desktop instance of the clean build, driven over CDP (Playwright `connectOverCDP`) for `startShutdown` / `restartServer` and GraphQL against the instance's own server port; OS signals only to PIDs this run started (Electron main for AC-004(b), the embedded server for the SIGSTOP emulation).
- Server/frontend setup when browser validation is used: N/A.
- How the run avoids disturbing an already-running desktop application: separate data root, ports and process group; no `osascript`/bundle-id quit (it could reach the user's app); every PID signalled is read from the instance's own start result or its server's `--data-dir <owned root>` argument.

## Live Environment And Fixture Plan (When Broader Validation Is Likely)

- Startup order and commands: clean build (API-00) → durable gated cases (API-01..03) → live server probes (API-04..08) → isolated desktop journeys (API-10..14). One heavy run at a time.
- Environment choices that materially affect the run: `env -i PATH HOME=<real> USER LOGNAME TMPDIR CODEX_HOME=<owned>`; Codex model `gpt-6.1-terra` with `llmConfig.reasoning_effort = "medium"`; Claude model: the cheapest catalog model (haiku family).
- Health / readiness checks: `/rest/health`; `isolated-app start` JSON; WS `CONNECTED`; the marker process appearing in the server's descendant tree.
- Seed data / fixtures: definitions and runs created through GraphQL per case.
- Test identities: host Codex/Claude logins only.
- Requirement-linked journeys: as Planned Cases.
- Evidence to capture: per case a `API-xx-result.json` (timings, exit code, PID/PPID/PGID snapshots before/after, orphan search), the server or application log, and `API-xx-run.log`.
- Owned processes and temporary state to clean up: servers, isolated instances, marker processes, temp data roots, `CODEX_HOME`, the clean checkout.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Windows desktop/server paths | No Windows host; outside the platform guardrail (Windows sweep is `not-applicable` by design) | Windows IPC/taskkill unchanged; unit-covered (IMP-03, IMP-07) | No | None (accepted residual) |
| Live AGY / ACP / Grok runs | No adapter code changed; AGY helper move is unit-covered (IMP-01) | Low | No | None |
| Update install while busy (API-14) | Unsafe: ShipIt relaunches outside the isolated profile onto the user's data | The stop before `quitAndInstall` is proven via quit paths; the install itself is not run | No | Recorded in the report |

## Ambiguities Or Reroute Triggers

None at planning time. Any surviving process class is a `Design Impact` (design-spec § Guidance); a busy shutdown that routinely reaches the 10 s forced path with ≤ 3 busy Claude runs is a `Design Impact` (U-A1).

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (two gated E2E tests, added)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: builds and live runs wait for other worktrees' heavy runs to finish (TESTING.md "One heavy run at a time").

## Round 2 (API-REV-002) — rerun plan after IR-002 / CRR-003

- Trigger: code reviewer, CRR-003 Pass of IR-002 (code `83a73f24d7`, docs `b128df38dd`, review `68cff9e385`).
- Prior unresolved failures: F-API-001 (rechecked first); F-API-002 is now follow-up FU-008, out of scope (CRR-002, CR-C9).
- Delta: `git diff --name-only bf2857ca29 83a73f24d7` outside tickets = `autobyteus-server-ts/src/utils/process-tree.ts` and two unit test files (plus this round's own durable tests from `55ddc71839`). `readProcessTable` is used by the server sweep (every POSIX server exit) and by AGY's group listing. The desktop copy (`electron/server/serverProcessTree.ts`) and every other source file are unchanged, but the packaged app bundles the server, so desktop reruns need a fresh build.

| Case | Decision | Reason |
| --- | --- | --- |
| API-R2 | Reused: IMP-10, IMP-11 | Unit cases for the reader/sweep/AGY on `83a73f24d7`, failing on IR-001's reader |
| API-02, API-03 | **Rerun** (clean checkout of `68cff9e385`) | API-02 recorded the sweep line; own evidence on the fixed build |
| API-04/05/06 (mixed) | **Rerun** | Clean busy exit (4 roots) and idle exit must log no sweep line; terminate and continuity re-recorded on the new build |
| API-17 (new) | **Add** | Bounded forced exit with real targets: a busy Codex run whose `codex app-server` is `SIGSTOP`ped cannot end its turn, so cleanup reaches the 10 s bound; the sweep must log and remove the real targets (app-server, tool groups) |
| API-10, API-11 | **Rerun** (desktop, fresh build) | Idle desktop quit and busy desktop quit (with Restart server = API-15) must log no sweep line |
| API-01, API-06R, API-07, API-08, API-09, API-11B/C/D, API-12, API-13 | Still valid | Their outcomes (exit code, timing, survivors, continuity) do not depend on the dropped row (the `ps` pid was always gone before the signal); API-13's force path is desktop code (unchanged) with a stopped server that never sweeps; API-01 is the standalone host (no sweep) |

- Round 2 decision: proceed; no durable coverage changes; no reroute. F-API-002 is recorded as out of scope (FU-008).
