# Application-Owned Runtime Orchestration Design

## Current-State Read

The current architecture organizes launched applications around `applicationSession` as the durable governing owner. That single concept currently owns too many different responsibilities at once:

- page launch identity,
- live runtime identity,
- active-session replacement,
- retained platform projection of runtime artifacts,
- route reattachment,
- session streaming,
- publication/event routing, and
- the assumption that one launched application implies one launched run.

The current primary execution path is effectively:

`Browser Route -> ApplicationShell/ApplicationSessionStore -> createApplicationSession -> ApplicationSessionService -> AgentRunService / TeamRunService -> ApplicationSessionStateStore -> Iframe Bootstrap`

The current publication return path is:

`Runtime -> publish_artifact -> applicationSessionContext -> ApplicationPublicationService -> session projection + journal -> ApplicationEngine event handler -> app backend`

Current ownership and coupling problems:

1. **Bundle contract overload**
   - `application.json` still requires one singular `runtimeTarget`.
   - The application catalog therefore encodes one launch-time worker identity for every application.

2. **Launch/runtime collapse**
   - `ApplicationSessionService.createApplicationSession(...)` immediately launches one agent or team run.
   - The application page becomes fully usable only after that worker run exists.

3. **Singular live-session enforcement**
   - `ApplicationSessionStateStore.persistLiveSession(...)` clears any prior active session for the same application.
   - This enforces one live launched session per app and therefore one governing run per app page.

4. **Frontend host owns run launch policy**
   - The generic host prepares low-level launch config from the bundle `runtimeTarget` and shows a platform-owned launch modal.
   - That means the host, not the application backend, currently owns part of orchestration policy.

5. **Contracts/SDKs propagate the old model**
   - Shared contracts expose `runtimeTarget`, `applicationSessionId`, and session lifecycle handler keys.
   - Iframe bootstrap v1 requires a launched `applicationSessionId` plus runtime identity.
   - Frontend SDK request context defaults to `applicationSessionId`-aware identity.

6. **Platform competes with app-owned projection**
   - The session subsystem retains artifact-centric member projections in platform state and streams them back to the frontend host.
   - That is useful for the old demo path, but it competes with the new model where the application backend must own domain projection and business-state meaning.

7. **Publication routing is session-bound**
   - `publish_artifact` resolves ownership from injected `applicationSessionContext`.
   - The publication model is therefore not naturally compatible with one application-defined business context owning many runs over time.

8. **Restart ownership is incomplete in the current system too**
   - Current server startup has an explicit resume owner for publication dispatch (`resumePendingDispatches()`), but there is no equivalent owner for app-owned orchestration bindings because that subsystem does not yet exist.

9. **Lifecycle observation is asymmetric**
   - Agent execution exposes create/resolve/terminate and run event streams at the run object level.
   - Team execution additionally has a manager-level team-event subscription shape.
   - There is no unified authoritative lifecycle-notification boundary that a new orchestration subsystem can depend on safely for both run kinds.

10. **Good current foundations still exist**
   - `application-engine` already owns application backend worker lifecycle cleanly.
   - `application-backend-gateway` is already keyed by `applicationId`.
   - `agent-run-service` and `team-run-service` already own concrete execution resources.
   - durable at-least-once app-event dispatch is already the right shape.

11. **Current sample apps still under-teach the target app model**
   - Brief Studio is deeper than the minimal sample, but it still teaches query/command-heavy UI flow and session-derived business identity.
   - Socratic Math Teacher is intentionally shallow and does not teach a real business API or reusable run-binding pattern.
   - Neither sample currently teaches app-owned GraphQL schema/codegen over the hosted backend mount.

Constraints the target design must respect:

- reuse `application-engine`, `application-backend-gateway`, `application-storage`, `agent-run-service`, and `team-run-service` where they already fit,
- move to a clean-cut target instead of compatibility wrappers,
- allow application backends to orchestrate bundle-local and shared platform resources,
- keep application business meaning out of platform orchestration infrastructure,
- preserve durable event delivery and restart-safe ownership.

## Intended Change

Replace the session-owned model with an **engine-first, application-owned orchestration model**:

- opening an application launches the application host/runtime only,
- the generic host ensures the application backend worker is ready and then boots the iframe,
- iframe bootstrap v2 exposes one authoritative hosted `backendBaseUrl` plus only the non-derivable transport channels,
- no worker run is auto-created just because the application page was opened,
- the application backend receives a new authoritative `runtimeControl` boundary in handler/lifecycle context,
- the application backend creates runs explicitly and binds them to an opaque app-defined `executionRef`,
- the platform persists those bindings as durable platform-owned records,
- the platform keeps GraphQL/routes/query/command transport generic under the hosted backend mount,
- each application owns its own business API/schema and generated frontend/backend client story,
- a dedicated recovery owner resumes those bindings on server restart,
- runtime outputs route back by binding/execution context rather than by `applicationSessionId`, and
- the app backend remains the owner of projecting those events into business state.

This is a clean-cut target.
`applicationSession` does **not** survive as a durable governing owner in the new architecture.
The only thin launch-specific identity that remains is the browser/iframe `launchInstanceId`, which is an ephemeral bootstrap correlation token, not a persisted runtime/business owner.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.
- `executionRef`: opaque application-defined identifier for one business-owned orchestration context. The platform stores it but does not interpret its business meaning.
- `run binding`: durable platform-owned record that binds one `executionRef` to one concrete run and one concrete runtime resource reference.
- `resource ref`: platform-neutral selector for a runtime resource, either bundle-owned/local or shared-platform.
- `launchInstanceId`: ephemeral host/iframe bootstrap identity for one browser launch. Not a durable orchestration owner.
- `execution event ingress`: the single authoritative platform boundary that accepts runtime-originated artifact events and platform-originated run lifecycle events, normalizes them, and appends them to the immutable app-event journal.
- `nonterminal binding`: a run binding still expected to have a live or recoverable runtime attachment after restart.
- `virtual backend mount`: the application-scoped hosted backend namespace under `applicationId` that the platform routes and hosts, even though the application backend does not run its own standalone HTTP server.
- `app-owned business API schema`: the application’s own GraphQL schema, route/OpenAPI contract, shared DTO package, or equivalent business-API contract. This belongs to the application, not to the platform.
- `schema artifact`: one application-owned build artifact such as GraphQL SDL, introspection JSON, OpenAPI document, or generated frontend client/types used for app-owned code generation.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Architecture Review Rework Coverage

| Finding ID | Rework Applied | Authoritative Design Sections |
| --- | --- | --- |
| `AOR-DI-001` | Added an explicit restart recovery spine, startup owner, authoritative-vs-derived store split, eager recovery policy, lookup-index rebuild rules, and dispatch-resume ordering | `DS-007`, `Restart Recovery / Resume Contract`, `Ownership Map`, `Boundary Encapsulation Map`, `Migration / Refactor Sequence` |
| `AOR-DI-002` | Defined a shared orchestration-facing lifecycle event shape, service-level observation methods on both execution owners, exact manager/service extension points, and a single orchestration-side lifecycle gateway | `Lifecycle Observation Contract`, `Existing Capability / Subsystem Reuse Check`, `Draft File Responsibility Mapping`, `Final File Responsibility Mapping`, `Interface Boundary Mapping` |
| `AOR-DI-003` | Collapsed artifact publication and lifecycle-event journaling behind one owner: `ApplicationExecutionEventIngressService`; removed split authority from the orchestration host | `Data-Flow Spine Inventory`, `Ownership Map`, `Thin Entry Facades`, `Execution Event Ingress Authority`, `Dependency Rules`, `Boundary Encapsulation Map` |
| `AOR-DI-004` | Added an explicit startup-admission gate that serializes runtime-control and live artifact ingress against recovery-time lookup rebuild and observer reattachment, independent of raw `app.listen(...)` timing | `DS-007`, `Startup Coordination / Traffic Admission Contract`, `Boundary Encapsulation Map`, `Dependency Rules`, `Migration / Refactor Sequence`, `server-runtime.ts` ownership notes |

## App-Owned Business API / Schema Principle

The platform owns **hosting, routing, worker lifecycle, orchestration, and durable event delivery**.
Each application owns **its business API schema, its own generated frontend/backend business types, and the application-specific developer workflow around those artifacts**.

That means:

- the platform hosts one **virtual backend mount** per `applicationId`,
- the authoritative frontend transport hint is one hosted `backendBaseUrl` under that mount,
- the application remains free to expose GraphQL, routes, queries/commands, or a mix of those surfaces,
- the platform may offer schema-agnostic transport helpers around that mount, but those helpers must stay generic,
- the platform must not synthesize one universal business-schema layer for ticket, brief, lesson, repository, or other app-specific subjects,
- app-owned GraphQL schemas remain the app’s own GraphQL schemas,
- app-owned route/OpenAPI contracts remain the app’s own route contracts,
- app-owned shared DTO packages remain app-owned when an app prefers that model, and
- frontend type/code generation happens in the app’s own build from app-owned schema artifacts or shared app-owned contracts.

Queries/commands may remain as convenient app-facing backend surfaces, but they are not the only “real application” story in the target architecture.
GraphQL-backed and route-backed applications remain first-class.

## Hosted Virtual Backend Mount Contract

The authoritative hosted backend namespace is:

`/rest/applications/:applicationId/backend`

Derived surfaces under that mount are:

- `/graphql`
- `/routes/*`
- `/queries/:queryName`
- `/commands/:commandName`
- `/status`
- `/notifications` (or the transport-specific equivalent if notifications stay on WS)

Rules:

- `applicationId` in the mounted route is authoritative for application identity.
- `ApplicationRequestContext` v2 stays about request source only: `{ applicationId, launchInstanceId? }`.
- App-specific GraphQL documents, route DTOs, and mutation/query payloads stay opaque to the platform gateway.
- The app worker never opens its own HTTP server or socket listener.
- The iframe/bootstrap contract should provide one authoritative `backendBaseUrl` plus any non-derivable channel URLs such as notifications; GraphQL/routes/query/command URLs derive from that base instead of becoming parallel sources of truth.

## Application Build / Schema-Codegen Lifecycle

The target authoring/build lifecycle for one application is:

1. The application authors its own business API contract:
   - GraphQL SDL/introspection,
   - route/OpenAPI contract, or
   - shared app-owned DTO package.
2. The application generates frontend-usable client/types from that app-owned contract inside the app workspace.
3. The application builds its frontend bundle against those generated client/types.
4. The application builds its backend bundle with the matching resolver/handler implementation.
5. The packaged runnable app ships compiled frontend/backend artifacts; optional schema artifacts may be packaged for docs or tooling, but the platform runtime does not need to centralize or reinterpret them.

The platform’s role is therefore:

- host the compiled app frontend/backend,
- expose the app-scoped backend mount,
- carry request-context/runtime-control infrastructure, and
- stay out of app-specific business-schema ownership.

## Example App Upgrade Direction

The in-repo sample apps should teach two complementary “real app” patterns:

| App | Business API Teaching Goal | Proposed Primary GraphQL Surface | Orchestration Teaching Pattern |
| --- | --- | --- | --- |
| `brief-studio` | GraphQL-backed business API over durable brief records plus review workflow | Queries: `briefs`, `brief(briefId)`, `briefExecutions(briefId)`; Mutations: `createBrief`, `launchDraftRun`, `approveBrief`, `rejectBrief`, `addReviewNote` | One `briefId` / `executionRef` may create many bindings over time; artifacts project back into the same brief record |
| `socratic-math-teacher` | GraphQL-backed lesson/session API over repeated tutor interaction | Queries: `lessons`, `lesson(lessonId)`; Mutations: `startLesson`, `askFollowUp`, `requestHint`, `closeLesson` | One `lessonId` / `executionRef` typically owns one long-lived bound team run; later mutations reuse that binding via `runtimeControl.postRunInput(...)` |

Rules for those samples:

- their UI should use generated app-owned GraphQL clients as the primary business API path,
- their backend GraphQL resolvers should remain the owner of `runtimeControl` usage,
- Brief Studio should teach the “many runs over one business record” pattern, and
- Socratic Math Teacher should teach the “one long-lived conversational binding with repeated follow-up input” pattern.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: identify obsolete legacy paths/files included in this scope.
- Treat removal as first-class design work: when clearer subsystem ownership, reusable owned structures, or tighter file responsibilities make fragmented or duplicated pieces unnecessary, name and remove/decommission them in scope.
- Decision rule: the design is invalid if it depends on compatibility wrappers, dual-path behavior, or legacy fallback branches kept only for old behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | `Primary End-to-End` | Browser application route | Iframe app bootstrap with ready backend engine plus hosted backend mount descriptor | `ApplicationHostLaunchOwner` | Separates application launch from worker-run creation and gives the iframe one authoritative backend mount |
| `DS-002` | `Primary End-to-End` | Iframe app UI / app backend command | Concrete agent/team run creation plus durable binding | `ApplicationOrchestrationHostService` | Main application-owned run-creation path |
| `DS-003` | `Return-Event` | Runtime-originated `publish_artifact` | App backend artifact event handler delivery | `ApplicationExecutionEventIngressService` | Routes runtime artifacts back to the correct app-owned context through one authoritative ingress boundary |
| `DS-004` | `Return-Event` | Underlying run lifecycle change | App backend lifecycle event delivery | `ApplicationRunObserverService` | Keeps binding state and app event history correct when runs end, fail, or are superseded |
| `DS-005` | `Bounded Local` | Per-application event journal | Event-handler ack / retry loop | `ApplicationExecutionEventDispatchService` | Preserves ordered at-least-once app-event delivery |
| `DS-006` | `Bounded Local` | Worker-side `runtimeControl` call | Host-side orchestration response | `ApplicationRuntimeControlBridge` | Makes app-owned orchestration available inside the backend worker without boundary bypass |
| `DS-007` | `Primary End-to-End` | Server startup | Orchestration gate released with recovered bindings, rebuilt lookup index, reattached observers, and dispatch resumed | `ApplicationOrchestrationStartupGate` | Makes restart-safe ownership real and prevents live-traffic races during startup |
| `DS-008` | `Primary End-to-End` | Iframe app business request | App-owned business result returned through the hosted backend mount | `ApplicationBackendGatewayService` | Keeps platform transport generic while each application owns its own GraphQL/routes/query schema and generated clients |

## Primary Execution Spine(s)

- `DS-001`: `Browser Route -> ApplicationShell / ApplicationHostStore -> ApplicationBackendGateway ensure-ready -> ApplicationEngineHost -> ApplicationSurface -> Iframe App with backend mount descriptor`
- `DS-002`: `Iframe App UI -> App Backend Gateway -> ApplicationEngine Worker -> App Backend Handler -> runtimeControl Bridge -> ApplicationOrchestrationHostService -> AgentRunService / TeamRunService -> Concrete Run`
- `DS-007`: `Server Startup -> ApplicationOrchestrationStartupGate -> ApplicationOrchestrationRecoveryService -> ApplicationRunBindingStore -> ApplicationRunLookupStore rebuild -> ApplicationBoundRunLifecycleGateway -> ApplicationRunObserverService -> ApplicationExecutionEventDispatchService resume -> StartupGate READY`
- `DS-008`: `Iframe App UI / generated client -> ApplicationBackendGateway virtual mount -> ApplicationEngineHost -> App Backend Handler -> App-Owned Business Result`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | Opening an application page starts the application backend worker and boots the iframe without creating a run. The browser launch is now “application available” rather than “run already created,” and the iframe receives one authoritative backend mount descriptor instead of session-owned runtime identity. | `ApplicationShell`, `ApplicationBackendGateway`, `ApplicationEngineHost`, `ApplicationSurface` | `ApplicationHostLaunchOwner` in the web host, backed by `ApplicationEngineHostService` | iframe launch descriptor, backend ensure-ready endpoint, bootstrap contract v2, backend mount transport descriptor |
| `DS-002` | The app UI calls its own backend. The app backend decides to start work, chooses a resource ref plus `executionRef`, and calls the worker-side `runtimeControl`. The orchestration host resolves the resource, creates the run, persists the binding, indexes the run, attaches lifecycle observation, and then records the resulting runtime lifecycle event through the execution-event ingress boundary. | `App Backend Handler`, `ApplicationRuntimeControlBridge`, `ApplicationOrchestrationHostService`, `AgentRunService/TeamRunService`, `ApplicationRunObserverService` | `ApplicationOrchestrationHostService` | resource resolution, binding store, derived lookup index, lifecycle gateway, execution-event ingress |
| `DS-003` | A bound runtime publishes an artifact. The platform uses injected execution context to resolve the binding, appends a normalized immutable event journal row through the execution-event ingress owner, and dispatches the event into the app backend. The application backend then projects that event into business state. | `publish_artifact`, `ApplicationExecutionEventIngressService`, `ApplicationExecutionEventDispatchService`, `ApplicationEngineHost`, `App Event Handler` | `ApplicationExecutionEventIngressService` | derived lookup index, binding store, retry policy, producer provenance extraction |
| `DS-004` | When a run terminates, fails, or is superseded, the run observer receives a normalized lifecycle signal through the lifecycle gateway, updates the binding, records the lifecycle event through the execution-event ingress owner, and relies on the dispatch loop to deliver that event back into the app backend. | `ApplicationBoundRunLifecycleGateway`, `ApplicationRunObserverService`, `ApplicationRunBindingStore`, `ApplicationExecutionEventIngressService`, `Dispatch Service` | `ApplicationRunObserverService` | lifecycle gateway adapter, derived lookup index maintenance, immutable event ingress |
| `DS-005` | For each application, the journal drains in order, calls the app event handler through the engine boundary, and retries with backoff until acknowledged. | `Event Journal`, `Dispatch Loop`, `ApplicationEngineHost` | `ApplicationExecutionEventDispatchService` | retry timer, ack cursor, startup resume hook |
| `DS-006` | Inside the worker, app backend code sees one authoritative `runtimeControl` API instead of raw host services. Calls cross the worker/host bridge and land in the orchestration owner. | `ApplicationHandlerContext.runtimeControl`, `ApplicationRuntimeControlClient`, `ApplicationRuntimeControlHost`, `ApplicationOrchestrationHostService` | `ApplicationRuntimeControlBridge` | IPC protocol messages, request/response normalization |
| `DS-007` | On server startup, `server-runtime` enters the orchestration startup gate. While that gate remains closed, live runtime-control calls and runtime-originated artifact publications cannot proceed. Inside that exclusive startup window, orchestration recovery scans authoritative per-app binding stores, rebuilds the derived global run lookup index, eagerly resolves/restores every nonterminal bound run, reattaches lifecycle observers, marks unrecoverable bindings as orphaned, records those lifecycle events through the execution-event ingress owner, resumes the journal-dispatch loop, and only then releases the gate to steady-state ready. | `ServerRuntime`, `ApplicationOrchestrationStartupGate`, `ApplicationOrchestrationRecoveryService`, `ApplicationRunBindingStore`, `ApplicationRunLookupStore`, `ApplicationBoundRunLifecycleGateway`, `ApplicationRunObserverService`, `ApplicationExecutionEventIngressService`, `ApplicationExecutionEventDispatchService` | `ApplicationOrchestrationStartupGate` | bundle enumeration, global storage bootstrap, observer registration, recovery failure marking |
| `DS-008` | The iframe calls one application-owned business API surface through the hosted backend mount, typically through an app-generated GraphQL or route client. The backend gateway routes by `applicationId`, ensures the worker is ready, forwards the request into the app backend handler, and returns an application-defined result. The platform owns transport and hosting; the application owns the business schema of that request and response. | `Iframe App`, `ApplicationBackendGatewayService`, `ApplicationEngineHostService`, `App Backend Handler` | `ApplicationBackendGatewayService` | app-owned schema artifacts, generated frontend client/types, backend mount transport descriptor, request-context normalization |

## Spine Actors / Main-Line Nodes

- `ApplicationHostLaunchOwner` (web host side)
- `ApplicationBackendGatewayService`
- `ApplicationEngineHostService`
- `ApplicationBackend` (worker-side app definition handlers)
- `ApplicationRuntimeControlBridge`
- `ApplicationOrchestrationStartupGate`
- `ApplicationOrchestrationHostService`
- `ApplicationBoundRunLifecycleGateway`
- `ApplicationRunObserverService`
- `ApplicationExecutionEventIngressService`
- `ApplicationExecutionEventDispatchService`
- `ApplicationOrchestrationRecoveryService`
- `AgentRunService`
- `TeamRunService`

## Ownership Map

- `ApplicationHostLaunchOwner`
  - owns browser launch readiness for the generic host
  - owns iframe launch descriptor and `launchInstanceId`
  - does **not** own worker-run creation policy

- `ApplicationBackendGatewayService`
  - owns the authoritative hosted backend mount under `applicationId`
  - owns transport normalization across GraphQL, routes, queries, and commands
  - validates request-context identity
  - treats app business payloads as opaque transport payloads
  - does **not** own app business schema/codegen, orchestration policy, or worker internals

- `ApplicationEngineHostService`
  - owns backend worker lifecycle for one application
  - owns worker startup, ready status, IPC client, and worker invocation
  - does **not** own application business orchestration

- `ApplicationBackend`
  - owns domain logic, business-state projection, orchestration policy decisions, and the application’s business API schema/resolver contract
  - decides which `executionRef` to use and when to start/stop work
  - owns whether the app frontend talks through GraphQL, routes, queries/commands, or a mix of those surfaces

- `ApplicationRuntimeControlBridge`
  - is a thin worker-facing boundary that exposes one authoritative platform API into the worker
  - does **not** own orchestration state itself

- `ApplicationOrchestrationStartupGate`
  - owns the authoritative startup-readiness state for orchestration-sensitive live traffic
  - serializes recovery-time lookup rebuild / observer reattachment against live `runtimeControl` calls and live runtime-originated artifact publications
  - does **not** own recovery logic, binding persistence, or event normalization

- `ApplicationOrchestrationHostService`
  - owns resource resolution, run binding persistence, control/query behavior, lifecycle-observer attachment on new bindings, and explicit runtime control operations
  - does **not** own execution-event journaling or runtime publication ingress

- `ApplicationBoundRunLifecycleGateway`
  - is the thin adapter boundary that converts agent-run and team-run lifecycle notifications into one orchestration-facing lifecycle shape
  - does **not** own binding state or event journaling

- `ApplicationRunObserverService`
  - owns ongoing observer attachment/reattachment for bound runs and the binding-state transitions triggered by observed lifecycle changes
  - does **not** own concrete run creation or event journaling APIs

- `ApplicationExecutionEventIngressService`
  - owns the **single authoritative ingress boundary** for all runtime execution events that become app-backend events
  - accepts artifact publications and platform-originated run lifecycle events
  - normalizes event envelopes and appends immutable journal rows
  - does **not** own dispatch retries or business projection

- `ApplicationExecutionEventDispatchService`
  - owns ordered at-least-once delivery of normalized runtime events into the app backend
  - does **not** own event normalization or binding state

- `ApplicationOrchestrationRecoveryService`
  - owns startup recovery/resume of durable bindings, derived lookup reconstruction, and eager observer reattachment **inside** the startup gate’s exclusive recovery window
  - does **not** own ordinary runtime control calls after startup recovery completes

- `AgentRunService` / `TeamRunService`
  - own concrete execution-resource creation, resolution, restore, termination, input delivery, and a service-level lifecycle-observation boundary for their own subject
  - do **not** own application binding or application business context

If a public facade or entry wrapper exists, it is thin unless explicitly listed above as a governing owner.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ApplicationHandlerContext.runtimeControl` | `ApplicationOrchestrationHostService` | Safe worker-facing API for app backends | binding persistence internals, event journaling, or direct run-service access |
| `publish_artifact` tool | `ApplicationExecutionEventIngressService` | Runtime tool entrypoint for artifact publication; must wait on the startup gate before forwarding live artifact traffic | app-owned business projection or dispatch retries |
| `ApplicationBoundRunLifecycleGateway` | `AgentRunService.observeAgentRunLifecycle(...)` / `TeamRunService.observeTeamRunLifecycle(...)` | One orchestration-facing lifecycle shape over two execution owners | binding updates or app event journaling |
| `ApplicationBackendGatewayService` GraphQL/routes/query/command entrypoints | `ApplicationEngineHostService` and app backend handlers | Host the app-scoped virtual backend mount, normalize transport, and validate application identity | orchestration policy, app business schema ownership, or session-like state |
| `ApplicationSurface.vue` / iframe bridge | `ApplicationHostLaunchOwner` | Browser-side iframe launch/bootstrap boundary | worker-run creation or app domain state |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-sessions/**` | Session is no longer the governing orchestration owner | `src/application-orchestration/**` plus engine-first launch | `In This Change` | Clean-cut replacement |
| `runtimeTarget` from application catalog + manifest v2 | Applications no longer have one singular launch-time worker identity | Manifest v3 without `runtimeTarget`; orchestration uses resource refs | `In This Change` | Required for clean ownership |
| `createApplicationSession`, `terminateApplicationSession`, `applicationSessionBinding`, session GraphQL types | Generic host no longer launches/binds applications through durable sessions | app launch uses engine ensure-ready; app backend owns run control | `In This Change` | Remove GraphQL session boundary entirely |
| Application-session websocket streaming and retained snapshot transport | Platform no longer owns app-visible retained execution view | app-owned state projection + app notifications; optional runtime identity exposure only | `In This Change` | Session stream URL removed from iframe bootstrap |
| `ApplicationLaunchConfigModal.vue` and host launch-draft preparation | Generic host should not own low-level run launch configuration | app-owned UI/backend decides when and how runs are launched | `In This Change` | Major UX/product shift |
| `ApplicationExecutionWorkspace.vue` host-retained artifact view | Platform should not remain the primary owner of app-visible runtime artifact projection | app UI + app backend projection + optional workspace handoff | `In This Change` | Deep-link capability remains via runtime identity |
| `applicationSessionContext` injection key and session-based publication routing | Publications must route by execution/binding context | `applicationExecutionContext` / run binding context | `In This Change` | Tool entrypoint survives; context owner changes |
| Brief Studio `briefId = brief::<applicationSessionId>` | Business identity must stop deriving from platform session identity | app-owned `briefId` + `executionRef = briefId` | `In This Change` | Teaching sample must teach target model |
| Brief Studio query/command-heavy canonical UI flow and Socratic Math Teacher minimal bootstrap-only positioning | They keep teaching an underpowered app-business-API model after the platform moves to app-owned schemas and virtual backend mounts | GraphQL-backed real sample apps with generated clients and app-owned resolver flows | `In This Change` | Sample docs/builds should teach the new model, not the historical one |

## Return Or Event Spine(s) (If Applicable)

- `DS-003`: `Runtime -> publish_artifact -> ApplicationExecutionEventIngressService -> Execution Event Journal -> ApplicationExecutionEventDispatchService -> ApplicationEngineHost -> App Event Handler`
- `DS-004`: `Lifecycle Gateway -> ApplicationRunObserverService -> ApplicationExecutionEventIngressService -> Execution Event Journal -> Dispatch Service -> ApplicationEngineHost -> App Event Handler`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `ApplicationExecutionEventDispatchService`
  - arrow chain: `Pending Journal Row -> Dispatch Attempt -> App Event Handler Invocation -> Ack / Failure Record -> Retry Timer`
  - why this bounded local spine matters: delivery ordering, retry policy, and startup resume behavior are core guarantees of the platform-owned event-delivery model

- Parent owner: `ApplicationRuntimeControlBridge`
  - arrow chain: `Worker runtimeControl call -> IPC request -> Host bridge dispatcher -> ApplicationOrchestrationHostService -> IPC response`
  - why this bounded local spine matters: it makes application-owned orchestration available inside the worker without letting the worker depend on host internals directly

- Parent owner: `ApplicationOrchestrationRecoveryService`
  - arrow chain: `List Applications -> Read Nonterminal Bindings -> Rebuild Lookup Index -> Restore/Resolve Run -> Attach Observer / Mark Orphaned`
  - why this bounded local spine matters: restart-safe ownership is not real unless recovery explicitly rebuilds runtime-facing state from durable stores

## Restart Recovery / Resume Contract

### Authoritative storage choice

- `ApplicationRunBindingStore` is the **authoritative** durable source for orchestration state.
- Each application keeps its own binding rows in its per-app platform-owned DB.
- `ApplicationRunLookupStore` is a **derived acceleration index**, not the source of truth.
- The global lookup index exists only to resolve `runId -> applicationId + bindingId` efficiently for runtime-originated events.

### Startup owner and hook

- `ApplicationOrchestrationRecoveryService.resumeBindings()` is the authoritative startup recovery owner.
- `server-runtime.ts` enters `ApplicationOrchestrationStartupGate.runStartupRecovery(...)` after application package/bundle availability and temp-workspace readiness are established.
- Inside that exclusive startup gate callback, `server-runtime.ts` calls `ApplicationOrchestrationRecoveryService.resumeBindings()` first and `ApplicationExecutionEventDispatchService.resumePendingEvents()` second.

### Recovery policy

- Recovery is **eager for every nonterminal binding**.
- The system does **not** wait for first user interaction to reattach observers.
- Rationale: publication and lifecycle guarantees cannot be claimed if bound runs can publish/terminate before observer attachment exists.

### Recovery algorithm

For each installed application with an existing platform DB:

1. read all nonterminal bindings from `ApplicationRunBindingStore`,
2. clear and rebuild that application's rows in the derived global `ApplicationRunLookupStore`,
3. for each nonterminal binding:
   - call the lifecycle gateway, which resolves/restores the concrete run through the correct execution service,
   - if restoration succeeds, attach the observer immediately and mark the binding `attached`,
   - if restoration fails or the run is not recoverable, mark the binding `orphaned`, remove its lookup row, and record a lifecycle event through `ApplicationExecutionEventIngressService`.

### Guarantees

- After recovery completes, every nonterminal recoverable binding has:
  - a rebuilt lookup row,
  - an attached lifecycle observer, and
  - a known current binding state.
- Any binding that cannot be recovered is explicitly transitioned to `orphaned`; it is **not** silently left as “active but unattached.”

### Dispatch ordering at startup

1. `ApplicationOrchestrationStartupGate.runStartupRecovery(...)`
2. inside it: `ApplicationOrchestrationRecoveryService.resumeBindings()`
3. inside it: `ApplicationExecutionEventDispatchService.resumePendingEvents()`
4. release startup gate to `READY`

This ordering ensures that:

- recovery-generated lifecycle/orphan events are already journaled before dispatch resumes,
- lookup/index state is valid before live runtime-originated publications are admitted,
- observer attachment is in place before the startup gate releases steady-state orchestration readiness.

## Startup Coordination / Traffic Admission Contract

### Chosen coordination model

- The design chooses an explicit **startup gate / serialization boundary**, not correctness-by-raw-`app.listen(...)` ordering.
- `app.listen(...)` may still occur before some startup work completes if the runtime needs the bound address for internal URL seeding or other non-orchestration bootstrapping.
- The authoritative correctness rule is therefore: **orchestration-sensitive live traffic is not admitted until the startup gate releases**.

### Authoritative boundary

- `ApplicationOrchestrationStartupGate` is the single owner of orchestration startup readiness.
- It exposes one exclusive recovery window plus one shared ready-wait for live callers.
- It has three states:
  - `RECOVERING`
  - `READY`
  - `FAILED`

### Exclusive startup window

- `server-runtime.ts` enters the gate before orchestration recovery begins.
- The gate runs one exclusive startup callback of this shape:

  `runStartupRecovery(async () => { await ApplicationOrchestrationRecoveryService.resumeBindings(); await ApplicationExecutionEventDispatchService.resumePendingEvents(); })`

- While that callback is active:
  - lookup-index rebuild is allowed,
  - observer reattachment is allowed,
  - recovery-generated lifecycle/orphan events may flow into `ApplicationExecutionEventIngressService`,
  - live `runtimeControl` calls and live runtime-originated artifact publications are **not** admitted.

### Gated live paths

- `ApplicationOrchestrationHostService` must wait on `ApplicationOrchestrationStartupGate.awaitReady()` before executing any public runtime-control query or mutation that touches bindings, lookup state, or bound-run control.
- `publish_artifact` live traffic must wait on `ApplicationOrchestrationStartupGate.awaitReady()` before forwarding to `ApplicationExecutionEventIngressService`.
- Application/backend requests that do **not** touch orchestration-sensitive runtime control may proceed independently; the startup gate is not a whole-server global lock.

### Release condition

- The gate transitions to `READY` only after:
  1. `ApplicationOrchestrationRecoveryService.resumeBindings()` succeeds, and
  2. `ApplicationExecutionEventDispatchService.resumePendingEvents()` succeeds.

At that point:

- the derived lookup index has been rebuilt,
- nonterminal recoverable bindings have observers attached,
- unrecoverable bindings have been orphaned explicitly,
- the dispatch loop is running again, and
- live `runtimeControl` plus live runtime-originated artifact traffic may proceed.

### Failure behavior

- If the startup callback fails, the gate transitions to `FAILED`.
- Gated live callers receive a startup-unavailable failure rather than racing with partial orchestration state.
- `server-runtime.ts` treats `FAILED` as a fatal startup condition for the orchestration subsystem and terminates the process instead of serving indefinitely with a partial orchestration surface.

### Traffic-admission note

- `app.listen(...)` is **not** the authoritative readiness signal for application orchestration.
- Any readiness surface that claims the server is ready for orchestration-sensitive traffic must reflect `ApplicationOrchestrationStartupGate`, not raw socket-bind success alone.

## Lifecycle Observation Contract

### Shared orchestration-facing lifecycle shape

Introduce one shared internal lifecycle-notification shape used above the execution subsystems:

- `ObservedRunLifecycleEvent`
  - `runtimeSubject`: `AGENT_RUN` | `TEAM_RUN`
  - `runId`
  - `phase`: `ATTACHED` | `TERMINATED` | `FAILED`
  - `occurredAt`
  - optional `errorMessage`

This is intentionally narrower than rich agent/team event streams.
It exists only for orchestration ownership: attachment, terminal change, and failure change.

### Authoritative execution-owner interfaces

The orchestration subsystem depends on **service-level** observation methods, not on raw manager or backend details:

- `AgentRunService.observeAgentRunLifecycle(runId, listener)`
- `TeamRunService.observeTeamRunLifecycle(teamRunId, listener)`

These service-level methods are the authoritative upward-facing lifecycle boundaries for their respective run subjects.
They are responsible for:

- resolving/restoring the referenced run if needed,
- attaching to the manager-level lifecycle stream,
- returning one unsubscribe handle.

### Required execution-subsystem extensions

#### Agent side

- extend `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`
  - add manager-level lifecycle subscription/dispatch for one run id,
  - emit `ATTACHED` on create/restore registration,
  - emit `TERMINATED` on explicit termination/unregister,
  - emit `FAILED` when runtime/backend closure makes the run inactive unexpectedly.
- extend `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts`
  - add `observeAgentRunLifecycle(...)` as the authoritative service boundary above the manager.

#### Team side

- extend `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts`
  - add the same manager-level lifecycle subscription/dispatch shape used on the agent side,
  - do **not** make orchestration depend directly on the existing rich team-event stream.
- extend `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts`
  - add `observeTeamRunLifecycle(...)` as the authoritative service boundary above the manager.

### Orchestration-side adapter

- add `autobyteus-server-ts/src/application-orchestration/services/application-bound-run-lifecycle-gateway.ts`
  - accepts a binding runtime descriptor,
  - delegates to `AgentRunService.observeAgentRunLifecycle(...)` or `TeamRunService.observeTeamRunLifecycle(...)`,
  - returns the shared `ObservedRunLifecycleEvent` shape upward to `ApplicationRunObserverService`.

This keeps `ApplicationRunObserverService` free from agent/team manager specifics and prevents boundary guessing.

## Execution Event Ingress Authority

`ApplicationExecutionEventIngressService` is the **single authoritative execution-event ingress boundary**.
It is the only owner allowed to append new immutable app-event journal rows.

### Allowed callers into the ingress boundary

- `publish_artifact` tool for runtime artifact publications,
- `ApplicationOrchestrationHostService` for explicit lifecycle events caused by control actions such as `startRun`, explicit terminate, or supersede,
- `ApplicationRunObserverService` for observed runtime lifecycle events such as unexpected termination/failure,
- `ApplicationOrchestrationRecoveryService` for recovery-time orphaning or unrecoverable-binding events.

During startup recovery, the only caller allowed to reach the ingress owner before the startup gate opens is `ApplicationOrchestrationRecoveryService`.
Live runtime-originated artifact publication must wait at the `publish_artifact` entry boundary until `ApplicationOrchestrationStartupGate` reaches `READY`.

### Forbidden shapes

- no direct journal writes from the tool,
- no direct journal writes from the observer service,
- no direct journal writes from the orchestration host service,
- no direct journal writes from recovery.

Those callers may decide *that* an event should exist, but only the ingress service decides how it is normalized and written.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `ApplicationRuntimeResourceResolver` | `DS-002` | `ApplicationOrchestrationHostService` | Resolve bundle-local vs shared resource refs into canonical executable definitions | Keeps resource resolution policy out of app backends and out of run services | Main line would become cluttered with resource-lookup detail |
| `ApplicationRunBindingStore` | `DS-002`, `DS-004`, `DS-007` | `ApplicationOrchestrationHostService`, `RecoveryService`, `RunObserverService` | Persist per-app binding records and binding-member records | Durable app-owned orchestration needs a platform-owned binding record | Run services would start owning app binding semantics |
| `ApplicationRunLookupStore` | `DS-003`, `DS-007` | `ApplicationExecutionEventIngressService`, `RecoveryService` | Derived global `runId -> applicationId + bindingId` lookup | Runtime publication starts from run identity, not app identity | Publication routing would degrade into cross-app scans |
| `ApplicationExecutionEventJournalStore` | `DS-003`, `DS-004`, `DS-005` | `ExecutionEventIngressService` and `DispatchService` | Persist immutable normalized event rows | Preserves retry-safe ordered delivery into app backends | Dispatch logic would need hidden persistence detail |
| `ApplicationOrchestrationStartupGate` | `DS-002`, `DS-003`, `DS-007` | `ServerRuntime`, `ApplicationOrchestrationHostService`, runtime artifact tool entry | Serialize live orchestration-sensitive traffic against startup recovery | Prevents live writes/ingress from racing with lookup rebuild and observer reattachment | Main line would otherwise rely on implicit listen ordering |
| `ApplicationBoundRunLifecycleGateway` | `DS-004`, `DS-007` | `ApplicationRunObserverService`, `RecoveryService` | Unify agent/team lifecycle observation behind one orchestration-facing shape | Prevents orchestration from depending on two different execution-owner interfaces | Main line would be polluted with agent/team branching |
| `App-Owned Schema Artifacts / Generated Client` | `DS-001`, `DS-008` | `ApplicationBackend` and iframe app authoring/build flow | Own GraphQL SDL/OpenAPI/shared DTO artifacts plus generated frontend client/types for one app | Keeps type safety and code generation app-owned instead of platform-owned | The platform would start owning app business semantics or frontends would guess payloads ad hoc |
| `ApplicationLaunchDescriptorBuilder` | `DS-001` | `ApplicationHostLaunchOwner` | Build iframe URL, query hints, and bootstrap envelope v2 | Keeps launch bootstrap detail out of general page shell logic | Host launch path would become brittle and mixed with page UI state |
| `WorkspaceExecutionLinkBuilder` (optional thin helper) | `DS-002`, `DS-003` | app backend / frontend consumers | Derive host-usable execution handoff identity from binding summary | Supports runtime handoff without making workspace routes the orchestration owner | App backend would start building host route strings ad hoc |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Application backend worker lifecycle | `application-engine` | `Reuse` | Already the correct owner for app backend runtime startup/stop/invocation | N/A |
| Application-scoped transport boundary | `application-backend-gateway` | `Reuse` | Already keyed by `applicationId`; request-context semantics only need simplification | N/A |
| Bundle discovery and validation | `application-bundles` | `Extend` | Still the right owner, but the manifest/catalog contract must stop requiring `runtimeTarget` | No new subsystem needed |
| App storage roots and per-app platform/app DB lifecycle | `application-storage` | `Extend` | Already owns app-root layout; can also bootstrap a global orchestration DB for the derived lookup index | No new storage/path subsystem needed |
| Agent run execution | `agent-execution` | `Extend` | Already the correct concrete execution owner; must add an authoritative service-level lifecycle observation boundary | No new execution subsystem needed |
| Team run execution | `agent-team-execution` | `Extend` | Already the correct concrete execution owner; must add the same authoritative lifecycle observation boundary | No new execution subsystem needed |
| Application-owned orchestration state, binding control, recovery, event ingress, lifecycle observation | current `application-sessions` | `Create New` | Current subsystem is semantically wrong; it is built around session ownership and retained session projections | Extending it would preserve the wrong governing abstraction |
| Worker-facing runtime control into host | current worker runtime context | `Create New` | Current worker context has no runtime-control boundary and should not call host internals directly | Needs a new authoritative bridge |
| Cross-app run lookup persistence | none | `Create New` | Current per-app scan approach is too tied to session identity and is not appropriate for many bound runs | Needs dedicated derived-index ownership |
| Startup recovery / resume of bindings | none | `Create New` | Durable bindings without a startup recovery owner do not satisfy restart-safe ownership | Needs an explicit startup owner and hook |
| Startup traffic admission / serialization for orchestration-sensitive paths | none | `Create New` | Raw `app.listen(...)` timing is not a sufficient correctness boundary once recovery rebuilds derived lookup state | Needs an explicit startup gate that live orchestration/event paths must honor |
| App-owned business API schema/codegen and generated clients | current frontend SDK + shared contracts | `Create New` | Platform packages are transport/infra owners, not the right owner for one app’s business schema or generated client output | App-owned GraphQL/OpenAPI/shared-contract artifacts must remain inside each application workspace |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `application-bundles` | app catalog, manifest validation, bundle-local resource discovery | `DS-001`, `DS-002` | Host launch + orchestration resource resolution | `Extend` | Remove catalog/runtimeTarget coupling |
| `application-engine` | app worker lifecycle, worker IPC, worker invocation | `DS-001`, `DS-002`, `DS-005`, `DS-006` | Backend gateway + worker runtime bridge | `Extend` | Add worker->host runtime-control IPC |
| `application-backend-gateway` | app transport boundary and engine ensure-ready surface | `DS-001`, `DS-002` | Browser host + iframe app backend calls | `Extend` | Request context becomes launch-instance-aware, not session-aware |
| `application-orchestration` | resource resolution, runtime control, startup coordination, binding persistence, recovery, lifecycle observation, execution-event ingress, event journaling/dispatch | `DS-002`, `DS-003`, `DS-004`, `DS-005`, `DS-006`, `DS-007` | App backend runtime control boundary | `Create New` | Replaces `application-sessions` |
| `application-storage` | per-app DB lifecycle plus global orchestration index DB bootstrap/path ownership | `DS-003`, `DS-004`, `DS-005`, `DS-007` | Orchestration stores | `Extend` | Storage/path concerns remain centralized here |
| `autobyteus-web Applications host` | engine-first app launch and iframe bootstrap v2 | `DS-001` | Browser host | `Extend` | Remove session-centric host UI flow |
| `application-sdk-contracts` + backend/frontend SDKs | author-facing contract shapes, backend mount transport helper, and runtime-control/context exposure | `DS-001`, `DS-002`, `DS-003`, `DS-004`, `DS-006`, `DS-008` | Bundle authors | `Extend` | Platform SDKs stay schema-agnostic while exposing the hosted backend mount cleanly |
| `applications/<app>/api` + `frontend-src/generated` | app-owned schema artifacts and generated clients | `DS-001`, `DS-008` | App backend + iframe app | `Create New` | Not a platform subsystem; each app owns its own business API contract/codegen |
| `agent-execution` + `agent-team-execution` lifecycle observation extensions | service-level lifecycle notification boundaries | `DS-004`, `DS-007` | Run observer and recovery owners | `Extend` | Add a consistent orchestration-facing observation contract |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-host-service.ts` | `application-orchestration` | Governing service boundary | Start/control/query/terminate/supersede bindings | One authoritative app-facing orchestration entrypoint | Yes |
| `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-startup-gate.ts` | `application-orchestration` | Governing startup-readiness boundary | Serialize live orchestration-sensitive traffic against startup recovery | One startup-admission concern | Yes |
| `.../services/application-execution-event-ingress-service.ts` | `application-orchestration` | Governing event-ingress owner | Normalize artifact/lifecycle events and append journal rows | One authoritative ingress boundary for execution events | Yes |
| `.../services/application-run-observer-service.ts` | `application-orchestration` | Governing lifecycle observer owner | Attach observers and update bindings from observed lifecycle changes | One lifecycle-observer concern | Yes |
| `.../services/application-orchestration-recovery-service.ts` | `application-orchestration` | Governing startup owner | Rebuild derived lookup index, restore bindings, reattach observers | One startup-resume concern | Yes |
| `.../services/application-bound-run-lifecycle-gateway.ts` | `application-orchestration` | Thin adapter | Delegate to agent/team lifecycle service methods and normalize upward | One adapter concern | Yes |
| `.../services/application-execution-event-dispatch-service.ts` | `application-orchestration` | Dispatch owner | Ordered journal drain and retry loop | One bounded local concern | Yes |
| `.../stores/application-run-binding-store.ts` | `application-orchestration` | Per-app persistence boundary | Per-app binding rows + member rows | Binding persistence is one subject | Yes |
| `.../stores/application-execution-event-journal-store.ts` | `application-orchestration` | Per-app persistence boundary | Immutable per-app app-event journal rows + ack cursor | Journal state is one subject | Yes |
| `.../stores/application-run-lookup-store.ts` | `application-orchestration` | Global persistence boundary | Derived global `runId -> app/binding` lookup | Cross-app lookup is a distinct concern | Yes |
| `autobyteus-server-ts/src/runtime-management/domain/observed-run-lifecycle-event.ts` | shared internal runtime domain | Shared internal type owner | Shared orchestration-facing lifecycle event type | Both execution subsystems and orchestration use it | Yes |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | `agent-execution` | Service boundary extension | Add `observeAgentRunLifecycle(...)` | One subject-owned upward boundary | Yes |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | `agent-execution` | Manager extension | Add manager-level lifecycle subscription/dispatch | Keeps backend/run-level lifecycle normalization inside agent execution | Yes |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | `agent-team-execution` | Service boundary extension | Add `observeTeamRunLifecycle(...)` | One subject-owned upward boundary | Yes |
| `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | `agent-team-execution` | Manager extension | Add manager-level lifecycle subscription/dispatch | Keeps team lifecycle normalization inside team execution | Yes |
| `autobyteus-server-ts/src/application-orchestration/tools/publish-artifact-tool.ts` | `application-orchestration` | Runtime artifact entry wrapper | Wait for startup admission, then forward live artifact publications to the ingress owner | One live-ingress entry concern | Yes |
| `autobyteus-server-ts/src/server-runtime.ts` | server startup | Startup hook owner | Enter the startup gate, run recovery plus dispatch resume inside it, and fail fast if ready state cannot be released | One startup orchestration hook | No |
| `autobyteus-application-frontend-sdk/src/create-application-backend-mount-transport.ts` | frontend SDK | Generic transport-helper boundary | Build schema-agnostic GraphQL/query/command/route invokers from `backendBaseUrl` plus request-context v2 | Keeps mount-path derivation out of every app while avoiding ownership of app business schemas | Yes |
| `applications/<app>/api/graphql/schema.graphql` | app-owned per-app authoring | App-owned business API contract | Authoritative GraphQL schema artifact for one application | One schema owner per app | No |
| `applications/<app>/frontend-src/generated/graphql-client.ts` | app-owned per-app authoring | Generated client artifact | Frontend-usable GraphQL types/operations for one application | Generated output should remain app-owned | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Resource reference shapes (bundle-local vs shared) | `autobyteus-application-sdk-contracts/src/runtime-resources.ts` | contracts package | Needed by server, backend SDK, and app authors | `Yes` | `Yes` | a vague generic selector with optional unrelated fields |
| Binding summary used by runtime control + event envelope | `autobyteus-application-sdk-contracts/src/runtime-bindings.ts` | contracts package | One authoritative binding identity shape | `Yes` | `Yes` | a kitchen-sink “session/run/execution” shape |
| Execution event envelope | `autobyteus-application-sdk-contracts/src/runtime-events.ts` | contracts package | Shared immutable event shape for app event handlers | `Yes` | `Yes` | duplicated local event shapes per package |
| Shared internal observed lifecycle event | `autobyteus-server-ts/src/runtime-management/domain/observed-run-lifecycle-event.ts` | shared internal runtime domain | Orchestration needs one shape above agent/team execution | `Yes` | `Yes` | two parallel agent-only/team-only lifecycle shapes |
| Iframe bootstrap v2 payload + backend mount descriptor | `autobyteus-web/types/application/ApplicationIframeContract.ts` | web host | Shared browser host/iframe bootstrap shape including authoritative `backendBaseUrl` | `Yes` | `Yes` | browser-only ad hoc literals duplicated in components |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ApplicationRuntimeResourceRef` | `Yes` | `Yes` | `Low` | Keep `localId` only for bundle-local refs and canonical ids only where shared resolution requires them |
| `ApplicationRunBindingSummary` | `Yes` | `Yes` | `Low` | Keep business identity only as `executionRef`; do not reintroduce session fields |
| `ApplicationExecutionEventEnvelope` | `Yes` | `Yes` | `Low` | Reuse binding summary instead of parallel top-level binding/run fields |
| `ObservedRunLifecycleEvent` | `Yes` | `Yes` | `Low` | Keep it intentionally narrow for orchestration only; rich runtime events stay below this boundary |
| Worker `ApplicationRequestContext` v2 | `Yes` | `Yes` | `Low` | Keep it about request source (`applicationId`, optional `launchInstanceId`), not business identity |
| Iframe/backend mount transport descriptor v2 | `Yes` | `Yes` | `Low` | Keep `backendBaseUrl` authoritative; convenience GraphQL/query/command/route URLs derive from it instead of becoming parallel sources of truth |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-orchestration/domain/models.ts` | `application-orchestration` | Internal model owner | Internal binding rows, runtime execution context, recovery status enums | One internal orchestration model owner | Yes |
| `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-host-service.ts` | `application-orchestration` | Authoritative public boundary | Public host-side runtime control for app backends | One authoritative app-facing orchestration entrypoint | Yes |
| `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-startup-gate.ts` | `application-orchestration` | Authoritative startup-readiness boundary | Exclusive startup recovery window plus steady-state release for orchestration-sensitive live traffic | One startup-admission boundary | Yes |
| `autobyteus-server-ts/src/application-orchestration/services/application-execution-event-ingress-service.ts` | `application-orchestration` | Authoritative event ingress | Normalize and append all execution events to the immutable journal | One authoritative event ingress boundary | Yes |
| `autobyteus-server-ts/src/application-orchestration/services/application-run-observer-service.ts` | `application-orchestration` | Governing observer owner | Attach/reattach observers and update binding state from lifecycle changes | One lifecycle-observer owner | Yes |
| `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-recovery-service.ts` | `application-orchestration` | Governing startup owner | Recover bindings, rebuild lookup index, attach observers, mark orphaned bindings | One startup-resume owner | Yes |
| `autobyteus-server-ts/src/application-orchestration/services/application-bound-run-lifecycle-gateway.ts` | `application-orchestration` | Thin adapter | Delegate to agent/team observation methods and normalize upward | One adapter concern | Yes |
| `autobyteus-server-ts/src/application-orchestration/services/application-execution-event-dispatch-service.ts` | `application-orchestration` | Dispatch owner | Ack/retry loop and startup resume | One bounded local concern | Yes |
| `autobyteus-server-ts/src/application-orchestration/stores/application-run-binding-store.ts` | `application-orchestration` | Per-app persistence boundary | Per-app binding rows and member rows | One subject | Yes |
| `autobyteus-server-ts/src/application-orchestration/stores/application-execution-event-journal-store.ts` | `application-orchestration` | Per-app persistence boundary | Immutable per-app event journal + dispatch cursor | One subject | Yes |
| `autobyteus-server-ts/src/application-orchestration/stores/application-run-lookup-store.ts` | `application-orchestration` | Global persistence boundary | Derived global `runId/bindingId -> applicationId` lookup | One subject | Yes |
| `autobyteus-server-ts/src/runtime-management/domain/observed-run-lifecycle-event.ts` | shared internal runtime domain | Shared internal type owner | Shared orchestration-facing lifecycle event type | One type owner | Yes |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | `agent-execution` | Subject-owned service boundary | Create/resolve/terminate plus `observeAgentRunLifecycle(...)` | One agent-run service owner | Yes |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | `agent-execution` | Internal manager extension | Active-run registry plus manager-level lifecycle subscription/dispatch | One agent-run manager concern | Yes |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | `agent-team-execution` | Subject-owned service boundary | Create/resolve/terminate plus `observeTeamRunLifecycle(...)` | One team-run service owner | Yes |
| `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | `agent-team-execution` | Internal manager extension | Active-run registry plus manager-level lifecycle subscription/dispatch | One team-run manager concern | Yes |
| `autobyteus-server-ts/src/application-storage/stores/application-global-platform-state-store.ts` | `application-storage` | Global storage boundary | Open/transaction wrapper for the global orchestration DB | Cross-app index storage should stay under storage ownership | Yes |
| `autobyteus-server-ts/src/application-orchestration/tools/publish-artifact-tool.ts` | `application-orchestration` | Runtime artifact entry wrapper | Gate live artifact traffic on startup readiness and forward to the ingress owner | One live artifact ingress entry | Yes |
| `autobyteus-server-ts/src/server-runtime.ts` | server startup | Startup hook owner | Enter the startup gate, run recovery plus dispatch resume inside it, and fail fast if ready state cannot be released | One startup integration point | No |
| `autobyteus-web/stores/applicationHostStore.ts` | `autobyteus-web Applications host` | Browser launch owner | Engine ensure-ready + iframe bootstrap state | One page-launch owner | Yes |
| `autobyteus-web/types/application/ApplicationIframeContract.ts` | `autobyteus-web Applications host` | Shared host type owner | v2 iframe bootstrap envelope and authoritative backend mount descriptor | One shared browser type owner | Yes |
| `autobyteus-application-frontend-sdk/src/create-application-backend-mount-transport.ts` | frontend SDK | Generic transport-helper owner | Build schema-agnostic invokers from `backendBaseUrl` and request-context v2 | One optional transport helper owner | Yes |
| `autobyteus-application-sdk-contracts/src/{manifests,request-context.ts,runtime-*.ts,backend-definition.ts}` | contracts package | Shared contracts owner | Versioned bundle/backend/request/runtime/event/bootstrap transport types | Split by subject instead of one mixed file | Yes |
| `applications/<app>/api/graphql/schema.graphql` | app-owned per-app authoring | App-owned schema artifact owner | Authoritative app GraphQL schema/introspection input | One schema owner per app | No |
| `applications/<app>/backend-src/graphql/index.ts` | app-owned per-app authoring | App-owned GraphQL runtime boundary | Worker-side GraphQL executor/resolver composition for one app | One backend business API boundary per app | Yes |
| `applications/<app>/frontend-src/generated/graphql-client.ts` | app-owned per-app authoring | Generated client artifact owner | Frontend-usable GraphQL types/operations for one app | Generated output should remain app-owned | Yes |

## Ownership Boundaries

Authority changes hands at these points:

1. **Browser host -> backend runtime**
   - The browser host owns iframe bootstrap and app-page readiness.
   - The backend gateway/engine own backend worker readiness.
   - The browser host must not launch runs directly.

2. **App backend -> platform orchestration**
   - The application backend decides *what* to orchestrate and *why*.
   - `ApplicationOrchestrationHostService` decides *how platform-owned runtime control is executed and persisted*.
   - App code must use `runtimeControl`, not raw run services.

3. **Platform orchestration -> concrete run services**
   - The orchestration host owns binding/resource/application context.
   - Agent/team run services own only the concrete execution lifecycle and service-level lifecycle-observation boundaries for their own subject.
   - Run services must not absorb application-owned business identity.

4. **Concrete execution -> lifecycle gateway -> observer owner**
   - Agent/team execution owners expose service-level lifecycle observation.
   - The lifecycle gateway adapts those subject-owned boundaries to one orchestration-facing shape.
   - The observer owner owns binding-state transitions above that adapter.

5. **Runtime execution event ingress -> app backend event handling**
   - `ApplicationExecutionEventIngressService` owns event normalization and journal append for both artifact publications and run lifecycle events.
   - `ApplicationExecutionEventDispatchService` owns delivery retries.
   - The app backend owns business projection after receiving the event.
   - The platform must not continue to own app-visible retained artifact projection as the primary application view.

6. **Startup recovery -> steady-state orchestration**
   - `ApplicationOrchestrationStartupGate` owns when orchestration-sensitive live traffic is admitted.
   - `ApplicationOrchestrationRecoveryService` rebuilds runtime-facing orchestration state inside that exclusive startup window.
   - The gate releases to steady-state ready only after recovery and dispatch resume have both completed.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ApplicationOrchestrationHostService` | resource resolver, binding store, lifecycle gateway, observer attachment on new bindings | worker `runtimeControl`, internal platform callers | app backend or worker bridge calling `AgentRunService`, `TeamRunService`, or stores directly | expand orchestration API, not bypass it |
| `ApplicationExecutionEventIngressService` | lookup resolution, event normalization, journal append | `publish_artifact`, observer service, recovery service, orchestration host service | any caller writing journal rows directly | enrich ingress API, not bypass it |
| `ApplicationOrchestrationStartupGate` | startup state, recovery-window promise, ready/failed release | `server-runtime.ts`, `ApplicationOrchestrationHostService`, runtime artifact tool entry | live orchestration-sensitive traffic bypassing the startup gate | enrich the gate contract, not bypass it |
| `ApplicationExecutionEventDispatchService` | pending-row read, attempt recording, ack/failure recording, retry timer | startup hook, ingress owner scheduling | callers invoking app event handlers directly after journaling | add dispatch API, not bypass it |
| `ApplicationBoundRunLifecycleGateway` | agent/team service-specific observation methods | run observer, recovery service | orchestration depending on agent/team managers directly | enrich gateway or service-level observe methods |
| `ApplicationBackendGatewayService` | app-scoped mount routing, ensure-ready delegation, request-context normalization | browser host, iframe app frontends, optional frontend SDK helpers | browser/frontend code reaching directly into engine host or worker IPC | expand the gateway/mount helper surface, not the bypass |
| `ApplicationEngineHostService` | worker supervisor, IPC client, worker status, notification bridge | backend gateway, dispatch service | gateway or orchestration reaching into worker runtime internals | add engine host methods |
| `ApplicationHostLaunchOwner` | iframe launch descriptor builder, ready timeout, bootstrap postMessage | application page shell | page shell owning low-level postMessage contract or run creation | strengthen dedicated host-launch owner |

## Dependency Rules

- `autobyteus-web` application pages may depend on application catalog + backend ensure-ready boundary + iframe bootstrap types.
- Browser host code must not depend on orchestration stores or run services.
- App frontend code may depend on:
  - app-owned generated clients or shared app-owned contracts,
  - schema-agnostic frontend SDK mount helpers,
  - iframe bootstrap/request-context types.
- App frontend code must not depend on server internal routes outside the hosted backend mount or on worker internals.
- App backend code may depend on `runtimeControl`, backend-definition contracts, and app-owned business schema/resolver code only; it must not depend on server internal services.
- Platform contracts/SDK packages may define manifest/request/runtime/event/bootstrap transport shapes, but they must not import or publish app-specific GraphQL schemas, OpenAPI documents, or generated business clients.
- Generated app clients may depend on app-owned schema artifacts plus generic frontend SDK transport helpers; the dependency must not point back upward from platform packages into app-owned business artifacts.
- `ApplicationBackendGatewayService` may depend on `ApplicationEngineHostService` and generic transport/request-context helpers, but not on app-specific business schemas or orchestration stores.
- `ApplicationRuntimeControlBridge` may depend on `ApplicationOrchestrationHostService`, but not on lower-level stores and run services independently.
- `ApplicationOrchestrationHostService` may depend on:
  - `ApplicationOrchestrationStartupGate`,
  - resource resolver,
  - binding store,
  - lifecycle gateway,
  - run observer service,
  - `AgentRunService`,
  - `TeamRunService`,
  - `ApplicationExecutionEventIngressService` for explicit lifecycle events.
- `ApplicationRunObserverService` may depend on:
  - lifecycle gateway,
  - binding store,
  - lookup store,
  - `ApplicationExecutionEventIngressService`.
- `ApplicationOrchestrationRecoveryService` may depend on:
  - binding store,
  - lookup store,
  - lifecycle gateway,
  - run observer service,
  - `ApplicationExecutionEventIngressService`.
- `ApplicationExecutionEventIngressService` may depend on:
  - lookup store,
  - binding store,
  - event journal store.
- `publish-artifact-tool.ts` may depend on:
  - `ApplicationOrchestrationStartupGate`,
  - `ApplicationExecutionEventIngressService`.
- `server-runtime.ts` may depend on:
  - `ApplicationOrchestrationStartupGate`,
  - `ApplicationOrchestrationRecoveryService`,
  - `ApplicationExecutionEventDispatchService`.
- `ApplicationExecutionEventDispatchService` may depend on:
  - event journal store,
  - `ApplicationEngineHostService`.
- `application-bundles` may provide resource metadata into orchestration resolution, but it must not own launch policy or active bindings.
- `application-storage` owns storage path/bootstrap concerns. Orchestration stores should use storage-owned DB access boundaries instead of embedding path logic.

Forbidden shortcuts:

- worker app code -> raw `AgentRunService` / `TeamRunService`
- browser host -> run services / orchestration stores
- app frontend -> worker process, engine IPC, or internal routes outside the hosted backend mount
- platform packages -> app-owned GraphQL schemas, OpenAPI documents, or generated frontend clients
- `publish_artifact` -> direct journal writes
- live `publish_artifact` traffic -> `ApplicationExecutionEventIngressService` without first honoring `ApplicationOrchestrationStartupGate`
- observer service -> direct journal writes
- recovery service -> direct journal writes
- orchestration host -> direct journal writes
- live `runtimeControl` public methods -> binding/lookup mutation before `ApplicationOrchestrationStartupGate` is ready
- orchestration -> agent/team managers directly
- backend gateway -> binding stores or run services directly
- backend gateway -> app-specific business-schema interpretation
- app backend -> session-like request-context business identity

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `ApplicationIframeBootstrapV2.transport.backendBaseUrl` | browser/application host transport descriptor | Give the iframe one authoritative app-scoped backend mount base URL | `{ applicationId, launchInstanceId? }` via the companion bootstrap envelope | GraphQL/routes/query/command URLs derive from this base |
| `POST /rest/applications/:applicationId/backend/ensure-ready` | application engine launch | Ensure backend worker readiness for app launch | `applicationId` route id | New explicit host-launch surface |
| `GET /rest/applications/:applicationId/backend/status` | application engine status | Report current backend worker status for one app | `applicationId` route id | Useful for host/debug tooling only |
| `POST /rest/applications/:applicationId/backend/graphql` | app-owned GraphQL transport | Forward one app-owned GraphQL request into the current app worker | route `applicationId` + requestContext `{ applicationId, launchInstanceId? }` + `ApplicationGraphqlRequest` | GraphQL schema remains app-owned |
| `ANY /rest/applications/:applicationId/backend/routes/*` | app-owned route transport | Forward one app-owned route request into the current app worker | route `applicationId` + requestContext + normalized method/path/query/header/body | Route/OpenAPI contract remains app-owned |
| `POST /rest/applications/:applicationId/backend/queries/:queryName` | app convenience query transport | Forward one app-defined query into the current app worker | route `applicationId` + requestContext + app-defined input | Convenience surface; not the only real-app model |
| `POST /rest/applications/:applicationId/backend/commands/:commandName` | app convenience command transport | Forward one app-defined command into the current app worker | route `applicationId` + requestContext + app-defined input | Convenience surface; not the only real-app model |
| `ApplicationOrchestrationStartupGate.runStartupRecovery(task)` | startup coordination | Execute the one exclusive orchestration startup window and release ready/failed state | startup callback | Internal authoritative startup-coordination boundary |
| `ApplicationOrchestrationStartupGate.awaitReady()` | startup coordination | Block live orchestration-sensitive callers until steady-state startup is released | none | Used by runtime-control and live artifact-entry boundaries |
| `runtimeControl.listAvailableResources(filter?)` | orchestration resource catalog | List bundle-local/shared accessible runtime resources | optional `{ owner?, kind? }` filter | Worker-side authoritative platform API |
| `runtimeControl.startRun(input)` | run binding control | Start one run and persist one durable binding | `{ executionRef, resourceRef, launch }` | `launch` shape must match resource kind explicitly |
| `runtimeControl.getRunBinding(bindingId)` | run binding query | Return one binding summary | `bindingId` | Authoritative binding lookup |
| `runtimeControl.listRunBindings(filter)` | run binding query | List bindings for the current app | optional `{ executionRef?, status? }` | Used for recovery/inspection |
| `runtimeControl.postRunInput(input)` | run binding control | Deliver user/application input to one binding | `{ bindingId, text, targetMemberName?, contextFiles?, metadata? }` | Use binding identity, not raw run-service bypass |
| `runtimeControl.terminateRunBinding(bindingId)` | run binding control | Terminate one bound run | `bindingId` | Returns updated binding summary |
| `publish_artifact(...)` | execution-event ingress | Publish one runtime artifact for the current binding | runtime-injected execution context + artifact payload | Tool enters only through the ingress boundary |
| `AgentRunService.observeAgentRunLifecycle(runId, listener)` | agent execution lifecycle | Observe one agent run through the shared lifecycle shape | `runId` | Authoritative service-level upward boundary |
| `TeamRunService.observeTeamRunLifecycle(teamRunId, listener)` | team execution lifecycle | Observe one team run through the shared lifecycle shape | `teamRunId` | Authoritative service-level upward boundary |
| `ApplicationBoundRunLifecycleGateway.observeBoundRun(bindingRuntime, listener)` | orchestration lifecycle adapter | Normalize agent/team observation to one orchestration-facing shape | `{ runtimeSubject, runId }` | Keeps orchestration free from manager/backend specifics |
| App backend event handlers `runStarted`, `runTerminated`, `runFailed`, `runOrphaned`, `artifact` | application runtime events | Receive normalized runtime events | immutable event envelope with binding summary | Replaces session lifecycle handlers |
| Frontend SDK/request-context helper boundary | browser request source | Preserve app route identity and optional launch instance | `{ applicationId, launchInstanceId? }` | No session-owned business identity |

Rule:
- Do not use one generic boundary when the subject or identity meaning differs.
- Split boundaries by subject or require an explicit compound identity shape.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ApplicationIframeBootstrapV2.transport.backendBaseUrl` | `Yes` | `Yes` | `Low` | Keep one authoritative backend-mount base URL rather than parallel per-surface sources of truth |
| `POST /rest/applications/:applicationId/backend/graphql` | `Yes` | `Yes` | `Low` | Keep route `applicationId` authoritative and leave GraphQL schema ownership with the app |
| `ANY /rest/applications/:applicationId/backend/routes/*` | `Yes` | `Yes` | `Low` | Keep transport generic; do not reinterpret app route semantics inside the platform |
| `runtimeControl.startRun(...)` | `Yes` | `Yes` | `Low` | Keep `resourceRef` + explicit launch union by resource kind |
| `runtimeControl.postRunInput(...)` | `Yes` | `Yes` | `Low` | Keep `bindingId` authoritative |
| `publish_artifact(...)` | `Yes` | `Yes` | `Low` | Identity comes only from injected execution context plus payload |
| `AgentRunService.observeAgentRunLifecycle(...)` | `Yes` | `Yes` | `Low` | Keep run-subject-specific interface |
| `TeamRunService.observeTeamRunLifecycle(...)` | `Yes` | `Yes` | `Low` | Keep team-run-subject-specific interface |
| `ApplicationOrchestrationStartupGate.runStartupRecovery(...)` | `Yes` | `Yes` | `Low` | Keep startup serialization under one dedicated owner |
| `ApplicationOrchestrationStartupGate.awaitReady()` | `Yes` | `Yes` | `Low` | Reuse one clear readiness wait instead of ad hoc route/local locks |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Governing app-facing orchestration owner | `ApplicationOrchestrationHostService` | `Yes` | `Low` | Keep `orchestration` because it truly owns orchestration |
| Opaque business-context key | `executionRef` | `Yes` | `Low` | Keep platform-neutral string identity |
| Durable platform-owned run relationship | `run binding` / `ApplicationRunBindingSummary` | `Yes` | `Low` | Avoid renaming it back toward session |
| Browser-only iframe launch id | `launchInstanceId` | `Yes` | `Low` | Keep it explicitly browser/bootstrap-scoped |
| Single event-ingress owner | `ApplicationExecutionEventIngressService` | `Yes` | `Low` | Prefer this over `PublicationRouter` because it owns lifecycle events too |
| Startup recovery owner | `ApplicationOrchestrationRecoveryService` | `Yes` | `Low` | Makes the restart responsibility explicit |

## Applied Patterns (If Any)

- **Adapter**
  - `ApplicationRuntimeControlBridge` adapts worker-side app code to host-side orchestration service calls.
  - `ApplicationBoundRunLifecycleGateway` adapts agent/team lifecycle observation into one orchestration-facing shape.
- **Repository / Store**
  - binding store, event journal store, and run lookup store are explicit persistence boundaries.
- **Event Loop / Worker Loop**
  - the execution-event dispatch service owns a bounded ack/retry loop.
- **Resolver**
  - resource resolution for bundle-local/shared refs stays as a dedicated resolver under the orchestration owner.
- **Observer**
  - run observer service subscribes to bound run lifecycle and converts it into binding updates plus execution-event ingress calls.
- **Recovery Owner**
  - startup recovery is treated as a first-class owner, not as incidental bootstrapping logic hidden inside another service.
- **Gate / Barrier**
  - `ApplicationOrchestrationStartupGate` serializes live orchestration-sensitive traffic against recovery-time rebuild/reattachment work.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-orchestration/` | `Folder` | New subsystem | App-facing runtime orchestration core | Replaces mis-scoped `application-sessions` with the correct owner | bundle discovery, generic transport entrypoints |
| `.../domain/models.ts` | `File` | Internal model owner | Internal orchestration model, binding state, execution context | Shared internal shapes for this subsystem | browser contract literals |
| `.../services/application-orchestration-host-service.ts` | `File` | Authoritative boundary | Public host-side runtime control | One authoritative entrypoint | direct journal writes |
| `.../services/application-orchestration-startup-gate.ts` | `File` | Startup-admission boundary | Exclusive startup serialization and ready/failed release | One startup-coordination concern | recovery domain logic or journal normalization |
| `.../services/application-execution-event-ingress-service.ts` | `File` | Authoritative event-ingress boundary | Normalize artifact/lifecycle events and append immutable journal rows | One ingress owner | app-owned business projection |
| `.../services/application-run-observer-service.ts` | `File` | Lifecycle observer owner | Observe bound-run lifecycle and update bindings | One lifecycle concern | transport/controller code |
| `.../services/application-orchestration-recovery-service.ts` | `File` | Startup recovery owner | Rebuild lookup index and reattach observers on restart | Restart-safe ownership needs a visible owner | ordinary app command handling |
| `.../services/application-bound-run-lifecycle-gateway.ts` | `File` | Thin adapter | Unify agent/team lifecycle observation | One adapter concern | binding persistence or journal append |
| `.../services/application-execution-event-dispatch-service.ts` | `File` | Dispatch owner | Ack/retry loop and startup resume | Bounded local loop deserves one file | resource resolution |
| `.../stores/application-run-binding-store.ts` | `File` | Per-app persistence boundary | Binding rows and binding member rows | Binding persistence is one concern | transport/controller code |
| `.../stores/application-execution-event-journal-store.ts` | `File` | Per-app persistence boundary | Immutable per-app execution-event journal | Journal persistence is one concern | app backend projection logic |
| `.../stores/application-run-lookup-store.ts` | `File` | Global persistence boundary | Derived global `runId/bindingId -> applicationId` lookup | Cross-app index is a distinct concern | per-app journal logic |
| `.../tools/publish-artifact-tool.ts` | `File` | Runtime artifact entry wrapper | Wait for startup gate admission and forward live artifact traffic to the ingress owner | One live artifact ingress entry | direct journal writes |
| `autobyteus-server-ts/src/runtime-management/domain/observed-run-lifecycle-event.ts` | `File` | Shared internal type owner | Shared lifecycle shape above execution owners | Both execution subsystems and orchestration need one shape | app-facing public contracts |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | `File` | Service boundary | Agent run control plus lifecycle observation | Subject-owned boundary should stay here | application binding logic |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | `File` | Internal manager | Active-run registry plus lifecycle listener dispatch | Manager already owns active-run registration | app orchestration policy |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | `File` | Service boundary | Team run control plus lifecycle observation | Subject-owned boundary should stay here | application binding logic |
| `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | `File` | Internal manager | Active-run registry plus lifecycle listener dispatch | Manager already owns active-run registration | app orchestration policy |
| `autobyteus-server-ts/src/application-storage/stores/application-global-platform-state-store.ts` | `File` | Global storage boundary | Open/transaction wrapper for derived global orchestration DB | Cross-app storage path concerns belong under storage | orchestration policy |
| `autobyteus-server-ts/src/server-runtime.ts` | `File` | Startup hook owner | Enter the startup gate, run recovery plus dispatch resume inside it, and fail fast if startup readiness cannot be released | One explicit startup integration point | orchestration domain logic |
| `autobyteus-web/stores/applicationHostStore.ts` | `File` | Browser launch owner | App page readiness without session store | Replaces session-centric store | run launch policy |
| `autobyteus-web/types/application/ApplicationIframeContract.ts` | `File` | Shared host type owner | v2 launch/bootstrap contract with authoritative `backendBaseUrl` | One typed bootstrap source | host-specific ad hoc variations |
| `autobyteus-application-frontend-sdk/src/create-application-backend-mount-transport.ts` | `File` | Generic transport helper owner | Schema-agnostic helper for GraphQL/routes/query/command calls against `backendBaseUrl` | Gives apps one reusable hosted-mount helper without owning business schemas | generated app business types |
| `autobyteus-application-sdk-contracts/src/` | `Folder` | Shared contracts | Split contracts by manifest/request/runtime/event/bootstrap subjects | Current single-file index is too mixed | server-only internal store types or app business schemas |
| `applications/<app>/api/` | `Folder` | App-owned business API contract owner | App-local GraphQL/OpenAPI/shared-contract artifacts | Keeps business schema ownership inside the app | platform runtime internals |
| `applications/<app>/api/graphql/schema.graphql` | `File` | App-owned schema artifact owner | Authoritative GraphQL schema/introspection input for one app | One schema owner per app | platform transport logic |
| `applications/<app>/backend-src/graphql/` | `Folder` | App-owned GraphQL runtime boundary | Resolvers/executor composition for one app | Keeps backend GraphQL ownership inside the app | platform orchestration internals beyond `runtimeControl` |
| `applications/<app>/frontend-src/generated/` | `Folder` | App-owned generated-client owner | Generated frontend types/clients for one app | Generated outputs stay with the app that owns the schema | platform-owned business schema packages |
| `applications/brief-studio/` | `Folder` | Sample app | GraphQL-backed sample teaching many runs over one `briefId` business record | Must teach the target model | session-derived business IDs |
| `applications/socratic-math-teacher/` | `Folder` | Sample app | GraphQL-backed sample teaching one long-lived `lessonId` conversational binding | Complements Brief Studio with a different app pattern | bootstrap-only placeholder behavior |

Rules:
- If the design has meaningful structural depth, usually reflect it in folders rather than flattening everything into one mixed directory.
- Do not place transport entrypoints, main-line domain/control nodes, persistence, adapters, and unrelated off-spine concerns in one flat folder when that hides ownership or structural depth.
- A compact layout is acceptable when it remains easy to read for the scope. If you keep it flatter, state why that is the clearer tradeoff.
- Folder boundaries should make ownership and structural depth easier to read, not hide them.
- Shared-layer, feature-oriented, runtime-oriented, and hybrid projections can all be valid when they make the intended ownership and flow easier to understand.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-orchestration/` | `Main-Line Domain-Control` | `Yes` | `Low` | New subsystem cleanly owns the new main concern replacing sessions |
| `autobyteus-server-ts/src/application-storage/` | `Persistence-Provider` | `Yes` | `Low` | Keep per-app and global orchestration DB bootstrap/path ownership centralized |
| `autobyteus-server-ts/src/application-engine/` | `Main-Line Domain-Control` | `Yes` | `Low` | Already a coherent worker-lifecycle owner |
| `autobyteus-server-ts/src/agent-execution/` and `src/agent-team-execution/` | `Main-Line Domain-Control` | `Yes` | `Low` | Lifecycle observation extensions stay with the execution owners rather than moving into orchestration |
| `autobyteus-web/components/applications/` | `Mixed Justified` | `Yes` | `Medium` | Acceptable because the host-side app surface is relatively compact, but remove session-centric execution subfolder to reduce mixed concerns |
| `autobyteus-application-sdk-contracts/src/` | `Mixed Justified` | `Yes` | `Medium` | Split by subject (`manifests`, `request-context`, `runtime`, `events`, `backend-definition`) instead of one overloaded `index.ts`; do not place app business schemas here |
| `applications/<app>/api/` + `frontend-src/generated/` | `Mixed Justified` | `Yes` | `Low` | This is app-local authoring/build output, not a platform subsystem; it is the correct place for app-owned schema artifacts and generated clients |

## Example App Implementation Shape

| App | Current Teaching Gap | Target App-Owned API Shape | Why It Matters |
| --- | --- | --- | --- |
| `brief-studio` | Teaches session-derived `briefId` and query/command-heavy UI flow | GraphQL-first brief/workflow API with generated client; backend resolvers own `runtimeControl` and use `executionRef = briefId` | Teaches how one business record can accumulate many runs over time |
| `socratic-math-teacher` | Teaches only a shallow runtime-target/bootstrap shape | GraphQL-first lesson/tutor API with generated client; backend resolvers start or reuse one lesson binding and project tutor turns into lesson state | Teaches how one business record can own one long-lived conversational binding |

Both apps should keep runnable built payloads in `ui/` and `backend/`, while their richer authoring roots move into app-owned source folders such as `frontend-src/`, `backend-src/`, and `api/`.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Application launch spine | `Browser -> ensure app engine -> iframe bootstrap with backendBaseUrl -> app decides later whether to create runs` | `Browser -> create application session -> auto-create one run -> iframe becomes usable only after run exists` | Shows the main product-model correction |
| Hosted virtual backend mount | `iframe generated client -> /rest/applications/<appId>/backend/graphql` (or `/routes/...`) -> gateway -> worker` | `iframe -> per-app Express server on a separate port` | Shows how apps get real backend surfaces without per-app servers |
| App-owned GraphQL codegen | `app schema.graphql -> generated frontend client in frontend-src/generated -> iframe talks through backendBaseUrl` | `platform inspects app resolvers and emits one universal business-schema package` | Shows how type safety stays with each app |
| App-owned business identity | `briefId` is created by Brief Studio and used as `executionRef`; one brief may create many bindings over time` | `briefId = brief::<applicationSessionId>` | Shows why business identity must stop deriving from platform session identity |
| Worker runtime-control boundary | `App backend resolver -> runtimeControl.startRun(...) -> ApplicationOrchestrationHostService` | `App backend resolver -> AgentRunService + TeamRunService + stores directly` | Demonstrates the authoritative-boundary rule |
| Brief Studio target sample | `Mutation.launchDraftRun(briefId)` starts or restarts a drafting run while Query.brief(briefId) returns projected artifacts/review state` | `host launch modal picks the team and the app merely reads host-retained execution state` | Teaches the “many runs over one business record” pattern |
| Socratic Math Teacher target sample | `Mutation.startLesson` creates the lesson/binding and later `askFollowUp` reuses that binding via postRunInput` | `every question requires host-side relaunch or a brand-new session identity` | Teaches the “long-lived conversational binding” pattern |
| Recovery / resume spine | `Server startup -> recovery service -> authoritative binding store -> rebuild lookup index -> restore active binding -> attach observer -> resume dispatch` | `Server startup -> resume event dispatch only -> wait for first user action to notice that bindings lost observers` | Shows why restart safety needs an explicit recovery owner rather than durable tables alone |
| Event ingress authority | `publish_artifact` and run-observer lifecycle changes both call ApplicationExecutionEventIngressService, which alone writes journal rows` | `publish_artifact -> router` and separately `orchestration host -> journal store directly` | Shows the fix for the authoritative-boundary split |
| Startup traffic / readiness coordination | `server-runtime enters ApplicationOrchestrationStartupGate -> recovery rebuilds state -> dispatch resume starts -> gate releases -> live runtimeControl/publish_artifact traffic proceeds` | `server listens -> live runtimeControl or artifact ingress mutates/lookups while recovery is clearing and rebuilding derived state` | Shows the concrete serialization rule that prevents recovery-time races |

Use this section when the design would otherwise remain too abstract.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `applicationSession` but allow many bound runs inside it | Reuse existing naming/storage/frontend surfaces | `Rejected` | Remove `applicationSession` as governing owner and replace with engine launch + run bindings |
| Keep `runtimeTarget` as an optional “simple path” alongside new orchestration | Preserve current app catalog and host launch modal | `Rejected` | Manifest v3 removes the singular launch-time runtime target requirement entirely |
| Continue sending `applicationSessionId` in request context/bootstrap “for old apps” | Avoid broad SDK/host migration | `Rejected` | Request context v2 is launch-instance-aware at most; no session-owned runtime identity remains |
| Retain platform-owned session projection/streaming alongside app-owned projection | Preserve current host-native execution workspace | `Rejected` | Remove retained session projection as the primary app view and leave domain projection to the app backend |
| Ship dual v1/v2 orchestration behavior as long-term runtime support | Reduce migration pain | `Rejected` | Use staged branch implementation, but the final shipped target removes the legacy path |

Hard block:
- Any design that depends on backward-compatibility wrappers, dual-path behavior, or retained legacy flow for in-scope replaced behavior fails review.

## Derived Layering (If Useful)

- **Browser Host Layer**
  - app catalog + engine-ready launch + iframe bootstrap
- **Application Transport / Worker Layer**
  - backend gateway + engine host + worker runtime
- **Application-Orchestration Layer**
  - runtime control, resource resolution, bindings, recovery, lifecycle observation, execution-event ingress, event dispatch
- **Concrete Execution Layer**
  - agent/team run services and runtimes
- **Persistence Layer**
  - app-owned `app.sqlite`, per-app orchestration state, per-app event journals, global derived run lookup index

This layering is explanatory only. Ownership remains the primary design rule.

## Migration / Refactor Sequence

1. **Contract-first branch change**
   - introduce manifest v3 + backend definition/runtime event/request-context v2 contracts,
   - add shared runtime orchestration types (`executionRef`, resource refs, binding summary, event envelope),
   - add iframe/bootstrap transport descriptor changes with authoritative `backendBaseUrl`, and
   - keep platform SDK/contract types schema-agnostic.

2. **Backend mount / frontend transport helpers**
   - make the hosted backend mount the explicit authoritative frontend/backend boundary,
   - keep `/graphql`, `/routes/*`, `/queries/:queryName`, and `/commands/:commandName` under that mount,
   - add optional generic frontend SDK helpers around `backendBaseUrl` + request-context v2.

3. **Server orchestration core**
   - add `application-orchestration` subsystem,
   - add per-app binding store and per-app execution-event journal store,
   - add derived global run lookup store,
   - add execution-event ingress owner, run observer owner, and recovery owner.

4. **Execution-owner lifecycle extensions**
   - add shared internal observed lifecycle type,
   - extend agent/team run managers with lifecycle subscription/dispatch,
   - expose service-level `observe...Lifecycle(...)` methods,
   - add `ApplicationBoundRunLifecycleGateway`.

5. **Worker/engine bridge**
   - extend engine IPC protocol,
   - inject `runtimeControl` into worker handler/lifecycle context,
   - expose worker-side orchestration calls through one authoritative bridge.

6. **Startup integration**
   - add `ApplicationOrchestrationStartupGate`,
   - extend `server-runtime.ts` to run orchestration startup inside `ApplicationOrchestrationStartupGate.runStartupRecovery(...)`,
   - call `ApplicationOrchestrationRecoveryService.resumeBindings()` first inside that gate,
   - then call `ApplicationExecutionEventDispatchService.resumePendingEvents()`,
   - release ready only after both succeed; treat failure as fatal.

7. **Backend gateway / host launch**
   - add explicit ensure-ready surface,
   - migrate iframe bootstrap to v2 with authoritative `backendBaseUrl`,
   - remove session launch/binding GraphQL dependency from the web host.

8. **App-owned API/schema authoring path**
   - add app-local folder guidance for schema artifacts and generated clients,
   - keep app-generated clients out of platform packages,
   - ensure GraphQL-backed and route-backed apps remain first-class.

9. **Sample app upgrades**
   - migrate Brief Studio to an app-owned GraphQL schema plus generated frontend client,
   - use real `briefId` business identity and `executionRef = briefId`,
   - migrate Socratic Math Teacher to an app-owned GraphQL lesson API plus generated frontend client,
   - teach long-lived lesson binding plus repeated `postRunInput(...)` follow-up flow.

10. **Frontend host simplification**
   - remove session store, launch modal, retained execution workspace, and session query-param binding,
   - add `applicationHostStore` and engine-first iframe launch behavior.

11. **Legacy deletion**
   - remove `application-sessions` subsystem,
   - remove session GraphQL/WS/public types,
   - remove `runtimeTarget`-driven host UI and docs,
   - remove v1 iframe bootstrap doc/types after all in-repo callers are migrated.

Temporary seams inside the branch are acceptable only as implementation scaffolding.
The shipped end state must not retain legacy dual-path behavior.

## Key Tradeoffs

- **Clean-cut replacement vs incremental extension**
  - Chosen: clean-cut replacement.
  - Why: extending `applicationSession` would preserve the wrong governing abstraction.

- **App-owned projection vs host-owned retained projection**
  - Chosen: app-owned projection.
  - Why: the user-facing business meaning belongs to the application backend, not to a generic platform-retained session snapshot.

- **Worker-side orchestration via bridge vs direct host/service access**
  - Chosen: bridge.
  - Why: preserves clear boundaries and avoids boundary bypass from worker code into host internals.

- **Per-app authoritative binding state + derived global lookup index vs pure global authority**
  - Chosen: per-app authoritative store plus derived global lookup index.
  - Why: per-app state keeps application ownership clear, while the derived global index keeps runtime-originated event routing efficient and rebuildable.

- **Eager recovery of nonterminal bindings vs lazy reattachment on first use**
  - Chosen: eager recovery.
  - Why: lifecycle/publication guarantees are not trustworthy if observers are missing after restart until some later touch path happens.

- **Explicit startup gate vs relying only on pre-`listen()` completion**
  - Chosen: explicit startup gate.
  - Why: correctness should not depend on raw socket-bind timing, and the current runtime may still need to bind/listen before some non-orchestration startup tasks complete.

- **App-owned business schema vs platform-owned universal business schema**
  - Chosen: app-owned business schema.
  - Why: the platform should host and route applications, not reinterpret their business meaning.

- **Hosted virtual backend mount vs per-app HTTP server**
  - Chosen: hosted virtual backend mount.
  - Why: keeps deployment/runtime ownership centralized while still giving each app a real backend API namespace.

- **GraphQL/routes as first-class app choices vs query/command-only teaching model**
  - Chosen: GraphQL/routes remain first-class; queries/commands stay optional conveniences.
  - Why: real apps need schema/codegen freedom and should not be forced into one transport style.

- **Upgrade sample apps in-scope vs leave them as historical/thin demos**
  - Chosen: upgrade them in-scope.
  - Why: leaving the old samples unchanged would keep teaching the wrong ownership and API model.

- **Removing host launch modal vs preserving a generic run-launch shortcut**
  - Chosen: remove host low-level launch modal.
  - Why: orchestration should live in app logic, not in the generic application host.

## Risks

- The worker->host orchestration bridge must stay disciplined and must not become a generic service locator.
- Execution-owner lifecycle extensions must be implemented consistently across agent and team paths; otherwise the recovery/observer story weakens again.
- Removing the host-native retained execution workspace is architecturally correct, but product stakeholders should expect the browser host to feel simpler and more app-first afterward.
- Shared resource authorization remains open and should not be smuggled into this design as accidental hardcoded policy.
- In-repo app/sample migration is mandatory; otherwise the codebase will keep teaching the old model.

## Guidance For Implementation

- Start with shared contract/types design; the server, web host, and SDK migrations all depend on that vocabulary being correct.
- Keep `backendBaseUrl` authoritative in iframe bootstrap v2; derive GraphQL/query/command/route URLs from it instead of creating parallel sources of truth.
- Keep frontend SDK helpers schema-agnostic. They may help apps talk to the hosted backend mount, but they must not own app business DTOs or generated clients.
- Keep app-owned GraphQL/OpenAPI/shared-contract artifacts inside each application workspace and generate frontend clients there during the app build.
- Implement execution-event ingress, lifecycle gateway, and recovery before removing session paths. Those owners define whether the new orchestration core is truly restart-safe.
- Implement `ApplicationOrchestrationStartupGate` together with recovery and ingress wiring; startup safety is incomplete until live `runtimeControl` and live artifact ingress both honor the same gate.
- Keep `runtimeControl` narrow and subject-owned. If an app asks for more power, add it to the orchestration boundary rather than bypassing it.
- Reuse existing `AgentRunService` / `TeamRunService` as the execution-resource layer; do not push app-owned binding logic downward into them.
- When migrating Brief Studio, use a real `briefId` as business identity, expose GraphQL as the primary app business API, and bind runs to `executionRef = briefId`.
- When migrating Socratic Math Teacher, teach a lesson-centric GraphQL flow whose follow-up mutations reuse one binding via `runtimeControl.postRunInput(...)`.
- Remove legacy code aggressively once the new path is integrated; do not leave `applicationSession` or `runtimeTarget` as parallel long-term shapes.
