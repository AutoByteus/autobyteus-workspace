# Use-Case Spine Validation — Clean-State One-Database Vault

## Artifact Metadata

| Field | Value |
|---|---|
| Status | `Design-ready for architecture review — custom-provider-v1 migration/delete-and-reconfigure reset included` |
| Purpose | Prove every approved use case, behavior, requirement, and acceptance criterion has a complete target data-flow spine and governing owner |
| Authority | [requirements.md](./requirements.md), [design-spec.md](./design-spec.md) |
| Approval applicability | `N/A` for additional user behavior; validates the reopened custom-provider transition against the requirements/design package |

The persisted custom-provider transition spines are constrained by [custom-provider-v1-migration-contract.md](./custom-provider-v1-migration-contract.md).

This file replaces all earlier incremental spine audits. Historical spine IDs and conclusions are not active.

## Validation Method

A primary spine is complete when it has:

1. a supported trigger;
2. at least one governing application/runtime owner;
3. the main domain transitions;
4. the authoritative persistence or external boundary when applicable;
5. an observable result;
6. an explicit return/error spine;
7. bounded-local loops extracted when they have their own invariants.

API-key-screen grouping, model catalogs, credential custody, runtime selection, and model invocation are separate concerns. The API-key read reuses the established provider/model contracts but gives provider identity and configured state one authoritative occurrence. GraphQL selection sets keep page payloads tight, while existing catalog consumers retain their established queries. Shared types are reused only where field meanings remain identical.

## Complete Spine Inventory

### Primary end-to-end spines (32)

| Spine | UC | BEH | Main line | Governing owner | Result |
|---|---|---|---|---|---|
| `DS-UC001` | UC-001 | BEH-002–004 | process -> AppConfig location -> migration -> vault bootstrap -> routes | `SecretVaultRuntime` | Ready or value-free degraded API |
| `DS-UC002` | UC-002 | BEH-001 | API-key Settings -> one `providerSettings` query -> `LlmProviderService.listProviderSettings()` -> one canonical provider + four existing model lists -> UI | `LlmProviderService` | Existing contracts reorganized with one provider/configured authority |
| `DS-UC003A` | UC-003 | BEH-004 | editor -> provider mutation -> secret service -> Prisma vault row | Provider service | Saved/replaced/removed status, never value |
| `DS-UC003B` | UC-003 | BEH-004 | Boolean command completion -> network-only `providerSettings` refetch -> exact provider group -> UI | Provider credential owner + `LlmProviderService` | `apiKeyConfigured` changes only on the addressed provider |
| `DS-UC004A` | UC-004 | BEH-005 | agent -> LLM factory -> concrete client -> resolver -> SDK | Concrete LLM client | LLM response/stream |
| `DS-UC004B` | UC-004 | BEH-005 | media tool -> media factory -> concrete client -> resolver -> SDK | Concrete media client | Audio/image/video result |
| `DS-UC004C` | UC-004 | BEH-005 | search tool -> search adapter -> secret service -> provider | Search adapter | Search result |
| `DS-UC005A` | UC-005 | BEH-006 | Gemini editor -> save option -> secret/non-secret owner -> authoritative setup state | `GeminiConfigurationService` | Option configured, active mode unchanged |
| `DS-UC005B` | UC-005 | BEH-006 | Use this mode -> validate option -> persist mode -> project status | `GeminiConfigurationService` | Exact active mode |
| `DS-UC005C` | UC-005 | BEH-006 | remove option -> clear active if same -> remove chosen data -> status | `GeminiConfigurationService` | Removed option; no implicit replacement |
| `DS-UC006` | UC-006 | BEH-007 | catalog -> selected metadata strategy -> optional live call -> merge/provenance | `ModelMetadataProvisioningService` | Models plus honest provenance |
| `DS-UC007A` | UC-007 | BEH-008 | create custom provider -> metadata + secret -> catalog sync | `LlmProviderService` | Current provider available |
| `DS-UC007B` | UC-007 | BEH-008 | custom catalog -> concrete endpoint client -> resolver -> endpoint | Custom runtime owner | Discovered model response |
| `DS-UC007C` | UC-007 | BEH-008 | delete -> metadata/secret compensation -> catalog sync | `LlmProviderService` | Idempotent absence |
| `DS-UC007D` | UC-007 | BEH-008 | existing-user startup -> app-data runner -> fixed v1 migration -> staged v2 + create-only vault batch -> publish or delete v1 -> current Settings/Create | `CustomProviderV1AppDataMigration` | Preserved providers, or empty custom state plus usable reconfiguration without blocking built-ins |
| `DS-UC008A` | UC-008 | BEH-009 | import CLI + required absolute DB URL -> canonical location -> trusted reader -> registry -> inspector read-only target classification -> preview | Import service + `ApplicationDatabaseLocation` + `SecretVaultInspectionService` | Explicit target/IDs/status/actions/counts with zero mutation |
| `DS-UC008B` | UC-008 | BEH-009 | exact URL-derived plan -> TTY target confirmation -> execution-only migration/bootstrap -> transactional target/status recheck -> conditional batch | Import service + normal vault/secret service | Atomic authoritative explicit-DB result |
| `DS-UC008C` | UC-008,010 | BEH-009,011 | generic import command + explicit canonical test DB URL -> reject AppConfig/ambient/template/source target influence -> normal inspector/import -> test DB | `ApplicationDatabaseLocation` + normal import services | Test DB import uses the same one command and identical preview/write semantics with no wrapper/profile/target fork |
| `DS-UC009` | UC-009 | BEH-010 | upgrade/start -> non-secret projection -> normal runtime | `AppConfig` | Legacy values untouched and ignored |
| `DS-UC010A` | UC-010 | BEH-011 | backend-E2E command -> bootstrap reads `.env.test` -> fresh root/runtime `.env` -> unchanged actual server -> API assertions -> cleanup | Backend-E2E runner + `TestRuntimeBootstrap` | Conventional backend test configuration and deterministic isolation |
| `DS-UC010B` | UC-010 | BEH-011 | `server:test`/`dev:test` -> bootstrap reads `.env.test` -> persistent isolated runtime `.env` -> unchanged actual server + frontend -> Settings/API | `TestRuntimeBootstrap` | Manual full-stack validation with mutable Settings persistence |
| `DS-UC011` | UC-011 | BEH-011 | real runner -> same bootstrap and actual server/API -> same test DB/key -> preflight -> provider operations -> evidence -> cleanup | Real-E2E runner | Sanitized real-provider evidence without a harness-only Store |
| `DS-UC012A` | UC-012 | BEH-012 | Claude cli selection -> external local account state -> CLI | Claude runtime owner | Claude response; zero vault lookup |
| `DS-UC012B` | UC-012 | BEH-012 | managed selection -> Anthropic resolve -> exact child env -> SDK | Claude managed launch owner | Claude response or stable auth failure |
| `DS-UC013` | UC-013 | BEH-013 | Codex selection -> unchanged App Server launch/login state | Codex client manager | Codex response |
| `DS-UC014` | UC-014 | BEH-014 | governed request -> policy -> empty-base/allowlist env + roots -> child | Governed launcher | Constrained child result |
| `DS-UC015A` | UC-015 | BEH-015 | Settings/reload -> hosts -> AutoByteus resolver -> discovery -> sync | Remote discovery owner | Remote catalog/status |
| `DS-UC015B` | UC-015 | BEH-015 | selected remote model/media -> concrete client -> resolver -> endpoint | AutoByteus client | Remote result or exact unavailable status |
| `DS-UC016A` | UC-016 | BEH-002,003,017 | Electron/direct start -> DB/key -> runtime -> restart | Server runtime | Healthy persisted application |
| `DS-UC016B` | UC-016 | BEH-002,003,017 | Docker/Pod -> existing volume -> DB/key -> restart | Existing deployment owner | Healthy persisted deployment |
| `DS-UC017` | UC-017 | BEH-016 | frozen install -> ESM/CJS probe -> build/restart tests | Package/test owner | Exact safe 1.0.8 evidence |
| `DS-UC018` | UC-018 | BEH-001,004,017 | packaged app isolated launch -> health -> Settings -> synthetic CRUD -> restart -> cleanup | Packaged smoke runner | User-realistic verified candidate |

### Return/event spines (4)

| Spine | Parent | Flow | Invariant |
|---|---|---|---|
| `DS-R001` | UC-002,003,005 | configured/list outcomes -> minimal read -> one provider row -> GraphQL/web | No secret value; absent credentials do not erase models; every successful response carries all four non-null lists and uses `[]` when a provider has no matching models. |
| `DS-R002` | UC-001,004,007,008,012,015 | vault/provider failure -> stable mapper -> caller | No raw crypto/DB/provider cause or fallback. |
| `DS-R003` | UC-006 | live/curated metadata outcome -> provenance -> API/UI | `LIVE`, `CURATED_FALLBACK`, and `CURATED_ONLY` stay distinguishable. |
| `DS-R004` | UC-016,018 | embedded server output/exit -> Electron logger/status -> technical details | Value-safe code/message/log path; no value or DB/key bytes. |

### Bounded-local spines (7)

| Spine | Parent | Local loop | Governing owner |
|---|---|---|---|
| `DS-L001` | UC-001,008,010,016,018 | raw `DATABASE_URL` -> validate -> canonical URL/path -> derived key path | `ApplicationDatabaseLocation` |
| `DS-L002` | UC-001,016 | inspect DB metadata/entry count/key -> initialize or verify -> health | `SecretVaultBootstrap` |
| `DS-L003` | UC-003,004,007,008,012,015 | authorize -> SecretId -> derive/encrypt/decrypt -> clear -> trusted value | `SecretManagementService` |
| `DS-L004` | UC-008 | trusted source -> recognize -> empty/unrecognized skip -> validate/conflict -> plan | Import service |
| `DS-L005` | UC-005,006 | explicit mode -> runtime selection -> selected slot/config -> SDK/metadata strategy | Gemini configuration + client helper |
| `DS-L006` | UC-007 | metadata/secret partial outcome -> compensate/retry -> current state | `LlmProviderService` |
| `DS-L007` | UC-007 | lock fixed path -> validate complete v1 -> require every target missing -> stage v2 -> atomic encrypted batch -> publish; else exact compensation and delete v1 | `CustomProviderV1AppDataMigration` |

**Inventory total: 43 active spines.**

## Node-Count And Ownership Validation

| Spine group | Typical main-line node count | Thin facade separated from owner? | Bounded loops extracted? | Verdict |
|---|---:|---|---|---|
| Startup/vault | 6–8 | Yes | DS-L001–003 | Pass |
| API-key read/catalog | 5–7 | Yes | Configured/list return DS-R001 | Pass |
| Provider invocation | 6–9 | Yes | Secret use DS-L003 | Pass |
| Gemini | 6–10 | Yes | DS-L005 | Pass |
| Custom provider | 6–10 | Yes | DS-L006–007 | Pass |
| Import/test | 6–10 | Yes | DS-L004 | Pass |
| Specialized runtimes | 5–8 | Yes | Existing runtime-local owners retained | Pass |
| Packaged/deployment | 6–10 | Yes | DB location + logs return extracted | Pass |

No primary spine is represented by a generic `Manager -> Service -> Handler` chain. Every main-line node has a concrete domain or platform responsibility.

## Per-Use-Case Coverage

### UC-001 — One-database startup and vault lifecycle

```text
process entry
 -> AppConfig.getOperationalDatabaseLocation()
 -> runMigrations(canonicalDatabaseUrl)
 -> SecretVaultBootstrap.initializeOrVerify(location)
 -> SecretVaultRuntime(service, health)
 -> HTTP/GraphQL exposure
 -> READY or value-free degraded control plane
```

- Spines: `DS-UC001`, `DS-L001`, `DS-L002`, `DS-L003`, `DS-R002`.
- Requirements: `REQ-002`–`REQ-006`, `REQ-015`.
- Acceptance: `AC-002`–`AC-004`, `AC-011`.
- Ownership result: migration owns schema; bootstrap owns DB/key pair state; service owns values.

### UC-002 — API-key screen and catalog independence

```text
API-key Settings
 -> one providerSettings(runtimeKind) GraphQL query
 -> LlmProviderService.listProviderSettings(runtimeKind)
 -> canonical provider directory + one exact apiKeyConfigured fact/provider
 -> existing LLM / audio / image / video catalogs
 -> exact provider-ID grouping
 -> one ProviderSettingsGroup per provider
 -> one API-key web collection
 -> API-key UI

Existing model selector/media/default/history/workspace consumer
 -> established catalog query/store
 -> current ModelDetail data
 -> selector/runtime UI
```

The group contains one existing `LlmProviderObject` and four non-null existing `ModelDetail` lists. Its GraphQL selection set requests only fields rendered by the API-key page. `apiKeyConfigured` is computed by the exact provider owner (ordinary exact vault slot; Gemini any-complete-option aggregate) and cannot be supplied by model rows, another provider, array order, or Apollo normalization. A capability with no matching models is `[]`. Missing credentials never remove models. Existing custom-provider identity, base URL, catalog state, and model fields remain because their product consumers already use them. No replacement summary DTO, availability wrapper, vault-health object, or instruction protocol is introduced.

- Requirements: `REQ-001`, `REQ-008`.
- Acceptance: `AC-001`, `AC-015`.

### UC-003 — Provider credential lifecycle

```text
provider editor
 -> provider-specific mutation
 -> provider validation
 -> SecretManagementService.save/removeForConsumer()
 -> SecretVaultPrismaRepository transaction
 -> Boolean command completion
 -> network-only providerSettings refetch
 -> update that provider group from the canonical read
```

Failures use GraphQL errors. There is no status message/instruction protocol, parallel credential map, or cross-provider fallback.

- Spines: `DS-UC003A`, `DS-UC003B`, `DS-L003`, `DS-R001`, `DS-R002`.
- Requirements: `REQ-006`, `REQ-009`.
- Acceptance: `AC-004`.

### UC-004 — LLM/media/search invocation

Ordinary provider:

```text
runtime request
 -> model/factory config composition
 -> concrete provider(model, config, apiKeyResolver)
 -> lazy SDK initialization
 -> apiKeyResolver.resolve(provider, optionalSlot)
 -> SecretManagementService
 -> revealToTrustedConsumer() at SDK boundary
 -> provider request/response
```

Gemini adds one explicit fourth `GeminiRuntimeResolver` factory dependency. It is not a model field or a secret resolver expansion.

- Spines: `DS-UC004A`–`C`, `DS-L003`, `DS-R002`.
- Requirements: `REQ-007`–`REQ-009`.
- Acceptance: `AC-005`.

### UC-005 — Explicit Gemini configuration and activation

```text
Save only
 -> save one key or project/location option
 -> do not change GEMINI_SETUP_MODE
 -> return authoritative GeminiSetupState

Use this mode
 -> validate only selected option
 -> persist exact GEMINI_SETUP_MODE
 -> invalidate/rebuild new-client metadata state
 -> return authoritative GeminiSetupState

Remove
 -> if selected: clear mode first
 -> remove only selected option
 -> never choose another option
 -> return authoritative GeminiSetupState
```

The query and every command share the same tight state: active mode, two nullable key-configured booleans, and a nullable complete Vertex Project object. A partial compound action is derived from the returned state; there is no operation/outcome/stage/instruction DTO.

- Spines: `DS-UC005A`–`C`, `DS-L005`, `DS-R001`, `DS-R002`.
- Requirements: `REQ-009`, `REQ-010`.
- Acceptance: `AC-006`.

### UC-006 — Gemini metadata

```text
curated Gemini models
 -> read explicit selected mode
 -> AI Studio: optional Developer API list with AI Studio key
      -> LIVE or CURATED_FALLBACK
 -> Vertex Express/Project/none: no live call
      -> CURATED_ONLY
 -> catalog merge/provenance
```

- Spines: `DS-UC006`, `DS-L005`, `DS-R003`.
- Requirements: `REQ-001`, `REQ-010`.
- Acceptance: `AC-001`, `AC-006`.

### UC-007 — Custom provider

```text
existing-user startup
 -> normal Prisma migration and vault bootstrap
 -> AppDataMigrationRunner
 -> CustomProviderV1AppDataMigration locks the fixed canonical file
 -> file absent/current v2: idempotent no-op
 -> valid v1: validate complete set and preserve provider IDs/name/base URL
      -> require every derived custom SecretId MISSING
      -> stage complete secret-free v2
      -> create-only encrypted batch in one DB transaction
      -> atomically publish v2
      -> SUCCEEDED
 -> invalid/collision/stage/DB/publish/interruption:
      -> never overwrite/delete current secret or publish partial v2
      -> conditionally compensate only exact unchanged same-process inserts
      -> delete the canonical v1 file; create no backup/recovery copy
      -> establish missing/empty current-v2 semantics
      -> SUCCEEDED_WITH_WARNINGS and normal frontend reconfiguration
 -> v1 deletion unavailable:
      -> leave the physical file untouched but omit custom rows
      -> record stable FAILED outcome
 -> startup and built-in providerSettings remain available in every branch
 -> current custom providers included only from v2; New Provider remains visible
 -> after deletion succeeds, New Provider creates a fresh v2 record
 -> after deletion fails, custom creation waits for filesystem repair and restart

current create/probe/list/use/delete
 -> LlmProviderService
 -> current-v2 metadata store + SecretManagementService
 -> bounded compensation/idempotency
 -> custom catalog sync
 -> concrete endpoint client resolves custom slot at use
```

The historical v1 model exists only in the migration boundary. The normal store treats a missing current file as empty and reads/writes only v2. Probe/Create input is exactly name/base URL/transient key; Probe returns only purpose-specific `{id,name}` discovery models, Create only the assigned ID, and Delete success only. Constant provider type/runtime and echoed inputs are absent. A persisted custom-provider update command remains intentionally absent.

- Spines: `DS-UC007A`–`D`, `DS-L003`, `DS-L006`, `DS-L007`, `DS-R002`.
- Requirements: `REQ-001`–`REQ-009`, `REQ-012`, `REQ-015`, `REQ-018`.
- Acceptance: `AC-005`, `AC-008`, `AC-011`, `AC-013`–`AC-015`.

### UC-008 — Explicit assignment-file import

```text
pnpm command + absolute source
 -> required absolute SQLite --database-url
 -> ApplicationDatabaseLocation canonical target identity
 -> reject AppConfig/.env/.env.test/parent/source target influence
 -> source trust checks
 -> positive alias registry
 -> empty/unrecognized omission
 -> selected-value validation/conflict check
 -> SecretVaultInspectionService on canonical target
      -> nonexistent/pre-feature: INITIALIZATION_REQUIRED + MISSING/CREATE
      -> complete verifier-confirmed: READY + observed status/planned action
      -> partial/unsafe/incompatible/unverifiable: closed + UNAVAILABLE/BLOCKED
 -> value-free target/ID/status/action/count preview
 -> dry-run stops with no DB/key/metadata/permission mutation
 -> otherwise TTY confirmation
 -> normal migration/bootstrap only if required
 -> transactionally re-evaluate health and entry existence
 -> conditional create/skip or explicit replace
 -> value-free actual result
```

Preview is an observation, not a reservation. The transaction is authoritative: without `--overwrite`, a credential configured after preview is skipped rather than replaced; with `--overwrite`, replacement was explicit. A target that becomes closed aborts before entry mutation.

- Spines: `DS-UC008A`, `DS-UC008B`, `DS-L001`, `DS-L003`, `DS-L004`, `DS-R002`.
- Requirements: `REQ-002`, `REQ-006`, `REQ-009`, `REQ-011`.
- Acceptance: `AC-007`.

### UC-009 — Legacy-source non-authority

```text
startup with legacy .env aliases
 -> AppConfig reads approved non-secret settings only
 -> credential aliases masked/ignored
 -> no .env migration/import/scrub/rewrite/delete
 -> vault-only runtime
 -> visible reconfiguration guidance when missing
```

- Spine: `DS-UC009`.
- Requirements: `REQ-006`, `REQ-011`, `REQ-012`.
- Acceptance: `AC-008`, `AC-015`.

### UC-010 / UC-011 — Backend E2E, manual full-stack, and real-provider tests

```text
DS-UC010A deterministic backend E2E:
backend test runner explicitly reads tracked immutable .env.test
 -> TestRuntimeBootstrap validates fixed launch fields
 -> fresh ignored data root
 -> materialize canonical fixed keys into ordinary runtime .env
 -> launch unchanged actual built server with --data-dir
 -> normal migration/vault/routes
 -> normal HTTP/GraphQL assertions
 -> evidence scanner
 -> remove only fresh root

DS-UC010B manual full-stack:
server:test or dev:test explicitly reads tracked immutable .env.test
 -> persistent ignored test data root
 -> reconcile fixed keys into ordinary runtime .env
 -> preserve mutable Settings keys
 -> unchanged actual server + normal frontend
 -> Settings/API validation
 -> restart and preserve test DB/key/runtime settings

DS-UC011 real providers:
real-E2E runner explicitly reads tracked immutable .env.test
 -> persistent provisioned test data root/runtime .env
 -> unchanged actual built server and normal API
 -> scenario registry in code
 -> status-only preflight
 -> configured provider operations
 -> value-free evidence
 -> stop server without deleting user-provisioned DB/key
```

- Spines: `DS-UC010A`, `DS-UC010B`, `DS-UC011`, `DS-L001`–`004`, `DS-R002`.
- Requirements: `REQ-002`, `REQ-011`, `REQ-013`, `REQ-015`.
- Acceptance: `AC-007`, `AC-009`, `AC-011`.

### UC-012 — Claude modes

- `cli`: external local account state, zero Store lookup, no managed restrictions added.
- `managed-secret`: resolve Anthropic at use; deliver only `ANTHROPIC_API_KEY` to exact child; no fallback.
- Spines: `DS-UC012A`, `DS-UC012B`, `DS-L003`, `DS-R002`.
- Requirements: `REQ-014`; acceptance: `AC-010`.

### UC-013 — Codex

Codex keeps the reviewed-base `options.env ?? process.env`/real home behavior required for established `codex login`. It is explicitly outside the governed empty-base child claim.

- Spine: `DS-UC013`.
- Requirements: `REQ-014`; acceptance: `AC-010`.

### UC-014 — Governed children

```text
agent/tool/application child request
 -> governing launcher policy
 -> empty base + explicit allowlist + authorized server-specific env
 -> denied DB/key/journal/root paths
 -> child result
```

- Spine: `DS-UC014`; return: `DS-R002`.
- Requirements: `REQ-014`; acceptance: `AC-010`.

### UC-015 — AutoByteus remote

Discovery and invocation retain configured hosts, reload, LLM/audio/image construction, and exact endpoint-unavailable reporting. Both paths use `provider.autobyteus.api-key` at point of use; a DNS/provider failure does not invent an endpoint or erase curated/local catalogs.

- Spines: `DS-UC015A`, `DS-UC015B`, `DS-L003`, `DS-R002`.
- Requirements: `REQ-007`, `REQ-009`, `REQ-017`.
- Acceptance: `AC-005`, `AC-013`.

### UC-016 — Runtime/deployment persistence

Electron, direct server, Docker, and the existing one-Pod topology all resolve one `DATABASE_URL`; the key derives beside that database and persists on the same volume. Restart verifies rather than regenerates.

- Spines: `DS-UC016A`, `DS-UC016B`, `DS-L001`, `DS-L002`, `DS-R004`.
- Requirements: `REQ-002`–`REQ-005`, `REQ-015`.
- Acceptance: `AC-003`, `AC-011`.

### UC-017 — repository_prisma 1.0.8

Exact unpatched dependency/lock, isolated ESM/CJS import safety, default-off query logging, unchanged Prisma owners, build, and restart/reopen behavior remain the whole scope.

- Spine: `DS-UC017`.
- Requirement: `REQ-016`; acceptance: `AC-012`.

### UC-018 — Packaged Electron candidate

```text
isolated candidate identity/root/port
 -> actual packaged Electron launch
 -> embedded server health
 -> provider catalog visible with empty vault
 -> synthetic save/status/remove
 -> restart verification
 -> value-safe technical details/log path on failure
 -> cleanup only isolated root
```

- Spines: `DS-UC018`, `DS-L001`–`003`, `DS-R001`, `DS-R002`, `DS-R004`.
- Requirements: `REQ-001`, `REQ-002`, `REQ-006`, `REQ-015`, `REQ-018`.
- Acceptance: `AC-001`, `AC-014`.

## Behavior Coverage Matrix

| Behavior | Covered spines |
|---|---|
| `BEH-001` | DS-UC002, DS-UC018, DS-R001 |
| `BEH-002` | DS-UC001, DS-UC016A/B, DS-L001/L002 |
| `BEH-003` | DS-UC001, DS-UC016A/B, DS-L002/L003 |
| `BEH-004` | DS-UC003A/B, DS-UC018, DS-R001/R002, DS-L003 |
| `BEH-005` | DS-UC004A–C, DS-R002, DS-L003 |
| `BEH-006` | DS-UC005A–C, DS-R001, DS-L005 |
| `BEH-007` | DS-UC006, DS-R003, DS-L005 |
| `BEH-008` | DS-UC007A–D, DS-R002, DS-L003/L006/L007 |
| `BEH-009` | DS-UC008A/B/C, DS-R002, DS-L004 |
| `BEH-010` | DS-UC009 |
| `BEH-011` | DS-UC008C, DS-UC010A/B, DS-UC011, DS-L001–L004 |
| `BEH-012` | DS-UC012A/B, DS-R002, DS-L003 |
| `BEH-013` | DS-UC013 |
| `BEH-014` | DS-UC014 |
| `BEH-015` | DS-UC015A/B, DS-R002, DS-L003 |
| `BEH-016` | DS-UC017 |
| `BEH-017` | DS-UC016A/B, DS-UC018, DS-R004 |

## Requirement Coverage Matrix

| Requirement set | Covered spines |
|---|---|
| `REQ-001` | DS-UC002, DS-UC003B, DS-UC006, DS-UC007D, DS-UC018, DS-R001, DS-R003 |
| `REQ-002` | DS-UC001, DS-UC008B/C, DS-UC010A/B, DS-UC011, DS-UC016A/B, DS-L001/L002 |
| `REQ-003` | DS-UC001, DS-UC016A/B, DS-L002/L003 |
| `REQ-004` | DS-UC001, DS-UC003A/B, DS-UC007D, DS-UC008B, DS-L002/L003/L007 |
| `REQ-005` | DS-UC001, DS-UC003A/B, DS-UC004A–C, DS-UC007D, DS-L003/L007 |
| `REQ-006` | DS-UC003A/B, DS-UC007A/C/D, DS-UC008B, DS-L003/L006/L007 |
| `REQ-007` | DS-UC004A–C, DS-UC007B, DS-UC015A/B, DS-L003 |
| `REQ-008` | DS-UC002, DS-UC004A/B, DS-UC006, DS-UC007D, DS-UC018 |
| `REQ-009` | DS-UC004A/B, DS-UC005A–C, DS-UC007B/D, DS-UC015A/B, DS-L003/L005/L007 |
| `REQ-010` | DS-UC005A–C, DS-UC006, DS-L005, DS-R003 |
| `REQ-011` | DS-UC008A/B/C, DS-UC010A/B, DS-UC011, DS-L001/L004 |
| `REQ-012` | DS-UC007A–D, DS-UC009, DS-L003/L006/L007 |
| `REQ-013` | DS-UC008C, DS-UC009, DS-UC010A/B, DS-UC011 |
| `REQ-014` | DS-UC012A/B, DS-UC013, DS-UC014 |
| `REQ-015` | DS-UC001, DS-UC007D, DS-UC010A/B, DS-UC011, DS-UC016A/B, DS-UC018 |
| `REQ-016` | DS-UC017 |
| `REQ-017` | DS-UC015A/B |
| `REQ-018` | DS-UC007D, DS-UC018, DS-R004 |

## Acceptance-Criteria Coverage Matrix

| Acceptance criteria | Primary evidence spines |
|---|---|
| `AC-001` | DS-UC002, DS-UC006, DS-UC018 |
| `AC-002` | DS-UC001, DS-L001/L002 |
| `AC-003` | DS-UC001, DS-UC016A/B, DS-L002 |
| `AC-004` | DS-UC003A/B, DS-L003, DS-R001/R002 |
| `AC-005` | DS-UC004A–C, DS-UC007B, DS-UC015A/B |
| `AC-006` | DS-UC005A–C, DS-UC006, DS-L005, DS-R003 |
| `AC-007` | DS-UC008A/B/C, DS-L004 |
| `AC-008` | DS-UC007D, DS-UC009, DS-L007 |
| `AC-009` | DS-UC008C, DS-UC010A/B, DS-UC011, DS-L001/L002 |
| `AC-010` | DS-UC012A/B, DS-UC013/014 |
| `AC-011` | DS-UC007D, DS-UC016A/B, DS-UC018 |
| `AC-012` | DS-UC017 |
| `AC-013` | DS-UC007A–D, DS-UC015A/B, DS-L006/L007 |
| `AC-014` | DS-UC007D, DS-UC018, DS-R004 |
| `AC-015` | Removal scans around every primary spine |

## Attribute Provenance And Tightness Audit

| Shape | Fields | Source of truth | Why fields belong together | Forbidden additions |
|---|---|---|---|---|
| `ApplicationDatabaseLocation` | canonical URL, DB path, derived key path | `DATABASE_URL` + one normalization rule | One physical identity | provider, access mode, backend kind, scenario |
| `SecretEntry` | SecretId, ciphertext, nonce, authentication tag | vault repository | One encrypted record | provider/model/display/status/timestamps |
| `SecretEncryptionMetadata` | singleton ID, domain ID, verifier nonce/ciphertext/tag, format version | vault bootstrap | One DB/key domain | individual secret fields/timestamps |
| `SecretConsumerIdentity` | subject kind, provider, slot, subject-specific discriminator | server authorization boundary | Exact authorization request | model definition, backend, raw secret ID from core |
| `ProviderApiKeyResolver` | one `resolve(provider,slot?)` operation | core port | Point-of-use key capability | status, config, key bag, Store path |
| `GeminiRuntimeSelection` | mode; project/location only for project variant | `GeminiConfigurationService` | Exact non-secret selected runtime | secret/status/model fields |
| `ProviderSettingsGroup` | one `LlmProviderObject`; four `ModelDetail[]` lists | `LlmProviderService` | One API-key screen read subject | duplicate provider/status authorities, secret value/ID |
| `LlmProviderObject` | established identity/custom fields plus provider-owned `apiKeyConfigured` | provider owner | Reuse working provider contract | vault health/instruction object, model-owned credential status |
| `ModelDetail` | established model/catalog fields | catalog owner | Reuse working model contract across GraphQL selection sets | authentication/secret fields |
| Custom Probe/Create transport | input name/base URL/transient key; Probe models; Create assigned ID | custom provider owner | Only caller-entered data plus caller-unknown result | constant type/runtime, echoed input, generic provider result |
| `GeminiSetupState` | active mode, two nullable key-configured booleans, nullable complete project/location | `GeminiConfigurationService` | One query and command-result authority | operation/outcome/stage/instruction fields |
| Import request | absolute source, absolute SQLite database URL, dry-run, overwrite | CLI | Explicit operator source/target intent only | implicit/ambient target, key-path override, arbitrary secret ID |
| `ImportTargetInspection` | canonical target identity/state; ordered SecretId; observed status; planned action; counts | `SecretVaultInspectionService` | One value-free no-mutation preview result | source values, key/ciphertext, write handle, backend/access mode, ignored-line metadata |

## Design-Principle Verdict

| Principle | Result | Evidence |
|---|---|---|
| Separation of concerns | Pass | API-key screen projection, rich catalog, custody, Gemini mode, metadata, and invocation retain distinct owners. |
| Information hiding | Pass | Core sees only resolver ports; UI/GraphQL never sees values/paths. |
| Dependency inversion | Pass | Core owns `ProviderApiKeyResolver` and `GeminiRuntimeResolver`; server implements adapters. |
| Data tightness | Pass | One DB location, two purpose-specific tables, narrow unions, one provider-group composition, reused established types, tight GraphQL selections, and no model auth fields. |
| Reusability without generic machinery | Pass | Shared resolver/service/crypto are subject-specific; no backend or construction context. |
| Locality and ownership | Pass | Provider chooses its slot at SDK initialization; vault owns persistence/crypto. |
| Clean cut | Pass | Second Store, target/access modes, old IDs, implicit Gemini selection, manifest, credential-bearing catalog DTOs, parallel client maps, and cache-order workarounds are deleted without wrappers; v1 parsing exists only in the one migration boundary and never in current runtime. |
| Complete supported paths | Pass | All 18 UCs map to 32 primary, 4 return, and 7 bounded-local spines. |

## Final Validation Conclusion

The clean target has a complete data-flow spine for every current review-basis use case, including successful custom-provider preservation and non-blocking delete-and-reconfigure fallback. No active spine requires a replacement provider/model DTO family, capability availability wrapper, vault-health/instruction protocol in the API-key screen, model authentication metadata, a construction context, a second secret database, a Store target/access mode, implicit Gemini priority, or credential-dependent catalog membership.
