# IMP-001: web specs, red then green (D-1, D-2, D-5, D-6)

- Environment: macOS arm64, Node 22; every command ran as `env -i PATH="$PATH" HOME=~ TMPDIR=<tmp> …` from `<worktree>/autobyteus-web` (my shell carries a live app's `AUTOBYTEUS_*` variables).
- Date: 2026-11-25.
- Result: **Pass.** Every new case failed on the old code and passes on the new.

## D-1, D-2, D-6 (commit `b3602c4156`)

Command: `npx vitest run components/fileExplorer/__tests__/MonacoEditor.spec.ts components/workspace/collaboration/__tests__/CollaborationMessageReferenceViewer.spec.ts components/workspace/agent/__tests__/AgentEventMonitor.remoteRunFiles.spec.ts`

| Run | Code | Result |
|---|---|---|
| Red | base `bc4351cad7` with the new specs | 3 failed, 30 passed |
| Green | `b3602c4156` | 33 passed |

Red failures, one per change:
- `MonacoEditor.vue > renders and initializes monaco editor…`: `create` options lack `lineNumbers: 'off'`, `glyphMargin: false`, `folding: false`, `lineDecorationsWidth: 6` (D-1).
- `CollaborationMessageReferenceViewer.vue > a zero-byte video reference (416 bytes */0) opens as an empty file, with no error` (D-2). Its companion case, 416 with `bytes */2048` is still an error, passes on both.
- `AgentEventMonitor.remoteRunFiles > the status line clears when the shown run changes, and stays gone on the way back` (D-6).

## D-5 as revised in SR-002 (commit `9072eb89c4`)

Command: `npx vitest run utils/pdf/__tests__/sharedPdfWorker.spec.ts components/fileExplorer/viewers/__tests__/PdfViewer.sharedWorker.spec.ts`, red against `0b88e1e761` (D-5 as first designed).

| Run | Code | Result |
|---|---|---|
| Red | `0b88e1e761` with the new specs | 2 failed, 1 passed |
| Green | `9072eb89c4`: `npx vitest run utils/pdf components/fileExplorer/viewers components/mobile/views` | 20 files, 177 passed |

- Red: `getSharedPdfWorker > makes one worker and one wrapper on it…` (`getSharedPdfWorker is not a function`); `PdfViewer and the shared pdf.js worker > loads each PDF as { url, worker }…` (the viewer still passed the bare URL).
- The third case, `fails with a named error … when the bundled pdf.js offers no PDFWorker`, passed on the old code only vacuously: both names were undefined, and `toThrow(undefined)` accepts any throw. On the new code it asserts `PdfJsWorkerUnavailableError` and that no worker was made.
- `MobileFileViewer.zoom.spec.ts` still doubled `'vue-pdf-embed'` (the full build). Since `0b88e1e761` it loaded the real essential build and failed on jsdom's missing `Worker` (3 cases). It now doubles `vue-pdf-embed/dist/index.essential.mjs` and the shared worker, as the PdfViewer specs do. My miss in `0b88e1e761`, found by the wider run, fixed in `9072eb89c4`.

## Wider checks at `9072eb89c4`

| Check | Command | Result |
|---|---|---|
| Whole web suite | `pnpm test:nuxt` | 810 files passed; 6264 tests passed, 2 skipped |
| Web typecheck | `pnpm typecheck` | production 0 errors; test files 86 in 36 (= baseline); PASS |
| Guards | `pnpm guard:web-boundary`, `pnpm guard:localization-boundary` | both Passed |
