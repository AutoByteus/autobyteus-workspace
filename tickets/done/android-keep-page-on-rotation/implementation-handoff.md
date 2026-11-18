# Implementation Handoff — Android app keeps its page when the phone rotates (autobyteus-415)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review not selected (Small/Low); `Architecture Design Complete` → implementation → direct API/E2E.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-keep-page-on-rotation/tickets/in-progress/android-keep-page-on-rotation/requirements-doc.md` (SR-001, Approved)
- Investigation notes: `.../android-keep-page-on-rotation/investigation-notes.md` (AR-01…AR-05)
- Solution revision record: `.../android-keep-page-on-rotation/solution-revision-record.md` (SR-001)
- Design spec: `.../android-keep-page-on-rotation/design-spec.md` (SR-001, Ready)
- Follow-ups: `.../android-keep-page-on-rotation/follow-ups.md` (FU-001, unchanged)
- Design review report / architecture review revision record: `N/A — not applicable`
- Evidence: `.../android-keep-page-on-rotation/evidence/`

## Current Implementation Summary

`.MainActivity` declares `android:configChanges="orientation|screenSize|screenLayout|smallestScreenSize|keyboard|keyboardHidden|navigation"`, so rotation, window-size changes and a hardware keyboard no longer recreate it: the same `AutoByteusWebView` and page re-lay out and the insets listener re-pads the root. No `onConfigurationChanged` override (the native screens are code-built layouts that measure to the new size; measured on the connection screen, IMP-03). A JVM unit test reads the source manifest and pins the seven values; the Android README lists the behavior under "What the app owns".

- Implementation cycle: `Initial`; revision record `implementation-revision-record.md`, current `IR-001`
- Related revision IDs: SR-001; ARCH-REV / CRR / API-REV / DR `N/A`; triggering findings `N/A`
- Commit: `dd129696a4` on `codex/android-keep-page-on-rotation` (base `origin/personal` @ `3bf9240d42`), plus this handoff in the next commit.

## Routing Classification (Mandatory)

- Task size: `Small`; Architecture risk: `Low` (design-spec.md) — `Confirmed`: one manifest attribute, one test, one doc line; no new owner, contract, permission or persistence. The escalation triggers did not fire: the reload reproduced (IMP-01), and no native screen needed rebuilding on rotation (IMP-03).
- Selected route: `Direct API/E2E`.
- Lightweight implementation self-review: `Yes` — diff reread (3 files, 3 lines of production change); attribute value checked in the built APK (`0x00000df0` = exactly the seven flags, IMP-05); permissions identical before/after (IMP-05); the test fails on the unchanged manifest (IMP-06); no dead code introduced; nothing outside the Scope Guardrail touched.
- New design impact or escalation trigger: `None`.

## Reproduction (design's Guidance: confirm it fails, then make it pass)

On the before build (`3bf9240d42`), launched from the launcher intent with a paired isolated node, with the **Choose work** sheet open and a page marker set through WebView DevTools: one `adb emu rotate` → the app is on **Home**, the marker is gone and `performance.timeOrigin` is new (`1793996031134` → `1793996049168`), i.e. the page was loaded again (IMP-01). The connection screen's typed URL was lost on rotation (IMP-03). Side observation: when the app was first opened through the share intent (`ACTION_SEND`), the recreated activity re-read that intent and showed the native connection screen instead of the page; the same fix covers it.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change | Production Path / Key Files | Result |
| --- | --- | --- | --- |
| BEH-001 (REQ-001; AC-001) | Rotation keeps the WebView and page | `AndroidManifest.xml` `.MainActivity` `android:configChanges` | IMP-02: same marker and `navigationStart` after landscape and back; Choose work sheet stays open; viewport `412x839` → `863x360` → `412x839`; same process |
| BEH-002 (REQ-001; AC-002) | Connection input kept | same | IMP-03: typed URL kept in landscape and back in portrait (lost before the fix) |
| BEH-003 (REQ-002; AC-003) | Insets re-applied per orientation | unchanged `ui/SystemBarInsets.kt` listener | IMP-04: WebView bounds = screen minus status bar, navigation bar and cutout in each orientation (`[0,136][1080,2337]`; 90°: `[0,74][2264,1017]` with the cutout on the right; 270°: `[136,74][2400,1017]` with it on the left); run screen (New run) header and tab bar clear in all orientations; typed server path kept |
| AC-004 | Manifest pinned | `app/src/test/java/org/autobyteus/mobile/MainActivityManifestTest.kt` | IMP-06: passes; fails on the unchanged manifest |
| REQ-003 (AC-005) | No new permission; existing behavior | — | IMP-05: `aapt2 dump permissions` identical; IMP-06: all 24 unit tests pass, `assembleDebug` and `compileDebugAndroidTestKotlin` succeed; launch, pairing (share intent and the web pairing page) and the connection screen worked in IMP-01…IMP-04 |

- Changes stayed within the Scope Guardrail: `Yes`. `uiMode`/`locale`/`fontScale`/`density` still recreate the screen (DEC-001); process-death restore stays FU-001; no web app or iOS change.

## Key Files Or Areas

- `autobyteus-android/app/src/main/AndroidManifest.xml`
- `autobyteus-android/app/src/test/java/org/autobyteus/mobile/MainActivityManifestTest.kt`
- `autobyteus-android/README.md` ("What the app owns")

## Important Assumptions / Known Risks

- The test reads `src/main/AndroidManifest.xml` relative to the module directory, which is Gradle's working directory for `:app:testDebugUnitTest` (the README's command).
- QR scanning runs in the scanner's own activity (AR-03) and the file chooser is a system picker; neither was exercised on rotation here.
- Dark mode, language, font size and density changes still recreate the screen and reload the page (DEC-001, by design).

## Task Design Health Assessment Implementation Check

- Bug Fix; `Missing Invariant`; `No Refactor Needed`; implementation matched: `Yes`; Design Impact: `N/A`.

## Legacy / Compatibility Removal Check

- No compatibility mechanism; no legacy retained; no dead code in touched files; dead code elsewhere: none; shared structures unchanged; source-file size: unchanged files except one manifest line.

## Persisted Data Transition Check

- `Not Affected`.

## Environment Or Dependency Notes

- Emulator `autobyteus277_api35` (Pixel 7 profile, 1080x2400, 136 px top cutout, API 35), started `-no-window -wipe-data`; no physical device attached at any time.
- Isolated test node: `autobyteus/autobyteus-server:beta` (`9c5aa01bb2fc`), `-p 127.0.0.1:62261:8000`, fresh volumes, test data; reached from the emulator at `http://10.0.2.2:62261`; Phone Access turned on and paired through the node's own REST routes. Removed with its volumes afterwards; the emulator was shut down; the user's nodes were not touched.
- Page state read through WebView DevTools (`evidence/IMP-01-cdp.mjs`, `adb forward tcp:9415 localabstract:webview_devtools_remote_<pid>`); pairing and access tokens redacted from the recorded URL.

## Checks Run

| Check ID | Command Or Steps | Commit / Build | Environment | Code It Exercises | Criteria | Result | Evidence / Look For |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | before build: pair, launcher launch, open Choose work, set marker, `adb emu rotate`, read page | `3bf9240d42` | emulator + test node | `MainActivity` lifecycle | AC-001 (before) | Reproduced | `IMP-01-…txt`: after rotation `"marker":null`, `navigationStart` `1793996049168` (was `…031134`); `IMP-01-before-fix-2-landscape-home.png` shows Home |
| IMP-02 | same on the after build; landscape and back | `dd129696a4` | same | manifest change | AC-001 | Pass | `"marker":"before-rotation"`, `navigationStart` `1793996264747` in all three reads; sheet open in all three screenshots |
| IMP-03 | connection screen: type, rotate, read the EditText (uiautomator) | before `3bf9240d42`; after `dd129696a4` | emulator | native connection screen | AC-002 | Pass (lost before, kept after) | before landscape shows the hint `https://desktop.tailnet-name.ts.net/mobile`; after: `http://abx415-typed-input.example:8000/mobile` in landscape and back |
| IMP-04 | `dumpsys window` InsetsSource frames + WebView bounds at 0°, 90°, 270°, 0°; run screen screenshots | `dd129696a4` | emulator (cutout) | insets listener after rotation | AC-003 | Pass | `webview bounds="[0,74][2264,1017]"` with `displayCutout frame=[2264,0][2400,1080]` at 90°; `[136,74][2400,1017]` with `[0,0][136,1080]` at 270° |
| IMP-05 | `aapt2 dump permissions` / `xmltree` on both APKs | both | build-tools 35.0.0 | built manifest | AC-004, AC-005 | Pass | `## permissions identical before and after`; after: `configChanges(0x0101001f)=0x00000df0` |
| IMP-06 | `ANDROID_HOME=$HOME/Library/Android/sdk ./gradlew :app:testDebugUnitTest :app:assembleDebug :app:compileDebugAndroidTestKotlin --rerun-tasks`; the new test against the unchanged manifest | `dd129696a4` | JDK 21, Gradle wrapper | unit tests, build | AC-004, AC-005 | Pass | 7 result files, 24 tests, `failures="0"`; against the old manifest: `MainActivityManifestTest > … FAILED` |

- Not run: a physical phone (not to be used); QR scan and file chooser across rotation; split screen / foldable / hardware keyboard on the emulator (declared, not exercised); API 34 AVD. Left to API/E2E.

## Frontend Rendered-Result Check

- Affected surface: the Android shell (native connection screen; the WebView-hosted `/mobile` shell) across rotation. No visual change was made; the check is that layout follows the new size and stays clear of system areas: inspected in IMP-02, IMP-03, IMP-04 screenshots (portrait, 90°, 270°). No defects found. Not inspected: split screen, a foldable, the API 34 AVD.

## Downstream Coverage Hints

- Rotate during a running agent stream in a run's chat (the live stream should continue, no reconnect).
- Split screen and a resizable/foldable AVD; attach a hardware keyboard (`adb shell` input device or emulator keyboard toggle).
- QR scan and the file chooser opened in one orientation and closed in the other.
- Dark-mode toggle still recreates (by design; DEC-001).
