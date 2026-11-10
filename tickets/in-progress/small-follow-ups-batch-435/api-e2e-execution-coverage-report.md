# API/E2E Execution Coverage Report — small-follow-ups-batch-435 (autobyteus-435)

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log (when used): `api-e2e-test-progress.md`
- Round and trigger: round 1, after code review pass CRR-002 (head `d37397b40d`, code `f9cb6f7153`), items 1–12 (SR-003)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why:
  - **HEAD moved during the round.** `432d1c3af2` (IR-003: items 13–14 of SR-004, self-delegation words and the System instructions view) landed on the branch after the handoff and has not been through code review yet. Items 13–14 are not in this round. Device and desktop-app cases ran on the fresh-clone build of `d37397b40d`. The probe cases and the refusing node ran on worktree builds at `432d1c3af2`, whose extra commit touches none of the code those cases exercise (delegation refusal words, an Activity item).
  - **API-18 added.** The design's cutout branch for API 28–34 (`SHORT_EDGES`) was never run on such a platform, so I added an Android 14 emulator check. It found F1.
  - **API-12.** The first attempt answered every request with 502, so the app's start check (status URL) failed first and showed the existing "Can’t reach" screen. REQ-007's overlay belongs to the page load (DS-008), so the rerun answers 502 only for `GET /mobile`. Attempt 1 is kept and marked.
  - **API-13.** The refused names are `127.0.0.1.nip.io` and `127-0-0-1.nip.io`: public DNS names that resolve to 127.0.0.1 and fall outside the node's allowed-host class. This avoids editing `/etc/hosts`.
  - **API-14.** MSP-33's first run failed on its own timing: it read the node's stored conversation the moment the route changed. The test now waits; rerun alone, Pass. Every route assertion had passed in the first run too.
  - **API-17 (full phone probe) deferred.** F1 and F2 need product changes, so a full run now would be repeated after the rework. The new and neighbouring cases ran (API-14…16), and IMP-15's full run on `f9cb6f7153` still holds for the product code of items 1–12.
  - **API-18 attempt 1** was stopped by the user's interruption (app restart) mid-run, with no result. It was rerun from the start.
- Evidence folder (absolute path; the handoff message gives the commit that holds it): `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/evidence/api-e2e/` (scripts in `probes/`)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` once validation passes. This round ends `Fail`, so it asks for failure-origin review. The durable test changes below are in the same commit for that review to see.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | `d37397b40d` (fresh clone) | macOS 26.5.2 arm64, Node v22.23.1, pnpm 10.28.2, Docker 29.0.1, JDK + Android SDK 35 | `pnpm install --frozen-lockfile`; `build:electron:mac -- --arm64` (personal, unsigned); buildx `server-package` (linux/arm64); `:app:assembleDebug :app:assembleDebugAndroidTest` | `/private/tmp/abx435-api/fresh-clone` (removed after the round) |
| ENV-2 | `d37397b40d` | test Docker node `abx435-api-node`: `autobyteus/autobyteus-server:beta` (`52db87304cc4`) with ENV-1's server package mounted read-only over `/opt/autobyteus/server-package` | Xfce desktop, Chromium, noVNC (image) | `127.0.0.1:60467` (`10.0.2.2` from the emulator); 5 fresh `abx435-api-*` volumes; launch owner credential generated per run (never written); `LMSTUDIO_HOSTS` → host LM Studio `google/gemma-4-26b-a4b` (one message, unloaded after) |
| ENV-3 | `d37397b40d` | emulator-5600, ticket-owned AVD `abx435_api35`: Android 15, `google_apis` arm64, Pixel 7 1080×2400 @420 dpi (2.625), punch-hole cutout (`cutoutSpec`), WebView 124.0.6367.219, Gboard, gesture navigation, headless | ENV-1 APKs | paired with ENV-2 by the share intent; DevTools (`webview_devtools_remote_<pid>`) for page state, `dumpsys` for the window, real taps with `adb input tap`; `immersive_mode_confirmations=confirmed` set so Android's one-time hint (REQ-009, system behavior) holds no focus; landscape direction through `adb emu sensor set acceleration` |
| ENV-4 | `d37397b40d` | ENV-3 + test proxy `127.0.0.1:63826` → ENV-2 (`pass`, `stopped`, `502`, `502page`) | ENV-1 APK | app data cleared before API-11; node saved as "abx435 Proxy Node" |
| ENV-5 | `d37397b40d` app; node at `432d1c3af2` | macOS; isolated desktop instance `iso-52527-2f42` (`pnpm --silent isolated-app start --app <fresh-clone AutoByteus.app>`), window origin `file://` | ENV-1 packaged app; test node = worktree `autobyteus-server-ts/dist` on `127.0.0.1:52498` with its own data root/HOME (Host gate unchanged by this ticket) | own data root and ports; driven over CDP |
| ENV-6 | worktree `432d1c3af2` + this round's probe edits | macOS, headless Google Chrome (playwright-core) | `pnpm -C autobyteus-server-ts build`, `pnpm -C autobyteus-web build:mobile-web`, the probe's own nodes and `nuxt dev` | probe-owned data roots; phones 390×844; desktop window 1440×1400 |
| ENV-7 | `d37397b40d` | emulator-5602, ticket-owned AVD `abx435_api34`: Android 14, `google_apis` arm64, Pixel 7, same cutout (`DisplayCutout{insets=Rect(0, 136 - 0, 0)`), WebView 113.0.5672.136, headless | ENV-1 APK | paired with ENV-2; a draft run's viewer (no message, no model call) |

## Cases

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
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

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001-1 | Yes | IMP-15 (reused, `f9cb6f7153`); API-17 deferred | Proven (on `f9cb6f7153`) | — |
| AC-001-2 | No | API-01 | Proven | — |
| AC-002-1 | No | API-01, API-02 (typecheck) | Proven | — |
| AC-003-1 | Yes | API-13 | **Not Proven (Fail, F2)** | — |
| AC-003-2 | No | API-01 (unit); API-13 Chrome comparison (the opaque request answers in a browser page) | Proven | — |
| AC-003-3 | No | API-01; API-13 request counts (no second request after a readable answer) | Proven | — |
| AC-004-1 | Yes | API-07 (API 35, both directions), API-06 | Proven as written (API 35). REQ-004's API 28–34 branch fails: API-18 (F1) | — |
| AC-004-2 | No | API-06, API-07 (after exit) | Proven | — |
| AC-005-1 | Yes | API-14 (MSP-33), API-09 | Proven | — |
| AC-005-2 | Yes | API-09 | Proven | — |
| AC-005-3 | No | API-14 (Team member, Team Messages) | Proven | — |
| AC-005-4 | No | API-14 r1 (MSP-05) | Proven | — |
| AC-005-5 | No | API-01 (unit) | Proven (unit) | — |
| AC-005-6 | Yes | API-14 (MSP-33), API-10 | Proven | — |
| AC-005-7 | No | API-14 (`opening True listShown False`), API-10 samples | Proven | — |
| AC-005-8 | No | API-14 | Proven | — |
| AC-006-1 | Yes | API-08 | Proven | — |
| AC-006-2 | No | API-01 | Proven | — |
| AC-007-1 | No | API-12, API-01 | Proven | — |
| AC-008-1 | Yes | API-11 | Proven | — |
| AC-009-1 | No | docs (delivery) | Not Proven here (docs review belongs to delivery) | — |
| AC-010-1 | Yes | API-01 | Proven (unit per owner) | — |
| AC-010-2 | Yes | API-01, IMP-15 (MSP-13, MSP-32) | Proven | — |
| AC-010-3 | Yes | IMP-15 (reused) | Proven (on `f9cb6f7153`) | — |
| AC-011-1 | Yes | API-15, API-16, API-01 (server) | Proven | — |
| AC-011-2 | No | API-15, API-16 (`viewReads` 1 per close, 0 when nothing changes) | Proven | — |
| AC-012-1 | No | API-01, API-04 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 50% | Most ACs directly proven (API-06…API-16) | AC-003-1 fails in the real desktop app (F2); REQ-004 fails on Android 9–14 (F1) | the rework, then rerun API-13, API-18, API-07 and the full probe |
| Changed-boundary execution directness | 80% | 95% | real Electron window and node gate, real WebView on two Android versions, real node desktop and clipboard, live node with stopped hosts | — | — |
| Cross-boundary integration realism and mock gap | 70% | 90% | no mocks on the failing paths; LM Studio and scripted AGY runtimes; the test proxy stands in for the network path in API-11/12 | the proxy is a stand-in for a real down node or a 5xx from a real front | — |
| Environment, configuration, identity, and fixture fidelity | 75% | 90% | fresh-clone builds, test-owned node image, two Android versions, packaged desktop app | vendor phones (UNK-001), signed builds | the user's phone after release |
| Failure, edge-case, lifecycle, and recovery evidence | 70% | 90% | process death ×2, Retry, 502, closed port, stopped host, reload before/after the send | API-17 not rerun at the latest commit | full probe in the rework round |
| User-surface, browser, and desktop-shell confidence | 60% | 50% | desktop shell exercised (API-13) and found failing; phone surfaces pass | F1, F2 | rework |
| Durable regression coverage quality and relevance | 80% | 90% | MSP-33, MSP-34, MSP-35 added and passing; MSP-05 label corrected | no durable test catches F1 (instrumented tests run on API 35 only) or F2 (unit tests use a fake fetch) | the rework should add one for each (e.g. an instrumented insets test that runs on API ≤ 34; a desktop-window probe case) |

- Overall post-repository confidence: 73%
- Overall final confidence: 79% (simple average), with critical failures.
- Calculation method: simple average of the seven categories.
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` (AC-003-1; REQ-004 on Android 9–14)
- Any final applicable category below `90%`: `Yes`. Requirement proof 50%, user-surface/desktop-shell 50%.
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F1, F2. Also API-17 not rerun at the latest commit.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Other` (Android emulators API 35 and API 34 with a test Docker node), `Project Desktop Validation` (isolated instance of the fresh-clone packaged app), `Browser` (phone probe), `Lifecycle` (process death, reload)
- Confidence gap or residual risk it addresses, and the expected gain: every device, desktop-shell and live-node behavior that unit tests could only mock. It found F1 and F2.
- Browser validation needed, and why or why not: yes. Restore and stopped-host refresh are renderer journeys on the phone bundle (TESTING.md: renderer behavior the phone offers is proven on the phone bundle).
- If `Not Required`: —
- If `Blocked`: —

## Desktop Application Validation

- Approach executed, and any deviation from the investigation's plan: as planned. The fresh-clone packaged app ran as an isolated instance; the nodes were test-owned.
- Cases proving web-equivalent behavior, and cases proving shell-specific or lifecycle behavior: web-equivalent: API-16 (desktop Runs view in a browser window), the API-13 Chrome comparison. Shell-specific: API-13 (the `file://` window's requests).
- Effect on any already-running desktop application: `None`. Own data root and ports; the instance was stopped (`isolated-app list`: no running instance of this run).
- Behavior not directly proven and its confidence consequence: AC-003-1 fails (F2).

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Not Affected`.
- Representative existing data used: the Android saved page URL across process death (API-09, API-10).
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the outcome: API-09, API-10.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: a URL saved by an older page (no `row`). Its behavior is the normal no-subject path (unit).

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: —
- Upstream recipient notified: —

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` MSP-33 (+ header) | Added | API-14 | — |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` MSP-05 comment and assertion message ("an Org entry … (AC-005-4)") | Updated | API-14 r1 | — |
| `autobyteus-web/tests/e2e/mobile-closed-task-rows-cases.mjs` MSP-34, MSP-35 (+ header) | Added | API-15, API-16 | — |

- Added or updated paths attached for proportional test-code review: `Yes` (attached to the failure-origin request so the reviewer sees them; test-code review proper follows a passing round)
- Diff or repository evidence supplied for removed paths: none removed

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| A phone | Android emulators (API 35, API 34) | team rule: no physical phone | vendor skins, other cutout shapes (UNK-001) |
| A node that is down / answers 5xx | test TCP proxy in front of the test node | a real container restart would lose the pairing session | network-path stand-in |
| Model provider | local LM Studio (Docker node), scripted AGY CLI (probe) | no paid inference needed | none for these behaviors |
| A host name the node refuses | public `*.nip.io` names resolving to 127.0.0.1 | no `/etc/hosts` change on the user's machine | none: the node and the window see a real name |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Fresh clone, server package, scratch (`/private/tmp/abx435-api`) incl. owner credential and pairing-link files | Yes | `rm -rf` | removed |
| Test node `abx435-api-node` + 5 `abx435-api-*` volumes | Yes | `docker rm -f -v`, `docker volume rm` | removed; `docker volume ls`: 0 `abx435`; `autobyteus-server-0/1/2` untouched |
| Emulators emulator-5600 / emulator-5602, AVDs `abx435_api35`, `abx435_api34` (app data, adb forwards, sensor and immersive settings) | Yes | `emu kill`, `avdmanager delete avd` | deleted; other agents' AVDs never addressed |
| Test proxy, refusing node and its data root | Yes | process ended, `rm -rf` | none running |
| Isolated instance `iso-52527-2f42` | Yes | `isolated-app stop` | stopped; no running instance |
| LM Studio model `google/gemma-4-26b-a4b` (loaded just-in-time by this run) | Yes | `lms unload` | no model loaded |
| Probe stacks (r1, r2) | Yes (probe) | the probe's own cleanup | `"cleanup": {"frontendExited": true, "serversLeft": 0, "rootRemoved": true}` both runs |
| Device helper scripts | Yes | kept as evidence in `evidence/api-e2e/probes/` | — |

## Preliminary Classification (On `Fail`)

**F1: REQ-004 (DS-005, the design's API 28–34 branch) on Android 9–14. Preliminary `Design Impact`; recommended owner: Solution Designer.**
- Expected: in viewer full screen the page also lays out in the cutout area (REQ-004; design-spec File Mapping: "`Display.setLayoutInCutout(on)` (API ≥ 28: `SHORT_EDGES` on, `DEFAULT` off)"; implementation decision 8: "the unit test covers API 26–35").
- Observed on Android 14 (API-18): the window gets `layoutInDisplayCutoutMode=shortEdges` and spans `[0,0][2400,1080]`, but the framework's `android:id/content` frame starts at x=136 (`136,0-2400,1080`). The page is 863 CSS px wide on a 915 px screen in both landscape directions, as before the change. On Android 15 (API-07) the page is 915.
- Cause found: the app never turns off the window decor's inset fitting (`decorFitsSystemWindows`), so on API ≤ 34 the decor still insets the content by the cutout whatever the cutout mode. Android 15 enforces edge-to-edge for `targetSdk 35`, which is why the mechanism works there. The unit test drives a fake `Display` port, and the instrumented tests ran on API 35 only, so neither could catch this. The code matches the design. The design's mechanism for API 28–34 is insufficient, so I classify it as design rather than implementation.

**F2: AC-003-1 (REQ-003, DEC-002) in the Electron desktop window. Preliminary `Design Impact`; recommended owner: Solution Designer.**
- Expected: a node row or Add whose name the node's Host gate refuses shows "Something answers at <host>, but it refuses this window. If it is an AutoByteus node, add <host> to AUTOBYTEUS_ALLOWED_HOSTS on that node, or use its IP address."
- Observed (API-13, real packaged app, real node): "Not reachable. Something answers there, but it isn't an AutoByteus node." for both the row and Add. The closed port keeps "No answer from that address." as expected.
- Cause found: the Electron window (`file://`) does not apply CORS to the node request. Its readable `fetch` resolves with the node's 403 (`{"status":403,"type":"basic"}`), although the 403 carries no `Access-Control-*` header. So `probeNodeIdentity` never reaches the new opaque request (`nodeIdentityProbe.ts:83`); it takes `!response.ok → not_autobyteus` (`:86`). In Chrome, `file://` and `http` pages behave as DEC-002 measured (readable fails, opaque answers). The requirements listed this as an open risk ("Electron same engine; API/E2E re-checks"). DEC-002's premise that the desktop window cannot read the refusal does not hold. The window can read the 403's `code: REMOTE_ACCESS_HOST_REFUSED`, which names the exact cause; the existing `cause.hostRefused` words describe it. Deciding the corrected mechanism and words belongs to the design.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven, or parts only the user can check (IDs): AC-003-1 (F2); REQ-004 on Android 9–14 (F1; AC-004-1 as written for API 35 is proven); AC-009-1 is delivery's docs review; API-17 (full probe at the latest commit) deferred to the rework round. Only the user can check: vendor phones' cutouts (UNK-001).
- Preliminary classification and recommended owner (on `Fail`): F1 `Design Impact`, F2 `Design Impact`; Solution Designer, through failure-origin review.
- Next recipient from `get_handoff_rules`: see the handoff message (failure-origin review).
- Notes: items 13–14 (`432d1c3af2`, IR-003) are outside this round and not yet code-reviewed. Rerun on rework: API-07 and API-18 (and API-06) for F1; API-13 for F2; API-02 if a build input changes; API-17 full probe at the final commit. Every other case holds unless the rework touches its code.
