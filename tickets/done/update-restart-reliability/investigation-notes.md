# Investigation Notes — update-restart-reliability (autobyteus-339)

## Investigation Meta
- Package identifier: `update-restart-reliability`.
- Request / ticket: Task `autobyteus-339` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-restart-reliability`.
- Repository mode: `Git`. Branch `codex/update-restart-reliability`, created 2026-10-31 with
  `git worktree add -b codex/update-restart-reliability <path> origin/personal` after `git fetch origin`.
- Resolved base: `origin/personal` @ `a977b2c1bc` (beta v1.5.11-beta.7 released). Finalization target: `personal`.
- Bootstrap result: OK. Bootstrap blocker: none.
- Current solution revision ID: `SR-001` (Draft).
- Authorities read (requirements gate, in this conversation): `references/requirements-engineering.md` (2026-10-27
  version), `references/finding-the-cause.md`, `references/ticket-scope.md`; templates
  `requirements-doc-template.md`, `investigation-notes-template.md`; repository `AGENTS.md`, `TESTING.md`, `DESIGN.md`.
- Investigation status: FU-008 cause established (Reproduced); FU-007 options prepared (`fu-007-options.md`).

## Initial Request And Clarifications
- Original request: from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`),
  2026-10-31, as a follow-up to autobyteus-284.
  - Two leftovers of autobyteus-284 that block the unattended update restart and automatic resume the user decided on
    (2026-10-30: busy agents continue automatically after an update restart, no human; autobyteus-285).
  - **FU-008:** find why a busy Org shutdown can stall, and fix it.
  - **FU-007:** decide (the user) and implement what "Install update and restart" does after an incomplete shutdown.
- Done when:
  - the stall cause is found and fixed, or shown not to happen, with a repeat run of the busy quit and counts reported;
  - the update-after-incomplete-shutdown behavior is decided by the user and implemented;
  - finalized on the base branch.
- Constraints: separate test data only; no release unless asked; design first, with the user approving decisions
  before the build; do not put "the user has verified" into Done-when.
- PTM note: autobyteus-305 delivered the in-place update; its first real update beta.6 → beta.7 was proven, giving a
  real update path to test against.

## Source Log
| Date | Type | Source | Why | Finding |
| --- | --- | --- | --- | --- |
| 2026-10-31 | Doc | `tickets/done/busy-quit-shutdown-orphan/follow-ups.md` FU-007, FU-008; `code-review-report.md` CR-C9 | Task basis | Stall located at the Org root-shutdown stage, once in 15 busy desktop quits; three candidates; not reproduced in 12 repeats |
| 2026-10-31 | Runtime log | `tickets/done/busy-quit-shutdown-orphan/evidence/API-11R1-app-0-server.log:255-300`, `API-11R1-result.json` | The stalled run | No progress for 10 s; then the sweep found 4 processes (3 CLIs + its `ps`, pre-CR-001) and 5 groups; **both** Claude CLIs (standalone and Org manager) exited 143 on the sweep's SIGTERM; nothing after the Org stage ran |
| 2026-10-31 | Code | `agent-org-execution/domain/agent-org-run.ts:353-392` | Org terminate | `terminate()` closes admission, then `terminateOnce()` **awaits `operationGate.closeAndDrain()` before fencing any member** → `frozenTerminationScope.fenceAgentRunsForRootShutdown()` → `taskExecutions.drain()` → `persistence.drain()` → `finish()` |
| 2026-10-31 | Code | `agent-collaboration/execution/services/root-operation-gate.ts` | The gate | `closeAndDrain()` waits, without a bound, until every admitted gated operation has returned |
| 2026-10-31 | Code | `agent-org-run.ts:194-292, 406-409` | Gated operations | Delegated stop/update, `@` resolution, `send_message_to`, exact delivery, remote messages, `delegate_task` (new/existing copy), platform-binding commit, and **every agent command** (`executeAgentCommandWithExecutionKind` → `delivery.executeAgentCommand`, including `post_message`) run inside the gate |
| 2026-10-31 | Code | `agent-org-run-manager.ts:388-396`; `general-process-run-supervisor.ts:452-490` | Order | Orgs are stopped one by one, **before** Teams, standalone roots and `stopAllAgentRuns`; one stalled Org therefore blocks every later stage (matches R1: no CLI released) |
| 2026-10-31 | Code | `configured-agent-execution-handle.ts:214-221` | Member fence | Cancels activation, awaits `readinessAttempt`, then `run.fenceInputAndInterruptForRootShutdown()` |
| 2026-10-31 | Code | `agent-run-termination.ts:92-107`, `agent-run-root-shutdown-fence` | Run fence | Interrupts the active turn; settles when quiescent; a **rejected** interrupt is bounded at 5 s, an **accepted** interrupt whose turn never ends is not bounded (284's N-3) |
| 2026-10-31 | Code | `autobyteus-web/electron/updater/appUpdater.ts:262-280`; `application/applicationShutdown.ts`; `electronApplication.ts:59, 73-75, 347-350, 405-411` | FU-007 current path | Install → `prepareForInstall` = `ElectronApplication.stop()` (memoized) → on rejection `handleError('Failed to install update and restart.')`, `quitAndInstall` not called. The server has already been stopped; the rejected stop stays memoized, so the next quit ends through `app.exit(1)` |
| 2026-10-31 | Code | `autobyteus-server-ts/docker/starter/update-run.mjs:123-159`, `server-process.mjs:38-46`, `starter-paths.mjs:27` | The Docker in-place update (autobyteus-305) | Stops the old server with SIGTERM, up to `stopMs = 120 s`, then SIGKILL of the group; **continues the update whatever the old server's exit code**, and notes "did not stop in time and was stopped by force" in the result message. So FU-007 is a desktop-only gap; the Docker path is a precedent for "install anyway" |

## FU-008 candidates (Read, not yet proven)
- **C1, the gate drain (leading):** an Org operation admitted before shutdown is still running. `terminateOnce()` waits
  for it before fencing, so no member is interrupted, nothing is logged, and every later stage waits. Its fit with R1:
  no interrupt and no "interrupt rejected" warning; both Claude CLIs alive at 10 s; intermittent (it needs an operation
  in flight at the quit moment). What operation stays in flight for seconds during a busy turn is not yet known.
- **C2, an accepted interrupt with no effect:** the member is fenced and interrupted, but the Claude turn never ends and
  the fence waits for quiescence without a bound (N-3).
- **C3, the member readiness wait:** `fenceForRootShutdown` awaits `readinessAttempt`; a member still activating would
  wait for its readiness.
- Plan: reproduce with temporary stage, gate and per-member fence logging on isolated data (finding-the-cause.md), at
  the server level first (cheaper), then the desktop probe if needed. Record counts.

## FU-008 reproduction and cause (2026-10-31)
| ID | Method / command | Scenario | Observation | Established |
| --- | --- | --- | --- | --- |
| P-001 | 284's server probe, `repeat` mode: `env -i PATH HOME USER LOGNAME TMPDIR REPEAT=10 node evidence/P-001-live-server-probe.mjs repeat autobyteus-server-ts evidence/repro-r1` (server built from this worktree with temporary diagnostics) | A real server; a busy Codex standalone, Claude standalone, Codex Team member and Claude Org agent; SIGTERM. Codex `gpt-6.1-terra` effort medium, Claude `claude-haiku-4-5-20251001` | **10/10 clean**: 1.24–1.72 s, exit 0, 0 survivors. The diagnostics show the normal Org path: the gate is empty, the Claude member is fenced and interrupted, its turn ends in ~20 ms, and it is released in ~0.76 s (`evidence/repro-r1/API-06R-server-iter6.log`) | Measured |
| P-002 | 284's desktop probe, `busy-quit` mode, in a loop: `bash evidence/P-002-desktop-busy-quit-loop.sh <n> <dir>`, against a desktop app built from this worktree (`pnpm -C autobyteus-web build:electron:mac`; only the DMG step failed, on `hdiutil resize`). An isolated instance with its own data root and ports | "Restart server" while a Codex run is busy; then the same four busy roots; then a user quit | **Series d1: 1 stall in 19 valid runs. Series d2: 0 in 20. Series d3: 1 in 39** (each series had one run excluded because the Org agent never started its command). In total **2 stalls in 78 valid busy quits**, each at about 10.7 s (`serverGoneMs` 10736 and 10655); every other run was 0.8–1.7 s | Reproduced |
| P-002 d1 iter-6 | Server diagnostics | The stall | **No stage ran at all**: not the Org stage, nor Team, standalone or `stopAllAgentRuns`. The last lines are WebSocket session closes; then "exceeded 10s" and the sweep | Reproduced |
| P-002 d3 iter-16 | Added socket tracking and step timing in the built bundle (temporary) | The stall | At `preClose` there were 18 open sockets. All closed within 15 ms **except one HTTP socket that had never sent a request** (`url=null`), opened ~17 s earlier together with the app window's other connections. It was "still open" every second until the bound fired at 10 s. The HTTP server never finished closing, so Fastify's `onClose`, where all agent cleanup runs, never started | Reproduced |
| P-002 d2 + d3 | The same tracking in 59 clean runs | Clean quits | **No** request-less socket at `preClose` in any clean run. In every one the HTTP server closed in 1–18 ms and the cleanup started right after. The one run with such a socket is the one that stalled | Measured |
| P-003 | `node evidence/P-003-fastify-silent-connection-close.probe.mjs <abs path of autobyteus-server-ts>` (repo Fastify 5.12.7; Node 22.23.1, and the desktop app's Node 24.19.0 via `ELECTRON_RUN_AS_NODE=1`) | A Fastify server with one used keep-alive connection and one TCP connection that never sends a request; `app.close()` | Default options: **close still waiting at 5 s, `onClose` not run** (both Node versions). With `forceCloseConnections: true`: closed in 0–1 ms, `onClose` ran (`evidence/P-003-fastify-silent-connection-close.log`) | Reproduced |

### Cause (established)
- The studio server's Fastify app (`compositions/build-studio-server.ts:403`, default options) runs every agent cleanup
  in an `onClose` hook (`:409-414`). Fastify runs `onClose` only after the HTTP server has closed.
- Node's `server.close()` closes idle keep-alive connections, but **not a connection that never sent a request**. That
  connection stays until a client or a Node timeout ends it (headers timeout, tens of seconds).
- A client sometimes holds such a connection: here the desktop app window (Chromium). Opening spare connections ahead
  of use (preconnect) is a normal browser behavior. Which Chromium mechanism opened it was **not established**; the
  server must not depend on it.
- When it happens, no run is fenced or released, the 10 s bound of autobyteus-284 fires, the sweep removes everything,
  and the server exits 1. On the desktop that is `ShutdownIncompleteError`, so an update install does not start (FU-007).
- **FU-008's location was an inference.** "The Org stage" was inferred from the absence of later releases, but no stage
  ran at all. The R1 log (`busy-quit-shutdown-orphan/evidence/API-11R1-app-0-server.log:255-300`) has the same
  signature: session closes, then nothing for 10 s.
- Candidates C1 (gate drain), C2 (accepted interrupt with no effect) and C3 (readiness wait) were not observed in any of
  the ~100 instrumented shutdowns. C2 (284's N-3) stays a theoretical residual, contained by 284's bound.
- Exposure beyond the desktop: any client of the studio server can hold such a connection, for example a browser tab
  on another machine, the phone app, or a peer node. So a Docker or terminal server stop can also hit the bound.
  `build-standalone-application-server.ts:18` has the same default options. The local Agent Tools MCP server
  (`agent-tools-mcp-local-server.ts`) and the credential-proxy local server (`credential-proxy-local-server.ts:20`) also
  use defaults. They close later, after the runs and their CLIs are gone (`build-studio-server.ts:134-144`), and their
  clients are those CLIs, so their exposure is lower (`Read`).

### Temporary diagnostics (finding-the-cause.md)
- What and where:
  - `[339-DIAG]` console lines in `root-operation-gate.ts`, `agent-org-run.ts`, `configured-agent-execution-handle.ts`,
    `agent-run-termination.ts`, `agent-run-root-shutdown-fence.ts` and `general-process-run-supervisor.ts`;
  - for d2/d3 also directly in the built bundle (`build-studio-server.js`, `server-process-shutdown.js`,
    `native-command-shutdown.js`): socket tracking, `preClose`/`onClose` timing and step timing.
- Why: to place the stall.
- Removed: `git checkout -- autobyteus-server-ts/src`; the server rebuilt clean (no `339-DIAG` in `dist`); the
  instrumented `autobyteus-web/electron-dist` deleted. None of it was committed.
- Evidence kept: run summaries, both stalled iterations in full, one clean iteration in full, and the result JSON of
  every iteration.

## Unknowns
- U-1 (closed): not C1; see the cause above.
- U-3: which Chromium mechanism opens the request-less connection (not needed for the fix).
- U-2: on macOS, whether electron-updater (`autoInstallOnAppQuit = true`, `appUpdater.ts:97`) installs a downloaded
  update when the app ends through `app.exit(1)` after a failed install attempt.

## Supplement Inventory
| Path | Owner | Purpose | Status |
| --- | --- | --- | --- |
| `tickets/done/busy-quit-shutdown-orphan/evidence/API-desktop-probe.mjs`, `API-live-server-probe.mjs` | API/E2E (284) | Reproduction probes | Read-only input |
| `evidence/P-001-live-server-probe.mjs`, `evidence/P-002-desktop-probe.mjs`, `evidence/P-002-desktop-busy-quit-loop.sh` | Solution Designer | Copies of 284's probes plus a loop runner; P-002 is the repeat run that Done-when asks for | Evidence; reproduction for implementation and validation |
| `evidence/P-003-fastify-silent-connection-close.probe.mjs` + `.log` | Solution Designer | Deterministic reproduction of the mechanism; the implementation starts from it failing | Evidence |
| `evidence/repro-r1/`, `repro-d1/`, `repro-d2/`, `repro-d3/` | Solution Designer | Run counts and logs of the stalled runs | Evidence |
| `fu-007-options.md` | Solution Designer | FU-007 facts and options for DEC-001 | Behavior-defining once the user decides |
