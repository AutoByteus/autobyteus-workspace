# Finalized Delivery Receipt — autobyteus-415 (PRE-001 of autobyteus-407): verified, Terminal

- Package `android-keep-page-on-rotation`; receipt from `/software_engineering_team/delivery_engineer` (run `delivery_engineer_ba17c06c5b2344979e62b8b43461a0fc`), 2026-11-06; archive (read-only) `/Users/normy/autobyteus_org/autobyteus-ticket-archives/android-keep-page-on-rotation-415/tickets/done/android-keep-page-on-rotation/`.

| Check | Evidence | Result |
| --- | --- | --- |
| Finalization | `origin/personal` `e427a0c9cf` (record) on merge `9d5da23341` (parents `3bf9240d42`, `0b4288b1bb`); `git diff 0b4288b1bb 9d5da23341 -- . ':!tickets'` empty | OK |
| Delivered change | `AndroidManifest.xml:31` `android:configChanges="orientation|screenSize|screenLayout|smallestScreenSize|keyboard|keyboardHidden|navigation"` | OK — AC-004 |
| Premise reproduced before the fix | `evidence/IMP-01-before-fix-rotation-reloads-page.txt` (+ screenshots), `IMP-03-before-fix-landscape-input-lost.png`; control test fails without `configChanges` (`API-02-control-test-fails-without-configchanges.txt`) | OK |
| Validation | 95.1%; AC-001…AC-005 proven (API-03 Files view through 0°/270°/90°/0°, no node request, no relaunch; API-08b insets API 34; instrumented tests 13/13 on API 34 and 35; permissions identical) | OK |
| Release | None (user's word required; ships with the next release) | OK — truthful |
| Cleanup | Worktree removed; emulators and test node removed; user's phone and nodes untouched | OK |

- Follow-ups sent to `/project_task_manager` 2026-11-06: FU-001 (screen lost after Android kills the app in the background), FU-002 (cancelling a QR scan clears the typed address). Non-urgent.
- autobyteus-407: PRE-001 delivered; S3 resumes.
