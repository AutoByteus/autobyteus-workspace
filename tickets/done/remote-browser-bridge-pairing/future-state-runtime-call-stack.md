# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Large`
- Call Stack Version: `v3`
- Requirements: `tickets/in-progress/remote-browser-bridge-pairing/requirements.md` (status `Design-ready`)
- Source Artifact:
  - `Medium/Large`: `tickets/in-progress/remote-browser-bridge-pairing/proposed-design.md`
- Source Design Version: `v3`
- Referenced Sections:
  - Spine inventory sections: `Data-Flow Spine Inventory`, `Primary Execution / Data-Flow Spine(s)`
  - Ownership sections: `Ownership Map`, `Ownership-Driven Dependency Rules`

## Future-State Modeling Rule (Mandatory)

- This document models the target design behavior, not the current implementation.
- Temporary migration behavior is limited to startup normalization of stale pairing status and is listed in `Transition Notes`.
- No legacy dual-path or compatibility-only branches are modeled.

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `UC-001` | `DS-001` | `Primary End-to-End` | `Electron pairing controller` | `Requirement` | `R-001`, `R-002` | `N/A` | Enable remote browser sharing and persist restart-required listener policy | `Yes/Yes/Yes` |
| `UC-002` | `DS-001` | `Primary End-to-End` | `Electron pairing controller` | `Requirement` | `R-003`, `R-004`, `R-005`, `R-006`, `R-010` | `N/A` | Pair one selected remote node and activate live browser capability | `Yes/Yes/Yes` |
| `UC-003` | `DS-001` | `Primary End-to-End` | `RuntimeBrowserBridgeRegistrationService` | `Requirement` | `R-007` | `N/A` | Browser tool advertisement becomes usable without remote restart after pairing | `Yes/Yes/Yes` |
| `UC-004` | `DS-002` | `Primary End-to-End` | `BrowserToolService` | `Requirement` | `R-008`, `R-009` | `N/A` | Execute browser work from a paired remote agent run | `Yes/N/A/Yes` |
| `UC-005` | `DS-003`, `DS-004`, `DS-005` | `Primary End-to-End` | `BrowserPairingStateController` | `Requirement` | `R-004`, `R-005`, `R-006`, `R-010` | `N/A` | Unpair or expire browser access and deny later remote browser calls | `Yes/Yes/Yes` |
| `UC-006` | `DS-002` | `Primary End-to-End` | `BrowserRuntime` | `Requirement` | `R-011` | `N/A` | Embedded browser startup and execution remain unchanged | `Yes/Yes/Yes` |
| `UC-007` | `DS-002` | `Primary End-to-End` | `CodexThreadBootstrapper` | `Requirement` | `R-008` | `N/A` | Pairing present but missing browser `toolNames` still blocks browser tool exposure | `Yes/N/A/Yes` |

## Transition Notes

- Any remote node persisted as `paired` from a previous Electron run is normalized to `expired` or `stale` on Electron startup because runtime bridge credentials are not persisted across desktop restarts.
- Live pairing expiry is owned on both sides of the boundary: Electron schedules a local expiry transition for node status visibility, and the remote server schedules runtime binding expiry for capability enforcement.
- The first delivery does not attempt durable credential recovery on the remote server. Recovery happens through explicit pair/unpair flow or a best-effort repair on node open.
- Remote node deletion is modeled as part of the revoke/cleanup spine: Electron main delegates cleanup to `BrowserPairingStateController` before the node record is removed so local timers and token records do not outlive the node.
- Embedded env-based browser support remains a first-class path and is not rewritten into the runtime pairing mechanism.

## Use Case: UC-001 [Enable Remote Browser Sharing]

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `Electron pairing controller`
- Why This Use Case Matters To This Spine: Remote pairing cannot begin until Electron explicitly allows remote bridge reachability and has an advertised host to issue in descriptors.
- Why This Spine Span Is Long Enough: It starts at the settings UI, crosses the Electron renderer/main boundary, persists the global policy, and ends at the restart-required state that governs later pairing behavior.

### Goal

Persist advanced remote-browser-sharing policy and listener/public-host configuration without changing live browser behavior until restart semantics are satisfied.

### Preconditions

- Electron desktop is running.
- User is in a settings surface that can edit advanced browser-sharing policy.

### Expected Outcome

- Remote browser sharing policy is persisted.
- Invalid enablement attempts are rejected before any pairing begins.
- UI indicates whether restart is required for the listener-mode change to take effect.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/settings/NodeManager.vue:onSaveRemoteBrowserSharingSettings(...)
├── autobyteus-web/electron/preload.ts:browserPairingUpdateSettings(...) [ASYNC]
├── autobyteus-web/electron/browser/register-browser-pairing-ipc-handlers.ts:updateRemoteBrowserSharingSettings(...) [ASYNC]
│   ├── autobyteus-web/electron/browser/remote-browser-sharing-settings-store.ts:validate(nextSettings)
│   ├── autobyteus-web/electron/browser/remote-browser-sharing-settings-store.ts:save(nextSettings) [STATE][IO]
│   └── autobyteus-web/electron/browser/register-browser-pairing-ipc-handlers.ts:computeRestartRequirement(...)
└── autobyteus-web/components/settings/NodeManager.vue:applyRemoteBrowserSharingSettingsResult(...) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if remote sharing stays disabled
autobyteus-web/electron/browser/register-browser-pairing-ipc-handlers.ts:updateRemoteBrowserSharingSettings(...)
└── autobyteus-web/electron/browser/remote-browser-sharing-settings-store.ts:save(loopbackOnlySettings) [STATE][IO]
```

```text
[ERROR] if enable is requested without an advertised host
autobyteus-web/electron/browser/remote-browser-sharing-settings-store.ts:validate(nextSettings)
└── autobyteus-web/components/settings/NodeManager.vue:setRemoteBrowserSharingError(...) [STATE]
```

### State And Data Transformations

- Settings form payload -> normalized remote sharing config:
  - `enabled`
  - `advertisedHost`
  - optional derived `requiresRestart`
- Persisted settings record -> runtime bootstrap input for the next Electron start.

### Observability And Debug Points

- Logs emitted at:
  - settings validation failures
  - settings save success/failure
  - restart-required state changes
- Metrics/counters updated at:
  - none required for first delivery
- Tracing spans (if any):
  - none required

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- Whether the settings UI should live inside `NodeManager` or a separate advanced browser card can still be adjusted without changing the runtime boundary.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 [Pair Remote Node]

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `Electron pairing controller`
- Why This Use Case Matters To This Spine: This is the core enablement path that turns one trusted remote node into a live consumer of the Electron browser.
- Why This Spine Span Is Long Enough: It starts with explicit user action, crosses Electron auth issuance and remote server registration boundaries, and ends at the remote node gaining live browser capability.

### Goal

Pair one specific remote node so it receives a time-bounded bridge descriptor and the remote server activates browser capability without restart.

### Preconditions

- Remote browser sharing is enabled in Electron settings.
- Browser bridge listener mode corresponding to those settings is active.
- User selected a configured remote node.

### Expected Outcome

- Electron issues a node-scoped descriptor.
- Remote server stores a runtime binding.
- Browser tools become live on that remote node.
- Node pairing state becomes `paired`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/settings/RemoteBrowserSharingPanel.vue:onPairNode(nodeId)
├── autobyteus-web/stores/nodeStore.ts:getNodeById(nodeId)
├── autobyteus-web/electron/preload.ts:issueRemoteBrowserBridgeDescriptor(nodeId) [ASYNC]
├── autobyteus-web/electron/browser/register-browser-pairing-ipc-handlers.ts:issueRemoteBrowserBridgeDescriptor(nodeId) [ASYNC]
│   ├── autobyteus-web/electron/browser/browser-pairing-state-controller.ts:issueRemotePairing(nodeId) [ASYNC]
│   │   ├── autobyteus-web/electron/browser/remote-browser-sharing-settings-store.ts:getSnapshot() [STATE][IO]
│   │   ├── autobyteus-web/electron/browser/browser-runtime.ts:getRemoteBridgeEndpoint() [STATE]
│   │   ├── autobyteus-web/electron/browser/browser-bridge-auth-registry.ts:issueRemoteNodeBinding(nodeId, advertisedHost, bridgePort) [STATE]
│   │   ├── autobyteus-web/electron/nodeRegistryStore.ts:updateBrowserPairingStatus(nodeId, "pairing", expiresAt) [STATE][IO]
│   │   └── autobyteus-web/electron/browser/browser-pairing-state-controller.ts:scheduleExpiry(nodeId, expiresAt) [STATE]
│   └── autobyteus-web/electron/browser/register-browser-pairing-ipc-handlers.ts:returnDescriptor(...)
├── autobyteus-web/utils/nodeRemoteBrowserPairingClient.ts:registerRemoteBrowserBridge(node.baseUrl, descriptor) [ASYNC][IO]
├── autobyteus-server-ts/src/api/graphql/types/remote-browser-bridge.ts:registerRemoteBrowserBridge(input) [ASYNC]
│   └── autobyteus-server-ts/src/agent-tools/browser/runtime-browser-bridge-registration-service.ts:registerBinding(input) [STATE]
│       ├── autobyteus-server-ts/src/agent-tools/browser/runtime-browser-bridge-registration-service.ts:scheduleExpiry(input.expiresAt) [STATE]
│       └── autobyteus-server-ts/src/agent-tools/browser/browser-tool-registry-sync.ts:syncWithEffectiveSupport() [STATE]
│           └── autobyteus-server-ts/src/agent-tools/browser/register-browser-tools.ts:registerBrowserTools()
└── autobyteus-web/electron/browser/browser-pairing-state-controller.ts:markPairingRegistered(nodeId) [ASYNC]
    ├── autobyteus-web/electron/nodeRegistryStore.ts:updateBrowserPairingStatus(nodeId, "paired", expiresAt) [STATE][IO]
    └── autobyteus-web/stores/nodeStore.ts:syncNodesFromRegistryUpdate(...) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if the paired node is also the current window node
autobyteus-web/components/settings/RemoteBrowserSharingPanel.vue:onPairNode(nodeId)
├── autobyteus-web/stores/toolManagementStore.ts:fetchLocalToolsGroupedByCategory() [ASYNC][IO]
└── autobyteus-web/stores/agentDefinitionOptionsStore.ts:fetchAllAvailableOptions() [ASYNC][IO]
```

```text
[ERROR] if remote registration or local post-registration confirmation fails after Electron issued a descriptor
autobyteus-web/utils/nodeRemoteBrowserPairingClient.ts:registerRemoteBrowserBridge(...) [ASYNC][IO]
└── autobyteus-web/utils/nodeRemoteBrowserPairingClient.ts:clearRemoteBrowserBridge(node.baseUrl) [BEST-EFFORT][ASYNC][IO]
    └── autobyteus-web/electron/preload.ts:revokeRemoteBrowserBridgeDescriptor(nodeId, "rejected") [ASYNC]
        └── autobyteus-web/electron/browser/register-browser-pairing-ipc-handlers.ts:revokeRemoteBrowserBridgeDescriptor(nodeId, "rejected")
            └── autobyteus-web/electron/browser/browser-pairing-state-controller.ts:revokeRemotePairing(nodeId, "rejected") [ASYNC]
                ├── autobyteus-web/electron/browser/browser-bridge-auth-registry.ts:revokeRemoteNodeBinding(nodeId) [STATE]
                └── autobyteus-web/electron/nodeRegistryStore.ts:updateBrowserPairingStatus(nodeId, "rejected") [STATE][IO]
```

### State And Data Transformations

- Node id + Electron settings snapshot -> remote bridge descriptor:
  - `baseUrl`
  - `authToken`
  - `expiresAt`
- GraphQL input -> normalized runtime binding stored on remote server.
- Pair flow -> node registry status transitions from `unpaired` to `pairing` to `paired`, while retaining the shared `expiresAt`.

### Observability And Debug Points

- Logs emitted at:
  - descriptor issuance
  - remote registration success/failure
  - node status transition to `paired` / `rejected`
- Metrics/counters updated at:
  - optional pair-success / pair-failure counters later
- Tracing spans (if any):
  - none required for first delivery

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- Whether pair-on-add should be a checkbox in the add form or only a post-add action does not change the runtime path after `onPairNode(...)`.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-003 [Browser Tool Advertisement Without Restart]

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `BrowserPairingStateController`
- Why This Use Case Matters To This Spine: Pairing must change not only execution-time support but also the remote node’s live tool advertisement/configuration surfaces.
- Why This Spine Span Is Long Enough: It starts at pair completion and ends at the remote agent-definition form seeing browser tools without restarting the remote server.

### Goal

Make browser tool names selectable or refreshable on a paired remote node without server restart.

### Preconditions

- Pair mutation has succeeded on the remote server.
- Current or next UI query targets that remote node.

### Expected Outcome

- Browser tools appear in grouped local tool queries and available-tool-name queries on the running remote node.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/stores/toolManagementStore.ts:fetchLocalToolsGroupedByCategory() [ASYNC][IO]
├── autobyteus-server-ts/src/api/graphql/types/tool-management.ts:toolsGroupedByCategory(origin=LOCAL) [ASYNC]
│   └── autobyteus-ts/src/tools/registry/tool-registry.ts:getToolsGroupedByCategory(origin=LOCAL) [STATE]
└── autobyteus-web/components/agents/AgentDefinitionForm.vue:toolSource(computed) [STATE]

[ENTRY] autobyteus-web/stores/agentDefinitionOptionsStore.ts:fetchAllAvailableOptions() [ASYNC][IO]
├── autobyteus-server-ts/src/api/graphql/types/agent-customization-options.ts:availableToolNames() [ASYNC]
│   └── autobyteus-ts/src/tools/registry/tool-registry.ts:listToolNames() [STATE]
└── autobyteus-web/components/agents/AgentDefinitionForm.vue:getComponentSource("tool_names") [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if the current window is not the paired node window
autobyteus-web/components/settings/NodeManager.vue:onPairNode(nodeId)
└── autobyteus-web/stores/nodeStore.ts:updateBrowserPairingStatus(nodeId, "paired") [STATE][IO]
# remote tool advertisement becomes visible on the next remote-node query instead of immediate local refresh
```

```text
[ERROR] if browser tools were not registered despite pair success
autobyteus-server-ts/src/agent-tools/browser/browser-tool-registry-sync.ts:syncWithEffectiveSupport()
└── autobyteus-web/stores/toolManagementStore.ts:fetchLocalToolsGroupedByCategory() [ASYNC][IO]
    └── autobyteus-web/components/settings/NodeManager.vue:setBrowserPairingError(nodeId, "tool_advertisement_out_of_sync") [STATE]
```

### State And Data Transformations

- Runtime binding presence -> browser tool definitions present in `defaultToolRegistry`.
- GraphQL tool query result -> grouped tag list for the agent-definition form.

### Observability And Debug Points

- Logs emitted at:
  - runtime register/unregister of browser tools
  - advertisement refresh failures
- Metrics/counters updated at:
  - none required for first delivery
- Tracing spans (if any):
  - none required

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None blocking; the chosen design already keeps advertisement aligned with live support.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-004 [Execute Browser Work From Paired Remote Agent]

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `BrowserToolService`
- Why This Use Case Matters To This Spine: This is the user-visible positive path that justifies the feature.
- Why This Spine Span Is Long Enough: It starts at remote agent bootstrap, crosses tool exposure and bridge transport boundaries, and ends at Electron browser execution.

### Goal

Allow a paired remote node to execute browser operations through the Electron-owned browser shell when the agent definition explicitly enables those browser tools.

### Preconditions

- Remote node currently has a valid runtime browser binding.
- Agent definition includes the required browser `toolNames`.
- Browser bridge token is still valid on Electron.

### Expected Outcome

- Codex or other browser-capable runtime exposes the configured browser tools.
- Browser requests execute successfully through the bridge.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:bootstrapInternal(...)
├── autobyteus-server-ts/src/agent-execution/shared/configured-agent-tool-exposure.ts:resolveConfiguredAgentToolExposure(...)
├── autobyteus-server-ts/src/agent-execution/backends/codex/browser/build-browser-dynamic-tool-registrations.ts:buildBrowserDynamicToolRegistrationsForEnabledToolNames(...) [STATE]
│   └── autobyteus-server-ts/src/agent-tools/browser/browser-tool-service.ts:isBrowserSupported()
│       └── autobyteus-server-ts/src/agent-tools/browser/browser-bridge-config-resolver.ts:resolve() [STATE]
├── autobyteus-server-ts/src/agent-tools/browser/open-tab.ts:openTab(...) [ASYNC]
│   └── autobyteus-server-ts/src/agent-tools/browser/browser-tool-service.ts:openTab(...) [ASYNC]
│       ├── autobyteus-server-ts/src/agent-tools/browser/browser-bridge-config-resolver.ts:resolveOrThrow() [STATE]
│       └── autobyteus-server-ts/src/agent-tools/browser/browser-bridge-client.ts:openTab(...) [ASYNC][IO]
│           └── autobyteus-server-ts/src/agent-tools/browser/browser-bridge-client.ts:post("/browser/open", ...) [ASYNC][IO]
├── autobyteus-web/electron/browser/browser-bridge-server.ts:handleRequest(...) [ASYNC][IO]
│   ├── autobyteus-web/electron/browser/browser-bridge-auth-registry.ts:authorize(headers) [STATE]
│   └── autobyteus-web/electron/browser/browser-tab-manager.ts:openSession(...) [ASYNC][STATE]
└── autobyteus-web/electron/browser/browser-shell-controller.ts:broadcastSnapshot(...) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if the remote runtime is not Codex but still uses local browser tools
autobyteus-server-ts/src/agent-tools/browser/open-tab.ts:openTab(...)
└── autobyteus-server-ts/src/agent-tools/browser/browser-tool-service.ts:openTab(...) [ASYNC]
```

```text
[ERROR] if Electron rejects the token or the bridge is unreachable
autobyteus-server-ts/src/agent-tools/browser/browser-bridge-client.ts:post(...) [ASYNC][IO]
└── autobyteus-server-ts/src/agent-tools/browser/browser-tool-service.ts:openTab(...) [ERROR]
    └── browser_unsupported_in_current_environment / browser_bridge_unavailable error payload
```

### State And Data Transformations

- Agent definition `toolNames` -> enabled browser tool names.
- Runtime binding record -> concrete HTTP bridge client.
- Browser open request payload -> Electron browser session state and shell snapshot.

### Observability And Debug Points

- Logs emitted at:
  - dynamic tool exposure decisions
  - bridge client request failures
  - Electron bridge auth failures
  - browser tab/session creation
- Metrics/counters updated at:
  - optional browser-request success/failure counters later
- Tracing spans (if any):
  - remote browser tool execution span
  - Electron browser bridge request span

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None blocking in the chosen design.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `No`
- Error Path: `Covered`

## Use Case: UC-005 [Unpair Or Expire Access]

### Spine Context

- Spine ID(s): `DS-003`, `DS-004`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `RuntimeBrowserBridgeRegistrationService`
- Why This Use Case Matters To This Spine: Security requires that revocation and timed expiry disable both tool advertisement and later execution.
- Why This Spine Span Is Long Enough: It starts at user revoke or timer expiry, crosses both server and Electron authority boundaries, and ends at later browser denial.

### Goal

Disable remote browser capability when a user unpairs a node or when its binding expires, while keeping Electron node status aligned with the same expiry deadline.

### Preconditions

- Remote node currently has an active runtime browser binding or a previously paired Electron token.

### Expected Outcome

- Remote node no longer advertises browser tools once pairing is inactive.
- Electron node status becomes `revoked` or `expired` without waiting for later manual refresh.
- Later browser execution attempts fail safely.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/settings/RemoteBrowserSharingPanel.vue:onUnpairNode(nodeId)
├── autobyteus-web/utils/nodeRemoteBrowserPairingClient.ts:clearRemoteBrowserBridge(node.baseUrl) [ASYNC][IO]
├── autobyteus-server-ts/src/api/graphql/types/remote-browser-bridge.ts:clearRemoteBrowserBridge() [ASYNC]
│   └── autobyteus-server-ts/src/agent-tools/browser/runtime-browser-bridge-registration-service.ts:clearBinding("manual_revoke") [STATE]
│       ├── autobyteus-server-ts/src/agent-tools/browser/runtime-browser-bridge-registration-service.ts:cancelExpiryTimer() [STATE]
│       └── autobyteus-server-ts/src/agent-tools/browser/browser-tool-registry-sync.ts:syncWithEffectiveSupport() [STATE]
│           └── autobyteus-server-ts/src/agent-tools/browser/browser-tool-registry-sync.ts:unregisterBrowserTools() [STATE]
└── autobyteus-web/electron/preload.ts:revokeRemoteBrowserBridgeDescriptor(nodeId, "revoked") [ASYNC]
    └── autobyteus-web/electron/browser/register-browser-pairing-ipc-handlers.ts:revokeRemoteBrowserBridgeDescriptor(nodeId, "revoked")
        └── autobyteus-web/electron/browser/browser-pairing-state-controller.ts:revokeRemotePairing(nodeId, "revoked") [ASYNC]
            ├── autobyteus-web/electron/browser/browser-pairing-state-controller.ts:cancelExpiry(nodeId) [STATE]
            ├── autobyteus-web/electron/browser/browser-bridge-auth-registry.ts:revokeRemoteNodeBinding(nodeId) [STATE]
            ├── autobyteus-web/electron/nodeRegistryStore.ts:updateBrowserPairingStatus(nodeId, "revoked") [STATE][IO]
            └── autobyteus-web/stores/nodeStore.ts:syncNodesFromRegistryUpdate(...) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if the user removes a paired node instead of explicitly unpairing first
[ENTRY] autobyteus-web/components/settings/NodeManager.vue:onRemoveRemoteNode(nodeId)
├── autobyteus-web/components/settings/RemoteBrowserSharingPanel.vue:clearRemoteBrowserBridge(node.baseUrl) [BEST-EFFORT][ASYNC][IO]
└── autobyteus-web/electron/main.ts:applyNodeRegistryChange({ type: "remove", nodeId }) [ASYNC]
    ├── autobyteus-web/electron/browser/browser-pairing-state-controller.ts:handleNodeRemoval(nodeId) [ASYNC]
    │   ├── autobyteus-web/electron/browser/browser-pairing-state-controller.ts:cancelExpiry(nodeId) [STATE]
    │   └── autobyteus-web/electron/browser/browser-bridge-auth-registry.ts:revokeRemoteNodeBinding(nodeId) [STATE]
    ├── autobyteus-web/electron/main.ts:closeNodeWindowIfOpen(nodeId) [STATE]
    └── autobyteus-web/electron/main.ts:commitNodeRegistrySnapshot(...) [STATE][IO]
```

```text
[FALLBACK] if the runtime binding expires instead of manual revoke
autobyteus-web/electron/browser/browser-pairing-state-controller.ts:onExpiryTimerFired(nodeId) [ASYNC]
├── autobyteus-web/electron/browser/browser-bridge-auth-registry.ts:revokeRemoteNodeBinding(nodeId) [STATE]
├── autobyteus-web/electron/nodeRegistryStore.ts:updateBrowserPairingStatus(nodeId, "expired") [STATE][IO]
└── autobyteus-web/stores/nodeStore.ts:syncNodesFromRegistryUpdate(...) [STATE]

autobyteus-server-ts/src/agent-tools/browser/runtime-browser-bridge-registration-service.ts:onExpiryTimerFired() [ASYNC]
└── autobyteus-server-ts/src/agent-tools/browser/runtime-browser-bridge-registration-service.ts:clearBinding("expired") [STATE]
    └── autobyteus-server-ts/src/agent-tools/browser/browser-tool-registry-sync.ts:syncWithEffectiveSupport() [STATE]
```

```text
[ERROR] if remote clear mutation fails but local revoke still proceeds
autobyteus-web/utils/nodeRemoteBrowserPairingClient.ts:clearRemoteBrowserBridge(...) [ASYNC][IO]
└── autobyteus-web/electron/preload.ts:revokeRemoteBrowserBridgeDescriptor(nodeId, "revoked") [ASYNC]
    └── autobyteus-web/electron/browser/browser-pairing-state-controller.ts:revokeRemotePairing(nodeId, "revoked") [ASYNC]
autobyteus-web/stores/nodeStore.ts:syncNodesFromRegistryUpdate(...) [STATE]
```

### State And Data Transformations

- Active runtime binding -> cleared binding + cancelled timer.
- Active Electron token record -> revoked token record.
- Node status -> `revoked` or `expired` from Electron-owned lifecycle state when the node still exists.
- Remove-node flow -> bridge token/timer cleanup before the node record is deleted from the registry.

### Observability And Debug Points

- Logs emitted at:
  - manual revoke
  - paired-node removal cleanup
  - expiry timer firing
  - browser tool unregister
  - remote clear failures
- Metrics/counters updated at:
  - optional revoke/expiry counters later
- Tracing spans (if any):
  - none required

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- The first delivery keeps the runtime registration mutation minimally authenticated because the intended deployment is same-host Docker and trusted home-LAN nodes explicitly added by the user. Stronger remote-mutation auth can be added later behind the same resolver boundary if the threat model expands.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-006 [Embedded Non-Regression]

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `BrowserRuntime`
- Why This Use Case Matters To This Spine: The remote feature must not disturb the existing embedded browser workflow.
- Why This Spine Span Is Long Enough: It starts at Electron bootstrap, crosses browser-runtime startup and embedded server env injection, and ends at the embedded server retaining browser capability.

### Goal

Keep the embedded Electron browser path working exactly as before, regardless of remote sharing settings.

### Preconditions

- Electron app is starting.

### Expected Outcome

- Embedded server receives loopback bridge env.
- Embedded browser tools remain available and executable.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/electron/main.ts:bootstrap() [ASYNC]
├── autobyteus-web/electron/browser/browser-runtime.ts:start() [ASYNC]
│   ├── autobyteus-web/electron/browser/browser-bridge-server.ts:start(remoteSharingSettings) [ASYNC]
│   │   └── autobyteus-web/electron/browser/browser-bridge-auth-registry.ts:issueEmbeddedBinding(loopbackBaseUrl) [STATE]
│   └── autobyteus-web/electron/server/baseServerManager.ts:setRuntimeEnvOverrides(browserRuntimeEnv) [STATE]
├── autobyteus-web/electron/server/linuxServerManager.ts:launchServerProcess() [ASYNC]
│   └── autobyteus-web/electron/server/serverRuntimeEnv.ts:buildServerRuntimeEnv(appDataDir, publicServerUrl, baseEnv, runtimeOverrides) [STATE]
└── autobyteus-server-ts/src/agent-tools/browser/register-browser-tools.ts:registerBrowserTools()
```

### Branching / Fallback Paths

```text
[FALLBACK] if remote sharing is enabled
autobyteus-web/electron/browser/browser-bridge-server.ts:start(remoteSharingSettings) [ASYNC]
└── embedded browser env still uses loopback URL while the listener binds to all interfaces
```

```text
[ERROR] if browser runtime startup fails
autobyteus-web/electron/browser/browser-runtime.ts:start() [ASYNC]
└── autobyteus-web/electron/browser/browser-runtime.ts:startBrowserRuntime(...):onStartError(...) [ERROR]
    └── autobyteus-web/electron/server/baseServerManager.ts:setRuntimeEnvOverrides({}) [STATE]
```

### State And Data Transformations

- Remote-sharing settings snapshot -> listener bind mode for browser bridge startup.
- Browser bridge startup result -> embedded env overrides using loopback base URL.

### Observability And Debug Points

- Logs emitted at:
  - browser runtime startup
  - browser bridge start address
  - embedded server env override application
  - startup failure path
- Metrics/counters updated at:
  - none required
- Tracing spans (if any):
  - none required

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None blocking.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-007 [Pairing Present But Browser ToolNames Missing]

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `CodexThreadBootstrapper`
- Why This Use Case Matters To This Spine: Pairing must not bypass the existing agent authorization model.
- Why This Spine Span Is Long Enough: It starts at agent bootstrap, crosses configured-tool exposure, and ends at the absence of browser tools in the run config.

### Goal

Ensure browser tools stay unavailable to a paired remote agent when the agent definition does not include browser `toolNames`.

### Preconditions

- Remote node has a valid runtime browser binding.
- Agent definition omits browser tool names.

### Expected Outcome

- No browser dynamic tools are exposed to Codex.
- Later browser invocation is impossible because no browser tool is present in the run.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:bootstrapInternal(...)
├── autobyteus-server-ts/src/agent-execution/shared/configured-agent-tool-exposure.ts:resolveConfiguredAgentToolExposure(agentDefinition) [STATE]
│   └── enabledBrowserToolNames = []
├── autobyteus-server-ts/src/agent-execution/backends/codex/browser/build-browser-dynamic-tool-registrations.ts:buildBrowserDynamicToolRegistrationsForEnabledToolNames([]) [STATE]
│   └── returns null
└── autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:buildThreadConfig(...dynamicTools=null) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if a stale agent definition still contains browser tool names but pairing is missing
autobyteus-server-ts/src/agent-execution/backends/codex/browser/build-browser-dynamic-tool-registrations.ts:buildBrowserDynamicToolRegistrationsForEnabledToolNames(...)
└── autobyteus-server-ts/src/agent-tools/browser/browser-tool-service.ts:isBrowserSupported()
    └── autobyteus-server-ts/src/agent-tools/browser/browser-bridge-config-resolver.ts:resolve() [STATE]
        └── returns null
```

### State And Data Transformations

- Agent definition tool list -> configured tool exposure.
- Empty browser tool subset -> `dynamicTools = null`.

### Observability And Debug Points

- Logs emitted at:
  - browser dynamic-tool exposure decisions when support or tool names are absent
- Metrics/counters updated at:
  - none required
- Tracing spans (if any):
  - none required

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None blocking.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
