# Docs Sync: MCP JSON View Preview/Save Source-of-Truth UX

## Scope

- Ticket: `mcp-json-view-preview-save`
- Trigger Stage: `9` re-check after Stage 7 live-validation re-entry and Stage 8 Round 2
- Workflow state source: `tickets/in-progress/mcp-json-view-preview-save/workflow-state.md`

## Why Docs Were Updated

- Summary: Updated Tools/MCP frontend documentation to describe the current active-input behavior for `McpServerFormModal.vue`.
- Why this change matters to long-lived project understanding: future maintainers need to know that Form View and JSON View are equivalent input surfaces for Preview/Save, that **Apply JSON to Form** is optional, and that JSON View accepts exactly one standard `mcpServers` entry in the single-server modal while persistence remains backend-owned.

## Re-Entry Refresh

- Refresh reason: user-requested live frontend/backend validation added evidence but did not change implemented behavior or long-lived documentation requirements.
- Re-check result: existing `autobyteus-web/docs/tools_and_mcp.md` content already describes active-view source-of-truth Preview/Save behavior, optional Apply JSON to Form, single-server JSON View rules, and unchanged backend persistence.
- Additional long-lived docs changes needed after live validation: None.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/tools_and_mcp.md` | Canonical frontend documentation for Tools/MCP module and MCP server modal workflow | Updated | Added active-view source-of-truth behavior and JSON View input rules. |

## Docs Updated

| Doc Path | Type Of Update | What Was Added / Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/tools_and_mcp.md` | Behavior/runtime flow | Replaced generic “fill form or paste JSON” workflow with active-view source-of-truth rules for Form View and JSON View; documented single-server `mcpServers` JSON, transport inference/aliases, edit-mode server ID preservation, optional Apply JSON to Form, and unchanged `mcps.json` persistence. | Aligns long-lived docs with implemented UX and validation. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Active input source of truth | Preview and Save use the currently active view; JSON View parses textarea at click time. | `requirements.md`, `future-state-runtime-call-stack.md`, `api-e2e-testing.md` | `autobyteus-web/docs/tools_and_mcp.md` |
| JSON View single-server contract | Single-server modal accepts exactly one `mcpServers` entry; multiple entries use Bulk Import. | `requirements.md`, `implementation.md` | `autobyteus-web/docs/tools_and_mcp.md` |
| Persistence/schema stability | Frontend still sends existing `McpServerInput`; backend `mcps.json` shape does not change. | `api-e2e-testing.md`, `code-review.md` | `autobyteus-web/docs/tools_and_mcp.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Required JSON-to-form conversion before reliable Preview/Save behavior | Active-view source-of-truth parsing for JSON View actions; **Apply JSON to Form** remains optional conversion helper | `autobyteus-web/docs/tools_and_mcp.md` |

## Final Result

- Result: `Updated`
- If `Blocked` because earlier-stage work is required, classification: N/A
- Required return path or unblock condition: N/A
- Follow-up needed: None for this ticket. Future unrelated growth in `McpServerFormModal.vue` should consider component decomposition because the source file is near the Stage 8 size guardrail. Live frontend/backend validation did not require any additional durable docs beyond the existing active-view behavior update.
