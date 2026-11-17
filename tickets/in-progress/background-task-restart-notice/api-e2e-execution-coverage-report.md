# API/E2E Execution Coverage Report — Part 1: the restart reminder

> Current round: **Part 2, round 3 (API-REV-003)**, in its own section at the end of this file. Part 1's result below is unchanged and was reproved on the part 2 build (P2-12).

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

---

# Part 2: show an agent with a running background task (round 3)

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`, section "Part 2" (cases P2-R01, P2-01..P2-13)
- API/E2E revision record: `api-e2e-revision-record.md`, current `API-REV-003`
- Test progress log: `api-e2e-test-progress.md` (P2 rows)
- Round and trigger: round 3, code review CRR-006 Pass for part 2 (Large/High), code `895cf3992d..ce06c415cc`, tested at `4c93deaa8f`.
- Prior round reviewed: round 2 (part 1, Pass). Part 2 is new behavior (REQ-006, REQ-007, AC-005, AC-006, DEC-004, DEC-005), so it is a full first round for part 2. Part 1 was rerun by impact (P2-12), because the restart recorder now reads the same count derivation.
- Stale tests this change made untrue (skill rule): every exact `AGENT_STATUS` payload assertion and fixture in server and web tests was searched for, gated suites and probes included. There were two:
  - `agent-command-correlated-status.e2e.test.ts` asserted four payloads without `background_tasks_running` and failed in P2-05. Fixed: the payloads now include `background_tasks_running: 0`. It passes.
  - `interrupt-result-presentation-probe.mjs` sent agent statuses without the field, a fixture the new contract no longer describes. The fixture is fixed. The probe's other failures are identical on base (FU-008).
- Deviations from the plan:
  - P2-11 became durable (`peer-background-task-status.e2e.test.ts`).
  - The Team with a failed member was tried live and is not reachable from a scripted model; see P2-07a.
  - P2-13 (ACP live) is Not Tested.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-restart-notice/tickets/in-progress/background-task-restart-notice/evidence/` (`P2-*`)

## Routing Classification

- Task size: `Large`. Architectural risk: `High`. Input route: `Reviewed`. Successful-output route: `Code Review`.
- Proportional test-code review decision: `Required`. Scope:
  - two new gated suites;
  - one stale E2E assertion updated;
  - one probe fixture updated.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime / Build | Settings That Matter |
| --- | --- | --- | --- | --- |
| P2-ENV-1 | `4c93deaa8f` (code `ce06c415cc`) | macOS 26 arm64, node 22.23.1 | repository suites; server `dist/` from `test:integration:prepare` at that commit | load average 44 to 118 from other work; `fseventsd` saturated |
| P2-ENV-2 | as P2-ENV-1 | as P2-ENV-1 | in-process studio server (`NativeRuntimeLiveHarness`), scripted LM Studio model, scripted AGY CLI (`AGY_FAKE_CASE=linked_skills`) | strict parsing of every frame with the contract parsers |
| P2-ENV-3 | as P2-ENV-1 | as P2-ENV-1 | live runtimes: Claude CLI (real HOME), Codex app-server (gpt-6.1-terra, throwaway CODEX_HOME); native agent on OpenAI gpt-5.4-mini through the test vault | signed-in CLIs never edited |
| P2-ENV-4 | as P2-ENV-1 | as P2-ENV-1 | two built servers (`dist/app.js`), remote collaboration on, paired | test-owned data roots |
| P2-ENV-5 | as P2-ENV-1 | as P2-ENV-1 | isolated desktop instance of this build (`iso-56317-2d8b`); browser and phone probes | own data root and ports; the user's app untouched |
| P2-ENV-6 | fresh clone at `4c93deaa8f` | macOS arm64; Docker linux/arm64 | frozen install, the desktop release job's build, the server image build | no `dist/` in the clone |
| P2-ENV-7 | bases `895cf3992d` (part 2 base) and `4cbf9e7881` (pre-ticket) | as P2-ENV-1 | temporary worktrees, removed afterwards | to compare failures |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P2-R01 | wire schemas | contract packages, both typechecks, remote-collaboration units | reused IMP-15 | — | Pass | (IMP-15) | — | ran at the final code (after CR-002) |
| P2-01 | regression | server unit (full) | `pnpm -C autobyteus-server-ts test:unit` | P2-ENV-1 | Pass for this change | `P2-01-server-unit.log` | `Tests  5 failed \| 8244 passed`; 4 failures in `agent-package-folder-watcher.test.ts` (file watcher); `antigravity-cli-capability.test.ts` rerun alone `48 passed (48)` | Watcher failures are the saturated `fseventsd` (the same cause as round 1's API-01). AGY discovery: a timeout under load. Neither imports changed code |
| P2-02 | regression | server integration (full) | `test:integration:prepare`, `test:integration` | P2-ENV-1 | Fail (environment) | `P2-02-server-integration.log` | `Test Files  2 failed \| 86 passed`; all 13 failures in `file-system-watcher` / `package-auto-refresh`; fs.watch probe `["timeout>20000",240,2981,2631,5441]` | The same files and cause as round 1's API-01 (no AutoByteus code in the probe). Not caused by this change |
| P2-03 | regression, AC-005/006 web | web unit (full) | `pnpm -C autobyteus-web test:nuxt run` | P2-ENV-1 | Pass | `P2-03-web-unit.log` | `Test Files  757 passed (757)`, `Tests  5692 passed (5692)` | includes `teamActivityOf`, `TeamAggregateStatusDot` (Error + 2 tasks → background), phone rows |
| P2-04 | localization, boundaries | web guards | `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | P2-ENV-1 | Pass | `P2-04-web-guards.log` | `Passed.` ×2, exit 0 | — |
| P2-05 | regression | server E2E suite (requested) | `env -i … pnpm test:e2e` | P2-ENV-1, P2-ENV-7 | Pass for this change | `P2-05-server-e2e/results.log`, `stop-probe.mjs` | full run `16 failed \| 110 passed`. Breakdown: 1 stale assertion this ticket made untrue, now fixed (`Tests  1 passed (1)`); 4 files pass alone (load); the rest fail the same on pre-ticket base `4cbf9e7881` or are load timeouts | see "E2E failures" below; FU-009 |
| P2-06 | build input (contract packages changed) | fresh clone, frozen install, the desktop release job's build, verify steps, server image | TESTING.md "Fresh-start build" | P2-ENV-6 | Pass | `P2-06-fresh-start-build.log` | `prisma-client=0 terminal-resources=0 terminal-app=0 terminal-spawn=0 exit=0`; `docker-build=0` | linux/amd64, Linux desktop and signing Not Tested |
| P2-07 (BTS-01) | AC-005 native, AC-006, REQ-006 stream + feed, reconnect snapshot | in-process server, agent stream and `/ws/run-status` | `RUN_BACKGROUND_TASK_STATUS_E2E=1 … background-task-status-count.e2e.test.ts` | P2-ENV-2 | Pass | `P2-07-status-count/BTS-01.json`, `vitest-results.log` | stream `running:1 → idle:1`; a second message while the task runs is delivered after `25` ms and runs (`running:2 → idle:2`); counts 2, 1, 0; reconnect's first status `idle:1`; snapshot `backgroundTasksRunning: 1` | example sequence of the design |
| P2-07 (BTS-02) | Team, REQ-006 team stream + summed run state | team stream, feed | BTS-02 | P2-ENV-2 | Pass | `BTS-02.json` | coordinator `idle:1 → idle:0`, worker every count 0; snapshot `{kind: agent_team, status: idle, backgroundTasksRunning: 1}` with both agents; last run state `idle:0` | rerun on the restored file after P2-07a: Pass |
| P2-07a | Team with a failed member (the reviewer's request); the presentation route tried directly | as BTS-02, plus a third member whose model answers HTTP 400 | temporary BTS-02 change, reverted | P2-ENV-2 | Not reachable live (rule proven at unit/component level) | `P2-07-status-count/P2-07a-attempts.log` | the member gets `ERROR {code: LLM_PROVIDER_ERROR, error_effect: diagnostic}` and its status path ends `idle:0`, never `error` | In the native runtime the error status comes only from a fatal runtime error or a compaction recovery block; neither can be scripted here. Error + background proven by: `TeamAggregateStatusDot` (Error, 2 → "2 background tasks running"), `teamActivityOf`, `mobileRunListRows` (P2-03); the server's team status rule is base's and unchanged, and the sum is BTS-02's. Also tried: a delegated copy on `/ws/agent-collaboration/<root>` (temporary BTS-06, removed): that route carries the tree and messages only; the presentation adapter's `AGENT_STATUS` reaches the client through the run-status feed (`observePairedAgents`), which BTS-01/02 and PBS-01 read |
| P2-07 (BTS-03) | AC-005 Antigravity | scripted AGY open daemon step | BTS-03 with `ANTIGRAVITY_CLI_COMMAND=<agy-failure-cli.mjs> AGY_FAKE_CASE=linked_skills` | P2-ENV-2 | Pass | `BTS-03.json` | path `running:1 → idle:1 → idle:0`; feed `idle 1`, then `idle 0` | first attempt failed: the CLI must be in the environment at start (test corrected) |
| P2-07 (BTS-04) | AC-005 Claude (live) | real Claude CLI, background Bash | BTS-04 (`RUN_CLAUDE_E2E=1`) | P2-ENV-3 | Pass | `BTS-04.json` | path `running:1 → idle:1 → idle:0`; feed `idle 1 → idle 0` | — |
| P2-07 (BTS-05) | Codex stays Idle (design risk) | real Codex app-server, background terminal | BTS-05 (`RUN_CODEX_E2E=1`) | P2-ENV-3 | Pass | `BTS-05.json` | view `AgentBackgroundTaskSnapshot` with a `running` task while path `… idle:0` and feed `idle 0` | Codex's view is a snapshot, so it counts 0 by design |
| P2-08 | AC-005 desktop and phone (the probes this ticket changed) | browser probe; phone probe | `test:e2e:team-status-live --cases TS-008`; `mobile-shell-probe.mjs --cases=MSP-59` | P2-ENV-5 | Pass | `P2-08-probes/` | TS-008: agent and Team rows `bg-blue-500`, header "Background task running", `stop: 0`, `send: 1`, then "Idle" / `bg-green-500`; MSP-59 Pass with screenshots | phone bundle rebuilt first |
| P2-09 | the probes this ticket changed | `interrupt-result-presentation`, `background-contention`, `agent-org-draft-retention` | their package scripts, at head and part-2 base `895cf3992d` | P2-ENV-5, P2-ENV-7 | Fail (pre-existing) | `P2-09-changed-probes/` | identical failures at head and base: unexpected GraphQL operations `GetUpdateChecksCapability` / `GetTeamMemberFileChanges`, BG-BROWSER-004 click timeout, Org draft-retention harness wait | FU-008. All interrupt scenarios SR008-BR-001..004 pass. The interrupt fixture was brought to the new contract |
| P2-10 | AC-005/006 user journey, zh-CN, reload, panel note | real desktop app (isolated), Daily Assistant on gpt-5.4-mini, real `run_bash(run_in_background)` | user steps (see README) | P2-ENV-5 | Pass | `P2-10-desktop/README.md`, `state-*.json`, `*.png` | "Background task running", `bg-blue-500`, no Stop; a message while it runs → "Running" with Stop at 123 ms, then "2 background tasks running"; after reload "2 background tasks running"; zh-CN "2 个后台任务运行中" → "后台任务运行中" → "空闲" | instance stopped, data root removed |
| P2-11 (PBS-01) | RU-09 peer route | two built nodes paired; Alpha's AGY delegator delegates to a Beta AGY worker that holds a background step | `RUN_PEER_BACKGROUND_STATUS_E2E=1 … peer-background-task-status.e2e.test.ts` | P2-ENV-4 | Pass | `P2-11-peer/PBS-01.json`, `vitest-results.log` | Alpha's feed for the peer run: `offline:0 → idle:1 → idle:0`; agent `{status: idle, backgroundTasksRunning: 1}` then `0` | passed twice (before and after the type fix); one earlier attempt hit AGY discovery timeout under load |
| P2-12 | part 1 regression | restart suite RR-01..09 on the part 2 build | as round 2 (+ test vault) | P2-ENV-2, P2-ENV-3 | Pass | `P2-12-restart-suite/` | all nine pass; RR-01/RR-04 on retry | the full run's RR-01/04 failed their precondition (`Command did not start: Command control deadline exceeded` under load, FU-003 of autobyteus-333) |
| P2-13 | ACP unchanged | — | — | — | Not Tested | — | — | `dsh` not installed; ACP reports `unsupported` → 0 (unit, P2-01) |
| P2-17 | typechecks | server and web | `pnpm -C autobyteus-server-ts typecheck` (with the new suites) | P2-ENV-1 | Pass | `P2-17-server-typecheck.log` | `production errors: 0; test-file errors: 1012 in 316 files (baseline 1012 in 316 files)`; `[typecheck] PASS` | web typecheck inside P2-06's build |

### E2E failures (P2-05), classified

- **Made untrue by this ticket:** `agent-command-correlated-status`. Fixed here; it passes.
- **Pass alone (load):** 4 files.
- **Same on pre-ticket base `4cbf9e7881`:**
  - `available-agent-runtimes` AAR-01..04 expect no `deepseek_harness`;
  - `team-run-v1-production-upgrade`, `stopped-run-model-config`, `removed-remote-provider-saved-selection`.
- **Load-bound:**
  - `TEST_SERVER_EXITED_NONZERO`: the server's 10 s shutdown budget. The stop probe measured head and base equally: 1.2–19 s, exit 0.
  - 5 s test timeouts.
  - Grok replay's 3 s version probe.
  - The watcher files (`fseventsd`).
- None of them touches a changed boundary. FU-009 is recorded.

## Acceptance-Criteria Proof

| AC / Requirement | Critical | Proven By | Result |
| --- | --- | --- | --- |
| AC-005 (status shows "Background task running" / "N background tasks running", blue dot, no Stop; Running during a turn; Idle at the end) | Yes | BTS-01 native, BTS-03 Antigravity, BTS-04 Claude live, TS-008 and MSP-59 (desktop and phone), P2-10 (real app, real model, zh-CN, reload) | Proven |
| AC-006 / DEC-005 (a message is delivered at once while a task runs) | Yes | BTS-01 (`deliveredAfterMs: 25`, then `running:2`), P2-10 (Running with Stop at 123 ms) | Proven |
| REQ-006 every route carries the count | Yes | stream (BTS-01..05); collaboration presentation adapter → `/ws/run-status` agent entries and run state (BTS-01 standalone, BTS-02 Team with the sum, through `observePairedAgents`); team stream (BTS-02); peer summary (PBS-01); the Org view's status list (`AgentOrgAgentStatuses`) at unit level (P2-01) | Proven (the Org access at unit level) |
| Snapshots on reload and reconnect | Yes | BTS-01 reconnect first status and snapshot; P2-10 reload | Proven |
| Team rule busy > background > error > idle > offline | No | BTS-02 (background over idle, sum), TS-008 (Team row background then Idle); error member: P2-03 unit/component (P2-07a: not reachable live) | Proven (the error-member part at unit/component level) |
| Codex Idle with a background terminal; ACP unchanged | No | BTS-05 live; ACP unit (P2-13 live Not Tested) | Proven; ACP live Not Tested |
| zh-CN wording (DEC-004) | No | P2-10, P2-04 | Proven |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual | Could Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 93% | 95% | every critical AC through real routes, live runtimes and the real app | the error member only at unit/component level; ACP not live | a runtime that can be made to fail on purpose |
| Changed-boundary directness | 93% | 94% | every route read on the wire with the contract parsers, the peer route between two real nodes | the Org access of the presentation path at unit level | an Org run case |
| Integration realism / mock gap | 90% | 95% | scripted turns closed by Claude and Codex live and a real OpenAI model in the real app | AGY scripted (no provider) | — |
| Environment fidelity | 90% | 92% | macOS full stack; a fresh-start build and the linux/arm64 server image | Linux desktop and amd64 not run | a Linux run |
| Failure / lifecycle / recovery | 92% | 93% | reload, reconnect, task end, two tasks, a turn while tasks run, part 1's restarts (P2-12) | — | — |
| User surface | 90% | 95% | desktop and phone probes; the real app in English and zh-CN | — | — |
| Durable regression coverage | 93% | 93% | BTS-01..05 and PBS-01 (gated); TS-008 and MSP-59; web unit tests | gated suites run only when their gate is set (project convention) | — |

- Overall post-repository: 92%. Overall final: 94% (average 93.9).
- Every critical AC directly proven: Yes.
- Any final category below 90%: No.
- 95% target met: No. The gaps:
  - no runtime here can be made to fail on purpose, for an error member live;
  - the Org view's status access is unit-tested only (the same adapter and feed as BTS-01/02);
  - ACP and Linux not run.
  - All three are low risk:
    - the error-member display is one pure function, tested on its own and in components;
    - ACP reports 0 by construction;
    - the change has no platform-specific code.

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed. It covered:
  - `Live API`: Claude and Codex.
  - `Project Desktop Validation`: the isolated real app, the desktop and phone probes.
  - `Multi-node`: two paired built servers.
  - `Fresh-start build`: contract packages changed.
- Gaps addressed:
  - every status route on the wire;
  - a real model starting real background commands in the real app;
  - the peer summary route.

## Desktop Application Validation

- P2-10 ran on an isolated instance of this build: own data root and ports, the user's app untouched.
  - The header and the list row read "Background task running" with a steady blue dot, and Send is shown without Stop.
  - A turn reads "Running" with Stop. Two tasks read "2 background tasks running".
  - A reload keeps the count.
  - zh-CN shows the agreed wording. The view returns to Idle / 空闲 when the tasks end.
- The "Current count unavailable" note is the Background Tasks panel's (autobyteus-473) unconfirmed, collapsed state.
  - In zh-CN it shows "上次运行 1 · 已记录 4" collapsed and "1 个运行中 · 共 4 个" expanded.
  - Part 2 did not change it. It does not contradict the header, because the header reads the live count.
- Not raised:
  - An `initializing` flicker after each turn end. It exists on base too.
  - The "Send message" aria-label is English in zh-CN. It is outside this ticket.

## Persisted-Data Transition Checks

- Not Affected. The count is live only; nothing new is stored. Part 1's records were reproved on this build (P2-12).

## Compatibility / Legacy Scope Check

- None introduced or observed.
- The new field is required on the wire; both ends ship together. The peer case ran with both nodes on this build.

## Durable Coverage Changed In The Codebase

| Path | Change | Cases |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/background-task-status-count.e2e.test.ts` | new, gated `RUN_BACKGROUND_TASK_STATUS_E2E=1` (BTS-03 also the scripted AGY CLI; BTS-04/05 the live gates) | BTS-01..05 |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/peer-background-task-status.e2e.test.ts` | new, gated `RUN_PEER_BACKGROUND_STATUS_E2E=1` | PBS-01 |
| `autobyteus-server-ts/tests/e2e/agent/agent-command-correlated-status.e2e.test.ts` | four exact `AGENT_STATUS` payloads now carry `background_tasks_running: 0` (made untrue by this ticket) | P2-05 |
| `autobyteus-web/tests/e2e/interrupt-result-presentation-probe.mjs` | its agent-status fixture carries `background_tasks_running: 0` (the contract's shape) | P2-09 |

- Paths attached for proportional test-code review: Yes

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Model inference (BTS-01/02) | scripted LM Studio server | deterministic turns and timing | closed by BTS-04/05 and P2-10 |
| Antigravity CLI (BTS-03, PBS-01) | scripted AGY CLI (`BACKGROUND_STEP`, `CALL_TOOL`) | no provider | a real AGY daemon step not run |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Base worktrees `895cf3992d`, `4cbf9e7881` | Yes | `git worktree remove --force`, `prune` | removed |
| TEMP-DIAG in `team-run-config-graphql.e2e.test.ts` (stop timing) | Yes | restored from the saved copy | reverted (not in the diff) |
| P2-07a failed-member extension of BTS-02 and a temporary BTS-06 | Yes | removed; BTS-01/02 rerun on the final file Pass, tsc clean | reverted |
| Fresh clone and server image (P2-06) | Yes | removed | removed |
| Isolated instance `iso-56317-2d8b` | Yes | `isolated-app stop` | stopped, data root removed, ports released |
| Test servers, data roots, paired nodes | Yes | suite cleanup | none left |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven / user-only: none. Not run live:
  - the error member (proven at unit/component level, P2-07a);
  - the Org view's status access (unit level; its adapter and feed are proven live);
  - ACP (P2-13).
- Next recipient: code reviewer (proportional test-code review)
- Notes:
  - Follow-ups FU-008 (three changed probes fail identically on base) and FU-009 (E2E failures from base and load).
  - The reviewer's FU-006 and FU-007 are unchanged.
  - P2-02's watcher failures are environmental, with the cause recorded.
