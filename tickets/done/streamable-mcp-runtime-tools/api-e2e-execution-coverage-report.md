# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/code-review-report.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/api-e2e-coverage-investigation.md`
- Current Execution Round: 1
- Trigger: Code-review pass handoff for API/E2E coverage after CR-001 recheck.
- Prior Round Reviewed: N/A
- Latest Authoritative Round: Round 1 in this file.

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | API/E2E validation after code review pass | N/A | None in latest final execution | Pass | Yes | Added durable official MCP SDK loopback coverage, then final focused tests/build/diff check passed. One discarded local harness attempt used the workspace `HttpManagedMcpServer` wrapper and failed 401 because it did not pass auth headers in the way this direct SDK test needed; final durable coverage uses the official SDK directly and declares the test dev dependency. |

## Execution Basis

Execution followed the coverage investigation decisions in `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/api-e2e-coverage-investigation.md`. The route/session/catalog/executor implementation was already code-review passed; API/E2E added the missing durable official Streamable HTTP SDK client scenario and then executed the focused valid coverage plus build/diff checks.

## Pre-Execution Coverage Investigation

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/api-e2e-coverage-investigation.md`
- Completed before final test execution, durable coverage edits, durable coverage removals, or failure rerouting: `Yes`
- Existing durable coverage inventory reviewed: `Yes`
- Existing tests treated as authority without current-requirement validity review: `No`
- Stale or obsolete coverage found: `No`
- New durable coverage needed: `Yes`
- Reroute required from investigation: `No`
- Notes: Existing unit/route coverage remained valid. Durable coverage was expanded for official MCP SDK loopback compatibility because existing route integration used `app.inject` only.

## Existing Durable Coverage Decision Summary

| Path / Scenario | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Action Taken | Evidence |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts` | Still Valid | Retained and executed | Focused run passed: 4 tests. Covers descriptor/redaction/token hash, configured support, expiry/revoke/owner revoke, executor delegation/events. |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` existing route matrix scenarios | Still Valid / Needs Update for SDK gap | Retained, updated with SDK scenario, and executed | Focused run passed: 7 route integration tests after update. Existing inject matrix covers initialize/list/resources/templates/ping/notification/SSE, call success/failure, unknown/unconfigured denial, route-gate matrix, JSON-RPC error stage rules, OPTIONS. |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` SDK-001 | Added Durable Coverage | Added official `@modelcontextprotocol/sdk` `Client` + `StreamableHTTPClientTransport` loopback scenario | Test starts Fastify on `127.0.0.1:0`, uses bearer header, connects, lists `send_message_to`, probes resources/templates/ping, and calls `send_message_to`. |
| Existing runtime `send_message_to` E2E suites | Still Valid / Out Of Scope for focused run | Not executed in this round | Existing surfaces must remain unchanged, but they are model/runtime-heavy and do not directly prove the new HTTP route. Build and focused route/session coverage were the practical proof path here. |
| Existing `mcp-server-management` and other MCP consumer tests | Out Of Scope | Not updated | This ticket is server-hosted MCP endpoint, not the external MCP management subsystem. |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Execution Surfaces / Modes

- Unit tests for MCP session service/registry/executor behavior.
- Fastify route integration tests with `app.inject` for protocol/auth/error matrix coverage.
- Loopback TCP integration test using the official MCP TypeScript SDK Streamable HTTP client against the Fastify MCP route.
- Package build through `pnpm -C autobyteus-server-ts run build`.
- Repository diff whitespace check through `git diff --check`.

## Platform / Runtime Targets

- Host: Darwin arm64 (`Darwin MacBookPro 25.2.0`, macOS kernel 25.2.0).
- Node.js: `v22.21.1`.
- pnpm: `10.28.2`.
- Official MCP SDK test dependency: `@modelcontextprotocol/sdk 1.26.0` in `autobyteus-server-ts` devDependencies.
- Test database: SQLite test DB reset by Vitest/Prisma setup at `autobyteus-server-ts/tests/.tmp/autobyteus-server-test.db`.

## Lifecycle / Upgrade / Restart / Migration Checks

- Covered directly: session service expiry, revoke, member-owner revoke; route DELETE returns `405` and the same app session remains usable; stale/wrong bearer returns redacted `404`.
- Covered by source/runtime checks and code-review evidence: run/member cleanup hooks call owner-revoke service from `AgentRunManager.unregisterActiveRun()` and `MixedAgentMemberHandle.dispose()`.
- Deferred: restored run/team member rematerialization, because production external-process materializers are out of scope and no persisted MCP session exists in v1.

## Coverage Matrix

| Scenario ID | Behavior / Boundary | Durable / Temporary | Evidence Command / Artifact | Result |
| --- | --- | --- | --- | --- |
| UNIT-001 | Secret descriptor, redacted descriptor, token hash-only storage, configured-and-supported allowlist | Durable | `agent-tool-mcp-session-service.test.ts` | Pass |
| UNIT-002 | Expiry, token mismatch, explicit/member owner revoke | Durable | `agent-tool-mcp-session-service.test.ts` | Pass |
| UNIT-003 | `send_message_to` MCP executor delegates to `SendMessageToDispatcher` and emits observer events | Durable | `agent-tool-mcp-session-service.test.ts` | Pass |
| ROUTE-001 | Authenticated initialize, tools/list, resources/templates, ping, notification 202, GET/SSE | Durable | `agent-tools-mcp-routes.integration.test.ts` | Pass |
| SDK-001 | Official MCP SDK Streamable HTTP client over loopback can connect/list/probe/call | Durable (added this round) | `agent-tools-mcp-routes.integration.test.ts` | Pass |
| ROUTE-002 | Configured tool call success and semantic failure as MCP tool result | Durable | `agent-tools-mcp-routes.integration.test.ts` | Pass |
| ROUTE-003 | Unknown/unconfigured tools as JSON-RPC `-32602`, no executor call | Durable | `agent-tools-mcp-routes.integration.test.ts` | Pass |
| ROUTE-004 | Origin/auth/session/content/accept/protocol/unsupported-method/DELETE gate matrix | Durable | `agent-tools-mcp-routes.integration.test.ts` | Pass |
| ROUTE-005 | Malformed JSON, invalid envelope, method invalid params, unknown method | Durable | `agent-tools-mcp-routes.integration.test.ts` | Pass |
| ROUTE-006 | Unauthenticated OPTIONS only for valid local origins | Durable | `agent-tools-mcp-routes.integration.test.ts` | Pass |
| BUILD-001 | Server/shared package build | Temporary executable check | `pnpm -C autobyteus-server-ts run build` | Pass |
| DIFF-001 | Patch whitespace check | Temporary executable check | `git diff --check` | Pass |

## Test Scope

Focused on the changed server-hosted MCP route/session/catalog/executor boundary and the client-facing Streamable HTTP compatibility risk. Did not run full model-backed runtime E2E suites or deferred runtime materializer coverage because they are outside this ticket's v1 production scope and/or require external model/client setup beyond the practical proof path.

## Execution Setup / Environment

- Installed/linked the official MCP SDK as a direct `autobyteus-server-ts` dev dependency via `pnpm -C autobyteus-server-ts add -D @modelcontextprotocol/sdk@^1.25.3`; pnpm resolved `^1.26.0` to `1.26.0` and updated `autobyteus-server-ts/package.json` plus root `pnpm-lock.yaml`.
- Added SDK-001 to the existing route integration fixture using a real loopback Fastify listener and mocked MCP route executor.
- Temporary discovery script `/tmp/autobyteus-mcp-sdk-probe.mjs` was removed after use.

## Tests Implemented Or Updated

- Updated `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts`
  - Added import of official SDK `Client` and `StreamableHTTPClientTransport`.
  - Added `is consumable by the official Streamable HTTP MCP SDK client over loopback` scenario.
- Updated `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/autobyteus-server-ts/package.json`
  - Added direct devDependency `@modelcontextprotocol/sdk` for test imports.
- Updated `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/pnpm-lock.yaml`
  - Added the server package importer devDependency entry; no new package version beyond existing resolved SDK package.

## Tests Removed As Stale Or Obsolete

| Path / Scenario | Obsolete Assertion | Upstream Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`
- Paths added or updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/autobyteus-server-ts/package.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/pnpm-lock.yaml`
- Paths removed: None
- If `Yes`, returned through `code_reviewer` before delivery: `Yes — this execution report is being routed to code_reviewer for coverage-code re-review.`
- Post-API/E2E coverage code review artifact: Pending from `code_reviewer`.

## Other Execution Artifacts

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/api-e2e-coverage-investigation.md`
- Execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/api-e2e-execution-coverage-report.md`

## Temporary Execution Methods / Scaffolding

- Discovery-only `/tmp/autobyteus-mcp-sdk-probe.mjs` was used before durable coverage edits to confirm direct official SDK compatibility against built `dist`; it has been removed.
- No temporary repository-resident execution scaffolding remains.

## Dependencies Mocked Or Emulated

- Route integration tests use a mocked `AgentToolMcpToolExecutor` to keep the route boundary focused and avoid requiring live inter-agent delivery/model runtimes.
- Session service/executor unit test mocks `SendMessageToDispatcher` only for delegation assertion.
- Official SDK scenario uses real network loopback HTTP and the real SDK client/transport, while retaining the mocked route executor for the tool's domain result.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | Round 1 only. |

## Scenarios Checked

Final commands executed:

```text
pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts --no-watch
pnpm -C autobyteus-server-ts run build
git diff --check
```

Additional environment evidence:

```text
node --version => v22.21.1
pnpm --version => 10.28.2
pnpm -C autobyteus-server-ts list @modelcontextprotocol/sdk --depth 0 => @modelcontextprotocol/sdk 1.26.0 devDependency
```

## Passed

- Focused Vitest command passed: 2 files, 11 tests.
- Server build passed, including shared package builds, Prisma client generation, `tsc -p tsconfig.build.json`, managed messaging asset copy, and built-in agents bootstrap smoke check.
- `git diff --check` passed.

## Failed

None in the latest final execution.

Note: an initial local attempt to implement SDK-001 with the existing `autobyteus-ts` `HttpManagedMcpServer` wrapper failed with a 401 because that wrapper did not send the Authorization header in the direct SDK test configuration. The endpoint itself passed the official SDK direct probe before and after the durable test was added. The final durable test therefore imports the official SDK directly via a server devDependency.

## Not Tested / Out Of Scope

| Behavior / Boundary | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| Antigravity CLI materialized `.agents/mcp_config.json` with bearer token cleanup | Production AGY runtime/materializer is out of scope | Future materializer could leak or reuse bearer config | AGY runtime ticket must add materializer-specific tests. |
| Claude Code CLI and Codex App Server real-process materializers | Deferred by requirements/design | Future runtime config isolation could leak sessions across processes/workspaces | Future runtime tickets must add real-client config/materializer coverage. |
| Restored external-process run/member rematerialization | No production external-process materializer exists in this ticket | Future restored runtimes could use stale config if materializer persists it | Add restore/rematerialize tests with the materializer implementation. |
| Long-lived/resumable SSE server push | V1 tools are request/response and GET/SSE is compatibility-only | Clients requiring durable push/replay may need more behavior | Add when a concrete streamed tool/use case exists. |
| `autobyteus-ts` `HttpManagedMcpServer` header pass-through | Existing MCP consumer wrapper, not the server-hosted endpoint changed in this ticket; final compatibility test uses official SDK directly | Existing client-side external MCP configs that rely on headers may deserve separate coverage/fix | Track separately if that subsystem is in scope for a future MCP client-management task. |

## Blocked

None.

## Cleanup Performed

- Removed `/tmp/autobyteus-mcp-sdk-probe.mjs`.
- No server process left running; tests close Fastify and SDK clients in test cleanup.

## Classification

- `Local Fix`: N/A
- `Design Impact`: N/A
- `Requirement Gap`: N/A
- `Unclear`: N/A

Latest result is a pass with repository-resident durable coverage changes that require coverage-code re-review.

## Recommended Recipient

`code_reviewer`

## Evidence / Notes

- Coverage investigation was completed before durable coverage edits and final execution.
- Added SDK-001 durable coverage directly addresses code review residual risk: manual Streamable HTTP implementation vs official SDK client compatibility.
- No stale durable coverage was removed.
- No compatibility-only behavior or legacy route alias was added.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: API/E2E focused validation passed. Because repository-resident durable coverage and package test dependency were updated after the initial code review, the cumulative package must return to `code_reviewer` before delivery.
