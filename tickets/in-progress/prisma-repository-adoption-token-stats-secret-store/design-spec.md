# Token Statistics And Secret Vault Repository-Prisma Adoption — Design Spec

## Current-State Read

The current server has one authoritative application database identity in
`AppConfig`/`ApplicationDatabaseLocation`, but it does not have one runtime Prisma
repository lifecycle. After schema migrations, `SecretVaultRuntime` constructs,
retains, injects, and disconnects a dedicated `PrismaClient`.
`SqlTokenUsageLedgerRepository` separately owns a lazy process singleton plus an
optional injected-client path and never participates in server shutdown. Neither
production path imports the installed `repository_prisma` package.

The token store, projections, statistics providers, GraphQL surfaces, secret bootstrap,
`SecretManagementService`, crypto, catalog, root-key, and importer target boundaries
are coherent and remain authoritative. The defect is below them:

- runtime composition does not initialize/close the existing shared library lifecycle;
- active model repositories bypass `BaseRepository.forModel(...)`;
- secret multi-model operations pass transaction delegates instead of using the
  library's ALS-bound transaction context;
- one secret repository owns two Prisma model delegates and transaction coordination;
- the default token event processor schedules untracked `setImmediate` appends, which
  becomes a reachable shutdown race once the client is explicitly shared and closed.

Git history at `f50fa2d4c^` confirms the intended local layering:
provider/service -> model-specific repository -> `BaseRepository` -> context-aware
Prisma client. File-first removal at `f50fa2d4c` remains correct for capabilities whose
authoritative persistence moved to files; this target applies only to the active token
ledger and secret vault Prisma models.

The prerequisite is no longer a gap. `repository_prisma@1.0.9` is published and
reviewed with `RunInTransactionOptions`, exact outer settings forwarding, unchanged
callback-only behavior, nested outer-authority semantics, and the existing
`@prisma/client:^5.22.0` peer contract. The server still resolves `1.0.8` and must
adopt `1.0.9` through the normal manifest/lockfile.

The latest tracked base also contains the completed safe-integer token-statistics
change. Repository adoption must preserve `GraphQLSafeInt` serialization and the
existing large aggregate behavior alongside all earlier token and vault invariants.
Detailed evidence is in `investigation-notes.md` and
`repository-prisma-architecture-analysis.md`.

## Intended Change

1. Resolve `repository_prisma@1.0.9` normally in the server manifest and workspace
   lockfile; retain Prisma/`@prisma/client` 5.22.
2. Make `server-runtime.ts` the normal-process composition owner:
   schema migrations -> explicit `initializePrisma({ datasourceUrl })` with no WAL
   request -> secret bootstrap -> app-data migrations -> remaining startup.
3. During Fastify close, quiesce/drain the default token persistence processor,
   zeroize/close the secret runtime, and then call `shutdownPrisma()` exactly once.
   Nested finalization must still reach the shared lifecycle close if an earlier
   dependent close fails.
4. Convert `SqlTokenUsageLedgerRepository` to
   `BaseRepository.forModel(Prisma.ModelName.TokenUsageLedgerEvent)`. Preserve its
   mappings, filters, ordering, display updates, and `P2002` idempotency recovery while
   removing all raw/default/injected client ownership.
5. Give `TokenUsageEventPersistenceProcessor` bounded pending-work ownership so normal
   event processing remains non-blocking but shutdown can stop scheduling, await all
   already-scheduled/in-flight appends, and prevent post-shutdown lazy rebinding.
   The default pipeline composition owns construction, stop/drain, a durable stopped
   sentinel for the remainder of server shutdown, and an explicit lifecycle-owned
   reset hook used only by isolated tests or a deliberate fresh lifecycle.
6. Split secret model access into:
   - `SecretEntryRepository extends BaseRepository.forModel(SecretEntry)`;
   - `SecretEncryptionMetadataRepository extends
     BaseRepository.forModel(SecretEncryptionMetadata)`.
7. Replace the existing `SecretVaultPrismaRepository` name with
   `SecretVaultRepository` and retain that boundary as the authoritative vault
   persistence coordinator. It composes those two domain-named model repositories,
   owns transaction sequencing, batch counts, domain rechecks, receipt ownership,
   exact-row compensation, and uses published `runInTransaction` options. It accepts
   no raw client or transaction delegate. No secret repository class/file exposes the
   `Prisma` provider in its identity.
8. Keep pure vault persistence DTOs in one persistence-owned type file so service,
   bootstrap, coordinator, and model repositories share tight shapes without callers
   depending on model-repository internals.
9. Remove Prisma-client lifecycle from `SecretVaultRuntime`; it continues to own only
   bootstrap result/service/root-key lifecycle. Main server and importer composition
   must initialize repository-prisma before calling it.
10. In importer execution only, run migrations, explicitly initialize
    repository-prisma with the immutable CLI target, create/use the vault runtime, then
    close the runtime and shut down repository-prisma in `finally`. Preview remains
    inspection-only and must not initialize Prisma.
11. Preserve bounded app-data-migration raw-client owners and
    `SecretVaultInspectionService`; they are different, explicitly out-of-scope
    boundaries rather than compatibility fallbacks for runtime repositories.
12. Update active architecture/module documentation. Change no schema, migration,
    database URL, journal mode, stored row/key bytes, encryption, token accounting, or
    public API behavior.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Approved In-Scope Use Case(s) | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | `UC-001`, `UC-008`, `UC-009` | `Operational` | `REQ-001`, `REQ-002`, `REQ-008`; `AC-001`, `AC-002`, `AC-010` | Normal server start and Fastify/process shutdown | `server-runtime.ts`, vault runtime, token custom owner, scheduled append processor; investigation rows | One explicit shared library lifecycle after migrations; dependent token/vault work closes before one library shutdown; canonical URL, startup ordering, failure behavior, and no-WAL policy preserved | `DS-001`, `DS-002`, `DS-011` |
| `BEH-002` | `UC-002`, `UC-003`, `UC-009` | `System` | `REQ-003`, `REQ-008`; `AC-003`, `AC-004`, `AC-009` | Enriched `TOKEN_USAGE_UPDATED` event or supported token statistics/summary query | Token event pipeline/store/repository/providers; safe-integer ticket and architecture supplement | Same non-blocking append, idempotency, mapping, ordering, pricing, hierarchy, display backfill, summaries, period results, and safe-integer GraphQL values through a BaseRepository model owner | `DS-003`, `DS-004`, `DS-005` |
| `BEH-003` | `UC-004`, `UC-005`, `UC-009` | `System` | `REQ-004`, `REQ-005`, `REQ-008`; `AC-005`, `AC-007`, `AC-009` | Server/importer vault bootstrap or authorized status/save/remove/resolve | Vault runtime/bootstrap/service/direct repository and prior security evidence | Model-specific BaseRepositories and one coordinator replace direct client access; health, authorization, encryption, byte-stable verification, value-free outcomes, and single-entry semantics remain | `DS-006`, `DS-007`, `DS-011` |
| `BEH-004` | `UC-004`, `UC-006`, `UC-010` | `System` | `REQ-005`, `REQ-006`; `AC-006`, `AC-007` | Initializer lock, save batch, create-missing migration batch, or compensation | Direct `$transaction(tx)` methods and published 1.0.9 contract | Coordinator calls `runInTransaction`; model repos resolve one ALS client; outer settings remain `2s/10s` for initialization and `2s/5s` for mutation/compensation; all atomicity/receipt rules remain | `DS-008`, `DS-011` |
| `BEH-005` | `UC-007` | `Operational` | `REQ-007`, `REQ-008`; `AC-008`, `AC-009` | Operator dry-run or confirmed execution with required absolute `--database-url` | Import CLI/request/service/inspection/runtime factory | Preview stays lifecycle-free and read-only; execution initializes and closes repository-prisma for exactly the immutable target, with all confirmation/recheck/output/failure behavior preserved | `DS-009`, `DS-010`, `DS-011` |
| `BEH-006` | `UC-001`, `UC-007`, `UC-009`, `UC-010` | `Contract` | `REQ-006`, `REQ-009`, `REQ-010`; `AC-006`, `AC-010`–`AC-012` | Server build/install and production code import/use of repository-prisma | Published 1.0.9 handoff/release evidence; current server package/lock and zero production imports | Normal 1.0.9 dependency; model repositories/lifecycle/HOF used directly; no patch/link/vendor/dual path; import/logging/readiness/peer behavior preserved and docs corrected | `DS-012` |

## Material Design Premises (Only When Needed)

| Premise ID | Related Behavior ID(s) | Initiating Basis Kind (`User`/`System`/`Operational`/`Contract`) | Independent Product-Supported Trigger Or Applicable Contract And Support Evidence | Forward Production Path To Claimed State | Lifecycle Preconditions And Material Consequence | Reachability (`Reachable`/`Not Reachable`/`Unclear`) | Design Consequence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `MP-001` | `BEH-001`, `BEH-002` | `System` + `Operational` | Supported token event schedules persistence with `setImmediate`; supported SIGINT/SIGTERM/Fastify close shuts the server | Enriched event -> persistence processor schedules append -> shutdown hook can reach shared client close before callback begins/settles | Shared lifecycle can be disconnected while work is pending; a late BaseRepository call could fail or lazily rebind an ownerless client | `Reachable` | Processor tracks scheduled/in-flight tasks; default pipeline exposes idempotent stop/drain and retains a stopped sentinel so ordinary getters cannot recreate work; server awaits it before library shutdown |
| `MP-002` | `BEH-003`, `BEH-004` | `Operational` + `Contract` | Normal startup verifies an established DB/key pair; prior reviewed vault contract requires byte-stable verification | Server/import execution -> explicit library init without WAL -> initialization transaction -> metadata/key verification | A no-op lock write or WAL enablement would change physical bytes/sidecars and violate established restart evidence | `Reachable` | Preserve query-only lock callback, exact transaction options, no WAL request, same models/mappings, and no migration |
| `MP-003` | `BEH-004` | `Operational` | Concurrent normal vault initializers/import processes are covered by the established serialized initialization contract | Separate process composition -> same SQLite target -> `runInTransaction` outer initialization callback | The physical transaction must be configured when opened; inner repository calls cannot change it | `Reachable` | Coordinator supplies `{ maxWait: 2_000, timeout: 10_000 }` to the outer HOF and passes no tx object; 1.0.9/Prisma own locking and timeout enforcement |
| `MP-004` | `BEH-005` | `Operational` | CLI explicitly supports dry-run and confirmed execution as separate actions | Absolute CLI URL -> immutable target -> preview inspection OR confirmation -> execution runtime | Preview must not mutate or bind the global Prisma lifecycle; execution runs in its own CLI process/composition lifecycle | `Reachable` | Lifecycle calls exist only in the execution factory; target comes only from `targetLocation.databaseUrl`; cleanup always shuts down |
| `MP-005` | `BEH-001`, `BEH-005`, `BEH-006` | `Contract` | repository_prisma owns one global client per process; normal server and importer are separate process entrypoints | Server entry or importer CLI entry -> one explicit target -> one initialize/use/shutdown lifecycle | One process cannot simultaneously own two targets; tests may rebind only after awaited shutdown | `Reachable` | No target multiplexer or local wrapper; composition roots initialize once, tests sequence lifecycle state, and importer target isolation remains explicit |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/prisma-repository-adoption-token-stats-secret-store/tickets/in-progress/prisma-repository-adoption-token-stats-secret-store/repository-prisma-architecture-analysis.md` | Retained active/history/library-gap comparison and probe evidence | `REQ-001`–`REQ-010`; `AC-001`–`AC-012` | Supplies historical layering, current path evidence, delivered prerequisite context, direct-use data proof, and target constraints | Complete; approval `N/A` because it is evidence/context only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Refactor`
- Current design issue found: `Yes`
- Root cause classification: `Boundary Or Ownership Issue` (primary), with
  `File Placement Or Responsibility Drift` in the two-model secret repository and
  `Missing Invariant` for shared-client shutdown quiescence.
- Refactor needed now: `Yes`
- Evidence: Active token and secret production repositories bypass the installed
  lifecycle/BaseRepository/ALS capability. Token owns a client with no shutdown,
  secret runtime owns a database client outside application composition, one secret
  repository mixes two model delegates with coordination, and its methods propagate
  transaction clients. Moving both paths onto one explicitly closed lifecycle exposes
  the existing untracked scheduled-append race.
- Design response: Put root lifecycle sequencing in the real server/importer
  composition roots; restore one-model BaseRepositories; retain the vault coordinator
  for real cross-model invariants; add bounded token processor drain ownership; remove
  raw/injected runtime client paths cleanly.
- Refactor rationale: Adapters around the custom clients or direct transactions would
  preserve the bypass. The proposed split follows both the library contract and
  well-formed historical AutoByteus repositories while leaving healthy domain owners
  unchanged.
- Intentional deferrals and residual risk, if any: App-data-migration database classes
  retain explicit clients because they own historical/raw-SQL transition work.
  `SecretVaultInspectionService` retains its read-only SQLite inspection boundary for
  preview. Tests must serialize global lifecycle rebinds. A future Prisma upgrade or
  multi-target same-process requirement would need a separate design; neither is in
  scope.

## Terminology

- **Runtime model repository:** A model-specific repository used by normal token or
  secret application behavior and backed by `BaseRepository`.
- **Vault persistence coordinator:** `SecretVaultRepository`; the cross-model
  owner above entry/metadata model repositories, not another Prisma client owner.
- **Quiesce/drain:** Stop accepting new scheduled token persistence work and await all
  work already scheduled or executing before the shared client closes.
- **Composition root:** The normal server startup/shutdown function or importer
  execution factory that owns one explicit datasource lifecycle for its process.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove token's `TokenUsagePrismaClientOwner`, `defaultPrismaClientOwner`, injected
  `PrismaClient` constructor argument, and `client` getter.
- Remove `SecretVaultRuntime.prisma`, configured-client creation, retention, and direct
  disconnect.
- Replace the current `SecretVaultPrismaRepository` class/file with
  `SecretVaultRepository`; remove its raw-client constructor,
  `VaultTransactionClient` type, direct model delegates, transaction-client arguments,
  and `*From`/`*With` helper paths used only for explicit transaction propagation.
- Do not retain compatibility aliases or re-export files for the old
  `*PrismaRepository`/`*-prisma-repository` secret names.
- Remove server resolution of `repository_prisma@1.0.8`.
- Remove documentation saying repository-prisma is dependency-only infrastructure.
- Do not retain a direct-client fallback, local wrapper, parallel repository,
  old/new package path, or test-only raw-client constructor in production classes.
- Do not remove `createConfiguredPrismaClient` itself: bounded app-data-migration owners
  still use it and are explicitly outside the runtime repository replacement.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume:
  `TokenUsageLedgerEvent`, `SecretEntry`, and `SecretEncryptionMetadata` rows in the
  canonical application SQLite file, plus the existing deterministic sibling root-key
  file. User volume was not opened because no transformation is proposed.
- Relevant code-model, serialization, semantic, or physical-store change: Delegate
  acquisition, client lifecycle, file responsibility, and transaction routing only.
  Prisma schema, migrations, fields, indexes, row mappings, crypto formats, URL, and
  journal policy do not change.
- Normal reader/writer behavior and representative evidence: The same generated Prisma
  5.22 client and current mapping functions read/write the same models. A disposable
  consumer-schema probe resolved all three models through BaseRepository and rolled
  back both secret models atomically.
- Required semantics and invariants under direct use: Preserve all token event
  identities/order/accounting/statistics/safe-integer projection; preserve encrypted
  bytes, metadata singleton/domain, root-key pair, authorization, atomicity, and
  byte-stable verification.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints:
  Real secret data/key material must remain untouched and value-free in logs. No WAL,
  rewrite, rebuild, quarantine, or maintenance window. DB/key are backed up/restored
  together under the existing contract.
- Decision: `Directly Usable — No Migration`
- Decision rationale, including concrete benefit versus I/O, downtime, corruption,
  recovery, and rollout cost: BaseRepository reaches the same generated delegates and
  forwards the same Prisma arguments. A migration provides no semantic benefit and
  would add unnecessary I/O, corruption exposure, downtime, and secret-handling risk.
- Acceptance criteria or design constraints supported by this decision: `REQ-008`,
  `REQ-009`; `AC-003`, `AC-007`, `AC-009`–`AC-011`.

### Migration Plan

N/A — current stored data is directly usable and no schema/representation
transformation is authorized.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | `Primary End-to-End` | `BEH-001`, `BEH-006` | Normal server start with initialized AppConfig | APIs/runtimes active on one ready repository-prisma target | `startConfiguredServer` composition | Establishes migration/init/bootstrap order and explicit target ownership |
| `DS-002` | `Primary End-to-End` | `BEH-001` | Fastify/process close | Shared Prisma lifecycle idle after dependent work/key close | Server onClose composition | Prevents client leaks, lost/reopened token work, and wrong close order |
| `DS-003` | `Primary End-to-End` | `BEH-002` | Enriched token usage event | Same ledger row or idempotently recovered existing row | Token event pipeline/store/repository | Preserves non-blocking runtime persistence through BaseRepository |
| `DS-004` | `Return-Event` | `BEH-002` | Persistence callback success/failure | Silent completion or value-safe warning without blocking event streaming | Token persistence processor | Preserves failure isolation while making work drainable |
| `DS-005` | `Primary End-to-End` | `BEH-002` | GraphQL/provider summary or period request | Existing token result including safe-integer aggregates | Token provider/store/repository/projections | Preserves all read semantics above the persistence refactor |
| `DS-006` | `Primary End-to-End` | `BEH-003`, `BEH-004` | Server/import vault initialization | Ready or fail-closed vault service/health | Secret bootstrap/runtime | Preserves DB/key verification and initializer serialization |
| `DS-007` | `Primary End-to-End` | `BEH-003` | Authorized secret status/save/remove/resolve | Value-free state/mutation or trusted transient value | `SecretManagementService` | Keeps security/authorization/crypto above persistence |
| `DS-008` | `Bounded Local` | `BEH-004` | Coordinator initialization/batch/compensation call | One outer transaction result/rollback and receipt/count outcome | `SecretVaultRepository` | Makes ALS multi-model sequencing and exact options explicit |
| `DS-009` | `Primary End-to-End` | `BEH-005` | Importer dry-run request | Read-only plan/output with no Prisma lifecycle | Import service + inspection service | Protects non-mutating preview and target authority |
| `DS-010` | `Primary End-to-End` | `BEH-005`, `BEH-006` | Confirmed importer execution | Batch result/failure after vault and Prisma cleanup | Import execution composition | Carries exact target through migration/init/use/finally close |
| `DS-011` | `Return-Event` | `BEH-001`, `BEH-003`–`BEH-005` | Prisma/vault callback result or failure | Commit/rollback, fail-closed health/error, cleanup completion | HOF/Prisma plus caller owner | Preserves atomic and value-safe failure behavior |
| `DS-012` | `Primary End-to-End` | `BEH-006` | Workspace package resolution/source import | Installed 1.0.9 lifecycle/BaseRepository/HOF used by runtime | Package manager + published library | Prevents unpublished or dual-path adoption |

## Primary Execution Spine(s)

`AppConfig canonical URL -> Prisma schema migrations -> server composition initializePrisma(explicit URL, WAL omitted) -> SecretVaultRuntime bootstrap -> app-data migrations -> routes/runtime`

`Fastify close -> stop dependent delivery runtimes -> default token pipeline stop/drain -> SecretVaultRuntime close/key zeroization -> shutdownPrisma -> process close result`

`TOKEN_USAGE_UPDATED -> enrichment -> non-blocking TokenUsageEventPersistenceProcessor -> TokenUsageLedgerStore -> SqlTokenUsageLedgerRepository(BaseRepository) -> ALS/root Prisma delegate -> token_usage_ledger_events`

`GraphQL/provider request -> TokenUsageLedgerStore -> BaseRepository ledger reads -> existing projections/statistics -> GraphQLSafeInt/current result`

`SecretManagementService operation -> SecretVaultRepository coordinator -> SecretEntry/Metadata BaseRepositories -> ALS/root Prisma delegate -> encrypted vault rows -> service result`

`Importer explicit absolute URL -> immutable target -> read-only preview OR migrations -> initializePrisma(exact URL) -> vault runtime/service batch -> runtime close -> shutdownPrisma`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | Server composition obtains the already-canonical URL, completes schema migrations, explicitly binds repository-prisma without WAL, then lets vault bootstrap and app-data migrations query that same database before exposing runtime surfaces. | AppConfig; migrations; repository-prisma lifecycle; vault runtime; remaining startup | `startConfiguredServer` | Logging, denied file paths, migration engine, readiness errors |
| `DS-002` | Fastify close first stops existing dependent services. Regardless of earlier close failure, nested finalization reaches token drain, vault key close, and shared Prisma shutdown in that order; repeated calls remain safe. | Fastify; default token pipeline; vault runtime; repository-prisma lifecycle | Server onClose hook | Error propagation, idempotency, signal handler |
| `DS-003` | The processor schedules a tracked task and immediately returns. The task calls the unchanged store and BaseRepository-backed ledger repository; unique conflicts recover the same existing event. | Event pipeline; persistence processor; ledger store; model repository; DB row | Token event pipeline for scheduling; repository for model persistence | Enrichment, mapping, warning policy |
| `DS-004` | A tracked scheduled task catches/logs persistence failure exactly as today and always settles/removes itself. Stop prevents new tasks and awaits the current set without surfacing persistence failure into event streaming. | Pending task set; store promise; warning sink; drain waiter | `TokenUsageEventPersistenceProcessor` | Logger value safety, event-loop scheduling |
| `DS-005` | Queries call the existing provider/store APIs. The model repository reads rows in the same order and maps them identically; existing projections return unchanged hierarchy, prices, display fields, and safe integers. | GraphQL/provider; store; model repository; projection; response | Existing token store/providers | Display capture/backfill, pricing, safe integer scalar |
| `DS-006` | An initialized library client is already available when runtime constructs a no-client vault coordinator. Bootstrap opens an optioned outer transaction, resolves metadata/entry model repositories through ALS, and returns Ready or established fail-closed health. | Composition root; runtime; bootstrap; coordinator; model repos; DB/key | `SecretVaultBootstrap` for state machine; coordinator for persistence transaction | DB identity, root-key file, verifier crypto |
| `DS-007` | The service authorizes and encrypts/decrypts exactly as today, then calls only the coordinator boundary. The coordinator delegates model operations; service never sees a Prisma client or tx. | Consumer; service; catalog/crypto; coordinator; model repo; row | `SecretManagementService` | Event sink, zeroization, health |
| `DS-008` | Coordinator chooses initialization or mutation options once, opens `runInTransaction`, and performs ordered cross-model work through model repos. Every repo call resolves the same ALS client. Throwing lets Prisma roll back; receipt state is created only after commit. | Coordinator; HOF; ALS; metadata repo; entry repo; receipt | `SecretVaultRepository` | Typed option constants, buffer matching/zeroization |
| `DS-009` | Dry-run validates the immutable request, reads source, and uses the read-only inspection service. The execution factory and repository-prisma are never reached. | CLI request; import service; source reader; inspection service; plan | Import service | Confirmation/output formatting, source release |
| `DS-010` | After inspection and confirmation, execution runs migrations for the immutable target, initializes repository-prisma for that exact URL, creates the vault runtime, rechecks health, performs one atomic batch, and closes runtime then library in `finally`. | Import service; migrations; repository-prisma; runtime/service; batch; cleanup | Import execution factory/service | Source release, target identity, sanitized error projection |
| `DS-011` | Library lifecycle, transaction, vault bootstrap, and import failures propagate through existing typed/value-safe boundaries while `finally` paths attempt dependent cleanup in the required order; thrown transaction callbacks remain rollback signals. | Lifecycle/HOF result; vault health/error; import/server cleanup | Calling composition or vault owner, with Prisma enforcing transaction outcome | Error classification, value-safe logging, key/buffer zeroization |
| `DS-012` | Package metadata resolves published 1.0.9 and its existing Prisma 5.22 peer. Runtime source imports its public lifecycle, BaseRepository, and HOF directly; no local source/link/fallback participates. | Manifest/lock; installed package; runtime imports | Workspace package manager and library public API | Integrity, build/type resolution, docs |

## Spine Actors / Main-Line Nodes

- `AppConfig`/`ApplicationDatabaseLocation`: canonical database identity.
- `startConfiguredServer` and Fastify onClose: normal process lifecycle composition.
- `repository_prisma` lifecycle/HOF/BaseRepository: shared client, transaction context,
  and model repository capability.
- Default agent-run event pipeline and `TokenUsageEventPersistenceProcessor`: token
  scheduling and pending-work lifecycle.
- `TokenUsageLedgerStore` and `SqlTokenUsageLedgerRepository`: token persistence/query
  boundary.
- `SecretVaultRuntime`, `SecretVaultBootstrap`, and `SecretManagementService`: vault
  runtime/state/security owners.
- `SecretVaultRepository`: cross-model vault persistence coordinator.
- Secret entry and metadata model repositories: one-model CRUD/mapping owners.
- Import service/inspection/execution factory: explicit target preview/execution owner.
- Prisma 5.22/SQLite: physical queries, transaction enforcement, and storage.

## Ownership Map

| Main-Line Node | Owns |
| --- | --- |
| `AppConfig` / database location | Select/canonicalize one application SQLite URL/path/root-key path. It does not construct Prisma clients. |
| Server composition | Startup/shutdown sequencing, explicit lifecycle target, dependent-work close order, and process-level failure boundary. |
| repository-prisma lifecycle | Sole normal runtime raw root client, datasource identity/readiness, current-owner forwarding, and shutdown. |
| Token persistence processor | Non-blocking scheduling, pending task set, failure warning, quiesce/drain, and resettable stopped state. It does not map or query rows. |
| Token ledger repository | TokenUsageLedgerEvent model selection, query/write arguments, idempotency recovery, and Prisma/domain mapping. It owns no client lifecycle. |
| Token store/providers | Existing display capture, summary/statistics orchestration, hierarchy/pricing semantics. They own no Prisma concern. |
| Secret runtime | Service availability and root-key/service close lifecycle after bootstrap. It owns no database client. |
| Secret bootstrap | DB/key pair initialization/verification state machine and fail-closed health. |
| Secret management service | Authorization, encryption/decryption, value zeroization, vault health, and value-free operation events. |
| Vault persistence coordinator | Cross-model sequencing, transaction options, batch counts, domain recheck, receipt ownership, compensation match/delete policy. |
| Secret entry model repository | SecretEntry model identity, row/encrypted-record mapping, and entry CRUD. |
| Secret metadata model repository | SecretEncryptionMetadata model identity, singleton validation/mapping, domain identity read, and metadata create. |
| Import execution composition | Exact explicit target migration/init/use/cleanup. Preview inspection remains a different read-only owner. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `repository_prisma` package exports | Library lifecycle/context/BaseRepository owners | Stable public dependency boundary | AppConfig selection, server policy, local timeout implementation |
| `SecretVaultRuntime.requireService/getHealth` | Runtime service/bootstrap state | Process-local availability facade | Prisma client, transaction, model delegate |
| `SecretVaultRepository` single-entry methods | Entry/metadata model repositories, with coordinator governing cross-model work | Stable persistence boundary for service/bootstrap | Raw client lifecycle or tx propagation |
| Import `ExecutionRuntime` wrapper | Runtime + repository-prisma cleanup sequence | Let service guarantee cleanup in `finally` | Alternate target selection or preview writes |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `TokenUsagePrismaClientOwner` and singleton | Shared lifecycle owns normal root client | repository-prisma + server composition | `In This Change` | Delete, no fallback |
| Token repository `PrismaClient` constructor/getter | BaseRepository resolves ALS/root delegate | `SqlTokenUsageLedgerRepository extends BaseRepository` | `In This Change` | Update callers/tests; no injected raw seam |
| Secret runtime `prisma` field/factory/disconnect | DB lifecycle is process composition responsibility | server/import execution + repository-prisma | `In This Change` | Runtime keeps service/key lifecycle |
| Coordinator raw-client constructor and direct model delegates | Model repos and ALS provide delegates | two model repositories + HOF | `In This Change` | Coordinator remains |
| `VaultTransactionClient`, locked adapter object, `*From/*With`, tx method parameters | ALS makes transaction context implicit | `runInTransaction` + ordinary repo methods | `In This Change` | No transaction prop drilling |
| Untracked fire-and-forget scheduling | Explicit shutdown requires dependent-work ownership | processor pending task set + default pipeline stop | `In This Change` | Normal path stays non-blocking |
| Server `repository_prisma@1.0.8` resolution | Missing required public API | published `1.0.9` | `In This Change` | No simultaneous lock entries |
| Docs saying package is infrastructure-only | No longer true | updated runtime architecture docs | `In This Change` | Preserve history only in archived ticket evidence |
| Bounded migration clients / read-only inspection | Still necessary for different owners | Existing files | `Follow-up` | Explicitly retained, not legacy fallback |

## Return Or Event Spine(s) (If Applicable)

`Token event pipeline -> schedule tracked append -> immediate pipeline return; append
success settles silently OR append failure emits the existing warning and settles ->
shutdown drain observes completion without rethrowing into streaming.`

`Vault callback success -> Prisma commit -> coordinator result/receipt/count -> service
value-free success event -> caller.`

`Vault callback failure -> Prisma rollback -> coordinator rejection -> service
value-free failed event / bootstrap health classification -> caller; encrypted/plaintext
buffers follow existing zeroization.`

`Server/import close -> nested finalizers -> token tasks settled -> key zeroized ->
shared client disconnected -> close fulfills/rejects through existing Fastify/signal
handling.`

## Bounded Local / Internal Spines (If Applicable)

### Token scheduled persistence

- Parent owner: `TokenUsageEventPersistenceProcessor`.
- Chain: `process enriched event -> create/track scheduled task -> setImmediate ->
  store append -> catch/warn -> task settle/remove`; close is `mark closed -> await
  snapshot/all pending until empty -> fulfill`.
- Why it matters: normal events remain non-blocking while shared-client shutdown cannot
  race already accepted work or permit a later lazy rebind.

### Vault initialization transaction

- Parent owner: `SecretVaultRepository` serving `SecretVaultBootstrap`.
- Chain: `withInitializationLock -> runInTransaction(options 2s/10s) -> operation(this)
  -> metadata read + entry count + optional metadata create through ALS -> commit/rollback`.
- Why it matters: it preserves serialized first initialization and byte-stable
  established verification without a tx adapter or no-op write.

### Vault mutation transaction

- Parent owner: `SecretVaultRepository`.
- Chain: `save/create-missing/compensate -> runInTransaction(options 2s/5s) -> metadata
  domain read -> ordered entry repo operations -> counts/receipt or throw -> commit/rollback`.
- Why it matters: cross-model invariants stay in one coordinator while each model repo
  remains singular.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Prisma/domain token mapping | `DS-003`, `DS-005` | Token model repository/store | Preserve JSON/date/semantic/price field transformations | Rows and domain events have different shapes | Moving mapping into lifecycle/store would mix persistence or domain orchestration |
| Token display capture/backfill | `DS-003`, `DS-005` | Token store | Existing best-effort display enrichment | Separate runtime metadata concern | Repository would absorb agent/team lookup policy |
| Pending task tracking | `DS-003`, `DS-004`, `DS-002` | Token processor | Own scheduled/in-flight append lifecycle | Required only because persistence is deliberately non-blocking | Server composition would retain individual work promises |
| Vault persistence DTOs | `DS-006`–`DS-008` | Service/bootstrap/coordinator/model repos | Tight encrypted entry, metadata/domain identity, batch result shapes | Avoid mixed-level type imports and duplicate shapes | Generic bag or parallel DTOs could drift/security-expand |
| Root-key file and crypto | `DS-006`, `DS-007` | Bootstrap/service | Existing key custody/verifier/AES policy | Security-specific independent owners | Model repositories would see plaintext/key policy |
| Import inspection | `DS-009` | Import service | Read-only classify target before confirmation | Preview cannot initialize/write | Reusing runtime repository would violate dry-run |
| App-data-migration raw clients | `DS-001` | Migration runner | Historical/raw SQL transitions | Different schema/transition boundary | Forcing through current model repos would leak old schema into runtime |
| Package resolution | `DS-012` | Runtime composition/repos | Normal registry dependency and peer compatibility | Makes released API available | Local link/patch would create non-deliverable behavior |
| Docs and structural scans | all | Review/delivery | Explain active ownership and prove obsolete paths removed | Refactor behavior is intentionally mostly invisible | Runtime code should not contain compatibility assertions |

## Ownership Boundaries

`startConfiguredServer` and the import execution factory are the only normal production
owners allowed to initialize/shut down repository-prisma. They supply an already
authoritative URL; the library must not select another application target.

The package's `BaseRepository`/HOF/lifecycle surfaces encapsulate raw root and
transaction client selection. Runtime model repositories call inherited CRUD and do
not construct, receive, retain, disconnect, or propagate clients.

`SecretManagementService` depends only on the vault coordinator boundary and
persistence-owned DTOs. It cannot call entry/metadata repositories. The coordinator
may call both model repositories and is the sole owner of cross-model transactions and
receipts. Model repositories never call each other or implement domain/security policy.

The default event-pipeline composition owns the token processor instance, its
stop/drain lifecycle, the stopped sentinel retained throughout server close, and the
separate explicit test-lifecycle reset. Server composition calls only the pipeline
stop boundary, not the processor's pending set or reset hook.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Server/import composition lifecycle | repository-prisma initialize/shutdown sequencing | Normal process entrypoints | Repository/runtime constructs `PrismaClient` | Add needed lifecycle step at composition root |
| `SqlTokenUsageLedgerRepository` | Token model delegate and mapping | Token store | Store/provider uses `rootPrismaClient` or custom factory | Add a subject-specific repository method |
| Default pipeline stop boundary | Token processor closed state/pending promises | Server shutdown | Server inspects/awaits processor internals | Strengthen `stopDefaultAgentRunEventPipeline()` |
| `SecretVaultRepository` | Entry/metadata repos, HOF calls, receipts, compensation | Bootstrap and secret service | Service calls model repos or `runInTransaction` directly | Add a vault persistence operation |
| Entry/metadata model repositories | BaseRepository delegate and row mapping | Vault coordinator only | Coordinator uses direct Prisma model delegates | Add a tight model method |
| Import service preview | Read-only inspection | CLI dry-run | Preview initializes repository-prisma/runtime | Extend inspection result only if approved |

## Dependency Rules

- Server composition may depend on AppConfig, repository-prisma lifecycle, default
  pipeline stop, and vault runtime; those owners must not depend back on server runtime.
- Token processor -> store -> token model repository -> BaseRepository -> current
  ALS/root client. No lower node may depend on processor/provider/GraphQL.
- Secret service/bootstrap -> vault coordinator -> model repositories ->
  BaseRepository. Service/bootstrap may use persistence DTOs but not model repo classes.
- Vault coordinator alone may import `runInTransaction`; entry/metadata repos do not
  open transactions.
- Model repositories may import Prisma model/row types and BaseRepository; they may not
  import AppConfig, client factory, runtime, service, crypto, or root-key code.
- Import preview may depend on inspection only. Execution may depend on migrations,
  repository-prisma lifecycle, and vault runtime for its immutable target.
- `createConfiguredPrismaClient` remains available only to bounded migration owners in
  this scope; token/secret runtime folders must have no import.
- Forbidden: raw/injected runtime clients, transaction delegate parameters, direct
  `$transaction`, local repository-prisma wrapper, package patch/link/vendor, WAL
  enablement, schema/data changes, or restored file-backed repositories.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `initializePrisma({ datasourceUrl })` / `shutdownPrisma()` | One process root client | Bind/close exact canonical target | One non-empty canonical SQLite URL | Called only by normal server/import execution roots; WAL omitted |
| `stopDefaultAgentRunEventPipeline()` | Default processor composition | Quiesce/drain token persistence and retain the stopped composition | Process singleton, no selector | Idempotent; no pending collection or reset exposed |
| `TokenUsageEventPersistenceProcessor.close()` | Accepted token append work | Stop scheduling and await accepted tasks | Processor instance | Internal to default pipeline composition |
| `SqlTokenUsageLedgerRepository` methods | `TokenUsageLedgerEvent` | Append/update/query/map one model | Usage/idempotency IDs; explicit run/team/period inputs | No client constructor |
| `SecretEntryRepository` methods | `SecretEntry` | Entry CRUD and row mapping | Branded `SecretId` or `EncryptedSecretEntryRecord` | Internal to coordinator |
| `SecretEncryptionMetadataRepository` methods | Metadata singleton/domain | Singleton validation/read/create/domain identity | Fixed singleton `1`; no caller-provided selector | Internal to coordinator |
| `SecretVaultRepository.withInitializationLock` | Vault initialization persistence scope | One optioned outer transaction and initialization repository view | Callback only | Passes coordinator boundary, not tx |
| Coordinator single/batch/compensation methods | Vault persistence | Cross-model sequencing and atomicity | `SecretId`, encrypted records, domain identity, opaque receipt | Existing service/bootstrap boundary |
| `SecretVaultRuntime.initialize(location)` | Vault service/key lifecycle | Bootstrap against already-initialized repository client | One immutable `ApplicationDatabaseLocation` | Does not initialize/disconnect Prisma |
| Import execution runtime factory | One CLI execution target | Migrate/init/runtime/cleanup | Immutable target location | Preview never invokes |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Process lifecycle | `Yes` | `Yes` | `Low` | Use exact canonical URL once |
| Default pipeline stop | `Yes` | `Yes` | `Low` | No generic processor selector |
| Token repository | `Yes` | `Yes` | `Low` | Keep subject-specific method inputs |
| Entry repository | `Yes` | `Yes` | `Low` | Branded secret identity |
| Metadata repository | `Yes` | `Yes` | `Low` | Fixed singleton, no arbitrary ID |
| Vault coordinator | `Yes` | `Yes` | `Low` | Keep initialization, single-entry, batch, and receipt methods explicit |
| Import execution factory | `Yes` | `Yes` | `Low` | Accept immutable target, no ambient fallback |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Token model repository | `SqlTokenUsageLedgerRepository` | `Yes` | `Low` | Retain established name |
| Token processor stop | `stopDefaultAgentRunEventPipeline` | `Yes` | `Low` | Names the composition lifecycle, not a generic shutdown helper |
| Vault coordinator | `SecretVaultRepository` | `Yes` | `Low` | Rename from the provider-specific current name; document its cross-model responsibility |
| Entry model owner | `SecretEntryRepository` | `Yes` | `Low` | Add |
| Metadata model owner | `SecretEncryptionMetadataRepository` | `Yes` | `Low` | Add |
| Shared DTOs | `secret-vault-persistence-types.ts` | `Yes` | `Low` | Keep only pure vault persistence contract types |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Root Prisma lifecycle/readiness | repository_prisma 1.0.9 | `Reuse` | Already owns exact target, client, forwarding, shutdown | N/A |
| Model CRUD/context routing | BaseRepository | `Reuse` | Historical and current intended pattern | N/A |
| Optioned implicit transaction | `runInTransaction` 1.0.9 | `Reuse` | Preserves timeouts without tx propagation | N/A |
| Server lifecycle sequencing | `server-runtime.ts` | `Extend` | Existing normal process composition owner | N/A |
| Token pending-work close | Default pipeline/processor | `Extend` | Scheduling already lives there; server should not own task details | N/A |
| Vault cross-model policy | Existing vault persistence boundary, target `SecretVaultRepository` | `Extend/Retighten` | Current authoritative persistence contract and receipts remain valid; the provider-specific name does not | N/A |
| Per-model secret CRUD | Secret persistence subsystem | `Create New` | No existing one-model owner; current file mixes both models | BaseRepository is reused underneath; two files are needed because model subjects differ |
| Import target lifecycle | Existing execution factory | `Extend` | Already owns exact migration/runtime/close path | N/A |
| Preview inspection | `SecretVaultInspectionService` | `Reuse` | Deliberately read-only and target-specific | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server configuration/composition | Canonical target and normal lifecycle order | `DS-001`, `DS-002` | Server process | `Extend` | No lifecycle wrapper file |
| Token event processing | Non-blocking scheduling and drain | `DS-003`, `DS-004`, `DS-002` | Default event pipeline | `Extend` | Pending state stays inside processor |
| Token usage persistence | One-model mapping/query/idempotency | `DS-003`, `DS-005` | Token store/providers | `Extend` | BaseRepository replaces client owner |
| Secret persistence | Pure DTOs, two model repos, one coordinator | `DS-006`–`DS-008` | Bootstrap/service | `Extend/Create New` | Folder gains readable model/coordinator depth |
| Secret runtime/security | Bootstrap/service/key lifecycle | `DS-006`, `DS-007` | Vault runtime/service | `Retighten` | Remove only DB lifecycle |
| Import provisioning | Preview/execution target lifecycle | `DS-009`, `DS-010` | Operator command | `Extend` | Preview and execution remain separated |
| Package/docs | 1.0.9 resolution and active architecture | `DS-012` | Runtime/build/maintainers | `Extend` | No library source change |
| App-data migrations | Historical/raw transition DB access | `DS-001` | Migration runner | `Reuse` | Explicitly excluded from runtime repo conversion |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `server-runtime.ts` | Server composition | Process lifecycle | Explicit init, ordered finalization | Existing startup/shutdown owner | Library lifecycle |
| `default-agent-run-event-pipeline.ts` | Token processing composition | Default pipeline | Construct, stop/drain, retain stopped sentinel, and expose separate explicit test reset | Existing processor composition owner | Processor close |
| `token-usage-event-persistence-processor.ts` | Token processing | Pending work owner | Schedule/track/warn/drain | One bounded async lifecycle | Token store |
| `token-usage-ledger-repository.ts` | Token persistence | Token model repo | Mapping, CRUD/query/idempotency | One model and its repository contract | BaseRepository |
| `secret-vault-persistence-types.ts` | Secret persistence | Vault persistence boundary | Pure shared encrypted/metadata/domain/batch shapes | Used across four persistence callers without lower-level bypass | N/A |
| `secret-entry-repository.ts` | Secret persistence | Entry model repo | Entry mapping/CRUD | One Prisma model | BaseRepository + DTO |
| `secret-encryption-metadata-repository.ts` | Secret persistence | Metadata model repo | Singleton/domain mapping/CRUD | One Prisma model/invariant | BaseRepository + DTO |
| `secret-vault-repository.ts` | Secret persistence | Coordinator | Transactions, sequencing, receipts, compensation | Cross-model invariants are cohesive here | Two model repos + DTOs + HOF |
| `secret-vault-runtime.ts` | Secret runtime | Service/key lifecycle | Construct/bootstrap/hold/close service only | Existing runtime owner | Coordinator |
| `secret-vault-bootstrap.ts` / service | Secret runtime/security | Existing owners | Import relocated DTOs; behavior unchanged | No new responsibility | Persistence DTOs/coordinator |
| `local-environment-secret-import-service.ts` | Import provisioning | Execution composition | Exact target init/runtime/finally close | Existing execution factory | Library lifecycle |
| package/lock/docs | Package/docs | Build/maintainer contract | 1.0.9 and active architecture | Existing authorities | Published package |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Metadata, domain identity, encrypted entry, batch result DTOs | `secret-vault-persistence-types.ts` | Secret persistence | Bootstrap/service/coordinator/model repos share these value-only contracts | `Yes` | `Yes` | Generic secret backend DTO, plaintext shape, Prisma row union |
| Initialization/mutation option values | Module constants in coordinator | Secret persistence | Several transaction methods share reviewed 2s/5s values; initialization remains distinct 2s/10s | `Yes` | `Yes` | Application deadline/retry policy or separate config service |
| Pending token task lifecycle | Keep inside processor | Token processing | Only one owner uses it | `Yes` | `Yes` | Generic async task manager |
| Canonical database identity | Existing `ApplicationDatabaseLocation` | Configuration | Server/import/vault already share exact URL/path/key | `Yes` | `Yes` | New selector or repository config |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `SecretVaultMetadataRecord` | `Yes` | `Yes` | `Low` | Preserve exact encrypted metadata fields |
| `SecretVaultDomainIdentity` | `Yes` | `Yes` | `Low` | Define as the exact metadata ID/version subset |
| `EncryptedSecretEntryRecord` | `Yes` | `Yes` | `Low` | No plaintext, timestamps, or duplicate string ID |
| `SecretVaultBatchResult` | `Yes` | `Yes` | `Low` | Keep three existing counts only |
| `RunInTransactionOptions` | `Yes` | `Yes` | `Low` | Reuse published type; no server-local equivalent |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/server-runtime.ts` | Server composition | Process lifecycle | Explicit init and nested-finalizer shutdown order | Current server composition authority | repository-prisma lifecycle; default pipeline stop |
| `.../events/default-agent-run-event-pipeline.ts` | Event composition | Default pipeline lifecycle | Cache processor/pipeline; idempotent stop/drain; durable stopped sentinel; explicit test reset | Composition already lives here | Processor |
| `.../token-usage-event-persistence-processor.ts` | Event processing | Pending token work | Non-blocking tracked schedule, warning, close | One bounded local lifecycle | Store |
| `.../token-usage-ledger-repository.ts` | Token persistence | Token model repo | Existing mapping/query/idempotency via inherited CRUD | One model repository | BaseRepository |
| `.../persistence/secret-vault-persistence-types.ts` | Secret persistence | Boundary DTOs | Four tight pure types | Prevents mixed-level imports | N/A |
| `.../persistence/secret-entry-repository.ts` | Secret persistence | Entry model repo | Entry CRUD/row mapping | One model | BaseRepository + DTOs |
| `.../persistence/secret-encryption-metadata-repository.ts` | Secret persistence | Metadata model repo | Singleton/domain reads and create/mapping | One model/invariant | BaseRepository + DTOs |
| `.../persistence/secret-vault-repository.ts` | Secret persistence | Coordinator | Delegate to model repos; optioned transactions; receipts/compensation | One cross-model persistence owner | HOF/model repos/DTOs |
| `.../bootstrap/secret-vault-bootstrap.ts` | Secret bootstrap | DB/key state machine | Type import alignment only; behavior unchanged | Existing state-machine owner | Coordinator/DTO |
| `.../services/secret-management-service.ts` | Secret service | Security/domain boundary | Type import alignment only; behavior unchanged | Existing owner | Coordinator/DTO |
| `.../secret-vault-runtime.ts` | Secret runtime | Service/key lifecycle | No-client coordinator/bootstrap/service construction and close | One process-local vault runtime | Coordinator |
| `.../local-environment-secret-import-service.ts` | Import provisioning | Execution lifecycle | Exact target init and cleanup; preview unchanged | Existing execution boundary | repository-prisma/runtime |
| `autobyteus-server-ts/package.json`, root `pnpm-lock.yaml` | Package | Dependency contract | Resolve 1.0.9 only | Existing manifest/lock owners | Published package |
| `autobyteus-server-ts/README.md`, `docs/ARCHITECTURE.md`, `docs/modules/{token_usage,secret_management}.md`, startup design doc as applicable | Documentation | Active architecture | Shared lifecycle/repository/HOF/shutdown description | Existing durable docs | Canonical design |

## Applied Patterns (If Any)

- **Repository pattern:** One model-specific repository extends
  `BaseRepository.forModel(...)`; stores/services use subject methods rather than
  Prisma clients/delegates.
- **Implicit Unit of Work:** Coordinator opens `runInTransaction`; ALS lets each model
  repository join the same Prisma transaction.
- **Composition-root lifecycle:** Normal process entry/exit supplies and closes one
  explicit database target.
- **Coordinator over model repositories:** Cross-model vault invariants stay in one
  persistence owner; model files remain singular.
- **Tracked fire-and-forget:** Normal token persistence returns immediately but the
  owner retains a completion handle for graceful shutdown.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/server-runtime.ts` | `File` | Server composition | Process init/close sequencing | Existing real entry lifecycle | Model queries, tx policy, client factory |
| `src/agent-execution/events/default-agent-run-event-pipeline.ts` | `File` | Default pipeline composition | Processor construction, stop/drain, stopped sentinel, explicit test reset | Already owns cached processor graph | Pending task internals |
| `src/agent-execution/events/processors/token-usage/token-usage-event-persistence-processor.ts` | `File` | Token persistence scheduling | Track accepted work and drain | Existing scheduler owner | Prisma/client lifecycle or row mapping |
| `src/token-usage/repositories/sql/token-usage-ledger-repository.ts` | `File` | Token model repository | Model mapping/query/idempotency | Established persistence folder/model subject | Raw client/factory/shutdown |
| `src/secret-management/persistence/` | `Folder` | Vault persistence subsystem | Boundary DTOs, model repos, coordinator | Two-model structural depth warrants explicit files | Crypto, root key, AppConfig, preview |
| `src/secret-management/persistence/secret-vault-persistence-types.ts` | `File` | Persistence contract | Pure value shapes | Shared above/below coordinator | PrismaClient, methods, plaintext |
| `src/secret-management/persistence/secret-entry-repository.ts` | `File` | Entry model repo | Entry mapping/CRUD | One model subject | Transactions, metadata, receipts |
| `src/secret-management/persistence/secret-encryption-metadata-repository.ts` | `File` | Metadata model repo | Singleton/domain mapping/CRUD | One model subject | Entry CRUD, transactions |
| `src/secret-management/persistence/secret-vault-repository.ts` | `File` | Vault coordinator | Cross-model transactions/receipts | Existing service/bootstrap persistence boundary | Raw client/tx parameters/security crypto |
| `src/secret-management/secret-vault-runtime.ts` | `File` | Vault runtime | Service/key lifecycle | Existing runtime owner | Prisma lifecycle |
| `src/secret-management/provisioning/local-environment-secret-import-service.ts` | `File` | Import execution composition | Exact target init/use/finally close | Existing preview/execution owner | Ambient/AppConfig target fallback |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/token-usage/repositories/sql` | `Persistence-Provider` | `Yes` | `Low` | One model repo remains compact enough; mapping is model persistence behavior |
| `src/secret-management/persistence` | `Persistence-Provider` | `Yes` | `Low` | Two model owners plus one real coordinator and shared DTO contract justify four files |
| `src/agent-execution/events` | `Main-Line Domain-Control` | `Yes` | `Low` | Pipeline composition owns processor lifecycle; processor folder owns scheduling |
| `src/secret-management/provisioning` | `Main-Line Domain-Control` | `Yes` | `Low` | Preview/execution orchestration already belongs here |
| `src/config` / app-data migrations | `Mixed Justified` | `Yes` | `Low` | Canonical target/factory retained for separate migration owners; runtime repos no longer import it |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Token repository | `class Sql... extends BaseRepository.forModel(Prisma.ModelName.TokenUsageLedgerEvent) { return this.findMany(args) }` | Constructor accepts `PrismaClient` or calls configured factory | Restores intended repository ownership |
| Vault transaction | `runInTransaction(() => metadataRepo...; entryRepo..., MUTATION_OPTIONS)` | `$transaction(tx => helper(tx))` or direct `tx.secretEntry` | Proves implicit same-client composition |
| Lifecycle | `migrate -> initializePrisma(exact URL) -> use -> drain/key close -> shutdownPrisma` | Lazy first query plus per-capability disconnect | Makes one target/owner explicit |
| Token async close | Processor tracks the entire scheduled+append promise and `close()` awaits it | Bare `setImmediate` or server retains callbacks | Preserves non-blocking behavior without post-close reopen |
| Import preview | Inspection only | Initialize library “just in case” | Preserves dry-run non-mutation |

Token repository shape:

```ts
export class SqlTokenUsageLedgerRepository extends BaseRepository.forModel(
  Prisma.ModelName.TokenUsageLedgerEvent,
) {
  async listEventsByRunId(runId: string): Promise<TokenUsageUpdatedPayload[]> {
    const records = await this.findMany({
      where: { runId },
      orderBy: [{ observedAt: "asc" }, { id: "asc" }],
    });
    return records.map(toDomainPayload);
  }
}
```

Vault coordinator shape:

```ts
const INITIALIZATION_TRANSACTION_OPTIONS = {
  maxWait: 2_000,
  timeout: 10_000,
} satisfies RunInTransactionOptions;

async withInitializationLock<T>(
  operation: (repository: SecretVaultInitializationRepository) => Promise<T>,
): Promise<T> {
  return runInTransaction(
    () => operation(this),
    INITIALIZATION_TRANSACTION_OPTIONS,
  );
}
```

Shutdown shape:

```ts
try {
  await stopOtherDependentRuntimes();
} finally {
  try {
    await stopDefaultAgentRunEventPipeline();
  } finally {
    try {
      await getSecretVaultRuntime().close();
    } finally {
      await shutdownPrisma();
    }
  }
}
```

This is sequencing guidance, not a requirement to create a generic shutdown helper.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep raw clients as fallback if library is uninitialized | Could reduce composition edits | `Rejected` | Explicitly initialize in server/import execution; remove fallback |
| Retain optional Prisma client constructors for tests | Existing tests use them | `Rejected` | Tests bind repository-prisma to isolated targets; production classes have one path |
| Keep direct `$transaction` only for vault timeouts | 1.0.8 lacked options | `Rejected` | Consume published 1.0.9 HOF |
| Add server-local repository_prisma wrapper | Could centralize imports | `Rejected` | Composition imports public library directly; no empty facade |
| Resolve both 1.0.8 and 1.0.9 | Could leave stale transitive lock state | `Rejected` | Normal manifest/lock resolves 1.0.9 for server |
| Convert migration raw clients too | Might look globally uniform | `Rejected` for this scope | Retain bounded historical/raw-SQL owners; not a compatibility path |
| Keep or alias secret `*PrismaRepository` names | Could reduce import churn | `Rejected` | Rename all three secret repositories to domain-subject names and update callers/docs directly |
| Preserve token/service public outcomes | Active approved behavior, not legacy | `N/A` | Keep existing stores/services/queries and mappings |

## Derived Layering (If Useful)

`Process composition -> domain/store/service owner -> subject repository/coordinator ->
model BaseRepository -> repository_prisma current ALS/root client -> Prisma 5.22 ->
canonical SQLite`

For the secret vault, the coordinator is an additional persistence-control layer:
`SecretManagementService -> SecretVaultRepository -> Entry/Metadata
BaseRepositories`. It exists because cross-model atomicity and receipts are real, not
as a generic pass-through.

## Change / Refactor Sequence

1. Update the server manifest/lock to normal published `repository_prisma@1.0.9` and
   verify one server resolution with the unchanged Prisma 5.22 peer.
2. Convert the token ledger repository to BaseRepository and delete its custom/injected
   client ownership. Do not alter mapping/query/domain behavior.
3. Add processor pending-work tracking and default pipeline stop/drain with a stopped
   sentinel retained for the rest of server close. Keep reset behind a separate
   explicit lifecycle-owned test hook. Wire the close order before shared lifecycle
   shutdown.
4. Add the persistence DTO file and the two secret model repositories.
5. Rewrite the existing vault coordinator to compose model repos and published
   `runInTransaction` options. Remove all raw client/tx paths in the same change; do not
   leave a dual route.
6. Retighten runtime/bootstrap/service imports; remove DB lifecycle from the vault
   runtime without changing service/key behavior.
7. Add explicit server initialization after schema migration and before vault
   bootstrap. Ensure nested finalizers always attempt token drain, key close, and
   library shutdown.
8. Change importer execution composition to exact-target initialize/runtime/finally
   shutdown; keep preview untouched.
9. Remove obsolete imports/types/helpers and scan token/secret runtime source for raw
   clients, direct model delegates, direct `$transaction`, and transaction parameters.
   Confirm bounded migration/inspection exceptions are the only intended direct DB
   paths.
10. Update active docs and dependency statements. Do not change schema/migrations.
11. Run implementation-scoped type/build checks and prepare the implementation
    handoff. Source review precedes API/E2E coverage investigation; downstream
    API/E2E owns durable test validity/changes and broad execution.

No temporary compatibility wrapper, local package link, or data migration is allowed.

## Key Tradeoffs

- One process-wide library client removes duplicate lifecycle code and enables implicit
  transactions, but tests and alternate entrypoints must explicitly initialize and
  shut it down in sequence.
- Splitting the 310-line vault repository adds files, but it gives each Prisma model
  one owner while preserving one meaningful cross-model coordinator.
- Tracking scheduled token work adds bounded state to the processor. Waiting in the
  normal event path would be simpler but would violate the approved non-blocking
  behavior; leaving tasks untracked would make clean shared shutdown impossible.
- Renaming the coordinator and model repositories adds bounded import/file churn, but
  removes a persistence-provider detail from domain repository identity. This follows
  the historical service-to-repository pattern and makes the coordinator's post-refactor
  name accurate; no aliases dilute the correction.
- App-data-migration clients remain explicit. Forcing historical/raw SQL through
  current model repositories would broaden this refactor and weaken current-schema
  boundaries.
- A persistence DTO file is justified because four owners share the exact value
  contract. Extracting transaction options or pending tasks into generic helpers is
  rejected as empty/generalized indirection.

## Risks

- Incorrect shutdown tracking could wait only in-flight DB promises but miss callbacks
  still queued in `setImmediate`. The tracked promise must cover scheduling through
  settlement, and close must be idempotent.
- Closing the global client before all accepted work settles can lose a token write or
  cause a late lazy rebind. Ordering and executable shutdown evidence are mandatory.
- repository_prisma lifecycle state is process-global. Tests using multiple temporary
  databases must await `shutdownPrisma()` before rebinding and must not run those
  fixtures concurrently.
- Secret initialization concurrency/byte stability is security-sensitive. Preserve
  exact outer options, avoid lock writes/WAL, and keep prior live initializer/restart
  coverage valid.
- A model repository method could accidentally bypass BaseRepository by capturing
  `rootPrismaClient` or a delegate. Source review must verify inherited per-call access.
- Import execution could accidentally use ambient `DATABASE_URL` if the explicit
  `datasourceUrl` is omitted. The immutable request target must be passed directly.
- App-data migrations use separate clients while the shared runtime client is ready,
  as secret runtime already does today. No new concurrency or migration behavior is
  intended; broad execution must confirm no regression.
- The latest token safe-integer behavior is adjacent to persistence. Its durable
  provider/GraphQL coverage must remain valid.
- Updating the lockfile can pull unrelated package changes if not scoped. Inspect the
  dependency diff and exact integrity/resolution.

## Implementation Readiness (Mandatory)

- Status: `Implementation Ready`
- Approved use-case and behavior-map coverage: `Pass` — `UC-001`–`UC-010` are covered
  by `BEH-001`–`BEH-006`; no file-backed or migration-only repository use case was
  invented.
- Production-path and data-flow-spine coverage for every mapped use case and behavior:
  `Pass` — `DS-001`–`DS-012` cover normal server startup/shutdown, token write/return/read,
  vault bootstrap/runtime/transaction, importer preview/execution, and normal package
  consumption through meaningful outcomes.
- Complete shared-design-principles validation: `Pass` — the design starts from
  approved behavior/current paths, restores explicit owners, keeps off-spine mapping,
  crypto, inspection, and migration concerns bounded, reuses the published subsystem,
  introduces only tight model/type structures, forbids bypass/dual paths, makes
  removal and no-migration decisions explicit, and maps files after ownership.
- Corrections made and affected checks repeated: The latest base's safe-integer token
  behavior was added to the preserved contract. Architecture-level shutdown tracing
  exposed the reachable scheduled-token-append/shared-client race; `REQ-002`,
  `AC-002`, investigation evidence, premises, spines, ownership, file mapping, sequence,
  and risks were corrected to require bounded quiesce/drain and a durable stopped
  composition. The user's naming correction removed the `Prisma` provider suffix from
  the vault coordinator and both secret model repositories. Behavior, reachability,
  spine span, ownership, naming, dependency, interface, removal, data transition, and
  proportionality checks were then repeated.
- Remaining non-blocking risks: Global lifecycle test serialization, exact token drain
  implementation, preserved SQLite initializer behavior, and scoped lockfile update;
  each has an explicit owner and downstream evidence requirement.
- Blocking requirement, evidence, or design gaps: `None`

## Guidance For Implementation

- Work only in
  `/Users/normy/autobyteus_org/autobyteus-worktrees/prisma-repository-adoption-token-stats-secret-store`
  on `codex/prisma-repository-adoption-token-stats-secret-store`.
- Consume published `repository_prisma@1.0.9`; do not edit the library repository or
  create a local link/patch/wrapper.
- Use `Prisma.ModelName` with BaseRepository and inherited CRUD methods. Do not capture
  `delegate` across calls; per-call resolution is what allows ALS/root routing.
- Keep token mappings byte/field/order equivalent. Do not combine this work with
  accounting, safe-integer, pricing, projection, or GraphQL changes.
- The processor's tracked promise must begin before `setImmediate` is queued and settle
  only after append success/failure handling. `close()` must stop new scheduling,
  await every accepted task, and be safe when called repeatedly. Retain the stopped
  default composition for the rest of server shutdown; only a separate explicit
  lifecycle-owned test hook may reset it after drain.
- Keep server shutdown ordering robust with nested `finally` blocks; shared Prisma
  shutdown must still be attempted after earlier dependent close failures, but never
  before token drain/key close are attempted.
- Put only pure value types in `secret-vault-persistence-types.ts`. Keep receipt
  behavior/WeakMap in the coordinator.
- Use `SecretVaultRepository`, `SecretEntryRepository`, and
  `SecretEncryptionMetadataRepository` with matching non-`prisma` filenames. Do not
  retain old-name aliases or re-export shims.
- Model repositories own model CRUD/mapping only. Coordinator owns all transactions,
  domain recheck, counts, receipt ownership, and compensation comparisons.
- Use typed module constants satisfying `RunInTransactionOptions` for `2s/10s` and
  `2s/5s`. Do not add local timers, retry, savepoints, or nested transactions.
- `SecretVaultRuntime.initialize(location)` assumes composition initialized the package;
  it still needs `location` for DB identity/root-key bootstrap. It must not call
  initialize/shutdown itself.
- Import preview must not import/call lifecycle indirectly. Execution passes
  `targetLocation.databaseUrl` explicitly and uses nested cleanup so runtime close and
  `shutdownPrisma()` are attempted on success/failure.
- Retain `createConfiguredPrismaClient` for bounded app-data-migration files and retain
  `SecretVaultInspectionService`; do not indiscriminately convert all direct DB access.
- Do not modify Prisma schema/migrations or enable WAL. Do not log URLs, paths, key
  bytes, ciphertext, raw causes, or secret values.
- Run implementation-scoped typecheck/build and focused local checks permitted by the
  implementation role. Record exact commands/results in `implementation-handoff.md`;
  do not claim API/E2E coverage. The later API/E2E stage owns durable test
  investigation, environment setup, broad execution, and test-code changes.
