# API/E2E Execution Coverage Report — automatic-app-node-updates (autobyteus-356)

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates/tickets/in-progress/automatic-app-node-updates/`.

**Safety:** only run-owned isolated desktop copies with their own bundle id, run-owned data roots, a local feed and (round 1) test-owned Docker containers were used. The user's installed app, `~/.autobyteus`, its updater caches (identical before and after in both rounds: `API-00-r2-user-caches-before.log`, `API-99-r2-cleanup.log`) and the user's nodes `autobyteus-server-0/1/2` were not touched. Paid turns: one haiku run per busy-agent case.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md` (§ Round 2 holds this round's plan)
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 2; CRR-003 Pass on IR-002.
  - Code: `aa096836d9`, `6a94169f4f`.
  - Handoff: `11b6d02c46`.
  - Review: `f1c4641b08`, built from a clean checkout of it.
- Deviations from the plan, and why:
  - API-05 ran as 9 samples, because every sample landed before the preparation and the relaunch branch needed a real trigger. API-05C (a broken package) provides it.
  - API-05B (read-only volume with a busy run) was **not run**. It was planned to test a long wait during the stop, but the refusal arrives before any stop (9 of 9), so a busy run is never stopped on that path.
  - API-02C and API-02D were added after API-02B measured how long Squirrel works.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates/tickets/in-progress/automatic-app-node-updates/evidence/`

## Corrections To Round 1

| Round 1 said | Actual | Evidence |
| --- | --- | --- |
| "/ requested" at 20:58:29.685 was `quitAndInstall` | It is Squirrel fetching the update: `MacUpdater.js` runs `dispatchUpdateDownloaded`, then `nativeUpdater.checkForUpdates()` | Read (reviewer's correction, confirmed) |
| The stop resolved before the server exited | `stopServer` awaits the exit (`stopManagedBackend`); the exit was logged at 29.868 | Read (reviewer's correction, confirmed) |
| O-1: the ~35 s before the quit was "the stop of a busy run" | It is Squirrel's own work (fetch through the proxy, unpack, verify). An idle app takes the same ~36 s, and its server is gone within 1 s | API-02B |

**Where this differs from CRR-003:** the review concludes that the round-1 refusal arrived during the preparation. The measurements point to **before** it:
- In API-02B the server exit came 138 ms after "/ requested": the 100 ms start delay plus about 40 ms to stop.
- In round 1 the exit came 183 ms after "/ requested", so the stop began about 100 ms after it, later than the refusal at +2 ms. The old code did not cancel its timer, so the stop ran after recovery had already decided. That also fits what round 1 saw.
- All 9 read-only samples on the new code land in the "before" branch.

This is an inference from timings; no line logs when the preparation starts.

## Routing Classification

- Task size `Medium`; risk `High`; input route `Reviewed`; successful-output route `Code Review`.
- Test-code review decision: `Not Applicable` this round (result `Fail`; failure-origin review requested). No durable test code changed.

## Tested Builds And Environments

| Env ID | What | Settings |
| --- | --- | --- |
| ENV-R2-1 | Clean checkout of `f1c4641b08`; `pnpm install --frozen-lockfile --offline`; V1 = `build:electron:mac` (1.5.11-beta.10); V2 = the same code with version 1.5.11-beta.11, rebuilt (stamp follows) | macOS 26 arm64, 10 cores, 64 GB; electron-updater 6.8.9 MacUpdater + Squirrel.Mac |
| ENV-R2-2 | Test copies (`evidence/API-356-prepare-copy.sh`), as round 1: own bundle id, updater cache name, `LSEnvironment`, ad hoc signature with an explicit requirement (`API-00-r2-copies.log`) | `isolated-app start … --test-update-feed http://127.0.0.1:47911`; CDP via `evidence/API-356-drive.mjs` and `evidence/API-356-page-*.js` |
| ENV-R2-3 | Local feed (`evidence/API-356-feed.mjs`). A second zip for API-05C: V2 re-signed so that it fails V1's requirement (valid sha512) | 127.0.0.1:47911 |
| ENV-R2-4 | Machine load: other work was already running on this machine. `uptime` 45 s after the API-02D build started: 1/5/15-min 40.97 / 57.88 / 60.45; it rose past 150 during that case. Not measured for the other cases, so the ~36 s may not be a quiet-machine figure | — |
| Round 1 | ENV-1..5 in git history at `f6a511e25f`: clean `e8b51df9ad`, test nodes on the published 1.5.11-beta.7 image with a throwaway key, local release source, logging proxies | — |

## Cases

### Round 2 (current)

| Case ID | Criteria | Boundary | Command / Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R2 | F-API-001, F-API-002 (unit) | Repository | Reused IMP-09, IMP-10 and the IR-002 reruns | — | Pass | implementation-handoff Checks Run | each IMP-09 mutation fails | Ran on the reviewed code |
| API-00 | — | Builds, copies | As ENV-R2-1..3 | ENV-R2 | Pass | `API-00-r2-copies.log`, `API-00-r2-user-caches-before.log` | `V2 copy satisfies V1 copy's DR` | — |
| API-01 | AC-001 (app part) | Desktop + feed | Fresh profile, feed `good`, 70 s after start | ENV-R2 | Pass | `API-01-r2-app-switch-off.log`, `API-01-r2-switch-off.png` | `aria false`, `status available`, Download offered, `zip requests: 0`, no automatic file | Node part reused from round 1 |
| API-02 | AC-002, F-API-001, CR-C2 | Real MacUpdater → Squirrel → ShipIt → relaunch, through `AppUpdateInstallAttempt` | Feed `none`, Check; switch on by a click; busy agent; feed `good`, Check; then V2 restarted with `isolated-app` on the same data root, unedited | ENV-R2 | Pass | `API-02-r2-watch.log`, `API-02-r2-v1-instance.log`, `API-02-r2-v2-relaunched-app.log`, `API-02-r2-v2-relaunch-isolation.log`, `API-02-r2-sidebar.log`, `API-02-r2-sidebar-before.png`, `-panel-open.png`, `-after-close.png` | Bundle → 1.5.11-beta.11 05:12:01; relaunched pid 67329 with e2e env, `~/.autobyteus: 0`; `outcome AUTO_UPDATED, read false`. Sidebar: **`1 updated`**, name `1 update applied automatically: 1 updated automatically`, same while the panel is open, gone after close. `CR-C2 lines: 0` | **F-API-001 resolved** on a real restart, no record edit. The name's detail part repeats itself ("1 updated automatically"); that is the existing format |
| API-02B | AC-002 (idle) | Same, no busy run | Same steps, fresh profile | ENV-R2 | Pass | `API-02B-watch.log`, `API-02B-v1-instance.log` | `has been downloaded` 05:14:53.15; `Server process exited` 54.08; `Download completed` 55.03; proxy closed (quit) 05:15:30.7; record `AUTO_UPDATED`; `~/.autobyteus: 0` | **Squirrel takes ~36 s**, leaving ~23 s of the 60 s quit bound |
| API-02C | AC-002 under a throttle; design path (c) | Same; `taskpolicy -b` on V1 once `installing` | First attempt throttled before the click and starved CDP, so nothing ran (harness fault); redone in this order | ENV-R2 | Observed | `API-02C-v1-instance.log`, `API-02C-watch.log`, `API-02C-throttled-summary.log` | `The app did not quit to install the update within 60 seconds.`; `relaunching this version`; record `install` failure; bundle unchanged | Much stronger than a real slower Mac, so it only shows the path; API-02D is the real-use evidence. First live run of path (c) |
| API-02D | AC-002 on a busy machine | Same, normal priority, while a full `build:electron:mac` runs | Idle app; build started 45 s before the Check | ENV-R2 | **Fail (F-API-003)** | `API-02D-v1-instance.log`, `API-02D-watch.log`, `API-02D-state-after.log`, `API-02D-failure-row.png` | `Server process exited` 05:50:06.474; **05:51:06.477 `did not quit … within 60 seconds`**; `relaunching this version`; record `automaticFailure {install}`; row "Automatic update failed. Nothing was changed."; bundle still 1.5.11-beta.10, also after quitting | Load average 43 → 153 |
| API-03 | AC-003 | API-02's journey | `API-356-busy-agent.mjs` | ENV-R2 | Pass | `API-03-r2-busy-run-after.json`, `API-02-r2-v1-instance.log`, `API-02-r2-v2-relaunched-app.log` | `Recorded 1 busy run(s)`; `1 resumed, 0 skipped, 0 failed`; `notices 1`; Claude continued | — |
| API-04 | AC-005 (download) | Desktop + feed | Fresh copy, feed `badsha`, switch on, then Check | ENV-R2 | Pass | `API-04-r2-download-failure-retry.log`, `API-04-r2-instance.log`, `API-04-r2-failed-settings.png`, `API-04-r2-failure-row.png` | `status error, errorOperation download`, `automaticFailure {download}`; row with the reason; zip GET again at 05:17:46 | The changed rejection handler still records a plain download failure |
| API-05 | AC-005 (native refusal, no repeat), F-API-002 | V1 on a read-only image, real Squirrel | 9 samples on fresh profiles (`evidence/API-356-ro-samples.sh`); then a restart on a failed profile | ENV-R2 | Pass | `API-05-r2-samples.log`, `API-05-r2-s1-state.log`, `API-05-r2-s1-instance.log`, `API-05-r2-sample-*-instance.log`, `API-05-r2-watch.log`, `API-05-r2-s1-failure-row.png`, `API-05-r2-restart-no-repeat.log`, `API-05-r2-restart-no-repeat.png`, `API-05-r2-all-feed.jsonl` | `branch=before` 9 of 9; `Auto-update failed. (kind=install…)` once each; `Download ended by the install failure`; **no `Server process exited`, `recoveryLines=0`, old process alive, health 200**. State: `errorOperation install`, message "The update was downloaded, but AutoByteus could not restart to install it. Try again."; failure row. After a restart: yml GET and **no zip GET** | **Better than the review expected:** the refusal cancels the install inside the 100 ms delay, so nothing stops and no relaunch is needed. No ShipIt process (`quitAndInstall` is not logged, so its absence is shown indirectly) |
| API-05C | AC-005 (broken package), F-API-002 recovery | Fresh V1 copy, real Squirrel | The feed's zip has a valid sha512 but a signature that fails V1's requirement; switch on | ENV-R2 | Pass | `API-05C-instance.log`, `API-05C-relaunched-app.log`, `API-05C-watch.log`, `API-05C-state-after-relaunch.log`, `API-05C-failure-row-after-relaunch.png`, `API-05C-feed.jsonl` | Server exit 05:33:57.3; 05:34:35.6 `Code signature … did not pass validation` (`kind=install`); `The automatic update did not install; relaunching this version.` once; old pid gone, **new pid 29804 and server healthy**; state and row show the failure; startup check yml GET and **no zip GET** | **F-API-002 resolved:** the old version comes back with its server, once. The refusal arrives after the preparation ended. A refusal in the short stop itself is covered by unit tests only |
| API-10 | AC-006 | Repository | Diff and greps | — | Pass | `API-10-r2-ac006.log` | Empty diff outside web/tickets; `exit: 1` for 356 names; no node-path file changed | — |
| API-01 (nodes), API-06..09 | AC-001, AC-004, AC-005 (nodes), CR-C3 | — | Reused from round 1 | — | Pass | See the round 1 table | — | `API-10-r2-ac006.log`: no node-path file changed since `31d38080fc` |

### Round 1 (history; on `31d38080fc`)

| Case ID | Result | Evidence Files | Summary |
| --- | --- | --- | --- |
| API-01 | Pass | `API-01-app-switch-off.log`, `API-01-nodes-no-request.log`, `API-01-nodes-switches-off.png` | App: 0 zip requests. Five real nodes past the 2-min pass: 0 main-process requests, no POST |
| API-02 | Pass with F-API-001 | `API-02-*`, `API-02-03-summary.log` | Real install; sidebar "0 updated" |
| API-03 | Pass | `API-02-03-summary.log` | 1 recorded, 1 resumed, 1 notice |
| API-04 | Pass | `API-04-*` | Failure row, retried at the next check |
| API-05 | **Fail (F-API-002)** | `API-05-*` | App left open without its server, no relaunch |
| API-06 | Pass | `API-06-09-proxy-n-old.jsonl`, `API-06-07-nodes-outcomes.png`, `API-06-09-node-records.log` | Main process POST → 202 (CR-C3); node on 1.5.11-beta.10; row "Updated automatically to 1.5.11-beta.10" |
| API-07 | Pass | `API-06-09-proxy-n-fail.jsonl` | Rollback → `AUTO_FAILED` with the node's reason; no POST at the next pass |
| API-08 | Pass | `API-06-09-proxy-n-stop.jsonl`, `API-08-n-stop-updated-new.png` | Stopped node: no entry; updated on a later pass; new until seen |
| API-09 | Pass | `API-06-09-proxy-n-same.jsonl`, `API-06-09-proxy-n-new.jsonl` | Same and newer nodes: never a POST |
| API-10 | Pass | `API-10-ac006-server-grep.log` | No 356 names on the server side |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-only part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01-r2 (app), API-01 round 1 (nodes) | Proven | — |
| AC-002 | Yes | API-02-r2, API-02B-r2 pass; **API-02D fails on a busy machine** | **Not proven for a busy machine (F-API-003).** The sidebar and the row are right (F-API-001 resolved) | A Developer ID signed install on the user's machine. Tried: real Squirrel, ShipIt and relaunch on copies with an ad hoc signature and explicit requirement. Squirrel's verify time may differ with a real signature |
| AC-003 | Yes | API-03-r2 | Proven | — |
| AC-004 | Yes | Round 1 API-06, API-08, API-09 (node path unchanged) | Proven | — |
| AC-005 | Yes | API-04-r2 (download), API-05-r2 (refusal, no repeat), API-05C (broken package: relaunch with its server, no repeat), round 1 API-07, API-08 (nodes) | Proven (F-API-002 resolved) | — |
| AC-006 | Yes | API-10-r2, IMP-07 | Proven | — |

## Findings

**F-API-001: resolved** (API-02-r2). **F-API-002: resolved** (API-05-r2, API-05C; secondary message overwrite also gone).

**F-API-003: on a busy machine, the 60 s quit bound fails an automatic install that was still going normally.**
Preliminary classification: `Design Impact`.
- **Trigger (real use):** the machine is busy (here a full desktop build beside other work) when an automatic update installs. The app was at normal priority.
- **Mechanism:**
  - `AppUpdater` calls `quitAndInstall` right after the stop and arms the bound (`awaitQuit`).
  - The automatic install starts at `update-downloaded`, before Squirrel has its copy. `MacUpdater.quitAndInstall` only waits for Squirrel's native `update-downloaded` when that has not happened yet.
  - So the quit normally comes only after Squirrel's fetch, unpack and verify. The design's bound assumed the quit follows `quitAndInstall` promptly (DS-002 (c)).
- **Measured:**
  - Busy-run and idle installs: ~36 s of Squirrel work (API-02-r2, API-02B), leaving ~23 s of margin on this fast machine with a 492 MB bundle.
  - API-02D: bound fired exactly 60.0 s after the stop (05:50:06.474 → 05:51:06.477) with Squirrel unfinished.
- **Consequence:**
  - Nothing is corrupted and the old version comes back with its server.
  - But the app restarted for nothing, and the row says "Automatic update failed".
  - That version is blocked from automatic install (REQ-004), although nothing was actually wrong with it.
  - Runs busy at that moment are stopped and not resumed (FU-003, read in the design; this case had an idle app).
  - The same would happen for each release on a Mac that always takes over 60 s (not run).
- **Direction (owner's choice):** for example, start the bound once Squirrel is ready (native `update-downloaded`), so it measures the quit and not Squirrel's work. A longer bound only moves the threshold.
- **Reproduce:** the API-02B steps with `pnpm -C autobyteus-web build:electron:mac` running from 45 s before the Check.

**Observations (not failures):**
- **O-3:** after "relaunching this version", the new process took about 40 s to appear (API-05C: 05:34:35.6 → 05:35:17). No log lines in between; cause not identified. With Squirrel's work before it, the window had no server for about 80 s in that case. API-02D's relaunch was similar in scale.
- **O-4:** the server is stopped at once, while Squirrel still needs ~36 s, so an automatic install has that long with the window open and no server. This follows the design's order (DEC-001 = install at once).
- **O-5:** the failure text for a signature refusal, or a false bound failure, is the generic "could not restart to install it. Try again." The real reason is only in the log.
- **FU-004:** not run, as the reviewer noted.

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual |
| --- | --- | --- | --- | --- |
| Requirement and AC proof | 75% | 85% | AC-001, AC-003..AC-006 proven | AC-002 fails on a busy machine (F-API-003) |
| Changed-boundary directness | 70% | 96% | Real Squirrel, real refusals, real install through the new attempt class | — |
| Integration realism | 65% | 93% | Real nodes (round 1), real busy agent across the update | Ad hoc signature, not Developer ID |
| Environment / fixture fidelity | 75% | 90% | Clean builds; a real load | Test copies' Info.plist and signature edits |
| Failure / edge / lifecycle | 70% | 80% | Refusal, broken package, bad sha, nodes, paths (b) and (c) live | F-API-003; a refusal inside the short stop is unit-only; path (a) unit-only |
| Desktop / user surface | 75% | 92% | Sidebar three states, rows, real restart | — |
| Durable regression quality | 85% | 85% | IMP-01..10 with mutations | F-API-003 has no test |

- Overall final: 88.7% (simple average).
- Every critical AC directly proven: `No` (AC-002 on a busy machine).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed). Modes:
  - `Project Desktop Validation`: isolated copies through a real install;
  - `Lifecycle`.
- Round 1's `Live API` node results are reused.
- Gap addressed: unit tests use controlled timers, and F-API-003 appears only with Squirrel's real duration.

## Desktop Application Validation (When Applicable)

- Run-owned copies only. Each relaunch checked as round 1 (e2e environment, 0 files under `~/.autobyteus`).
- Effect on the user's running app and data: `None`.

## Persisted-Data Transition Checks (When Applicable)

- `Directly Usable — No Migration`; shapes unchanged since round 1.
- Written and read across real restarts.

## Compatibility / Legacy Scope Check

- None introduced.

## Durable Coverage Changed In The Codebase

- `No`. Harness additions in `evidence/`: `API-356-ro-samples.sh`, `API-356-page-*.js`.

## Dependencies Mocked Or Emulated

| Dependency | Method | Limitation |
| --- | --- | --- |
| Release signing (app) | Ad hoc signature with an explicit requirement on test copies | Developer ID checks and their timing not exercised |
| Release feed | Local generic feed | The zip is fetched in about a second |
| A slower Mac | `taskpolicy -b` (API-02C), real load (API-02D) | No slower hardware was available |

## Temporary Methods And Cleanup

| Item | Cleanup | Result |
| --- | --- | --- |
| Instances and relaunched apps | `isolated-app stop`; `osascript … application id "com.autobyteus.app.an356"` | None left |
| The API-02D build | Killed by matching its working directory under the run root, so other work on this machine was untouched | Stopped |
| Test identity: caches, `HTTPStorages`, preferences, launchd job, LaunchServices registrations | `rm -rf`, `launchctl remove`, `lsregister -u` | Removed (`API-99-r2-cleanup.log`) |
| Read-only mount, copies, data roots, feed, clean checkout, run root | `hdiutil detach`, `git worktree remove`, `rm -rf` | Removed |
| Harness scripts `evidence/API-356-*` | Kept as evidence | Kept |

## Not Tested / Residual Risks

- **API-05B:** see Deviations.
- **A refusal inside the short stop itself:** unit tests only (IMP-09). No real trigger was found: the read-only refusal comes before it, the signature refusal after it.
- **The `prepareForInstall` / `quitAndInstall` catch, path (a):** unit tests only.
- **Busy runs at a false bound failure (F-API-003):** expected stopped and not resumed per FU-003; not run together.
- **Slower hardware:** not available; emulated.
- **Switching on while `downloaded` or `updateStaged`:** unit tests only.
- **Windows/Linux:** macOS only.
- **The hourly node pass by wall clock:** the same code ran at launch + 2 min (round 1).
- **A Developer ID signed install:** user-only (see AC-002).

## Latest Authoritative Result

- Result: `Fail`.
- Criteria not proven: AC-002 on a busy machine (F-API-003).
- Resolved: F-API-001, F-API-002.
- Preliminary classification: F-API-003 `Design Impact`.
- Next recipient: code reviewer, for failure-origin review.
