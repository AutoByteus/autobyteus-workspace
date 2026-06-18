# Requirements: MCP JSON View Preview/Save Source-of-Truth UX

## Status

Design-ready

Last refined from Stage 1 investigation: 2026-06-18 07:30:54 CEST.

## Goal / Problem Statement

The MCP server configuration modal presents Form View and JSON View as two input views for the same MCP server configuration. Users who open JSON View naturally paste standard `mcpServers` JSON and click the visible footer actions directly. Today **Preview Tools** still reads hidden Form View state, so valid pasted JSON can fail with a missing server ID until the user clicks **Apply JSON to Form**. The target behavior is that the active input view is the source of truth for **Preview Tools** and **Save Configuration**, while backend GraphQL contracts and the persisted `mcps.json` disk format remain unchanged.

## In-Scope Use Cases

| use_case_id | Name | User/System Flow | Requirement IDs |
| --- | --- | --- | --- |
| UC-001 | Preview from JSON View | User opens JSON View, pastes exactly one valid `mcpServers` entry, clicks **Preview Tools**, and the frontend previews the JSON-derived config without requiring **Apply JSON to Form**. | R-001, R-002, R-005, R-006, R-007 |
| UC-002 | Save from JSON View | User opens JSON View, pastes exactly one valid `mcpServers` entry, clicks **Save Configuration**, and the frontend saves the JSON-derived config without requiring **Apply JSON to Form**. | R-001, R-003, R-004, R-005, R-006, R-007 |
| UC-003 | Preview/save from Form View | User fills Form View and clicks **Preview Tools** or **Save Configuration**; existing form-based behavior remains intact. | R-001, R-002, R-003 |
| UC-004 | JSON View recoverable validation error | User pastes invalid, empty, multi-server, or unsupported JSON and clicks an action; frontend reports a clear error and does not use stale form state. | R-007 |
| UC-005 | Optional JSON-to-form conversion | User pastes valid JSON and chooses **Apply JSON to Form** only when they want to continue editing in Form View; conversion remains optional for preview/save. | R-005, R-006 |

## Requirements

| requirement_id | Requirement | Expected Outcome |
| --- | --- | --- |
| R-001 | Treat Form View and JSON View as two equivalent input methods for the same single MCP server modal. | Users can complete preview and save from either active view without a required conversion step. |
| R-002 | Make **Preview Tools** operate on the active input view. | In Form View, preview uses form fields. In JSON View, preview parses the visible JSON textarea at click time and previews that configuration. |
| R-003 | Make **Save Configuration** operate on the active input view. | In Form View, save uses form fields. In JSON View, save parses the visible JSON textarea at click time and saves that configuration. |
| R-004 | Keep `mcps.json` disk persistence format unchanged. | The saved storage contract remains the existing top-level `mcpServers` map format owned by backend persistence. |
| R-005 | Keep JSON-to-form conversion optional. | **Apply JSON to Form** is not required before preview or save; it only supports switching to guided form editing. |
| R-006 | Support standard MCP JSON shape in JSON View. | JSON View accepts a top-level `mcpServers` object with exactly one server entry; server ID comes from the map key; transport can be explicit or inferred from `command`/`url`; supported aliases include `transportType`/`transport_type` and `toolNamePrefix`/`tool_name_prefix`. |
| R-007 | Provide clear recoverable errors for invalid or unsupported JSON View input. | Invalid JSON, missing/empty `mcpServers`, multiple server entries, missing transport-specific fields, or unsupported transport values show clear feedback and do not call preview/save with stale form data. |
| R-008 | Preserve current edit-mode server identity behavior. | When editing an existing server, JSON View action payloads keep the existing `props.server.serverId`, matching the disabled server ID field in Form View; pasted JSON key is used only for new server creation. |

## Acceptance Criteria

| acceptance_criteria_id | Acceptance Criterion | Expected Outcome |
| --- | --- | --- |
| AC-001 | JSON View preview path parses current textarea content on click. | Given a new modal with empty form state, when the user pastes a valid single-server STDIO `mcpServers` JSON and clicks **Preview Tools**, `previewMcpServer` is called with a payload derived from that JSON, including server ID from the map key. |
| AC-002 | JSON View save path parses current textarea content on click. | Given valid JSON in JSON View, **Save Configuration** calls `configureMcpServer` with the JSON-derived payload without requiring **Apply JSON to Form**. |
| AC-003 | Form View behavior remains intact. | Given fields filled in Form View, **Preview Tools** and **Save Configuration** still use form state and do not require JSON parsing. |
| AC-004 | Standard STDIO MCP shape works in JSON View. | Given `{ "mcpServers": { "server-a": { "command": "uv", "args": ["run", "server.py"] } } }`, JSON View preview/save builds `transportType: "STDIO"` with `stdioConfig.command === "uv"`. |
| AC-005 | Standard HTTP MCP shape works in JSON View. | Given `{ "mcpServers": { "server-b": { "url": "http://localhost:8000/mcp", "headers": { "Authorization": "Bearer token" } } } }`, JSON View preview/save builds `transportType: "STREAMABLE_HTTP"` and preserves `headers`. |
| AC-006 | Explicit transport aliases are accepted. | JSON entries using `transport_type: "streamable_http"`, `transportType: "streamable_http"`, `transportType: "STREAMABLE_HTTP"`, `tool_name_prefix`, or `toolNamePrefix` map to the correct GraphQL input values. |
| AC-007 | Invalid JSON View input blocks action with explicit feedback. | Given invalid JSON, no `mcpServers`, empty `mcpServers`, more than one server entry, unsupported transport, or required command/url missing, preview/save emits a clear error and does not call the store action. |
| AC-008 | Existing persistence remains unchanged. | No backend disk-format migration, GraphQL schema change, or `mcps.json` storage shape change is introduced. |
| AC-009 | Edit mode preserves existing server ID. | Given `props.server.serverId === "existing"` and JSON key `new-id`, JSON View preview/save payload uses `serverId: "existing"`. |
| AC-010 | Apply JSON to Form remains optional and still works. | Given valid JSON View input, clicking **Apply JSON to Form** populates the form and switches to Form View; preview/save do not depend on this action. |

## Constraints / Dependencies

- Source-code edits are prohibited until Stage 6 is explicitly unlocked in `workflow-state.md`.
- Scope should remain frontend-local unless implementation evidence proves backend changes are necessary.
- Do not change GraphQL `McpServerInput` schema.
- Do not change backend `mcps.json` disk persistence shape.
- Do not introduce compatibility wrappers or dual behavior for old flows; implement a clean active-view source-of-truth model.
- Multi-server JSON in the single-server modal must not silently select the first entry. Users should be told to provide exactly one server or use Bulk Import.

## Assumptions

- Form View remains the guided editor; JSON View remains the raw standard MCP JSON editor.
- `McpBulkImportView.vue` remains the correct path for importing multiple servers.
- Existing `token` support for HTTP remains accepted alongside `headers`; JSON View should preserve `headers` because GraphQL input supports it.
- Button copy/localization may remain unchanged unless a small copy update is needed for clarity; behavioral correctness is the required scope.

## Open Questions / Risks

- The worktree does not include `autobyteus-web/node_modules`; validation may need to run from the original superrepo checkout or after dependency installation if isolated worktree test execution fails.
- Existing backend bulk import may still reject standard entries without transport markers in some paths, but that is outside this single-server modal UX unless Stage 7 reveals a direct dependency.

## Scope Classification

- Classification: `Small`.
- Rationale: localized frontend component behavior plus focused component tests and a small docs update; no schema, storage, or multi-subsystem redesign expected.

## Requirement Coverage Map To Use Cases

| requirement_id | use_case_id(s) |
| --- | --- |
| R-001 | UC-001, UC-002, UC-003 |
| R-002 | UC-001, UC-003 |
| R-003 | UC-002, UC-003 |
| R-004 | UC-002 |
| R-005 | UC-001, UC-002, UC-005 |
| R-006 | UC-001, UC-002, UC-005 |
| R-007 | UC-004 |
| R-008 | UC-001, UC-002 |

## Acceptance Criteria Coverage Map To Stage 7 Scenarios

| acceptance_criteria_id | scenario_id(s) | Planned validation mode |
| --- | --- | --- |
| AC-001 | SCN-001 | Component/unit |
| AC-002 | SCN-002 | Component/unit |
| AC-003 | SCN-003 | Component/unit |
| AC-004 | SCN-001, SCN-002 | Component/unit |
| AC-005 | SCN-004 | Component/unit |
| AC-006 | SCN-004, SCN-006 | Component/unit |
| AC-007 | SCN-005 | Component/unit |
| AC-008 | SCN-006 | Static/diff/docs review + targeted tests showing no backend/schema changes |
| AC-009 | SCN-007 | Component/unit |
| AC-010 | SCN-008 | Component/unit |
