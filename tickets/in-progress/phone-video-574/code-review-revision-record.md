# Code Review Revision Record

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Pass | None |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review, round 2 (API-REV-001 F-1, F-2) | Pass | Fail: implementation Local Fix | CR-001, CR-002 (new) |

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
