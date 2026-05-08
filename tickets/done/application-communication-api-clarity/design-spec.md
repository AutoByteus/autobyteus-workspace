# Design Spec

## Current-State Read

The current application communication architecture has healthy underlying boundaries, but the names and docs do not make those boundaries obvious enough.

Current app-facing paths:

- App frontend request/response: `client.query(...)`, `client.command(...)`, `client.graphql(...)`, and `client.route(...)` in `autobyteus-application-frontend-sdk/src/application-client.ts` call application backend gateway REST routes and then app backend handlers.
- App backend to app frontend live push: app backend calls `context.publishNotification(topic, payload)`, the application engine emits a worker notification, `ApplicationBackendGatewayService` republishes it through `ApplicationNotificationStreamService`, and subscribed frontends receive it through `/ws/applications/:applicationId/backend/notifications` / `client.subscribeNotifications(...)`.
- App backend to runtime: app backend calls `context.runtimeControl.*`; frontend APIs do not automatically go through runtime control.
- Runtime/platform to app backend: lifecycle events and artifacts reach app backend handlers (`eventHandlers.*`, `artifactHandlers.persisted`) through application orchestration/engine dispatch. Artifacts are not sent directly through the frontend notification stream.
- Runtime/platform to app frontend streaming: not implemented in this ticket; future runtime stream work should add a separate semantic API.

The primary current ambiguity is naming. `ApplicationNotificationStreamService` sounds like a broad application notification/event/streaming owner, but it only owns backend-published frontend notification fan-out. The websocket route already says `/backend/notifications`, which is more precise than the service name. This ticket should align code/docs with the actual owner and reserve future runtime streaming as a separate capability.

## Intended Change

Implement a small, clean-cut naming/refactor/docs improvement:

1. Add a canonical application communication model document that explains current communication mechanisms by direction, initiator, API surface, runtime-control involvement, live/durable semantics, and examples.
2. Rename the internal server notification stream owner from generic application notification stream wording to backend-notification wording.
3. Update imports, tests, and docs to the clarified name without changing runtime behavior.
4. Keep public app SDK method names (`publishNotification`, `subscribeNotifications`) unchanged for this ticket, but document them precisely as live backend-to-frontend notifications.
5. Explicitly state that runtime stream/conversation implementation is a future ticket and must not be hidden inside arbitrary notification topics.

Recommended internal target name:

```ts
ApplicationBackendNotificationStreamService
```

Recommended file path:

```text
autobyteus-server-ts/src/application-backend-gateway/streaming/application-backend-notification-stream-service.ts
```

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / Documentation / Naming Refactor.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue with Naming / Responsibility Ambiguity.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, small clean-cut internal rename plus docs.
- Evidence: The service `ApplicationNotificationStreamService` only fans out worker/app-backend notifications to subscribed app frontends, while artifact relay, runtime control, and future runtime streaming are different owners. The route `/ws/applications/:applicationId/backend/notifications` and `backendNotificationsUrl` already express the more precise backend-notification meaning.
- Design response: Rename the internal stream service to backend-notification wording, add a canonical communication model, and update docs/tests so each mechanism has one clearly described responsibility.
- Refactor rationale: Transport similarity should not define the boundary. Backend notifications and future runtime streams may both use websocket-like transport, but they have different initiators, identities, durability expectations, and message semantics.
- Intentional deferrals and residual risk, if any: Public SDK names remain unchanged. This leaves some naming ambiguity (`subscribeNotifications`) but avoids broad public API churn in a clarity ticket. The residual risk is mitigated through docs and internal naming. A future public API rename, if desired, should be a separate clean-cut SDK migration ticket.

## Terminology

- **Backend notification:** A live, non-durable app-backend-published topic/payload message delivered to currently subscribed app frontends.
- **Runtime control:** The backend-only app handler capability for starting, inspecting, inputting to, querying artifacts from, or terminating app-bound runtime executions.
- **Artifact relay:** Runtime/platform event delivery to the app backend `artifactHandlers.persisted` callback.
- **Runtime stream:** Future app-safe runtime/agent/team live output subscription. Out of scope for this ticket.
- **Public SDK surface:** App developer-facing APIs in application frontend/backend SDK contracts.
- **Internal service name:** Server implementation class/file/import names not intended as app developer API.

## Design Reading Order

Read this design as:

1. Preserve current behavior spines.
2. Clarify owner names and docs around those spines.
3. Rename the internal backend notification stream owner.
4. Update tests/docs/imports without adding runtime streaming behavior.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove/decommission the old internal `ApplicationNotificationStreamService` class/file/import name in this scope if the rename is implemented.
- No compatibility alias such as `export { ApplicationBackendNotificationStreamService as ApplicationNotificationStreamService }` should remain in steady state.
- Public SDK methods are not being replaced in this ticket; therefore no public compatibility wrapper is required.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | App backend `context.publishNotification(...)` | App frontend `client.subscribeNotifications(...)` listener | Application backend gateway backend-notification stream | This is the in-scope runtime behavior whose owner/name is being clarified. |
| DS-002 | Primary End-to-End | App frontend request API | App backend query/command/graphql/route handler result | Application backend gateway + application engine host | This must be documented as request/response and not confused with runtime control. |
| DS-003 | Primary End-to-End | App backend `context.runtimeControl.*` | App-bound runtime/orchestration effect | Application orchestration host service | This must remain backend-owned and separate from frontend transport. |
| DS-004 | Return-Event | Runtime artifact publication | App backend `artifactHandlers.persisted` | Application published artifact relay service | This must be documented as runtime/platform to backend, not direct frontend notification. |
| DS-005 | Documentation/Positioning | Future runtime output requirement | Future app runtime stream API slot | Future application runtime stream owner | This ticket only reserves the conceptual slot and prevents notification overloading. |

## Primary Execution Spine(s)

- DS-001 backend notification push: `App backend handler -> context.publishNotification -> ApplicationEngineHostService notification event -> ApplicationBackendGatewayService bridge -> ApplicationBackendNotificationStreamService -> /ws/applications/:applicationId/backend/notifications -> subscribed app frontend listener`
- DS-002 frontend request/response: `App frontend client -> backend gateway REST route -> ApplicationEngineHostService -> app backend worker handler -> response -> app frontend`
- DS-003 runtime control: `App backend handler -> context.runtimeControl.* -> ApplicationEngineHostService runtime-control dispatch -> ApplicationOrchestrationHostService -> app-bound agent/team runtime`
- DS-004 artifact relay: `Published artifact subsystem -> ARTIFACT_PERSISTED -> ApplicationPublishedArtifactRelayService -> ApplicationEngineHostService.invokeApplicationArtifactHandler -> app backend artifactHandlers.persisted`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A backend handler publishes an app-defined topic/payload. The platform fans it out live to currently connected app frontend websocket subscribers. | App backend handler, engine host notification bridge, backend notification stream service, frontend subscriber | Application backend gateway backend-notification stream | Websocket connection lifecycle, JSON envelope, application ID isolation. |
| DS-002 | A frontend calls a normal app API and receives a response from the backend handler. Runtime control is used only if the backend handler decides to call it. | Frontend SDK client, backend gateway route, engine host, worker handler | Application backend gateway + application engine host | Request context validation, error mapping, route normalization. |
| DS-003 | A backend handler controls an app-bound runtime through runtime control; orchestration validates bindings and delegates to agent/team runtime. | Backend handler, runtime control proxy, orchestration host, bound runtime | Application orchestration host service | Binding store, resource configuration, artifact query projection. |
| DS-004 | Runtime artifact persistence creates a backend artifact callback; the app may update state or optionally publish a frontend notification afterward. | Published artifact subsystem, artifact relay service, engine host, app artifact handler | Application published artifact relay service | Best-effort delivery, query reconciliation, idempotency by revision. |
| DS-005 | Future runtime stream work should get its own app-safe stream owner rather than using notification topics as a hidden runtime protocol. | Future runtime stream owner, frontend runtime stream subscription | Future design owner | Naming reservation only; no implementation in this ticket. |

## Spine Actors / Main-Line Nodes

- `ApplicationClient`: thin app frontend SDK facade for request/response and notification subscription.
- `ApplicationBackendGatewayService`: platform transport boundary for app backend calls and notification bridge.
- `ApplicationBackendNotificationStreamService` (target): internal fan-out owner for backend-published frontend notifications.
- `ApplicationEngineHostService`: worker/engine invocation and notification source boundary.
- `ApplicationHandlerContext`: app backend handler context that exposes `publishNotification` and `runtimeControl` as separate capabilities.
- `ApplicationOrchestrationHostService`: runtime-control governing owner.
- `ApplicationPublishedArtifactRelayService`: artifact relay governing owner.

## Ownership Map

| Node | Owns | Does Not Own |
| --- | --- | --- |
| `ApplicationClient` | Public frontend app API facade and request context attachment. | Backend notification semantics, runtime control authority, artifact relay. |
| `ApplicationBackendGatewayService` | Platform-facing backend transport boundary and worker-notification bridge. | Runtime binding semantics or artifact persistence truth. |
| `ApplicationBackendNotificationStreamService` | Live fan-out of backend-published notifications to connected frontend websocket clients by `applicationId`. | Artifact relay, runtime event streaming, durable notification replay, runtime conversation protocol. |
| `ApplicationHandlerContext.publishNotification` | Backend handler entrypoint to publish app-defined frontend notifications. | Runtime control or durable event journal writes. |
| `ApplicationHandlerContext.runtimeControl` | Backend handler entrypoint to application runtime-control operations. | Frontend websocket notification delivery. |
| `ApplicationPublishedArtifactRelayService` | Converting bound-run artifact persisted events into app backend artifact handler calls. | Frontend notification fan-out and artifact storage truth. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `client.subscribeNotifications(...)` | `ApplicationBackendNotificationStreamService` through frontend transport and websocket route | App frontend convenience API for subscribing to backend-published notifications. | Runtime stream protocol, artifact relay, replay/cursor semantics. |
| `context.publishNotification(...)` | Application engine host notification bridge + backend gateway stream | App backend convenience API for pushing app-defined messages to subscribed frontends. | Runtime control or event journal persistence. |
| `/ws/applications/:applicationId/backend/notifications` | `ApplicationBackendNotificationStreamService` | Stable transport route for backend notifications. | Generic runtime/agent/team streaming. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `ApplicationNotificationStreamService` internal class name | Too broad; implies generic application notification/stream ownership. | `ApplicationBackendNotificationStreamService` | In This Change | No compatibility alias in final code. |
| `application-notification-stream-service.ts` internal file path | Same naming ambiguity as class. | `application-backend-notification-stream-service.ts` | In This Change | Update all imports/tests. |
| Generic docs wording that says only “notification stream” without backend/frontend direction | Leaves ownership ambiguous. | Canonical communication model wording | In This Change | Keep public API names but explain semantics. |
| Any proposed runtime stream over arbitrary notification topics | Would conflate future runtime streaming with backend notifications. | Future dedicated runtime stream/conversation API | Follow-up | Explicitly out of scope here. |

## Return Or Event Spine(s) (If Applicable)

- Backend notification return/event spine is DS-001: app backend emits, frontend receives live if subscribed.
- Artifact return/event spine is DS-004: runtime emits artifact persisted, app backend receives handler callback; frontend is not directly involved unless app backend publishes a notification.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `ApplicationBackendNotificationStreamService`.
  - Local spine: `connect(applicationId, connection) -> store connection by ID -> publish(notification) -> filter by applicationId -> send envelope -> disconnect failed/closed connections`.
  - Why it matters: this is the only behavior being renamed; it should remain mechanically unchanged.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Documentation communication matrix | DS-001 to DS-005 | All app communication owners | Teach direction, initiator, runtime-control involvement, durability, examples. | Prevents future boundary confusion. | Without it, developers infer semantics from misleading names. |
| Tests/import updates | DS-001 | Backend notification stream owner | Keep test coverage after class/file rename. | Ensures rename does not hide behavior regression. | Runtime behavior could accidentally change under a naming ticket. |
| First-party app docs/comments | DS-001, DS-004 | App examples | Clarify notifications as refresh/status hints. | Makes examples teach the right mental model. | Apps may look like runtime stream examples. |
| Future runtime stream positioning note | DS-005 | Future runtime stream owner | Reserve separate conceptual slot. | Prevents notification-topic overloading. | Notification stream becomes a hidden runtime protocol. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Backend notification fan-out | `application-backend-gateway/streaming` | Extend/Rename | Correct existing owner; only name is too broad. | N/A |
| Communication model docs | Existing module docs under `autobyteus-server-ts/docs/modules` | Create New Doc + Cross-link | One canonical table avoids duplication across gateway/orchestration docs. | Existing individual docs each cover only one slice. |
| Artifact relay explanation | `application_orchestration.md` | Reuse/Cross-link | Existing artifact section is accurate. | N/A |
| Runtime stream implementation | None in this ticket | Defer | Future capability has different semantics. | Out of scope. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Application backend gateway | Frontend-to-backend transport and backend notification websocket fan-out | DS-001, DS-002 | `ApplicationBackendGatewayService`, `ApplicationBackendNotificationStreamService` | Extend/Rename | Rename stream owner internally. |
| Application engine | Worker invocation and backend handler context | DS-001, DS-002, DS-003, DS-004 | `ApplicationEngineHostService`, worker runtime | Reuse | No behavior change. |
| Application orchestration | Runtime control and artifact query/binding validation | DS-003 | `ApplicationOrchestrationHostService` | Reuse | Documentation only. |
| Published artifact relay | Runtime artifact event to app backend handler | DS-004 | `ApplicationPublishedArtifactRelayService` | Reuse | Documentation only. |
| Module documentation | Canonical communication model | DS-001 to DS-005 | Maintainers and app developers | Create New | Add cross-links from existing docs. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `application-backend-notification-stream-service.ts` | Application backend gateway | Backend notification stream owner | Websocket connection registry and live notification fan-out by `applicationId`. | One focused stream concern. | `ApplicationNotificationMessage` public type. |
| `application-backend-gateway-service.ts` | Application backend gateway | Gateway service | Bridge engine notifications into backend notification stream service. | Existing gateway orchestration point. | N/A |
| `application-backend-notifications.ts` | API websocket routes | Websocket route | Connect/disconnect websocket clients to backend notification stream service. | Transport entrypoint remains route-focused. | N/A |
| `application_communication_model.md` | Module docs | Canonical documentation | Communication matrix and examples. | One canonical model avoids drift. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Communication matrix concepts | `application_communication_model.md` | Docs | Shared explanatory source linked by module docs. | Yes | Yes | A second implementation contract. |
| Notification websocket envelope | Existing stream service local types | Backend notification stream | Keep local unless reused elsewhere. | Yes | Yes | Generic runtime stream envelope. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ApplicationNotificationMessage` | Yes for current public API: `applicationId`, `topic`, `payload`, `publishedAt`. | Yes | Medium due to broad type name | Keep public name for this ticket; docs define as backend-published frontend notification. |
| Stream server message envelope | Yes: connection acknowledgement or notification. | Yes | Low | Rename local type to backend-notification wording if needed. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-backend-gateway/streaming/application-backend-notification-stream-service.ts` | Application backend gateway | `ApplicationBackendNotificationStreamService` | Live backend notification websocket fan-out by application ID. | Focused internal owner; name matches route semantics. | `ApplicationNotificationMessage`. |
| `autobyteus-server-ts/src/application-backend-gateway/services/application-backend-gateway-service.ts` | Application backend gateway | Gateway service | Bridge app worker notifications to backend notification stream service. | Existing service coordinates backend gateway edges. | N/A |
| `autobyteus-server-ts/src/api/websocket/application-backend-notifications.ts` | API websocket | Route entrypoint | Adapt websocket clients to backend notification stream service. | Route file remains transport-only. | N/A |
| `autobyteus-server-ts/docs/modules/application_communication_model.md` | Docs | Canonical communication model | Explain all app communication mechanisms and future runtime stream slot. | Avoids scattering the model across several docs. | N/A |
| `autobyteus-server-ts/docs/modules/application_backend_gateway.md` | Docs | Gateway docs | Update stream service name and link canonical model. | Keeps gateway docs accurate. | N/A |
| `autobyteus-server-ts/docs/modules/application_orchestration.md` | Docs | Orchestration docs | Cross-link communication model from artifact relay/runtime-control sections. | Prevents artifact/notification confusion. | N/A |
| SDK/app README/docs touched by implementation | Docs | App developer docs | Clarify `publishNotification`/`subscribeNotifications` semantics. | Public API semantics live near SDK usage. | N/A |
| Existing backend notification stream tests | Tests | Behavior verification | Update import/class names while preserving coverage. | Confirms no behavior change. | N/A |

## Ownership Boundaries

The authoritative boundary for backend-published frontend notifications is the application backend gateway. App backend code does not manage websocket connections; it calls `context.publishNotification`. App frontend code does not talk to app worker internals; it calls `client.subscribeNotifications`.

The authoritative boundary for runtime control remains application orchestration through `context.runtimeControl.*`. The backend notification stream must not grow runtime binding validation or runtime stream message lifecycle concerns.

The authoritative boundary for artifact relay remains `ApplicationPublishedArtifactRelayService`; backend notifications are optional downstream UI hints after app backend artifact handling.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `context.publishNotification` | Engine notification dispatch + backend gateway stream fan-out | App backend handlers | App backend opening/managing platform websocket clients directly | Strengthen notification API/docs. |
| `client.subscribeNotifications` | `backendNotificationsUrl`, websocket adapter, stream envelopes | App frontend code | App frontend importing server stream classes or worker internals | Strengthen frontend SDK docs/types. |
| `context.runtimeControl.*` | Application engine runtime-control dispatch + orchestration host | App backend handlers | Frontend calling raw runtime/team websocket for app-bound runtime input | Add explicit future runtime APIs; do not overload notifications. |
| `artifactHandlers.persisted` | Published artifact relay + engine handler invocation | App backend artifact logic | Artifact subsystem pushing directly to frontend notification websocket | Keep artifact relay backend-owned; app decides frontend notification. |

## Dependency Rules

- `application-backend-gateway-service.ts` may depend on `ApplicationBackendNotificationStreamService`.
- `application-backend-notifications.ts` may adapt websocket connections to `ApplicationBackendNotificationStreamService`.
- App SDK public types may remain `ApplicationNotificationMessage` / `subscribeNotifications` / `publishNotification` for this ticket.
- Backend notification stream code must not depend on generic agent/team stream services.
- Backend notification stream code must not depend on artifact relay internals.
- Artifact relay must not publish directly to frontend notification streams; it invokes app backend handlers.
- Runtime stream implementation must not be added to notification topics in this ticket.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `client.query/command/graphql/route` | App backend request/response | Frontend asks backend for app work. | `applicationId` request context from host. | Runtime control only if handler calls it. |
| `client.subscribeNotifications` | Backend-published frontend notifications | Frontend subscribes to live backend notifications. | `applicationId` from host transport. | Public name unchanged. |
| `context.publishNotification` | Backend-published frontend notifications | Backend publishes app-defined topic/payload. | `applicationId` implicit in handler context; topic string. | Live fan-out only. |
| `context.runtimeControl.*` | App-bound runtime control | Backend controls runtime resources. | Binding/run/resource identities per existing contracts. | Separate from notification stream. |
| `artifactHandlers.persisted` | App backend artifact handling | Backend reacts to artifact event. | `ApplicationPublishedArtifactEvent`. | Optional notification afterward is app-owned. |
| Future `subscribeRuntimeStream` / similar | Future runtime stream | Out of scope; live runtime output. | Future app-safe runtime identity. | Must be separate from notifications. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `client.subscribeNotifications` | Yes | Yes | Medium because name is broad | Document as backend-published notifications; no public rename here. |
| `context.publishNotification` | Yes | Yes | Low | Document live/non-durable semantics. |
| `ApplicationBackendNotificationStreamService` | Yes | Yes | Low | Rename internal owner to match responsibility. |
| `context.runtimeControl.*` | Yes | Existing contracts explicit | Low | Docs clarify it is backend-only capability. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Backend notification stream service | `ApplicationNotificationStreamService` -> `ApplicationBackendNotificationStreamService` | Proposed: Yes | Current: High | Rename internal service/file/imports. |
| Public frontend subscription | `subscribeNotifications` | Partially | Medium | Keep public name, explain as backend-published notifications. |
| Public backend publisher | `publishNotification` | Mostly | Low | Docs state backend-to-frontend live push. |
| Future runtime stream | Not implemented | N/A | High if named as notification topics | Reserve separate future API slot. |

## Applied Patterns (If Any)

- **Clean-cut internal rename:** Replace the internal class/file/import name directly; do not keep alias wrappers.
- **Canonical documentation page:** One communication model doc with cross-links, instead of repeating partial explanations across module docs.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-backend-gateway/streaming/` | Folder | Backend gateway streaming concerns | Contains backend gateway websocket stream services. | Existing correct folder for notification fan-out. | Runtime/agent stream protocol owners. |
| `.../application-backend-notification-stream-service.ts` | File | Backend notification stream | Connection registry and fan-out for backend-published notifications. | More precise replacement for old file. | Artifact relay, runtime stream deltas. |
| `autobyteus-server-ts/docs/modules/application_communication_model.md` | File | Docs | Canonical communication matrix and examples. | Existing module docs location. | Implementation details not relevant to app developers. |
| Existing gateway/orchestration/docs README files | Files | Docs | Cross-link and update renamed service references. | Keeps existing docs discoverable. | Duplicate full matrix if it can drift. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `application-backend-gateway/streaming` | Transport | Yes | Low | Keep stream fan-out transport here; do not move to orchestration. |
| `application-orchestration/services` | Main-Line Domain-Control | Yes | Low | Artifact relay/runtime-control docs only; no notification stream code moves here. |
| `docs/modules` | Documentation | Yes | Medium | Avoid duplicate matrices by adding one canonical doc and cross-links. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Backend notification | `context.publishNotification("brief.created", payload)` -> active `client.subscribeNotifications(...)` listener receives it. | Treating it as durable artifact/event replay. | Clarifies live, optional frontend push. |
| Runtime control | `client.command("startRun")` -> backend handler calls `context.runtimeControl.startRun(...)`. | Saying `client.command(...)` itself goes through runtime control. | Clarifies initiator and boundary. |
| Artifact relay | `ARTIFACT_PERSISTED` -> `artifactHandlers.persisted(event, context)` -> optional `publishNotification`. | Artifact subsystem directly using frontend notification stream. | Preserves app backend domain ownership. |
| Future runtime stream | Future `client.subscribeRuntimeStream({ bindingId })`. | `subscribeNotifications("runtime.message.delta")`. | Prevents notification topics from becoming hidden runtime protocol. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `ApplicationNotificationStreamService` alias after internal rename | Could reduce import churn. | Rejected | Update imports/tests to `ApplicationBackendNotificationStreamService`; remove old internal name. |
| Add public `subscribeBackendNotifications` while keeping `subscribeNotifications` | Could make public API clearer. | Rejected for this ticket | Public rename is a separate SDK migration decision; this ticket documents current public names. |
| Implement runtime stream over notification topics | Could be fastest future streaming path. | Rejected | Future runtime streaming must use a distinct app-safe runtime stream/conversation boundary. |

## Derived Layering (If Useful)

Layering remains unchanged:

- Frontend SDK facade and hosted transport.
- Server API/gateway transport boundary.
- Application engine worker boundary.
- Application orchestration/runtime control.
- Runtime/artifact subsystems.

This ticket changes names/docs at the gateway/documentation layer only.

## Migration / Refactor Sequence

1. Add `autobyteus-server-ts/docs/modules/application_communication_model.md` with the communication matrix, examples, and future runtime stream positioning note.
2. Cross-link the canonical doc from:
   - `autobyteus-server-ts/docs/modules/README.md`
   - `autobyteus-server-ts/docs/modules/application_backend_gateway.md`
   - `autobyteus-server-ts/docs/modules/application_orchestration.md`
   - relevant SDK README/docs if present.
3. Rename `autobyteus-server-ts/src/application-backend-gateway/streaming/application-notification-stream-service.ts` to `application-backend-notification-stream-service.ts`.
4. Rename exported internal class/factory/local types to backend-notification wording, for example:
   - `ApplicationNotificationStreamService` -> `ApplicationBackendNotificationStreamService`
   - `getApplicationNotificationStreamService` -> `getApplicationBackendNotificationStreamService`
   - local stream message/connection types to backend-notification wording if exported or visible in tests.
5. Update all imports and dependency names in server gateway, websocket route, and tests.
6. Update docs/examples/comments that refer to the old internal service name or vague “notification stream” wording.
7. Run focused checks for touched packages/tests. At minimum, run TypeScript/test checks covering application backend gateway websocket notifications and first-party app notification integration if available.
8. Verify no old internal service name remains except in historical ticket notes or explicit migration text.

## Key Tradeoffs

- **Internal rename now, public rename deferred:** This improves maintainability with limited blast radius. Public SDK naming remains mildly broad, but docs reduce confusion.
- **One canonical doc instead of scattered explanations:** Reduces drift but requires downstream docs to link rather than duplicate.
- **No runtime stream implementation:** Keeps ticket small and prevents premature API design before the runtime streaming ticket is approved.

## Risks

- Generated/vendor app packages may reference old names indirectly through generated SDK outputs. Implementation should regenerate according to repo conventions rather than hand-edit generated artifacts where possible.
- Some tests may import the old internal class directly. All such imports must be updated with behavior preserved.
- If docs overstate future runtime stream names, they may constrain the later streaming design. Use examples like `subscribeRuntimeStream` as illustrative, not final API commitment.
- If public SDK names remain unchanged without enough docs, some user confusion may persist.

## Guidance For Implementation

- Keep behavior mechanically identical for backend notifications. This ticket is not allowed to change delivery semantics.
- Do not add replay, durability, runtime stream deltas, binding IDs, or artifact-specific logic to the backend notification stream service.
- Prefer search-driven rename with focused tests:
  - `rg "ApplicationNotificationStreamService|getApplicationNotificationStreamService|application-notification-stream-service|notificationStreamService"`
  - update all current imports/usages.
- Use the route wording `/backend/notifications` as the semantic anchor.
- Add documentation that explicitly answers:
  - Who calls this API?
  - Which direction does data flow?
  - Does it go through `runtimeControl`?
  - Is it live or durable?
  - What should a future runtime stream use instead?
