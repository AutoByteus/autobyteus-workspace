# API/E2E Execution Coverage Report — Part 1: the restart reminder

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record: `api-e2e-revision-record.md`, current `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 2, code review CRR-003 Pass (2026-11-17). It resolves round 1's F-1 through SR-004 DEC-008 (the user chose cause-specific wording) and IR-002 (`b78555d7bb`).
- Prior round reviewed: round 1 (API-REV-001, Fail: F-1 Requirement Gap)
- Rerun by impact. `git diff --name-only cf5ce8d109 92f4a1b3a6` touches `restart-notice.ts`, its unit test, my suite (RR-02's assertion, by the implementation engineer) and ticket documents.
  - Every case that builds a reminder was rerun: RR-01..08, DRO, and both typechecks.
  - Still valid without a rerun:
    - API-04 (busy-run stop-now) delivers no reminder.
    - API-12 (base) is unchanged.
    - API-15 (desktop) asserted only the `restart` text, which is unchanged and was reproved by RR-01, RR-07 and RR-08.
  - New: RR-09, the optional live check of the new line.
  - Stale tests this change made untrue (skill rule): searched every test folder, gated files included, for the old line and for the unexpected-stop cause. Only RR-02 asserted the old line, and the implementation engineer rewrote it to DEC-008 (reviewed: correct). The unit and integration tests assert only the cause wording (rerun by IMP-04).
- Deviations: none from the round-2 plan.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-restart-notice/tickets/in-progress/background-task-restart-notice/evidence/` (round 2 in `API-R2-*`; the handoff message gives the commit)

## Routing Classification

- Task size: `Medium`; Architectural risk: `High`; Input route: `Reviewed`; Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (my suite: RR-09 added, evidence additions to RR-01/RR-02, the implementation engineer's RR-02 assertion)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime / Build | Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | round 1: `79d1f803e4` (code `d5e9f350cf`); round 2: `92f4a1b3a6` (code `b78555d7bb`) | macOS 26 arm64, node 22.23.1 | server `dist/` rebuilt per round with `test:integration:prepare` (stamp 1.5.13-beta.8) | load average 61 to 199 from other work; `fseventsd` saturated |
| ENV-2 | as ENV-1 | as ENV-1 | built server sessions (`dist/app.js --data-dir <root>`), scripted LM Studio model, scripted AGY CLI | test-owned roots; previous release = copy of this build stamped `0.0.0-previous` |
| ENV-3 | base `4cbf9e7881` (round 1) | as ENV-1 | base build in a temporary worktree | the same suite pointed at it |
| ENV-4 | as ENV-1 | as ENV-1 | real runtimes: Claude CLI (haiku, real HOME), Codex app-server (gpt-6.1-terra, throwaway CODEX_HOME), native AutoByteus with OpenAI gpt-5.4-mini (test vault read by the built server) | signed-in CLIs never edited |
| ENV-5 | round 1 | as ENV-1 | isolated desktop instance of this worktree's build, gpt-5.4-mini via the test vault | own data root and ports |

## Cases

Round 2 results replace round 1's for the rerun cases; the rest carry round 1's result as noted.

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01..R03 | — | IMP-01..03 | reused | — | Pass | (IMP rows) | (IMP rows) | IMP-04 (IR-002) reran the restart-resume units/integration (120 pass) and the server typecheck at `b78555d7bb` |
| API-01 | regression | server in-process integration | `pnpm -C autobyteus-server-ts test:integration` | ENV-1 (round 1) | Fail (environment) | `API-01-server-integration.log`, `API-01-fswatch-latency-probe.mjs` | `Test Files  2 failed \| 86 passed \| 20 skipped (108)`; all failures in `file-system-watcher.integration.test.ts` / `package-auto-refresh.integration.test.ts`; probe `"fsWatchLatencyMs":[1240,1741,2589,1868,"timeout>20000"]` | Cause: macOS `fseventsd` saturated (163% CPU) by other work; plain `fs.watch` events 1–11 s late or lost, with no AutoByteus code involved. Neither file imports changed code. Probed again in round 2: `[853,5360,7124,"timeout>20000",5178]` at load 85, so no meaningful retry. Not caused by this change |
| API-02 / API-17 | — | web and server typechecks | `pnpm -C autobyteus-web typecheck`; `pnpm -C autobyteus-server-ts typecheck` | ENV-1 (round 2) | Pass | `API-R2-17-web-typecheck.log`, `API-R2-17-server-typecheck.log` | `test-file errors: 87 in 37 files (baseline 87 in 37 files)`; `test-file errors: 1012 in 316 files (baseline 1012 in 316 files)`; `[typecheck] PASS` | includes RR-09 |
| API-03 | REQ-005, BEH-001, RU-04 | built server reads a released busy-run record (closed-Task fence) | DRO E2E (`RUN_AGY_FAILURE_E2E=1`, scripted AGY) | ENV-2 (round 2) | Pass | `API-R2-dro/` | `Tests  3 passed (3)` | its update wake builds the reminder |
| API-04 | REQ-001 graceful write | SIGTERM with a busy run, relaunch | busy-run-stop-now E2E | ENV-2 (round 1) | Pass | `API-04-busy-run-stop-now/` | `Tests  2 passed (2)` | delivers no reminder: still valid |
| API-05 (RR-01) | AC-001 (graceful), REQ-001..003, REQ-005, crash timing, RU-02, RU-03 | built server, scripted model | `env -i … RUN_RESTART_REMINDER_E2E=1 … restart-reminder-built-server.e2e.test.ts` (RR-01) | ENV-2 (round 2) | Pass | `API-R2-restart-suite/RR-01.json`, `vitest-results.log` | live entry idle + `backgroundTasks: true` without `shutdownAt`; `leftAfterStop: []`; one reminder `"cause":"restart"`; nothing woken; next input `(reason: a restart).` + "the restart stopped them"; second input none; control run nothing | full-run attempt hit the start deadline under load (precondition); retry passed |
| API-06 (RR-02) | AC-001 (kill), DEC-008 | same, SIGKILL | RR-02 | ENV-2 (round 2) | Pass | `API-R2-restart-suite/RR-02.json` | `"cause":"unexpected_stop"`; next input `(reason: an unexpected stop (a crash, a forced quit or a power loss)).` + `If you started any background tasks, some may still be running: the application stopped unexpectedly and could not stop them, and any that are still running are no longer tracked…`; not "the restart stopped them"; `stillRunningWhenReminded: ["25820 25819 25787 00:10 …RR02_9219d7c4"]` | F-1 resolved: the text now matches what the agent finds (the command really is still running) |
| API-07 (RR-03) | AC-001 (update) | previous-release copy | RR-03 | ENV-2 (round 2) | Pass | `RR-03.json` | wake without input `(reason: an update to v1.5.13-beta.8).` + "the restart stopped them" | — |
| API-08 (RR-04) | AC-002 | update, mid-turn with a task | RR-04 | ENV-2 (round 2) | Pass | `RR-04.json` | one wake with the interrupted-turn line and "the restart stopped them" | — |
| API-09 (RR-05) | AC-004 (input vs wake) | update, input at once | RR-05 | ENV-2 (round 2) | Pass | `RR-05.json` | exactly one reminder; `carriedBy: "wake"`; reminders empty | input-first branch: integration (IMP-02/04) |
| API-10 (RR-06) | AC-003 (Antigravity) | scripted AGY daemon step | RR-06 | ENV-2 (round 2) | Pass | `RR-06.json` | CLI's echoed input contains the reminder `(reason: a restart)` | — |
| API-11 | AC-004 (closed Task, archived root) | — | API-03, API-R02 | — | Pass (closed Task E2E; archived root integration level) | — | — | an archived root at take time cannot be produced through public APIs |
| API-12 | AC-001 before | base build | the suite with `RESTART_REMINDER_SERVER_DIR=<base>` | ENV-3 (round 1) | Pass (before shown) | `API-12-before-base/` | no record, no reminder, no wake | base unchanged: still valid |
| API-13 (RR-07) | AC-003 (Claude, live) | real Claude CLI | RR-07 (`RUN_RESTART_REMINDER_LIVE_E2E=1`) | ENV-4 (round 2) | Pass | `RR-07.json` | idle + `backgroundTasks: true`; reminder `(reason: a restart)`; Claude's answer after the reminder | two attempts failed the precondition: haiku answered STARTED without calling Bash (it said so itself afterwards) |
| API-14 (RR-08) | AC-003 (Codex, graceful stop) | real Codex app-server | RR-08 | ENV-4 (round 2) | Pass | `RR-08.json` | recorded only at the graceful stop as idle + task; reminder with the next input | — |
| API-15 | AC-001 user journey, RU-01 | real desktop app | isolated instance; "Restart server" IPC; full quit/relaunch | ENV-5 (round 1) | Pass (FU-002 observed) | `API-15-desktop/` | `"cause": "restart"` both ways; the agent: "The nightly build was stopped by the restart … I can restart it if you want." | restart text unchanged in round 2 |
| API-16 | AC-003 (Grok Build / DeepSeek ACP) | — | — | — | Not Tested | — | — | `dsh` not installed; ACP reports no background tasks by construction; the mid-turn path is RR-04's |
| API-18 (RR-09) | DEC-008 in use (the reviewer's optional ASM-style check) | built server, native run on real OpenAI gpt-5.4-mini, SIGKILL | RR-09 (`RUN_RESTART_REMINDER_LIVE_E2E=1`, test vault) | ENV-4 (round 2) | Pass | `API-R2-restart-suite/RR-09.json` | `survivorsAfterKill` non-empty; notice contains the DEC-008 line; the agent's check `ps -p <pid> -o pid=,ppid=,stat=,etime=,command=`; answer "Yes — process … is still running." | passed in the first run and the full run |

## Prior Failure Resolution

| Prior Failure | Classification | Resolution | Proven By |
| --- | --- | --- | --- |
| F-1: after an unexpected stop the reminder said the tasks were stopped while they kept running | Requirement Gap | SR-004 DEC-008 (the user): cause-specific line; IR-002 `b78555d7bb`. Stopping the surviving groups is out of this ticket (FU-004, the user's decision) | API-06 (RR-02 text and survivors), API-18 (a real model checks with `ps` and reports the build still running) |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-only part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-05 (graceful), API-06 (kill, DEC-008 line), API-07 (update), API-12 (before), API-15 (real app, the agent acts), API-18 (the agent acts on the kill line) | Proven | — |
| AC-002 | Yes | API-08 | Proven | — |
| AC-003 | No | API-05/07 (AutoByteus), API-10 (Antigravity), API-13 (Claude live), API-14 (Codex live, graceful stop) | Proven; ACP live Not Tested (API-16) | — |
| AC-004 | Yes | API-09 (real race), API-03 (closed Task, built server), API-R02/IMP-04 (input first, NOT_FIRST, failed post, archived/gone roots) | Proven (archived root at integration level) | — |
| Crash timing | — | API-05 (live entry within ~1.7 s, no `shutdownAt`) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual | Could Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 95% | 95% | every AC through real restarts; DEC-008 text and its truth (RR-02 survivors) | ACP not live | — |
| Changed-boundary directness | 95% | 95% | real server processes, restarts, kills, files; real runtimes; real app | — | — |
| Integration realism / mock gap | 90% | 95% | scripted inference closed by Claude, Codex, OpenAI live and the real app | — | — |
| Environment fidelity | 90% | 95% | macOS full stack; the changed code is platform-independent; DEC-008's "may still be running" holds whether or not the platform reaps orphans | Linux not run | — |
| Failure / lifecycle / recovery | 95% | 95% | SIGTERM, SIGKILL (survivors measured), update, race, closed Task | — | — |
| User surface | N/A | 90% | API-15 (real app, the agent acts) | FU-002: after a restart the card shows twice and the first reply is hidden (pre-existing turn-id reuse; recorded follow-up) | FU-002 fixed |
| Durable regression coverage | 95% | 95% | gated suite RR-01..09 (scripted + live); preconditions name the known load failures | gated suites run only when their gate is set (project convention) | — |

- Overall post-repository: 93%; overall final: 94% (simple average 94.3)
- Every critical AC directly proven: Yes
- Any final category below 90%: No
- 95% target met: No. The remaining gap is FU-002, a pre-existing display defect outside this ticket that validation cannot close. I recorded it, and the designer may decide it must ship with this ticket.
- Confidence-limiting risks: FU-002; FU-004 (crash orphans keep running; the agent is now told so); API-01's environmental watcher failures

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed): `Live API` (Claude, Codex, OpenAI native), `Project Desktop Validation` (round 1), `Lifecycle` (built-server restarts and kills)
- Gap addressed: real runtimes across a restart; the app's real restart paths; how real agents act on the reminder (graceful: restart offered; crash: checks with `ps` first)

## Desktop Application Validation

- Round 1, still valid: the app's "Restart server" and a full quit/relaunch reach the graceful end (`cause: "restart"`); the reminder card is shown and the agent acts on it. Round 2 did not change the restart text. No effect on the user's app.

## Persisted-Data Transition Checks

- `busy-runs.json` Directly Usable: API-03 (released record through the new take, round 2). `restart-reminders.json` Not Affected. No version branch observed.

## Compatibility / Legacy Scope Check

- None introduced or observed; no compatibility-only coverage.

## Durable Coverage Changed In The Codebase

| Path | Change | Cases |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/restart-resume/restart-reminder-built-server.e2e.test.ts` | Added in round 1 (`4cec9abfea`). Round 2: the implementation engineer's RR-02 assertion (DEC-008, `b78555d7bb`); RR-09 added; RR-01/RR-02 evidence-only additions (conversation, trace turn ids, survivors) | API-05..10, API-12..14, API-18 |

- Paths attached for proportional test-code review: Yes

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Model inference (RR-01..05) | scripted LM Studio server | deterministic turns; reads exactly what the model receives | closed by RR-07/08/09 and API-15 |
| Antigravity CLI (RR-06) | scripted AGY CLI | no provider | — |
| Previous release (update) | copy of this build stamped `0.0.0-previous` | the cause rule reads only the stamp | the first update from the base release records no idle runs (API-12 RR-03) |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Base worktree (round 1) | Yes | `git worktree remove --force`, `prune` | removed |
| Previous-release copies, test data roots, servers, tagged processes and RR-09's build groups | Yes | suite cleanup | none left |
| Isolated instance (round 1) | Yes | `isolated-app stop` | stopped, data root removed |
| `API-01-fswatch-latency-probe.mjs` | Yes | kept as evidence | — |
| Build outputs | Yes | untracked | kept |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven / user-only: none. AC-003's ACP part is Not Tested live (API-16, low risk).
- Next recipient: code reviewer (proportional test-code review)
- Notes:
  - F-1 is resolved: after a crash the reminder now says the tasks may still be running and are untracked, which matches what happens. A real model checks with `ps` and reports the build still running.
  - Follow-ups:
    - FU-002 (doubled reminder card after a restart; pre-existing turn-id reuse).
    - FU-004 (crash orphans keep running; out of scope by the user's decision).
  - API-01's watcher failures are environmental, with the cause recorded.
