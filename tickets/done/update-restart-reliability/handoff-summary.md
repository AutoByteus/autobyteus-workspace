# Handoff Summary — update-restart-reliability (autobyteus-339: shutdown never waits on a client; update installs after a confirmed-gone server)

## Ticket

- Package: `update-restart-reliability`; Project Task `autobyteus-339` (follow-up to autobyteus-284's FU-007 and FU-008; needed before autobyteus-285's unattended update and resume).
- Classification: `task_size=Medium`, `architectural_risk=High`; route `Reviewed`.
- Gates:
  - architecture review: ARCH-REV-001 Pass, ARCH-REV-002 Fail (AR-003), ARCH-REV-003 Pass;
  - code review: CRR-001 Pass; CRR-002 failure-origin review, Design Impact (F-API-001, a cut create left partial runs); CRR-003 Pass; CRR-004 test review Not Applicable (no durable test change by API/E2E);
  - API/E2E: API-REV-002 Pass, 94.1%, every category ≥ 93%.
- Archived ticket folder: `tickets/done/update-restart-reliability/` on `personal`.

## What Changed

- **D1, client connections never hold the server's close.** `installClientConnectionClose` (`autobyteus-server-ts/src/shutdown/client-connection-close.ts`) is the last `preClose` hook in the studio server, the standalone application server, the local Agent Tools MCP server and the credential proxy. At close it:
  - destroys connections that never sent a request, and any that arrive from then on;
  - lets requests in progress finish within 2 s, so a `createAgentRun` in flight completes and its client gets the run ID;
  - then closes the rest, so the run cleanup starts at once.
  This removes 284's FU-008: an unused browser connection held the close for 10 s, so the bound expired and the server exited 1.
- **D2, "Install update and restart" after an incomplete stop.** When the stop is incomplete but the server process is confirmed gone (`BaseServerManager.isServerProcessGone()`), the incomplete stop is logged, `ApplicationShutdown.acceptIncompleteStopForInstall()` lets `will-quit` pass, and the update installs. When the server's exit is not confirmed, the existing error is kept (DEC-005). A normal quit after an incomplete stop still ends with `app.exit(1)`.
- Tests:
  - `client-connection-close.test.ts` (real sockets, mutation-checked);
  - `studio-preclose-order.test.ts` (real studio build, hook order);
  - `ElectronInstallPreparation.spec.ts` and `ApplicationShutdown.spec.ts` changes;
  - a `ServerForceStopTree.spec.ts` case for `isServerProcessGone`.
- Docs: `agent_execution.md`, `electron_packaging.md`, `docs/design-cases.md`.

## Integration

- Before merging, delivery committed the architecture reviewer's untracked report and revision record (ARCH-REV-001 to ARCH-REV-003 Pass) as a checkpoint: `aaf0228a80`.
- Merged `origin/personal` @ `0ab3f4a6d7` (81 commits, mainly autobyteus-316's cross-runtime resume) into the ticket branch → `6160f551aa`. No conflicts.
  - The only shared file is `build-studio-server.ts`, changed in separate hunks.
  - The base adds no close hooks, no servers and no shutdown or Electron changes.
- Post-integration checks, all Pass (details in `release-deployment-report.md`):
  - server typecheck;
  - focused shutdown, `preClose` order, gate and manager suites (91 tests);
  - Electron main suite (291 tests);
  - server build, then 284's gated real-process E2E (3 tests): Terminate 86 ms; busy SIGTERM exit 0 in 788 ms with nothing left; application terminate 87 ms;
  - the standalone application server integration test;
  - the full server unit suite;
  - the release guide's artifact-hygiene and licensing checks.

## Verification

- Judged from the evidence; no user check needed. Every critical AC is directly proven:
  - AC-002: API-02 R2 and API-02B R2. Every create sent before SIGTERM got its run ID, with 0 prepared-only and 0 unacknowledged runs, exit 0 in 1.5–1.6 s and 0 survivors.
  - AC-002 timing: API-02T shows the run cleanup starting at +86 ms.
  - AC-003: API-04 R2, 41 valid busy desktop quits, 0 stalls, median 1.4 s.
  - AC-001 and AC-008: IMP-08, mutation-checked.
  - AC-004 to AC-006: IMP-02, which fails on the base.
  - AC-007: API-01 R2, API-05 R2, and delivery's rerun.
- The real Squirrel install was not run. It is unsafe outside the isolated profile, and the AC's own verification method is main-process tests. The first real update the user installs after a busy quit will exercise it.

## Release

- No release, as the release guide's default; the request did not ask for one. The change ships with the next beta or stable release.

## For The Solution Designer

- Follow-ups FU-001 to FU-004 are in `follow-ups.md`; none has been sent. FU-004 (a non-atomic `createAgentRun`) still applies: a handler that runs longer than the 2 s grace is cut.
- This ticket resolves autobyteus-284's FU-008 (the cause was the unused connection, not the Org stage) and FU-007 (DEC-001 = A).
- Not tested: the real Squirrel install after a forced stop (user-only), the optional Docker update, and Windows.
