# API/E2E Execution Coverage Report — Part 1: the restart reminder

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, code review CRR-001 Pass (2026-11-17)
- Prior round reviewed: N/A
- Deviations from the plan:
  - The live Claude and Codex cases (API-13/14) are in the same suite file as the scripted cases, under a second gate (`RUN_RESTART_REMINDER_LIVE_E2E=1`), so they share its node and restart helpers. No separate live file.
  - Intermediate waits in the suite do not fail the case. Each case asserts at its end, so the same file also runs through every restart on the base build (API-12).
  - API-15 used the app's own "Restart server" IPC (`window.electronAPI.restartServer()`) and a full app quit/relaunch (`isolated-app restart`). The app has no "Restart server" button in Settings that I could find, so I called the IPC that sits behind it.
  - Added evidence, not assertions: RR-02 records which processes survive the forced kill; RR-01 records the reloaded conversation and the turn ids. That is how the finding and FU-002 were established.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-restart-notice/tickets/in-progress/background-task-restart-notice/evidence/` (the handoff message gives the commit)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: N/A this round (Fail: failure-origin review requested instead)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime / Build | Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `79d1f803e4` (code `d5e9f350cf`); new test file uncommitted at run time | macOS 26 arm64, node 22.23.1 | server `dist/` from `test:integration:prepare` (stamp 1.5.13-beta.8) | load average 63 to 199 throughout, from other work on this machine; `fseventsd` saturated |
| ENV-2 | as ENV-1 | as ENV-1 | built server sessions (`dist/app.js --data-dir <root>`), scripted LM Studio model, scripted AGY CLI | test-owned roots; previous release = copy of this build stamped `0.0.0-previous` |
| ENV-3 | base `4cbf9e7881` | as ENV-1 | base build in a temporary worktree (stamp 1.5.13-beta.8) | same suite pointed at it (`RESTART_REMINDER_SERVER_DIR`) |
| ENV-4 | as ENV-1 | as ENV-1 | real runtimes: Claude CLI (haiku, real HOME), Codex app-server (gpt-6.1-terra, throwaway CODEX_HOME) | signed-in CLIs; never edited |
| ENV-5 | as ENV-1 | as ENV-1 | isolated desktop instance of this worktree's build, gpt-5.4-mini via the test vault | own data root and ports |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | — | server typecheck | `IMP-01` | — | Pass | (IMP-01 row) | (IMP-01 row) | rerun as API-17 with the new test |
| API-R02 | REQ-001..005 (local), AC-004 closed/archived (integration level) | restart-resume units + one integration through a real `AgentRun` | `IMP-02` | — | Pass | (IMP-02 row) | (IMP-02 row) | ran on `d5e9f350cf`; no product code changed since |
| API-R03 | regression | server unit full | `IMP-03` | — | Pass for this change | (IMP-03 row) | (IMP-03 row) | its 4 watcher failures are FU-001 (cause recorded) |
| API-01 | regression | server in-process integration | `pnpm -C autobyteus-server-ts test:integration` | ENV-1 | Fail (environment) | `API-01-server-integration.log`, `API-01-fswatch-latency-probe.mjs` | `Test Files  2 failed \| 86 passed \| 20 skipped (108)`; every failure is in `file-system-watcher.integration.test.ts` or `package-auto-refresh.integration.test.ts` (`Timed out waiting for event`, `Hook timed out in 10000ms`); probe `"fsWatchLatencyMs":[1240,1741,2589,1868,"timeout>20000"]` | Cause: macOS `fseventsd` was saturated (163% CPU) by other work on the machine, so file events arrived 1–11 s late or not at all, with no AutoByteus code involved. Neither file imports anything this ticket changed. A rerun alone at load 148–187 failed 18. Retried at the end: still saturated (`[1419,1624,"timeout>20000",11320,914]`). Not caused by this change; the 86 other files pass |
| API-02 | — | web typecheck | `pnpm -C autobyteus-web typecheck` | ENV-1 | Pass | `API-17-web-typecheck.log` | `production errors: 0; test-file errors: 87 in 37 files (baseline 87 in 37 files)` | TESTING.md: both typechecks |
| API-03 | REQ-005, BEH-001, RU-04 | built server reads a released (pre-change) busy-run record | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<agy-failure-cli.mjs> DRO_E2E_EVIDENCE_DIR=… pnpm -C autobyteus-server-ts exec vitest run tests/e2e/app-data-migrations/delegated-runs-own-runs-startup.e2e.test.ts --no-watch` | ENV-2 | Pass | `API-03-dro/vitest-results.log`, `API-03-dro/API-E03-…json` | `✓ DRO-3 DS-15: restart resume skips a delegated run whose Task entry is closed (… resumed, DRO-1)`; `Tests  3 passed (3)` | old-shape record read by the new take: closed-Task run gets nothing, the open one is woken |
| API-04 | REQ-001 graceful write | built server SIGTERM with a busy run, relaunch | `env -i … RUN_BUSY_STOP_NOW_E2E=1 … busy-run-stop-now.e2e.test.ts` | ENV-2 | Pass | `API-04-busy-run-stop-now/` | `Tests  2 passed (2)`; `"survivors":[]` | — |
| API-05 (RR-01) | AC-001 (graceful), REQ-001..003, REQ-005, crash timing, RU-02, RU-03 | built server sessions, scripted model | `env -i … RUN_RESTART_REMINDER_E2E=1 RESTART_REMINDER_E2E_EVIDENCE_DIR=… pnpm -C autobyteus-server-ts exec vitest run tests/e2e/restart-resume/restart-reminder-built-server.e2e.test.ts --no-watch` (RR-01) | ENV-2 | Pass | `API-05-14-restart-suite/RR-01.json`, `vitest-results.log` | live entry `"status":"idle","backgroundTasks":true` within `recordedAfterMs` 1660, no `shutdownAt`; stop adds `shutdownAt`; `leftAfterStop: []`; after the take `busyRuns: null`, one reminder `"cause":"restart"`; `requestsBeforeInput: 2` (nothing woken); next input `…(reason: a restart).` + background line, no interrupted line; second input no header; control run (idle, no task) never recorded or reminded | — |
| API-06 (RR-02) | AC-001 (kill) | same, SIGKILL | RR-02 | ENV-2 | Pass (with finding F-1) | `API-05-14-restart-suite/RR-02.json` | `killed.shutdownAt` absent; reminder `"cause":"unexpected_stop"`; next input `(reason: an unexpected stop (a crash, a forced quit or a power loss)).` + `If you started any background tasks, the restart stopped them.`; **`stillRunningWhenReminded`: `18615 18613 18285 00:13 …node -e setInterval(()=>{},1000) RR02_5dbccd76`** | F-1: after a forced kill the command and its parent shell keep running (13 s and counting when the agent is told they were stopped). In 4 of the 6 RR-02 runs after the precondition check was added, the background start itself missed its deadline under load ("Command did not start: Command control deadline exceeded", FU-003 of autobyteus-333); the precondition check names this |
| API-07 (RR-03) | AC-001 (update), REQ-003 | first session = previous-release copy | RR-03 | ENV-2 | Pass | `RR-03.json` | entry `"version":"0.0.0-previous"`; wake without input: `[Platform notice — application restarted] … (reason: an update to v1.5.13-beta.8).` + background line, no interrupted line; next input carries nothing; reminders empty | — |
| API-08 (RR-04) | AC-002 | update with a run mid-turn that has a background task | RR-04 | ENV-2 | Pass | `RR-04.json` | entry `"status":"running","backgroundTasks":true`; one wake with `Your previous turn was interrupted…` and the background line | run 1 hit the start deadline under load (precondition added) |
| API-09 (RR-05) | AC-004 (input vs wake) | update; input sent the moment the node answers | RR-05 | ENV-2 | Pass | `RR-05.json` | exactly one reminder; `carriedBy: "wake"` in each of the 3 passing runs (the wake reached the model 148–168 ms before the input in the two runs whose timing I compared); the input carried none; reminders empty | the "input first" branch is proven at integration level (IMP-02); the real race went to the wake each time |
| API-10 (RR-06) | AC-003 (Antigravity) | scripted AGY CLI with an open daemon step | RR-06 | ENV-2 | Pass | `RR-06.json` | entry `"status":"idle","backgroundTasks":true`; `cause: "restart"`; the CLI's echoed input `ECHO:"[Platform notice — application restarted]…(reason: a restart)…ECHO_INPUT what is the status?"` | one run hit "Antigravity model discovery timed out" under load |
| API-11 | AC-004 (closed Task, archived root) | — | API-R02 (integration/unit), API-03 (closed Task through the built server) | — | Pass (closed Task); archived root: integration level only | — | — | an archived root at take time cannot be produced through public APIs (archiving needs the run out of the live list, which rewrites the record within 2 s) |
| API-12 | AC-001 before | the suite against the base build | `… RESTART_REMINDER_SERVER_DIR=<base>/autobyteus-server-ts … -t 'RR-0[123]'` | ENV-3 | Pass (before shown) | `API-12-before-base/` | RR-01/02/03 on base: `live/entry None`, `afterTake None`; requests `CASE:RR-0x How is the build going?` / `And now?` with no reminder; RR-03 no wake | the failures are the expected before evidence |
| API-13 (RR-07) | AC-003 (Claude, live) | built server + real Claude CLI (haiku) | RR-07 with `RUN_RESTART_REMINDER_LIVE_E2E=1` | ENV-4 | Pass | `RR-07.json` | entry idle + `backgroundTasks: true`; reminder notice `(reason: a restart)`; Claude: "The `sleep 600` background task was stopped by the application restart before it finished, so it did not complete." | — |
| API-14 (RR-08) | AC-003 (Codex, graceful stop) | built server + real Codex app-server (gpt-6.1-terra) | RR-08 | ENV-4 | Pass | `RR-08.json` | live record empty during the session (by design); at the graceful stop `"status":"idle","backgroundTasks":true`; reminder with the next input; Codex: "The application restart stopped the `sleep 600` command." | the Codex background-terminal inspection path at the graceful stop works |
| API-15 | AC-001 user journey, RU-01, the success definition | real desktop app | isolated instance; Daily Assistant (AutoByteus, gpt-5.4-mini) starts `sleep 600` in the background; app "Restart server" IPC; next message; then a full app quit/relaunch (`isolated-app restart`) | ENV-5 | Pass (with FU-002 observed) | `API-15-desktop/API-15-desktop-journey.log`, `02-after-restart-reminder.png`, `03-after-reload.png`, `04-after-app-relaunch.png`, `run-traces-turn-ids.txt` | live record idle + task; after "Restart server" `"cause": "restart"`, `sleep 600` gone; reminder card, then the agent `tail`s its log and answers "The nightly build was stopped by the restart, so it's not currently running. I can restart it if you want."; full app relaunch: `"cause": "restart"` | the reminder card shows twice and the first reply is hidden (FU-002, pre-existing turn-id reuse; base reuses `turn_0001` too, API-12 `RR-01-with-turn-ids.json`). After the relaunch the model call failed because I restarted without the test vault (tester setup) |
| API-16 | AC-003 (Grok Build / DeepSeek ACP) | — | — | — | Not Tested | — | — | `dsh` not installed; ACP backends report no background tasks by construction, so a mid-turn ACP run follows the same mid-turn path proven by RR-04 |
| API-17 | test-code type safety | server typecheck incl. the new suite | `pnpm -C autobyteus-server-ts typecheck` | ENV-1 | Pass | `API-17-server-typecheck.log` | `production errors: 0; test-file errors: 1012 in 316 files (baseline 1012 in 316 files)` | — |

## Finding F-1 — After a crash the reminder tells the agent its background tasks were stopped, but they keep running

- Scenario: SCN-004 (crash, forced quit), which the user named; AC-001's kill variant; REQ-002 ("that any background tasks it started were stopped by the restart"); DEC-003's wording "If you started any background tasks, the restart stopped them."
- Observed (RR-02, built server, SIGKILL of the server process): the run's background command (`node … RR02_…`, pid 18615) and its parent shell (18613, process group 18285) were still running 13 s after the kill. At that moment the agent's next input carried "If you started any background tasks, the restart stopped them." With a graceful stop (RR-01, the app's "Restart server", a full app quit) the command is stopped, so the sentence is true there (`leftAfterStop: []`; desktop `sleep 600` processes 0).
- Why: a crash runs no cleanup, so the command groups the dead server owned are orphaned and keep running. That predates this ticket (338 stops commands at run end and app quit; a crash was never covered). But this ticket's reminder now asserts they were stopped, for the unexpected-stop cause too.
- Consequence in real use: after a crash the agent believes its build or dev server is gone while it is still running and writing files. Following the reminder ("restart it"), it starts a second copy: a port conflict for a dev server, or two builds writing the same output. The orphans also run on unseen, since no run tracks them anymore.
- Preliminary classification: `Requirement Gap`. The approved text and REQ-002 rest on the premise that every restart stops the tasks, which is false for an unexpected stop. Options for the owner: different wording for the unexpected-stop cause ("they may still be running; check before you restart them"), or stopping the previous session's command groups at the next start (which needs their ids recorded). Either needs a decision about intended behavior.
- Recommended owner: Solution Designer (after the code reviewer's failure-origin review).

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-only part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-05 (graceful), API-06 (kill), API-07 (update), API-12 (before), API-15 (real app: Restart server, full quit/relaunch; the agent acts on it) | Proven for cause, timing and delivery. The kill variant's "stopped" claim is false (F-1) | — |
| AC-002 | Yes | API-08 | Proven | — |
| AC-003 | No | API-05/07 (AutoByteus), API-10 (Antigravity), API-13 (Claude live), API-14 (Codex live, graceful stop) | Proven; ACP (Grok/DeepSeek) Not Tested live (API-16) | — |
| AC-004 | Yes | API-09 (exactly once in the real race), API-R02 (input first; NOT_FIRST; failed post; archived/gone roots), API-03 (closed Task through the built server) | Proven (archived root at integration level only) | — |
| Crash timing (handoff hint) | — | API-05 (`recordedAfterMs` 1660, no `shutdownAt`) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual | Could Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 85% | 85% | API-03..15 | F-1 contradicts REQ-002 for crashes; ACP not live | decision on F-1 |
| Changed-boundary directness | 95% | 95% | real server processes, real restarts and kills, real files, real runtimes, real app | — | — |
| Integration realism / mock gap | 90% | 95% | scripted inference in RR-01..06; real Claude, Codex, gpt-5.4-mini | — | — |
| Environment fidelity | 85% | 90% | macOS; built server and app; load 63–199 caused start-deadline and discovery failures, which the precondition checks name | Linux not run (platform-independent server code; process-group behavior on a crash may differ) | a Linux crash run |
| Failure / lifecycle / recovery | 85% | 85% | SIGTERM, SIGKILL, update, input-vs-wake race, closed Task | F-1 (crash leaves tasks running) | — |
| User surface | N/A | 85% | API-15 | FU-002 (doubled card, hidden first reply; pre-existing cause) | FU-002 fixed |
| Durable regression coverage | 90% | 90% | new gated suite RR-01..08 (scripted + live) | gated; the RR-02 survivor check records but does not assert (pending the F-1 decision) | assert once F-1 is decided |

- Overall post-repository: 88%; overall final: 89% (simple average)
- Every critical AC directly proven: No (F-1 on AC-001's kill variant)
- Any final category below 90%: Yes (AC proof, failure/lifecycle, user surface)
- 95% target met: No

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed): `Live API` (Claude, Codex), `Project Desktop Validation` (API-15), `Lifecycle` (built-server restarts and kills).
- Gap addressed: real runtimes' background-task facts across a restart; the app's real restart paths; the agent acting on the reminder.

## Desktop Application Validation

- Executed as planned, plus the app's "Restart server" IPC. Web-equivalent: the reminder card. Shell/lifecycle: the app's restart and quit reach the server's graceful end (`cause: "restart"`).
- Effect on the user's running app: none (own data root and ports).

## Persisted-Data Transition Checks

- `busy-runs.json` Directly Usable: API-03 (the released record through the new take). `restart-reminders.json` Not Affected: read between sessions in RR-01..08. No version branch observed.

## Compatibility / Legacy Scope Check

- No compatibility behavior introduced or observed. No durable coverage for compatibility-only behavior.

## Durable Coverage Changed In The Codebase

| Path | Change | Cases |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/restart-resume/restart-reminder-built-server.e2e.test.ts` | Added (gate `RUN_RESTART_REMINDER_E2E=1`; live cases also `RUN_RESTART_REMINDER_LIVE_E2E=1`) | API-05..10, API-12, API-13, API-14 |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Model inference (RR-01..05) | scripted LM Studio server | deterministic turns; reads exactly what the model receives | closed by API-13/14/15 |
| Antigravity CLI (RR-06) | `tests/fixtures/agy-failure-cli.mjs` | no provider | — |
| Previous release (update) | copy of this build stamped `0.0.0-previous` | the cause rule reads only the stamp | the first update from the base release itself records no idle runs (base recorder), proven by API-12 RR-03 |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Base worktree `api448-base-4cbf9e7881` | Yes | `git worktree remove --force`, `prune` | removed |
| Previous-release copies `autobyteus-server-ts/.restart-reminder-e2e-previous-*` | Yes | suite cleanup | none left |
| Test data roots, servers, tagged processes | Yes | suite `afterAll` | none left (`ps`, `ls`) |
| Isolated instance `iso-59065-f2bf` | Yes | `isolated-app stop` | stopped, data root removed |
| `API-01-fswatch-latency-probe.mjs` | Yes | kept as evidence | — |
| Build outputs (`dist/`, `electron-dist/`) | Yes | untracked, not committed | kept |

## Preliminary Classification (On `Fail`)

- F-1: `Requirement Gap` (Solution Designer). The implementation follows REQ-002 and DEC-003; the requirement's premise does not hold for an unexpected stop.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: AC-001 kill variant (the reminder's "stopped" claim, F-1); AC-003 ACP live (Not Tested, low risk)
- Preliminary classification and recommended owner: F-1 `Requirement Gap`, Solution Designer
- Next recipient: code reviewer (failure-origin review)
- Notes:
  - Everything else is proven: the live record, the three causes with before/after, the update wake, the mid-turn line, exactly-once delivery in a real race, Antigravity/Claude/Codex, and the agent acting on the reminder in the real app.
  - Found and recorded:
    - FU-002: the doubled reminder card and hidden first reply after a restart (pre-existing turn-id reuse, now visible).
    - API-01's watcher failures: environmental, caused by a saturated `fseventsd`.
    - Start-deadline failures under load: FU-003 of autobyteus-333.
