# API/E2E Execution Coverage Report — phone VNC Viewer: full screen in landscape (autobyteus-432)

## Round

- Coverage investigation (the plan; it lists the upstream documents): `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-viewer-landscape-fullscreen/tickets/in-progress/phone-viewer-landscape-fullscreen/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; code reviewer CRR-001 Pass (9.4/10) on `d76be54fb0` (source `6b05106fb0`), reviewed route. The reviewer held CR-C-06 for evidence and asked for API 34, the restored page after process death, the fresh-start check, independent reruns of AC-001…AC-007 and the bridge regression.
- Prior round reviewed: None
- Deviations from the investigation's plan, and why:
  - API-03: `am instrument` on emulator-5554 instead of `./gradlew :app:connectedDebugAndroidTest`, because Gradle's connected task would also install and run on emulator-5584, which belongs to another ticket.
  - API-05 attempt 1 is invalid and was rerun. My `uiautomator dump` (for tap coordinates) ran while the screen was in landscape. UiAutomation freezes rotation and then "restores" it as a locked user rotation (`user_rotation=1`), so later exits stayed at ROTATION_90 because of the harness. I reset `user_rotation` to 0, and from then on used no uiautomator while in landscape (only DevTools rects plus `adb input tap`). The evidence is kept and marked (`API-05a-…`).
  - API-05: a pairing link shared for the node already open leaves the page as it is, so it doesn't reach "another app screen". The node list was reached through the real path (Back → node button → Switch node) and, during full screen, through the bridge message the page's Switch node button posts (`showNodeList`, marked synthetic). Switch node sits in the connection sheet, which full screen hides.
  - API-07 attempt 1 is invalid and was rerun: the task started by `am start -n` without MAIN/LAUNCHER made the launcher open a second MainActivity. In part B, `am kill` did not end the process (same pid), so I reran it with a background wait and a pid-checked kill loop (C1–C5).
  - API-07, SCN-a: the planned outcome ("the restored page with `full=1` re-enters landscape") can't be reached. Android restored `/mobile/?screen=desktop&full=1`, but that route names no run, so the web app replaced it with Home before any viewer mounted. AC-004's own outcome (orientation and page agree) was checked and holds. The gap is recorded as FU-002.
  - API-08: in landscape, the keyboard covers the Clipboard sheet's Send button. Send worked after lowering the keyboard (Back). Recorded as FU-003.
  - API-10: one Back key stayed in full screen. I traced it (API-10b…g) to Android's one-time "Viewing full screen" hint, a system window that holds focus until Got it. This is not the app.
  - API-12 was added during execution: scoring showed a durable-coverage gap (no repository test checked the real window). The new instrumented test went through a mutation check.
  - The browser Esc key is not delivered by headless Chrome. `document.exitFullscreen()` takes the same `fullscreenchange` path (as planned).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-viewer-landscape-fullscreen/tickets/in-progress/phone-viewer-landscape-fullscreen/evidence/` (my files are `API-*` plus `probes/`; the implementation's files are kept as they were)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`. Path: `autobyteus-android/app/src/androidTest/java/org/autobyteus/mobile/DesktopFullScreenWindowTest.kt`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | `d76be54fb0` (fresh clone) | macOS 26.5.2 arm64, Docker 29.0.1, JDK 17 | server package built with buildx (desktop-linux, linux/arm64) from a copy of `Dockerfile.monorepo` without its `# syntax` line (Docker Hub unreachable); debug APK + unit tests from the clone | — |
| ENV-2 | `d76be54fb0` | test node `abx432-api-node`: `autobyteus/autobyteus-server:beta` `9c5aa01bb2fc` + the fresh-clone server package mounted read-only over `/opt/autobyteus/server-package` | Xfce desktop, Chromium, noVNC bridge | `127.0.0.1:52316` (`10.0.2.2` from the emulator), 5 fresh test volumes, `LMSTUDIO_HOSTS=http://host.docker.internal:1234` (local `qwen/qwen3.6-35b-a3b`, one message, unloaded after) |
| ENV-3 | `d76be54fb0` | emulator-5554 `autobyteus277_api35`: Android 15, Pixel 7 profile 1080×2400, display cutout | fresh-clone debug APK, Gboard | auto-rotate off, `user_rotation=0`, gesture navigation; paired by the share intent; DevTools for page state; `dumpsys` for rotation, requested orientation and bar visibility |
| ENV-4 | `d76be54fb0` | emulator-5554 `autobyteus277_api34`: Android 14 (`-wipe-data`) | same APK | booted with auto-rotate on (API-10a), then set off (API-10f); gesture navigation; first-time immersive hint not yet confirmed |
| ENV-5 | `d76be54fb0` | headless system Chrome (playwright-core) | fresh-clone `/mobile` bundle from the test node | `--host-resolver-rules=MAP abx432-node.lan 127.0.0.1` |
| ENV-6 | `d76be54fb0` + new test file | emulator-5554 `autobyteus277_api35` (rebooted for API-12) | worktree `assembleDebug` + `assembleDebugAndroidTest` | auto-rotate off, `user_rotation=0` |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-005 (unit), REQ-004…006, gates | web specs, typecheck, guards | Reused IMP-11, IMP-12, IMP-13 | (handoff) | Pass | (handoff) | (handoff) | Ran on `6b05106fb0`; nothing outside `tickets/` changed up to `d76be54fb0` |
| API-02 | AC-007; Android units; builds | fresh clone | `evidence/API-02-build.sh` | ENV-1 | Pass | `API-02-builds-units-permissions.txt`, `API-02-build.sh` | all `testsuite … failures="0" errors="0"` incl. `DesktopFullScreenControllerTest tests="8"`; `aapt2 dump permissions`: INTERNET, ACCESS_NETWORK_STATE, CAMERA, the receiver permission, same as the base | Fresh-start rule: no TESTING.md build input changed (`git diff --name-only eebbc2b8ee d76be54fb0`); the builds came from a fresh clone anyway |
| API-03 | preserved 415/277; shell smoke | instrumented, API 35 | `am instrument -w -r org.autobyteus.mobile.test/androidx.test.runner.AndroidJUnitRunner` | ENV-3 | Pass | `API-03-instrumented-api35.txt` | `OK (11 tests)` incl. `rotatingToLandscapeAndBackKeepsTheSameActivityAndTheTypedInput` | See deviations (not Gradle connected) |
| API-04 | AC-001, SCN-c (pairing) | app ↔ bridge ↔ page ↔ window | share pairing link (SEND intent) → run list → draft run → VNC Viewer → real tap on full screen | ENV-3 | Pass | `API-04a-pairing.txt`, `API-04b-ac001-full-screen.txt`, `API-04-1-portrait.png`, `API-04-2-full-screen-system-hint.png`, `API-04-3-full-screen.png` | `abx432-api-node, Connected`; `rotation=ROTATION_90 requested=SCREEN_ORIENTATION_SENSOR_LANDSCAPE statusBar:visible=false navBar:visible=false`; canvas 412×232 → 733×412; `"aspect":"1.778","desktopAspect":"1.778"` | Android's first-time hint shown, closed with Got it |
| API-05 | AC-002 | exits and leaving the page | `probes/ac002.sh`: handle; View only tap; Back key; back gesture ×2; shared link while full; Back ×3 to the run list; node button → Switch node; synthetic `showNodeList` during full screen | ENV-3 | Pass | `API-05-ac002-exits.txt`, `API-05a-attempt1-uiautomator-locked-landscape.txt` (invalid, harness), `API-05-5b-share-while-full.png`, `API-05-6-node-list.png`, `API-05-7b-node-list-from-full.png` | each exit: `ROTATION_0 … UNSPECIFIED … visible=true visible=true`; first back swipe shows the bars (still ROTATION_90), second leaves; `user_rotation at the end: 0` | — |
| API-06 | AC-003 | View only zoom | double tap / drag / double tap (CDP touch); node pointer via `xdotool` | ENV-3 | Pass | `API-06-ac003-fill.txt`, `API-06-1-fill.png`, `API-06-2-fill-panned.png` | `scale(1.24924)` (expected 915/733 = 1.248), canvas 915×515 then back to `scale(1)` 733×412; `pointer: x:300 y:300` unchanged | — |
| API-07 | AC-004, SCN-a | Android lifecycle | `probes/ac004.sh A` (draft: Home + return; process death); `B2` (run with one local-model message; pid-checked kill) | ENV-3, ENV-2 | Pass (AC-004); SCN-a re-entry not reachable | `API-07a-ac004-draft.txt`, `API-07a0-attempt1-task-root-not-launcher.txt` (invalid), `API-07b-ac004-restored-run.txt`, `API-07-A5-reopened-after-kill.png`, `API-07-C4-restored-full.png` | Home + return: still ROTATION_90, SENSOR_LANDSCAPE, `full=1`; after process death: new pid, `ROTATION_0 UNSPECIFIED`, bars visible, page `/mobile/` (Home) | The restored `?screen=desktop&full=1` names no run, so it drops to Home: FU-002. The screenshot named `…restored-full` shows that Home page |
| API-08 | AC-005, CR-C-06 (SCN-b) | Control full screen ↔ node | `probes/ac005.sh`, `probes/ac005-full.sh`, real taps (`probes/tapl.sh`): strip Keyboard → typed into a node terminal; Clipboard Send; copy inside Chromium (`xdotool` Ctrl+A Ctrl+C) → sheet, in full screen and in portrait | ENV-3, ENV-2 | Pass | `API-08-ac005-keyboard-clipboard.txt`, `API-08-*.png` | node typed file `abx432typed`; node clipboard after Send `'abx432-sent-in-full-screen'`; sheet `"remote":"abx432-copied-in-chromium-full"`, `copyDisabled:false`; full screen kept (ROTATION_90, bars hidden) | CR-C-06 resolved: the reviewer's empty result came from `xclip` in a shell. The Copy button was not tapped on purpose (the emulator shares its clipboard with the user's Mac); the copy itself is in `MobileNodeDesktop.spec.ts`. FU-003: the keyboard covers Send in landscape |
| API-09 | AC-006 | browser Fullscreen API | `node evidence/browser-probe.mjs …` (unchanged implementation probe) | ENV-5 | Pass | `API-09-ac006-browser-rerun.txt`, `API-09/` | `"fullscreenElement":"HTML"` with `full=1`; Fill/Fit with `mouseOnNode x:300 y:300`; after `document.exitFullscreen()` query `?screen=desktop`; handle leaves both; reload with `full=1`: `pageErrors: []` | Esc not delivered by headless Chrome (planned) |
| API-10 | SCN-d: AC-001, AC-002, AC-003 on Android 14 | app ↔ window, API 34 | `probes/api34.sh`, `api34-back.sh`, `api34-back2.sh`, `api34-hint.sh`, `api34-gotit.sh`, `api34-hint-gesture.sh`, `api34-rotoff.sh` | ENV-4, ENV-2 | Pass | `API-10-api34.txt`, `API-10-1…6-*.png` | `ROTATION_90 SENSOR_LANDSCAPE` bars hidden; Fill `scale(1.18234)` → Fit; handle, Back key, back gesture, View only tap → `ROTATION_0 UNSPECIFIED` bars visible (auto-rotate on and off); hint: `mCurrentFocus=Window{… ImmersiveModeConfirmation}` while two Back keys stay in full screen, then Got it → `immersive_mode_confirmations=confirmed` → Back leaves | Pairing on API 34 also passed (Retry after the emulator's Wi-Fi validated) |
| API-11 | privacy | node logs | `docker logs` + `server.log`, grep counts | ENV-2 | Pass | `API-11-node-log-scan.txt` | 0 hits for `Bearer `, `sk-`, `token=`, `pairingToken`, `abx432-sent`, `abx432-copied`, `abx432typed`; server.log `ERROR: 0` | container "error" lines are the base image's desktop/Chromium noise, listed and classified |
| API-12 | REQ-001/REQ-002 on a real window | instrumented, API 35 | new `DesktopFullScreenWindowTest`; `am instrument` alone and the whole suite; mutations M1 (no `bars.hide`), M2 (no landscape request) | ENV-6 | Pass | `API-12-durable-window-test.txt` | `OK (1 test)`; `OK (12 tests)`; M1: `AssertionError: full screen hides the status and navigation bars`; M2: `AssertionError: full screen turns the screen to landscape`; reverted: `OK (1 test)` | M2's first attempt didn't apply (BSD sed) and is marked invalid in the evidence |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part: What You Tried And Why It Still Needs The User |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-04, API-10, API-12 | Proven | — |
| AC-002 | Yes | API-05, API-10, API-12 | Proven | — |
| AC-003 | No | API-06, API-10, API-09 (browser) | Proven | — |
| AC-004 | Yes | API-07 | Proven | — (the restored viewer itself is FU-002, outside this AC) |
| AC-005 | Yes | API-08, API-01 | Proven | — (Send under the keyboard in landscape is FU-003; Send works once the keyboard is lowered) |
| AC-006 | No | API-09, API-01 | Proven | The Esc key itself, through `document.exitFullscreen()` (same event) |
| AC-007 | No | API-02 | Proven | — |
| CR-C-06 | — | API-08 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 95% | Every AC directly on a device or in a browser (API-04…API-10) | Esc through its equivalent | — |
| Changed-boundary execution directness | 75% | 96% | Real bridge message from the real page; window state read from `dumpsys`, not from the app | — | — |
| Cross-boundary integration realism and mock gap | 75% | 95% | Real node (beta image + fresh package), real noVNC, real Chromium copy, real local model for a run that survives | — | — |
| Environment, configuration, identity, and fixture fidelity | 75% | 95% | Two Android versions (14, 15), gesture navigation, auto-rotate on and off, cutout device, Gboard, freshly wiped AVD (first-time hint) | Physical phones and vendor skins: user-only (team rule), not a gap | The user's own phone after release |
| Failure, edge-case, lifecycle, and recovery evidence | 70% | 95% | Background/return, pid-checked process death, every exit, the immersive hint, shared link while full, reload (browser) | Page reload inside the app was run only in the browser | — |
| User-surface, browser, and desktop-shell confidence | 75% | 94% | Real taps and keys, screenshots of each state, browser probe | FU-003 (Send under the keyboard); the first-time hint covers the handle (Android's) | FU-003 |
| Durable regression coverage quality and relevance | 85% | 95% | JVM controller/bridge tests, web specs, new instrumented window test (mutation-checked), 415's rotation test | No durable end-to-end test through the page's bridge on a device | — |

- Overall post-repository confidence: 76%
- Overall final confidence: 95% (665/7 = 95.0)
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: vendor-skinned phones (rotation lock, immersive hint) are user-only; FU-002, FU-003 (outside this ticket)

## Broader Validation Decision (Mandatory)

- Decision: `Required` (ran)
- Execution mode: `Other` (Android emulators API 35 and API 34 with a real test node, DevTools and `dumpsys`), `Browser` (headless Chrome probe), `Lifecycle` (background, process death)
- Confidence gap or residual risk it addresses, and the expected gain: orientation, bar visibility and lifecycle exist only on a device. The run gained direct proof of every AC, resolved CR-C-06, and found FU-002 and FU-003 plus the system-hint behaviour.
- Browser validation needed, and why or why not: yes, for AC-006 (the Fullscreen API path outside the app)
- If `Blocked`: N/A

## Desktop Application Validation (When Applicable)

- Not applicable: the change is in the Android shell and the `/mobile` page; the Electron app is not involved.

## Persisted-Data Transition Checks (When Applicable)

- Not applicable: no persisted data changed (the page state is a URL query; the restored page is AC-004).

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-android/app/src/androidTest/java/org/autobyteus/mobile/DesktopFullScreenWindowTest.kt` | Added: on a real `MainActivity` window, `DesktopFullScreenController.forActivity` on → `ORIENTATION_LANDSCAPE`, `SENSOR_LANDSCAPE`, status and navigation bars invisible, root `STAGE_COLOR`, same activity; off → orientation before, `UNSPECIFIED`, bars visible, root colour before | API-12 | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| A phone | Android emulators (API 35, API 34) | Team rule: no physical phone | Vendor skins (user-only) |
| The agent copying on the node | `xdotool` keys in Chromium's address bar (Ctrl+A, Ctrl+C) | No agent run needed for a copy | Same X clipboard path as an agent's Ctrl+C |
| Another app screen during full screen | `showNodeList` bridge message (what Switch node posts) | Switch node is in the connection sheet, which full screen hides | Real path also run from the run list |
| Android ending the app | `am kill` after Home, checked by pid | — | Same as a low-memory kill |
| Browser Esc | `document.exitFullscreen()` | Headless Chrome doesn't deliver Esc to the Fullscreen API | Same `fullscreenchange` |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Test node `abx432-api-node` and its 5 volumes | Yes | `docker rm -f -v`; `docker volume rm` ×5 | removed; `no abx432 volumes`; `autobyteus-server-0/1/2` Up 40 hours, untouched |
| Emulator-5554 (API 34, then API 35): app data, test APK, adb forwards, rotation settings, hint flag | Yes | `pm clear`, `uninstall org.autobyteus.mobile.test`, `forward --remove-all`, `emu kill` (AVD name checked first) | killed; emulator-5584 (another ticket's) never addressed and still running |
| Mutations M1/M2 in `DesktopFullScreenController.kt` | Yes | `git checkout --` the file | `git status`: only the new test file is untracked under `autobyteus-android` |
| LM Studio model `qwen/qwen3.6-35b-a3b` | Yes | `lms unload --all` | `Unloaded 1 model.` |
| `/private/tmp/abx432-api`, `/private/tmp/abx432-api2` | Yes | `rm -rf` after copying evidence and probes | removed |
| User's Mac clipboard | — | not touched (Copy button not tapped) | — |

## Preliminary Classification (On `Fail`)

- N/A (`Pass`)

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): None. Optional for the user: his own phone, for vendor-skin behaviour.
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (proportional test-code review of `DesktopFullScreenWindowTest.kt`)
- Notes:
  - Android's one-time "Viewing full screen" hint (API 34 and 35) holds focus and covers the handle until Got it. Until then the Back key and the handle don't reach the app; the back gesture does. After that it never shows again. This is Android's own behaviour (IMP-02).
  - The design premise in L-10 / CR-C-02 ("restoring a killed app with `full=1` re-enters full screen") is not reachable on a device, because the viewer route carries no run (FU-002). No user-visible failure: the app requests only UNSPECIFIED after the restore.
  - Follow-ups added to `follow-ups.md`: FU-002 and FU-003.
