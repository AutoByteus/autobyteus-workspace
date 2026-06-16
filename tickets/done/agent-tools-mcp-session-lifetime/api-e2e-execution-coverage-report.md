# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/tickets/done/agent-tools-mcp-session-lifetime/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/tickets/done/agent-tools-mcp-session-lifetime/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/tickets/done/agent-tools-mcp-session-lifetime/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/tickets/done/agent-tools-mcp-session-lifetime/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/tickets/done/agent-tools-mcp-session-lifetime/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/tickets/done/agent-tools-mcp-session-lifetime/code-review-report.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/tickets/done/agent-tools-mcp-session-lifetime/api-e2e-coverage-investigation.md`
- Current Execution Round: 1
- Trigger: API/E2E coverage investigation after code-review pass.
- Prior Round Reviewed: N/A
- Latest Authoritative Round: Round 1

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code-review pass; API/E2E route/restore/resume coverage investigation | N/A | No change-specific failures | Pass | Yes | Focused route integration/unit coverage, diff check, leftover search, and production build passed. Broad `typecheck` still fails with pre-existing `TS6059` rootDir/include mismatch. |

## Execution Basis

Execution followed the round-1 coverage investigation. I added route integration coverage for the two missing client-facing Agent Tools MCP session lifetime cases: explicit revoked-session denial and registry-reset old-descriptor rejection plus fresh descriptor success. I then ran focused route, API/lifecycle, restore/resume, and runtime materialization coverage against the updated implementation and coverage state.

## Pre-Execution Coverage Investigation

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/tickets/done/agent-tools-mcp-session-lifetime/api-e2e-coverage-investigation.md`
- Completed before final test execution, durable coverage edits, durable coverage removals, or failure rerouting: `Yes`
- Existing durable coverage inventory reviewed: `Yes`
- Existing tests treated as authority without current-requirement validity review: `No`
- Stale or obsolete coverage found: `Yes` historically, already handled by implementation (`expired`/`expiresAt` tests removed or rewritten before this stage); no additional stale coverage removed this round.
- New durable coverage needed: `Yes`
- Reroute required from investigation: `No`
- Notes: Existing durable coverage remained mostly valid. The route integration suite needed two added scenarios to prove the external MCP HTTP boundary after active TTL removal.

## Existing Durable Coverage Decision Summary

| Path / Scenario | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Action Taken | Evidence |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts` | Still Valid | Executed | Passed in focused Vitest run; covers descriptor redaction, no old TTL expiry, token mismatch, explicit/member revoke, fresh registry missing old session. |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` existing route scenarios | Still Valid | Executed | Passed in focused Vitest run; still covers route happy path, SDK client, auth/session/origin/method/content/accept/protocol gates, tool dispatch, tool errors. |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` missing revoked/reset route scenarios | Needs Update | Updated and executed | Added two route tests; route suite passed `10` tests. |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-run-manager.test.ts` | Still Valid | Executed | Passed; includes manager termination run-scoped MCP revoke. |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-run-termination-service.test.ts` | Still Valid | Executed | Passed; confirms public termination delegates to manager and does not direct-terminate. |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-run-restore-service.test.ts` | Still Valid | Executed | Passed; confirms public restore delegates to manager with metadata/start facts. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts` | Still Valid | Executed | Passed; covers Codex create/restore fresh Agent Tools MCP config materialization. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread-manager.test.ts` | Still Valid | Executed | Passed; covers thread-scoped app-server config reaching Codex start/resume. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts` | Still Valid | Executed | Passed; covers Claude descriptor creation and live descriptor reuse without wall-clock refresh. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-agent-tools-mcp-cleanup.test.ts` | Still Valid | Executed | Passed; covers mixed-member idempotent member-run scoped revoke. |
| Live Codex/Claude/mixed E2E suites gated by `RUN_CODEX_E2E` / `RUN_CLAUDE_E2E` | Out Of Scope for mandatory local run | Not run | Existing suite gating requires real external runtimes and credentials; investigation documented why focused route/runtime-unit coverage is the practical proof path for this ticket. |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

Evidence: In-scope leftover search returned no matches for `ttlMillis|purgeExpiredSessions|DEFAULT_SESSION_TTL_MILLIS|reason: "expired"|expiresAt|"expired"` in the MCP/Claude/Codex changed coverage areas specified by the design. The added route tests assert current owner-lifetime/reset/revoke behavior, not compatibility with old active TTL descriptors.

## Execution Surfaces / Modes

- Fastify route integration for `/mcp/agent-tools/:sessionId`, including official MCP Streamable HTTP client loopback coverage and route-backed tool execution.
- Unit/executable coverage for registry/service, run manager cleanup, public termination, public restore, Codex bootstrapper materialization, Codex thread start/resume config forwarding, Claude descriptor state, and mixed-member cleanup.
- Build/typecheck commands for production source and known broad typecheck status.
- Static leftover search and diff hygiene checks.

## Platform / Runtime Targets

- Local macOS/Darwin development worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime`.
- Node/Vitest as provided by the repository install; Vitest reported `v4.0.18`.
- Fastify in-memory injection and loopback TCP for MCP SDK client test.
- SQLite test database reset performed by test setup.

## Lifecycle / Upgrade / Restart / Migration Checks

- Restart/process-reset semantics were exercised at the registry and route levels by clearing in-memory session state and using an old descriptor. The old descriptor returned redacted `404 session_unavailable` with no tool dispatch; a freshly created descriptor in the current registry succeeded.
- Standalone run lifecycle termination was exercised through manager and service unit tests; manager termination revokes run-scoped sessions and public service delegates to manager.
- Mixed-member lifecycle cleanup was exercised through repeated dispose; member-run-scoped sessions are revoked and other member sessions remain active.
- Codex restore/resume materialization was exercised through bootstrapper restore and thread-manager resume config tests. Claude restored-owner fresh descriptor behavior is covered by instance-scoped descriptor state plus live-cache unit coverage; full live runtime restore is env-gated and not required for this local pass.

## Coverage Matrix

| Scenario ID | Boundary | Durable / Temporary | Evidence | Result |
| --- | --- | --- | --- | --- |
| APIE2E-MCP-ROUTE-REVOKE-001 | Revoked session at external MCP HTTP route | Durable | Added `rejects revoked sessions at the route without dispatching tools or leaking descriptor secrets`; route suite passed. | Pass |
| APIE2E-MCP-ROUTE-RESET-001 | Registry/process reset old descriptor and fresh descriptor at external MCP HTTP route | Durable | Added `rejects old descriptors after in-memory registry reset and accepts a freshly materialized descriptor`; route suite passed. | Pass |
| APIE2E-MCP-ROUTE-BASE-001 | Route happy path, SDK loopback, auth/gate/protocol/tool dispatch | Durable existing | Route suite passed `10` tests. | Pass |
| APIE2E-MCP-SESSION-001 | No old TTL expiry, token mismatch, explicit revoke, owner revoke, registry reset | Durable existing | Focused unit suite passed. | Pass |
| APIE2E-MCP-RUN-LIFECYCLE-001 | Manager/public termination revokes run-scoped sessions through manager boundary | Durable existing | Focused unit suite passed. | Pass |
| APIE2E-MCP-MEMBER-LIFECYCLE-001 | Mixed member dispose revokes member-run sessions idempotently | Durable existing | Focused unit suite passed. | Pass |
| APIE2E-MCP-CODEX-RESTORE-001 | Codex create/restore and resume materialize/forward current Agent Tools MCP descriptor config | Durable existing | Codex bootstrapper and thread-manager unit suites passed. | Pass |
| APIE2E-MCP-CLAUDE-CACHE-001 | Claude descriptor creation and live-session reuse without expiry refresh | Durable existing | Claude tool-gating unit suite passed. | Pass |
| APIE2E-SEARCH-LEGACY-001 | In-scope active TTL legacy leftovers | Temporary evidence command | `rg ... || true` returned no matches. | Pass |
| APIE2E-BUILD-001 | Production build | Temporary evidence command | `pnpm -C autobyteus-server-ts build` passed. | Pass |
| APIE2E-TYPECHECK-001 | Broad project typecheck | Temporary diagnostic command | `pnpm -C autobyteus-server-ts typecheck` failed with known broad `TS6059` tests-outside-`rootDir` mismatch. | Known pre-existing failure; not change-specific |

## Test Scope

Included:

- Agent Tools MCP route integration, including route-backed publish artifacts and SDK loopback.
- Agent Tools MCP session service/executor unit coverage.
- Run manager, public termination, and public restore unit coverage.
- Codex bootstrapper and Codex thread manager unit coverage.
- Claude session tool gating/session descriptor state unit coverage.
- Mixed-agent member MCP cleanup unit coverage.
- Static legacy leftover search, diff check, production build, and broad typecheck diagnostic.

Excluded/deferred:

- Env-gated live Codex/Claude runtime E2E suites; they require external binaries/model access and are not stable local mandatory coverage for this ticket.
- Passive orphan-session GC and OAuth protected-resource metadata, both approved out of scope.

## Execution Setup / Environment

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime`.
- Dependencies had already been installed by implementation with `pnpm install --frozen-lockfile`; lockfile remained unchanged.
- Test command reset the SQLite test database and ran with repository Vitest.
- No temporary files or harnesses were added outside durable test edits.

## Tests Implemented Or Updated

Updated `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` with:

1. `rejects revoked sessions at the route without dispatching tools or leaking descriptor secrets`
   - Revokes the active session through the registry.
   - Sends a route-level tool call using the old descriptor.
   - Expects redacted `404 session_unavailable`.
   - Asserts no tool dispatch and no session ID/token/authorization leakage in response body.

2. `rejects old descriptors after in-memory registry reset and accepts a freshly materialized descriptor`
   - Clears the registry to simulate process-memory session loss.
   - Sends a route-level request with the old descriptor.
   - Expects redacted `404 session_unavailable` and no dispatch.
   - Creates a fresh descriptor in the current registry.
   - Confirms fresh ping and tool call succeed.

Also strengthened the existing route no-leak helper to check session token, `Bearer`, and `Authorization` in addition to session ID/default route leakage.

## Tests Removed As Stale Or Obsolete

| Path / Scenario | Obsolete Assertion | Upstream Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| None in this API/E2E round | N/A | No additional stale coverage found after the investigation. | N/A |

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`
- Paths added or updated:
  - `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts`
- Paths removed: None
- If `Yes`, returned through `code_reviewer` before delivery: `Yes` — this execution package is being routed back to `code_reviewer` for focused coverage-code re-review before delivery.
- Post-API/E2E coverage code review artifact: Pending; to be produced by `code_reviewer` if accepted.

## Other Execution Artifacts

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/tickets/done/agent-tools-mcp-session-lifetime/api-e2e-coverage-investigation.md`
- Execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/tickets/done/agent-tools-mcp-session-lifetime/api-e2e-execution-coverage-report.md`

## Temporary Execution Methods / Scaffolding

No temporary scripts or harness files were created. Temporary execution was limited to repository commands.

## Dependencies Mocked Or Emulated

- Route integration uses Fastify in-memory injection and a loopback MCP SDK client.
- Unit tests mock runtime clients/factories/session services where appropriate.
- SQLite test database was reset by the test setup.
- No external Codex or Claude live runtime was required for this pass.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First execution round. |

## Scenarios Checked

1. External MCP route rejects revoked sessions before tool dispatch and without descriptor secret leakage.
2. External MCP route rejects old descriptors after in-memory registry reset; fresh descriptor succeeds.
3. Existing external MCP route behavior remains valid: initialize, tools/list, resources, ping, notifications, SSE, SDK loopback, tool calls, semantic failures, unknown/unconfigured tools, malformed JSON/envelope, auth/session/origin/method/content/accept/protocol rules, unauthenticated `OPTIONS` for local origins.
4. Route-backed `publish_artifacts` integration still succeeds without app-facing secret leakage.
5. Session service still creates redacted bearer descriptors, does not store raw tokens, resolves beyond old TTL, rejects wrong token, supports explicit/member revoke, and treats fresh registry as unable to resolve old descriptors.
6. Manager termination revokes run-scoped sessions; public termination delegates to manager and avoids direct termination.
7. Public restore delegates to manager from metadata.
8. Codex create/restore materializes Agent Tools MCP app-server config; Codex thread start/resume forwards app-server config.
9. Claude creates correct standalone/member descriptors and reuses live descriptor without wall-clock refresh.
10. Mixed member dispose revokes member-run sessions idempotently without revoking other member sessions.
11. In-scope old active TTL symbols/expectations absent.
12. Production build passes.
13. Broad typecheck still fails for known pre-existing `TS6059` rootDir/include mismatch.

## Passed

- `pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts tests/unit/agent-execution/agent-run-manager.test.ts tests/unit/agent-execution/agent-run-termination-service.test.ts tests/unit/agent-execution/agent-run-restore-service.test.ts tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts tests/unit/agent-execution/backends/codex/thread/codex-thread-manager.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts tests/unit/agent-team-execution/mixed-agent-member-handle-agent-tools-mcp-cleanup.test.ts` — passed (`9` files, `68` tests).
- `git diff --check` — passed.
- `rg -n "ttlMillis|purgeExpiredSessions|DEFAULT_SESSION_TTL_MILLIS|reason: \"expired\"|expiresAt|\"expired\"" autobyteus-server-ts/src/agent-tools/mcp autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp autobyteus-server-ts/tests/unit/agent-tools/mcp autobyteus-server-ts/tests/integration/agent-tools/mcp autobyteus-server-ts/tests/unit/agent-execution/backends/claude autobyteus-server-ts/tests/unit/agent-execution/backends/codex autobyteus-server-ts/tests/unit/agent-execution/agent-run-manager.test.ts autobyteus-server-ts/tests/unit/agent-execution/agent-run-termination-service.test.ts autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-agent-tools-mcp-cleanup.test.ts || true` — no matches.
- `pnpm -C autobyteus-server-ts build` — passed.

## Failed

- `pnpm -C autobyteus-server-ts typecheck` — failed with broad `TS6059` errors because `tsconfig.json` has `rootDir: src` while including `tests`. The first reported file was `autobyteus-server-ts/tests/e2e/agent-definitions/agent-definitions-graphql.e2e.test.ts`; many unrelated test files under `tests` were reported as outside `rootDir`. This matches the implementation handoff and code review report and is not a change-specific failure. Production `build` passed through `tsconfig.build.json`, and focused Vitest coverage passed.

## Not Tested / Out Of Scope

- Live Codex and Claude runtime E2E suites gated by `RUN_CODEX_E2E` and `RUN_CLAUDE_E2E`.
- Passive orphan-session GC.
- OAuth protected-resource metadata and `WWW-Authenticate` discovery.

## Blocked

None for the required API/E2E coverage path. Broad project typecheck remains blocked by the known pre-existing TypeScript config mismatch, but it did not block this stage's pass decision because build and focused coverage passed.

## Cleanup Performed

No temporary files or harnesses were created. Test/database temporary state was handled by existing test setup. No cleanup beyond normal command completion was required.

## Classification

No `Local Fix`, `Design Impact`, `Requirement Gap`, or `Unclear` reroute is required. The only failing command is the known pre-existing typecheck configuration issue already documented upstream.

## Recommended Recipient

`code_reviewer`

Reason: repository-resident durable coverage was updated after the initial code review, so the cumulative package must return through code review before delivery.

## Evidence / Notes

- Route integration suite now contains explicit external-boundary coverage for both accepted active invalidation authorities: explicit revoke and in-memory reset/missing session.
- Added route tests also verify no dispatch and no descriptor secret leakage in denial responses.
- Existing restore/resume confidence comes from combined public restore, Codex bootstrapper restore, Codex thread resume config, Claude session state, and mixed-member lifecycle coverage.
- No compatibility-only TTL behavior was found or covered.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: API/E2E coverage investigation and execution passed for the required local boundary. Durable route integration coverage changed, so route back to `code_reviewer` before delivery. Broad `typecheck` remains a known pre-existing `TS6059` project-config failure, not a task-specific validation failure.
