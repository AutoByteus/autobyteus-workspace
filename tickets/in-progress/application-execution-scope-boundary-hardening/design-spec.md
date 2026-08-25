# Design Spec

## Current-State Read

The current implementation is behaviorally healthy and already has correct host multiplicity: Studio and standalone each construct canonical process infrastructure, a separate `GeneralProcessRunSupervisor`, and one `ApplicationPlatformRuntime`. The public runtime exposes only lifecycle, REST, realtime, and host-management projections.

Inside that healthy outer boundary, application execution ownership remains procedural. `createApplicationRunServices()` builds one exact graph-local Agent/Team family but returns ten mutable pieces at mixed abstraction levels. `createApplicationOrchestrationServices()` distributes those pieces across launch, host, streaming, lifecycle, and readiness code and returns fifteen outer/internal services. Lifecycle enumerates the scoped MCP session manager and run shutdown coordinator separately. Application assembly also rediscovers process owners through getters, and the stream source retains a redundant process-global Agent manager fallback despite mandatory injection.

The corrected identity relationships must not change: one application family per platform-runtime lifetime, canonical definitions explicitly shared, general execution non-identical, scope-local publication/session/resource identity, and RootTeamRun-local task resolution. See BEH-001–BEH-004 and the investigation source log.

## Intended Change

Introduce one concrete `ApplicationExecutionScope` per existing `ApplicationPlatformRuntime` lifetime. It constructs and privately owns the graph-local mutable execution kernel, enforces admission and exact instance identity, unwinds construction failure, and owns idempotent Team-before-Agent/session shutdown. It exposes frozen, subject-specific capabilities to orchestration, streaming, readiness, artifact access, memory lookup, and lifecycle. It is not a generic container and callers cannot receive both the boundary and raw internals.

Keep `ApplicationPlatformRuntime` as the outer platform owner and `GeneralProcessRunSupervisor` as the distinct general-execution owner. Pass intentionally process-owned dependencies into platform construction by explicit named input. Cleanly remove the broad run-services factory, leaf-level lifecycle bypass, ambient application execution fallback, and obsolete file placement.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, REQ-008; AC-001, AC-008, AC-009 | start Studio | investigation Studio composition trace | one scope at current runtime lifetime; all outcomes preserved | Studio root -> platform -> scope -> surfaces/recovery; DS-001, DS-003–DS-007 |
| BEH-002 | Operational | REQ-001, REQ-007; AC-002, AC-008 | start selected standalone app | investigation standalone trace | same scope boundary; host differences preserved | standalone root -> selected platform -> scope -> listen/recover; DS-002–DS-007 |
| BEH-003 | Contract | REQ-002–REQ-007, REQ-010; AC-003, AC-005–AC-010 | application launch/input/stream/publication/task/reentry/close | current run/orchestration/lifecycle sources | replace mixed bags with exact capabilities without changing results | DS-003–DS-009 |
| BEH-004 | Contract | REQ-004, REQ-009; AC-004, AC-011 | general public Agent/Team launch | general supervisor and host definition trace | retain separate identities and shared canonical definitions | host definitions -> general supervisor, independently host definitions -> platform scope; DS-001, DS-002, DS-006 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `application-execution-scope-ownership-and-spine-map.md` | focused owner/lifetime/dependency/spine map | REQ-001–REQ-010; AC-001–AC-011 | normative detail supporting all structural sections | Design-ready; approved direction |
| `adjacent-application-agent-addressing-evaluation.md` | record separate SDK/protocol cleanup | N/A | establishes an explicit deferral and future boundary | investigated; N/A for this ticket |
| `application-execution-scope-contracts.md` | exact platform/scope inputs, seven capability signatures, consumer/admission/getter/assembly map | REQ-001–REQ-007, REQ-010; AC-001–AC-007, AC-010 | normative boundary detail resolving AR-001 | Design-ready; behavior-neutral refinement |
| `application-execution-scope-transition-inventory.md` | closed production/test/fixture/AFB/proof inventory | REQ-004, REQ-007, REQ-010; AC-005–AC-011 | normative transition detail resolving AR-002 | Design-ready; behavior-neutral refinement |

## Task Design Health Assessment (Mandatory)

- Change posture: `Refactor`
- Current design issue found: `Yes`
- Root cause classification: `Boundary Or Ownership Issue` plus `File Placement Or Responsibility Drift`
- Refactor needed now: `Yes`
- Evidence: one identity/lifecycle family is returned as ten mixed-level pieces, redistributed by a fifteen-member assembly object, separately enumerated by lifecycle, and partly rediscovered through global process accessors; one stream path retains a redundant global manager fallback.
- Design response: represent the existing real owner as `ApplicationExecutionScope`, hide its internals, expose exact capabilities, inject named process dependencies, and remove old bags/fallbacks.
- Refactor rationale: this boundary owns mutable state, construction identity, scoped session lifetime, admission, and ordered cleanup. It therefore removes actual ambiguity instead of adding forwarding indirection.
- Intentional deferrals and residual risk: logical `memberAddress`/runtimeKind simplification is a separate public contract ticket. Latest-base changes may add named dependencies but must not weaken this boundary.

## Terminology

- **Application execution scope**: the concrete mutable owner of the graph-local Agent/Team execution kernel for one platform-runtime lifetime.
- **Process infrastructure**: canonical definitions, workspace/provider/model/runtime readiness, configuration, and MCP route/catalog infrastructure intentionally shared by composition.
- **Execution capability**: a frozen subject-specific interface exported by the scope; it is not a raw service or generic lookup.
- **Quiesce**: idempotently stop accepting new top-level application execution/session work while existing outer work drains.

## Design Reading Order

Read BEH-001–BEH-004, the DS-001–DS-009 spine inventory, then the scope ownership/capability boundaries, and finally the file/change map. Layering and files are derived from those owners.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove `createApplicationRunServices`, its broad return shape, the old runtime-located shutdown file, the stream singleton fallback, application-assembly process getters, and lifecycle dependencies on raw session/shutdown leaves.
- No compatibility alias, wrapper around the old bag, dual construction path, or fallback branch is allowed.

## Persisted Data / State Transition Decision

- Stored subject/location: platform SQLite bindings/overrides/journal, packages, run histories, artifact projections, registered app-data migrations.
- Relevant change: none. No code-model, serialized contract, schema, or store operation changes.
- Normal reader/writer behavior: unchanged.
- Required semantics: all existing identities/history/bindings/projections remain readable and unchanged.
- Physical/operational constraints: no rewrite or migration risk is justified.
- Decision: `Not Affected`.
- Rationale: this is an in-memory ownership/lifecycle refactor; migration provides no benefit and creates unapproved I/O/corruption/rollout cost.
- Supports: REQ-007–REQ-010 and AC-008–AC-010.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior IDs | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-004 | Studio process start | ready configured host | Studio composition + platform lifecycle | proves process/general/application order and multiplicity |
| DS-002 | Primary End-to-End | BEH-002, BEH-004 | standalone start | selected app ready | standalone composition + platform lifecycle | proves host parity without Studio surface leakage |
| DS-003 | Primary End-to-End | BEH-003 | application launch/input | run/binding/event consequence | orchestration with execution capability | proves no manager bypass |
| DS-004 | Return-Event | BEH-003 | authorized stream connection | application UI event | scope streaming + streaming service | proves exact graph-local event identity |
| DS-005 | Return-Event | BEH-003 | authenticated Agent Tools call | durable application projection | scope publication + platform delivery | proves session/provider/run identity |
| DS-006 | Primary End-to-End | BEH-001–BEH-004 | host close | all owners closed in order | platform lifecycle + scope lifecycle | proves admission/drain/Team-Agent/session order |
| DS-007 | Primary End-to-End | BEH-001–BEH-003 | reload request | recovered binding/events | reentry service | proves scope identity is retained |
| DS-008 | Bounded Local | BEH-003 | RootTeamRun member task | same root task lifecycle | RootTeamRun | preserves task authority |
| DS-009 | Bounded Local | BEH-001–BEH-003 | scope construction | success or reverse unwind | ApplicationExecutionScope | proves fail-closed ownership |

## Primary Execution Spine(s)

- DS-001: `server runtime -> buildStudioServer -> HostDefinitionServices + AgentToolsMcpRuntime -> GeneralProcessRunSupervisor -> buildApplicationPlatformRuntime -> ApplicationExecutionScope -> HTTP/WS registration -> prepare/recover`
- DS-002: `standalone start -> process/migrations/package validation -> HostDefinitionServices + AgentToolsMcpRuntime -> GeneralProcessRunSupervisor -> selected ApplicationPlatformRuntime -> ApplicationExecutionScope -> listen/recover`
- DS-003: `application caller -> engine context/orchestration host -> binding authorization/configuration -> Agent or Team execution capability -> exact service/manager/backend/RootTeamRun -> binding/event`
- DS-006: `host close/ingress stop -> platform quiesce -> outer queues/gateways/observers/workers drain -> scope Team stop -> Agent stop -> scoped session/resource close -> streaming stop -> process close`
- DS-007: `reload route -> reentry -> worker stop/reload -> binding recovery -> pending event resume -> same scope`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Studio creates shared process owners, distinct general execution, then one platform/scope before routes and recovery. | host, general execution, platform, execution scope | Studio composition | definitions, MCP route/catalog, readiness |
| DS-002 | Standalone performs its host validation but uses the same platform/scope boundary for selected application behavior. | host, platform, execution scope | standalone composition | migrations, selected package validation |
| DS-003 | Binding orchestration validates/configures; the scope capability owns actual graph mutation and exact run identity. | binding, execution capability, run/root | orchestration + scope | stores, definitions, model readiness |
| DS-004 | Authorized target enters scope stream capability and exact run events return through provider-neutral mapping/queues. | authorized target, run source, application event | scope streaming | authorization lease, limits |
| DS-005 | Process MCP transport reaches a scope-specific session/provider whose publication uses the same activation/run family, then outer delivery reaches the worker. | session, publication, run, delivery | scope publication + platform delivery | capability token, snapshot/projection stores |
| DS-006 | Platform blocks admission and drains outer concerns before asking scope to close its internal runs/sessions. | platform lifecycle, scope lifecycle | platform lifecycle | error aggregation, exact-once close |
| DS-007 | Worker/binding recovery happens around the unchanged scope. | reentry, worker, binding, scope | reentry | availability, journal |
| DS-008 | Member task capability stays rooted in the exact active RootTeamRun. | root, member capability, task | RootTeamRun | scoped/native adapters |
| DS-009 | Scope tracks construction stages and closes only what it created on failure. | scope factory, session scope, kernel | execution scope | reverse cleanup |

## Spine Actors / Main-Line Nodes

- Host composition: owns process construction/unwind only.
- Application platform runtime/lifecycle: owns platform-wide sequencing and outer services.
- Application execution scope: owns mutable execution identity/lifecycle.
- Application orchestration: owns binding use cases and authorization.
- Agent/Team execution capability: owns subject-specific mutation/lookup contract.
- Agent run / RootTeamRun: owns runtime execution and events.
- Streaming/publication/delivery owners: own return transformations and transport across their boundary.

## Ownership Map

| Node | Concrete ownership |
| --- | --- |
| Composition roots | explicit process dependency resolution, host-specific surfaces, reverse process unwind |
| `ApplicationPlatformRuntime` | package/storage/availability/worker/gateway/queue/recovery/reentry and whole-platform lifecycle |
| `ApplicationExecutionScope` | construction identity, private managers/services/registries/sessions/publication/memory/stream source, admission, failure unwind, internal close |
| Orchestration host/launch | binding authorization/configuration/persistence and use-case sequencing |
| `GeneralProcessRunSupervisor` | separate general Agent/Team family and its lifecycle |
| `RootTeamRun` | Team task lifecycle/state/persistence/events and immutable root-local resolution |

`ApplicationPlatformRuntime` remains a governing outer owner; its four public projections are thin subject surfaces. The scope is a deeper governing owner, not a public host facade.

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| runtime REST projection | orchestration/backend/package owners | exact route-facing methods | stores/managers |
| runtime realtime projection | streaming/communication/backend owners | transport registration | execution lookup |
| scope capability object | concrete scope | give one consumer the exact operations it needs | new state separate from scope or generic lookup |

## Removal / Decommission Plan

| Item | Why unnecessary | Replacement | Scope | Notes |
| --- | --- | --- | --- | --- |
| `create-application-run-services.ts` | mixed bag has no authoritative boundary | `application-execution-scope.ts` | In This Change | delete, no wrapper |
| runtime-folder shutdown coordinator | execution-internal concern exposed outward | moved `application-execution-shutdown-coordinator.ts` | In This Change | preserve real sequencing |
| `AgentRunManager.getInstance()` stream fallback | exact manager is mandatory | private injected stream source | In This Change | delete import/branch |
| app assembly process getters | hide dependencies | named platform build inputs | In This Change | roots resolve once |
| lifecycle session-manager/shutdown leaves | bypass scope lifecycle | `ApplicationExecutionLifecycle` | In This Change | no alias |
| raw manager/service fields in orchestration return | mixed levels | narrow scope capabilities + outer owners only | In This Change | tighten return |

## Return Or Event Spine(s)

- DS-004: `binding authorization lease -> scope streaming attach -> Agent/Team event -> mapper -> bounded queue/frame -> worker/frontend -> UI`.
- DS-005: `MCP request -> scope session provider -> publication -> run/projection event -> relay -> delivery queue -> ensured worker -> durable application projection`.
- Run lifecycle: `run/root terminal event -> binding lifecycle gateway -> observer -> terminal transition/store + journal -> event dispatch -> worker`.

## Bounded Local / Internal Spines

- DS-008 parent `RootTeamRun`: `root -> resolver -> member context -> delegate_task -> root task records/events`.
- DS-009 parent `ApplicationExecutionScope`: `construct stage -> record resource -> next stage -> failure -> reverse close -> rethrow`.
- Scope close: `open -> quiesced -> Team stop -> Agent stop -> remaining session close -> closed`; repeated calls reuse the same promise. This is owner-local state, not a generic shared state machine.

## Off-Spine Concerns Around The Spine

| Concern | Spine IDs | Serves | Responsibility | Why | Risk if main line |
| --- | --- | --- | --- | --- | --- |
| canonical definitions | DS-001–DS-003 | general + application execution | definition CRUD/read authority | intentional shared input | scope would own process data |
| model/provider/runtime readiness | DS-001–DS-003 | launch configuration | validate runnable resources | process policy | execution scope becomes policy blob |
| binding/journal stores | DS-003–DS-007 | orchestration | persistence | owned by platform/orchestration | managers would know application transport |
| MCP route/catalog | DS-001, DS-002, DS-005 | process server | transport/catalog/registry | one route system | duplicated route/scope |
| artifact queue/worker controller | DS-005, DS-006 | platform delivery | outer delivery and worker ensure | survives outside run owner | scope would own workers |
| architecture guards | all | boundary | executable dependency rules | prevents regression | not production spine |

## Ownership Boundaries

The platform builds the scope but does not reach inside it. Orchestration authorizes application bindings and passes exact domain inputs to a capability; it does not resolve a manager. The scope consumes shared definitions/readiness inputs but cannot own or rediscover them. Process MCP owns route/catalog/registry; the scope owns only its application session scope and graph-sensitive capabilities. General execution and application execution share inputs, never mutable execution owners.

## Boundary Encapsulation Map

| Authoritative Boundary | Encapsulates | Required callers | Forbidden bypass | If too thin |
| --- | --- | --- | --- | --- |
| `ApplicationExecutionScope` capabilities | managers, services, registries, sessions, memory, publication, stream source | orchestration, streaming, readiness, lifecycle | capability plus raw manager | add exact semantic method to appropriate capability |
| `ApplicationPlatformRuntime` projections | platform stores/queues/workers/gateways/scope | route registrars/host | runtime plus internal service | strengthen subject projection |
| `GeneralProcessRunSupervisor` | general managers/sessions | Studio public run services/lifecycle | singleton getters or app scope | add general-specific method |
| binding authorization | binding/member ownership | input/stream surface | scope manager lookup by app ID | strengthen authorization descriptor |
| `RootTeamRun` task capability | root task lifecycle | members/session adapters | global Team service | strengthen root-local resolver |

## Dependency Rules

Allowed:
- compositions -> named process owners + general supervisor + platform builder;
- platform builder -> scope + outer platform owners;
- orchestration/streaming/readiness/lifecycle -> exact scope capability;
- scope -> injected canonical definitions/workspace/MCP factory/binding and delivery ports;
- scope internals -> current Agent/Team/history/memory/publication implementations.

Forbidden:
- application source -> Agent/Team singleton/service getters or execution locators;
- routes/controllers -> raw execution managers;
- one consumer -> scope and internal manager/registry/session manager;
- scope <-> general supervisor internals;
- scope -> worker/package/availability/reentry ownership;
- per-application scope registry; generic DI/container/event bus; `buildServer(mode)`.

## Interface Boundary Mapping

The exact normative TypeScript signatures, eight-field scope input, twelve-required-field platform build input, admission semantics, getter disposition, and twelve-field internal orchestration assembly result are in `application-execution-scope-contracts.md`. The table below is a navigation summary, not permission to widen those signatures.

| Interface | Subject | Responsibility | Identity shape | Notes |
| --- | --- | --- | --- | --- |
| `ApplicationAgentExecution` | Agent execution | create/resolve/terminate/observe | exact agent definition/run IDs and current launch types | create checks scope admission |
| `ApplicationTeamExecution` | Team execution | preset/configured create, resolve/terminate/observe | exact Team definition/run/root config | create checks admission |
| `ApplicationExecutionStreaming` | authorized runtime event source | attach listener | existing authorized target descriptor | no public-address resolution |
| `ApplicationPublishedArtifactAccess` | published artifacts | list/read projection/revision | run/member memory identity | read-only |
| `ApplicationExecutionMemoryLookup` | Team member memory | resolve member location | teamRunId + agentRunId | narrow lookup |
| `ApplicationExecutionToolReadiness` | tool/session readiness | publisher input + assert ready | scope identity implicit | no session manager exposure |
| `ApplicationExecutionLifecycle` | scope lifetime | quiesce/close | none | idempotent; normal lifecycle projection only |

The concrete scope additionally has an assembly-only `abortConstruction()` method. It is callable only by `buildApplicationPlatformRuntime` before the runtime is published, is synchronous because the construction invariant forbids live runs, closes the created session manager/scope exactly once, and is not part of any consumer capability.

## Interface Boundary Check

| Interface | Singular? | Explicit identity? | Ambiguous selector risk | Corrective action |
| --- | --- | --- | --- | --- |
| Agent execution | Yes | Yes | Low | keep separate from Team |
| Team execution | Yes | Yes | Low | keep preset/configured methods explicit |
| Streaming | Yes | Yes | Low | accept only authorized descriptor |
| Artifact/memory | Yes | Yes | Low | remain read-only/subject-specific |
| Lifecycle | Yes | N/A | Low | do not add service lookup |

## Main Domain Subject Naming Check

| Node | Name | Natural? | Drift risk | Action |
| --- | --- | --- | --- | --- |
| concrete execution owner | `ApplicationExecutionScope` | Yes | Low | “scope” denotes an explicit identity/lifetime boundary, not a bag |
| outer owner | `ApplicationPlatformRuntime` | Yes | Medium | preserve established name; docs define it as live platform services/lifecycle |
| Team-before-Agent concern | `ApplicationExecutionShutdownCoordinator` | Yes | Low | move from outer runtime folder |
| capability names | Agent/Team/Streaming/Artifact/Memory/Readiness/Lifecycle | Yes | Low | avoid “services”/“context” aggregate |

## Existing Capability / Subsystem Reuse Check

| Need | Existing area | Decision | Why | If new |
| --- | --- | --- | --- | --- |
| run managers/services | Agent/Team execution | Reuse | behavior/owners stay | N/A |
| scoped MCP | Agent Tools MCP | Reuse | existing route/session isolation works | N/A |
| publication/memory/history | existing services | Reuse | graph-sensitive implementations stay | N/A |
| mutable execution lifetime boundary | application platform | Create New | missing concrete owner with real state/lifecycle | cannot be absorbed by outer platform without exposing mixed levels |
| Team-before-Agent sequencing | current shutdown coordinator | Extend/move | real concern | N/A |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spine IDs | Owner | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| application execution | graph-local kernel/lifetime/capabilities | DS-003–DS-006, DS-008–DS-009 | scope | Create New grouping | ownership-led folder |
| application platform runtime | outer platform/lifecycle | DS-001–DS-007 | runtime | Extend | public four projections unchanged |
| orchestration | binding/config/recovery | DS-003–DS-007 | host/reentry | Extend | consume capabilities |
| streaming/publication | return paths | DS-004, DS-005 | existing owners | Reuse | exact scope identities |
| process composition | named shared inputs | DS-001, DS-002, DS-006 | roots | Extend | no generic input bag |

## Draft File Responsibility Mapping

| Candidate File | Area | Owner | Concern | Why one file | Shared structure? |
| --- | --- | --- | --- | --- | --- |
| `application-execution-scope.ts` | execution | scope | construction, private identity, projections, admission, unwind, close | one governing owner | contracts file |
| `application-execution-scope-contracts.ts` | execution | capability boundary | semantic interfaces and build input | reusable by consumers | yes |
| `application-execution-shutdown-coordinator.ts` | execution | shutdown concern | Team-before-Agent/error aggregation | distinct bounded sequence | no |

## Reusable Owned Structures Check

| Structure | Shared file | Owner | Why | Redundant attributes removed? | Overlap removed? | Must not become |
| --- | --- | --- | --- | --- | --- | --- |
| scope capabilities/build input | scope contracts | application execution | multiple exact consumers need types | Yes: no raw internals | Yes: split by subject | generic service bag |
| platform process inputs | existing platform builder input type | composition/platform | both roots pass same named owners | Yes | Yes | `ProcessServices` locator |

## Shared Structure / Data Model Tightness Check

| Structure | Clear fields? | Redundant removed? | Parallel risk | Action |
| --- | --- | --- | --- | --- |
| capability interfaces | Yes | Yes | Low | no optional catch-all methods |
| platform build input | Yes | Yes | Low | named required fields, no generic container |
| existing public SDK DTOs | unchanged | N/A | existing adjacent redundancy | defer whole contract cleanly |

## Final File Responsibility Mapping

| File | Area | Owner | Concrete concern | Why one file | Reuses structure? |
| --- | --- | --- | --- | --- | --- |
| `src/application-platform/execution/application-execution-scope.ts` | execution | scope | build/private-own kernel; frozen projections; admission/unwind/close | exact real owner | contracts |
| `.../application-execution-scope-contracts.ts` | execution | boundary | required input + seven capability contracts | semantic contract authority | N/A |
| `.../application-execution-shutdown-coordinator.ts` | execution | shutdown | idempotent Team-before-Agent aggregation | bounded local owner | N/A |
| `src/application-platform/runtime/build-application-platform-runtime.ts` | platform | runtime assembly | construct scope/outer services and four projections | assembly root | scope contracts |
| `.../create-application-orchestration-services.ts` | orchestration | assembly | build outer binding/recovery/stream/delivery owners using capabilities | coherent outer assembly | scope contracts |
| lifecycle files | platform | lifecycle | exact outer order using scope lifecycle/readiness | existing owner | scope contracts |
| stream source | streaming | source | exact injected Agent/Team attachment only | existing concern | streaming contract |

## Applied Patterns

- Concrete lifetime owner: scope owns state/invariants, not a service locator.
- Capability interfaces: immutable subject-specific projections enforce authoritative boundary.
- Existing factory patterns remain only for backend creation; no pass-through assembly factory is added.
- Owner-local lifecycle state/promise supports idempotence; no generic state-machine framework.

## Target Subsystem / Folder / File Mapping

The exact Add/Modify/Rename/Remove and durable-test path set is normative in `application-execution-scope-transition-inventory.md`; category rows below explain placement only.

| Path | Kind | Owner / Boundary | Responsibility | Why here | Must not contain |
| --- | --- | --- | --- | --- | --- |
| `src/application-platform/execution/` | Folder | application execution | scope, contracts, internal shutdown | makes deeper owned runtime visible | routes/stores/packages/workers |
| `.../application-execution-scope.ts` | Add | scope | concrete construction/lifecycle | main owner | public transport or generic lookup |
| `.../application-execution-scope-contracts.ts` | Add | capability boundary | exact 8-field scope input and all seven capability contracts using type-only domain imports; outer platform build input remains exported by its builder | prevents type dependence on managers | optional service fields or concrete outer stores |
| `.../application-execution-shutdown-coordinator.ts` | Rename/Move | scope internal | Team-before-Agent stop | ownership aligned | platform-wide cleanup |
| `runtime/create-application-run-services.ts` | Remove | obsolete | old bag factory | replaced | N/A |
| `runtime/create-application-orchestration-services.ts` | Modify | orchestration | accept already-created orchestration stores and scope capabilities; return sibling outer assembly handles only; named readiness input | existing assembly | raw managers/sessions or an exported authoritative bag |
| `runtime/build-application-platform-runtime.ts` | Modify | platform | construct scope and explicit process inputs | existing root | process getters |
| lifecycle contract/implementation | Modify | platform lifecycle | use readiness/lifecycle capability | exact outer order | scope leaves |
| stream runtime source | Modify | streaming | remove singleton fallback | exact identity | global manager import |
| Studio/standalone roots | Modify | composition | pass named Workspace/readiness owners | explicit dependency | execution internals |
| launch/host/lifecycle gateway service files | Modify | orchestration | depend on Agent/Team/artifact/memory capabilities | no raw service types | managers |

Test inventory:
- Rename/replace `tests/unit/application-platform/application-run-services.test.ts` with `application-execution-scope.test.ts`.
- Rename/move shutdown coordinator test to execution scope ownership.
- Modify architecture boundaries, platform runtime isolation, lifecycle, stream source, orchestration launch/host, Studio composition, and standalone integration tests.
- Preserve existing real dual-host application tests as characterization; API/E2E owns final coverage investigation.

Normative AFB-004 transition: move all 22 existing nested-construction obligations and sole-occurrence authority to `application-execution-scope.ts`; tighten workspace requirements on publication/Claude session construction; add three defaulting-owner obligations for memory location, run-file change, and Agent history catalog (25 nested obligations total); add complete/omitted/null/undefined/spread checks for all eight `ApplicationExecutionScope.create` fields and all twelve required `buildApplicationPlatformRuntime` fields; require the two exact host call sites and standalone-only `selectedApplicationIds`; forbid the seven assembly-level ambient process selectors below host roots; enforce consumer contract imports, exact lifecycle fields, exact 12-field orchestration result, and old/new path absence/presence. Provider-owned process defaults remain only in the explicitly listed existing backend helper positions. See the contract and transition supplements for exact dispositions.

## Folder Boundary Check

| Folder | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `application-platform/execution` | Main-Line Domain-Control | Yes | Low | one deeper owner with three cohesive files |
| `application-platform/runtime` | Mixed Justified | Yes | Low | outer assembly/lifecycle only after removal |
| `application-orchestration` | Main-Line Domain-Control/Persistence | Yes | Medium | existing subsystem; this ticket narrows manager dependencies without cosmetic moves |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| dependency | `launchService -> scope.agentExecution.create(...)` | `launchService -> scope + agentRunManager` | one boundary |
| lifecycle | `platform.quiesce -> drains -> execution.close` | lifecycle individually calls session/Team/Agent internals | encapsulated order |
| input | named `workspaceManager`, `modelAvailabilityService` fields | `getWorkspaceManager()` or `ProcessServices.get()` | visible dependency |
| multiplicity | one scope per platform runtime | `Map<applicationId, managers>` | no unsupported locator |
| addressing deferral | authorization later resolves memberAddress above scope | scope routes public memberAddress to manager | separate responsibilities |

## Backward-Compatibility Rejection Log

| Candidate | Why considered | Decision | Clean replacement |
| --- | --- | --- | --- |
| keep old factory behind scope | easier incremental move | Rejected | scope absorbs construction; delete factory |
| compatibility alias for shutdown class | reduce imports | Rejected | rename/move and update callers/tests |
| optional manager fallback | generic reuse | Rejected | required exact injection; general path has its own factory |
| generic process service container | fewer parameters | Rejected | named required inputs |
| per-app scope registry | perceived isolation | Rejected | one evidenced runtime scope; binding authorization preserves isolation |
| dual public target address | adjacent simplification | Rejected | separate clean versioned ticket only |

## Derived Layering (If Useful)

`Host composition -> ApplicationPlatformRuntime (outer platform) -> ApplicationExecutionScope capability -> Agent/Team execution internals`.

Orchestration is a peer use-case owner under the platform and may call scope capabilities; it cannot skip into managers. Transport surfaces call runtime projections, not orchestration internals. This layering is explanatory and follows the owner/spine model.

## Change / Refactor Sequence

1. Add scope contracts and internal shutdown coordinator at the target ownership path; move/update coordinator tests.
2. Implement scope construction by moving the exact current graph from `createApplicationRunServices`; add staged reverse unwind, frozen capabilities, admission state, and idempotent close.
3. Add focused scope identity/construction/unwind tests before changing outer callers, including the assembly-only pre-publication abort.
4. Change launch, lifecycle gateway, orchestration host, and streaming dependencies to exact capability interfaces; remove the stream fallback.
5. Move construction of orchestration stores to the explicit platform assembly root; change orchestration assembly to accept those stores, scope capabilities, and named readiness owners, and remove raw execution leaves from its return.
6. Change platform builder to accept named process dependencies, follow the exact outer-stores -> scope -> orchestration order, abort the scope if later pre-publication assembly fails, wire readiness/lifecycle, and preserve the four outward projections.
7. Update Studio/standalone roots to resolve/pass named process owners, preserving construction/unwind order.
8. Replace lifecycle leaf dependencies with scope readiness/lifecycle while retaining the exact outer stop order.
9. Delete old run-services file/imports and old shutdown path; update architecture occurrence rules to the new authoritative construction file and forbid all shortcuts.
10. Run focused unit/architecture/integration checks, then complete source review and API/E2E dual-host/identity/reentry/publication/task/cleanup evidence.

No temporary compatibility seam survives a commit intended for review.

## Key Tradeoffs

- The scope adds one concrete type but removes two broad bags, multiple mixed-level dependencies, and fallback access. Its real lifecycle/state justify the abstraction.
- Named process inputs increase constructor verbosity at the composition boundary. That verbosity is deliberate dependency documentation and preferable to hidden accessors.
- One scope serves multiple Studio applications because that is current product reality. Strong isolation remains binding/session/run-owned rather than multiplying manager families without a lifecycle trigger.
- Address DTO cleanup is deferred to keep this refactor behavior-neutral and independently reviewable.

## Risks

- A naive implementation could merely expose service getters; architecture guards and capability-only consumer types must prevent this.
- Construction movement may accidentally change backend factory arguments/defaults; exact current graph construction and AFB occurrence obligations must be preserved.
- Shutdown folding may accidentally shift streaming/session order; retain the outer sequence and test every step.
- Latest-base changes could add an ambient accessor; refresh and extend named input/guard inventories before implementation finalization.

## Guidance For Implementation

- Use type-only imports and domain-specific contracts; do not solve cycles with `unknown`, optional fields, or a generic container.
- Keep all scope internals `private`; expose frozen capability objects and lifecycle/readiness projections only.
- Gate top-level create/session admission after `quiesce`; do not invent a generic state framework.
- Staged construction must close the session manager when created, otherwise its raw scope, and must never close shared process infrastructure.
- Preserve every explicit backend factory argument and graph-local injection from current `createApplicationRunServices`.
- Keep current public runtime/SDK/wire/store schemas byte-compatible because they are outside scope.
- Update architecture tests to enforce both forbidden calls/imports and required constructor arguments/occurrence ownership in the new scope file.
