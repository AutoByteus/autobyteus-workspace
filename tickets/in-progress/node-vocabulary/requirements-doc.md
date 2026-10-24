# Requirements Document — node-vocabulary (autobyteus-290)

## Document Status

- Status: `Approved` (SR-002). The user, 2026-10-24, after asking for the Solution Designer's own suggestion: "I think that you have much better language skill and you also understand our system much better than me now." He left U-1 and U-2 to the recommendation: U-1 (a), U-2 (a).
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), Task autobyteus-290, with the user's correction in its comment.
- Investigation (the audit): [investigation-notes.md](investigation-notes.md).

## Problem And Desired Outcome

The words node, peer, remote and embedded, and the word `nodeId`, mean different things in different places (V-01 … V-06). The desired outcome: one vocabulary, used the same way in the code, the data model, GraphQL, the tools and the docs, with no change in behavior.

## The Vocabulary (the user's rule)

| Word | Means | Examples that stay |
| --- | --- | --- |
| node | A server, with one node ID (`srv_…`) | `nodeId` in links, peers, envelopes |
| remote | Where something is: any node other than this one | remote runs, the remote chip, `nodeType: 'remote'` |
| peer | A remote node registered with this node | `PeerNode`, `peers.json`, "add a peer" |
| embedded local | How the desktop started its own server | `EMBEDDED_NODE_ID = 'embedded-local'`, `nodeType: 'embedded'` |
| (desktop) entry | The desktop's own record of a node it can open | new name for what the desktop calls `id` / `nodeId` today |

## Requirements

| ID | Requirement |
| --- | --- |
| REQ-901 | In code, `nodeId` means only the node's ID. A client's own record of a node is an **entry** with an **entry ID** (`entryId`): the desktop's registry, its changes, the window context, the mobile session, and the phone apps' saved node records (iOS and Android `SavedNodeProfile`), with every caller (V-01, V-09). |
| REQ-902 | The node's ID has one name in code: `nodeId`. `ServerInstanceIdentityService` becomes `NodeIdentityService` (`getNodeId`); the web's `serverInstanceId` and `isServerInstanceId` become `nodeId` and `isNodeId` (V-02). The wire field is U-2. |
| REQ-903 | Names that mean "registered peers" say peer (V-03): the tool `list_available_nodes` becomes `list_peer_nodes` (the user's decision); `AvailableNode` → `PeerNodeStatus`; `RemoteDiscoveryChannel` → `PeerDiscoveryChannel`; `RemoteNodeDiscovery` → `PeerNodeDiscovery`; `RemotePeer` → `PeerNodeRef`. The tool's texts and the docs in this repository that name it change with it. Agent configs in this repository select neither name (search: none); stored agent configs and packages are outside this ticket (REQ-906). |
| REQ-904 | "peer" is not used for other things. The connecting client's network address is the **client address** (V-04). Sibling task agents in the run tree are **siblings** (V-05). |
| REQ-905 | The desktop entry drops the field nobody reads, `isSystem` (V-06); the stored side is U-1. |
| REQ-910 | Memory Sync's own source identity is named **source ID** in code, GraphQL, the hub wire and the UI ("Source ID"), not "node id" (V-10, AR-903). Stored names stay through their owners. Whether it should become the node's ID is FU-002. |
| REQ-909 | The remote-access status answer has no version field. `compatibilityVersion` is removed from the server's answer and its readers: the web type and the iOS app's decode and its `>= minimum` check, with whatever that check alone used (DESIGN.md rule 9; the user, 2026-10-24: "we should remove it … it's against our rule"). |
| REQ-906 | Behavior is unchanged: the Nodes tab, pairing, delegation, discovery results, the tools' abilities and exposure. The intended exceptions: REQ-909 (an iOS app no longer refuses a server by a version number); and the tool rename (REQ-903): an agent definition that still selects `list_available_nodes` must be updated to `list_peer_nodes`. Updating stored agent configs and packages is out of this ticket, by the user's decision ("The agent config file belongs to another ticket after you have done your task … the agent package creator could create another task to update its own package", 2026-10-24). |
| REQ-907 | The docs (`collaboration_model.md`, `remote_collaboration.md`, the web `settings.md`, `agent_tools.md`, `agent_communication.md`) state the vocabulary rule. No old name is left. |
| REQ-908 | Done in steps that each change no behavior, each green: server identity, server peer names, the tool rename, the web entry ID, the other "peer" meanings, docs. |

## Acceptance Criteria

| ID | Requirements | Check |
| --- | --- | --- |
| AC-901 | REQ-901 … REQ-905, REQ-907 | A search finds no old name in code or docs (a word list in the ticket, run in CI or by review): `serverInstanceId` (outside the stored-field mapping, U-1), `list_available_nodes`, `AvailableNode`, `RemoteNodeDiscovery`, `RemoteDiscoveryChannel`, `RemotePeer`, `PeerAddress`, entry-meaning `nodeId`, `isSystem` |
| AC-902 | REQ-906 | All suites green; the two-server E2E and the Nodes-tab browser checks pass unchanged except for the tool name |
| AC-903 | REQ-906 | From a clean clone: build, tests, and an existing desktop node list and `peers.json` load and work unchanged |
| AC-904 | all | The user's check of the Nodes tab and an agent's `list_peer_nodes` |

## Decisions

| ID | Question | Options | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-1 | The stored names: the server's identity file (`serverInstanceId`), the desktop's node list file and its `localStorage` copy (`id`, `serverInstanceId`, `isSystem`) | (a) Keep them as stored. The one store that reads and writes each file maps them to the new code names; `isSystem` is no longer written, and an old file's field is ignored. (b) A sealed migration renames them on disk (`nodeId`, `entryId`), with a backup first. | DESIGN.md rule 8: "Renaming code never renames a file or value on disk." A migration means permanent migration code and a backup step, to rename two fields in two small files, with no behavior gained. The data model's meaning becomes clean in code either way. **Recommend (a).** If the stored shape should change, the per-node record of 284 … 289 is the moment to do it once. | User | Decided (a), by the user's deferral |
| U-2 | The wire field of `/rest/remote-access/status` (`serverInstanceId`), read by the desktop, peers and the phone app | (a) Rename it to `nodeId` (a clean cut, rule 9: everything updates together). (b) Keep it. | (a) makes the vocabulary true everywhere. The cost: a phone app or desktop that hasn't updated can't identify an updated node until it updates, which rule 9 accepts. **Recommend (a).** The readers are the desktop, peers, the web's phone access and the iOS app (`autobyteus-ios/AutoByteusMobileCore/ConnectionValidator.swift`), all renamed in this ticket. | User | Decided (a), by the user's deferral |
| D-1 | The desktop record's name | — | **Entry** (`NodeEntry`, `entryId`): it is the desktop's record of a node, not the node. **Decided.** | Solution Designer | Decided |
| D-2 | Other "peer" meanings | — | "Client address" for a network connection; "sibling" for task agents. **Decided.** | Solution Designer | Decided |

## Scope Guardrail

- In scope: renames in server, web, desktop shell, phone apps, GraphQL types where they carry the mixed words, tools and their texts, and docs. Agent configs and packages are out of scope (REQ-906).
- Out of scope: any behavior change; a merged node record (the desktop entry and the server's peer stay two records joined by node ID, one-nodes-tab DEC-701); the restart-and-resume record (284 … 289).
- Preserved: everything users and agents can do.
