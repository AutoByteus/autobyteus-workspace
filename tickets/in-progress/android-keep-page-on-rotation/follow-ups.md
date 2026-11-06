# Follow-ups — android-keep-page-on-rotation (autobyteus-415)

| ID | Found by (role, document) | What is wrong, where | Evidence | Why it is outside this ticket | Urgent (`Yes`/`No`) | Suggested Task description | Sent (to, date) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FU-001 | Solution Designer, investigation-notes.md AR-01 | When Android kills the app in the background (memory pressure) and the user returns, `MainActivity.onCreate` reopens the saved node's start URL: the open screen is lost | `MainActivity.kt:38-67`; no saved-state handling in `app/src/main/java` | Rotation is fixed by not recreating the activity; process death always recreates it and needs a saved route (e.g. the last `/mobile` URL in `onSaveInstanceState`) | No | "Android app: after the system kills it in the background, reopen the last page (save the WebView's current `/mobile` URL on stop and open it on restore), with an emulator check (`adb shell am kill` while in background)." | |
