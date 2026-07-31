# Design Review Report — Universal Application Dual-Host Foundation

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-spec.md`
- Supplemental Task Artifacts Reviewed:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/proposal-critical-analysis.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-self-validation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/application-framework-architecture-simplification.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/sources/autobyteus-vertical-application-developer-experience-proposal.md`
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-013`; `SR-012` retained for the approved four-projection/package-owner baseline; `SR-011` and `SR-010` retained as passed naming and functional baselines; `SR-007` remains withdrawn
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-011`
- Current Review Round: 11
- Trigger: `SR-013` bounded correction after `ARCH-REV-010` returned `AR-008` and `AR-009` against the SR-012 cycle-removal design.
- Prior Review Round Reviewed: round 10 / `ARCH-REV-010` (`Fail — Design Impact`)
- Latest Authoritative Round Before This Review: round 10 / `ARCH-REV-010`
- Current-State Evidence Basis: current source at the SR-013 design commit; `CRR-031`; `ARCH-REV-010`; the passed `IR-016`, `CRR-029`, `API-REV-011` (`Pass / 98.9%`), and `CRR-030` baseline; source traces through artifact publication/relay/engine ensure and agent-run registration, inactive discovery, termination, session revocation, observer cleanup, and shutdown.
- Reviewed Solution Commit: `433ec798b7ebfe7926311061021624de33f02974`
- Independent Review Checks: verified the solution commit changes only the seven solution-owned artifacts; all relative links in those artifacts resolve; canonical ranges are complete through BEH-010, REQ-010, AC-023, UC-027, DS-015, SV-018, SV-C57, and SR-013; `git diff --check` passes; current source reconfirms the two prior lifecycle premises; the revised owner graph is acyclic and preserves ensure-before-invoke plus exact run-resource cleanup without restoring either bind-once proxy, the broad engine host, a reverse callback, or a generic event bus/container.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Initial solution package | N/A | AR-001–AR-004 | Fail — Design Impact | Readiness, frontend migration, graph construction, and traceability were incomplete. |
| 2 | `SR-002` | AR-001–AR-004 | AR-005, AR-006 | Fail — Design Impact | AR-002–AR-004 resolved; three bounded gaps remained. |
| 3 | `SR-003` | AR-001, AR-005, AR-006 | None | Pass | Dual-host macro architecture became implementation-ready. |
| 4 | `SR-004` / downstream re-entry | Prior findings; CR-006–CR-008 | AR-007 | Fail — Design Impact | Invalid saved host state was not representable. |
| 5 | `SR-005` | AR-007 | None | Pass | Invalid/stale overrides became explicit and fail-closed. |
| 6 | `SR-006` / `CRR-012` | CR-009, CR-012 | None | Pass | Selected-resource editing and portable policy gained authoritative owners. |
| 7 | Withdrawn `SR-007` | CR-013 | N/A | Withdrawn — No Decision | Superseded premise; `ARCH-REV-006` remained valid. |
| 8 | `SR-010` / `CRR-020` | CR-015 | None | Pass | Graph-local publication/session ownership became implementation-ready. |
| 9 | `SR-011` / `CRR-028` | CR-018 and prior resolutions | None | Pass | Behavior-neutral role vocabulary and exact clean rename map were approved. |
| 10 | `SR-012` / `CRR-031` | CR-019–CR-021 and prior resolutions | AR-008, AR-009 | Fail — Design Impact | Runtime projection and package ownership were sound; artifact recovery and active-run cleanup were incomplete. |
| 11 | `SR-013` / `ARCH-REV-010` rework | AR-008, AR-009 | None | Pass | Closed artifact delivery and exact run-resource ownership preserve both lifecycle edges in an acyclic graph. |

## Prior Findings Resolution Check

| Finding ID | Prior Status | Current Status | Related Revision | Verification Evidence | Required Follow-Up |
| --- | --- | --- | --- | --- | --- |
| AR-001–AR-007 | Resolved | Remain resolved | SR-002–SR-006, SR-010–SR-013 | SR-013 preserves the established package, host, readiness, launch/editing, prompt, route, and scoped publication requirements. | Preserve their regression baseline. |
| CR-001–CR-018 | Resolved in design/source/test rounds | Remain resolved | cumulative through IR-016, CRR-029, API-REV-011, CRR-030 | The correction is limited to internal construction/lifecycle ownership and retains all passed functional and naming behavior. | Preserve the complete characterization baseline. |
| CR-019 | Resolved in design | Remains resolved | CRR-031, SR-012, SR-013 | The runtime still exposes exactly lifecycle, REST, realtime, and host-management projections; registrars receive subject contracts. | Implementation/source proof. |
| CR-020 | Resolved in design | Remains resolved | CRR-031, SR-012, SR-013 | Package registry state, package commands/rollback, catalog reconciliation, and ordered refresh remain distinct, acyclic owners. | Implementation/source proof. |
| CR-021 | Partially resolved through SR-012 | Resolved in design | CRR-031, SR-012, SR-013, SV-018 | The early session-scope/resource/registry chain and early controller/closed-queue plus late launcher/consumer chain remove both permanent bind-once proxies while retaining the previously omitted lifecycle behavior. | Full implementation/source/API-E2E proof. |
| AR-008 | Open — Design Impact | Resolved in design | ARCH-REV-010, SR-013, SV-C52, SV-C53 | Complete artifact commands enter a closed per-run queue; the late consumer always performs launcher `ensureReady` before controller invocation and drains before engine stop. | Focused worker-exit publication proof. |
| AR-009 | Open — Design Impact | Resolved in design | ARCH-REV-010, SR-013, SV-C54–SV-C57 | Early application session scope plus `AgentRunResourceManager` and identity-checked `removeIfCurrent` define cleanup for inactive discovery/replacement, terminate, stop-all, rollback, and stale removal without a reverse callback. | Focused exact-once cleanup proof. |
| APIE2E-REPO-005 | `Unclear` / unattributed | Remains separate and non-material | API-REV-011, CRR-031 | No supported origin ties the diagnostic to SR-013. | Reconcile separately; do not broaden this design. |

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: preserve the complete passed dual-host behavior while narrowing the runtime, separating package state/commands/reconciliation, and removing construction cycles without changing launch, recovery, publication, cleanup, routes, data, or package bytes.
- Relevant existing behavior and evidence confirmed: API-REV-011 establishes the normal dual-host baseline. Current source confirms artifact relay currently ensures/restarts the application engine before handler invocation and inactive agent-run discovery synchronously revokes sessions and detaches file/artifact/memory observers.
- Approved change, preserved behavior, and outside scope understood: four projections, package-owner split, exact active-run/resource ownership, controller/launcher split, two closed domain queues, clean removals, and no migration are in scope. Generic containers/event buses, compatibility aliases, application global fallbacks, new product behavior, and data changes remain out of scope.
- Remaining material ambiguity, if any: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | Pass | Pass | Pass | Confirmed | Preserve host lifecycle. |
| BEH-002 | Contract | Pass | Pass | Pass | Confirmed | Preserve SDK/wire path. |
| BEH-003 | Contract | Pass | Pass | Pass | Confirmed | Preserve manifest-v4 package and parser. |
| BEH-004 | System | Pass | Pass — real publication baseline and current ensure-before-artifact invocation | Pass — queue -> launcher ensure/restart -> controller invoke -> worker projection | Confirmed | Prove worker-exit case. |
| BEH-005 | System / lifecycle | Pass | Pass — current exact run cleanup | Pass — registry identity removal -> resource manager -> scope/observer cleanup | Confirmed | Prove every removal origin. |
| BEH-006 | Developer | Pass | Pass — API-REV-011 and 73/73 parity | Pass | Confirmed | Preserve commands/package bytes. |
| BEH-007 | Persistence / recovery | Pass | Pass | Pass — no stored representation changes | Confirmed | No migration. |
| BEH-008 | System | Pass | Pass | Pass | Confirmed | Preserve graph-local prompt service. |
| BEH-009 | Contributor / contract | Pass | Pass — SR-011 baseline | Pass — vocabulary and clean removals remain coherent | Confirmed | Preserve vocabulary. |
| BEH-010 | Contributor / architecture contract | Pass | Pass — CRR-031 and ARCH-REV-010 source traces | Pass — all corrected owner graphs are explicit and acyclic | Confirmed | Implement and run full baseline. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| Retained proposal source | Pass | Pass | Pass | Pass | Pass — evidence/input, approval N/A | None. |
| `proposal-critical-analysis.md` | Pass | Pass | Pass | Pass | Pass — approved/refined intended behavior | Retain. |
| `design-self-validation.md` | Pass | Pass | Pass | Pass | Pass — evidence-only, approval N/A | Retain SV-018 obligations. |
| `application-framework-architecture-simplification.md` | Pass | Pass | Pass | Pass | Pass — intended architecture approved by this review | Implement exact contracts and validation map. |

The investigation notes inventory every supplement, approval applicability is explicit, and the architecture supplement is linked from each core artifact it materially supports.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Boundary leakage, mixed package ownership, construction cycles, and the two preserved lifecycle edges are explicitly classified. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | CRR-031, ARCH-REV-010, and current source establish each structural defect and preserved behavior. | None. |
| Refactor needed now / deferred decision is explicit | Pass | SR-013 keeps the behavior-neutral correction bounded and excludes unrelated programs. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | DS-015, the simplification supplement, file inventory, construction order, shutdown order, and SV-C45–SV-C57 are actionable. | Implement and validate. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001/DS-002 | Studio/standalone startup | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Shared request/gateway/engine/run path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004/DS-014/DS-015 | Publication return path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005/DS-015 | Lifecycle/recovery/stop | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-015 | Package import/reload/remove and rollback | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-015 | Active-run registration/removal/cleanup | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-015 | Durable event journal/queue/dispatcher | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

The publication spine now spans authenticated publication through persistence/binding, a closed delivery queue, ensure/restart, handler invocation, and business projection. The active-run spine reaches exact state removal, all resource categories, and the consuming manager result without a reverse callback.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ApplicationPlatformRuntime` | Pass | Pass | Pass | Pass | Exactly four immutable projections. |
| REST/realtime registrars | Pass | Pass | Pass | Pass | Exact subject inputs; no whole-runtime dependency. |
| Package registry / commands / refresh coordinator | Pass | Pass | Pass | Pass | Distinct state, command/rollback, and ordering owners. |
| Session scope / resource manager / active registry | Pass | Pass | Pass | Pass | Each owns one concrete lifecycle subject; exact identities prevent stale cleanup. |
| Engine controller / launcher / artifact delivery | Pass | Pass | Pass | Pass | Controller owns attached state; launcher owns ensure/start; delivery owns the complete command. |
| Lifecycle | Pass | Pass | Pass | Pass | Private participants, intake gates, drain, cleanup, and stop order are explicit. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime projections | Pass | Pass | Pass | Pass | No stores/managers leak outward. |
| Package command and refresh | Pass | Pass | Pass | Pass | No later-assigned callbacks or hidden defaults. |
| Session scope / resources / registry / publication / issuer / managers | Pass | Pass | Pass | Pass | Early revocation capability breaks cleanup dependency without a reverse edge. |
| Artifact relay / queue / delivery / launcher / controller | Pass | Pass | Pass | Pass | The late consumer restores ensure-before-invoke without a broad host. |
| Event ingress / queue / dispatcher | Pass | Pass | Pass | Pass | Closed IDs plus durable journal avoid a generic event bus. |
| General-process factories | Pass | Pass | Pass | Pass | Explicitly separated from application assembly. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `ApplicationPlatformRuntime` four projections | Pass | Pass | Pass | Low | Pass |
| REST and realtime subject contracts | Pass | Pass | Pass | Low | Pass |
| Package query, command, reconciliation, and refresh contracts | Pass | Pass | Pass | Low | Pass |
| `ApplicationAgentToolMcpSessionScope` | Pass | Pass | Pass | Low | Pass |
| `AgentRunResourceManager.attach/release` | Pass | Pass | Pass | Low | Pass |
| `ActiveAgentRunRegistry` / typed removal result | Pass | Pass | Pass | Low | Pass |
| Artifact delivery command/queue/service | Pass | Pass | Pass | Low | Pass |
| Engine controller/launcher | Pass | Pass | Pass | Low | Pass |
| Closed event-dispatch queue | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Package parsing/validation | Pass | Pass | N/A | Pass | Reuses `FileApplicationBundleProvider`; no second parser. |
| Package catalog refresh | Pass | Pass | Pass | Pass | One sequencing coordinator is justified. |
| Agent-run observer/session cleanup | Pass | Pass | Pass | Pass | Extracts current manager-owned resources into one exact lifecycle owner. |
| Active run state | Pass | Pass | Pass | Pass | Registry owns identity/pruning, not backend orchestration. |
| Engine handle/start split | Pass | Pass | Pass | Pass | Controller and launcher retain distinct real owners. |
| Artifact delivery | Pass | Pass | Pass | Pass | Closed queue/service is required by the acyclic ensure path and existing asynchronous semantics. |
| Event wakeup | Pass | Pass | Pass | Pass | Domain queue reuses the durable journal and is not generic. |
| General-process behavior | Pass | Pass | Pass | Pass | Named assembly factories preserve the distinct scope. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Application platform runtime | Pass | Pass | Pass | Pass | Four outward projections over private owners. |
| Application packages | Pass | Pass | Pass | Pass | Registry, command, refresh, and runtime reconciliation roles are coherent. |
| Agent execution | Pass | Pass | Pass | Pass | Run identity and resource cleanup are separate but connected authoritative owners. |
| Agent Tools MCP | Pass | Pass | Pass | Pass | Early scope revocation and later issuer share one process family without publisher backflow. |
| Published artifacts | Pass | Pass | Pass | Pass | Relay maps; queue orders; delivery ensures and invokes. |
| Application engine | Pass | Pass | Pass | Pass | Controller and launcher division preserves all lazy-start consumers. |
| Application orchestration/events | Pass | Pass | Pass | Pass | Two closed queues have distinct subjects and lifecycle contracts. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime transport projections | Pass | Pass | Pass | Pass | Shared exact contracts are appropriate. |
| Ordered catalog propagation | Pass | Pass | Pass | Pass | One coordinator prevents sequence duplication. |
| Run resource records/results | Pass | Pass | Pass | Pass | Exact run identity and release outcome are singular. |
| Active-run lookup/removal | Pass | Pass | Pass | Pass | Registry owns map transitions and invokes the early resource owner. |
| Engine handle/control state | Pass | Pass | Pass | Pass | Controller is a real state owner. |
| Artifact command/lease | Pass | Pass | Pass | Pass | Closed run-scoped ordering and completion contract. |
| Journal wakeup queue | Pass | Pass | Pass | Pass | Closed application-ID structure is appropriately reusable. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ApplicationPlatformRuntime` | Pass | Pass | Pass | Pass | Pass | Four projections replace 19 mixed fields. |
| REST/realtime/host-management contracts | Pass | Pass | Pass | Pass | Pass | Subject-specific immutable views. |
| Session owner and run-resource release shapes | Pass | Pass | Pass | Pass | Pass | Scope identity, run identity, detached categories, and errors are non-overlapping. |
| `AgentRunRemovalResult` | Pass | Pass | Pass | Pass | Pass | Removed/not-found/identity-mismatch are closed, explicit outcomes. |
| Artifact delivery command | Pass | Pass | Pass | Pass | Pass | Carries only exact delivery identity and mapped event. |
| Event wakeup shape | Pass | Pass | Pass | Pass | Pass | Application ID only; journal remains authoritative. |
| Engine controller/launcher contracts | Pass | Pass | Pass | Pass | Pass | Attached state and ensure/start responsibilities do not overlap. |

## File Responsibility Mapping Verdict

| File / Area | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `application-platform-runtime-contracts.ts` | Pass | Pass | Pass | Pass | Exact outward contracts. |
| package registry/command/refresh files | Pass | Pass | Pass | Pass | State, commands/rollback, and ordered propagation remain distinct. |
| `application-agent-tool-mcp-session-scope.ts` | Pass | Pass | Pass | Pass | Early application-scope ownership/revocation only. |
| `agent-run-resource-manager.ts` | Pass | Pass | Pass | Pass | Exact session/file/artifact/memory attachment lifecycle. |
| `active-agent-run-registry.ts` | Pass | Pass | Pass | Pass | Map, identity transitions, inactive pruning, typed removal. |
| `application-published-artifact-delivery-{queue,service}.ts` | Pass | Pass | Pass | Pass | Closed ordering/completion and late ensure/invoke consumer. |
| `application-engine-controller.ts` / `application-engine-launcher.ts` | Pass | Pass | Pass | Pass | Stable handles versus process/startup. |
| event queue/dispatcher/reentry files | Pass | Pass | Pass | Pass | Durable wakeup, dispatch policy, explicit reentry. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `application-platform/runtime/` contracts/reconciliation | Pass | Pass | Low | Pass | Runtime boundary concerns. |
| `application-packages/services/` command/refresh | Pass | Pass | Low | Pass | Package capability ownership. |
| `agent-tools/mcp/` session scope | Pass | Pass | Low | Pass | MCP session ownership/revocation. |
| `agent-execution/` resource manager/active registry | Pass | Pass | Low | Pass | Agent-run lifecycle state and attachments. |
| `application-engine/services/` controller/launcher | Pass | Pass | Low | Pass | Engine state and startup owners. |
| `application-orchestration/services/` artifact/event queues and consumers | Pass | Pass | Low | Pass | Two explicit orchestration return paths. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| 19-field runtime outward shape | Pass | Pass | Pass | Pass | Replace with four projections. |
| Late Studio callbacks and package defaults | Pass | Pass | Pass | Pass | Registry/command/refresh owners. |
| `BindOncePublishedArtifactPublisher` | Pass | Pass | Pass | Pass | Early scope/resource/registry permits concrete publisher before issuer. |
| `BindOnceApplicationEngineEventHandler` | Pass | Pass | Pass | Pass | Closed event and artifact queues permit late consumers. |
| `ApplicationEngineHostService` | Pass | Pass | Pass | Pass | Controller, launcher, and artifact/event consumers allocate every current responsibility. |
| Manager active/disposer collections | Pass | Pass | Pass | Pass | Registry and resource manager replace them cleanly. |
| Application-path singleton/default branches | Pass | Pass | Pass | Pass | Exact removal inventory and negative scans are required. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Runtime projections/package/run/engine services | No | Pass | Pass | No alias or dual path. |
| Bind-once files and engine host | No target retention | Pass | Pass | Complete replacements are now explicit. |
| Public wire/data/package contracts | No | Pass | Pass | Remain unchanged rather than wrapped. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Package files/manifests | Directly Usable — No Migration | Pass | Pass | N/A | Pass | No serialized package change. |
| App/platform databases, overrides, bindings, lookup state | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Constructor/interface refactor only. |
| Event journal/projections/migration ledgers | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Existing records and semantics remain authoritative. |
| MCP sessions, queues, engine handles, active-run/resource records | In-memory; recreate on process start | Pass | Pass | N/A | Pass | No persisted representation. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Runtime projections and registrar migration | Pass | Pass | Pass | Pass |
| Package registry/command/refresh split | Pass | Pass | Pass | Pass |
| Session scope/resource/registry and publisher/session/run order | Pass | Pass | Pass | Pass |
| Engine controller/queues/launcher/consumers | Pass | Pass | Pass | Pass |
| Retired-symbol/default/alias scans | Pass | Pass | Pass | Pass |
| Full API-REV-011 characterization rerun | Pass | Pass | Pass | Pass |

The sequence keeps the previously passed implementation working in bounded clusters, removes obsolete owners only after exact replacements compile, and permits no steady-state old/new dual path.

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Four runtime projections | Yes | Pass | Pass | Pass | Exact TypeScript shapes and caller mapping. |
| Package success and rollback | Yes | Pass | Pass | Pass | Local/GitHub/remove/reload sequences are explicit. |
| Active-run removal and cleanup | Yes | Pass | Pass | Pass | Interfaces and six transition rules cover all supported origins and stale identity. |
| Engine ensure and publication relay | Yes | Pass | Pass | Pass | Command, queue lease, ensure/invoke, caller policy, and shutdown drain are explicit. |
| Event queue/dispatcher | Yes | Pass | Pass | Pass | Domain-specific queue and journal order are clear. |
| Complete construction/shutdown | Yes | Pass | Pass | Pass | Fourteen-step construction and exact stop ordering expose every owner. |

## Material Premise Validation

### MP-ARCH-010-001 — application worker exits before a still-active application run publishes an artifact

- Related approved requirement or established contract: REQ-004, REQ-010; AC-005, AC-006, AC-021, AC-022; UC-009, UC-012, UC-026
- Relevant behavior ID(s): BEH-004, BEH-010
- Initiating basis kind: `System`
- Independent product-supported initiating trigger or applicable governing contract: an active application worker exits after starting an application-bound provider/team run; the server-process-owned provider run retains its issued Agent Tools session and later invokes supported `publish_artifacts`.
- Support evidence: UC-012 and UC-026 cover worker exit and publication. Current worker-close handling removes the engine handle without inherently terminating the provider run/session; publication is an established capability.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: worker exit -> handle detached -> provider calls the authenticated Agent Tools route -> application publisher persists/projected artifact -> binding relay -> artifact delivery queue -> delivery service -> launcher `ensureReady` -> worker restart -> controller artifact-handler invoke -> business projection/UI.
- Lifecycle preconditions and material consequence at the claimed point: binding and provider run remain active while no worker handle exists. Without ensure, delivery is lost; SR-013 now ensures/restarts before invocation and drains accepted delivery before engine stop.
- Reachability: `Reachable`
- Review consequence / proportionate response: AR-008 is resolved. The closed queue/service is limited to the established artifact return path and requires focused executable proof.

### MP-ARCH-010-002 — a supported active-run operation encounters an inactive or replaced run

- Related approved requirement or established contract: REQ-004, REQ-005, REQ-010; AC-005, AC-006, AC-016, AC-021, AC-023; current agent-run cleanup behavior
- Relevant behavior ID(s): BEH-004, BEH-005, BEH-010
- Initiating basis kind: `System`
- Independent product-supported initiating trigger or applicable governing contract: a provider backend/session becomes inactive while the server process remains alive, followed by supported lookup, replacement, publication/projection, termination, or stop for that run.
- Support evidence: current provider runs expose active state; established run lookups prune inactive runs and perform session/observer cleanup. UC-027 retains that contract for all supported removal origins.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: backend inactive or termination accepted -> manager/consumer calls active registry -> exact `removeIfCurrent` identity transition -> map/resource ownership deleted -> resource manager revokes run sessions and detaches file/artifact/memory observers -> typed result consumed; stale completion returns mismatch/no-op.
- Lifecycle preconditions and material consequence at the claimed point: resources remain attached until exact removal. Missing cleanup leaks capability/observers; non-identity removal can delete a replacement. SR-013 performs cleanup once without a registry-to-manager callback.
- Reachability: `Reachable`
- Review consequence / proportionate response: AR-009 is resolved. The early scope/resource/registry chain is proportionate and requires focused multi-origin/race/failure proof.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

SR-013 resolves AR-008 and AR-009 while retaining the already accepted CR-019 and CR-020 corrections. The complete target is behavior-grounded, acyclic, actionable in the current codebase, and proportionate to the two reachable lifecycle premises. Implementation may resume through the normal source-review and API/E2E path.

## Findings

None.

## Classification

`Pass`

## Recommended Recipient

`implementation_engineer`

## Residual Risks

1. Implementation must preserve queue completion/caller semantics: active-run relay remains fire-and-forget with logged failure, fallback relay remains awaited, and delivery failure does not undo persisted projection state.
2. Worker-exit-before-publication must prove actual `ensureReady` restart followed by controller handler invocation and UI/business projection.
3. Exact cleanup proof must cover inactive discovery/replacement, partial attach rollback, accepted terminate, stop-all, duplicate/stale removal, aggregate failure, and deliberately distinct application/general scopes.
4. Shutdown must stop artifact intake, drain accepted commands while launcher/controller remain live, then stop workers/runs/scopes without accepting new sessions or delivery.
5. The full API-REV-011 Studio/standalone characterization and exact `73/73` package parity remain mandatory; focused unit/structural tests are not a substitute.
6. The Directly Usable — No Migration decision remains correct; no compatibility or migration machinery is warranted.
7. The task branch remains behind tracked `origin/personal`; delivery retains final refresh/integration ownership.
8. `APIE2E-REPO-005` remains separately `Unclear` and must not broaden this implementation.

## Latest Authoritative Result

- Review Decision: `Pass`
- Current Architecture Review Revision: `ARCH-REV-011`
- Reviewed Solution Revision: `SR-013`
- Material-Premise Gate: `Pass` (`MP-ARCH-010-001` and `MP-ARCH-010-002` remain reachable and are handled proportionately)
- Finding IDs: None; `AR-008` and `AR-009` resolved
- Notes: CR-019, CR-020, and CR-021 are resolved in design. The cumulative reviewed solution package is ready for `implementation_engineer`; implementation/source/API-E2E evidence remains pending and no downstream pass is implied.
