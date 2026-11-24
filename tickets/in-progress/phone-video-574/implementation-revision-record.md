# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates the implementation baseline.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, design-review-report.md round 2 (ARCH-REV-002); Solution Designer, design-spec.md SR-002 | N/A (N-1…N-4 applied) | `Initial Baseline` | SR-001, SR-002, ARCH-REV-001, ARCH-REV-002 | D-1…D-7 and NA-8 implemented; ready for code review |
| IR-002 | Code Reviewer, code-review-report.md failure-origin review (CRR-002), from API/E2E round 1 (F-1, F-2) | CR-001, CR-002 | `Local Fix` | CRR-001, CRR-002, API/E2E round 1 | A reload no longer opens the player by itself; dot-segment paths are refused on both platforms |

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

