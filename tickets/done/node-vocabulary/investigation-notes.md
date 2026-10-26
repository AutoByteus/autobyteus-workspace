# Investigation Notes — node-vocabulary (autobyteus-290)

## Investigation Meta

- Package: `node-vocabulary`; Task **autobyteus-290** (the user's direction 2026-10-24, with his correction in the Task's comment).
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-vocabulary`, branch `codex/node-vocabulary`, base `origin/personal` `c78ffb15a2`. Finalization target: `origin/personal`.
- Authorities read: `solution-designer/SKILL.md` and its updated `design-examples.md` (re-read 2026-10-24), `requirements-engineering.md`, `ticket-scope.md`, `finding-the-cause.md`, the repository's `DESIGN.md` (rules 7, 8, 9).
- Method: `Read` and `grep` over `autobyteus-server-ts/src` and `autobyteus-web` (excluding `node_modules` and generated code), with counts.

## The vocabulary rule (the user's, 2026-10-24)

- **node:** a server, with one node ID (`srv_…`).
- **remote:** where something is. Any node other than this one is remote, even a Docker node on the same machine.
- **peer:** a relationship. A remote node registered with this node (mutual registration, a pinned node ID, trust). A remote node that isn't registered is not a peer. `PeerNode`, `peers.json` and "add a peer" stay.
- **embedded local:** how the desktop started its own server. It stays (`EMBEDDED_NODE_ID = 'embedded-local'`, `nodeType: 'embedded'`, `isDesktopEmbeddedNode`).

## Where the words or the IDs are mixed

| ID | Finding | Evidence |
| --- | --- | --- |
| V-01 | **`nodeId` means two different IDs, even in one window.** In the window and desktop registry it is the desktop's own entry ID (`'embedded-local'` or a generated ID). In remote runs, peers, links and every server use, it is the node's ID (`srv_…`). | `autobyteus-web/stores/windowNodeContextStore.ts:48-83` (`nodeId` = entry ID) vs `stores/remoteRunsStore.ts:19,59` (`nodeId` = `execution.node_id`, the node's ID); `types/node.ts` `WindowNodeContext.nodeId`, `Remove/Rename/IdentifyNodeRegistryChange.nodeId` (entry ID, "`nodeId` is the desktop entry's ID") |
| V-02 | **A node's ID has two names.** In the server's identity it is `serverInstanceId` (`ServerInstanceIdentityService.getServerInstanceId`, the stored identity file, the wire field of `/rest/remote-access/status`). Everywhere else it is `nodeId`: peers, envelopes `fromNodeId`/`toNodeId`, links, `delegatedFrom`. The web uses both (`NodeProfile.serverInstanceId`, `isServerInstanceId`, `nodeIdentityProbe`). | server: 5 files with `serverInstanceId` (`remote-access/services/server-instance-identity-service.ts`, `api/rest/remote-access.ts`, `peer-client.ts`, `peer-directory.ts`, `peer-node.ts` doc); web: 19 files |
| V-03 | **"remote" or "available" names where only registered peers are meant.** | `list_available_nodes` (it lists the registered peers, unavailable ones included, and not this node); `AvailableNode`, `RemoteDiscoveryChannel`, `RemoteNodeDiscovery` (`remote-collaboration/discovery/`), `RemotePeer` (`agent-collaboration/execution/remote/remote-run-channel.ts`: a registered peer `{nodeId, name}`; "remote" + "peer" is redundant). The tool name appears in 7 server files and the docs `remote_collaboration.md`, `agent_tools.md`, `agent_communication.md` |
| V-04 | **"peer" meaning the other end of a network connection** (the connecting client's address), not a registered node. | `api/security/remote-access-local-trust.ts` (`NormalizedPeerAddress`, `normalizePeerAddress`, `isLoopbackPeerAddress`, 11 uses), `remote-access-route-policy.ts`, `remote-access-websocket-auth.ts`, `client-facing-url-resolver.ts`, `agent-tools-mcp-local-access.ts` |
| V-05 | **"peer" meaning a sibling task agent** in the run tree. | `autobyteus-web/stores/runHistoryTeamExecutionRows.ts:61` ("task-Agent leaves become peers"), e2e fixture `task-agent-peer-sidebar.page.vue` |
| V-06 | **A desktop entry field nobody reads.** `NodeProfile.isSystem` is written as `nodeType === 'embedded'` and never read. | `electron/nodeRegistryStore.ts:32,110`, `stores/nodeStore.ts:25,235`, `electron/application/electronApplication.ts:209`; no reader |
| V-08 | **"peer" meaning "a run of equal standing" in the contract itself.** "A delegated run is a peer, not a part" (`collaboration_model.md:59`, § 2.2), while § 1 defines **Peer** as a registered node. Reported by the Agent Package Creator's replay of the 191 design under Principle 15. | `autobyteus-server-ts/docs/design/collaboration_model.md:32,59` |
| V-09 | **The mobile shell's session uses `nodeId` for its own entry ID** (`MOBILE_NODE_ID`), the same V-01 confusion on mobile; it sits beside `serverInstanceId` in the same file. | `autobyteus-web/types/remoteAccess.ts:44-60` (`RemoteAccessStatus.serverInstanceId`, `MobileNodeSession.nodeId`), `stores/mobileNodeSessionStore.ts:153` |
| V-10 | **A third ID called "node id": Memory Sync's source node id** is a user-entered import identity (`autobyteus-server-ts/src/memory-sync/source/memory-sync-config-service.ts:81-98`; UI "Source node id", `autobyteus-web/localization/messages/en/memorySyncSettings.ts:29`, with the note "the source node id below is the stable import identity"), stored in the sync state and sent to the hub. It is not the node's ID. | the cited lines |
| V-07 | **Consistent already, keep:** `PeerNode`/`peers.json`/add peer; `nodeType: 'embedded' \| 'remote'` (embedded is how it started; every other entry is a remote node); the remote run chip and "remote runs"; `remote-collaboration` (the feature); `isDesktopEmbeddedNode`; GraphQL `peerNodes`, `peerNodeOffer`, `peerNodeAvailability`; server `nodeId` everywhere outside V-02. | the files named |

## Stored shapes involved (Data Migration Guideline; DESIGN.md rule 8: "Renaming code never renames a file or value on disk")

- **Server:** the identity file (field `serverInstanceId`); `peers.json` (`nodeId`, `name`, `baseUrl`, `addedAt`; consistent already); run links and `delegatedFrom` (`nodeId`; consistent already).
- **Desktop:** the node registry file (`electron/nodeRegistryStore.ts`) and the window's copy in `localStorage` (`autobyteus.node_registry.v1`). Both hold `NodeProfile` with `id` (the entry ID), `nodeType`, `serverInstanceId` and `isSystem`.

## Glossary location

The project already has a vocabulary section: `collaboration_model.md` § 1 "Vocabulary" (Run, Unit, Team, Org, …, Node, Peer, Remote delegated run, Link). The project's `DESIGN.md` doesn't say where the glossary is yet (Principle 15 expects it to).

## Coordination

- autobyteus-260 (tool results, running) touches the discovery tool files; the tool rename should land once, coordinated through the PTM.
- autobyteus-284 … 289 (restart and resume per node) will add per-node records: they should use `nodeId` = the node's ID from the start.
