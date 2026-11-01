# API/E2E Execution Coverage Report — automatic-app-node-updates (autobyteus-356)

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates/tickets/in-progress/automatic-app-node-updates/`.

**Safety:** only run-owned isolated desktop copies with their own bundle id, run-owned data roots, a local feed and test-owned Docker containers were used. The user's installed app, `~/.autobyteus`, its updater caches (listings identical before and after: `API-00-user-caches-before.log`, `API-99-cleanup.log`) and the user's nodes `autobyteus-server-0/1/2` were not touched. One paid haiku turn (AC-003).

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md` (incl. § Can The Real Install Run Safely?)
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; CRR-001 Pass.
  - Code: `b4bda46484` … `31d38080fc`.
  - Handoff: `f19fb18287`.
  - Review: `e8b51df9ad`, built from a clean checkout of it.
- Deviations from the plan, and why:
  - API-01 ran in two sessions: the app part on the app-case profile; the node part on a fresh node-case profile.
  - API-07, API-08 and API-09 ran in the same node session as API-06 (one switch-on, one relaunch).
  - The sidebar screenshot for F-API-001 replays the state V2 started in, by restoring `read: false` in the test record. The real state was first captured as text before the panel was opened (`API-02-03-summary.log`).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates/tickets/in-progress/automatic-app-node-updates/evidence/`

## Routing Classification

- Task size `Medium`; risk `High`; input route `Reviewed`; successful-output route `Code Review`.
- Test-code review decision: `Not Applicable` this round (result `Fail`; failure-origin review requested). No durable test code changed.

## Tested Builds And Environments

| Env ID | What | Settings |
| --- | --- | --- |
| ENV-1 | Clean checkout of `e8b51df9ad`; `pnpm install --frozen-lockfile --offline`; V1 = `build:electron:mac` (1.5.11-beta.10, 6 m 49 s); V2 = the same code with `autobyteus-web` version 1.5.11-beta.11, rebuilt (6 m 33 s; its server stamp follows) | macOS 26 arm64; Electron as packaged; electron-updater 6.8.9 MacUpdater + Squirrel.Mac |
| ENV-2 | Test copies (`evidence/API-356-prepare-copy.sh`): bundle id `com.autobyteus.app.an356`, `updaterCacheDirName: autobyteus-updater-an356`, `LSEnvironment` pinning `AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE=e2e`, data root, server port and feed; ad hoc signature with the designated requirement `identifier "com.autobyteus.app.an356"` (`API-00-copies.log`: "V2 copy satisfies V1 copy's DR") | `isolated-app start --app <copy> --data-root <run-owned> --server-port <fixed> --test-update-feed http://127.0.0.1:47911`; driven over CDP (`evidence/API-356-drive.mjs`) |
| ENV-3 | Local feed (`evidence/API-356-feed.mjs`): `latest-mac.yml` / `beta-mac.yml` and the V2 zip (492 MB); modes `none`, `good`, `badsha`; every request logged | 127.0.0.1:47911 |
| ENV-4 | Test-owned nodes (`evidence/API-356-nodes.sh`) on the published `autobyteus/autobyteus-server:1.5.11-beta.7` image plus a throwaway Ed25519 public key (`evidence/API-356-Dockerfile.testkey`), built-in labelled 1.5.11-beta.7, -beta.10 or -beta.12. Signed `good` and `fail` 1.5.11-beta.10 packages made from the image's own package (`evidence/API-356-make-packages.sh`, adapted from 305) on a local release source (`evidence/API-356-release-source.mjs`) | Fresh volumes, label `autobyteus.an356-api=1`, fixed 127.0.0.1 ports 47951–47955; one logging proxy per node at 47961–47965 (`evidence/API-356-node-proxy.mjs`), the address the desktop registers |
| ENV-5 | Node-case desktop: the V1 build (no test feed), fresh data root, port 47931 | — |

## Cases

| Case ID | Criteria | Boundary | Command / Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R1 | BEH-001..003 (unit), AC-006 | Repository | Reused IMP-01..IMP-08 | — | Pass | implementation-handoff Checks Run | `Tests  383 passed \| 1 skipped`; mutations red | Only `tickets/` changed since `31d38080fc` |
| API-00 | — | Builds, copies, nodes | As ENV-1..4 | ENV-1..4 | Pass | `API-00-copies.log`, `API-00-user-caches-before.log` | `prepared … version=1.5.11-beta.10 … stamp={"version":"1.5.11-beta.10"}` and `…beta.11…`; `V2 copy satisfies V1 copy's DR` | — |
| API-01 | AC-001 | App + feed; desktop + real nodes | App: fresh profile, feed `good`, wait past the startup check and 60 s more. Nodes: fresh desktop, 5 nodes added through the Nodes page, wait past the pass at launch + 2 min | ENV-2/3/4/5 | Pass | `API-01-app-switch-off.log`, `API-01-settings-updates-switch-off.png`, `API-01-nodes-no-request.log`, `API-01-nodes-switches-off.png` | App: `aria-checked "false"`, `automaticUpdate false`, `status available 1.5.11-beta.11`, Download offered, no `app-update-automatic.json`, zero zip requests. Nodes: all toggles `aria-checked "false"`; per proxy only `window(Mozilla)` reads, **no `main(node)` request and no POST**; no `node-auto-updates.json` | — |
| API-02 | AC-002, REQ-002, REQ-005, CR-C2 | Desktop + feed, **real** MacUpdater → Squirrel.Mac → ShipIt → LaunchServices relaunch | Same profile. Feed `none` and Check; switch on by a click (no confirmation; nothing starts). Busy agent (API-03). Feed `good` and Check. Watch (`API-356-watch.sh`). Then quit the relaunched V2 by its bundle id, start V2 again with `isolated-app` on the same data root, open the Notification Center | ENV-2/3 | **Pass with F-API-001** | `API-02-watch.log`, `API-02-v1-instance.log`, `API-02-v2-relaunched-app.log`, `API-02-v2-relaunch-isolation.log`, `API-02-03-summary.log`, `API-02-switch-on-no-update.png`, `API-02-check-clicked-downloading.png`, `API-02-v2-row-updated-automatically.png`, `API-02-sidebar-entry-0-updated.png` | `New version 1.5.11-beta.11 has been downloaded` 20:48:21.5; record `automatic {1.5.11-beta.11, 20:48:22.356}`; V1 quits 20:48:57 (stop of a busy run); bundle → `1.5.11-beta.11` 20:49:09; relaunched pid 66249 (no isolated marker) with `AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE=e2e`, data root `<R>/data-app`, `~/.autobyteus: 0` open files; health 200 20:49:24; record `outcome AUTO_UPDATED, read false`. Row: `New: \| AutoByteus \| Updated automatically to 1.5.11-beta.11 \| From 1.5.11-beta.10`; `read true` after opening. **Sidebar entry: `0 updated`, label `0 updates applied automatically: `** (F-API-001). CR-C2: no `Auto-update failed` and no install error after the quit began (only Squirrel's Objective-C runtime noise `Unrecognized attribute string flag`) | No click on Download or Install. The relaunch went through ShipIt's `NSWorkspace launchApplicationAtURL`, whose `LSEnvironment` kept it isolated (pilot and evidence) |
| API-03 | AC-003 | Same journey | `node evidence/API-356-busy-agent.mjs busy 47921 <ws> <marker>` before the Check; `check` after V2 started | ENV-2 | Pass | `API-02-03-summary.log` | V1: `Recorded 1 busy run(s) for restart resume` 20:48:22.468; V2: `Restart resume after the update to 1.5.11-beta.11: 1 resumed, 0 skipped, 0 failed`; `notices 1` (`system.restart_resume`); Claude answered "My previous command was interrupted due to the application restart…" | V2 was relaunched by LaunchServices with its environment, and the Claude runtime still worked |
| API-04 | AC-005 (download) | Desktop + feed | Fresh V1 copy; feed `badsha`; switch on by a click (continues the found update); then Check now | ENV-2/3 | Pass | `API-04-download-failure-retry.log`, `API-04-instance.log`, `API-04-download-failed-settings.png`, `API-04-failure-row.png` | `sha512 checksum mismatch`, `Auto-update failed. (kind=metadata, operation=download, code=ERR_CHECKSUM_MISMATCH)`; record `automaticFailure {step: download}`; row "Automatic update failed. Nothing was changed. \| Update information is incomplete right now…", Download still offered; **Check → zip GET again at 20:55:33** (not blocked) | — |
| API-05 | AC-005 (install refusal, no repeat) | Desktop on a read-only disk image, real Squirrel | Fresh V1 copy inside a UDZO image attached `-readonly -nobrowse` at a run-owned mount point; feed `good`; switch on by a click. Then the user restarts the app from the same volume | ENV-2/3 | **Fail (F-API-002)** | `API-05-watch.log`, `API-05-instance-1.log`, `API-05-instance-2.log`, `API-05-app-open-without-server.png`, `API-05-restart-failure-row-no-repeat.png` | 20:58:28.778 downloaded; 20:58:29.687 `Cannot update while running on a read-only volume` → `Auto-update failed. (kind=install, operation=install)`; record `automaticFailure {step: install, "The update was downloaded, but AutoByteus could not restart to install it. Try again."}`; **20:58:29.689 `The automatic update did not install and the server exit is not confirmed; the app stays open.`**; server child gone by 20:58:30; 2 min later still `health unreachable`, window "Loading task history…", no relaunch; state message overwritten: `"The update download was interrupted. Check your connection and try again."` (`errorOperation: download`). After the user's restart: server ok, failure row with the reason, startup check found V2 (yml GET) and **no zip GET** | The refusal itself and the per-version gate behave as designed; the recovery does not |
| API-06 | AC-004, CR-C3 | Desktop main process + real node + local release source | Switches turned on by clicks in the Nodes page | ENV-4/5 | Pass | `API-06-09-proxy-n-old.jsonl`, `API-06-07-outcomes-poll.txt`, `API-06-07-nodes-outcomes.png`, `API-06-09-node-records.log`, `API-06-switches-on.png`, `API-06-desktop-instance-1.log` | `main GET … relation newer` then **`POST /rest/node-update {"version":"1.5.11-beta.10"}` → 202 `{"accepted":true}`** 30 ms after the click; follow every 10 s (`state running`); `AUTO_UPDATED` at about 1.5 min; row "Server 1.5.11-beta.10 · Updated automatically to 1.5.11-beta.10"; C1 `1.5.11-beta.10 same succeeded` | The window was on Nodes when it ended, so the outcome was seen at once (`read true`); "new until seen" is shown in API-08 |
| API-07 | AC-005 (node rollback, no repeat) | same | Same click; next pass after a relaunch | ENV-4/5 | Pass | `API-06-09-proxy-n-fail.jsonl`, `API-06-07-nodes-outcomes.png`, `API-06-09-node-records.log` | POST 202 → `AUTO_FAILED` "1.5.11-beta.10 did not come up (it exited with code 3 within 60 s of answering); 1.5.11-beta.7 runs again on the data as it was before the update."; row "Automatic update failed. Nothing was changed." with that reason; C1 back on `1.5.11-beta.7`, update `failed`. Next pass (21:11:33): **GET only, no POST** | — |
| API-08 | AC-005 (node unreachable), REQ-005 (new until seen) | same | `n-stop` stopped before the switch; started; desktop relaunched with its window on `#/workspace`; the pass at launch + 2 min | ENV-4/5 | Pass | `API-06-09-proxy-n-stop.jsonl`, `API-08-outcomes-poll.txt`, `API-08-n-stop-updated-new.png`, `API-08-desktop-instance-2.log` | At the switch: `GET 502 ECONNREFUSED`, no entry. Pass 21:11:33: GET → POST 202 → `AUTO_UPDATED read=false`; on opening Nodes: `New: \| Updated automatically to 1.5.11-beta.10`, then `read=true`; C1 `1.5.11-beta.10 succeeded` | The window's "not an AutoByteus node" text for the stopped node comes from the proxy answering 502 for a dead upstream (a harness artifact); the main process treats both as undelivered |
| API-09 | AC-004 (no request) | same | `n-same` (built-in 1.5.11-beta.10), `n-new` (1.5.11-beta.12); also `n-old` after its update | ENV-4/5 | Pass | `API-06-09-proxy-n-same.jsonl`, `API-06-09-proxy-n-new.jsonl`, `API-06-09-proxy-n-old.jsonl` | Main GET `relation same` / `older` at the switch and at the later pass; **never a POST**; `n-old` after its update: GET only | — |
| API-10 | AC-006 | Repository | Branch diff and greps on the clean checkout | — | Pass | `API-10-ac006-server-grep.log` | Branch diff outside `autobyteus-web`/`tickets`: empty. 356 names (`app-update-automatic`, `node-auto-updates`, `set-auto-update`, `app-update:set-automatic`, `node-auto-update:`, `NodeAutoUpdate`, `recoverAfterFailedInstall`) in server/contracts: `exit: 1` (none). The generic words `AUTO_FAILED` / `automaticUpdate` are the existing package/skill automation, present on the base `3b9dc912a1` | — |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-only part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 | Proven | — |
| AC-002 | Yes | API-02: real download, Squirrel install and relaunch into V2 with no click; V2's row "Updated automatically to 1.5.11-beta.11", new until seen | **Proven, with a display defect (F-API-001)**: the sidebar entry beside Settings says "0 updated" | A signed install on the user's machine with the Developer ID build: the local copies use an ad hoc signature with an explicit requirement. ShipIt's install and relaunch were otherwise real |
| AC-003 | Yes | API-03 | Proven | — |
| AC-004 | Yes | API-06, API-08 (update and "new until seen"), API-09 (no request) | Proven | — |
| AC-005 | Yes | API-04 (download fails, retried at the next check); API-05 (install refused → recorded once, blocked for V across a restart); API-07 (node rollback, no repeat); API-08 (unreachable node, tried later) | **Not proven**: after the native refusal the old version stays open **without its server** and is not relaunched (F-API-002). The failure row and the no-repeat rule hold | — |
| AC-006 | Yes | API-10, IMP-07 | Proven | — |

## Findings

**F-API-001: after an automatic app update, the sidebar entry says "0 updated".**
Preliminary classification: `Local Fix`.
- **Observed (API-02):** V2 starts with the app record `outcome AUTO_UPDATED, read false`. The entry beside Settings shows `0 updated`, and its accessible name is `0 updates applied automatically: ` (empty details) (`API-02-sidebar-entry-0-updated.png`; first captured as text in the real state, `API-02-03-summary.log`). The panel's row is correct.
- **Cause (`Read`):**
  - This branch removed `row.kind !== 'app'` from `unreadOutcomeRows` in `stores/updateNotificationsStore.ts:186`, so the app's unread outcome now makes `hasEntry` true.
  - `components/layout/SidebarNotificationsEntry.vue:61` still computes `outcomes` with `row.kind !== 'app'`, so the count, the summary and the "updated automatically" detail line exclude it.
  - The design's derived consumers list (`updateNotificationsStore`, `NotificationRow`) missed this consumer.
- **Expected:** "1 updated" with a detail line, as for other automatic outcomes (REQ-005, BEH-003).

**F-API-002: after a native install refusal, the old version is left open without its server and is not relaunched.**
Preliminary classification: `Local Fix`, with a `Design Impact` part on the recovery timing rule.
- **Trigger (real use):** the app runs from a read-only location (for example from its disk image, or translocated from Downloads) with the switch on. The design names this case (Validation Guidance; AR-001 (b)).
- **Timeline (`API-05-instance-1.log`, `API-05-watch.log`):**
  - 20:58:28.778: downloaded. The install is accepted, and after 100 ms `prepareForInstall()` stops the server.
  - 20:58:29.685: `quitAndInstall`; Squirrel requests the update.
  - 20:58:29.687: `Cannot update while running on a read-only volume` (`operation=install`). This is recorded once as an install failure, which is correct.
  - 20:58:29.689: `recoverAfterFailedInstall()` reads `isServerProcessGone() === false` and logs "the server exit is not confirmed; the app stays open".
  - By 20:58:30 the server child has exited. Two minutes later the app is still open, the server is unreachable, the window shows "Loading task history…", and there was no relaunch.
- **Why:** the stop resolves before the server process has exited. The refusal arrives within 2 ms of `quitAndInstall`, so the one-shot check runs while the exit is still in flight. The design's rule ("relaunch when the shutdown stopped the server, or the server process is gone") is evaluated too early. The intended "unconfirmed exit" branch (339 DEC-005: the stop did not complete) was not the case here.
- **Secondary:** Squirrel's single refusal also rejects the pending download promise. That overwrites the update state's message with `"The update download was interrupted. Check your connection and try again."` (`errorOperation: download`); the record's reason stays correct.
- **Expected (design DS-002 recovery; Validation Guidance):** "the old version comes back with its server, and the row shows the failure."
- **Holds:** the failure is recorded once as `install`, the row shows the reason, and after a restart V2 is not downloaded again (`API-05-restart-failure-row-no-repeat.png`).
- **Possible directions (owner's choice):**
  - decide recovery after the stop's outcome, by waiting a bounded time for the server process exit, or by using the stop's own result;
  - keep the download handler from overwriting the install failure's message.
- **Reproduce:** `hdiutil create -srcfolder <prepared V1 copy dir> -format UDZO -o ro.dmg`; `hdiutil attach -readonly -nobrowse -mountpoint <dir> ro.dmg`; `isolated-app start --app <dir>/AutoByteus.app --test-update-feed <feed with a newer version> …`; turn the switch on.

**Observations (not failures):**
- **O-1:** the busy-run stop took about 35 s before the automatic install quit (339's bounded stop with a busy Claude run). This is expected.
- **O-2:** the stopped node's window text is an artifact of the logging proxy (see API-08 Notes).

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual |
| --- | --- | --- | --- | --- |
| Requirement and AC proof | 70% | 80% | AC-001, AC-003, AC-004, AC-006 proven; AC-002 proven with a display defect | AC-005 recovery fails (F-API-002); F-API-001 |
| Changed-boundary directness | 60% | 95% | Real MacUpdater/Squirrel/ShipIt install and LaunchServices relaunch; real native refusal; real nodes through C1 from the main process | — |
| Integration realism | 60% | 93% | Real starters with signed packages, verify, trial, rollback; real busy agent across the update | Ad hoc signature with an explicit requirement instead of Developer ID |
| Environment / fixture fidelity | 75% | 90% | Clean builds; V2 = same code with a newer version; published node image | Test copies' Info.plist and signature edits; throwaway package key; local release source |
| Failure / edge / lifecycle | 65% | 75% | Download failure and retry, install refusal and no repeat, node rollback, unreachable node, same/newer nodes | F-API-002 recovery; quit bound and catch paths only in unit tests |
| Desktop / user surface | 70% | 85% | Switches, rows, node lines and new-until-seen in real windows | F-API-001 sidebar entry |
| Durable regression quality | 85% | 85% | IMP-01..06 with mutations | The two findings have no repository test |

- Overall final: 86.1% (simple average).
- Every critical AC directly proven: `No` (AC-005).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed). Modes:
  - `Project Desktop Validation`: isolated copies through a real install;
  - `Live API`: real nodes and C1;
  - `Lifecycle`.
- Gap addressed:
  - the unit layer mocks `autoUpdater`, timers and nodes;
  - both findings appear only with the real updater's timing (F-API-002) or the full rendered shell (F-API-001).

## Desktop Application Validation (When Applicable)

- Only run-owned copies with their own bundle id, caches and `LSEnvironment`.
- The real relaunch was verified isolated: e2e environment, run data root, no files under `~/.autobyteus`.
- Effect on the user's running app and data: `None`.

## Persisted-Data Transition Checks (When Applicable)

- `Directly Usable — No Migration`.
- Fresh profiles had no new files (switches off).
- The new files and fields were written and read across a real restart into a new version: `app-update-automatic.json`, the record's `automatic` / `automaticFailure` / `outcome`, the registry's `autoUpdate`, and `node-auto-updates.json`.

## Compatibility / Legacy Scope Check

- None introduced.

## Durable Coverage Changed In The Codebase

- `No`.

## Dependencies Mocked Or Emulated

| Dependency | Method | Limitation |
| --- | --- | --- |
| Release signing (app) | Ad hoc signature with an explicit designated requirement on test copies | Developer ID signature checks not exercised |
| Release signing (node packages) | Throwaway Ed25519 key in a test image | Same verify path, different key |
| Release feeds | Local generic feed; local release source in GitHub's layout | — |

## Temporary Methods And Cleanup

| Item | Cleanup | Result |
| --- | --- | --- |
| Isolated instances, relaunched V2 | `isolated-app stop`; V2 quit by its bundle id (`osascript … application id "com.autobyteus.app.an356"`) | None left |
| Test identity state: `~/Library/Caches/{com.autobyteus.app.an356,.ShipIt,autobyteus-updater-an356}`, `HTTPStorages`, `Preferences` plist, launchd job `com.autobyteus.app.an356.ShipIt`, LaunchServices registrations | `rm -rf`, `launchctl remove`, `lsregister -u` | Removed (`API-99-cleanup.log`) |
| Nodes, volumes, images `an356-node:7/10/12`, release source, proxies, feed | `API-356-nodes.sh down`, `docker rmi`, `kill` | None left; user's nodes running untouched |
| Read-only image mount, temp keychain (unused), throwaway keys, copies, data roots, clean checkout | `hdiutil detach`, `security delete-keychain`, `git worktree remove`, `rm -rf` | Removed |
| Harness scripts `evidence/API-356-*` | Kept as evidence | Kept |

## Not Tested / Residual Risks

- **Windows/Linux installers:** macOS only.
- **Paths covered only by unit tests (IMP-04):** the quit-bound path (c) and the `prepareForInstall`/`quitAndInstall` catch (a).
- **Switching on while `downloaded` or `updateStaged`:** unit tests and IMP-03 only.
- **A click that installs a blocked version:** not run.
- **The hourly node pass by wall clock:** the same pass code ran 2 minutes after a launch.
- **A Developer ID signed install:** user-only (see AC-002).

## Latest Authoritative Result

- Result: `Fail`.
- Criteria not proven: AC-005 (F-API-002); AC-002 with a display defect (F-API-001).
- Preliminary classification: F-API-001 `Local Fix`; F-API-002 `Local Fix` with a `Design Impact` part (recovery timing).
- Next recipient: code reviewer, for failure-origin review.
