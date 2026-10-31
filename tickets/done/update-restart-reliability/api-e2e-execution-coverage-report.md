# API/E2E Execution Coverage Report — update-restart-reliability (autobyteus-339)

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/update-restart-reliability/tickets/in-progress/update-restart-reliability/`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: **round 2**; CRR-003 Pass of IR-002 (code `591bf52551`; docs `e0dc8fdf76`; review `3be28563ea`). D1 replaced by the last-`preClose` grace drain (`installClientConnectionClose`, 2 s); D2 unchanged. Round 1 (CRR-001, code `ddb03d0d0b`) failed on F-API-001.
- Prior round reviewed: round 1 (API-REV-001, `Fail`). Rerun plan: investigation § Round 2. Round-2 rows are marked `R2`; round-1 rows are kept as history.
- Deviations from the investigation's plan, and why:
  - API-02 ran twice (API-02, API-02B). The second sample adds a restore attempt on the prepared-only runs found in the first.
  - API-06 (real install) not executed, as planned (unsafe).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-restart-reliability/tickets/in-progress/update-restart-reliability/evidence/` (commit in the handoff).

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed` (ARCH-REV-001 Pass, CRR-001 Pass)
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (round 2 `Pass`, High route). API/E2E changed no durable test code; the review covers IR-002's tests (`client-connection-close.test.ts`, `studio-preclose-order.test.ts`) at the reviewer's discretion. Round 1 requested failure-origin review.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `2c3575b0f0` (code `ddb03d0d0b`), clean detached checkout | macOS 26 (Darwin 25.5.0) arm64, Node 22.23.1 | `pnpm install --frozen-lockfile --offline`; server `prebuild`+`build` (`dist/shutdown/server-close-options.js` present) | Server probes: `node dist/app.js --port --data-dir <owned>`, data `.env` `APP_ENV=test`; real `HOME`/`USER`/`LOGNAME`; throwaway `CODEX_HOME` |
| ENV-2 | same | same | `build:electron:mac` (6 m 54 s) → `electron-dist/mac-arm64/AutoByteus.app` (packaged server carries `SERVER_CLOSE_OPTIONS`; `app.asar` carries `acceptIncompleteStopForInstall`) | `isolated-app start --from-worktree --data-root <owned>`; CDP + GraphQL |
| ENV-3 | base `origin/personal` @ `a977b2c1bc`, clean detached checkout | same | base server build (284's bound and sweep, default close options) | Contrast only (API-03) |
| ENV-4 | `3be28563ea` (code `591bf52551`), clean detached checkout | macOS 26 arm64, Node 22.23.1 | server build; `build:electron:mac` (7 m 50 s), packaged server carries `installClientConnectionClose` | Same settings as ENV-1/2. API-02T only: temporary `[339-DIAG]` timestamps in `dist` (restored before every other case) |
| Live models | — | — | Codex CLI 0.166.0, `gpt-6.1-terra`, `reasoning_effort: medium`; Claude Code (host login), `claude-haiku-4-5-20251001` | Busy = foreground `python3 -c "import time; time.sleep(900)" <marker>` |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R1 | AC-001, AC-004, AC-005, AC-006, AC-007 (unit/main) | Repository | Reused IMP-01..IMP-07 | — | Pass | implementation-handoff Checks Run | per IMP row | `git diff --name-only ddb03d0d0b HEAD` outside `tickets/` is empty |
| API-00 | — | Build provenance | clean checkouts; server and desktop builds | ENV-1/2/3 | Pass | (progress log) | — | — |
| API-01 | AC-007 | 284's gated real-process E2E: studio server stop-now (Terminate, SIGTERM, relaunch `terminatedAt`), application terminate, standalone host close with native commands | `RUN_BUSY_STOP_NOW_E2E=1 RUN_NATIVE_STANDALONE_SHUTDOWN_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/shutdown/busy-run-stop-now.e2e.test.ts tests/e2e/shutdown/native-standalone-host-shutdown.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-01-gated-e2e.log`, `API-01-busy-run-stop-now.json`, `API-01-busy-application-terminate.json`, `API-01-native-standalone-host-result.json` | `Tests  3 passed (3)`; terminate `"elapsedMs": 90`; SIGTERM `"elapsedMs": 860`, `"code": 0`, `"sweepLines": []`; shutdown run `"terminatedAt": null` | — |
| API-02 | AC-002, DEC-002, AR-002 | Real server process. Busy Codex + Claude standalone, Codex Team member, Claude Org agent. One accepted silent TCP connection, one idle keep-alive, six Codex `createAgentRun` requests staggered around the SIGTERM (median create latency 122 ms). Relaunch on the same data | `env -i PATH HOME USER LOGNAME TMPDIR CASE_ID=API-02 node evidence/P-001-live-server-probe.mjs held-connection <clean>/autobyteus-server-ts evidence` | ENV-1 | **AC-002 Pass; AR-002 Fail (F-API-001)** | `API-02-result.json`, `API-02-run.log`, `API-02-server-first.log`, `API-02-server-second.log`, `API-02-ws-frames.json` | `"exit":{"code":0`, `"elapsedMs":1362`; `"survivors": []`, `"markedLeft": []`, `"shutdownLog": []`; `"silentClosedRelSigtermMs":3`, `"keepAliveClosedRelSigtermMs":3`. In flight: k0–k2 (sent −61/−36/−12 ms) `ECONNRESET` at +2 ms; k3–k5 (sent after SIGTERM) `ECONNREFUSED`. After relaunch, three runs the client never received: two complete (`startedAt` set), one **prepared-only** (`"startedAt":null`), listed `"status":"offline"`; server log `Error in createAgentRun: AgentCreationError: AgentRun activation admission is closed for process shutdown.` | — |
| API-02B | as API-02 (second sample, plus restore of prepared-only runs) | same | same, `CASE_ID=API-02B` | ENV-1 | **AC-002 Pass; AR-002 Fail (F-API-001)** | `API-02B-result.json`, `API-02B-run.log`, `API-02B-server-*.log`, `API-02B-ws-frames.json` | `"code":0`, `"elapsedMs":1610`, `"survivors": []`; connections closed at +6 ms; k0–k2 `ECONNRESET` at +5 ms, k3–k5 `ECONNREFUSED`; **3 prepared-only runs** listed `"status":"offline"`; `preparedOnlyRestore`: 3× `"Agent run restored successfully."`; three `activation admission is closed for process shutdown` log lines | — |
| API-03 | AC-002 base contrast | Same probe on the **base** build | same, base server, `CASE_ID=API-03` | ENV-3 | Observed (contrast) | `API-03-result.json`, `API-03-run.log`, `API-03-server-*.log` | `Server shutdown exceeded 10s; forcing exit`; `"code":1`, `"elapsedMs":10583`; `"silentClosedRelSigtermMs":10583` (the silent connection held the close); k0–k2 got `"success":true` responses; `preparedOnly 0`, `unknown 0` | The FU-008 mechanism, reproduced deterministically at server level; in-flight creates completed on the base |
| API-04 | AC-003 | Isolated desktop: P-002 loop. Per iteration: "Restart server" while Codex is busy; busy Codex/Claude standalone, Codex Team member, Claude Org agent; user quit; relaunch; continue all four roots | `cd <clean> && bash evidence/P-002-desktop-busy-quit-loop.sh 42 <run dir>` | ENV-2 | Pass | `API-04/API-04-summary.json`, `API-04/API-04-iterations.json`, `API-04/API-04-loop-summary.txt`, sample `API-04/API-04-iter1-*` | `"runs": 42, "valid": 42, "stalls": 0`; `serverGoneMs` min 968 / median 1378 / max 1602; `"nonZeroExit": 0` (every iteration `0/0/0`: restart, busy quit, final quit); `"exceeded10s": 0`, `"sweepLines": 0`, `"appShutdownIncomplete": 0`, `"survivorsTotal": 0`; `"relaunchOne": 42`, `"continued4of4": 42` | Before the fix the same loop gave 2 stalls in 78 (investigation P-002) |
| API-05 | AC-007 (desktop), idle quit speed | Isolated desktop: idle quit + relaunch; busy SIGTERM to Electron main; wedged (SIGSTOP) server quit | `P-002-desktop-probe.mjs idle / busy-sigterm / wedged-quit` | ENV-2 | Pass | `API-05/API-05-<mode>-*` | idle `"serverGoneMs":258,"electronGoneMs":308`; busy SIGTERM `"serverGoneMs":872`, `Server process exited with code 0`; wedged `Force-stopping the server and 5 recorded descendant target(s)`, `"serverGoneMs":20171,"electronGoneMs":21754,"survivors":[]`; relaunch `"exactlyOne":true` in all three | Relaunched idle quit 1488 ms: the startup runtime probes (as in 284 round 2) |
| API-02 R2 | AC-002 (revised), F-API-001 recheck | as API-02 | `CASE_ID=API-02-R2` and `API-02B-R2`, `P-001-live-server-probe.mjs held-connection` on ENV-4 (unmodified) | ENV-4 | Pass | `API-02-R2-result.json`, `API-02B-R2-result.json`, their `-run.log`, `-server-*.log`, `-ws-frames.json` | `"code":0`, `"elapsedMs":1606` / `1509`; `"survivors": []`, `"shutdownLog": []`; creates sent before SIGTERM (−37…−5 ms): all `200 {"success":true,…,"runId":…}`, answered at +74…+115 ms; creates sent after SIGTERM: `ECONNRESET` (connection destroyed on arrival, no request read); after relaunch `preparedOnly 0`, `unknown 0`, 8 on disk / 8 listed; `cutHandlerLog []`; silent connection closed at +8 / +1 ms, used keep-alive at +116 / +111 ms | F-API-001 resolved |
| API-02T | AC-002 timing (grace effect) | as API-02, with temporary timestamps | `CASE_ID=API-02T` on ENV-4 with `[339-DIAG]` in `dist`; plus the native busy fixture on the same build as a no-in-flight reference | ENV-4 (diag) | Pass | `API-02T-timing.log`, `API-02T-result.json`, `API-02T-server-first.log` | `+16 ms after SIGTERM: client-connection-close start inProgress=3`, `+85 ms … end`, `+86 ms after SIGTERM: studio onClose run cleanup start`; reference: native busy `+848 ms` (after the native drain), idle `+2 ms`; exit 0 in 1484 ms, `preparedOnly 0` | The grace cost 69 ms with three creates in progress; diagnostics removed (`grep -rl 339-DIAG dist` empty) |
| API-01 R2 | AC-007 | as API-01 | same command on ENV-4 | ENV-4 | Pass | `API-01-R2-gated-e2e.log`, `API-01-R2-busy-run-stop-now.json`, `API-01-R2-native-standalone-host-result.json` | `Tests  3 passed (3)` | Another agent's small server E2E run overlapped |
| API-04 R2 | AC-003 | as API-04 | `P-002-desktop-busy-quit-loop.sh 42` on ENV-4 | ENV-4 | Pass | `API-04-R2/API-04-R2-summary.json`, `-iterations.json`, `-loop-summary.txt`, sample `iter1`, excluded `iter21` | `"runs": 42, "valid": 41, "stalls": 0`; `serverGoneMs` 986 / 1403 / 1704 (min/median/max); all valid `0/0/0` exits; `"exceeded10s": 0`, `"sweepLines": 0`, `"appShutdownIncomplete": 0`, `"survivorsTotal": 0`; `"relaunchOne": 41`, `"continued4of4": 41` | iter 21 excluded: `Timed out: org-claude busy` (the Org agent never started its command, so no quit happened; the designer's series used the same rule) |
| API-05 R2 | AC-007 (desktop) | as API-05 | idle / busy-sigterm / wedged-quit on ENV-4 | ENV-4 | Pass | `API-05-R2/API-05-R2-<mode>-*` | idle `"serverGoneMs":206,"electronGoneMs":256`; busy SIGTERM `516`, `Server process exited with code 0`; wedged `Force-stopping the server and 5 recorded descendant target(s)`, `20193`/`21790`, `"survivors":[]`; relaunch one server in all three | — |
| API-06 | AC-004 (real install) | `--test-update-feed` install after a forced stop | — | — | Not Tested | — | — | Unsafe: ShipIt relaunches the installed app outside the isolated `e2e` profile against the user's real data (TESTING Rule 2; precedents settings-update-notifications AC-007, 284 API-14). D2's decision is proven by IMP-02/03 (real wedged server: stop incomplete and `isServerProcessGone()` true) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | IMP-08 (R2); API-02 R2/02B R2 (real server: silent connection closed at +1…+8 ms, used keep-alive at the end of the grace) | Proven | — |
| AC-008 | Yes | IMP-08 (deterministic, mutations fail); API-02T (real server: requests in progress answered, cleanup right after) | Proven | — |
| AC-002 | Yes | **R2:** API-02 R2, API-02B R2 (exit 0 in 1.61/1.51 s, 0 survivors, every create that reached the server answered with its run ID, 0 prepared-only and 0 unacknowledged runs, later requests refused), API-02T (cleanup at +86 ms); API-03 (base contrast, still valid) | Proven | — |
| AC-003 | Yes | API-04 R2 (41 valid of 42, 0 stalls); round 1 API-04 (42/42) | Proven | — |
| AC-004 | Yes | API-R1 (IMP-02/03) | Proven at the main-process boundary | The real Squirrel install after a forced stop: not runnable safely here (API-06); the user's next real update after a busy quit is the check |
| AC-005 | Yes | API-R1 (IMP-02) | Proven | — |
| AC-006 | Yes | API-R1 (IMP-02, `appUpdater.spec.ts`) | Proven | — |
| AC-007 | Yes | API-01 R2, API-04 R2, API-05 R2, IMP-09..12; round 1 API-01/04/05 | Proven | — |

## Findings

Round 2: **F-API-001 resolved** by IR-002 (API-02 R2, API-02B R2: every create that reached the server answered with its run ID; 0 prepared-only and 0 unacknowledged runs; API-02T: the grace costs only the in-flight handler time). No new finding.

Round 1, as recorded:


**F-API-001: a `createAgentRun` cut at shutdown still changes state, and can leave a prepared-only run in history.**
Preliminary classification: `Design Impact`. Failure-origin review requested.

- **Trigger (real use, SCN-002b):** a client creates a run (the UI's new run) while the node is stopping, for example during an update restart.
- **Observed on the fixed build:** in 2 of 2 samples, 3 of 3 requests per sample were cut mid-flight.
  - The client receives `ECONNRESET`.
  - The handler keeps running:
    - it either completes the run, which then exists although the client was told nothing;
    - or it is refused at activation (`AgentRun activation admission is closed for process shutdown`) after `prepareAgentRun` already recorded the run.
  - Prepared-only runs (`startedAt: null`) were left: 1 in API-02, 3 in API-02B.
  - They are listed in history as `offline` with an empty summary, and they restore successfully (`Agent run restored successfully.`).
  - Nothing removes them: `cleanupStalePreparedRuns` has no production caller (`Read`).
- **Base contrast (API-03):** the close waited for the same requests, and they completed with success responses. So this is a consequence of D1 + DEC-002.
- **Why it is a design point (`Read`):**
  - Design § Risks treats closed run admission as the guard for handlers that keep running after their connection is cut.
  - DEC-002 accepts "no response" but does not address side effects.
  - `AgentRunService.createAgentRun` = `prepareAgentRun` (writes metadata and a history-catalog prepared record) → `activate`, with no cancel when activation is refused.
- **User effect:**
  - extra empty runs in the history after an update or quit during a create;
  - the client's retry creates another run (duplicates).
  - No data loss; the runs are restorable.
- **Possible directions** (for the owner; not decided here):
  - cancel the prepared run when activation is refused (`cancelPreparedAgentRun` exists);
  - refuse new handler work before cutting connections;
  - accept it as a recorded residual (a decision for the requirements owner).
- **Reproduce:** `env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" CASE_ID=<id> node evidence/P-001-live-server-probe.mjs held-connection <built autobyteus-server-ts> <out dir>`. Look at `afterRelaunch.preparedOnly` and `cutHandlerLog`.

## Validation Confidence Scorecard (Mandatory)

Round 2. Round 1's scorecard (91.4%, `Fail`) is in API-REV-001.

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 74% | 95% | Every AC proven (table); AC-002's stored-state condition directly checked | Real install user-only (AC-004's Squirrel step) | The user's next real update |
| Changed-boundary execution directness | 78% | 96% | Real studio server with real clients, in-flight handlers, timestamps (API-02 R2, 02T); packaged desktop ×41 | — | — |
| Cross-boundary integration realism and mock gap | 72% | 95% | Live Codex/Claude, Team/Org, real Chromium connections | — | — |
| Environment, configuration, identity, and fixture fidelity | 80% | 94% | Clean checkouts, isolated data | Server probes `APP_ENV=test` | — |
| Failure, edge-case, lifecycle, and recovery evidence | 72% | 93% | Base contrast, wedged server, relaunch ×44, in-flight creates and late requests | A handler longer than the 2 s grace is still cut (FU-004, by design; IMP-08 covers it deterministically) | — |
| User-surface, browser, and desktop-shell confidence | 65% | 93% | API-04 R2 (41), API-05 R2 | Real install not run | — |
| Durable regression coverage quality and relevance | 90% | 93% | IMP-08/09 (mutation-checked), 284's gated E2E | AC-002/003 stay probes (live runtimes, packaged desktop) | — |

- Overall post-repository confidence: 76%
- Overall final confidence: 94.1% (simple average)
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`.
- Any final applicable category below `90%`: `No`.
- Default target of `95%` met: `No` (94.1%). The gap is bounded and no in-scope surface closes it safely: the real Squirrel install relaunches outside the isolated profile (TESTING Rule 2), and the Docker update is optional and unchanged.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed). Modes: `Live API` (real server process), `Project Desktop Validation` (isolated packaged desktop, 45 journeys), `Lifecycle`.
- Gap it addresses: unit tests use plain Fastify apps; the studio server with real clients, live runtimes and real Chromium connections is only exercised here.
- Browser validation: not needed (no renderer change).

## Desktop Application Validation (When Applicable)

- Approach: isolated instances of the clean packaged build; quit via `window.electronAPI.startShutdown()`; OS signals only to PIDs this run started.
- Effect on the already-running desktop app: `None`.
- Not directly proven: the real Squirrel install (API-06).

## Compatibility / Legacy Scope Check

- Backward compatibility in scope: `No`. Compatibility-only behavior in implementation: `No`. Compatibility-only durable coverage: `No`.

## Durable Coverage Changed In The Codebase

- Added, updated, or removed this round: `No`.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| A client's spare connection | `net.connect` without bytes (as P-003), accepted before SIGTERM | Deterministic; the desktop loop exercises the real Chromium behavior | — |
| Wedged server (API-05) | `SIGSTOP` of the real server | Hung event loop at the process boundary | — |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Clean and base checkouts (run temp root `ur339-api.*`) | Yes | `git worktree remove --force`, prune, `rm -rf` | Removed |
| Servers, isolated instances (45 desktop journeys), runtime CLIs, marker commands | Yes | Quit/SIGTERM under test; `isolated-app stop` after exit; probe fallbacks by recorded PID or marker | `isolated-app list` shows none of this run; no marker process left |
| Probe edits: `held-connection` mode and `shutdownCase` hook in `evidence/P-001-live-server-probe.mjs` | Yes | Kept as evidence (temporary probe, not repository code) | Kept |
| Claude session history | No | Each live Claude run adds a session for its temp workspace | Recorded |

## Residual Risks

- F-API-001: resolved in round 2.
- FU-004: a request handler longer than the 2 s grace is still cut (by design; IMP-08).
- Requests that arrive after the close began get `ECONNRESET` (their connection is destroyed on arrival, before any request is read), or 503 on an already-open used connection. AC-002 accepts "503 or a refused connection".
- N-1 to N-4 (implementation handoff), as reviewed: N-3's Node/Fastify drift is guarded by IMP-01.
- FU-001 (install-on-quit after an incomplete stop; U-2), FU-002 (U-3).
- The real Squirrel install after a forced stop is not exercised (API-06).
- Docker in-place update (optional) not run; the starter is unchanged.

## Preliminary Classification (On `Fail`)

- F-API-001: `Design Impact`. The design's AR-002 guard ("run admission is already closed") does not cover `prepareAgentRun`, and DEC-002's accepted loss does not cover side effects of cut requests. The owner may judge it a `Local Fix` in `AgentRunService.createAgentRun`, or a `Requirement Gap` if the fix needs a behavior decision.

## Latest Authoritative Result

- Result: `Pass` (round 2, API-REV-002)
- Criteria not proven, or parts only the user can check: none unproven. AC-004's real Squirrel install is user-only (API-06): the user's next real update after a busy quit.
- Preliminary classification and recommended owner: N/A (Pass). F-API-001 resolved.
- Next recipient from `get_handoff_rules`: code reviewer (proportional test-code review; API/E2E changed no durable tests).
- Notes:
  - D1 (revised) removes the stall: 41/41 valid busy desktop quits are clean (round 1: 42/42; before the fix: 2 stalls in 78).
  - On the real server, the silent connection no longer holds the close, and in-flight creates complete with their responses.
  - The run cleanup starts 86 ms after SIGTERM with three creates in progress, and at once otherwise.
  - D2 holds at the main-process boundary; 284 preserved.
