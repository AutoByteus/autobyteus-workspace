# Requirements Doc

## Status (Draft/Design-ready/Refined)

Refined — SR-004 incorporates the CRR-001 Design Impact correction without changing the user-approved product contract. It retains SR-003 and makes committed Team-member termination reach the authoritative AgentRun resource/session finalization boundary before Team stop can succeed; cancelled or rejected termination does not deactivate the run.

## Goal / Problem Statement

Fix Agent Tools MCP after a supported stop/restore by giving every AutoByteus run one stable, deterministic, non-secret local Agent Tools endpoint identity for its full history lifetime. Codex and Claude must use the same run-scoped activation contract. Stop removes all live execution state; restore recomputes the same run route from the persisted AutoByteus run ID and attaches fresh live context. The internal route carries no per-run bearer.

The tokenless route must not be hosted on the user-selected Studio/standalone listener, which can bind beyond loopback. Each AutoByteus application-server process instead owns exactly one dedicated Agent Tools HTTP listener bound to `127.0.0.1` on an operating-system-assigned port and shared by all runs in that process. Provider descriptors use that listener, whose base URL remains stable for the process lifetime; the deterministic run route remains stable for the run history. The requested main bind and its general internal-base contract remain unchanged. The separate external MCP Gateway at `/mcp/gateway`, including its optional `AUTOBYTEUS_MCP_GATEWAY_TOKEN` and non-local access policy, remains unchanged on the main listener.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | The original random endpoint breaks after restore. In IR-001, a supported Team-row stop additionally terminates each member by calling `AgentRun` directly, bypasses `AgentRunManager`/resource release, and can report Team success while the deterministic Agent Tools record is still active. | The run ID deterministically yields the same non-secret endpoint identity. A committed, accepted Team-member termination must finalize the exact managed AgentRun and delete its live session/resources before Team stop succeeds; restore activates the same identity with fresh live context. | Stop remains full runtime termination, not pause. Reversible preparation/cancellation and rejected termination retain the same active run/session; AutoByteus run/team identity and provider conversation identity remain unchanged. | REQ-001, REQ-003, REQ-006 / AC-001–AC-004, AC-013 |
| BEH-002 | Codex and Claude both call a generic random-session issuer, but Codex materializes at bootstrap while Claude issues lazily and caches for one provider session. | Both providers consume one provider-independent activateForRun boundary and receive the same descriptor shape for the same run ID. | Provider-specific thread/session/history management remains in each adapter. | REQ-002 / AC-002, AC-009 |
| BEH-003 | Stopped-team model settings are persisted and supplied during restore. The Default-to-fast change is unrelated to MCP failure. | Selected model/reasoning/service-tier settings continue to apply alongside stable run endpoint activation. | Existing stopped-config validation and saved provider identity remain authoritative. | REQ-006 / AC-001, AC-003 |
| BEH-004 | Agent Tools originally required a bearer on the main listener. IR-001 correctly moved to tokenless local admission, but the supported Team stop path can leave the stopped member record resolvable. | Agent Tools has no bearer and exists only on the dedicated loopback listener. Local admission precedes lookup, and an accepted committed stop makes the exact endpoint return redacted 404 before stop success is observable. | Inactive/unknown endpoint still returns redacted 404; invalid Origin and non-local access remain generically rejected; MCP protocol/method/content negotiation stays intact. | REQ-003–REQ-005, REQ-009–REQ-010 / AC-004–AC-006, AC-011–AC-013 |
| BEH-005 | The legacy registry retained revoked objects. IR-001 deletes on resource release, but Team-member termination bypasses that release and leaves the active record/resources until later prune, restore, scope close, or process shutdown. | Every successful committed termination of a published AgentRun removes the exact current run from activation ownership and releases its resources once; Agent Tools deactivation deletes the active record. Server restart begins empty and later activation recomputes the same identity. | Stopped runs consume no active-registry or attached-resource memory; normal Codex cwd process sharing remains unchanged. | REQ-001, REQ-003, REQ-007 / AC-004, AC-007, AC-013 |
| BEH-006 | Existing run/team history, memory sync, deletion, and provider rollout data do not contain a deterministic Agent Tools identity; the superseded design proposed a private encrypted sidecar. | No Agent Tools credential/binding sidecar, schema, migration, sync rule, vault record, or deletion hook is added. Existing history remains directly usable because run ID is already persisted. | Existing memory export/import and run/team deletion behavior remain unchanged. | REQ-005, REQ-007 / AC-007, AC-008 |
| BEH-007 | The legacy random ID/token combined routing and authorization. IR-001 separates them, but the Team stop bypass means activation-only live context can outlive a successfully stopped Team member. | A normalized run ID maps to exactly one deterministic non-secret run-session ID. The ID is routing only. Current sender, owner, capabilities, routes, sources, context, and observer remain activation-only and are removed at authoritative committed-run finalization. | Current run activation exclusivity prevents simultaneous live activations for the same run; cross-run owner/team authorization remains in the active record/tool layer. | REQ-001–REQ-005 / AC-002, AC-004–AC-006, AC-013 |
| BEH-008 | The external MCP Gateway is an independent /mcp/gateway route with its own access gate, optional configured bearer, catalog, dispatcher, and executor. | Agent Tools simplification must not change the external gateway endpoint, settings UX, token environment variable, local/non-local access rules, tool catalog, dispatch, or execution. | External clients continue using the documented gateway contract independently of any active AgentRun. | REQ-008 / AC-010 |
| BEH-009 | Studio CLI and standalone host configuration accept a specific non-loopback host. The main server listens only there, the generic internal base preserves it, and Agent Tools currently builds provider descriptors from that non-loopback base. | The main listener preserves the exact requested host and does not register Agent Tools. One process-wide Agent Tools listener binds only to `127.0.0.1` on an OS-assigned port; both providers use it for all run routes. This topology is identical for loopback, wildcard, and specific non-loopback main binds. | Main API reachability, standalone `publicBaseUrl`, managed-messaging use of `AUTOBYTEUS_INTERNAL_SERVER_BASE_URL`, and external gateway placement remain unchanged. | REQ-004, REQ-008, REQ-010 / AC-006, AC-010–AC-012 |

## Investigation Findings

- The exact frontend/Electron/Software Engineering Team sequence was reproduced: both team tools succeeded before stop; Default was changed to fast; the same run/thread resumed; both tools then failed with exact 404 session_unavailable.
- Codex 0.150.1 keeps the original thread-scoped MCP client when the app-server process survives. Changed URL/token in thread/resume is ignored. Therefore the endpoint descriptor must remain stable for that run.
- AutoByteus run identity exists before provider creation, is persisted for both standalone/team runs, survives restore, and is already protected from concurrent duplicate activation by AgentRunActivationRegistry.
- Agent Tools HTTP transport is stateless per request. Only the active registry record holds current live authorization/execution context.
- The pre-ticket registry retained revoked objects. IR-001 correctly uses an active-only map with deletion on exact resource release; CRR-001 shows the supported Team-stop path currently fails to invoke that release.
- The existing shared Fastify server can listen on a configured wildcard/non-loopback host. getInternalServerBaseUrlOrThrow may generate 127.0.0.1 for internal clients, but that does not restrict direct network requests to the listener.
- A supported specific non-loopback `--host` is preserved by `server-runtime-endpoints.ts`; a same-host provider therefore connects through the non-loopback interface and cannot pass a loopback-only Agent Tools gate on the main listener. ARCH-F-002 identified this reachable gap.
- The user approved one application-wide loopback-only Agent Tools listener shared by every run. It is one additional in-process HTTP listener, not one listener or process per agent. The main requested bind stays exact.
- Existing api/security/remote-access-local-trust.ts supplies authoritative peer-address normalization and IPv4/IPv6 loopback classification. Agent Tools can reuse it and additionally require a loopback Host header.
- /mcp/gateway is independent: McpGatewayAccessGate allows local loopback access without a configured token or requires/validates AUTOBYTEUS_MCP_GATEWAY_TOKEN according to its current contract; its catalog/dispatcher/executor do not use Agent Tools run sessions.
- The latest user-approved direction removes internal Agent Tools bearer generation, token hash/header, durable encrypted binding, vault/store/sync/deletion machinery, and Codex/Claude persistence-policy split.
- CRR-001 established a reachable downstream Design Impact: `TeamRunService -> AgentTeamRunManager -> RootTeamRun/TeamRun -> MixedTeamManager -> MixedAgentMemberHandle -> AgentRun` commits member termination without invoking the manager/activation-registry/resource-release path. The stopped route therefore remains active.
- The correction is an ownership fix, not new product behavior: published AgentRun two-phase termination must be prepared/finalized through `AgentRunManager`; cancellation changes no resource state, accepted completion releases the exact run before success, and rejected completion keeps it managed. Dormant partial-owner Agent Tools deactivation APIs have no supported caller and are removed.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/evidence/session-unavailable-after-team-resume.png | User-supplied failure evidence | REQ-001, REQ-003 | AC-001, AC-004 | Evidence / N/A | Establishes visible restored-tool failure. |
| /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/evidence/codex-app-server-mcp-rebind-probe.md | Codex 0.150.1 causal probe | REQ-001 | AC-002 | Investigation evidence / N/A | Proves an already-loaded thread requires a stable descriptor; conclusion is revised for the universal tokenless endpoint. |
| /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/evidence/full-product-software-team-reproduction.md | Exact full-product reproduction | REQ-001–REQ-006 | AC-001–AC-004 | Investigation evidence / N/A | Defines the regression journey and preserved fast setting. |
| /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/evidence/full-product-software-team-session-unavailable.png | Exact-repro screenshot | REQ-001, REQ-003 | AC-001, AC-004 | Evidence / N/A | Corroborates both failures after restore. |
| /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/evidence/external-mcp-gateway-settings.png | External MCP Gateway settings evidence | REQ-008 | AC-010 | Evidence / N/A | Confirms separate endpoint and optional configured gateway bearer UX. |
| /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/design-review-report.md | Architecture review through ARCH-REV-004 | All | All | Review authority / N/A | Records the SR-003 pass and prior requirement-gap decisions. |
| /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/architecture-review-revision-record.md | Architecture-review history | All | All | Review history / N/A | Records design-review history through the SR-003 pass. |
| /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/code-review-report.md | CRR-001 implementation source review and supported Team-stop path evidence | REQ-003, REQ-007 | AC-004, AC-007, AC-013 | Review authority / N/A | Establishes CR-F-001 Design Impact and CR-F-002 exact-run cleanup. |
| /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/code-review-revision-record.md | Code-review history | REQ-003, REQ-007 | AC-004, AC-007, AC-013 | Review history / N/A | Records CRR-001 and reroute to solution design. |

## Design Health Assessment (Mandatory)

- Change posture: Bug Fix and approved simplification/refactor.
- Design issue signal: Confirmed.
- Root cause classification: Missing Invariant and Boundary Or Ownership Issue.
- Refactor posture: Bounded Refactor Required.
- Evidence basis: random capability identity is activation-scoped while provider MCP configuration can be run/thread-lifetime-scoped; the main listener has independent bind semantics; and CRR-001 proves the supported Team stop bypasses the manager/resource owner that alone releases published AgentRun resources. The simplified design reuses immutable run identity, gives trusted-local transport one owner, and makes `AgentRunManager` the single published-run two-phase termination/finalization boundary used by both direct and Team stops.
- Requirement or scope impact: Agent Tools MCP core, its dedicated local listener, Studio/standalone composition/lifecycle, provider materializers, scoped authority/release naming, local HTTP gate, and the existing AgentRun-manager/Mixed-member termination boundary change. Team product semantics, secret management, memory sync, persistent schemas, Codex process pooling, requested main bind semantics, UI, managed-messaging base URL, and external MCP Gateway behavior do not change.

## Recommendations

- Derive one fixed-length non-secret run-session ID from canonical normalized run ID, with an Agent Tools-owned function and deterministic test vectors.
- Use one synchronous activateForRun/deactivateForRun lifecycle for Codex and Claude.
- Keep AgentToolMcpSession active-only and remove tokenHash, revokedAt, bearer generation/comparison, descriptor headers, redacted-secret descriptor variants, and retained tombstones.
- Route all termination of a published AgentRun—including a Mixed Team member—through one `AgentRunManager`-owned reversible prepare / committed finish boundary. Delegate to `AgentRun` for quiescence/runtime stop, then remove the exact current run and release resources before returning accepted. Never deactivate on cancel or rejected finish.
- Remove the unused generic partial-owner Agent Tools deactivation methods; exact normalized run ID is the only normal cleanup identity, while scoped close iterates its exact owned session IDs.
- Gate every Agent Tools request, including OPTIONS and unsupported methods, on actual loopback peer plus loopback Host before registry lookup.
- Keep existing loopback Origin checks and redacted inactive 404.
- Host Agent Tools on exactly one process-wide Fastify listener bound to `127.0.0.1` with an OS-assigned port. Do not register its routes on the main Studio/standalone listener.
- Start the local listener before any run recovery/activation, keep its base URL immutable until process shutdown, fail startup closed if it cannot listen, and close it with the application host.
- Inject the dedicated base URL directly into Agent Tools descriptor construction. Do not reuse or overwrite `AUTOBYTEUS_INTERNAL_SERVER_BASE_URL`, which remains owned by managed messaging/main-server topology.
- Do not add persistence, secret-vault, memory-sync, deletion, migration, or Codex-process machinery.
- Preserve /mcp/gateway independently and add regression coverage that proves its current optional bearer/non-local behavior is unchanged.

## Scope Classification (Small/Medium/Large)

Medium: the corrected target is materially smaller than SR-001, but it changes a shared Agent Tools contract used by Codex and Claude, request admission, lifecycle naming, and coverage across provider/run/team boundaries.

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- UC-001: Stop and restore a Codex-backed classroom/software-engineering team member, then use its team tools through the same provider thread and deterministic run endpoint.
- UC-002: Stop and restore a Claude-backed standalone/team run through the same deterministic activate/deactivate contract.
- UC-003: Restore while another same-workspace Codex run keeps the shared app-server process alive, with no process restart/addition.
- UC-004: Apply a supported stopped-run model/reasoning/service-tier change during restore.
- UC-005: Repeat stop/restore and application restart/restore without active-registry growth or persistent Agent Tools data.
- UC-006: Deny non-loopback requests to the tokenless Agent Tools route even when Fastify listens on wildcard/non-loopback interfaces.
- UC-007: Preserve current external MCP Gateway endpoint, settings, optional token, access gate, tools, and execution.
- UC-008: Launch Studio or standalone on a specific non-loopback host, preserve that exact main bind, and use Agent Tools successfully through the separate process-wide loopback listener.
- UC-009: Start and stop either application host with exactly one Agent Tools listener, including fail-closed startup cleanup and no independent listener restart/rebind while provider processes may cache its URL.
- UC-010: Commit a supported Team-row stop and release every materialized member through the authoritative AgentRun termination/finalization boundary; cancel preparation or reject member termination without falsely deactivating or reporting Team success.

### Out of Scope

- General model speed/performance work.
- Patching Codex or replacing provider conversation threads.
- Adding a per-run/per-agent listener, a second AutoByteus/Codex process, a public Agent Tools listener, or a user-configurable Agent Tools host/port.
- Changing the requested main Studio/standalone bind, generic internal-base derivation, standalone public-base semantics, or managed-messaging transport.
- General MCP tool-topology refresh for an already-loaded thread.
- Changing AgentTeam product semantics, team definitions, or UI; the in-scope manager/member refactor only enforces the already-approved committed-stop and cancellation outcomes.
- Changing /mcp/gateway behavior, its optional token, catalog, dispatcher, executor, or external-client documentation.
- Persisting Agent Tools endpoint IDs, credentials, live contexts, or bindings.
- Treating deterministic hashing/encoding as authentication.

### Preserved Behavior Boundary

- Preserve full stop, current run/team/provider identities, stored history/config, current exposed tool set for the saved run, live owner/team execution checks, tool approvals, redacted inactive 404, MCP protocol behavior, Codex cwd process sharing, exact requested main bind behavior, managed-messaging internal-base behavior, and all external gateway contracts.
- Stable same-run endpoint reactivation is intentional: a provider client retained from that same run can call tools only while that run is active.
- The Agent Tools base URL is stable for one application-server process. An application restart may receive a different OS-assigned local port; that restart also replaces the local Agent Tools listener and provider process, while the deterministic run-session ID/path remains identical.

### Review Authority

- Blocking findings must trace to approved requirements, acceptance criteria, or preserved behavior IDs.
- Any new remote-access policy beyond loopback-only internal Agent Tools, or any gateway behavior change, is a Requirement Gap.
- ARCH-F-001 remains resolved by SR-002. ARCH-F-002 and the user's 2026-08-28 approval of the shared loopback listener are authoritative for SR-003.

## Functional Requirements

- **REQ-001 — Deterministic run endpoint:** Canonical AutoByteus run ID must deterministically yield one stable, fixed-length, non-secret Agent Tools run-session ID and route path for the lifetime of that run history. No provider conversation ID, random value, bearer, or persisted binding may participate.
- **REQ-002 — Unified provider activation:** Codex and Claude must both require the same process-composed, provider-independent activateForRun contract and descriptor shape. Provider adapters may choose when activation occurs, but not how identity, transport base, or authorization is defined. No provider/global default issuer may bypass the AgentToolsMcpHost-owned readiness boundary.
- **REQ-003 — Active-only lifecycle:** Activation must build and register fresh live owner, sender, runtime exposure, execution context/capabilities, routes, configured sources, and observer under the deterministic run-session ID. Stop/failure/scope close must delete that active record. A successful committed Team stop must not return until each accepted member termination has deleted its exact record; reversible preparation/cancellation and rejected termination must not deactivate it. Duplicate concurrent activation for the same run must fail.
- **REQ-004 — Loopback-only Agent Tools:** Agent Tools routes must exist only on the dedicated `127.0.0.1` listener. Every request to `/mcp/agent-tools/:runSessionId`, including OPTIONS and unsupported methods, must also be admitted only when the actual socket peer and Host are loopback. Listener binding and request admission are complementary controls.
- **REQ-005 — No internal bearer or persistence:** Agent Tools descriptors and provider materializers must omit Authorization/header configuration. Agent Tools request handling, models, registry, and authority must contain no per-run bearer generation, parsing, token hash/comparison, redacted-secret descriptor, encrypted sidecar, vault, store, sync, or deletion machinery.
- **REQ-006 — Identity/configuration preservation:** Restore must retain the AutoByteus run/team-member identity and provider conversation identity while applying current supported model/reasoning/service-tier configuration and recomputing the same run-session ID.
- **REQ-007 — Bounded restart/resource behavior:** Server restart starts with an empty Agent Tools registry and creates exactly one process-wide local listener with no preload. Lazy activation recomputes the same ID from saved run identity. Every accepted termination of a published AgentRun—including Team-member termination—must release that exact run's attached resources once before its owning stop operation succeeds. Repeated run lifecycle and final application shutdown return active counts, resource attachments, and listener/socket counts to baseline without changing Codex process pooling.
- **REQ-008 — External gateway preservation:** /mcp/gateway, Settings > MCP Gateway, McpGatewayAccessGate, AUTOBYTEUS_MCP_GATEWAY_TOKEN, gateway Origin/access behavior, MCP-origin catalog, dispatcher, executor, and external client configuration must remain functionally unchanged and independent of active Agent Tools sessions.
- **REQ-009 — Transport/error preservation:** After local admission, current method, Origin, content type, Accept, protocol version, JSON-RPC, SSE compatibility, and dispatch behavior remain. Unknown/inactive run-session IDs return the existing redacted 404 session_unavailable; non-local requests return a generic forbidden response without run lookup detail.
- **REQ-010 — Dedicated local transport lifecycle:** Studio and standalone must each create exactly one Agent Tools HTTP listener per application-server process, bind it to `127.0.0.1` with an OS-assigned port, and share it across all run-session routes. The listener must be ready and its immutable process-lifetime base URL available before run recovery/activation. Agent Tools startup failure must fail the application-host startup and unwind both listeners/resources. Application shutdown must stop all runs/release their provider resources before closing the local listener exactly once; no cached provider process may survive the host boundary with a dead local URL. The listener must not restart or rebind independently while the process remains active. Agent Tools must not consume or mutate the general `AUTOBYTEUS_INTERNAL_SERVER_BASE_URL` contract.

## Acceptance Criteria

- **AC-001 — Exact Codex reported flow:** A real Software Engineering Team using Codex GPT-5.6 Luna can use get_handoff_rules and send_message_to, be stopped, change Default to fast, and be restored by a follow-up; the same run/thread uses fast and both tools succeed after restore.
- **AC-002 — Deterministic descriptor:** For a fixed normalized run ID, create, stop/restore, and application restart/restore produce exactly the same run-session ID and route path for both Codex and Claude. During one application-server process, the complete descriptor URL is unchanged across stop/restore because the dedicated local-listener base is immutable. After an application restart the OS-assigned port may differ, but the new provider process receives the new base plus the identical run path. Different run IDs produce different fixed-length IDs. The algorithm has deterministic test vectors.
- **AC-003 — Same-process Codex regression:** With another run keeping the cwd-shared Codex app-server alive, the restored thread's cached endpoint is the same endpoint reactivated by AutoByteus; its tool call succeeds without another app-server process or thread replacement.
- **AC-004 — Dormant/active lifecycle:** The stable endpoint succeeds only while its exact run is active. A committed accepted standalone or Team-member stop returns redacted 404 before stop success is returned; restore succeeds again at the same ID with fresh live context; final stop removes it again. A cancelled preparation or rejected termination leaves the current endpoint active and does not report successful stop.
- **AC-005 — Tokenless clean cut:** Agent Tools descriptors for both providers contain no Authorization/header field; requests need no bearer; Agent Tools production code contains no token generation/hash/timing comparison or redacted-secret descriptor path. Supplying an arbitrary Authorization header grants no authority.
- **AC-006 — Loopback admission:** The production listener accepts provider traffic through its IPv4 loopback descriptor. Gate-level coverage recognizes IPv4 loopback, IPv6 loopback, and IPv4-mapped loopback peers with a loopback Host as local if presented. LAN/non-loopback peers, spoofed loopback Host from a non-loopback peer, and non-loopback Host through a loopback peer are rejected before registry lookup, including OPTIONS.
- **AC-007 — Resource/restart bound:** At least two standalone/Team run lifecycle cycles and one server-restart simulation leave no inactive/tombstone records and no persisted Agent Tools files/records. Each accepted published-run termination releases its exact AgentRun resource attachment and Agent Tools record once; cancellation/rejection releases neither. One process has one shared listener regardless of run count; final active registry, run-resource, and listener/socket counts return to baseline.
- **AC-008 — Persisted data unaffected:** Existing standalone/team history and imported memory remain directly usable without migration or new files. Secret-vault and memory-sync behavior/tests require no Agent Tools-specific changes.
- **AC-009 — Provider convergence:** Focused coverage proves Codex bootstrap and Claude session tooling both require and call the same process-composed run activator, with no global/default Agent Tools issuer fallback, and materialize the same headerless descriptor contract; Claude provider session/history behavior otherwise remains unchanged.
- **AC-010 — External gateway regression:** Existing /mcp/gateway local access, configured-token validation/non-local rules, settings endpoint/config snippet, Origin handling, catalog, list/call dispatch, and executor behavior pass unchanged with no AgentRun active.
- **AC-011 — Main-bind independence:** For loopback, wildcard, IPv4 specific-non-loopback, hostname specific-non-loopback, and global-IPv6 main binds, the requested main listener and generic internal-base derivation remain unchanged. Agent Tools is absent from the main listener, while both Codex and Claude descriptors use the one `127.0.0.1:<assigned-port>` Agent Tools listener and valid calls succeed. A request to the main listener's Agent Tools-shaped path cannot dispatch an Agent Tool.
- **AC-012 — Local-listener readiness and failure safety:** The Agent Tools listener is established before run recovery/activation and exposes its base only after a verified TCP listen address exists. Binding/start failure aborts host startup and closes any started main/local server and process resources. Normal shutdown stops application/general runs and releases provider clients before closing the local listener exactly once; partial-startup unwind also closes it exactly once. No provider descriptor can be issued before readiness, no provider client survives a completed application-host shutdown, and the local listener never independently restarts onto a changed port in the same process.

- **AC-013 — Authoritative Team-member finalization:** Focused production-path coverage exercises `TeamRunService -> AgentTeamRunManager -> RootTeamRun/TeamRun -> MixedTeamManager -> MixedAgentMemberHandle -> AgentRunManager`. Before commit, cancellation delegates to the prepared AgentRun and preserves activation/resources. After commit, an accepted member runtime finish removes the exact current AgentRun through `AgentRunActivationRegistry`, invokes `AgentRunResourceManager.release` once, deactivates only that run-session, and completes before Team stop returns success. A rejected finish leaves the handle/run/resources active. Cleanup failure or exact-run identity mismatch prevents successful Team stop. Restore then activates the same deterministic ID with fresh context. `MixedAgentMemberHandle` has no direct Agent Tools dependency and does not call `AgentRun.prepareTermination` directly.

## Constraints / Dependencies

- Codex 0.150.1 retains MCP clients for loaded threads; the descriptor path must not change for a given run.
- Canonical run ID is already persisted and exists before provider construction.
- AgentRunActivationRegistry already rejects active/pending duplicate activation of the same run; the Agent Tools registry must independently reject duplicate active ID insertion.
- The run-session ID is routing identity, not a secret or proof of authorization.
- Agent Tools is trusted only across local product processes; operating-system loopback binding plus route-local peer/Host/Origin admission enforce that trust boundary.
- The Agent Tools base URL comes only from its dedicated active listener. The generic internal server base remains independently derived from the requested main bind for managed messaging and other existing consumers.
- The dedicated listener is one Fastify/HTTP listener inside the existing AutoByteus process, not another AutoByteus server process and not a per-run resource.
- The authoritative task worktree remains /Users/normy/autobyteus_org/autobyteus-workspace-superrepo on codex/agent-tools-mcp-session-resume tracking origin/personal.
- The SR-003 pre-implementation audit was clean. The current worktree now contains uncommitted IR-001 source/test changes plus ticket artifacts; SR-004 is a design rework against that implementation state. The superseded SR-001 binding/vault/sync machinery remains absent and must not be reintroduced.

## Persisted Data Outcome (When Applicable)

- Stored subject/location: existing run/team execution history, provider IDs/rollouts, configuration, and communication history only.
- Required outcome: Not Affected.
- Existing data: use directly. The deterministic endpoint is recomputed from run ID and is never stored.
- New data: none.
- Unacceptable outcome: a new Agent Tools credential/binding file, database row, vault entry, schema field, migration, sync exclusion, or deletion hook.
- Availability/rollout: no migration, rewrite, maintenance window, compatibility reader, or data cleanup is required. Superseded binding/vault/sync implementation artifacts are absent and must remain absent.
- Related IDs: REQ-001–REQ-010 / AC-001–AC-013.

## Assumptions

- AutoByteus run IDs are immutable and globally unique within the running server/history domain.
- Hash collision risk for a full SHA-256-derived fixed-length route key is negligible; registry insertion still fails on any active collision.
- Normal provider HTTP clients send a loopback Host when using the generated loopback descriptor.
- The operating system can allocate an available IPv4 loopback TCP port during application-host startup.
- General tool-definition change while a Codex thread remains loaded is not part of this approved behavior.

## Risks / Open Questions

- Stable endpoint identity intentionally survives stop conceptually, although it is executable only while active.
- Any local process can reach an active tokenless Agent Tools endpoint if it learns/guesses the non-secret run key; this is part of the approved trusted-local-process model.
- Host-header enforcement may reject unusual local proxying/custom-host workflows; those are outside the internal provider path and must not weaken the gate without new approval.
- A local listener start failure now prevents the application host from starting; this fail-closed behavior is intentional because otherwise every Agent Tools call would fail after activation.
- An OS-assigned port may change across complete application restarts, but not during one process lifetime. A provider process must not outlive that application-server process boundary.
- Earlier partial persistent-binding implementation work has been cleared from the worktree. Implementation engineering must not recreate or layer the superseded design onto the clean baseline.
- General same-process tool-topology refresh remains unresolved and outside scope.

## Approval Status

- Requirements status: Approved.
- Approval date: 2026-08-28.
- Approval basis: ARCH-REV-002 records the user's tokenless deterministic-run approval; ARCH-REV-003 records ARCH-F-001 as resolved and raises only the specific-non-loopback bind gap. The user then explicitly approved the recommended single application-wide loopback-only Agent Tools listener while preserving the main bind and unchanged external gateway.
- Triggering findings: ARCH-F-002, Requirement Gap — User Approval Received and incorporated by SR-003; CR-F-001, Design Impact, and CR-F-002, Local Fix, incorporated by SR-004 without product-scope change.
- Supplements requiring approval: none; all are evidence/review context.
