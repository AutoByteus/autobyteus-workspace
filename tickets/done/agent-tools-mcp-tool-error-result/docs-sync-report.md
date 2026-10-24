# Docs Sync Report

## Scope

- Ticket: `agent-tools-mcp-tool-error-result` (Project Task `autobyteus-232`), SR-001 / IR-001 / API-REV-001
- Trigger: API/E2E validation Pass (API-REV-001), direct low-risk route (`task_size=Small`, `architectural_risk=Low`)
- Bootstrap base reference: `origin/personal` @ `1138e8fbef`
- Integrated base reference used for docs sync: `origin/personal` @ `ea817b2431`, merged into the ticket branch as `7df5b0a3f3`
- Post-integration verification reference: DEL-01…DEL-04 (`evidence/DEL-0*.log`)

## Why Docs Were Updated

- Summary: `mcp_server_management.md` said the Agent Tools MCP endpoint "currently answers any external tool failure with JSON-RPC `Internal error`, so they do not see this text". This ticket changes exactly that behavior, so the sentence was false after the fix. `agent_tools_mcp_server.md` said nothing about how a failed configured MCP tool call is answered.
- Why this should live in long-lived project docs: the endpoint's answer to a failed call is part of the contract that AGY, Codex and Claude rely on, and the native runtime and the Agent Tools endpoint now report the same text.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` (failed-connect text, ~line 127-143) | It described the external runtimes' `Internal error` | Updated | — |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` ("Supported Tool Families", configured MCP-origin tools) | Owns the endpoint's tool-call behavior | Updated | The integrated version includes autobyteus-290's renames; no conflict |
| `autobyteus-server-ts/docs/modules/agent_execution.md` (~906-946), `agent_memory.md` (~330) | How `isError: true` results become `TOOL_EXECUTION_FAILED` and memory entries | No change | They already describe `isError` results generically; the live Codex/Claude events (`TOOL_EXECUTION_FAILED … TURN_COMPLETED`) match |
| Search for `mcp-http-auth-agent-tool-call`, `Internal error`, `-32603` across non-ticket `*.md` | Other descriptions of the old behavior or of the e2e gates | No change | Only the e2e file's own header names it; that header was updated in `253854bf8d` |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` | Correction | AGY, Codex and Claude now get the same failure text as an `isError` tool result; link to the Agent Tools doc | REQ-001, REQ-002 |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | New behavior | A failed configured tool call (the tool throws, or it is no longer available at call time) is answered with `isError: true` and one text item with the failure message, not JSON-RPC `Internal error`. No token or header value; a remote server's own body text is passed on as it is (R-01) | REQ-001…REQ-002, DEC-001…DEC-003 |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Configured MCP tool failures on the Agent Tools endpoint | A tool failure is a tool result (`isError`), while protocol errors stay JSON-RPC errors. This follows the MCP specification and matches the browser and media adapters | `requirements-doc.md` DEC-001…003, `design-spec.md` | `agent_tools_mcp_server.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| A configured tool failure thrown to the dispatcher as JSON-RPC `-32603 Internal error` | An `isError` tool result returned by `ConfiguredMcpRegistryToolAdapter` | `agent_tools_mcp_server.md`, `mcp_server_management.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification from the evidence, then finalization
- Notes: no follow-ups were found.
