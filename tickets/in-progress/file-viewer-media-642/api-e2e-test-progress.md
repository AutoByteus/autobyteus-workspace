# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-25 00:24 | B-1 | Completed | Pass | server (prebuild + build), phone bundle, Android app on `af2b65c2c0` |
| 2026-11-25 00:25 | stack | Completed | Fail (harness) | the messages query's root kind is `agent_team`; the reference ID is the server's SHA-256 of `<messageId>\0<path>`; fixed |
| 2026-11-25 00:27 | SRV-1 | Completed | Pass | every reference type: 200/206/416/304/multi/401, exact bytes, `no-store`; deleted 404; zero-byte probe 416 |
| 2026-11-25 00:30 | AND-R1, AND-R2 | Completed | Pass | MP4 reference native, header only; CR-002: no second player, no re-open, no refetch |
| 2026-11-25 00:31 | AND-R3, AND-R4 | Completed | Pass | M4A reference in the audio screen; the other types as today; deleted "unavailable"; zero-byte 416 (held) |
| 2026-11-25 00:32 | AND-A1…A4 | Completed | Pass | MP3 cold 0.50 s, reopen probe only; M4A over 50 ms / 150 KB/s 1.23 s, seek by range 0.44 s, reopen only an unfetched gap |
| 2026-11-25 00:34 | AND-A5, AND-V, AND-C, AND-N | Completed | Pass | Ogg/WebM native; 574 video unchanged; credential 0; `media-cache` cleared on removal |
| 2026-11-25 00:35 | — | Checkpoint | — | Android stack stopped; AVD `api642_media` deleted |
| 2026-11-25 00:40 | IOS-A, IOS-B | Completed | Pass | MP3 native, symbol and name, controls on a tap; reopen probe only |
| 2026-11-25 00:40 | IOS-C | Completed | Fail (harness) | at 150 KB/s the stream passed the middle before the seek; slower link and a fresh version used |
| 2026-11-25 00:44 | IOS-D…G | Completed | Pass | references native; CR-002 holds; other types in the page; Ogg/WebM page path |
| 2026-11-25 00:45 | — | Checkpoint | — | evidence question to the Solution Designer: iOS audio heard (no audio session category) → DEC-007 |
| 2026-11-25 00:51 | IOS-C | Completed | Fail (F-1) | fresh M4A, 50 ms / 60 KB/s: no ranged read from the middle; the stream from 0 never reached it before Back |
| 2026-11-25 00:56 | IOS-Z, IOS-V | Completed | Pass | removal clears the node's `media-cache`; 574's video class 8/8 on 642's code |
| 2026-11-25 01:00 | — | Checkpoint | — | evidence question: AC-004's chat preview (`FileDisplay.vue`) is not mounted anywhere → DEC-008 |
| 2026-11-25 01:10 | MSP-111…114 | Completed | Pass; Fail (pending) | layout, viewer highlighting and desktop references pass; the phone's `rs`/`zsh` fences unhighlighted (DEC-008's round) |
| 2026-11-25 01:21 | IOS-* on `38f318021c` | Completed | Pass; Fail (F-1) | the whole class: F-1 again; the session mode `MoviePlayback` on every open, no failure line |
| 2026-11-25 01:26 | IOS-H | Completed | Pass (observation) | Back and AVKit's Close close; a swipe down cannot (full-screen presentation) |
| 2026-11-25 01:27 | — | Checkpoint | — | iOS stack stopped; simulators deleted |
| 2026-11-25 01:28 | MSP-111…114 on `339b8d0ddb` | Completed | Pass | every fence name highlighted on desktop and phone; one harness browser error (init script in a sandboxed frame) fixed |
| 2026-11-25 01:30 | WS-1 | Started | — | whole phone probe |
| 2026-11-25 02:22 | WS-1 | Completed | Pass for this ticket | 110 cases, 103 Pass; every case of this ticket passes; 7 outside (FU-002, FU-006, MSP-104 timing: passes alone) |
| 2026-11-25 02:48 | SI-1, SE-1 | Completed | Pass; Pass for this ticket | integration 523 passed; e2e only RRB-1, SID-2 (609 FU-007) |
