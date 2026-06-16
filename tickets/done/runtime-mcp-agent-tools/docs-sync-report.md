# Docs Sync Report

## Scope

- Ticket: `runtime-mcp-agent-tools`
- Trigger: Code review round 7 passed after API/E2E round 4 added/updated durable E2E coverage and validated the expanded all-active-runtime communication scope.
- Bootstrap base reference: `origin/codex/streamable-mcp-runtime-tools` at `3a82ba5cb95542004fe4a4604fc600bc5404a0a8` (`feat(agent-tools): add streamable MCP endpoint`).
- Integrated base reference used for docs sync: latest fetched `origin/codex/streamable-mcp-runtime-tools` at `3a82ba5cb95542004fe4a4604fc600bc5404a0a8`; reviewed candidate checkpoint `33a7004db5c062cf7024a8bf5a8dae11cbd26af3` was already current with that base.
- Post-integration verification reference: `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/all-runtime-send-message-matrix.e2e.test.ts tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts tests/e2e/runtime/nested-mixed-team-runtime-graphql.e2e.test.ts tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts --no-watch` passed after integration as default-gated compile/skipped coverage (`7` files skipped, `19` tests skipped).

## Why Docs Were Updated

- Summary: The current implementation is no longer Claude-only. Long-lived docs needed to reflect that both Claude Agent SDK and Codex App Server now consume server-hosted `autobyteus_agent_tools` for `send_message_to`, while AutoByteus native remains a local wrapper. Docs also needed to record Codex's thread-scoped MCP config boundary, deletion of the Codex dynamic send-message fallback, all-runtime matrix coverage, canonical no-leak event/history/memory behavior, and the memory-root-aware restore/local-fix invariants.
- Why this should live in long-lived project docs: These are durable runtime and architecture contracts for future Agent Tools MCP materializers, Codex/Claude event conversion, team communication, memory/run-history restore work, and API/E2E coverage maintenance. Keeping them only in ticket artifacts would leave stale dynamic Codex and old Claude handler guidance in canonical docs.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Canonical Agent Tools MCP route/session/materializer contract. | `Updated` | Added Codex App Server materialization alongside Claude, documented thread-scoped `config.mcp_servers`, no process/file config, canonical no-leak behavior, and updated V1 out-of-scope runtime list. |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Canonical agent-tool projection overview for communication and task delegation. | `Updated` | Clarified Codex and Claude `send_message_to` now route through `autobyteus_agent_tools`; Codex dynamic tools remain for task-delegation/media/etc. where still in scope. |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | Shared `send_message_to` selector/projection contract. | `Updated` | Documented Codex thread-scoped Agent Tools MCP projection, no dynamic send-message fallback, Claude projection, and optional `message_type` defaulting. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Runtime tool lifecycle normalization and Codex/Claude adapter behavior. | `Updated` | Added Codex route-backed MCP lifecycle/no-leak contract and retained Claude route-backed canonicalization. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Mixed-team communication/runtime adapter behavior and member persistence notes. | `Updated` | Expanded team communication guidance to Codex + Claude Agent Tools MCP and retained executable member/task-agent `memoryDir` fail-fast invariant. |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Storage-only memory recorder and readback ownership. | `Updated` | Expanded route-backed MCP trace authority to Codex and Claude and clarified canonical trace/no-leak result shape. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Canonical Codex runtime architecture doc. | `Updated` | Replaced stale dynamic `send_message_to` description/source path with thread-scoped Agent Tools MCP materialization and no-leak lifecycle rules. |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Canonical Codex raw-event mapping/audit table. | `Updated` | Moved `send_message_to` out of dynamic-tool guidance and into MCP tool lifecycle guidance with canonicalization and secret/provider marker sanitization. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Run-history/team metadata/restore ownership. | `Updated` | Added current-memory-root binding requirement for team metadata/topology lookup services to record the mixed restore local fix. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Runtime materializer contract | Documented Codex App Server and Claude Agent SDK as first materializers; added Codex `thread/start`/`thread/resume` config shape and no process/file-backed config rule. | Future materializer work must preserve descriptor secrecy and runtime-local materialization boundaries. |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Tool projection overview | Updated first-party communication projection so Codex and Claude use Agent Tools MCP for `send_message_to`. | Removes obsolete runtime-specific send-message wrapper assumptions. |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | Shared contract clarification | Updated runtime projection bullets for Codex and Claude; retained optional `message_type` defaulting to `agent_message`. | Aligns docs with schema/parser behavior and current runtime projections. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Runtime lifecycle normalization | Added Codex Agent Tools MCP no-leak/canonicalization contract; retained Claude route-backed event/result rules. | Codex route-backed tool lifecycle now owns app-facing `send_message_to` semantics. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Team runtime communication | Documented Codex/Claude route-backed MCP sender behavior and provider-marker/header leak ban in team streams. | All-runtime matrix depends on consistent team-facing canonical events. |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Raw trace authority | Expanded route-backed MCP trace rules to Codex and Claude. | Prevents route/dispatcher side-writing and provider-marker leakage in raw traces. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Codex architecture | Replaced stale dynamic Codex `send_message_to` description and source reference with Agent Tools MCP materializer/event-payload source paths. | Canonical Codex docs must not point future readers to deleted dynamic send-message files. |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Codex raw-event audit | Removed `send_message_to` from dynamic-tool lifecycle guidance; added route-backed MCP lifecycle/canonicalization/no-leak rules. | Keeps live event conversion/history replay guidance aligned with current source. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Restore/metadata root invariant | Recorded that team metadata lookup/topology readers must bind to the configured app memory root. | Documents the local fix for mixed restore metadata-root mismatch. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Claude Agent SDK Agent Tools MCP materializer | Claude creates/refreshes a live in-memory `autobyteus_agent_tools` descriptor only when `send_message_to` is configured and exposes `mcp__autobyteus_agent_tools__send_message_to` through SDK options. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `agent_tools_mcp_server.md`, `agent_tools.md`, `agent_communication.md`, `agent_execution.md` |
| Codex App Server Agent Tools MCP materializer | Codex creates a live descriptor only when `send_message_to` is configured, passes it through thread-scoped `config.mcp_servers.autobyteus_agent_tools`, and never writes bearer config to process-wide args or project files. | `codex-mcp-materializer-design-correction.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `agent_tools_mcp_server.md`, `codex_integration.md`, `agent_communication.md`, `agent_execution.md` |
| Removed runtime-specific send-message paths | Old Claude `autobyteus_team` send-message and Codex dynamic `send_message_to` paths are removed; AutoByteus native remains local; Codex/Claude external runtimes use Agent Tools MCP. | `requirements-doc.md`, `implementation-handoff.md`, `code-review-report.md` | `agent_tools.md`, `agent_communication.md`, `agent_execution.md`, `codex_raw_event_mapping.md` |
| Canonical route-backed lifecycle and no-leak policy | Route-backed Codex/Claude events normalize to canonical `send_message_to`; provider/server-qualified names and bearer/header config details must not leak into frontend events, run history, or memory traces. | `api-e2e-execution-coverage-report.md`, `code-review-report.md` | `agent_execution.md`, `agent_team_execution.md`, `agent_memory.md`, `codex_integration.md`, `codex_raw_event_mapping.md` |
| All-active-runtime communication evidence | Durable E2E now covers AutoByteus, Codex, Claude same-runtime rows plus all six directed mixed-runtime rows. | `api-e2e-runtime-communication-scope-gap.md`, `requirement-gap-runtime-communication-matrix-response.md`, `api-e2e-execution-coverage-report.md` | `codex_integration.md`, `agent_team_execution.md` |
| Mixed restore memory-root invariant | Team metadata lookup/services, context-file resolution, and topology readers must bind to the active app memory root; stale default-root singletons caused restore failure. | `api-e2e-local-fix-mixed-restore-metadata.md`, `api-e2e-execution-coverage-report.md`, `code-review-report.md` | `run_history.md`, `agent_memory.md`, `agent_team_execution.md` |
| Mixed-team member memory invariant | Executable non-native member/task-agent runs must receive authoritative `memoryDir` before run creation/restore; `MixedAgentMemberHandle` asserts and never derives fallback paths. | `design-impact-reroute.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `agent_team_execution.md`, `agent_memory.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Claude `autobyteus_team` `send_message_to` handler/definition path | Claude Agent SDK `autobyteus_agent_tools` HTTP MCP descriptor plus shared Agent Tools MCP route/dispatcher | `agent_tools_mcp_server.md`, `agent_tools.md`, `agent_execution.md`, `agent_team_execution.md` |
| Codex dynamic `send_message_to` registration/spec-builder path | Codex App Server thread-scoped `config.mcp_servers.autobyteus_agent_tools` plus shared Agent Tools MCP route/dispatcher | `agent_tools_mcp_server.md`, `agent_communication.md`, `codex_integration.md`, `codex_raw_event_mapping.md` |
| Process-wide or file-backed Codex MCP bearer config | Per-thread app-server config generated from live descriptor for each run/restore | `agent_tools_mcp_server.md`, `codex_integration.md` |
| Application-facing raw provider/server names for route-backed send-message | Canonical `send_message_to` events/history/memory traces | `agent_execution.md`, `agent_team_execution.md`, `agent_memory.md`, `codex_raw_event_mapping.md` |
| Old handler result-object expectation such as `{ accepted: true }` for route-backed traces | Standard MCP text-content result shape from Agent Tools MCP | `agent_execution.md`, `agent_memory.md` |
| Stale requirement that live provider arguments always include `message_type` | Optional parser/schema behavior defaulting missing values to `agent_message` | `agent_communication.md` |
| Default-root team metadata lookup during restore | Current-memory-root-aware metadata/topology lookup services | `run_history.md`, `agent_memory.md` |
| Hidden downstream memoryDir fallback inside member handle | Upstream mixed-team/task-agent memoryDir ownership plus member-handle fail-fast assertion | `agent_team_execution.md`, `agent_memory.md` |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed after the ticket branch was refreshed against the latest tracked remote base and the touched E2E default-gated compile/skipped path passed on the integrated checkpoint. User verification was received on 2026-06-14; ticket artifacts were archived under `tickets/done/runtime-mcp-agent-tools` before repository finalization. No release/deployment action is required.
