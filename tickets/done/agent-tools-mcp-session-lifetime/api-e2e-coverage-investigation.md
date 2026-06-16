# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/tickets/done/agent-tools-mcp-session-lifetime/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/tickets/done/agent-tools-mcp-session-lifetime/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/tickets/done/agent-tools-mcp-session-lifetime/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/tickets/done/agent-tools-mcp-session-lifetime/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/tickets/done/agent-tools-mcp-session-lifetime/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/tickets/done/agent-tools-mcp-session-lifetime/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review pass handoff to API/E2E for the Agent Tools MCP owner-lifetime session ticket.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved behavior is Option A: Agent Tools MCP sessions are memory-only bearer capabilities that remain valid while present in the current server process, not explicitly revoked, and matched by bearer token. Active sessions must not expire by fixed wall-clock TTL; `ttlMillis`, active-session `expiresAt`, `expired` resolve failures, purge-by-expiry, and Claude descriptor refresh-by-expiry are obsolete and must not be preserved. Bearer `Authorization` remains mandatory for all non-`OPTIONS` Agent Tools MCP requests. Missing bearer must be `401`; unknown/revoked/token-mismatch/missing-after-reset sessions must remain redacted `404 session_unavailable` and must not dispatch tools. Public standalone termination must delegate to `AgentRunManager` so run-scoped Agent Tools MCP sessions are revoked. Mixed member disposal must revoke by member run ID and remain idempotent. Registry/process reset must invalidate old descriptors, while Codex/Claude/mixed-member start/restore/resume paths materialize fresh descriptors in the current process before runtime MCP use.

The implementation handoff's `Legacy / Compatibility Removal Check` is clean: no backward-compatibility mechanisms were introduced, old TTL behavior is not retained, dead/obsolete in-scope code was removed, and no `ttlMillis`/`expiresAt`/`expired` in-scope leftovers were found by implementation and code review. Independent source inspection and an in-scope leftover search during this investigation matched that claim.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Active Agent Tools MCP session lifetime | Changed | `REQ-MCP-SESSION-001` through `005`; design DS-002/DS-006; implementation removed TTL fields/checks | Keep/update durable coverage for no wall-clock expiry, no `expired` reason, token mismatch, explicit revoke, and owner revoke. |
| Active TTL fields/APIs (`ttlMillis`, `expiresAt`, `expired`, `purgeExpiredSessions`) | Removed | `AC-MCP-SESSION-002`, `012`; design Legacy Removal Policy | Search for leftovers and ensure no durable tests assert old expiry. |
| Bearer auth and redacted route denial | Preserved | `REQ-MCP-SESSION-006`, `007`, `015`; design route/security behavior | Existing route coverage remains valid; add explicit route coverage for revoked sessions and old descriptors after registry reset. |
| Public standalone termination cleanup | Changed | `REQ-MCP-SESSION-009`; design DS-003 | Existing unit coverage for manager delegation/revoke is valid; run in final focused suite. |
| Mixed member cleanup | Preserved/Changed by test coverage | `REQ-MCP-SESSION-010`; design DS-004 | Existing new unit coverage for idempotent member-run revoke is valid; run in final focused suite. |
| Registry/process reset old descriptor behavior | Preserved as memory-only restart semantics but now central acceptance criterion | `REQ-MCP-SESSION-011`; `AC-MCP-SESSION-009`; design DS-005 | Unit coverage exists at registry/service level; add route-level durable coverage because the externally visible MCP boundary must redacted-404 old descriptors and accept fresh descriptors. |
| Codex fresh descriptor materialization on restore/resume | Preserved/verified | `REQ-MCP-SESSION-012`, `013`, `017`; design DS-001/DS-005; implementation handoff | Existing Codex bootstrapper unit and Codex thread manager unit coverage is valid; run as part of final focused suite. |
| Claude descriptor state | Changed | `REQ-MCP-SESSION-016`; `AC-MCP-SESSION-011`; design DS-007 | Existing Claude session unit coverage for live descriptor reuse and owner/sender identity is valid; run as part of final focused suite. |
| Mixed-member fresh descriptor materialization | Preserved via member restore/create through `AgentRunManager` and runtime backend | `REQ-MCP-SESSION-012`, `013`; design DS-004/DS-005 | Existing mixed-member cleanup plus AgentRunManager restore delegation and Codex/Claude materialization coverage is sufficient; live mixed E2E remains env-gated and out of scope for mandatory local execution. |
| Full OAuth protected-resource metadata / `WWW-Authenticate` | Preserved out of scope | Requirements Out of Scope; design residual risks | No coverage added. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts` / session creation and redaction | Secret descriptor is bearer-protected/redacted; raw token not stored. | `REQ-MCP-SESSION-006`, `007`, `015`; `AC-MCP-SESSION-004`, `008` | Still Valid | File now asserts descriptor/redacted shape with no `expiresAt`; source model has no active expiry field. | Retain and execute. |
| `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts` / no old TTL, token mismatch, revoke, owner revoke | Session resolves after simulated time beyond old 12h TTL; wrong bearer fails; explicit/member revoke invalidates matching session and leaves non-matching active. | `REQ-MCP-SESSION-001`, `002`, `005`, `008`, `014`; `AC-MCP-SESSION-001`, `003`, `005` | Still Valid | This replaced obsolete expiry assertions and proves current registry validity. | Retain and execute. |
| `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts` / fresh registry rejects old descriptors | Fresh in-memory registry cannot resolve old session ID/token. | `REQ-MCP-SESSION-011`; `AC-MCP-SESSION-009` | Still Valid | Unit boundary proves registry reset semantics. | Retain and execute; supplement with route-level reset test below. |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` / route happy path, SDK loopback, tool calls, tool errors, unknown/unconfigured tools | Authenticated MCP route initializes/list/calls tools and dispatches only enabled tools. | DS-002; `REQ-MCP-SESSION-006`, `015` | Still Valid | Route integration remains current after TTL removal because route delegates validity to registry. | Retain and execute. |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` / auth, session, origin, method, content, accept, protocol | Missing auth `401`, wrong token redacted `404`, invalid origin `403`, unsupported method/content/accept/protocol fail before dispatch. | `REQ-MCP-SESSION-006`, `015`; `AC-MCP-SESSION-004` | Needs Update | Existing coverage includes wrong token but not explicit revoked route state or old descriptor after registry/process reset at the HTTP boundary. | Add durable route scenarios for revoked sessions and registry reset old-descriptor rejection/fresh descriptor success. |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` / publish_artifacts integration | Real MCP route dispatch to publish artifacts and app-facing output does not leak secrets. | `REQ-MCP-SESSION-007`, `015`; route dispatch spine | Still Valid | This remains a useful route-backed tool execution integration. | Retain and execute. |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-run-manager.test.ts` / manager termination revoke | Accepted manager termination revokes run-scoped Agent Tools MCP sessions and leaves other run sessions active. | `REQ-MCP-SESSION-008`, `009`; `AC-MCP-SESSION-006` | Still Valid | Code review confirmed this new unit test and source manager cleanup. | Retain and execute. |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-run-termination-service.test.ts` / public termination delegates to manager | Public `AgentRunService.terminateAgentRun` calls manager, avoids direct `activeRun.terminate`, preserves route/history/metadata behavior. | `REQ-MCP-SESSION-009`; design DS-003 | Still Valid | Test explicitly guards against the previous cleanup bypass. | Retain and execute. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-agent-tools-mcp-cleanup.test.ts` | Repeated mixed-member dispose revokes matching member-run sessions and not other members. | `REQ-MCP-SESSION-010`; `AC-MCP-SESSION-007` | Still Valid | New focused member cleanup coverage matches current design. | Retain and execute. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts` / create and restore Agent Tools MCP config | Codex create materializes session descriptor; Codex restore calls session service and creates current-process app-server config instead of reusing persisted descriptors. | `REQ-MCP-SESSION-012`, `013`, `017`; `AC-MCP-SESSION-010`, `012`; design DS-001/DS-005 | Still Valid | Test named `recreates Agent Tools MCP thread config on restore instead of reusing persisted descriptors` directly covers restore descriptor rematerialization. | Retain and execute. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread-manager.test.ts` / app-server config to start/resume | Codex thread start and resume receive the thread-scoped app-server MCP config. | `REQ-MCP-SESSION-012`, `013`; `AC-MCP-SESSION-010` | Still Valid | Complements bootstrapper restore materialization by proving resume boundary forwards config to remote Codex app server. | Retain and execute. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts` | Claude creates Agent Tools MCP descriptor with standalone/member owner/sender context and reuses live descriptor across turns without wall-clock refresh. | `REQ-MCP-SESSION-012`, `016`; `AC-MCP-SESSION-011` | Still Valid | The `ClaudeSession` instance owns descriptor state; new restored sessions construct new state, while this test prevents old TTL refresh within one live owner session. | Retain and execute. |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-run-restore-service.test.ts` | Public restore reads metadata and delegates to manager restore with recorded start facts. | `REQ-MCP-SESSION-012`, `013`; DS-001/DS-005 public restore entry | Still Valid | Does not need to know descriptor internals; descriptor materialization is covered in runtime bootstrapper/session tests. | Retain and execute as part of restore confidence. |
| Live Codex/Claude/mixed runtime E2E files under `autobyteus-server-ts/tests/e2e/runtime/*.e2e.test.ts` and live integration files gated by `RUN_CODEX_E2E` / `RUN_CLAUDE_E2E` | Full runtime transport flows with real Codex/Claude binaries and WebSocket/API shell. | Broad DS-001/DS-002 runtime proof | Out Of Scope for mandatory local execution | These suites are explicitly env-gated and require external runtime binaries/model credentials. Current ticket can be proven with route integration and runtime-unit materialization coverage. | Do not modify; do not use skipped live E2E as pass evidence. |
| `autobyteus-server-ts/tests/integration/mcp-server-management/*` and unrelated MCP config service tests | General external MCP server config persistence/management. | Different subsystem | Out Of Scope | Does not cover AutoByteus-hosted Agent Tools MCP session lifetime. | No action. |
| Non-MCP agent tool unit/e2e tests under `tests/unit/agent-tools/{browser,media,...}` | Business tool behavior and unrelated runtime utilities. | Requirements out-of-scope for business tool behavior | Out Of Scope | This ticket preserves tool business behavior and changes only the Agent Tools MCP session boundary. | No action. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Historical expiry-focused assertions in `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts` | Session becomes unresolved with `reason: "expired"` after TTL | Active sessions must not expire by wall-clock TTL and `expired` is removed from the resolve reason union. | `REQ-MCP-SESSION-001`, `002`, `003`, `004`, `005`; `AC-MCP-SESSION-001`, `002`, `012`; design Legacy Removal Policy | Current `resolves beyond the old active TTL...` unit test. | N/A; already updated by implementation. |
| Historical `expiresAt` fixtures in Codex/Claude tests | Mock sessions include active expiry timestamp to satisfy old type | `expiresAt` is no longer part of active session model. | `REQ-MCP-SESSION-003`, `017`; `AC-MCP-SESSION-012` | Current Codex/Claude fixtures omit `expiresAt` and focus on descriptors. | N/A; already updated by implementation. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| APIE2E-MCP-ROUTE-RESET-001 | After registry/process reset, an old route descriptor must return redacted `404 session_unavailable`, must not dispatch tools, and a freshly materialized descriptor in the same current process must work. | `REQ-MCP-SESSION-011`, `012`, `013`, `015`; `AC-MCP-SESSION-009`, `010`; design DS-005 | Update `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | Registry-unit coverage exists, but the external MCP HTTP boundary is the real client-facing API; this scenario prevents a route fallback that accepts old descriptors or leaks secrets after reset. |
| APIE2E-MCP-ROUTE-REVOKE-001 | Revoked sessions must fail at the route with redacted `404 session_unavailable` and no tool dispatch. | `REQ-MCP-SESSION-002`, `005`, `008`, `015`; `AC-MCP-SESSION-003`, `004` | Update `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | Existing route coverage covers wrong token, but explicit revoke is now the active invalidation authority and should be asserted at the route boundary. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| APIE2E-MCP-ROUTE-RESET-001 | `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | Add registry reset old-descriptor rejection plus fresh descriptor success. | `REQ-MCP-SESSION-011`, `012`, `013`, `015`; DS-005 | This is an update to existing route integration coverage. |
| APIE2E-MCP-ROUTE-REVOKE-001 | `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | Add explicit revoked session denial/no-dispatch assertions. | `REQ-MCP-SESSION-002`, `005`, `008`, `015`; `AC-MCP-SESSION-003`, `004` | This is an update to existing route integration coverage. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None in this API/E2E round | No stale repository-resident durable coverage remains in the inspected changed scope. | Implementation/code review leftover search plus independent investigation search found no in-scope `ttlMillis`, `expiresAt`, `expired`, or purge-expiry route/test expectations. | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| APIE2E-SEARCH-LEGACY-001 | `rg` leftover search over in-scope MCP/Claude/Codex route/test files | No in-scope active TTL compatibility symbols or old `expired` expectations remain. | Search is execution evidence, not a durable test; durable tests cover behavior. |
| APIE2E-BUILD-001 | `pnpm -C autobyteus-server-ts build` | Production source compiles under build tsconfig after coverage update. | Existing project build command; no new test artifact needed. |
| APIE2E-TYPECHECK-001 | `pnpm -C autobyteus-server-ts typecheck` | Confirm known broad `TS6059` rootDir/include mismatch remains pre-existing and not a change-specific source failure. | This is a diagnostic command; expected to fail until project tsconfig is fixed outside this ticket. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escation |
| --- | --- | --- | --- |
| Live Codex binary end-to-end use of Agent Tools MCP after server restart | Existing live suites are gated by `RUN_CODEX_E2E=1` and require a real Codex runtime/model environment; forcing them in this ticket is not reliable local validation. | Lower confidence than full real-runtime smoke, mitigated by route integration plus Codex bootstrapper/thread-manager durable tests. | None for this ticket; live runtime validation can be run by owners with configured Codex E2E environment. |
| Live Claude binary end-to-end use of Agent Tools MCP after server restart | Existing live suites are gated by `RUN_CLAUDE_E2E=1` and require a real Claude runtime/model environment. | Lower confidence than full real-runtime smoke, mitigated by Claude session state unit coverage and route integration. | None for this ticket; live runtime validation can be run by owners with configured Claude E2E environment. |
| Passive orphan-session GC | Approved out of scope; no TTL should be reintroduced as cleanup substitute. | Orphan sessions may remain until owner cleanup or process restart. | Separate owner-aware GC/lifecycle observation design if needed. |
| Full OAuth protected-resource metadata / `WWW-Authenticate` | Approved out of scope. | Remote OAuth-compliance remains future work. | Separate authorization-compliance ticket if needed. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None | N/A | Coverage investigation found no requirement gap, design impact, unclear behavior, implementation compatibility wrapper, or active TTL legacy branch. | N/A |

## Execution Plan

1. Update `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` with two narrow route-level scenarios: explicit revoked session denial/no dispatch and registry-reset old descriptor denial plus fresh descriptor success.
2. Run focused Agent Tools MCP route integration suite.
3. Run focused durable unit coverage for session registry/service, run manager, public termination, restore service, Codex bootstrapper, Codex thread manager, Claude session tool gating, and mixed-member MCP cleanup.
4. Run in-scope legacy leftover search.
5. Run `git diff --check`.
6. Run `pnpm -C autobyteus-server-ts build`.
7. Run `pnpm -C autobyteus-server-ts typecheck` and record the known `TS6059` result if reproduced.
8. Write/update the execution coverage report and route back to `code_reviewer` because repository-resident durable coverage will be updated after the initial code review.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing coverage is mostly valid, but the route integration suite needs explicit revoked-session and registry-reset/old-descriptor scenarios to cover the client-facing API boundary after active TTL removal. Because durable coverage will be updated after code review, successful execution must return to `code_reviewer` before delivery.
