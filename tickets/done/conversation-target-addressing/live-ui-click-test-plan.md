# Live UI Click Test Plan: Task-Team Child Conversation Targeting

## Goal

Use the real frontend in a browser (`open_tab`) against the real backend to prove that selecting a child member inside a live task-team projection and sending from the composer produces the correct typed `conversation_target_address`.

## Why This Test Exists

The feature is not just parser/router logic. The real user flow is: a task team appears in the workspace, the user focuses/clicks a child member inside that task team, and the frontend sends a message to that exact runtime target rather than falling back to the structural team/member route.

## Test Steps

1. Start the real built backend with isolated data on `127.0.0.1:18000`.
2. Start the real Nuxt frontend on `127.0.0.1:13000`.
3. Seed a parent team:
   - coordinator: `coordinator`
   - nested team: `BuildSquad`
   - child members: `review_lead`, `qa_specialist`
   - runtime/model: `codex_app_server` / `gpt-5.5` where available.
4. Open the real workspace using `mcp__autobyteus_agent_tools.open_tab`.
5. Install a browser-side WebSocket send capture hook with `run_script`.
6. Send a real frontend composer message to `coordinator` instructing it to call `delegate_task` targeting `BuildSquad`.
7. Wait until the task-team runtime projection appears in the UI.
8. Click the child member inside the task-team projection (`review_lead`).
9. Send a real frontend composer message from that focused child context.
10. Verify the captured websocket `SEND_MESSAGE` payload contains:
    - `conversation_target_address.segments[0].kind = "member"`
    - first member targets the structural team/logical boundary (`BuildSquad` or equivalent)
    - a `task_team` segment with the live task-team run id
    - a terminal `member` segment for child `review_lead`
11. Verify backend/projection evidence shows no structural fallback to the parent structural member route.
12. Cleanup all live processes and terminate the seeded team run.

## Pass Criteria

- Real UI opened with `open_tab`.
- Task-team projection appears from a real delegation event.
- UI click focuses the task-team child member.
- Composer send emits typed `conversation_target_address` for that child member.
- Evidence files include screenshot/DOM/payload JSON.

## Failure / Blocker Criteria

- If Codex/model runtime cannot create the task-team projection in the local environment, record as a real environment blocker, not a pass.
- Do not replace the click-through path with synthetic service-only sends.
