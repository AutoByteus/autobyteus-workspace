# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready; approved by user on 2026-06-16 for Option A (memory-only sessions, no active TTL, fresh descriptor materialization on start/restore/resume).

This is a shared Agent Tools MCP infrastructure ticket. It is intentionally separate from AGY because the session lifetime and authorization semantics affect AGY, Claude Code CLI, Claude Agent SDK, Codex App Server, and any future external-process runtime that consumes AutoByteus-hosted MCP tools.

## Goal / Problem Statement

Refine and implement shared **Agent Tools MCP session lifetime, authorization, and cleanup semantics** directly on top of `origin/codex/streamable-mcp-runtime-tools`.

The streamable MCP base currently creates bearer-protected Agent Tools MCP sessions with a fixed wall-clock TTL (`DEFAULT_SESSION_TTL_MILLIS = 12h`). That is unsafe for external-process runtimes that load MCP configuration at startup and have no reliable refresh/rekey protocol during an active run. If the session expires while the owning run/member is still active, tool calls fail even though the runtime owner is still valid.

The desired behavior is owner-lifetime scoped:

- create one Agent Tools MCP session for an owning run/member runtime context;
- keep bearer `Authorization` mandatory for every non-`OPTIONS` Agent Tools MCP request;
- keep the session valid while the owner is active;
- explicitly revoke sessions on owner close/termination/shutdown;
- rely on memory-only loss on process restart instead of durable restoration of old bearer sessions;
- when an agent run or team run is started, restarted, restored, or resumed after server/process restart, materialize a fresh Agent Tools MCP session/descriptor before that runtime needs tools;
- treat orphan cleanup as a follow-up/GC concern, not as active-owner wall-clock invalidation.

## Investigation Findings

- Dedicated worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime`.
- Task branch: `codex/agent-tools-mcp-session-lifetime`.
- Tracking/base branch: `origin/codex/streamable-mcp-runtime-tools`.
- Base commit after refresh on 2026-06-16: `c3cc4d0d49db1146c18a3c251518041ee233c512` (`chore(ticket): record runtime agent tools finalization`).
- `AgentToolMcpSessionRegistry` currently owns bearer token hash validation, revocation, owner matching, and a fixed active-session TTL. `resolveSession(...)` rejects otherwise valid sessions as `expired` when `expiresAt <= now`.
- `AgentToolMcpSession` currently requires `expiresAt: Date`; `AgentToolMcpCreateSessionInput` accepts `ttlMillis`; `AgentToolMcpSessionResolveFailureReason` includes `expired`.
- `ClaudeAgentToolsMcpSessionState` caches the current descriptor only until `expiresAt`, then refreshes the descriptor before a later turn. Under owner-lifetime semantics this refresh path becomes a legacy TTL path and should be removed.
- `CodexThreadBootstrapper` creates a descriptor for Codex App Server runs but does not cache it by `expiresAt`; tests only include `expiresAt` to satisfy the current type.
- `AgentRunManager.unregisterActiveRun(...)` already revokes Agent Tools MCP sessions by run ID, and `MixedAgentMemberHandle.dispose()` revokes by member run ID. However `AgentRunService.terminateAgentRun(...)` currently calls `activeRun.terminate()` directly instead of the manager termination boundary, so session cleanup tied to `AgentRunManager.unregisterActiveRun(...)` is delayed until a later manager lookup unregisters the stale run.
- Current route behavior is bearer-protected but does not implement OAuth protected-resource metadata or `WWW-Authenticate` discovery. Missing bearer returns `401`; unknown/revoked/token-mismatch sessions return redacted `404 session_unavailable` to avoid leaking session/token validity.
- Official MCP documentation says HTTP-based MCP implementations should use bearer authorization in the `Authorization` header and that authorization is included in every HTTP request; it also defines OAuth protected-resource metadata for full OAuth-style authorization. This ticket should preserve current local bearer capability semantics and not expand into full OAuth discovery unless a later ticket requires it.
- A focused Vitest command could not run in this worktree because `vitest` was not found by `pnpm -C autobyteus-server-ts exec vitest ...`; implementation should verify dependency setup before using that command as evidence.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior change plus shared infrastructure refactor.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing invariant plus boundary/ownership issue plus legacy/compatibility pressure.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed in this change.
- Evidence basis: Active-session validity is currently governed by registry TTL and, for Claude, by a descriptor cache TTL. Owner cleanup exists but one public termination path bypasses the manager boundary that performs run-scoped MCP revocation.
- Requirement or scope impact: The fix must land in the shared Agent Tools MCP session subsystem and the run lifecycle boundary. It must not be patched in AGY-specific code or by retaining a compatibility TTL alongside owner-lifetime validity.

## Recommendations

1. Remove fixed active-session wall-clock expiry from Agent Tools MCP sessions.
2. Remove `ttlMillis`, required `expiresAt`, `DEFAULT_SESSION_TTL_MILLIS`, `normalizeTtlMillis`, `purgeExpiredSessions()`, and the active-session `expired` failure reason from the Agent Tools MCP session model/registry.
3. Model active validity as: session exists in memory, is not revoked, and bearer token matches.
4. Preserve `createdAt` and `revokedAt`; do not add durable session restoration.
5. Preserve bearer `Authorization` as mandatory. The session URL alone must not be sufficient authority.
6. Preserve current redacted route-denial behavior for this ticket: missing bearer is `401`; unknown/revoked/token-mismatch session is redacted `404 session_unavailable`; invalid origin is `403`; method decisions occur after auth/session where applicable.
7. Make `AgentRunManager` the authoritative termination cleanup boundary for standalone run termination. `AgentRunService.terminateAgentRun(...)` should delegate accepted termination through the manager instead of directly calling `activeRun.terminate()`.
8. Keep member cleanup idempotent: manager run-scoped revoke and mixed-member member-scoped revoke may both execute, but neither should require runtime code to store individual MCP session IDs.
9. Change Claude Agent Tools MCP descriptor state to run-lifetime caching, not expiration-time caching.
10. Add/adjust durable tests for no time expiry, explicit revoke, bearer auth failure, run owner cleanup, member owner cleanup, descriptor redaction, and memory-only restart semantics.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium.

The code change is concentrated in the shared Agent Tools MCP session model/registry/service, Claude descriptor state, lifecycle termination wiring, and tests. The semantic impact spans every MCP-consuming runtime.

## In-Scope Use Cases

- `UC-MCP-SESSION-001`: An external runtime receives a session-scoped Agent Tools MCP descriptor and calls tools while its owning run/member remains active for longer than the old 12-hour TTL.
- `UC-MCP-SESSION-002`: AutoByteus revokes Agent Tools MCP sessions when the owning standalone run terminates through the public run termination path.
- `UC-MCP-SESSION-003`: AutoByteus revokes Agent Tools MCP sessions when a mixed-team member run is disposed or terminated.
- `UC-MCP-SESSION-004`: Unauthorized clients with missing, malformed, or mismatched bearer tokens cannot use a session URL.
- `UC-MCP-SESSION-005`: After server restart or registry reinitialization, old in-memory sessions are gone and old descriptors are not reusable capabilities.
- `UC-MCP-SESSION-006`: A standalone agent run or team member run that is started, restored, or resumed after server restart receives a fresh Agent Tools MCP session/descriptor and can call MCP tools without relying on the old descriptor.
- `UC-MCP-SESSION-007`: Future CLI runtimes such as AGY and Claude Code CLI consume the shared session semantics without runtime-specific TTL patches.

## Out of Scope

- Runtime-specific MCP config materialization for AGY, Claude Code CLI, Codex, or Claude Agent SDK beyond removing active TTL coupling and ensuring shared start/restore/resume paths materialize fresh descriptors.
- AGY real-workspace `.agents/mcp_config.json` overlay concurrency fixes, except as reference context.
- Persistent/durable MCP session storage across server restarts.
- Token refresh/rekey protocol between AutoByteus and external runtimes.
- Removing bearer authorization.
- Changing business behavior of MCP tools such as `send_message_to`, browser, media, task delegation, or publish artifacts.
- Full OAuth 2.1 authorization-server discovery, OAuth protected-resource metadata, or `WWW-Authenticate` challenge rollout for Agent Tools MCP.
- Updating to the draft 2026 Streamable HTTP transport behavior such as removing the compatibility `GET` endpoint or enforcing newly required `Mcp-*` mirrored headers.
- General cleanup of unrelated TTL concepts in remote access, browser bridge registration, direct-message grants, prepared-run identities, or file watchers.

## Functional Requirements

- `REQ-MCP-SESSION-001`: Agent Tools MCP sessions shall not expire solely because a fixed wall-clock TTL has elapsed while the owning run/member remains active.
- `REQ-MCP-SESSION-002`: Agent Tools MCP sessions shall remain valid until explicitly revoked, the process loses in-memory registry state, or owner-lifecycle cleanup removes them.
- `REQ-MCP-SESSION-003`: `AgentToolMcpSession` shall not require an active-session `expiresAt` timestamp. Any future expiration-like field must be explicitly GC-only and must not drive `resolveSession(...)` for active owners.
- `REQ-MCP-SESSION-004`: `AgentToolMcpCreateSessionInput` shall not expose `ttlMillis` for active Agent Tools MCP sessions.
- `REQ-MCP-SESSION-005`: `resolveSession(...)` shall reject missing sessions, revoked sessions, and bearer-token mismatches; it shall not reject an otherwise active session as `expired` due to fixed TTL.
- `REQ-MCP-SESSION-006`: Bearer `Authorization` shall remain mandatory for every non-`OPTIONS` Agent Tools MCP endpoint request, including local loopback use.
- `REQ-MCP-SESSION-007`: The session URL and bearer token together shall be treated as a secret-bearing capability descriptor and shall continue to use redaction for logs/UI/artifacts.
- `REQ-MCP-SESSION-008`: The session service/registry shall support explicit revocation by session ID, run ID, member run ID, and owner identity without requiring runtime callers to retain individual session IDs.
- `REQ-MCP-SESSION-009`: Public standalone run termination through `AgentRunService.terminateAgentRun(...)` shall trigger run-scoped Agent Tools MCP session revocation on accepted termination.
- `REQ-MCP-SESSION-010`: Mixed-team member disposal/termination shall trigger member-run-scoped Agent Tools MCP session revocation and remain safe if run-scoped cleanup also occurs.
- `REQ-MCP-SESSION-011`: Server restart/registry reinitialization shall not restore old bearer sessions from durable state; old descriptors shall fail because the in-memory registry has no matching session.
- `REQ-MCP-SESSION-012`: Agent/team start, restart, restore, or resume paths that launch or reconnect an external-process runtime shall create or refresh the Agent Tools MCP session/descriptor from the current in-memory server process before the runtime uses MCP tools.
- `REQ-MCP-SESSION-013`: Resumed agent/team flows shall not persist or reuse raw bearer tokens from old descriptors; they shall use newly materialized descriptors for the current process.
- `REQ-MCP-SESSION-014`: Any cleanup for abandoned sessions shall be framed as explicit owner cleanup or future in-memory GC for sessions with no active owner, not as active-session TTL enforcement.
- `REQ-MCP-SESSION-015`: Current route-denial behavior shall be preserved for this ticket: missing bearer returns `401`; unknown/revoked/token-mismatch sessions return redacted `404 session_unavailable`; route responses shall not leak raw tokens or session IDs.
- `REQ-MCP-SESSION-016`: Claude Agent Tools MCP descriptor state shall reuse a live descriptor for the owner run/session lifetime instead of refreshing solely because an `expiresAt` timestamp elapsed.
- `REQ-MCP-SESSION-017`: Codex and other existing shared runtime tests shall be updated so mock sessions no longer depend on required `expiresAt` fields.
- `REQ-MCP-SESSION-018`: Durable unit/integration tests shall be updated for no time expiry, explicit revoke, bearer auth failure, owner revoke, descriptor redaction, route behavior, and memory-only restart semantics.

## Acceptance Criteria

- `AC-MCP-SESSION-001`: A session created without TTL remains resolvable after simulated time advances beyond 12 hours when not revoked and when the bearer token matches.
- `AC-MCP-SESSION-002`: `resolveSession(...)` no longer returns an `expired` failure reason for active Agent Tools MCP sessions, and no durable test expects that reason.
- `AC-MCP-SESSION-003`: A revoked session is rejected by `resolveSession(...)` and by the HTTP MCP route.
- `AC-MCP-SESSION-004`: Missing or incorrect bearer token requests fail before tool dispatch, and route responses do not reveal whether a session ID or token was valid.
- `AC-MCP-SESSION-005`: Owner-scoped revocation invalidates all matching run/member sessions and leaves non-matching sessions active.
- `AC-MCP-SESSION-006`: Public `AgentRunService.terminateAgentRun(...)` accepted termination causes run-scoped Agent Tools MCP sessions to be revoked without double-terminating the run.
- `AC-MCP-SESSION-007`: Mixed member disposal/termination causes member-run-scoped Agent Tools MCP sessions to be revoked; repeated run/member cleanup remains idempotent.
- `AC-MCP-SESSION-008`: The public session descriptor remains redacted in redacted views and does not leak bearer tokens or session IDs.
- `AC-MCP-SESSION-009`: A fresh registry/process state does not resolve an old descriptor's session ID and bearer token.
- `AC-MCP-SESSION-010`: A restored/resumed standalone agent run or team member run materializes a fresh descriptor in the current process and can call MCP tools with that fresh bearer descriptor.
- `AC-MCP-SESSION-011`: Claude Agent Tools MCP descriptor caching no longer refreshes based on elapsed wall-clock time during one owner-live session; after a restored/restarted owner session, a fresh descriptor is materialized through the normal session creation path.
- `AC-MCP-SESSION-012`: No production Agent Tools MCP code path or test fixture requires `ttlMillis` or active-session `expiresAt`.
- `AC-MCP-SESSION-013`: The requirements and investigation notes explicitly state this ticket is based on `origin/codex/streamable-mcp-runtime-tools` and is not AGY-specific.

## Constraints / Dependencies

- Must be based directly on `origin/codex/streamable-mcp-runtime-tools`.
- Must not depend on AGY branch implementation state.
- Must preserve bearer-token capability semantics.
- Must avoid backward-compatible dual validity models where both TTL and owner-lifetime are authoritative.
- Must keep the Agent Tools MCP route as protocol/session authority, not business tool authority.
- Must respect the existing Agent Tools MCP subsystem under `autobyteus-server-ts/src/agent-tools/mcp/` and the existing run lifecycle owners in `AgentRunManager`, `AgentRunService`, and mixed-team member handles.

## Assumptions

- External runtimes may load MCP config once at startup and may not support session token refresh during an active run.
- In-memory session loss on server restart is acceptable only because restored/resumed agents and teams will be relaunched or reconfigured with fresh Agent Tools MCP descriptors for the current server process.
- Localhost is not a sufficient security boundary; bearer authorization remains required.
- Configured tool exposure for a run/member is treated as stable for the lifetime of the descriptor created for that owner session in this scope.
- Delayed/periodic orphan GC is not required for this ticket if accepted termination and dispose paths revoke owner sessions promptly.

## Risks / Open Questions

- `RQ-MCP-SESSION-001`: Test dependency setup is currently unavailable in this worktree (`vitest` command not found through `pnpm exec`); implementation must verify whether dependencies need installation or a different test invocation.
- `RQ-MCP-SESSION-002`: Full MCP OAuth protected-resource metadata is not implemented in the current base. If required for remote/non-local MCP exposure, that should be a separate authorization-compliance ticket.
- `RQ-MCP-SESSION-003`: Some stale runs may still be discovered only through `AgentRunManager.getActiveRun(...)` if a backend becomes inactive without explicit termination. This ticket should not reintroduce TTL; if passive inactivity needs cleanup beyond current manager unregister-on-lookup behavior, that is a separate owner-lifecycle observation/GC issue.

## Requirement-To-Use-Case Coverage

| Use Case | Requirements |
| --- | --- |
| `UC-MCP-SESSION-001` | `REQ-MCP-SESSION-001`, `REQ-MCP-SESSION-002`, `REQ-MCP-SESSION-003`, `REQ-MCP-SESSION-004`, `REQ-MCP-SESSION-005`, `REQ-MCP-SESSION-016` |
| `UC-MCP-SESSION-002` | `REQ-MCP-SESSION-008`, `REQ-MCP-SESSION-009` |
| `UC-MCP-SESSION-003` | `REQ-MCP-SESSION-008`, `REQ-MCP-SESSION-010` |
| `UC-MCP-SESSION-004` | `REQ-MCP-SESSION-006`, `REQ-MCP-SESSION-007`, `REQ-MCP-SESSION-015` |
| `UC-MCP-SESSION-005` | `REQ-MCP-SESSION-011`, `REQ-MCP-SESSION-014` |
| `UC-MCP-SESSION-006` | `REQ-MCP-SESSION-012`, `REQ-MCP-SESSION-013`, `REQ-MCP-SESSION-016`, `REQ-MCP-SESSION-017`, `REQ-MCP-SESSION-018` |
| `UC-MCP-SESSION-007` | `REQ-MCP-SESSION-001`, `REQ-MCP-SESSION-005`, `REQ-MCP-SESSION-017`, `REQ-MCP-SESSION-018` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| `AC-MCP-SESSION-001` | Proves removal of fixed 12-hour invalidation. |
| `AC-MCP-SESSION-002` | Prevents hidden TTL compatibility behavior from remaining authoritative. |
| `AC-MCP-SESSION-003` | Proves explicit revoke remains authoritative. |
| `AC-MCP-SESSION-004` | Proves bearer auth remains mandatory and non-enumerating. |
| `AC-MCP-SESSION-005` | Proves owner-lifecycle cleanup semantics. |
| `AC-MCP-SESSION-006` | Proves public standalone run termination uses the manager cleanup boundary. |
| `AC-MCP-SESSION-007` | Proves member lifecycle cleanup remains wired and idempotent. |
| `AC-MCP-SESSION-008` | Proves secret redaction remains intact. |
| `AC-MCP-SESSION-009` | Proves memory-only server restart behavior. |
| `AC-MCP-SESSION-010` | Proves resume/restart rematerializes fresh MCP capability descriptors. |
| `AC-MCP-SESSION-011` | Proves Claude no longer depends on TTL refresh within one live owner session and still refreshes across owner restart/restore. |
| `AC-MCP-SESSION-012` | Proves type/test consumers no longer depend on old active expiry shape. |
| `AC-MCP-SESSION-013` | Confirms this is a shared base-branch ticket. |

## Approval Status

Approved by user in chat on 2026-06-16. Proceed with design spec and architecture review handoff.
