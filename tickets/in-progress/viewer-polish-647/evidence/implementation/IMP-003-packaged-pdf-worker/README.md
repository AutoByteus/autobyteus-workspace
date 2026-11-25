# IMP-003: the shared PDF worker in the packaged `file://` window (AC-005, D-5)

> **Final result (after SR-002, commit `9072eb89c4`): Pass.** See "After SR-002" at the end. The first run below, on
> `0b88e1e761`, found the Design Impact that SR-002 resolved.

- Commit: `0b88e1e761` (D-5 as designed), built by the fresh-start build (IMP-002) from a `--no-local` clone.
- Environment: macOS arm64; my own isolated instance (`pnpm isolated-app start --app <tmp>/fresh/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`), its own data root; never the user's app or data. Window URL `file:///…/AutoByteus.app/Contents/Resources/app.asar/dist/renderer/index.html`.
- Date: 2026-11-25.
- Method: Playwright over the instance's CDP control port (`steps/cdp-eval.mjs`); a workspace on `<tmp>/pdfws` with three PDFs made by `steps/mkpdf.py` (alpha 3 pages, beta 2, gamma 4); `URL.createObjectURL`, `Worker` and its `postMessage` instrumented before the first PDF opened (471's method).
- Result: **Design Impact.** The inline worker works in the packaged window, and one worker serves every PDF. But a PDF opened right after another one is replaced fails to load, every time.

## What works

| Check | Result |
|---|---|
| Inline module worker in `file://` | Created from one `text/javascript;charset=utf-8` blob, `type: module`, no worker errors; documents load through it (`postMessage` count grows) |
| Workers for the whole session | 1 (after 4 + 6 + 15 PDF opens) |
| `text/javascript` blob URLs for the whole session | 1 (AC-005 asks ≤ 1) |
| Switching between already-open PDF tabs (`s4`, 6 switches) | All render (3, 2, 3, 4, 2, 4 pages) |

## What fails (`steps/s5-fresh-open.js`)

All files closed, then alpha, beta and gamma opened one after another from the tree, four rounds:

```
alpha.pdf:3 beta.pdf:0:LOAD-ERROR gamma.pdf:4   (×4, identical)
PDF load error: Error: PDFWorker.fromPort - the worker is being destroyed.
Please remember to await `PDFDocumentLoadingTask.destroy()`-calls.
```

Gamma renders only because beta never got a document; any PDF opened after a loaded one is replaced fails.

## Cause (vue-pdf-embed 2.1.3 essential build, its bundled pdf.js 4.10.38)

- `getDocument` without a `worker` parameter takes `PDFWorker.fromPort({ port: GlobalWorkerOptions.workerPort })`, which returns **one cached wrapper per port**, and the loading task owns it (`task._worker`).
- `PDFDocumentLoadingTask.destroy()` marks that wrapper `_pendingDestroy`, awaits the transport's destroy (a worker round trip), then destroys the wrapper and drops it from the cache.
- `useVuePdfEmbed` calls `loadingTask.destroy()` on unmount **without awaiting it**. The viewer for the next file mounts at once, its `getDocument` gets the cached wrapper while it is pending destroy, and `fromPort` throws.
- In-window control (`steps/s6-prototype.js`, bundled `globalThis.pdfjsLib`, destroy not awaited): `alpha:3`, then beta, gamma, alpha and beta all `ERR PDFWorker.fromPort - the worker is being destroyed.`

## A contained fix, proven in the same window (`steps/s6-prototype.js`)

One long-lived `PDFWorker` wrapper on the shared port, passed to every document as `getDocument({ url, worker })`. A task given a `worker` does not own it, so no document's destroy marks or destroys it.

```
fixed: alpha:3 beta:2 gamma:4 alpha:3 beta:2    (destroy not awaited, as vue-pdf-embed does)
after every document destroyed: wrapper destroyed=false, same port; a new document loads (gamma:4)
workers 1, text/javascript blobs 1
```

The bundled `PDFWorker` class is not an ES export of `vue-pdf-embed/dist/index.essential.mjs` (it exports `GlobalWorkerOptions`, the component and `useVuePdfEmbed`); it is on `globalThis.pdfjsLib`, which the bundle sets when imported. `getDocument` checks `worker instanceof` the bundled class, so `pdfjs-dist`'s own `PDFWorker` would not do.

## After SR-002 (commit `9072eb89c4`): Pass

- Build: a new `--no-local` fresh clone at `9072eb89c4` and the release job's build and ARM64 verify steps (IMP-002). A new isolated instance from that app (its own data root, removed when stopped).
- Steps: `steps/s1-setup.js` (workspace on `<tmp>/pdfws`, set as the New chat's folder), `steps/s2-panel.js` (the right panel), then `steps/s8-retest.js`. The instrumentation went in before the first PDF opened.
- Result:

```
fresh opens (all files closed before each round):
  alpha.pdf:3 beta.pdf:2 gamma.pdf:4   (×5, identical)
switches between open tabs: alpha:3 beta:2 alpha:3 gamma:4 beta:2
workers for the session: 1 (blob:, module); worker errors 0
text/javascript blob URLs for the session: 1        (AC-005: ≤ 1)
other blobs: 5 application/pdf (the viewer's own file blobs, unchanged by this ticket)
GlobalWorkerOptions: workerPort unset, workerSrc ""  (as SR-002 designs)
console errors: none
```

- `after-sr002-gamma.png`: gamma.pdf drawn in the Files viewer of the packaged window, after alpha and beta.
