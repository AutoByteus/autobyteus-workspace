# Design Spec — update-restart-reliability (autobyteus-339)

## Solution And Approval Basis
- Current solution revision ID: `SR-003`.
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
  - Server: one shared close-option constant used by four Fastify servers.
  - Desktop: the install preparation's rule for an incomplete stop (a server-manager query, one `ApplicationShutdown`
    transition, `ElectronApplication`'s install preparation).
  - Tests; docs.
  - Two packages, existing owners only.
- **Architectural risk: `High`.**
  - Shutdown connection semantics change for every client of every node: in-flight requests are cut (DEC-002).
  - The update install now proceeds after an incomplete stop: deployment and lifecycle behavior.
- **Escalation triggers:**
  - a flow that relies on an HTTP response completing during shutdown;
  - an install after an incomplete stop that leaves a process or data in a bad state.

## Intended Change
1. **D1 (REQ-001):** every Fastify server the node runs closes all client connections when it closes, so `onClose`
   (the run cleanup) never waits on a client.
2. **D2 (REQ-002):** "Install update and restart" installs after an incomplete stop when the server process is
   confirmed gone; otherwise, today's error.

## Change Scope (Mandatory)
- In scope: UC-001, UC-002.
  - D1: the four Fastify constructions, plus one shared constant in `src/shutdown`.
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
| BEH-001 | Operational | REQ-001; AC-001 to AC-003 | Desktop quit, Restart server, update install, SIGTERM, `docker stop` | Run cleanup waits for every client connection | Connections closed after `preClose`; cleanup starts at once | DS-001 |
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
  - an in-flight client request at shutdown gets no response (DEC-002, accepted);
  - the macOS install-on-quit behavior after `app.exit(1)` is unknown (FU-001).

## Terminology
- No new domain word. "Server process confirmed gone": the managed server child has an exit code or signal (`childExited`).

## Legacy Removal Policy (Mandatory)
- Nothing removed. No compatibility path is added.

## Persisted Data / State Transition Decision
- `Not Affected`.

## Data-Flow Spine Inventory
| Spine | Scope | BEH | Start | End | Owner |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001 | SIGTERM / IPC request / `app.close()` on any node server | Cleanup done, exit | `ServerProcessShutdown` → Fastify close |
| DS-002 | Primary | BEH-002 | "Install update and restart" (user or unattended) | `quitAndInstall` or the error | `ElectronApplication` install preparation |

## Primary Execution Spine(s)
- DS-001: `SIGTERM | IPC → ServerProcessShutdown.request → app.close() → preClose (native drain; WebSocket clients closed) → ★ all remaining HTTP connections closed (forceCloseConnections) → server closed → onClose: run cleanup (application stop → closeProcessResources → supervisor) → sweep → exit 0`
- DS-002: `Install click → AppUpdater.installUpdateAndRestart → ElectronApplication.prepareForInstall → ApplicationShutdown.stop() → [rejects] → ★ serverManager.isServerProcessGone()? → yes: ApplicationShutdown.acceptIncompleteStopForInstall() → quitAndInstall → will-quit passes → install | no: rethrow → existing error`

## Spine Narratives (Mandatory)
| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 | A server that is closing no longer waits for its clients: once the hooks before close have run (native commands drained, WebSockets closed), every HTTP connection is closed, so run cleanup starts in milliseconds whatever the clients do | Fastify close, configured per server |
| DS-002 | An install after an incomplete stop goes ahead when the old server is confirmed gone; the incomplete stop is still reported in the log, as today. Only an unconfirmed server exit keeps today's error | `ElectronApplication` |

## Ownership Map
- Each server's composition owns its Fastify options; the close rule has one definition (`SERVER_CLOSE_OPTIONS`).
- `BaseServerManager` owns the fact "server process confirmed gone" (it owns the child).
- `ApplicationShutdown` owns the prepared state that lets `will-quit` pass.
- `ElectronApplication` owns the install-preparation sequence (it already composes the shutdown and the server manager).

## Removal / Decommission Plan (Mandatory)
- None.

## Bounded Local / Internal Spines
- Install preparation: `stop → ok: install | rejected → server gone? → accept and install | rethrow`.

## Ownership Boundaries
- `AppUpdater` keeps calling one `prepareForInstall`. It does not inspect shutdown errors.
- No caller other than `ElectronApplication.prepareForInstall` uses `acceptIncompleteStopForInstall`.

## Boundary Encapsulation Map
| Boundary | Encapsulates | Forbidden bypass |
| --- | --- | --- |
| `SERVER_CLOSE_OPTIONS` | The close rule | A server choosing its own close behavior silently |
| `BaseServerManager.isServerProcessGone()` | The child's exit state | Parsing `ShutdownIncompleteError` messages to infer it |
| `ApplicationShutdown.acceptIncompleteStopForInstall()` | The prepared state after a settled failure | Setting `prepared` from outside; calling it while a stop is pending |

## Dependency Rules
- The four server files → `src/shutdown/server-close-options.ts` (no other dependency).
- `electronApplication.ts` → `serverManager.isServerProcessGone()`, `shutdown.acceptIncompleteStopForInstall()`.

## Interface Boundary Mapping
| Interface | Responsibility |
| --- | --- |
| `export const SERVER_CLOSE_OPTIONS = { forceCloseConnections: true } as const` | One rule for every node server: closing never waits on a client |
| `BaseServerManager.isServerProcessGone(): boolean` | `!this.serverProcess \|\| childExited(this.serverProcess)` |
| `ApplicationShutdown.acceptIncompleteStopForInstall(): void` | Only after the stop settled as rejected: `prepared = true` (will-quit then passes); throws if no stop settled |
| `ElectronApplication.prepareForInstall(): Promise<void>` | Replaces `prepareForInstall: () => this.stop()` |

## Existing Capability / Subsystem Reuse Check
| Need | Existing | Decision |
| --- | --- | --- |
| Close connections at close | Fastify `forceCloseConnections` | Reuse (P-003 proves it) |
| "Server gone" | `childExited`, `serverProcess` | Reuse via one query |
| Install sequencing | `AppUpdater.prepareForInstall` | Reuse the hook |
| Incomplete-stop log | `ApplicationShutdown` report ("Application shutdown incomplete") | Reuse; no new log |

## Final File Responsibility Mapping
| File | Change | Responsibility |
| --- | --- | --- |
| `autobyteus-server-ts/src/shutdown/server-close-options.ts` | Add | `SERVER_CLOSE_OPTIONS`, with a comment citing the cause |
| `autobyteus-server-ts/src/compositions/build-studio-server.ts` | Modify | Spread `SERVER_CLOSE_OPTIONS` into `fastify({...})` (`:403`) |
| `autobyteus-server-ts/src/compositions/build-standalone-application-server.ts` | Modify | Same (`:18`) |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-local-server.ts` | Modify | Same (`:30`) |
| `autobyteus-server-ts/src/credential-proxy/credential-proxy-local-server.ts` | Modify | Same (`:20`) |
| `autobyteus-server-ts/tests/unit/shutdown/server-close-options.test.ts` (or integration) | Add | From P-003: one used and one silent connection; close completes and `onClose` runs within 1 s; one case per server construction where cheap (fails without the option) |
| `autobyteus-web/electron/server/baseServerManager.ts` | Modify | `isServerProcessGone()` |
| `autobyteus-web/electron/application/applicationShutdown.ts` | Modify | `acceptIncompleteStopForInstall()` |
| `autobyteus-web/electron/application/electronApplication.ts` | Modify | `prepareForInstall()` and its wiring at `:73-75` |
| `autobyteus-web/electron/application/__tests__/ApplicationShutdown.spec.ts`, a new `ElectronInstallPreparation.spec.ts` or the existing updater/application tests | Modify/Add | AC-004 to AC-006: incomplete + gone → install proceeds and `will-quit` passes; incomplete + not gone → rejects, no install; clean → unchanged; accept before settle → throws |
| `autobyteus-server-ts/docs/modules/agent_execution.md` (server shutdown section) and `autobyteus-web/docs/electron_packaging.md` § Confirmed backend and application shutdown | Modify | The close rule; the install rule |

## Concrete Examples / Shape Guidance
| Topic | Good | Avoided |
| --- | --- | --- |
| Close rule | `fastify({ ...SERVER_CLOSE_OPTIONS, logger: …, routerOptions: … })` | A `preClose` hook that hunts sockets itself; four separate inline `forceCloseConnections` literals |
| Install | `async prepareForInstall() { try { await this.shutdown.stop() } catch (error) { if (!this.serverManager.isServerProcessGone()) throw error; this.shutdown.acceptIncompleteStopForInstall() } }` | Parsing the error message; passing a callback into `ApplicationShutdown` that reaches the server manager |

## Backward-Compatibility Rejection Log (Mandatory)
| Candidate | Decision |
| --- | --- |
| A setting to keep waiting for clients | Rejected |

## Change / Refactor Sequence
1. D1: the constant, the four servers, and the test from P-003 (failing first).
2. D2: the query, the transition, the install preparation, and the tests.
3. Docs.
4. Validation (API/E2E):
   - AC-002: a real server with busy runs, one silent client connection (as P-003) and one slow request, SIGTERM;
     exit 0 in ≤ 3 s.
   - AC-003: the P-002 loop, ≥ 40 valid desktop busy quits on a build from the final branch, from a clean checkout,
     with counts reported.
   - AC-004/005: main-process tests. If the isolated app's `--test-update-feed` can drive a real install, one install
     after a forced stop.
   - Optionally, the Docker in-place update (autobyteus-305) with a busy agent and a held client connection: the
     server exits 0 quickly.
   - AC-007: 284's probes.
   - Live models per `TESTING.md`: Codex `gpt-6.1-terra`.

## Key Tradeoffs
- **`forceCloseConnections: true` instead of closing only unused connections:** it is one documented Fastify option,
  proven by P-003. In-flight requests at shutdown are cut (DEC-002). The Docker update request answers 202 before the
  starter stops the server (`node-update-routes.ts:48-66`; `docker/starter/update-service.mjs`), so nothing relies on a
  response during close.
- **All four servers:** one rule, no later stall from the same cause (DEC-004).
- **Keep today's error when the server exit is unconfirmed:** no retry machinery for a near-impossible state (DEC-005).

## Risks
- A client flow that relies on a response completing during shutdown. None found (`Read`); validation watches for it.
- macOS Squirrel's install timing under `quitAndInstall` after an incomplete stop: covered because `prepared` lets
  `will-quit` pass, so the app quits normally.

## Guidance For Implementation
- Start from `evidence/P-003-fastify-silent-connection-close.probe.mjs` as the failing case.
- Do not change `ServerProcessShutdown`, `stopManagedBackend`, the quit failure rule or the Docker starter.
- Test on separate data only; never the user's installed app or data.
