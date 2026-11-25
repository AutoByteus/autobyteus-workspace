# Investigation Notes

## Meta

- Package: `viewer-polish-647`. Task autobyteus-647 (founder's line-number request; absorbs autobyteus-644 and autobyteus-475), Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/viewer-polish-647`
- Branch: `codex/viewer-polish-647` (no upstream)
- Base: `origin/personal` @ `bc4351cad7` (2026-11-25)
- Authorities read: the requirements and design gates (this conversation), the 642 receipt, and 471's follow-ups.

## Findings (all Read; the leaks were Measured earlier by autobyteus-471 and the code is unchanged)

| Item | Current code | Status |
| --- | --- | --- |
| 1 Line numbers | `components/fileExplorer/MonacoEditor.vue:129-139` creates the editor with Monaco's defaults: line numbers on, folding on, `lineDecorationsWidth` 10. Its only user is `FileViewer.vue:37` (desktop Files and the phone viewer). The founder's screenshot shows the gutter at about 18–20 % of the phone's width | Present |
| 2a 416 on an empty reference | `components/workspace/collaboration/CollaborationMessageReferenceViewer.vue:191-201`: the media probe `Range: bytes=0-0`. A zero-byte file answers 416 (`bytes */0`), which throws "Failed to fetch reference content (416)" | Present |
| 2b iOS bar overlap | `AutoByteusMobile/Media/NativeMediaPlayer.swift`. The app's own bar (Back plus title, `:169-178`) is laid over an *embedded* `AVPlayerViewController` (`:52-57`, `addChild`), whose top controls (picture-in-picture, AirPlay) draw under it while they show. AVKit gives no public signal of its controls' visibility. The comment at `:218` names "AVKit's own close", which an embedded AVKit does not show | Present |
| 2c Queue label | `AutoByteusMobileCore/Media/AuthorizedMediaLoader.swift:35` `"org.autobyteus.video-loader"` | Present |
| 3a PDF worker | `PdfViewer.vue:45` imports `vue-pdf-embed`'s full build (2.6 MB). That build sets pdf.js's `workerSrc` to a 1.9 MB `data:` URL (`dist/index.mjs:17314,23608`), which is not same-origin. So each document's worker gets `_createCDNWrapper`, a new `text/javascript` blob URL holding `await import("<1.9 MB data URL>")`, never revoked (`index.mjs:10950-10956`). This matches 471's measurement (two PDFs → two 1,890,161-byte URLs). The essential build (`dist/index.essential.mjs`) takes pdf.js from `pdfjs-dist` (4.10.38, vue-pdf-embed's own dependency, not the web's) | Present |
| 3b Stale status | `AgentEventMonitor.vue:94,114,127`: `filePreviewStatus` is set by file actions and never cleared on a run change. The monitor is reused across runs (no `:key` at its four mount sites: `AgentWorkspaceSurface.vue:33`, `TeamWorkspaceSurface.vue:32`, `AgentTeamEventMonitor.vue:3`, `MobileRunTargetView.vue:26`) | Present |

- The packaged desktop window loads its pages from `file://` (`electron/application/electronApplication.ts:118-126`). A worker file URL is unsafe there; blob URLs work (today's mechanism).
