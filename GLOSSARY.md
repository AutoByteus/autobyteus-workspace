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
- **Allowed host:** a name a node accepts as a request's `Host` (port not
  compared): an IP address; `localhost` and `*.localhost`; dotless names and
  names ending `.local`, `.lan`, `.home.arpa` or `.internal`; names ending
  `.ts.net`; the hosts of `AUTOBYTEUS_SERVER_HOST` and of
  `AUTOBYTEUS_ALLOWED_ORIGINS` entries; names in `AUTOBYTEUS_ALLOWED_HOSTS`
  (a `.x` entry covers `x` and every name under it); the hosts of the node's
  open pairing sessions and active paired phones (`RequestHostPolicy`,
  `remote-access-request-host.ts`). Others are refused with
  `REMOTE_ACCESS_HOST_REFUSED`, before any other rule. `X-Forwarded-Host` is
  not read for it.
- **Allowed origin:** a browser `Origin` a node accepts on HTTP requests and
  WebSocket upgrades: none, the node's own origin (`Host` or
  `X-Forwarded-Host`), `file://` (the packaged desktop app), or one listed in
  `AUTOBYTEUS_ALLOWED_ORIGINS` (`RequestOriginPolicy`,
  `remote-access-request-origin.ts`). A localhost page is no exception: its
  origin is allowed only when listed. Others are refused with
  `REMOTE_ACCESS_ORIGIN_REFUSED`.
- **Tool endpoint:** a node endpoint whose clients are programs:
  `/mcp/gateway` and the agent-tools and credential-proxy listeners. It
  accepts no `Origin` or one listed in `AUTOBYTEUS_ALLOWED_ORIGINS`
  (`createToolEndpointOriginPolicy`).
- **User file reply:** a node route's answer with a user file's content
  (`sendUserFile`, `user-file-reply.ts`): the file's type,
  `Content-Security-Policy: sandbox allow-scripts` (it runs in an opaque
  origin, never the node's) and `X-Content-Type-Options: nosniff`.
- **Phone WebSocket route:** a WebSocket route pattern a paired phone's
  credential may open (`PHONE_WEBSOCKET_ROUTES`). A phone credential on any
  other WebSocket route is refused with `PHONE_ACCESS_ROUTE_REFUSED`.
- **Way to connect:** how a phone reaches a node (`connectionWay`):
  `company_address` (an address set up for the node), `tailscale`, `vpn` (the
  user's own VPN) or `local_network` (the same Wi-Fi or LAN). The desktop's
  Phone Setup tabs, the pairing session and the paired phone's record use it.
  It replaces "address candidate" in Phone Access; Memory Sync and Remote
  Collaboration keep their own address candidates.
- **Node network:** one node's report of the network of the computer it runs
  on (`NodeNetwork`, `GET /rest/remote-access/network`): the computer's name,
  whether the node runs in a container, its configured address, its Tailscale
  address and name, its VPN addresses and its local network. It holds no port
  and no URL: the desktop builds addresses from it with the node's port.
- **Local network / network ID:** the Wi-Fi or LAN this computer is on,
  recognised by its **network ID** (`networkId`): `gw_<hash>` of the router's
  hardware address, or `this-computer` when it cannot be recognised.
- **Allowed local network:** a local network the owner allowed phones on
  ("Allow and show QR code"), kept by the node whose computer it is in
  `remote-access/allowed-local-networks.json`.
- **Shell bridge:** the Android app's `AutoByteusShell` object in its WebView,
  given only to the main frame of the open node's origin: the page tells the
  app it paired, or asks it to show its node list or its scanner. It carries
  no credential.
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
- **Node desktop:** the virtual graphical desktop inside a Docker node (Xvnc
  display `:99`, RFB on `127.0.0.1:5900` inside the node) that its agents use,
  shown in the VNC Viewer tab through the node's own server
  (`/rest/node-desktop`, `/ws/node-desktop`, `src/node-desktop/`). It is not
  the desktop app and not the user's own screen. A **viewer** is one client
  connection showing it; its **mode** is `view` ("View only") or `control`
  ("Control"), fixed per stream.
- **Sibling:** a run shown at the same level as another run in the run tree
  (for example a task agent's run lifted beside its parent's other children).
  It is not a peer.

## Run Section

- **Run section:** the left panel's area under the page list that shows your
  runs. Its header's "View" menu chooses the view.
- **View** (of the run section, `RunSectionMode`): **Runs** (every top-level
  run, newest first by last activity), **Workspaces** (by folder) or **Projects**
  (by Project). A view only shows; it holds no add or remove action.
- **Listed run:** a run a view shows: a non-archived Agent, Team or Org run of
  any status, a prepared or just-started run included; not an unsent New chat
  draft, nor an internal agent's run. The Workspaces and Projects views list a
  folder or Project only while it has a listed run.
- **Last activity** (`lastActivityAt`): when a run was last active, its
  delegated work included: the newest memory file of the run and of every agent
  its tree locates; its creation time before any.
- **Remove** (a folder): unregister it in the chat's folder chooser; it leaves
  every chooser and every view. Files, memories and run history stay.

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

- **Integration:** a connection to an outside service (GitHub first) that agents
  use from their shell through the credential proxy, with the user's token kept in
  the node's vault. It is a skill plus authentication: one top-level folder of an
  imported skill source (its folder name is its ID). Not the server folder
  `src/integrations/github/`, which is the public GitHub client for package and
  skill sources (no token).
- **Integration manifest:** an integration folder's `integration.json` (`name`,
  `description`, optional `token.help`, optional `prerequisites`). Presentation
  only: it never says where a token may go.
- **Integration source:** an imported skill source (a local folder or a GitHub
  repository) that holds at least one integration folder. It is a skill source;
  "integration source" names only this role.
- **Integration skill:** the skill in an integration's folder (its `SKILL.md`
  `name`, for GitHub `github-integration`). An agent may use the integration when
  its effective skills hold this copy.
- **Delivery definition:** the app-owned part of an integration
  (`DeliveryDefinition`): its routes, upstream origins, auth formats, shell
  variables and token check. An imported repository can't add or change one; an
  integration without one shows **Needs a newer AutoByteus**.
- **Integration state:** a card's state: `NEEDS_TOKEN` (shown "Installed, needs a
  token"), `CONNECTED` (shown "Connected as @login") or `NEEDS_NEWER_APP`.
- **Credential proxy:** the server's loopback listener that forwards an allowed
  run's calls to an integration, adding the token, or a runtime's calls to its
  model provider through a provider relay, adding the key. Not the General MCP
  Gateway or the Agent Tools MCP Server.
- **Run pass:** the unguessable value in a run's proxy address for integrations
  (`/r/<pass>/…`) and in the API-key header for a provider relay. One per run,
  live while the run is active, revoked when the run is released or its
  activation fails (`RunPassRevocation`). It carries the run's integration grants
  and its provider relay grant. It is not the token or key, and not a session.
- **Provider relay:** the credential proxy's app-owned forwarding of one
  runtime's model-provider calls, granted to the run by its runtime (DeepSeek
  Harness → DeepSeek's Messages API, relay `deepseek`, path `/relay/deepseek/…`).
  Not Model Routing or the Model Router, and not an integration.
- **Provider call observation:** what a provider relay reports about one
  forwarded call to the run's session: started, stream activity, finished with
  the provider's usage. The session turns them into usage, compaction and
  liveness.
- **Grant (integration):** what a run's preparation found: the integration, its
  skill and the source it came from, checked again on every call. Not a stored
  permission: access follows the agent's skills.
- **Connected (integration):** the node holds a token the service accepted
  (`connected` with the token's `login`). Not access: which agents may use it
  follows their skills.
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
  | `deepseek_harness` | DeepSeek Harness |
- **DeepSeek Harness (dsh):** DeepSeek's own agent program, run over ACP. Its
  **dsh home** is the AutoByteus-owned `DSH_HOME` under the server's app data;
  the user's `~/.dsh` is never used. Its **dsh provider route** is dsh's own name
  for its route to DeepSeek's API (`deepseek-official`), held only as
  `DSH_PROVIDER_ROUTE`.
- **Agent runtime switch:** replacing the agent runtime, model and model settings
  of a stopped Agent, keeping its run (same run ID, chat, history row, workspace).
  It applies to a standalone Agent run, a Team member, an Org member (a direct Agent
  or an Agent of a mounted Team) and a delegated copy (a task Agent, or a member of a
  task Team); a Team's or an Org's own default launch is not switched. It is made real
  at the Agent's next input.
- **Pending agent runtime switch:** the user's saved choice of another agent
  runtime, held in the Agent's record (`pendingRuntimeSwitch`: a standalone run's metadata,
  a member's node in the run's execution tree, a copy's own record) until that input.
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
