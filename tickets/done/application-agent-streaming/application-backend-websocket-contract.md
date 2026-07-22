# Application Backend WebSocket Contract

## Status And Authority

This is a normative intended-behavior supplement to [`requirements.md`](./requirements.md) and [`design-spec.md`](./design-spec.md). It defines the optional generic application-backend WebSocket capability required by `REQ-010`/`AC-010` and visualized by `DS-008`/`DS-016` in [`application-communication-boundaries.md`](./application-communication-boundaries.md).

Status: `Approved in-scope desktop behavior with exact manifest/exposure authority and no application-client authentication surface.`

Current repository `HEAD` has no generic application-backend WebSocket. The stopped partial implementation is investigation evidence only. This document, not that partial source, is the target contract.

This capability carries application-defined realtime protocols. It is not the standard application-agent connection, does not understand `ApplicationAgentTargetAddress`, and must never become mandatory proxy glue for agent events.

## 1. Frontend Connection Contract

```ts
export type ApplicationWebSocketFrame =
  | { kind: "text"; text: string }
  | { kind: "binary"; data: Uint8Array };

export type ApplicationBackendWebSocketConnectionState =
  | "connecting"
  | "open"
  | "closing"
  | "closed";

export type ApplicationBackendWebSocketConnectOptions = {
  signal?: AbortSignal;
  query?: Record<string, string | string[]>;
};

export type ApplicationBackendWebSocketCloseEvent = {
  code: number;
  reason: string;
  wasClean: boolean;
};

export type ApplicationBackendWebSocketConnectionErrorCode =
  | "CONNECTION_NOT_READY"
  | "CONNECTION_CLOSED"
  | "CONNECTION_ABORTED"
  | "CONNECTION_REJECTED"
  | "PROTOCOL_ERROR"
  | "FRAME_TOO_LARGE"
  | "BACKPRESSURE_LIMIT"
  | "BACKEND_UNAVAILABLE"
  | "TRANSPORT_FAILED"
  | "SEND_FAILED";

export declare class ApplicationBackendWebSocketConnectionError extends Error {
  readonly code: ApplicationBackendWebSocketConnectionErrorCode;
  readonly recoverable: boolean;
}

export type ApplicationBackendWebSocketConnection = {
  readonly state: ApplicationBackendWebSocketConnectionState;
  readonly ready: Promise<void>;
  send(frame: ApplicationWebSocketFrame | string | Uint8Array): Promise<void>;
  onMessage(listener: (frame: ApplicationWebSocketFrame) => void): () => void;
  onError(listener: (error: ApplicationBackendWebSocketConnectionError) => void): () => void;
  onClose(listener: (event: ApplicationBackendWebSocketCloseEvent) => void): () => void;
  close(code?: number, reason?: string): void;
};

applicationClient.backend.connectWebSocket(
  path: string,
  options?: ApplicationBackendWebSocketConnectOptions,
): ApplicationBackendWebSocketConnection;
```

Rules:

1. `connectWebSocket(...)` returns the connection synchronously in `connecting` state and installs transport/abort listeners before asynchronous establishment.
2. `ready` resolves only after the framework's reserved readiness frame is consumed. That frame is never delivered through `onMessage`.
3. `send(...)` before `open` rejects with `CONNECTION_NOT_READY`; after `closing`/`closed` it rejects with `CONNECTION_CLOSED`. These caller-state errors do not emit `onError` or close an otherwise healthy connection.
4. A successful `send(...)` means the local browser transport accepted the frame; it is not an application-handler acknowledgement.
5. Listener removers and `close(...)` are idempotent. Listener exceptions are isolated and never close the transport.
6. Binary values are copied at the SDK boundary so later caller mutation cannot change an accepted frame.
7. Application code receives no raw browser WebSocket.

## 2. Fixed Mount, Path, Query, And Route Matching

Bootstrap supplies `backendWebSocketBaseUrl` with the fixed application-scoped mount:

```text
/ws/applications/:applicationId/backend/routes
```

The frontend `path` is application-relative:

- it must be non-empty after trimming;
- it contains pathname segments only—no scheme, authority, query, or fragment;
- the SDK normalizes exactly one leading slash and rejects `.`/`..` segments;
- the SDK percent-encodes each segment and appends `options.query` through `URLSearchParams` semantics;
- application code never supplies `applicationId` or constructs the server mount.

The base URL is supplied by the trusted AutoByteus desktop host. The SDK parses that `ws:`/`wss:` base, appends the normalized encoded application-relative pathname, and appends all application query values in caller order, including repeated array values. The bootstrap, connection options, and connection expose no application authentication field. Paired mobile/phone access and credential composition are outside this capability.

Backend route declarations use static segments and named `:param` segments:

```ts
{ path: "/rooms/:roomId", open: ... }
```

The backend definition loader/worker route validator rejects empty parameter names, duplicate names in one route, duplicate normalized patterns, and ambiguous patterns; built-in/devkit package execution coverage exercises those failures after build. Two patterns are ambiguous exactly when they have the same segment count and, at every position, the literals are equal or at least one of the two segments is a parameter. Therefore runtime matching has exactly zero or one result. Request path and params are decoded once; malformed encoding rejects establishment safely.

Establishment order is:

1. trusted desktop application scope plus active-application and WebSocket-exposure validation;
2. construction of the normalized application request;
3. managed worker availability;
4. exact application route match;
5. backend route `open(...)` completion;
6. serialized framework readiness commit.

No application handler runs before steps 1–4 pass.

## 3. Backend Definition And Handler Contract

```ts
export type ApplicationWebSocketRequest = {
  path: string;
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  headers: Record<string, string | string[] | undefined>;
};

export type ApplicationWebSocketSessionClose = {
  code: number;
  reason: string;
};

export type ApplicationWebSocketSession = {
  readonly sessionId: string;
  readonly signal: AbortSignal;
  send(frame: ApplicationWebSocketFrame | string | Uint8Array): Promise<void>;
  close(code?: number, reason?: string): Promise<void>;
};

export type ApplicationWebSocketSessionHandler = {
  onMessage?(frame: ApplicationWebSocketFrame): Promise<void> | void;
  onClose?(event: ApplicationWebSocketSessionClose): Promise<void> | void;
};

export type ApplicationWebSocketRouteDefinition = {
  path: string;
  open(
    request: ApplicationWebSocketRequest,
    session: ApplicationWebSocketSession,
    context: ApplicationHandlerContext,
  ): Promise<ApplicationWebSocketSessionHandler | void> | ApplicationWebSocketSessionHandler | void;
};

export type ApplicationBackendDefinition = {
  // existing v4 fields...
  webSocketRoutes?: ApplicationWebSocketRouteDefinition[];
};
```

Backend invariants:

1. `request.path` is the normalized decoded application-relative path. `params` come only from the matched route. `query` preserves repeated application values as arrays. Header names are lower-cased and values are sanitized strings/string arrays.
2. `context.requestContext` contains the trusted application scope supplied by the Engine Host; no path/query/header value can override it.
3. `sessionId` is opaque process correlation, not authorization or a frontend-visible value.
4. `signal` aborts exactly once when any side closes or establishment fails.
5. `session.send(...)` preserves per-session call order and resolves when the owning worker/host boundary accepts the frame, not when the frontend processes it. During `open(...)`, accepted sends enter the bounded early-outbound FIFO; after readiness they use the bounded worker-to-network path.
6. `session.close(...)` is idempotent. The first close cause wins.
7. `onMessage` is invoked serially per session; one invocation completes before the next begins. A thrown/rejected handler closes only that session with a safe internal-error outcome.
8. `onClose` is invoked at most once after a handler exists. If closure wins while `open(...)` is pending and `open(...)` later returns a handler, that handler receives the already-recorded close once and is never activated.
9. Returning `void` from `open(...)` creates a send/close-only session; inbound frames are accepted and discarded because no `onMessage` exists.

## 4. Reserved Readiness And Early-Frame Contract

The only framework-owned application-backend WebSocket data frame is the first server text frame:

```json
{
  "protocol": "autobyteus.application-backend.websocket.v1",
  "type": "CONNECTION_READY"
}
```

The SDK accepts this frame only when JSON parsing yields an object with exactly the two shown keys and values. A binary, malformed, differently versioned, additional-key, or application frame before readiness is `PROTOCOL_ERROR` and closes with `1002`.

The Gateway session owns one serialized readiness commit after worker `open(...)` succeeds:

- `READY` winner: write the reserved readiness frame successfully, change internal state to `ACTIVE`, then drain backend frames accepted during `open(...)` in FIFO order;
- client/abort/network/worker/backend-close winner: never write `READY`, abort/release both gateway and worker registrations, discard early outbound frames, and reject frontend `ready`;
- readiness write failure: transport failure wins; no application frame is exposed;
- a close arriving after the readiness write succeeds is an active-session close and is ordered after `READY`.

Frontend SDK `send(...)` is unavailable before `ready`, so supported clients cannot create early inbound application frames. A raw/invalid client frame received before the Gateway readiness commit closes that session with WebSocket code `1002`; it is never queued or delivered to the application.

Backend `session.send(...)` during `open(...)` is allowed because its bounded early-outbound FIFO is held until after the reserved readiness frame. If `open(...)` fails or another close wins, those frames are discarded.

## 5. Message Delivery, Ordering, And Bounds

After readiness:

```text
frontend send
→ Gateway bounded inbound FIFO
→ serialized Engine Host delivery
→ Backend Host session registry
→ one-at-a-time handler.onMessage

backend session.send
→ Backend Host bounded outbound FIFO
→ Engine Host action
→ Gateway socket buffered-amount gate
→ frontend onMessage
```

Properties:

- Text and binary frame order is preserved independently per session in each direction.
- IPC encodes binary as base64 internally; public/backend APIs always expose `Uint8Array`.
- Every accepted frame is checked against one configured byte limit before queueing or IPC conversion.
- Gateway inbound FIFO, Backend Host outbound FIFO, Gateway early-outbound FIFO, and socket `bufferedAmount` each have explicit configured limits. Limits are independent because they protect different process/transport boundaries.
- Overflow or oversized inbound data closes only that session (`1009` for frame size; `1013` for backpressure). Backend `session.send(...)` rejects when its owned bound is exceeded.
- After `ACTIVE`, the Gateway does not add a second outbound application FIFO; it writes worker frames immediately subject to the socket buffered-amount limit.
- Numeric limits are centralized exported server/worker constants, exercised at below/equal/above boundaries, and recorded in the implementation handoff. They are not application-configurable in v1.

## 6. Frontend Failure And Close Outcomes

Stable frontend errors:

| Code | Exact Message | Recoverable |
| --- | --- | --- |
| `CONNECTION_NOT_READY` | `The application backend WebSocket connection is not ready.` | `true` |
| `CONNECTION_CLOSED` | `The application backend WebSocket connection is closed.` | `true` |
| `CONNECTION_ABORTED` | `The application backend WebSocket connection was aborted.` | `true` |
| `CONNECTION_REJECTED` | `The application backend WebSocket connection was rejected.` | `true` |
| `PROTOCOL_ERROR` | `The application backend WebSocket readiness protocol was invalid.` | `false` |
| `FRAME_TOO_LARGE` | `The application backend WebSocket frame exceeds the delivery limit.` | `false` |
| `BACKPRESSURE_LIMIT` | `The application backend WebSocket exceeded its delivery limit.` | `true` |
| `BACKEND_UNAVAILABLE` | `The application backend WebSocket handler is unavailable.` | `true` |
| `TRANSPORT_FAILED` | `The application backend WebSocket transport failed.` | `true` |
| `SEND_FAILED` | `The application backend WebSocket frame could not be sent.` | `true` |

Framework close-code interpretation is fixed: `1002 → PROTOCOL_ERROR`, `1009 → FRAME_TOO_LARGE`, `1012 → BACKEND_UNAVAILABLE`, and `1013 → BACKPRESSURE_LIMIT`. A safe `1011` before readiness maps to `CONNECTION_REJECTED`; after readiness it maps to `BACKEND_UNAVAILABLE`. Unknown abnormal transport closure maps to `TRANSPORT_FAILED`.

| Trigger | `ready` | `onError` | `onClose` / State |
| --- | --- | --- | --- |
| client `close()` while connecting | reject `CONNECTION_ABORTED` | none | once with requested/default clean close; `connecting → closing → closed` |
| `AbortSignal` while connecting | reject `CONNECTION_ABORTED` | none | once with `1000`, reason `Aborted`; `connecting → closing → closed` |
| inactive application / disabled exposure / route / open rejection | reject `CONNECTION_REJECTED` | same safe error once | actual safe close once; `connecting → closing → closed` |
| worker stops before ready | reject `BACKEND_UNAVAILABLE` | same safe error once | `1012` once; `connecting → closing → closed` |
| transport closes/fails before ready | reject `TRANSPORT_FAILED` | same safe error once | actual/synthetic close once; `connecting → closing → closed` |
| first server frame is not exact readiness | reject `PROTOCOL_ERROR` | same error once | SDK closes `1002`; once |
| local oversized `send(...)` | already resolved | none; returned promise rejects `FRAME_TOO_LARGE` | connection remains open |
| local send throws | already resolved | `SEND_FAILED` once | transport closes; once |
| server frame-size/backpressure close | already resolved | `FRAME_TOO_LARGE` for `1009` or `BACKPRESSURE_LIMIT` for `1013`, once | actual close once; `open → closing → closed` |
| worker/backend becomes unavailable | already resolved | `BACKEND_UNAVAILABLE` once | `1011`/`1012` once; `open → closing → closed` |
| normal client/backend close | already resolved | none | actual close once; `open → closing → closed` |

For establishment failure, the SDK changes to `closing`, settles `ready`, dispatches `onError` when required, then changes to `closed` and dispatches `onClose`. Promise reaction scheduling remains JavaScript-standard; this ordering describes the SDK's internal settlement/dispatch operations. Duplicate error/close/socket events are ignored after the first cause.

Safe connection errors contain only code, stable message, and recoverability. Backend exception text, stack, route inventory, worker state, and filesystem data never cross the socket.

## 7. Server/Worker Failure And Cleanup Table

| Trigger | Owner Outcome | Cleanup |
| --- | --- | --- |
| desktop application unavailable | Gateway rejects before worker open | remove pending gateway session; safe close |
| no route / ambiguous-invalid declaration | validator or Backend Host rejects | no active worker session; safe close |
| client close during application/worker open | Gateway first-cause close | cancel pending work; close any late worker registration |
| `open(...)` throws/rejects | Backend Host rejects open | abort signal; no handler activation; safe `1011` close |
| backend calls `session.close(...)` during open | close wins readiness commit | no READY; discard early outbound; close once |
| backend sends during open then open succeeds | Gateway retains bounded early FIFO | READY first, then FIFO drain |
| early raw client frame | Gateway protocol failure | no worker delivery; `1002`; remove session |
| `onMessage` throws/rejects | Backend Host session failure | abort, `1011`, `onClose` once, other sessions unaffected |
| inbound/outbound queue overflow | owning boundary fails session | `1013`, clear queues, abort, close once |
| frame exceeds limit | receiving/sending boundary rejects | reject send or close `1009`; clear session only |
| socket buffered amount exceeds limit | Gateway backpressure failure | `1013`, close worker registration and socket |
| worker stops/restarts | Engine Host closes application sessions | `1012`, abort each session, frontend safe error/close |
| network fails | Gateway closes worker session | remove gateway record, abort worker signal, `onClose` once |
| duplicate close/error/late acknowledgement | session first-cause state machine ignores it | no duplicate callback or registry entry |

Before any custom worker boundary, the WebSocket adapter passes normalized path, decoded params, application query, sanitized headers, and trusted desktop application scope. No application authentication credential is created or forwarded by this capability. Existing server/network security and diagnostic redaction remain unchanged platform concerns.

## 8. Manifest, Files, And Strict Cutover

There is no nested application-manifest exposure declaration. The exact target contracts are:

```ts
export const APPLICATION_MANIFEST_VERSION_V4 = "4" as const;
export const APPLICATION_BACKEND_BUNDLE_CONTRACT_VERSION_V1 = "1" as const;
export const APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V4 = "4" as const;
export const APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V4 = "4" as const;

export type ApplicationManifestV4 = {
  manifestVersion: typeof APPLICATION_MANIFEST_VERSION_V4;
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  ui: {
    entryHtml: string;
    frontendSdkContractVersion: typeof APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V4;
  };
  backend: { bundleManifest: string };
  executionResourceSlots?: ApplicationExecutionResourceSlotDeclaration[] | null;
};

export type ApplicationBackendSupportedExposures = {
  queries: boolean;
  commands: boolean;
  routes: boolean;
  graphql: boolean;
  notifications: boolean;
  eventHandlers: boolean;
  webSockets: boolean;
};

export type ApplicationBackendBundleManifestV1 = {
  contractVersion: typeof APPLICATION_BACKEND_BUNDLE_CONTRACT_VERSION_V1;
  entryModule: string;
  moduleFormat: "esm";
  distribution: "self-contained";
  targetRuntime: { engine: "node"; semver: string };
  sdkCompatibility: {
    backendDefinitionContractVersion: typeof APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V4;
    frontendSdkContractVersion: typeof APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V4;
  };
  supportedExposures: ApplicationBackendSupportedExposures;
  migrationsDir?: string | null;
  assetsDir?: string | null;
};
```

`ApplicationManifestV4.backend.bundleManifest` points to the backend bundle manifest; it does not repeat `supportedExposures`. `ApplicationBackendBundleManifestV1.supportedExposures` is the single declared capability authority. The V1 bundle/package structure remains current; in this pre-release clean cut its required exposure record gains `webSockets`, and old six-flag bundles are rejected rather than compatibility-filled.

Current `ApplicationBackendDefinition` has `definitionContractVersion: "4"` and optional `webSocketRoutes`. The route array declares actual handlers; it is not a second capability flag. Definition loading fails if routes are non-empty while `supportedExposures.webSockets` is false. A true flag with an empty/absent route array is valid.

The exact derived runtime summary is:

```ts
export type ApplicationBackendExposureSummary = {
  supportedExposures: ApplicationBackendSupportedExposures;
  queries: string[];
  commands: string[];
  routes: Array<Pick<ApplicationRouteDefinition, "method" | "path">>;
  graphql: boolean;
  notifications: boolean;
  eventHandlers: ApplicationExecutionEventFamily[];
  webSocketRoutes: Array<Pick<ApplicationWebSocketRouteDefinition, "path">>;
};
```

The summary is an immutable observation derived from the one bundle authority plus the loaded definition. It cannot enable a capability and is never read as configuration.

- Application/root validation accepts only `ApplicationManifestV4` and frontend SDK `"4"`, requires only the backend bundle pointer, and rejects a nested application-manifest exposure block.
- Backend-bundle validation accepts contract `"1"`, requires exact backend/frontend compatibility `"4"`/`"4"`, and requires all seven boolean exposure keys including `webSockets`.
- Definition/worker validation accepts only definition `"4"`, enforces the bundle flag before route registration, validates exact route shape/duplicates/ambiguity, and builds the derived summary.
- Devkit config remains the authoring source for the one backend-bundle `supportedExposures` record; its defaults/writer/template include `webSockets`, never an application-manifest copy.
- Both built-ins update `application.json` to manifest/frontend `"4"`, keep `backend/bundle.json` contract `"1"`, set compatibility to `"4"`/`"4"`, include one explicit `webSockets` boolean, use definition `"4"`, and regenerate checked-in vendor/importable distributions.
- Shared contracts own public frame/request/session/route types.
- Frontend SDK owns the connection and browser transport.
- Application Backend API Gateway owns remote session establishment and network-side state.
- Application Engine Host owns correlated IPC and worker-stop fan-out.
- Application Backend Host owns route selection and the worker session registry.
- No v3 reader, flat frontend alias, raw browser socket, or old partial contract remains.

All session, queue, correlation, and readiness state is transient. This capability adds no persisted-data migration or compatibility path.

## 9. Mandatory Contract And Execution Scenarios

Coverage must include:

1. trusted desktop-host base plus fixed base/path/query construction, repeated values, and invalid path rejection;
2. static/parameter route matching, decoded params/query, ambiguous route validation, trusted context;
3. successful text and binary round trips in both directions;
4. exact reserved readiness frame hidden from application listeners;
5. frontend send before ready/after close and local oversized-frame rejection;
6. backend send during open with READY-before-application-frame ordering;
7. early raw client frame rejection;
8. close/abort/network/worker/backend-close races at every asynchronous establishment boundary;
9. inbound/outbound/early/socket-buffer below/equal/above-limit behavior;
10. serialized backend `onMessage`, listener isolation, handler failure, and independent-session isolation;
11. worker stop, network failure, late open acknowledgement, idempotent two-sided cleanup, and exactly-once backend/frontend close callbacks;
12. strict desktop bootstrap/client contracts expose no application authentication or paired-mobile credential surface;
13. exact manifest-v4 → backend-bundle-v1 pointer/authority, seven-flag validation, v4/v4 compatibility, definition-v4 capability gating, derived-summary shape, and regenerated built-in/package rejection tests;
14. structural proof that standard `agentCommunication.connect(...)` never calls this route/session/worker capability.

Example:

```ts
// Backend definition
webSocketRoutes: [{
  path: "/rooms/:roomId",
  open: async (request, session) => ({
    onMessage: async (frame) => {
      if (frame.kind === "text") {
        await session.send(`room:${request.params.roomId}:${frame.text}`);
      }
    },
  }),
}]

// Frontend
const connection = applicationClient.backend.connectWebSocket("/rooms/room-7", {
  query: { view: "compact" },
});
await connection.ready;
await connection.send("hello");
```
