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
| `compaction-auto.jsonl` | Grok 1.0.46: three automatic compactions (`auto_compact_started` → `auto_compact_completed`) |
| `compaction-manual.jsonl` | Grok 1.0.46: `/compact` reporting only `auto_compact_completed` |
| `compaction-cancel-auto.jsonl` | Grok 1.0.46: `session/cancel` during an automatic compaction (start without completion), then a new pair |
| `compaction-cancel-manual.jsonl` | Grok 1.0.46: `session/cancel` during `/compact` (no compaction notification) |
| `compaction-noop.jsonl` | Grok 1.0.46: `/compact` with nothing to compact (completion with equal token counts) |

The `compaction-*` files come from the grok-compaction-analysis probes. Each one combines
`handshake.jsonl`'s `initialize` exchange, a minimal `session/new` result with the recorded
session id, and the recorded traffic. Notifications this layer ignores (`_x.ai/queue/changed`,
`_x.ai/sessions/changed`, `available_commands_update`) are omitted, and the probe's cancel
action is written as the client's `session/cancel`.
