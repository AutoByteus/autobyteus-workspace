# API/E2E Execution Coverage Report — update-restart-reliability (autobyteus-339)

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/update-restart-reliability/tickets/in-progress/update-restart-reliability/`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; CRR-001 Pass (code `ddb03d0d0b`; docs `22bf2338a9`, `0a8888fcb2`; review `2c3575b0f0`).
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - API-02 ran twice (API-02, API-02B). The second sample adds a restore attempt on the prepared-only runs found in the first.
  - API-06 (real install) not executed, as planned (unsafe).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-restart-reliability/tickets/in-progress/update-restart-reliability/evidence/` (commit in the handoff).

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed` (ARCH-REV-001 Pass, CRR-001 Pass)
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Not Applicable` this round. The result is `Fail`, so failure-origin review is requested. No durable test code was added this round.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `2c3575b0f0` (code `ddb03d0d0b`), clean detached checkout | macOS 26 (Darwin 25.5.0) arm64, Node 22.23.1 | `pnpm install --frozen-lockfile --offline`; server `prebuild`+`build` (`dist/shutdown/server-close-options.js` present) | Server probes: `node dist/app.js --port --data-dir <owned>`, data `.env` `APP_ENV=test`; real `HOME`/`USER`/`LOGNAME`; throwaway `CODEX_HOME` |
| ENV-2 | same | same | `build:electron:mac` (6 m 54 s) → `electron-dist/mac-arm64/AutoByteus.app` (packaged server carries `SERVER_CLOSE_OPTIONS`; `app.asar` carries `acceptIncompleteStopForInstall`) | `isolated-app start --from-worktree --data-root <owned>`; CDP + GraphQL |
| ENV-3 | base `origin/personal` @ `a977b2c1bc`, clean detached checkout | same | base server build (284's bound and sweep, default close options) | Contrast only (API-03) |
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
| API-06 | AC-004 (real install) | `--test-update-feed` install after a forced stop | — | — | Not Tested | — | — | Unsafe: ShipIt relaunches the installed app outside the isolated `e2e` profile against the user's real data (TESTING Rule 2; precedents settings-update-notifications AC-007, 284 API-14). D2's decision is proven by IMP-02/03 (real wedged server: stop incomplete and `isServerProcessGone()` true) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-R1 (IMP-01, fails on defaults); API-02/02B (real server: silent and keep-alive connections closed at +3/+6 ms) | Proven | — |
| AC-002 | Yes | API-02, API-02B (exit 0 in 1.36/1.61 s, 0 survivors, in-flight requests cut); API-03 (base: bound, exit 1) | Proven as written. The reviewer's AR-002 condition ("the cut mutation is refused or cancelled cleanly, with no partial run") is **not met**: F-API-001 | — |
| AC-003 | Yes | API-04 (42/42 valid, 0 stalls) | Proven | — |
| AC-004 | Yes | API-R1 (IMP-02/03) | Proven at the main-process boundary | The real Squirrel install after a forced stop: not runnable safely here (API-06); the user's next real update after a busy quit is the check |
| AC-005 | Yes | API-R1 (IMP-02) | Proven | — |
| AC-006 | Yes | API-R1 (IMP-02, `appUpdater.spec.ts`) | Proven | — |
| AC-007 | Yes | API-01, API-04 (continuity, one server, relaunch), API-05, API-R1 (IMP-03..07) | Proven | — |

## Findings

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

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 70% | 88% | Every AC proven (table) | F-API-001 against the AC-002 review condition; real install not runnable | Resolve F-API-001 |
| Changed-boundary execution directness | 75% | 96% | Real server with real clients and in-flight handlers (API-02/02B/03); packaged desktop loop (API-04) | — | — |
| Cross-boundary integration realism and mock gap | 70% | 95% | Live Codex/Claude, Team/Org, real Chromium connections in 42 desktop runs | — | — |
| Environment, configuration, identity, and fixture fidelity | 80% | 94% | Clean checkouts of the final branch and the base, isolated data | Server probes use `APP_ENV=test` | — |
| Failure, edge-case, lifecycle, and recovery evidence | 70% | 84% | Base contrast, wedged server, relaunch continuity ×45 | F-API-001 (stored state after a cut create) | Fix and recheck AR-002 |
| User-surface, browser, and desktop-shell confidence | 65% | 93% | API-04 (42), API-05 | Real install not run | — |
| Durable regression coverage quality and relevance | 90% | 90% | IMP-01..07, 284's gated E2E (API-01) | AR-002 has no durable case | A deterministic case with the fix |

- Overall post-repository confidence: 74%
- Overall final confidence: 91.4% (simple average)
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`, with F-API-001 open against AC-002's review condition.
- Any final applicable category below `90%`: `Yes`: requirement proof 88%, failure/edge 84% (F-API-001).
- Default target of `95%` met: `No`.

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

- F-API-001 (open).
- N-1 to N-4 (implementation handoff), as reviewed: N-3's Node/Fastify drift is guarded by IMP-01.
- FU-001 (install-on-quit after an incomplete stop; U-2), FU-002 (U-3).
- The real Squirrel install after a forced stop is not exercised (API-06).
- Docker in-place update (optional) not run; the starter is unchanged.

## Preliminary Classification (On `Fail`)

- F-API-001: `Design Impact`. The design's AR-002 guard ("run admission is already closed") does not cover `prepareAgentRun`, and DEC-002's accepted loss does not cover side effects of cut requests. The owner may judge it a `Local Fix` in `AgentRunService.createAgentRun`, or a `Requirement Gap` if the fix needs a behavior decision.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven, or parts only the user can check: none unproven by the AC text. AR-002's condition on AC-002 is not met (F-API-001). AC-004's real install is user-only (API-06).
- Preliminary classification and recommended owner: F-API-001 `Design Impact` → failure-origin review.
- Next recipient from `get_handoff_rules`: code reviewer.
- Notes: D1 removes the stall:
  - 42/42 busy desktop quits are clean, against 2/78 stalls before;
  - on the real server, the silent connection no longer holds the close (base: 10.58 s, exit 1; fixed: 1.36–1.61 s, exit 0).

  D2 holds at the main-process boundary, and 284's behavior is preserved.
