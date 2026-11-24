# Design Spec

## Solution And Approval Basis

- Current solution revision ID: SR-002 (after ARCH-REV-001: freshness rule, no Last-Modified, desktop/browser readers, redirects, multi-range)
- Approved requirements: `requirements-doc.md` SR-001. The user approved DEC-001 (b) and DEC-002 (a) on 2026-11-24; the other decisions are the Solution Designer's.
- User approval of the design: not required (the contract is shown to the user with this design).
- Design status: `Ready`
- Investigation notes: `tickets/in-progress/phone-video-574/investigation-notes.md`
- Authorities read (2026-11-24):
  - `references/architecture-design.md`
  - `references/design-principles.md` (incl. Principle 17)
  - `templates/design-spec-template.md`
  - `DESIGN.md` (rules 9, 11, 12)
  - `autobyteus-server-ts/docs/design/node_access_model.md` (NA-5, NA-6, NA-8)
  - `docs/design-cases.md` (Cases 2, 3, 21, 26)
- Discrepancy, resolved here: NA-8 says credentials never reach "page code". The phone's credential has lived in the `/mobile` page's storage since the phone was introduced (`SavedNodeEntry.kt:6-7`). This design records the phone's actual rule in NA-8 and adds the per-playback handoff (D-5).

## Current-State Read

See the investigation notes ("Current behavior").
- The phone downloads a protected video whole into an object URL (`useAuthorizedObjectUrl.ts`).
- The node's file routes send whole files (`api/rest/user-file-reply.ts:21-27`, used by 10 call sites).
- The Android WebView cannot enter fullscreen (no `onShowCustomView`).
- The shell bridge on both apps is a JSON message object, bound to the node's origin and main frame (Android `web/ShellBridge.kt`; iOS `Shell/ShellBridgeHandler.swift`; web `utils/remoteAccess/shellBridge.ts`).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`. Server (Range and validators on the file routes), web (the player handoff), the Android app (a Media3 player screen, cache, WebView fullscreen) and the iOS app (an AVPlayer screen, resource loader, range cache).
- Architectural risk: `High`.
  - The phone credential reaches native code (a security-model change, NA-8, approved by the user).
  - A new bridge message.
  - A new HTTP behavior on every file route.
  - Disk caches of user files on the phone.
  - New native dependencies (Media3), which are a build input: the Android Gradle files (fresh-start build, DESIGN.md rule 12).
- Escalation trigger: a route that cannot serve ranges from a file; a platform that cannot force landscape; any need to persist the credential.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision |
| --- | --- | --- | --- |
| Measured | `probes/` P1–P3 (investigation notes) | WebView interception fails on seek; native players work | D-3, D-4 |
| Read | `api/rest/user-file-reply.ts:21-27`; callers `workspaces.ts:50,101`, `node-files.ts:16`, `context-files.ts:175,202,229,244`, `files.ts:40`, `run-file-changes.ts:42`, `collaboration-message-references.ts:34` | One reply owner; every caller but the message references has a file path and `stat` | D-1 |
| Read | `node-files/node-file-reader.ts` (`open` returns a stream and a size) | The reader opens the stream itself | D-1 changes it to return the file (path, size, modified time) |
| Read | `utils/remoteAccess/shellBridge.ts`, Android `ShellBridge.kt:25-140`, iOS `ShellBridgeHandler.swift:80-120` | Same contract on both; origin and main frame only; the `hello` reply exists; "an app older than this ignores the message" | D-2 |
| Read | `components/fileExplorer/viewers/VideoPlayer.vue:10-18`; `components/conversation/segments/MediaSegment.vue:34`; `composables/useAuthorizedObjectUrl.ts` | The two places the phone plays video | D-2 |
| Read | Android `ui/DesktopFullScreenController.kt:55-66` (432); `web/AutoByteusWebView.kt:61`; `MainActivity.kt:45` | The landscape and bars pattern to reuse; the chrome client to extend | D-3, D-6 |
| Read | iOS `Info.plist:78-83` (landscape allowed); `AutoByteusWebViewController.swift:40-44` | Landscape is available | D-4 |

## Intended Change

| Part | Owner | Change |
| --- | --- | --- |
| D-1 | Node | Range, 206, `ETag` and 304 on file replies |
| D-2 | Web | In the apps, hand protected videos to the native player |
| D-3 | Android | A Media3 player screen with the key in a header, a cache and landscape fullscreen |
| D-4 | iOS | AVPlayer with a key-adding resource loader, a range cache and landscape |
| D-5 | Both apps | The credential handoff: in memory, one playback, never logged or stored |
| D-6 | Android | WebView fullscreen for in-page media |
| D-7 | Both apps | Caches cleared when a node is removed |

## Change Scope (Mandatory)

- **In scope:** UC-001…UC-003. Files are listed in the Final File Responsibility Mapping.
- **Derived consumers:**
  - `UserFileContent` (D-1): every caller listed above. Message references stay `stream` (no file path), so no Range there; noted as FU-001 if a phone video is ever served that way.
  - **HTTP caches of the replies (SR-002):** the desktop puts these URLs straight into `img`, `video` and PDF elements (`fileExplorerContentActions.ts:261-264`); browsers do the same. With `Cache-Control: no-cache` and the `ETag`, the walk is:
    - an agent rewrites a file, and the reopen gets 200 with the new bytes (new `ETag`);
    - unchanged, the reopen gets 304 and reuses the copy.
    - Today's behavior (no validator, no caching rule) shows new bytes too; it never sends a 304.
  - `ShellHello` (D-2): the web's `hello` readers and both apps' reply builders.
  - The `playVideo` message (D-2, D-5): both apps' message readers.
  - NA-8 text: the node access model doc.
- **Deliberately left alone:**
  - the browser phone path and desktop (AC-006);
  - audio (out of scope);
  - images and PDFs;
  - pairing and where the credential is stored.
- **Follow-ups:** FU-001 (message references without Range); FU-002 (audio through the native player).

## Data Contract (Principle 17)

| Record / Message | Boundary | Field | Meaning | Written by | Read by |
| --- | --- | --- | --- | --- | --- |
| HTTP file reply (all `kind: 'file'` routes) | node → any client | `Accept-Ranges: bytes` | Ranges are served | `sendUserFile` | players |
| | | `ETag: "<size>-<mtimeMs>"` (strong) | The file's version; it changes when the file changes | `sendUserFile` from `stat` | native caches (D-3, D-4) |
| | | `Cache-Control: no-cache` (SR-002; a route that sets `no-store` keeps `no-store`) | Revalidate on every use: a client may keep a copy, but asks each time; 304 when unchanged, new bytes when changed. Without it, Chromium treats a reply carrying a validator as fresh for a heuristic time and can show an old copy after an agent rewrites the file (ARCH-REV-001 AR-001) | `sendUserFile` | desktop and browser HTTP caches (the Electron window and any browser), the WebView cache |
| | | 206 + `Content-Range: bytes a-b/size` + `Content-Length` | The bytes of `Range: bytes=a-b`, `a-` or `-n` (one range). A multi-range request (`a-b,c-d`) gets 200 with the whole file (N-2) | `sendUserFile` | players |
| | | 416 + `Content-Range: bytes */size` | An unsatisfiable range | `sendUserFile` | — |
| | | 304 for a matching `If-None-Match` | Unchanged | `sendUserFile` | — |
| | | `If-Range` | A range only if the version still matches, else the whole file (200) | `sendUserFile` | native caches |
| `UserFileContent` (node, in process) | route → reply | `{ kind: 'file', mimeType, path, size, modifiedMs }` or `{ kind: 'stream', mimeType, body, size }` | A file can be ranged; a stream is sent whole, as today | the routes | `sendUserFile` |
| Bridge `hello` reply | app → page | `videoPlayer: boolean` | The app has the native player (D-5) | both apps | `shellBridge.ts` `parseHello` |
| Bridge `playVideo` | page → app | `url` (absolute, same origin as the node), `title` (file name, for the player's title), `credential` (the phone's bearer credential) | Play this protected node file natively; the app uses the credential only as `Authorization: Bearer` to the node's origin, for this playback | the page's native-playback owner (D-2) | both apps' bridge readers. The message's `toString` and logs never contain `credential` |
| App cache entry (Android SimpleCache; iOS range cache) | on the phone, app-private cache dir | key `"<nodeId>|<url path+query>|<ETag>"`; data: video bytes; iOS also a range map (JSON of byte ranges) | Bytes already fetched of that version | the players | the players |

- **Identity:** a cache entry is identified by node, file URL and version. A changed file has a new `ETag`, so it gets a new key: the old entry is never served and ages out (LRU, 500 MB per app).
- **Lifecycle:**
  - The `playVideo` credential lives in memory from the message until the player closes. It is never in an Intent's extras or a saved state (Android hands a random in-process token to the activity), never in a URL, never logged.
  - Cache entries are created on fetch, evicted by LRU, and deleted when their node is removed (D-7).
  - **Keys as file names (N-4):** a key that becomes a file or directory name is hashed (SHA-256 hex); the readable key is never a path.
  - **Redirects (N-1):** node file routes never redirect. Both players refuse any redirect off the node's origin (Android: a custom redirect check in the data source, or `allowCrossProtocolRedirects=false` plus an origin check; iOS: `URLSessionTaskDelegate willPerformHTTPRedirection` → `nil` when the origin differs), so the credential is never sent elsewhere. One unit case each.
- **Examples:**
  - `{"type":"playVideo","url":"http://192.168.1.20:29695/rest/workspaces/agent_ws_ab12/content?path=demo%2Fplan.mp4","title":"plan.mp4","credential":"<redacted>"}`
  - Hello: `{"type":"shell","nodeCount":2,"deviceName":"Pixel 8","nodeName":"MacBook","videoPlayer":true}`
  - Range: `GET …/content?path=… Range: bytes=4655936-` → `206 Content-Range: bytes 4655936-6632653/6632654, ETag: "6632654-1795515300123", Accept-Ranges: bytes`

### Data Contract Validation

| Scenario | Step | Served? |
| --- | --- | --- |
| UC-001, from Files | Viewer opens → `videoPlayer` true and a same-origin protected URL → `playVideo` → the native player sends a probe (`Range: bytes=0-1`), gets the `ETag` → cache key → plays progressively | Yes (P2, P3) |
| UC-001, from chat | A media message's video (node URL) → a play button → `playVideo` | Yes |
| UC-001, external URL | A video on another site: not a node URL → the in-page player, as today | Yes (unchanged) |
| UC-002 reopen | The probe gives the same `ETag` → cache hit for the played ranges → 0 bytes for them | Yes (P2: 0 bytes) |
| UC-002, file changed | The probe gives a new `ETag` → a new key → fresh bytes | Yes |
| UC-003 | Native fullscreen → landscape, bars hidden; exit → portrait; same `currentPosition` | Yes (P2, P3 players) |
| Refusal: other origin or a non-`/rest/` URL in `playVideo` | The app ignores it; nothing is sent | Yes (D-5 rule) |
| Refusal: credential revoked | The node answers 401/403 → the player shows "This video could not be played." with Back | Yes |
| An older app | `hello` without `videoPlayer` → today's path | Yes |

- **Checks run:** P1–P3 against the test server (Range, 206, header, cache). Read-only; no user data.

## Persisted Data / State Transition Decision

- New: app-private disk caches of video bytes (no credential). A rebuildable cache, so no migration.
- The credential is never persisted by this change.

## Spines

- **DS-1 (play):** `tap video (Files or chat) → native-playback owner (web) [bridge has videoPlayer? URL protected & same origin?] → bridge playVideo{url,title,credential} → app bridge reader [validate origin] → player screen (Android activity / iOS AVPlayerViewController) → data source with Authorization (Android DefaultHttpDataSource; iOS resource loader) → cache → node file route (D-1, 206) → frames`
- **DS-2 (close):** `Back → player releases → the credential is dropped from memory → the web viewer shows "Play" (tap → DS-1 again)`
- **DS-3 (node removed):** `remove node (app) → the app deletes that node's cache entries`
- **DS-4 (Android in-page fullscreen, D-6):** `page video fullscreen → onShowCustomView → landscape + bars hidden (432 helper) → onHideCustomView → portrait`

## Ownership Map

- **Node:** `sendUserFile` owns HTTP ranges and validators; the routes own resolving a file (path, size, mtime).
- **Web:** one native-playback owner (`composables/mobile/useNativeVideoPlayback.ts`) decides whether a URL goes native and sends `playVideo`. `VideoPlayer.vue` and `MediaSegment.vue` call it; they never touch the bridge or the credential.
- **Android:**
  - `video/NativeVideoPlayback.kt` holds the pending credential handoff (token → credential, in memory, one use);
  - `video/VideoPlayerActivity.kt` (Media3 player, fullscreen);
  - `video/VideoCache.kt` (one `SimpleCache`, keys, per-node delete);
  - `ShellBridge` gains the `PlayVideo` action;
  - `MainActivity` starts the activity;
  - `AutoByteusWebView` gets the fullscreen chrome client (D-6), combined with the file chooser.
- **iOS:**
  - `Video/NativeVideoPlayer.swift` (presents AVPlayerViewController; landscape for wide videos);
  - `Video/AuthorizedMediaLoader.swift` (resource loader: custom scheme to the node, header, Range, streaming);
  - `Video/MediaRangeCache.swift` (sparse file plus range map per key, LRU, per-node delete);
  - `ShellBridgeHandler` parses `playVideo`.

## Removal / Decommission Plan

- None removed. The blob path stays for the browser and older apps (AC-006).
- Dead code in touched files is checked by implementation.

## Dependency Rules

- Web components → the playback owner → `shellBridge.ts` and the credential store. Components never read the credential.
- Apps: the bridge → the playback owner → the player → the cache. The cache never sees the credential.
- No process-wide lookup is added except the Android in-memory handoff holder. It is set before `startActivity`, and a missing entry finishes the activity with "could not play" (a loud failure).

## Interface Boundary Mapping

| Interface | Subject | Notes |
| --- | --- | --- |
| `sendUserFile(reply, content, request)` | one user file reply | Gains the request (for `Range`, `If-None-Match`, `If-Range`) |
| `NodeFileReader.open(path)` | one node file | Returns `{ path, size, modifiedMs, mimeType }`, not a stream |
| `ShellBridge.playVideo({url,title,credential})` (web) | one playback | Only when `hello().videoPlayer` |
| `useNativeVideoPlayback()` → `canPlay(url)`, `play(url,title)` | the page's playback handoff | It reads the credential from the existing remote-access credential store |

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `autobyteus-server-ts/src/api/rest/user-file-reply.ts` | D-1: two `UserFileContent` kinds; Range (one range), 206/416, `ETag`, `Last-Modified`, 304, `If-Range` for `kind: 'file'` |
| `api/rest/workspaces.ts`, `node-files.ts`, `context-files.ts`, `files.ts`, `run-file-changes.ts`; `node-files/node-file-reader.ts` | Pass `kind: 'file'` |
| Server tests | AC-005 per route |
| `autobyteus-web/utils/remoteAccess/shellBridge.ts` | `videoPlayer` in `ShellHello`; `playVideo` |
| `autobyteus-web/composables/mobile/useNativeVideoPlayback.ts` (new) | D-2 owner: same-origin protected URL check; credential from the store; `play` |
| `autobyteus-web/components/fileExplorer/viewers/VideoPlayer.vue` | In the apps, open the native player at once; show a "Play" button afterwards. Otherwise as today |
| `autobyteus-web/components/conversation/segments/MediaSegment.vue` | In the apps, a node video shows a play tile that opens the native player |
| Web specs and localization (en, zh-CN) | — |
| Android `app/build.gradle.kts` | Media3 (exoplayer, datasource, database, ui) |
| Android `web/ShellBridge.kt` (+ messages) | `PlayVideo(url,title,credential)` read, with `toString` redacted; same origin enforced; the `hello` reply carries `videoPlayer: true` |
| Android `video/NativeVideoPlayback.kt`, `video/VideoPlayerActivity.kt`, `video/VideoCache.kt` (new) | D-3, D-5, D-7 |
| Android `MainActivity.kt`, `AndroidManifest.xml` | Start the player; declare the activity (`configChanges` for orientation) |
| Android `web/AutoByteusWebView.kt`, `web/WebFileChooserCoordinator.kt` | D-6: the chrome client also implements `onShowCustomView`/`onHideCustomView` (432 helper) |
| Android node removal (`SavedNodeStore` remove path) | D-7: delete that node's cache entries |
| iOS `Shell/ShellBridgeHandler.swift` | Parse `playVideo` (redacted description); `hello` gets `videoPlayer: true` |
| iOS `Video/NativeVideoPlayer.swift`, `Video/AuthorizedMediaLoader.swift`, `Video/MediaRangeCache.swift` (new); `project.yml` | D-4, D-5, D-7 |
| iOS node removal (`RemoveNodeSheet` path) | D-7 |
| `autobyteus-server-ts/docs/design/node_access_model.md` | NA-8 phone wording and the per-playback handoff |
| App tests | JVM tests for the bridge message, the handoff and the cache keys; an instrumented or emulator test of the player; iOS XCTests for the loader and range cache; UI tests for fullscreen |

## Concrete Examples

- Android handoff, so the credential stays out of any Bundle:

  ```kotlin
  val token = NativeVideoPlayback.put(credential, url, title)   // in-memory map, one use
  startActivity(Intent(this, VideoPlayerActivity::class.java).putExtra("playback", token))
  // VideoPlayerActivity.onCreate: NativeVideoPlayback.take(token) ?: finishWithCouldNotPlay()
  ```

- iOS URL mapping: `http(s)://node/…` becomes `abmedia-http(s)://node/…` for the asset. The loader maps it back and sends only to the node's origin.

## Backward-Compatibility Rejection Log

| Candidate | Decision |
| --- | --- |
| A URL token for media | Rejected (NA-8, Task constraint) |
| A service worker | Rejected (iOS, `http` nodes) |
| The capability in `hello` for older store apps | Kept (DEC-005): store distribution, not a node-version compatibility path |

## Change Sequence

1. D-1 and its tests.
2. Web D-2 (behind `videoPlayer`).
3. Android D-3, D-5, D-6, D-7.
4. iOS D-4, D-5, D-7.
5. The NA-8 doc.
6. App tests, emulator and simulator runs (AC-001…004), the phone probe (AC-006).

## Key Tradeoffs

- A native player screen instead of the in-page player: the only reliable seek on Android, plus native fullscreen and cache. The look is the platform's player (approved, DEC-001).
- The iOS range cache is our own code: AVFoundation has no progressive-MP4 cache.

## Risks

- **iOS forced landscape.** `requestGeometryUpdate` (iOS 16+) for a wide video. Escalate if it is refused on the simulator.
- **Media3 adds APK size** (about 1–2 MB).
- **Cache disk use** is bounded to 500 MB; implementation checks the platforms' low-storage behavior.
- **iOS range cache (N-3):** not prototyped. It is our own code (a sparse file plus a range map). Its tests are named in the file map: partial ranges, overlapping ranges, an evicted key, a changed `ETag`, a node delete, and a reopen that sends 0 bytes for cached ranges. It is AC-002 on iOS.

## Guidance For Implementation

- Start from the prototypes in `probes/` (the server, `android-media3-PlayerActivity.kt`, `ios-avplayer-loader-App.swift`).
- Never log a URL with its query (paths can be private) or any header value.
- Run the apps' tests per TESTING.md (Android Gradle; iOS `xcodebuild` on a simulator of your own, not one in use).
