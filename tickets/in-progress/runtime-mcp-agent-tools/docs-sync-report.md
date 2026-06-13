# Docs Sync Report

## Scope

- Ticket: `runtime-mcp-agent-tools`
- Trigger: Code review round 3 passed after API/E2E-owned durable coverage update; delivery-stage docs sync for the final integrated implementation state.
- Bootstrap base reference: `origin/codex/streamable-mcp-runtime-tools` at `3a82ba5cb95542004fe4a4604fc600bc5404a0a8` (`feat(agent-tools): add streamable MCP endpoint`).
- Integrated base reference used for docs sync: latest fetched `origin/codex/streamable-mcp-runtime-tools` at `3a82ba5cb95542004fe4a4604fc600bc5404a0a8`; ticket branch checkpoint `07f3544e80cef0b21ac0ed704d8af404dd0fec5f` was already current with that base.
- Post-integration verification reference: `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts --no-watch` passed on the integrated checkpoint state (`1` file skipped, `5` tests skipped); `git diff --check` passed after docs sync edits.

## Why Docs Were Updated

- Summary: Long-lived server docs still described Claude `send_message_to` as a Claude-specific `autobyteus_team` MCP handler/projection and did not record the new Claude Agent SDK `autobyteus_agent_tools` materializer, canonical route-backed lifecycle/memory-trace behavior, optional `message_type` semantics, or the strengthened mixed-member `memoryDir` invariant.
- Why this should live in long-lived project docs: These are durable runtime, architecture, and maintenance contracts for future Agent Tools MCP materializers, Claude runtime event normalization, team communication, and memory/run-history work. Leaving them ticket-local would preserve obsolete understanding of the old Claude handler and could cause future work to reintroduce duplicate send-message paths or route-side raw-trace persistence.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Canonical Agent Tools MCP route/session/materializer contract. | `Updated` | Added Claude Agent SDK materialization, allowed-tool naming, descriptor secrecy, canonical event exposure, and adjusted out-of-scope runtime materializers. |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Canonical agent-tool projection overview for communication and task delegation. | `Updated` | Clarified Claude `send_message_to` now flows through `autobyteus_agent_tools`, while Claude `autobyteus_team` remains task-delegation-only. |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | Shared `send_message_to` selector/projection contract. | `Updated` | Documented optional `message_type` defaulting and Claude's route-backed Agent Tools MCP projection. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Runtime tool lifecycle normalization and Claude adapter behavior. | `Updated` | Replaced stale dedicated-handler guidance with route-backed Claude Agent Tools MCP lifecycle normalization and result-shape rules. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Mixed-team communication, runtime adapters, and member persistence notes. | `Updated` | Replaced stale Claude handler/noise guidance and documented member/task-agent `memoryDir` ownership plus fail-fast no-fallback rule. |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Storage-only memory recorder and readback ownership. | `Updated` | Added canonical route-backed MCP trace persistence rules and explicit memory-root readback consistency. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Run-history persistence/read-model relationship with memory and team member ids. | `No change` | Existing run-history ownership and memoryDir identity rules already remain accurate; changed behavior is better documented in agent memory/execution/team docs. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Runtime materializer contract | Added Claude Agent SDK as first production materializer; documented SDK `mcpServers` shape, `mcp__autobyteus_agent_tools__send_message_to`, no config when unconfigured, fresh rematerialization, and canonical-name exposure. | Future runtime work needs the authoritative descriptor/session boundary and must not persist bearer config or expose raw provider names. |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Tool projection overview | Updated `send_message_to` projection and task-delegation notes for Claude `autobyteus_agent_tools` cutover and task-only `autobyteus_team`. | Removes obsolete dual-path understanding and keeps communication vs task-delegation projections distinct. |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | Shared contract clarification | Added optional `message_type` defaulting to `agent_message`; updated Claude projection from dedicated handler to Agent Tools MCP materializer. | Matches schema/parser behavior observed in live Claude E2E and prevents stale tests/docs from requiring optional provider arguments. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Runtime lifecycle normalization | Replaced old Claude dedicated handler paragraph with route-backed Agent Tools MCP lifecycle normalization, shared dispatcher ownership, provider-name leak guard, and MCP text-content result-shape preservation. | This is the main runtime/event contract changed by the implementation. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Team communication/persistence contract | Documented Claude team send-message routing through `autobyteus_agent_tools` and strengthened executable member/task-agent `memoryDir` ownership/no-fallback rule. | The live fix depends on canonical team-member memory directories before run creation/restore. |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Memory trace authority/readback contract | Documented route-backed MCP raw traces as canonical `AgentRunEvent` output only, no route/executor/direct-dispatcher writes, canonical `send_message_to` tool name, MCP text content result shape, and explicit memory-root consistency. | Prevents reintroducing a second raw-trace persistence authority and records the read/write root invariant validated by API/E2E. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Claude Agent SDK Agent Tools MCP materializer | Claude creates/refreshes a live in-memory `autobyteus_agent_tools` descriptor only when `send_message_to` is configured and exposes `mcp__autobyteus_agent_tools__send_message_to` through SDK options. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `agent_tools_mcp_server.md`, `agent_tools.md`, `agent_communication.md`, `agent_execution.md` |
| Single active Claude send-message execution path | The old Claude-specific `autobyteus_team` send-message handler is removed; `autobyteus_team` remains for task-delegation tools only. | `requirements-doc.md`, `implementation-handoff.md`, `code-review-report.md` | `agent_tools.md`, `agent_execution.md`, `agent_team_execution.md` |
| Canonical route-backed lifecycle and memory traces | Route-backed Claude MCP tool events normalize to canonical `send_message_to`; raw provider MCP names do not leak; raw traces are written by `AgentRunMemoryRecorder` from canonical events and preserve MCP text-content result shape. | `design-impact-reroute.md`, `api-e2e-execution-coverage-report.md`, `code-review-report.md` | `agent_execution.md`, `agent_memory.md`, `agent_tools_mcp_server.md` |
| Optional `message_type` semantics | `message_type` is optional and defaults to `agent_message`; live provider args/raw traces must not require the field when recipient/content delivery is valid. | `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `code-review-report.md` | `agent_communication.md` |
| Mixed-team member memory invariant | Executable non-native member/task-agent runs must receive authoritative `memoryDir` before run creation/restore; `MixedAgentMemberHandle` asserts and never derives fallback paths. | `design-impact-reroute.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `agent_team_execution.md`, `agent_memory.md` |
| Memory root readback consistency | Services constructed with explicit `memoryDir` must read topology/memory from the same root used by writers. | `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `agent_memory.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Claude `autobyteus_team` `send_message_to` handler/definition path | Claude Agent SDK `autobyteus_agent_tools` HTTP MCP descriptor plus shared Agent Tools MCP route/dispatcher | `agent_tools_mcp_server.md`, `agent_tools.md`, `agent_execution.md`, `agent_team_execution.md` |
| Application-facing raw provider names for Claude route-backed send-message | Canonical `send_message_to` events/history/memory traces | `agent_tools_mcp_server.md`, `agent_execution.md`, `agent_team_execution.md`, `agent_memory.md` |
| Old handler result-object expectation such as `{ accepted: true }` for route-backed Claude traces | Standard MCP text-content result shape from Agent Tools MCP | `agent_execution.md`, `agent_memory.md` |
| Stale requirement that live provider arguments always include `message_type` | Optional parser/schema behavior defaulting missing values to `agent_message` | `agent_communication.md` |
| Hidden downstream memoryDir fallback inside member handle | Upstream mixed-team/task-agent memoryDir ownership plus member-handle fail-fast assertion | `agent_team_execution.md`, `agent_memory.md` |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed after the ticket branch was refreshed against the latest tracked remote base and the default-gated Claude E2E smoke path passed on the integrated checkpoint. Awaiting explicit user verification before ticket archival, push/merge, or release/deployment actions.
