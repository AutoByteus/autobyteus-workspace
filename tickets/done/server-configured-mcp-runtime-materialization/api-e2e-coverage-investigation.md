# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/server-configured-mcp-runtime-materialization/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/server-configured-mcp-runtime-materialization/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/server-configured-mcp-runtime-materialization/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/server-configured-mcp-runtime-materialization/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/server-configured-mcp-runtime-materialization/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/server-configured-mcp-runtime-materialization/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review-passed handoff requesting API/E2E coverage investigation and execution for `server-configured-mcp-runtime-materialization`.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved behavior is to expose agent-definition-selected configured MCP-origin registry tools to Codex App Server and Claude Agent SDK through the existing run-scoped `autobyteus_agent_tools` Streamable HTTP MCP server, not by directly materializing external MCP configs into provider-specific files. The authoritative selection input is `agentDefinition.toolNames`; the runtime-facing bridge must consult the shared tool registry for `ToolOrigin.MCP` definitions and `metadata.mcp_server_id`, expose only selected enabled registered names, preserve built-in Agent Tools MCP behavior, reject or skip collisions deterministically, fail closed on stale registry state, and delegate configured MCP calls through the registry-created tool / existing MCP execution path. Raw MCP `content`, `isError`, `structuredContent`, and `_meta` should survive the Agent Tools MCP JSON-RPC response. Secret-bearing capability tokens, headers, env values, session IDs, and provider wire names must not leak into app-facing events or durable provider config beyond the intended run-scoped descriptor.

The implementation handoff's Legacy / Compatibility Removal Check is clean: no backward-compatibility mechanisms introduced, no legacy old behavior retained, and no direct provider-native external MCP materialization path added. Code review independently passed this no-compatibility/no-legacy verdict.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Agent Tools MCP catalog/session exposure includes selected configured MCP-origin registry tools | Added | REQ-001, REQ-002, AC-002, AC-003; implementation handoff "configured MCP source snapshots" and catalog bridge | Must have durable coverage for source resolution, session descriptor `enabledTools`, `tools/list`, and configured source snapshots. |
| Configured MCP calls through Agent Tools MCP delegate to registry-created tool and fail closed on stale registry/source mismatch | Added | REQ-003, REQ-006, AC-004, AC-006; implementation handoff stale registry note | Must have durable coverage for successful configured call, prefixed registered name, and stale registry mismatch. |
| Built-in Agent Tools MCP adapters remain authoritative on name collision | Changed | REQ-007, AC-007; design collision policy | Existing/new coverage must show ambiguous owners are not exposed as configured MCP sources. |
| Raw MCP result shape is preserved in provider-facing `tools/call` result | Changed | REQ-008; implementation handoff typed raw result union | Durable API/integration coverage should exercise `content`, `isError`, `structuredContent`, and `_meta` through JSON-RPC/SDK boundary, not only a unit mapper. |
| Codex materializer continues to use one `autobyteus_agent_tools` descriptor with enabled tool names | Preserved/Changed | REQ-004, AC-002 | Coverage should explicitly include arbitrary configured MCP-origin names in materialized `enabled_tools`. |
| Claude materializer/session allowed-tools policy includes configured MCP-only tools | Changed | REQ-005, AC-003; code-review handoff hint | Existing durable coverage with `db_query` is still valid. |
| Direct provider-native external MCP config materialization remains out of scope | Preserved/Removed old omission only | Out-of-scope list; design spec; code-review no-legacy verdict | No durable coverage should be added for direct external provider config paths. |
| Secret redaction/no leakage for descriptor/session values | Preserved/Changed | REQ-009, AC-008 | Existing descriptor/route tests remain valid; new route coverage should also assert no capability token/session leakage in app-facing responses. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts` configured MCP bridge scenarios | Resolves MCP-origin registry tools into session exposure/tools/list, preserves built-in collision authority, calls registry-backed adapter, fails closed on stale server mismatch | REQ-001, REQ-002, REQ-003, REQ-006, REQ-007; AC-002, AC-004, AC-005, AC-006, AC-007 | Still Valid | Test uses selected `db_query`, `ToolOrigin.MCP`, `metadata.mcp_server_id`, fake registry, collision, and stale mismatch. | Retain and execute. |
| `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts` base descriptor/session tests | Creates redacted descriptor for built-in tools; checks auth/session secrecy, revocation, reset behavior, executor observer behavior | REQ-002, REQ-009; AC-002, AC-006, AC-008 | Needs Update | Existing descriptor test only covers built-in `send_message_to`; it does not prove session service stores configured MCP source snapshots and descriptor `enabledTools` for MCP-origin tools. | Add focused configured MCP session-service durable coverage. |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` publish and route scenarios | Exercises Streamable HTTP route, official MCP SDK client, auth/protocol gates, built-in calls, reset/revocation, no session-secret leakage | REQ-002, REQ-006, REQ-009; AC-002, AC-006, AC-008 | Needs Update | Existing route executor is mocked for generic tool calls and publish coverage is built-in only; it does not prove a configured MCP-origin tool through real catalog/executor over the MCP route nor raw MCP shape preservation at JSON-RPC/SDK boundary. | Add configured MCP route integration with actual catalog/executor and fake MCP-origin registry tool returning raw MCP results. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.test.ts` | Maps descriptor to Codex `mcp_servers.autobyteus_agent_tools` with `enabled_tools` and header mapping; normalizes Agent Tools MCP wire names | REQ-004, AC-002, AC-008 | Needs Update | Existing descriptor uses only built-in names; behavior is generic, but acceptance explicitly needs configured MCP-origin name visibility. | Update/extend descriptor expectation with `db_query`. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts` Agent Tools MCP app server config scenarios | Bootstrapper creates Codex app server config from session-service descriptor for configured built-in Agent Tools MCP names | REQ-004, AC-002 | Still Valid | Bootstrapper calls session service unconditionally and materializes non-empty descriptors; service/catalog tests will prove MCP-origin enabled descriptors. | Execute broader targeted Codex suite; no change required for this stage. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-materializer.test.ts` | Maps descriptor to Claude HTTP MCP server config and normalizes Agent Tools MCP wire names | REQ-005, AC-003, AC-008 | Still Valid | Claude server config does not enumerate enabled names; allowed names are covered by session-gating. | Retain and execute. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/build-claude-session-mcp-servers.test.ts` | Emits only unified Agent Tools MCP server when descriptor has enabled tools | REQ-005, AC-003 | Still Valid | Generic descriptor behavior remains current; no direct external config path is expected. | Retain and execute. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts` configured MCP-only Claude scenario | Ensures `db_query` creates Agent Tools MCP descriptor and Claude allowed tool aliases including `mcp__autobyteus_agent_tools__db_query` | REQ-005, AC-003 | Still Valid | Current test directly covers MCP-only configured Claude tooling gate. | Retain and execute. |
| `autobyteus-server-ts/tests/integration/mcp-server-management/mcp-config-service.integration.test.ts` real external MCP discovery scenarios | Optionally configures/discovers real sqlite/Google MCP tools when env is present | AC-001, configured MCP discovery/prefix baseline | Out Of Scope for mandatory execution in this task | Scenarios are env-gated and validate configuration/discovery, not provider runtime materialization. | Do not require; no env-dependent final gate. |
| Native Autobyteus resolver paths (`resolveAutoByteusAgentTools`) | Native runtime can already use registry-selected MCP tools | AC-001 | Out Of Scope for new durable API/E2E changes | Requirements explicitly preserve current native behavior; no changed native code path in implementation. | Rely on source review and build; no new API/E2E coverage added. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| DC-001 | Session service includes configured MCP-origin registered tool names in descriptor `enabledTools` and stores redaction-safe configured source snapshots without leaking raw token/session values | REQ-001, REQ-002, REQ-004, REQ-009; AC-002, AC-008 | `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts` | The provider materializers consume the session-service descriptor; catalog-only coverage is insufficient for this boundary. |
| DC-002 | Official Streamable HTTP MCP client sees and calls a selected configured MCP-origin tool over the real Agent Tools MCP route/catalog/executor path; response preserves `content`, `structuredContent`, `_meta`, and `isError`; unselected calls reject before execution and do not leak session secrets | REQ-002, REQ-003, REQ-006, REQ-008, REQ-009; AC-002, AC-004, AC-005, AC-006, AC-008 | `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | This is the closest durable API/E2E proof of realistic provider sessions without requiring real Codex/Claude processes or external credentials. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| DC-003 | `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.test.ts` descriptor mapping | Include a configured MCP-origin name such as `db_query` in `enabled_tools` expectation | REQ-004, AC-002 | Confirms Codex materializer treats registered MCP-origin names as ordinary descriptor-enabled names. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TV-001 | Final targeted `vitest` execution of current Agent Tools MCP, Codex materializer/bootstrapper, and Claude materializer/session tests | Confirms all relevant durable scenarios pass together after coverage edits | Test execution itself is evidence recorded in the execution report; no temporary code retained. |
| TV-002 | `pnpm exec tsc -p tsconfig.build.json --noEmit` and `git diff --check` | Source build and patch hygiene | Command evidence only. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live Codex App Server process invoking the tool via LLM/provider process | Local durable integration can exercise the exact Streamable HTTP MCP route with the official MCP SDK client; launching a real Codex provider process would add nondeterminism and external runtime dependence beyond this task | Low after route/materializer coverage because provider receives a standard MCP descriptor and SDK client exercises the protocol boundary | None for this task. |
| Live Claude SDK process invoking the tool via LLM/provider process | Claude allowed-tools policy and MCP server materialization are unit-covered; route protocol is exercised with official MCP SDK | Low | None for this task. |
| Real external configured MCP server using actual `GenericMcpTool` transport | Existing env-gated MCP config integration covers real discovery when credentials/scripts are supplied; this task can prove bridge delegation through registry-created tools without requiring unavailable external MCP setup | Medium residual risk that real remote transport has separate operational issues; implementation intentionally delegates to existing native MCP machinery | Record as residual risk/no blocker unless env becomes available. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None identified | N/A | Upstream package and implementation/code-review no-legacy verdict are consistent | N/A |

## Execution Plan

1. Add durable coverage DC-001, DC-002, and DC-003 only; do not alter implementation logic.
2. Run patch hygiene: `git diff --check`.
3. Run implementation build typecheck: `cd autobyteus-server-ts && pnpm exec tsc -p tsconfig.build.json --noEmit`.
4. Run focused valid coverage suite including updated Agent Tools MCP unit/integration tests, Codex materializer/bootstrapper tests, and Claude materializer/session tests.
5. Write the API/E2E execution coverage report with command evidence and residual not-tested boundaries.
6. Because repository-resident durable coverage will be updated after code review, hand the cumulative package back to `code_reviewer` for narrow coverage-code re-review before delivery.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: No stale/obsolete coverage removal is planned. Coverage updates are narrow and boundary-local to the provider-facing configured MCP bridge.
