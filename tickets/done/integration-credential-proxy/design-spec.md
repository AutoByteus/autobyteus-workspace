# Design Spec — Credential proxy for integrations, step 1: GitHub (autobyteus-311)

## Solution And Approval Basis

- Current solution revision ID: `SR-005` (SR-004 revised SR-003 after ARCH-REV-001; SR-005 records the user's DEC-011)
- Approved requirements: `requirements-doc.md` at SR-002, REQ-001…REQ-012, AC-001…AC-008 and DEC-001…DEC-010. Approved by the **User** on 2026-10-30; the quote is in the Document Status. DEC-010 (keep it simple: always through our own process) was added the same day at the user's direction.
- Behavior-defining supplements: none. 244 `solution-validation.md` V1/V1b is the design basis, read-only.
- Design status: `Ready`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/integration-credential-proxy/tickets/in-progress/integration-credential-proxy/investigation-notes.md`, sections "Architecture Investigation Findings" M-1…M-4 and the Read table.
- Authorities read (2026-10-30):
  - `references/architecture-design.md`;
  - `references/design-principles.md` (full);
  - `DESIGN.md` (rules 1–10, "Start simple", project documents);
  - `GLOSSARY.md` (headings);
  - `docs/design-cases.md` (Cases 1–7, read in autobyteus-244);
  - `TESTING.md` "Test vault".
- Conflicts or discrepancies: none.

## Current-State Read

- **No path hands a vault credential to a script.** Vault consumers are provider keys, search, media, Claude, and MCP secrets (`secret-id.ts` L4-21).
- **There is already a server-owned endpoint for agents: the Agent Tools MCP host.**
  - It is its own Fastify server on `127.0.0.1:0`, with request logging off (`agent-tools-mcp-local-server.ts` L26-40, L67-77).
  - Its loopback gate checks the remote address, `Host` and `Origin` (`agent-tools-mcp-local-access.ts` L9-24).
  - Each external backend activates a per-run session when it prepares the run (`activateForRun` call sites: Claude L28, Codex L324, AGY L126, ACP L185).
  - One release point deactivates it for every run removal (`agent-run-resource-manager.ts` L95-119).
- **A per-run shell environment can be supplied per runtime:**
  - native: core's `customData.terminalChildEnvironment` (`terminal-child-environment.ts` L1-8). It currently has no supplier, and the env it returns replaces `process.env` (`direct-shell-session.ts` L111-112);
  - Claude: spawn env per session (`claude-sdk-client.ts` L351-364);
  - Codex: per-thread `config.shell_environment_policy.set` (measured M-1);
  - AGY: `env: input.env` (`agy-stream-process.ts` L41);
  - Grok/ACP: `launchProfile.env(...)` (`acp-session-launcher.ts` L86).
- **GitHub auth formats differ by endpoint:** the API takes `Bearer`; the git endpoint needs `Basic x-access-token:<token>` (M-3).
- **Precedent for a vault-backed settings card:** search provisioning (`search-provisioning-service.ts` L57, L88; `server-settings.ts` L74-110).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`. A new server subsystem (proxy host, run passes, connection service, activity log); the run lifecycle in five runtime backends; a vault consumer kind; GraphQL; a web card.
- Architectural risk: `High`. A new security boundary (a local listener that adds credentials); a per-run identity used across runtimes; new persisted files; a new contract for integration authors.
- Escalation trigger:
  - a runtime whose shell can't receive the run's variables;
  - any place where the token would reach a shell, file, log or response;
  - a proxy path reachable from a non-loopback address.

## Architecture Investigation Evidence

Investigation notes: M-1 (Codex per-thread env works), M-2 (clone and push with git config from env only), M-3 (git needs Basic, the API takes Bearer), M-4 (Docker git 2.43). Also the Read table with file:line for every statement above.

## Intended Change

A new **credential proxy** inside the AutoByteus server, a sibling of the Agent Tools MCP host:
- **Local server:** a loopback-only server on `127.0.0.1:<random port>`.
- **Run passes:** when a run of an allowed agent is prepared, the run gets a **run pass** (random, in memory, revoked at release). Its shell gets the GitHub address and git's redirection, both containing the pass.
- **Forwarding:** each call is checked (the pass, the agent's access, the definition's routes) and forwarded to GitHub, with the token from the vault in the route's auth format. The response is redacted and recorded.
- **Connecting:** the user connects GitHub on a Settings card; the token goes to the vault, and the login and allowed agents go to a small file.

## Change Scope (Mandatory)

In scope (UC-001…UC-004):
- **autobyteus-server-ts:**
  - a new subsystem `src/credential-proxy/`;
  - the vault consumer kind `integration`;
  - the per-run hook in the five backends and at resource release;
  - wiring in the studio composition;
  - GraphQL for the GitHub connection.
- **autobyteus-web:** `GitHubIntegrationCard.vue`, its store, queries and mutations, codegen, and en + zh-CN text.
- **Docs:**
  - new `autobyteus-server-ts/docs/modules/credential_proxy.md` (including the integration-author contract, REQ-012);
  - `secret_management.md` (the new consumer);
  - `GLOSSARY.md` (a new "Integrations" section);
  - `docs/design-cases.md` (one case, see Guidance);
  - TESTING.md (the GitHub live check).

Deliberately left alone:
- the Agent Tools MCP host (reused as a pattern, not changed);
- `src/integrations/github/` (the GitHub download transport for skill sources: another concern, see Terminology);
- the standalone application host (its runs get no integration access in this step; Interface table);
- MCP secrets and provider keys;
- the ambient `gh` login and the inherited server env (autobyteus-219);
- the Claude api-key-in-spawn-env (pre-existing, autobyteus-219).

Follow-ups: none new from design (see Risks for observations already tracked elsewhere).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | REQ | Trigger | Target path | Spine |
| --- | --- | --- | --- | --- |
| BEH-001 Connect | REQ-001 | The user saves a token or ticks agents on the GitHub card | GraphQL → `IntegrationConnectionService` → GitHub `/user` check → vault, plus the connections file | DS-001 |
| BEH-002 Run gets its address | REQ-002, REQ-006, REQ-011 | A run of an allowed agent is prepared (new or restored), in any runtime | Backend preparation → `IntegrationRunAccess.environmentForRun` → run pass → the runtime's shell env | DS-002 |
| BEH-003 Proxied call | REQ-003…REQ-005, REQ-007…REQ-009 | The run's shell calls the address (curl, `gh api`, a script, git) | Local server → gate → pass → access → route → vault → GitHub → redaction → activity log | DS-003 |
| BEH-004 Refusals | REQ-005, REQ-006, REQ-010 | A wrong or ended pass, a not-allowed agent, no token, a path off the routes | Same server, refused before any upstream call | DS-003 |
| Run end | REQ-006 | Any run removal | `AgentRunResourceManager.release` → `revokeForRun` | DS-004 |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature` (security).
- Root cause classification: `No Design Issue Found` for the existing owners.
  - The run lifecycle already has a per-run activation in each backend and one release point.
  - The vault has a consumer catalog.
  - The project already has a loopback endpoint pattern.
  - The feature extends these owners; it doesn't change their boundaries.
- Refactor needed now: `No`. The new concern gets its own subsystem. Backends only apply the variables they are given; they hold no integration policy.
- Structural triggers fired:
  - **Several kinds or forms (P1):** five runtimes with five shell-env mechanisms (the per-runtime table below), and two GitHub routes with two auth formats (M-3).
  - **Repeated coordination (P13):** "who gets access, which pass, which variables" is decided once, in `IntegrationRunAccess`. Each backend calls it once and applies the result, like `activateForRun`.
  - **Capability-area reuse (P4):** the loopback gate is reused (`AgentToolsMcpLocalAccessGate`), as are the local-server lifecycle pattern, `updateJsonFile`/`appendJsonlFile`, the vault service and the search-config GraphQL pattern.
  - **Vocabulary (P15):** new words go into `GLOSSARY.md`. "integration" keeps one meaning; the existing `src/integrations/github/` folder (the download transport) is not renamed in this ticket, and its different meaning is noted.
  - **Persisted-data transition (P5):** new files only.

## Terminology (Principle 15; added to `GLOSSARY.md` under a new "Integrations" section)

| Word | Meaning | Not to be confused with |
| --- | --- | --- |
| **integration** (existing project meaning) | A connection to an outside service (GitHub, later Jira) | platform skills (autobyteus-141); `src/integrations/github/` is a download transport for skill sources, not an integration in this sense (noted in the glossary) |
| **integration definition** | The app-owned description of one integration: its routes, upstream addresses, auth formats and variable names. Never read from an installed skill | the integration's skill |
| **integration connection** | One integration set up on one node: its token in the vault, the GitHub login, and the agents allowed to use it | the definition |
| **credential proxy** | The server-owned loopback endpoint that adds an integration's credential to a run's outbound calls | an outgoing (company) proxy |
| **run pass** | A random, in-memory value that identifies one active run to server-owned local endpoints. It is in the run's addresses, not a secret | the run ID; the Agent Tools MCP run-session ID (deterministic) |
| **route** (of a definition) | One forwarding target of an integration with its own auth format and allowed paths: GitHub `api` and `git` | a web route |
| **integration activity** | The record of one proxied call | server logs |

## Legacy Removal Policy (Mandatory)

- Obsolete paths: none. This is a new capability.
- `terminalChildEnvironment` in core is not dead: it gets its supplier in this change.
- Compatibility wrappers: `None`.

## Persisted Data / State Transition Decision (Mandatory)

New stores only, so `Not Affected` for existing data:
- the vault entry `integration.github.token`;
- `<appDataDir>/integrations/connections.json`;
- `<appDataDir>/integrations/activity.jsonl`.

Readers tolerate absence: no file means not connected, no agents, no activity. A malformed `connections.json` is treated as not connected for that integration, with a logged warning naming the file and the reason (rule 7). The file is never rewritten until the user saves on the card. Run passes are memory only and are lost on restart, which is intended: runs get new passes when prepared again. No migration.

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Governing owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary | GitHub card (save, test, remove, agents) | Vault entry and connections file; status on the card | `IntegrationConnectionService` |
| DS-002 | Primary | A run's backend preparation (new or restore), any runtime | The run's shell has the address and git's redirection | `IntegrationRunAccess` |
| DS-003 | Primary | A call from the run's shell | GitHub's answer back to the shell; one activity record | `CredentialProxyForwarder` |
| DS-004 | Return/lifecycle | Run removal | Pass revoked | `AgentRunResourceManager.release` → `IntegrationRunAccess` |
| DS-005 | Bounded local | One forwarded call inside the forwarder | Upstream request, then redacted response | `CredentialProxyForwarder` |

## Primary Execution Spines

- **DS-001 (connect):**
  1. `GitHubIntegrationCard` → GraphQL `connectGitHubIntegration(token)` → `IntegrationConnectionService.connect("github", token: SecretValue)`.
  2. Check the token: `GET https://api.github.com/user` with `Bearer` → the login. On 401: `TOKEN_REJECTED`, and nothing is stored.
  3. `SecretManagementService.saveForConsumer({kind:"integration", integrationId:"github"})`.
  4. `IntegrationConnectionStore.update` (login, `connectedAt`).
  5. The result is `IntegrationConnectionStatus`.

  Also:
  - `setGitHubIntegrationAgentAccess(agentDefinitionIds)` → the store;
  - `disconnectGitHubIntegration` → vault `removeForConsumer` → the store clears the login but keeps the agent list;
  - `testGitHubIntegration` → step 2 with the stored token → the login, or `TOKEN_REJECTED`.
- **DS-002 (run gets its address):**
  1. A backend preparing the run (native factory L441; Claude, Codex, AGY and ACP at their `activateForRun` sites) calls `IntegrationRunAccess.environmentForRun({runId, agentDefinitionId}, baseEnv)`.
  2. `IntegrationConnectionStore.allowedIntegrations(agentDefinitionId)`. None allowed → `{}` and no pass.
  3. `RunPassRegistry.issue(runId, agentDefinitionId)` (one pass per run, reused if one is already active).
  4. For each allowed definition, `definition.shellVariables(proxyBaseUrl, pass, baseEnv)`.
  5. Variables `{AUTOBYTEUS_GITHUB_API_URL, GIT_CONFIG_COUNT, GIT_CONFIG_KEY_n, GIT_CONFIG_VALUE_n}`.
  6. The backend applies them to the shell (per-runtime table).
- **DS-003 (proxied call):**
  1. The shell (`curl "$AUTOBYTEUS_GITHUB_API_URL/…"`, or git through `insteadOf`) → `CredentialProxyLocalServer` (`127.0.0.1`) → `AgentToolsMcpLocalAccessGate.validateRequest` (reused).
  2. Route `/r/:pass/:integrationId/:route/*`.
  3. `RunPassRegistry.lookup(pass)` → `{runId, agentDefinitionId}`, or `RUN_PASS_INVALID`.
  4. `IntegrationConnectionStore.isAllowed(agentDefinitionId, integrationId)`, read on every call, or `INTEGRATION_NOT_ALLOWED`.
  5. `IntegrationDefinitions.route(integrationId, route).allows(method, path)`, or `PATH_NOT_ALLOWED`.
  6. `SecretManagementService.resolveForUse({kind:"integration", integrationId})`, or `INTEGRATION_NOT_CONNECTED`.
  7. `CredentialProxyForwarder.forward` (DS-005).
  8. `IntegrationActivityLog.append`.
  9. The reply.
- **DS-004 (run end):** there are **two** release points, and both revoke (AR-002):
  1. an attached run: `AgentRunResourceManager.release(runId)` (L95-119, next to `deactivateForRun`);
  2. an activation that fails before the run is attached: the activation operation's `deactivateMcp` hook (`agent-run-activation-operation.ts` L95-100, supplied at `agent-run-manager.ts` L164).

  Both call `IntegrationRunAccess.revokeForRun(runId)` → `RunPassRegistry.revoke`, which is idempotent. In `agent-run-manager.ts` the hook becomes "release the run's local sessions": `deactivateForRun` plus `revokeForRun`. The next call with that pass gets `RUN_PASS_INVALID`.
- **DS-005 (inside the forwarder):**
  1. Build the upstream URL (AR-003):
     - take the path after `/r/:pass/:integrationId/:route`;
     - refuse it if it contains `\`, `%2e%2e`/`..` segments, or an empty segment (`//`);
     - `upstream = new URL(route.basePath + path + search, route.origin)`;
     - refuse unless `upstream.origin === route.origin`.

     So `//evil.example/x` or an encoded host can never change the destination. Then check the route's path rules.
  2. Copy the request headers minus `authorization`, `cookie`, `host`, `proxy-*` and hop-by-hop headers.
  3. Add the route's auth (`api`: `Authorization: Bearer <token>`; `git`: `Authorization: Basic base64("x-access-token:" + token)`). On `api`, also `accept-encoding: identity`.
  4. Stream the request body upstream.
  5. Requests use `redirect: "manual"`; the proxy never follows a redirect itself.
     - A `Location` on the route's own origin (for example GitHub's 301 for a renamed repository) is rewritten to the proxy's base for that route and pass, so the client follows it through the proxy.
     - A `Location` on another host (for example signed download URLs) is passed through unchanged: the client follows it directly, without a token.
  6. Response:
     - `api` text or JSON body: buffered, with every occurrence of the token replaced by `[REDACTED]`, also in response headers;
     - `git`: streamed unchanged;
     - on the `git` route only, an upstream `401` becomes `403 UPSTREAM_REJECTED_TOKEN`, so git never prompts for a password (AR-006). On the `api` route a `401` is passed through, so curl and `gh` see GitHub's own message.

## Spine Narratives (Mandatory)

| Spine | Narrative |
| --- | --- |
| DS-001 | The token is checked once with GitHub before it is stored. The login is kept so the card can show "Connected as @login" without calling GitHub on every page load. Disconnecting removes the token; the agent ticks stay, so reconnecting doesn't lose them |
| DS-002 | Only agents ticked on the card get a pass and variables (DEC-002). The decision is made at run preparation; ticking an agent later applies to its next run. Unticking applies to the next call (DS-003 step 4) |
| DS-003 | Every refusal happens before any upstream call. Refusals are `403` with a JSON `{error, message}` and are recorded too |
| DS-004 | The pass dies with the run: one revocation at the single release point |
| DS-005 | The token is revealed only while the upstream auth header is built. It never enters a log, an error or the activity record |

## Ownership Map

| Node | Owns |
| --- | --- |
| `IntegrationDefinitions` (`integration-definitions.ts`) | The GitHub definition: routes `api` → `https://api.github.com` (all paths; methods GET, POST, PATCH, PUT, DELETE) and `git` → `https://github.com` (paths `/<owner>/<repo>[.git]/{info/refs, git-upload-pack, git-receive-pack}`); auth formats; variable names; `shellVariables(...)`. The upstream base is a field (DEC-010). It also carries `displayName` and a one-line `description`, which the card shows and the later Integrations menu can read (Task comment 1) |
| `IntegrationConnectionService` | Connect, test, disconnect, agent access, status. The only writer of the vault entry and the connections file |
| `IntegrationConnectionStore` | `connections.json`: login, `connectedAt`, `agentDefinitionIds` per integration; tolerant read |
| `RunPassRegistry` | Issuing (32 random bytes, `rp_` + base64url), lookup and revoking passes; memory only |
| `IntegrationRunAccess` | The run-level decision and variables (DS-002) and revocation (DS-004). The one entry point backends use |
| `CredentialProxyLocalServer` + `credential-proxy-routes.ts` | The loopback listener, the route and the refusals (DS-003 steps 1–6) |
| `CredentialProxyForwarder` | DS-005 |
| `IntegrationActivityLog` | Appending one record per call: `{at, runId, agentDefinitionId, integrationId, route, method, path (no query), status, error?, durationMs}` |
| `CredentialProxyHost` | Constructing the above, `listen()` and `close()`, with the server lifecycle (like `AgentToolsMcpHost`) |

## Per-Runtime Delivery (Principle 1: each form traced)

| Runtime | Where the backend applies the variables | Evidence |
| --- | --- | --- |
| AutoByteus (native) | `initialCustomData.terminalChildEnvironment = () => ({...process.env, ...vars})` in `autobyteus-agent-run-backend-factory.ts` L441 | Seam `terminal-child-environment.ts` L1-8; it replaces `process.env` (L111-112) |
| Claude | The run's session options carry `extraEnvironment`. `resolveSpawnEnvironment` merges it after `buildClaudeSdkSpawnEnvironment` (`claude-sdk-client.ts` L351-364) | Per-session spawn |
| Codex | `appServerConfig = {...agentToolsMcpConfig, shell_environment_policy: {set: vars}}` in `codex-thread-bootstrapper.ts` (next to L324). **Sandbox:** in `workspace-write` (used when auto-execute is off, `codex-sandbox-mode-setting.ts` L11; bootstrapper L168-175, L310) the shell cannot connect to 127.0.0.1 (M-5). So when the run has integration variables, also `sandbox_workspace_write: {network_access: true}` (DEC-011) | M-1, M-5 |
| Antigravity | `env: {...process.env, ...vars}` passed to `agy-stream-process.ts` L41 (`input.env`) by the AGY backend | L27, L41 |
| Grok / ACP | The launch profile env plus vars at `acp-session-launcher.ts` L86 | L86 |

Restore uses the same preparation path in each backend. A run of an agent without access gets nothing (REQ-002, AC-002).

## Removal / Decommission Plan (Mandatory)

None. Nothing becomes unnecessary, and the touched files have no dead code found by this investigation.

## Interface Boundary Mapping

| Interface | Shape |
| --- | --- |
| `IntegrationRunAccess` | `environmentForRun(run: {runId, agentDefinitionId}, baseEnv: NodeJS.ProcessEnv): Readonly<Record<string,string>>`; `revokeForRun(runId): void`. `baseEnv` is only used to append git config after any existing `GIT_CONFIG_COUNT` entries |
| Shell variables (contract for integration authors, REQ-012) | `AUTOBYTEUS_GITHUB_API_URL=http://127.0.0.1:<port>/r/<pass>/github/api` (no trailing slash). `GIT_CONFIG_COUNT=<n+1>`, `GIT_CONFIG_KEY_<n>=url.http://127.0.0.1:<port>/r/<pass>/github/git/.insteadOf`, `GIT_CONFIG_VALUE_<n>=https://github.com/`, and `GIT_TERMINAL_PROMPT=0`. The last one is a second guard: git in an agent's shell must never wait for a password the agent can't type (AR-003). Later: `AUTOBYTEUS_JIRA_URL` |
| Proxy URL | `/r/:pass/github/api/<path>?<query>` → `https://api.github.com/<path>?<query>`. `/r/:pass/github/git/<owner>/<repo>[.git]/<git endpoint>` → `https://github.com/...` |
| Refusal | `403 {"error": "RUN_PASS_INVALID" \| "INTEGRATION_NOT_ALLOWED" \| "INTEGRATION_NOT_CONNECTED" \| "PATH_NOT_ALLOWED" \| "UPSTREAM_REJECTED_TOKEN" \| "NOT_LOOPBACK", "message": "..."}`, with messages such as "GitHub is not connected on this node. Connect it in Settings." |
| Vault consumer | `{kind: "integration"; integrationId: "github"}` → fixed `SecretId` `integration.github.token`, authorized in `catalog.resolve`. Not added to `isKnownSecretId` (no batch import needs it; same reasoning as 244 AR-012) |
| GraphQL | Query `githubIntegration: IntegrationConnectionStatus {connected: Boolean!, login: String, connectedAt: String, agentDefinitionIds: [String!]!}`. Mutations: `connectGitHubIntegration(token: String!): IntegrationConnectionStatus` (errors `TOKEN_REJECTED`); `testGitHubIntegration: IntegrationConnectionStatus`; `disconnectGitHubIntegration: IntegrationConnectionStatus`; `setGitHubIntegrationAgentAccess(agentDefinitionIds: [String!]!): IntegrationConnectionStatus`. The token is never in any output. GitHub-specific names, because Jira's credential will have other fields (email, site); a generic shape now would be guessing (P10) |
| Composition | `CredentialProxyHost` is created, listened and closed in the studio server composition next to `agentToolsMcpHost` (`build-studio-server.ts` L196, L300). It is handed to the backend factories as `IntegrationRunAccess` and to the resource manager. The standalone application host passes none: its runs get no integration access in this step (explicit parameter `integrationRunAccess: null`, not an absence) |

## Derived Consumers (Principle 11)

| Consumer | Decision |
| --- | --- |
| `AgentRunResourceManager.release` | Calls `revokeForRun` |
| Five backend factories | Apply the variables (table above) |
| `secret_management.md` consumer list | Adds `integration` |
| Web Settings page | Adds the GitHub card. The agent list comes from the existing agent definitions store |
| Agent Tools MCP host | Unchanged (its gate is imported) |

## Dependency Rules

- Backends depend only on `IntegrationRunAccess`, never on the registry, store or definitions (P3).
- Only `IntegrationConnectionService` writes the vault entry and `connections.json`.
- Only `CredentialProxyForwarder` reads the token (`resolveForUse`), once per call.
- The local server never logs request URLs (they contain the pass): `disableRequestLogging: true`, and **no** `registerHttpAccessLogPolicy` (the Agent Tools server registers one, which logs paths; the proxy must not, AR-004). Errors carry codes, never headers or tokens.
- `credential-proxy/` does not import from `src/integrations/github/` (a different concern).

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `autobyteus-server-ts/src/credential-proxy/integration-definitions.ts` | Add |
| `…/credential-proxy/integration-connection-service.ts`, `integration-connection-store.ts` | Add |
| `…/credential-proxy/run-pass-registry.ts`, `integration-run-access.ts` | Add |
| `…/credential-proxy/credential-proxy-local-server.ts`, `credential-proxy-routes.ts`, `credential-proxy-forwarder.ts`, `credential-proxy-host.ts` | Add |
| `…/credential-proxy/integration-activity-log.ts` | Add |
| `…/secret-management/domain/secret-id.ts`, `catalog/provider-credential-catalog.ts` | Modify: the `integration` kind |
| `…/agent-execution/services/agent-run-resource-manager.ts` | Modify: revoke |
| `…/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Modify |
| `…/backends/claude/…` (session options) and `runtime-management/claude/client/claude-sdk-client.ts` | Modify |
| `…/backends/codex/backend/codex-thread-bootstrapper.ts` | Modify |
| `…/backends/antigravity/…` (the backend that calls `agy-stream-process`) | Modify |
| `…/backends/acp/session/acp-session-launcher.ts` (or its launch profile) | Modify |
| `…/agent-execution/providers/agent-provider-factory-builder.ts`, `compositions/build-studio-server.ts`, standalone host | Modify: wiring |
| `…/api/graphql/types/github-integration.ts` (+ schema registration) | Add |
| `autobyteus-web/components/settings/GitHubIntegrationCard.vue`, `stores/githubIntegrationStore.ts`, `graphql/queries|mutations/githubIntegration*.ts`, `generated/graphql.ts`, locales en/zh-CN | Add/Modify |
| `autobyteus-server-ts/tests/e2e/credential-proxy/github-credential-proxy-live.e2e.test.ts` | Add: gated live check (`RUN_GITHUB_PROXY_E2E=1`, test vault) |
| `autobyteus-server-ts/docs/modules/credential_proxy.md`, `secret_management.md`, `GLOSSARY.md`, `docs/design-cases.md`, `TESTING.md` | Add/Modify |

## Concrete Examples

What an integration's script does (REQ-012):
```bash
# API (REST or GraphQL)
curl -s "$AUTOBYTEUS_GITHUB_API_URL/repos/OWNER/REPO/issues?state=open"
curl -s -X POST "$AUTOBYTEUS_GITHUB_API_URL/repos/OWNER/REPO/issues/1/comments" -d '{"body":"Done"}'
gh api "$AUTOBYTEUS_GITHUB_API_URL/graphql" -f query='{ viewer { login } }'
# git: unchanged URLs
git clone https://github.com/OWNER/REPO.git && git push
# Not supported (DEC-004): gh issue list, gh pr create (gh needs HTTPS to its host)
```

A run without access: `echo "$AUTOBYTEUS_GITHUB_API_URL"` is empty, and git uses `https://github.com` as before.

| Topic | Good | Avoided |
| --- | --- | --- |
| Where policy lives | Backends call `environmentForRun` and apply the result | Each backend checking access or building URLs itself (repeated policy) |
| git auth | `Basic x-access-token:<token>` on the `git` route (M-3) | `Bearer` everywhere (rejected by GitHub git, 401) |
| Refusing git | `403` with a code | `401`, which makes git prompt for a password and hang the agent |
| Logging | Codes and paths without query strings | URLs containing the pass; headers |

## Backward-Compatibility Rejection Log

N/A (new capability).

## Change / Refactor Sequence

1. **Vault:** the `integration` consumer kind.
2. **`credential-proxy/` core:**
   - definitions;
   - store and connection service;
   - run passes and run access;
   - forwarder;
   - local server and routes;
   - activity log;
   - host.
   Unit tests use a fake upstream (local HTTP) and dummy tokens.
3. **Wiring:** the composition, resource release, and the five backends.
4. **GraphQL;** then the web card, store and locales; then codegen.
5. **Docs and glossary;** the design case.
6. **Tests:**
   - deterministic: the gate, each refusal (including `//host`, `..` and encoded paths), a renamed-repository redirect rewritten through the proxy, a forged header dropped, redaction (an upstream echo), activity records without the token, revoke at release, variables per runtime, git push through the proxy to a local `git http-backend` with Basic auth checked;
   - per-runtime e2e: each runtime's shell sees the variables and no token;
   - gated live: the test-vault token through the card's GraphQL on a built server with its own application vault (the 244 pattern), then `curl` issue #1 and `git clone` of `ryan-zheng-teki/autobyteus-mcp-test`. Scan logs, traces and the data root for the token.

## Codex Sandbox (AR-001, DEC-011)

**DEC-011: Codex runs in the default sandbox can't reach the proxy (M-5).**

| Option | What it means | Security |
| --- | --- | --- |
| (a) **Turn on network for that Codex run only**: `sandbox_workspace_write.network_access = true` in the thread config, only for runs of agents ticked for GitHub, only in `workspace-write` | GitHub works for Codex like for the other runtimes | That run's shell can reach any network address, not only the proxy. Today such a Codex run has no network at all. The other four runtimes already have no network sandbox |
| (b) **Leave Codex's sandbox unchanged** | GitHub works for Codex only when it runs with full access (auto-execute on). In the default sandbox, curl and git to the proxy fail, and the docs and the card say so | No change |
| (c) Codex's own per-domain allow-list (`network_proxy`) | Would allow only the proxy | Experimental, off by default, configured through managed requirements: not a foundation now |

**Decided by the user (SR-005): (a), automatic.**
- Auto-execute is on by default for new runs (`chatDraftStore.ts` L95, L230; `agentOrgLaunchDraftStore.ts` L118; `useDefinitionLaunchDefaults.ts` L135, L152). With it on, Codex runs in `danger-full-access`, where the proxy works (M-5).
- For a Codex run in `workspace-write` (auto-execute off) whose agent has integration variables, the Codex bootstrapper adds `sandbox_workspace_write: {network_access: true}` to the same thread `config` as `shell_environment_policy`. This happens with no user setting.
- `read-only` sandbox runs are left as they are: a read-only run is not meant to act. `credential_proxy.md` (the integration-author contract) states that Codex runs in the `read-only` sandbox can't reach integrations (AR-008).
- Runs without integration variables are unchanged.

## Key Tradeoffs

- **A separate loopback listener (like Agent Tools MCP) rather than a route on the main server.** It is loopback by construction, so it can't be exposed when remote access is on (QR-001). The cost is one more port.
- **Access read on every call, variables decided at preparation.** Revocation is immediate; granting applies to new runs.
- **Text bodies buffered for redaction on the API route.** GitHub API pages are small (paginated); git packs are streamed (QR-002).
- **GitHub-specific GraphQL now.** Jira adds its own mutations; this avoids guessing a generic credential shape.

## Risks

- **R-1: same-user limit** (vault key readable; autobyteus-310).
- **R-2: use within the token's permissions.** DEC-003: the token narrows it; every call is recorded.
- **R-3: the activity file grows.** About 200 bytes per call; size-bounding is a phase-2 refinement if real use shows a need (DESIGN.md "Start simple").
- **R-4: Codex `shell_environment_policy.set` from the thread config may replace a user's own `set` table** in `~/.codex/config.toml` for that thread, instead of merging with it. Implementation measures this (a `set` entry in a temp `CODEX_HOME` config plus a thread-level `set`). If it replaces, the docs state that a user's own `shell_environment_policy.set` entries don't apply to AutoByteus Codex runs with an integration; no extra machinery.
- **R-5: a server restart ends all passes.** Runs prepared again get new ones. A long-running shell command started before a restart loses access (acceptable).
- **Observation (not this ticket):** in Claude api-key mode the Anthropic key is in the Claude child env, so the agent's shell can read it (`claude-sdk-client.ts` L357-361). This belongs to autobyteus-219 (FU-004 of 244) and will be passed to the PTM.

## Guidance For Implementation

- **Prove these premises first:**
  - a function in `initialCustomData` reaches the native runtime's `customData` (the factory uses `config.initialCustomData` directly, `agent-factory.ts` L101; `copy()` deep-clones, L95-110);
  - a team member's run carries its own `agentDefinitionId`;
  - the AGY caller of `agy-stream-process` and where it builds `input.env`.
- **Tests:** dummy values everywhere except the gated live check. Never print the token.
- **Design case** for `docs/design-cases.md`, under Case 5 ("claims taken on trust"): 244's V1b probe validated git through the proxy against a stand-in git service that accepted `Bearer`. Real GitHub rejects `Bearer` on git and needs Basic `x-access-token` (M-3). Lesson: a probe's stand-in for an outside service proves our side only; measure the real service's contract once before designing on it.
