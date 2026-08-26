# Design Spec

## Current-State Read

The exact current source authority is `origin/personal@4108786f4058ca83fd036df84666a2c846fd6401`. Its execution ownership design is healthy and remains fixed: `ApplicationExecutionScope` owns the graph-local application run family and exactly seven outward capabilities; `GeneralProcessRunSupervisor` remains a separate execution family; finalized provider/session composition, stopped-run model validation, and application-run ownership remain explicit. The remaining problem is at the application-agent addressing boundary. A public caller must currently name a binding, repeat whether that binding represents an Agent or Team, and—for a Team member—supply the physical `agentRunId`. The binding is already the authority for Agent-versus-Team subject and the configured member-address-to-run-ID mapping. `ApplicationAgentTargetAuthorizationService` loads that binding, yet `ApplicationOrchestrationHostService` reloads and reinterprets the public selector and `ApplicationAgentStreamRuntimeSource` interprets it again. The scope contract additionally imports the complete higher-level authorization descriptor merely to type streaming. The same boundary carries application-role `runtimeKind` attributes that are constant or derivable from the enclosing binding/event subject.

Persistence analysis found JSON supersets containing the redundant role field, one physical NOT NULL member-role column, and no durable application-agent target address. The retained identity and display fields are already present. The target must therefore contract the current schema without introducing a migration or a compatibility path.

## Intended Change

Replace the three-way public physical target union with one exact logical address `{ bindingId, memberAddress }`. Make binding authorization the sole logical-to-physical translator. It returns one immutable orchestration-owned authorization descriptor whose `runtime` field is the scope-owned `ResolvedApplicationAgentExecutionTarget`. The host and subscription use the complete descriptor. Host input discriminates only `descriptor.runtime` and calls the existing subject-specific scope commands; scope streaming receives `descriptor.runtime`. The scope never depends upward on authorization evidence. Remove application-role `runtimeKind` from binding members and producers, preserve provider/launch `runtimeKind`, and introduce current-schema projectors that read existing JSON supersets directly while new writers emit only the current shape.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Criteria | Approved Trigger Or Contract | Existing Behavior / Evidence | Approved Change / Preserved Outcome | Target Path / Spines |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | REQ-001–003; AC-001–004 | application Agent input/stream address | requirements and investigation target trace | one root/member logical selector; binding owns subject and exact resolution | DS-001, DS-002, DS-008 |
| BEH-002 | User | REQ-002; AC-002, AC-005 | Socratic selects `/tutor` | Socratic lesson-model source | application code selects logical member only; physical IDs remain internal | DS-001 |
| BEH-003 | System | REQ-003–004; AC-003, AC-006–007 | authorized input or stream | authorization/host/stream source trace | one authorization result; no downstream binding reload or public reinterpretation | DS-001, DS-002, DS-008 |
| BEH-004 | Contract | REQ-005; AC-008–010 | websocket URL, READY, event, worker capability | contracts/frontend/server protocol sources | one canonical root/member wire shape; existing transport lifecycle preserved | DS-001–DS-003, DS-007 |
| BEH-005 | System | REQ-006; AC-011–013 | binding launch and execution event | launch/auth/mapper/application sources | remove derivable application-role fields; keep physical identity and provider runtime kind | DS-004, DS-005 |
| BEH-006 | Operational | REQ-007; AC-014–016 | restart/recovery reads existing rows, journal entries, metadata | binding store, event journal, metadata store | version-agnostic current projection reads supersets; no rewrite or migration | DS-006, DS-009 |
| BEH-007 | Contract | REQ-008; AC-017–018 | package regeneration and both-host execution | maintained application and package inventory | atomic clean cut with identical business outcomes | DS-001–DS-006 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To Design | Status / Approval |
| --- | --- | --- | --- | --- |
| `logical-application-agent-addressing-contract.md` | exact public/private/address/producer/persistence contract | REQ-001–007; AC-001–016 | normative interface and data contract | Approved with requirements |
| `logical-application-agent-addressing-transition-inventory.md` | exact Add/Modify/Remove/test/package inventory | REQ-001–008; AC-001–018 | normative transition completeness | Current; approval N/A |
| `current-personal-refresh-analysis.md` | exact current-base/source-spine/intersection/persistence revalidation | REQ-001–008; AC-001–018 | current source evidence for SR-002 | Current; approval N/A |
| upstream `future-architecture-simplification-review.md` | source-grounded trigger and six-spine assessment | all | read-only design evidence | N/A |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` and `Refactor`.
- Current design issue found: `Yes`.
- Root cause classification: `Boundary Or Ownership Issue`, `Shared Structure Looseness`, and `Duplicated Policy Or Coordination`.
- Refactor needed now: `Yes`.
- Evidence: the public address repeats binding-owned subject and physical member identity; three downstream locations interpret the same selector; the scope contract imports a higher-level complete authorization descriptor; application-role fields are constant or derivable; application code manually maps logical member address to physical run ID.
- Design response: one logical public shape, one authoritative translator, one complete orchestration descriptor containing one scope-owned exact runtime target, two current-schema projectors, and clean removal of redundant fields/paths.
- Refactor rationale: each target concern has one concrete owner and the data-flow spines no longer cross both an outer boundary and its internals.
- Intentional deferrals: dynamic task-agent addressing is not a current supported product surface; removing physical IDs from binding/event correlation is outside scope. Finalized provider/session composition and execution-scope lifecycle are preserved current baselines rather than deferred work. None requires change for this design.

## Terminology

- **Logical target:** a binding ID plus either root (`memberAddress:null`) or one canonical configured Team member address.
- **Physical target:** the exact Agent/Team run identity resolved from a currently authorized binding.
- **Resolved execution target:** the narrow immutable private discriminated value produced by authorization, used by host input dispatch, and accepted by execution-scope streaming; it contains only exact subject/run identity and the producer projection needed by streaming.
- **Authorized descriptor:** immutable orchestration-owned translation result containing the public address, binding snapshot, and one resolved execution target in `runtime`.
- **Application-role runtime kind:** the redundant `AGENT | AGENT_TEAM_MEMBER` classification removed here; it is distinct from provider launch `runtimeKind`.
- **Current-schema projector:** version-agnostic reconstruction of recognized current fields from persisted JSON; it is not a legacy decoder.

## Design Reading Order

Behavior -> public logical contract -> authorization spine -> input/stream consumers -> role contraction -> current-data projection -> exact file transition.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove the old target union, old public target kinds/run ID, old URL segments, old helpers, redundant application-role fields, downstream reinterpretation, and raw casts/spreads at affected persistence boundaries.
- The implementation must not add aliases, dual address validation, version negotiation, old/new wire unions, version-specific persistence branches, or fallback physical targeting.
- Existing stored JSON is not a legacy runtime path: the current projector uniformly ignores unknown extras and requires every retained field.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: binding `summary_json` and member rows in platform SQLite; binding/producer JSON in the execution-event journal; Agent `run_metadata.json.applicationExecutionContext`; volume is installation-dependent and must not be rewritten for representation cleanup.
- Relevant change: remove application-role `runtimeKind` from current Team-member/producer JSON models; leave all retained IDs/display/address/subject fields and the physical member table intact.
- Normal reader/writer behavior and evidence: current stores parse JSON and currently allow broad casts/spreads. Representative old records contain every retained field plus `runtimeKind`. The physical member table requires `runtime_kind TEXT NOT NULL`.
- Required semantics: exact binding/runtime identity, member mapping, pending event dispatch/ack, run restoration, publication correlation, and restart/reentry remain unchanged.
- Constraints: no target address is durably stored; physical table cannot omit its role column without a table rewrite; unknown JSON extras may be ignored only at owned projection boundaries; missing/invalid retained fields fail closed.
- Decision: `Directly Usable — No Migration`.
- Rationale: a strict version-agnostic current projector reconstructs all retained meaning from existing supersets. A migration adds I/O, interruption, rollback, and corruption exposure without changing semantics. The physical column remains a derived write constant and is not exposed in the current model.
- Supported criteria: REQ-007; AC-014–AC-016.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behaviors | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | 001–004,007 | application backend input command | exact Agent/Team input result and binding snapshot | authorization service + scope command boundary | proves logical address becomes one resolved basis for subject-specific command arguments |
| DS-002 | Primary End-to-End | 001,003–004,007 | frontend/backend logical stream connection | application Agent event at caller | authorization lease + streaming service + scope streaming capability | proves one resolved target drives root/member filtering without leaking authorization evidence into scope |
| DS-003 | Primary End-to-End | 004,007 | worker/backend communication open | READY, input/subscription, reconnect/close | communication session | proves wire/worker parity |
| DS-004 | Primary End-to-End | 005,007 | application run launch | current binding/member projection | binding launch service/store | removes role at its origin |
| DS-005 | Return-Event | 005,007 | Agent/Team runtime event or artifact | worker/frontend/application projection | event ingress/stream mapper/publication relay | preserves physical correlation without role field |
| DS-006 | Primary End-to-End | 006,007 | host restart/recovery | active binding/event/run context restored | binding/event/metadata stores | proves direct use without rewrite |
| DS-007 | Bounded Local | 004 | public address or URL | canonical encoded/decoded address | contracts URL codec | one wire representation |
| DS-008 | Bounded Local | 001,003 | authorization request | immutable authorized descriptor or exact failure | authorization service | one translation authority |
| DS-009 | Bounded Local | 006 | persisted unknown JSON | validated current object or fail-closed result | current-schema codecs/projector | no historical branch in runtime |

## Primary Execution Spine(s)

- DS-001: `application business code -> backend SDK logical target -> worker capability protocol -> ApplicationOrchestrationHostService -> ApplicationAgentTargetAuthorizationService -> binding store/current projection -> AuthorizedApplicationAgentTargetDescriptor -> descriptor.runtime -> ApplicationExecutionScope Agent/Team command -> run input outcome`; the host returns `descriptor.binding`.
- DS-002: `frontend/backend connection -> canonical target URL or worker subscription -> communication/streaming service -> authorization lease -> AuthorizedApplicationAgentTargetDescriptor -> descriptor.runtime -> scope-owned runtime event source -> exact root/member filter -> READY/event -> caller`; the stream source never receives the complete descriptor.
- DS-003: `application worker -> engine protocol -> communication session -> authorization -> input/subscription -> READY/event/response -> worker`.
- DS-004: `application launch request -> launch configuration/authorization -> scope Agent/Team creation -> binding launch service -> binding store -> role-free public binding`.
- DS-006: `host lifecycle recovery -> binding/event/metadata store -> current-schema projector -> application recovery/reentry -> resumed exact binding/run/event state`.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Caller chooses root or logical member. Authorization loads one binding, derives subject/exact IDs, and host dispatch derives the existing scope-command arguments only from `descriptor.runtime`. | logical address, binding, descriptor, resolved target, run command | authorization + scope | member parser, binding store |
| DS-002 | The same logical address crosses URL or worker protocol. One authorization result governs lease and event address; only its resolved target crosses the scope boundary for source selection/member filtering. | address, descriptor, resolved target, stream source, event | streaming service/lease + scope | URL codec, event validator |
| DS-003 | Worker transport changes schema only; queue limits, READY sequencing, reconnect, and terminal errors remain owned by the existing communication session. | frame, session, descriptor, response | communication session | protocol validator |
| DS-004 | Launch constructs smaller current bindings at the source; Team members retain logical/physical identity but not a redundant role. | launch, scope creation, binding | binding launch service | current model policy |
| DS-005 | Runtime subject remains on the event/binding where classification is required and physical run ID remains on producer; mapper/relay/context consumers no longer carry an unused duplicate role. | runtime event, producer, application event | event ingress/mapper/relay | journal, artifact projection |
| DS-006 | Current-schema owners reconstruct recognized fields from existing supersets before normal recovery. No historical type reaches orchestration. | stored JSON, current object, recovery | each store/projector | SQLite/file I/O |
| DS-007–009 | Canonical parsing, authorization resolution, and persisted projection are bounded transformations under their owning boundaries. | address/URL, binding/descriptor, JSON/current object | codec/auth/projector | validation errors |

## Spine Actors / Main-Line Nodes

Application business caller, SDK target builder, worker/frontend transport, orchestration host, authorization service, binding store, authorized descriptor, `ApplicationExecutionScope` capabilities, communication/streaming services, event mapper/relay, recovery owners.

## Ownership Map

- SDK contracts own the one public address/member/producer schemas and canonical URL grammar.
- Backend SDK owns ergonomic logical target construction against a supplied binding; it does not translate to physical identity.
- Binding store owns persisted/current binding projection and physical member-role storage constant.
- Authorization service owns application/status validation, the complete immutable descriptor, and the only logical-to-physical translation.
- Orchestration host owns input sequencing, uses `descriptor.runtime` for the scope command, and returns `descriptor.binding`; it does not reload binding state.
- Streaming/communication services own lease/session/event flow. Subscription uses the complete descriptor for authorization/address evidence but passes only `descriptor.runtime` to the scope; neither layer reinterprets the public selector.
- `ApplicationExecutionScope` remains the authoritative graph-local command/event boundary, owns the narrow `ResolvedApplicationAgentExecutionTarget` streaming input type, and never imports the higher-level authorization service; raw managers remain encapsulated.
- Event/metadata stores own current-schema projection at their persistence boundaries.
- Maintained applications own logical member choice such as `/tutor`, never physical address translation.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| backend SDK target builders | binding authorization | developer-facing construction/early exact member check | runtime subject/physical resolution |
| target URL codec | public address contract | canonical transport representation | binding lookup/authorization |
| orchestration REST/worker methods | orchestration host + scope | host entrypoint | raw managers or alternate resolver |
| stream/communication URL handlers | streaming/communication service | transport registration | member mapping or execution ownership |

## Removal / Decommission Plan (Mandatory)

| Item To Remove | Why Unnecessary | Replacement | Scope | Notes |
| --- | --- | --- | --- | --- |
| `ApplicationAgentTarget` three-way union | repeats binding authority/physical ID | exact address fields | In This Change | no alias |
| public target `kind` and Team-member `agentRunId` | derivable/translated by binding | `memberAddress` | In This Change | root is explicit null |
| `ApplicationExecutionProducerRuntimeKind` | classification derives from subject | event/binding runtime subject | In This Change | provider kinds untouched |
| member/producer `runtimeKind` | constant/derivable | smaller models | In This Change | DB column stays private constant |
| separate Team-root helper | root shape is identical | shared root builder | In This Change | helper validates supplied binding |
| old URL segments and validators | old public schema | root/member grammar | In This Change | reject old literals |
| input binding reload/public reinterpretation | bypasses descriptor authority | descriptor binding/runtime | In This Change | occurrence guard |
| stream public-address branching | duplicates translator | descriptor runtime union | In This Change | occurrence guard |
| raw affected JSON casts/spreads | leak stale fields | current codecs/projector | In This Change | fail retained-field errors |

## Return Or Event Spine(s) (If Applicable)

- DS-005 streaming return: `run event -> scope event source -> producer projector -> application stream mapper -> event journal/transport -> logical address event -> caller`.
- DS-005 publication return: `run context -> published artifact -> application relay -> binding/producer authorization -> application worker/projection`; exact run ID still correlates the artifact, while role derives from the enclosing subject.
- Input returns the binding snapshot carried by the descriptor, ensuring the result represents the state that was actually authorized.

## Bounded Local / Internal Spines (If Applicable)

- DS-007, contracts owner: `address -> validate exact fields -> encode canonical segments` and `segments -> strict decode -> member parser -> exact address`.
- DS-008, authorization owner: `validate exact public shape -> load one binding -> check application/status -> derive subject -> exact member match -> freeze descriptor`.
- DS-009, persistence owner: `parse unknown JSON -> validate retained fields -> explicitly reconstruct current object -> freeze/return`; unknown extras are never spread onward.

## Off-Spine Concerns Around The Spine

| Concern | Spines | Serves Which Owner | Responsibility | Why | Risk If Main Line |
| --- | --- | --- | --- | --- | --- |
| canonical member parser | 001,002,007,008 | contracts/auth | rooted non-root syntax | shared public invariant | duplicated permissive parsing |
| URL codec | 002,003,007 | transport | canonical one-segment encoding | wire concern | transport grammar leaks into domain |
| binding record codec | 004,006,009 | binding store | current record projection | persistence boundary | historical extras leak to runtime |
| producer projector | 005,006,009 | event/metadata/auth | current producer projection | repeated stored/current transform | role logic duplicated |
| physical role constant | 004,006 | binding store | satisfy unchanged DB constraint | schema concern | DB artifact becomes public domain field |
| validators/equality | 002,003 | frontend/worker sessions | exact frame/address contract | untrusted boundary | alternate semantics |
| package generation | all | SDK/application owners | atomic owned copies | maintained distribution | stale dual contracts |

## Ownership Boundaries

The binding is authoritative for Agent-versus-Team subject and configured member-to-run identity. The public caller names only root/member intent. Authorization is the sole boundary that may cross from logical intent to physical execution identity. Above it, no public API carries member run IDs. At the boundary, the complete descriptor owns authorization evidence and embeds the scope-owned resolved execution target. Below it, host input derives the existing subject-specific command arguments only from that target, and scope streaming receives that target directly. Neither can reload the binding, inspect the public address, or depend on the authorization service. Persistence stores expose current objects only; historical extra attributes do not cross their boundary. `ApplicationExecutionScope` remains authoritative for mutable execution and is not widened beyond changing one existing capability input value.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanisms | Required Callers | Forbidden Bypass | If API Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| SDK logical address contract | member grammar/URL representation | app backend/frontend/worker | custom kind/run-ID selector | add exact logical operation |
| binding store/current codec | SQLite rows/JSON/physical constant | launch/auth/recovery | raw JSON cast/spread | extend current projection |
| authorization service | binding lookup/member map/complete descriptor | host/streaming/communication | reload/re-resolve downstream | extend descriptor |
| `ApplicationExecutionScope` capabilities | resolved-target type/managers/runs/event sources | host/stream subscription | raw manager plus scope or full authorization descriptor into scope | adjust existing narrow capability input |
| event/metadata projectors | stored producer/context JSON | journal/metadata/auth | version branch/raw object spread | extend current projector |

## Dependency Rules

Allowed: application -> logical SDK target; transport -> the same public address; host/stream subscription -> authorization; authorization -> binding store/current codec and scope-owned resolved-target type; host/subscription -> descriptor runtime and scope capabilities; scope runtime source -> resolved target only; stores -> current codecs/projector; event/binding subject -> role classification where required; context-only consumers -> role-free producer identity.

Forbidden: public address -> run kind or member run ID; application -> logical-to-physical target projection; authorization caller -> both descriptor and binding store; input/stream -> public selector interpretation; scope contracts/source -> authorization-service import, complete descriptor, public address, or binding snapshot; caller -> scope plus raw manager; producer/member -> application-role runtime kind; current runtime -> old schema version branch; generic ID, service locator, manager router, compatibility adapter, or dual protocol.

## Interface Boundary Mapping

| Interface / Method | Subject Owned | Responsibility | Accepted Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `parseApplicationAgentMemberAddress` | public member address | canonical validation | rooted non-root string | no execution lookup |
| `createApplicationAgentTargetAddress` | bound root target | build root logical address | Agent/Team binding | always null member |
| `createApplicationAgentTeamMemberTargetAddress` | configured member target | early exact logical membership check | Team binding + memberAddress | never accepts run ID |
| URL encode/decode | address wire form | canonical translation | exact public address | old segments rejected |
| `authorize` | authorized runtime target | validate/resolve/freeze | applicationId + public address | one binding read |
| `ResolvedApplicationAgentExecutionTarget` | authorized execution selection / scope stream input | exact private Agent/Team identity plus applicable producer projection | authorization-produced immutable union | defined at scope contract boundary because streaming accepts it |
| scope Agent input command | exact Agent target | input | agentRunId | private only |
| scope Team input command | exact Team/root/member target | input | teamRunId plus nullable targetAgentRunId | private only |
| scope streaming `attach` | exact stream target | attach/filter | resolved execution target | no complete descriptor/address/binding |
| binding codec | current binding record | persisted projection | unknown JSON | retained fields required |
| producer projector | current producer/context | persisted projection | unknown JSON | no role output |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| logical address | Yes | Yes | Low | root null/member canonical |
| member target helper | Yes | Yes | Low | exact binding match |
| authorization | Yes | Yes | Low | discriminated private output |
| Agent/Team scope commands | Yes | Yes | Low | keep subject-specific methods |
| current projectors | Yes | Yes | Low | explicit reconstruction |

## Main Domain Subject Naming Check

| Node / Subject | Name | Natural? | Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| logical member path | `ApplicationAgentMemberAddress` | Yes | Low | distinguish from internal Team address type |
| public target | `ApplicationAgentTargetAddress` | Yes | Low | exact two-field shape |
| private target | `ResolvedApplicationAgentExecutionTarget` | Yes | Low | scope-owned discriminated physical identity and producer projection |
| authorization result | `AuthorizedApplicationAgentTargetDescriptor` | Yes | Low | immutable complete result |
| stored binding projection | `ApplicationRunBindingRecordCodec` | Yes | Low | store-owned current schema |
| producer projection | `ApplicationExecutionProducerProjector` | Yes | Low | role-free current output |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why | If New, Why |
| --- | --- | --- | --- | --- |
| address wire contract | SDK contracts | Extend | already authoritative public contract | N/A |
| target ergonomics | backend SDK | Extend | existing builders | N/A |
| logical resolution | target authorization | Extend | already loads/authorizes binding | N/A |
| runtime commands/events | execution scope | Reuse | passed exact execution owner | N/A |
| current binding projection | orchestration persistence | Create owned codec | raw casts cross store boundary today | one repeated persisted subject |
| producer projection | orchestration domain | Create owned projector | journal/metadata/auth need identical current shape | one repeated current subject |
| transport/session | communication/streaming | Reuse | current lifecycle owner | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spines | Owner(s) | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| SDK contracts | public address/member/producer/URL | 001–003,005,007 | contract package | Extend | clean versioned cut |
| application orchestration | binding, authorization, input, projection | 001,004–006,008–009 | auth/store/host | Extend | logical/physical boundary lives here |
| application streaming/communication | lease/session/event transport | 002–003,005 | existing services | Modify | subscription consumes descriptor; scope source consumes resolved target only |
| application execution scope | exact commands/events and resolved-target contract | 001–002 | scope | Modify contract only | no owner/lifecycle/capability-count change |
| run metadata/history | current execution-context read/write | 005–006,009 | metadata store | Extend | uses shared projector |
| maintained applications | logical choice/business behavior | 001–005 | Brief/Socratic | Modify | no physical targeting |

## Draft File Responsibility Mapping

| Candidate File | Area | Owner | Concern | Why One File | Reuse |
| --- | --- | --- | --- | --- | --- |
| `application-agent-member-address.ts` | contracts | member schema | parser/type/predicate | one public invariant | URL/backend/auth |
| `application-agent-bindings.ts` | contracts | binding/address | public shapes | coherent contract subject | shared member type |
| `application-agent-target-url.ts` | contracts | URL codec | wire mapping only | transport concern | member parser |
| `application-agent-target-authorization-service.ts` | orchestration | authorization | one logical-to-physical resolution | real state/validation owner | binding codec/store |
| `application-run-binding-record-codec.ts` | persistence | binding store | current record projection | one stored aggregate | producer projector |
| `application-execution-producer-projector.ts` | orchestration domain | producer shape | current producer/context projection | repeated semantic transform | journal/metadata/auth |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Shared File | Owner | Why Shared | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| canonical member validation | contract member file | contracts | URL/helper/auth share one syntax | Yes | Yes | internal Team-domain dump |
| resolved execution union | scope contracts | execution boundary | host dispatch and stream attach share one exact value | Yes | Yes | public wire type or authorization aggregate |
| producer current projection | producer projector | orchestration domain | journal/metadata/auth share transform | Yes | Yes | old-schema version adapter |
| binding current projection | binding codec | binding store | all binding reads share invariants | Yes | Yes | generic JSON codec registry |

## Shared Structure / Data Model Tightness Check

| Structure | Clear Fields? | Redundant Removed? | Parallel Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| public address | Yes | Yes | Low | exact two fields |
| binding member | Yes | Yes | Low | retain logical/physical mapping only |
| producer | Yes | Yes | Low | retain physical correlation/display only |
| private runtime target | Yes | Yes | Low | discriminated by subject |
| authorized descriptor | Yes | Yes | Low | one immutable result; no optional escape fields |

## Final File Responsibility Mapping

The exact path-level Add/Modify/Remove and durable-test list in `logical-application-agent-addressing-transition-inventory.md` is authoritative. The important final responsibilities are: contract package owns public schemas/codec; backend SDK owns logical builders; authorization owns translation and the complete descriptor; scope contracts own the resolved execution target; stores/projectors own current persistence projection; host/subscription consume the complete descriptor while host commands derive exact arguments from its runtime value and the scope source consumes that runtime value; applications select logical members. No generic target resolver, codec registry, compatibility package, or shared optional-field base is added.

## Applied Patterns (If Any)

- Value object/parser: canonical external member address.
- Authorization boundary: one logical-to-physical translation with immutable evidence.
- Discriminated union: private Agent versus Team exact target.
- Current-schema projector: strict retained-field reconstruction from JSON supersets.
- Adapter/codec: canonical public address to URL only.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/src/application-agent-member-address.ts` | File | public contracts | member value/parser | shared SDK invariant | server run lookup |
| `autobyteus-application-sdk-contracts/src/application-agent-bindings.ts` | File | public contracts | binding/address/member/producer shapes | established subject file | compatibility union |
| `autobyteus-application-sdk-contracts/src/application-agent-target-url.ts` | File | public contracts | canonical URL codec | wire contract | authorization |
| `autobyteus-application-backend-sdk/src/application-agent-target-address.ts` | File | backend SDK | logical builders | developer-facing target subject | physical resolver |
| `autobyteus-server-ts/src/application-orchestration/services/application-agent-target-authorization-service.ts` | File | authorization | logical-to-exact resolution | existing authoritative boundary | raw manager/transport |
| `autobyteus-server-ts/src/application-platform/execution/application-execution-scope-contracts.ts` | File | scope capability contract | own exact resolved-target union and streaming input | accepted value belongs to scope boundary | orchestration authorization service import/full descriptor |
| `autobyteus-server-ts/src/application-orchestration/domain/application-run-binding-record-codec.ts` | File | persistence boundary | current binding decode/projection | orchestration owns binding | version branches |
| `autobyteus-server-ts/src/application-orchestration/domain/application-execution-producer-projector.ts` | File | orchestration domain | current producer/context projection | shared subject owner | provider runtime kinds |
| communication/streaming service files | Files | existing transport owners | complete descriptor until subscription; resolved target at scope attach | lifecycle/evidence remains local | binding reload/address interpretation/full descriptor in source |

## Folder Boundary Check

| Path / Folder | Structural Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| SDK contracts `src` | Main-Line contract | Yes | Low | compact public package; subject files are explicit |
| server `application-orchestration/domain` | Main-Line domain/persistence projection | Yes | Low | current binding/producer shapes belong to orchestration |
| server `application-orchestration/services` | Main-Line control | Yes | Low | authorization/input owners |
| server `application-agent-streaming` | Transport/event | Yes | Low | consumes but does not resolve |
| maintained application backend | Business caller | Yes | Low | selects logical member only |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| public target | `{bindingId, memberAddress:"/tutor"}` | `{bindingId,target:{kind:"AGENT_TEAM_MEMBER",agentRunId}}` | caller states intent, not physical identity |
| root | `{bindingId,memberAddress:null}` | separate Agent-root/Team-root kinds | binding owns subject |
| resolution | `authorize -> descriptor -> descriptor.runtime -> scope` | host reloads binding or scope receives full descriptor | one authority and downward-only dependency |
| role | event subject + `{agentRunId,displayName}` | duplicate producer `runtimeKind` | one classification source |
| persistence | explicit recognized-field projection | spread raw JSON or `if (version===old)` | directly usable current schema |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why Considered | Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| accept old and new target unions | rolling caller convenience | Rejected | atomic package/server/app regeneration |
| old URL decoder fallback | old client convenience | Rejected | canonical root/member URL only |
| deprecated Team-root helper alias | source compatibility | Rejected | shared root builder |
| keep optional role fields | reduce fixture edits | Rejected | smaller exact schemas/current projectors |
| migrate/rewrite all JSON | representation cleanliness | Rejected | direct current projection |
| generic ID target | fewer types | Rejected | explicit binding + member intent/private union |

## Derived Layering (If Useful)

Application business caller -> public logical contract/SDK -> transport -> authorization -> orchestration descriptor -> scope-owned resolved target -> `ApplicationExecutionScope` capability -> run. Persistence sits behind binding/event/metadata owners; provider execution remains below the scope and unchanged. The scope defines the value it accepts but does not perform authorization. The layering is explanatory and follows the authoritative boundary rather than defining it.

## Change / Refactor Sequence

1. Add canonical member-address and new public address/producer/member contracts plus URL tests.
2. Add current binding/producer projectors and representative old-superset direct-use tests.
3. Define `ResolvedApplicationAgentExecutionTarget` in the scope contracts; implement the exact complete descriptor in authorization and make authorization the sole translator.
4. Change host input to use `descriptor.runtime`/`descriptor.binding`; change stream subscription to pass only `descriptor.runtime` into scope while preserving lease/session behavior.
5. Contract launch, event, artifact, metadata, and journal models/writers to the role-free shapes; retain the physical role constant.
6. Update backend/frontend SDKs and maintained Brief/Socratic callers; Socratic selects `/tutor` directly.
7. Regenerate all owned application/package copies atomically.
8. Remove old unions/helpers/URL literals/role fields/raw casts and enable architecture occurrence guards.
9. Run focused unit/integration checks, package parity, realistic Studio/standalone input/stream/publication/recovery, source review, API/E2E, durable-test review, and delivery verification.

No committed target state may retain dual public contracts or a downstream physical-resolution bypass.

## Key Tradeoffs

- The public address is simpler but deliberately requires a clean coordinated package release rather than backward compatibility.
- The binding still exposes physical run IDs because they remain meaningful for correlation, artifacts, and lifecycle; only target selection stops requiring them.
- The physical role column remains as derived storage residue to avoid a table rewrite with no semantic benefit.
- A named member-address parser adds one small contract file but removes repeated validation and ambiguous plain-string use.

## Risks

- Missing a generated/vendored SDK copy could leave two wire contracts; package parity and occurrence guards are mandatory.
- If a consumer derives runtime role without the enclosing subject, removal could be unsafe; investigation found none, and source/test occurrence closure must confirm it.
- A broad raw JSON cast could leak the removed role into current objects; owned projectors and direct-use fixtures close this risk.
- Nested member addresses must be encoded as one path segment and exact-matched; codec and realistic Socratic cases must prove this.

## Guidance For Implementation

Implement the contract and projectors before consumers. Keep public/private structures `Readonly`; clone/freeze the descriptor, resolved target, producers, and binding snapshot. Read each binding exactly once per authorization. Define the resolved target in the scope contract and prohibit the inverse import from scope to authorization. Do not derive a physical target anywhere else. Preserve current error mapping, lease/reconnect, queue limits, run command results, event ordering, application-run ownership/stopped-model-config behavior, provider/session composition, and recovery. Keep provider `runtimeKind` occurrence guards positively scoped so the architecture test cannot delete legitimate provider configuration. Treat the transition inventory, generated-output parity, and old-superset direct-read cases as completion conditions.
