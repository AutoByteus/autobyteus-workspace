# Implementation Handoff — phone-viewer-pinch-zoom-472 (autobyteus-472)

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-viewer-pinch-zoom-472`, branch `codex/phone-viewer-pinch-zoom-472`, base `origin/personal` @ `ed481ae4ca` (with autobyteus-471). Finalization target `origin/personal`. A new Android APK is needed for Download; release only on the user's word.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Medium / High); ARCH-REV-002 `Pass` (SR-003).
- Requirements doc: `requirements-doc.md` (REQ-001…REQ-006, AC-001…AC-005; approved)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec: `design-spec.md` (SR-003, Ready)
- Supplemental task artifacts: none
- Design review report: `design-review-report.md` (ARCH-REV-002, Pass; R-1…R-3 in the design's Guidance For Implementation)
- Architecture review revision record: `architecture-review-revision-record.md`
- Triggering rework report: N/A (initial)

## Current Implementation Summary

PDFs and images in the phone viewer zoom by touch. A PDF goes from page width to 3× and is drawn again at the new width; an image goes from fit to 4×. The viewer keeps the zoom across a reload of the same file. A Download button saves the open PDF or image: through a new shell-bridge action into Downloads in the Android app, or as the browser's download.

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review / API-E2E / delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`
- Commits (on `ed481ae4ca`):
  - `0185e8f7c5`: the received package.
  - `a0c57dc9dd`: web.
  - `617b43165e`: Android, docs and release notes.
  - `e342386a47`, `5073d38a56`: probe case MSP-39.
  - `d2b9f99603`: a spec type fix.
  - Code under test: `d2b9f99603`. The handoff and evidence are in the docs commit after it.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: as designed. The change is web plus Android, with a new page→app bridge action that writes files on the phone, and a new APK. No escalation trigger fired:
  - Base64 in one message works for the PDFs and images tested (RSK-002 is unchanged; chunking stays the escalation).
  - The PDF keeps native page scrolling while zoomed (IMP-06: one finger scrolls 385 px at 2×).
- Selected route: `Code Review`
- Lightweight self-review for the direct route: `Not Applicable` (Large/High route goes to Code Reviewer)
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior | Approved change / preserved outcome | Implemented production path / key files | Result / notes |
| --- | --- | --- | --- |
| REQ-001 PDF zoom (DS-001) | Pinch 1×–3× around the pinch centre, pan, page scroll, double tap 1× ↔ 2×, sharp text | `MobileFileViewer` → `FileViewer` (`touchZoom`) → `PdfViewer` touch mode → `usePdfPinchZoom`:<br>• two-finger touch events (non-passive, `preventDefault`) drive a live CSS transform around the anchor<br>• on release, `setZoom` sets `zoom`, vue-pdf-embed's `width` = base × zoom, and the composable waits until the page canvases have the new CSS width<br>• then it clears the transform and scrolls the anchor under the fingers<br>• one finger: native scrolling (`touch-action: pan-x pan-y`) | Unit: `usePdfPinchZoom.spec.ts` (6), `MobileFileViewer.zoom.spec.ts`. Browser (IMP-06 MSP-39):<br>• the width doubles (358 → 716)<br>• the anchor lands exactly under the fingers (195, 420)<br>• bitmaps are at width × DPR (1432)<br>• one finger scrolls<br>• double tap both ways<br>Android WebView mechanism: IMP-00 |
| REQ-002 image zoom (DS-002) | Fit to 4×, pan, double tap fit ↔ fill, as the VNC picture | `ImageViewer` touch mode: a `touch-none` layer, `usePictureZoom(layer, { picture: natural size, onCommit })` | `usePictureZoom.spec.ts` (13, VNC cases unchanged plus commit/restore), MSP-39 (pinch to `scale(2)`, double tap back to fit) |
| REQ-003 page never zooms, bar stays | — | The page zoom stays off; the PDF's two-finger moves are taken from the browser; the image layer is `touch-none`; the viewer is under the fixed bar | MSP-39: `visualViewport.scale` 1 and the back arrow at (4, 0) in all 8 states. IMP-00: Android WebView `visualViewport.scale` 1, no scroll on pinch |
| REQ-004 Download (DS-003) | Bar button for a loaded PDF/image. App: Downloads under its name, with "Saved to Downloads: <name>" or "Couldn't save the file.". Browser: the browser's download | `MobileFileViewer` bar `actions` → `useMobileFileDownload`:<br>• `fetchAuthorizedResourceBlob(fileState.url)` → base64 → `getShellBridge().saveFile`, or `<a download>` in a browser<br>Android:<br>• `ShellBridge` → `ShellBridgeMessages.read` (`saveFile`) → `MainActivity.bridgeActions.onSaveFile` → `DownloadsSaver`<br>• API ≥ 29: MediaStore.Downloads with `IS_PENDING`<br>• API 26–28: `ACTION_CREATE_DOCUMENT`, with the bytes in the cache and the pending save kept in the saved instance state<br>• result toast | Unit: `useMobileFileDownload.spec.ts` (5), `MobileFileViewer.zoom.spec.ts` (button). JVM: `ShellBridgeMessagesTest` (13). Instrumented: `DownloadsSaverTest` (3) on Android 15 (IMP-08) and Android 10 (IMP-10). Browser download: MSP-39 (names and bytes) |
| REQ-005 no credential, PDF/image only, plain name | — | The page reads bytes with its own request and sends only `{ type, fileName, mimeType, base64 }`. The app accepts only these pairs:<br>• `application/pdf` with `.pdf`<br>• `image/png|jpeg|gif|webp|bmp|svg+xml` with a matching extension<br>A name has at most 200 characters, no `/`, `\` or control characters, a non-empty base and no surrounding spaces. `SaveFile.toString` omits the bytes. Nothing is logged | Unit asserts the message has no key or host. JVM tests: subframe/origin, type, name and field rules |
| REQ-006 zoom kept on reload (AR-001) | Same path keeps zoom and position; another path starts at 1× | `useViewerZoomMemory` (owned by `MobileFileViewer`, keyed by path) is passed as `zoomMemory`:<br>• PDF: initial zoom from memory; scroll ratios restored after the first layout; written on commit and when scrolling settles (200 ms)<br>• image: `restore` on `load`, written on `onCommit` | `MobileFileViewer.zoom.spec.ts` (AC-005: through `isLoading` and a new URL; another path at 1×). Mutation check: both AC-005 cases fail without the memory |
| AC-004 preserved | Desktop viewers, VNC zoom, existing probes | Without `touchZoom` the viewers render as before; `FileViewer` passes nothing new to them (`FileViewer.touchZoom.spec.ts`); VNC uses `usePictureZoom` unchanged | `MobileNodeDesktop.spec.ts` (20), the full web suite (IMP-02), MSP-16 (IMP-06) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Web (`autobyteus-web/`):
  - Moved and renamed: `composables/usePictureZoom.ts` (from `composables/mobile/useNodeDesktopZoom.ts`).
  - New: `composables/usePdfPinchZoom.ts`, `composables/mobile/useViewerZoomMemory.ts`, `composables/mobile/useMobileFileDownload.ts`.
  - Changed: `components/fileExplorer/viewers/{PdfViewer,ImageViewer}.vue`, `components/fileExplorer/FileViewer.vue`, `components/mobile/views/MobileFileViewer.vue`, `components/mobile/views/MobileNodeDesktop.vue` (import), `utils/remoteAccess/shellBridge.ts`.
  - Specs: `composables/__tests__/{usePdfPinchZoom,usePictureZoom}.spec.ts`, `composables/mobile/__tests__/useMobileFileDownload.spec.ts`, `components/mobile/views/__tests__/MobileFileViewer.zoom.spec.ts`, `components/fileExplorer/__tests__/FileViewer.touchZoom.spec.ts`, `MobileNodeDesktop.spec.ts` (import).
  - Probe: `tests/e2e/mobile-file-zoom-cases.mjs` (MSP-39), wired in `tests/e2e/mobile-shell-probe.mjs`.
- Android (`autobyteus-android/app/src/`):
  - `main/.../web/ShellBridge.kt` (the `saveFile` action and rules; large messages read off the main thread by one shared thread).
  - New: `main/.../web/DownloadsSaver.kt`.
  - `main/.../MainActivity.kt` (wiring).
  - Tests: `test/.../web/ShellBridgeMessagesTest.kt`, `androidTest/.../DownloadsSaverTest.kt` (new).
- Docs: `autobyteus-web/docs/remote_access.md` (bridge `saveFile`, the phone viewer's zoom and Download), `autobyteus-android/README.md`, `GLOSSARY.md` (Shell bridge).
- `tickets/in-progress/phone-viewer-pinch-zoom-472/release-notes.md`: under "What you need to do", update the Android app.

## Important Assumptions

1. `ShellBridgeMessages.read` checks the fields, type and name but does not decode the base64. The design's DS-003 spine lists "base64 decodes" among the read rules. Decoding is in `DownloadsSaver` on its worker thread, following R-2 ("decode and write off the main thread"); the WebView message callback runs on the main thread. Bytes that do not decode, or decode to nothing, give "Couldn't save the file." (instrumented test).
2. On Android 8–9 the message says "Saved to Downloads: <name>", as REQ-004 words it, although the system Save dialog lets the user pick another folder. `<name>` is the name the user kept in the dialog. If the user cancels the dialog, nothing is shown.
3. On Android 10+, a name already in Downloads gets the system's own rename (for example "resume (1).pdf"), and the message shows the name actually saved.
4. If the page cannot read the file's bytes, the page shows "Couldn't save the file." as a toast, with the same text as the app's.
5. The two-finger mechanism is the review's fallback, made the main path after the R-1 proof (IMP-00): `touch-action: pan-x pan-y` plus non-passive `touchstart`/`touchmove` with `preventDefault` while two touches are down. One finger is left entirely to the browser.
6. The PDF's remembered position is stored as fractions of the scrolled size (`scrollLeft / scrollWidth`, `scrollTop / scrollHeight`). It is written when a gesture commits and when scrolling settles, only after the remembered place was put back.
7. `FileViewer.vue` changes by a few lines, not one: it passes `touchZoom` and `zoomMemory` to the PDF and image viewers only, so the audio, video and Excel viewers receive no unknown attributes.
8. There is no zoom indicator or Fit button in the phone viewer (the requirements ask for none). Double tap returns to 1× or fit.
9. The Download icon (`heroicons:arrow-down-tray-20-solid`) is fetched at runtime by `@iconify/vue`, as the phone shell's other icons are.
10. ArrayBuffer web messages (optional per the review) are not used; base64 is the only encoding.

## Known Risks

- RSK-001: drawing every page at 3× costs memory on long PDFs (bounded by the cap).
- RSK-002: a large PDF crosses the bridge as one base64 message. Tested with small files only; chunking is the escalation if a real file fails.
- RSK-003: iOS not built.
- The full in-app path (the Android app, a paired node, a real pinch on the device's WebView, Download into Downloads) is not run end to end here; see "Not run".
- Android 8–9 are exercised only through the Save-dialog path driven on Android 15 (no 8–9 image is installed).
- `WebShellWindowInsetsTest`'s keyboard case failed once in the first full instrumented run (IMP-08a). It passes alone (twice on base `ed481ae4ca`, twice on this branch), passes right after `DownloadsSaverTest`, and the full suite passed on rerun (IMP-08). I treat it as an emulator timing flake.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: feature, plus the one refactor the design names (`useNodeDesktopZoom` → `usePictureZoom`, Principle 15).
- Reviewed root-cause classification: N/A (feature)
- Reviewed refactor decision: `Refactor Needed Now` (the rename/move)
- Implementation matched the reviewed assessment: `Yes` (no alias left behind)
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: `git grep useNodeDesktopZoom` matches only the moved file's own comment that records where it came from.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (an older APK ignores `saveFile`, as the design says; no capability negotiation, DESIGN.md rule 9)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files removed: `Yes`
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (`ShellBridgeAction.SaveFile` is its own variant; `ViewerZoomMemory` holds two optional places)
- Canonical shared design guidance reapplied: `Yes`
- Changed source files stayed within the size guardrails: `Yes`. Effective lines:
  - `MainActivity.kt` 370 (+9).
  - `ImageViewer.vue` 245, `usePictureZoom.ts` 226, `PdfViewer.vue` 169, `DownloadsSaver.kt` 169, `usePdfPinchZoom.ts` 165, `ShellBridge.kt` 153, `FileViewer.vue` 107, `shellBridge.ts` 91, `MobileFileViewer.vue` 86, `useMobileFileDownload.ts` 78, `useViewerZoomMemory.ts` 32.
- Notes: during the work a `git mv` was briefly swept into the docs commit. It was redone before any push, and the history is clean (`0185e8f7c5` holds only the documents).

## Persisted Data Transition Check

- Approved decision: `Not Affected`. Files saved to Downloads are the user's; the Android 8–9 cache file is removed after the dialog answers, and stale ones are removed on the next start.

## Environment Or Dependency Notes

- Fresh worktree: `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-web exec nuxt prepare`.
- Android: JDK 21, SDK at `~/Library/Android/sdk`. I created my own AVDs (`impl472_api35` on port 5602, `impl472_api29` on port 5604), ran headless, and deleted both afterwards; other AVDs and emulators were not touched.
- No new dependencies.

## Checks Run

Evidence: `tickets/in-progress/phone-viewer-pinch-zoom-472/evidence/implementation/`. Each log has a header (command, commit, environment, date, ID). Environment: macOS 26.5.2, node v22.23.1, pnpm 10.28.2, JDK 21.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-00 | R-1 spike: a WebView page with `touch-action: pan-x pan-y` and non-passive touch listeners; two-finger pinch out and in, a two-finger drag and a one-finger drag injected as real MotionEvents (`UiAutomation.injectInputEvent`); the spike test was not committed (its source is in the log) | `ed481ae4ca` + spike | my AVD API 35 (Android 15) | the Android WebView's handling of the chosen mechanism | REQ-001, REQ-003 (R-1) | Pass | `IMP-00-webview-pinch-spike.log` | `"cancelable2":12,"prevented2":12,"maxScale":4.0…,"scrollTop":0,…"vvScale":1`; one finger: `"scrollTop":296.76…` |
| IMP-01 | `pnpm -C autobyteus-web typecheck` | `d2b9f99603` | shell | web app, Electron main, scripts | all | Pass | `IMP-01-web-typecheck.log` (first attempt `IMP-01a`, one new test-file error, fixed in `d2b9f99603`) | `production errors: 0; test-file errors: 93 in 40 files (baseline 93 in 40 files)` |
| IMP-02 | `pnpm -C autobyteus-web exec cross-env NUXT_TEST=true vitest run` | `5073d38a56` (`d2b9f99603` changes one assertion; IMP-09 reruns that spec) | shell | every web spec | AC-001…AC-005 | Pass | `IMP-02-web-nuxt-tests-excerpt.log` (full log not committed) | `Test Files  755 passed (755)`, `Tests  5696 passed \| 2 skipped (5698)` |
| IMP-03 | web guards and `audit:localization-literals` | `5073d38a56` | shell | boundaries, locales | — | Pass | `IMP-03-web-guards.log` | `Passed with zero unresolved findings.` |
| IMP-04 | `pnpm -C autobyteus-server-ts build` | `e342386a47` | shell | server for the probe (no server change) | — | Pass | `IMP-04-server-build.log` | `Sanitized built-module/bootstrap smoke passed` |
| IMP-05 | `pnpm -C autobyteus-web build:mobile-web` | `e342386a47` (no product change after it) | shell | the phone bundle the probe serves | AC-001…AC-004 | Pass | `IMP-05-mobile-web-build.log` | `Mobile web assets written to` |
| IMP-06 | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<tmp> --cases=MSP-16,MSP-39` | `5073d38a56` | clean env; test-owned node; headless Chrome 390×844, touch, DPR 2; touches through CDP `Input.dispatchTouchEvent` | phone viewer zoom, Download (browser path), node files (MSP-16) | AC-001, AC-002, REQ-003, REQ-004 (browser), AC-004 | Pass (first attempt `IMP-06a`: MSP-39's download check read the CDP folder that Playwright bypasses; fixed in `5073d38a56`) | `IMP-06-mobile-shell-probe.log`, `IMP-06-mobile-shell-probe-cases.json`, `IMP-06-MSP-39-{pdf-1x,pdf-2x,pdf-2x-scrolled,image-pinched}.png` | `mobile-shell probe: Pass`. In `MSP-39`:<br>• `"base": 358` → `"pagesWidth": 716`, `"anchorNow": {"x":195,"y":420}` = centre<br>• `bitmapWidth` 1432<br>• `scrollTop` 356 → 741<br>• `zoomScale` 1 throughout<br>• downloads `resume-472.pdf` / `photo-472.png` with the same bytes |
| IMP-07 | `./gradlew :app:testDebugUnitTest :app:assembleDebug :app:compileDebugAndroidTestKotlin` | `5073d38a56` | JDK 21 | Android build, JVM tests (bridge rules) | REQ-005, AC-003 | Pass | `IMP-07-android-unit-build.log` | `BUILD SUCCESSFUL` (`ShellBridgeMessagesTest`: 13 tests, 0 failures) |
| IMP-08 | `ANDROID_SERIAL=emulator-5602 ./gradlew :app:connectedDebugAndroidTest` | `d2b9f99603` | my AVD API 35 (Android 15), headless | all instrumented tests, incl. `DownloadsSaverTest` | REQ-004, AC-003, AC-004 | Pass (first attempt `IMP-08a`: 16/17, the keyboard-insets flake; see Known Risks) | `IMP-08-android-connected-api35.log`, `IMP-08a-android-connected-api35.log` | `Finished 17 tests`, `BUILD SUCCESSFUL` |
| IMP-09 | `vitest run components/mobile/views/__tests__/MobileFileViewer.zoom.spec.ts` | `d2b9f99603` | shell | AC-005 and the Download button at the viewer level | AC-005, REQ-004 | Pass | `IMP-09-web-zoom-spec.log` | `Tests  3 passed (3)` |
| IMP-10 | `ANDROID_SERIAL=emulator-5604 ./gradlew :app:connectedDebugAndroidTest -P…class=org.autobyteus.mobile.DownloadsSaverTest` | `d2b9f99603` | my AVD API 29 (Android 10), headless | `DownloadsSaver` on the first Android with `MediaStore.Downloads` | REQ-004 | Pass | `IMP-10-android-saver-api29.log` | `Finished 3 tests on impl472_api29(AVD) - 10`; Downloads empty afterwards |

Mutation checks (observed, not saved as files):
- `MobileFileViewer` without its zoom memory: the two AC-005 cases fail.
- `DownloadsSaverTest` leaves no file in Downloads on either emulator (`content query … downloads` → "No result found.").

- Not run, and why:
  - The in-app end-to-end on a device or emulator: the app paired to a test-owned node, a PDF and an image opened in the phone viewer, pinch/pan/double tap with real fingers or injected MotionEvents, and Download into Downloads with the toast. This is AC-001…AC-003's Android probe, the API/E2E engineer's choice of device or emulator. The pieces are covered separately: the mechanism in the Android WebView (IMP-00), the page in Chrome (IMP-06), the saver on Android 10 and 15 (IMP-08, IMP-10), and the message rules (IMP-07).
  - Android 8–9: no system image installed; the Save-dialog path ran on Android 15 (IMP-08/IMP-10, `DownloadsSaverTest`).
  - A large real PDF through the bridge (RSK-002): only small files.
  - Server suites: no server change.

## Frontend Rendered-Result Check

- Affected surfaces / journeys:
  - The phone viewer: a PDF and an image, at 1×, zoomed and scrolled.
  - The bar with Download.
  - The browser download.
- References: `requirements-doc.md` REQ-001…REQ-006, `design-spec.md` DS-001…DS-003.
- Design system and adjacent surfaces reviewed: `MobileScreenBar` (the `actions` slot; the button matches the back button's 48 px round target), the VNC viewer's zoom (`MobileNodeDesktop`), the shared `FileViewer`.
- Surface used: TESTING.md's phone shell probe, with the production phone bundle served by a test-owned node in headless Chrome with touch at 390×844 (MSP-39). The R-1 Android WebView spike ran on my emulator.
- States, layouts and interactions inspected (screenshots `IMP-06-MSP-39-*.png`, looked at):
  - **PDF at 1×:** page width; the name, the back arrow and Download in the bar.
  - **PDF at 2×:** small print readable and sharp; the bar unchanged.
  - **PDF at 2×, scrolled:** one finger moves on through the pages.
  - **Image at 2×:** fills the width and stays centred vertically while still shorter than the screen.
  - **Download:** absent while the file opens and for text files (spec).
- Visual or interaction issues found and corrected: none in the rendered surfaces. The probe's own download check was corrected (IMP-06a).
- Remaining unverified:
  - Rendering inside the Android app's WebView with real fingers (see "Not run").
  - Very long PDFs at 3× (memory).

## Downstream Coverage Hints / Suggested Scenarios

1. AC-001/AC-002 in the Android app (a debug APK from this branch) on a device or emulator, with a test-owned node and a several-page PDF (a resume) and an image opened from a conversation:
   - pinch in and out, pan, scroll through pages, double tap;
   - the back arrow returns;
   - the run screen never zooms.
2. AC-003 in the app: Download of the PDF and the image → the files are in Downloads with their names, and the toast says "Saved to Downloads: <name>". With logcat captured: no credential and no file contents. A non-PDF/image `saveFile` (from DevTools, for example) is ignored.
3. AC-005 live: zoom a PDF, then reload the same file (open it again from its link, or change it on the node while it is open), and the zoom and position stay.
4. RSK-002: a larger real PDF (a few MB) through Download in the app.
5. Android 8–9, if a device or image is available: the Save dialog; rotate while it is open; Save; Cancel.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- The Android in-app probe for AC-001…AC-003 (scenarios 1–2), the live reload (3), a larger PDF (4), and the independent validation the API/E2E role owns.
