# IMP-14 AC-901 / AR-902: every remaining `nodeId` in autobyteus-web

- commit: cb37d82fab (rerun at HEAD after Step 6; the same counts as at Step 4 `32cf99830e`)
- environment: macOS Darwin 25.5; date 2026-10-24

Scope: `autobyteus-web/electron/`, `stores/`, `utils/`, `services/`, `components/`, excluding specs. Command:
`grep -rnw nodeId electron stores utils services components --include=*.ts --include=*.vue | grep -v "__tests__\|\.spec\.\|\.test\."`
Each remaining `nodeId` is the node's ID (`srv_…`).

| File | Count | Meaning |
| --- | --- | --- |
| `electron/application/electronApplication.ts` | 2 | the `add` change's candidate entry's `nodeId` (the node's ID it learned), validated with `isNodeId` |
| `electron/nodeRegistryStore.ts` | 5 | `NodeEntry.nodeId` read from the file; the `identify` change's `nodeId` |
| `stores/nodeStore.ts` | 6 | `addRemoteNode({nodeId})`, `identifyNode(entryId, nodeId)`, `NodeEntry.nodeId` |
| `stores/nodeListStore.ts` | 24 | a row's node ID; `entry.nodeId`; peers' and probes' `nodeId`; the change plan's `nodeId` |
| `stores/nodeRowStatus.ts` | 6 | `NodeRow.nodeId`; peers' `nodeId` compared with this node's ID |
| `stores/phoneAccessStore.ts` | 2 | `nodeId` of the status answer and the management answer (same-node check) |
| `stores/remoteCollaborationStore.ts` | 14 | `PeerNode.nodeId` and the peer GraphQL arguments |
| `stores/remoteCollaborationOffersStore.ts` | 11 | offers keyed by the peer's node ID |
| `stores/remoteRunsStore.ts` | 2 | a remote run's node (`execution.node_id`) |
| `utils/nodeIdentityProbe.ts` | 4 | the status answer's `nodeId` |
| `services/nodeCollaboration/nodeChangePlan.ts` | 2 | target's and this node's node ID |
| `services/nodeCollaboration/nodeCollaborationApi.ts` | 10 | peer GraphQL arguments (`nodeId`) |
| `services/nodeCollaboration/nodeCollaborationConnector.ts` | 29 | peers' and the plan's node IDs |
| `services/nodeCollaboration/windowNodeCollaborationConnector.ts` | 4 | peer operations by node ID |
| `components/settings/nodes/NodeConnectionDetails.vue` | 2 | the row's node ID shown as "Node ID"; a peer's `nodeId` |
| `components/settings/nodes/NodeRow.vue` | 1 | the row's node ID (the switch needs it) |

## Other identifiers that contain "nodeId"

| Identifier | Meaning | Note |
| --- | --- | --- |
| `isNodeId`, `thisNodeId`, `nodeIdentityProbe` | the node's ID | consistent |
| `treeNodeId` | a file-tree node's ID in the file explorer (`utils/fileExplorer/contextMenu.ts`, `FileItem.vue`, `useFileExplorerContextActions.ts`) | renamed from `nodeId` in this step: a third meaning the design inventory did not list |
| `nodeIdToNode`, `createNodeIdToNodeDictionary` | the file explorer's tree-node map (`stores/fileExplorer.ts`, utils) | not the `nodeId` word; a file-tree "node". Left as is; noted for review |
| (`sourceNodeId`, `boundSourceNodeId`) | Memory Sync's source identity | gone: renamed to `sourceId` / `boundSourceId` by Step 5b (SM-2 … SM-5) |

## Entry meaning, renamed in this step

`WindowNodeContext.entryId`, the registry changes' `entryId`, `windowNodeContextStore.entryId`, `MobileNodeSession.entryId`,
the Electron carriers (`createNodeBoundWindow(entryId)`, `openNodeWindow(entryId)`, `ensureNodeExists(entryId)`, IPC
handlers, `preload.openNodeWindow/focusNodeWindow`, `getEntryIdForShell`, `getByEntryId`, `closeNodeWindow(entryId)`,
`WorkspaceShellWindow.entryId`, `attachRendererConsoleDiagnostics({entryId})`, log text `entryId=`), `nodeStore`
`getEntryById` / `getEntryBaseUrl` / `removeRemoteNode(entryId)` / `renameNode(entryId)`, the node list's `entryIds`
(was `desktopIds`), the terminal cache scope's `entryId`, the projects panel's `node.entryId`.
