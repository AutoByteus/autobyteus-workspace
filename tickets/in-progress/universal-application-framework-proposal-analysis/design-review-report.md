# Design Review Report — Universal Application Dual-Host Foundation

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-spec.md`
- Supplemental Task Artifacts Reviewed:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/proposal-critical-analysis.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-self-validation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/sources/autobyteus-vertical-application-developer-experience-proposal.md`
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-010`; `SR-008`/`SR-009` are retained current-state context; `SR-007` remains withdrawn
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-008`
- Current Review Round: 8
- Trigger: `CRR-020` / `CR-015` after `API-REV-007` disproved the prior unchanged-publication-provider premise on the supported standalone Brief path.
- Prior Review Round Reviewed: round 7 / `ARCH-REV-007` (`Withdrawn — No Decision`)
- Latest Authoritative Round Before This Review: round 6 / `ARCH-REV-006` (`Pass`)
- Current-State Evidence Basis: approved requirements through 2026-07-30; `API-REV-007`; `CRR-020`; retained evidence `api-rev-007-actual-tools-dispatch.json`, `api-rev-007-standalone-state-after-failure.log`, `api-rev-007-brief-standalone-final-browser.json`, `api-rev-007-brief-standalone-final.png`, and `api-rev-007-source-correlation.log`; current source for application run-authority construction, Agent Tools session/route/catalog/dispatcher/executor, Codex/Claude session creation, and published-artifact publication.
- Reviewed Solution Commit: `70faec030f614b502ceb3975d492c9f50dd84ff9`
- Independent Review Checks: current source confirms the distinct graph-local versus process-global publication owners and the real construction cycle; all relative links in the six solution-owned artifacts resolve; BEH/REQ/AC/UC/DS/SR identifiers are contiguous; `git diff --check` passes. No production/test execution was repeated because this round reviews a design correction over preserved live failure evidence.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Initial solution package | N/A | AR-001–AR-004 | Fail — Design Impact | Readiness, frontend migration, graph construction, and traceability were incomplete. |
| 2 | `SR-002` | AR-001–AR-004 | AR-005, AR-006 | Fail — Design Impact | AR-002–AR-004 resolved; three bounded design gaps remained. |
| 3 | `SR-003` | AR-001, AR-005, AR-006 | None | Pass | Dual-host macro architecture became implementation-ready. |
| 4 | `SR-004` / downstream re-entry | Prior architecture findings; CR-006–CR-008 | AR-007 | Fail — Design Impact | Invalid saved host state was not representable. |
| 5 | `SR-005` | AR-007 | None | Pass | Invalid/stale overrides are preserved and blocked without fallback. |
| 6 | `SR-006` / `CRR-012` | CR-009, CR-012 | None | Pass | Selected-resource editing and portable launch policy gained authoritative owners. |
| 7 | Withdrawn `SR-007` | CR-013 | N/A | Withdrawn — No Decision | `CRR-016` superseded the premise; `ARCH-REV-006` remained the latest valid result. |
| 8 | `SR-010` / `CRR-020` after `API-REV-007` | CR-015 and all prior architecture resolutions | None | Pass | Session-bound graph publication, the process authority, and the bind-once lifecycle seam are implementation-ready. |

## Prior Findings Resolution Check

| Finding ID | Prior Status | Current Status | Related Revision | Verification Evidence | Required Follow-Up |
| --- | --- | --- | --- | --- | --- |
| AR-001–AR-007 | Resolved through `ARCH-REV-006` | Remain resolved | SR-002–SR-006 | SR-010 preserves lifecycle/tool ordering, clean-cut frontend migration, explicit compositions, package/default/readiness/editing semantics, portable policy, and graph-local prompt ownership. | Preserve established coverage. |
| CR-009–CR-014 | Resolved in prior design/source rounds | Remain resolved | SR-006, SR-008, SR-009; IR-010/IR-011; CRR-019 | API-REV-007 reaches route authentication, actual tool listing, graph-local members, and recipient-name messaging before the publication failure. | Do not reopen their scopes. |
| CR-015 / APIE2E-F007 | Open — Design Impact | Resolved in design; implementation and executable proof pending | SR-010, SV-015 | DS-014 now connects authenticated application sessions to the exact graph publication port, assigns route/session construction to one process family, and breaks the real cycle with one fail-closed bind-once port. | Implement, source-review, and rerun required proof. |
| APIE2E-REPO-005 | `Unclear` / unattributed | Remains separate and non-material to this decision | API-REV-007, CRR-020 | No supported failure origin ties this broad diagnostic to CR-015. | Preserve for separate API/E2E reconciliation. |

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: one unchanged manifest-v4 package through Studio and selected-app standalone; complete package-owned Codex/Luna launch defaults; optional non-mutating Studio overrides; one internal Agent Tools route in both hosts; exact application publication/projection; no user authentication, external-gateway expansion, provider-native-tool work, package vNext, copied server, or fallback.
- Relevant existing behavior and evidence confirmed: route registration and bearer authentication now work in both hosts; both real Brief members list `publish_artifacts`/`send_message_to`; recipient-name handoff succeeds; the default publish provider separately captures a process-global publication service while the active runs and correct publication service are graph-local.
- Approved change, preserved behavior, and outside scope understood: SR-010 changes only publication/session authority selection and its construction/stop lifecycle. Route protocol, 401/404 behavior, descriptor/tool eligibility, message delivery, graph publication semantics, native tools, configured-MCP behavior, and Studio-only `/mcp/gateway` remain unchanged.
- Remaining material ambiguity, if any: None. `APIE2E-REPO-005` remains separately `Unclear` and does not drive this architecture.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User / host lifecycle | Pass | Pass | Pass | Confirmed | Preserve Studio/standalone host behavior. |
| BEH-002 | SDK contract | Pass | Pass | Pass | Confirmed | Preserve one `startApplication` client path. |
| BEH-003 | Package contract | Pass | Pass | Pass | Confirmed | Preserve current manifest/package parser and immutable bytes. |
| BEH-004 | User-triggered real application run | Pass | Pass — API-REV-007/CRR-020 prove the live path and wrong authority | Pass — DS-014 reaches session issue, authenticated callback, exact publication, journal, and projection | Confirmed | Implement session-bound publication port. |
| BEH-005 | System transport / authority | Pass | Pass — both hosts register/authenticate the route; source confirms independent defaults | Pass — one process authority supplies both route and scoped-session construction | Confirmed | Remove composition-path default discovery. |
| BEH-006 | Developer command / conformance | Pass | Pass — clean `pnpm dev` reaches actual tools and handoff | Pass — acceptance continues through exact graph publication and application projection | Confirmed | Rerun standalone and Studio real spines. |
| BEH-007 | Persistence / recovery | Pass | Pass | Pass — sessions/ports remain ephemeral; no stored schema changes | Confirmed | No migration. |
| BEH-008 | Prompt authority | Pass | Pass — prior implementation/evidence retained | Pass — SR-010 does not change member-context construction | Confirmed | Preserve prompt proof. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| Retained proposal source | Pass | Pass | Pass | Pass | Pass — evidence/input, approval N/A | None. |
| `proposal-critical-analysis.md` | Pass | Pass | Pass | Pass | Pass — approved/refined through 2026-07-30 and aligned through SR-010 | None. |
| `design-self-validation.md` | Pass | Pass | Pass | Pass | Pass — evidence-only, approval N/A, complete through SV-015 | Execute its deferred proof downstream. |

The investigation notes contain the canonical supplement inventory with purpose, scope, supported cores, status, approval applicability, and retention decision. Every material supplement is linked from the requirements and design; the evidence-only self-validation does not replace design authority.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Requirements and design classify the current posture as downstream authoritative-boundary/construction-cycle correction. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | API-REV-007 and CRR-020 trace the supported Brief action through the default provider to the wrong process-global manager. Current source confirms the graph service already exists. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | The graph-sensitive publication authority is required now; provider-native tools, browser/media/task/configured-MCP expansion, external gateway, and repository-wide DI remain excluded/deferred. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | DS-014, P6A, exact graph, Modify/Retain inventory, file map, sequence 7, removal log, and SV-C39–SV-C42 are actionable. | Implement as reviewed. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001–DS-010 | Dual-host bootstrap, shared execution, lifecycle, commands, and static host | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-011 | Standalone package-default validation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-012 | Selected-resource/effective launch configuration and readiness | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-013 | Graph-local team prompt semantics | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-014 | Authenticated application Agent Tools publication and handoff return spine | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

DS-014 has sufficient span: supported Brief action -> guarded graph run -> scoped session -> descriptor -> authenticated route/family -> session execution authority -> publication/message -> writer handoff -> graph event/journal -> application projection. The deferred port is a bounded construction concern, not a substitute for this business spine.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentToolsMcpProcessAuthority` | Pass | Pass | Pass | Pass | Owns one exact registry/catalog/provider/executor/dispatcher family and lifecycle; exposes only route dependencies and scoped-session construction, not a generic service container. |
| `ApplicationAgentToolsSessionAuthority` | Pass | Pass | Pass | Pass | Owns application-session issue tracking, execution-authority attachment, issue blocking, revoke, and close for one graph scope. |
| Authenticated session execution authorities | Pass | Pass | Pass | Pass | Carries only the graph publication port in memory; no graph lookup or wire exposure. |
| `PublishedArtifactPublicationPort` | Pass | Pass | Pass | Pass | One publication command; manager, relay, journal, and graph remain hidden. |
| `DeferredPublishedArtifactPublicationPort` | Pass | Pass | Pass | Pass | One named bind-once graph cycle seam with pre-bind/rebind/post-close failure. |
| `ApplicationPlatformLifecycle` | Pass | Pass | Pass | Pass | P6A and stop ordering govern readiness and disposal without absorbing route/publication business logic. |
| Internal Agent Tools route vs external MCP gateway | Pass | Pass | Pass | Pass | Both hosts retain the internal route; only Studio owns `/mcp/gateway`; neither aliases the other. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Composition -> process authority | Pass | Pass | Pass | Pass | Composition constructs once and supplies narrow outputs; route/session may not resolve defaults independently. |
| Application graph -> scoped session authority | Pass | Pass | Pass | Pass | Graph supplies only its deferred publication port; it cannot use the general-process session authority. |
| Route -> process route dependencies | Pass | Pass | Pass | Pass | No whole graph, default registry, or external-gateway dependency. |
| Provider -> authenticated session port | Pass | Pass | Pass | Pass | Global publication getter, process manager lookup, request-time graph lookup, and package/run-ID routing are prohibited. |
| Runtime factories/cleanup -> scoped issue/revoke | Pass | Pass | Pass | Pass | Application Codex/Claude and new/restored member cleanup use the issuing scope. General-process paths receive an explicit separate authority. |
| Lifecycle -> scope/port/process close | Pass | Pass | Pass | Pass | Issue is blocked and graph sessions revoked before port/process disposal; restart creates new scope and descriptors. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `AgentToolsMcpProcessAuthority.createApplicationSessionAuthority(...)` | Pass | Pass | Pass | Low | Pass |
| `ApplicationAgentToolsSessionAuthority.createSession(input)` | Pass | Pass | Pass | Low | Pass |
| `ApplicationAgentToolsSessionAuthority.close()` | Pass | Pass | Pass | Low | Pass |
| `AgentToolsMcpProcessAuthority.routeDependencies` | Pass | Pass | Pass | Low | Pass |
| `PublishedArtifactPublicationPort.publishManyForRun(input)` | Pass | Pass | Pass | Low | Pass |
| `DeferredPublishedArtifactPublicationPort.bind/close` | Pass | Pass | Pass | Low | Pass |
| `registerAgentToolsMcpRoutes(app, routeDependencies)` | Pass | Pass | Pass | Low | Pass |
| `ApplicationPlatformLifecycle.prepareBeforeListen/stop` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Session authentication/registry/catalog/dispatch | Pass | Pass | Pass | Pass | Existing semantics are composed under one owner rather than replaced. |
| Published-artifact business semantics | Pass | Pass | Pass | Pass | Existing graph-local service implements the narrow port; no second publication system. |
| Recipient-name messaging | Pass | Pass | N/A | Pass | Proven member-context path remains unchanged. |
| Agent runtime construction | Pass | Pass | Pass | Pass | Existing Codex/Claude seams receive explicit application/general session authorities only where the shared provider contract requires it. |
| External MCP gateway | Pass | Pass | N/A | Pass | Remains Studio-only and is not reused as a callback workaround. |
| Provider-native/configured-MCP/browser/media/task tools | Pass | Pass | N/A | Pass | No unsupported graph machinery is added. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent Tools MCP transport | Pass | Pass | Pass | Pass | Process identity plus scoped session lifecycle are within the existing transport boundary. |
| Published artifacts | Pass | Pass | Pass | Pass | Existing graph service remains the publication authority behind one port. |
| Application platform runtime | Pass | Pass | Pass | Pass | Owns graph construction seam and lifecycle readiness/stop. |
| Composition roots | Pass | Pass | Pass | Pass | Select the exact process family and host surface. |
| Agent/runtime factories | Pass | Pass | Pass | Pass | Issue sessions through the correct scoped/general authority without becoming transport owners. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Per-session execution authority | Pass | Pass | Pass | Pass | One tight non-wire type avoids provider capture and request-time graph resolution. |
| Publication command contract | Pass | Pass | Pass | Pass | One port is shared by the real service and deferred graph seam. |
| Scoped session issue/revoke | Pass | Pass | Pass | Pass | One application scope is reused across Codex/Claude and member cleanup. |
| Process route/session authority identity | Pass | Pass | Pass | Pass | One process owner avoids duplicated registry/catalog/dispatcher families. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentToolMcpSessionExecutionAuthorities` | Pass | Pass | Pass | Pass | Pass | Contains only `publishedArtifactPublication`; another field requires separate reachable evidence. |
| `PublishedArtifactPublicationRequest` | Pass | Pass | Pass | N/A | Pass | Reuses the existing publication input meaning; no second run identity. |
| `AgentToolMcpSession` | Pass | Pass | Pass | Pass | Pass | Execution authority is non-wire and does not duplicate descriptor/token/config state. |
| Process vs application session authority | Pass | Pass | Pass | Pass | Pass | Shared registry/catalog core with explicit general-process and graph-scoped variants; no kitchen-sink optional context. |

## File Responsibility Mapping Verdict

| File / Area | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-tools/mcp/agent-tools-mcp-process-authority.ts` | Pass | Pass | Pass | Pass | Exact process family and lifecycle only. |
| `agent-tools/mcp/application-agent-tools-session-authority.ts` | Pass | Pass | Pass | Pass | One graph session scope only. |
| `agent-tools/mcp/agent-tool-mcp-session.ts` | Pass | Pass | Pass | Pass | Adds only non-wire execution authorities. |
| `agent-tools/mcp/providers/publish-artifacts-mcp-adapter-provider.ts` | Pass | Pass | Pass | Pass | Delegates through authenticated session port; owns no publication service. |
| `services/published-artifacts/published-artifact-publication-port.ts` | Pass | Pass | Pass | Pass | One command contract. |
| `application-platform/runtime/deferred-published-artifact-publication-port.ts` | Pass | Pass | Pass | Pass | One cycle-breaking state machine. |
| `agent-tools/mcp/agent-tools-mcp-routes.ts` | Pass | Pass | Pass | Pass | Protocol/auth registrar with explicit dependencies. |
| Application/general Codex/Claude construction and cleanup callsites | Pass | Pass | Pass | Pass | Modify inventory separates application scope from general-process preservation. |
| Studio/standalone compositions and application graph factory | Pass | Pass | Pass | Pass | Construction order and host route surfaces are explicit. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp/` | Pass | Pass | Low | Pass | Process/session authority stays with its protocol family. |
| `autobyteus-server-ts/src/services/published-artifacts/` | Pass | Pass | Low | Pass | Narrow business capability port sits with publication owner. |
| `autobyteus-server-ts/src/application-platform/runtime/` | Pass | Pass | Low | Pass | Graph-owned deferred seam and lifecycle belong to application runtime construction. |
| `autobyteus-server-ts/src/compositions/` | Pass | Pass | Low | Pass | Full host wiring remains only in composition roots. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Cached/global publication capture in `PublishArtifactsMcpAdapterProvider` | Pass | Pass | Pass | Pass | Replaced by authenticated session publication port; no fallback retained. |
| Application-path default Agent Tools session/registry/catalog/dispatcher discovery | Pass | Pass | Pass | Pass | Replaced by process owner and scoped authority. |
| Global/default revocation in application run/member cleanup | Pass | Pass | Pass | Pass | Replaced by issuing application scope. |
| Broad withdrawn SR-007 runtime/tool machinery | Pass | Pass | Pass | Pass | Remains removed; native/configured-MCP/general-gateway expansion stays out of scope. |
| Alternate route/catalog/global-current-graph workarounds | Pass | Pass | Pass | Pass | Explicitly rejected, not staged as compatibility. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Publication authority | No | Pass | Pass | Global provider fallback is removed rather than retained behind a branch. |
| Agent Tools route/catalog | No | Pass | Pass | One existing route and one process catalog remain; no alias or second graph catalog. |
| Session persistence | No | Pass | Pass | Sessions remain ephemeral; restart issues fresh capabilities. |
| Package/runtime/public API | No new compatibility mechanism | Pass | Pass | SR-010 does not change manifest, package, or provider-native contracts. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Agent Tools sessions/tokens/execution authorities | Not persisted / Not Affected | Pass | Pass | N/A | Pass | Registry retains in-memory session object; execution port is excluded from wire/log/store/token/package. |
| Publication journal/application projection | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Existing service and stores retain their schemas and semantics; only authority routing changes. |
| Package and application/platform databases | Directly Usable — No Migration | Pass | Pass | N/A | Pass | SR-010 introduces no schema or stored default changes. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Process authority extraction | Pass | Pass | Pass | Pass |
| Session execution-authority addition | Pass | Pass | Pass | Pass |
| Graph cycle break and P6A readiness | Pass | Pass | Pass | Pass |
| Application/general runtime construction migration | Pass | Pass | Pass | Pass |
| Scope revoke, port close, and process shutdown | Pass | Pass | Pass | Pass |
| Default/global bypass removal and validation rerun | Pass | Pass | Pass | Pass |

The sequence preserves the working route/auth/tool-list/message path first, introduces the exact process/session contracts, binds the graph port before readiness, removes global capture, then proves failure states and live projection. No partially working compatibility stage is treated as a supported target.

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Full publication/handoff spine | Yes | Pass | Pass | Pass | DS-014 shows the initiating backend through application projection. |
| Process/session/route composition | Yes | Pass | Pass | Pass | Text graph shows one process authority, one app scope, and exact route dependencies. |
| Construction-cycle order | Yes | Pass | Pass | Pass | Eight-step bind/readiness/close sequence is explicit. |
| Interface shape | Yes | Pass | Pass | Pass | Session execution authorities and publication port have exact TypeScript shapes. |
| Host construction | Yes | Pass | Pass | Pass | Composition example shows shared family and separate external gateway. |
| Rejected alternatives | Yes | Pass | Pass | Pass | Mutable singleton, request lookup, second catalog/route, and broad SR-007 are explicitly rejected. |

## Material Premise Validation

### `MP-ARCH-008-001` — a supported application member invokes publication while active only in the application graph

- Related approved requirement or established contract: REQ-004, REQ-005, REQ-007; AC-005, AC-006, AC-010, AC-016
- Relevant behavior ID(s): BEH-004–BEH-006
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: a user opens the maintained Brief standalone application, creates a brief, and selects **Generate draft**.
- Support evidence: the exposed Brief standalone browser UI and supported application-folder `pnpm dev` path were executed with the real package, worker, SQLite, Chrome, Codex App Server, and Luna. API-REV-007 produced graph-local researcher/writer members, authenticated sessions, actual tool lists, and two successful handoffs.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `Brief Generate draft -> selected application backend -> guarded binding/team launch -> graph-local researcher/writer AgentRunManager -> Codex session descriptor -> internal Agent Tools route -> registry/catalog/dispatcher/executor -> PublishArtifactsMcpAdapterProvider -> captured process-global PublishedArtifactPublicationService -> process-global active-run lookup -> expected event/journal/application projection`.
- Lifecycle preconditions and material consequence at the claimed point: both graph-local members are active; authentication, tool discovery, tool invocation, team routing, and writer creation succeed. The process-global manager cannot see either member, so all five publication calls fail before journal/projection and the user receives no draft output.
- Reachability: `Reachable`
- Review consequence / proportionate response: one session-bound graph publication port plus one coherent process family is required. The real factory/publication cycle justifies one narrow bind-once deferred port. No broader tool/runtime/gateway redesign is justified.

### `MP-ARCH-008-002` — an application scope can stop while its issued descriptors still exist in the process registry

- Related approved requirement or established contract: REQ-004, REQ-005, REQ-007; AC-006, AC-010, AC-016; supported host shutdown/restart contract
- Relevant behavior ID(s): BEH-004, BEH-005, BEH-007
- Initiating basis kind: `Operational`
- Independent product-supported initiating trigger or applicable governing contract: the operator stops or restarts Studio/standalone after a real application run has issued Agent Tools sessions.
- Support evidence: `pnpm dev` restart/termination and production host stop are supported lifecycle actions; current session capabilities are process-memory objects and run/member cleanup already revokes sessions.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `operator stop/restart -> Fastify ingress drain -> application lifecycle blocks runs/session issue -> run/member handles stop -> scoped session revoke -> publication port close -> graph/process/event/vault/Prisma disposal -> restart creates a new process/graph scope`.
- Lifecycle preconditions and material consequence at the claimed point: descriptors may have been delivered to active runtimes before shutdown. If sessions outlive the graph, a request could retain a disposed publication reference; if global revoke is used, another scope could be disrupted.
- Reachability: `Reachable`
- Review consequence / proportionate response: the scope tracks only sessions it creates, blocks issue, revokes them before port close, and restarts with a new scope. This lifecycle machinery is necessary and bounded.

## Unresolved Approved-Behavior Or Current-State Gaps

None. `APIE2E-REPO-005` remains a separate unattributed diagnostic and does not block or broaden this design decision.

## Review Decision

`Pass`

The upstream behavior basis is confirmed. SR-010 is actionable in the current codebase, resolves CR-015 at the correct authority boundary, and uses a proportionate cycle seam and lifecycle. No in-scope mechanism or finding depends on an unsupported material premise.

## Findings

None.

## Classification

N/A — Pass.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

1. Implementation must make process-family identity observable enough to prove route lookup, session issue, provider dispatch, and revoke use the same registry/catalog/dispatcher rather than parallel defaults.
2. General-process Codex/Claude construction must receive its explicit general authority without allowing application factories to reuse it; current global factory seams make this a source-review focus.
3. The deferred port needs deterministic tests for pre-bind, second bind, post-close, and failure before any snapshot/journal/relay/projection mutation.
4. Stop/restart tests must prove application-scope-only revocation, old-descriptor failure, new-scope issuance, and no session referencing a disposed graph.
5. Real standalone and Studio Brief must both complete publication, recipient-name handoff, graph event/journal, and application projection while the deliberately distinct process-global owner remains untouched.
6. Existing 401/404, tool projection, route ordering, configured-MCP behavior, native-tool exclusion, and standalone absence of `/mcp/gateway` require regression proof.
7. `APIE2E-REPO-005` remains separately `Unclear`; it must not be attributed to this correction without a supported production origin.

## Latest Authoritative Result

- Review Decision: `Pass`
- Current Architecture Review Revision: `ARCH-REV-008`
- Reviewed Solution Revision: `SR-010`
- Material-Premise Gate: `Pass` (`MP-ARCH-008-001` and `MP-ARCH-008-002` are reachable and the response is proportionate)
- Notes: This pass supersedes the withdrawal-only canonical report from round 7. `ARCH-REV-007` remains historically withdrawn; `ARCH-REV-008` is the current authoritative architecture result. Implementation may resume, followed by source review and API/E2E rerun.
