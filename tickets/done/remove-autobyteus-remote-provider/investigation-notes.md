# Investigation Notes

## Investigation Meta

- Package identifier: `remove-autobyteus-remote-provider`
- Request / ticket: Project Task `project_task_7fed5fe3-3ffc-45bd-8925-9873d0850546` (delegated by `/project_task_manager`, AgentRun `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`); brief `follow-up-autobyteus-provider-removal.md` plus the user's 2026-10-11 correction (remove `LLMRuntime.AUTOBYTEUS` too).
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider` on `codex/remove-autobyteus-remote-provider`
- Resolved base remote / branch / revision: `origin/personal` @ `beb6b3b494779eba207feac94a70cb050db7dcbc` (fetched 2026-10-11)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: Success. A dedicated worktree and branch were created from the freshly fetched `origin/personal`.
- Bootstrap blocker: None
- Current solution revision ID: `SR-004`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md` (2026-10-11); `autobyteus-server-ts/docs/design/data_migration_guideline.md` sections 1–6 (2026-10-11, read early because saved data affects the requirements)
- Investigation status: Requirements and architecture investigation complete (2026-10-11).
- Authorities read (architecture gate, 2026-10-11): `references/architecture-design.md`, `references/design-principles.md`, repo `DESIGN.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` (full), `autobyteus-server-ts/docs/design/mandatory-processor-defaults.md`, `TESTING.md`

## Initial Request And Clarifications

- Original request: Remove the AutoByteus remote-server LLM provider integration (clean cut), including `LLMRuntime.AUTOBYTEUS`. User: "i dont have that remote server anymore".
- Clarifications received: User correction 2026-10-11: `LLMRuntime.AUTOBYTEUS` means the remote server backend and must also be removed. The native agent runtime (`RuntimeKind.AUTOBYTEUS`) stays untouched.
- User-supplied facts and constraints: The remote server no longer exists. Clean cut with no compatibility shim. The native agent runtime, its UI label and saved runs that use it must be unaffected.
- Initial ambiguity: whether the image and audio providers are included; how saved data is handled.

## Product And Domain Understanding

- Product area: LLM/media provider management (model catalog, settings, credentials) across `autobyteus-ts`, `autobyteus-server-ts` and `autobyteus-web`.
- Affected actors or systems: desktop/Docker users who configure providers in Settings; the server's model catalog and discovery; application launch credential readiness; the media tools (`generate_image`, `edit_image`, speech).
- Existing user or operational purpose: Users could enter one or more remote AutoByteus LLM server URLs (`AUTOBYTEUS_LLM_SERVER_HOSTS`) and an AutoByteus API key. The server then discovered LLM, image and audio models from those hosts and offered them under an "AutoByteus" provider.
- Relevant terminology:
  - **Remote AutoByteus provider / gateway**: the remote LLM server integration being removed (`LLMProvider.AUTOBYTEUS`, `LLMRuntime.AUTOBYTEUS`, `MultimediaProvider.AUTOBYTEUS`, `MultimediaRuntime.AUTOBYTEUS`).
  - **Native AutoByteus agent runtime**: `RuntimeKind.AUTOBYTEUS = "autobyteus"` in `autobyteus-server-ts/src/runtime-management/runtime-kind-enum.ts`. A different concept. Preserved.
  - `AUTOBYTEUS_SERVER_HOST`: the local AutoByteus server's own public URL. Unrelated. Preserved.
  - `AUTOBYTEUS_VNC_SERVER_HOSTS`: the VNC remote desktop hosts. Unrelated. Preserved.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-11 | Command | `git fetch origin personal`; `git worktree add -b codex/remove-autobyteus-remote-provider … origin/personal` | Bootstrap | Base `beb6b3b49` | — |
| 2026-10-11 | Command | `rg -l` for `LLMRuntime.AUTOBYTEUS`, `LLMProvider.AUTOBYTEUS`, `AutobyteusLLM`, `AutobyteusClient`, `AUTOBYTEUS_LLM_*`, `AutobyteusImage/Audio`, `RemoteModelDiscovery`, `autobyteus-*` file names, `AUTOBYTEUS_API_KEY`, `AUTOBYTEUS_SSL_CERT_FILE`, `AUTOBYTEUS_CERT_FINGERPRINT` (excluding tickets, node_modules, dist, ui-prototypes) | Confirm footprint | ~80 non-ticket files across autobyteus-ts, server, web, docker, test-support; larger than the brief's ~25 estimate (mostly tests) | Inventory below |
| 2026-10-11 | Command | `rg -o 'AUTOBYTEUS_[A-Z_]*…'` counts | Separate the remote-provider env vars from unrelated ones | `AUTOBYTEUS_SERVER_HOST` (267 hits) and `AUTOBYTEUS_VNC_SERVER_HOSTS` are unrelated; `AUTOBYTEUS_LLM_SERVER_HOSTS`, `AUTOBYTEUS_API_KEY`, `AUTOBYTEUS_SSL_CERT_FILE`, `AUTOBYTEUS_CERT_FINGERPRINT`, `AUTOBYTEUS_LLM_*` test vars belong to the provider | — |
| 2026-10-11 | Code | `autobyteus-ts/src/llm/runtimes.ts`, `providers.ts`, `provider-display-names.ts`, `autobyteus-provider.ts`, `models.ts` | Enum ownership | `LLMRuntime.AUTOBYTEUS`, `LLMProvider.AUTOBYTEUS`, display name "AutoByteus"; `models.ts` host-scoped identifier `<model>:autobyteus@<host>` | — |
| 2026-10-11 | Code | `autobyteus-ts/src/multimedia/{providers,runtimes}.ts`, `image/image-model.ts`, `audio/audio-model.ts`, `video/video-model.ts`, `model-identifier.ts` | Media footprint | `MultimediaProvider.AUTOBYTEUS`, `MultimediaRuntime.AUTOBYTEUS`; host-scoped media identifier `<name>@<host>` only for that runtime; video model also branches on it | — |
| 2026-10-11 | Code | `autobyteus-ts/src/clients/*` | Client footprint | The whole `clients/` folder (`autobyteus-client.ts`, `autobyteus-client-utils.ts`, `autobyteus-discovery-authentication.ts`, `cert-utils.ts`, `index.ts`) serves only the remote provider; `cert-utils.ts` is already referenced only by its own test; root `src/index.ts` re-exports `clients/index.js` | — |
| 2026-10-11 | Code | `autobyteus-server-ts/src/llm-management/services/{autobyteus-remote-model-discovery-service,model-catalog-service,model-availability-service}.ts`, `llm-providers/builtins/built-in-llm-provider-catalog.ts`, `llm-providers/services/llm-provider-service.ts` | Server discovery/catalog | Discovery of LLM/audio/image models from hosts and API key; AutoByteus-specific branches in catalog snapshots, reload, credential revisions, settings-change invalidation, availability resolution | — |
| 2026-10-11 | Code | `autobyteus-server-ts/src/services/server-settings-service.ts` | Host setting | Predefined setting `AUTOBYTEUS_LLM_SERVER_HOSTS`; change triggers catalog invalidation. Unregistered `.env` keys are listed as editable/deletable custom settings (`getSettingDescription` → `CUSTOM_SETTING_DESCRIPTION`, `isDeletable=true`) | Saved-data decision |
| 2026-10-11 | Code | `autobyteus-server-ts/src/secret-management/{domain/secret-id.ts,catalog/provider-credential-catalog.ts,provisioning/local-import-credential-alias-registry.ts,provisioning/local-environment-source-reader.ts,services/secret-management-service.ts}` | Credential footprint | Secret `provider.autobyteus.api-key`; `modelDiscovery` consumer kind exists only for AUTOBYTEUS; media consumer allows AUTOBYTEUS for audio/image; import alias `AUTOBYTEUS_API_KEY`. Unknown `.env` aliases are skipped on import. No vault operation enumerates or validates all stored entries (only `authorizeBatch` on import input) | Orphan secret is inert |
| 2026-10-11 | Code | `autobyteus-server-ts/src/application-platform/launch-configuration/application-provider-credential-readiness-adapter.ts` | Credential readiness | `case LLMRuntime.AUTOBYTEUS` maps readiness to the AUTOBYTEUS provider credential | — |
| 2026-10-11 | Code | `autobyteus-server-ts/src/agent-customization/processors/tool-invocation/media-input-path-normalization-preprocessor.ts`; `src/startup/agent-customization-loader.ts:69` | Hidden provider behavior | Mandatory tool-invocation preprocessor that normalizes media input paths only when the agent's LLM provider is `AUTOBYTEUS`; otherwise it returns the invocation unchanged. Without the provider it is a permanent no-op | — |
| 2026-10-11 | Code | `autobyteus-web/stores/serverSettings.ts`, `components/settings/ServerSettingsEndpointCards.vue`, `components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts`, `types/llm.ts` | Web footprint | "AutoByteus LLM Hosts" quick-setup card; discovery catalog target for the host setting; post-save catalog refresh for AUTOBYTEUS; web `LLMProvider.AUTOBYTEUS` enum member. Provider list in Settings is server-driven (built-in catalog) | — |
| 2026-10-11 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/available-llm-construction.ts`; `src/agent-tools/media/{media-generation-service,media-tool-model-resolver}.ts` | Unavailable-model handling | LLM construction and media client creation call `ensureModelAvailable`, which throws `MODEL_IDENTIFIER_NOT_AVAILABLE` for an identifier no provider offers | Saved-data decision |
| 2026-10-11 | Doc | `autobyteus-web/docs/settings.md` §custom providers ("During the provider-absent interval, saved selectors remain visible as unavailable and block launch/resume instead of silently clearing or falling back"); `autobyteus-web/docs/agent_orgs.md` ("Nonempty unavailable models … stay visible errors"); `localization/messages/en/runSettings.ts` (`runSettings.model.unavailable`: "No longer offered by {{runtime}}. Choose another model before this run resumes."); `applications.ts` (`unavailableModelBeforeEntry`) | Product convention for missing models | Established product behavior: a saved model that no provider offers stays visible as unavailable and blocks launch/resume until the user picks another model | Supports no-migration recommendation |
| 2026-10-11 | Code | `autobyteus-server-ts/src/token-usage/projections/token-usage-model-display-projection.ts` | History display | Provider label prefers the stored `provider_name` snapshot; otherwise built-in display name; otherwise `Unknown Provider (<id>)` | — |
| 2026-10-11 | Code | `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-provider-name-snapshot-backfill-migration.ts` | Released-migration coupling | Released migration imports current `isBuiltInLlmProviderId`/`getLlmProviderDisplayName` to backfill provider names. Removing `LLMProvider.AUTOBYTEUS` would silently change its result for not-yet-migrated rows | Architecture: freeze per guideline §4 |
| 2026-10-11 | Doc | `autobyteus-server-ts/docs/design/data_migration_guideline.md` §1–6 | Saved-data policy | Migrate only for a change of meaning or a new required fact; tolerant readers; never lock users out; released migrations must use frozen copies of what they depend on | — |
| 2026-10-11 | Code | `docker/{allinone-start-server.sh,remote-server-entrypoint.sh,compose.personal-test.yml}`, `test-support/live-e2e/*` | Ops/test footprint | Docker entrypoints upsert `AUTOBYTEUS_LLM_SERVER_HOSTS` into the server `.env`; live-E2E harness has AUTOBYTEUS provider scenarios | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | User sets AutoByteus LLM hosts and API key in Settings | Server discovers LLM models from each host (30 s deadline) and offers them as `<model>:autobyteus@<host>` under provider "AutoByteus" for the native runtime | The server is gone, so discovery fails or returns nothing; the provider shows "models unavailable" | discovery service, catalog service, user statement | High |
| BEH-002 | User/System | Same hosts + key | Image and audio models are discovered from the same hosts (`<name>@<host>`) and offered for media default-model settings and media tools | Same as BEH-001: no models | discovery service `AUTOBYTEUS_KINDS = llm, audio, image` | High |
| BEH-003 | User | Settings → Provider API keys | "AutoByteus" is listed as a built-in DISCOVERED provider with API-key editor and Reload; saving the key triggers rediscovery | Visible and non-functional | built-in catalog, `useProviderApiKeySectionRuntime.ts:299` | High |
| BEH-004 | User | Settings → Server settings quick setup | "AutoByteus LLM Hosts" endpoint card next to LM Studio, Ollama, AutoByteus VNC Hosts | Visible and non-functional | `ServerSettingsEndpointCards.vue:174` | High |
| BEH-005 | System | Vault/credential contracts | Secret binding `provider.autobyteus.api-key`; `modelDiscovery` consumer; media consumer for AUTOBYTEUS audio/image; local `.env` import alias `AUTOBYTEUS_API_KEY`; app launch readiness for `LLMRuntime.AUTOBYTEUS` | Exists only for this provider | secret-management files, readiness adapter | High |
| BEH-006 | System | Mandatory tool-invocation preprocessor | For `generate_image`/`edit_image`/`generate_video`, input paths are normalized only when the agent's model provider is AUTOBYTEUS | No-op for every other provider | preprocessor source | High |
| BEH-007 | User | Opening/launching a saved agent/team definition, run, application launch profile or media default setting that selects a remote AutoByteus model | The model is not offered by any provider → shown unavailable; launch/resume/generation blocked with `MODEL_IDENTIFIER_NOT_AVAILABLE` until another model is chosen | This is already today's outcome, because the server no longer exists | `ensureModelAvailable`; web docs/locales cited above | High for the mechanism; per-surface wording to be verified in architecture |
| BEH-008 | Operational | Previously saved host value and API key | `AUTOBYTEUS_LLM_SERVER_HOSTS` persists in the server `.env`; the API key persists encrypted in the vault | Both present for users who configured them; Docker entrypoints write an empty host value | settings service; docker scripts; vault | High |
| BEH-009 | User | Token usage statistics | Historical usage rows display a stored provider-name snapshot | Unaffected by enum removal for rows with a snapshot | display projection, backfill migration | Medium (rows without snapshot render `Unknown Provider (AUTOBYTEUS)`) |
| BEH-010 | User/System | Native agent runtime | `RuntimeKind.AUTOBYTEUS` ("autobyteus"), "AutoByteus" runtime label, saved runs using it, API/Ollama/LM Studio/custom providers, VNC hosts, `AUTOBYTEUS_SERVER_HOST` | Must stay unchanged | runtime-kind-enum.ts | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/llm/{api/autobyteus-llm.ts, api/autobyteus-conversation-payload.ts, api/autobyteus-token-usage-normalizer.ts, autobyteus-provider.ts, prompt-renderers/autobyteus-prompt-renderer.ts}` | Remote LLM adapter, payload, usage normalizer, discovery, renderer | Delete | Update `prompt-renderers/index.ts`, docs |
| `autobyteus-ts/src/clients/*` | Remote HTTP client, cert utilities, discovery auth type | Delete whole folder | Remove `export * from './clients/index.js'` in `src/index.ts`; confirm no external consumer |
| `autobyteus-ts/src/llm/{runtimes,providers,provider-display-names,models}.ts` | Enum members and host-scoped identifier runtime list | Remove `AUTOBYTEUS` members/branches | `BUILT_IN_LLM_PROVIDER_IDS` derives from the enum, so the provider drops out of the server catalog automatically |
| `autobyteus-ts/src/multimedia/{providers,runtimes}.ts`, `image/*`, `audio/*`, `video/video-model.ts`, `model-identifier.ts` | AutoByteus media providers/clients, enum members, host-scoped identifiers | Delete providers/clients and enum members | Check whether the source-model registry APIs (`replaceSourceModels`/`listSourceModels`/`syncRuntimeModels`) in the audio/image factories, and `model-identifier.ts`, still have a non-AutoByteus caller; remove if dead |
| `autobyteus-server-ts/src/llm-management/*` | Discovery service, catalog/availability branches, provider service post-save hook, built-in catalog DISCOVERED mode | Delete service and branches | Catalog keeps Ollama/LM Studio/custom dynamic sources |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | Predefined host setting + invalidation | Remove predefined setting | A saved value then shows as an ordinary custom setting |
| `autobyteus-server-ts/src/secret-management/*` | Secret binding, consumer kind, alias | Remove | Orphan vault row is inert (no enumeration) |
| `autobyteus-server-ts/src/application-platform/launch-configuration/application-provider-credential-readiness-adapter.ts` | Runtime → credential readiness | Remove AUTOBYTEUS case | — |
| `autobyteus-server-ts/src/agent-customization/processors/tool-invocation/media-input-path-normalization-preprocessor.ts` | AutoByteus-only preprocessor | Remove | Unregister in `startup/agent-customization-loader.ts`; check `docs/design/mandatory-processor-defaults.md` and any persisted processor-name references in agent definitions |
| `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-provider-name-snapshot-backfill-migration.ts` | Released migration using current display-name helpers | Must keep its released behavior | Freeze a migration-owned display-name table (guideline §4) |
| `autobyteus-web/{stores/serverSettings.ts, components/settings/ServerSettingsEndpointCards.vue, components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts, types/llm.ts}` | UI pieces | Remove | Check i18n keys for the card |
| `docker/*`, `test-support/live-e2e/*`, server/web tests and docs | Ops env, live E2E, tests, docs | Remove/update | Many tests use the provider as a sample discovered provider; they need replacement fixtures (for example Ollama/LM Studio) rather than deletion where they cover generic behavior |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Server `.env` key `AUTOBYTEUS_LLM_SERVER_HOSTS`; vault row `provider.autobyteus.api-key`; saved model identifiers `<model>:autobyteus@<host>` (LLM) and `<name>@<host>` (image/audio) inside agent/team definitions, run metadata, application launch profiles and media default-model settings; token-usage ledger rows.
- Readers: settings service (tolerant, shows unknown keys as custom), vault (by ID only), model selection/availability (unknown → unavailable), token-usage display (snapshot first).
- Evidence paths: as in the Source Log.

### Structural Surfaces

- Public enums in `autobyteus-ts` (`LLMRuntime`, `LLMProvider`, `MultimediaRuntime`, `MultimediaProvider`) mirrored in the web `LLMProvider` enum; GraphQL provider catalog (server-driven list); secret consumer union type; mandatory processor registration.
- Existing structures that support the approved behavior: generic unavailable-model handling; tolerant settings reader; ID-addressed vault.

### Potential Structural Impacts To Investigate

- API or external-contract change: GraphQL provider list loses `AUTOBYTEUS`; the `ensure/reloadProviderModelCatalog` resolvers reject it as an unknown provider. `autobyteus-ts` root export loses `AutobyteusClient`/`CertificateError`.
- Persistence schema or invariant change: none planned (no migration recommended).
- Security or privacy boundary change: removal of one secret binding and consumer kind (narrows access).
- Concurrency or lifecycle change: removal of one discovery source family in the dynamic source lifecycle.
- Deployment/migration: Docker entrypoints stop writing the host key. One released migration must be frozen.
- Confirmed absent/present/unknown: present as listed; per-surface unavailable-model wording is to be verified in architecture.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| N/A | The server is gone; no live probe is possible | User statement | Removal changes no working behavior for any user | User |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (2026-10-10) | "i dont have that remote server anymore" | Direct | Provider is dead; remove it | — |
| User (2026-10-11) | Remove `LLMRuntime.AUTOBYTEUS`; keep `RuntimeKind` | Direct | Scope includes runtime enum; native runtime preserved | — |
| Brief | Clean cut, no compatibility shim | Direct (via PTM) | No aliases or legacy readers | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Remote AutoByteus LLM server HTTP API | Decommissioned | No longer reachable | User | None |
| Data Migration Guideline | `autobyteus-server-ts/docs/design/data_migration_guideline.md` | Tolerant readers; migrate only for change of meaning; freeze released migrations | Doc | Architecture applies the §2 checklist |

## Persisted Data And State Facts

- Affected stored subjects: (1) `.env` key `AUTOBYTEUS_LLM_SERVER_HOSTS`; (2) vault secret `provider.autobyteus.api-key`; (3) saved model identifiers referencing remote models in definitions, runs, launch profiles and media default settings; (4) token-usage ledger rows that reference the provider.
- Location and representative shape: `.env` line `AUTOBYTEUS_LLM_SERVER_HOSTS=https://host:8000` (Docker writes an empty value); encrypted SQLite `secret_entries` row; string identifiers such as `gpt-4o:autobyteus@host:8000`, `imagen@host:8000`.
- Approximate volume: single-user installs; few or no rows.
- Current readers and writers: listed above. After removal, no writer remains for any of them.
- Current unknown/extra-field behavior: unknown `.env` keys are shown as deletable custom settings; unknown model identifiers are shown as unavailable; unresolvable vault IDs are never read.
- Required semantics or data that must be preserved: native runtime runs and definitions; token-usage history; every other provider's settings and credentials.
- Acceptable loss, reset, rebuild, or regeneration: the remote provider's settings, key and model selections no longer work (they already don't).
- Privacy, retention, compliance, downtime, or operational constraints: no startup lockout (guideline §1).
- Remaining evidence gap: the exact per-surface UI wording for an unavailable remote model in definition editors (architecture verifies).

## Product Design Request Context

- Product Design request in the current input: `Not stated`
- Remaining fields: N/A — not applicable (the only UI change is removing a card, a provider row and their wiring).

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_7fed5fe3-3ffc-45bd-8925-9873d0850546/context/ctx_a442c59ec8c3__follow-up-autobyteus-provider-removal.md` | Project Task Manager | Origin brief (its `LLMRuntime` note was superseded by the user's correction) | Whole task | All | Input | Not behavior-defining beyond the task direction |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | Many generic tests use AUTOBYTEUS as their sample "discovered provider" | Deleting them would lose coverage of generic catalog behavior | Architecture: retarget generic tests to Ollama/LM Studio/custom providers | Open |
| RSK-002 | Risk | The released token-usage backfill migration depends on the current display-name helpers | Silent change to a released migration | Architecture: freeze a migration-owned copy | Open |
| UNK-001 | Unknown | Whether the audio/image source-model registry and `model-identifier.ts` have non-AutoByteus callers | Dead-code removal scope | Architecture | Open |
| UNK-002 | Unknown | Whether any persisted agent definition stores the preprocessor name `MediaInputPathNormalizationPreprocessor` | Removing a mandatory processor must not break definition loading | Architecture | Open |
| RSK-003 | Risk | Coordination with anthropic-incomplete-content-block (compile-only edit in `autobyteus-llm.ts`) | Rebase conflict | Whichever lands second rebases; if this lands first, that ticket drops its edit | Accepted |

## Architecture Investigation Findings

| Date | Source / Command | Observation | Resolves |
| --- | --- | --- | --- |
| 2026-10-11 | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts:388-401`; `src/agent-definition/utils/processor-defaults.ts` | Unknown preprocessor names are logged and skipped; mandatory names are filtered from saved lists | UNK-002: removing the mandatory preprocessor is safe |
| 2026-10-11 | `rg '(Audio\|Image)ClientFactory\.(replace\|list\|remove\|retain)SourceModels\|syncRuntimeModels'`; `rg 'retainSourceModels\|syncRuntimeModels' autobyteus-ts/src/llm` | The media source-model registry is used only by the remote catalog branches and remote tests. LLM `syncRuntimeModels` is used only by the remote gateway test; LLM `retainSourceModels` has no caller | UNK-001: remove both as dead |
| 2026-10-11 | `rg 'model-identifier.js\|HostScopedMultimedia'` | `multimedia/model-identifier.ts` is used only by the media AUTOBYTEUS branch, the availability service and one test | Delete |
| 2026-10-11 | `autobyteus-server-ts/src/api/graphql/types/llm-provider-model-catalog.ts:51-52,104-127`; `autobyteus-web/graphql/queries/llm_provider_queries.ts:21-27` | The shared `ModelDetail` row exposes `runtime`/`hostUrl` for LLM and media rows | Keep the contract; `MultimediaRuntime` keeps the single value `API` (Follow-up) |
| 2026-10-11 | `rg notifyCredentialRevision` | The only caller is `LlmProviderService.setProviderApiKey` for AUTOBYTEUS | `notifyCredentialRevision` and `credentialRevisions` become dead |
| 2026-10-11 | `git tag --contains` for the backfill migration's commit → first released in v1.4.31 (corrected per ARCH-REV-001 R-002) | The backfill migration is released and imports current display-name helpers | RSK-002: freeze a table under `src/app-data-migrations/legacy/` |
| 2026-10-11 | `autobyteus-web/stores/{serverSettings,llmProviderConfig,llmProviderConfigSupport}.ts` | `DiscoverySettingCatalogTarget.modelKinds` is `['LLM','AUDIO','IMAGE']` only for AUTOBYTEUS; the rest are `['LLM']` | `modelKinds` becomes dead and is simplified |
| 2026-10-11 | `application-provider-credential-readiness-adapter.ts:163-178` | `resolveAutoByteusAuthority` is named for the native runtime | Only the `LLMRuntime.AUTOBYTEUS` case is removed |
| 2026-10-11 | Test grep with context | `runtimeKind: "AUTOBYTEUS"` in fixtures, run-history and web specs is the native runtime | Not touched (BEH-010) |
| 2026-10-11 | `test-support/live-e2e/{live-e2e-scenarios.mjs,live-e2e-scenarios.d.mts,live-e2e-harness.ts}` | Three `autobyteus.remote-*` scenarios plus `discoverAutoByteus`/`listAutoByteusModels` | Remove |

| 2026-10-12 | `git grep -n MultimediaRuntime` and `git grep runtime` over server media paths, on the implemented branch (HEAD `ac3868577`) | `MultimediaRuntime` has only `API`. Uses: the enum, the index export, the `runtime` field on the three media models, the six `runtime === API && provider === GEMINI` checks, `runtimes.test.ts`, the server `mapMedia` `String(model.runtime)`, and by-runtime logging in `video-model-provider.ts` | SR-004 / CR-001: the media runtime is dead; remove it. `mapMedia` emits `'api'` |
| 2026-10-12 | `autobyteus-server-ts/src/llm-management/services/run-model-selection-service.ts:60-70`; API/E2E OBS-001 | Native-runtime model replacement requires verified context capacities for both models. An unavailable current model has none, so any swap is refused | Pre-existing limitation for stopped native runs (SCN-004); separate-ticket candidate |

RSK-001 is addressed in design-spec "Guidance For Implementation" (retarget list). ASM-002 remains low risk: no in-repo importer of `AutobyteusClient`/`CertificateError` outside `autobyteus-ts`.

## Requirement Implications

- The provider is already non-functional for everyone. Removal changes no working behavior; it only removes dead surfaces.
- An established product convention covers saved model selections whose provider is absent: they stay visible as unavailable and block launch/resume until the user reselects. No migration is needed to stay consistent with it.
- The settings reader and vault are tolerant, so leftover host values and keys are harmless. Removing them would need new migration machinery, which the guideline does not justify for an obsolete, meaning-free value.

## Notes For Architecture Design

- Map SCN-001..SCN-005 and the preserved behavior (BEH-010) to the deletion plan per package.
- Resolve RSK-001, RSK-002, UNK-001, UNK-002.
- Apply the data-migration guideline §2 checklist (expected answer: no migration; the frozen copy for the released backfill migration).
- Verify unavailable-model behavior for a remote identifier on each saved-selection surface (definition editor, run resume, application launch, media default setting).
