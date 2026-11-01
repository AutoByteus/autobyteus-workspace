# Code Review Revision Record — automatic-app-node-updates (autobyteus-356)

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Pass | None |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review, round 2 (API-REV-001 F-API-001, F-API-002) | Pass | Fail: two `Local Fix`es → implementation | F-API-001, F-API-002 |

## Revision Entries

### CRR-001 — Initial source review of IR-001 (app and node "Update automatically")

- Canonical review report updated: `code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001; code `b4bda46484` to `31d38080fc`)
- Relevant solution revision IDs: SR-002, SR-003
- Relevant architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Pass`, 9.4/10, no findings
- What changed in the review result and why:
  - The initial baseline. DS-001 to DS-003 match SR-003.
  - The automatic paths reuse the manual download and install.
  - The per-version gate holds both in-process and across restarts.
  - An install failure, from any of the three signals, is handled once and recovered only when the server is gone.
  - The node policy runs in the main process with one attempt per version.
  - The six deviations are accepted (CR-C1).
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None
- Material score or classification changes: N/A (baseline); Medium / High confirmed
- Recommended recipient: API/E2E engineer
- Remaining risks or uncertainty: the real install, relaunch and node validation (AC-002 to AC-005); CR-C2 (an error after `before-quit`); `appUpdater.ts` near the size limit.

### CRR-002 — Failure-origin review of F-API-001 (sidebar "0 updated") and F-API-002 (no relaunch after a native refusal)

- Canonical review report updated: `code-review-report.md` (§ Round 2; Latest Authoritative Result)
- Review entry point and round: API/E2E Failure-Origin Review, round 2
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-001), F-API-001 (AC-002 / REQ-005), F-API-002 (AC-005 / REQ-004 / DS-002); evidence API-02, API-05
- Relevant solution revision IDs: SR-003
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (CRR-001)
- Current authoritative result: `Fail`; two `Local Fix`es owned by implementation
- What changed in the review result and why:
  - **F-API-001:** `SidebarNotificationsEntry.vue:61` derives the unread automatic outcomes with the old app-excluding filter, while the store now includes the app row. The entry shows, but its count is 0. The fix is one derived set from the store.
  - **F-API-002:** a native Squirrel refusal arrives during `prepareForInstall`, and recovery checks `isServerProcessGone()` at that instant, before the in-flight shutdown has stopped the server. So no relaunch happens, and the old app is left without its server. The fix: let the install attempt settle (or cancel it if the preparation hasn't started) before deciding.
  - **F-API-002 secondary:** the rejected download promise overwrites the install-failure state with a download error.
  - Both are round 1 review gaps.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

None (CRR-001 had no findings).

- New or remaining finding IDs: F-API-001, F-API-002 (both `Local Fix`)
- Material score or classification changes: category 8 goes from 9.3 to 8.6; category 5 goes from 9.5 to 9.0; Medium / High unchanged
- Recommended recipient: implementation engineer
- Remaining risks or uncertainty: Windows, Linux and a Developer ID signed install are not tested; the quit-bound and catch paths are unit-only.
