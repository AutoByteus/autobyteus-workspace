# Simulated Runtime Call Stacks (Debug-Trace Style) - Iteration v3

## Conventions
- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint
  - `[ASYNC]` async boundary
  - `[STATE]` in-memory mutation
  - `[IO]` network/storage IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path

## Simulation Basis
- Scope Classification: `Large`
- Source Artifact:
  - `/Users/normy/autobyteus_org/autobyteus-web/tickets/multi_node_v1_ticket/MULTI_NODE_V1_DESIGN.md`
- Referenced Sections:
  - Additional v3 Inspection Findings
  - Architecture Overview (Revised)
  - Dependency Flow And Boundary Rules (v3)

## Iteration History

| Iteration | Result | Reason |
| --- | --- | --- |
| v1 | Fail | embedded status and static endpoint coupling still leaked into multi-node flow |
| v2 | Mostly pass | core flow clean, but deeper audit found lifecycle/cache/path edge smells |
| v3 | Pass | added cache-reset contract, path-branch guard by nodeType, Apollo lifecycle ownership unification, deterministic bootstrap order |

## Use Case Index
- Use Case 1: Deterministic Boot and Readiness
- Use Case 2: Add Remote Node and Switch Active Node
- Use Case 3: Active-Node Routing for Agent/Team/Application
- Use Case 4: Workspace/File UX by `nodeType`
- Use Case 5: Node Switch Cleanup and Cache Hygiene
- Use Case 6: Embedded Failure While Remote Node Is Active

---

## Use Case 1: Deterministic Boot and Readiness

### Goal
Boot with deterministic plugin ordering and readiness from active-node runtime state.

### Primary Runtime Call Stack
```text
[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/plugins/10.embeddedServerBootstrap.client.ts:default() [ASYNC]
└── /Users/normy/autobyteus_org/autobyteus-web/stores/serverStore.ts:initialize() [STATE]

[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/plugins/20.nodeBootstrap.client.ts:default() [ASYNC]
├── /Users/normy/autobyteus_org/autobyteus-web/stores/nodeStore.ts:initializeRegistry() [STATE]
│   ├── localStorage:getItem("autobyteus.node_registry.v1") [IO]
│   └── [FALLBACK] seedEmbeddedNodeIfMissing() [STATE]
├── /Users/normy/autobyteus_org/autobyteus-web/stores/nodeStore.ts:probeActiveNodeHealth() [ASYNC][IO]
└── /Users/normy/autobyteus_org/autobyteus-web/plugins/30.apollo.client.ts:initializeApolloForActiveNode() [STATE]

/Users/normy/autobyteus_org/autobyteus-web/app.vue:computed(isAppReady)
└── nodeStore.activeNodeRuntime.status === "ready"
```

### Branching / Fallback Paths
```text
[FALLBACK] invalid persisted registry
nodeStore.initializeRegistry()
└── resetToEmbeddedSeed() [STATE]
```

```text
[ERROR] active node probe fails
nodeStore.probeActiveNodeHealth()
└── runtimeStatus="unreachable" [STATE]
    └── show node-scoped error UI; do not reuse embedded blocking overlay when active node is remote
```

### Design Smells / Gaps
- None after v3 ordering and readiness rules.

### Verification Checklist
- End-to-end outcome achieved: Yes
- Separation of concerns clean: Yes
- Boundaries/API ownership clear: Yes
- Dependency flow reasonable: Yes
- Major smell detected: No

---

## Use Case 2: Add Remote Node and Switch Active Node

### Goal
Switch to remote node safely with clean lifecycle boundaries.

### Primary Runtime Call Stack
```text
[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/components/settings/NodeManager.vue:onSaveNode()
├── /Users/normy/autobyteus_org/autobyteus-web/stores/nodeStore.ts:addNode(profile) [STATE]
│   └── localStorage:setItem("autobyteus.node_registry.v1", payload) [IO]
└── /Users/normy/autobyteus_org/autobyteus-web/stores/nodeStore.ts:setActiveNode(nodeId) [ASYNC]
    ├── beginNodeSwitch(oldNodeId, newNodeId) [STATE]
    ├── runRegisteredSwitchHooks("beforeSwitch") [STATE]
    ├── /Users/normy/autobyteus_org/autobyteus-web/plugins/30.apollo.client.ts:clearAndRebuildForNode(newNodeId) [ASYNC][STATE]
    ├── probeActiveNodeHealth(newNodeId) [ASYNC][IO]
    ├── persistRegistry() [IO]
    └── completeNodeSwitch(newNodeId) [STATE]
```

### Branching / Fallback Paths
```text
[ERROR] target node unreachable
nodeStore.setActiveNode(nodeId)
└── runtimeStatus="unreachable" (selection preserved for retry)
```

```text
[FALLBACK] active node removed
nodeStore.removeNode(nodeId)
└── activateEmbeddedSeedNode() [STATE]
```

### Design Smells / Gaps
- None after adding explicit switch hook lifecycle.

### Verification Checklist
- End-to-end outcome achieved: Yes
- Separation of concerns clean: Yes
- Boundaries/API ownership clear: Yes
- Dependency flow reasonable: Yes
- Major smell detected: No

---

## Use Case 3: Active-Node Routing for Agent/Team/Application

### Goal
All GraphQL and stream traffic uses active node endpoints without stale client/link behavior.

### Primary Runtime Call Stack
```text
[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/stores/agentRunStore.ts:sendUserInputAndSubscribe()
├── /Users/normy/autobyteus_org/autobyteus-web/utils/apolloClient.ts:getApolloClient()
├── ApolloClient.mutate(SendAgentUserInput) [IO]
└── /Users/normy/autobyteus_org/autobyteus-web/stores/agentRunStore.ts:connectToAgentStream(agentId)
    ├── /Users/normy/autobyteus_org/autobyteus-web/stores/nodeStore.ts:getActiveEndpoints().agentWs
    └── AgentStreamingService.connect(agentId, endpoint) [ASYNC][IO]

[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/stores/agentTeamRunStore.ts:connectToTeamStream(teamId)
└── nodeStore.getActiveEndpoints().teamWs -> TeamStreamingService.connect(...) [ASYNC][IO]

[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/stores/applicationRunStore.ts:connectToApplicationStream(instanceId)
└── nodeStore.getActiveEndpoints().teamWs -> TeamStreamingService.connect(...) [ASYNC][IO]
```

### Branching / Fallback Paths
```text
[ERROR] GraphQL network failure
store action catches -> writes user-visible error state [STATE]
```

```text
[ERROR] WS connect failure
stream service error callback -> node-scoped UI error store [STATE]
```

### Design Smells / Gaps
- None after Apollo lifecycle ownership is centralized in one plugin.

### Verification Checklist
- End-to-end outcome achieved: Yes
- Separation of concerns clean: Yes
- Boundaries/API ownership clear: Yes
- Dependency flow reasonable: Yes
- Major smell detected: No

---

## Use Case 4: Workspace/File UX by `nodeType`

### Goal
Embedded-only local file shortcuts stay local; remote-node file paths remain server-routed.

### Primary Runtime Call Stack
```text
[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/components/workspace/config/WorkspaceSelector.vue:setup()
└── nodeStore.getActiveNode().nodeType -> embedded picker vs remote manual path

[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/stores/fileExplorer.ts:_openFileWithMode(filePath, mode, workspaceId)
├── if electron && nodeType===embedded && isAbsoluteLocalPath(filePath)
│   └── use local-file flow (electronAPI/local-file://)
└── else
    └── use active node REST/GraphQL workspace flow

[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue:artifactUrl(computed)
└── nodeStore.getActiveEndpoints().rest + workspaceId/path

[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/components/fileExplorer/viewers/HtmlPreviewer.vue:staticUrl(computed)
└── nodeStore.getActiveEndpoints().rest + workspaceId/path
```

### Branching / Fallback Paths
```text
[FALLBACK] embedded node but electronAPI unavailable
WorkspaceSelector/FileExplorer -> manual/server path mode
```

```text
[ERROR] file content/preview fetch fails
file explorer/viewers -> node-scoped error state [STATE]
```

### Design Smells / Gaps
- None after adding `nodeType===embedded` guard for local absolute-path flow.

### Verification Checklist
- End-to-end outcome achieved: Yes
- Separation of concerns clean: Yes
- Boundaries/API ownership clear: Yes
- Dependency flow reasonable: Yes
- Major smell detected: No

---

## Use Case 5: Node Switch Cleanup and Cache Hygiene

### Goal
No stale stream or stale node data survives switch.

### Primary Runtime Call Stack
```text
[ENTRY] nodeStore.setActiveNode(newNodeId) [ASYNC]
├── runRegisteredSwitchHooks("beforeSwitch") [STATE]
│   ├── agentRunStore.disconnectAllStreamsForNodeSwitch()
│   ├── agentTeamRunStore.disconnectAllStreamsForNodeSwitch()
│   ├── applicationRunStore.disconnectAllStreamsForNodeSwitch()
│   └── workspaceStore.disconnectAllFileSystemStreamsForNodeSwitch()
├── /Users/normy/autobyteus_org/autobyteus-web/plugins/30.apollo.client.ts:clearAndRebuildForNode(newNodeId) [ASYNC][STATE]
│   ├── activeClient.clearStore() [ASYNC][STATE]
│   └── buildNewClient(newEndpoints) [STATE]
├── runRegisteredSwitchHooks("afterSwitch") [STATE]
│   └── node-scoped stores reset cached domain data
└── completeNodeSwitch(newNodeId) [STATE]
```

### Branching / Fallback Paths
```text
[ERROR] one switch hook throws
nodeStore.setActiveNode()
└── catch/log + continue remaining hooks to keep cleanup complete
```

### Design Smells / Gaps
- None after explicit cleanup contract and hook phases.

### Verification Checklist
- End-to-end outcome achieved: Yes
- Separation of concerns clean: Yes
- Boundaries/API ownership clear: Yes
- Dependency flow reasonable: Yes
- Major smell detected: No

---

## Use Case 6: Embedded Failure While Remote Node Is Active

### Goal
Remote node usage remains available when embedded process fails.

### Primary Runtime Call Stack
```text
[ENTRY] /Users/normy/autobyteus_org/autobyteus-web/stores/serverStore.ts:updateServerStatus(error) [STATE]
└── /Users/normy/autobyteus_org/autobyteus-web/app.vue:computed(showEmbeddedOverlays)
    ├── if activeNode.nodeType === "embedded" -> show overlay
    └── else -> suppress blocking overlay and keep app interactive
```

### Branching / Fallback Paths
```text
[FALLBACK] user re-selects embedded node while embedded status=error
nodeStore.setActiveNode("embedded-local")
└── app enters embedded blocking flow until ready/recovered
```

### Design Smells / Gaps
- None after overlay gating depends on active node type.

### Verification Checklist
- End-to-end outcome achieved: Yes
- Separation of concerns clean: Yes
- Boundaries/API ownership clear: Yes
- Dependency flow reasonable: Yes
- Major smell detected: No

---

## Simulation Gate Result
- Decision: **Pass (v3)**
- Reason: all in-scope use cases now have clean file ownership, deterministic boundaries, and explicit lifecycle handling for edge cases found in iterative audits.
