# Glossary

The project's domain words (design principle 15). Each word has one meaning,
used the same way in code, stored data, the wire, GraphQL, tools, the UI and
the docs. A design that introduces a word, or gives a word a new meaning, adds
it here in the same change. Collaboration words (Run, Unit, Team, Org, Task,
delegated run, …) are defined in the
[Collaboration Model § 1](autobyteus-server-ts/docs/design/collaboration_model.md#1-vocabulary).

## Nodes

- **Node:** one AutoByteus server: the desktop's embedded server, a server on
  another machine, or a Docker server. It is identified by its **node ID**
  (`srv_…`, `nodeId`), created once and kept for the life of its data
  directory. In code, `nodeId` always means this ID and nothing else.
- **This node / remote node:** a point of view. Every node other than this one
  is a remote node, even a Docker node on the same machine. *Remote* names a
  location (remote runs, remote access, the remote chip, `nodeType: 'remote'`).
- **Peer:** a remote node registered with this node: both nodes registered each
  other, and this node pinned the peer's node ID (`PeerNode`, `peers.json`,
  "add a peer", `list_peer_nodes`). *Peer* names a relationship; a remote node
  that isn't registered is not a peer.
- **Embedded local:** how the desktop starts its own server
  (`nodeType: 'embedded'`, `isDesktopEmbeddedNode`). It is not a kind of node.
- **Entry:** a client's own record of a node it can open: the desktop's node
  list (`NodeEntry`), the phone's paired session, the phone apps' saved
  entries (`SavedNodeEntry`). An entry has its own `id`; anything that refers
  to an entry calls it the **entry ID** (`entryId`). An entry is not the node,
  and its entry ID is not the node's ID; an entry learns the node's ID
  (`NodeEntry.nodeId`) when it reaches the node.
- **Client address:** the network address a request came from
  (`normalizeClientAddress`, `isLoopbackClientAddress`). It is not a peer.
- **Sibling:** a run shown at the same level as another run in the run tree
  (for example a task agent's run lifted beside its parent's other children).
  It is not a peer.

## Memory Sync

- **Source ID:** a Memory Sync source's own import identity (`sourceId`), set
  by the user, for example `docker-node-1`. The hub keeps a source's imported
  memory under `memory/imports/<source ID>/`. It is not a node ID.
