# Data contract (draft): sandbox nodes and the provider relay through a peer

- Status: **Draft for autobyteus-581**, written on the user's request (2026-11-26) before 581's requirements. It is validated below (Design Principle 17), but it is not an approved design.
- Basis: the user's decisions DEC-008 to DEC-014 in [requirements-doc.md](requirements-doc.md).
- Authorities read on 2026-11-26:
  - team design principles: all of them, especially 15 and 17; Case 11;
  - `architecture-design.md`;
  - the repository's `DESIGN.md` (rules 7, 9, 10) and `GLOSSARY.md` (Nodes, Credential proxy, Provider relay, Run pass);
  - `docs/modules/credential_proxy.md` (Provider Relays), `docs/design/node_access_model.md` (NA-1 to NA-15), `docs/modules/secret_management.md`;
  - code: `src/api/rest/remote.ts`, `src/api/graphql/types/remote-collaboration-settings.ts`, `src/config/app-config.ts` (memory dir).
- Worktree base: `origin/personal` @ `9f803aa84d`.

## 1. What the contract covers

A sandbox is a fresh AutoByteus node (container) from the server image.
- The node that creates it, the **host node**, pairs with it.
- Its model-provider calls go through the host node, which adds the credential, so no credential is ever inside the sandbox.
- Its workspace and run memory are folders on the host computer, so the evaluator reads them directly.

Records and messages this adds or changes:

| ID | Record / message | Kind | Where it lives |
| --- | --- | --- | --- |
| C1 | Relay peer setting | stored setting | sandbox node: environment, or its data folder's `.env` |
| C2 | Login-token switch | stored setting | relay node `.env` (advanced key/value setting) |
| C3 | Relay definitions | code-owned table (not stored) | both nodes' code |
| C4 | Relayed provider call (sandbox node to relay node) | inter-node message | `/rest/remote/provider-relays/…` |
| C5 | Provider relay activity line | stored log | relay node `<app-data>/provider-relays/activity.jsonl` |
| C6 | Sandbox record | stored | host node `<app-data>/sandboxes/sandboxes.json` |
| C7 | Sandbox MCP tool payloads | tool messages | `create_sandbox`, `exec`, `destroy_sandbox` |
| C8 | Sandbox mapped folders | host file layout | `<sandboxes root>/<sandboxId>/workspace`, `…/run-memory` |
| (C9) | Login-token storage on the relay node | open (§ 6, O-1) | — |

## 2. Vocabulary (Principle 15): findings first

| Word | Decision | Why |
| --- | --- | --- |
| ~~credential gateway~~ | **Not used.** | "Gateway" already has two meanings in this project: the General **MCP Gateway** (`/mcp/gateway`, `AUTOBYTEUS_MCP_GATEWAY_TOKEN`) and the **peer gateway** (`remote.gateway` in `src/api/rest/remote.ts:25`). A third meaning would be vocabulary drift. |
| **Provider relay** | **Reused, meaning extended.** The glossary already defines it: "the credential proxy's app-owned forwarding of one runtime's model-provider calls" (`deepseek`). This change adds relays (C3) and lets a relay forward to a peer instead of the provider. | Our feature is exactly this concept, served across nodes. |
| **Relay node** | New word: the peer that adds the credential to a sandbox node's relayed calls. For a sandbox, it is the host node. | Names the role, not the location. |
| **Sandbox / sandbox node** | New word: a disposable node a host node created from the server image, paired with it, with mapped folders and an expiry. | — |
| **Host node** | New word: the node whose sandbox manager created a sandbox. | It is not "this node", which is a point of view. |
| **Login token** | New word: a subscription credential made by the provider's own sign-in (Claude `setup-token`). It is not an API key, not a node credential and not a run pass. | Kept apart from "credential", which the glossary reserves for node access. |

These go into `GLOSSARY.md` in 581's change.

## 3. The records and messages

### C1 Relay peer setting (sandbox node)

| Field | Meaning | Writer | Readers |
| --- | --- | --- | --- |
| `AUTOBYTEUS_PROVIDER_RELAY_PEER` | The **node ID** (`srv_…`) of the relay node. When set, every provider relay on this node forwards to that peer, never to the provider. When empty, behavior is unchanged. | Host node's sandbox manager, in the container's environment at `create_sandbox`; or the owner, as an advanced setting, on a manually set-up node | 1. this node's provider relay forwarder (C4 sender); 2. runtime readiness and sign-in state (a relayed runtime counts as signed in; see FU-001); 3. runtime launch (puts the relay's base URL and a placeholder credential into each runtime's environment) |

**Validation finding V-1: a URL alone is not enough.** The user asked for "one URL", but a URL authenticates nothing:
- anyone who reaches it could spend the relay node's keys;
- the relay node could not tell which node is calling.

The value is therefore the relay node's **node ID**, and the two nodes must be **paired**. The peer record already holds the URL (`baseUrl`, `changePeerAddress`), and every call is signed with the peer secret (NA-9). For a sandbox, the manager does both steps. A manually set-up node is paired once by its owner, then this setting is set.

### C2 Login-token switch (relay node)

| Field | Meaning | Writer | Reader |
| --- | --- | --- | --- |
| `AUTOBYTEUS_PROVIDER_RELAY_LOGIN_TOKENS` | `true`: for a relay with a login token configured (C9), the relay node attaches the login token instead of the API key. Absent or anything else: API keys only. | The owner, as an advanced key/value setting (DEC-009) | The relay node's C4 handler, per call |

Validation finding V-2: **the relay node alone decides which credential is used.** The sandbox node does not ask for a kind. That gives one owner for the fact (Principle 11) and keeps the switch with the node that holds the credentials.

### C3 Relay definitions (code-owned; extends the existing `deepseek` row)

| `relayId` | Upstream | API-key auth | Login-token auth | Runtimes that use it |
| --- | --- | --- | --- | --- |
| `anthropic` | `https://api.anthropic.com` | `x-api-key` (`provider.anthropic.api-key`) | `Authorization: Bearer` (C9), with Claude Code's own `anthropic-beta` header passed through | Claude Agent SDK (`ANTHROPIC_BASE_URL`); native Anthropic (blocked by FU-003) |
| `openai` | `https://api.openai.com` | `Authorization: Bearer` (`provider.openai.api-key`) | **Unclear** (O-2) | Codex (API-key mode, base URL: O-3); native OpenAI (FU-003) |
| `xai` | `https://api.x.ai` | `Authorization: Bearer` (`provider.grok.api-key`) | **Unclear** (O-2) | Grok Build (O-3); native Grok (FU-003) |
| `gemini` | `https://generativelanguage.googleapis.com` | `x-goog-api-key` (`provider.google.ai-studio.api-key`) | **none: not supported** (DEC-012) | native Gemini (FU-003); Antigravity: **Unclear** whether `agy` accepts another endpoint (O-3) |
| `deepseek` | as today | as today | none | DeepSeek Harness (as today); native DeepSeek (FU-003) |

Each row also keeps today's per-relay allowed methods and paths (credential proxy step 5). Rows are code, not stored data, so nothing on disk changes.

### C4 Relayed provider call (sandbox node to relay node)

```text
runtime ──▶ sandbox node 127.0.0.1:<proxy>/relay/<relayId>/<path>     (run pass as its key: existing contract)
              └─(C1 set)─▶ POST|GET … https://<relay node>/rest/remote/provider-relays/<relayId>/<path>?fromNodeId=…&toNodeId=…
                            signed with the peer secret (NA-9: method, route+query, both node IDs, time, nonce, body hash)
                            └─▶ relay node: checks → attaches credential → provider → streams the reply back unchanged
```

| Part | Content | Writer | Reader |
| --- | --- | --- | --- |
| method, path | the runtime's own, unchanged; must match C3's allowed list | sandbox node relay | relay node C4 handler |
| `fromNodeId`, `toNodeId` (query) | the two node IDs, as the received-file pieces already carry them (`remote.ts:49`) | sandbox node | node access gate (signature); C4 handler (which peer → C5) |
| headers | the runtime's headers **minus** `x-api-key`, `Authorization`, `Cookie`, `Host`, hop-by-hop (the existing forwarder rule) | sandbox node relay | relay node, which adds the credential |
| body | raw bytes, unchanged | runtime | provider (the gate hashes it first, NA-9) |
| reply | the provider's status, filtered headers and body, streamed; any credential echoed in a header is replaced with `[REDACTED]` (existing rule) | relay node | sandbox node relay, then the runtime |

**Refusals** use the existing relay error envelope `{"type":"error","error":{"type","code","message"}}`, before any provider call:
- `RELAY_PEER_UNAVAILABLE`: on the sandbox node, C1 names a node that is not a paired peer. It is a **loud** refusal. There is no fallback to the sandbox node's own vault: Principles 13 and 16, and a sandbox holds no keys anyway.
- `PATH_NOT_ALLOWED`: an unknown relay, or a method or path C3 does not allow.
- `RELAY_KEY_NOT_SET`: the relay node has neither the switched-on login token nor the API key for this relay.

### C5 Provider relay activity line (relay node)

`<app-data>/provider-relays/activity.jsonl`, one line per relayed call, refusals included:

| Field | Meaning | Reader |
| --- | --- | --- |
| `at` | ISO time | the evaluation report's egress section; the owner |
| `peerNodeId` | which sandbox called (from the gate's client identity, not from the body) | same; lets a report count calls per sandbox |
| `relayId` | C3 row | same |
| `credentialKind` | `apiKey` or `loginToken`: what the relay node attached | same; shows that login tokens stayed off |
| `method`, `path` | without the query | same |
| `status`, `error` | upstream status, or the refusal code | same |
| `durationMs` | — | same |

Never headers, bodies, tokens, keys or passes (the existing activity-log rule).

Validation finding V-3: there are **no usage, spend or limit fields**. Per-sandbox spending limits were my suggestion, not a user decision, and nothing would read such fields yet (Principle 17: a field without a reader stays out). They can be added later as optional fields.

### C6 Sandbox record (host node)

`<app-data>/sandboxes/sandboxes.json`: `{ "sandboxes": [ … ] }`, one entry per sandbox that is not yet removed.

| Field | Meaning | Writer | Readers |
| --- | --- | --- | --- |
| `sandboxId` | `sbx_<random>`. Also the container name suffix and the peer's name on the host node. | `create_sandbox` | every tool; expiry; startup sweep |
| `nodeId` | the sandbox node's node ID, learned at pairing | `create_sandbox` | `destroy_sandbox` (unpair); delegation (`node` = peer name, see V-5) |
| `image` | the image reference used | `create_sandbox` | the evaluation report (which build was tested) |
| `workspaceFolder`, `runMemoryFolder` | absolute host paths (C8) | `create_sandbox` | the evaluator (returned by the tool); `destroy_sandbox` leaves them |
| `createdAt`, `expiresAt` | ISO times; `expiresAt` = created + `lifetimeMinutes` | `create_sandbox` | the expiry sweep |
| `createdByRunId` | the run that called `create_sandbox` | `create_sandbox` | `destroy_sandbox`: only that run or the owner may destroy it |
| `state` | `starting` → `ready` → `removing`; a failed start goes straight to removal | the sandbox manager | the tools refuse a sandbox that is not `ready`; the startup sweep |

**Lifecycle:**
1. `create_sandbox` writes the entry as `starting`.
2. It becomes `ready` after pairing.
3. `destroy_sandbox`, expiry or the startup sweep set `removing`, remove the container and its anonymous volumes, unpair, and delete the entry.
4. **On host-node start**, the sweep removes every listed sandbox: a running sandbox has no owner after a restart. (DESIGN rule 7: an unreadable entry is logged and skipped, never deleted.)

Not stored:
- the sandbox's owner credential (used once, in memory, to accept the invite and is then dropped; V-4);
- the peer secret (kept by the existing peer records).

### C7 Sandbox MCP tool payloads

```jsonc
// create_sandbox: input
{ "lifetimeMinutes": 120, "image": "autobyteus/autobyteus-server:beta" }   // image optional: the node's default
// create_sandbox: result
{ "sandboxId": "sbx_7f3a9c", "peerName": "sbx_7f3a9c", "nodeId": "srv_4b1e…",
  "workspaceFolder": "/Users/…/.autobyteus/sandboxes/sbx_7f3a9c/workspace",
  "runMemoryFolder": "/Users/…/.autobyteus/sandboxes/sbx_7f3a9c/run-memory",
  "expiresAt": "2026-11-26T15:10:00Z" }

// exec: input / result (argv, never a shell string; output capped)
{ "sandboxId": "sbx_7f3a9c", "argv": ["ls", "-la", "/home/autobyteus/workspace"], "timeoutSeconds": 60 }
{ "exitCode": 0, "stdout": "…", "stderr": "", "truncated": false }

// destroy_sandbox
{ "sandboxId": "sbx_7f3a9c" }  →  { "removed": true, "foldersKept": true }
```

Validation finding V-6: `create_sandbox` has **no** input for "which folder to map". The manager creates both folders fresh, under one sandboxes root. This makes precaution 1 (never a real project folder) and precaution 2 (never the evaluator's own folder) true by construction instead of by rule. Inputs are copied into `workspaceFolder` by the evaluator before it delegates.

### C8 Mapped folders

```text
<sandboxes root>/sbx_7f3a9c/workspace    ⇄  /home/autobyteus/workspace          (the run's workspaceRootPath)
<sandboxes root>/sbx_7f3a9c/run-memory   ⇄  /home/autobyteus/run-memory         (AUTOBYTEUS_MEMORY_DIR, app-config.ts:227-231)
                                              └─ agents/<runId>/raw_traces_active.jsonl, run_metadata.json, work_journal/
```

`AUTOBYTEUS_MEMORY_DIR` already exists, so mapping run memory needs no new setting. The layout is the one every node writes today (measured, names only, on the desktop node's `memory/agents/<runId>/`).

**Reader rule (evaluator side, part of the contract).** The evaluator and the leak scan open only regular files whose resolved path stays inside the sandbox's folders. Symbolic links are refused (V-7).

## 4. Walks (Principle 17): one supported flow at a time

**W1: evaluation run on Claude, API key** (`Supported Normal Scenario`: agents-101's old-versus-new evaluation)

1. Evaluator (host node, run `r_eval`) calls `create_sandbox {lifetimeMinutes:120}`. The manager:
   - writes C6 as `starting`;
   - creates C8's folders;
   - `docker run` with fresh volumes, both mounts, `AUTOBYTEUS_PROVIDER_RELAY_PEER=<host nodeId>` and `AUTOBYTEUS_MEMORY_DIR`;
   - gets a setup code over `docker exec` (the 484 probe route), then the sandbox's owner credential;
   - creates a peer invite on the host and makes the sandbox accept it with that credential (`acceptPeerInvite`, name `sbx_7f3a9c`);
   - drops the credential, and sets C6 `nodeId` and `state: ready`.
   - Reads: nothing extra. Writes: C6, C8.
2. Evaluator copies inputs into `workspaceFolder`, then `delegate_task(node: "sbx_7f3a9c", …)`. That is existing delegation to a peer, `POST /rest/remote/delegated-runs`.
3. The Claude run in the sandbox calls `127.0.0.1:<proxy>/relay/anthropic/v1/messages` with its run pass. Because C1 is set, the sandbox node sends C4 to the host node. There:
   - the gate admits the peer `srv_4b1e…` by its signature;
   - C2 is absent, so the API key `provider.anthropic.api-key` is attached;
   - C5 gets `{peerNodeId, relayId:"anthropic", credentialKind:"apiKey", status:200}`;
   - the reply streams back.
4. The delegation result returns. The evaluator reads `workspaceFolder` and `runMemoryFolder/agents/<runId>/raw_traces_active.jsonl` under the reader rule, runs the leak scan, and judges.
5. `destroy_sandbox`: `removing` → container and volumes removed → unpaired → C6 entry deleted. The folders stay.

Every step finds what it needs. Each fact has one owner: the credential kind is the relay node's (C2), the sandbox list the manager's (C6), the transcript the run's own memory (C8).

```jsonc
// C5 line written in step 3
{"at":"2026-11-26T13:12:04Z","peerNodeId":"srv_4b1e…","relayId":"anthropic","credentialKind":"apiKey",
 "method":"POST","path":"/v1/messages","status":200,"durationMs":5610}
```

**W2: the same with login tokens switched on** (DEC-010, off by default)

The owner adds `AUTOBYTEUS_PROVIDER_RELAY_LOGIN_TOKENS=true` and has stored a Claude login token (C9, open). In step 3 the relay node attaches `Authorization: Bearer <login token>` and keeps Claude Code's `anthropic-beta` header. C5 shows `"credentialKind":"loginToken"`. Inside the sandbox, Claude Code holds only a placeholder `CLAUDE_CODE_OAUTH_TOKEN`; node 8001 measured that this starts and works through a relay (guide § 7).

**W3: refusals** (`Supported Explicit Edge Scenario`: a security contract, NA-1 and NA-13)

| Case | Where refused | Result | C5 |
| --- | --- | --- | --- |
| The relay node removed the pairing (owner revoked it) | sandbox node, before sending | `RELAY_PEER_UNAVAILABLE`; the run fails loudly | none (no call reached the relay node) |
| Signature invalid or stale | relay node gate | 401 (NA-9) | none: refused by the gate before the handler, so the existing gate log line is the record |
| The runtime calls a path outside C3 (for example `/v1/organizations`) | relay node C4 handler | `PATH_NOT_ALLOWED` | `error: PATH_NOT_ALLOWED` |
| No key for `xai` on the relay node | relay node | `RELAY_KEY_NOT_SET` | `error: RELAY_KEY_NOT_SET` |

**W4: expiry and restart** (`Supported Normal Scenario`: an agent forgets `destroy_sandbox`, or the computer restarts)

- Expiry: the sweep finds `expiresAt` in the past and removes the sandbox as in W1 step 5.
- Host-node restart: the startup sweep removes every C6 entry, because a sandbox from before the restart has no owner run any more.
- In both cases the folders are kept, because they may hold results.

**W5: manually set-up Docker node** (`Supported Normal Scenario`: DEC-008, "a node configured with the relay")

The owner pairs the Docker node with the desktop node (existing invite flow) and sets C1 on it to the desktop node's ID. W1 step 3 then applies unchanged. No C6 record exists, because the node is not a sandbox.

**Rejected as unsupported** (`Technically Possible but Unsupported/Contrived`): a sandbox relaying to a node other than its host; nested sandboxes; two relay peers on one node. No design is required for them.

## 5. Checks run against real data and dependencies

| Check | How | Result | Established |
| --- | --- | --- | --- |
| A fresh image node starts, gets a setup code over `docker exec`, exchanges it, answers GraphQL | 484 probes 1–5 | yes, about 20 s | Measured (2026-11-12) |
| Claude Code works with a placeholder `CLAUDE_CODE_OAUTH_TOKEN` and `ANTHROPIC_BASE_URL` through a relay that adds the real token | node 8001 guide § 7 and § 10 | yes (Claude Code 2.1, Linux container) | Measured by node 8001 (cited, not re-run) |
| A run's memory layout | `ls` of names in `~/.autobyteus/server-data/memory/agents/<runId>/` | `raw_traces_active.jsonl`, `run_metadata.json`, `work_journal/` | Measured (names only) |
| Memory dir is a setting | `app-config.ts:227-231` | `AUTOBYTEUS_MEMORY_DIR`, environment or `.env` | Read |
| Files the sandbox writes in a mapped folder | throwaway container (offline) writing to a `/tmp` bind mount | written as root inside; on the Mac owned by the user (501) | Measured (2026-11-26) |
| A link planted in a mapped folder | the same container made `leak-link.md -> /etc/hostname` | on the Mac it resolves to the **Mac's** `/etc/hostname`, and reading it succeeded | Measured: V-7 is a real risk, not hypothetical |
| Peer routes accept raw bodies and node IDs in the query, signed | `remote.ts:47-55` (received-file pieces) | yes, an existing pattern | Read |
| Peer pairing API | `createPeerInvite` / `acceptPeerInvite` (owner only) | a sandbox owner credential is needed on the sandbox side once | Read |

**Not yet checked; must be checked before approval:**
- the container reaching the host node for pairing and C4 (Docker Desktop `host.docker.internal`, and how the host node's network admission, NA-3/NA-4, sees that address) (O-4);
- Codex and Grok accepting another base URL (O-3);
- the login-token sources for Codex and Grok (O-2).

## 6. Open items

| ID | Open item | Kind | Recommendation |
| --- | --- | --- | --- |
| O-1 | Where the relay node keeps a Claude login token (C9). On macOS Claude Code's own login is in the Keychain, not a file, so the 8001 "read `~/.claude/.credentials.json`" source does not exist on your desktop node. | Design; needs a writer | A vault entry (`provider.anthropic.login-token`), filled from a `claude setup-token` token through the vault's own save path (not the `.env` key/value settings, which are plain text) |
| O-2 | Login tokens for Codex (ChatGPT login: tokens refresh and rotate) and Grok (OAuth) | Unclear: feasibility | Investigate in 581. If one cannot be made to work without fighting the relay node's own login, mark it "not supported" (DEC-010's rule) |
| O-3 | Do Codex, Grok and `agy` accept a different API address in API-key mode? | Unclear: feasibility | Run each against a local relay in 581's investigation |
| O-4 | Container to host-node reachability and network admission for pairing and C4 | Unclear: feasibility | Probe with a throwaway container and a test node, not the user's nodes |
| O-5 | Native runtime: provider base URLs are fixed in code | Prerequisite inside 581 (FU-003) | A per-relay base URL for native providers when C1 is set |
| O-6 | **Getting the package under test into the sandbox** (found 2026-11-26 while walking an old-versus-new evaluation). No step in W1 puts the agent package version into the sandbox node, and peers have no import route. | Gap in the contract; Solution Designer | `create_sandbox` takes `agentPackages: [<folder>]`. The manager **copies** each folder into the sandbox (it does not map it, so the original stays out of reach, in line with V-6) and imports it at start. The result returns each package's agent and team addresses for `delegate_task`. Walk it as W6 in 581. |

## 7. Validation result

The contract fits every supported flow (W1–W5) with one owner per fact and a reader for every field. Changes the validation made to the earlier plan:

| Finding | Change |
| --- | --- |
| V-1 | The relay setting holds a peer **node ID**, not a bare URL, and pairing is required |
| V-2 | Only the relay node chooses API key or login token |
| V-3 | No usage or limit fields until a reader is approved |
| V-4 | The sandbox's owner credential is never stored |
| V-5 | The `delegate_task` `node` parameter takes a peer **name**, so a sandbox's peer name is its `sandboxId`, unique by construction |
| V-6 | `create_sandbox` takes no folder paths; the manager creates fresh ones |
| V-7 | The evaluator reads mapped folders under a no-links rule (measured risk) |
| Vocabulary | "credential gateway" dropped in favor of the existing "provider relay"; new words: relay node, sandbox (node), host node, login token |

**Not ready for implementation:** O-1 to O-4 need investigation or a decision, and 581's requirements are not written or approved yet.
