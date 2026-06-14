# Docs Sync Report

## Scope

- Ticket: `runtime-agent-tools-mcp-unification`
- Trigger: Delivery-stage docs sync after API/E2E pass and post-API/E2E coverage-code re-review pass.
- Bootstrap base reference: `origin/codex/streamable-mcp-runtime-tools` at `9b6d8938e17f94148a4f23ab3ce04fbaaaf85014`.
- Integrated base reference used for docs sync: latest fetched `origin/codex/streamable-mcp-runtime-tools` at `9b6d8938e17f94148a4f23ab3ce04fbaaaf85014` on 2026-06-14; `git rev-list --left-right --count HEAD...origin/codex/streamable-mcp-runtime-tools` returned `0 0`, so no new base commits were integrated.
- Post-integration verification reference: base-current check above plus `git diff --check` passed after docs edits.

## Why Docs Were Updated

- Summary: Updated durable runtime/tooling docs so Claude Agent SDK and Codex App Server are documented as using the unified `autobyteus_agent_tools` Agent Tools MCP route for browser, media, task-delegation, `send_message_to`, and `publish_artifacts`, with old Codex dynamic-tool and Claude local MCP projections recorded as removed for migrated families.
- Why this should live in long-lived project docs: The implementation changes the canonical runtime exposure and event/history/memory normalization boundary for first-party backend agent tools. Future maintainers need the unified route, adapter ownership, availability gates, no-secret policy, and removed old paths documented outside ticket-local artifacts.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Primary durable contract for the server-hosted Agent Tools MCP route, descriptors, supported adapters, and materializers. | `Updated` | Replaced send-message-only wording with multi-family adapter-backed behavior. |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Primary tool-family documentation for communication, browser, media, task delegation, and publication. | `Updated` | Promoted unified MCP projection and added `publish_artifacts` runtime projection notes. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Runtime event/lifecycle normalization authority for Claude and Codex. | `Updated` | Documented generalized Agent Tools MCP canonicalization and removed old per-runtime projection assumptions. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Codex runtime bootstrap, config, event, projection, and memory behavior. | `Updated` | Replaced migrated dynamic-tool wording with thread-scoped Agent Tools MCP config behavior. |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Durable Codex raw-event-to-normalized-event mapping. | `Updated` | Reclassified migrated server-owned tools from dynamic-tool lifecycle to MCP lifecycle. |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Storage-only memory recording contract for Codex/Claude tool lifecycles. | `Updated` | Generalized route-backed memory wording beyond `send_message_to`. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Team-member runtime and task-delegation/communication contract. | `Updated` | Documented team communication and task delegation via Agent Tools MCP for Codex/Claude members. |
| `autobyteus-server-ts/docs/modules/multimedia_management.md` | Media tool integration and path policy summary. | `Updated` | Clarified Codex/Claude media projection through Agent Tools MCP. |
| `autobyteus-web/docs/browser_sessions.md` | Frontend-facing browser runtime adapter contract. | `Updated` | Replaced old Codex dynamic and Claude `autobyteus_browser` wording with Agent Tools MCP canonicalization. |
| `autobyteus-web/docs/agent_artifacts.md` | Frontend artifact projection contract for generated media outputs. | `Updated` | Reworded generated media MCP form note to Agent Tools MCP route-backed forms. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend Activity/conversation event-consumption architecture. | `Updated` | Generalized provider-prefix guidance to Agent Tools MCP-prefixed Claude/Codex names. |
| `autobyteus-web/docs/settings.md` | Settings documentation mirror that includes Activity/conversation event-consumption guidance. | `Updated` | Kept mirror wording aligned with `agent_execution_architecture.md`. |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | Send-message selector/projection contract. | `No change` | Still accurately documents `send_message_to` semantics and its Agent Tools MCP projection. |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` | Distinguishes external MCP import from server-hosted Agent Tools MCP. | `No change` | Existing distinction remains accurate. |
| `autobyteus-server-ts/docs/PROJECT_OVERVIEW.md` | Top-level API/domain overview. | `No change` | Already describes Agent Tools MCP generically as configured server-owned tools. |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | High-level runtime topology. | `No change` | Existing route/topology entry remains accurate. |
| `docs/custom-application-development.md` | Application-facing `publish_artifacts` usage. | `No change` | Current public usage guidance remains valid and does not mention old runtime projections. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Runtime/tooling contract | Documented multi-family default adapters, availability gates, Claude/Codex materialization when any supported tool is enabled, canonical event names, and current out-of-scope boundaries. | This is the authoritative long-lived doc for the unified MCP route. |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Tool-family projection docs | Updated browser, communication, Agent Tools MCP, task-delegation, media, and `publish_artifacts` projection wording; recorded removed Codex dynamic/Claude local MCP paths. | Tool family docs must match the final runtime exposure model. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Runtime lifecycle/event docs | Replaced send/browser/team-specific old-projection paragraphs with generalized Agent Tools MCP materialization, canonicalization, no-secret, and family execution ownership rules. | Runtime event/history/memory consumers need one canonical rule for all migrated tools. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Codex bootstrap/projection docs | Documented thread-scoped `config.mcp_servers.autobyteus_agent_tools` for all migrated families; removed stale task dynamic file reference and dynamic-tool replay wording. | Codex no longer exposes migrated tools through dynamic registrations. |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Codex event mapping design | Updated dynamic-tool and MCP lifecycle sections so migrated server-owned tools are MCP-backed, not dynamic. | Durable raw-event mapping must prevent future compatibility fallback drift. |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Memory recording contract | Generalized route-backed Agent Tools MCP memory trace guidance to canonical names across migrated families. | Memory docs must match normalized tool lifecycle source of truth. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Team runtime docs | Updated team communication/task delegation projection language for Codex/Claude Agent Tools MCP. | Team-member tool exposure changed for task delegation and communication. |
| `autobyteus-server-ts/docs/modules/multimedia_management.md` | Media integration docs | Added Codex/Claude Agent Tools MCP projection summary for media tools. | Media projection changed from runtime-specific surfaces to unified MCP. |
| `autobyteus-web/docs/browser_sessions.md` | Frontend runtime adapter docs | Replaced old browser dynamic/Claude browser MCP wording and example with Agent Tools MCP. | Frontend docs should not tell readers to expect old provider prefixes. |
| `autobyteus-web/docs/agent_artifacts.md` | Frontend artifact projection docs | Updated generated media MCP wording. | Artifacts docs should name the current route-backed tool projection. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend event-consumption docs | Generalized runtime-specific transport-name guidance. | UI should render backend canonical names, not strip old runtime-specific prefixes. |
| `autobyteus-web/docs/settings.md` | Mirrored frontend event-consumption docs | Applied the same generalized guidance as `agent_execution_architecture.md`. | Keeps durable settings documentation aligned. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Unified Agent Tools MCP adapter boundary | `AgentToolMcpCatalog` is the configured/available/execute boundary for `send_message_to`, browser, media, task delegation, and `publish_artifacts`; family services remain behavior owners. | `design-spec.md`, `implementation-handoff.md`, `code-review-report.md` | `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md`, `autobyteus-server-ts/docs/modules/agent_tools.md` |
| Runtime materialization | Claude and Codex create session-scoped descriptors only when enabled tools exist; Codex uses thread-scoped `config.mcp_servers`, Claude uses SDK `mcpServers`/`allowedTools`; descriptors are not persisted. | `requirements-doc.md`, `design-spec.md`, `implementation-handoff.md` | `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md`, `autobyteus-server-ts/docs/modules/codex_integration.md`, `autobyteus-server-ts/docs/modules/agent_execution.md` |
| Event/history/memory canonicalization and no-secret policy | Provider wire names like `mcp__autobyteus_agent_tools__generate_image` normalize to canonical names before application surfaces, and bearer/session/header details must not leak. | `requirements-doc.md`, `implementation-handoff.md`, `code-review-report.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docs/modules/agent_execution.md`, `autobyteus-server-ts/docs/modules/agent_memory.md`, `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`, `autobyteus-web/docs/browser_sessions.md` |
| Codex dynamic-tool scope after migration | Generic Codex dynamic-tool infrastructure remains, but migrated server-owned backend families are not dynamic tools. | `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `code-review-report.md` | `autobyteus-server-ts/docs/modules/codex_integration.md`, `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` |
| Published artifact route-backed execution | `publish_artifacts` publishes through Agent Tools MCP for Claude/Codex, uses the active owning run, and keeps projection/events canonical without exposing MCP descriptor secrets. | `design-spec.md`, `api-e2e-execution-coverage-report.md`, `code-review-report.md` | `autobyteus-server-ts/docs/modules/agent_tools.md`, `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Codex dynamic registrations for migrated browser/media/task-delegation/`send_message_to`/`publish_artifacts` tools | Thread-scoped `config.mcp_servers.autobyteus_agent_tools` descriptor from Agent Tools MCP | `autobyteus-server-ts/docs/modules/codex_integration.md`, `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` |
| Claude local MCP servers `autobyteus_browser`, `autobyteus_image_audio`, `autobyteus_team`, and `autobyteus_published_artifacts` for migrated tools | SDK `mcpServers.autobyteus_agent_tools` descriptor and generated provider wire names | `autobyteus-server-ts/docs/modules/agent_tools.md`, `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md`, `autobyteus-server-ts/docs/modules/agent_execution.md` |
| Send-message-only Agent Tools MCP documentation | Multi-family adapter-backed Agent Tools MCP documentation | `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md`, `autobyteus-server-ts/docs/modules/agent_tools.md` |
| Browser-specific frontend expectation for old Codex dynamic/Claude `autobyteus_browser` provider prefixes | Backend-provided canonical browser tool names after Agent Tools MCP normalization | `autobyteus-web/docs/browser_sessions.md`, `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A — long-lived docs were updated.
- Rationale: N/A.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed against the latest fetched base-current integrated state. `git diff --check` passed after docs edits. Finalization is intentionally held for explicit user verification per delivery workflow.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: N/A
- Recommended recipient: N/A
- Why docs could not be finalized truthfully: N/A
