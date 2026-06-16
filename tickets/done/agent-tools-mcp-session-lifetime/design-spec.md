# Design Spec

## Current-State Read

The Agent Tools MCP subsystem is already a shared runtime-neutral capability boundary under `autobyteus-server-ts/src/agent-tools/mcp/`. Runtime materializers call `AgentToolMcpSessionService.createAgentToolMcpSession(...)`, receive a secret descriptor with `/mcp/agent-tools/:sessionId` plus `Authorization: Bearer <token>`, and pass that descriptor into external-process runtimes such as Codex App Server or Claude Agent SDK.

Current session validity is wrong for long-running external-process runtimes because `AgentToolMcpSessionRegistry` owns a fixed active-session TTL:

- `agent-tool-mcp-session-registry.ts` defines `DEFAULT_SESSION_TTL_MILLIS = 12 * 60 * 60 * 1000`.
- `createSession(...)` stores `expiresAt` on every `AgentToolMcpSession`.
- `resolveSession(...)` rejects otherwise valid sessions as `expired` when `expiresAt <= now`.
- `purgeExpiredSessions()` deletes sessions by this wall-clock TTL.
- `agent-tool-mcp-session.ts` exposes `ttlMillis`, required `expiresAt`, and `expired` in the public in-repo session model.

This conflicts with the real owner lifecycle. An external runtime may load its MCP descriptor once at startup and have no refresh/rekey protocol during one active run. If the run remains active for more than 12 hours, tool calls fail even though the owner run/member remains valid.

Current cleanup ownership is partly correct but has one important bypass:

- `AgentToolMcpSessionService` already exposes revoke-by-session, revoke-by-run, revoke-by-member-run, and revoke-by-owner APIs.
- `AgentRunManager.unregisterActiveRun(runId)` already calls `revokeAgentToolMcpSessionsForRun(runId)`.
- `MixedAgentMemberHandle.dispose()` already calls `revokeAgentToolMcpSessionsForMemberRun(memberRunId)`.
- `AgentRunService.terminateAgentRun(...)` currently calls `activeRun.terminate()` directly instead of `AgentRunManager.terminateAgentRun(...)`, so public standalone termination can skip immediate manager unregister and MCP session revocation until a later active-run lookup unregisters the stale entry.

Current start/restore/resume materialization is close to the desired Option A model:

- Codex create/restore flows go through `CodexThreadBootstrapper.bootstrapInternal(...)`, which calls `createAgentToolsMcpAppServerConfig(...)` and creates a fresh Agent Tools MCP session/descriptor for the current process.
- Claude create/restore flows build a `ClaudeSession`; `ClaudeSession.executeTurn(...)` calls `ClaudeAgentToolsMcpSessionState.ensureDescriptor(...)` before building MCP server config for a configured turn. This creates a descriptor lazily before Claude uses MCP tools.
- Mixed team restore rebuilds `MixedAgentMemberContext` with persisted platform IDs; a member is lazily restored through `MixedAgentMemberHandle.ensureReady()`, which calls `AgentRunManager.restoreAgentRunFromPlatformState(...)`; that backend restore path rematerializes the runtime descriptor before member MCP use.

The problematic Claude detail is that `ClaudeAgentToolsMcpSessionState` currently caches the descriptor only until `result.session.expiresAt`. That is a hidden TTL compatibility path above the registry and must become owner-lifetime caching.

Route/security behavior is otherwise healthy for this ticket:

- `agent-tools-mcp-http-gate.ts` and `agent-tools-mcp-routes.ts` require bearer auth for every non-`OPTIONS` request.
- Missing bearer returns `401`.
- Unknown/revoked/token-mismatch session returns redacted `404 session_unavailable` without revealing whether the session ID or token was valid.
- Secret descriptors have redacted projections via `redactAgentToolMcpDescriptor(...)`.

## Intended Change

Implement Option A owner-lifetime Agent Tools MCP sessions:

1. Active Agent Tools MCP sessions are memory-only bearer capabilities that remain valid while present in the registry, not revoked, and bearer token matches.
2. Remove fixed wall-clock active-session expiration from the session model, registry, service inputs, and tests.
3. Keep `createdAt` and `revokedAt` as the lifecycle fields; `revokedAt` is the invalidation authority for known sessions.
4. Preserve bearer authorization and redaction behavior.
5. Make public standalone termination use the `AgentRunManager` cleanup boundary so run-scoped MCP session revocation happens immediately on accepted termination.
6. Keep mixed member cleanup idempotent through existing member-scoped revoke.
7. Preserve memory-only restart behavior: the server does not persist/restore old session IDs or bearer token hashes. Any old descriptor still held by a client fails after registry reset/restart.
8. Ensure start/restore/resume flows materialize a fresh descriptor in the current process before runtime MCP use. Existing Codex restore and mixed member lazy restore already flow through descriptor creation; Claude should keep lazy descriptor creation but cache by live owner session rather than by expiry.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior change plus shared infrastructure refactor.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing invariant plus boundary/ownership issue plus legacy/compatibility pressure.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence:
  - `AgentToolMcpSessionRegistry.resolveSession(...)` invalidates active owners by wall-clock TTL.
  - `AgentToolMcpSession` forces `expiresAt`/`ttlMillis` into all session producers and tests.
  - `ClaudeAgentToolsMcpSessionState` refreshes descriptors based on `expiresAt`.
  - `AgentRunService.terminateAgentRun(...)` bypasses the manager boundary that owns run unregister and MCP session cleanup.
- Design response:
  - Tighten the shared session model to one validity authority: memory presence + `revokedAt` + bearer-token hash match.
  - Remove active TTL fields/APIs and tests instead of keeping a compatibility branch.
  - Route public run termination through `AgentRunManager.terminateAgentRun(...)`.
  - Treat restart/resume as fresh descriptor materialization, not durable session restoration.
- Refactor rationale:
  - A local patch to increase TTL or refresh tokens in one runtime would leave the shared invalidation invariant broken and would not help all external runtimes.
  - Keeping TTL as a secondary compatibility path would violate the no-dual-authority rule and make long-running runs fail again.
- Intentional deferrals and residual risk, if any:
  - Full OAuth protected-resource metadata and `WWW-Authenticate` discovery are deferred because the current base implements local bearer capability auth, and this ticket is about lifetime semantics.
  - Passive backend inactivity that is discovered only on later manager lookup remains a separate lifecycle-observation concern. This ticket must not use TTL as a substitute for owner lifecycle cleanup.

## Terminology

- `Agent Tools MCP session`: AutoByteus application-level in-memory session binding one external runtime descriptor to one owner identity, sender context, execution context, enabled tool allowlist, token hash, and revocation state.
- `Descriptor`: Secret runtime-facing config containing `serverUrl`, bearer `Authorization` header, server name/transport, and enabled tools. It is not authoritative without the server-side registry entry.
- `Owner identity`: `runId` plus optional `teamRunId`, `memberRunId`, `memberRouteKey`, and `memberName`.
- `Fresh descriptor materialization`: Creating a new in-memory session and passing its descriptor to the runtime on create/restore/resume in the current server process.

## Design Reading Order

Read this design from abstract to concrete:

1. data-flow spine and lifecycle ownership;
2. subsystem/capability allocation;
3. file responsibility tightening and removal decisions;
4. concrete folder/file mapping and implementation sequence.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove fixed active-session TTL semantics instead of preserving them behind optional fields, fallback checks, or tests.
- Legacy active TTL items in scope:
  - `DEFAULT_SESSION_TTL_MILLIS`;
  - `ttlMillis` in `AgentToolMcpCreateSessionInput`;
  - required `expiresAt` in `AgentToolMcpSession`;
  - `expired` in `AgentToolMcpSessionResolveFailureReason`;
  - `resolveSession(...)` expiry check;
  - `purgeExpiredSessions()`;
  - Claude descriptor cache refresh by `expiresAt`;
  - unit test expectations for active-session expiry.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Runtime create/restore/resume path | External runtime receives current-process MCP descriptor | Runtime backend/bootstrapper + `AgentToolMcpSessionService` | Ensures every new or resumed external runtime gets a usable descriptor without restoring old sessions. |
| DS-002 | Primary End-to-End | External runtime MCP request | MCP method dispatch or redacted denial | Agent Tools MCP route + `AgentToolMcpSessionRegistry` | Defines active session validity and bearer authorization behavior. |
| DS-003 | Primary End-to-End | Standalone run termination request | Run-scoped Agent Tools MCP sessions revoked | `AgentRunManager` | Fixes the cleanup boundary bypass in public termination. |
| DS-004 | Primary End-to-End | Mixed team member dispose/terminate | Member-scoped Agent Tools MCP sessions revoked | `MixedAgentMemberHandle` + `AgentRunManager` | Keeps team/member session cleanup tied to member lifecycle and safe if duplicate cleanup occurs. |
| DS-005 | Primary End-to-End | Server process restart / registry reset | Old descriptor rejected; restored owner gets fresh descriptor | `AgentToolMcpSessionRegistry` + runtime restore materializers | Captures Option A restart semantics precisely. |
| DS-006 | Bounded Local | Registry `createSession` / `resolveSession` / revoke calls | Memory session state updated or resolved | `AgentToolMcpSessionRegistry` | Local validity loop replaces TTL with memory + revocation + token match. |
| DS-007 | Bounded Local | Claude configured turn needs MCP | Descriptor supplied to Claude MCP server config | `ClaudeAgentToolsMcpSessionState` | Claude lazily creates/reuses descriptors before tool use and must stop using expiration refresh. |

## Primary Execution Spine(s)

- DS-001: `AgentRunService / TeamRunService start-or-restore -> AgentRunManager / AgentTeamRunManager -> Runtime Backend Factory -> Runtime Bootstrapper / Claude Session -> AgentToolMcpSessionService -> AgentToolMcpSessionRegistry -> Runtime MCP descriptor materializer -> External Runtime`
- DS-002: `External Runtime -> /mcp/agent-tools/:sessionId -> HTTP Gate / Route -> AgentToolMcpSessionRegistry.resolveSession -> AgentToolsMcpMethodDispatcher -> Tool Catalog / Executor`
- DS-003: `GraphQL / Public API terminateAgentRun -> AgentRunService -> AgentRunManager.terminateAgentRun -> AgentRun.terminate -> AgentRunManager.unregisterActiveRun -> AgentToolMcpSessionService.revokeAgentToolMcpSessionsForRun`
- DS-004: `Team member termination/dispose -> MixedAgentMemberHandle.dispose -> AgentToolMcpSessionService.revokeAgentToolMcpSessionsForMemberRun -> AgentRunManager run cleanup if active -> registry revoked sessions`
- DS-005: `Server restart clears registry -> old descriptor request -> resolveSession missing_session -> redacted 404; later restore/start -> runtime bootstrapper creates fresh descriptor -> MCP requests succeed`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A new, restored, or resumed owner reaches the runtime backend. The backend/bootstrapper asks `AgentToolMcpSessionService` for a session descriptor in the current process and materializes it into runtime-native config. | Run/team service, manager, runtime backend/bootstrapper, session service, registry, materializer | Runtime backend/bootstrapper plus `AgentToolMcpSessionService` | Tool allowlist resolution, descriptor redaction, runtime-native config shape |
| DS-002 | An external runtime calls the MCP URL with bearer auth. The route validates origin/method/auth shape, registry resolves memory session state, and only a valid session reaches method dispatch. | External runtime, HTTP route/gate, registry, method dispatcher, tool executor | Agent Tools MCP route + registry | JSON-RPC parsing, protocol version negotiation, catalog allowlist |
| DS-003 | A public standalone termination request must go through `AgentRunManager` so accepted termination unregisters the run and revokes all sessions for that run immediately. | API/service, manager, run, session service, registry | `AgentRunManager` | Metadata/history recording in `AgentRunService` after manager termination |
| DS-004 | A mixed team member dispose path revokes member-scoped sessions. If the underlying `AgentRunManager` also unregisters the run and revokes by run ID, the operations are idempotent. | Mixed member handle, agent run manager, session service, registry | `MixedAgentMemberHandle` for member lifecycle; `AgentRunManager` for run lifecycle | Team status cleanup, member event unsubscription |
| DS-005 | Restart drops all in-memory sessions. Old descriptors are rejected because the registry has no matching session. Restored owners get a fresh descriptor through DS-001 before using MCP. | Registry, route, restore path, runtime bootstrapper | Registry for memory validity; restore materializer for fresh descriptor | No durable token storage; no raw token persistence |
| DS-006 | Registry create/resolve/revoke operations are a local state machine over memory entries. There is no time-expiry transition for active sessions. | Registry memory map, session entry | `AgentToolMcpSessionRegistry` | Token hashing/timing-safe compare, owner matching |
| DS-007 | Claude creates a descriptor lazily when a configured turn needs Agent Tools MCP. During one live owner session it reuses the descriptor; after restore/restart a new `ClaudeSession` creates a new state object and therefore a fresh descriptor. | Claude session, descriptor state, session service, materializer | `ClaudeAgentToolsMcpSessionState` within `ClaudeSession` | Tooling option resolution, MCP server config materialization |

## Spine Actors / Main-Line Nodes

- `AgentRunService` / `TeamRunService`: public application services for start/restore/terminate requests.
- `AgentRunManager` / `AgentTeamRunManager`: authoritative active run/team registries and cleanup boundaries.
- Runtime backend/bootstrappers: Codex and Claude creation/restore owners that materialize runtime-native config.
- `AgentToolMcpSessionService`: runtime-facing session creation/revocation/descriptor boundary.
- `AgentToolMcpSessionRegistry`: in-memory session validity and bearer-token authority.
- `AgentToolsMcpRoute` / HTTP gate: transport/session request boundary.
- `MixedAgentMemberHandle`: lazy member run lifecycle owner inside mixed teams.
- `ClaudeAgentToolsMcpSessionState`: bounded live-session descriptor cache for Claude.

## Ownership Map

| Node | Owns |
| --- | --- |
| `AgentRunService` | Public run workflow, metadata/history recording, restore request assembly. It must not own low-level run unregister or MCP cleanup. |
| `AgentRunManager` | Active standalone run registry, terminate/unregister sequencing, sidecar cleanup, run-scoped MCP revocation. |
| `TeamRunService` | Public team workflow and metadata/history recording. |
| `AgentTeamRunManager` | Active team registry and team sidecar cleanup. Member-level MCP cleanup remains in member handles/agent run manager. |
| `CodexThreadBootstrapper` | Codex create/restore runtime config construction, including fresh Agent Tools MCP descriptor materialization. |
| `ClaudeSession` / `ClaudeAgentToolsMcpSessionState` | Claude turn execution and live-session descriptor cache before MCP server config construction. |
| `AgentToolMcpSessionService` | Internal authoritative runtime-facing session API, enabled-tool derivation, descriptor construction, redacted projection, owner revoke APIs. |
| `AgentToolMcpSessionRegistry` | In-memory session entries, token hash validation, owner identity matching, revocation state, memory reset semantics. |
| `AgentToolsMcpRoute` / gate | HTTP/MCP transport checks, bearer extraction, session resolve before dispatch, redacted route denial. |
| `MixedAgentMemberHandle` | Lazy member agent run creation/restore, member dispose/terminate cleanup, member-scoped MCP revocation. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentRunService.terminateAgentRun` | `AgentRunManager` | Public app service also records metadata/history and returns GraphQL-friendly result shape. | Direct run unregister, sidecar cleanup, MCP session cleanup. |
| GraphQL `terminateAgentRun` mutation | `AgentRunService` -> `AgentRunManager` | API transport wrapper. | Session invalidation or tool behavior. |
| GraphQL `restoreAgentRun` / `restoreAgentTeamRun` mutations | `AgentRunService` / `TeamRunService` -> managers/backends | API transport wrapper. | Descriptor persistence or raw token handling. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `DEFAULT_SESSION_TTL_MILLIS` | Active sessions are owner-lifetime, not wall-clock TTL-lifetime. | `revokedAt` + memory presence in registry. | In This Change | Do not replace with a longer TTL. |
| `ttlMillis` on `AgentToolMcpCreateSessionInput` | Runtime callers must not choose active-session expiry. | No active expiry input. | In This Change | Remove fixtures using it. |
| Required `expiresAt` on `AgentToolMcpSession` | Forces old validity model into all consumers. | `createdAt` and `revokedAt`. | In This Change | Do not keep nullable active expiry. |
| `expired` resolve failure reason | No active-session expiry failure exists. | `missing_session`, `revoked`, `token_mismatch`. | In This Change | Route still maps all failed resolves to redacted denial. |
| Expiry check inside `resolveSession(...)` | Incorrectly invalidates active owners. | Token match + not revoked. | In This Change | Add simulated-time test. |
| `purgeExpiredSessions()` | Purges by removed active TTL concept. | Explicit revoke; future owner-aware orphan GC if required. | In This Change | Do not add GC now unless owner-aware. |
| Claude cache field `expiresAt` and refresh branch | Preserves old TTL semantics above registry. | Live descriptor cache scoped to `ClaudeSession` object. | In This Change | New `ClaudeSession` on restore/restart naturally rematerializes. |
| Expiry-focused tests | Assert old behavior. | No-expiry, revoke, restart, and fresh-descriptor tests. | In This Change | Remove not skip. |

## Return Or Event Spine(s) (If Applicable)

- Route denial return spine: `Registry resolve failure -> AgentToolsMcpRoute / gate -> redacted HTTP error -> external runtime`. The returned error must not leak raw token, session ID validity, owner identity, or enabled tools.
- Termination cleanup return spine: `AgentRun.terminate accepted -> AgentRunManager unregister -> session revoke count ignored by public result -> AgentRunService metadata/history success response`. The app service should preserve the existing public success shape while ensuring cleanup has happened.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `AgentToolMcpSessionRegistry`
  - `createSession -> store session with tokenHash/owner/context/enabledTools/createdAt/revokedAt=null -> resolveSession -> check exists -> check revoked -> timing-safe token compare -> return session`
  - Matters because this is the local validity mechanism and must not include time expiry.
- Parent owner: `ClaudeAgentToolsMcpSessionState`
  - `ensureDescriptor -> return cached descriptor if present -> createAgentToolMcpSession -> cache descriptor -> return descriptor or null if no enabled tools`
  - Matters because Claude materializes MCP server config per turn but should not refresh by wall clock during a live owner session.
- Parent owner: `MixedAgentMemberHandle`
  - `ensureReady -> if active return existing run -> restore/create member AgentRun -> backend materializes fresh descriptor -> bind events -> member can use MCP`
  - Matters for team resume semantics after process restart.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Enabled tool allowlist resolution | DS-001, DS-002 | `AgentToolMcpSessionService` / catalog | Resolve configured-and-supported MCP tools. | Keeps tool exposure out of runtime materializers and routes. | Route/backend starts duplicating tool policy. |
| Descriptor redaction | DS-001, DS-002 | `AgentToolMcpSessionService` / session model | Redacted descriptor projection for logs/UI/tests. | Secret descriptors contain bearer tokens and session IDs. | Secret leakage into app-facing surfaces. |
| Runtime-native materialization | DS-001, DS-005, DS-007 | Codex/Claude materializers | Convert generic descriptor to runtime config. | Runtime-specific config shapes differ. | Session service becomes runtime-specific. |
| Metadata/history recording | DS-003 | `AgentRunService` | Persist run status/platform IDs and history catalog entries. | Public workflow responsibility separate from cleanup authority. | Manager becomes persistence-heavy or service bypasses cleanup. |
| Origin/content/protocol checks | DS-002 | HTTP gate/route | Preflight, method, content-type, accept, protocol version. | Transport concern, not session validity. | Registry starts knowing HTTP details. |
| Team status/member event cleanup | DS-004 | Mixed member/team handles | Unsubscribe events, clear overlays, update status. | Member lifecycle concern. | Session service starts owning team behavior. |
| Future orphan GC | DS-005, DS-006 | Future owner-aware cleanup owner | Remove sessions with no active owner if needed. | Memory hygiene only. | Reintroduces TTL as validity authority. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Session validity and bearer auth | Agent Tools MCP session registry | Extend | Existing owner already stores token hashes, sessions, owner identity, and revocation state. | N/A |
| Runtime descriptor creation | Agent Tools MCP session service | Extend | Existing service already derives enabled tools and builds descriptors. | N/A |
| Run-scoped cleanup | `AgentRunManager` | Extend/fix caller | Manager already unregisters runs and revokes MCP sessions by run ID. | N/A |
| Member-scoped cleanup | `MixedAgentMemberHandle` | Reuse | Existing dispose path already revokes by member run ID. | N/A |
| Codex fresh descriptor on restore | `CodexThreadBootstrapper` | Reuse | Restore path already rebuilds thread config and calls session service. | N/A |
| Claude fresh descriptor on restore | `ClaudeSession` / `ClaudeAgentToolsMcpSessionState` | Extend | Restore creates a new `ClaudeSession`; descriptor state can lazily create a fresh descriptor. | N/A |
| Route denial behavior | Agent Tools MCP HTTP gate/routes | Reuse | Current bearer and redacted denial behavior is correct for this ticket. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent Tools MCP Server | Session model, registry, service, route auth/session resolution, method dispatch | DS-001, DS-002, DS-005, DS-006 | Runtime materializers and external MCP clients | Extend | Remove TTL, keep bearer and revocation. |
| Standalone Agent Run Lifecycle | Public termination, manager unregister, restore/create | DS-001, DS-003, DS-005 | `AgentRunManager` | Extend | Fix `AgentRunService` to use manager termination. |
| Codex Runtime Backend | Create/restore thread config and runtime-native MCP config | DS-001, DS-005 | `CodexThreadBootstrapper` | Reuse | Mostly type/test fallout after TTL removal. |
| Claude Runtime Backend | Lazy MCP descriptor per live session and runtime-native server config | DS-001, DS-005, DS-007 | `ClaudeSession` | Extend | Remove expiry cache. |
| Mixed Team Runtime | Lazy member agent create/restore/dispose | DS-004, DS-005 | `MixedAgentMemberHandle` | Reuse | Add/verify coverage for member revoke and restore rematerialization. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-tool-mcp-session.ts` | Agent Tools MCP Server | Session model | Tight session/descriptor/revoke types, no active TTL fields | One shared type owner for session semantics | Yes |
| `agent-tool-mcp-session-registry.ts` | Agent Tools MCP Server | Registry | Memory map, token hash validation, owner matching, revoke | One local state owner | Yes |
| `agent-tool-mcp-session-service.ts` | Agent Tools MCP Server | Runtime-facing internal API | Descriptor creation/redaction and owner revoke APIs | Existing service boundary | Yes |
| `claude-agent-tools-mcp-session-state.ts` | Claude Runtime Backend | Claude live descriptor cache | Ensure one live descriptor per `ClaudeSession` when configured tools require MCP | One Claude-specific cache owner | Yes |
| `agent-run-service.ts` | Standalone Agent Run Lifecycle | Public service | Delegate termination to manager and record metadata/history without bypassing cleanup | Existing public workflow owner | No |
| `agent-run-manager.ts` | Standalone Agent Run Lifecycle | Active run manager | May expose needed platform ID preservation or termination result helper if service needs it | Existing cleanup authority | No |
| Existing tests | Validation | Durable behavior coverage | Replace expiry tests and add owner/restart/resume tests | Tests follow changed behavior | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Session validity model | `agent-tool-mcp-session.ts` + registry methods | Agent Tools MCP Server | Used by service, route, runtime tests | Yes (`expiresAt`, `ttlMillis`) | Yes (no TTL + revoke dual authority) | A kitchen-sink lifecycle DTO with active expiry and revocation both authoritative |
| Owner identity matching | existing registry owner helpers | Agent Tools MCP Server | Revoke by run/member/owner uses same shape | Already tight enough | Yes | Runtime-specific cleanup logic in callers |
| Descriptor redaction | existing `redactAgentToolMcpDescriptor` | Agent Tools MCP Server | Shared secret projection | Yes | Yes | Logging helper that mutates descriptors |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentToolMcpSession` | Yes after change | Yes | Low | Keep `createdAt`, `revokedAt`, owner/sender/context/tool allowlist/token hash; remove `expiresAt`. |
| `AgentToolMcpCreateSessionInput` | Yes after change | Yes | Low | Remove `ttlMillis`; callers provide owner/sender/exposure/context/runtime/observer only. |
| `AgentToolMcpSessionResolveFailureReason` | Yes after change | Yes | Low | Remove `expired`; keep missing/revoked/token mismatch. |
| `AgentToolMcpDescriptor` | Yes | N/A | Low | No change; descriptor remains secret runtime-facing capability. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session.ts` | Agent Tools MCP Server | Session model | Session, descriptor, owner identity, execution context, resolve result, redaction types/helpers without active TTL | Canonical model owner | N/A |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-registry.ts` | Agent Tools MCP Server | Registry | Create/resolve/get/revoke/list/clear memory sessions, hash tokens, owner matching | One local state owner | Session model |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-service.ts` | Agent Tools MCP Server | Runtime-facing service | Create descriptors, derive enabled tools, expose revoke APIs | Boundary for runtime materializers | Registry/catalog/session model |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-http-gate.ts` | Agent Tools MCP Server | HTTP gate | Preserve origin/options/method/auth/session gate behavior | Transport pre-route concern | Registry resolve result |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-routes.ts` | Agent Tools MCP Server | MCP route | Preserve bearer/session resolve before dispatch and protocol handling | Transport + method dispatch boundary | Registry/session model |
| `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-session-state.ts` | Claude Runtime Backend | Live descriptor cache | Cache descriptor for one live `ClaudeSession`, no expiry refresh | Claude-specific bounded cache | Session service/descriptor |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | Standalone Agent Run Lifecycle | Public service | Use manager termination boundary; then record metadata/history from captured active run info | Keeps public workflow but not cleanup bypass | AgentRunManager |
| `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts` | Tests | Session unit coverage | No-expiry, token mismatch, revoke, owner revoke, redaction | Existing focused unit test file | Session registry/service |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | Tests | MCP route integration | Bearer/revoke/no-expiry/restart route behavior | Existing route integration file | Route/registry |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-run-manager.test.ts` | Tests | Run manager cleanup | Accepted termination revokes run sessions | Existing lifecycle unit tests | Session service/registry as needed |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-run-termination-service.test.ts` | Tests | Public termination workflow | Service delegates through manager/no double terminate; cleanup occurs | Existing public service test | AgentRunManager mock |
| Claude/Codex backend tests with `expiresAt` fixtures | Tests | Runtime materialization | Remove required `expiresAt` mock fields; add Claude live-cache test | Existing backend tests | Descriptor/session types |

## Ownership Boundaries

- `AgentToolMcpSessionRegistry` is the authoritative in-memory session state owner. The route must not keep parallel session state, and runtimes must not interpret TTL fields.
- `AgentToolMcpSessionService` is the only runtime-facing descriptor creation/revocation boundary. Runtime bootstrappers should not construct session IDs, bearer tokens, URLs, or allowlists themselves.
- `AgentRunManager` is the authoritative standalone run cleanup boundary. Public services may compose response/metadata behavior around it but must not bypass it for accepted termination.
- `MixedAgentMemberHandle` owns member-level dispose semantics. It may call member-scoped revoke even if run-scoped revoke also occurs; registry revoke is idempotent.
- Runtime materializers own runtime-native config projection only, not session validity or token generation.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentToolMcpSessionService` | Registry create/revoke, token generation, enabled-tool resolution, descriptor URL/header construction | Runtime bootstrappers/materializers | Runtime code hand-builds session URL/token or stores raw tokens for reuse | Add/reshape service methods |
| `AgentToolMcpSessionRegistry.resolveSession` | Memory entry lookup, revoked check, token hash compare | MCP route/gate | Route checks token/session state itself or applies TTL fallback | Extend registry resolve result |
| `AgentRunManager.terminateAgentRun` | Active run terminate, unregister, sidecar cleanup, run MCP revoke | `AgentRunService` public termination | `AgentRunService` calls `activeRun.terminate()` directly and records success | Add helper/result shape that preserves active run info if needed |
| `MixedAgentMemberHandle.dispose` | Member run unbind, member MCP revoke, event unsubscribe/status cleanup | Team manager/member registry | Team registry revokes sessions by guessing member IDs while handle remains active | Expose member lifecycle method on handle |

## Dependency Rules

Allowed:

- Runtime bootstrappers may depend on `AgentToolMcpSessionService` and runtime-specific materializers.
- `AgentToolMcpSessionService` may depend on the registry, catalog, and server base URL resolver.
- MCP routes/gates may depend on the registry and dispatcher.
- `AgentRunManager` may depend on `AgentToolMcpSessionService` for run-scoped cleanup.
- `MixedAgentMemberHandle` may depend on `AgentToolMcpSessionService` for member-scoped cleanup.
- Tests may instantiate registry/service directly for focused coverage.

Forbidden:

- No runtime materializer may create/parse bearer tokens, synthesize session IDs, or persist raw descriptors for restart reuse.
- No active-session TTL check may exist in registry, route, service, Claude cache, or tests.
- `AgentRunService` must not bypass `AgentRunManager` for accepted termination cleanup.
- The route must not dispatch MCP methods before bearer/session resolution.
- Old descriptors must not be accepted after a registry reset by recreating the same session ID without durable token/session validation.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentToolMcpSessionRegistry.createSession(input)` | MCP session | Create in-memory session and raw token once | owner identity + sender/context/exposure/enabled tools | Remove `ttlMillis`. |
| `AgentToolMcpSessionRegistry.resolveSession({ sessionId, bearerToken })` | MCP session | Resolve usable session or failure | session ID + bearer token | No `expired` result. |
| `AgentToolMcpSessionRegistry.revokeSession(sessionId)` | MCP session | Revoke one known session | session ID | Idempotent false when missing/already revoked. |
| `AgentToolMcpSessionRegistry.revokeSessionsForOwner(ownerPartial)` | Owner session group | Revoke matching sessions | explicit owner partial with at least one key | Used by service wrappers. |
| `AgentToolMcpSessionService.createAgentToolMcpSession(input)` | Runtime descriptor | Create session and descriptor | owner/sender/configured exposure/context/runtime | Runtime-facing boundary. |
| `AgentRunManager.terminateAgentRun(runId)` | Standalone run | Terminate/unregister/cleanup | run ID | Public service should use this for cleanup. |
| `AgentRunService.restoreAgentRun(runId)` | Standalone run restore | Restore run and trigger backend descriptor materialization | run ID + persisted metadata | Existing path remains fresh descriptor path. |
| `MixedAgentMemberHandle.ensureReady()` | Team member run | Lazy create/restore member AgentRun | member run context + platform ID | Existing path rematerializes descriptors through AgentRunManager. |
| `ClaudeAgentToolsMcpSessionState.ensureDescriptor(runContext)` | Claude live descriptor | Return/create descriptor for live session | Claude run context | No expiry parameter. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `createAgentToolMcpSession` | Yes | Yes | Low | Keep owner identity explicit. |
| `resolveSession` | Yes | Yes | Low | Remove expiration branch. |
| `revokeSessionsForOwner` | Yes | Yes if candidate non-empty | Low | Keep non-empty guard. |
| `terminateAgentRun` manager | Yes | Yes | Low | Service must call it. |
| `ensureDescriptor` Claude | Yes | Yes | Low | Remove expiry-shaped state. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Agent Tools MCP session | `AgentToolMcpSession` | Yes | Low | Keep. |
| Session registry | `AgentToolMcpSessionRegistry` | Yes | Low | Keep but narrow responsibility. |
| Session service | `AgentToolMcpSessionService` | Yes | Low | Keep. |
| Claude descriptor cache | `ClaudeAgentToolsMcpSessionState` | Mostly yes | Medium because it sounds session-like while storing descriptor | Keep for local scope; ensure file comments/tests clarify it is live descriptor state, not registry session storage. |
| Public run service | `AgentRunService` | Yes | Low | Keep but do not let it own manager cleanup. |

## Applied Patterns (If Any)

- Registry: `AgentToolMcpSessionRegistry` is a process-local registry for bearer capabilities. It owns lookup and token validation, not business tool behavior.
- Adapter/materializer: Codex/Claude MCP materializers translate generic descriptors into runtime-native configuration.
- Manager: `AgentRunManager` owns active run lifecycle and cleanup sequencing.
- Bounded local cache: `ClaudeAgentToolsMcpSessionState` caches a descriptor inside one live `ClaudeSession`.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp/` | Folder | Agent Tools MCP Server | Shared MCP session, route, catalog, method dispatch | Existing capability area | Runtime-specific config files beyond generic descriptor |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session.ts` | File | Session model | Tight owner-lifetime session/descriptor types | Canonical MCP session model | `expiresAt`, `ttlMillis`, durable storage config |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-registry.ts` | File | Registry | Memory state, token hash compare, revoke/owner match | Process-local validity owner | Active TTL, durable restoration, HTTP response logic |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-service.ts` | File | Runtime-facing service | Create/revoke descriptors and redaction | Existing runtime boundary | Runtime-specific materialization details |
| `autobyteus-server-ts/src/agent-execution/backends/codex/agent-tools-mcp/` | Folder | Codex MCP materialization | Codex config projection | Runtime-specific concern | Session validity/token generation |
| `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/` | Folder | Claude MCP materialization/cache | Claude config projection and descriptor state | Runtime-specific concern | Registry state or TTL validity |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | File | Public standalone run service | Public termination/restore workflow, metadata/history | Existing application service | Direct cleanup bypass of manager |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | File | Active run manager | Authoritative terminate/unregister/cleanup | Existing lifecycle owner | Metadata/history persistence |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/` | Folder | Mixed member lifecycle | Lazy member create/restore/dispose | Existing member owner | Session registry internals |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-tools/mcp/` | Mixed Justified | Yes | Low | This capability area already groups route, session, catalog, dispatch for one MCP server subject. |
| `agent-execution/services/` | Main-Line Domain-Control | Yes | Low | Existing run service/manager split remains; fix boundary bypass. |
| `agent-execution/backends/codex/agent-tools-mcp/` | Off-Spine Concern | Yes | Low | Runtime-native materialization only. |
| `agent-execution/backends/claude/agent-tools-mcp/` | Off-Spine Concern | Yes | Low | Runtime-native materialization/cache only. |
| `agent-team-execution/backends/mixed/members/` | Main-Line Domain-Control | Yes | Low | Member lifecycle owner already lives here. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Active session validity | `resolveSession -> exists -> not revoked -> token matches -> ok` | `resolveSession -> exists -> not revoked -> not expired -> token matches` | Makes owner-lifetime semantics concrete. |
| Restart/resume | `server restarts -> old descriptor 404 -> restore run -> backend creates fresh descriptor -> MCP works` | `server restarts -> recreate same sessionId without token/session context -> old descriptor works` | Avoids unsafe pseudo-restoration. |
| Standalone termination | `AgentRunService -> AgentRunManager.terminateAgentRun -> unregister -> revoke sessions -> record history` | `AgentRunService -> activeRun.terminate -> record history; manager cleanup later` | Shows authoritative boundary fix. |
| Claude live cache | `if liveDescriptor exists return it; else create and cache` | `if expiresAt > now return; else refresh` | Prevents hidden TTL compatibility. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `expiresAt` nullable but ignore it | Minimizes TypeScript fallout | Rejected | Remove active expiry field entirely so tests/callers cannot depend on it. |
| Keep `ttlMillis` accepted but unused | Avoids caller changes | Rejected | Remove from input type and update fixtures. |
| Increase default TTL beyond 12 hours | Quick fix for long runs | Rejected | No fixed active-session TTL. |
| Refresh descriptor automatically before expiry | Existing Claude pattern | Rejected | Cache descriptor per live owner session; rematerialize only on owner start/restore/restart. |
| Persist old bearer descriptors across server restart | Could let stale external clients keep working | Rejected for this ticket | Fresh descriptor materialization on restore/resume. Durable sessions require a separate security/lifecycle design. |
| Route fallback that accepts old session ID after missing registry entry | Could make old descriptors appear to survive restart | Rejected | Missing registry entry remains redacted session unavailable. |

## Derived Layering (If Useful)

- Transport layer: `agent-tools-mcp-http-gate.ts`, `agent-tools-mcp-routes.ts`.
- Session capability layer: `agent-tool-mcp-session.ts`, `agent-tool-mcp-session-registry.ts`, `agent-tool-mcp-session-service.ts`.
- Runtime materialization layer: Codex/Claude `agent-tools-mcp` materializers and Claude descriptor state.
- Owner lifecycle layer: `AgentRunManager`, `AgentRunService`, `MixedAgentMemberHandle`, team restore paths.

Layering is descriptive only; dependency rules follow ownership boundaries above.

## Migration / Refactor Sequence

1. Tighten the Agent Tools MCP session type:
   - remove `expiresAt` from `AgentToolMcpSession`;
   - remove `ttlMillis` from `AgentToolMcpCreateSessionInput`;
   - remove `expired` from `AgentToolMcpSessionResolveFailureReason`.
2. Update `AgentToolMcpSessionRegistry`:
   - remove default TTL constant and normalizer;
   - create sessions with `createdAt` and `revokedAt: null` only;
   - remove expiry branch from `resolveSession(...)`;
   - remove `purgeExpiredSessions()`.
3. Update `AgentToolMcpSessionService` only for type fallout; keep descriptor and revoke APIs stable.
4. Update route/gate only for type fallout. Preserve HTTP behavior.
5. Update Claude descriptor state:
   - remove `expiresAt` from `LiveClaudeAgentToolsMcpDescriptor`;
   - return cached descriptor whenever present;
   - create a fresh descriptor only when no live descriptor exists in this `ClaudeSession`.
6. Fix standalone termination boundary:
   - change `AgentRunService.terminateAgentRun(...)` to invoke `AgentRunManager.terminateAgentRun(runId)` for accepted termination cleanup.
   - preserve existing metadata/history behavior by capturing needed `activeRun` data before manager termination or by adding a narrow manager return helper if needed.
   - avoid double-calling `activeRun.terminate()`.
7. Verify existing restore/start paths:
   - Codex restore already calls `CodexThreadBootstrapper.bootstrapForRestore(...)` and creates fresh descriptor; update tests to assert this where practical.
   - Claude restore creates a new `ClaudeSession`; first configured turn creates fresh descriptor; update tests to assert this where practical.
   - Mixed member restore/lazy `ensureReady()` reaches `AgentRunManager.restoreAgentRunFromPlatformState(...)`; add/adjust tests if existing coverage is missing.
8. Update tests:
   - session service/registry: no time expiry after >12h; token mismatch; explicit revoke; owner revoke; redaction.
   - route integration: missing/wrong bearer, revoked session, old descriptor after fresh registry reset, no tool dispatch on auth/session failure.
   - run lifecycle: public termination triggers run-scoped revoke through manager cleanup; no double termination.
   - team/member lifecycle: member dispose revokes member sessions and is idempotent with run revoke.
   - runtime materialization: Claude no expiry refresh within live session; restored/new session creates descriptor; Codex restore materializes descriptor without `expiresAt` fixtures.
9. Remove all remaining in-scope references to `ttlMillis`, MCP `expiresAt`, `expired` failure reason, and `purgeExpiredSessions`.
10. Run focused tests once dependency setup is available. If `pnpm exec vitest` still fails with missing `vitest`, resolve dependency installation or document the environment blocker.

## Key Tradeoffs

- Fresh descriptor on restart/resume is safer and smaller than durable session restoration. It avoids persisting bearer token hashes and owner session state.
- Removing TTL may leave abandoned sessions in memory until explicit cleanup or process restart. This is acceptable for this ticket because active-owner correctness is more important, and owner cleanup paths are strengthened. Owner-aware orphan GC can be designed separately if memory pressure appears.
- Public termination through `AgentRunManager` centralizes cleanup but requires `AgentRunService` to preserve metadata/history behavior without directly calling `activeRun.terminate()`.
- Claude live descriptor caching avoids repeated descriptor creation across turns but still naturally creates a fresh descriptor after restart/restore because a new `ClaudeSession` owns a new cache object.

## Risks

- Test dependency setup is currently blocked (`vitest` not found via `pnpm -C autobyteus-server-ts exec vitest ...`). Implementation must resolve before using test results as evidence.
- If any external runtime persists an old descriptor and expects it to survive a server restart without reconfiguration, that runtime will still fail under Option A. This is intentional; resume/restart must rematerialize a fresh descriptor.
- If `AgentRunService` cannot preserve metadata update semantics through `AgentRunManager.terminateAgentRun(...)`, implementation may need a narrow manager API that returns termination result plus platform ID, but it must still keep manager cleanup authoritative.
- Passive inactive runs that are never looked up may retain sessions in memory until process restart; do not solve this by reintroducing TTL.

## Guidance For Implementation

- Prefer direct removal over compatibility shims. If TypeScript errors appear around `expiresAt`, update the caller/test to no longer model active expiry.
- Keep the descriptor type unchanged unless a type fallout requires comments; descriptors are still secret and bearer-protected.
- Do not persist raw descriptors or bearer token hashes in run/team metadata for this ticket.
- Preserve route status behavior unless tests prove a type-level update is needed: missing bearer `401`, unresolved session `404 session_unavailable`, invalid origin `403`, unsupported authenticated methods `405`.
- For public termination, avoid this bad shape:
  - `const activeRun = manager.getActiveRun(id); await activeRun.terminate(); ...`
- Prefer this shape:
  - `const activeRun = manager.getActiveRun(id); capture runtimeKind/platformId accessors; const accepted = await manager.terminateAgentRun(id); if accepted record metadata/history using captured info;`
- Add tests before or alongside implementation where they clarify removed TTL semantics.
- After code changes, search for in-scope leftovers with:
  - `rg -n "ttlMillis|purgeExpiredSessions|DEFAULT_SESSION_TTL_MILLIS|reason: \"expired\"|expiresAt" autobyteus-server-ts/src/agent-tools/mcp autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp autobyteus-server-ts/tests/unit/agent-tools/mcp autobyteus-server-ts/tests/integration/agent-tools/mcp autobyteus-server-ts/tests/unit/agent-execution/backends/claude autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend`
