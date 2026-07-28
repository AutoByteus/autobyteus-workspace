# Custom Provider V1 Migration And Reset Contract

## Artifact Metadata

| Field | Value |
|---|---|
| Status | `Requirements-ready — retained custom-provider transition plus cumulative narrow-scope cleanup submitted for architecture review; implementation/API-E2E/delivery remain unauthorized until Pass` |
| Purpose | Define the one-time custom-provider-v1 credential migration, its simple delete-and-reconfigure failure path, and the general Settings availability invariant |
| Related requirements | `REQ-001`, `REQ-006`, `REQ-008`, `REQ-009`, `REQ-012`, `REQ-015`, `REQ-018` |
| Related acceptance criteria | `AC-001`, `AC-004`, `AC-005`, `AC-008`, `AC-011`, `AC-013`, `AC-014`, `AC-015` |
| Approval applicability | Intended persisted-data-transition and user-visible reset behavior; user-approved for architecture review |

## Scope

This contract applies only to the fixed application-owned file:

```text
<app-data-dir>/llm/custom-llm-providers.json
```

when that file contains the supported historical version-1 custom-provider shape:

```text
version: 1
providers[]: id, name, OPENAI_COMPATIBLE type, baseUrl, plaintext apiKey
```

It does not authorize:

- automatic import from `.env`, `.env.test`, arbitrary paths, or the standalone importer's source;
- a runtime v1 compatibility reader;
- managed-provider credential fallback to environment aliases;
- silent replacement, comparison, use, or deletion of an existing vault credential;
- migration of unrelated application data;
- a backup/recovery/quarantine directory or retained plaintext copy after failed migration.

The current version-2 runtime shape remains secret-free:

```text
version: 2
providers[]: id, name, OPENAI_COMPATIBLE type, baseUrl
```

## Governing Outcomes

The migration has three terminal outcomes:

| Outcome | Canonical custom-provider file | Vault entries | Product behavior |
|---|---|---|---|
| `MIGRATED` | Complete secret-free v2 metadata | All exact custom-provider credentials created atomically | Existing custom providers continue normally |
| `RECONFIGURATION_REQUIRED` | Legacy v1 file deleted; missing means an empty current collection | No silent overwrite; any unreachable interrupted-attempt entries remain non-authoritative | Built-ins and **New Provider** work; the user re-adds needed custom providers |
| `RESET_UNAVAILABLE` | Legacy v1 file could not be deleted safely; no partial v2 is published | No new authoritative custom-provider mapping | Application and built-in Settings still work; custom creation remains unavailable until the filesystem problem is corrected and the application restarts |

The migration runner records `MIGRATED` as `SUCCEEDED`, `RECONFIGURATION_REQUIRED` as `SUCCEEDED_WITH_WARNINGS`, and only inability to delete the unusable v1 file as `FAILED`.

Deleting the failed v1 file is the explicitly approved fallback. Custom-provider configuration is easy to reproduce through the frontend, and retaining a hidden plaintext recovery file would add operational and security complexity without a supported user journey.

## Ownership

### `CustomProviderV1AppDataMigration`

An existing `AppDataMigrationDefinition`, registered with the existing `AppDataMigrationRunner`, owns:

- detecting the exact fixed v1 file;
- parsing v1 only inside the migration boundary;
- validating the full provider set;
- building complete v2 metadata;
- asking the secret owner for one create-only encrypted batch;
- staging and atomically publishing v2;
- deleting the canonical v1 file when preservation cannot complete safely;
- value-free migration outcome details.

It runs after application Prisma migrations and secret-vault initialization and before normal provider consumers. Its failure is non-critical: the existing runner records it and startup continues.

### `CustomLlmProviderStore`

The normal store remains forward-only:

- missing current file means an empty v2 collection;
- current v2 is the only readable/writable runtime format;
- v1 is never interpreted as a provider-runtime source;
- v1/malformed/unreadable state contributes no custom rows to the assembled Settings read;
- current Create writes a new v2 file only after startup migration/reset left the canonical path missing or current-v2.

The store does not own migration, backup, quarantine, or historical credential handling.

### `SecretManagementService`

The secret owner provides one internal create-only batch operation for this migration:

- all target IDs must be `MISSING`;
- encryption and inserts occur in one application-database transaction;
- any configured target or write failure rolls back the entire batch;
- no replacement mode exists;
- an in-memory compensation receipt permits conditional deletion only when the exact inserted encrypted rows remain unchanged and v2 publication fails in the same process.

The receipt is never serialized or logged.

## Success Sequence

```text
server startup
 -> normal Prisma migration
 -> vault bootstrap/verification
 -> AppDataMigrationRunner
 -> CustomProviderV1AppDataMigration acquires fixed-path lock
 -> canonical file missing or v2?
      -> no-op success
 -> canonical file v1
 -> parse and validate every provider without output
 -> derive deterministic SecretId for every provider ID
 -> require every target ID to be missing
 -> stage complete v2 metadata in the same directory, mode 0600
 -> SecretManagementService create-only encrypted batch transaction
 -> fsync staged file
 -> atomic rename staged v2 over canonical v1
 -> release in-memory values/receipt
 -> record SUCCEEDED
 -> normal v2-only provider runtime
```

The atomic rename is the publish point. Before it succeeds, the canonical file remains v1. After it succeeds, the canonical file is complete v2 and the complete vault batch already exists.

## Failure And Interruption Rules

| Failure point | Required result |
|---|---|
| v1 absent | No-op; current store uses empty/current v2 semantics |
| canonical file already v2 | No-op; migration is idempotently complete |
| v1 invalid, duplicated, or unsafe | Do not import any entry; delete v1; expose empty current custom-provider state; require frontend reconfiguration |
| any target vault ID already configured | Do not compare, use, replace, or delete it; import none; delete v1; require frontend reconfiguration |
| v2 staging fails before DB transaction | Vault unchanged; delete v1; startup continues |
| encrypted batch fails | Whole DB batch rolls back; delete v1; startup continues |
| v2 atomic publish fails after DB commit in the same process | Conditionally compensate only exact unchanged rows from the in-memory receipt; never delete a pre-existing/changed row; delete v1 |
| process/power loss after DB commit but before v2 publish | On restart, v1 plus configured target IDs is a collision; never overwrite/delete those entries; delete v1; user reconfigures using newly generated provider IDs |
| v1 deletion succeeds | Canonical file is missing, which the v2 store treats as an empty collection; normal Create may immediately create current v2 |
| v1 deletion fails | Keep the unpublishable file physically untouched, omit custom rows, keep built-ins usable, record `FAILED`; after the filesystem problem is corrected, restart retries deletion before custom Create is supported |
| migration record finalization fails after v2 publish | v2 is current and usable; a later runner pass recognizes v2 and finalizes idempotently |

No state publishes only a subset of v1 providers into v2.

## General Settings Availability

`providerSettings(runtimeKind)` retains its approved provider-centric shape.

The composition owner obtains current custom providers through a bounded custom-provider result:

- current v2 providers are included normally;
- v1/malformed/unreadable custom-provider state contributes no custom provider rows;
- built-in providers and all credential-independent built-in catalogs still return;
- stale custom-provider catalog rows with no current v2 metadata are removed from the Settings projection and custom runtime registry;
- no custom-provider error can reject the assembled Settings query;
- no synthetic provider, availability wrapper, or cross-provider fallback is added.

The existing app-data-migration status surface supplies value-free guidance:

- `SUCCEEDED`: legacy custom providers were preserved;
- `SUCCEEDED_WITH_WARNINGS`: legacy custom configuration was removed; re-add needed providers;
- `FAILED`: built-ins remain available; correct the application-data filesystem problem and restart before adding custom providers.

The API-key page may render one concise notice from that existing migration status. It does not add credential, vault-health, instruction, or status-message fields to `LlmProviderObject`, `ModelDetail`, or `ProviderSettingsGroup`.

## Reconfiguration Behavior

After `RECONFIGURATION_REQUIRED`:

1. the API-key page loads built-in providers and their models normally;
2. **New Provider** remains visible;
3. the user enters name, base URL, and key exactly as for any new custom provider;
4. metadata and the new encrypted credential use the normal current create/compensation spine;
5. the new provider receives a new generated provider ID and does not reuse or overwrite a colliding legacy vault entry;
6. subsequent list/use/delete is pure v2/current-vault behavior.

There is no special legacy provider editor, hidden recovery location, fallback credential source, or restored legacy identifier.

## Value-Safety Rules

- No migration/API/UI/log/test output contains a plaintext, encoded, hashed, length-derived, prefix, suffix, or equality-derived credential observation.
- Provider IDs, counts, and outcome codes are value-free operational metadata.
- The v1 API-key strings exist in process memory only inside the migration boundary and the secret batch call.
- Logs use stable codes and counts, never caught parser payloads or provider objects.
- Test evidence uses synthetic canaries and scans logs, migration records, and GraphQL output for exact/encoded canary absence.
- Failed migration removes the plaintext v1 file rather than creating another retained plaintext copy.

## Executable Coverage

Coverage must prove:

1. missing and v2 files are idempotent no-ops;
2. one and multiple valid v1 providers migrate all-or-nothing with exact metadata/ID preservation and encrypted values;
3. v1 is never changed before the final successful publish or explicit failed-migration deletion decision;
4. collision, invalid v1, DB failure, stage failure, publish failure, and interruption produce no partial v2;
5. same-process publication failure compensates only exact unchanged migration-created rows;
6. interruption-created unreachable entries are never overwritten/deleted and do not block reconfiguration with new IDs after reset;
7. failed preservation deletes the v1 file and exposes an empty custom-provider collection without creating a recovery copy;
8. deletion failure leaves the physical file untouched but never blocks general Settings/startup;
9. general provider Settings remains usable for every migration/reset failure;
10. Add Provider succeeds after a successful reset and then list/use/delete works;
11. current runtime contains no v1 reader and no `.env` or alternate-secret fallback;
12. packaged existing-user Electron upgrade proves successful migration and a forced delete-and-reconfigure path;
13. evidence contains no credential value.
