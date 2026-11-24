# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates the implementation baseline.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, design-review-report.md round 2 (ARCH-REV-002); Solution Designer, design-spec.md SR-002 | N/A (N-1…N-4 applied) | `Initial Baseline` | SR-001, SR-002, ARCH-REV-001, ARCH-REV-002 | D-1…D-7 and NA-8 implemented; ready for code review |

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
