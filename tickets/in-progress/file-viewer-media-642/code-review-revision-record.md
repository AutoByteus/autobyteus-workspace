# Code Review Revision Record

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Fail: Requirement Gap | CR-001 (new) |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2 (IR-002), Targeted Delta | Fail | Fail: Local Fix | CR-001 (resolved), CR-002 (new) |
| CRR-003 | `code-review-report.md` | Implementation Review, round 3 (IR-003), Targeted Delta | Fail | Pass | CR-002 (resolved) |
| CRR-004 | `code-review-report.md` | Implementation Review, round 4 (IR-004, SR-005), Targeted Delta | Pass | Pass | None |
| CRR-005 | `code-review-report.md` | Implementation Review, round 5 (IR-005, SR-006), Targeted Delta | Pass | Pass | None |
| CRR-006 | `code-review-report.md` | API/E2E Failure-Origin Review, round 6 (API-REV-001 F-1) | Pass | Fail: implementation Local Fix | CR-003 (new) |

## Revision Entries

### CRR-001: initial implementation review of IR-001 (Fail, Requirement Gap)

- Canonical review report updated: `tickets/in-progress/file-viewer-media-642/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review` of every changed source file at `fcc5aa5cd8` (base `5c0db3a801`), plus the reference viewers that read D-1's route.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001, Large / High)
- Relevant solution revision IDs: SR-001, SR-002
- Relevant architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Fail, 8.9 / 10. CR-001 is a Requirement Gap, owned by `/solution_designer`.
- What changed in the review result and why:
  - D-2, D-3 and D-4 and the route side of D-1 are correct. Implementation's six decisions hold.
  - I re-ran: server 43 + 10 passed; web 257 passed; Android JVM 130 passed; iOS Core 86 passed on my own simulator.
  - But UC-001's user outcome is not reached. The only client of the reference route, `CollaborationMessageReferenceViewer`, still downloads the whole file into a blob on desktop and phone. So the ticket's problem item 1 is unchanged, while AC-001 passes literally.
  - The intended viewer behavior is not stated in the requirements: stream on desktop, and native player or page on the phone.
- Supported product scenario / material-premise basis changes:
  - S-1 established (opening a reference, 615);
  - C-2 (iOS audio controls auto-hide) held as a question under REQ-002;
  - C-3…C-7 rejected (deviations hold; 574 still unreleased).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001
- Material score or classification changes: N/A (initial)
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty:
  - C-2;
  - C-6 (ship 574 and 642 together);
  - the cosmetic `video-loader` queue label.

### CRR-002: targeted delta review of IR-002 (Fail, Local Fix)

- Canonical review report updated: `tickets/in-progress/file-viewer-media-642/code-review-report.md` ("Round 2 Delta Review")
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review` of `4313640f6e..26ebb05729` (`dc350be435` web, `fff1b0af0c` iOS)
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-002): SR-003 (CR-001, C-2) and SR-004 (AR-002)
- Relevant solution revision IDs: SR-003, SR-004
- Relevant architecture-review revision IDs: ARCH-REV-003, ARCH-REV-004
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-001)
- Current authoritative result: Fail, 9.1 / 10. CR-002 is a `Local Fix`.
- What changed in the review result and why:
  - The reference viewer now hands media to the players' own paths, the file name is an explicit input, and the iOS audio screen is never blank.
  - But the viewer's refetch watch fires on any new `reference` object with equal values. The phone re-projects references on every message update, so a refetch remounts the player, which opens the native player again by itself (Android stacks a second one).
  - This was confirmed with a throwaway spec (fetches 1 → 2, mounts 2 → 3), since deleted.
  - My web re-run: 397 tests passed.
- Supported product scenario / material-premise basis changes: S-1 now includes the phone app's native path for references. Held: the 416 for a zero-byte media reference, and the iOS Back bar over AVKit's buttons.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (CRR-001) | Resolved | SR-003, SR-004, IR-002 `dc350be435` | The viewer probes and passes `contentUrl`; the players stream (desktop), go native (app) or download (browser); IMP-11's 8 new cases are red on IR-001; I re-ran green |
| C-2 (held) | Held (CRR-001) | Resolved | SR-003, IR-002 `fff1b0af0c` | `IMP-12-audio-playing.png`: symbol and name, never blank |

- New or remaining finding IDs: CR-002
- Material score or classification changes: data-flow spine 8.0 → 9.3; runtime correctness 8.0 → 8.5 (CR-002).
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty:
  - C-6: ship 574 and 642 together;
  - the zero-byte 416 (held);
  - the iOS Back bar over AVKit's buttons.

### CRR-003: targeted delta review of IR-003 (Pass)

- Canonical review report updated: `tickets/in-progress/file-viewer-media-642/code-review-report.md` ("Round 3 Delta Verification")
- Review entry point and round: Implementation Review, round 3
- Review scope: `Targeted Delta Review` of `292ea71db5..af2b65c2c0` (`36881a6734`: the viewer's watch and its spec)
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-003); CR-002
- Relevant solution revision IDs: SR-003, SR-004
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-002)
- Current authoritative result: Pass, 9.3 / 10
- What changed in the review result and why: the watch is value-compared, as CRR-002 asked. The spec is red before and green after (IMP-13). My re-run: 308 tests passed.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-002 | Open (CRR-002) | Resolved | IR-003 `36881a6734` | The new spec case: an equal object makes no fetch or remount; `updatedAt` and `refreshSignal` reload. Red on `26ebb05729` |
| CR-001 | Resolved (CRR-002) | Resolved | — | Unaffected |

- New or remaining finding IDs: None
- Material score or classification changes: runtime correctness 8.5 → 9.3.
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty:
  - C-6: ship 574 and 642 in the same release;
  - the zero-byte 416;
  - the iOS Back bar over AVKit's buttons;
  - the cosmetic `video-loader` queue label.

### CRR-004: targeted delta review of IR-004 (SR-005, the iOS audio session): Pass

- Canonical review report updated: `tickets/in-progress/file-viewer-media-642/code-review-report.md` ("Round 4 Delta Verification")
- Review entry point and round: Implementation Review, round 4
- Review scope: `Targeted Delta Review` of `190cd51bc3..73c3330c49` (`38f318021c`: `MediaAudioSession.swift`, `NativeMediaPlayer.swift`, the tests, and `docs/ios_mobile_access.md`)
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-004); SR-005 / DEC-007; ARCH-REV-005 N-7, N-8
- Relevant solution revision IDs: SR-005
- Relevant architecture-review revision IDs: ARCH-REV-005
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-003)
- Current authoritative result: Pass, 9.3 / 10
- What changed in the review result and why:
  - The session is scoped to the player's lifetime: `begin` on present; `end` in the one teardown that every close path runs, but not during AVKit's own full screen (N-7).
  - The prior category is restored (N-8), failures are logged by code only, and no background mode is added.
  - My re-run: Core 88 passed on my own simulator.
- Supported product scenario / material-premise basis changes: none. Held: an `isBusy` deactivation (logged), and the background case (no background mode).

#### Prior Finding Resolution

None open. CR-001 and CR-002 stay resolved.

- New or remaining finding IDs: None
- Material score or classification changes: none
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty:
  - the physical-iPhone Ring/Silent and sound check before release;
  - C-6 (ship 574 and 642 together);
  - the zero-byte 416;
  - the iOS Back bar over AVKit's buttons.

### CRR-005: targeted delta review of IR-005 (SR-006, chat highlighting as code blocks): Pass

- Canonical review report updated: `tickets/in-progress/file-viewer-media-642/code-review-report.md` ("Round 5 Delta Verification")
- Review entry point and round: Implementation Review, round 5
- Review scope: `Targeted Delta Review` of `e4ce2f000b..0a605d1293`. The source change `339b8d0ddb`:
  - removes `FileDisplay.vue`, `segmentHighlighter.ts`, `vueCodeHighlight.ts` and `highlightVue`;
  - narrows the table to Monaco;
  - adds the Prism aliases;
  - adjusts the types, the specs and the audit list.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-005); SR-006 / DEC-008; ARCH-REV-006 N-9
- Relevant solution revision IDs: SR-006
- Relevant architecture-review revision IDs: ARCH-REV-006
- Relevant implementation revision IDs: IR-005
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-004)
- Current authoritative result: Pass, 9.3 / 10
- What changed in the review result and why:
  - The dead `FileDisplay` chain is removed, and so are the extra pieces that only it kept alive. That is justified by Principle 7, and no reference remains.
  - The fence aliases sit with the grammar owner, and N-9 is done.
  - My re-run: 1325 tests passed.
- Supported product scenario / material-premise basis changes: AC-004's chat leg is now message code blocks (DEC-008).

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: None
- Material score or classification changes: cleanup completeness 9.4 → 9.5
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty:
  - the physical-iPhone check;
  - C-6 (ship 574 and 642 together);
  - the zero-byte 416;
  - the iOS Back bar over AVKit's buttons.

### CRR-006: failure-origin review of API-REV-001 F-1 (iOS audio seek): implementation Local Fix

- Canonical review report updated: `tickets/in-progress/file-viewer-media-642/code-review-report.md` ("Round 6 Failure-Origin Finding")
- Review entry point and round: API/E2E Failure-Origin Review, round 6
- Review scope: `N/A` (failure-origin). Product code is unchanged. Re-read: `AuthorizedMediaLoader.advance` (`readAheadReach`) and `NativeMediaPlayer.viewDidDisappear`.
- Triggering role, report path, and finding or scenario IDs: API/E2E, `api-e2e-execution-coverage-report.md` (commit `8dc9abb9f6`): F-1 (IOS-C; Android AND-A3 is the control)
- Relevant solution revision IDs: SR-002…SR-006
- Relevant architecture-review revision IDs: ARCH-REV-006
- Relevant implementation revision IDs: IR-001…IR-005 (the loader is 574's IR-004)
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-005)
- Current authoritative result: Fail. The origin is implementation: CR-003, `Local Fix`.
- What changed in the review result and why:
  - The loader's byte reach (1 MB), sized for 6 Mbit/s video, covers about 31 s of 256 kbit/s audio. An iOS audio seek therefore waits for the sequential stream instead of making a ranged read.
  - AC-002's seek-by-range fails, and the seek waits for the reach divided by the link's rate.
  - Recommended: a time-based reach from the fetch's observed rate, capped at 1 MB, keeping 574's video behavior.
  - Cosmetic: the "swipe down" comment.
- **Review gap I own:** CRR-001 passed the loader's reuse for audio without re-judging its byte-tuned constant against audio bitrates.
- Supported product scenario / material-premise basis changes: S-2 now includes seeking over slower links.

#### Prior Finding Resolution

None open. CR-001 and CR-002 stay resolved (API-REV-001 confirms both).

- New or remaining finding IDs: CR-003
- Material score or classification changes: runtime correctness is below 9.2 until CR-003 is fixed.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty:
  - the physical-iPhone check (sound, the Ring/Silent switch, a lock);
  - C-6;
  - the zero-byte 416;
  - the iOS Back bar.
  - The test-code review of `8dc9abb9f6` follows a passing round.
