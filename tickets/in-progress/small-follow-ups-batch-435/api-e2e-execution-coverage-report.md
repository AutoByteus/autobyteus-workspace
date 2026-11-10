# API/E2E Execution Coverage Report — small-follow-ups-batch-435 (autobyteus-435)

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-002` (round 2; round 1 `API-REV-001`)
- Test progress log (when used): `api-e2e-test-progress.md`
- Round and trigger: **round 2**, after code review pass CRR-004 (head `b5da2d15a0`): F1/F2 rework (IR-004; SR-005 DEC-019, DEC-020) and items 13–14 (SR-004, IR-003). Round 1: after CRR-002 (head `d37397b40d`, code `f9cb6f7153`), items 1–12.
- Prior round reviewed: round 1 (API-REV-001, Fail: F1, F2). Both resolved this round (API-18 r2, API-13 r2).
- Round 2 deviations, and why:
  - **API-07 r2 attempt 1** is invalid as harness. The new setup script didn't wait for the fresh node to list its local models, so no viewer opened. The setup now waits, and the rerun is valid. Both are kept.
  - **API-19 (MSP-36)**: the first try ran from the wrong directory (nothing ran). The second hit a missing phone bundle, which the desktop build for API-13 had replaced; it was rebuilt. Both were harness; the third run passed.
  - **API-17 attempt 1**: 35/36 Pass. MSP-33 timed out tapping the delegated row. In the full run the Project Task Manager run is older than the newest five, and each reload closes the older-runs fold again (only the restored run's fold opens). My test now opens the fold after each return to the list. Attempt 2: 36/36 Pass.
  - The API-13 r2 desktop app is this worktree's packaged build (`isolated-app start --build`, default flavor). No build input changed, so the fresh-start proof (API-02) still holds.
- Round 1 deviations, and why:
  - **HEAD moved during the round.** `432d1c3af2` (IR-003: items 13–14 of SR-004, self-delegation words and the System instructions view) landed on the branch after the handoff and has not been through code review yet. Items 13–14 are not in this round. Device and desktop-app cases ran on the fresh-clone build of `d37397b40d`. The probe cases and the refusing node ran on worktree builds at `432d1c3af2`, whose extra commit touches none of the code those cases exercise (delegation refusal words, an Activity item).
  - **API-18 added.** The design's cutout branch for API 28–34 (`SHORT_EDGES`) was never run on such a platform, so I added an Android 14 emulator check. It found F1.
  - **API-12.** The first attempt answered every request with 502, so the app's start check (status URL) failed first and showed the existing "Can’t reach" screen. REQ-007's overlay belongs to the page load (DS-008), so the rerun answers 502 only for `GET /mobile`. Attempt 1 is kept and marked.
  - **API-13.** The refused names are `127.0.0.1.nip.io` and `127-0-0-1.nip.io`: public DNS names that resolve to 127.0.0.1 and fall outside the node's allowed-host class. This avoids editing `/etc/hosts`.
  - **API-14.** MSP-33's first run failed on its own timing: it read the node's stored conversation the moment the route changed. The test now waits; rerun alone, Pass. Every route assertion had passed in the first run too.
  - **API-17 (full phone probe) deferred.** F1 and F2 need product changes, so a full run now would be repeated after the rework. The new and neighbouring cases ran (API-14…16), and IMP-15's full run on `f9cb6f7153` still holds for the product code of items 1–12.
  - **API-18 attempt 1** was stopped by the user's interruption (app restart) mid-run, with no result. It was rerun from the start.
- Evidence folder (absolute path; the handoff message gives the commit that holds it): `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/evidence/api-e2e/` (round 1 at the top level, scripts in `probes/`; round 2 in `round2/`, scripts in `round2/probes/`)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (round 2 passes; reviewed High route). Requested in the handoff for MSP-33, MSP-34, MSP-35, MSP-36 and MSP-05's label.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | `d37397b40d` (fresh clone) | macOS 26.5.2 arm64, Node v22.23.1, pnpm 10.28.2, Docker 29.0.1, JDK + Android SDK 35 | `pnpm install --frozen-lockfile`; `build:electron:mac -- --arm64` (personal, unsigned); buildx `server-package` (linux/arm64); `:app:assembleDebug :app:assembleDebugAndroidTest` | `/private/tmp/abx435-api/fresh-clone` (removed after the round) |
| ENV-2 | `d37397b40d` | test Docker node `abx435-api-node`: `autobyteus/autobyteus-server:beta` (`52db87304cc4`) with ENV-1's server package mounted read-only over `/opt/autobyteus/server-package` | Xfce desktop, Chromium, noVNC (image) | `127.0.0.1:60467` (`10.0.2.2` from the emulator); 5 fresh `abx435-api-*` volumes; launch owner credential generated per run (never written); `LMSTUDIO_HOSTS` → host LM Studio `google/gemma-4-26b-a4b` (one message, unloaded after) |
| ENV-3 | `d37397b40d` | emulator-5600, ticket-owned AVD `abx435_api35`: Android 15, `google_apis` arm64, Pixel 7 1080×2400 @420 dpi (2.625), punch-hole cutout (`cutoutSpec`), WebView 124.0.6367.219, Gboard, gesture navigation, headless | ENV-1 APKs | paired with ENV-2 by the share intent; DevTools (`webview_devtools_remote_<pid>`) for page state, `dumpsys` for the window, real taps with `adb input tap`; `immersive_mode_confirmations=confirmed` set so Android's one-time hint (REQ-009, system behavior) holds no focus; landscape direction through `adb emu sensor set acceleration` |
| ENV-4 | `d37397b40d` | ENV-3 + test proxy `127.0.0.1:63826` → ENV-2 (`pass`, `stopped`, `502`, `502page`) | ENV-1 APK | app data cleared before API-11; node saved as "abx435 Proxy Node" |
| ENV-5 | `d37397b40d` app; node at `432d1c3af2` | macOS; isolated desktop instance `iso-52527-2f42` (`pnpm --silent isolated-app start --app <fresh-clone AutoByteus.app>`), window origin `file://` | ENV-1 packaged app; test node = worktree `autobyteus-server-ts/dist` on `127.0.0.1:52498` with its own data root/HOME (Host gate unchanged by this ticket) | own data root and ports; driven over CDP |
| ENV-6 | worktree `432d1c3af2` + this round's probe edits | macOS, headless Google Chrome (playwright-core) | `pnpm -C autobyteus-server-ts build`, `pnpm -C autobyteus-web build:mobile-web`, the probe's own nodes and `nuxt dev` | probe-owned data roots; phones 390×844; desktop window 1440×1400 |
| ENV-8 | `b5da2d15a0` (worktree) | macOS; test Docker node `abx435r2-api-node` (`autobyteus/autobyteus-server:beta` with the worktree's buildx `server-package`, read-only), `127.0.0.1:56137`; emulators emulator-5600 `abx435r2_api35` (Android 15, WebView 124) and emulator-5602 `abx435r2_api34` (Android 14, WebView 113), Pixel 7 cutout, headless | worktree `:app:assembleDebug :app:assembleDebugAndroidTest` (`app-debug.apk` sha256 `cb893e3b0369f974`) | paired by the share intent; draft runs only (no model call); `immersive_mode_confirmations=confirmed`; auto-rotate off |
| ENV-9 | `b5da2d15a0` (worktree) | macOS; isolated desktop instance `iso-61038-68f7` (`pnpm --silent isolated-app start --build`), window `file://` | worktree packaged app | test node = worktree server dist on `127.0.0.1:61177`, own data root/HOME; closed port 61178; a plain HTTP server answering 403 on 61442 |
| ENV-10 | `b5da2d15a0` + this round's probe edits | macOS, headless Google Chrome | worktree `pnpm -C autobyteus-server-ts build`, `pnpm -C autobyteus-web build:mobile-web` | the probe's own nodes, data roots, phones (390×844), desktop window |
| ENV-7 | `d37397b40d` | emulator-5602, ticket-owned AVD `abx435_api34`: Android 14, `google_apis` arm64, Pixel 7, same cutout (`DisplayCutout{insets=Rect(0, 136 - 0, 0)`), WebView 113.0.5672.136, headless | ENV-1 APK | paired with ENV-2; a draft run's viewer (no message, no model call) |

## Cases

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 (r2) | AC-003-1/2/3 (unit), AC-004-1 (unit, instrumented API 34/29), AC-013-1, AC-014-1, AC-014-2 | web, server, Android units; instrumented API 34 and 29; rendered item 14 | Reused IMP-16, IMP-17, IMP-18, IMP-19, IMP-20 | — | Pass | (implementation rows) | IMP-18 `Tests  5587 passed`, server `Tests  8266 passed`; IMP-19 `unit tests 106 failures 0`; IMP-20 API 34 `14/0 failures`, API 29 `14, 0 failures, 3 skipped`; IMP-16 `Tests  1056 passed`; IMP-17 `preHasOwnScroll false`, `textLength 15818` | ran on `06a072014f` (code as HEAD; `b5da2d15a0` adds documents). `SystemInstructionActivityItem.vue` unchanged since `432d1c3af2` (IMP-17) |
| API-06 (r2) | AC-004-2, AC-004-1 (window) | instrumented tests, API 35 | `adb -s emulator-5600 shell am instrument -w -r org.autobyteus.mobile.test/androidx.test.runner.AndroidJUnitRunner` | ENV-8 | Pass | `round2/API-06-instrumented-api35-r2.txt` | `OK (14 tests)` | API 34 and 29 by IMP-20 |
| API-07 (r2) | AC-004-1 (API 35) | viewer full screen, both directions | `round2/probes/setup-viewer.sh probes/env.sh`; `api07.sh`; `api07b.sh probes/env.sh API-07-r2` | ENV-8 | Pass | `round2/API-07-r2.txt`, `round2/API-07-1-full-screen-dir1.png`, `round2/API-07-2-fill-dir1.png`, `round2/API-07-r2-fill-rot270.png`; attempt 1 (harness) `round2/API-07-r2-attempt1-setup-incomplete.txt` | `F1 … ROTATION_90 … "viewport":[915,412] … "screen":[915,412]`; `G1 … ROTATION_270 … "viewport":[915,412]`; Fill both `"canvas":[0,-51,915,515]`; `G3 … ROTATION_0 … "viewport":[412,839]` | API 35 unchanged by DEC-020, as required |
| API-18 (r2) | AC-004-1 (API 34), DEC-020 | viewer full screen on Android 14 | `round2/probes/setup-viewer.sh probes/env34.sh`; `api18m.sh` | ENV-8 | Pass | `round2/API-18-r2.txt`, `round2/API-18-fill-a.png` (ROTATION_90), `round2/API-18-fill-b.png` (ROTATION_270) | `H1 … ROTATION_90 … "viewport":[915,412]`, `content frame: … 0,0-2400,1080 #1020002 android:id/content`; same at ROTATION_270; Fill `"canvas":[0,-51,915,515]` both; `H3 full screen off … "viewport":[412,839]`, `content frame: … 0,136-1080,2337` (as H0) | **F1 resolved** (round 1: page 863, content frame at x=136) |
| API-08b | AC-006-1 on Android 14 (keyboard with decor fitting off) | Clipboard sheet, keyboard open, real taps | `round2/probes/api08b.sh` | ENV-8 | Pass | `round2/API-08b-r2.txt`, `round2/API-08b-1-keyboard-open-send-visible.png`, `round2/API-08b-2-after-send.png` | `"visual":[915,151,0]`, `"send":[766,107,134,44]`, `"topAtSendCentre":"mobile-node-desktop-clipboard-send"`, `mInputShown=true`; `node clipboard after Send: 'abx435-sent-in-full-screen'` | new this round: the decor change below API 35 could have moved the keyboard inset |
| API-13 (r2) | AC-003-1 (DEC-019), AC-003-3 | Electron window Nodes page ↔ real node Host gate | `round2/probes/refnode.sh`, `electron-nodes.mjs`, `electron-rows-shot.mjs`, `electron-eval.mjs`, `plain403.mjs` | ENV-9 | Pass | `round2/API-13-r2-electron-nodes-page.txt`, `round2/API-13-r2-row-abx435-row.png`, `round2/API-13-r2-row-abx435-add.png`, `round2/API-13-r2-row-abx435-closed.png`, `round2/API-13-r2-row-abx435-other403.png` | row (node restarted without the name) and Add: `Not reachable. The node at this address doesn’t accept the name 127.0.0.1.nip.io. Add 127.0.0.1.nip.io to AUTOBYTEUS_ALLOWED_HOSTS on that node, or use its IP address.` (status requests 2: no opaque request); closed port `No answer from that address.` (4); plain 403 `Something answers there, but it isn't an AutoByteus node.`; window read `{"status":403,"type":"basic","code":"REMOTE_ACCESS_HOST_REFUSED"}` | **F2 resolved** |
| API-19 | AC-013-1 | `delegate_task` through a real agent tool call on a live node (durable MSP-36) | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<new> --cases=MSP-36`, and in API-17 | ENV-10 | Pass | `round2/API-19-msp36-alone.json`, `round2/API-17-full-probe-excerpt.txt` | `/project_task_manager is your own address; you can't delegate to yourself. Do the work yourself, or delegate it to another agent or agent team.`; `/lead is your own address; …`; `/mate is in your own team; you can't delegate to it. Talk with it using send_message_to.`; code `COLLABORATION_SELF_TARGET_REJECTED`; `ptmNodes: {'before': 18, 'after': 18}` | standalone and Team member senders; Org senders by IMP-16 |
| API-17 (r2) | AC-001-1, AC-010-3, AC-005-1/3/4/6/7/8, AC-011-1/2, AC-013-1, all MSP | full phone probe at the final commit | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=/private/tmp/abx435-api2/probe-full2` (worktree root) | ENV-10 | Pass | `round2/API-17-full-probe-excerpt.txt`, `round2/API-17-full-probe/mobile-shell-probe.json`, `round2/API-17-full-probe/MSP-3*.png`; attempt 1 `round2/API-17-attempt1/` | `result Pass`; 36/36 `Pass`; `unknownBrowserErrors: 0`; `failed requests to localhost:8000/health: 0`; MSP-32 `"refused": [], "refusedSockets": [], "socketsOpened": 0`; cleanup `"serversLeft": 0, "rootRemoved": true` | attempt 1: 35/36, MSP-33 test fold issue (fixed), see Deviations |
| API-01 | AC-001-2, AC-002-1, AC-003-2, AC-003-3, AC-004-2 (unit), AC-005-1…8 (unit), AC-006-2, AC-007-1 (unit), AC-008-1 (unit), AC-010-1, AC-010-2, AC-011-2, AC-012-1 | web, server, contracts, Android units | Reused IMP-13, IMP-06, IMP-07, IMP-08, IMP-09 | — | Pass | (implementation rows) | IMP-13 `Tests  5586 passed`, typecheck `PASS`; IMP-06 `# fail 0`; IMP-07 `Tests  29 passed`; IMP-08 rerun `Tests  1 passed`; IMP-09 `unit tests 103 failures 0` | `git diff --name-only f9cb6f7153 d37397b40d`: only `docs/design-cases.md` and ticket files. Server, contracts and Android are unchanged since `e5ca0e1da7`/`6ca743fee0` |
| API-02 | build inputs (contracts `dist`, `generated/graphql.ts`, `typecheck-baseline.json`) | release desktop job, fresh clone | `evidence/api-e2e/API-02-fresh-start-build.sh d37397b40d`: fresh `git clone --no-local`, `pnpm install --frozen-lockfile`, `build:electron:mac -- --arm64` with the job's environment, then the job's two verify steps (Prisma, terminal runtime incl. `--spawn-probe`) | ENV-1 | Pass | `API-02-fresh-start-build.txt`, `API-02-build-log-excerpt.txt`, `API-02-fresh-start-build.sh` | `install exit=0`; `[typecheck] PASS`; `build exit=0`; `PRISMA exit=0`; `[terminal-runtime] ok: node-pty spawn probe`; `TERMINAL exit=0` | Signing, notarization, x64 and the other OS jobs need the runner (not tested) |
| API-03 | words, web boundaries | web guards at the commit under test | ran inside API-02's build | ENV-1 | Pass | `API-02-fresh-start-build.txt` | `[guard:web-boundary] Passed.`; `[guard:localization-boundary] Passed.`; `[audit:localization-literals] Passed with zero unresolved findings.` | covers the rework's new files |
| API-04 | release server image build input | `Dockerfile.monorepo` `server-package` stage | `evidence/api-e2e/API-04-05-builds.sh` (buildx, linux/arm64, from the fresh clone) | ENV-1 | Pass | `API-04-05-builds.txt` | `API-04 exit=0`; `taskExecutionReferenceKey in the package's contracts: …/root-execution-view-dtos.js` | also the test node's server (ENV-2); the node's starter log says `App root directory: /opt/autobyteus/server-package` |
| API-05 | Android build | APK + test APK from the fresh clone | same script | ENV-1 | Pass | `API-04-05-builds.txt` | `BUILD SUCCESSFUL`; `API-05 exit=0`; `app-debug.apk sha256 6ad1aad86d910141` | no Android build input changed: the empty-Gradle-home build is not required |
| API-06 | AC-004-2, AC-004-1 (window), preserved shell | instrumented tests, API 35 | `adb -s emulator-5600 shell am instrument -w -r org.autobyteus.mobile.test/androidx.test.runner.AndroidJUnitRunner` | ENV-3 | Pass | `API-06-instrumented-api35.txt` | `OK (13 tests)`, incl. `SystemBarInsetsTest#inDesktopFullScreenOnlyTheKeyboardPadsTheRoot`, `#padsTheRootWithTheBarsAndTheCutout`, `DesktopFullScreenWindowTest#fullScreenTurnsToLandscapeAndHidesTheBarsAndOffGivesBothBack` | previously compiled only (IMP-09) |
| API-07 | AC-004-1 | viewer full screen, both landscape directions, Android 15 | `probes/api07.sh` + part 2 (Fill at ROTATION_270, leaving full screen) | ENV-3, ENV-2 | Pass | `API-07-full-screen-both-directions.txt`, `API-07-1-full-screen-dir1.png`, `API-07-2-fill-dir1.png`, `API-07-4-fill-dir2.png`, `API-07-5-after-exit-portrait.png` | `F1 … ROTATION_90 … "viewport":[915,412] … "screen":[915,412] … "stage":[0,0,915,412]`; `Frames: … frame=[0,0][2400,1080]`; `G1 … ROTATION_270 … "viewport":[915,412]`; Fill both directions `"canvas":[0,-51,915,515]`; `G3 … ROTATION_0 … "viewport":[412,839]` (as F0) | 432 measured the strip 136 px narrower; now the page is the screen's width |
| API-08 | AC-006-1 | Clipboard sheet with the keyboard open, landscape full screen, real taps | `probes/api08.sh` | ENV-3, ENV-2 | Pass | `API-08-clipboard-send-keyboard.txt`, `API-08-1-keyboard-open-send-visible.png`, `API-08-2-after-send.png` | `"visual":[915,151,0]`, `"send":[766,107,134,44]`, `"topAtSendCentre":"mobile-node-desktop-clipboard-send"`, `keyboard: mInputShown=true`; `tapped mobile-node-desktop-clipboard-send at device 2185 339`; `node clipboard after Send: 'abx435-sent-in-full-screen'` | in the screenshot the label above the field is cut by the sheet's scroll ("Paste to the desktop"); field and Send are fully shown, which is what DEC-005 asks. Recorded as an observation, not a failure |
| API-09 | AC-005-2 | Android process death, viewer in full screen | `probes/api09.sh` (Home, pid-checked `am kill`, launcher) | ENV-3, ENV-2 | Pass | `API-09-viewer-full-screen-process-death.txt`, `API-09-reopened-viewer-full-screen.png` | `E2 … pid=` (ended); `E3 reopened from the launcher (new pid 5456) \| ROTATION_90 requested=SCREEN_ORIENTATION_SENSOR_LANDSCAPE bars: visible=false visible=false … "q":"?row=agent:daily_assistant_821b…&screen=desktop&full=1" … "viewer":true` | samples never show the list |
| API-10 | AC-005-6 (Android) | Create run → first message → Activity → process death | New run → model → Create run → message (inline), then `probes/api10.sh` | ENV-3, ENV-2 | Pass | `API-10-android-created-run-process-death.txt`, `API-10-reopened-activity.png` | Create run `?row=agent:temp-1794298315248-1&screen=run`; after the send `?row=agent:daily_assistant_821b…&screen=run`; `sample 11: … "run":"opening","opening":true`; `sample 12: … "activity":true`; `D3 reopened … (new pid 4912)` same query | the created-run route on the phone's real WebView |
| API-11 | AC-008-1 | pairing link, node unreachable at first load, Retry | `probes/api11.sh` (app data cleared; proxy stopped → share → overlay; proxy pass → real tap Retry) | ENV-4 | Pass | `API-11-pairing-retry.txt`, `API-11-1-first-load-unreachable.png`, `API-11-2-after-retry-pairing-page.png`, `API-11-3-paired.png`, `API-11-proxy.log` | `R1 overlay … Can’t reach abx435 Proxy Node … Retry`; `paired phone devices on the node before: 1` → `after: 2`; `R3 paired: … "connected":true,"node":true`; after pairing: `R5 after Retry: … "path":"/mobile/","connected":true` | a cleared app can only be paired by the link's code, so the device count and "Connected" show the code was used. 433's FU-003 is resolved |
| API-12 | AC-007-1 | HTTP error on the node's page | `probes/api12.sh` (proxy `502page`: 502 for `GET /mobile` only) | ENV-4 | Pass | `API-12-http-error-overlay.txt`, `API-12-overlay-502.png`, `API-11-proxy.log`; attempt 1: `API-12a-attempt1-all-requests-502.txt`, `API-12a-attempt1-cant-reach-screen.png` | `Can’t open abx435 Proxy Node \| abx435 Proxy Node answered, but its page didn’t open (error 502).… Check that AutoByteus is running on the computer, then tap Retry.`; `forbidden words present: []`; proxy `502 for GET /mobile` | attempt 1 (every request 502) is harness, see Deviations |
| API-13 | AC-003-1 | Electron window (`file://`) Nodes page ↔ a real node's Host gate | isolated instance of the fresh-clone app; `probes/refnode.sh` node; `probes/electron-nodes.mjs`: Add while the name is allowed → node restarted without it → row asked again; Add a refused name; Add a closed port. Then `probes/electron-eval.mjs` and `probes/chrome-compare.mjs` for the cause | ENV-5 | **Fail** | `API-13-electron-nodes-page.txt`, `API-13-row-abx435-row.png`, `API-13-row-abx435-add.png`, `API-13-row-abx435-closed.png`, `API-13-1-row-added-allowed.png` | row and Add with a refused name: `Not reachable. Something answers there, but it isn't an AutoByteus node.` (expected "Something answers at <host>, but it refuses this window…"); closed port: `Not reachable. No answer from that address.` (today's, as expected); Electron window `readable fetch -> {"status":403,"type":"basic"}`; Chrome `file://` and `http` pages `TypeError: Failed to fetch` / `{"type":"opaque"}` | **F2**, see Preliminary Classification |
| API-14 | AC-005-1, AC-005-3, AC-005-6, AC-005-7, AC-005-8 | phone bundle reload restore (durable MSP-33) | r1: `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<r1> --cases=MSP-05,MSP-33,MSP-24,MSP-25,MSP-26,MSP-34,MSP-27,MSP-35`; r2 after the test fix: `--cases=MSP-33` | ENV-6 | Pass (r2) | `API-14-16-probe-excerpt.txt`, `API-14-probe-r2/mobile-shell-probe.json`, `API-14-probe-r2/MSP-33-*.png`; r1 in `API-14-16-probe-r1/` | r2 `MSP-33: Pass`; each restore `reached True same query True opening True listShown False` (agent Activity, Team Messages, Team member, delegated task agent); `gone … 'runScreen': None`; before the send `?row=agent:temp-…&screen=run -> ?row=agent:temp-… runScreen None list reached True`; after the send `?row=agent:project_task_manager_ea3a…&screen=run; stored True; forward …&screen=activity`; reload → Activity, Back `…&screen=run` | r1 failed only on its own read timing (`stored False`), see Deviations |
| API-15 | AC-011-1, AC-011-2 (phones) | stopped host, two phones, live node (durable MSP-34) | r1 above | ENV-6 | Pass | `API-14-16-probe-excerpt.txt`, `API-14-16-probe-r1/mobile-shell-probe.json`, `MSP-34-*.png` | `"isActive": false`; `stoppedBefore … "viewReads": {"phoneHost": 0, "phoneOther": 0}, "statusReadsNamingPtm": 3`; after the close `"goneAfterCloseMs": {"phoneOther": 2685, "phoneHost": 842}`, `"viewReads": {"phoneHost": 1, "phoneOther": 1}`; host still `"isActive": false` | MSP-24…26 (active-host rule, 446) also Pass in the same run |
| API-16 | AC-011-1 (desktop) | stopped host, desktop window Runs view (durable MSP-35) | r1 above | ENV-6 | Pass | same files, `MSP-35-*.png` | `"before": {"listed": true, "viewReads": 0, "statusReadsNamingPtm": 2}`; `"goneAfterCloseMs": 3988, "viewReads": 1`; after TODO `"nodeStillClosed": true, "listed": false, "viewReads": 0` | MSP-27 (446, active host) Pass in the same run |
| API-17 | AC-001-1, AC-010-3, MSP-01…35 together | full phone probe | — | — | Not Tested | — | — | deferred to the rework round (see Deviations). IMP-15 (`f9cb6f7153`, 32/32, `unknownBrowserErrors: 0`, MSP-32 `refused: [] refusedSockets: []`) holds for the product code. MSP-05's assertion changed only in its label and passed in r1 |
| API-18 | REQ-004 (design DS-005, API 28–34 branch) | viewer full screen, Android 14 | `probes/api18.sh` (paired, draft run, viewer, full screen, both directions, Fill, off), then `dumpsys activity top` | ENV-7, ENV-2 | **Fail** | `API-18-android14-full-screen.txt`, `API-18-fill-a.png`, `API-18-fill-b.png`, `API-18-fill-cutout-strip-api34.png`; stopped attempt `API-18-interrupted-attempt.txt` | `layoutInDisplayCutoutMode=shortEdges frame=[0,0][2400,1080]` but `"viewport":[863,412] … "screen":[915,412]`, `"stage":[0,0,863,412]` in both ROTATION_90 and ROTATION_270, Fill `"canvas":[0,-37,863,486]`; view tree `FrameLayout{… 136,0-2400,1080 #1020002 android:id/content}` | **F1**, see Preliminary Classification |

## Acceptance-Criteria Proof

Round 2 is authoritative. A case without "(r2)" is from round 1 and still valid: nothing it exercises changed (see the investigation's Round 2 Plan).

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001-1 | Yes | API-17 (r2) | Proven | — |
| AC-001-2 | No | API-01 | Proven | — |
| AC-002-1 | No | API-01, API-02 | Proven | — |
| AC-003-1 | Yes | API-13 (r2) | Proven | — |
| AC-003-2 | No | API-01 (r2, unit); API-13 round-1 Chrome comparison (the opaque request answers in a browser page) | Proven | — |
| AC-003-3 | No | API-01 (r2); API-13 (r2) request counts (one readable request for a refusal, the opaque one only after a failed fetch) | Proven | — |
| AC-004-1 | Yes | API-07 (r2) API 35, API-18 (r2) API 34, both directions; API-01 (r2) IMP-20 API 34/29 instrumented | Proven | other vendors' cutouts (UNK-001): only the user's phone |
| AC-004-2 | No | API-06 (r2), API-07 (r2), API-18 (r2) (off: content frame and viewport as before) | Proven | — |
| AC-005-1 | Yes | API-17 (r2) MSP-33, API-09 | Proven | — |
| AC-005-2 | Yes | API-09 | Proven | — |
| AC-005-3 | No | API-17 (r2) MSP-33 | Proven | — |
| AC-005-4 | No | API-17 (r2) MSP-05 | Proven | — |
| AC-005-5 | No | API-01 (unit) | Proven (unit) | — |
| AC-005-6 | Yes | API-17 (r2) MSP-33, API-10 | Proven | — |
| AC-005-7 | No | API-17 (r2) MSP-33 (`opening True listShown False`), API-10 | Proven | — |
| AC-005-8 | No | API-17 (r2) MSP-33 | Proven | — |
| AC-006-1 | Yes | API-08 (API 35), API-08b (API 34) | Proven | — |
| AC-006-2 | No | API-01 | Proven | — |
| AC-007-1 | No | API-12, API-01 | Proven | — |
| AC-008-1 | Yes | API-11 | Proven | — |
| AC-009-1 | No | docs (delivery's docs review) | Not proven here: delivery's check | — |
| AC-010-1 | Yes | API-01 | Proven (unit per owner) | — |
| AC-010-2 | Yes | API-01, API-17 (r2) MSP-13, MSP-32 | Proven | — |
| AC-010-3 | Yes | API-17 (r2) | Proven | — |
| AC-011-1 | Yes | API-17 (r2) MSP-34 (phones), MSP-35 (desktop) | Proven | — |
| AC-011-2 | No | API-17 (r2) MSP-34/35 (`viewReads` 1 per close, 0 while nothing changes) | Proven | — |
| AC-012-1 | No | API-01, API-04 | Proven | — |
| AC-013-1 | Yes | API-19 / API-17 (r2) MSP-36; API-01 (r2) IMP-16 | Proven | — |
| AC-014-1 | Yes | API-01 (r2): IMP-17 (rendered phone and desktop), IMP-16 | Proven | — |
| AC-014-2 | No | API-01 (r2): IMP-17, IMP-16 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

Round 2 scores. Round 1's are in `api-e2e-revision-record.md` (API-REV-001: 79%, Fail).

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 96% | every critical AC directly proven: devices API 35 and 34 (API-07, API-18, API-08, API-08b, API-09…12), packaged desktop app (API-13), live nodes (API-17) | AC-009-1 is delivery's docs review | — |
| Changed-boundary execution directness | 85% | 96% | the real Electron window and node gate; real WebView windows on two Android versions with a real node desktop and clipboard; live nodes with stopped hosts; real tool calls for item 13 | API 26–28 (no image for 28; 26–27 have no cutout) | a device on API 28 |
| Cross-boundary integration realism and mock gap | 80% | 95% | no mocks on the proven paths; scripted AGY and LM Studio only where no inference matters | the test proxy stands in for a down node or a 5xx front (API-11/12) | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | fresh-clone release build (API-02, no build input changed since), test-owned node image, two Android versions, packaged desktop app | vendor phones, signed builds | the user's phone after release |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | process death ×2, Retry, 502, closed port, plain 403, stopped host close/TODO, reload before/after the send, revocation (MSP-32) | — | — |
| User-surface, browser, and desktop-shell confidence | 80% | 95% | phone bundle 36/36, desktop window MSP-35/MSP-27, Electron window API-13 (r2) | — | — |
| Durable regression coverage quality and relevance | 85% | 92% | MSP-33…36 added and passing in the full probe; the rework added real-window instrumented tests that run below API 35 (IMP-20) | the device journeys (API-07…13, 18) are run by hand with the scripts in `evidence/api-e2e/round2/probes/`; no CI runs emulators | an emulator lane in CI (out of scope) |

- Overall post-repository confidence: 84%
- Overall final confidence: 95% (simple average 95.4%)
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: API 26–28 not on a device (unit + API 29 instrumented by IMP-20); vendor cutouts (user-only); device journeys are not automated in CI.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed in both rounds)
- Execution mode: `Other` (Android emulators API 35 and 34 with a test Docker node), `Project Desktop Validation` (isolated instance of a packaged build), `Browser` (full phone probe), `Lifecycle` (process death, reload)
- Confidence gap or residual risk it addresses, and the expected gain: the device, desktop-shell and live-node behavior that unit tests could only mock. Round 1 found F1 and F2; round 2 proves their fixes on the same surfaces.
- Browser validation needed, and why or why not: yes. Restore, stopped-host refresh, revocation and item 13 run on the phone bundle and a live node (TESTING.md: renderer behavior the phone offers is proven on the phone bundle).
- If `Not Required`: —
- If `Blocked`: —

## Desktop Application Validation

- Approach executed: round 1, the fresh-clone packaged app (`d37397b40d`); round 2, the worktree's packaged build (`b5da2d15a0`), each as an isolated instance with test-owned nodes.
- Cases proving web-equivalent behavior, and cases proving shell-specific or lifecycle behavior: web-equivalent: API-17 MSP-27/35 (desktop Runs view in a browser window), API-13 round-1 Chrome comparison. Shell-specific: API-13 (r2), the `file://` window reading the node's refusal.
- Effect on any already-running desktop application: `None`. Own data roots and ports; both instances stopped (`isolated-app list`: none running).
- Behavior not directly proven and its confidence consequence: none.

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Not Affected`.
- Representative existing data used: the Android saved page URL across process death (API-09, API-10).
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the outcome: API-09, API-10.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`. DEC-020's API-level branch is platform behavior, not data compatibility.
- Residual untested persisted-data risk: none material.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: —
- Upstream recipient notified: —

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed: `Yes` (rounds 1 and 2)

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` MSP-33 (+ header) | Added (r1); r2: waits for the stored message; opens the older-runs fold after each return to the list | API-14, API-17 | — |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` MSP-36 (+ header) | Added (r2) | API-19, API-17 | — |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` MSP-05 comment and assertion message ("an Org entry … (AC-005-4)") | Updated (r1) | API-17 | — |
| `autobyteus-web/tests/e2e/mobile-closed-task-rows-cases.mjs` MSP-34, MSP-35 (+ header) | Added (r1) | API-15, API-16, API-17 | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: none removed

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| A phone | Android emulators (API 35, API 34) | team rule: no physical phone | vendor skins, other cutout shapes (UNK-001) |
| A node that is down / answers 5xx | test TCP proxy in front of the test node (round 1) | a container restart would lose the pairing session | network-path stand-in |
| Something that answers 403 without a refusal code | a plain HTTP server (round 2) | AC-003-1's alternate outcome needs one | none |
| Model provider | local LM Studio (round 1, Docker node), scripted AGY CLI (probe) | no paid inference needed | none for these behaviors |
| A host name the node refuses | public `*.nip.io` names resolving to 127.0.0.1 | no `/etc/hosts` change on the user's machine | none |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Round 1: fresh clone, test node `abx435-api-node` + volumes, AVDs `abx435_api35/34`, proxy, refusing node, isolated instance `iso-52527-2f42`, LM Studio model | Yes | removed / stopped / unloaded (round 1) | none left |
| Round 2: test node `abx435r2-api-node` + 5 `abx435r2-*` volumes | Yes | `docker rm -f -v`, `docker volume rm` | `docker volume ls`: 0 `abx435`; `autobyteus-server-0/1/2` untouched |
| Round 2: emulators emulator-5600/5602, AVDs `abx435r2_api35`, `abx435r2_api34` | Yes | `emu kill`, `avdmanager delete avd` | deleted; other agents' AVDs never addressed |
| Round 2: isolated instance `iso-61038-68f7`, refusing node (port 61177) and data root, plain 403 server | Yes | `isolated-app stop`, process ended, `rm -rf` | none running |
| Round 2 scratch `/private/tmp/abx435-api2` (incl. owner credential and pairing-link files) | Yes | `rm -rf` after the evidence copy | removed |
| Probe stacks (all runs) | Yes (probe) | the probe's own cleanup | `"serversLeft": 0, "rootRemoved": true` |
| Worktree build outputs (`autobyteus-web/electron-dist`, `dist`, server `dist`) | Yes (rebuilt) | left in place: untracked build outputs of this worktree (TESTING.md § Build outputs) | — |
| Device helper scripts | Yes | kept as evidence (`evidence/api-e2e/probes/`, `round2/probes/`) | — |

## Round 1 Failures (Resolved)

- **F1** (REQ-004 on Android 9–14). Round 1, API-18: page 863 of 915 CSS px; `android:id/content` at `136,0-2400,1080`. Preliminary `Design Impact`, confirmed by failure-origin review as CR-002 and resolved by DEC-020 (IR-004). Round 2, API-18 (r2): content frame `0,0-2400,1080`, page 915, Fill 915 in both directions; off as before.
- **F2** (AC-003-1 in the Electron window). Round 1, API-13: "isn't an AutoByteus node" for a refused name. Preliminary `Design Impact`, confirmed as CR-003 and resolved by DEC-019 (IR-004). Round 2, API-13 (r2): the `host_refused` words on the row and on Add.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): AC-009-1 is delivery's docs review. Only the user can check: vendor phones' cutouts (UNK-001); I tried the two Android versions available as emulators with the Pixel 7 cutout. Not run on a device: API 26–28 (unit tests and IMP-20's API 29 cover the same pre-30 path).
- Preliminary classification and recommended owner (on `Fail`): —
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (proportional test-code review; Medium / High).
- Notes for delivery (carried): `autobyteus-web/docs/chat.md` lines 359 and 555 still name `composables/chat/useChatRouteRunSync.ts` and its spec path (C-09).
