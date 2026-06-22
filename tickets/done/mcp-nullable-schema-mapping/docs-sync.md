# Docs Sync: MCP Nullable Schema Mapping

## Scope

- Ticket: mcp-nullable-schema-mapping
- Trigger Stage: 9
- Workflow state source: `tickets/done/mcp-nullable-schema-mapping/workflow-state.md`

## Why Docs Were Updated

- Summary: The long-lived TypeScript tool-schema design doc now records how external MCP JSON Schema input schemas are mapped into AutoByteus `ParameterSchema`, including supported nullable single-type `anyOf`/`oneOf` and `type: [T, null]` forms.
- Why this change matters to long-lived project understanding: The bug fix changes stable mapper behavior for configured MCP-origin tools. Future maintainers should know that optional nullable MCP arrays/objects are intentionally unwrapped and exposed as their non-null type, while true multi-type unions remain unsupported/conservative.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-ts/docs/tool_schema_and_configuration.md` | Canonical TypeScript doc for `ParameterSchema`, runtime argument schemas, and schema conversion behavior. | Updated | Added MCP-origin JSON Schema mapping section. |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Describes Agent Tools MCP configured-tool exposure and media tool contracts. | No change | Existing content remains accurate; this ticket changes TypeScript import mapping, not Agent Tools MCP routing or protected media adapters. |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` | Describes external MCP consumption/import side and how `ToolOrigin.MCP` definitions are exposed. | No change | Existing high-level import/exposure flow remains accurate; nullable mapping detail belongs in `autobyteus-ts` schema documentation. |

## Docs Updated

| Doc Path | Type Of Update | What Was Added / Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-ts/docs/tool_schema_and_configuration.md` | Runtime schema design documentation | Added `MCP-Origin JSON Schema Mapping` section; documented nullable `anyOf`/`oneOf`, `type: [T, null]`, metadata preservation, configured MCP media example, and conservative multi-type union behavior. | Promote mapper behavior from ticket-local knowledge into long-lived TypeScript schema docs. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| MCP nullable schema mapping | Nullable single-type MCP schemas map to non-null AutoByteus types; `generate_video.input_images` remains array-shaped; complex true unions are not guessed. | `investigation-notes.md`, `requirements.md`, `implementation.md`, `api-e2e-testing.md` | `autobyteus-ts/docs/tool_schema_and_configuration.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Implicit/default fallback of nullable MCP schemas to string | Explicit nullable single-type resolution inside `McpSchemaMapper` | `autobyteus-ts/docs/tool_schema_and_configuration.md` |

## No-Impact Decision

N/A. Docs were updated.

## Final Result

- Result: Updated
- If `Blocked` because earlier-stage work is required, classification: N/A
- Required return path or unblock condition: N/A
- Follow-up needed: Optional parity follow-up for Python `autobyteus/tools/mcp/schema_mapper.py` if that mapper is used in another runtime path.
