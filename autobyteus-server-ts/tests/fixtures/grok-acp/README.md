# Grok ACP wire fixtures

Recorded `grok agent stdio` (Grok CLI 1.0.41) ACP traffic from the
`grok-build-runtime-support` design probes, sanitized for tests: one JSON-RPC frame per
line as `{"dir":"in"|"out","msg":{...}}` (`in` = agent to client), with user paths,
host name, agent ids and response signatures removed.

| File | Scenario |
| --- | --- |
| `handshake.jsonl` | `initialize` + `session/new` (no prompt) |
| `prompt.jsonl` | one turn: `list_dir`, reply, two model calls (yolo) |
| `permission.jsonl` | shell command behind `session/request_permission` (allow once) |
| `mcp.jsonl` | HTTP MCP server unreachable (`server_status: unavailable`) |
| `mcp2.jsonl` | HTTP MCP via `search_tool` then `use_tool`, four model calls |
| `load.jsonl` | `session/load` replay then a follow-up turn |
| `cancel.jsonl` | `session/cancel` during the first model call |
