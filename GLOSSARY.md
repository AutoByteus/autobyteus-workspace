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
- **Server package:** one release's server for one architecture: a
  self-contained folder with `server-package.json`, `package.json`, `dist/`,
  `prisma/`, `node_modules/` and `mobile-web/`. A release publishes it as
  `autobyteus-server-<version>-linux-<arch>.tar.gz` with its **package
  description** (`.json`: `server-package.json` plus the archive's name,
  SHA-256 and sizes) and the description's **signature** (`.json.sig`,
  Ed25519). It is not called a build or a bundle.
- **Built-in server package:** the server package inside a Docker image, at
  `/opt/autobyteus/server-package`. For a default-variant image it is the same
  folder that image's release publishes; a `zh` image builds its own and
  publishes none.
- **Starter:** the program in a Docker image that runs the node's server
  package and replaces it on request. It is not the launcher: the launcher is
  the host command `autobyteus-docker`.
- **In-place update:** replacing a Docker node's server package inside its
  running container. Moving a node to a new image stays an *upgrade*
  (`autobyteus-docker upgrade`).
- **System level:** a whole number naming what a Docker image provides beyond
  Node and the architecture: its base image, system tools and agent CLIs
  (`system-level.json`). An image provides one level; a server package needs
  one.
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
- **Words / Meaning:** how a match was found: by the text index (words), when
  it names its matched words (`matchedWords`, "Words: …" on the Memory page),
  or by the meaning index (meaning), when it names none. The tool and the API
  call them `text` and `meaning` (`matchedBy`). Neither is a grade.
- **Memory run:** one run folder known to the memory index, with its recorded
  names and runtime (`MemoryRun`). It is not a live run.

## Memory Sync

- **Memory Sync source ID:** a Memory Sync source's own import identity
  (`memorySyncSourceId`), set by the user, for example `docker-node-1`. The hub
  keeps a source's imported memory under
  `memory/imports/<Memory Sync source ID>/`. It is not a node ID, and it is not
  the `sourceId` of a skill source, an update notification or a package source.

## MCP Secrets

- **Vault secret ID:** the stable name of one vault entry (`SecretId`), for
  example `provider.openai.api-key`, an MCP secret's `mcp.<uuid>`, or the
  test-only `test.github.token`. It is not a server ID or a field.
- **Secret reference:** what `mcps.json` stores in place of a secret value:
  `{ "vaultSecretId": "mcp.<uuid>" }`. It is not the value; the managed MCP
  server resolves it when it connects, and never earlier.
- **MCP secret:** an MCP server value (env value, header value or token)
  stored as a vault entry. Provider keys are not MCP secrets.
- **Secret field (`field`):** which value of an MCP server is meant:
  `env:<NAME>`, `header:<Name>` or `token`; names keep their case. Every
  interface about one value of a server uses it (resolver context, errors,
  states, move candidates and selection, `storedSecrets`). It is not the env or
  header `name` alone.
- **Always-secret field:** the HTTP `token` and an `Authorization` header (name
  in any case). It is always locked, and its value is never returned, even
  while it is still stored as plain text.
- **Locked (UI):** a form row whose value is, or will be, an MCP secret.
- **Secret state (`McpSecretState`):** `PLAIN` (stored as plain text),
  `CONFIGURED` (a reference whose vault entry is present), `MISSING` (a
  reference with no entry), `VAULT_UNAVAILABLE` (a reference while the vault is
  not READY). It is not the vault's health.
- **Server draft (`McpServerDraft`):** an MCP server's settings as the user
  sent them; each value is `plain`, `newSecret`, `keep`, or (from import only)
  `missingSecret`, a secret this node does not hold. It is not a core config:
  only `McpServerSecretFields` turns a draft into one.
- **Keep marker (JSON tab):** `{"stored": "vault"}` or `{"stored": "plain"}`:
  "keep what is stored for this field". It is not a secret reference.
- **Secret suggestion rule:** the name keywords and value prefixes that
  pre-lock form rows and select move candidates (`McpSecretSuggestionRule`;
  the web reads it, never defines it). It is not secret scanning.
- **Reviewed (move candidate):** a candidate the user decided about (unticked
  in the review dialog, "Keep as they are", or unlocked after the rule
  pre-locked it). The move banner leaves it out; the per-row hint still offers
  the move. Kept per device and node (`mcpSecretReviewState`).

## Integrations

- **Integration:** an outside service the agents a user chooses may use from
  their shell through the credential proxy, with the user's token kept in the
  node's vault (GitHub first). Its app-owned definition (`IntegrationDefinition`)
  fixes its hosts, auth format, allowed paths and shell variables; a skill can't
  change it. Not the server folder `src/integrations/github/`, which is the
  public GitHub client for package and skill sources (no token).
- **Credential proxy:** the server's loopback listener that forwards an allowed
  run's calls to an integration, adding the token. Not the General MCP Gateway or
  the Agent Tools MCP Server.
- **Run pass:** the unguessable value in a run's proxy address
  (`/r/<pass>/…`). One per run, live while the run is active, revoked when the
  run is released or its activation fails. It is not the token and not a
  session.
- **Agent access (integration):** the agent definitions the user ticked on an
  integration's card (`agentDefinitionIds`). A run gets the integration only if
  its agent is ticked, including as a team member. Not tool or skill access.
- **Connected (integration):** the node holds a token GitHub accepted
  (`connected` with the token's `login`). Not "agent access".
- **Activity record:** one line of `<app-data-dir>/integrations/activity.jsonl`
  per proxied call or refusal (no token, pass, query, headers or bodies).

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

- **Agent runtime:** what runs an agent (`RuntimeKind`; Settings → Agent
  Runtimes, `list_available_agent_runtimes`). It is not the LLM runtime
  (`LLMRuntime`, `ModelInfo.runtime`: how AutoByteus calls a model, e.g. API or
  Ollama); always say "agent runtime" for the first.
- **Agent runtime names:** each agent runtime has one name, used in every view
  and in every text to agents; there are no short forms. The names come from
  one list, `agentRuntimeName` in `@autobyteus/agent-presentation-contracts`:

  | Kind | Name |
  | --- | --- |
  | `autobyteus` | AutoByteus |
  | `codex_app_server` | Codex App Server |
  | `claude_agent_sdk` | Claude Agent SDK |
  | `antigravity_cli` | Antigravity CLI |
  | `grok_build` | Grok Build |
- **Agent runtime switch:** replacing the agent runtime, model and model settings
  of a stopped standalone Agent run, keeping the run (same run ID, chat, history
  row, workspace). It is made real at the run's next input.
- **Pending agent runtime switch:** the user's saved choice of another agent
  runtime, held in the run's metadata (`pendingRuntimeSwitch`) until that input.
- **Hand-over notice:** the system notice the new agent receives with that input:
  where the Work Journals are and how they are laid out. It names no agent runtime.
- **Switch marker:** the notice record that starts the new raw-trace file; the chat
  and the Work Journal show it ("Agent runtime changed from … to …").
- **Previous agent:** the agent that worked on the run on the earlier agent runtime
  (wording toward the agent; in code, the earlier raw-trace segment).
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
  while Model Routing was on: the Task it serves, the delegation, the launch, its source, task kind, reason, router
  failure and skipped defaults.
