# API/E2E Coverage Investigation — automatic-app-node-updates (autobyteus-356)

The plan. Results are in `api-e2e-execution-coverage-report.md`. Paths are relative to
`/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates/tickets/in-progress/automatic-app-node-updates/`.

**Safety (the app restarts by itself in these tests):**
- Only run-owned isolated desktop copies, run-owned data roots, a local test feed and test-owned Docker containers are used.
- Never the user's installed app, its data (`~/.autobyteus`), its updater caches (`com.autobyteus.app.ShipIt`, `autobyteus-updater`) or the user's node containers `autobyteus-server-0/1/2`.

## Investigation Meta

- Requirements: `requirements-doc.md` (SR-002, approved; DEC-001 = A, install as soon as downloaded).
- Design: `design-spec.md` (SR-003, Ready); `design-review-report.md` (ARCH-REV-002 Pass).
- Implementation handoff: `implementation-handoff.md` (IR-001), with IMP-01..IMP-08.
- Code review: `code-review-report.md` (CRR-001 Pass 9.4; CR-C2, CR-C3 hints).
- Follow-ups: FU-001..FU-003.
- API/E2E revision: `API-REV-001`, round 1.
- Trigger: code reviewer, CRR-001.
  - Code: `b4bda46484` … `31d38080fc`.
  - Handoff: `f19fb18287`.
  - Review: `e8b51df9ad`, built from a clean checkout of it.

## Guidelines Read

- `TESTING.md`: desktop shell → isolated desktop instance; Docker server nodes → test-owned containers from the same image with fresh volumes on `127.0.0.1`; never the user's data or app.
- `autobyteus-web/docs/isolated-app-instances.md`: `--test-update-feed`, generic electron-updater feed, startup check 8 s after launch.
- Precedents:
  - `tickets/done/settings-update-notifications` (API-14): a copy with its own bundle id and updater cache, so the installed app's staged update is untouched. Install was not pressed there.
  - `tickets/done/busy-quit-shutdown-orphan` (API-14): Install not pressed because ShipIt relaunches outside the isolated profile.
  - `tickets/done/docker-node-in-place-server-update` (API-41, DEL-14): an image with a throwaway public key, signed variant packages built from the image's own package (`make()`), and a local release source (`AUTOBYTEUS_SERVER_PACKAGE_SOURCE`).

## Can The Real Install Run Safely? (discovery, before any build)

The reviewer's condition: do not run the real Squirrel step if ShipIt would relaunch onto the user's data. Findings (read-only checks and a dummy-bundle pilot in the run root):

1. **Isolation is environment-only.** `isolated-app` sets `AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE=e2e`, `…_DATA_ROOT`, `…_SERVER_PORT` and `…_TEST_UPDATE_FEED_URL` (`scripts/electron-launch/launchEnvironment.mjs`). Without them the app takes the production profile, `$HOME/.autobyteus` (`electron/appDataPaths.ts`). There is no single-instance lock (`requestSingleInstanceLock` not used). A relaunch without the environment would therefore start on the user's data: the 284/1.5 concern is real.
2. **How ShipIt relaunches.** The bundled `Squirrel.framework/…/ShipIt` imports `NSWorkspace` and uses `launchApplicationAtURL:options:configuration:error:`; `posix_spawn` is ShipIt's own re-exec. That path goes through LaunchServices, which applies the bundle's `Info.plist` `LSEnvironment`.
3. **Pilot (dummy bundle):** launched with `NSWorkspace launchApplicationAtURL…` and an empty configuration, as ShipIt does. The process received `AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE=e2e` from `LSEnvironment`.
4. **Signature.**
   - The stock build is only linker-signed (`Sealed Resources=none`), and `codesign -v` fails ("code has no resources but signature indicates they must be present"). Squirrel's static check would refuse it.
   - Ad hoc deep signing alone pins the requirement to the exact cdhash, so no V2 could pass.
   - Pilot: an ad hoc signature with an explicit designated requirement `identifier "<test id>"` validates ("satisfies its Designated Requirement"), and a V2 with a different version satisfies V1's requirement.
   - No keychain or identity of the user's is used. A temp-keychain identity was tried first: codesign does not see keychains outside the search list, and changing the search list was rejected.

**Decision:** the real install runs on test copies prepared as follows:
- own bundle id `com.autobyteus.app.an356`, so ShipIt's job and caches are the copy's own;
- `app-update.yml` `updaterCacheDirName: autobyteus-updater-an356`;
- `Info.plist` `LSEnvironment` pinning the e2e profile, the run's data root, server port and feed;
- ad hoc signature with that designated requirement.

Both V1 and V2 carry the same `LSEnvironment`, so the relaunched V2 is isolated whether LaunchServices reads a fresh or a cached Info.plist. The probe asserts these keys in both bundles before the install. An invalid e2e configuration makes the app exit (`resolveElectronLaunchProfile` throws); it never falls back to production. The relaunched process has no CDP port, so V2's window is checked by quitting V2 and starting it again with `isolated-app` on the same data root (the outcome is persisted and stays "new until seen").

**Deviation from the stock artifact:** the test copies differ from the built app only in `Info.plist` (bundle id, `LSEnvironment`), `app-update.yml` (cache name) and the signature. App code, `app.asar`, the server and the Electron binary are as built.

## Supported Scenarios And Real Usage

- **SCN-1 (UC-001 / AC-002 / AC-003):** the user has turned the app switch on. A release appears on the channel; the app downloads it, installs and restarts by itself while agents are busy; the busy agents continue after the restart.
- **SCN-2 (AC-001):** the switches are off, as on a fresh profile. A release appears and a node is older: nothing happens beyond today's notification.
- **SCN-3 (AC-005 app):**
  - a download fails (a bad package on the feed), and the next check tries again;
  - the operating system refuses the install (the app runs from a read-only volume): the old version comes back and V is not tried again.
- **SCN-4 (UC-002 / AC-004 / AC-005 nodes):** the user turns a node's switch on. The desktop updates an older node to its own version. The node's trial rolls back. A node that was stopped is tried again on a later pass. Nodes at the same or a newer version get no request.
- Triggers are real: a click on the switch; the app's startup check against the feed; a click on Check now as "the next check"; the node passes (at once on the switch, and the pass 2 minutes after a launch as the "later pass"). The hourly pass is not waited for: a relaunch gives the same pass code path at 2 minutes.

## Changed Surface And Boundary Classification

| Surface | Boundary | Repository evidence | Not exercised by it | Broader mode |
| --- | --- | --- | --- | --- |
| Electron main: `AppUpdater` automatic policy, record, reconcile, recovery | Real electron-updater/Squirrel.Mac, real quit and install, relaunch | IMP-01, IMP-03, IMP-04 (mocked `autoUpdater`; a real `NsisUpdater` cache test) | MacUpdater + Squirrel + ShipIt, real relaunch into V2, native refusal | Isolated desktop copies + local feed |
| Electron main: `NodeAutoUpdater` | Real C1 on a real starter: verify, trial, rollback; main-process `fetch` acceptance (`TRUSTED_NETWORK_OWNER`, CR-C3) | IMP-01, IMP-05; IMP-08 against a fake C1 | A real node's acceptance, update, rollback, restart outage | Test-owned Docker nodes + local release source |
| Desktop persisted files | `app-update-automatic.json`, `app-update-notification.json`, registry `autoUpdate`, `node-auto-updates.json` | unit tests (tolerant reads) | Real write/read across a real restart into a new version | Inspect the files between runs |
| Renderer | Switches, app row outcome, node outcome line | IMP-02, IMP-06, IMP-08 | The app row after a real restart | CDP-driven window |
| Agents across the restart (AC-003) | 339 stop → 285 record/resume | 285's own validation | The automatic install path into a real new version | Busy Claude run across the real install |

## Existing Durable Coverage Inventory

| Path | Intent | Validity | Action |
| --- | --- | --- | --- |
| `electron/updater/__tests__/appUpdaterAutomatic.spec.ts` (17), `appUpdateNotificationRecord.spec.ts`, `appUpdateAutomaticStore.spec.ts`, `electronUpdaterCachedDownload.spec.ts` | App policy, gate, failures, reconcile | Still Valid | Reuse (IMP-01, IMP-03, IMP-04) |
| `electron/nodeAutoUpdate/__tests__/*` (55) | Node decision, reconcile, passes, follow | Still Valid | Reuse (IMP-01, IMP-05) |
| Renderer specs (`appUpdateStore.automatic.spec.ts`, `NotificationCenter.appAutomatic.spec.ts`, node switch) | Switch, rows | Still Valid | Reuse (IMP-02, IMP-06) |

## Planned Cases

| Case ID | Criteria | Surface | Kind | Steps |
| --- | --- | --- | --- | --- |
| API-R1 | BEH-001..003 (unit), AC-006 | Repository | Reused | IMP-01..IMP-08 on `31d38080fc`; only `tickets/` changed since |
| API-00 | — | Builds | Setup | Clean checkout of `e8b51df9ad`. V1 = `build:electron:mac` (1.5.11-beta.10). V2 = the same code with `autobyteus-web` version `1.5.11-beta.11`, rebuilt (its server stamp follows). Test copies as in the Decision |
| API-01 | AC-001 | Desktop + feed + node | Journey | Fresh profile: both switches off (UI and no files); the feed offers V2 → the row offers Download, and the feed sees no zip request; an older real node is registered with its switch off → no C1 POST from the desktop |
| API-02 | AC-002, CR-C2 | Desktop + feed (real Squirrel) | Journey | V1 copy; switch on by a click; startup or next check finds V2 → zip downloaded, installed by ShipIt, relaunched into V2 (isolated by `LSEnvironment`) with no click. V2's record is `AUTO_UPDATED` unread; V2 opened in a window shows "Updated automatically to 1.5.11-beta.11" with the new dot, and it is read after opening. V1's log is checked for any `Auto-update failed` or install error after `before-quit` |
| API-03 | AC-003 | Same journey | Journey | A busy Claude run in V1 at the automatic install → V2's server resumes it with one notice (285; V1 has the recorder) |
| API-04 | AC-005 (download) | Desktop + feed | Journey | The feed's V2 has a wrong sha512 → automatic download fails, failure row with the reason; the next check (Check now) requests the zip again |
| API-05 | AC-005 (install refusal) | Desktop on a read-only volume | Journey | The V1 copy runs from a read-only disk image; the switch is on; V2 is found. Record where Squirrel refuses. If at install: the old version comes back with its server, the failure row shows, and a later check finding V2 starts no automatic download. If at download: the download-failure path, recorded as observed |
| API-06 | AC-004, CR-C3 | Desktop + real nodes | Journey | Test node on the published `1.5.11-beta.7` image with a throwaway key; the release source serves a signed `1.5.11-beta.10` package. Switch on by a click → the main process's GET and POST (202) at once → the node updates → "Updated automatically to 1.5.11-beta.10" |
| API-07 | AC-005 (node rollback) | same | Journey | A node whose `1.5.11-beta.10` package exits 30 s after start under the starter → trial rolls back → "Automatic update failed…" with the node's reason; the next pass (after a relaunch) sends no POST |
| API-08 | AC-005 (node unreachable) | same | Journey | A node stopped when its switch turns on → no attempt recorded; node started; the next pass (2 min after a relaunch) → POST and update |
| API-09 | AC-004 (no request) | same | Journey | Nodes labelled `1.5.11-beta.10` (same) and `1.5.11-beta.12` (newer) with the switch on → no POST at the at-once check or the next pass |
| API-10 | AC-006 | Repository | Check | Reuse IMP-07; grep the clean checkout's server and contracts for the new files, fields and IPC names |

- Progress log: `Yes`.

## Durable Coverage To Add / Update / Remove

None planned. The real installer, real nodes and timed passes make these temporary probes; the unit layer is mutation-checked (IMP-04..06).

## Not Tested / Infeasible / Deferred (initial)

- Windows/Linux installers: macOS only on this machine.
- The hourly node pass by wall clock: the same pass code runs 2 minutes after a launch.

## Round 2 (API-REV-002): IR-002

- **Trigger:** code reviewer, CRR-003 Pass on IR-002.
  - Code: `aa096836d9`, `6a94169f4f`.
  - Handoff: `11b6d02c46`.
  - Review: `f1c4641b08`, built from a clean checkout of it.
- **What changed** (`git diff bc9e427f1c 6a94169f4f`):
  - The sidebar counts from the store's `automaticOutcomeRows`.
  - A new `AppUpdateInstallAttempt` owns the delay, the preparation and `quitAndInstall`. A failed automatic install is recorded once, then settled before recovery reads `isServerProcessGone()`.
  - A later download rejection no longer replaces the install failure.
  - Node path, record shape and shared contracts are untouched.
- **Correction to round 1, checked against the code:** "/ requested" at 20:58:29.685 was Squirrel fetching the update (`MacUpdater.js`: `dispatchUpdateDownloaded`, then `nativeUpdater.checkForUpdates()`), not `quitAndInstall`. `stopServer` awaits the process exit, logged at 20:58:29.868. The refusal therefore landed during the preparation.
- **Gap found in round 1's coverage:** the automatic install starts at `update-downloaded`, before Squirrel has its own copy. Round 1's only real install had a busy run (a 35 s stop), so Squirrel was long finished before `quitAndInstall`. With an idle app the stop is short, so `quitAndInstall` runs while Squirrel is still working, and the 60 s quit bound is armed during that time. New case API-02B.

### Reuse decisions

| Case | Decision | Why |
| --- | --- | --- |
| API-R2 | Reused IMP-09, IMP-10 and the IR-002 reruns in the handoff | Ran on the reviewed code; mutation-checked |
| API-01 node part, API-06, API-07, API-08, API-09 | Reused from round 1 | `git diff --name-only 31d38080fc 6a94169f4f` touches no node path, record shape or contract |
| API-01 app part | **Rerun** as the first step of API-02-r2 | Free: the same fresh profile |
| API-02 | **Rerun** as `API-02-r2` | The install path now runs through the new attempt class; includes the sidebar check after a real automatic restart |
| API-03 | **Rerun** as `API-03-r2` | Same journey; one paid haiku turn |
| API-04 | **Rerun** as `API-04-r2` | The download rejection handler changed; a plain download failure must still be recorded and retried |
| API-05 | **Rerun** as `API-05-r2` | F-API-002 recheck |
| API-10 | **Rerun** as `API-10-r2` | A cheap diff and grep |

### New cases

- **API-02B (idle automatic install):** the same journey with no busy run; records the time from `update-downloaded` to quit and whether the quit bound or any error fires.
- **API-05B (refusal during a long stop):** V1 on the read-only image with a busy Claude run, so the preparation lasts many seconds after the refusal. Recovery must wait for it, then relaunch once. The busy run is stopped and not resumed (FU-003, accepted).

## Round 3 (API-REV-003): SR-004..SR-006, IR-003

- **Trigger:** code reviewer, CRR-005 Pass on IR-003. Code `2e64cbb3d9`; handoff `ed3f0d50f5`, `88814a7182`; review `99b53b84e8`, built from a clean checkout.
- **What changed:** on macOS the automatic install waits for Electron's native `update-downloaded` before stopping anything (15-minute bound). During the wait the server runs, status stays `downloaded`, `automaticInstallPreparing` is true, and no check or download runs. A native `error` in the wait records `install`, blocks V and recovers nothing. The 60 s bound measures only the quit. Not macOS: unchanged. Node path untouched.

### Reuse decisions

| Case | Decision | Why |
| --- | --- | --- |
| API-R3 | Reused the IR-003 implementation checks | On the reviewed code |
| API-01 (app + nodes), API-04, API-06..09 | Reused from rounds 1 and 2 | The switch-off path, the download-failure path up to the wait and the node path are not in this delta's order change. API-04's handler has a new guard (`settlingPreparationFailure`), unit-tested, and is exercised by API-05C/05 for its other arm |
| API-10 | Rerun | Cheap |

### Planned cases (real Squirrel)

| Case ID | Criteria | Steps |
| --- | --- | --- |
| API-02B-r3 | AC-002, idle | Records the wait's length, health through it, stop to quit, the row and sidebar after the restart |
| API-03-r3 | AC-003 | Busy run: its command stays alive through the wait; recorded at the stop; resumed with one notice |
| API-02D-r3 | AC-002, F-API-003 | A full `build:electron:mac` running; no false failure |
| API-05C-r3 | AC-005 | Signature refusal: during the wait, health 200, no relaunch, the plain reason, no repeat |
| API-05-r3 | AC-005 | Read-only image, several samples: error, error, rejection; one record; state stays `install-preparation` |
| API-11 | N-13 | Switch off; Download; Check (status `available`, staged); switch on: installs with no second fetch |
| API-12a | F-15, CR-C19 | Same V: Download, Check, Download again (a second native fetch), switch on: does Squirrel answer? |
| API-12b | F-15 | V staged with the switch off, W appears, switch on: second native fetch for a newer version |
| API-12c | F-15, REQ-004 | V refused in this process, W appears: a newer version after a native failure |
| API-13 | Bound's failure rendered | Seeded record; the live bound needs Squirrel silent for 15 minutes, with no cheap way to force it unless API-12 finds one |

V3 (`1.5.11-beta.12`) is built for API-12b and API-12c.

## Round 4 (API-REV-004): IR-004, the merge with `personal` after autobyteus-363

- **Trigger:** code reviewer, CRR-007 Pass on IR-004 (a `Local Fix` requested by delivery, DR-001).
  - Merge `08984df524`: `origin/personal` @ `fc5a726444` into `b0445f49b9`. Local only.
  - Handoff: `4a591d3159`.
  - Review: `482e9ce797`, built from a clean detached checkout of it.
- **What changed:**
  - 363 split `NodeServerUpdate` into a server `cell` and a row `notice`; 356's node switch now sits at the foot of the cell.
  - The refresh on an automatic change is limited to the cell.
  - `autoReported` keeps the notice from repeating an automatic result.
  - The desktop version on the merged base is `1.5.11-beta.11`.
- **Unchanged:** `git diff b0445f49b9 08984df524 -- autobyteus-web/electron` is empty. The app's automatic install, the main-process node policy and the updater are untouched, so round 3's real-Squirrel cases stand.

| Case | Decision | Why |
| --- | --- | --- |
| API-R4 | Reuse IMP-13 and IMP-14, plus a rerun of the Electron suite and the nodes and notifications web specs on the clean checkout | The node UI changed; the full web suite is the implementer's (5085 passed) |
| API-14 | **New:** a real node | A test-owned container on the published 1.5.11-beta.7 image with a throwaway key, and a signed 1.5.11-beta.11 package from the local release source, behind the logging proxy. Steps: the switch in the server cell at medium and wide widths and on the Nodes row; switched on, one main-process POST; the cell goes from progress to "Server 1.5.11-beta.11"; one "Updated automatically"; no notice repeating it; one window GET per row per refresh |
| Rounds 1–3 | Reused | Not touched by the merge |

## Investigation Decision

- Proceed: `Yes`. Durable coverage changes: `No`. Reroute: `No`.
- After execution (API-REV-001):
  - Result `Fail`, 86.1%. Failure-origin review requested.
  - F-API-001: sidebar entry "0 updated".
  - F-API-002: recovery after a native refusal leaves the app without its server.
  - The real install ran safely as planned (relaunched V2 isolated, user caches identical).
- After round 2 (API-REV-002):
  - Result `Fail`, 88.7%. Failure-origin review requested.
  - F-API-001 and F-API-002 resolved.
  - F-API-003 new.
  - API-05B not run; API-02C, API-02D and API-05C added.
- After round 3 (API-REV-003):
  - Result `Pass`, 93.9%. F-API-003 resolved. CR-C19 answered.
  - Residual O-6. API-11 needed a longer wait than planned (Squirrel's verify follows its "Download completed").
- After round 4 (API-REV-004):
  - Result `Pass`. The merged Nodes UI is proven on a real node in narrow, medium and wide layouts.
  - Rounds 1–3 reused.
