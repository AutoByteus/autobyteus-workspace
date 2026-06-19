# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/general-mcp-gateway-analysis/tickets/in-progress/general-mcp-gateway-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/general-mcp-gateway-analysis/tickets/in-progress/general-mcp-gateway-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/general-mcp-gateway-analysis/tickets/in-progress/general-mcp-gateway-analysis/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/general-mcp-gateway-analysis/tickets/in-progress/general-mcp-gateway-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/general-mcp-gateway-analysis/tickets/in-progress/general-mcp-gateway-analysis/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/general-mcp-gateway-analysis/tickets/in-progress/general-mcp-gateway-analysis/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review-passed handoff to API/E2E for the general `/mcp/gateway` slice.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1 in this file.

## Current Requirement And Design Basis

The approved slice adds a stable external Streamable HTTP MCP endpoint at `/mcp/gateway` that is separate from the existing run-scoped `/mcp/agent-tools/:sessionId` endpoint. The gateway must initialize for external MCP clients, list only currently registered `ToolOrigin.MCP` tools, call allowed MCP-origin tools through the existing registry-created MCP/proxy path, fail closed for missing or non-MCP-origin tools, and never expose/call internal AutoByteus agent tools such as `send_message_to` or `publish_artifacts`. Access is minimal: when `AUTOBYTEUS_MCP_GATEWAY_TOKEN` is configured, missing/invalid bearer auth must reject list/call; when no token is configured, access is local-loopback-only and must reject non-loopback/remote-style requests. The frontend Settings -> MCP Servers area must use an internal tab switcher with `MCP Servers` and `MCP Gateway`, and the gateway panel must show endpoint/config guidance plus the current MCP-origin tool count/list from existing GraphQL tool data.

The implementation handoff's Legacy / Compatibility Removal Check was read. It reports no backward-compatibility mechanism, no fake AgentRun session, no legacy old behavior retained in the changed gateway scope, and no obsolete path needing removal. Code review round 2 confirmed the access-policy local fix and found no remaining source-review blockers.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Stable `/mcp/gateway` endpoint for external MCP clients | Added | REQ-GW-001, AC-GW-001; design DS-001 | Must validate initialize/list/call over real Streamable HTTP client. |
| Gateway lists only `ToolOrigin.MCP` tools | Added | REQ-GW-004, AC-GW-002; design DS-003 | Existing catalog/route coverage is valid; add/execute full-runtime GraphQL/UI evidence for count/list. |
| Gateway calls allowed MCP-origin tools through existing MCP proxy path | Added | REQ-GW-006, AC-GW-003; handoff downstream hints | Existing fake-tool route coverage is not enough for the real configured MCP server boundary; add durable backend integration using actual configured stdio MCP server/proxy path. |
| Gateway rejects missing/non-MCP/internal tools without executor reach | Added | REQ-GW-005, REQ-GW-008, AC-GW-004/005 | Existing unit/integration coverage is valid; final run must include it. |
| Configured bearer token rejects missing/invalid and allows valid remote-style access | Added | REQ-GW-003, AC-GW-006; CR-GW-001 resolution | Existing route coverage is valid; final run must include it. |
| No-token mode is local-loopback-only | Added/Changed during CR-GW-001 local fix | Code review report CR-GW-001 round 2 | Existing route coverage is valid; final run must include it. |
| Existing `/mcp/agent-tools/:sessionId` behavior | Preserved | REQ-GW-009, AC-GW-007; design DS-002 | Existing agent-tools MCP integration coverage remains relevant and must be run. |
| Settings -> MCP Servers internal tabs and gateway panel | Added | REQ-GW-011/012, AC-GW-009/010 | Existing frontend coverage does not cover the new tab/panel; add narrow component/store coverage and run targeted Nuxt tests. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/mcp-gateway/mcp-gateway-tool-catalog.test.ts` | Catalog lists only MCP-origin tools, sorts by name, and fails closed when a definition is missing or changes to local origin. | REQ-GW-004/005/008, AC-GW-002/005 | Still Valid | Directly exercises `McpGatewayToolCatalog` origin filtering/fail-closed behavior. | Run in final targeted backend suite. |
| `autobyteus-server-ts/tests/integration/mcp-gateway/mcp-gateway-routes.integration.test.ts` existing SDK/fake-tool scenario | Official Streamable HTTP SDK client initializes/lists/calls gateway, excludes a local `send_message_to`, and uses gateway execution scope for the fake MCP tool. | REQ-GW-001/004/005/007/008, AC-GW-001/002/004/008 | Needs Update | Valid but not sufficient for AC-GW-003 because the tool is a fake `BaseTool`, not an actual registered configured MCP server/proxy path. | Add a new durable scenario in this file for a real configured stdio MCP server and keep existing scenario. |
| `autobyteus-server-ts/tests/integration/mcp-gateway/mcp-gateway-routes.integration.test.ts` existing access scenarios | No-token mode rejects remote-style no-Origin and loopback-IP/remote-Host; configured token rejects missing/wrong and allows valid remote-style request without token leakage. | REQ-GW-003/010, AC-GW-006 | Still Valid | Matches CR-GW-001 resolution and token behavior. | Run in final targeted backend suite. |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | Existing run-scoped endpoint initializes/lists/calls internal tools and configured MCP tools with session bearer auth, rejects unconfigured/revoked/malformed calls, preserves internal semantics. | REQ-GW-009, AC-GW-007 | Still Valid | This is the regression-sensitive preserved surface. | Run in final targeted backend suite. |
| `autobyteus-server-ts/tests/integration/mcp-server-management/mcp-config-service.integration.test.ts` env-gated real external MCP scenarios | Configures/discovers real external stdio MCP servers when environment-specific fixtures exist. | MCP Server Management ownership feeding REQ-GW-004/006 | Still Valid but not adequate alone | Env-gated and does not call `/mcp/gateway`. | Do not require for final pass; new gateway durable coverage will use self-contained stdio MCP server. |
| `autobyteus-web/components/tools/__tests__/McpServerFormModal.spec.ts` | Existing MCP server form JSON import/preview/save behavior. | Existing MCP Servers tab | Out Of Scope | Does not cover new gateway tabs/panel. | Leave unchanged. |
| `autobyteus-web` typecheck | Repo-wide static check for Nuxt/web. | UI compile safety for REQ-GW-011/012 | Still Valid but currently red from pre-existing unrelated errors | Implementation/code review recorded existing failures and no changed gateway component errors. | Run filtered/targeted frontend tests; record repo-wide typecheck status if run. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | No stale/obsolete durable coverage found in the changed scope. | Requirements preserve run-scoped MCP and add separate gateway. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| GW-API-001 | `/mcp/gateway` initialize/list/call against an actual configured stdio MCP server registered through `McpToolRegistrar` and executed via `GenericMcpTool`/`McpServerProxy`. | REQ-GW-006, AC-GW-003, design DS-004, code review suggested focus. | `autobyteus-server-ts/tests/integration/mcp-gateway/mcp-gateway-routes.integration.test.ts` | The current route test uses a fake `BaseTool`; the real configured MCP proxy path should remain durable and self-contained. |
| GW-UI-001 | `McpManagementTabs` exposes accessible `MCP Servers` and `MCP Gateway` tabs and emits tab switching. | REQ-GW-011, AC-GW-009. | `autobyteus-web/components/tools/__tests__/McpManagementTabs.spec.ts` | New UI behavior has no existing durable coverage. |
| GW-UI-002 | `McpGatewayPanel` renders endpoint/config snippet and current MCP-origin tool count/list from store data, and refresh invokes `fetchMcpGatewayTools`. | REQ-GW-012, AC-GW-010. | `autobyteus-web/components/tools/__tests__/McpGatewayPanel.spec.ts` | New gateway panel behavior has no existing durable coverage; this verifies the live GraphQL-facing store output at the component boundary. |
| GW-UI-003 | Store `fetchMcpGatewayTools()` calls `GET_TOOLS` with `origin: MCP` and populates `mcpGatewayTools`. | REQ-GW-012, AC-GW-010. | `autobyteus-web/stores/__tests__/toolManagementStore.mcpGateway.spec.ts` | Proves the panel's count/list source is the intended GraphQL MCP-origin query, not local/all tools. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| GW-API-001 | `autobyteus-server-ts/tests/integration/mcp-gateway/mcp-gateway-routes.integration.test.ts` | Add a new real configured stdio MCP scenario; retain existing fake-tool/list/auth scenarios. | REQ-GW-006, AC-GW-003 | Narrow additive coverage only. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| GW-EXEC-001 | Run targeted backend Vitest suite including gateway catalog, gateway route, and agent-tools MCP regression tests. | Confirms backend API/protocol/access regression behavior after durable additions. | Final command evidence; durable assertions live in tests. |
| GW-EXEC-002 | Run targeted Nuxt/Vitest component/store tests for new gateway UI coverage. | Confirms tab/panel/store behavior. | Final command evidence; durable assertions live in tests. |
| GW-EXEC-003 | Run backend build typecheck. | Confirms TypeScript compile of gateway changes. | Build check, not a separate durable test artifact. |
| GW-EXEC-004 | Run web typecheck or targeted changed-file compile/test evidence; if repo-wide typecheck remains pre-existing red, record filtered result. | Confirms no changed gateway component/store type errors as far as practical. | Repo has known pre-existing typecheck debt; final report will distinguish. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Real Cursor/Antigravity/Claude Code binary configuration | External apps/credentials and user-local app state are outside this repository validation scope. Official MCP SDK Streamable HTTP client covers the protocol boundary. | Low for protocol correctness; product-specific config formatting still needs docs/user validation. | Delivery docs should show conservative config guidance. |
| Gateway profiles/per-client subsets/token CRUD | Explicitly out of scope/deferred. | None for first slice. | Future feature only. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | No ambiguity or reroute trigger found during investigation. | N/A |

## Execution Plan

1. Add narrow durable backend coverage for GW-API-001 in the existing MCP gateway integration test file using a self-contained configured stdio MCP server and real `McpToolRegistrar` / default registry / `McpServerProxy` path.
2. Add narrow durable frontend component/store tests for GW-UI-001 through GW-UI-003.
3. Run targeted backend build/typecheck and targeted backend Vitest suite.
4. Run targeted frontend Nuxt/Vitest tests and practical frontend static check evidence; if repo-wide web typecheck remains red from known pre-existing errors, record it separately.
5. Clean temporary runtime artifacts/processes and write the execution coverage report.
6. Because repository-resident durable coverage will be added after code review, route the cumulative package plus coverage artifacts back to `code_reviewer` for coverage-code re-review before delivery.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing coverage is valid but misses a durable real configured MCP proxy path and new UI tab/panel/store behavior. Add narrow tests, execute, then return to `code_reviewer` for the required coverage-code review.
