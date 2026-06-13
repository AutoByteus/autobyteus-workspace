# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review pass handoff for API/E2E coverage investigation and execution after CR-001 recheck.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1 in this file.

## Current Requirement And Design Basis

The reviewed implementation must expose the AutoByteus Agent Tools MCP Server over the existing Fastify process at `/mcp/agent-tools/:sessionId`. The endpoint is an MCP Streamable HTTP route, not a custom protocol, and must require Origin validation and bearer/session validation for every non-`OPTIONS` request before any identity/list/call/SSE/unsupported-method behavior. V1 is memory-only, does not emit MCP transport `MCP-Session-Id`, accepts GET/SSE for client compatibility, returns 202/no body for notifications/client responses, returns empty resource/resource-template lists, maps unknown/unconfigured tools to JSON-RPC `-32602` without domain dispatch, and dispatches configured `send_message_to` through `SendMessageToDispatcher`.

Session creation must derive `enabledTools` from configured-and-supported tools, store only token hashes, return raw bearer tokens only in the secret runtime descriptor, provide redacted descriptor views, support expiry/revoke/owner-revoke, and be revoked on run/member cleanup. Existing AutoByteus, Codex, Claude Agent SDK, and external MCP-client behavior must remain unchanged. The implementation handoff's Legacy / Compatibility Removal Check is clean: no backward-compatibility route, no old behavior retained, no `/mcp/runtime-tools` alias, no runtime-wrapper shortcut.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Server-hosted AutoByteus Agent Tools MCP route at `/mcp/agent-tools/:sessionId` | Added | REQ-MCP-001..003, REQ-MCP-019; DS-007; implementation handoff | Durable route integration and real Streamable HTTP client compatibility must be exercised. |
| App-level `AgentToolMcpSession` registry/service/descriptor | Added | REQ-MCP-004..007, REQ-MCP-020..021; DS-008/DS-009 | Durable coverage must prove configured exposure, token hash-only storage, redacted descriptor, resolve/expire/revoke/owner-revoke, stale descriptor denial. |
| Server-side allowlist and `tools/list` schema generation | Added | REQ-MCP-005/006/018; DS-003/DS-010 | Durable coverage must prove only configured-and-supported tools are listed and schema comes from server-owned contracts. |
| `tools/call` for `send_message_to` via shared dispatcher | Added | REQ-MCP-008..012; DS-004/DS-011 | Durable coverage must prove executor delegates to `SendMessageToDispatcher`; route coverage must prove configured call success, semantic failure as MCP `isError`, unknown/unconfigured denial without dispatch. |
| Streamable HTTP route matrix, including Origin/auth/session-before-method, protocol/content/accept gates, notifications, malformed JSON, invalid params, GET/SSE, DELETE 405 | Added | REQ-MCP-019; AC-MCP-015; design rework round 2; CR-001 recheck | Existing route durable coverage is valid and should be expanded with a real SDK client path rather than only `app.inject`. |
| Lifecycle cleanup hooks from `AgentRunManager.unregisterActiveRun()` and `MixedAgentMemberHandle.dispose()` to MCP owner revoke | Added | REQ-MCP-021; AC-MCP-017; implementation handoff | Existing service owner-revoke coverage is valid. Source-hook behavior will be covered by final focused executable checks; no production materializer exists yet to test restored-run rematerialization end-to-end. |
| Production runtime materializers for AGY/Claude Code/Codex App Server/Claude SDK | Deferred / preserved out of scope | Requirements out-of-scope and implementation handoff assumptions | Do not add durable config-materializer coverage in this ticket; record residual follow-up. |
| Legacy route names, URL-only auth, v1 MCP transport session state, client DELETE as app revoke | Removed/rejected | Design spec Legacy Removal Policy and Backward-Compatibility Rejection Log; handoff Legacy / Compatibility Removal Check | Confirm no compatibility wrapper or durable compatibility-only coverage is added. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts` / secret descriptor + configured-and-supported allowlist | Creates secret descriptor, filters to `send_message_to`, does not expose unconfigured `send_message_to`, checks token hash does not contain raw token, redacted descriptor hides token/session ID | REQ-MCP-005..007, REQ-MCP-018, REQ-MCP-020, AC-MCP-003/004/005/016 | Still Valid | Static inspection confirms assertions match current requirements; no legacy behavior asserted. | Run in final focused test set. |
| `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts` / expiry, revoke, member-owner revoke | Resolves valid token, rejects token mismatch, rejects expired session, owner/member revoke marks session revoked | REQ-MCP-004/007/021, AC-MCP-008/017 | Still Valid | Covers registry/service-level lifecycle semantics. | Run in final focused test set. |
| `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts` / executor delegates `send_message_to` and observer events | `AgentToolMcpToolExecutor` calls `SendMessageToDispatcher.dispatch(...)` with session sender and emits start/complete | REQ-MCP-008..010, AC-MCP-006/010 | Still Valid | Confirms MCP route does not wrap runtime-specific tool surfaces. | Run in final focused test set. |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` / authenticated initialize/list/resources/templates/ping/notification/SSE | Fastify route accepts authenticated JSON-RPC methods, returns expected server info/schema/empty resources, 202 for notification, GET SSE compatibility, no `mcp-session-id` | REQ-MCP-001..003/019, AC-MCP-001/002/004/015 | Needs Update | Existing `app.inject` coverage is valid but does not prove a real Streamable HTTP SDK client can consume the endpoint. A discovery-only probe using `@modelcontextprotocol/sdk@1.26.0` over loopback passed initialize/list/resources/templates/ping/call with `sdkSessionId: null`. | Add durable SDK-client loopback scenario in the same integration file, then run. |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` / configured `tools/call` success and semantic failure | Configured `send_message_to` call maps accepted result to MCP text content and rejected domain result to MCP `isError` text result | REQ-MCP-008..012/019, AC-MCP-006/007/011/015 | Still Valid | Uses mocked executor at route boundary; executor unit covers dispatcher delegation. | Run in final focused test set. |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` / unknown and unconfigured tools | Unknown and unconfigured names return HTTP 200 JSON-RPC `-32602`, no result, no executor call | REQ-MCP-005/012/019, AC-MCP-005/009/015 | Still Valid | Matches Round-2 DS-007 precision decision. | Run in final focused test set. |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` / route gate matrix | Invalid origin, missing auth, wrong bearer, unsupported PATCH, unsupported CONNECT with missing/wrong/valid auth, DELETE 405, content-type, accept, protocol-version rules | REQ-MCP-007/012/019, AC-MCP-008/015/017 | Still Valid | CR-001 recheck specifically validated unsupported-method ordering; existing assertions are still current. | Run in final focused test set. |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` / malformed JSON, invalid envelope, method invalid params, unknown method | Malformed JSON returns HTTP 400 `-32700`; invalid envelope returns HTTP 400 `-32600`; method params fail at HTTP 200 `-32602`; unknown method `-32601` | REQ-MCP-019, AC-MCP-015 | Still Valid | Matches Round-2 DS-007 stage rules. | Run in final focused test set. |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` / unauthenticated OPTIONS | Allows OPTIONS only for local origins and rejects non-local origins | REQ-MCP-019, AC-MCP-015 | Still Valid | Valid special unauthenticated path; not a compatibility exception. | Run in final focused test set. |
| `autobyteus-server-ts/tests/integration/agent-execution/agent-run-manager.integration.test.ts` / terminate/evict active runs | Existing manager tests verify active-run unregister paths, but not MCP session owner revoke side effect | REQ-MCP-021, AC-MCP-017 | Needs Update? | Implementation added one cleanup line. Existing tests remain valid but do not explicitly assert MCP session cleanup. Because service-level owner revoke is covered and the hook is narrow, final API/E2E will include a focused temporary or durable cleanup check depending on test complexity. | Use temporary executable source/runtime check unless adding this to durable coverage proves low-risk during implementation. |
| `autobyteus-server-ts/tests/e2e/runtime/*send_message_to*`, `claude-team-inter-agent-roundtrip.e2e.test.ts`, `codex-standalone-send-message-global-routing.e2e.test.ts`, `nested-mixed-team-runtime-graphql.e2e.test.ts` | Existing runtime E2E proves current `send_message_to` through Codex/Claude/current surfaces | REQ-MCP-009/016 | Still Valid / Out Of Scope for new HTTP route | These tests cover existing surfaces that must remain unchanged; they do not directly prove the new HTTP MCP route and are too expensive/LLM-dependent for this focused route validation. | Do not run as final focused set; record as existing regression surface preserved by build and code review. |
| `autobyteus-server-ts/tests/integration/mcp-server-management/**`, `autobyteus-ts/src/tools/mcp/**` tests | Existing external MCP client/config management | Existing MCP consumer behavior, REQ-MCP-016 | Out Of Scope / Still Valid as separate subsystem | This ticket intentionally does not reuse `mcp-server-management` as the server-hosted MCP owner. | Do not update. Use SDK client scenario to prove interoperability boundary. |
| `autobyteus-server-ts/tests/e2e/media/server-owned-media-tools.e2e.test.ts` and Claude media/browser MCP tests | Existing in-process/runtime MCP server projections for other tool families | Future tool adapter guidance, not v1 `send_message_to` HTTP endpoint | Out Of Scope | Browser/media/task/publish adapters are deferred by requirements/design. | Do not update or run for this ticket. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None | N/A | No relevant existing durable coverage asserted a removed `/mcp/runtime-tools` alias, URL-only auth, client DELETE app revoke, or runtime-wrapper shortcut. | Design spec Backward-Compatibility Rejection Log and code review Legacy verdict. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| SDK-001 | Official/workspace Streamable HTTP MCP client can connect over a real loopback HTTP socket, initialize, open/accept SSE compatibility, list `send_message_to`, probe empty resources/templates, ping, and call `send_message_to`; no MCP transport session ID is emitted | REQ-MCP-002/003/011/019; AC-MCP-002/004/006/011/015; code-review residual risk on official SDK/real client compatibility | `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | Existing durable route tests use `app.inject`; a real SDK/client-over-HTTP path should live in the repository because this endpoint is client-facing and manually implements Streamable HTTP. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| SDK-001 | `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | Add one loopback official `@modelcontextprotocol/sdk` `Client` + `StreamableHTTPClientTransport` scenario using the same route fixture and mocked executor | AC-MCP-002 and code-review residual SDK compatibility risk | This is repository-resident durable coverage and will require return to `code_reviewer` after execution. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| PROBE-001 | Discovery-only one-off Node script using built `dist`, Fastify loopback socket, `@modelcontextprotocol/sdk@1.26.0` `Client` + `StreamableHTTPClientTransport`, custom route executor | Confirmed before durable edit planning that the official SDK can connect, list tools, list resources/templates, ping, call `send_message_to`, and sees no `MCP-Session-Id` | Superseded by planned durable SDK-001 integration test. |
| PROBE-002 | Final `git diff --check` and package build/type-backed build script | Confirms durable coverage edit/build integration has no formatting/compile regressions | Standard execution evidence, not durable product coverage. |
| PROBE-003 | If needed, focused runtime/source check of owner cleanup paths after durable SDK test | Confirms no observed stale-session access after revoke/DELETE/expiry and that cleanup hooks point to owner revoke service | Production runtime materializers are deferred; full restored-run/member rematerialization is not executable end-to-end in this ticket. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Antigravity CLI `.agents/mcp_config.json` materialization against this endpoint | Production Antigravity runtime/materializer is explicitly out of scope/deferred | Later AGY integration may mishandle token-bearing workspace file cleanup or config shape | Antigravity runtime ticket must add materializer-specific tests using `AgentToolMcpDescriptor`. |
| Claude Code CLI real-process `--mcp-config` and Codex App Server real-process config injection | Production materializers are deferred and Codex app-server cwd reuse risk is not solved here | Later runtime integration could leak per-run token/config into shared process | Future runtime tickets must add real-client materializer coverage and cleanup/redaction checks. |
| Browser/media/task-delegation/publish-artifacts exposure through this HTTP route | V1 supports only `send_message_to` | Future adapters may bypass provider/executor seams | Future adapter tickets must add definition-provider + executor-adapter durable coverage. |
| Restored run/team member rematerialization | No production external-process materializer exists in this ticket; v1 sessions are memory-only | Restored runtime could attempt stale descriptor if future materializer reuses persisted config | Future external runtime materializer tickets must prove fresh session creation on restore. |
| Long-lived server-push/resumable SSE | Current tools are request/response; GET/SSE compatibility exists only for client compatibility | Clients requiring durable server-push may need richer stream behavior later | Add when a concrete tool/use case requires streamed or resumable events. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None at investigation time | N/A | Upstream package and reviewed implementation are consistent; discovery SDK probe passed. | N/A |

## Execution Plan

1. Add durable SDK-001 coverage to `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` using the official `@modelcontextprotocol/sdk` Streamable HTTP client against a real loopback Fastify listener. Declare the SDK as an `autobyteus-server-ts` dev dependency because the test imports it directly.
2. Run the focused MCP unit/integration tests:
   - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts --no-watch`
3. Run package build:
   - `pnpm -C autobyteus-server-ts run build`
4. Run `git diff --check`.
5. If the SDK scenario or focused tests reveal failures, classify after confirming the coverage remains valid. If failures are implementation-local, route to `implementation_engineer`; if durable coverage edits pass, write the execution coverage report and return to `code_reviewer` because repository-resident durable coverage changed after the initial code review.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing coverage is broadly valid. The one required durable expansion is SDK-backed loopback client compatibility, because the endpoint manually implements Streamable HTTP and existing durable route tests only use Fastify injection.
