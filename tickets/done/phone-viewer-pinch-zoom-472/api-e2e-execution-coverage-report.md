# API/E2E Execution Coverage Report — phone-viewer-pinch-zoom-472 (autobyteus-472): pinch, pan and double-tap zoom for PDFs and images in the phone viewer; Download to the phone

## Round

- Coverage investigation: `tickets/in-progress/phone-viewer-pinch-zoom-472/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-005`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 5; Code Reviewer CRR-008 Pass (delta review of IR-004, CR-003 = F-3) on the merged state; code `bb9b300c4a`, docs `1d2d2d9de3`. Rerun by impact: `git diff 3ecfdda33b bb9b300c4a` changes `PdfViewer.vue` (restore and pinch anchor only against the whole layout), `usePdfPinchZoom.ts` (`setZoom` reports whether the layout is whole) and specs; touch mode only. Rerun: API-06 (traced PDF refreshes, image refresh), anchors on a lower page (API-01), API-08 file cases.
- Round 4 trigger (kept for reference): round 4; Code Reviewer CRR-006 Pass (delta review of IR-003, CR-002 = F-2) on the merged state; code `43ef1748da`, docs `e81240959a`. Rerun by impact: `git diff 22f4806207 43ef1748da` changes `PdfViewer.vue` (a touch-only generation rule) and `MobileFileViewer.zoom.spec.ts`; desktop PDF viewing is untouched (the new watch returns without `touchZoom`). Rerun: API-06 live refresh in the app (PDF and image), API-08 phone file cases.
- Round 3 trigger (kept for reference): round 3; Delivery Engineer DR-001 blocked at the re-integration: `origin/personal` moved `ed481ae4ca` → `8641bc393a` (autobyteus-452, merged as `965a6b43c4`), and the phone probe stopped on a duplicate case ID MSP-39 (this ticket's zoom case and 452's live-refresh case). Merged-state code `3eebc0b7a4` (the renumber below on `1eca27d1c3`). Round 3 also proves AC-005 live, which 452's refresh now makes possible.
- Round 2 trigger (kept for reference): round 2; Code Reviewer CRR-003 Pass (delta review of IR-002, CR-001 = F-1); code `1b5b7f5b0e`, docs `dbf487d57c`. Round 1: code `d2b9f99603` (CRR-001), Fail (F-1), `24be7a06bb`.
- Prior round reviewed: round 1 (API-REV-001); F-1 rechecked first. U-1 closed by the Solution Designer (SR-004: REQ-006 covers reloads while the file stays open; reopening after Back starts at 1× by design).
- Rerun plan (rerun by impact): `git diff --stat 24be7a06bb 1b5b7f5b0e` changes `composables/usePdfPinchZoom.ts` (+11), its spec and `tests/e2e/mobile-file-zoom-cases.mjs` (MSP-39) only; no Android, server or other web file. Rerun: API-01 (the PDF gestures, incl. `pan2-hold` and a moving pinch held at the 3× cap) in the app, on a rebuilt phone bundle; the phone probe's file cases (MSP-16, 28…31, 37, 39). Still valid from round 1: API-02 (image viewer), API-03 and API-05 (Download, bridge, saver), API-04 (3× memory; the redraw path is unchanged), API-07's desktop probes and full phone probe except the file cases (the composable runs only in the phone viewer's touch mode).
- Deviations from the investigation's plan, and why:
  - Real touches go through the emulator's touchscreen device (`sendevent`, which needs `adb root` on the google_apis image). A double tap is written to the device in one write: one `sendevent` process per event made the two taps more than 300 ms apart (the composable's double-tap window), so the page saw two single taps (recorded in the transcript, then rerun).
  - The toast is read from the accessibility event it raises (`uiautomator events`): Android 15 does not list a toast in `uiautomator dump` (first image Download step, recorded and rerun).
  - API-06 (AC-005 live): the live refresh could not be triggered from outside the run (see its row); AC-005 rests on its stated verification, the component tests (IMP-09).
- Round 3 changes: this ticket's phone zoom case renumbered MSP-39 → MSP-43 (`3eebc0b7a4`: `mobile-file-zoom-cases.mjs` header, `runCase`, four screenshot names; the case list in `mobile-shell-probe.mjs`); MSP-43 was used by no case or document. Earlier records of this ticket (implementation handoff, code reviews, rounds 1–2 here) name the case MSP-39, its ID at the time.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-viewer-pinch-zoom-472/tickets/in-progress/phone-viewer-pinch-zoom-472/evidence/api-e2e/`
  - `android/journey.md` (round 1) and `r2-android/journey.md` (round 2): every in-app step's exact command and output; `android/shots/`: screenshots; `android/logcat-scan.json`, `android/logcat-app-process-and-downloads.txt`; `scripts/`: the temporary journey tools (`node-and-data.mjs`, `droid.mjs`, `step.mjs`, `state.mjs`, `download.mjs`, `refused-saves.mjs`, `say.mjs`, `watch-reload.mjs`, `logcat-scan.py`, `run-step.sh`).

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review)
- Proportional test-code review decision: `Required`: `autobyteus-web/tests/e2e/mobile-file-zoom-cases.mjs`, `autobyteus-web/tests/e2e/mobile-shell-probe.mjs`, `composables/__tests__/usePdfPinchZoom.spec.ts` (IR-001/IR-002); API/E2E changed no durable test

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | round 2: `dbf487d57c` (code `1b5b7f5b0e`); round 1: `9176e10bb7` (code `d2b9f99603`) | own AVD `apie2e472_api35` (android-35 google_apis arm64, Pixel 6 profile: 1080×2400, density 420, page 412×842 CSS px at DPR 2.625), headless, port 5640, 2 GB RAM | debug APK of this branch (`API-00-apk-build.log`, up to date: no Android file after `617b43165e`); WebView 124.0.6367.219 | `adb root` for input; WebView DevTools socket forwarded to tcp:9472; AVD deleted afterwards |
| ENV-2 | `9176e10bb7` | macOS 26 arm64 | host node `autobyteus-server-ts/dist/app.js` (no server change) serving this branch's phone bundle (`autobyteus-web/dist/public`, built after the last product commit) at `/mobile`; `127.0.0.1:53689` = `10.0.2.2:53689` from the emulator; scripted AGY CLI | temp root, launch credential; paired by a Phone Access link shared into the app (`ACTION_SEND`), at once |
| ENV-3 | `9176e10bb7` | macOS, headless Chrome | phone probe and desktop file probes, clean env | probe-owned stacks |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-IMP | component, JVM, saver, browser parts of AC-001…005 | web, Android | Reused: IMP-00…10 (round 1); IR-002's checks incl. IMP-16 (MSP-39 with a real-touch two-finger pan) on `1b5b7f5b0e` | — | Pass | `evidence/implementation/` | as in the handoffs | round 1: `d2b9f99603` changes one spec assertion after IMP-02 (IMP-09 reran it) |
| API-01 | AC-001, REQ-001, REQ-003 | the app's WebView, real touches | round 2: `r2-android/journey.md` steps `open resume-472.pdf`, `pinch` 1×→2×, `pan2-hold` (2×), `pinch` 2×→3×, `pinch-move-hold` (a pinch at the 3× cap whose centre moves by −100, −120), `swipe`, `pinch` 3×→1×, `dtap` (in, out), `back`; round 1 steps in `android/journey.md` | ENV-1, ENV-2 | Pass (round 2); round 1 Fail (F-1) | `r2-android/journey.md`, `r2-android/shots/API-01-*.png` (`r2-pan2-hold-fingers-down`, `r2-pan2-hold-lifted`, `r2-cap-move-*`); round 1 `android/` | **`pan2-hold`: fingers down `translate(-120.109px, -150.167px)`, lifted: scroll (190, 336) → (310, 486) = the fingers' move, width 759 kept; `pinch-move-hold` at 3×: lifted scroll (560, 897) → (659, 1017), width 1140 kept**; pinches 380 → 759 → 1140 → 380 CSS px with `allBitmapsMatch: true` (sharp); one finger scrolls (+285 at 3×); double tap 380 → 760 → 380 (tap ends 146 ms apart); back returns; `vvScale` 1 and the back arrow at (4, 0) throughout | a first round-2 double tap did not zoom: the page recorded its two taps 544 ms apart (outside the 300 ms window; the emulator was busy after the redraw), noted in the transcript; the run screen pinch (REQ-003) is round 1's (unchanged code) |
| API-02 | AC-002, REQ-002, REQ-003 | same, a 1200×800 PNG | steps `open photo-472.png`, `pinch 206 400 80 240`, `swipe`, two-finger drag, `dtap` ×2, `back` | ENV-1, ENV-2 | Pass | `android/journey.md` API-02, `android/shots/API-02-*.png` | `scale(1)` → `scale(2.99968)`; one-finger pan moves; a two-finger drag stays where the fingers left it; double tap → `scale(1)` (fit) → `scale(2.89078)` (fill); `vvScale` 1; back returns | the image's two-finger drag keeps its place, unlike the PDF's (F-1) |
| API-03 | AC-003, REQ-004, REQ-005 | page → bridge → `DownloadsSaver` → Downloads → toast; logcat | steps `download photo-472.png`, `download resume-472.pdf` (real taps on Download), `refused-saves` (page script posts `saveFile`), the text file opened; `logcat-scan.py` over the whole capture and a final dump | ENV-1, ENV-2 | Pass | `android/journey.md` API-03, `android/shots/API-03-dl-*`, `android/text-file-no-download.json`, `android/logcat-scan.json`, `android/logcat-app-process-and-downloads.txt` | `"toast": "Saved to Downloads: photo-472.png"` (1.5 s), `Download/photo-472.png` 149581 bytes, sha256 = the node's file; the same for `resume-472.pdf` (105463 bytes, 1.7 s); refused with no toast and no row: `text/plain`, `../../evil-472.pdf`, `sub/evil-472.pdf`, a PDF type with `.png`, `text/html`; control `control-472.pdf` saved; text file: `"download": false`; logcat: 0 phone/owner credentials, 0 pairing code, 0 base64 of the files; the app process never logs a saved name (only the system's MediaProvider names its own files); 14 `access_token=` lines are the page's console line with the value `[REDACTED]` (`FileExplorerStreamingService` redacts it) | first image Download (removed from the transcript, noted) saved correctly but missed the toast through `uiautomator dump` |
| API-04 | C-02 / RSK-001 | memory at 3× | `pdf` and `meminfo` steps at 1×, 3×, 3× scrolled to page 12, back at 1×; `dumpsys meminfo` system totals | ENV-1 | Pass (measured; no failure) | `android/journey.md` API-04 | 12 canvases at 2992×3872 = 139 Mpx (about 556 MB at 4 B/px nominal), scrolled to page 12 at 3× with all bitmaps intact, `vvScale` 1; no crash, ANR, OOM or renderer kill in logcat; app PSS 106 → 108 MB, renderer 112 → 120 MB; system "Used RAM" 1.49 GB at 3×, 1.60 GB back at 1× | on this emulator (software GPU) the canvas backing does not show in PSS or system RAM, so real-phone memory at 3× stays unmeasured (residual RSK-001) |
| API-05 | RSK-002 | a 25 MB PDF over the bridge | steps `open big-472.pdf`, `download big-472.pdf`, `meminfo` | ENV-1, ENV-2 | Pass | `android/journey.md` API-05 | open 6.7 s; toast "Saved to Downloads: big-472.pdf" 3.3 s after the tap; 25239558 bytes, sha256 = the node's; app PSS 120 → 206 MB, renderer 220 → 291 MB; no crash | one base64 message holds |
| API-06 | AC-005, REQ-006 (live) | reload of the open file | (1) `pinch` to 2×, `back`, `open resume-472.pdf` again; (2) `say.mjs` puts `inside-472.pdf` in the run's folder, the phone opens it, zooms to 2× and scrolls, `live-refresh` rewrites it on the node and samples the viewer for 15 s | ENV-1, ENV-2 | (1) starts at 1×, as SR-004 decided (U-1 closed); (2) Not reproducible | `android/journey.md` API-06 | (1) reopened at `pagesCssWidth 380`, scroll 0 (the holder lives while the file is open); (2) `sawLoading: false`, no reload in 15 s, zoom unchanged | a change from outside the run raises no live refresh (452 follows the run's own file changes); AC-005 is proven by its stated verification (IMP-09) |
| API-07 | AC-004 | preserved phone and desktop behavior (round 2: the phone probe's file cases `--cases=MSP-16,MSP-28,MSP-29,MSP-30,MSP-31,MSP-37,MSP-39`, all Pass, cleanup clean, 0 unknown browser errors: `r2-API-07-mobile-shell.log`) | `env -i … pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=…`; `… test:e2e:search-pdf-preview`; `… test:e2e:file-explorer-pending-save-draft` | ENV-3 | Pass for this ticket's cases; 3 out-of-scope failures | `API-07-mobile-shell.log`, `API-07-mobile-shell/mobile-shell-probe.json`, `API-07-search-pdf-preview*`, `API-07-file-explorer-pending-save-draft*` | 36 of 39 MSP `Pass` incl. MSP-39, MSP-16, MSP-28…31, MSP-37; cleanup `rootRemoved: true`, `unknownBrowserErrors: 0`; `{"API-002":"Pass","API-003":"Pass"}`; `PSD-001…011 Pass` | MSP-24/34/35 (Task rows after TODO) are autobyteus-471's FU-003 (same failures; nothing of this ticket). VNC zoom: `MobileNodeDesktop.spec.ts` (20) and `usePictureZoom.spec.ts` (IMP-02); the same composable ran in the app in API-02 |
| API-08 | AC-004 on the merged state; the renumber | full phone probe after `pnpm -C autobyteus-server-ts build` and `build:mobile-web` on the merged state | `env -i … pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=…` | ENV-3 (round 3, `3eebc0b7a4`) | Pass | `r3-API-08-mobile-shell.log`, `r3-API-08-mobile-shell/mobile-shell-probe.json`, `r3-builds.log` | 43 of 43 `Pass`: this ticket's MSP-43; 452's MSP-39…42; the baseline-fixed MSP-22, MSP-24/34/35, MSP-32; cleanup `rootRemoved: true`, `unknownBrowserErrors: 0` | the duplicate-ID guard passes; the merged state no longer has round 1–2's MSP-24/34/35 failures (fixed by 452's baseline fixes) |
| API-06 r3 | AC-005, REQ-006 (SR-004: reloads while the file stays open) live | the app on the merged state; `live-472.pdf` and `live-472.png` in the run's folder (452 watches it) | `r3-android/journey.md`: `live-files.mjs setup`; `open live-472.pdf`, `pinch` to 2×, `swipe`, `live-reload pdf` (rewrite on the node, sample 150 ms) ×2; `open live-472.png`, `pinch`, `swipe`, `live-reload png`, `image-content` | ENV-1 (round 3), ENV-2 | **Fail (F-2)** for the PDF; Pass for the image | `r3-android/journey.md`, `r3-android/shots/API-06-*`, `r3/node-and-data.log` | **PDF: reloaded (viewer element replaced) at 779 ms and 601 ms; zoom kept (`pagesCssWidth` 759 = 2×), position lost: scroll (190, 933) → (0, 0) and (0, 599) → (0, 0), still (0, 0) seconds later**; image: a new blob URL at 736 ms (content refreshed: red 120 = the rewrite's colour), `translate(-437.374px, -595.373px) scale(2.49968)` unchanged | one rewrite also remounted the PDF's pages twice (the element was gone at ~1 s and back at 1.3 s) |
| API-06 r4 | AC-005, REQ-006 live (F-2 recheck) | the app on the merged state with IR-003 | `r4-android/journey.md`: `live-472.pdf` zoomed to 2× and scrolled, rewritten on the node 5 times; fresh opens (A, B), the exact round-3 sequence (C–E), first refresh after an app restart (F, G); traced trials `restore-trace` (6), `fling-after-pinch` (8), `refresh-soon-after-scroll` (3 + 3 + 5 late), `deep-restore-trace` (6, programmatic positions); `live-472.png` zoomed, panned, rewritten twice | ENV-1 (round 4), ENV-2 | **Fail (F-3)** for the PDF; Pass for the image | `r4-android/journey.md`, `r4-android/late-trials.json`, `r4-android/restore-trace.json`, `r4-android/fling-after-pinch.json`, `r4-android/shots/` | zoom kept in every refresh; position kept in most (rewrite 2 (189, 1142) → (189, 1142); a double redraw kept it, `restore-trace` trial 1); **position wrong when the restore lands on a partial layout: `late-trials` trial 2 frame `[5399 ms, top 0, height 3496, 12 canvases, 2 sized]` → top 846 (= 2861 / 11816 × 3496), trial 4 `[4828, 0, 2664, 12, 1]` → 384 (= 1702 / 11816 × 2664); rewrite 1 751 → 486**; image: red 230 → 120, new blob URLs, `translate(-434.776px, -595.373px) scale(2.49968)` kept twice | `fling-after-pinch` trial 4 (4609 → 5697) was a measurement artifact: the scroll moved late and the restore matched the position at the refresh |
| API-08 r4 | AC-004, MSP-43 | phone probe file cases on the merged state with IR-003 | `--cases=MSP-16,MSP-28,MSP-29,MSP-30,MSP-31,MSP-37,MSP-39,MSP-40,MSP-41,MSP-42,MSP-43` | ENV-3 | Pass | `r4-API-08-mobile-shell.log` | 11 of 11 Pass; cleanup clean; 0 unknown browser errors | — |
| API-06 r5 | AC-005, REQ-006 live (F-3 recheck) | the app on the merged state with IR-004 | `r5-android/journey.md`; `refresh-soon-after-scroll.mjs 6 late` (touch drags, the mode that failed in round 4) and `restore-trace.mjs 4`, both traced per frame; `live-472.png` zoomed, panned, rewritten twice | ENV-1 (round 5), ENV-2 | Pass | `r5-android/late-trials.json`, `r5-android/restore-trace.json`, `r5-android/journey.md`, `r5-android/shots/` | 10 of 10 PDF refreshes: the restore frame is `height 11816, 12 canvases, 12 sized` and the position exact (784, 1219, 1666, 2109, 2544, 3001, 3298, 3595, 4007, 4225); partial frames (1832, 2664, 9320) occurred and were waited out; image: red 230 → 120, new blob URLs, `translate(-430.359px, -595.373px) scale(2.49968)` kept twice | — |
| API-01 r5 | REQ-001 anchor on a lower page | the app | `pinch 206 500` 1×→2× on page 8, `dtap` out and in, `pinch 206 450` 2×→3×; `scripts/anchor.py` | ENV-1, ENV-2 | Pass | `r5-android/journey.md`, `r5-android/shots/API-01-r5-anchor-*` | the point under the fingers moved ≤ 5 px (y 0.6671 → 0.6675, 0.6759 → 0.6756, 0.6756 → 0.6753, 0.6626 → 0.6629), page 8 throughout, `allBitmapsMatch: true` | at 1× the page fits the width, so the double tap out cannot keep the horizontal point |
| API-08 r5 | AC-004, MSP-43 | phone file cases on the merged state with IR-004 | `--cases=MSP-16,MSP-28,…,MSP-43` | ENV-3 | Pass | `r5-API-08-mobile-shell.log` | 11 of 11 Pass; cleanup clean; 0 unknown browser errors | — |
| C-08 | REQ-004 Android 8–9 Save dialog | — | — | — | Not Tested | — | — | no Android 8–9 system image installed (only 29, 34, 35); installing one changes the user's SDK. The forced Save-dialog path ran on Android 10 and 15 (IMP-08, IMP-10) |

## Round 4 Failure Resolution

| Failure ID | Fix (IR-004, CRR-008) | Round 5 recheck |
| --- | --- | --- |
| F-3 | the place is put back, and a zoom's anchor scrolled, only once every page canvas has the current zoom's width (a 10 s bound gives up without scrolling) | 10/10 traced refreshes restore at the whole height; anchors hold on page 8 — Resolved |
| F-2 | (round 4) | still holds (10/10) — Resolved |

## Round 4 Failures

| Failure ID | Case / Criteria | Expected | Observed | Preliminary Classification | Recommended Owner |
| --- | --- | --- | --- | --- | --- |
| F-3 | API-06 r4; AC-005, REQ-006 | After 452 refreshes an open, zoomed, scrolled PDF, its position is put back | The position is put back against a partial layout in some refreshes (traced 2 of 5 in `late-trials`, plus round 4's rewrite 1): `PdfViewer.vue` `onTouchLoaded` waits on `pagesLaidOutAt(renderWidth)`, which resolves as soon as the **first** page's canvas (`.vue-pdf-embed__page canvas`) has the CSS width; while later pages are still unsized the scroller is only partly tall (2664 px with 1 page sized, 3496 with 2), and `scrollTop = scrollTopRatio × scrollHeight` uses that partial height, putting the view higher in the document (2861 → 846, 1702 → 384). When the whole layout arrives in the same frame (most refreshes, including every programmatic-scroll trial), the position is exact. F-2's own path (resetting `placed` per generation) works. | Local Fix (implementation): put the position back only when every page is laid out (all page canvases sized, or the scroller's height at its full size), or as a position relative to a page; a spec where the pages are sized one by one | Implementation Engineer, through failure-origin review |

## Round 3 Failures

| Failure ID | Case / Criteria | Expected | Observed | Preliminary Classification | Recommended Owner |
| --- | --- | --- | --- | --- | --- |
| F-2 | API-06 r3; AC-005, REQ-006 (as SR-004 words it: a live refresh, autobyteus-452, keeps zoom and position) | A zoomed, scrolled PDF that is refreshed while open keeps its zoom and its position | The zoom stays (2×) but the position goes to the top-left (twice, reproducible). Cause (`components/fileExplorer/viewers/PdfViewer.vue`): 452 refreshes an open PDF in the same `PdfViewer` instance (`url` / `contentRevision` change; no "Opening…" state, no remount of the viewer), so `zoom` survives; the pages are drawn again and the scroller collapses to the top; `onTouchLoaded` runs again but returns at `if (placed) return`, so the remembered position is never put back, and `onScroll` (placed) then remembers the top as the position. The design's "Zoom state across reloads" and the AC-005 component tests assume every reload passes through `isLoading` (viewer unmounted and mounted again); 452's in-place refresh, merged after the design, takes the other path. The image keeps its place because its zoom state lives in the same instance and only the image's src changes. | Local Fix (implementation): a reload of the same file in the same `PdfViewer` (url / contentRevision change) must put the remembered position back after the new layout and must not remember positions while the pages are being redrawn; a `MobileFileViewer`/`PdfViewer` spec for a same-instance reload | Implementation Engineer, through failure-origin review |

## Round 1 Failures And Their Resolution

| Failure ID | Round 1 | Fix (IR-002, CRR-003) | Round 2 recheck |
| --- | --- | --- | --- |
| F-1 | a two-finger move on a zoomed PDF with no zoom change followed the fingers, then jumped back (`usePdfPinchZoom.commit` returned without scrolling when the factor was ≈ 1) | on a same-zoom commit the transform is cleared and the pages scroll by the fingers' move | API-01 `pan2-hold` at 2× and `pinch-move-hold` at the 3× cap keep the pages where the fingers left them — Resolved |
| U-1 | REQ-006 wording for reopening after Back | closed by the Solution Designer (SR-004): REQ-006 covers reloads while the file stays open; reopening after Back starts at 1× by design | round 2 reopen started at 1× (as decided) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 (rounds 1 and 2), R-IMP (MSP-39) | Proven in the app: pinch in/out to 3×, sharp redraw, two-finger and one-finger pan, page scroll, double tap, the back arrow, the run screen never zooms | a real phone's fingers |
| AC-002 | Yes | API-02, R-IMP | Proven | — |
| AC-003 | Yes | API-03, API-05, R-IMP (IMP-07, IMP-08, IMP-10) | Proven (Android 10+ path; Android 8–9 only by the forced-path instrumented test) | — |
| AC-005 | Yes | API-06 r5 (live, merged state), R-IMP (IMP-09, IR-003/IR-004 specs) | Proven live: across 452's refresh a zoomed, scrolled PDF keeps zoom and position (10/10 traced, against the whole layout) and an image keeps zoom and pan | — |
| AC-004 | Yes | API-08 (merged state), API-07, R-IMP | Proven: 43/43 phone cases on the merged state | — |

## Validation Confidence Scorecard (Mandatory)

Round 5 (merged state with IR-004):

| Confidence Category | Final Score | What Supports It | Residual Uncertainty |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 96% | AC-001…005 proven in the app or by their stated verification; AC-004 suites | — |
| Changed-boundary execution directness | 96% | the app, real input, 452's watcher and refresh, frame traces | — |
| Cross-boundary integration realism and mock gap | 95% | page → bridge → Downloads; 472 × 452 run for real | Android 8–9 dialog (accepted by the user) |
| Environment, configuration, identity, and fixture fidelity | 93% | merged-state builds, real pairing, own AVD | emulator, software GPU |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | partial layouts waited out, double redraws, refused saves, 25 MB, 3× | real-phone memory (user-only, accepted) |
| User-surface, browser, and desktop-shell confidence | 96% | gestures, anchors, Download, refresh in the app; phone probe | — |
| Durable regression coverage quality and relevance | 94% | `PdfViewer.touchLayout.spec.ts` (pages sized one by one), in-place reload spec, MSP-43, drag/cap specs | the in-app journeys are temporary probes |

- Overall final confidence: 95% (95.0%, simple average)
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`

Round 4 (merged state with IR-003): the same as round 3 except: requirement proof 80% (AC-005 PDF position intermittent, F-3), failure/edge evidence 88% (traced cause), user surface 88%; overall 87%; not a Pass.

Round 3 (merged state):

| Confidence Category | Final Score | What Supports It | Residual Uncertainty |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | AC-001…004 proven; AC-005 live proven for the image | AC-005 PDF position (F-2) |
| Changed-boundary execution directness | 96% | the app, real input, 452's real watcher and refresh | — |
| Cross-boundary integration realism and mock gap | 85% | the 472 × 452 interplay run for real | the component tests mock the reload path that 452 does not take |
| Environment, configuration, identity, and fixture fidelity | 93% | merged-state builds, real pairing, own AVD | emulator |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | live refresh twice, image and PDF | F-2 |
| User-surface, browser, and desktop-shell confidence | 85% | phone probe 43/43, app journeys | F-2 is visible: a refreshed PDF jumps to its top |
| Durable regression coverage quality and relevance | 85% | MSP-43, specs | no test of a same-instance PDF reload with zoom memory |

- Overall final confidence: 86% (simple average); not a Pass: F-2 fails a critical criterion
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` (AC-005)
- Round 2's scorecard (94%, Pass) applied to the pre-merge state.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: Android emulator with the app's debug build (real input events, WebView DevTools for state), a test-owned node; browser probes
- Gap it addressed: the app's WebView input path, the bridge and Downloads end to end, memory at 3×, a large message; it found F-1, which the specs and MSP-39 (pinches with a zoom change only) did not exercise

## Persisted-Data Transition Checks

- Approved decision: `Not Affected`

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or retained: `No`

## Durable Coverage Changed In The Codebase

Round 3: `autobyteus-web/tests/e2e/mobile-file-zoom-cases.mjs` and `mobile-shell-probe.mjs` (`3eebc0b7a4`, the MSP-39 → MSP-43 renumber, API/E2E). Before: none by API/E2E. IR-002 added `usePdfPinchZoom.spec.ts` cases (drag, cap) and MSP-39's real-touch two-finger pan; they go to the proportional test-code review.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| A phone | Android 15 emulator (Pixel 6 profile, 2 GB, software GPU) | no device here | memory at 3×; real fingers |
| Model inference | scripted AGY CLI | an agent message naming the files | transport only |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| AVD `apie2e472_api35`, emulator-5640 | Yes | `adb emu kill`, `avdmanager delete avd` | deleted; `adb devices` empty; the other AVDs untouched |
| Host node and its temp root | Yes | SIGTERM; root removed by the script | none left |
| ADB forward tcp:9472 | Yes | `adb forward --remove-all` (serial emulator-5640) | removed |
| `/tmp/abtest472/state.json` (probe credential), `pairing-link.txt`, pulled files | Yes | deleted | — |
| Probe stacks (API-07) | Yes | probes' own cleanup | receipts clean |
| Evidence secret scan | — | `own_`/`mra_` 20+ chars, the pairing code, `access_token=` with a value | no match (the `access_token=` lines carry `[REDACTED]`) |

## Latest Authoritative Result

- Result: `Pass` (round 5, merged state with IR-004)
- Criteria not proven, or parts only the user can check: memory at 3× on a real low-end phone (user-only); not tested: the Android 8–9 Save dialog on a real 8–9 system (both accepted by the user, DR-001)
- Durable test changes for the proportional test-code review: `3eebc0b7a4` (`mobile-file-zoom-cases.mjs`, `mobile-shell-probe.mjs`: MSP-39 → MSP-43, API/E2E); the implementation's `MobileFileViewer.zoom.spec.ts` (in-place reload), `PdfViewer.touchLayout.spec.ts`, `usePdfPinchZoom.spec.ts`
- Next recipient: Code Reviewer — proportional test-code review
- Notes: a new Android APK is needed for Download; release only on the user's word.
