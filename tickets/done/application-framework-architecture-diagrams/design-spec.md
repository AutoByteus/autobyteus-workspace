# Design Spec — Application Backend API Gateway Naming And Architecture Guide

**Status:** Design-ready for architecture review.

## Current-State Read

The current production path is healthy but named ambiguously. Fastify REST adapters call `ApplicationBackendGatewayService`, which validates application availability/existence and request-context identity before delegating status/readiness/query/command/GraphQL/route operations to `ApplicationEngineHostService`. The engine host owns the managed worker boundary. For app-defined notifications, the gateway service subscribes to engine notifications and publishes them through `ApplicationBackendNotificationStreamService`; the WebSocket route owns connection adaptation.

The owning source folder is `src/application-backend-gateway/`, containing the service and its notification-stream concern. The class, accessor, folder, service file, focused unit-test folder/file, module doc/title/path, imports/mocks/local identifiers, and long-lived prose consistently use the same current term. This is not fragmented ownership; it is one ambiguous compound name propagated correctly.

The REST adapter's `sendGatewayError` helper is not owned by that service. The same helper maps errors for gateway-backed routes and for direct execution-resource configuration, orchestration-resource listing, and availability reload/re-entry routes. Its owner is therefore the complete `application-backends.ts` route adapter, and its target name must remain neutral rather than imply API-gateway ownership.

The current name fails the user's inferability test because “backend gateway” can mean either “gateway to the backend” or “gateway inside the backend.” Adding `API` makes the destination and role explicit while preserving the same boundary. `ApplicationGatewayService` would be falsely broad because catalog, setup, iframe hosting, packages, resource configuration, and some availability/reload routes have separate owners.

Evidence and stable paths are recorded under `BEH-001` through `BEH-003` in `investigation-notes.md`.

## Intended Change

Perform one clean naming and documentation cutover:

- `ApplicationBackendGatewayService` -> `ApplicationBackendApiGatewayService`;
- `getApplicationBackendGatewayService` -> `getApplicationBackendApiGatewayService`;
- `src/application-backend-gateway/` -> `src/application-backend-api-gateway/`;
- `application-backend-gateway-service.ts` -> `application-backend-api-gateway-service.ts`;
- focused unit-test folder/file and active owner-specific imports/mocks/locals/descriptions -> API-gateway names;
- REST-adapter-wide `sendGatewayError` -> `sendApplicationBackendRouteError` while preserving its mapping and all callers;
- `application_backend_gateway.md` -> `application_backend_api_gateway.md`, with title/cross-links/prose updated;
- Mermaid guide -> `Application Backend API Gateway` label.

Preserve all execution, notification, routing, SDK, persistence, compatibility, and streaming behavior.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | Contract/System | `REQ-001`..`REQ-004`, `REQ-006`; `AC-001`..`AC-004`, `AC-006` | Frontend status/readiness/query/command/GraphQL/route request | Investigation `BEH-001`; gateway service, REST adapter, engine host, unit/integration coverage | Rename the server API boundary only; preserve admission, scope, engine call, URL, result, and error behavior | `GW-DS-001` |
| `BEH-002` | Contract/System | `REQ-002`..`REQ-005`; `AC-002`..`AC-005` | Worker publishes an app-defined notification and a frontend may be subscribed | Investigation `BEH-002`; gateway notification bridge, stream service, WebSocket adapter | Rename the owning gateway boundary/path only; keep stream service/API/payload/path/delivery semantics | `GW-DS-002` |
| `BEH-003` | Documentation | `REQ-003`, `REQ-005`, `REQ-006`; `AC-005`, `AC-006` | Maintainer reads active architecture/source documentation | Investigation `BEH-003`; module docs and Mermaid supplement | Use one inferable target term and remove old active terminology; no new behavior | `GW-DS-003` |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| [`architecture-data-flow-spines.md`](./architecture-data-flow-spines.md) | Mermaid architecture/data-flow visualization | `REQ-001`..`REQ-005`; `AC-001`..`AC-005` | Applies the approved target API-gateway name to the finalized preserved framework baseline while showing the unchanged request, return, notification, worker, orchestration, lifecycle, artifact, and storage paths | In-progress approved-target visualization; approval `N/A` |

## Task Design Health Assessment (Mandatory)

- Change posture: `Refactor` plus documentation.
- Current design issue found: `Yes`, limited to naming discoverability.
- Root cause classification: `Shared Structure Looseness` in one repeated compound owner name.
- Refactor needed now: `Yes`, explicitly requested.
- Evidence: The current service and module are cohesive and correctly encapsulated, but the name is ambiguous to an architecture reader and appears in 20 active content files plus one moved stream path.
- Design response: Rename the one owner and every representation of its ownership atomically; do not expand, split, or change the owner.
- Refactor rationale: `Application Backend API Gateway` makes the boundary direction inferable while remaining narrower than a generic application gateway.
- Intentional deferrals/residual risk: Agent/team output streaming remains out of scope. No architecture refactor is deferred because no ownership defect was found.

## Terminology

- **Application Backend API Gateway:** the AutoByteus-server boundary that admits and forwards application-backend API operations to the engine host and bridges worker-originated app notifications to the gateway-owned stream.
- **Application backend:** the app-authored contract-v3 handlers loaded in the managed worker.
- **Application platform APIs:** broader application catalog/setup/package/availability surfaces; not all are owned by this gateway.

## Design Reading Order

Read the behavior map, then the two runtime spines, then ownership/dependency rules, then the file/folder move plan. The Mermaid supplement is the visual companion, not a separate behavior authority.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove the old class/accessor, source folder/file, focused test folder/file, module doc/path/title, and active owner-specific terminology.
- Add no alias export, deprecated accessor, re-export file, forwarding source file, duplicate folder, or old/new doc link.
- Historical ticket artifacts remain unchanged and are excluded from active inventory.

## Persisted Data / State Transition Decision

- Stored subject/location: None.
- Relevant code-model/schema change: None; TypeScript internal owner names and paths only.
- Normal readers/writers: unaffected.
- Required semantics/invariants: all storage and serialized values remain bit-for-bit governed by existing code.
- Physical/operational constraints: none.
- Decision: `Not Affected`.
- Rationale: no migration, rebuild, reset, compatibility behavior, or data validation is applicable.
- Supported criteria: `AC-003`, `AC-004`.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| `GW-DS-001` | Primary End-to-End | `BEH-001` | Application UI request | Handler result/error returned to UI | `ApplicationBackendApiGatewayService` for API admission/dispatch, with engine host governing worker lifecycle | Proves the renamed boundary remains the same server-to-worker API gateway |
| `GW-DS-002` | Return-Event | `BEH-002` | App handler notification | Subscribed application UI callback or deliberate live drop | `ApplicationBackendApiGatewayService` bridge plus `ApplicationBackendNotificationStreamService` fan-out | Proves the folder move/name change does not alter notification ownership or delivery semantics |
| `GW-DS-003` | Bounded Local | `BEH-003` | Canonical owner name | Source/tests/docs/diagram all use target terminology and old active name is absent | Gateway module/documentation owners | Prevents mixed old/new names after clean cut |

## Primary Execution Spine(s)

### `GW-DS-001` — Request/response

```text
Application UI
  -> Application Frontend SDK
  -> Fastify application-backend REST route
  -> ApplicationBackendApiGatewayService
  -> ApplicationEngineHostService
  -> Managed worker / app backend handler
  -> typed or unknown handler result/error
  -> gateway route response
  -> Application UI
```

The route `applicationId` remains authoritative. The API gateway still normalizes request context and prevents cross-application identity selection.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `GW-DS-001` | Frontend calls one backend surface; route adapter maps HTTP; API gateway validates app scope and delegates to engine; worker result returns through the same chain. | Frontend SDK, REST adapter, API gateway, engine host, worker handler | API gateway for admission; engine host for worker lifecycle | Error-to-status mapping, bundle/availability lookup |
| `GW-DS-002` | Worker emits app-defined notification; engine host publishes to the API gateway listener; stream service fans out to current app WebSocket subscribers. | Worker, engine host, API gateway bridge, notification stream, WebSocket/UI | API gateway module | Live/non-durable drop semantics, socket authorization |
| `GW-DS-003` | One canonical owner name propagates through source paths, tests, docs, and diagram; static inventory proves old active terms are gone. | Canonical class/path/doc title | Gateway module owner | Historical-ticket exclusion, docs links |

## Spine Actors / Main-Line Nodes

- Application UI and frontend SDK.
- Fastify REST/WebSocket route adapters.
- `ApplicationBackendApiGatewayService`.
- `ApplicationEngineHostService`.
- Managed application worker/backend handler.
- `ApplicationBackendNotificationStreamService` for notification return.

## Ownership Map

| Node | Owns | Explicit Non-Responsibility |
| --- | --- | --- |
| Frontend SDK | Client request construction and notification subscription | Server admission or worker lifecycle |
| REST route adapter | HTTP path/body/header mapping and error-to-status response | Application admission policy or worker calls |
| `ApplicationBackendApiGatewayService` | Active app/bundle admission, request-context scope, engine operation dispatch, engine-notification bridge | Worker lifecycle internals, app business logic, setup/resource configuration, package/catalog ownership |
| `ApplicationBackendNotificationStreamService` | Per-application live connection registry and fan-out | Durable notification delivery, agent output streaming |
| Engine host | Worker start/stop/readiness/invocation and process protocol | Frontend transport |
| Worker/app backend | App-authored business handlers | Platform route admission or cross-app selection |

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Fastify application-backend routes | `ApplicationBackendApiGatewayService` for gateway-backed operations | Map public HTTP to internal service calls | Duplicate application admission/context normalization |
| Notification WebSocket route | `ApplicationBackendNotificationStreamService` | Adapt authorized socket to connection registry | Notification durability or worker bridge |

The API gateway service is not empty indirection: it owns admission/scope invariants and the notification bridge.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `ApplicationBackendGatewayService` | Ambiguous owner name | `ApplicationBackendApiGatewayService` | In This Change | No alias |
| `getApplicationBackendGatewayService` | Matches removed class | `getApplicationBackendApiGatewayService` | In This Change | No deprecated forwarder |
| `src/application-backend-gateway/` | Folder no longer names owner clearly | `src/application-backend-api-gateway/` | In This Change | Move notification stream file without renaming its class/file |
| `application-backend-gateway-service.ts` | Removed service name | `application-backend-api-gateway-service.ts` | In This Change | Same implementation |
| Focused unit folder/file with old name | Mirrors removed owner | API-gateway test folder/file | In This Change | Broader application-backend tests keep paths |
| `application_backend_gateway.md` and old title/link family | Teaches ambiguous term | `application_backend_api_gateway.md` and target prose | In This Change | Update every active cross-link |
| Old owner-specific locals/mocks/descriptions | Mixed terminology | `apiGateway*` / `applicationBackendApiGateway*` | In This Change | Do not rename unrelated gateways |

## Return Or Event Spine(s)

### `GW-DS-002` — Backend notification

```text
App handler publishNotification
  -> worker engine notification
  -> ApplicationEngineHostService listener
  -> ApplicationBackendApiGatewayService bridge
  -> ApplicationBackendNotificationStreamService
  -> authorized application WebSocket
  -> frontend SDK subscription callback
```

Payload, application scoping, non-durability, and deliberate drop-with-no-listener behavior are unchanged.

## Bounded Local / Internal Spines

### `GW-DS-003` — Naming consistency

Parent owner: Application Backend API Gateway module.

```text
canonical class/accessor
  -> folder/file/imports
  -> focused tests and mocks
  -> module doc/cross-links/prose
  -> Mermaid labels
  -> exhaustive old-term inventory
```

This is build/review consistency, not runtime behavior.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Application-backend REST route error mapping | `GW-DS-001` | REST route adapter | Preserve the shared status mapping for gateway-backed and direct configuration/orchestration/reload routes | Route-wide public HTTP concern | API-gateway terminology would falsely attribute errors from separately owned route operations to the gateway service |
| Notification connection registry | `GW-DS-002` | API gateway module | Fan out live notifications | Separate state/lifecycle concern | Service combines request admission with socket registry internals |
| Docs/link inventory | `GW-DS-003` | Module/documentation owner | Keep architecture terminology consistent | Rename crosses long-lived docs | Mixed terminology survives |
| Focused/broader tests | all | Existing owners | Prove behavior preserved | Clean move can break imports/mocks | Rename appears complete without executable proof |

## Ownership Boundaries

- Public HTTP callers use Fastify application-backend routes; they do not import the service.
- REST gateway-backed operations use `ApplicationBackendApiGatewayService`; they do not call engine host directly.
- The service may depend on bundle/availability owners and engine host because it owns API admission and dispatch.
- The WebSocket adapter depends on the notification stream service, not on engine host or worker.
- The API gateway module must not absorb setup/resource configuration, reload/re-entry, catalog, package, iframe-host, orchestration, or worker implementation responsibilities.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ApplicationBackendApiGatewayService` | Application/bundle admission, context normalization, engine dispatch, notification listener bridge | REST gateway-backed routes | REST route -> engine host directly for query/command/GraphQL/route | Extend this same focused service |
| `ApplicationBackendNotificationStreamService` | Connection registry and JSON fan-out | WebSocket adapter and API gateway notification bridge | WebSocket adapter managing a second registry | Extend stream service |
| `ApplicationEngineHostService` | Worker supervisor/client/protocol | API gateway and orchestration event owners | API gateway reaching worker runtime directly | Extend engine host |

## Dependency Rules

Allowed:

```text
Frontend SDK -> REST/WS routes
REST routes -> ApplicationBackendApiGatewayService
ApplicationBackendApiGatewayService -> bundle/availability owners + engine host + notification stream
WebSocket route -> notification stream
Engine host -> managed worker
```

Forbidden:

- route adapter -> worker runtime;
- route adapter -> engine host for gateway-owned operations;
- API gateway -> orchestration stores or app business persistence;
- worker/app backend -> API gateway service import;
- old-name alias -> new-name service.

## Interface Boundary Mapping

| Interface / API / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `ApplicationBackendApiGatewayService.*` existing methods | One application backend API | Admission, app scope, engine delegation | authoritative `applicationId` plus existing operation input | Method signatures unchanged |
| `getApplicationBackendApiGatewayService()` | Gateway singleton | Resolve current service instance | none | Internal accessor rename only |
| REST `/applications/:applicationId/backend/**` | Application backend HTTP API | Public transport | route `applicationId` | URL unchanged |
| WebSocket `/ws/applications/:applicationId/backend/notifications` | App-defined notifications | Live subscription | route `applicationId` | URL unchanged |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| API gateway service | Yes | Yes | Low | Rename only |
| Notification stream | Yes | Yes | Low | Keep name/API |
| REST/WS paths | Yes | Yes | Low | Preserve |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Server gateway to app backend APIs | `ApplicationBackendGatewayService` -> `ApplicationBackendApiGatewayService` | Target: Yes | Medium if folder/docs stay old | Atomic propagation and removal inventory |
| All application platform entrypoints | Rejected `ApplicationGatewayService` | No for current owner | High overstatement | Do not use |
| Notification connection registry | `ApplicationBackendNotificationStreamService` | Yes | Low | Keep |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Backend API admission/dispatch | Current backend gateway service | Extend/Rename | Correct current owner | N/A |
| Notification fan-out | Current notification stream | Reuse/Move | Name and responsibility already precise | N/A |
| Worker lifecycle | Application engine | Reuse | No behavior change | N/A |
| Architecture visualization | Current ticket supplement | Extend | Already visualizes full boundary | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Application Backend API Gateway | API admission/dispatch and notification bridge/stream | `GW-DS-001`, `GW-DS-002` | API gateway service/stream | Rename current module | No behavior split |
| Application engine | Worker lifecycle/invocation | `GW-DS-001`, `GW-DS-002` | Engine host | Reuse | Imports unchanged behind gateway |
| API routes | HTTP/WS adapters and route-wide error response mapping | `GW-DS-001`, `GW-DS-002` | Gateway/stream owners plus direct configuration/orchestration/reload owners | Modify service imports/locals and neutral REST helper name only | Public paths and error mapping unchanged |
| Tests/docs | Regression and teaching | all | Existing validation/doc owners | Rename/update | Historical tickets excluded |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `application-backend-api-gateway-service.ts` | API gateway | API admission/dispatch | Existing service renamed | Cohesive current owner | Existing dependencies |
| `application-backend-notification-stream-service.ts` | API gateway | Notification fan-out | Existing file moved | Separate stateful concern | Existing message types |
| `application-backends.ts` | REST API | HTTP route adapter | Update gateway-service import/accessor/locals and rename the route-wide mapper to neutral `sendApplicationBackendRouteError` | Existing route aggregation spans gateway-backed and direct configuration/orchestration/reload owners | Existing services and unchanged error mapping |
| `application-backend-notifications.ts` | WebSocket API | Socket adapter | Update moved import path | Existing adapter | Stream service |
| Focused unit test | Tests | API gateway service | Rename path/symbols/descriptions | Mirrors owner | Existing fixtures |
| Module doc | Docs | API gateway module | Rename path/title/links and clarify scope | One module authority | Related docs |

## Reusable Owned Structures Check

N/A — no new or duplicated type, mapper, schema, or shared logic is introduced.

## Shared Structure / Data Model Tightness Check

N/A — no data model or shared structure changes.

## Final File Responsibility Mapping

Same as the draft mapping. No extraction is justified; this change renames an already cohesive owner.

## Applied Patterns

- **Gateway/facade:** existing `ApplicationBackendApiGatewayService` remains the application-scoped transport-to-engine boundary and owns admission invariants.
- **Adapter:** REST and WebSocket entrypoints remain transport adapters.
- **Registry:** notification stream remains a focused per-application connection registry.

No new pattern or abstraction is introduced.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-backend-api-gateway/` | Module/Folder | Application Backend API Gateway | Gateway service plus owned notification streaming concern | Makes the server API boundary inferable | Worker/orchestration/storage internals |
| `.../services/application-backend-api-gateway-service.ts` | File | API gateway service | Admission, scope, engine delegation, notification bridge | Canonical owner | Fastify response mapping |
| `.../streaming/application-backend-notification-stream-service.ts` | File | Notification stream | Live connection registry/fan-out | Existing off-spine concern | Durable queue/replay |
| `autobyteus-server-ts/tests/unit/application-backend-api-gateway/application-backend-api-gateway-service.test.ts` | File | Focused service validation | Existing unit scenarios under target name | Mirrors source owner | Broader application workflows |
| `autobyteus-server-ts/docs/modules/application_backend_api_gateway.md` | File | Long-lived module doc | Scope, paths, authority, surfaces, errors, links | Canonical documentation owner | Generic ownership of every application API |
| New ticket artifact folder | Folder | Current ticket | Requirements, investigation, design, Mermaid supplement, downstream reports | Keeps finalized prior ticket untouched | Source implementation |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/application-backend-api-gateway` | Transport/main-line boundary plus owned streaming concern | Yes | Low | Preserve current two-concern structure under clearer module name |
| `tests/unit/application-backend-api-gateway` | Focused validation | Yes | Low | Mirrors source owner |
| `tests/integration/application-backend` | Cross-boundary application-backend flows | Yes | Low | Do not rename; broader than gateway owner |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Boundary name | `ApplicationBackendApiGatewayService` | `ApplicationBackendGatewayService` | “API” clarifies gateway-to-backend direction |
| Scope | API gateway owns backend API admission/dispatch | `ApplicationGatewayService` absorbs setup/catalog/packages | Avoids overclaiming ownership |
| Clean cut | Move source/test/doc paths and update imports atomically | Leave re-export at old path | Prevents two authoritative names |
| Preserved route | `/applications/:applicationId/backend/graphql` | Rename URL merely to match class | Public path already names backend API correctly |
| Route error helper | `sendApplicationBackendRouteError` | `sendApplicationBackendApiGatewayError` | The helper belongs to the complete REST route adapter, not only the API gateway service |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Old class type alias/export | Could reduce import edits | Rejected | Update all active imports and remove symbol |
| Old accessor forwarding function | Could preserve mocks | Rejected | Rename mocks/callers atomically |
| Old folder/file re-export | Could keep old paths resolving | Rejected | Move files and update every import |
| Old doc filename redirect/copy | Could preserve stale links | Rejected | Update all active cross-links; historical tickets remain historical only |

## Derived Layering

```text
Application UI / Frontend SDK
  -> REST or WebSocket adapter
  -> Application Backend API Gateway service/stream
  -> Application Engine Host
  -> Managed worker / app backend
```

This is explanatory only; ownership and spine definitions above are authoritative.

## Change / Refactor Sequence

1. Rename source module folder and service file; move notification stream file with its owner.
2. Rename class, singleton state/accessor, and service-local identifiers without changing method bodies/signatures.
3. Update REST/WS imports; use API-gateway terminology only for locals that represent `ApplicationBackendApiGatewayService`; rename the REST-adapter-wide error mapper to `sendApplicationBackendRouteError`; preserve every mapping, caller, route constant/path, and non-gateway owner call.
4. Rename focused unit-test folder/file and update all unit/integration imports, mocks, state fields, descriptions, and local owner variables.
5. Rename module doc and update all active server/SDK/web cross-links and natural-language owner references.
6. Keep the Mermaid supplement on the target label and validate all blocks.
7. Run compilation/build and focused existing tests; then run static old-term/path inventories excluding historical tickets and ignored build caches.
8. Remove/check that old folder/file/test/doc paths do not exist. No temporary compatibility seam survives.

## Key Tradeoffs

- Adding `API` lengthens paths and symbols, but materially improves direction and responsibility inference.
- Renaming the folder/test/doc path increases mechanical breadth, but leaving them old would undermine the clarity goal and create mixed terminology.
- Keeping `/backend` URLs and broader application-backend file/test names avoids an unnecessary public/subject rename; those names are already correct.

## Risks

- Missed imports or mock module strings after folder/file moves.
- Broken documentation cross-links.
- Over-broad search/replace touching unrelated messaging/MCP/Discord gateways or general application-backend concepts.
- Stale ignored `dist/` may confuse local inspection; build must regenerate it and active tracked inventory must not rely on ignored output.

## Guidance For Implementation

- Make this a semantic rename, not a behavior rewrite.
- Use `ApplicationBackendApiGatewayService`, `getApplicationBackendApiGatewayService`, `application-backend-api-gateway`, and `application_backend_api_gateway` exactly.
- Keep `ApplicationBackendNotificationStreamService`, its filename, public REST/WS paths, handler method signatures, and error behavior unchanged.
- Prefer `apiGateway`, `apiGatewayService`, and `applicationBackendApiGatewayMock` only for locals/mocks that represent `ApplicationBackendApiGatewayService`.
- Use `sendApplicationBackendRouteError` for the REST-adapter-wide error helper; do not name it as though the API gateway owns configuration, orchestration-resource, or reload/re-entry errors.
- Do not rename unrelated gateway domains or every occurrence of “application backend.”
- Do not touch the archived `tickets/done/understand-application-framework` package.
- Do not add aliases, redirects, forwarding files, or generated `dist/` output.
- Follow `autobyteus-server-ts/AGENTS.md`: run Vitest with `run`/`--no-watch`.
