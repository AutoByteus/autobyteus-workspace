# Design Spec — Secure Centralized Secret Provisioning (Clean-State Architecture)

## Status

`Design-ready — user-approved for architecture review. The prior clean-state architecture remains approved, and this revision adds the observed fixed-path custom-provider-v1 migration plus availability-first delete-and-reconfigure fallback. Implementation, API/E2E, and delivery remain unauthorized until a passing architecture gate.`

This document replaces every earlier incremental design assertion. Earlier reviewer, implementation, API/E2E, delivery, and execution artifacts remain evidence only. They do not authorize a second Store, model authentication metadata, implicit Gemini selection, or any other superseded structure.

## Current-State Read

The current ticket source is useful refactor input but is not the target architecture.

1. `AppConfig` and `startup/migrations.ts` already select and migrate one SQLite application database through `DATABASE_URL`; individual application repositories create configured Prisma clients against that database.
2. Secret management currently opens a second `node:sqlite` database and key pair before application migrations. Backend-kind configuration, `READ_ONLY|READ_WRITE`, a separate schema, Store reset/provisioning services, `default|e2e` targets, and a scenario-bearing JSON manifest duplicate application-database lifecycle and operational policy.
4. The current branch already proves the narrow point-of-use `ProviderApiKeyResolver` direction for native LLM/media clients. Model construction contexts and model authentication fields are absent and must not return.
5. Provider Settings currently return four provider-with-model collections. Provider identity is repeated in LLM/audio/image/video rows; only the LLM OpenAI occurrence carries vault state, while media occurrences carry `null`. Apollo normalizes repeated `LlmProviderObject:OPENAI` objects to one cache entity, so result order can overwrite `CONFIGURED`. Direct `origin/personal` and target-source inspection shows that `LlmProviderObject` and `ModelDetail` are otherwise established working contracts. The defect is the repeated provider/configuration authority and client merge, not those types.
6. Current Gemini clients use correct Google SDK shapes, but a helper infers a mode from credential status priority. Settings also expose configured/effective state without a separate activation command. The approved target instead uses explicit `GEMINI_SETUP_MODE` and a concise configured-versus-active UI.
7. Current custom-provider v2 metadata is secret-free JSON, but the supported historical v1 fixed-path file contains plaintext keys. The current v2-only store throws `CUSTOM_PROVIDER_LEGACY_RECONFIGURATION_REQUIRED`, and `listProviderSettings()` currently allows that custom listing error to reject all built-in Settings. The repository already has a non-critical `AppDataMigrationRunner`; it is the correct historical-schema boundary, while the normal store must remain v2-only.
8. The importer parser is already recognize-first and value-safe, but its target selection has moved through separate Store targets, AppConfig, `.env.test`, and parent-process state. A real dry-run inherited a production DB when a test DB was expected. The target must be one explicit command argument rather than inferred configuration.
9. Electron already forwards embedded-server output to its application log and exposes the log path. Packaging validation did not previously run the full packaged lifecycle against isolated data/port state.

Detailed source evidence and commands are recorded in [investigation-notes.md](./investigation-notes.md). The stable approved behavior is in [requirements.md](./requirements.md).

## Intended Change

Build one clean credential-vault capability inside the existing application database:

- `DATABASE_URL` selects the only database for a process;
- every standalone import requires `--database-url <absolute-sqlite-file-url>` and uses it as its sole target authority;
- ordinary Prisma migration adds `secret_entries` and `secret_encryption_metadata`;
- one database-adjacent external root key protects those tables;
- one `SecretManagementService` owns value lifecycle and authorized reveal;
- one server adapter implements the core-owned `ProviderApiKeyResolver` port;
- concrete providers resolve at SDK/client initialization;
- catalogs and model definitions stay credential-independent;
- one `LlmProviderService.listProviderSettings(runtimeKind)` application read composes each provider exactly once with its LLM/audio/image/video models by exact provider ID;
- the API-key web store consumes one `ProviderSettingsGroup[]` directly; it reuses the existing provider/model GraphQL types and does not merge four provider arrays or maintain a second credential map;
- Gemini configuration is explicit, non-secret, and separate from key custody;
- importer, tests, Electron, direct server, Docker, and single-Pod use the same database/key lifecycle;
- one `CustomProviderV1AppDataMigration` transforms only the fixed application-owned v1 file into current v2 metadata plus an atomic create-only vault batch;
- migration failure deletes the legacy v1 file, resets only custom-provider current state, and keeps startup, built-in Settings, catalogs, and New Provider available for normal reconfiguration;
- superseded Store/backend/authentication/context/manifest machinery is deleted without wrappers.

## Relevant Behavior And Production-Path Map

| Behavior ID | Kind | Approved intent / requirements / acceptance criteria | Approved trigger or contract | Current evidence reference | Approved change or preserved outcome | Target lifecycle / spine IDs |
|---|---|---|---|---|---|---|
| `BEH-001` | User | Provider-centric API-key Settings grouping plus credential-independent catalogs; REQ-001, REQ-008; AC-001, AC-005 | Open API Settings or reload displayed models; separately open a model selector/media default | Investigation `EVID-CATALOG-001`, `EVID-PROVIDER-READ-001` | API-key screen receives each provider once with four existing model lists; existing provider/model types and other catalog-query consumers remain | `DS-UC002`, `DS-UC003B`, `DS-R001` |
| `BEH-002` | System | One database; REQ-002–REQ-003; AC-002 | Server/test/importer starts with `DATABASE_URL` | `EVID-DB-001`, `EVID-STORE-001` | Application DB owns secret tables; second Store removed | `DS-UC001`, `DS-L001`, `DS-L002` |
| `BEH-003` | System | External root key and fail-closed crypto; REQ-004–REQ-005; AC-003–AC-004 | Post-migration vault bootstrap or secret operation | `EVID-CRYPTO-001` | Preserve sound primitives, rebind them to application DB/domain/SecretId | `DS-UC001`, `DS-L002`, `DS-L003` |
| `BEH-004` | User | Write-only Settings lifecycle; REQ-006; AC-004 | Save/remove/status in provider Settings | `EVID-SETTINGS-001` | Provider-specific APIs call one service; no readback or echoed command identity | `DS-UC003A`, `DS-UC003B`, `DS-R001` |
| `BEH-005` | System | Provider-owned lazy resolution; REQ-007–REQ-008; AC-005 | LLM/media/search construction and first use | `EVID-RESOLVER-001` | Keep narrow resolver; remove all model/auth/context coupling and secret fallbacks | `DS-UC004A`–`DS-UC004C`, `DS-L003` |
| `BEH-006` | User | Explicit Gemini mode; REQ-009–REQ-010; AC-006 | Configure, activate, remove, or invoke Gemini | `EVID-GEMINI-001` | Independent options plus sole-authority `GEMINI_SETUP_MODE`; one setup-state query/command result; exact SDK shapes | `DS-UC004A`, `DS-UC004B`, `DS-UC005A`–`DS-UC005C`, `DS-L005` |
| `BEH-007` | System | Honest Gemini metadata; REQ-001, REQ-010; AC-006 | Catalog list/reload | `EVID-METADATA-001` | AI Studio live/fallback; Vertex/no mode curated-only; catalog never removed | `DS-UC006`, `DS-R003` |
| `BEH-008` | System + User | Fixed-path custom-provider-v1 preservation with availability-first delete-and-reconfigure fallback, then current create/probe/list/use/delete; REQ-001–REQ-009, REQ-012, REQ-015, REQ-018; AC-008, AC-013–AC-015 | Existing-user startup or New Provider after a failed migration | `EVID-CUSTOM-001`, `EVID-CUSTOM-MIG-001` | Isolate v1 parsing in one app-data migration; publish complete v2 plus create-only encrypted batch or delete v1 and fall back to normal frontend reconfiguration; custom failure never rejects built-ins; normal runtime stays v2-only | `DS-UC007A`–`DS-UC007D`, `DS-L006`, `DS-L007` |
| `BEH-009` | Operational | Explicit recognize-first importer; REQ-002, REQ-006, REQ-009, REQ-011; AC-007 | PNPM command with absolute source | `EVID-IMPORT-001` | Keep parser; add one service-owned non-mutating inspection path; target only selected app DB; test wrapper materializes normal runtime `.env`; remove target selector | `DS-UC008A`, `DS-UC008B`, `DS-UC008C`, `DS-L004` |
| `BEH-010` | System | No automatic arbitrary-source/`.env` update; REQ-011–REQ-012; AC-008 | Upgrade/start with legacy `.env` credentials present | `EVID-LEGACY-001` | Ignore `.env` credential values; leave bytes untouched; explicit reconfigure/import only. The fixed custom-provider-v1 app-data transition is exclusively `BEH-008`. | `DS-UC009` |
| `BEH-011` | Operational | Simple but executable backend-E2E configuration; REQ-013; AC-009 | Backend E2E, test server/frontend, or real-provider E2E start; separate explicit import | `EVID-E2E-001`, `EVID-IMPORT-001` | Actual server remains `.env`-only; test tooling reads immutable `.env.test`, materializes ignored writable runtime `.env`, and drives the actual server; scenarios live in code; importer takes the desired test DB URL explicitly and does not join the bootstrap | `DS-UC008C`, `DS-UC010A`, `DS-UC010B`, `DS-UC011` |
| `BEH-012` | User | Preserve Claude modes; REQ-014; AC-010 | Start Claude runtime in `cli` or `managed-secret` | `EVID-CLAUDE-001` | No auth redesign or cross-mode fallback | `DS-UC012A`, `DS-UC012B` |
| `BEH-013` | User | Preserve Codex; REQ-014; AC-010 | Start Codex after external login | `EVID-CODEX-001` | Exact external home/environment login behavior; no Store owner | `DS-UC013` |
| `BEH-014` | System | Bounded local hardening; REQ-014; AC-010 | Governed child launch | `EVID-CHILD-001` | Empty-base/allowlisted governed children; Codex excluded; no strong claim | `DS-UC014` |
| `BEH-015` | User | Preserve AutoByteus remote capabilities; REQ-007, REQ-009, REQ-017; AC-013 | Settings reload/discovery or invocation | `EVID-AUTOBYTEUS-001` | One provider key, same hosts/discovery/invocation, exact unavailable outcome | `DS-UC015A`, `DS-UC015B` |
| `BEH-016` | Contract | Exact dependency; REQ-016; AC-012 | Clean/frozen install and import | `EVID-PRISMA-001` | Exact unpatched 1.0.8; no production owner adoption | `DS-UC017` |
| `BEH-017` | Operational | Real packaged lifecycle; REQ-015, REQ-018; AC-011, AC-014 | Delivery launches isolated packaged candidate | `EVID-ELECTRON-001` | Isolated data/port identity, full server health/Settings smoke, value-safe logs | `DS-UC016A`, `DS-UC016B`, `DS-UC018`, `DS-R004` |

## Relevant Supplemental Task Artifacts

| Artifact path | Purpose | Related requirements / acceptance criteria | Relationship to this design | Status / approval |
|---|---|---|---|---|
| [encrypted-secret-vault-contract.md](./encrypted-secret-vault-contract.md) | Normative schema, key, crypto, identity, create-only migration batch, lifecycle, and value-free Settings integration contract | REQ-001–REQ-006, REQ-009–REQ-015 / AC-001–AC-004, AC-007–AC-009, AC-011, AC-013 | Governs vault implementation details, migration transaction boundary, and configured projection boundary | User-approved for architecture review |
| [gemini-setup-ui-ux-spec.md](./gemini-setup-ui-ux-spec.md) | Normative Gemini journeys/states/content | REQ-001, REQ-006, REQ-009–REQ-010, REQ-013 / AC-001, AC-004, AC-006, AC-009, AC-015 | Governs user-visible Gemini behavior | Existing approved behavior; unchanged |
| [credential-consumer-mapping.md](./credential-consumer-mapping.md) | Canonical provider/slot/SecretId/alias/custom-v1 migration and API-key-read ownership matrix | REQ-001, REQ-005–REQ-012, REQ-014, REQ-017 | Governs authorization, identity, migration derivation, and non-duplication mapping | User-approved for architecture review |
| [use-case-spine-validation.md](./use-case-spine-validation.md) | Exhaustive use-case/spine/traceability inventory | REQ-001–REQ-018 / AC-001–AC-015 | Proves every use case has sufficient span | Ready for architecture review |
| [secret-storage-architecture.md](./secret-storage-architecture.md) | Compact architecture, API-key-read composition, custom-v1 migration/reset, and trust-boundary diagrams | REQ-001–REQ-015 | Visual projection of this design | Ready for architecture review |
| [live-test-secret-provisioning.md](./live-test-secret-provisioning.md) | One-test-database setup/custom-v1 transition/provider-centric API-key proof/execution/cleanup | REQ-001, REQ-009, REQ-011–REQ-013, REQ-015, REQ-018 | Governs executable validation setup | Ready for architecture review |
| [threat-model-and-option-analysis.md](./threat-model-and-option-analysis.md) | Trust boundaries, custom-v1 reset controls, API-key-read controls, assurance limits, rejected options | REQ-001, REQ-004–REQ-007, REQ-011–REQ-015, REQ-018 | Governs security claims and proportional controls | Ready for architecture review |
| [custom-provider-v1-migration-contract.md](./custom-provider-v1-migration-contract.md) | Normative fixed-path migration, collision, rollback, delete-and-reconfigure reset, and Settings-containment contract | REQ-001, REQ-006, REQ-008–REQ-009, REQ-012, REQ-015, REQ-018 / AC-008, AC-011, AC-013–AC-015 | Governs the only credential-bearing app-data migration and its failure behavior | User-approved for architecture review |
| [repository-prisma-1.0.8-assessment.md](./repository-prisma-1.0.8-assessment.md) | Exact package evidence | REQ-016 / AC-012 | Retained evidence; no intended behavior | Approval `N/A` |

The former `secret-storage-backend-contract.md` is retained only as a tombstone stating that its separate-backend contract is superseded; it is not part of the active package.

## Task Design Health Assessment

- **Change posture:** Larger Requirement + Refactor + Cleanup + behavior-preserving security change.
- **Current design issue found:** Yes.
- **Root causes:** Boundary/ownership issue; duplicated policy/coordination; shared-structure looseness; file-responsibility drift; legacy/compatibility pressure.
- **Refactor needed now:** Yes.
- **Evidence:** one application already has an authoritative DB selector/migration path, while secret management introduces a parallel database/config/access-mode lifecycle; one provider/configured fact is repeated through four catalog query collections and Apollo cache identity; a proposed reduced Settings DTO would create unnecessary parallel provider/model types; Gemini mode was inferred through key status; test data location and scenarios share one manifest; and the current v2-only custom-provider exception propagates through the assembled Settings read, making one legacy custom file a general availability failure.
- **Design response:** collapse physical custody into the application DB, isolate vault persistence/crypto behind one service, preserve only a narrow resolver port at provider construction, give the API-key screen one provider-centric group that reuses existing provider/model types, remove duplicate credential authority and the security-specific status wrapper, use explicit Gemini mode, isolate historical custom-provider parsing in one app-data migration with delete-and-reconfigure fallback, make the normal store v2-only, contain custom failures at Settings, and delete superseded structures.
- **Refactor rationale:** adding adapters around the second Store would preserve the cause of the complexity. A clean cut removes more code and produces one authority for each subject.
- **Intentional deferrals:** remote/enterprise vault backends; strong same-user isolation; multi-replica shared SQLite; live Vertex model listing; generic secret blobs; Prisma major upgrade.
- **Residual risk:** same-user memory/filesystem compromise remains outside `LOCAL_HARDENED`; JavaScript zeroization is best effort; DB and root key must be backed up/restored together; a failed custom-provider migration deliberately discards legacy provider configuration and requires explicit frontend reconfiguration.

## Terminology

| Term | Narrow meaning in this design |
|---|---|
| Application database | The one canonical SQLite file selected by `DATABASE_URL` for one process/environment. |
| Secret vault | The two secret-owned tables plus external root key and their owning service; not a second DB/backend. |
| `SecretId` | Stable provider/integration credential-slot identity, never a model identity. |
| Provider API-key resolver | Core-owned storage-neutral port injected into provider factories/clients. |
| Credential status | Value-free `MISSING\|CONFIGURED` plus vault health; not provider validity. |
| API-key Settings group | `ProviderSettingsGroup` contains one existing `LlmProviderObject` plus four existing `ModelDetail` lists; it is a page-level organization, not another provider/model domain type. |
| Gemini mode | Explicit non-secret `AI_STUDIO\|VERTEX_EXPRESS\|VERTEX_PROJECT`; sole runtime selector. |
| Governed child | A child process under `LOCAL_HARDENED`; Codex is explicitly not one for environment inheritance. |

## Design Reading Order

1. Read the behavior map and persisted-state decisions to establish what is preserved, changed, discarded, or directly usable.
2. Read the spine inventory and narratives to follow every supported trigger through its governing owner to an observable outcome.
3. Read ownership, encapsulation, dependency, and interface sections before the file maps; those boundaries are authoritative.
4. Use the vault, custom-provider migration, Gemini UI, credential mapping, test-workflow, architecture, spine, and threat-model supplements for exact subordinate contracts.
5. Use the removal plan and implementation sequence as the clean-cut transition authority; historical downstream reports are evidence, not target design.

## Legacy Removal Policy

- **Policy:** No backward compatibility; remove legacy code paths.
- Remove the separate Store database/configuration/backend/access-mode/runtime-selection architecture.
- Remove `SecretDefinitionId` terminology in favor of `SecretId`.
- Remove old Google AI Studio ID, Store target names, Store lifecycle DTOs, implicit Gemini priority, and scenario manifest.
- Do not add compatibility aliases, dual runtime reads/writes, environment credential fallback, automatic arbitrary-source import, or wrapper re-exports. Historical custom-provider v1 parsing exists only inside the one migration boundary and is removed from normal runtime.
- Preserve old reports/evidence as historical artifacts only; current runtime and active design depend solely on the new contract.

## Persisted Data / State Transition Decision

| Stored subject | Current location/shape | Change | Decision | Rationale / required outcome |
|---|---|---|---|---|
| Ordinary application data | SQLite selected by `DATABASE_URL` | Add two tables through Prisma migration | `Directly Usable — No Migration` | Existing rows remain valid; ordinary schema migration adds empty owned tables without rewriting unrelated data. |
| Superseded separate Store | Separate Local Store DB/key | No longer a target authority | `Discard or Rebuild` | Unreleased/test state is explicitly reprovisioned; no compatibility reader/mover. |
| Plaintext legacy `.env` credentials | Application `.env` | Runtime stops reading credentials | `Discard or Rebuild` as runtime authority | File remains untouched; users explicitly import/reconfigure and clean it. |
| Fixed custom-provider v1 app data | `<app-data-dir>/llm/custom-llm-providers.json`, version 1 with plaintext key per provider | Transform to secret-free v2 metadata plus encrypted entries, or delete it and return to empty/current state | `Migration Required` | Preserve complete valid providers normally. Any unsafe/colliding/failed state falls back to deletion plus frontend reconfiguration without blocking built-ins. |
| Custom-provider v2 metadata | Secret-free JSON v2 | Continue current semantic reader/writer | `Directly Usable — No Migration` | Required metadata is already secret-free and current. Runtime contains no v1 reader. |
| Gemini mode | Absent or prior implicit behavior | New explicit non-secret setting | `Directly Usable — No Migration` | Absence is `Not selected`; user chooses explicitly. No inferred initialization. |
| Live-E2E manifest | `test-config/live-e2e.json` | Location config moves to env; scenarios to code | `Discard or Rebuild` | It is tracked test policy, not user data. |
| New DB/key pair | Application DB + derived sidecar | Must persist together | New persistent state | Losing either established component fails closed; never auto-repair with a new key. |

One isolated business-data migration boundary is required only for the fixed custom-provider-v1 file. It runs after ordinary Prisma migration and vault initialization, knows v1 only inside that boundary, and publishes current v2 before normal provider use. All other runtime and repositories remain current-schema-only.

## Data-Flow Spine Inventory

The complete 43-spine traceability table and node-count validation is in [use-case-spine-validation.md](./use-case-spine-validation.md). The inventory below is canonical.

| Spine ID | Scope | Related behavior/use case | Start | End | Governing owner | Why it matters |
|---|---|---|---|---|---|---|
| `DS-UC001` | Primary End-to-End | BEH-002–004 / UC-001 | Server/CLI startup | Vault-ready or value-free degraded API | `SecretVaultRuntime` | Establishes one-DB order and fail-closed custody. |
| `DS-UC002` | Primary End-to-End | BEH-001 / UC-002 | One API-key Settings query | One provider object + four named existing model lists | `LlmProviderService.listProviderSettings()` | Reorganizes existing contracts so provider/configuration authority appears once. |
| `DS-UC003A` | Primary End-to-End | BEH-004 / UC-003 | Provider Settings command | Encrypted row/status | Provider service + `SecretManagementService` | Governs write-only lifecycle. |
| `DS-UC003B` | Primary End-to-End | BEH-004 / UC-003 | Provider key result or API-key Settings refetch | Exact provider's `apiKeyConfigured` fact | `LlmProviderService` | Computes one provider-owned Boolean (ordinary exact vault slot; established Gemini aggregate) without a second status object. |
| `DS-UC004A` | Primary End-to-End | BEH-005 / UC-004 | Agent LLM selection | Provider response/stream | Concrete LLM client | Preserves normal LLM behavior with lazy key use. |
| `DS-UC004B` | Primary End-to-End | BEH-005 / UC-004 | Media tool request | Generated media result | Concrete media client | Preserves shared provider keys across media. |
| `DS-UC004C` | Primary End-to-End | BEH-005 / UC-004 | Search tool call | Search result | Search provider adapter | Preserves specialized search path. |
| `DS-UC005A` | Primary End-to-End | BEH-006 / UC-005 | Gemini `Save only` | One option configured | `GeminiConfigurationService` | Separates configuration from activation. |
| `DS-UC005B` | Primary End-to-End | BEH-006 / UC-005 | `Use this mode` | Persisted active mode | `GeminiConfigurationService` | Makes mode selection explicit. |
| `DS-UC005C` | Primary End-to-End | BEH-006 / UC-005 | Remove option | Removed option + truthful active state | `GeminiConfigurationService` | Prevents implicit fallback. |
| `DS-UC006` | Primary End-to-End | BEH-007 / UC-006 | Catalog enrichment | Models + provenance | `ModelMetadataProvisioningService` | Separates optional metadata from availability. |
| `DS-UC007A` | Primary End-to-End | BEH-008 / UC-007 | Create custom provider | Metadata + encrypted credential | `LlmProviderService` | Coordinates two owners without plaintext persistence. |
| `DS-UC007B` | Primary End-to-End | BEH-008 / UC-007 | Custom catalog sync/invoke | Discovered model/provider response | Custom runtime sync + concrete client | Preserves functionality. |
| `DS-UC007C` | Primary End-to-End | BEH-008 / UC-007 | Delete custom provider | Metadata absent + secret removed | `LlmProviderService` | Idempotent cleanup with no orphan authority. |
| `DS-UC007D` | Primary End-to-End | BEH-008 / UC-007 | Existing-user startup with fixed custom-provider v1 | Preserved current providers or deleted legacy state plus usable frontend reconfiguration | `CustomProviderV1AppDataMigration` | Transforms the only required historical schema without teaching runtime v1 and prevents custom trouble from blocking the application. |
| `DS-UC008A` | Primary End-to-End | BEH-009 / UC-008 | Import dry-run | Target identity/state + per-ID observed status/planned action + counts | `LocalEnvironmentSecretImportService` through `SecretVaultInspectionService` | Proves exact no-mutation preview across absent, pre-feature, ready, and closed targets. |
| `DS-UC008B` | Primary End-to-End | BEH-009 / UC-008 | Confirmed import | Authoritative atomic selected-DB batch result | Import service + normal bootstrap + secret service | Re-evaluates state in the write path and reuses normal custody. |
| `DS-UC008C` | Primary End-to-End | BEH-009,011 / UC-008,010 | Generic importer with explicit canonical test DB URL | Atomic test-DB result or exact value-free preview | Normal import/inspection services + `ApplicationDatabaseLocation` | Proves the test DB is selected only by required `--database-url`; no wrapper, profile, AppConfig, parent-env, or `.env.test` target inference. |
| `DS-UC009` | Primary End-to-End | BEH-010 / UC-009 | Upgrade/start with legacy files | Runtime ignores credential values | `AppConfig` projection | Proves no migration/fallback. |
| `DS-UC010A` | Primary End-to-End | BEH-011 / UC-010 | Deterministic backend-E2E command | Actual-server API assertions + fresh-root cleanup | Backend-E2E runner + `TestRuntimeBootstrap` | Proves test tooling loads `.env.test` while the unchanged server reads only a fresh normal `.env`. |
| `DS-UC010B` | Primary End-to-End | BEH-011 / UC-010 | `server:test`, `web:test`, or `dev:test` | Actual server/UI assertions + persistent isolated test state | `TestRuntimeBootstrap` | Proves manual test-server/frontend operation and mutable Settings persistence without tracked-file mutation. |
| `DS-UC011` | Primary End-to-End | BEH-011 / UC-011 | Real-E2E command | Normal-API provider evidence + cleanup | Real-E2E runner using `TestRuntimeBootstrap` | Uses the actual built server, normal DB/key path, and scenario code without a harness-only Store. |
| `DS-UC012A` | Primary End-to-End | BEH-012 / UC-012 | Claude `cli` run | Claude result | Claude runtime owner | Preserves external account state and zero lookup. |
| `DS-UC012B` | Primary End-to-End | BEH-012 / UC-012 | Claude managed run | Exact-child Anthropic execution | Claude auth/launch policy | Constrains JIT child delivery. |
| `DS-UC013` | Primary End-to-End | BEH-013 / UC-013 | Codex run | Codex result | Codex App Server client | Preserves original login/home environment. |
| `DS-UC014` | Primary End-to-End | BEH-014 / UC-014 | Governed child request | Constrained child result | Governed launcher | Preserves local hardening boundary. |
| `DS-UC015A` | Primary End-to-End | BEH-015 / UC-015 | AutoByteus reload/discovery | Remote catalog/status | Remote discovery service | Preserves one key + configured hosts. |
| `DS-UC015B` | Primary End-to-End | BEH-015 / UC-015 | AutoByteus invocation | Remote response/media | Concrete AutoByteus client | Preserves functional capabilities. |
| `DS-UC016A` | Primary End-to-End | BEH-017 / UC-016 | Electron/direct start/restart | Healthy server + persisted vault | Server runtime | Proves same lifecycle outside tests. |
| `DS-UC016B` | Primary End-to-End | BEH-017 / UC-016 | Docker/Pod start/restart | Healthy persisted deployment | Existing deployment topology | Proves no extra service/volume. |
| `DS-UC017` | Primary End-to-End | BEH-016 / UC-017 | Frozen install/import probe | Exact safe dependency evidence | Package manager/test owner | Prevents dependency regression. |
| `DS-UC018` | Primary End-to-End | BEH-017 / UC-018 | Packaged candidate launch | Health + Settings + CRUD + cleanup | Packaged smoke runner | Closes delivery realism gap. |
| `DS-R001` | Return/Event | BEH-001,004,006 | Vault/status outcome | UI configured/active/unavailable state | GraphQL projection | Values never return. |
| `DS-R002` | Return/Event | BEH-003,005 | Resolve/provider failure | Stable value-free caller error | Secret/provider error mapper | Raw causes never escape. |
| `DS-R003` | Return/Event | BEH-007 | Metadata outcome | `LIVE\|CURATED_FALLBACK\|CURATED_ONLY` | Metadata resolver | Prevents fallback from looking live. |
| `DS-R004` | Return/Event | BEH-017 | Packaged startup failure | Technical detail + log location | Electron server status/log owner | Enables safe diagnosis. |
| `DS-L001` | Bounded Local | BEH-002 | Raw DB URL | Canonical DB URL/path/key path | `ApplicationDatabaseLocation` | One resolution rule. |
| `DS-L002` | Bounded Local | BEH-003 | Migrated DB/key state | Vault health/service | `SecretVaultBootstrap` | Owns first-init/verify state machine. |
| `DS-L003` | Bounded Local | BEH-003–005 | Secret input/ID | Ciphertext or trusted value | `SecretManagementService` | Owns encryption/decryption exposure. |
| `DS-L004` | Bounded Local | BEH-009 | Source bytes + canonical DB location | Selected plan or authoritative batch | Import service + internal inspection service | Keeps recognize-first parsing, non-mutating status inspection, and transactional write recheck together. |
| `DS-L005` | Bounded Local | BEH-006–007 | Explicit mode/config | Exact Gemini SDK/metadata strategy | Gemini provider helper/service | Eliminates priority and cross-mode retry. |
| `DS-L006` | Bounded Local | BEH-008 | Metadata/secret partial failure | Recoverable current state | `LlmProviderService` | Contains cross-store compensation. |
| `DS-L007` | Bounded Local | BEH-008 | Validated v1 set + current vault/file state | Atomic v2 publish, exact compensation, or legacy-file deletion | `CustomProviderV1AppDataMigration` | Contains the cross-resource historical transformation, collision, interruption, and destructive-reset protocol. |

## Configuration / Startup Case Decision

| Case | Configuration authority before launch | Actual server input | Runtime state policy | Governing spine |
|---|---|---|---|---|
| Direct server | Operator/application normal config | `<data-dir>/.env` | User-owned | `DS-UC016A` |
| Electron | Existing `AppDataService` | generated `server-data/.env` | User-owned | `DS-UC016A`, `DS-UC018` |
| Docker/Pod | Existing deployment config | normal container `.env`/configuration | Existing volume | `DS-UC016B` |
| Deterministic backend E2E | backend runner explicitly reads fixed `.env.test` | fresh runtime `<data-dir>/.env` materialized by `TestRuntimeBootstrap` | fresh and cleanup-fenced | `DS-UC010A` |
| Manual server/frontend test | test command explicitly reads fixed `.env.test` | persistent isolated runtime `<data-dir>/.env` | preserve DB/key/mutable Settings | `DS-UC010B` |
| Real-provider backend E2E | real runner explicitly reads fixed `.env.test` | same persistent isolated runtime `.env` | preserve explicitly provisioned DB/key | `DS-UC011` |
| Explicit importer targeting test DB | operator/runner passes the canonical absolute test SQLite URL through required `--database-url` | standalone importer; no actual server input | exact explicit DB only | `DS-UC008C` |
| Packaged Electron smoke | isolated candidate `AppDataService` | candidate-generated `.env` | fresh candidate root | `DS-UC018` |

Production server/AppConfig never parse or discover `.env.test`. It remains a backend-test template whose fixed values are materialized into the same `.env` contract that the server already uses.

## Primary Execution Spines

```text
DS-UC001: Process entry -> AppConfig/ApplicationDatabaseLocation -> Prisma migrations
          -> SecretVaultBootstrap -> SecretVaultRuntime -> HTTP/GraphQL exposure

DS-UC002: API-key Settings -> GraphQL providerSettings(runtimeKind)
          -> LlmProviderService.listProviderSettings(runtimeKind)
          -> canonical provider/configured fact + four existing catalog collections
          -> exact provider-ID grouping -> one ProviderSettingsGroup per provider
          -> one API-key Pinia collection -> API-key UI

Existing catalog consumers: selector/media/defaults/history/workspace -> established catalog queries/stores
          -> current ModelDetail data -> selector/runtime UI

DS-UC003A: Provider editor -> provider-specific GraphQL mutation -> LlmProviderService
           -> SecretManagementService -> SecretVaultPrismaRepository -> encrypted application DB row

DS-UC004A: Agent selection -> AutoByteusAgentRunBackendFactory -> LLMFactory(model, config, apiKeyResolver)
           -> concrete provider lazy SDK init -> ProviderApiKeyResolver -> SecretManagementService
           -> SDK request/response

DS-UC005B: Gemini UI `Use this mode` -> GraphQL activation command -> GeminiConfigurationService
           -> validate selected option status/config -> AppConfig.set(GEMINI_SETUP_MODE)
           -> invalidate Gemini metadata -> authoritative GeminiSetupState

DS-UC008A: PNPM CLI --dry-run + required --database-url
           -> ApplicationDatabaseLocation absolute-URL validation -> source reader
           -> positive alias plan -> SecretVaultInspectionService read-only classification
           -> target identity/state + per-ID observed status/planned action + counts
           -> exit without DB/key/metadata/permission mutation

DS-UC008B: PNPM CLI + required --database-url
           -> ApplicationDatabaseLocation absolute-URL validation -> source reader -> import planner
           -> same read-only inspection/plan -> TTY confirmation
           -> normal migration/bootstrap if required -> transactional status re-evaluation
           -> conditional create/skip or explicit replace -> value-free actual result

DS-UC008C: secrets:import + explicit canonical test --database-url
           -> reject ambient/AppConfig/.env/.env.test/source target influence
           -> normal inspection/import lifecycle against exactly that test application DB
           -> value-free result

DS-UC010A: backend-E2E command -> TestRuntimeBootstrap reads fixed .env.test
           -> fresh data root + materialized runtime .env -> unchanged dist/app.js --data-dir
           -> migrations/vault/routes -> HTTP/GraphQL assertions -> fenced cleanup

DS-UC010B: server:test/dev:test -> TestRuntimeBootstrap reads fixed .env.test
           -> persistent isolated runtime .env -> unchanged server + normal frontend
           -> Settings/API actions -> restart -> persisted test DB/key/mutable settings

DS-UC011: real-provider E2E -> TestRuntimeBootstrap reads fixed .env.test
          -> persistent provisioned runtime .env/DB/key -> unchanged server/API
          -> status-only preflight -> configured scenarios -> value-free evidence -> stop/preserve

DS-UC018: Delivery smoke -> packaged Electron with isolated root/port -> embedded server
          -> health -> Settings catalog -> synthetic save/status/remove -> restart -> value-safe logs -> isolated cleanup
```

All other primary chains are specified node-for-node in [use-case-spine-validation.md](./use-case-spine-validation.md).

## Spine Narratives

| Spine group | Narrative | Main domain nodes | Governing owner | Key off-spine concerns |
|---|---|---|---|---|
| Startup/vault (`DS-UC001`, `DS-L001`–`003`) | Resolve one DB, migrate it, create/verify its paired key/domain, then expose catalogs while secret operations reflect health. | DB location, migration, vault bootstrap, secret service | `SecretVaultRuntime` after `AppConfig` and migration | Filesystem identity, crypto, redaction, denied paths |
| API-key Settings read (`DS-UC002`, `DS-UC003B`, `DS-R001`) | Acquire each provider once, compute its exact configured fact once, and attach four existing model lists by exact provider ID. | Provider directory/configured check, existing catalogs, API-key UI | `LlmProviderService.listProviderSettings()`; catalog owners remain authoritative | GraphQL loading/error UI and existing custom catalog state |
| Custom-provider transition (`DS-UC007D`, `DS-L007`) | At startup, inspect only the fixed canonical file under lock, migrate the complete valid v1 set into one create-only encrypted batch plus staged v2 publish, or delete the unusable v1 file so current Settings/Create remains usable. | App-data migration runner, v1 migration, secret batch, v2 store | `CustomProviderV1AppDataMigration` | file identity/permissions, collision policy, sanitized migration status, exact conditional compensation |
| Provider invocation (`DS-UC004A`–`C`, `DS-R002`) | Existing factories select models/config; concrete clients resolve only when constructing SDKs. | Factory, concrete provider, resolver, SDK | Concrete provider client | Consumer authorization, error mapping |
| Gemini (`DS-UC005A`–`DS-UC006`, `DS-L005`) | Save options independently, activate explicitly, read selected non-secret configuration, resolve only its key slot, construct exact SDK, and report honest metadata provenance. | Gemini configuration, provider helper, resolver, metadata strategy | `GeminiConfigurationService` for setting; concrete Gemini client for SDK | Vault status, UI state, config persistence |
| Import/test (`DS-UC008A`–`DS-UC011`, `DS-L004`) | Require an explicit absolute SQLite database URL for every import, parse only recognized aliases, inspect exactly that DB/key pair without mutation, show observed statuses/planned actions, and write atomically after confirmation with an authoritative transactional recheck; independently, backend test tooling reads immutable `.env.test`, materializes/reconciles fixed launch keys into ignored normal runtime `.env`, and starts the unchanged actual built server/frontend lifecycle. | CLI location input, `ApplicationDatabaseLocation`, source reader, import service, `SecretVaultInspectionService`, normal bootstrap/secret service, `TestRuntimeBootstrap`, actual server, test runner | Import service / internal inspection service / `TestRuntimeBootstrap` / real-E2E runner | explicit target, TTY, file trust, no-mutation inspection, write races, clean child env, fresh-versus-persistent root, tracked-file immutability, scanner, cleanup |
| Specialized runtimes (`DS-UC012A`–`DS-UC015B`) | Preserve Claude/Codex/governed-child/AutoByteus behavior while changing only secret custody where approved. | Existing runtime owners | Existing runtime-specific owners | Auth mode, child env, endpoint availability |
| Delivery (`DS-UC016A`–`DS-UC018`, `DS-R004`) | Use one DB/key pair in every packaging/deployment form and exercise the actual packaged app with isolated identity and logs. | Electron server manager, server runtime, deployment volume, smoke runner | Existing platform owners | Port/data isolation, cleanup, log path |

## Spine Actors / Main-Line Nodes

- `AppConfig` / `ApplicationDatabaseLocation`
- Prisma migration runner
- `SecretVaultBootstrap` / `SecretVaultRuntime`
- `SecretManagementService`
- provider-specific Settings services and GraphQL resolvers
- `ModelCatalogService` and built-in/runtime catalogs
- `LlmProviderService.listProviderSettings()`
- `ProviderApiKeyResolver` server adapter
- `LLMFactory` / media factories / concrete provider clients
- `GeminiConfigurationService` and Gemini provider helper
- `AppDataMigrationRunner` and `CustomProviderV1AppDataMigration`
- importer service and source reader
- `TestRuntimeBootstrap`, actual built server process, and normal frontend/API path
- existing Claude/Codex/child/AutoByteus runtime owners
- Electron server manager and packaged smoke runner

## Ownership Map

| Owner | Owns | Explicitly does not own |
|---|---|---|
| `AppConfig` | Non-secret config load/save/validation and approved runtime projection | Secret parsing, crypto, model catalogs |
| `ApplicationDatabaseLocation` | Canonical SQLite URL/path and derived key path | Migration, opening DB, creating key |
| Prisma migration runner | Current application schema | Root-key state or credential migration |
| `SecretVaultBootstrap` | First-init/verify state machine and key/domain pairing | Provider mapping or API operations |
| `SecretVaultRuntime` | One process-local service lifecycle after bootstrap | Backend selection or access mode |
| `SecretManagementService` | Health, authorization, status, save/remove/batch/resolve, and internal create-only custom-v1 migration batch with exact conditional compensation receipt | Provider validation, UI, model selection, historical file parsing, or historical-file reset policy |
| `SecretVaultInspectionService` | Import-preview-only classification of the explicitly URL-selected DB/key pair and exact entry existence through read-only filesystem/SQLite operations | Migration, bootstrap, key creation, permission repair, writes, provider validation, or an operator-selectable access mode |
| `SecretVaultPrismaRepository` | Metadata/entry persistence and transaction | Crypto, mapping, filesystem |
| `SecretVaultCrypto` | HKDF/AES/verifier operations and temporary buffers | DB and provider policy |
| `RootKeyFile` | Key path identity, permissions, exclusive create/read | DB metadata and credential identity |
| `ProviderCredentialCatalog` | Authorized subject/provider/slot -> `SecretId` | Provider models, aliases, secret values |
| Server API-key resolver | Implements core port for one authorized subject | Catalog enumeration or mode inference |
| Concrete provider client | Lazy SDK construction and request behavior | Vault persistence or config file writes |
| `AppDataMigrationRunner` | Startup execution/recording/retry lifecycle for registered migrations | Custom-v1 transformation rules, credential values, or runtime provider listing |
| `CustomProviderV1AppDataMigration` | Fixed-path v1 detection/validation, complete mapping, staged v2, create-only batch orchestration, publish/delete outcome, stable value-free result | Normal provider listing/use, arbitrary files, `.env` import, or permanent v1 compatibility |
| `CustomLlmProviderStore` | Missing-as-empty and current v2-only list/create/delete | v1 parsing, migration/reset, or general Settings failure propagation |
| `ModelCatalogService` | Credential-independent model/provider availability and optional enrichment composition | Credential status/writes |
| `LlmProviderService.listProviderSettings()` | Deterministic composition of one canonical provider record plus four existing model lists by exact provider ID | Credential persistence, GraphQL/client state, model-schema redefinition, cross-provider status fallback, or synthesizing providers from orphan models |
| `GeminiConfigurationService` | Option completeness, explicit activation, mode persistence, authoritative setup state | Secret crypto or SDK request behavior |
| Import service | Source selection, recognize-first plan, call to the authoritative inspection service, confirmation, and normal bootstrap/batch command | Direct repository/key access, alternate DB selection, runtime fallback, or claiming preview as the write result |
| `TestRuntimeBootstrap` | Fixed `.env.test` validation, server-root-relative DB canonicalization, fixed-key materialization/reconciliation into ignored test app-data/runtime `.env`, empty/allowlisted OS child environment, real server process, health/shutdown | Product server config parsing, scenario definitions, credentials, provider invocation, production/default data |
| Electron server manager | Embedded process/data/port/log lifecycle | Secret content and DB schema |

## Thin Entry Facades / Public Wrappers

| Facade / wrapper | Governing owner behind it | Why it exists | Must not secretly own |
|---|---|---|---|
| GraphQL API-key-settings resolver | `LlmProviderService`, `GeminiConfigurationService` | Thin transport over one provider-centric read plus provider/custom/Gemini commands | Crypto, catalog policy, file writes, provider merging, or parallel credential DTO assembly |
| `ProviderApiKeyResolver` | Server adapter -> `SecretManagementService` | Storage-neutral core port | Model metadata or backend configuration |
| `secret-management/index.ts` | Secret runtime/service/types | Stable exports | A second composition/service locator hierarchy |
| App-data migration definition | `CustomProviderV1AppDataMigration` -> secret batch owner + fixed file | Existing startup migration entrypoint and value-free status | Normal custom-provider runtime or arbitrary source migration |
| PNPM import command | Import service | Operator entrypoint | Parser/business/DB target logic |
| Electron preload IPC | Server manager/logger | Renderer-safe operations | Raw process handles or secret contents |

## Removal / Decommission Plan

| Item to remove/decommission | Why unnecessary | Replacement | Scope | Notes |
|---|---|---|---|---|
| `secret-management/backends/**` runtime backend hierarchy | Only one application DB is supported | `SecretManagementService` + Prisma repository + crypto/key files | In this change | Test fakes live in tests, not runtime backend selection. |
| Separate Local Store initializer/schema/repository/reset/provisioning files | Duplicate DB/key lifecycle | App DB migration + vault bootstrap/import service | In this change | No compatibility exports. |
| `secret-storage-configuration*.ts` and `AUTOBYTEUS_SECRET_STORAGE_CONFIG_FILE` | Duplicate physical selector/backend kind/access mode | `DATABASE_URL` / `ApplicationDatabaseLocation` | In this change | Remove docs/tests too. |
| `READ_ONLY\|READ_WRITE`, lifecycle DTOs, selected-kind/restart-required Store projection | Test isolation makes access mode unnecessary | Vault health + `MISSING\|CONFIGURED` | In this change | UI never displays backend kind. |
| `local-import-target-resolver.ts`, `default\|e2e` target types/flags, `run-test-import.mjs`, `secrets:local:import`, and `secrets:local:import:test` | Local/profile/test naming and implicit target selection are obsolete and duplicated | `secrets:import` with required `--database-url` validated by `ApplicationDatabaseLocation` | In this change | Remove without compatibility wrapper; one generic command targets any explicitly identified DB. |
| `provision-real-e2e-store.ts` and Store-specific setup command | Tied to removed manifest/Store | UI or one-DB importer against test config | In this change | No separate E2E custody. |
| `test-config/live-e2e.json`, manifest parser, scenario-in-config types | Mixes location with test behavior and supports a harness-only Store path | server-root immutable `.env.test` + `TestRuntimeBootstrap` + scenario registry in code | In this change | No second committed live-E2E env/config file; generated runtime `.env`, DB/key, and logs remain ignored. |
| `SecretDefinitionId` and old binding names | Identity is a secret slot, not definition/model | `SecretId`, `ProviderCredentialCatalog` | In this change | No alias type. |
| `provider.gemini.ai-studio-api-key` | Wrong ownership name | `provider.google.ai-studio.api-key` | In this change | No dual read/import mapping. |
| Implicit `selectGeminiRuntime*` status priority | Contradicts explicit selection | typed explicit-mode reader + configuration service | In this change | No missing-mode fallback. |
| API-key page's combined consumption of four `availableLlm\|Audio\|Image\|VideoProvidersWithModels` results | Repeats one provider/configured fact and exposes Apollo cache-order collisions | One `providerSettings` query returning `ProviderSettingsGroup`; keep established catalog queries for current non-Settings consumers | In this change | No compatibility wrapper or cache workaround; the Settings page changes consumers cleanly. |
| `CredentialStatusObject`, `vaultHealth`, `storageState`, and `instructionCode` on the provider read | Security-specific wrapper duplicated the origin-compatible configured fact and complicated the UI | Restore `LlmProviderObject.apiKeyConfigured` backed by the vault; operation failures remain GraphQL errors | In this change | Retain established provider/custom fields; do not add another replacement status protocol. |
| Parallel web `providerConfigs` map, API-key four-array/all-provider merge, `sync/replaceProviderConfiguredState`, and cross-provider fallback | Compete with the exact provider row and permit one provider to supply another's configured fact | One `ProviderSettingsGroup[]`; exact provider-ID refetch | In this change | Existing catalog stores remain for their current consumers; no Apollo workaround or compatibility facade. |
| API-key four-array aggregation responsibilities inside `llmProviderConfig.ts` / `llmProviderConfigSupport.ts` | Mix screen credential authority with general catalog selection | Add one focused provider-Settings store/action around `providerSettings`; retain current catalog store APIs for supported consumers | In this change | Reuse generated `LlmProviderObject`/`ModelDetail`; no parallel hand-written contract or re-exported credential helpers. |
| Model authentication/context/resolved-auth structures | Superseded and currently absent | Resolver constructor argument | Structural prohibition | Static scan prevents return. |
| Docs that describe second Store/reset preservation | Obsolete | Updated one-DB docs | In this change | Tombstone old ticket contract only. |

## Return Or Event Spines

```text
DS-R001: SecretManagementService configured check -> LlmProviderService exact-provider record
          -> providerSettings GraphQL -> one ProviderSettingsGroup in the API-key Pinia collection
          -> Configured/Not configured badge; operation failures remain value-free GraphQL errors

DS-R002: Vault/authorization/decrypt/provider failure -> stable service code -> provider/runtime mapper
          -> value-free user/test outcome (raw DB/crypto/provider causes remain internal)

DS-R003: Live metadata match/failure/no-live-strategy -> ModelMetadataResolver
          -> LIVE | CURATED_FALLBACK | CURATED_ONLY -> GraphQL/UI/test evidence

DS-R004: Embedded server stdout/stderr/exit -> Electron logger/status manager
          -> Application Error technical details + log path -> operator diagnosis
```

## Bounded Local / Internal Spines

- **`DS-L001`, parent `AppConfig`:** configured `DATABASE_URL` -> validate SQLite file URL -> resolve relative path once -> canonical absolute path/URL -> derive `.secret.key` path.
- **`DS-L002`, parent `SecretVaultBootstrap`:** inspect metadata/entry count/key identity -> first-init or established branch -> verifier check -> `READY|LOCKED|CORRUPT|INCOMPATIBLE|UNAVAILABLE`.
- **`DS-L003`, parent `SecretManagementService`:** authorize consumer -> obtain `SecretId` -> derive key/AAD -> encrypt/upsert or decrypt -> best-effort clear -> return `SecretValue` only to trusted adapter.
- **`DS-L004`, parent import service:** trusted file open -> recognize names -> ignore empty/unrecognized -> validate mapped values/conflicts -> service-owned read-only target inspection -> value-free observed status/planned action -> optional confirm -> normal bootstrap if required -> transactionally re-evaluate existence -> conditional create/skip or explicit replace -> clear buffers. Preview stops before confirmation/bootstrap and mutates nothing.
- **`DS-L005`, parent Gemini provider/configuration:** explicit mode -> validate selected config -> resolve only selected slot (if any) -> exact SDK constructor; metadata strategy reads the same mode but cannot change it.
- **`DS-L006`, parent `LlmProviderService`:** create/delete custom metadata and secret -> compensation/idempotent retry -> visible current state without plaintext persistence.
- **`DS-L007`, parent `CustomProviderV1AppDataMigration`:** lock canonical path -> parse/validate complete v1 -> derive preserved-ID SecretIds -> require all missing -> stage complete v2 -> create-only encrypted transaction -> atomic publish; on collision/failure/interruption, exact compensation when possible -> delete canonical v1 -> establish missing/empty current state -> value-free migration status.

## Off-Spine Concerns Around The Spine

| Concern | Related spines | Serves owner | Responsibility | Why it exists | Risk if placed on main line |
|---|---|---|---|---|---|
| Canonical DB locator | UC-001,008,010,011,016,018 | AppConfig/migration/vault | One URL/path/key derivation | Prevent split-brain path resolution | Each consumer selects a different DB. |
| Root-key filesystem policy | UC-001,016 | Vault bootstrap | Identity/permission/exclusive create/read | DB key must remain external | Service becomes filesystem/crypto blob. |
| Cryptography | UC-001,003,004,008 | Secret service | HKDF/AES/AAD/verifier | Reusable, testable crypto contract | Persistence/provider code handles bytes. |
| Provider credential catalog | UC-003–007,012,015 | Secret service/resolvers | Subject/provider/slot authorization | Stable tight identity mapping | Models become credential registry. |
| Custom-provider-v1 migration/reset | UC-007 | Existing app-data migration owner | Fixed-path historical parse, complete mapping, create-only batch, staged publish, failed-migration deletion | Keeps historical schema and destructive reset off normal runtime | v2 store/GraphQL/providers learn v1 or arbitrary migration logic. |
| Import alias registry | UC-008 | Source reader/import service | Input-only current aliases | Separates legacy syntax from runtime identity | Runtime gains environment fallback. |
| Metadata enrichment | UC-002,006 | Model catalog | Optional live/curated merge + provenance | Availability stays independent | Provider listing waits on credentials/network. |
| API-key Settings grouping | UC-002,003 | `LlmProviderService.listProviderSettings()` | Emit one canonical provider object and four existing model lists by exact provider ID | One response without duplicate credential authority or replacement DTOs | GraphQL resolver or web store recreates four-array merging. |
| Redaction/evidence scanner | All executable flows | Runtime/test owners | Prevent value leakage | Security evidence | Becomes alternate error path. |
| File-tool denied paths | UC-001,014,016 | Governed launcher/file policy | Deny DB/key/journal access | Local hardening | Vault owns child policy. |
| TTY confirmation | UC-008 | Import service | Human confirmation before writes | Prevent accidental target mutation | Parser/DB code handles UI. |
| Electron log forwarding | UC-016,018 | Electron server manager | Value-safe startup diagnostics | Real user recovery | Server runtime owns desktop presentation. |

## Ownership Boundaries

1. `AppConfig` is the only authority for a running application’s non-secret settings. Runtime consumers use its canonical DB location. The standalone importer is a separate operator boundary: its required `--database-url` is its sole target authority and is parsed only through the same `ApplicationDatabaseLocation` type; it never initializes AppConfig or loads/inherits `.env`, `.env.test`, or parent `DATABASE_URL`.
2. `SecretManagementService` is the only runtime secret lifecycle boundary. Its repository, crypto, root-key handle, and catalog are internal. `SecretVaultInspectionService` is the one narrower secret-management-owned exception for importer preview: it may inspect only the selected target through non-mutating filesystem checks, verifier validation, and read-only schema/entry queries; it exposes no value and cannot migrate/bootstrap/write.
3. `AppDataMigrationRunner` is the startup migration lifecycle boundary; `CustomProviderV1AppDataMigration` is the sole owner of historical custom-provider schema transformation and failed-migration deletion. `CustomLlmProviderStore` is current-v2-only. The migration uses an internal create-only service command without bypassing `SecretManagementService`.
4. Provider Settings services expose provider-specific commands. GraphQL and web do not receive `SecretId` for ordinary built-ins and never receive values.
5. `autobyteus-ts` defines the API-key resolver port; server implements it. Core providers cannot import server/Prisma/filesystem.
6. Model catalogs own model data and `LlmProviderService` owns provider identity/configured/custom facts. `listProviderSettings()` composes the page group from those public owners without creating a second provider/model contract. Catalog membership never depends on credential state. Existing catalog GraphQL fields remain supported for their current consumers; the API-key page alone stops combining them into four repeated provider collections.
7. Gemini configuration owns explicit mode and option completeness; concrete Gemini clients own SDK construction. Metadata reads the mode but cannot select/retry it.
8. Importer source parsing and operator interaction are outside secret persistence. Preview crosses only `SecretVaultInspectionService`; the batch crosses `SecretManagementService` only after a plan/confirmation and normal execution bootstrap.
9. `TestRuntimeBootstrap` is the only owner allowed to interpret the tracked `.env.test`. It accepts only the fixed non-secret launch schema, canonicalizes the test DB against the server root, materializes/reconciles fixed keys into an ignored ordinary runtime `.env`, and launches the unchanged actual server with `--data-dir` under an empty/allowlisted OS environment. It does not inject `DATABASE_URL` or other application settings into the child environment. Test runners consume its typed result; the importer does not depend on this bootstrap and receives the desired canonical DB URL explicitly.
10. Existing runtime owners remain authoritative for Claude, Codex, governed children, AutoByteus remote, Electron, and Docker behavior.

## Boundary Encapsulation Map

| Authoritative boundary | Encapsulates | Required upstream callers | Forbidden bypass | If API too thin, fix by |
|---|---|---|---|---|
| `ApplicationDatabaseLocation` | SQLite URL validation/canonicalization/key derivation | AppConfig runtime path; importer explicit-URL path; migrations, Prisma, vault, tests/diagnostics | Independent path resolution or implicit importer target inference | Add a typed constructor/method for the exact caller boundary. |
| `SecretVaultRuntime` | Bootstrapped service lifecycle/close/health | server composition root and CLI bootstrap | Opening key/repository from provider code | Add lifecycle method, not backend selector. |
| `SecretManagementService` | catalog, crypto, repository, key handle | provider services, resolver adapter, importer | Direct Prisma/crypto calls from Settings/providers | Add subject-specific command/batch method. |
| `SecretVaultInspectionService` | Non-mutating target-state/verifier/entry-existence inspection for importer preview | Import service only | CLI/importer opening SQLite/key directly or using normal bootstrap | Add an exact inspection result/state, never an access mode. |
| `CustomProviderV1AppDataMigration` | Fixed v1 validation, complete preserved-ID mapping, create-only batch, staged current publish, sanitized outcome | `AppDataMigrationRunner` only | Normal store/GraphQL/runtime parsing v1 or reaching migration/reset internals | Add exact migrate-or-delete behavior here, never a runtime compatibility branch. |
| Provider Settings service | Provider validation and command sequencing | GraphQL resolver | GraphQL -> secret repository/service internals | Return only Boolean command completion; canonical state comes from the one read. |
| `LlmProviderService.listProviderSettings()` | Canonical provider records plus four existing model lists grouped by exact provider ID | GraphQL `providerSettings` query | GraphQL/web recomputing provider identity/status, cross-provider fallback, or creating providers from orphan models | Extend the established provider owner rather than add another read service. |
| `ProviderApiKeyResolver` | consumer authorization + service resolution | core LLM/media provider clients | Core -> server Store/Prisma/env credential alias | Extend subject mapping server-side. |
| `ModelCatalogService` | curated registries and metadata merge | GraphQL/reload/provider UI | UI/provider status deciding catalog membership | Add catalog-only method. |
| `GeminiConfigurationService` | option status/save/remove/activate | GraphQL and metadata strategy | UI directly editing multiple AppConfig/secret owners | Add explicit commands with one shared setup-state result. |
| Import service | parse/inspect/plan/confirm/batch sequence | CLI | CLI calling source reader/repository/key directly | Add preview/execute method backed by the inspection service. |
| Electron server manager | child/data/port/log lifecycle | Electron main/status IPC | Renderer spawn/path/process access | Add safe IPC/status detail. |

## Dependency Rules

1. `autobyteus-ts` may depend only on its own `ProviderApiKeyResolver`/`SecretValue` ports and provider SDKs; it must not depend on server secret management, Prisma, filesystem, or credential environment aliases.
2. Server resolver adapters may depend on the core port and `SecretManagementService`; reverse dependency is forbidden.
3. `SecretManagementService` may depend on `ProviderCredentialCatalog`, crypto, root-key handle, and repository ports; none may depend on provider/model/UI services.
4. `ModelCatalogService` must not depend on vault health or credential status for base availability. Optional metadata provisioning may resolve a key after the curated catalog exists.
5. `LlmProviderService.listProviderSettings()` may depend on its existing provider directory/status and `ModelCatalogService` boundaries. It emits each canonical provider once, groups current model objects by exact provider ID, uses `[]` for a capability with no matching models, and never invents credential state from a catalog row or result order. The GraphQL layer maps the established domain records to existing `LlmProviderObject`/`ModelDetail`; no reduced parallel DTO, availability wrapper, or status protocol is introduced.
6. Provider Settings command services may call `SecretManagementService`, but GraphQL may not call service internals directly. Ordinary Save/Remove returns only Boolean command completion; the request already identifies the provider, authoritative state comes from a canonical-row refetch, and failure uses GraphQL errors.
7. `AppConfig` may parse/persist only approved non-secret settings. Credential aliases are masked and never projected to `process.env`.
8. The explicit Gemini mode/project/location are non-secret runtime configuration. `AppConfig` validates them and `GeminiConfigurationService.resolveActiveRuntime()` returns one tight `GeminiRuntimeSelection`; no model field or secret-status inference is allowed.
9. The core owns the function type `GeminiRuntimeResolver = () => Promise<GeminiRuntimeSelection>`. The server adapter closes over `GeminiConfigurationService`; Gemini LLM/media clients call it lazily at SDK initialization and then resolve only the slot selected by that result. This is a separate provider-specific dependency from `ProviderApiKeyResolver`.
10. Factories preserve the three-argument `model, effectiveConfig, apiKeyResolver` path for every ordinary provider. Their only specialized overload is an optional fourth `geminiRuntimeResolver` argument. It is required and accepted only for a Gemini model; missing Gemini resolution fails `GEMINI_RUNTIME_UNCONFIGURED`, and a non-Gemini model rejects a supplied Gemini resolver. There is no generic construction context or authentication union.
11. `AppDataMigrationRunner` may call only the registered `CustomProviderV1AppDataMigration` public definition. The migration may call the internal create-only `SecretManagementService` batch and access only the fixed current custom-provider path. Normal provider/GraphQL/runtime code may depend only on the v2 store and must never call the v1 parser/reset internals. The migration must sanitize its own result/throwable before the generic runner writes status/logs.
12. Importer may call `ApplicationDatabaseLocation.fromAbsoluteFileUrl`, source reader, `SecretVaultInspectionService`, normal vault bootstrap, and `SecretManagementService` only. It must require exactly one explicit database URL and may not initialize AppConfig, load `.env`/`.env.test`, read parent `DATABASE_URL`, derive a target from the source/current working directory, accept a key-path/profile/backend selector, open the repository/key directly, or turn the internal inspector into an operator access mode.
13. Governed child environment builders receive no credential aliases, `DATABASE_URL`, derived key path, or root-key bytes. Codex retains its explicit exception.
14. No code may retry another credential ID/mode after `NOT_FOUND`, auth failure, or provider error.
15. No compatibility re-export, duplicated provider DTO/store authority, Apollo order/type-policy mask, or dual-path module may preserve removed Store/backend/authentication/provider-read machinery.
16. Only backend-test entrypoints may depend on `TestRuntimeBootstrap`. Product runtime code must not auto-discover `.env.test`; the actual server must continue reading only `<data-dir>/.env`; deterministic tests must not share the provisioned real-E2E DB; and the tracked `.env.test` must never be an `AppConfig.set()`/`.delete()` persistence target.

## Interface Boundary Mapping

| Interface/API | Subject | Responsibility | Accepted identity | Notes |
|---|---|---|---|---|
| `getOperationalDatabaseLocation()` | Running application DB | Canonical URL/path/key path | None; AppConfig process state | Typed immutable result for server/runtime only. |
| `ApplicationDatabaseLocation.fromAbsoluteFileUrl(databaseUrl)` | Standalone importer DB | Validate/canonicalize explicit target URL and derive key path | One required absolute SQLite `file:` URL | Rejects missing/duplicate/relative/non-SQLite/malformed input before target access; no environment/config fallback. |
| `SecretManagementService.getHealth()` | Vault | Value-free health | Current runtime only | No DB/key paths in public API. |
| `getStatusForConsumer(consumer)` | Credential | Existence only | `SecretConsumerIdentity` | Does not decrypt/provider-validate. |
| `saveForConsumer({consumer,value})` | Credential | Atomic create/replace | Authorized consumer | Write-only input. |
| `removeForConsumer(consumer)` | Credential | Idempotent delete | Authorized consumer | No missing error. |
| `resolveForUse(consumer)` | Credential | Authorized decrypt | Authorized consumer | Returns `SecretValue` only across the trusted in-process adapter/client boundary. |
| `saveBatch(entries, overwrite)` | Credential batch | Atomic importer writes | Exact `SecretId` plan authorized by importer registry | No arbitrary raw API. |
| internal `createMissingBatchForCustomProviderMigration(entries)` | Fixed custom-v1 credential batch | Require every exact ID missing, encrypt/insert all in one transaction, return memory-only exact compensation receipt | Migration-owned complete provider-ID mapping only | No overwrite/use/compare mode; receipt never crosses process/log boundary. |
| `compensateUnpublishedCustomProviderBatch(receipt)` | Same-process migration rollback | Conditionally delete only exact unchanged rows inserted by the receipt | In-memory receipt from the immediately preceding batch | Never deletes pre-existing or changed rows; no persisted/general delete token. |
| `ProviderApiKeyResolver.resolve(providerId, slot?)` | Provider key | Lazy trusted resolution | Provider ID + typed slot | Core-owned port. |
| `GeminiRuntimeResolver()` | Gemini runtime config | Lazy value-free selected-mode/config resolution | No input; server adapter is subject-scoped | Core-owned function type; never returns a secret. |
| `providerSettings(runtimeKind)` | API-key Settings read | One canonical provider plus four existing model collections | Optional existing runtime-kind selector | One API-key-page query; established catalog queries remain for other consumers. |
| `LlmProviderService.listProviderSettings(runtimeKind)` | API-key Settings composition | Acquire canonical provider/configured/custom facts once, group four catalog results by exact ID, and emit one group/provider | Optional existing runtime-kind selector | Reuses current domain/GraphQL provider and model contracts; no client merge. |
| provider credential Save/Remove | Provider credential operation | Return only Boolean command completion | Exact provider ID + transient key for Save; provider ID for Remove | The caller already owns the ID; canonical state is refetched; failures use GraphQL errors. |
| custom-provider Probe/Create | Custom provider | Probe base URL or create metadata+credential | Exactly name, base URL, transient key | Type/runtime are server constants. Probe returns only `{id,name}` models; Create returns only assigned ID. |
| custom-provider Delete | Custom provider | Idempotent metadata+credential removal | Exact provider ID | Returns success only; failures use GraphQL errors. |
| `CustomProviderV1AppDataMigration.execute()` | Fixed custom-provider app-data transition | Produce `MIGRATED`, `RECONFIGURATION_REQUIRED`, or `RESET_UNAVAILABLE` through the existing migration result/status shape | Fixed app-data path and injected current vault owner only | No caller path/source parameter; no value output; startup failure is non-critical. |
| `getGeminiSetupConfig` | Gemini configuration | Exact configured/active state | Singleton | Returns only active mode, two key configured booleans, and nullable complete Vertex Project config. |
| three option-specific Gemini Save commands | Gemini option | Save one exact option, optionally use it after Save | AI Studio key; Express key; or project+location, each with `activateAfterSave` | No generic nullable-field bag; returns the same `GeminiSetupState`. |
| `useGeminiMode` | Gemini mode | Validate and set active mode | Exact mode union | Returns `GeminiSetupState`; no priority/fallback. |
| `removeGeminiConfiguration` | Gemini option | Remove one; clear active first if selected | Exact mode union | Returns actual `GeminiSetupState`; never activates another. |
| `previewImport` | Assignment import preview | Non-mutating target classification and planned actions | `ImportRequest`: absolute source, immutable `targetLocation`, overwrite intent | The CLI has already discarded the raw URL; returns target identity/state, per-ID `MISSING\|CONFIGURED\|UNAVAILABLE`, `CREATE\|SKIP_CONFIGURED\|REPLACE\|BLOCKED`, and counts. |
| `executeImport` | Confirmed assignment import | Normal bootstrap plus authoritative transactional batch | Confirmed plan plus the same immutable `targetLocation`, absolute source, overwrite intent, direct TTY | No raw URL is re-parsed; revalidates exact typed target identity and entry state; preview is advisory; actual result is authoritative. |
| `TestRuntimeBootstrap.load()` | Backend-E2E launch configuration | Validate fixed `.env.test`, canonicalize the ignored test target, materialize/reconcile fixed keys into ordinary ignored runtime `.env`, and build an allowlisted OS child launch | No caller-supplied config path | Server still reads only runtime `.env`; returns value-free typed paths/launch settings; owns no scenario/provider policy. |
| `server:test` / `dev:test` | Actual test application | Ask the bootstrap to materialize runtime `.env`, then build/start the unchanged real server and normal web client against the test DB | Fixed bootstrap only | No server `.env.test` support, harness-only Store, or product-code test profile. |
| `secrets:import` | Assignment import for any environment | Validate required explicit database URL, then invoke one normal importer implementation | Absolute source; absolute SQLite database URL; dryRun/overwrite | No `local`/test command, profile, implicit target, or AppConfig/ambient/source-file database selection. |

### Provider-Centric API-Key Settings Read Contract

This is one page-level organization of the established provider and model contracts. It fixes duplicate provider/configuration authority without inventing reduced replacement DTOs or changing the broader catalog schema.

```graphql
type LlmProviderObject {
  id: String!
  name: String!
  providerType: String!
  isCustom: Boolean!
  baseUrl: String
  apiKeyConfigured: Boolean!
  status: String!
  statusMessage: String
}

type ModelDetail {
  modelIdentifier: String!
  name: String!
  description: String
  value: String!
  canonicalName: String!
  providerId: String!
  providerName: String!
  providerType: String!
  runtime: String!
  hostUrl: String
  configSchema: JSON
  maxContextTokens: Int
  activeContextTokens: Int
  maxInputTokens: Int
  maxOutputTokens: Int
  metadataProvenance: ModelMetadataProvenance
}

type ProviderSettingsGroup {
  provider: LlmProviderObject!
  llmModels: [ModelDetail!]!
  audioModels: [ModelDetail!]!
  imageModels: [ModelDetail!]!
  videoModels: [ModelDetail!]!
}

extend type Query {
  providerSettings(runtimeKind: String): [ProviderSettingsGroup!]!
}
```

The API-key page selection stays tight even though the reused schema types are established and richer:

```graphql
query GetProviderSettings($runtimeKind: String) {
  providerSettings(runtimeKind: $runtimeKind) {
    provider {
      id
      name
      providerType
      isCustom
      baseUrl
      apiKeyConfigured
      status
      statusMessage
    }
    llmModels { modelIdentifier name providerType }
    audioModels { modelIdentifier name providerType }
    imageModels { modelIdentifier name providerType }
    videoModels { modelIdentifier name providerType }
  }
}
```

`LlmProviderObject` remains the established provider shape used by the product. Its configured fact is the origin-compatible `apiKeyConfigured: Boolean!`. For ordinary key-backed providers it is now computed from the exact vault slot instead of `.env` (`true` only for confirmed `CONFIGURED`, otherwise `false`). Gemini preserves the established aggregate meaning: true when AI Studio or Vertex Express is configured, or when Vertex Project has complete project/location configuration. This Boolean never selects the active Gemini mode. Existing identity/custom fields remain because current provider and custom-provider Settings behavior uses them. The security refactor must remove `CredentialStatusObject`, `vaultHealth`, `storageState`, and `instructionCode` from this provider read rather than replacing them with another generic status protocol.

`ModelDetail` also remains the established current shape, including `metadataProvenance`. The API-key page's GraphQL selection set requests only the fields it renders (currently model identifier, display name, and provider type where needed). Other consumers may select the richer existing fields. Schema reuse therefore does not force unused fields over the wire and does not create a second model authority.

Composition rules:

1. `LlmProviderService.listProviderSettings(runtimeKind)` is the application owner. The GraphQL resolver is a thin mapper.
2. The service obtains the canonical built-in/custom provider directory and one value-free `apiKeyConfigured` fact for each exact provider (including the established Gemini aggregate rule above).
3. It acquires LLM/audio/image/video catalogs through existing catalog owners, groups model objects by exact `providerId`, and attaches the four arrays to that provider.
4. A capability with no matching models is `[]`.
5. A model row cannot create a provider or supply credential state. Unknown/orphan provider IDs are rejected from this Settings projection and remain diagnostic evidence.
6. Catalog presence, absence, reload, or enrichment never changes `apiKeyConfigured`; credential presence never removes catalog entries.
7. The API-key web store holds one `ProviderSettingsGroup[]`. It does not keep `providerConfigs`, merge four provider arrays, search another provider for status, or add an Apollo cache-order policy.
8. Existing `availableLlmProvidersWithModels`, `availableAudioProvidersWithModels`, `availableImageProvidersWithModels`, and `availableVideoProvidersWithModels` fields remain supported for current non-Settings consumers. The API-key page stops consuming their combined four-array operation.

Exact provider/custom/Gemini operations remain:

```graphql
saveProviderApiKey(providerId: String!, apiKey: String!): Boolean!
removeProviderApiKey(providerId: String!): Boolean!

probeCustomProvider(input: CustomProviderInputObject!): CustomProviderProbeResultObject!
createCustomProvider(input: CustomProviderInputObject!): String!
deleteCustomProvider(providerId: String!): Boolean!

getGeminiSetupConfig: GeminiSetupStateObject!
saveGeminiAiStudio(apiKey: String!, activateAfterSave: Boolean!): GeminiSetupStateObject!
saveGeminiVertexExpress(apiKey: String!, activateAfterSave: Boolean!): GeminiSetupStateObject!
saveGeminiVertexProject(project: String!, location: String!, activateAfterSave: Boolean!): GeminiSetupStateObject!
useGeminiMode(mode: GeminiSetupMode!): GeminiSetupStateObject!
removeGeminiConfiguration(mode: GeminiSetupMode!): GeminiSetupStateObject!
```

Provider Save/Remove returns command completion and the page refetches `providerSettings`; failures use GraphQL errors. Custom Probe/Create input is exactly name, base URL, and transient key; type/runtime remain server policy. Probe keeps its purpose-specific `{id,name}` discovery result, Create returns the assigned provider ID, and Delete returns completion. These command shapes do not redefine `ModelDetail`.

`GeminiSetupStateObject` remains the specialized authoritative query/result for Gemini option configuration and explicit active-mode selection. It is not folded into `ProviderSettingsGroup`, and no operation/outcome/stage/instruction DTO is added.

Server flow:

```text
GraphQL providerSettings(runtimeKind)
 -> LlmProviderService.listProviderSettings(runtimeKind)
 -> canonical provider directory + exact provider vault status
 -> ModelCatalogService LLM/audio/image/video lists
 -> exact provider-ID grouping
 -> one ProviderSettingsGroup per provider
```

Web flow:

```text
API-key Settings
 -> one providerSettings query
 -> one ProviderSettingsGroup[] store value
 -> sidebar/provider details + four model sections
```

The web may derive temporary view data from one group (selected provider, counts, section lists) but may not create a second credential-state authority. Model selectors, media defaults, history, workspace, and runtime configuration remain on their established catalog queries/stores.

### Import CLI Target Contract

Canonical command:

```bash
pnpm secrets:import -- \
  --source /absolute/path/to/assignments \
  --database-url file:/absolute/path/to/application.db \
  --dry-run
```

The root PNPM entrypoint accepts zero or one leading separator and normalizes it before the Node CLI. The CLI then:

1. requires exactly one `--source` and one `--database-url`;
2. rejects an empty, duplicate, relative, non-`file:`, non-SQLite, malformed, or non-canonicalizable database URL before reading selected values or accessing a target;
3. calls `ApplicationDatabaseLocation.fromAbsoluteFileUrl()` once, discards the raw URL as an authority, constructs one `ImportRequest` with the resulting immutable `targetLocation`, and passes only that typed location unchanged through preview/display/confirmation/execution;
4. never initializes AppConfig and never reads target selection from `.env`, `.env.test`, parent `process.env`, source assignments, or the working directory;
5. derives the adjacent root-key path from the canonical DB path rather than accepting another argument;
6. shows the canonical DB identity/fingerprint and lifecycle state on dry-run and again immediately before the exact `IMPORT` confirmation;
7. revalidates that the execution location equals the confirmed canonical identity before migration/bootstrap/write.

The supported SQLite database URL is non-secret target configuration; no general network/database credential URL is accepted through this command. Stable option failures include `IMPORT_DATABASE_URL_REQUIRED`, `IMPORT_DATABASE_URL_DUPLICATE`, `IMPORT_DATABASE_URL_INVALID`, and `IMPORT_DATABASE_URL_NOT_ABSOLUTE`. They contain no source value or environment dump.

### Import Preview Lifecycle And Race Contract

`SecretVaultInspectionService` is an internal, capability-specific service, not a runtime backend, Store profile, or operator-selectable read-only mode. It receives only the canonical `ApplicationDatabaseLocation` and the importer-authorized `SecretId` set.

| Observed target | Inspection behavior | Preview target state | Per-ID observed status / planned action |
|---|---|---|---|
| Database absent and adjacent key absent | Filesystem existence/security checks only; do not create either path | `INITIALIZATION_REQUIRED` | `MISSING / CREATE` |
| Existing application DB either predates the secret tables, or has both complete migrated secret tables with zero metadata/entries; adjacent key is absent or is one valid secure 32-byte interrupted-initialization key | Open SQLite read-only/query-only; inspect schema/zero-row invariants and, when present, key safety/length only | `INITIALIZATION_REQUIRED` | `MISSING / CREATE` |
| Complete current schema, singleton metadata, secure key, and valid verifier | Read the existing key only into protected transient memory, verify it, then query exact entry existence read-only | `READY` | absent -> `MISSING / CREATE`; present + no overwrite -> `CONFIGURED / SKIP_CONFIGURED`; present + overwrite -> `CONFIGURED / REPLACE` |
| Metadata without key, entries without metadata, incomplete tables, unsafe/symlink/invalid key, verifier mismatch, unsupported format/version, or read failure | Do not repair, migrate, create, chmod, delete, or fall through to another target | Exact value-free closed state (`LOCKED`, `CORRUPT`, `INCOMPATIBLE`, or `UNAVAILABLE`) | `UNAVAILABLE / BLOCKED` for every selected ID |

Inspection opens no nonexistent file, uses SQLite read-only/query-only flags for an existing database, never runs Prisma migration/bootstrap, and never writes a journal, metadata row, key, permission, or application setting. The root key may be read only for verifier confirmation on a complete current target; its bytes never cross the service result and are cleared best-effort.

Preview output contains only canonical DB identity (path or stable fingerprint), target state/instruction code, ordered `SecretId` values, observed status, planned action, and aggregate planned counts. It contains no source value, key path/bytes, ciphertext, provider validation result, raw SQLite/crypto cause, or ignored-line metadata. A closed preview exits nonzero, shows `BLOCKED`, and never offers confirmation.

Preview is an observation, not a write reservation. Confirmed execution:

1. revalidates canonical target identity and lifecycle;
2. performs normal migration/bootstrap only in the execution path when the previewed target was initialization-required;
3. begins the normal write transaction and re-queries every selected entry;
4. applies conditional create/skip when overwrite is false, so a concurrent create is never replaced;
5. applies replace only when `--overwrite` was explicit;
6. aborts value-free before entry mutation if target schema/pair/health changed to a closed state; and
7. reports actual transaction counts, which may safely differ from planned counts when entry existence changed after preview.

This recheck makes the no-overwrite guarantee authoritative without pretending that a dry-run locks the database.

## Interface Boundary Check

| Interface | Singular responsibility | Explicit identity | Ambiguity risk | Corrective action |
|---|---|---|---|---|
| DB location | Yes | Yes | Low | One typed result used everywhere. |
| Secret service consumer methods | Yes | Yes | Low | Keep generic secret read API absent. |
| Provider API-key resolver | Yes | Yes | Low | Optional slot has canonical default `apiKey`. |
| Gemini runtime resolver | Yes | Yes | Low | One no-argument function returns the exact active non-secret union. |
| API-key Settings read | Yes | Yes | Low | One provider subject per group; the query selection stays screen-tight while established schema types and other catalog consumers remain. |
| Gemini commands | Yes | Yes | Low | Separate save/activate/remove and truthful compound result. |
| Import command | Yes | Yes | Low | Require one explicit database URL; reject profiles, named targets, key-path overrides, and ambient inference. |
| Test bootstrap | Yes | Yes | Low | Fixed `.env.test` template; fixed-key runtime `.env` materialization; ignored root; actual server; no scenario data. |

## Main Domain Subject Naming Check

| Subject | Proposed name | Natural/self-descriptive | Drift risk | Corrective action |
|---|---|---|---|---|
| Credential identity | `SecretId` | Yes | Low | Remove `Definition` naming. |
| Encrypted records | `SecretEntry` | Yes | Low | Do not call model/provider config. |
| Domain metadata | `SecretEncryptionMetadata` | Yes | Low | Keep singleton purpose explicit. |
| Service | `SecretManagementService` | Yes | Low | No `Backend`/`StoreConfiguration` suffix. |
| Persistence | `SecretVaultPrismaRepository` | Yes | Low | Only table operations. |
| Root key | `SecretRootKeyFile` | Yes | Low | Only filesystem lifecycle. |
| Resolver | `ProviderApiKeyResolver` | Yes | Low | No plural bag/context. |
| Gemini runtime function | `GeminiRuntimeResolver` | Yes | Low | Separate from API-key custody and generic model config. |
| Gemini setting | `GeminiSetupMode` | Yes | Low | Values are explicit product names. |

## Existing Capability / Subsystem Reuse Check

| Need | Existing capability | Decision | Why |
|---|---|---|---|
| DB selection | `AppConfig` | Extend | Already authoritative and used by Electron/migrations/Prisma. |
| Schema change | Prisma migration pipeline | Reuse | Correct application DB owner. |
| Secret value wrapper | core `SecretValue` | Reuse | Trusted reveal boundary already exists. |
| Provider construction | existing LLM/media factories and provider clients | Extend | Minimal dependency injection, no new orchestrator. |
| Provider/model availability | built-in/model catalog services | Extend | Existing product owner; remove status dependency. |
| Gemini non-secret config | `AppConfig` + Gemini service/helper | Extend | No new generic settings subsystem. |
| Import file trust/ACL | current source reader and Windows ACL utility | Reuse | Evidence-backed and independent of Store target. |
| Custom metadata | current v2 JSON store | Reuse | Already secret-free and current. |
| Electron diagnostics | current logger/status/log viewer | Extend | Existing user-visible owner. |
| Deterministic/real tests | current Vitest/live-E2E infrastructure | Extend/replace | Keep temporary deterministic DBs, add one actual-server bootstrap, move scenario policy into code, and remove the harness-only Store path. |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spines | Decision | Notes |
|---|---|---|---|---|
| Configuration/database | canonical DB and non-secret Gemini settings | UC-001,005,008,010,016,018 | Extend | One location type. |
| Secret management | vault lifecycle, identity, crypto, persistence, importer, and internal create-only migration batch | UC-001,003,004,007,008,012,015 | Replace current subsystem internals | No runtime backend module or historical parser. |
| App-data migration | fixed custom-provider-v1 transformation and destructive-reset orchestration | UC-007 | Extend existing owner | Historical schema knowledge ends here; normal store remains v2-only. |
| LLM/media core | model factories, provider clients, resolver port | UC-002,004,005,015 | Extend | No model auth fields/context. |
| LLM management | provider-centric Settings read, catalogs, Gemini config, metadata | UC-002,003,005–007,015 | Extend/retighten | Reuse existing provider/model contracts; remove duplicate Settings authority. |
| Runtime management | Claude/Codex/children | UC-012–014 | Reuse with narrow adapter updates | Preserve behavior/exclusions. |
| Web Settings | one provider-group collection and Gemini UI | UC-002,003,005 | Extend | Reuse generated provider/model types; no duplicate credential map. |
| Test support | immutable test env/bootstrap/scenario registry/actual-server runner/scanner | UC-010,011,017,018 | Replace config and execution contract | One DB per environment; normal server/API lifecycle. |
| Electron/delivery | isolated packaged lifecycle/logging | UC-016,018 | Extend | No production-data disturbance. |

## Draft File Responsibility Mapping

| Candidate file | Subsystem | Owner/boundary | Concern | Why one file | Shared structure |
|---|---|---|---|---|---|
| `config/application-database-location.ts` | Configuration | AppConfig | Parse/canonicalize SQLite URL/path/derived key | One physical identity concern | `ApplicationDatabaseLocation` |
| `secret-management/domain/secret-id.ts` | Secret | Domain | Branded ID + consumer identity | One identity concern | `SecretId` |
| `secret-management/domain/secret-vault-types.ts` | Secret | Domain | Health/status/errors | One value-free contract | Health/error union |
| `secret-management/catalog/provider-credential-catalog.ts` | Secret | Authorization | Subject/provider/slot mapping | One policy table | `SecretConsumerIdentity` |
| `secret-management/persistence/secret-vault-prisma-repository.ts` | Secret | Persistence | Metadata/entry/batch transactions | One repository owner | Prisma models |
| `secret-management/crypto/secret-vault-crypto.ts` | Secret | Crypto | KDF/AES/verifier | One cryptographic policy | Encrypted payload |
| `secret-management/root-key/secret-root-key-file.ts` | Secret | Filesystem | Key identity/create/read/clear | One filesystem policy | DB location |
| `secret-management/bootstrap/secret-vault-bootstrap.ts` | Secret | Bootstrap | Pair state machine | One lifecycle owner | Health/result |
| `secret-management/services/secret-management-service.ts` | Secret | Authoritative service | Lifecycle operations | One subject boundary | Catalog/repo/crypto |
| `secret-management/services/secret-vault-inspection-service.ts` | Secret | Preview inspection | Read-only existing-state/verifier/entry classification | One command-specific non-mutating service | Import inspection/result |
| `secret-management/secret-vault-runtime.ts` | Secret | Composition lifecycle | Hold/close required service | One process lifecycle | Service |
| `secret-management/resolution/secret-management-provider-api-key-resolver.ts` | Secret | Adapter | Core port -> authorized consumer | One adapter | Provider slots |
| `app-data-migrations/migrations/custom-provider-v1-app-data-migration.ts` | App-data migration | Historical transition owner | Validate fixed v1, orchestrate staged v2/create-only batch/publish or failed-migration deletion, emit sanitized outcome | One required historical transformation/reset | Migration outcome + exact mapping |
| `llm-management/llm-providers/stores/custom-llm-provider-store.ts` | LLM management | Current custom-provider store | Missing-as-empty current v2 list/create/delete only | One current storage concern | Current v2 config |
| importer files | Secret | Import service | Input trust, mapping, plan, command | Separate concrete concerns | Import types |
| `llm-management/llm-providers/domain/models.ts` | LLM management | Existing provider domain | Add only the internal `ProviderSettingsGroup` composition shape if needed; reuse current provider/model records | Existing domain owner | `LlmProviderRecord`, current model records |
| `llm-management/llm-providers/services/llm-provider-service.ts` | LLM management | Existing provider owner | Add `listProviderSettings(runtimeKind)` exact-ID composition over existing provider/catalog owners | Extends established owner; no new service | Existing provider/model contracts |
| `llm-management/services/gemini-configuration-service.ts` | LLM settings | Gemini owner | Save/remove/activate/status | One configuration subject | Gemini unions |
| `llm-management/services/gemini-runtime-resolver-adapter.ts` | LLM composition | Gemini adapter | Expose the selected value-free runtime through the core function port | One composition concern | `GeminiRuntimeResolver` |
| `secrets/provider-api-key-resolver.ts` | Core provider | Credential port | Storage-neutral provider/optional-slot key resolution | One narrow capability | `ProviderApiKeySlot`, `SecretValue` |
| `utils/gemini-runtime.ts` | Core provider | Gemini runtime port | Tight mode/config union plus resolver function type | One provider-specific value contract | `GeminiRuntimeSelection` |
| `utils/gemini-helper.ts` | Core provider | Gemini provider | Exact runtime selection/client construction | One provider policy | Gemini runtime config |

## Reusable Owned Structures Check

| Repeated structure/logic | Shared file | Owner | Why shared | Redundant attributes removed | Overlap removed | Must not become |
|---|---|---|---|---|---|---|
| DB URL/path/key identity | `application-database-location.ts` | Config | Migration/vault/import/test need exact same identity | Yes | Yes | New deployment selector |
| Secret identity/consumer | `secret-id.ts` | Secret domain | Settings/resolvers/import/Claude/search share authorization | Yes | Yes | Model auth metadata |
| Vault health/error | `secret-vault-types.ts` | Secret domain | UI/runtime/importer need stable value-free state | Yes | Yes | Backend-kind DTO |
| Import inspection | importer domain file | Import/inspection services | Preview and tests share exact target/status/action states | Yes | Yes | Runtime access mode or write authority |
| Provider slot type | core `provider-api-key-resolver.ts` | Core | All providers share default API-key slot semantics | Yes | Yes | Provider metadata registry |
| Gemini mode/config | core `gemini-runtime.ts` + server adapter | Gemini owner | LLM/audio/image/video must construct identically | Yes | Yes | Generic construction context or API-key resolver expansion |
| Provider configured fact | existing `LlmProviderObject`/generated web type | Provider Settings | `apiKeyConfigured` is computed once by the exact provider owner | Yes | Yes | Vault-health/instruction wrapper or catalog-derived credential state |
| Provider Settings grouping | `ProviderSettingsGroup` | API-key Settings | One provider plus four named existing model lists | Yes | Yes | Replacement provider/model domain types or client merge authority |
| Custom-provider migration mapping/outcome | migration file + existing app-data migration result | App-data migration | Migration and tests share exact preserved-ID/status semantics | Yes | Yes | Runtime v1 union, generic migrator, or provider availability DTO |
| Import plan/error | importer domain file | Import service | CLI/tests share exact contract | Yes | Yes | Store target abstraction |

## Shared Structure / Data Model Tightness Check

| Structure | One meaning/field | Redundant fields removed | Overlap risk | Corrective action |
|---|---|---|---|---|
| `ApplicationDatabaseLocation` (`databaseUrl`,`databasePath`,`rootKeyPath`) | Yes | Yes | Low | Test/production safety classification belongs to the invoking test/import command, not this physical identity value. |
| `SecretEntry` | Yes | Yes | Low | No provider/model/display/validity columns. |
| `SecretEncryptionMetadata` | Yes | Yes | Low | Singleton only; no repeated secret fields. |
| `SecretConsumerIdentity` | Yes | Yes | Low | Subject/provider/slot explicit; no generic string selector. |
| `ProviderApiKeyResolver` | Yes | Yes | Low | Keep storage/backend IDs out. |
| `GeminiRuntimeSelection` | Yes | Yes | Low | Discriminated union; project/location only on project variant. |
| `GeminiRuntimeResolver` | Yes | Yes | Low | Function type only; no service locator, environment read, key/status field, or model identity. |
| `ProviderSettingsGroup` | Yes | Yes | Low | Exactly one existing `LlmProviderObject` and four named non-null existing `ModelDetail` lists. |
| `LlmProviderObject` | Yes | Yes | Low | Reused established provider identity/custom contract; `apiKeyConfigured` is the sole general credential fact. |
| `ModelDetail` | Yes | Yes | Low | Reused established catalog model; GraphQL selection sets keep each consumer's payload tight. |
| `CustomProviderInput` / probe result | Yes | Yes | Low | Input is exactly name/base URL/transient key; result is only purpose-specific `{id,name}` discovery models. Type/runtime/input echoes are absent. |
| `CustomProviderV1MigrationOutcome` | Yes | Yes | Low | Exactly `MIGRATED|RECONFIGURATION_REQUIRED|RESET_UNAVAILABLE`; reuse existing app-data migration status outward and do not add provider/model status fields. |
| `GeminiSetupState` | Yes | Yes | Low | One query/command-result shape: active mode, two nullable configured booleans, nullable complete project configuration. No parallel operation/outcome fields. |
| `ImportTargetInspection` | Yes | Yes | Low | Target state plus per-ID observed status/planned action/counts only; no key bytes, ciphertext, arbitrary paths, or write handle. |
| `RawImportCliRequest` (`sourcePath`, `databaseUrl`, `dryRun`, `overwrite`) | Yes | Yes | Low | Exists only at the CLI boundary; source and DB URL are required raw operator inputs and no AppConfig/profile/key-path field exists. |
| `ImportRequest` (`sourcePath`, `targetLocation`, `dryRun`, `overwrite`) | Yes | Yes | Low | The CLI validates the absolute source and converts `databaseUrl` exactly once into one immutable `ApplicationDatabaseLocation`; downstream preview/confirmation/execution receive only `targetLocation`, never the raw URL or another target/path/key field. |
| `TestRuntimeConfiguration` | Yes | Yes | Low | Fixed launch-only fields and canonical locations; excludes credentials, Gemini mutable settings, scenarios, models, capabilities, and access modes. |

## Final File Responsibility Mapping

| File/path | Action | Owner | Concrete responsibility |
|---|---|---|---|
| `autobyteus-server-ts/prisma/schema.prisma` + new migration | Modify/Add | Application schema | Add the two exact vault models/constraints. |
| `src/config/application-database-location.ts` | Add | Config | Canonical SQLite location/key derivation for AppConfig plus strict absolute-file-URL construction for importer. |
| `src/config/app-config.ts` | Modify | Config | Use/expose typed DB location; validate/persist explicit Gemini settings; mask credentials. |
| `src/config/prisma-client-factory.ts`, `src/startup/migrations.ts` | Modify | DB composition | Consume canonical URL only. |
| `src/server-runtime.ts` | Modify | Startup | migrations -> vault bootstrap -> routes; close vault on shutdown. |
| `src/secret-management/domain/secret-id.ts` | Add/rename | Secret domain | `SecretId`, consumer identity, custom ID. |
| `src/secret-management/domain/secret-vault-types.ts` | Add/rename | Secret domain | Health/status/stable error contracts. |
| `src/secret-management/catalog/provider-credential-catalog.ts` | Rename/modify | Authorization | Exact current mapping. |
| `src/secret-management/persistence/secret-vault-prisma-repository.ts` | Add | Persistence | Prisma metadata/entry/batch operations. |
| `src/secret-management/crypto/secret-vault-crypto.ts` | Add/replace | Crypto | Exact approved cryptography. |
| `src/secret-management/root-key/secret-root-key-file.ts` | Add/replace | Filesystem | Derived-key security/lifecycle. |
| `src/secret-management/bootstrap/secret-vault-bootstrap.ts` | Add/replace | Bootstrap | First-init/verify state machine. |
| `src/secret-management/services/secret-management-service.ts` | Rewrite | Secret service | Authoritative lifecycle/authorization/reveal. |
| `src/secret-management/services/secret-vault-inspection-service.ts` | Add | Secret inspection | Non-mutating absent/pre-feature/ready/closed classification and batch entry-existence inspection for importer preview only. |
| `src/secret-management/secret-vault-runtime.ts` | Add | Composition | Process-local lifecycle, no selector. |
| `src/secret-management/resolution/secret-management-provider-api-key-resolver.ts` | Modify | Adapter | Subject-scoped core port implementation. |
| `src/secret-management/provisioning/local-import-credential-alias-registry.ts` | Modify | Import | Current aliases/new Google ID. |
| `local-environment-source-reader.ts`, import domain/service, CLI | Modify/rename | Import | Recognize-first one-DB workflow with required explicit `--database-url`, no AppConfig/ambient target inference, and normalized separator handling. |
| `src/app-data-migrations/migrations/custom-provider-v1-app-data-migration.ts` | Add | App-data migration | Fixed-path v1 validation, mapping, staged-v2/create-only-batch/publish or failed-migration deletion sequencing, stable result. |
| `src/app-data-migrations/app-data-migration-registry.ts` | Modify | App-data migration registry | Register the one required migration after vault initialization is available. |
| `src/llm-management/llm-providers/stores/custom-llm-provider-store.ts` | Rewrite/tighten | Current custom-provider persistence | Missing-as-empty current v2 list/create/delete; remove v1 runtime parsing and let the composition boundary omit non-current custom state. |
| `src/llm-management/llm-providers/domain/models.ts` | Modify if required | Provider domain | Add only the internal provider-settings group composition type; retain established provider/model records. |
| `src/llm-management/llm-providers/services/llm-provider-service.ts` | Modify | Provider lifecycle/settings read/custom state | Add `listProviderSettings(runtimeKind)` exact-ID composition, expose one `apiKeyConfigured` fact, retain commands/compensation, and remove four-array Settings aggregation, constant custom request fields, and input echoes. |
| `src/llm-management/services/gemini-configuration-service.ts` | Rewrite | Gemini settings | Explicit mode commands and one authoritative setup-state return; no parallel operation/outcome DTO. |
| `src/llm-management/services/gemini-runtime-resolver-adapter.ts` | Add | Gemini composition | Close over `GeminiConfigurationService.resolveActiveRuntime()` and implement the core function type. |
| `src/llm-management/services/model-metadata-provisioning-service.ts` | Modify | Metadata | Explicit mode strategy/provenance. |
| `autobyteus-ts/src/secrets/provider-api-key-resolver.ts` | Retain/tighten | Core port | Provider/optional slot only. |
| `autobyteus-ts/src/utils/gemini-runtime.ts` | Add | Core Gemini port/value | `GeminiRuntimeSelection` union and `GeminiRuntimeResolver` function type. |
| `autobyteus-ts/src/llm/llm-factory.ts` and provider clients | Modify | Core factories/providers | Ordinary three-argument API; exact optional Gemini resolver overload; lazy use. |
| `autobyteus-ts/src/utils/gemini-helper.ts` | Rewrite | Gemini provider | Consume explicit runtime selection; resolve only its selected slot; exact SDK shapes; no priority. |
| multimedia models/factories/Gemini clients | Modify | Core media | Same ordinary three arguments plus exact optional Gemini resolver overload. |
| `src/api/graphql/types/llm-provider.ts` | Modify | Transport | Retain current `ModelDetail`, restore vault-backed `LlmProviderObject.apiKeyConfigured`, add `ProviderSettingsGroup`/`providerSettings`, keep existing catalog fields for supported consumers, and remove `CredentialStatusObject`/duplicate Settings status queries. |
| `autobyteus-web/graphql/queries/llm_provider_queries.ts` | Modify | Web transport | Add one `GET_PROVIDER_SETTINGS` operation for the API-key page using tight selection sets; retain established catalog queries for other consumers. |
| `autobyteus-web/stores/llmProviderConfig.ts` / focused Settings state file | Retighten | Web catalog and Settings state | Keep existing catalog getters used elsewhere; replace the API-key page's four-array merge/`providerConfigs` authority with one `ProviderSettingsGroup[]`. |
| Provider API-key runtime/components, generated GraphQL types, and focused tests | Modify | Web API-key consumers | Consume one grouped row directly; retain existing `isCustom`, `baseUrl`, status, and model fields where the UI uses them. |
| Media defaults, runtime model selection, messaging/agent/history/workspace consumers and tests | Preserve/update imports only if schema generation requires | Web catalog consumers | Continue using established catalog contracts and behavior. |
| Gemini Vue components/store/localization/tests | Rewrite | Web Settings | Approved compact UI/behavior. |
| `autobyteus-server-ts/.env.test` | Add/track | Test launch configuration | Immutable launch-only `APP_ENV`, `DB_TYPE`, `DATABASE_URL`, and server host/port; no credentials or mutable Gemini settings. |
| `test-support/test-runtime/test-runtime-bootstrap.mjs` | Add | Backend-E2E runtime | Directly executable fixed-template validation, canonical ignored target, fresh/persistent root policy, fixed-key runtime `.env` materialization/reconciliation, allowlisted OS child launch, health/shutdown. |
| root/server package scripts, server `.gitignore`, live-E2E support | Modify | Test/operator | Keep `server:test`, `web:test`, `dev:test`, actual-server real E2E, isolated DB overrides, and scenario-in-code flow; remove the test-import wrapper/script and document the generic explicit-URL importer. |
| Electron data paths/runtime env/status/smoke support | Modify | Desktop/delivery | Isolated candidate root/port and full smoke. |
| README/module/Electron packaging docs | Modify | Documentation | One DB/key, importer, backup/reset/test flow. |

## Applied Patterns

- **Ports and adapters:** core `ProviderApiKeyResolver`, server vault adapter.
- **Repository:** secret-owned Prisma persistence only.
- **State machine:** first-init/established/closed vault bootstrap.
- **Discriminated union:** Gemini runtime configuration and vault health.
- **Curated-first enrichment:** base catalog plus optional metadata provenance.
- **Command separation:** Gemini save, activate, remove; importer preview, execute.
- **Isolated app-data migration:** fixed custom-provider v1 is transformed before current runtime; historical schema does not leak into the v2 store.
- **Compensating transaction:** exact same-process receipt repairs only the just-inserted unchanged batch if file publication fails.
- **Composition root:** server startup wires canonical DB, migration, vault, app-data migration, and routes.

## Target Subsystem / Folder / File Mapping

```text
autobyteus-server-ts/src/
  config/
    application-database-location.ts
    app-config.ts
    prisma-client-factory.ts
  app-data-migrations/
    migrations/
      custom-provider-v1-app-data-migration.ts
  llm-management/
    llm-providers/
      services/llm-provider-service.ts
      stores/custom-llm-provider-store.ts
    services/
      gemini-configuration-service.ts
      gemini-runtime-resolver-adapter.ts
      model-metadata-provisioning-service.ts
  secret-management/
    bootstrap/secret-vault-bootstrap.ts
    catalog/provider-credential-catalog.ts
    crypto/secret-vault-crypto.ts
    domain/secret-id.ts
    domain/secret-vault-types.ts
    persistence/secret-vault-prisma-repository.ts
    provisioning/
      local-environment-secret-import.ts
      local-environment-source-reader.ts
      local-import-credential-alias-registry.ts
      local-environment-secret-import-service.ts
    resolution/secret-management-provider-api-key-resolver.ts
    root-key/secret-root-key-file.ts
    services/secret-management-service.ts
    services/secret-vault-inspection-service.ts
    cli/import-local-environment-secrets.ts
    secret-vault-runtime.ts
    windows-exclusive-acl.ts
    index.ts

autobyteus-ts/src/
  secrets/
    provider-api-key-resolver.ts
  utils/
    gemini-runtime.ts
    gemini-helper.ts

autobyteus-web/
  graphql/queries/llm_provider_queries.ts  # established catalog queries + one providerSettings query
  stores/llmProviderConfig.ts  # retain catalog consumers; API-key view uses one ProviderSettingsGroup[]
```

## Folder Boundary Check

| Path/folder | Structural depth | Boundary clear | Risk | Justification |
|---|---|---|---|---|
| `config/` | Main-line configuration | Yes | Low | Existing owner; one new pure location file. |
| `app-data-migrations/migrations/` | Historical transition boundary | Yes | Medium | Extend the existing migration subsystem with the only v1 migrate-or-delete protocol; normal runtime remains current-only. |
| `secret-management/domain\|catalog` | Main-line domain/control | Yes | Low | Identity/policy separate from mechanisms. |
| `secret-management/services\|bootstrap` | Main-line control/lifecycle | Yes | Low | Service and startup are distinct concrete owners. |
| `secret-management/persistence\|crypto\|root-key` | Persistence/off-spine | Yes | Low | Three materially distinct mechanisms. |
| `secret-management/provisioning\|cli` | Operational boundary | Yes | Low | Parser/planner/entrypoint remain outside runtime service. |
| `llm-management` | Provider/catalog/Gemini application control | Yes | Medium | Retighten catalog/status responsibilities rather than create parallel subsystem. |
| `autobyteus-web/stores/llmProviderConfig.ts` Settings slice or one focused Settings store | API-key screen read/commands | Yes | Low | One `ProviderSettingsGroup[]`; established catalog state remains for other consumers. |
| `autobyteus-ts` provider folders | Core provider behavior | Yes | Low | Keep resolver port/provider-owned use near providers. |
| `test-support/live-e2e` | Test-only orchestration | Yes | Low | Scenario policy is code, not product config. |

The layout is intentionally compact: it exposes real boundaries without recreating a generic backend/module hierarchy.

## Concrete Examples / Shape Guidance

| Topic | Good example | Avoided shape | Why |
|---|---|---|---|
| Factory | `LLMFactory.createLLM(model, config, apiKeyResolver)` | model contains `authenticationRequirement`/`credentialProviderId` | Credentials are provider runtime dependencies, not model identity. |
| Gemini factory | `LLMFactory.createLLM(model, config, apiKeyResolver, geminiRuntimeResolver)` only when `model.provider === GEMINI` | generic dependency context or status-priority helper | The genuine provider-specific non-secret dependency stays explicit and tight. |
| API-key Settings read | `ProviderSettingsGroup { provider: LlmProviderObject, llmModels/audioModels/imageModels/videoModels: ModelDetail[] }` | four repeated provider arrays, another reduced provider/model DTO family, or client merge | Reuses working contracts while making provider/configuration authority singular. |
| API-key Settings commands | provider Save/Remove -> completion Boolean then canonical refetch; custom input `{name,baseUrl,apiKey}` -> Probe models/Create ID; every Gemini command -> `GeminiSetupState` | echoed provider ID/type/runtime/input or operation/outcome/instruction DTOs | The client already owns command identity/input; ordinary provider state comes from the canonical read and Gemini commands return their specialized authoritative state. |
| Secret use | provider lazily calls `resolver.resolve(OPENAI)` at SDK init | server pre-resolves into construction context/config | Minimizes exposure and machinery. |
| Gemini | explicit mode -> selected config -> selected slot -> exact SDK | check Vertex key/project/Gemini key priority | User intent is deterministic and visible. |
| Vault | App DB -> Prisma tables + adjacent key | application DB + second Store DB/config/access mode | One physical selector/lifecycle. |
| Import | absolute source + required absolute SQLite database URL -> recognized entries -> exact DB batch | source + target default/e2e, implicit AppConfig/parent-env selection, or arbitrary key paths | The explicit DB URL selects target; key path remains derived. |
| Backend E2E | immutable server-root `.env.test` -> one test bootstrap -> fixed keys materialized into ignored writable runtime `.env` -> unchanged actual built server/API/frontend; deterministic cases use fresh roots/DBs; real-provider/manual cases use the explicit persistent test root; scenarios stay in code | product server parses `.env.test`, JSON/second committed env/harness-only Store, or direct AppConfig writes into tracked `.env.test` | Conventional test-runner configuration, unchanged server contract, real lifecycle coverage, mutable-runtime separation, and one source of E2E-environment truth. |

## Backward-Compatibility Rejection Log

| Candidate mechanism | Why considered | Decision | Clean replacement/removal |
|---|---|---|---|
| Read old separate Store | Existing ticket data | Rejected | Reprovision/import into current application DB. |
| Alias old Google AI Studio ID | Existing stored/import mapping | Rejected | Exact new Google ID only. |
| Read API keys from `.env` when vault missing | Upgrade convenience | Rejected | Explicit importer/UI; legacy untouched. |
| Permanent custom-provider-v1 runtime reader or fail-the-page reconfiguration error | Upgrade convenience | Rejected | One fixed-path app-data migration attempts preservation; normal runtime is v2-only; failed preservation deletes legacy configuration and leaves the page usable for reconfiguration. |
| Keep backend selector for future cloud Store | Extensibility | Rejected | Introduce future backend only with new approved requirement. |
| Keep access mode for E2E | Test safety | Rejected | Isolated disposable test DB is writable. |
| Persist/infer Gemini mode by priority/save order | Compatibility | Rejected | Explicit user mode; missing is closed. |
| Compatibility exports for removed files/types | Reduce edits | Rejected | Update imports/tests/docs in same change. |
| Scenario manifest plus env | Incremental test change | Rejected | Scenario registry in code; env location only. |

## Derived Layering

```text
Transport/UI
  -> Provider/Gemini/Import application owners
    -> SecretManagementService / ModelCatalogService
      -> ProviderCredentialCatalog + VaultCrypto + PrismaRepository + RootKeyFile

Core provider runtime
  -> core ProviderApiKeyResolver port
    <- server adapter -> SecretManagementService
```

This is explanatory only. The authoritative boundaries are the ownership and encapsulation maps above.

## Change / Refactor Sequence

1. Lock the approved `SecretId` and consumer/alias mappings; update Google AI Studio ID.
2. Add canonical application-database location and tests; make migrations/Prisma/Electron/test commands consume the AppConfig-owned path and make the importer consume only the strict explicit absolute-URL path.
3. Add Prisma models/migration and the new repository/crypto/root-key/bootstrap/service/runtime plus the internal non-mutating inspection service behind tests.
4. Change startup order to migrate then bootstrap; configure denied DB/key paths; keep catalog APIs available under degraded vault health.
5. Add/register the fixed-path custom-provider-v1 app-data migration with its migrate-or-delete policy. Extend the secret service with the internal create-only batch/conditional compensation receipt, keep the current store v2-only/missing-as-empty, and contain custom listing failure before the assembled Settings result.
6. Rewire Settings, provider resolver, search, Claude managed mode, AutoByteus discovery, and current custom providers to the runtime service; rewire importer preview only to the inspection service and importer execution to normal bootstrap plus the runtime service.
7. Extend `LlmProviderService` with `listProviderSettings(runtimeKind)` and add `ProviderSettingsGroup`/`providerSettings` to the existing GraphQL provider file. Restore one vault-backed `apiKeyConfigured` fact on the established provider object; remove `CredentialStatusObject`, the separate status query, the API-key page's four-array aggregation/fallback/`providerConfigs` authority, and redundant command DTOs. Keep existing catalog queries and `ModelDetail` for their supported consumers; only the API-key page moves to the grouped read.
8. Implement explicit Gemini mode commands and compact approved UI around the one `GeminiSetupState`; replace implicit priority and parallel outcome fields; preserve exact SDK and metadata policies.
9. Add immutable tracked non-secret `autobyteus-server-ts/.env.test` and `TestRuntimeBootstrap`; add `server:test`, `web:test`, and `dev:test`; materialize/reconcile fixed launch keys into only an ignored ordinary runtime `.env`; keep actual server/AppConfig `.env`-only; remove the live-E2E manifest, harness-only Store path, and test-import target wrapper without adding another committed config; keep deterministic fresh-root/temporary-DB overrides; move scenarios/assertions to code; and update the generic explicit-URL importer, runners, and cleanup.
10. Add isolated packaged Electron root/port/smoke and value-safe failure/log proof.
11. Remove every second-Store/backend/access-mode/target/manifest/old-ID/implicit-mode file and import; update docs.
12. Run structural scans, unit/integration/build/frozen install, one-DB restart, real providers, Docker, packaged Electron, and cleanup/evidence scans.
13. Reconcile preserved downstream dirty work only against this reviewed package; do not retain superseded code for convenience.

No temporary dual runtime path is allowed. Implementation may stage files locally, but the reviewed commit must contain only the clean target.

## Key Tradeoffs

- **One DB simplifies configuration and consistency** but makes DB + key backup/reset inseparable and adds secret tables to ordinary schema ownership.
- **External root key protects DB-only disclosure** but not a same-user compromise with access to both files; assurance remains `LOCAL_HARDENED`.
- **Provider-owned point-of-use resolution minimizes exposure and code changes** but requires explicit resolver injection at every supported construction surface.
- **One provider-centric API-key transport strengthens identity coherence with less new machinery**; it reuses existing provider/model types and selection sets, while the API-key page changes from four repeated collections to one grouped collection.
- **Explicit Gemini mode removes ambiguity** but requires users upgrading from implicit behavior to choose a mode once.
- **One isolated custom-provider-v1 migration preserves normal upgrades** while keeping runtime v2-only; its rare unsafe/failure path deletes the legacy configuration and chooses availability plus explicit frontend reconfiguration over silent overwrite or a blocked application.
- **Scenario registry in code reduces operator configuration** but scenario changes require code review rather than JSON edits.

## Risks

1. Incorrect relative `DATABASE_URL` resolution could split Prisma and key identity; one typed location and cross-surface tests are mandatory.
2. A crash during first key/domain initialization must not regenerate over established data; the approved state matrix must be exact.
3. Custom-provider migration/create/delete span JSON metadata plus the application DB and are not one physical transaction. Migration requires staged publish, create-only batch, exact same-process compensation, interruption/collision reset, and no partial v2; current create/delete retain bounded compensation and idempotent delete. No post-creation update surface is introduced.
4. API-key read composition could grow back into a kitchen-sink provider/catalog DTO, synthesize providers from orphan models, or reintroduce duplicate client credential state; exact schema, field-use, exact-ID, GraphQL/Apollo, and empty-credential UI tests must catch it.
5. Gemini clients across LLM/audio/image/video could drift; one shared helper/config union and constructor matrix are mandatory.
6. Changing active Gemini mode cannot mutate already in-flight SDK clients; activation governs new client initialization/operations, while in-flight operations complete under their captured client.
7. Tests or packaged smoke could target production data; absolute isolated root/port validation and cleanup fences are mandatory.
8. Errors/logs can leak provider/DB/crypto details; stable codes and evidence scanners remain mandatory.
9. Failed migration intentionally deletes the plaintext legacy file. This accepted configuration loss avoids hidden retained plaintext and is covered by explicit frontend reconfiguration behavior.
10. Current dirty downstream source/tests may contain superseded assumptions; implementation must reconcile, not merge blindly.

## Guidance For Implementation

- Prefer deleting code over adapting the second Store.
- Keep production files small and responsibility-specific; do not introduce `Manager`, `Context`, `Backend`, or `Helper` abstractions without a concrete owner in this spec.
- Use Prisma migration/transactions for vault tables; do not open the application DB through a parallel SQLite library.
- Keep plaintext in `SecretValue`/short-lived buffers and reveal only at SDK/client/import encryption boundaries.
- Never log request objects, environment objects, source lines, plaintext lengths, ciphertext/key bytes, or raw causes on secret paths.
- Update every provider/client call site and retain existing model/config/factory behavior other than credential source.
- Keep every v1 parse/type branch inside `CustomProviderV1AppDataMigration`; do not add v1 knowledge to `CustomLlmProviderStore`, GraphQL, runtime sync, or provider clients.
- Migration must catch/sanitize internal causes before the generic app-data runner writes status/logs; only IDs, counts, and stable codes may escape.
- Treat catalogs as available product data before optional status or live metadata; custom-provider omission/reset must not reject built-ins or New Provider.
- Keep `LlmProviderService.listProviderSettings()` as the single application composition owner; GraphQL only maps the result and the web consumes it directly. Do not add another read service or provider/model DTO family.
- Reuse generated `LlmProviderObject`/`ModelDetail`, restore only vault-backed `apiKeyConfigured`, remove the security-specific credential-status wrapper and old API-key merge/maps, and do not repair the old response through Apollo policies or array-order merges.
- Preserve `LLMFactory(model, config, apiKeyResolver)` as the ordinary provider shape; any Gemini non-secret configuration seam must remain specialized and must not recreate a generic construction context.
- Generate GraphQL types after schema changes; do not hand-maintain stale parallel shapes.
- Remove stale tests whose only purpose is backend/access-mode/target compatibility; replace them with vault, resolver, UI, one-DB, and realistic lifecycle tests.
- Keep `EXT-ANTHROPIC-AGENT-SDK-AUTH` as delivery/release recheck only; do not redesign either Claude mode.
