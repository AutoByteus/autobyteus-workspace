# Design Spec

## Current-State Read

The pre-ticket production baseline generated a random Agent Tools session ID/bearer per activation and retained revoked tombstones. An already-loaded Codex thread could retain the earlier endpoint longer than that activation, so restore activated a different endpoint from the one Codex called. Codex and Claude shared the old issuer while keeping provider-local timing.

IR-001 already implements the passed SR-003 replacement: deterministic identity, headerless provider convergence, an active-only registry, and one process-local loopback listener. The current defect is now the supported Team termination bypass described below; the original random/bearer behavior remains removal inventory, not the current IR-001 behavior.

The final user-approved contract supersedes SR-001 and resolves ARCH-F-002:

- one deterministic, non-secret Agent Tools routing identity per immutable AutoByteus run;
- one provider-independent active-only run-session lifecycle for Codex and Claude;
- no internal Agent Tools bearer, token hash/header, persistent binding, vault, sidecar, sync, or deletion machinery;
- exactly one process-wide Agent Tools HTTP listener bound to `127.0.0.1` on an OS-assigned port and shared by every run;
- Agent Tools absent from the requested main listener, plus loopback-only peer/Host/Origin admission on the dedicated listener;
- unchanged requested main bind and generic internal-server base contract;
- external /mcp/gateway behavior remains independent and unchanged.

SR-003 passed architecture review as ARCH-REV-004 and is present as uncommitted IR-001 source/test changes. CRR-001 then established CR-MP-001: the supported Team-row stop prepares and finishes each member by calling `AgentRun` directly, while published-run removal and `AgentRunResourceManager.release` exist only behind `AgentRunManager`/`AgentRunActivationRegistry`. IR-001 removed the former Mixed-member Agent Tools cleanup without replacing that bypass, so the deterministic live record survives a successful Team stop. SR-004 is a bounded ownership correction against IR-001, not a greenfield replay. The superseded SR-001 binding/envelope machinery remains absent and prohibited.

## Intended Change

Retain IR-001's Agent Tools-owned pure function that maps canonical run ID to a fixed-length run-session ID:

normalized run ID -> SHA-256 UTF-8 digest -> unpadded base64url -> agtrun_ prefix.

`activateForRun` builds current live exposure/capabilities/routes, registers an active AgentToolMcpSession under that derived ID, and returns a headerless descriptor. Both Codex and Claude use this exact activation boundary. Deactivation deletes the registry record; the stable ID is recomputed on future activation and is never persisted.

`AgentToolsMcpHost` owns one dedicated local Fastify server. Application-host startup binds it to `127.0.0.1:0`, verifies the assigned port, and makes that base URL available before run recovery. Agent Tools is removed from both main Studio/standalone listeners. The requested main bind and `AUTOBYTEUS_INTERNAL_SERVER_BASE_URL` behavior remain unchanged.

The Agent Tools route removes bearer handling. Its local access gate requires both the actual socket peer and Host header to be loopback, while preserving current loopback Origin policy. Only then may the route resolve an active run-session ID and dispatch. The local-server base is immutable until application shutdown; startup fails closed if it cannot listen, and it never independently rebinds while cached provider clients may survive.

For every published AgentRun, `AgentRunManager` becomes the single reversible prepare / committed finalization owner. It delegates quiescence and provider termination to the exact `AgentRun`, but accepted completion is not returned until the exact current registration is removed and `AgentRunResourceManager.release` has deactivated the exact run session and detached resources. `MixedAgentMemberHandle` calls this manager boundary instead of `AgentRun.prepareTermination` directly. Cancellation and rejected finish leave the run/session/resources active. Generic partial-owner deactivation APIs are removed; normal cleanup is exact-run only and scope close is exact-session iteration.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-003, REQ-006 / AC-001–AC-004, AC-013 | Stop team row, then send follow-up | Exact product repro, CR-MP-001, and investigation BEH-001 | Committed accepted member stop removes exact live resources before Team success; same run/thread later restores the same endpoint with fresh context | DS-001, DS-002, DS-004, DS-008 |
| BEH-002 | System | REQ-002 / AC-002, AC-009 | Codex bootstrap or Claude tooling needs Agent Tools | Provider code and investigation BEH-002 | Both use one activateForRun contract and headerless descriptor | DS-001 |
| BEH-003 | User | REQ-006 / AC-001, AC-003 | Update inactive model settings then restore | Product repro and investigation BEH-003 | Fast/service-tier remains applied | DS-001 |
| BEH-004 | Contract | REQ-003–REQ-005, REQ-009–REQ-010 / AC-004–AC-006, AC-011–AC-013 | HTTP request to Agent Tools before/after Team stop | Route/listener/local trust evidence plus CR-MP-001 | Dedicated loopback admission; exact route remains active on cancel/reject and becomes inactive 404 before accepted Team stop returns | DS-002, DS-004, DS-007, DS-008 |
| BEH-005 | Operational | REQ-001, REQ-003, REQ-007, REQ-010 / AC-004, AC-007, AC-012–AC-013 | Repeated direct/Team stop and application restart | Registry/resource/Team source and investigation BEH-005 | Every accepted published-run finish removes/releases once; one listener per process; empty restart; pure route recomputation | DS-002, DS-003, DS-007, DS-008 |
| BEH-006 | Operational | REQ-005, REQ-007 / AC-007, AC-008 | Existing history/sync/delete | Investigation persistence evidence | No Agent Tools persisted data or storage change | DS-003 |
| BEH-007 | Contract | REQ-001–REQ-005 / AC-002, AC-004–AC-006, AC-013 | Supported run activation, termination, and local call | ARCH-F-001, immutable/exclusive run identity, and CR-MP-001 | Stable routing ID is non-secret; live session ends only at authoritative exact-run finalization | DS-001, DS-002, DS-004, DS-006, DS-008 |
| BEH-008 | User / external | REQ-008 / AC-010 | External client uses Settings > MCP Gateway config | Gateway screenshot/source and ARCH-MP-005 | Gateway endpoint/token/access/catalog/dispatch remain unchanged | DS-005 |
| BEH-009 | Operational | REQ-004, REQ-008, REQ-010 / AC-006, AC-010–AC-012 | Launch Studio/standalone on a specific non-loopback host | ARCH-MP-007, startup/config source, user approval | Exact main bind remains; one separate `127.0.0.1:0` Agent Tools listener serves all runs; main has no Agent Tools route | DS-007, DS-001, DS-004 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status / Approval |
| --- | --- | --- | --- | --- |
| /Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/evidence/session-unavailable-after-team-resume.png | Original failure | BEH-001, BEH-004 | Observable defect | Evidence / N/A |
| /Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/evidence/codex-app-server-mcp-rebind-probe.md | Same-process causal probe | BEH-001, BEH-002 | Proves stable endpoint requirement; conclusion revised | Evidence / N/A |
| /Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/evidence/full-product-software-team-reproduction.md | Exact product journey | BEH-001–BEH-005 | End-to-end regression scenario | Evidence / N/A |
| /Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/evidence/full-product-software-team-session-unavailable.png | Repro screenshot | BEH-001, BEH-004 | Visual corroboration | Evidence / N/A |
| /Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/evidence/external-mcp-gateway-settings.png | Gateway UX/optional token | BEH-008 | Preserved external contract evidence | Evidence / N/A |
| /Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/design-review-report.md | Architecture review through ARCH-REV-004 | All | Prior pass and acceptance authority | Current review / N/A |
| /Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/architecture-review-revision-record.md | Review history through ARCH-REV-004 | All | Architecture history | Current / N/A |
| /Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/code-review-report.md | CRR-001 / CR-MP-001 / CR-F-001 / CR-F-002 | BEH-001, BEH-004, BEH-005, BEH-007 | Triggering downstream design-impact authority | Current review / N/A |
| /Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-resume/tickets/in-progress/agent-tools-mcp-session-resume/code-review-revision-record.md | CRR-001 reroute history | BEH-001, BEH-004, BEH-005, BEH-007 | Review history | Current / N/A |

## Task Design Health Assessment (Mandatory)

- Change posture: Bug Fix plus simplification/refactor.
- Current design issue found: Yes.
- Root cause classification: Missing Invariant and Boundary Or Ownership Issue.
- Refactor needed now: Yes.
- Evidence: activation-random routing identity expires before a loaded provider MCP client; the main base has independent bind semantics; and CR-MP-001 proves Mixed Team activation depends on `AgentRunManager` but termination bypasses it, leaving published-run resources/live Agent Tools state attached.
- Design response: retain stable routing, active-only execution, universal provider lifecycle, and the owned loopback transport; strengthen `AgentRunManager` into the single published-run prepared-termination/finalization boundary and remove the Mixed direct-run bypass plus unused partial-owner deactivation.
- Refactor rationale: this fixes the lifecycle/ownership invariant without restoring duplicated Team-local Agent Tools policy. `AgentRun` remains the owner of reversible quiescence/provider stop; manager/activation registry/resource manager remain the owner chain for publication removal and resource release.
- Intentional deferrals/residual risk: trusted local processes may call an active endpoint; general loaded-thread tool-topology refresh is outside scope.

## Terminology

- **Run-session ID:** deterministic, non-secret Agent Tools route identity derived from AutoByteus run ID.
- **Active run session:** current in-memory execution/authorization context registered under that ID.
- **Local admission:** actual loopback socket peer plus loopback Host and valid loopback/absent Origin.
- **Agent Tools local server:** one Fastify/HTTP listener bound to `127.0.0.1:0` per AutoByteus application-server process and shared by all runs.
- **Main listener:** the existing Studio/standalone Fastify listener bound exactly as requested; it no longer hosts Agent Tools.
- **Managed published-run termination:** a manager-owned wrapper around exact `AgentRun` quiescence/finish that performs exact-current removal and resource release before accepted completion.
- **External gateway:** separate /mcp/gateway product surface, never a run session.

## Legacy Removal Policy (Mandatory)

- Policy: No backward compatibility; remove legacy code paths.
- Remove current Agent Tools random session/token generation, tokenHash, revokedAt, timing-safe token resolution, Authorization parsing/requirement, descriptor headers, redacted descriptor types/functions, and revoke tombstones.
- Replace revoke naming with deactivate because stable identity remains derivable while live state is removed.
- Keep every superseded SR-001 implementation element absent: codex-binding folder, internal secret envelope type/crypto/service additions, vault injection, protected memory-sync path, sidecar store/state machine, Codex prepared binding context/commit/abort, and provider-specific persistent/ephemeral interfaces. If any such edit reappears during implementation replay, remove it rather than adapting it.
- Do not retain an Agent Tools bearer-aware route or header materializer as compatibility behavior. A server deployment restarts provider processes and current configuration is regenerated.
- Remove Agent Tools route registration from the Studio and standalone main-server compositions. Do not retain dual main/local registration as compatibility behavior.
- Remove Agent Tools dependency on `getInternalServerBaseUrlOrThrow`; the generic internal-base contract remains unchanged for managed messaging.
- Remove the Mixed-member direct `AgentRun.prepareTermination` bypass and the unused generic partial-owner Agent Tools deactivation API; do not keep aliases or a Team-local cleanup fallback.
- Preserve the external gateway bearer exactly; it is a separate current contract, not legacy Agent Tools behavior.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject/location/volume: existing run/team metadata, provider conversation IDs/rollouts, config, and messages; no Agent Tools endpoint record.
- Relevant change: pure runtime derivation and active in-memory model only.
- Normal reader/writer evidence: run ID is already available before provider construction and persists unchanged.
- Required semantics: existing/imported histories recompute the same ID; no write is needed.
- Physical/privacy/operational constraints: no credential, sidecar, DB row, vault entry, sync rule, deletion hook, or schema field.
- Decision: Not Affected.
- Rationale: no data shape changes. Migration would create state for a pure function and is prohibited.
- Supported criteria: REQ-001, REQ-005–REQ-008, REQ-010 / AC-002, AC-007, AC-008, AC-011, AC-012.

No Migration Plan applies.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior IDs | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001–BEH-003, BEH-007, BEH-009 | Run create/restore activation after local-server readiness | Provider configured with active stable local endpoint | Scoped Agent Tools run-session authority | Universal provider activation |
| DS-002 | Primary End-to-End | BEH-001, BEH-004, BEH-005, BEH-007 | Direct/Team/stop-all termination of a published AgentRun | Accepted exact run removed/resources released before success, or active state preserved on cancel/reject | AgentRunManager + activation/resource lifecycle | Full termination, cancellation fidelity, bounded state |
| DS-003 | Primary End-to-End | BEH-005, BEH-006, BEH-009 | Application restart then saved-run restore | New local listener plus same derived route active without stored Agent Tools state | Application host + run/session authority | No-persistence restart |
| DS-004 | Return-Event | BEH-001, BEH-004, BEH-007 | Local provider HTTP request | Tool result or redacted denial | Agent Tools local gate + active registry/dispatcher | Tokenless trust and availability |
| DS-005 | Primary End-to-End | BEH-008 | External client gateway request | Gateway tool result/access denial | External MCP Gateway | Preserved independent product path |
| DS-006 | Bounded Local | BEH-007 | activateForRun input | active/not_exposed result or compensated failure | Scoped run-session authority | Deterministic identity and active insertion |
| DS-007 | Primary End-to-End | BEH-004, BEH-005, BEH-009 | Studio/standalone application-host startup | One ready local listener and unchanged ready main listener, or complete startup failure | Application-host composition + AgentToolsMcpHost | Local transport ownership and main-bind independence |
| DS-008 | Bounded Local | BEH-001, BEH-004, BEH-005, BEH-007 | Exact published AgentRun termination preparation | Cancel/no mutation, reject/retry, or accepted exact-current removal and cleanup assertion | AgentRunManager | Manager/member two-phase finalization invariant |

## Primary Execution Spine(s)

- **DS-001 activation:** ready Agent Tools local server -> supported run create/restore -> AgentRunManager/provider factory -> Codex bootstrap or Claude session tooling -> scoped Agent Tools activateForRun -> session service/active registry -> headerless local provider MCP config.
- **DS-002 Team stop:** Team row -> TeamRunService -> AgentTeamRunManager -> RootTeamRun frozen termination -> TeamRun/MixedTeamManager -> MixedAgentMemberHandle -> AgentRunManager.prepareAgentRunTermination(exact run) -> AgentRun reversible prepare -> committed runtime finish -> exact-current activation removal -> AgentRunResourceManager.release -> exact deactivateForRun -> active registry deletion -> handle disposal -> Team success/unregister. Direct `terminateAgentRun` and `stopAllAgentRuns` enter the same managed published-run finalizer. Candidate abort remains a separate unpublished-run cleanup path.
- **DS-003 restart:** process starts with empty registry -> creates a new process-local listener/port -> saved run history supplies run ID -> same pure run-session derivation -> fresh live activation -> new provider process receives new base plus same route.
- **DS-005 external gateway:** Settings-provided gateway config -> /mcp/gateway -> McpGatewayAccessGate -> gateway dispatcher/catalog/executor -> external MCP response.
- **DS-007 application host:** resolve requested main bind -> build main app without Agent Tools -> build one AgentToolsMcpHost/local server -> application prepare -> bind local `127.0.0.1:0` and verify base -> bind main exactly as requested -> seed generic main internal base -> recover runs -> on failure/shutdown close both and resources once.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Each provider presents the same run activation input after the local server is ready. Authority resolves current tools/capabilities, derives ID from owner run ID, inserts one active record, records it in scope, and returns a headerless URL using the immutable process-local base. Provider only maps descriptor syntax. | run, active run session, local endpoint, provider config | scoped authority | tool catalog, local-server readiness |
| DS-002 | Team/direct/stop-all callers obtain a manager-owned prepared termination for the exact published run. Cancel changes no resource state. Committed accepted finish removes the exact current registration, releases resources/deactivates, and only then returns accepted; rejected finish keeps it active/retryable. | Team run, member handle, published AgentRun, activation record, resources, active session | AgentRunManager + activation/resource lifecycle | exact identity guard, cleanup error propagation |
| DS-003 | Nothing is preloaded or persisted. A complete host restart creates a fresh local listener/base and provider process, reads normal history, recomputes the same run route, and activates current live context. | local server, saved run identity, active run session | application host + scoped authority | provider history/config |
| DS-004 | The request reaches only the loopback-bound server. Route gate still verifies actual local peer/Host/Origin first. Active lookup by non-secret ID then determines availability; dispatcher uses current live record. | local request, admission, active session, tool result | Agent Tools local HTTP boundary | protocol/content helpers, redaction |
| DS-005 | Gateway continues its own access decision and MCP-origin tool path without AgentRun participation. | gateway request, access decision, gateway tool | McpGatewayAccessGate/gateway dispatcher | optional configured token |
| DS-006 | Derivation is deterministic; zero tools yields not_exposed; active insertion and ledger admission form one synchronous compensated operation. | run ID, derived ID, live session | scoped authority | collision/duplicate failure |
| DS-007 | One host-owned local server binds `127.0.0.1:0` before recovery and publishes its verified base only after listen. The main listener preserves the requested bind and omits Agent Tools. Any startup failure unwinds both; shutdown stops runs/provider clients before closing the local server and main/process resources once. | application host, main listener, Agent Tools local server | Studio/standalone composition | Fastify logging, address validation, cleanup aggregation |
| DS-008 | Manager verifies the exact published instance is current, delegates reversible preparation to that AgentRun, and returns a wrapped prepared capability. Cancel delegates only. Commit returns a stable wrapper whose finish coalesces an in-flight attempt; rejection clears the attempt for retry without cleanup; accepted inactivity triggers exact-current removal/resource release and caches completion; identity mismatch or cleanup error is terminal failure and never touches a replacement run. | exact AgentRun, prepared termination, activation entry, resource record | AgentRunManager | retry/coalescing, removal diagnostics |

## Spine Actors / Main-Line Nodes

- Team/standalone run lifecycle
- AgentRunManager, AgentRun, AgentRunActivationRegistry, and AgentRunResourceManager
- MixedAgentMemberHandle as Team-to-AgentRun lifecycle adapter
- Studio/standalone application-host lifecycle
- AgentToolsMcpHost and AgentToolsMcpLocalServer
- Agent provider factory
- Codex bootstrap and Claude Agent Tools session state
- Scoped Agent Tools run-session authority
- AgentToolMcpSessionService
- active AgentToolMcpSessionRegistry
- Agent Tools local access gate/route/dispatcher
- External MCP Gateway boundary

## Ownership Map

- **Team lifecycle:** owns root/member prepare/commit ordering, cancellation propagation, and Team success; it delegates published AgentRun lifecycle finalization to AgentRunManager.
- **AgentRun:** owns input quiescence, cancel/reopen, provider/backend termination, and local lifecycle transition. It does not own removal from the published activation registry or attached-resource release.
- **AgentRunManager:** owns published-run activation and the managed exact-instance prepared-termination wrapper used by Team, direct, and stop-all paths. It is the only published-run finalization entrypoint.
- **AgentRunActivationRegistry:** owns exact-current published registration removal and invokes resource release.
- **AgentRunResourceManager:** owns exact-run session deactivation plus file/artifact/memory detach once the published run is removed.
- **MixedAgentMemberHandle:** adapts Team two-phase termination to the manager boundary and disposes local handle state only after accepted managed finish; it owns no Agent Tools cleanup policy.
- **Application-host composition:** owns ordering and compensation across application prepare/recovery, the requested main listener, the Agent Tools local server, and process-resource shutdown.
- **AgentToolsMcpHost:** owns one local server plus registry/catalog/dispatcher/session-authority composition; it exposes process-level listen/readiness/close, not raw route dependencies to main compositions.
- **AgentToolsMcpLocalServer:** owns Fastify construction, route registration, `127.0.0.1:0` bind, verified immutable base URL, and idempotent async close.
- **Scoped Agent Tools authority:** authoritative run-session activation/deactivation boundary, readiness, scope ledger, compensation.
- **Session service:** owns current tool exposure, execution capabilities, live session construction, descriptor construction.
- **Run-session ID function:** owns canonical deterministic route identity algorithm only.
- **Active registry:** owns active map, duplicate rejection, lookup, deletion.
- **Provider adapters:** own activation timing and provider config syntax; never identity/auth policy.
- **Local access gate:** owns peer+Host+Origin trust decision.
- **Agent Tools route/dispatcher:** owns MCP transport and live dispatch after admission.
- **External gateway:** owns its route/access/catalog/dispatch independently.

AgentToolsMcpHost is the authoritative Agent Tools process capability: it owns the one local server and the registry/catalog/dispatcher/authority assembly. It is no longer only a thin route-dependency facade.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Governing Owner | Why It Exists | Must Not Own |
| --- | --- | --- | --- |
| AgentToolsMcpHost | local server + scoped authority + route mechanisms | One process capability for listen/readiness/session authority/close | run ID persistence, secret vault, main bind policy |
| AgentProviderFactoryBuilder | provider adapters | Supply the same activator to both providers | endpoint identity policy |
| MixedAgentMemberHandle | AgentRunManager managed termination | Adapt Team prepared termination/cancel/commit/result to the exact published AgentRun | direct registry/resource/session cleanup or direct AgentRun preparation |
| Agent Tools route | local gate + registry/dispatcher | HTTP entry | provider activation or gateway access |
| Gateway route | gateway access/dispatcher | External entry | Agent Tools run registry |
| Studio/standalone main server builder | application-host composition | Build public/main routes and return main app | Agent Tools route registration or local port policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why | Replacement | Scope | Notes |
| --- | --- | --- | --- | --- |
| Agent Tools capability token generation/hash/compare | Local trust replaces internal bearer; random credential breaks stable descriptor | local gate + active run ID lookup | In This Change | External gateway token untouched |
| revokedAt and retained revoked sessions | Inactive records must not consume registry state | deletion on deactivate | In This Change | Missing yields same redacted 404 |
| RedactedAgentToolMcpDescriptor and redact helper | Descriptor has no secret | normal descriptor | In This Change | Run-session ID is non-secret |
| headers field and provider http_headers/headers | No Agent Tools Authorization | headerless config | In This Change | Remove authorization CORS allowance |
| issue/revoke terminology | Wrong lifecycle semantics | activate/deactivate | In This Change | Clean-cut callers/tests |
| Agent Tools registration on Studio/standalone main Fastify instances | Main bind may be remotely reachable or non-loopback-only | one AgentToolsMcpHost-owned local server | In This Change | Main-shaped Agent Tools paths must not dispatch |
| Agent Tools use of getInternalServerBaseUrlOrThrow | Generic base legitimately follows the main listener | host-owned ready local base provider | In This Change | Managed messaging keeps generic contract unchanged |
| AgentToolMcpSessionService singleton/getAgentToolMcpSessionIssuer provider defaults | They bypass the host-owned listener/readiness boundary | required scoped activator injection from process composition | In This Change | Tests use explicit host/activator fixtures |
| codex-binding folder and persistent binding types/store/service | SR-001 superseded | pure run ID derivation | Prohibited / Confirm Absent | Final audit confirms absent |
| internal-secret-envelope and Agent Tools vault extensions | No durable secret | none | Prohibited / Confirm Absent | Final audit confirms absent |
| memory-sync protected sidecar changes | No sidecar | existing sync policy | Prohibited / Confirm Absent | Final audit confirms absent |
| Codex prepared binding context/commit/abort | No persistence transaction | normal bootstrap activation/failed-run deactivation | Prohibited / Confirm Absent | Keep ordinary thread cleanup |
| Codex persistent vs Claude ephemeral interfaces | Unified policy approved | one run-session activator | Prohibited / Confirm Absent | Provider timing can differ |
| MixedAgentMemberHandle direct `AgentRun.prepareTermination`/finish bypass | It activates through AgentRunManager but bypasses manager-owned removal/resource release on stop | `AgentRunManager.prepareAgentRunTermination(exactRun)` | In This Change | Handle disposes only after managed accepted finish; no Agent Tools dependency |
| AgentToolMcpRunSessionDeactivator.deactivateForOwner and scoped partial-owner matcher | No supported caller; weak generic selector duplicates exact-run policy | exact `deactivateForRun`; exact session-ID iteration on scoped close | In This Change | Remove interface member, forwarders, predicate/matching helpers |
| AgentToolMcpSessionRegistry.deactivateSessionsForOwner / owner matcher | Unused and outside exact-run active-only contract | `deactivateSession(sessionId)` under exact authority ledger | In This Change | CR-F-002 |
| any external gateway change | Not part of replacement | current gateway | N/A | Production files stay functionally unchanged |

## Return Or Event Spine(s) (If Applicable)

**DS-004 success:** local provider -> tokenless POST to dedicated `127.0.0.1:<assigned-port>` stable route -> local gate -> registry.resolveSession(runSessionId) -> dispatcher/current routes -> MCP result -> provider/agent/team effect.

**DS-004 denial order:** non-local peer/Host/Origin -> generic 403 without registry lookup; local unknown/inactive ID -> redacted 404 session_unavailable; local active but invalid method/protocol/content -> existing transport error.

## Bounded Local / Internal Spines (If Applicable)

### DS-006 — synchronous activation

Parent: scoped run-session authority.

normalized run ID -> derive run-session ID -> resolve exposure -> if zero tools return not_exposed -> build live session -> registry insert (duplicate fails) -> ledger record -> return active descriptor.

If ledger admission fails, delete the inserted record and rethrow. There is no async state, secret, file, or provider-thread transaction.

### DS-007 — local-server lifecycle mechanism

Parent: Studio/standalone application-host startup.

`AgentToolsMcpLocalServer` has a strict `created -> starting -> listening -> closing -> closed` lifecycle. `listen()` is one-shot; a second call in any non-created state fails, preventing accidental duplicate sockets. It registers Agent Tools routes on its private Fastify instance, binds `127.0.0.1:0`, validates the returned TCP `AddressInfo`, freezes the resulting base URL, and only then enters `listening`. `requireBaseUrl()` succeeds only in `listening`. `close()` is async/idempotent, awaits an in-progress start when necessary, closes the private Fastify instance if created, clears readiness, and reaches `closed`. There is no restart/rebind method.

The application host is the compensation owner: local-listen failure closes the unlistened main Fastify composition and all process resources; main-listen or recovery failure closes the main instance whose close hook stops runtime/resources and the Agent Tools host. Normal shutdown first stops application/general runs and releases provider clients, then closes the Agent Tools host/local listener, then finishes process resources. The existing nested finally/aggregate cleanup style preserves later cleanup after an earlier failure.

### DS-008 — managed published-run termination

Parent: AgentRunManager.

`prepareAgentRunTermination(expectedRun)` first requires `activationRegistry.getActiveRun(expectedRun.runId) === expectedRun`. It then obtains the exact run's `PreparedAgentRunTermination` and wraps it without exposing activation-registry/resource internals to Team code.

- `cancel()` delegates to the run preparation, reopens input through the existing AgentRun behavior, and performs no activation/session/resource mutation.
- `commit()` is one-way and returns one stable committed wrapper.
- `finish()` coalesces concurrent calls for the current attempt. If the underlying result is rejected, it performs no removal and clears only the attempt so the existing Team retry can call again.
- On accepted completion, the manager requires the exact run to be inactive, calls `removeIfCurrent` with that exact instance, asserts cleanup success, and only then returns the accepted result. Successful completion is cached so removal/release happens once.
- `not_found`, `identity_mismatch`, accepted-but-still-active, or resource cleanup error cannot be converted to Team success. No path may release a replacement run. Cleanup failure remains a terminal error for this committed wrapper and is surfaced to the owning stop.

`terminateAgentRun` and active-run processing in `stopAllAgentRuns` reuse this wrapper. Unpublished activation-candidate abort keeps its existing `releasePrepared`/private termination compensation because it is a different lifecycle state.

## Off-Spine Concerns Around The Spine

| Concern | Related Spines | Serves | Responsibility | Why | Risk If Main-Line |
| --- | --- | --- | --- | --- | --- |
| Run-session ID derivation | DS-001, DS-003, DS-006 | session service/registry | Normalize, SHA-256, base64url, prefix | One stable algorithm | Provider divergence |
| Tool exposure composition | DS-001, DS-006 | session service | Build current tools/routes/capabilities | Live-only context | Persistence/model pollution |
| Local server base URL | DS-001, DS-003, DS-007 | AgentToolsMcpHost/local server | Verify listen address; expose immutable process-lifetime base; join with ID | Port can change only after full host restart | Stale cached URL if independently rebound |
| Main listener topology | DS-005, DS-007 | application-host composition | Preserve requested host/port; omit Agent Tools; seed generic base | Existing operator/public contract | Security or availability regression |
| Loopback classification | DS-004 | local access gate | Peer normalization and Host/Origin validation | Tokenless local trust | Network exposure |
| Managed termination attempt | DS-002, DS-008 | AgentRunManager | Exact-current guard, cancellation, retry/coalescing, accepted finalization | One published-run cleanup owner | Team bypass or duplicate policy |
| Scope ledger | DS-001, DS-002, DS-006, DS-008 | scoped authority | Exact-run activation ownership and exact-session close cleanup | Balanced lifecycle | Registry leaks |
| MCP transport helpers | DS-004 | route | method/protocol/content/SSE/CORS | Preserve protocol | Access policy obscured |
| Gateway regression | DS-005 | gateway owner | Prove no functional change | Independent user surface | Conflated bearer removal |

## Ownership Boundaries

1. Providers call only the scoped activator and receive a safe descriptor.
2. Scoped authority encapsulates session service and registry/ledger cleanup.
3. Session service is the only exposure/capability/descriptor composer.
4. Registry never accepts bearer or persistence input; it stores active records only.
5. HTTP local gate never activates a run and never imports gateway token policy.
6. Gateway never depends on Agent Tools run identity, registry, or authority.
7. AgentToolsMcpHost is the only Agent Tools local-server lifecycle/base-URL owner; providers and session service cannot read the main-server endpoint.
8. Studio/standalone composition coordinates main/local startup and shutdown but cannot register Agent Tools routes or choose a provider-specific endpoint.
9. Team lifecycle may depend on AgentRunManager and the exact AgentRun returned by activation, but it may not call the run's termination preparation directly or depend on activation registry/resource manager/Agent Tools.
10. AgentRunManager owns published-run prepared termination and exact-current finalization; AgentRun owns only its internal reversible quiescence/runtime finish.
11. AgentRunResourceManager is reached only through activation-registry removal for published runs and uses exact run ID deactivation; no partial-owner selector exists.

## Boundary Encapsulation Map

| Authoritative Boundary | Internals | Required Callers | Forbidden Bypass | Fix If Thin |
| --- | --- | --- | --- | --- |
| AgentRunManager | AgentRun prepared termination, activation-registry exact removal, resource cleanup assertion | direct run service, MixedAgentMemberHandle, stop-all coordinator | Team handle calls AgentRun.prepareTermination or activation/resource/session internals directly | Expose exact-instance prepareAgentRunTermination and reuse it internally |
| AgentRun | quiescence, cancel/reopen, backend finish, local lifecycle | AgentRunManager managed wrapper | Team/outer callers treat lower-level finish as complete published-run cleanup | Keep prepared termination internal to manager for published runs |
| AgentRunActivationRegistry / AgentRunResourceManager | exact-current removal and exact-run resource release | AgentRunManager; candidate cleanup internals | Team/provider calls release/deactivate directly | Keep exact identity and cleanup assertion |
| ScopedAgentToolMcpRunSessionAuthority | ledger, session service, registry lifecycle | provider composition, resource manager | provider/Team calls registry/service directly or uses partial-owner cleanup | Keep exact activate/deactivateForRun; close by exact owned IDs |
| AgentToolsMcpHost | local server, route dependencies, registry/catalog/dispatcher/authority | Studio/standalone startup/shutdown; execution scopes | main server registers routes; callers access raw route dependencies/base state | Expose listen/close plus sessionAuthorities only; keep base reader internal |
| AgentToolsMcpLocalServer | Fastify instance, assigned port, base readiness | AgentToolsMcpHost | composition binds arbitrary host/port or restarts server | Keep fixed `127.0.0.1:0` and one lifecycle |
| AgentToolMcpSessionService | exposure/capability/descriptor | scoped authority | provider derives route, reads generic internal base, or builds live session | Inject host-owned ready local-base reader |
| AgentToolsMcpLocalAccessGate | peer/Host/Origin checks | request gate | route relies on descriptor hostname | Add explicit access decision field |
| AgentToolMcpSessionRegistry | active map | service/ledger, route resolve | route reads run manager or history | Add exact resolve/deactivate API |
| McpGatewayAccessGate | gateway token/local policy | gateway route | Agent Tools imports it | Keep boundary independent |

## Dependency Rules

Allowed:

- Studio/standalone application-host lifecycle -> AgentToolsMcpHost listen/close;
- AgentToolsMcpHost -> local server + route dependencies + session-authority factory;
- local server -> Agent Tools route registration + Fastify/logging/runtime param config;
- Team member lifecycle -> AgentRunManager managed prepared termination;
- AgentRunManager -> exact AgentRun prepared termination + activation registry;
- activation registry -> AgentRunResourceManager exact release;
- resource manager -> exact-run Agent Tools deactivator;
- run lifecycle -> provider factories/resource manager;
- both provider adapters -> run-session activator;
- scoped authority factory -> required host-owned local-base reader + session service + ledger/registry;
- session service/registry -> run-session ID derivation;
- route -> local access gate + registry + dispatcher;
- local access gate -> api/security/isLoopbackPeerAddress;
- gateway route -> gateway access/dispatcher/catalog/executor.

Forbidden:

- main Studio/standalone server builders -> Agent Tools route registration or route dependencies;
- Agent Tools session service/providers -> generic `AUTOBYTEUS_INTERNAL_SERVER_BASE_URL` or main listen address;
- AgentToolsMcpLocalServer -> requested main host/port, gateway routes, run lifecycle, or provider adapters;
- provider -> registry, hash function, local gate, or gateway;
- provider constructors/bootstrap/session managers -> global Agent Tools singleton/default issuer;
- MixedAgentMemberHandle -> direct AgentRun.prepareTermination, activation registry, resource manager, or Agent Tools;
- Team files -> Agent Tools session deactivator/registry;
- generic partial-owner session deactivation;
- route -> run manager/history/activation;
- Agent Tools -> secret management, memory sync, binding store, gateway token/config;
- gateway -> Agent Tools registry/authority;
- run-session hash treated as authentication;
- optional bearer compatibility branch in Agent Tools;
- provider-specific activation interfaces.

## Interface Boundary Mapping

| Interface / Method | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| deriveAgentToolMcpRunSessionId(runId) | routing identity | Canonical fixed algorithm | normalized run ID -> branded run-session ID | Pure/non-secret |
| AgentToolMcpRunSessionActivator.activateForRun(input) | active run session | Build/register and return active/not_exposed | explicit owner/sender/exposure/context/runtime/observer | Both providers |
| AgentRunManager.prepareAgentRunTermination(expectedRun) | published AgentRun | Reversible prepare plus accepted exact-current finalization | exact AgentRun object and intrinsic run ID | Returns existing PreparedAgentRunTermination contract; verifies current identity |
| AgentToolMcpRunSessionDeactivator.deactivateForRun(runId) | active run session | Remove exact ledger/registry record | normalized run ID | Sole normal deactivation method; no partial owner |
| createAgentToolMcpSessionAuthorityFactory({ getLocalBaseUrl, ... }) | scoped construction | Inject the host-owned readiness/base contract into every session service | required zero-argument reader | Reader throws before local listen/after close |
| AgentToolMcpSessionRegistry.activateSession(input) | active map | Derive key, reject duplicate, insert | owner contains exact run ID | Internal |
| AgentToolMcpSessionRegistry.resolveSession(runSessionId) | active map | Lookup active record | branded/validated route ID | No bearer |
| AgentToolsMcpHost.listen() | process Agent Tools transport | Start exactly one local server and establish readiness | no caller-selected host/port | One-shot; duplicate call fails; before recovery |
| AgentToolsMcpHost.close() | process Agent Tools transport/state | Block sessions, close local server, clear registry | process capability | Async and idempotent |
| AgentToolsMcpLocalServer.listen() | local TCP listener | Bind `127.0.0.1:0`, validate AddressInfo, register route once | OS-assigned positive port | One-shot, no retry/rebind loop |
| AgentToolsMcpLocalServer.requireBaseUrl() | local endpoint | Return verified immutable base or throw not-ready/closed | absolute `http://127.0.0.1:<port>` | Internal closure injected into session service; not exposed by host |
| StudioServer.agentToolsMcpHost | Studio startup handle | Let server-runtime invoke the authoritative host `listen()`; main Fastify onClose retains `close()` ownership | exact AgentToolsMcpHost boundary | No raw registry/route deps |
| AgentToolsMcpLocalAccessGate.validateRequest(request) | local request | Peer+Host+Origin decision | actual Fastify request | Before all route work |
| AgentToolMcpDescriptor | provider config | Headerless URL + enabled tools | server name/transport/URL/tools | No redacted variant |
| McpGatewayAccessGate.validateRequest | external gateway | Existing token/local decision | gateway request | Unchanged |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Ambiguous Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| derive run-session ID | Yes | Yes | Low | Full SHA-256 deterministic vectors |
| activateForRun | Yes | Yes | Low | No optional provider/persistence flags |
| prepareAgentRunTermination | Yes | Yes — exact AgentRun instance | Low | Cancel/reject/accepted/identity/cleanup tests |
| deactivateForRun | Yes | Yes | Low | Idempotent exact-run count/result; remove owner selector |
| registry resolve | Yes | Yes | Low | No token input |
| host listen/base/close | Yes | Yes | Low | State-machine/readiness and exactly-once tests |
| authority factory local-base dependency | Yes | Yes | Low | Required injection; no global default |
| local server listen | Yes | Yes | Low | Fixed loopback/port-zero contract; validate address |
| local access gate | Yes | Yes | Low | Test peer, Host, Origin independently |
| gateway access gate | Yes | Yes | Low | No change |

## Main Domain Subject Naming Check

| Subject | Proposed Name | Self-Descriptive? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Deterministic route identity | AgentToolMcpRunSessionId | Yes | Low | Avoid capability/token language |
| Live record | AgentToolMcpSession | Yes | Medium | Document active-only |
| Published-run finalization | prepareAgentRunTermination | Yes | Low | One manager-owned wrapper |
| Lifecycle | activate/deactivate | Yes | Low | Remove issue/revoke and partial-owner cleanup |
| HTTP trust | AgentToolsMcpLocalAccessGate | Yes | Low | Separate from external gateway |
| Dedicated transport | AgentToolsMcpLocalServer | Yes | Low | One per application-server process |
| Process capability | AgentToolsMcpHost | Yes | Low | Own server and session mechanisms |
| External route | MCP Gateway | Yes | Low | Preserve |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why | If New |
| --- | --- | --- | --- | --- |
| Stable input | Agent run identity | Reuse | Immutable/persisted before provider | N/A |
| Active session composition | Agent Tools MCP | Extend | Current owner | N/A |
| Hashing | Node crypto | Reuse inside Agent Tools identity file | Pure standard primitive | N/A |
| Peer loopback classification | api/security/remote-access-local-trust | Reuse unchanged | Handles IPv4/IPv6/mapped addresses | N/A |
| Host/Origin local policy | Agent Tools HTTP gate | Extend | Route-specific contract; gateway stays unchanged | N/A |
| Dedicated HTTP serving | Fastify + existing AgentToolsMcpHost | Extend/create owned local server | Current main registration is the wrong endpoint owner | AgentToolsMcpLocalServer |
| OS-assigned local port | Node/Fastify listen address | Reuse | Avoids config and collision ownership | Validate AddressInfo and positive port |
| Generic main internal endpoint | server-runtime-endpoints | Preserve, stop using for Agent Tools | Managed messaging/main topology owns it | N/A |
| Process isolation | Codex client manager | Reuse unchanged | No longer needed for fix | N/A |
| Secret/persistence | Secret management/file/memory sync | Do not use | No secret/data | N/A |
| External access | mcp-gateway | Reuse unchanged | Separate product | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem | Concerns | Spines | Owner | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent Tools MCP core | run ID derivation, live sessions, authority, owned local server/route | DS-001–DS-004, DS-006–DS-007 | AgentToolsMcpHost/local server/scoped authority/session service/registry/gate | Extend/tighten | Main change |
| Codex adapter | activation timing and headerless config | DS-001, DS-003 | bootstrap/materializer | Modify | No thread/process change |
| Claude adapter | lazy activation timing and headerless config | DS-001, DS-003 | session state/materializer | Modify | Same activator |
| Published AgentRun lifecycle | reversible termination, exact-current removal, resource cleanup | DS-002, DS-008 | AgentRunManager + activation registry/resource manager | Strengthen/refactor | One finalization boundary |
| Mixed Team member lifecycle | adapt Team prepare/commit to managed AgentRun termination | DS-002 | MixedAgentMemberHandle | Modify | No Agent Tools dependency |
| Studio/standalone host composition | main/local listener ordering and compensation | DS-003, DS-007 | server-runtime and standalone host lifecycle | Modify | Preserve requested main bind |
| API security | peer loopback utility | DS-004 | existing local trust | Reuse | No source change expected |
| External MCP Gateway | external access and MCP-origin tools | DS-005 | gateway boundary | Preserve | Tests only |
| Secret/persistence/memory sync | unrelated | none | existing owners | Keep superseded ticket design absent | No production target change |

## Draft File Responsibility Mapping

| Candidate File | Subsystem | Owner | Concern | Why One File | Reuse |
| --- | --- | --- | --- | --- | --- |
| agent-tool-mcp-run-session-id.ts | Agent Tools | route identity | pure normalized full-digest algorithm/type | One reusable contract | normalizeStoredAgentRunId, crypto |
| agent-tool-mcp-session.ts | Agent Tools | active domain | headerless descriptor/live model | Existing subject | team identity |
| registry.ts | Agent Tools | active map | activate/resolve/deactivate | Existing state owner | run-session ID |
| service.ts | Agent Tools | live composer | exposure/capabilities/descriptor; require injected local-base reader; remove singleton/default issuer | Existing owner | catalog/registry |
| authority files | Agent Tools | scoped lifecycle | universal activation/deactivation and required local-base injection | Existing owner | service/ledger/local server closure |
| agent-tools-mcp-local-server.ts | Agent Tools HTTP | process local transport | Fastify route registration, fixed loopback bind, readiness/base, close | One bounded server lifecycle | routes/logging config |
| agent-tools-mcp-host.ts | Agent Tools | process capability | compose local server and session mechanisms; listen/close API | Existing natural owner | local server/registry/catalog |
| agent-tools-mcp-local-access.ts | Agent Tools HTTP | local policy | peer+Host+Origin validation | Singular security decision | shared peer helper |
| http-gate/routes.ts | Agent Tools HTTP | transport | order access, preflight, resolve, dispatch | Existing boundary | local gate/registry |
| provider materializers/state/bootstrap | Provider adapters | config syntax/timing | use same activator, omit headers | Existing owners | descriptor |
| agent-run-manager.ts | Run lifecycle | published-run finalization | exact-instance prepared wrapper; direct/Team/stop-all reuse | Existing authoritative owner | AgentRun preparation, activation registry |
| agent-run-activation-registry.ts / agent-run-resource-manager.ts | Run lifecycle | exact removal/release | preserve singular cleanup; assert before success | Existing owners | exact deactivator |
| mixed-agent-member-handle.ts | Team adapter | member termination | call manager prepared wrapper; dispose after accepted finish | Removes lower-level bypass | AgentRunManager |
| authority/scoped-authority/registry | Agent Tools | exact cleanup API | remove partial-owner interfaces/helpers | CR-F-002 clean cut | run ID/session ID |
| Studio/standalone server builders/startup | Application host | listener lifecycle | omit Agent Tools from main, start/close host-owned local server | Existing process owners | AgentToolsMcpHost |

## Reusable Owned Structures Check

| Repeated Structure | Shared File | Owner | Why | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Run-session derivation/type | agent-tool-mcp-run-session-id.ts | Agent Tools | Registry/service/tests/providers share contract indirectly | Yes | Yes | auth/secret utility |
| Headerless descriptor | session.ts | Agent Tools | Both materializers | Yes | Yes | provider-specific union |
| Activation input/result | authority.ts | Agent Tools | Both providers + scoped owner | Yes | Yes | optional-policy kitchen sink |
| Peer loopback classification | existing remote-access-local-trust.ts | API security | Already shared | Yes | Yes | Host/gateway policy owner |
| Local endpoint state | agent-tools-mcp-local-server.ts | Agent Tools | One base/readiness representation for host/service/tests | Yes | Yes | generic main endpoint/env |

## Shared Structure / Data Model Tightness Check

| Structure | Clear Fields? | Redundant Removed? | Overlap Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Run-session ID | Yes | Yes | Low | Only full digest string |
| AgentToolMcpSession | Yes after cleanup | Yes | Low | No token/revoked/persisted fields |
| Descriptor | Yes | Yes | Low | URL/tools only |
| Activation input/result | Yes | Yes | Low | active or not_exposed |
| Local endpoint | Yes | Yes | Low | one absolute base plus explicit readiness state; no requested/main host fields |
| Gateway access config | Yes | Yes | Low | Unchanged |

## Final File Responsibility Mapping

| File | Subsystem | Owner | Concrete Change | Why | Reuse |
| --- | --- | --- | --- | --- | --- |
| src/agent-tools/mcp/agent-tool-mcp-run-session-id.ts (add) | Agent Tools | identity contract | branded ID, derivation, route-shape validation if needed | One pure concern | run ID normalizer, SHA-256 |
| src/agent-tools/mcp/agent-tool-mcp-session.ts | Agent Tools | active domain | remove headers/redacted/tokenHash/revokedAt; active-only types | Existing model | derived ID |
| src/agent-tools/mcp/agent-tool-mcp-session-registry.ts | Agent Tools | active map | deterministic activate, no-token resolve, deletion deactivate | Existing owner | ID function |
| src/agent-tools/mcp/agent-tool-mcp-session-service.ts | Agent Tools | live composer | activateForRun, zero-tool result, headerless descriptor from required injected ready local base; remove generic endpoint import and global singleton/default issuer exports | Existing owner | registry/catalog/local-base reader |
| src/agent-tools/mcp/agent-tool-mcp-session-authority.ts | Agent Tools | contracts | run activator/deactivator/authority and result types; deactivator exposes only exact deactivateForRun; no legacy issuer/default/partial-owner method | Existing boundary | session types |
| src/agent-tools/mcp/scoped-agent-tool-mcp-session-authority.ts | Agent Tools | scoped lifecycle | one universal exact-run boundary; required local-base reader; ledger compensation/deletion; remove partial-owner matcher/forwarders | Existing owner | service/registry/local server closure |
| src/agent-tools/mcp/agent-tools-mcp-local-access.ts (add) | Agent Tools HTTP | local gate | peer+Host+Origin decision | Singular trust boundary | isLoopbackPeerAddress |
| src/agent-tools/mcp/agent-tools-mcp-local-server.ts (add) | Agent Tools HTTP | dedicated transport | create dedicated Fastify, register access log/Agent Tools routes, bind `127.0.0.1:0`, validate/publish base, idempotent close | One process-lifetime concern | Fastify/runtime config/routes |
| src/agent-tools/mcp/agent-tools-mcp-http-gate.ts | Agent Tools HTTP | request gate/helpers | invoke local gate first; remove bearer helpers; no authorization CORS header; active ID unsupported-method check | Existing transport gate | local gate/registry |
| src/agent-tools/mcp/agent-tools-mcp-routes.ts | Agent Tools HTTP | route | no bearer; resolve by runSessionId | Existing handler | registry/dispatcher |
| src/agent-tools/mcp/agent-tools-mcp-host.ts | Agent Tools | process capability | construct local server + simplified authority; expose async listen/sessionAuthorities/close; inject private ready-base reader; keep route deps internal | Existing natural owner | registry/catalog/local server |
| src/compositions/build-studio-server.ts | Studio composition | main server | remove Agent Tools main-route registration; add AgentToolsMcpHost to StudioServer return so server-runtime can call listen; main onClose awaits host close; keep gateway/main routes | Correct process boundary | application runtime/host |
| src/server-runtime.ts | Studio startup | listener orchestration | prepare -> local listen -> main listen -> generic main-base seed -> recover; compensate close on failure | Existing startup owner | StudioServer handle |
| src/compositions/build-standalone-application-server.ts | Standalone composition | main server | remove route dependency parameter and Agent Tools main-route registration | Main server only | standalone routes |
| src/standalone-application-host/start-standalone-application-host.ts | Standalone startup | listener orchestration | prepare -> local listen -> main listen -> generic main-base seed -> recover; idempotent close/unwind | Existing startup owner | host/local server |
| src/config/server-runtime-endpoints.ts | Runtime config | generic main endpoint | no functional change; keep managed-messaging semantics/tests | Preserve separate owner | main listen address |
| Codex materializer/bootstrapper | Codex | adapter | require same injected activator, remove global issuer fallback, omit http_headers | Existing responsibility | descriptor |
| Claude materializer/session-state/manager dependencies | Claude | adapter | require same injected activator, remove global issuer fallback, omit headers | Existing responsibility | descriptor |
| agent-provider-factory-builder.ts and execution-scope callers | Composition | capability routing | pass same activator to both | Existing owner | scoped authority |
| src/agent-execution/services/agent-run-manager.ts | Run lifecycle | published-run termination owner | add exact-instance prepared wrapper; direct termination and stop-all reuse; accepted finish removes/asserts cleanup before success | Fixes CR-F-001 without Team policy duplication | AgentRun, activation registry |
| src/agent-execution/runtime/agent-run-activation-registry.ts | Run lifecycle | exact published registration | retain exact `removeIfCurrent`; add/rename reason only if required by manager diagnostics | Existing removal owner | resource manager |
| src/agent-execution/services/agent-run-resource-manager.ts | Run lifecycle | exact attached-resource release | retain singular exact run session/file/artifact/memory cleanup | Existing owner | exact deactivator |
| src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts | Team adapter | member two-phase termination | obtain manager-prepared exact-run termination; cancel/commit/finish delegation; dispose only after accepted managed finish; no direct AgentRun prepare | Removes bypass | AgentRunManager |
| tests under agent-run/team termination | Tests | ownership invariant | add cancel/reject/accepted/cleanup-failure/exact Team stop+restore lifecycle; replace deleted direct MCP cleanup test with manager-boundary evidence | CR-F-001 | real/fake registry and session authority |
| tests under agent-tools/provider/run/team | Tests | behavior contracts | replace random bearer/tombstone expectations; add local-server state/bind/base tests | Colocated | deterministic fixtures |
| tests under server-runtime/standalone/composition | Tests | host topology | prove one local listener, no main route, bind independence, startup/shutdown compensation | Existing lifecycle suites | listener fakes/integration sockets |
| tests under mcp-gateway | Tests | preservation | run unchanged gateway contract | Existing suite | no AgentRun |
| src/agent-tools/mcp/codex-binding/* (must remain absent) | Superseded SR-001 inventory | none | prohibit directory | Not in target; absent in final audit | N/A |
| src/secret-management/domain/internal-secret-envelope.ts and Agent Tools-specific secret-management edits (must remain absent) | Superseded SR-001 inventory | none | prohibit Agent Tools envelope path | No secret; absent in final audit | N/A |
| Agent Tools memory-sync private path/import edits (must remain absent) | Superseded SR-001 inventory | none | retain existing policy unchanged | No sidecar | N/A |
| Codex prepared binding context/factory/manager edits (must remain absent) | Superseded SR-001 inventory | none | prohibit transaction machinery | No persisted binding | normal Codex lifecycle |

## Applied Patterns (If Any)

- Deterministic identity from immutable aggregate ID.
- Active registry/lease with deletion-based lifecycle.
- Scoped authority and compensated registration.
- Provider adapter pattern with one domain capability.
- Owned local-server lifecycle with fail-closed startup compensation.
- Route-local access gate.
- Manager-owned prepared capability for published-run termination.
- Independent external gateway boundary.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| src/agent-tools/mcp/ | Existing folder | Agent Tools capability | identity, active lifecycle, local transport | All are one bounded capability | vault/store/gateway token |
| agent-tool-mcp-run-session-id.ts | File | identity | pure route key | Reused across core | live context/auth claims |
| agent-tools-mcp-local-server.ts | File | local transport | Fastify construction, fixed loopback bind, ready base, close | One owned server lifecycle | run/session/provider/gateway policy |
| agent-tools-mcp-local-access.ts | File | HTTP trust | peer/Host/Origin | Separate main access decision | registry/tool dispatch |
| Studio/standalone composition/startup files | Existing files | application hosts | keep main routes/bind separate; order local/main listen and cleanup | Existing process lifecycle owners | endpoint derivation inside providers |
| server-runtime-endpoints.ts | Existing file | generic main endpoint | unchanged managed-messaging/main-base contract | Prevent contract conflation | Agent Tools local base |
| src/agent-execution/services/agent-run-manager.ts | Existing file | published-run lifecycle | managed prepared termination and exact finalization | Existing publication/removal coordinator | Team or Agent Tools policy |
| src/agent-execution/runtime/agent-run-activation-registry.ts | Existing file | published registration | exact-current removal -> resource release | Existing authoritative registry | partial-owner selectors |
| src/agent-execution/services/agent-run-resource-manager.ts | Existing file | attached resources | exact session/file/artifact/memory release | Existing singular owner | Team orchestration |
| src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts | Existing file | Team adapter | delegate exact managed termination; local disposal | Existing member boundary | Agent Tools imports or direct AgentRun preparation |
| provider Codex/Claude folders | Existing folders | adapters | activation timing/config mapping | Provider syntax belongs there | identity algorithm |
| src/api/security/remote-access-local-trust.ts | Existing file | shared peer trust | normalize/classify peer | Already correct | Agent Tools Host policy |
| src/mcp-gateway/ | Existing folder | external gateway | unchanged external contract | Independent product boundary | run sessions |
| secret-management/memory-sync | Existing folders | unrelated owners | no target edits | No persisted Agent Tools state | binding machinery |

A new Agent Tools subfolder is unnecessary: the final design adds three focused files (run-session ID, local access policy, local server) and tightens the existing coherent core. The superseded codex-binding folder remains absent.

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| agent-tools/mcp | Mixed justified | Yes | Low | Small coherent core; file names separate domain/access/transport |
| Studio/standalone composition | Process boundary | Yes | Medium | Owns ordering only; local server implementation stays in Agent Tools |
| provider folders | Adapter | Yes | Low | Syntax/timing only |
| api/security | Shared off-spine | Yes | Low | Reuse peer helper unchanged |
| mcp-gateway | Independent main-line | Yes | Low | No cross-coupling |
| codex-binding WIP | Obsolete | N/A | High if retained | Remove |

## Concrete Examples / Shape Guidance (Mandatory)

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Managed Team stop | handle -> AgentRunManager prepared wrapper -> AgentRun finish -> exact removal/resource release -> handle dispose -> Team success | handle -> AgentRun.prepareTermination -> dispose | Accepted Team stop cannot retain live state |
| Cancellation/rejection | cancel or rejected finish keeps exact run/session/resources current; retry remains possible | deactivate during prepare or dispose on rejection | Preserves existing two-phase semantics |
| Run identity | same run ID always -> agtrun_<full digest> | random session on each activation | Fixes provider cache |
| Provider convergence | Codex and Claude call activateForRun(input) | persistentForCodex/ephemeralForClaude | One approved policy |
| Stop/restore | delete live record; recompute/reinsert same key | retain full live object or write sidecar | Bounded/no persistence |
| Local trust | verify raw peer + Host + Origin before lookup | assume 127.0.0.1 descriptor protects wildcard listener | Prevent remote invocation |
| Main-bind independence | main stays `192.168.1.20:29695`; one Agent Tools server is `127.0.0.1:<assigned>` | reuse main base or change requested host to wildcard | Supports existing bind safely |
| Listener count | five runs -> one local listener + five route IDs | one listener/port per run | Bounded/simple lifecycle |
| Startup | local listen succeeds -> base ready -> main listen/recover | issue descriptor before local readiness or continue after bind failure | No predictably broken runs |
| Restart | new process may get new port; same run path; new provider process receives descriptor | silently rebind local listener while old Codex process survives | Respect provider cache lifetime |
| Descriptor | URL + enabled tools, no headers | Authorization bearer or redacted variant | Clean cut |
| Gateway contrast | /mcp/gateway retains its configured bearer policy | remove all MCP bearer logic globally | Protect separate product |
| Error order | remote -> 403; local inactive -> redacted 404 | lookup active run before local gate | Avoid information exposure |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Considered Because | Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Accept old Agent Tools bearer optionally | Existing current clients send it | Rejected as policy path | Provider configs regenerated headerless; extra header grants nothing |
| Resolve random and deterministic IDs | Transition convenience | Rejected | Deterministic ID only after process restart/deploy |
| Keep tokenHash/revokedAt unused | Minimize edits | Rejected | Tight active-only model |
| Keep SR-001 sidecar as fallback | Codex same-process control | Rejected | Pure run ID derivation |
| Provider-specific activators | Different timing | Rejected | Same activator, adapter-local timing |
| Reuse gateway access gate/token | Existing loopback/token policy | Rejected | Agent Tools local gate; gateway unchanged |
| Change gateway bearer | Global simplification | Rejected | Preserve external contract |
| Keep Agent Tools on main listener | Avoid second socket | Rejected | Dedicated process-wide loopback listener |
| Register on both main and local | Transition convenience | Rejected | Local listener only; no dual path |
| Per-run listener or configured fixed port | Simple identity mapping | Rejected | One OS-assigned process listener; route ID maps runs |
| Reuse generic internal-base env | Existing URL source | Rejected | Agent Tools-owned ready base; generic contract unchanged |
| Restore direct Mixed-member Agent Tools cleanup | Fast local repair | Rejected | Manager-owned published-run finalization reaches the resource manager; Team stays policy-free |
| Keep both manager and direct AgentRun termination paths | Smaller diff | Rejected | All published-run callers use one managed prepared wrapper |
| Keep partial-owner deactivation | Potential convenience | Rejected | Exact run ID plus exact-session scope close only |

## Derived Layering (If Useful)

1. Team/direct/application stop orchestration.
2. AgentRunManager managed published-run lifecycle -> AgentRun internal termination -> activation registry/resource manager.
3. Provider adapters.
4. Scoped Agent Tools authority and live session service.
5. AgentToolsMcpHost-owned local server, active registry, and local HTTP gate/dispatcher.
6. Studio/standalone application-host listener orchestration.
7. Independent external gateway on the main Studio listener, beside rather than beneath Agent Tools.

## Change / Refactor Sequence

1. Freeze the IR-001 state and preserve the already-reviewed deterministic identity, provider convergence, local listener/admission, host lifecycle, main-base, gateway, and no-persistence implementation. Confirm SR-001 machinery remains absent.
2. Add `AgentRunManager.prepareAgentRunTermination(expectedRun)` using the existing `PreparedAgentRunTermination` contract. Implement exact-current validation, cancel delegation, committed-attempt coalescing/retry, accepted inactivity check, exact removal, resource cleanup assertion, and terminal mismatch/cleanup failure.
3. Refactor `AgentRunManager.terminateAgentRun` and the active published-run branch of `stopAllAgentRuns` to use the same wrapper. Leave unpublished candidate abort/releasePrepared compensation separate.
4. Change `MixedAgentMemberHandle.prepareTermination` to request the manager-owned prepared termination for its exact `agentRun`. Keep no-run as benign, preserve cancel/reject semantics, and dispose local state only after managed accepted finish. Remove every direct published-run `AgentRun.prepareTermination` call outside AgentRunManager.
5. Remove dormant `deactivateForOwner(Partial<...>)`, scoped matchers/forwarders, `deactivateSessionsForOwner`, owner-matching helpers, and tests/fixtures existing only for them. Retain exact `deactivateForRun` and exact session-ID scope close.
6. Add/repair focused coverage: manager cancel; rejection then retry; accepted exact removal/resource/session cleanup once; accepted-but-active; not-found/identity mismatch; cleanup error; Mixed handle delegation/disposal; supported Team committed stop to inactive 404 and later same-ID fresh restore. Retain architecture checks preventing Team-to-Agent-Tools dependency and direct lower-level published-run termination.
7. Re-run IR-001 implementation checks plus focused Team/run/resource/Agent Tools suites, build/typecheck, diff/forbidden-symbol audits, and later the full Codex same-process/system/gateway scenarios owned downstream.
8. Update implementation-owned handoff/revision records in implementation rework, return through code review, and do not advance to API/E2E until source review passes.

No migration sequence applies.

## Key Tradeoffs

- Stable non-secret ID intentionally moves trust from per-run bearer to loopback process locality, exactly as approved.
- Full SHA-256 adds a long route segment but avoids truncation/collision policy and is still shorter/fixed compared with arbitrary run IDs.
- Peer+Host admission is stricter than peer-only and may reject local proxy aliases; the internal providers use generated loopback URLs, so this is proportionate.
- One additional Fastify listener/socket per application process is a small fixed resource cost that buys one uniform security and reachability invariant for every main bind.
- OS-assigned port `0` avoids configuration/collision policy but permits the base port to change across complete application restarts. Cached provider clients therefore must share the application-process lifetime; the listener cannot independently rebind.
- Always using the dedicated listener, even when the main bind is loopback-capable, avoids conditional route topologies and dual-path coverage.
- Pure derivation removes at-rest secret risk and failure modes but does not solve changed tool topology cached by providers.
- A manager-owned prepared wrapper adds one lifecycle hop, but it preserves the existing reversible AgentRun contract while ensuring every published-run caller shares exact removal/resource policy. Restoring Team-local MCP cleanup would be shorter but would duplicate policy and leave other resources attached.

## Risks

- Trusted local processes can invoke active endpoints; accepted product trust model.
- Hash is non-secret; documentation/tests must not describe it as authentication.
- Incorrect gate ordering could expose active/inactive information remotely; enforce admission first.
- Host parsing must correctly handle localhost, 127/8, bracketed ::1, and ports.
- Local listener startup/partial-failure ordering could leak a socket or leave process resources half-open; one owning lifecycle and idempotent close are mandatory.
- Transparent local-listener restart on a new port would recreate the original cached-descriptor failure. Expose no independent rebind path; unforeseen OS/process failure remains process-level failure handling.
- Provider processes surviving an application-host restart would retain the old assigned port; current host shutdown must release them, and coverage must prove the supported lifecycle.
- Accidentally leaving Agent Tools registered on the main listener would restore LAN reachability even though the generated descriptor is local; architecture/source tests must prohibit it.
- Reusing or overwriting the generic internal base could break managed messaging or requested non-loopback behavior; keep endpoint contracts separate.
- New implementation edits could accidentally reintroduce the superseded vault/memory/provider direction; final search and architecture tests are required.
- Gateway regression could occur if generic MCP helpers are changed globally; keep Agent Tools helpers scoped and gateway production files unchanged.
- If the manager wrapper deactivates during reversible preparation or after a rejected finish, Team cancellation/retry semantics break; mutate activation/resources only after accepted inactive completion.
- If the manager wrapper accepts `not_found`/identity mismatch as success, it can falsely certify cleanup or affect a replacement run; require exact-current removal and fail without touching mismatched identity.
- If every caller keeps a different finalizer, the original bypass recurs; direct, Team, and stop-all published-run termination must share the manager-owned wrapper.
- Resource cleanup can report partial errors after registration removal; propagate and cache that committed failure rather than returning Team success. Scope/application close remains the later safety cleanup, not evidence of successful stop.

## Guidance For Implementation

- Normalize run ID using the existing canonical normalizer, hash exact UTF-8 bytes, use the full 32-byte digest, base64url without padding, and prefix agtrun_. Freeze deterministic vectors.
- Do not include team address or provider conversation ID in derivation. Run ID is the one identity source.
- Registry activation derives its own key from session.owner.runId so callers cannot supply mismatched key/owner.
- Duplicate active insertion must throw; deactivation must delete and be idempotent.
- `AgentRunManager.prepareAgentRunTermination(expectedRun)` must require that exact object to be the current published run before calling its preparation. The returned `PreparedAgentRunTermination` delegates cancel without cleanup; its committed finish coalesces an attempt, permits retry after `accepted:false`, and on accepted result requires inactivity, exact-current removal, and successful resource cleanup before returning. Cache accepted or terminal cleanup failure so release is not repeated.
- Refactor `terminateAgentRun` and the active-run branch of `stopAllAgentRuns` to use that same manager wrapper. Keep unpublished candidate abort/releasePrepared separate.
- `MixedAgentMemberHandle.prepareTermination` must call the manager wrapper for its exact `agentRun`; it must never call `agentRun.prepareTermination` directly. It disposes only after the managed result is accepted. No Mixed Team file imports Agent Tools authority/registry/resource manager.
- Remove `deactivateForOwner`, every partial-owner matcher/forwarder, `deactivateSessionsForOwner`, and `doesOwnerMatch`; there is no compatibility alias. Scoped close continues exact session-ID deletion from its ledger.
- Resolve exposure before insertion; zero enabled tools returns not_exposed with no ledger/registry entry.
- AgentToolsMcpLocalServer must create one dedicated Fastify instance using the process LoggingConfig and existing max-route-param/access-log policy, register only Agent Tools necessities, listen with `{ host: "127.0.0.1", port: 0 }`, require a TCP AddressInfo with a positive port, and freeze `http://127.0.0.1:<port>` until close. It does not register global CORS, multipart, WebSocket, REST, GraphQL, static, gateway, or remote-access-policy plugins.
- `createAgentToolsMcpHost({ loggingConfig })` should own the local server and expose only process-level one-shot `listen()`, sessionAuthorities, and idempotent async `close()`. Inject the local server's private readiness/base reader into session composition; do not expose it or route dependencies to main server builders.
- Build descriptors from the injected ready local-server base. Remove the generic server-runtime endpoint import, headers from the type, and headers from both provider materializers.
- Make the local-base reader required in the scoped authority/session-service construction path. Remove `getAgentToolMcpSessionService`, `getAgentToolMcpSessionIssuer`, and provider default fallbacks rather than leaving a not-ready/global bypass.
- Do not seed a new environment variable or persist the assigned port. Leave `AUTOBYTEUS_INTERNAL_SERVER_BASE_URL` seeding and consumers unchanged.
- Remove Agent Tools route registration from build-studio-server.ts and build-standalone-application-server.ts. `/mcp/gateway` remains on the Studio main listener.
- Both startup paths must establish local readiness before run recovery. On local/main listen or recovery failure, close the main app if started, stop runtimes/supervisors/provider clients, close the local server, and unwind process resources exactly once. Normal shutdown uses the same run/provider-before-local-server order.
- Do not independently retry/rebind the local server after readiness; cached provider URLs cannot be refreshed safely in-process. Unforeseen OS/process failure remains outside this listener's recovery responsibility.
- Local access uses request.raw.socket.remoteAddress, not only generated URL or user-controlled forwarded headers. Reuse isLoopbackPeerAddress.
- Parse Host safely: localhost, any 127/8 literal, and bracketed/unbracketed ::1 as applicable; require it. Keep absent/HTTP(S) loopback Origin rule.
- Apply access gate to OPTIONS and unsupported methods before session lookup. Remove authorization from Agent Tools allow-headers.
- Keep non-local denial generic 403 and inactive local denial redacted 404.
- Do not edit mcp-gateway production behavior. Gateway tests may be expanded only to prove preservation.
- Treat codex-binding/internal-secret-envelope/Agent Tools memory-sync machinery as prohibited superseded design, not reusable scaffolding; the final audited worktree already has none of it.
- Correct/update implementation-owned handoff and implementation revision artifacts only in the implementation rework stage; solution design does not edit them.
- Do not create implementation-handoff.md in solution design; implementation engineer owns it after the corrected implementation.
