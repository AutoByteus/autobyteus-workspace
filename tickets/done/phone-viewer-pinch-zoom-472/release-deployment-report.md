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
- Status: `Blocked`; nothing merged into `personal`.
