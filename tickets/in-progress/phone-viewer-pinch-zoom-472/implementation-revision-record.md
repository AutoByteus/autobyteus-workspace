# Implementation Revision Record — phone-viewer-pinch-zoom-472 (autobyteus-472)

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md` (ARCH-REV-002 Pass, SR-003) | N/A | `Initial Baseline` | SR-003, ARCH-REV-002 | Implemented; ready for code review |

## Revision Entries

### IR-001 — Touch zoom for PDFs and images in the phone viewer; Download to the phone

- Triggering role, report path, and round: Architecture Reviewer, `tickets/in-progress/phone-viewer-pinch-zoom-472/design-review-report.md` (ARCH-REV-002, Pass), initial implementation round.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: REQ-001…REQ-006 implemented on `codex/phone-viewer-pinch-zoom-472` (base `ed481ae4ca`): commits `a0c57dc9dd` (web), `617b43165e` (Android, docs, release notes), `e342386a47` and `5073d38a56` (probe case MSP-39), `d2b9f99603` (spec type fix). The checks are listed in `implementation-handoff.md`.
- Related solution revision IDs: SR-003
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: the initial implementation handoff.
- Approved behavior or requirement IDs affected: REQ-001…REQ-006; AC-001…AC-005.
- Implementation delta:
  1. R-1 first: a spike in the Android 15 WebView (injected two-finger MotionEvents) proved that `touch-action: pan-x pan-y` plus non-passive touch listeners with `preventDefault` while two touches are down keeps two fingers for the page (no scroll, no page zoom), while one finger still scrolls natively (`IMP-00`).
  2. `composables/usePictureZoom.ts`: moved and renamed from `composables/mobile/useNodeDesktopZoom.ts`, with VNC behavior unchanged. It gains `onCommit` (where the picture is after a finished pinch, drag or double tap) and `restore`. `MobileNodeDesktop` and its spec import the new name.
  3. `composables/usePdfPinchZoom.ts` (new) does the PDF's two-finger pinch and double tap:
     - During the pinch, a live CSS transform around the pinch point follows the fingers.
     - On release, `setZoom` draws the pages again at base × zoom (1×–3×) and resolves once vue-pdf-embed has sized the pages. Then the transform is cleared and the scroller scrolls so the pinch point is under the fingers.
     - One finger is the browser's own scrolling.
  4. `PdfViewer.vue` and `ImageViewer.vue` get a `touchZoom` mode (and `zoomMemory`). The desktop rendering without `touchZoom` is unchanged. `FileViewer.vue` passes `touchZoom` and `zoomMemory` to the PDF and image viewers only.
  5. `composables/mobile/useViewerZoomMemory.ts` (new) is owned by `MobileFileViewer`. It keeps the zoom and position for the open path, so a reload keeps them; another path starts at 1× (AR-001).
  6. Download:
     - `composables/mobile/useMobileFileDownload.ts` reads the bytes from the open file's own URL with `fetchAuthorizedResourceBlob`. In the app it sends them as base64 over the bridge `saveFile`; in a browser it uses `<a download>`.
     - The Download button sits in the `MobileFileViewer` bar for a loaded PDF or image.
     - `shellBridge.ts` gains `saveFile`.
  7. Android:
     - `ShellBridgeMessages.read` accepts `saveFile` only from the node's main frame. It needs a PDF or image MIME type with a matching extension, and a plain name: at most 200 characters, no folder, no control character. The bytes are not printed. Messages over 16 KB are read off the main thread.
     - `web/DownloadsSaver.kt` (new): Android 10+ write to `MediaStore.Downloads` (IS_PENDING). Android 8–9 use `ACTION_CREATE_DOCUMENT`, with the bytes in the app cache and the pending save kept in the saved instance state. Decoding and writing happen off the main thread, and the result is shown as a toast.
     - `MainActivity` wiring.
  8. Docs: `autobyteus-web/docs/remote_access.md`, `autobyteus-android/README.md`, `GLOSSARY.md` (Shell bridge). `release-notes.md` (What you need to do: update the Android app).
  9. Probe case MSP-39 (`tests/e2e/mobile-file-zoom-cases.mjs`).
- Changed files or areas: see the handoff's Key Files.
- Local validation and result: see `implementation-handoff.md` § Checks Run.
- Next recipient or routing: `/software_engineering_team/code_reviewer` (Medium / High).
- Remaining limitations or risks:
  - Android 8–9 are not run on a real Android 8–9 phone or emulator, since no image is installed. The Save-dialog path is driven on Android 15 by the instrumented test.
  - The full in-app flow (the app on a phone, a paired node, a PDF opened, pinched and downloaded) is left to API/E2E (AC-001…003).
