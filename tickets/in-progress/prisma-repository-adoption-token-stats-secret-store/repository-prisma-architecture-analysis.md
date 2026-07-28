# Repository-Prisma Architecture Analysis

## Artifact Metadata

- Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/prisma-repository-adoption-token-stats-secret-store/tickets/in-progress/prisma-repository-adoption-token-stats-secret-store/repository-prisma-architecture-analysis.md`
- Purpose: retain the focused comparison between the current token-usage/secret-vault persistence implementations, the intended `repository_prisma` architecture, and representative removed repositories recovered from Git history.
- Scope: active production paths, client lifecycle, repository construction, transaction routing, historical layering, target recommendation, completed package prerequisite, and persisted-data consequences.
- Status: Complete investigation evidence; backend requirements approved on 2026-07-28.
- Approval applicability: `N/A` (evidence/context only). Intended behavior is defined in [requirements.md](./requirements.md).
- Supports: [requirements.md](./requirements.md), [investigation-notes.md](./investigation-notes.md), and [design-spec.md](./design-spec.md).

## Executive Verdict

The user's concern is confirmed.

`autobyteus-server-ts` still declares/resolves `repository_prisma@1.0.8`, but **no active production source imports it**. Published `repository_prisma@1.0.9` now contains the transaction-options prerequisite needed by this refactor. The two active application runtime capabilities that still persist through Prisma—token usage/statistics and the encrypted secret vault—both continue to construct or retain Prisma clients outside the library:

- token usage owns a lazy `PrismaClient` through `TokenUsagePrismaClientOwner` and `createConfiguredPrismaClient()`;
- secret vault runtime creates, retains, injects, and disconnects a dedicated `PrismaClient` around `SecretVaultPrismaRepository`;
- the shared library's `BaseRepository`, context-aware client routing, implicit transaction context, explicit datasource readiness, and shutdown lifecycle are therefore bypassed.

This is not caused by the file-first conversion alone. Git history shows two distinct origins:

1. Before the file-first cleanup, normal SQL repositories extended `BaseRepository.forModel(...)` and providers/services depended on those repositories. Most were correctly removed when their capabilities became file-backed.
2. Token usage was later changed away from `BaseRepository` in commit `ddf18dcf3`, and the new ledger repository introduced in `ffca05da7` copied the direct-client pattern.
3. The secret vault was introduced later in `056455929` under an explicit ticket decision that `repository_prisma@1.0.8` was dependency infrastructure only and would not become a production database owner.

The current token store/service and secret-management service boundaries remain useful. The defect is concentrated in Prisma repository construction, per-capability client ownership, and transaction routing—not in the higher-level domain behavior.

## Intended Library Pattern

Source examined initially at commit `715e4558ddc6ef6907c1f0055d261a8766ff20c6` / `v1.0.8`, then revalidated after the completed transaction-options release. The required current contract is published `repository_prisma@1.0.9`, annotated tag target `634bb2b19df231957025c786ba5e9da1eabb938f`.

The library's documented and implemented pattern is:

```text
Application composition root
  -> initializePrisma({ datasourceUrl })
  -> service/provider
  -> model-specific repository extends BaseRepository.forModel(Prisma.ModelName.<Model>)
  -> BaseRepository.get delegate
  -> getPrismaClient()
  -> active AsyncLocalStorage transaction client, otherwise lifecycle-owned root client
  -> Prisma model delegate
  -> database
```

For multi-repository atomic work:

```text
service/coordinator
  -> runInTransaction(callback, options?)
  -> root Prisma $transaction
  -> AsyncLocalStorage binds transaction client
  -> every BaseRepository call in callback resolves the same transaction client
  -> commit or rollback
```

The application should not pass `PrismaClient` or transaction delegates through service constructors or method parameters. The composition root supplies the canonical datasource once, repositories acquire the correct context-aware delegate automatically, and shutdown uses the library's one lifecycle owner.

Relevant library owners:

| Library file | Responsibility |
| --- | --- |
| `src/lib/base-repository.ts` | Strongly typed model repository CRUD; resolves the model delegate per invocation. |
| `src/lib/context.ts` | AsyncLocalStorage transaction binding and `runInTransaction`. |
| `src/lib/prisma-manager.ts` | Chooses current transaction client or lifecycle-backed root boundary. |
| `src/lib/client/lifecycle.ts` | Owns the one raw root client, datasource identity, readiness, failure state, and shutdown. |
| `src/lib/client.ts` | Thin public lifecycle facade. |
| `src/lib/forwarding-proxy.ts` | Prevents stale raw client/delegate retention across lifecycle changes. |

## Historical AutoByteus Pattern

Representative code recovered from `f50fa2d4c^`:

- `src/agent-definition/repositories/sql/agent-definition-repository.ts`
- `src/agent-definition/repositories/sql/agent-prompt-mapping-repository.ts`
- `src/mcp-server-management/repositories/sql/mcp-server-configuration-repository.ts`
- `src/prompt-engineering/repositories/sql/prompt-repository.ts`
- `src/token-usage/repositories/sql/token-usage-record-repository.ts`

Every representative repository used this construction:

```ts
export class SqlAgentDefinitionRepository extends BaseRepository.forModel(
  Prisma.ModelName.AgentDefinition,
) {
  async findById(id: number) {
    return this.findUnique({ where: { id } });
  }
}
```

The wider historical layering was:

```text
GraphQL / service entry
  -> domain provider (domain <-> Prisma conversion when needed)
  -> model-specific SQL repository
  -> repository_prisma BaseRepository
  -> context-aware Prisma client
  -> SQLite
```

The pattern did not require each repository to construct or receive a `PrismaClient`. File-first commit `f50fa2d4c` removed repositories whose authoritative storage moved to files; that removal does not invalidate the pattern for capabilities that remain Prisma-backed.

## Current Token-Usage Path

### Supported production paths

Write path:

```text
runtime token-usage event
  -> AgentRunEventPipeline
  -> TokenUsageEventEnrichmentTransformer
  -> TokenUsageEventPersistenceProcessor (non-blocking scheduled append)
  -> TokenUsageLedgerStore
  -> SqlTokenUsageLedgerRepository
  -> TokenUsagePrismaClientOwner / createConfiguredPrismaClient
  -> Prisma TokenUsageLedgerEvent delegate
  -> token_usage_ledger_events
```

Read path:

```text
GraphQL TokenUsageStatisticsResolver
  -> TokenUsageStatisticsProvider or TokenUsageLedgerStore
  -> SqlTokenUsageLedgerRepository
  -> custom lazy Prisma client owner
  -> token_usage_ledger_events
  -> existing statistics/summary projection
  -> GraphQL result
```

### Findings

- `SqlTokenUsageLedgerRepository` does not extend `BaseRepository`.
- It directly calls `this.client.tokenUsageLedgerEvent.*`.
- It has a special optional injected-client test path plus a separate process singleton default client path.
- The default lazy client has no application shutdown/disconnect owner.
- Token persistence schedules non-blocking appends with untracked `setImmediate` callbacks. Once token and secret repositories share one explicitly closed library lifecycle, server shutdown must quiesce and drain those already-scheduled callbacks before `shutdownPrisma()` so a late callback cannot fail against or lazily reopen the closed client.
- The repository's model mapping and idempotency logic are valid and should remain in the repository.
- The store and statistics providers are already above persistence and should not acquire Prisma concerns.

### Recommended correction

Make `SqlTokenUsageLedgerRepository` extend `BaseRepository.forModel(Prisma.ModelName.TokenUsageLedgerEvent)` and replace direct delegate calls with inherited `create`, `findFirst`, `findMany`, and `update` methods. Remove its injected/default Prisma client paths. Preserve event-to-Prisma and Prisma-to-domain transformations and the `P2002` idempotency recovery exactly. Give the default event-pipeline composition an idempotent stop/drain hook for scheduled token appends and invoke it before the shared Prisma lifecycle closes; event streaming remains non-blocking during normal operation.

## Current Secret-Vault Path

### Supported production paths

Startup:

```text
AppConfig canonical database location
  -> Prisma migrations
  -> SecretVaultRuntime.initialize(location)
  -> createConfiguredPrismaClient(location.databaseUrl)
  -> SecretVaultPrismaRepository(prisma)
  -> SecretVaultBootstrap initialize/verify transaction
  -> SecretManagementService
```

Runtime:

```text
provider/search/media/Gemini/custom-provider owner
  -> SecretManagementService
  -> catalog authorization + encrypt/decrypt
  -> SecretVaultPrismaRepository
  -> dedicated injected PrismaClient
  -> secret_entries / secret_encryption_metadata
```

Operator importer execution:

```text
explicit --database-url
  -> ApplicationDatabaseLocation
  -> migration
  -> new SecretVaultRuntime
  -> dedicated PrismaClient
  -> bootstrap/verify
  -> atomic SecretManagementService.saveBatch
  -> close dedicated PrismaClient
```

### Findings

- `SecretManagementService` is the correct value/security owner and must remain authoritative.
- `SecretVaultPrismaRepository` currently owns two model delegates, cross-model transaction coordination, row mapping, and compensation receipt state in one 300-line file.
- `SecretVaultRuntime` owns the dedicated Prisma client even though that lifecycle also concerns token usage and any other runtime repository on the same application database.
- Transactions explicitly pass a callback transaction delegate through private repository methods. This is bounded, but it bypasses the library feature specifically designed to let repositories acquire the active transaction implicitly.
- The exact `maxWait` and `timeout` values are operationally relevant: initialization uses `{ maxWait: 2_000, timeout: 10_000 }`; batch and compensation transactions use `{ maxWait: 2_000, timeout: 5_000 }`.
- The established initialization lock, byte-stable restart verification, atomic batches, domain recheck, receipt-bound compensation, and key/metadata invariants must not change.

### Recommended correction

Use two model repositories:

- `SecretEntryPrismaRepository extends BaseRepository.forModel(Prisma.ModelName.SecretEntry)` owns entry CRUD and Prisma-row mapping;
- `SecretEncryptionMetadataPrismaRepository extends BaseRepository.forModel(Prisma.ModelName.SecretEncryptionMetadata)` owns singleton metadata reads/count validation and mapping.

Retain one `SecretVaultPrismaRepository` coordinator as the authoritative vault persistence boundary. It composes those model repositories, owns cross-model sequencing/receipts, and opens implicit transactions with `runInTransaction`. Neither the service, coordinator, nor runtime should accept or retain raw `PrismaClient` or transaction delegates.

`SecretVaultRuntime` should own only bootstrap/service/key lifecycle. Main server composition and the standalone importer execution composition should initialize and shut down `repository_prisma` with their already-canonical explicit database URL.

## Resolved Library Prerequisite

The original investigation confirmed that installed/source `repository_prisma@1.0.8` accepted only a callback and could not forward Prisma interactive transaction options. Using it would have silently replaced the vault's reviewed 10-second initialization timeout with Prisma's default or forced the backend to retain a direct `$transaction` bypass.

The standalone library ticket implemented and released the required contract:

```ts
runInTransaction(callback, options?)
```

- forward `options` only when opening the outermost root transaction;
- retain the current nested behavior: if an AsyncLocalStorage transaction is already active, reuse it and let the outer transaction's options remain authoritative;
- keep calls without options behaviorally unchanged;
- export the options type and document/test the rule;
- published as `repository_prisma@1.0.9` before server consumption (no local link, patch, or unpublished fallback).

Canonical evidence:

- `/Users/normy/autobyteus_org/repository_prisma/tickets/done/transaction-options/handoff-summary.md`
- `/Users/normy/autobyteus_org/repository_prisma/tickets/done/transaction-options/release-deployment-report.md`

The release passed source review, API/E2E at 98.3%, proportional test review, 83/83 finalized-main tests, installed ESM/CJS/declaration smoke, CI, and release publication. Its Prisma peer remains `^5.22.0`, and it changes no schema, persisted data, datasource, lifecycle, decorator, or BaseRepository behavior.

A synthetic runtime probe against the current AutoByteus Prisma schema confirmed that `repository_prisma@1.0.8` already resolves `TokenUsageLedgerEvent`, `SecretEntry`, and `SecretEncryptionMetadata` model delegates correctly, and that an implicit multi-model transaction rolls back both secret writes. The probe left the temporary database hash unchanged after rollback and left no WAL/SHM/journal sidecar. It also confirmed current `runInTransaction` declared arity `1`. Exact probe command/results are recorded in [investigation-notes.md](./investigation-notes.md).

## Gap Matrix

| Concern | Intended Pattern | Current Token Usage | Current Secret Vault | Target |
| --- | --- | --- | --- | --- |
| Root client lifecycle | One `repository_prisma` lifecycle initialized at composition root | Custom lazy singleton; no shutdown | Dedicated runtime-owned client | Composition-root init/shutdown for shared runtime client |
| Token persistence shutdown | Drain dependent work before shared client closes | Untracked non-blocking `setImmediate` callbacks | N/A | Default pipeline quiesces/drains scheduled appends before `shutdownPrisma`; no post-close lazy rebind |
| Model repository | `BaseRepository.forModel(...)` | Direct delegate calls | One dual-model direct repository | Token model repo + two secret model repos extend BaseRepository |
| Transaction routing | ALS-backed implicit context | No multi-write transaction currently needed | Explicit callback transaction passed to private methods | Coordinator calls option-aware `runInTransaction`; model repos resolve ALS client |
| Datasource authority | Explicit initialization value wins | Factory reads AppConfig on acquisition | Runtime passes canonical URL | Main/importer composition passes canonical URL explicitly once |
| Service ownership | Services own domain policy, repositories persistence | Healthy | Healthy | Preserve |
| Testing seam | Bind lifecycle to isolated test datasource | Optional injected Prisma path | Injected Prisma per fixture | Explicit test lifecycle init/shutdown; no production dual path |
| Data/schema | Repository abstraction only | Current ledger schema | Current vault schema/key pair | No schema or data representation change |

## Scope Boundary

### In scope

- normal dependency adoption of published `repository_prisma@1.0.9`;
- main-server and standalone-importer repository-prisma lifecycle composition;
- token ledger repository adoption;
- secret model repository split and implicit transaction coordination;
- removal of token/secret raw-client construction/injection/retention;
- affected tests and documentation;
- package manifest/lock update and installed-contract validation.

### Out of scope

- restoring removed file-backed repositories;
- reverting file-first storage;
- changing token accounting/statistics contracts;
- changing secret identities, encryption, key files, catalog authorization, UI/GraphQL behavior, importer targeting, or migration behavior;
- changing Prisma schema/migrations or stored rows;
- forcing app-data-migration implementation classes onto `BaseRepository` (they are bounded migration infrastructure, not the two requested runtime repositories);
- changing `SecretVaultInspectionService`'s deliberately read-only SQLite inspection path;
- enabling WAL or upgrading Prisma ORM/client.
- modifying or republishing the completed repository-prisma transaction-options implementation.

## Persisted-Data Decision

`Directly Usable — No Migration`.

The target changes how the current Prisma delegate is acquired; it does not change:

- `schema.prisma`;
- migration SQL/history;
- `token_usage_ledger_events`, `secret_entries`, or `secret_encryption_metadata` columns;
- token event mapping, ordering, idempotency, or statistics aggregation;
- encrypted record bytes, encryption-domain metadata, root-key location, or verification rules;
- the canonical application database URL.

The server should initialize `repository_prisma` without enabling WAL so this refactor does not introduce a journal-mode change. Existing databases and key pairs remain directly readable by the same generated Prisma client and domain mappers.

## Recommendation

Proceed sequentially rather than implementing both repositories in one ticket:

1. completed: `repository_prisma@1.0.9` is published and verified;
2. resume the backend ticket against the normal published dependency;
3. initialize its lifecycle at the server/importer composition boundaries;
4. convert token and secret model repositories to `BaseRepository`;
5. preserve higher-level stores/services and all observable behavior;
6. remove obsolete per-capability Prisma client ownership and transaction-delegate plumbing;
7. validate token semantics, vault concurrency/atomicity/restart behavior, importer target isolation, lifecycle shutdown, logging policy, and unchanged persisted schema/data.
