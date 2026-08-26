# Design Spec

## Current-State Read

The exact current source authority is `origin/personal@4108786f4058ca83fd036df84666a2c846fd6401`. Its execution ownership design is healthy and remains fixed: `ApplicationExecutionScope` owns the graph-local application run family and exactly seven outward capabilities; `GeneralProcessRunSupervisor` remains a separate execution family; finalized provider/session composition, stopped-run model validation, and application-run ownership remain explicit. The remaining problem is at the application-agent addressing boundary. A public caller must currently name a binding, repeat whether that binding represents an Agent or Team, and—for a Team member—supply the physical `agentRunId`. The binding is already the authority for Agent-versus-Team subject and the configured member-address-to-run-ID mapping. `ApplicationAgentTargetAuthorizationService` loads that binding, yet `ApplicationOrchestrationHostService` reloads and reinterprets the public selector and `ApplicationAgentStreamRuntimeSource` interprets it again. The scope contract additionally imports the complete higher-level authorization descriptor merely to type streaming. The same boundary carries application-role `runtimeKind` attributes that are constant or derivable from the enclosing binding/event subject.

Persistence analysis found JSON supersets containing the redundant role field, one physical NOT NULL member-role column, and no durable application-agent target address. The retained identity and display fields are already present. The target must therefore contract the current schema without introducing a migration or a compatibility path.

API-REV-001 then established a separate reachable preservation failure on the same maintained-application proof spine: a cold Studio/standalone synchronous mutation can exceed both fixed 30-second internal JSON-RPC deadlines, return HTTP 500, and still commit. CRR-003 proved the engine, bridge, gateway, and application owners are unchanged from Personal and that the addressing delta is not the cause. The current API exposes a completion result rather than an asynchronous admission/status contract; the timers sit in correlation transports that own neither cancellation nor commit.

## Intended Change

Replace the three-way public physical target union with one exact logical address `{ bindingId, memberAddress }`. Make binding authorization the sole logical-to-physical translator. It returns one immutable orchestration-owned authorization descriptor whose `runtime` field is the scope-owned `ResolvedApplicationAgentExecutionTarget`. The host and subscription use the complete descriptor. Host input discriminates only `descriptor.runtime` and calls the existing subject-specific scope commands; scope streaming receives `descriptor.runtime`. The scope never depends upward on authorization evidence. Remove application-role `runtimeKind` from binding members and producers, preserve provider/launch `runtimeKind`, and introduce current-schema projectors that read existing JSON supersets directly while new writers emit only the current shape. For SR-003, preserve the synchronous application-work contract by retaining both host-to-worker and nested worker-to-host correlation until a real response/error/write failure/close. Remove live-work deadlines from both clients. Keep bounded worker startup/stop through one explicit control-request owner that terminates and awaits the worker before surfacing timeout. Do not add a public async status, cancellation, retry, idempotency, or application-schema path.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Criteria | Approved Trigger Or Contract | Existing Behavior / Evidence | Approved Change / Preserved Outcome | Target Path / Spines |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | REQ-001–003; AC-001–004 | application Agent input/stream address | requirements and investigation target trace | one root/member logical selector; binding owns subject and exact resolution | DS-001, DS-002, DS-008 |
| BEH-002 | User | REQ-002; AC-002, AC-005 | Socratic selects `/tutor` | Socratic lesson-model source | application code selects logical member only; physical IDs remain internal | DS-001 |
| BEH-003 | System | REQ-003–004; AC-003, AC-006–007 | authorized input or stream | authorization/host/stream source trace | one authorization result; no downstream binding reload or public reinterpretation | DS-001, DS-002, DS-008 |
| BEH-004 | Contract | REQ-005; AC-008–010 | websocket URL, READY, event, worker capability | contracts/frontend/server protocol sources | one canonical root/member wire shape; existing transport lifecycle preserved | DS-001–DS-003, DS-007 |
| BEH-005 | System | REQ-006; AC-011–013 | binding launch and execution event | launch/auth/mapper/application sources | remove derivable application-role fields; keep physical identity and provider runtime kind | DS-004, DS-005 |
| BEH-006 | Operational | REQ-007; AC-014–016 | restart/recovery reads existing rows, journal entries, metadata | binding store, event journal, metadata store | version-agnostic current projection reads supersets; no rewrite or migration | DS-006, DS-009 |
| BEH-007 | Contract | REQ-008; AC-017–018 | package regeneration and both-host execution, including supported cold/reentry synchronous mutation | maintained application/package inventory plus API-REV-001/CRR-003 live evidence | atomic address clean cut; completion-coupled application work; actual completion/domain errors; bounded abort-before-failure lifecycle control | DS-001–DS-006, DS-010–DS-012 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To Design | Status / Approval |
| --- | --- | --- | --- | --- |
| `logical-application-agent-addressing-contract.md` | exact public/private/address/producer/persistence contract | REQ-001–007; AC-001–016 | normative interface and data contract | Approved with requirements |
| `logical-application-agent-addressing-transition-inventory.md` | exact Add/Modify/Remove/test/package inventory | REQ-001–008; AC-001–018 | normative transition completeness | Current; approval N/A |
| `current-personal-refresh-analysis.md` | exact current-base/source-spine/intersection/persistence revalidation | REQ-001–008; AC-001–018 | current source evidence for SR-002 | Current; approval N/A |
| `application-worker-operation-completion-contract.md` | exact SR-003 operation classes, state machines, owners, spines, dependencies, and proof | REQ-008; AC-018 | normative derived design correction | N/A; no new public behavior |
| upstream `future-architecture-simplification-review.md` | source-grounded trigger and six-spine assessment | all | read-only design evidence | N/A |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` and `Refactor`.
- Current design issue found: `Yes`.
- Root cause classification: `Boundary Or Ownership Issue`, `Shared Structure Looseness`, `Duplicated Policy Or Coordination`, and `Missing Invariant`.
- Refactor needed now: `Yes`.
- Evidence: the public address repeats binding-owned subject and physical member identity; three downstream locations interpret the same selector; the scope contract imports a higher-level complete authorization descriptor; application-role fields are constant or derivable; application code manually maps logical member address to physical run ID. Separately, two correlation transports independently expire synchronous work without owning cancellation/commit, and direct cold-path evidence proves the resulting failure can precede a later commit.
- Design response: one logical public shape, one authoritative translator, one complete orchestration descriptor containing one scope-owned exact runtime target, two current-schema projectors, and clean removal of redundant fields/paths. For completion, make both clients correlation-only for application work and isolate the legitimate startup/stop deadline in one abort-before-failure control owner.
- Refactor rationale: each target concern has one concrete owner and the data-flow spines no longer cross both an outer boundary and its internals.
- Intentional deferrals: dynamic task-agent addressing is not a current supported product surface; removing physical IDs from binding/event correlation is outside scope. A public async status/idempotency/cancellation/retry protocol is a different product contract and is not needed for the observed live-worker path. Finalized provider/session composition and execution-scope lifecycle are preserved current baselines rather than deferred work. None requires change for this design.

## Terminology

- **Logical target:** a binding ID plus either root (`memberAddress:null`) or one canonical configured Team member address.
- **Physical target:** the exact Agent/Team run identity resolved from a currently authorized binding.
- **Resolved execution target:** the narrow immutable private discriminated value produced by authorization, used by host input dispatch, and accepted by execution-scope streaming; it contains only exact subject/run identity and the producer projection needed by streaming.
- **Authorized descriptor:** immutable orchestration-owned translation result containing the public address, binding snapshot, and one resolved execution target in `runtime`.
- **Application-role runtime kind:** the redundant `AGENT | AGENT_TEAM_MEMBER` classification removed here; it is distinct from provider launch `runtimeKind`.
- **Current-schema projector:** version-agnostic reconstruction of recognized current fields from persisted JSON; it is not a legacy decoder.
- **Application work:** any worker request that may execute application code or application-owned effects: query, command, route, GraphQL, event/artifact handler, or WebSocket operation.
- **Completion-coupled:** correlation remains owned until actual remote result/error, local write failure, or transport close; elapsed wall time alone is not a result.
- **Control request:** only worker definition load or stop, whose lifecycle owner may impose a deadline provided worker termination/close is awaited before failure escapes.

## Design Reading Order

Behavior -> public logical contract -> authorization spine -> input/stream consumers -> role contraction -> current-data projection -> synchronous application-work completion spine -> exact file transition.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove the old target union, old public target kinds/run ID, old URL segments, old helpers, redundant application-role fields, downstream reinterpretation, and raw casts/spreads at affected persistence boundaries.
- The implementation must not add aliases, dual address validation, version negotiation, old/new wire unions, version-specific persistence branches, or fallback physical targeting.
- Existing stored JSON is not a legacy runtime path: the current projector uniformly ignores unknown extras and requires every retained field.
- Remove the two default/fixed live-work deadlines and timeout-handle ownership from correlation clients. Do not retain them under a renamed constant or larger value. Lifecycle control keeps one separately owned abort-before-failure deadline.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: binding `summary_json` and member rows in platform SQLite; binding/producer JSON in the execution-event journal; Agent `run_metadata.json.applicationExecutionContext`; volume is installation-dependent and must not be rewritten for representation cleanup.
- Relevant change: remove application-role `runtimeKind` from current Team-member/producer JSON models; leave all retained IDs/display/address/subject fields and the physical member table intact.
- Normal reader/writer behavior and evidence: current stores parse JSON and currently allow broad casts/spreads. Representative old records contain every retained field plus `runtimeKind`. The physical member table requires `runtime_kind TEXT NOT NULL`.
- Required semantics: exact binding/runtime identity, member mapping, pending event dispatch/ack, run restoration, publication correlation, and restart/reentry remain unchanged.
- Constraints: no target address is durably stored; physical table cannot omit its role column without a table rewrite; unknown JSON extras may be ignored only at owned projection boundaries; missing/invalid retained fields fail closed.
- Decision: `Directly Usable — No Migration`.
- Rationale: a strict version-agnostic current projector reconstructs all retained meaning from existing supersets. A migration adds I/O, interruption, rollback, and corruption exposure without changing semantics. The physical column remains a derived write constant and is not exposed in the current model.
- Supported criteria: REQ-007; AC-014–AC-016.
- SR-003 state impact: `Not Affected`; the completion correction adds no public/persisted field, operation journal, retry record, or migration.

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
| DS-010 | Primary End-to-End | 007 | cold/reentry synchronous application mutation | actual GraphQL completion/domain error at Studio/standalone caller | ApplicationEngineController completion contract | prevents local failure while nested accepted work continues |
| DS-011 | Return/Error | 007 | application/host-capability completion or error | retained inner and outer correlations -> exact caller result | engine client + worker host bridge correlation owners | preserves real provider/domain/authorization errors and late valid response |
| DS-012 | Secondary Lifecycle | 007 | worker definition load or stop | response/error or terminated-worker timeout | application engine control-request owner | preserves bounded control without leaving work live |

## Primary Execution Spine(s)

- DS-001: `application business code -> backend SDK logical target -> worker capability protocol -> ApplicationOrchestrationHostService -> ApplicationAgentTargetAuthorizationService -> binding store/current projection -> AuthorizedApplicationAgentTargetDescriptor -> descriptor.runtime -> ApplicationExecutionScope Agent/Team command -> run input outcome`; the host returns `descriptor.binding`.
- DS-002: `frontend/backend connection -> canonical target URL or worker subscription -> communication/streaming service -> authorization lease -> AuthorizedApplicationAgentTargetDescriptor -> descriptor.runtime -> scope-owned runtime event source -> exact root/member filter -> READY/event -> caller`; the stream source never receives the complete descriptor.
- DS-003: `application worker -> engine protocol -> communication session -> authorization -> input/subscription -> READY/event/response -> worker`.
- DS-004: `application launch request -> launch configuration/authorization -> scope Agent/Team creation -> binding launch service -> binding store -> role-free public binding`.
- DS-006: `host lifecycle recovery -> binding/event/metadata store -> current-schema projector -> application recovery/reentry -> resumed exact binding/run/event state`.
- DS-010: `Studio/standalone UI -> frontend GraphQL -> REST/gateway -> ApplicationEngineController -> retained ApplicationEngineClient correlation -> worker GraphQL/application mutation -> retained ApplicationWorkerHostBridgeClient correlation -> host orchestration/execution acceptance -> inner response -> application result -> outer response -> HTTP result`.
- DS-012: `launcher/controller lifecycle -> control-request owner -> load/stop request -> deadline -> client close -> supervisor stop/close wait -> timeout result`; no application-work method may enter this spine.

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
| DS-010 | Caller awaits one synchronous application result while both internal correlation owners retain the operation through cold execution and nested host capability completion. | HTTP request, worker request, application mutation, host capability, exact responses | ApplicationEngineController | correlation clients, frame writers |
| DS-011 | Exact host capability/application domain errors return through retained nested and outer IDs; elapsed time never replaces them. | capability error/result, worker error/result, caller result | correlation clients | JSON-RPC mapper |
| DS-012 | Startup/stop deadline is isolated from application work; on expiry the worker is closed/stopped before timeout escapes. | lifecycle trigger, control request, worker handle, timeout | control-request owner | supervisor/client cleanup |

## Spine Actors / Main-Line Nodes

Application business caller, SDK target builder, worker/frontend transport, orchestration host, authorization service, binding store, authorized descriptor, `ApplicationExecutionScope` capabilities, communication/streaming services, event mapper/relay, recovery owners. For DS-010–012: Studio/standalone frontend, REST/gateway, `ApplicationEngineController`, `ApplicationEngineClient`, worker entry/backend host, `ApplicationWorkerHostBridgeClient`, host capability handler, and the application engine control-request owner.

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
- `ApplicationEngineController` owns synchronous application-work completion at the host boundary; it never supplies an application-work deadline.
- `ApplicationEngineClient` and `ApplicationWorkerHostBridgeClient` own correlation and transport terminals, not timeout/commit/retry policy.
- `ApplicationEngineControlRequest` owns only definition-load/stop deadline sequencing and worker termination-before-failure.
- `ApplicationEngineLauncher` retains failed-start status/detach/unwind; worker entry owns bridge close before backend runtime teardown on host-stdin loss, isolates the expected closed-bridge cleanup rejection, and exits. Normal `stopApplication` keeps the bridge open through `runtime.stop()` and the stop response.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| backend SDK target builders | binding authorization | developer-facing construction/early exact member check | runtime subject/physical resolution |
| target URL codec | public address contract | canonical transport representation | binding lookup/authorization |
| orchestration REST/worker methods | orchestration host + scope | host entrypoint | raw managers or alternate resolver |
| stream/communication URL handlers | streaming/communication service | transport registration | member mapping or execution ownership |
| application backend REST/gateway | ApplicationEngineController | synchronous application-work entry | timeout, retry, commit, or GraphQL operation parsing |
| JSON-RPC clients | controller/control-request owners | correlation/frame transport | default live-work deadline or application business semantics |

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
| `ApplicationEngineClient` default 30-second application-work timeout and pending timeout handle | transport is not commit/cancel owner | response/error/write/close correlation terminals | In This Change | no larger replacement timeout |
| `ApplicationWorkerHostBridgeClient` fixed timeout | nested capability may validly exceed it | response/error/write/bridge-close terminals | In This Change | add idempotent close |
| deadline use for application work | creates false failure with live work | completion-coupled controller path | In This Change | only load/stop control uses deadline |

## Return Or Event Spine(s) (If Applicable)

- DS-005 streaming return: `run event -> scope event source -> producer projector -> application stream mapper -> event journal/transport -> logical address event -> caller`.
- DS-005 publication return: `run context -> published artifact -> application relay -> binding/producer authorization -> application worker/projection`; exact run ID still correlates the artifact, while role derives from the enclosing subject.
- Input returns the binding snapshot carried by the descriptor, ensuring the result represents the state that was actually authorized.
- DS-011 completion return: `host capability result/error -> retained worker bridge ID -> application handler result/error -> retained engine-client ID -> controller/gateway -> caller`. Both correlations remain until the exact return traverses them.
- A real write/process/bridge close rejects pending work. Elapsed time on a live transport is not a return event.

## Bounded Local / Internal Spines (If Applicable)

- DS-007, contracts owner: `address -> validate exact fields -> encode canonical segments` and `segments -> strict decode -> member parser -> exact address`.
- DS-008, authorization owner: `validate exact public shape -> load one binding -> check application/status -> derive subject -> exact member match -> freeze descriptor`.
- DS-009, persistence owner: `parse unknown JSON -> validate retained fields -> explicitly reconstruct current object -> freeze/return`; unknown extras are never spread onward.
- DS-010 host correlation: `write frame -> retain request ID -> receive result/error or close -> settle/remove exactly once`.
- DS-010 nested correlation: `write capability frame -> retain request ID -> receive host result/error or bridge close -> settle/remove exactly once`.
- DS-012 control deadline: `start timer -> request -> on deadline mark deadline authoritative -> close client -> await supervisor stop -> reject timeout`; late response cannot win.

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
| JSON-RPC correlation | 010–011 | engine controller/worker bridge | retain ID and map actual terminal response | transport concern | timer becomes false business outcome |
| control deadline | 012 | launcher/controller lifecycle | abort and await worker before timeout | lifecycle concern | deadline leaks into app work |
| frame writer | 010–012 | correlation clients | bounded queued write/failure | existing transport capability | write failure leaks pending promise |

## Ownership Boundaries

The binding is authoritative for Agent-versus-Team subject and configured member-to-run identity. The public caller names only root/member intent. Authorization is the sole boundary that may cross from logical intent to physical execution identity. Above it, no public API carries member run IDs. At the boundary, the complete descriptor owns authorization evidence and embeds the scope-owned resolved execution target. Below it, host input derives the existing subject-specific command arguments only from that target, and scope streaming receives that target directly. Neither can reload the binding, inspect the public address, or depend on the authorization service. Persistence stores expose current objects only; historical extra attributes do not cross their boundary. `ApplicationExecutionScope` remains authoritative for mutable execution and is not widened beyond changing one existing capability input value. For application work, `ApplicationEngineController` is the outward completion boundary; callers depend on it, not on client timers. The two JSON-RPC clients are internal correlation mechanisms. The control-request owner is a sibling lifecycle concern used only by launcher/stop and cannot be called by application-work surfaces.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanisms | Required Callers | Forbidden Bypass | If API Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| SDK logical address contract | member grammar/URL representation | app backend/frontend/worker | custom kind/run-ID selector | add exact logical operation |
| binding store/current codec | SQLite rows/JSON/physical constant | launch/auth/recovery | raw JSON cast/spread | extend current projection |
| authorization service | binding lookup/member map/complete descriptor | host/streaming/communication | reload/re-resolve downstream | extend descriptor |
| `ApplicationExecutionScope` capabilities | resolved-target type/managers/runs/event sources | host/stream subscription | raw manager plus scope or full authorization descriptor into scope | adjust existing narrow capability input |
| event/metadata projectors | stored producer/context JSON | journal/metadata/auth | version branch/raw object spread | extend current projector |
| ApplicationEngineController | synchronous application-work completion | gateway/WebSocket/application event dispatch | caller-supplied timeout or direct engine client | extend controller method |
| engine correlation clients | pending request IDs/frame terminals | controller/worker entry only | default timeout/commit semantics | strengthen correlation lifecycle |
| engine control-request owner | startup/stop abort-before-failure deadline | launcher/controller stop only | application query/command/route/GraphQL/capability | extend exact control sequence |

## Dependency Rules

Allowed: application -> logical SDK target; transport -> the same public address; host/stream subscription -> authorization; authorization -> binding store/current codec and scope-owned resolved-target type; host/subscription -> descriptor runtime and scope capabilities; scope runtime source -> resolved target only; stores -> current codecs/projector; event/binding subject -> role classification where required; context-only consumers -> role-free producer identity.

Forbidden: public address -> run kind or member run ID; application -> logical-to-physical target projection; authorization caller -> both descriptor and binding store; input/stream -> public selector interpretation; scope contracts/source -> authorization-service import, complete descriptor, public address, or binding snapshot; caller -> scope plus raw manager; producer/member -> application-role runtime kind; current runtime -> old schema version branch; generic ID, service locator, manager router, compatibility adapter, or dual protocol. Also forbidden: application/gateway/controller callers -> arbitrary timeout; client/bridge -> default fixed deadline; live correlation deletion on elapsed time; lifecycle control helper -> application work/capability; larger timeout as the fix; app-local retry/idempotency workaround.

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
| `ApplicationEngineController` work methods | synchronous application work | await actual worker result/error | applicationId + exact current request input | no deadline parameter |
| `ApplicationEngineClient.request` | host/worker correlation | frame/write/result/error/close lifecycle | method + params | no timeout option |
| `ApplicationWorkerHostBridgeClient` | nested host capability correlation | frame/write/result/error/close lifecycle | exact capability/action input | no timeout option; explicit close |
| `runApplicationEngineControlRequest` | engine lifecycle control | explicit deadline, termination, close wait | exact runtime handle + load/stop method/input | only launcher/stop callsites |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| logical address | Yes | Yes | Low | root null/member canonical |
| member target helper | Yes | Yes | Low | exact binding match |
| authorization | Yes | Yes | Low | discriminated private output |
| Agent/Team scope commands | Yes | Yes | Low | keep subject-specific methods |
| current projectors | Yes | Yes | Low | explicit reconstruction |
| application-work completion | Yes | Yes (request ID) | Low | retain until real terminal transport event |
| lifecycle deadline | Yes | exact runtime handle | Low | isolate load/stop and abort before failure |

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
| host/worker correlation | application engine client/bridge | Refine | existing transport owners are correct but timers are not | N/A |
| startup/stop deadline | application engine lifecycle | Add one owned control concern | current launcher/controller duplicate the needed cleanup sequencing | exact abort-before-failure invariant, not generic timeout helper |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spines | Owner(s) | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| SDK contracts | public address/member/producer/URL | 001–003,005,007 | contract package | Extend | clean versioned cut |
| application orchestration | binding, authorization, input, projection | 001,004–006,008–009 | auth/store/host | Extend | logical/physical boundary lives here |
| application streaming/communication | lease/session/event transport | 002–003,005 | existing services | Modify | subscription consumes descriptor; scope source consumes resolved target only |
| application execution scope | exact commands/events and resolved-target contract | 001–002 | scope | Modify contract only | no owner/lifecycle/capability-count change |
| run metadata/history | current execution-context read/write | 005–006,009 | metadata store | Extend | uses shared projector |
| maintained applications | logical choice/business behavior | 001–005,010–011 | Brief/Socratic | Modify only for address; no SR-003 source change | no physical targeting or timeout workaround |
| application engine runtime | worker correlation and lifecycle control | 010–012 | controller/client/bridge/control owner | Modify/Add | completion correlation separated from bounded control |

## Draft File Responsibility Mapping

| Candidate File | Area | Owner | Concern | Why One File | Reuse |
| --- | --- | --- | --- | --- | --- |
| `application-agent-member-address.ts` | contracts | member schema | parser/type/predicate | one public invariant | URL/backend/auth |
| `application-agent-bindings.ts` | contracts | binding/address | public shapes | coherent contract subject | shared member type |
| `application-agent-target-url.ts` | contracts | URL codec | wire mapping only | transport concern | member parser |
| `application-agent-target-authorization-service.ts` | orchestration | authorization | one logical-to-physical resolution | real state/validation owner | binding codec/store |
| `application-run-binding-record-codec.ts` | persistence | binding store | current record projection | one stored aggregate | producer projector |
| `application-execution-producer-projector.ts` | orchestration domain | producer shape | current producer/context projection | repeated semantic transform | journal/metadata/auth |
| `application-engine-client.ts` | application engine runtime | host correlation | result/error/write/close settlement only | existing exact transport owner | controller/control owner |
| `application-worker-host-bridge-client.ts` | application engine worker | nested correlation | result/error/write/close settlement only | existing exact transport owner | handler context |
| `application-engine-control-request.ts` | application engine runtime | lifecycle deadline | load/stop request + terminate/wait + primary/cleanup error | one real sequencing invariant | launcher/controller stop |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Shared File | Owner | Why Shared | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| canonical member validation | contract member file | contracts | URL/helper/auth share one syntax | Yes | Yes | internal Team-domain dump |
| resolved execution union | scope contracts | execution boundary | host dispatch and stream attach share one exact value | Yes | Yes | public wire type or authorization aggregate |
| producer current projection | producer projector | orchestration domain | journal/metadata/auth share transform | Yes | Yes | old-schema version adapter |
| binding current projection | binding codec | binding store | all binding reads share invariants | Yes | Yes | generic JSON codec registry |
| lifecycle deadline sequencing | engine control request | application engine lifecycle | startup/stop need the same abort-before-failure rule | Yes | Yes | generic timeout/retry/cancellation library |

## Shared Structure / Data Model Tightness Check

| Structure | Clear Fields? | Redundant Removed? | Parallel Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| public address | Yes | Yes | Low | exact two fields |
| binding member | Yes | Yes | Low | retain logical/physical mapping only |
| producer | Yes | Yes | Low | retain physical correlation/display only |
| private runtime target | Yes | Yes | Low | discriminated by subject |
| authorized descriptor | Yes | Yes | Low | one immutable result; no optional escape fields |

## Final File Responsibility Mapping

The exact path-level Add/Modify/Remove and durable-test list in `logical-application-agent-addressing-transition-inventory.md` is authoritative. The important final responsibilities are: contract package owns public schemas/codec; backend SDK owns logical builders; authorization owns translation and the complete descriptor; scope contracts own the resolved execution target; stores/projectors own current persistence projection; host/subscription consume the complete descriptor while host commands derive exact arguments from its runtime value and the scope source consumes that runtime value; applications select logical members. No generic target resolver, codec registry, compatibility package, or shared optional-field base is added. SR-003 adds one application-engine control-request file with real deadline/termination ownership; it does not wrap the engine client generically. The controller remains the application-work completion boundary, both clients remain correlation transports, and maintained applications remain unchanged by the completion correction.

## Applied Patterns (If Any)

- Value object/parser: canonical external member address.
- Authorization boundary: one logical-to-physical translation with immutable evidence.
- Discriminated union: private Agent versus Team exact target.
- Current-schema projector: strict retained-field reconstruction from JSON supersets.
- Adapter/codec: canonical public address to URL only.
- Correlation state machine: each JSON-RPC client retains an exact request until result/error/write/close.
- Lifecycle control operation: one deadline owner sequences request, worker termination, close wait, and error preservation.

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
| `autobyteus-server-ts/src/application-engine/runtime/application-engine-client.ts` | File | host correlation | request ID/frame terminals; no timer | existing transport boundary | timeout/commit/retry policy |
| `autobyteus-server-ts/src/application-engine/worker/application-worker-host-bridge-client.ts` | File | nested correlation | capability/action ID/frame terminals and close | existing worker adapter | timer/application policy |
| `autobyteus-server-ts/src/application-engine/services/application-engine-control-request.ts` | File | engine lifecycle | load/stop deadline and terminate-before-fail | distinct off-spine lifecycle owner | application-work methods/retry |
| controller/launcher/worker entry | Files | existing work/lifecycle/teardown owners | choose completion versus control path; close bridge | existing spine nodes | duplicate deadline policy |

## Folder Boundary Check

| Path / Folder | Structural Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| SDK contracts `src` | Main-Line contract | Yes | Low | compact public package; subject files are explicit |
| server `application-orchestration/domain` | Main-Line domain/persistence projection | Yes | Low | current binding/producer shapes belong to orchestration |
| server `application-orchestration/services` | Main-Line control | Yes | Low | authorization/input owners |
| server `application-agent-streaming` | Transport/event | Yes | Low | consumes but does not resolve |
| maintained application backend | Business caller | Yes | Low | selects logical member only |
| server `application-engine/runtime` | Transport/lifecycle | Yes | Low | correlation client plus one concrete control-request concern |
| server `application-engine/worker` | Worker transport | Yes | Low | worker entry and nested bridge lifecycle stay together |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| public target | `{bindingId, memberAddress:"/tutor"}` | `{bindingId,target:{kind:"AGENT_TEAM_MEMBER",agentRunId}}` | caller states intent, not physical identity |
| root | `{bindingId,memberAddress:null}` | separate Agent-root/Team-root kinds | binding owns subject |
| resolution | `authorize -> descriptor -> descriptor.runtime -> scope` | host reloads binding or scope receives full descriptor | one authority and downward-only dependency |
| role | event subject + `{agentRunId,displayName}` | duplicate producer `runtimeKind` | one classification source |
| persistence | explicit recognized-field projection | spread raw JSON or `if (version===old)` | directly usable current schema |
| cold mutation | retain outer + inner IDs until actual responses | reject/delete both after 30 seconds while work runs | elapsed time is not commit authority |
| control timeout | deadline -> close client -> await supervisor stop -> reject | reject first and leave worker live | bounded lifecycle has abort evidence |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why Considered | Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| accept old and new target unions | rolling caller convenience | Rejected | atomic package/server/app regeneration |
| old URL decoder fallback | old client convenience | Rejected | canonical root/member URL only |
| deprecated Team-root helper alias | source compatibility | Rejected | shared root builder |
| keep optional role fields | reduce fixture edits | Rejected | smaller exact schemas/current projectors |
| migrate/rewrite all JSON | representation cleanliness | Rejected | direct current projection |
| generic ID target | fewer types | Rejected | explicit binding + member intent/private union |
| raise both timeouts | avoid current 30-second failure | Rejected | completion-coupled application work |
| public async operation/status or idempotency key | model indeterminate retries | Rejected for current approved scope | preserve synchronous completion; new contract requires user approval |
| app-local retry/reconciliation patch | limit source delta | Rejected | shared engine/bridge invariant |

## Derived Layering (If Useful)

Application business caller -> public logical contract/SDK -> transport -> authorization -> orchestration descriptor -> scope-owned resolved target -> `ApplicationExecutionScope` capability -> run. Persistence sits behind binding/event/metadata owners; provider execution remains below the scope and unchanged. The scope defines the value it accepts but does not perform authorization. The layering is explanatory and follows the authoritative boundary rather than defining it. The SR-003 spine is `REST/gateway -> controller completion boundary -> correlation client -> worker application -> nested bridge -> host capability`; lifecycle control is a sibling off-spine path, not a layer through which application work flows.

## Change / Refactor Sequence

1. Add canonical member-address and new public address/producer/member contracts plus URL tests.
2. Add current binding/producer projectors and representative old-superset direct-use tests.
3. Define `ResolvedApplicationAgentExecutionTarget` in the scope contracts; implement the exact complete descriptor in authorization and make authorization the sole translator.
4. Change host input to use `descriptor.runtime`/`descriptor.binding`; change stream subscription to pass only `descriptor.runtime` into scope while preserving lease/session behavior.
5. Contract launch, event, artifact, metadata, and journal models/writers to the role-free shapes; retain the physical role constant.
6. Update backend/frontend SDKs and maintained Brief/Socratic callers; Socratic selects `/tutor` directly.
7. Regenerate all owned application/package copies atomically.
8. Remove old unions/helpers/URL literals/role fields/raw casts and enable architecture occurrence guards.
9. Make `ApplicationEngineClient.request` correlation-only and update every exact caller: controller work uses completion; launcher definition load and controller stop use the new control-request owner.
10. Make `ApplicationWorkerHostBridgeClient` correlation-only with explicit close/write-failure cleanup; close it from worker entry teardown.
11. Add client/bridge fake-time, write/close, control abort-before-failure, architecture occurrence, and exact cold Studio/standalone proof.
12. Run focused unit/integration checks, package parity, realistic Studio/standalone input/stream/publication/recovery, source review, API/E2E, durable-test review, and delivery verification.

No committed target state may retain dual public contracts, a downstream physical-resolution bypass, or an elapsed-time failure on live application work.

## Key Tradeoffs

- The public address is simpler but deliberately requires a clean coordinated package release rather than backward compatibility.
- The binding still exposes physical run IDs because they remain meaningful for correlation, artifacts, and lifecycle; only target selection stops requiring them.
- The physical role column remains as derived storage residue to avoid a table rewrite with no semantic benefit.
- A named member-address parser adds one small contract file but removes repeated validation and ambiguous plain-string use.
- Completion-coupled application work can wait longer than 30 seconds, which is intentional for the current synchronous API. It avoids false failure without inventing a broader async/idempotency product.
- A dedicated control-request concern adds one file but keeps lifecycle bounded and prevents the correlation client from becoming a mixed timeout/commit owner.

## Risks

- Missing a generated/vendored SDK copy could leave two wire contracts; package parity and occurrence guards are mandatory.
- If a consumer derives runtime role without the enclosing subject, removal could be unsafe; investigation found none, and source/test occurrence closure must confirm it.
- A broad raw JSON cast could leak the removed role into current objects; owned projectors and direct-use fixtures close this risk.
- Nested member addresses must be encoded as one path segment and exact-matched; codec and realistic Socratic cases must prove this.
- Removing the bridge timer without write-failure/close cleanup would leak pending promises; explicit settlement proof is mandatory.
- Accidentally routing GraphQL/command/route/capability work through the control deadline would recreate CR-002; exact occurrence guards must constrain the two control callsites.
- A real process/transport failure remains an error and is not automatically retried. New exactly-once or user-visible indeterminate/reconciliation semantics are a Requirement Gap, not an implementation improvisation.

## Guidance For Implementation

Implement the contract and projectors before consumers. Keep public/private structures `Readonly`; clone/freeze the descriptor, resolved target, producers, and binding snapshot. Read each binding exactly once per authorization. Define the resolved target in the scope contract and prohibit the inverse import from scope to authorization. Do not derive a physical target anywhere else. Preserve current error mapping, lease/reconnect, queue limits, run command results, event ordering, application-run ownership/stopped-model-config behavior, provider/session composition, and recovery. Keep provider `runtimeKind` occurrence guards positively scoped so the architecture test cannot delete legitimate provider configuration. Treat the transition inventory, generated-output parity, and old-superset direct-read cases as completion conditions. Follow `application-worker-operation-completion-contract.md` exactly for SR-003: no timeout parameter or timer in either application-work correlation client; no app schema/service workaround; one control-request owner used only by definition load and stop; close/write failures settle exact pending entries; host-stdin teardown closes the bridge before runtime cleanup and catches expected cleanup rejection; normal stop keeps the bridge open through its response; lifecycle timeout does not escape until the worker is stopped. Rerun the exact three cold/reentry scenarios that established reachability, not only fake-timer unit tests.
