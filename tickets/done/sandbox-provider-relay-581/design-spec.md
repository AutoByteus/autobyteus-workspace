# Design Spec: autobyteus-581: provider relay through a paired node, and sandbox nodes

## Solution And Approval Basis

- Current solution revision: **SR-007** (SR-006 plus the user's DEC-111 revision to option B and DEC-114; C11 reduced to a lifecycle mark). SR-006 answered ARCH-REV-002 (AR-007, N-1, N-2, R-G, R-H). SR-005 added shared folders DEC-113, DEC-111 decided, skill DEC-112. SR-004 revised SR-003 after architecture review ARCH-REV-001 (Fail: AR-001 to AR-006) and the user's decision DEC-110.
- Approved requirements:
  - [requirements-doc.md](requirements-doc.md) REQ-001 to REQ-016, approved by the user on 2026-11-26 (SR-002);
  - REQ-010 as revised by the user's DEC-110 (full network);
  - REQ-017 / AC-015: **option B decided by the user (DEC-111 revised)**: a sandbox is a normal paired peer. DEC-114: any paired peer may use the relay (REQ-002 unchanged).
  - REQ-018 (public skill, DEC-112) and shared folders (DEC-113).
- Behavior-defining supplements: the 484 decisions ([history-484/requirements-doc.md](history-484/requirements-doc.md)).
- User approval of the design: not required by the direction.
- Design status: **Ready** for architecture re-review.
- Investigation notes: [investigation-notes.md](investigation-notes.md) (P-1 to P-14). Review: [design-review-report.md](design-review-report.md).
- Authorities read on 2026-11-26:
  - `architecture-design.md`, `design-principles.md` (all), `design-examples.md` (Case Studies);
  - `DESIGN.md` (rules 7, 9, 10, 12), `GLOSSARY.md`;
  - `node_access_model.md`, `credential_proxy.md`, `secret_management.md`, `TESTING.md`.
- Conflicts: none.
- Delivery docs sync (autobyteus-581 delivery, DR-001): C1, C3, C7, C8 and C10 now read as implemented: no Codex login token (DEC-116), no `localPassHeader` or `dropFromCaller`, the added refusals `SANDBOX_ARGUMENT_INVALID` and `SANDBOX_TOOL_FAILED`, and the run-memory mount at `<data>/memory` (deviation 11). The design decisions themselves are unchanged. See `docs-sync-report.md`.

## Response To ARCH-REV-001

| Finding | Resolution | Where |
| --- | --- | --- |
| AR-001 / AR-007 | **The user decided option B** (DEC-111 revised, 2026-11-26): a sandbox is a normal paired peer, without sandbox-specific limits; the risk is accepted and recorded (FU-581-06 keeps the designed restriction). This removes the C11 rules, and AR-007 with them. The peer keeps a `role` mark only for cleanup and labelling. | C11 |
| AR-002 | **One owner: the existing `ProviderRelayAccess`, extended.** `ProviderRelayRouting` is dropped. Every consumer is listed with its change: the ACP launcher (Grok, DeepSeek Harness), the agent provider factory builder, the application execution scope, the standalone host, discovery. `prepareForRun` no longer checks the local vault on a relayed node. | § Current-State Read, DS-001, Consumer table |
| AR-003 | The kind is per runtime. C1 lists relays (API keys) and, separately, the runtimes that use a login token. Native always uses API keys. The relay node attaches exactly the declared kind and refuses `loginToken` when its switch is off; `apiKey` is never refused for the switch. | C1, C4 |
| AR-004 | The relay node marks its handler's replies (`x-autobyteus-relay-reply: forwarded \| refused`). An unmarked non-2xx is the node's gate (NA-13), with its own mapping. Timeouts: connect, headers and idle, no total. Walked: provider 401 vs gate 401. | C4 |
| AR-005 | `ProviderRelay` gets a per-kind route: route, local pass header, credential source, attached headers, headers dropped from the caller. The forwarder attaches several headers. `streamReader`/`compactionHeader` are decided per relay (only DeepSeek reads them). | C3 |
| AR-006 | A relayed node's relay facts are read-only configuration fixed before startup (Principle 16's allowed exception). Passes always come from `ProviderRelayAccess`: injected per run, or the existing process slot for the two process singletons. A relayed launch without an access refuses loudly. Codex: one app-server **per working directory**, each with the node pass. | DS-001, Dependency Rules |
| R-A | The start sweep also unpairs peers marked `sandbox` that have no C6 entry. | C6 |
| R-B | `SandboxManager` serializes the limit check and the `starting` write. | Ownership |
| R-C | Moot: no egress proxy (DEC-110). Route limits live in the host's gate (C11). | — |
| R-D | Codex parsing the node pass as a JWT is part of the U-1 live check. | Risks |
| R-E | Native model availability with curated catalogs and no local keys is checked in implementation (step 4 test). | Change Sequence |
| R-F | `relayProviderCall` goes in `peer-relay-client.ts`. | Files |

## Current-State Read

- **The existing relay boundary.** `ProviderRelayAccess` (`provider-relay-access.ts:32-89`): `prepareForRun(run, relayId)` checks the vault (line 70), grants the relay on the run pass and returns `{baseUrl, apiKey: pass}`. It also has `relayBaseUrl` and `observe`. The studio composition creates it in the credential proxy host and injects it into:
  - the agent provider factory builder and the ACP launcher (`build-studio-server.ts:299`);
  - the application execution scope (`build-studio-server.ts:356`; `application-execution-scope-kernel-builder.ts:151, 373`);
  - the process slot read by runtime availability and DeepSeek Harness discovery (`build-studio-server.ts:249`).

  The standalone application host passes `null` (`start-standalone-application-host.ts:285, 334`).
- **The ACP launcher** (`acp-session-launcher.ts:104-215`) takes the relay from the launch profile's static `providerRelayId`: DeepSeek Harness `deepseek`, Grok `null`. Without an access it refuses (`PROVIDER_RELAY_UNAVAILABLE`, line 109). It hands `relayAccess` to `runLaunch`, and observes provider calls when a relay is used (line 171).
- **Other runtimes authenticate directly:**
  - Claude: the process singleton `getClaudeSdkClient()`; spawn env from `process.env` by auth mode (`claude-sdk-client.ts:248, 356, 372`);
  - Codex: the singleton manager, one app-server per working directory (`codex-app-server-client-manager.ts:21-33`), arguments from `process.env` (`codex-app-server-launch-config.ts`);
  - native: a vault resolver, fixed base URLs (FU-003).
- **Peers, pairing, the gate:** as in SR-003, plus:
  - the gate's route permission gives a peer every `/rest/remote/*` route (`node-route-permissions.ts:86`);
  - `PeerClient.call` uses one total timeout, maps a 401 to "not paired" and expects a JSON answer (`peer-client.ts:440-500`).
- **Probes:** P-1 to P-14. P-2: Docker's default network reaches the host and the local network. Under DEC-110 that is now accepted.

## Task Size And Architectural Risk (Mandatory)

- **Task size: Large** (unchanged; confirmed by review).
- **Architectural risk: High**: a cross-node route carrying credential effects, a host-side rule for sandbox peers, login tokens, container lifecycle.
- **Escalation trigger:** a runtime that cannot be launched in its relay shape; any need to put a credential into a sandbox (Requirement Gap).

## Architecture Investigation Evidence

As SR-003, plus the review's code reads (report § Current-State Evidence Basis):
- `acp-session-launcher.ts:104-215`;
- `acp-agent-launch-profile.ts:1-35`;
- `build-studio-server.ts:120-356`;
- `application-execution-scope-*.ts`;
- `start-standalone-application-host.ts:285, 334`;
- `codex-app-server-client-manager.ts:15-33`;
- `node-route-permissions.ts:80-86`;
- `peer-gateway.ts:343-372`, `remote-requests.ts:20-50`.

## Intended Change

1. A relayed node sends every supported runtime's model calls through a paired relay node, which attaches the credential.
2. A host node creates, uses and removes **sandbox nodes** (one container each, full network) through three tools. Each sandbox is paired with the host as a normal peer (DEC-111) and relayed through it.

## Change Scope (Mandatory)

- **In scope:** UC-001 to UC-007.
  - Server: `credential-proxy/provider-relays` (extended: relays, access, local route, peer forwarder); new `credential-proxy/provider-relay-peer`; `remote-collaboration/channel/peer-relay-client.ts`; the peer record `role` (lifecycle mark, written at pairing); runtime launches (native, Claude, Codex, ACP: Grok and DeepSeek Harness); runtime status strategies; the secret catalog; settings; `api/rest/remote.ts`; new `sandboxes` and `agent-tools/sandboxes`.
  - autobyteus-ts: an endpoint option (FU-003).
  - Electron: the release version in the server environment.
  - **Public skill (DEC-112, REQ-018):** `AutoByteus/autobyteus-skills` gains `autobyteus-sandboxes/SKILL.md`, written from the final C7 contract (tool names, fields, refusal codes) and the evaluation flow (DS-003, DS-006, the C8 folders). It has its own branch and pull request in that repository, delivered together with this ticket.
  - Docs: `node_access_model.md`, `credential_proxy.md`, `secret_management.md`, `TESTING.md`, `GLOSSARY.md`.
- **Derived consumers:**
  - run-pass holder readers: integration route (unchanged meaning), relay route (reads the relay grants);
  - `ProviderRelayAccess` consumers (Consumer table below);
  - secret catalog `isKnownSecretId` / `listFixedSecretIds` (new ID);
  - runtime status readers: `AvailableAgentRuntimesService`, `ModelRouter`, `LaunchUsabilityCheck` (accept relayed and api-key runtimes);
  - the peer record readers: peer directory, Nodes page (shows the role), start sweep.
- **Deliberately left alone:** Antigravity (DEC-101); media providers and integrations on relayed nodes (FU-581-03, FU-581-04); a restricted-network mode (FU-581-05); the `autobyteus-docker` launcher.
- **Follow-ups:** FU-581-01 to FU-581-05.

## Relevant Behavior And Production-Path Map (Mandatory)

| BEH | REQ / AC | Trigger | Change | Spine |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-001, 004 / AC-001, 002 | A run starts on a relayed node | Relay shape per runtime | DS-001 |
| BEH-002 | REQ-002, 003, 005–007 / AC-003–006 | A relayed call arrives | The relay node checks, attaches, logs | DS-002 |
| BEH-003 | REQ-008 / AC-007 | Status check | From C1; Claude api-key from vault status | DS-005 |
| BEH-004 | REQ-004 / AC-001 | A native LLM is created on a relayed node | Endpoint option | DS-001 |
| BEH-005 | REQ-009–011, 014, 016 / AC-008, 010, 014 | `create_sandbox` | Creation, one container | DS-003 |
| BEH-006 | REQ-012, 013, 015 / AC-011–013 | Tools, expiry, start | Use and removal | DS-006 |
| BEH-007 | REQ-002, 009, 017 / AC-009, 015 | Pairing | Automatic pairing as a normal peer, with the lifecycle mark | DS-003 |

## Task Design Health Assessment (Mandatory)

- **Change posture:** Larger Requirement.
- **Design issues found:**
  - the run-pass holder carries one relay;
  - `ProviderRelayAccess` decides relays only from static launch-profile fields;
  - Claude, Codex and native decide their credential source in their own launch code.
- **Triggers:**
  - **Repeated coordination (13):** the credential source per runtime. Response: `ProviderRelayAccess` (existing, injected) answers `routeFor(runtimeKind)` and issues all relay passes. No second owner.
  - **Data contract (17):** § Data Contract, revalidated.
  - **Shared-structure tightness (11):** the pass holder (`providerRelays: ReadonlyMap<relayId, relayCredentialKind>`, holder kind `run | node`) and `ProviderRelay` (per-kind route).
  - **Capability-area reuse (4):** forwarder, signing, pairing, setup code, package import, tool registry.
  - **Hidden dependency (16):** two process singletons (Claude client, Codex manager) get passes through the **existing** process slot. Conditions: set before listening; a relayed launch with no slot throws `PROVIDER_RELAY_UNAVAILABLE`; no cycle.
  - **Several kinds (1):** five runtimes × two kinds; run kinds: agent, team member, application run, standalone host; three removal triggers. Each is walked.
  - **Behavior by absence (13):** "relayed but no access" and "relay not listed" are explicit refusals, never a direct launch.
- **Root cause:** Duplicated Policy Or Coordination; Shared Structure Looseness.
- **Refactor needed now:** Yes, the three items above.

## Terminology

These go to `GLOSSARY.md`.

| Word | Meaning |
| --- | --- |
| Provider relay (extended) | Forwarding of a runtime's model-provider calls, one relay per provider (C3). It may forward to a relay node. |
| Relayed node | A node with `AUTOBYTEUS_PROVIDER_RELAY_PEER` set. |
| Relay node | The paired peer that attaches credentials. |
| `relayCredentialKind` | `apiKey` or `loginToken`. Always qualified, never the bare "credential kind" of node access. |
| Login token | A subscription credential from the provider's own sign-in. |
| Node pass | The pass a relayed node's shared processes use (discovery, Codex app-servers). |
| Sandbox (node) / host node | A disposable node a host node created from its own release image (one container) / the node that created it. |
| Sandbox peer | A peer whose record on the host says `role: "sandbox"`: a normal peer, marked for cleanup and labelling. |

## Legacy Removal Policy (Mandatory)

- **Obsolete:**
  - `RunPassHolder.providerRelayId` and `grantProviderRelay`;
  - `AcpAgentLaunchProfile.providerRelayId` (static only);
  - Claude's vault branch when relayed;
  - fixed-only base URLs in autobyteus-ts;
  - `ProviderRelay.route` / `consumer` (single).
- **Compatibility wrappers:** none.

## Data Contract (Mandatory)

Location: this section. It supersedes the SR-003 version. The user saw the 484 draft and its validation, and asked for the start variables (DEC-109) and full network (DEC-110).

### C1 Relayed-node start settings (environment or `.env`; read once at start: read-only configuration)

| Field | Meaning | Writer | Readers |
| --- | --- | --- | --- |
| `AUTOBYTEUS_PROVIDER_RELAY_PEER` | The relay node's node ID. Empty: not relayed; every runtime unchanged. | Sandbox manager; or the owner | `ProviderRelayAccess` |
| `AUTOBYTEUS_PROVIDER_RELAYS` | Relays the relay node has **API keys** for: `anthropic,openai,xai,deepseek,gemini` | Sandbox manager (relay node's vault status); or the owner | `ProviderRelayAccess` (`routeFor`, `statusOf`) |
| `AUTOBYTEUS_PROVIDER_RELAY_LOGIN_TOKEN_RUNTIMES` | Runtimes that run on the relay node's **login token**: `claude_agent_sdk,grok_build` (never `codex_app_server`: DEC-116; a value naming it stops startup). Set only when the relay node's switch is on and it has that runtime's login token. | Same | Same |

**Per-runtime kind rule** (AR-003): a runtime listed in the third variable uses `loginToken` on its relay; otherwise `apiKey`, if its relay is in the second variable. Native (`autobyteus`) is never listed in the third, so it is always `apiKey`, per provider. Malformed values stop startup with the reason.

Example, mixed:

```text
AUTOBYTEUS_PROVIDER_RELAYS=anthropic,openai,deepseek
AUTOBYTEUS_PROVIDER_RELAY_LOGIN_TOKEN_RUNTIMES=claude_agent_sdk
→ Claude: anthropic/loginToken · native Anthropic: anthropic/apiKey · Codex: openai/apiKey · Grok: signed out (xai not listed)
```

### C2 Relay-node switch

`AUTOBYTEUS_PROVIDER_RELAY_LOGIN_TOKENS=true` (advanced setting; absent means off).

Readers:
- the C4 handler (a `loginToken` call requires it);
- the sandbox manager (C1's third variable at creation).

### C3 Relay definitions (code): `ProviderRelay`

```ts
type RelayPassHeader = "x-api-key" | "authorization-bearer" | "x-goog-api-key";
type RelayCredentialSource =
  | { kind: "vault"; consumer: SecretConsumerIdentity }
  | { kind: "grokLogin" };                 // no Codex login (DEC-116)
type RelayCredentialRoute = {
  route: DeliveryRoute;                    // origin, basePath, allows(method, path)
  // `localPassHeader` is not kept (implementation deviation 1): the local route reads the pass from whichever of the three headers came in
  source: RelayCredentialSource;
  attach(credential: RelayCredential): Record<string, string>;  // headers set on the upstream call
  // `dropFromCaller` is removed: it dropped Codex's `chatgpt-account-id`, and Codex has no login-token route (DEC-116)
};
type ProviderRelay = {
  id: string; providerName: string;
  routes: { apiKey: RelayCredentialRoute; loginToken: RelayCredentialRoute | null };
  observation: { streamReader: "anthropic-messages" | null; compactionHeader: string | null };
};
```

| relay | apiKey: origin · local pass header · source → attached | loginToken | observation |
| --- | --- | --- | --- |
| `anthropic` | api.anthropic.com · `x-api-key` · vault `provider.anthropic.api-key` → `x-api-key` | api.anthropic.com · `authorization-bearer` · vault `provider.anthropic.login-token` (C9) → `Authorization: Bearer`; `anthropic-beta` passes (P-4) | none |
| `openai` | api.openai.com · `authorization-bearer` · vault `provider.openai.api-key` → `Authorization: Bearer` | null (Codex has no login-token route: DEC-116, IMP-12) | none |
| `xai` | api.x.ai · `authorization-bearer` · vault `provider.grok.api-key` → Bearer | api.x.ai · `authorization-bearer` · `grokLogin` → Bearer | none |
| `deepseek` | as today (`x-api-key`) | null | as today (`anthropic-messages`, `x-deepseek-harness-compact`) |
| `gemini` | generativelanguage.googleapis.com · `x-goog-api-key` · vault AI Studio key → `x-goog-api-key` | null | none |
| `kimi`, `glm`, `qwen`, `mistral`, `minimax` | the provider origin · `authorization-bearer` · vault key → Bearer | null | none |

Allowed paths per route: as in SR-003 C3; there is no OpenAI login-token route (DEC-116).

**The forwarder change:** `forward({ credential: { headers, secrets } })` replaces the single `token`/`auth` (no drop list: see `dropFromCaller` above). The GitHub integration passes one header as today.

**Observations:** only relays with a `streamReader` notify run observers; today that is DeepSeek, read by the ACP session (`acp-session-launcher.ts:171`).

### C4 Relayed call (relayed node → relay node)

```text
<method> /rest/remote/provider-relays/<relayId>/<relayCredentialKind><upstream path>?fromNodeId=…&toNodeId=…   (signed, NA-9)
body: raw; parsed to a Buffer in the route's own scope (body limit 32 MiB) so the gate hashes it
```

**Relay node (handler), in order:**
1. Unknown relay or kind, or path/method not allowed → `PATH_NOT_ALLOWED`.
2. `loginToken` with C2 off → `RELAY_LOGIN_TOKENS_OFF`; `loginToken` with no route for this relay → `PATH_NOT_ALLOWED`.
3. Credential missing → `RELAY_KEY_NOT_SET` / `RELAY_LOGIN_TOKEN_NOT_SET`; Grok login expired → `RELAY_LOGIN_EXPIRED`.
4. Forward with exactly the declared kind's credential (no swap; `apiKey` is never refused because of C2).
5. One C5 line.

**Reply marking (AR-004):** every reply the handler sends carries `x-autobyteus-relay-reply: forwarded` (the provider's status, headers and body, streamed, echoed credentials redacted) or `refused` (the relay envelope above).

**Relayed side (`peer-relay-client.ts`, then the local route):**

| Reply | Meaning | To the runtime |
| --- | --- | --- |
| `forwarded`, any status | The provider's answer | Unchanged (a provider 401 stays a provider 401) |
| `refused` | The relay node's refusal | Its envelope unchanged |
| No marker, 401 | The relay node's gate refused the signature (unpaired, revoked, clock) | `RELAY_PEER_NOT_ACCEPTED`: "The relay node does not accept this node: it is not paired with it, or the pairing was removed." |
| No marker, 403 with an NA-13 `code` | The gate refused (for example network admission) | `RELAY_PEER_REFUSED` with that code and message |
| No marker, 503 `NODE_IDENTITY_NOT_MIGRATED` | — | `RELAY_PEER_UNAVAILABLE` |
| No marker, any other status (e.g. 400, 413 body too large, 500) | The relay node failed before its handler | `RELAY_PEER_FAILED` with the status (N-1) |
| Connection failed or timed out | — | `RELAY_PEER_UNREACHABLE` |

Local refusals before sending: `RELAY_NOT_LISTED`; `RELAY_PEER_UNAVAILABLE` (no paired peer of that ID, or remote collaboration off).

**Timeouts:** connect 10 s; response headers 300 s (slow first byte for long thinking); idle between body chunks 300 s; **no total timeout**.

### C5 Provider relay activity line (relay node)

`<app-data>/provider-relays/activity.jsonl`. Fields: `at`, `peerNodeId`, `relayId`, `relayCredentialKind`, `method`, `path`, `status` or `error`, `durationMs`. Never a header value, body, key, token or pass.

### C6 Sandbox record (host node)

`<app-data>/sandboxes/sandboxes.json`, plus labels `autobyteus.sandbox=<id>` and `autobyteus.sandbox.host=<host nodeId>` on the container.

Fields: `sandboxId`, `nodeId`, `image`, `workspaceFolder`, `runMemoryFolder`, `hostPort`, `createdAt`, `expiresAt`, `createdByRunId`, `state` (`starting` → `ready` → `removing`).

The start sweep removes:
- every C6 entry;
- every container labelled with this host;
- every peer marked `sandbox` with no C6 entry (R-A).

### C7 Sandbox tools (DEC-113)

```jsonc
create_sandbox {
  "agentPackages":  ["/abs/path/package-copy"],                    // required, ≥1: copied into the sandbox, imported
  "sharedFolders":  [{ "path": "/abs/path/data", "name": "articles" }],  // optional: read-only at /home/autobyteus/shared/<name>
  "lifetimeMinutes": 120                                             // optional: default 120, 1..480
}
→ { "sandboxId", "peerName", "nodeId", "workspaceFolder", "runMemoryFolder",
    "sharedFolders": [{ "name": "articles", "pathInSandbox": "/home/autobyteus/shared/articles" }],
    "agents": [{ "name", "address" }], "teams": [{ "name", "address" }], "image", "expiresAt" }
run_in_sandbox { "sandboxId", "argv": [...], "timeoutSeconds": 60 } → { "exitCode", "stdout", "stderr", "truncated" }
destroy_sandbox { "sandboxId" } → { "removed": true, "foldersKept": true }
```

- **Shared folder rules:**
  - `path` is absolute and an existing directory; symbolic links are resolved first;
  - `name` matches `^[a-z0-9][a-z0-9-]{0,39}$` and is unique per sandbox;
  - refused (`SANDBOX_SHARED_FOLDER_INVALID`, naming the folder and the reason) when the resolved path is the user's home folder, is a parent of it, or lies in or contains the node's data folder, `~/.autobyteus*`, `~/.ssh`, `~/.claude`, `~/.codex`, `~/.grok`, `~/.config`, `~/.aws`, `~/.gnupg`, `~/.docker`, `~/.kube`, `~/.netrc`, macOS `~/Library`, or the test vault (R-G).
- **Who reads `sharedFolders`:** `SandboxManager` (validation), `SandboxDocker` (`-v <path>:/home/autobyteus/shared/<name>:ro`), the tool result (the evaluator).
- **No relay parameter:** the relay is always the creating node (C8).
- **Refusal codes:**
  - `SANDBOX_DOCKER_UNAVAILABLE`, `SANDBOX_REMOTE_COLLABORATION_OFF`, `SANDBOX_PLATFORM_NOT_SUPPORTED`;
  - `SANDBOX_LIMIT_REACHED`, `SANDBOX_IMAGE_UNKNOWN`;
  - `SANDBOX_PACKAGE_INVALID`, `SANDBOX_SHARED_FOLDER_INVALID`, `SANDBOX_START_FAILED`;
  - `SANDBOX_NOT_FOUND`, `SANDBOX_NOT_YOURS`, `SANDBOX_NOT_READY`;
  - `SANDBOX_ARGUMENT_INVALID` (a missing, wrong-typed or unknown tool argument; added in implementation). An unexpected error in a tool is reported as `SANDBOX_TOOL_FAILED`.

### C8 Sandbox container start (DEC-109, DEC-110)

One container. Docker's default bridge network. `-p 127.0.0.1:<hostPort>:8000`. Memory 6 GiB, 4 CPUs.

- **Mounts:** `workspaceFolder` → `/home/autobyteus/workspace` (read and write), `runMemoryFolder` → `/home/autobyteus/data/memory` (read and write; the sandbox node's own memory folder, `<data>/memory`: deviation 11, F-2), each shared folder → `/home/autobyteus/shared/<name>` (**read-only**, P-14), plus fresh anonymous volumes (data, `/root`, server packages).
- **Environment:**
  - C1's three variables;
  - `AUTOBYTEUS_TEMP_WORKSPACE_DIR=/home/autobyteus/workspace` (deviation 5); no memory variable (`AUTOBYTEUS_MEMORY_DIR` had no reader: deviation 11);
  - `ENABLE_REMOTE_COLLABORATION=true`;
  - `AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:<hostPort>`.
- **Never:** a key, token, credential or peer secret.

The sandbox reaches the host node at `host.docker.internal:<host port>` (P-1), offered as the host's pairing candidate.

### C9 Claude login token, C10 Grok login (Codex: none, DEC-116)

As SR-003.

### C11 Sandbox peer role (host node; DEC-111 revised to option B)

A sandbox is a **normal paired peer** of its host, with every peer right a paired node has. There is no route rule and no files check (the user's decision). The host only marks the peer, for its own lifecycle:

| Field | Meaning | Written by | Read by |
| --- | --- | --- | --- |
| `role: "sandbox"` (optional, host's `peers.json`) | This peer is a sandbox this node created | The host's pairing exchange, from the invite `SandboxManager` created with `role: "sandbox"` (kept beside the invite's code hash in memory, never in the invite text), so it is saved atomically with the peer (R-H) | The start sweep (unpair orphaned sandbox peers, R-A); the Nodes page (label "sandbox") |

Absent means a normal peer. Removed with the peer at destroy.

**Accepted risk (DEC-111, FU-581-06):** an agent under evaluation can start or message host agents through the normal collaboration tools. The designed restriction (SR-006 C11) is kept in FU-581-06 for a later optional mode.

### Identities and lifecycle

- **Peers:** on the host, the sandbox's peer name is `sandboxId`, with `role: "sandbox"`. On the sandbox, the host's peer name is `host`.
- **C6 lifecycle:** as SR-003, with removal also deleting the peer record (and its role).
- **Passes:** run passes as today; the node pass lives while C1 is set.

### Data Contract Validation

| UC / SCN | Step | Reads | Writes | Served? |
| --- | --- | --- | --- | --- |
| SCN-003 create, with a shared folder | `sharedFolders` validated (absolute, existing, name pattern, not home or credential or app-data); then as below; `-v …:ro` | C7 input | — | Yes (P-14) |
| SCN-003 shared folder refused | `sharedFolders: [{path: "/Users/me"}]` (home) → `SANDBOX_SHARED_FOLDER_INVALID`; nothing created | C7 input | — | Yes |
| SCN-003 agent writes into a shared folder | "Read-only file system"; the host file is unchanged | — | — | Yes (P-14) |
| SCN-003 create | checks → C6 `starting` → folders → `docker run` (C8) → setup code → host `createInvite` → sandbox accepts (candidates `host.docker.internal:<port>` / `127.0.0.1:<hostPort>`) → host marks the peer `sandbox` (C11) → import packages → C6 `ready` | C2, vault status, settings | C6, C11 | Yes |
| SCN-001 Claude, API key | `routeFor(claude)` = anthropic/apiKey → run pass with `{anthropic: apiKey}` → spawn env `ANTHROPIC_BASE_URL`, `ANTHROPIC_API_KEY=<pass>` → local route reads `x-api-key` → C4 `…/anthropic/apiKey/v1/messages` → host attaches the key → `forwarded` | C1 | pass, C5 | Yes (P-3) |
| SCN-002 Claude, login token | C1 lists `claude_agent_sdk` → anthropic/loginToken → `CLAUDE_CODE_OAUTH_TOKEN=<pass>` (P-4) → local route reads Bearer → C4 `…/loginToken/…` → C2 on → C9 attached | C1, C2, C9 | C5 | Yes |
| Native Anthropic in the same sandbox | anthropic/apiKey (native never login) → endpoint `…/relay/anthropic` with the pass in `x-api-key` → C4 `apiKey` → host attaches the key, even though C2 is on | C1 | C5 | **Yes** (AR-003 fixed) |
| Codex, API key | App-server (per cwd) with `-c model_providers.autobyteus_relay={base_url, experimental_bearer_token=<node pass>}` (P-13) | C1, slot | — | Yes |
| Codex, login token | **Not supported** (DEC-116): Codex 0.171 requires an HTTPS workspace backend (IMP-12). `codex_app_server` is never a login-token runtime; Codex uses the API key. | — | — | N/A |
| Grok, either kind (ACP) | Launch profile `relay: { relayId: "xai", use: "whenRelayed" }` → launcher → `prepareForRun(run, "xai", "grok_build")` → `{baseUrl, pass, kind}` → `runLaunch` env `GROK_XAI_API_BASE_URL` plus `XAI_API_KEY=<pass>` (apiKey) or `GROK_AUTH_PROVIDER_ACCESS_TOKEN=<pass>` (loginToken) | C1 | — | apiKey yes (P-7); loginToken U-2 live |
| DeepSeek Harness on a relayed node | Profile `relay: { relayId: "deepseek", use: "always" }` → `prepareForRun` checks C1 listing, **not the local vault** (AR-002 bug fixed) → the local route forwards to the peer | C1 | C5 | Yes |
| Application run (studio scope) | Same `ProviderRelayAccess` injected → the same answers | C1 | — | Yes |
| Application run (standalone host, access `null`) on a relayed node | A relayed runtime → `PROVIDER_RELAY_UNAVAILABLE` (loud); on an unrelayed node, unchanged | C1 | — | Yes (explicit) |
| Provider 401 through the relay | `forwarded` 401 → the runtime shows the provider's error | — | C5 | Yes (AR-004) |
| Host unpaired the sandbox | Gate 401, unmarked → `RELAY_PEER_NOT_ACCEPTED` | — | — | Yes |
| Pairing with role (R-H) | `createInvite({role: sandbox})` → the sandbox accepts → the host's exchange saves the peer **with** the role | invite memory | peer record | Yes |
| Sandbox answers its delegator, with a file | As between any paired nodes (existing received-files and messages routes, existing link check) | stored links | — | Yes |
| Status | Relayed runtime: signed in iff C1 gives it a kind; Claude api-key mode (unrelayed): vault status (FU-001) | C1, vault | — | Yes |
| Destroy, expiry, sweep | `removing` → `docker rm -f -v` → unpair (record and role gone) → entry deleted; folders kept | C6, labels, C11 | C6 | Yes |

**Checks:** P-1 to P-14 (P-9 and P-10 now only inform FU-581-05; P-14: read-only shared folder).

**Contract changes from this revision:**
- C1 per runtime;
- C3 per-kind routes;
- C4 kind in path, reply marking, timeouts;
- C8 one container;
- C11 new;
- the companion container removed.

## Persisted Data / State Transition Decision

- **New data:** `sandboxes.json`, `provider-relays/activity.jsonl`, one vault ID, five settings.
- **Changed record:** the peer record gains the optional `role`. Existing records have none and read as "normal peer", so they are **directly usable, no migration**: the existing reader ignores unknown fields; the new reader treats an absent `role` as normal (DESIGN data migration guideline: tolerant reader).
- **Everything else: Not Affected.**

## Data-Flow Spine Inventory

| Spine | Scope | Start → End | Owner |
| --- | --- | --- | --- |
| DS-001 | Primary | A run's launch on a node → the runtime calling the local relay (or direct) | `ProviderRelayAccess` (decision and pass); each launch owner (shape) |
| DS-002 | Primary | Local relay route → provider reply streamed back, C5 | Local route + `ProviderRelayPeerForwarder`; `ProviderRelayPeerHandler` |
| DS-003 | Primary | `create_sandbox` → C6 `ready` | `SandboxManager` |
| DS-005 | Primary | Status check → signed-in state | strategies via `ProviderRelayAccess.statusOf` |
| DS-006 | Primary | Destroy, expiry or start → nothing left | `SandboxManager` |

(DS-004, the egress loop, is removed by DEC-110.)

## Primary Execution Spines

- **DS-001:** `run backend (native LLM construction | Claude session options | Codex app-server launch | ACP launcher) → ProviderRelayAccess.routeFor(runtimeKind) → prepareForRun(run, relayId, runtimeKind) | prepareForNode(relayId) → launch shape → runtime → local relay`
- **DS-002:** `local relay route (pass per C3 header, listed check) → [unrelayed: vault → forwarder → provider] | [relayed: ProviderRelayPeerForwarder → PeerRelayClient (signed, streamed) → relay node gate → ProviderRelayPeerHandler → credential → forwarder → provider]`
- **DS-003:** `create_sandbox → SandboxManager.create (serialized check and write) → SandboxDocker.run → SandboxPairing (setup code, invite, accept, mark C11) → import → ready`

## Ownership Map

| Owner | Owns |
| --- | --- |
| **`ProviderRelayAccess`** (extended, the only relay owner) | C1 (read at start); `isRelayed()`, `routeFor(runtimeKind)`, `prepareForRun(run, relayId, runtimeKind)`, `prepareForNode(relayId)`, `statusOf(runtimeKind)`, `relayBaseUrl`, `observe` |
| `RunPassRegistry` | Passes; holder `{ kind: run \| node, providerRelays: Map<relayId, relayCredentialKind> }` |
| `ProviderRelays` | C3 |
| Local relay route | Pass check per C3 header; listed check; unrelayed vs relayed branch (on `isRelayed()`) |
| `ProviderRelayPeerForwarder` + `PeerRelayClient` | Relayed side of C4, reply mapping, timeouts |
| `ProviderRelayPeerHandler`, `RelayLoginTokenReader`, `ProviderRelayActivityLog` | Relay side of C4, C10, C5 |
| `SandboxManager` (serializes create) / `SandboxDocker` / `SandboxPairing` / `SandboxRecordsStore` | DS-003, DS-006 |

## ProviderRelayAccess Consumers (AR-002)

| Consumer | Today | Change |
| --- | --- | --- |
| ACP launcher (`acp-session-launcher.ts`) | Static `profile.providerRelayId` → `prepareForRun(run, id)` | Profile `relay: { relayId, use: "always" \| "whenRelayed" } \| null`. The launcher uses the relay when `always`, or `whenRelayed` on a relayed node, and calls `prepareForRun(run, relayId, runtimeKind)`, which returns `{baseUrl, pass, kind}`. `runLaunch` gets `relayAccess` with the kind. Observes only when the relay has a `streamReader`. |
| Grok launch profile | `providerRelayId: null` | `relay: {xai, whenRelayed}`; env per kind (C3) |
| DeepSeek Harness profile | `providerRelayId: "deepseek"` | `relay: {deepseek, always}`; unchanged behavior unrelayed |
| Agent provider factory builder (`build-studio-server.ts:299`) | Passes access to backends | Also to the native and Claude backends (per-run passes) |
| Application execution scope (`:356`, kernel builder) | Same access | Unchanged wiring; the same answers |
| Standalone application host | `null` | On a relayed node, any relayed launch refuses `PROVIDER_RELAY_UNAVAILABLE`; unrelayed unchanged |
| Process slot (`:249`) readers: runtime availability, DeepSeek discovery | — | Plus: Codex app-server launch config, Claude control queries (node pass) |
| Native LLM construction (`available-llm-construction.ts`) | Vault resolver | Relayed: `routeForNativeProvider(provider)` then `prepareForRun(run, relayId, "autobyteus")` → endpoint `{baseUrl}` and a resolver returning the pass |
| Claude session query options | Integration env | Relayed: plus `ANTHROPIC_BASE_URL` and the pass var by kind; the client skips the auth policy when `isRelayed()` and requires these vars (else throws) |

## Dependency Rules

- `ProviderRelayAccess` is created by the credential proxy host (as today), with C1 parsed from configuration at startup. It is injected where it is today, plus the native and Claude backends.
- Process singletons (Claude client, Codex manager) read `isRelayed()` from configuration (a read-only value, Principle 16's exception) and get passes from the existing process slot. Set before listening; a relayed launch with no slot **throws**; no cycle.
- `SandboxManager` receives `SandboxDocker`, `SandboxRecordsStore`, `PeerPairingService`, the pairing service (invite with role), the vault service (status) and settings.
- **Forbidden:** any direct launch on a relayed node; any credential in a sandbox; Docker calls outside `SandboxDocker`; reading C1 outside `ProviderRelayAccess` (except the read-only `isRelayed` value the singletons use).

## Interface Boundary Mapping

| Interface | Responsibility | Identity | Beyond forwarding |
| --- | --- | --- | --- |
| `ProviderRelayAccess.routeFor(runtimeKind)` | `direct` or `{relayId, kind}` for Claude, Codex, Grok, DeepSeek Harness | runtimeKind (never `autobyteus`) | C1 rule |
| `ProviderRelayAccess.routeForNativeProvider(provider)` | `direct` or `{relayId, kind: apiKey}` for one native provider (N-2) | LLM provider | C1 rule |
| `prepareForRun(run, relayId, runtimeKind)` | Grant and pass | run + relay | Listing check (relayed) or vault check (unrelayed) |
| `prepareForNode(relayId)` | Node pass | relay | — |
| `statusOf(runtimeKind)` / `isRelayed()` | Status / mode | runtimeKind | — |
| `PeerRelayClient.relay(nodeId, relayId, kind, request)` | Signed send, streamed reply, marking rules, timeouts | peer node ID | Transport form |
| `SandboxManager.create/runIn/destroy(callerRunId, …)` | Lifecycle | sandboxId + caller | Authorization, serialization |

## Main Domain Subject Naming Check

As SR-003, plus: `relay: { use: "always" | "whenRelayed" }`, `role: "sandbox"`. No drift.

## Existing Capability Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Relay grant and pass | `ProviderRelayAccess`, `RunPassRegistry` | **Extend** (AR-002) |
| Forwarding | `CredentialProxyForwarder` | Extend (several headers) |
| Peer signing | `signPeerRequest` | Reuse, in `PeerRelayClient` |
| Pairing, setup code, import, tools | existing | Reuse |
| Docker | — | Create |

## Final File Responsibility Mapping

| File | Concern |
| --- | --- |
| `credential-proxy/provider-relays/provider-relays.ts` | C3 shape and table |
| `credential-proxy/provider-relays/provider-relay-access.ts` | The extended owner (C1 parse in `provider-relay-settings.ts` beside it) |
| `credential-proxy/provider-relays/provider-relay-proxy-routes.ts` | Local route |
| `credential-proxy/provider-relays/provider-relay-peer-forwarder.ts` | Relayed side |
| `credential-proxy/provider-relay-peer/{provider-relay-peer-handler,relay-login-token-reader,provider-relay-activity-log}.ts` | Relay side |
| `credential-proxy/credential-proxy-forwarder.ts` | Several credential headers, drop list |
| `credential-proxy/run-pass-registry.ts` | Holder |
| `remote-collaboration/channel/peer-relay-client.ts` | C4 transport (R-F) |
| `remote-collaboration/settings/peer-store.ts`, `peer-directory.ts` | `role` field |
| `remote-collaboration/settings/peer-pairing-service.ts` | Invite with `role`, saved by the exchange (R-H) |
| `remote-collaboration/domain/peer-node.ts`, the peer list GraphQL type, `autobyteus-web` Nodes page | `role` carried to the Nodes page label (N-4) |
| `api/rest/remote.ts` | Route registration (own scope: parser, body limit) |
| `runtime-management/acp/acp-agent-launch-profile.ts`, `agent-execution/backends/acp/session/acp-session-launcher.ts`, `runtime-management/grok/grok-build-launch-profile.ts`, DeepSeek Harness profile | ACP relay |
| `agent-execution/backends/claude/session/claude-session-query-options.ts`, `runtime-management/claude/client/claude-sdk-client.ts` | Claude |
| `runtime-management/codex/client/codex-app-server-launch-config.ts` | Codex (per cwd) |
| `agent-execution/backends/autobyteus/available-llm-construction.ts`; autobyteus-ts `llm/llm-factory.ts`, `llm/api/*-llm.ts` | Native endpoint |
| `runtime-management/agent-runtimes/strategies/*` | Status |
| `secret-management/*` (ID, consumer, alias) | C9 |
| `services/server-settings-service.ts` | 5 keys (descriptions) |
| `sandboxes/{sandbox-manager,sandbox-docker,sandbox-platform,sandbox-pairing,sandbox-records-store}.ts` | Sandboxes |
| `agent-tools/sandboxes/*` | Tools |
| `autobyteus-web/electron/server/baseServerManager.ts` | `AUTOBYTEUS_RELEASE_VERSION` |
| `autobyteus-skills: autobyteus-sandboxes/SKILL.md` (other repository) | How an agent uses sandboxes (REQ-018); points to the tools, never restates server internals |

## Platforms

| Platform | Host node from the sandbox | Admission at the host | Status |
| --- | --- | --- | --- |
| macOS, Docker Desktop | `host.docker.internal:<port>` reaches the host's loopback listener (P-1) | Arrives as 127.0.0.1 (NA-3); credential required | Implemented |
| Linux, Docker Engine | `--add-host host.docker.internal:host-gateway`; the host node must also listen on the bridge gateway address | Bridge source refused by NA-3: the host admits the sandbox container's address in memory for its lifetime (`SandboxManager` adds and removes it) | Designed; FU-581-02 |
| Windows, Docker Desktop | As macOS (unverified for 127.0.0.1-bound listeners) | As macOS, else as Linux | Designed; FU-581-02 |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| One relay owner | `access.routeFor("grok_build")` → launcher grants via `prepareForRun` | A second `ProviderRelayRouting` issuing passes |
| Kind per runtime | Claude loginToken and native apiKey on `anthropic` in one sandbox | One kind per relay |
| Reply origin | `x-autobyteus-relay-reply` decides | Every 401 means "not paired" |
| Sandbox lifecycle mark | The host's own peer record says `sandbox` (cleanup, label) | A variable inside the sandbox |

## Removal / Decommission Plan (Mandatory)

| Item | Replaced by |
| --- | --- |
| `providerRelayId` (holder), `grantProviderRelay` | `providerRelays` map, `grantProviderRelays` |
| `AcpAgentLaunchProfile.providerRelayId` | `relay: {relayId, use}` |
| `ProviderRelay.route` / `.consumer` (single) | `routes.apiKey` / `routes.loginToken` |
| Forwarder `token` + route `auth` | `credentialHeaders` + `dropHeaders` |
| Claude vault branch when relayed | Relay env |
| Fixed-only base URLs | Endpoint option |
| SR-003's `ProviderRelayRouting`, egress container, `sandbox-egress.ts`, proxy env | Not built (AR-002, DEC-110) |

## Backward-Compatibility Rejection Log

| Candidate | Decision |
| --- | --- |
| Keep `providerRelayId` beside the new map | Rejected; clean cut |
| A local-vault fallback when the relay peer fails | Rejected; loud refusal |
| A migration for `role` | Not needed: tolerant reader, optional field |

## Change / Refactor Sequence

1. autobyteus-ts endpoint option (FU-003).
2. Pass holder; C3 shape; forwarder headers; `ProviderRelayAccess` extension with C1 (unrelayed behavior unchanged; existing DeepSeek tests stay green).
3. Relay side: route, handler, C5, C9 ID and alias, C10 reader; relayed side: `PeerRelayClient`, peer forwarder, reply mapping.
4. Launch shapes per runtime, with fake-relay shape tests (P-3 to P-7, P-13): native (plus R-E check), Claude, Codex, ACP (Grok, DeepSeek Harness); status (FU-001).
5. Peer `role` (invite carries it; the exchange saves it), the Nodes page label, the sweep's orphan unpairing, with node access model scenarios for the relay route.
6. Sandboxes: Docker boundary, records, pairing (plus role), manager, tools; Electron release version; `AUTOBYTEUS_SANDBOX_IMAGE`.
7. Docs: node access model (route, rule, scenarios), credential proxy, secret management, TESTING, GLOSSARY. Then the public skill `autobyteus-sandboxes` from the final tool contracts (AC-016).
8. Remove the replaced pieces.

## Key Tradeoffs

- **Full network** (DEC-110): simpler, one container. Unauthenticated services on the host's network are reachable (FU-581-05 for a restricted mode).
- **Codex uses the node pass** (one app-server per working directory, shared by its runs).
- **The sandbox image is the host's release;** validating this ticket's code uses `AUTOBYTEUS_SANDBOX_IMAGE` with a locally built image.

## Risks

- U-1 (Codex login token, including whether Codex parses the node pass as a JWT: R-D) and U-2 (Grok login variable): proven live per DEC-108, or reported to the user and marked "not supported" by DEC-010's rule.
- Codex ChatGPT side calls must fit C3's paths (live).

## Guidance For Implementation

- Start from the probes: `probes/fake-relay.py` plus `runtime-shapes.sh` become request-shape tests.
- Never use real credentials outside the test vault. DEC-108's live checks follow its wording. Never print a pass, key or token.
