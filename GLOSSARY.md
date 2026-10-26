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

## Memory

- **Memory** (of a run): what a run keeps in its own folder: raw traces,
  snapshots, file changes, context files and its Work Journal
  ([Collaboration Model § 3](autobyteus-server-ts/docs/design/collaboration_model.md)).
  It is not a global knowledge base.
- **Work Journal:** a run's readable Markdown record, rendered from its raw
  traces by the journal service; one file per raw-trace segment
  (`work_journal/`).
- **Memory search:** finding past work in the memory of every run on this
  node, today through their Work Journals: the tool `search_memory` and the
  Memory page's Search. It points to where the work is; it does not answer from
  memory, and it does not search other nodes.
- **Memory index:** the derived index memory search reads: the text index and
  the meaning index, built by the indexing pipeline from Work Journals
  (`memory-search/`). It is not a copy of the journals.
- **Indexing pipeline:** the ordered steps that build and update the memory
  index: Find runs, Journals, Text index, Meaning index. It is not a general
  workflow engine.
- **Journal chunk:** a part of one journal file: whole entries of at most
  2,000 characters (a longer entry split by lines), with its file, line range
  and day. The text index holds chunks.
- **Journal card:** the short text that represents one journal file in the
  meaning index (agent, first requests, first reply openings, distinct
  actions), with the line ranges of its parts. It is not a summary written by a
  model.
- **Words / Meaning:** the match labels on the Memory page: a match found by
  the text index (Words) or by the meaning index (Meaning). The tool and the
  API call them `text` and `meaning`.
- **Memory run:** one run folder known to the memory index, with its recorded
  names and runtime (`MemoryRun`). It is not a live run.

## Memory Sync

- **Memory Sync source ID:** a Memory Sync source's own import identity
  (`memorySyncSourceId`), set by the user, for example `docker-node-1`. The hub
  keeps a source's imported memory under
  `memory/imports/<Memory Sync source ID>/`. It is not a node ID, and it is not
  the `sourceId` of a skill source, an update notification or a package source.
