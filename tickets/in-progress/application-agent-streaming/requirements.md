# Requirements — Standard Application-Bound Agent Communication

## Status

`Design-ready. The user approved the standard application-agent communication direction, confirmed that only the individual-agent and agent-team binding types are real binding concepts, and clarified that application features are desktop-only and unrelated to paired mobile/phone access. The exact manifest/exposure authority is defined without adding application-client authentication.`

The user approved the architectural direction on 2026-07-21: applications should not need to invent a WebSocket route, backend proxy handler, input protocol, event mapping, or transport lifecycle merely to let their frontend communicate with an application-bound agent. The framework must provide one standard, address-based agent communication capability. `assistant` is an application role/example only and must not appear in framework API or owner naming.

This revision supersedes the earlier mandatory application-defined WebSocket proxy model. Generic application backend WebSockets remain an optional lower-level capability for genuinely custom realtime business protocols; they are not the standard agent path.

## Problem Statement

An application backend can start configured agents and agent teams and receives an `ApplicationRunBindingSummary`, but an application frontend has no standard application-scoped way to communicate with those bound executions. Native AutoByteus sockets accept raw runtime IDs and expose the native product protocol; they are not application APIs. The earlier proposal required every application to declare a WebSocket business path, resolve it to a binding, subscribe in the worker, transform events, and proxy input/output. That preserved flexibility but made the framework's most common live-agent use case unnecessarily repetitive.

The target framework must standardize:

1. how an application identifies an application-bound agent, whole agent team, or selected team member;
2. how an application frontend opens one bidirectional connection to that target;
3. how input is accepted and routed;
4. how exact provider-neutral events are delivered;
5. how connection, binding termination, backpressure, and failure lifecycles behave; and
6. how the standard live plane remains separate from backend APIs, custom WebSockets, notifications, and durable published artifacts.

## Terminology

- **Application agent binding** — the application-owned association returned by `startAgent(...)` for one started agent execution.
- **Application agent-team binding** — the application-owned association returned by `startAgentTeam(...)` for one started team execution and its known members.
- **Application agent target address** — `bindingId` plus exactly one target variant: bound agent, whole bound team, or selected static team member.
- **Application agent connection** — the frontend SDK's standard bidirectional connection to one authorized application agent target address.
- **Backend event subscription** — the advanced application-backend capability for observing the same provider-neutral event contract inside the managed worker. It is not required for the standard frontend connection.

Use `binding`, never `bonding`. Use `agent communication` or `agent connection`, never `assistant`, `chat`, or `live output`, in framework-owned names.

## Relevant Behavior Basis

| Behavior ID | Evidence-Backed Current Behavior At `HEAD` | Desired Outcome | Preserved Outcome |
| --- | --- | --- | --- |
| `BEH-001` | Application backend handlers call `context.agentExecution.startAgent(...)` / `startAgentTeam(...)`; Application Orchestration creates the runtime, persists one application run binding, observes lifecycle, optionally sends initial input, and returns a binding summary. | Preserve application-business-controlled creation while giving the two start operations precise agent-binding and agent-team-binding return types. | Orchestration remains the only creation/binding/lifecycle authority. |
| `BEH-002` | The application frontend SDK provides backend query, command, GraphQL, route, and notification operations. It has no standard application-agent connection. | Add `applicationClient.agentCommunication.connect(address)` returning `ApplicationAgentConnection`. | Existing backend request/response and notification behavior remains available; no application-client authentication is introduced. |
| `BEH-003` | Native `/ws/agent/:runId` and `/ws/agent-team/:teamRunId` sockets are bidirectional, raw-runtime-ID based, and native-UI specific. | Add a separate application-scoped standard endpoint derived from `ApplicationAgentTargetAddress`. | Native sockets, commands, payloads, and URLs remain unchanged. |
| `BEH-004` | `ApplicationRunBinding` is the durable application ownership/correlation record. Post-launch input uses `bindingId` plus optional member selectors. | Use one canonical `ApplicationAgentTargetAddress` for standard frontend connection, backend input, and backend event subscription. | `bindingId`, not raw `runId`, remains application authority/correlation. |
| `BEH-005` | Internal/native runtime events contain provider-derived records and no stable application contract. | Deliver one exact closed provider-neutral `ApplicationAgentEvent` contract to both frontend connections and backend subscriptions. | Provider/native/internal payloads remain private. |
| `BEH-006` | Application notifications are one-way, live, non-durable application messages. | Keep notifications independently subscribable and rename the internal fan-out owner to `ApplicationBackendNotificationHub`. | Topic/payload/loss behavior remains unchanged. |
| `BEH-007` | Published artifacts are durably persisted, relayed to an application backend handler, and read through authorized revision APIs before business projection. | Keep artifacts on their durable path; do not tunnel them through the live agent connection. | Artifact durability, authorization, handler, and revision-read behavior remains authoritative. |
| `BEH-008` | The application backend gateway reaches managed application workers. The worker loader/host responsibilities are concentrated in `ApplicationWorkerRuntime`; current frontend operations are flat. `ApplicationManifestV3` points to `ApplicationBackendBundleManifestV1`, whose `supportedExposures` is the current exposure authority. | Keep custom backend APIs/WebSockets under the backend capability, add a sibling standard agent-communication capability, rename the worker owner to `ApplicationBackendHost`, and make the strict target `ApplicationManifestV4` point to the single `ApplicationBackendBundleManifestV1.supportedExposures` authority. | Application Engine Host and worker supervision retain their distinct responsibilities. |
| `BEH-009` | Engine/worker IPC has request/response and worker-to-host notification support but no backend live-event subscription channel. | Add reusable host-side target event subscriptions, with a worker IPC adapter for advanced backend observers and a direct standard network adapter for frontend connections. | No callbacks/runtime objects cross process boundaries. |
| `BEH-010` | No current product identity exists below application ID for hosted desktop application frontends. Application launch scope plus server-side active-application/binding/target checks are the available authority. | Treat the target address as identity, never authorization: active application, same-application binding, target/member match, and active runtime checks are mandatory. | The desktop application client has no login/token API. Paired mobile/phone access and its credentials are outside this feature and unchanged. |

## Supplemental Requirements Basis

- [`application-agent-communication-contract.md`](./application-agent-communication-contract.md) — normative bindings/address, frontend connection, standard wire semantics, shared public event projection, backend subscription, lifecycle, failure, and delivery contract; approved requirements basis.
- [`application-backend-websocket-contract.md`](./application-backend-websocket-contract.md) — normative optional custom backend WebSocket frontend, route/handler, readiness, message, bounds, failure, and cleanup contract; approved under `REQ-010`/`AC-010`.
- [`application-communication-boundaries.md`](./application-communication-boundaries.md) — normative entity/module responsibilities, fixed endpoint derivation, standard/custom/artifact/notification spines, and end-to-end sequences; approved requirements basis.

## Use Cases

| Use Case | Required Outcome |
| --- | --- |
| `UC-001` Individual bound agent | Frontend connects to an `AGENT_RUN` target, sends input, and receives future provider-neutral events. |
| `UC-002` Whole bound agent team | Frontend connects to an `AGENT_TEAM_RUN` target and receives team-root plus attributed member events. |
| `UC-003` Selected team member | Frontend connects to one `AGENT_TEAM_MEMBER` by `memberRouteKey`; input and events remain limited to that member. |
| `UC-004` Backend live observation | Application backend may subscribe to the same address/event contract for advanced business logic without becoming mandatory frontend proxy glue. |
| `UC-005` Custom realtime backend protocol | Application may still define a custom backend WebSocket route when the standard agent protocol is insufficient. |
| `UC-006` Artifact plus agent communication | One workflow may combine durable published-artifact processing with a separate live application-agent connection. |
| `UC-007` Multiple independent consumers | Multiple frontend connections and/or backend subscriptions to authorized targets remain isolated in lifecycle, ordering, queue, and failure. |

## Functional Requirements

### `REQ-001` — Precise application binding vocabulary

`startAgent(...)` must return `ApplicationAgentBinding` and `startAgentTeam(...)` must return `ApplicationAgentTeamBinding`. These are the only two public binding concepts. APIs that may return either spell the explicit union `ApplicationAgentBinding | ApplicationAgentTeamBinding`; the framework must not export `ApplicationAgentBindingBase`, introduce `ApplicationAgentExecutionBinding`, or preserve another generic binding alias. Common source fields may use a private/non-exported composition type. A binding represents a started application-owned execution, not an agent definition. Existing stored binding meaning and values remain directly usable.

### `REQ-002` — One shared application agent target address

Define one transport-neutral `ApplicationAgentTargetAddress` containing `bindingId` plus exactly one target:

```ts
type ApplicationAgentTarget =
  | { kind: "AGENT_RUN" }
  | { kind: "AGENT_TEAM_RUN" }
  | { kind: "AGENT_TEAM_MEMBER"; memberRouteKey: string };

type ApplicationAgentTargetAddress = {
  bindingId: string;
  target: ApplicationAgentTarget;
};
```

The same address must be accepted by standard frontend connection, post-launch backend `sendInput(...)`, and backend `subscribeEventStream(...)`. It must never contain `applicationId` or raw `runId`; trusted application scope comes from the hosting/route boundary.

### `REQ-003` — Standard frontend application-agent connection

The frontend SDK must expose:

```ts
applicationClient.agentCommunication.connect(address, options?)
```

It returns `ApplicationAgentConnection` immediately in `connecting` state. The connection exposes `address`, `state`, `ready`, `sendInput(...)`, `onEvent(...)`, `onError(...)`, `onClose(...)`, and idempotent `close()`. No application-defined WebSocket route, backend proxy handler, runtime-event mapper, or raw browser `WebSocket` is required.

### `REQ-004` — Fixed framework endpoint derived from the address

The SDK must derive the standard endpoint from a bootstrapped `agentCommunicationWebSocketBaseUrl` and the target address. The canonical target suffixes are:

```text
/:bindingId/targets/agent-run
/:bindingId/targets/agent-team-run
/:bindingId/targets/agent-team-member/:memberRouteKey
```

The complete server mount is application scoped under `/ws/applications/:applicationId/agent-communication`. Application code must not construct this URL. Binding/member path segments are encoded by one shared codec and decoded/validated by the matching server adapter.

The trusted AutoByteus desktop host supplies the fixed base. The SDK appends the encoded target suffix. Application code does not construct host URLs, and no application authentication credential is part of this API.

### `REQ-005` — Standard bidirectional protocol

The standard connection must support frontend `sendInput(...)` and server event/error/close delivery. Frontend and backend input APIs reuse one transport-neutral `ApplicationAgentInput` shape instead of declaring parallel connection/backend payloads. `sendInput(...)` uses a correlated request ID and resolves only after the authorized runtime accepts the input; rejection is stable and safe. Version one supports typed JSON text frames and the existing application runtime text/context input shape. Raw native commands, tool approval, interrupt, arbitrary binary frames, and application-defined message types are excluded from the standard protocol.

### `REQ-006` — Three explicit target semantics

- `AGENT_RUN` is valid only for an agent binding and targets its root agent.
- `AGENT_TEAM_RUN` is valid only for a team binding and observes the whole team; input uses existing team-root/default behavior.
- `AGENT_TEAM_MEMBER` is valid only for a team binding and exact bound static `memberRouteKey`; events and input are selected-member scoped.

Direct dynamic task-agent targeting is excluded from version one. Whole-team events may still attribute dynamic task-agent activity through the documented producer shape.

### `REQ-007` — Address validation and application scope

Every standard connection must pass active-application validation, same-application binding validation, nonterminal binding validation, target-kind/member validation, and active-runtime resolution. The address identifies a target but does not establish ownership: trusted desktop application scope must match the binding. Missing, cross-application, terminal, mismatched, or inactive targets return only stable safe connection failures. No store, lifecycle hub, or runtime service is exposed to frontend code.

The standard adapter receives trusted desktop application scope and forwards no application-supplied identity or credential to Communication, Streaming, Orchestration, or runtime. Existing platform/network security remains outside this ticket and is not exposed through `ApplicationClient`.

### `REQ-008` — Shared provider-neutral event contract

Frontend connections and backend subscriptions must receive the same `ApplicationAgentEvent` envelope: subscription-local/connection-local sequence, trusted application identity, canonical address, root runtime subject, producer attribution, observation time, and a closed discriminated event union. Every allowed event type has an exact whitelisted data shape. Unknown/provider-only keys, raw responses, stacks/causes/details, internal objects, artifact/file/reference data, and file changes never cross the public projector.

The public event must not contain adapter-specific `subscriptionId` or `connectionId`; correlation remains internal to each adapter.

### `REQ-009` — Optional advanced backend event subscription

`ApplicationHandlerContext.agentExecution.subscribeEventStream(address, observer, options?)` remains available for application business logic that genuinely needs live backend observation. It uses the same target authorization, lifecycle lease, provider-neutral projector, ordering, and failure isolation as the standard frontend connection. It is not required to make the frontend connection work.

### `REQ-010` — Optional custom application backend WebSockets

The framework must also support generic application-defined backend WebSocket routes through `applicationClient.backend.connectWebSocket(path, options?)` and backend `webSocketRoutes`. The framework owns the typed frontend connection, exact reserved readiness frame, text/binary frame normalization, path/query construction, deterministic route matching, request/session/handler API, early-frame ordering, bounded process/network delivery, worker/network failure mapping, and exactly-once cleanup defined in [`application-backend-websocket-contract.md`](./application-backend-websocket-contract.md). This is an escape hatch for non-agent or specialized realtime protocols. It must not be used internally to implement the standard agent connection and must not interpret `ApplicationAgentTargetAddress`.

### `REQ-011` — Capability organization

The frontend API must make responsibility inferable:

```text
applicationClient.backend.query(...)
applicationClient.backend.command(...)
applicationClient.backend.graphql(...)
applicationClient.backend.route(...)
applicationClient.backend.connectWebSocket(...)       // custom business protocol

applicationClient.notifications.subscribe(...)

applicationClient.agentCommunication.connect(...)    // standard agent protocol
```

`getApplicationInfo()` remains metadata. No flat aliases, `assistant`, `chat`, raw agent `runId`, or frontend `agentExecution` namespace is retained.

### `REQ-012` — Communication planes remain separate

Keep five composable planes:

1. backend request/response;
2. application notifications;
3. durable published-artifact processing/read;
4. standard application-agent communication; and
5. custom application backend WebSockets.

The standard agent connection filters artifact/file events and is live/non-durable. Artifacts remain recoverable through their durable store and backend handler/read APIs. Notifications are not an agent transport.

### `REQ-013` — Connection establishment, ordering, and first-event rule

The frontend and server must register connection identity/state and close/error listeners before asynchronous application/target establishment. Streaming attaches the runtime listener in a paused-drain state. One Communication-session transition serializer must then choose exactly one winner among readiness, binding terminal, client/abort cancellation, and transport failure. A readiness winner writes `READY` successfully before marking the session open and enabling event drain; a terminal/cancel/failure winner never writes `READY`, drops/releases any pre-ready accepted events, and closes without becoming open. The SDK resolves `ready` only after consuming `READY`. `sendInput(...)` before readiness rejects locally.

Sequence starts at `1` and is assigned atomically as part of successful bounded server-queue acceptance. Excluded, malformed, serialization-failed, and overflow-rejected events consume no sequence. No replay occurs. To avoid missing initial output, start without `initialInput`, connect and await `ready`, then send input. Launch-time `initialInput` may produce events before connection.

### `REQ-014` — Cancellation, terminal lifecycle, and isolation

Close/error during application/target validation, source attachment, or the paused Streaming-active/Communication-pending gap must prevent a late active connection. Binding `TERMINATED`/`ORPHANED` before the READY commit rejects `ready` with `TARGET_NOT_AVAILABLE`, settles one safe error, drops the paused event FIFO, and closes once with `ESTABLISHMENT_FAILED`. Client close/abort before READY rejects `ready` with `CONNECTION_ABORTED`, emits no `onError`, and closes once with `CLIENT_CLOSED`/`ABORTED`. After a successful READY commit, binding end detaches the data listener, drains accepted events, and closes once with `BINDING_ENDED`. Internal server `READY_COMMIT_PENDING`/`DRAINING_TERMINAL` states map only to the four public SDK states `connecting/open/closing/closed`. Runtime/projector/serialization/network/backpressure failure must be synchronous-no-throw at the source callback and isolated to the affected connection/subscription. Every queue and network buffered amount is bounded.

### `REQ-015` — Clear owners and focused refactors

Use these framework owners:

- `ApplicationAgentCommunicationService` — standard frontend connection/session protocol, input correlation, synchronous frame serialization, socket buffered-amount enforcement, and close lifecycle; it must not create a second agent-event backlog;
- `ApplicationAgentStreamingService` — reusable authorized target event subscriptions, projection, sequencing, and source/lifecycle release;
- `ApplicationBackendApiGatewayService` — application backend HTTP/custom-WebSocket entry only;
- `ApplicationBackendNotificationHub` — notification connection registry/fan-out only;
- `ApplicationBackendHost` — worker-internal application definition/context/handler dispatch;
- Application Orchestration — binding creation/control, address authorization, lifecycle lease, and input routing.

The standard agent path must not traverse Application Engine Host or the application worker. The backend subscription and custom backend WebSocket adapters may traverse them.

### `REQ-016` — Strict forward-only contract cutover

Advance the iframe/frontend SDK and backend definition compatibility contracts to the new current source shape. The exact authority model is:

- `ApplicationManifestV4` / `manifestVersion: "4"` owns application identity, UI entry, `ui.frontendSdkContractVersion: "4"`, the `backend.bundleManifest` pointer, and execution-resource slots; it contains no exposure flags.
- `ApplicationBackendBundleManifestV1` remains the sole declared backend-capability authority at `supportedExposures`, with the seven required booleans `queries`, `commands`, `routes`, `graphql`, `notifications`, `eventHandlers`, and `webSockets`; its `sdkCompatibility` is exactly backend definition `"4"` plus frontend SDK `"4"`.
- current `ApplicationBackendDefinition` uses `definitionContractVersion: "4"`; its optional `webSocketRoutes` is the actual route declaration, permitted only when the bundle authority enables `webSockets`.
- `ApplicationBackendExposureSummary` is derived runtime metadata, not a second authority: it carries the bundle `supportedExposures` value plus existing discovered query/command/HTTP-route/GraphQL/notification/event-handler values and `webSocketRoutes: Array<{path: string}>` derived from the definition.

Update application/root and backend-bundle parsers, devkit config/writers/validators/templates, definition loading/exposure validation, built-ins, generated distributions, and vendor copies together. Do not retain `ApplicationManifestV3`, v3 iframe/frontend/backend-definition aliases, flat frontend APIs, old worker/service names, dual bootstrap readers, or deprecated adapter-specific public event shapes. Do not add `backend.supportedExposures` to `ApplicationManifestV4` or another parallel exposure flag.

### `REQ-017` — No persisted-data migration

Decision: `Directly Usable — No Migration`.

Existing binding/artifact/application data is semantically unchanged and directly readable. Connection/session/subscription/queue/sequence state is transient. Add no DDL, schema migration, replay store, checkpoint, version-specific data reader, or binding rewrite.

## Acceptance Criteria

### `AC-001` — Binding return precision

Type/export tests prove `startAgent` returns `ApplicationAgentBinding`, `startAgentTeam` returns `ApplicationAgentTeamBinding`, and mixed-result APIs use the explicit `ApplicationAgentBinding | ApplicationAgentTeamBinding` union. `ApplicationAgentBindingBase`, `ApplicationAgentExecutionBinding`, `ApplicationRunBindingSummary`, and equivalent generic public aliases are absent; any common field composition remains private/non-exported.

### `AC-002` — Canonical address reuse

Type/runtime tests prove the exact same `ApplicationAgentTargetAddress` is accepted by frontend connect, backend send input, and backend subscribe, with no raw `runId` or application-supplied `applicationId` alternative.

### `AC-003` — Standard individual-agent connection

An application frontend connects to an authorized agent binding through `agentCommunication.connect`, awaits ready, sends input, and receives ordered future provider-neutral events without declaring a backend WebSocket route or mapping handler.

### `AC-004` — Whole-team and selected-member connection

Executable coverage proves whole-team root/member attribution and selected-member filtering/input routing. Wrong binding/target/member combinations fail safely before runtime listener activation.

### `AC-005` — Fixed endpoint and SDK ownership

SDK tests prove all three address variants derive the exact standard URL through the shared codec; path segments are encoded; frontend code receives the base via strict desktop bootstrap and never builds host URLs or handles an authentication credential.

### `AC-006` — Standard protocol behavior

Connection tests prove `READY` precedes events, correlated input acknowledgement controls `sendInput` resolution, unsupported/malformed frames fail safely, pre-ready input rejects, and the SDK exposes no raw socket.

### `AC-007` — Authorization boundary

Inactive/missing application, cross-application binding, terminal binding, target mismatch, absent member, and inactive runtime cases are rejected without leaking runtime/binding detail or leaving listeners. Tests prove that `ApplicationClient` and its bootstrap/connection options expose no application authentication or paired-mobile credential surface.

### `AC-008` — Exact provider-neutral projection

Table-driven contract tests cover every allowed agent/team event field map plus representative AutoByteus, Codex, Claude, whole-team, task-delegation, and selected-member fixtures. Unknown/provider-only/error-internal/artifact/file/reference fields are absent. Public events contain no adapter connection/subscription ID.

### `AC-009` — Backend subscription reuse

Backend SDK integration coverage proves the advanced observer receives the same public event contract and uses the same address/authorization/terminal path, while a standard frontend connection works with no worker observer.

### `AC-010` — Custom WebSocket independence

Generic application WebSocket tests prove the complete authoritative supplement: path/query and route-param semantics, trusted desktop application context, exact readiness-first behavior, text/binary round trips, backend send-during-open ordering, early raw-client rejection, serialized handler delivery, frame/queue/socket bounds, establishment/close/worker/network races, safe frontend errors, and exactly-once two-sided cleanup. Structural checks prove the standard agent adapter does not invoke custom backend WebSocket handlers or Engine Host.

### `AC-011` — Capability naming

Frontend type/runtime tests expose exactly the backend, notifications, and agentCommunication groupings above, with no framework-owned assistant/chat naming, flat aliases, or frontend agentExecution namespace.

### `AC-012` — Plane separation

Artifact tests pass unchanged; agent event projection drops artifact/file families; notification behavior passes independently; neither plane is used to transport standard agent events/input.

### `AC-013` — Pending cancellation and readiness ordering

Race tests place client close, abort, transport failure, binding terminal, and accepted runtime events before source attachment, after Streaming becomes paused-active, immediately before/during/after the serialized READY write, and before event-drain activation. Exactly one winner occurs: either `ready` rejects with the documented error/close and no event, or READY is observed first, `ready` resolves, accepted events retain order, and a later terminal closes with `BINDING_ENDED`. No late listener/session survives.

### `AC-014` — Terminal drain and sequence

Tests prove queue-acceptance sequence assignment, no sequence consumption for excluded/malformed/serialization/overflow events, accepted-event retention through terminal drain, one `BINDING_ENDED` close, and no exposed later gap after failed network send.

### `AC-015` — Failure isolation and bounded resources

Throwing listeners/projectors, runtime/source failure, input failure, queue overflow, network buffered-amount overflow, socket failure, worker failure, and duplicate close races affect only their owned connection/subscription/worker scope and release all registrations/listeners.

### `AC-016` — Strict generated contract propagation

Shared/backend/frontend SDKs build; devkit validation proves the exact `ApplicationManifestV4 → ApplicationBackendBundleManifestV1` pointer, v4/v4 compatibility pair, required seven-flag bundle exposure authority, definition-v4 route gate, and derived summary; built-ins and checked-in generated/vendor/importable packages are regenerated; v3 and obsolete names are absent. Negative coverage rejects a nested application-manifest exposure, a missing/non-boolean `webSockets`, a disabled capability with declared routes, and stale manifest/frontend/backend-definition versions.

### `AC-017` — No migration machinery

Source and tests contain no ticket-added DDL, migration service/script, replay/checkpoint store, compatibility reader, or persisted connection/subscription state. Existing binding/artifact rows are read directly.

## Scope Exclusions

- Chat/assistant UI components or rendering policy.
- Automatic reconnection or historical replay.
- Standard-protocol tool approval, interrupt, arbitrary command, or binary frames in version one.
- Direct dynamic task-agent target addresses.
- Raw native agent/team socket reuse or native protocol compatibility.
- New end-user/multi-tenant identity, signed connection grants, or persisted access tokens; trusted desktop application scope remains the only in-product application context.
- Mobile/phone application access, paired-mobile credential injection, or any application-client authentication API; application features are desktop-only for this ticket.
- Direct raw published-artifact delivery to the frontend.
- Deployment or release work unless separately requested downstream.

## Approval Record

- The original application-backend-owned proxy requirements and supplements were user-approved on 2026-07-21.
- After architecture round 3 and partial implementation start, the user materially changed the intended primary experience: a standard address-based frontend connection should replace mandatory app-specific path/mapping/proxy work.
- The user approved that direction and asked solution design to continue standardizing/refactoring on 2026-07-21.
- The user then confirmed removal of the misleading third `ApplicationAgentExecutionBinding` concept and directed solution design to validate data-flow coverage/design principles and send the package for review when sound.
- The user clarified after architecture round 6 that application features are desktop-only and unrelated to mobile/phone access. The temporary design addition for paired-mobile `access_token` injection was unnecessary and is removed; no finalized or committed implementation is based on it, and any matching dirty partial source is stale/prohibited.
- The exact revised requirements and normative supplements are approved as the basis for fresh architecture review.
