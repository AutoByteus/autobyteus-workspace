# Investigation Notes — Secrets and integrations for skills and MCP servers (autobyteus-244)

## Investigation Meta

- Package identifier: `secrets-and-integrations-design`
- Request / ticket: Project Task `autobyteus-244` (FU-2 of the Jira investigation autobyteus-175, widened by the user's comments of 2026-10-25)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/secrets-and-integrations-design`
- Repository mode: `Git`; branch `codex/secrets-and-integrations-design`
- Resolved base: `origin/personal` @ `a2faf424d6dc69a1d5160cb55acefc2f5a4f6bd5` (fetched 2026-10-25)
- Finalization target: `origin/personal` (only once the user approves a build)
- Bootstrap: OK; no blocker
- Current solution revision ID: `SR-007`
- Authorities read (2026-10-25): the updated `SKILL.md`, `references/finding-the-cause.md` (new), `references/ticket-scope.md`, `references/handoff.md`, `references/requirements-engineering.md`, the updated `templates/investigation-notes-template.md`; `DESIGN.md`, `TESTING.md`
- Investigation status: Complete for this ticket's scope (MCP secrets in the vault; requirements approved at SR-005); architecture investigation rounds 1 and 2 below support `design-spec.md` at SR-007

## Initial Request And Clarifications

- The Task: a design ticket first. Investigate the best solution for how secrets and integrations (GitHub, Jira, SSH and similar) reach skills and MCP servers without an agent being able to read them, and how a user configures an integration easily. It "improves security and enables cooperation in a company"; it's the foundation for an external board as the shared truth across nodes (autobyteus-302, paused) and for the secure cross-node network (autobyteus-300).
- The user's comments (2026-10-25), all read:
  1. the **proxy/broker idea** (Anthropic's GitHub proxy; the shell holds only a placeholder; compare an MCP/tool gateway, an HTTP forward proxy with placeholder substitution and an allow-list, credential-helper wrappers; the agent can still *use* a credential, so scope it);
  2. **SSH as the test case** (username and key or password in the vault; resolved only when the command really runs; "if this works, much can be converted to skill-based use, even MCP servers"), with the PM notes on ssh-agent, fixed command templates, the same-OS-user boundary, scoping, and skill-plus-CLI versus MCP;
  3. the **integration vision** (add the token once in the vault, e.g. "Connect GitHub"; packages declare the credentials they need; our scripts use a broker; third-party tools use ssh-agent, a git credential helper, or a local reverse proxy with an allow-list, redaction and audit);
  4. **bookmark lifted**: report and options first, ask the user directly, build only after approval.
- Constraints: no user credentials in tests or evidence; any change to the plain-text values in `mcps.json` needs the user's approval and a backup; no release unless asked.

## Source Log

| Date | Type | Source / Command | Finding | Established |
| --- | --- | --- | --- | --- |
| 2026-10-25 | Code | `autobyteus-server-ts/src/secret-management/domain/secret-id.ts`; `catalog/provider-credential-catalog.ts` | The vault is still a **closed catalog**: consumer kinds `llm`, `llmMetadata`, `search`, `media`, `agentRuntime`. No MCP, integration or user-named secret; no expiry/refresh record. Since 10-19 it only gained the test-vault selection (`9498de5f8b`, `855842b8f1`) | Read |
| 2026-10-25 | Data | `ls -la ~/.autobyteus/server-data/db/` and `secret-store/` (permission bits only) | The vault DB plus `production.db.secret.key` are `0600`, owned by the user. `mcps.json` is `0644`, with plain values (autobyteus-175) | Read |
| 2026-10-25 | Command | `test -r ~/.autobyteus/server-data/db/production.db.secret.key` from a shell running as the user (the content was not printed) | A same-user process **can read the vault's root key**, and with it decrypt the vault. On the desktop, agent shells run as the same user | **Measured** |
| 2026-10-25 | Command | `env PROBE_SECRET_VALUE=dummy… sleep 30 &` then `ps -E -p <pid>` (macOS 26.5.2) | A same-user process **can read another process's environment**. So a secret placed in an MCP stdio server's environment (or `ANTHROPIC_API_KEY` in the Claude runtime's api-key mode) is readable by an agent shell on the desktop. (Linux: `/proc/<pid>/environ` is readable by the same uid; same conclusion, read not run) | **Measured** (macOS) / Read (Linux) |
| 2026-10-25 | Code | `autobyteus-ts/src/tools/terminal/terminal-child-environment.ts`; `direct-shell-session.ts` L67 (`env = process.env`); no server provider of `terminalChildEnvironment` (grep) | A native agent's shell inherits the **whole server process environment** | Read |
| 2026-10-25 | Code | `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client.ts` L51 (`env: options.env ?? process.env`) | Codex (and its shell) inherits the whole server environment | Read |
| 2026-10-25 | Code | `runtime-management/claude/client/claude-sdk-auth-environment.ts` L21-41 | In `api-key` mode the vault's Anthropic key is put into the Claude process environment. The Claude CLI's shell tool runs beneath it. Whether Claude filters its bash environment is not verified | Read |
| 2026-10-25 | Doc | `autobyteus-server-ts/docs/modules/remote_collaboration.md` L22-28 | Node-to-node collaboration has **no authentication**: "trusted private network", "no credential ever crosses them"; peer authentication is a later slice (autobyteus-300) | Read |
| 2026-10-25 | Code | `autobyteus-server-ts/docs/modules/skills.md`; grep for a script runner or CLI | Skills are files (`SKILL.md` plus scripts). Their scripts run **in the agent's own shell**; no AutoByteus script runner or broker exists | Read |
| 2026-10-25 | Code (prior) | autobyteus-175/179/181 packages | MCP server credentials live server-side: the agent calls tools through the Agent Tools endpoint, and the server holds the MCP connection. The secret never reaches the agent *through the protocol*; the gaps are storage (plain `mcps.json`, GraphQL returning values) and readable files and environments | Read + Reproduced (179) |
| 2026-10-25 | Web | [OpenSSH agent restriction](https://www.openssh.com/agent-restrict.html); [ssh-add(1)](https://man.openbsd.org/ssh-add) | ssh-agent signs with a key and never exports it. OpenSSH 8.9+ `ssh-add -h` restricts a loaded key to listed destination hosts (and users), matched by host key; marked experimental, with forwarding caveats | Read (docs) |
| 2026-10-25 | Web | [git-credential](https://www.kernel.org/pub/software/scm/git/docs/git-credential.html) | `git credential fill` **prints** the username and password from the configured helpers to stdout. So a credential helper does not hide a token from a process that can run git as the same user | Read (docs) |
| 2026-10-25 | Web | [Secretless Broker](https://www.helpnetsecurity.com/2025/07/02/secretless-broker-open-source-tool-connects-apps-securely/); [conjur.org/secretless](https://www.conjur.org/secretless) | The industry pattern: the app connects to a local broker without credentials; the broker fetches them from a vault and opens the real connection (HTTP proxy adds the auth header; SSH/ssh-agent beta) | Read (docs) |
| 2026-10-25 | Web | [Docker MCP Gateway](https://www.docker.com/blog/docker-mcp-gateway-secure-infrastructure-for-agentic-ai/) | The gateway runs each MCP server in a container and injects credentials at call time; it also offers a `--block-secrets` payload scan | Read (docs) |
| 2026-10-25 | Web | [Apple: access control lists](https://developer.apple.com/documentation/security/access-control-lists.md) | A macOS keychain item has trusted apps. Another process (e.g. `security find-generic-password` from a shell) triggers a **user prompt**. That is real protection against a same-user shell on macOS | Read (docs) |
| 2026-10-25 | Web | [GitHub: refreshing user access tokens](https://docs.github.com/en/enterprise-server@3.18/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens) | GitHub App user tokens (web or device flow) last 8 h, with a 6-month refresh token, rotated on use | Read (docs) |
| 2026-10-19 | Prior | autobyteus-175 conversation (Anthropic engineering) | Claude Code on the web: real git credentials never enter the sandbox; a proxy validates a scoped credential and the request, then attaches the real token | Read (docs) |

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Evidence |
| --- | --- | --- | --- | --- | --- |
| `test -r …secret.key` | Same-user shell reading the vault key | Readable | Measured | On the desktop, encrypting the vault is no barrier against a same-user agent unless the root key moves out of reach (e.g. the macOS keychain) | This row |
| `env PROBE_SECRET_VALUE=dummy… sleep` + `ps -E` | Same-user shell reading a child process's environment | Visible | Measured | Environment injection protects only against accidental exposure, not against a determined same-user agent | This row |

- Temporary diagnostics: `None` (the probes were one-off shell commands with dummy values; nothing was written to the repository).
- Reproduction for implementation: N/A (design ticket).

## Threat Model (facts, used by the requirements)

| ID | Threat | Today | Notes |
| --- | --- | --- | --- |
| T1 | Accidental exposure: a secret in a plain file, API response, log, chat transcript, git commit, or an environment an agent prints | **Exposed**: plain `mcps.json`; GraphQL returns MCP env, headers and tokens; secrets in inherited environments | The secret scan (autobyteus-221) guards commits only |
| T2 | Prompt injection or a misbehaving agent trying to **read** a secret (cat, env, ps) | **Exposed**: all of T1, plus readable environments (Measured) | |
| T3 | A determined same-user agent on the desktop reading the vault itself | **Exposed**: the root key file is readable (Measured) | macOS keychain ACL can stop silent reads; Windows DPAPI and an unlocked Linux keyring do not stop same-user processes (known OS behavior, not run here). Real isolation needs a separate OS user, container or sandbox |
| T4 | An agent **using** a credential it cannot read (through a proxy or broker) for something harmful | N/A today | Needs scope (hosts, methods, paths), read-only by default, approvals for risky operations, rate limits, an audit log |
| T5 | Cross-node: a pairing or identity secret being read by a shell, or peers accepting anyone | **No authentication at all** (Read) | autobyteus-300; the same storage and broker model must cover it |

## Notes For The Options Report

The options are compared in `options-report.md` (this folder). The facts above decide two things:
- **Credential helpers and environment injection are not boundaries.** They only reduce accidental exposure.
- **Desktop protection against a determined agent needs the root key out of the shell's reach**, or a separate OS user.

## Architecture Investigation (2026-10-26, MCP secrets in the vault)

Authorities read for this phase: `references/architecture-design.md` and the full `shared/design-principles.md` (both updated, read 2026-10-26); `DESIGN.md` (re-read: rules 1–10, `GLOSSARY.md`, `docs/design-cases.md`); `docs/design-cases.md` (Cases 1–7); `GLOSSARY.md` (43 lines, node words only, so no secret/vault words yet).

| Source (file:line) | Fact | Established |
| --- | --- | --- |
| `autobyteus-ts/src/tools/mcp/types.ts` L61-112, L128-186 | `StdioMcpServerConfig.env: Record<string,string>`; `StreamableHttpMcpServerConfig.token: string\|null`, `headers: Record<string,string>`; `requestHeaders()` adds `Authorization: Bearer <token>` (L183-186); token + Authorization header rejected (L176-180) | Read |
| `autobyteus-ts/src/tools/mcp/server/stdio-managed-mcp-server.ts` L14-18; `http-managed-mcp-server.ts` L14-15 | The managed servers build the SDK transport from the config at connect: stdio `env: config.env`; HTTP `requestInit.headers: config.requestHeaders()` | Read |
| `autobyteus-ts/src/tools/mcp/server-instance-manager.ts` L34-46, L58-64, L92-103 | One owner creates managed servers: per run (`getServerInstance`, lazy) and for discovery (`managedDiscoverySession`, used by `tool-registrar.ts` L45) | Read |
| `server-instance-manager.ts` L19, L30-31, L105-127 | `setWorkspacePathProvider` has **no caller** in `autobyteus-ts/src` or `autobyteus-server-ts/src` (grep), so `applyWorkspaceEnv` never adds `AUTOBYTEUS_AGENT_WORKSPACE`. **Dead code in a file this ticket touches.** It also **corrects my 2026-10-26 statement to the user** that each run's MCP server is given its own workspace folder: it isn't; the user's `AUTOBYTEUS_AGENT_WORKSPACE` is a fixed value in his own config | Read (grep) |
| `autobyteus-ts/src/secrets/provider-api-key-resolver.ts` L9-11; `autobyteus-server-ts/src/secret-management/resolution/runtime-provider-api-key-resolvers.ts` L8-17; `…/secret-management-provider-api-key-resolver.ts` L21-27 | The established pattern: a storage-neutral resolver interface in core ("point-of-use capability injected into provider clients"), implemented by the server over `SecretManagementService`, passed to the clients that use it | Read |
| `autobyteus-ts/src/secrets/secret-value.ts` L1-30 | `SecretValue`: non-serializable; `toString`/`toJSON`/inspect give `<redacted-secret>`; only `revealToTrustedConsumer()` unwraps | Read |
| `autobyteus-ts/src/secrets/vault/secret-id.ts` L4-10 | A `SecretId` must match `^[a-z0-9][a-z0-9._-]*$` (lowercase). MCP server IDs and env/header names are case-sensitive (`VideoAudioServer`, `AUTOBYTEUS_API_KEY`), so an ID derived from names would need an encoding, or would collide | Read |
| `autobyteus-server-ts/src/secret-management/domain/secret-id.ts`; `catalog/provider-credential-catalog.ts`; `services/secret-management-service.ts` L50-131 | The write side: `saveForConsumer`, `removeForConsumer`, `getStatusForConsumer`, `resolveForUse`, each `authorize(consumer)` through the catalog (closed list of consumer kinds) | Read |
| `autobyteus-server-ts/src/secret-management/provisioning/local-import-credential-alias-registry.ts` | The test vault importer knows only fixed aliases; unknown names → `null` (skipped) | Read |
| Config entry forms (grep `new Stdio…Config`, `parseMcpConfigDict(`): `file-provider.ts` L88 (startup load); `mcp-config-service.ts` L158 (bulk import); `api/graphql/types/mcp-server.ts` L47, L62 (`createDomainConfigFromInput`: configure and preview); `autobyteus-ts/src/tools/mcp/config-service.ts` L92-94, L124 (core parse); `tool-registrar.ts` L156 (`listRemoteTools` from a dict); `server-instance-manager.ts` L118 (dead workspace path) | Every place a config is built, so every entry form must accept the secret reference | Read |
| `autobyteus-server-ts/src/api/graphql/types/mcp-server-config.ts` L41-42, L65-69, L89-90, L101-105; `converters/mcp-server-converter.ts` L28, L40-41 | GraphQL `env`/`headers` are `GraphQLJSON` maps with values; `token` is a string, returned to the client | Read |
| `autobyteus-server-ts/src/api/graphql/types/mcp-server.ts` L96-163 | Entry points: `previewMcpServerTools`, `configureMcpServer`, `deleteMcpServer`, `discoverAndRegisterMcpServerTools`, `importMcpServerConfigs` | Read |
| Web consumers (grep): `components/tools/McpServerFormModal.vue` (form, JSON tab), `components/tools/McpBulkImportView.vue`, `stores/toolManagementStore.ts` L79-162, `graphql/queries/mcpServerQueries.ts`, `graphql/mutations/mcpServerMutations.ts`, `generated/graphql.ts` | The derived consumers of the config shape on the web | Read |
| `application*` folders (grep `mcpServers`) | No application-package code builds MCP configs | Read |
| Gateway and agent tools (`src/mcp-gateway/*`, `src/agent-tools/mcp/configured-mcp/*`) | Read tool definitions from the registry only, never config values | Read |

## Architecture Investigation, round 2 (2026-10-26, after ARCH-REV-001)

Each line was opened by the Solution Designer to check the review's evidence (Principle: claims checked, not taken on trust).

| Source (file:line) | Finding | Kind |
| --- | --- | --- |
| `autobyteus-server-ts/src/mcp-server-management/providers/cached-provider.ts` L21-80 | The full cache is filled once and changed only by its own create/update/delete, so a write beside it leaves `getAll()` stale | Read |
| `mcp-server-management/providers/` | `persistence-provider.ts` (the interface), `cached-provider.ts`, `file-provider.ts` | Read |
| `secret-management/services/secret-management-service.ts` L50-55, L57-64, L171-181 | `getStatusForConsumer` authorizes and then `requireReady()`, which throws `VAULT_LOCKED`/`VAULT_UNAVAILABLE`; `getStatusForSecretId` requires `isKnownSecretId` | Read |
| `api/graphql/types/mcp-server.ts` L84-93 | `mcpServers` turns any error into "Unable to fetch MCP server configurations" | Read |
| `secret-management/catalog/provider-credential-catalog.ts` L29-72 | `resolve` covers llm/llmMetadata/search/media/agentRuntime only; `isKnownSecretId` = fixed IDs + OpenAI-compatible pattern; `listFixedSecretIds` feeds test-vault status | Read |
| `secret-management/domain/secret-id.ts` L4-18 | `SecretConsumerIdentity` union (where `mcpServer` is added) | Read |
| `server-runtime.ts` L175, L214, L240 | Vault `initialize(vaultSource)` before `app.listen`; the MCP loader runs as a background task after listen | Read |
| `autobyteus-web/components/tools/McpServerFormModal.vue` L95-114 | Env rows exist; the HTTP section has only URL and Token, no header rows | Read |
| `TESTING.md` "Test vault" (L193-240) | A server on the test vault is read-only (`SECRET_VAULT_READ_ONLY`); deterministic suites keep their own vault; only live opt-ins apply the captured setting | Read |
| `test-support/test-vault/test-vault-selection.ts` L14-23; `live-server-vault.ts` L50-89 | `capturedTestVaultSetting()`; `initializeLiveServerVault`; `requireLiveCapability` (skip with "missing capability", strict mode fails) | Read |
| `autobyteus-ts/src/secrets/vault/open-test-vault.ts`, `read-secret-entry.ts` L23-30 | `openVerifiedTestVault(dir)` opens read-only; `readSecretEntry(store, rootKey, metadata, id)` returns a `SecretValue` or `SECRET_NOT_FOUND` | Read |
| `secret-management/provisioning/writable-vault-target.ts` L22-29 | Both `secrets:import` and `test-vault setup` open their target through this; the import service decides IDs (`local-environment-secret-import-service.ts` L120) | Read |
