# Handoff Summary — phone-viewer-pinch-zoom-472 (autobyteus-472)

## What Ships

- PDFs and images in the phone's file viewer zoom by touch: pinch in and out (PDFs to 3×, redrawn sharp; images to 4×), pan with one or two fingers, double tap; a PDF still scrolls through its pages; a reload of the open file keeps its zoom (REQ-006 as worded in SR-004).
- **Download** in the phone viewer: in the Android app the PDF or image is saved to Downloads ("Saved to Downloads: <name>"); in a phone browser it uses the browser's download. **It needs the new Android APK**; an older app does nothing on Download.

## Classification

- `task_size` `Medium`, `architectural_risk` `High`, route `Reviewed` (CRR-001 Pass; CRR-002 failure-origin: CR-001 Local Fix, U-1 closed by SR-004; CRR-003 Pass; API-REV-002 Pass 94%; CRR-004 Pass).

## Integrated State

- Branch `codex/phone-viewer-pinch-zoom-472`: current with `ed481ae4ca` at DR-001; `origin/personal` then moved to `8641bc393a` (autobyteus-452), merged as `965a6b43c4`. The duplicate phone case MSP-39 was renumbered MSP-43; two Local Fixes (CR-002, CR-003) made a live refresh keep a zoomed PDF's position; API-REV-005 Pass 95% on the merged state; CRR-009 Pass.

## Verification

- From the evidence: AC-001…AC-005 proven in the Android 15 app with real MotionEvents; AC-005 now live across 452's refresh (10/10 exact PDF restores; the image keeps its zoom); 43/43 phone cases on the merged state, MSP-43 11/11 after the last fix (API-REV-005, 95%). The desktop PDF viewer's path is untouched by CR-002/003 (every changed line is in the touch-zoom section), so the round-2 desktop PDF probe still holds.
- Accepted by the user: the Android 8–9 Save dialog on a real 8–9 system (tested by forcing that path on Android 10 and 15) and RSK-001, memory at 3× on a real low-end phone (emulator: no crash, 106 → 108 MB).
- For the Solution Designer (non-blocking, CRR-009): AR-001 assumes viewers are remounted on reload; media viewers are redrawn in place (452).

## Residual Risks And Follow-ups

- iOS is not built. RSK-002 measured: a 25 MB PDF saved in 3.3 s.
- MSP-24/34/35 are autobyteus-471 FU-003, not this ticket.

## Release

- No release unless the user asks. The phone gets Download only with a release that carries the new APK.
