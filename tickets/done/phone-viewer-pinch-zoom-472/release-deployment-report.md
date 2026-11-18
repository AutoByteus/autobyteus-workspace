# Delivery / Release / Deployment Report — phone-viewer-pinch-zoom-472 (autobyteus-472)

## Release / Publication / Deployment Scope

- Ticket branch `codex/phone-viewer-pinch-zoom-472`; `task_size` `Medium`, `architectural_risk` `High`, route `Reviewed`.
- Release: **none** (not requested). Download needs the new Android APK, so users get it with the next release.

## Project Release Guide

- `RELEASE.md` on `origin/personal` `ed481ae4ca`. Deviations: `None`. Proposed fixes: `None`.

## Handoff Summary

- `tickets/done/phone-viewer-pinch-zoom-472/handoff-summary.md` (`Updated`); `delivery-revision-record.md`, `DR-001`.

## Initial Delivery Integration Refresh

- Bootstrap base `ed481ae4ca`; latest `origin/personal` checked `ed481ae4ca`; base advanced: `No`.
- Checkpoint: `dc725e0473` (the Solution Designer's uncommitted SR-004 edits to `requirements-doc.md` and `solution-revision-record.md`; the code reviewer's three records). The two full web test logs (`evidence/implementation/IMP-02-web-nuxt-tests.log`, `IMP-12-…`) stay uncommitted as the implementation intended; their committed excerpts are cited.
- Integration: `Already current`; post-integration rerun: `No` (no new base commits; the validated state is the delivered state).

## Verification

- Evidence judged: `Sufficient`, with two gaps the user accepted. API-REV-002 Pass, 94%, no category below 90%.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 | API-01 `evidence/api-e2e/r2-android/journey.md` | the Android 15 app with real MotionEvents: `pan2-hold` lifted scroll (190, 336) → (310, 486), width kept (the CR-001 fix); pinches 380 → 759 → 1140 → 380 CSS px with `"allBitmapsMatch": true` (sharp) | Proven |
| AC-002 | API-02 `android/journey.md` | `scale(1)` → `scale(2.99968)`; pans; double tap fit/fill | Proven |
| AC-003 | API-03, API-05 `android/journey.md` | `"Saved to Downloads: photo-472.png"`; the saved file's sha256 `e151a304…1831` = the node's; refused with no toast and no row: `text/plain`, `../../evil-472.pdf`, `sub/evil-472.pdf`, mismatched extension, `text/html`; 25 MB PDF saved in 3.3 s | Proven (Android 10+; Android 8–9 by the forced Save-dialog path on Android 10 and 15) |
| AC-005 | R-IMP IMP-09 | component tests, as the AC states; REQ-006 scope settled by SR-004 | Proven |
| AC-004 | API-07 | 36/39 MSP Pass incl. MSP-39; `PSD-001…011`, `API-002/003` Pass; MSP-24/34/35 = autobyteus-471 FU-003 | Proven for this ticket |

- More evidence requested: `None`.
- User decisions (2026-11-11, "accept both i would say"):
  - **Android 8–9 Save dialog on a real 8–9 system: accepted, not tested.** Running it needs an API 26–28 emulator image installed into the user's SDK. Delivery's judgement: the same app code and the same system dialog ran through the forced path.
  - **RSK-001, memory at 3× on a real low-end phone: accepted.** Emulator: a 12-page PDF at 3×, no crash, app PSS 106 → 108 MB (API-04). The user can try it with the new APK.

## Release Decision

- Decision: `No release`. Decided by: the release guide's default; the user asked for none. A release with the new APK is available on his word.

## Docs Sync Result

- `docs-sync-report.md`: `Updated` (`docs/android_mobile_access.md`).

## Release Notes Summary

- `tickets/done/phone-viewer-pinch-zoom-472/release-notes.md` (the ticket's; "update the Android app" for Download).

## Re-integration Before The Final Merge (Blocked)

- After verification, `origin/personal` had advanced `ed481ae4ca` → `8641bc393a` (autobyteus-452: an open file refreshes when it changes on disk, with phone probe cases MSP-39…42; baseline fixes for MSP-22, MSP-24/34/35 and the duplicate MSP-32). The ticket branch had already been pushed (`305f25b472`); `personal` was not touched.
- Merged `origin/personal` into the ticket branch: `965a6b43c4`. One import conflict in `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` (`runFileZoomCases` vs `runLiveFileRefreshCases`); both kept.
- Post-integration check: `node tests/e2e/mobile-shell-probe.mjs --cases=MSP-39` → `mobile-shell probe: duplicate case IDs MSP-39 (mobile-file-zoom-cases.mjs, mobile-live-file-refresh-cases.mjs)`, exit 1 (`evidence/delivery/DR1-probe-duplicate-id.log`). The probe's guard stops every run, so no phone probe case can run on the merged state.
- Classification: this ticket's test code, after the base merge (this ticket's MSP-39 and 452's MSP-39); the owner is API/E2E. Also, 452's live refresh now makes AC-005 / REQ-006 (zoom kept when the open file reloads) reproducible live; API-06 could not before.
- Recommended recipient: API/E2E engineer: renumber this ticket's zoom case to a free ID, rerun the phone probe on the merged state, and prove AC-005 live with 452's refresh.
- Status (DR-001): `Blocked`; nothing merged into `personal`.

## DR-002 — Re-entry after API-REV-005 and CRR-009

- Trigger: code reviewer CRR-009 Pass. Since DR-001: `3eebc0b7a4` renumbered this ticket's case MSP-39 → MSP-43; API-REV-003 (merged state) failed F-2 → CR-002 (`43ef1748da`, IR-003): a live refresh lost a zoomed PDF's position; API-REV-004 failed F-3 → CR-003 (`bb9b300c4a`, IR-004): the position was put back against a partial layout; API-REV-005 Pass at 95%. Checkpoint `176048dbbc` (the reviewer's CRR-005…009 records).
- `origin/personal` at DR-002's fetch: `8641bc393a`, unchanged since the merge `965a6b43c4`; no further integration.
- Verification from the evidence (re-judged):
  - AC-005 (API-06 r5, `evidence/api-e2e/r5-android/`): 10/10 refreshes of a zoomed 12-page PDF restore against the whole layout (`height 11816, 12 canvases, 12 sized`), positions exact; partial-layout frames were waited out; the image kept `translate(-430.359px, -595.373px) scale(2.49968)` across two refreshes with new blob URLs.
  - REQ-001 anchor on a lower page (API-01 r5): the point under the fingers moved ≤ 5 px, `allBitmapsMatch: true`.
  - AC-004 (API-08): 43/43 phone cases on the merged state (this ticket's MSP-43; 452's MSP-39…42; the baseline-fixed MSP-22, 24/34/35, 32), then MSP-43 11/11 after each fix.
  - The desktop PDF viewer (PSD-001…011, round 2): CR-002/CR-003 change `PdfViewer.vue` only in the touch-zoom section (`git diff -U0`: hunks from line 97; the desktop's `onLoaded` at lines 86–88 and its template branch `@loaded="onLoaded"` unchanged; the new `watch` returns unless `props.touchZoom`), and the full web suite passes on `bb9b300c4a` (IMP-32: 757 files, 5709 tests). The round-2 desktop evidence therefore still holds.
  - Judgement: `Sufficient`. The user's two accepted gaps are unchanged.
- Docs: `autobyteus-web/docs/remote_access.md` aligned with SR-004 (see `docs-sync-report.md`, DR-002).

## Repository Finalization (DR-002)

- Ticket branch `codex/phone-viewer-pinch-zoom-472` at `9b04e814ee`: Secret Gate PASS, pushed.
- Finalization target `origin` / `personal`; advanced after re-verification: `No` (`8641bc393a` at each fetch).
- Merge: `finalize/phone-viewer-pinch-zoom-472` from `origin/personal`, `git merge --no-ff` → `e6d3902477`; Secret Gate PASS; pushed `8641bc393a..e6d3902477`.
- User's checkout of the target branch (`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`): brought up with `git merge --ff-only origin/personal` after this record is pushed; the result is in the terminal message.
- Repository finalization status: `Completed`.

## Release / Publication / Deployment

- Applicable: `No` (none requested). Download reaches phones only with a release that carries the new Android APK.

## Post-Finalization Cleanup

- Worktree removal and prune (the four uncommitted full test logs and build output go with it); local `codex/` and `finalize/` branches deleted (both in `origin/personal`); remote branch kept. Result in the terminal message.

## Final Status

- Verification: `Yes` (from the evidence; two gaps accepted by the user). Repository finalization: `Yes`. Release: `Not required`. Blocker: `None`. Terminal package eligible: `Yes`.
