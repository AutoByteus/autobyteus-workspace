# Docs Sync Report — phone-viewer-pinch-zoom-472 (autobyteus-472)

## Scope

- Ticket: autobyteus-472: pinch, pan and double-tap zoom for PDFs and images in the phone viewer, and Download to the phone. `task_size` `Medium`, `architectural_risk` `High`, route `Reviewed`.
- Trigger: code reviewer CRR-004 Pass.
- Bootstrap base reference: `ed481ae4ca`
- Integrated base reference used for docs sync: `origin/personal` `ed481ae4ca` (already current; no integration)
- Post-integration verification reference: not needed (no new base commits)

## Why Docs Were Updated

- Summary: the ticket documented the zoom (`GLOSSARY.md`, `autobyteus-web/docs/remote_access.md`) and the `saveFile` bridge message and `DownloadsSaver` (`autobyteus-android/README.md`, `remote_access.md`). Delivery added Download to `docs/android_mobile_access.md`, the Android app's guide, which did not mention it.
- Why this should live in long-lived project docs: Download is an Android app feature with a version dependency (an older app ignores it); the app's guide owns what the app does.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `GLOSSARY.md`, `autobyteus-web/docs/remote_access.md`, `autobyteus-android/README.md` | zoom, the `saveFile` bridge message, `DownloadsSaver` | No change | updated in the ticket; `saveFile` named in all three |
| `autobyteus-web/docs/remote_access.md` | the phone viewer's reload rule (DR-002) | **Updated** | aligned with SR-004: a reload while open keeps zoom and position (452's in-place refresh; a PDF's place only against the whole layout, CR-003); Back ends it |
| `docs/android_mobile_access.md` | the Android app's guide | **Updated** | Download in the app's ownership list; a paragraph on how it saves, Android 10+ vs 8–9, and that an older app ignores it |
| `DESIGN.md` | project design | No change | no new convention |
| `TESTING.md` | testing guideline | No change | the new instrumented test (`DownloadsSaverTest`) is listed in `autobyteus-android/README.md`, where instrumented tests are listed |
| `RELEASE.md` | release guide | No change | |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `docs/android_mobile_access.md` | addition | Ownership: "saving the page's PDFs and images to the phone's Downloads (the viewer's **Download**)". New paragraph: the page reads the file with its own credential and passes the bytes over `saveFile` (no credential in the bridge); the app saves only a PDF or image whose extension matches its type; Android 10+ straight to Downloads, Android 8–9 through the Save dialog; an older app ignores the message (checked: `ShellBridge.kt` on `personal` maps an unknown type to `null`, ignored); a phone browser uses its own download | REQ-004, REQ-005 |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: the user's decisions on the two open validation gaps, then finalization (no release unless the user asks).

## DR-002 (after the merge with autobyteus-452)

- Integrated base: `origin/personal` `8641bc393a` (merged as `965a6b43c4`; unchanged at DR-002's fetch).
- `autobyteus-web/docs/remote_access.md`: "The zoom and position stay while the same file reloads (a live refresh, an explicit open again …); another file starts at 1×" → while a file stays open, a reload keeps zoom and position (452's live refresh redraws in place; opening the same file again while shown); a PDF's place is put back only once every page is laid out; closing the viewer (Back) ends it, so a later open or another file starts at 1× and the top (SR-004).
