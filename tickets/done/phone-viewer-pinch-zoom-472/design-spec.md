# Design Spec — phone-viewer-pinch-zoom-472 (autobyteus-472)

## Solution And Approval Basis

- Revision `SR-003` (answers ARCH-REV-001); requirements approved by the Solution Designer within the user's direction (user informed); design approval by the user: `Not required` (no visible behavior beyond REQ-001…005).
- Design status: `Ready`. Branch on `origin/personal` @ `ed481ae4ca` (with autobyteus-471).
- Authorities read: architecture-design, design-principles, `/DESIGN.md` (rules 1, 4, 9, 11; rule 9: the phone page and the Android app are one release, so no capability negotiation is designed), `GLOSSARY.md` ("Shell bridge").
- Conflicts: none. Coordination: autobyteus-452 (another team copy) edits `FileViewer.vue`; this design edits `PdfViewer.vue`, `ImageViewer.vue` and passes one prop through `FileViewer.vue` (one line); the copies resolve the overlap at merge.

## Current-State Read

See investigation notes: the phone viewer (`MobileFileViewer.vue`) shows the shared `FileViewer`; `PdfViewer` renders pages at the container width with `vue-pdf-embed`; `ImageViewer` zooms only with a mouse; `useNodeDesktopZoom` is the existing touch zoom (VNC); the Android shell bridge carries page→app actions from the node's main frame only; the WebView keeps zoom off.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium` (web: one composable moved and renamed, two viewers, the phone viewer bar, a download composable, the bridge client; Android: a bridge action, a Downloads saver, its tests; release notes).
- Architectural risk: `High`: a new page→app bridge contract that writes files on the phone, and a new APK.
- Escalation trigger: a WebView message too large for real PDFs (see RSK-002); a viewer that cannot keep page scrolling while zoomed.

## Intended Change

Touch zoom inside the phone's PDF and image viewers, and a Download button that hands the already-fetched bytes to the Android app, which saves them to Downloads.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002.
- Derived consumers: `useNodeDesktopZoom` → renamed `usePictureZoom` (Principle 15: it now zooms any fitted picture); its one caller `MobileNodeDesktop.vue` and its tests follow. Bridge message set (`ShellBridgeMessages.read`, web `shellBridge.ts`) gains `saveFile`.
- Deliberately left alone: desktop viewers' mouse behavior; other file types; iOS app (named needs only); `FileViewer.vue` beyond passing `touchZoom`.
- Follow-ups: none.

## Data-Flow Spines

| Spine | Start | End | Owner |
| --- | --- | --- | --- |
| DS-001 PDF zoom | Pinch on a PDF page | Pages drawn at the new width, pinch point kept under the fingers | `usePdfPinchZoom` in `PdfViewer` |
| DS-002 Image zoom | Pinch on an image | Transformed picture | `usePictureZoom` in `ImageViewer` |
| DS-003 Download | Tap Download | File in Downloads + message | `useMobileFileDownload` → bridge `saveFile` → `DownloadsSaver` |

- DS-001: `pointer events on the pages container (touch-action: pan-x pan-y; two fingers handled here) → live CSS scale of the pages during the pinch → on release: zoom = clamp(1, 3) → vue-pdf-embed width = baseWidth × zoom → scrollLeft/Top set so the pinch centre stays under the fingers → container scrolls natively to pan and page`; double tap → 1× ↔ 2× at the tap point. One finger keeps the browser's own scrolling.
- DS-002: `ImageViewer` with `touchZoom` uses `usePictureZoom(layer, { picture: natural size })` (pinch 1–4×, pan, double tap fit ↔ fill); without it, today's mouse zoom (desktop).
- DS-003: `Download (bar action, PDF/Image, loaded) → useMobileFileDownload: authorizedFetch(the open file state's `url`: a workspace content URL, or a node file's object URL from 471's shared loader) → Blob → in the app: shell.saveFile({ fileName, mimeType, base64 }) ; in a browser: <a download> on an object URL → Android ShellBridgeMessages.read: main frame, node origin, type saveFile, mime application/pdf or image/*, fileName = last path segment, no '/', '\\', control chars, ≤ 200 chars, base64 decodes → actions.onSaveFile → DownloadsSaver: API ≥ 29 MediaStore.Downloads insert (IS_PENDING, write, clear) ; API 26–28 ACTION_CREATE_DOCUMENT with the suggested name, write on result → Toast "Saved to Downloads: <name>" | "Couldn't save the file."`

## Zoom state across reloads (REQ-006; ARCH-REV-001 AR-001)

- **Owner and lifetime:** `MobileFileViewer` owns one zoom-state holder, `useViewerZoomMemory` (`composables/mobile/useViewerZoomMemory.ts`), created once per `MobileFileViewer` instance. `MobileFileViewer` stays mounted while a file is open (`MobileFiles.vue` `v-if="openPath"`), including while the same path reloads; the viewers inside it do not (its `isLoading` branch replaces `FileViewer` with "Opening…", `MobileFileViewer.vue:7-9`, on a workspace reload, `fileExplorerContentActions.ts:213`, and on a node-file load, `useMobileNodeFile.ts:47-51`). So the zoom state cannot live in the viewers.
- **Shape:** `{ path: string; pdf: { zoom: number; scrollLeftRatio: number; scrollTopRatio: number } | null; image: { scale: number; x: number; y: number } | null }`. When `path` changes, the holder resets to `{ path, pdf: null, image: null }` (another file starts at 1×); a reload of the same path keeps it.
- **Flow:** `MobileFileViewer` passes `zoomMemory` (the holder for the current path) through `FileViewer` (`touchZoom` + `zoomMemory` props, forwarded only to `PdfViewer` and `ImageViewer`). On mount and after its content is ready (`vue-pdf-embed` `loaded`; image `load`), a viewer applies the remembered state if present (PDF: width = base × zoom, then the scroll position from the ratios; image: `usePictureZoom` scale and offset); on each committed gesture (pinch end, pan end, double tap) it writes the state back. Desktop viewers get no holder and behave as today.
- **Test:** AC-005 at the `MobileFileViewer` level: zoom a PDF and an image, drive the open-file state through `isLoading: true` and back with a new URL for the same path, and assert the zoom and position after remount; a different path starts at 1×.
- 472 does not change the file-change event shape, `fileExplorerTreeActions` or `_reloadOpenFile`.

## Ownership Map

- `usePictureZoom` (`composables/usePictureZoom.ts`, moved from `composables/mobile/useNodeDesktopZoom.ts`, behavior unchanged): zoom of one fitted picture.
- `usePdfPinchZoom` (`composables/usePdfPinchZoom.ts`, next to `usePictureZoom.ts`): PDF pinch/double tap → zoom and scroll anchor (R-3).
- `useViewerZoomMemory` (`composables/mobile/useViewerZoomMemory.ts`): the path-keyed zoom state owned by `MobileFileViewer` (AR-001).
- `useMobileFileDownload` (`composables/mobile/useMobileFileDownload.ts`): bytes, bridge or browser download, its message.
- `shellBridge.ts`: `saveFile(input)`.
- Android `ShellBridge` / `ShellBridgeMessages`: the `saveFile` action and its rules; `DownloadsSaver` (`web/DownloadsSaver.kt`): writing to Downloads; `MainActivity` wires the action and the CREATE_DOCUMENT result.

## Interfaces

| Interface | Shape |
| --- | --- |
| Bridge message `saveFile` | `{ "type": "saveFile", "fileName": "<name>", "mimeType": "application/pdf" \| "image/…", "base64": "<bytes>" }`; no reply (the app shows the result) |
| `FileViewer` props `touchZoom?: boolean`, `zoomMemory?: ViewerZoomMemory` | passed by `MobileFileViewer` only; forwarded to `PdfViewer` / `ImageViewer` |
| `MobileScreenBar` `actions` slot | Download button (`aria-label="Download"`) for PDF/Image when loaded |

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced by |
| --- | --- | --- |
| `composables/mobile/useNodeDesktopZoom.ts` (name and place) | Now zooms any picture | `composables/usePictureZoom.ts` |

## Legacy / Compatibility

- No capability negotiation between the page and the app (DESIGN.md rule 9): an older app ignores `saveFile` (unknown types are ignored, `ShellBridgeMessages.read`); the release notes say a new APK is needed for Download.

## Persisted Data

- `Not Affected` (files saved to the phone's Downloads are the user's).

## Risks

- RSK-001: drawing every page at 3× width costs memory on long PDFs (bounded by the 3× cap).
- RSK-002: a large PDF crosses the bridge as base64 in one message (about 1.33× its size); fine for resumes and typical PDFs; if a real file fails, chunking is the escalation.
- RSK-003: iOS not built (needs: page zoom off in the shell, a save action with a share sheet).

## Release

- Needs a new Android APK for Download (release notes: "Update the Android app to download PDFs and images"); zoom ships with the node's page.

## Change Sequence

1. Done: the branch is on `ed481ae4ca` (with 471).
2. Move/rename `usePictureZoom`; `ImageViewer` touch zoom; `PdfViewer` pinch zoom; `touchZoom` prop; tests.
3. Download composable, bar button, bridge client; Android action, saver, wiring, JVM tests.
4. Android probe (AC-001…003); release-note line.

## Guidance For Implementation

- From the review (non-blocking, R-1…R-3): prove the two-finger pinch in the Android WebView first; if `touch-action: pan-x pan-y` lets Chromium take a two-finger move as a scroll, use non-passive `touchstart`/`touchmove` and `preventDefault` once two touches are down. In `ShellBridgeMessages.read`, the file name's extension must match the MIME type (`.pdf` for `application/pdf`; an image extension for `image/*`). Decode base64 and write the file off the main thread. On Android 8–9, keep the pending save across activity re-creation until the Save dialog returns (or refuse with the message if it was lost). ArrayBuffer web messages may replace base64 where the WebView supports them (`WEB_MESSAGE_ARRAY_BUFFER`); base64 stays the baseline.

- Start from the user's case: a several-page PDF (a resume) in the Android app.
- No credential in the bridge message, file name or logs; do not log file contents.
