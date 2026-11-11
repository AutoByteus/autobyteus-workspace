# Investigation Notes — phone-viewer-pinch-zoom-472 (autobyteus-472)

## Meta

- Package `phone-viewer-pinch-zoom-472`; Project Task `autobyteus-472` (with the user's comments of 2026-11-11: scope PDF and images only; add Download/Save)
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-viewer-pinch-zoom-472`, `codex/phone-viewer-pinch-zoom-472`; base `origin/personal` @ `ed481ae4ca` (fast-forwarded on 2026-11-11 after autobyteus-471; first written on `827f1e68dc`); finalization target `origin/personal`. Order: after autobyteus-471 (same phone viewer files); the branch is brought onto the base with 471 before implementation.
- Authorities read: requirements-engineering, ticket-scope, finding-the-cause, handoff, architecture-design, design-principles, `DESIGN.md` (this conversation)

## Source Log

| Source | Finding | Established |
| --- | --- | --- |
| `autobyteus-web/components/mobile/views/MobileFileViewer.vue` | The phone viewer shows `FileViewer` full screen under `MobileScreenBar` (← and title; an `actions` slot exists, `MobileScreenBar.vue:17`) | Read |
| `autobyteus-web/components/fileExplorer/viewers/PdfViewer.vue` | `vue-pdf-embed` (^2.1.3) renders every page at the container width; no zoom; the container scrolls | Read |
| `node_modules/vue-pdf-embed/dist/types/VuePdfEmbed.vue.d.ts:44-56` | Props `width` (desired page width) and `scale` (render scale) | Read |
| `autobyteus-web/components/fileExplorer/viewers/ImageViewer.vue:1-90` | Mouse wheel zoom (0.25–5×) and mouse drag; no touch handling | Read |
| `autobyteus-web/composables/mobile/useNodeDesktopZoom.ts` (227 lines) | Existing touch zoom for the phone VNC viewer: pinch 1–4× around the pinch centre, one-finger pan, double tap Fit↔Fill, single tap, Ctrl+wheel; for one fitted picture; transform-based; used by `MobileNodeDesktop.vue` only | Read |
| `autobyteus-android/.../web/AutoByteusWebView.kt:63` | `setDownloadListener` opens a download URL outside the app (`openExternal`); no zoom settings (WebView zoom stays off) | Read |
| `autobyteus-android/.../web/ShellBridge.kt` | The page→app bridge (`window.AutoByteusShell`, androidx.webkit web messages, main frame of the node's origin only); actions hello, pageReady, paired, showNodeList, startScan, desktopFullScreen | Read |
| `autobyteus-android/build.gradle.kts:45-46` | minSdk 26, targetSdk 35; no storage permission in the manifest | Read |
| `autobyteus-web/utils/remoteAccess/shellBridge.ts` | The page's bridge client; "in a browser there is no bridge" | Read |

## Findings

- Zoom needs no app change: the page zooms its own viewer content; the app page stays unzoomable (WebView zoom off).
- Download needs the app: in the Android WebView a link to the node would load without the phone's credential (401), a `blob:` URL cannot be handed to Android's download handling, and Web Share is not available in WebView. The page already holds the file (fetched with the phone credential); the app can save bytes the page hands over through the bridge. So: a new bridge action and a new APK.
- iOS (named only): the same page zoom works in WKWebView if the iOS shell keeps page zoom off; Download needs a `WKScriptMessageHandler` action and a share sheet (`UIActivityViewController`, which includes "Save to Files").

## After autobyteus-471 (2026-11-11)

- `git diff --stat 827f1e68dc ed481ae4ca` over the viewer files: `PdfViewer.vue`, `ImageViewer.vue`, `FileViewer.vue`, `shellBridge.ts` and the Android app are unchanged; `MobileFileViewer.vue` lost the size limit (4 lines); the node-file fetch moved to the shared `utils/fileExplorer/nodeFileContent.ts` (`loadNodeFile`), used by `useMobileNodeFile.ts`. The design's premises hold.
- The phone viewer's open-file state carries `url` for media in both cases: a workspace file's content URL (fetched with the phone credential by `useAuthorizedObjectUrl`) or a node file's object URL (`useMobileNodeFile`). Download reads the bytes from that same URL with `authorizedFetch` (an object URL needs no credential), so it adds no second loading path.
