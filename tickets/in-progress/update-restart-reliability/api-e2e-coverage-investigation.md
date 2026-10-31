# API/E2E Coverage Investigation — update-restart-reliability (autobyteus-339)

The plan. Results, confidence and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.
Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/update-restart-reliability/tickets/in-progress/update-restart-reliability/`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-002, approved by the user; DEC-001 = A)
- Investigation Notes: `investigation-notes.md` (FU-008 cause; P-001 to P-003)
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-003)
- Supplemental Task Artifacts: `fu-007-options.md` (behavior-defining, option A), `follow-ups.md` (FU-001, FU-002), `evidence/P-001..P-003`, `evidence/repro-*`
- Design Review Report: `design-review-report.md` (round 1, Pass; untracked, owned by the architecture reviewer)
- Architecture Review Revision Record: `architecture-review-revision-record.md` (ARCH-REV-001; untracked, owner's)
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, Pass 9.5)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md` (after this round)
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code reviewer, CRR-001 Pass (code `ddb03d0d0b`, docs `22bf2338a9`, `0a8888fcb2`, review `2c3575b0f0`).
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- **REQ-001 / D1:** all four Fastify servers use `SERVER_CLOSE_OPTIONS = { forceCloseConnections: true }`. The order is `preClose` (native drain, WebSocket close) → `closeAllConnections()` → `server.close()` → `onClose` (run cleanup). No client connection (unused, idle keep-alive, or with a request in flight) delays the cleanup. An in-flight request is cut (DEC-002).
- **REQ-002 / D2:** `ElectronApplication.prepareForInstall()`: the stop rejected and `isServerProcessGone()` → `acceptIncompleteStopForInstall()` → `quitAndInstall`. Otherwise the existing error (DEC-005).
- **REQ-003:** autobyteus-284 preserved (bound, sweep, interrupt-first, one server after relaunch, no `terminatedAt` on shutdown, continuity, idle quit ≈ 0.3 s); Docker update preserved (BEH-003).
- **AR-002 risk (review):** a cut request's handler keeps running beside the `onClose` cleanup. `createAgentRun` is `prepareAgentRun` (writes metadata and a history-catalog "prepared" record) followed by `activate`, with no cancel if activation fails. `cleanupStalePreparedRuns` has no production caller (`Read`). A create-run cut between prepare and a refused activation could therefore leave a prepared-only run. Before D1 the close waited for that request to finish.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (node stop: desktop quit, Restart server, SIGTERM), SCN-002 (a client holds a spare unused connection), SCN-003 (install after an incomplete stop: main-process tests; real install assessed), SCN-004 (Docker update, preserved: not run, optional).
- Real-use scenarios added from the implemented behavior:
  - **SCN-002b: a client's create-run in flight at shutdown.** The UI's "new run" (`createAgentRun`) lands while the node is stopping, for example during an update restart. AR-002.
  - **SCN-002c: an idle keep-alive connection** from a client that made earlier requests. AC-001's second connection type, at the real server level.
- Contrived scenarios: none recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 server close never waits on clients | Changed | REQ-001, P-002, P-003 | AC-002 real-server probe with an accepted silent connection, a keep-alive, and in-flight create-run requests; AC-003 desktop loop ≥ 40 |
| In-flight request cut (DEC-002) | Changed | DEC-002, AR-002 | Probe the in-flight create-run's client outcome and the stored state after relaunch (prepared-only leftovers) |
| BEH-002 install after an incomplete stop | Changed | REQ-002, DEC-001/005 | IMP-02/03 (main process, real wedged server); a real install is assessed for safety |
| BEH-003 Docker update | Preserved | autobyteus-305 | Not run (optional; unchanged code) |
| BEH-004 autobyteus-284 | Preserved | 284 archive | 284's gated E2E and desktop journeys |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | Yes | HTTP connection lifetime at close (all node servers) | IMP-01 (plain Fastify + two local server classes), IMP-07 | Studio server with real clients and handlers running during the cut | Live API (real server process) |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | Indirect | The desktop window's connections to the embedded server | P-002 (design phase, pre-fix) | The stall rate after the fix | Isolated desktop loop |
| Authentication / session | No | — | — | — | — |
| Desktop renderer | No | — | — | — | — |
| Desktop shell / Electron | Yes | Install preparation after an incomplete stop | IMP-02/03 (real wedged server for `isServerProcessGone`) | A real Squirrel install | Assessed (see Not Tested) |
| Process / lifecycle | Yes | Server shutdown timing; desktop quit | IMP-01, 284 suites | Real busy runtimes, real Chromium connections | Live API; desktop loop |
| Persisted-data transition | No (`Not Affected`) | — | — | Stored state after a cut create-run | Probe after relaunch |
| Worker / queue | No | — | — | — | — |
| External integration | Yes | Codex/Claude CLIs during shutdown (unchanged), Chromium connection behavior | — | — | Live runs |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-restart-reliability`. Builds under test come from a **clean detached checkout** of the validated commit in a run-owned temp directory, removed afterwards.
- Stack: as autobyteus-284 (Node 22 server; Electron 42 desktop; Codex CLI; Claude Code).
- Testing guideline: `TESTING.md` (root); `docs/isolated-app-instances.md`; `AGENTS.md`.
- Conflicting or unclear instructions: none. The user's installed AutoByteus is running and is never signalled or read. Process checks use run-unique markers or the instance's own data root.
- Secrets: host Codex/Claude logins only; throwaway `CODEX_HOME`.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Layers, clean env, one heavy run at a time, CLI homes, Rule 2 | As in 284 |
| `docs/isolated-app-instances.md` | Isolated desktop | `start --from-worktree --data-root`, `--test-update-feed`, `stop` |
| `evidence/P-001-live-server-probe.mjs`, `P-002-desktop-probe.mjs`, `P-002-desktop-busy-quit-loop.sh` | Reproduction probes (284 copies) | Server `mixed`/`repeat` modes; desktop `busy-quit` loop |
| `tickets/done/settings-update-notifications` (API-14, AC-007); autobyteus-284 API-14 | Install safety precedent | ShipIt relaunches the installed app outside the `e2e` profile (Rule 2) |

| Component / Dependency | Working Directory | Start / Setup Command | Notes | Readiness | Stop / Cleanup |
| --- | --- | --- | --- | --- | --- |
| Clean checkout | run temp dir | `git worktree add --detach`; `pnpm install --frozen-lockfile --offline`; server `prebuild`+`build`; `build:electron:mac` | One heavy build at a time | `dist/app.js`, `electron-dist` | `git worktree remove --force` |
| Real server process | clean `autobyteus-server-ts` | `node dist/app.js --port --data-dir` | Own data root, port, `CODEX_HOME` | `/rest/health` | SIGTERM under test; fallback by recorded PID |
| Isolated desktop | clean checkout root | `isolated-app start --from-worktree --data-root <owned>` | Own ports/data/group | start JSON | quit under test; `stop` after exit |

| Data / Fixture / Identity Need | Method | Safety | Cleanup |
| --- | --- | --- | --- |
| Agent/Team/Org definitions and runs | GraphQL | Test-owned data roots | Removed |
| Busy turn | Foreground `python3 … time.sleep(900) <marker>` | Marker-based orphan search | Fallback kill of marked processes |
| Silent client connection | `net.connect` to the server port, no bytes, held until shutdown (accepted before SIGTERM) | Own socket | Closed by the server or the probe |
| In-flight state-changing request | `createAgentRun` (Codex) sent on fresh connections, staggered around SIGTERM | Own data | Inspected after relaunch, then removed with the data root |

## Existing Durable Coverage Inventory

| Path / Test | Intent | Related | Validity | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/shutdown/server-close-options.test.ts` | Close with silent + keep-alive connections finishes and `onClose` runs within 1 s | AC-001 | Still Valid | IMP-01 | Reuse |
| `autobyteus-web/electron/application/__tests__/ElectronInstallPreparation.spec.ts`, `ApplicationShutdown.spec.ts`, `server/__tests__/ServerForceStopTree.spec.ts`, `updater/__tests__/appUpdater.spec.ts` | AC-004..006 | AC-004..006 | Still Valid | IMP-02/03 | Reuse |
| Electron main suite, server unit suite, typechecks, standalone application server integration | Regression | AC-007 | Still Valid | IMP-04..07 | Reuse |
| `autobyteus-server-ts/tests/e2e/shutdown/busy-run-stop-now.e2e.test.ts` (+ fixtures) | 284 stop-now on real processes | AC-007 | Still Valid | 284 | Rerun on the clean build |
| `autobyteus-server-ts/tests/e2e/shutdown/native-standalone-host-shutdown.e2e.test.ts` | Standalone host close with native commands; the standalone server now has the close option | AC-007 | Still Valid | 284 | Rerun |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R1 | AC-001, AC-004, AC-005, AC-006, AC-007 (unit/main) | Repository | Reused | IMP-01..IMP-07 | Ran on `ddb03d0d0b`; nothing since changes code |
| API-00 | — | Build provenance | Journey (setup) | clean checkout of `2c3575b0f0`; server + desktop builds | — |
| API-01 | AC-007 | 284 gated E2E (stop-now) and native standalone host | Existing Test | `RUN_BUSY_STOP_NOW_E2E=1 … busy-run-stop-now.e2e.test.ts`; `RUN_NATIVE_STANDALONE_SHUTDOWN_E2E=1 … native-standalone-host-shutdown.e2e.test.ts` | Real-process regressions on the studio server and the standalone application host |
| API-02 | AC-002, DEC-002, AR-002 | Real server process; busy Codex + Claude standalone, Codex Team member, Claude Org agent; accepted silent TCP connection; idle keep-alive; staggered in-flight Codex `createAgentRun` requests; SIGTERM; relaunch | Temporary Probe | `evidence/P-001-live-server-probe.mjs held-connection <clean server> evidence` | Live; checks exit ≤ 3 s / 0 / 0 survivors, client outcome of each cut request, stored state (history + `run_metadata.json` `preparedAt`/`startedAt`) after relaunch |
| API-03 | AC-002 base contrast | Same probe against the base build (`a977b2c1bc`) | Temporary Probe | same, base server | Shows the silent connection holding the base close (expected: bound expires, exit 1) |
| API-04 | AC-003 | Isolated desktop, P-002 loop, ≥ 40 valid busy quits | Journey | `evidence/P-002-desktop-busy-quit-loop.sh 42 <dir>` from the clean checkout | Required count |
| API-05 | AC-007 (desktop) | Isolated desktop idle quit, busy SIGTERM, wedged-server quit, once each | Journey | `P-002-desktop-probe.mjs idle / busy-sigterm / wedged-quit` | 284's desktop journeys on the new build |
| API-06 | AC-004 real install | `--test-update-feed` install after a forced stop | Assessment | — | See Not Tested: unsafe (ShipIt relaunch outside the `e2e` profile, Rule 2) |

- Test progress log needed: `Yes`.

## Durable Coverage To Add

None planned. AC-002 needs live runtimes and paid inference, and AC-003 needs the packaged desktop, so both stay probes, as in 284. If AR-002 shows a defect, a deterministic durable case is proposed with the finding.

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan (When Applicable)

- Isolated packaged instances of the clean build, driven over CDP. Quit by `window.electronAPI.startShutdown()` (menu Quit's `app.quit()`). OS signals only to PIDs this run started. The user's running app is never touched.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| Real "Install update and restart" through `--test-update-feed` after a forced stop | A real install makes ShipIt relaunch the installed app outside the isolated `e2e` profile, against the user's real data (TESTING Rule 2; precedents settings-update-notifications AC-007, 284 API-14). A same-build feed could pass signature validation and actually install | The Squirrel step after `quitAndInstall`; D2's decision itself is covered by IMP-02/03 (real wedged server) | Yes: the user's next real update after a busy quit | Recorded for delivery |
| Docker in-place update with a busy agent and a held connection | Optional in the design; the Docker starter is unchanged; building a test image is heavy | Low | No | None |
| Windows/Linux | No host | — | No | — |

## Ambiguities Or Reroute Triggers

- AR-002: a prepared-only run left by a cut `createAgentRun` would be a new consequence of D1. If observed, it is routed as a failure for failure-origin review.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Durable Coverage Will Be Added / Updated / Removed: `No` (unless AR-002 shows a defect)
- Reroute Required Before Validation Execution: `No`

## Round 2 (API-REV-002) — rerun plan after IR-002 / CRR-003

- Trigger: code reviewer, CRR-003 Pass of IR-002 (code `591bf52551`, docs `e0dc8fdf76`, review `3be28563ea`). D1 replaced (last-`preClose` grace drain `installClientConnectionClose`; `forceCloseConnections` removed); D2 unchanged (desktop diff empty).
- Prior unresolved failure: F-API-001 (rechecked first, by API-02 in the same shape).
- AC-002 now requires every in-flight create that reached the server to complete with its response and no prepared-only run (requirements SR update); AC-008 new (deterministic, IMP-08).

| Case | Decision | Reason |
| --- | --- | --- |
| API-R2 | Reused: IMP-02/03/04 (desktop unchanged), IMP-08..IMP-12 | Ran on `591bf52551` (or desktop code unchanged since `ddb03d0d0b`) |
| API-02 (R2, two samples) | **Rerun** | F-API-001 recheck and AC-002 as revised, on an unmodified clean build of `3be28563ea` |
| API-02T (R2) | **Add** | One more sample with temporary `[339-DIAG]` timestamps (hook start/end, studio `onClose` start) to measure SIGTERM → run-cleanup start; diagnostics restored afterwards |
| API-03 | Still valid | Base build `a977b2c1bc` and the probe's request/connection shape are unchanged; its outcome (silent connection holds the close to the bound; creates complete) is the contrast |
| API-04 | **Rerun** (42 iterations) | Server close path changed; desktop build bundles it |
| API-01, API-05 | **Rerun** | 284 regressions on the new server code |
| API-06 | Not tested (unchanged reason) | Unsafe real install |

- Round 2 decision: proceed; no durable coverage changes; no reroute. Iteration 21 of API-04 R2 excluded by the same rule as the designer's series (the Org agent never started its command).
