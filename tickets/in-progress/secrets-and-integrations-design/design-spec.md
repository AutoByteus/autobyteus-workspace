# Design Spec — MCP server secrets in the vault (autobyteus-244)

## Solution And Approval Basis

- Current solution revision ID: `SR-007` (revises SR-006 after architecture review ARCH-REV-001: AR-001…AR-010)
- Approved requirements: `requirements-doc.md`, section "MCP Secrets In The Vault (this ticket)", MREQ-001…MREQ-008 and MDEC-001…MDEC-005.
  - Approved by the **User** in the Solution Designer conversation on 2026-10-26; quotes are in the requirements and in SR-005.
  - SR-007 changes no intended behavior. The AR-006 and AR-007 resolutions are decided within MDEC-001/MDEC-002 (see "Decisions made within the approved direction") and the user is informed.
- Behavior-defining supplements: none for this ticket's scope. `solution-validation.md` and `options-report.md` describe the long-term model only.
- Design status: `Ready`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/secrets-and-integrations-design/tickets/in-progress/secrets-and-integrations-design/investigation-notes.md`, sections "Architecture Investigation" and "Architecture Investigation, round 2".
- Authorities read on 2026-10-26:
  - `references/architecture-design.md`, `shared/design-principles.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`;
  - `DESIGN.md` (rules 1–10), `GLOSSARY.md`, `docs/design-cases.md`;
  - `autobyteus-server-ts/docs/design/data_migration_guideline.md` §2;
  - `TESTING.md`, including "Test vault" (L193-240);
  - `design-review-report.md` (ARCH-REV-001).
- Conflicts or discrepancies: none open.

## Current-State Read

**Where settings come from.** MCP server settings live in `mcps.json`. The file is owned by `FileMcpServerConfigProvider` (`file-provider.ts`, writes at L112-155 through the atomic `updateJsonFile`, `store-utils.ts` L212-226). It sits behind `CachedMcpServerConfigProvider`, which fills a full in-memory cache once and changes it only in its own create, update and delete (`cached-provider.ts` L21-80). Both are reached only through `McpConfigService` (`mcp-config-service.ts` L35-41). Settings are also built from GraphQL input (`api/graphql/types/mcp-server.ts` L29-73, used by configure and preview) and by bulk import (`mcp-config-service.ts` L158).

**Secret fields are plain strings.** All of these become core configs whose secret-bearing fields are plain strings: stdio `env`, HTTP `token` and `headers` (`autobyteus-ts/src/tools/mcp/types.ts` L61-186).

**One owner creates managed servers.** `McpServerInstanceManager` creates every managed server: per run, lazily, and for discovery (`server-instance-manager.ts` L34-64; `tool-registrar.ts` L44-48). A managed server builds its SDK transport from its config when it connects (`stdio-managed-mcp-server.ts` L14-18, `http-managed-mcp-server.ts` L14-15).

**The vault.** The vault is a closed catalog with a value-free API (`provider-credential-catalog.ts` L29-72; `secret-management-service.ts` L50-131). Status, remove and resolve throw when the vault is not READY (L171-181). Provider keys are resolved at the point of use through a core resolver interface that the server implements (`provider-api-key-resolver.ts` L9-11; `runtime-provider-api-key-resolvers.ts` L8-17).

**GraphQL.** GraphQL returns `env`, `headers` and `token` values to the browser (`mcp-server-converter.ts` L28, L40-41). The `mcpServers` resolver turns any error into "Unable to fetch MCP server configurations" (`mcp-server.ts` L84-93).

**The form.** The form has env rows but no header rows. Headers can be edited only in the JSON tab (`McpServerFormModal.vue` L104-114, L263, L357-358, L383).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`. Three packages; one changed shared contract (the GraphQL MCP types); one persisted shape change (`mcps.json` values may be references); a new user maintenance action (move to vault) with a backup.
- Architectural risk: `High`. Security; persisted-data shape; a contract clean cut; a user-data rewrite with a backup.
- Escalation trigger (Design Impact):
  - an MCP config construction path missing from the entry-form table;
  - any place where a resolved value would be persisted, logged or returned;
  - any write to `mcps.json` that bypasses the provider boundary.

## Architecture Investigation Evidence

See the investigation notes, "Architecture Investigation" and "Architecture Investigation, round 2". Round 2 confirmed the review's evidence at the cited lines:
- the provider cache;
- `requireReady`;
- the `mcpServers` error mapping;
- the form's HTTP section;
- the test vault being read-only;
- `server-runtime.ts` vault initialization (L172-176) before `app.listen` (L214), with the MCP background task after it (L240);
- the test-vault helpers in `test-support/test-vault/`.

## Intended Change

A secret-bearing MCP value is stored in the vault, and `mcps.json` holds a **secret reference** in its place (`{"vaultSecretId": "mcp.<uuid>"}`).

- **Connect.** The managed server resolves its references through the core **MCP secret resolver** when it connects, and never earlier.
- **Saving.** Every save goes through one **server draft**. Configure, preview and import all use it.
- **Status.** One owner computes each secret's state. A vault that is unavailable gives the state "needs secret"; it never makes the query fail.
- **The file.** `mcps.json` is written only by its provider. That includes the user-triggered move, which writes a backup first.

## Change Scope (Mandatory)

In scope: UC-001, UC-002 and UC-006 for MCP servers (MREQ-001…MREQ-008).

- **autobyteus-ts:**
  - the MCP config value types;
  - the MCP secret resolver interface and the `resolveMcpValues` helper;
  - connect in the managed servers;
  - the instance manager (holds the resolver; the dead workspace code is removed);
  - the core parse.
- **autobyteus-server-ts:**
  - the `mcpServer` consumer kind, the catalog, and the test-only secret ID;
  - the resolver implementation, wired in `server-runtime.ts`;
  - the server draft and the `McpServerSecretFields` owner (store, preview, states, move candidates);
  - the secret suggestion rule;
  - `McpConfigService` operations and its write lock;
  - provider reads and writes of references, and the batch reference write with backup (file and cache);
  - the GraphQL types, input mapper and converter;
  - bulk import;
  - the test-vault alias;
  - the gated live check and the test-side secret reader.
- **autobyteus-web:**
  - form env and **header** rows with lock toggles;
  - the token field states;
  - the JSON tab markers;
  - the banner and review dialog;
  - the card's "needs secret";
  - the import result;
  - the store, queries, mutations and codegen;
  - en and zh-CN text.
- **Docs:**
  - `GLOSSARY.md` and `docs/design-cases.md` (a Case 5 entry);
  - `autobyteus-server-ts/docs/modules/mcp_server_management.md` and `secret_management.md` (test-only ID);
  - `autobyteus-web/docs/tools_and_mcp.md`;
  - `TESTING.md` "Test vault" (the alias).

Deliberately left alone:
- provider-key vault behavior;
- FU-001…FU-004 (proxy and Integrations page, SSH, root-key hardening, agent-shell environment);
- the MCP gateway and Agent Tools, which read tool definitions only;
- the message gateway.

Follow-ups: FU-001…FU-004. Design adds no new follow-up.

## Decisions Made Within The Approved Direction (SR-007; the user is informed)

- **AR-006: an always-secret field stored as plain text.** The HTTP `token` and an `Authorization` header are always secret (MDEC-001), so no value of theirs is ever returned (MREQ-002), even while it is still stored plain. The row reads "Stored as plain text · Move to vault · Replace". A form save without a new value keeps the stored value as it is. Turning it into a vault entry is the move (MDEC-002, with the backup).
  - Other plain env values and header values are **settings** until the user locks them. They are returned as today. When the rule matches one, the row shows "Looks like a secret · Move to vault", because MDEC-001 makes the rule a suggestion only (for example `TOKEN_LIMIT=4096`).
  - Move candidates always include plain `token` and `Authorization` values, and any plain value the rule matches.
- **AR-007: header rows.** The form gains header rows, using the same row component as env rows, each with its lock toggle (MDEC-001: "a lock toggle per row" for env values and other headers). No new visual language is introduced (it reuses the env-row pattern), so no Product Design round is needed.
- **Plain → reference via the form.** Locking a row whose stored value is plain and saving it replaces a stored plain value. So it gets the same backup as the move (MREQ-005), written by the provider (see DS-004).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | REQ / Decision | Trigger | Target path | Spine |
| --- | --- | --- | --- | --- |
| BEH-001 (store) | MREQ-001, MREQ-004, MDEC-001 | The user saves a server in the form or the JSON tab | Draft → secret fields (store) → provider → `mcps.json` holds references | DS-001 |
| BEH-001 (use) | MREQ-003, MREQ-007 | A run's tool call, discovery | The managed server resolves at connect | DS-002 |
| Preview | MREQ-003 | "Preview tools" in the form | Draft → secret fields (preview: new values in memory, kept values → saved references) → managed server | DS-006 |
| BEH-005 (no exposure) | MREQ-002, MREQ-007 | `mcpServers`, the configure result, the JSON tab | Secret fields (states) → converter: entries with `state`, no secret value | DS-003 |
| UC-006 (move) | MREQ-005, MDEC-002 | The banner or a row's "Move to vault" | `McpConfigService.moveSecretsToVault` → vault saves → provider batch write with backup → re-register | DS-004 |
| Import | MREQ-006, MDEC-004 | Bulk import JSON | The rule builds drafts → the same store path as DS-001; the result lists `storedSecrets` | DS-001 |
| Delete | MREQ-001 | The user deletes a server | Unregister → provider delete → remove its vault entries | DS-001 |
| Live check | MREQ-008, MDEC-005 | A gated test | Test-vault reader → an isolated server with its own vault → configure → tools/issue #1 | DS-005 |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature` (security).
- Current design issue found: `Yes`.
- Root cause classification: `Missing Invariant`. "No secret is stored or returned in plain text" holds for provider keys but not for MCP values.
- Refactor needed now: `Yes`, bounded:
  - one value type for secret-bearing fields;
  - one server draft that replaces the GraphQL layer's direct core-config construction (`createDomainConfigFromInput`);
  - a provider batch write;
  - a service write lock;
  - removal of the dead workspace code.
- Structural triggers fired:
  - **P1, several entry forms:** six construction sites (entry-form table).
  - **P5, persisted data:** `mcps.json`.
  - **P11, derived consumers:** the cache, the converter, the configure result, the web store, the JSON tab, the card and the import result (consumer table).
  - **P13, one owner per sequence:** the managed server calls the resolver; `McpConfigService` drives the move; no function is passed into another collaborator's call.
  - **P15, one vocabulary:** `field`, draft and state are defined once.
  - **Repeated rule:** the secret suggestion rule has one owner, and the web reads it.

## Terminology (Principle 15; added to `GLOSSARY.md` in this change)

| Word | Meaning | Not to be confused with |
| --- | --- | --- |
| **vault secret ID** (existing `SecretId`) | The stable name of one vault entry (`provider.openai.api-key`, now also `mcp.<uuid>` and the test-only `test.github.token`) | — |
| **secret reference** | The stored pointer written in place of a value: `{ "vaultSecretId": "mcp.<uuid>" }` | the value |
| **MCP secret** | An MCP server value stored as a vault entry | provider keys |
| **secret field** (`field`) | Which value of a server is meant: `env:<NAME>`, `header:<Name>` or `token`. Names keep their case. Used in every interface that talks about one value of a server (resolver context, errors, states, candidates, selection, `storedSecrets`) | the env or header `name` alone |
| **always-secret field** | `token` and `header:Authorization` (case-insensitive name): always locked, and their value is never returned | — |
| **locked** (UI) | A row whose value is or will be an MCP secret | — |
| **secret state** (`McpSecretState`) | `PLAIN` (stored as plain text) · `CONFIGURED` (reference, vault entry present) · `MISSING` (reference, no entry) · `VAULT_UNAVAILABLE` (reference, vault not READY) | vault health |
| **server draft** (`McpServerDraft`) | A server's settings as the user sent them: each value is `plain`, `newSecret` or `keep` | a core config |
| **keep marker** (JSON tab) | `{"stored": "vault"}` or `{"stored": "plain"}`: "keep what is stored for this field" | a secret reference |
| **secret suggestion rule** | The name keywords and value prefixes that pre-lock rows and select move candidates | secret scanning (autobyteus-221) |

## Legacy Removal Policy (Mandatory)

- Obsolete paths:
  - GraphQL `env`/`headers` as `GraphQLJSON` maps and `token` returned as a string (clean cut, rule 9);
  - `createDomainConfigFromInput` and `toStringRecord` (`mcp-server.ts` L29-73);
  - `asRecordStringString` (`file-provider.ts` L26-35), which would turn a reference into `"[object Object]"`;
  - the dead `setWorkspacePathProvider` / `applyWorkspaceEnv` code.
- Compatibility wrappers kept: `None`. Plain strings in `mcps.json` stay a current, supported shape (unlocked settings).

## Persisted Data / State Transition Decision (Mandatory)

- **Stored subject:** `<appDataDir>/mcps.json`, a handful of servers. The user's file has 6 stdio servers.
- **Change:**
  - an env value, header value or `token` is either a string or a secret reference;
  - the vault gains `mcp.<uuid>` entries.
- **Readers and writers:**
  - `FileMcpServerConfigProvider` (`parseEntry`/`toStandardEntry`, and the new value parser replacing `asRecordStringString`);
  - core `parseMcpConfigDict` (`config-service.ts` L124).
- **Decision:** `Directly Usable — No Migration`.
- **The move** is a user-triggered maintenance action (MDEC-002). Answers to Guideline §2:
  1. **No startup migration.**
  2. **Availability:** unaffected until the user acts.
  3. **Source shape:** the current writer's output.
  4. **Per value:** moved or left plain, as the user selects.
  5. **Commit:** see DS-004. Vault saves come first. One provider write, under the file lock, writes the backup and then the rewritten file atomically. If that write fails, the new vault entries are removed.
  6. **No legacy interpretation.**
  7. **Cost:** one file write plus N vault writes.
  8. **A bad reference** (unknown or missing ID) gives `MISSING` for that server only (rule 7).
  9. **Tests:** listed below.
  10. **Lessons:** Case 5, and rule 7.
- **Backup:** `mcps.json.backup-before-vault-move-<timestamp>`, mode 0600, next to `mcps.json`. It holds the plain values. The move result and the dialog tell the user its path and that it contains the plain values, so the user can delete it.

## How The Record Shape Meets MREQ-004 (AR-009)

A vault entry is opaque: `mcp.<uuid>` under consumer kind `mcpServer`. The owner (the server ID) and the field (`env:<NAME>` / `header:<Name>` / `token`) are held by the reference's position in `mcps.json`, not in the vault record. So MREQ-004's "owner + field" is met by the reference, and the vault needs no MCP-specific columns.

Later integrations (FU-001/FU-002) add their own consumer kind and ID prefix (for example `integration.<uuid>`) to the same vault and catalog, with their owner and field in their own definition file. No other store is needed.

Consequence: an entry that no file references any more (for example after a hand edit) is an orphan. It is harmless (R-2).

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Governing owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary | Form, JSON tab, bulk import, delete | `mcps.json` with references; vault entries | `McpConfigService` |
| DS-002 | Primary | A run's tool call, discovery | The MCP server receives the header or the env | The managed server (core) |
| DS-003 | Primary | `mcpServers` query, configure result | Entries with states, no secret values | `McpConfigService.listMcpServerViews` / `McpServerSecretFields.statesOf` |
| DS-004 | Primary | The banner or a row's "Move to vault" | Backup, vault entries, rewritten file and cache, re-registered servers | `McpConfigService.moveSecretsToVault` |
| DS-005 | Test | Gated live check | GitHub MCP lists tools and reads issue #1 | The live test |
| DS-006 | Primary | Preview tools (form) | The tool list from a temporary connection | `McpConfigService.previewMcpServerTools` |
| DS-007 | Bounded local | `createClientSession` | Resolved transport options | The managed server |

## Primary Execution Spines

- **DS-001 (store):**
  1. GraphQL `configureMcpServer(input)` → `McpServerInputMapper.toDraft` (shape only, no vault).
  2. `McpConfigService.configureMcpServer(draft)` takes the service write lock, then reads the saved config from the provider.
  3. `McpServerSecretFields.store(draft, saved)` saves each `newSecret` value with `saveForConsumer({kind:"mcpServer", vaultSecretId: new mcp.<uuid>})`. It maps `keep` to the saved field's value (a reference or a plain string) and returns `{config, created: SecretId[], obsolete: SecretId[]}`.
  4. `provider.create` or `provider.update(config)` writes the file and the cache. The backup is written first when a stored plain value becomes a reference.
  5. Once the write has committed, the `obsolete` entries are removed (replaced, unlocked or removed fields). If the write throws, the `created` entries are removed.
  6. The core config service's `addConfig`, then registration.
  7. The result is a `McpServerView` (DS-003).
  - **Import:** `importMcpServerConfigs(json)` → `McpSecretSuggestionRule` builds a draft per server (always-secret fields and rule matches become `newSecret`) → the same store path for each server → result `{…, storedSecrets: [{serverId, field}]}`.
  - **Delete:** lock → unregister → `provider.deleteByServerId` → once committed, remove the referenced entries.
- **DS-002 (use):**
  1. A run's tool call or discovery → `McpServerInstanceManager` creates the managed server with its `McpSecretResolver`.
  2. `createClientSession` calls `resolveMcpValues(values, resolver, {serverId})` for env, headers and token.
  3. The server side resolves through `SecretManagementService.resolveForUse({kind:"mcpServer", vaultSecretId})`.
  4. stdio: the env is the plain values plus the resolved values. HTTP: the headers are the plain values plus the resolved values, and the token is added as `Authorization: Bearer`.
  5. The SDK transport connects.
- **DS-003 (show):**
  1. `mcpServers` → `McpConfigService.listMcpServerViews()` → `provider.getAll()`.
  2. `McpServerSecretFields.statesOf(configs)` returns `Map<serverId, Map<field, McpSecretState>>`. A vault that is not READY gives `VAULT_UNAVAILABLE`; it never throws.
  3. `McpServerConverter.toGraphql(view)` is a sync, pure mapper. It never sees a secret value.
  4. The store, then the form and the card. `configureMcpServer` returns the same view.
- **DS-004 (move):**
  1. `mcpSecretMoveCandidates` → `McpConfigService.listSecretMoveCandidates()` → `McpServerSecretFields.moveCandidates(configs)`: always-secret plain fields plus plain values the rule matches → `[{serverId, field, matchedBy}]`.
  2. The review dialog, where the user unticks rows; a per-row "Move to vault" sends a single field.
  3. `moveMcpSecretsToVault(selection)` → `McpConfigService.moveSecretsToVault(selection)` takes the service write lock and reads the current configs from the provider (the cache, which every write goes through).
  4. For each selected field that is still plain: `McpServerSecretFields.storePlainAsSecret` saves a new `mcp.<uuid>` and records `{serverId, field, reference}`. Fields that are gone or already references are reported as skipped.
  5. `provider.replaceWithReferences(changes)`. Inside one `updateJsonFile`, under the file lock, it writes the backup, applies the changes to the file it has just read, and writes the file atomically. The cache is updated after the commit.
  6. If step 5 throws, the new entries are removed and the error is returned. The file is unchanged.
  7. For each changed server: core `addConfig`, then `toolRegistrar.registerServer`.
  8. The result is `{backupPath, moved: [{serverId, field}], skipped, serversFailingAfterMove: [{serverId, reason}]}`.
- **DS-005 (live check):**
  1. `readLiveTestSecret(context, "test.github.token")` opens the captured test vault read-only (`capturedTestVaultSetting` → `openVerifiedTestVault` → `readSecretEntry`) and closes it. If the entry is missing, the test is skipped with "missing capability" (strict mode fails instead).
  2. The suite initializes the in-process vault runtime with **its own application vault** in its temp data root (the default for deterministic suites; the test vault is read-only).
  3. GraphQL `configureMcpServer`: GitHub remote MCP, with `Authorization` locked and a `newSecret` value of `Bearer <token>`.
  4. Assert that `mcps.json` holds only a reference and that `mcpServers` returns the state `CONFIGURED` and no value.
  5. Discover the tools, then call the issue tool for `ryan-zheng-teki/autobyteus-mcp-test` #1.
  6. Assert that the token appears in no log, response or file of the run.
- **DS-006 (preview):**
  1. GraphQL `previewMcpServerTools(input)` → draft → `McpConfigService.previewMcpServerTools(draft)` reads the saved config, if any.
  2. `McpServerSecretFields.toPreviewConfig(draft, saved)` puts `newSecret` and `plain` values into a **memory-only** core config as strings, and maps `keep` to the saved field's value (a reference stays a reference).
  3. The temporary managed server resolves the references at connect (DS-002) and is closed. Nothing is stored.
- **DS-007 (resolve):** references → `resolveMcpValues` → `SecretValue` → revealed only while the transport options are built → transport.

## Spine Narratives (Mandatory)

| Spine | Narrative |
| --- | --- |
| DS-001 | The form sends a draft. A `newSecret` value is saved under a new ID, and the old ID of a replaced field is removed after the file commits. So the file always points at an entry that exists (if the write fails, the new entries are removed). Saves happen before the file write and removals after it (AR-008). |
| DS-002 | The managed server resolves its own references, through the resolver its instance manager gave it. A missing entry or an unavailable vault gives `McpSecretUnavailableError {serverId, field, reason: "MISSING" \| "VAULT_UNAVAILABLE"}`, with no value. |
| DS-003 | Secret states are read in one async step. The converter maps the config and the states. The card shows "needs secret" when any entry state, or the token state, is `MISSING` or `VAULT_UNAVAILABLE`. |
| DS-004 | Only `McpConfigService` drives the move, under its write lock. Only the provider writes the file and the backup, in one locked write, so the cache and the file agree. |
| DS-005 | The real store → resolve path, against GitHub, with the token read once from the test vault by the test. |
| DS-006 | Preview never stores anything. Kept secrets are resolved from the saved server's references. |

## Ownership Map

| Node | Owns |
| --- | --- |
| `McpServerFormModal` + `McpConfigRows` (env and header rows, shared) | Editing, lock toggles, write-only secret inputs, per-row state labels, the JSON tab and its keep markers |
| `McpServerInputMapper` (GraphQL layer) | GraphQL input → `McpServerDraft` (shape only) |
| `McpConfigService` | The configure, import, delete, preview, list and move sequences; the order of vault and file steps; the write lock |
| `McpServerSecretFields` | Draft ↔ config in store and preview modes; `statesOf`; `moveCandidates`; `storePlainAsSecret`. The only MCP code that calls `SecretManagementService` for writes and status |
| `McpSecretSuggestionRule` | The keywords, prefixes and always-secret fields; `matches(field, value)` |
| `CachedMcpServerConfigProvider` → `FileMcpServerConfigProvider` | The only writers of `mcps.json` and its backup; the cache |
| `SecretManagementService` + catalog | Encryption; authorization of `mcpServer`; the test-only ID |
| `McpSecretResolver` (core) / `SecretManagementMcpSecretResolver` (server) | Resolving one reference at the point of use |
| Managed servers | The connect sequence, including resolution |

## Entry-Form Table (Principle 1; all six sites confirmed by the review)

| Entry form | Code today | After the change |
| --- | --- | --- |
| Form save (configure) | `mcp-server.ts` L110-115 → L29-73 | Input → draft → DS-001 |
| JSON tab save | Same mutation, built by `McpServerFormModal.vue` `buildInputFromJson` | Keep markers → `keep`. A string under an always-secret field, or a locked row → `newSecret`. A new name the rule matches → locked (pre-ticked) and shown on the Form tab before saving |
| Preview | `mcp-server.ts` L96-101 | DS-006 |
| Bulk import | `mcp-config-service.ts` L158 | The rule builds drafts → DS-001 |
| Startup load | `file-provider.ts` L88 → core parse | References are parsed and resolved only at connect |
| Core parse from dict | `config-service.ts` L124; `tool-registrar.ts` L156 | Accepts a string or `{vaultSecretId}` per value |
| Workspace env path | `server-instance-manager.ts` L105-127 | Removed (dead) |
| Delete | `mcp-server.ts` L126-130 | DS-001 delete |

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced by |
| --- | --- | --- |
| `setWorkspacePathProvider`, `workspacePathProvider`, `applyWorkspaceEnv`, the `WorkspacePathProvider` type (`server-instance-manager.ts` L12, L19, L30-31, L45, L105-127) | No caller anywhere (confirmed by the review) | — (`getServerInstance` passes `baseConfig` straight on) |
| GraphQL `GraphQLJSON` env/headers maps and `token: String` (`mcp-server-config.ts` L41-42, L65-69, L89-90, L101-105) | Clean cut | `McpConfigEntry` / `McpConfigEntryInput`, `tokenState`, `McpTokenInput` |
| `createDomainConfigFromInput`, `toStringRecord` (`mcp-server.ts` L29-73) | They coerce values to strings and build core configs in the API layer | `McpServerInputMapper.toDraft` + `McpServerSecretFields` |
| `asRecordStringString` (`file-provider.ts` L26-35) | It would turn a reference into a string | `parseMcpConfigValueRecord` (a string or a reference; anything else is a parse error for that server only) |
| The converter's value pass-through (`mcp-server-converter.ts` L28, L40-41) | Values must not be returned | View mapping by state |

## Interface Boundary Mapping

| Interface | Shape |
| --- | --- |
| Core `McpConfigValue` (`types.ts`) | `string \| McpSecretReference`, where `McpSecretReference = { vaultSecretId: SecretId }`; validated in the config constructors |
| Core `McpSecretResolver` (`autobyteus-ts/src/tools/mcp/mcp-secret-resolver.ts`) | `resolve(reference, context: { serverId: string; field: McpSecretField }): Promise<SecretValue>`. It may throw `McpSecretUnavailableError`. The same file has `resolveMcpValues(...)`, used by both managed servers |
| `McpServerInstanceManager.useSecretResolver(resolver)` | Called once in `server-runtime.ts`, right after `getSecretVaultRuntime().initialize(vaultSource)` (L175) and before `app.listen` (L214) (AR-005). The server resolver binds the vault runtime lazily, like `runtime-provider-api-key-resolvers.ts` L6. Without a resolver, a config with references fails with `McpSecretUnavailableError {reason: "VAULT_UNAVAILABLE"}` |
| Server `SecretConsumerIdentity` | Adds `{ kind: "mcpServer"; vaultSecretId: SecretId }`. `catalog.resolve` accepts only `^mcp\.[0-9a-f-]{36}$`, and `isKnownSecretId` accepts that pattern too |
| Test-only secret ID | `test.github.token`. Known to `isKnownSecretId` and `listFixedSecretIds` (test-vault status). Never returned by `resolve` for any consumer. The alias `AUTOBYTEUS_TEST_GITHUB_TOKEN` is accepted only by `test-vault setup`; `secrets:import` into an application vault rejects it |
| `McpServerDraft` (`mcp-server-management/domain/mcp-server-draft.ts`) | Common: `serverId`, `enabled`, `toolNamePrefix` (as today). stdio: `command`, `args`, `cwd`, `env: DraftEntry[]`. HTTP: `url`, `headers: DraftEntry[]`, `token: DraftValue \| null` (`null` = no token). `DraftEntry = {name, value: DraftValue}`; `DraftValue = {kind:"plain", value} \| {kind:"newSecret", value: SecretValue} \| {kind:"keep"}`. `keep` is valid only when the saved server has that field. An always-secret field cannot be `plain` unless it is `keep` of a stored plain value |
| `McpConfigService` | `configureMcpServer(draft): Promise<McpServerView>`; `previewMcpServerTools(draft): Promise<ToolDefinition[]>`; `importMcpServerConfigs(json): Promise<ImportResult>`; `deleteMcpServer(serverId): Promise<boolean>`; `listMcpServerViews(): Promise<McpServerView[]>`; `listSecretMoveCandidates(): Promise<MoveCandidate[]>`; `moveSecretsToVault(selection: {serverId, field}[]): Promise<MoveResult>`. `McpServerView = {config, states: Map<McpSecretField, McpSecretState>}` |
| Provider (cached + file + `persistence-provider.ts` interface) | Adds `replaceWithReferences(changes: {serverId, field, reference}[]): Promise<{backupPath}>`. `update` writes the backup first when a stored plain value becomes a reference |
| GraphQL output | `McpConfigEntry {name, value: String, state: McpSecretState!}`, where `value` is set only when `state = PLAIN` and the field is not always-secret. stdio `env: [McpConfigEntry!]!`; HTTP `headers: [McpConfigEntry!]!`, `tokenState: McpSecretState` (null = no token) |
| GraphQL input | `McpConfigEntryInput {name: String!, secret: Boolean!, value: String}`. `secret` with a `value` = `newSecret`; `secret` with no `value` = `keep`; not `secret` = `plain` (a `value` is required). The server forces `secret` for always-secret fields. `token: McpTokenInput`: `{value}` = replace, `{keep: true}` = keep, field absent = no token. Both, or neither, gives a validation error |
| GraphQL `mcpSecretSuggestionRule` | `{nameKeywords, valuePrefixes, alwaysSecretFields}` |
| GraphQL move | `mcpSecretMoveCandidates: [{serverId, field, matchedBy: ALWAYS_SECRET \| NAME \| VALUE_PREFIX}]` (no value or part of one); `moveMcpSecretsToVault(selection: [{serverId, field}])` → `MoveResult` |
| Import result | Adds `storedSecrets: [{serverId, field}]` next to `failures` (autobyteus-190) |

Configure input example (an HTTP server: kept `Authorization`, a new secret header, a plain header, a kept token):
```graphql
configureMcpServer(input: { serverId: "github-remote", transportType: STREAMABLE_HTTP,
  streamableHttpConfig: { url: "https://api.githubcopilot.com/mcp/",
    headers: [ { name: "Authorization", secret: true },
               { name: "X-Api-Key", secret: true, value: "<new value>" },
               { name: "X-Toolsets", secret: false, value: "repos,issues" } ],
    token: { keep: true } } })
```
Output, including a missing secret and an always-secret field still stored plain:
```json
{ "serverId": "github-remote", "headers": [
    { "name": "Authorization", "value": null, "state": "PLAIN" },
    { "name": "X-Api-Key", "value": null, "state": "MISSING" },
    { "name": "X-Toolsets", "value": "repos,issues", "state": "PLAIN" } ],
  "tokenState": null }
```
The card shows "needs secret: header X-Api-Key". The Authorization row reads "Stored as plain text · Move to vault".

## Derived Consumers Of The Changed Shape (Principle 11)

| Consumer | Decision |
| --- | --- |
| `CachedMcpServerConfigProvider` cache | Updated only by provider writes, including `replaceWithReferences` (AR-001) |
| `configureMcpServer` result (`mcp-server.ts` L116-118) | The same `McpServerView` mapping as `mcpServers` |
| `McpServerFormModal.vue` (rows, token, `updateJsonFromForm`, `buildInputFromJson`) | Shared env and header rows (`McpConfigRows.vue`, new); token states; keep markers |
| `McpServerCard.vue` | "needs secret" derived from the entry and token states |
| `McpBulkImportView.vue` | Shows `storedSecrets` |
| `McpSecretMoveBanner.vue` (new) + review dialog | Candidates, selection, result with the backup path and a note that it holds plain values |
| `toolManagementStore.ts`, `mcpServerQueries.ts`, `mcpServerMutations.ts`, `generated/graphql.ts`, locales | New shapes |
| Discovery error text | `McpSecretUnavailableError` → "needs secret: <field>" |
| Docs (`mcp_server_management.md`, `secret_management.md`, `tools_and_mcp.md`, TESTING.md) | Updated |
| Existing tests building configs with plain env (`mcp-runtime-tool-matrix`, the 179/181/189 tests) | Unchanged |
| MCP gateway, Agent Tools | Not affected |

## Dependency Rules

- Core never imports server code.
- Only managed servers call `McpSecretResolver`, and only inside `createClientSession`.
- **Only the provider writes `mcps.json` or its backup.** Nothing else calls `updateJsonFile` on it.
- Only `McpServerSecretFields` (writes, status) and `SecretManagementMcpSecretResolver` (resolve) call `SecretManagementService` for `mcpServer` consumers.
- No resolved value is stored, logged, put into an error or returned. A `SecretValue` stays wrapped until the transport options are built.
- The web never defines the rule; it reads `mcpSecretSuggestionRule`. A shared test vector (`mcp-secret-suggestion-vectors.json`) is checked by both the server and web tests, so their matching stays the same.

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `autobyteus-ts/src/tools/mcp/types.ts` | Modify: `McpConfigValue`, `McpSecretReference`, `McpSecretField`; constructors accept both forms; `requestHeaders(resolved)` |
| `autobyteus-ts/src/tools/mcp/mcp-secret-resolver.ts` | Add: interface, `McpSecretUnavailableError`, `resolveMcpValues` |
| `autobyteus-ts/src/tools/mcp/server/{base,stdio,http}-managed-mcp-server.ts` | Modify: resolve at connect |
| `autobyteus-ts/src/tools/mcp/server-instance-manager.ts` | Modify: `useSecretResolver`, pass it on; remove the dead workspace code |
| `autobyteus-ts/src/tools/mcp/config-service.ts` | Modify: parse references |
| `autobyteus-server-ts/src/secret-management/domain/secret-id.ts`, `catalog/provider-credential-catalog.ts` | Modify: `mcpServer` kind; ID pattern; test-only ID |
| `autobyteus-server-ts/src/secret-management/provisioning/local-import-credential-alias-registry.ts`, `local-environment-secret-import-service.ts`, `test-vault/test-vault-commands.ts` | Modify: the alias; test-only IDs only for `test-vault setup` |
| `autobyteus-server-ts/src/secret-management/resolution/mcp-secret-resolver.ts` | Add: `SecretManagementMcpSecretResolver` |
| `autobyteus-server-ts/src/server-runtime.ts` | Modify: `useSecretResolver` after vault initialization |
| `autobyteus-server-ts/src/mcp-server-management/domain/mcp-server-draft.ts` | Add |
| `autobyteus-server-ts/src/mcp-server-management/services/mcp-server-secret-fields.ts` | Add |
| `autobyteus-server-ts/src/mcp-server-management/services/mcp-secret-suggestion-rule.ts` | Add |
| `autobyteus-server-ts/src/mcp-server-management/services/mcp-config-service.ts` | Modify: new signatures, write lock, move |
| `autobyteus-server-ts/src/mcp-server-management/providers/{persistence-provider,cached-provider,file-provider}.ts` | Modify: value parser, references, `replaceWithReferences`, backup |
| `autobyteus-server-ts/src/api/graphql/types/{mcp-server-config,mcp-server}.ts`, `converters/mcp-server-input-mapper.ts` (new), `converters/mcp-server-converter.ts` | Modify/Add |
| `test-support/test-vault/live-test-secret.ts` | Add: `readLiveTestSecret(context, id)` (read-only, skip semantics as `requireLiveCapability`) |
| `autobyteus-server-ts/tests/e2e/mcp/mcp-github-remote-live.e2e.test.ts` | Add: DS-005, gate `RUN_GITHUB_MCP_E2E=1` |
| `autobyteus-web/components/tools/{McpServerFormModal,McpBulkImportView,McpServerCard}.vue`, `McpConfigRows.vue` (new), `McpSecretMoveBanner.vue` (new) | Modify/Add |
| `autobyteus-web/stores/toolManagementStore.ts`, `graphql/queries/mcpServerQueries.ts`, `graphql/mutations/mcpServerMutations.ts`, `generated/graphql.ts`, `localization/messages/{en,zh-CN}/tools.generated.ts` | Modify |
| `GLOSSARY.md`, `docs/design-cases.md`, the docs listed in Change Scope | Modify |

## Good And Avoided Shapes

| Topic | Good | Avoided |
| --- | --- | --- |
| Resolution | `resolveMcpValues` inside `createClientSession` | Resolving at load; passing `getSecret` into another call (Case 1) |
| Move write | `McpConfigService` → vault saves → `provider.replaceWithReferences` | `updateJsonFile` called outside the provider (stale cache) |
| Move with vault calls | Vault saves before the provider call, then compensation | Passing a "save to vault" callback into the provider's locked updater (P13) |
| Status | `statesOf` → `VAULT_UNAVAILABLE` | A thrown vault error failing `mcpServers` |
| IDs | A new `mcp.<uuid>` per new value | IDs derived from names (case; `SecretId` is lowercase) |
| No exposure | `{name:"Authorization", value:null, state:"PLAIN"}` | Any masked or partial value |

## Backward-Compatibility Rejection Log

| Candidate | Decision |
| --- | --- |
| Keep the GraphQL `GraphQLJSON` maps beside the entries | Rejected (rule 9) |
| Fall back to a plain value when the vault is unavailable | Rejected (MREQ-007) |

## Change / Refactor Sequence

1. **Core:** value types, the resolver and `resolveMcpValues`, managed-server resolution, the dead-code removal. Tests use a fake resolver and the 189 test servers (env and header delivered from a reference; missing → error naming the field).
2. **Server vault:** `mcpServer` kind, catalog, resolver wiring in `server-runtime.ts`, test-only ID and alias.
3. **Server MCP:**
   - the draft;
   - the secret fields;
   - the rule and its shared vectors;
   - the provider (parser, references, batch write, backup);
   - service operations and the lock;
   - import;
   - delete.
4. **GraphQL:** input mapper, entries and states, the rule query, candidates and the move.
5. **Web:** shared rows (env and headers), token states, JSON markers, banner and dialog, card, import result, locales, codegen.
6. **Docs and glossary.**
7. **Tests:**
   - server unit and integration:
     - no value in `mcps.json`, GraphQL or logs;
     - a vault that is not READY gives `VAULT_UNAVAILABLE` and the query still succeeds;
     - delete removes the entries;
     - the move writes the backup (0600) and updates the cache (`mcpServers` immediately shows the references);
     - the move compensates when the provider write fails;
     - keep, replace and unlock;
     - preview stores nothing;
   - web component tests (rows, locks, markers, banner);
   - e2e with the 189 servers and dummy secrets;
   - the gated GitHub live check (DS-005), after the team imports `~/.autobyteus-test/secrets/github-mcp-test.env` into the test vault once the alias exists (as the user asked).

## Key Tradeoffs

- References carry their vault ID, so a copied `mcps.json` lacks its secrets on another node. That shows as "needs secret", which is intended: secrets stay per node.
- A service-level write lock serializes MCP config writes. They are rare and user-driven, so the cost is negligible, and it closes the read-then-write race in the move.
- New ID per new value instead of overwriting in place. This leaves no window in which the file points at a changed entry before the commit.

## Risks

- **R-1: a secret in an error message.** Errors name the field only, and tests assert it.
- **R-2: orphan entries after hand edits.** Harmless.
- **R-3: the stdio env limit.** Approved as MDEC-003; stated in the UI and docs.
- **R-4: the plain backup.** It is mode 0600, and the user is told its path and contents.
- **R-5: the live-check token expires 2026-11-25.** The live check then skips with its reason.

## Guidance For Implementation

- Prove premises cheaply before relying on them: `SecretManagementService` on an unknown or absent ID; codegen of the new types; the `updateJsonFile` updater running inside the lock (`store-utils.ts` L212-226).
- Use dummy values only, except in the gated live check.
- Add this entry to `docs/design-cases.md` under Case 5 ("claims taken on trust"). The Solution Designer told the user that each run's MCP server gets its own workspace folder (`AUTOBYTEUS_AGENT_WORKSPACE`). `setWorkspacePathProvider` has no caller, so the claim was false. Lesson: before stating what the product does, find the caller, not only the function.
