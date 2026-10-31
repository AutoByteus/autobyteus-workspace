# Design Spec — update-restart-reliability (autobyteus-339)

## SR-005 Revision (ARCH-REV-002)
- AR-003: `installClientConnectionClose` is each server's **last** `preClose` hook, and it destroys connections that arrive once it has started, so a connection opened during the earlier hooks or the grace cannot hold `server.close()`. Two tests added (an earlier slow hook; the studio order).
- AR-004: the stale SR-003 text was replaced (task size, Intended Change, Change Scope, BEH-001, DS-001, Dependency Rules, Risks, Guidance).

## SR-004 Revision (CRR-002 / F-API-001)
- **Finding.** SR-003's D1 (`forceCloseConnections`) cut requests in progress. A `createAgentRun` cut that way keeps
  running and either leaves a prepared-only run (activation refused once admission closes) or completes a run whose
  client never got the ID, so a retry duplicates it. The base build completed the same requests. Evidence: API-02/02B
  (1 and 3 prepared-only runs), API-03 (base contrast); `agent-run-service.ts:241-246`.
- **Design impact.** SR-003's premise that closed admission makes a cut mutation clean was false: the prepare
  persists before the admission check. The review gap is recorded in CRR-002.
- **Revised D1.** Close only what causes the stall, and keep the base guarantee for requests in progress:
  - destroy connections that never sent a request;
  - let requests in progress finish within 2 s;
  - then close everything left (`installClientConnectionClose`, P-004).
- **Unchanged:** D2; REQ-002/REQ-003; 284's bound and sweep.
- **Requirements:** REQ-001 and DEC-002 revised within the direction (Solution Designer; the user is informed in the
  routing message). The user's approval of the solution (close what holds the shutdown; install after an incomplete
  stop when the server is gone) still applies: the revision narrows the cut so that it changes nothing a request in
  progress relies on.

## Solution And Approval Basis
- Current solution revision ID: `SR-005` (2026-10-31): ARCH-REV-002 AR-003/AR-004. The client-connection close is installed as the **last** `preClose` hook and destroys connections that arrive after it starts; the stale SR-003 text is replaced. SR-004 revised D1 for CRR-002 / F-API-001; D2 is unchanged. Earlier versions are in git history.
- Approved requirements: `requirements-doc.md` SR-002, approved by **the user** on 2026-10-31 ("Yeah, if you think
  your solution is reasonable, then let's do it."): DEC-001 = A, REQ-001 to REQ-003. DEC-002 to DEC-005 were decided by
  the Solution Designer within the direction.
- Behavior-defining supplements: `fu-007-options.md` (option A).
- User approval of the design, when the direction requires it: **Obtained**.
  - The direction says "design first; the user approves decisions before the build".
  - The user approved the presented solution on 2026-10-31 (the quote above): close client connections at shutdown,
    and install after an incomplete stop when the server is confirmed gone.
  - This spec realizes exactly that. DEC-005 narrows option A's rare fallback to today's behavior; the user is told so
    in the same message that routes this design.
- Design status: `Ready`.
- Investigation notes: `investigation-notes.md` (FU-008 reproduction and cause; P-001 to P-003).
- Authorities read (design gate, in this conversation):
  - the skill's `architecture-design.md`, `design-principles.md` and `ticket-scope.md`;
  - the updated `SKILL.md` and `templates/design-spec-template.md` (2026-10-31);
  - project `DESIGN.md` and `GLOSSARY.md`.
  - No conflict. Persisted data is not affected.
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/update-restart-reliability`, branch
  `codex/update-restart-reliability`, base `origin/personal` @ `a977b2c1bc`, target `personal`.

## Current-State Read
- **Server close (FU-008, `Reproduced`).**
  - `ServerProcessShutdown.request()` → `cleanupOnce()` = `app.close()` (`server-runtime.ts:204`).
  - Fastify runs the `preClose` hooks (native command drain, `native-command-shutdown.ts:8`; the WebSocket plugin's
    client close), then `server.close()`, and **only after the HTTP server has closed** runs `onClose`
    (`fastify.js:385-430`). The studio cleanup is that `onClose` (`build-studio-server.ts:409-414`): application
    lifecycle stop → `closeProcessResources` → supervisor (Org, Team, standalone roots, runs).
  - With default options, `server.close()` does not close a connection that never sent a request (P-003). One such
    client connection therefore holds every run cleanup until 284's 10 s bound fires (P-002 d3 iter-16).
- **Other node servers** (`Read`): `build-standalone-application-server.ts:18`, `agent-tools-mcp-local-server.ts:30` and
  `credential-proxy-local-server.ts:20` also use default close options.
- **Desktop install (FU-007, `Read`).**
  - `AppUpdater.installUpdateAndRestart` → `prepareForInstall` = `ElectronApplication.stop()` → `ApplicationShutdown.stop()`
    (memoized; it reports a failure, then flushes and closes the logger) → `stopResources()` → `serverManager.stopServer()`
    → `stopManagedBackend`.
  - Any graceful failure (non-zero exit), or a forced stop, throws `ShutdownIncompleteError`.
  - `prepareForInstall` rejects, so `quitAndInstall` is not called and the error is shown (`appUpdater.ts:273-279`).
  - `BaseServerManager.stopServer`'s `finally` clears `serverProcess` only when the child has exited (`:180-186`);
    `startServer` refuses while an old process is unconfirmed (`:86-87`).

## Task Size And Architectural Risk (Mandatory)
- **Task size: `Medium`.**
  - Server: one client-connection-close owner (`src/shutdown/client-connection-close.ts`), installed once in each of the four Fastify servers as their last `preClose` hook.
  - Desktop: the install preparation's rule for an incomplete stop (a server-manager query, one `ApplicationShutdown`
    transition, `ElectronApplication`'s install preparation).
  - Tests; docs.
  - Two packages, existing owners only.
- **Architectural risk: `High`.**
  - Shutdown connection semantics change for every client of every node: never-used and idle connections are closed at once, and a request in progress gets at most 2 s (DEC-002, revised).
  - The update install now proceeds after an incomplete stop: deployment and lifecycle behavior.
- **Escalation triggers:**
  - a flow that relies on an HTTP response completing during shutdown;
  - an install after an incomplete stop that leaves a process or data in a bad state.

## Intended Change
1. **D1 (REQ-001):** every Fastify server the node runs, as its last closing step, destroys connections that never sent a request, lets requests in progress finish within 2 s, then closes the rest, so `onClose`
   (the run cleanup) never waits on a client.
2. **D2 (REQ-002):** "Install update and restart" installs after an incomplete stop when the server process is
   confirmed gone; otherwise, today's error.

## Change Scope (Mandatory)
- In scope: UC-001, UC-002.
  - D1: the four Fastify constructions (one install call each, after their other `preClose` hooks), plus the owner `src/shutdown/client-connection-close.ts`.
  - D2: `BaseServerManager` (one query), `ApplicationShutdown` (one transition), `ElectronApplication` (the install
    preparation).
  - Tests and docs.
- Derived consumers: none (no stored or shared structure changes).
- Deliberately left alone:
  - `ServerProcessShutdown`, the bound and the sweep (284);
  - the Org, Team and run fencing (not involved, investigation notes);
  - `stopManagedBackend`'s outcome rules and the Windows IPC client;
  - the quit path's failure rule (`app.exit(1)`);
  - the Docker starter (BEH-003);
  - install-on-quit (FU-001);
  - an interrupt bound (DEC-003).
- Follow-ups: FU-001 (install-on-quit after an incomplete stop), FU-002 (the unused connection's origin, U-3, only if
  ever needed).

## Relevant Behavior And Production-Path Map (Mandatory)
| BEH | Kind | REQ / AC | Trigger | Existing behavior | Change | Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | REQ-001; AC-001 to AC-003 | Desktop quit, Restart server, update install, SIGTERM, `docker stop` | Run cleanup waits for every client connection | As the last `preClose` step: never-used connections destroyed, requests in progress get ≤ 2 s, the rest closed; cleanup starts right after | DS-001 |
| BEH-002 | User/system | REQ-002; AC-004 to AC-006 | "Install update and restart" | Any incomplete stop blocks the install | The install proceeds when the server process is confirmed gone | DS-002 |
| BEH-003, BEH-004 | Operational | REQ-003; AC-007 | Docker update; 284 flows | — | Preserved | — |

## Task Design Health Assessment (Mandatory)
- Change posture: `Bug Fix`.
- Root cause classification: `Missing Invariant`.
  - The server's shutdown owner assumed that clients end their connections. The invariant "shutdown does not depend
    on clients" was not enforced.
  - The install preparation treated "incomplete cleanup" and "old server possibly alive" as one condition.
- Refactor needed now: `No`. Both changes are additive in their existing owners.
- Residual risk:
  - a request still running 2 s after the close began is cut and gets no response (DEC-002, revised); a `createAgentRun` cut that way can still leave a prepared-only run, because creation is not atomic on a failed activation (pre-existing, FU-004);
  - the macOS install-on-quit behavior after `app.exit(1)` is unknown (FU-001).

## Terminology
- No new domain word. "Server process confirmed gone": the managed server child has an exit code or signal (`childExited`).

## Legacy Removal Policy (Mandatory)
- Removed in SR-004: `SERVER_CLOSE_OPTIONS` (`src/shutdown/server-close-options.ts`) and its test, replaced by `client-connection-close.ts`; no re-export, no option left behind.

## Persisted Data / State Transition Decision
- `Not Affected`.

## Data-Flow Spine Inventory
| Spine | Scope | BEH | Start | End | Owner |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001 | SIGTERM / IPC request / `app.close()` on any node server | Cleanup done, exit | `ServerProcessShutdown` → Fastify close |
| DS-002 | Primary | BEH-002 | "Install update and restart" (user or unattended) | `quitAndInstall` or the error | `ElectronApplication` install preparation |

## Primary Execution Spine(s)
- DS-001: `SIGTERM | IPC → ServerProcessShutdown.request → app.close() → Fastify closing: new requests answered 503 → preClose: native drain; WebSocket clients closed; ★ client-connection close, the last preClose hook (from its start new connections destroyed on arrival; never-used connections destroyed; wait for requests in progress ≤ 2 s; then every remaining HTTP connection closed) → server closed → onClose: run cleanup (application stop → closeProcessResources → supervisor) → sweep → exit 0`
- DS-002: `Install click → AppUpdater.installUpdateAndRestart → ElectronApplication.prepareForInstall → ApplicationShutdown.stop() → [rejects] → ★ serverManager.isServerProcessGone()? → yes: ApplicationShutdown.acceptIncompleteStopForInstall() → quitAndInstall → will-quit passes → install | no: rethrow → existing error`

## Spine Narratives (Mandatory)
| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 | A server that is closing no longer waits for its clients beyond 2 s. After its other closing hooks (native commands drained, WebSockets closed), its last closing step destroys connections that never sent a request (and any that arrive from then on), waits for requests in progress up to 2 s, and closes every remaining HTTP connection, so `server.close()` completes at once and run cleanup starts right after the last request in progress, or at the latest 2 s later | Fastify close; `client-connection-close.ts` per server |
| DS-002 | An install after an incomplete stop goes ahead when the old server is confirmed gone; the incomplete stop is still reported in the log, as today. Only an unconfirmed server exit keeps today's error | `ElectronApplication` |

## Ownership Map
- `src/shutdown/client-connection-close.ts` owns the close rule for client connections: it tracks a server's sockets (never-used, in-progress requests) and closes them in the right order at close. Each server's composition installs it once.
- `BaseServerManager` owns the fact "server process confirmed gone" (it owns the child).
- `ApplicationShutdown` owns the prepared state that lets `will-quit` pass.
- `ElectronApplication` owns the install-preparation sequence (it already composes the shutdown and the server manager).

## Removal / Decommission Plan (Mandatory)
| Item | Replaced by | Scope |
| --- | --- | --- |
| `SERVER_CLOSE_OPTIONS` and its spreads in four servers (IR-001) | `installClientConnectionClose(app)` | In this change |

## Bounded Local / Internal Spines
- Install preparation: `stop → ok: install | rejected → server gone? → accept and install | rethrow`.

## Ownership Boundaries
- `AppUpdater` keeps calling one `prepareForInstall`. It does not inspect shutdown errors.
- No caller other than `ElectronApplication.prepareForInstall` uses `acceptIncompleteStopForInstall`.

## Boundary Encapsulation Map
| Boundary | Encapsulates | Forbidden bypass |
| --- | --- | --- |
| `installClientConnectionClose(app)` | Socket tracking and the close order | A server closing sockets itself, or using `forceCloseConnections` |
| `BaseServerManager.isServerProcessGone()` | The child's exit state | Parsing `ShutdownIncompleteError` messages to infer it |
| `ApplicationShutdown.acceptIncompleteStopForInstall()` | The prepared state after a settled failure | Setting `prepared` from outside; calling it while a stop is pending |

## Dependency Rules
- The four server files → `src/shutdown/client-connection-close.ts`, which depends only on Fastify's types and Node's `http`/`net`.
- `electronApplication.ts` → `serverManager.isServerProcessGone()`, `shutdown.acceptIncompleteStopForInstall()`.

## Interface Boundary Mapping
| Interface | Responsibility |
| --- | --- |
| `installClientConnectionClose(app: FastifyInstance, options?: { graceMs?: number; timers? }): void` (`IN_FLIGHT_REQUEST_GRACE_MS = 2_000`) | One rule for every node server: listens to `app.server` `connection` / `request` / `upgrade` (upgraded sockets are left to the WebSocket plugin), and adds one `preClose` hook. **It must be installed after every other `preClose` hook of that app** (Fastify runs `preClose` in registration order, `lib/hooks.js:93-150`), so that its final `closeAllConnections()` directly precedes `server.close()`. The hook: from its start, any new connection is destroyed on arrival; it destroys the sockets that never delivered a request; if requests are in progress, it waits until none are or `graceMs` passes; then `app.server.closeAllConnections()` |
| `BaseServerManager.isServerProcessGone(): boolean` | `!this.serverProcess \|\| childExited(this.serverProcess)` |
| `ApplicationShutdown.acceptIncompleteStopForInstall(): void` | Only after the stop settled as rejected: `prepared = true` (will-quit then passes); throws if no stop settled |
| `ElectronApplication.prepareForInstall(): Promise<void>` | Replaces `prepareForInstall: () => this.stop()` |

## Existing Capability / Subsystem Reuse Check
| Need | Existing | Decision |
| --- | --- | --- |
| Close connections at close | Fastify `forceCloseConnections` (SR-003) | Replaced (it cut requests in progress, F-API-001); Node's `closeAllConnections()` after a grace is used instead (P-004) |
| "Server gone" | `childExited`, `serverProcess` | Reuse via one query |
| Install sequencing | `AppUpdater.prepareForInstall` | Reuse the hook |
| Incomplete-stop log | `ApplicationShutdown` report ("Application shutdown incomplete") | Reuse; no new log |

## Final File Responsibility Mapping
| File | Change | Responsibility |
| --- | --- | --- |
| `autobyteus-server-ts/src/shutdown/server-close-options.ts` and `tests/unit/shutdown/server-close-options.test.ts` (IR-001) | Remove | Replaced by `client-connection-close.ts` (no re-export) |
| `autobyteus-server-ts/src/shutdown/client-connection-close.ts` | Add | `installClientConnectionClose`, `IN_FLIGHT_REQUEST_GRACE_MS`, with a comment citing FU-008 and F-API-001 |
| `autobyteus-server-ts/tests/unit/shutdown/client-connection-close.test.ts` | Add | From P-003 and P-004 (AC-001, AC-008): a never-used connection does not hold the close; an idle keep-alive is closed; a 300 ms request in progress gets its response and `onClose` runs right after; a request outlasting the grace is cut at the grace; a request on an open keep-alive during the grace gets 503; an upgraded socket is not closed by it; **(AR-003 a)** a never-used connection opened while an earlier, slow `preClose` hook runs does not hold the close; a connection opened during the grace is destroyed |
| `autobyteus-server-ts/tests/unit/compositions/` (the studio composition's existing test or a new one) | Add/Modify | **(AR-003 b)** order: the client-connection-close hook is the studio app's last `preClose` hook, after the native drain and the WebSocket plugin |
| `autobyteus-server-ts/src/compositions/build-studio-server.ts`, `build-standalone-application-server.ts`, `agent-tools/mcp/agent-tools-mcp-local-server.ts`, `credential-proxy/credential-proxy-local-server.ts` | Modify | Drop `SERVER_CLOSE_OPTIONS` (IR-001); call `installClientConnectionClose(app)` once, **after every other `preClose` hook**: studio after `nativeShutdown.install(app)` (`:408`), `app.register(websocket)` (`:429`) and the other registrations, before `listen`; standalone application after its `register(websocket)`; the two local servers anywhere before `listen` (they have no other `preClose` hook) |
| `autobyteus-web/electron/server/baseServerManager.ts` | Modify | `isServerProcessGone()` |
| `autobyteus-web/electron/application/applicationShutdown.ts` | Modify | `acceptIncompleteStopForInstall()` |
| `autobyteus-web/electron/application/electronApplication.ts` | Modify | `prepareForInstall()` and its wiring at `:73-75` |
| `autobyteus-web/electron/application/__tests__/ApplicationShutdown.spec.ts`, a new `ElectronInstallPreparation.spec.ts` or the existing updater/application tests | Modify/Add | AC-004 to AC-006: incomplete + gone → install proceeds and `will-quit` passes; incomplete + not gone → rejects, no install; clean → unchanged; accept before settle → throws |
| `autobyteus-server-ts/docs/modules/agent_execution.md` (server shutdown section) and `autobyteus-web/docs/electron_packaging.md` § Confirmed backend and application shutdown | Modify | The close rule; the install rule |

## Concrete Examples / Shape Guidance
| Topic | Good | Avoided |
| --- | --- | --- |
| Close rule | `const app = fastify({...}); nativeShutdown.install(app); …; await app.register(websocket); …routes…; installClientConnectionClose(app); // last preClose` | Installing it right after `fastify({...})` (it would run first, and a connection opened during the later hooks holds the close, AR-003); `forceCloseConnections: true` (cuts a request in progress, F-API-001); waiting without a grace (FU-008); per-route abort logic |
| Install | `async prepareForInstall() { try { await this.shutdown.stop() } catch (error) { if (!this.serverManager.isServerProcessGone()) throw error; this.shutdown.acceptIncompleteStopForInstall() } }` | Parsing the error message; passing a callback into `ApplicationShutdown` that reaches the server manager |

## Backward-Compatibility Rejection Log (Mandatory)
| Candidate | Decision |
| --- | --- |
| A setting to keep waiting for clients | Rejected |

## Change / Refactor Sequence
1. D1 (SR-004): remove `SERVER_CLOSE_OPTIONS` and its test; add `client-connection-close.ts` and its test from P-003/P-004 (failing first on defaults); install it in the four servers.
2. D2: the query, the transition, the install preparation, and the tests.
3. Docs.
4. Validation (API/E2E):
   - AC-002: the API-02 shape again (busy runs, a silent and an idle connection, `createAgentRun` requests staggered
     around SIGTERM): exit 0 in ≤ 3 s, every in-flight create answered, and after relaunch no prepared-only and no
     unacknowledged run. At least 2 samples, plus the base contrast.
   - AC-003: the P-002 loop, ≥ 40 valid desktop busy quits on a build from the final branch, from a clean checkout,
     with counts reported.
   - AC-004/005: main-process tests. If the isolated app's `--test-update-feed` can drive a real install, one install
     after a forced stop.
   - Optionally, the Docker in-place update (autobyteus-305) with a busy agent and a held client connection: the
     server exits 0 quickly.
   - AC-007: 284's probes.
   - Live models per `TESTING.md`: Codex `gpt-6.1-terra`.

## Key Tradeoffs
- **Grace drain instead of `forceCloseConnections` (SR-004):** SR-003 cut every request in progress. CRR-002 / API-02
  showed that this leaves prepared-only and unacknowledged runs, while the base build completed the same requests. The
  stall's cause is only connections that never sent a request, so those are closed at once, and a request in progress
  keeps the base guarantee within a 2 s grace. This is the smallest rule that fixes FU-008 without changing what any
  handler can rely on. Measured handler times (`createAgentRun` 54–175 ms) are far inside the grace. The Docker update
  request answers 202 before the starter stops the server (`node-update-routes.ts:48-66`), so it is unaffected either way.
- **All four servers:** one rule, no later stall from the same cause (DEC-004).
- **Keep today's error when the server exit is unconfirmed:** no retry machinery for a near-impossible state (DEC-005).

## Risks
- A request still running after the 2 s grace is cut; its handler keeps running beside the `onClose` cleanup until the process exits. A `createAgentRun` cut that way can still leave a prepared-only run (FU-004). Measured handler times are far below the grace.
- The grace and the cleanup must fit 284's 10 s bound: 2 s + the normal busy cleanup (≈1–2 s) does (ARCH-REV-002 N-7).
- macOS Squirrel's install timing under `quitAndInstall` after an incomplete stop: covered because `prepared` lets
  `will-quit` pass, so the app quits normally.

## Guidance For Implementation
- Start from `evidence/P-003-fastify-silent-connection-close.probe.mjs` and `evidence/P-004-grace-drain-close.probe.mjs` as the failing and target cases.
- Install the hook last in each server (AR-003), and assert it in the studio composition test.
- Do not change `ServerProcessShutdown`, `stopManagedBackend`, the quit failure rule or the Docker starter.
- Test on separate data only; never the user's installed app or data.
