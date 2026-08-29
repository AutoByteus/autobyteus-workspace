# Investigation Notes

## Status

Complete for SR-004 architecture-review return. SR-003 passed as ARCH-REV-004, but CRR-001 found a reachable Design Impact in the implemented Team-stop ownership path. SR-004 preserves the approved deterministic tokenless listener design and corrects published AgentRun termination/finalization so a successful Team stop cannot leave the run session active.

## Task / Problem Context

A supported AgentTeam stop/restore preserves the AutoByteus run and provider conversation but breaks Agent Tools in a surviving Codex app-server process because Codex keeps the earlier endpoint while AutoByteus creates a random replacement session. The approved repair is not credential persistence. It is one deterministic, non-secret, run-scoped local route for both Codex and Claude, with activation-only live state and explicit loopback-only HTTP admission.

ARCH-REV-003 confirmed SR-002's core design but found that a specific non-loopback main bind makes the current generic internal base non-loopback, so providers cannot reach an Agent Tools route that correctly requires loopback. The user approved separating transport ownership: exactly one in-process Agent Tools listener bound to `127.0.0.1` on an OS-assigned port, shared by all runs, while Studio/standalone main listeners keep their exact requested bind.

The independent external MCP Gateway remains a separate externally consumable product boundary and is not simplified.

CRR-001 traced the exact supported Team-row stop to `TeamRunService -> AgentTeamRunManager -> RootTeamRun/TeamRun -> MixedTeamManager -> MixedAgentMemberHandle -> AgentRun`. The handle uses `AgentRunManager` for activation but calls `AgentRun.prepareTermination()` directly for stop. Accepted runtime termination therefore never removes the published run from `AgentRunActivationRegistry` and never reaches `AgentRunResourceManager.release`, which is the implemented exact-run session-deactivation owner. The target correction makes `AgentRunManager` own the reversible prepare and committed finalization wrapper for every published AgentRun. Mixed Team remains free of an Agent Tools dependency.

## Bootstrap / Repository Context

- Repository: /Users/normy/autobyteus_org/autobyteus-workspace-superrepo
- Branch: codex/agent-tools-mcp-session-resume
- Upstream/base/finalization target: origin/personal
- Bootstrap base commit: bf396dd5ed541cf6ef2179b305132b079aadd7ab
- Shared checkout is not the authoritative task worktree.
- SR-003 passed architecture review as `ARCH-REV-004` and was implemented as uncommitted `IR-001`. The current worktree contains those source/test changes plus ticket artifacts; they are the current design-impact evidence, not a clean baseline. The superseded `codex-binding/` and `internal-secret-envelope.ts` paths remain absent.
- Solution design does not create or update `implementation-handoff.md`; the existing IR-001 artifact remains implementation-engineer-owned context for rework.

## Triggering Review / Approval

- Prior architecture result: `ARCH-REV-004` / Pass for `SR-003`; canonical report: /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/design-review-report.md
- Triggering code review: `CRR-001` / Fail / Design Impact; canonical report: /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/code-review-report.md
- Blocking finding: `CR-F-001` — supported Team stop bypasses AgentRun resource ownership and leaves the deterministic Agent Tools record active.
- Required cleanup in the same return: `CR-F-002` — remove dormant `deactivateForOwner(Partial<Owner>)`, registry owner-selector cleanup, and matching helpers; no supported caller exists.
- Required correction: preserve all approved SR-003 behavior; make `AgentRunManager` the authoritative two-phase termination/finalization boundary for published AgentRuns; have `MixedAgentMemberHandle` delegate exact-run preparation there; release resources/deactivate before accepted Team stop succeeds; preserve cancellation/rejection; keep Mixed Team independent from Agent Tools policy.
- Architecture review history: /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/architecture-review-revision-record.md
- Code review history: /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/code-review-revision-record.md

## Source / Evidence Log

| Date | Type | Source / Command | Purpose | Material Result | Design Consequence |
| --- | --- | --- | --- | --- | --- |
| 2026-08-27 | User evidence | evidence/session-unavailable-after-team-resume.png | Establish failure | Restored conversation works; AgentTeam handoff tool returns exact session_unavailable | Tool endpoint lifecycle mismatch |
| 2026-08-27 | Product execution | evidence/full-product-software-team-reproduction.md and paired screenshot | Execute exact requested workflow | Tools succeed before stop; Default→fast; same run/thread restores; both tools fail after | Exact regression criterion retained |
| 2026-08-27 | Runtime probe | evidence/codex-app-server-mcp-rebind-probe.md | Isolate Codex behavior | Same process ignores changed URL/token for loaded thread; unsubscribe/reload/rename fail | Endpoint must stay stable per run |
| 2026-08-27 | Team/run code | frontend terminate/restore stores; AgentTeamRunManager; MixedAgentMemberHandle; AgentRunManager | Trace supported lifecycle and identities | Same AutoByteus run/member and provider IDs survive restore | Run ID is stable derivation input |
| 2026-08-27 | Activation code | HEAD agent-execution/runtime/agent-run-activation-registry.ts | Verify concurrency | Active/pending duplicate claims for the same run are rejected | One active endpoint record per run is a supported invariant |
| 2026-08-27 | Agent Tools code | HEAD agent-tool-mcp-session.ts, registry, service, authority, scoped authority | Inspect current subject/lifetime | Random ID/token hash + live context; revoke leaves tombstone; generic issuer feeds both providers | Remove capability identity and tombstones; converge on run lifecycle |
| 2026-08-27 | Provider code | HEAD CodexThreadBootstrapper/materializer; ClaudeAgentToolsMcpSessionState/materializer | Compare integration | Codex issues during bootstrap; Claude lazily issues and caches; both ultimately need descriptor from current run | Same activateForRun interface, provider timing remains local |
| 2026-08-27 | Agent Tools route | HEAD agent-tools-mcp-routes.ts and http-gate.ts | Inspect admission | Bearer required; Origin limited to loopback if present; no peer-address gate | Remove bearer and add peer+Host loopback gate |
| 2026-08-27 | Listener/endpoints | HEAD server-runtime.ts and config/server-runtime-endpoints.ts | Test local-only premise | listener host is configurable/wildcard; internal URL normalizes wildcard to 127.0.0.1 only for generated URL | Descriptor host does not enforce reachability; route gate is mandatory |
| 2026-08-27 | Local trust utility | HEAD api/security/remote-access-local-trust.ts | Reuse peer classification | Normalizes IPv4, IPv6, mapped IPv4 and recognizes 127/8 and ::1 | Agent Tools gate reuses this authoritative function |
| 2026-08-27 | External gateway source | HEAD mcp-gateway/access, routes, helpers, catalog, dispatcher, executor; composition registrations | Verify independence | Separate route/gate/tool path; optional token controls non-local access; ToolOrigin.MCP only | Preserve whole functional contract, no Agent Tools dependency |
| 2026-08-27 | Gateway UI evidence | evidence/external-mcp-gateway-settings.png | Verify supported external surface | Settings shows /mcp/gateway and optional configured bearer header | Add BEH-008 and AC-010 |
| 2026-08-27 | Architecture review | design-review-report.md; architecture-review-revision-record.md | Capture superseding approval | ARCH-REV-002 fails old package and records user-approved universal tokenless design | SR-002 must replace authoritative direction |
| 2026-08-27 | Worktree audit | git status --short --branch; git status --porcelain=v2; path-existence checks; git show HEAD:path for baseline source | Avoid treating obsolete WIP as current authority | Earlier superseded source/test edits have been cleared; only the untracked ticket directory remains, and the proposed binding/envelope paths are absent | Design records the obsolete machinery as prohibited and implementation starts from the clean HEAD source baseline |
| 2026-08-28 | Architecture review | design-review-report.md; architecture-review-revision-record.md | Review SR-002 | ARCH-REV-003 verifies ARCH-F-001 resolved and identifies the specific-non-loopback bind path as reachable ARCH-F-002 | Product outcome required before listener design |
| 2026-08-28 | Main server startup | src/app.ts; src/server-runtime.ts; src/compositions/build-studio-server.ts | Trace Studio bind/route/lifecycle | CLI accepts arbitrary host; main Fastify listens exactly there; Agent Tools is registered on that same instance; main close hook owns application/resource shutdown | Remove Agent Tools registration from main; compose local listener into the same shutdown boundary |
| 2026-08-28 | Standalone startup | src/standalone-application-host/start-standalone-application-host.ts; config; src/compositions/build-standalone-application-server.ts | Trace supported non-loopback standalone path | Non-loopback is supported with publicBaseUrl; main listens exactly there; Agent Tools shares it; handle.close unwinds runtime/supervisor/MCP host/resources | Apply the same one-listener topology and balanced lifecycle to standalone |
| 2026-08-28 | Endpoint ownership | src/config/server-runtime-endpoints.ts; tests; src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-env.ts | Separate URL contracts | Generic env preserves specific host and is consumed by managed messaging as well as current Agent Tools | Do not mutate/redefine it; inject an Agent Tools-owned local base directly |
| 2026-08-28 | Agent Tools composition | agent-tools-mcp-host.ts; session-service.ts; routes; HTTP gate | Find transport owner seam | Host already owns registry/catalog/dispatcher/authority; service currently defaults to generic base URL; route deps are exposed to both composition roots | Extend host with one local-server lifecycle and keep route deps internal to that capability |
| 2026-08-28 | User decision | conversation following ARCH-F-002 | Resolve product contract | User approves one shared application-wide loopback listener; main API remains selected host; remote machines cannot reach Agent Tools; Codex/Claude remain tokenless | Add BEH-009, REQ-010, AC-011/AC-012 and SR-003 |
| 2026-08-28 | Architecture review | design-review-report.md; architecture-review-revision-record.md | Review SR-003 | ARCH-REV-004 passed the dedicated-listener design and routed implementation | IR-001 proceeded from SR-003 |
| 2026-08-28 | Implementation state | implementation-handoff.md; implementation-revision-record.md; `git status --short` | Establish current source state | IR-001 is present as uncommitted source/test changes; deterministic identity, local listener, provider convergence, and active deletion are implemented | SR-004 is a correction against real IR-001, not a greenfield design |
| 2026-08-28 | Code review | code-review-report.md; code-review-revision-record.md | Trace implemented supported Team stop | CRR-001 fails under CR-F-001 Design Impact and CR-F-002 cleanup; API/E2E must not proceed | Correct requirements/investigation/design and re-review architecture |
| 2026-08-28 | Team termination source | `team-run-service.ts:206-209`; `agent-team-run-manager.ts:334-345`; `root-team-run.ts:394-435`; `mixed-team-manager.ts:203-315`; `mixed-agent-member-handle.ts:180-217` | Independently verify CR-MP-001 | Root stop freezes/prepares/commits members; Mixed handle calls the lower-level `AgentRun.prepareTermination` and disposes on accepted finish | The supported stop bypasses manager-owned active-registry/resource finalization |
| 2026-08-28 | AgentRun ownership source | `agent-run-manager.ts:161-223`; `agent-run-activation-registry.ts:177-265`; `agent-run-resource-manager.ts:38-122`; `agent-run.ts:194-209,475-518` | Locate authoritative cleanup and reversible seam | Manager termination removes exact current run; activation-registry removal invokes resource release; resource release deactivates exact run session; direct AgentRun termination only stops backend/lifecycle | Add manager-owned prepared-termination wrapper and route direct/Team/stop-all published-run termination through it |
| 2026-08-28 | Agent Tools cleanup source | `agent-tool-mcp-session-authority.ts`; `scoped-agent-tool-mcp-session-authority.ts`; `agent-tool-mcp-session-registry.ts`; repository call search | Verify CR-F-002 | Partial-owner deactivation methods have declarations/forwarders/helpers only and no production/test caller | Remove; retain exact `deactivateForRun` and exact session-ID close iteration |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User / lifecycle | Stop team row then send a later member message | UI mutation -> TeamRunService/AgentTeamRunManager -> RootTeamRun frozen termination -> MixedTeamManager -> MixedAgentMemberHandle -> direct AgentRun finish; later restore -> same run/provider ID | Legacy random endpoint breaks restore; IR-001 also leaves the deterministic record active because direct member stop bypasses manager/resource release | Product reproduction; CR-MP-001; current IR-001 source |
| BEH-002 | System / provider | Provider needs Agent Tools descriptor | Codex bootstrap or Claude lazy session state -> same generic issueForRun -> provider-specific materializer | Timing differs but identity policy is already shared | Provider code |
| BEH-003 | User / configuration | Edit inactive model config | persisted stopped config -> rebuilt AgentRunConfig -> provider resume | Fast setting is applied independently of MCP | Product repro/tree |
| BEH-004 | Contract / transport | HTTP request to Agent Tools route | shared listener -> Agent Tools Origin/method gate -> bearer extraction -> registry resolve -> dispatcher | Bearer is current authority; listener may be remotely reachable | Route, server runtime, endpoint code |
| BEH-005 | Operational / lifecycle | Repeated stop/restart | Legacy revoke retained objects. IR-001 registry deletes on exact resource release, but Team member stop does not invoke that release. | Active record/resource attachment survives successful Team stop until later manager prune/restore/scope close; no persistence is required | Registry/resource/team source; CRR-001 |
| BEH-006 | Operational / persistence | Read/sync/delete history | current run/team stores and memory sync | Existing data has run ID and no Agent Tools binding | Store/sync code |
| BEH-007 | Contract / lifecycle | Activate a supported run, stop it, then call local Agent Tools | immutable run ID + exclusive activation claim -> live context; current Team stop bypass leaves it resident | Approved target remains deterministic routing identity plus activation-only execution; authoritative committed finalization must end that activation | User approval, ARCH-F-001, CR-MP-001 |
| BEH-008 | User / external contract | Copy Settings > MCP Gateway config and call it from an external client | /mcp/gateway -> McpGatewayAccessGate -> gateway dispatcher -> ToolOrigin.MCP catalog/executor | Independent of AgentRun and per-run Agent Tools | Screenshot and gateway source |
| BEH-009 | Operational / host topology | Launch Studio/standalone on a specific non-loopback hostname/IP | requested host -> main Fastify exact bind -> generic internal base preserves host -> current provider descriptor -> non-loopback request | Current main-listener coupling conflicts with loopback-only Agent Tools; target uses one separate `127.0.0.1` listener for all runs | ARCH-MP-007, startup/config source, user approval |

## Product-Reachability Classification

| Premise | Classification | Complete Witness / Reason | Design Effect |
| --- | --- | --- | --- |
| Surviving Codex process uses old run endpoint after stop/restore | Reachable | supported stop/restore while another same-cwd run holds process; exact product and direct probe | Stable run-derived route required |
| Non-loopback client reaches tokenless Agent Tools on wildcard listener | Reachable | supported configured listener bind -> active run -> direct network request to registered route | Peer+Host loopback gate required |
| Generated 127.0.0.1 descriptor alone makes route local | Not sufficient | URL construction controls provider target, not Fastify listener acceptance | Cannot substitute for request gate |
| Agent Tools simplification breaks external gateway | Not Reachable if boundaries remain separate | gateway has independent route/access/catalog/dispatcher/executor | Preserve and regression-test; do not couple |
| Two simultaneous active records for one run | Prevented by supported lifecycle; registry still defends | activation registry rejects active/pending duplicate claim | Registry duplicate insertion fails; no conflict recovery framework |
| Need to migrate stored endpoint data | Not Reachable | no current endpoint identity is stored; run ID already persists | Not Affected, no migration/persistence |
| Tool topology changes while loaded Codex thread survives | Unclear/out of scope | no approved supported trigger established in this ticket | No refresh machinery |
| Specific non-loopback main bind makes colocated provider request non-loopback | Reachable | supported CLI/standalone config -> exact main bind -> preserved generic base -> provider descriptor -> raw peer/Host non-loopback | Dedicated local Agent Tools transport required; do not weaken admission |
| One process-wide loopback listener preserves main bind and local trust | Approved target behavior | user-approved transport; one Node process can own the main Fastify listener and a separate loopback Fastify listener sharing in-memory dependencies | Design one balanced start/readiness/close lifecycle for both Studio and standalone |
| Need a listener per run/member | Not Reachable / unnecessary | all paths differ only by deterministic route segment and already share registry/dispatcher | Exactly one local listener per application-server process |
| Supported Team stop reaches AgentRun resource/session release in IR-001 | Reachable defect | exact UI trigger -> TeamRunService -> AgentTeamRunManager -> RootTeamRun -> MixedTeamManager -> MixedAgentMemberHandle -> AgentRun; manager/resource owner omitted | Correct the manager/member prepared-termination boundary before API/E2E |
| Cancellation should deactivate the Agent Tools record | Not approved / incorrect | AgentRun preparation is explicitly reversible and reopens input on cancel | Manager wrapper must delegate cancel without active-registry/resource mutation |
| Rejected member termination should release resources | Not approved / incorrect | existing Team and AgentRun finish return `accepted: false` to keep lifecycle retryable | Keep exact run/current session attached; Team stop cannot succeed |
| Generic partial-owner deactivation has a supported caller | Not Reachable | repository search finds declarations/forwarders only | Remove CR-F-002 APIs and matching helpers |

## Current Architecture / Ownership Findings

### Current primary flow

IR-001 activation/request: inactive team message -> team/run restore -> provider adapter -> deterministic active session -> headerless descriptor using the dedicated loopback base -> local listener/gate -> active registry -> dispatcher.

IR-001 supported Team stop: Team row stop -> TeamRunService -> AgentTeamRunManager -> RootTeamRun frozen scope -> MixedTeamManager -> MixedAgentMemberHandle.prepareTermination -> AgentRun.prepareTermination/commit/finish -> handle dispose -> Team success/unregister. This path does not reach AgentRunManager/activation-registry/resource release.

### Healthy owners to retain

- Team lifecycle owns Team preparation/commit ordering and provider/member composition; it must delegate published AgentRun termination to the AgentRun manager rather than finalize the lower-level run itself.
- AgentRunManager and AgentRunActivationRegistry own published-run activation identity, reversible managed termination, exact-current removal, and resource-release finalization.
- Scoped Agent Tools authority owns admission of run-owned live sessions and scope cleanup.
- AgentToolMcpSessionService owns exposure/capability/route composition and descriptor materialization.
- AgentToolMcpSessionRegistry owns live request lookup.
- Provider adapters own timing/config syntax, not endpoint identity policy.
- Agent Tools HTTP gate owns internal route admission.
- Studio and standalone application-host composition own process listener startup/shutdown ordering.
- McpGatewayAccessGate and gateway route/dispatcher/catalog/executor own the external route independently.

### Design issue

The original random bearer capability gave an activation-lifetime routing identity to provider clients whose configuration can live for the run/provider-history lifetime, while the main-server base had broader bind ownership. SR-003/IR-001 correctly fixes those concerns with immutable run identity, a dedicated trusted-loopback transport, and activation-only live execution. CRR-001 exposes a separate ownership defect inside that same lifecycle: Mixed Team activates a published AgentRun through `AgentRunManager` but terminates its lower-level `AgentRun` directly, bypassing the only owner that removes activation and releases resources. SR-004 strengthens that authoritative boundary instead of restoring a Team-local Agent Tools cleanup dependency.

## Published AgentRun Termination Ownership Decision

Selected target spine for every published run:

```text
Team/direct/stop-all caller
  -> AgentRunManager.prepareAgentRunTermination(exact AgentRun)
  -> AgentRun.prepareTermination()          # reversible quiescence only
  -> cancel                                 # reopen; no registry/resource mutation
  OR commit().finish()
  -> AgentRun committed runtime finish
  -> AgentRunManager exact-current finalization
  -> AgentRunActivationRegistry.removeIfCurrent(expectedRun)
  -> AgentRunResourceManager.release(expectedRun)
  -> scoped deactivateForRun(runId)
  -> active Agent Tools record deletion
  -> accepted result may return to Team stop
```

Ownership rules:

- `AgentRun` continues to own input quiescence, reversible cancellation, provider/backend termination, and its local lifecycle transition.
- `AgentRunManager` owns the managed wrapper because it already owns publication and is the only boundary with access to the exact active registration/removal policy. Its API accepts the exact `AgentRun` instance, not a partial owner selector; it verifies that instance is current before preparation.
- The manager wrapper caches one committed finish result/promise. On accepted and confirmed-inactive runtime completion it removes the exact current instance and asserts resource cleanup before returning accepted. Rejected completion performs no removal. Identity mismatch or cleanup error is a stop failure, never permission to release another run or report success.
- `MixedAgentMemberHandle` delegates preparation to the manager and only disposes its local subscriptions/reference after the managed finish returns accepted. It does not call `AgentRun.prepareTermination` directly and has no Agent Tools dependency.
- `AgentRunManager.terminateAgentRun` and `stopAllAgentRuns` reuse the same managed published-run termination/finalization path, eliminating parallel cleanup policy. Candidate abort remains a distinct unpublished-run cleanup path.
- `AgentRunResourceManager.release` remains the singular exact-run resource cleanup owner. It invokes exact `deactivateForRun(runId)` and detaches file/artifact/memory resources once.
- Scope close still iterates exact session IDs it owns. Generic partial-owner deactivation is not part of the target API.

This preserves the existing Team two-phase contract: prepare is reversible, durable/root commit is the point of no return, and accepted Team completion means local runtimes and their manager-owned resources are already finalized.

## Dedicated Local Listener Decision

Approved topology:

```text
AutoByteus application-server process
├── Main Studio/standalone listener: requested host + requested port
│   ├── UI/API/WebSocket/static routes
│   └── /mcp/gateway (Studio only, unchanged)
└── Agent Tools local listener: 127.0.0.1 + OS-assigned port
    └── /mcp/agent-tools/:runSessionId (all runs)
```

Properties and rationale:

- exactly one additional Fastify/HTTP listener per AutoByteus application-server process, never per run, team member, provider, workspace, or Codex app-server process;
- binds explicitly to IPv4 loopback `127.0.0.1` and requests port `0`, letting the OS select a free port without new user configuration or collision policy;
- does not register Agent Tools on the main listener, so a public/LAN main bind has no Agent Tools handler;
- retains raw-peer + Host + Origin admission on the local route as defense in depth;
- shares the existing in-process registry/catalog/dispatcher/authority; no proxy, IPC, second AutoByteus process, or duplicate session state;
- exposes an Agent Tools-owned base URL only after listen succeeds and keeps it immutable until application shutdown;
- starts before application recovery can activate runs; a provider cannot receive a descriptor before readiness;
- startup failure aborts the host and unwinds local/main/application resources rather than starting with predictably broken tools;
- no independent listener restart/rebind occurs while the application process and cached provider clients survive. A complete application restart may allocate a new port because provider processes are also torn down; the run-session ID/path remains deterministic;
- the existing generic `AUTOBYTEUS_INTERNAL_SERVER_BASE_URL` remains seeded from the main listen address for managed messaging and is no longer consumed by Agent Tools.

`AgentToolsMcpHost` is the natural capability owner because it already owns route dependencies and session authorities. An owned `AgentToolsMcpLocalServer` provides async `listen()`, synchronous readiness/base lookup, and idempotent async `close()`. Studio and standalone composition coordinate its start/stop with their main listener and application lifecycle.

## Deterministic Run-Session Identity Decision

Target algorithm:

1. canonicalize with normalizeStoredAgentRunId(runId);
2. UTF-8 encode the exact normalized string;
3. compute SHA-256;
4. base64url encode the full 32-byte digest without padding;
5. prefix with agtrun_.

Representative shape: agtrun_<43 base64url characters>, fixed total length 50.

Properties:

- deterministic across provider, stop/restore, process restart, and host;
- fixed-length and URL-segment safe;
- non-secret and not authentication;
- avoids exposing definition/display-name prefixes from run IDs in URLs;
- full SHA-256 collision risk is negligible; active registry still rejects duplicate insertion;
- only run ID participates. Team address and provider conversation ID remain live/independent metadata, preventing overlapping identity representations.

This function belongs to Agent Tools MCP because it defines that route's identity contract.

## Target Active Session Contract

Persisted: nothing.

Derived per activation:

- run-session ID from run ID;
- descriptor URL from the ready Agent Tools local-server base plus run-session ID;
- no headers.

Stored only in active registry:

- run-session ID;
- exact owner run/team identity;
- sender context;
- runtime kind/exposure;
- working/memory/application execution context;
- execution capabilities;
- enabled tools and route table;
- configured MCP sources;
- activation timestamp;
- execution observer.

Not present:

- capability token;
- token hash;
- revoked timestamp/tombstone;
- persisted binding/provider identity;
- encrypted envelope/secret;
- redacted descriptor variant.

## Loopback Admission Decision

Agent Tools moves off the main listener onto the dedicated `127.0.0.1` listener. Its route-specific gate must still, before OPTIONS, method handling, or registry resolution:

1. classify request.raw.socket.remoteAddress using isLoopbackPeerAddress from api/security/remote-access-local-trust.ts;
2. parse the Host header safely for IPv4/hostname or bracketed IPv6 and require localhost, 127/8, or ::1;
3. retain current Origin rule: absent or HTTP(S) loopback origin only;
4. return generic 403 forbidden on any non-local peer/Host/Origin failure;
5. after local admission, unknown/inactive run-session ID returns redacted 404.

The OS bind makes remote reachability unavailable; requiring both actual peer and Host prevents local proxy/Host confusion from widening the internal contract. Agent Tools may implement Host parsing within its existing HTTP gate while reusing shared peer classification; mcp-gateway files remain functionally and structurally unchanged.

## External MCP Gateway Independence

- Route: /mcp/gateway, not /mcp/agent-tools/:runSessionId.
- Access: McpGatewayAccessGate. With no configured token, current local-loopback request classification applies; with a configured token, bearer validation applies according to current behavior.
- Configuration: AUTOBYTEUS_MCP_GATEWAY_TOKEN and Settings > MCP Gateway snippet.
- Tools: ToolOrigin.MCP via McpGatewayToolCatalog.
- Execution: McpGatewayMethodDispatcher and McpGatewayToolExecutor.
- Registration: remains on the Studio main listener; Agent Tools moves to its dedicated listener.
- Target change: none. Agent Tools must not import gateway access gate, registry, or executor. Gateway must not import Agent Tools lifecycle/registry.

## Candidate Repair Boundary Evidence

| Candidate | Evidence / Consequence | Disposition |
| --- | --- | --- |
| Fresh random descriptor on restore | Codex ignores it | Remove |
| Persistent bearer/sidecar | Can match cache but adds secret/persistence complexity and provider split | Superseded by user approval; remove |
| New Codex process | Works but explicitly rejected and unnecessary | Reject |
| Direct raw run ID in URL | Stable/simple but leaks variable display/definition prefix and length | Reject in favor of full digest |
| Truncated digest | Shorter but needlessly raises collision analysis | Reject |
| Full SHA-256 base64url run key | Stable, fixed, safe, non-secret, no persistence | Selected |
| No route-local access gate | Makes network reachability invocation authority | Reject |
| Loopback peer only | Enforces network locality but permits non-loopback Host via local proxy | Reject for stricter internal contract |
| Loopback peer + Host + current Origin | Explicit trusted-local admission | Selected |
| Keep Agent Tools on main listener | Fails for specific non-loopback binds or becomes remotely reachable if the gate is weakened | Reject |
| Change specific host to wildcard/loopback | Violates requested bind semantics | Reject |
| Per-run loopback listener | Works but scales with run count and duplicates transport lifecycle | Reject |
| Conditional fallback listener only for non-loopback binds | Creates two transport topologies and inconsistent route placement | Reject |
| One process-wide dedicated `127.0.0.1:0` listener for all binds | Uniform local invariant, bounded, no user port policy | Selected by user |
| Reuse McpGatewayAccessGate | Couples internal per-run route to external token policy | Reject |
| Reuse shared peer normalization only | Avoids address drift without coupling route contracts | Selected |
| Modify gateway token/access behavior | Not needed; separate product contract | Reject |

## Persisted Data Transition Evidence (Mandatory)

- Existing subjects: run/team metadata, provider conversation IDs/rollouts, config, communication history.
- Target stored subject: none.
- Relevant schema change: none.
- Normal readers: already provide immutable run ID before provider activation.
- Decision: Not Affected.
- Rationale: deterministic ID is pure runtime derivation. No record is written/read/transformed. Existing and imported histories work directly.
- Forbidden additions: sidecar, DB row, metadata field, vault entry, migration, sync exclusion, deletion hook, compatibility reader.
- Rollout note: the earlier partial source files from the superseded implementation are absent in the final audit and were never persisted product data. They require no migration and must not be reintroduced.

## Failure / Cleanup Findings

- activateForRun is synchronous. It resolves exposure, creates live session with deterministic key, and records it in the scope ledger before returning a descriptor.
- If ledger admission fails, registry activation is immediately deactivated.
- If provider startup fails after activation, existing AgentRunManager failed-preparation compensation deactivates by run.
- Direct stop, stop-all, and scope close deactivate/delete active registry records. IR-001 Team-member stop currently bypasses this path; SR-004 routes its reversible preparation and committed finish through AgentRunManager.
- Cancellation delegates to AgentRun preparation cancellation and leaves activation/resources/session intact. Rejected runtime finish likewise retains the exact managed run. Accepted finish must confirm inactivity, remove the exact current run, release resources/deactivate, and only then return accepted.
- Duplicate active key/run throws; it does not overwrite live context.
- No async persistence transaction, provider-thread commit, secret failure, or file compensation remains.
- Zero enabled tools should return not_exposed and create neither registry nor ledger entry.
- Local listener `listen()` failure is an application-host startup failure. Partial startup closes every started Fastify instance and process resource exactly once.
- Descriptor construction requires local-server readiness and never falls back to the generic main base.
- Main and local listener shutdown is idempotent. The local server exposes no restart/rebind path; unforeseen OS/process failure is not recovered onto a new port while cached provider clients survive.

## Existing Coverage Findings

Current coverage asserts random bearer behavior and mock descriptor creation. Revised scenario intent:

- deterministic identity test vectors and normalization;
- active-only registry activate/resolve/deactivate/duplicate behavior;
- no token/hash/header/redacted descriptor;
- loopback peer/Host/Origin matrix, including OPTIONS and pre-lookup ordering;
- same activation API used by Codex and Claude;
- manager-owned published-run prepared termination: cancel/no cleanup, reject/no cleanup, accepted exact-current removal/resource release once, identity mismatch/cleanup failure blocks success;
- exact Mixed Team committed stop reaches the manager boundary and makes the endpoint inactive before Team success; later restore reuses the ID with fresh context;
- MixedAgentMemberHandle contains no direct Agent Tools dependency and no direct `AgentRun.prepareTermination` call;
- exact Codex same-process stop/restore;
- repeated lifecycle and restart empty registry;
- no Agent Tools persistence/secret/memory-sync dependencies;
- unchanged external gateway local/configured-token/non-local/catalog/dispatch behavior.
- local listener topology across loopback, wildcard, IPv4/hostname/global-IPv6 specific main binds;
- absence of Agent Tools route registration on both main composition roots;
- exactly one local listener independent of run count, base readiness before recovery, immutable base during process lifetime, startup-failure unwind, and idempotent close;
- continued generic internal-base behavior for managed messaging and the requested main listener.

Final durable coverage edits/removals belong to downstream API/E2E ownership after implementation/code review.

## Relevant Files / Components

| Path / Component | Current Responsibility | Revised Design Relevance |
| --- | --- | --- |
| src/agent-tools/mcp/agent-tool-mcp-session.ts | descriptor, owner/live session, token hash/revoked/redaction | Remove secret/tombstone shapes; retain active live subject |
| src/agent-tools/mcp/agent-tool-mcp-session-registry.ts | random create, token resolve, revoke tombstone | Derive/activate stable key, lookup by key, delete on deactivate |
| src/agent-tools/mcp/agent-tool-mcp-session-service.ts | exposure/capabilities/descriptor plus global singleton/default issuer | Universal activateForRun; require injected ready local-server URL; remove generic internal-base import and global fallback |
| src/agent-tools/mcp/agent-tool-mcp-session-authority.ts | generic issuer/releaser contracts | One run session activator/deactivator authority |
| src/agent-tools/mcp/scoped-agent-tool-mcp-session-authority.ts | scope ledger/cleanup | Record deterministic active runs; provider-independent lifecycle |
| src/agent-tools/mcp/agent-tools-mcp-host.ts | registry/catalog/dispatcher/authority composition | Own one local server; expose async listen/close; inject its ready base into authority/service |
| src/agent-tools/mcp/agent-tools-mcp-local-server.ts (new) | No current file | Dedicated Fastify construction, `127.0.0.1:0` listen, verified base/readiness, idempotent close |
| src/agent-tools/mcp/agent-tools-mcp-http-gate.ts | Origin/method/preflight gate and bearer helpers | Add peer+Host admission; remove bearer logic/authorization CORS header |
| src/agent-tools/mcp/agent-tools-mcp-routes.ts | bearer resolve + MCP dispatch | Resolve active session by run-session ID only |
| src/compositions/build-studio-server.ts | Builds main API and currently registers Agent Tools | Stop main-route registration; return/coordinate AgentToolsMcpHost lifecycle with cleanup |
| src/server-runtime.ts | Starts/closes Studio main listener | Start local listener after prepare and before recovery; close/unwind through host; preserve main bind and generic base seeding |
| src/compositions/build-standalone-application-server.ts | Builds standalone main server and registers Agent Tools | Remove Agent Tools route input/registration |
| src/standalone-application-host/start-standalone-application-host.ts | Starts/closes standalone main listener/resources | Start local listener before recovery; close/unwind once; preserve main URL/config |
| src/config/server-runtime-endpoints.ts | Generic main-server internal base for managed messaging | Functionally unchanged; Agent Tools stops importing it |
| src/agent-execution/backends/codex/...materializer/bootstrapper | Codex session issue/config with global issuer default | Require same injected activator; remove fallback; omit http_headers |
| src/agent-execution/backends/claude/...materializer/session-state | Claude lazy issue/config with global issuer default | Require same injected activator; remove fallback; omit headers |
| src/agent-execution/providers/agent-provider-factory-builder.ts | hands issuer to both providers | Hand same run activator to both |
| src/agent-execution/services/agent-run-manager.ts | publishes/removes active AgentRuns; direct stop and stop-all cleanup | Add one exact-instance prepared termination wrapper; reuse it for direct, Team, and stop-all published runs; accepted finish removes/releases before success |
| src/agent-execution/services/agent-run-resource-manager.ts | exact-run attached-resource lifecycle | Keep singular release owner; exact `deactivateForRun` plus file/artifact/memory detach |
| src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts | member activation, commands, local handle lifecycle | Delegate reversible published-run termination to AgentRunManager; dispose only after managed accepted finish; no direct AgentRun prepare and no Agent Tools dependency |
| src/agent-tools/mcp/agent-tool-mcp-session-authority.ts and scoped authority/registry | exact-run activation/deactivation plus scoped close | Remove dormant partial-owner deactivation contracts, forwarding, matchers, and registry helper |
| src/api/security/remote-access-local-trust.ts | peer normalization/loopback | Reuse unchanged |
| src/mcp-gateway/* | external gateway | Functionally unchanged; regression coverage only |
| secret-management, memory-sync, persistent file utilities | unrelated existing owners | No Agent Tools-specific changes; remove superseded WIP dependencies |
| design-review-report.md / architecture-review-revision-record.md | review authority/history | Include in cumulative re-review package |

## Constraints / Dependencies / Compatibility Facts

- No backward compatibility for old Agent Tools bearer/header config; clean cut.
- Existing histories are directly usable with no migration.
- External gateway bearer remains current behavior, not a compatibility mechanism for Agent Tools.
- Agent Tools URL identity is non-secret; loopback admission is the trust boundary.
- Agent Tools transport is always `127.0.0.1:<OS-assigned-port>` and owned independently from the requested main bind.
- Stable route does not imply live availability; active registry absence remains authoritative.
- Provider conversation IDs remain provider-owned and are not part of Agent Tools key derivation.
- Codex process manager/pooling remains untouched.
- `AUTOBYTEUS_INTERNAL_SERVER_BASE_URL` remains a main-listener/managed-messaging contract; no Agent Tools-specific environment variable or persisted port is needed.

## Open Unknowns / Residual Risks

- Local hostile processes can invoke an active run endpoint if they know the non-secret key; accepted by the user's trusted-local-process model.
- Strict Host checking may expose an existing internal provider quirk; implementation tests must confirm Codex and Claude generated loopback URLs send accepted Host forms.
- The OS-assigned local port changes on a complete application restart. Correctness depends on application shutdown also terminating/releasing loaded provider clients; this matches the existing full-process lifecycle and must be covered in startup/shutdown tests.
- The local listener cannot be healed by transparent rebinding to a new port while cached provider clients survive; no such in-process recovery path is designed.
- General tool-topology refresh remains out of scope.
- IR-001 is present and requires targeted rework. The earlier SR-001 binding/vault/sync work remains absent and must stay absent.

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Status / Approval |
| --- | --- | --- | --- |
| /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/evidence/session-unavailable-after-team-resume.png | Original user failure | BEH-001, BEH-004 | Current evidence / N/A |
| /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/evidence/codex-app-server-mcp-rebind-probe.md | Causal same-process evidence | BEH-001, BEH-002 | Current, conclusion revised / N/A |
| /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/evidence/full-product-software-team-reproduction.md | Exact product reproduction | BEH-001–BEH-005 | Current / N/A |
| /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/evidence/full-product-software-team-session-unavailable.png | Visual exact-repro evidence | BEH-001, BEH-004 | Current / N/A |
| /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/evidence/external-mcp-gateway-settings.png | Gateway endpoint/token UX | BEH-008 | Current / N/A |
| /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/design-review-report.md | Architecture review through ARCH-REV-004 | All | Current review / N/A |
| /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/architecture-review-revision-record.md | Architecture-review history through ARCH-REV-004 | All | Current review history / N/A |
| /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/code-review-report.md | CRR-001, CR-MP-001, CR-F-001, CR-F-002 authority | BEH-001, BEH-004, BEH-005, BEH-007 | Current review / N/A |
| /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agent-tools-mcp-session-resume/code-review-revision-record.md | Code-review reroute history | BEH-001, BEH-004, BEH-005, BEH-007 | Current review history / N/A |

## Notes For Architecture Reviewer

Confirm that SR-004 preserves every passed SR-003 decision and additionally:

1. corrects DS-002 to the real supported Team-stop spine rather than assuming resource cleanup;
2. makes AgentRunManager the single published-run reversible prepare / committed finalization boundary;
3. keeps AgentRun as the owner of quiescence/provider termination while exact-current removal/resource release remain manager/registry owned;
4. preserves cancellation and rejection without deactivation or false Team success;
5. requires accepted runtime finish, confirmed inactivity, exact-current removal, resource/session release, and cleanup assertion before Team success;
6. keeps MixedAgentMemberHandle free of Agent Tools policy and removes its direct lower-level termination bypass;
7. reuses the same managed finalization path for direct termination and stop-all so cleanup policy is not duplicated;
8. removes CR-F-002 partial-owner deactivation APIs and retains only exact-run plus exact-session scoped close;
9. adds exact unit/integration coverage for active -> committed Team stop -> inactive 404/zero record -> restore same ID/fresh context, plus cancel/reject/failure cases;
10. leaves the deterministic identity, dedicated listener, provider convergence, no-persistence result, main/gateway contracts, and no-migration outcome unchanged.
