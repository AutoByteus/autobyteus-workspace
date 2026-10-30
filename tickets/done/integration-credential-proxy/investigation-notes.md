# Investigation Notes — Credential proxy for integrations, step 1: GitHub (autobyteus-311)

## Investigation Meta

- Package identifier: `integration-credential-proxy`
- Request / ticket: Project Task `autobyteus-311`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`. This ticket is its **first step**: the GitHub credential proxy, design first. The Integrations menu, Jira Cloud and SSH are later steps.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/integration-credential-proxy`
- Repository mode: `Git`
- Task worktree / branch: the path above, branch `codex/integration-credential-proxy`
- Resolved base: `origin/personal` @ `8760c83788` (fetched 2026-10-30)
- Finalization target: `origin/personal`
- Bootstrap result: OK. The first team copy's worktree and branch of the same name were removed (its handover). This is a fresh worktree from the same base.
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities read (requirements gate, 2026-10-30):
  - the updated `SKILL.md`, `references/requirements-engineering.md`, `templates/requirements-doc-template.md`, `templates/investigation-notes-template.md`;
  - `references/finding-the-cause.md` and `references/ticket-scope.md` (read earlier in this conversation for autobyteus-244, unchanged).
- Investigation status: requirements and architecture investigation complete (2026-10-30)

## Initial Request And Clarifications

- **Original request:** the Task description, plus three comments:
  - the Integrations-menu direction;
  - "THIS IS THE PROXY TASK", with the first-step scope and done-when;
  - the reassignment to this team copy.
- **The PTM's message (2026-10-30), relaying the user:**
  - "integration is skill plus authentication";
  - the proxy gets the token from the vault;
  - many integrations share the same proxy;
  - "the address is replaced", so scripts, curl and git call the proxy address instead of the outside host;
  - he asked how an agent actually uses it (through bash and scripts, or through our own command).
- **Inputs read:**
  - the first copy's handover `handover-311.md` (H-1…H-5);
  - its prerequisite request `handoff-prerequisite-credential-proxy.md`;
  - the paused ticket's `requirements-doc.md` and `investigation-notes.md` (all in `/Users/normy/autobyteus_org/autobyteus-delivery-records/github-integration-foundation-20261030/`);
  - autobyteus-141's description and comments, copied by the PTM into the same folder (`autobyteus-141-description-and-comments.md`; design-only, TODO, nothing decided).
- **User constraints:**
  - never print or store a secret in logs, traces or files;
  - test vault and a throwaway repository for tests;
  - prove from a clean clone;
  - no release unless asked;
  - do not put "the user has verified" into Done-when (the PTM);
  - do not touch autobyteus-integrations-1 (paused).
- **Initial ambiguity:**
  - how the user enters the token;
  - which agents may use it;
  - whether `gh`'s own commands must work;
  - risky-action approval.

## Product And Domain Understanding

- **Product area:** the node's vault (autobyteus-244), agent runs and their shells (five runtimes), and skills installed from GitHub skill sources.
- **Actors:**
  - the user, who configures the token once;
  - an agent run, whose shell runs a skill's script, curl, `gh api` or git;
  - the integration's author (the autobyteus-integrations repository, paused ticket);
  - GitHub (`api.github.com`, `github.com`).
- **Vocabulary** (DESIGN.md, one word one meaning):
  - **integration** = a connection to an outside service;
  - **platform skills** = the platform's own tools as skills (autobyteus-141), not integrations;
  - **run pass** = a per-run capability (244 V1 called it "run-capability"; the PTM's 141 note calls it "a run pass bound to the run").

## Source Log

| Date | Type | Source | Why | Finding |
| --- | --- | --- | --- | --- |
| 2026-10-30 | Doc | `tickets/done/secrets-and-integrations-design/solution-validation.md` §1–§6 | The validated design basis | V1: the proxy URL `http://127.0.0.1:<port>/i/<run-capability>/<integration>/…` adds `Authorization` outward. Token in the shell env: 0. A forged auth header is replaced. Outside the allow-list → 403. Another run's capability → 403. Echo `[REDACTED]`. One audit line per call. V1b: a real `git clone` through `url.<proxy>.insteadOf`. V3: credential helpers print the token (rejected). V6: a broker-run `gh` needs a subcommand allow-list. §4: limits (same-user agent; use is not theft; the capability is in the shell; allow-list care) |
| 2026-10-30 | Doc | first copy's `handover-311.md` | Measured `gh` behavior | H-1 (Measured): `gh` with `GH_HOST=127.0.0.1:<port>` always uses HTTPS. `gh api http://127.0.0.1:<port>/user` (a full URL) works against a plain-HTTP proxy. So `gh issue list` / `gh pr create` need an HTTPS proxy that gh trusts. H-3: the Agent Tools MCP run-session ID is deterministic and "not a secret". H-5 (Measured): fine-grained tokens can't reach user-owned Projects boards (`403`) |
| 2026-10-30 | Doc | `autobyteus-141-description-and-comments.md` | One credential model | 141 is not designed. It wants a per-run identity for scripts calling the server ("a per-run, short-lived, scoped token … bound to the run's ID … revoked when the run ends", or a per-run socket). The PTM asks that 311's run pass be reusable by 141 |
| 2026-10-30 | Code | `autobyteus-ts/src/tools/terminal/terminal-child-environment.ts` L1-8; `tools/run-bash.ts` L24; `background-process-context.ts` L28 | Can a native run's shell get a per-run variable? | Yes: core already takes a host-supplied per-execution environment (`customData.terminalChildEnvironment`) for `run_bash` and background processes ("never serialized or installed in process.env") |
| 2026-10-30 | Command | `git log -S terminalChildEnvironment` | Who supplies it | Added in `c57ab71c90` (NFS private runtime bindings); the server's supplier was removed in `2448e166bd` ("decouple workspaces and private runtime skills from NFS"). Today **no server code sets it**; the core seam has no supplier |
| 2026-10-30 | Code | `runtime-management/claude/client/claude-sdk-spawn-environment.ts` L60-68 | Claude runs | The SDK child env is composed per spawn (`buildClaudeSdkSpawnEnvironment`); its shell tool inherits it (H-2) |
| 2026-10-30 | Doc | `handover-311.md` H-2 | AGY, Grok, Codex | AGY spawns with `env: input.env`; Grok/ACP with `launchProfile.env(...)`. Codex shares one app-server process; per-thread `config` is already used for `mcp_servers` (`codex-agent-tools-mcp-materializer.ts` L29-38). Whether a per-thread `shell_environment_policy.set` reaches the thread's shell: **not measured** |
| 2026-10-30 | Command | `git --version` | git config through environment | git 2.50.1: `GIT_CONFIG_COUNT`/`GIT_CONFIG_KEY_n`/`GIT_CONFIG_VALUE_n` (git ≥ 2.31) can set `url.<proxy>.insteadOf` per process, with no file written |
| 2026-10-30 | Code | `autobyteus-web/components/settings/` (list) | Where a token entry fits | Settings already has `ProviderAPIKeyManager.vue` and per-feature cards (`ClaudeRuntimeCard`, `CodexFullAccessCard`, `PhoneAccessCard`). No integration surface exists |
| 2026-10-30 | Doc | `secret_management.md` (via the handover, H-4) | Vault consumers | Provider keys, managed Claude credentials, MCP secrets (`mcp.<uuid>`). None for an integration credential |
| 2026-10-30 | Command | `gh auth status` (paused ticket's notes) | Ambient risk | On this node `gh` is logged in with a broad token. An agent shell can already use it, and `gh auth token` prints it. Pre-existing, outside this ticket (RSK-002 of the paused ticket; FU-004 / autobyteus-219 for shell environments) |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger | Current behavior | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | The user wants an agent's script to use GitHub with his token | No current supported behavior. The only vault route is an MCP server (244). A script would need the token in its shell (`GH_TOKEN`), which the user's approved rule forbids ("an agent may use a credential, never hold it", 244 DEC-001) | 244 requirements SR-004; FU-001 | High |
| BEH-002 | System | A run starts (any runtime) | The run's shell gets the server's environment (FU-004). It has no per-run variable from AutoByteus; the native seam has no supplier | Source log rows above | High; Codex per-thread env Unknown |
| BEH-003 | User | The user stores a credential | Only provider keys (Settings) and MCP secrets (MCP page). No entry for an integration credential | H-4 | High |

## Relevant Codebase And Technical Facts

| Path / Component | Current behavior | Requirement implication | Architecture question |
| --- | --- | --- | --- |
| `terminal-child-environment.ts` | Core accepts a per-execution env from the host, unused today | Native runs can get the run's proxy address without touching `process.env` | Reuse this seam as the native supplier |
| Claude/AGY/Grok spawn | Each run spawns its own process with a composed env | Per-run variables are possible | One shared "run shell environment" owner, used by each backend |
| Codex app-server | One shared process; per-thread config | Per-run variable possible only if thread config reaches the shell | **Measure** `shell_environment_policy.set` per thread (codex 0.166.0) |
| Vault (`secret-management/*`) | Closed catalog; MCP consumer `mcp.<uuid>` | A new consumer kind for an integration credential | ID shape (fixed `integration.github.token`?), authorization |
| Agent Tools MCP session ID | Deterministic, loopback admission only | The run pass must be unguessable and different from it | Mint per run; revoke at run end |

## Structural And Payload Surface Inventory

- **Payload:** vault entries; the audit log (new); per-run environment variables (new).
- **Structural:**
  - a new server-owned proxy route (loopback only);
  - a run-lifecycle hook (mint the pass at start, revoke at end);
  - a shell-environment supplier for each runtime;
  - a vault consumer kind;
  - a settings surface for the token.
- **Potential impacts:**
  - security boundary (new);
  - lifecycle (run start/stop/restore);
  - five runtime backends;
  - a GraphQL settings API;
  - no persisted-data migration (new entries only).

## Runtime, Probe, Or Reproduction Findings

| Method | Scenario | Observation | Established | Implication | Evidence |
| --- | --- | --- | --- | --- | --- |
| 244 V1 / V1b probes | API call and git clone through a local proxy, dummy token | Works; token not in the shell; allow-list, redaction and audit work | Measured (2026-10-25) | Feasible design basis | `tickets/done/secrets-and-integrations-design/probes/` |
| First copy's `gh` probe | `GH_HOST` versus full URL | `gh api <full proxy URL>` works; `gh issue list` needs HTTPS | Measured (2026-10-30) | `gh`'s own commands are not covered by a plain local proxy (DEC-004) | `handover-311.md` H-1 |

- Not yet measured (architecture phase):
  - the Codex per-thread shell environment;
  - git **push** through the proxy (V1b proved clone; push uses the same smart-HTTP protocol);
  - a real `api.github.com` call through the proxy with the test-vault token (`test.github.token`, read-only, `ryan-zheng-teki/autobyteus-mcp-test`).
- Temporary diagnostics: none.

## Stakeholder And User Evidence

| Source | Need | Strength | Implication |
| --- | --- | --- | --- |
| User, 2026-10-30 (relayed and quoted) | "skill plus authentication"; the proxy gets the token from the vault; one proxy for many integrations; "the address is replaced" | Direct | The shell gets an address, never a token; one proxy, one definition per integration |
| User, 244 DEC-001 (approved) | "An agent may use a credential, never hold it" | Approved | No token in the shell, a file it can read, or a command line |
| User, standing rule | No automatic exposure of tools to agents | Direct (earlier tickets) | Argues for explicit per-agent access (DEC-002) |
| User, 244 DEC-010 | Third-party installs "quite dangerous" | Direct | The app, not an installed skill, decides where a token may be sent (DEC-005) |
| User via PTM (141) | One credential model for the proxy and platform skills | Direct | The run pass must be reusable by 141 |

## External Contracts, Standards, And Dependencies

| Dependency | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| GitHub REST/GraphQL (`api.github.com`) | `Authorization: Bearer <token>`; GraphQL at `/graphql` | GitHub docs | Rate limits; large responses |
| git smart HTTP (`github.com/<o>/<r>.git`) | `info/refs`, `git-upload-pack`, `git-receive-pack`; Basic or Bearer auth | V1b | Push not yet measured |
| `gh` 2.86.0 | Its own commands require HTTPS to the host (H-1) | Measured | DEC-004 |
| git ≥ 2.31 | Config through `GIT_CONFIG_COUNT` env | git docs; local git 2.50.1 | Older git on Docker images: check the image's version |

## Persisted Data And State Facts

- **Affected:** a new vault entry for the GitHub token; a new access setting; a new audit log. No existing data changes.
- **Preserved:** every existing vault entry; MCP secrets; provider keys.
- **Unknown:** none material.

## Product Design Request Context

- Product Design request: `Not stated`. The Integrations menu is a later step of 311. Step 1's surface is one small settings card (DEC-001).

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Status |
| --- | --- | --- | --- |
| `tickets/done/secrets-and-integrations-design/solution-validation.md` + `probes/` | Solution Designer (244) | Validated proxy design (V1, V1b, V6) | Input, read-only |
| `/Users/normy/autobyteus_org/autobyteus-delivery-records/github-integration-foundation-20261030/handover-311.md` | First team copy | H-1…H-5 | Input, read-only |
| same folder, `autobyteus-141-description-and-comments.md` | PTM | 141 direction | Input, read-only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution / Owner | Status |
| --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Codex per-thread shell environment | Measured M-1: works | Resolved |
| UNK-002 | Unknown | git push through the proxy | Measured M-2: works | Resolved |
| RSK-001 | Risk | A same-user agent can read the vault key file (244 V5) and so, with effort, the token | Stated limit; autobyteus-310 (root key into the Keychain) | Accepted limit |
| RSK-002 | Risk | Agents can still *use* GitHub through the proxy within the token's permissions | Narrow token, access per agent (DEC-002), audit log | Open, DEC-002 / DEC-003 |
| RSK-003 | Risk | The ambient `gh` login on this node gives any shell a broad token today | Pre-existing; FU-004 / autobyteus-219 | Outside this ticket |

## Requirement Implications

- The answer to "how does an agent use it" is **bash with ordinary tools**. The shell gets one per-run address; curl, `gh api <address>` and the integration's scripts call it; git's `https://github.com/` is redirected to it by per-process git config. No special command is needed. `gh`'s own commands (`gh issue list`) are the exception (H-1, DEC-004).
- Per-run delivery exists for four runtimes; Codex is to be measured (UNK-001).
- The app must own the GitHub definition (hosts, paths, auth header), so an installed skill can't redirect the token.
- A vault consumer and a token entry surface are new (H-4).

## Architecture Investigation Findings (2026-10-30)

Authorities read for this phase: `references/architecture-design.md`, `references/design-principles.md` (full), and the project `DESIGN.md` (rules 1–10, "Start simple", the project documents list).

### Measured (probes in `/tmp/proxy-311-probes/`, disposable; dummy values except the read-only test token, never printed)

| ID | Probe | Observation | Implication |
| --- | --- | --- | --- |
| M-1 (UNK-001) | `codex-env/probe.mjs`: **one** `codex app-server` (codex-cli 0.166.0, temp `CODEX_HOME` with a 0600 copy of the login, removed afterwards). Two threads started with `config: {shell_environment_policy: {set: {PROBE_311: "alpha-311" / "beta-311"}}}`, each asked to run `printenv PROBE_311` | Thread A's shell printed `alpha-311`, thread B's printed `beta-311` | **Codex per-thread shell environment works**, in the same `config` object that already carries `mcp_servers` (`codex-thread-manager.ts` L222-235 `config: config.appServerConfig`). REQ-002 is feasible for Codex |
| M-2 (UNK-002) | `git-push/probe.mjs` (244's V1b probe; git's `http-backend` with `http.receivepack`, requiring a token). Clean env (`env -i`, no global or system git config); redirection only through `GIT_CONFIG_COUNT=1`, `GIT_CONFIG_KEY_0=url.<proxy>/.insteadOf`, `GIT_CONFIG_VALUE_0=https://github.com/` | `git clone https://github.com/repo.git`, commit, `git push` → `PUSH_OK`. The service saw `info/refs`, `git-upload-pack`, `info/refs`, `git-receive-pack`, all with the valid token. Token occurrences in the shell env: 0 | Clone **and push** work through the proxy with git config from the environment only (no file) |
| M-3 | `curl` to `https://github.com/ryan-zheng-teki/autobyteus-mcp-test.git/info/refs?service=git-upload-pack` with the read-only test token (header passed through `curl -K -` stdin; never printed) | No auth: 401. `Authorization: Bearer <token>`: **401**. `Authorization: Basic base64(x-access-token:<token>)`: **200**. API `GET /repos/…/issues/1` with Bearer: 200 | **GitHub's git endpoint needs Basic `x-access-token:<token>`; the API takes Bearer.** The GitHub definition has two routes with different auth schemes |
| M-4 | `docker run --rm --entrypoint git autobyteus/autobyteus-server:beta --version` (a throwaway container, no volumes; not the user's node containers) | `git version 2.43.0` | ≥ 2.31: `GIT_CONFIG_COUNT` works on Docker nodes |

| M-5 (AR-001) | `codex-sandbox/probe.mjs`: one app-server and a local listener on `127.0.0.1`. Four threads each ran `curl -sS --max-time 5 http://127.0.0.1:<port>/ping` | `workspace-write` + `never`: **exit 7, "Couldn't connect"**. `workspace-write` + `on-request`: exit 7 (no escalation request; the prompt said not to retry). `workspace-write` + `config.sandbox_workspace_write.network_access=true`: **pong**. `danger-full-access`: **pong**. The listener saw 2 hits | Codex's default sandbox blocks loopback. Per-thread `network_access` opens it (and the whole network). Codex's own allow-list (`network_proxy` feature) is experimental and off (`codex features list`) |

### Read (file:line)

| Source | Finding |
| --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-local-server.ts` L26-40, L67-77 | The existing server-owned endpoint for agents: its own Fastify instance listening on `127.0.0.1:0`, `disableRequestLogging: true`, `requireBaseUrl()` |
| `agent-tools-mcp-local-access.ts` L9-24 | Loopback gate: remote address, `Host` header and `Origin` must all be loopback |
| `agent-tools-mcp-host.ts` L41-103 | Host = registry + local server + session authority, `listen()`/`close()` |
| `agent-tool-mcp-session-authority.ts` L36-60 | Per-run lifecycle: `activateForRun` / `deactivateForRun` |
| `activateForRun` callers | `claude-agent-tools-mcp-session-state.ts` L28, `codex-thread-bootstrapper.ts` L324, `agy-agent-run-backend-factory.ts` L126, `acp-agent-run-backend-factory.ts` L185. Each external backend gets its per-run MCP address at preparation |
| `agent-execution/services/agent-run-resource-manager.ts` L60-63, L95-119 | `release(runId)` is the single run-removal point ("which every removal of a run goes through"); it deactivates the run's MCP sessions |
| `autobyteus-agent-run-backend-factory.ts` L441-487 | The native run's `initialCustomData`; core reads `customData.terminalChildEnvironment` for `run_bash` and background processes (`terminal-child-environment.ts` L1-8). The env it returns **replaces** `process.env` (`direct-shell-session.ts` L111-112: `...(environment ?? process.env)`) |
| `runtime-management/claude/client/claude-sdk-client.ts` L351-364 | Claude's spawn env is built per session start from `process.env` (and, in api-key mode, adds the Anthropic key; pre-existing, autobyteus-219) |
| `antigravity/stream/agy-stream-process.ts` L27, L41 | AGY spawns with `env: input.env` (optional) |
| `acp/session/acp-session-launcher.ts` L86 | Grok/ACP spawns with `launchProfile.env(process.env)` |
| `agent-tools/search/search-provisioning-service.ts` L23, L57, L88 | Precedent for a settings-backed vault consumer: status through `getStatusForConsumer`, save through `saveForConsumer` |
| `api/graphql/types/server-settings.ts` L74-110 | Precedent GraphQL: `getSearchConfig` query, `setSearchConfig` mutation |
| `secret-management/domain/secret-id.ts` L4-21 | `SecretConsumerIdentity` union (`mcpServer` added by 244); a new `integration` kind goes here |
| `secret-management/catalog/provider-credential-catalog.ts` L23-33 | `FIXED_SECRET_IDS`, `MCP_SECRET_ID_PATTERN`; `resolve(consumer)` authorizes per kind |
| `persistence/file/store-utils.ts` L212, L229 | `updateJsonFile` (atomic, locked) and `appendJsonlFile` exist |
| `autobyteus-web/components/settings/CodexFullAccessCard.vue` L60-108 | Settings cards use `useServerSettingsStore` |

### Corrections to earlier premises

- The 244 V1b probe used `Bearer` toward a local git service. Real GitHub git needs **Basic** (M-3). Without this measurement the design would have failed at the first real clone (design case Case 5: claims checked, not taken on trust).
