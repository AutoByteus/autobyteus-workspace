# Requirements — Standard Application-Bound Agent Communication

## Status

`Design-ready against stopped source HEAD 3e48c0ea2c9ccabe52c3126f0db799b3865186a3. The standard desktop application-agent communication framework, Socratic integration/fixes, and typed target-address builders are committed. A real mounted Codex journey then exposed a design defect in the application event projection: the runtime and native AutoByteus stream produced text successfully, while the separate application projector emitted neither usable text nor a completion signal. The user approved a clean-cut simplification on 2026-07-22: application streaming v1 exposes only safe text deltas and minimal turn/error lifecycle, uses the existing canonical AgentRunEvent semantics, and does not reproduce the full AutoByteus chat event surface. Implementation, API/E2E, and delivery are blocked pending fresh architecture approval of this revised basis.`

Architecture review round 16 confirmed the minimal five-event framework contract, resolved `DR-015`/`DR-016`, and returned the package for the bounded `DR-017` Socratic one-turn admission correction. Implementation, API/E2E, and delivery remain blocked pending a fresh passing architecture gate.

The user approved the architectural direction on 2026-07-21: applications should not need to invent a WebSocket route, backend proxy handler, input protocol, event mapping, or transport lifecycle merely to let their frontend communicate with an application-bound agent. The framework must provide one standard, address-based agent communication capability. `assistant` is an application role/example only and must not appear in framework API or owner naming.

This revision supersedes the earlier mandatory application-defined WebSocket proxy model. Generic application backend WebSockets remain an optional lower-level capability for genuinely custom realtime business protocols; they are not the standard agent path.

## Problem Statement

The initial framework gap was the absence of a standard application-scoped way for hosted frontends to communicate with application-bound agents and teams. That gap has now been implemented: application business creates precise bindings, returns a canonical target address, and the frontend uses a provider-neutral standard connection rather than raw native runtime sockets or a mandatory application-defined WebSocket proxy.

The framework standardizes:

1. how an application identifies an application-bound agent, whole agent team, or selected team member;
2. how application backend code can construct each canonical reusable/projected address from a precise binding, without forcing an authoritative-binding fetch for existing one-shot `sendInput` calls that already hold only `bindingId`;
3. how an application frontend opens one bidirectional connection to that target;
4. how input is accepted and routed;
5. how exact provider-neutral text deltas and minimal turn/error lifecycle are delivered;
6. how connection, binding termination, backpressure, and failure lifecycles behave; and
7. how the standard live plane remains separate from backend APIs, custom WebSockets, notifications, and durable published artifacts.

The framework behavior above was subsequently implemented and passed the previously approved deterministic API/E2E scope at `96.7%` confidence. That score did not include a real Socratic Math Teacher UI journey or a live Codex turn. The user explicitly rejected build/package-only evidence as final acceptance and expanded this ticket to cover the real sample application, exact tutor launch configuration, live provider execution, UI streaming, durable artifact convergence, and cleanup. The prior score remains historical evidence only.

## Terminology

- **Application agent binding** — the application-owned association returned by `startAgent(...)` for one started agent execution.
- **Application agent-team binding** — the application-owned association returned by `startAgentTeam(...)` for one started team execution and its known members.
- **Application agent target address** — `bindingId` plus exactly one target variant: bound agent, whole bound team, or selected static team member.
- **Application agent connection** — the frontend SDK's standard bidirectional connection to one authorized application agent target address.
- **Application agent stream event** — one of five safe application-facing variants: `TURN_STARTED`, `TEXT_DELTA`, `TURN_COMPLETED`, `TURN_INTERRUPTED`, or `ERROR`. It is a deliberately small vertical-application contract, not the native AutoByteus chat protocol.
- **Backend event subscription** — the advanced application-backend capability for observing the same minimal application stream contract inside the managed worker. It is not required for the standard frontend connection.

Use `binding`, never `bonding`. Use `agent communication` or `agent connection`, never `assistant`, `chat`, or `live output`, in framework-owned names.

## Relevant Behavior Basis

| Behavior ID | Evidence-Backed Current Behavior At Current `HEAD` | Desired Outcome For This Revision | Preserved Outcome |
| --- | --- | --- | --- |
| `BEH-001` | Precise `ApplicationAgentBinding` / `ApplicationAgentTeamBinding` creation is implemented through Application Orchestration. | Preserve and use the team binding in Socratic. | Orchestration remains the only creation/binding/lifecycle authority. |
| `BEH-002` | The grouped frontend SDK exposes `applicationClient.agentCommunication.connect(address)` and Socratic consumes it. | Preserve the connection and simplify only its public stream event contract. | Endpoint, READY/input protocol, connection API, and backend/notification groupings remain unchanged. |
| `BEH-003` | Native raw-runtime-ID agent/team sockets remain separate from the application contract. | Do not use them in Socratic. | Native sockets, commands, payloads, and URLs remain unchanged. |
| `BEH-004` | One canonical `ApplicationAgentTargetAddress`, three typed backend-SDK builders, and Socratic member-builder adoption are committed. Existing follow-up/hint input paths intentionally hold only `bindingId` and build one-shot whole-team send DTOs inline. | Preserve unchanged. | `bindingId`, not raw `runId`, remains application authority/correlation; server authorization remains authoritative. Direct DTO construction remains valid where no precise binding object is already owned. |
| `BEH-005` | One canonical internal `AgentRunEvent` reaches both the working native mapper and the application projector, but the application projector independently reinterprets 23 agent and 4 team event shapes. It missed canonical `segment_type`, normalized text differently, and invented `AGENT_RESPONSE_COMPLETED` from AutoByteus-only `ASSISTANT_COMPLETE`. | Replace the broad interpretation with a small `ApplicationAgentStreamEventProjector`: exact canonical text `SEGMENT_CONTENT` becomes `TEXT_DELTA`; canonical turn lifecycle remains turn lifecycle; safe runtime error becomes `ERROR`; every other internal event is deliberately dropped. | Provider adapters and the native AutoByteus mapper/frontend remain unchanged; provider/native/internal payloads remain private. |
| `BEH-006` | `ApplicationBackendNotificationHub` provides one-way live application topics. | Preserve Socratic artifact notification refresh. | Topic/payload/loss behavior remains unchanged. |
| `BEH-007` | Published artifacts are durably persisted, relayed, authorized, and projected. | Preserve the durable Socratic transcript and compose it with ephemeral live progress. | Artifact durability and revision-read behavior remain authoritative. |
| `BEH-008` | Strict manifest/frontend/backend v4, grouped frontend capabilities, optional custom WebSockets, focused Backend Gateway/Engine/Host owners, and generated packages are implemented. | Preserve all runtime/network owners; the event contraction changes only shared event contracts/projector/consumers and generated copies. | Application Engine Host and worker supervision retain distinct responsibilities. |
| `BEH-009` | Reusable host-side Streaming, direct frontend Communication, advanced backend observers, terminal lifecycle, ordering, and bounds are implemented. | Exercise the direct standard path with a real provider/application. | No callbacks/runtime objects cross process boundaries and no app-specific stream queue/mapper is added. |
| `BEH-010` | Hosted applications are desktop-only; active-application/binding/target validation exists and the application client has no auth/mobile surface. | Preserve during live acceptance. | Paired mobile/phone credentials remain unrelated and unchanged. |
| `BEH-011` | The committed Socratic integration and builder adoption start without input, connect/READY/send correctly, and complete tool/artifact/durable paths. The first real mounted Codex journey proved native assistant text existed (`135` characters) while the application stream exposed zero text and no completion because Socratic consumed broad projector-only event semantics. It also proved that in-turn artifact publication and later live text/completion are independent sibling returns. Current mounted follow-up/hint controls can nevertheless start another request before the one-slot join resolves. | Make Socratic append only ordered `TEXT_DELTA`, finish on `TURN_COMPLETED`, join the sibling returns locally, and enforce one locally observed tutor turn at a time across initial, follow-up, and hint actions. Remove tool-event presentation and `AGENT_RESPONSE_COMPLETED` dependence. | Exact Codex config, launch precedence, target builder, connection lifecycle, send-once ownership, artifact publication, durable transcript, and cleanup remain authoritative. Re-entry cannot reset the active baseline or send another input. No generic queue/correlation/accumulation machinery is introduced. |
| `BEH-012` | Brief Studio and Socratic both implement application-owned launch-to-business-record correlation. Rich chat rendering, tool presentation, reasoning display, and whole-response accumulation are not proven vertical-application framework requirements. | Keep business correlation/application presentation local; standardize only the minimal text stream now. Preserve one internal projector boundary so future evidence-backed application transformations can be added as explicit closed event variants without changing transport/session owners. | Optional backend subscription/custom WebSockets remain available for genuinely application-specific transformation; no plugin registry or generic chat accumulator is added. |

## Supplemental Requirements Basis

- [`application-agent-communication-contract.md`](./application-agent-communication-contract.md) — normative bindings/address/builders, frontend connection, standard wire semantics, five-variant public stream projection, backend subscription, lifecycle, failure, and delivery contract; user-approved revised requirements basis.
- [`application-backend-websocket-contract.md`](./application-backend-websocket-contract.md) — normative optional custom backend WebSocket frontend, route/handler, readiness, message, bounds, failure, and cleanup contract; approved under `REQ-010`/`AC-010`.
- [`application-communication-boundaries.md`](./application-communication-boundaries.md) — normative entity/module responsibilities, canonical internal event/application projector boundary, fixed endpoint derivation, standard/custom/artifact/notification spines, and end-to-end sequences; user-approved revised requirements basis.
- [`socratic-math-live-journey.md`](./socratic-math-live-journey.md) — normative exact tutor configuration/address, real mounted UI journey, minimal text/turn/error stream, live/durable convergence, assertions, environment, retry/timing/cost bounds, cleanup, and generated-package propagation; user-approved revised requirements basis for `BEH-011`/`UC-008`/`REQ-018`/`AC-018`.

## Use Cases

| Use Case | Required Outcome |
| --- | --- |
| `UC-001` Individual bound agent | Frontend connects to an `AGENT_RUN` target, sends input, and receives ordered text/turn/error stream events attributed to that agent. |
| `UC-002` Whole bound agent team | Frontend connects to an `AGENT_TEAM_RUN` target and receives text/turn/error stream events from team agents, distinguished by producer attribution; team coordination internals are not exposed. |
| `UC-003` Selected team member | Frontend connects to one `AGENT_TEAM_MEMBER` by `memberRouteKey`; input and text/turn/error events remain limited to that member. |
| `UC-004` Backend live observation | Application backend may subscribe to the same address/event contract for advanced business logic without becoming mandatory frontend proxy glue. |
| `UC-005` Custom realtime backend protocol | Application may still define a custom backend WebSocket route when the standard agent protocol is insufficient. |
| `UC-006` Artifact plus agent communication | One workflow may combine durable published-artifact processing with a separate live application-agent connection. |
| `UC-007` Multiple independent consumers | Multiple frontend connections and/or backend subscriptions to authorized targets remain isolated in lifecycle, ordering, queue, and failure. |
| `UC-008` Real Socratic tutor journey | The mounted Socratic Math Teacher UI admits one local tutor turn at a time, starts a configured Codex tutor team, connects to its bound `tutor` member, sends one student problem after READY, appends `TEXT_DELTA`, completes on `TURN_COMPLETED`, converges with the independently arriving durable artifact projection in either order, and enables the next follow-up/hint only after that join while keeping Close lesson available. |
| `UC-009` Canonical target-address construction | Application backend code that already owns a precise binding can construct agent, whole-team, or static-member addresses through typed backend-SDK builders; invalid binding-kind/member selections fail locally, while active-application/binding authorization remains server-owned. Existing bindingId-only one-shot input callers remain valid direct DTO producers. |

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

### `REQ-008` — Minimal provider-neutral application stream

Frontend connections and backend subscriptions must receive the same `ApplicationAgentEvent` envelope with connection/subscription-local sequence, trusted application identity, canonical address, root runtime subject, non-null producing agent/member attribution, observation time, and exactly one closed `ApplicationAgentStreamEvent` variant:

```ts
type ApplicationAgentStreamEvent =
  | { type: "TURN_STARTED" }
  | { type: "TEXT_DELTA"; delta: string }
  | { type: "TURN_COMPLETED" }
  | { type: "TURN_INTERRUPTED" }
  | { type: "ERROR"; message: string };
```

The application stream is a deliberately small vertical-application projection, not the native AutoByteus chat protocol. Provider adapters remain the owner of provider-native-to-`AgentRunEvent` conversion. The application projector consumes that established canonical internal event boundary and owns only safe selection:

- canonical `TURN_STARTED`, `TURN_COMPLETED`, and `TURN_INTERRUPTED` retain the same public meaning;
- canonical `SEGMENT_CONTENT` with exact `segment_type: "text"` becomes `TEXT_DELTA`, preserving the emitted `delta` byte-for-byte, including whitespace;
- canonical runtime `ERROR` becomes a bounded stable public message without provider error data; and
- reasoning, segment structure, assistant-complete duplication, status, compaction, token, tool, todo, inter-agent/team coordination, task delegation, artifact, file, provider metadata, and unknown events are deliberately dropped without consuming sequence.

`TURN_COMPLETED` is the sole successful public completion signal. `AGENT_RESPONSE_COMPLETED` and a full-response payload do not exist. The durable published-artifact path remains the appropriate mechanism for a complete structured business result. The public envelope contains no adapter `subscriptionId`/`connectionId`, provider/native payload, raw error, stack/cause/details, internal runtime object, artifact/file/reference data, or thinking/reasoning content.

`ApplicationAgentStreamEventProjector` is the one internal extension boundary. Future application-facing transformations may add explicit closed variants only when real vertical-application evidence requires them; version one adds no plugin registry, arbitrary application projector, or generic chat accumulator.

### `REQ-009` — Optional advanced backend event subscription

`ApplicationHandlerContext.agentExecution.subscribeEventStream(address, observer, options?)` remains available for application business logic that genuinely needs live backend observation. It uses the same target authorization, lifecycle lease, minimal projector, ordering, and failure isolation as the standard frontend connection. It is not required to make the frontend connection work.

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

### `REQ-018` — Exact Socratic Codex configuration and real live application journey

The source tutor config must use `runtimeKind: "codex_app_server"`, `llmModelIdentifier: "gpt-5.6-sol"`, and `llmConfig.reasoning_effort: "high"`, with no implicit service tier. The existing backend-SDK configured-team launch helper must accept optional transport-neutral `llmConfig` and propagate it through the already-supported preset/member launch fields so the effective tutor run can be proven to use all three requested values despite host-managed slot configuration.

Socratic Math Teacher must use the implemented standard application-agent connection in its real mounted desktop UI: start the team without launch-time input, return an application-business-chosen `AGENT_TEAM_MEMBER` address for static member route key `tutor`, connect and await READY, send the stored student problem exactly once, append ordered `TEXT_DELTA` values, finish the live draft on `TURN_COMPLETED`, handle `TURN_INTERRUPTED`/`ERROR`, and reconcile the ephemeral text draft with the existing durable artifact/notification transcript. Artifact publication is an in-turn tool action and its notification/GraphQL refresh is a sibling of the later live return; neither order is guaranteed.

The Socratic-local reducer must therefore keep orthogonal live phase and `durableObservedForTurn` state using the already-existing pre-input durable-tutor-message count as a local baseline. If live text/completion arrives first, the completed draft remains visible until the durable result arrives, then the UI atomically replaces the draft with the authoritative transcript. If the durable result arrives first, it is recorded but newly added tutor transcript rows are presentation-deferred while the accepted live turn remains open; subsequent `TEXT_DELTA` values remain visibly streamed. `TURN_COMPLETED` then atomically reveals the durable row and clears the draft. `TURN_INTERRUPTED`, `ERROR`, or an observed connection close after durable success also reveals/preserves the durable row and reports only a non-blocking live warning; before durable success they remain a failed/incomplete live outcome and must not resend uncertain input. A later durable success upgrades that failed/incomplete presentation to saved. This is application-private joining only: no framework correlation store, second queue, public turn ID, or generic accumulator is permitted.

That single baseline is valid only under an explicit Socratic-local sequential-turn invariant. `socratic-tutor-session.js` owns synchronous admission through a private state of `available`, `dispatching`, `awaiting_join`, `uncertain`, or `closed`. The initial lesson turn is reserved before waiting for READY; follow-up and hint handlers must atomically obtain a private admission handle whose successful claim captures/resets the baseline before GraphQL. Only `available` may be claimed. A denied or stale/re-entrant action returns locally, leaves the baseline/live/durable facts unchanged, and performs no GraphQL or agent input send. The handle is in-memory application implementation state, not a public turn identifier or event/artifact correlation key.

Follow-up and hint controls are enabled only when the selected lesson and connection are active and admission is `available`. They are disabled during initial dispatch, request dispatch/acceptance, streaming, completed-waiting-durable, durable-waiting-live-terminal, failed/interrupted-waiting-durable, uncertain request outcome, and closed/closing lesson states. A synchronous validation failure before admission leaves them available. Any promise rejection after an admission is claimed is acceptance-uncertain, keeps the same baseline and disables another send; a later durable/live join may resolve it to saved. Successful saved join releases admission only if the connection and lesson remain active. An observed connection close keeps it closed even if durable success exists. **Close lesson** remains available throughout an unresolved turn and atomically closes/invalidate the current admission. Renderer disabling is usability feedback; the session guard is the defensive authority.

Socratic must not render thinking, tool lifecycle, provider/native events, segment internals, or a duplicate whole-response event. Connection, binding, worker, application, browser, workspace, and temporary-data cleanup must be exact and idempotent. The complete normative journey, UI states, deterministic/qualitative assertions, environment preflight, time/cost bounds, retry classification, and source/generated propagation are defined in [`socratic-math-live-journey.md`](./socratic-math-live-journey.md).

### `REQ-019` — Typed application agent target-address builders

`@autobyteus/application-backend-sdk` must export three explicit pure builders:

```ts
createApplicationAgentTargetAddress(binding: ApplicationAgentBinding)
createApplicationAgentTeamTargetAddress(binding: ApplicationAgentTeamBinding)
createApplicationAgentTeamMemberTargetAddress(
  binding: ApplicationAgentTeamBinding,
  memberRouteKey: string,
)
```

Each returns a fresh canonical `ApplicationAgentTargetAddress`. Every builder trims/requires `binding.bindingId`; the first two reject a runtime-subject mismatch at runtime. The member builder additionally trims/requires `memberRouteKey` and rejects a key absent from `binding.runtime.members`; it never accepts `memberName`, `displayName`, or a raw run ID as a substitute. Builders do not mutate the binding and perform no liveness or authorization decision. Application Orchestration remains the sole active-application/binding/target authority when the address is used.

The builders are the preferred typed construction API when application backend code already owns a precise binding and needs a reusable/projected address. They are not a replacement for the shared address DTO and do not require callers to fetch a binding solely to construct a one-shot input address. Socratic must use the member builder rather than hand-construct its reusable `tutorTargetAddress`. Its existing `askFollowUp` and `requestHint` paths may continue to construct `{ bindingId, target: { kind: "AGENT_TEAM_RUN" } }` directly because those supported paths own only the persisted binding ID, immediately pass the DTO to `sendInput`, and rely on Orchestration for authoritative validation. Low-level codec/protocol/authorization tests may likewise construct explicit valid or deliberately malformed DTO fixtures. Generated/vendor copies come only from the normal build.

This is the correct interactive sequencing choice, not a change to launch semantics: `startAgent(...)` / `startAgentTeam(...)` create and bind a runtime without requiring input. Their optional `initialInput` remains valid for backend-owned or fire-and-forget work where observing the first live event from a later frontend connection is not required.

## Acceptance Criteria

### `AC-001` — Binding return precision

Type/export tests prove `startAgent` returns `ApplicationAgentBinding`, `startAgentTeam` returns `ApplicationAgentTeamBinding`, and mixed-result APIs use the explicit `ApplicationAgentBinding | ApplicationAgentTeamBinding` union. `ApplicationAgentBindingBase`, `ApplicationAgentExecutionBinding`, `ApplicationRunBindingSummary`, and equivalent generic public aliases are absent; any common field composition remains private/non-exported.

### `AC-002` — Canonical address reuse

Type/runtime tests prove the exact same `ApplicationAgentTargetAddress` is accepted by frontend connect, backend send input, and backend subscribe, with no raw `runId` or application-supplied `applicationId` alternative.

### `AC-003` — Standard individual-agent connection

An application frontend connects to an authorized agent binding through `agentCommunication.connect`, awaits ready, sends input, and receives ordered future text/turn/error stream events without declaring a backend WebSocket route or mapping handler.

### `AC-004` — Whole-team and selected-member connection

Executable coverage proves whole-team root/member attribution and selected-member filtering/input routing. Wrong binding/target/member combinations fail safely before runtime listener activation.

### `AC-005` — Fixed endpoint and SDK ownership

SDK tests prove all three address variants derive the exact standard URL through the shared codec; path segments are encoded; frontend code receives the base via strict desktop bootstrap and never builds host URLs or handles an authentication credential.

### `AC-006` — Standard protocol behavior

Connection tests prove `READY` precedes events, correlated input acknowledgement controls `sendInput` resolution, unsupported/malformed frames fail safely, pre-ready input rejects, and the SDK exposes no raw socket.

### `AC-007` — Authorization boundary

Inactive/missing application, cross-application binding, terminal binding, target mismatch, absent member, and inactive runtime cases are rejected without leaking runtime/binding detail or leaving listeners. Tests prove that `ApplicationClient` and its bootstrap/connection options expose no application authentication or paired-mobile credential surface.

### `AC-008` — Minimal projector and semantic parity

Table-driven contract tests prove the exact five public variants and exhaustive drop policy. Real-shaped AutoByteus, Codex, and Claude canonical `SEGMENT_CONTENT` fixtures produce identical `TEXT_DELTA` meaning and preserve exact emitted bytes, including whitespace-only deltas. Their canonical `TURN_COMPLETED` fixtures produce the same sole completion variant. Standalone, whole-team, and selected-member paths preserve correct producer attribution/filtering. Reasoning, tools, statuses, team coordination/delegation, `ASSISTANT_COMPLETE`, artifacts/files, unknown events, provider fields, raw errors, and every removed public variant produce no public event and consume no sequence. Native mapper regression/parity tests prove the native AutoByteus path remains unchanged while both consumers agree on text and completion semantics. Shared-contract/frontend-validator/generated-package tests prove `AGENT_RESPONSE_COMPLETED`, `SEGMENT_CONTENT`, broad agent/team public maps, and removed payload types are absent from the application API.

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

### `AC-018` — Real Socratic Math Teacher and Codex proof

Fresh source/generated-package checks prove the exact tutor runtime/model/effort config and no drift across the existing build-owned mirrors. Deterministic reducer/runtime/renderer/integration/browser coverage proves the changed Socratic backend/UI flow: no launch-time initial input, exact tutor-member address projection, READY-before-input, one input acceptance, ordered nonempty `TEXT_DELTA`, `TURN_COMPLETED`, no tool/thinking/provider rendering, separate successful `publish_artifacts` lifecycle, durable allowed-path transcript projection/notification refresh, and exactly-once cleanup. The coverage must exercise at least (a) live text/completion before durable refresh, (b) durable refresh before later live text/completion, (c) partial live text then durable refresh then completion, (d) interruption/error/close after durable success, and (e) live failure followed by later durable success. It must prove that live text is visibly presented while the turn is open, newly durable tutor rows are deferred only when necessary to avoid duplicate in-progress presentation, the durable row becomes authoritative at the join, state never regresses from saved, and no input is resent.

The same deterministic coverage must prove the sequential-turn admission matrix: double follow-up and hint-plus-follow-up attempts during `dispatching`, `awaiting_join`/streaming, completed-waiting-durable, durable-waiting-terminal, failed-waiting-durable, and `uncertain` are disabled in the renderer and rejected by the session before baseline reset or backend dispatch; a synchronous pre-admission validation failure leaves admission available; a saved join enables exactly one next claim when the connection remains active; request promise failure after claim remains acceptance-uncertain; and lesson close remains invocable, invalidates the handle, and prevents late callbacks or actions from sending.

One isolated serial live acceptance journey must then import/mount the generated Socratic Math Teacher application and execute the bounded problem `Solve 3x + 5 = 20` through the real Codex App Server model `gpt-5.6-sol` at `high` reasoning effort. It must retain evidence of the effective launch configuration, mounted application state, nonempty `TEXT_DELTA` accumulation, `TURN_COMPLETED`, successful durable lesson artifact, mathematically relevant Socratic behavior, and terminal cleanup without recording hidden reasoning, credentials, raw provider payloads, or tool internals. Missing live prerequisites are `Blocked` with the exact dependency; deterministic failures are not retried; at most one clean new-run retry is allowed only under the supplement's external-provider/qualitative policy. The API/E2E confidence score is recalculated for the expanded scope; `96.7%` is historical only.

### `AC-019` — Builder correctness, exports, and adoption

Focused backend-SDK tests prove all three builders return exact fresh address shapes, trim binding IDs, preserve the source binding, reject blank binding IDs, reject runtime-subject mismatches, trim a valid member route key, and reject blank/unknown member keys. Backend-SDK documentation shows their three precise uses, describes them as preferred when a precise binding is already owned, permits direct shared DTO construction without a binding fetch, and states that server authorization remains mandatory. Package/export and generated/vendor checks prove the functions are available from `@autobyteus/application-backend-sdk` and every checked-in built-in backend-SDK vendor mirror, including Brief Studio and Socratic Math Teacher, without adding a frontend execution/binding capability. Socratic deterministic coverage proves `tutorTargetAddress` is produced through `createApplicationAgentTeamMemberTargetAddress(binding, "tutor")`, remains `null` for an unusable/no binding, and still passes normal server authorization when connected. Existing follow-up/hint tests prove their bindingId-only whole-team `sendInput` DTOs and business behavior remain unchanged and do not trigger a new `agentExecution.get` solely for address construction.

## Scope Exclusions

- A reusable framework-owned chat/assistant component library or general rendering policy. The focused Socratic live-tutor region required by `REQ-018` is in scope.
- A generic chat/live-output accumulator or renderer. Applications may append the minimal `TEXT_DELTA` stream directly or use backend `subscribeEventStream(...)` plus an optional custom WebSocket for genuinely business-specific transformation; more vertical-application evidence is required before extraction.
- Framework-level single-flight enforcement or concurrent-turn correlation. The standard connection continues to allow distinct pending input requests; only the Socratic sample enforces its proven sequential experience through a private local admission guard.
- Thinking/reasoning, tool lifecycle/detail, token/compaction/status, team coordination/delegation, provider/native, segment-structure, or full-response events in application streaming v1. Future variants require a real product journey and an explicit closed-contract extension.
- A framework-owned binding-to-business-record correlation repository/protocol. Existing `launchRequestId` and `findByLaunchRequestId(...)` remain available; an optional storage-adapter abstraction is deferred until its cross-application shape is proven.
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
- After the previous framework implementation, source review, deterministic API/E2E Pass (`96.7%`), and proportional test review, the user expanded final acceptance on 2026-07-22: build/package-only Socratic evidence is insufficient; the real Socratic Math Teacher application must be tested with the requested Codex GPT-5.6 Sol model at high reasoning effort. That source integration was subsequently committed in `4732df357` with fixes in `6896bd413` and `e9c130a52`; the first real paid mounted journey was then executed and its projection failure evidence is retained. This expansion is captured in `BEH-011`, `UC-008`, `REQ-018`, `AC-018`, and [`socratic-math-live-journey.md`](./socratic-math-live-journey.md).
- On 2026-07-22 the user approved canonical target-address builders while deferring both a generic live-output accumulator and optional framework binding-to-business-record correlation support. The builders are now committed at `cee41e91788d97d98955c3d960f9d1e511d19eb0` and remain preserved current behavior.
- After the first real mounted Socratic/Codex execution proved that native output and durable business paths worked while the broad application projector exposed no text/completion, the user approved a simpler vertical-application stream: exact text deltas, minimal turn/error lifecycle, no thinking/tool/native/full-response surface, and a single extensible projector boundary. This approval revises `BEH-005`, `BEH-011`, `BEH-012`, `REQ-008`, `REQ-018`, `AC-008`, `AC-018`, and the normative communication/journey supplements.
- Architecture round 16 confirmed that simplified framework contract and the unordered live/durable join. The product-reachable mounted follow-up/hint re-entry path established the bounded Socratic-local sequential-turn admission requirement in `REQ-018`/`AC-018`; it does not change the standard connection's multi-request behavior or introduce framework correlation machinery.
