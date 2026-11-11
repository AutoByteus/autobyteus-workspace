# Code Review Report — phone-viewer-pinch-zoom-472 (autobyteus-472): pinch zoom and Download in the phone viewer

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-001; approved 2026-11-11, the user delegated the decisions)
- Design Spec Reviewed As Context: `design-spec.md` (SR-003; AR-001 zoom memory; R-1…R-3 guidance)
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002, Pass)
- Relevant Solution / Architecture Review Revision IDs: SR-003 / ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001; 4 assumptions)
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Trigger: implementation engineer; code under test `d2b9f99603` (handoff `9176e10bb7`); base `origin/personal` @ `ed481ae4ca`
- Latest Authoritative Round: 1

## Routing Classification Review

- `Medium` / `High` confirmed: a new page→app bridge contract that writes files on the phone, and a new APK. Route: `Implementation Review`. No correction.

## Review Scope

- Reviewed:
  - Web: `usePictureZoom.ts` (moved and renamed; adds `onCommit`, `restore`), `usePdfPinchZoom.ts`, `PdfViewer.vue`, `ImageViewer.vue`, `FileViewer.vue`, `MobileFileViewer.vue`, `useViewerZoomMemory.ts`, `useMobileFileDownload.ts`, `shellBridge.ts`, `MobileNodeDesktop.vue` (rename only).
  - Android: `ShellBridge.kt` (`saveFile`, the large-message thread, the message rules), `DownloadsSaver.kt`, `MainActivity.kt` wiring.
  - Docs and glossary.
- Read for context: `authorizedResourceUrl.ts`, `authorizedTransport.ts`, `useAuthorizedObjectUrl.ts`, `fileTypePolicy.ts`, `useMobileAttachmentOpening.ts`.
- Exclusions: probe internals (`mobile-file-zoom-cases.mjs`, reviewed after API/E2E), and Android instrumented test internals.
- No recorded check was rerun: none of the code they exercise changed after they ran (d2b9f99603 is a test-only typecheck change on top of 5073d38a56).

## Upstream Behavior And Production-Path Basis Confirmation

- Behavior-basis status: `Confirmed`.

| Behavior | Status | Implementation path |
| --- | --- | --- |
| REQ-001 / DS-001 PDF zoom | Confirmed | `PdfViewer` (touch mode) scroller with `touch-action: pan-x pan-y` and non-passive two-finger handling (R-1, IMP-00). A live transform follows the fingers. On release, `setZoom` sets the width to `base × zoom`, waits until vue-pdf-embed has sized the canvas, clears the transform, then scrolls the anchor back under the fingers. Double tap toggles 1× ↔ 2×. The 1–3× clamp holds both live and committed. |
| REQ-002 / DS-002 image zoom | Confirmed | `ImageViewer` touch mode uses `usePictureZoom` with the image's natural size: 1–4×, pan, double tap Fit ↔ Fill. The desktop mouse zoom is unchanged in the `v-else` branch. |
| REQ-003 | Confirmed | Two-finger moves are prevented inside the viewer; the app page never zooms; the bar sits outside the scroller (probe: `visualViewport.scale` stays 1). |
| REQ-004/005 / DS-003 Download | Confirmed | The bar button shows only for a loaded PDF/Image with a known MIME type. `useMobileFileDownload` fetches the open file's own URL into a blob. In the app it sends `{fileName, mimeType, base64}` over `saveFile`; in a browser it uses `<a download>`. `ShellBridgeMessages.read` checks main frame, node origin, plain name, matching extension and MIME type, and non-empty data. `DownloadsSaver`: Android 10+ uses MediaStore with IS_PENDING; Android 8–9 uses CREATE_DOCUMENT with the bytes cached and the pending save kept in saved state. Decoding and writing happen off the main thread, and the result is shown as a toast. |
| REQ-006 / AR-001 zoom memory | Confirmed | `useViewerZoomMemory` belongs to `MobileFileViewer` and is keyed by path. Viewers restore it after load or layout (PDF: zoom, then scroll ratios; image: `restore`) and write it after each committed gesture or once scrolling settles. |
| Preserved | Confirmed | Desktop viewers keep their old branches; the VNC zoom only renamed its import (`MobileNodeDesktop` spec updated); `FileViewer` forwards the touch props only to the PDF and image viewers. |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario | Related | Kind | Actor | Goal | Entry | Shape | Path | Outcome | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RS-01 | REQ-001/003 | User | Owner on the phone | Read a small-print PDF | Pinch / double tap | Normal | DS-001 | Sharp zoom, pages scroll | Supported Normal | Use |
| RS-02 | REQ-002 | User | Owner | Zoom an image | Pinch / double tap | Normal | DS-002 | Zoomed picture | Supported Normal | Use |
| RS-03 | REQ-004/005 | User | Owner in the Android app or a phone browser | Keep the file | Download | Normal | DS-003 | File in Downloads + toast | Supported Normal | Use |
| RS-04 | REQ-006 | System | Live refresh / reopen | Same file reloads | `isLoading` → new URL | Normal | Zoom memory | Same zoom and place | Supported Normal | Use |
| RS-05 | REQ-005 | Contract | A subframe, another origin, or a message for a non-PDF/non-image | Make the app save a file | Bridge message | Explicit Edge | `ShellBridgeMessages.read` | Ignored | Supported Explicit Edge (security contract) | Use |

### Candidate Finding And Mechanism Gate

| Candidate | Observation | Scenario / Contract | Trigger | Consequence | Evidence | Disposition | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | `useMobileFileDownload` fetches with `fetchAuthorizedResourceBlob`, which adds the phone credential to any URL. Other callers check `shouldLoadResourceThroughAuthorizedFetch…` (protected node prefixes) first. | REQ-005 | An open file whose `url` is another site's | The credential would go in a header to that host | `useMobileFileDownload.ts:63`, `authorizedTransport.ts:43-55`, `useAuthorizedObjectUrl.ts:55-62` | Reject (not reachable) | The phone viewer only holds node URLs (workspace content, attachments under protected prefixes) or node-file `blob:` URLs; external URLs open outside the page (`useMobileAttachmentOpening.ts:16`). Recommended hardening, not required: use the guarded form (`shouldLoadResourceThroughAuthorizedFetch(url) ? fetchAuthorizedResourceBlob(url) : fetch(url)`). |
| C-02 | Memory at 3× on long PDFs: each page canvas is about width × 3 × DPR | RSK-001 (design-accepted) | A many-page PDF zoomed to 3× on a phone | Possible WebView memory pressure | `PdfViewer.vue` `renderWidth`; vue-pdf-embed draws all pages | Hold for Evidence (non-blocking; design-accepted risk) | Not measured. API/E2E should zoom a ≥10-page PDF to 3× on the emulator or a device. If it fails, that is a design escalation (page virtualisation), not a local fix. |
| C-03 | Three lists of PDF/image types must agree: web `MIME_BY_EXTENSION`, Android `SAVE_FILE_EXTENSIONS`, `fileTypePolicy.IMAGE_EXTENSIONS` | Principle 11 (derived data) | A new image type added to one list | No Download button, or the app refuses | They match today (png, jpg/jpeg, gif, webp, bmp, svg, pdf) | Reject (no defect) | The Android list cannot share code with the web; both name each other. Accepted. |
| C-04 | Android 8–9: the toast says "Saved to Downloads" when the user picked another folder (assumption 2) | REQ-004 wording | — | Wording only | `DownloadsSaver.kt` | Reject | Approved wording; the file is saved. |
| C-05 | A rotation during the few milliseconds of decoding before the Save dialog opens | Android 8–9 | Contrived timing | — | `saveThroughDialog` → `openSaveDialog` on a recreated activity | Reject | Artificial timing; the pending save across re-creation after the dialog opens is handled. |
| C-06 | An older Android app ignores `saveFile` silently | DESIGN rule 9 | Old APK, new page | Download does nothing | Design § Legacy | Reject | Design decision; the release notes say to update the app. |

## Structural / Design Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Design health preserved | Pass | Existing owners absorb it; one picture-zoom composable is now shared by the VNC viewer and images |
| Spine clarity | Pass | DS-001…003 read in call order |
| Ownership / boundaries | Pass | Zoom memory owned by `MobileFileViewer` (AR-001); viewers only read and write it; the bridge rules live in `ShellBridgeMessages` (JVM-tested) and the writing in `DownloadsSaver` |
| Off-spine concerns | Pass | Layout wait, scroll memory, cache cleanup each sit with their owner |
| Capability reuse | Pass | `usePictureZoom` reused (renamed under Principle 15); bridge, toasts, authorized fetch reused |
| Tightness | Pass | `ViewerZoomMemory` has one field per viewer kind; `SaveFile.toString` hides the bytes |
| Dependency direction | Pass | Viewers → composables; `FileViewer` passes props only |
| Authoritative Boundary Rule | Pass | — |
| File placement | Pass | `composables/` for shared zoom, `composables/mobile/` for phone-only |
| Interface clarity | Pass | `saveFile {fileName, mimeType, base64}`; `touchZoom` + `zoomMemory` props |
| Naming / vocabulary | Pass | `usePictureZoom` names what it now does; glossary updated |
| Duplication / patch-on-patch | Pass | C-03 accepted |
| Dead code | Pass | The old module path is removed (moved) |
| Tests requirement-aligned | Pass | Composable specs; `MobileFileViewer.zoom.spec` (AC-005); download spec; 13 JVM bridge-rule tests; instrumented `DownloadsSaverTest` on Android 10 and 15; MSP-39 real-touch probe |
| API/E2E readiness | Pass | AC-001…003 on a device or emulator, Android 8–9 and large-PDF checks named for API/E2E |

## Source File Size And Structure Audit

All changed source files are well under the limits. The largest are `usePictureZoom.ts` at 251 lines (moved, +~30), `DownloadsSaver.kt` at 186, `usePdfPinchZoom.ts` at 181 and `PdfViewer.vue` at about 190. No `>220` delta in one file except the move. `Pass`.

## Legacy / Backward-Compatibility Verdict

`Pass`: no compatibility path; there is no capability negotiation, by design (rule 9). Persisted data: `Not Affected`.

## Docs-Impact Verdict

`Yes`, done: `remote_access.md`, the Android README, the glossary, and release notes ("update the Android app").

## Review Scorecard (Mandatory)

- Overall: `9.4/10`

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Gesture → live transform → re-render → anchor scroll is explicit | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | AR-001 owner respected; bridge rules separate from writing | — | — |
| 3 | API / Interface Clarity | 9.4 | Small, explicit bridge message; props scoped to two viewers | — | — |
| 4 | Separation of Concerns and File Placement | 9.4 | One concern per file | `usePictureZoom.ts` at 251 lines (two input kinds: touch and wheel) | Watch growth |
| 5 | Shared-Structure Tightness | 9.3 | Tight memory shape | Three type lists to keep in step (C-03) | — |
| 6 | Naming Quality | 9.5 | Rename follows Principle 15 | — | — |
| 7 | API/E2E Readiness | 9.3 | Strong probe and instrumented tests | Device AC-001…003, Android 8–9, large PDFs pending | API/E2E |
| 8 | Runtime Correctness | 9.3 | Layout wait bounded; stale-unmount guards; IS_PENDING; cache cleanup; saved state | RSK-001 unmeasured (C-02) | Measure |
| 9 | No Legacy Retention | 9.6 | Clean move | — | — |
| 10 | Cleanup Completeness | 9.5 | Old module removed, docs updated | — | — |

## Findings

None.

## Follow-ups

- Added: None.

## Classification / Recommended Recipient

- Pass → API/E2E engineer; informational notice to the implementation engineer.

## Residual Risks

- C-02 / RSK-001: memory at 3× on long PDFs; measure on a device or emulator with a ≥10-page PDF.
- RSK-002: a large PDF crosses the bridge as one base64 message (about 1.33× its size, plus the page's binary string while encoding); measure a large PDF in the app.
- Android 8–9 path (Save dialog, re-creation) has only the forced-path instrumented test on Android 10; no real Android 8–9 device.
- C-01 hardening (guarded fetch) is recommended but not required.
- iOS is not built (RSK-003).

## API/E2E Failure-Origin Review (Round 2, CRR-002)

### Review Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Trigger: API/E2E engineer, API-REV-001 (Fail, 87%): F-1; Unclear U-1. Code under test `d2b9f99603` (no source change since; evidence `24be7a06bb`)
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md` (API-REV-001)
- Failing Scenario IDs: API-01 `pan2-hold` (AC-001, REQ-001, DS-001)
- Execution: Android 15 AVD, the branch's debug APK, real MotionEvents written to the touchscreen device; page state read over DevTools (`evidence/api-e2e/android/journey.md`)
- Failure Evidence Paths: `android/shots/API-01-pan2-hold-fingers-down.png`, `…-lifted.png`, `android/journey.md` API-01
- Review Scope: `N/A` (failure-origin)

### Scenario Basis

| Item | Approved behavior | Trigger | Path | Validity |
| --- | --- | --- | --- | --- |
| F-1 | REQ-001: pinch zoom around the pinch centre, pan by dragging; DS-001: the pinch centre stays under the fingers | A two-finger gesture on a zoomed PDF that ends at the same zoom: a two-finger drag, or a pinch whose zoom is clamped at 3× (or at 1×) while the fingers move | `usePdfPinchZoom.onTouchEnd` → `commit(anchor, scale≈1, startCentre, centre)` | Supported Normal Scenario. A pinch at the cap with moving fingers is an ordinary gesture; the image viewer keeps the same two-finger drag (REQ-002 "as the VNC viewer"). |
| U-1 | REQ-006 "an explicit open again (450)" | Back, then the same link | A new `MobileFileViewer` gets a new `useViewerZoomMemory` | Unclear (wording); see below |

### Origin Findings

#### CR-001 — A two-finger move that ends at the same zoom snaps back (F-1; Local Fix, implementation)

- Evidence: `composables/usePdfPinchZoom.ts:67-74`. `commit` computes `factor = clamp(current × scale, 1, 3) / current`; when `|factor − 1| < 0.01` it clears the live transform and returns. The live view had moved the pages by `screen − from` (`show`, line 60), but that move is never turned into scroll, so the pages jump back when the fingers lift (`translate(-120.1px, -150.2px) scale(1)` → cleared; scroll unchanged at (380, 1384)). When the factor is not 1, the scroll correction at lines 85-86 already includes `screen`, so only the no-zoom-change branch drops the movement. Any pinch clamped at 3× or 1× takes that branch.
- Origin: implementation defect. Review gap: partial. The early return was in the reviewed code and is detectable by tracing the clamp at the cap. The spec covers only zoom-changing commits.
- Required action: when the factor is about 1, apply the fingers' movement as scroll (`scrollLeft -= screen.x − from.x`, `scrollTop -= screen.y − from.y`), clear the transform in the same step, and call `onCommit` so the position is remembered. Add `usePdfPinchZoom.spec.ts` cases for a two-finger drag at a fixed zoom and for a moving pinch at the 3× cap.

#### U-1 — REQ-006 and a Back-then-reopen on the phone (Unclear; Solution Designer; not blocking)

- Observation: reopening the same file after Back starts at 1×. The holder lives in `MobileFileViewer`, as the design states ("Zoom state across reloads": created once per `MobileFileViewer` instance; another path starts at 1×).
- The implementation matches the reviewed design. The question is whether REQ-006's "an explicit open again, 450" means a reopen after Back. On the phone, the full-screen viewer cannot receive an explicit open of the file it already shows, so the case may be a desktop example. Answering yes would be new behavior (memory kept after the viewer closes) and needs the Solution Designer's decision. It does not block CR-001.

### Classification And Routing

- CR-001: `Local Fix`, owner implementation engineer. After the fix: targeted source review, then API/E2E rechecks API-01 (`pan2-hold`, a moving pinch at the 3× cap, the PDF gestures).
- U-1: `Unclear` (wording of REQ-006), owner Solution Designer, non-blocking.
- U-1 resolved by the Solution Designer (SR-004): REQ-006 covers reloads while the file stays open. A reopen after Back starts at 1×, as for any newly opened file. No design or test change; the implementation meets the tightened wording.

## Implementation Review Round 3 (CRR-003): Targeted Delta Review of IR-002

- Trigger: implementation engineer, IR-002, code `1b5b7f5b0e` (docs `dbf487d57c`).
- Review Scope: `Targeted Delta Review`. `git diff d2b9f99603..1b5b7f5b0e` touches only `usePdfPinchZoom.ts` (+11 in the factor ≈ 1 branch of `commit`), its spec (+3 cases) and MSP-39. These are CR-001's file and behavior; there is no interface or Android change.
- CR-001: **Resolved.**
  - In the same-zoom branch, the live transform is cleared, `nextTick` waits for the untransformed layout, and the scroller moves back by the fingers' movement (`scrollLeft −= Δx`, `scrollTop −= Δy`). `onCommit` then records the new place for the zoom memory.
  - A two-finger rest with no movement changes nothing, and commits that change the zoom are untouched.
  - Specs: a drag at a fixed zoom (→ scroll 170/260), a moving pinch at the 3× cap (→ 480/910), and resting fingers (no change, no commit). The first two fail without the fix.
  - MSP-39 with real CDP touches: a two-finger pan at 2× moves `scrollTop` by 150 px at the same width, with no transform left (IMP-16).
- Other checks: IMP-11 typecheck at baseline, IMP-13 guards and IMP-14/15 builds pass. In IMP-12, the two timeouts are in `CollaborationMessagesOrgRoot.integration.spec.ts`, which this ticket doesn't touch; it passes alone (IMP-12b). The Android checks stand, since there is no Android change.
- Rechecked category: Runtime Correctness 9.4 (restored). The other scores carry forward from CRR-001 (9.4/10 average).
- New findings: none.

## Latest Authoritative Result

- Review Decision: `Pass` (implementation review, round 3, CRR-003, Targeted Delta Review of IR-002)
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4/10, every category ≥ 9.3
- Recommended Recipient: API/E2E engineer
- Notes: U-1 resolved by SR-004 (REQ-006 wording). API/E2E rechecks API-01 (`pan2-hold`, a moving pinch at the 3× cap, the PDF gestures).
