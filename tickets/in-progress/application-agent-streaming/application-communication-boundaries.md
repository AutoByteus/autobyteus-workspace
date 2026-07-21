# Application Communication Boundaries And Data-Flow Spines

## Status And Authority

This is a normative intended-behavior supplement to [`requirements.md`](./requirements.md) and [`design-spec.md`](./design-spec.md). Exact standard-agent protocol/state semantics are in [`application-agent-communication-contract.md`](./application-agent-communication-contract.md); exact optional custom-backend WebSocket semantics are in [`application-backend-websocket-contract.md`](./application-backend-websocket-contract.md).

Status: `Approved intended-behavior basis; corrected manifest/exposure boundary and desktop-only application scope are ready for fresh architecture review.`

It supersedes the diagram set in which a custom application backend WebSocket handler was mandatory for agent input/output. Custom backend WebSockets remain an optional separate plane.

## 1. Capability Map

```mermaid
flowchart LR
    subgraph HOST["AutoByteus Web Host"]
        BOOT["Desktop application transport bootstrap\ntrusted application scope + fixed bases"]
    end

    subgraph UI["Application Frontend"]
        CLIENT["applicationClient"]
        BACKEND["backend\nrequest/response + custom WS"]
        NOTIFY["notifications"]
        AGENT["agentCommunication\nstandard connection"]
    end

    subgraph SERVER["AutoByteus Server"]
        BGW["Application Backend API Gateway"]
        NHUB["Application Backend Notification Hub"]
        ACOMM["Application Agent Communication Service"]
        ASTREAM["Application Agent Streaming Service"]
        ORC["Application Orchestration"]
        ENGINE["Application Engine Host"]
    end

    subgraph WORKER["Managed Application Backend Worker"]
        BHOST["Application Backend Host"]
        BUSINESS["Application business handlers"]
    end

    subgraph RUNTIME["Agent Runtime"]
        ARUN["AgentRun"]
        TRUN["TeamRun + members"]
    end

    BOOT --> CLIENT
    CLIENT --> BACKEND
    CLIENT --> NOTIFY
    CLIENT --> AGENT
    BACKEND --> BGW --> ENGINE --> BHOST --> BUSINESS
    NOTIFY --> NHUB
    AGENT --> ACOMM --> ASTREAM --> ORC
    ORC --> ARUN
    ORC --> TRUN
    BHOST --> ORC
```

The standard agent path does **not** traverse the application worker. Application business still decides when to create a binding and which target address to return to its frontend. After that decision, the framework owns connection, input routing, event projection, and lifecycle.

## 2. Responsibility Boundaries

| Boundary | Owns | Must Not Own |
| --- | --- | --- |
| AutoByteus desktop web host transport builder | fixed application transport bases and trusted application scope | application business query/path, authentication/credential APIs, target authorization |
| Application frontend | business UI, target address received from its backend, event rendering, connection use | runtime IDs, binding authorization, provider parsing, server queues |
| Frontend SDK direct WebSocket transports | standard target-path encoding or custom path/business-query construction, connection protocol/state | application authentication, application-scope selection, server authorization |
| Frontend SDK `agentCommunication` | target-to-path codec, connection state, standard protocol, input correlation, listener dispatch | application business paths, native agent protocol, binding store reads |
| Standard agent WebSocket adapter | fixed desktop route decoding, socket adaptation, trusted application-scope entry | application worker handlers, target authorization, event mapping |
| `ApplicationAgentCommunicationService` | one standard network session, readiness, input request correlation, immediate serialized frame writes, socket buffered-amount enforcement, close | second agent-event FIFO, binding store, runtime source, application business protocol |
| `ApplicationAgentStreamingService` | reusable target event subscription, exact public projection, per-consumer sequence/queue, terminal drain | frontend socket protocol, application database, binding store/hub bypass |
| Application Orchestration | application/binding/target authorization, binding lifecycle lease, runtime descriptor, input routing, creation/control | network sockets, provider mapping, frontend listener state |
| Custom WebSocket adapter / Application Backend API Gateway | active application/exposure validation, normalized custom request, HTTP/custom-WebSocket entry and session lifecycle into the managed backend | application authentication, standard agent connection/session |
| Application Engine Host | application worker lifecycle and IPC | standard frontend agent network path |
| Application Backend Host | application definitions, handlers, contexts, custom WebSocket handlers, advanced backend observer callbacks | direct frontend network socket, runtime/store authority |
| Notification Hub | notification socket registration and one-way fan-out | agent events, artifacts, custom sessions |
| Artifact platform | durable revision persistence/read and backend handler delivery | live agent input/event transport |

## 3. Canonical Address And Fixed Endpoint

```mermaid
flowchart TB
    ADDRESS["ApplicationAgentTargetAddress\nbindingId + target"]
    KIND{"target.kind"}
    AG["/:bindingId/targets/agent-run"]
    TEAM["/:bindingId/targets/agent-team-run"]
    MEMBER["/:bindingId/targets/agent-team-member/:memberRouteKey"]
    HOST["Trusted desktop host\nactive application scope"]
    BASE["Bootstrapped fixed base\n/ws/applications/:applicationId/agent-communication"]
    URL["Canonical standard WebSocket URL"]

    HOST --> BASE
    ADDRESS --> KIND
    KIND -->|AGENT_RUN| AG
    KIND -->|AGENT_TEAM_RUN| TEAM
    KIND -->|AGENT_TEAM_MEMBER| MEMBER
    BASE --> URL
    AG --> URL
    TEAM --> URL
    MEMBER --> URL
```

The address is application-scoped by the hosted client and route. It omits `applicationId` and raw runtime IDs. The desktop host owns fixed-base creation; the SDK encodes every target path segment. Application code never constructs the host URL or selects application scope.

### Desktop-only application access boundary

```mermaid
flowchart LR
    HOST["Trusted desktop application host\napplicationId + fixed bases"] --> STANDARD["Standard target URL\nshared target-path codec"]
    HOST --> CUSTOM["Custom backend URL\napplication path + business query"]
    HOST --> NOTIFY["Notification URL"]
    STANDARD --> SADAPTER["Standard WS adapter\nactive app + socket adaptation"]
    SADAPTER --> COMM["Agent Communication\nOrchestration target authority"]
    CUSTOM --> CADAPTER["Custom WS adapter\nactive app + exposure + normalization"]
    CADAPTER --> GATEWAY["Backend Gateway / Engine / Backend Host"]
    NOTIFY --> HUB["Notification Hub"]
```

Application features are desktop-only. The bootstrap, `ApplicationClient`, and both connection option types expose no login, token, or credential. Existing platform/network security remains unchanged outside this application contract.

### Manifest and exposure authority boundary

```mermaid
flowchart LR
    APPMAN["ApplicationManifestV4\nmetadata + UI v4 + bundle pointer"] --> BUNDLE["ApplicationBackendBundleManifestV1\nsole supportedExposures authority\n7 required booleans"]
    BUNDLE --> COMPAT["SDK compatibility\nbackend definition v4 + frontend SDK v4"]
    BUNDLE --> GATE{"webSockets enabled?"}
    DEF["ApplicationBackendDefinition v4\nactual webSocketRoutes"] --> GATE
    GATE -->|disabled + routes| REJECT["Reject package/runtime load"]
    GATE -->|valid| SUMMARY["Derived exposure summary\nroute paths + existing observed surfaces"]
```

`ApplicationManifestV4` contains no `supportedExposures`. The bundle record is the only declared allowlist; definition routes are actual handlers, and the summary is read-only derived observation. Missing `webSockets`, stale v3 compatibility, or a disabled capability with routes is rejected rather than defaulted.

## 4. DS-001 — Application-Controlled Binding Creation

```mermaid
sequenceDiagram
    autonumber
    participant APP as Application Business Handler
    participant CTX as context.agentExecution
    participant EH as Application Engine Host
    participant ORC as Application Orchestration
    participant RES as Execution Resource Resolver
    participant RUN as AgentRun / TeamRun Service
    participant STORE as Application Binding Store

    APP->>CTX: startAgent(...) or startAgentTeam(...)
    CTX->>EH: worker capability request
    EH->>ORC: trusted applicationId + start input
    ORC->>RES: resolve configured agent/team resource
    ORC->>RUN: create physical runtime
    ORC->>STORE: persist application binding
    ORC->>ORC: attach lifecycle observation
    opt initialInput
        ORC->>RUN: route initial input
    end
    ORC-->>APP: ApplicationAgentBinding or ApplicationAgentTeamBinding
```

The application decides when and why to start the execution. Streaming/communication never creates a runtime implicitly.

## 5. DS-002 — Business Selection, Standard Address Handoff

```mermaid
sequenceDiagram
    autonumber
    participant UI as Application Frontend
    participant API as applicationClient.backend query/command/GraphQL
    participant GW as Application Backend API Gateway
    participant EH as Application Engine Host
    participant APP as Application Business Handler
    participant DB as Application Database / Mapping

    UI->>API: request business object live-agent target
    API->>GW: application-scoped backend request
    GW->>EH: invoke managed application handler
    EH->>APP: trusted application context
    APP->>DB: resolve business object to binding/member
    APP-->>UI: ApplicationAgentTargetAddress
```

This is the only application-specific mapping required. It selects a business-owned bound target; it does not proxy the WebSocket or transform runtime events.

## 6. DS-003 — Standard Connection Establishment

```mermaid
    sequenceDiagram
    autonumber
    participant HOST as Trusted AutoByteus Web Host
    participant UI as Application Frontend
    participant CONN as ApplicationAgentConnection
    participant WS as Standard Agent WS Adapter
    participant COMM as Application Agent Communication Service
    participant STREAM as Application Agent Streaming Service
    participant ORC as Application Orchestration
    participant LIFE as Binding Lifecycle Hub
    participant RUN as Bound Agent / Team Runtime

    HOST->>CONN: bootstrap fixed desktop standard base + application scope
    UI->>CONN: agentCommunication.connect(address)
    CONN->>CONN: return CONNECTING, install socket/listeners
    CONN->>CONN: append encoded target through shared codec
    CONN->>WS: standard application-scoped URL
    WS->>WS: validate active desktop application route scope
    WS->>COMM: connect(trusted applicationId, address, socket)
    COMM->>COMM: allocate ESTABLISHING session and callbacks before await
    COMM->>STREAM: subscribe target for this session
    STREAM->>ORC: openAgentEventStreamLease(applicationId, address)
    ORC->>LIFE: register terminal listener before final read
    ORC->>ORC: active app + binding + target authorization
    ORC-->>STREAM: descriptor + lifecycle release
    STREAM->>RUN: attach isolated runtime listener
    STREAM-->>COMM: ACTIVE_PAUSED subscription, event drain disabled
    COMM->>COMM: serialize READY against terminal/cancel/transport first cause
    alt READY write wins
        COMM-->>CONN: synchronously write READY
        COMM->>STREAM: enable event drain
        CONN->>CONN: consume READY, OPEN, resolve ready
        CONN-->>UI: ready fulfilled
    else another cause already won
        COMM->>STREAM: detach/release and clear paused FIFO
        COMM-->>CONN: exact ERROR/CLOSED, never OPEN
    end
```

The desktop web host owns the fixed standard base and application scope; the SDK owns target-path encoding; the adapter owns route decoding and active-application validation. The Communication session's synchronous transition serializer is the only READY/terminal/cancel/failure commit owner. If READY succeeds, retained pre-ready events drain afterward. If another cause wins, the session never opens, paused events are dropped, and all late acquisitions are released.

## 7. DS-004 — Standard Input Spine

```mermaid
sequenceDiagram
    autonumber
    participant UI as Application Frontend
    participant CONN as ApplicationAgentConnection
    participant COMM as Agent Communication Service
    participant ORC as Application Orchestration
    participant RUN as Selected Bound Target

    UI->>CONN: sendInput({ text, contextFiles?, metadata? })
    CONN->>COMM: INPUT(requestId, input)
    COMM->>COMM: validate protocol/state/unique requestId
    COMM->>ORC: sendInput(trusted applicationId, address, input)
    ORC->>ORC: revalidate active application/binding/target
    ORC->>RUN: post input to agent/team/member
    RUN-->>ORC: accepted
    ORC-->>COMM: accepted
    COMM-->>CONN: INPUT_ACCEPTED(requestId)
    CONN-->>UI: sendInput promise resolves
```

The standard connection supports input, not native command passthrough. Tool approvals, interrupts, arbitrary messages, and binary frames are excluded from v1.

## 8. DS-005 — Standard Event Return Spine

```mermaid
sequenceDiagram
    autonumber
    participant RUN as Bound Agent / Team Runtime
    participant SUB as Agent Event Subscription
    participant PROJ as Public Event Projector
    participant COMM as Agent Communication Service
    participant CONN as ApplicationAgentConnection
    participant UI as Application Frontend

    RUN-->>SUB: normalized runtime event
    SUB->>PROJ: exact event case
    PROJ-->>SUB: closed provider-neutral event or deliberate drop
    SUB->>SUB: serialization check + bounded acceptance\nassign observedAt and sequence atomically
    SUB-->>COMM: already-sequenced event
    COMM-->>CONN: immediate serialized EVENT write
    COMM->>COMM: enforce socket buffered-amount bound, no second event FIFO
    CONN->>CONN: parse and isolate listener dispatch
    CONN-->>UI: onEvent(ApplicationAgentEvent)
```

No application backend mapper is required. The frontend still decides how to render the standard event.

## 9. DS-006 — Binding-Terminal Connection Close

```mermaid
sequenceDiagram
    autonumber
    participant SRC as Explicit Terminate / Run Observer / Recovery
    participant TERM as Binding Terminal Transition Service
    participant STORE as Binding Store + Existing Journal
    participant LIFE as Binding Lifecycle Hub
    participant SUB as Agent Event Subscription
    participant RUN as Runtime Data Source
    participant COMM as Agent Communication Service
    participant CONN as ApplicationAgentConnection

    SRC->>TERM: terminate or orphan binding
    TERM->>TERM: serialize transition by applicationId + bindingId
    TERM->>STORE: persist TERMINATED / ORPHANED and existing effects
    TERM->>LIFE: publish one-shot terminal signal after persistence
    LIFE-->>SUB: authorized binding-ended callback
    alt READY was successfully written first
        SUB->>SUB: ACTIVE_DRAINING to DRAINING_TERMINAL
        SUB->>RUN: detach listener immediately
        loop events accepted before terminal signal
            SUB-->>COMM: ordered already-sequenced event
        end
        SUB-->>COMM: closed BINDING_ENDED
        COMM-->>CONN: CLOSED(BINDING_ENDED), close once
    else subscription is ACTIVE_PAUSED and Communication is connecting
        SUB->>RUN: detach listener immediately
        SUB-->>COMM: pre-ready terminal callback
        COMM->>COMM: terminal wins serialized commit
        COMM->>SUB: clear paused FIFO and release lease
        COMM-->>CONN: ERROR(TARGET_NOT_AVAILABLE)
        COMM-->>CONN: CLOSED(ESTABLISHMENT_FAILED), never OPEN
    end
```

Terminal persistence is authority. The hub is same-process ephemeral observation only. The streaming service receives lifecycle only through the Orchestration lease.

## 10. DS-007 — Advanced Backend Subscription

```mermaid
sequenceDiagram
    autonumber
    participant APP as Application Backend Handler
    participant CTX as context.agentExecution
    participant BH as Application Backend Host
    participant EH as Application Engine Host
    participant STREAM as Application Agent Streaming Service
    participant ORC as Application Orchestration
    participant RUN as Bound Runtime

    APP->>CTX: subscribeEventStream(address, observer)
    CTX->>BH: register pending observer + subscriptionId
    BH->>EH: reverse IPC subscribe
    EH->>STREAM: subscribe(trusted applicationId, address)
    STREAM->>ORC: authorized target/lifecycle lease
    STREAM->>RUN: attach event listener
    STREAM-->>EH: success before notifications
    EH-->>BH: correlated success
    BH-->>APP: resolve subscription handle
    RUN-->>STREAM: future event
    STREAM-->>EH: correlated ApplicationAgentEvent
    EH-->>BH: host-to-worker notification
    BH-->>APP: observer.onEvent(event)
```

This adapter is available for advanced backend logic. It is not on DS-003 through DS-005 and is not mandatory frontend proxy glue.

## 11. DS-008 — Optional Custom Backend WebSocket

```mermaid
sequenceDiagram
    autonumber
    participant HOST as Trusted AutoByteus Web Host
    participant UI as Application Frontend
    participant SDK as backend.connectWebSocket(appPath)
    participant GW as Custom WS Adapter / Gateway Session
    participant EH as Application Engine Host
    participant BH as Backend Host Route Matcher
    participant REG as Worker WebSocket Session Registry
    participant HANDLER as Application WebSocket Handler

    HOST->>SDK: bootstrap fixed desktop custom WS base + application scope
    UI->>SDK: connectWebSocket(path, business query), returns CONNECTING
    SDK->>SDK: normalize and append encoded path/business query
    SDK->>GW: application-scoped custom URL
    GW->>GW: validate active app + webSockets exposure
    GW->>GW: normalize request + allocate pending session
    GW->>EH: correlated worker open
    EH->>BH: trusted application scope + normalized request
    BH->>BH: exact unambiguous route match
    BH->>REG: allocate pending session + AbortSignal
    REG->>HANDLER: open(request, session, context)
    opt handler sends during open
        HANDLER-->>REG: session.send(text/binary)
        REG-->>EH: bounded worker send action
        EH-->>GW: bounded early outbound frame
    end
    HANDLER-->>REG: return session handler
    REG-->>GW: worker open acknowledged
    GW->>GW: serialized readiness/close first-cause commit
    GW-->>SDK: reserved CONNECTION_READY first
    GW-->>SDK: drain accepted early backend frames
    SDK->>SDK: consume readiness, OPEN, resolve ready
    UI->>SDK: send text/binary
    SDK->>GW: bounded frame
    GW->>EH: serialized inbound FIFO delivery
    EH->>REG: deliver frame
    REG->>HANDLER: await onMessage(frame) one at a time
    HANDLER-->>REG: session.send(response)
    REG-->>EH: bounded worker action
    EH-->>GW: correlated frame
    GW-->>SDK: immediate bounded text/binary write
    SDK-->>UI: onMessage(frame)
```

This is the escape hatch for collaborative, binary, or non-agent realtime behavior. Its exact frontend, route, frame, readiness, queue, error, manifest, path/query, and cleanup rules are authoritative in [`application-backend-websocket-contract.md`](./application-backend-websocket-contract.md). `ApplicationWebSocketRequest.query` contains application business query. It is neither called by nor interpreted by the standard agent communication service.

## 12. DS-009 — Notifications Remain Separate

```mermaid
sequenceDiagram
    autonumber
    participant APP as Application Backend Handler
    participant CTX as context.publishNotification
    participant BH as Application Backend Host
    participant EH as Application Engine Host
    participant HUB as Application Backend Notification Hub
    participant UI as applicationClient.notifications

    APP->>CTX: publishNotification(topic, payload)
    CTX->>BH: create notification
    BH-->>EH: worker notification frame
    EH->>HUB: publish application-scoped notification
    HUB-->>UI: one-way live fan-out
```

Notifications have no input channel, binding target, event projection, or durability.

## 13. DS-010 — Published Artifacts Remain Durable

```mermaid
sequenceDiagram
    autonumber
    participant RUN as Bound Runtime
    participant PUB as Published Artifact Service
    participant STORE as Durable Revision Store
    participant RELAY as Application Artifact Relay
    participant ORC as Application Orchestration
    participant EH as Application Engine Host
    participant APP as Application Artifact Handler
    participant DB as Application Business Projection
    participant UI as Application Frontend

    RUN->>PUB: publish artifact
    PUB->>STORE: persist revision
    PUB-->>RELAY: artifact persisted event + execution context
    RELAY->>ORC: authorize application binding/producer
    RELAY->>EH: invoke managed artifact handler
    EH->>APP: persisted-artifact callback
    APP->>ORC: context.publishedArtifacts.readRevision(...)
    ORC->>STORE: authorized durable read
    APP->>DB: project application business state
    UI->>APP: later query/GraphQL/route
    APP-->>UI: application-specific durable view
```

The live public projector drops artifact/file events. A standard agent connection is not artifact recovery or a replacement for application business projection.

## 14. Bounded State And Queue Spines

### DS-011 — Frontend connection state

```mermaid
stateDiagram-v2
    [*] --> CONNECTING: connect(address)
    CONNECTING --> OPEN: READY consumed
    CONNECTING --> CLOSING: pre-ready error / close / abort
    OPEN --> CLOSING: CLOSED frame / client close / transport failure
    CLOSING --> CLOSED: socket + request/listener cleanup
    CLOSED --> [*]
```

Only these four states are public. Server draining remains internal; the SDK stays `open` until it consumes `CLOSED`.

```mermaid
flowchart LR
    SUB["Streaming ACTIVE_PAUSED\naccepted events held"] --> SERIAL["Communication session\nsynchronous transition serializer"]
    READY["subscription returned\nREADY attempt"] --> SERIAL
    TERM["binding terminal"] --> SERIAL
    CANCEL["client close / abort"] --> SERIAL
    FAIL["socket / READY write failure"] --> SERIAL
    SERIAL --> WIN{"first cause"}
    WIN -->|READY write succeeds| OPEN["internal OPEN\nenable drain"]
    WIN -->|terminal| UNAVAILABLE["drop FIFO\nTARGET_NOT_AVAILABLE\nESTABLISHMENT_FAILED"]
    WIN -->|client / abort| ABORTED["drop FIFO\nCONNECTION_ABORTED\nno onError"]
    WIN -->|transport| TRANSPORT["drop FIFO\nTRANSPORT_FAILED"]
```

### DS-012 — Per-consumer event loop

```mermaid
flowchart LR
    EVENT["Runtime callback"] --> ACTIVE{"consumer ACTIVE?"}
    ACTIVE -->|no| IGNORE["Ignore/release"]
    ACTIVE -->|yes| PROJECT["Exact public projection"]
    PROJECT --> VALID{"valid + serializable?"}
    VALID -->|no| FAIL["Isolated error + close"]
    VALID -->|yes| CAP{"bounded capacity?"}
    CAP -->|no| OVER["BACKPRESSURE_LIMIT\nno sequence consumed"]
    CAP -->|yes| ACCEPT["Assign observedAt + sequence\nand enqueue atomically"]
    ACCEPT --> DRAIN["Async per-consumer drain\nno renumbering"]
```

The Streaming subscription owns the only server-side event FIFO for that consumer. A frontend Communication session performs immediate serialized socket writes and a buffered-amount check; it does not copy accepted events into another queue.

### DS-013 — Standard input request correlation

```mermaid
flowchart LR
    INPUT["INPUT frame"] --> STATE{"session OPEN?"}
    STATE -->|no| REJECT["INPUT_REJECTED / protocol close"]
    STATE -->|yes| UNIQUE{"requestId unique?"}
    UNIQUE -->|no| REJECT
    UNIQUE -->|yes| REGISTER["register pending request"]
    REGISTER --> ROUTE["Orchestration sendInput\nshared address + input"]
    ROUTE --> RESULT{"runtime accepted?"}
    RESULT -->|yes| ACCEPTED["remove request\nINPUT_ACCEPTED"]
    RESULT -->|no| FAILED["remove request\nINPUT_REJECTED"]
    REGISTER -. connection closes .-> CLEAN["reject and remove all pending requests"]
```

### DS-014 — Backend observer activation and dispatch

```mermaid
stateDiagram-v2
    [*] --> PENDING: register observer before host subscribe
    PENDING --> ACTIVE: correlated host success committed
    PENDING --> CLOSED: failure / abort / binding ended
    ACTIVE --> ACTIVE: enqueue and isolate observer callback
    ACTIVE --> CLOSED: unsubscribe / overflow / worker stop / binding end
    CLOSED --> [*]: release registry and callbacks once
```

### DS-015 — Binding terminal transition serialization

```mermaid
flowchart LR
    CAUSE["Explicit terminate / observer / recovery"] --> KEY["serialize by applicationId + bindingId"]
    KEY --> READ["read current binding under owner"]
    READ --> FIRST{"first terminal cause?"}
    FIRST -->|no| EXISTING["return existing terminal result"]
    FIRST -->|yes| PERSIST["persist terminal state + existing journal effects"]
    PERSIST --> SIGNAL["publish one-shot lifecycle signal"]
    EXISTING --> RELEASE["release keyed transition"]
    SIGNAL --> RELEASE
```

### DS-016 — Optional custom backend WebSocket session

```mermaid
stateDiagram-v2
    [*] --> PENDING_APPLICATION: gateway allocates + installs listeners
    PENDING_APPLICATION --> PENDING_WORKER: active application + exposure accepted
    PENDING_WORKER --> READY_COMMIT: route open acknowledged
    READY_COMMIT --> ACTIVE: reserved readiness write succeeds
    PENDING_APPLICATION --> CLOSING: reject / client close / transport failure
    PENDING_WORKER --> CLOSING: client close / open failure / backend close
    READY_COMMIT --> CLOSING: close wins / readiness write fails
    ACTIVE --> ACTIVE: ordered bounded message relay
    ACTIVE --> CLOSING: either side closes / fails / overflows
    CLOSING --> CLOSED: idempotent gateway + worker cleanup
    CLOSED --> [*]
```

`PENDING_APPLICATION`, `PENDING_WORKER`, and `READY_COMMIT` map to frontend `connecting`; `ACTIVE` maps to `open`; the remaining states map to `closing/closed`. Raw client frames before `ACTIVE` are rejected rather than queued. Backend sends during `open(...)` use one bounded early FIFO and are released only after the reserved readiness frame.

```mermaid
flowchart LR
    CLIENT["Frontend frame"] --> GIN["Gateway bounded inbound FIFO"]
    GIN --> EIPC["serialized Engine IPC"] --> WH["Worker registry"] --> HANDLER["one-at-a-time onMessage"]
    HANDLER --> WOUT["Worker bounded outbound FIFO"] --> ACTION["Engine host action"] --> BUFFER{"socket bufferedAmount within limit?"}
    BUFFER -->|yes| CLIENTOUT["Frontend onMessage"]
    BUFFER -->|no| CLOSE["1013 close this session"]
```

## 15. Complete Communication Matrix

| Caller | Public Boundary | Destination | Purpose |
| --- | --- | --- | --- |
| AutoByteus desktop web host | `buildApplicationHostTransport(...)` | strict iframe transport bootstrap | trusted application scope plus fixed standard/custom/notification bases; no application auth surface |
| Application frontend | `applicationClient.backend.query/command/graphql/route` | managed application handler | application business request/response |
| Application frontend | `applicationClient.backend.connectWebSocket(path, options?)` | typed custom connection → Gateway/worker route | optional text/binary realtime protocol |
| Application frontend | `applicationClient.notifications.subscribe` | Notification Hub | application-defined one-way topics |
| Application frontend | `applicationClient.agentCommunication.connect(address)` | standard Agent Communication Service | application-bound agent/team/member input and events |
| Application backend | `context.agentExecution.startAgent/startAgentTeam` | Application Orchestration | create application binding |
| Application backend | `context.agentExecution.sendInput(address)` | Application Orchestration | backend input to bound target |
| Application backend | `context.agentExecution.subscribeEventStream(address)` | Agent Streaming Service via Engine Host | optional backend live observation |
| Runtime | published artifact service | durable store + application handler | durable application result |
| Application backend WebSocket route | `open(request, session, context)` + returned handler | correlated frontend custom connection | application-defined realtime protocol over normalized business path/query |

## 16. Allowed And Forbidden Dependencies

Allowed:

```text
desktop web host → strict application WS bases
standard frontend transport → shared target-path codec
custom frontend transport → custom path/business-query construction
standard WS adapter → Agent Communication Service → Agent Streaming Service → Application Orchestration
Agent Communication Service → Application Orchestration (input only)
backend observer registry → Engine Host → Agent Streaming Service
custom backend WS adapter → Backend API Gateway → Engine Host → Backend Host
artifact relay → Application Orchestration → Engine Host → artifact handler
```

Forbidden:

```text
standard agent connection → Application Backend API Gateway / Engine Host / application worker
standard agent connection → native agent/team stream handler
Agent Communication Service → binding store / lifecycle hub / runtime service directly
Agent Streaming Service → binding store / lifecycle hub directly
frontend → raw runId native socket
notification hub → agent event source
artifact relay/revision store → standard agent connection
custom backend WebSocket handler as mandatory standard-agent proxy
ApplicationClient → authentication / credential API
paired-mobile or phone remote-access behavior → application framework contract
ApplicationManifestV4 → supportedExposures copy
```

## 17. Use-Case Coverage

| Use Case | Spine Coverage |
| --- | --- |
| `UC-001` Individual bound agent | DS-001 through DS-006, DS-011 through DS-013, DS-015 with `AGENT_RUN` |
| `UC-002` Whole bound team | DS-001 through DS-006, DS-011 through DS-013, DS-015 with `AGENT_TEAM_RUN` |
| `UC-003` Selected team member | DS-001 through DS-006, DS-011 through DS-013, DS-015 with `AGENT_TEAM_MEMBER` |
| `UC-004` Backend live observation | DS-001, DS-006, DS-007, DS-012, DS-014, DS-015 |
| `UC-005` Custom realtime backend protocol | DS-008, DS-016 |
| `UC-006` Artifact plus live communication | DS-001 through DS-006 composed with DS-010, DS-011 through DS-013, DS-015; planes remain separate |
| `UC-007` Multiple independent consumers | DS-003, DS-005 through DS-007, plus independent DS-011 through DS-015 state |

## 18. Persisted Data Decision

`Directly Usable — No Migration`.

Existing bindings and artifacts retain their current stored meaning. The new target address, network connection, subscription, request, queue, and sequence are transient. No DDL, migration, replay/checkpoint store, compatibility reader, connection-grant storage, or data rewrite is part of this ticket.
