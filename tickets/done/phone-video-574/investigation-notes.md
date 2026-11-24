# Investigation Notes

## Investigation Meta

- Package: `phone-video-574`. Task autobyteus-574 (absorbs autobyteus-636), Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-video-574`
- Branch: `codex/phone-video-574` (no upstream)
- Base: `origin/personal` @ `4b73fccae2` (2026-11-24)
- Authorities read (requirements gate): `SKILL.md` (2026-11-23 update), `references/requirements-engineering.md`, `ticket-scope.md`, `finding-the-cause.md`. Also autobyteus-572's investigation notes (the phone's media path, NA-8).
- Status: feasibility established by prototypes. Two decisions need the user (requirements-doc DEC-001, DEC-002).

## Current behavior (Read)

- **Part 1, download.** On a paired phone, a protected node file is downloaded whole into an object URL before the `<video>` gets it (`autobyteus-web/composables/useAuthorizedObjectUrl.ts:41-75`, `fetchAuthorizedResourceBlob`).
  - The element cannot send the phone's credential, which is `Authorization: Bearer` (`utils/remoteAccess/authorizedTransport.ts:5,50`).
  - NA-8 keeps credentials out of URLs.
  - The node's file routes serve the whole file, with no `Accept-Ranges` and no 206 (572 notes: `api/rest/workspaces.ts`, `node-files.ts`, `user-file-reply.ts`).
  - The object URL is revoked on close, so a reopen downloads again from 0 (the founder's screenshot: "0.6 of 22.7 MB").
- **Where the credential lives.** In the `/mobile` web app's storage inside the WebView, not in native code: `autobyteus-android/.../connection/SavedNodeEntry.kt:6-7` ("the paired credential in WebView-local web storage"). The shell bridge carries no credential (`web/ShellBridge.kt:23`).
- **Part 2, Android fullscreen.**
  - The WebView's chrome client implements only file choosing (`web/WebFileChooserCoordinator.kt:20`, `web/AutoByteusWebView.kt:61`), with no `onShowCustomView`/`onHideCustomView`.
  - Chromium therefore draws the player's fullscreen button disabled. The founder's screenshot (2026-11-24 11:14) shows it greyed and not clickable.
  - The app already has a landscape fullscreen controller for the desktop view (`ui/DesktopFullScreenController.kt:55-66`, autobyteus-432).
- **iOS.** `allowsInlineMediaPlayback = true` (`AutoByteusWebViewController.swift:44`), and the app supports landscape (`Info.plist:78-83`). Web fullscreen on iOS was not reported or tested.

## Platform facts (Web, sources)

- **Service workers in iOS WKWebView** need App-Bound Domains, a short static list in the app, and Apple support says WKWebView does not support them for general use ([forum 773539](https://developer.apple.com/forums/thread/773539), [forum 770366](https://developer.apple.com/forums/thread/770366), [WebKit 227531](https://bugs.webkit.org/show_bug.cgi?id=227531)). Nodes are user-chosen addresses, so this cannot work on iOS.
- **Service workers need a secure context** (`https` or `localhost`). Both apps allow `http` node URLs (`NodeUrlNormalizer.kt:30-33`; Android `usesCleartextTraffic`, iOS `NSAllowsArbitraryLoads`), so a LAN `http` node would get none on Android either.
- **Native interception** of media `Range` requests has no reliable published answer for Android WebView, or for WKURLSchemeHandler with media ([WebKit 203302](https://bugs.webkit.org/show_bug.cgi?id=203302), [236401](https://bugs.webkit.org/show_bug.cgi?id=236401)). Hence the prototypes.

## Prototypes (Measured; Android emulator API 35 with WebView 124, iPhone 16e simulator with iOS 26.1)

- **Test server:** `probes/server.py`, a stand-in node file route. It requires `Authorization: Bearer test-key`, honours Range/206 with an ETag, logs every request, and has optional throttling of about 1.3 MB/s.
- **Video:** 60 s, 720p, 6.6 MB H.264/AAC (`ffmpeg testsrc`).

| # | Prototype | Result | Evidence |
| --- | --- | --- | --- |
| P1 | Android WebView `<video>` with `shouldInterceptRequest` adding the header and forwarding Range (`probes/android-webview-intercept-MainActivity.kt`) | Plays from 206 (`playing` about 2 s). **Seeking to 45 s loops:** the same `bytes=4587520-` is re-requested every ~1.4 s and never plays | logcat and server log, this file |
| P1-control | The same page and seek, unauthenticated, without interception (`probes/page-control.html`) | Seeks and plays at 45 s; one request per range | — |
| P1b | P1 with responses capped at 1 MB | `MEDIA_ERR_DECODE` | — |
| P1c | P1 without `Content-Length` | `MEDIA_ERR_DECODE` | — |
| P2 | Android **native player** (Media3/ExoPlayer 1.4.1) with `Authorization` as a request property and `SimpleCache` (`probes/android-media3-PlayerActivity.kt`) | Plays at once, seeks to 45 s and plays (48.0 s at 8 s). Throttled: the first request is streamed and the seek issues `bytes=4655936-6632653` with the header. **Reopen: 0 bytes downloaded** (served from the cache) | — |
| P3 | iOS **native player** (AVPlayer and AVPlayerViewController) with an `AVAssetResourceLoaderDelegate` (custom scheme) that streams via URLSession with the header and Range (`probes/ios-avplayer-loader-App.swift`) | Throttled: **playing 0.9 s after open**; the seek issues `bytes=6619136-` and plays at 46.4 s. Every request has the header; no key in any URL | — |

- **Conclusion:** WebView interception (the Task's example) fails on Android exactly where the user notices: seeking. The service worker cannot work on iOS. A native player on each platform streams, seeks and caches with the credential in a header.
- **Not yet prototyped:**
  - an iOS cache (AVFoundation has none built in for progressive MP4; it needs a small range cache in the loader);
  - WKURLSchemeHandler with WKWebView `<video>` (would keep the web player on iOS only, while Android needs the native player anyway).
- **Temporary diagnostics:** none in the product. Prototypes live in `/tmp/sd574` (copied into `probes/`), and the emulator AVD and simulator are test-owned.

## Requirement implications

- A native player is required on Android for Part 1, and is the consistent choice on iOS. It also gives Part 2 (landscape fullscreen) natively.
- **It needs the credential in native code for the player's session.** Today the credential is deliberately web-only (`SavedNodeEntry.kt:6-7`, `ShellBridge.kt:23`). That is a security-model decision (DEC-002).
- The node's file routes need Range/206 and a validator (ETag or Last-Modified) in every case.
