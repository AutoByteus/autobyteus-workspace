# Requirement-Gap Response: All Active Runtime Communication Matrix

## Status

- Owner: `solution_designer`
- Date: 2026-06-13
- Reroute source: `api_e2e_engineer`
- Reroute artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/api-e2e-runtime-communication-scope-gap.md`
- Decision: expand this ticket's acceptance coverage before delivery. Do not defer all-active-runtime communication E2E to a follow-up.

## Decision

The user is correct that Claude-only live validation is not enough to claim product communication works across active runtimes. The requirements/design now require an all-active-runtime `send_message_to` teammate communication matrix before delivery.

This response was initially framed as primarily an API/E2E acceptance expansion. After the later Codex MCP materializer correction, the production entry rows are:

- AutoByteus native remains `AutoByteusSendMessageToTool` -> `SendMessageToDispatcher`.
- Codex App Server must use Agent Tools MCP through thread-scoped `config.mcp_servers.autobyteus_agent_tools` -> `SendMessageToDispatcher`; the earlier dynamic-only assumption is superseded.
- Claude Agent SDK remains route-backed `autobyteus_agent_tools` -> `SendMessageToDispatcher`.
- Shared delivery remains `SendMessageToDispatcher` -> team delivery coordinator/resolver -> recipient `AgentRun.postUserMessage(...)`.

## Required Matrix

| Sender runtime | Recipient runtime | Required before delivery |
| --- | --- | --- |
| AutoByteus | AutoByteus | Existing or updated live AutoByteus team E2E. |
| Codex | Codex | Existing or updated live Codex team E2E. |
| Claude | Claude | Existing route-backed live Claude team E2E. |
| AutoByteus | Codex | Existing or updated mixed AutoByteus/Codex E2E. |
| Codex | AutoByteus | Existing or updated mixed AutoByteus/Codex E2E. |
| AutoByteus | Claude | Add/update durable E2E. |
| Claude | AutoByteus | Add/update durable E2E. |
| Codex | Claude | Existing nested coverage may count only if API/E2E records exact equivalence; focused top-level row preferred. |
| Claude | Codex | Add/update durable E2E. |

## Shared Assertions

Each matrix row should prove:

1. sender runtime actually executes `send_message_to` through its runtime entry adapter;
2. delivery converges on the shared dispatcher/team delivery spine;
3. team communication projection contains correct sender, recipient, and content;
4. recipient runtime accepts the inter-agent input and reaches an appropriate terminal/idle/assistant-output state;
5. application-facing lifecycle uses canonical `send_message_to` where lifecycle is emitted;
6. old Claude provider wire names and Agent Tools MCP bearer/descriptor secrets do not leak;
7. memory/raw traces are checked where that runtime row is recordable and expected by the product contract, especially Claude route-backed sender rows.

## Updated Artifacts

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-spec.md`

## Downstream Routing Guidance

Architecture review should verify the corrected design package: Claude and Codex use separate backend-local Agent Tools MCP materializers, AutoByteus remains local, and the matrix does not blur runtime adapter ownership. After review approval, downstream API/E2E must refresh the coverage investigation and execution plan around the matrix. If API/E2E adds or changes durable E2E coverage, route the updated state through code review before delivery.

## API/E2E Follow-Up Inventory Incorporated

After this response decision, `api_e2e_engineer` appended a local inventory to `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/api-e2e-runtime-communication-scope-gap.md`. That inventory confirms the requirements/design direction above:

- AutoByteus same-runtime, Codex same-runtime, Claude same-runtime, and AutoByteus↔Codex already have durable live E2E files, but not all were run in the latest API/E2E round.
- Claude same-runtime route-backed communication passed in the latest API/E2E round.
- Existing nested coverage gives partial AutoByteus->Codex and Codex->Claude evidence, but does not complete the direct pair matrix.
- Missing/incomplete areas are direct Claude->Codex, direct Claude↔AutoByteus, and bidirectional direct Codex↔Claude coverage.

The revised requirements/design therefore keep the all-active-runtime matrix in this ticket and require API/E2E to add/update or explicitly map durable coverage for those missing/incomplete rows before delivery.

## Superseded Scope Note: Codex MCP Materializer Correction (2026-06-13)

The earlier statement in this response that “Codex App Server remains dynamic tool registration -> `SendMessageToDispatcher`” is superseded by `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/codex-mcp-materializer-design-correction.md`.

Corrected production scope: Codex App Server `send_message_to` must cut over to Agent Tools MCP through thread-scoped `config.mcp_servers.autobyteus_agent_tools`; Codex dynamic tools remain only for non-`send_message_to` tool families.
