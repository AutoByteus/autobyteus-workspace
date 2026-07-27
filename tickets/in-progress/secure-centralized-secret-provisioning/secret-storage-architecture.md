# Secret Vault Architecture — One Database, Provider-Owned Resolution

## Artifact Metadata

| Field | Value |
|---|---|
| Status | `Design-ready for architecture review — custom-provider-v1 migration/delete-and-reconfigure reset included` |
| Purpose | Visualize the clean target boundaries, fixed custom-provider-v1 transition, and data-flow spines |
| Related requirements | `REQ-001`–`REQ-018` |
| Related acceptance criteria | `AC-001`–`AC-015` |
| Approval applicability | `N/A` for additional user behavior; diagrams express the current user-review basis including non-blocking custom-provider reset |

The normative behavior lives in [requirements.md](./requirements.md), the detailed design in [design-spec.md](./design-spec.md), and the persistence/crypto rules in [encrypted-secret-vault-contract.md](./encrypted-secret-vault-contract.md). The only historical credential-bearing app-data transition is defined by [custom-provider-v1-migration-contract.md](./custom-provider-v1-migration-contract.md).

## 1. System Boundary

```mermaid
flowchart LR
  subgraph Runtime[One AutoByteus server process]
    Config[AppConfig]
    Migration[Prisma migrations]
    Vault[SecretVaultRuntime]
    AppMigration[AppDataMigrationRunner<br/>custom-provider v1 boundary]
    API[GraphQL / HTTP]
    ProviderOwner[LlmProviderService]
    Catalog[ModelCatalogService]
    Providers[Concrete LLM / media / search clients]
  end

  DB[(Application SQLite DB\nordinary tables + secret tables)]
  Key[(DB-adjacent root key\n<db>.secret.key)]
  External[Provider APIs]

  Config -->|canonical DATABASE_URL| Migration
  Migration --> DB
  Migration --> Vault
  Vault --> DB
  Vault --> Key
  Vault --> AppMigration
  AppMigration --> API
  API --> ProviderOwner
  ProviderOwner --> Catalog
  ProviderOwner --> Vault
  API --> Vault
  Providers --> Vault
  Providers --> External
```

There is no second Store database, Store configuration file, backend selector, access mode, or default/E2E Store target.

## 2. Startup And Pair State

```mermaid
sequenceDiagram
  participant Entry as Server / CLI entry
  participant Config as AppConfig
  participant Loc as ApplicationDatabaseLocation
  participant Mig as Migration runner
  participant Boot as SecretVaultBootstrap
  participant DB as Application DB
  participant Key as Root-key sidecar
  participant DataMig as App-data migrations
  participant API as API runtime

  Entry->>Config: load approved non-secret configuration
  Config->>Loc: canonicalize DATABASE_URL once
  Loc-->>Entry: canonical URL + DB path + derived key path
  Entry->>Mig: migrate(canonical URL)
  Mig->>DB: apply ordinary Prisma migrations
  Mig-->>Entry: schema current
  Entry->>Boot: initializeOrVerify(location)
  Boot->>DB: read metadata existence + entry count
  Boot->>Key: lstat/owner/permission/read or exclusive create
  Boot->>DB: create or verify encryption-domain metadata
  Boot-->>Entry: READY or stable value-free degraded health
  Entry->>DataMig: run pending fixed app-data transitions
  DataMig-->>Entry: succeeded, warning, or failed without startup abort
  Entry->>API: expose catalog/control plane
```

Startup ordering is mandatory: migrate the application schema, bootstrap/verify the vault, run the registered custom-provider-v1 app-data migration, then expose normal provider consumers. An established DB/key mismatch is closed; bootstrap never generates a replacement over established encrypted state. App-data migration failure does not abort startup or built-in Settings.

## 3. Database And Root-Key Ownership

```mermaid
flowchart TB
  URL[DATABASE_URL]
  Location[ApplicationDatabaseLocation]
  AppTables[(Existing application tables)]
  Entries[(secret_entries)]
  Meta[(secret_encryption_metadata)]
  Key[application.db.secret.key]

  URL --> Location
  Location --> AppTables
  Location --> Entries
  Location --> Meta
  Location --> Key

  Meta -->|domain ID + verifier| Pair{Verified pair}
  Key -->|32 random bytes| Pair
  Pair --> Entries
```

- `secret_entries` owns repeated encrypted values.
- `secret_encryption_metadata` owns singleton encryption-domain/key verification state.
- DB and key are backed up/restored together.
- Key bytes are not committed, put in the DB, or passed through `DATABASE_URL`.

## 4. Provider-Owned Point-Of-Use Resolution

```mermaid
flowchart LR
  Request[Agent / media / search request]
  Factory[Existing factory + model/config]
  Client[Concrete provider client]
  Port[ProviderApiKeyResolver port]
  Adapter[Server subject-scoped adapter]
  Service[SecretManagementService]
  Repo[SecretVaultPrismaRepository]
  Crypto[SecretVaultCrypto]
  SDK[Provider SDK]

  Request --> Factory
  Factory --> Client
  Client -->|lazy resolve provider + slot| Port
  Port --> Adapter
  Adapter --> Service
  Service --> Repo
  Service --> Crypto
  Service -->|SecretValue| Adapter
  Adapter --> Port
  Port --> Client
  Client -->|reveal exactly here| SDK
```

Models do not contain authentication requirements, credential provider IDs, secret IDs, status, or resolved values. Ordinary factory construction remains `model, config, apiKeyResolver`.

## 5. Provider-Centric API-Key Settings Read

```mermaid
flowchart TB
  UI[API Key Settings]
  Query[One providerSettings query]
  Owner[LlmProviderService]
  Directory[Canonical provider directory and configured fact]
  LLM[Existing LLM catalog]
  Audio[Existing audio catalog]
  Image[Existing image catalog]
  Video[Existing video catalog]
  Group[One ProviderSettingsGroup per provider]
  OtherUI[Selectors defaults history workspace]
  ExistingAPI[Established catalog queries]

  UI --> Query
  Query --> Owner
  Owner --> Directory
  Owner --> LLM
  Owner --> Audio
  Owner --> Image
  Owner --> Video
  Directory --> Group
  LLM --> Group
  Audio --> Group
  Image --> Group
  Video --> Group
  Group --> UI
  OtherUI --> ExistingAPI
  ExistingAPI --> LLM
  ExistingAPI --> Audio
  ExistingAPI --> Image
  ExistingAPI --> Video
```

The read emits `ProviderSettingsGroup { provider, llmModels, audioModels, imageModels, videoModels }`. `provider` reuses `LlmProviderObject`; each list reuses `ModelDetail`. The service joins only exact canonical provider IDs and computes one provider-owned `apiKeyConfigured` fact per provider (exact vault slot for ordinary providers; established any-complete-option aggregate for Gemini). Model rows cannot create providers or contribute configured state. A capability with no models is `[]`, and missing credentials never remove models.

The API-key GraphQL selection requests only provider/model fields the page renders. Existing richer type fields remain available to established catalog consumers through their current queries. No reduced provider/model DTO family, capability availability wrapper, `CredentialStatusObject`, instruction protocol, four-array client merge, or parallel credential map exists.

## 6. Explicit Gemini Configuration

```mermaid
flowchart TB
  UI[Gemini Settings]
  Save[Save option]
  Activate[Use this mode]
  Remove[Remove option]
  ConfigService[GeminiConfigurationService]
  AppConfig[AppConfig\nGEMINI_SETUP_MODE + project/location]
  Vault[SecretManagementService\nAI Studio / Vertex Express slots]
  RuntimeResolver[GeminiRuntimeResolver function]
  Client[Gemini LLM/media client]
  KeyResolver[ProviderApiKeyResolver]
  SDK[GoogleGenAI]

  UI --> Save
  UI --> Activate
  UI --> Remove
  Save --> ConfigService
  Activate --> ConfigService
  Remove --> ConfigService
  ConfigService --> AppConfig
  ConfigService --> Vault

  Client --> RuntimeResolver
  RuntimeResolver --> ConfigService
  Client -->|only selected API-key slot| KeyResolver
  Client --> SDK
```

### Exact selected-mode branches

```mermaid
flowchart LR
  Mode{GEMINI_SETUP_MODE}
  AI[AI_STUDIO]
  VX[VERTEX_EXPRESS]
  VP[VERTEX_PROJECT]
  Missing[Absent / invalid / incomplete]

  AI --> AKey[resolve Google AI Studio slot]
  AKey --> AClient[GoogleGenAI apiKey]

  VX --> VKey[resolve Google Vertex Express slot]
  VKey --> VClient[GoogleGenAI vertexai true + apiKey]

  VP --> PConfig[read project + location]
  PConfig --> PClient[GoogleGenAI vertexai true + project + location]

  Missing --> Closed[GEMINI_RUNTIME_UNCONFIGURED]
```

No key-presence priority, save-order selection, alternate-key retry, or implicit fallback exists. `Save only` does not activate. Removal of the active option clears mode and never selects another.

## 7. Gemini Metadata

```mermaid
flowchart TB
  Curated[Curated Gemini model catalog]
  Mode[Explicit active-mode projection]
  Strategy{Metadata strategy}
  Live[Gemini Developer API models.list\nAI Studio key only]
  Merge[Metadata resolver]
  Output[Models + provenance]

  Curated --> Merge
  Mode --> Strategy
  Strategy -->|AI Studio| Live
  Live -->|success| Merge
  Live -->|failure| Merge
  Strategy -->|Vertex Express / Vertex Project / none| Merge
  Merge --> Output
```

- AI Studio success: `LIVE`.
- AI Studio provider failure: `CURATED_FALLBACK`.
- Vertex Express/Project/no selection: `CURATED_ONLY` and no live metadata credential use.

## 8. Provider Settings Lifecycle

```mermaid
sequenceDiagram
  participant UI as Provider editor
  participant GQL as GraphQL resolver
  participant Owner as LlmProviderService
  participant Secret as SecretManagementService
  participant DB as Application DB

  UI->>GQL: save/replace credential input
  GQL->>Owner: provider-specific command
  Owner->>Secret: saveForConsumer(subject, value)
  Secret->>DB: encrypted upsert transaction
  DB-->>Secret: committed
  Secret-->>Owner: CONFIGURED
  Owner-->>GQL: Boolean command completion
  GQL-->>UI: true
  UI->>GQL: refetch providerSettings
  GQL->>Owner: listProviderSettings
  Owner-->>GQL: authoritative provider group
  GQL-->>UI: authoritative configured state

  UI->>GQL: remove
  GQL->>Owner: provider-specific remove
  Owner->>Secret: idempotent removeForConsumer
  Secret->>DB: delete exact secret_id
  Secret-->>Owner: MISSING
  Owner-->>GQL: Boolean command completion
  GQL-->>UI: true
  UI->>GQL: refetch providerSettings
  GQL->>Owner: listProviderSettings
  Owner-->>GQL: authoritative provider group
  GQL-->>UI: authoritative configured state
```

Provider-specific APIs never provide a readback mutation/query. The only plaintext input is write-only and short-lived.

The caller already owns the provider ID, so Save/Remove does not echo it. Its Boolean means command completion; canonical configured state comes from the subsequent provider-row refetch. Custom Probe/Create accepts exactly name, base URL, and transient key; it carries no constant provider type/runtime. Probe returns only discovered `{id,name}` models, Create only the assigned ID, and Delete only success. Gemini Query/Save/Use/Save-and-use/Remove all return one authoritative setup state rather than a parallel operation/outcome protocol.

## 9. Custom Provider V1 Migration And Reset

```mermaid
flowchart TB
  Start[Post-vault AppDataMigrationRunner]
  Lock[Lock fixed custom provider path]
  Inspect{Canonical file state}
  Noop[Absent or current v2<br/>no-op success]
  Validate[Parse and validate complete v1<br/>inside migration boundary only]
  Stage[Stage complete secret-free v2<br/>owner-only same directory]
  Missing{Every derived custom SecretId missing}
  Batch[Create-only encrypted batch<br/>one DB transaction]
  Publish[Atomic publish of staged v2]
  Ready[Current v2 runtime<br/>legacy providers preserved]
  Reset[Delete canonical v1<br/>create no backup copy]
  Empty[Missing or empty current-v2 semantics]
  Settings[Built-ins and New Provider remain usable]
  Fail[Deletion unavailable<br/>omit custom rows and record failed status]

  Start --> Lock
  Lock --> Inspect
  Inspect -->|absent or v2| Noop
  Inspect -->|v1| Validate
  Validate -->|valid| Stage
  Validate -->|invalid| Reset
  Stage --> Missing
  Missing -->|yes| Batch
  Missing -->|collision| Reset
  Batch -->|committed| Publish
  Batch -->|rolled back| Reset
  Publish -->|success| Ready
  Publish -->|same-process failure| Reset
  Reset -->|deletion succeeds| Empty
  Empty --> Settings
  Reset -->|deletion unavailable| Fail
  Fail --> Settings
```

The migration is all-or-nothing for preservation. It never overwrites, compares, uses, or deletes a current vault credential, and it never publishes a subset of v1 providers. Same-process file-publication failure may compensate only the exact unchanged encrypted rows inserted by the just-completed batch. After a power loss between DB commit and file publish, the next run treats configured target IDs as a collision, deletes the legacy file, and returns to frontend reconfiguration rather than guessing ownership.

The normal `CustomLlmProviderStore` reads/writes only v2; a missing current file means empty. No backup/recovery copy is created. `providerSettings` contains custom listing failure as an empty custom-provider contribution, so built-in providers/catalogs and **New Provider** remain visible in every migration outcome. When deletion succeeds, New Provider can immediately create a fresh v2 configuration; when deletion itself is unavailable, custom creation waits for filesystem repair and restart while the rest of Settings remains usable.

## 10. Explicit Importer

```mermaid
flowchart LR
  Command[pnpm secrets:import\nabsolute source + absolute DB URL]
  Location[ApplicationDatabaseLocation\nexplicit URL only]
  Reader[Trusted assignment-file reader]
  Registry[Positive alias registry]
  Inspect[SecretVaultInspectionService\nread-only target classification]
  Plan[Target state + observed status\nplanned action + counts]
  DryRun[Dry-run result\nno mutation]
  Confirm[Direct TTY confirmation]
  Bootstrap[Execution-only\nmigration + vault bootstrap]
  Batch[SecretManagementService.saveBatch]
  Tx[Recheck existence + one Prisma transaction]
  Result[Actual counts + SecretIds only]

  Command --> Location
  Command --> Reader
  Reader --> Registry
  Location --> Inspect
  Registry -->|populated recognized only| Inspect
  Inspect --> Plan
  Plan -->|dry-run| DryRun
  Plan -->|execute| Confirm
  Confirm --> Bootstrap
  Bootstrap --> Batch
  Batch --> Tx
  Tx --> Result
```

- empty recognized assignments are absent;
- unrecognized assignments are outside scope and do not block;
- the source remains byte-identical;
- target derives only from required `--database-url`; AppConfig, `.env`, `.env.test`, parent variables, current working directory, and source-file `DATABASE_URL` have no importer target authority;
- missing, duplicate, relative, malformed, or non-SQLite database URLs fail before target access;
- dry-run never creates or opens-for-write the DB, never migrates/bootstraps, and never creates/modifies the key, metadata, settings, or permissions;
- absent/pre-feature targets are `INITIALIZATION_REQUIRED`; complete verifier-confirmed targets are `READY`; partial/unsafe/incompatible/unverifiable targets are closed and `BLOCKED`;
- preview reports target identity/state, each `SecretId`, observed status, planned action, and counts;
- execution alone performs migration/bootstrap and rechecks status in the write transaction, so no-overwrite remains safe if state changes after preview;
- default is no replacement; overwrite is explicit.

`SecretVaultInspectionService` is an internal import-preview boundary, not an access-mode/profile:

| Target observed without mutation | Preview |
|---|---|
| DB/key absent, pre-feature DB with no secret artifacts, or complete migrated secret tables with zero metadata/entries and either no key or one valid secure interrupted-initialization key | `INITIALIZATION_REQUIRED`, every ID `MISSING/CREATE` |
| Complete current tables/metadata plus secure key and valid verifier | `READY`, exact `MISSING\|CONFIGURED` and `CREATE\|SKIP_CONFIGURED\|REPLACE` |
| Partial pair, incomplete/unsupported schema, unsafe key, verifier failure, or read failure | Exact closed state, every ID `UNAVAILABLE/BLOCKED`, no confirmation |

The normal execution owner, not the inspector, is allowed to migrate/bootstrap and write.

## 11. Test Configuration And Real E2E

```mermaid
flowchart TB
  Env[immutable autobyteus-server-ts/.env.test\nlaunch-only DATABASE_URL + host]
  Bootstrap[TestRuntimeBootstrap\nmaterialize fixed keys into ignored app-data/.env]
  Runner[Unchanged actual built server\nreads only --data-dir/.env]
  Client[Normal frontend/API or backend-E2E runner]
  DB[(Ignored disposable test DB)]
  Key[(Ignored derived test key)]
  RuntimeEnv[(Ignored writable runtime .env\nGemini mode/project/location)]
  Scenarios[Scenario registry in test code]
  Import[UI / importer with explicit absolute DB URL]
  Providers[Real provider calls]
  Evidence[Value-free reports/scanner]

  Env --> Bootstrap
  Bootstrap --> RuntimeEnv
  Bootstrap --> Runner
  RuntimeEnv --> Runner
  Client --> Runner
  Runner --> DB
  Runner --> Key
  Scenarios --> Client
  Import --> DB
  Client --> Providers
  Providers --> Evidence
```

Models, expected capabilities, required-definition assertions, and scenario modes are test code, not launch configuration. The tracked `.env.test` remains byte-identical and is read only by backend-test tooling. The bootstrap canonicalizes the DB URL, materializes/reconciles fixed keys into the ordinary ignored writable runtime `.env`, and starts the unchanged actual built server rather than a harness-only Store. The server remains unaware of `.env.test`. The importer also remains unaware of it: importing into the test DB requires passing that DB’s canonical absolute URL explicitly. Mutable Gemini settings are applied through normal Settings/API commands. Deterministic backend E2E uses fresh roots/DBs; manual and real-provider E2E use the explicit persistent isolated test root. Direct, Electron, Docker/Pod, and packaged-server paths retain their normal `.env`/deployment configuration.

## 12. Runtime Exceptions And Child Boundary

```mermaid
flowchart TB
  ClaudeCli[Claude cli]
  ClaudeManaged[Claude managed-secret]
  Codex[Codex App Server]
  Governed[Governed tool/app/MCP children]
  Vault[Secret vault]
  Empty[Empty-base allowlisted env]
  Home[Established real home/login state]

  ClaudeCli --> Home
  Codex --> Home
  ClaudeManaged --> Vault
  ClaudeManaged --> Empty
  Governed --> Empty
```

- Claude CLI and Codex retain their approved external local account behavior.
- Claude managed mode resolves only Anthropic and delivers it only to the exact child.
- Governed children receive no credential aliases, `DATABASE_URL`, DB/key paths, or root key.
- Assurance is `LOCAL_HARDENED`; strong agent isolation remains deferred.

## 13. Electron / Direct / Docker Lifecycle

```mermaid
flowchart LR
  Electron[Electron]
  Direct[Direct server]
  Docker[Existing Docker / one Pod]
  Config[Canonical DATABASE_URL]
  DBKey[(DB + derived key pair)]
  Runtime[Same migration + vault runtime]
  Logs[Value-safe health / technical details / log path]

  Electron --> Config
  Direct --> Config
  Docker --> Config
  Config --> DBKey
  DBKey --> Runtime
  Runtime --> Logs
```

No new service, volume, Store mount, or secret replica topology is added. Packaged validation must launch the actual candidate with an isolated app root and ports and clean only that root.

## Boundary Review Checklist

- [x] One physical database identity: canonical SQLite URL; running apps receive it as `DATABASE_URL`, importer receives it as required `--database-url`.
- [x] Two purpose-specific vault tables in that database.
- [x] One derived external key file.
- [x] Application-schema migration precedes vault bootstrap; the custom-provider app-data migration runs after vault bootstrap and before provider consumers.
- [x] Fixed custom-provider-v1 migration is all-or-nothing, collision-safe, current-v2-only at runtime, and non-blocking for built-ins/New Provider.
- [x] Catalog path has no mandatory vault edge.
- [x] API-key configured/write decisions are minimal screen fields; catalog DTOs carry no credential state.
- [x] Providers resolve at point of use through a core-owned port.
- [x] Gemini non-secret selection has its own narrow resolver function.
- [x] Model definitions carry no credential concern.
- [x] Importer targets only the explicitly supplied canonical database.
- [x] Tests use the normal lifecycle with scenarios in code.
- [x] Claude/Codex exceptions remain explicit.
- [x] Docker topology remains unchanged.
