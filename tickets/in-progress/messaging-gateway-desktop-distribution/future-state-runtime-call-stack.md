# Future-State Runtime Call Stacks (Debug-Trace Style)

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint
  - `[ASYNC]` async boundary
  - `[STATE]` in-memory mutation
  - `[IO]` file/network/database/process IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path
- No legacy manual-gateway branches are modeled.

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v2`
- Requirements: `tickets/in-progress/messaging-gateway-desktop-distribution/requirements.md` (`Refined`)
- Source Artifact: `tickets/in-progress/messaging-gateway-desktop-distribution/proposed-design.md`
- Source Design Version: `v2`
- Referenced Sections:
  - `Target State (To-Be)`
  - `Target Architecture Shape And Boundaries (Mandatory)`
  - `File And Module Breakdown`
  - `Use-Case Coverage Matrix (Design Gate)`

## Future-State Modeling Rule (Mandatory)

- These call stacks model the target server-managed messaging behavior, not the current direct browser-to-gateway flow.

## Use Case Index (Stable IDs)

| use_case_id | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Requirement | FR-001, FR-003A, FR-005A, FR-009B, FR-010 | N/A | Enable messaging on embedded node with missing artifact | Yes/Yes/Yes |
| UC-002 | Requirement | FR-001, FR-003, FR-004, FR-005, FR-008 | N/A | Enable messaging on remote node with artifact already installed | Yes/Yes/Yes |
| UC-003 | Requirement | FR-002, FR-004, FR-005, FR-009 | N/A | Restore the managed gateway automatically after server restart | Yes/Yes/Yes |
| UC-004 | Requirement | FR-005A, FR-009, FR-009B | N/A | Handle artifact verification or extraction failure safely | Yes/N/A/Yes |
| UC-005 | Requirement | FR-006, FR-009A | N/A | Read managed status and advanced diagnostics from the selected node | Yes/N/A/Yes |
| UC-006 | Requirement | FR-003B, FR-010, FR-011 | N/A | Reject incompatible provider/runtime combinations during compatibility resolution | Yes/N/A/Yes |
| UC-007 | Requirement | FR-007, FR-007A, FR-009 | N/A | Save provider credentials and messaging options through the server-owned flow | Yes/Yes/Yes |
| UC-008 | Requirement | FR-001, FR-004, FR-013 | N/A | Disable managed messaging on the selected node | Yes/N/A/Yes |
| UC-009 | Requirement | FR-004, FR-010, FR-014 | N/A | Update the managed gateway runtime on the selected node with rollback | Yes/Yes/Yes |

## Transition Notes

- No temporary dual-path behavior is modeled.
- Retirement plan for temporary logic: `N/A`

## Use Case: UC-001 [Enable messaging on embedded node with missing artifact]

### Goal

- Install and start a compatible gateway on the embedded node when the required runtime is not yet present.

### Preconditions

- Embedded node is selected and reachable.
- Managed messaging is supported for the selected provider set.
- No compatible gateway artifact is currently active on disk.

### Expected Outcome

- The server downloads, verifies, extracts, configures, and starts the gateway, then exposes `running` status plus diagnostics to the frontend.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/settings/messaging/ManagedGatewayStatusCard.vue:onEnableClick()
└── autobyteus-web/stores/managedMessagingGatewayStore.ts:enableManagedGateway() [STATE]
    ├── autobyteus-web/stores/managedMessagingGatewayStore.ts:setLifecycleState("downloading") [STATE]
    └── autobyteus-server-ts/src/api/graphql/types/managed-messaging-gateway.ts:enableManagedMessagingGateway(input) [ASYNC]
        └── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:enable(input)
            ├── managed-messaging-gateway-service.ts:writeDesiredState("enabled") [IO]
            ├── managed-messaging-gateway-service.ts:writeLifecycleState("resolving-compatibility") [IO]
            ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-release-manifest-service.ts:resolveArtifact(serverVersion, nodePlatform, providerSet) [IO]
            ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-installer-service.ts:ensureInstalled(descriptor)
            │   ├── messaging-gateway-installer-service.ts:downloadArtifactArchive(descriptor) [IO]
            │   ├── messaging-gateway-installer-service.ts:verifyArtifactChecksum(archivePath, descriptor.sha256) [IO]
            │   ├── messaging-gateway-installer-service.ts:extractArtifactArchive(archivePath, installRoot) [IO]
            │   └── messaging-gateway-installer-service.ts:activateInstalledVersion(descriptor.artifactVersion) [IO]
            ├── managed-messaging-gateway-service.ts:writeRuntimeConfig(input, descriptor.artifactVersion) [IO]
            ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-process-supervisor.ts:start(runtimeConfigPath)
            │   ├── messaging-gateway-process-supervisor.ts:spawnChildProcess(entrypoint, env) [IO]
            │   ├── messaging-gateway-process-supervisor.ts:waitForHealth(bindHost, bindPort) [ASYNC]
            │   └── messaging-gateway-process-supervisor.ts:collectDiagnostics() [IO]
            ├── managed-messaging-gateway-service.ts:writeLifecycleState("running") [IO]
            └── managed-messaging-gateway-service.ts:getStatus()
                └── autobyteus-server-ts/src/api/graphql/types/managed-messaging-gateway.ts:toManagedMessagingGatewayStatusGql(status)
```

### Branching / Fallback Paths

```text
[FALLBACK] if a matching artifact archive is already cached but not extracted
autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-installer-service.ts:ensureInstalled(descriptor)
├── messaging-gateway-installer-service.ts:reuseCachedArchive(descriptor.artifactVersion) [IO]
├── messaging-gateway-installer-service.ts:verifyArtifactChecksum(archivePath, descriptor.sha256) [IO]
└── messaging-gateway-installer-service.ts:extractArtifactArchive(archivePath, installRoot) [IO]
```

```text
[ERROR] if the downloaded artifact cannot be started
autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-process-supervisor.ts:start(runtimeConfigPath)
├── messaging-gateway-process-supervisor.ts:spawnChildProcess(entrypoint, env) [IO]
├── messaging-gateway-process-supervisor.ts:waitForHealth(bindHost, bindPort) [ASYNC]
└── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:markRuntimeError(error) [IO]
```

### State And Data Transformations

- UI intent -> node-scoped enable command with provider/config payload.
- Release manifest descriptor -> verified artifact install root.
- Provider/config input -> managed runtime `.env` and persisted desired-state record.
- Supervisor health result -> lifecycle snapshot plus diagnostics payload.

### Observability And Debug Points

- Logs emitted at: enable request receipt, manifest resolution, download start/finish, checksum verification, extraction completion, process spawn, health-ready.
- Metrics/counters updated at: install attempts, install failures, successful starts.
- Tracing spans (if any): enable mutation, installer pipeline, supervisor startup.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-module dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- Whether long-running install progress should stream through polling, subscriptions, or mutation-returned operation IDs.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 [Enable messaging on remote node with artifact already installed]

### Goal

- Start the managed gateway on a remote node without re-downloading the artifact when the compatible version is already installed.

### Preconditions

- Remote node is selected and reachable.
- Managed messaging is enabled for a supported provider set.
- Compatible gateway runtime is already present under server-owned data on the remote node.

### Expected Outcome

- The server reuses the installed runtime, writes config if needed, starts the child process, and reports `running`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/stores/managedMessagingGatewayStore.ts:enableManagedGateway() [STATE]
└── autobyteus-server-ts/src/api/graphql/types/managed-messaging-gateway.ts:enableManagedMessagingGateway(input) [ASYNC]
    └── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:enable(input)
        ├── managed-messaging-gateway-service.ts:writeDesiredState("enabled") [IO]
        ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-release-manifest-service.ts:resolveArtifact(serverVersion, nodePlatform, providerSet) [IO]
        ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-installer-service.ts:ensureInstalled(descriptor)
        │   └── messaging-gateway-installer-service.ts:reuseInstalledVersion(descriptor.artifactVersion) [IO]
        ├── managed-messaging-gateway-service.ts:writeRuntimeConfig(input, descriptor.artifactVersion) [IO]
        ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-process-supervisor.ts:start(runtimeConfigPath)
        │   ├── messaging-gateway-process-supervisor.ts:spawnChildProcess(entrypoint, env) [IO]
        │   └── messaging-gateway-process-supervisor.ts:waitForHealth(bindHost, bindPort) [ASYNC]
        └── managed-messaging-gateway-service.ts:getStatus()
```

### Branching / Fallback Paths

```text
[FALLBACK] if the installed runtime is older than the manifest-selected version
autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-installer-service.ts:ensureInstalled(descriptor)
├── messaging-gateway-installer-service.ts:markExistingInstallStale(descriptor.artifactVersion) [IO]
└── messaging-gateway-installer-service.ts:downloadArtifactArchive(descriptor) [IO]
```

```text
[ERROR] if the remote node cannot bind the preferred port
autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-process-supervisor.ts:start(runtimeConfigPath)
├── messaging-gateway-process-supervisor.ts:allocateAvailablePort(preferredPort) [IO]
├── messaging-gateway-process-supervisor.ts:rewriteRuntimeConfigPort(runtimeConfigPath, allocatedPort) [IO]
└── messaging-gateway-process-supervisor.ts:waitForHealth(bindHost, allocatedPort) [ASYNC]
```

### State And Data Transformations

- Existing install metadata -> active runtime selection.
- Preferred port -> effective bind port chosen by the supervisor.
- Remote node runtime state -> node-scoped status payload for the frontend.

### Observability And Debug Points

- Logs emitted at: reuse-installed-version decision, runtime config write, process spawn, health-ready.
- Metrics/counters updated at: remote starts, port reallocations.
- Tracing spans (if any): enable mutation, supervisor startup.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-module dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- Whether the preferred port should remain sticky per node after a successful reallocation.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-003 [Restore the managed gateway automatically after server restart]

### Goal

- Preserve enabled state and automatically restore the gateway after the server process restarts.

### Preconditions

- Managed messaging was previously enabled on the node.
- A compatible runtime remains installed on disk.

### Expected Outcome

- During server bootstrap, the managed gateway is restarted and the status surface reflects the restored runtime.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/bootstrap/bootstrap-server.ts:bootstrapServer()
└── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-bootstrap.ts:restoreManagedGatewayOnStartup() [ASYNC]
    ├── managed-messaging-gateway-bootstrap.ts:readDesiredState() [IO]
    ├── managed-messaging-gateway-bootstrap.ts:readActiveInstallMetadata() [IO]
    ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:restoreIfEnabled()
    │   ├── managed-messaging-gateway-service.ts:writeLifecycleState("starting") [IO]
    │   ├── managed-messaging-gateway-service.ts:writeRuntimeConfigFromPersistedSettings() [IO]
    │   ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-process-supervisor.ts:start(runtimeConfigPath)
    │   └── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-process-supervisor.ts:collectDiagnostics() [IO]
    └── managed-messaging-gateway-bootstrap.ts:publishCapabilityReadyState() [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if desired state is enabled but the runtime is no longer installed
autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:restoreIfEnabled()
├── managed-messaging-gateway-service.ts:writeLifecycleState("blocked") [IO]
└── managed-messaging-gateway-service.ts:writeLastError("artifact-missing-after-restart") [IO]
```

```text
[ERROR] if the restored process exits during health probing
autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-process-supervisor.ts:waitForHealth(bindHost, bindPort) [ASYNC]
└── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:markRuntimeError(error) [IO]
```

### State And Data Transformations

- Persisted desired-state/config/install metadata -> restored runtime config.
- Restart health probe result -> lifecycle `running` or `degraded`.

### Observability And Debug Points

- Logs emitted at: startup restore decision, restart spawn, restart health result.
- Metrics/counters updated at: restore attempts, restore failures.
- Tracing spans (if any): bootstrap restore span.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-module dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- Whether restore should retry automatically once after a crash before surfacing `degraded`.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-004 [Handle artifact verification or extraction failure safely]

### Goal

- Fail installation safely when the artifact cannot be verified or extracted and keep the previous runtime untouched.

### Preconditions

- An enable flow has reached the installer pipeline.
- The download or archive contents are invalid, corrupt, or incompatible.

### Expected Outcome

- The server marks install state `error`, cleans staged files, preserves the previous active install, and returns actionable diagnostics.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-installer-service.ts:ensureInstalled(descriptor)
├── messaging-gateway-installer-service.ts:downloadArtifactArchive(descriptor) [IO]
├── messaging-gateway-installer-service.ts:verifyArtifactChecksum(archivePath, descriptor.sha256) [IO]
├── messaging-gateway-installer-service.ts:extractArtifactArchive(archivePath, installRoot) [IO]
└── messaging-gateway-installer-service.ts:returnInstallResult() [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if checksum verification fails
autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-installer-service.ts:verifyArtifactChecksum(archivePath, descriptor.sha256) [IO]
├── messaging-gateway-installer-service.ts:deleteStagedArchive(archivePath) [IO]
├── messaging-gateway-installer-service.ts:restorePreviousActiveVersionPointer() [IO]
└── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:markInstallError("checksum-mismatch") [IO]
```

```text
[ERROR] if archive extraction fails after verification
autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-installer-service.ts:extractArtifactArchive(archivePath, installRoot) [IO]
├── messaging-gateway-installer-service.ts:deleteIncompleteInstallRoot(installRoot) [IO]
├── messaging-gateway-installer-service.ts:restorePreviousActiveVersionPointer() [IO]
└── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:markInstallError("extract-failed") [IO]
```

### State And Data Transformations

- Artifact descriptor + archive bytes -> verified or rejected staged install.
- Installer exception -> lifecycle `error` snapshot with user-facing message.

### Observability And Debug Points

- Logs emitted at: checksum start/fail, extraction start/fail, cleanup completion.
- Metrics/counters updated at: checksum failures, extraction failures, rollback executions.
- Tracing spans (if any): installer verification span, extraction span.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-module dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- Whether staged archives should be retained for debugging after repeated failures or always removed immediately.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-007 [Save provider credentials and messaging options through the server-owned flow]

### Goal

- Persist provider configuration through the selected node's server API and update readiness state without direct browser-to-gateway calls.

### Preconditions

- The node is selected and managed messaging is supported.
- The user has opened the managed messaging settings UI.

### Expected Outcome

- The server stores provider configuration securely, applies it to the runtime when possible, and reports readiness or misconfiguration back to the frontend.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/settings/messaging/ManagedGatewayStatusCard.vue:onSaveConfigClick()
└── autobyteus-web/stores/managedMessagingGatewayStore.ts:saveConfig(input) [STATE]
    └── autobyteus-server-ts/src/api/graphql/types/managed-messaging-gateway.ts:saveManagedMessagingGatewayConfig(input) [ASYNC]
        └── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:applyConfig(input)
            ├── managed-messaging-gateway-service.ts:validateProviderConfig(input)
            ├── managed-messaging-gateway-service.ts:writeProviderConfig(input) [IO]
            ├── managed-messaging-gateway-service.ts:writeLifecycleState("configuring") [IO]
            ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-admin-client.ts:upsertProviderConfig(input) [ASYNC]
            ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-process-supervisor.ts:collectDiagnostics() [IO]
            └── managed-messaging-gateway-service.ts:getStatus()
```

### Branching / Fallback Paths

```text
[FALLBACK] if the gateway is not running yet
autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:applyConfig(input)
├── managed-messaging-gateway-service.ts:writeProviderConfig(input) [IO]
├── managed-messaging-gateway-service.ts:writeLifecycleState("configured-pending-start") [IO]
└── managed-messaging-gateway-service.ts:getStatus()
```

```text
[ERROR] if provider validation fails or runtime rejects the config
autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:applyConfig(input)
├── managed-messaging-gateway-service.ts:writeLifecycleState("misconfigured") [IO]
├── managed-messaging-gateway-service.ts:writeLastError("provider-config-invalid") [IO]
└── autobyteus-web/stores/managedMessagingGatewayStore.ts:applyStatusError(error) [STATE]
```

### State And Data Transformations

- UI config form -> validated provider configuration command.
- Provider configuration command -> server-owned secure config state.
- Config apply result -> readiness/misconfiguration status snapshot for the UI.

### Observability And Debug Points

- Logs emitted at: config save request, validation failure, config write success, runtime sync success/failure.
- Metrics/counters updated at: config saves, invalid config attempts, runtime apply failures.
- Tracing spans (if any): config mutation span, runtime sync span.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-module dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- Whether some provider changes can hot-reload while others require controlled restart semantics.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-008 [Disable managed messaging on the selected node]

### Goal

- Stop the managed gateway cleanly and surface an inactive state when the user disables messaging on a node.

### Preconditions

- Managed messaging is currently enabled or running on the selected node.

### Expected Outcome

- The server stops the supervised gateway, persists desired state as disabled, and the frontend reflects an inactive lifecycle state.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/settings/messaging/ManagedGatewayStatusCard.vue:onDisableClick()
└── autobyteus-web/stores/managedMessagingGatewayStore.ts:disableManagedGateway() [STATE]
    └── autobyteus-server-ts/src/api/graphql/types/managed-messaging-gateway.ts:disableManagedMessagingGateway() [ASYNC]
        └── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:disable()
            ├── managed-messaging-gateway-service.ts:writeDesiredState("disabled") [IO]
            ├── managed-messaging-gateway-service.ts:writeLifecycleState("stopping") [IO]
            ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-process-supervisor.ts:stop() [IO]
            ├── managed-messaging-gateway-service.ts:writeLifecycleState("disabled") [IO]
            └── managed-messaging-gateway-service.ts:getStatus()
```

### Branching / Fallback Paths

```text
[ERROR] if graceful shutdown times out
autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-process-supervisor.ts:stop() [IO]
├── messaging-gateway-process-supervisor.ts:forceKill() [IO]
└── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:writeLifecycleState("disabled") [IO]
```

### State And Data Transformations

- Disable UI action -> desired-state record set to disabled.
- Process stop result -> inactive lifecycle snapshot and cleared runtime diagnostics.

### Observability And Debug Points

- Logs emitted at: disable request, graceful stop attempt, force-kill fallback, disabled-state persistence.
- Metrics/counters updated at: disables, forced stops.
- Tracing spans (if any): disable mutation span.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-module dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- Whether disabling should preserve cached artifacts only or also support an optional uninstall in a later scope.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-009 [Update the managed gateway runtime on the selected node with rollback]

### Goal

- Update to a newer compatible runtime through the managed server boundary and recover safely if activation of the new version fails.

### Preconditions

- Managed messaging is installed on the selected node.
- The compatibility source resolves a newer artifact version than the active one.

### Expected Outcome

- The server stages the new runtime, switches activation to it if health checks pass, or restores the previous active runtime if the new version fails.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/settings/messaging/ManagedGatewayStatusCard.vue:onUpdateClick()
└── autobyteus-web/stores/managedMessagingGatewayStore.ts:updateGateway() [STATE]
    └── autobyteus-server-ts/src/api/graphql/types/managed-messaging-gateway.ts:updateManagedMessagingGateway() [ASYNC]
        └── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:update()
            ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-release-manifest-service.ts:resolveArtifact(serverVersion, nodePlatform, providerSet) [IO]
            ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-installer-service.ts:ensureInstalled(descriptor)
            ├── managed-messaging-gateway-service.ts:writeDesiredVersion(descriptor.artifactVersion) [IO]
            ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-process-supervisor.ts:stop() [IO]
            ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-installer-service.ts:switchActiveVersion(descriptor.artifactVersion) [IO]
            ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-process-supervisor.ts:start(runtimeConfigPath)
            ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-process-supervisor.ts:waitForHealth(bindHost, bindPort) [ASYNC]
            └── managed-messaging-gateway-service.ts:getStatus()
```

### Branching / Fallback Paths

```text
[FALLBACK] if the resolved artifact version is already active
autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:update()
└── managed-messaging-gateway-service.ts:returnNoOpStatus("already-up-to-date")
```

```text
[ERROR] if the new runtime fails after activation switch
autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:update()
├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-installer-service.ts:restorePreviousActiveVersion(previousVersion) [IO]
├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-process-supervisor.ts:start(previousRuntimeConfigPath)
├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-process-supervisor.ts:waitForHealth(bindHost, bindPort) [ASYNC]
└── managed-messaging-gateway-service.ts:writeLastError("update-rolled-back-after-activation-failure") [IO]
```

### State And Data Transformations

- Current version + compatibility manifest -> target version descriptor.
- Target version descriptor -> staged install and desired-version state.
- Health result -> active-version switch or rollback outcome.

### Observability And Debug Points

- Logs emitted at: update request, version resolution, active-version switch, activation failure, rollback success/failure.
- Metrics/counters updated at: update attempts, update successes, rollbacks.
- Tracing spans (if any): update mutation span, activation span, rollback span.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-module dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- Whether updates should be user-triggered only in v1 or also allowed automatically when the server version changes.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-005 [Read managed status and advanced diagnostics from the selected node]

### Goal

- Let the frontend show managed messaging lifecycle state and advanced read-only diagnostics for the selected node.

### Preconditions

- The node is selected in the current window.
- The server exposes the managed messaging status query.

### Expected Outcome

- The frontend renders lifecycle state, progress text, installed/running version, bind address, port, and logs/config paths without directly contacting the gateway.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/settings/messaging/ManagedGatewayStatusCard.vue:onMounted()
└── autobyteus-web/stores/managedMessagingGatewayStore.ts:loadStatus() [ASYNC]
    └── autobyteus-server-ts/src/api/graphql/types/managed-messaging-gateway.ts:managedMessagingGatewayStatus()
        └── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:getStatus()
            ├── managed-messaging-gateway-service.ts:readLifecycleState() [IO]
            ├── managed-messaging-gateway-service.ts:readDesiredState() [IO]
            ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-process-supervisor.ts:collectDiagnostics() [IO]
            └── autobyteus-web/stores/managedMessagingGatewayStore.ts:applyStatusSnapshot(status) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if the status query fails due to a temporary server-side probe error
autobyteus-server-ts/src/api/graphql/types/managed-messaging-gateway.ts:managedMessagingGatewayStatus()
└── autobyteus-web/stores/managedMessagingGatewayStore.ts:applyStatusError(error) [STATE]
```

### State And Data Transformations

- Internal lifecycle/install/probe state -> GraphQL status DTO.
- GraphQL status DTO -> web store snapshot rendered by the status card.

### Observability And Debug Points

- Logs emitted at: status query start/failure, diagnostics probe failure.
- Metrics/counters updated at: status reads, probe failures.
- Tracing spans (if any): status query span.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-module dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- Whether diagnostics refresh should be user-triggered only or periodically polled while the screen is open.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-006 [Reject incompatible provider/runtime combinations during compatibility resolution]

### Goal

- Prevent the server from installing or starting a gateway runtime that is incompatible with the requested provider set or excluded provider class.

### Preconditions

- The user attempts to enable managed messaging.
- The requested provider set includes either unsupported providers or no manifest match for the current node platform.

### Expected Outcome

- The server returns a blocked status with a clear compatibility reason and does not start installation.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/api/graphql/types/managed-messaging-gateway.ts:enableManagedMessagingGateway(input) [ASYNC]
└── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:enable(input)
    ├── managed-messaging-gateway-service.ts:validateRequestedProviders(input.providerSet)
    ├── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-release-manifest-service.ts:resolveArtifact(serverVersion, nodePlatform, providerSet) [IO]
    ├── managed-messaging-gateway-service.ts:writeLifecycleState("blocked") [IO]
    └── managed-messaging-gateway-service.ts:returnBlockedStatus("unsupported-provider-or-platform")
```

### Branching / Fallback Paths

```text
[ERROR] if manifest lookup itself fails
autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-release-manifest-service.ts:resolveArtifact(serverVersion, nodePlatform, providerSet) [IO]
└── autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts:markCompatibilityLookupError(error) [IO]
```

### State And Data Transformations

- Provider set + node platform + server version -> manifest lookup key.
- Manifest miss or excluded provider -> blocked lifecycle state and user-facing reason.

### Observability And Debug Points

- Logs emitted at: provider validation failure, manifest miss, blocked-state write.
- Metrics/counters updated at: compatibility misses, excluded-provider attempts.
- Tracing spans (if any): compatibility resolution span.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-module dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- Whether excluded providers should be rejected before manifest lookup or normalized into the same compatibility error surface.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
