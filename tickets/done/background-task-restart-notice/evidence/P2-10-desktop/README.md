# P2-10 desktop journey (isolated instance of this build)

- Build: worktree at 4c93deaa8f (code ce06c415cc), `isolated-app start --build` with the test vault; instance iso-56317-2d8b, own data dir and ports; stopped after (wasRunning true, forced false, dataRootRemoved true, ports released).
- Agent: Daily Assistant (native AutoByteus runtime) on gpt-5.4-mini; real model calls `run_bash` with `run_in_background: true` (`sleep N; echo …`).
- Read with `state.js` (header status text, Stop/Send buttons, status dots); each `state-*.json` is one reading; each png is the screen at that moment.

| Step | Observed | Files |
|---|---|---|
| 1. One background task started, turn ended | header "Background task running", dot `bg-blue-500`, no Stop, Send shown | state-1-background.json, 01-background-1.png |
| 2. Second message while the task runs | "Running" with Stop 123 ms after send (turn in progress), then "2 background tasks running", no Stop | state-2-second-message.json, 02-two-tasks.png |
| 3. Page reload with both running | "2 background tasks running" restored from the snapshot | state-3-after-reload.json, 03-after-reload.png |
| 4. Language set to 简体中文 (Settings language select) | header "空闲" after both ended; notices for both tasks arrived with "Still running:" for the first | state-4-zh-CN.json, 04-zh-CN.png, 05-zh-after-ends.png |
| 5. Two new tasks in zh-CN | "2 个后台任务运行中", then "后台任务运行中" when one ended, then "空闲" | state-5-zh-two.json, state-6-zh-one.json, state-7-zh-idle.json, 06/07/09 png |
| 6. Background Tasks panel (zh-CN) | collapsed "上次运行 1 · 已记录 4"; expanded "1 个运行中 · 共 4 个" (autobyteus-473 panel, unconfirmed state = "Current count unavailable" in English) | 08-zh-panel.png |

AC-006: the second message (step 2) started a turn at once while a task ran.
Not raised: an `initializing` flicker (idle → initializing → idle) after each turn end, pre-existing; the "Send message" aria-label stays English in zh-CN, out of scope.
