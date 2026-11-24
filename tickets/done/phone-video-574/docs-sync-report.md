# Docs Sync Report — autobyteus-574 (phone-video-574)

## Scope

- Ticket: `phone-video-574` (Project Task `autobyteus-574`, absorbing `autobyteus-636`): in the Android and iOS apps a node video plays in the app's own player (Media3, AVPlayer) that streams it by range, keeps what it fetched by file version and never puts the phone's credential in a URL, log or stored record; Android's fullscreen button works (native player and in-page video); the node's file routes answer Range requests with a version (`ETag`) and revalidate before every reuse.
- Trigger: API-REV-005 `Pass` (93.6 %, round 5 on IR-004), test-code review CRR-009 `Pass`; source review CRR-001 `Pass`, CRR-002 `Fail` (CR-001, CR-002), CRR-003 `Pass`, CRR-005 `Fail` (CR-003), CRR-006 `Pass`, CRR-007 `Fail` (CR-004), CRR-008 `Pass`. `task_size` `Large`, `architectural_risk` `High`, route `Code Review` (reviewed).
- Bootstrap base reference: `origin/personal` `4b73fccae2`.
- Integrated base reference used for docs sync: `origin/personal` `6cdd1b7bd4` (after DR-001's `c1147c8917`), merged as `0ee8e7fb8b`. DR-001's merge of `c1147c8917` is `d7399a925b`.
- Post-integration verification reference: `evidence/delivery/dr-002/` on the merged tree; the release/deployment report lists it.

## Why Docs Were Updated

- Summary: the ticket changed what a node file route answers (ranges, a version, revalidation), how the phone apps play a video (a native player fed by the page over the shell bridge, with a credential handed over for one playback) and what the Android window does for in-page full screen. It updated only `docs/design-cases.md`, `node_access_model.md` (NA-8) and the two app READMEs. Four long-lived statements became false, and the apps' docs had no video section:
  - the server doc said the file routes serve "a whole file, never a part: no `Accept-Ranges` and no `206`";
  - the web Files doc said the node's file routes cannot seek and the phone downloads a whole video into an object URL first;
  - the web Phone Access doc said the shell bridge "carries no credential", which `playVideo` now breaks on purpose (node access model NA-8);
  - the Android and iOS access docs did not mention the player, its cache or its full screen.
- Why this should live in long-lived project docs: a later change to a file route must keep its version and revalidation rule (an old copy of a rewritten file must never show), and a later bridge message must not carry the credential unless it follows `playVideo`'s rules (origin, route and plain-token checks, memory only, header only); the player's cache and read-ahead rules explain why a scrub and a link with a round trip behave as they do.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules; rule 9 (no compatibility between versions), rule 11 (no production code for tests), rule 12 (build-only runs) apply | No change | The ticket applies existing rules. DEC-005 (an app without the player keeps the page's own path) is a store-distributed app's capability, not a node-version path |
| `TESTING.md` | Test layers; the iOS wrapper row points to `autobyteus-ios/README.md`; "Android emulators"; Fresh-start build | No change | Its rules already cover the app tests (the READMEs say how to run them), own emulators and simulators, and the Media3 build input (fresh Android build IMP-08, build-only runs IMP-09 and DR-002's) |
| `RELEASE.md` | Finalization and release rules; the iOS release job runs `AutoByteusMobileCoreTests` | No change | Read from the merged tree; unchanged by the ticket |
| `docs/design-cases.md` | Design cases | Updated in the ticket (kept) | The ticket's case bullet (the cache header lesson: list every reader of a header that lets one client cache) |
| `autobyteus-server-ts/docs/design/node_access_model.md` | NA-8: credentials never leave their owner | Updated in the ticket (kept) | NA-8 names the one exception, `playVideo`, and its rules; checked against `NodeVideoHttp.isNodeFileUrl`, `ShellBridge.playVideoOf`, `NativeVideoPlayback` |
| `autobyteus-android/README.md`, `autobyteus-ios/README.md` | How to run the app tests | Updated in the ticket (kept) | The video tests' fixtures and commands; the iOS README also names `NativeVideoRealNodeUITests` and `native-video-node.mjs` |
| `autobyteus-server-ts/docs/features/remote_access.md` | "User Files": what every file route answers | Updated by delivery | The false sentence about no ranges |
| `autobyteus-web/docs/file_explorer.md` | The video viewer's paragraph | Updated by delivery | Seeking, the native mode and the page mode |
| `autobyteus-web/docs/remote_access.md` | The shell bridge | Updated by delivery | "It carries no credential" corrected; new "Video" paragraph |
| `docs/android_mobile_access.md` | Android app behavior and validation | Updated by delivery | New "Video" section; one minimum scenario |
| `docs/ios_mobile_access.md` | iOS app behavior and validation | Updated by delivery | New "Video" section |
| `autobyteus-web/docs/content_rendering.md`, `agent_artifacts.md`, `autobyteus-server-ts/docs/FILE_RENDERING_AND_MEDIA_PIPELINE.md` | They name the video viewer and the media routes | No change | They describe which component renders which type and where media is stored, not how a route answers a range or how the phone plays |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/features/remote_access.md` | Contract | "User Files": a route that resolved a regular file hands it over as `kind: "file"` and `sendUserFile` serves it by range with `Accept-Ranges: bytes`, a strong `ETag` (`"<size>-<mtimeMs>"`) and `Cache-Control: no-cache` (a route's `no-store` stays); `206` with `Content-Range`, `416`, `304`, `200` for a malformed or multiple `Range`, no `Range` or an `If-Range` naming another version; the message-reference routes still send a stream whole; replaces "no `Accept-Ranges` and no `206`" | The ticket's REQ-005 |
| `autobyteus-web/docs/file_explorer.md` | Behavior | The viewer's video paragraph: the desktop window's workspace URL seeks (node routes answer ranges); on the phone two modes chosen by `useNativeVideoPlayback.modeFor`: `native` (the app's player, a Play button, auto-open on first show or another file, never on a reload of the same file) and `page` (the whole-file object URL, as before), `pending` while the app has not answered; the chat media tile | The viewer no longer always downloads whole on the phone |
| `autobyteus-web/docs/remote_access.md` | Contract | The bridge paragraph says only `playVideo` carries a credential; new "Video" paragraph: `hello.videoPlayer`, `playVideo { url, title, credential }`, what the app checks and ignores, memory and header only, the cache's size, key and cleanup, the apps' full screen | NA-8's exception, stated where the bridge is |
| `docs/android_mobile_access.md` | Behavior and validation | New "Video" section (Media3 player, credential handling, cache, full screen of the player and of an in-page video, older page or app, tests) and minimum scenario 15 | The app's behavior and how to validate it |
| `docs/ios_mobile_access.md` | Behavior and validation | New "Video" section (AVPlayerViewController and the Back bar, the loader with the on-demand declaration and the read-ahead, credential, cache, measured behavior, tests) | The app's behavior and how to validate it |

All statements were checked against the code at the merged state: `user-file-reply.ts` (`versionOf`, `parseRange`, `requestedRange`, `sendFile`, `sendUserFile`), the routes that pass `kind: "file"` (`files.ts`, `workspaces.ts` twice, `node-files.ts`, `context-files.ts`, `run-file-changes.ts`) and the one that passes a stream (`collaboration-message-references.ts`), `VideoPlayer.vue`, `MediaSegment.vue`, `useNativeVideoPlayback.ts`, `shellBridge.ts`, `ShellBridge.kt` (`playVideoOf`, `helloReply`), `NodeVideoHttp.isNodeFileUrl`, `NativeVideoPlayback.kt`, `VideoCache.kt` (`MAX_BYTES` 500 MB), `build.gradle.kts` (Media3 1.5.1), `NativeVideoPlayer.swift`, `AuthorizedMediaLoader.swift`, `MediaRangeCache.swift` (`defaultMaxBytes` 500 MB), and the measured figures against the API/E2E report's round 2 to 5 rows.

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| A file route's version and revalidation | One owner serves a file by range with a strong `ETag` and `no-cache`, so a cache never shows an old copy of a rewritten file; a stream route sends the whole file | `design-spec.md` D-1, SR-002; ARCH-REV-001 AR-001 | `features/remote_access.md` (User Files), `docs/design-cases.md` |
| The one credential exception | `playVideo` hands the phone's credential to the app for one playback; the app checks origin and route and keeps it in memory | `design-spec.md` D-5; DEC-002 | `node_access_model.md` NA-8, web `remote_access.md` |
| Which player plays a phone video | The page decides `native`, `page` or `pending` and opens the player only on first show or on a tap | `design-spec.md` D-2; CR-001 | web `file_explorer.md` |
| The iOS loader's two rules | Declare the file available on demand (else an AVKit scrub freezes the picture), and answer small reads from one streaming fetch (else playback falls below real time on a link with a round trip) | `code-review-report.md` CRR-005 to CRR-008; API-REV-003 to API-REV-005 | `docs/ios_mobile_access.md` |
| The apps' cache | Bounded (500 MB, least recently used), private, keyed by node, file and `ETag`, video bytes only, emptied when the node is removed | DEC-003, D-7 | `docs/android_mobile_access.md`, `docs/ios_mobile_access.md`, web `remote_access.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| The routes' "whole file, never a part" answer | `kind: "file"` replies served by range with a version | `features/remote_access.md` (User Files) |
| The phone's always-whole-download of a video before play | The app's native player in the apps (`native` mode); the object URL stays for a browser, an older app, another site's video | web `file_explorer.md`, web `remote_access.md` |
| "The bridge carries no credential" | One message, `playVideo`, carries it for one playback | web `remote_access.md`, `node_access_model.md` NA-8 |
| A disabled fullscreen button for in-page video on Android | `onShowCustomView` / `onHideCustomView` through `WebMediaFullScreen` | `docs/android_mobile_access.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used: docs changed (above).

## Delivery Continuation

- Result: `Pass` for the docs.
- Next delivery action: verification record and the build-only runs' results, handoff summary, release notes, archive, finalization.
- Notes: no discrepancy outside this ticket was found. The ticket's own follow-ups FU-001 (message references served without ranges) and FU-002 (audio through the native player) stay in `follow-ups.md`; the User Files paragraph and the Files doc say where each still applies.
