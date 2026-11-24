# Code Review Revision Record

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Fail: Requirement Gap | CR-001 (new) |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2 (IR-002), Targeted Delta | Fail | Fail: Local Fix | CR-001 (resolved), CR-002 (new) |
| CRR-003 | `code-review-report.md` | Implementation Review, round 3 (IR-003), Targeted Delta | Fail | Pass | CR-002 (resolved) |

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
