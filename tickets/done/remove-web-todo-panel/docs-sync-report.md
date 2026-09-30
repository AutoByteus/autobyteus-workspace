# Docs Sync Report — remove-web-todo-panel

## Scope

- Ticket: `remove-web-todo-panel`. Classification preserved: `task_size=Large`, `architectural_risk=High`, route `Independent review`.
- Trigger: API/E2E Pass (API-REV-001, 95%), relayed by `api_e2e_engineer` with a user request to release a beta. The user confirmed the request directly to delivery on 2026-09-30.
- Bootstrap base reference: `origin/personal@43b6fc0f4`.
- Integrated base reference used for docs sync: `origin/personal@5c6fb95ea` (`v1.4.92-beta.2` line), merged into the ticket branch as `38fa470f9`.
- Post-integration verification reference: `delivery-evidence/post-integration-*.log`.

## Why Docs Were Updated

- The implementation commit `05b41091c` already updated 8 long-lived docs for the To-Do removal and the Background Tasks behavior.
- Delivery found two remaining problems against REQ-005:
  - Two web docs said the list shows Claude "background shells, subagents, monitors and workflows". In AutoByteus only Claude background shell commands can occur: `Agent`, `Task` and `Workflow` are disallowed and `Monitor` is not in the enabled tool list (`autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts:92-98`).
  - Five active docs still listed "todo" as a stream activity or message kind. The to-do event type no longer exists in the server, the contracts or the web client.

## Long-Lived Docs Reviewed

| Doc Path | Result | Notes |
| --- | --- | --- |
| `autobyteus-web/docs/agent_execution_architecture.md` | Updated | Claude task kinds corrected; "todo" removed from the ordinary-activity list |
| `autobyteus-web/docs/settings.md` | Updated | Same two corrections |
| `autobyteus-web/docs/agent_integration_minimal_bridge.md` | Updated | "todo" removed from the ordinary-activity list |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Updated | Agent event list: "todo" → "background task" (`BACKGROUND_TASK_UPDATED` is in `@autobyteus/team-stream-contracts`) |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Updated | "todo" removed from the ordinary-activity list (the implementation had already added the background-task section) |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`, `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md`, `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md`, `autobyteus-ts/docs/agent_team_streaming_protocol.md`, `autobyteus-web/docs/terminal.md` | No change | Already updated by `05b41091c`; still accurate on the integrated state |
| `autobyteus-web/docs/projects.md`, `autobyteus-server-ts/docs/modules/projects.md` | No change | `TODO` there is the Project Task status, which is out of scope and unchanged |

## Docs Updated

- Commit `d3bb082a5`: the 5 files marked Updated above (7 lines).

## Removed / Replaced Components Recorded

- The to-do event type, store, handler and panel are removed. The Background Tasks section and `BACKGROUND_TASK_UPDATED` replace them. The docs above no longer describe a to-do path.

## Result

- Docs sync result: `Updated`
- Blocker: none
