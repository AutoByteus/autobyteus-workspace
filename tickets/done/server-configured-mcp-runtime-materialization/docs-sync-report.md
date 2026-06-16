# Docs Sync Report

## Scope

- Ticket: `server-configured-mcp-runtime-materialization`
- Trigger: Delivery-stage docs sync after API/E2E execution passed and post-API/E2E durable coverage code re-review passed.
- Bootstrap base reference: `origin/codex/streamable-mcp-runtime-tools` at `c572fcd686513045f53c01c34f3198dd565fd8a4` (recorded in investigation notes).
- Integrated base reference used for docs sync: `origin/codex/streamable-mcp-runtime-tools` at `ca16a9ca788772343a985ff925e28ad036a321ba`; delivery fetch found local `codex/streamable-mcp-runtime-tools` already matched the latest tracked remote.
- Post-integration verification reference: `git diff --check` passed; `cd autobyteus-server-ts && pnpm exec tsc -p tsconfig.build.json --noEmit` passed before docs edits and passed again after docs edits.

## Why Docs Were Updated

- Summary: Updated durable backend/frontend docs to describe that agent-definition-selected configured MCP-origin registry tools are exposed to Codex App Server and Claude Agent SDK through the existing run-scoped `autobyteus_agent_tools` Agent Tools MCP bridge, not by directly copying raw external MCP configs into provider-native config.
- Why this should live in long-lived project docs: The change affects the canonical runtime/tool materialization boundary, security boundary, registered-name semantics, result preservation behavior, and troubleshooting expectations for configured MCP tools across native AutoByteus, Codex, and Claude runtimes.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Canonical Agent Tools MCP route/session/materialization documentation. | Updated | Added configured MCP-origin registry tool exposure, source snapshots, registry gating, stale fail-closed behavior, raw MCP result preservation, and direct-provider-materialization out-of-scope note. |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | High-level agent tools module documentation and cross-link to Agent Tools MCP. | Updated | Clarified that external runtimes call configured AutoByteus tools, including selected MCP-origin registry tools, through `autobyteus_agent_tools`. |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` | Consumer/import side of configured external MCP server docs. | Updated | Documented how discovered `ToolOrigin.MCP` registry names are selected by agents and exposed to Codex/Claude through Agent Tools MCP. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Codex runtime tool materialization and event normalization docs. | Updated | Documented configured MCP-origin tools in Codex `autobyteus_agent_tools` thread config and stated raw external MCP configs are not directly materialized. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Runtime-neutral execution/tool lifecycle documentation for Codex and Claude. | Updated | Added configured MCP-origin registry tools to the unified Agent Tools MCP execution boundary and raw MCP result preservation notes. |
| `autobyteus-web/docs/tools_and_mcp.md` | Frontend MCP configuration and tool discovery docs. | Updated | Added user-facing model that assigned discovered MCP-origin tool names work across native AutoByteus, Codex, and Claude via the backend bridge. |
| `autobyteus-server-ts/docs/PROJECT_OVERVIEW.md` | Server domain/API overview. | No change | Existing domain bullets and MCP endpoint listing remain accurate at overview level. |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | High-level architecture and persistence overview. | No change | Existing notes about file-backed MCP config and Agent Tools MCP route remain accurate; detailed behavior belongs in module docs updated above. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Runtime/architecture docs | Expanded scope and session/catalog sections to include configured MCP-origin registry tools; documented redaction-safe source snapshots, registry source resolution, name collision gating, stale fail-closed behavior, raw result preservation, and direct-provider materialization as out of scope. | This is the authoritative route/session/materialization contract for `autobyteus_agent_tools`. |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Module overview docs | Clarified that the Agent Tools MCP surface covers selected built-in server-owned tools and selected `ToolOrigin.MCP` registry tools; documented registry/proxy delegation and canonical registered names. | Future tool/runtime contributors need the high-level boundary before following the detailed route doc. |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` | Configured MCP subsystem docs | Added selected registered-name flow for native AutoByteus and Codex/Claude provider runtimes. | Prevents readers from assuming direct provider-native external MCP config materialization is the supported Codex/Claude path. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Runtime-specific docs | Updated Codex Agent Tools MCP section for selected MCP-origin registry tools and registered-name semantics. | Codex contributors need the precise materialized `config.mcp_servers.autobyteus_agent_tools` contract. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Runtime-neutral execution docs | Updated unified Agent Tools MCP execution boundary for Codex/Claude, provider config non-duplication, and raw MCP result preservation. | Keeps execution/event docs aligned with route and provider behavior. |
| `autobyteus-web/docs/tools_and_mcp.md` | Frontend module docs | Documented that discovered MCP-origin tools selected by agents are consumed consistently by native AutoByteus, Codex, and Claude, with provider runtimes using the backend bridge. | Gives frontend/product readers accurate semantics for MCP tool assignment. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Configured MCP-origin provider exposure boundary | Codex/Claude receive one run-scoped `autobyteus_agent_tools` descriptor containing selected registered tool names; raw external MCP config is not directly copied into provider-native config. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md`, `autobyteus-server-ts/docs/modules/codex_integration.md`, `autobyteus-server-ts/docs/modules/agent_execution.md` |
| Registry-backed configured MCP source resolution | Eligible tools are selected registered names with `ToolOrigin.MCP` and `metadata.mcp_server_id`; collisions and stale registry definitions fail closed. | `requirements.md`, `implementation-handoff.md`, `api-e2e-coverage-investigation.md` | `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md`, `autobyteus-server-ts/docs/modules/agent_tools.md` |
| Result and secret handling | Raw MCP result fields are preserved for configured MCP-origin calls; bearer/session/header/provider wire details stay out of app-facing surfaces. | `requirements.md`, `api-e2e-execution-coverage-report.md`, `code-review-report.md` | `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md`, `autobyteus-server-ts/docs/modules/agent_execution.md` |
| Frontend/product MCP assignment model | Selecting a discovered MCP-origin registered tool on an agent applies consistently across native AutoByteus, Codex, and Claude. | `requirements.md`, `implementation-handoff.md` | `autobyteus-web/docs/tools_and_mcp.md`, `autobyteus-server-ts/docs/modules/mcp_server_management.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Silent omission of configured MCP-origin registry tools from Codex/Claude Agent Tools MCP sessions. | Registry-backed inclusion of selected `ToolOrigin.MCP` names in the run-scoped `autobyteus_agent_tools` descriptor. | `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md`; `autobyteus-server-ts/docs/modules/agent_execution.md` |
| Potential expectation that Codex/Claude should directly materialize raw external MCP server configs for configured MCP tools. | Existing Agent Tools MCP bridge delegates to registry-created MCP tools and shared MCP proxy ownership. | `autobyteus-server-ts/docs/modules/mcp_server_management.md`; `autobyteus-server-ts/docs/modules/codex_integration.md`; `autobyteus-web/docs/tools_and_mcp.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `Yes`
- Rationale: N/A; durable docs were updated.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed on the branch after delivery refresh confirmed the local ticket branch matched latest `origin/codex/streamable-mcp-runtime-tools`. No docs ambiguity or reroute is required.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: N/A
- Recommended recipient: N/A
- Why docs could not be finalized truthfully: N/A
