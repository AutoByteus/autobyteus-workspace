# Design Spec

Write this artifact to a canonical file path in the assigned task workspace before any handoff message.

## Current-State Read

The current AutoByteus repository already implements a substantial portion of the article's agent-native application model, but the implemented ownership stops at the boundary where imported applications would need their own backend logic and durable domain state.

### Current architecture mapped to the article

#### 1. Application Logic — partially implemented already
Current implemented owners:
- `autobyteus-server-ts/src/application-bundles/*`
  - application discovery
  - manifest validation
  - canonical application ids
  - transport-neutral asset paths
  - embedded application-owned agent/team registration
- `autobyteus-server-ts/src/application-capability/*`
  - node-owned Applications capability gating
- `autobyteus-server-ts/src/application-sessions/*`
  - backend-owned application-session lifecycle
  - route binding
  - retained session snapshots
  - typed runtime publication projection
- `autobyteus-web/stores/applicationStore.ts`
- `autobyteus-web/stores/applicationSessionStore.ts`
- `autobyteus-web/components/applications/ApplicationShell.vue`

What is still missing on the application-logic side:
- durable app-owned domain state
- durable session history beyond process lifetime
- app-owned repositories/services/models
- app-owned backend APIs
- app-owned persistence/event handling

#### 2. Application Agent Runtime — already integrated, but only through the host platform
Current implemented owners:
- application bundles embed agents/teams inside the same owning bundle
- `ApplicationSessionService` launches agent or team runs
- launch context is injected into the runtime via `applicationSessionContext`
- runtime promotes application-visible state through `publish_application_event` (current implementation still exposes `MEMBER_ARTIFACT` / `DELIVERY_STATE` / `PROGRESS` as agent-facing families, which this target design removes from the author-facing v1 model)
- current import validation still lets malformed application-owned agent definitions survive import and fail only at launch, which this target design tightens.

What is missing:
- imported app backend logic runtime separate from the core server
- app-owned event handling around promoted runtime events
- app-owned domain logic that reacts to runtime events and persists app-specific data

#### 3. Layered UI Rendering — partially implemented
Current implemented layers:
- `Application` view: bundle iframe hosted by `ApplicationIframeHost.vue`
- `Execution` view: host-native retained artifact/progress view in `ApplicationExecutionWorkspace.vue`

What is missing:
- app-author-facing frontend SDK over the raw iframe/bootstrap/session transport details
- fuller execution layering for selected agent artifact vs execution-log inspection
- clean app backend client access for the app-specific application view

#### 4. Delivery / Promotion Boundary — already the strongest implemented foundation
Current implemented owners:
- `publish_application_event`
- `application-publication-validator.ts`
- `application-publication-projector.ts`
- `ApplicationSessionService.publishFromRuntime()`
- application-session snapshot stream

What is still missing:
- durable ordered journal for promoted events
- backend app event dispatch from normalized promoted events
- one explicit authoritative publication owner instead of publication work living implicitly inside session service methods

### Current application page-shell UX weakness

The host already separates `Application` and `Execution` modes structurally, but the page chrome still teaches the wrong default mental model.

Observed current shape:
- `ApplicationShell.vue` renders a large metadata-first header before the app iframe
- the same shell also renders a bound-session card with raw `applicationSessionId`, runtime kind, `runId`, and binding resolution above the tabs
- `ApplicationExecutionWorkspace.vue` already owns member/runtime/artifact inspection, so the page is effectively showing operational data twice
- `applications/brief-studio/ui/index.html` also foregrounds application ids, session id, runtime id, and backend URLs in the sample hero

Why this is a design problem:
- `Application View` is supposed to be the delivered app surface, not a diagnostic preamble
- operational metadata that is useful for support/debugging is currently consuming the same visual priority as the app UI itself
- the current single-live-session-per-application model is not reflected clearly enough in the UX, so raw session ids become more visible than the actual user intent (`Launch` vs `Relaunch`)

Target implication:
- `ApplicationShell.vue` needs an explicit page-shell ownership model for `Application View`, `Execution View`, and secondary details/debug presentation
- the default launched-app path must prioritize app identity, description, live-status, and primary actions only
- runtime/package/debug metadata must be intentionally demoted into secondary surfaces

### Current execution path

Today the real primary spine is:

`Package Import -> ApplicationBundleService -> ApplicationSessionService -> Agent/Team Runtime -> publish_application_event -> retained in-memory projection -> session stream -> Application View / Execution View`

That is already much stronger than a plugin/iframe shell architecture.

### Current hard constraints the target design must respect

1. **Runtime neutrality already belongs to the server layer**
   - `autobyteus-server-ts/src/runtime-management/runtime-kind-enum.ts` already defines server-owned runtime kinds.
   - The future app platform must therefore belong to the server/web platform boundary, not `autobyteus-ts`.

2. **Authoritative filesystem/data-dir ownership already belongs to `AppConfig`**
   - `autobyteus-server-ts/src/config/app-config.ts` already owns app-data, db, logs, and temp directory derivation.
   - App storage derivation must extend that authority instead of inventing a second path owner.

3. **Managed child-process patterns already exist**
   - `codex-app-server-client.ts` and `messaging-gateway-process-supervisor.ts` show existing process supervision / stdio RPC / readiness-health patterns.
   - The target Application Engine should reuse this style instead of inventing a completely alien host-runtime pattern.

4. **The current bundle contract is still frontend-static + embedded-runtime only**
   - `application.json` currently knows only `ui.entryHtml`, `icon`, and `runtimeTarget`.
   - There is no backend application module contract yet.

5. **Current application session state is in-memory only**
   - `ApplicationSessionService` stores session snapshots and active-session indexes in memory maps.
   - The target design must replace this with durable platform-owned state for the in-scope replaced behavior.

## Intended Change

Transform AutoByteus from a bundle-hosting + runtime-viewing application shell into a platform for **platform-hosted real apps**.

### Design thesis

Each imported app should be allowed to own:
- frontend rendering
- backend application logic
- domain model and tables
- repositories and services
- read models / projections
- event-handling logic
- API style (`query/command`, REST-like routes, GraphQL)

But AutoByteus must remain the owner of:
- application installation/import
- bundle validation
- application session lifecycle
- runtime/session integration
- publication normalization and promotion boundary
- App Engine / worker hosting
- database provisioning and migration execution
- frontend/backend transport and auth boundary
- host-native execution visibility and observability

### Core design rule

**Imported apps get maximum freedom in app logic, data modeling, and UI, while AutoByteus retains ownership of hosting, lifecycle, runtime integration, storage provisioning, and transport boundaries.**

### Clean target model

`Platform-hosted real app = app-owned logic/data/UI + platform-owned execution/runtime/storage/gateway hosting`

### Publication simplification rule

**Agents publish artifacts; the platform attaches provenance; the application decides what those artifacts mean.**

Target v1 consequence:
- no separate author-facing `memberArtifact`, `deliveryState`, or `progress` publication families;
- no requirement that app authors model runtime progress states just to integrate with the platform;
- host/session lifecycle events remain platform-generated rather than app-authored.

### Structural consequence

The article's top-level decomposition becomes concrete in AutoByteus as:

1. **Application Logic**
   - split into platform-owned application logic and app-owned application logic
2. **Application Agent Runtime**
   - existing agent/team runtime plus promoted event bridge
3. **Layered UI Rendering**
   - app-owned Application View + host-owned Execution View
4. **Delivery / Promotion Boundary**
   - one authoritative publication owner that promotes runtime events into host-visible state and app-consumable normalized events

## Terminology

- `Application Package Root`: registered source root that contains an `applications/` container whose direct children may be discovered as application roots.
- `Application Root`: directory containing a valid `application.json`; all manifest-relative paths resolve from this directory.
- `Application Bundle`: one installable application rooted at an application root and containing the app manifest, static UI assets, backend payload, and optional embedded agent/team definitions.
- `Application ID`: current canonical platform identity for one installed application on a node. In v1 this is also the installation identity because the platform supports only one installed instance per canonical application.
- `Application Installation Identity`: future-safe term for per-install identity. In v1 this collapses to `applicationId`.
- `ApplicationPackageService`: authoritative owner for listing, importing, removing, and refreshing application package sources at the product-facing/service-facing boundary.
- `Application Engine`: platform-managed runtime host for one installed app. It owns worker lifecycle but not app business logic.
- `Application Worker Runtime`: worker-side runtime that loads the imported app backend definition and dispatches platform calls into the app-owned code.
- `Application Frontend SDK`: author-facing browser SDK that hides iframe/bootstrap/session transport/platform backend plumbing.
- `Application Page Shell`: host-side page-level boundary, governed by `ApplicationShell.vue`, that owns the default app-first page chrome, the `Application` vs `Execution` mode split, action placement, and the placement of secondary details/debug metadata.
- `Application Details Surface`: explicit secondary surface for operational metadata such as package provenance, writable/source state, runtime target id, current session id, and run id. It is not the primary launched-app surface.
- `Developer Diagnostics Surface`: explicit developer/debug-only surface for raw transport URLs, asset paths, or similar internals. This is not shown by default in the normal Application View.
- `Application Launch Surface`: host-side boundary from resolved live session to stable iframe bootstrap delivery. In the target design this is governed by `ApplicationSurface.vue`, which owns launch descriptor identity, `launchInstanceId`, retry/remount policy, and visual launch state.
- `Application Iframe Launch Descriptor`: immutable host-derived descriptor for one iframe launch instance: entry HTML URL, expected iframe origin, normalized host origin, application session id, contract version, and host-generated `launchInstanceId`.
- `Application Launch Instance`: one concrete iframe launch attempt for a given live `applicationSessionId`. Explicit retry/relaunch creates a new `launchInstanceId` even when the live session id remains the same.
- `Application Backend SDK`: author-facing Node SDK that defines the exported app backend contract and injected platform context.
- `Application Publication Service`: authoritative owner for runtime publication validation, normalization, ordered journal append, retained host projection update, and session-stream publication.
- `Artifact Publication`: the only primary author-facing runtime publication in target v1, emitted when an agent/runtime member produces an artifact. The platform enriches it with application/session/producer provenance before it becomes a normalized event.
- `Promoted Runtime Event`: normalized application-visible event derived from artifact publications plus platform-generated lifecycle events such as session start/termination.
- `Application Backend Gateway`: platform-owned boundary through which the app frontend reaches app backend capabilities.
- `Application Request Context`: explicit context accompanying backend requests, including app identity and optional live `applicationSessionId` when the request is session-aware.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: identify obsolete legacy paths/files included in this scope.
- Treat removal as first-class design work: when clearer subsystem ownership, reusable owned structures, or tighter file responsibilities make fragmented or duplicated pieces unnecessary, name and remove/decommission them in scope.
- Decision rule: the design is invalid if it depends on compatibility wrappers, dual-path behavior, or legacy fallback branches kept only for old behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | `Primary End-to-End` | `Application package management UI action` | `Validated application installation catalog entry` | `ApplicationPackageService` | Defines how one application package source is registered under application-specific ownership and then refreshed into valid application catalog entries. |
| `DS-002` | `Primary End-to-End` | `App frontend UI action` | `App service / app DB result` | `ApplicationBackendGatewayService` | Main app-specific backend request path; this is how app-owned logic is reached without bypassing platform hosting. |
| `DS-003` | `Primary End-to-End` | `Host launch flow` | `Live agent/team application session` | `ApplicationSessionService` | Main runtime launch and binding path for agent-native app execution. |
| `DS-010` | `Primary End-to-End` | `Application screen activation with a resolved live session` | `Bootstrap payload delivered to the stable iframe launch instance` | `ApplicationSurface` | Defines the host-side launch/iframe/bootstrap spine so a live session actually becomes a usable bundled app surface. |
| `DS-013` | `Primary End-to-End` | `Application route activation with an application entry` | `App-first page shell with intentional Application / Execution / Details placement` | `ApplicationShell` | Defines how the host presents the launched app, execution inspection, and secondary metadata without letting diagnostics dominate the default page. |
| `DS-014` | `Primary End-to-End` | `Execution-view user chooses deeper inspection` | `Main workspace monitor focused on the corresponding run/member` | `WorkspaceRouteSelectionController` | Defines how Applications hands users off to the existing workspace monitor without rebuilding that monitor inside the Applications module. |
| `DS-011` | `Return-Event` | `Iframe ready / timeout / contract failure signal` | `Host launch visual state` | `ApplicationSurface` | Captures how the host turns iframe bootstrap events into waiting, failed, or bootstrapped UI state without mutating session-domain truth. |
| `DS-012` | `Bounded Local` | `Committed launch descriptor` | `Bootstrapped | failed | explicit relaunch` | `ApplicationSurface` | Launch descriptor stability, `launchInstanceId`, timeout, and retry/remount rules are a meaningful local state machine. |
| `DS-004` | `Primary End-to-End` | `Runtime publication` | `Retained host projection + durable publication journal` | `ApplicationPublicationService` | Core delivery/promotion boundary from runtime internals into app-visible and host-visible state. |
| `DS-005` | `Primary End-to-End` | `Durable publication journal record` | `App-owned event handler side effects in app DB` | `ApplicationPublicationService` | Connects promoted runtime events into app-owned domain state without making the worker the publication authority. |
| `DS-006` | `Return-Event` | `App worker response / notification` | `Frontend SDK / app UI` | `ApplicationBackendGatewayService` | Captures how app backend output and notifications return to the application-specific frontend surface. |
| `DS-007` | `Return-Event` | `Retained host session projection` | `Execution View / frontend SDK runtime subscription` | `ApplicationPublicationService` | Ensures host-native execution surfaces and SDK runtime subscriptions observe the same authoritative promoted state. |
| `DS-008` | `Bounded Local` | `Application Engine ensureRunning request` | `Engine state ready / failed` | `ApplicationEngineHostService` | Application Engine startup, storage preparation, worker spawn, definition validation, and readiness are a meaningful internal state machine. |
| `DS-009` | `Bounded Local` | `Pending journal cursor` | `Dispatched / retried journal cursor` | `ApplicationPublicationDispatchService` | Durable dispatch from promoted events to app-owned event handlers must remain ordered and retryable without blocking host projection. |

## Primary Execution Spine(s)

`Application Packages UI -> applicationPackagesStore -> ApplicationPackageResolver -> ApplicationPackageService -> ApplicationBundleService -> Application Catalog / Installation Identity`

`Application route -> ApplicationShell -> app-first page chrome -> ApplicationSurface | ApplicationExecutionWorkspace | ApplicationDetailsSurface`

`Execution View action -> ApplicationExecutionWorkspace -> WorkspaceNavigationService -> /workspace route -> WorkspaceRouteSelectionController -> TeamWorkspaceView | AgentWorkspaceView`

`Application View -> Frontend SDK -> ApplicationBackendGatewayService -> ApplicationEngineHostService -> App Worker Runtime -> App Repositories / Services -> App DB`

`Launch UI -> ApplicationSessionService -> AgentRunService / TeamRunService -> Live Runtime`

`ApplicationShell / route binding -> ApplicationSurface -> stable ApplicationIframeLaunchDescriptor -> ApplicationIframeHost -> ready acceptance -> bootstrap delivery -> Frontend SDK activation`

`Live Runtime -> publish_artifact -> ApplicationPublicationService -> Journal + Host Projection -> Session Stream`

`Publication Journal -> ApplicationPublicationDispatchService -> ApplicationEngineHostService -> App Worker Event Handler -> App Services -> App DB`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | Application package import/list/remove lives behind one application-specific boundary. That boundary registers application package roots, triggers refresh, and then delegates bundle-level discovery/validation/catalog work to `ApplicationBundleService` without reusing agent-package naming or APIs. Bundle validation must fail fast when embedded application-owned agents or teams are malformed so broken apps do not appear importable-but-unlaunchable. | `ApplicationPackagesManager`, `applicationPackagesStore`, `ApplicationPackageResolver`, `ApplicationPackageService`, `ApplicationBundleService`, `application installation catalog` | `ApplicationPackageService` | package-source acquisition, root registry store, bundle refresh trigger, manifest/backend parsers, embedded runtime integrity validation |
| `DS-002` | The app-specific frontend talks to a platform-owned gateway instead of directly to worker internals or server repositories. The gateway ensures the app engine is running, resolves request context, forwards the request to the worker, and returns the app-owned result. | `App UI`, `Frontend SDK`, `ApplicationBackendGatewayService`, `ApplicationEngineHostService`, `App Worker Runtime`, `App Services` | `ApplicationBackendGatewayService` | worker RPC client, notification stream service, request-context resolver, exposure adapters |
| `DS-003` | The host launch flow still owns runtime session creation. It launches an agent/team runtime for the selected app and persists one live application session binding that the host shell and app-specific UI can both reference. | `ApplicationShell`, `ApplicationSessionStore`, `ApplicationSessionService`, `AgentRunService / TeamRunService` | `ApplicationSessionService` | launch-config builder, active-session index, runtime context injection |
| `DS-010` | Once the route is bound to a live app session, one host-side launch surface owns the iframe launch descriptor, commits a single `launchInstanceId`, waits for the matching ready signal, and then delivers bootstrap exactly to that launch instance. Ordinary session stream updates do not recreate the iframe. | `ApplicationShell`, `ApplicationSessionStore`, `ApplicationSurface`, `ApplicationIframeHost`, `Frontend SDK bootstrap` | `ApplicationSurface` | launch-descriptor builder, host-origin normalizer, ready-timeout owner, retry/remount policy |
| `DS-013` | The page-level application shell presents the launched app as the primary surface. It shows app identity and primary actions up front, routes operational metadata into secondary details/debug affordances, and keeps runtime/member inspection inside `Execution View` instead of crowding the default launched-app presentation. | `ApplicationShell`, `ApplicationSurface`, `ApplicationExecutionWorkspace`, `ApplicationDetailsSurface` | `ApplicationShell` | page-mode state, details-panel visibility, single-live-session UX copy, metadata classification |
| `DS-014` | Application-owned execution inspection stops at the retained member/artifact view. When the user wants full runtime monitoring, Applications emits one explicit workspace-open intent and the workspace route owner resolves that into the existing team/agent monitor selection path. | `ApplicationExecutionWorkspace`, `WorkspaceNavigationService`, `/workspace route`, `WorkspaceRouteSelectionController`, `TeamWorkspaceView | AgentWorkspaceView` | `WorkspaceRouteSelectionController` | route-query parser, run/member open coordinator, breadcrumb/origin metadata |
| `DS-011` | Ready, timeout, contract-mismatch, and retry signals return into host launch visual state through the same launch owner instead of writing bootstrap state into shared session-domain truth. | `ApplicationIframeHost`, `ApplicationSurface`, `launch visual state` | `ApplicationSurface` | failure-state mapper, timeout scheduler, retry action |
| `DS-012` | The host launch surface has a local state machine: commit descriptor -> wait for ready -> post bootstrap -> bootstrapped, with explicit retry creating a new `launchInstanceId`. `load` events are diagnostic only and must not restart the state machine. | `ApplicationSurface`, `ApplicationIframeHost`, `ApplicationIframeContract` | `ApplicationSurface` | descriptor equality helper, launch-instance generator, timeout/cancellation handling |
| `DS-004` | Artifact publications and platform lifecycle events cross one authoritative promotion boundary. They are validated, normalized, written durably, projected into host-visible retained state, and published to host subscribers before any app-owned event handler side effects run. | `Runtime`, `publish_artifact`, `ApplicationPublicationService`, `ApplicationSessionStateStore`, `ApplicationSessionStreamService` | `ApplicationPublicationService` | publication validator, projector, journal store, stream publisher |
| `DS-005` | Normalized promoted events are dispatched asynchronously from the durable journal to the app worker, where app-owned event handlers may update app domain tables and read models. Host projection is not blocked on worker success. | `ApplicationPublicationDispatchService`, `ApplicationEngineHostService`, `App Worker Runtime`, `App Event Handler`, `App DB` | `ApplicationPublicationService` | dispatch cursor store, retry policy, worker invoke adapter |
| `DS-006` | App backend results and notifications flow back through the same platform-owned gateway, so app UIs can use REST/GraphQL/query-command patterns while transport ownership stays with AutoByteus. | `App Worker Runtime`, `ApplicationBackendGatewayService`, `Frontend SDK`, `App UI` | `ApplicationBackendGatewayService` | response mapper, notification stream service, auth/session context adapter |
| `DS-007` | The host-native execution surface and any SDK runtime subscriptions consume the same promoted session state instead of raw runtime traces, keeping the article's delivery/promotion boundary explicit. | `ApplicationPublicationService`, `ApplicationSessionStreamService`, `Execution View`, `Frontend SDK runtime stream` | `ApplicationPublicationService` | stream fan-out, session snapshot serializer |
| `DS-008` | The application engine has an internal state machine: ensure storage, migrate, spawn worker, load app definition, validate exposures, and mark ready or failed. This loop is important but stays behind one owner. | `ApplicationEngineHostService`, `ApplicationStorageLifecycleService`, `ApplicationWorkerSupervisor`, `ApplicationEngineClient` | `ApplicationEngineHostService` | migration lock, worker readiness, idle shutdown policy |
| `DS-009` | Durable journal dispatch to the app backend is an internal retry loop, not the main product spine. It exists so app-owned event handling can lag or fail without corrupting publication authority. | `ApplicationPublicationDispatchService`, `journal cursor store`, `ApplicationEngineHostService` | `ApplicationPublicationService` | backoff scheduler, error classifier, engine wake-up trigger |

## Spine Actors / Main-Line Nodes

- `ApplicationPackageService`
- `ApplicationBundleService`
- `ApplicationBackendGatewayService`
- `ApplicationEngineHostService`
- `ApplicationWorkerRuntime`
- `ApplicationSessionService`
- `ApplicationPublicationService`
- `ApplicationShell`
- `ApplicationSurface`
- `ApplicationIframeHost`
- `ApplicationDetailsSurface`
- `App Repositories / Services`
- `App DB`
- `Execution View`
- `Application View / Frontend SDK`

## Ownership Map

- `ApplicationPackageService`
  - Owns application-package source list/import/remove flows, product-facing application import intent, and refresh handoff into bundle discovery.
  - Must remain separate from agent-package product intent even if some source-acquisition mechanics are shared.
- `ApplicationBundleService`
  - Owns discovery of application roots from registered application package roots, manifest validation, canonical app identity, backend payload validation, and embedded runtime integrity.
  - Embedded runtime integrity includes fail-fast validation of application-owned agent definitions and team definitions; malformed application-owned runtime assets must reject package import/refresh instead of being silently skipped until launch.
- `ApplicationBackendGatewayService`
  - Owns transport/auth/request-context boundary for app backend exposures.
  - Governs how query/command/route/GraphQL requests reach app code.
- `ApplicationEngineHostService`
  - Owns app engine lifecycle for one installed application.
  - Governs storage preparation, worker readiness, worker restart, idle shutdown, and worker invocation.
- `ApplicationWorkerRuntime`
  - Owns worker-local loading of the imported backend module and invocation of app-owned handlers.
  - Does **not** own migration, storage path selection, or gateway authority.
- `ApplicationStorageLifecycleService`
  - Owns app storage root derivation, reserved-table bootstrap, DB creation, migration locking, migration execution, and injected storage context.
- `ApplicationSessionService`
  - Owns live agent/team application-session lifecycle, launch/bind/terminate/send-input boundaries, and live session identity.
- `ApplicationPublicationService`
  - Owns publication validation, normalization, durable append ordering, retained host projection update, and session-stream publication.
  - This is the authoritative delivery/promotion owner.
- `ApplicationPublicationDispatchService`
  - Owns durable off-spine dispatch from publication journal to app-owned event handlers.
  - Must not bypass `ApplicationPublicationService` for projection authority.
- `ApplicationShell`
  - Owns page-level application chrome, default app-first presentation, mode switching, and placement of secondary details/debug metadata.
  - Governs how the single-live-session model is presented to users (`Launch`, `Relaunch`, `Stop current session`) without making raw session ids the primary default concept.
- `ApplicationSurface`
  - Owns the host-side application launch surface after a live app session is resolved.
  - Governs stable `ApplicationIframeLaunchDescriptor` identity, `launchInstanceId`, iframe remount policy, timeout ownership, bootstrap waiting/ready/failed state, and the boundary between host bootstrap completion and app-local initial loading.
- `ApplicationIframeHost`
  - Owns only the internal iframe DOM + message bridge needed by `ApplicationSurface`.
  - Does **not** own session truth, retry policy, or cross-session bootstrap state.
- `Execution View`
  - Owns host-native execution rendering over promoted retained session state.
- `Frontend SDK`
  - Owns app-author-facing browser contract over host bootstrap, app backend calls, and runtime/session subscriptions.
- `Backend SDK`
  - Owns app-author-facing backend definition contract over worker protocol and injected platform context.

If a public facade exists, it is named below explicitly; otherwise the governing owner above is the actual authority.

## Application Package Management Boundary

### Product-facing surface

- **Settings / Application Packages** is the authoritative user-facing surface for:
  - listing application package sources,
  - importing one application package source from a local path or GitHub URL,
  - removing one previously registered application package source.
- **Applications catalog / Applications page** is for browsing and launching discovered applications, not for owning package-source registration.

### Higher-layer ownership split

- `ApplicationPackagesManager` (UI)
  - owns application-package-management user interaction only
- `applicationPackagesStore`
  - owns frontend state for application-package list/import/remove flows
- `ApplicationPackageResolver` / application-package API surface
  - owns transport-level application-package operations
- `ApplicationPackageService`
  - owns product/domain intent for application package management
- `ApplicationBundleService`
  - remains subordinate for discovery/validation/catalog refresh once package roots are registered

### Explicit anti-shape

Reject this long-term shape:

`Applications import UI -> AgentPackagesManager -> AgentPackageService -> ApplicationBundleService`

Why it is wrong:
- product intent is mixed at the top layer;
- application import ownership becomes implicit instead of explicit;
- the authoritative boundary rule is weakened because application callers depend on an agent-focused boundary and then rely on application side effects beneath it.

### Shared lower-level support rule

The design still allows sharing below the higher-layer boundary, but only for mechanism-level concerns such as:
- local path normalization,
- GitHub repository source normalization,
- archive download / clone / extraction mechanics,
- low-level root-registration persistence helpers when they stay concern-agnostic.

Do **not** answer this by creating one generic mixed-intent top-layer `PackageService`.

## Embedded Application-Owned Runtime Validation Rule

Application package validation is not complete unless it validates embedded application-owned runtime assets transitively.

Required fail-fast rule:
- if any application-owned `agent.md` or `agent-config.json` is malformed, unreadable, or semantically invalid for runtime use, package validation/import/refresh fails;
- if any application-owned team definition is malformed or references invalid/missing application-owned members, package validation/import/refresh fails;
- the platform must not silently skip malformed application-owned agents and then surface a missing canonical agent id later during launch preparation.

Why:
- users interpret a successful import as meaning the app is launchable;
- launch-time `missing agent definition` errors caused by previously skipped malformed app-owned agents are a validation-boundary failure, not just a sample-authoring mistake.

Scope note:
- this rule does not require the platform to execute app code at import time;
- it does require the platform to parse and validate all embedded agent/team definition files that the bundle claims to own.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ApplicationResolver` / bundle REST asset route | `ApplicationBundleService` | expose catalog/detail/assets over GraphQL + REST | bundle parsing policy, installation identity, backend payload validation |
| `ApplicationSessionResolver` / websocket route | `ApplicationSessionService` + `ApplicationPublicationService` | expose session lifecycle and promoted session snapshots | publication ordering, run launch policy, projection persistence |
| `ApplicationBackendGateway` REST/WS routes | `ApplicationBackendGatewayService` | platform transport boundary for app backend exposures | worker lifecycle, storage bootstrap, migration policy |
| `Frontend SDK` browser client | `ApplicationBackendGatewayService` + `ApplicationSessionService` | author-facing boundary over host bootstrap and backend/runtime calls | raw iframe contract, endpoint plumbing, host transport quirks |
| `Backend SDK` `defineApplication()` contract | `ApplicationWorkerRuntime` | author-facing backend definition contract | worker RPC protocol, migration execution, host lifecycle |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Application import routed through `AgentPackagesManager` / `AgentPackageService` | application import is a separate product/domain intent and needs its own authoritative boundary | `ApplicationPackagesManager`, `applicationPackagesStore`, `ApplicationPackageResolver`, `ApplicationPackageService` | `In This Change` | Keep only lower-level source-acquisition utilities shared where truly mechanism-level |
| Static-only application bundle contract (`application.json` with no backend payload) | Imported apps are now platform-hosted real apps with backend capability, even if the backend is a no-op bundle | `application.json` manifest v2 + `backend/bundle.json` contract | `In This Change` | Existing repo-local sample app packages migrate to v2 with a no-op backend entry when needed |
| App-author dependence on raw `ApplicationIframeContract.ts` / raw session transport details | Raw bootstrap/plumbing should not remain the author boundary | `autobyteus-application-frontend-sdk` | `In This Change` | Host contract stays internal; SDK becomes the public boundary |
| In-memory-only application session state as authoritative source | Host session history, bindings, and projections need durable authority | `ApplicationSessionStateStore` backed by hidden platform DB reserved tables | `In This Change` | Current map-based authority is removed for replaced behavior |
| `bootstrapState` / `bootstrapError` embedded in `ApplicationSession` frontend state and mutated from `applicationSessionStore` | Host launch/bootstrap state is not session-domain truth and destabilizes iframe lifecycle when it rides on reactive session snapshots | `ApplicationSurface` launch-state machine + internal `ApplicationIframeLaunchDescriptor` owner | `In This Change` | Session store keeps binding/snapshot truth only; host launch state becomes a separate owner |
| Publication handling embedded directly inside `ApplicationSessionService.publishFromRuntime()` | Publication authority needs one explicit owner with journal/projection ordering | `ApplicationPublicationService` | `In This Change` | Session service delegates to publication service |
| Stale compile-time web app remnants under `autobyteus-web/applications/*` | App-specific UIs should arrive as imported bundle assets + frontend SDK apps | bundle UI + frontend SDK | `Follow-up` | Remove stale tests/leftovers once replacement sample app exists |

## Return Or Event Spine(s) (If Applicable)

- `App Worker Response -> ApplicationBackendGatewayService -> Frontend SDK -> App UI`
- `ApplicationBackendNotificationService -> Frontend SDK -> App UI`
- `ApplicationSessionStateStore -> ApplicationSessionStreamService -> Execution View / Frontend SDK runtime subscription`
- `ApplicationIframeHost ready/timeout/contract signal -> ApplicationSurface launch state -> bundled iframe bootstrap delivery or host failure UI`

## Bounded Local / Internal Spines (If Applicable)

### `DS-008` Application Engine startup state machine
Parent owner: `ApplicationEngineHostService`

`ensureRunning -> ensureStoragePrepared -> spawnWorker -> loadDefinition -> validateExposures -> ready | failed`

Why it matters:
- app DB creation and migration must happen before backend readiness
- worker readiness must be separated from app session creation
- backend gateway and publication dispatch both depend on this owner

### `DS-009` Publication dispatch retry loop
Parent owner: `ApplicationPublicationDispatchService`

`read next journal sequence after last ack -> build stable dispatch envelope -> ensureEngineRunning -> invokeWorkerEventHandler(eventId, attemptNumber) -> durable ack cursor advance | record failure state + schedule retry`

Contract:
- `ApplicationPublicationService` assigns one stable `eventId` and one monotonically increasing `journalSequence` when the normalized promoted event is durably appended.
- `ApplicationPublicationDispatchService` dispatches one journal record at a time per application in ascending `journalSequence` order.
- Delivery semantics are `at-least-once`.
- Retries reuse the same `eventId` and `journalSequence`; only `delivery.attemptNumber`, `delivery.dispatchedAt`, and failure metadata change.
- Cursor advance happens only after the worker reports handler success and the host durably records the ack. If success happens inside the worker but the ack write fails or the host crashes first, the same event is retried.
- Missing handler for the event family is treated as an acknowledged no-op so optional handlers do not wedge the journal.
- Retryable failures (worker unavailable, transient handler error, host restart before ack) leave the cursor unchanged and schedule exponential backoff. Contract/configuration failures pause dispatch and surface degraded status until repaired; v1 does not auto-skip poisoned records.

Why it matters:
- worker-side event handling must be retryable without corrupting publication authority
- host execution rendering must not block on app backend handler success
- app handlers therefore need stable event identity and idempotent side effects

### `DS-012` Application launch surface state machine
Parent owner: `ApplicationSurface`

`commit stable launch descriptor + launchInstanceId -> mount/reuse iframe -> wait for matching ready event -> post bootstrap -> bootstrapped | timeout / contract failure | explicit retry (new launchInstanceId)`

Contract:
- the host computes one immutable `ApplicationIframeLaunchDescriptor` for each launch instance; it includes the absolute entry HTML URL, expected iframe origin, normalized host origin, live `applicationSessionId`, contract version, and host-generated `launchInstanceId`.
- the ready-timeout clock starts when the descriptor is committed, not when DOM `load` fires.
- `iframe load` is diagnostic only; it must never reset the handshake or create a new launch instance by itself.
- a ready signal is accepted only when `event.source`, iframe origin, `applicationSessionId`, and `launchInstanceId` all match the current descriptor.
- explicit retry/relaunch creates a new `launchInstanceId`; stale ready/bootstrap messages from earlier launch instances are ignored.
- host bootstrap completion ends when the bootstrap envelope is delivered to the matching iframe launch instance. Any first query / initial read-model load after that belongs to app-local UI state, not to host bootstrap state.

Why it matters:
- Electron packaged launches must survive normal reactive updates without remounting the iframe accidentally.
- ready events can arrive before or alongside DOM `load`, so `load` cannot remain the state-machine authority.
- packaged-host (`file://`) runs need one explicit reviewed contract instead of ambient browser/electron origin behavior.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Application package root registry store | `DS-001` | `ApplicationPackageService` | persist and enumerate registered application package roots | keeps product-facing application-package ownership above discovery internals | would collapse package-source management into bundle discovery |
| Backend manifest parser | `DS-001` | `ApplicationBundleService` | parse/validate `backend/bundle.json` | keeps bundle validation explicit | would bloat bundle service with file-format detail |
| Embedded runtime integrity validator | `DS-001` | `ApplicationBundleService` | ensure app-owned agent/team references stay inside bundle | bundle correctness boundary | would obscure discovery main line |
| Worker RPC client | `DS-002`, `DS-005`, `DS-008` | `ApplicationEngineHostService` | stdio RPC transport to worker | host/worker boundary translation | would leak process protocol into gateway/session/publication owners |
| Application notification stream service | `DS-006` | `ApplicationBackendGatewayService` | app backend notifications to frontend SDK clients | separates push transport from worker core | would mix transport fan-out into worker or gateway request code |
| Migration lock manager | `DS-008` | `ApplicationStorageLifecycleService` | serialize storage bootstrap/migration execution | ensures one migration owner | would let worker/bootstrap races corrupt storage |
| Publication journal store | `DS-004`, `DS-005`, `DS-009` | `ApplicationPublicationService` | append/read/ack normalized promoted events | durable ordering boundary | would scatter publication durability across services |
| Session projection store | `DS-004`, `DS-007` | `ApplicationPublicationService` / `ApplicationSessionService` | persist retained host session projections and binding state | makes session authority durable | would keep session authority in transient process memory |
| Route adapter | `DS-002`, `DS-006` | `ApplicationBackendGatewayService` | map platform route request shape to worker handler shape | keeps REST exposure optional and isolated | would pollute engine host with HTTP specifics |
| GraphQL adapter | `DS-002`, `DS-006` | `ApplicationBackendGatewayService` | map platform GraphQL endpoint to worker executor | preserves platform ownership of GraphQL transport | would couple worker lifecycle to transport schema handling |
| Frontend bootstrap envelope builder | `DS-006`, `DS-007` | `ApplicationIframeHost` / frontend SDK boundary | construct app bootstrap payload from host state | keeps raw iframe contract internal | would leak host transport quirks to app authors |
| Application iframe launch-descriptor builder | `DS-010`, `DS-012` | `ApplicationSurface` | derive stable descriptor equality inputs and `launchInstanceId` ownership | keeps remount policy explicit and testable | would hide iframe identity policy inside arbitrary watchers |
| Host-origin normalizer / matcher | `DS-010`, `DS-012` | `ApplicationSurface` / iframe contract helpers | serialize and compare packaged-host origins (`file://`) consistently for ready/bootstrap handshakes | keeps Electron/browser quirks inside one reviewed helper | would scatter origin comparisons across host and child code |
| Application metadata classifier | `DS-013` | `ApplicationShell` | classify host metadata into default-visible vs secondary-details vs developer-debug tiers | keeps the default page app-first without deleting useful diagnostics | would let every component surface raw metadata ad hoc |
| Application details/debug panel | `DS-013` | `ApplicationShell` | render secondary operational metadata only when explicitly opened | prevents metadata-heavy chrome above the iframe | would keep package/runtime/session diagnostics on the main line |
| Workspace execution deep-link contract | `DS-014` | `WorkspaceRouteSelectionController` | accept carried run/member identity from non-workspace surfaces and open/focus the correct workspace monitor target | keeps full execution monitoring in one place while still making it reachable from Applications | would force Application components to duplicate workspace monitor behavior or mutate workspace stores ad hoc |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Application package source management | current `agent-packages` surface | `Create New` | application import/list/remove is a distinct product/domain intent and needs its own boundary | current agent-package service/UI/API are the wrong long-term owner even if some source-acquisition mechanics can be reused below |
| Bundle discovery + embedded runtime validation | `application-bundles` | `Extend` | already the authoritative discovery/install boundary once application package roots are registered | N/A |
| Live app session launch/bind/streaming | `application-sessions` | `Extend` | already owns current session lifecycle and runtime binding | N/A |
| Runtime Applications availability | `application-capability` | `Reuse` | already authoritative and correct for this scope | N/A |
| App storage path derivation | `AppConfig` | `Extend` | already authoritative for data/log/db directories | N/A |
| Managed child-process and stdio RPC patterns | `runtime-management/codex/client`, `messaging-gateway-process-supervisor` | `Extend` | patterns already proven in repo | N/A |
| Durable app storage and migration lifecycle | none | `Create New` | no current owner for per-app DB bootstrap and migration execution | existing persistence subsystems are core-platform-oriented, not per-app-installation-oriented |
| App backend request gateway | none | `Create New` | no current owner for app-owned backend exposures | existing GraphQL/REST boundaries expose core platform, not imported app backends |
| Author-facing frontend SDK | none | `Create New` | current host contract/types are internal only | `autobyteus-web` internals are not a publishable author boundary |
| Host-side application launch surface | `autobyteus-web/components/applications/ApplicationSurface.vue`, `ApplicationIframeHost.vue` | `Extend` | the host already has the right visual entry boundary, but it needs explicit launch ownership instead of mixing bootstrap state into session stores | N/A |
| Author-facing backend SDK | none | `Create New` | no current stable worker-facing app definition contract | `autobyteus-ts` is the wrong ownership boundary and lacks app runtime hosting semantics |
| Shared app SDK contracts | none | `Create New` | frontend SDK, backend SDK, bundle parser, and host all need shared contract types | duplicating protocol and manifest types across packages would drift quickly |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `application-packages` | application package source list/import/remove, package-root registration, application import intent, refresh trigger into discovery | `DS-001` | `ApplicationPackageService` | `Create New` | separate higher-layer application package ownership from agent-package management |
| `application-bundles` | discovery of application roots from registered application package roots, manifest/backend payload validation, embedded runtime integrity, asset serving | `DS-001` | `ApplicationBundleService` | `Extend` | remains bundle discovery/validation/catalog boundary, not the product-facing import manager |
| `application-sessions` | live app-session lifecycle, route binding, send-input, session state persistence, publication authority | `DS-003`, `DS-004`, `DS-007`, `DS-009` | `ApplicationSessionService`, `ApplicationPublicationService` | `Extend` | keeps host-visible runtime/session logic together |
| `application-storage` | app storage identity, path derivation, app DB + platform DB bootstrap, migration lock/execution, reserved platform-state persistence | `DS-008` | `ApplicationStorageLifecycleService` | `Create New` | platform-owned app storage boundary |
| `application-engine` | engine lifecycle, worker supervisor, RPC client, worker definition loading, readiness/failure state | `DS-002`, `DS-005`, `DS-008` | `ApplicationEngineHostService` | `Create New` | platform-managed App Engine |
| `application-backend-gateway` | app backend request transport, exposure adapters, notification streaming | `DS-002`, `DS-006` | `ApplicationBackendGatewayService` | `Create New` | authoritative backend API boundary |
| `autobyteus-application-sdk-contracts` | manifest shapes, backend definition shapes, request/response/event contracts, bootstrap contracts | all | frontend SDK, backend SDK, host server/web packages | `Create New` | shared source of truth for author-facing contracts |
| `autobyteus-application-frontend-sdk` | browser client/bootstrap/runtime subscription/backend call helpers | `DS-002`, `DS-006`, `DS-007` | app-specific Application View | `Create New` | author-facing frontend boundary |
| `autobyteus-application-backend-sdk` | `defineApplication()` helper, injected context types, handler contracts | `DS-002`, `DS-005`, `DS-008` | app backend worker code | `Create New` | author-facing backend boundary |
| `autobyteus-web` host application UI | host launch surface ownership, stable iframe bootstrap spine, and Execution View layering | `DS-003`, `DS-007`, `DS-010`, `DS-011`, `DS-012` | `ApplicationSurface`, host-native UI owners | `Extend` | app-specific UI stays in bundle; host keeps execution visibility and authoritative launch ownership |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-packages/services/application-package-service.ts` | `application-packages` | `ApplicationPackageService` | list/import/remove application package roots and trigger application-bundle refresh | one authoritative application-package-management boundary | Yes |
| `autobyteus-server-ts/src/application-packages/stores/application-package-root-settings-store.ts` | `application-packages` | root settings store | persist additional application package roots under application-specific ownership | avoids piggybacking on agent-package root ownership | Yes |
| `autobyteus-server-ts/src/application-packages/stores/application-package-registry-store.ts` | `application-packages` | registry store | persist application package source records such as local-path vs GitHub source metadata | keeps source bookkeeping out of bundle discovery | Yes |
| `autobyteus-server-ts/src/api/graphql/types/application-packages.ts` | server API transport | GraphQL facade | application-package list/import/remove GraphQL boundary | separate product-facing API from agent-package API | Yes |
| `autobyteus-web/stores/applicationPackagesStore.ts` | web application management UI | settings/store owner | application-package list/import/remove UI state + refresh orchestration | separate application import UX from agent package UX | Yes |
| `autobyteus-web/components/applications/ApplicationShell.vue` | host application UI | page-shell owner | route-bound application page chrome, mode switching, session presentation, and metadata placement | one owner for app-first vs execution vs details/debug presentation | Yes |
| `autobyteus-web/components/applications/ApplicationSurface.vue` | host application UI | `ApplicationSurface` | authoritative launch owner from resolved session to stable iframe bootstrap delivery | callers above should depend on one launch surface boundary | Yes |
| `autobyteus-web/components/applications/ApplicationDetailsPanel.vue` | host application UI | details/debug surface | explicit secondary metadata surface for operational details | prevents metadata-heavy default page chrome | Yes |
| `autobyteus-web/components/applications/ApplicationIframeHost.vue` | host application UI | iframe bridge | render one iframe for a supplied descriptor and surface ready/load/contract events back to the launch owner | keeps DOM/message mechanics below the launch boundary | Yes |
| `autobyteus-web/utils/application/applicationLaunchDescriptor.ts` | host application UI | descriptor helper | compute immutable descriptor equality inputs and launch-instance ids | isolates remount invariants from component watchers | Yes |
| `autobyteus-web/types/application/ApplicationIframeContract.ts` | host application UI / shared contract | internal launch contract | define query hints, ready/bootstrap envelopes, `launchInstanceId`, and packaged-host origin match helpers | one internal contract file for host/child bootstrap semantics | Yes |
| `autobyteus-web/stores/applicationSessionStore.ts` | session store | session authority | session binding, session snapshots, streaming, and runtime launch commands only | launch state must not stay here | Yes |
| `autobyteus-web/components/settings/ApplicationPackagesManager.vue` | web application management UI | settings manager | application-package import/manage surface in Settings | product-facing application import belongs here, not under Agent Packages | Yes |
| `autobyteus-server-ts/src/application-bundles/utils/application-backend-manifest.ts` | `application-bundles` | backend payload parser | parse/validate `backend/bundle.json` | one file per bundle payload format | Yes |
| `autobyteus-server-ts/src/application-bundles/services/application-bundle-service.ts` | `application-bundles` | `ApplicationBundleService` | orchestrate bundle + backend manifest validation and catalog state | existing authority remains here | Yes |
| `autobyteus-server-ts/src/application-storage/services/application-storage-lifecycle-service.ts` | `application-storage` | `ApplicationStorageLifecycleService` | prepare storage root, app DB, platform DB, reserved tables, and migrations | one authoritative storage bootstrap owner | Yes |
| `autobyteus-server-ts/src/application-storage/services/application-migration-service.ts` | `application-storage` | migration concern | validate migration files, reject forbidden statements, and run ordered SQL migrations against the app DB only | distinct migration concern under storage owner | Yes |
| `autobyteus-server-ts/src/application-storage/stores/application-platform-state-store.ts` | `application-storage` | reserved-table store | read/write reserved platform tables in hidden platform DB | shared storage substrate for sessions + publication + dispatcher | Yes |
| `autobyteus-server-ts/src/application-engine/services/application-engine-host-service.ts` | `application-engine` | `ApplicationEngineHostService` | ensure engine running, stop/restart, report status | main engine lifecycle owner | Yes |
| `autobyteus-server-ts/src/application-engine/runtime/application-worker-supervisor.ts` | `application-engine` | worker concern | spawn/stop child worker and capture logs | lifecycle mechanics only | No |
| `autobyteus-server-ts/src/application-engine/runtime/application-engine-client.ts` | `application-engine` | RPC boundary | stdio RPC client for worker methods/notifications | one file for worker protocol transport | Yes |
| `autobyteus-server-ts/src/application-engine/worker/application-worker-entry.ts` | `application-engine` | worker entry | boot worker process and load runtime | one worker entrypoint | Yes |
| `autobyteus-server-ts/src/application-engine/worker/application-worker-runtime.ts` | `application-engine` | worker runtime | validate app definition and dispatch handlers | worker-local owner | Yes |
| `autobyteus-server-ts/src/application-sessions/services/application-publication-service.ts` | `application-sessions` | `ApplicationPublicationService` | validate, normalize, journal, project, stream promoted events | explicit publication authority | Yes |
| `autobyteus-server-ts/src/application-sessions/stores/application-session-state-store.ts` | `application-sessions` | state store | durable session bindings and retained projection persistence | durable session authority | Yes |
| `autobyteus-server-ts/src/application-sessions/stores/application-publication-journal-store.ts` | `application-sessions` | journal store | durable promoted-event append/read/ack plus dispatch-attempt metadata | publication durability concern | Yes |
| `autobyteus-server-ts/src/application-sessions/services/application-publication-dispatch-service.ts` | `application-sessions` | dispatcher | ordered at-least-once journal delivery to app worker | dispatch loop kept off main line | Yes |
| `autobyteus-server-ts/src/application-backend-gateway/services/application-backend-gateway-service.ts` | `application-backend-gateway` | `ApplicationBackendGatewayService` | invoke queries/commands/routes/graphql via engine | authoritative backend request owner | Yes |
| `autobyteus-server-ts/src/application-backend-gateway/streaming/application-notification-stream-service.ts` | `application-backend-gateway` | notification stream owner | app backend notifications to frontend subscribers | distinct push concern | Yes |
| `autobyteus-server-ts/src/api/rest/application-backends.ts` | server API transport | route facade | REST transport boundary for app backend exposures | transport-only wrapper | Yes |
| `autobyteus-server-ts/src/api/websocket/application-backend-notifications.ts` | server API transport | websocket facade | notification websocket transport | transport-only wrapper | Yes |
| `autobyteus-application-sdk-contracts/src/*` | shared contracts | contract package | shared bundle/backend/bootstrap/event/request types | one package for cross-boundary shared contracts | N/A |
| `autobyteus-application-frontend-sdk/src/*` | frontend SDK | author boundary | bootstrap/browser client/subscriptions/helpers | publishable author boundary | Yes |
| `autobyteus-application-backend-sdk/src/*` | backend SDK | author boundary | `defineApplication`, context types, exposure contracts | publishable backend author boundary | Yes |
| `autobyteus-web/components/applications/ApplicationIframeHost.vue` | host application UI | iframe bootstrap owner | bootstrap SDK envelope instead of raw internal contract leakage | current host owner remains correct | Yes |
| `autobyteus-web/components/applications/execution/ApplicationExecutionWorkspace.vue` | host application UI | execution owner | member selection, retained artifact-first inspection, and workspace-deep-link affordances | host-native execution stays outside app bundle without duplicating the full monitor | Yes |
| `autobyteus-web/types/workspace/WorkspaceExecutionLink.ts` | host workspace UI | shared deep-link contract | typed carried identity for opening `/workspace` from Applications or other surfaces | one cross-surface execution-link shape prevents ad hoc query construction | Yes |
| `autobyteus-web/services/workspace/workspaceNavigationService.ts` | host workspace UI | navigation producer | build route locations for workspace execution handoff from Applications | keeps producers from inventing route/query details inline | Yes |
| `autobyteus-web/composables/workspace/useWorkspaceRouteSelection.ts` | host workspace UI | `WorkspaceRouteSelectionController` | parse workspace route query/intents and reuse existing run/team open coordinators to focus the correct monitor target | one authoritative consumer boundary for workspace deep links | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| bundle manifest v2 + backend bundle manifest | `autobyteus-application-sdk-contracts/src/manifest/*` | shared contracts | bundle parser, builder, frontend/backend SDK docs all need one source of truth | Yes | Yes | ad-hoc duplicated JSON literal docs |
| backend definition contract + exposure capability descriptors | `autobyteus-application-sdk-contracts/src/backend-definition/*` | shared contracts | worker, gateway, backend SDK share this shape | Yes | Yes | generic catch-all config blob |
| application request context and identity shapes | `autobyteus-application-sdk-contracts/src/runtime/request-context.ts` | shared contracts | gateway, frontend SDK, backend SDK need same identity semantics | Yes | Yes | ambiguous generic selector |
| normalized promoted publication event + dispatch envelope shapes | `autobyteus-application-sdk-contracts/src/publication/*` | shared contracts | host publication service, dispatcher, and app event handlers must agree exactly on stable identity and retry metadata | Yes | Yes | raw runtime event passthrough or retry metadata hidden in transport |
| notification envelope shapes | `autobyteus-application-sdk-contracts/src/notifications/*` | shared contracts | worker notifications and frontend SDK subscribers need stable contract | Yes | Yes | transport-specific websocket-only payloads |
| storage root contract + platform DB reserved table names | `autobyteus-server-ts/src/application-storage/contracts/storage-contract.ts` | `application-storage` | storage lifecycle, migration enforcement, and reserved-table stores must align | Yes | Yes | scattered string literals |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ApplicationBundleManifestV2` | `Yes` | `Yes` | `Low` | keep frontend + backend payload locations explicit and separate |
| `ApplicationBackendDefinition` | `Yes` | `Yes` | `Medium` | avoid mixing lifecycle, exposure metadata, and runtime state in one object |
| `ApplicationRequestContext` | `Yes` | `Yes` | `Low` | keep `applicationId` and optional `applicationSessionId` explicit instead of generic ids |
| `NormalizedPublicationEvent` | `Yes` | `Yes` | `Low` | assign stable `eventId` + `journalSequence` at append time and never regenerate them on retry |
| `ApplicationEventDispatchEnvelope` | `Yes` | `Yes` | `Low` | keep stable event identity under `event` and attempt-specific delivery metadata under `delivery` so idempotency keys stay constant |
| `ApplicationEngineStatus` | `Yes` | `Yes` | `Medium` | separate engine readiness from live session state |
| `ApplicationStorageLayout` | `Yes` | `Yes` | `Low` | keep `app.sqlite` app-owned and `platform.sqlite` platform-owned; do not expose the platform DB to app code |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-bundles/services/application-bundle-service.ts` | `application-bundles` | `ApplicationBundleService` | authoritative app catalog and bundle/backend contract validation | keeps installation/discovery authority singular | Yes |
| `autobyteus-server-ts/src/application-bundles/providers/file-application-bundle-provider.ts` | `application-bundles` | filesystem provider | scan package roots and load bundle sources | file-system discovery concern only | Yes |
| `autobyteus-server-ts/src/application-bundles/utils/application-manifest.ts` | `application-bundles` | manifest parser | parse `application.json` v2 | manifest-specific parsing stays isolated | Yes |
| `autobyteus-server-ts/src/application-bundles/utils/application-backend-manifest.ts` | `application-bundles` | backend payload parser | parse `backend/bundle.json` | backend payload-specific parsing stays isolated | Yes |
| `autobyteus-server-ts/src/application-storage/services/application-storage-lifecycle-service.ts` | `application-storage` | `ApplicationStorageLifecycleService` | storage root derivation, app/platform DB bootstrap, and migration orchestration | one authoritative storage owner | Yes |
| `autobyteus-server-ts/src/application-storage/services/application-migration-service.ts` | `application-storage` | migration concern | validate app SQL boundaries, run ordered app DB migrations, and record history | keeps migration algorithm isolated | Yes |
| `autobyteus-server-ts/src/application-storage/stores/application-platform-state-store.ts` | `application-storage` | reserved-table adapter | hidden platform DB read/write API for platform-owned app state | shared persistence boundary for sessions/publication/dispatcher | Yes |
| `autobyteus-server-ts/src/application-engine/services/application-engine-host-service.ts` | `application-engine` | `ApplicationEngineHostService` | engine lifecycle, status, ensureRunning/stop/invoke entrypoint | main engine owner | Yes |
| `autobyteus-server-ts/src/application-engine/runtime/application-worker-supervisor.ts` | `application-engine` | supervisor | child process lifecycle/log capture | process mechanics only | No |
| `autobyteus-server-ts/src/application-engine/runtime/application-engine-client.ts` | `application-engine` | RPC client | worker request/notification transport | single worker protocol client | Yes |
| `autobyteus-server-ts/src/application-engine/worker/application-worker-runtime.ts` | `application-engine` | worker runtime | imported app definition loading + handler dispatch | single worker-side owner | Yes |
| `autobyteus-server-ts/src/application-sessions/services/application-session-service.ts` | `application-sessions` | `ApplicationSessionService` | live runtime session lifecycle and route binding | runtime session authority remains here | Yes |
| `autobyteus-server-ts/src/application-sessions/services/application-publication-service.ts` | `application-sessions` | `ApplicationPublicationService` | publication validation, journal append, retained projection, stream publish | publication authority must be singular | Yes |
| `autobyteus-server-ts/src/application-sessions/stores/application-session-state-store.ts` | `application-sessions` | session state store | durable session binding/projection persistence | replaces in-memory authority | Yes |
| `autobyteus-server-ts/src/application-sessions/stores/application-publication-journal-store.ts` | `application-sessions` | journal store | durable promoted event append/read/ack plus retry metadata | keeps journal persistence isolated | Yes |
| `autobyteus-server-ts/src/application-sessions/services/application-publication-dispatch-service.ts` | `application-sessions` | dispatcher | ordered at-least-once journal dispatch into engine | off-spine delivery loop | Yes |
| `autobyteus-server-ts/src/application-backend-gateway/services/application-backend-gateway-service.ts` | `application-backend-gateway` | `ApplicationBackendGatewayService` | app backend invocation boundary | transport-neutral request authority | Yes |
| `autobyteus-server-ts/src/application-backend-gateway/streaming/application-notification-stream-service.ts` | `application-backend-gateway` | notification stream owner | frontend subscriber fan-out for app notifications | separate push concern | Yes |
| `autobyteus-server-ts/src/api/rest/application-backends.ts` | server API transport | REST facade | REST exposure entrypoints for app backend | transport wrapper only | Yes |
| `autobyteus-server-ts/src/api/websocket/application-backend-notifications.ts` | server API transport | websocket facade | app notification transport | transport wrapper only | Yes |
| `autobyteus-application-sdk-contracts/src/...` | shared contracts | contract package | author-facing/shared protocol contracts | prevents drift across SDKs and host | N/A |
| `autobyteus-application-frontend-sdk/src/...` | frontend SDK | author boundary | browser bootstrap/backend/runtime APIs | public browser SDK | Yes |
| `autobyteus-application-backend-sdk/src/...` | backend SDK | author boundary | `defineApplication` + context types | public backend SDK | Yes |
| `autobyteus-web/components/applications/ApplicationShell.vue` | host UI | page-shell owner | app-first page chrome, Application/Execution mode split, and details/debug placement | keeps page-level UX ownership explicit | Yes |
| `autobyteus-web/components/applications/ApplicationDetailsPanel.vue` | host UI | secondary metadata surface | render package/runtime/session metadata only when intentionally opened | keeps diagnostics off the default app surface | Yes |
| `autobyteus-web/components/applications/ApplicationSurface.vue` | host UI | `ApplicationSurface` | authoritative launch owner from resolved session to stable iframe bootstrap delivery | keeps one host launch boundary explicit | Yes |
| `autobyteus-web/components/applications/ApplicationIframeHost.vue` | host UI | iframe bridge | internal iframe DOM/message transport for a supplied descriptor | keeps raw iframe mechanics below the launch owner | Yes |
| `autobyteus-web/utils/application/applicationLaunchDescriptor.ts` | host UI | descriptor helper | derive immutable descriptor equality inputs and `launchInstanceId` | remount policy stays explicit and testable | Yes |
| `autobyteus-web/types/application/ApplicationIframeContract.ts` | host UI / internal contract | internal launch contract | ready/bootstrap/query-hint shapes plus packaged-host origin matching | one reviewed internal contract for Electron/browser launch behavior | Yes |
| `autobyteus-web/stores/applicationSessionStore.ts` | host UI | session authority | binding, snapshots, streaming, and launch commands without bootstrap UI state | removes mixed launch/session ownership | Yes |
| `autobyteus-web/components/applications/execution/ApplicationExecutionWorkspace.vue` | host UI | execution owner | retained member/artifact inspection plus workspace handoff affordances | keeps Applications execution narrow and artifact-first | Yes |
| `autobyteus-web/types/workspace/WorkspaceExecutionLink.ts` | host workspace UI | shared deep-link contract | typed carried identity for `/workspace` execution handoff | one stable cross-surface selection shape | Yes |
| `autobyteus-web/services/workspace/workspaceNavigationService.ts` | host workspace UI | navigation producer | construct route locations for opening workspace execution targets from Applications | prevents ad hoc route/query construction in page components | Yes |
| `autobyteus-web/composables/workspace/useWorkspaceRouteSelection.ts` | host workspace UI | `WorkspaceRouteSelectionController` | parse workspace execution link input and reuse existing team/agent open coordinators | keeps authoritative workspace selection logic inside the workspace boundary | Yes |
| `applications/socratic-math-teacher/backend/bundle.json` | repo-local sample app | bundle sample | no-op backend bundle for the lightweight Socratic sample app under the same package architecture as every other app | keeps the shallow sample on the common contract | Yes |
| `applications/brief-studio/application.json` | canonical teaching sample | root manifest | anchors the runnable repo-local application root and points only at in-place bundle-valid payloads | makes the repo-local root contract explicit | Yes |
| `applications/brief-studio/backend/bundle.json` | canonical teaching sample | backend bundle manifest | anchors the in-place runnable backend payload under the repo-local root | keeps backend runtime shape explicit at the canonical root | Yes |
| `applications/brief-studio/agents/researcher/agent.md` + `agent-config.json` | canonical teaching sample | application-owned runtime member definition | valid app-owned agent contract + `publish_artifact` tool exposure for the research member | sample must be import-valid and launchable | Yes |
| `applications/brief-studio/agents/writer/agent.md` + `agent-config.json` | canonical teaching sample | application-owned runtime member definition | valid app-owned agent contract + `publish_artifact` tool exposure for the writer member | sample must be import-valid and launchable | Yes |
| `applications/brief-studio/backend-src/event-handlers/on-artifact.ts` | canonical teaching sample | event-handler adapter | translate dispatched artifact envelope into one call to the projection owner | keeps event adapters thin and non-authoritative | Yes |
| `applications/brief-studio/backend-src/services/brief-projection-service.ts` | canonical teaching sample | projection owner | derive `brief_id`, claim `eventId`, and apply brief/artifact/status projection atomically in one app DB transaction | makes the sample's at-least-once safety boundary explicit and singular | No |

## Ownership Boundaries

The target design has seven authoritative boundaries that upstream callers must respect:

1. **Application package management authority** — `ApplicationPackageService`
   - callers above it must not import/remove/list application package sources by reaching into bundle-discovery internals or agent-package services.

2. **Bundle authority** — `ApplicationBundleService`
   - callers above it must not mix direct filesystem manifest parsing with bundle-service catalog calls.

3. **Session authority** — `ApplicationSessionService`
   - callers above it must not call `AgentRunService` / `TeamRunService` directly for app session behavior while also depending on session service.

4. **Publication authority** — `ApplicationPublicationService`
   - callers above it must not write session projection state and journal state separately.
   - promoted runtime state enters the host system only through this boundary.

5. **Storage authority** — `ApplicationStorageLifecycleService`
   - callers above it must not choose DB paths, attach the platform DB into app-owned migration execution, or let worker code own bootstrap ordering.

6. **Engine authority** — `ApplicationEngineHostService`
   - callers above it must not combine direct worker process control with gateway/session/publication logic.

7. **App backend request authority** — `ApplicationBackendGatewayService`
   - callers above it must not call engine internals directly for app backend request handling.

8. **Host application launch authority** — `ApplicationSurface`
   - callers above it must not mix direct `ApplicationIframeHost` control, session-store bootstrap mutation, and raw launch-descriptor watchers when rendering an app surface.
   - this boundary owns iframe identity, bootstrap waiting/ready/failed state, and retry/remount policy once a live session is resolved.

9. **Application page-shell authority** — `ApplicationShell`
   - callers above it must not mix app header rendering, raw package/runtime/session metadata cards, execution-mode toggles, and details/debug placement ad hoc across child components.
   - this boundary owns the default app-first presentation and the explicit demotion of operational metadata into secondary surfaces.

Author-facing boundaries are also authoritative:
- app frontends depend on `autobyteus-application-frontend-sdk`, not internal host files
- app backends depend on `autobyteus-application-backend-sdk`, not server internals

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ApplicationPackageService` | application package root settings store, application package registry store, source-acquisition helpers, bundle refresh trigger | application package management UI/API | caller imports application package sources through `AgentPackageService` or writes application package roots directly into bundle-provider settings | strengthening application package service APIs |
| `ApplicationBundleService` | file provider, manifest parsers, backend payload parser | application package service, catalog resolvers, runtime definition providers | caller parses `application.json` directly and also calls bundle service | extending bundle service API |
| `ApplicationSessionService` | launch builder, active-session index, runtime service calls | host launch UI, route binding resolvers, app session commands | host page or backend SDK calls `AgentRunService` directly for app launches | strengthening session service APIs |
| `ApplicationPublicationService` | validator, journal store, projector, stream publisher | runtime publication tool, session service, dispatcher wake-up | one caller appends journal while another updates projection | strengthening publication service entrypoints |
| `ApplicationStorageLifecycleService` | storage-root derivation, platform DB bootstrap, app migration validator/executor | engine host, publication/session stores | app migration runner opens `platform.sqlite` or app code chooses DB paths directly | strengthening storage bootstrap and migration APIs |
| `ApplicationEngineHostService` | storage lifecycle, worker supervisor, engine client, readiness state | backend gateway, publication dispatcher | backend gateway spawns workers directly or storage lifecycle starts workers | strengthening engine host service APIs |
| `ApplicationBackendGatewayService` | exposure adapters, engine invocation, notification streaming | app frontend SDK, host transport routes | app frontend or host transport reaches engine client directly | strengthening gateway surface |
| `ApplicationShell` | app-first header, mode switching, details/debug visibility, metadata classification | application route screens | caller renders raw package/session/run metadata directly above the iframe while also depending on `ApplicationShell` for page structure | strengthening page-shell APIs and extracted child surfaces |
| `ApplicationSurface` | launch-descriptor builder, timeout state, ready/bootstrap handshake, visual launch state | `ApplicationShell`, application route screens | caller mutates `applicationSessionStore.bootstrapState` or directly increments iframe render keys while also depending on `ApplicationSurface` | strengthening the launch-surface API and local state machine |
| `Frontend SDK` | iframe bootstrap parsing, endpoint resolution, request-context shaping | bundled app frontend code | app frontend imports internal host transport helpers or raw contract files | adding SDK methods/types |
| `Backend SDK` | app definition validation helpers, context contracts | bundled app backend code | app backend imports server runtime files directly | adding SDK capabilities/contracts |

## Dependency Rules

- `application-packages` may depend on narrow shared source-acquisition utilities and `application-bundles`; it must not depend on agent-package service/UI boundaries or worker/runtime internals.
- `application-bundles` may depend on shared contract package and its own file-provider / application-package-root inputs; it must not depend on app engine runtime internals or own product-facing import UX.
- `application-storage` may depend on `AppConfig` and shared contracts; it must not depend on app frontend or gateway code.
- `application-storage` owns both `app.sqlite` and hidden `platform.sqlite`; app-authored migrations run only against `app.sqlite`, and the platform DB must never be attached into app migration execution or exposed to app code.
- `application-engine` may depend on `application-storage` and shared contract package; it must not own publication validation or session projection logic.
- `application-sessions` may depend on `application-storage` and `application-engine`; it must not bypass `ApplicationPublicationService` for promoted-event handling.
- `application-backend-gateway` may depend on `application-engine` and shared contracts; it must not own worker lifecycle or migrations.
- `autobyteus-web` host app may depend on the frontend SDK contract package and its own stores; bundled app code must not import host-only web internals.
- `ApplicationShell` may depend on application catalog entry + resolved live session + page-mode store + details/debug visibility state; it must not own iframe bootstrap handshake mechanics or backend request transport details.
- `ApplicationSurface` may depend on route-bound session snapshots, bound endpoint context, launch-descriptor helpers, and internal iframe contract helpers; it must not persist bootstrap waiting/failed state back into `applicationSessionStore`.
- `ApplicationIframeHost` may depend on the launch descriptor and internal contract helpers; it must not derive iframe remount policy from arbitrary session-store changes or become a second owner of visual launch state.
- `autobyteus-application-frontend-sdk` may depend on shared contracts only; it must not depend on `autobyteus-web` component/store internals.
- `autobyteus-application-backend-sdk` may depend on shared contracts only; it must not depend on `autobyteus-server-ts` service internals.
- App backend code may receive platform capabilities through injected context; it must not import or reach into AutoByteus core repositories, Prisma schema, or server services directly.
- App backend code may receive an app-owned DB handle / `appDatabaseUrl`; it must not receive direct access to hidden platform DB paths or reserved platform tables.
- Route/GraphQL adapters are optional exposure translators; they must not become alternate lifecycle owners.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `listApplicationPackages()` | application package management | return registered application package sources | none | product-facing application import-management boundary |
| `importApplicationPackage(input)` | application package management | register one application package source and refresh discovered bundles | `sourceKind + source` | distinct from agent package import even if source acquisition is shared below |
| `removeApplicationPackage(packageId)` | application package management | remove one registered application package source and refresh discovered bundles | `applicationPackageId` | distinct application-package-management boundary |
| `listApplications()` | application catalog | return validated app catalog | none | existing subject boundary remains |
| `getApplication(applicationId)` | application catalog | return one app catalog/detail record | `applicationId` | app identity, not session identity |
| `getApplicationEngineStatus(applicationId)` | app engine | report backend readiness/exposure metadata | `applicationId` | separate from live session state |
| `createApplicationSession(applicationId, launchInput)` | application session | create one live app runtime session | `applicationId + launchInput` | host runtime launch boundary |
| `bindApplicationRoute(applicationId, requestedSessionId?)` | application session | resolve current live session for route | `applicationId + optional applicationSessionId` | existing boundary remains authoritative |
| `presentApplicationPage(application, liveSession, pageMode, detailsVisibility)` | application page shell | choose app-first header, mode tabs, and secondary metadata placement | `applicationId + optional applicationSessionId + page mode` | internal host boundary; keeps single-live-session semantics explicit in page chrome |
| `commitApplicationLaunchSurface(session, endpoints, retryGeneration)` | host application launch surface | derive or reuse the stable iframe launch descriptor for the current launch instance | `applicationSessionId + entryHtmlAssetPath + restBaseUrl + normalized host origin + retry generation` | internal host boundary; ordinary session stream updates do not change this identity |
| `acceptApplicationUiReady(launchInstanceId, applicationSessionId, iframeOrigin)` | host application launch surface | validate that the ready signal belongs to the current iframe launch instance before bootstrap delivery | `launchInstanceId + applicationSessionId + iframeOrigin` | internal host boundary; rejects stale or cross-generation ready signals |
| `sendApplicationInput(applicationSessionId, input)` | application session | send user input into live agent/team runtime | `applicationSessionId` | session-specific runtime input |
| `appendRuntimePublication(applicationSessionId, publication, producer)` | promoted runtime state | normalize/journal/project runtime publication and assign stable event identity | `applicationSessionId + publication payload` | publication authority boundary; allocates `eventId` + `journalSequence` |
| `invokeApplicationEventHandler(applicationId, eventEnvelope)` | app event dispatch | run one app-owned event handler under the stable at-least-once delivery contract | `applicationId + eventId + journalSequence + attemptNumber` | internal host->worker boundary; `eventId`/`journalSequence` stay stable across retries |
| `invokeApplicationQuery(applicationId, queryName, requestContext, input)` | app backend gateway | run app-owned query handler | `applicationId + queryName + requestContext` | `requestContext` may include optional `applicationSessionId` |
| `invokeApplicationCommand(applicationId, commandName, requestContext, input)` | app backend gateway | run app-owned command handler | `applicationId + commandName + requestContext` | same identity rule as query |
| `routeApplicationRequest(applicationId, requestContext, method, routePath, request)` | app backend gateway | run app-owned REST-style route handler | `applicationId + method + routePath + requestContext` | mounted under platform namespace |
| `executeApplicationGraphql(applicationId, requestContext, request)` | app backend gateway | run app-owned GraphQL executor | `applicationId + requestContext` | one GraphQL executor per app max in v1 |
| `publishApplicationNotification(applicationId, topic, payload)` | app backend gateway | push app notification to frontend subscribers | `applicationId + topic` | notifications are app-scoped, not session-scoped |
| `ensureApplicationEngine(applicationId)` | app engine | ensure storage ready and worker running | `applicationId` | engine readiness boundary |

Rule:
- Do not use one generic boundary when the subject or identity meaning differs.
- Split boundaries by subject or require an explicit compound identity shape.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `createApplicationSession` | `Yes` | `Yes` | `Low` | keep runtime session creation separate from engine ensureRunning |
| `invokeApplicationEventHandler` | `Yes` | `Yes` | `Low` | keep stable event identity in the envelope and retry metadata separate from app payload |
| `invokeApplicationQuery` | `Yes` | `Yes` | `Low` | require `applicationId` + `queryName` + explicit context |
| `routeApplicationRequest` | `Yes` | `Yes` | `Medium` | keep route adapter under gateway, not as primary owner |
| `executeApplicationGraphql` | `Yes` | `Yes` | `Medium` | limit to one executor and explicit request payload |
| `appendRuntimePublication` | `Yes` | `Yes` | `Low` | keep publication entrypoint singular and authoritative |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| App runtime host | `ApplicationEngineHostService` | `Yes` | `Low` | use `ApplicationEngine` consistently in docs and code |
| Worker-side runtime | `ApplicationWorkerRuntime` | `Yes` | `Low` | keep worker-local owner distinct from host engine |
| Publication authority | `ApplicationPublicationService` | `Yes` | `Low` | keep authority explicit in service name |
| App backend gateway | `ApplicationBackendGatewayService` | `Yes` | `Low` | avoid generic `ApiService` naming |
| Per-app storage bootstrap | `ApplicationStorageLifecycleService` | `Yes` | `Low` | keep storage + lifecycle together because that is the owned concern |

## Applied Patterns (If Any)

- **State Machine**
  - lives inside `ApplicationEngineHostService`
  - solves engine states: stopped / preparing storage / starting worker / ready / failed / stopping
- **Worker Loop / Retry Loop**
  - lives inside `ApplicationPublicationDispatchService`
  - solves durable async delivery from journal to app backend handlers
- **Factory**
  - `ApplicationEngineClientFactory` / worker-context factory build injected worker context from bundle + storage + platform capabilities
- **Adapter**
  - route adapter and GraphQL adapter live under `application-backend-gateway`
  - translate platform request shapes into worker handler contracts
- **Registry**
  - worker runtime maintains exposure registries for queries/commands/routes/notifications/event handlers loaded from the app backend definition
- **Repository / Store**
  - reserved-table stores under `application-storage` / `application-sessions` own durable platform state for per-app data

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `pnpm-workspace.yaml` | `File` | workspace root | include new SDK packages | monorepo package registration | application runtime logic |
| `autobyteus-application-sdk-contracts/` | `Folder` | shared contracts | shared manifest/protocol/request/event contracts | cross-boundary contract package | browser runtime code or server service logic |
| `autobyteus-application-frontend-sdk/` | `Folder` | frontend SDK | author-facing browser SDK | publishable app frontend boundary | host Vue stores/components |
| `autobyteus-application-backend-sdk/` | `Folder` | backend SDK | author-facing backend SDK | publishable app backend boundary | server service internals |
| `autobyteus-server-ts/src/application-packages/` | `Folder` | application package management | application-package source import/list/remove and package-root registration | distinct higher-layer business intent above bundle discovery | bundle manifest parsing internals or worker lifecycle |
| `autobyteus-server-ts/src/application-bundles/` | `Folder` | bundle authority | discovery + manifest/backend payload validation | existing installation/discovery boundary | worker lifecycle or migration execution |
| `autobyteus-server-ts/src/application-storage/` | `Folder` | storage authority | per-app storage lifecycle and reserved-table persistence | distinct storage ownership depth | gateway transport or worker dispatch |
| `autobyteus-server-ts/src/application-engine/` | `Folder` | engine authority | host lifecycle + worker runtime boundary | distinct engine/runtime depth | publication ordering authority |
| `autobyteus-server-ts/src/application-backend-gateway/` | `Folder` | backend gateway | app backend request/notification boundary | clear transport-to-engine boundary | storage bootstrap or session projection logic |
| `autobyteus-server-ts/src/application-sessions/` | `Folder` | session + publication authority | app session lifecycle and publication authority | existing runtime/session boundary | app backend transport handling |
| `autobyteus-server-ts/src/api/rest/application-backends.ts` | `File` | REST transport facade | mount app backend REST/query/command/graphql route endpoints | server transport layer | worker startup/migration logic |
| `autobyteus-server-ts/src/api/websocket/application-backend-notifications.ts` | `File` | WS transport facade | app notification websocket endpoint | server transport layer | notification business policy |
| `autobyteus-server-ts/src/api/graphql/types/application-packages.ts` | `File` | application-package GraphQL facade | list/import/remove application package roots | product-facing application import API boundary | bundle parsing or worker lifecycle |
| `autobyteus-web/stores/applicationPackagesStore.ts` | `File` | application-package settings store | application-package-management UI state and refresh orchestration | separate application import UX from agent package UX | agent/team package semantics |
| `autobyteus-web/components/settings/ApplicationPackagesManager.vue` | `File` | application-package settings manager | application-package import/manage surface | product-facing application import belongs here | agent package management copy-paste semantics |
| `autobyteus-web/components/applications/ApplicationSurface.vue` | `File` | host launch-surface owner | govern iframe identity, launch state, and bootstrap delivery for one resolved live session | authoritative host launch boundary belongs here | app-specific business logic or durable session truth |
| `autobyteus-web/components/applications/ApplicationIframeHost.vue` | `File` | iframe bridge | render the iframe for a supplied descriptor and forward DOM/message signals back to the launch owner | existing host integration point stays internal beneath the launch surface | retry/remount policy or session-store mutation |
| `autobyteus-web/utils/application/applicationLaunchDescriptor.ts` | `File` | launch descriptor helper | compute stable descriptor equality inputs and `launchInstanceId` | keeps remount invariants explicit and testable | app-specific business logic |
| `autobyteus-web/components/applications/execution/` | `Folder` | host execution view | host-native execution layering | article-aligned execution UI | app-specific custom rendering |
| `applications/brief-studio/` | `Folder` | canonical teaching sample | canonical repo-local runnable application root with optional authoring helpers and optional packaging output | teaches the common application-package shape plus import/provision flows | host platform internals |

Rules:
- If the design has meaningful structural depth, usually reflect it in folders rather than flattening everything into one mixed directory.
- Do not place transport entrypoints, main-line domain/control nodes, persistence, adapters, and unrelated off-spine concerns in one flat folder when that hides ownership or structural depth.
- A compact layout is acceptable when it remains easy to read for the scope. If you keep it flatter, state why that is the clearer tradeoff.
- Folder boundaries should make ownership and structural depth easier to read, not hide them.
- Shared-layer, feature-oriented, runtime-oriented, and hybrid projections can all be valid when they make the intended ownership and flow easier to understand.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-storage/` | `Persistence-Provider` | `Yes` | `Low` | storage lifecycle is a distinct owner and should not be flattened into sessions or engine |
| `autobyteus-server-ts/src/application-engine/` | `Main-Line Domain-Control` | `Yes` | `Low` | engine lifecycle has enough depth to justify its own folder |
| `autobyteus-server-ts/src/application-backend-gateway/` | `Transport` | `Yes` | `Low` | gateway is a clear authoritative boundary above engine |
| `autobyteus-server-ts/src/application-packages/` | `Main-Line Domain-Control` | `Yes` | `Low` | application import/list/remove is a distinct product/service boundary and should not stay inside agent-packages |
| `autobyteus-server-ts/src/application-sessions/` | `Main-Line Domain-Control` | `Yes` | `Medium` | extend carefully so publication authority stays clear and transport does not leak in |
| `autobyteus-application-sdk-contracts/` | `Mixed Justified` | `Yes` | `Low` | shared contract package is intentionally concern-agnostic but contract-specific |
| `autobyteus-application-frontend-sdk/` | `Transport` | `Yes` | `Low` | SDK is the app frontend boundary, not host UI logic |
| `autobyteus-application-backend-sdk/` | `Main-Line Domain-Control` | `Yes` | `Low` | backend SDK owns author contract, not transport or host runtime |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| App frontend boundary | `App UI -> Frontend SDK -> ApplicationBackendGatewayService` | `App UI -> raw iframe contract + raw GraphQL + raw websocket URLs + internal host helpers` | shows why SDK is necessary but not the whole architecture |
| App backend identity shape | `invokeApplicationQuery(applicationId, queryName, { applicationSessionId? }, input)` | `invokeBackend(sessionId, operationName, input)` | avoids collapsing durable app logic into live-session-only identity |
| Publication ownership | `Runtime -> ApplicationPublicationService -> Journal + Host Projection -> Dispatcher -> App Worker` | `Runtime -> Worker Handler -> maybe DB -> maybe host projection` | keeps delivery/promotion authority platform-owned and ordered |
| Publication dispatch contract | `artifact({ eventId, journalSequence, delivery: { attemptNumber } }, ctx)` with handler-side dedupe keyed by `eventId` | `artifact(payloadOnly)` where retries are invisible and duplicate side effects are accidental | makes at-least-once replay semantics explicit |
| Brief Studio projection ownership | `on-artifact -> brief-projection-service.beginTx() -> INSERT processed_events ON CONFLICT DO NOTHING -> UPSERT briefs/brief_artifacts -> COMMIT` | `check processed_events in handler -> write rows via scattered repositories -> record eventId later` | teaches one safe atomic app-owned projection boundary under at-least-once delivery |
| Engine startup | `ensurePlatformDb -> ensureAppDb -> validate app migrations -> migrate app DB -> spawnWorker -> ready` | `spawnWorker -> worker decides if/how to migrate DB` | keeps migration ownership platform-side |
| Storage boundary | `platform.sqlite` for reserved platform state + `app.sqlite` for app-owned schema; app migrations run only against `app.sqlite` | `app migration SQL can alter __autobyteus_* tables in the same connection` | shows how platform ownership is enforced without limiting app schema freedom |
| Layered UI | `Application View (app-specific) + Execution View (host-native) + selected agent artifact/log depth` | `single undifferentiated execution trace for everything` | matches the article's layered rendering model |

Use this section when the design would otherwise remain too abstract.

## V1 Bundle Contract

### `application.json` v2

```json
{
  "manifestVersion": "2",
  "id": "ticketing-app",
  "name": "Ticketing App",
  "description": "Optional description",
  "icon": "ui/assets/icon.png",
  "ui": {
    "entryHtml": "ui/index.html",
    "frontendSdkContractVersion": "1"
  },
  "runtimeTarget": {
    "kind": "AGENT_TEAM",
    "localId": "ticket-team"
  },
  "backend": {
    "bundleManifest": "backend/bundle.json"
  }
}
```

### `backend/bundle.json` v1

```json
{
  "contractVersion": "1",
  "entryModule": "dist/entry.mjs",
  "moduleFormat": "esm",
  "distribution": "self-contained",
  "targetRuntime": {
    "engine": "node",
    "semver": ">=22 <23"
  },
  "sdkCompatibility": {
    "backendDefinitionContractVersion": "1",
    "frontendSdkContractVersion": "1"
  },
  "supportedExposures": {
    "queries": true,
    "commands": true,
    "routes": true,
    "graphql": true,
    "notifications": true,
    "eventHandlers": true
  },
  "migrationsDir": "migrations",
  "assetsDir": "assets"
}
```

### Required bundle tree

```text
<package-root>/
  applications/
    <local-application-id>/
      application.json
      ui/
        index.html
        ...static assets...
      backend/
        bundle.json
        dist/
          entry.mjs
          ...bundled chunks...
        migrations/
          ...optional SQL files...
        assets/
          ...optional runtime assets...
      agents/
        ...optional embedded app-owned agents...
      agent-teams/
        ...optional embedded app-owned teams...
```

This is the canonical bundle-valid shape for **both**:
- repo-local discovered application roots, and
- explicitly imported/provisioned application package roots.

### Import rules

- bundle must be prebuilt before import
- backend distribution must be self-contained under `backend/`
- AutoByteus does not run arbitrary package-manager install/build scripts during import
- backend runtime dependencies must be bundled into `backend/dist/**` or rely only on Node built-ins / injected platform context
- migration assets are SQL-file based in v1 so the platform can execute them before worker readiness
- a no-op backend bundle is valid and required for frontend-heavy apps so the contract stays uniform

### Canonical application-root rule

- the directory containing a valid `application.json` is an `Application Root`
- all manifest-relative paths resolve from that application root
- a parent `applications/` directory is only a container of application roots; it is not itself an application
- repo-local sample/shipped apps and later user-imported apps share this same root rule and bundle shape
- the repo-local `applications/<application-id>/` directory is itself the canonical bundle-valid runnable root, not merely an authoring workspace
- therefore the manifest in that repo-local root must point at in-place `ui/`, `backend/`, and runtime-target assets that already satisfy the bundle contract
- optional authoring helper files/folders may coexist in the same root, but they are outside the bundle contract unless referenced by the manifest or backend bundle manifest
- a nested `dist/importable-package/applications/<application-id>/` root, if emitted, is a packaging-only artifact and does not participate in repo-local discovery unless explicitly provisioned/imported as a separate package source

### Repo-local discovery rule

- repo-local discovery scans direct child application roots under the configured `<packageRoot>/applications/` container
- therefore `applications/<application-id>/` is the discovered repo-local root
- nested paths such as `applications/<application-id>/dist/importable-package/applications/<application-id>/` are ignored by repo-local discovery by default
- those nested packaging outputs become installable only when a user or provisioning flow explicitly targets that packaging root as a separate import/package source

## V1 Backend Definition Contract

```ts
import { defineApplication } from '@autobyteus/application-backend-sdk'

export default defineApplication({
  definitionContractVersion: '1',

  lifecycle: {
    async onStart(ctx) {},
    async onStop(ctx) {},
  },

  queries: {
    'tickets.get': async (input, ctx) => {},
  },

  commands: {
    'tickets.create': async (input, ctx) => {},
  },

  routes: [
    {
      method: 'GET',
      path: '/tickets/:id',
      handler: async (req, ctx) => {},
    },
  ],

  graphql: {
    async execute(request, ctx) {},
  },

  eventHandlers: {
    async sessionStarted(event, ctx) {},
    async sessionTerminated(event, ctx) {},
    async artifact(event, ctx) {},
  },
})
```

### Backend SDK principles

- app authors are free to structure internal repos/services/domain models however they want
- platform standardizes only the exported boundary, not internal layering
- storage is injected as app-scoped capability (`appDatabaseUrl`, app storage paths, optional idempotency helpers), never as hidden platform DB access or core server repository access
- platform context may expose explicit host runtime/session APIs later, but core platform ownership stays outside app code

### Author-facing runtime publication contract

The primary author-facing runtime publication boundary is **artifact-centric**.

The agent/runtime-side tool contract should be shaped as:

```ts
publish_artifact({
  contractVersion: '1',
  artifactKey: string,
  artifactType: string,
  title?: string | null,
  summary?: string | null,
  artifactRef: ApplicationArtifactRef,
  metadata?: Record<string, unknown> | null,
  isFinal?: boolean | null,
})
```

Rules:
- the agent publishes the artifact it produced; it does **not** need to choose a member-specific publication family name;
- the platform derives `applicationId`, `applicationSessionId`, and producer/member provenance from injected runtime context;
- `SESSION_STARTED` and `SESSION_TERMINATED` remain platform-generated lifecycle events;
- separate `memberArtifact`, `deliveryState`, and `progress` publication families are out of scope for the target author-facing v1 contract.

### Promoted runtime event dispatch contract

`ApplicationPublicationService` allocates the durable event identity when the normalized promoted event is appended:

```ts
type NormalizedArtifactPayload = {
  artifactKey: string
  artifactType: string
  title?: string | null
  summary?: string | null
  artifactRef: ApplicationArtifactRef
  metadata?: Record<string, unknown> | null
  isFinal?: boolean | null
}

type NormalizedPublicationEvent<TPayload = unknown> = {
  eventId: string
  journalSequence: number
  applicationId: string
  applicationSessionId: string
  family:
    | 'SESSION_STARTED'
    | 'SESSION_TERMINATED'
    | 'ARTIFACT'
  publishedAt: string
  producer: {
    memberRouteKey: string
    memberName?: string | null
    role?: string | null
  }
  payload: TPayload
}
```

`ApplicationPublicationDispatchService` wraps that stable event in delivery metadata when invoking the app worker:

```ts
type ApplicationEventDispatchEnvelope<TPayload = unknown> = {
  event: NormalizedPublicationEvent<TPayload>
  delivery: {
    semantics: 'AT_LEAST_ONCE'
    attemptNumber: number
    dispatchedAt: string
  }
}
```

Rules:
- `event.eventId` and `event.journalSequence` are generated once on journal append and never change on retry.
- `journalSequence` is strictly increasing per application and is the only ack-cursor ordering key.
- The dispatcher processes one pending record at a time per application and does not deliver later sequences before earlier ones are durably acknowledged.
- If an app does not register a handler for the event family, dispatch is treated as a successful no-op and the cursor may advance.
- A handler success is acknowledged only after the host durably records the ack cursor update. Any crash or write failure before that ack means the same event may be redelivered.
- Retryable failures leave the cursor unchanged and are retried with exponential backoff. V1 does not auto-skip poisoned records.
- Therefore app handlers must make side effects idempotent against `event.eventId`. Platform owns stable identity and retry transport; app code owns semantic idempotency of its own writes and external side effects.
- Recommended app-side pattern: keep a processed-event ledger or use upsert semantics keyed by `event.eventId` when handler side effects are not naturally idempotent.

## V1 App Engine Startup / Storage Lifecycle

Authoritative startup sequence:

`Resolve app identity -> derive storage root -> ensure platform DB -> ensure app DB -> acquire migration lock -> bootstrap platform tables -> validate app SQL migrations -> run app SQL migrations against app DB -> release lock -> start worker -> load backend definition -> validate exposures -> mark engine ready`

### Storage root layout

```text
<AppDataDir>/applications/<encoded-application-id>/
  db/
    app.sqlite
    platform.sqlite
  logs/worker.stdout.log
  logs/worker.stderr.log
  runtime/
    engine.lock
    engine-status.json
```

### Platform DB + app DB boundary

- `db/app.sqlite` is app-owned. App authors may define whatever domain tables, indexes, repos, and services they want there.
- `db/platform.sqlite` is platform-owned. It is never exposed to app code and is never attached during app-authored migration execution.
- The reserved prefix `__autobyteus_` remains platform-owned globally and may not be used by app-authored SQL, even inside `app.sqlite`.

### Reserved platform tables in `platform.sqlite`

- `__autobyteus_storage_meta`
- `__autobyteus_app_migrations`
- `__autobyteus_session_index`
- `__autobyteus_session_projection`
- `__autobyteus_publication_journal`
- `__autobyteus_publication_dispatch_cursor`

These are platform-owned tables inside `platform.sqlite`.
Everything inside `app.sqlite` is app-owned unless it uses the reserved `__autobyteus_` prefix, which is forbidden to app-authored SQL.

Retry/attempt metadata for promoted-event delivery lives on platform-owned journal rows and/or companion platform-owned dispatch state, never in app-authored migration files.

### Migration enforcement boundary

`ApplicationMigrationService` executes app-authored SQL only on a dedicated connection opened against `db/app.sqlite`.

Before execution, every migration file is validated and rejected if any statement:
- uses `ATTACH`, `DETACH`, `VACUUM INTO`, `load_extension`, or `PRAGMA writable_schema`
- references any identifier beginning with `__autobyteus_`
- touches SQLite system tables such as `sqlite_%`

Execution rules:
- `platform.sqlite` is bootstrapped only by platform code and is never attached during app migration execution.
- each app migration file runs inside a transaction against `app.sqlite` only
- if validation fails, the migration run aborts, engine startup fails, and the worker is not started
- successful migration history is recorded by the platform in `platform.sqlite`, not in app-authored tables

### Key ownership rule

The worker never decides whether to create either DB, where the DBs live, which tables are platform-owned, or how migrations are validated and ordered.
Those responsibilities remain platform-owned inside `ApplicationStorageLifecycleService`.

## V1 Backend Exposure Model

The platform must not limit app authors to one backend style, but the platform still owns the transport boundary.

### Canonical exposure families

- `queries`
- `commands`
- `routes`
- `graphql`
- `notifications`
- `eventHandlers`

### Platform-owned mounts

- queries: platform-defined invoke endpoint (SDK hides transport)
- commands: platform-defined invoke endpoint (SDK hides transport)
- routes: `/rest/applications/:applicationId/backend/routes/*`
- graphql: `/rest/applications/:applicationId/backend/graphql`
- notifications websocket: `/ws/applications/:applicationId/backend/notifications`

### Important v1 limits

- route handlers are platform-mounted, not standalone listeners
- GraphQL is one executor per app in v1
- GraphQL subscriptions are not required in v1 because notifications + session streams already provide push channels
- route uploads / websocket upgrade passthrough / arbitrary streaming protocols are not first-class v1 guarantees

This still keeps the design open-minded while avoiding uncontrolled infra bypass.

## Host Application Launch Surface / Iframe Bootstrap Spine

### Authoritative owner

- `ApplicationSurface.vue` is the authoritative host-side launch owner once route binding resolves a live application session.
- `ApplicationIframeHost.vue` becomes an internal bridge beneath that boundary. It renders the iframe for a supplied descriptor and surfaces DOM/message signals back to the launch owner, but it does not own cross-session bootstrap state or remount policy.
- `applicationSessionStore.ts` remains the authority for session binding, session snapshots, session streaming, and runtime launch commands only. It must stop owning `bootstrapState` / `bootstrapError`.

### Stable launch descriptor invariant

One immutable `ApplicationIframeLaunchDescriptor` defines iframe identity for one launch instance.

Required descriptor fields:
- `applicationSessionId`
- `entryHtmlUrl`
- `expectedIframeOrigin`
- `normalizedHostOrigin`
- `contractVersion`
- `launchInstanceId`

Allowed iframe-remount triggers:
- resolved `applicationSessionId` changes
- `entryHtmlUrl` / `entryHtmlAssetPath` changes
- bound REST base/origin changes that change the resolved entry HTML URL
- contract-version changes
- explicit user retry / relaunch
- explicit host-origin normalization change

Must **not** remount the iframe:
- ordinary session-stream member/artifact updates
- retained execution-view updates
- host visual launch-state transitions
- app-local first-query / first-command loading after bootstrap

### Success spine

`Application details screen activation -> route binding resolves live session -> ApplicationSurface commits stable launch descriptor + launchInstanceId -> ApplicationIframeHost mounts/reuses iframe -> child app posts ready(sessionId, launchInstanceId) -> ApplicationSurface accepts only the matching ready signal -> host posts bootstrap(sessionId, launchInstanceId, transport) -> bundled frontend SDK activates -> app-local initial data loading begins`

### Failure / timeout / retry spine

`Descriptor commit -> wait for ready timeout -> timeout / contract mismatch / bridge failure -> ApplicationSurface visual failed state -> explicit retry -> new launchInstanceId -> new descriptor commit`

Important rule:
- host bootstrap completion ends when bootstrap is delivered to the matching launch instance.
- any first backend query, read-model fetch, or empty/error/loading UI after that belongs to the app itself, not to the host bootstrap state machine.

### Packaged Electron `file://` host contract

The internal iframe contract must be explicit for packaged-host runs:

- URL launch hints include:
  - `contractVersion`
  - `applicationSessionId`
  - `launchInstanceId`
  - `hostOrigin` (normalized)
- ready envelope includes:
  - `applicationSessionId`
  - `launchInstanceId`
- bootstrap envelope includes:
  - `applicationSessionId`
  - `launchInstanceId`
  - application/runtime/transport payload

Matching rules:
- host accepts ready only when `event.source`, iframe origin, `applicationSessionId`, and `launchInstanceId` match the current descriptor
- child accepts bootstrap only when `applicationSessionId`, `launchInstanceId`, and normalized host origin all match
- the packaged-host origin matcher must treat the expected serialized packaged-host value (`file://`) according to one reviewed helper rather than ad hoc string equality in each caller

### Load-event rule

`iframe load` remains observational only. It may be logged for diagnostics, but it must not:
- create a new launch instance
- reset the handshake state machine
- restart waiting just because the DOM emitted another load

Why:
- live evidence already shows the child can post ready before or alongside the host load callback in packaged runs
- therefore `load` cannot be the authority that decides handshake progression

## Application Page Shell / Metadata Placement

### Authoritative owner

- `ApplicationShell.vue` is the authoritative page-level owner for the launched application screen.
- It owns:
  - app identity and description placement
  - primary actions (`Launch`, `Relaunch`, `Stop current session`)
  - `Application` vs `Execution` mode switching
  - visibility of secondary details/debug metadata
  - whether the page is in prelaunch/catalog-style layout or immersive live-session layout
- It does **not** own iframe bootstrap handshake mechanics; those remain inside `ApplicationSurface.vue`.

### Information architecture

The launched-application experience now has three intentional host surfaces:

1. `Application View`
   - default, app-first, near-full-screen usage surface
2. `Execution View`
   - host-native member/artifact inspection surface
3. `Details / Debug`
   - explicit secondary metadata and diagnostics surfaces

Important rule:
- these are **not** three equal tabs full of similar diagnostics.
- `Application View` is where the app is used.
- `Execution View` is where the user inspects retained execution outcomes.
- `Details / Debug` are secondary surfaces for operational metadata and developer diagnostics.

### Live-session layout rule

When no live session exists:
- the page may use a centered introduction / launch layout.
- description and launch guidance may be more prominent.

When a live session exists:
- the page switches to an immersive live-session layout.
- remove the catalog-style max-width metadata-card presentation.
- keep only thin host chrome above the app canvas.
- the launched app canvas should occupy the overwhelming majority of the remaining width and height.

This is the key product rule for making launched applications feel like self-contained applications rather than metadata-heavy host records.

### Host chrome allowed in `Application View`

Visible by default around the app canvas:
- back navigation
- app title
- small live-status indicator
- primary actions (`Relaunch`, `Stop current session`)
- mode switch (`Application`, `Execution`)
- optional `Details` affordance

Not appropriate as dominant default chrome in live-session `Application View`:
- package ids
- runtime target ids
- session ids
- run ids
- backend URLs
- large metadata cards above the iframe

If description text is kept during a live session, it should remain short and subordinate to the app canvas rather than pushing the app below the fold.

### Metadata placement policy

#### Tier 1 — default user-facing
Show by default in the page chrome:
- app name
- app description or short subtitle when useful
- whether a live session currently exists
- launch / relaunch / stop actions
- mode switch (`Application`, `Execution`)

#### Tier 2 — secondary details surface
Hide behind an explicit `Details` affordance (drawer, collapsible panel, or similar):
- package id
- local application id
- writable/source provenance
- runtime target kind and definition id
- current live session id
- current runtime `runId`
- route-binding resolution / created-at timestamps

#### Tier 3 — developer/debug-only
Do not show in the normal Application View by default. Expose only through explicit developer/debug affordances or docs:
- backend gateway URLs
- raw GraphQL / REST / websocket transport URLs
- asset paths
- importable package roots / filesystem paths

### `Application View` vs `Execution View`

`Application View`:
- primary delivered surface
- app-specific iframe UI
- minimal host chrome only
- no large metadata cards above the app by default
- app bootstrap overlays/spinners/errors belong on the app canvas, not in a separate diagnostic block above it

`Execution View`:
- host-native operational inspection surface
- left member rail with stable selection
- selected member artifact-focused main pane
- secondary retained-artifact list when multiple artifacts exist
- lightweight runtime context only when needed to orient the user
- explicit `Open full execution monitor` affordance rather than embedding the full team/agent workspace inside Applications

Important rule:
- the host should not make `Application View` and `Execution View` visually equivalent diagnostic shells.
- `Application View` is for using the app; `Execution View` is for inspecting how the app runtime is working.
- `Execution View` should stop at retained member/artifact inspection and must not duplicate:
  - the full team chat monitor
  - team focus/grid/spotlight monitor modes
  - shared composer / input area
  - the broader workspace running/history navigation chrome

### Execution details deep-linking to `/workspace`

Applications should not reimplement the full execution monitor. Instead:
- `ApplicationExecutionWorkspace.vue` owns a lightweight retained artifact/member inspection surface.
- when the user wants the full monitor, it emits one explicit workspace-open intent.
- the system navigates to the main `/workspace` route and focuses the corresponding live or historical run/member there.

#### Carried execution-link identity

The cross-surface deep-link contract should carry at least:
- `selectionType`: `agent` | `team`
- `runId`
- optional `memberRouteKey`

Optional origin metadata may also be carried for return navigation or breadcrumbs:
- `applicationId`
- `applicationSessionId`
- `source=applications`

Example shape:

```ts
{
  selectionType: 'team',
  runId: '<teamRunId>',
  memberRouteKey: '<selectedMemberRouteKey>',
  source: 'applications',
  applicationId: '<applicationId>',
  applicationSessionId: '<applicationSessionId>'
}
```

#### Authoritative boundary

- `ApplicationExecutionWorkspace.vue` is a producer only. It must not mutate workspace selection stores directly.
- `workspaceNavigationService.ts` builds the route handoff from the typed execution-link contract.
- `WorkspaceRouteSelectionController` (for example `useWorkspaceRouteSelection.ts` used by `pages/workspace.vue`) is the authoritative consumer boundary.
- That controller parses the route/query intent and reuses existing lower-layer selection/opening logic such as:
  - `selectRun()` for already-loaded live runs
  - `openTeamRun()` / existing historical hydration coordinators when the target must be opened or hydrated first

This keeps the authoritative workspace-monitor selection logic inside the workspace boundary instead of distributing it across application components.

### Current session-model UX rule

Current platform truth:
- one live session per application id
- creating a new session terminates/replaces the previous live session

Required UX consequence:
- the page is application-centric, not session-list-centric
- use `Launch Application` when no live session exists
- use `Relaunch` / `Restart` language when a live session already exists
- `Stop current session` returns the page to a non-live application state
- do not imply that multiple concurrent launched versions are available in the current Applications page
- raw `applicationSessionId` remains a secondary or debug concept, not the default user-facing identity of the launched app

If future multi-session/history support is added, that is a separate design change with its own page/navigation implications.

### Teaching-sample UX rule

`Brief Studio` should teach an end-user/app-first default:
- its primary hero should emphasize the brief workflow and generated content
- app ids, session ids, run ids, and backend URLs should move behind an explicit developer/details affordance or out of the visible UI entirely
- when launched inside AutoByteus, the sample should visually benefit from the same immersive live-session Application View shell described above
- the README can still explain those diagnostics for app authors without making them the first thing end users see

## Frontend SDK Shape

Conceptual browser API:

```ts
const client = await createApplicationClient()

client.getApplicationInfo()
client.getBackendStatus()
client.getSessionSnapshot()
client.subscribeSession((snapshot) => {})
client.query('tickets.get', { id: 'T-1' })
client.command('tickets.create', { title: 'New ticket' })
client.graphql(document, variables)
client.request('/tickets/T-1', { method: 'GET' })
client.subscribeNotifications((message) => {})
```

The SDK owns:
- bootstrap parsing
- endpoint resolution
- app request-context propagation
- runtime/session subscriptions
- backend notification subscription
- shared type exports

It must not own:
- app-specific UI rendering
- host-native execution UI
- business logic helpers specific to one app

## Follow-On Canonical Teaching Sample Slice

This ticket also needs one pedagogical sample that teaches app authors how to use the implemented platform honestly.

### Why repo-local apps should share one architecture

The repo should not preserve a special built-in-app architecture.

Instead:
- repo-local sample/shipped apps should live under one canonical repo-root `applications/` container;
- `socratic-math-teacher` and `brief-studio` should both be normal application packages under that container;
- whether an app is repo-shipped, preinstalled, or later imported by a user is a provisioning/install concern, not a different application architecture.

This keeps the core platform tree focused on platform code while teaching one consistent app-package shape.

### Canonical application-root rule for the sample

- `applications/<application-id>/application.json` defines the repo-local application root
- all manifest-relative paths resolve from that directory
- app-local documentation should live in that same root so the package teaches itself in place
- a derived importable build output may emit a packaging-only mirror under `dist/importable-package/applications/<application-id>/`; that mirror becomes a valid install target only when explicitly provisioned/imported as its own package source

### Selected teaching concept

Working concept: **Brief Studio**

Why this concept is a good first sample:
- a two-member flow is natural and easy to follow;
- both members can produce inspectable artifacts;
- the app can project those artifact publications into domain tables without needing external integrations;
- the app can add one simple user-driven review workflow on top of generated artifacts.

### Selected two-member team

- `researcher`
  - produces research-note / source-summary artifacts
- `writer`
  - produces draft/final brief artifacts from the research output

This gives the sample one clear narrative:

`researcher artifact -> writer artifact -> app review state`

### Teaching goals

The sample must teach all of these in one coherent, minimal slice:

1. manifest-anchored application-root shape
2. repo-local app-package shape plus later import/provision story
3. two-member app-owned team definition
4. backend definition through `@autobyteus/application-backend-sdk`
5. app-owned SQL migrations in `app.sqlite`
6. repository / service / event-handler structure
7. runtime publication -> persisted domain state projection
8. frontend SDK usage for query/command interaction
9. one honest app-specific UI
10. idempotent event handling using stable `eventId`

It must **not** try to teach every optional surface in the first example.

### Teaching sample scope boundary

The first sample teaches these surfaces clearly:
- `queries`
- `commands`
- `eventHandlers`
- optional `notifications`
- frontend SDK
- backend SDK
- SQL migrations

The first sample does **not** need to teach:
- custom REST routes
- GraphQL
- multipart/file upload
- multi-user collaboration
- advanced auth/permissions
- multiple concurrently live app installs

### Canonical sample placement

Recommended placement:

```text
applications/
  brief-studio/
    README.md
    application.json
    ui/
      index.html
      ...bundle-valid frontend assets referenced by the manifest...
    backend/
      bundle.json
      dist/
        entry.mjs
        ...bundled runtime chunks...
      migrations/
        001_create_brief_tables.sql
      assets/
        ...optional runtime assets...
    agents/
      researcher/
      writer/
    agent-teams/
      brief-studio-team/
    backend-src/
      index.ts
      ...authoring-only TypeScript source used to refresh backend/dist...
    package.json
    tsconfig.backend.json
    scripts/
      build-package.mjs
    dist/
      importable-package/
        applications/
          brief-studio/
            README.md
            application.json
            ui/
            backend/
            agents/
            agent-teams/
  socratic-math-teacher/
    README.md
    application.json
    ui/
    backend/
    agents/
    agent-teams/
    ...same overall root contract, but shallower sample contents...
```

Rules:
- `applications/<application-id>/` is the canonical repo-local runnable application root when it contains `application.json`
- that repo-local root must satisfy the bundle contract in place, including the `ui/` and `backend/` payloads referenced by the manifest
- app-local README guidance belongs inside that app root
- optional authoring helpers such as `backend-src/`, `package.json`, `scripts/`, and `tsconfig.backend.json` may live alongside the runnable payload, but repo-local discovery ignores them because they are not manifest-targeted bundle assets
- repo-local app packages and later user-imported app packages use the same bundle contract
- `dist/importable-package/applications/<application-id>/` is an optional packaging-only mirror for distribution/provisioning flows; repo-local discovery ignores it unless that packaging root is explicitly provisioned/imported as a separate package source
- the platform may preinstall or ship selected repo-local applications, but that does not make them a different application type
- build tooling must refresh the in-place `ui/` and `backend/` payloads before repo-local discovery/runtime use; import does not perform arbitrary builds

### Sample-owned backend structure

Recommended backend source layout:

```text
backend-src/
  index.ts
  domain/
    brief-model.ts
    artifact-model.ts
    review-note-model.ts
  repositories/
    brief-repository.ts
    artifact-repository.ts
    review-note-repository.ts
    processed-event-repository.ts
  services/
    brief-projection-service.ts
    brief-review-service.ts
  queries/
    list-briefs.ts
    get-brief-detail.ts
  commands/
    approve-brief.ts
    reject-brief.ts
    add-review-note.ts
  event-handlers/
    on-artifact.ts
  migrations/
    001_create_brief_tables.sql
```

This structure matters because the sample is supposed to teach app authors where their own business logic belongs.

Sample runtime-authoring rule:
- each application-owned agent must use the standard valid `agent.md` definition format expected by the platform parser (including required frontmatter fields such as `name`);
- each Brief Studio agent that is instructed to publish artifacts must explicitly include `publish_artifact` in `agent-config.json` `toolNames`;
- the teaching sample must be import-valid and launch-valid, not merely architecturally illustrative.

Ownership rule for this sample:
- `on-artifact.ts` is the thin adapter handler only
- `brief-projection-service.ts` is the one app-owned owner of:
  - deriving the brief correlation identity,
  - claiming `eventId` dedupe ownership,
  - and applying the brief/artifact/status projection atomically from artifact publications plus producer provenance
- repositories remain transaction-scoped helpers under that service; they do not decide projection ordering independently

### Sample app domain model

Minimum domain tables:

- `briefs`
  - one row per logical generated brief / review target
  - `brief_id TEXT PRIMARY KEY`
  - in Brief Studio v1, `brief_id` is defined as the stable application-owned correlation identity `brief::<applicationSessionId>`
  - stores status such as `researching`, `draft_ready`, `in_review`, `approved`, `rejected`
- `brief_artifacts`
  - stores projected researcher/writer artifacts
  - keyed to the owning brief by `brief_id`
  - recommended uniqueness: one latest row per `(brief_id, artifact_kind)` or equivalent deterministic upsert key
- `review_notes`
  - stores user-authored app review notes
- `processed_events`
  - stores handled `eventId` values for idempotent event processing
  - `event_id TEXT PRIMARY KEY`
  - written by the projection service inside the same transaction as the domain writes

This is intentionally simple:
- enough to show app-owned schema freedom,
- enough to show projection from runtime events,
- and enough to show a user-driven review workflow.

### Sample correlation identity

The sample must define its correlation identity explicitly instead of implying it.

Brief Studio v1 rule:
- one launched application session corresponds to exactly one logical brief
- therefore the app-owned correlation identity is:

```text
brief_id = "brief::" + event.applicationSessionId
```

Implications:
- researcher and writer publications from the same `applicationSessionId` always project into the same `briefs` row
- a new launched application session creates a new logical brief
- the sample deliberately avoids teaching multi-brief-per-session correlation in v1 because that would hide the ownership lesson behind extra domain complexity

This is a sample-specific business rule, not a platform rule.

### Atomic projection owner

`brief-projection-service.ts` is the explicit owner of safe at-least-once projection for Brief Studio.

Its contract is:
1. derive `brief_id` from `event.applicationSessionId`
2. open one `app.sqlite` transaction
3. attempt to claim the event by inserting `processed_events.event_id = event.eventId`
4. if the insert conflicts, treat the event as already handled and exit with no further side effects
5. if the claim succeeds, upsert the `briefs` row, upsert/update the relevant `brief_artifacts` row, and update brief status
6. commit once both the dedupe marker and domain writes are durable together

That means the sample teaches this safe pattern:

```text
BEGIN
  INSERT processed_events(event_id, brief_id, processed_at) VALUES (...)
    ON CONFLICT(event_id) DO NOTHING
  if no row inserted -> already handled, stop
  UPSERT briefs(...)
  UPSERT brief_artifacts(...)
  UPDATE briefs SET status = ...
COMMIT
```

This is intentionally different from the unsafe teaching pattern:

```text
check processed_events -> write domain rows -> record event_id
```

The sample must teach the atomic claim-and-project pattern, not the racy check-then-write pattern.

### Sample event projection flow

Primary teaching spine:

`runtime publication -> ApplicationPublicationService -> durable dispatch -> app event handler adapter -> brief-projection-service transaction -> app.sqlite -> frontend query`

Concrete sample behavior:
- researcher publishes an `ARTIFACT` with a research-note / source-summary `artifactType` via the explicitly exposed `publish_artifact` tool
  - the platform attaches producer provenance from runtime context
  - event handler delegates to `brief-projection-service`
  - service derives `brief_id = brief::<applicationSessionId>`
  - inside one transaction, service claims `eventId`, upserts the `briefs` row, and upserts the researcher artifact row
- writer publishes an `ARTIFACT` with a draft/final brief `artifactType` via the explicitly exposed `publish_artifact` tool
  - the platform attaches the writer producer provenance from the same session context
  - event handler delegates to `brief-projection-service`
  - service derives the same `brief_id` from the same `applicationSessionId`
  - inside one transaction, service claims `eventId`, upserts the writer artifact row, and sets brief status to `in_review`
- the app derives brief status from artifact type + producer provenance
  - no separate delivery-state or progress publication family exists in the sample contract

Idempotency rule:
- event handlers do not implement ad-hoc dedupe logic themselves
- `brief-projection-service` atomically claims `eventId` and applies the projection in one transaction
- if the `processed_events` insert does not claim a new row, the event is treated as already handled and no domain writes are replayed
- if the claim succeeds, the service performs all correlated domain writes before commit

### Sample frontend flow

Primary user-driven spine:

`app UI action -> frontend SDK -> command -> repository/service -> app.sqlite -> query refresh`

Concrete sample behavior:
- frontend loads a brief list through `briefs.list`
- frontend opens one brief detail view through `briefs.getDetail`
- reviewer clicks approve/reject/add note
- frontend sends `approveBrief`, `rejectBrief`, or `addReviewNote`
- backend updates domain state
- frontend re-queries and renders the updated brief state

### Sample UI shape

The sample UI should stay small and readable:

1. **Brief list**
   - left-side or top list of brief rows
   - status badge and updated time
2. **Brief detail**
   - current brief artifact
   - research artifact summary
   - review notes
3. **Review actions**
   - approve
   - reject
   - add note

The sample UI must use `@autobyteus/application-frontend-sdk`.
It must not teach raw host transport wiring as the primary app-author workflow.

### Honest ownership teaching

The sample documentation must make these boundaries explicit:

Platform-owned:
- package import/install
- application session launch/binding
- worker hosting
- storage provisioning
- migration execution
- runtime publication authority
- backend gateway
- host-native execution view

App-owned:
- team/member definitions inside the package
- app UI
- backend handlers
- schema and migrations
- repositories/services
- event-driven domain projections
- app-specific review workflow

### Sample-specific file placement decision

Place repo-local application packages under:

```text
applications/
  <application-id>/
```

That root is itself the runnable bundle-valid application root. It must already contain the manifest-targeted `ui/`, `backend/`, `agents/`, and `agent-teams/` payloads in place.

Do **not** keep separate sample-app roots such as:

```text
autobyteus-server-ts/applications/
examples/external-apps/
```

Those names teach an architectural split that the platform no longer wants.

If nested packaging outputs such as `applications/<application-id>/dist/importable-package/applications/<application-id>/` are retained, they are packaging-only mirrors. Repo-local discovery ignores them unless a provisioning/import flow explicitly selects that packaging root as a separate package source.

If the platform chooses to ship or preinstall `socratic-math-teacher`, `brief-studio`, or future sample apps, that should happen as a provisioning choice over the same application-package shape rather than through a special built-in-app architecture.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep accepting static-only `application.json` bundles indefinitely | existing built-in/sample apps use the old contract | `Rejected` | migrate all in-scope bundles to manifest v2 with required backend payload (no-op allowed) |
| Keep in-memory session/projection state while also adding DB-backed state | easier short-term implementation | `Rejected` | replace authority with durable `ApplicationSessionStateStore` backed by hidden platform DB reserved tables |
| Let app authors keep using raw iframe/bootstrap/session transport details | avoids SDK work | `Rejected` | frontend SDK becomes the public boundary; raw contract remains internal |
| Let workers bootstrap/migrate their own DB | gives app code more infra control | `Rejected` | `ApplicationStorageLifecycleService` owns DB creation + migration ordering before worker readiness |
| Let app backends bind standalone servers/ports by default | maximizes unrestricted flexibility | `Rejected` | app exposures remain platform-mounted through `ApplicationBackendGatewayService` |

Hard block:
- Any design that depends on backward-compatibility wrappers, dual-path behavior, or retained legacy flow for in-scope replaced behavior fails review.

## Derived Layering (If Useful)

From top to bottom:

1. **App-Specific Application View**
   - imported frontend bundle + frontend SDK
2. **Host-Native Execution View**
   - promoted retained session state, selected agent artifact/log layering
3. **Platform Application Logic**
   - bundle catalog, app engine status, app session lifecycle, publication authority, storage lifecycle, backend gateway
4. **App-Owned Application Logic**
   - app backend handlers, repos, services, app tables/read models
5. **Application Agent Runtime**
   - agent/team runtime producing promoted publications
6. **Platform Hosting Infrastructure**
   - worker process host, storage/migration ownership, transport/auth boundaries

## Migration / Refactor Sequence

1. **Separate application package management from agent package management**
   - add `application-packages` higher-layer boundaries (`ApplicationPackageService`, application-package API, application-package Settings UI)
   - stop using `AgentPackageService` / `AgentPackagesManager` as the long-term authoritative application import boundary
   - keep only narrow source-acquisition/root-registration utilities shared where they are truly mechanism-level

2. **Lock shared contract packages and bundle contract**
   - add `autobyteus-application-sdk-contracts`
   - define manifest v2, backend bundle manifest v1, backend definition contract v1
   - expand package validation so malformed application-owned agent definitions fail import/refresh instead of being skipped until launch
   - migrate the lightweight Socratic sample app to the no-op backend contract and the canonical application-root model

3. **Introduce app storage lifecycle**
   - add `application-storage`
   - derive per-app storage roots under `AppConfig`
   - create hidden platform DB, app DB, migration validation, and migration execution path

4. **Make session + publication state durable**
   - add `ApplicationSessionStateStore`
   - add `ApplicationPublicationService`
   - move publication authority out of ad-hoc session service internals
   - replace in-memory-only authority with platform-DB-backed reserved tables

5. **Introduce Application Engine**
   - add `application-engine`
   - implement engine host, worker supervisor, worker runtime, and RPC client
   - support no-op backend and real backend definitions

6. **Add publication dispatch to app backend**
   - add `ApplicationPublicationDispatchService`
   - deliver normalized promoted events from journal to worker event handlers
   - keep host projection authoritative even when worker delivery fails

7. **Add app backend gateway + notifications**
   - implement query/command/route/graphql/notification gateway under platform-owned routes
   - expose engine status and backend capability metadata

8. **Add frontend SDK and re-bootstrap app UI through it**
   - keep iframe host internal
   - move app-author public boundary to the frontend SDK
   - update Application View to bootstrap SDK-ready envelope

9. **Deepen host execution layering and remove stale legacy remnants**
   - add selected-agent artifact/log layering
   - remove stale compile-time app remnants and old documentation assumptions

10. **Normalize repo-local app roots and add the canonical teaching sample package**
   - move repo-local sample apps under the shared repo-root `applications/` container
   - make each `applications/<application-id>/` directory a runnable bundle-valid root in place
   - keep `application.json` and app-local README at each app root
   - add `brief-studio` as the canonical teaching sample beside the lightweight Socratic sample
   - keep any `dist/importable-package/applications/<application-id>/` output as a packaging-only mirror, ignored by repo-local discovery unless explicitly provisioned/imported
   - teach one narrow end-to-end query/command/event-handler/migration path clearly

## Key Tradeoffs

- **Maximum app freedom vs platform control**
  - chosen tradeoff: maximum freedom in app business logic and API style, strict control over infra boundaries.
- **App-scoped DB vs shared core DB access**
  - chosen tradeoff: per-app isolated app DB plus hidden platform DB; reject direct core DB/repository access and do not expose platform tables to app code.
- **Platform-run SQL migrations vs unrestricted app migration tooling**
  - chosen tradeoff: SQL-file migrations in v1 so the platform can own readiness ordering and validate that app-authored SQL never crosses into platform-owned storage. Internal runtime ORM/tooling remains app-defined inside the app DB boundary.
- **App-scoped backend gateway identity vs session-scoped backend identity**
  - chosen tradeoff: app-scoped gateway with optional session context, so durable application logic is not trapped inside live-session-only identity.
- **Optional backend exposure styles vs one canonical style**
  - chosen tradeoff: support query/command/routes/graphql as optional exposures, but keep them all behind one platform gateway.
- **Host projection first vs worker event-handler first**
  - chosen tradeoff: host promoted projection advances at publication authority boundary first; worker-side app domain reactions happen off-spine from the durable journal.
- **Higher-layer separation vs one generic package manager**
  - chosen tradeoff: separate application-package and agent-package UI/API/service boundaries by business intent; only share narrow source-acquisition plumbing below those authoritative boundaries.

## Risks

- The overall scope is large; implementation will need staged delivery rather than one flat change.
- Platform-run migration ownership requires careful failure handling so engine startup errors surface clearly.
- Shared contract packages must stay versioned carefully or SDK/host drift will break app compatibility.
- Route/GraphQL exposure flexibility increases gateway complexity; implementation should share a single request-context pipeline instead of branching ad hoc.
- Keep the primary author-facing runtime publication boundary artifact-centric; do not force every app author to publish separate member-artifact, progress, or delivery-state families in the target v1 architecture.
- At-least-once publication delivery means app handlers must be documented and tested as idempotent against stable event ids.
- Hidden platform-DB and app-DB layout must stay stable enough to support future multi-install and session-history evolution.

## Guidance For Implementation

- Build the design in the migration sequence above; do not start with the frontend SDK alone.
- Refactor application import/list/remove out of `AgentPackageService` / `AgentPackagesManager` before treating the import architecture as complete.
- Make `ApplicationPublicationService` explicit before adding worker event dispatch so publication authority remains clear.
- Keep app backend gateway app-scoped, not session-scoped. Pass session context explicitly when needed.
- Inject `appDatabaseUrl` / app storage capability into the worker instead of handing app code core repositories, core service objects, or hidden platform DB access.
- Reuse existing process-supervision and stdio RPC patterns instead of inventing a new transport.
- Keep host-native Execution View separate from app-specific Application View; do not try to move execution visibility into the imported app frontend.
- Treat the frontend SDK and backend SDK as publishable author boundaries, not as private host/server helper modules.
- Do not allow application-owned agent parse/config errors to degrade into launch-time missing-definition failures; reject the package during import/refresh and surface the real file/parse error early.
- Move bootstrap waiting/failed state out of `applicationSessionStore` and into the host launch-surface owner.
- Add `launchInstanceId` to the internal iframe contract before relying on retries/remounts for the same live session.
- Treat `iframe load` as diagnostic only; descriptor commit and matching ready acceptance govern the handshake state machine.
- Stop the host launch spinner/error boundary at bootstrap delivery; any first backend query/loading state after that belongs to the bundled app UI.
- Refactor `ApplicationShell.vue` so the default page is app-first: keep only app identity, minimal status, and primary actions above the iframe.
- Move package/runtime/session provenance into an explicit secondary details surface, and keep raw backend transport URLs in developer/debug-only surfaces rather than the normal Application View.
- Use launch/relaunch terminology that matches the actual single-live-session replacement model; do not imply multiple concurrent launched versions in the current page shell.
- Switch the live-session Application page from centered metadata cards to an immersive layout where the launched app canvas occupies the primary surface.
- Keep `ApplicationExecutionWorkspace.vue` artifact/member-focused and add an explicit `Open full execution monitor` handoff instead of embedding workspace monitor behavior inside Applications.
- Add one typed Applications-to-Workspace execution-link contract plus one authoritative workspace route-selection consumer that reuses existing run/team opening logic behind the `/workspace` boundary.
- Update Brief Studio so its visible UI teaches an end-user/app-first surface, with platform/debug diagnostics removed from the primary hero.
