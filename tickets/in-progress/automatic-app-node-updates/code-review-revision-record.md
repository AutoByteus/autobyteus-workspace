# Code Review Revision Record — automatic-app-node-updates (autobyteus-356)

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Pass | None |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review, round 2 (API-REV-001 F-API-001, F-API-002) | Pass | Fail: two `Local Fix`es → implementation | F-API-001, F-API-002 |
| CRR-003 | `code-review-report.md` | Implementation Review, round 3, Targeted Delta (IR-002) | Fail | Pass | F-API-001, F-API-002 (resolved in code) |
| CRR-004 | `code-review-report.md` | API/E2E Failure-Origin Review, round 4 (API-REV-002 F-API-003) | Pass | Fail: `Design Impact` → Solution Designer | F-API-003, CR-C12; F-API-001 and F-API-002 resolved at runtime |
| CRR-005 | `code-review-report.md` | Implementation Review, round 5 (IR-003, SR-004 to SR-006; Full Re-Audit of DS-001, DS-002) | Fail | Pass | F-API-003, CR-C12 (resolved by design and code) |

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

### CRR-003 — Targeted delta review of IR-002 (one outcome set; settle the install attempt before recovery)

- Canonical review report updated: `code-review-report.md` (§ Round 3; Latest Authoritative Result)
- Review entry point and round: Implementation Review, round 3
- Review scope: `Targeted Delta Review`. The delta stays within the install sequence and failure handling, the sidebar count and store, one row layout fix, docs and specs.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-002; code `aa096836d9`, `6a94169f4f`), F-API-001, F-API-002
- Relevant solution revision IDs: SR-003
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` (CRR-002)
- Current authoritative result: `Pass`, 9.4/10, no findings
- What changed in the review result and why:
  - The sidebar reads the store's one set of automatic outcomes.
  - A failed automatic install now settles its attempt first: cancelled before the preparation, otherwise awaited with `quitAndInstall` skipped. Recovery reads the server's state only after that.
  - A later download rejection no longer replaces the install failure.
  - I traced each failure timing and confirmed the code's timeline against the API report's label.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-API-001 | Open (`Local Fix`) | Resolved in code; real-restart check owed (API-02 repeat) | IR-002, `aa096836d9` | Store and sidebar diff; consumer search; `NotificationCenter.appAutomatic.spec.ts`; IMP-10 (seeded record) |
| F-API-002 | Open (`Local Fix`) | Resolved in code; real refusal owed (API-05 repeat) | IR-002, `aa096836d9` | `appUpdateInstallAttempt.ts`; `appUpdateAutomaticRun.ts`; `appUpdaterAutomatic.spec.ts` (five new cases); IMP-09 |

- New or remaining finding IDs: None; FU-004 added (follow-up)
- Material score or classification changes: category 5 goes from 9.0 to 9.5; category 8 goes from 8.6 to 9.3; overall 9.4; Medium / High unchanged
- Recommended recipient: API/E2E engineer
- Remaining risks or uncertainty: the fix has not met a real Squirrel refusal; `updateStaged` stops scheduled checks in a process that stays open after a failed install (CR-C9); CR-C2; Windows, Linux and a Developer ID signed install are not tested.

### CRR-004 — Failure-origin review of F-API-003 (the 60 s quit bound fails a working install on a busy machine)

- Canonical review report updated: `code-review-report.md` (§ Round 4; Latest Authoritative Result)
- Review entry point and round: API/E2E Failure-Origin Review, round 4
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-002), F-API-003 (AC-002 / REQ-002 / REQ-004 / DS-002 signal c); evidence API-02B, API-02C, API-02D, API-05-r2, API-05C
- Relevant solution revision IDs: SR-003
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (CRR-003)
- Current authoritative result: `Fail`, `Design Impact`, owned by the Solution Designer
- What changed in the review result and why:
  - On macOS, `update-downloaded` fires before Squirrel has its copy, and `quitAndInstall` only waits for it. So the 60 s bound includes about 36 s of Squirrel's work on an idle machine, and on a busy machine it fails a working install. The design's premise that the quit follows promptly is false.
  - The reason shown for every install failure is generic (CR-C12, REQ-004).
  - **Correction:** rounds 2 and 3 said the round 1 refusal arrived during the preparation. The timings and API-05-r2 show it arrived before. The fix covers both timings.
- Supported product scenario / material-premise basis changes: DS-002 signal (c)'s premise is contradicted. A busy machine is a supported normal scenario.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-API-001 | Resolved in code (CRR-003) | Resolved at runtime | API-REV-002 | API-02-r2 (`API-02-r2-sidebar.log`) |
| F-API-002 | Resolved in code (CRR-003) | Resolved at runtime | API-REV-002 | API-05-r2 (9 samples, cancelled, health 200); API-05C (relaunch once) |

- New or remaining finding IDs: F-API-003 (Design Impact); CR-C12 (low, goes with it); CR-C13 held for evidence
- Material score or classification changes: category 8 goes from 9.3 to 8.7; Medium / High unchanged
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: one machine and an ad hoc signature; Squirrel's time with a Developer ID signature is unknown; the 40 s relaunch gap has no cause yet; the native readiness signal on the cached path is Read only.

### CRR-005 — Implementation review of IR-003 (on macOS the automatic install waits for Squirrel's copy)

- Canonical review report updated: `code-review-report.md` (§ Round 5; Latest Authoritative Result)
- Review entry point and round: Implementation Review, round 5
- Review scope: `Full Re-Audit` of DS-001 and DS-002 (a new owner, the `error` order, new guards, shared fields and an error kind); DS-003 carried forward
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-003; code `2e64cbb3d9`), F-API-003, CR-C12
- Relevant solution revision IDs: SR-004, SR-005, SR-006
- Relevant architecture-review revision IDs: ARCH-REV-003, ARCH-REV-004, ARCH-REV-005
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` (CRR-004, Design Impact)
- Current authoritative result: `Pass`, 9.4/10, no findings
- What changed in the review result and why:
  - On macOS nothing stops until Squirrel's native `update-downloaded`, so the 60 s bound measures only the quit.
  - Every way the wait ends was traced, along with the `error` order and both refusal timings.
  - The five departures are accepted.
  - **Correction:** CRR-004's statement that the download promise doesn't resolve on Squirrel's success was wrong; it resolves once the zip is served.
- Supported product scenario / material-premise basis changes: DS-002 signal (c)'s premise is replaced. CR-C19 (a second native fetch) is held for evidence.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-API-003 | Open (Design Impact) | Resolved by design and code; runtime proof pending (API-02B, API-02D repeats) | SR-004 to SR-006, ARCH-REV-005, IR-003 | `appUpdateInstallReadiness.ts`, `appUpdateAutomaticPolicy.ts`; `appUpdaterAutomaticMac.spec.ts`; IMP-11 (20 mutations) |
| CR-C12 | Open (low) | Resolved in code; shown on real refusals (IMP-12); the bound's reason is component-only | SR-004, IR-003 | The policy's reason constants; `NotificationRow.vue`; IMP-12 |

- New or remaining finding IDs: None; CR-C19 held for evidence
- Material score or classification changes: category 8 goes from 8.7 to 9.3; category 4 goes from 9.4 to 9.5; overall 9.4; Medium / High unchanged
- Recommended recipient: API/E2E engineer
- Remaining risks or uncertainty: no real install has run through the wait; the read-only timing on this order, the staged path, N-13 and F-15 are unit-only so far; a Developer ID signature, Windows and Linux are not tested.
