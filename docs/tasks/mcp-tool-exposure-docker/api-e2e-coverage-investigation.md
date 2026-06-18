# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/requirements.md`
- Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/investigation-notes.md`
- Design Spec: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/design-spec.md`
- Design Review Report: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/design-review-report.md`
- Implementation Handoff: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/implementation-handoff.md`
- Code Review Report: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review pass for route-backed Agent Tools MCP exposure and remote browser pairing removal; API/E2E stage must validate BrowserServer MCP exposure/call and browser-result normalization.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1 in this file.

## Current Requirement And Design Basis

Current approved behavior to prove:

- Remote/Docker nodes must not use or expose host Electron remote “Pair local browser” functionality.
- Remote/Docker browser automation must come from configured MCPs such as BrowserServer MCP, or no browser tools if no such MCP is registered/selected.
- Host Electron-started bundled server support remains only through env-injected `AUTOBYTEUS_BROWSER_BRIDGE_BASE_URL` and `AUTOBYTEUS_BROWSER_BRIDGE_TOKEN`.
- Inactive embedded browser adapters must not reserve names such as `open_tab`, `read_page`, or `screenshot`.
- `enabledTools`, `tools/list`, and `tools/call` must derive from the same per-session route decision with no duplicate same-name browser definitions.
- Same-name browser overlaps prefer configured MCP routes; protected platform/control tools such as `send_message_to` remain static-owned.
- Removed remote pairing GraphQL, Electron IPC, UI, node-state, docs, and stale tests must stay removed. The implementation handoff's Legacy / Compatibility Removal Check is clean: no compatibility mechanisms introduced, no old remote-pairing behavior retained, and obsolete files/tests removed.
- BrowserServer MCP-origin browser result envelopes must normalize to canonical browser activity payloads under the `autobyteus_agent_tools` provider path.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Docker/no-env BrowserServer MCP selected exposes `open_tab` | Changed | REQ-009 through REQ-012, AC-001, code-review residual risk | Validate route-backed descriptor, HTTP `tools/list`, and `tools/call` with BrowserServer-style `open_tab`. |
| Docker/no-env without BrowserServer MCP exposes no embedded browser tools | Changed | REQ-003, REQ-010, AC-002 | Validate existing inactive-browser tests and a representative no-MCP route/list behavior. |
| Host Electron embedded browser via env remains available | Preserved | REQ-002, AC-003, AC-011 | Retain and run focused env/runtime tests; no remote-pairing fallback allowed. |
| Same-name active embedded browser plus configured BrowserServer MCP prefers configured MCP | Added | REQ-012; design deterministic precedence | Existing route tests remain valid; run focused catalog tests. |
| Protected platform/control static tools block MCP collisions | Preserved/Changed | REQ-013, AC-012 | Existing catalog/session/route tests remain valid; run focused MCP suite. |
| Remote browser pairing GraphQL/IPCs/UI/state/docs/tests | Removed | REQ-001, REQ-004 through REQ-008, AC-006 through AC-010, AC-013 | Validate absence by focused UI/Electron/schema/search checks; stale removed tests stay removed. |
| BrowserServer MCP result shape and UI/activity normalization | Changed | Design DS-004 and code-review residual risk | Validate BrowserServer-style MCP result envelope through Agent Tools MCP call and Codex event normalizer. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts` | Active source routing, inactive browser adapter not reserving `open_tab`, active browser duplicate preferring configured MCP, protected static collision, configured MCP call dispatch. | REQ-009 to REQ-013; AC-001 to AC-005, AC-012 | Still Valid | Inspected tests include `routes a configured MCP browser tool when the embedded browser adapter is inactive`, duplicate active browser preference, embedded-only route, and protected `send_message_to`. | Run as final focused coverage. |
| `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts` | Session descriptor enabled tools, frozen route table, configured MCP source storage, executor events. | REQ-011; AC-001, AC-004 | Still Valid | Inspected tests verify descriptor/session route projections and no raw secret storage. | Run as final focused coverage. |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | Streamable HTTP Agent Tools MCP route auth, `tools/list`, `tools/call`, configured MCP pass-through, error mapping, no secret leakage. | REQ-011; AC-001, AC-004, AC-005 | Still Valid | Existing integration uses official MCP SDK for generic configured MCP and route-backed static tools; it does not specifically use BrowserServer `open_tab`. | Run existing integration and add temporary BrowserServer-style `open_tab` probe only. |
| `autobyteus-server-ts/tests/unit/agent-tools/browser/browser-bridge-config-resolver.test.ts` | Backend browser bridge config is env-only. | REQ-002, REQ-003; AC-002, AC-003 | Still Valid | Code-review/implementation removed runtime binding; test is relevant to env-only support. | Run as final focused coverage. |
| `autobyteus-server-ts/tests/unit/agent-tools/browser/register-browser-tools.test.ts`, `browser-tool-contract.test.ts`, `browser-tool-input-parsers.test.ts`, `browser-tool-semantic-validators.test.ts`, `browser-bridge-client.test.ts` | Embedded browser tool registration/contracts/input validation/client behavior. | REQ-002; AC-003, AC-011 | Still Valid | Host Electron embedded browser remains in scope; these tests are not stale. | Run focused browser unit suite where practical. |
| `autobyteus-server-ts/tests/unit/agent-tools/browser/browser-mcp-result-normalizer.test.ts` | Browser MCP envelopes/content/structuredContent normalize to canonical browser result records and warn on missing `tab_id`. | DS-004; result-shape residual risk | Still Valid | Inspected tests directly cover `open_tab` envelope shapes. | Run as final focused coverage. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` | Codex Agent Tools MCP provider names normalize to canonical tool names and browser results; no provider markers/secrets leak into payloads. | DS-004; browser activity-card/event normalization | Still Valid | Inspected `normalizes observed local MCP open_tab completion envelopes into direct browser results`. | Run as final focused coverage. |
| `autobyteus-server-ts/tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts` browser cases | Live Codex Agent Tools MCP host embedded browser path and canonical browser result event payload. | REQ-002; AC-003, AC-011 | Still Valid, but not required for this stage's new Docker/BrowserServer proof | Existing scenarios exercise env-injected embedded browser through live Codex and `BrowserBridgeLiveTestServer`; this stage needs no LLM-provider full-flow rerun unless focused route probes fail. | Do not rerun heavy model-dependent integration by default; rely on focused route/runtime probes. |
| `autobyteus-web/electron/browser/__tests__/browser-runtime.spec.ts` | Electron BrowserRuntime still creates local bridge/env overrides with remote listener/pairing removed. | REQ-002, REQ-005, REQ-008; AC-007, AC-011 | Still Valid | Code review reran this and it targets host env preservation. | Run as final focused Electron coverage. |
| `autobyteus-web/electron/__tests__/nodeRegistryStore.spec.ts` | Legacy `browserPairing` persisted state is dropped on load. | REQ-007; no backward compatibility | Still Valid | Inspected test asserts `browserPairing` is absent after load. | Run as final focused Electron coverage. |
| `autobyteus-web/components/settings/__tests__/NodeManager.spec.ts` | Node Manager renders node CRUD/mobile/docker guide and removes remote node without browser cleanup. | REQ-006, REQ-014; AC-006, AC-009 | Still Valid | Inspected test `removes a remote node without remote browser cleanup`; component no longer imports pairing controls. | Run as final focused web coverage. |
| `autobyteus-server-ts/tests/unit/api/graphql/types/definition-catalog-refresh.test.ts` plus schema introspection | GraphQL schema boundary absence checks for removed fields. | REQ-004; AC-008 | Needs Update? No durable update needed for this task | Existing durable schema absence test targets older node sync fields, not remote bridge; current source schema removal can be checked by temporary introspection/search without adding broad schema tests at this stage. | Use temporary schema probe for remote bridge absence; no durable edit unless it fails. |
| Deleted `autobyteus-server-ts/tests/e2e/runtime/remote-browser-bridge-runtime.e2e.test.ts` | Previously proved remote host-browser bridge registration runtime. | REQ-001/REQ-003 removal; AC-010 | Stale / Remove | Upstream explicitly removes remote pairing; implementation deleted this path. | Keep removed; no replacement beyond MCP-based route coverage. |
| Deleted `autobyteus-server-ts/tests/unit/agent-tools/browser/runtime-browser-bridge-registration-service.test.ts` | Previously proved runtime remote bridge binding service. | REQ-001/REQ-003 removal; AC-010 | Stale / Remove | Service deleted and no remote runtime binding should remain. | Keep removed. |
| Deleted `autobyteus-web/components/settings/__tests__/RemoteBrowserSharingPanel.spec.ts`, `RemoteNodePairingControls.spec.ts` | Previously proved remote sharing/pair controls. | REQ-001/REQ-006 removal; AC-006, AC-010 | Stale / Remove | UI surface intentionally removed. | Keep removed; NodeManager absence/CRUD coverage replaces relevant UI behavior. |
| Deleted `autobyteus-web/electron/browser/__tests__/browser-pairing-state-controller.spec.ts`, `remote-browser-sharing-settings-store.spec.ts`, and frontend remote sharing store/client tests | Previously proved Electron/frontend remote pairing state and IPC support. | REQ-001/REQ-005/REQ-008 removal; AC-007, AC-010 | Stale / Remove | Remote pairing IPC/state/settings intentionally removed. | Keep removed; run source search and Electron runtime tests. |
| `autobyteus-web/docs/browser_sessions.md` | User-facing docs now direct Docker/remote browser automation to BrowserServer MCP and describe result normalization. | REQ-015; AC-013 | Still Valid | Search showed current docs mention BrowserServer MCP for Docker/remote and no pairing flow. | Include docs/search check in final evidence. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/remote-browser-bridge-runtime.e2e.test.ts` | Remote backend accepts a host Electron bridge descriptor and exposes embedded browser tools. | Remote/Docker nodes must use configured MCP or no browser tools; remote host pairing is removed. | REQ-001, REQ-003, REQ-004, AC-010, design Legacy Removal Policy. | Agent Tools MCP route tests and temporary BrowserServer-style route probe. | No direct replacement because remote bridge behavior is invalid. |
| `autobyteus-server-ts/tests/unit/agent-tools/browser/runtime-browser-bridge-registration-service.test.ts` | Runtime remote bridge binding service registers/unregisters browser support. | Runtime binding service is removed; backend resolver is env-only. | REQ-003, REQ-008, design removal plan. | `browser-bridge-config-resolver.test.ts` env-only coverage plus no-env MCP route checks. | Runtime binding must not survive as compatibility path. |
| `autobyteus-web/components/settings/__tests__/RemoteBrowserSharingPanel.spec.ts` and `RemoteNodePairingControls.spec.ts` | Remote Browser Sharing panel and Pair/Unpair local browser controls exist. | Product surface removed. | REQ-006, AC-006, AC-010. | `NodeManager.spec.ts` node CRUD and removal-without-cleanup coverage. | Removed UI has no valid behavior to test. |
| Electron/browser pairing and remote sharing store specs | Pairing IPC/state/settings can issue/revoke remote descriptors. | Electron must expose local bridge/env only; pairing APIs removed. | REQ-005, REQ-008, AC-007, design removal plan. | `browser-runtime.spec.ts`, `nodeRegistryStore.spec.ts`, source/preload absence search. | Remote descriptor behavior is invalid. |
| Frontend `remoteBrowserSharingStore` / `nodeRemoteBrowserPairingClient` specs | Frontend calls remote bridge GraphQL mutations. | GraphQL mutations removed and no remote pairing client remains. | REQ-004, REQ-006, AC-008, AC-010. | GraphQL absence probe and NodeManager coverage. | No valid replacement for removed client/store behavior. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | Existing durable route, browser normalization, UI/Electron removal, and docs coverage is sufficient. BrowserServer-specific runtime proof will be a temporary executable probe to avoid adding test-only infrastructure for a one-off fake MCP server after code review. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | No repository-resident durable coverage update planned in this round. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| Already removed stale remote bridge/pairing tests listed above | They asserted intentionally removed behavior. | REQ-001 through REQ-008; AC-010. | Keep removed; replacement is MCP route/absence coverage, not compatibility coverage. |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEP-001 | Temporary Vitest probe under `/tmp` creating a Fastify Agent Tools MCP server, fake MCP registry definition named `open_tab` with `mcp_server_id: BrowserServer`, no browser env, official MCP SDK Streamable HTTP client. | Descriptor `enabledTools`, `tools/list`, and `tools/call` expose/call `open_tab` as configured MCP with BrowserServer-style result envelope and no duplicate tools. | Existing durable route tests already cover generic configured MCP and browser-name route policy; this probe is an API/E2E stage representative runtime evidence artifact. |
| TEP-002 | Temporary schema/source absence probe using `buildGraphqlSchema()` and repository searches. | Remote bridge mutations/types/IPCs/UI identifiers are absent except intentional legacy persisted `browserPairing` drop assertion. | Absence is broad cleanup evidence; durable tests already cover key UI/Electron normalization boundaries. |
| TEP-003 | Focused existing Vitest suites for server Agent Tools MCP/browser normalization/Codex events, web NodeManager, Electron runtime/node registry, build/transpile/localization/diff checks. | Current durable coverage still passes after implementation. | These are existing durable tests; no new scaffolding remains. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full model-driven Codex agent run against a real BrowserServer MCP subprocess | Would require live LLM/Codex behavior and potentially BrowserServer/Chrome orchestration beyond the bounded source change; route/list/call and event normalization can be proven deterministically in-process. | Low to medium; real MCP subprocess may surface environmental issues not present in fake registry result. | Temporary TEP-001 uses BrowserServer-style MCP result envelope and official MCP HTTP client; delivery may note no full live model run. |
| Real UI rendering of browser activity cards in browser/Electron app | UI cards consume canonical event payloads; changed server concern is payload normalization, not UI component code. | Low; if UI has separate browser-specific rendering assumptions, they are not changed here. | Server Codex event normalizer test/probe validates canonical payload shape consumed by UI. |
| Historical archival docs containing prior remote browser pairing references | Current product docs/source are in scope; archival historical tickets may mention old behavior. | Low. | No action; do not rewrite historical artifacts unless delivery docs policy requires it. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None identified before execution. | N/A | Upstream artifacts are explicit and implementation/code review are clean. | N/A |

## Execution Plan

1. Run TEP-001 temporary Vitest BrowserServer-style route probe over the actual Agent Tools MCP HTTP route and official MCP SDK.
2. Run TEP-002 temporary GraphQL/source absence probe for removed remote bridge/pairing surfaces.
3. Run existing focused server durable coverage: Agent Tools MCP catalog/session/routes, browser config/contract/normalizer, Codex event normalizer.
4. Run existing focused web/Electron durable coverage: NodeManager, BrowserRuntime, node registry store.
5. Run build/static checks that are relevant and already code-review validated: server build tsc, web Electron transpile, localization guard, `git diff --check`.
6. Remove all temporary probe files, record evidence in execution coverage report, and hand off to `delivery_engineer` if no durable coverage files are added/updated/removed.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing durable coverage is valid after removal decisions; stale remote-pairing coverage has already been removed by implementation. This round will use temporary executable probes for BrowserServer-specific route/result evidence and will not leave repository-resident coverage changes unless execution uncovers a gap.
