# Credential Proxy (Integrations and Provider Relays)

## Scope

The credential proxy lets agents use an outside service (GitHub first) from
their shell, with the user's token, without the token ever reaching the agent.
The user imports an integration on the **Integrations page** (from a GitHub
repository or a local folder, as a skill source), stores its token once in the
node's vault from the integration's card, and adds the integration's skill to the
agents that should use it, as with any skill. Each run of such an agent gets, in
its shell environment, a loopback address that belongs to that run. Calls to that
address are forwarded to the service with the token added by the server.

The token is never in a shell environment, command line, process listing, tool
output, run trace, server log or run file. What a run holds is its *run pass*,
a capability that works only while the run is active and only for what its agent
is allowed.

The proxy also forwards a runtime's own model calls through a **provider relay**
(DeepSeek Harness → DeepSeek's Messages API on every node; every supported
runtime on a relayed node, through its relay node), adding the provider credential
outside the runtime, so the runtime never holds it. See
[Provider Relays](#provider-relays).

## TS Source

- `src/credential-proxy/`
  - `delivery-definitions.ts`: the app-owned delivery definitions (GitHub):
    routes, origins, auth formats, allowed methods and paths, shell variables,
    the token check (`verifyToken`). No name or description: those are the
    manifest's;
  - `integration-manifest.ts`: reads one integration folder by the manifest
    contract;
  - `integration-catalog.ts`: the integrations in the imported skill sources,
    their state and tools; import, update and removal of a source; the source
    observer;
  - `tool-presence.ts`: a prerequisite's `PATH` lookup;
  - `integration-access-rule.ts`: who may use an integration (full check at run
    preparation, cheap check per call);
  - `integration-connection-store.ts`: `<app-data-dir>/integrations/connections.json`
    (per integration: the login and when it was connected);
  - `integration-connection-service.ts`: connect (token checked with the service
    first), test, disconnect, per integration;
  - `run-pass-registry.ts`: in-memory run passes, each with the run's
    integration grants and its provider relay grants (with their relay credential
    kind), and a relayed node's node pass;
  - `run-pass-revocation.ts`: `RunPassRevocation`, the one way a pass ends
    (`CredentialProxyHost.runPasses`, used by the run managers);
  - `integration-run-access.ts`: `IntegrationRunAccess`, what backends call; its
    read `integrationsStartingOnRestart` tells [Skill Update Notices](./skill_update_notices.md)
    which integrations a skill added mid-run grants that the run's pass does not
    hold yet (their access starts at a restart; nothing is granted);
  - `provider-relays/`: the provider relays (definitions C3, the relayed-node
    settings C1, the `/relay/…` route family, the refusals, the relayed side's
    peer forwarder, the Messages stream reader, `ProviderRelayAccess` with its
    per-run observers, the process relay slot);
  - `provider-relay-peer/`: the relay node's side of relayed calls (the handler,
    the activity log, the Codex and Grok login reader, the relay offer a new
    sandbox gets);
  - `credential-proxy-forwarder.ts`: the caller-path checks and one forwarded call;
  - `credential-proxy-routes.ts`, `credential-proxy-local-server.ts`: the
    loopback listener and its integration route (`/r/…`); the listener also
    registers the provider relays' routes (`/relay/…`);
  - `integration-activity-log.ts`: `<app-data-dir>/integrations/activity.jsonl`;
  - `credential-proxy-host.ts`: the host the Studio composition owns.
- `src/api/graphql/types/integrations.ts`: the Integrations page's API.
- `src/skills/services/skill-source-service.ts`: the import option and the
  source-change observer (see [Skills](./skills.md)).
- Web: `autobyteus-web/pages/integrations.vue`, `components/integrations/*` and
  `stores/integrationsStore.ts` (see `autobyteus-web/docs/integrations.md`).

## Integrations And Their Sources

An integration is one top-level folder of an imported skill source (a local
folder or a GitHub repository) that holds both `integration.json` and `SKILL.md`
(`AutoByteus/autobyteus-integrations` `docs/integration-manifest.md`). The
folder name is its ID (`^[a-z][a-z0-9-]*$`); the `SKILL.md` `name` is its
skill; `integration.json` holds only `name`, `description`, optional
`token.help` and optional `prerequisites`; an optional `icon.svg` is kept when it
is an SVG document under 64 KB, as a `data:image/svg+xml` URL shown only as an
`<img>`. An invalid folder is skipped with a warning naming it and the reason.

`IntegrationCatalog` reads the sources from disk on every call (no cache, no
network): the local skill folders and the ACTIVE GitHub sources. Each entry's
state: `NEEDS_NEWER_APP` when the app has no delivery definition for its ID
(DEC-001: where a token may go is decided by the app), else `CONNECTED` with the
login when its token is stored, else `NEEDS_TOKEN`. Tools are looked up on the
server's `PATH`. Two sources with one ID (possible only through a Skills-page
import): the entry from the source first in the skill catalog's own precedence is
kept, the other is skipped with a warning (DEC-017).

- **Import** (`importIntegrations`): a GitHub repository link becomes a managed
  GitHub skill source; an absolute or `~` path a local skill source (nothing is
  copied). The source must hold an integration folder, and none named like an
  integration already imported, else nothing is imported. Coded outcomes:
  `NOT_A_LINK_OR_PATH`, `ALREADY_IMPORTED`, `DIRECTORY_NOT_FOUND`,
  `SKILL_NAME_CONFLICT`, `NO_INTEGRATIONS_FOUND`, `INTEGRATION_ALREADY_IMPORTED`,
  `GITHUB_UNREACHABLE` (with the reason).
- **Remove** (from the Integrations page or the Skills page): before the source
  goes, `SkillSourceService` tells its observer, the catalog, which disconnects
  every connected integration whose kept entry is in it (DEC-015). If that fails,
  the removal is refused, so no token is left without a card. A local folder's
  files are never deleted.
- **Update** of a GitHub source (manual or automatic): before the new revision is
  published, the catalog disconnects the integrations it drops; a failure refuses
  the update (DEC-016).

A token saved before an integration source was imported (a node that used the
earlier GitHub card, or the GitHub connection line below) stays in the vault; its
card shows it connected once the source is imported.

### The GitHub Token's Second User: Private Repositories

The GitHub token is also this node's **GitHub connection** for imports and updates
of private repositories (Agent Packages, Skill sources, integration sources;
autobyteus-627). The GitHub client of `src/integrations/github/` reads it with
`readNodeGitHubToken` only when GitHub answers "not visible" to a request sent
without a token, and sends it as a request header to GitHub's own hosts; see
[Agent Packages](agent_packages.md#private-github-repositories). It never imports
the credential proxy.

- **Connect without an imported integration.** GraphQL `githubConnection`,
  `connectGitHub(token)` and `disconnectGitHub` (the **GitHub connection line** in
  the import areas) call the same `IntegrationConnectionService` (still the only
  writer: token checked with GitHub's `/user` before it is saved), without
  `requireImported`. Both connect paths trim the token and refuse an empty one
  (`TOKEN_REQUIRED`); errors carry the same codes.
- **Agents' access is unchanged.** A token connected from an import area reaches
  agents only through the GitHub integration's skill (the access rule above).
- **One token (DEC-001).** Disconnecting anywhere, or removing the GitHub
  integration's source (DEC-015), also ends private imports and updates; their
  next check fails with "connect GitHub". The connection line says what the token
  is used for.

## Who May Use An Integration

`IntegrationAccessRule` owns the one access fact (REQ-005): a run may use an
integration when its agent definition's **effective skills** (its configured
skills, or every installed skill for an agent set to all installed skills; disabled
skills excluded) hold the integration's skill, **the copy in the integration's own
folder**. A same-named skill from anywhere else grants nothing.

- At run preparation (full check): the agent definition is read, its skills are
  resolved (shared, team-local and application-owned agents alike), and each
  granted integration is recorded with the run's pass: its skill and its source.
- On every proxied call (cheap, no catalog rebuild): the agent definition is read
  again and must still have the skill (by name, or all installed skills), the
  skill must not be disabled, and the recorded source must still be registered.
  So removing the skill from an agent, disabling it or removing its source stops
  the run's next call. A same-named skill that wins precedence later is caught at
  the next preparation.

## How A Run Gets Its Address

1. A runtime backend preparing a run (new or restored) calls
   `IntegrationRunAccess.environmentForRun({runId, agentDefinitionId}, baseEnv)`.
2. If the access rule grants no integration, the result is `{}` and no pass is
   issued: the run is exactly as before (an active pass from an earlier process
   generation keeps no grants).
3. Otherwise the run gets one pass (`rp_` + 32 random bytes, base64url), reused
   while the run is active, with its grants, and each granted integration's shell
   variables. `environmentForRun` is async: the full check reads the agent
   definition.
4. The backend applies the variables to the run's shell:

| Runtime | Where the variables go |
| --- | --- |
| AutoByteus (native) | `initialCustomData.terminalChildEnvironment`, the core seam its terminal tools use for child processes |
| Claude | merged into the run session's Claude Code spawn only (`extraEnvironment`); model listing and control queries are unchanged |
| Codex | the thread `config` sent on `thread/start` and `thread/resume`: `shell_environment_policy.set`, plus `sandbox_workspace_write.network_access = true` for `workspace-write` runs (DEC-011; built with the run's writable roots by `buildCodexSandboxWorkspaceWriteConfig`); kept when the run's tool list reopens the thread |
| Antigravity | the `env` of the AGY process (`process.start`), on create and restore |
| Grok Build, DeepSeek Harness (ACP) | the agent process `env` from the launcher, after the launch profile's own |

The pass ends through `RunPassRevocation.revokeForRun` when the run is released
(`AgentRunResourceManager.release`) and when an activation fails before the run
is attached (`AgentRunManager`), with every grant it holds. A server restart ends
all passes; restored runs get new ones. Every composition that gives runs an
integration access or a provider relay access also gives both run managers the
same host's `runPasses`.

Measured for Codex (0.166.0, autobyteus-311 R-4): the thread-level tables merge
with the user's own `~/.codex/config.toml` tables. A user's own
`shell_environment_policy` (`inherit`, `set`) and `sandbox_workspace_write`
(`writable_roots`) still apply to AutoByteus Codex runs with an integration.

## The Proxy

`CredentialProxyLocalServer` is its own Fastify listener on `127.0.0.1` with an
ephemeral port, like the Agent Tools MCP listener. It is never on the main
server, so it is not exposed when remote access is on. It reuses
`AgentToolsMcpLocalAccessGate` (loopback peer and `Host`). It has no access-log
policy and Fastify's own logger is off, because the URL path carries the pass.

One route: `/r/:pass/:integrationId/:route/<path>?<query>`. In order:

1. loopback gate, else `NOT_LOOPBACK`;
2. the pass is live, else `RUN_PASS_INVALID`;
3. the integration and route exist, else `PATH_NOT_ALLOWED`;
4. the run was granted the integration and the access rule's per-call check
   still allows it, else `INTEGRATION_NOT_ALLOWED`;
5. the caller's path: refused if it has `\`, `%5c`, `%2f`, `.`/`..` segments
   (also encoded), empty segments or bad encoding; the upstream URL is built on
   the route's own origin and must keep that origin; the route's methods and
   paths apply. Else `PATH_NOT_ALLOWED`;
6. the token from the vault, else `INTEGRATION_NOT_CONNECTED`;
7. the forwarded call (below);
8. one activity record.

Every refusal happens before any upstream call and is recorded.

Forwarding (`CredentialProxyForwarder`):

- drops the caller's `Authorization`, `Cookie`, `Host`, hop-by-hop, `Expect`,
  `Accept-Encoding`, `Content-Length` and `Proxy-*` headers, then adds the
  route's auth and asks for an identity (uncompressed) response;
- the API route buffers the request body; the git route streams it;
- `redirect: "manual"`: a redirect to the route's own origin is rewritten to the
  same run's proxy address; a redirect elsewhere (for example a signed download
  URL) passes unchanged;
- the token is replaced with `[REDACTED]` in response headers and, on the API
  route, in text and JSON bodies. Git packs stream through unchanged;
- on the git route only, GitHub's `401` becomes `403 UPSTREAM_REJECTED_TOKEN`, so
  git fails at once instead of prompting for a password. The API route passes
  GitHub's `401` through.

Refusal texts name the integration from its manifest (its ID when it is no
longer imported), read only when a refusal is written:

- `INTEGRATION_NOT_ALLOWED`: "This agent has no access to {name}. Add the {skill}
  skill to the agent."
- `INTEGRATION_NOT_CONNECTED`: "{name} is not connected on this node. Connect it
  on the Integrations page."
- `UPSTREAM_REJECTED_TOKEN`: "{name} rejected the stored token. Check it on the
  Integrations page."

GitHub's delivery definition:

| Route | Upstream | Auth | Allowed |
| --- | --- | --- | --- |
| `api` | `https://api.github.com` | `Authorization: Bearer <token>` | `GET`, `POST`, `PATCH`, `PUT`, `DELETE` on any path (REST and `/graphql`) |
| `git` | `https://github.com` | `Authorization: Basic base64(x-access-token:<token>)` | smart HTTP only: `GET /<owner>/<repo>[.git]/info/refs`, `POST …/git-upload-pack`, `POST …/git-receive-pack` |

## Provider Relays

A provider relay is the proxy's app-owned forwarding of one provider's model
calls (not Model Routing, and not an integration). The relays (C3,
`provider-relays/provider-relays.ts`) each have an API-key route and, for three of
them, a login-token route. Paths are the provider's own (base path empty), as a
client given the relay as its endpoint calls them; only inference, model-listing
and the CLIs' own account paths are allowed.

| Relay | Upstream | API key attached | Login token attached |
| --- | --- | --- | --- |
| `anthropic` | `api.anthropic.com` (`/v1/messages`, `/v1/messages/count_tokens`, `/v1/models`) | `x-api-key` (`provider.anthropic.api-key`) | `Authorization: Bearer` (`provider.anthropic.login-token`, C9); Claude Code's own `anthropic-beta` passes |
| `openai` | `api.openai.com` (`/v1/responses…`, `/v1/chat/completions`, `/v1/models`); login token: `chatgpt.com` (`/backend-api/codex/*`, `/backend-api/wham/*`, `/backend-api/ps/*`) | `Authorization: Bearer` (`provider.openai.api-key`) | the relay node's own Codex login: `Authorization: Bearer <access_token>` and `chatgpt-account-id`, the caller's account dropped |
| `xai` | `api.x.ai` (`/v1/chat/completions`, `/v1/responses`, `/v1/messages`, models, `/v1/api-key`) | `Authorization: Bearer` (`provider.grok.api-key`) | the relay node's own Grok login, Bearer |
| `deepseek` | `api.deepseek.com` (`POST /anthropic/v1/messages` for DeepSeek Harness, `POST /chat/completions` for native DeepSeek) | `x-api-key` (`provider.deepseek.api-key`) | none |
| `gemini` | `generativelanguage.googleapis.com` (`generateContent`, `streamGenerateContent`, `countTokens`, models) | `x-goog-api-key` (AI Studio key) | none |
| `kimi`, `glm`, `qwen`, `mistral`, `minimax` | the provider's chat API | `Authorization: Bearer` (the provider's key) | none |

Every key is read through the consumer `providerRelay/<relayId>/<kind>`, which
only the proxy uses; no runtime ever receives it.

**Who uses a relay.** `ProviderRelayAccess` is the only owner of the decision.
On an unrelayed node only DeepSeek Harness goes through a relay (`deepseek`),
with this node's own key; every other runtime calls its provider itself. On a
**relayed node** (`AUTOBYTEUS_PROVIDER_RELAY_PEER` set, C1) every supported
runtime goes through its relay and the relay node attaches the credential:

| C1 setting (read once at start) | Meaning |
| --- | --- |
| `AUTOBYTEUS_PROVIDER_RELAY_PEER` | The relay node's node ID (a paired peer). Empty: not relayed. |
| `AUTOBYTEUS_PROVIDER_RELAYS` | The relays the relay node has API keys for. |
| `AUTOBYTEUS_PROVIDER_RELAY_LOGIN_TOKEN_RUNTIMES` | The runtimes (`claude_agent_sdk`, `codex_app_server`, `grok_build`) that run on the relay node's login token. |

A runtime listed in the third setting uses `loginToken` on its relay, otherwise
`apiKey` when its relay is listed, otherwise it is signed out with the reason
(`routeFor`, `statusOf`). Native (AutoByteus) providers always use `apiKey`
(`routeForNativeProvider`); local providers (Ollama, LM Studio, custom
endpoints) stay direct. Antigravity cannot be relayed and is signed out on a
relayed node. A malformed value stops startup (`PROVIDER_RELAY_SETTINGS_INVALID`).

**A run's access.** `prepareForRun(run, relayId, runtimeKind)` grants the relay on
the run's pass with its relay credential kind and returns the relay's base URL,
the pass and the kind. Unrelayed, it refuses with `RELAY_KEY_NOT_SET` when the
vault holds no key; relayed, it refuses with `RELAY_NOT_LISTED` when C1 offers no
credential for that runtime (no local vault check). `prepareForNode(relayId,
runtimeKind)` gives a relayed node's shared processes (Codex app-servers, Claude
control queries, Grok discovery) the **node pass**. The launch shapes:

| Runtime | Relay variables |
| --- | --- |
| Native (AutoByteus) | the autobyteus-ts client's endpoint is the relay (FU-003); the pass is its key |
| Claude Agent SDK | `ANTHROPIC_BASE_URL`; `ANTHROPIC_API_KEY` (apiKey) or `CLAUDE_CODE_OAUTH_TOKEN` (loginToken); none of the node's own Claude credentials |
| Codex | apiKey: a custom provider on the relay with the node pass as its bearer; loginToken: `chatgpt_base_url` on the relay and a placeholder login in its own `CODEX_HOME` under the server data |
| Grok Build | `GROK_XAI_API_BASE_URL`; `XAI_API_KEY` (apiKey) or `GROK_AUTH_PROVIDER_ACCESS_TOKEN` (loginToken) |
| DeepSeek Harness | `DEEPSEEK_BASE_URL=<relay>/anthropic`, `DEEPSEEK_API_KEY=<pass>` (every node) |

A relayed launch without the proxy (the standalone application host) refuses
loudly (`PROVIDER_RELAY_UNAVAILABLE`); it never launches directly.

**The local route** `/relay/<relayId>/<path>`, in order:

1. loopback gate, else `NOT_LOOPBACK` (403 `permission_error`);
2. a known relay, else `PATH_NOT_ALLOWED` (404 `not_found_error`);
3. a live pass in the runtime's credential header (`x-api-key`,
   `Authorization: Bearer` or `x-goog-api-key`), else `RUN_PASS_INVALID` (401
   `authentication_error`);
4. the pass holds this relay's grant (its kind), else `RELAY_NOT_ALLOWED` (403);
5. the path and method on that kind's route, else `PATH_NOT_ALLOWED`;
6. unrelayed: the key from the vault, else `RELAY_KEY_NOT_SET` (403), and the call
   forwarded with it; relayed: the call sent to the relay node (below).

**Relayed calls (C4).** On a relayed node the call (the pass and every local
credential header dropped, the body read whole up to 32 MiB) is signed with the
pair's peer secret and sent to
`/rest/remote/provider-relays/<relayId>/<kind><path>?fromNodeId=…&toNodeId=…`
on the relay node (`PeerRelayClient`; timeouts: connect 10 s, response headers
300 s, 300 s between body chunks, no total). The relay node's gate admits the
peer by its signature (NA-9); its handler (`ProviderRelayPeerHandler`) then, in
order: refuses an unknown relay, kind, path or method (`PATH_NOT_ALLOWED`); a
`loginToken` call while its `AUTOBYTEUS_PROVIDER_RELAY_LOGIN_TOKENS` is off
(`RELAY_LOGIN_TOKENS_OFF`); a missing credential (`RELAY_KEY_NOT_SET`,
`RELAY_LOGIN_TOKEN_NOT_SET`) or an expired Codex or Grok login
(`RELAY_LOGIN_EXPIRED`); then forwards with exactly the declared kind's
credential (no swap) and writes one activity line. Every reply it sends is marked
`x-autobyteus-relay-reply: forwarded | refused`; the relayed side passes a marked
reply unchanged (a provider 401 stays the provider's) and maps an unmarked one:
401 → `RELAY_PEER_NOT_ACCEPTED`, 403 with a code → `RELAY_PEER_REFUSED`, 503
`NODE_IDENTITY_NOT_MIGRATED` → `RELAY_PEER_UNAVAILABLE`, any other →
`RELAY_PEER_FAILED`. Before sending it refuses `RELAY_PEER_UNAVAILABLE` (not a
paired peer, or remote collaboration off), `RELAY_BODY_TOO_LARGE`, and after
`RELAY_PEER_UNREACHABLE`. There is never a fallback to local credentials.

Refusals use the Anthropic Messages error envelope,
`{"type":"error","error":{"type":<type>,"code":<code>,"message":<text>}}`, the
only failure shape whose text every runtime shows; `authentication_error` and
`permission_error` are never retried. The relays log no pass and no header value.

**Login tokens (C9, C10).** Off unless the relay node's owner sets
`AUTOBYTEUS_PROVIDER_RELAY_LOGIN_TOKENS=true`. Claude's comes from `claude
setup-token`, stored once with `pnpm secrets:import` (`CLAUDE_CODE_OAUTH_TOKEN=…`
in the source file → `provider.anthropic.login-token`), never in the plain-text
settings. Codex's and Grok's are the relay node's own logins
(`$CODEX_HOME/auth.json` or `~/.codex/auth.json`; `~/.grok/auth.json`), read for
each call and never renewed by AutoByteus; an expired one is refused so its owner
signs in again.

**Provider relay activity (C5).** On the relay node,
`<app-data-dir>/provider-relays/activity.jsonl`: one line per relayed call,
refusals too: `at`, `peerNodeId`, `relayId`, `relayCredentialKind`, `method`,
`path` (no query), `status` or `error`, `durationMs`. Never a header value, body,
key, token or pass.

**Provider call observations.** For each forwarded call of a relay that reads its
stream (only `deepseek` today) the route reports to the run's observers
(`ProviderRelayAccess.observe(runId, listener)`, removed by the returned
function, exactly that registration): `started` (with the purpose: `compaction`
when the relay's compaction header is `1`, else `turn`), `activity` (at most once
a second per call while the reply streams) and `finished` (the status, and the
usage and stop reason read from the Messages stream) synchronously when the reply
ends. The ACP session turns them into effects; the proxy never builds AutoByteus
events.

**Process relay slot.** The studio composition sets the process's
`ProviderRelayAccess` when it creates the proxy host (before it listens) and
clears it when it closes it. The process singletons read it: the model catalog,
runtime availability and sign-in, the native provider settings, the Claude client
and the Codex app-servers (`processNodeRelayAccess`), and Grok discovery. On a
relayed node a singleton that finds no slot refuses loudly; the standalone host
never sets it.

## Activity Log

`<app-data-dir>/integrations/activity.jsonl`, one line per call, refusals too:
`at`, `runId`, `agentDefinitionId`, `integrationId`, `route`, `method`, `path`
(without the query string), `status`, `error` (the code, when refused) and
`durationMs`. Never the token, the pass, headers or bodies.

## Integration-Author Contract

What a skill, script or agent can rely on in the shell of a run whose agent has
the GitHub integration's skill (`github-integration` in the official repository).

Variables:

| Variable | Value |
| --- | --- |
| `AUTOBYTEUS_GITHUB_API_URL` | `http://127.0.0.1:<port>/r/<pass>/github/api`: use it where you would use `https://api.github.com` |
| `GIT_CONFIG_COUNT`, `GIT_CONFIG_KEY_n`, `GIT_CONFIG_VALUE_n` | git's `url.<proxy git address>.insteadOf = https://github.com/`, appended after any `GIT_CONFIG_*` entries already in the environment |
| `GIT_TERMINAL_PROMPT` | `0`: git never prompts |

In a run without GitHub access, `AUTOBYTEUS_GITHUB_API_URL` is unset and git
uses `https://github.com` as before. Check the variable to tell the two apart.

Examples:

```bash
# REST
curl -s "$AUTOBYTEUS_GITHUB_API_URL/repos/OWNER/REPO/issues?state=open"
curl -s -X POST "$AUTOBYTEUS_GITHUB_API_URL/repos/OWNER/REPO/issues/1/comments" -d '{"body":"Done"}'
# GraphQL
curl -s -X POST "$AUTOBYTEUS_GITHUB_API_URL/graphql" -d '{"query":"{ viewer { login } }"}'
# gh api with a full URL. gh sends nothing without a token of its own; any value
# works, because the proxy drops it and adds the stored token.
GH_TOKEN=unused gh api "$AUTOBYTEUS_GITHUB_API_URL/user"
# git: unchanged URLs
git clone https://github.com/OWNER/REPO.git && git push
```

Errors: the proxy answers its own refusals as JSON `{"error": "<CODE>",
"message": "<text>"}`; any other answer is GitHub's own.

| Status | Code | Meaning |
| --- | --- | --- |
| 403 | `RUN_PASS_INVALID` | The address is not valid: the run has ended, or it never had access |
| 403 | `INTEGRATION_NOT_ALLOWED` | The run's agent does not (or no longer) have the integration's skill, the skill is disabled, or its source was removed |
| 403 | `INTEGRATION_NOT_CONNECTED` | No GitHub token on this node (connect it on the Integrations page) |
| 403 | `PATH_NOT_ALLOWED` | The path or method is outside GitHub's definition |
| 403 | `UPSTREAM_REJECTED_TOKEN` | git only: GitHub rejected the stored token (expired or revoked) |
| 403 | `NOT_LOOPBACK` | The call did not come from this machine |
| 502 | `UPSTREAM_UNREACHABLE` | GitHub could not be reached |
| 500 | `PROXY_FAILED` | An unexpected failure in the proxy |

Not supported:

- `gh`'s own commands (`gh issue list`, `gh pr create`, …): they talk HTTPS to
  their own host. Use `gh api` with the full URL, or `curl`;
- git LFS (`info/lfs`), `git archive` over HTTP and other non-smart-HTTP git
  paths;
- `uploads.github.com` (release asset uploads) and any other GitHub host;
- a Codex run in the `read-only` sandbox gets the variables, but its shell can't
  connect to the proxy (Codex blocks the network there). Runs with auto-execute on
  (`danger-full-access`) and `workspace-write` runs work.

What the token can do is what the user gave it: the integration's `token.help`,
shown when connecting, says what to create (for GitHub, a fine-grained token
limited to the needed repositories).

## Security Limits

- **Same-user limit (R-1).** A run pass is a bearer capability: the proxy maps it
  to its run, not to the shell that presents it. Another process of the same OS
  user that reads a live pass (for example from that run's environment) can use
  it while the run is active, within that run's access. Processes of the same
  user can also read the vault key file. Protecting against the same user is a
  non-goal here (autobyteus-310).
- **Agents set to all installed skills** get every connected integration (the
  user's DEC-002: an integration skill is a normal skill).
- **Imported repositories.** An imported integration's scripts can use the
  service as the user through the proxy, so import only trusted repositories, as
  with any skill (DEC-013). Repository text is shown as text: in `token.help` only
  `https:` addresses become links.
- What is refused: an unknown pass, a revoked pass (its run ended or its
  activation failed), a live pass whose agent no longer has the skill (or the skill
  is disabled, or its source was removed), a missing token, a path or host outside
  the definition, a non-loopback caller.
- **Provider relays.** The DeepSeek relay forwards only `POST
  /anthropic/v1/messages` (and native DeepSeek's `POST /chat/completions`) to `api.deepseek.com`, only for a live pass with the
  relay grant, only from loopback. An agent with integrations sees its pass in its
  integration addresses and could call the relay itself: it then gets model calls
  on the user's key, never the key.

## Adding An Integration

A new integration (Jira Cloud next) has two parts:

- in the app, a new `DeliveryDefinition`: its routes (origins, auth format,
  allowed methods and paths, body handling), its shell variables, its token check,
  and a vault consumer `{kind: "integration", integrationId}` binding in
  `ProviderCredentialCatalog`. A connect step other than a token gets its own form
  on the card (DEC-010);
- in a repository, its folder (manifest, skill, scripts, optional icon).

Until the app has the definition, the imported folder's card says "Needs a newer
AutoByteus". The proxy, run passes, runtime delivery, release, access rule and
activity log are shared. An imported repository can't add or change a delivery
definition: where a token may go is decided by the app.

## Tests

- `tests/unit/credential-proxy/`: delivery definitions and the token check, path
  checks, passes and grants, run access, store (`credential-proxy-core.test.ts`);
  the manifest rules and tool presence (`integration-manifest.test.ts`); relay
  grants, revocation, observers, relay access, the stream reader and `x-api-key`
  forwarding (`provider-relays.test.ts`).
- `tests/integration/credential-proxy/provider-relay.integration.test.ts`: the
  DeepSeek relay on the real listener against a fake upstream (key swap,
  unchanged streamed body and reply, observations, every refusal, revocation).
- `tests/integration/credential-proxy/`: the catalog and the access rule over the
  real skill services (`integration-catalog.integration.test.ts`: states, every
  import outcome, DEC-017 precedence, removal from either page, a refused removal,
  an update that drops an integration, access in both scopes, a same-named skill,
  disabled, removed skill, removed source); the host against a fake upstream
  (refusals and their texts, auth formats, redaction, redirects, activity,
  revocation, logging); the connection service over a real vault; real
  `git clone`/`push` through the proxy to a local `git http-backend` that requires
  GitHub's Basic format.
- Per-runtime delivery: the AutoByteus, Claude, Codex, AGY and ACP backend tests
  under `tests/unit/agent-execution/backends/`, and release in
  `agent-run-manager.test.ts`.
- `tests/e2e/credential-proxy/integrations-graphql.e2e.test.ts`: the GraphQL on a
  built server.
- `tests/e2e/credential-proxy/github-credential-proxy-live.e2e.test.ts`: gated
  live check against GitHub (`RUN_GITHUB_PROXY_E2E=1`, see `TESTING.md`): import
  by link on a built server, connect, remove; the integration's own scripts through
  the proxy for an agent with its skill, from a GitHub source and a local folder.
- `tests/e2e/credential-proxy/github-credential-proxy-runtime-shells.e2e.test.ts`:
  gated real runs per runtime, with the skill added and removed.
- Web: `components/integrations/__tests__/IntegrationsPage.spec.ts` and the
  rendered probe `pnpm -C autobyteus-web test:e2e:integrations-page`.

## Related Documentation

- [Secret Management](./secret_management.md)
- [Skills](./skills.md)
- [Agent Tools MCP Server](./agent_tools_mcp_server.md)
- [Codex Integration](./codex_integration.md)
