# Multi-Node Window-Per-Node Runtime Simulation (Debug-Trace, Iteration v9)

## Conventions
- Frame format: `path/to/file.ts:functionName(args?)`
- Tags: `[ENTRY] [ASYNC] [STATE] [IO] [FALLBACK] [ERROR]`

## Simulation Basis
- Scope Classification: Large
- Source Artifact:
  - `/Users/normy/autobyteus_org/autobyteus-web/tickets/multi_node_window_v1_ticket/MULTI_NODE_WINDOW_V1_DESIGN.md`

## Use Case Index
1. Launch app with embedded window context.
2. Add remote node and open dedicated window.
3. Run agents concurrently in two node windows.
4. Focus existing node window instead of creating duplicate.
5. Sync node registry updates across windows.
6. Resolve simultaneous registry updates deterministically.
7. Remove remote node while its window is open.
8. Close one remote window without quitting app.
9. Quit app from any window and stop embedded server once.
10. Remote window remains usable when embedded is down.
11. Embedded-only local file/folder conveniences are guarded.
12. Bound-node readiness for definition/workspace fetches.
13. Embedded server settings/monitor surfaces are hidden in remote windows.
14. Embedded server status fanout is single-owner (no listener leak).
15. REST client routing is bound-context safe (no import-time endpoint capture).
16. Apollo error link remains active after bound-client rebuild.
17. Remote node capability probing gates unsupported features.
18. Plugin bootstrap ownership/order is deterministic and non-overlapping.
19. Remote node onboarding validates backend-generated host URL reachability.

## Iteration Status
| Iteration | Result | Reason |
| --- | --- | --- |
| v1 | Partial pass | initial concurrency model with sync/removal gaps |
| v2 | Partial pass | sync/removal fixed; binding/cache smell |
| v3 | Partial pass | immutable binding fixed; lifecycle/gating gaps |
| v4 | Partial pass | lifecycle/gating fixed; endpoint/status/settings gaps remained |
| v5 | Pass | endpoint/status/settings ownership fully covered |
| v6 | Pass | lifecycle-safe REST/Apollo client wiring + capability/contract gaps closed |
| v7 | Pass | transcription removed from scope; simulation revalidated without transcription flows |
| v8 | Pass | explicit coverage added for plugin ownership/order, conservative capability defaults, and host URL validation |
| v9 | Pass | implementation-phase boundary findings resolved (node entrypoint, shell identity, embedded-only overlay scope) |

---

## Use Case 1: Launch App with Embedded Window Context

### Primary Runtime Call Stack
```text
[ENTRY] electron/main.ts:app.whenReady() [ASYNC]
├── createNodeBoundWindow("embedded-local") [STATE][IO]
├── mapWindowToNode(windowId,nodeId) [STATE]
└── plugins/20.windowNodeBootstrap.client.ts:default() [ASYNC]
    ├── electronAPI.getWindowContext() [IO]
    ├── stores/windowNodeContextStore.ts:initializeFromWindowContext() [STATE]
    └── plugins/30.apollo.client.ts:initializeApolloForBoundNode() [STATE]
```

### Branch
```text
[FALLBACK] missing window context -> bind embedded-local
```

### Verification
- End-to-end: Yes
- SoC clean: Yes
- Boundaries clear: Yes
- Dependency flow reasonable: Yes
- Major smell: No

---

## Use Case 2: Add Remote Node and Open Dedicated Window

### Primary Runtime Call Stack
```text
[ENTRY] NodeManager.vue:onAddRemoteNode(form)
├── nodeHostValidation.validateServerHostConfiguration(form.baseUrl) [STATE]
├── nodeCapabilityProbe.probeNodeCapabilities(normalizedBaseUrl) [ASYNC][IO]
├── nodeStore.addRemoteNode(form+capabilities) [STATE]
├── electronAPI.upsertNodeRegistry(add) [ASYNC][IO]
└── electronAPI.openNodeWindow(nodeId) [ASYNC][IO]
    └── main.ts:openNodeWindowHandler(nodeId)
        ├── findExistingWindowByNodeId
        ├── [FALLBACK] createNodeBoundWindow(nodeId) [STATE][IO]
        └── focusWindow(windowId) [IO]
```

### Branch
```text
[ERROR] duplicate baseUrl -> validation error
```

### Verification
- End-to-end: Yes
- SoC clean: Yes
- Boundaries clear: Yes
- Dependency flow reasonable: Yes
- Major smell: No

---

## Use Case 3: Run Agents Concurrently in Two Node Windows

### Primary Runtime Call Stack
```text
[ENTRY] window A agentRunStore.sendUserInputAndSubscribe() [ASYNC]
├── getApolloClient() # embedded client
├── GraphQL mutate [IO]
└── AgentStreamingService.connect(embeddedAgentWs) [ASYNC][IO]

[ENTRY] window B agentRunStore.sendUserInputAndSubscribe() [ASYNC]
├── getApolloClient() # remote client
├── GraphQL mutate [IO]
└── AgentStreamingService.connect(remoteAgentWs) [ASYNC][IO]
```

### Branch
```text
[ERROR] remote ws failure handled in window B only
```

### Verification
- End-to-end: Yes
- SoC clean: Yes
- Boundaries clear: Yes
- Dependency flow reasonable: Yes
- Major smell: No

---

## Use Case 4: Focus Existing Node Window Instead of Creating Duplicate

### Primary Runtime Call Stack
```text
[ENTRY] NodeManager.vue:onFocusNode(nodeId)
└── electronAPI.openNodeWindow(nodeId) [ASYNC][IO]
    └── main.ts:openNodeWindowHandler(nodeId)
        ├── if found -> focus
        └── else -> createNodeBoundWindow
```

### Verification
- End-to-end: Yes
- SoC clean: Yes
- Boundaries clear: Yes
- Dependency flow reasonable: Yes
- Major smell: No

---

## Use Case 5: Sync Node Registry Updates Across Windows

### Primary Runtime Call Stack
```text
[ENTRY] window A registry mutation
├── electronAPI.upsertNodeRegistry(change) [ASYNC][IO]
└── main.ts:applyRegistryChange(change) [STATE]
    ├── version++ [STATE]
    └── broadcast node-registry-updated(snapshot) [IO]
        ├── window A nodeStore.applyRegistrySnapshot(snapshot) [STATE]
        └── window B nodeStore.applyRegistrySnapshot(snapshot) [STATE]
```

### Branch
```text
[FALLBACK] missed event -> nodeStore.refreshRegistrySnapshot() [ASYNC][IO]
```

### Verification
- End-to-end: Yes
- SoC clean: Yes
- Boundaries clear: Yes
- Dependency flow reasonable: Yes
- Major smell: No

---

## Use Case 6: Resolve Simultaneous Registry Updates Deterministically

### Primary Runtime Call Stack
```text
[ENTRY] window A + B update concurrently [ASYNC]
└── main.ts:serializeRegistryMutationQueue() [STATE]
    ├── apply #1 -> v41
    ├── apply #2 -> v42
    └── broadcast snapshots in order [IO]
        └── nodeStore ignores snapshot.version <= localVersion [STATE]
```

### Verification
- End-to-end: Yes
- SoC clean: Yes
- Boundaries clear: Yes
- Dependency flow reasonable: Yes
- Major smell: No

---

## Use Case 7: Remove Remote Node While Its Window Is Open

### Primary Runtime Call Stack
```text
[ENTRY] NodeManager.vue:onRemoveRemoteNode(nodeId)
├── electronAPI.upsertNodeRegistry(remove) [ASYNC][IO]
└── main.ts:removeRemoteNodeHandler(nodeId)
    ├── closeNodeWindowIfOpen(nodeId) [IO]
    ├── removeFromRegistry(nodeId) [STATE]
    └── broadcast snapshot [IO]
```

### Branch
```text
[ERROR] remove embedded-local -> reject
```

### Verification
- End-to-end: Yes
- SoC clean: Yes
- Boundaries clear: Yes
- Dependency flow reasonable: Yes
- Major smell: No

---

## Use Case 8: Close One Remote Window Without Quitting App

### Primary Runtime Call Stack
```text
[ENTRY] user closes remote window [IO]
└── main.ts:onBrowserWindowClosed(windowId)
    ├── remove mapping [STATE]
    └── app stays alive if other windows remain
```

### Verification
- End-to-end: Yes
- SoC clean: Yes
- Boundaries clear: Yes
- Dependency flow reasonable: Yes
- Major smell: No

---

## Use Case 9: Quit App from Any Window and Stop Embedded Server Once

### Primary Runtime Call Stack
```text
[ENTRY] app quit action [IO]
└── main.ts:before-quit/app-quit handler
    ├── set isAppQuitting=true [STATE]
    ├── notify windows app-quitting [IO]
    └── main.ts:will-quit [ASYNC]
        └── serverManager.stopServer() once [IO]
```

### Verification
- End-to-end: Yes
- SoC clean: Yes
- Boundaries clear: Yes
- Dependency flow reasonable: Yes
- Major smell: No

---

## Use Case 10: Remote Window Remains Usable When Embedded Is Down

### Primary Runtime Call Stack
```text
[ENTRY] embedded server failure
├── serverStore.status=error (embedded lifecycle) [STATE]
└── app.vue gating
    ├── embedded window -> show overlay
    └── remote window -> no embedded overlay, stays interactive

[ENTRY] remote fetch/stream
└── windowNodeContextStore.waitForBoundBackendReady() -> remote health path [IO]
```

### Verification
- End-to-end: Yes
- SoC clean: Yes
- Boundaries clear: Yes
- Dependency flow reasonable: Yes
- Major smell: No

---

## Use Case 11: Embedded-Only Local File/Folder Conveniences Are Guarded

### Primary Runtime Call Stack
```text
[ENTRY] WorkspaceSelector.vue:handleBrowse()
└── isEmbeddedWindow()
    ├── embedded -> electronAPI.showFolderDialog() [IO]
    └── remote -> block, manual path only

[ENTRY] ContextFilePathInputArea/AgentUserInputTextArea native drop
└── isEmbeddedWindow()
    ├── embedded -> preload getPathForFile [IO]
    └── remote -> block native local-path insertion

[ENTRY] fileExplorer._openFileWithMode()
└── isEmbeddedWindow()
    ├── embedded+absolute -> local-file/readLocalTextFile [IO]
    └── remote -> workspace/REST path flow
```

### Verification
- End-to-end: Yes
- SoC clean: Yes
- Boundaries clear: Yes
- Dependency flow reasonable: Yes
- Major smell: No

---

## Use Case 12: Bound-Node Readiness for Definition/Workspace Fetches

### Primary Runtime Call Stack
```text
[ENTRY] agentDefinitionStore.fetchAllAgentDefinitions()
└── windowNodeContextStore.waitForBoundBackendReady() [ASYNC]
    └── getApolloClient().query(GetAgentDefinitions) [IO]

[ENTRY] agentTeamDefinitionStore.fetchAllAgentTeamDefinitions()
└── waitForBoundBackendReady() -> query [ASYNC][IO]

[ENTRY] workspaceStore.fetchAllWorkspaces()
└── waitForBoundBackendReady() -> query [ASYNC][IO]
```

### Branch
```text
[ERROR] bound node unreachable -> local error in current window; other windows unaffected
```

### Verification
- End-to-end: Yes
- SoC clean: Yes
- Boundaries clear: Yes
- Dependency flow reasonable: Yes
- Major smell: No

---

## Use Case 13: Embedded Server Settings/Monitor Surfaces Hidden in Remote Windows

### Primary Runtime Call Stack
```text
[ENTRY] pages/settings.vue render
└── windowNodeContextStore.isEmbeddedWindow()
    ├── embedded -> show server-settings/server-status sections
    └── remote -> hide or disable embedded server sections

[ENTRY] components/server/* mount guards
└── mount only when isEmbeddedWindow is true
```

### Verification
- End-to-end: Yes
- SoC clean: Yes
- Boundaries clear: Yes
- Dependency flow reasonable: Yes
- Major smell: No

---

## Use Case 14: Embedded Server Status Fanout Is Single-Owner (No Listener Leak)

### Primary Runtime Call Stack
```text
[ENTRY] main.ts bootstrap
├── serverStatusManager.on('status-change', fanoutHandler) # installed once
└── fanoutHandler(status)
    └── send status to relevant windows [IO]

[ENTRY] window close
└── no extra serverStatusManager listener remains attached
```

### Verification
- End-to-end: Yes
- SoC clean: Yes
- Boundaries clear: Yes
- Dependency flow reasonable: Yes
- Major smell: No

---

## Use Case 15: REST Client Routing Is Bound-Context Safe

### Primary Runtime Call Stack
```text
[ENTRY] mediaLibraryStore.fetchMedia()
└── apiService.get("/media")
    ├── windowNodeContextStore.getBoundEndpoints().rest
    ├── resolveAxiosForBoundRestBase() [STATE]
    └── axios.request(...) [IO]

[ENTRY] fileUploadStore.uploadFile()
└── apiService.post("/upload-file", formData) -> bound REST base [IO]
```

### Branch
```text
[FALLBACK] context not initialized yet -> throw deterministic bootstrap error (no hidden localhost fallback)
```

### Verification
- End-to-end: Yes
- SoC clean: Yes
- Boundaries clear: Yes
- Dependency flow reasonable: Yes
- Major smell: No

---

## Use Case 16: Apollo Error Link Survives Bound-Client Rebuild

### Primary Runtime Call Stack
```text
[ENTRY] node context bootstrap / node window creation
└── plugins/30.apollo.client.ts:buildBoundApolloClient()
    ├── createHttpLink/createWsLink [STATE]
    ├── attachUiErrorLink(client) [STATE]
    └── registerClientInNuxtApp(client) [STATE]

[ENTRY] client rebuild on context refresh
└── attachUiErrorLink(newClient) [STATE]
```

### Branch
```text
[FALLBACK] marker already present on client -> skip duplicate link wiring
```

### Verification
- End-to-end: Yes
- SoC clean: Yes
- Boundaries clear: Yes
- Dependency flow reasonable: Yes
- Major smell: No

---

## Use Case 17: Remote Node Capability Probe Gates Unsupported Features

### Primary Runtime Call Stack
```text
[ENTRY] nodeStore.addRemoteNode(baseUrl)
├── probeNodeCapabilities(baseUrl) [ASYNC][IO]
│   ├── REST /rest/health check
│   └── optional WS capability probes
├── default probe state = unknown [STATE]
└── persist NodeProfile.capabilities + probeState [STATE]

[ENTRY] terminal/file-explorer module mount
└── if capability flag is false -> disable feature + show unsupported message
```

### Branch
```text
[ERROR] capability probe timeout/degraded response -> keep probeState as unknown/degraded; keep node usable with conservative feature disable
```

### Verification
- End-to-end: Yes
- SoC clean: Yes
- Boundaries clear: Yes
- Dependency flow reasonable: Yes
- Major smell: No

---

## Use Case 18: Plugin Bootstrap Ownership/Order Is Deterministic

### Primary Runtime Call Stack
```text
[ENTRY] Nuxt client bootstrap [ASYNC]
├── plugins/10.serverStore.client.ts:default() [STATE]
├── plugins/20.windowNodeBootstrap.client.ts:default() [STATE]
└── plugins/30.apollo.client.ts:default() [STATE]
    ├── buildBoundApolloClient() [STATE]
    └── attachUiErrorLink(client) [STATE]
```

### Branch
```text
[ERROR] legacy overlapping plugin accidentally left enabled -> startup diagnostic fails in test/dev; plugin removed/merged before release
```

### Verification
- End-to-end: Yes
- SoC clean: Yes
- Boundaries clear: Yes
- Dependency flow reasonable: Yes
- Major smell: No

---

## Use Case 19: Remote Onboarding Host URL Validation

### Primary Runtime Call Stack
```text
[ENTRY] NodeManager.vue:onAddRemoteNode(form)
├── nodeHostValidation.validateServerHostConfiguration(form.baseUrl) [STATE]
│   ├── normalize node base URL [STATE]
│   ├── inspect generated-url host/port hints [STATE]
│   └── return warnings/errors [STATE]
├── nodeCapabilityProbe.probeNodeCapabilities(normalizedBaseUrl) [ASYNC][IO]
│   └── fetch health endpoint with timeout [IO]
├── nodeStore.addRemoteNode(form + probe result) [STATE]
└── electronAPI.openNodeWindow(nodeId) [ASYNC][IO]
```

### Branch
```text
[FALLBACK] host validation warning -> allow save with explicit warning banner
[ERROR] invalid base URL format or hard validation failure -> reject add-node
```

### Verification
- End-to-end: Yes
- SoC clean: Yes
- Boundaries clear: Yes
- Dependency flow reasonable: Yes
- Major smell: No

---

## Simulation Cleanliness Gate
| Check | Result | Notes |
| --- | --- | --- |
| Use case is fully achievable end-to-end | Pass | 19 use cases covered |
| Separation of concerns is clean per file/module | Pass | lifecycle, routing, status fanout, and UX gating are separated |
| Boundaries and API ownership are clear | Pass | main process + context store are canonical owners |
| Dependency flow is reasonable | Pass | no required cyclic ownership |
| No major structure/design smell in call stack | Pass | v9 closes implementation-phase node-entrypoint/shell-identity boundary gaps |

Decision: Go for implementation.
