# Secret Management

## Scope

The TypeScript server stores bounded provider, search, media, metadata,
AutoByteus gateway, and managed Claude credentials in an encrypted vault inside
the same SQLite application database used by the rest of the server. Product
callers identify an authorized semantic consumer; they do not read environment
aliases, database paths, encryption keys, or ciphertext records directly.

This is one local, application-owned vault. It is not a second Store database,
a selectable backend, an enterprise Vault/KMS adapter, or a distributed SQLite
service.

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
backend kind, access mode, Store target name, or default-versus-E2E Store.
Different environments may still choose different physical application
databases through their own `DATABASE_URL`.

On POSIX systems, newly created vault directories and the key file are limited
to the owner (`0700` and `0600`, where supported). A database and its derived
key are an inseparable backup, restore, move, and deletion pair.

## Startup And Vault Health

Startup follows one ordered lifecycle:

1. obtain and canonicalize `DATABASE_URL`;
2. run ordinary application migrations;
3. initialize `repository_prisma` for that exact URL without enabling WAL;
4. initialize a new vault or verify the established database/key pair;
5. run registered app-data migrations, including the bounded custom-provider-v1
   transition described below;
6. expose runtime APIs with value-free vault health.

First initialization is interruption-safe and transactionally excludes
concurrent initializers. If an interruption leaves only a valid secure 32-byte
key and the selected database has no secret metadata or entries, the next
startup may complete initialization. An established restart verifies the pair
without rewriting the key, metadata, database, or SQLite sidecars.

Vault health is one of `READY`, `LOCKED`, `UNAVAILABLE`, `CORRUPT`, or
`INCOMPATIBLE`. Missing, unsafe, mismatched, malformed, or unsupported
established components fail closed. Definition status is exposed only as
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
- `SecretVaultPrismaRepository` coordinates cross-model persistence through
  separate `SecretEntry` and `SecretEncryptionMetadata` `BaseRepository`
  owners. It alone opens implicit transactions with the reviewed initialization
  (`2s` wait/`10s` timeout) and mutation/compensation (`2s` wait/`5s` timeout)
  settings. Callers do not receive raw Prisma clients or transaction delegates.
- `SecretCatalog` maps semantic consumer identities to stable `SecretId`
  records and rejects unknown or mismatched consumers before vault access.
- `ProviderApiKeyResolver` is storage-neutral. Concrete provider clients call it
  lazily when constructing the SDK/client for an authorized operation.
- GraphQL and Settings expose only value-free configured state and vault
  failures through typed errors.

Settings -> API Key Management reads one `providerSettings(runtimeKind)`
collection. Each exact provider appears once with one provider-owned
`apiKeyConfigured` Boolean plus its existing LLM/audio/image/video
`ModelDetail` lists. The web does not merge repeated capability rows or keep a
second credential-state map. Ordinary provider and Gemini Settings support
save/overwrite, not a separate credential-removal action; save commands return
only completion and the screen refetches the canonical provider group. Saving
a replacement never reads the old value back. The existing custom-provider
Delete action remains provider lifecycle ownership and removes only that
provider's metadata and vault credential. Catalogs and curated models remain
available when a credential is missing or the vault is unavailable.

Custom OpenAI-compatible provider metadata remains in
`<app-data-dir>/llm/custom-llm-providers.json` version 2 and contains only
non-secret provider metadata. The credential is stored in the application
vault under the custom provider's stable definition ID. Create rolls metadata
back if credential storage fails; delete removes the credential and metadata
before refreshing the authoritative catalog.

AutoByteus remote discovery and invocation always use the intrinsic
`provider.autobyteus.api-key`, regardless of a discovered model's downstream
display provider. `AUTOBYTEUS_LLM_SERVER_HOSTS` remains ordinary non-secret
configuration.

## Gemini Setup And Metadata

Gemini configuration keeps three independent options. Saving a credential does
not activate a mode, clear another option, or create fallback priority. The
single explicit `GEMINI_SETUP_MODE` selects exactly one construction strategy:

- AI Studio: `{ apiKey }`;
- Vertex Express: `{ vertexai: true, apiKey }`;
- Vertex Project: `{ vertexai: true, project, location }`, with no API-key
  lookup.

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

## Legacy Sources, Custom-Provider V1, And Explicit Import

Runtime startup never imports, copies, scrubs, deletes, or rewrites credentials
from `.env`, `.env.test`, ambient aliases, or another checkout. Legacy
credential aliases are non-authoritative. Users reconfigure through Settings or
explicitly run the importer, then decide whether to rotate and remove plaintext
sources themselves.

The only bounded startup credential transition is the application-owned
`CustomProviderV1AppDataMigration` for the canonical
`<app-data-dir>/llm/custom-llm-providers.json` file written by the supported
pre-vault application:

- it runs after Prisma migration and vault initialization, before normal custom
  provider consumers;
- a valid complete v1 set is converted all-or-nothing into encrypted vault
  entries plus secret-free v2 metadata, preserving stable provider IDs and
  names;
- the staged v2 file is atomically published only after the complete encrypted
  create-only batch succeeds;
- an invalid, duplicated, unsafe, or colliding v1 set is not partially
  imported; the plaintext v1 file is deleted and the user re-adds the needed
  providers through **New Provider**;
- if safe deletion itself fails, startup and built-in Settings remain
  available, while custom-provider creation remains unavailable until the
  filesystem problem is corrected and the application restarts;
- the supported aged zero-byte legacy lock may be reclaimed, while a live
  positive-PID owner remains protected;
- no backup, quarantine copy, runtime v1 reader, compatibility fallback,
  automatic `.env` import, or alternate source is created.

After that one-time boundary, normal runtime reads and writes only v2 metadata
and the encrypted vault. Migration status is value-free and records successful
migration, reconfiguration-required warning, or reset-unavailable failure
without exposing credential material.

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
atomic batch to exactly the validated database. `secrets:import` is the sole
import command. There is no local/test wrapper, `--target`, implicit current
application target, key argument, backend, profile, or access-mode option.

The importer is an operator-only transition command, never a startup, UI, API,
MCP, agent, or test-runner fallback:

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
pnpm server:test
pnpm web:test
pnpm dev:test
pnpm test:e2e:real:preflight
```

To target the persistent test application database, an operator passes its
canonical absolute SQLite URL to the same `pnpm secrets:import` command. There
is no test-import wrapper, and the importer does not read `.env.test` or the
runtime `.env`. Deterministic coverage uses temporary roots; intentionally
provisioned real-provider tests may reuse the dedicated ignored test root.
Scenario/model/capability definitions live in test code/internal fixtures. The
obsolete `test-config/live-e2e.json`,
`test-support/live-e2e/live-e2e-manifest.ts`, and
`test-support/live-e2e/run-test-import.mjs` no longer exist.

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
