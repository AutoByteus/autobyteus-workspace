# Live Browser Validation — Classroom and Nested Classroom

- Date: 2026-08-28 (Europe/Berlin)
- Browser surface: AutoByteus `open_tab` against the web-equivalent development frontend at `http://127.0.0.1:3000`
- Backend surface: isolated ticket worktree development server at `http://127.0.0.1:8000`
- Runtime data root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/.autobyteus/development/server-data`
- Server/browser correlation log: `17-dev-stack-browser.log`
- Result: **PASS**

## Environment and package setup

1. Imported `/Users/normy/autobyteus_org/autobyteus-agents` as a local Agent Package.
2. Imported `/Users/normy/autobyteus_org/autobyteus-private-agents` as a local Agent Package.
3. UI inventory showed:
   - public package: 7 shared agents, 54 team-local agents, 15 teams;
   - private package: 40 shared agents, 25 team-local agents, 9 teams.
4. Imported the configured secret identifiers from `/Users/normy/.autobyteus/server-data/.env` into the isolated development runtime with the repository CLI. Secret values were not printed or copied to evidence. The sanitized result is in `19-secret-import.log`.
5. Verified both `Classroom Simulation Team` and `Nested Classroom Test Team` appeared through the browser Agent Teams catalog.

Screenshot: `20-agent-packages-imported.png`.

## Scenario BROWSER-CLASSROOM-CODEX

Configuration through the browser launch panel:
- Team: `Classroom Simulation Team`
- Runtime: `Codex App Server`
- Model: `OpenAI / GPT-5.4-Mini`
- Auto approve tools: enabled
- Workspace: isolated Temp Workspace

Observed pre-stop journey:
1. Submitted a browser message to `/professor` requiring a live ordinary `send_message_to` roundtrip with `/student`.
2. The browser event stream displayed the professor's `send_message_to` tool invocation.
3. The same browser conversation received an inbound message from the exact student run with `CLASSROOM_STUDENT_REPLY_1`.
4. Professor completed with `CLASSROOM_ROUNDTRIP_1_OK` and included the exact student reply.

Observed stop/restore journey:
1. Clicked the browser `Terminate team` control; professor changed to `Offline`.
2. Submitted a new message into the same persisted Team history. The frontend invoked normal Team restore before submission.
3. Server log re-published the same root Team and stable member identities:
   - Team: `classroom_simulation_team_192d0deb9b864bc19f67adf007e3fe7f`
   - professor: `professor_e558f271a2ed4e8abe61ab4d7aeee949`
   - student: `student_1fad6d6407f244e7997622a5fa6307c2`
4. The restored professor sent another message to the same student route.
5. The browser received `CLASSROOM_STUDENT_REPLY_2`; professor completed with `CLASSROOM_ROUNDTRIP_2_OK`.
6. No `session unavailable` response appeared.

Screenshots:
- `21-classroom-codex-roundtrip-before-stop.png`
- `22-classroom-codex-roundtrip-after-restore.png`

Note: one extra agent-created Codex delegated run logged an unrelated Codex-native `invalid agent id` warning, and restored shell commands logged two unified-exec creation warnings. Neither interrupted the required Agent Tools ordinary message route; both required exact student replies arrived and both professor turns completed. These are recorded as non-blocking runtime-noise observations, not hidden.

## Scenario BROWSER-NESTED-DEEPSEEK

Configuration through the browser launch panel:
- Team: `Nested Classroom Test Team`
- Runtime: `AutoByteus`
- Model: `DeepSeek / deepseek-v4-flash` (the UI's DeepSeek V4 Flash model)
- Nested team and all three members inherited the same global runtime/model
- Workspace: isolated Temp Workspace

Observed pre-stop journey:
1. Teacher invoked ordinary `send_message_to` to the exact nested team address `/StudentStudyGroup` after browser approval.
2. Expanded the browser Team tree, selected stable `/StudentStudyGroup/student_one`, and approved its exact `send_message_to` reply to `/Teacher`.
3. Teacher received `NESTED_TEAM_ROUTE_1` from the stable nested coordinator.
4. Teacher invoked `delegate_task` to exact nested team address `/StudentStudyGroup` after browser approval.
5. Expanded the transient task-team tree and selected its transient `student_one` execution.
6. Approved exact `submit_task_result` payload `NESTED_CLASSROOM_OK`.
7. Teacher received the result, invoked `review_task_result`, and accepted it through the browser approval control.
8. UI showed the durable task record as `Accepted` and Teacher completed with `NESTED_BROWSER_ROUND_1_OK`.

Observed stop/restore journey:
1. Clicked `Terminate team`; Teacher changed to `Offline`.
2. Submitted a continuation into the same Team history, invoking normal restore.
3. Server log restored the same stable identities and `DeepSeekLLM` runtime:
   - Team: `nested_classroom_test_team_7ac778e70ebb4e8dbd753d32a8467840`
   - Teacher: `test_teacher_e05daf3930154d739f2d343b86a8d79a`
   - stable student_one: `student_one_f61d749e3d9f4d6bb9e5b77b9b60156d`
4. Teacher again used the same ordinary team address `/StudentStudyGroup`.
5. Restored stable student_one replied with exact `NESTED_TEAM_ROUTE_2`.
6. Teacher completed with `NESTED_BROWSER_RESTORE_OK`.
7. No `session unavailable` response appeared.

Screenshots:
- `23-nested-classroom-deepseek-roundtrip-before-stop.png`
- `24-nested-classroom-deepseek-after-restore.png`

## Cleanup

- Terminated the final browser Team.
- Closed browser tab `4d57d4` through the browser tool.
- Stopped the ticket-owned development stack; the server log records graceful AutoByteus AgentRuntime and WebSocket session cleanup.
- Two unrelated long-running listeners already owned by other workspaces remain on wildcard IPv6 ports 8000 and 3000; they predate this run and were intentionally preserved.
