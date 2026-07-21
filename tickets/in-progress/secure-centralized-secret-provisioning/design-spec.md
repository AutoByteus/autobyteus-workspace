# Secure Centralized Secret Provisioning — Design Spec

## Document Status

- Status: `AR-008 Bounded Design Correction — Architecture Re-review Required` (2026-07-21).
- Requirements basis: [requirements.md](./requirements.md), status `Refined — CR-001 Requirement-Gap Revision; User Approved; Architecture Re-review Required` (2026-07-21).
- Architecture diagrams: [secret-storage-architecture.md](./secret-storage-architecture.md).
- Review reports: [design-review-report.md](./design-review-report.md) records round-5 `Fail / Design Impact` on the bounded AR-008 construction example; [code-review-report.md](./code-review-report.md) records source-review round-1 `Fail / Requirement Gap` on CR-001 and bounded CR-002–CR-005.
- Handoff state: CR-001 is substantively resolved and its behavior basis remains user approved. AR-008 corrects one contradictory example and tightens the construction-target shape without changing intended behavior. The cumulative package must pass architecture re-review before implementation rework resumes. Preserve `EXT-ANTHROPIC-AGENT-SDK-AUTH`.

## Current-State Read

AutoByteus has no authoritative secret subsystem. `autobyteus-server-ts/src/config/app-config.ts` loads `${dataDir}/.env` into server-global `process.env`, persists built-in LLM/search credentials back to that file, and mixes secret and ordinary configuration. Custom OpenAI-compatible provider schema v1 instead stores `apiKey` in plaintext JSON and copies it into `OpenAICompatibleEndpointModel`.

Credential consumption is distributed. `OpenAILLM` delegates to `OpenAIResponsesLLM`, which reads a configured environment alias. Anthropic, Mistral, Gemini, other LLMs, live metadata discovery, search strategies, and media clients have equivalent ambient paths. `LLMFactory.createLLM(modelIdentifier, configInput?)` currently owns model lookup/default composition, then invokes `new LLMClass(model, config)`. Its async seam and the injectable factory seam in `AutoByteusAgentRunBackendFactory` make a clean refactor possible without moving secret resolution into individual LLMs.

One supported path has an additional identity distinction. With `AUTOBYTEUS_LLM_SERVER_HOSTS` configured, the base factories discover remote LLM/audio/image models through `AutobyteusClient`, and the same ambient `AUTOBYTEUS_API_KEY` authenticates both discovery and later requests. A returned model can report `provider=OPENAI` or `provider=GEMINI` while `runtime=AUTOBYTEUS`; its model provider is therefore not the gateway credential owner. Source review found that the explicit-auth implementation removed the ambient read but also removed every production discovery caller, leaving remote providers dormant and configured remote models absent.

Tests load ignored superrepo/package `.env.test` files through `autobyteus-ts/tests/setup.ts`, and many live suites gate on provider-key environment aliases. Therefore a fresh worktree lacks both credential state and a tracked declaration of which real credentials/scenarios it needs. Fakes are useful but do not prove real authentication, current SDK/protocol/model behavior, or provider-specific media/search behavior.

Electron starts an embedded server, while direct Node/web, Docker, Kubernetes, and remote nodes operate without Electron. Agent file/shell/PTY/external-runtime paths can receive broad host access and inherited environments. The latest supported application backend worker is also spawned by `ApplicationWorkerSupervisor` with a spread of `process.env` and the server filesystem identity. The current all-in-one container cannot claim strong separation when a provider secret mount or workload identity is visible to the same container that hosts an unrestricted agent or application worker.

The current ordinary server database is SQLite through `DATABASE_URL`: Electron composes `~/.autobyteus/server-data/db/production.db`, while direct/test servers can use `test.db` or data-directory/worktree-specific locations. Secret rows in that database would not provide stable cross-worktree E2E custody and would couple secret reset/migrations/backups to application state. Current Docker Compose already persists `AUTOBYTEUS_DATA_DIR=/home/autobyteus/data` through the `autobyteus-server-data` named volume. The normal Docker Local Store can derive below that directory; the user explicitly rejected adding a Docker E2E bind-mount/volume contract, so existing Compose and launcher behavior remain unchanged. Current Claude Agent SDK authentication also has a distinct leak path: `claude-sdk-auth-environment.ts` accepts `auto|cli|api-key`, starts from `{...process.env}`, and can forward Anthropic/Claude key aliases. `ClaudeSdkClient` also accepts caller `env`, uses the same spawn path for model discovery and runs, loads user/project/local setting sources, and buffers raw stderr before summary redaction.

There is no current AutoByteus application-user or role model relevant to this feature. The target preserves existing Settings access behavior. Server-to-Local-Store/Vault/cloud authentication is deployment workload identity, not application-user identity.

Detailed evidence and exact source paths are in [investigation-notes.md](./investigation-notes.md); consumer aliases and target bindings are in [credential-consumer-mapping.md](./credential-consumer-mapping.md).

## Intended Change

Introduce a server-owned secret-management subsystem with the conceptual dependency direction:

```text
SubjectSpecificProvisioningService -> SecretManagementService -> SecretStorageBackend -> custody
```

Separate the non-secret storage configuration plane from provider credential lifecycle. The server selects exactly one typed backend instance during bootstrap. Backends report writable versus externally managed capabilities. Provider/search Settings continue to submit write-only values to subject-specific services; no saved value is returned.

For local/Electron/test use, add `LocalSecretStorageBackend` inside Agent Server, independent of Electron and OS keychains. A normal server derives `secret-store/secret-store.db` and `secret-store/secret-store.key` below its configured server data directory. Electron therefore uses `~/.autobyteus/server-data/secret-store/`; normal Docker uses its existing `/home/autobyteus/data` persistent volume without Compose/launcher changes. A Docker container or single Kubernetes server Pod is one independent Local Store node backed by its own persistent-volume domain. Multiple replicas require a future installed enterprise adapter rather than shared SQLite; no concrete enterprise adapter ships in this first delivery. Each Store format contains authenticated pair metadata so an empty database cannot accept a swapped key. The physically separate host `real-e2e-secret-store.db` and key are provisioned directly once with dedicated test credentials and selected by tracked non-secret configuration. Setup/runtime have no default-Store copy/read/fallback path. No Local Store daemon, IPC protocol, arbitrary profile framework, or prescribed Docker E2E mount is introduced.

Before LLM construction, `LLMProvisioningService` resolves authentication. `LLMFactory` remains responsible for lookup and effective `LLMConfig`, accepts authentication separately, and creates an ephemeral `LLMConstructionContext`. Search, media, and live metadata follow equivalent explicit provisioning boundaries. First-delivery agent launches use empty-base allowlists and file-tool Store denial and report only `LOCAL_HARDENED`; separate identity/container/network enforcement and `STRONG_AGENT_ISOLATION` are deferred.

Preserve AutoByteus remote discovery and invocation through `provider.autobyteus.api-key`. Existing provider Settings saves/statuses/removes the definition and retains the existing full/provider reload journey; explicit successful removal authoritatively clears all AutoByteus runtime subsets without lookup. A shared server-owned `AutobyteusRemoteModelDiscoveryService` resolves exact `modelDiscovery/{llm|audio|image}/AUTOBYTEUS/apiKey` consumers only when hosts exist, then passes ephemeral authentication to storage-neutral core providers. Remote model construction uses the existing generic LLM/media provisioning services through a required non-secret `credentialProviderId`. Native model registration initializes that field once from its credential owner; AutoByteus-runtime registration sets it explicitly to `AUTOBYTEUS`. After registration, provisioning reads only `credentialProviderId` and never falls back to or re-derives custody from the displayed/creator provider. Successful discovery replaces only the corresponding `runtime=AUTOBYTEUS` registrations, never native models with the same downstream provider. `AUTOBYTEUS_API_KEY` becomes migration-only; no ambient fallback returns.

Claude Agent SDK uses a specialized server-owned `ClaudeRuntimeAuthenticationService` over the existing generic management service. It accepts exactly default `cli` and explicit `managed-secret`. CLI performs no secret resolution. Managed mode constructs the exact `agentRuntime/claude_agent_sdk/apiKey` identity, calls `resolveForUse` immediately before model-discovery/run child construction, and authorizes reuse of `provider.anthropic.api-key`. `ClaudeSdkClient` alone unwraps into an empty-base SDK child environment containing exactly `ANTHROPIC_API_KEY`; it accepts no caller environment and never mutates the parent. Managed mode disables user/project/local settings, hooks, plugins, API-key helpers, external MCP configuration, and built-in process/environment-inspection tools; AutoByteus tools run server-side under sanitized policy. Diagnostics redact before buffering. Legacy `auto|api-key`, non-ready custody, invalid binding, spawn, and auth failures never fall back.

Backend initialization can leave the server in degraded secret mode. `SecretStorageConfigurationService` exposes exactly `READY`, `LOCKED`, `UNAVAILABLE`, `CORRUPT`, or `INCOMPATIBLE`; per-definition `MISSING`/`CONFIGURED` exists only while `READY`. Settings/health stay reachable, while provider construction and writes fail closed with value-free instruction codes.

Legacy plaintext readers/writers are removed in one cutover. Existing non-secret metadata is migrated; credential values are deliberately not imported and must be reprovisioned.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And AC IDs | Trigger / Contract | Existing Behavior Evidence | Approved Change / Preserved Outcome | Target Path / Spine IDs |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | User | REQ-001, REQ-002, REQ-006, REQ-007, REQ-010 / AC-001, AC-007, AC-008 | Existing provider/search Settings save/remove/status | Investigation `BEH-001`; AppConfig/custom-provider paths | Preserve familiar Settings and current access; use write-only lifecycle and value-free status | UC-001/002/013; DS-UC001, DS-UC002A/B, DS-UC013, DS-RET001 |
| `BEH-002` | System | REQ-003, REQ-004, REQ-012 / AC-003, AC-013 | Agent and supported application-worker execution | Investigation `BEH-002`; spawn/file/application-worker probes | Preserve runtime capabilities; remove ambient provider/backend state; enforce file-tool roots; report `LOCAL_HARDENED` without same-user denial claim | UC-014; DS-UC014 |
| `BEH-003` | System | REQ-005, REQ-011 / AC-005, AC-010 | LLM/search/media/metadata client creation | Investigation `BEH-003`; consumer mapping | Resolve semantic authentication before construction; preserve provider behavior | UC-007/008; DS-UC007, DS-UC008A/B/C, DS-RET002 |
| `BEH-004` | Operational | REQ-009, REQ-016, REQ-017 / AC-006, AC-012, AC-015, AC-016 | Real suite from a fresh worktree | Investigation `BEH-004`; test setup/live-suite scans | Preserve substantive real tests; remove copied credential dotenv | UC-009/010; DS-UC009, DS-UC010 |
| `BEH-005` | Contract | REQ-006, REQ-008, REQ-010 / AC-004, AC-007, AC-008 | Lifecycle/status/health operation | Investigation `BEH-005`; fragmented status paths | Separate `READY/LOCKED/UNAVAILABLE/CORRUPT/INCOMPATIBLE` backend health from healthy-only `MISSING/CONFIGURED`; degraded control plane stays value-free | UC-001/002/013; DS-UC001, DS-UC002A/B, DS-UC013, DS-RET001 |
| `BEH-006` | System | REQ-004, REQ-010, REQ-012, REQ-013 / AC-001, AC-002, AC-013, AC-017 | Electron/direct/container server startup | Investigation `BEH-006` | Preserve all deployment modes; bootstrap selected backend before providers | UC-003/004/011; DS-UC003, DS-UC004, DS-UC011 |
| `BEH-007` | Operational | REQ-010, REQ-012, REQ-013, REQ-015 / AC-002, AC-013, AC-014, AC-017 | Docker/Kubernetes deployment | Investigation `BEH-007`; Docker/Kubernetes evidence | First delivery: independent Local Store node only; future registered enterprise adapter required for multi-node custody; no strong all-in-one claim | UC-012/013/014; DS-UC012, DS-UC013, DS-UC014 |
| `BEH-008` | Operational | REQ-002, REQ-014, REQ-016 / AC-007, AC-009, AC-012 | First startup after upgrade | Investigation `BEH-008`; persisted-data evidence | Preserve non-secret metadata, delete known plaintext values/readers, require reprovision | UC-015; DS-UC015 |
| `BEH-009` | Contract | REQ-011 / AC-005, AC-010 | `LLMFactory.createLLM` | Factory/OpenAI source evidence | Preserve factory composition; add separate required authentication input and ephemeral context | UC-007; DS-UC007 |
| `BEH-010` | Operational | REQ-012, REQ-017 / AC-015, AC-016 | Local Store initialize/open/direct provision | No current supported behavior | Pair-authenticated in-process default/E2E Stores, direct dedicated E2E provisioning, no default copy/read/fallback | UC-004–006/010/011; DS-UC004, DS-UC005, DS-UC006A, DS-UC010, DS-UC011 |
| `BEH-011` | Contract | REQ-007, REQ-010, REQ-013, REQ-015 / AC-002, AC-008, AC-014, AC-017 | Startup/deployment or supported Settings backend configuration | No current neutral contract | Typed config and tagged lifecycle extension contract; first delivery registers only InMemory/Local | UC-003/012/013/016; DS-UC003, DS-UC012, DS-UC013, DS-UC016 |
| `BEH-012` | System | REQ-004, REQ-005, REQ-008, REQ-014, REQ-018 / AC-003–AC-005, AC-009, AC-018 | Claude model-discovery or run child launch | Current `auto`, `cli`, and `api-key` modes start broad, accept caller env, and may forward key aliases/settings | Replace with exact default `cli` or explicit managed JIT consumer resolution and exact-child delivery; no fallback; preserve native Anthropic consumers | UC-017; DS-UC017, DS-RET002 |
| `BEH-013` | User/System | REQ-001, REQ-005, REQ-008, REQ-009, REQ-011, REQ-014, REQ-016, REQ-017, REQ-019 / AC-004–AC-006, AC-009, AC-010, AC-012, AC-019 | AutoByteus gateway key save/status; configured-host startup/list/reload; remote LLM/audio/image invocation | Base factories discover remote models and `AutobyteusClient` reads one ambient `AUTOBYTEUS_API_KEY`; implementation removed callers after requiring explicit key | Preserve all behavior using one managed definition, exact discovery/construction consumers, `credentialProviderId=AUTOBYTEUS`, runtime-scoped synchronization, migration, and substantive real coverage | UC-018; DS-UC018A/B/C/D, DS-RET002 |

### Architecture Review Round 1 Remediation

| Finding | Resolution In This Revision | Governing Locations | User-Approved Resolution State |
| --- | --- | --- | --- |
| `AR-001` | First delivery is explicitly `LOCAL_HARDENED`; strong separate-identity/container/network enforcement and its claim are deferred. AC-003 tests file-tool denial and non-inheritance, not arbitrary same-user denial. | REQ-003, REQ-004, AC-003, AC-013, DS-UC014 | User re-approved 2026-07-21 |
| `AR-002` | First delivery registers InMemory and Local only. Concrete Vault/AWS/Kubernetes adapters are deferred; multi-node selection of an unregistered kind fails value-free. | REQ-013, REQ-015, AC-002, AC-014, AC-017, DS-UC012/016 | User re-approved 2026-07-21 |
| `AR-003` | Default-to-E2E copy is removed from first delivery. Dedicated test credentials are provisioned directly into the E2E Store; no setup source/default read path exists. | REQ-017, AC-016, DS-UC006A; DS-UC006B removed | User re-approved 2026-07-21 |
| `AR-004` | Backend health is exactly `READY/LOCKED/UNAVAILABLE/CORRUPT/INCOMPATIBLE`; per-definition status exists only when ready. Non-ready startup exposes a degraded value-free control plane and disables provider use/writes. | REQ-006, AC-007, DS-RET001, backend contract | User re-approved 2026-07-21 |
| `AR-005` / `MP-001` | Current Store metadata includes random `store_id` plus an AES-GCM authenticated pair verifier under a domain-separated key. Every open validates it, including empty/read-only Stores; mismatch is `CORRUPT`. | REQ-012, AC-014, AC-015, DS-UC005/011, Local schema | User re-approved 2026-07-21 |
| `AR-006` | Reopened after the prior CLI-only decision. The revised target defines exact `cli` and `managed-secret` modes, a Claude runtime consumer bound to the existing Anthropic definition, a JIT authentication owner, exact-child SDK env delivery, managed settings/tool/diagnostic controls, complete failures, migration/removal, and negative/real test evidence. | REQ-018, AC-018, UC/DS-UC017, consumer mapping, backend contract, threat/test supplements | User-approved 2026-07-21; architecture re-review requested |
| `AR-007` / `MP-002` | Round 3 treated prior Anthropic approval as mandatory based on the SDK overview. The newer-dated June 15–16 Help Center update expressly says third-party Agent SDK application usage still draws from subscription limits while a planned billing change is paused; official SDK/legal pages remain inconsistent. The user retains both modes. CLI adds no AutoByteus login/relay/pooling surface and uses external node-local account state. Current working behavior is technical evidence, not standalone authorization. Add a maintained external release dependency and request premise reassessment. | REQ-018, UC/DS-UC017, investigation evidence, threat model | User reaffirmed 2026-07-21; architecture re-review requested |

### Code Review Round 1 Remediation

| Finding | Resolution In This Revision | Governing Locations | State |
| --- | --- | --- | --- |
| `CR-001` | Add BEH-013/REQ-019/AC-019/UC-018, one AutoByteus definition, exact discovery/construction bindings, runtime-aware credential ownership, server discovery owner, runtime-scoped catalog synchronization, migration, Settings/status/reload, and synthetic/real evidence. | This spec; consumer mapping; backend contract; live-test spec; architecture and spine supplements | User approved 2026-07-21; architecture re-review required |
| `CR-002` | CLI mode maps the pre-existing node-local account root into the empty-base child. Default uses the actual OS home; a validated explicit override may select another existing root. Never create/select an empty replacement home by default. | DS-UC017 and implementation guidance | Bounded implementation fix |
| `CR-003` | Stdio MCP environment builder starts from the sanitized operational base and applies exact configured server-specific values as additions; it does not treat the additions as the parent or restore parent inheritance. | DS-UC014 and implementation guidance | Bounded implementation fix |
| `CR-004` | Custom-provider delete remains idempotent: absent custom provider is success; built-in provider deletion stays rejected. | DS-UC002B / AC-011 | Bounded implementation fix |
| `CR-005` | Correct implementation handoff: empty-base environment applies to both Claude modes; `tools: []`, empty setting sources, and strict explicit MCP apply only to managed-secret. | DS-UC017 / REQ-018 | Bounded packaging fix |

### Architecture Review Round 5 Bounded Correction

| Finding | Correction | Design Effect | Approval Effect |
| --- | --- | --- | --- |
| `AR-008` | The concrete LLM example now constructs the semantic consumer with `providerId: target.credentialProviderId` and reads `credentialSlot` only from the tagged authentication requirement. The canonical `LLMConstructionTarget` exposes no displayed/creator `providerId` and no duplicate top-level credential slot. | Removes the contradictory CR-001 failure path by construction; all production spines, owners, definitions, consumers, and intended outcomes remain unchanged. | `Design Impact` only; no requirement or user-visible behavior change and no new user approval required. Architecture re-review required. |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To Design | Status / Approval |
| --- | --- | --- | --- | --- |
| [use-case-spine-validation.md](./use-case-spine-validation.md) | Complete UC-001–018 spines, reachability, and attribute-provenance audit | REQ-001–019 / AC-001–019 | Normative design-principles validation and removal authority | AR-008 target shape corrected; user-approved behavior unchanged |
| [secret-storage-architecture.md](./secret-storage-architecture.md) | Mermaid system, Store/pair, health, runtime, AutoByteus gateway, host test, unchanged Docker, Kubernetes extension, Claude, and hardening diagrams | REQ-001–019 / AC-001–019 | Visual authority for spines and boundaries | AR-008 construction flow corrected; user-approved behavior unchanged |
| [secret-storage-backend-contract.md](./secret-storage-backend-contract.md) | Service/backend/Store/capability/lifecycle/health/pair plus Claude and AutoByteus consumers | REQ-001, 005–008, 010–013, 015, 017–019 | Normative port and semantics | AR-008 target shape corrected; user-approved behavior unchanged |
| [credential-consumer-mapping.md](./credential-consumer-mapping.md) | Current aliases and target consumer/construction/removal mapping | REQ-001, 002, 004, 005, 011, 014, 016, 018, 019 | Evidence plus normative mappings | AR-008 example/shape corrected; user-approved behavior unchanged |
| [live-test-secret-provisioning.md](./live-test-secret-provisioning.md) | Direct-only separate host real-E2E provisioning, zero-copy worktree workflow, Docker non-impact, managed Claude and AutoByteus real evidence | REQ-002–005, 008, 009, 012, 016–019 | Normative test/operator flow | User-approved CR-001 revision |
| [threat-model-and-option-analysis.md](./threat-model-and-option-analysis.md) | Threats, first-delivery assurance, options, exclusions | REQ-002–005, 008, 009, 012–019 | Security basis and constraints | User-approved CR-001 revision |

## Task Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement` combining feature, cross-cutting refactor, migration, and security boundary work.
- Current design issue found: `Yes`.
- Root cause classification: `Boundary Or Ownership Issue`, `Duplicated Policy Or Coordination`, and `Legacy Or Compatibility Pressure`.
- Refactor needed now: `Yes`.
- Evidence: secret state is owned by generic config/custom JSON/global environment; consumers perform ambient lookup; test setup distributes ignored files; agent children inherit trusted state; deployment has no backend/Store contract.
- Design response: introduce one lifecycle owner, explicit construction authentication, a separate configuration plane, replaceable-backend extension contracts, an in-process Local backend with pair-authenticated separate default/E2E Stores, first-delivery environment/file-tool hardening, and a clean migration/removal path.
- Refactor rationale: adding a provider abstraction while retaining environment reads would preserve the root leak and worktree failure. The in-scope behavior cannot be coherent without removing those paths.
- Design-principles revalidation response: every UC-001–018 path has a complete spine. The CR-001 audit adds only facts required by the supported path: one definition, one discovery-consumer variant, one shared discovery owner, and one reusable `credentialProviderId`. Generic product scope/address fields, a Local Store connection alias, arbitrary profile lifecycle, ordinary lifecycle CAS/version fields, separate create/replace management commands, cross-Store copy, overlapping capability booleans, combined storage/provider-validation status, duplicate consumer-plus-definition resolution input, requested assurance configuration, and the Local Store daemon/IPC protocol remain excluded.
- Intentional deferrals/residual risk: no concrete enterprise adapter or strong identity/container enforcement ships initially. Same-user Local Store mode remains `LOCAL_HARDENED`; JavaScript/SDK memory cannot be reliably zeroized. Managed Claude intentionally trusts one agentic child with one credential and cannot hide it from that executable/SDK; stronger non-environment delivery is deferred unless the upstream SDK exposes a stable public cross-platform channel.

## Terminology

- **Secret Management Service**: server domain owner for lifecycle, resolution policy, status/errors, and value-free events.
- **Secret Storage Backend**: injected port implementation below the management service; owns custody mechanics only.
- **AutoByteus Local Secret Storage Backend / Local backend**: an in-process Agent Server implementation of `SecretStorageBackend` that opens one configured encrypted SQLite database/key pair; not Electron-owned and not a shared multi-node network vault.
- **Local Store / Store**: one physical encrypted SQLite database plus its independent key file. The default and real-E2E Stores are distinct custody instances, not profiles.
- **Backend configuration**: typed non-secret adapter selection/options; excludes bootstrap identity/capability.
- **Consumer provisioning service**: trusted owner that describes its semantic consumer/credential slot, asks `SecretManagementService` to resolve it, maps the returned value into construction authentication, and calls a credential-agnostic factory. Definition lookup remains encapsulated by management.
- **Claude runtime authentication service**: specialized server-owned consumer-provisioning owner for exact Claude mode selection, managed consumer identity, JIT `resolveForUse`, and value-free subject failure mapping. It does not build the child environment or call a backend/catalog directly.
- **Construction context**: ephemeral object combining effective behavior config with resolved authentication at client construction only.
- **Credential provider ID**: non-secret construction-target identity naming the provider/gateway whose credential authenticates the next request. It defaults to the model provider; AutoByteus-runtime models explicitly use `AUTOBYTEUS` even when their displayed downstream provider differs.
- **AutoByteus remote model discovery service**: server-owned application service that resolves exact LLM/audio/image discovery consumers and passes ephemeral authentication to storage-neutral remote providers. It owns no Store mechanics and is not a second secret-management service.
- **Externally managed backend**: extension-contract backend instance for which AutoByteus can status/resolve but deployment tooling owns save/remove; first delivery uses only a test fixture for this capability and ships no concrete enterprise adapter.
- **`LOCAL_HARDENED`**: first-delivery assurance that secrets are removed from plaintext configuration/ambient child environments, built-in file tools deny Store roots, and output is redacted. It does not resist arbitrary same-user process access.
- **`STRONG_AGENT_ISOLATION`**: future assurance requiring verified separate identity/container/filesystem/network enforcement; never reported by this delivery.
- **Authenticated pair verifier**: current-format Store metadata binding a random `store_id` to the exact root key so an empty Store detects a swapped key before becoming ready.

## Design Reading Order

The document follows verified behavior -> transition/removal -> spines/ownership -> interfaces -> subsystem/files -> sequence/risks. The Mermaid supplement is the visual companion, not a substitute for the contracts here.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove all provider/search/media/metadata credential reads from `process.env` and all corresponding `AppConfig` secret methods/writers.
- Remove `AUTOBYTEUS_API_KEY` reads but preserve every AutoByteus remote discovery/reload/invocation caller through the new Store-backed service; feature removal is forbidden.
- Remove credential loading from global `.env.test` setup and all live-suite environment gates.
- Remove `apiKey` from custom-provider persisted schema and endpoint/model objects.
- Remove browser-public secret config and unsupported Google CSE credential Settings paths.
- Replace Claude `auto|cli|api-key` parsing with exact `cli|managed-secret`; remove ambient key/OAuth selection, arbitrary caller `env`, broad setting sources, and raw-before-redaction diagnostic buffering.
- Do not retain compatibility fields, dual constructors, env fallback, old schema reads in normal repositories, or another-Store fallback.
- Historical parsing exists only in the migration owner and is deleted/retired after the supported migration window per release policy.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subjects/locations: known credential aliases in application-data `.env`, including `AUTOBYTEUS_API_KEY`; custom provider JSON v1 `{id,name,providerType,baseUrl,apiKey}`; ignored checkout/package `.env.test`; ordinary non-secret AppConfig/provider metadata including `AUTOBYTEUS_LLM_SERVER_HOSTS`.
- Approximate volume: small node-local configuration files; potentially many developer checkout copies, but only the application-data/custom-provider stores are product-managed migration inputs.
- Change: application `.env` becomes non-secret only; custom provider schema v2 omits `apiKey`; backend configuration and separate Local Store databases/keys are new current schemas; test scenario/Store config becomes tracked JSON.
- Normal behavior evidence: AppConfig currently loads/writes `.env`; custom provider store reads v1; global test setup loads `.env.test`.
- Required invariants: no plaintext credential remains in supported product stores; non-secret provider identity/name/base URL and non-secret config remain; no automatic value import into a new backend; current runtime reads current schema only.
- Constraints: copying old plaintext into the new Store would extend exposure and require the server to handle raw migration values. Keeping plaintext backups violates the target custody rule. Operators may need to rotate credentials previously proliferated across worktrees.
- Decision: `Migration Required` for product-managed `.env` scrubbing and custom-provider v1 -> v2 transformation. `Discard/Reprovision` for credential values. Ignored developer `.env.test` copies are outside product persistence and receive a value-free detection/cleanup instruction, not an automatic filesystem search.
- Rationale: transformation is necessary to preserve non-secret metadata while removing sensitive fields. The data volume is low; startup gating and atomic rewrites are proportionate. Direct use is unsafe because current readers expose keys.
- Supported criteria: AC-007, AC-009, AC-012.

### Migration Plan (Only When Decision Is `Migration Required`)

- Current canonical target: non-secret AppConfig plus custom-provider schema v2 plus one selected backend bound to one custody location.
- Historical shapes: known secret aliases in `.env`; custom-provider schema v1 with `apiKey`.
- Why direct use/rebuild is insufficient: provider metadata must survive, but plaintext values must not; provider UUID continuity determines the new logical definition ID.
- Trigger: earliest server startup, before dotenv and provider/model initialization.
- Owner: `autobyteus-server-ts/src/secret-management/migration/secret-custody-migration.ts` and migration-only schemas.
- Normal runtime: current AppConfig/provider store/consumer services have no legacy branches.
- Completion ledger: schema/migration version plus definition/provider IDs and `REPROVISION_REQUIRED`; never value-derived metadata.
- Restart safety: validate complete replacements in memory; write new temp file, fsync where supported, atomic rename; rerun detects already-clean target. Do not create plaintext backup copies.
- Validation: scan product-managed target files by known field/alias names, load v2 metadata, confirm environment aliases are deleted from server state, then allow provider initialization.
- Failure/recovery: fail startup before agent execution; leave original source untouched if target validation fails before atomic replacement; provide a value-free maintenance retry/report.
- Concurrent access: single server maintenance/cutover; old and new versions must not access the same data directory concurrently.
- Retention: migration-only decoder remains for the declared upgrade window, then is removed; no normal runtime fallback.

| Step | Source | Target | Owner | Validation | Failure / Recovery |
| --- | --- | --- | --- | --- | --- |
| 1 | known aliases in application `.env` | same file with catalogued secret lines removed | migration | no known alias; unrelated config parses | abort before rename/startup |
| 2 | inherited known aliases already present in server `process.env` | removed from current process before any child | bootstrap/migration | presence-only scan | startup fails if cleanup invariant cannot be met |
| 3 | custom provider v1 | atomic v2 metadata without `apiKey` | migration | UUID/name/type/base URL preserved; v2 reader passes | original remains until valid replacement |
| 4 | removed value identities | migration ledger/status | migration + secret catalog | every affected definition is missing/reprovision-required | value-free retry/report |
| 5 | ignored `.env.test` workflow | tracked `test-config/live-e2e.json` and separate real-E2E Store | test tooling/operator | no active credential dotenv loaders/references; default Store not mounted/opened | real suite preflight blocks with setup instruction |
| 6 | legacy Claude `auto` and `api-key` configuration and parent key aliases | explicit `cli` or `managed-secret` non-secret mode plus Store provisioning | migration/bootstrap | only exact modes accepted; recognized aliases absent from parent; no caller `env` | invalid mode fails before lookup/spawn with value-free remediation |
| 7 | `AUTOBYTEUS_API_KEY` in application/test environment sources | reprovision marker for `provider.autobyteus.api-key`; no copied value | migration/test cleanup | alias absent; `AUTOBYTEUS_LLM_SERVER_HOSTS` preserved byte-for-byte as non-secret configuration | startup/real suite reports value-free missing definition until directly provisioned |

## Data-Flow Spine Inventory

The architecture is validated per approved use case rather than through one aggregated “secret flow.” Detailed evidence, return paths, and attribute decisions are retained in [use-case-spine-validation.md](./use-case-spine-validation.md).

| Spine ID | Scope | Use Case / Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| `DS-UC001` | Primary End-to-End | UC-001 / BEH-001, 005 | provider Settings | stored/removed value-free status | `LlmProviderService`; management owns secret lifecycle | built-in credential lifecycle |
| `DS-UC002A` | Primary End-to-End | UC-002 / BEH-001, 005 | custom provider editor | metadata-only provider + credential-backed catalog | `LlmProviderService` | custom create transaction |
| `DS-UC002B` | Primary End-to-End | UC-002 / BEH-001, 005 | custom provider delete | provider/credential absent + catalog refreshed | `LlmProviderService` | custom delete transaction |
| `DS-UC003` | Primary End-to-End | UC-003 / BEH-006, 011 | deployment/Settings backend config | validated config + restart-required status | `SecretStorageConfigurationService` | separate configuration plane |
| `DS-UC004` | Primary End-to-End | UC-004 / BEH-006, 010 | Electron/direct/normal Docker/single Kubernetes server Pod/host-test start | services ready with in-process Store-bound backend | bootstrap composer | deployment-neutral Local backend construction |
| `DS-UC005` | Primary End-to-End | UC-005 / BEH-010 | writable initialization or read-only open | pair-verifier validated backend or exact degraded health | `LocalSecretStorageBackend` | empty-Store-safe physical lifecycle |
| `DS-UC006A` | Primary End-to-End | UC-006 / BEH-010 | hidden trusted credential input | encrypted record in separate real-E2E Store | `LocalSecretStoreProvisioningService` | one-time E2E provisioning |
| `DS-UC007` | Primary End-to-End | UC-007 / BEH-003, 009 | agent/run LLM creation | normalized provider response/stream | `LLMProvisioningService` then concrete LLM | explicit LLM authentication |
| `DS-UC008A` | Primary End-to-End | UC-008 / BEH-003 | Search tool | normalized search result | `SearchProvisioningService` / executor | subject-specific search path |
| `DS-UC008B` | Primary End-to-End | UC-008 / BEH-003 | media tool/service | media result/artifact | `MediaClientProvisioningService` | subject-specific media path |
| `DS-UC008C` | Primary End-to-End | UC-008 / BEH-003 | model-catalog enrichment | refreshed catalog/status | `ModelMetadataProvisioningService` | subject-specific metadata path |
| `DS-UC009` | Primary Operational | UC-009 / BEH-004 | default test command | deterministic assertions | subject package test harness | fake/synthetic coverage without real keys |
| `DS-UC010` | Primary Operational | UC-010 / BEH-004, 010 | real command in fresh host worktree | sanitized real-provider evidence | live E2E harness | zero-copy substantive real coverage |
| `DS-UC011` | Bounded Local / Startup | UC-011 / BEH-006, 010 | Local backend open or exact-Store reset | ready handle or selected Store deleted safely | Local backend / reset owner | concurrent readers, bounded writers, explicit deletion |
| `DS-UC012` | Primary End-to-End | UC-012 / BEH-007, 011 | local container config or unregistered enterprise kind | node-local readiness or value-free unsupported-kind failure | deployment composition | first-delivery boundary and future extension |
| `DS-UC013` | Primary End-to-End | UC-013 / BEH-001, 005, 011 | Settings status load | writable controls or external guidance | configuration service projection | capability-aware UI |
| `DS-UC014` | Primary End-to-End | UC-014 / BEH-002, 007 | agent run provisioning | sanitized result plus verified `LOCAL_HARDENED` state | execution security context/launcher | exact first-delivery non-inheritance claim |
| `DS-UC015` | Startup / Migration | UC-015 / BEH-008 | first post-upgrade start | current secret-free runtime | `SecretCustodyMigration` | clean legacy cutover |
| `DS-UC016` | Primary Operational | UC-016 / BEH-011 | InMemory/Local/fixture conformance runner | declared-capability and health assertions | conformance suite | first-delivery implementations + extension contract |
| `DS-UC017` | Primary End-to-End | UC-017 / BEH-012 | Claude model-discovery/run authentication selection | CLI-authenticated result, managed-secret result, or exact value-free failure | public `ClaudeSdkClient`; injected `ClaudeRuntimeAuthenticationService` owns mode/JIT auth | explicit two-mode auth and managed exact-child delivery |
| `DS-UC018A` | Primary End-to-End | UC-018 / BEH-013 | AutoByteus provider Settings save/remove/status | managed AutoByteus definition + existing reload or authoritative scoped-clear trigger | `LlmProviderService` | gateway credential lifecycle without UI redesign |
| `DS-UC018B` | Primary End-to-End | UC-018 / BEH-013 | configured-host startup/list/full or provider reload | synchronized remote LLM/audio/image catalogs or value-free failure | `AutobyteusRemoteModelDiscoveryService` plus core remote providers/factories | Store-backed discovery with no feature removal |
| `DS-UC018C` | Primary End-to-End | UC-018 / BEH-013 | selected AutoByteus-runtime LLM/audio/image model | authenticated remote result | generic LLM/media provisioning then `AutobyteusClient` | runtime-aware credential ownership |
| `DS-UC018D` | Primary Operational | UC-018 / BEH-004, 013 | fresh-worktree AutoByteus live scenario | sanitized real discovery/invocation evidence | live E2E harness | regression proof with no key environment |
| `DS-RET001` | Return-Event | UC-001–006, 011, 013, 016 | storage/config outcome | backend health plus healthy-only definition state | configuration/initiating service | complete degraded status semantics |
| `DS-RET002` | Return-Event | UC-007, 008, 010, 012, 017 | provider/runtime response/error | normalized product/test result | client + initiating use-case owner | provider/runtime return behavior |
| `DS-LOC001` | Bounded Local | UC-001, 005, 006, 011 | validated exact Local Store record command | committed ciphertext + status | `LocalEncryptedSecretRepository` | one crypto/persistence owner |
| `DS-LOC002` | Bounded Local | UC-011 | explicit exact-Store reset confirmation | selected DB/key/sidecars deleted after handles close | Local Store reset owner | safe destructive reset |

## Primary Execution Spine(s)

- `DS-UC001`: `ProviderApiKeyEditor -> Pinia action -> provider GraphQL mutation -> LlmProviderService -> SecretManagementService -> active writable backend -> custody record`.
- `DS-UC002A`: `CustomProviderEditor -> GraphQL -> LlmProviderService ID allocation/probe -> metadata-only store -> SecretManagementService/backend -> runtime/model catalog sync -> Settings result`.
- `DS-UC002B`: `Settings delete -> GraphQL -> LlmProviderService -> SecretManagementService remove -> metadata store remove -> model catalog sync -> result`.
- `DS-UC003`: `Deployment/Settings config -> typed transport -> SecretStorageConfigurationService -> typed validation -> candidate factory/health probe -> config repository -> restart-required status`.
- `DS-UC004`: `Electron/direct/normal Docker/single Kubernetes server Pod/host-test start -> bootstrap -> Local Store config -> backend factory -> in-process Local backend -> exact database/key open -> management/provisioning ready`.
- `DS-UC005`: `Writable initialization or read-only bootstrap -> pair presence/permission check -> open SQLite -> validate format and authenticated store_id/key verifier -> READY handle or LOCKED/UNAVAILABLE/CORRUPT/INCOMPATIBLE health`.
- `DS-UC006A`: `Hidden trusted input -> E2E provisioning service -> E2E Store encryption -> exact target record -> checkpoint/close -> status`.
- `DS-UC007`: `AgentRunBackendFactory -> LLMProvisioningService -> SecretManagementService/backend -> LLMFactory -> concrete LLM/SDK -> real provider -> normalized response`.
- `DS-UC008A`: `Search tool -> injected executor -> SearchProvisioningService -> management/backend -> search strategy/client -> provider -> result`.
- `DS-UC008B`: `Media service/tool -> MediaClientProvisioningService -> management/backend -> media factory/client -> provider -> result`.
- `DS-UC008C`: `Model catalog reload -> ModelMetadataProvisioningService -> management/backend -> metadata client -> provider endpoint -> catalog/status`.
- `DS-UC009`: `Default test command -> classified fixture -> in-memory backend or disposable Local Store synthetic canary -> normal subject path -> fake provider -> assertions`.
- `DS-UC010`: `Fresh host worktree -> tracked manifest -> live harness -> canonical host E2E Store read-only open/preflight -> Store-bound server -> browser/API product path -> real provider -> sanitized evidence`.
- `DS-UC012`: `Docker/single-Pod Local config -> node-local Store -> ready`; or `unregistered enterprise kind -> configuration validation -> value-free unsupported-kind guidance`. Multi-node centralized execution is deferred.
- `DS-UC013`: `Settings load -> GraphQL status -> configuration service/active backend descriptor -> tagged lifecycle projection -> enabled controls or instruction code`.
- `DS-UC014`: `Agent/application-worker trigger -> AgentExecutionSecurityContext -> file-tool root policy + empty-base env/descriptor allowlist -> runtime -> sanitized result + LOCAL_HARDENED report`; no same-user isolation claim.
- `DS-UC015`: `Pre-dotenv bootstrap -> migration detector/decoder -> atomic scrub/metadata transform -> current-schema validation/ledger -> current runtime`.
- `DS-UC016`: `Conformance runner -> InMemory or Local variant or test-only external fixture -> declared lifecycle/health suite -> pair/fault/redaction/no-fallback assertions`.
- `DS-UC017`: `Claude model-discovery/run request -> ClaudeSdkClient public boundary -> ClaudeRuntimeAuthenticationService -> cli (zero lookup) or managed SecretManagementService.resolveForUse(exact runtime consumer) -> return closed auth to client -> internal empty-base exact-child environment -> Claude Code child -> redacted result/error`; invalid/non-ready branches stop before spawn without fallback.
- `DS-UC018A`: `AutoByteus provider editor -> existing provider GraphQL/service -> SecretManagementService save/remove/status (llm/AUTOBYTEUS/apiKey) -> provider.autobyteus.api-key -> value-free credential status -> save: established reload-all trigger; remove: authoritative AutoByteus runtime-subset clear with zero lookup`.
- `DS-UC018B`: `startup/list/reload -> server model provider -> AutobyteusRemoteModelDiscoveryService -> no hosts ? zero lookup : resolveForUse(modelDiscovery/<kind>/AUTOBYTEUS/apiKey) -> core remote provider -> AutobyteusClient catalog request -> parsed models with credentialProviderId=AUTOBYTEUS -> factory replace corresponding AUTOBYTEUS-runtime subset -> server cache/UI`.
- `DS-UC018C`: `remote model selection -> generic LLM/media provisioning -> describe target -> credentialProviderId AUTOBYTEUS -> resolve exact llm/media consumer -> construction context -> AutobyteusLLM/audio/image client -> remote request -> normalized result`.
- `DS-UC018D`: `fresh worktree -> tracked non-secret hosts/scenario -> read-only real-E2E Store -> exact definition preflight -> product discovery/construction path -> real AutoByteus endpoint -> sanitized evidence and capability report`.

## Spine Narratives (Mandatory)

| Use Case(s) | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| UC-001 | A write-only key crosses transport once, is stored atomically through management, and returns only status. | provider subject, management, backend | provider service / management | validation, binding, redaction |
| UC-002 | Provider service coordinates transient probe, metadata-only persistence, derived secret lifecycle, and runtime sync. | provider, metadata record, credential definition, model catalog | provider service | URL policy, compensation, redaction |
| UC-003/004/011 | Configuration selects one backend; startup constructs it; the in-process Local backend owns exact Store open/close/concurrency while reset names one Store. | backend configuration, bootstrap, Store handle | config service/bootstrap/Local backend | path normalization, format validation, health, locking |
| UC-005/006 | Local backend authenticates the Store/key pair even when empty; trusted setup directly provisions the separate E2E Store and cannot open the default Store. | physical Store, pair verifier, exact secret record | Local backend / setup service | KDF/AEAD, staged creation, checkpoint/close |
| UC-007 | LLM provisioning resolves semantic auth, factory composes config, and concrete LLM owns the provider call. | provisioning, factory, LLM/SDK | provisioning then LLM | binding catalog, error sanitizer |
| UC-008 | Search, media, and metadata retain separate subject-specific provisioning paths while sharing management/value contracts. | subject provisioning, client, provider | respective subject owner | provider selection, result normalization |
| UC-009/010 | Synthetic default coverage and host real-provider coverage have separate custody/setup paths but exercise normal subject contracts; existing Docker deployment is independent and unchanged. | harness, backend/Store, product path | corresponding test harness | source-review workflow prerequisite, host path derivation, preflight, evidence scan |
| UC-012/014 | Local Docker/single-Pod nodes use Local custody; first-delivery launcher removes ambient state and reports lower-tier assurance. Centralized custody and strong worker separation are deferred. | server control, Local adapter, execution launcher | deployment/execution owners | no shared SQLite, no inflated assurance |
| UC-013 | A tagged lifecycle capability drives value-free writable/external UI state without contradictory booleans. | configuration descriptor, Settings state | config service projection | localization/instruction mapping |
| UC-015 | Migration alone understands historical values/aliases; current runtime starts only after secret-free validation. | migration, current repositories | migration coordinator | ledger, atomic writes, recovery |
| UC-016 | One suite proves InMemory/Local and the external capability fixture against declared behavior and complete health states. | suite, fixture, adapter | conformance suite | pair fault injection, cleanup |
| UC-017 | Claude authentication explicitly selects external CLI with no resolution or managed-secret with catalog-authorized JIT resolution and exact-child delivery; every outcome is sanitized and fallback-free. | Claude auth service, management, SDK client, exact child | Claude auth service then SDK client | child environment builder, safe tool/settings policy, early diagnostic redaction |
| UC-018 | Existing AutoByteus gateway Settings, discovery, reload, and LLM/audio/image invocation remain intact while one Store-backed definition replaces the ambient alias. | provider subject, remote discovery service, model factories, generic construction provisioning, `AutobyteusClient` | provider service for lifecycle; discovery service for catalogs; generic provisioning for invocation | host validation, runtime-scoped replacement, last-known-good behavior, redaction, capability-aware real coverage |

## Spine Actors / Main-Line Nodes

| Node | Direct Role On Spine | Not Its Responsibility |
| --- | --- | --- |
| Settings/startup transport | map external input to typed subject command | secret policy, backend calls, identity invention |
| `SecretStorageConfigurationService` | validate/persist non-secret adapter selection and report restart requirement | provider credential lifecycle/bootstrap-secret storage |
| Provider/search subject service | coordinate subject metadata and credential lifecycle transaction | custody implementation |
| `SecretManagementService` | authoritative lifecycle/resolution/status/events | vendor mechanics, UI, model config composition |
| `SecretStorageBackend` | exact-definition custody operations and tagged lifecycle capability | catalog policy, consumer mapping, or caller-selected physical path |
| Subject-specific provisioning service | describe its semantic consumer, request resolved authentication, then construct its client | catalog lookup, encrypted persistence, or another consumer family's behavior |
| `AutobyteusRemoteModelDiscoveryService` | resolve exact model-kind discovery consumer, call core remote provider, publish runtime-scoped catalog result | Settings lifecycle, Store mechanics, construction-time resolution, or model-provider rewriting |
| `LLMFactory` / client factory | model lookup/default composition and construction | secret resolution/Store selection |
| Concrete client/SDK | authenticated provider request/stream | storage backend or serializable credential config |
| In-process Local backend | exact Store open/close, encryption, transactions, format/permission validation | product consumer policy, GraphQL, or alternate-Store selection |
| Agent execution security context/launcher | derive/enforce runtime capability envelope | secret resolution |
| `ClaudeRuntimeAuthenticationService` | select exact mode, own the Claude managed consumer, resolve JIT, map subject failures | child environment construction, backend/catalog access, raw-value serialization |
| `ClaudeSdkClient` | build exact child environment/options, spawn SDK child, redact diagnostics, drop temporary references | mode fallback, catalog/backend lookup, accepting caller env |
| Live test harness | tracked scenario interpretation, preflight, run cleanup/evidence | global key exposure or fake-only substitution |

## Ownership Map

- **Secret storage configuration** owns typed non-secret adapter choice, validation, persistence, health probe, and restart-required status. Phase 1 does not hot-swap the active backend.
- **Secret management** is the sole authoritative public server boundary for catalogued secret lifecycle/resolution; it encapsulates definition validation, tagged lifecycle capability, policy, errors, and operation events.
- **Provider/search services** own the transaction between their subject metadata and secret lifecycle. They do not own storage.
- **Consumer provisioning** owns mapping its concrete runtime request to a semantic consumer/credential slot and then to construction authentication; `SecretManagementService` alone maps that identity to a definition.
- **AutoByteus remote discovery** owns only JIT discovery authentication and LLM/audio/image catalog synchronization. It reuses management, does not access a backend directly, and does not own runtime construction. No configured hosts means no resolution and authoritative clear of that model-kind AutoByteus subset. A transient pre-authoritative configured-host refresh failure preserves the last-known-good remote subset; a successful authoritative result replaces only that model kind's AutoByteus-runtime subset. An explicit successful credential removal is authoritative lifecycle input and clears all AutoByteus-runtime subsets without discovery.
- **Core factories** own effective runtime configuration and construction contracts; they do not reach upward to server services.
- **Local backend** owns database/key pairing, staged creation, authenticated pair-verifier validation, open/close, encryption, transaction/busy policy, access mode, and schema/encryption/verifier-format validation for one Store. SQLite coordinates bounded host readers/writers; no standalone Store process exists.
- **Local Store setup** owns trusted direct E2E provisioning against only the target E2E backend; it has no source/default backend dependency and is not a runtime API.
- **Agent execution security** owns first-delivery child environment/descriptor composition and built-in file-tool roots. Separate identity/container/network enforcement is a future owner extension, not a shipped claim.
- **Claude runtime authentication service** owns exact `cli|managed-secret` mode selection, the managed consumer identity, JIT call to `SecretManagementService`, and value-free failure mapping. It never accesses the catalog/backend directly or builds the child environment.
- **Claude SDK client** owns last-mile empty-base environment construction, managed tool/settings controls, exact child spawn, reference lifetime minimization, and early diagnostic redaction. Sessions/model catalog cannot supply an environment or receive authentication.
- **Migration** owns historical shapes and completes before normal repositories/services initialize.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| provider/search GraphQL resolvers | subject service + secret management | existing API transport and UI mapping | backend/Store choice, plaintext retention |
| backend Settings/startup resolver | storage configuration service | typed external configuration | backend bootstrap identity or secret lifecycle |
| `LLMFactory` static entry | factory registry/composer | preserve established core construction entry | resolution/backend access |
| `LocalSecretStorageBackend` | local encrypted repository | server-side in-process backend implementation | management/catalog policy or caller-selected alternate Store |
| server model-provider wrappers | `AutobyteusRemoteModelDiscoveryService` + core factories | preserve established startup/list/reload entry points while moving resolution above core | ambient key reads, backend access, downstream-provider credential guessing |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replacement | Scope | Notes |
| --- | --- | --- | --- | --- |
| `AppConfig` credential get/set and `.env` writes | generic config is not custody | subject services + management/backend | In This Change | retain non-secret config only |
| provider/search/media/metadata `process.env` reads | ambient, duplicated, inheritable | construction authentication/provisioning | In This Change | no fallback |
| AutoByteus discovery-call removal | removes supported configured-host behavior rather than legacy code | server-owned explicit-auth discovery and runtime-scoped factory synchronization | In This Change | preserve startup/list/full/provider reload plus LLM/audio/image invocation |
| global dotenv credential test setup and live key gates | broad exposure/worktree copies | tracked manifest + Store/harness | In This Change | `.env.test` only if verified non-secret |
| custom-provider JSON `apiKey` and endpoint key fields/defaults | plaintext duplicate custody | derived definition + resolved context | In This Change | migrate metadata v1->v2 |
| public `googleSpeechApiKey` config | browser exposure/no supported owner | remove | In This Change | no replacement unless future server consumer |
| unsupported Google CSE credential setting | current core rejects provider | remove active UI/config aliases | In This Change | no compatibility |
| unrestricted absolute-path behavior in built-in file tools | reaches custody/host data | authorized realpath policy | In This Change | process tools also need sandbox |
| `{...process.env}` child launch patterns | passes trusted state | runtime-specific allowlist | In This Change | centralized policy |
| Claude Agent SDK `auto` and `api-key`, ambient alias selection, parent-env spread, and caller `env` | hidden fallback and broad state delivery bypass central custody | exact `cli` or `managed-secret`; managed JIT resolution and exact-child environment | In This Change | native Anthropic and managed Claude identities reuse one definition independently |
| Claude user/project/local settings, hooks/plugins/API-key helper/external MCP and built-in tools in managed mode | can inspect/propagate child environment or create inheriting descendants | empty setting sources, `tools: []`, strict explicitly materialized AutoByteus MCP, sanitized server-owned tool children | In This Change | CLI mode remains external auth but still uses purpose-built environment |
| raw-before-redaction Claude diagnostics | managed key may enter memory/log/session evidence before sanitizer | redact on append and at outward formatting; stable subject error codes | In This Change | no raw stderr in product events/artifacts |
| compatibility provider constructor overloads | enable old env/config path | one context constructor | In This Change | update all callers/tests together |

## Return Or Event Spine(s) (If Applicable)

`DS-RET001`: `backend initialization/operation -> SecretStorageConfigurationService health normalization -> READY ? management MISSING/CONFIGURED status : null definition state + value-free instruction -> subject projection -> GraphQL/UI/CLI/preflight`.

Health is exactly `READY`, `LOCKED`, `UNAVAILABLE`, `CORRUPT`, or `INCOMPATIBLE`. Only `READY` permits definition status, resolve, or lifecycle; definition state is exactly `MISSING` or `CONFIGURED`. Non-ready bootstrap starts only the value-free configuration/Settings/health control plane, disables writes and provider construction, and maps to stable instruction codes. A subject service may separately compose provider validation only when backend health permits it. No path exposes values, fragments, hashes, lengths, storage revision/timestamp, physical address, bootstrap identity, request headers, or raw provider error bodies.

## Bounded Local / Internal Spines (If Applicable)

### DS-UC011 Local backend open/concurrency

- Parent owner: `LocalSecretStorageBackend`.
- Flow: `normalize configured paths -> validate pair presence/permissions/access mode -> open SQLite -> validate schema/encryption/verifier format -> authenticate store_id pair verifier with derived key -> configure read-only or bounded transaction/busy behavior -> READY backend`; failures map to exact degraded health.
- Importance: Electron/direct/Docker servers use the same in-process implementation with server-local defaults; multiple host worktrees read one prepared host E2E Store without another process or routine human steps.

### DS-LOC001 Local Store encrypted record write

- Parent owner: Local encrypted repository inside the Local backend.
- Flow: `validate definition ID -> derive Store encryption key from that Store's independent root key -> authenticated encrypt with fresh nonce and bound associated data -> SQLite transaction -> durable commit -> return status`.
- Importance: keeps cryptography/crash consistency inside one auditable owner. Vetted library only; no proprietary algorithm.

### DS-LOC002 Explicit Local Store reset

- Parent owner: exact-Store reset service in the server/local-storage subsystem.
- Flow: `explicit exact-Store confirmation -> stop new operations and close local backend handle -> acquire DB/filesystem exclusion -> delete selected DB + independent key + SQLite sidecars -> value-free reset status`.
- Importance: ordinary server-data reset preserves both physical Stores; destructive reset cannot race an open handle or delete every Store by omission.

### Authenticated Store/key pair check

- Parent owner: Local Store initializer/crypto inside `LocalSecretStorageBackend`.
- Flow: `read store_id + verifier metadata -> derive pair-verifier key from root key with HKDF domain -> AES-GCM authenticate fixed verifier plaintext with format/store_id AAD -> READY or CORRUPT`.
- Importance: closes MP-001 when `secret_records` is empty. Read-only open performs the same check; missing verifier in the declared current format is `CORRUPT`, while an unsupported verifier/Store format is `INCOMPATIBLE`.

## Off-Spine Concerns Around The Spine

| Concern | Spine IDs | Serves Owner | Responsibility | Why | Risk If Main-Line/Misplaced |
| --- | --- | --- | --- | --- | --- |
| Secret binding catalog | UC-001, 002, 007, 008 | management | stable definitions and allowed semantic consumers | central semantic policy behind the authoritative service | adapters learn product subjects or callers bypass management with duplicate bindings |
| Sensitive error sanitizer | all | every trusted boundary | redact errors/logs/traces/artifacts | return paths leak too | scattered denylist misses shapes |
| Provider credential validator | UC-001, 002 | subject service | optional provider probe and sanitized validation state | storage != validity | backend couples to provider APIs |
| Backend configuration repository | UC-003, 004, 012, 013 | config service/bootstrap | persist typed non-secret config | independent configuration plane | bootstrap secrets enter AppConfig/UI |
| Local Store path composer | UC-003, 004, 010, 011 | server bootstrap/live launcher | derive normal database/key paths below serverDataDir or explicit host E2E paths | Git needs only canonical host E2E filenames/access mode; Docker uses its existing data dir | runtime caller selects arbitrary path or worktree uses local custody |
| Operation event sink | UC-001, 002, 007, 008 | management | value-free lifecycle/resolve evidence | observability | fabricated identity or secret fields |
| Migration ledger | UC-015 | migration | migration version, affected logical IDs, outcome | restart/operator evidence | historical values leak into logs |
| Source-review execution rule | UC-010 | software-team workflow | run direct-secret coverage only after implementation source review | test code can exfiltrate by design | invented runtime attestation flag or false security claim |
| Platform sandbox adapters | UC-012, 014 | execution launcher | OS/container-specific enforcement | allowlist alone insufficient | policy claims without enforcement |
| SSRF/base-URL policy | UC-002, 007, 008 | custom provider service/client | validate destination/redirect/private-network rules | key can be sent to configured endpoint | agent-controlled exfiltration URL |

## Ownership Boundaries

1. **Transport -> subject service:** transport drops raw input immediately after constructing `SecretValue`; it cannot access backends or expose generic read/list.
2. **Subject service -> management:** subject service owns provider metadata transaction; management owns every credential lifecycle and resolution invariant.
3. **Management -> backend:** management passes one catalog-validated definition ID to one injected port; physical Store/prefix mapping and custody mechanics remain encapsulated below it.
4. **Provisioning -> factory/client:** provisioning resolves authentication; factory composes config; client unwraps only at SDK construction. Neither side reaches around the other.
5. **Server bootstrap -> Local backend:** factory supplies one exact database/key/access configuration; the in-process backend opens it and owns repository format/crypto. Requests above management carry no Store/path selector.
6. **Trusted server -> agent:** only bounded requests/results cross. Custody database/key files, backend handles, workload identity, parent environment, and unrelated resolved values stay on the server side. Explicit Claude managed mode is the one exception: the exact Claude child receives one catalog-authorized Anthropic value and becomes a trusted agentic secret consumer; no sibling/tool/other child receives it.
7. **Claude auth service -> SDK client:** the service supplies a closed authentication union only; the client unwraps managed `SecretValue` at exact child environment construction. Session/catalog callers cannot depend on either management or authentication internals.
8. **Migration -> current runtime:** historical schemas exist only before the startup gate; current repositories accept current schema only.

## Boundary Encapsulation Map

| Authoritative Boundary | Encapsulates | Callers Must Use | Forbidden Bypass | If Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `SecretManagementService` | catalog validation, lifecycle capability, lifecycle/resolution, errors/events | subject and provisioning services | caller -> adapter; caller -> catalog + backend | add subject-specific request method/type, not expose internals |
| `SecretStorageConfigurationService` | config schema/repository/validation/restart-required status and five-state backend health/degraded control plane | startup and Settings config resolver | Settings -> backend factory/identity | expand typed configuration/health API |
| each subject-specific provisioning service | semantic consumer selection, resolve request, authentication mapping, client construction | its agent/tool/media/metadata owner | runtime -> management + factory separately | add explicit subject method rather than a generic coordinator |
| `LLMFactory` | model registry, defaults, context construction | provisioning and trusted core callers | provisioning directly `new`s LLM while also using factory | expose construction target and creation input |
| `LocalSecretStorageBackend` | one Store's pair validation, format, encryption, transaction/access mode | backend factory and management through port | caller/subject opens DB; runtime selects another Store | add exact internal repository operation, never expose database handle |
| `LocalSecretStoreProvisioningService` | trusted direct target-only E2E provision | setup command only | default/source Store access, runtime/GraphQL provision, arbitrary target path | construct service with exact target backend only |
| execution launcher/security boundary | first-delivery file roots and empty-base environment/descriptor enforcement | all agent-controlled spawners and supported application workers | individual spawner uses parent env/direct spawn or claims strong isolation | add launcher adapter/capability |
| `ClaudeRuntimeAuthenticationService` | exact mode, managed consumer, JIT resolution, subject error mapping | `ClaudeSdkClient` only | session/model catalog resolves directly; service imports catalog/backend; automatic fallback | expose one `prepareForLaunch` result |
| `ClaudeSdkClient` | exact child environment/options, spawn, cleanup, early diagnostics | session/model catalog callers | caller-supplied env; parent spread/mutation; direct management/backend calls | keep one internal launch builder used by model discovery and runs |
| migration coordinator | legacy decoders/atomic rewrites/ledger | earliest bootstrap | current repository dual-reads v1/v2 | enhance migration, keep runtime current-only |

## Dependency Rules

1. `autobyteus-ts` may define secret-safe value/authentication/construction and execution-security contracts. It never imports server management/backends/catalog/Store configuration.
2. `autobyteus-server-ts` consumer provisioning depends on core factory contracts and server `SecretManagementService`.
3. `SecretManagementService` depends on the backend port and catalog; not concrete adapters.
4. Concrete adapters depend inward on the port and outward on their vendor/local clients. Other server domains do not import adapters.
5. Configuration service/factory constructs one backend; requests cannot select backend/Store/path.
6. GraphQL resolvers use subject services/config service; no generic resolve/list/value API.
7. LLM/search/media/metadata classes do not read provider credentials from environment/config stores.
8. Local persistence files remain internal to server secret management and do not import provider catalogs, GraphQL, LLMs, or subject services.
9. Agent launchers receive an explicit security context built from an empty environment baseline; no spread/clone of trusted `process.env`.
10. Test code uses the manifest/harness; no secret dotenv import or other-checkout discovery.
11. Missing/non-ready backend/Store/value is typed. No adapter, alternate Store, environment, or legacy fallback.
12. Claude CLI mode never calls management; managed mode calls only `SecretManagementService.resolveForUse` with the exact runtime identity. The SDK client never calls management/backend or accepts caller env. Only the exact managed child receives `ANTHROPIC_API_KEY`; no mode fallback exists.
13. AutoByteus remote core providers/clients never call management or read `AUTOBYTEUS_API_KEY`. The server discovery owner and generic construction provisioning resolve exact consumers and pass ephemeral authentication.
14. `model.providerId` remains display/creator identity only. Model registration materializes the required `credentialProviderId`—native definitions set their credential owner once; gateway models set `AUTOBYTEUS`. The construction target omits displayed `providerId`, and generic provisioning resolves only against `credentialProviderId`; there is no runtime fallback/re-derivation from provider, model name, client class, or host.
15. Remote catalog synchronization is model-kind and runtime scoped. It must not replace/delete native API models that share a downstream provider with a remote model.

## Interface Boundary Mapping

| Interface / Method | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `SecretStorageConfigurationService.validateAndSave` | backend config | validate registered selection/persist non-secret config | typed discriminated config | returns five-state health/capabilities/restart-required status only |
| `SecretManagementService.saveForConsumer/removeForConsumer` | catalogued credential | catalog-bound atomic lifecycle/status/event | semantic consumer identity; value only on save | `WRITABLE` lifecycle required |
| `SecretManagementService.getStatusForConsumer` | one catalogued credential | value-free status result | semantic consumer identity | `{health, definitionState}`; state null unless health READY |
| `SecretManagementService.resolveForUse` | one authorized use | catalog lookup plus exact resolution | semantic consumer identity only | internal only; caller cannot supply a duplicate expected definition |
| `SecretStorageBackend.resolve` | one storage record | custody read | validated definition ID | base port; adapter/Store or namespace already bound |
| `WritableSecretStorageBackend.save/remove` | one storage record | atomic create-or-replace and idempotent remove | validated definition ID + value on save | capability-checked; no caller CAS |
| `LocalSecretStoreProvisioningService.provisionExact` | direct E2E setup write | save hidden transient input to exact target without readback | definition ID + transient value; service holds target only | no source/default/copy API |
| `LLMFactory.describeConstructionTarget` | model auth need | credential-provider/requirement declaration | model identifier | returns exactly `{credentialProviderId, authenticationRequirement}`; no displayed provider, duplicate slot, definition ID, or value |
| `LLMFactory.createLLM` | concrete LLM | compose config and construct | model ID + `{configInput?, authentication}` | auth input mandatory, including `none` |
| `AutobyteusRemoteModelDiscoveryService.ensure/refresh` | gateway catalog discovery | no-host zero-resolve/scoped clear; exact discovery resolution; core discovery; runtime-scoped publish | model kind `llm\|audio\|image` | one application service with model-kind-specific consumers; no raw string/status/UI/backend API |
| core factory `replaceModelsForRuntime` | remote catalog registry | atomically replace one runtime subset | model kind's factory + `AUTOBYTEUS` runtime + parsed models | preserves native same-provider models; no resolution/network call |
| `LiveE2EManifestLoader.load` | real test scenarios | validate tracked config | canonical file path | contains names only |
| `AgentExecutionLauncher.launch` | agent runtime capability | enforce sandbox/environment | explicit security context + runtime request | no implicit parent state |
| `ClaudeRuntimeAuthenticationService.prepareForLaunch` | Claude runtime auth | select CLI or authorize/resolve managed consumer JIT | validated server mode only | internal; returns closed auth union, no env/raw string/backend handle |
| `ClaudeSdkClient` internal launch builder | exact Claude child | compose empty-base env/settings/tools, spawn, cleanup/redact | `ClaudeRuntimeAuthentication` | no caller env, management/backend, serialization, CLI arg, or fallback |

Claude subject-level failure mapping is closed: invalid/legacy mode -> `CLAUDE_RUNTIME_AUTH_MODE_INVALID`; CLI account failure -> `CLAUDE_RUNTIME_CLI_AUTH_UNAVAILABLE`; invalid catalog binding -> `CLAUDE_RUNTIME_SECRET_BINDING_INVALID`; missing -> `CLAUDE_RUNTIME_CREDENTIAL_MISSING`; backend health maps individually to `CLAUDE_RUNTIME_SECRET_STORE_LOCKED|UNAVAILABLE|CORRUPT|INCOMPATIBLE`; child construction -> `CLAUDE_RUNTIME_SPAWN_FAILED`; provider rejection -> `CLAUDE_RUNTIME_AUTH_FAILED`. Pre-spawn failures do not spawn; none falls back or contains raw diagnostics/value/path/environment.

The initiating operation owns projection: a run/start request returns the typed Claude runtime failure; best-effort `listModels()` preserves its current empty-list behavior and records only the stable value-free status internally. It must not hide the cause by trying CLI, ambient aliases, or another Store. A later status-bearing model-catalog API is outside this ticket.

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| management service methods | Yes | Yes | Low | keep subject-specific request types |
| backend ports | Yes | Yes | Low | accept validated definition IDs only; adapter owns physical mapping |
| factory creation | Yes | Yes | Low | separate config/auth shapes; no option bag of secrets |
| Local Store direct E2E provision | Yes | Yes | Low | target backend is constructor dependency; request has exact definition/value only; no source/copy/list/readback |
| GraphQL lifecycle | Yes per subject | Yes | Low | never add generic name/path query |
| agent launcher | Yes | Yes | Low | all spawners must route through it |
| Claude runtime authentication service | Yes | Yes | Low | exact mode and exact consumer; no definition/backend/env selector |
| Claude SDK child builder | Yes | Yes | Low | accepts closed auth union internally; public callers cannot supply env |
| AutoByteus remote discovery service | Yes | Yes | Low | fixed provider `AUTOBYTEUS`, explicit model kind; no definition/path selector |
| construction target descriptor | Yes | Yes | Low | `credentialProviderId` supplies the exact non-secret ownership fact; no runtime-specific branch in provisioning |

## Main Domain Subject Naming Check

| Subject | Proposed Name | Natural? | Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| lifecycle owner | `SecretManagementService` | Yes | “backend service” reversal | keep service above backend |
| custody port | `SecretStorageBackend` | Yes | “provider” confused with AI provider | consistently use backend/adapter |
| local custody implementation | `LocalSecretStorageBackend` | Yes | “server” or “broker” implies another process | use backend for in-process implementation and Store for one database/key pair |
| local physical custody | default Store / real-E2E Store | Yes | “profile” implies one shared DB namespace | use exact physical file roles; no generic profile domain type |
| runtime composition | `LLMConstructionContext` | Yes | generic `LLMRuntimeConfig` merges serialized config/auth | retain explicit context name |
| backend configuration owner | `SecretStorageConfigurationService` | Yes | mixed with credential management | separate APIs/folder |
| Claude managed provisioning owner | `ClaudeRuntimeAuthenticationService` | Yes | vague policy/helper name could hide resolution/lifecycle | name by exact runtime-auth subject and keep child delivery in client |
| AutoByteus catalog provisioning owner | `AutobyteusRemoteModelDiscoveryService` | Yes | “provider” alone confuses AI provider with storage backend | name the gateway and discovery subject; keep lifecycle in existing provider service |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Capability | Decision | Why | If New, Why Existing Is Not Right |
| --- | --- | --- | --- | --- |
| LLM registry/default composition | core `LLMFactory` | Extend | already authoritative and async | N/A |
| agent LLM creation | `AutoByteusAgentRunBackendFactory` injectable seam | Extend | natural server provisioning caller | N/A |
| provider metadata CRUD/runtime sync | server `llm-management` | Extend | owns provider subject transaction | N/A |
| non-secret server config | `AppConfig` | Reuse narrowly | valid for ordinary config after secret APIs removed | cannot own values/backend bootstrap identity |
| search strategies/factory | core search subsystem | Extend | retain provider request behavior, add explicit auth | N/A |
| media factories/services | core/server multimedia subsystems | Extend | existing client creators are a usable seam | N/A |
| AutoByteus remote model discovery | existing core remote providers plus server model-provider wrappers | Extend with one server application service | protocols/parsers and user triggers already exist; only explicit resolution/publishing owner is missing | core factory initialization cannot access server management; feature removal is forbidden |
| app-data migration framework | existing server migration/GraphQL visibility | Extend | established startup/operator pattern | historical credential types remain in dedicated migration files |
| secret lifecycle/custody | none | Create New | no current boundary safely fits | generic AppConfig and provider stores are the problem |
| shared local custody | existing server has `node:sqlite` usage but no secret owner | Create Local backend inside server secret subsystem | must span Electron/direct/Docker/host-test starts while keeping one Store-bound adapter per server | Electron-only storage, ordinary app DB tables, per-worktree files, a same-user daemon, or prescribed Docker E2E mounts add coupling/complexity |
| agent launch security | fragmented spawn/path code | Create coherent capability, extend launch sites | policy must be consistent across shell/PTY/Codex/Claude/MCP | local per-spawner denylist is insufficient |
| Claude runtime auth/provisioning | existing auth-environment helper and `ClaudeSdkClient` | Replace helper with specialized service; extend client | generic `resolveForUse` already owns resolution, while Claude needs mode/JIT/delivery policy outside core LLM construction | current helper combines mode with ambient environment and has no management boundary |
| test live scenario declaration | scattered live tests/env gates | Create New | needs tracked semantic manifest and one harness | global Vitest setup is ambient |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spine IDs | Governing Owner(s) | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Core runtime construction (`autobyteus-ts`) | `SecretValue`, LLM/media/search auth/context/factory contracts | 003, 004 | core factories/clients | Extend | storage-neutral |
| Core AutoByteus remote catalog support (`autobyteus-ts`) | authenticated remote protocol/parsing, `credentialProviderId`, runtime-scoped registry synchronization | 018 | core remote providers/factories | Refactor/Extend | no environment or server-management dependency |
| Server secret management | catalog, lifecycle, resolution, storage status/events, backend ports | 001–004, 009, 010 | `SecretManagementService` | Create New | authoritative domain boundary; provider validation remains subject-owned |
| Server storage configuration | typed config, persistence, backend factory/restart status | 001, 010 | configuration service/bootstrap | Create New | no secret bootstrap values; no Phase-1 hot swap |
| Server consumer provisioning | LLM/search/media/metadata binding and client construction | 003, 004 | provisioning services | Create New inside relevant server domains | avoids god-object provisioning service |
| Server AutoByteus remote discovery | exact discovery consumers, JIT resolution, startup/list/reload orchestration | 018 | `AutobyteusRemoteModelDiscoveryService` and existing server model providers | Add/Extend | one reusable service, not three secret resolvers |
| Server Local secret storage | Store-bound in-process backend, pair verifier, crypto repository, physical initialization/reset/direct setup provision | 004–006, 010, 011 | Local backend / setup service | Create New inside server secret-management subsystem | no new workspace executable/process package |
| Agent execution hardening | file-root/env/descriptor/launcher policy and `LOCAL_HARDENED` reporting | 007, 010 | execution security context/launcher | Create/Extend | covers all launch paths without strong identity claim |
| Claude runtime authentication | exact two-mode selection, managed consumer resolution, child delivery/tool/settings/diagnostics | 017 | `ClaudeRuntimeAuthenticationService` then `ClaudeSdkClient` | Replace/Extend | reuses management; no new backend API or LLM context |
| Legacy migration | pre-bootstrap scrub/schema transform/ledger | 008 | migration coordinator | Create New | historical-only boundary |
| Web/Electron Settings/packaging | write-only UX, status/capabilities, default Local backend configuration | 001, 002, 005, 009 | existing settings/runtime managers | Extend | frontend never connects directly to custody; no Store supervision process |
| Live test infrastructure | tracked manifest, exact host E2E Store path derivation, read-only preflight, execution, evidence scan | 005, 006, 010 | live harness | Create New/Replace | real-provider first-class; source review is upstream workflow; no Docker mount behavior |
| Enterprise adapter extension | typed registration/config/capability/conformance seam only | 010, 007 | deployment composition | Define/Defer | no concrete enterprise adapter or strong deployment manifest in first delivery |

## Draft File Responsibility Mapping

| Candidate File | Subsystem | Owner / Boundary | Concern | Why One File | Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/secrets/secret-value.ts` | core | value boundary | non-serializable redacted wrapper | one security primitive | yes |
| `autobyteus-ts/src/llm/llm-construction-context.ts` | core LLM | factory/client contract | auth union and construction context | shared by factory/classes | `SecretValue` |
| `autobyteus-ts/src/llm/llm-factory.ts` | core LLM | factory | target description, config composition, construction | established owner | context/auth requirement |
| `autobyteus-ts/src/llm/models.ts` and audio/image model files | core model domain | construction descriptor | downstream provider plus defaulted/overridden credential provider identity | one fact on authoritative model | auth requirement |
| core AutoByteus LLM/audio/image provider files | core gateway protocol | discovery | accept ephemeral auth and return parsed models | existing protocol owners | construction auth + runtime model metadata |
| core LLM/audio/image factories | core registry | runtime-scoped synchronization | replace only AutoByteus-runtime subset | existing registries | runtime enum/model arrays |
| `autobyteus-server-ts/src/secret-management/services/secret-management-service.ts` | server secret | authoritative service | lifecycle, resolve, status/event sequencing | coherent subject owner | catalog/port/status |
| `.../configuration/secret-storage-configuration-service.ts` | storage config | config owner | typed non-secret configuration | separate plane | config schema |
| `.../backends/secret-storage-backend.ts` | server secret | port | shared operations plus discriminated writable/externally-managed variants over validated definition IDs | adapter contract | definition/status/lifecycle shapes |
| `.../provisioning/llm-provisioning-service.ts` | LLM management | provisioning owner | create semantic consumer request, map resolved value to auth, invoke core factory | one consumer family | consumer/auth types |
| `autobyteus-server-ts/src/llm-management/services/autobyteus-remote-model-discovery-service.ts` | server catalog | discovery provisioning owner | no-host gate, exact model-kind consumer, JIT resolution, core discovery and runtime-scoped publish | one shared gateway/model-catalog concern | management + core provider/factory ports |
| `autobyteus-server-ts/src/secret-management/backends/local/local-secret-storage-backend.ts` | server Local storage | backend | in-process Store open/close/status/resolve/write capability | one backend owner | configuration/repository |
| `.../backends/local/local-encrypted-secret-repository.ts` | server Local storage | repository | minimal one-Store schema, encryption, exact atomic records, busy handling | crypto/persistence concern | stored schema |
| `.../backends/local/local-secret-store-initializer.ts` | server Local storage | initialization owner | staged pair creation, presence/permission/format and authenticated pair-verifier validation | distinct persistence lifecycle | Store configuration/health |
| `.../backends/local/local-secret-store-provisioning-service.ts` | server Local setup | setup owner | direct target-only E2E provision; no source/copy method | trusted setup-only lifecycle | backend/definition types |
| `.../agent-execution/security/agent-execution-security-context.ts` | execution | policy owner | explicit file roots, empty-base env and descriptor allowlist, derived `LOCAL_HARDENED` report | shared launch contract | runtime security context |
| `src/runtime-management/claude/authentication/claude-runtime-authentication-service.ts` | Claude runtime | mode/JIT provisioning owner | validate `cli` or `managed-secret`, build exact consumer, call `resolveForUse`, map value-free failures | one subject owner | management service + closed auth union |
| `src/runtime-management/claude/authentication/claude-runtime-authentication.ts` | Claude runtime | shared runtime auth shape | closed `cli` or `managedApiKey` result and exact consumer constant | prevents env/raw string bags | `SecretValue` |
| `src/runtime-management/claude/client/claude-sdk-client.ts` and child environment builder | Claude runtime | exact child delivery owner | no caller env; build empty-base mode-specific env/settings/tools, spawn both model/run queries, cleanup, early diagnostics | one last-mile boundary | runtime auth + execution security |
| `test-config/live-e2e.json` | test | manifest | real-E2E Store filenames/access mode/scenarios/definitions | canonical tracked config | schema |
| `test-support/live-e2e/live-e2e-harness.ts` | test | harness | host E2E path derivation, read-only preflight/run/cleanup | coherent operational owner | manifest/status |

## Reusable Owned Structures Check

| Structure / Logic | Shared File | Owner | Why Shared | Redundant Attributes Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| redacted raw value | `autobyteus-ts/src/secrets/secret-value.ts` | core value boundary | backend and clients need same safe wrapper | Yes | Yes | false memory-security claim |
| auth union/context | `llm-construction-context.ts` | core LLM | every LLM follows one constructor shape | Yes | Yes | provider/backend option bag |
| definition/binding/definition-status/backend-health/lifecycle capability | server secret domain files | management/config domains | service/adapters/config/UI mappings share non-overlapping semantics | Yes | Yes | generic arbitrary secret record, combined impossible status, provider-validation DTO, or physical path DTO |
| backend conformance fixture | `tests/secret-management/backend-conformance.ts` | server tests | every adapter must meet same invariants | Yes | Yes | substitute for real-provider tests |
| agent launch policy | core/server security context files | execution security | every spawner needs identical invariant source | Yes | Yes | secret-name denylist |
| Claude runtime authentication union/consumer constant | Claude authentication domain file | Claude runtime auth service | service/client/tests require one exact semantic shape | Yes | Yes | generic runtime config or environment map |
| live manifest schema | `test-support/live-e2e/live-e2e-manifest.ts` | test harness | packages need one scenario contract | Yes | Yes | credential/config dumping ground |
| credential-provider identity | core model/construction target files | core factory/model domain | ordinary and gateway models share one generic provisioning contract | Yes | Yes | definition ID, secret value, or host-derived guess |
| AutoByteus discovery consumer builder | server remote discovery service | model-catalog application owner | three model kinds share one definition but require distinct authorization/evidence | Yes | Yes | generic arbitrary provider/definition selector |

## Shared Structure / Data Model Tightness Check

| Structure | Clear Field Meaning? | Redundancy Removed? | Overlap Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `LLMFactoryCreationInput` | Yes | Yes | Low | `configInput` and `authentication` only |
| `LLMConstructionContext` | Yes | Yes | Low | `config` effective, `authentication` runtime; no backend fields |
| `SecretBinding` | Yes | Yes | Low | definition ID plus allowed semantic consumer only; migration aliases stay elsewhere |
| `SecretStorageConfiguration` | Yes | Yes | Medium | discriminated adapter shapes; forbid bootstrap secret fields |
| `SecretLifecycleCapability` | Yes | Yes | Low | tagged `WRITABLE`/`EXTERNALLY_MANAGED`; no overlapping booleans |
| `SecretBackendHealth` + `ManagedSecretStatusResult` | Yes | Yes | Low | a discriminated union makes definition state present only with `READY`; internally mapped definition ID and generic message/retry flags are absent; subject validation remains separate |
| `LocalStoreMetadata` | Yes | Yes | Low | singleton format fields plus random store ID and authenticated pair verifier; no profiles/timestamps/value hints |
| `LiveE2EManifest` | Yes | Yes | Low | backend kind/canonical host E2E filenames/read-only mode/scenarios only; host root is derived and key bytes remain elsewhere |
| `ClaudeRuntimeAuthentication` | Yes | Yes | Low | closed `cli` or `managedApiKey`; no mode string plus optional key, environment, definition ID, or backend fields |
| `LLMConstructionTarget` | Yes | Yes | Low | `{credentialProviderId, authenticationRequirement}` only; displayed/creator provider and runtime are deliberately absent so consumer construction cannot confuse them with credential ownership; slot remains inside the tagged requirement |
| `ModelDiscoveryConsumer` | Yes | Yes | Low | exact `{kind, modelKind, providerId, credentialSlot}`; no host/definition/path/value |

## Final File Responsibility Mapping

### Core runtime (`autobyteus-ts`)

| File | Owner | Concrete Responsibility | Changes |
| --- | --- | --- | --- |
| `src/secrets/secret-value.ts`, `src/secrets/index.ts` | secret-safe value | redacted non-serializable wrapper/export | Add |
| `src/llm/llm-construction-context.ts` | LLM construction contract | `ResolvedLLMAuthentication`, requirement, factory input/context | Add |
| `src/llm/llm-factory.ts` | LLM factory | describe target including credential provider; mandatory authentication; compose config; construct context; runtime-scoped remote synchronization | Modify |
| `src/llm/models.ts`, `supported-model-definitions.ts` | model definitions | materialize required non-secret credential owner during registration: native owner assigned once, AutoByteus-runtime owner explicitly `AUTOBYTEUS`; never an optional runtime fallback | Modify |
| `src/llm/autobyteus-provider.ts`, `src/multimedia/audio/autobyteus-audio-provider.ts`, `src/multimedia/image/autobyteus-image-provider.ts` | AutoByteus gateway discovery | accept explicit ephemeral auth, parse remote models, mark gateway credential owner, return results without server/backend dependency | Modify; preserve functionality |
| `src/multimedia/audio/audio-client-factory.ts`, `src/multimedia/image/image-client-factory.ts` | media registries | describe construction target and atomically replace only one runtime subset | Modify |
| `src/llm/api/*-llm.ts` and Gemini helper | concrete LLM | context constructor; unwrap only into SDK; no env reads | Modify |
| `src/llm/openai-compatible-endpoint-model.ts`, provider/discovery files | custom model runtime | remove stored/default API key; accept temporary auth | Modify |
| `src/llm/metadata/*` | metadata clients | explicit auth input; no static environment reads | Modify |
| `src/tools/search/factory.ts`, strategies, `search-tool.ts` | search client/runtime | explicit auth/executor injection | Modify |
| `src/multimedia/**/factory.ts`, provider clients | media construction | explicit construction auth; no env reads | Modify |
| `src/tools/file/workspace-path-utils.ts` and file tools | file capability | realpath-aware authorized-root enforcement | Modify/extend |
| `src/tools/terminal/**` | terminal runtimes | accept explicit launch security/env; remove parent-env defaults | Modify |

### Server (`autobyteus-server-ts`)

| File | Owner | Concrete Responsibility | Changes |
| --- | --- | --- | --- |
| `src/secret-management/domain/secret-binding.ts` | catalog domain | stable definition IDs and semantic consumer bindings | Add |
| `.../domain/secret-storage-types.ts` | storage domain | healthy-only definition status, five-state backend health, tagged lifecycle capability, stable instruction/errors | Add |
| `.../catalog/secret-catalog.ts` | catalog/binding | current definitions and semantic consumer mapping used internally by management | Add |
| `.../backends/secret-storage-backend.ts` | port | shared operations and discriminated writable/externally-managed definition-ID variants | Add |
| `.../backends/in-memory-secret-storage-backend.ts` | test adapter | synthetic deterministic custody/faults | Add |
| `.../backends/local/local-secret-storage-backend.ts` | local adapter | in-process exact Store open/close/status/resolve and lifecycle mapping | Add |
| `.../backends/local/local-encrypted-secret-repository.ts` | local persistence | one-Store schema, AEAD, exact transactions, busy/read-only behavior | Add |
| `.../backends/local/local-secret-store-initializer.ts` | local persistence lifecycle | staged fail-closed database/key creation; permission, format, and pair-verifier validation | Add |
| `.../backends/local/local-secret-store-provisioning-service.ts` | trusted setup | direct target-only E2E provision; no default/source read dependency | Add |
| concrete Vault/AWS/Kubernetes backend files | future enterprise adapter | vendor custody/capability mapping | Out of scope for first delivery |
| `.../services/secret-management-service.ts` | authoritative service | lifecycle/resolution/status/event sequencing | Add |
| `.../configuration/secret-storage-configuration.ts` | config model | typed discriminated non-secret config | Add |
| `.../configuration/secret-storage-configuration-service.ts` | config owner | validate/save/restart-required status | Add |
| `.../configuration/secret-storage-backend-factory.ts` | composition | construct exactly one adapter | Add |
| `.../migration/secret-custody-migration.ts`, `legacy-secret-schemas.ts` | migration | pre-dotenv scrub including `AUTOBYTEUS_API_KEY`, preserve hosts, v1->v2/ledger | Add |
| `src/llm-management/services/llm-provisioning-service.ts` | LLM provisioning | request semantic-consumer resolution from the target credential provider, map auth, invoke factory | Modify |
| `src/llm-management/services/autobyteus-remote-model-discovery-service.ts` | AutoByteus gateway catalog provisioning | no-host zero-resolve/scoped clear; exact model-kind discovery consumer; JIT resolve; invoke core discovery; runtime-scoped publish; all-subset clear on credential removal | Add |
| `src/llm-management/providers/autobyteus-llm-model-provider.ts`, cached wrapper, and `src/multimedia-management/providers/{audio,image}-model-provider.ts` plus cached wrappers | model catalog lifecycle | call shared AutoByteus discovery service before cache publication and during full/targeted reload | Modify |
| `src/llm-management/.../llm-provider-service.ts` | provider subject | coordinate metadata and lifecycle | Modify |
| `src/llm-management/.../custom-llm-provider-store.ts` | current provider store | v2 secret-free metadata only | Modify |
| `src/llm-management/provisioning/model-metadata-provisioning-service.ts` | metadata provisioning | credential-aware enrichment, curated fallback | Add |
| `src/search-management/search-provisioning-service.ts` | search provisioning | selected client/executor construction | Add |
| `src/multimedia-management/services/*` plus provisioning file | media domain | asynchronous credential-aware client creators | Modify/Add |
| `src/config/app-config.ts` | non-secret config only | remove key methods/dotenv secret ownership | Modify |
| `src/api/graphql/types/llm-provider.ts`, server settings/search types | transport | write-only mutation/status/capabilities; backend config surface | Modify |
| `src/agent-execution/security/*` | execution security | file-root policy, empty-base environment/descriptor policy, launcher composition, derived `LOCAL_HARDENED` report | Add |
| all server/Core external-runtime spawn composition, including `src/application-engine/runtime/application-worker-supervisor.ts` | launch callers | route through execution security; never spread trusted `process.env` | Modify |
| `src/runtime-management/claude/client/claude-sdk-auth-environment.ts` | legacy Claude auth/env helper | current ambient `auto`, `cli`, and `api-key` plus parent spread | Remove; responsibilities split below |
| `src/runtime-management/claude/authentication/claude-runtime-authentication.ts` | Claude auth domain | exact mode/result/consumer identity | Add |
| `src/runtime-management/claude/authentication/claude-runtime-authentication-service.ts` | Claude auth owner | validate mode; CLI zero-resolve; managed JIT `resolveForUse`; map exact value-free failures | Add |
| `src/runtime-management/claude/client/claude-sdk-child-environment.ts` | Claude last-mile delivery concern | empty-base allowlists; only managed `ANTHROPIC_API_KEY`; no parent mutation/caller env | Add |
| `src/runtime-management/claude/client/claude-sdk-setting-sources.ts` and tool-policy files | Claude launch policy | managed empty settings, `tools: []`, strict explicit AutoByteus MCP; CLI explicit account sources | Modify |
| `src/runtime-management/claude/client/claude-sdk-client.ts` and types | Claude SDK boundary | inject auth service; use one internal builder for model discovery/runs; remove public `env`; spawn/cleanup | Modify |
| `src/agent-execution/backends/claude/session/claude-session-tooling-options.ts`, MCP materializer/config | Claude managed tools | in managed mode expose only explicitly materialized AutoByteus MCP names; do not add `Skill` or any built-in/external MCP | Modify |
| `src/agent-execution/backends/claude/session/claude-process-diagnostics.ts` | Claude outward error boundary | redact before buffering and before summary; stable value-free mapping | Modify |
| `tests/unit/runtime-management/claude/authentication/claude-runtime-authentication-service.test.ts` | Claude auth unit coverage | default/valid/legacy mode, zero/JIT lookup, identity, complete pre-spawn failure mapping/no fallback | Add |
| `tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` | Claude client unit coverage | exact env, no caller env/parent mutation, `tools: []`, settings/MCP, model/run shared path, spawn cleanup | Modify |
| `tests/unit/agent-execution/backends/claude/session/claude-process-diagnostics.test.ts` | Claude diagnostics | redact before buffer and outward formatting; seeded negative leak | Modify |
| `tests/integration/runtime-management/claude/claude-managed-secret.integration.test.ts` | server integration | InMemory/temporary Local exact consumer -> management -> captured exact child; sibling/tool-child negatives; all failure states | Add |
| server unit/integration tests for AutoByteus discovery and provider Settings | gateway regression | exact bindings, no-host zero lookup/scoped clear, status/save/remove/reload, runtime-scoped replacement, last-known-good transient failure, construction identity | Add/Modify |
| managed Claude real scenario under existing server API/E2E hierarchy | API/E2E | read-only real-E2E Store -> exact managed child -> real SDK authentication/request -> structural evidence | Add after coverage investigation |
| server startup/composition root | bootstrap | migration -> config -> backend -> services ordering | Modify |

### Local Backend, Web/Electron, Test, Deployment

| File | Owner | Concrete Responsibility | Changes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/secret-management/backends/local/*` | in-process Local backend | Store config, initializer, encrypted repository, backend and setup service | Add inside existing server package |
| `autobyteus-server-ts/src/secret-management/backends/local/local-store-schema.ts` | schema owner | `store_metadata` with store ID/verifier plus exact `secret_records`; no profile table | Add |
| `autobyteus-server-ts/src/secret-management/backends/local/local-store-crypto.ts` | crypto owner | root-key load, domain-separated pair-verifier/record keys, HKDF/AES-GCM/AAD encoding | Add |
| `autobyteus-web/components/settings/ProviderAPIKeyManager.vue` and child forms | UI | write-only values; status/validation; external-management state | Modify |
| `autobyteus-web/components/settings/WebSearchConfigurationCard.vue` | UI | same search lifecycle/status | Modify |
| new Settings backend-storage card/composable/schema | UI | non-secret backend selection/options/capabilities | Add |
| `autobyteus-web/electron/server/*ServerManager.ts`, `serverRuntimeEnv.ts` | Electron composition | let server bootstrap derive the default Local Store below the existing server data directory; no credential env and no Store supervision | Modify |
| `autobyteus-web/electron/server/services/AppDataService.ts` and reset handler | server-data lifecycle | preserve `secret-store/` on ordinary reset or require explicit inclusion confirmation | Modify |
| `autobyteus-web/nuxt.config.ts` | web config | remove public secret fields | Modify |
| `test-config/live-e2e.json` | tracked manifest | Local Store kind, E2E filenames/read-only mode, scenarios/logical IDs, non-secret AutoByteus host/capability declarations | Add |
| `test-support/live-e2e/*` | test harness | config parse, host E2E path derivation, read-only Store preflight, managed Claude and AutoByteus remote scenarios, execution, negative leak scan/evidence cleanup | Add |
| `autobyteus-ts/tests/setup.ts`, live suites/config | tests | remove dotenv keys/env gates; use harness or synthetic backend | Modify |
| package `.gitignore` files | repo hygiene | allow tracked verified-non-secret `.env.test` only if retained | Modify conditionally |
| `autobyteus-server-ts/docker/docker-compose.yml` and Docker launcher files | existing Docker deployment | keep current topology, named volumes, ports, and launcher unchanged; normal Local Store derives below existing `AUTOBYTEUS_DATA_DIR` | No change |
| Kubernetes/company enterprise adapter and strong-isolation manifests/docs | future deployment | centralized custody and separate worker enforcement | Explicitly deferred / no first-delivery files |

Implementation may refine filenames to established local conventions, but must preserve the owners and forbidden contents above. A split rollout across packages is acceptable only on an isolated integration branch where the repository does not ship a mixed legacy/new runtime.

## Applied Patterns (If Any)

- **Ports and adapters:** management owns the backend port; first delivery registers InMemory and Local. Future Vault/AWS/Kubernetes implementations remain below the same port without changing callers.
- **Application provisioning service:** server maps semantic runtime need to authentication before calling reusable core factories.
- **Credential-owner descriptor:** models expose one non-secret credential provider identity; generic provisioning remains branch-free across direct and gateway runtimes.
- **Runtime-scoped registry synchronization:** remote discovery publishes by source/runtime rather than downstream provider, preserving native and gateway models together.
- **Tagged lifecycle capability:** one configured backend reports `WRITABLE` or `EXTERNALLY_MANAGED`; read-only Local real-E2E mode reports externally managed to ordinary runtime Settings.
- **Store-bound backend:** exact database/key/access configuration is fixed at bootstrap, preventing per-request cross-Store selection.
- **Ephemeral construction context:** serializable behavior config remains separate from runtime authentication.
- **Startup migration boundary:** historical plaintext shapes are transformed before current runtime.
- **Policy-to-platform launcher:** one execution policy with explicit OS/container enforcement adapters.

## Target Subsystem / Folder / File Mapping

```text
autobyteus-ts/src/
  secrets/
  llm/                         # storage-neutral auth/context + existing factory/clients
  tools/search/                # explicit executor/client auth
  multimedia/                  # explicit construction auth
  tools/file/ and tools/terminal/

autobyteus-server-ts/src/
  secret-management/
    domain/
    catalog/
    services/
    backends/
      local/                    # in-process Store-bound backend/crypto/repository/setup
    configuration/
    migration/
  llm-management/provisioning/
  search-management/
  multimedia-management/
  agent-execution/security/

test-config/live-e2e.json
test-support/live-e2e/
```

| Path | Kind | Owner / Boundary | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/secrets` | Folder | core safe value | transport-neutral secret wrapper | shared construction/backends | storage service/catalog |
| `autobyteus-ts/src/llm` | Folder | LLM factory/client | auth requirement/context and provider construction | existing owner | backend/Store resolution |
| `autobyteus-server-ts/src/secret-management` | Folder | management domain | catalog/service/ports/config/migration composition | new authoritative capability | provider SDK request logic |
| `.../backends` | Folder | adapter layer | Local/enterprise port implementations | custody mechanics separated | subject policy/UI |
| `.../backends/local` | Folder | in-process Local storage | physical Store lifecycle, pair binding, crypto, exact repository, direct setup provision | cohesive Local adapter internals inside server package | GraphQL, provider catalog, daemon/IPC, source/copy API |
| `.../configuration` | Folder | config plane | non-secret selection and backend construction | distinct from lifecycle | bootstrap tokens/values |
| `.../migration` | Folder | migration boundary | old schemas/scrubbing/ledger | confines history | runtime fallback |
| domain-specific `provisioning` folders | Folder | consumer family | resolve mapping and construct family client | avoids one provisioning god-object | persistence/crypto |
| `runtime-management/claude/authentication` | Folder | Claude runtime auth | exact mode, consumer identity, JIT resolution, failure mapping | specialized server runtime consumer | SDK environment/spawn or backend/catalog internals |
| `agent-execution/security` | Folder | first-delivery execution policy/launcher | realpath roots and empty-base environment/descriptor capability | cross-runtime hardening | secret resolving or strong-tier claim |
| `test-config` | Folder | tracked config | secret-free manifests | worktree automatic presence | capabilities/values |
| `test-support/live-e2e` | Folder | trusted harness | preflight/execution/evidence | narrow reviewed boundary | generic value export |

## Folder Boundary Check

| Path | Structural Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| core `llm`/`multimedia`/`tools` | Main-Line Domain-Control | Yes | Low | retains established product subjects |
| server `secret-management` | Mixed Justified with explicit subfolders | Yes | Medium | service, port, config, migration are one capability but structurally separated |
| server domain provisioning folders | Main-Line Domain-Control | Yes | Low | near runtime subject, depends on central management |
| server `secret-management/backends/local` | Persistence-Provider subfolder | Yes | Low/Medium | Local backend needs schema/crypto/repository/lifecycle separation but no executable/process package |
| `agent-execution/security` | Off-Spine Concern / enforcement | Yes | Low | one cross-runtime policy owner |
| `runtime-management/claude/authentication` | Main-Line Domain-Control | Yes | Low | separates mode/JIT consumer policy from SDK client delivery without a generic runtime-config bag |
| `test-support/live-e2e` | Operational control | Yes | Low | trusted live boundary isolated from ordinary tests |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| dependency | `LLMProvisioningService -> SecretManagementService -> SecretStorageBackend` | LLM imports Local Store/Vault or consumer calls adapter | preserves authority and replaceability |
| factory input | `createLLM(id, {configInput, authentication})` then internal `{config, authentication}` | put `apiKey` in `LLMConfig.extraParams` | config remains serializable and secret-free |
| Store binding | backend constructed for exact real-E2E database/key; missing is failure | `real-E2E Store -> default Store -> process.env` fallback | prevents cross-environment surprise |
| test config | tracked logical ID/E2E filenames/read-only mode/scenario | copied `.env.test` or Store key bytes in Git | zero-copy without secret distribution |
| future enterprise extension | future server adapter may use workload identity; first delivery rejects unregistered kind | pretend Vault/Kubernetes adapter ships or share Local SQLite between replicas | honest deployment boundary |
| backend capability | test-only externally-managed descriptor disables writes | UI always offers replace/delete | fixes extension semantics without shipping vendor adapter |
| local encryption | in-process Local backend writes exact records atomically using vetted AEAD and SQLite transactions | every consumer edits encrypted files or uses custom cipher | clear consistency/crypto owner |
| local persistence | separate Store pairs with authenticated `store_id` verifier plus exact encrypted records | format-only metadata, one DB per worktree, ordinary app table, profiles, or Docker E2E mount | empty-Store key mismatch detection and physical isolation |
| Claude managed auth | exact runtime identity -> generic `resolveForUse` -> closed auth union -> exact child env | Claude-specific secret API, direct backend/catalog access, `LLMConstructionContext`, or caller `env` | reuses authority while preserving Claude-specific delivery/trust policy |

### LLM construction example

```ts
type LLMConstructionTarget = {
  credentialProviderId: string;
  authenticationRequirement: LLMAuthenticationRequirement;
};

type LLMFactoryCreationInput = {
  configInput?: LLMFactoryConfigInput;
  authentication: ResolvedLLMAuthentication;
};

type LLMConstructionContext = {
  config: LLMConfig;
  authentication: ResolvedLLMAuthentication;
};

async function resolveLLMAuthentication(
  target: LLMConstructionTarget,
): Promise<ResolvedLLMAuthentication> {
  const requirement = target.authenticationRequirement;
  switch (requirement.kind) {
    case "none":
      return { kind: "none" };
    case "apiKey": {
      const apiKey = await secretManagementService.resolveForUse({
        kind: "llm",
        providerId: target.credentialProviderId,
        credentialSlot: requirement.credentialSlot,
      });
      return { kind: "apiKey", apiKey };
    }
    case "googleAuthenticationMode":
      return resolveGoogleAuthenticationWithinLlmProvisioning({
        credentialProviderId: target.credentialProviderId,
        requirement,
      });
  }
}

async function createProvisionedLLM(
  modelIdentifier: string,
  configInput: LLMFactoryConfigInput | undefined,
): Promise<BaseLLM> {
  const target = LLMFactory.describeConstructionTarget(modelIdentifier);
  const authentication = await resolveLLMAuthentication(target);
  return LLMFactory.createLLM(modelIdentifier, { configInput, authentication });
}
```

`LLMFactory` computes the effective `LLMConfig`, creates the context, and invokes the single new constructor shape. The construction target deliberately has no displayed/creator `providerId`; semantic consumer construction can use only its required `credentialProviderId`. The credential slot belongs to the tagged authentication requirement and is not duplicated at target level. `authentication: {kind: "none"}` is explicit for unauthenticated local models; omitted authentication is not an environment fallback.

### Claude managed child example

```ts
type ClaudeRuntimeAuthentication =
  | { kind: "cli" }
  | { kind: "managedApiKey"; apiKey: SecretValue };

async function prepareForClaudeLaunch(): Promise<ClaudeRuntimeAuthentication> {
  if (configuredMode === "cli") {
    return { kind: "cli" };
  }
  const apiKey = await secretManagementService.resolveForUse({
    kind: "agentRuntime",
    runtimeKind: "claude_agent_sdk",
    credentialSlot: "apiKey",
  });
  return { kind: "managedApiKey", apiKey };
}

function buildClaudeChildEnvironment(
  auth: ClaudeRuntimeAuthentication,
): Record<string, string> {
  const childEnv = buildRequiredClaudeOperationalEnvironmentFromEmptyBase();
  if (auth.kind === "managedApiKey") {
    childEnv.ANTHROPIC_API_KEY = auth.apiKey.revealToTrustedConsumer();
  }
  return childEnv;
}
```

`prepareForClaudeLaunch` belongs to `ClaudeRuntimeAuthenticationService`; the environment function is internal to `ClaudeSdkClient`. The returned environment is passed directly to the SDK child and is not returned to session/model-catalog callers. Production code scopes temporary references in `try/finally` and drops them after child construction/completion; it does not claim zeroization.

### Externally managed lifecycle example

```text
Settings asks status -> CONFIGURED / EXTERNALLY_MANAGED
Settings disables save/remove -> shows deployment provisioning instruction code
runtime resolve -> permitted through the base backend port
attempted write -> EXTERNALLY_MANAGED before adapter mutation
```

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| keep environment fallback during rollout | easier partial migration | Rejected | startup migration + fail missing/reprovision |
| constructor overload `(model, config)` plus new context | incremental package updates | Rejected | update registry/classes/callers/tests atomically |
| keep custom-provider `apiKey` optional | old JSON compatibility | Rejected | migration-only v1 decoder; v2 runtime only |
| keep `apiKeyConfigured` alongside richer status | UI compatibility | Rejected | update all in-repo GraphQL/UI consumers together |
| fallback/copy real-E2E Store from default Store | reduce setup | Rejected for first delivery | direct dedicated E2E provisioning; setup has no default/source read path |
| track Local Store key contents in test config | zero-touch worktrees | Rejected | root launcher derives non-secret paths; database/key bytes remain outside Git |
| keep named profiles in one Local database | reuse one file | Rejected | physically separate default/E2E databases and independent keys satisfy the actual two-context requirement |
| create same-user Local Store daemon/IPC | centralize one writer | Rejected | in-process backend plus SQLite transactions/locking; no meaningful identity boundary from daemon alone |
| use Electron `safeStorage` as default | desktop convenience | Rejected | cross-platform Electron-independent Local Store |
| import legacy plaintext automatically into Store | convenience | Rejected | scrub, mark reprovision, rotate if proliferated |
| keep credential `.env.test` loader for some suites | incremental test conversion | Rejected | one manifest/harness or synthetic backend |
| preserve Claude Agent SDK `auto` and `api-key` semantics | runtime compatibility | Rejected | exact `cli` or `managed-secret`; invalid legacy values fail before resolution/spawn, never map/fallback silently |
| add Claude-specific resolver/backend port | easy integration | Rejected | exact `agentRuntime` identity through existing `SecretManagementService.resolveForUse` |
| use SDK package-internal API-key file descriptor now | narrower environment exposure | Deferred | not a stable public cross-platform SDK contract; explicit exact child `env` plus managed tool/settings restrictions is supportable now |

## Derived Layering (If Useful)

This is explanatory only; ownership above governs:

```text
Client/transport
  -> subject service or storage configuration service
  -> consumer provisioning / SecretManagementService
  -> SecretStorageBackend port / core client factory
  -> Local Store or enterprise custody / provider SDK
  -> external provider
```

Configuration and lifecycle are sibling application concerns: the configuration service constructs/selects the backend, while the management service uses the injected backend. Neither is “inside” the other. The service-over-backend relation applies to secret lifecycle and resolution.

## Change / Refactor Sequence

1. **Establish contracts and safe values.** Add `SecretValue`, authentication/context types, minimal definition bindings, healthy-only definition status, five-state backend health, tagged lifecycle capability, backend ports, error sanitizer, and synthetic conformance tests.
2. **Add server management/configuration composition.** Implement catalog, management service, InMemory adapter, typed configuration service/repository/factory, degraded control-plane health and value-free events. Register only InMemory/Local first-delivery kinds; unsupported enterprise kinds fail without fallback.
3. **Refactor core clients atomically.** Change `LLMFactory` and every LLM constructor; remove environment reads; then convert metadata, search, media, and custom endpoint objects. Add consumer provisioning services and update all call sites.
4. **Reconnect AutoByteus remote behavior through managed custody.** Add `provider.autobyteus.api-key` and exact discovery/construction bindings; introduce the server-owned typed discovery service; make core providers explicit-auth and storage-neutral; add `credentialProviderId` plus runtime/model-kind scoped registry synchronization; reconnect every established startup/list/reload and LLM/audio/image construction caller before deleting the ambient alias path.
5. **Implement the in-process Local backend.** Add server-local Store configuration, staged pair initializer, store ID/authenticated verifier, independent key loading, encrypted repository, read-write/read-only variants, direct target-only host E2E provisioning, reset separation, health mapping, and conformance/security tests. Normal bootstrap derives files below `serverDataDir`; do not change Docker Compose/launcher and add no process/package/protocol.
6. **Implement migration and clean cutover.** Run pre-dotenv scrub/custom v1->v2 transform, remove AppConfig secret APIs/browser-public fields, reject legacy Claude `auto|api-key`, scrub ambient aliases including `AUTOBYTEUS_API_KEY` while preserving hosts, remove old schema/fallback, and require reprovision.
7. **Update Settings.** Preserve current access, route write-only values through subject services including the existing AutoByteus provider row, expose rich status/capabilities, and add non-secret backend configuration where safe. Externally managed writes are disabled; established AutoByteus reload triggers remain.
8. **Deliver first-phase agent hardening and Claude two-mode auth.** Route file tools through realpath roots and all process/PTY/Codex/Claude/MCP/browser/application-worker launch paths through empty-base environment/descriptor policies. Add `ClaudeRuntimeAuthenticationService`, exact catalog binding, SDK child builder, managed setting/tool policy, early diagnostics, and complete no-fallback failures. Report `LOCAL_HARDENED` only; do not claim secrecy from the authorized Claude child or strong identity/container/network isolation.
9. **Replace host-worktree test provisioning.** Add tracked `test-config/live-e2e.json`, one-time separate host real-E2E Store setup, read-only host path derivation and preflight, disposable Local CRUD fixtures, synthetic/direct/gateway/managed-Claude/AutoByteus-remote harnesses; remove dotenv loaders/copy docs/env gates. Do not introduce Docker E2E path/mount behavior.
10. **Prove the extension contract without an enterprise adapter.** Run conformance against InMemory, Local read-write/read-only, and a test-only externally-managed fixture; document that multi-node centralized custody and strong worker deployment are future deliveries.
11. **Final security/removal gate.** Search for credential aliases/fields/env reads/parent-env spreads/Claude legacy modes/caller env/broad settings/raw diagnostics/legacy schema references; verify every AutoByteus discovery/construction caller remains connected; run migration, backend health/pair, UI, real-provider including managed Claude and AutoByteus remote LLM/audio/image, hardening, negative-leak, and artifact-redaction coverage. Do not ship a mixed dual path.

## Key Tradeoffs

### In-process Local backend versus a Local Store process

The selected in-process backend keeps authority in Agent Server and relies on SQLite transactions/locking for multiple local processes. A same-user daemon would add installation, lifecycle, IPC, versioning, and packaging without meaningful isolation because the same identity can still access its channel/files. A future separate broker is justified only with an enforceable different identity/authorization boundary.

### Cross-platform owned encryption versus OS keychains

One implementation avoids Electron and platform lock-in. It must use vetted authenticated encryption and has an honest automatic key-file-unlock limitation: equivalent-user access to database/key files weakens protection. Strong mode therefore depends on process/filesystem identities or external custody, not cryptographic marketing.

### Separate physical Stores versus profiles in one database

Separate host `secret-store.db` and `real-e2e-secret-store.db` files with independent keys directly model the two approved host contexts. They remove profile tables/lifecycle, improve backup/reset isolation, and prevent host test runtime selection of normal records. The tradeoff is configuring dedicated test credentials a second time; first delivery deliberately avoids a security-sensitive cross-Store decrypt/re-encrypt command. Normal Docker owns its own default Store below its existing data directory and is deliberately not joined to this host test arrangement.

### Construction context versus expanding `LLMConfig`

The context cleanly separates serializable behavior config from runtime authentication while retaining factory composition. It requires an atomic constructor migration but avoids a permanent unsafe config shape.

### AutoByteus gateway credential owner versus downstream model provider

Using downstream/displayed `providerId` for an AutoByteus-runtime model would resolve the wrong key; branching on runtime inside every provisioning service would duplicate policy. One required `credentialProviderId` is materialized when a model is registered: native definitions assign their credential owner once, while gateway definitions assign `AUTOBYTEUS`. `describeConstructionTarget` then returns only that field plus the tagged authentication requirement; displayed provider is absent and cannot be used as a fallback. The field is non-secret and is never a definition/path selector.

### Shared remote discovery service versus factory-owned ambient discovery

Core factories cannot resolve server custody without reversing dependencies. Three separate server resolvers would duplicate host, failure, and catalog policy. One model-kind-aware `AutobyteusRemoteModelDiscoveryService` sits above management and core providers, reuses exact consumers, and lets established LLM/audio/image catalog wrappers keep their public triggers. This preserves functionality without a god-object or ambient fallback.

### Writable and externally managed ports

Two capability levels prevent the product from forcing Kubernetes mounts/company GitOps into lifecycle semantics they do not support. UI complexity increases slightly because write controls depend on effective capability.

### Real gateway and direct-secret modes

Gateway mode narrows broad key exposure; direct mode proves the actual key-to-SDK path. Both are necessary, with reviewed direct execution and scenario-scoped access.

### Enterprise adapter deferral

First delivery implements no Vault/AWS/Kubernetes adapter. This keeps the foundation bounded while making the limitation explicit: multi-node centralized custody is not available without a separately installed future adapter. The typed registration/configuration/lifecycle/health/conformance contract is fixed now so a later adapter does not change management or consumer paths. Vault KV v2 remains a future recommendation, not an acceptance dependency.

### First-delivery assurance

`LOCAL_HARDENED` materially removes the observed `.env`/worktree/ambient-environment leak paths without pretending that same-user processes are isolated. This is the simplest coherent first release and matches unchanged local Docker. `STRONG_AGENT_ISOLATION` requires a separate delivery with concrete OS/container identity, mount, descriptor, and network enforcement.

### Claude child environment versus broker/file descriptor

The pinned public SDK contract supports an explicit child `env`, so first delivery can deliver one managed key without another process/protocol or SDK fork. The tradeoff is explicit: the authorized Claude executable and its runtime memory can observe the key. Managed setting/tool restrictions prevent supported descendant inspection/propagation, while parent/sibling/other-child environments remain clean. A package-internal file-descriptor mechanism was investigated but deferred because it is not a stable public cross-platform SDK contract; it may be reconsidered later without changing the consumer/service architecture.

## Risks

| Risk | Consequence | Mitigation / Gate |
| --- | --- | --- |
| same-user Local Store probing | first delivery does not prevent hostile equivalent-user access | explicit `LOCAL_HARDENED` status/docs; no strong claim; future separate-identity delivery |
| encryption/staged-pair-write defect | disclosure/corruption or partial pair | domain-separated HKDF/AES-GCM, authenticated store/key verifier, staged fsync/rename, fail-closed partial-pair/tamper/crash tests |
| Local Store key bytes copied into worktree/env | recreated leak | owner-only canonical key files, scans, no raw key CLI/env input |
| unresolved consumer still reads env | bypasses architecture | alias/source scans plus real construction tests; no fallback |
| AutoByteus discovery callers remain disconnected | configured remote LLM/audio/image functionality disappears | BEH-013 source-path tests, existing Settings/reload trigger coverage, server discovery service reachability, and real remote scenarios |
| remote model resolves downstream-provider key | gateway authentication fails or wrong credential reaches the wrong endpoint | explicit `credentialProviderId=AUTOBYTEUS`; catalog tests; remote OpenAI/Gemini construction test |
| provider-scoped remote replacement removes native models | catalog regression | synchronize by `runtime=AUTOBYTEUS` and model kind; coexistence regression test |
| mixed old/new package call sites | runtime break or fallback pressure | atomic core constructor cutover on isolated branch |
| custom base URL exfiltration/SSRF | sends key to unintended endpoint | server-owned HTTPS/loopback/redirect/DNS/private-network policy; never agent supplied |
| backend/Store non-ready | provider outage | five-state health, degraded value-free Settings/control plane, provider/write fail-closed, never fallback |
| host default/E2E Store path confusion | normal/test cross-use | exact bootstrap binding, independent files/keys, read-only host E2E open, no fallback, dedicated test credentials |
| concurrent writer or uncheckpointed read-only open | lock failure or stale/incomplete host E2E read | SQLite transaction/busy policy; setup checkpoints/closes before host read-only execution; CRUD uses disposable Store |
| direct test code exfiltrates key | provider-key compromise | implementation source review before direct execution, declared scenarios, narrow process, rotation and sanitized evidence |
| agent worker shares trusted container | same-user Store access remains possible | first delivery reports only `LOCAL_HARDENED`; strong enforcement is explicitly deferred |
| migration interruption | startup blocked or plaintext remains | atomic current files, restart-safe detection, fail before agents, no plaintext backup |
| future externally managed status stale | later adapter UI/runtime ambiguity | fixed health/lifecycle extension contract and conformance fixture before vendor delivery |
| Claude managed child observes/retains its credential | agentic recipient or compromised SDK could expose the key | explicit opt-in/default CLI, test-scoped keys, exact consumer/JIT delivery, `tools: []`, restricted settings/MCP, early redaction, documented `LOCAL_HARDENED` limit; no false zeroization claim |
| legacy Claude `auto` and `api-key` breaks | existing implicit/API-key launch configuration no longer starts | stable `CLAUDE_RUNTIME_AUTH_MODE_INVALID`, remediation to choose `cli` or provision/select `managed-secret`; no silent mapping/fallback |
| over-large first delivery | integration risk | Local/InMemory only, direct E2E provisioning only, lower-tier hardening only, clean-cut final gate |

## Guidance For Implementation

### Invariants to encode in types and tests

- authentication is mandatory factory input even when `kind: "none"`;
- `LLMConfig`, model metadata, provider JSON, GraphQL outputs, manifests, and events cannot contain `SecretValue`/raw string fields;
- backend/Store or enterprise namespace is bootstrap-bound, never per resolve request;
- lifecycle write is impossible through the base read/status port;
- externally managed adapters cannot be downcast based only on vendor kind;
- backend health and per-definition state cannot represent impossible combinations; definition state exists only at `READY`;
- status and errors contain no value-derived hints;
- missing/locked/unavailable/corrupt/incompatible never triggers fallback;
- current-format Local Store open authenticates database/key pairing before readiness even with zero records;
- agent launch environment starts empty and is allowlisted;
- Claude mode is exactly `cli|managed-secret`; legacy/unknown modes are unrepresentable after validation;
- CLI mode makes zero secret-management calls; managed mode uses one exact consumer and no alternate definition/backend/ambient fallback;
- only the exact managed Claude child environment contains `ANTHROPIC_API_KEY`; parent/sibling/other/tool children do not;
- Claude start/model-discovery inputs cannot supply arbitrary `env`, and managed setting/tool policy cannot load supported environment-inspection/spawn paths;
- diagnostic input is redacted before buffering.
- `provider.autobyteus.api-key` is the sole AutoByteus gateway definition; discovery and construction consumers are distinct but share it;
- no configured AutoByteus hosts means zero discovery resolution calls and authoritative clear of the matching AutoByteus runtime subset;
- every AutoByteus-runtime model has `credentialProviderId=AUTOBYTEUS` regardless of downstream provider;
- remote synchronization changes only the corresponding AutoByteus-runtime subset and preserves native same-provider models;
- no current core/server/test path reads `AUTOBYTEUS_API_KEY` after migration.

### Startup/composition

Run migration before any credential dotenv load or child creation. Load only non-secret AppConfig, validate a registered backend kind, construct the adapter, and obtain lifecycle/health. When health is non-ready, start the value-free Settings/configuration/health control plane only; provider consumers and writes remain disabled. Derive only `LOCAL_HARDENED` after its checks pass, then build allowed routes. Curated provider/model listing remains available without live enrichment credentials.

Cache preloading retains its established LLM/image/audio list calls. The server model-provider wrappers invoke `AutobyteusRemoteModelDiscoveryService.ensureDiscovered(modelKind)` before first cache publication. With no hosts, the service clears only the matching AutoByteus runtime subset without touching secret management. With configured hosts but missing/non-ready custody, a transient refresh preserves the last-known-good remote subset and the rest of each catalog stays usable; before any success that subset is absent. Full reload reinitializes the ordinary registry, refreshes AutoByteus remote models, and publishes the combined cache. Targeted `AUTOBYTEUS` reload invokes only remote LLM discovery. Saving the AutoByteus credential preserves the existing UI-triggered full reload across LLM/audio/image; removing it clears every AutoByteus runtime subset without discovery.

### LLM factory API

Current:

```ts
LLMFactory.createLLM(modelIdentifier, configInput?)
```

Target:

```ts
LLMFactory.createLLM(modelIdentifier, {
  configInput,
  authentication,
})
```

The factory, not its caller, computes effective `LLMConfig` and constructs `LLMConstructionContext`. Do not create `LLMRuntimeConfig`, make authentication optional, add a resolver singleton, or let each LLM call secret management.

`describeConstructionTarget` returns exactly `{credentialProviderId, authenticationRequirement}`. It does not return displayed/creator `providerId` or a duplicate top-level credential slot. Native model registration assigns the credential owner once; every remote AutoByteus model assigns `AUTOBYTEUS`. `LLMProvisioningService` uses `credentialProviderId` verbatim to build the generic LLM consumer and obtains `credentialSlot` from the tagged requirement. Audio/image targets expose the same ownership fact to `MediaClientProvisioningService`. Never infer or fall back to credential ownership from displayed provider, host strings, model identifiers, runtime, or client classes during provisioning.

Core AutoByteus providers accept explicit resolved API-key authentication and return parsed model arrays. Core factories expose runtime-scoped replace/sync/clear operations. They do not call secret management, inspect `AUTOBYTEUS_API_KEY`, or silently remove discovery. A transient pre-authoritative discovery failure preserves the prior remote subset; a successful authoritative empty result clears that model-kind subset; explicit credential removal clears all AutoByteus-runtime subsets without discovery.

### Local Store

Use `${serverDataDir}/secret-store/` for a normal server's Local Store. Electron resolves under `~/.autobyteus/server-data/secret-store/`; normal Docker resolves under `/home/autobyteus/data/secret-store/` inside its existing volume without Docker file changes; a single Kubernetes server Pod may use its own PVC. Each writable Local Store belongs to one node/volume and is never shared by replicas. Multi-node deployment is unavailable until a future enterprise adapter is installed. Host real E2E binds to separate `real-e2e-secret-store.db`/key. The in-process backend opens one configured pair; do not add a daemon, IPC, profile, runtime selector, or Docker E2E mount.

Current-format singleton metadata stores schema/encryption/verifier versions, random 16-byte `store_id`, verifier nonce/ciphertext/tag. Creation generates an independent random 32-byte root key and Store ID, derives a pair-verifier key using HKDF-SHA-256 with Store ID salt and `autobyteus/local-store/pair-verifier/v1` info, then AES-256-GCM encrypts a fixed format constant with canonical format/Store-ID AAD. Secret records use a distinct HKDF domain and fresh 12-byte nonce/16-byte tag. Staged temp-file creation is fsynced and renamed fail-closed; a crash may leave a partial pair, which opens as `CORRUPT` and is never completed/regenerated silently. Every read-write/read-only open authenticates the verifier before readiness. A wrong key, one missing file, verifier tamper, or current-format missing verifier is `CORRUPT`; unsupported schema/encryption/verifier version is `INCOMPATIBLE`.

Writable mode uses exact SQLite transactions and bounded busy handling. Read-only mode creates/migrates nothing and exposes no save/remove. Trusted host E2E setup accepts hidden input and opens only the E2E target, writes/checkpoints/closes, then permits read-only execution. It has no default/source backend or copy method. Ordinary reset preserves Stores unless one exact pair is confirmed. Never accept key bytes or provider values through CLI arguments or ordinary environment.

### Gemini/workload identity

Represent AI Studio, Vertex Express, and Vertex Project as explicit non-secret authentication modes. The AI Studio and Vertex Express write-only credential slots are saved/removed independently; selecting an API-key mode requires its slot to be configured, never falls back, and does not implicitly delete the inactive slot. Vertex Project validates project/location through the non-secret config owner. This split avoids a cross-store pseudo-transaction and accidental credential loss. Workload-identity mode passes only project/location in the context while the trusted provider process owns the protected cloud identity; agent children receive neither mount/home/metadata route nor token.

### Custom provider transaction

Validate the normalized provider metadata/base URL and probe with transient input before allocating the provider UUID. Persist metadata-only v2 using that UUID, then save the derived secret through the custom-provider consumer identity, and refresh models only after both succeed. If the secret save fails, remove the newly allocated metadata record before returning failure; no plaintext was persisted. Delete removes the derived secret, then metadata, then refreshes the catalog. Never persist a duplicate credential ID when it is derivable from UUID.

Delete is idempotent for custom providers: when the requested custom provider and derived record are already absent, return the same value-free success outcome without attempting a model mutation that can recreate or expose state. Built-in provider deletion remains rejected by the existing subject rule.

### Settings input and status

Keep a raw credential only in the active editor component and write-only GraphQL variable long enough to submit. Never place it in Pinia/cache/routes/browser storage/analytics or prefill it. Clear after success/close. Status returns backend health plus nullable healthy-only definition state and separately owned provider validation. Non-ready health disables writes/provider use and shows a stable instruction. Local writable enables write-only controls. Externally-managed UI behavior is covered through a test descriptor as an extension contract; no enterprise adapter ships. Saved backend changes report restart-required.

Claude introduces no second credential field and no first-delivery runtime-mode UI. The existing Anthropic credential editor provisions `provider.anthropic.api-key`; consumer authorization determines whether native Anthropic and explicit managed Claude may use it. `CLAUDE_AGENT_SDK_AUTH_MODE=cli|managed-secret` is validated non-secret server startup configuration, omitted means `cli`, and invalid legacy values produce value-free startup/runtime guidance.

AutoByteus introduces no new Settings page. The existing built-in `AUTOBYTEUS` provider row uses the standard write-only editor and receives normal backend/storage status instead of being treated as not applicable. `AUTOBYTEUS_LLM_SERVER_HOSTS` stays in the endpoint Settings card. Saving/replacing the key preserves the current full-reload trigger; provider-scoped reload preserves the current LLM-only targeted behavior. Removing the key is idempotent and clears all AutoByteus runtime subsets without resolving the removed definition. No saved value is returned.

### Isolation

File tools use canonical realpaths and approved roots. Every process-capable runtime uses an empty-base allowlist and explicit descriptor policy, but equivalent-user process access is not prevented. The exact managed Claude child is the only explicit provider-key recipient; parent, siblings, unrelated runtime children, and AutoByteus-owned tool children remain secret-free. First delivery reports only `LOCAL_HARDENED` and does not claim secrecy from that authorized child. `STRONG_AGENT_ISOLATION`, platform-specific separate identities, worker Pods, network/metadata denial, and strong acceptance evidence are deferred.

For stdio MCP specifically, compose the child environment from the sanitized operational base and then add the exact authorized `config.env` entries for that server. Do not treat `config.env` as the base (which would drop required operational entries), and do not restore broad `process.env` inheritance. Provider keys, Store paths/keys, backend descriptors, and unrelated sentinels remain excluded unless an explicit MCP contract separately authorizes a non-secret entry.

### Claude runtime authentication

Replace `buildClaudeSdkSpawnEnvironment(process.env)` with `ClaudeRuntimeAuthenticationService` plus a client-owned exact child builder. Validate only `cli|managed-secret`, defaulting to CLI; reject `auto|api-key|unknown` before lookup/spawn. CLI returns `{kind:"cli"}` without calling management. Managed mode calls `resolveForUse({kind:"agentRuntime",runtimeKind:"claude_agent_sdk",credentialSlot:"apiKey"})`, and management maps it to `provider.anthropic.api-key`.

For CLI, empty-base describes environment composition, not an empty account directory. Set `HOME` to the actual node-local OS home used by the existing Claude login. If an explicit Claude account/config-root override is supported, validate it as an existing absolute node-local path and map it deliberately. Do not create or default to a fresh app-data account home. Managed-only `tools: []`, empty setting sources, and strict explicit MCP must not be applied to CLI.

`ClaudeSdkClient` receives the closed auth union and builds the SDK environment from an empty operational allowlist. Only managed mode adds `ANTHROPIC_API_KEY`; `CLAUDE_CODE_API_KEY`, descriptor aliases, Store/backend variables, and unrelated parent values remain absent. Remove optional `env` from public Claude start/model-discovery inputs. Managed SDK options use `settingSources: []`, no hooks/plugins/settings/API-key helper, `strictMcpConfig: true`, `tools: []`, and explicitly materialized AutoByteus in-process MCP only. `allowedTools` is filtered to those MCP names and is not treated as a security allowlist; `disallowedTools` may repeat known dangerous built-ins defensively. AutoByteus tool processes use `AgentExecutionSecurityContext` outside the Claude child.

Call the same preparation/build path for model discovery and runs. Scope resolved/auth/env variables to launch and release AutoByteus references in `finally` after SDK child construction/completion; never claim SDK/JS zeroization. Redact diagnostics on append and outward formatting. Map invalid mode, binding, missing, each non-ready Store state, spawn, CLI auth, and provider auth to the exact value-free codes in the backend contract. Never fall back. Native Anthropic LLM/metadata keep their separate consumer identities over the same definition.

`startQueryTurn` propagates the mapped runtime failure. `listModels` remains best-effort and returns `[]` on a mapped auth/spawn/provider failure while emitting only the stable value-free status to protected diagnostics. It uses the same auth/spawn path and never tries another mode or source.

### Testing

The default suite uses InMemory synthetic values or disposable Local Stores. Host real suites use tracked configuration and directly provisioned machine/CI E2E custody, opening only that Store read-only. Preflight reports health/instruction and logical missing IDs only. No copy/default access exists. Existing Docker is unchanged. API/E2E covers browser/GraphQL behavior, empty-Store correct/swapped/tampered/unsupported pair cases, degraded UI, launcher non-inheritance, Claude CLI zero-resolution, managed exact-child environment/settings/tools, complete failure/no-fallback mapping, redaction-before-buffering, a real managed Claude SDK authentication/request, direct construction, and selected real provider outcomes. Synthetic leak scanners include a seeded negative control.

AutoByteus coverage additionally proves the existing provider Settings/save/remove/status/reload journey, including authoritative scoped clear after removal; no-host zero lookup plus model-kind scoped clear; exact discovery consumers; runtime-scoped coexistence with native models; remote OpenAI/Gemini model construction selecting the AutoByteus key; migration that removes only `AUTOBYTEUS_API_KEY` and preserves hosts; and real capability-available LLM/audio/image discovery plus representative invocation/generation from the read-only E2E Store. The runner/server environment and artifacts contain no key. An unavailable remote capability is reported explicitly, never silently counted as pass.

### Security review checkpoints

1. secret wrapper/redaction and error/event schemas;
2. Local Store crypto/key handling/permissions/authenticated empty-Store pair integrity/SQLite locking/read-only/checkpoint/staged-creation crash safety;
3. backend adapter identity/physical-prefix binding/tagged lifecycle/no-fallback;
4. consumer mapping and constructor/env-read removal;
5. custom endpoint SSRF/exfiltration controls;
6. first-delivery file/env/descriptor hardening and `LOCAL_HARDENED` labeling without strong claim;
7. migration plaintext removal and no-backup behavior;
8. direct-only E2E provisioning, source-review-before-real-execution, evidence sanitization, and zero-copy worktree proof;
9. Claude two-mode selection, exact runtime binding, JIT exact-child delivery, managed setting/tool restrictions, early diagnostics, complete no-fallback failures, native Anthropic separation, and honest authorized-child trust limit.
10. AutoByteus gateway definition/bindings, no-host zero-resolve/scoped clear, explicit-removal all-subset clear, runtime-aware construction identity, runtime-scoped catalog replacement, legacy alias removal, and real remote regression evidence.

## Approval Basis And Revised AR-006 Decision

Architecture review round 1 required these choices to be fixed rather than left open. The user approved the following bounded first-delivery decisions on 2026-07-21, and they remain unchanged:

1. **First assurance:** ship `LOCAL_HARDENED`; defer and never claim `STRONG_AGENT_ISOLATION` in this delivery.
2. **First adapters:** ship InMemory/test and Local read-write/read-only only; defer every concrete enterprise adapter while retaining the extension contract.
3. **Real-E2E setup:** direct dedicated credential provisioning only; no default-to-E2E copy command.
4. **Contract fixes without product-scope choice:** complete five-state degraded health and authenticated empty-Store database/key binding.

The prior Claude CLI-only approval was reopened and its round-2 implementation authority was retracted before code changes. The newly selected AR-006 decision is fully designed and was approved by the user for architecture re-review after the second design-principles audit:

5. **Claude runtime:** exactly default external `cli` and opt-in `managed-secret`; managed mode reuses the generic `resolveForUse` service with an exact runtime consumer and delivers only to the exact child under bounded tool/settings/diagnostic controls. Legacy `auto|api-key` and all fallback are removed. The authorized child can observe its key; no stronger claim is made.

Source review subsequently exposed CR-001, and the user approved the bounded preservation decision:

6. **AutoByteus remote gateway:** preserve all existing LLM/audio/image discovery, reload, construction, and invocation. Only credential provisioning changes from ambient `AUTOBYTEUS_API_KEY` to `provider.autobyteus.api-key` through exact Store-backed consumers. Remote models keep their downstream provider identity and explicitly identify `AUTOBYTEUS` as credential owner.

The `.env.test` secret-free compatibility choice and exact scenario/quota classification remain bounded implementation/coverage details. Managed Claude has no version-specific built-in allowlist: `tools: []` is the fixed requirement, and any pinned SDK version that cannot prove it fails managed-mode startup. The complete package returns to `architecture_reviewer`; implementation rework remains unauthorized until that gate passes.

### External Claude Authentication Release Dependency

`EXT-ANTHROPIC-AGENT-SDK-AUTH` requires release review to re-check the official Agent SDK overview, legal/authentication guidance, and the dated subscription-usage Help Center notice. As of 2026-07-21 those sources conflict: the June 15–16 notice explicitly preserves current third-party Agent SDK subscription usage, while other pages retain API-key/approval language. The target therefore remains two-mode under the user's decision. AutoByteus does not add a Claude login UI, proxy account credentials, pool subscriptions, or relay authentication through an AutoByteus-hosted service; `cli` consumes pre-existing external node-local account state and performs zero secret lookup. This deployment distinction and current successful operation support the intended path but are not misrepresented as independent legal authorization. If Anthropic later publishes an unambiguous superseding rule that forbids this exact self-hosted path, release planning must return the behavior decision to the user rather than silently changing modes.
