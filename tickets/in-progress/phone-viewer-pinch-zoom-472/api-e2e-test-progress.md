# API/E2E Test Progress — phone-viewer-pinch-zoom-472 (autobyteus-472)

| Time (UTC) | Case ID | Event | Result | Notes |
| --- | --- | --- | --- | --- |
| 2026-11-11T17:25:21Z | API-01 | Started | — | setup: debug APK build, AVD, node |
| 2026-11-11T17:38:11Z | API-03 | Started | — | Download of the PNG and the PDF in the app |
| 2026-11-11T17:39:57Z | API-05 | Started | — | 25 MB PDF Download |
| 2026-11-11T17:42:45Z | API-01 | Completed | Fail (F-1) | app on emulator API 35: run screen does not zoom on a pinch; PDF 1x->2x->3x->1x pinches sharp (bitmaps = CSS x DPR), one-finger scroll, double tap 1x<->2x, back arrow, page scale 1 throughout; F-1: a two-finger drag with no zoom change (or at the 3x cap) follows the fingers then jumps back on lift |
| 2026-11-11T17:42:45Z | API-02 | Completed | Pass | image: open, pinch to 3x, one-finger pan, two-finger drag kept, double tap fit<->fill, back |
| 2026-11-11T17:42:45Z | API-03 | Completed | Pass | PNG and PDF saved to Download with same bytes and toast; 5 bad saveFile refused (no toast, no file); valid control saved; text file has no Download; logcat: no credential, code, bytes; app logs no names |
| 2026-11-11T17:42:45Z | API-04 | Completed | Pass (measured) | 12-page PDF at 3x: 139 Mpx canvases, scrolled to page 12, no crash; PSS does not show canvas memory on the emulator |
| 2026-11-11T17:42:45Z | API-05 | Completed | Pass | 25 MB PDF opened 6.7 s, saved in 3.3 s, same bytes; app PSS +87 MB during the message; no crash |
| 2026-11-11T17:42:45Z | API-06 | Completed | Not fully reproducible | Back + reopen of the same file starts at 1x (holder lives while open; REQ-006 '450' wording unclear); a disk change of an open in-folder PDF triggers no reload in 15 s; AC-005 rests on IMP-09 |
| 2026-11-11T17:42:45Z | API-07 | Started | — | full mobile-shell probe, clean env |
| 2026-11-11T18:10:57Z | API-07 | Completed | Pass for this ticket's cases | phone probe 36/39 incl. MSP-39 (MSP-24/34/35 = 471 FU-003); search-pdf-preview, file-explorer-pending-save-draft Pass |
| 2026-11-11T18:10:57Z | — | Round result | Fail | F-1 (AC-001: PDF two-finger move without zoom change snaps back); U-1 (REQ-006 reopen wording); 87% |
