# Code Review Revision Record — ios-demo-mode-279 (autobyteus-279)

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Pass | None |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review (API-REV-001: F-1) | Pass | Fail (Design Impact) | CR-001 |
| CRR-003 | `code-review-report.md` | Implementation Review, round 3 (IR-002, SR-003/SR-004) | Fail (Design Impact) | Pass | CR-001 (resolved) |
| CRR-004 | `api-e2e-test-review-report.md` | Proportional test-code review after API/E2E pass (API-REV-002) | Pass | Pass | None |

## Revision Entries

### CRR-001 — Initial implementation review

- Canonical review report updated: `tickets/in-progress/ios-demo-mode-279/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review` (`8430d9ef12..429af9bd66`)
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001)
- Relevant solution revision IDs: SR-002
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Pass
- What changed in the review result and why: baseline.
  - The demo is the real phone build behind a page-level network boundary (fetch, XHR, WebSocket) with an iOS content rule list as a second guard, a non-persistent store, and a path-safe scheme handler.
  - The bridge accepts the main frame of the open origin only.
  - Share and link handling follow Android's flow.
  - The real-app changes (iPad, DC-007, DC-011, local icons) are small and scoped.
- Supported product scenario / material-premise basis changes: C-01 (Debug-only test hooks) accepted as a deviation whose reason holds, with FU-004 for the rule's wording. C-02…C-07 rejected with reasons.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none
- Material score or classification changes: N/A (baseline 9.4/10)
- Recommended recipient: API/E2E engineer
- Remaining risks or uncertainty: build-only workflow run, fresh-start build, device checks (on the founder's word), iOS `saveFile` on the main thread, app size.

### CRR-002 — Failure-origin review of API-REV-001

- Canonical review report updated: `code-review-report.md` § API/E2E Failure-Origin Review (Round 2) and Latest Authoritative Result
- Review entry point and round: API/E2E Failure-Origin Review, round 2
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md`; F-1 (API-04a/b)
- Relevant solution / architecture-review / implementation revision IDs: SR-002 / ARCH-REV-002 / IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-001)
- Current authoritative result: Fail, Design Impact
- What changed in the review result and why: two causes produce F-1.
  - Persisted data: the shipped app stored "AutoByteus Desktop" as `displayName` meaning "no name known", and the new code reads it as a real name. This contradicts the design's "Directly Usable — No Migration".
  - Implementation: the iOS bridge `hello` sends `entry.displayName` unconditionally, where Android's contract sends the known name or `""`, never the address.
- Supported product scenario / material-premise basis changes: the persisted-data premise for saved computers is reclassified (from Directly Usable to a decision needed for `displayName`).

#### Prior Finding Resolution

None open before this round.

- New or remaining finding IDs: CR-001
- Material score or classification changes: Runtime Correctness reopened (no rescore on a failure-origin round)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: whether `ConnectionValidator`'s placeholder default is still read after the fix (Principle 7).

### CRR-003 — Targeted delta review of IR-002 (CR-001)

- Canonical review report updated: `code-review-report.md` § Implementation Review Round 3 and Latest Authoritative Result
- Review entry point and round: Implementation Review, round 3
- Review scope: `Targeted Delta Review` (`49e69c9887..930477c533`, iOS only)
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-revision-record.md` IR-002; CR-001
- Relevant solution / architecture-review / implementation revision IDs: SR-003, SR-004 / ARCH-REV-004 / IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail, Design Impact (CRR-002)
- Current authoritative result: Pass
- What changed in the review result and why: an interruption-safe one-time migration turns the shipped placeholder into "no known name" (the host); one Android-equal name rule drives `hello`, `onPaired` and the native screens; the dead `serverName` and its placeholder are removed. Covered by the core tests and an update start over the shipped app's entries.
- Supported product scenario / material-premise basis changes: the persisted-data premise is resolved by the design's migration decision (SR-003).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Design Impact) | Resolved | SR-003/SR-004, ARCH-REV-004, IR-002, `930477c533` | Migration tests (7), name tests, `NativeNodeNameReadsTests`, IMP-13…15 |

- New or remaining finding IDs: none
- Material score or classification changes: Runtime Correctness 9.4 restored
- Recommended recipient: API/E2E engineer (informational notice to implementation engineer)
- Remaining risks or uncertainty: an old entry reads "AutoByteus node" natively until its page reports `paired` with a name; device checks on the founder's word.

### CRR-004 — Proportional test-code review after API/E2E pass

- Canonical review report updated: `api-e2e-test-review-report.md` (new)
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review): `4352ec81fa`, the IR-002 iOS core tests
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-002)
- Relevant solution / architecture-review / implementation revision IDs: SR-004 / ARCH-REV-004 / IR-002
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-003)
- Current authoritative result: Pass
- What changed in the review result and why: the MSP-52 fix skips only boxless `display: contents` wrappers. The migration and name tests cover each write step and the Android-equal name rule. API-04a/b confirm F-1 resolved on a real update.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Material score or classification changes: N/A
- Recommended recipient: delivery engineer
- Remaining risks or uncertainty: NT-01 (build-only workflow run) and the device and TestFlight checks, on the right word.
