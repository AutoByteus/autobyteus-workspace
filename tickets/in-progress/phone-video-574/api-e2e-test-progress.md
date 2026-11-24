# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-24 14:30 | B-1 | Completed | Pass | server build, phone bundle, Android debug app (tree `b0a2eeacc0`) |
| 2026-11-24 14:40 | stack | Completed | Fail (harness) | the proxy ended a full 200 before its last chunk (`end` after a paused `data`): the player said it could not play (`unexpected end of stream`). Fixed (writes chained); the pairing query is now redacted in the log too |
| 2026-11-24 14:49 | AC5-1 | Completed | Pass | four routes incl. `/rest/files/video/…` (DEC-006): 206 for `a-b`, `a-`, `-n` with exact bytes; 416; 304; 200 multi-range and plain; 401 without a credential |
| 2026-11-24 14:55 | AND-1 | Checkpoint | — | own AVD `api574_video` on `-port 5580`, headless; paired by a share intent (the link read from the secrets file, never printed) |
| 2026-11-24 14:57 | AND-1, AND-2 | Completed | Pass; observation | chat link and Files open the app's player at once; requests `bytes=0-1` (206) then one unranged 200 read progressively, phone header, no URL credential. Visible first frame 2.3–3.3 s after the tap on the emulator's software GL (`swiftshader`); a reopen fetching 0 bytes is as slow |
| 2026-11-24 15:01 | AND-4 | Completed | Pass | reopen: only the 2-byte probe; changed file (new ETag) fetched fresh, shows CHANGED-574 |
| 2026-11-24 15:04 | AND-9 | Completed | Fail | F-1: a rewrite while the viewer is mounted opens the player again: a second player on top (1 → 2), or the player pops up after it was closed |
| 2026-11-24 15:07 | AND-3 | Completed | Pass | a bar tap to the middle: `bytes=10960106-` (206, phone header) 0.9 s later; plays at 15.000 → 17.933 |
| 2026-11-24 15:08 | AND-5 | Completed | Pass | full screen: `ROTATION_90`, status and navigation bars hidden, video fills the height; exit `ROTATION_0`, position kept |
| 2026-11-24 15:10 | AND-10 | Completed | Pass with observation | R-2: night mode during playback recreates the player: "This video could not be played"; Back works; Play again plays, fetching only the gap (931 KB) |
| 2026-11-24 15:11 | AND-7 | Completed | Pass | credential occurrences 0 in logcat (all buffers), the cache folder and Media3's database, the proxy log; 32 file requests all header-only |
| 2026-11-24 15:13 | AND-8, AND-13 | Completed | Fail | F-2: `/rest/../graphql`, `/rest/%2e%2e/graphql`, `/rest/../mobile/` pass the route check; the player sends the phone header to `/graphql` and `/mobile/`. Other origin, userinfo, scheme, plain non-`/rest/` refused with nothing sent. `/rest/files/…` plays natively (positive control) |
| 2026-11-24 15:15 | AND-6 | Completed | Pass | in-page video full screen: `ROTATION_90`, bars hidden; exit `ROTATION_0`; a playing video kept playing (7.88 → 9.25 s) |
| 2026-11-24 15:17 | AND-11 | Completed | Pass | the app built from base `4b73fccae2`: `hello` without `videoPlayer`; the page plays in page from a blob (one 200 with the phone header); no native player |
| 2026-11-24 15:19 | AND-12 | Completed | Pass | node removal (Remove, confirmed): video cache 206,960 KB / 49 files → 92 KB / 0 files |
| 2026-11-24 15:20 | — | Checkpoint | — | Android stack stopped; emulator killed; AVD `api574_video` deleted; base worktree removed |
| 2026-11-24 15:23 | stack | Completed | Fail (harness) | a pairing link may not name a loopback host; a failed start left its node running (killed). Added `--listen-host`; a failed start now stops its node |
| 2026-11-24 15:24 | IOS-1 | Completed | Pass | own simulator `api574-iphone`; paired through `autobyteus://open?input=` |
| 2026-11-24 15:26 | IOS-2 | Completed | Pass; observation | chat link: first frame 0.23 s after the tap's first response, playing at 1.36 s; landscape; R-1: the Back/title bar stays over the video |
| 2026-11-24 15:28 | IOS-4 | Completed | Pass | reopen: only the 2-byte probe |
| 2026-11-24 15:30 | IOS-6 | Completed | Observation | scrubber dragged by XCUITest: the picture freezes (15.533) while the clock advances; same on a fresh file (15.200) |
| 2026-11-24 15:32 | IOS-7 | Completed | Pass | skip forward (+10 s) from the cache plays on |
| 2026-11-24 15:34 | IOS-6 | Completed | Observation | scrub back (to 3.6 s) freezes too; pause/resume does not recover |
| 2026-11-24 15:36 | IOS-8 | Completed | Pass | control: through the app's loader a precise seek (96 frames in 4 s) and 20 rapid precise seeks (125 frames in 5 s) keep delivering frames, as a plain file does |
| 2026-11-24 15:37 | IOS-9 | Completed | Fail | F-2 on iOS: the route check allows `/rest/../graphql`, `/rest/%2e%2e/graphql`, `/rest/../mobile/`; URLSession sends them unchanged with the header (a dummy credential, the real proxy) |
| 2026-11-24 15:38 | IOS-3 | Completed | Pass | Files, tall: portrait; first frame 0.17 s, playing 1.28 s |
| 2026-11-24 15:39 | IOS-11, IOS-5 | Completed | Fail; Pass | F-1 on iOS: after Back, a rewrite opens the player by itself (CHANGED-574, fetched fresh); while open, a probe is sent but no second player shows |
| 2026-11-24 15:40 | IOS-10 | Completed | Pass | credential occurrences 0 in 2,772 files (simulator log, cache, preferences, proxy and stack logs, results); 23 file requests all 206, header-only |
| 2026-11-24 15:41 | IOS-12 | Completed | Pass | node removal: cache emptied at the removal time (container moved by a reinstall; repeated cleanly at 15:46) |
| 2026-11-24 15:45 | IOS-13 | Completed | Fail (F-1) | the durable class on a fresh stack: pairing, chat link, skip, Files pass; the rewrite test fails on F-1 as intended; removal path fixed and rerun: 6 files / 28.6 MB → 0 |
| 2026-11-24 15:47 | — | Checkpoint | — | iOS stack stopped; simulator `api574-iphone` deleted (iPhone 17, iPhone 16e of others untouched) |
| 2026-11-24 15:47 | WS-1 | Started | — | whole phone probe, clean env |
| 2026-11-24 15:50 | DSK-1 | Completed | Pass | Chromium with the owner credential: a rewritten text and binary file come back new (new ETag, `no-cache`), no stale copy |
| 2026-11-24 16:39 | WS-1 | Completed | Pass for this ticket | 103 cases, 97 Pass; MSP-89…92 Pass; failing MSP-17, 58, 65, 82, 87 (628 FU-002), MSP-61 (609 FU-006); `unknownBrowserErrors: 0` |
| 2026-11-24 17:52 | — | Checkpoint | — | a whole-disk `find` of mine blocked for its 2 h timeout (no effect on any result) |
| 2026-11-24 17:56 | SI-1 | Completed | Pass | integration 92 passed (523 tests) |
| 2026-11-24 18:19 | SE-1 | Completed | Pass for this ticket | e2e 124 passed, 4 failed: RRB-1, SID-2 (609 FU-007); TAU-3 and the terminal-home case pass rerun with resolved paths (`/tmp` vs `/private/tmp`, a temp file mid-rename) |
| 2026-11-24 18:22 | AND-2b | Completed | Pass | own AVD `api574_gpu` with `-gpu host`: playing about 1.4 s (Files, cold), 1.7 s (chat, cold), 0.4 s (reopen) after the tap |
| 2026-11-24 18:26 | smoke | Completed | Pass | `ios-simulator-smoke.sh` on my own simulator (`IOS_SIMULATOR_NAME=api574-smoke`): 8 passed, 0 skipped; the new class excluded |
| 2026-11-24 18:28 | IOS-14 | Completed | Pass | the player's own Close (X) closes it as Back does (portrait, the page's viewer) |
| 2026-11-24 18:29 | — | Checkpoint | — | stacks stopped; AVD `api574_gpu` and simulator `api574-smoke` deleted |
| 2026-11-24 18:53 | — | Checkpoint | — | Round 2 (CRR-003 on IR-002, `64a99bbcd2`): phone bundle rebuilt (after rebuilding the contract packages' missing `dist/`), Android app built; web video specs 24 files / 200 tests Pass |
| 2026-11-24 18:59 | R2-AND-8 | Completed | Pass | own AVD `api574_r2` (`-port 5584`, host GPU); the three dot-segment URLs and the five others refused, nothing sent; `/rest/files/…` plays |
| 2026-11-24 19:01 | R2-AND-9 | Completed | Pass | rewrite with the player open: 1 stays 1; after Back 0 stays 0; Play plays the new version; the same file again shows Play; another file and the chat link open the player |
| 2026-11-24 19:02 | — | Checkpoint | — | Android stack stopped; AVD `api574_r2` deleted |
| 2026-11-24 19:08 | R2-IOS-13 | Completed | Pass | own simulator `api574-r2`, fresh stack: all 7 tests pass, incl. `testDARewriteDoesNotOpenThePlayerByItself` |
| 2026-11-24 19:10 | R2-IOS-9, R2-IOS-U | Completed | Pass | every dot-segment form refused before sending; iOS core tests pass (the loader test with a 60 s video: a 30 s video cannot pass its 30 s seek) |
| 2026-11-24 19:10 | — | Checkpoint | — | iOS stack stopped; simulator `api574-r2` deleted; temporary route-check test removed |
| 2026-11-24 19:11 | R2-AND-U | Completed | Pass | Android JVM 129 tests, 0 failed |
| 2026-11-24 19:16 | R2-MSP-89…92 | Completed | Pass | all four; `unknownBrowserErrors: 0` |
