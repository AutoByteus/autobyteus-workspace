# Credential Proxy (Integrations)

## Scope

The credential proxy lets the agents the user chooses use an outside service
(GitHub first) from their shell, with the user's token, without the token ever
reaching the agent. The user stores the token once in the node's vault (the
GitHub card in Settings) and ticks the agents that may use it. Each run of a
ticked agent gets, in its shell environment, a loopback address that belongs to
that run. Calls to that address are forwarded to the service with the token
added by the server.

The token is never in a shell environment, command line, process listing, tool
output, run trace, server log or run file. What a run holds is its *run pass*,
a capability that works only while the run is active and only for what its agent
is allowed.

## TS Source

- `src/credential-proxy/`
  - `integration-definitions.ts`: the app-owned definitions (GitHub): routes,
    origins, auth formats, allowed methods and paths, shell variables;
  - `integration-connection-store.ts`: `<app-data-dir>/integrations/connections.json`
    (per integration: login, connected time, allowed agent definition IDs);
  - `integration-connection-service.ts`: connect (token checked with GitHub
    first), test, disconnect, agent access;
  - `run-pass-registry.ts`: in-memory run passes;
  - `integration-run-access.ts`: `IntegrationRunAccess`, what backends call;
  - `credential-proxy-forwarder.ts`: the caller-path checks and one forwarded call;
  - `credential-proxy-routes.ts`, `credential-proxy-local-server.ts`: the
    loopback listener and its single route;
  - `integration-activity-log.ts`: `<app-data-dir>/integrations/activity.jsonl`;
  - `credential-proxy-host.ts`: the host the Studio composition owns.
- `src/api/graphql/types/github-integration.ts`: the GitHub card's API.
- Web: `autobyteus-web/components/settings/GitHubIntegrationCard.vue` and
  `stores/githubIntegrationStore.ts`.

## How A Run Gets Its Address

1. A runtime backend preparing a run (new or restored) calls
   `IntegrationRunAccess.environmentForRun({runId, agentDefinitionId}, baseEnv)`.
2. If the agent is ticked for no integration, the result is `{}` and no pass is
   issued: the run is exactly as before.
3. Otherwise the run gets one pass (`rp_` + 32 random bytes, base64url), reused
   while the run is active, and each allowed definition's shell variables.
4. The backend applies the variables to the run's shell:

| Runtime | Where the variables go |
| --- | --- |
| AutoByteus (native) | `initialCustomData.terminalChildEnvironment`, the core seam its terminal tools use for child processes |
| Claude | merged into the run session's Claude Code spawn only (`extraEnvironment`); model listing and control queries are unchanged |
| Codex | the thread `config` sent on `thread/start` and `thread/resume`: `shell_environment_policy.set`, plus `sandbox_workspace_write.network_access = true` for `workspace-write` runs (DEC-011); kept when the run's tool list reopens the thread |
| Antigravity | the `env` of the AGY process (`process.start`), on create and restore |
| Grok Build (ACP) | the agent process `env` from the launcher, after the launch profile's own |

The pass is revoked when the run is released (`AgentRunResourceManager.release`)
and when an activation fails before the run is attached. A server restart ends
all passes; restored runs get new ones.

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
4. the run's agent is allowed now (read on every call, so unticking applies at
   once), else `INTEGRATION_NOT_ALLOWED`;
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

GitHub's definition:

| Route | Upstream | Auth | Allowed |
| --- | --- | --- | --- |
| `api` | `https://api.github.com` | `Authorization: Bearer <token>` | `GET`, `POST`, `PATCH`, `PUT`, `DELETE` on any path (REST and `/graphql`) |
| `git` | `https://github.com` | `Authorization: Basic base64(x-access-token:<token>)` | smart HTTP only: `GET /<owner>/<repo>[.git]/info/refs`, `POST …/git-upload-pack`, `POST …/git-receive-pack` |

## Activity Log

`<app-data-dir>/integrations/activity.jsonl`, one line per call, refusals too:
`at`, `runId`, `agentDefinitionId`, `integrationId`, `route`, `method`, `path`
(without the query string), `status`, `error` (the code, when refused) and
`durationMs`. Never the token, the pass, headers or bodies.

## Integration-Author Contract

What a skill, script or agent can rely on in the shell of a run whose agent is
ticked for GitHub.

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
| 403 | `INTEGRATION_NOT_ALLOWED` | The run's agent is not (or no longer) ticked for GitHub |
| 403 | `INTEGRATION_NOT_CONNECTED` | No GitHub token on this node |
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

What the token can do is what the user gave it: the card recommends a
fine-grained token limited to the needed repositories (a personal-account
Projects board needs a classic token with the `project` scope).

## Security Limits

- **Same-user limit (R-1).** A run pass is a bearer capability: the proxy maps it
  to its run, not to the shell that presents it. Another process of the same OS
  user that reads a live pass (for example from that run's environment) can use
  it while the run is active, within that run's access. Processes of the same
  user can also read the vault key file. Protecting against the same user is a
  non-goal here (autobyteus-310).
- What is refused: an unknown pass, a revoked pass (its run ended or its
  activation failed), a live pass whose agent is not allowed (never ticked or
  unticked since), a missing token, a path or host outside the definition, a
  non-loopback caller.

## Adding An Integration

A new integration (Jira Cloud next) is a new app-owned `IntegrationDefinition`:
its routes (origins, auth format, allowed methods and paths, body handling), its
shell variables, a vault consumer `{kind: "integration", integrationId}` binding
in `ProviderCredentialCatalog`, and its own connection API and card. The proxy,
run passes, runtime delivery, release and activity log are shared. An installed
skill can't add or change a definition: where a token may go is decided by the
app.

## Tests

- `tests/unit/credential-proxy/credential-proxy-core.test.ts`: definitions, path
  checks, passes, run access, store.
- `tests/integration/credential-proxy/`: the host against a fake upstream
  (refusals, auth formats, redaction, redirects, activity, revocation, logging);
  the connection service over a real vault; real `git clone`/`push` through the
  proxy to a local `git http-backend` that requires GitHub's Basic format.
- Per-runtime delivery: the AutoByteus, Claude, Codex, AGY and ACP backend tests
  under `tests/unit/agent-execution/backends/`, and release in
  `agent-run-manager.test.ts`.
- `tests/e2e/credential-proxy/github-integration-graphql.e2e.test.ts`: the GraphQL
  on a built server.
- `tests/e2e/credential-proxy/github-credential-proxy-live.e2e.test.ts`: gated
  live check against GitHub (`RUN_GITHUB_PROXY_E2E=1`, see `TESTING.md`).
- Web: `GitHubIntegrationCard.spec.ts` and the rendered probe
  `pnpm -C autobyteus-web test:e2e:github-integration-card`.

## Related Documentation

- [Secret Management](./secret_management.md)
- [Agent Tools MCP Server](./agent_tools_mcp_server.md)
- [Codex Integration](./codex_integration.md)
