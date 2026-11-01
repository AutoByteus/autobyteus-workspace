# API/E2E Execution Coverage Report — restart-resume (autobyteus-285)

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-resume/tickets/in-progress/restart-resume/`.

**Safety:** every server and desktop instance ran on a temporary, run-owned data root, removed afterwards. The user's AutoByteus, its data and its node containers were not touched. Paid turns were spent only on live AC-002 cases and the queue-race samples (Claude haiku, Codex `gpt-6.1-terra`).

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; CRR-001 Pass (code `ab4ba6e7dc`, `b4d770d364`, `b50e2354ab`; handoff `15a978e22f`; review `400e4d5b9c`).
- Deviations from the plan, and why:
  - API-02 ran twice. API-02a is the first run, with host projections only; API-02 repeats it with member and copy projections, and with the host's delegation and its own command split into two messages after one live-model attempt left the host idle.
  - API-04 ran as four samples:
    - API-04: first race;
    - API-04B: 6 slow entries;
    - API-04C: 12 slow entries;
    - API-04D: crash during resume.
  - API-05 ran as four journeys:
    - API-05a: first run; its window step failed to open the run;
    - API-05: full five-root journey with member projections;
    - API-05T: Team-only, for the member display check;
    - API-05H: host-only, for the host display check.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-resume/tickets/in-progress/restart-resume/evidence/`

## Routing Classification

- Task size `Large`; risk `High`; input route `Reviewed`; successful-output route `Code Review`.
- Proportional test-code review decision: `Not Applicable` this round (result `Fail`; failure-origin review requested). No durable test code changed by API/E2E.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform | Build | Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | `400e4d5b9c` (code `b50e2354ab`), clean detached checkout | macOS 26 arm64, Node 22.23.1 | server `prebuild` + `build`, stamp `1.5.11-beta.9` (X) | `node dist/app.js --port --data-dir <temp>`, data `.env` `APP_ENV=test` + scripted LM Studio host; real `HOME`/`USER`/`LOGNAME`; throwaway `CODEX_HOME`. X+1 = the same build with `dist/release-identity.json` set to `1.5.11-beta.9-rr285next` by the probe (restored after every run) |
| ENV-2 | same | same | `build:electron:mac` (8 m 14 s); run-owned **copy** of `AutoByteus.app`; X+1 = the copy's `Resources/server/dist/release-identity.json` changed | `isolated-app start --app <copy> --data-root <temp>`; quit via `window.electronAPI.startShutdown()`; `CODEX_HOME` passed through |
| Runtimes | — | — | Codex CLI 0.166.0 (`gpt-6.1-terra`, effort medium); Claude Code (haiku); scripted native inference | — |

## Cases

| Case ID | Criteria | Boundary | Command / Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R1 | AC-001, AC-003..AC-005 (unit), AC-006 | Repository | Reused IMP-01..IMP-06 | — | Pass | implementation-handoff Checks Run | per IMP row | No code change since `b50e2354ab` |
| API-00 | — | Builds | clean checkout; server + desktop | ENV-1/2 | Pass | (progress log) | stamp `1.5.11-beta.9` | — |
| API-01 | N-2 | Packaging | desktop bundle file; `pnpm --filter autobyteus-server-ts deploy <tmp> --legacy` (Dockerfile command); the deployed package's reader | ENV-1/2 | Pass | `API-01-n2-release-identity.log` | bundle `"version": "1.5.11-beta.9"`; deployed `dist/release-identity.json` present, `readReleaseIdentity() -> "1.5.11-beta.9"` | — |
| API-02a / API-02 | AC-002 (server), REQ-004, BEH-004 | Real server. Stamp X: busy Codex standalone, Claude standalone, Codex Team member, Claude Org agent, Claude host + Codex delegated copy; SIGTERM; record; stamp X+1; start | `env -i PATH HOME USER LOGNAME TMPDIR node evidence/API-285-server-probe.mjs live-update <clean>/autobyteus-server-ts evidence API-02` | ENV-1 | Pass | `API-02a-*`, `API-02-result.json`, `-run.log`, `-server-X.log`, `-server-X1.log` | `Recorded 6 busy run(s) for restart resume`; record entries `agent/host ×3, agent_team/member, agent_org/member, agent/delegated`, all `1.5.11-beta.9`; `Restart resume after the update to 1.5.11-beta.9-rr285next: 6 resumed, 0 skipped, 0 failed` (copy before its host); record consumed. Hosts `notices 1`; delegating host `lists true`. Every run continued; last conversation entries after restart: Codex "checked … then reran the command"; Claude `system_task_notification` + reply; Team member "The command was interrupted and is no longer running"; Org member "The application has restarted and my previous tool call was interrupted"; copy `send_message_to` its host | Members' and copy's notices are not in their memory (FU-004), but their replies show they received it |
| API-03 | AC-004, AR-001, AR-005, AC-003 (idle), AC-005 (corrupt) | Real server, scripted native inference: P1 same stamp; P2 host without children, host with two delegated copies (one Task-closed), idle run, early quit of X+1, normal X+1 start; P3 corrupt record | `… scripted … API-03` | ENV-1 | Pass (AR-003 refused copy not reachable live) | `API-03-result.json`, `-run.log`, `API-03-server-*.log` | P1: `Restart resume: 1 recorded run(s) not resumed; the restart was not an update`, record removed, `notices 0`. P2: copy B not busy at quit after its Task closed (`copyB:false`), so not recorded; X+1 early quit `exit code 0`, record still `3` entries; then `3 resumed, 0 skipped, 0 failed` (delegated first); childless host `notices 1, listsDelegated false`; host `notices 1`, notice ends `These runs you delegated were resumed too and are working: native_worker_… (native_worker_…)`; idle `notices 0`; model-side notice inputs `3` (two plain, one with the list). P3: `the busy-run record was invalid and was removed`, server healthy | The refused-copy path (AR-003) is covered by the unit layer only |
| API-04 | AR-002, AC-003 (messaged / Stopped / archived while queued) | Real server; 3 live Claude entries first, then 3 scripted native targets; act at start | `… queue-race … API-04` | ENV-1 | **Fail (F-API-001)** | `API-04-result.json`, `-run.log`, `API-04-server-X1.log` | `6 resumed, 0 skipped`; t-archive archived (`success: true`, done ≈ 24.41 s) yet `Restart resume resumed host run '…067447d2…'` at 24.69 s and `notices 1`; t-message user message sent ≈ 23.95 s, resume post 24.47 s, has notice and user message; t-stop: `terminateAgentRun` → `"Agent run not found."` (Stop is not offered for an offline run) | — |
| API-04B | same | 6 slow entries; act at +100 ms | `SLOW=6 ACT_DELAY_MS=100 … queue-race … API-04B` | ENV-1 | Observed | `API-04B-*` | `archiveDoneAtLogSec 37.55` → `skipped host run '…': its root is archived` (37.72); t-message: message 37.60, resume 37.80, conversation `system_task_notification` → assistant → user message → assistant | Archive before the check: skipped correctly |
| API-04C | same | 12 slow entries; act at once | `SLOW=12 … API-04C` | ENV-1 | **Fail (F-API-001)** | `API-04C-*` | archive 32.97 → `skipped …: its root is archived`; t-message: message sent 33.10, `resumed host run '…d2b233f5…'` 33.40, `notices 1`, `userMsg true` | A message sent 0.3 s before the post still gets the notice turn first |
| API-04D | AC-005 (crash during resume) | 3 Claude + 2 native busy; X+1 start; SIGKILL on the first `Restart resume resumed`; start again | `… crash-resume … API-04D` | ENV-1 | Pass | `API-04D-*` | `killed true`, `recordAfterCrash null`; next start `lines []`; notices all `0` | Nothing resumed twice; the rest stays stopped (REQ-005) |
| API-05a / API-05 | AC-002 (real app) | Isolated desktop copy, stamp X: the five roots busy; user quit; X+1 in the copy; relaunch on the same data root | `cd <clean> && node evidence/API-285-desktop-probe.mjs <app copy> evidence` | ENV-2 | Pass | `API-05a-*`, `API-05-result.json`, `-run.log`, `API-05-instance-*.log`, `API-05-X-busy.png` | `Recorded 6 busy run(s) for restart resume` (quit, Electron gone 1.5 s); `Restart resume after the update to 1.5.11-beta.9-rr285next: 6 resumed, 0 skipped, 0 failed`; hosts `notices 1`, host `lists true`; members and copy continued (`The command was interrupted and is no longer running…`, `Understood. The application restarted and my previous command was interrupted…`, copy `send_message_to` its host) | — |
| API-05T | CR-C2, FU-004 (member display) | Team-only desktop journey; open the Team run in the window (as a user, through the history panel); reload | `TEAM_ONLY=1 … API-05T` | ENV-2 | Observed | `API-05T-result.json`, `API-05T-X1-team-live.png`, `API-05T-X1-team-after-reload.png` | `1 resumed`; member view shows the interrupted `run_bash`, then the resumed turn (`ps aux | grep …`, "The interrupted command is no longer running…"); `segments 0, hits []` when opened and after reload | The notice is never shown as a user message. Also never shown at all: the resume posts it within about 1 s of the start, before any window can be viewing the member, and it is not in member history (FU-004) |
| API-05H | BEH-004 (host display) | Host-only desktop journey; open the resumed standalone run; reload | `HOST_ONLY=1 … API-05H` | ENV-2 | Pass | `API-05H-result.json`, `API-05H-X1-team-live.png`, `API-05H-X1-team-after-reload.png` | `segments 1`, `hits [{"inSystemSegment":true,"text":"The application restarted at … after an update to 1.5.11-beta.9-rr285next."}]`, opened and after reload | The host's notice renders as a system notice |
| API-06 | AC-006 | 284's gated stop-now E2E | `RUN_BUSY_STOP_NOW_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/shutdown/busy-run-stop-now.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-06-gated-e2e.log` | `Tests  2 passed (2)`; SIGTERM exit 0 in 766 ms; `Recorded 1 busy run(s) for restart resume` | — |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-only part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-02, API-05 (records list exactly the busy runs of every kind; idle not recorded, API-03), IMP-01/03 | Proven | — |
| AC-002 | Yes | API-02 (server), API-05 (desktop): every kind continued, hosts one notice, copy listed | Proven (Docker in-place update not run: infeasible, see Not Tested) | The real Squirrel install: the user's next real update with busy agents |
| AC-003 | Yes | Idle (API-03), archived before its check (API-04B/C) proven; Task-closed copy: Task closure stops the copy, so it is never recorded (API-03); stopped-on-purpose: Stop is not available for an offline run, and terminating it returns "not found" (API-04) | **Not proven.** A run messaged by the user just after start (API-04/04B/04C), and a run archived during its restore (API-04), were still notified and resumed (F-API-001) | — |
| AC-004 | Yes | API-03 P1 | Proven | — |
| AC-005 | Yes | API-03 P3 (corrupt), API-04D (crash during resume), IMP-01/02 | Proven | — |
| AC-006 | Yes | API-06, IMP-03/06 | Proven | — |

## Findings

**F-API-001: the eligibility check misses user actions that land during the resume of a run.**
Preliminary classification: `Design Impact` (with a `Local Fix` part). Failure-origin review requested.

- **Trigger (real use, AR-002 / AC-003):** after an update restart, the user immediately messages a busy run, or archives one, while the resumer is working through the queue (≤ 3 posts at a time).
- **Mechanism (`Read`, `restart-resumer.ts` `resumeOne`):** `ineligibility()` (live run, root row state) runs **before** `postToHost`/`postToMember`. Those then restore the root (hundreds of ms here; longer for heavier roots) and post. Two gaps follow:
  - **(a) Check before restore.** An archive (or delete) that lands during the target's restore is not seen.
  - **(b) Activation in progress is not "live".** A user's message restores and activates the run first. During that time (about 0.3–0.5 s here) `getActiveRun` returns nothing, so the resumer posts too.
- **Observed:**
  - **(a)** API-04: t-archive archived (archive returned ≈ 24.41 s) after its check, then `resumed` at 24.69 s. An archived run took a resumed, paid turn, against BEH-003 ("archived … never resumed").
  - **(b)** API-04, API-04B, API-04C: a user message sent 0.02–0.3 s before the target's post. The run got the notice turn first, then the user's message as a second turn (conversation order in API-04B: `system_task_notification` → assistant → user message → assistant).
- **Holds when not racing:** an archive that completes before the target's check is skipped (API-04B, API-04C: `skipped …: its root is archived`).
- **Why it matters:** the design names "a resume … while also messaged" an escalation trigger, and AR-002 requires "a run the user messages, Stops or archives while it waits in the queue: not resumed". After an automatic update, a user checking an agent within seconds of the restart is ordinary behavior.
- **Possible directions (owner's choice):**
  - check eligibility after the restore, immediately before the post (for the host, split restore and post, or add a pre-post check to the root manager's `postUserMessage`);
  - treat a run whose activation is in progress as live, or post the notice through the run's input admission so a concurrent user input wins;
  - or accept (b) as a residual (a requirement decision).
- **Reproduce:** `env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" SLOW=<n> node evidence/API-285-server-probe.mjs queue-race <built server> <out dir> <id>`, then read `after.t-message`, `after.t-archive` and the `Restart resume` lines against `acted.*AtLogSec`.

**Observation O-1 (CR-C2, FU-004; recorded as asked, not a failure):**
- A resumed member's notice is never shown as a user message. In the realistic flow it is also never shown as a system notice: the resume runs within about a second of the start, before any window can be viewing that member, and member history does not keep it (FU-004).
- The user sees the member continue with no visible reason (API-05T screenshots).
- The host's notice is shown correctly (API-05H).

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual | Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 65% | 85% | AC-001, AC-002, AC-004..AC-006 proven | AC-003 fails under realistic timing (F-API-001); AR-003 live path unreachable | Resolve F-API-001 |
| Changed-boundary directness | 70% | 95% | Real SIGTERM/quit recording, real two-stamp restarts, real restores and posts for every root kind, real window | — | — |
| Integration realism | 65% | 95% | Live Codex/Claude standalone, Team, Org, delegated copy; packaged desktop | — | — |
| Environment / fixture fidelity | 80% | 92% | Clean checkout, isolated data, stamp-only difference per the design | Server probes `APP_ENV=test`; Squirrel and Docker paths emulated by quit + start | — |
| Failure / edge / lifecycle | 70% | 82% | AR-005 early quit, corrupt record, crash during resume, same-stamp restart, queue races | F-API-001 | — |
| Desktop / user surface | 50% | 90% | Desktop quit and resume; host notice rendering; member view | Member notice invisible (O-1, FU-004) | — |
| Durable regression quality | 90% | 90% | IMP-01..06 with mutations; 284 gated E2E | Live behaviors stay probes | — |

- Overall post-repository: 70%; final: 89.9% (simple average).
- Every critical AC directly proven: `No` (AC-003).
- Categories below 90%: requirement proof 85%, failure/edge 82%.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed). Modes:
  - `Live API`: real server processes across two stamps;
  - `Project Desktop Validation`: isolated packaged app across two stamps;
  - `Lifecycle`.
- Gap addressed: the unit layer mocks roots, managers and timing. Real restores take hundreds of ms, which is where F-API-001 lives.

## Desktop Application Validation (When Applicable)

- Run-owned copy of the clean packaged build; stamp edited only in the copy; user quit via `startShutdown`.
- The window was driven as a user would: Workspaces → `workspace` → definition or Team → run row. DOM assertions on `system-task-notification-segment`.
- Effect on the user's running app: `None`.

## Persisted-Data Transition Checks (When Applicable)

- New transient file only.
- Observed: written at quit only with busy entries; consumed (deleted) at the next start, both for an update and for a non-update restart; survives an early quit (AR-005); a corrupt file is removed.
- No existing data changed.

## Compatibility / Legacy Scope Check

- None introduced or observed.

## Durable Coverage Changed In The Codebase

- `No`.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| A real update | Same build, stamp changed (design method) | A real Squirrel install is unsafe in an isolated instance; Docker in-place needs a signed feed | The installer step itself is not exercised |
| Native LLM | Scripted LM Studio SSE | Deterministic structures, free | — |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Clean checkout, deploy output, app copy, temp data roots (`rr285-*`) | Yes | `git worktree remove`, `rm -rf` | Removed |
| Servers, isolated instances, runtime CLIs, marker commands | Yes | SIGTERM/quit under test; fallback kill of recorded PIDs and markers; `isolated-app stop` after exit | `isolated-app list` none; no `RR285*` process |
| Stamp edits in `dist/release-identity.json` | Yes | Restored by the probe after every run (`stampRestored`); checkout removed | Restored |
| Probes `evidence/API-285-server-probe.mjs`, `API-285-desktop-probe.mjs` | Yes | Kept as evidence | Kept |

## Not Tested / Residual Risks

- **Docker in-place update (autobyteus-305 starter):** not run. It needs a signed release feed, and TESTING allows mounting this branch's `dist` into an image only when they differ in the changed files alone. N-2 proves the deployed package carries the stamp, and the detection is the same server code.
- **Real Squirrel install:** user-only, as with 284 and 339.
- **AR-003 refused copy:** live, closing a copy's Task stops it, so it is never recorded. Unit coverage only.
- **O-1 / FU-004:** member notices are invisible.
- Accepted residuals as reviewed: N-9, FU-001..FU-004, cost (DEC-001).

## Preliminary Classification (On `Fail`)

- F-API-001: `Design Impact` with a `Local Fix` part.
  - (a), the check before the restore, contradicts the design's "immediately before posting" and is a local placement fix.
  - (b), an activation in progress not counting as live, is a limit of the live-run guard the design chose; a fix needs a design choice, or a requirement decision to accept it.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: AC-003 (F-API-001).
- Preliminary classification and recommended owner: F-API-001 → failure-origin review.
- Next recipient: code reviewer.
- Notes: recording, update detection, waves, notices, once-only consumption, robustness and the packaging stamp all behave as designed, on real servers and the real desktop.
