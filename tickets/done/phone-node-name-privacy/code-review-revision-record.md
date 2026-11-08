# Code Review Revision Record

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | API/E2E Failure-Origin Review / API-REV-001 Fail (API-08, API-08b) | N/A | Fail — `Design Impact` | F-001 |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review / API-REV-002 Fail (API-08 r2, API-08b r2) on IR-003 | Fail — `Design Impact` (F-001) | Fail — `Design Impact` (F-002) | F-001 (resolved), F-002 (new) |

## Revision Entries

### CRR-001 — Load failure leaves WebView's error page with the node URL visible behind the overlay: design gap

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy/tickets/in-progress/phone-node-name-privacy/code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 1
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md`, API-08 (API-08-03, API-08-05), API-08b (API-08-11); AC-007, AC-009, QR-001
- Relevant solution revision IDs: SR-002
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Fail — `Design Impact`, owner Solution Designer
- What changed in the review result and why: baseline. The implementation matches DS-004 exactly; DS-004 decides only the overlay's text, not the Chromium error page the WebView keeps after a main-frame error, which shows the node URL through the ~92%-opaque overlay (`WebShellScreen.kt:42`). Pre-existing rendering in the functionality this ticket changes, blocking in-scope ACs → this ticket.
- Supported product scenario / material-premise basis changes: SCN-006a (node unreachable while its page is open, then reload / Back / Retry) recorded as a Supported Normal Scenario from requirements SCN-006; C-003 (HTTP-error body) held for evidence.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: F-001
- Material score or classification changes: N/A (no scorecard on a failure-origin round); task_size `Medium` / architectural_risk `Low` unchanged
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: C-003 unobserved; FU-002 is relevant input to the design decision

### CRR-002 — DS-006 decides a load's success per onPageFinished; a failed load over a loaded page gets two, so the error page shows and Retry disappears

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy/tickets/in-progress/phone-node-name-privacy/code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 2
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (r2), API-08 (r2: API-08-03, -05, -11, -12), API-08b (r2); AC-007, AC-009, QR-001, AC-010
- Relevant solution revision IDs: SR-003, SR-004
- Relevant architecture-review revision IDs: N/A
- Relevant implementation revision IDs: IR-002, IR-003
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail — `Design Impact` (F-001)
- Current authoritative result: Fail — `Design Impact` (F-002), owner Solution Designer
- What changed in the review result and why: IR-003's opaque overlay and hidden page resolve F-001's mechanism. The measured log (`evidence/emulator-r2/API-08-cause-onPageFinished-twice.log`) shows that a main-frame failure over a committed page gets two `onPageFinished` calls; `MainFrameLoadOutcome` (as DS-006 specifies) resets on the first, so the second counts as success and `showPage()` shows Chromium's error page full-screen and removes the overlay and Retry. The implementation follows SR-004; the design's premise was measured only on a fresh WebView. A regression from the SR-003/SR-004 change (round 1 kept Retry).
- Supported product scenario / material-premise basis changes: SCN-006a extended to Retry disappearing (AC-010); DS-006's premise reclassified as contradicted; C-005 (several `onPageFinished` for a successful SPA load) recorded as design input; C-003 folded into F-002.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-001 | Open (`Design Impact`) | Resolved for its original mechanism; remaining leak tracked as F-002 | SR-003, SR-004, IR-003, API-REV-002 | API-09 (r2), API-11 (r2): opaque overlay, page out of screen and accessibility tree while the overlay is up |

- New or remaining finding IDs: F-002
- Material score or classification changes: N/A (no scorecard); task_size `Medium` / architectural_risk `Low` unchanged
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: deferred API/E2E cases (API-05, API-06, API-10, API-09 toast/no-app) unverified on IR-003
