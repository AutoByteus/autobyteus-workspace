# API/E2E Execution Coverage Report — restart-resume (autobyteus-285)

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-resume/tickets/in-progress/restart-resume/`.

**Safety:** every server and desktop instance ran on a temporary, run-owned data root, removed afterwards. The user's AutoByteus, its data and its node containers were not touched. Paid turns were spent only on the live AC-002 cases and the live queue-race samples (Claude haiku, Codex `gpt-6.1-terra`); the race sweep used scripted inference.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md` (§ Round 2 holds this round's plan and reuse decisions)
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 2; CRR-003 Pass on IR-002 (SR-005).
  - Code: `82932a8b48` plus the test fix `7d9a305627`.
  - Handoff: `c42b28d05e`.
  - Review: `8fd49bd25a`.
- Round 1 (API-REV-001, `Fail`, F-API-001) is kept below under its case IDs; rows rerun this round carry the `-r2` evidence suffix.
- Deviations from the plan, and why:
  - API-03-r2 ran twice. The first run read the copy through `getRunProjection`, which cannot read a delegated copy. The probe now uses the copy member projection; the second run's evidence replaces the first.
  - API-04C-r2 ran twice. The first run is kept as `API-04C-r2a`: its user message was sent 0 ms after the socket opened, before the server's session existed, and was never handled (a probe artifact; see Notes). The probe now waits for the server's `CONNECTED` frame, as round 1 did.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-resume/tickets/in-progress/restart-resume/evidence/`

## Routing Classification

- Task size `Large`; risk `High`; input route `Reviewed`; successful-output route `Code Review`.
- Proportional test-code review decision: requested.
  - API/E2E changed no durable repository test code. The only changes are the two temporary probes kept as evidence: `evidence/API-285-server-probe.mjs` and `evidence/API-285-desktop-probe.mjs`.
  - The review covers the probes' round-2 changes, since their verdict logic carries F-API-001's resolution.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform | Build | Settings |
| --- | --- | --- | --- | --- |
| ENV-1 (round 1) | `400e4d5b9c` (code `b50e2354ab`), clean detached checkout | macOS 26 arm64, Node 22.23.1 | server `prebuild` + `build`, stamp `1.5.11-beta.9` (X) | `node dist/app.js --port --data-dir <temp>`; data `.env` `APP_ENV=test` plus the scripted LM Studio host; real `HOME`/`USER`/`LOGNAME`; throwaway `CODEX_HOME`. X+1 = the same build with `dist/release-identity.json` set to `1.5.11-beta.9-rr285next` by the probe (restored after every run) |
| ENV-2 (round 1) | same | same | `build:electron:mac`; run-owned **copy** of `AutoByteus.app`; X+1 = the copy's `Resources/server/dist/release-identity.json` changed | `isolated-app start --app <copy> --data-root <temp>`; quit via `window.electronAPI.startShutdown()`; `CODEX_HOME` passed through |
| ENV-3 (round 2) | `8fd49bd25a` (code `82932a8b48` + `7d9a305627`), clean detached checkout in `rr285-api2.fcgHSg` | same | `pnpm install --frozen-lockfile --offline`; `pnpm -C autobyteus-server-ts build`; stamp `1.5.11-beta.9` | as ENV-1 |
| ENV-4 (round 2) | same | same | `build:electron:mac` (6 m 2 s); run-owned copy of the app | as ENV-2 |
| Runtimes | — | — | Codex CLI 0.166.0 (`gpt-6.1-terra`, effort medium); Claude Code (haiku); scripted native inference | — |

## Cases

### Round 2 (current)

| Case ID | Criteria | Boundary | Command / Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R2 | BEH-002..004 (unit), F-API-001/O-1 (unit), AC-006 | Repository | Reused IMP-07..IMP-10 | — | Pass | implementation-handoff Checks Run; `IMP-07-sr005-focused.log`, `IMP-08-*`, `IMP-09-*`, `IMP-10-*` | `Tests  167 passed (167)`; each IMP-08 mutation fails its test | Ran on `7d9a305627`, the reviewed code |
| API-00 | — | Builds | Clean checkout of `8fd49bd25a`; install; server and desktop builds | ENV-3/4 | Pass | `API-01-r2-desktop-stamp.log` | `install=0 server=0 desktop=0`; stamp `1.5.11-beta.9` | — |
| API-01 | N-2 | Packaging | Reused round 1 (`pnpm deploy`); desktop bundle stamp read again | ENV-4 | Pass | `API-01-n2-release-identity.log`, `API-01-r2-desktop-stamp.log` | bundle and server `"version": "1.5.11-beta.9"` | Stamp script, `build:full` and the Dockerfile are unchanged |
| API-03 | AC-004, AR-001, AR-005, AC-003 (idle), AC-005 (corrupt), D3.4 (delegated first) | Real server, scripted inference: P1 same stamp; P2 childless host, host with two copies (one Task-closed), idle run, early quit of X+1, normal X+1 start; P3 corrupt record | `env -i PATH HOME USER LOGNAME TMPDIR node evidence/API-285-server-probe.mjs scripted <clean>/autobyteus-server-ts evidence API-03-r2` | ENV-3 | Pass | `API-03-r2-result.json`, `API-03-r2-server-*.log` | P1 `1 recorded run(s) not resumed; the restart was not an update`, `notices 0`. P2: copy resumed first, then `3 resumed, 0 skipped, 0 failed`; childless host `notices 1, listsDelegated false`; host `notices 1` with `These runs you delegated were resumed too and are working: native_worker_…`; **copy `notices 1`**, entry `system_task_notification` `senderId system.restart_resume`; idle `0`; early quit kept `3` entries. P3 `record was invalid and was removed`, healthy | Round 1 could not show the copy's notice in memory (FU-004); it is now recorded |
| API-04 | AR-002, AC-003, F-API-001 | Real server; 3 live Claude entries first, then 3 scripted targets: message, Stop and archive at the X+1 start | `SLOW=3 … queue-race … API-04-r2` | ENV-3 | Pass | `API-04-r2-result.json`, `API-04-r2-server-X1.log` | t-message: `skipped … the run already had input`, `notices 0`, `modelSeq [user(n0,u1)]`. t-archive: `skipped …: its root is archived`, no model call. t-stop: `Agent run not found.` (Stop is not offered for an offline run), resumed | — |
| API-04B | same | 6 live Claude entries; act at +100 ms | `SLOW=6 ACT_DELAY_MS=100 … API-04B-r2` | ENV-3 | Pass | `API-04B-r2-*` | t-message: notice refused, first model call `user`. t-archive: `skipped …: its root is archived (after the restore)`, no model call. t-stop: `Agent run terminated successfully.` on the run the resumer had just restored, then `could not resume …: Agent root … is not accepting execution operations`, `notices 0` | Stop of an active run wins; the run is not resumed |
| API-04C | same | 12 live Claude entries; act at once | `SLOW=12 … API-04C-r2` | ENV-3 | Pass | `API-04C-r2-*`; first run `API-04C-r2a-*` | t-message: notice refused, `modelSeq [user(n0,u1)]`. t-archive: `skipped … archived (after the restore)`. `13 resumed, 2 skipped, 0 failed` | **r2a:** user message sent at 31.24, the same moment as `Agent websocket attached`; session created at 31.25; no handling logged; the notice ran and the probe flagged "user message lost". A send before the server's `CONNECTED` frame is not handled. That is not reachable for a user (the view is open well before anyone can type) and the code is not changed by this ticket. The probe now waits for `CONNECTED` |
| API-04E | AR-002, AC-003, F-API-001 (new sweep) | Real server, 14 scripted targets; message or archive staggered after the X+1 server is healthy; s1: 0–2.6 s; s2/s3: 0–0.675 s in 50 ms steps, actions swapped in s3 | `SLOW=0 RACE_SPEC='[{label,action,delayMs}…]' … queue-race … API-04E-s1/s2/s3` | ENV-3 | Pass | `API-04E-s1/s2/s3-result.json`, `-server-X1.log` | `summary.violations []` in each sample. 42 targets: message refused-not-first **7**, message notice-then-user **14**, archive succeeded → not resumed **10** (`could not resume …: not accepting execution operations` or skipped), archive refused `Run is active. Terminate it before archiving history.` → resumed **11**. Tight cases: s2 e7 message 13.23 → `skipped 13.23 … already had input`, `modelSeq [user(n0,u1)]`; s2 e13 resumed 13.53, message 13.53 → `[notice(n1,u0), user(n1,u1)]`; s2 e6 archive 13.18 → not resumed, no model call | The resume queue finished about 0.6–0.8 s after health, so the dense samples land inside it |
| API-02 | AC-002 (server), REQ-004, BEH-004 | Real server, stamp X: busy Codex standalone, Claude standalone, Codex Team member, Claude Org agent, Claude host plus a Codex delegated copy; SIGTERM; stamp X+1; start | `… live-update … API-02-r2` | ENV-3 | Pass | `API-02-r2-result.json`, `-run.log`, `-server-X.log`, `-server-X1.log` | `Recorded 6 busy run(s)` (`agent/host ×3, agent_team/member, agent_org/member, agent/delegated`); `6 resumed, 0 skipped, 0 failed`; **every run `notices 1` in its own projection** (sa-codex, sa-claude, team-codex, org-claude, host, copy); host `listsDelegated true`; every run continued (Codex checked the process; Claude acknowledged; copy `send_message_to` its host; host acknowledged the copy's report) | — |
| API-05T | O-1, CR-C2, FU-004, BEH-004 | Isolated desktop copy: busy Codex Team member and a Claude host with a busy Codex copy; user quit; X+1 in the copy; relaunch; then, as a user, open the member (Teams → run → coordinator), the host (workspace → Desk Host → run row) and the copy (the host's task row); reload; open all three again | `TEAM_ONLY=1 WITH_COPY=1 CASE_ID=API-05T-r2 node evidence/API-285-desktop-probe.mjs <app copy> evidence` | ENV-4 | Pass | `API-05T-r2-result.json`, `-run.log`, `-instance-*.log`, `API-05T-r2-X1-team-live.png`, `-team-after-reload.png`, `-host-live.png`, `-host-after-reload.png`, `-copy-live.png`, `-copy-after-reload.png` | `Recorded 3 busy run(s)`; copy first, then `3 resumed, 0 skipped, 0 failed`. `memberDomLive`, `memberDomReload`, `hostDom-*` and `copyDom-*` each have `segments 1, hits [{"inSystemSegment":true,…}]`. Screenshots: the coordinator, desk worker and host views each show the notice as a system notice, with no user avatar; only the host's has the list line | Round 1 O-1 resolved. "Opened later" is the realistic order: the resume runs about 1 s after start, before a window can show the run |
| API-06 | AC-006 | 284's gated stop-now E2E | `RUN_BUSY_STOP_NOW_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/shutdown/busy-run-stop-now.e2e.test.ts --no-watch` | ENV-3 | Pass | `API-06-r2-gated-e2e.log` | `Tests  2 passed (2)` | — |
| API-04D | AC-005 (crash during resume) | — | Reused round 1 | — | Pass | `API-04D-*` | `recordAfterCrash null`; next start `lines []` | Delete-before-first-post (`resumeAfterUpdate`) is unchanged |

### Round 1 (history; superseded where rerun above)

| Case ID | Result | Evidence Files | Summary |
| --- | --- | --- | --- |
| API-01 | Pass | `API-01-n2-release-identity.log` | Desktop bundle and the `pnpm deploy --legacy` package carry `1.5.11-beta.9`; the deployed reader returns it |
| API-02a / API-02 | Pass | `API-02a-*`, `API-02-*` | 6 recorded, 6 resumed; hosts 1 notice, host lists its copy; member and copy notices not in memory (FU-004) |
| API-03 | Pass | `API-03-*` | AC-004, AR-001, AR-005, corrupt record |
| API-04 / 04C | **Fail (F-API-001)** | `API-04-*`, `API-04C-*` | Archived during its restore, yet resumed (24.41 s → 24.69 s); a message 0.02–0.3 s before the post still got the notice turn first |
| API-04B | Observed | `API-04B-*` | Archive before the check skipped; message order notice → user |
| API-04D | Pass | `API-04D-*` | Crash during resume: nothing resumed twice |
| API-05a / API-05 | Pass | `API-05a-*`, `API-05-*` | Desktop AC-002, five roots |
| API-05T | Observed (O-1) | `API-05T-*` | Member notice never visible |
| API-05H | Pass | `API-05H-*` | Host notice rendered as a system notice |
| API-06 | Pass | `API-06-gated-e2e.log` | 2 passed |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-only part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-02-r2, API-05T-r2 (records list exactly the busy runs of every kind); idle not recorded (API-03-r2) | Proven | — |
| AC-002 | Yes | API-02-r2 (server, all five root kinds, live runtimes), API-05T-r2 (desktop quit and relaunch: member, host and copy); round 1 API-05 (desktop, five roots) | Proven | The real Squirrel install: the user's next real update with busy agents. Tried: the same build with only the stamp changed, through the real quit and relaunch paths on server and desktop. The installer step replaces the app outside an isolated profile, onto the user's data, so it can't run here |
| AC-003 | Yes | API-04-r2, API-04B-r2, API-04C-r2 (live), API-04E (42 timed targets):<br>- **archived:** an archive that succeeds leaves no resume, notice or turn; an archive during the restore is skipped after the restore or refused at the root; once active, archive is refused;<br>- **messaged:** the user's input admitted first refuses the notice; otherwise the notice comes first and the user's message follows;<br>- **stopped:** Stop of the active restored run wins (API-04B-r2);<br>- **idle:** not resumed (API-03-r2);<br>- **Task-closed copy:** stopped at Task closure and never recorded (API-03) | Proven | — |
| AC-004 | Yes | API-03-r2 P1 | Proven | — |
| AC-005 | Yes | API-03-r2 P3 (corrupt), API-04D (crash during resume, reused), IMP tests | Proven | — |
| AC-006 | Yes | API-06-r2, IMP-10 | Proven | — |

## Findings

**F-API-001 (round 1): resolved.** SR-005 restore → re-check → first-input-only post was rechecked under the same live races (API-04/04B/04C-r2) and a 42-target timed sweep (API-04E). Every target met the verdicts:
- an archived run got no notice and no model call;
- a user's message admitted first refused the notice ("skipped … the run already had input"; the model's first call was the user's message, with no notice in history);
- a notice admitted first was followed by the user's message (model order notice → user);
- no run got more than one notice;
- no user message was lost (apart from the r2a probe artifact).

**O-1 (round 1): resolved.**
- A resumed member's and a delegated copy's notice is now in their own memory: API-03-r2 copy, API-02-r2 member, Org agent and copy.
- In the window it shows once as a system notice when opened later and after a reload (API-05T-r2).

**Observations (not failures):**
- **O-2:** when the user archives a run while it is being restored, the resumer logs "could not resume …: Agent root '…' is not accepting execution operations" and counts it under `failed` in the summary line, not under `skipped`. Nothing is posted, so behavior is correct; only the log category differs (API-04E s2/s3, API-04B-r2 t-stop). This matches the design's N-11 note ("the later post is refused").
- **API-04C-r2a probe artifact:** a `SEND_MESSAGE` frame sent the instant a socket opens, before the server's `CONNECTED`, is not handled. No user can send that early, and this ticket does not change the WebSocket session code.

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual | Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 75% | 96% | Every critical AC proven directly on a real server, and AC-002/O-1 on the packaged desktop | AR-003 refused-copy path unit-only (unreachable live) | — |
| Changed-boundary directness | 80% | 96% | Real restores, re-checks and first-input admission on real `AgentRun`s for every root kind; races driven through the user's real WebSocket send and archive mutation | — | — |
| Integration realism | 70% | 95% | Live Codex/Claude standalone, Team, Org and delegated copy; packaged desktop window | — | — |
| Environment / fixture fidelity | 80% | 95% | Clean checkout, isolated data, stamp-only difference (design method); the desktop cases ran the packaged production build and agree with the server cases | Server probes `APP_ENV=test`. The real installer step is user-only and scored out, per the gate's user-only rule; Docker is listed under Not Tested | — |
| Failure / edge / lifecycle | 75% | 95% | 42-target race sweep plus 3 live race samples hitting every window; Stop, archive and message races; early quit; corrupt record; crash during resume | — | — |
| Desktop / user surface | 60% | 95% | Member, host and copy notices rendered as system notices live-on-open and after reload; screenshots | — | — |
| Durable regression quality | 92% | 94% | IMP-07/08 cover, with mutations: the admission rule on a real `AgentRun`, including "decides concurrent inputs in the run's dispatch queue: whichever is admitted first wins"; the re-check after the restore; refusal counted as skipped; the pass-through and the member handle. Also 284's gated E2E | Not durable: that a user's post and the notice reach the same `AgentRun` instance through the root manager. It is proven live 45 times (API-04E, API-04/B/C-r2); a repository test would need a real root manager with a timed backend | Optional follow-up if the team wants that invariant in the repository |

- Overall post-repository: 76%; final: 95.1% (simple average of 96, 96, 95, 95, 95, 95, 94).
- Every critical AC directly proven: `Yes`.
- No category is below 90%. Only durable regression quality (94%) is below 95%, with its bounded residual named in its row.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed). Modes:
  - `Live API`: real server processes across two stamps;
  - `Project Desktop Validation`: isolated packaged app across two stamps;
  - `Lifecycle`.
- Gap addressed: unit tests use mocked roots and timing, while F-API-001 lived in real restore timing. The sweep confirms the admission rule holds for real concurrent input.

## Desktop Application Validation (When Applicable)

- Run-owned copy of the clean packaged build; the stamp was edited only in the copy; user quit via `startShutdown`.
- The window was driven as a user drives it:
  - Teams → Team run → coordinator;
  - workspace → Desk Host → run row → the desk worker task row.
- DOM assertions on `system-task-notification-segment`, plus screenshots.
- Effect on the user's running app: `None`.

## Persisted-Data Transition Checks (When Applicable)

- New transient file only (unchanged since round 1): written at quit with busy entries; consumed at the next start; survives an early quit; a corrupt file is removed.
- Restart-resume notices are now persisted in each run's memory as `system_task_notification`. That is the intended SR-005 behavior; no existing data changed.

## Compatibility / Legacy Scope Check

- None introduced or observed. IR-001's member presentation mapping was removed (the adapter is back to base).

## Durable Coverage Changed In The Codebase

- `No`. The temporary probes in `evidence/` gained:
  - `RACE_SPEC` and per-target verdicts;
  - the model call log;
  - the copy member projection in P2;
  - a `CONNECTED` wait;
  - `WITH_COPY` and `CASE_ID` for the desktop journey.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| A real update | Same build, stamp changed (design method) | A real Squirrel install is unsafe in an isolated instance; Docker in-place needs a signed feed | The installer step itself is not exercised |
| Native LLM | Scripted LM Studio SSE that logs each call's run label and kind | Deterministic, free, and shows the order in which inputs reached the model | — |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Clean checkout, app copy, temp data roots (`rr285-*`), run root `rr285-api2.fcgHSg` | Yes | `git worktree remove --force`, `rm -rf` | Removed; no `rr285-*` left in `TMPDIR` |
| Servers, isolated instances, runtime CLIs, marker commands | Yes | SIGTERM/quit under test; fallback kill of markers; `isolated-app stop` | `isolated-app list` none; no `RR285*` process |
| Stamp edits | Yes | Restored by the probe (`stampRestored true`); checkout removed | Restored |
| Probes | Yes | Kept as evidence | Kept |

## Not Tested / Residual Risks

- **Docker in-place update (autobyteus-305 starter):** not run. It needs a signed release feed, and the released image differs from this branch beyond the changed files, which TESTING requires before mounting `dist`. N-2 proves the deployed package carries the stamp; detection is the same server code.
- **Real Squirrel install:** user-only (see AC-002).
- **AR-003 refused copy:** unreachable live (closing the Task stops the copy before the quit); covered by unit tests.
- **O-2:** an archive during the restore is logged as "could not resume", not "skipped". This is cosmetic.
- Accepted residuals as reviewed: N-9, N-11, FU-001..FU-003, cost (DEC-001). FU-004 is resolved by SR-005.

## Latest Authoritative Result

- Result: `Pass`
- Final confidence: 95.1%. Every critical AC is directly proven, and no category is below 90%. Durable regression quality is 94% (the same-instance invariant is proven live, not in the repository).
- Broader validation: `Required`, executed (live server, packaged desktop, lifecycle).
- Next recipient: code reviewer (proportional test-code review; no durable test code changed).
