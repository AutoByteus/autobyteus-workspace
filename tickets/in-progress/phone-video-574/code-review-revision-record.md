# Code Review Revision Record

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Pass | None |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review, round 2 (API-REV-001 F-1, F-2) | Pass | Fail: implementation Local Fix | CR-001, CR-002 (new) |
| CRR-003 | `code-review-report.md` | Implementation Review, round 3 (IR-002), Targeted Delta | Fail | Pass | CR-001, CR-002 (resolved) |
| CRR-004 | `api-e2e-test-review-report.md` | API/E2E test-code review (API-REV-002 Pass; test code `cf3d344ff4`) | Pass (CRR-003) | Pass | None |
| CRR-005 | `code-review-report.md` | API/E2E Failure-Origin Review, round 4 (API-REV-003 F-3) | Pass (CRR-003/004) | Fail: implementation Local Fix | CR-003 (new) |
| CRR-006 | `code-review-report.md` | Implementation Review, round 5 (IR-003), Targeted Delta | Fail | Pass | CR-003 (resolved) |
| CRR-007 | `code-review-report.md` | API/E2E Failure-Origin Review, round 6 (API-REV-004 F-4) | Pass (CRR-006) | Fail: implementation Local Fix (stop rule to the Solution Designer) | CR-004 (new); CR-003 reopened with it |

## Revision Entries

### CRR-001: initial implementation review of IR-001 (Pass)

- Canonical review report updated: `tickets/in-progress/phone-video-574/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review` (every changed source file at `b0a2eeacc0`, base `4b73fccae2`)
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001, Large / High)
- Relevant solution revision IDs: SR-001, SR-002
- Relevant architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Pass, 9.4 / 10, every category ≥ 9.3
- What changed in the review result and why: the initial result.
  - D-1…D-7 and N-1…N-4 are implemented as designed.
  - The credential path holds on both platforms:
    - checked against the page's origin and `/rest/` at the bridge, and again before every send;
    - sent only as a header, with redirects refused;
    - redacted when printed;
    - never in an Intent, a URL or a cache.
  - The two placement deviations (iOS Core; Android's own data source) have reasons that hold.
  - I re-ran the server range, route and reader tests (37 passed) and the web owner, viewer and bridge specs (27 passed).
- Supported product scenario / material-premise basis changes: S-1…S-6 established. Candidates:
  - C-1, C-3 and C-4 held for evidence;
  - C-2, C-5, C-6 and C-7 rejected;
  - C-8 and C-9 are deviations whose reasons hold.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None
- Material score or classification changes: N/A
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty:
  - R-1: the iOS Back/title bar stays over the landscape video. API/E2E should capture a landscape frame for the user.
  - R-2: an Android config change outside `configChanges` leads to "could not play".
  - R-3: the iOS in-app start time against AC-001's 2 s.

### CRR-002: failure-origin review of API-REV-001 (F-1, F-2): implementation Local Fix

- Canonical review report updated: `tickets/in-progress/phone-video-574/code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 2
- Review scope: `N/A` (failure-origin). The code head is unchanged (`b0a2eeacc0`). Re-read: `VideoPlayer.vue` and the `contentRevision` bump sites (`fileExplorerContentActions.ts:139,160`, `fileExplorerTreeActions.ts:94`); `NodeVideoHttp.isNodeFileUrl` and `NodeVideoURL.isNodeFileURL`.
- Triggering role, report path, and finding or scenario IDs: API/E2E, `api-e2e-execution-coverage-report.md` (commit `cf3d344ff4`). F-1 (AND-9, IOS-11); F-2 (AND-8, IOS-9).
- Relevant solution revision IDs: SR-002 (DEC-006 at `e9918a41a5` does not bear on either finding)
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-001)
- Current authoritative result: Fail. The origin is implementation: CR-001 and CR-002, both `Local Fix`.
- What changed in the review result and why: both API/E2E findings are confirmed in the code.
  - **F-1 → CR-001.** Live refresh bumps `contentRevision` through `_reloadOpenFile`, the same counter an explicit re-open bumps. `VideoPlayer.vue`'s watcher therefore re-opens the player on a rewrite.
  - **F-2 → CR-002.** Both route checks test a `/rest/` prefix without refusing dot segments. That breaks AC-003's explicit "another route: refused, and no request is sent".
- **Review gaps I own:**
  - Round 1 trusted `FileViewer`'s comment about `contentRevision` without tracing its callers (C-10 was missed).
  - Round 1 rejected C-7 on impact alone (same origin; the page already holds the credential) when AC-003 states the route refusal as a contract. Lesson: an explicit AC refusal is a contract, so judge it against the AC and not by escalation impact. And trace every writer of a counter that triggers an action.
- Supported product scenario / material-premise basis changes: C-7 moves from Reject to Promote; C-10 is new and promoted. Residual risks R-1 and R-2 are confirmed by API/E2E, and R-3 is met in the app. Both stay non-blocking.

#### Prior Finding Resolution

None (CRR-001 had no findings).

- New or remaining finding IDs: CR-001, CR-002
- Material score or classification changes: none recorded (a failure-origin round has no scorecard). Runtime correctness is below 9.2 until both are fixed.
- Recommended recipient: `/implementation_engineer`. Then a targeted delta code review, then an API/E2E rerun of AND-8, AND-9, IOS-9 and IOS-11 (and `testDA…`).
- Remaining risks or uncertainty:
  - O-4 (iOS simulator scrubber drag) is unattributed; API/E2E recommends a check on a physical iPhone.
  - The test code in `cf3d344ff4` is reviewed after a passing API/E2E round, not here.

### CRR-003: targeted delta review of IR-002 (Pass)

- Canonical review report updated: `tickets/in-progress/phone-video-574/code-review-report.md`
- Review entry point and round: Implementation Review, round 3
- Review scope: `Targeted Delta Review` of `b0a2eeacc0..64a99bbcd2`: fix commits `fb2357dc09` (CR-001) and `6479a28f4b` (CR-002). No other source changed.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-002); CR-001, CR-002
- Relevant solution revision IDs: SR-002
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-002)
- Current authoritative result: Pass, 9.4 / 10
- What changed in the review result and why: both fixes do what CRR-002 asked, in the owners it named, and each new test fails on the pre-fix code (IMP-11). I re-ran the web spec (5) and the Android `NodeVideoHttpTest` (8) and `ShellBridgeMessagesTest` (17); for iOS I relied on IMP-11 (75 Core tests).
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (CRR-002) | Resolved | IR-002, `fb2357dc09` | The watcher is on `[playbackMode, url]`. The spec "a reload of the open video posts no playVideo; Play still does" is red before the fix and green after; re-run green |
| CR-002 | Open (CRR-002) | Resolved | IR-002, `6479a28f4b` | Dot and separator segments are refused, raw or encoded, in the one rule per platform. JVM and XCTest cases are red before and green after; Android re-run green |

- New or remaining finding IDs: None
- Material score or classification changes: runtime correctness back to 9.3; no classification.
- Recommended recipient: `/api_e2e_engineer`, to rerun AND-8, AND-9, IOS-9 and IOS-11.
- Remaining risks or uncertainty: R-1 and R-2 (confirmed, non-blocking) and O-4 (to check on a physical iPhone) are unchanged.

### CRR-004: proportional review of the API/E2E test code (Pass)

- Canonical review report updated: `tickets/in-progress/phone-video-574/api-e2e-test-review-report.md` (new)
- Review entry point and round: API/E2E test-code review, round 1
- Review scope: `N/A` (test review). Reviewed: `native-video-node.mjs`, `NativeVideoRealNodeUITests.swift`, `ios-simulator-smoke.sh`, the iOS README (commit `cf3d344ff4`; round 2 `dbd8a23c8f` changed no test code).
- Triggering role, report path, and finding or scenario IDs: API/E2E, `api-e2e-execution-coverage-report.md` (API-REV-002 Pass, 92.4%)
- Relevant solution revision IDs: SR-002
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-003, implementation)
- Current authoritative result: Pass (test code)
- What changed in the review result and why:
  - The test code is coherent and enters through real triggers.
  - The F-1 regression assertion (`testDA…`) is real: it fails on IR-001 and passes on IR-002.
  - No credential or pairing code is in the committed evidence.
  - Non-blocking note T-1: two docstrings claim more than the tests assert (skip position, cache deletion).
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

None (first test review).

- New or remaining finding IDs: None
- Material score or classification changes: N/A
- Recommended recipient: `/delivery_engineer`
- Remaining risks or uncertainty: R-1 and R-2 are confirmed and non-blocking. O-4 needs a scrubber check on a physical iPhone. The Android journeys have no durable driver (the coverage report says so).

### CRR-005: failure-origin review of API-REV-003 (F-3): implementation Local Fix in the iOS loader

- Canonical review report updated: `tickets/in-progress/phone-video-574/code-review-report.md` ("Round 4 Failure-Origin Finding")
- Review entry point and round: API/E2E Failure-Origin Review, round 4
- Review scope: `N/A` (failure-origin). Product code is unchanged since `64a99bbcd2`. Re-read: `AuthorizedMediaLoader.swift`, `NativeVideoPlayer.start` and the `R3-O4` evidence.
- Triggering role, report path, and finding or scenario IDs: API/E2E, `api-e2e-execution-coverage-report.md` (commit `ef3107bb3e`): F-3 (O-4 attributed, at delivery DR-001's request).
- Relevant solution revision IDs: SR-002
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-003
- Relevant delivery revision IDs: DR-001
- Prior authoritative result: Pass (CRR-003; test review CRR-004)
- Current authoritative result: Fail. The origin is implementation: CR-003, `Local Fix`.
- What changed in the review result and why:
  - API/E2E's controls isolate the freeze to the loader path, and rule out the data and starvation.
  - `isEntireLengthAvailableOnDemand = true` makes the drag play on, and it is the correct declaration for a loader that serves any range.
  - Held, not required: the cache is pushed to AVFoundation in one synchronous loop.
  - Test-code note T-2: `pictureMoves` could false-pass while the controls are visible.
- **Review gap I own:** in round 1, I did not check the loader's content-information declaration against its actual capability.
- Supported product scenario / material-premise basis changes: S-1 (seek) now includes the platform's scrubber drag. O-4 is closed into CR-003.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved (CRR-003) | Resolved | — | Unaffected |
| CR-002 | Resolved (CRR-003) | Resolved | — | Unaffected |

- New or remaining finding IDs: CR-003
- Material score or classification changes: runtime correctness is below 9.2 until CR-003 is fixed.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty:
  - Simulator only. The fix should also settle the physical-device question, and a physical iPhone check stays recommended.
  - R-1 and R-2 are unchanged.

### CRR-006: targeted delta review of IR-003 (Pass)

- Canonical review report updated: `tickets/in-progress/phone-video-574/code-review-report.md`
- Review entry point and round: Implementation Review, round 5
- Review scope: `Targeted Delta Review` of `fa72e74e90..03c4495955`. The only source change is `c3ff688979` (`AuthorizedMediaLoader.swift`, +3).
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-003); CR-003
- Relevant solution revision IDs: SR-002
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-003
- Relevant delivery revision IDs: DR-001
- Prior authoritative result: Fail (CRR-005)
- Current authoritative result: Pass, 9.4 / 10
- What changed in the review result and why: the fix is the declaration CRR-005 named. IMP-12 shows the durable scrub check red without it and green with it, on a first open and cached; Core is 75/75.
- Supported product scenario / material-premise basis changes: none. Held for API/E2E to observe: the many small range requests under the on-demand mode.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-003 | Open (CRR-005) | Resolved | IR-003, `c3ff688979` | IMP-12 runs 1–4 (red with the fix stashed, green with it); Core 75/75 |
| CR-001, CR-002 | Resolved | Resolved | — | Unaffected (web and route rule unchanged) |

- New or remaining finding IDs: None
- Material score or classification changes: runtime correctness back to 9.3.
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty:
  - simulator only, so a physical iPhone check stays recommended;
  - the bounded cache serving is held;
  - T-2 (`pictureMoves` false-pass risk) is for the next test review;
  - R-1 and R-2 are unchanged.

### CRR-007: failure-origin review of API-REV-004 (F-4): the iOS loader is a Local Fix

- Canonical review report updated: `tickets/in-progress/phone-video-574/code-review-report.md` ("Round 6 Failure-Origin Finding")
- Review entry point and round: API/E2E Failure-Origin Review, round 6
- Review scope: `N/A` (failure-origin). Product code is unchanged since `c3ff688979`. Re-read: `AuthorizedMediaLoader.swift` and `evidence/api-e2e/R4/`.
- Triggering role, report path, and finding or scenario IDs: API/E2E, `api-e2e-execution-coverage-report.md` (commit `bb80c1cc9e`): F-4 (R4-IOS-LAT, R4-IOS-DL, R4-IOS-U)
- Relevant solution revision IDs: SR-002
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-003, API-REV-004
- Relevant delivery revision IDs: DR-001
- Prior authoritative result: Pass (CRR-006)
- Current authoritative result: Fail. The origin is implementation: CR-004, `Local Fix`.
- What changed in the review result and why:
  - The on-demand declaration lets AVFoundation make small serial reads and run its clock without waiting. The loader's one-request-per-gap serving pays a round trip per 23 KB, so playback runs at 0.4–0.7× at 20–50 ms.
  - The fix must keep the scrub working (CR-003) and add real-time delivery over a round trip.
  - Recommended: a read-ahead under the declaration. The alternative is finding the progressive-mode scrub stall.
  - Stop rule: if neither meets the outcomes, it goes to `/solution_designer` as a Design Impact.
- **Review gaps I own:**
  - CRR-005 called the declaration "correct and not a workaround" without checking what AVFoundation assumes when it is set.
  - CRR-006 passed IR-003 with the per-read round trip only held as a watch item. Requiring a latency run before passing would have caught it.
  - Lesson: a declaration to a framework is a performance contract too. Check what the framework will then do (read size, waiting), not only what the declaration literally says.
- Supported product scenario / material-premise basis changes: S-1 now explicitly includes links with a 20–50 ms round trip (Wi-Fi, tailnet). These are the product's own pairing ways, so the scenario is supported, not contrived.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-003 | Resolved (CRR-006) | Reopened, coupled with CR-004 | IR-003 | The scrub plays on with the declaration (R4-IOS-2), but the declaration causes CR-004. The next fix must pass both checks |
| CR-001, CR-002 | Resolved | Resolved | — | The rest of the class passes (R4 class summary) |

- New or remaining finding IDs: CR-004 (with CR-003)
- Material score or classification changes: runtime correctness is below 9.2 until CR-004 is fixed.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty:
  - a link slower than the bitrate under the declaration (held);
  - a physical iPhone check stays recommended;
  - test-code review of `ef3107bb3e` and `bb80c1cc9e` is pending;
  - R-1 and R-2 are unchanged.
