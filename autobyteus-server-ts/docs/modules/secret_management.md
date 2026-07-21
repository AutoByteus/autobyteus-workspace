# Secret Management

## Scope

The TypeScript server owns provider, search, media, metadata, AutoByteus
gateway, and managed Claude credentials through one server-side secret
management boundary. Product callers identify a semantic consumer; they do not
read environment aliases, storage paths, or backend records directly.

The first production backend is an in-process Local Store. The public backend
contract is replaceable, but no enterprise Vault/KMS adapter or distributed
writable SQLite topology is shipped by this implementation.

## Runtime Ownership

- `SecretStorageConfigurationService` bootstraps the selected backend before
  migrations, built-in agents, and transport startup.
- `SecretManagementService` owns value-free status plus save, remove, and
  just-in-time resolution for catalog-authorized consumers.
- `SecretCatalog` maps typed consumer identities to stable definition IDs.
- Subject provisioning services resolve credentials immediately before client
  construction. Core LLM/media/search clients remain storage-neutral.
- Provider and GraphQL read models expose backend health, lifecycle, and
  `MISSING` / `CONFIGURED`; they never return stored credential values.

The backend health states are `READY`, `LOCKED`, `UNAVAILABLE`, `CORRUPT`, and
`INCOMPATIBLE`. Definition status is available only when the backend is
`READY`. Write operations also require a `WRITABLE` lifecycle; a read-only or
future deployment-managed backend reports `EXTERNALLY_MANAGED` instead of
accepting a local write.

## Local Store

Without an explicit backend configuration, server startup uses:

```text
<app-data-dir>/secret-store/secret-store.db
<app-data-dir>/secret-store/secret-store.key
```

`--data-dir` therefore moves the default Local Store with the rest of the
server data. Docker already persists the app data directory, so the existing
data volume persists this Store without a separate secret mount.

An advanced deployment may set `AUTOBYTEUS_SECRET_STORAGE_CONFIG_FILE` to a
version-1 JSON configuration. The only installed production kind is `LOCAL`:

```json
{
  "version": 1,
  "kind": "LOCAL",
  "databasePath": "secret-store/secret-store.db",
  "keyPath": "secret-store/secret-store.key",
  "accessMode": "READ_WRITE"
}
```

Relative paths are resolved from the configuration file's directory. The
database and key must be different files. Unsupported kinds fail closed as
`SECRET_BACKEND_KIND_NOT_INSTALLED`.

The Local Store uses a separate 32-byte root-key file and SQLite database.
AES-256-GCM records are authenticated against their definition ID. Pair
metadata binds a random Store ID to the exact key so a partial, swapped, or
tampered pair does not become ready, including when the Store has no secret
records. POSIX directories/files are restricted to the current owner with
`0700` / `0600`; Windows paths receive a current-user-only ACL. Database/key
paths and SQLite sidecars are denied to built-in file tools.

This assurance is `LOCAL_HARDENED`, not process isolation. A same-user process,
an unrestricted host administrator, or the exact provider child intentionally
receiving a credential can still access that credential. JavaScript/SDK memory
is not claimed to be deterministically zeroized.

## Settings And Provider Lifecycle

Settings -> API Key Management writes a new credential or removes a configured
credential. The UI receives only value-free credential status and disables
writes when the backend is degraded or externally managed. Saving a replacement
never reads the old value back.

Built-in provider operations use:

- `getLlmProviderCredentialStatus(providerId)`
- `setLlmProviderApiKey(providerId, apiKey)`
- `removeLlmProviderApiKey(providerId)`

Custom OpenAI-compatible provider metadata remains in
`<app-data-dir>/llm/custom-llm-providers.json` version 2 with only `id`, `name`,
`providerType`, and `baseUrl`. Its API key is stored separately under the
custom provider's secret definition. Creation rolls metadata back if the
credential write fails; deletion removes the credential and metadata before
refreshing the authoritative catalog.

AutoByteus remote discovery and construction always use
`provider.autobyteus.api-key`, even when the discovered model's displayed
provider is OpenAI, Gemini, or another downstream provider. The non-secret
`AUTOBYTEUS_LLM_SERVER_HOSTS` setting remains ordinary configuration.

## Claude Agent SDK Authentication

`CLAUDE_AGENT_SDK_AUTH_MODE` accepts exactly:

- blank / `cli`: use existing node-local Claude account state, perform no
  managed-secret lookup, and pass a purpose-built environment to the SDK child;
- `managed-secret`: resolve `provider.anthropic.api-key` just in time and expose
  it as `ANTHROPIC_API_KEY` only to the exact SDK child, with empty setting
  sources, `tools: []`, strict explicit AutoByteus MCP configuration, and early
  stderr redaction.

There is no `auto` mode, ambient API-key fallback, or caller-provided
environment merge. The two modes must not be silently changed. Anthropic's
current third-party subscription-authentication guidance remains an external
release recheck dependency rather than authorization or legal clearance.

## Upgrade And Reset Behavior

Startup migration removes known provider/search/Claude credential aliases from
the app-data `.env`, removes them from the current process environment, and
upgrades custom-provider JSON from secret-bearing version 1 to metadata-only
version 2. Values are deliberately not copied into the new Store. The migration
ledger at
`<app-data-dir>/migrations/secure-centralized-secret-provisioning-v1.json`
records definition IDs that must be reprovisioned.

After upgrading, operators should reopen Settings and save required credentials
again. Legacy plaintext copies should be rotated and removed according to local
operational policy.

Electron's ordinary **reset server data** path preserves the `secret-store`
directory. Removing credentials is an explicit Settings operation; deleting or
rebuilding the Local Store is a separate destructive administrative action and
must treat the database/key as one pair.

## Dedicated Real-E2E Store

Real-provider tests use a physically separate, read-only runtime Store under:

```text
~/.autobyteus/server-data/secret-store/real-e2e-secret-store.db
~/.autobyteus/server-data/secret-store/real-e2e-secret-store.key
```

Provision one exact tracked definition through hidden TTY input:

```bash
pnpm secrets:local:e2e:setup -- --definition provider.openai.api-key
```

Then check capability without invoking unavailable providers:

```bash
pnpm test:e2e:real:preflight
```

Run selected live scenarios only after the preflight reports their required
definitions available. Do not copy a repository `.env.test`, the default
product Store, or another checkout's credentials into this Store. The canonical
runner captures and scans stdout/stderr plus owned evidence before release and
cleans its evidence directory on completion.

## Related Documentation

- [LLM Management](./llm_management.md)
- [Agent Execution](./agent_execution.md)
- [Server environment and data-directory strategy](../URL_GENERATION_AND_ENV_STRATEGY.md)
- [Electron packaging and reset behavior](../../../autobyteus-web/docs/electron_packaging.md)
