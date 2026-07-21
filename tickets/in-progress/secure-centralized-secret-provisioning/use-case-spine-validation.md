# Use-Case Spine And Design-Principles Validation

## Artifact Metadata

- Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/use-case-spine-validation.md`.
- Purpose: re-derive the target architecture from every approved use case, validate complete data-flow spans and ownership, apply the product-reachability gate, and retain/remove proposed data attributes according to actual spine needs.
- Scope: UC-001 through UC-017; REQ-001 through REQ-018; AC-001 through AC-018.
- Status: `User Approved — AR-007 / MP-002 Evidence Reassessment; Architecture Re-review Requested`.
- Approval applicability: `Required`; this supplement constrains intended architecture and removes unsupported design elements.
- Core artifacts supported: [requirements.md](./requirements.md), [investigation-notes.md](./investigation-notes.md), [design-spec.md](./design-spec.md).
- Related supplements: [secret-storage-architecture.md](./secret-storage-architecture.md), [secret-storage-backend-contract.md](./secret-storage-backend-contract.md), [credential-consumer-mapping.md](./credential-consumer-mapping.md), [live-test-secret-provisioning.md](./live-test-secret-provisioning.md), [threat-model-and-option-analysis.md](./threat-model-and-option-analysis.md).

## Validation Method

The audit applies the shared design principles in this order:

1. start from each approved use case and its supported/current or approved target trigger;
2. draw a primary spine from initiating surface through the authoritative owner and critical dependency to the meaningful outcome;
3. add return/event and bounded-local spines where they materially shape behavior;
4. assign concrete ownership to every main-line node and move lookup, mapping, validation, redaction, persistence, and translation off the main line unless they own sequencing;
5. apply the authoritative-boundary rule so callers cannot depend on both an outer service and its backend/repository;
6. apply the product-reachability gate to every proposed field, state, failure, and recovery mechanism;
7. retain only data attributes consumed or produced on a verified spine, an approved security/operational contract, or an isolated migration boundary;
8. derive interfaces and files after the spine and ownership decisions.

## Second Design-Principles Audit (2026-07-21)

The user requested a second, explicit audit before architecture re-review. The audit re-read the canonical design principles rather than relying on the first pass and checked all 17 use cases, the 24 inventoried spines, every proposed shared structure, and the final file mapping.

| Audit Dimension | Result | Evidence / Correction |
| --- | --- | --- |
| approved behavior and production reality | Pass | UC-001–UC-016 retain the approved basis; the user selected and authorized re-review of UC-017's exact `cli` and `managed-secret` behavior |
| use-case spine completeness | Pass | UC-001–UC-017 each has at least one full initiating-surface-to-outcome path; UC-002 and UC-008 have separate business paths rather than one compressed generic path |
| span sufficiency | Pass | every primary path includes the initiating surface, orchestration, authoritative boundary, critical custody/provider mechanism, and meaningful result; return and bounded-local paths supplement rather than replace it |
| ownership and authoritative boundaries | Pass | subject services use `SecretManagementService`; only backend implementations access custody; Claude session/catalog callers use `ClaudeSdkClient` and cannot reach authentication or storage internals |
| off-spine placement | Pass after refinement | UC-008 composite management/backend nodes were split; UC-008 and UC-013 now state their owners explicitly; catalog, repository, redaction, path composition, and migration remain attached to named owners |
| data tightness | Pass after refinement | status shapes are discriminated so non-ready health cannot coexist with definition state; unused `definitionId`, `messageCode`, and `retryable` status fields are removed |
| reuse without generalization | Pass | one management boundary, backend port, secret-safe value, LLM construction contract, launch policy, conformance suite, and live manifest are reused; provider/search/media/metadata/Claude behavior remains specialized |
| shared-base overreach | Pass | no generic runtime option bag, generic provider provisioning service, generic Store selector/profile, vendor-placeholder configuration, or caller-visible physical address is introduced |
| persisted-data transition | Pass | legacy plaintext/custom-provider transformation is isolated in `SecretCustodyMigration`; current runtime accepts only the current secret-free schema and never dual-reads |
| clean-cut removal | Pass | environment readers, plaintext fields, cross-Store copy/fallback, Claude ambient modes/caller env, compatibility wrappers, daemon/IPC, and profile machinery are explicitly removed |
| folder and file proportionality | Pass | files follow concrete owners; Local crypto/repository/initialization split reflects distinct persistence responsibilities without creating another process or executable package |
| product reachability | Pass | retained failures and controls have supported operational/security witnesses; speculative tenancy/profile/CAS/hot-swap/vendor behavior remains excluded |

No further subsystem, coordinator, compatibility layer, profile abstraction, runtime configuration bag, or backend-specific resolver is justified. The refinements above reduce, rather than expand, the implementation surface.

## Audit Verdict

The central architecture remains coherent after the round-1 requirement-gap tightening:

```text
subject-specific caller/service
  -> SecretManagementService
  -> one physical-location/namespace-bound SecretStorageBackend
  -> selected custody implementation
```

The audit found and removed speculative structure that did not have an approved product path:

- generic `organizationId`, `deploymentId`, `environmentId`, `nodeId`, and `sharing` fields;
- caller-visible `SecretScope`, `scopePath`, and generic physical backend address fields;
- a Local Store `connectionName`/alias and caller Store selector: trusted startup supplies exact paths, while runtime callers remain Store-agnostic;
- expected-version/CAS input on ordinary Settings lifecycle operations;
- separate management `create` versus `replace` commands: the supported Settings journey is one save action, so the target uses atomic save (create-or-replace);
- runtime `ResolvedSecret.version` and `resolvedAt` attributes plus the unrequired global client-cache design;
- duplicated status attributes such as `version`, `updatedAt`, `backendKind`, and `reprovisionRequired`;
- every cross-Store copy method and source/default Store dependency; first-delivery setup is constructed with only the writable E2E target and accepts dedicated credentials directly;
- overlapping `writable` and `externallyManaged` booleans; one tagged lifecycle capability replaces them;
- `requestedAssuranceTier` as configuration; assurance is derived from verified controls, not requested by a config value;
- legacy aliases and provider validation policy from the current runtime catalog; aliases stay migration-owned and validation stays subject-owned.
- duplicate resolution input (`consumer identity` plus expected definition ID) and a pass-through binding resolver; `SecretManagementService` now owns catalog lookup and backend resolution behind one entrypoint.
- a Local Store daemon/launcher/IPC protocol: the same-user boundary did not add meaningful isolation and the server already owns backend lifecycle;
- arbitrary named profiles and their table/identity/lifecycle: the approved default and real-E2E contexts use physically separate databases and keys instead.
- concrete enterprise adapter classes/configuration discriminants: first delivery registers Local only in product and InMemory in tests; the extension contract remains without placeholder implementations.
- Claude-specific resolution APIs, ambient `auto`/raw `api-key` selection, caller-provided SDK environments, and settings/tool paths that could propagate a managed child credential. The exact managed Claude runtime consumer instead reuses the existing generic management boundary.

## Complete Use-Case Spine Inventory

| Spine ID | Use Case | Scope | Start | Meaningful End | Governing Owner | Span Check |
| --- | --- | --- | --- | --- | --- | --- |
| `DS-UC001` | UC-001 built-in provider lifecycle | Primary End-to-End | direct/Electron Settings | stored/removed credential status in selected backend location | `LlmProviderService` for use case; `SecretManagementService` for lifecycle | Pass — UI, transport, subject owner, authoritative boundary, custody, return state |
| `DS-UC002A` | UC-002 custom provider create | Primary End-to-End | custom-provider editor | metadata-only provider and credential-backed model catalog | `LlmProviderService` | Pass — probe, identity allocation, metadata/secret transaction, runtime sync, UI result |
| `DS-UC002B` | UC-002 custom provider delete | Primary End-to-End | delete action | provider and derived credential absent; catalog refreshed | `LlmProviderService` | Pass |
| `DS-UC003` | UC-003 backend configuration | Primary End-to-End | deployment/startup or Settings config | active startup backend or validated saved configuration with restart-required status | `SecretStorageConfigurationService` | Pass |
| `DS-UC004` | UC-004 local backend bootstrap | Primary End-to-End | Electron/direct/normal Docker/single Kubernetes server Pod/test server start | management/provisioning services ready with in-process Store-bound Local backend | server bootstrap composer | Pass |
| `DS-UC005` | UC-005 physical Local Store lifecycle | Primary End-to-End | writable initialization or read-only open | pair verifier authenticated and Store ready, or exact value-free health failure | `LocalSecretStorageBackend` | Pass |
| `DS-UC006A` | UC-006 direct real-E2E Store provision | Primary End-to-End | trusted hidden input | encrypted E2E record and value-free status | `LocalSecretStoreProvisioningService` | Pass |
| `DS-UC007` | UC-007 LLM construction/invocation | Primary End-to-End | agent/run LLM request | provider response/stream returned to run | `LLMProvisioningService` until construction; concrete LLM for request | Pass |
| `DS-UC008A` | UC-008 search | Primary End-to-End | Search tool invocation | normalized real search result | `SearchProvisioningService` / injected executor | Pass |
| `DS-UC008B` | UC-008 media | Primary End-to-End | media generation service/tool | provider-produced media result | `MediaClientProvisioningService` | Pass |
| `DS-UC008C` | UC-008 live metadata | Primary End-to-End | model catalog enrichment/reload | refreshed catalog or value-free enrichment status | `ModelMetadataProvisioningService` | Pass |
| `DS-UC009` | UC-009 deterministic testing | Primary Operational | default test command | deterministic assertions and sanitized artifacts | package test harness | Pass |
| `DS-UC010` | UC-010 real-provider host-worktree testing | Primary Operational | real test command in fresh host worktree | sanitized evidence from real provider behavior | live E2E harness | Pass |
| `DS-UC011` | UC-011 Local backend concurrency/reset | Bounded Local / Startup | backend open or explicit exact-Store reset | ready in-process handle or one Store deleted safely | `LocalSecretStorageBackend` / exact-Store reset owner | Pass — bounded local spine supplements UC-004/UC-010 |
| `DS-UC012` | UC-012 container deployment/extension | Primary End-to-End | Docker/single-Pod startup or future kind configuration | node-local Local Store ready, or unregistered kind rejected without fallback | server deployment composition | Pass |
| `DS-UC013` | UC-013 capability-aware Settings | Primary End-to-End | Settings opens backend/provider state | lifecycle controls enabled or deployment guidance displayed | `SecretStorageConfigurationService` for backend capability projection | Pass |
| `DS-UC014` | UC-014 first-delivery agent hardening | Primary End-to-End | agent run provisioning | sanitized result plus verified `LOCAL_HARDENED` state | `AgentExecutionSecurityContext` and launcher | Pass |
| `DS-UC015` | UC-015 legacy cutover | Startup / Migration | first post-upgrade server start | current secret-free schema validated before runtime | `SecretCustodyMigration` | Pass |
| `DS-UC016` | UC-016 backend conformance | Primary Operational | adapter conformance test | assertions against declared capability behavior | reusable backend conformance suite | Pass |
| `DS-UC017` | UC-017 Claude authentication cutover | Primary End-to-End | Claude model-discovery/run authentication selection | CLI-authenticated result, managed-secret result, or exact value-free failure | `ClaudeRuntimeAuthenticationService`; `ClaudeSdkClient` owns child delivery/spawn | Pass — initiating caller, explicit mode owner, authoritative secret boundary when applicable, exact child, result/failure |
| `DS-RET001` | UC-001/002/003/005/006/011/013/016 status return | Return-Event | backend/Store operation outcome | exact health plus healthy-only definition state | owner of initiating use case | Pass |
| `DS-RET002` | UC-007/008/010/012/017 provider return | Return-Event | provider/runtime response/error | normalized product/test result | concrete client plus initiating use-case owner | Pass |
| `DS-LOC001` | UC-001/005/006/011 Local Store encrypted record save | Bounded Local | validated exact record command | atomically committed ciphertext and status | `LocalEncryptedSecretRepository` | Pass — crypto/persistence stays inside in-process Local backend |
| `DS-LOC002` | UC-011 explicit exact-Store reset | Bounded Local | explicit Store-target confirmation | selected database/key/SQLite sidecars deleted after handles close | Local Store reset owner | Pass — destructive path cannot race open writer |

## Per-Use-Case Spines And Ownership Validation

### UC-001 — Built-In Provider Credential Lifecycle

Primary spine:

```text
ProviderApiKeyEditor
  -> LLM provider Pinia action
  -> provider-specific GraphQL mutation
  -> LlmProviderService
  -> SecretManagementService
  -> active writable SecretStorageBackend
  -> selected custody record
```

Return spine:

```text
backend outcome
  -> SecretManagementService value-free ManagedSecretStatus
  -> LlmProviderService composes provider-owned validation state
  -> GraphQL
  -> Pinia/UI configured or error state
```

- Supported trigger/evidence: existing direct/Electron provider Settings and `setLlmProviderApiKey` path.
- Governing owner: `LlmProviderService` coordinates the provider use case; `SecretManagementService` remains authoritative for secret lifecycle.
- Data required: provider ID/credential slot, transient `SecretValue`, operation (`save` or `remove`), resulting storage state and subject-owned validation state.
- Data not justified: application-user identity, organization/deployment scope, expected version, concrete backend path, saved value readback.

### UC-002 — Custom Provider Lifecycle

Create spine:

```text
CustomProviderEditor
  -> GraphQL create command
  -> LlmProviderService normalize/validate metadata
  -> OpenAI-compatible discovery probe using transient input
  -> allocate provider ID
  -> CustomLlmProviderStore writes metadata-only record
  -> SecretManagementService saves the custom-provider consumer's derived definition
  -> CustomLlmProviderRuntimeSyncService / ModelCatalogService refresh
  -> provider and models returned to Settings
```

If the secret save fails after metadata creation, the service deletes the newly allocated metadata record before returning failure. No plaintext was persisted. Runtime refresh occurs only after both durable operations succeed.

Delete spine:

```text
Settings delete
  -> GraphQL
  -> LlmProviderService loads provider metadata
  -> SecretManagementService removes derived definition
  -> CustomLlmProviderStore removes metadata
  -> runtime/model catalog refresh
  -> value-free result
```

- Supported trigger/evidence: current custom probe/create/delete UI, GraphQL, service, store, and runtime sync.
- Governing owner: `LlmProviderService`; neither the secret service nor metadata store owns the cross-subject transaction.
- Data required: provider UUID, name, provider type, normalized base URL, transient credential, derived definition ID.
- Data not justified: duplicated `credentialSecretId`, credential in model/metadata, ordinary lifecycle CAS input.

### UC-003 — Backend Configuration

```text
deployment/startup config or supported Settings form
  -> typed configuration transport
  -> SecretStorageConfigurationService
  -> adapter-specific non-secret schema validation
  -> temporary adapter construction + health/capability probe
  -> non-secret configuration repository
  -> restart-required status for a running server
```

- Owner: `SecretStorageConfigurationService`.
- Required data: a registered adapter discriminant and adapter-specific non-secret fields. First delivery accepts Local product configuration only; InMemory is test composition. Local requires exact trusted database/key paths plus read-only/read-write mode. Ordinary bootstrap derives default paths below `serverDataDir`; Electron therefore resolves under `~/.autobyteus/server-data`, and normal Docker under `/home/autobyteus/data` in its existing volume. The host live launcher derives canonical E2E paths. Future adapters must introduce their own explicit types when implemented; no placeholder vendor configuration is accepted now.
- Forbidden data: Local Store key bytes, Vault/cloud token, provider credential, runtime caller path selector, generic `Record<string, ...>` adapter bag.
- Reachability result: dynamic hot-swap is not an approved use case. Startup activates the persisted/deployment configuration; a Settings change on a running server is validated, saved, and reported as restart-required.

### UC-004 — Local Backend Bootstrap

```text
Electron embedded, direct local, normal Docker, single Kubernetes server Pod, or host test server start
  -> server bootstrap
  -> derive normal Store below serverDataDir or load explicit host-test Store configuration
  -> LocalSecretStoreBackendFactory
  -> construct LocalSecretStorageBackend inside Agent Server
  -> open exactly one configured database/key pair
  -> validate permissions, formats, and authenticated Store/key pair verifier
  -> SecretManagementService and consumer provisioning become ready
```

- Owner: server bootstrap composition.
- Normal custody path: `${serverDataDir}/secret-store/`; Electron resolves under `~/.autobyteus/server-data`, Docker resolves inside its existing persistent data volume without Compose/launcher changes, and a single Kubernetes server Pod may bind its own persistent volume to the server data directory.
- Node rule: each writable Local Store belongs to one independent server-node/persistent-volume domain. Multiple containers/Pods/replicas never share it; such a deployment is unavailable until an appropriate future centralized adapter is implemented and installed.
- Required data: trusted database path, key path, and access mode. Normal servers default to `secret-store.db`/`secret-store.key`; host live tests select `real-e2e-secret-store.db`/`real-e2e-secret-store.key`. The in-process Local backend—not callers above `SecretManagementService`—opens the database. No daemon, connection alias, profile, runtime selector, or Docker E2E mount is needed.

### UC-005 — Physical Local Store Lifecycle

```text
writable initialization or read-only backend bootstrap
  -> LocalSecretStorageBackend
  -> normalize exact configured database/key paths
  -> require both absent for explicit writable creation or both present for open
  -> validate owner permissions and store_metadata format
  -> derive domain-separated pair-verifier key from root key + store_id
  -> authenticate pair verifier and bound format metadata
  -> open transaction-capable or read-only database handle
  -> value-free health/capability status
```

- Owner: `LocalSecretStorageBackend` owns initialization/open/close and delegates exact persistence/crypto internally. Server bootstrap owns configuration selection.
- Required persistent attributes: singleton schema/encryption/verifier versions, random `store_id`, pair-verifier nonce/ciphertext/tag, and exact encrypted records. `store_id` binds one physical database/key pair; it is not a profile, product owner, path, or caller identity. Profiles, rename, organization, and inheritance attributes have no approved path and are omitted.
- Safety rule: every open authenticates the pair verifier before `READY`, even with zero records. If only one file exists, the key is wrong/swapped, the current verifier is absent/tampered, or its authentication fails, health is `CORRUPT`; never regenerate. Unsupported versions are `INCOMPATIBLE`. `READ_ONLY` never initializes or mutates.

### UC-006 — Direct Real-E2E Store Provisioning

Direct provision:

```text
hidden trusted setup input
  -> LocalSecretStoreProvisioningService bound to writable E2E backend
  -> E2E Store-key derivation + authenticated encryption
  -> exact definitionId record in real-e2e-secret-store.db
  -> checkpoint/close for subsequent read-only use
  -> configured status only
```

- Owner: trusted Local Store setup boundary.
- Design correction: setup is constructed with only the writable E2E target. Its request carries one catalog-validated definition ID and hidden transient value. There is no source/default backend dependency, copy/read method, path selector, or runtime/GraphQL route.

### UC-007 — LLM Construction And Invocation

```text
AutoByteusAgentRunBackendFactory
  -> LLMProvisioningService
  -> SecretManagementService.resolveForUse(semantic consumer)
  -> active Store/namespace-bound backend
  -> resolved SecretValue/authentication
  -> LLMFactory.createLLM(modelIdentifier, { configInput, authentication })
  -> concrete LLM constructs provider SDK client
  -> real provider request/stream
  -> normalized LLM response to agent run
```

- Governing owners: provisioning owns resolution/construction sequencing; factory owns model/default config composition; concrete LLM owns request lifecycle.
- Off-spine: the catalog maps provider/credential-slot identity to a definition inside `SecretManagementService`; there is no caller-visible binding resolver step or duplicate expected-definition input.
- Required construction data: `configInput` plus resolved authentication. Factory creates effective `LLMConfig` and ephemeral context.
- Removed data: `runScope`, generic deployment scope, resolution timestamp/version, backend/Store/path on LLM types.

### UC-008 — Search, Media, And Metadata

Search:

```text
Search tool
  -> injected SearchExecutor
  -> SearchProvisioningService
  -> SecretManagementService
  -> active Store-bound backend
  -> selected search strategy/client
  -> real search provider
  -> normalized search result
```

Media:

```text
media tool/service
  -> MediaClientProvisioningService
  -> SecretManagementService
  -> active Store-bound backend
  -> media client factory/client
  -> real media provider
  -> normalized media result/artifact
```

Live metadata:

```text
model catalog enrichment/reload
  -> ModelMetadataProvisioningService
  -> SecretManagementService
  -> active Store-bound backend
  -> provider metadata client
  -> provider metadata endpoint
  -> catalog refresh or value-free enrichment status
```

- Design correction: these are three subject-specific spines, not one generic `ConsumerProvisioningService` implementation.
- Governing owners: `SearchProvisioningService`, `MediaClientProvisioningService`, and `ModelMetadataProvisioningService` each own their family-specific construction/request sequence; `SecretManagementService` owns only catalog-bound credential resolution.
- Shared structures are limited to authentication/value contracts and secret management; each family keeps its natural owner.

### UC-009 — Deterministic Tests

```text
default package test command
  -> scenario/test fixture classification
  -> fresh InMemorySecretStorageBackend or disposable temporary Local Store with synthetic canary
  -> normal management/provisioning/subject boundary under test
  -> fake/local provider where applicable
  -> deterministic assertions + sanitized report
```

- Owner: package/test harness appropriate to the subject.
- No shared canonical default/E2E Store, real credential, or global resolver is required. Local storage lifecycle/CRUD tests use a disposable database/key pair.

### UC-010 — Real-Provider Worktree Tests

```text
fresh worktree test:e2e:real command
  -> tracked test-config/live-e2e.json
  -> live E2E harness validates selected scenarios
  -> root launcher derives canonical host E2E paths
  -> real-E2E Store opens read-only, validates format, and authenticates pair verifier
  -> exact definition-ID preflight
  -> host worktree server starts with in-process Store-bound backend
  -> browser/API runner uses normal product path
  -> trusted provisioning/client boundary calls real provider
  -> sanitized assertions and evidence
```

- Owner: live E2E harness for setup/execution/evidence; product services own behavior once invoked.
- No worktree secret path, credential dotenv, raw key environment, default-Store access, Docker mount, or Store fallback is needed. Existing Docker deployment is a separate node-local workflow and remains unchanged.

### UC-011 — Local Backend Concurrency And Reset Lifecycle

Bounded local spine attached to UC-004/UC-010:

```text
server bootstrap requests Local backend
  -> normalize configured database/key pair
  -> validate pair presence, ownership and access mode
  -> open SQLite handle
  -> validate schema/encryption/verifier metadata and authenticate pair verifier
  -> configure transactions and bounded busy handling or read-only mode
  -> return ready Store-bound backend
```

- Owner: `LocalSecretStorageBackend` for open/close and access; exact-Store reset owner for deletion coordination.
- Format contract: an unsupported schema/encryption/verifier format is `INCOMPATIBLE`; partial pair or authentication failure is `CORRUPT`. Both return value-free repair/upgrade instructions, and a worktree never rewrites, downgrades, regenerates, or replaces either file automatically.
- Concurrency contract: prepared host real-E2E Store access is read-only and supports concurrent worktree readers. Writable paths use SQLite transaction/busy rules; provisioning finishes/checkpoints/closes before read-only opening.
- Reset contract: ordinary server runtime-data reset must not erase either Store; Store deletion is an explicit separate action naming exactly one physical Store.

Explicit reset bounded spine:

```text
DS-LOC002
explicit confirmed Store reset
  -> identify exact configured database/key pair
  -> stop new operations and close that server's backend handle
  -> obtain database/filesystem exclusion
  -> delete selected database + independent key + SQLite sidecars
  -> return value-free reset status
```

`DS-LOC001` is the shared internal write path used by direct E2E provision and normal Local Store backend save:

```text
validated definition ID + SecretValue on writable Store-bound backend
  -> derive Store encryption key from that Store's independent root key
  -> authenticated encrypt with fresh nonce and bound associated data
  -> one SQLite transaction on exact record
  -> durable commit
  -> value-free status
```

### UC-012 — Container Deployment And Future Extension Boundary

```text
unchanged Docker node or single Kubernetes server Pod/PVC start
  -> server derives node-local data directory
  -> registered Local backend factory
  -> authenticate node-local Store/key pair
  -> management/provider services ready at LOCAL_HARDENED tier
```

Unsupported multi-node configuration path:

```text
deployment selects unregistered Vault/AWS/Kubernetes/company kind
  -> typed configuration/registry rejects kind
  -> SECRET_BACKEND_KIND_NOT_INSTALLED
  -> value-free degraded configuration/health control plane
  -> no Local fallback and no provider construction
```

- First-delivery owner: server deployment/bootstrap composition.
- A Local writable Store belongs to one Docker node/volume or one server Pod/PVC and is never shared by replicas. Existing Docker Compose/launcher remains unchanged.
- The backend interface/registration seam is retained for future separately installed adapters, but no Vault/AWS/Kubernetes concrete configuration, class, bootstrap identity, or production behavior is claimed in this delivery.

### UC-013 — Capability-Aware Settings

```text
Settings opens provider/backend section
  -> GraphQL status query
  -> SecretStorageConfigurationService
  -> active backend health/capability descriptor
  -> lifecycle capability projection
  -> provider Settings state
  -> writable controls or externally-managed guidance
```

- Owner: `SecretStorageConfigurationService` owns backend health/capability projection; the provider subject service owns composition with its credential-validation state before transport projection.
- Required capability shape is a tagged union: `WRITABLE` or `EXTERNALLY_MANAGED` with a value-free instruction code.
- Removed overlap: separate writable/external booleans could represent impossible combinations.

### UC-014 — First-Delivery Agent Hardening

```text
AgentRunProvisioningService
  -> AgentExecutionSecurityContext from authorized workspace/runtime policy
  -> built-in file-tool Store-path denial + empty-base environment/descriptor policy
  -> existing platform/container launcher
  -> agent-controlled file/shell/PTY/Codex/Claude/MCP runtime or supported application backend worker
  -> bounded sanitized result + verified LOCAL_HARDENED state
```

- Owner: execution security context plus enforcing launcher.
- The latest `ApplicationWorkerSupervisor` is an additional supported launch caller: its current parent-environment spread is replaced by the same empty-base allowlist policy.
- `cwd` and an environment denylist over copied parent state are insufficient. First delivery additionally denies canonical/realpath/symlink Store paths through built-in file tools and excludes unexpected inherited descriptors.
- Claude `managed-secret` is the single explicit exception to the no-provider-key child rule: only the exact Claude Code child receives `ANTHROPIC_API_KEY`; parent, siblings, other runtime children, and AutoByteus-owned tool children remain secret-free. Managed-mode settings and built-in tool policy close supported descendant environment-inspection/spawn paths.
- This is not an OS/process identity boundary. It explicitly does not claim arbitrary same-user/all-in-one process filesystem denial or secrecy from the authorized Claude executable/SDK. First delivery reports only `LOCAL_HARDENED` after the defined checks and never reports `STRONG_AGENT_ISOLATION`.

### UC-015 — Legacy Cutover

```text
first post-upgrade bootstrap
  -> SecretCustodyMigration detects product-managed legacy shapes
  -> migration-only alias/schema decoder
  -> atomic .env scrub + custom-provider metadata-only transform
  -> current-schema validation + value-free migration ledger
  -> current runtime bootstrap
```

- Owner: migration subsystem.
- Legacy aliases live only in migration-owned mapping, not the current secret definition catalog.
- Current runtime never dual-reads or falls back.

### UC-016 — Backend Conformance

```text
adapter conformance runner
  -> adapter fixture declares lifecycle/location binding behavior
  -> reusable applicable capability suite
  -> adapter under test
  -> synthetic custody/fault fixture
  -> behavior + redaction + no-fallback assertions
```

- Owner: conformance suite; adapter fixture owns setup/cleanup only. First delivery runs against InMemory, Local read-write/read-only, and a test-only externally-managed capability fixture. No production enterprise adapter is an acceptance dependency. Local fixtures use disposable database/key pairs; they never mutate shared default/real-E2E Stores.
- Ordinary lifecycle is one atomic save (create-or-replace) plus idempotent remove without a caller CAS contract, matching the existing Settings save/delete journey.

### UC-017 — Claude Runtime Authentication Cutover

Default CLI/account path:

```text
Claude model-discovery/run request (mode omitted or `cli`)
  -> ClaudeSdkClient public launch/list-model boundary
  -> ClaudeRuntimeAuthenticationService selects CLI
  -> zero SecretManagementService calls
  -> return {kind: cli} to ClaudeSdkClient
  -> internal empty-base CLI/account environment
  -> Claude Agent SDK / exact Claude Code child
  -> provider/runtime result
  -> bounded sanitized product result or CLAUDE_RUNTIME_CLI_AUTH_UNAVAILABLE
```

Explicit managed-secret path:

```text
Claude model-discovery/run request (`managed-secret`)
  -> ClaudeSdkClient public launch/list-model boundary
  -> ClaudeRuntimeAuthenticationService
  -> SecretManagementService.resolveForUse({agentRuntime, claude_agent_sdk, apiKey})
  -> catalog authorizes provider.anthropic.api-key
  -> configured backend decrypts SecretValue
  -> return {kind: managedApiKey, apiKey} to ClaudeSdkClient
  -> internal empty-base managed environment
  -> add only ANTHROPIC_API_KEY to exact SDK child
  -> Claude Agent SDK / Claude Code child
  -> drop AutoByteus temporary references
  -> bounded sanitized product result/error
```

Invalid/non-ready path:

```text
Claude request (`auto`, `api-key`, unknown) OR managed Store/binding failure
  -> ClaudeSdkClient -> ClaudeRuntimeAuthenticationService / SecretManagementService
  -> exact value-free mode, missing, locked, unavailable, corrupt, incompatible, or binding code
  -> no child spawn
  -> no CLI/ambient/other-Store fallback
```

- Owner: `ClaudeSdkClient` is the single public boundary used by session and model catalog and owns last-mile environment/options/spawn. Its injected `ClaudeRuntimeAuthenticationService` owns exact mode parsing, the managed consumer identity, just-in-time resolution, and subject error mapping. The central management service remains authoritative for catalog/backend resolution.
- `ClaudeSdkClient` start/model-discovery inputs no longer accept `env`; session/catalog callers depend only on the client boundary and never receive authentication.
- Managed mode uses empty setting sources, strict explicit AutoByteus MCP configuration, no hooks/plugins/API-key helper/external MCP, and SDK `tools: []` so no Claude built-in file/shell/skill/process path exists. `allowedTools` contains only materialized AutoByteus MCP names and is not itself a security boundary. AutoByteus tool children use their own sanitized server environment.
- Diagnostics redact before buffering and again on output. Spawn/provider-auth failures are value-free and never trigger mode fallback.
- Native `AnthropicLLM` and metadata consumers remain separately authorized through DS-UC007/008. One definition is reused; consumer authority is not shared.
- The authorized Claude process/SDK can observe its credential and may retain it in native/JavaScript memory. That is an explicit `LOCAL_HARDENED` trust limit, not a zeroization claim.

## Attribute Provenance And Tightness Audit

| Proposed Attribute / Structure | Use-Case Witness | Decision | Reason / Replacement |
| --- | --- | --- | --- |
| `SecretDefinitionId` | UC-001, 002, 006–010, 012, 015, 016 | Retain | stable semantic storage identity |
| `SecretConsumerIdentity` | UC-007/008/017 | Retain and tighten | permits catalog-bound resolution; exact subject/provider/runtime/credential slot only |
| `SecretScope.organizationId/deploymentId/environmentId/sharing/nodeId` | none | Remove | no current/approved product identity or caller supplies these fields |
| `SecretStorageAddress.namespace/scopePath` in service request | none | Remove | adapter configuration owns physical prefix; backend input is validated definition ID |
| caller-selectable Store/path | none | Remove/forbid | server/backend instance is bound to one Store at bootstrap |
| named profile, profile ID/name/table | none after physical separation decision | Remove | approved default/E2E contexts are separate databases/keys; no namespace lifecycle remains |
| Store database path, key path, access mode in trusted bootstrap | UC-003–006, 010, 011 | Retain | required to construct one in-process Local backend; normal paths derive from serverDataDir and host test paths are explicit; never runtime caller input |
| cross-Store inheritance/fallback | explicitly rejected by UC-006/010 | Remove/forbid | missing target is failure |
| `SecretDefinition.displayName/purpose/sensitivity/scopePolicy` | none; provider UI owns display | Remove | duplicate/descriptive attributes do not affect a spine |
| `SecretDefinition.legacyAliases` | UC-015 only | Move | migration-owned alias map, not current runtime catalog |
| `SecretDefinition.validationPolicy` | UC-001/002 subject behavior | Move | provider/search subject service owns probe/validation |
| `ResolvedSecret.version/resolvedAt` | none | Remove | current construction needs only authentication; no approved global cache/CAS path |
| expected version on Settings replace/remove | none | Remove | current supported behavior is atomic save/delete, not optimistic-concurrency UI |
| separate management create/replace methods | none; current Settings exposes one save | Collapse | one `saveForConsumer` and one backend `save` preserve the actual journey and remove a synthetic branch |
| internal DB `revision` exposed to product | none | Remove | SQLite transaction + fresh nonce provides atomic replace; no caller uses revision |
| `SecretStatus.version/updatedAt/backendKind/reprovisionRequired` | none or duplicative | Remove | use management-owned storage status plus separately composed subject-validation state |
| `ManagedSecretStatus.definitionId/messageCode` | none on the return spine; the caller already supplied semantic identity and failures/events have their own codes | Remove | keep catalog mapping internal and return only storage state plus lifecycle capability |
| `SecretBackendHealth.retryable` | none; retry policy is not an approved status contract and can contradict the state/code | Remove | use a discriminated health state with an exact value-free instruction code for every non-ready variant |
| storage and validation state in one management DTO | UC-001, 002, 010, 013 | Split by owner | management reports storage; provider/search service composes its own validation state |
| lifecycle capability booleans | UC-013 | Replace | tagged `WRITABLE` / `EXTERNALLY_MANAGED` prevents contradictory combinations |
| generic or setup cross-Store copy port | UC-006 explicitly rejects | Remove | first-delivery setup is target-only and accepts dedicated test credentials directly |
| `requestedAssuranceTier` config | none | Remove | UC-014 assurance is derived from verified controls |
| `LLMFactoryCreationInput.configInput` | UC-007 | Retain | existing factory behavior and caller overrides |
| `LLMFactoryCreationInput.authentication` | UC-007 | Retain | explicit credential delivery; mandatory even when `none` |
| `LLMConstructionContext.config` + `authentication` | UC-007 | Retain | single concrete constructor boundary; ephemeral |
| `runScope` on LLM provisioning | none | Remove | active backend Store/namespace binding already determines custody |
| Local Store `connectionName` | none | Remove | trusted bootstrap supplies exact paths; runtime does not select aliases |
| expected definition ID alongside consumer identity | none | Remove | management owns catalog lookup; duplicate identity can drift or create a boundary bypass |
| generic adapter option map | none | Remove | each enabled adapter defines a typed non-secret schema |
| Local Store DB `definition_id`, `ciphertext`, `nonce` | UC-005/006/011 | Retain | minimal persistent record identity and encryption data; no `profile_name` |
| Local Store `schema_version` and `encryption_format_version` | UC-004/005/010/011 | Retain | multiple worktree/Electron versions must detect incompatible persistent formats without silent rewrite/downgrade |
| Local Store `pair_verifier_format_version`, random `store_id`, verifier nonce/ciphertext/tag | UC-005/010/011 plus pair-integrity contract | Retain | authenticates the database/key pair before ready, including an empty Store; attributes do not encode product/profile identity |
| Local Store `protocolVersion`, process endpoint, socket capability | none after in-process decision | Remove | there is no Store process or IPC contract |
| Local Store timestamps/value hash/prefix/length | none | Remove/forbid | no behavior needs value-derived or historical hints |
| exact Claude `agentRuntime/claude_agent_sdk/apiKey` identity | UC-017 managed path | Retain | authorizes managed mode to reuse the Anthropic definition without a Claude-specific resolver/definition; CLI never constructs it |
| Claude `auto`, ambient `api-key`, caller `env`, settings/hooks/plugins/external MCP, built-in process/env inspection | UC-017 failure/security paths | Remove/forbid | eliminates hidden fallback and supported propagation/readout paths around exact child delivery |

## Minimal Target Data Shapes After Audit

```ts
type SecretDefinitionId = string & { readonly __brand: "SecretDefinitionId" };

type SecretConsumerIdentity =
  | { kind: "llm"; providerId: string; credentialSlot: SecretCredentialSlot }
  | { kind: "llmMetadata"; providerId: string; credentialSlot: SecretCredentialSlot }
  | { kind: "search"; providerId: string; credentialSlot: SecretCredentialSlot }
  | { kind: "media"; mediaKind: "audio" | "image" | "video"; providerId: string; credentialSlot: SecretCredentialSlot }
  | { kind: "agentRuntime"; runtimeKind: "claude_agent_sdk"; credentialSlot: "apiKey" };

type SecretCredentialSlot =
  | "apiKey"
  | "geminiAiStudioApiKey"
  | "geminiVertexExpressApiKey";

type WritableSecretLifecycleCapability = { kind: "WRITABLE" };
type ExternallyManagedSecretLifecycleCapability = {
  kind: "EXTERNALLY_MANAGED";
  instructionCode: string;
};
type SecretLifecycleCapability =
  | WritableSecretLifecycleCapability
  | ExternallyManagedSecretLifecycleCapability;

type ManagedSecretStatus = {
  storageState: "MISSING" | "CONFIGURED";
  lifecycle: SecretLifecycleCapability;
};

type ProviderCredentialValidationState =
  | "UNVERIFIED"
  | "VALID"
  | "INVALID"
  | "VALIDATION_UNAVAILABLE";

type BackendSecretStatus = { storageState: "MISSING" | "CONFIGURED" };

type ReadySecretBackendHealth = { state: "READY" };
type NonReadySecretBackendHealth =
  | { state: "LOCKED"; instructionCode: "SECRET_BACKEND_LOCKED" }
  | {
      state: "UNAVAILABLE";
      instructionCode:
        | "SECRET_BACKEND_UNAVAILABLE"
        | "SECRET_BACKEND_KIND_NOT_INSTALLED";
    }
  | { state: "CORRUPT"; instructionCode: "SECRET_BACKEND_CORRUPT" }
  | {
      state: "INCOMPATIBLE";
      instructionCode: "SECRET_BACKEND_INCOMPATIBLE";
    };
type SecretBackendHealth =
  | ReadySecretBackendHealth
  | NonReadySecretBackendHealth;

type ManagedSecretStatusResult =
  | { health: ReadySecretBackendHealth; secret: ManagedSecretStatus }
  | { health: NonReadySecretBackendHealth; secret: null };

interface SecretManagementService {
  resolveForUse(consumer: SecretConsumerIdentity): Promise<SecretValue>;
  // lifecycle methods accept the same semantic consumer identity;
  // this service performs the catalog lookup internally.
}

type ClaudeRuntimeAuthenticationMode = "cli" | "managed-secret";
type ClaudeRuntimeAuthentication =
  | { kind: "cli" }
  | { kind: "managedApiKey"; apiKey: SecretValue };

interface SecretStorageBackendOperations {
  getStatus(definitionId: SecretDefinitionId): Promise<BackendSecretStatus>;
  resolve(definitionId: SecretDefinitionId): Promise<SecretValue>;
  health(): Promise<SecretBackendHealth>;
  close(): Promise<void>;
}

interface WritableSecretStorageBackend extends SecretStorageBackendOperations {
  readonly lifecycle: WritableSecretLifecycleCapability;
  save(definitionId: SecretDefinitionId, value: SecretValue): Promise<void>;
  remove(definitionId: SecretDefinitionId): Promise<void>;
}

interface ExternallyManagedSecretStorageBackend extends SecretStorageBackendOperations {
  readonly lifecycle: ExternallyManagedSecretLifecycleCapability;
}

type SecretStorageBackend =
  | WritableSecretStorageBackend
  | ExternallyManagedSecretStorageBackend;

type LocalStoreConfiguration = {
  kind: "local-store";
  databasePath: string;
  keyPath: string;
  accessMode: "READ_WRITE" | "READ_ONLY";
};
```

Local Store logical schema:

```text
store_metadata(
  singleton_id PRIMARY KEY,
  schema_version,
  encryption_format_version,
  pair_verifier_format_version,
  store_id,
  pair_verifier_nonce,
  pair_verifier_ciphertext,
  pair_verifier_tag
)
secret_records(
  definition_id PRIMARY KEY,
  nonce,
  ciphertext
)
```

Record authentication tags may be encoded with `ciphertext` according to the selected vetted library. Pair-verifier tag is explicit because pair initialization/open must validate it before records exist. Pair-verifier and record keys use distinct HKDF-SHA-256 info domains.

## Product-Reachability Decisions

| Premise | Reachability | Witness / Absence | Design Consequence |
| --- | --- | --- | --- |
| fresh worktree lacks ignored credential file | Reachable/current | current Git ignore and test bootstrap behavior | tracked manifest + one machine-global physical real-E2E Store required |
| AutoByteus must mount the host real-E2E Store into Docker | Not Reachable/explicitly out of scope | normal Docker already persists node-local server data; user rejected a prescribed Docker E2E deployment | preserve Compose/launcher/volumes unchanged; do not design mount variables or external E2E volumes |
| Settings and agent server are available without Electron | Reachable/current | direct web/server deployment | Local Store/backend cannot be Electron-owned |
| application organization/environment identity scopes secret access | Not Reachable | no such product model/caller exists | remove generic scope attributes |
| runtime request selects arbitrary backend/Store/path | Not Reachable/forbidden target | configuration is bootstrap-bound | no selector in lifecycle/resolve API |
| local configuration selects among named Store connections/profiles | Not Reachable | approved target has exact default/E2E paths and no generic connection catalog | remove connection/profile alias; tracked live config names canonical E2E files only |
| Local Store requires a daemon to share across worktrees | Not Reachable as a requirement | SQLite file locking and in-process backend satisfy the supported workflow; same-user process adds no security boundary | remove launcher/IPC/protocol machinery |
| default-to-E2E Store copy is required for zero-touch worktrees | Not Reachable as a per-worktree requirement | direct one-time E2E provisioning still gives every later worktree tracked zero-touch access; user accepts separate test setup | remove source/default backend from setup and all copy commands |
| same server handles simultaneous stale expected-version updates as an approved contract | Unclear and not required | current Settings is last-write save with no version field | do not add optimistic-concurrency product API |
| Local Store is deleted by ordinary current `reset-server-data` if nested without change | Reachable/current code | current reset removes entire `server-data` | change reset semantics or require explicit include-Store confirmation |
| empty Local Store can be paired with the wrong key without detection | Reachable under approved pair lifecycle | separate DB/key files can be swapped or partially created before any record exists | authenticate pair verifier on every open; map mismatch/partial/tamper to CORRUPT |
| all-in-one agent container can read a server-mounted secret outside built-in tools | Reachable limitation of current topology/security contract | same container/identity hosts trusted and agent execution | first delivery reports LOCAL_HARDENED only; strong tier explicitly deferred |
| test code with direct credential can exfiltrate | Reachable by direct-mode contract | trusted code receives plaintext for SDK | require implementation source review before direct execution and dedicated keys; do not invent runtime attestation or claim impossible non-disclosure |
| Claude current raw API-key mode can receive ambient key | Reachable/current | current auth environment builder supports key aliases and broad parent environment | remove ambient/auto selection and caller env; explicit managed mode must resolve centrally and deliver only to exact child |
| Claude managed child can expose/inherit its own environment through supported tools/settings | Reachable under approved managed mode | credential is intentionally in child env; pinned SDK loads settings and supports process tools unless constrained | empty setting sources, strict explicit MCP, no hooks/plugins/API-key helper, `tools: []`, sanitized AutoByteus MCP tool children, early redaction |
| authorized Claude executable/SDK can observe or retain its credential | Reachable/accepted trust limit | the SDK child must authenticate and receives `ANTHROPIC_API_KEY` | document `LOCAL_HARDENED` limit; do not claim child secrecy or deterministic zeroization |
| every third-party Agent SDK subscription path categorically requires product-specific prior approval | Unclear due to conflicting current official authority | SDK overview/legal pages retain restriction language, while the newer June 15–16 Help Center update expressly says third-party app usage still draws from subscriptions during the paused change; current AutoByteus CLI use succeeds technically | retain the user-approved two-mode spine; record `EXT-ANTHROPIC-AGENT-SDK-AUTH`; ask reviewer to reassess MP-002; do not treat technical success alone as permission proof |
| first delivery must prove a concrete enterprise adapter | Not Reachable after phasing decision | Local covers approved first-delivery nodes; extension contract can be tested with fixture | ship/register no concrete enterprise adapter and fail unknown kinds closed |

## Design-Principle Checklist

| Principle / Smell | Result | Evidence / Correction |
| --- | --- | --- |
| approved behavior before structure | Pass | UC-001–016 retain the approved basis; UC-017 derives from the user-selected two-mode Claude intent and the user authorized architecture re-review after this audit |
| primary spine for every use case | Pass | complete inventory and per-use-case sections above |
| sufficient span (surface -> owner -> dependency -> outcome) | Pass | each primary spine spans at least the complete real path; small Store-control paths are genuinely shorter |
| return/event spines | Pass | DS-RET001/002 plus per-use-case return outcomes |
| bounded local spine | Pass | Local backend pair-open/write/reset stay inside named owners; setup is target-only |
| ownership clarity | Pass | subject services own use cases; management owns lifecycle; in-process Local backend owns database/crypto; clients own provider calls |
| no mixed-level bypass | Pass | subject/provisioning callers use management, never backend; only Local backend opens its configured DB |
| off-spine concerns do not compete | Pass after correction | binding, redaction, validation, repository, path resolution serve named owners |
| no generalist provisioning owner | Pass after correction | LLM/search/media/metadata retain separate provisioning services |
| tight data structures | Pass after removals | generic scope/address/version/connection alias/capability booleans removed; storage and validation status split by owner |
| product reachability | Pass | unsupported identity/concurrency attributes rejected; reset and all-in-one risks retained because reachable |
| current-schema runtime | Pass | legacy aliases/schema remain migration-only |
| removal first-class | Pass | environment/custom JSON/test dotenv/fallback paths are explicitly removed |
| folder mapping follows ownership | Pass | server management/config/migration, subject provisioning, and in-process Local persistence remain distinct without a new workspace process package |
| empty indirection | Pass after correction | management owns catalog lookup plus backend resolution; no caller-visible pass-through binding resolver remains |

## Final Validation Conclusion

The provider/backend pattern is justified by every relevant use case. The in-process Local backend with server-data-derived normal Stores, authenticated empty-Store pair binding, and physically separate host default/real-E2E Stores materially solves local custody and fresh-host-worktree real testing. Existing Docker persistence remains independent and unchanged. First delivery stays bounded to Local/InMemory and `LOCAL_HARDENED`, removes cross-Store copy and ambient Claude raw-key exposure, and adds one precise managed Claude consumer without bypassing the generic service or overstating secrecy from the authorized child.

The user-authorized package should now be architecture-reviewed using the exact spines above. A future multi-tenant organization/environment requirement must introduce its own approved use cases and identity lifecycle before adding scope fields; it must not be anticipated inside this ticket's current runtime types.
