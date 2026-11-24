# Investigation Notes

## Meta

- Package: `file-viewer-media-642`. Task autobyteus-642 (574 FU-001, 574 FU-002, 618 FU-002, 618 FU-003; absorbs autobyteus-639), Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-viewer-media-642`
- Branch: `codex/file-viewer-media-642` (no upstream)
- Base: `origin/personal` @ `5c0db3a801` (2026-11-24)
- Authorities read: the requirements gate files (this conversation), and the follow-up rows of 574 and 618.
- Status: complete (all four items read; no runtime uncertainty).

## Item 1: message references without Range (Read)

- `api/rest/collaboration-message-references.ts:32-34`: `getMessageReferenceContentReader().resolve(...)`, then `sendUserFile(reply, { mimeType, body: content.stream, size: null })` with `cache-control: no-store`.
- `run-history/services/message-reference-content-reader.ts:25,57-76`: `resolve` opens `fs.createReadStream(filePath)` after a `statSync(...).isFile()` check. It has one caller (the route).
- `sendUserFile` already serves `kind: 'file'` content by range with an `ETag` and keeps a route's `no-store` (`user-file-reply.ts:89-104`, autobyteus-574).
- So the reader can return the file (path, size, modified time) and the route can pass `kind: 'file'`.

## Item 2: audio downloads whole on the phone (Read)

- `components/fileExplorer/viewers/AudioPlayer.vue:28,40` (`useAuthorizedObjectUrl`) and `components/conversation/segments/MediaSegment.vue:26,71,89` (`useAuthorizedObjectUrlMap`): audio is downloaded whole, as video was before 574.
- 574's native path for video:
  - web `composables/mobile/useNativeVideoPlayback.ts` (`native` / `page` / `pending`), with the bridge `playVideo` and `hello.videoPlayer` (`utils/remoteAccess/shellBridge.ts`);
  - Android `mobile/video/` (`NativeVideoPlayback`, `NodeVideoDataSource`, `NodeVideoHttp`, `VideoCache`, `VideoCacheKeys`, `VideoPlayerActivity`);
  - iOS `AutoByteusMobile/Video/NativeVideoPlayer.swift`, plus core `AuthorizedMediaLoader`, `MediaRangeCache`, `NodeVideoHTTP`, `NodeVideoPlayRequest`, `NodeVideoURL`.
- Media3 and AVPlayer play audio-only files with the same data sources.
- **574 is unreleased:** `git tag --contains 7cbab1f7c2` is empty. So no installed app knows `playVideo` yet, and the names can be changed cleanly.
- The names say "video" in 43 files (code, tests, docs).

## Item 3: the desktop Files split (Read)

- `components/fileExplorer/FileExplorerLayout.vue`:
  - a `split` layout (tree 250 px default, drag-resizable 150–600 px) and a `stacked` layout (tree 42 % height above the viewer);
  - `RightSideTabs.vue:143` picks `split` on desktop and `stacked` otherwise.
- The right panel is 450 px by default and 400 px at minimum (`utils/layout/responsiveLayoutPolicy.ts:22-23`). So the viewer gets at most about 200 px beside a 250 px tree, and 618 measured 131 px at 1440×900 (`tickets/done/file-viewer-word-wrap-618/evidence/IMP-04-rendered/…`).
- **Cause:** the split is chosen by mode, not by the space the panel has.

## Item 4: highlighting (Read)

- `utils/highlighting/languageDetector.ts` `getLanguage(path)` has two readers with different language vocabularies:
  - `components/fileExplorer/FileViewer.vue:105` → Monaco (`MonacoEditor.vue`);
  - `components/conversation/segments/renderer/FileDisplay.vue:29` → Prism (`services/highlightService.ts`, `segmentHighlighter.ts`).
- The map returns Prism names. For Monaco, `markup` (HTML) and `vue` are not languages, so the file viewer shows `.html` and `.vue` unhighlighted today. This is one word with two meanings (Principle 15).
- Monaco 0.52.2 basic languages include `yaml`, `shell`, `go`, `rust`, `java`, `xml`, `ini`, `dockerfile`, `html`, `markdown`… and **no `toml`**.
- Prism components exist for `yaml`, `toml`, `bash`, `go`, `rust`, `java`, `ini` and `docker`. `highlightService.ts` loads markup, css, clike, javascript, markdown, markup-templating, typescript, jsx, python, ruby, php and json.
