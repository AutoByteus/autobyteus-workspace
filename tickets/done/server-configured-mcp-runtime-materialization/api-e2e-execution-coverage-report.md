# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/server-configured-mcp-runtime-materialization/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/server-configured-mcp-runtime-materialization/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/server-configured-mcp-runtime-materialization/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/server-configured-mcp-runtime-materialization/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/server-configured-mcp-runtime-materialization/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/server-configured-mcp-runtime-materialization/code-review-report.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/server-configured-mcp-runtime-materialization/api-e2e-coverage-investigation.md`
- Current Execution Round: 1
- Trigger: Coverage investigation and execution after code-review pass for `server-configured-mcp-runtime-materialization`.
- Prior Round Reviewed: N/A
- Latest Authoritative Round: Round 1

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code-review pass and API/E2E handoff | N/A | None | Pass | Yes | Added/updated narrow durable coverage for configured MCP provider-session boundaries, then all focused checks passed. |

## Execution Basis

Execution followed the pre-written coverage investigation decisions. The validation target was the provider-facing configured MCP bridge: selected registry MCP-origin names flowing into Agent Tools MCP descriptors, Codex materialized config, route `tools/list`, route `tools/call`, raw MCP result preservation, unconfigured-call rejection, stale/collision behavior from existing catalog coverage, and Claude MCP-only allowed-tool behavior.

## Pre-Execution Coverage Investigation

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/server-configured-mcp-runtime-materialization/api-e2e-coverage-investigation.md`
- Completed before final test execution, durable coverage edits, durable coverage removals, or failure rerouting: `Yes`
- Existing durable coverage inventory reviewed: `Yes`
- Existing tests treated as authority without current-requirement validity review: `No`
- Stale or obsolete coverage found: `No`
- New durable coverage needed: `Yes`
- Reroute required from investigation: `No`
- Notes: Coverage investigation found no stale tests. It identified narrow durable coverage additions/updates needed in session-service, route integration, and Codex materializer tests.

## Existing Durable Coverage Decision Summary

| Path / Scenario | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Action Taken | Evidence |
| --- | --- | --- | --- |
| `tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts` configured MCP bridge | Still Valid | Retained and executed | Covers selected MCP-origin source exposure, tools/list definition, collision, adapter call, and stale registry fail-closed behavior. |
| `tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts` descriptor/session tests | Needs Update | Added configured MCP-origin descriptor/source snapshot scenario | New test verifies `db_query` appears in descriptor/session enabled tools, redaction-safe source snapshot is stored, and token/session secrets are not leaked in redacted data. |
| `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` route/SDK scenarios | Needs Update | Added configured MCP-origin official Streamable HTTP MCP client integration | New test verifies `db_query` appears in SDK `listTools`, SDK `callTool` succeeds with structured result and `_meta`, raw JSON-RPC error result preserves `isError`/`structuredContent`/`_meta`, unconfigured calls reject before execution, and app-facing data excludes session secrets. |
| `tests/unit/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.test.ts` descriptor mapping | Needs Update | Updated descriptor and expectation to include `db_query`; added wire-name normalization assertion | Confirms Codex config preserves arbitrary configured MCP-origin enabled names. |
| `tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts` Agent Tools MCP bootstrap scenarios | Still Valid | Retained and executed | Confirms Codex bootstrapper materializes non-empty Agent Tools MCP descriptors and does not use dynamic tools for Agent Tools MCP families. |
| `tests/unit/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-materializer.test.ts` | Still Valid | Retained and executed | Confirms Claude receives one `autobyteus_agent_tools` HTTP MCP server config. |
| `tests/unit/agent-execution/backends/claude/session/build-claude-session-mcp-servers.test.ts` | Still Valid | Retained and executed | Confirms no direct external MCP server config path is produced. |
| `tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts` MCP-only `db_query` | Still Valid | Retained and executed | Confirms Claude creates Agent Tools MCP tooling and allowed aliases for configured MCP-only selections. |
| `tests/integration/mcp-server-management/mcp-config-service.integration.test.ts` env-gated real MCP discovery | Out Of Scope | Not executed as mandatory gate | Validates external MCP setup/discovery when env exists, but this task's changed provider bridge is covered without external credentials/scripts. |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Execution Surfaces / Modes

- TypeScript build typecheck for implementation source.
- Patch whitespace/hygiene check.
- Unit coverage for catalog/session service/provider materializers/session gates.
- Integration coverage for route-backed Streamable HTTP MCP server using the official MCP SDK client over loopback.
- Raw JSON-RPC route call to verify exact `tools/call` error result shape including `_meta`.

## Platform / Runtime Targets

- Host worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools`
- Server package: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/autobyteus-server-ts`
- Runtime observed in test output: Node.js v22.21.1 warning context, Vitest v4.0.18.
- Test DB reset by Vitest/Prisma to SQLite `tests/.tmp/autobyteus-server-test.db` during integration execution.

## Lifecycle / Upgrade / Restart / Migration Checks

No installer/updater/restart/migration behavior is in scope. Existing in-memory Agent Tools MCP registry reset/revocation scenarios remained part of the route/session suite and passed.

## Coverage Matrix

| Scenario ID | Requirement / AC | Surface | Result | Evidence |
| --- | --- | --- | --- | --- |
| DC-001 | REQ-001, REQ-002, REQ-004, REQ-009; AC-002, AC-008 | Unit session-service test | Pass | `agent-tool-mcp-session-service.test.ts` now verifies `db_query` descriptor enabledTools and source snapshot. |
| DC-002 | REQ-002, REQ-003, REQ-006, REQ-008, REQ-009; AC-002, AC-004, AC-005, AC-006, AC-008 | Integration route + official MCP SDK client + raw JSON-RPC | Pass | `agent-tools-mcp-routes.integration.test.ts` configured MCP integration scenario passed. |
| DC-003 | REQ-004; AC-002 | Codex materializer unit | Pass | `codex-agent-tools-mcp-materializer.test.ts` expects `db_query` in `enabled_tools` and normalizes its Agent Tools MCP wire name. |
| Existing catalog bridge | REQ-001, REQ-002, REQ-003, REQ-006, REQ-007 | Unit catalog | Pass | Existing catalog configured MCP bridge tests passed, including collision and stale registry fail-closed. |
| Claude MCP-only gate | REQ-005; AC-003 | Claude session unit | Pass | Existing `db_query` allowed-tools/descriptor scenario passed. |

## Test Scope

Focused changed-scope suite only. Full repository test suite was not run because the workflow requires boundary-relevant API/E2E/executable coverage and the repo has known broader config noise noted in the implementation handoff. `tsconfig.build.json` was used for source typecheck per implementation/code-review guidance.

## Execution Setup / Environment

Commands were run from `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools` unless noted.

1. `git diff --check`
2. `cd autobyteus-server-ts && pnpm exec tsc -p tsconfig.build.json --noEmit`
3. `cd autobyteus-server-ts && pnpm exec vitest run tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts tests/unit/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.test.ts tests/unit/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-materializer.test.ts tests/unit/agent-execution/backends/claude/session/build-claude-session-mcp-servers.test.ts tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts`

Observed final focused test summary: `Test Files 8 passed (8)`, `Tests 58 passed (58)`.

## Tests Implemented Or Updated

- Added a session-service unit scenario in `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts` for configured MCP-origin descriptor/source snapshot creation and redaction-safety.
- Added a route integration scenario in `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` using the official MCP SDK client against a loopback Fastify Agent Tools MCP route with an MCP-origin fake registry tool.
- Updated `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.test.ts` to explicitly include and normalize `db_query`.

## Tests Removed As Stale Or Obsolete

| Path / Scenario | Obsolete Assertion | Upstream Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`
- Paths added or updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/autobyteus-server-ts/tests/unit/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.test.ts`
- Paths removed: None
- If `Yes`, returned through `code_reviewer` before delivery: `Pending via this handoff; delivery must wait for coverage-code re-review.`
- Post-API/E2E coverage code review artifact: Pending.

## Other Execution Artifacts

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/server-configured-mcp-runtime-materialization/api-e2e-coverage-investigation.md`
- Execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/server-configured-mcp-runtime-materialization/api-e2e-execution-coverage-report.md`

## Temporary Execution Methods / Scaffolding

No temporary files or scripts were retained. The fake MCP-origin registry/tool used for route verification is durable test fixture code inside the updated integration test.

## Dependencies Mocked Or Emulated

- External configured MCP server transport was emulated with a fake `ToolOrigin.MCP` registry definition and registry-created `BaseTool` test double. This verifies the Agent Tools MCP bridge and provider-facing Streamable HTTP boundary without depending on external MCP credentials/scripts.
- Real Codex and Claude provider processes were not launched; their materializer/session configuration paths were covered by focused unit tests and the shared MCP route was exercised with the official MCP SDK client.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First execution round. |

## Scenarios Checked

- Selected MCP-origin registered tool appears in `autobyteus_agent_tools` tools/list over SDK route.
- Prefixed-style registered name `db_query` is exposed/called while the fake remote result metadata records `remoteToolName: "query"`.
- Configured tool execution receives member-run owner identity as the execution `agentId`.
- Raw MCP success result preserves `content`, `structuredContent`, and `_meta`.
- Raw MCP error result preserves `content`, `isError`, `structuredContent`, and `_meta`.
- Unconfigured configured-MCP tool call is rejected before tool execution.
- Catalog stale registry mismatch still fails closed.
- Collision with built-in `send_message_to` remains deterministic and diagnostic-backed.
- Codex descriptor materialization includes configured MCP-origin enabled name.
- Claude MCP-only configured tool creates descriptor/allowed aliases.
- Existing built-in Agent Tools MCP route behavior, auth/protocol gates, revocation/reset, and publish_artifacts coverage remain passing.

## Passed

- `git diff --check` passed.
- `pnpm exec tsc -p tsconfig.build.json --noEmit` passed.
- Focused Vitest suite passed: `8` files, `58` tests.

## Failed

None.

## Not Tested / Out Of Scope

| Behavior / Boundary | Reason | Risk / Follow-Up |
| --- | --- | --- |
| Live Codex provider process invoking the configured MCP tool through an LLM/tool loop | The provider receives a standard Streamable HTTP MCP descriptor; the official MCP SDK client exercised that route boundary deterministically | Low; no follow-up required for this ticket. |
| Live Claude SDK provider process invoking the configured MCP tool through an LLM/tool loop | Claude descriptor/allowed-tools policy is unit-covered and the shared route is SDK-exercised | Low; no follow-up required for this ticket. |
| Real external MCP transport via `GenericMcpTool` against sqlite/Google server | Requires optional external env/scripts/credentials not part of this task; existing env-gated MCP config integration remains available | Medium residual operational risk; not a blocker for this provider bridge. |

## Blocked

None.

## Cleanup Performed

- No temporary scaffolding files were created.
- Fastify test servers and MCP SDK clients are closed by tests.
- No repository-resident stale coverage was removed.

## Classification

- `Local Fix`: N/A
- `Design Impact`: N/A
- `Requirement Gap`: N/A
- `Unclear`: N/A

## Recommended Recipient

`code_reviewer` for mandatory narrow coverage-code re-review because repository-resident durable coverage was updated after the prior code review.

## Evidence / Notes

Non-blocking stderr/stdout observed during tests:
- Existing SSL-certificate warning appears when `AUTOBYTEUS_SSL_CERT_FILE` is not set in this local test environment.
- Existing catalog fake-tool scenario logs a no-argument-schema warning for the fake tool and a collision diagnostic for `send_message_to`; both are expected by the current tests and did not indicate a failure.
- Vitest integration setup reset the local SQLite test database successfully.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: API/E2E/executable validation passed for the investigated scope. Because durable coverage changed, this package is routed back to `code_reviewer` before delivery.
