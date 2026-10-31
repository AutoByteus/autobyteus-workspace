# Implementation Handoff — update-restart-reliability (autobyteus-339)

## Upstream Artifact Package

All paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/update-restart-reliability/tickets/in-progress/update-restart-reliability/`.

- Upstream review applicability and handoff-rule result: independent architecture review selected (Medium / High); ARCH-REV-001 `Pass`. Next: Code Reviewer, per `get_handoff_rules`.
- Requirements doc: `requirements-doc.md` (SR-002, approved by the user; DEC-001 = A)
- Investigation notes: `investigation-notes.md` (FU-008 cause; P-001 to P-003)
- Solution revision record: `solution-revision-record.md`
- Design spec: `design-spec.md` (SR-003; user approval of the design: Obtained)
- Supplemental task artifacts: `fu-007-options.md` (option A, behavior-defining), `follow-ups.md`, `evidence/P-003-fastify-silent-connection-close.probe.mjs`
- Design review report: `design-review-report.md` (round 1, Pass)
- Architecture review revision record: `architecture-review-revision-record.md` (ARCH-REV-001)
- Triggering rework report, revision record, or evidence: `design-spec.md` § SR-004/SR-005; `design-review-report.md` (ARCH-REV-003); `code-review-report.md` (CRR-002); `api-e2e-execution-coverage-report.md` (API-REV-001); `evidence/P-004-grace-drain-close.probe.mjs`

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-002: D1 revised per SR-004/SR-005; IR-001 was the initial round)
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: SR-005 and SR-004 (D1 revision), SR-003 (design), SR-002 (approval; REQ-001/DEC-002 revised in SR-004)
- Related architecture-review revision IDs: ARCH-REV-001, ARCH-REV-003 (Pass on SR-005)
- Related code-review revision IDs: CRR-001 (Pass), CRR-002 (F-API-001 → Design Impact)
- Related API/E2E revision IDs: API-REV-001 (F-API-001: cut `createAgentRun` requests left prepared-only runs)
- Related delivery revision IDs: N/A
- Triggering finding IDs: F-API-001 via SR-004; AR-003, AR-004 via SR-005
- Branch `codex/update-restart-reliability`; base `origin/personal` @ `a977b2c1bc`; code commits `ddb03d0d0b` (IR-001, on `2d7f59ef86`) and `591bf52551` (IR-002, on `6fd7e4c2b9`); docs and evidence in the commits that follow each.

**D1 (REQ-001, revised in IR-002 per SR-004/SR-005).** IR-001's `SERVER_CLOSE_OPTIONS` (`forceCloseConnections`) and its test are removed, with no re-export. `autobyteus-server-ts/src/shutdown/client-connection-close.ts` exports `installClientConnectionClose(app, { graceMs?, timers? })` and `IN_FLIGHT_REQUEST_GRACE_MS = 2_000`. It tracks `app.server` `connection` / `request` / `upgrade` events (upgraded sockets are dropped from tracking and left to the WebSocket plugin) and adds one `preClose` hook. From the hook's start, every new connection is destroyed on arrival. The hook destroys the connections that never sent a request; if requests are in progress, it waits until none are or the grace passes; then it calls `app.server.closeAllConnections()`. A new request on an open connection during the grace gets Fastify's built-in 503 (routes are closed when closing starts). The comment cites FU-008 and F-API-001, and carries N-5 (a held HTTP stream must be closed by its owner first). It is installed as each server's **last** `preClose` hook:
- studio: after `registerGraphql(app)`, so after `nativeShutdown.install`, `register(websocket)` and every other registration;
- standalone application: after its static routes, so after `register(websocket)`;
- Agent Tools MCP local and credential proxy local: in the constructor (each has no other `preClose` hook).

No other `fastify(` construction or `preClose` hook exists in `src`.

**D2 (REQ-002, DEC-001 = A, DEC-005).**
- `BaseServerManager.isServerProcessGone()`: `!this.serverProcess || childExited(this.serverProcess)`.
- `ApplicationShutdown.acceptIncompleteStopForInstall()`: allowed only after the stop settled as rejected (a new `failed` flag set in the existing `catch`); it sets `prepared`, so `quit()` (will-quit) passes. Before any stop, while a stop is pending, or after a clean stop it throws "No settled incomplete application stop to accept".
- `ElectronApplication.prepareForInstall()` (private): `try { await this.shutdown.stop() } catch (error) { if (!this.serverManager.isServerProcessGone()) throw error; this.shutdown.acceptIncompleteStopForInstall() }`, wired at both `AppUpdater` sites (replacing `() => this.stop()`). `ElectronApplication.stop()` stays for `main.ts`. The incomplete stop is still reported by the existing "Application shutdown incomplete" log; no new log.

`ServerProcessShutdown`, `stopManagedBackend`, the quit failure rule (`app.exit(1)`), the Docker starter and `AppUpdater` are unchanged.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: two packages, existing owners only, one new 12-line constant file. High stays: connection semantics at close change for every client of every node server, and the update install now proceeds after an incomplete stop.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (High route)
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001; AC-001, AC-008) | Closing never waits on a client beyond a 2 s grace; requests in progress complete | `installClientConnectionClose`, last `preClose` hook in the four servers | IMP-08: never-used and idle connections closed, a 300 ms request answered, a request outlasting the grace cut at the grace, 503 during the grace, a connection opened during the grace destroyed, one opened during an earlier slow hook does not hold the close, upgraded socket untouched. Mutations: base behavior fails 5, IR-001's cut-everything fails 4. IMP-09: the studio hook order. AC-002/AC-003 are API/E2E |
| BEH-002 (REQ-002; AC-004) | Incomplete stop + server confirmed gone → install | `ElectronApplication.prepareForInstall` → `isServerProcessGone()` → `acceptIncompleteStopForInstall()` | IMP-02: prepare resolves, the incomplete stop is logged, will-quit passes; real wedged server: stop incomplete and `isServerProcessGone()` true after the force (IMP-03) |
| BEH-002 (AC-005) | Unconfirmed server exit → today's error, no install | same, rethrow | IMP-02: prepare rejects, will-quit still prevented |
| BEH-002 (AC-006) | Clean install unchanged | same, `stop()` resolves | IMP-02: resolves without consulting the server manager; `appUpdater.spec.ts` unchanged and green |
| BEH-003, BEH-004 (REQ-003; AC-007) | Docker update and 284 preserved | not touched | IMP-03 (284's force-tree test), IMP-04 (Electron suite), IMP-05 (server unit suite) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Server (`autobyteus-server-ts/`):
- `src/shutdown/client-connection-close.ts` — Add (IR-002; IR-001's `server-close-options.ts` removed)
- `src/compositions/build-studio-server.ts`, `src/compositions/build-standalone-application-server.ts`, `src/agent-tools/mcp/agent-tools-mcp-local-server.ts`, `src/credential-proxy/credential-proxy-local-server.ts` — Modify (one import, one spread each)
- `tests/unit/shutdown/client-connection-close.test.ts` — Add (from P-003/P-004; IR-001's `server-close-options.test.ts` removed)
- `tests/unit/compositions/studio-preclose-order.test.ts` — Add (studio hook order, real studio build)
- `docs/modules/agent_execution.md` — Modify

Desktop (`autobyteus-web/`):
- `electron/server/baseServerManager.ts` — Modify (`isServerProcessGone`)
- `electron/application/applicationShutdown.ts` — Modify (`acceptIncompleteStopForInstall`)
- `electron/application/electronApplication.ts` — Modify (`prepareForInstall`, wiring)
- `electron/application/__tests__/ApplicationShutdown.spec.ts` — Modify (2 cases)
- `electron/application/__tests__/ElectronInstallPreparation.spec.ts` — Add (AC-004 to AC-006)
- `electron/server/__tests__/ServerForceStopTree.spec.ts` — Modify (`isServerProcessGone` on the real wedged server, and a fake-child case)
- `docs/electron_packaging.md` — Modify

## Important Assumptions

- The test's silent connection must be accepted by the server before `close()`: a connection the server has not yet accepted does not hold the default close (found while reproducing; the test waits for `getConnections() === 2`). P-003's original order also reproduces.
- The studio and standalone application servers are not built in a unit test (too heavy); they use the same constant, and AC-002 (real server) covers the studio path end to end.
- `ElectronInstallPreparation.spec.ts` reaches the private `shutdown.quit` through a cast to check the will-quit decision without starting Electron.

## Known Risks

- N-6: a request still running after the 2 s grace is cut; its handler keeps running beside the cleanup, and a `createAgentRun` cut then can still leave a prepared-only run (FU-004). Measured handler times (54–175 ms) are far below the grace.
- N-7: the grace plus a busy cleanup fits 284's 10 s bound.
- N-5: a future long-lived HTTP stream would spend the whole grace unless its owner closes it before the server closes (noted in the helper's comment).
- N-1: a user quit while an install's stop is pending can still end with `app.exit(1)` (as today; FU-001).
- N-2: after `acceptIncompleteStopForInstall` the logger is already closed, so the install's own steps are not logged.
- N-3: the final step relies on Node's `closeAllConnections` (Node 22, Electron's Node 24); IMP-08 guards Fastify drift.
- N-4: U-2 and U-3 stay open (FU-001, FU-002).
- A stop that failed only because of the browser runtime, with the server gone, now installs. That matches REQ-002 (the rule is the server process).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix
- Reviewed root-cause classification: Missing Invariant
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: both changes are additive in their owners; `AppUpdater` still calls one `prepareForInstall` and does not inspect errors; only `ElectronApplication.prepareForInstall` calls `acceptIncompleteStopForInstall`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes` (none found)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes` — effective non-empty lines after/before: `build-studio-server.ts` 456/453, `electronApplication.ts` 403/392, `baseServerManager.ts` 437/433, `applicationShutdown.ts` 38/29, `agent-tools-mcp-local-server.ts` 113/111, `build-standalone-application-server.ts` 51/48, `credential-proxy-local-server.ts` 52/50, `client-connection-close.ts` 69/new (IR-001's `server-close-options.ts` removed); `agent-tools-mcp-local-server.ts` 113/111.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: design-spec.md § Persisted Data / State Transition Decision
- Implementation follows the approved decision: `Yes`
- Deviation: `None`

## Environment Or Dependency Notes

- The Electron binary was missing in this worktree (`browser-shell-controller.spec.ts`: "Electron failed to install correctly"); fixed with `node install.js` in `autobyteus-web/node_modules/electron`. Unrelated to this change.

## Checks Run

Code commit `ddb03d0d0b`. Environment: macOS 26 (Darwin 25.5.0), Node 22. Evidence in `evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 (superseded in IR-002) | IR-001's `server-close-options.test.ts`; that code and test are removed. Replaced by IMP-08 | `ddb03d0d0b` | — | removed code | — | Superseded | `IMP-01-server-close-options.log`, `IMP-01-fail-before-defaults.log` | — |
| IMP-02 / IMP-03 | `pnpm -C autobyteus-web exec vitest --config ./electron/vitest.config.ts run application/__tests__ server/__tests__/ServerForceStopTree.spec.ts updater/__tests__/appUpdater.spec.ts`; fail-before: the three desktop sources from base | `ddb03d0d0b` | macOS, Node 22; real wedged-server processes in `ServerForceStopTree` | `applicationShutdown.ts`, `electronApplication.ts` `prepareForInstall`, `baseServerManager.ts` `isServerProcessGone`, `appUpdater.ts` | BEH-002, AC-004, AC-005, AC-006 | Pass (5 new-behavior cases fail on base; AC-005/AC-006 pass on base, as today's behavior) | `IMP-02-install-preparation.log`, `IMP-02-fail-before-base.log` | `Tests  46 passed (46)`; base: `Tests  5 failed \| 5 passed (10)` |
| IMP-04 | `pnpm -C autobyteus-web test:electron run` | `ddb03d0d0b` | macOS, Node 22 | Electron main | AC-006, AC-007 (desktop) | Pass | `IMP-04-electron-main-suite.log` | `Tests  291 passed \| 1 skipped (292)` |
| IMP-05 (server part rerun in IR-002) | `pnpm -C autobyteus-server-ts test:unit` (full) | `ddb03d0d0b` | macOS, Node 22 | all server unit suites | AC-007 (server) | Pass | `IMP-05-server-unit-suite-summary.log` | `Tests  7538 passed \| 9 skipped (7547)` |
| IMP-06 (server part rerun in IR-002) | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-web typecheck` | `ddb03d0d0b` content | macOS, Node 22 | server `src`; Nuxt app, Electron main | — | Pass | `IMP-06-typechecks.log` | `production errors: 0; test-file errors: 298 in 139 files (baseline 298 in 139 files)` |
| IMP-07 (server part rerun in IR-002) | `pnpm -C autobyteus-server-ts test:integration:prepare`, then `vitest run tests/integration/application-backend/standalone-application-server.integration.test.ts` | `ddb03d0d0b` | macOS, Node 22 | `build-standalone-application-server.ts` with the close options | AC-007 | Pass | `IMP-07-standalone-application-server-integration.log` | `Tests  2 passed (2)` |

IR-002 (D1 revised per SR-004/SR-005) checks, on `591bf52551`. IMP-02 to IMP-04 (desktop) stay valid: `git diff --name-only ddb03d0d0b 591bf52551 -- autobyteus-web/electron` is empty.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-08 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/shutdown/client-connection-close.test.ts --no-watch`; mutations: hook body removed (base behavior), and the hook = immediate `closeAllConnections()` (IR-001's behavior) | `591bf52551` | macOS, Node 22, real sockets | `client-connection-close.ts` | BEH-001, AC-001, AC-008, AR-003 (a) | Pass (base behavior fails 5, cut-everything fails 4) | `IMP-08-client-connection-close.log`, `IMP-08-mutation-noop.log`, `IMP-08-mutation-cutall.log` | `Tests  7 passed (7)`; `Tests  5 failed \| 2 passed (7)`; `Tests  4 failed \| 3 passed (7)` |
| IMP-09 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/compositions/studio-preclose-order.test.ts --no-watch`; mutation: studio installs the hook right after `fastify({...})` | `591bf52551` | macOS, Node 22, real studio build on a temp data dir | `build-studio-server.ts` hook order, Fastify `preClose` run order | AR-003 (b) | Pass (fails when installed first) | `IMP-09-studio-preclose-order.log`, `IMP-09-mutation-installed-first.log` | `Tests  1 passed (1)`; mutation: `Tests  1 failed (1)` |
| IMP-10 | `pnpm -C autobyteus-server-ts typecheck` | `591bf52551` content | macOS, Node 22 | server `src` | — | Pass | `IMP-10-server-typecheck.log` | `exit 0` |
| IMP-11 | `pnpm -C autobyteus-server-ts test:unit` (full) | `591bf52551` | macOS, Node 22 | all server unit suites | AC-007 (server) | Pass | `IMP-11-server-unit-suite-summary.log` | `Tests  7543 passed \| 9 skipped (7552)` |
| IMP-12 | `vitest run tests/integration/application-backend/standalone-application-server.integration.test.ts` | `591bf52551` | macOS, Node 22 | `build-standalone-application-server.ts` with the hook | AC-007 | Pass | `IMP-12-standalone-application-server-integration.log` | `Tests  2 passed (2)` |

- Not run, and why: the full `test:integration` and server E2E (API/E2E's scope); AC-002 (real server with busy live runs, held connection, in-flight mutation) and AC-003 (≥ 40 isolated desktop busy quits) are API/E2E-owned; a real update install through the test feed is API/E2E's.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: no rendered UI change. The install error dialog path is unchanged; the change is in Electron main's install preparation.

## Downstream Coverage Hints / Suggested Scenarios

- AC-002 (tightened in SR-004): the API-02 shape with base contrast. Real server, busy runs (Codex `gpt-6.1-terra`, Claude, Team, Org), a never-used client connection (accepted by the server before SIGTERM), an idle keep-alive, and `createAgentRun` requests in flight around SIGTERM; exit 0 in ≤ 3 s, 0 survivors, every in-flight `createAgentRun` that reached the server completes with its response, no prepared-only or unacknowledged run after relaunch, and requests sent after close began get 503 or a refused connection.
- AC-003: the P-002 loop, ≥ 40 valid busy desktop quits from a clean checkout of the final branch, with counts.
- AC-004/005: covered by main-process tests (IMP-02, IMP-03); if the isolated app's `--test-update-feed` can drive a real install, one install after a forced stop.
- AC-007: 284's probes; optionally the Docker in-place update with a busy agent and a held connection.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Design-spec § Change / Refactor Sequence step 4: AC-002 (the API-02 shape with base contrast), AC-003 (≥ 40 runs, counts), a real install after a forced stop if the test feed allows, AC-007 (284's probes). Test on separate data only.
