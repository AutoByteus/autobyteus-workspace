# API/E2E Requirement Gap: All Runtime Agent Communication Coverage

## Classification

- Type: Requirement Gap
- Owner raising: `api_e2e_engineer`
- Date: 2026-06-13
- Ticket: `runtime-mcp-agent-tools`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools`

## Trigger

User challenged the API/E2E scope after the Claude-only live validation:

> communication for all the runtimes should be e2e tested, not just claude agnet sdk.otherwise we can not prove its working thats why in ouyr investigation phase you should also have plan for those dont you think so?

## Current API/E2E Evidence

The latest API/E2E round proves the changed Claude Agent SDK route-backed `send_message_to` path:

- Claude Agent SDK uses `autobyteus_agent_tools` for `send_message_to`.
- Live Claude ping->pong->ping route-backed E2E passed.
- Canonical lifecycle events and sender raw memory traces passed.
- Agent Tools MCP route integration coverage passed.

However, this is not evidence that every active runtime communication path works end-to-end.

## Gap

The current requirements/design/API-E2E investigation scoped Codex App Server, AutoByteus native, and other runtime communication paths as preserved or out of scope. That is appropriate only if the acceptance bar is "validate the changed Claude materializer and preserve existing non-Claude paths by focused regression." It is insufficient if the ticket acceptance bar is "prove all active runtime agent communications work end-to-end before delivery."

## Required Design/Requirement Decision

Solution design should decide whether this ticket must include an all-active-runtime communication E2E matrix before delivery. If yes, update requirements, design, and API/E2E acceptance coverage to include at least:

1. Active runtime sender coverage:
   - AutoByteus native sender `send_message_to` E2E.
   - Codex App Server sender `send_message_to` E2E.
   - Claude Agent SDK sender `send_message_to` E2E (already passing).
2. Mixed-runtime team coverage, if supported by product expectations:
   - Claude -> Codex and Codex -> Claude.
   - Claude -> AutoByteus and AutoByteus -> Claude.
   - Codex -> AutoByteus and AutoByteus -> Codex.
3. Shared assertions for each in-scope scenario:
   - Delivered team communication projection.
   - Canonical application-facing `send_message_to` lifecycle/events.
   - No old provider wire-name leak or secret descriptor/bearer leak.
   - Runtime memory/raw trace behavior where that runtime is recordable and expected to persist traces.
   - Failure-path coverage for invalid recipient or unavailable target if not already covered by API tests.
4. Existing durable coverage inventory:
   - Inventory current AutoByteus/Codex/mixed-runtime E2E tests.
   - Mark each as Still Valid / Needs Update / Stale / Out Of Scope under the revised all-runtime acceptance bar.

## Recommended Routing

Route to `solution_designer` as a Requirement Gap. The next design decision should either:

- Expand this ticket to require all-active-runtime communication E2E before delivery; or
- Keep this ticket Claude-materializer-scoped and create a follow-up ticket for all-runtime communication E2E hardening, explicitly documenting that current delivery only proves the changed Claude route-backed path.

## Relevant Current Artifacts

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-spec.md`
- API/E2E coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/api-e2e-coverage-investigation.md`
- API/E2E execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/api-e2e-execution-coverage-report.md`

## Existing E2E/Integration Coverage Inventory Observed After User Follow-Up

Preliminary local test inventory from `autobyteus-server-ts/tests`:

| Runtime / Pair | Existing Test Evidence | Live / E2E Gate | Current Coverage Status |
| --- | --- | --- | --- |
| AutoByteus native same-runtime team communication | `autobyteus-server-ts/tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts`, scenario `routes send_message_to between real AutoByteus team members and projects reference files` | `RUN_LMSTUDIO_E2E=1` | Exists, but not run in the latest API/E2E round. |
| Codex App Server same-runtime team communication | `autobyteus-server-ts/tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`, scenario `routes live inter-agent send_message_to ping->pong->ping roundtrip in codex team runtime` | `RUN_CODEX_E2E=1` and `codex --version` present | Exists, but not run in the latest API/E2E round. |
| Codex standalone direct global routing | `autobyteus-server-ts/tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts`, scenario `delivers from a real standalone Codex sender to an active standalone target by exact run id and rejects the same id after target termination` | `RUN_CODEX_E2E=1` and `codex --version` present | Exists for exact-run direct routing, but not team pair matrix. |
| Claude Agent SDK same-runtime team communication | `autobyteus-server-ts/tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts`, scenario `routes live inter-agent send_message_to ping->pong->ping roundtrip in claude team runtime` | `RUN_CLAUDE_E2E=1` and `claude --version` present | Exists and passed in latest API/E2E round after durable coverage update. |
| AutoByteus ↔ Codex mixed-runtime pair | `autobyteus-server-ts/tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts`, scenario `creates a live mixed-runtime team, proves cross-runtime delivery in both directions...` | `RUN_LMSTUDIO_E2E=1 && RUN_CODEX_E2E=1` and `codex --version` present | Exists for both directions before and after restore, but not run in latest API/E2E round. |
| Codex -> Claude nested mixed-runtime direction | `autobyteus-server-ts/tests/e2e/runtime/nested-mixed-team-runtime-graphql.e2e.test.ts`, scenario routes child coordinator `review_lead` (Codex) to `qa_specialist` (Claude) | `RUN_LMSTUDIO_E2E=1 && RUN_CODEX_E2E=1 && RUN_CLAUDE_E2E=1`, Codex and Claude binaries present | Exists for one Codex -> Claude direction in a nested topology, but not run in latest API/E2E round. |
| AutoByteus -> Codex nested mixed-runtime direction | Same nested mixed test routes parent `program_manager` (AutoByteus) to child `review_lead` (Codex) through represented subteam | Same as above | Exists for one AutoByteus -> Codex nested direction, but overlaps the fuller AutoByteus↔Codex test. |
| Claude -> Codex | No direct same-team pair scenario found in the inspected E2E files | N/A | Missing or not obvious; should be added if all runtime-pair communication must be proven. |
| Codex -> Claude, both directions | One nested Codex -> Claude direction exists; no direct Claude -> Codex reverse found | N/A for reverse | Incomplete if the acceptance bar is bidirectional pair proof. |
| Claude ↔ AutoByteus | No direct Claude↔AutoByteus pair scenario found in the inspected E2E files | N/A | Missing or not obvious; should be added if all runtime-pair communication must be proven. |

Conclusion from inventory: the repository already has several live E2E tests, but the all-runtime matrix is incomplete and was not executed in the latest API/E2E round. Missing/incomplete areas appear to be direct Claude↔Codex bidirectional coverage and Claude↔AutoByteus bidirectional coverage, plus a deliberate decision on whether nested one-way coverage is sufficient or direct pair coverage is required.

## Solution Design Follow-Up: Codex MCP Materializer Correction (2026-06-13)

After this gap inventory, the user clarified that Codex App Server should not remain dynamic-only if a safe MCP config path exists. Solution design rechecked the upstream Codex investigation and a fresh local Codex app-server probe and accepted Codex Agent Tools MCP materialization for `send_message_to` in this ticket.

Corrected production scope for API/E2E coverage: Codex sender rows should validate Agent Tools MCP execution through thread-scoped `config.mcp_servers.autobyteus_agent_tools`, not Codex dynamic `send_message_to`, once implementation resumes. See `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/codex-mcp-materializer-design-correction.md`.
