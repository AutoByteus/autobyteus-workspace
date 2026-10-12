# Design Spec — Remove the remote AutoByteus provider

## Solution And Approval Basis

- Current solution revision ID: `SR-004` (Design Impact CR-001 / CRR-003 from the code reviewer; see the solution revision record)
- Approved requirements baseline / revision and user-approval reference: `requirements-doc.md` SR-001 baseline, with DEC-001 = (a) include image/audio and DEC-002 = (a) no migration. Approved by the user on 2026-10-11 ("approve", replying to "approve as recommended"); recorded in SR-002.
- Behavior-defining supplements and their approval references: None
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/investigation-notes.md`
- Authorities read (design reading gate; file and date): `references/architecture-design.md`, `references/design-principles.md` (2026-10-11); project `DESIGN.md` (repo root, 2026-10-11); `autobyteus-server-ts/docs/design/data_migration_guideline.md` (full, 2026-10-11); `autobyteus-server-ts/docs/design/mandatory-processor-defaults.md` (2026-10-11); `TESTING.md` (2026-10-11). `design-examples.md`: not used.
- Project design-principle conflicts with the general principles, or discrepancies: None.

## Current-State Read

The remote provider is a self-contained "gateway" plugged into shared owners at well-defined seams (investigation notes, "Relevant Codebase And Technical Facts"):

- **autobyteus-ts** owns the adapter layer: `AutobyteusLLM` plus its payload, usage normalizer and prompt renderer; discovery (`AutobyteusModelProvider`, `AutobyteusAudioModelProvider`, `AutobyteusImageModelProvider`); the HTTP client folder `src/clients/`; and enum members `LLMRuntime.AUTOBYTEUS`, `LLMProvider.AUTOBYTEUS`, `MultimediaRuntime.AUTOBYTEUS`, `MultimediaProvider.AUTOBYTEUS`. The remote models are host-scoped: `<model>:autobyteus@<host>` for LLM and `<name>@<host>` for media. The LLM, audio and image factories carry a "source models" registry that only the remote discovery uses for media; on the LLM side, `syncRuntimeModels` serves only the remote path.
- **autobyteus-server-ts** owns integration. `ModelCatalogService` runs the dynamic source lifecycle (AUTOBYTEUS llm/audio/image + Ollama + LM Studio + custom). `ModelAvailabilityService` resolves lazy availability. `AutobyteusRemoteModelDiscoveryService` reads hosts and the key. `LlmProviderService.setProviderApiKey` notifies the catalog. `ServerSettingsService` predefines `AUTOBYTEUS_LLM_SERVER_HOSTS`. Secret management has `ProviderCredentialCatalog`, the `modelDiscovery` consumer kind and the import alias. App-launch readiness has a `LLMRuntime.AUTOBYTEUS` case. A mandatory `MediaInputPathNormalizationPreprocessor` acts only for AUTOBYTEUS. A released app-data migration (`20260730_token_usage_provider_name_snapshot_backfill`, first released in v1.4.31 (factual correction per ARCH-REV-001 R-002)) uses the current display-name helpers.
- **autobyteus-web** has the hosts card, the discovery-setting catalog target (`modelKinds: ['LLM','AUDIO','IMAGE']`), an AUTOBYTEUS-specific post-save refresh and the web `LLMProvider` enum member. The provider list itself is server-driven.

The architecture is healthy. Removal cuts these seams; no owner needs restructuring.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale and supporting evidence: Deletion spans 3 packages and several subsystems: autobyteus-ts (llm, multimedia, clients), server (llm-management, secret-management, application-platform, agent-customization, settings, app-data-migrations), web (settings UI, stores), plus docker scripts, the live-E2E harness and docs. About 25 source files are deleted or edited, about 45 test files are deleted, edited or retargeted, and about 12 docs are updated (see the mapping below). Most of the change is deletion within existing owners.
- Architectural risk: `High`
- Risk rationale and supporting evidence:
  - Shared public contracts shrink: `autobyteus-ts` exported enums (`LLMRuntime`, `LLMProvider`, `MultimediaRuntime`, `MultimediaProvider`) and the root export of `AutobyteusClient`/`CertificateError`; the GraphQL provider catalog loses `AUTOBYTEUS`; the secret consumer union loses `modelDiscovery`.
  - A released app-data migration must be repointed to a frozen, migration-owned copy (guideline §4). That is persistence code.
  - The blast radius is wide: many tests use AUTOBYTEUS as a generic sample provider and must be retargeted, not deleted.
  - There is no new owner, no runtime migration, and no concurrency or deployment-ordering change.
- Escalation trigger if implementation or validation discovers new impact: an external consumer of a removed export; a persisted reader that rejects (instead of tolerating) the leftover `.env` key, vault row or remote identifiers; any change to native `RuntimeKind.AUTOBYTEUS` behavior; or any released migration besides the backfill one that depends on a removed member. Each returns `Design Impact` to the Solution Designer.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts:388-401` | An unknown preprocessor name is logged and skipped | Removing the mandatory preprocessor is safe for any definition that lists its name (UNK-002 resolved) | None |
| Code | `autobyteus-server-ts/src/agent-definition/utils/processor-defaults.ts` | Mandatory names are filtered from saved lists | Same | None |
| Code | `rg 'AudioClientFactory\.(replace\|list\|remove\|retain)SourceModels\|syncRuntimeModels'` | Only `ModelCatalogService`'s AUTOBYTEUS branches and remote tests use the media source registry; LLM `syncRuntimeModels` is used only by the remote gateway test; LLM `retainSourceModels` has no caller | Remove the media source-model registry and LLM `syncRuntimeModels`/`retainSourceModels` (UNK-001 resolved) | None |
| Code | `autobyteus-ts/src/multimedia/model-identifier.ts` users | Used only by the media models' AUTOBYTEUS branch and `ModelAvailabilityService` | Delete the file | None |
| Code | `autobyteus-server-ts/src/api/graphql/types/llm-provider-model-catalog.ts:51-52,104-127` | Shared `ModelDetail` row exposes `runtime` and `hostUrl` for LLM and media rows | Keep the GraphQL row; media rows emit `runtime: 'api'` and `hostUrl: null` | None |
| Code | `ModelCatalogService.notifyCredentialRevision` callers | Only `LlmProviderService.setProviderApiKey` for AUTOBYTEUS; `credentialRevisions` is read by the custom-source fingerprint but only ever incremented through that path | Remove `notifyCredentialRevision` and `credentialRevisions` | None |
| Code | `token-usage-provider-name-snapshot-backfill-migration.ts:1-2,47-55`; `git tag --contains` → first released in v1.4.31 (corrected per ARCH-REV-001 R-002) | A released migration imports current `isBuiltInLlmProviderId`/`getLlmProviderDisplayName` | Freeze a migration-owned display-name table (RSK-002) | None |
| Code | `secret-management-service.ts:190-200`; `local-environment-source-reader.ts:103-108` | No vault-wide enumeration; unknown import aliases are skipped | An orphan vault row and a leftover `.env` alias are inert | None |
| Code | `server-settings-service.ts:212-236` | Unregistered `.env` keys are listed as editable, deletable custom settings | The leftover host key shows as a custom setting | None |
| Code | `application-provider-credential-readiness-adapter.ts:163-178` | `resolveAutoByteusAuthority` maps by `LLMRuntime`; the method name refers to the native runtime | Remove only the `LLMRuntime.AUTOBYTEUS` case; keep the method | None |
| Code | Test-file grep (investigation) | `runtimeKind: "AUTOBYTEUS"` in fixtures, run-history and web tests is the native runtime | Leave those untouched (BEH-010) | None |

## Intended Change

A clean-cut deletion of the remote AutoByteus provider and everything that exists only for it, plus the dead code those deletions expose in touched files. There is no new behavior, no migration and no compatibility path. One released migration gets a frozen copy of the provider display-name table so its behavior is unchanged.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001; AC-001, AC-003 | Catalog list/ensure/reload | Remote LLM source in `ModelCatalogService` | Removed | DS-001: catalog lists built-in (static) + Ollama/LM Studio/custom (dynamic) only |
| BEH-002 | System | REQ-002; AC-001, AC-003 | Same | Remote audio/image sources | Removed; media rows only from `AudioClientFactory`/`ImageClientFactory` built-ins | DS-001 |
| BEH-003 | User | REQ-003; AC-002 | Settings → Provider API keys | Built-in list derived from `LLMProvider` | AUTOBYTEUS disappears because it is removed from the enum | DS-002 |
| BEH-004 | User | REQ-003; AC-002 | Settings → Server settings | Quick-setup card | Card removed; predefined setting removed | DS-002 |
| BEH-005 | System | REQ-004; AC-001 | Vault resolve, `.env` import, app-launch readiness | Binding, consumer, alias, readiness case | Removed | DS-003 |
| BEH-006 | System | REQ-005; AC-001 | Tool invocation | AutoByteus-only preprocessor | Removed and unregistered | DS-003 |
| BEH-007 | User | REQ-006; AC-004 | Launch/resume/generate with a saved remote identifier | `ensureModelAvailable` → `MODEL_IDENTIFIER_NOT_AVAILABLE`; UI unavailable state | Preserved: the identifier is no longer parseable as host-scoped, so it is not registered and yields the same unavailable outcome | DS-004 |
| BEH-008 | Operational | REQ-007; AC-005 | Server start with leftovers | Tolerant settings and vault | Preserved: inert | DS-004 |
| BEH-009 | User | REQ-008; AC-006 | Token-usage history; pending backfill migration | Snapshot-first display; migration uses current helpers | Display preserved; migration frozen | DS-005 |
| BEH-010 | User/System | REQ-009; AC-007 | Native runtime | `RuntimeKind.AUTOBYTEUS` | Unchanged | All spines (no edits to `RuntimeKind`) |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Cleanup` (feature removal)
- Current design issue found: `No`
- Structural triggers that fire, each with evidence: **Legacy-cleanup trigger** fires: the remote provider is dead code at the product level, so it is removed as a clean cut. The other triggers could plausibly fire but don't: no repeated coordination is introduced (Ollama/LM Studio/custom stay in the one `ModelCatalogService`); there is no boundary bypass (every removed seam is called through its owner); no shared-structure loosening (the GraphQL `ModelDetail` row is unchanged).
- Root cause classification: `No Design Issue Found`. The integration is cleanly isolated at seams; the task is removal.
- Refactor needed now: `No`
- Evidence: Current-State Read; investigation evidence table above.
- Design response: Delete the seams and their dead follow-ons; simplify the touched owners only where branches become unreachable.
- Refactor rationale: Owners remain correct after deletion.
- Intentional deferrals and residual risk: None for media runtime (SR-004 moved it In This Change). The server-internal dynamic-source `modelKind`, which is now always `LLM`, stays as a Follow-up (ARCH-REV-001 R-003): it feeds the GraphQL `ModelSourceStatus.modelKind` field that the web reads. SR-003 originally deferred `MultimediaRuntime` here; that rationale was incorrect (CR-001) and was superseded in the removal plan.

## Terminology

- **Remote provider / gateway**: the decommissioned AutoByteus LLM server integration.
- **Native runtime**: `RuntimeKind.AUTOBYTEUS` ("autobyteus"). Not touched.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: everything in the Removal / Decommission Plan.
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`. The frozen display-name table is migration-owned released-shape knowledge required by guideline §4. It is not a runtime compatibility path; current runtime code must not import it.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume:
  1. `.env` key `AUTOBYTEUS_LLM_SERVER_HOSTS=<urls or empty>` (server data dir).
  2. Vault row `secret_entries.secret_id = 'provider.autobyteus.api-key'`.
  3. Saved model identifiers `<model>:autobyteus@<host>` / `<name>@<host>` in agent/team definitions, run metadata, application launch profiles and the media default-model settings (`.env`).
  4. Token-usage ledger rows with `model_provider = 'AUTOBYTEUS'` (rare; remote models usually reported their creator provider) and their `provider_name` snapshots.

  Volume: single-user installs, a handful of values.
- Relevant code-model, serialization, semantic, or physical-store change: enum members and the host-scoped parsers lose `autobyteus`; no schema or file format changes.
- Normal reader/writer behavior and representative evidence: (1) is shown as a custom deletable setting; (2) is never enumerated and is now unresolvable by any consumer; (3) is not registered with any provider, so the existing unavailable-model path applies (UI keeps the value visible and blocks launch); (4) displays through the snapshot (or `Unknown Provider (AUTOBYTEUS)` for a row with no snapshot that the migration also couldn't fill).
- Required semantics and invariants under direct use: startup and new work never depend on these values; saved selections are not silently changed.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: the vault row is encrypted and is never decrypted again. There is no removal obligation: the user approved leaving it inert (DEC-002), and the credential targets a decommissioned service.
- Decision: `Directly Usable — No Migration` for (1)–(4). Separately, the released backfill migration's source classification is frozen (a code repoint, not a data transition).
- Decision rationale: The guideline (§2.1, §3) allows a migration only for a change of meaning or a new required fact. Neither applies. Current tolerant readers already produce the approved outcomes, and the user approved this (DEC-002).
- Acceptance criteria or design constraints supported by this decision: AC-004, AC-005, AC-006.

### Data Migration Guideline §2 checklist

1. **Need:** No migration. Tolerant readers absorb every leftover (see above).
2. **Availability:** Startup and new work read none of the leftovers as prerequisites. A leftover can only make one saved selection unavailable.
3. **Source and target:** The inspected shapes are the `.env` key (including Docker's empty value), the vault row, the host-scoped identifiers and the ledger rows. The only owner affected is the released backfill migration; its classifier is frozen.
4. **Disposition:** All leftovers are preserved and inert; there are no converted, excluded or failed items.
5. **Commit and retry:** N/A (no transformation).
6. **Current-only boundary:** The released backfill migration currently imports current runtime helpers. This change repoints it to a migration-owned frozen table under `src/app-data-migrations/legacy/`. Current runtime never imports that table. The migration ID is unchanged: its output for the same input is identical, so this is not a same-ID semantic repair.
7. **Cost:** Zero extra startup work.
8. **References:** Model identifiers cross from definitions/runs/launch profiles into the catalog. Each is validated at use by `ensureModelAvailable` and the existing selection presentations. No new validation is needed.
9. **Evidence:** See the verification plan in Guidance For Implementation.
10. **Lessons and review:** Consulted `legacy/released-run-package-shapes/` (the frozen-copy pattern) and `remove-external-messaging-data-migration.ts`. That precedent deletes data after an approved feature removal; this design deliberately does not delete, per DEC-002. Independent review: architecture reviewer.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002 | Web Settings / model picker requests catalog | Provider snapshots returned | `ModelCatalogService` | Where the remote sources plug in |
| DS-002 | Primary End-to-End | BEH-003, BEH-004 | User opens Settings | Provider rows and endpoint cards rendered | Web settings stores + server provider/settings services | User-visible removal |
| DS-003 | Primary End-to-End | BEH-005, BEH-006 | Run launch / tool call / `.env` import | Credential resolved / tool executed | Secret management + readiness adapter + agent backend | Credential and processing paths removed |
| DS-004 | Primary End-to-End | BEH-007, BEH-008 | User launches saved work / server starts | Unavailable state or normal start | `ModelAvailabilityService`, `ServerSettingsService`, vault | Preserved outcomes for leftovers |
| DS-005 | Bounded Local | BEH-009 | App-data migration runner | Provider-name snapshots backfilled | Backfill migration | Released migration behavior must not change |

## Primary Execution Spine(s)

- DS-001: `Web llmProviderConfig store -> GraphQL llm-provider resolver -> ModelCatalogService -> {BuiltInLlmProviderCatalog, DynamicModelSourceLifecycle(Ollama/LMStudio/custom)} -> LLMFactory/AudioClientFactory/ImageClientFactory -> snapshot`
- DS-002: `Settings page -> useProviderApiKeySectionRuntime / ServerSettingsEndpointCards -> llmProviderConfig / serverSettings stores -> GraphQL -> LlmProviderService / ServerSettingsService`
- DS-003: `Run launch -> ApplicationProviderCredentialReadinessAdapter / AutoByteusAgentRunBackendFactory -> createAvailableLlm -> SecretManagementProviderApiKeyResolver -> ProviderCredentialCatalog -> vault`
- DS-004: `Launch/resume saved selection -> ModelAvailabilityService.ensureModelAvailable -> (not registered, not dynamic) -> MODEL_IDENTIFIER_NOT_AVAILABLE -> existing unavailable UI`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The catalog lists built-in providers (now without AUTOBYTEUS, because the enum derives the list) and custom providers. Dynamic providers (Ollama, LM Studio, custom) each own one LLM source. Media models come only from the factories' built-in registrations. | Provider descriptor, dynamic LLM source, snapshot | `ModelCatalogService` | `DynamicModelSourceLifecycle` |
| DS-002 | Settings renders server-provided provider rows and a fixed card list. Saving a key no longer triggers a provider-specific refresh. Editing Ollama/LM Studio hosts converges that provider's LLM source. | Provider row, endpoint card, discovery-setting target | Web stores / server services | GraphQL |
| DS-003 | Readiness maps the native runtime's model runtimes `API`/`OPENAI_COMPATIBLE` to provider credentials and `OLLAMA`/`LMSTUDIO` to no credential. The secret catalog resolves only remaining bindings. Tool preprocessing runs the remaining registry. | Credential authority, secret binding | Readiness adapter, `ProviderCredentialCatalog` | Import alias registry |
| DS-004 | A saved remote identifier no longer matches any host-scoped runtime marker, so availability resolution finds no dynamic provider and throws the existing not-available error. The UI shows its existing unavailable state. | Model identifier | `ModelAvailabilityService` | Selection presentations (unchanged) |
| DS-005 | The pending backfill migration classifies rows using a frozen released display-name table (including `AUTOBYTEUS → AutoByteus`), so its output is identical to the released behavior. | Ledger row, provider name | Backfill migration | Frozen table under `legacy/` |

## Spine Actors / Main-Line Nodes

`ModelCatalogService`, `ModelAvailabilityService`, `LlmProviderService`, `ServerSettingsService`, `ProviderCredentialCatalog`, `ApplicationProviderCredentialReadinessAdapter`, `AutoByteusAgentRunBackendFactory` (native runtime, unchanged), web `llmProviderConfig`/`serverSettings` stores, and the backfill migration.

## Ownership Map

Unchanged owners. Each loses only its AUTOBYTEUS remote responsibilities:
- `ModelCatalogService`: owns provider snapshots and dynamic LLM sources (Ollama, LM Studio, custom). It no longer owns remote multi-kind sources or credential revisions.
- `ModelAvailabilityService`: owns lazy availability for custom and Ollama/LM Studio host-scoped LLM identifiers. Media identifiers are available only if registered.
- `ProviderCredentialCatalog`: owns consumer → secret bindings. `modelDiscovery` is gone.
- The backfill migration owns its frozen classification table.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A. No facades are added or changed.

## Removal / Decommission Plan (Mandatory)

Paths are relative to the repository root.

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/api/autobyteus-llm.ts`, `api/autobyteus-conversation-payload.ts`, `api/autobyteus-token-usage-normalizer.ts`, `autobyteus-provider.ts`, `prompt-renderers/autobyteus-prompt-renderer.ts` (+ export in `prompt-renderers/index.ts`) | Remote server decommissioned (REQ-001) | — | In This Change | — |
| `autobyteus-ts/src/clients/` (whole folder: `autobyteus-client.ts`, `autobyteus-client-utils.ts`, `autobyteus-discovery-authentication.ts`, `cert-utils.ts`, `index.ts`) and `export * from './clients/index.js'` in `src/index.ts` | Remote-only. Dead: `cert-utils.ts` is referenced only by its own test | — | In This Change | ASM-002: repo search found no external importer |
| `LLMRuntime.AUTOBYTEUS`, `LLMProvider.AUTOBYTEUS`, `LLM_PROVIDER_DISPLAY_NAMES[AUTOBYTEUS]`, `LLMRuntime.AUTOBYTEUS` in `HostScopedLlmModelIdentifier`/`HOST_SCOPED_LLM_RUNTIMES` (`models.ts`) | REQ-001 | — | In This Change | Host-scoped LLM parsing keeps Ollama/LM Studio |
| `LLMFactory.syncRuntimeModels`, `LLMFactory.retainSourceModels` | Dead: `syncRuntimeModels` is used only by the deleted gateway test; `retainSourceModels` has no caller | — | In This Change | `replaceSourceModels`/`listSourceModels`/`removeSourceModels`/`sourceModelCount` stay (Ollama/LM Studio/custom use them) |
| `autobyteus-ts/src/multimedia/audio/autobyteus-audio-provider.ts`, `audio/api/autobyteus-audio-client.ts`, `image/autobyteus-image-provider.ts`, `image/api/autobyteus-image-client.ts` (+ exports in `audio/api/index.ts`, `image/api/index.ts`) | REQ-002 | — | In This Change | — |
| `MultimediaRuntime.AUTOBYTEUS`, `MultimediaProvider.AUTOBYTEUS` | REQ-002 | — | In This Change | — |
| Media `hostUrl` option/field and the AUTOBYTEUS `modelIdentifier` branch in `audio-model.ts`, `image-model.ts`, `video-model.ts` | Dead: only the remote providers set `hostUrl`. `modelIdentifier` becomes `name` | — | In This Change | GraphQL media rows emit `hostUrl: null` |
| `autobyteus-ts/src/multimedia/model-identifier.ts` (+ `export *` in `multimedia/index.ts`) | Dead: used only by the media AUTOBYTEUS branch and the availability service | — | In This Change | Trim `tests/unit/llm/dynamic-model-identifiers.test.ts` to its LLM cases |
| Source-model registry in `AudioClientFactory`/`ImageClientFactory` (`replaceSourceModels`, `removeSourceModels`, `retainSourceModels`, `listSourceModels`, `syncRuntimeModels`, `sourceByModelId`, `modelIdsBySource`) | Dead: only the remote catalog branches use it | Built-in registration (`registerModel`) | In This Change | Update the `server-owned-media-tools.e2e` factory mocks |
| `autobyteus-server-ts/src/llm-management/services/autobyteus-remote-model-discovery-service.ts` | REQ-001/002 | — | In This Change | — |
| `ModelCatalogService`: remote fields, `AUTOBYTEUS_KINDS`, `startAutobyteusEnsure`, `autobyteusSourceSpec`, `autobyteusSourceCount`, `commitAutobyteusSource`, `removeAutobyteusSource`, the AUTOBYTEUS branches in ensure/reload/settings-change/snapshot, `notifyCredentialRevision`, `credentialRevisions` | Remote-only. Dead: `notifyCredentialRevision`'s only caller is removed; `credentialRevisions` is never incremented after that | Generic `ensureLlmSource` | In This Change | Custom fingerprint becomes `${id}\|${baseUrl}`. `listExternalRuntimeSnapshots` drops the `?? LLMProvider.AUTOBYTEUS` fallback (unreachable: groups are non-empty) |
| `ModelAvailabilityService`: remote discovery dependency, AUTOBYTEUS fallback in LLM resolution, media dynamic resolution, media host checks | Remote-only | — | In This Change | Media kinds: available iff registered |
| `LlmProviderService.setProviderApiKey` AUTOBYTEUS notify branch | Remote-only | — | In This Change | — |
| `BuiltInLlmProviderCatalog` `'AUTOBYTEUS'` DISCOVERED clause | Remote-only | — | In This Change | — |
| `ServerSettingsService` predefined `AUTOBYTEUS_LLM_SERVER_HOSTS` + refresh clause | REQ-003 | — | In This Change | — |
| Secret: `modelDiscovery` consumer variant (`secret-id.ts`, `serializeSecretConsumerIdentity` case), `AUTOBYTEUS` binding and `modelDiscovery`/media-AUTOBYTEUS branches (`provider-credential-catalog.ts`), `AUTOBYTEUS_API_KEY` alias | REQ-004 | — | In This Change | Media consumer then allows only OPENAI (+GEMINI slots as today) |
| `LLMRuntime.AUTOBYTEUS` case in `application-provider-credential-readiness-adapter.ts` | REQ-004 | — | In This Change | Keep `resolveAutoByteusAuthority` (native runtime name) |
| `media-input-path-normalization-preprocessor.ts` + registration in `startup/agent-customization-loader.ts` | REQ-005 | — | In This Change | Delete its `.test.ts` and tracked `.test.js`; update `agent-customization-loader.test.ts`; update `docs/modules/agent_customization.md` if listed |
| Web: AUTOBYTEUS card (`ServerSettingsEndpointCards.vue`), `AUTOBYTEUS_LLM_SERVER_HOSTS` discovery target (`stores/serverSettings.ts`), post-save AUTOBYTEUS refresh (`useProviderApiKeySectionRuntime.ts`), `LLMProvider.AUTOBYTEUS` (`types/llm.ts`) | REQ-003 | — | In This Change | — |
| Web `DiscoverySettingCatalogTarget.modelKinds` and the multi-kind reset in `llmProviderConfig.convergeAfterDiscoverySettingCommit` | Dead: every remaining target is `['LLM']` | LLM-only convergence | In This Change | Keep the `ModelKind` type (the GraphQL source rows still carry `modelKind`) |
| Docker: `upsert_env_var "AUTOBYTEUS_LLM_SERVER_HOSTS"` in `docker/allinone-start-server.sh`, `docker/remote-server-entrypoint.sh`; env lines in `docker/compose.personal-test.yml` | REQ-010 | — | In This Change | — |
| Live E2E: `autobyteus.remote-*` scenarios, `autobyteus-*` operations, `discoverAutoByteus`/`listAutoByteusModels` and their discovery wiring (`test-support/live-e2e/*`) | REQ-010 | — | In This Change | Update `tests/unit/secret-management/live-e2e-harness.test.ts` |
| `MultimediaRuntime` enum (`autobyteus-ts/src/multimedia/runtimes.ts`) and its export in `multimedia/index.ts`; the `runtime` option and field on `AudioModel`/`ImageModel`/`VideoModel` (including `toString()`); the `runtime === MultimediaRuntime.API &&` half of the six GEMINI checks (`{audio,image,video}-model.ts` `createClient`, `{audio,image,video}-client-factory.ts` `requiresGeminiRuntimeResolver`), reduced to `provider === MultimediaProvider.GEMINI`; the by-runtime logging in `autobyteus-server-ts/src/multimedia-management/providers/video-model-provider.ts`; `tests/unit/multimedia/runtimes.test.ts` | Dead: after removing `AUTOBYTEUS`, the enum has one value, every model defaults to it, nothing sets another, and each check's first half is always true (CR-001 evidence; `git grep MultimediaRuntime` on the implemented branch, 2026-10-12). The web declares media `runtime`/`hostUrl` on `ModelInfo` but never reads them | The GraphQL `ModelDetail.runtime` field stays because LLM rows vary. The server `mapMedia` in `api/graphql/types/llm-provider-model-catalog.ts` emits the literal `runtime: 'api'` for media rows (its `hostUrl` is already `null`). No schema or web change; the observable value is unchanged | In This Change (SR-004) | Was Follow-up in SR-003; the deferral rationale ("would reshape the shared GraphQL contract") was wrong. Update affected tests and mocks that construct media models with `runtime` |
| Server dynamic-source `modelKind` (always `LLM` now) | Single value after removal | — | Follow-up | Feeds the GraphQL `ModelSourceStatus.modelKind` field, which the web reads (`llmProviderConfig.ts`); removing it changes the GraphQL source-row shape (ARCH-REV-001 R-003) |

## Return Or Event Spine(s) (If Applicable)

N/A. No event flow changes.

## Bounded Local / Internal Spines (If Applicable)

- DS-005, parent owner: backfill migration. `listCandidateBatch -> classify (frozen table) -> applyBatch`. It matters because its output must stay byte-identical for the same input.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Frozen released provider display names | DS-005 | Backfill migration | Released-shape classification | Guideline §4 | If current runtime imported it, it would become a compatibility path |

## Ownership Boundaries

Unchanged. Current runtime (llm-management, token-usage projections) uses `autobyteus-ts/llm/provider-display-names.js`. Only migrations under `src/app-data-migrations/` may import `src/app-data-migrations/legacy/released-llm-provider-display-names.ts`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ModelCatalogService` | `DynamicModelSourceLifecycle`, factory source registries | GraphQL resolvers, `ModelAvailabilityService`, `ServerSettingsService` | Callers writing factory source models directly | Extending `ModelCatalogService` |
| `ProviderCredentialCatalog` | Secret ID bindings | Secret management service | Hard-coded secret IDs elsewhere | Adding bindings to the catalog |

## Dependency Rules

- `autobyteus-server-ts` must not reference any removed `autobyteus-ts` symbol. The type checker enforces this.
- Current runtime code must not import `src/app-data-migrations/legacy/released-llm-provider-display-names.ts`.
- Do not edit `RuntimeKind` or anything keyed on the native runtime `"autobyteus"`/`"AUTOBYTEUS"` runtime kind (run history, fixtures, `DEFAULT_RUNTIME_KIND`, `normalizeRuntime`, `resolveAutoByteusAuthority`, the token-usage `resolveAutobyteusDisplayName`).

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| GraphQL `providerModelCatalogSnapshots` / `ensureProviderModelCatalog` / `reloadProviderModelCatalog` | Provider catalogs | Unchanged shape; no `AUTOBYTEUS` provider. Ensure/reload with `AUTOBYTEUS` → existing `UNKNOWN_MODEL_PROVIDER` | providerId + runtimeKind | AC-003 |
| GraphQL `setLlmProviderApiKey` | Built-in provider credential | `AUTOBYTEUS` is no longer a built-in ID, so it is rejected by `requireBuiltInProviderId` | providerId | — |
| `SecretConsumerIdentity` union | Secret consumers | `modelDiscovery` removed | — | — |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Catalog GraphQL | Yes | Yes | Low | None |
| `SecretConsumerIdentity` | Yes | Yes | Low | None |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Frozen table | `released-llm-provider-display-names.ts` / `RELEASED_LLM_PROVIDER_DISPLAY_NAMES` | Yes | Low | None |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Frozen released shapes for migrations | `src/app-data-migrations/legacy/` | Reuse | Established home for migration-owned released shapes | — |
| Unavailable saved model handling | `ModelAvailabilityService` + existing UI states | Reuse | Already produces the approved outcome | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| autobyteus-ts llm / multimedia | Provider adapters, enums, factories | DS-001 | Catalog | Reuse (delete) | — |
| server llm-management | Catalog, availability, providers | DS-001, DS-004 | Same | Reuse (delete) | — |
| server secret-management | Bindings, consumers, aliases | DS-003 | Vault | Reuse (delete) | — |
| server app-data-migrations | Frozen table | DS-005 | Backfill migration | Extend | One new file |
| web settings | Cards, stores | DS-002 | Settings UI | Reuse (delete) | — |

## Draft File Responsibility Mapping

See the final mapping below. The draft equals the final mapping (deletion only, plus one new file).

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| N/A | — | — | No repetition introduced | — | — | — |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| GraphQL `ModelDetail` | Yes | Yes | Low | Shape unchanged. LLM rows carry real `runtime`/`hostUrl`; media rows emit `runtime: 'api'` and `hostUrl: null` from `mapMedia`, with no backing media field (SR-004) |
| Web `DiscoverySettingCatalogTarget` | Yes after removing `modelKinds` | Yes | Low | — |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/app-data-migrations/legacy/released-llm-provider-display-names.ts` (new) | app-data-migrations | Backfill migration | Frozen `providerId → display name` table exactly as it is at base `beb6b3b49` (all built-ins except `OPENAI_COMPATIBLE`, including `AUTOBYTEUS: 'AutoByteus'`) plus `isReleasedBuiltInLlmProviderId` | One frozen released shape | No |
| `token-usage-provider-name-snapshot-backfill-migration.ts` (modify) | app-data-migrations | Backfill migration | Import the frozen table instead of `provider-display-names.js`. Keep the `LLMProvider.OPENAI_COMPATIBLE` comparison, or use the literal `'OPENAI_COMPATIBLE'` for full freezing (preferred) | — | Yes |
| All other files | — | — | Edits/deletions per the Removal Plan | — | — |

## Applied Patterns (If Any)

Frozen released shape (migration-owned copy).

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/app-data-migrations/legacy/released-llm-provider-display-names.ts` | File | Backfill migration | Frozen table | Existing legacy-shapes home | Imports from current runtime display names |
| Deleted files/folders | — | — | per Removal Plan | — | — |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/app-data-migrations/legacy/` | Off-Spine Concern | Yes | Low | Established convention |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Saved remote identifier after removal | `ensureModelAvailable('gpt-4o:autobyteus@host:8000','LLM')` → not registered → `parseHostScopedLlmModelIdentifier` returns `null` → throws `MODEL_IDENTIFIER_NOT_AVAILABLE` | Keeping an `autobyteus` marker in the parser "to recognize old identifiers" | Shows that no legacy parsing is needed for AC-004 |
| Backfill migration | `RELEASED_LLM_PROVIDER_DISPLAY_NAMES['AUTOBYTEUS'] === 'AutoByteus'` inside `legacy/` | Keeping `LLMProvider.AUTOBYTEUS` in the runtime enum for the migration | Keeps the runtime clean and the migration stable |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `LLMProvider.AUTOBYTEUS` for history display | Token-usage labels | Rejected | Snapshots + frozen migration table |
| Keep the `autobyteus` host-scoped parser marker | Recognize old identifiers | Rejected | The existing unavailable path |
| Keep `AUTOBYTEUS_LLM_SERVER_HOSTS` as a hidden predefined setting | Hide leftover value | Rejected | The value shows as an ordinary custom setting (DEC-002) |
| Startup cleanup of the `.env` key / vault row | Tidiness | Rejected | DEC-002 approved leaving them inert |
| Deprecated alias for `AutobyteusClient` export | External consumers | Rejected | None exist (ASM-002) |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. **autobyteus-ts**: delete the remote LLM/media/client files. Remove the enum members, the display-name entry, the host-scoped marker, the media `hostUrl`/branches, `model-identifier.ts`, the dead factory source-registry methods and the root/index exports. Delete and edit tests. `pnpm -C autobyteus-ts exec tsc --noEmit` (or the package build) plus unit tests.
2. **server**: add the frozen table and repoint the backfill migration first, so step 3's enum removal doesn't change it. Then remove the discovery service and the catalog/availability/provider-service/built-in-catalog/settings/secret/readiness/preprocessor pieces. Retarget generic tests. Run typecheck and unit/integration plus the affected e2e.
3. **web**: remove the card, store target, post-save branch and enum member; simplify the discovery target; retarget the store/component specs; update the Electron spec sample env key. Run `test:nuxt`, `test:electron` and the guards.
4. **ops/test-support/docs**: Docker scripts and compose; the live-E2E harness; docs (`autobyteus-ts/docs/{provider_model_catalogs,llm_module_design,llm_module_design_nodejs,agent_memory_design}.md`; `autobyteus-server-ts/docs/modules/{llm_management,secret_management,multimedia_management,agent_customization}.md`, `docs/FILE_RENDERING_AND_MEDIA_PIPELINE.md`, `docs/features/artifact_file_serving_design.md`; `autobyteus-web/docs/settings.md`). Remove only remote-provider content.
5. Final static search for AC-001 (outside `tickets/`, historical records and the frozen table).
6. **SR-004 delta (on the implemented branch):**
   - Delete `autobyteus-ts/src/multimedia/runtimes.ts` and its export.
   - Remove the media `runtime` option and field and its `toString()` mention.
   - Reduce the six GEMINI checks to `provider === MultimediaProvider.GEMINI`.
   - Drop the by-runtime logging in `video-model-provider.ts`.
   - Make `mapMedia` emit `runtime: 'api'`.
   - Delete `tests/unit/multimedia/runtimes.test.ts` and update tests and mocks that pass `runtime` to media models.
   - Confirm with `git grep MultimediaRuntime` (no hits outside tickets) and the autobyteus-ts/server typechecks.
   - Reconfirm the existing leftover-startup e2e (media rows `runtime: 'api'`, `hostUrl: null`).

## Key Tradeoffs

- **Remove `MultimediaRuntime` entirely (SR-004).** SR-003 deferred it, claiming the removal would reshape the shared GraphQL `ModelDetail` row. That was wrong: the row keeps `runtime` for LLM rows, and the server writes `'api'` for media rows, so neither the schema nor the observable value changes. The enum, the media `runtime` field and the always-true checks are dead code in touched files (Core Principle 7) and are removed.
- **Keep the dynamic-source `modelKind`.** Unlike the media runtime, it is a field of a GraphQL type the web actually reads, so removing it is a contract change. It stays a Follow-up.
- **Freeze the table instead of leaving the migration on current helpers.** The cost is one small file; it protects a released migration's output (guideline §4).

## Risks

- Retargeting generic tests could accidentally drop coverage. Mitigation: retarget each generic test to Ollama/LM Studio/custom (DEC-003) and keep its assertions.
- Coordination with anthropic-incomplete-content-block (`autobyteus-llm.ts` compile-only edit): whichever lands second rebases. If this lands first, that ticket drops its edit.
- Hidden consumers of removed exports: low (repo-wide search). The type checker catches in-repo ones.

## Guidance For Implementation

- **Retarget, don't delete, the generic tests.** These use AUTOBYTEUS only as a sample: `model-catalog-service.test.ts`, `model-availability-service.test.ts`, `llm-provider-service.test.ts`, `api/graphql/types/llm-provider.test.ts`, `application-provider-credential-readiness-adapter.test.ts`, `application-current-model-selection-policy.test.ts`, `user-input-context-building-processor.test.ts`/`.js`, `server-settings-service` tests, the secret-lifecycle e2e tests (`provider-secret-lifecycle-graphql`, `server-restart-secret-lifecycle`, `real-e2e-provider-capabilities`), `legacy-source-non-authority.test.ts`, `local-environment-source-reader.test.ts`, `llm-phase-summary-port.test.ts`, `compaction-single-attempt-transport.test.ts`, `nonstreaming-finish.test.ts`, `token-usage-normalizers.test.ts`, web `llmProviderConfigStore.test.ts`, `useProviderApiKeySectionRuntime.spec.ts`, `ProviderModelBrowser.spec.ts`, `ServerSettingsEndpointCards.spec.ts`, `ServerSettingsManager.spec.ts` (sample key), `serverSettingsStore.test.ts`, `serverRuntimeEnv.spec.ts`. Remove only the AUTOBYTEUS-specific cases.
- **Delete the remote-only tests**: autobyteus-ts `tests/unit/clients/*`, `tests/integration/clients/autobyteus-client-media-staging.test.ts`, `tests/{unit,integration}/llm/api/autobyteus-llm.test.ts`, `tests/unit/llm/{autobyteus-gateway-routing,autobyteus-provider}.test.ts`, `tests/unit/llm/prompt-renderers/autobyteus-prompt-renderer.test.ts`, `tests/unit/multimedia/{autobyteus-gateway-routing,autobyteus-model-providers}.test.ts`, `tests/unit/multimedia/{audio,image}/api/autobyteus-*-client.test.ts`; server `autobyteus-remote-model-discovery-service.test.ts`, `secret-catalog-autobyteus.test.ts`, `media-input-path-normalization-preprocessor.test.{ts,js}`.
- **Remove the env lines** `AUTOBYTEUS_LLM_SERVER_HOSTS: ' '` from the e2e tests that only silenced remote discovery (`custom-provider-model-metadata`, `model-metadata-provenance`, `qwen-configuration-lifecycle`, `token-usage-model-list`).
- **Do not touch** native-runtime `runtimeKind: "AUTOBYTEUS"` occurrences (fixtures, run-history, web history specs, probes), `AUTOBYTEUS_SERVER_HOST`, `AUTOBYTEUS_VNC_SERVER_HOSTS` or the message gateway's `autobyteus-server-client`.
- **Add tests:**
  - AC-004: a saved `x:autobyteus@host` LLM identifier and an `img@host` image identifier both yield `MODEL_IDENTIFIER_NOT_AVAILABLE` from `ModelAvailabilityService`.
  - AC-005: the server settings list shows a leftover `AUTOBYTEUS_LLM_SERVER_HOSTS` as a deletable custom setting, and startup works.
  - AC-006: the backfill migration classifies `model_provider='AUTOBYTEUS'` as `AutoByteus` and its other existing cases are unchanged.
  - AC-003: ensure/reload with `AUTOBYTEUS` is rejected and the snapshot list has no AUTOBYTEUS.
- **Verification layers (TESTING.md):** autobyteus-ts unit tests; server `typecheck`, `test:unit`, `test:integration`, affected e2e; web `test:nuxt`, `test:electron`, guards. For user verification (AC-002, AC-007): an isolated desktop instance of this worktree build.
