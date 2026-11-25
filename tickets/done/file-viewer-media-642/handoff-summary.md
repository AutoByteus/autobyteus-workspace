# Handoff Summary

## Summary Meta

- Ticket: `file-viewer-media-642` (Project Task `autobyteus-642`, absorbing `autobyteus-639`; requested by `/project_task_manager`, 2026-11-24)
- Date: `2026-11-25`
- Classification: `task_size: Large`, `architectural_risk: High`; route: reviewed (architecture review ARCH-REV-001 `Fail` (AR-001), ARCH-REV-002 `Pass`, ARCH-REV-003 `Fail` (AR-002, Design Impact), ARCH-REV-004, 005 and 006 `Pass`; source review CRR-001 `Fail` (CR-001, a Requirement Gap: the reference viewer still downloaded media whole), CRR-002 `Fail` (CR-002: a reference refetch re-opened the native player), CRR-003, 004 and 005 `Pass`, CRR-006 `Fail` (CR-003: the iOS audio seek waited on the stream), CRR-007 `Pass`; API/E2E `API-REV-001` `Fail` (F-1), `API-REV-002` `Pass`, final confidence 93.4 %, no category below 90 %; test-code review CRR-008 `Pass`).
- Current Status: `Verified from evidence; finalized on personal; no release` (the finalization record is in `release-deployment-report.md`).
- Branch: `codex/file-viewer-media-642`, base `origin/personal` `5c0db3a801` at bootstrap; integrated once with `origin/personal` `45d1b4309c` (autobyteus-638, server only; merge `0813c4f30e`, no conflict).
- Delivery rounds: `DR-001` delivered (`delivery-revision-record.md`).

## Delivery Summary

- Delivered scope:
  - **A message reference's video or audio streams** (REQ-001, 574 FU-001): the reference route serves ranges, an `ETag` and `304` like every file route and keeps `no-store`; the reference viewer asks one byte (`bytes=0-0`, so a deleted reference still says so) and gives the player the route's own URL. On the desktop the `<video>` or `<audio>` element streams and seeks; the phone apps play it in their own player; a phone browser downloads it as before. Text, PDF and image references read whole, as before. The server's `UserFileContent` now has one form (a file with a version): the stream form is gone.
  - **Audio in the apps' own player** (REQ-002, 574 FU-002): streaming by range, the credential only in the header, the cache reused on reopen, exactly as video; the file's name and standard controls; on iOS the controls follow AVKit (they hide during playback, a tap shows them) over an audio symbol and the name. Each app lists the extensions its player plays per kind (`hello.mediaPlayer { video, audio }`); any other type, for example Ogg audio and WebM video on iOS, plays in the page. On iOS the sound is heard with the Ring/Silent switch on silent (the audio session is `.playback` while the player shows, DEC-007); there is no background playback.
  - **A clean rename** (DEC-003, on the premise that autobyteus-574 is unreleased): `playVideo` to `playMedia { kind, … }`, `videoPlayer` to `mediaPlayer`, `video-cache` to `media-cache`, and the "media" names on the page and in both apps. No compatibility path for `playVideo`.
  - **The desktop file viewer is never narrower than 400 px** (REQ-003, 618 FU-002): when the Files panel cannot fit the tree beside a 400 px viewer, the tree goes above it; the divider stops at 400 px.
  - **More file types highlighted** (REQ-004, 618 FU-003): YAML, TOML, shell, Go, Rust, Java, XML, INI and Dockerfile, and HTML and Vue, in the file viewer (one table of types with Monaco names); in chat, a code block of each language name (Prism grammars by fence name, with the `rs` and `zsh` aliases). `FileDisplay.vue`, mounted nowhere, was removed with its Prism column (DEC-008, Principle 7).
  - **Found after the first pass, fixed:** the reference viewer still downloaded media whole (CR-001: the Solution Designer's SR-003 and SR-004); a refetch of a reference re-opened the native player (CR-002); the iOS audio seek waited on the one sequential stream instead of reading from the target on a slower link (F-1, CR-003: the loader now waits for a running fetch only if it reaches the read within about 0.7 s at the link's measured rate).
- Docs synced (`docs-sync-report.md`): server User Files (the stream form was gone), web `content_rendering.md` (new Highlighted File Types), the iOS access doc's tests line, and a correction in autobyteus-574's archived release note (its "audio and reference videos still download whole" bullet); kept from the ticket: NA-8, web `file_explorer.md`, `remote_access.md`, `agent_artifacts.md`, both access docs, `docs/design-cases.md`, both app READMEs.
- Durable coverage: `NativeMediaRealNodeUITests` (10 tests: pairing, MP3, reopen, the slower-link seek, a Team's references, a reference staying as it is while messages arrive, other references, Ogg and WebM in the page, each way to leave the player, node removal); phone cases MSP-111 to MSP-114 (`mobile-file-viewer-media-cases.mjs`: the Files layout, the highlighted types, chat code blocks, the Team tab's references); `native-video-node.mjs` (audio, a Team's references, `/team-message`, Ogg and WebM); Android `MediaPlayerActivityTest`, `MediaPlayerActivityAudioTest`, JVM tests; iOS Core tests for the loader, the kinds and the audio session; web and server specs for each rule.

## Delivery's round

- **DR-001** merged the base, reran what the ticket's five REST routes, three web viewers and two apps could affect, ran the build-only Android and iOS release runs on the final head, read the evidence, corrected the docs (above) and finalized. It found no defect.

## Verification Summary

- Verified from evidence by delivery. Every critical acceptance criterion (AC-001…AC-004) is directly proven; nothing needs the user's check to finalize.
- Evidence decision with an untested part: **DEC-007** (the iOS audio session). A test-host check shows the session's category while the player shows; the sound heard, the Ring/Silent switch itself and a screen lock can only be checked on a physical iPhone, **before a release**.
- Final confidence 93.4 % (the 95 % default target is not met; the report bounds it by the environment: emulators and simulators, no physical phone; the lowest category is 90 %).
- Key evidence opened by delivery (details in `release-deployment-report.md`):
  - AC-001: the real node's reference route for six file types (`ac001-server.json`): `200` exact, `206` exact slices, `416`, `304`, `200` for two ranges, `401` without a credential, `404` for a deleted file, `416` for the zero-byte probe; delivery's rerun of MSP-114: the video reference plays from the route (`bytes=0-0` `206`, then `bytes=0-` `206`), not a blob.
  - AC-002: iOS on a 120 s M4A over 50 ms and 60 KB/s: `bytes=693716-` at 589 ms and `bytes=930111-` (the middle) at 2.2 s after the drag, `206`, header only (round 1: nothing from the middle in 3 s); `NativeMediaRealNodeUITests` 10 of 10, 574's video class 8 of 8 (`delivered 13696434 bytes in 10.0 s; real-time playback needs at least 5345721`); Android M4A seek `bytes=940303-` 0.44 s after the tap; reopen reads only the probe; scans: 0 occurrences of the credential in 2,766 files (iOS) and in logcat, cache and logs (Android).
  - AC-003: MSP-111 on delivery's run: stacked at the default 450 px panel with the viewer 450 px, split at 700 px with the viewer 449 px, the divider stops at 400 px.
  - AC-004: MSP-112 and MSP-113 on delivery's run: each listed type opens with more than one Monaco token class; Prism token spans for every fence name on desktop and phone.
- Integrated-state checks by delivery (`evidence/delivery/`): both typechecks at baseline (server 972 in 299 files, web 86 in 36 files, 0 production errors); `check:contract-dist` `PASS`; whole server unit `1089 files`, `9105 tests`; whole server integration `92 files`, `523 tests`; whole web suite `808 files`, `6258 tests`; server and phone bundle rebuilt; eleven phone cases `Pass` (this ticket's MSP-111 to 114, the media cases MSP-89 to 92 and the base's word-wrap cases MSP-108 to 110), `unknownBrowserErrors: 0`; build-only release runs on the final head `0813c4f30e`: Android run `45535819387` (`Build Android APK` success) and iOS run `45535821825` (`Build And Test iOS App` success on Xcode 27, including the Core tests and the simulator smoke script), nothing published.

## Residual Risks For The User

- **C-6, for whoever releases: ship autobyteus-574 and this ticket in the same release.** The rename of the bridge and of the cache folder assumes nothing released holds 574. Delivery checked: no tag contains 574's merge (`7cbab1f7c2`) at the start and before the final merge, and both are on `personal` after this finalization, so a release from `personal`'s head carries both. If 574 had shipped alone, its installed apps would fall back to the page path (graceful) and their `video-cache` folder would stay unused.
- **A physical iPhone, before a release (DEC-007):** the sound, the Ring/Silent switch and a screen lock. A scrubber drag on a physical iPhone over a real network (574's recommendation) is still unchecked.
- **Held, for your judgement:**
  - a zero-byte media reference answers its probe with `416`, so the viewer shows "Failed to fetch reference content (416)" on both apps instead of an empty player;
  - on iOS the app's Back bar sits over AVKit's own top buttons (Close and AirPlay) while the controls show; both close the player.
- **O-2, iOS:** a swipe down does not close the player (it is presented full screen, which iOS gives no swipe dismissal); Back and AVKit's Close each end the audio session. The comment in `NativeMediaPlayerViewController` names a swipe-down path that does not exist.
- **O-3, iOS:** AVKit's volume control shows "0 %" with a crossed speaker on the simulator (also in the implementation's fake-node screenshot); the test host's volume is 1.0, so it looks like a simulator display artifact; the sound itself is the physical-iPhone check.
- **Optional, from the code review:** the loader's queue label still says `video-loader`.
- **Not tested here:** a media message from a generating model (574's DEC-006 covers the URL form), the packaged desktop window, signing, notarization and the store upload.
- **Environment (outside this ticket):** the whole phone probe is red on MSP-17, 58, 65, 82, 87 (autobyteus-628 FU-002) and MSP-61 (autobyteus-609 FU-006), and MSP-104 failed once in API/E2E's long run and passes alone (timing); the whole server E2E has RRB-1 and SID-2 failing (autobyteus-609 FU-007).

## Follow-ups

This ticket records none: it has no `follow-ups.md`. It resolves autobyteus-574's FU-001 (message references served whole) and FU-002 (audio downloaded whole), and 618's FU-002 and FU-003, so the Solution Designer need not send them. Not ours, outside the ticket: autobyteus-628's FU-002, autobyteus-609's FU-006 and FU-007.

## Release

- No release: the user did not ask for one and `RELEASE.md` makes none the default (the reviewer's handoff names the guide, not a release). A release is available: `release-notes.md` holds the user-facing notes (no `## What you need to do`: an app without the new player keeps today's path). Before a release: ship 574 and 642 together (C-6), repeat the iOS build-only run on the release commit, and do the physical-iPhone check (DEC-007).
