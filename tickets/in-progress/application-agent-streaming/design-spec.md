# Design Spec — Standard Application-Bound Agent Communication

## Design Status

`Design-ready. The user-approved desktop-only standard-connection direction, exact two-binding vocabulary, data-flow coverage, ownership, and redundancy checks are complete. The exact manifest/exposure correction remains; the rejected paired-mobile credential premise has been removed. Ready for fresh architecture review.`

Implementation is blocked. The shared worktree contains preserved partial implementation from the superseded backend-proxy design; this spec includes an explicit selective reconciliation plan.

## Current-State Read

Authoritative current behavior is repository `HEAD` `534210b9e1dffff6c22855ae89ddb3d2afef5a9b`, not the dirty worktree's partial implementation.

At `HEAD`:

- application backend handlers start configured agents/teams through `ApplicationHandlerContext.agentExecution`; Application Engine Host injects trusted application scope and Application Orchestration resolves resources, creates `AgentRun`/`TeamRun`, persists `ApplicationRunBindingSummary`, observes lifecycle, optionally sends initial input, and returns the binding;
- application frontend SDK operations are flat query/command/GraphQL/route/notification methods bootstrapped by iframe contract v3;
- Application Backend API Gateway routes request/response to managed application workers and bridges one-way notifications;
- published artifacts use a durable platform store plus authorized backend handler/revision-read path;
- native agent/team WebSockets use raw `runId` / `teamRunId`, native commands, and native UI payloads;
- application packages use `ApplicationManifestV3.backend.bundleManifest` to reference `ApplicationBackendBundleManifestV1`; that backend bundle's six-boolean `supportedExposures` record is the declared exposure authority;
- the server has an existing paired-mobile remote-access credential path for other product surfaces, but application features are desktop-only and do not expose or reuse that path;
- there is no application-scoped frontend agent connection, shared application target address, provider-neutral public event contract, generic application backend WebSocket, or backend event subscription.

The dirty worktree contains 146 modified tracked files plus untracked source/generated artifacts from the stopped superseded implementation. It is evidence/salvage input only. It already explores the exact event projector, lifecycle lease/hub, streaming service, backend observer IPC, generic backend WebSockets, v4 propagation, notification/worker renames, tests, and generated output. It lacks the newly required direct standard frontend connection and still makes application-defined backend WebSocket mapping the primary frontend path. No partial source may be accepted wholesale.

## Intended Change

Add one framework-standard, application-scoped, bidirectional agent connection addressed by `ApplicationAgentTargetAddress`. Application business chooses when to create a binding and which address to return; frontend code then connects through `applicationClient.agentCommunication.connect(address)`. The SDK/server own the fixed URL, protocol, readiness, input acknowledgement, exact event contract, lifecycle, ordering, and backpressure. The standard path does not traverse the application worker.

Retain two advanced escape hatches as independent adapters over clear owners:

1. backend `subscribeEventStream(address, ...)` for live application business observation; and
2. custom application backend WebSockets for genuinely application-defined realtime protocols.

Keep notifications and durable artifacts separate. Application WebSocket bases come from the trusted desktop host/bootstrap and carry no application-client authentication contract, credential option, or reserved token query. Existing platform/network security is unchanged and remains outside this application-framework API.

## Relevant Behavior And Production-Path Map

| Behavior ID | Kind | Requirement / AC | Existing Behavior / Evidence | Approved Change Or Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- |
| `BEH-001` | System/Contract | `REQ-001`, `AC-001` | Orchestration start/binding path in investigation notes | precise agent/team binding variants; creation authority preserved | app handler → Engine Host → Orchestration → runtime/store, `DS-001` |
| `BEH-002` | User/Contract | `REQ-003`–`REQ-005`, `AC-003`, `AC-005`, `AC-006` | frontend has no agent connection | desktop host base + standard address-derived `ApplicationAgentConnection` | web host → frontend SDK → standard WS adapter → Communication → Streaming, `DS-003`–`DS-005` |
| `BEH-003` | Preserved Contract | `REQ-007`, `REQ-016`, `AC-007` | native raw-ID sockets | do not reuse or expose them | native path separate; forbidden dependency |
| `BEH-004` | System/Contract | `REQ-002`, `REQ-006`, `AC-002`, `AC-004` | binding ID plus ad hoc member selectors | one exact shared target address | business address handoff/input/subscription, `DS-002`, `DS-004`, `DS-007` |
| `BEH-005` | Event/Contract | `REQ-008`, `AC-008` | provider-derived internal/native shapes | exact adapter-neutral event union | runtime → projector → consumer queue, `DS-005`, `DS-012` |
| `BEH-006` | Preserved Event | `REQ-011`, `REQ-012`, `AC-011`, `AC-012` | one-way backend notifications | sibling notifications capability; Hub rename | backend → Hub → frontend, `DS-009` |
| `BEH-007` | Preserved Durable | `REQ-012`, `AC-012` | durable artifact handler/read/projection | unchanged and excluded from live stream | runtime → durable store → backend handler/read, `DS-010` |
| `BEH-008` | Structure/Contract | `REQ-010`, `REQ-011`, `REQ-015`, `REQ-016`, `AC-010`, `AC-011`, `AC-016` | backend APIs but no custom WS; mixed worker owner; bundle manifest owns current exposures | exact manifest-v4/bundle-v1 authority, optional custom WS, grouped client, focused host | web host → frontend → Backend Gateway → Engine Host → Backend Host, `DS-008` |
| `BEH-009` | System/Lifecycle | `REQ-009`, `REQ-013`–`REQ-015`, `AC-009`, `AC-013`–`AC-015` | no app event adapter/terminal fan-out | shared Streaming owner with direct network and worker adapters | `DS-003`, `DS-005`–`DS-007`, `DS-011`, `DS-012` |
| `BEH-010` | Scope/Contract | `REQ-007`, `AC-007` | application features run only in the trusted desktop application host | preserve desktop-only scope; expose no application-client authentication or mobile credential API; validate active application, binding, and target through existing owners | desktop host scope → standard/custom adapter → capability owner; Orchestration lease for agent targets, `DS-003`, `DS-008` |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship | Status / Approval |
| --- | --- | --- | --- | --- |
| [`application-agent-communication-contract.md`](./application-agent-communication-contract.md) | exact binding/address/frontend/wire/event/backend/lifecycle/failure contract | `REQ-001`–`REQ-009`, `REQ-013`–`REQ-017` | normative API and state basis | approved requirements basis |
| [`application-backend-websocket-contract.md`](./application-backend-websocket-contract.md) | exact optional custom WebSocket frontend/route/session/frame/readiness/bounds/failure/manifest contract | `REQ-010`, `REQ-011`, `REQ-015`, `REQ-016`; `AC-010`, `AC-015`, `AC-016` | normative custom realtime basis | approved requirements basis; promoted for `DR-010` |
| [`application-communication-boundaries.md`](./application-communication-boundaries.md) | capability boundaries and all primary/event/bounded spines | all | normative architecture visualization | approved requirements basis |

## Task Design Health Assessment

- Change posture: `Larger Requirement` plus `Refactor`.
- Current design issue found: `Yes`.
- Root cause classification: `Boundary Or Ownership Issue`, `Duplicated Policy Or Coordination`, and `Shared Structure Looseness`.
- Refactor needed now: `Yes`.
- Evidence: mandatory custom WebSocket proxying would duplicate route resolution, input protocol, public event mapping, queueing, and cleanup in every application; raw native sockets bypass application binding authority; public event shapes in the stopped partial implementation include adapter-specific subscription correlation.
- Design response: make application-bound agent communication a standard first-class capability, share one address and provider-neutral event structure, place target/lifecycle authority in Orchestration, and keep network/worker adapters outside the Streaming owner.
- Refactor rationale: adding a direct frontend method to native handlers or the Backend Gateway would create a boundary bypass or misnamed owner. The new Communication owner and shared Streaming owner each govern a real lifecycle rather than forwarding only.
- Intentional deferrals: standard tool approval/interrupt/binary commands, direct task-agent targets, replay/reconnect, and new end-user grant identity. Residual risk is that applications needing those functions must use backend APIs/custom WebSockets until a separately designed standard extension exists.

## Architecture Round-5 Correction Trace

| Finding | Design Correction | Authoritative Sections |
| --- | --- | --- |
| `DR-009` | Streaming returns `ACTIVE_PAUSED`; one Communication-session synchronous transition serializer commits READY versus terminal/cancel/transport; exact SDK state/error/close and paused-event disposition are specified. | agent communication contract §§9–11; `DS-003`, `DS-006`, `DS-011`; `REQ-013`/`REQ-014` |
| `DR-010` | A separate normative supplement defines the entire new generic backend WebSocket frontend, backend route/session, readiness, frame, ordering, bounds, failure, and cleanup contract. | [`application-backend-websocket-contract.md`](./application-backend-websocket-contract.md); `DS-008`, `DS-016`; `REQ-010`/`AC-010` |
| `DR-011` | Common binding fields are private/non-exported; only the two concrete bindings are public and every mixed result spells their union. | agent communication contract §1; `REQ-001`/`AC-001`; reusable-structure and export mapping |

## Architecture Round-6 Correction Trace

| Finding | Design Correction | Authoritative Sections |
| --- | --- | --- |
| `DR-010` remaining | `ApplicationManifestV4` owns metadata/UI/bundle pointer only; `ApplicationBackendBundleManifestV1.supportedExposures` is the sole declared capability authority with required `webSockets`; compatibility is v4/v4; definition v4 declares actual routes; the exposure summary is derived only. | exact manifest/exposure model below; backend WebSocket contract §8; `REQ-016`/`AC-016` |
| `DR-012` / `MP-R6-001` | `Obsolete / Not Reachable.` Paired-mobile remote access is not reachable for desktop-only application features. The target therefore introduces no application credential injection, token query, collision rule, or mobile coverage. Existing platform/network security is unchanged and not surfaced through the application contract. | desktop-only scope below; both WebSocket supplements; `REQ-007`/`AC-007`; `DS-003`, `DS-008` |

## Terminology

- `ApplicationAgentBinding`: started individual agent bound to an application.
- `ApplicationAgentTeamBinding`: started team bound to an application.
- Mixed-result APIs spell `ApplicationAgentBinding | ApplicationAgentTeamBinding` explicitly; there is no third `ApplicationAgentExecutionBinding` concept.
- `ApplicationAgentTargetAddress`: binding ID plus root-agent, whole-team, or static-member target.
- `ApplicationAgentConnection`: frontend standard transport/lifecycle abstraction.
- `ApplicationAgentCommunicationService`: owner of standard network sessions/input protocol.
- `ApplicationAgentStreamingService`: owner of reusable authorized event consumers.

`assistant` and `chat` are application roles/presentations, not framework subjects. `binding` is the correct term; `bonding` is not used.

## Legacy Removal Policy

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove flat frontend API exports, iframe v3 source symbols/readers, obsolete notification/worker owner names, adapter-specific public event correlation, and any stale documentation that presents custom WebSocket proxying as the standard agent path.
- Do not retain `ApplicationRunBindingSummary` or add `ApplicationAgentExecutionBinding` as public compatibility/generic aliases after the binding cutover. Internal persisted values are read into one of the two current binding types without version branches.
- Native sockets remain supported native APIs, not compatibility for the application connection.

## Persisted Data / State Transition Decision

- Stored subject/location: application binding JSON in `platform.sqlite`, existing artifact records/revisions, and application databases.
- Code-model change: public TypeScript binding names become two precise discriminated types; mixed-result signatures use their explicit union. Serialized fields/values and business semantics do not change.
- Normal behavior: current store reads the complete binding JSON and consumers inspect `runtime.subject`; no physical column or stored-version discriminator changes.
- Required invariants: binding ID/application ownership, runtime subject, member identities, lifecycle status, artifacts, and application projections remain unchanged.
- Constraints: feature remains pre-release; no mixed-version compatibility is required; connection/subscription state is ephemeral.
- Decision: `Directly Usable — No Migration`.
- Rationale: renaming/tightening TypeScript projections needs no data transformation. Migration would add interruption/repair risk with no semantic benefit.
- Supported ACs: `AC-001`, `AC-002`, `AC-012`, `AC-017`.

No migration plan applies.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behaviors | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Primary End-to-End | `BEH-001` | app business start | persisted active binding | Application Orchestration | creation remains business controlled |
| `DS-002` | Primary End-to-End | `BEH-002`, `BEH-004` | frontend business request | target address | application backend business handler | one business selection, no proxy |
| `DS-003` | Primary End-to-End | `BEH-002`, `BEH-009`, `BEH-010` | frontend connect | atomically committed ready standard connection | Agent Communication Session | standard establishment/auth/ready winner |
| `DS-004` | Primary End-to-End | `BEH-002`, `BEH-004` | frontend input | bound target accepts input | Agent Communication + Orchestration | bidirectional standard behavior |
| `DS-005` | Return-Event | `BEH-002`, `BEH-005`, `BEH-009` | runtime event | frontend listener | Agent Streaming + Communication | provider-neutral return |
| `DS-006` | Return-Event | `BEH-009` | persisted binding terminal | connection/subscription close | terminal owner + Streaming | correct lifecycle end |
| `DS-007` | Primary/Return | `BEH-009` | backend subscribe | backend observer | Agent Streaming via Engine Host | advanced backend adapter |
| `DS-008` | Primary End-to-End | `BEH-008` | custom frontend socket | app worker handler | Backend Gateway | custom realtime escape hatch |
| `DS-009` | Return-Event | `BEH-006` | backend publish | frontend notification | Notification Hub | separate one-way plane |
| `DS-010` | Primary/Return | `BEH-007` | runtime artifact publish | durable app projection/read | Artifact platform + Orchestration | durable plane |
| `DS-011` | Bounded Local | `BEH-002`, `BEH-009` | registered connecting session | one READY or pre-ready terminal/cancel/failure winner | Communication Session transition serializer | closes Streaming-active/Communication-pending gap |
| `DS-012` | Bounded Local | `BEH-005`, `BEH-009` | runtime callback | queued frame/isolated close | per-consumer Stream Subscription | no-throw ordering/backpressure |
| `DS-013` | Bounded Local | `BEH-002`, `BEH-004` | valid `INPUT` frame | correlated accepted/rejected cleanup | Communication Session | request uniqueness and cleanup |
| `DS-014` | Bounded Local | `BEH-009` | backend subscribe request | active/closed observer | Backend Host observer registry | activation and callback isolation |
| `DS-015` | Bounded Local | `BEH-009` | terminal cause | persisted state + one terminal signal | Orchestration terminal transition owner | first-cause serialization |
| `DS-016` | Bounded Local | `BEH-008` | custom socket open | closed worker/socket session | Backend Gateway/Host session registries | optional custom-session cleanup |

## Primary Execution Spines

```text
DS-001: app handler → Engine Host → Orchestration → resource resolver → runtime → binding store
DS-002: frontend backend request → Backend Gateway → worker business handler → business mapping → target address
DS-003: desktop host standard base → agentCommunication.connect/address URL → standard WS adapter → Communication session → Streaming ACTIVE_PAUSED → Orchestration lease/runtime listener → serialized READY commit → SDK open
DS-004: connection.sendInput → Communication → Orchestration → selected bound target → correlated acknowledgement
DS-007: app backend subscribe → worker registry → Engine Host → Streaming → Orchestration/runtime → observer
DS-008: desktop host custom base → backend.connectWebSocket path/business-query → custom WS adapter → Backend Gateway → Engine Host → Backend Host → app handler
```

## Spine Narratives

| Spine | Narrative | Main Nodes | Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | Existing application business initiates and Orchestration creates/binds the runtime. | handler, Engine Host, Orchestration, runtime, store | Orchestration | resource resolution, lifecycle journal |
| `DS-002` | App business returns a binding-scoped target for its business object; no socket proxy follows. | UI, backend request, app handler, mapping | app business | application DB |
| `DS-003` | The trusted desktop host supplies the fixed standard base; the SDK derives the target URL; the adapter enters trusted application scope before attaching a paused event subscription; Communication serializes READY against terminal/cancel/failure before enabling drain. | web host, SDK target-path codec, standard adapter, Communication session, Streaming, Orchestration, runtime | Communication session | target URL codec, desktop application scope |
| `DS-004` | Standard INPUT uses same authorized address and receives request acknowledgement. | SDK, Communication, Orchestration, target | Communication/Orchestration | request registry, parser |
| `DS-005` | Exact projector creates adapter-neutral event; consumer queue sequences; Communication frames it. | runtime, subscription, projector, Communication, SDK | Streaming | serializer, bounded writer |
| `DS-006` | persisted terminal signal detaches, drains, and closes active consumers or fails pending establishment. | terminal owner, hub, subscription, adapter | Orchestration terminal owner/Streaming | keyed serialization, one-shot listener |
| `DS-007` | advanced worker observer adapts same host subscription over IPC. | handler, Backend Host, Engine Host, Streaming | Streaming | observer registry, activation barrier |
| `DS-008` | The trusted desktop host supplies the custom base; the SDK appends the application path/business query; the adapter validates the active application and declared exposure before the separate custom protocol reaches the worker. | web host, SDK transport, custom adapter, Backend Gateway, Engine Host, Backend Host | Backend Gateway/Host | path/query normalization, session registries |
| `DS-009` | notifications remain one-way app topic fan-out. | handler, Engine Host, Hub, UI | Notification Hub | connection registry |
| `DS-010` | artifacts remain durable and application projected. | runtime, store, relay, Orchestration, handler | artifact platform | revision authorization |
| `DS-011` | one synchronous Communication-session reducer chooses READY versus terminal/cancel/failure and maps internal states to the four SDK states. | session reducer, paused subscription, socket write, SDK state | Communication Session | abort/terminal callbacks |
| `DS-012` | synchronous source callback only projects/accepts; async drain transports. | callback, queue, drain | Stream Subscription | limits, metrics |
| `DS-013` | one open connection correlates each unique input request through acceptance/rejection and removes it once. | parser, request registry, Orchestration input, response | Communication Session | frame validation |
| `DS-014` | worker registration stays pending until host activation wins; later callbacks drain independently. | pending registry, host response, active FIFO, observer | Backend Host observer registry | activation barrier |
| `DS-015` | all reachable terminal causes serialize through one keyed transition before lifecycle fan-out. | cause, keyed transition, store/journal, lifecycle signal | Orchestration terminal transition owner | one-shot hub |
| `DS-016` | optional custom sockets correlate open/message/close across network and worker without sharing agent-session state. | gateway session, Engine IPC, backend session, app handler | Backend Gateway/Host | frame writer |

## Spine Actors / Main-Line Nodes

- Trusted AutoByteus web host application-transport bootstrap.
- Application frontend SDK capability groups.
- Standard Agent Communication WebSocket adapter.
- `ApplicationAgentCommunicationService` and its session.
- `ApplicationAgentStreamingService` and per-consumer subscription.
- Application Orchestration target/lifecycle/input boundary.
- AgentRun/TeamRun runtime sources.
- Application Backend API Gateway / Engine Host / Backend Host for custom/backend adapters.
- Terminal transition service/lifecycle hub, Notification Hub, and artifact platform on their separate spines.

## Ownership Map

| Owner | Concrete State / Invariants / Sequencing |
| --- | --- |
| trusted desktop web host transport builder | supplies application-scoped standard, custom-backend, and notification bases at accepted iframe bootstrap; exposes no application authentication or credential input |
| frontend standard target-path codec | appends/encodes the shared `ApplicationAgentTargetAddress` suffix to the fixed standard base; owns no application/runtime authorization |
| frontend `ApplicationAgentConnection` | public state, ready promise, request IDs/promises, listener isolation, local close |
| standard WS adapter | fixed desktop route decoding, socket adaptation, and trusted application-scope entry only |
| Agent Communication Service | network session registry and facade; delegates each connection's READY/terminal/cancel first-cause sequencing to its owned session |
| Agent Communication Session | internal state reducer, paused-subscription activation, synchronous READY write, protocol/input correlation, socket buffered-amount limit, exact public error/close outcome, idempotent close; no second event FIFO |
| Agent Streaming Service | consumer registry/establishment, target filter, exact projection, sequence/FIFO, terminal drain, listener release |
| Application Orchestration | application/binding/target truth, lifecycle lease, runtime descriptor, input routing, terminal transition |
| custom WS adapter / Backend Gateway | adapter validates active application scope and normalizes path/query; Gateway owns backend HTTP/custom WS facade and network session lifecycle over the normalized request |
| Engine Host | worker and backend-observer/custom-session IPC |
| Backend Host | application definitions/handlers/context/worker registries |

## Thin Entry Facades / Public Wrappers

| Wrapper | Governing Owner | Why | Must Not Own |
| --- | --- | --- | --- |
| `applicationClient.agentCommunication.connect` | frontend Agent Connection + shared target-path codec | ergonomic typed entry | application authentication, server trust, or runtime lookup |
| standard Fastify WS route | Agent Communication Service | desktop network adapter | session/business/stream policy |
| `ApplicationBackendApiGatewayService` | Backend Gateway + Engine Host | backend entry facade | standard agent communication |
| `context.agentExecution` | Application Orchestration/Streaming | worker capability facade | binding store/runtime objects |

## Removal / Decommission Plan

| Item | Why | Replacement | Scope | Notes |
| --- | --- | --- | --- | --- |
| mandatory custom backend WS proxy for agent UI | repeats standard framework work | `agentCommunication.connect(address)` | this change | generic custom WS remains optional |
| public event `subscriptionId` | adapter-specific/overlapping identity | internal adapter correlation | this change | public event becomes transport-neutral |
| public `ApplicationRunBindingSummary` family | does not distinguish agent vs team return | two precise binding types and explicit mixed-result unions | this change | stored shape directly usable; no third alias |
| flat frontend client operations | hides capability boundaries | backend / notifications / agentCommunication groups | this change | no aliases |
| iframe v3 symbols/readers | strict new transport shape | v4 only | this change | no dual reader |
| `ApplicationBackendNotificationStreamService` | name implies stream semantics | Notification Hub | this change | behavior preserved |
| `ApplicationWorkerRuntime` | actually hosts backend definition/handlers | Application Backend Host | this change | remove old file/export |
| stale partial docs/tests presenting worker proxy as standard | superseded premise | standard-connection docs/tests | this change | selectively rewrite, not layer another path |

## Return Or Event Spines

```text
DS-005: runtime → exact projector → per-consumer queue → Communication → SDK event listener
DS-006: persisted terminal → lifecycle hub/lease → subscription detach/drain → adapter close
DS-009: backend notification → Engine Host → Notification Hub → frontend
DS-010: artifact publish → durable store → relay/auth → backend handler/read → application view
```

## Bounded Local / Internal Spines

- `DS-011`, parent Agent Connection/Communication: allocate synchronously → authorize/attach → READY/open or cleanup/closed. Prevents late activation.
- `DS-012`, parent Stream Subscription: synchronous exact project/capacity/accept → async transport drain. Protects runtimes and independent consumers.
- `DS-013`, parent Communication Session: parse → unique request register → Orchestration send → accepted/rejected response → remove correlation.
- `DS-014`, parent Backend Host observer registry: pending registration → correlated host activation → bounded callback drain → isolated close.
- `DS-015`, parent Orchestration terminal lifecycle: keyed cause → persist/journal → one-shot lifecycle publication → release key.
- `DS-016`, parent custom backend WebSocket: allocate pending session → validate active application/exposure → worker route/open → serialized reserved-readiness commit → bounded ordered message relay → idempotent two-sided cleanup. Exact contract: [`application-backend-websocket-contract.md`](./application-backend-websocket-contract.md).

## Use-Case Spine Coverage Validation

| Use Case | Initiation / Identity | Main Input / Observation | Return / Terminal | Bounded Local | Result |
| --- | --- | --- | --- | --- | --- |
| `UC-001` individual bound agent | `DS-001`, `DS-002` | `DS-003`, `DS-004` with `AGENT_RUN` | `DS-005`, `DS-006` | `DS-011`–`DS-013`, `DS-015` | Complete |
| `UC-002` whole bound team | `DS-001`, `DS-002` | `DS-003`, `DS-004` with `AGENT_TEAM_RUN` | `DS-005`, `DS-006` | `DS-011`–`DS-013`, `DS-015` | Complete |
| `UC-003` selected team member | `DS-001`, `DS-002` | `DS-003`, `DS-004` with exact `AGENT_TEAM_MEMBER` | filtered `DS-005`, `DS-006` | `DS-011`–`DS-013`, `DS-015` | Complete |
| `UC-004` backend live observation | existing `DS-001` binding/address | `DS-007` | `DS-006` | `DS-012`, `DS-014`, `DS-015` | Complete |
| `UC-005` custom realtime backend protocol | fixed mount + application-defined path/query | `DS-008` route/open/readiness/text/binary return | `DS-008` worker/network/client close/failure | `DS-016` first-cause/queue state | Complete per custom WebSocket contract |
| `UC-006` artifact plus agent communication | `DS-001`, `DS-002` | `DS-003`, `DS-004`, independent `DS-010` | `DS-005`, `DS-006`, durable `DS-010` | `DS-011`–`DS-013`, `DS-015` | Complete; planes compose without merging |
| `UC-007` multiple independent consumers | shared authorized address | frontend `DS-003` and/or backend `DS-007` | independent `DS-005`, `DS-006` | independent `DS-011`–`DS-015` state | Complete |

The preserved notification behavior has its own complete return spine `DS-009`, and the preserved durable artifact behavior has `DS-010`; neither is hidden inside an agent-communication use case.

## Off-Spine Concerns Around The Spine

| Concern | Spines | Serves | Responsibility | Why | Risk If Main-Line |
| --- | --- | --- | --- | --- | --- |
| target URL codec | `DS-003` | SDK/adapter | exact address suffix encode/decode | one canonical target path | duplicated route semantics |
| desktop application transport bases | `DS-003`, `DS-008`, `DS-009` | web host/bootstrap | issue fixed application-scoped bases from trusted desktop launch context | one bootstrap authority without a client auth surface | application-selected application ID or endpoint |
| standard target URL derivation | `DS-003` | shared contract + frontend transport | encode the exact target suffix against the fixed standard base | same codec is decoded by the standard adapter | duplicated target-route semantics |
| custom path/query normalization | `DS-008` | custom frontend/server adapters | append/parse application-controlled path and business query without inventing a credential namespace | custom route semantics remain separate from agent targets | string concatenation or query-shape drift |
| exact public projector | `DS-005`, `DS-007` | Streaming | whitelist/normalize | provider neutrality | raw data leakage |
| JSON serializability | `DS-005` | Stream Subscription | defense in depth | safe frames | mistaken as projection policy |
| lifecycle hub | `DS-003`, `DS-006`, `DS-007` | Orchestration | ephemeral one-shot fan-out | terminal observation | store bypass if public |
| terminal transition service | `DS-006` | Orchestration | keyed persist/journal/publish | one authority | duplicated terminal writers |
| connection/observer registries | `DS-003`, `DS-007`, `DS-008` | owning adapters | correlation/cleanup and one first-cause reducer per session | process boundaries | generic global session blob |
| frame writer / socket buffered-amount gate | `DS-003`, `DS-007`, `DS-008` | transports | serialize the immediate adapter write and enforce transport bounds; never duplicate the Streaming event backlog | concurrency safety | domain logic or second event queue in transport |
| target authorization resolver | `DS-003`, `DS-004`, `DS-007` | Orchestration | one shared binding/target/member validation policy for lease and input operations | prevents duplicated policy | caller-specific authorization drift |

## Ownership Boundaries

The address crosses frontend/backend/host boundaries; authorization and runtime identity do not. The trusted desktop host supplies framework-owned application bases, while application code controls only an address or custom path/business query. The target contract exposes no application-client login, token, or credential. Orchestration is authoritative for binding/target/lifecycle/input. Streaming consumes only the authorized lease/descriptor and active source. Communication consumes only the Streaming subscription and Orchestration input API. Backend Gateway cannot become a generic top-level application gateway by absorbing the standard path; its name and responsibility remain aligned with managed backend entry.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Required Callers | Forbidden Bypass | Fix If Thin |
| --- | --- | --- | --- | --- |
| web host application transport | trusted desktop application ID and fixed base URL creation | iframe bootstrap | application/SDK selecting application scope | extend existing host transport builder only |
| standard target-path codec | exact address suffix encode/decode | standard browser/server adapters | per-adapter target path construction | keep one shared codec |
| custom WebSocket adapter boundary | active-application/exposure check plus normalized path/business query | custom route adapter | Gateway receiving raw route parameters or unnormalized query | normalize before calling owned service |
| Application Orchestration | stores, lookup, lifecycle hub, runtime services | Communication, Streaming, Engine Host | adapter/service → store/hub/runtime | add focused Orchestration operation |
| Agent Streaming Service | runtime source, projector, sequence/queue, lease release | Communication, Engine Host | Communication → runtime/projector | strengthen subscription API |
| Agent Communication Service | session/protocol/network state | standard WS adapter | route → Streaming/Orchestration directly | add session method |
| Backend API Gateway | backend availability/entry plus custom WebSocket network session lifecycle | backend REST/custom WS adapters | route → Engine Host internals | add exact custom session operation from the normative supplement |
| Backend Host | worker loaders/contexts/registries | worker entry/Engine IPC | app code → worker registries | add context/definition API |

## Dependency Rules

Allowed:

```text
frontend SDK → shared contracts
web host → strict desktop iframe transport bases
standard frontend transport → shared target-path codec
custom frontend transport → custom path/business-query URL construction
standard WS adapter → Communication → Streaming → Orchestration
Communication → Orchestration (input only)
Engine Host → Streaming (backend subscription adapter)
Backend Gateway → Engine Host → Backend Host
Orchestration → binding stores + lifecycle hub + runtime services
```

Forbidden:

```text
standard agent path → Backend Gateway / Engine Host / Backend Host
standard agent path → native stream handlers
Communication/Streaming → binding store or lifecycle hub
frontend → raw runId
public event → connectionId/subscriptionId
notifications/artifacts → agent event transport
custom backend WebSocket as mandatory agent proxy
ApplicationClient → authentication / credential API
paired-mobile or phone remote-access behavior → application framework contract
application manifest → supportedExposures (bundle manifest is sole authority)
```

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity |
| --- | --- | --- | --- |
| `startAgent` | individual application binding | create/bind | resource input → `ApplicationAgentBinding` |
| `startAgentTeam` | team application binding | create/bind | resource input → `ApplicationAgentTeamBinding` |
| `agentCommunication.connect` | standard frontend agent connection | establish | `ApplicationAgentTargetAddress` |
| host `buildApplicationHostTransport` | trusted desktop application transport bases | issue fixed standard/custom/notification bases | bound node endpoints + application ID |
| shared target-path codec | standard direct WS URL suffix | encode/decode `ApplicationAgentTargetAddress` | trusted standard base + exact address |
| `ApplicationAgentConnection.sendInput` | connected target input | correlated send | connection-owned address + request ID |
| `agentExecution.sendInput` | backend target input | send | address |
| `agentExecution.subscribeEventStream` | backend target observation | subscribe | address + observer |
| `openAgentEventStreamLease` | authorized lifecycle/source descriptor | authorize | trusted application ID + address |
| `backend.connectWebSocket` | custom business socket | establish typed connection | normalized application path + business query options |
| `webSocketRoutes[].open` | one custom backend route/session | select/open handler | validated route pattern + trusted application request/context |
| `ApplicationWebSocketSession.send/close` | pending/active custom backend session | bounded frame/close action | opaque internal session ID |
| `notifications.subscribe` | notification fan-out | listen | trusted application scope |

## Interface Boundary Check

| Interface | Singular | Explicit Identity | Risk | Correction |
| --- | --- | --- | --- | --- |
| standard connect | Yes | Yes | Low | fixed target union |
| backend subscribe/input | Yes | Yes | Low | same address |
| custom backend WS | Yes | normalized path/query + exact route pattern | Low | exact frontend/request/session/frame/lifecycle contract; never infer agent target |
| desktop application scope | Yes | trusted application ID from host/bootstrap | Low | no application-client authentication surface; adapters validate active application/exposure |
| Orchestration lease | Yes | trusted app + address | Low | return minimal descriptor |
| binding get/list | Yes | binding ID/filter | Low | return the explicit two-type union; no named third/generic summary alias |

## Exact Manifest, Compatibility, And Exposure Authority

The package boundary remains a pointer chain, not a nested capability blob:

```text
ApplicationManifestV4
  backend.bundleManifest
    → ApplicationBackendBundleManifestV1
        sdkCompatibility = { backendDefinitionContractVersion: "4", frontendSdkContractVersion: "4" }
        supportedExposures = { queries, commands, routes, graphql, notifications, eventHandlers, webSockets }
          → gates current ApplicationBackendDefinition (definitionContractVersion: "4")
              webSocketRoutes? = actual custom route declarations
              → ApplicationBackendExposureSummary = derived observation only
```

Exact owners and invariants:

| Contract | Exact Target | Owns | Must Not Own |
| --- | --- | --- | --- |
| `ApplicationManifestV4` / `manifestVersion: "4"` | same identity/name/icon/UI/backend-pointer/execution-slot structure as the current manifest, with `ui.frontendSdkContractVersion: "4"` | package metadata, UI entry, backend bundle pointer | `supportedExposures`, handler/route declarations |
| `ApplicationBackendBundleManifestV1` / `contractVersion: "1"` | current self-contained ESM/Node bundle structure; exact compatibility `"4"`/`"4"`; seven required boolean flags including `webSockets` | one declared capability allowlist | actual handler arrays, a nested application-manifest copy |
| current `ApplicationBackendDefinition` / `definitionContractVersion: "4"` | existing lifecycle/query/command/route/GraphQL/event/artifact fields plus optional `webSocketRoutes` | actual loaded handlers/routes | package capability authority |
| `ApplicationBackendExposureSummary` | exact existing fields plus `webSocketRoutes: Array<{path: string}>` | immutable derived runtime observation | configuration or capability enablement |

The backend bundle stays contract V1 because its package/distribution contract and authority location do not change; the pre-release clean cut updates the current required `supportedExposures` record itself. Readers do not default a missing `webSockets` flag. All old six-flag or v3-compatible packages are regenerated or rejected, never compatibility-filled.

Validation order is application manifest v4/frontend v4 → referenced backend bundle v1 → exact bundle SDK compatibility v4/v4 and seven flags → backend definition v4 → capability/route-shape/duplicate/ambiguity checks → derived summary. `webSockets: false` with any route is invalid; `true` with no routes is valid. No consumer reads the summary to authorize a route.

## Desktop-Only Application Access Scope

Application features are launched only inside the trusted desktop application host. The host supplies the active application ID and fixed standard/custom/notification bases through the strict iframe-v4 bootstrap. Application code does not choose application scope.

The target application contract intentionally contains:

- no application-client login or authentication method;
- no credential field, token query key, or token-collision behavior;
- no paired-mobile/phone connection path or mobile credential coverage; and
- no new identity, grant, or persisted authorization subsystem.

The standard adapter validates the active application and delegates binding/target authorization to Orchestration. The custom adapter validates the active application and declared WebSocket exposure before delegating to Backend Gateway. Existing general platform/network security remains unchanged infrastructure and is neither duplicated nor exposed as an application-framework API.

## Main Domain Subject Naming Check

| Subject | Name | Self-Descriptive | Risk | Action |
| --- | --- | --- | --- | --- |
| standard capability | `agentCommunication` | Yes | Low | use consistently |
| frontend object | `ApplicationAgentConnection` | Yes | Low | avoid session/chat/assistant |
| target | `ApplicationAgentTargetAddress` | Yes | Low | transport-neutral |
| individual binding | `ApplicationAgentBinding` | Yes | Low | startAgent return |
| team binding | `ApplicationAgentTeamBinding` | Yes | Low | startAgentTeam return |
| network owner | `ApplicationAgentCommunicationService` | Yes | Low | standard protocol only |
| event owner | `ApplicationAgentStreamingService` | Yes | Low | reusable consumers only |
| worker host | `ApplicationBackendHost` | Yes | Low | remove Runtime name |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| binding/target/input authority | Application Orchestration | Extend | already owns application binding/control |
| runtime event listener primitives | AgentRun/TeamRun | Reuse | established sources |
| native stream handlers/mappers | native streaming | Do not reuse | raw IDs/protocol/provider leakage |
| provider normalization evidence | native/provider converters | Reuse evidence only | informs exact projector cases |
| desktop application scope/bootstrap | existing application host transport | Reuse/extend | already owns trusted application ID and endpoint bases; no auth surface is added |
| backend worker IPC | Application Engine | Extend | backend observer/custom WS only |
| standard frontend session | none | Create New | different owner from backend/custom/native |
| durable artifacts | artifact platform | Reuse unchanged | separate semantics |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spines | Decision |
| --- | --- | --- | --- |
| shared application contracts | bindings/address/events/wire/backend WS types | all | Extend/split |
| web host/bootstrap | trusted desktop bases and strict iframe v4 | `DS-003`, `DS-008`, `DS-009` | Extend existing transport builder |
| frontend SDK | grouped client, standard connection, custom connection, target-path codec use, transports | `DS-002`–`DS-005`, `DS-008`, `DS-009`, `DS-011`, `DS-013`, `DS-016` | Extend |
| agent communication | standard session/protocol/input/network | `DS-003`–`DS-006`, `DS-011`, `DS-013` | Create New |
| agent streaming | authorized event consumers/projector/queues | `DS-003`, `DS-005`–`DS-007`, `DS-012` | Create New (partial salvage) |
| orchestration | shared target authorization, lease/terminal/input | `DS-001`, `DS-003`–`DS-007`, `DS-010`, `DS-015` | Extend |
| backend gateway/engine/worker | backend APIs/custom WS/backend observer IPC | `DS-002`, `DS-007`–`DS-009`, `DS-014`, `DS-016` | Extend/refactor |
| artifacts | durable platform | `DS-010` | Preserve |

## Draft File Responsibility Mapping

| Candidate File | Area | Owner | Concern | Shared? |
| --- | --- | --- | --- | --- |
| `application-agent-bindings.ts` | contracts | binding types | two precise binding types/address | yes |
| `application-agent-events.ts` | contracts | event contract | exact public union/maps | yes |
| `application-agent-communication.ts` | contracts | wire/public connection types | frames/errors/close | yes |
| `application-agent-target-path.ts` | contracts | address codec | suffix encode/decode | yes |
| `application-agent-connection.ts` | frontend | connection | state/API/listeners/requests | yes |
| `application-agent-communication-service.ts` | server | Communication | sessions/protocol/input | no |
| `application-agent-streaming-service.ts` | server | Streaming | subscription facade | yes across adapters |
| `application-agent-stream-subscription.ts` | server | subscription | local state/queue/drain | no |
| `application-agent-stream-public-event-projector.ts` | server | projector | field whitelist | yes across adapters |

## Reusable Owned Structures Check

| Structure | Shared File | Owner | Why | Redundant Removed | Overlap Removed | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| private binding field composition + two exported variants | bindings contract | application contracts | implementation reuses common fields without a third public surface | Yes | Yes | exported base, named third binding alias, or optional-field mixed summary |
| target address | bindings contract | application contracts | connect/input/subscribe | Yes | Yes | authorization token |
| application agent input | communication contract | application contracts | frontend and backend send the same runtime input shape | Yes | Yes | connection-specific duplicate payload |
| public event | events contract | application contracts | frontend/backend adapters | Yes | Yes | adapter frame with IDs |
| address URL suffix codec | target-path contract | application contracts | SDK/server exact inverse | Yes | Yes | host URL builder |
| JSON frame protocol | communication contract | application contracts | SDK/server agreement | Yes | Yes | application business protocol |
| custom WebSocket frame/request/session/route contract | WebSocket contract | application contracts | frontend, Backend Gateway, Engine, and Backend Host need one exact protocol | Yes | Yes | raw browser socket or agent-target overload |
| declared backend exposure record | backend bundle manifest contract | package contracts | one allowlist gates definition handlers | Yes | Yes | copy in application manifest or derived summary authority |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning | Redundant Removed | Risk | Action |
| --- | --- | --- | --- | --- |
| two binding types | Yes | Yes | Low | non-exported field composition only; explicit union at mixed-result signatures; no public base/third alias |
| target address | Yes | Yes | Low | no app/run alternatives |
| application agent input | Yes | Yes | Low | one text/context/metadata shape for frontend/backend input |
| public event | Yes | Yes | Low | no adapter correlation/index signature |
| wire frames | Yes | Yes | Low | closed type/request variants |
| safe error | Yes | Yes | Low | stable code/message/recoverability only |
| custom WebSocket types | Yes | Yes | Low | closed frame union; separate frontend connection and backend session responsibilities |
| desktop WebSocket URL inputs | Yes | Yes | Low | host owns fixed bases; standard target path and custom business path/query remain separate semantic contracts |
| manifest/exposure shapes | Yes | Yes | Low | application manifest points; bundle declares capabilities; definition declares handlers; summary derives observation |

## Design-Principle And Redundancy Validation

| Principle / Trigger | Validation | Evidence In Package | Result |
| --- | --- | --- | --- |
| Approved behavior and production reality | Every target behavior begins with `BEH-001`–`BEH-010` and an evidence-backed `HEAD` path or verified absence, including desktop-only application reachability and current bundle exposure authority. | behavior map; investigation current-source log | Pass |
| Spine span sufficiency | Every primary path crosses the initiating surface, authoritative owner, critical runtime/process boundary, and meaningful outcome; none stops at the edited service. | `DS-001`–`DS-010`; use-case coverage table | Pass |
| Return/event and bounded-local completeness | Event return, terminal, notification, artifact, connection state, queue, input correlation, observer activation, terminal serialization, and custom-session lifecycle are explicit. | `DS-005`–`DS-016` | Pass |
| Ownership clarity | Communication owns network sessions; Streaming owns event consumers; Orchestration owns binding/target/lifecycle/input authority; adapters own only boundary translation. | ownership and boundary maps | Pass |
| Authoritative boundary / no bypass | Standard adapters call Communication; Communication/Streaming call Orchestration instead of stores, lifecycle hub, or runtimes. | allowed/forbidden dependencies | Pass |
| Existing-capability reuse | Application host/bootstrap, Orchestration, runtime listeners, Engine IPC, artifact platform, and provider-normalization evidence are reused where their semantics fit. Native stream protocols and unrelated paired-mobile security machinery are deliberately not reused because they do not match application identity or reachability. | existing capability check | Pass |
| Empty-indirection trigger | Communication, Streaming, and Orchestration each own distinct state/policy/lifecycle. Thin routes and SDK entrypoints do not masquerade as owners. | ownership map; thin-facade table | Pass |
| Shared-structure tightness | Binding, input, address, event, path, wire, safe-error, custom-WebSocket, and manifest/exposure shapes each have one meaning and one owner. | reusable-structure and tightness tables | Pass |
| Clean-cut replacement and removal | Old aliases, flat API, v3 readers, obsolete owner files, adapter IDs, and mandatory-proxy assumptions are removed rather than wrapped. | removal plan; compatibility rejection log | Pass |
| Persisted-data proportionality | Stored meanings/physical schema do not change; transient state is not persisted; no migration machinery is introduced. | persisted-data decision and evidence | Pass |
| Product reachability | Cancellation, terminal races, no-throw source callbacks, and slow consumers have supported witnesses; paired-mobile access, application credentials, speculative end-user grants, and old-data transformation do not drive machinery. | investigation `MP-001`–`MP-012` | Pass |

### Redundant-Design Elimination Audit

| Potential Duplication | Single Owner / Reuse Decision | Explicit Elimination |
| --- | --- | --- |
| public base/third generic binding concepts | two concrete public binding types with private field composition | no exported `ApplicationAgentBindingBase` or `ApplicationAgentExecutionBinding`; mixed-result signatures spell the union |
| frontend and backend input payloads | shared `ApplicationAgentInput` | no parallel connection/backend text-context-metadata DTOs |
| connect/input/subscribe target identity | shared `ApplicationAgentTargetAddress` | no raw-run/application-ID/member-selector alternatives |
| stream and input authorization rules | Orchestration-owned target authorization resolver | lease and input operations reuse one validation policy; callers cannot reimplement it |
| network and worker event mapping | one Streaming-owned exact public projector | adapters receive `ApplicationAgentEvent`; no adapter-local provider mapping |
| per-consumer event backlogs | one Streaming-owned bounded FIFO per consumer | Communication performs immediate serialized socket writes with a buffered-amount gate; it owns no second event FIFO |
| SDK/server path construction | one shared target-path codec | SDK encodes and server decodes exact inverse forms; no application URL builder |
| binding terminal coordination | one keyed Orchestration terminal transition owner plus one-shot hub | explicit terminate, observer, and recovery do not independently fan out lifecycle |
| standard versus custom WebSocket implementations | separate semantic owners sharing only transport primitives | standard agent protocol is not layered on custom worker routes; custom sockets remain the non-agent escape hatch |
| public contract versus internal models | shared contract types are imported; internal files hold only private state/leases/descriptors | server domain files must not redeclare public binding/input/address/event/frame shapes |
| Communication versus Streaming services | distinct session and event-consumer lifecycles | neither is a pass-through: Communication owns READY/input/socket close; Streaming owns projection/sequence/FIFO/terminal drain |
| READY versus terminal/cancel authority | one Communication-session synchronous transition serializer | Streaming returns `ACTIVE_PAUSED`; no other owner can open the SDK session or independently decide pre-ready event disposition |
| custom WebSocket contracts across SDK/worker | one shared custom frame/request/session/route contract | frontend, Gateway, Engine, and Backend Host import the same types; stopped partial shapes are rewritten to this authority rather than duplicated |
| standard versus custom WebSocket URL construction | standard path reuses the shared target codec; custom transport owns its distinct business path/query contract; the desktop host supplies both fixed bases | no artificial shared authentication composer and no application credential surface |
| backend exposure enablement versus discovery | bundle `supportedExposures` is the only declared authority; definition lists actual handlers; summary is derived | no application-manifest exposure copy and no summary-driven authorization |

This audit validates the design, not the stopped dirty implementation. Implementation must reconcile every partial file against these single-owner decisions, remove superseded duplicates instead of retaining both paths, and prove the result through source review and executable coverage.

## Final File Responsibility Mapping

| File | Area | Owner | Responsibility | Why One File | Shared |
| --- | --- | --- | --- | --- | --- |
| `application-agent-bindings.ts` | contracts | binding subject | two exported binding types, members, address; any common field type remains non-exported | coherent identity | SDK/server |
| `application-agent-events.ts` | contracts | event subject | exact event envelope/maps | coherent event schema | SDK/server |
| `application-agent-communication.ts` | contracts | connection protocol | public errors/close + frames | coherent protocol | SDK/server |
| `application-agent-target-path.ts` | contracts | URL identity adapter | exact suffix codec | pure codec | SDK/server |
| `application-websockets.ts` | contracts | custom WebSocket subject | closed frame, request, route, backend session/handler types | coherent custom protocol | SDK/Gateway/Engine/worker |
| `application-agent-connection.ts` | frontend | public connection | state/listeners/requests | one public object | contracts |
| `application-agent-connection-transport.ts` | frontend | browser transport | WebSocket/frame I/O | transport-specific | protocol |
| `application-backend-websocket-connection.ts` | frontend | custom connection | four-state readiness/send/listeners/error/close | one public custom object | WebSocket contract |
| `application-backend-websocket-transport.ts` | frontend | custom browser transport | fixed URL, text/binary conversion/order | transport-specific | WebSocket contract |
| `application-agent-communication-models.ts` | server | Communication internals | private session IDs/state/socket adapter only; import public protocol | private network model | Communication |
| `application-agent-communication-service.ts` | server | session facade | connect/disconnect/input/frame dispatch | governing owner | Streaming/Orchestration |
| `application-agent-communication-session.ts` | server | one session | synchronous READY/terminal/cancel reducer, paused-drain activation, requests/immediate writes/socket bound/exact close; no event FIFO | bounded local lifecycle | protocol |
| `application-agent-streaming-models.ts` | server | Streaming internals | private lease/source/subscription state only; import public event/address | private event model | Streaming |
| `application-agent-streaming-service.ts` | server | event facade | authorize/create/sweep subscriptions | governing owner | Orchestration |
| `application-agent-stream-subscription.ts` | server | one consumer | listener/filter/sequence/FIFO/terminal | bounded event loop | projector |
| `application-agent-stream-public-event-projector.ts` | server | projector | field-by-field public shape | security contract | event types |
| `application-agent-stream-runtime-source.ts` | server | source adapter | AgentRun/TeamRun listener | runtime-specific | subscription |
| Orchestration lease/lifecycle/terminal files | server | Orchestration | auth and terminal authority | distinct concerns | binding model |
| worker observer registry | server worker | backend adapter | pending/active FIFO callbacks | process adapter | event types |
| `application-backend-websocket-session-service.ts` | server gateway | Backend Gateway | custom auth/worker-open/readiness/inbound FIFO/network bound/first-cause close | network session owner | Engine/WebSocket types |
| `application-websocket-session-registry.ts` | server worker | Backend Host | route session, early/outbound FIFO, serialized handlers, abort/onClose | worker session owner | WebSocket types |
| `applicationHostTransport.ts` | web host | trusted desktop transport bootstrap | fixed application-scoped standard/custom/notification bases; no auth surface | one host scope boundary | node endpoints/application ID |
| application WS route adapters | server API | network boundary | decode standard target or normalize custom path/query, validate active application/exposure, delegate to the owning capability | thin route use | no worker/domain policy |
| `manifests.ts` + backend bundle/definition types | contracts | package-contract boundary | exact manifest-v4 pointer, bundle-v1 authority, v4/v4 compatibility, definition-v4/derived summary | one contract source | devkit/server/built-ins |

## Applied Patterns

- State machine: standard frontend/server readiness commit, per-consumer subscription, and independent custom frontend/gateway/worker session lifecycles.
- Adapter: standard WS route, backend worker observer, runtime source, target-path codec.
- Registry: sessions/subscriptions/worker observers indexed only for lifecycle lookup.
- Facade: Communication, Streaming, Orchestration, Backend Gateway each own policy/lifecycle rather than empty forwarding.
- Per-consumer event loop: synchronous no-throw acceptance plus asynchronous drain.

## Target Subsystem / Folder / File Mapping

### Add / retain from partial after conformance rewrite

```text
autobyteus-application-sdk-contracts/src/
├── application-agent-bindings.ts
├── application-agent-events.ts
├── application-agent-communication.ts
├── application-agent-target-path.ts
└── application-websockets.ts

autobyteus-application-frontend-sdk/src/
├── application-agent-connection.ts
├── application-agent-connection-transport.ts
├── application-backend-websocket-connection.ts
└── application-backend-websocket-transport.ts

autobyteus-server-ts/src/application-agent-communication/
├── domain/application-agent-communication-models.ts
└── services/
    ├── application-agent-communication-service.ts
    └── application-agent-communication-session.ts

autobyteus-server-ts/src/application-agent-streaming/
├── domain/application-agent-streaming-models.ts
└── services/
    ├── application-agent-streaming-service.ts
    ├── application-agent-stream-subscription.ts
    ├── application-agent-stream-runtime-source.ts
    └── application-agent-stream-public-event-projector.ts

autobyteus-server-ts/src/api/websocket/
├── application-agent-communication.ts
└── application-backends.ts
```

### Orchestration / engine / worker focused additions

```text
autobyteus-server-ts/src/application-orchestration/services/
├── application-agent-target-authorization-service.ts
├── application-run-binding-lifecycle-hub.ts
└── application-run-binding-terminal-transition-service.ts

autobyteus-server-ts/src/application-engine/runtime/json-line-frame-writer.ts
autobyteus-server-ts/src/application-engine/services/application-agent-stream-observer-activation-barrier.ts

autobyteus-server-ts/src/application-backend-api-gateway/websockets/
└── application-backend-websocket-session-service.ts

autobyteus-server-ts/src/application-engine/worker/
├── application-backend-host.ts
├── application-backend-definition-loader.ts
├── application-handler-context-factory.ts
├── application-agent-stream-observer-registry.ts
└── application-websocket-session-registry.ts
```

### Modify

- shared contract exports, iframe v4, manifests/exposures;
- frontend client/transport/startup and desktop-only web host bootstrap;
- Backend Gateway, notification Hub, Engine Host/client/protocol, worker bridge/entry;
- desktop application WebSocket route adaptation and active-application/exposure validation;
- Orchestration host/start/send/terminate/recovery/observer/store type imports;
- devkit/templates/validators, built-ins, docs, generated/vendor/importable copies;
- focused unit/integration tests for all spines.

### Remove / rename

- remove `application-agent-streaming.ts` partial monolith after splitting;
- rename/rewrite partial `application-agent-stream-authorization-service.ts` as the Orchestration-owned `application-agent-target-authorization-service.ts`; both stream leases and input routing reuse it, and the old file must not coexist;
- rename partial `application-agent-stream-activation-barrier.ts` to `application-agent-stream-observer-activation-barrier.ts`; it owns only worker observer activation and must not be confused with the Communication session's synchronous READY commit;
- rewrite partial custom-WebSocket files to the authoritative [`application-backend-websocket-contract.md`](./application-backend-websocket-contract.md); remove any alternative frame, readiness, route, or close shapes rather than retaining both;
- remove `ApplicationRunBindingSummary` public export and old binding member/status names;
- remove old notification stream file/export;
- remove old worker runtime file/export;
- remove v3 iframe source document/symbols;
- remove `ApplicationManifestV3` and every parser/test/generated declaration that accepts manifest/frontend/backend-definition v3; do not retain a six-flag backend-bundle default path;
- remove stale partial tests/docs/API assumptions that standard agent events require `webSocketRoutes`.

## Folder Boundary Check

| Folder | Depth | Clear | Risk | Justification |
| --- | --- | --- | --- | --- |
| `application-agent-communication` | main-line network/control | Yes | Low | standard session lifecycle |
| `application-agent-streaming` | main-line event/control + adapters | Yes | Low | reusable event consumer lifecycle |
| `application-orchestration/services` | domain control | Yes | Medium | focused services behind host facade |
| `application-backend-api-gateway` | transport/backend facade | Yes | Low | excludes standard agent path |
| `application-engine/worker` | process adapter | Yes | Medium | split by host/context/session/observer |
| SDK contract source | shared contract | Yes | Low | split by subject, not one index blob |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| standard agent UI | `agentCommunication.connect(address)` | declare route + proxy/map every event | framework owns common path |
| target identity | binding ID + discriminated target | binding/run/member alternatives | one semantic address |
| event schema | adapter-neutral `ApplicationAgentEvent` | event with subscriptionId/connectionId | reusable contract |
| custom realtime | explicit `backend.connectWebSocket(path)` | overload standard agent frames | plane clarity |
| authorization | Orchestration lease | Communication → binding store/runtime | authoritative boundary |
| lifecycle | per-consumer state/queue | one global mixed session manager | failure isolation |

## Backward-Compatibility Rejection Log

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| keep flat frontend aliases | ease partial cutover | Rejected | grouped v4 API only |
| accept iframe v3 and v4 | old built-ins | Rejected | update/regenerate all together |
| keep `ApplicationManifestV3` while setting nested fields to v4 | minimize type change | Rejected | exact `ApplicationManifestV4` plus bundle-v1 pointer/authority |
| default missing `supportedExposures.webSockets` to false | accept old six-flag bundles | Rejected | seven required booleans; regenerate/reject |
| retain old binding summary or add a generic execution-binding alias | reduce imports | Rejected | two precise binding types; explicit union only where needed |
| expose both adapter-specific and neutral events | partial code reuse | Rejected | neutral event only; internal correlation |
| implement standard path through custom worker WS | partial implementation reuse | Rejected | direct Communication/Streaming path |
| reuse native socket protocol | existing functionality | Rejected | application-scoped standard protocol |

## Derived Layering

```text
Application frontend API
  → standard/custom/notification transport adapters
  → focused server capability owners
  → Application Orchestration authority
  → runtime/persistence internals
```

This is explanatory only; ownership and spine rules govern.

## Change / Refactor Sequence

1. Freeze/preserve dirty partial implementation; classify each changed/untracked file as retain/rewrite/discard against this spec before editing.
2. Shared contracts: split/tighten the two binding types with private field composition, shared input, address, neutral event, fixed path codec, standard frames, authoritative custom-WebSocket types, exact `ApplicationManifestV4`, bundle-v1 seven-flag exposure authority, v4/v4 compatibility, definition-v4, and derived summary; update backend/frontend public APIs; build.
3. Orchestration: retain/rewrite the shared target-authorization resolver, lifecycle lease/hub/terminal owner; use explicit two-type unions only at mixed-result operations; expose address-based input; test authority/races.
4. Streaming: retain exact projector/source/subscription/service only after removing adapter IDs and aligning shared consumers/sequence/lifecycle.
5. Standard Communication: implement fixed WS adapter and session owner; return Streaming as `ACTIVE_PAUSED`; serialize READY/terminal/cancel/transport first cause synchronously; enable drain only after a successful READY write; implement exact SDK settlement/callback/close mapping.
6. Backend adapter: finish worker observer/Engine Host IPC against neutral events; keep it optional.
7. Generic backend WS and refactors: implement the exact normative frontend/route/session/readiness/message/bounds/failure contract; validate active application/exposure and normalize path/business query before Gateway/worker request creation; retain partial source only where it conforms; finish Backend Host/Notification Hub/route splits and tests.
8. Frontend/web host: implement agentCommunication grouping/connection/transport, standard target-path encoding, and the separate custom path/business-query transport; revise notification grouping; bootstrap fixed application WebSocket bases from the trusted desktop host with no application authentication surface; strict v4.
9. Built-ins/devkit/generated/docs: implement the exact manifest-v4 → bundle-v1 → definition-v4 authority/validation chain, update and regenerate in one clean cut, and remove stale v3/six-flag/old-name/mandatory-proxy examples.
10. Run implementation builds/focused suites; then source review, API/E2E, proportional test review, delivery.

No partial generated output is authoritative until final regeneration after source contracts stabilize.

## Key Tradeoffs

- A direct standard agent path is less application-customizable than mandatory worker proxying, but eliminates boilerplate and gives one predictable framework experience. Custom WebSockets remain the explicit escape hatch.
- Reusing one Streaming owner for network and worker consumers adds a shared subsystem, but prevents duplicated authorization/projector/lifecycle logic. Adapter-neutral public events keep it tight.
- Exposing binding address to frontend reveals application binding/member identifiers, but not raw runtime authority. Current product has application-level hosted identity only; server authorization remains mandatory. A speculative grant subsystem would add complexity without a reachable current identity requirement.
- V1 input-only standard commands are intentionally narrower than native sockets. This protects the application contract while allowing future explicit extensions.

## Risks

1. Dirty partial source is extensive; selective reconciliation can accidentally retain stale proxy assumptions. File-by-file conformance inventory is mandatory.
2. Whole-team/high-frequency events may pressure network and worker IPC differently. Each consumer therefore has one Streaming-owned bounded event FIFO plus adapter-specific transport bounds; implementation must not introduce a second server-side event backlog.
3. Public binding rename has broad import/generated impact despite no stored-data change.
4. READY/event/input-ack races need realistic WebSocket execution, including the Streaming `ACTIVE_PAUSED`/Communication commit barrier, not unit tests only.
5. Exact event projection breadth must remain exhaustively tested as runtime event families evolve.
6. Context-file input from hosted frontend must retain existing path/security policy; no widening beyond the current runtime input contract.
7. Raw custom request URLs still need boundary discipline: pass normalized path, params, business query, and sanitized headers into Gateway/worker handlers rather than the transport-owned raw URL.
8. Keeping backend bundle contract V1 while tightening its pre-release required exposure record is deliberate; any defaulting of the missing seventh flag would silently recreate a compatibility path and must be rejected.

## Guidance For Implementation

- Do not resume until user confirms this revised package and architecture review passes.
- Reconcile, do not blindly continue, the preserved dirty tree.
- Follow DS-003 through DS-005 for standard behavior; never route it through Backend Gateway/Engine Host/worker/native handlers.
- Use Orchestration for every binding/target/input/lifecycle decision; no store/hub/runtime bypass.
- Keep public events adapter-neutral and exact; never spread provider/runtime data.
- Register connection/subscription state and callbacks before awaits; return Streaming paused; run READY/terminal/cancel/failure through the one Communication-session transition serializer; gate event drain behind a successful synchronous READY write.
- Keep source/lifecycle callbacks synchronous and no-throw; assign sequence only at bounded acceptance.
- Make every close/release/request cleanup idempotent and first-cause controlled.
- Keep generic backend WebSockets, notifications, artifacts, and native sockets separate.
- Implement generic backend WebSockets only from the authoritative supplemental contract, including route validation, reserved readiness, early-frame rules, independent process bounds, and exactly-once two-sided cleanup.
- Build application WebSocket bases only in the trusted desktop web host. Expose no application-client authentication, credential field, token query, or paired-mobile behavior. Keep standard target-path encoding separate from custom business path/query handling.
- Implement exactly one declared exposure authority at `ApplicationBackendBundleManifestV1.supportedExposures`; application manifest only points to the bundle, definition v4 declares actual routes, and the summary remains derived.
- Choose/document/test numeric limits in implementation handoff.
- Add no migration, replay, grant persistence, version fallback, alias, or dual path.
