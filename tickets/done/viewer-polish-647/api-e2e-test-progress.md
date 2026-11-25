# API/E2E Test Progress

Ticket autobyteus-647 (viewer-polish-647), round 1, commit under test `812760b2ec`. Working root `/tmp/api647` (mine).

| Time (2026-11-25) | Case | Event | Note |
| --- | --- | --- | --- |
| 10:50 | API-002 | Started | Fresh clone `--no-local` at `812760b2ec`, frozen install, `build:electron:mac -- --arm64` |
| 10:56 | API-002 | Completed: Pass | Build exit 0; typecheck PASS (baseline); Prisma, terminal runtime ×2, spawn probe ok; signing-policy step needs the runner's identity (IMP-007) |
| 10:57 | API-020 | Started | Isolated instance `iso-50568-a204` of API-002's app, own data root `/tmp/api647/desk/data` |
| 10:59 | API-020 | Completed: Pass | AC-005 5 rounds + 5 switches, 1 worker, 1 JS blob; AC-001 JSON gutter 6 px, first char 6 px, edit + save ok. Instance stopped |
| 11:00 | API-010…013 | Checkpoint | Phone bundle build (`build:mobile-web`) started for the probe |
| 11:01 | API-001 | Started | seven spec files, `npx vitest run` |
| 11:02 | API-001 | Completed: Pass | 7 files, 43 tests |
| 11:02 | API-010…013 | Started | probe `--cases=MSP-108,MSP-109,MSP-110,MSP-115,MSP-116,MSP-117,MSP-118`, output `/tmp/api647/results/probe-r1` |
| 11:05 | API-010…013 | Completed (probe-r1) | MSP-110 Pass; MSP-116 Pass; MSP-118 Pass; MSP-108/109 Fail on my mapping (gutter values all pass): fixed; MSP-117 harness click timeout: fixed; **MSP-115 Fail: desktop shows "Failed to fetch reference content (416)"** (node answered 416 `bytes */0`; `Content-Range` not exposed by CORS) |
| 11:06 | API-010, 011, 012 | Started (probe-r2) | `--cases=MSP-108,MSP-109,MSP-110,MSP-115,MSP-117`, output `/tmp/api647/results/probe-r2` |
| 11:09 | API-010, 011, 012 | Completed (probe-r2) | MSP-108, 109, 110 Pass (AC-001: 0 line numbers, margin 6 px, first char 6 px everywhere); MSP-117 Pass (9 opens, 1 module worker, 1 JS blob); **MSP-115 Fail again** (same desktop error; phone viewer "This video could not be played. Retry"). Probe cleanup: servers 0, root removed |
| 11:09 | API-030…033 | Started | iOS build for testing on my simulator `api647-iPhone17` |
| 11:13 | API-030 | Completed: Pass | `NativeMediaPlayerUITests` 4/4 on the fake node (`fake-mobile-server.py`, 30 s MP4, 120 s MP3) |
| 11:13 | API-032 | Checkpoint | Simulator log has no audio-session activation lines: temporary diagnostics `API647DIAG` added (MediaAudioSession begin/end, host viewDidDisappear/teardown/deinit); to be removed before handoff |
| 11:15 | API-030 | Completed: Pass (rerun with diagnostics) | 4/4; each path (failure + Back, iOS close ×2, swipe) logs teardown + `session end: deactivated=1`, category restored |
| 11:16 | API-031 | Started | `NativeMediaRealNodeUITests` on fresh stack `rn-media` |
| 11:20 | API-031 | Completed (media class): Pass | 10/10; 9 session begins, 9 ends `deactivated=1`; testH swipe and iOS close each tear down within ~2 s. Stack stopped |
| 11:21 | API-031 | Started (video class) | `NativeVideoRealNodeUITests` on fresh stack `rn-video` |
| 11:24 | API-031 | Completed (video class): Pass | 8/8; 6 session begins, 6 ends `deactivated=1`. Stack stopped |
| 11:25 | API-033 | Started | temporary `Viewer647TempUITests` on fresh stack `rn-temp`, three PDFs + JSON added to its workspace, screen recorded |
| 11:27 | API-033 | Completed: Pass | 4/4: PDFs ×2 rounds drawn in WKWebView, JSON without line numbers; wide video landscape with iOS's controls; "the app" path (`autobyteus://demo` while playing): teardown + `session end: deactivated=1` |
| 11:28 | API-032 | Completed: Pass | diagnostics removed (`git checkout` of both Swift files), temporary class deleted, project regenerated; `grep API647DIAG` empty |
| 11:29 | API-040 | Started | Android debug APK build |
| 11:30 | API-040 | Completed (first pass) | Android: AC-005 2 rounds, 1 worker, 1 JS blob; AC-001 margin 6, first char 6; AC-002 empty ref: no page error, native MediaPlayerActivity "This video could not be played." + BACK. CDP screenshot of gamma blank: rechecking |
| 11:32 | API-040 | Completed: Pass | Rerun on a fresh stack with a pixel check: every canvas inked (3, 2, 4 ×2), adb screencap shows gamma drawn. Emulator killed, AVD deleted, stacks stopped |
| 11:33 | API-014 | Started | whole phone probe, output `/tmp/api647/results/probe-full` |
| 12:28 | API-014 | Checkpoint | whole probe: 105 Pass, 9 Fail (MSP-115 known; MSP-105, 17, 61, 65, 82, 87, 92, 58). Cleanup receipt clean |
| 12:29 | API-014 | Checkpoint | the eight rerun alone: MSP-105 Pass; seven Fail again. MSP-92 expects "Loading reference file..." but the phone shows "Loading video… x of 9.7 MB" (642's phone download) |
| 12:36 | API-014 | Checkpoint | base `bc4351cad7` fresh clone `/tmp/api647/base`: install, SDK dist, server, phone bundle, then the seven cases (failure origin) |
| 12:44 | API-014 | Checkpoint | base: MSP-17, 61, 65, 82, 87, 58 Fail (pre-existing, FU-001); MSP-92 Pass |
| 13:07 | API-014 | Completed: Pass (no regression) | MSP-92 with a MutationObserver record ×2 on HEAD and base: identical texts, Pass ×4 (sampling timing); temporary edits reverted in both trees. FU-002 recorded |
| 13:36 | Round 2 | Started | IR-002 (SR-003), HEAD `adcff4d2b2` |
| 13:37 | API-001 | Completed: Pass (r2) | 7 files, 43 tests |
| 13:37 | API-002 | Started (r2) | fresh clone `/tmp/api647/fresh2` at `adcff4d2b2`, frozen install, `build:electron:mac -- --arm64` |
| 13:45 | API-002 | Completed: Pass (r2) | build exit 0, `[typecheck] PASS` |
| 13:46 | API-021 | Started | isolated instance `iso-60514-f216` of the r2 app; remote node = a `native-video-node.mjs` stack on loopback; add node, connect with a setup code (file mode 600, deleted after), open its window |
| 13:52 | API-021 | Completed: Pass | packaged `file://` window, cross-origin: probe 416 `bytes */0`, player `bytes=0-` 416, "This video could not be played. Retry", no fetch error; deleted: "Reference file unavailable". Instance and stack stopped |
| 13:53 | API-011 | Started (r2) | `build:mobile-web`, then probe `--cases=MSP-114,MSP-115,MSP-92` |
| 14:01 | API-011 | Completed: Pass (r3) | MSP-92, MSP-114, MSP-115 Pass; 0 unknown browser errors; cleanup clean |
| 14:03 | Round 2 | Completed: Pass | documents updated (API-REV-002) |
