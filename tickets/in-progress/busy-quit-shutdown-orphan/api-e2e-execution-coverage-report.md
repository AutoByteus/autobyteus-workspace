# API/E2E Execution Coverage Report — busy-quit-shutdown-orphan (autobyteus-284)

The run record and the result. The plan is `api-e2e-coverage-investigation.md`; the history is `api-e2e-revision-record.md`.
All paths below are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; CRR-001 Pass (code `bf2857ca29`, handoff `9e00c6fafd`, review docs `b520b51c9e`).
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - **Added** API-06R (server-level repeats), API-09 (the "before" baseline on a base build), API-11B/API-11C/API-11D (bisection of the API-11R1 stall), API-11R1 (the first API-11 run, kept under its own ID because it differs from the repeat).
  - **API-14 not executed:** pressing Install in an isolated instance makes ShipIt relaunch the app outside the `e2e` profile against the user's real data (TESTING Rule 2; precedent `tickets/done/settings-update-notifications`, AC-007). See the AC-009 row and Not Tested.
  - API-15 was folded into API-11 as planned.
  - Probe defects found and fixed during the run: a missing data `.env`; a 140-character command cut that hid the marker; the Team payload carrying `command_id`; a `?? 'MISSING'` on a `null` `terminatedAt`; Haiku dropping the marker argument; a late quit timer. Their outputs were superseded and not kept as evidence. None of these was a product behavior.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/evidence/` (commit given in the handoff).

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed` (ARCH-REV-003 Pass, CRR-001 Pass)
- Successful-output route: `Code Review` (proportional test-code review on Pass)
- Proportional test-code review decision: `Not Applicable` this round. The result is `Fail`, so failure-origin review is requested. The added durable tests (below) go with the next round's test-code review.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `b520b51c9e` (code `bf2857ca29`), clean detached checkout; test-only `55ddc71839` for API-01..03 | macOS 26 (Darwin 25.5.0) arm64, Node 22.23.1 | `pnpm install --frozen-lockfile --offline`; `pnpm -C autobyteus-server-ts prebuild && build` (`dist/app.js`) | Server probes: `node dist/app.js --port <free> --data-dir <owned>`, data `.env` `APP_ENV=test`; real `HOME`/`USER`/`LOGNAME`; throwaway `CODEX_HOME` (only `check_for_update_on_startup = false` + `auth.json` symlink); `AUTOBYTEUS_AGENT_PACKAGE_ROOTS=''` |
| ENV-2 | same clean checkout | same | `pnpm -C autobyteus-web build:electron:mac` → `electron-dist/mac-arm64/AutoByteus.app` 1.5.11-beta.4 (ad hoc) | `pnpm isolated-app start --from-worktree --data-root <owned>`; `CODEX_HOME` passed through; the app writes its own production `.env`; driven over CDP (Playwright) and GraphQL on the instance's port |
| ENV-3 | base `origin/personal` @ `1a4453e553`, clean detached checkout | same | base server build | Used only for fail-before (API-02/03) and the "before" baseline (API-09) |
| ENV-4 | ENV-2 build, **copy** with temporary `[BQ-DIAG]` stderr lines | same | patched copy of `Resources/server/dist` (build-studio-server close/onClose, supervisor `closeInternal`, `AgentRunManager.stopAllAgentRuns` per-run fence, `ServerProcessShutdown`, native-command-shutdown) | Diagnostics only (API-11D). Copy and patch removed; never committed |
| Live models | — | — | Codex CLI `codex-cli 0.166.0`, model `gpt-6.1-terra`, `reasoning_effort: medium`; Claude Code `2.1.314`, model `claude-haiku-4-5-20251001`; Python 3.9.6 | Busy = agent runs a foreground `python3 -c "import time; time.sleep(900)" <run marker>` |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R1 | AC-003, AC-007, AC-008 (unit), AC-010 (unit), AC-011 | Repository checks | Reused IMP-01..IMP-09 | — | Pass | implementation-handoff Checks Run | per IMP row | Still holds: `git diff --name-only bf2857ca29 HEAD` outside the ticket folder is empty |
| API-00 | — | Build provenance | clean checkout; install 13 s; server build 32 s; desktop build 5 m 47 s | ENV-1/2 | Pass | (progress log) | — | Electron binary not needed for the packaged build |
| API-01 | AC-007, SCN-002c | Real standalone application host close with native foreground/background commands | `RUN_NATIVE_STANDALONE_SHUTDOWN_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/shutdown/native-standalone-host-shutdown.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-01-native-standalone-host.log`, `API-01-native-standalone-host-result.json` | `Tests  1 passed (1)`; `"elapsedMs": 835`, four `"absent": true, "anchorAbsent": true` | Existing durable test, changed stop path |
| API-02 | AC-001 (native), AC-002 (native + background process), AC-010, REQ-002/003 | Real server process `dist/app.js`, native runtime, scripted inference | `RUN_BUSY_STOP_NOW_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/shutdown/busy-run-stop-now.e2e.test.ts --no-watch`; fail-before with `BUSY_STOP_SERVER_DIR=<base>` | ENV-1 / ENV-3 | Pass (fails on base) | `API-02-03-vitest-clean.log`, `API-02-server-fixture-clean.json`, `API-02-03-vitest-base-fail-before.log`, `API-02-server-fixture-base-fail-before.json` | clean: `✓ server: Terminate and SIGTERM …`; `"elapsedMs": 75` (terminate), shutdown `"elapsedMs": 761`, `"code": 0`, `"survivors": []`, `shutdownRun … "terminatedAt": null`. base: `× server: …`, `terminate: pending or failed: TimeoutError` | New durable test |
| API-03 | AC-008 | Real standalone application host: app command → `context.agentExecution.terminate` | same vitest file (2nd test); fail-before as above | ENV-1 / ENV-3 | Pass (fails on base) | `API-02-03-vitest-clean.log`, `API-03-application-fixture-clean.json`, `API-03-application-fixture-base-fail-before.json` | clean: `"elapsedMs":102`, `"status":"TERMINATED"`, `"foregroundGone": true`; base: `pending or failed: TimeoutError` (20 s) | New durable test |
| API-04 | AC-001 (Codex) | Real server + Codex `gpt-6.1-terra` | `evidence/API-live-server-probe.mjs mixed <clean>/autobyteus-server-ts evidence` | ENV-1 | Pass | `API-04-05-06-result.json` (`API-04`), `API-04-05-06-run.log`, `API-04-05-06-server-first.log` | `"result":{"success":true…},"elapsedMs":82`; `"aliveAfter": false`; `"markedLeft": []` | — |
| API-05 | AC-001 (Claude) | Real server + Claude CLI | same run | ENV-1 | Pass | same (`API-05`) | `"elapsedMs":772`, `"aliveAfter": false` | — |
| API-06 | AC-002, AC-010, REQ-003 | Real server SIGTERM: busy Codex standalone, Claude standalone, Codex Team member, Claude Org agent; relaunch | same run | ENV-1 | Pass | same (`API-06`, `history`), `API-04-05-06-server-second.log`, `API-04-05-06-ws-frames.json` | `"exit":{"code":0…},"elapsedMs":1272`; `"survivors": []`; `"markedLeft": []`; 10-row `before` tree (PID/PPID/PGID); history `userTerminated … "terminatedAt":"2026-…"`, `shutdownStopped … "listed":true,"terminatedAt":null`, `teamRoot … "terminatedAt":null` | — |
| API-06R | AC-002 (repeatability), F-API-002 hunt | Real server: Codex busy → SIGTERM → relaunch on the same data → four busy roots → SIGTERM, ×4 | `… API-live-server-probe.mjs repeat …` (`REPEAT=4`) | ENV-1 | Pass | `API-06R-result.json`, `API-06R-run.log`, `API-06R-server-*.log` (timestamped), `API-06R-ws-frames.json` | `iterations`: `shutdownMs` 1463, 1463, 1228, 1242; all `"exit":{"code":0`, `"survivors":0` | No stall reproduced |
| API-07 | U-A1 | Real server SIGTERM: 3 busy + 2 idle Claude (5 CLIs) | `… API-live-server-probe.mjs many …` | ENV-1 | Pass | `API-07-result.json`, `API-07-run.log`, `API-07-server-first.log` | `"claudeCliCount": 5`; `"elapsedMs": 2764`, `"code":0`, `"survivors": []` | Far inside the bound; no Design Impact |
| API-08 | U-A2 | Claude CLI directly: busy tool, stdin EOF; then SIGTERM | `evidence/API-08-claude-eof-probe.mjs evidence` | host | Pass | `API-08-result.json`, `API-08-run.log` | `"version": "2.1.314 (Claude Code)"`; EOF samples to 15 000 ms `"cliAlive":true,"toolAlive":true`; SIGTERM `"cliExit":{"code":143,…"afterMs":732}`, tool gone ≤ 1 s | E9 premise holds |
| API-09 | "before" baseline | **Base** server build, busy Codex + Claude, SIGTERM | `… API-live-server-probe.mjs baseline <base>/autobyteus-server-ts evidence` | ENV-3 | Observed (baseline) | `API-09-result.json`, `API-09-run.log`, `API-09-server-first.log` | `"exit": null` at +31 s with both tools `"aliveAfter": true`; after the probe's SIGKILL of the server, `baselineLeftAfterServerKill`: the `claude` CLI, its `zsh` and `Python` (E9), then killed by recorded PID | Shows the problem this ticket removes |
| API-10 | AC-005, AC-009 | Isolated desktop: idle user quit (`window.electronAPI.startShutdown()` = menu Quit's `app.quit()`), relaunch | `cd <clean> && node evidence/API-desktop-probe.mjs idle evidence` | ENV-2 | Pass | `API-10-result.json`, `API-10-run.log`, `API-10-instance-*.log`, `API-10-app-0-server.log`, `API-10-app-1-app.log` | `"serverGoneMs":206,"electronGoneMs":259`; relaunch `"exactlyOne":true`; second quit `"electronGoneMs":260` | Prior-ticket quiet quit on this machine: 207–707 ms; server idle exit in API-06/07: 55–70 ms |
| API-15 | SCN-002b | Isolated desktop "Restart server" while a Codex run is busy | part of `busy-quit` | ENV-2 | Pass | `API-11-result.json` (`restart`), `API-11R1-result.json` (`restart`) | `"oldServerAlive":false,"toolAliveAfter":false,"survivors":[]`, `"readyMs":1757` (R2) / `1725` (R1) | — |
| API-11R1 | AC-004(a), AC-006, AC-009 | Isolated desktop: busy Codex+Claude standalone, Codex Team member, Claude Org agent → user quit → relaunch → continue each root | `… API-desktop-probe.mjs busy-quit …` (first run) | ENV-2 | Pass for AC-004/006/009; **anomaly F-API-002** | `API-11R1-result.json`, `API-11R1-run.log`, `API-11R1-instance-0.log`, `API-11R1-app-0-server.log` | `"serverGoneMs":10761,"electronGoneMs":10814,…"survivors":[],"markedLeft":[]`; `Server shutdown exceeded 10s; forcing exit`; `Server process-tree sweep: 4 process(es) and 5 process group(s)`; `Server process exited with code 1`; `Application shutdown incomplete AggregateError`; relaunch `"exactlyOne":true`; four `continued … "replied":"CONTINUED_…"` | The graceful cleanup made no progress for 10 s; the bound and sweep contained it |
| API-11 | AC-004(a), AC-006, AC-009 | Exact repeat of API-11R1 | same command | ENV-2 | Pass | `API-11-result.json`, `API-11-run.log`, `API-11-instance-*.log`, `API-11-app-0-server.log`, `API-11-app-1-app.log` | `"busy user quit" … "serverGoneMs":931,"electronGoneMs":931,…"survivors":[]`; `Server process exited with code 0` (12:39:23.969); relaunch `"exactlyOne":true`; 4/4 `continued` | — |
| API-11B | F-API-002 bisection | API-11 without the earlier restart | `… busy-quit-plain …` | ENV-2 | Pass | `API-11B-*` | `"serverGoneMs":988,"electronGoneMs":1039`; 4/4 `continued` | — |
| API-11C | F-API-002 bisection | Busy restart, then quit with no new runs | `… restart-then-quit …` | ENV-2 | Pass | `API-11C-*` | after-restart samples `"isActive":false,"status":"offline"`; quit `"serverGoneMs":207` | Restart alone does not reproduce |
| API-11D | F-API-002 hunt | API-11 ×4 on ENV-4 (diagnostic copy) | `DESKTOP_APP=<copy> … busy-quit …` ×4 | ENV-4 | Not reproduced | `API-11D-iterations.txt`, `API-11D-clean-stage-timeline.log` | `serverGoneMs` 1022, 1583, 1329, 1326; timeline order Org stop (~0.8 s) → Team → standalone fences (~20 ms) → finishes → sweep | Diagnostics removed; see F-API-002 |
| API-12 | AC-004(b), AC-009 | Isolated desktop: busy Codex+Claude → `kill -TERM <Electron main pid>` only | `… busy-sigterm …` | ENV-2 | Pass | `API-12-*` | `"serverGoneMs":779,"electronGoneMs":831,"survivors":[]`; `Server process exited with code 0`; relaunch `"exactlyOne":true` | — |
| API-13 | AC-004 forced path, AC-011 (real runtimes), AC-009, U-A3, CR-C5 | Isolated desktop: busy Codex+Claude → `SIGSTOP` the embedded server → user quit | `… wedged-quit …` | ENV-2 | Pass | `API-13-*` | `Force-stopping the server and 5 recorded descendant target(s)` (12:51:15.484); `Server process exited with code null` (.499); `"serverGoneMs":20204,"electronGoneMs":21795,"survivors":[],"markedLeft":[]`, both tools `"aliveAfter":false`; relaunch `"exactlyOne":true` | U-A3: window expiry → snapshot ≈ 0.18 s; Electron exit 1.6 s after the SIGKILL (1.5 s grace). The log "Backend exit not confirmed" comes from the 20 s graceful timeout that every forced path reports (`stopManagedBackend`), not from a `ps` stall (CR-C5 not triggered) |
| API-14 | SCN-003c, N-5 | Update install while busy | — | — | Not Tested | — | — | Unsafe here (see Round). `prepareForInstall` awaits the same memoized `ApplicationShutdown.stop()` as quit. A clean busy stop resolves (API-11/11B/12: exit code 0, no "Application shutdown incomplete"), so `quitAndInstall` would run (IMP-07 covers that wiring). A stalled stop (API-11R1) or a forced stop (API-13) rejects, so the install would not start (N-5/FU-007) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-04 (Codex 82 ms), API-05 (Claude 772 ms), API-02 (native 75 ms; fails on base) | Proven | — |
| AC-002 | Yes | API-06 (4 busy roots, exit 0 in 1.27 s, 0 survivors), API-06R ×4, API-07, API-02, API-11/11B/12 (desktop), API-09 (base contrast) | Proven, with the intermittent stall F-API-002 (1 of 15 busy shutdowns hit the 10 s bound; contained by the forced path, exit 1) | — |
| AC-003 | Yes | API-R1 (IMP-03) | Proven (deterministic) | — |
| AC-004 | Yes | API-11/11R1 (a), API-12 (b), API-13 (forced), API-11B | Proven: no server, CLI or tool command after any quit; quit in 0.8–1.0 s when turns are interrupted, 10.8 s in R1, 21.8 s on a wedged server (≤ 20 s + force) | — |
| AC-005 | No | API-10 | Proven (0.26 s Electron exit, idle) | — |
| AC-006 | Yes | API-11, API-11R1, API-11B (agent, Team, Org; Codex and Claude: restore + reply) | Proven | — |
| AC-007 | Yes | API-R1 (IMP-07/08/09), API-01 | Proven | — |
| AC-008 | Yes | API-03 (real application host; fails on base), API-R1 (IMP-02) | Proven | — |
| AC-009 | Yes | API-10, API-11, API-11R1, API-11B, API-12, API-13 (`exactlyOne: true`, no earlier-session process) | Proven after quit (a), SIGTERM (b) and the forced path. App-update restart: not exercised (unsafe; AC says "where it can be exercised") | — |
| AC-010 | Yes | API-06 (live: terminated runs keep `terminatedAt`, shutdown-stopped runs and Team root `null`), API-02 (durable) | Proven | — |
| AC-011 | Yes | API-R1 (IMP-04), API-13 (real Codex/Claude children under a wedged server) | Proven | — |

## Findings

- **F-API-001 — the server sweep selects its own `ps` reader (preliminary: `Local Fix`, implementation engineer).**
  - Where: `autobyteus-server-ts/src/utils/process-tree.ts` `readProcessTable()` (`execFileSync('ps', ['-A', '-o', 'pid=,ppid=,pgid='])`). The `ps` child lists itself, with `ppid` = server pid and `pgid` = server group. `terminateServerProcessTree` then selects it as one "descendant in the server's own group".
  - Observed: every POSIX server exit logs `Server process-tree sweep: 1 process(es) and 0 process group(s) still running; sending SIGTERM.`, idle exits too (API-02 `sweepLines`, API-04-05-06 `idleShutdown.shutdownLog`, `API-10-app-0-server.log`, every desktop session). The sweep also sends SIGTERM to that already-exited pid (ESRCH, with a small PID-reuse window).
  - Expected (design § Off-Spine Concerns; CRR-001 note): the line appears only when something the server started is still running, and the sweep signals only processes the server started.
  - Effect: diagnostic false positive on every exit, plus one stray signal. Outcome, exit code and timing are unaffected (`confirmed`, exit 0, idle exit 52–70 ms). AGY is unaffected (it selects groups only). The desktop copy is unaffected (its `ps` is Electron's child).
  - Suggested fix (owner's choice): read the table with `spawnSync` and drop the row whose pid is the reader's own (or filter `pid === result.pid`). Add a unit case with the reader's row in the table.
  - Reproduce: any server SIGTERM, e.g. API-02's command; look for the line on an idle server.
- **F-API-002 — intermittent stall of the graceful cleanup with busy roots (preliminary: `Unclear`; failure-origin review requested).**
  - Observed once in 15 busy shutdowns (API-11R1, desktop busy user quit after an earlier busy Restart server):
    - no stage progressed for 10 s: no Codex thread release, and the Claude CLIs were ended only by the sweep (exit 143);
    - then `Server shutdown exceeded 10s; forcing exit`, a sweep of 4 processes + 5 groups, server exit 1 → desktop `Backend did not exit cleanly` → `ShutdownIncompleteError` → `Application shutdown incomplete` → `app.exit(1)`.
  - Not reproduced in an exact repeat (API-11), in 3 bisection runs (API-11B/11C), in 4 server-level repeats (API-06R) or in 4 instrumented desktop repeats (API-11D).
  - Narrowed (`Read` from API-11R1 logs against the API-11D clean timeline): the stall was at or before the Org stop stage of `GeneralProcessRunSupervisor.closeInternal`. In the clean timeline, the Org's Claude member is released there (~0.8 s) before the Team and standalone runs; in R1 neither Codex thread was released and the Org's Claude CLI survived until the sweep. The Org/Team root-shutdown fencing is predecessor code that this ticket did not change (Scope Guardrail: out of scope).
  - Candidate mechanism: CR-C4/N-3, a fence whose interrupt is accepted while the turn does not end. Not proven: the root cause is **not established** (TESTING Rule 9).
  - Containment held (REQ-002/REQ-003/REQ-004): exit at 10.8 s, no survivors, the app exited.
  - User-facing consequences:
    - a busy quit can take ~10.8 s instead of ~1 s;
    - with "Install update and restart" the install would not start (N-5/FU-007), which matters for autobyteus-285's unattended update-and-resume.
  - Reproduction material: `evidence/API-desktop-probe.mjs busy-quit` (run repeatedly), `evidence/API-live-server-probe.mjs repeat`, `API-11D-clean-stage-timeline.log` for the expected stage order.

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 70% | 92% | Every AC proven directly (table above) | F-API-002 cause; update-restart part of AC-009 not exercisable | Root cause of F-API-002; a signed update install |
| Changed-boundary execution directness | 75% | 95% | Real `dist/app.js` SIGTERM (API-02/06/07), real Terminate (API-04/05), real application host (API-03), packaged desktop quit/SIGTERM/force (API-10..13) | — | — |
| Cross-boundary integration realism and mock gap | 65% | 95% | Live Codex/Claude CLIs and tool groups, Team and Org roots, desktop ↔ server | Native runs use scripted inference (the native tool path is real) | — |
| Environment, configuration, identity, and fixture fidelity | 80% | 92% | Clean checkout, isolated data roots and instances, throwaway `CODEX_HOME`, host logins | Server probes use `APP_ENV=test`; ad hoc build; no Windows | — |
| Failure, edge-case, lifecycle, and recovery evidence | 70% | 84% | Wedged server (API-13), base contrast (API-09), EOF/SIGTERM premise (API-08), relaunch continuity, repeats | F-API-002 unexplained; F-API-001; update install not run | Cause of F-API-002 proven and fixed or classified |
| User-surface, browser, and desktop-shell confidence | 60% | 92% | API-10..13 on the packaged build, relaunch + continue | Update install not exercised | — |
| Durable regression coverage quality and relevance | 90% | 92% | API-01..03 (new tests fail on base), IMP-01..09 | Live-runtime and desktop journeys stay temporary probes (paid/credentialed) | — |

- Overall post-repository confidence: 73% (simple average)
- Overall final confidence: 91.7% (simple average)
- Calculation method: simple average of the seven categories.
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes` (AC-009's update-restart part is conditional and was unsafe to run here).
- Any final applicable category below `90%`: `Yes`: failure/edge/lifecycle 84% (F-API-002, F-API-001).
- Default final confidence target of `95%` met: `No`.
- Confidence-limiting residual risks: F-API-002; F-API-001; the update install path (N-5/FU-007); Windows (out of the platform guardrail).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed).
- Execution mode: `Live API` (real server process with live runtimes), `Project Desktop Validation` (isolated packaged desktop), `Lifecycle`.
- Confidence gap or residual risk it addresses, and the expected gain: repository tests mock the runs, the sweep and the runtimes. Live runs prove the interrupts, the process-tree teardown on real CLIs, the desktop quit paths and continuity.
- Browser validation needed: No (no renderer change); the desktop shell was exercised directly.
- If `Blocked`: N/A.

## Desktop Application Validation (When Applicable)

- Approach executed: isolated instances of the clean packaged build, driven over CDP and GraphQL. OS signals went only to PIDs this run started (Electron main for API-12; the embedded server's `SIGSTOP` for API-13). `isolated-app stop` was used only after the app had exited, so it never acted as the quit trigger.
- Cases proving web-equivalent behavior: none needed. Shell/lifecycle: API-10, API-11, API-11R1, API-11B, API-11C, API-12, API-13, API-15.
- Effect on any already-running desktop application: `None`. The user's AutoByteus (PID 21374) and its server were not signalled or read; every match used run-unique markers or the instance's own data root.
- Behavior not directly proven: the update install (API-14).

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes` (commit `55ddc71839`)

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/shutdown/busy-run-stop-now.e2e.test.ts` | Added | API-02, API-03 | — |
| `autobyteus-server-ts/tests/e2e/shutdown/busy-run-stop-now-fixture.mjs` | Added | API-02 | — |
| `autobyteus-server-ts/tests/e2e/shutdown/busy-application-terminate-fixture.mjs` | Added | API-03 | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` this round (result `Fail`); attached for the failure-origin reviewer's reference.
- Diff or repository evidence supplied for removed paths: none removed.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Native-runtime LLM (API-01..03) | Scripted LM Studio-compatible SSE server | Deterministic, credential-free durable test; the native tools, process groups, server and host are real | Provider behavior not exercised (not changed by this ticket) |
| Wedged server (API-13) | `SIGSTOP` of the real server process | A hung event loop that ignores SIGTERM, without editing product code | Equivalent at the process boundary |
| Update feed / install (API-14) | Not emulated | Unsafe (ShipIt relaunch outside the isolated profile) | Install path not run |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Clean checkout and base checkout (`git worktree add --detach` in a run temp root) | Yes | `git worktree remove --force`; `git worktree prune`; temp root `rm -rf` | Removed; `git worktree list` has no `bq284-api` entry |
| Servers, isolated instances, runtime CLIs, marker commands | Yes | Quit/SIGTERM under test; fallback kill only of recorded PIDs or run-marker commands; `isolated-app stop` after exit | `isolated-app list` → `[]`; no `BQ284*` process left |
| One base-run leftover (PID 39061, from the first fixture iteration with the truncated-`ps` search) | Yes | Killed after verifying its run-owned receipt path; fixtures fixed (`ps -ww`, tag at the front) | Gone |
| Diagnostic app copy with `[BQ-DIAG]` lines (ENV-4) | Yes | Removed with the temp root; never committed | Removed |
| Temp data roots, `CODEX_HOME`s, workspaces | Yes | Removed by each probe/fixture (`rootRemoved: true`) | Removed |
| Temporary probes `evidence/API-live-server-probe.mjs`, `API-desktop-probe.mjs`, `API-08-claude-eof-probe.mjs` | Yes | Kept as evidence (not repository test code) | Kept |
| Claude session history | No (user's Claude project history) | Each live Claude run adds a session for its temp workspace | Recorded here |

## Residual Risks And Measurements (N-3, N-5/FU-007, N-7, CR-C1, CR-C5, U-A1..U-A3)

| ID | Observation in this round | Evidence |
| --- | --- | --- |
| N-3 (Terminate has no bound of its own) | Not hit by user or application Terminate: Codex 48–82 ms, Claude 387–772 ms, native 75 ms, application 102 ms across 3+3+1+1 live/real runs. F-API-002 may be the same mechanism at shutdown (unproven). | API-04, API-05, API-02, API-03 |
| N-5 / FU-007 (expired bound or force → exit 1 → update install not started) | **Observed twice**: API-11R1 (bound expired → `Server process exited with code 1` → `Application shutdown incomplete` → `app.exit(1)`) and API-13 (forced path → `ShutdownIncompleteError`). Clean busy stops exit 0 (API-11, API-11B, API-12), so a clean busy update would proceed to `quitAndInstall`. | API-11R1, API-13, API-11, API-12 |
| N-7 (cut cleanup runs beside the sweep; post-snapshot spawns; startup-failure exit) | In API-11R1 the sweep ran at the bound and the server exited 0.63 s later. No process spawned after the snapshot was observed (0 survivors). The startup-failure exit was not exercised (not a shutdown trigger in this ticket). | API-11R1 |
| CR-C1 (worst case ≈ 14.25 s) | Largest observed server exit: 10.76 s (API-11R1). The desktop's 20 s window was never reached by a running server. | API-11R1 |
| CR-C5 (`ps` stall on the desktop force path) | Not triggered: snapshot ≈ 0.18 s. The "Backend exit not confirmed" text in API-13 comes from the graceful-window timeout carried by every forced `ShutdownIncompleteError`, not from the force confirmation. | API-13 |
| U-A1 | 3 busy + 2 idle Claude runs: exit 0 in 2.76 s. No Design Impact. | API-07 |
| U-A2 | Codex 0.166.0; Claude Code 2.1.314. Claude CLI still survives stdin EOF (≥ 15 s with its tool command); SIGTERM ends both in < 1 s. Base build reproduces the E9 orphan after a server SIGKILL. | API-08, API-09 |
| U-A3 | Desktop force path with real CLIs: snapshot ≈ 0.18 s, server SIGKILL immediate, tool commands gone within the 1.5 s grace; Electron exit 1.6 s after the server's exit. | API-13 |

## Preliminary Classification (On `Fail`)

- F-API-001: `Local Fix`, owner implementation engineer (small change in `readProcessTable`/the sweep selection, plus a unit case).
- F-API-002: `Unclear`. The stall sits in or before the predecessor's Org/Team root-shutdown stage (out of this ticket's changed code), but its cause is not established. The failure-origin review decides whether it is this ticket, a follow-up (with the bound and sweep as accepted containment), or a design question for the Solution Designer (stopping the update path being blocked, N-5/FU-007).

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven, or parts only the user can check: none unproven. AC-009's update-restart part was not exercised (unsafe; conditional in the AC).
- Preliminary classification and recommended owner: F-API-001 `Local Fix` → implementation engineer; F-API-002 `Unclear` → failure-origin review.
- Next recipient from `get_handoff_rules`: code reviewer (failure-origin review).
- Notes: everything else holds.
  - Terminate interrupts on Codex, Claude, native and applications.
  - Busy server shutdown exits 0 in about 1 s with nothing left.
  - Desktop quit, SIGTERM and the wedged-server force leave no process.
  - Relaunch gives one server and continues agent, Team and Org runs.
  - `terminatedAt` is preserved. U-A1, U-A2 and U-A3 are measured.
