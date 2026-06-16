# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete.
- Current Status: Requirements approved by user; design spec produced and ready for architecture review.
- Investigation Goal: Analyze the shared Agent Tools MCP session lifetime/authorization ticket directly from `origin/codex/streamable-mcp-runtime-tools` and define a design-ready requirements basis.
- Scope Classification (`Small`/`Medium`/`Large`): Medium.
- Scope Classification Rationale: Concentrated shared infrastructure change with semantic impact across every external-process runtime using AutoByteus-hosted MCP tools.
- Scope Summary: Replace fixed active-session TTL semantics with owner-lifetime in-memory MCP capability sessions, preserve bearer authorization/redaction, ensure run/member lifecycle cleanup is authoritative, and require start/restart/restore/resume paths to materialize fresh descriptors after process restart.
- Primary Questions To Resolve:
  - Which fields/APIs encode the current fixed TTL and must be removed?
  - Which owner lifecycle paths already revoke Agent Tools MCP sessions and where is cleanup bypassed or delayed?
  - Which runtime descriptor caches depend on `expiresAt` and must be updated?
  - Which route/API/unit tests must change to prove owner-lifetime semantics?
  - Which start/restart/restore/resume paths must materialize fresh descriptors after the in-memory registry is reset?
  - Is OAuth protected-resource metadata present in the base branch or out of scope?

## Request Context

The user requested analysis of `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/tickets/done/agent-tools-mcp-session-lifetime`. Existing bootstrap artifacts state that this ticket was separated from AGY because session lifetime and authorization semantics are not AGY-specific. The ticket is based directly on `origin/codex/streamable-mcp-runtime-tools`, not on an AGY worktree.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/tickets/done/agent-tools-mcp-session-lifetime`.
- Current Branch: `codex/agent-tools-mcp-session-lifetime`.
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime`.
- Bootstrap Base Branch: `origin/codex/streamable-mcp-runtime-tools`.
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-06-16 during continued analysis; `origin/codex/streamable-mcp-runtime-tools` remains `c3cc4d0d49db1146c18a3c251518041ee233c512`.
- Task Branch: `codex/agent-tools-mcp-session-lifetime`.
- Expected Base Branch (if known): `origin/codex/streamable-mcp-runtime-tools`.
- Expected Finalization Target (if known): Merge into the streamable MCP base/integration line before AGY/Claude Code runtime tickets consume it.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: This is a shared infrastructure ticket. Do not make the design depend on AGY-specific workspace config overlay code.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-16 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/SKILL.md` | Load required solution-designer workflow | Must use dedicated worktree, maintain requirements/investigation artifacts, read design principles, and obtain requirements approval before design handoff. | No |
| 2026-06-16 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/design-principles.md` | Load canonical design rules | Design must be spine/ownership-led; no backward compatibility/dual paths; authoritative boundary rule applies. | No |
| 2026-06-16 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/references/design-examples.md` | Review concrete runtime/lifecycle design examples | Runtime design should distinguish public facade, governing owner, bounded local spines, and off-spine cleanup concerns. | No |
| 2026-06-16 | Doc | `tickets/done/agent-tools-mcp-session-lifetime/bootstrap-handoff.md` | Understand existing ticket bootstrap | Worktree/branch/base already created from `origin/codex/streamable-mcp-runtime-tools`; requirements were draft only. | No |
| 2026-06-16 | Doc | `tickets/done/agent-tools-mcp-session-lifetime/requirements-doc.md` | Read existing requirements draft | Draft correctly identified fixed TTL, bearer auth preservation, explicit owner revoke, memory-only restart, and cross-runtime scope. | Superseded by refined requirements. |
| 2026-06-16 | Doc | `tickets/done/agent-tools-mcp-session-lifetime/investigation-notes.md` | Read existing bootstrap investigation | Bootstrap had already inspected core MCP session files and AGY reroute context. | Updated with deeper code/runtime findings. |
| 2026-06-16 | Command | `git -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime status --short --branch` | Verify dedicated branch/worktree | `## codex/agent-tools-mcp-session-lifetime...origin/codex/streamable-mcp-runtime-tools`; ticket artifacts are untracked. | No |
| 2026-06-16 | Command | `git fetch origin --prune && git status --short --branch && git rev-parse origin/codex/streamable-mcp-runtime-tools && git rev-parse HEAD` | Refresh remote and verify base equality | Fetch succeeded; HEAD and remote base both `c3cc4d0d49db1146c18a3c251518041ee233c512`. | No |
| 2026-06-16 | Command | `find . -maxdepth 2 -type d` and package file discovery | Understand repository layout | Relevant implementation is under `autobyteus-server-ts/src`; ticket artifacts live at repo root `tickets/...`. | No |
| 2026-06-16 | Code | `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session.ts` | Inspect session/descriptor types | `AgentToolMcpSession` requires `expiresAt: Date`; create input accepts `ttlMillis`; resolve failure union includes `expired`; descriptor contains bearer header and redaction helper. | Change required. |
| 2026-06-16 | Code | `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-registry.ts` | Inspect current lifetime authority | Registry defines `DEFAULT_SESSION_TTL_MILLIS = 12h`, normalizes TTL, stores `expiresAt`, rejects as `expired`, and purges expired sessions. | Primary target for TTL removal. |
| 2026-06-16 | Code | `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-service.ts` | Inspect session creation/revoke boundary | Service builds secret/redacted descriptors and exposes revoke by session, run, member run, and owner identity. This boundary already fits owner-lifetime cleanup. | Keep and adjust types. |
| 2026-06-16 | Code | `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-http-gate.ts` | Inspect route gate behavior | Gate validates local origin, unauthenticated OPTIONS, unsupported method auth/session, missing bearer `401`, and session unavailable `404`. | Preserve in this ticket. |
| 2026-06-16 | Code | `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-routes.ts` | Inspect MCP route behavior | Route requires bearer before session resolution, returns redacted 404 for unresolved sessions, handles DELETE/GET/POST/content/protocol behavior. | Update tests if resolve failure union changes. |
| 2026-06-16 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-session-state.ts` | Inspect runtime descriptor cache | Claude descriptor cache stores `{ descriptor, expiresAt }` and refreshes when expired. This preserves old TTL semantics above the registry. | Change to owner-lifetime descriptor cache. |
| 2026-06-16 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Inspect Codex session creation | Codex creates descriptor at thread config build; no production TTL cache. Tests have `expiresAt` fixtures only due type. | Update fixtures. |
| 2026-06-16 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Inspect run lifecycle owner | `unregisterActiveRun(runId)` deletes active run and calls `getAgentToolMcpSessionService().revokeAgentToolMcpSessionsForRun(runId)`. Manager is the authoritative cleanup boundary. | Ensure public service uses it. |
| 2026-06-16 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | Inspect public termination path | `terminateAgentRun(...)` calls `activeRun.terminate()` directly, records metadata/history, and does not call `AgentRunManager.terminateAgentRun(...)`; run-scoped MCP revoke is delayed until later manager unregister. | Change required. |
| 2026-06-16 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Inspect member cleanup | `dispose()` revokes Agent Tools MCP sessions by member run ID and clears the member run. | Keep; add/verify coverage. |
| 2026-06-16 | Command | `rg -n "expiresAt|ttlMillis|purgeExpiredSessions|DEFAULT_SESSION_TTL_MILLIS|reason: \"expired\"|\"expired\"" ...` | Find TTL dependencies | Only Agent Tools MCP production TTL dependencies are in session types/registry and Claude descriptor state; Codex/Claude tests include fixtures; unrelated TTLs exist in other subsystems and are out of scope. | Update in-scope files/tests only. |
| 2026-06-16 | Test | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts tests/unit/agent-execution/agent-run-manager.test.ts tests/unit/agent-execution/agent-run-termination-service.test.ts --runInBand` | Attempt focused baseline tests | Command failed immediately: `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "vitest" not found`. No behavioral tests executed. | Implementation must resolve dependency/test invocation. |
| 2026-06-16 | Test | `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts` | Inspect current session tests | Test currently asserts TTL expiry with `ttlMillis: 1000` and `reason: "expired"`; also covers redaction and owner revoke. | Rewrite expiry assertion into no-expiry assertion. |
| 2026-06-16 | Test | `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | Inspect route coverage | Covers auth/session/origin/method/content/protocol and official SDK loopback consumption, but not revoked route, no-expiry route, or memory restart. | Add/adjust tests. |
| 2026-06-16 | Test | `autobyteus-server-ts/tests/unit/agent-execution/agent-run-manager.test.ts` and `tests/integration/agent-execution/agent-run-manager.integration.test.ts` | Inspect run-manager lifecycle coverage | Existing tests prove sidecars detach and active runs unregister on manager termination, but do not assert MCP session revoke. | Add MCP revoke test. |
| 2026-06-16 | Test | `autobyteus-server-ts/tests/unit/agent-execution/agent-run-termination-service.test.ts` and integration service tests | Inspect public termination coverage | Service tests mock `getActiveRun` and direct `terminate`; they do not assert manager cleanup boundary. | Update tests for manager delegation/no double terminate. |
| 2026-06-16 | Web | `https://modelcontextprotocol.io/specification/draft/basic/authorization` | Verify current official MCP auth guidance | Authorization is optional; HTTP transports should use bearer header when authorization is supported; protected-resource metadata is part of full OAuth-style auth. | Keep full OAuth rollout out of scope. |
| 2026-06-16 | Web | `https://modelcontextprotocol.io/specification/draft/basic/transports/streamable-http` | Verify Streamable HTTP transport guidance | Draft transport emphasizes Origin validation, localhost binding, proper authentication, POST endpoint, and later draft changes beyond current base. | Do not expand this ticket into full draft transport update. |
| 2026-06-16 | Doc | `tickets/done/streamable-mcp-runtime-tools/design-spec.md` | Understand base architecture intent | Base introduced Agent Tools MCP as a runtime-neutral bearer capability boundary; it intentionally used in-memory session registry and deferred persistence. | Target design should refine lifetime semantics, not redesign tools. |
| 2026-06-16 | Doc | `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-runtime-support/tickets/in-progress/agy-runtime-support/code-review-design-reroute-mcp-session-lifetime.md` | Capture AGY review motivation from bootstrap notes | Reroute identified fixed TTL as cross-runtime design issue for CLI runtimes that load config once and cannot refresh tokens mid-run. | No AGY dependency in this ticket. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary:
  - Runtime backend/materializer creates an Agent Tools MCP descriptor by calling `AgentToolMcpSessionService.createAgentToolMcpSession(...)`.
  - External MCP clients call `/mcp/agent-tools/:sessionId` with `Authorization: Bearer <capabilityToken>`.
- Current session creation flow:
  - `AgentToolMcpSessionService` derives enabled tools through `AgentToolMcpCatalog`.
  - `AgentToolMcpSessionRegistry.createSession(...)` generates a session ID and capability token, stores only the token hash, normalizes owner identity, stores sender/context/enabled tools, sets `createdAt`, sets `expiresAt = createdAt + ttlMillis`, and returns the raw token once in the secret descriptor.
- Current session resolution flow:
  - Route/gate extracts bearer token.
  - `resolveSession(...)` checks session existence, `revokedAt`, `expiresAt`, and token hash match.
  - Route returns `401` for missing bearer and redacted `404 session_unavailable` for missing/revoked/expired/token-mismatch sessions.
- Current cleanup flow:
  - `AgentRunManager.unregisterActiveRun(...)` revokes all sessions for `runId`.
  - `MixedAgentMemberHandle.dispose()` revokes all sessions for `memberRunId`.
  - `AgentRunService.terminateAgentRun(...)` currently bypasses `AgentRunManager.terminateAgentRun(...)`, so manager unregister and run-scoped MCP revocation do not happen immediately on that public path.
- Current behavior summary:
  - Active external runtimes can lose MCP access after a fixed TTL while owner run/member is still active.
  - Claude specifically can refresh descriptors between turns based only on elapsed time, preserving the old TTL concept even if registry TTL is removed.
  - Owner cleanup primitives exist but need authoritative public termination wiring.
  - Restart/resume semantics must be explicit: old in-memory descriptors are invalid after server restart, but restored/resumed agent/team runtime materialization must create a fresh descriptor for the current process.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior change plus shared infrastructure refactor.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing invariant plus boundary/ownership issue plus legacy/compatibility pressure.
- Refactor posture evidence summary: Session lifetime must be governed by owner lifecycle. Retaining active TTL in registry, type shape, tests, or Claude cache would create dual validity models.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `agent-tool-mcp-session-registry.ts` | Fixed 12h TTL and `expiresAt` invalidation are owned by registry. | Missing lifecycle invariant; active validity should not be time-owned. | Remove active TTL authority. |
| `agent-tool-mcp-session.ts` | Public type requires `expiresAt` and accepts `ttlMillis`. | Shared structure looseness/legacy pressure; callers/tests are forced to preserve old semantics. | Tighten type. |
| `claude-agent-tools-mcp-session-state.ts` | Descriptor cache refreshes by `expiresAt`. | Old TTL semantics leak above registry. | Cache by owner session lifetime instead. |
| `AgentRunManager.unregisterActiveRun(...)` | Manager revokes sessions for run ID. | Correct owner boundary already exists. | Route public termination through manager. |
| `AgentRunService.terminateAgentRun(...)` | Public service directly calls `activeRun.terminate()`. | Authoritative boundary bypass; cleanup delayed. | Delegate accepted termination to manager. |
| `MixedAgentMemberHandle.dispose()` | Member sessions revoked by member run ID. | Member cleanup exists and is idempotent with run cleanup. | Verify/add coverage. |
| MCP official docs | Bearer authorization should be in HTTP Authorization header when auth is supported; OAuth metadata is a broader optional auth flow. | Preserve bearer; avoid expanding this ticket to OAuth discovery. | Follow-up only if desired. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session.ts` | Session/descriptor/owner types and redaction | Required `expiresAt`, `ttlMillis`, and `expired` failure reason. | Type model must express owner-lifetime active sessions. |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-registry.ts` | In-memory MCP session store/token validation/lifetime/revoke | Owns TTL, expiry checks, purge expired sessions, owner matching. | Remove active TTL; keep memory, token, owner, revoke authority. |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-service.ts` | Session creation descriptor and revoke APIs | Already exposes run/member/owner revoke and redaction. | Reuse/extend; do not bypass. |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-http-gate.ts` | Route preflight/auth/method gate | Missing bearer `401`; session unavailable `404`; local origin policy. | Preserve route-denial shape in this ticket. |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-routes.ts` | MCP HTTP route | Resolves session and dispatches MCP methods. | Update only as required by resolve failure type. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-session-state.ts` | Claude descriptor cache | Stores descriptor with `expiresAt` and refreshes by wall clock. | Replace with owner-lifetime descriptor cache. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Codex App Server descriptor creation | Creates descriptor per thread config; no production TTL cache. | Mostly type/test updates. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Active run lifecycle owner | Unregisters active run and revokes MCP sessions by run ID. | Make this the authoritative public termination cleanup path. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | Public run service / GraphQL-backed termination workflow | Directly terminates active run and bypasses manager unregister. | Needs boundary fix to avoid delayed cleanup. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Mixed member run handle lifecycle | Dispose revokes sessions by member run ID. | Keep; verify idempotent cleanup. |
| `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts` | Session service/executor unit tests | Currently tests expiry and `expired` reason. | Rewrite to prove no time expiry and explicit revoke. |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | Route behavior integration tests | Covers auth/gate/SDK but not no-expiry/revoked/restart. | Expand coverage. |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-run-manager.test.ts` | Manager lifecycle unit tests | Sidecar cleanup covered, not MCP revoke. | Add session revoke assertion. |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-run-termination-service.test.ts` | Public termination service tests | Mocks direct activeRun termination. | Update to manager delegation/no double terminate. |
| `tickets/done/streamable-mcp-runtime-tools/design-spec.md` | Base architecture for Agent Tools MCP | Defines runtime-neutral bearer capability boundary and memory-only session registry. | New design should refine lifetime semantics only. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-16 | Test | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts tests/unit/agent-execution/agent-run-manager.test.ts tests/unit/agent-execution/agent-run-termination-service.test.ts --runInBand` | Failed before running tests: `Command "vitest" not found`. | Current investigation has source-level evidence but no test execution evidence; implementation must resolve test setup/invocation. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: `https://modelcontextprotocol.io/specification/draft/basic/authorization`
  - Version / tag / commit / freshness: Official MCP draft documentation accessed 2026-06-16.
  - Relevant contract, behavior, or constraint learned: HTTP-based MCP authorization is optional, but when supported uses bearer tokens in the `Authorization` header on HTTP requests; full OAuth protected-resource metadata belongs to the OAuth authorization flow.
  - Why it matters: Confirms preserving bearer headers is aligned, while full OAuth metadata/discovery is broader than this owner-lifetime ticket.
- Public API / spec / issue / upstream source: `https://modelcontextprotocol.io/specification/draft/basic/transports/streamable-http`
  - Version / tag / commit / freshness: Official MCP draft documentation accessed 2026-06-16.
  - Relevant contract, behavior, or constraint learned: Streamable HTTP guidance includes Origin validation, localhost binding, proper authentication, POST endpoint behavior, and draft changes not present in current base.
  - Why it matters: Confirms route auth/origin behavior is relevant, but changing transport-era compatibility is out of scope.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for source-level investigation.
- Required config, feature flags, env vars, or accounts: None for source-level investigation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation:
  - `git fetch origin --prune`
  - Existing worktree from bootstrap: `git worktree add -b codex/agent-tools-mcp-session-lifetime /Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime origin/codex/streamable-mcp-runtime-tools`
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- Base branch already has a useful session/descriptor/revoke structure. It should be tightened, not replaced.
- The core defect is that wall-clock TTL is authoritative for active sessions.
- A secondary defect is that public run termination can bypass immediate run-scoped MCP cleanup because `AgentRunService` terminates the `AgentRun` directly instead of using `AgentRunManager.terminateAgentRun`.
- Claude descriptor state is a hidden legacy TTL path and must be changed along with registry/type changes.
- Bearer auth and descriptor redaction are healthy and must be preserved.
- Current base does not implement OAuth protected-resource metadata or `WWW-Authenticate`; adding it is out of scope for this lifetime ticket.
- Route tests should remain focused on current local bearer capability semantics and non-enumerating session unavailable responses.
- Test execution is currently blocked by missing `vitest` executable in the worktree environment.

## Constraints / Dependencies / Compatibility Facts

- This ticket is based on `origin/codex/streamable-mcp-runtime-tools` directly.
- No AGY branch code should be required.
- No backward-compatible dual-path TTL/owner-lifetime behavior should remain authoritative.
- Old descriptors cannot survive server restart because bearer session registry is memory-only; restored/resumed owners must receive fresh descriptors instead of reusing old raw bearer tokens.
- Unrelated TTL domains (remote access pairing, browser bridge registrations, direct-message grants, prepared runs, file watcher suppression) are separate lifetimes and should not be modified.

## Open Unknowns / Risks

- The worktree currently cannot run the focused Vitest command because `vitest` is not found; implementation needs dependency/test setup verification.
- Full OAuth protected-resource metadata may become important for remote MCP exposure, but it is not present in the current base and would widen this ticket materially.
- Passive backend inactivity without explicit public termination still relies on manager lookup/listing to unregister stale runs. This ticket should not use a session TTL as a substitute for that lifecycle observation.

## Notes For Architect Reviewer

This ticket is design-ready once the user approves the requirements. The eventual design spec should focus on these shared spines:

1. Runtime creates Agent Tools MCP session and descriptor.
2. External runtime calls MCP endpoint with bearer auth while owner remains active beyond the old TTL.
3. Owner run/member terminates and revokes sessions through the correct lifecycle owner.
4. Unauthorized/tampered session request fails without tool dispatch or secret leakage.
5. Server restart clears in-memory sessions and invalidates old descriptors.
6. Start/restart/restore/resume of standalone agents and team members creates fresh descriptors so MCP tools still work after restart.

Architecture emphasis:

- `AgentToolMcpSessionRegistry` owns memory session validity, token hash validation, owner identity, and revocation; it must not own active owner wall-clock expiry.
- `AgentToolMcpSessionService` remains the internal runtime-facing boundary for descriptor creation and owner revocation.
- `AgentRunManager` is the authoritative run cleanup boundary; `AgentRunService` should not bypass it during termination.
- `MixedAgentMemberHandle` remains the member cleanup owner and may redundantly revoke member sessions idempotently.
- Clean-cut removal is required for `ttlMillis`, `expiresAt`, `expired`, `purgeExpiredSessions`, and Claude's expiration-based descriptor refresh; this must not block legitimate fresh descriptor creation during owner restart/restore/resume.
