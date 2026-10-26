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
  sent them; each value is `plain`, `newSecret` or `keep`. It is not a core
  config: only `McpServerSecretFields` turns a draft into one.
- **Keep marker (JSON tab):** `{"stored": "vault"}` or `{"stored": "plain"}`:
  "keep what is stored for this field". It is not a secret reference.
- **Secret suggestion rule:** the name keywords and value prefixes that
  pre-lock form rows and select move candidates (`McpSecretSuggestionRule`;
  the web reads it, never defines it). It is not secret scanning.
