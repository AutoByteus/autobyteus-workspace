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

## Project Tasks

- **Title:** a Project Task's one-line name, given by its writer (an agent's
  `create_task` / `update_task`, or the app's Title field) and stored with the
  Task (`title`). It is shown wherever a Task is listed: board cards, rows,
  pickers, the Workspaces tree, `list_project_tasks` and
  `search_project_tasks`. A Task with no Project (a Temp task) has no title;
  its one-line text is its description's first line, which is not called
  title or summary.
- **Summary:** a reduced view of something, for example
  `listProjectSummaries` (a Project without its Tasks) or
  `TaskWorkerTaskSummary` (a Task worker's Task under its name). A summary is
  never a Task's one-line name: that is its title.

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

## Agent Definitions

- **Internal agent:** an agent definition marked `"internal": true` in its
  `agent-config.json`: the system's own helper, such as the Model Router. While
  the server setting "Show internal agents" (`AUTOBYTEUS_SHOW_INTERNAL_AGENTS`)
  is off, it is left out wherever the user or an agent browses, picks or
  delegates; opened by ID it works. It is not the same as a **built-in agent**
  (shipped and synced by AutoByteus, e.g. the Daily Assistant), which may or may
  not be internal.

## Model Routing

- **Model Routing:** a node's switch (off by default; Settings → Model Routing) under which its Model Router chooses
  a runtime and model for the agents of a fresh delegated copy that no usable default covers. Off, delegation behaves
  as before.
- **Model Router:** the built-in, internal agent definition `autobyteus-model-router` that makes those choices. Never
  "router" alone in code.
- **Model Router agent:** the node's one long-lived run of the Model Router (an ordinary agent run, kept across
  restarts) in its own internal workspace. The user talks to it ("Talk to the router"); it is never a collaboration
  member. Never called a "conversation".
- **Internal workspace:** a workspace under `<appData>/internal-workspaces/`, where an internal agent the server runs
  works; listed only while internal agents are shown.
- **Routing request:** one system notice (sender `system.model_router`) sent to the Model Router agent for one
  delegation, identified by its `requestId`; answered with `submit_launch_choices`. One at a time: the next is sent
  when the agent is idle.
- **Launch choice:** the Model Router's answer for one agent: runtime, model, task kind and a one-sentence reason
  (`choiceReason` in a launch source, because `reason` already names a skipped layer's reason).
- **Knowledge file:** `knowledge.md` in the Model Router agent's workspace, its own durable memory, which it writes
  with its file tools; every routing request carries its current text.
- **Task kind:** the Model Router's short free-text label for a choice (1–40 characters, grouped ignoring letter case),
  such as "implementation"; nothing for the user to manage.
- **Decision record:** one line of a node's decision log per agent of a fresh delegated copy resolved on that node
  while Model Routing was on: the Task it serves, the delegation, the launch, its source, task kind, reason and notes.
