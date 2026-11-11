# Architecture Review Revision Record — phone-viewer-pinch-zoom-472 (autobyteus-472)

The latest `design-review-report.md` is authoritative. This record keeps the baseline and, later, one entry per review round.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (SR-002) | SR-001, SR-002 | N/A | Fail (Design Impact) | AR-001 (R-1…R-3 non-blocking) |
| ARCH-REV-002 | Round 2 / SR-003 answers ARCH-REV-001 | SR-003 | Fail | Pass | AR-001 resolved |

## Revision Entries

### ARCH-REV-001 — Phone viewer zoom and Download: baseline review

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-viewer-pinch-zoom-472/tickets/in-progress/phone-viewer-pinch-zoom-472/design-review-report.md`
- Review round and trigger: round 1. Solution Designer `handoff-architecture-review.md` (Medium/High)
- Triggering role, report path, and finding IDs: Solution Designer, `design-spec.md`; none prior
- Relevant solution revision IDs: SR-001, SR-002
- Prior authoritative decision: N/A
- Current authoritative decision: Fail (Design Impact)
- What was established:
  - Basis confirmed; the bridge, viewer and manifest facts match the code.
  - The Download and zoom spines are sound.
  - REQ-006's zoom state has no owner that outlives a reload: `MobileFileViewer` unmounts `FileViewer` while `isLoading`.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (Medium, blocking). Non-blocking: R-1 (prove the pinch in WebView; touch-event fallback), R-2 (extension fits MIME; off-main-thread decode and write; Android 8–9 activity re-creation; ArrayBuffer messages), R-3 (one place for `usePdfPinchZoom`).
- Material classification changes: none (Medium/High).
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: RSK-001…003; merge with autobyteus-452; SR ID mismatch in the design spec.

### ARCH-REV-002 — Round 2: zoom memory owned by MobileFileViewer; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-viewer-pinch-zoom-472/tickets/in-progress/phone-viewer-pinch-zoom-472/design-review-report.md`
- Review round and trigger: round 2; Solution Designer SR-003 (design-spec "Zoom state across reloads", AC-005 revised)
- Triggering role, report path, and finding IDs: Solution Designer; AR-001
- Relevant solution revision IDs: SR-003
- Prior authoritative decision: Fail (ARCH-REV-001)
- Current authoritative decision: Pass
- What changed: AR-001 resolved with option (b). R-1…R-3 were adopted as implementation guidance.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Medium) | Resolved | SR-003, AC-005 | `useViewerZoomMemory` is owned by `MobileFileViewer`, which stays mounted per open file (`MobileFiles.vue:69-84`, not keyed by URL). The holder resets on a path change. The viewers apply it after `loaded`/`load` and write it back on committed gestures. AC-005 is tested at the `MobileFileViewer` level through `isLoading` and a new URL |

- New or remaining finding IDs: none
- Material classification changes: none (Medium/High)
- Recommended recipient: implementation engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty: RSK-001…003; merge with autobyteus-452 (`FileViewer.vue`, `MobileFileViewer.vue`)
