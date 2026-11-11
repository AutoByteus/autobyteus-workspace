# Requirements Document — phone-viewer-pinch-zoom-472 (autobyteus-472)

## Document Status

- Status: `Approved` (by the user, 2026-11-11)
- Current solution revision ID: `SR-001`
- Requested by: `/project_task_manager` for the user
- Date: 2026-11-11
- Approved by and reference: Solution Designer within the direction (the Task and the user's two comments: zoom "for the current being only PDF and image"; "provide a downloader capability ... I'm able to download it somehow", the team picks the simplest that works on Android); the user was informed in the Solution Designer's conversation and approved the decisions: "You will make the decision for me I will approve your decision I think you can make a reasonable decision thanks a lot" (2026-11-11).
- Behavior-defining supplements: none

## Problem And Desired Outcome

- A PDF opened on the phone shows at page width and its text is too small; images do not zoom on touch; the file cannot be saved to the phone.
- Desired: pinch zoom in and out, pan, and double tap for PDFs and images in the phone viewer; a Download action that saves the PDF or image to the phone's Downloads. Nothing else changes.

## Scope Guardrail

- In scope: UC-001 pinch/pan/double-tap zoom of PDFs and images in the phone viewer; UC-002 Download of a PDF or image to the phone.
- Out of scope: other file types; the desktop viewers (unchanged); what files may be opened (436/471); iOS app changes (named only); a share sheet.
- Preserved: the viewer's back arrow, scrolling through PDF pages, the app page itself not zoomable, the desktop image viewer's mouse zoom, the VNC viewer's zoom.
- Prerequisites: none (471 goes first only to avoid editing the same files twice).
- Review Authority: as in the project's requirement template; new behavior is a `Requirement Gap` for the user.

## Requirements

| ID | Requirement | Decision |
| --- | --- | --- |
| REQ-001 | In the phone viewer, a PDF zooms with a two-finger pinch (1× = page width, up to 3×) around the pinch centre, pans by dragging when zoomed, and still scrolls through its pages; a double tap toggles between 1× and 2× at the tapped point. Text stays sharp at every zoom (pages are drawn again at the new width when the pinch ends). | DEC-001 |
| REQ-002 | In the phone viewer, an image zooms the same way (fit up to 4×, pan, double tap fit ↔ fill), as the VNC viewer's picture does. | — |
| REQ-003 | The app page outside the viewer never zooms; the back arrow and the bar stay in place at every zoom. | — |
| REQ-004 | A PDF or image open in the phone viewer has a Download button in the viewer's bar. In the Android app it saves the file under its own name to the phone's Downloads (Android 10 and newer directly; Android 8–9 through the system's Save dialog) and shows "Saved to Downloads: <name>" or "Couldn't save the file."; in a phone browser it uses the browser's download. | DEC-002 |
| REQ-005 | The node's credential never goes into a URL, a file name, a bridge message or a log; the download uses the bytes the page already fetched with the phone's credential. Only PDFs and images can be saved, under a plain file name (no folders). | — |
| REQ-006 | When the open file is reloaded for the same path (a live refresh, autobyteus-452, or an explicit open again, 450), the zoom and position stay; only opening another file starts at 1×. | — |

## Acceptance Criteria

| AC | REQ | Expected | Verification |
| --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-003 | Android app, a PDF of several pages: pinch in/out, pan, page scroll, double tap work; the back arrow returns; the run screen does not zoom | Android emulator or device probe (the API/E2E engineer's choice), component tests |
| AC-002 | REQ-002 | Same for an image | Same |
| AC-003 | REQ-004, REQ-005 | Download saves the PDF and the image to Downloads with their names and shows the message; a non-PDF/image save request is ignored by the app; no credential in the bridge message or logs | Android probe + JVM tests of the bridge message rules |
| AC-005 | REQ-006 | A zoomed PDF and image keep their zoom and position when the same file is reloaded (its URL changes, through the viewer's loading state); another file starts at 1× | `MobileFileViewer` component tests |
| AC-004 | Preserved | Desktop image and PDF viewers, VNC zoom, existing phone probes unchanged | Existing suites |

## Decisions

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | PDF zoom range and double tap | 3× makes small print readable; every page is drawn again at the new width, so more would cost much memory on long PDFs; double tap 1× ↔ 2× is the usual reading gesture | Solution Designer | Decided |
| DEC-002 | Downloads folder or share sheet? | The user wants "the file on the phone"; Downloads is the plain, predictable place, needs no permission on Android 10+, and he can send it from there; a share sheet is a second path and can be added later | Solution Designer | Decided |
