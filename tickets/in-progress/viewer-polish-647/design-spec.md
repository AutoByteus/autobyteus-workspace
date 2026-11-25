# Design Spec

## Basis

- SR-001. Requirements approved by the Solution Designer within the direction.
- Authorities read (this conversation): architecture-design, design-principles (incl. 17), `DESIGN.md` (rules 11, 12), design cases.
- Data contract: not affected. No stored or exchanged shape changes; the bridge and HTTP contracts are unchanged.

## Task Size And Architectural Risk

- Size: `Medium` (six small changes in the web and the iOS app).
- Risk: `Low`. Existing owners and contracts. The one build input is the web's `package.json` and lockfile (`pdfjs-dist` added at the version already installed), so DESIGN.md rule 12 applies: the fresh-start build and the build-only Desktop Release run.
- Escalation trigger: the inline worker failing in the packaged window; AVKit refusing landscape when presented.

## Design

| D | Owner | Change |
| --- | --- | --- |
| D-1 | `MonacoEditor.vue` (the editor's one owner) | The create options gain `lineNumbers: 'off'`, `glyphMargin: false`, `folding: false`, `lineDecorationsWidth: 6`, `lineNumbersMinChars: 0`, before `...restOptions` (a caller may still override). No other caller exists |
| D-2 | `CollaborationMessageReferenceViewer.vue` | The media probe treats `416` with `Content-Range: bytes */0` as an empty file: it hands the URL to `FileViewer` as for a 206. Any other 416 or error keeps today's handling |
| D-3 | iOS `NativeMediaPlayer.swift` | See below |
| D-4 | `AuthorizedMediaLoader.swift:35` | Label `org.autobyteus.media-loader` |
| D-5 | Web PDF worker | See below |
| D-6 | `AgentEventMonitor.vue` | `watch(effectiveRunId, () => { filePreviewStatus.value = '' })` |

### D-3: iOS player

- `NativeMediaPlayerViewController` stays the playback's owner (a black host screen): the loader, the cache, the audio session (642 SR-005, N-7 and N-8), landscape for a wide video, and the error state with Back.
- It no longer embeds the player or draws a bar. Once the item is ready, it **presents** its `AVPlayerViewController` full screen:
  - the title is set through `AVPlayerItem.externalMetadata` (common title = the file name);
  - the audio placeholder stays in `contentOverlayView`;
  - landscape is requested through the window scene's geometry, as today.
- When AVKit closes (its close button or a swipe down: the host's `viewDidAppear` after a presented child's dismissal, or the `AVPlayerViewController` delegate where the platform offers it), the host dismisses itself. The existing `viewDidDisappear` teardown runs once.
- Comments name only these paths.

### D-5: PDF worker

- `pdfjs-dist` is added to `autobyteus-web/package.json` with the exact version vue-pdf-embed uses (4.10.38), so the store holds one copy. Check with `pnpm why pdfjs-dist`.
- A new `utils/pdf/sharedPdfWorker.ts` owns `ensureSharedPdfWorker()`. On the first call it creates one worker from `pdfjs-dist/build/pdf.worker.min.mjs?worker&inline` and sets `GlobalWorkerOptions.workerPort`; later calls do nothing.
- `PdfViewer.vue` imports `vue-pdf-embed/dist/index.essential.mjs` and calls `ensureSharedPdfWorker()` before rendering.
- The worker lives for the app's lifetime (one, intended); there is nothing to revoke per document.

## Change Scope

- In scope: the files in the table, their specs, `package.json` and lockfile, the iOS tests, and the localization of nothing new.
- Left alone:
  - the editor's word wrap and font;
  - the media players' streaming;
  - the bridge;
  - the 640 toggle.
- Follow-ups: none.

## Removal

- The iOS app bar view and its constraints.
- The full-build import.
- The stale comment.

## Guidance

- Verify the inline worker in the packaged window (`file://`), and the PDF rendering on the phone.
- Measure the blob-URL count as 471 did.
- iOS: use your own simulator.
