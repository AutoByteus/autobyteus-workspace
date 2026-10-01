# Antigravity runs show the real MCP tool

## Changes
- **Antigravity tool calls are named after the tool that ran.** An MCP call used to appear as `call_mcp_tool` in the Activity panel and conversation. It now appears as the real tool, for example `delegate_task` or `send_message_to`.
- **Arguments are the tool's own.** The `ServerName`, `ToolName` and `Arguments` wrapper is no longer shown.
- **Tools from other MCP servers** are named `mcp__<server>__<tool>`.
- **Results that are JSON are shown as structured JSON.**
- Runs recorded before this version keep showing `call_mcp_tool`.
