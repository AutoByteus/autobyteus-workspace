# Handoff Summary — phone-viewer-pinch-zoom-472 (autobyteus-472)

## What Ships

- PDFs and images in the phone's file viewer zoom by touch: pinch in and out (PDFs to 3×, redrawn sharp; images to 4×), pan with one or two fingers, double tap; a PDF still scrolls through its pages; a reload of the open file keeps its zoom (REQ-006 as worded in SR-004).
- **Download** in the phone viewer: in the Android app the PDF or image is saved to Downloads ("Saved to Downloads: <name>"); in a phone browser it uses the browser's download. **It needs the new Android APK**; an older app does nothing on Download.

## Classification

- `task_size` `Medium`, `architectural_risk` `High`, route `Reviewed` (CRR-001 Pass; CRR-002 failure-origin: CR-001 Local Fix, U-1 closed by SR-004; CRR-003 Pass; API-REV-002 Pass 94%; CRR-004 Pass).

## Integrated State

- Branch `codex/phone-viewer-pinch-zoom-472`, already current with `origin/personal` `ed481ae4ca` at delivery: no integration, no rerun needed.

## Verification

- From the evidence: AC-001…AC-005 proven in the Android 15 app with real MotionEvents (API-REV-002, 94%).
- Open for the user's decision: the Android 8–9 Save dialog on a real 8–9 system (tested only by forcing that path on Android 10 and 15; installing an 8–9 image changes the user's SDK), and RSK-001, memory at 3× on a real low-end phone (emulator measured: no crash, app memory 106 → 108 MB).

## Residual Risks And Follow-ups

- iOS is not built. RSK-002 measured: a 25 MB PDF saved in 3.3 s.
- MSP-24/34/35 are autobyteus-471 FU-003, not this ticket.

## Release

- No release unless the user asks. The phone gets Download only with a release that carries the new APK.
