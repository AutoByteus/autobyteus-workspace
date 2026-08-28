# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/design-spec.md`
- Supplemental Task Artifacts Reviewed: the five evidence artifacts, prior architecture-review artifacts, `IR-001` implementation handoff/revision record, and `CRR-001` code-review report/revision record in the cumulative package
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-004` correcting `SR-003`; `SR-002` and `SR-001` remain superseded history
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-005`
- Current Review Round: `5`
- Trigger: `/solution_designer` submitted `SR-004` after `CRR-001` found that the supported Team-row stop bypassed `AgentRunManager` resource/session finalization (`CR-F-001`) and retained unused partial-owner cleanup APIs (`CR-F-002`).
- Prior Review Round Reviewed: round 4 / `ARCH-REV-004` / `Pass`, plus downstream `CRR-001` / `Fail`
- Latest Authoritative Round: `5`
- Current-State Evidence Basis: the complete `SR-004` package; the uncommitted `IR-001` source state; independent reads of `AgentRunManager`, `AgentRun`, `PreparedAgentRunTermination`, `AgentRunActivationRegistry`, `AgentRunResourceManager`, `MixedAgentMemberHandle`, `MixedTeamManager`, direct termination and stop-all callers, the corrected Team-row production path, and the unchanged SR-003 listener/provider/gateway boundaries. `CR-MP-001` was independently revalidated from the supported Team termination surface through the current source.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: retain the user-approved deterministic tokenless run route, one shared loopback listener, provider convergence, active-only state, no persistence, and unchanged main/gateway contracts; additionally, a committed accepted Team-member stop must finalize the exact published `AgentRun` and its resources before Team success, while cancel/rejection preserves the run.
- Relevant existing behavior and evidence confirmed: `MixedAgentMemberHandle` currently calls `AgentRun.prepareTermination()` directly. That path can make the run inactive and dispose the handle without invoking `AgentRunActivationRegistry.removeIfCurrent` or `AgentRunResourceManager.release`; those owners are reached by manager-owned direct/stop-all cleanup. The existing `AgentRun` preparation is reversible and its committed finish is retryable after `accepted:false`.
- Scope guardrail confirmed: the correction changes the published-run ownership boundary only; it does not add Team-local Agent Tools policy or change Team product semantics, listener topology, provider identities, main-base behavior, persistence, gateway behavior, or the out-of-scope tool-topology problem.
- Approved change, preserved behavior, and outside scope understood: `AgentRunManager` becomes the single published-run prepared/finalization entry point. `AgentRun` retains quiescence/runtime termination, the activation registry/resource manager retain exact removal/release, and unpublished candidate abort remains separate.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes`; no prospective blocker remains.
- Remaining material ambiguity, if any: `None`.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | User / lifecycle | Pass | Pass — exact Team-row trigger and current bypass are established | Pass — managed accepted finish removes resources before Team success; restore reuses the route | Confirmed | None |
| `BEH-002` | System / provider | Pass | Pass | Pass — both providers require the same host-composed activator and headerless descriptor | Confirmed | None |
| `BEH-003` | User / configuration | Pass | Pass | Pass | Confirmed | None |
| `BEH-004` | Contract / security | Pass | Pass | Pass — admission remains unchanged; cancel/reject stays active and accepted stop becomes inactive before success | Confirmed | None |
| `BEH-005` | Operational / lifecycle | Pass | Pass | Pass — exact published-run removal/release is shared by Team, direct, and stop-all paths | Confirmed | None |
| `BEH-006` | Operational / persistence | Pass | Pass | Pass — no stored Agent Tools subject | Confirmed | None |
| `BEH-007` | Contract / lifecycle | Pass | Pass | Pass — non-secret routing identity remains distinct from live authority and ends at authoritative exact-run finalization | Confirmed | None |
| `BEH-008` | User / external contract | Pass | Pass | Pass — gateway remains on the Studio main listener and independent | Confirmed | None |
| `BEH-009` | Operational / topology | Pass | Pass — supported specific non-loopback launch and user-approved transport outcome | Pass — exact main bind plus one shared loopback Agent Tools listener | Confirmed | None |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `session-unavailable-after-team-resume.png` | Pass | Pass | Pass | Pass | Pass | None |
| `codex-app-server-mcp-rebind-probe.md` | Pass | Pass | Pass | Pass | Pass | None |
| `full-product-software-team-reproduction.md` | Pass | Pass | Pass | Pass | Pass | None |
| `full-product-software-team-session-unavailable.png` | Pass | Pass | Pass | Pass | Pass | None |
| `external-mcp-gateway-settings.png` | Pass | Pass | Pass | Pass | Pass | None |
| Prior design review and architecture revision record | Pass | Pass | Pass | Pass | Pass | Retain as review history; this round becomes authoritative |
| `implementation-handoff.md` and `implementation-revision-record.md` | Pass | Pass | Pass | Pass | Pass | Retain as `IR-001` implementation context; implementation owner updates them after rework |
| `code-review-report.md` and `code-review-revision-record.md` | Pass | Pass | Pass | Pass | Pass | Retain as `CRR-001` reroute authority and source-path evidence |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Bug fix plus bounded simplification/refactor is explicit | None |
| Root-cause classification is explicit and evidence-backed | Pass | Original identity/topology defects remain established; `CR-MP-001` additionally proves a missing invariant and manager-boundary bypass in Team termination | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Bounded refactor makes `AgentRunManager` the single published-run finalizer and removes partial-owner Agent Tools cleanup; tool-topology refresh stays deferred | None |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | Corrected `DS-002`, new `DS-008`, ownership/API maps, removals, file map, sequence, failure semantics, and focused coverage all reflect the decision | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Provider activation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-002` | Published-run direct/Team/stop-all termination | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-003` | Complete host restart/restore | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-004` | Local request/return | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-005` | External gateway | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-006` | Synchronous activation/compensation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-007` | Application-host listener lifecycle | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-008` | Managed exact-run termination mechanism | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Studio/standalone application-host lifecycle | Pass | Pass | Pass | Pass | Coordinates prepare, local/main listen, recovery, and compensated shutdown |
| `AgentToolsMcpHost` | Pass | Pass | Pass | Pass | Owns local server and Agent Tools assembly; exposes process-level lifecycle plus authorities only |
| `AgentToolsMcpLocalServer` | Pass | Pass | Pass | Pass | Owns fixed bind, private Fastify instance, readiness/base, and close state |
| Scoped run-session authority | Pass | Pass | Pass | Pass | Providers cannot bypass into service/registry |
| Session service / descriptor builder | Pass | Pass | Pass | Pass | Required private local-base reader; no generic main endpoint fallback |
| Active registry | Pass | Pass | Pass | Pass | Active map only; identity derived from owner run ID |
| `AgentRunManager` | Pass | Pass | Pass | Pass | Exact-instance prepared wrapper owns published-run finalization and cleanup assertion |
| `AgentRun` | Pass | Pass | Pass | Pass | Owns reversible quiescence and runtime finish, not publication/resource finalization |
| `AgentRunActivationRegistry` / `AgentRunResourceManager` | Pass | Pass | Pass | Pass | Exact-current removal and exact-run release remain encapsulated below the manager |
| `MixedAgentMemberHandle` | Pass | Pass | Pass | Pass | Adapts Team termination through the manager and owns only local disposal |
| Agent Tools local access gate | Pass | Pass | Pass | Pass | Admission precedes all route work |
| External MCP Gateway | Pass | Pass | Pass | Pass | Independent main-listener boundary |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Application host -> `AgentToolsMcpHost` lifecycle | Pass | Pass | Pass | Pass | No raw local-server or route dependency ownership in main builders |
| Host -> local server and authority assembly | Pass | Pass | Pass | Pass | One process capability |
| Providers -> scoped activator | Pass | Pass | Pass | Pass | Global/default issuer fallbacks are removed |
| Authority -> service/registry/private base reader | Pass | Pass | Pass | Pass | Base readiness remains host-owned |
| Local server -> Agent Tools routes/logging | Pass | Pass | Pass | Pass | No gateway, provider, or main-bind dependency |
| Route -> access gate/registry/dispatcher | Pass | Pass | Pass | Pass | No activation or history dependency |
| Team/direct/stop-all -> `AgentRunManager` prepared finalizer | Pass | Pass | Pass | Pass | Team cannot call `AgentRun.prepareTermination` or cleanup internals directly |
| Manager -> `AgentRun` -> activation registry/resource manager | Pass | Pass | Pass | Pass | Runtime finish precedes exact-current removal and cleanup assertion |
| Resource manager -> exact `deactivateForRun` | Pass | Pass | Pass | Pass | No partial-owner selector or Team-to-Agent-Tools shortcut remains |
| Gateway -> gateway access/catalog/dispatcher | Pass | Pass | Pass | Pass | No Agent Tools dependency |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `deriveAgentToolMcpRunSessionId` | Pass | Pass | Pass | Low | Pass |
| `activateForRun` / `deactivateForRun` | Pass | Pass | Pass | Low | Pass |
| `AgentRunManager.prepareAgentRunTermination(expectedRun)` | Pass | Pass | Pass — exact object plus intrinsic run ID | Low | Pass |
| Authority factory with required `getLocalBaseUrl` | Pass | Pass | Pass | Low | Pass |
| Registry activate/resolve/deactivate | Pass | Pass | Pass | Low | Pass |
| `AgentToolsMcpHost.listen/close/sessionAuthorities` | Pass | Pass | Pass | Low | Pass |
| `AgentToolsMcpLocalServer.listen/requireBaseUrl/close` | Pass | Pass | Pass | Low | Pass |
| `StudioServer.agentToolsMcpHost` startup handle | Pass | Pass | Pass | Low | Pass |
| `AgentToolsMcpLocalAccessGate.validateRequest` | Pass | Pass | Pass | Low | Pass |
| Headerless `AgentToolMcpDescriptor` | Pass | Pass | Pass | Low | Pass |
| `McpGatewayAccessGate.validateRequest` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Stable run identity | Pass | Pass | Pass | Pass | Existing canonical run normalizer plus one Agent Tools digest function |
| Active lifecycle | Pass | Pass | N/A | Pass | Existing registry/service/authority are tightened |
| Process HTTP serving | Pass | Pass | Pass | Pass | Fastify and current host composition are reused; one focused local-server owner is justified |
| Assigned port/address validation | Pass | Pass | N/A | Pass | Standard Fastify/Node TCP address contract |
| Peer loopback classification | Pass | Pass | Pass | Pass | Reuse `isLoopbackPeerAddress`; keep Host/Origin route-specific |
| Main internal endpoint | Pass | Pass | N/A | Pass | Preserve unchanged and stop using it for Agent Tools |
| Provider materialization | Pass | Pass | N/A | Pass | Same activator and headerless config |
| External MCP Gateway | Pass | Pass | N/A | Pass | Preserve unchanged |
| Published-run reversible termination/finalization | Pass | Pass | N/A | Pass | Reuse existing `PreparedAgentRunTermination` contract behind a stronger manager-owned wrapper |
| Exact resource/session cleanup | Pass | Pass | N/A | Pass | Reuse activation registry and resource manager; remove dormant partial-owner cleanup |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent Tools MCP core | Pass | Pass | Pass | Pass | Identity, live state, local server, and route remain cohesive |
| Studio/standalone host composition | Pass | Pass | Pass | Pass | Owns cross-listener ordering/compensation only |
| Codex and Claude adapters | Pass | Pass | Pass | Pass | Timing/syntax only |
| Run lifecycle | Pass | Pass | Pass | Pass | Active-only cleanup and provider release |
| Published AgentRun lifecycle | Pass | Pass | Pass | Pass | Manager owns prepare/finalize; `AgentRun` and registry/resource manager retain their narrower responsibilities |
| Mixed Team member lifecycle | Pass | Pass | Pass | Pass | Team adapter delegates exact run without importing Agent Tools policy |
| API security peer trust | Pass | Pass | Pass | Pass | Reused unchanged |
| Generic runtime endpoint/managed messaging | Pass | Pass | Pass | Pass | Preserved separate owner |
| External MCP Gateway | Pass | Pass | Pass | Pass | Separate preserved owner |
| Secret/persistence/memory sync | Pass | Pass | Pass | Pass | Correctly excluded and prohibited |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Deterministic run-session ID | Pass | Pass | Pass | Pass | One pure Agent Tools-owned type/function |
| Headerless active session/descriptor | Pass | Pass | Pass | Pass | Provider-independent model |
| Activation input/result | Pass | Pass | Pass | Pass | Scoped authority contract |
| Peer loopback classification | Pass | Pass | Pass | Pass | Existing shared security utility |
| Local endpoint state | Pass | Pass | Pass | Pass | One server-owned readiness/base representation; not an environment variable |
| Prepared AgentRun termination contract | Pass | Pass | Pass | Pass | Existing reversible capability is reused; manager wraps rather than duplicates the shape |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentToolMcpRunSessionId` | Pass | Pass | Pass | Pass | Pass | Routing identity only |
| Active `AgentToolMcpSession` | Pass | Pass | Pass | N/A | Pass | No token, tombstone, or persistence fields |
| `AgentToolMcpDescriptor` | Pass | Pass | Pass | Pass | Pass | URL and enabled tools only |
| Local endpoint lifecycle state | Pass | Pass | Pass | N/A | Pass | One immutable base available only while listening |
| External gateway access config | Pass | Pass | Pass | N/A | Pass | Unchanged optional gateway token |
| Managed exact-run termination wrapper | Pass | Pass | Pass | Pass | Pass | Exact run identity only; stable commit, per-attempt finish coalescing, rejection retry, cached success/terminal failure |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-tool-mcp-run-session-id.ts` | Pass | Pass | Pass | Pass | Pure identity |
| Agent Tools session/registry/authority/service files | Pass | Pass | Pass | Pass | Active lifecycle and required private base injection |
| `agent-tools-mcp-local-server.ts` | Pass | Pass | Pass | Pass | Private Fastify, fixed bind, readiness/base, and idempotent close |
| `agent-tools-mcp-host.ts` | Pass | Pass | Pass | Pass | Complete process capability; raw route dependencies become internal |
| `agent-tools-mcp-local-access.ts` and HTTP gate/routes | Pass | Pass | Pass | Pass | Local policy then transport/dispatch |
| Studio/standalone builders and startup files | Pass | Pass | Pass | Pass | Main route removal plus balanced lifecycle orchestration |
| `server-runtime-endpoints.ts` | Pass | Pass | N/A | Pass | Explicitly unchanged |
| Codex/Claude materializers and state/bootstrap | Pass | Pass | Pass | Pass | Required activator, no headers/fallback |
| Run resource manager/callers | Pass | Pass | Pass | Pass | Unified deactivation |
| `agent-run-manager.ts` | Pass | Pass | Pass | Pass | One published-run prepared/finalization path reused by direct, Team, and stop-all callers |
| `agent-run-activation-registry.ts` / `agent-run-resource-manager.ts` | Pass | Pass | N/A | Pass | Existing exact-current removal and singular release remain authoritative |
| `mixed-agent-member-handle.ts` | Pass | Pass | Pass | Pass | Delegation/disposal only; no direct lower-level prepare or Agent Tools import |
| Agent Tools authority/scoped-authority/registry cleanup APIs | Pass | Pass | Pass | Pass | Remove partial-owner selectors/forwarders/helpers; retain exact run/session identities |
| `mcp-gateway/*` | Pass | Pass | N/A | Pass | Production unchanged; regression coverage only |
| Superseded binding/vault/sync paths | Pass | Pass | Pass | Pass | Explicitly prohibited and absent |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/agent-tools/mcp/` | Pass | Pass | Low | Pass | Three focused additions remain one coherent capability |
| Studio/standalone composition/startup | Pass | Pass | Medium | Pass | Owns ordering, not local-server internals |
| Provider adapter folders | Pass | Pass | Low | Pass | Syntax/timing only |
| `src/api/security/remote-access-local-trust.ts` | Pass | Pass | Low | Pass | Reused unchanged |
| `src/config/server-runtime-endpoints.ts` | Pass | Pass | Low | Pass | Separate generic main endpoint |
| `src/mcp-gateway/` | Pass | Pass | Low | Pass | Independent preserved boundary |
| Secret/memory-sync areas | Pass | Pass | Low | Pass | No target edits |
| `src/agent-execution/services` and `runtime` | Pass | Pass | Low | Pass | Existing published-run and cleanup owners are strengthened, not relocated |
| `src/agent-team-execution/.../mixed-agent-member-handle.ts` | Pass | Pass | Low | Pass | Existing adapter boundary is retained and narrowed |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent Tools capability-token generation/hash/compare | Pass | Pass | Pass | Pass | Loopback transport/gate plus active lookup |
| Revoked tombstones and revoke naming | Pass | Pass | Pass | Pass | Delete/deactivate |
| Descriptor headers/redacted-secret variant | Pass | Pass | Pass | Pass | Headerless descriptor |
| Global/default issuer and generic-base fallback | Pass | Pass | Pass | Pass | Required host-composed activator/private base |
| Main-listener Agent Tools registration | Pass | Pass | Pass | Pass | Dedicated local server only |
| Provider-specific persistence policy | Pass | Pass | Pass | Pass | Universal activator |
| SR-001 binding/vault/sync/deletion machinery | Pass | Pass | Pass | Pass | Prohibited inventory and clean baseline verified |
| External gateway bearer/access | Pass | Pass | Pass | Pass | Explicitly retained |
| Direct `MixedAgentMemberHandle -> AgentRun.prepareTermination` path | Pass | Pass | Pass | Pass | Replaced by exact manager-owned preparation/finalization |
| Partial-owner deactivation APIs and owner matchers | Pass | Pass | Pass | Pass | Remove `deactivateForOwner`, `deactivateSessionsForOwner`, forwarders, predicates, and obsolete coverage |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Old Agent Tools bearer/random IDs | No in target | Pass | Pass | Deployment regenerates provider configuration |
| Main/local dual registration | No | Pass | Pass | Local listener is the sole target |
| Existing histories/imports | No | Pass | Pass | Run ID is directly usable |
| SR-001 sidecar design | No | Pass | Pass | Remains absent |
| External gateway optional bearer | No compatibility issue | Pass | Pass | Current gateway contract |
| Direct Team lower-level termination and partial-owner cleanup APIs | No in target | Pass | Pass | Clean-cut manager boundary and exact-run/session cleanup only |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Existing run/team/provider history | `Not Affected` | Pass | Pass | N/A | Pass | Existing run ID drives pure derivation |
| Agent Tools endpoint/binding data | Do not create | Pass | Pass | N/A | Pass | Assigned port and run route are runtime-only |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Deterministic identity and active registry | Pass | Pass | Pass | Pass |
| Provider convergence/header/fallback removal | Pass | Pass | Pass | Pass |
| Local server and private base injection | Pass | Pass | Pass | Pass |
| Main-route removal and listener ordering | Pass | Pass | Pass | Pass |
| Partial startup and idempotent shutdown | Pass | Pass | Pass | Pass |
| Run/team cleanup | Pass | Pass | Pass | Pass |
| Manager-owned published-run termination rework | Pass | Pass | Pass | Pass |
| CR-F-002 dormant selector removal | Pass | Pass | Pass | Pass |
| Superseded machinery exclusion | Pass | Pass | Pass | Pass |
| Generic main endpoint and gateway preservation | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Stable create/stop/restore identity | Yes | Pass | Pass | Pass | Process base and run path lifetimes are distinguished |
| Main-bind independence | Yes | Pass | Pass | Pass | Specific LAN main bind versus loopback local listener is concrete |
| One listener shared across runs | Yes | Pass | Pass | Pass | Explicitly rejects per-run sockets |
| Startup/readiness/failure compensation | Yes | Pass | Pass | Pass | Ordering and fail-closed outcome are concrete |
| Complete restart versus forbidden in-process rebind | Yes | Pass | Pass | Pass | Provider cache lifetime is explicit |
| Tokenless Agent Tools versus gateway token | Yes | Pass | Pass | Pass | Separate contracts are explicit |
| Managed Team stop/cancel/reject | Yes | Pass | Pass | Pass | Exact flow distinguishes reversible preparation, retryable rejection, accepted cleanup, and terminal cleanup failure |
| Exact-current mismatch and concurrent finish | Yes | Pass | Pass | Pass | Same committed wrapper coalesces an attempt; mismatch never releases a replacement or becomes success |

## Material Premise Validation (Only When Needed)

### `ARCH-MP-005` — Agent Tools simplification disables or weakens the external MCP Gateway

- Related approved requirement or established contract: `BEH-008`, `REQ-008`, `AC-010`.
- Relevant behavior ID(s): `BEH-008`.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger or applicable governing contract: Settings > MCP Servers > MCP Gateway exposes `/mcp/gateway` for external-client use.
- Support evidence: screenshot plus separate current gateway route/access/catalog/dispatcher/executor and independent main-server registration.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: user copies gateway configuration -> external client calls the Studio main listener `/mcp/gateway` -> existing gateway access decision -> gateway dispatch/result.
- Lifecycle preconditions and material consequence at the claimed point: no Agent Tools local server, run-session ID, or registry participates.
- Reachability: `Not Reachable` for the claimed breakage under the target dependency and file boundaries.
- Review consequence / proportionate response: preserve gateway production files/behavior and run focused regression coverage; no shared Agent Tools policy.

### `ARCH-MP-006` — A loopback descriptor alone makes a main-listener Agent Tools route local

- Related approved requirement or established contract: `BEH-004`, `REQ-004`, `AC-006`, `AC-011`.
- Relevant behavior ID(s): `BEH-004`, `BEH-007`, `BEH-009`.
- Initiating basis kind: `Operational`.
- Independent product-supported initiating trigger or applicable governing contract: launch Studio on a wildcard/non-loopback requested host while an AgentRun is active.
- Support evidence: current main startup binds the requested host and currently registers Agent Tools there; URL construction never constrains listener reachability.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: main wildcard/non-loopback bind -> direct remote request to current Agent Tools route -> potential invocation authority if bearer is removed without topology change.
- Lifecycle preconditions and material consequence at the claimed point: current route is network reachable; target removes it from main and adds a loopback-only server plus route gate.
- Reachability: `Reachable` in current behavior; `Not Reachable` through the target main listener.
- Review consequence / proportionate response: main-route de-registration is mandatory; peer/Host/Origin admission remains defense in depth on the dedicated listener.

### `ARCH-MP-007` — Specific non-loopback-only main bind makes colocated Agent Tools requests non-loopback

- Related approved requirement or established contract: `BEH-009`, `REQ-004`, `REQ-010`, `AC-011`, `AC-012`.
- Relevant behavior ID(s): `BEH-001`, `BEH-002`, `BEH-004`, `BEH-007`, `BEH-009`.
- Initiating basis kind: `Operational`.
- Independent product-supported initiating trigger or applicable governing contract: operator selects a supported specific non-loopback `--host`/standalone host.
- Support evidence: main startup listens exactly on the value; generic endpoint derivation and tests preserve specific non-loopback hosts; current Agent Tools descriptor consumes that base.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: requested host -> exact main bind/generic base -> current non-loopback provider descriptor -> loopback gate incompatibility. Target instead starts one `127.0.0.1:0` local server before recovery and injects its verified base into both providers.
- Lifecycle preconditions and material consequence at the claimed point: without a separate transport every correct gate rejects the provider; with `SR-003` the main contract and local trust both hold.
- Reachability: `Reachable`; approved target response is complete and proportionate.
- Review consequence / proportionate response: `ARCH-F-002` is resolved by the dedicated one-process listener, main-route removal, private endpoint injection, and lifecycle coverage.

### `ARCH-MP-008` — A cached provider client survives a completed application-host shutdown and calls the old assigned port after restart

- Related approved requirement or established contract: `REQ-007`, `REQ-010`, `AC-002`, `AC-007`, `AC-012`; existing application-host shutdown contract.
- Relevant behavior ID(s): `BEH-005`, `BEH-009`.
- Initiating basis kind: `Operational`.
- Independent product-supported initiating trigger or applicable governing contract: normal Studio signal shutdown or `StandaloneApplicationHostHandle.close()`, followed by a supported fresh host start.
- Support evidence: current main Fastify close stops the application runtime; application scopes stop all team/agent runs and close session authorities; the general supervisor also stops all runs; Codex thread cleanup releases ref-counted workspace clients and closes the app-server process at zero references. `SR-003` makes run/provider-before-local close and no-surviving-client coverage explicit.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: supported close -> quiesce and stop application/general runs -> provider session/thread cleanup and client release -> local listener close -> completed host shutdown -> fresh host creates new listener and provider process.
- Lifecycle preconditions and material consequence at the claimed point: after successful completion, no cached provider client retains the old URL; unexpected crash/interruption is a distinct unsupported process-failure condition.
- Reachability: `Not Reachable` for a client surviving a completed supported shutdown when `AC-012` holds.
- Review consequence / proportionate response: allow OS port change only across complete host restarts; prohibit independent in-process listener rebind; require focused shutdown evidence rather than persistence or restart machinery.

### `ARCH-MP-009` — Supported Team-row stop bypasses published-run resource/session finalization

- Related approved requirement or established contract: `BEH-001`, `BEH-004`, `BEH-005`, `BEH-007`; `REQ-003`, `REQ-007`; `AC-004`, `AC-007`, `AC-013`; existing reversible Team/AgentRun termination contract.
- Relevant behavior ID(s): `BEH-001`, `BEH-004`, `BEH-005`, `BEH-007`.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger or applicable governing contract: the Agent Teams surface exposes termination for an active Team row; the reproduced supported action is the user stopping that team.
- Support evidence: `CR-MP-001`, the full-product reproduction, and current `IR-001` source show `TeamRunService -> AgentTeamRunManager -> RootTeamRun/TeamRun -> MixedTeamManager -> MixedAgentMemberHandle -> AgentRun.prepareTermination/finish -> handle disposal`, while exact published removal and resource/session release exist behind `AgentRunManager -> AgentRunActivationRegistry -> AgentRunResourceManager`.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: user stops the Team row -> current member finish makes the `AgentRun` inactive and disposes the handle -> current path omits published-run removal/resource release -> the deterministic Agent Tools record remains resolvable after Team success. `SR-004` changes the forward target path so the handle requests `AgentRunManager.prepareAgentRunTermination(exactRun)`, accepted finish removes the exact current registration and releases resources/session, and only then can the handle dispose and Team stop succeed.
- Lifecycle preconditions and material consequence at the claimed point: the member has a published active run and materialized Agent Tools session. Current success can leave the endpoint active; the target must preserve it on cancel/rejection but make it redacted-inactive on accepted committed stop.
- Reachability: `Reachable` in `IR-001`; the target response is within the already-approved active-only stop contract.
- Review consequence / proportionate response: `SR-004` is proportionate. It strengthens the existing published-run owner rather than adding Team-local Agent Tools cleanup, uses exact instance identity at both preparation and removal, shares the finalizer across direct/Team/stop-all, and makes mismatch or terminal cleanup failure prevent false success.

## Unresolved Approved-Behavior Or Current-State Gaps

`None`.

## Review Decision

`Pass` — `SR-004` resolves the design impact exposed by `CR-F-001` and incorporates the `CR-F-002` cleanup without changing the user-approved `SR-003` product contract. The exact-instance manager API, reversible cancellation, retry after rejected finish, per-attempt finish coalescing, cached success/terminal cleanup failure, exact-current mismatch protection, shared direct/Team/stop-all finalizer, and policy-free Team adapter are coherent and actionable. All previously passed deterministic identity, listener, provider, persistence, main-base, and gateway boundaries remain intact.

## Findings

`None`.

## Classification

`N/A — Pass`

## Recommended Recipient

`/implementation_engineer`

## Residual Risks

- Trusted local processes can invoke an active non-secret endpoint; this is explicitly accepted.
- Host parsing and admission-before-OPTIONS/method/lookup need exact coverage.
- Headerless Codex and Claude configurations require focused execution evidence.
- The assigned local port may change only across complete host restarts; shutdown coverage must prove provider-client teardown.
- Partial startup/close must not leak the private Fastify socket or skip later resource cleanup.
- Agent Tools must be absent from both main listeners, and the generic main endpoint/managed messaging and external gateway must remain unchanged.
- General loaded-thread tool-topology refresh remains out of scope.
- The clean baseline must not regain any SR-001 binding/vault/sync machinery.
- Implementation must preserve the specified prepared-wrapper state machine: concurrent `finish()` calls on the same committed wrapper coalesce; only `accepted:false` clears the current attempt for retry; accepted completion and cleanup failure are terminal and cached.
- A cleanup error can occur after the published registration/resource record has been removed; the owning Team/direct/stop-all operation must surface that terminal failure and must never retry against or release a replacement run.
- All published-run callers must actually converge on the manager wrapper. Architecture checks should prohibit direct `AgentRun.prepareTermination` from Team adapters and any Team import of Agent Tools/resource internals.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` — `ARCH-MP-009` independently traces the supported Team-row trigger through the current bypass and the approved corrected path; prior topology/lifecycle premises remain valid, and no machinery depends on an unsupported scenario.
- Notes: `ARCH-F-001` and `ARCH-F-002` remain resolved. `SR-004` resolves the upstream design portion of `CR-F-001` and specifies removal for `CR-F-002`; the uncommitted `IR-001` source still requires implementation rework and another source review.
