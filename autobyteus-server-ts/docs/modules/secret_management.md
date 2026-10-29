# Secret Management

## Scope

The TypeScript server stores bounded provider, search, media, metadata, and
managed Claude credentials, and MCP server secrets, in an encrypted vault inside
the same SQLite application database used by the rest of the server. Product
callers identify an authorized semantic consumer; they do not read environment
aliases, database paths, encryption keys, or ciphertext records directly.

This is one local, application-owned vault. It is not a second Store database,
a selectable backend, an enterprise Vault/KMS adapter, or a distributed SQLite
service. The one exception is for tests: `AUTOBYTEUS_TEST_VAULT` selects a
standing test vault the way `DATABASE_URL` selects a test database (see
[Test Vault](#test-vault)); unset, every server uses the vault in its own
database.

## One Database And One Derived Key

A running application uses `DATABASE_URL` as its only physical database
selector. `AppConfig` validates a SQLite file URL and canonicalizes a relative
value exactly once against `AppConfig.getAppRootDir()`. Migrations, Prisma
clients, vault bootstrap, tests, and runtime diagnostics use that canonical
identity.

The standalone importer is intentionally separate: every invocation requires
`--database-url file:/absolute/path/to/application.db`. That explicit absolute
SQLite URL is its sole target authority and is canonicalized by the same
`ApplicationDatabaseLocation` owner. The importer never initializes AppConfig
or infers a target from `.env`, `.env.test`, parent `DATABASE_URL`, its source
file, or the working directory.

Normal Prisma migrations add two secret-owned tables to the selected
application database:

- `secret_entries` contains authenticated ciphertext records keyed by stable
  `SecretId`;
- `secret_encryption_metadata` binds the database vault to its encryption
  domain, format version, and root-key verifier.

The 32-byte root key remains outside SQLite at the deterministic sibling path:

```text
/absolute/path/application.db
/absolute/path/application.db.secret.key
```

There is no `SECRET_STORE_DATABASE_URL`, `SECRET_STORE_KEY_PATH`, Store JSON,
backend kind, access mode or Store target name. Different environments may
still choose different physical application databases through their own
`DATABASE_URL`, and tests may select the read-only test vault through
`AUTOBYTEUS_TEST_VAULT`.

On POSIX systems, newly created vault directories and the key file are limited
to the owner (`0700` and `0600`, where supported). A database and its derived
key are an inseparable backup, restore, move, and deletion pair.

## Startup And Vault Health

Startup follows one ordered lifecycle:

1. obtain and canonicalize `DATABASE_URL`;
2. run ordinary application migrations;
3. initialize `repository_prisma` for that exact URL without enabling WAL;
4. choose the vault source once (`selectSecretVaultSource`): the application
   vault, or the test vault when `AUTOBYTEUS_TEST_VAULT` is set; initialize a
   new application vault or verify the established database/key pair, or open
   the test vault read-only;
5. run registered app-data migrations, including the bounded secretless V1
   staging and final readable-identity reset described below;
6. expose runtime APIs with value-free vault health.

First initialization is interruption-safe and transactionally excludes
concurrent initializers. If an interruption leaves only a valid secure 32-byte
key and the selected database has no secret metadata or entries, the next
startup may complete initialization. An established restart verifies the pair
without rewriting the key, metadata, database, or SQLite sidecars.

Vault health is one of `READY`, `LOCKED`, `UNAVAILABLE`, `CORRUPT`, or
`INCOMPATIBLE`. Missing, unsafe, mismatched, malformed, or unsupported
established components fail closed. A selected test vault that cannot be used
is not a health value: startup fails (see [Test Vault](#test-vault)). Definition status is exposed only as
`MISSING`, `CONFIGURED`, or `UNAVAILABLE`; no API returns a credential value.

## Encryption And Assurance

The vault uses AES-256-GCM with an independent random nonce and authentication
tag for every record. HKDF-SHA-256 derives verifier and per-entry keys from the
external root key, the random encryption-domain identity, and stable secret
identity. The root key is not embedded in SQLite and is not used directly as an
entry encryption key.

The assurance level is `LOCAL_HARDENED`, not process isolation. It is limited
to local encrypted-vault custody, database/key file-root denial, and value-free
APIs, errors, and logs. It does not claim that Electron, terminal, Claude, or
Codex child environments are sanitized or isolated. Those processes preserve
their established caller environment, account, home, and configuration
behavior for runtime continuity; inherited state is not containment evidence.
The design also does not defeat a same-user process or host administrator that
can read both database and key, and JavaScript/SDK memory is not claimed to be
deterministically zeroized. Codex App Server remains outside credential-vault
governance and keeps its Codex-owned authentication behavior.
`STRONG_AGENT_ISOLATION` remains deferred.

## Runtime Ownership And Provider Lifecycle

- `SecretManagementService` owns value-free status, save/replace, idempotent
  removal, authorized just-in-time resolution, and atomic importer batches.
- `SecretVaultRepository` coordinates cross-model persistence through
  separate `SecretEntry` and `SecretEncryptionMetadata` `BaseRepository`
  owners. It alone opens implicit transactions with the reviewed initialization
  (`2s` wait/`10s` timeout) and mutation/compensation (`2s` wait/`5s` timeout)
  settings. Callers do not receive raw Prisma clients or transaction delegates.
- `SecretCatalog` maps semantic consumer identities to stable `SecretId`
  records and rejects unknown or mismatched consumers before vault access.
- **MCP server secrets** use the consumer kind `mcpServer` with the vault
  secret ID itself (`{ kind: "mcpServer", vaultSecretId }`). The catalog accepts
  only `mcp.<uuid>` IDs for it; any other ID is refused (and an MCP state reads
  it as `MISSING`). Each new value gets a new ID; `mcps.json` holds the
  reference, so the owner (server) and field are kept there, not in the vault
  record. `McpServerSecretFields` is the only MCP code that saves, removes or
  reads the state of these entries, and `SecretManagementMcpSecretResolver`
  (installed at startup by `installRuntimeMcpSecretResolver`) the only one that
  resolves them, when a managed MCP server connects. An `mcp.*` ID is not a
  fixed ID: `isKnownSecretId` (batch import, test-vault status) does not accept
  it. See [MCP Server Management](mcp_server_management.md#secret-values).
- Provider clients take a `ProviderApiKeyResolver` and call it lazily when
  constructing the SDK/client for an authorized operation. The server always
  passes its own resolver. autobyteus-ts owns the vault format's read side
  (`autobyteus-ts/secrets/vault/`: crypto, root-key file, records, the store
  interface, the read-only store, verification, `readSecretEntry`,
  `providerSecretId` and the test-vault location policy); the server owns the
  lifecycle (initialization, writes, the Prisma repository) and consumer
  authorization (`ProviderCredentialCatalog`, built on `providerSecretId`).
- For a client built without a resolver, autobyteus-ts reads
  `AUTOBYTEUS_TEST_VAULT` itself (see [Test Vault](#test-vault)). The server
  turns that environment default off at both startup sites
  (`disableEnvironmentProviderApiKeySource()`), so it never reads the selector
  through autobyteus-ts.
- GraphQL and Settings expose only value-free configured state and vault
  failures through typed errors.

Settings -> API Key Management reads credential state through
`providerCredentialSettings(runtimeKind)`. Each exact provider appears once
with its descriptor and one provider-owned `apiKeyConfigured` Boolean. That
read contains no model rows and performs no discovery; model state is an
independent `providerModelCatalogSnapshots(runtimeKind)` projection. Ordinary
provider and Gemini Settings support save/overwrite, not a separate
credential-removal action. Successful commands return the updated value-free
credential setting (plus specialized setup state where applicable), and the
client applies it directly instead of refetching or awaiting a catalog action.
Saving a replacement never reads the old value back. The existing
custom-provider Delete action remains provider lifecycle ownership and removes
only that provider's metadata, vault credential, lifecycle, and registry rows.
Static/curated catalogs remain available when a credential is missing or the
vault is unavailable.

Custom OpenAI-compatible provider metadata remains in
`<app-data-dir>/llm/custom-llm-providers.json` version 3 and contains only
non-secret provider metadata. Its readable provider ID is deterministically
derived from the normalized name and is the vault consumer identity. Create
rolls metadata back if credential storage or source seeding fails; a rejected
create leaves no readable-ID secret. The create command's successful discovery
result seeds only that provider's in-process source. Delete removes the
credential and metadata before removing that exact source; neither operation
performs a global catalog refresh.

The removed remote AutoByteus provider has no binding. A vault row it left
behind is never resolved by any consumer and stays inert; local `.env` import
skips its former alias.

## Gemini Setup And Metadata

Gemini configuration keeps three independent options. Saving a credential does
not activate a mode, clear another option, or create fallback priority. The
single explicit `GEMINI_SETUP_MODE` selects exactly one construction strategy:

- AI Studio: `{ apiKey }`;
- Vertex Express: `{ vertexai: true, apiKey }`;
- Vertex Project: `{ vertexai: true, project, location }`, with no API-key
  lookup.

Speech model/voice availability is separate from catalog presence and credential
status. Additional voice-ID synthesis and per-turn dialogue styles use only the
configured Gemini mode; they do not query a different mode's voice catalog,
switch credentials or fall back after rejection. The speech adapter exposes
fixed failure categories and safe HTTP status rather than raw provider
messages/bodies/causes. A prior successful Vertex Express generation proves
that specific route/key/time, not all voices, languages or future entitlement.

Real-provider preflight checks setup/scenario readiness, not paid generation.
Live validation requires explicit supported import into an isolated test-owned
SQLite vault and bounded execution authorization; do not provision or mutate the
production vault merely to test speech. Review, docs sync and deterministic
post-integration checks do not authorize another paid request or private-source
read after the authorized calls have been consumed.

Gemini catalog metadata has a separate provenance contract:

- AI Studio is live-capable. It uses only the exact AI Studio metadata consumer
  and the Gemini Developer API models endpoint. A matching live record is
  `LIVE`; missing/unavailable input, failure, timeout, or no matching record
  keeps curated data as `CURATED_FALLBACK`.
- Vertex Express and Vertex Project are `CURATED_ONLY`. They perform no Gemini
  metadata credential lookup and no metadata HTTP request. A Vertex Express key
  is never sent to the AI Studio endpoint.

Metadata provenance never changes SDK construction mode and curated data must
not be described as live provider metadata.

## Claude Agent SDK Authentication

`CLAUDE_AGENT_SDK_AUTH_MODE` accepts exactly:

- `auto`: preserve the established Claude Agent SDK auto-selection behavior
  and caller-supplied launch environment without resolving a vault credential;
- blank, invalid, or `cli`: default to the existing node-local Claude
  account/configuration behavior and do not resolve a vault credential;
- `api-key`: resolve the `agentRuntime/claude_agent_sdk/apiKey` consumer from
  `provider.anthropic.api-key` immediately before launch and replace only
  `ANTHROPIC_API_KEY` in the otherwise established launch environment.

All three modes preserve the baseline SDK options, tools, MCP/session behavior,
home/account semantics, and caller environment apart from that one explicit
`api-key` substitution. This is continuity behavior, not process isolation.
AutoByteus adds no Claude login UI, authentication broker, pooled account, or
credential relay. Anthropic's third-party subscription-authentication guidance
is a delivery/release external recheck dependency, not legal clearance or a
license to redesign authentication.

## Legacy Sources, Custom-Provider Reset, And Explicit Import

Runtime startup never imports, copies, scrubs, deletes, or rewrites credentials
from `.env`, `.env.test`, ambient aliases, or another checkout. Legacy
credential aliases are non-authoritative. Users reconfigure through Settings or
explicitly run the importer, then decide whether to rotate and remove plaintext
sources themselves.

The only bounded startup custom-provider transition owns the canonical
`<app-data-dir>/llm/custom-llm-providers.json` file and runs after Prisma and
vault initialization, before normal provider consumers:

- `CustomProviderV1AppDataMigration` strips supported inline V1 credential
  values and atomically stages valid records as secretless V2 metadata. It does
  not call vault status, resolve, save, batch-create, removal, or compensation;
- the final readable-identity migration treats V2 names as transient mapping
  input, attempts only the allowlisted structured selector prefixes, and
  atomically publishes strict empty V3 after those attempts;
- no legacy provider record, Base URL, or credential value is transferred to a
  readable provider. Users recreate providers through **New Provider** with
  name, Base URL, and a new key;
- only after empty V3 is durable does cleanup attempt removal of each trusted
  old UUID consumer. Removal never resolves a value, is independent of whether
  a selector mapping could be derived, and failure produces a sanitized warning
  plus a possible unreachable orphan rather than a fallback;
- invalid, unsafe, non-derivable, or colliding legacy data still resets to
  empty V3 without a mapping. Individual unsafe/unwritable selector targets
  stay stale for manual reselection;
- server startup requires the readable migration itself to finish as
  `SUCCEEDED` or `SUCCEEDED_WITH_WARNINGS`. A missing, failed, or recent
  `RUNNING` result blocks provider/runtime/bootstrap/listen until the ordinary
  runner can retry;
- no backup, quarantine copy, runtime V1/V2 reader, UUID alias, automatic
  `.env` import, secret transfer, or alternate source is created.

After that one-time boundary, normal runtime reads and writes only strict V3
metadata and newly supplied readable-ID vault consumers. Migration status and
logs remain value-free.

From the workspace root, preview an explicitly selected owner-private source
against an explicitly identified SQLite application database:

```bash
pnpm secrets:import -- \
  --source /absolute/path/to/source-file \
  --database-url file:/absolute/path/to/application.db \
  --dry-run
```

Review the value-free canonical target and plan, then rerun without `--dry-run`;
add `--overwrite` only when replacing configured records intentionally.
Execution requires the TTY confirmation shown by the command and writes one
atomic batch to exactly the validated database. `secrets:import` imports into
an application database; `pnpm test-vault setup` runs the same importer
service for the test vault (see [Test Vault](#test-vault)). There is no
`--target`, implicit current application target, key argument, backend,
profile, or access-mode option.

The importer is an explicit operator command, never a startup, UI, API, MCP,
or test-runner fallback, and nothing runs it automatically. Tests and isolated
instances do not import keys: they select the test vault. The rules:

- `--source` must be an explicit absolute path;
- `--database-url` must appear exactly once and identify an absolute SQLite
  `file:` URL; empty, duplicate, relative, non-SQLite, malformed, or
  non-canonicalizable targets fail before target access;
- the raw URL is converted once to immutable `ApplicationDatabaseLocation` and
  that exact typed target flows through preview, display, confirmation,
  migration/bootstrap, and execution;
- no repository/parent search occurs and `.env`, `.env.test`, parent
  `DATABASE_URL`, assignment-file `DATABASE_URL`, AppConfig, and current working
  directory cannot select or override the target;
- the adjacent root-key path is derived from the canonical DB path and cannot be
  supplied separately;
- the source must pass regular-file, owner/privacy, size, encoding, symlink, and
  race checks and is never modified;
- recognized current aliases are selected before parsing; empty recognized
  assignments are absent and unrecognized content is ignored without reporting
  its value;
- dry-run uses `SecretVaultInspectionService` in read-only/query-only mode and
  does not create, migrate, bootstrap, repair, write, or change permissions;
- preview reports only canonical target identity/state, `SecretId`, observed
  status, planned action, and counts;
- a missing/pre-feature/complete-empty target is
  `INITIALIZATION_REQUIRED`; a complete verified vault is `READY`; unsafe,
  incomplete, mismatched, incompatible, or unreadable targets are closed with
  `UNAVAILABLE/BLOCKED`;
- execution revalidates the confirmed canonical location, re-evaluates state
  immediately before its atomic write, and never replaces a configured entry
  without explicit `--overwrite`;
- Qwen maps only `DASHSCOPE_API_KEY` to `provider.qwen.api-key`.

## Backend E2E Runtime

`autobyteus-server-ts/.env.test` is the sole committed backend-E2E launch
template. It is fixed, non-secret, and immutable during execution. Production
code and actual server processes never discover or parse it.

One test-only bootstrap validates the template, canonicalizes its test database
against the server root, and materializes/reconciles only fixed launch settings
into an ignored test data directory's ordinary `.env`. The unchanged built
server then reads that normal runtime `.env` through `--data-dir`. Mutable
Settings values, including Gemini selection/project/location, are changed only
through normal Settings/API behavior and are preserved in the ignored runtime
`.env` across persistent test restarts.

Useful commands from the workspace root are:

```bash
pnpm dev
pnpm test:e2e
pnpm test:e2e:real:preflight
pnpm test:e2e:real
```

`pnpm dev` owns persistent repository-local development state below
`.autobyteus/development/server-data/`; deterministic and real-provider E2E
remain test-owned and use separate ignored test roots. Development credentials
are configured through Settings or the explicit importer target. Stop the
development stack before removing `.autobyteus/development/` to reset only
development state.

Real-provider runs do not import keys into the test database: with
`AUTOBYTEUS_TEST_VAULT` set, `pnpm test:e2e:real` starts its server with the
test vault (the preflight prints `Vault: test vault …`). Deterministic coverage
uses temporary roots and its own vaults.
Scenario/model/capability definitions live in test code/internal fixtures. The
obsolete `test-config/live-e2e.json`,
`test-support/live-e2e/live-e2e-manifest.ts`, and
`test-support/live-e2e/run-test-import.mjs` no longer exist.

## Test Vault

Tests and investigation use one standing test vault, selected like a test
database. `AUTOBYTEUS_TEST_VAULT` names its directory (a location, never a key);
`AppConfig.get` reads it from the environment or the data directory's `.env`.
The vault is an ordinary current-schema application database plus key:

```text
<AUTOBYTEUS_TEST_VAULT>/test-vault.db
<AUTOBYTEUS_TEST_VAULT>/test-vault.db.secret.key
```

- **Commands.** `pnpm test-vault setup --source <absolute file> [--replace]`
  creates or updates the vault in `$AUTOBYTEUS_TEST_VAULT`, or
  `~/.autobyteus-test/vault` when unset, through the importer service (same
  source validation and value-free output) without a database URL or prompt:
  the decision confirms only that validated test-vault target. It sets
  owner-only permissions and prints `SETTING AUTOBYTEUS_TEST_VAULT=<dir>`.
  `pnpm test-vault status` reports the location and configured/missing
  `SecretId`s; `pnpm test-vault remove` deletes exactly the database, key and
  SQLite sidecars. These are the only writers of the test vault.
- **Test-only secret IDs.** Besides provider keys, the test vault can hold
  secrets a live check hands to the system under test itself:
  `test.github.token` (source alias `AUTOBYTEUS_TEST_GITHUB_TOKEN`) for the
  GitHub MCP live check. Such an ID is known to `isKnownSecretId` and listed by
  `listFixedSecretIds` (so `status` shows it), but `resolve` returns it for no
  consumer. Only `test-vault setup` accepts its alias; `secrets:import` into an
  application vault refuses it (`IMPORT_MAPPING_INVALID`). The test reads it
  with `readLiveTestSecret(context, id)` (`test-support/test-vault/live-test-secret.ts`:
  read-only, skipped with its reason when missing).
- **Refused locations.** Every command and a selected vault refuse, before any
  file is touched (`TEST_VAULT_LOCATION_FORBIDDEN`), a location inside the
  user's app data: `~/.autobyteus/**` and the desktop app's OS data folders
  (macOS `~/Library/Application Support/autobyteus/**`,
  `~/Library/Logs/autobyteus/**`; Linux `${XDG_CONFIG_HOME:-~/.config}/autobyteus/**`;
  Windows `%APPDATA%\autobyteus\**`), after resolving symlinks
  (`isForbiddenTestVaultLocation`).
- **Source selection.** `selectSecretVaultSource` decides once, at both startup
  sites: unset (or blank) selects the application vault, as before; a server
  whose data directory is the real `~/.autobyteus/server-data`
  (`isRealAppServerDataDir`) ignores the selector and warns
  `TEST_VAULT_IGNORED_ON_REAL_APP_DATA`; otherwise the test vault is selected.
  The runtime logs `Secret vault: test vault <dir> (read-only)` or
  `Secret vault: application database`.
- **Read-only.** The runtime opens the test vault through
  `openReadOnlyTestVault`: a `node:sqlite` read-only/query-only store over the
  two secret tables, verified without a lock or write (autobyteus-ts
  `openVerifiedTestVault` / `verifyEstablishedVault`). Consumers never migrate it, so
  worktrees of different versions can share it. Product lookups go through the
  same `SecretManagementService` and resolvers; saves fail with
  `SECRET_VAULT_READ_ONLY`. Agent file tools are denied the selected vault
  directory, as they are the server's own vault files.
- **No fallback.** A selected vault that is invalid
  (`TEST_VAULT_LOCATION_INVALID`), forbidden, missing (`TEST_VAULT_NOT_FOUND`,
  naming `pnpm test-vault setup`) or not `READY` (`TEST_VAULT_UNAVAILABLE`)
  stops startup with `SECRET_VAULT_INITIALIZATION_FAILED`.
- **Test harnesses.** Server test setup deletes inherited `*_API_KEY`
  variables and moves the selector out of the environment, so deterministic
  code always uses its own vault. Live opt-ins apply it:
  `initializeLiveServerVault()` for in-process live suites and the real-E2E
  harness, `startBuiltTestServer({ testVaultSetting })` for built servers
  (`test:e2e:real`); `initializeLiveServerVault()` also turns the
  autobyteus-ts environment default off, as server startup does.
- **autobyteus-ts and scripts.** Any process that uses autobyteus-ts (a script
  run with `node` or `tsx`, a Vitest live run) gets keys for clients built
  without a resolver from the vault `AUTOBYTEUS_TEST_VAULT` names: explicit
  resolver first, then that environment default, else `MissingApiKeyError`.
  The vault modules and `node:sqlite` load only when the variable is set and a
  key is needed; each vault is opened once per process, read-only. A key the
  vault lacks fails with a missing-capability error naming the secret, the
  vault and `pnpm test-vault setup`; a provider without a vault entry fails with
  `SECRET_PROVIDER_UNKNOWN`. autobyteus-ts Vitest setup removes the selector
  unless `RUN_LIVE_PROVIDER_TESTS=1`. Usage is in
  [TESTING.md](../../../TESTING.md#test-vault).

## Deployment, Reset, And Recovery

Direct server, Electron, Docker, and single-Pod deployment use the same
application-database/vault lifecycle. Docker keeps the unchanged topology: the
application DB and derived root key persist together in the existing server-data
volume; there is no new service, volume, or secret-store mount.

Electron's **Reset Server Data** action is destructive. It deletes the entire
application data directory, including both the application database and its
derived root key. Back up both files together before a reset when recovery is
required. Never preserve or restore only one established component while
expecting the vault to reopen.

For a consistent backup, quiesce writes and capture the database plus its
`.secret.key` sibling as one coordinated pair. Restore both together at their
corresponding canonical paths. A lost or mismatched established component
intentionally leaves the vault closed; silent regeneration or partial recovery
is not attempted.

## Database Dependency Boundary

The workspace resolves unpatched published `repository_prisma@1.0.9` with
Prisma/`@prisma/client` 5.22.0. It is the active lifecycle,
model-repository, and implicit-transaction boundary for normal token and secret
runtime persistence. Server composition initializes it after schema migrations,
then shutdown drains token persistence, closes/zeroizes the vault, and closes
the shared client. The standalone importer performs the same explicit
initialize/use/finally-shutdown lifecycle for only its immutable CLI target;
dry-run remains inspection-only.

The dependency remains import-safe, query logging stays default-off, and this
adoption does not enable WAL or change schema, migrations, stored rows,
encryption/key bytes, database identity, or Docker topology. Bounded app-data
migrations keep their explicit raw clients, and importer preview keeps the
read-only `SecretVaultInspectionService`.

## Related Documentation

- [LLM Management](./llm_management.md)
- [Agent Execution](./agent_execution.md)
- [Server environment and data-directory strategy](../URL_GENERATION_AND_ENV_STRATEGY.md)
- [Electron packaging and reset behavior](../../../autobyteus-web/docs/electron_packaging.md)
