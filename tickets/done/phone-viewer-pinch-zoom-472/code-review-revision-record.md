# Code Review Revision Record — phone-viewer-pinch-zoom-472 (autobyteus-472)

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Pass | None |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review (API-REV-001: F-1; U-1) | Pass | Fail (Local Fix, implementation) | CR-001 |
| CRR-003 | `code-review-report.md` | Implementation Review, round 3 (IR-002 Local Fix) | Fail (Local Fix) | Pass | CR-001 (resolved) |
| CRR-004 | `api-e2e-test-review-report.md` | Proportional test-code review after API/E2E pass (API-REV-002) | Pass | Pass | None |
| CRR-005 | `code-review-report.md` | API/E2E Failure-Origin Review, merged state (API-REV-003: F-2; DR-001 re-entry) | Pass | Fail (Local Fix, implementation) | CR-002 |
| CRR-006 | `code-review-report.md` | Implementation Review, round 5 (IR-003 Local Fix, merged state) | Fail (Local Fix) | Pass | CR-002 (resolved) |
| CRR-007 | `code-review-report.md` | API/E2E Failure-Origin Review, merged state (API-REV-004: F-3) | Pass | Fail (Local Fix, implementation) | CR-003 |
| CRR-008 | `code-review-report.md` | Implementation Review, round 7 (IR-004 Local Fix, merged state) | Fail (Local Fix) | Pass | CR-003 (resolved) |
| CRR-009 | `api-e2e-test-review-report.md` | Proportional test-code review, delivery re-entry (API-REV-005) | Pass | Pass | None |

## Revision Entries

### CRR-001 — Initial implementation review

- Canonical review report updated: `tickets/in-progress/phone-viewer-pinch-zoom-472/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001, code `d2b9f99603`)
- Relevant solution revision IDs: SR-003
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Pass
- What changed in the review result and why: baseline.
  - The gestures follow DS-001 and DS-002, with R-1 proven first.
  - The bridge rules (main frame, origin, plain name, extension matching the type) follow R-2, and the bytes are decoded and written off the main thread.
  - Android 8–9 keeps its pending save across activity re-creation.
  - The zoom memory follows AR-001.
- Supported product scenario / material-premise basis changes: C-02 (memory at 3× on long PDFs) is held as a non-blocking, design-accepted risk for API/E2E to measure. C-01 (an unguarded credential fetch) is rejected as unreachable, with hardening recommended.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none
- Material score or classification changes: N/A (baseline 9.4/10)
- Recommended recipient: API/E2E engineer
- Remaining risks or uncertainty: RSK-001 and RSK-002 unmeasured; no real Android 8–9 device; iOS not built.

### CRR-002 — Failure-origin review of API-REV-001

- Canonical review report updated: `code-review-report.md` § API/E2E Failure-Origin Review (Round 2) and Latest Authoritative Result
- Review entry point and round: API/E2E Failure-Origin Review, round 2
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md`; F-1 (API-01 `pan2-hold`), U-1
- Relevant solution / architecture-review / implementation revision IDs: SR-003 / ARCH-REV-002 / IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-001)
- Current authoritative result: Fail, Local Fix (implementation)
- What changed in the review result and why: CR-001 is confirmed in code. The no-zoom-change branch of `usePdfPinchZoom.commit` clears the live transform without turning the fingers' movement into scroll, so a two-finger drag, or a pinch at the cap, snaps back. U-1 is recorded as Unclear for the Solution Designer: the implementation matches the reviewed design.
- Supported product scenario / material-premise basis changes: a two-finger drag or capped pinch on a zoomed PDF is a supported normal gesture.

#### Prior Finding Resolution

None (CRR-001 had no findings).

- New or remaining finding IDs: CR-001
- Material score or classification changes: Runtime Correctness reopened by CR-001 (no rescore on a failure-origin round)
- Recommended recipient: implementation engineer; Solution Designer for U-1 (non-blocking)
- Remaining risks or uncertainty: RSK-001 on a real phone; Android 8–9 Save dialog untested.

### CRR-003 — Targeted delta review of IR-002 (CR-001)

- Canonical review report updated: `code-review-report.md` § Implementation Review Round 3 and Latest Authoritative Result
- Review entry point and round: Implementation Review, round 3
- Review scope: `Targeted Delta Review` (`d2b9f99603..1b5b7f5b0e`: `usePdfPinchZoom.ts`, its spec, MSP-39)
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-002); CR-001
- Relevant solution / architecture-review / implementation revision IDs: SR-004 / ARCH-REV-002 / IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail, Local Fix (CRR-002)
- Current authoritative result: Pass
- What changed in the review result and why: a same-zoom commit now turns the fingers' movement into scroll and records it. Specs and real-touch MSP-39 cover a drag, a capped pinch and resting fingers. U-1 is closed by SR-004.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Local Fix) | Resolved | IR-002, `1b5b7f5b0e` | `usePdfPinchZoom.ts` same-zoom branch; spec 9/9 (2 fail without the fix); IMP-16 MSP-39 Pass |

- New or remaining finding IDs: none
- Material score or classification changes: Runtime Correctness 9.4 restored
- Recommended recipient: API/E2E engineer (informational notice to implementation engineer)
- Remaining risks or uncertainty: RSK-001 on a real phone; Android 8–9 Save dialog untested.

### CRR-004 — Proportional test-code review after API/E2E pass

- Canonical review report updated: `api-e2e-test-review-report.md` (new)
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review). API/E2E changed no durable test; the deferred implementation-authored MSP-39 probe and IR-002's spec cases are reviewed.
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-002)
- Relevant solution / architecture-review / implementation revision IDs: SR-004 / ARCH-REV-002 / IR-002
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-003)
- Current authoritative result: Pass
- What changed in the review result and why: MSP-39 measures each requirement through real touch input with tight tolerances; the spec cases pin CR-001's scroll deltas.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none
- Material score or classification changes: N/A
- Recommended recipient: delivery engineer
- Remaining risks or uncertainty: Android 8–9 Save dialog on a real 8–9 system (confidence 94%); RSK-001 on a real low-end phone; iOS not built.

### CRR-005 — Failure-origin review of API-REV-003 (merged state)

- Canonical review report updated: `code-review-report.md` § API/E2E Failure-Origin Review (Round 4) and Latest Authoritative Result
- Review entry point and round: API/E2E Failure-Origin Review, round 4 (delivery re-entry)
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (round 3); F-2 (API-06 PDF live reload)
- Relevant solution / architecture-review / implementation revision IDs: SR-004 / ARCH-REV-002 / IR-002
- Relevant API/E2E revision IDs: API-REV-003
- Relevant delivery revision IDs: DR-001
- Prior authoritative result: Pass (CRR-004)
- Current authoritative result: Fail, Local Fix (implementation)
- What changed in the review result and why: on the merged state, a live refresh of a media file reloads it inside the same viewer (`contentRevision`, 452). `PdfViewer` re-applies the remembered position only on its first load (`if (placed) return`) and then records the top, so the zoom survives and the position is lost. The image path passes. The design's AR-001 remount premise does not hold for media files; this is noted, non-blocking.
- Supported product scenario / material-premise basis changes: a live refresh of a zoomed PDF is a supported normal scenario (REQ-006, SR-004).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved | Resolved (unchanged on the merged state; MSP-43 Pass) | IR-002, API-REV-003 | `r3-API-08-mobile-shell.log` |

- New or remaining finding IDs: CR-002
- Material score or classification changes: Runtime Correctness reopened (no rescore on a failure-origin round)
- Recommended recipient: implementation engineer
- Remaining risks or uncertainty: the user accepted the Android 8–9 and low-end-memory gaps (DR-001).

### CRR-006 — Targeted delta review of IR-003 (CR-002)

- Canonical review report updated: `code-review-report.md` § Implementation Review Round 5 and Latest Authoritative Result
- Review entry point and round: Implementation Review, round 5
- Review scope: `Targeted Delta Review` (`22f4806207..43ef1748da`: `PdfViewer.vue`, `MobileFileViewer.zoom.spec.ts`)
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-003); CR-002
- Relevant solution / architecture-review / implementation revision IDs: SR-004 / ARCH-REV-002 / IR-003
- Relevant API/E2E revision IDs: API-REV-003
- Relevant delivery revision IDs: DR-001
- Prior authoritative result: Fail, Local Fix (CRR-005)
- Current authoritative result: Pass
- What changed in the review result and why: each new PDF source is a generation. Remembering pauses during the redraw, and the newest generation's `loaded` puts the remembered position back. This was checked against `useAuthorizedObjectUrl`'s null-then-new-URL reload, so no stale canvas can satisfy the layout wait. The new in-place spec fails without the fix.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-002 | Open (Local Fix) | Resolved | IR-003, `43ef1748da` | `PdfViewer.vue` generation rule; in-place spec; IMP-22, IMP-26 |
| CR-001 | Resolved | Resolved (unchanged) | IR-002 | MSP-43 Pass (IMP-26) |

- New or remaining finding IDs: none
- Material score or classification changes: Runtime Correctness 9.4 restored
- Recommended recipient: API/E2E engineer (informational notice to implementation engineer)
- Remaining risks or uncertainty: unchanged; the user accepted the Android 8–9 and low-end-memory gaps (DR-001).

### CRR-007 — Failure-origin review of API-REV-004 (merged state)

- Canonical review report updated: `code-review-report.md` § API/E2E Failure-Origin Review (Round 6) and Latest Authoritative Result
- Review entry point and round: API/E2E Failure-Origin Review, round 6
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (round 4); F-3 (API-06 PDF live refresh)
- Relevant solution / architecture-review / implementation revision IDs: SR-004 / ARCH-REV-002 / IR-003
- Relevant API/E2E revision IDs: API-REV-004
- Relevant delivery revision IDs: DR-001
- Prior authoritative result: Pass (CRR-006)
- Current authoritative result: Fail, Local Fix (implementation)
- What changed in the review result and why: the per-frame traces show `pagesLaidOutAt` resolving on the first sized canvas, so the scroll ratio is applied to a partial `scrollHeight` (2 of 5 refreshes). The pinch commit uses the same helper. Required: wait for the whole layout (`rendered` or all canvases sized), and never restore against a partial height.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-002 | Resolved | Resolved (its path holds in the app; a remaining timing defect is split out as CR-003) | IR-003, API-REV-004 | `restore-trace.json` trial 1, rewrites with the full layout in one frame |

- New or remaining finding IDs: CR-003
- Material score or classification changes: Runtime Correctness reopened (no rescore on a failure-origin round)
- Recommended recipient: implementation engineer
- Remaining risks or uncertainty: unchanged (the user accepted the gaps in DR-001).

### CRR-008 — Targeted delta review of IR-004 (CR-003)

- Canonical review report updated: `code-review-report.md` § Implementation Review Round 7 and Latest Authoritative Result
- Review entry point and round: Implementation Review, round 7
- Review scope: `Targeted Delta Review` (`43ef1748da..bb9b300c4a`: `PdfViewer.vue`, `usePdfPinchZoom.ts`, specs)
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-004); CR-003
- Relevant solution / architecture-review / implementation revision IDs: SR-004 / ARCH-REV-002 / IR-004
- Relevant API/E2E revision IDs: API-REV-004
- Relevant delivery revision IDs: DR-001
- Prior authoritative result: Fail, Local Fix (CRR-007)
- Current authoritative result: Pass
- What changed in the review result and why: the layout wait now requires every page canvas at the current zoom's width. When it does not complete, the restore and the pinch anchor are skipped instead of applied to a partial height. The spec sizes pages one by one and fails without the fix.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-003 | Open (Local Fix) | Resolved | IR-004, `bb9b300c4a` | `pagesLaidOut()`; `PdfViewer.touchLayout.spec.ts`; IMP-32, IMP-36 |
| CR-002 | Resolved | Resolved (generation guard unchanged) | IR-003 | spec still passes |

- New or remaining finding IDs: none
- Material score or classification changes: Runtime Correctness 9.4 restored
- Recommended recipient: API/E2E engineer (informational notice to implementation engineer)
- Remaining risks or uncertainty: unchanged (the user accepted the gaps in DR-001).

### CRR-009 — Test-code review of the delivery re-entry (API-REV-005)

- Canonical review report updated: `api-e2e-test-review-report.md` § Round 2
- Review entry point and round: Successful API/E2E test-code review, round 2
- Review scope: `N/A` (test review): `3eebc0b7a4`, `PdfViewer.touchLayout.spec.ts`, `MobileFileViewer.zoom.spec.ts`, `usePdfPinchZoom.spec.ts`
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (round 5)
- Relevant solution / architecture-review / implementation revision IDs: SR-004 / ARCH-REV-002 / IR-002…IR-004
- Relevant API/E2E revision IDs: API-REV-003…API-REV-005
- Relevant delivery revision IDs: DR-001
- Prior authoritative result: Pass (CRR-008)
- Current authoritative result: Pass
- What changed in the review result and why: the MSP-43 renumber is pure, and the specs prove the restore and anchor ordering with per-frame sizing. In the app, 10/10 traced refreshes restore against the full layout, lower-page anchors hold, and the image refresh keeps its zoom.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None open (CR-001…CR-003 resolved earlier).

- New or remaining finding IDs: none
- Material score or classification changes: N/A
- Recommended recipient: delivery engineer
- Remaining risks or uncertainty: the Android 8–9 Save dialog and memory at 3× on a low-end phone (both accepted by the user, DR-001).
