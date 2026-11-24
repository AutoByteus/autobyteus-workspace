# Design Spec

## Solution And Approval Basis

- Current solution revision ID: SR-001
- Approved requirements: `requirements-doc.md` SR-001 (Solution Designer within the direction, user informed)
- User approval of the design: not required
- Design status: `Ready`
- Authorities read (this conversation):
  - `references/architecture-design.md`
  - `references/design-principles.md` (incl. Principle 17)
  - `DESIGN.md`
  - the node access model (NA-8)
  - `docs/design-cases.md` (Cases 2, 3, 26)
- Conflicts: none.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`. Four items over the server, the web (two engines, a layout, the media handoff) and both apps (the rename plus audio).
- Architectural risk: `High`. The web↔app bridge contract changes (`playVideo` → `playMedia`, `videoPlayer` → `mediaPlayer`) across three codebases. The change is clean because 574 is unreleased; there is no security change (the same handoff, NA-8 unchanged).
- Escalation trigger: a shipped app or tag that contains `playVideo`; an audio format a native player cannot play that the page plays today.

## Change Scope (Mandatory)

- In scope: UC-001…UC-004.
  - **Server:** the message-reference reader and route.
  - **Web:** the language table; `FileViewer.vue` and `FileDisplay.vue` readers; the Prism loads in `highlightService.ts`; `FileExplorerLayout.vue`; the media handoff composable; `AudioPlayer.vue`; `MediaSegment.vue`.
  - **Android:** `mobile/video/` → `mobile/media/`; the bridge.
  - **iOS:** `Video/` → `Media/`; the core types; the bridge.
- Derived consumers:
  - **The bridge rename (Case 26):** every `playVideo` and `videoPlayer` reader and writer, on the web, Android (`ShellBridge.kt`, its JVM test) and iOS (`ShellBridgeHandler.swift`, `WebShellViewController.swift`, `DemoWebViewController.swift`, `NodeVideoPlayRequest` and its test). Docs: `autobyteus-web/docs/remote_access.md`, `file_explorer.md`, `docs/android_mobile_access.md`, `docs/ios_mobile_access.md`, NA-8's text.
  - **The language table:** its two readers, Monaco and Prism.
  - **The layout rule:** `RightSideTabs.vue:143` (mode); the stacked layout's other users.
- Deliberately left alone: the cache formats and keys (unchanged; the key already names the file, not the kind); the HTTP contract (already 574's); phone layouts.
- Follow-ups: none found.

## Data Contract (Principle 17)

| Record / Message | Boundary | Field | Meaning | Writer | Readers |
| --- | --- | --- | --- | --- | --- |
| Bridge `playMedia` (renames `playVideo`) | page → app | `kind: 'video' \| 'audio'`, `url`, `title`, `credential` | Play this protected node file natively. `kind` lets the player choose its screen: video can rotate to landscape; audio stays portrait with the title. The rules are 574's: same origin, header only, refuse redirects, never logged | `useNativeMediaPlayback` | Android `ShellBridgeMessages`, iOS `NodeMediaPlayRequest` |
| Bridge `hello` reply | app → page | `mediaPlayer: boolean` (renames `videoPlayer`) | The app has the native media player | both apps | the web composable |
| `MessageReferenceContent` (server) | reader → route | `{ mimeType, path, size, modifiedMs }` (was `{ mimeType, stream }`) | The file to serve; the route builds `UserFileContent` `kind: 'file'` | the reader | the route |
| Language table entry (web) | in-app | `{ extensions/names, monaco, prism }` | One file type; each engine's name | `utils/highlighting/languageDetector.ts` | `getMonacoLanguage(path)` (FileViewer), `getPrismLanguage(path)` (FileDisplay) |

- **Examples:**
  - `{"type":"playMedia","kind":"audio","url":"http://192.168.1.20:29695/rest/workspaces/agent_ws_ab12/content?path=notes%2Fmemo.m4a","title":"memo.m4a","credential":"<redacted>"}`
  - Table rows: `{ ext: ['yaml','yml'], monaco: 'yaml', prism: 'yaml' }`; `{ ext: ['toml'], monaco: 'ini', prism: 'toml' }`; `{ ext: ['html'], monaco: 'html', prism: 'markup' }`; `{ ext: ['vue'], monaco: 'html', prism: 'vue' }` (Prism's `vue` goes to `highlightVue`, as today); `{ names: ['Dockerfile'], monaco: 'dockerfile', prism: 'docker' }`.

### Validation

| Use case | Step | Served? |
| --- | --- | --- |
| UC-001 | Reference → reader `{path,size,modifiedMs}` → `sendUserFile kind:'file'` → 206/304, keeping `no-store` | Yes |
| UC-002 | Audio tile or viewer → `playMedia{kind:'audio'}` → native player (same data source, cache and redirect refusal) → portrait screen with title and controls | Yes (Media3 and AVPlayer play audio from the same sources) |
| UC-002, older app | `hello` without `mediaPlayer` → the page path | Yes |
| UC-003 | Width ≥ tree (250) + 1 + 400 → split, divider clamped; less → stacked | Yes |
| UC-004 | Path → table → Monaco name / Prism name → highlighted | Yes |

## Design

- **D-1 (server).** `MessageReferenceContentReader.resolve` returns the file (path, size, `mtimeMs` from the same `statSync`). The route passes `{ kind: 'file', … }` and keeps `cache-control: no-store`.
- **D-2 (media handoff rename and audio).**
  - Web:
    - `useNativeVideoPlayback` → `useNativeMediaPlayback(kind)`; the modes are unchanged;
    - `shellBridge.ts`: `playMedia(request)` and `ShellHello.mediaPlayer`;
    - `VideoPlayer.vue` and `AudioPlayer.vue` both use it (audio: open the native player at once, then a "Play" button, as video);
    - `MediaSegment.vue`'s audio and video tiles both use it.
  - Android: package `media/` (`NativeMediaPlayback`, `NodeMediaDataSource`, `NodeMediaHttp`, `MediaCache`, `MediaCacheKeys`, `MediaPlayerActivity`).
    - The activity reads `kind`. Video: as today (fullscreen landscape). Audio: portrait, `PlayerView` with the title and audio controls, no fullscreen button.
    - The manifest entry follows the rename.
  - iOS: `Media/NativeMediaPlayer.swift`, plus core `NodeMediaHTTP`, `NodeMediaPlayRequest` (with `kind`) and `NodeMediaURL`. `AuthorizedMediaLoader` and `MediaRangeCache` already have neutral names. Audio: no forced landscape; AVPlayerViewController shows its audio UI with the title.
  - The cache directories and keys keep their current form. 574 is unreleased, so there are no installed caches to migrate; the directory name may follow the rename.
- **D-3 (layout).** `FileExplorerLayout.vue` measures its own width (a `ResizeObserver`).
  - `split` (desktop mode) is used only when `width ≥ treeWidth + 1 + 400`; otherwise the stacked layout.
  - In split, the divider's maximum is `width − 1 − 400` (and at least the tree minimum, 150).
  - `RightSideTabs.vue` keeps passing the mode. The rule lives in the layout, its one owner, and the 400 px is a named constant.
- **D-4 (highlighting).**
  - `languageDetector.ts` becomes one table and two lookups: `getMonacoLanguage`, `getPrismLanguage`.
  - Extension, plus file name for `Dockerfile`: py, ts, js, jsx, vue, html, php, rb, css, json, md (today's), plus yaml, yml, toml, sh, bash, zsh, go, rs, java, xml, ini, Dockerfile.
  - `FileViewer.vue` uses `getMonacoLanguage`; `FileDisplay.vue` uses `getPrismLanguage`. The old single `getLanguage` is removed (Principle 8).
  - `highlightService.ts` loads the Prism components for yaml, toml, bash, go, rust, java and docker (`markup` already covers xml).

## Removal Plan

- The `Video`-named files, types and messages are renamed, not kept.
- `getLanguage` is removed.
- No compatibility path for `playVideo`.

## Final File Responsibility Mapping

| Area | Files |
| --- | --- |
| Server | `run-history/services/message-reference-content-reader.ts`, `api/rest/collaboration-message-references.ts`, and their tests |
| Web, media | `utils/remoteAccess/shellBridge.ts`; `composables/mobile/useNativeMediaPlayback.ts` (renamed); `components/fileExplorer/viewers/VideoPlayer.vue`, `AudioPlayer.vue`; `components/conversation/segments/MediaSegment.vue`; specs; localization (en, zh-CN) for the audio "Play" |
| Web, layout | `components/fileExplorer/FileExplorerLayout.vue` and its spec |
| Web, highlighting | `utils/highlighting/languageDetector.ts`, `components/fileExplorer/FileViewer.vue`, `components/conversation/segments/renderer/FileDisplay.vue`, `services/highlightService.ts`, and specs |
| Android | `app/src/main/java/org/autobyteus/mobile/media/*` (renamed from `video/`), `web/ShellBridge.kt`, `MainActivity.kt`, `AndroidManifest.xml`, and tests |
| iOS | `AutoByteusMobile/Media/NativeMediaPlayer.swift`, `AutoByteusMobileCore/Media/*` (renamed), `Shell/ShellBridgeHandler.swift`, `WebShellViewController.swift`, `Demo/DemoWebViewController.swift`, tests, and `project.yml` if paths are listed |
| Docs | `node_access_model.md` NA-8 ("playMedia"); the four mobile and web docs |

## Risks

- The rename's breadth (43 files): every reader is listed above. Implementation runs both apps' test suites and the web suite.
- Audio formats: MP3, M4A/AAC and WAV play in both native players. An Ogg or Opus file: Media3 plays it, AVPlayer does not. On iOS, an `.ogg` or `.opus` keeps the page path (the composable's audio kind accepts only types AVPlayer plays; implementation lists them).

## Guidance For Implementation

- Start from 574's code; the rename is mechanical, then audio is the `kind` branch.
- Never log the credential or a URL with its query.
- Test emulators and simulators of your own.
