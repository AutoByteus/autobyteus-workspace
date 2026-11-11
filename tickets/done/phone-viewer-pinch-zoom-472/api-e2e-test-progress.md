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
| 2026-11-11T18:42:58Z | — | Round 2 plan | — | IR-002 code 1b5b7f5b0e: usePdfPinchZoom.ts + spec + MSP-39 only. Rerun API-01 PDF gestures (pan2-hold, moving pinch at the 3x cap, pinch in/out, swipe, dtap) and the phone probe's file cases; API-02..05, API-07 desktop still valid |
| 2026-11-11T18:42:58Z | API-01 | Started | — | round 2: phone bundle, AVD, node |
| 2026-11-11T18:49:08Z | API-01 | Completed | Pass | round 2 (1b5b7f5b0e): pan2-hold at 2x lifted scroll +120/+150 = the fingers' move; moving pinch at the 3x cap kept (+99/+120); 1x->2x->3x->1x sharp; one-finger scroll; double tap both ways (taps 146 ms apart; a first try 544 ms apart is the injection, noted); back; vvScale 1 |
| 2026-11-11T18:49:08Z | API-07 | Started | — | round 2: mobile-shell file cases MSP-16,28,29,30,31,37,39 |
| 2026-11-11T18:57:37Z | API-07 | Completed | Pass | round 2: MSP-16, 28-31, 37, 39 Pass; cleanup clean |
| 2026-11-11T18:57:37Z | — | Round result | Pass | round 2 (API-REV-002): F-1 resolved; 94% (gap: Android 8-9 image) |
| 2026-11-11T20:08:57Z | — | Round 3 | — | delivery DR-001 blocked: duplicate MSP-39 after the merge with 452 (965a6b43c4); renumbered ours to MSP-43 (3eebc0b7a4); plan: server + phone bundle rebuild, full phone probe on the merged state, AC-005 live in the app |
| 2026-11-11T20:09:50Z | API-08 | Started | — | full mobile-shell probe on the merged state, clean env |
| 2026-11-11T20:36:00Z | API-08 | Completed | Pass | merged state: 43/43 MSP Pass incl. MSP-43 (this ticket) and 452's MSP-39..42, MSP-22/24/32/34/35; cleanup clean, 0 unknown browser errors |
| 2026-11-11T20:36:00Z | API-06 | Started | — | round 3: AC-005 live in the app on the merged state |
| 2026-11-11T20:50:22Z | API-06 | Completed | Fail (F-2) | round 3 live on the merged state: image keeps zoom+position across 452's refresh (new blob URL 736 ms); PDF reloads in the same viewer (601-779 ms) and keeps zoom 2x but its scroll goes to (0,0), twice |
| 2026-11-11T20:50:22Z | — | Round result | Fail | round 3 (API-REV-003): duplicate ID fixed (MSP-43, 43/43 probe Pass); F-2 (AC-005 PDF position); 86% |
| 2026-11-11T21:04:30Z | — | Round 4 plan | — | IR-003 code 43ef1748da: PdfViewer.vue (touch-only generation rule) + spec. Rerun: API-06 live refresh in the app (PDF x2 + image), phone probe file cases incl. MSP-43 and 452's MSP-39..42; desktop untouched (touchZoom guard) |
| 2026-11-11T21:05:06Z | API-06 | Started | — | round 4: live refresh in the app, merged state + IR-003 |
| 2026-11-11T21:25:15Z | API-06 | Completed | Fail (F-3) | round 4: image keeps zoom+pan across 2 refreshes; PDF keeps zoom always and position in most refreshes (double redraw incl.), but the position is put back against a partial layout when only the first page(s) are sized: traced 2861->846 (height 3496, 2/12 canvases sized), 1702->384 (2664, 1/12), and the earlier 751->486 |
| 2026-11-11T21:25:15Z | API-08 | Started | — | round 4: phone probe file cases on the merged state |
| 2026-11-11T21:33:57Z | API-08 | Completed | Pass | round 4: 11/11 file cases incl. MSP-43, MSP-39..42 |
| 2026-11-11T21:33:57Z | — | Round result | Fail | round 4 (API-REV-004): F-2 path fixed; F-3 partial-layout restore (traced); 87% |
| 2026-11-11T21:51:46Z | — | Round 5 plan | — | IR-004 code bb9b300c4a: PdfViewer.vue (restore and pinch anchor only against the whole layout) + usePdfPinchZoom.ts + specs. Rerun: API-06 traced live refreshes (PDF), pinch/double-tap anchor on a lower page, image refresh; phone file cases incl. MSP-43 |
| 2026-11-11T21:57:58Z | API-06 | Completed | Pass | round 5: 10/10 traced PDF refreshes restored at height 11816 (partial frames 1832/2664/9320 waited out), positions exact; anchors on page 8 within 5 px for pinch 1->2, dtap out, dtap in, pinch 2->3; image zoom+pan kept across 2 refreshes |
| 2026-11-11T21:57:58Z | API-08 | Started | — | round 5: phone file cases |
| 2026-11-11T22:06:36Z | API-08 | Completed | Pass | round 5: 11/11 file cases incl. MSP-43 |
| 2026-11-11T22:06:36Z | — | Round result | Pass | round 5 (API-REV-005): F-3 resolved; 95% |
