# Requirements Doc

## Status

`Refined` — approved by the user on 2026-07-28 after `repository_prisma@1.0.9` publication and revalidation against the latest `origin/personal`; the user subsequently clarified that secret repository names must not carry the `Prisma` implementation-provider suffix.

## Goal / Problem Statement

Align the active backend token-usage/statistics and encrypted secret-vault Prisma persistence paths with the `repository_prisma` pattern that exists to simplify application development: application composition owns one explicit runtime datasource lifecycle, model repositories extend the library's context-aware `BaseRepository`, and atomic multi-repository work uses implicit transaction context rather than raw `PrismaClient` or transaction propagation.

This is a structural refactor. It must preserve all supported token accounting/statistics behavior, secret security/lifecycle behavior, explicit importer target authority, and existing persisted data. It must not restore repositories for capabilities that correctly moved to file-backed storage.

Per the user-approved sequencing decision on 2026-07-28, the library API/release work is not implemented inside this ticket. The standalone library ticket is complete and archived at `/Users/normy/autobyteus_org/repository_prisma/tickets/done/transaction-options`; `repository_prisma@1.0.9` is published as npm `latest`. This backend ticket will consume that normal release.

Investigation evidence and the detailed current/target comparison are retained in [repository-prisma-architecture-analysis.md](./repository-prisma-architecture-analysis.md).

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| `BEH-001` | Server startup canonicalizes the application DB, runs Prisma migrations, then the secret runtime creates its own configured Prisma client; token usage creates a different lazy configured client on first repository operation. The token client has no application shutdown owner, and scheduled non-blocking token appends are not currently drained by server close. | After migrations, the server composition root explicitly initializes one `repository_prisma` lifecycle for token and secret runtime repositories with the canonical application DB URL; shutdown stops and drains the default token-persistence processor, closes the vault runtime, then closes repository-prisma once. | AppConfig remains datasource authority; migration ordering and startup failure semantics remain unchanged; no WAL mode is enabled by this refactor. | `REQ-001`, `REQ-002`, `REQ-008`; `AC-001`, `AC-002`, `AC-010` |
| `BEH-002` | Enriched token events are appended asynchronously and idempotently through `TokenUsageLedgerStore` and a direct-client repository; GraphQL statistics and run/team/member summaries read the same ledger. Safe-integer token aggregates beyond the GraphQL 32-bit `Int` range are exposed through the current `GraphQLSafeInt` contract. | The same store/repository contracts and outcomes use a `BaseRepository.forModel(TokenUsageLedgerEvent)` repository whose delegate is supplied by repository-prisma. | Non-blocking persistence failure handling, event/domain mapping, unique-key recovery, ordering, aggregation, pricing, display-field backfill, hierarchy, safe-integer GraphQL serialization, and GraphQL results remain unchanged. | `REQ-003`, `REQ-008`; `AC-003`, `AC-004`, `AC-009` |
| `BEH-003` | Secret bootstrap/verification uses a dedicated injected Prisma client and an explicit interactive transaction to serialize initializers. Runtime status/save/remove/resolve operations use the same direct repository. | Secret entry and metadata model repositories use `BaseRepository`; the vault persistence coordinator uses the library's implicit transaction context; main server composition supplies the shared initialized client. | Vault health, fail-closed behavior, key/metadata verification, byte-stable established restart, authorization, encryption/decryption, value-free errors/status, and single-entry semantics remain unchanged. | `REQ-004`, `REQ-005`, `REQ-008`; `AC-005`, `AC-007`, `AC-009` |
| `BEH-004` | Secret save batches, create-missing migration batches, compensation, and initialization lock explicitly pass a Prisma transaction delegate to private repository methods with reviewed wait/timeout values. | The coordinator opens an option-aware implicit transaction; all composed model repositories resolve the same ALS-bound transaction without raw transaction parameters. | Atomic commit/rollback, domain recheck, no-overwrite/overwrite counts, receipt ownership, exact-row compensation, initializer serialization, `maxWait=2s`, initialization `timeout=10s`, and batch/compensation `timeout=5s` remain unchanged. | `REQ-005`, `REQ-006`; `AC-006`, `AC-007` |
| `BEH-005` | The standalone importer requires an explicit absolute SQLite URL, runs migrations, creates a dedicated secret runtime/client for that exact target, executes one atomic batch, and closes it. | Import execution explicitly initializes repository-prisma for the same immutable target before vault bootstrap and shuts it down after the execution runtime closes. | Dry-run remains non-mutating and does not initialize Prisma; no AppConfig/ambient `.env`/parent URL fallback; confirmation, overwrite, target recheck, output, and failure behavior remain unchanged. | `REQ-007`, `REQ-008`; `AC-008`, `AC-009` |
| `BEH-006` | Published `repository_prisma@1.0.9` now supplies model repositories, one datasource lifecycle, implicit transactions, and typed outer interactive-transaction options. The server manifest/lock still resolves `1.0.8`, and active server production code does not import the package. | This backend upgrades its normal dependency resolution to `1.0.9` and uses the published transaction-options contract for vault transactions. | Existing one-argument calls, nested transaction flattening, datasource lifecycle, import safety, default-off query logging, and Prisma 5.22 compatibility remain unchanged. | `REQ-006`, `REQ-009`; `AC-006`, `AC-010`, `AC-011`, `AC-012` |

## Investigation Findings

1. The concern is confirmed: `rg` found no production `repository_prisma` import in `autobyteus-server-ts/src` despite the installed `1.0.8` dependency.
2. Git history at `f50fa2d4c^` shows the intended AutoByteus layering: provider/service -> model-specific SQL repository -> `BaseRepository.forModel(...)` -> context-aware Prisma client.
3. File-first commit `f50fa2d4c` correctly removed repositories whose persisted capabilities moved to files; they must not be restored.
4. Token usage diverged separately: commit `ddf18dcf3` removed its `BaseRepository` inheritance, and `ffca05da7` introduced the current ledger repository with a direct Prisma client. Later fixes moved that client behind a custom lazy owner/factory but not back to the library.
5. Secret vault commit `056455929` deliberately created a direct-client repository. Its approved ticket explicitly said `repository_prisma@1.0.8` was infrastructure only and production adoption required a separate lifecycle/ownership design. This request supplies that new scope but does not waive the vault's reviewed security/transaction invariants.
6. `repository_prisma@1.0.9` is published and verified. Its root contract exports `RunInTransactionOptions` and forwards explicit settings only when the outer transaction opens while preserving callback-only and nested behavior.
7. A disposable SQLite probe using the current server schema and installed `1.0.8` proved model repository resolution for `TokenUsageLedgerEvent`, `SecretEntry`, and `SecretEncryptionMetadata`, plus atomic rollback across the two secret models. The DB hash was unchanged after rollback and no sidecar remained.
8. The former blocking transaction-options gap is resolved by the reviewed `1.0.9` release; the backend must consume it normally rather than duplicating the behavior.
9. This refactor changes delegate acquisition/lifecycle only; it needs no Prisma schema, SQL migration, data transformation, encryption change, or WAL change.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| [repository-prisma-architecture-analysis.md](./repository-prisma-architecture-analysis.md) | Focused architecture/history/gap comparison | `REQ-001`–`REQ-010` | `AC-001`–`AC-012` | Complete / approval `N/A` | Evidence and recommended structural context; intended behavior remains authoritative here. |

## Design Health Assessment (Mandatory)

- Change posture: `Refactor`
- Initial design issue signal: `Yes`
- Root cause classification: `Boundary Or Ownership Issue`
- Refactor posture: `Likely Needed`
- Evidence basis: Both requested runtime repositories bypass the installed authoritative repository/client/transaction boundary and instead own custom clients; token lifecycle lacks shutdown, secret runtime owns a database client used for a concern broader than secret service lifecycle, and explicit transaction delegates duplicate the library's ALS purpose. Historical repositories confirm the intended pattern.
- Requirement or scope impact: Refactoring is required now for token and secret persistence while consuming the completed upstream transaction-options capability. Higher-level token and secret domain services remain authoritative and should not be redesigned.

## Recommendations

1. Make main-server and importer execution composition roots the explicit repository-prisma lifecycle owners.
2. Convert token ledger persistence to one `BaseRepository` subclass without changing the store, projections, or API.
3. Split secret entry and metadata data access into model-specific `BaseRepository` subclasses while retaining one vault persistence coordinator for cross-model atomicity and compensation.
4. Consume published `repository_prisma@1.0.9`; do not duplicate its transaction-options implementation here.
5. Update the manifest/lock through normal registry resolution without a local link, pnpm patch, vendored copy, or dual dependency path.
6. Preserve the current schema/data/key pair directly with no migration and no WAL enablement.

## Scope Classification

`Large`

Rationale: the source edit is bounded to the workspace repository now that the prerequisite package is released, but it moves an application-wide runtime lifecycle boundary, touches high-assurance secret concurrency/atomicity, affects server and standalone importer composition, and requires broad regression evidence while intentionally preserving behavior.

## In-Scope Use Cases

- `UC-001` Start the normal server against its canonical application SQLite database and initialize one shared repository-prisma runtime client after Prisma migrations.
- `UC-002` Append an enriched token-usage event idempotently without blocking runtime event streaming on persistence failure.
- `UC-003` Read period statistics and run/team/member token summaries from the ledger with current ordering, hierarchy, pricing, and display semantics.
- `UC-004` Initialize a new secret vault or verify an established DB/key pair under the existing serialized transaction and fail-closed health rules.
- `UC-005` Authorize and perform secret status, save/overwrite, idempotent remove, and just-in-time resolve operations through `SecretManagementService`.
- `UC-006` Execute atomic secret batches, create-missing custom-provider migration batches, and exact-row compensation with existing counts, receipt ownership, domain checks, and timeout rules.
- `UC-007` Run the standalone secret importer execution against only its explicit immutable absolute SQLite URL and close the repository-prisma lifecycle afterward; preview remains read-only and lifecycle-free.
- `UC-008` Shut down the normal server and disconnect the one shared token/secret repository-prisma client after dependent services stop.
- `UC-009` Define current Prisma-backed application model repositories through `BaseRepository.forModel(...)` so application services do not construct, receive, or propagate Prisma clients/transactions.
- `UC-010` Consume and use the completed library HOF transaction-options contract while preserving existing one-argument and nested transaction behavior.

## Out of Scope

- Reversing the SQLite-to-file conversion or restoring removed repositories for file-backed capabilities.
- Refactoring unrelated file stores or application-storage SQLite modules.
- Refactoring app-data-migration database classes/repositories onto `BaseRepository`; they remain bounded migration infrastructure and may use explicit clients.
- Changing `SecretVaultInspectionService`, which deliberately uses a read-only SQLite inspection boundary for importer preview.
- Token accounting, pricing, hierarchy, event, GraphQL, or frontend behavior changes.
- Secret IDs, credential catalog, encryption algorithms/formats, root-key location/permissions, provider authorization, GraphQL/UI, or importer source/confirmation behavior changes.
- Prisma schema or SQL migration changes, data rewriting, WAL enablement, database topology changes, or Prisma ORM/client upgrades.
- Implementing or releasing repository-prisma transaction options; that work is complete in the standalone archived `transaction-options` library ticket.
- Adding transaction options to the decorator API.
- Backward-compatibility wrappers, dual client paths, retained injected-production paths, local package patches, or unpublished local dependency links.

## Functional Requirements

- `REQ-001` The normal server composition root must call `initializePrisma({ datasourceUrl: canonicalApplicationDatabaseUrl })` after successful Prisma schema migrations and before secret bootstrap or any token/secret repository operation. It must not enable WAL as part of this refactor.
- `REQ-002` The normal server must stop accepting new work through normal Fastify close, stop and drain all token-usage persistence callbacks already scheduled by the default event pipeline, close/zeroize the secret runtime, and then call `shutdownPrisma()` exactly once. No scheduled token append may lazily reopen repository-prisma after shutdown. `SecretVaultRuntime` must cease owning, retaining, or disconnecting a raw Prisma client.
- `REQ-003` `SqlTokenUsageLedgerRepository` must extend `BaseRepository.forModel(Prisma.ModelName.TokenUsageLedgerEvent)`, use inherited model operations, and contain no raw/default/injected Prisma client path. Its current data mapping, query filters/order, display-field update, and unique-conflict idempotency recovery must remain unchanged.
- `REQ-004` Secret persistence must expose model-specific `BaseRepository` subclasses named `SecretEntryRepository` and `SecretEncryptionMetadataRepository`. The authoritative coordinator must be named `SecretVaultRepository`, compose those model repositories, and preserve the existing explicit initialization repository contract, record transformations, metadata singleton validation, batch counts, domain checks, receipt ownership, and exact-row compensation. Secret repository class and file names must express their domain subject rather than the `Prisma` implementation provider.
- `REQ-005` Secret vault service, bootstrap, catalog, crypto, root-key, health, importer, and provider boundaries must not receive a raw Prisma client or transaction delegate. `SecretManagementService` remains the authoritative domain/security boundary; persistence details stay behind the vault repository coordinator.
- `REQ-006` The backend must consume published `repository_prisma@1.0.9`. The vault must use its option-aware `runInTransaction` API to preserve `{ maxWait: 2_000, timeout: 10_000 }` for initialization and `{ maxWait: 2_000, timeout: 5_000 }` for save/create-missing/compensation batches.
- `REQ-007` Standalone importer execution must continue to derive the immutable target only from its required explicit `--database-url`; after running migrations it must initialize repository-prisma with that exact URL, initialize the vault, execute through `SecretManagementService`, close the vault runtime, and shut down repository-prisma in `finally`. Dry-run must not initialize Prisma or mutate the target.
- `REQ-008` The refactor must preserve all current observable token and secret outcomes and must not change Prisma schema/migrations, persisted row representation, encryption/key representation, database target, journal mode, or application database topology. Existing persisted data must remain directly usable without transformation.
- `REQ-009` The server must resolve `repository_prisma@1.0.9` through its normal package manifest/lockfile. No local patch/link/vendor/fallback or simultaneous `1.0.8`/`1.0.9` package path may remain.
- `REQ-010` Affected project documentation and source-level architecture references must describe repository-prisma as the active token/secret runtime repository and lifecycle boundary rather than dependency-only infrastructure.

## Acceptance Criteria

- `AC-001` A normal server startup trace proves the order `AppConfig canonical URL -> Prisma migrations -> initializePrisma(explicit URL, WAL omitted/false) -> secret bootstrap -> app-data migrations -> API/runtime`, with no token/secret repository client acquisition before initialization.
- `AC-002` A normal server close trace proves scheduled/in-flight default-pipeline token appends are drained, the token processor is made quiescent/resettable, secret key zeroization occurs, and then one `shutdownPrisma()` call closes the shared client. Repeated close remains safe, no token append reopens the client afterward, and no token-specific or secret-specific raw client remains open.
- `AC-003` Durable token coverage proves append success, duplicate `usage_event_id`/`idempotency_key` recovery, cumulative-snapshot lookup, display-field update/backfill, run/team/member summaries, period statistics, safe-integer GraphQL aggregates above the 32-bit `Int` range, and non-blocking persistence-failure behavior remain equivalent.
- `AC-004` Source/structural review proves `SqlTokenUsageLedgerRepository` extends the `TokenUsageLedgerEvent` BaseRepository model and has no `PrismaClient`, `createConfiguredPrismaClient`, injected-client, singleton-client-owner, or direct model-delegate acquisition path.
- `AC-005` Source/structural review proves `SecretEntryRepository` and `SecretEncryptionMetadataRepository` each extend the correct `BaseRepository` model, `SecretVaultRepository` alone owns cross-model sequencing, no secret repository class/file retains the `PrismaRepository`/`prisma-repository` provider suffix, and no secret runtime/service/bootstrap/provider caller accepts or retains a raw Prisma client/transaction delegate.
- `AC-006` The prerequisite library ticket's reviewed release evidence proves transaction options reach only the outer `$transaction`, existing no-options behavior is unchanged, nested calls share one transaction and outer options, commit succeeds, and thrown errors roll back all involved model repositories; backend coverage proves the vault uses that installed contract.
- `AC-007` Secret regression coverage proves live initializer serialization, termination/release behavior where applicable, interrupted key-only recovery, established byte/data-version-stable verification, missing/mismatched component closure, single-entry behavior, batch all-or-nothing behavior, no-overwrite/overwrite counts, domain-change rejection, create-missing collision rejection, and owner-bound exact-row compensation under the preserved wait/timeout values.
- `AC-008` Importer coverage proves dry-run performs no repository-prisma initialization/write, execution uses only the canonical explicit target, ambient/AppConfig/source `DATABASE_URL` cannot select or override it, and lifecycle shutdown occurs on success and failure.
- `AC-009` Schema/migration diff is empty; representative pre-existing token, secret metadata, and encrypted secret rows are read with unchanged semantics after the refactor; no data migration/rebuild occurs and secret/database bytes are not logged or exposed.
- `AC-010` Installed-package/runtime coverage proves package import acquires no client, explicit datasource identity is honored, query logging remains off by default and opt-in only, no WAL is enabled, and datasource conflict/readiness errors remain stable and value-safe.
- `AC-011` The reviewed prerequisite is verifiably published as `repository_prisma@1.0.9`, and the server manifest/lock resolves `1.0.9` with Prisma/`@prisma/client` 5.22 and no stale `1.0.8` runtime resolution for the server package.
- `AC-012` Final source/package scan finds no compatibility wrapper, dual repository implementation, local pnpm patch/link, vendored library copy, token/secret raw-client factory path, obsolete transaction-delegate plumbing, obsolete secret `*-prisma-repository` file/class name, or restored file-first repositories.

## Constraints / Dependencies

- Primary server workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/prisma-repository-adoption-token-stats-secret-store` on `codex/prisma-repository-adoption-token-stats-secret-store`, fast-forwarded to refreshed `origin/personal` at `153f3409cd90207f9219cbe20242606271b36104` after the prerequisite completed.
- Prerequisite library ticket: finalized and archived at `/Users/normy/autobyteus_org/repository_prisma/tickets/done/transaction-options`; annotated `v1.0.9` targets `634bb2b19df231957025c786ba5e9da1eabb938f`.
- Canonical prerequisite handoff/release evidence: `/Users/normy/autobyteus_org/repository_prisma/tickets/done/transaction-options/handoff-summary.md` and `/Users/normy/autobyteus_org/repository_prisma/tickets/done/transaction-options/release-deployment-report.md`.
- npm `latest` resolves `repository_prisma@1.0.9` with integrity `sha512-LY1ZkCpUQyj3kSUC7dBYjyBdezvscCOTTMNMNQFsy4g3InKlWii04hHFNMcIriDU4pQVsexx59+rDTPfN+S7YQ==`.
- Prisma ORM and generated client remain `5.22.x` under current manifests; no upgrade is authorized.
- Secret-vault security, concurrency, transaction-timeout, and value-free diagnostics requirements from the completed secure-provisioning work remain governing constraints.
- Main server and standalone importer are distinct composition roots and must each supply their already-authoritative explicit database URL.
- Tests run with Vitest forks and `fileParallelism:false`; test lifecycle rebinding must use `shutdownPrisma()`/`initializePrisma()` explicitly rather than retaining production client injection.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: `TokenUsageLedgerEvent`, `SecretEntry`, and `SecretEncryptionMetadata` rows in the canonical application SQLite database; secret root key at the existing deterministic `<database>.secret.key` sibling.
- Required outcome: `Directly Usable — No Migration`
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve all current ledger rows, encrypted secret rows, metadata bytes, and root-key bytes in place. No rewrite, rebuild, transform, or quarantine is required.
- Unacceptable data loss or corruption: Any loss/reordering/semantic change to retained token usage; any loss, replacement, plaintext exposure, domain mismatch, or corruption of secret rows/metadata/root key; any change that makes an established valid DB/key pair unreadable.
- Relevant availability, maintenance-window, or rollout constraints: The package prerequisite is published. No DB maintenance window or data migration is required. Normal restart is sufficient.
- Related requirement and acceptance-criteria IDs: `REQ-008`, `REQ-009`; `AC-007`, `AC-009`, `AC-011`.

## Assumptions

- The user's desired outcome is production adoption of the repository-prisma pattern, not only a written analysis.
- The local `repository_prisma` checkout and its archived release evidence are authoritative for the delivered library contract; published `1.0.9` is the required backend dependency.
- Exact secret transaction timeouts are preserved requirements rather than incidental implementation constants because prior review and concurrency evidence treated them as part of the operational behavior.
- The package's existing global lifecycle is intended per process; normal server and standalone importer run in separate processes/composition lifecycles.

## Risks / Open Questions

- The user approved the revalidated backend refactor scope; no requirement-approval gate remains.
- The prior library release gate is closed. The remaining dependency risk is only normal workspace manifest/lock resolution of published `1.0.9`.
- Repository-prisma's global lifecycle requires affected tests using multiple temporary DBs to rebind sequentially; existing `fileParallelism:false` reduces cross-test risk, but cleanup discipline must be explicit.
- Secret initialization lock semantics depend on Prisma 5.22 SQLite interactive transactions. The refactor must retain the established cross-client/process regression evidence and exact outer transaction options.
- The default token processor currently uses untracked `setImmediate` callbacks. Sharing a single shutdown-owned Prisma lifecycle makes that existing shutdown race material; the design must add bounded quiesce/drain ownership without making token persistence block event streaming.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| `REQ-001` | `UC-001`, `UC-009` |
| `REQ-002` | `UC-008`, `UC-009` |
| `REQ-003` | `UC-002`, `UC-003`, `UC-009` |
| `REQ-004` | `UC-004`, `UC-005`, `UC-006`, `UC-009` |
| `REQ-005` | `UC-004`, `UC-005`, `UC-006`, `UC-009` |
| `REQ-006` | `UC-004`, `UC-006`, `UC-010` |
| `REQ-007` | `UC-007` |
| `REQ-008` | `UC-001`–`UC-008` |
| `REQ-009` | `UC-001`, `UC-007`, `UC-009`, `UC-010` |
| `REQ-010` | `UC-009`, `UC-010` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| `AC-001` | Normal server startup lifecycle/order against isolated SQLite. |
| `AC-002` | Graceful and repeated shutdown lifecycle with one root client. |
| `AC-003` | Token write/read/statistics equivalence and failure isolation. |
| `AC-004` | Token repository structural pattern and obsolete client-path removal. |
| `AC-005` | Secret model/coordinator structural ownership and encapsulation. |
| `AC-006` | Library outer/nested transaction-options, commit, and rollback behavior. |
| `AC-007` | Secret initialization, restart, failure closure, batch, and compensation regressions. |
| `AC-008` | Importer dry-run/execute target authority and cleanup. |
| `AC-009` | Existing-data direct-use and zero schema/migration change. |
| `AC-010` | Installed-package import/readiness/logging/datasource/journal-mode policy. |
| `AC-011` | Upstream release and downstream normal dependency consumption. |
| `AC-012` | Clean-cut removal scan across source and package metadata. |

## Approval Status

Sequencing was approved by the user on 2026-07-28. The prerequisite is now completed and published, and the backend requirements have been revalidated against latest `origin/personal`.

`Approved` — on 2026-07-28 the user confirmed there were no remaining prerequisite obstacles and explicitly authorized continuing the original repository-pattern refactor ticket.

`Approved clarification` — the user rejected `SecretVaultPrismaRepository` as an unnatural implementation-provider name. The locked target uses `SecretVaultRepository`, `SecretEntryRepository`, and `SecretEncryptionMetadataRepository`; this is a clean rename with no compatibility alias.
