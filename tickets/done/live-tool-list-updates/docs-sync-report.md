# Docs Sync Report

## Scope

- Ticket: `live-tool-list-updates` (Project Task `autobyteus-324`), SR-010 / IR-004 / ARCH-REV-010 / CRR-005, CRR-006 / API-REV-002
- Trigger: the code reviewer's pass after the API/E2E test review CRR-006 (`task_size=Large`, `architectural_risk=High`, reviewed route)
- Bootstrap base reference: `origin/personal` @ `9f7c9c10a6`
- Integrated base reference used for docs sync: `origin/personal` @ `e82d03b0f9`, merged as `6fae6761d3`
- Post-integration verification reference: delivery's clean-clone run (`evidence/DEL-*.log`)

## Why Docs Were Updated

- Summary: the change brings its own docs. The new `tool_list_updates.md` plus updates to `agent_tools_mcp_server.md`, `agent_execution.md`, `skill_update_notices.md`, `grok_build_runtime.md` and `antigravity_cli_runtime.md`, and the web `agent_execution_architecture.md` (the card). Delivery checked them against the final code (IR-004):
  - the unsent-input failure is one shared observer;
  - a failed reopen is a plain failed message, with no restart button;
  - Codex and Grok reopen at the next message.
  They match. Delivery added one paragraph to the web `agent_management.md`, which describes saving a definition but did not say that existing runs now take the new tool list.
- Why this should live in long-lived project docs: it is the user-visible outcome the user approved: "when tool change, user does not have to stop manually the agent or team".

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/tool_list_updates.md` (new) | The module's own doc | Updated (by the change; verified) | Names `createUnsentInputFailureObserver`, the single-run and Team-member paths, "Stop, then resume, stays the user's manual way to restart a run" |
| `autobyteus-server-ts/docs/modules/agent_execution.md` (~530-540) | `applied` vs `on_next_turn`, `RUNTIME_SESSION_REOPEN_FAILED` | Updated (by the change; verified) | Consistent with IR-004 |
| `agent_tools_mcp_server.md`, `skill_update_notices.md`, `grok_build_runtime.md`, `antigravity_cli_runtime.md` | Live exposure, notices, per-runtime reopen | Updated (by the change; verified) | — |
| `autobyteus-web/docs/agent_execution_architecture.md` (~1833) | The "Tools updated" card | Updated (by the change; verified) | — |
| `autobyteus-web/docs/agent_management.md` (definition save) | Where a reader of the Agents editor looks | Updated (by delivery) | What existing runs do after a tool-list save, per runtime; links to the server doc and the card |
| Search for "restart button", "new runs only", "stop the agent" wording across non-ticket `*.md` | Older text saying a running agent keeps its old tools | No change | No such text found |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| Server module docs, web architecture doc | By the change | Live tool list updates | REQ-001…REQ-010 |
| `autobyteus-web/docs/agent_management.md` | Delivery | A save with a changed tool list updates existing runs (immediate for AutoByteus, Claude and Antigravity; next message for Codex and Grok; on restore for a stopped run), a "Tools updated" card, removed tools refused, and no card when nothing changed | REQ-001…REQ-009 |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification (with the user's Grok waiver), finalization, and the beta the user asked for
