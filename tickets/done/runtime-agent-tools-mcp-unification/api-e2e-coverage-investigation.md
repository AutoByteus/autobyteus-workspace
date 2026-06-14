# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification/tickets/done/runtime-agent-tools-mcp-unification/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification/tickets/done/runtime-agent-tools-mcp-unification/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification/tickets/done/runtime-agent-tools-mcp-unification/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification/tickets/done/runtime-agent-tools-mcp-unification/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification/tickets/done/runtime-agent-tools-mcp-unification/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification/tickets/done/runtime-agent-tools-mcp-unification/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code review Round 2 pass from `code_reviewer` requesting API/E2E coverage investigation and execution for runtime Agent Tools MCP unification.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The review-passed implementation must prove that Claude Agent SDK and Codex App Server expose configured server-owned backend tools through one session-scoped `autobyteus_agent_tools` MCP server instead of old runtime-specific Claude local MCP servers or Codex `dynamicTools`. In-scope tool families are `send_message_to`, browser tools, media tools, task-delegation tools, and `publish_artifacts`. The MCP catalog/session/executor must apply configured-tool, browser-support, task-member-context, workspace/run-context, and no-secret rules. Runtime events/history must show canonical tool names such as `open_tab`, `generate_image`, `delegate_tasks`, and `publish_artifacts`, without bearer tokens, session ids, full descriptors, or provider wrapper names. AutoByteus native remains local/in-process.

The implementation handoff's Legacy / Compatibility Removal Check is clean: no backward-compatibility mechanisms introduced, no legacy old behavior retained, obsolete migrated Claude/Codex projection files removed, shared structures kept tight. Static investigation still found stale coverage labels/assertions in a few Codex dynamic-tool tests that are not production fallback evidence, but should be updated so durable coverage no longer implies migrated tools are valid Codex dynamic tools.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Agent Tools MCP catalog/session exposes configured supported tools across send, browser, media, task delegation, and publish families | Added / Changed | REQ-UATM-001/002/013; AC-UATM-001/002; design DS-UATM-001/004 | Retain catalog/session/unit coverage; add default-executable route-backed publish coverage; execute route tests. |
| Browser tool exposure for Claude/Codex through `autobyteus_agent_tools`, absent when bridge unsupported | Changed / Removed old paths | REQ-UATM-003/007/008/012; AC-UATM-003/005/006/010 | Retain browser availability/unit/live-gated coverage; update stale live test labels that still say Codex dynamic or Claude browser MCP path. |
| Media tool exposure for Claude/Codex through `autobyteus_agent_tools` using workspace context | Changed / Removed old paths | REQ-UATM-005/007/008/012; AC-UATM-002/006/009 | Retain media local/service/path coverage and materializer/event tests; live media credentials are environment-gated. |
| Task delegation exposed only for member-team sessions through Agent Tools MCP | Changed / Removed old Codex dynamic/Claude team MCP paths | REQ-UATM-004/007/008/012; AC-UATM-004/005/006/009 | Update stale Codex team bootstrap unit test that still expects dynamic task registrations; retain service/instruction/runtime-description coverage. |
| `publish_artifacts` executes through Agent Tools MCP against active run id and preserves durable projection/event behavior | Changed | REQ-UATM-006; AC-UATM-002/006/007/009/011; code-review residual risk | Add default-executable integration coverage that calls `publish_artifacts` through `/mcp/agent-tools/:sessionId` and verifies projection, snapshot, `ARTIFACT_PERSISTED`, canonical result, and no descriptor/secret leaks. |
| Claude allowed-tool names derive from descriptor enabled tools | Changed | AC-UATM-005; design residual risk | Retain unit coverage; live Claude binary exists but live tests are gated by `RUN_CLAUDE_E2E=1`; classify live execution as deferred/environment-gated unless env is provided. |
| Codex app-server thread config uses `mcp_servers.autobyteus_agent_tools` and no migrated dynamic registrations | Changed / Removed old paths | REQ-UATM-008/012; AC-UATM-006/010 | Retain bootstrap/materializer/unit coverage; update generic dynamic infra tests to use custom non-migrated tool names. |
| Provider wire names and MCP secrets are redacted in events/history/memory | Changed | REQ-UATM-009/010; AC-UATM-007/011; CR-001 fix | Execute event/history/no-leak tests and route-backed publish no-leak assertions. |
| AutoByteus native local/in-process tool registration remains unchanged | Preserved | REQ-UATM-011; UC-UATM-010; AC-UATM-012 | Retain AutoByteus local media/publish/runtime tests; not part of MCP route migration. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts` | Resolves configured supported tools across send/browser/media/task/publish with browser and team gates | REQ-UATM-001/003/004/013; AC-UATM-001/003/004 | Still Valid | Reads updated catalog/providers and configured exposure | Execute. |
| `tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts` | Session service builds secret descriptors, redacts token/session id, executor delegates to adapter | REQ-UATM-001/002/010; AC-UATM-001/002/011 | Still Valid | Directly covers descriptor/no-leak and executor observer path | Execute. |
| `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | HTTP route initialize/list/call/gate behavior and official MCP SDK client probe; currently send-message-focused | REQ-UATM-002/010; AC-UATM-002/011 | Needs Update | Route shape is valid, but default executable route-backed non-send active-run publish path is not covered without live Codex/Claude gates | Add route-backed `publish_artifacts` active-run scenario; execute. |
| `tests/unit/agent-execution/backends/claude/session/build-claude-session-mcp-servers.test.ts` | Claude materializes only unified `autobyteus_agent_tools` HTTP server | REQ-UATM-007/012; AC-UATM-005/010 | Still Valid | Asserts no per-family Claude servers in materialized config | Execute. |
| `tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts` | Claude descriptor enabled tools and allowed tool names derive from configured tool names | REQ-UATM-007/009/013; AC-UATM-005/007 | Still Valid | Includes send, browser, media, task, publish, old singular publish rejection | Execute. |
| `tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` | Claude SDK client forwards MCP server config / allowed tools | Design residual: allowed-tool behavior | Still Valid | Unit-level SDK option shape coverage | Execute. |
| `tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts` live browser scenarios | Live Claude open_tab/browser surface execution, gated by `RUN_CLAUDE_E2E=1` and `claude` binary | REQ-UATM-003/007/009; AC-UATM-003/005/007 | Needs Update | Test labels still say "Claude browser MCP path", ambiguous with removed old local browser MCP server | Update labels to "Claude Agent Tools MCP path"; execute in default run to confirm skip or when env available. |
| `tests/unit/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.test.ts` | Codex thread-scoped MCP config uses `mcp_servers.autobyteus_agent_tools`; generic non-send name normalization | REQ-UATM-008/009/010; AC-UATM-006/007/011 | Still Valid | Descriptor with `send_message_to` + `generate_image`; exact-prefix no-leak edge | Execute. |
| `tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts` | Codex bootstrap config, no dynamic migrated tools, Agent Tools MCP enabled tools for browser/media/publish | REQ-UATM-008/012/013; AC-UATM-006/010 | Needs Update | One test label says "browser dynamic tools" for a negative dynamicTools assertion; behavior remains valid but label is stale | Update label/wording; execute. |
| `tests/unit/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.test.ts` | Team member instructions for send/task delegation | REQ-UATM-004/008/012; AC-UATM-004/006/010 | Needs Update | Last test still expects task delegation `dynamicToolRegistrations`; current source returns null and task tools move to Agent Tools MCP session/catalog | Update assertion to instruction-only/no dynamic registrations; execute. |
| `tests/unit/agent-execution/backends/codex/backend/codex-configured-tool-gating.test.ts` | Generic dynamic registration filtering | REQ-UATM-012; no direct migrated requirement except generic infra can remain | Needs Update | Uses migrated names (`open_tab`, `publish_artifacts`) as dynamic registrations, which can imply compatibility dynamic exposure | Keep generic infra test but rename fixtures to custom non-migrated dynamic tools; execute. |
| `tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts` dynamic tool approval scenarios | Generic Codex dynamic tool approval/execution infrastructure | Out-of-scope generic dynamic infra; no migrated family fallback allowed | Needs Update | Several generic dynamic handler fixtures use migrated names (`publish_artifacts`, `generate_image`, `generate_speech`) | Rename fixtures to custom non-migrated dynamic tool names; execute. |
| `tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts` live Codex custom dynamic and Agent Tools MCP browser/publish scenarios | Live Codex app-server events, custom dynamic tools, browser/publish Agent Tools MCP flows | REQ-UATM-006/008/009/010/012; AC-UATM-006/007/009/010/011 | Needs Update | Live Agent Tools MCP publish scenario exists but gated by `RUN_CODEX_E2E=1`; one browser surface label still says "dynamic tool path" | Update stale label; default execution will classify live scenarios as skipped unless env is enabled. |
| `tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` | Codex event canonicalization/no-leak for Agent Tools MCP send and `generate_image` | REQ-UATM-009/010; AC-UATM-007/011 | Still Valid | Includes non-send Agent Tools MCP and secret redaction cases | Execute. |
| `tests/unit/agent-execution/backends/codex/history/codex-thread-history-item-normalizer.test.ts` and `tests/integration/run-history/codex-mcp-tool-args-projection.integration.test.ts` | Codex history/memory traces use canonical Agent Tools MCP names and parsed args/results | REQ-UATM-009/010; AC-UATM-007/011 | Still Valid | Covers `generate_image` history/memory projection | Execute. |
| `tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts` | Claude event canonicalization for send/browser/media Agent Tools MCP names/results | REQ-UATM-009/010; AC-UATM-007/011 | Still Valid | Covers `mcp__autobyteus_agent_tools__open_tab` and `generate_image` | Execute. |
| `tests/e2e/media/server-owned-media-tools.e2e.test.ts` | AutoByteus local media registry, model settings, path resolution | REQ-UATM-005/011; AC-UATM-012 | Still Valid | Old Claude/Codex projection sections were removed; remaining local media semantics remain current | Execute. |
| `tests/e2e/runtime/remote-browser-bridge-runtime.e2e.test.ts` | Browser support can be registered/cleared through GraphQL and service executes bridge calls | REQ-UATM-003; AC-UATM-003 | Still Valid | Proves environment-gated browser service behavior independent of runtime LLMs | Execute. |
| `tests/e2e/runtime/all-runtime-send-message-matrix.e2e.test.ts` and team roundtrip E2Es | Live all-runtime send_message_to path and no provider/secret leaks, env-gated | REQ-UATM-008/009/010; AC-UATM-008/011 | Still Valid | Gated by `RUN_LMSTUDIO_E2E=1`, `RUN_CODEX_E2E=1`, `RUN_CLAUDE_E2E=1`; default run should report skip | Execute if feasible; otherwise classify as environment-gated. |
| Static scans over `src`/`tests` for old migrated server/builder names | No old active projection names remain | REQ-UATM-012; AC-UATM-010 | Still Valid | Code review ran one scan; API/E2E should re-run after coverage edits | Execute. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.test.ts` | Task delegation is added as Codex dynamic tool registrations in team bootstrap strategy | Task delegation moved to Agent Tools MCP catalog/session and dynamic registrations must not expose migrated tools | REQ-UATM-004/008/012; design Removal Plan; implementation handoff CR-002 | Update to assert task instructions are present and `dynamicToolRegistrations` is null | N/A |
| `tests/unit/agent-execution/backends/codex/backend/codex-configured-tool-gating.test.ts` | Generic dynamic filtering examples named `open_tab` / `publish_artifacts` | These are migrated tools and should not be represented as Codex dynamic registrations in durable coverage | REQ-UATM-012; Backward-Compatibility Rejection Log | Rename fixtures to custom dynamic-only tools while preserving generic infra coverage | N/A |
| `tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts` | Generic dynamic approval/execution fixtures named `publish_artifacts`, `generate_image`, `generate_speech` | Those migrated families now execute through Agent Tools MCP, not Codex dynamic handlers | REQ-UATM-008/012; AC-UATM-010 | Rename fixtures to custom dynamic-only tools | N/A |
| `tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts` browser surface label | Says "Codex browser dynamic tool path" | Browser migrated to Agent Tools MCP | REQ-UATM-008/012; CR-002 | Rename label to "Codex Agent Tools MCP path" | N/A |
| `tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts` browser labels | Say "Claude browser MCP path" and could be read as old `autobyteus_browser` local MCP path | Browser migrated to unified Agent Tools MCP | REQ-UATM-007/012 | Rename labels to "Claude Agent Tools MCP path" | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| UATM-API-001 | `publish_artifacts` called via `/mcp/agent-tools/:sessionId` for an active run persists durable projection/snapshot, emits `ARTIFACT_PERSISTED`, returns canonical MCP text JSON, and does not leak bearer/session/provider config | REQ-UATM-006/009/010; AC-UATM-002/007/009/011; code-review residual risk | `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | Existing live Codex publish scenario is env-gated; default executable route coverage should prove the active-run publication boundary deterministically. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| UATM-API-002 | `tests/unit/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.test.ts` task delegation dynamic test | Assert task delegation instructions remain, and `dynamicToolRegistrations` is null | REQ-UATM-004/008/012; AC-UATM-004/006/010 | Production source already returns null; this is stale coverage cleanup. |
| UATM-API-003 | `tests/unit/agent-execution/backends/codex/backend/codex-configured-tool-gating.test.ts` | Rename fixture dynamic tools to custom non-migrated names | REQ-UATM-012; AC-UATM-010 | Preserves generic dynamic infra coverage without compatibility signal. |
| UATM-API-004 | `tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts` | Rename dynamic handler fixtures to custom non-migrated names | REQ-UATM-012; AC-UATM-010 | Preserves generic dynamic approval/auto-execute coverage. |
| UATM-API-005 | Live integration labels in Codex/Claude backend factory tests and Codex bootstrapper negative test | Rename stale "dynamic"/ambiguous old MCP labels to Agent Tools MCP/no dynamicTools language | REQ-UATM-007/008/012; AC-UATM-005/006/010 | Label-only coverage clarity. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None planned | Existing stale assertions can be updated in place | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| UATM-PROBE-001 | Static scan over `autobyteus-server-ts/src` and `autobyteus-server-ts/tests` for old migrated server names, deleted builder names, raw bearer/header/session leak strings in relevant test outputs | No old migrated projection names remain after coverage edits; no obvious descriptor secrets in artifacts | Static command evidence belongs in execution report, not as repository code. |
| UATM-PROBE-002 | Check local live-gate feasibility (`codex --version`, `claude --version`, `RUN_*_E2E` envs) | Whether live Claude/Codex/browser/media runtime tests can be executed in this environment | Environment classification only. |
| UATM-PROBE-003 | Run focused and broader vitest commands after durable coverage edits | Valid current durable coverage passes | Command evidence belongs in report. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live Claude multi-tool remote MCP allowed-tool behavior | `claude` binary exists, but live tests are intentionally gated by `RUN_CLAUDE_E2E=1`; no gate env provided in handoff environment | Unit coverage may miss provider-version allowed-tool behavior | Record as environment-gated unless user/CI enables `RUN_CLAUDE_E2E=1` with credentials/model availability. |
| Live Codex app-server non-send Agent Tools MCP payloads | `codex` binary exists, but live Codex tests are gated by `RUN_CODEX_E2E=1`; no gate env provided | Unit fixtures may miss provider payload variants | Default route/integration/unit coverage will run; live app-server should run in gated CI or local release validation. |
| Live media generation using real model credentials | Media clients require configured model credentials; default tests use mocks | Real provider-specific media errors not covered | Keep mocked deterministic E2E/service coverage; run live media validation only where credentials are configured. |
| Live all-runtime send-message matrix | Requires `RUN_LMSTUDIO_E2E=1`, `RUN_CODEX_E2E=1`, `RUN_CLAUDE_E2E=1` and live model availability | Cross-runtime live path not re-proven by default | Default execution should show skip; live CI/manual validation should enable gates. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None requiring upstream reroute before validation | N/A | Stale coverage labels/assertions are coverage-code issues local to API/E2E; production implementation passed code review and matches no-legacy policy | N/A |

## Execution Plan

1. Update stale durable coverage in Codex dynamic-related unit tests and live-test labels so migrated tools are not represented as dynamic-tool examples.
2. Add deterministic integration coverage for `publish_artifacts` through the Agent Tools MCP HTTP route with an active-run publication service and no-leak assertions.
3. Run focused tests for changed coverage files first.
4. Run targeted Agent Tools MCP/runtime materializer/event/history/media/browser coverage commands.
5. Run source build typecheck (`pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`) and record the known `pnpm -C autobyteus-server-ts typecheck` TS6059 limitation without treating it as new failure.
6. Re-run static obsolete-name/no-leak scans over `src` and `tests` after coverage edits.
7. Execute default-gated live suites where feasible; classify skipped gates explicitly.
8. Write the canonical execution coverage report and route the cumulative package back to `code_reviewer` because repository-resident durable coverage will be added/updated after the prior code review.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Coverage investigation found stale test assertions/labels but no production compatibility fallback. Durable coverage changes are required; successful execution must return through `code_reviewer` before delivery.
