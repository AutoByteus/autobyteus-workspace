# Docs Sync

## Scope

- Ticket: `codex-mcp-tool-approval-bridge`
- Trigger Stage: `9`
- Result: `No impact`
- Latest Check: `Repeat docs-sync recheck after Stage 8 Round 4`

## Review Outcome

- No long-lived operator or product documentation required an update.
- The durable truth for this ticket lives in:
  - repository-resident backend unit tests
  - repository-resident frontend lifecycle unit tests
  - repository-resident live Codex websocket E2E tests
  - the ticket workflow artifacts
- The parsed-state follow-up fix changed runtime normalization, not a public user-facing setup flow or an operator procedure that belongs in long-lived prose docs.

## Long-Lived Docs Reviewed

| Path | Result | Notes |
| --- | --- | --- |
| `README.md` | No change | sandbox and live-test guidance remain accurate |
| `docs/` | No change | no applicable long-lived docs exist in this repo |

## Durable Knowledge Promoted

- Manual Codex MCP tool calls bridge to visible public approval events and terminal public execution events.
- Auto-executed Codex MCP tool calls remain frontend-visible through normalized `tool_call` segment events and now also end through normalized public `TOOL_EXECUTION_SUCCEEDED` / `TOOL_EXECUTION_FAILED` events.
- The frontend terminal green-state behavior depends on the public tool lifecycle contract, not on `SEGMENT_END` or `TOOL_LOG` alone.
- Those truths are intentionally kept in durable tests and ticket artifacts rather than new long-lived prose docs.

## Final Decision

- Docs impact: `No impact`
- Follow-up needed: `No`
