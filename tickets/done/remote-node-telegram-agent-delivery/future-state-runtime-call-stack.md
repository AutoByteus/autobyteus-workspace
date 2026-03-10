# Future-State Runtime Call Stacks (Debug-Trace Style)

Use this document as a future-state (`to-be`) execution model derived from the design basis.
Prefer exact `file:function` frames, explicit branching, and clear state/persistence boundaries.
Do not treat this document as an as-is trace of current code behavior.

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint (API/CLI/event)
  - `[ASYNC]` async boundary (`await`, queue handoff, callback)
  - `[STATE]` in-memory mutation
  - `[IO]` file/network/database/cache IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v1`
- Requirements: `tickets/done/remote-node-telegram-agent-delivery/requirements.md` (status `Design-ready`)
- Source Artifact: `tickets/done/remote-node-telegram-agent-delivery/proposed-design.md`
- Source Design Version: `v1`
- Referenced Sections: `Architecture Direction Decision`, `Change Inventory`, `Use-Case Coverage Matrix`

## Future-State Modeling Rule (Mandatory)

- Model target design behavior even when current code diverges.
- No legacy branch keeps the old "use public URL for managed gateway callbacks" behavior.

## Use Case Index (Stable IDs)

| use_case_id | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Requirement | R-001, R-003 | N/A | Docker remote inbound delivery | Yes/N/A/Yes |
| UC-002 | Requirement | R-002, R-003 | N/A | Electron embedded dynamic port | Yes/N/A/Yes |
| UC-003 | Requirement | R-001, R-002 | N/A | Managed runtime restore / restart | Yes/N/A/Yes |
| UC-004 | Requirement | R-004 | N/A | Internal URL resolution failure | Yes/N/A/Yes |

## Transition Notes

- Existing deployments require no data migration.
- The old public-URL callback path is removed in-place from managed gateway env generation.

## Use Case: UC-001 [Docker remote inbound delivery]

### Goal

Route a Telegram message received by the Docker-hosted managed gateway into the colocated AutoByteus server successfully.

### Preconditions

- Server is running inside Docker on its configured listen port.
- Managed messaging is enabled and the Telegram binding exists on the remote server.
- Internal server base URL was seeded during server startup.

### Expected Outcome

- Gateway forwards inbound Telegram to server ingress over a reachable same-container URL.
- Server resolves the binding, launches or reuses the bound Codex run, and publishes live activity.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/app.ts:startServer(...)
├── autobyteus-server-ts/src/config/server-runtime-endpoints.ts:seedInternalServerBaseUrl(host, port) [STATE]
├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:restoreIfEnabled() [ASYNC]
│   └── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:startInstalledRuntime(...) [ASYNC]
│       ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-env.ts:buildManagedMessagingGatewayRuntimeEnv(...) [ASYNC]
│       │   └── autobyteus-server-ts/src/config/server-runtime-endpoints.ts:getInternalServerBaseUrlOrThrow() [STATE]
│       ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-storage.ts:writeRuntimeEnv(env) [IO]
│       └── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-process-supervisor.ts:start(...) [IO]
└── autobyteus-message-gateway/src/infrastructure/adapters/telegram-business/telegram-business-adapter.ts:onUpdate(...) [ASYNC]
    └── autobyteus-message-gateway/src/application/services/inbound-envelope-bridge-service.ts:handleEnvelope(...) [ASYNC]
        └── autobyteus-message-gateway/src/application/services/inbound-inbox-service.ts:enqueue(...) [IO]
            └── autobyteus-message-gateway/src/application/services/inbound-forwarder-worker.ts:forwardNext(...) [ASYNC]
                └── autobyteus-message-gateway/src/infrastructure/server-api/autobyteus-server-client.ts:forwardInbound(payload) [IO]
                    └── autobyteus-server-ts/src/api/rest/channel-ingress-message-route.ts:registerChannelIngressMessageRoute(...) [ENTRY]
                        └── autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts:handleInboundMessage(envelope) [ASYNC]
                            ├── autobyteus-server-ts/src/external-channel/services/channel-binding-service.ts:resolveBinding(...) [ASYNC][IO]
                            ├── autobyteus-server-ts/src/external-channel/runtime/default-channel-runtime-facade.ts:dispatchToBinding(binding, envelope) [ASYNC]
                            │   └── autobyteus-server-ts/src/external-channel/runtime/channel-binding-runtime-launcher.ts:resolveOrStartAgentRun(binding, ...) [ASYNC]
                            │       ├── autobyteus-server-ts/src/workspaces/workspace-manager.ts:ensureWorkspaceByRootPath(...) [ASYNC][IO]
                            │       ├── autobyteus-server-ts/src/runtime-execution/runtime-composition-service.ts:createAgentRun(...) [ASYNC]
                            │       ├── autobyteus-server-ts/src/external-channel/runtime/channel-run-history-bootstrapper.ts:bootstrapNewRun(...) [ASYNC][IO]
                            │       └── autobyteus-server-ts/src/runtime-execution/runtime-command-ingress-service.ts:sendTurn(...) [ASYNC]
                            └── autobyteus-server-ts/src/services/agent-streaming/agent-live-message-publisher.ts:publishExternalUserMessage(...) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if server ingress network request fails
autobyteus-message-gateway/src/infrastructure/server-api/autobyteus-server-client.ts:forwardInbound(...)
└── autobyteus-message-gateway/src/application/services/inbound-inbox-service.ts:markDeadLetter(recordId, error) [IO]
```

### State And Data Transformations

- Telegram update payload -> `ExternalMessageEnvelope`
- Envelope -> server ingress JSON payload
- Binding launch preset -> workspace + runtime session + run manifest

### Observability And Debug Points

- Startup log when internal server base URL is seeded.
- Managed gateway env write includes internal server base URL.
- Inbound dead-letter queue remains empty for public-URL mismatch cases.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-module dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None for this use case.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-002 [Electron embedded dynamic port]

### Goal

Ensure managed messaging on the embedded Electron server uses the actual started port rather than assuming `8000`.

### Preconditions

- Electron launches the server with runtime port `29695` or another non-`8000` port.
- Server startup parses that port before managed messaging enable or restore.

### Expected Outcome

- Internal server base URL resolves to `127.0.0.1:<runtime-port>`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/electron/server/*ServerManager.ts:launchServerProcess(...) [ASYNC]
└── autobyteus-server-ts/src/app.ts:startServer(...)
    ├── autobyteus-server-ts/src/app.ts:parseArgs(process.argv) [STATE]
    ├── autobyteus-server-ts/src/config/server-runtime-endpoints.ts:seedInternalServerBaseUrl(host, port) [STATE]
    └── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-env.ts:buildManagedMessagingGatewayRuntimeEnv(...)
        └── autobyteus-server-ts/src/config/server-runtime-endpoints.ts:getInternalServerBaseUrlOrThrow() [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if runtime port is missing or invalid
autobyteus-server-ts/src/config/server-runtime-endpoints.ts:seedInternalServerBaseUrl(...)
└── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-env.ts:buildManagedMessagingGatewayRuntimeEnv(...)
    └── throw explicit internal-server-url resolution error
```

### State And Data Transformations

- CLI args `--port` -> normalized numeric port
- startup host/port -> internal loopback base URL string

### Observability And Debug Points

- Internal server base URL should appear in gateway env output during tests.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-module dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None for this use case.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-003 [Managed runtime restore / restart]

### Goal

Ensure enable, restart, and restore-after-startup all share one internal server URL resolution path.

### Preconditions

- Internal server base URL was seeded once during server startup.
- Managed gateway service is invoked via enable, saveProviderConfig restart, update, or restore path.

### Expected Outcome

- All managed messaging lifecycle paths write the same valid internal server base URL into `gateway.env`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:enable()/saveProviderConfig()/restoreIfEnabled() [ASYNC]
└── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:startInstalledRuntime(...) [ASYNC]
    ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-env.ts:buildManagedMessagingGatewayRuntimeEnv(...)
    │   └── autobyteus-server-ts/src/config/server-runtime-endpoints.ts:getInternalServerBaseUrlOrThrow() [STATE]
    ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-storage.ts:writeRuntimeEnv(env) [IO]
    └── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-process-supervisor.ts:start(...) [IO]
```

### Branching / Fallback Paths

```text
[ERROR] if internal server base URL is unavailable during restart/restore
autobyteus-server-ts/src/config/server-runtime-endpoints.ts:getInternalServerBaseUrlOrThrow()
└── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:startInstalledRuntime(...)
    └── propagate startup failure to managed messaging status
```

### State And Data Transformations

- persisted provider config + runtime-only internal URL -> `gateway.env`

### Observability And Debug Points

- Managed messaging status message/error path on start failure.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-module dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None for this use case.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-004 [Internal URL resolution failure]

### Goal

Fail managed messaging startup explicitly when the internal server base URL cannot be resolved.

### Preconditions

- Runtime endpoint seeding did not occur or produced invalid data.

### Expected Outcome

- Managed messaging does not write a broken callback URL and does not silently fall back to the public URL.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:startInstalledRuntime(...) [ASYNC]
└── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-env.ts:buildManagedMessagingGatewayRuntimeEnv(...)
    └── autobyteus-server-ts/src/config/server-runtime-endpoints.ts:getInternalServerBaseUrlOrThrow() [ERROR]
        └── throw explicit configuration/runtime error
```

### Branching / Fallback Paths

```text
[ERROR] managed gateway start is aborted
autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:startInstalledRuntime(...)
└── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:getStatus(...) [STATE]
```

### State And Data Transformations

- Missing runtime facts -> explicit startup error payload

### Observability And Debug Points

- Error message should name internal server base URL resolution, not generic `fetch failed`.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-module dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None for this use case.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
