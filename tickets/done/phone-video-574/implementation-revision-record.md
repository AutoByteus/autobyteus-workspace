# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates the implementation baseline.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, design-review-report.md round 2 (ARCH-REV-002); Solution Designer, design-spec.md SR-002 | N/A (N-1…N-4 applied) | `Initial Baseline` | SR-001, SR-002, ARCH-REV-001, ARCH-REV-002 | D-1…D-7 and NA-8 implemented; ready for code review |
| IR-002 | Code Reviewer, code-review-report.md failure-origin review (CRR-002), from API/E2E round 1 (F-1, F-2) | CR-001, CR-002 | `Local Fix` | CRR-001, CRR-002, API/E2E round 1 | A reload no longer opens the player by itself; dot-segment paths are refused on both platforms |
| IR-003 | Code Reviewer, code-review-report.md failure-origin review (CRR-005), from API/E2E round 3 (F-3, formerly O-4) | CR-003 | `Local Fix` | CRR-003, CRR-005, API/E2E round 3 | The iOS loader declares the whole file available on demand; a scrub plays on |
| IR-004 | Code Reviewer, code-review-report.md failure-origin review (CRR-007), from API/E2E round 4 (F-4) | CR-004 | `Local Fix` | CRR-006, CRR-007, API/E2E round 4 | The iOS loader answers small reads from one streaming fetch: real time over a 50 ms link, and the scrub still plays on |

## Revision Entries

### IR-001 — Native video players stream node videos by range, cache them by version, and go full screen

- Triggering role, report path, and round: Architecture Reviewer, `tickets/in-progress/phone-video-574/design-review-report.md`, round 2 (ARCH-REV-002, Pass); Solution Designer, `design-spec.md` at SR-002.
- Triggering finding IDs: N/A (baseline). Reviewer notes applied: N-1 (redirects), N-2 (multi-range), N-3 (the iOS range cache and its tests), N-4 (hashed cache keys).
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: implemented and checked locally; `Large` / `High`, routed to code review.
- Related solution revision IDs: SR-001, SR-002.
- Related architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002.
- Related code-review, API/E2E and delivery revision IDs: N/A.
- Why this baseline is recorded: the ticket's first implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001…BEH-004; REQ-001…REQ-005; AC-001…AC-006.
- Implementation delta (commits on `codex/phone-video-574`, base `4b73fccae2`):
  - `66534ef01c` D-1: `sendUserFile` serves a `file` by one byte range with a strong ETag, `no-cache` and 304/416/If-Range; a `stream` stays whole. Every file route passes the file it resolved; `NodeFileReader` returns the file's version instead of a stream.
  - `2c5673f890` D-2: `useNativeVideoPlayback` hands a protected node video to the app's player when the app's `hello` says `videoPlayer`; the file viewer and the chat's media message use it.
  - `a526d58a7e` D-3, D-5, D-6, D-7 on Android: the bridge's `playVideo`, the in-memory handoff, `VideoPlayerActivity` (Media3), `NodeVideoHttp` and `NodeVideoDataSource`, `VideoCache`, in-page media full screen, per-node cache deletion.
  - `648073efd9` D-4, D-5, D-7 on iOS: the bridge's `playVideo` (`NodeVideoPlayRequest`), `NativeVideoPlayerViewController`, `AuthorizedMediaLoader`, `NodeVideoHTTP`, `MediaRangeCache`, per-node cache deletion; the fake node's `--video`.
  - `8e666f6c78`: NA-8 records the phone's credential rule and the per-playback handoff.
- Changed files or areas: see the handoff's Key Files.
- Local validation and result: IMP-01…IMP-10 in the handoff's Checks Run table.
- Next recipient or routing: `/code_reviewer` (Large/High).
- Remaining limitations or risks: see the handoff's Known Risks.

### IR-002 — A reload never opens the player by itself; a dot-segment path is not a node file route

- Triggering role, report path, and round: Code Reviewer, `tickets/in-progress/phone-video-574/code-review-report.md`, CRR-002 (failure-origin review of API/E2E round 1, `api-e2e-execution-coverage-report.md` F-1 and F-2).
- Triggering finding IDs: CR-001 (API/E2E F-1), CR-002 (API/E2E F-2).
- Classification: `Local Fix`.
- Prior authoritative result: IR-001, CRR-001 Pass; API/E2E round 1 Fail (F-1, F-2); CRR-002 Fail with the origin in implementation.
- Current authoritative result: both fixed and checked; `Large` / `High`, back to code review for the delta, then an API/E2E rerun (AND-8, AND-9, IOS-9, IOS-11).
- Related solution and architecture-review revision IDs: N/A (no requirement or design change).
- Related code-review revision IDs: CRR-001, CRR-002.
- Related API/E2E revision IDs: API/E2E round 1.
- Related delivery revision IDs: N/A.
- Why this implementation revision is recorded:
  - **CR-001:** `VideoPlayer.vue` treated a `contentRevision` change as a reopen. A live refresh after the file changed therefore opened the player by itself: a second one on Android, and after Back on both apps.
  - **CR-002:** both apps' route check let a path with dot segments through (`/rest/../graphql`), so the phone's credential could reach a non-file route.
- Approved behavior or requirement IDs affected: BEH-001 (UC-001), REQ-003 / AC-003.
- Implementation delta:
  - **`fb2357dc09` (web):** the viewer opens the native player only when it reaches `native` for a URL (shown, another URL, or `pending` → `native`), never on `contentRevision`. Play still opens it. New spec case.
  - **`6479a28f4b` (apps):** Android `NodeVideoHttp.isNodeFileUrl` and iOS `NodeVideoURL.isNodeFileURL` refuse a path whose percent-decoded segments include `.` or `..` or a separator, then check `/rest/`. They are each platform's one rule for the bridge, the probe and every read. New unit cases on both platforms: the reviewer's URLs refused before sending, and query dots allowed.
- Changed files or areas:
  - `autobyteus-web/components/fileExplorer/viewers/VideoPlayer.vue`, its native spec;
  - `autobyteus-android/.../video/NodeVideoHttp.kt`, `NodeVideoHttpTest.kt`;
  - `autobyteus-ios/AutoByteusMobileCore/Video/NodeVideoURL.swift`, `NodeVideoHTTPTests.swift`.
- Local validation and result: IMP-11. Each new case is red on the pre-fix code and green after. The web suite (806 files), web typecheck and guards pass. Android: 129 JVM tests, the build, androidTest compile and lint pass. iOS: all 75 Core tests pass, the AVPlayer loader test included.
- Next recipient or routing: `/code_reviewer` (Large/High), the targeted delta review.
- Remaining limitations or risks:
  - As the reviewer noted, re-tapping the same open file now shows the viewer with Play: the store cannot tell a live refresh from a reopen.
  - On iOS an invalid escape such as `%zz` becomes the literal `%25zz` (`URL(string:)`), a plain path under `/rest/`, so it is not refused there; Android rejects it as unparsable.

### IR-003 — The iOS loader declares the whole file available on demand, so a scrub plays on

- Triggering role, report path, and round: Code Reviewer, `tickets/in-progress/phone-video-574/code-review-report.md`, "Round 4 Failure-Origin Finding" (CRR-005), from API/E2E round 3 (`api-e2e-execution-coverage-report.md` F-3, formerly O-4; `evidence/api-e2e/R3-O4/`).
- Triggering finding IDs: CR-003 (API/E2E F-3).
- Classification: `Local Fix`.
- Prior authoritative result: IR-002, CRR-003 Pass; API/E2E round 3 Fail (F-3); CRR-005 Fail with the origin in implementation.
- Current authoritative result: fixed and checked; `Large` / `High`, back to code review for the delta, then an API/E2E rerun.
- Related solution and architecture-review revision IDs: N/A (no requirement or design change).
- Related code-review revision IDs: CRR-003, CRR-005.
- Related API/E2E revision IDs: API/E2E round 3.
- Related delivery revision IDs: DR-001 (base integrated; evidence requested for the iOS scrubber).
- Why this implementation revision is recorded: dragging the iOS player's scrubber froze the picture while the clock ran on (AC-001's seek). The loader's content information did not declare what it does: serve any range at any time.
- Approved behavior or requirement IDs affected: REQ-001 / AC-001 (iOS).
- Implementation delta (`c3ff688979`): `AutoByteusMobileCore/Video/AuthorizedMediaLoader.swift` sets `information.isEntireLengthAvailableOnDemand = true` beside `isByteRangeAccessSupported`, with its reason. The API exists from iOS 16 and the app targets 17, so there is no availability check. The optional bounded serving of cached bytes was not done; the reviewer did not require it.
- Changed files or areas: that one file.
- Local validation and result: IMP-12.
  - `NativeVideoRealNodeUITests.testAWideVideoFromTheChatLink` against `native-video-node.mjs` on my own simulator passes with the fix: on a first open (fresh install) and twice cached.
  - It fails at its `pictureMoves` check without the fix (cached).
  - The cached reopen fetched 0 bytes of the first run's.
  - The Core suite passes 75 of 75, the AVPlayer reopen fetching 0 cached bytes.
- Next recipient or routing: `/code_reviewer` (Large/High), the targeted delta review.
- Remaining limitations or risks: a cached to-end request is still answered in one synchronous loop (the reviewer's optional note), so a cancel cannot arrive within it; held for evidence.

### IR-004 — The iOS loader answers AVFoundation's small reads from a read-ahead

- Triggering role, report path, and round: Code Reviewer, `tickets/in-progress/phone-video-574/code-review-report.md`, "Round 6 Failure-Origin Finding" (CRR-007), from API/E2E round 4 (`api-e2e-execution-coverage-report.md` F-4; `evidence/api-e2e/R4/`).
- Triggering finding IDs: CR-004 (API/E2E F-4).
- Classification: `Local Fix`, direction (a) of CRR-007: keep the declaration, serve small reads from a read-ahead. The stop rule was not reached; outcomes 1–6 hold.
- Prior authoritative result: IR-003, CRR-006 Pass; API/E2E round 4 Fail (F-4); CRR-007 Fail with the origin in implementation.
- Current authoritative result: fixed and checked; `Large` / `High`, back to code review for the delta, then API/E2E.
- Related solution and architecture-review revision IDs: N/A (no requirement or design change; the loader D-4 names: "Range, streaming", "range cache in the loader").
- Related code-review revision IDs: CRR-006, CRR-007.
- Related API/E2E revision IDs: API/E2E round 4.
- Related delivery revision IDs: N/A.
- Why this implementation revision is recorded: with IR-003's declaration AVFoundation reads about 23 KB at a time, one read after another, and the loader fetched each uncached read as its own ranged request. Over a 20–50 ms link that paid a round trip per read and played at 0.4–0.7× real time.
- Approved behavior or requirement IDs affected: REQ-001 / AC-001 (iOS: start, seek, real time); REQ-002 / AC-002 (reopen from the cache).
- Implementation delta (`d92abaeaa2`), all in `AutoByteusMobileCore/Video/AuthorizedMediaLoader.swift`:
  - A read is served from the cache first, at most 1 MB per step; the queue is free between steps, so a cancel takes effect there (the CRR-005 held note).
  - Past the cache, a read waits for a running fetch that will reach it within 1 MB (`readAheadReach`, about 0.7 s of AC-001's link). Otherwise it starts one fetch from its first missing byte to the next byte the cache holds or a running fetch starts at, or to the end.
  - Arriving bytes go to the cache, whether or not a read still waits for them, and to every read they reach.
  - A cancelled read leaves its fetch running. Fetches no read waits for stop when another fetch starts (a seek or a scrub moved the reader).
  - The `If-Range` version check, the 206 and `Content-Range` check, the route rule and the header-only credential are unchanged.
  - A `MediaRead` seam (AVFoundation's data request behind it) lets the unit tests drive the serving.
  - The "fetched twice" Known Risk goes: a fetch now stops where a running fetch or the cache begins.
- Tests:
  - New `AuthorizedMediaLoaderReadAheadTests` (7 cases): a burst of 40 small sequential reads makes one request; a far read starts its own fetch and the idle one stops; cancelling one read keeps the fetch another waits for; a cancelled read's bytes are cached; a gap between cached bytes is fetched alone; cached bytes go in bounded steps and a cancel between steps stops the rest; a changed file fails the read.
  - `AuthorizedMediaLoaderTests` waits for decoded frames, not the clock. With on-demand reads, a player with no video output reads no frame and only its clock runs; that is why round 4 saw it "past 30.3 s" with nothing fetched. It now also checks the request count: at most 6, against 136 on the IR-003 loader. README: the test video must be longer than 31 s.
- Changed files or areas: the loader, its two test files, `autobyteus-ios/README.md`.
- Local validation and result: IMP-13. On my own simulator and two stacks:
  1. The scrub passes 7 times: first open and cached at 0 and 50 ms, at 1 MB/s with 50 ms, and at 0.5 MB/s with 50 ms.
  2. `testBDeliversInRealTimeOverASlowerLink` at 50 ms delivers 14.0 MB in 10 s (5.3 MB needed), twice. The IR-003 loader on the same stack delivers 2.0 MB (red).
  3. The AVPlayer test with a 60 s video fetches the middle: 3 requests, middle frames 0.6 s after the seek. On IR-003 it fails, at line 96 with the new test and with an item error (-11800) with the old one.
  4. A reopen fetches 0 cached bytes: in the unit test and twice on the real node, only the probe.
  5. The credential goes only in the header, on every video request; none has it in its URL.
  6. The 7 new unit cases pass; the Core suite passes 82 of 82; the rest of the real-node class passes.
- Next recipient or routing: `/code_reviewer` (Large/High), the targeted delta review.
- Remaining limitations or risks:
  - A fetch runs on to its gap's end while the player is open, filling the cache, as the single stream did before IR-003; it stops when a far read needs a fetch, or when the player closes.
  - Held, measured partly: at 0.5 MB/s (below the video's ~0.76 MB/s) the scrub's reads started their own fetches and the picture moved. Whether the picture keeps up with the clock on such a link was not measured.

