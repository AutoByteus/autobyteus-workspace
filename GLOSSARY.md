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

- **Memory Sync source ID:** a Memory Sync source's own import identity
  (`memorySyncSourceId`), set by the user, for example `docker-node-1`. The hub
  keeps a source's imported memory under
  `memory/imports/<Memory Sync source ID>/`. It is not a node ID, and it is not
  the `sourceId` of a skill source, an update notification or a package source.

## Agent Runtimes

- **Agent runtime:** what runs an agent (`RuntimeKind`): AutoByteus, the
  Claude Agent SDK, Codex, Antigravity or Grok (Settings → Agent Runtimes,
  `list_available_agent_runtimes`). It is not the LLM runtime (`LLMRuntime`,
  `ModelInfo.runtime`: how AutoByteus calls a model, e.g. API or Ollama);
  always say "agent runtime" for the first.
- **Available agent runtime:** an agent runtime installed on the node and not
  known to be signed out; for AutoByteus, a provider with an API key, or a
  local provider (Ollama, LM Studio) that offers models.
- **Usage limit:** a runtime's or provider's own limit on use (a 5-hour or
  weekly window, a billing period, a money balance), read from the runtime or
  provider. It is not the launch check of whether a runtime is usable.
