# V-04 desktop journey (isolated instance of this build)

- Instance `iso-54485-374f`, from `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault pnpm isolated-app start --build` at 238be7dbc0, with its own data root and ports. It was stopped afterwards: wasRunning true, forced false, dataRootRemoved true.
- Daily Assistant ran on the AutoByteus runtime with model claude-fable-5 (real, through the test vault), auto-approve on. The renderer's zone is Europe/Berlin.
- The server was restarted with `window.electronAPI.restartServer()`, the app's own restart. Readings come from `state.js`: the reminder cards' text and how often each input and reply appears.

| Step | Observed | Files |
| --- | --- | --- |
| 1. Background `sleep 900` started; FIRST_REPLY_STARTED | the task is running | — |
| 2. Restart 1 (06:42 UTC), then the second message; SECOND_REPLY (live, no reload) | **2 cards** for one restart ("07:42 CET"); every input and reply once | state-1-live-after-restart-1.json, 01-live-after-restart-1.png |
| 3. Restart 2 | The app returned `status: error`: "Backend shutdown incomplete: Backend exit not confirmed". The stop took ~19 s and ended by a signal under load. At 06:49:56 the app restarted the server itself, with "Restart reminder: 1 run(s) to tell". Before the reload the view showed 1 card for restart 1 and the run "Offline" | state-1b-after-failed-restart-before-reload.json |
| 4. Reload, then the third message; THIRD_REPLY | **3 cards** for two restarts: 07:42 once, 07:49 twice (one above "You", one at the start of the reply); every reply once | state-2-live-after-restart-2.json, 02-live-after-restart-2.png |
| 5. Reload while the run is live (idle) | still **3 cards** (07:49 twice) | state-3-after-reload.json, 03-after-reload.png |
| Stored traces | turn_0001 (input, FIRST_REPLY_STARTED); turn_0002 (notice, input, SECOND_REPLY); turn_0003 (notice, input, THIRD_REPLY). Notices are stored as "06:42 UTC" and "06:49 UTC" | traces-turn-ids.txt |

The restart error in step 3 is the app's stop budget under load, not this ticket's change.
