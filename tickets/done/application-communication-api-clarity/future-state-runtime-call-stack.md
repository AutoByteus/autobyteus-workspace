# Future-State Runtime Call Stacks (Debug-Trace Style)

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint (API/CLI/event)
  - `[ASYNC]` async boundary (`await`, queue handoff, callback)
  - `[STATE]` in-memory mutation
  - `[IO]` file/network/database/cache IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path
- Comments: use brief inline comments with `# ...`.
- Do not include legacy/backward-compatibility branches.

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v1`
- Requirements: `tickets/application-communication-api-clarity/requirements.md` (status `Design-ready`)
- Source Artifact: `tickets/application-communication-api-clarity/design-spec.md` (proposed design for Medium scope)
- Source Design Version: `v1`
- Referenced Sections:
  - Spine inventory sections: Data-Flow Spine Inventory (DS-001 through DS-005)
  - Ownership sections: Ownership Map, Boundary Encapsulation Map

## Future-State Modeling Rule (Mandatory)

- Model target design behavior even when current code diverges.
- The primary divergence in this ticket is naming: `ApplicationNotificationStreamService` → `ApplicationBackendNotificationStreamService` and file path `application-notification-stream-service.ts` → `application-backend-notification-stream-service.ts`.
- Runtime behavior remains mechanically identical; only class/file/import/type names change.
- Documentation changes do not alter call stacks but are captured as separate use cases for docs verification.

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope | Governing Owner | Source Type | Requirement ID(s) | Design-Risk Objective | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001 | Primary End-to-End | Application backend gateway backend-notification stream | Requirement | FR-002, FR-003, FR-006, FR-008 | N/A | Backend notification publish and live fan-out | Yes/Yes/Yes |
| UC-002 | DS-002 | Primary End-to-End | Application backend gateway + application engine host | Requirement | FR-005 | N/A | Frontend request/response without implicit runtime control | Yes/N/A/Yes |
| UC-003 | DS-004 | Return-Event | Application published artifact relay service | Requirement | FR-004 | N/A | Artifact relay to app backend with optional frontend notification | Yes/Yes/Yes |
| UC-004 | DS-001 | Bounded Local | Application backend gateway backend-notification stream | Requirement | FR-006, FR-008 | N/A | Internal service rename: class, file, imports, tests | Yes/N/A/N/A |
| UC-005 | DS-001, DS-002, DS-003, DS-004, DS-005 | Documentation/Positioning | All communication owners | Requirement | FR-001, FR-007, FR-009, FR-010 | N/A | Canonical communication model document creation | Yes/N/A/N/A |
| UC-006 | DS-001 | Bounded Local | Application backend gateway backend-notification stream | Design-Risk | FR-006, FR-008 | Rename must not introduce import resolution failures, test regression, or dangling references to old class/file names | No-regression verification after rename | Yes/N/A/Yes |

Rules satisfied:
- Every in-scope requirement (FR-001 through FR-010) maps to at least one use case.
- `Design-Risk` UC-006 has explicit technical objective and testable expected outcome.
- Every use case maps to at least one spine from the approved spine inventory.

## Transition Notes

- No temporary migration behavior is needed. This is a clean-cut rename with no backward-compatibility aliases.
- The old `ApplicationNotificationStreamService` class name, file path, and singleton accessor `getApplicationNotificationStreamService` are removed and replaced with `ApplicationBackendNotificationStreamService`, `application-backend-notification-stream-service.ts`, and `getApplicationBackendNotificationStreamService` respectively.
- No runtime/public SDK behavior changes.

---

## Use Case: UC-001 — Backend notification publish and live fan-out

### Spine Context

- Spine ID(s): DS-001
- Spine Scope: Primary End-to-End
- Governing Owner: Application backend gateway backend-notification stream
- Why This Use Case Matters To This Spine: This is the core behavior whose internal owner naming is being clarified. The call stack must show that backend notifications flow through `ApplicationBackendNotificationStreamService` (target name) and that the runtime path is unchanged.

### Goal

Verify that when an app backend handler calls `context.publishNotification(topic, payload)`, the notification reaches all currently subscribed app frontend websocket clients and is correctly labeled as a backend-published notification, not a generic application stream.

### Preconditions

- Application is active and engine host is running the app backend worker.
- At least one app frontend has established a websocket connection to `/ws/applications/:applicationId/backend/notifications`.
- The frontend has received the `{ type: "connected", applicationId }` acknowledgement.

### Expected Outcome

- The subscribed frontend receives `{ type: "notification", notification: { applicationId, topic, payload, publishedAt } }`.
- Non-subscribed frontends or frontends for different applicationIds do not receive the message.
- No durable replay occurs if a frontend connects after publication.

### Primary Runtime Call Stack

```text
[ENTRY] application-engine/worker/application-worker-runtime.ts:publishNotification(topic, payload)
# App backend handler calls context.publishNotification(topic, payload)
├── application-engine/worker/application-worker-runtime.ts:emitNotificationEvent({ applicationId, message: { topic, payload, publishedAt } }) [IO]
│   # Worker runtime emits notification to engine host
├── application-engine/services/application-engine-host-service.ts:onNotification(callback)
│   # Engine host invokes registered notification listener
├── application-backend-gateway/services/application-backend-gateway-service.ts:ensureNotificationBridge() -> callback({ applicationId, message })
│   # Gateway service bridge receives notification and forwards to stream service
└── application-backend-gateway/streaming/application-backend-notification-stream-service.ts:publish(notification) [IO]
    # Target name after rename
    ├── Map.get(notification.applicationId) -> listeners [STATE]
    │   # Lookup active connections for this applicationId
    ├── for each (connectionId, connection) in listeners:
    │   ├── JSON.stringify({ type: "notification", notification }) -> payload
    │   └── connection.send(payload) [IO]
    │       # Deliver to each subscribed frontend websocket
    └── return
```

### Branching / Fallback Paths

```text
[FALLBACK] if no listeners exist for applicationId
application-backend-gateway/streaming/application-backend-notification-stream-service.ts:publish(notification)
├── Map.get(notification.applicationId) -> undefined or empty map
└── return (no-op, no error)
# Notification is silently dropped; no durable queue or replay
```

### Error Paths

```text
[ERROR] if connection.send() throws (dead/broken websocket)
application-backend-gateway/streaming/application-backend-notification-stream-service.ts:publish(notification)
├── connection.send(payload) -> throws
├── catch:
│   ├── connection.close(1011) [IO]
│   │   # Attempt graceful close with internal error code
│   └── this.disconnect(connectionId) [STATE]
│       # Remove broken connection from registry
└── continue to next listener
# Other connections still receive the notification
```

### State And Data Transformations

- Input: `publishNotification(topic: string, payload: any)` from app backend handler context
- Worker output: `{ applicationId, message: { topic, payload, publishedAt: string } }` notification event
- Stream service input: `ApplicationNotificationMessage { applicationId, topic, payload, publishedAt }`
- Websocket output: `JSON.stringify({ type: "notification", notification: ApplicationNotificationMessage })`

### Observability And Debug Points

- Logs emitted at: connection.send failure (implicit via catch, no explicit log currently)
- Metrics/counters: none currently
- Tracing spans: none currently

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? No
- Any tight coupling or cyclic cross-subsystem dependency introduced? No
- Any naming-to-responsibility drift detected? No — after rename, `ApplicationBackendNotificationStreamService` matches the backend-published frontend notification fan-out responsibility.

### Open Questions

- None for this use case.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered` (no listeners → silent drop)
- Error Path: `Covered` (broken websocket → close + disconnect)

---

## Use Case: UC-002 — Frontend request/response without implicit runtime control

### Spine Context

- Spine ID(s): DS-002
- Spine Scope: Primary End-to-End
- Governing Owner: Application backend gateway + application engine host
- Why This Use Case Matters To This Spine: This use case validates that documentation correctly describes frontend request/response as independent from `runtimeControl`. The call stack proves that `client.command(...)` does not inherently go through `context.runtimeControl.*`; only the backend handler decides whether to call it.

### Goal

Verify that a frontend request/response call (e.g., `client.command(...)`) flows through the backend gateway and engine host to the app backend worker handler without implicit `runtimeControl` involvement.

### Preconditions

- Application is active and engine host is running the app backend worker.
- Frontend SDK client is initialized with application transport.

### Expected Outcome

- The frontend receives the handler's response directly.
- `runtimeControl` is not invoked unless the backend handler explicitly calls `context.runtimeControl.*`.
- Documentation accurately reflects this boundary.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-application-frontend-sdk/src/application-client.ts:command(name, input, options?)
# App frontend invokes a command
├── autobyteus-application-frontend-sdk/src/application-client-transport.ts:invoke({ type: "command", name, input }) [IO]
│   # Transport sends request to backend gateway
├── [ASYNC] autobyteus-server-ts/src/api/rest/application-backend-gateway-routes.ts:handleCommand(req, reply)
│   # REST route handler receives the command request
├── application-backend-gateway/services/application-backend-gateway-service.ts:executeCommand(applicationId, name, input, requestContext) [ASYNC]
│   ├── this.requireApplication(applicationId) [ASYNC]
│   │   # Validate application exists and is active
│   └── this.engineHostService.invokeApplicationCommand(applicationId, name, input, requestContext) [ASYNC] [IO]
│       # Engine host dispatches to the worker
├── application-engine/services/application-engine-host-service.ts:invokeApplicationCommand(...) [ASYNC]
│   └── worker.executeHandler("command", name, input, requestContext) [ASYNC] [IO]
│       # Worker invokes the registered command handler
├── application-engine/worker/application-worker-runtime.ts:executeHandler("command", name, input, requestContext)
│   └── registeredHandlers.commands[name](input, context) [ASYNC]
│       # context has publishNotification AND runtimeControl, but handler decides what to call
│       # runtimeControl is NOT called unless handler code explicitly uses it
└── response returned to frontend [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] N/A — this use case only validates the default path to show runtime control is not implicit.
```

### Error Paths

```text
[ERROR] if application not found or not active
application-backend-gateway/services/application-backend-gateway-service.ts:executeCommand(...)
├── this.requireApplication(applicationId)
│   └── throws Error("Application 'X' was not found.") or availabilityService throws
└── error propagated to REST route -> HTTP error response to frontend
```

### State And Data Transformations

- Input: `client.command(name, input)` from frontend SDK
- Transport: `{ type: "command", name, input, requestContext }` over HTTP/iframe bridge
- Worker handler: `handler(input, context)` where `context.publishNotification` and `context.runtimeControl` are separate capabilities
- Output: handler return value → JSON response to frontend

### Observability And Debug Points

- Logs emitted at: application validation failure
- Metrics/counters: none currently
- Tracing spans: none currently

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? No
- Any tight coupling or cyclic cross-subsystem dependency introduced? No
- Any naming-to-responsibility drift detected? No

### Open Questions

- None for this use case.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered` (application not found)

---

## Use Case: UC-003 — Artifact relay to app backend with optional frontend notification

### Spine Context

- Spine ID(s): DS-004
- Spine Scope: Return-Event
- Governing Owner: Application published artifact relay service
- Why This Use Case Matters To This Spine: This use case validates that artifacts reach the app backend through `artifactHandlers.persisted` independently from the frontend notification stream. The optional notification is a downstream app-owned action, not part of the artifact relay spine.

### Goal

Verify that when a runtime publishes an artifact, it reaches the app backend `artifactHandlers.persisted` handler through `ApplicationPublishedArtifactRelayService`, and frontend notification is optional and app-controlled.

### Preconditions

- Application backend has registered `artifactHandlers.persisted` in its handler configuration.
- An app-bound runtime run has published an artifact that has been persisted by the published artifact subsystem.

### Expected Outcome

- App backend `artifactHandlers.persisted(event, context)` is invoked with the artifact event.
- The app backend may call `context.publishNotification(...)` to notify the frontend, but the artifact relay itself does not push to the frontend notification stream.
- Documentation clarifies this separation.

### Primary Runtime Call Stack

```text
[ENTRY] services/published-artifacts/published-artifact-publication-service.ts:persistArtifact(...) [IO]
# Published artifact subsystem persists artifact and emits ARTIFACT_PERSISTED event
├── [ASYNC] application-orchestration/services/application-published-artifact-relay-service.ts:onArtifactPersisted(event)
│   # Relay service detects bound-run artifact event
│   ├── resolve applicationId from binding store [STATE]
│   └── application-engine/services/application-engine-host-service.ts:invokeApplicationArtifactHandler(applicationId, event, context) [ASYNC] [IO]
│       # Engine host dispatches to the worker's artifact handler
├── application-engine/worker/application-worker-runtime.ts:executeArtifactHandler(event, context)
│   └── registeredHandlers.artifactHandlers.persisted(event, context) [ASYNC]
│       # App backend artifact handler processes the artifact event
│       # context.publishNotification is available but NOT automatically called
└── return
```

### Branching / Fallback Paths

```text
[FALLBACK] if app backend artifact handler calls publishNotification
application-engine/worker/application-worker-runtime.ts:executeArtifactHandler(event, context)
└── registeredHandlers.artifactHandlers.persisted(event, context) [ASYNC]
    └── context.publishNotification("artifact.available", { artifactId }) [ASYNC]
        # This re-enters UC-001 backend notification publish spine (DS-001)
        # The notification goes through ApplicationBackendNotificationStreamService
        # This is an app-owned decision, NOT artifact relay behavior
```

```text
[FALLBACK] if live relay delivery fails (best effort)
application-orchestration/services/application-published-artifact-relay-service.ts:onArtifactPersisted(event)
├── handler invocation fails [ERROR]
└── best-effort delivery; app recovers through runtime-control artifact query APIs
    # context.runtimeControl.getRunPublishedArtifacts(...) or
    # context.runtimeControl.getPublishedArtifactRevisionText(...)
```

### Error Paths

```text
[ERROR] if no artifact handler registered or handler throws
application-engine/services/application-engine-host-service.ts:invokeApplicationArtifactHandler(...)
├── handler not registered or throws
└── error logged; relay service does not retry (best effort)
# App recovers missed artifacts through runtimeControl artifact query APIs
```

### State And Data Transformations

- Input: `ApplicationPublishedArtifactEvent { applicationId, bindingId, runId, artifactId, revisionId, ... }`
- Handler receives: `(event: ApplicationPublishedArtifactEvent, context: ApplicationHandlerContext)`
- Optional downstream: `publishNotification(topic, payload)` → DS-001 flow

### Observability And Debug Points

- Logs emitted at: relay delivery failure
- Metrics/counters: none currently
- Tracing spans: none currently

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? No
- Any tight coupling or cyclic cross-subsystem dependency introduced? No — artifact relay and notification stream are separate owners
- Any naming-to-responsibility drift detected? No

### Open Questions

- None for this use case.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered` (optional publishNotification; query reconciliation)
- Error Path: `Covered` (handler failure → best effort, query recovery)

---

## Use Case: UC-004 — Internal service rename: class, file, imports, tests

### Spine Context

- Spine ID(s): DS-001
- Spine Scope: Bounded Local
- Governing Owner: Application backend gateway backend-notification stream
- Why This Use Case Matters To This Spine: This use case validates that the internal rename is mechanically applied across all import sites without changing behavior.

### Goal

Verify that renaming `ApplicationNotificationStreamService` → `ApplicationBackendNotificationStreamService` and `application-notification-stream-service.ts` → `application-backend-notification-stream-service.ts` updates all import/reference sites while preserving identical runtime behavior.

### Preconditions

- Current codebase has `ApplicationNotificationStreamService` in the files listed in the design-spec Relevant Files / Components table.

### Expected Outcome

- File `application-backend-notification-stream-service.ts` exists with class `ApplicationBackendNotificationStreamService` and accessor `getApplicationBackendNotificationStreamService`.
- Old file `application-notification-stream-service.ts` is deleted.
- All imports in `application-backend-gateway-service.ts`, `application-backend-notifications.ts`, and test files reference the new path and class name.
- No `ApplicationNotificationStreamService` string remains in source/test code (except ticket artifacts).
- TypeScript compilation succeeds.
- All existing notification-related tests pass.

### Primary Runtime Call Stack

```text
[ENTRY] implementation-time rename operation (not a runtime call stack)
# This use case is a code-edit verification, not a runtime path.
# The rename touches:

1. application-backend-gateway/streaming/application-notification-stream-service.ts
   -> RENAMED TO: application-backend-gateway/streaming/application-backend-notification-stream-service.ts
   -> class ApplicationNotificationStreamService -> ApplicationBackendNotificationStreamService
   -> type ApplicationNotificationStreamMessage -> ApplicationBackendNotificationStreamMessage
   -> type ApplicationNotificationStreamConnection -> ApplicationBackendNotificationStreamConnection
   -> getApplicationNotificationStreamService -> getApplicationBackendNotificationStreamService
   -> cachedApplicationNotificationStreamService -> cachedApplicationBackendNotificationStreamService

2. application-backend-gateway/services/application-backend-gateway-service.ts
   -> import path updated
   -> type reference ApplicationNotificationStreamService -> ApplicationBackendNotificationStreamService
   -> getApplicationNotificationStreamService -> getApplicationBackendNotificationStreamService

3. api/websocket/application-backend-notifications.ts
   -> import path updated
   -> getApplicationNotificationStreamService -> getApplicationBackendNotificationStreamService
   -> type ApplicationNotificationStreamConnection -> ApplicationBackendNotificationStreamConnection

4. tests/integration/application-backend/*.integration.test.ts
   -> all import paths and class/accessor references updated
```

### Branching / Fallback Paths

```text
[FALLBACK] N/A — this is a rename operation with no branching.
```

### State And Data Transformations

- No runtime state changes. Only compile-time identifiers change.

### Observability And Debug Points

- N/A for rename operations.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? No — old name is fully removed, no alias retained.
- Any tight coupling or cyclic cross-subsystem dependency introduced? No
- Any naming-to-responsibility drift detected? No — the rename fixes existing drift.

### Open Questions

- None for this use case.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `N/A`

---

## Use Case: UC-005 — Canonical communication model document creation

### Spine Context

- Spine ID(s): DS-001, DS-002, DS-003, DS-004, DS-005
- Spine Scope: Documentation/Positioning
- Governing Owner: All communication owners
- Why This Use Case Matters To This Spine: This use case validates that the canonical communication model document covers all five spines, explaining direction, initiator, runtime-control involvement, durability, and the future runtime stream slot.

### Goal

Verify that a new `application_communication_model.md` document in `autobyteus-server-ts/docs/modules/` provides a comprehensive communication matrix and that existing gateway/orchestration docs cross-link to it.

### Preconditions

- Design-spec specifies the canonical doc location and content structure.
- Existing module docs exist at `autobyteus-server-ts/docs/modules/`.

### Expected Outcome

- `application_communication_model.md` exists with:
  - Communication matrix table (direction, initiator, API surface, runtime-control involvement, live/durable semantics, examples).
  - Explicit statements per FR-001 through FR-005 and FR-010.
  - Examples per the design-spec Concrete Examples / Shape Guidance table.
- `application_backend_gateway.md` cross-links to the canonical model and references the renamed service.
- `application_orchestration.md` cross-links from artifact relay and runtime-control sections.
- `README.md` (docs modules index) lists the new document.

### Primary Runtime Call Stack

```text
[ENTRY] documentation creation (not a runtime call stack)
# This use case creates/updates documentation files only.
# No runtime behavior changes.

1. CREATE: autobyteus-server-ts/docs/modules/application_communication_model.md
   -> Communication matrix table
   -> Direction, initiator, API surface, runtimeControl involvement, durability, examples
   -> Backend notification semantics (FR-002, FR-003)
   -> Artifact relay semantics (FR-004)
   -> Frontend request/response semantics (FR-005)
   -> Future runtime stream positioning note (FR-010)

2. UPDATE: autobyteus-server-ts/docs/modules/application_backend_gateway.md
   -> Rename service references: ApplicationNotificationStreamService -> ApplicationBackendNotificationStreamService
   -> Cross-link to application_communication_model.md

3. UPDATE: autobyteus-server-ts/docs/modules/application_orchestration.md
   -> Cross-link from artifact relay section and runtime control section to application_communication_model.md

4. UPDATE: autobyteus-server-ts/docs/modules/README.md
   -> Add application_communication_model.md entry
```

### Branching / Fallback Paths

```text
[FALLBACK] N/A — documentation creation.
```

### State And Data Transformations

- N/A for documentation.

### Observability And Debug Points

- N/A for documentation.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? No
- Any tight coupling or cyclic cross-subsystem dependency introduced? No
- Any naming-to-responsibility drift detected? No

### Open Questions

- None for this use case.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `N/A`

---

## Use Case: UC-006 — No-regression verification after rename

### Spine Context

- Spine ID(s): DS-001
- Spine Scope: Bounded Local
- Governing Owner: Application backend gateway backend-notification stream
- Why This Use Case Matters To This Spine: This design-risk use case validates that the rename does not introduce import resolution failures, TypeScript compilation errors, or test regressions.

### Goal

Verify that after the rename, TypeScript compilation succeeds and all existing tests that exercise backend notification functionality pass without behavioral changes.

### Preconditions

- Rename has been completed (UC-004).
- All import paths and class references have been updated.

### Expected Outcome

- `npx tsc --noEmit` (or equivalent project build check) for `autobyteus-server-ts` completes without errors.
- `rg "ApplicationNotificationStreamService|getApplicationNotificationStreamService|application-notification-stream-service" --glob '!tickets/**' --glob '!**/node_modules/**'` returns zero matches (no dangling old references).
- Existing integration tests covering backend notifications pass.
- No new test failures in unrelated test suites.

### Primary Runtime Call Stack

```text
[ENTRY] verification commands (not a runtime call stack)
# This use case exercises verification tooling:

1. TypeScript compilation check:
   cd autobyteus-server-ts && npx tsc --noEmit
   -> Expected: 0 errors

2. Dangling reference search:
   rg "ApplicationNotificationStreamService|getApplicationNotificationStreamService|application-notification-stream-service" \
     --glob '!tickets/**' --glob '!**/node_modules/**' --glob '!**/dist/**'
   -> Expected: 0 matches in source/test files

3. Notification integration test run:
   cd autobyteus-server-ts && npx vitest run tests/integration/application-backend/
   -> Expected: all tests pass
```

### Branching / Fallback Paths

```text
[FALLBACK] N/A — verification steps.
```

### Error Paths

```text
[ERROR] if TypeScript compilation fails after rename
-> Classification: Local Fix (import path typo or missed reference)
-> Fix: correct the import path or missed class name reference
-> Re-verify

[ERROR] if dangling reference search finds old names
-> Classification: Local Fix (incomplete rename)
-> Fix: update remaining references
-> Re-verify

[ERROR] if integration tests fail
-> Classification: investigate root cause
-> If behavioral: Design Impact (rename broke runtime path)
-> If import-only: Local Fix
```

### State And Data Transformations

- N/A for verification.

### Observability And Debug Points

- N/A for verification.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? No
- Any tight coupling or cyclic cross-subsystem dependency introduced? No
- Any naming-to-responsibility drift detected? No

### Open Questions

- None for this use case.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered` (compilation failure, dangling references, test failure)
