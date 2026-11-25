# API/E2E Execution Coverage Report

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: Round 1.
  - It started on `/code_reviewer`'s CRR-003 Pass on IR-003 (`af2b65c2c0`).
  - During it, two of my evidence questions were decided and implemented:
    - DEC-007, the iOS audio session: IR-004, `38f318021c`, CRR-004 Pass;
    - DEC-008, chat code blocks with `FileDisplay.vue` removed: IR-005, `339b8d0ddb`, CRR-005 Pass.
  - Each area ran on the head that last changed it:
    - the server and Android (unchanged after IR-003) on `af2b65c2c0`;
    - iOS on `38f318021c` (also unchanged by IR-005), its audio-only cases on `af2b65c2c0` too;
    - the web and desktop on `339b8d0ddb`.
- Prior round reviewed: None
- Deviations from the plan: none in scope. Harness defects of mine (selectors, a too-fast link for the first seek attempt, a frame-blind init script) were fixed before any result was kept.
- Evidence folder: `tickets/in-progress/file-viewer-media-642/evidence/api-e2e/`

## Routing Classification

- Task size: `Large`; architectural risk: `High`; input route: `Reviewed`; successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (new `NativeMediaRealNodeUITests.swift`, `mobile-file-viewer-media-cases.mjs`; updated `native-video-node.mjs`, `mobile-shell-probe.mjs`, `ios-simulator-smoke.sh`, the iOS README)

## Tested Builds And Environments

| Env ID | Commit | Platform | Build / Runtime | Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | as above | macOS 26 arm64, Node 22.23.1 | server `dist`, phone bundle; `native-video-node.mjs` (real node behind a logging proxy, 1.5 MB/s on file routes; latency and throttle per case) | clean env; test-owned roots |
| ENV-2 | `af2b65c2c0` | Android emulator, own AVD `api642_media` (API 35 arm64), `-port 5646 -no-window -gpu host` | app debug build | deleted after |
| ENV-3 | `af2b65c2c0`, `38f318021c` | iOS simulators, own `api642-iphone`, `api642-r2` (iPhone 17, iOS 26.1), Xcode 26.1.1 | app Debug build; XCUITest; recordings | deleted after; others' simulators untouched |
| ENV-4 | `339b8d0ddb` | as ENV-1 | the phone probe: desktop window (`nuxt dev`, Chrome) and phone (production bundle at /mobile, 390×844) | probe-owned nodes |

## Cases

| Case ID | Criteria | Surface | Env | Result | Evidence | Look For |
| --- | --- | --- | --- | --- | --- | --- |
| SRV-1 | AC-001 (server) | each reference of a Team's message on the real node: MP4, M4A, MP3, Markdown, PDF, PNG, a zero-byte MP4, a deleted MP4 | ENV-1 | Pass | `server/ac001-server.json` | 200 exact bytes, `Accept-Ranges: bytes`, `ETag`, `Cache-Control: no-store`; 206 exact for `a-b`, `a-`, `-n`; 416 `bytes */<size>`; 304; 200 whole for two ranges; 401 without a credential; deleted: 404; zero-byte: 200 empty, its `bytes=0-0` probe 416 (held) |
| AND-R1 | AC-001 (app) | Android: the Team's Messages → the MP4 reference | ENV-2 | Pass | `android/ref-mp4.png`, `stacks/android-proxy-log.json` | the native player opens and plays (REF-642 at 4.467 s, the name in the bar); requests: the page's `bytes=0-0` (206, 1 byte), the player's `bytes=0-1`, one streaming read; the phone header only |
| AND-R2 | CR-002 | Android: two Team messages with the reference open; Back; another message | ENV-2 | Pass | `android/cr002-after-back*.png` | players 1 → 1 → 1; one Back → 0; a message after Back → 0 (the viewer with Play); no reference request after the open (no refetch); the new messages are in the view |
| AND-R3 | AC-001 (app), REQ-002 | Android: the M4A reference; a Team message while it plays | ENV-2 | Pass | `android/ref-m4a.png` | the audio screen: name, controls shown, no full-screen button; the system's audio track `state:started`; still one player |
| AND-R4 | AC-001 | Android: Markdown, PDF, PNG, deleted and zero-byte references | ENV-2 | Pass (held item observed) | `android/ref-ref-642-*.png`, `ref-gone-642-mp4.png`, `ref-empty-642-mp4.png` | text, PDF, image each one whole read (200) and shown; deleted: "Reference file unavailable…"; zero-byte: "Failed to fetch reference content (416)" |
| AND-A1/A2 | AC-002 | Android: the MP3 from the chat link, cold and reopened | ENV-2 | Pass | `android/mp3-chat-*.png` | tap → audio track started 497 ms (host clock, tap included); probe + one streaming read; reopen: only the probe, 508 ms |
| AND-A3/A4 | AC-002 | Android: the M4A from Files, cold over 50 ms latency and 150 KB/s; a tap at the middle of the time bar; reopen | ENV-2 | Pass | `android/m4a-files-cold-slow.png`, `m4a-after-seek.png` | started 1,231 ms; the seek: `bytes=940303-` (206, header) 0.44 s after the tap, playing at 1:02 of 2:00; reopen: the probe + only the never-fetched gap `590148-940302` |
| AND-A5 | REQ-002 | Android: Ogg/Opus and WebM from Files | ENV-2 | Pass | `android/ogg.png`, `webm.png` | the native player (the player's 2-byte probe, Media3's ranged index reads), header only |
| AND-V | preserved | Android: 574's wide video from the chat link | ENV-2 | Pass | `android/wide-chat.png` | one player, plays (5.5 s), probe + one stream |
| AND-C | AC-002 (no credential), C-6 | Android: logcat (all buffers), app cache and databases, proxy log, stack log | ENV-2 | Pass | `scans/android-summary.txt` | credential occurrences 0; 29 file requests all header-only; the cache folder is `media-cache` |
| AND-N | REQ-002 (cache) | Android: node removal | ENV-2 | Pass | `android/node-removed.png` | `media-cache` 32,548 KB / 17 files → 76 KB / 0 |
| IOS-A | AC-002, REQ-002 | iOS: the MP3 from the chat link | ENV-3 | Pass | `ios/audio-screen-pair.png`, `m1-summary.log` | portrait; the symbol and the name while AVKit's controls are hidden; a tap shows them (0:18 / −1:42); probe +0.24 s, stream +0.29 s after the tap; 2 requests, header only |
| IOS-B | AC-002 | iOS: the MP3 reopened | ENV-3 | Pass | `ios/m1-summary.log` | only the probe |
| IOS-C | AC-002 (seek) | iOS: a fresh M4A (120 s, 1.87 MB) over 50 ms latency and 60 KB/s (above its 32 KB/s); the scrubber to the middle | ENV-3 | **Fail (F-1)** | `ios/m4-summary.log`, `r2-summary.log` | after the seek no request from the middle in 3 s; the one stream from 0 had 655–720 KB of the 933 KB needed and was stopped at Back; same on `38f318021c` |
| IOS-D | AC-001 (app) | iOS: the Team's MP4 and M4A references | ENV-3 | Pass | `ios/reference-ref-642.mp4.png`, `.m4a.png`, `m4-summary.log` | the app's player opens and plays; reads `bytes=0-0`, `bytes=0-1`, `bytes=0-` (206), header only |
| IOS-E | CR-002 | iOS: the M4A reference open; a Team message; Back; a message | ENV-3 | Pass | `ios/reference-after-back-and-a-message` (in `m4`) | one player; one Back closes it; it does not open again |
| IOS-F | AC-001 | iOS: Markdown, PDF, PNG, deleted, zero-byte references | ENV-3 | Pass (held item observed) | `ios/reference-*.png` | in the page; "Reference file unavailable"; the zero-byte one an error, never the player |
| IOS-G | REQ-002 | iOS: Ogg/Opus and WebM | ENV-3 | Pass | `ios/page-path-*.png` | the page path, not the app's player |
| IOS-H | DEC-007, N-7 | iOS (`38f318021c`): leave the player by Back, a swipe down, AVKit's Close | ENV-3 | Pass (observation O-2) | `ios/r4-summary.log`, `audio-session-log-summary.txt`, `audio-session-mode-lines.txt` | Back and Close close it; a swipe down does not (the screen is presented full screen); every open logs AVKit's `Current audio session mode: AVAudioSessionModeMoviePlayback`; no `AutoByteusMedia: the audio session …` failure line in the app's log (3 runs, 123,716 + lines); no `isBusy` |
| IOS-Z | REQ-002 (cache) | iOS: node removal | ENV-3 | Pass | `ios/r4-summary.log` | the removed node's `media-cache` entries all deleted (another node's, left by a test reset, stay) |
| IOS-V | preserved | iOS: 574's `NativeVideoRealNodeUITests` on 642's code | ENV-3 | Pass | `ios/v1-summary.log` | 8/8; `delivered 13697026 bytes in 10.0 s; real-time playback needs at least 5344386` (50 ms) |
| IOS-CR | AC-002 (no credential), C-6 | iOS: the simulator log, the app container (`media-cache`, Preferences, Documents), proxy and stack logs, results | ENV-3 | Pass | `scans/ios-summary.txt` | 0 in 2,766 files; 25 file requests header-only; the cache folder is `media-cache` |
| MSP-111 | AC-003 | desktop window, the Files tab | ENV-4 | Pass | `desktop/MSP-111-*.png`, probe JSON | 1440×900 and 1280×800 default (450 px panel): stacked, viewer 450, wrapped rows 42 characters; 700 px: split, tree 250, viewer 449; divider far right: viewer 400; far left: tree 150 |
| MSP-112 | AC-004 (viewer) | desktop window, each sample in the file viewer | ENV-4 | Pass | `desktop/MSP-112-*.png` | ≥ 2 Monaco token classes for yaml, yml, toml, sh, bash, zsh, go, rs, java, xml, ini, Dockerfile, html (its Edit Mode), vue, and py, ts, json; md opens as its preview, as before |
| MSP-113 | AC-004 (chat, DEC-008) | an agent's message with one fenced block per name, desktop and phone | ENV-4 | Pass | `desktop/MSP-113-*.png` | Prism token spans for every name on both: yaml, yml, toml, bash, sh, shell, zsh, go, rust, rs, java, xml, ini, dockerfile, docker, python, typescript, json (on `af2b65c2c0` the phone had none for `rs` and `zsh`; IR-005 adds them) |
| MSP-114 | AC-001 (desktop) | desktop window, the Team tab's references | ENV-4 | Pass | `desktop/MSP-114-*.png` | the video and audio references play from the route (not a blob); after the viewer's `bytes=0-0` probe every media request is ranged and answered 206; the text reference shows; the deleted one "Reference file unavailable…" |
| WS-1 | regression, AC-001 (phone browser: MSP-92) | whole `test:e2e:mobile-shell` on `339b8d0ddb` | ENV-4 | Pass for this ticket (7 outside) | `WS-1-whole-phone-probe/` | 110 cases, 103 Pass; MSP-89…92 (MSP-92: a reference video in a phone browser, a blob as before), MSP-108…110 and MSP-111…114 Pass; `unknownBrowserErrors: 0`; failing MSP-17, 58, 65, 82, 87 (628 FU-002) and MSP-61 (609 FU-006), as in earlier tickets, and MSP-104 (609's task-update case), which passes when run alone (`MSP-104-rerun.log`): timing in the long run |
| SI-1, SE-1 | AC-001 (server), regression | `test:integration`; `vitest run tests/e2e` (resolved paths) | ENV-1 | Pass; Pass for this ticket (2 outside) | `SI-SE/` | integration `92 passed`, `523 passed`; e2e `126 passed`, only RRB-1 and SID-2 fail (609 FU-007, a short `TMPDIR`); `message-references-every-view.e2e.test.ts` skipped (gated on a real CLI; SRV-1 covers the route on the real node) |
| U-1 | unit | web suite, Android JVM, iOS Core, server unit | — | Pass (reused) | `evidence/implementation/` | IMP-05/IMP-15 (web), IMP-06 (Android 130), IMP-08/IMP-14 (iOS Core 86/88), IMP-01 (server); the reviewer's re-runs (CRR-003…005) |

## Acceptance-Criteria Proof

| AC | Proven By | Result | Accepted / user part |
| --- | --- | --- | --- |
| AC-001 | SRV-1, AND-R1…R4, IOS-D, IOS-F, MSP-114, WS-1 (MSP-92), SI-1 | Proven | — |
| AC-002 | AND-A1…A5, AND-C, AND-N, IOS-A, IOS-B, IOS-C, IOS-G, IOS-CR, IOS-Z | **Not proven on iOS: F-1** (a seek over a slower link) | the sound and the Ring/Silent switch: physical iPhone (DEC-007) |
| AC-003 | MSP-111 | Proven | — |
| AC-004 | MSP-112, MSP-113 | Proven (DEC-008) | — |

## Findings

### F-1 — On iOS, a seek in an audio file over a slower link waits for the one sequential stream instead of a ranged read from the target

- **Where:** `autobyteus-ios/AutoByteusMobileCore/Media/AuthorizedMediaLoader.swift`.
  - A read past the cache waits for a running fetch when it is within `readAheadReach = 1 << 20` (1 MB) of it (line 150).
  - Otherwise it starts a fetch from the read.
  - 574's IR-004 set the reach for video: at 6 Mbit/s, 1 MB is about 1.3 s.
  - For audio at 256 kbit/s, 1 MB is about 31 s, and for a 1.87 MB M4A almost the whole file is "within reach".
- **Seen (IOS-C), with a fresh 120 s M4A over 50 ms latency and 60 KB/s (enough to play it, 32 KB/s):**
  - after the scrubber is moved to the middle, no request from the middle goes out in the 3 s observed;
  - the one stream from byte 0 had 655 to 720 KB of the 933 KB the middle needs, and was stopped at Back;
  - at that rate the middle's bytes arrive about 8.5 s after the seek;
  - reproduced on `af2b65c2c0` and on `38f318021c`;
  - Android, under the same link (AND-A3), reads `bytes=940303-` 0.44 s after the seek and plays at the middle.
- **Why it matters:**
  - REQ-002: audio streams "exactly as video (574 REQ-001…003)", where "a seek fetches only the part needed".
  - AC-002: "seeks with a ranged request carrying the header".
  - At AC-002's 1.5 MB/s a 2 MB audio file is read whole within about 1.3 s, so the wait is hidden. On any link slower than the reach per second it grows to the reach divided by the link's speed: about 2 s at 500 KB/s, about 8 s at 120 KB/s. Those links still play audio in real time.
- **Expected:** a seek to a point the running stream will not reach soon starts a ranged read from there, as on Android, while video keeps its read-ahead.
- **Preliminary classification:** `Local Fix` in the iOS loader. For example, judge "within reach" by the time the running fetch needs at its observed rate rather than a fixed 1 MB. The owner is per the failure-origin review.
- **Durable check:** `NativeMediaRealNodeUITests.testCAnM4AOverASlowerLinkSeeksByRange` (fails now).

## Observations (not failures)

- **O-1, the held items, observed.**
  - A zero-byte media reference: its probe answers 416 and the viewer shows "Failed to fetch reference content (416)" on both apps (AND-R4, IOS-F).
  - iOS: the app's Back bar sits under AVKit's top-left Close and AirPlay buttons when the controls show (`ios/audio-screen-pair.png`, right).
  - C-6: both apps' cache folder is `media-cache` (AND-C, IOS-CR); ship 574 and 642 together.
- **O-2, iOS: a swipe down does not close the player.** The screen is presented `.fullScreen`, which iOS gives no swipe dismissal. The comment in `NativeMediaPlayerViewController` ("Back, a swipe down, AVKit's own close") names a path that does not exist. Back and AVKit's Close each end the audio session (IOS-H).
- **O-3, iOS: AVKit's volume control reads "0 %" with a crossed speaker on the simulator.** It does so in implementation's fake-node screenshot too. In the test host the player's volume is 1.0, not muted, output volume 0.6, so this is likely a simulator display artifact. The sound itself is the physical-iPhone check (DEC-007).
- **O-4, the request shape on both apps.**
  - Android, like 574: a probe, then one unranged 200 read progressively.
  - iOS: a probe, then one ranged stream (`bytes=0-`).
  - The page adds one `bytes=0-0` probe for a reference. No other duplicate read.

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 86% | 86% | AC-001, AC-003, AC-004 proven on real surfaces; AC-002 on Android | AC-002's iOS seek over a slower link (F-1) | the fix and a rerun |
| Changed-boundary execution directness | 90% | 96% | the real route, the real viewers, both apps' players and loaders, the proxy log per case | — | — |
| Cross-boundary integration realism and mock gap | 88% | 93% | a real node with a real Team's references, a throttled link with latency; the desktop window and the phone bundle | a media message from a generating model | — |
| Environment, configuration, identity, and fixture fidelity | 88% | 90% | clean env; own devices; real pairing | no physical phone | a device |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | messages arriving while open, deleted and empty references, reopen, latency, removal, each close path, the old types' page path | — | — |
| User-surface, browser, and desktop-shell confidence | 88% | 92% | frames of every screen; rendered widths; both highlighting surfaces | the sound on a device (DEC-007) | the physical-iPhone check |
| Durable regression coverage quality and relevance | 90% | 94% | `NativeMediaRealNodeUITests` (incl. F-1's check), MSP-111…114, the stack | the Android journeys are not a durable driver | — |

- Overall post-repository confidence: 88.6%
- Overall final confidence: 92.3% (mean of the seven final scores)
- Calculation method: mean of the final category scores
- Every critical acceptance criterion directly proven, apart from user-only or accepted parts: `No` (AC-002 on iOS: F-1)
- Any final applicable category below `90%`: `Yes` (requirement proof 86%)
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-1; the sound and the Ring/Silent switch on a physical iPhone (DEC-007); no physical phones

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: emulator and simulator against a real node; browser (the desktop window and the phone bundle); server suites
- Gap or risk it addresses: every Downstream Coverage Hint and the reviewer's list (AC-001 on real surfaces, CR-002, AC-002 with latency, the iOS audio screen and session, AC-003, AC-004)
- If `Blocked`: —

## Desktop Application Validation (When Applicable)

- Approach executed: the probe's desktop window (`nuxt dev` against a probe node, with the owner credential as the desktop's main process attaches it). It covers the Files tab (MSP-111, MSP-112), a message's code blocks (MSP-113) and the Team tab's references (MSP-114).
- Effect on any already-running desktop application: `None`
- Behavior not directly proven: the packaged app's window. It runs the same web code as a production build; MSP-113's phone leg is a production bundle.

## Compatibility / Legacy Scope Check

- Compatibility introduced or tolerated: `No` (DEC-003: a clean rename; no `playVideo` path)
- Legacy retained: `No`
- Durable coverage only for compatibility: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs |
| --- | --- | --- |
| `autobyteus-ios/AutoByteusMobileUITests/NativeMediaRealNodeUITests.swift` | Added | IOS-A…H, IOS-Z (IOS-C fails on F-1) |
| `autobyteus-web/tests/e2e/mobile-file-viewer-media-cases.mjs` (registered in `mobile-shell-probe.mjs`) | Added | MSP-111…114 |
| `autobyteus-web/tests/e2e/native-video-node.mjs` | Updated: audio, a Team's references, `/team-message`, `/touch?file=`, Ogg/WebM | every AND-*, IOS-*, SRV-1 |
| `autobyteus-ios/scripts/ios-simulator-smoke.sh`, `autobyteus-ios/README.md` | Updated (skip and run notes) | — |

- Added or updated paths attached for proportional test-code review: `Yes`

## Dependencies Mocked Or Emulated

| Dependency | Method | Limitation |
| --- | --- | --- |
| Phones | Android emulator (host GPU), iOS simulator | sound, the Ring/Silent switch, real decoders |
| Network | the stack's proxy: 1.5 MB/s, with latency and slower rates per case | no loss or jitter |
| Agents | the scripted Antigravity CLI (`CALL_TOOL`, `REPLY_FILE`) | — |

## Temporary Methods And Cleanup

| Item | Cleanup | Result |
| --- | --- | --- |
| `/tmp/api642` | kept until the ticket closes | kept |
| AVD `api642_media` (port 5646) | `emu kill`; deleted | deleted |
| Simulators `api642-iphone`, `api642-r2` | `simctl delete` | deleted (others' untouched) |
| Stacks, probe nodes | `POST /stop`; the probe stops its own | stopped |
| Temporary test methods and a Core probe (`TempAudioSessionProbeTests`, `testTEMPButtons`) | removed before the commit | removed |

## Preliminary Classification (On `Fail`)

- F-1: `Local Fix`, iOS `AuthorizedMediaLoader` (its fixed 1 MB read-ahead reach). Owner per the failure-origin review.
- Outside this ticket: 628 FU-002 and 609 FU-006 (WS-1's six), MSP-104 (timing, passes alone), 609 FU-007 (SE-1's two). No new follow-up.

## Latest Authoritative Result

- Result: `Fail` (F-1)
- Criteria not proven, user-only or accepted:
  - not proven: AC-002's seek on iOS over a slower link (F-1);
  - for the physical iPhone before release (DEC-007): the sound, the Ring/Silent switch, a lock.
- Evidence decisions requested: DEC-007 (iOS audio session) and DEC-008 (AC-004's chat surface). Both were decided and implemented in the round (IR-004, IR-005).
- Preliminary classification and recommended owner: `Local Fix`; code reviewer for the failure-origin review
- Next recipient from `get_handoff_rules`: `/code_reviewer` (Fail)
- Notes:
  - **Passing:**
    - references stream on the desktop and play natively in both apps, header only;
    - CR-002 holds on both apps;
    - Android audio plays in 0.5–1.2 s, seeks by range and reopens from the cache;
    - the iOS audio screen is never blank and its session is `MoviePlayback`;
    - the layout and both highlighting surfaces pass;
    - 574's video is unchanged on both apps.
  - **Failing:** only the iOS loader's audio seek over a slower link.
