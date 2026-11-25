# Design Spec

## Basis

- SR-002 (D-5 revised after implementation DI-001; requirements unchanged). Requirements approved by the Solution Designer within the direction.
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

### D-5: PDF worker (revised in SR-002)

- **Owner:** `utils/pdf/sharedPdfWorker.ts` owns pdf.js's worker for the app's lifetime. It is one worker plus one pdf.js `PDFWorker` wrapper on it. No document owns or destroys either.
- **The pdf.js copy:** `vue-pdf-embed/dist/index.essential.mjs` bundles its own pdf.js 4.10.38. It exports only `GlobalWorkerOptions`; the bundle puts its classes on `globalThis.pdfjsLib` when it is imported. `getDocument` checks `worker instanceof` that bundled `PDFWorker`. So the wrapper must come from `globalThis.pdfjsLib.PDFWorker`, not from `pdfjs-dist`.
- **`pdfjs-dist`:** a direct dependency of `autobyteus-web` at exactly 4.10.38 (vue-pdf-embed's version, one copy). It supplies only the worker script, `pdfjs-dist/build/pdf.worker.min.mjs?worker&inline`, which runs on the other side of the port and must match the bundled version.
- **`getSharedPdfWorker()`:** on the first call it:
  - imports the essential build (`vue-pdf-embed/dist/index.essential.mjs`);
  - creates the inline module worker once;
  - creates the wrapper with `new pdfjsLib.PDFWorker({ port })`.
  - Later calls return the same wrapper.
  - If `globalThis.pdfjsLib?.PDFWorker` is missing (a library upgrade), it throws a named error. A spec covers this, so an upgrade fails in tests, not silently in the product.
- **`PdfViewer.vue`:**
  - imports the essential build;
  - passes `source` as a stable computed `{ url, worker }` that changes only with the URL;
  - vue-pdf-embed hands that object to `getDocument`, and a loading task given a `worker` does not destroy it.
- **`GlobalWorkerOptions` stays unset** (no `workerPort`, no `workerSrc`). A `getDocument` without the shared worker then fails with "No workerSrc" instead of silently taking ownership of a shared wrapper (Principle 13).
- **Why not the port alone (SR-001):** `PDFWorker.fromPort` returns one cached wrapper per port, and each loading task owns it. vue-pdf-embed destroys the old task on unmount without awaiting it, so the next document got a wrapper still being destroyed and failed (IMP-003: `alpha:3 beta:LOAD-ERROR gamma:4`, ×4).
- **Rejected:** a worker file URL (unsafe in `file://`, DEC-002); delaying the next mount (no handle to wait on, timing-based); patching vue-pdf-embed (an unmount still can't await).
- **The worker lives for the app's lifetime.** Nothing is revoked per document.

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

- Verify the inline worker in the packaged window (`file://`), and the PDF rendering on the phone. IMP-003's fresh-open sequence (alpha, beta, gamma opened one after another, several rounds) is part of AC-005's check.
- Measure the blob-URL count as 471 did.
- iOS: use your own simulator.
