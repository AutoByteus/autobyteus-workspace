# R2 desktop journey (isolated instance of ee5e87495f)

- Instance `iso-63586-f2d5`, from `AUTOBYTEUS_TEST_VAULT=… pnpm isolated-app start --build`. It was stopped afterwards: wasRunning true, forced false, dataRootRemoved true; no test processes left.
- Daily Assistant ran on the AutoByteus runtime with claude-fable-5 (real, from the test vault). The renderer's zone is Europe/Berlin.
- Restarts used `window.electronAPI.restartServer()`.

| Step | Observed | Files |
| --- | --- | --- |
| 1. Background `sleep 900`; FIRST_REPLY_STARTED | the task is running | — |
| 2. Restart (09:45 UTC) | The app returned `status: error`: "Server shutdown exceeded 10s; forcing exit", exit code 1. That is the server's own 10 s shutdown budget under load (load ~70), the same class as 448's FU-009. The second message went unanswered while the node was down | state-1-live-after-restart-1.json (empty view while offline) |
| 3. Restart (09:51 UTC, `running`), then a message; THIRD_REPLY (live) | **1 card** ("10:51 CET"); every reply once | state-2-live-after-restart-2.json, 02-live-after-restart-2.png |
| 4. Reload of the live (idle) run | **1 card**; every reply once. This is round 1's step 5, which showed 3 | state-3-after-reload-live-run.json, 03-after-reload-live-run.png |
| 5. A message (SECOND_REPLY, background build again), restart (09:53 UTC), a message; FOURTH_REPLY (live) | **2 cards** ("10:51 CET", "10:53 CET"); every reply once | state-4-live-after-restart-3.json, 04-live-after-restart-3.png |
| 6. Reload of the live run | **2 cards**; every reply once | state-5-after-reload-live-run.json, 05-after-reload-live-run.png |
| 7. New chat on Claude Agent SDK (claude-haiku-5-5): background Bash `sleep 20; echo CLAUDE_BG_DONE`; CLAUDE_STARTED; the task completes | the notice "Background task completed: …" **once** live and **once** after a reload; the reply once | state-6-claude-live.json, state-7-claude-after-reload.json, 06/07 png |
| Stored traces | `turn_0001..0004`; the notices in `turn_0002` and `turn_0004` each have their own `message_id` and keep "09:51 UTC" / "09:53 UTC" | traces-turn-ids.txt |
