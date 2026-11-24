# Handoff Summary

## Summary Meta

- Ticket: `phone-video-574` (Project Task `autobyteus-574`, absorbing `autobyteus-636`; requested by `/project_task_manager` for the founder, 2026-11-24)
- Date: `2026-11-24`
- Classification: `task_size: Large`, `architectural_risk: High`; route: reviewed (architecture review ARCH-REV-001 `Fail` (AR-001: a cache header with no freshness rule, resolved by SR-002), ARCH-REV-002 `Pass`; source review CRR-001 `Pass`, CRR-002 `Fail` (CR-001, CR-002), CRR-003 `Pass`, CRR-005 `Fail` (CR-003), CRR-006 `Pass`, CRR-007 `Fail` (CR-004), CRR-008 `Pass`; API/E2E `API-REV-001` `Fail` (F-1, F-2), `API-REV-003` `Fail` (F-3), `API-REV-004` `Fail` (F-4), `API-REV-005` `Pass`, final confidence 93.6 %, no category below 90 %; test-code review CRR-004 and CRR-009 `Pass`).
- Current Status: `Verified from evidence; finalized on personal; no release` (the finalization record is in `release-deployment-report.md`).
- Branch: `codex/phone-video-574`, base `origin/personal` `4b73fccae2` at bootstrap; integrated twice with the base, no conflict: `c1147c8917` (merge `d7399a925b`, round DR-001) and `6cdd1b7bd4` (8 commits of autobyteus-618, web-only; merge `0ee8e7fb8b`, round DR-002).
- Delivery rounds: `DR-001` evidence requested from API/E2E; `DR-002` delivered (`delivery-revision-record.md`).

## Delivery Summary

- Delivered scope:
  - **Native video in the phone apps.** In the Android app (Media3 1.5.1) and the iOS app (AVPlayerViewController), a node video opens in the app's own player, which streams it by range, so it starts at once and a seek reads only the part it needs. It works from Files, from a chat link to a file and from a media message. The page decides (`useNativeVideoPlayback`: `native`, `page` or `pending`) and hands the app the file's URL, name and the phone's credential over the shell bridge (`playVideo`); an older app or a browser keeps the page's own player (DEC-005).
  - **No download again.** The apps keep what they fetched by file version (node, file, `ETag`), at most 500 MB, least recently used first, in a private cache folder, video bytes only; a changed file is fetched anew; a node's entries are deleted when the node is removed (DEC-003).
  - **The credential stays private** (REQ-003, NA-8): header only, to the open node's origin only, memory only until the player closes, no redirect followed, no log, no Intent extra. Both apps refuse a URL of another origin, with user info, outside `/rest/` or with a `.` or `..` segment.
  - **Full screen** (REQ-004): the native players turn a wide video to landscape with the bars hidden and back to portrait with the position kept; on Android an in-page `<video>`'s full-screen button works too (DEC-004).
  - **The node's file routes answer ranges** (REQ-005): one owner, `sendUserFile`, serves a file by range with a strong `ETag` and `Cache-Control: no-cache`: `206`, `416`, `304`, `200`. No cache shows an old copy of a file an agent rewrote (SR-002).
  - **Four defects found after the first pass, fixed** (each by API/E2E's real-node journeys, confirmed by the failure-origin review): a rewrite of the open file opened the player again (F-1, CR-001); the route check let `/rest/..` through (F-2, CR-002); an iOS scrubber drag froze the picture (F-3, CR-003: the loader now declares the file available on demand); that fix made playback fall below real time over a 20 to 50 ms link (F-4, CR-004: one streaming read-ahead answers AVFoundation's small reads).
- Docs synced (`docs-sync-report.md`): `features/remote_access.md` (User Files: the "no `Accept-Ranges` and no `206`" sentence was false), web `file_explorer.md` (the viewer's modes), web `remote_access.md` ("It carries no credential" was false; new Video paragraph), `docs/android_mobile_access.md` and `docs/ios_mobile_access.md` (new Video sections); kept from the ticket: NA-8 in `node_access_model.md`, `docs/design-cases.md`, both app READMEs.
- Durable coverage: `autobyteus-web/tests/e2e/native-video-node.mjs` (a real node behind a logging proxy, throttle and latency switches, `/rewrite`, `/touch`); `NativeVideoRealNodeUITests` (7 tests: pairing, chat link and scrub with a picture check, a real-time delivery check over a slower link, skip, Files, rewrite while the viewer is open, the player's Close, node removal); `AuthorizedMediaLoaderTests` (waits for decoded frames) and `AuthorizedMediaLoaderReadAheadTests`; Android `VideoPlayerActivityTest`, `WebMediaFullScreenTest`, JVM tests; server unit and E2E specs for ranges; web specs for each mode.

## Delivery's two rounds

- **DR-001 asked API/E2E for evidence.** AC-001 (critical) on iOS depends on AVKit's scrubber, and API/E2E's observation O-4 (the picture freezes after a drag, unattributed, a grey block in the frames) could not be told from a loader defect by its only control. Delivery asked for the same drag on a plain file, a pixel comparison and a byte comparison. They showed the loader was the cause (F-3: plain file plays on, the shipped loader stops 3 of 3; bytes and frames were identical) and led to IR-003 and IR-004.
- **DR-002** merged the base again, reran what the new code and base could affect, judged the new evidence, ran the build-only Android and iOS release runs on the final head, corrected the web, server and app docs and finalized.

## Verification Summary

- Verified from evidence by delivery. Every critical acceptance criterion (AC-001…AC-006) is directly proven apart from DEC-006; nothing needs the user's check to finalize.
- Accepted unverified risk (**DEC-006**, the Solution Designer's evidence decision, user informed): AC-001 "from a media message" on a live run was not run (a real video media segment needs a paid, non-deterministic video model). Its URL form is a ranged `/rest/files/…` route and the tile calls the same `play(url)` as Files; the Android bridge played that URL form (AND-13).
- Final confidence 93.6 % (the 95 % default target is not met; the report bounds it by the environment: emulators and simulators, no physical phone or real network; the lowest category is 91 %).
- Key evidence opened by delivery (details in `release-deployment-report.md`):
  - AC-001 iOS: `R5/r5-lat-tc.png`: after the scrub the burnt-in timecode jumps to about 15 s and runs at 1× at 0, 20 and 50 ms of latency; `testBDeliversInRealTimeOverASlowerLink`: `delivered 13893634 bytes in 10.0 s; real-time playback needs at least 5339896`; core `Executed 82 tests, with 0 failures`, `at the middle 0.62 s after the seek`, `fetched again of the cached: 0`. Android: playing 1.2 to 1.7 s after the tap on a GPU emulator, seek at the middle after 1.7 s, ranged reads with the phone header.
  - AC-002: reopen reads only the 2-byte probe on both apps; a changed file shows its new content; node removal empties the cache (Android 206,960 KB to 92 KB; iOS 6 files to 0).
  - AC-003: 0 occurrences of the credential in logcat, the cache, the simulator log, the proxy and stack logs (2,772 files on iOS); nine crafted URLs refused with nothing sent; round 5's proxy log: all 21 file requests `206` with the header and none with a credential in the URL.
  - AC-004: Android `ROTATION_90`, bars `visible=false`, back to `ROTATION_0` with the position kept; iOS landscape for a wide video, portrait for a tall one.
  - AC-005: `206`/`416`/`304`/`200` with the exact bytes (SHA-256) on workspace, static, node-files and `/rest/files` routes; Chromium reloads a rewritten file new.
  - AC-006: the base app's `hello` has no `videoPlayer` and the page plays the video itself.
- Integrated-state checks by delivery (`evidence/delivery/`): both typechecks at baseline (server 972 in 299 files, web 86 in 36 files, 0 production errors); `check:contract-dist` `PASS`; whole server unit suite `1085 files`, `9076 tests` passed; whole web suite `806 files`, `6156 tests` passed; server and phone bundle rebuilt; MSP-89 to 92 `Pass`, `unknownBrowserErrors: 0`; build-only release runs on the final head `0ee8e7fb8b`: Android run `45478679986` (`Build Android APK` success) and iOS run `45478686275` (`Build And Test iOS App` success on Xcode 27, including the Core tests), nothing published.

## Residual Risks For The User

- **R-1 (for your judgement): on iOS the app's Back/title bar stays over the video in landscape.** It sits over the top-left of the picture and does not hide with the controls (frame: `evidence/api-e2e/ios/strips/landscape-r1-back-bar.png`). The player's own close button also closes it. If it is not acceptable, the bounded remedy is hiding the bar with the controls or using the player's own close control.
- **A scrubber drag on a physical iPhone over a real network has not been checked.** The simulator controls attribute the freeze to the loader and show it fixed, at 0, 20 and 50 ms. API/E2E and the code reviewer recommend a physical-iPhone scrub check before a release.
- **R-2: on Android, a system dark-mode switch during playback recreates the player,** which then says "This video could not be played." Back and Play recover from the cache.
- **O-7: on a link slower than the video's bitrate (0.5 MB/s for a 0.76 MB/s video), iOS plays at the link's speed and the scrubber's clock runs about 2 s ahead of the picture.** This is outside AC-001's conditions.
- **DEC-006** (above): a media message on a live run was not run.
- Held by the code review, not findings: a far read while another read waits on a running fetch would start an overlapping fetch (bandwidth only, unreached; H-1), and the Android journeys are not a durable driver (the instrumented tests need two test videos on the device).
- **Not tested here:** the packaged desktop window (its change is only the routes' headers, proven in Chromium), LRU eviction at 500 MB, signing, notarization and the store upload (the release runners).
- **Environment (outside this ticket):** the whole phone probe is red on MSP-17, 58, 65, 82, 87 (autobyteus-628 FU-002) and MSP-61 (autobyteus-609 FU-006); the whole server E2E has RRB-1 and SID-2 failing (autobyteus-609 FU-007).

## Follow-ups

`follow-ups.md` lists, for the Solution Designer to send (none sent yet; none urgent):

- **FU-001:** collaboration message references are served as a stream with no size, so they cannot be served in ranges; a phone video reached only that way still downloads whole.
- **FU-002:** audio on the phone still downloads whole before it plays; the native players can take it with the same handoff.
- Not ours: autobyteus-628's FU-002, autobyteus-609's FU-006 and FU-007.

## Release

- No release: the user did not ask for one and `RELEASE.md` makes none the default (the reviewer's handoff names the guide, not a release). A release is available: `release-notes.md` holds the user-facing notes (no `## What you need to do`: an app without the player keeps today's path). Before a release, repeat at least the iOS build-only release run on the release commit and consider the physical-iPhone scrub check.
