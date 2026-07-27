# Implementation Handoff

## Revision Identity

- Round-28 implementation starting HEAD: `a3f51821019da01d3867ee782f18af9b44c60941`
- Round-28 implementation source/test commit: `0564559298ccf21267581cb4feec88770c72e7ce`
- CR-023 rework starting HEAD: `4d0ee81754b6b8329fe3b5ead2ef7c20ead5ed33`
- CR-023 source/test commit: `e3d9a06d3c0334f87a7a5864351034249b49071d`
- CR-024 rework starting HEAD: `7c0b752663cec85a671ea9c530af753f537544e5`
- CR-024 source/test commit: `14b0f7a96f82d1aa0d27a0858877207ad9953c94`
- Round-30 importer rework starting HEAD: `eac929a1f1e411a72d232d961578a700bed12829`
- Round-30 importer source/test commit: `ccc373f3755a30eca38ab50f8639539e6095385f`
- CR-025 rework starting HEAD: `e8ef13c3b0c86400ea79f2de0d15a5f1dc50003e`
- CR-025 source/test commit: `1ccb12a9aea8c872d7032eb9ac9e1bcf9cf49d8c`
- CR-027 provider-centric rework starting HEAD: `36fc5af434e8321965854a1235f2f36aa154bd38`
- CR-027 source/test commit: `658824c9eef48934672a6e069012935cbff9b5e9`
- CR-028/CR-029 rework starting HEAD: `f14d3a766044f38f9af0105062093eac1de60849`
- CR-028/CR-029 source/test commit: `c31651ca4b1b0e3012567fc3ccb3b11137e67584`
- Round-33 custom-provider-v1 migration starting HEAD: `53dd05ecaac6e3196497597cceba0799f8093aba`
- Round-33 custom-provider-v1 migration source/test commit: `76afaec8684e3e8ee86dfe8b50c3591bd7abc00a`
- CR-030 rework starting HEAD: `5994a622b71533b064910db4da0449505578ebb3`
- CR-030 source/test commit: `3dbe351ee78fbc39f1a1d1f1d2dfc59400fd6672`
- Round-35 environment-preservation rework starting HEAD: `3877b39bdcad2e8c88bb9f86d190308aaf034829`
- Round-35 environment-preservation source/test commit: `a0b99dd3ba3ff0ede6e36ec13d149bcbd5a23bc4`
- Round-36 exhaustive scope-reset starting HEAD: `3244a7c6fc2eb4472ad25c3e0607182f35ad7f4f`
- Round-36 exhaustive scope-reset source/test commit: `7fa54b18da3c3950983ccab367d338b93dfd8a17`
- CR-031 rework starting HEAD: `1931d6ec3366d1d5c1ec8dcb93be9848fe7f48cd`
- CR-031 source/test commit: `3afcf86b3cdd389ddf3506d205ad9fed3edf0a23`
- Gemini UI refinement starting HEAD: `4bf6e7d18229336cd690497370f1a66dedaafc4a`
- Gemini UI source/test/evidence commit: `b5657ae28b8c9a49a759196fd932e7ca7d043daa`
- Branch: `codex/secure-centralized-secret-provisioning`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning`
- The exact final handoff-artifact commit/HEAD follows the source commit and is supplied in the code-review delivery message; a Git commit cannot truthfully contain its own hash.

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-spec.md`
- Supplemental task artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/encrypted-secret-vault-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/gemini-setup-ui-ux-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/credential-consumer-mapping.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/use-case-spine-validation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/secret-storage-architecture.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/live-test-secret-provisioning.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/threat-model-and-option-analysis.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/repository-prisma-1.0.8-assessment.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/custom-provider-v1-migration-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/scope-audit.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/secret-storage-backend-contract.md` (historical-link tombstone only)
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-review-report.md`
- Historical downstream reports/evidence were preserved without reset and are not treated as target authority.

## What Changed

- Refined the existing three-option Gemini Settings presentation without changing its behavior contract. The previous stacked cards and repeated text badges/actions are now one compact divided list with a concise active-mode header, plain green configured dots, radio-style mode selection, and pencil/chevron configuration controls.
- Preserved explicit labels for assistive technology and native hover titles for every icon-only action. The compact rows use 44px controls, visible keyboard focus, an active-row rail/tint, and a quiet `Not Configured` exception label rather than repeating `Configured`.
- Split the option editor and API-key visibility control into focused components. Expanded editors retain secret non-prefill/clearing, initial focus, visible field labels, responsive project/location layout, Save/overwrite, first-time Save-and-use, and no standalone removal.
- Corrected CR-031 by replacing the post-custom-provider-Delete whole AutoByteus catalog reload with the existing targeted `reloadLlmModelsForProvider(providerId, AUTOBYTEUS)` path. That path synchronizes the saved custom-provider runtime/catalog and removes the deleted provider without requiring independently governed AutoByteus remote discovery.
- Preserved failure transparency: vault removal, provider-record deletion, and targeted custom runtime/catalog synchronization errors still propagate. No global AutoByteus reload error is swallowed, and no new coordination or fallback path was added.
- Applied the Round-36 exhaustive `scope-audit.md` cleanup against the audited `3244a7c6...` source state. All 18 `RESTORE_BASE` paths are byte-identical to `origin/personal`, all three `REMOVE_FILE` paths are absent, and all 31 `PARTIAL_CLEANUP` paths were inspected and reconciled hunk-by-hunk without resetting retained work.
- Restored exact `origin/personal` behavior for Electron server-manager environment inheritance, Electron AppData/reset lifecycle, isolated PTY environment inheritance, Claude HTTP MCP/session/options/tools/diagnostics behavior, and persistent built-in-agent defaults.
- Preserved only the reviewed Claude credential delta: explicit `api-key` performs one subject-scoped Anthropic vault resolution immediately before SDK launch and overrides only `ANTHROPIC_API_KEY`; `auto` and `cli` preserve base behavior and perform zero vault lookups.
- Removed the standalone ordinary-provider key-removal mutation/service/store/component/helper/localization/test surface. Ordinary provider Settings now supports only Save/create-or-overwrite plus the value-free configured read.
- Removed the standalone Gemini configuration-removal mutation/service/store/component/localization/test surface. Gemini retains option Save/overwrite, first-time Save-and-use, and Use-this-mode only.
- Retained custom-provider Delete as the provider-entity lifecycle and limited production `removeForConsumer` callers to that exact lifecycle; no ordinary-provider, Gemini, resolver, or importer deletion surface remains.
- Restored full AppConfig `dotenv` parsing and process-environment projection while retaining the typed application-database/Gemini settings, managed-credential `set()`/`delete()` rejection, byte-preserving non-secret writes, and removal of the old LLM-key getter/setter.
- Removed the ticket-created shared production child-environment filter and restored every affected terminal, shell, MCP, watcher/search, worker, and messaging launcher to its exact `origin/personal` environment construction/inheritance. Separately approved file-root, bridge, and redaction behavior remains.
- Kept Codex source byte-equivalent to `origin/personal`. Restored Claude `auto|cli|api-key` with default `cli`, inherited environment, caller options, setting sources, tools/MCP, stderr, and account behavior. `auto`/`cli` perform zero vault lookups; explicit `api-key` performs one subject-scoped Anthropic resolution immediately before the SDK query and overrides only `ANTHROPIC_API_KEY`.
- Removed the ticket-created Claude authentication service, synthetic HOME/PATH/TMP/account policy, strict MCP/tool policy, setting-source overrides, and broad turn-error normalization.
- Added the sole approved automatic credential transition for the fixed application-owned `llm/custom-llm-providers.json` v1 file. The existing non-critical app-data-migration lifecycle now validates the full historical set after Prisma/vault initialization, stages owner-only secret-free v2 metadata, creates every missing encrypted credential in one create-only transaction, fsyncs the stage, and atomically publishes v2 before provider consumers.
- Corrected fixed-path lock recovery so only positive safe integers are PID-bearing owners. An aged zero-byte/non-positive lock left by the pre-migration writer is reclaimable, while an aged lock naming a live positive PID remains mutually exclusive.
- Added an opaque same-process migration receipt. Publication failure can compensate only exact unchanged rows inserted by that repository instance; collisions, changed rows, pre-existing entries, and interruption-created rows are never compared by plaintext, overwritten, or deleted.
- Implemented the approved delete-and-reconfigure outcome for invalid/unsafe/colliding/failed v1 migration. Successful deletion records `SUCCEEDED_WITH_WARNINGS`; failed deletion records `FAILED`, keeps the v1 file physically untouched, omits custom rows, preserves built-in Settings/catalogs, and blocks only current custom creation until filesystem repair and restart.
- Kept normal custom-provider runtime strictly v2-only and added bounded stale custom runtime/catalog containment. There is no v1 compatibility reader, hidden recovery copy/scanner, `.env` migration, ambient fallback, or post-creation update surface.
- Replaced the API-key Settings screen's repeated LLM/audio/image/video provider/status projection with one `providerSettings(runtimeKind)` read. Each exact provider now appears once with one `apiKeyConfigured` fact and four required subordinate model lists.
- Gave API-key Settings its own fixed AutoByteus runtime and cache identity. Codex/Claude catalog selection may continue to change the ordinary model-catalog runtime without redirecting, invalidating, or being overwritten by Settings initialization, reloads, or provider/Gemini/custom post-command refetches.
- Removed the hand-maintained `ProviderSettingsModel`/`ProviderSettingsGroup` response contract. Store state now derives the exact group shape from generated `GetProviderSettingsQuery`; the provider summary remains an explicit UI projection.
- Removed `CredentialStatusObject`, the separate provider-status query/map, the four-array Settings merge, the cross-provider fallback, and the conflicting repeated Apollo entities. Existing credential-independent catalog queries remain unchanged for non-Settings consumers.
- Tightened the ordinary provider Save command to Boolean completion followed by a canonical network-only grouped refetch; tightened custom provider Probe/Create/Delete to the reviewed input/result shapes; and tightened Gemini Save/Use operations to specialized state-returning commands without generic operation/outcome/stage/instruction DTOs.
- Replaced the separate Local Store database/configuration/access-mode subsystem with two Prisma-managed secret tables in the one application SQLite database selected by canonical `DATABASE_URL`.
- Added a database-adjacent 32-byte owner-only root-key sidecar, staged first initialization, metadata verifier, HKDF-SHA-256 per-entry derivation, and AES-256-GCM encryption with ID/domain/version-bound AAD.
- Replaced the crash-persistent initialization sentinel with application-SQLite transaction-scoped exclusion. SQLite now releases initialization ownership automatically when a process terminates; key-only interrupted initialization resumes, while live initializers serialize before key inspection and publish one key/domain pair.
- Removed the artificial singleton-row update previously used to force ownership. Prisma's SQLite interactive transaction already serializes separate clients before the callback, so established verification now commits no row change and leaves the DB/key/file family unchanged.
- Added fail-closed vault bootstrap/runtime/health and one authorization-owning `SecretManagementService` for write-only save/replace, idempotent removal, status, point-of-use resolve, and atomic importer batches.
- Kept the storage-neutral `ProviderApiKeyResolver`; concrete LLM/media clients resolve their intrinsic provider/slot lazily at SDK construction. Catalog and model structures remain credential-independent.
- Implemented explicit Gemini independent-option configuration plus one explicit `GEMINI_SETUP_MODE`; there is no implicit priority or alternate-mode fallback. Exact AI Studio, Vertex Express, and Vertex Project SDK construction remains provider-owned.
- Retained curated Gemini metadata independently from runtime selection; AI Studio alone may perform live Developer API enrichment and Vertex/no-selection paths remain curated-only.
- Reconciled built-in provider Settings, search, explicit Claude `api-key`, AutoByteus remote discovery/invocation, and custom-provider create/probe/list/use/idempotent-delete against the one vault.
- Reworked the explicit assignment-file importer so `pnpm secrets:import` requires one absolute source and one explicit absolute SQLite `--database-url`. The CLI converts that raw URL exactly once through `ApplicationDatabaseLocation.fromAbsoluteFileUrl()`, discards it as raw authority, and carries one immutable `targetLocation` through preview, value-free display, confirmation, migration/bootstrap, and execution.
- Tightened the strict importer target entrypoint to reject a decoded U+0000 before constructing `ApplicationDatabaseLocation`, before service/source/target access, and before any target text can reach output. The value-free CLI failure remains `IMPORT_OPTIONS_INVALID`.
- Removed importer AppConfig/ambient/profile/test-wrapper target authority. Preview remains owned solely by `SecretVaultInspectionService`, opens an existing DB read-only/query-only, and never migrates, initializes, writes, repairs, or changes permissions.
- Removed the old default/e2e target resolver, separate Store CLI/setup command, second-backend interfaces, reset/provisioning machinery, and related obsolete unit coverage without compatibility adapters.
- Updated GraphQL/value-free status projections, the concise Gemini Settings UI, generated web types, localized strings, and focused tests while restoring Electron reset behavior exactly to `origin/personal`.
- Kept Docker source/topology unchanged; kept external Codex unchanged; restored all three Claude modes; retained exact unpatched `repository_prisma@1.0.8` with Prisma 5.22.0.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| `BEH-001` | One provider-centric API-key Settings read while catalogs remain credential-independent. | `LlmProviderService.listProviderSettings()` -> GraphQL `providerSettings` -> web `providerSettingsGroups` -> Settings runtime. | Implemented: one exact provider row owns `apiKeyConfigured`; LLM/audio/image/video catalogs are subordinate exact-ID lists, while existing catalog queries remain supported for other consumers. Settings owns a separate fixed AutoByteus runtime/cache identity, so Codex/Claude catalog selection cannot redirect its grouped read or post-command refetch. |
| `BEH-002` | One application DB selected only by canonical `DATABASE_URL`. | `application-database-location.ts`, `app-config.ts`, Prisma schema/migration, `server-runtime.ts`. | Implemented; no second Store URL/config/access mode remains. |
| `BEH-003` | DB-paired root key, interruption-safe initialization, non-mutating restart verification, and authenticated per-entry encryption. | `secret-vault-bootstrap.ts`, `secret-root-key-file.ts`, `secret-vault-crypto.ts`, Prisma repository. | Implemented with transaction-lifetime exclusion, key-only recovery, live-initializer serialization, byte-stable established verification, owner/identity checks, verifier, fresh nonces, and value-free closed states. |
| `BEH-004` | Write-only ordinary-provider Save/create-or-overwrite and one value-free configured fact. | `SecretManagementService`, `llm-provider-service.ts`, GraphQL provider group, web Settings store/runtime. | Implemented; ordinary Save returns completion then refetches the grouped read. No ordinary-provider deletion mutation/action, value-read, or duplicate credential-status API exists. Custom-provider Delete remains entity-scoped. |
| `BEH-005` | Provider-owned lazy point-of-use resolution. | Core `ProviderApiKeyResolver`, LLM/media factories and concrete clients, server resolver adapters. | Implemented; no model auth descriptor, construction target/context, environment fallback, or server service locator in core. |
| `BEH-006` | Independent Gemini options plus explicit active mode and exact SDK options. | `gemini-configuration-service.ts`, `gemini-runtime-resolver-adapter.ts`, `gemini-helper.ts`, specialized GraphQL/web Gemini files. | Implemented with specialized state-returning commands, no generic operation protocol, no priority authority, and no fallback. |
| `BEH-007` | Curated catalog continuity and bounded live metadata. | Existing metadata provisioning/resolver/provider owners plus updated status tests. | Preserved: AI Studio live/fallback; Vertex/no-selection curated-only and zero metadata secret/HTTP. |
| `BEH-008` | Preserve a valid fixed-path custom-provider-v1 set through one all-or-nothing migration, otherwise delete it for normal frontend reconfiguration while keeping the application available; retain current create/probe/list/use/delete only. | Startup -> Prisma migration -> vault initialization -> `AppDataMigrationRunner` -> `CustomProviderV1AppDataMigration` -> fixed-path file owner -> `SecretManagementService` create-missing batch / exact compensation -> atomic v2 publish; current `CustomLlmProviderStore` and `LlmProviderService` remain v2-only. | Implemented. Valid sets preserve provider IDs/name/base URL and publish only complete secret-free v2 after one encrypted batch. Invalid/collision/stage/DB/publish/interruption cases never publish partial v2 or touch current entries; reset deletes v1 or reports stable `FAILED` if deletion is unavailable. Aged legacy empty locks recover, live positive-PID owners serialize. Custom Delete removes the exact vault credential and entity, then uses only targeted custom runtime/catalog synchronization; unrelated AutoByteus discovery cannot turn the successful cleanup into a GraphQL failure. Built-ins remain readable, stale custom rows are contained, and Create remains strict. No backup/recovery/runtime-v1/update path exists. |
| `BEH-009` | Explicit importer targets one URL-selected application DB; read-only advisory preview; authoritative atomic execute. | `RawImportCliRequest` -> `ApplicationDatabaseLocation.fromAbsoluteFileUrl()` -> exact `ImportRequest`; source reader/import service, positive alias registry, `SecretVaultInspectionService`, vault batch save. | Implemented; the raw URL exists only at the CLI boundary, the same immutable target is used throughout, and AppConfig/ambient/profile/test-wrapper authority is absent. Malformed URLs, including decoded-NUL paths, fail value-free before service/source/target access. Recognize-first, empty-as-absent, DASHSCOPE-only Qwen, no-overwrite/TTY/source immutability remain. |
| `BEH-010` | No automatic arbitrary legacy-source/`.env` migration or credential authority; the fixed application-owned custom-provider-v1 file is the sole bounded exception owned by `BEH-008`. | Full AppConfig `.env` projection plus resolver-owned credential acquisition, the isolated fixed-path app-data migration, and current v2-only custom store. | Implemented; `.env` bytes and ordinary projection remain unchanged, while managed provider clients do not use projected credential aliases as authority. Historical custom-provider schema knowledge exists only in the migration boundary. |
| `BEH-011` | Normal server reads only ordinary `<data-dir>/.env`; test selection is application DB selection. | AppConfig/runtime contract and removal of separate E2E Store setup command. | Production boundary implemented. Test-runtime `.env.test` bootstrap/scenario reconciliation remains API/E2E-owned downstream work. |
| `BEH-012` | Restore Claude `auto|cli|api-key` with one explicit API-key substitution. | `claude-sdk-auth-environment.ts`, `ClaudeSdkClient`, file-local/injected Anthropic resolver. | Implemented; `auto`/`cli` preserve original launch behavior and perform zero vault lookups. Explicit `api-key` resolves once immediately before SDK launch, copies the effective inherited/caller environment, and overrides only `ANTHROPIC_API_KEY`; missing vault state fails value-free without ambient fallback. |
| `BEH-013` | External Codex account/home behavior unchanged. | Existing Codex App Server client. | Preserved; no Codex vault consumer or synthetic home. |
| `BEH-014` | Restore established production child-environment inheritance. | Concrete terminal, shell, MCP, watcher/search, worker, and messaging launchers; removal of `agent-child-environment.ts`. | Implemented: every affected launcher matches its `origin/personal` environment semantics and caller-owned additions. Separately approved file-root/redaction checks remain; no child-environment or process-isolation claim is made. |
| `BEH-015` | AutoByteus remote discovery/invocation with one intrinsic key. | AutoByteus discovery service, agent backend/media construction, provider resolver. | Preserved; no endpoint fallback and credential replacement invalidates discovery generation. |
| `BEH-016` | Exact safe `repository_prisma@1.0.8`, Prisma 5.22.0. | Root/server manifests and lock, policy probe, Prisma client factory. | Preserved unpatched; no production repository owner/import was added. |
| `BEH-017` | Production-shaped Electron/Docker persistence and diagnosability. | Electron AppData reset, one-DB/key lifecycle, existing Docker volume/topology. | Implementation wiring complete; actual packaged/Docker lifecycle remains downstream executable evidence. |

## Key Files Or Areas

- Database identity/config: `autobyteus-server-ts/src/config/application-database-location.ts`, `app-config.ts`, `prisma-client-factory.ts`
- Schema/migration: `autobyteus-server-ts/prisma/schema.prisma`, `prisma/migrations/20260726090000_add_secret_vault/migration.sql`
- Vault custody: `autobyteus-server-ts/src/secret-management/{bootstrap,crypto,persistence,root-key,services}`
- Runtime/catalog/resolver: `secret-vault-runtime.ts`, `provider-credential-catalog.ts`, `secret-management-provider-api-key-resolver.ts`
- Importer/inspection: `application-database-location.ts`, `secret-management/provisioning/local-environment-*`, `secret-vault-inspection-service.ts`, import CLI, root `secrets:import` package command
- Provider-centric Settings/API: `llm-provider-service.ts`, GraphQL `llm-provider.ts`, `llmProviderConfig.ts`, `llmProviderConfigSupport.ts`, `useProviderApiKeySectionRuntime.ts`
- Fixed custom-provider transition: `app-data-migrations/migrations/custom-provider-v1-app-data-migration.ts`, `custom-provider-v1-migration-file.ts`, registry, secret service/repository create-only batch, custom store/runtime containment
- Gemini/server provider behavior: `gemini-configuration-service.ts`, specialized GraphQL Gemini types, `GeminiSetupForm.vue`
- Environment preservation: `app-config.ts`; concrete worker/search/watcher/messaging and core terminal/shell/MCP launchers; removed `non-secret-environment-projection.ts` and `agent-child-environment.ts`
- Claude narrow bridge: `claude-sdk-auth-environment.ts`, `claude-sdk-client.ts`; removed ticket-created authentication service and launch-policy files
- Core point-of-use clients: `autobyteus-ts/src/{llm,multimedia,secrets,utils}`
- Web Gemini/Settings: `GeminiSetupForm.vue`, `GeminiConfigurationOptionCard.vue`, runtime/store/GraphQL/localization files
- Electron lifecycle: `autobyteus-web/electron/server/services/AppDataService.ts`
- Exhaustive scope manifest: `tickets/in-progress/secure-centralized-secret-provisioning/scope-audit.md`

## Important Assumptions

- Supported production databases are SQLite file URLs. A running server resolves configured relative URLs once against the server app root; the standalone importer rejects relative URLs and converts its required explicit absolute URL once without a hidden base directory.
- The application database may be readable under its existing product permissions, but must be a regular non-symlink owned by the current user and not group/other writable; the paired root key must be owner-only.
- Preview is advisory. Confirmed import runs normal migration/bootstrap and transactionally rechecks vault health and entry existence before applying create/skip/replace.
- JavaScript cannot guarantee erasure of every engine-created string copy; the implementation limits lifetime, fills owned buffers, and never intentionally serializes values.
- Configured Gemini options and the explicit active mode are distinct; no save implies activation unless the user chooses the combined first-time action.
- The only eligible automatic credential-bearing source is the application-owned fixed path `<app-data-dir>/llm/custom-llm-providers.json`; arbitrary files and environment sources remain outside this migration.

## Known Risks

- API/E2E has not yet rerun the real browser provider-status journey against the provider-centric read and narrowed Save-only ordinary-provider surface, nor reconciled the tracked `.env.test`/test-runtime bootstrap, explicit-URL importer journey, restart/reopen, Docker, configured-provider, or packaged Electron matrix. These remain downstream coverage work after source review.
- The downstream-owned live-E2E Claude scenario/harness still names and imports the superseded ticket-created authentication service. API/E2E must reconcile that durable scenario to explicit `api-key` mode and the restored `ClaudeSdkClient` resolver seam before execution; implementation engineering did not rewrite or execute API/E2E-owned coverage.
- API/E2E has not yet run the required existing-user packaged Electron custom-provider-v1 upgrade/reset journeys. Those checks must prove successful preservation, forced delete-and-reconfigure, general Settings availability, current Create with a new ID after reset, restart finalization, and value-free evidence.
- Repository-wide Nuxt typecheck is not green at baseline. The 8 GiB CR-028/CR-029 run completed with 5,196 diagnostics across unrelated/generated/test paths and no diagnostics in the five changed files; focused tests plus the production web build are green. Existing generated Apollo optional-import and Electron-test typing diagnostics remain part of that baseline.
- The root key and application DB are an inseparable backup/restore pair; losing either established component intentionally produces a closed recovery condition.
- SQLite transaction-scoped initialization exclusion depends on the selected database remaining reachable for the bounded 10-second transaction. A contender that cannot acquire/complete within that bound fails value-free and may retry; it cannot bypass a live initializer.
- Existing downstream-owned documentation/reports/evidence remain dirty and may describe historical architectures. They were intentionally preserved for their owning stages.
- `EXT-ANTHROPIC-AGENT-SDK-AUTH` remains a maintained delivery/release recheck dependency only, not legal clearance or an authentication redesign. Any authoritative prohibition must return through solution design rather than silently changing the restored `auto|cli|api-key` contract.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: clean-state security refactor plus provider-centric Settings/API correction and one bounded persisted-data migration for the supported fixed custom-provider-v1 source.
- Reviewed root-cause classification: boundary/ownership duplication, duplicated provider/status coordination, loose shared authentication structures, and a migration-required fixed historical schema isolated from current runtime.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now`.
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`; no new requirement/design gap was found.
- Evidence / notes: one canonical database location, one repository, one root-key owner, one runtime service, narrow preview inspector, provider-owned resolver, one provider-centric Settings projection, and one app-data-migration-only v1 owner are reflected in source and focused checks.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No`; v1 schema knowledge is isolated to the approved one-time migration and is absent from normal provider runtime.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes` for separate Store DB/config/access mode/reset/provisioning/E2E setup, old construction/authentication paths, duplicate provider credential-status DTO/query/map/fallback, generic Gemini operation DTOs, standalone ordinary-provider/Gemini deletion surfaces, and the runtime v1-specific reconfiguration branch.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`; provider Settings response types are derived from generated `GetProviderSettingsQuery` rather than maintained in parallel.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes` for implementation owners. The largest reconciled implementation owner is the restored 496-effective-line Claude session. The visual replacement in `GeminiConfigurationOptionCard.vue` crossed the changed-line split signal, so editor state/inputs/actions and the visibility control were extracted into focused 178- and 39-effective-line components; the resulting card is 224 effective lines and every changed implementation file remains below 500. The two existing localization data registries remain 596 effective lines and received only the required labels.
- Notes: production scans found no old Store selector/config/access mode, model construction target/context, managed-provider ambient credential fallback, generic secret API, custom-provider update command, runtime v1 reader, backup/quarantine/recovery scanner, alternate migration source, shared production environment filter, ticket-created Claude authentication subsystem, standalone ordinary-provider removal, or standalone Gemini removal.

## Persisted Data Transition Check (When Applicable)

- Approved decision: ordinary application SQLite data is `Directly Usable — No Migration` beyond normal Prisma migration; superseded separate Local Store/test state and arbitrary legacy environment credential authority are `Discard or Rebuild`; the fixed application-owned custom-provider-v1 file is `Migration Required`.
- Design-spec decision reference: BEH-002–003, BEH-008–011; REQ-002–005, REQ-011–013; AC-008; DS-UC007D/DS-L007; persisted-data decision table; `custom-provider-v1-migration-contract.md`.
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`.
- Direct-use evidence or discard/rebuild result, when applicable: the normal Prisma migration adds only `secret_entries` and `secret_encryption_metadata`; no reader/mover targets the superseded Store or arbitrary legacy plaintext values. Failed fixed-v1 preservation deletes only the canonical eligible source and returns to current missing/v2 semantics.
- Migration implementation and focused checks, only when `Migration Required`: the existing app-data-migration registry runs `CustomProviderV1AppDataMigration` first after Prisma/vault initialization. Focused tests cover missing/v2 no-op, multi-provider preservation, fixed-path locking, terminated-PID and aged zero-byte legacy-lock recovery, non-bypass of an aged live positive-PID owner, invalid/duplicate/unsafe reset, collision/interruption, database/stage/publish failure, exact conditional compensation, deletion failure, v2-only runtime, and Settings containment. Typecheck and production build passed.
- Deviation from the reviewed transition decision: `None`.

## Environment Or Dependency Notes

- Server manifest requests `repository_prisma:^1.0.8`; canonical lock resolves only `1.0.8`; no `1.0.6/1.0.7` or package-patch residue exists.
- `prisma` and `@prisma/client` remain `5.22.0`; the focused exact package policy probe passed 11/11.
- Docker source/topology/ports/volumes/launcher have no implementation delta.
- No real `.env`, `.env.test`, canonical application DB, root key, provider secret, external account state, or secret-bearing source file was inspected or printed.

## Local Implementation Checks Run

- Gemini UI focused Nuxt suite: 2 files / 10 tests passed (`GeminiSetupForm.spec.ts` and `ProviderAPIKeyManager.spec.ts`). Coverage preserves all three options, the exact active mode, configured/unconfigured semantics, icon action labels, single-editor focus, and existing Save/Save-and-use/Use-this-mode behavior.
- Gemini UI `pnpm -C autobyteus-web build`: passed. The only warning is the existing large-chunk warning.
- Gemini UI rendered inspection used the already-running project-supported `pnpm dev:test` browser surface at `127.0.0.1:3000`; starting a duplicate runtime was intentionally avoided after the command reported the existing listeners. Collapsed and expanded AI Studio/Vertex Project states, focus, icon visibility, 430px content width, and a synthetic 320px narrow container were inspected without saving or reading any credential.
- Gemini UI structural checks: `git diff --check` passed. Effective non-empty lines are 90 (`GeminiSetupForm.vue`), 224 (`GeminiConfigurationOptionCard.vue`), 178 (`GeminiConfigurationOptionEditor.vue`), and 39 (`GeminiKeyVisibilityButton.vue`).
- CR-031 focused server suite: 2 files / 16 tests passed. Coverage proves exact custom vault removal, provider-record deletion, targeted zero-model custom synchronization, Boolean-service completion despite a would-fail whole AutoByteus reload, zero remote-discovery use in the custom targeted owner, ordering, built-in rejection, idempotent missing cleanup, and propagation of intrinsic custom synchronization failure.
- CR-031 `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false`: passed.
- CR-031 `pnpm -C autobyteus-server-ts build`: passed, including shared/core builds, Prisma 5.22.0 generation, server TypeScript, built-in bootstrap smoke, and sanitized no-`DATABASE_URL` built-module smoke.
- CR-031 structural checks: the production delta is one targeted call substitution; the changed service remains 401 effective non-empty lines; `git diff --check` passed.
- Round-36 focused server suite: 8 files / 112 tests passed for persistent built-in defaults, Server Settings, provider/Gemini GraphQL and service behavior, AutoByteus discovery invalidation, and restored Claude session/client behavior.
- Round-36 focused web suite: 5 files / 27 tests passed for the API Key Manager, exact-base provider editor, Gemini Save/Use-only states, Settings runtime, and provider store.
- Round-36 exact restoration check: 18/18 `RESTORE_BASE` paths matched `origin/personal` byte-for-byte; 3/3 `REMOVE_FILE` paths were absent.
- Round-36 residue checks: no `removeProviderApiKey`, `removeGeminiConfiguration`, removal-helper/localization module, runtime-default API/map, or removal-only AutoByteus clear method remains. Production `removeForConsumer` references are limited to the custom-provider entity lifecycle and `SecretManagementService`.
- Round-36 `pnpm -C autobyteus-ts build`: passed, including runtime dependency verification.
- Round-36 `pnpm -C autobyteus-server-ts build`: passed, including shared/core builds, Prisma 5.22.0 generation, server TypeScript, built-in bootstrap smoke, and sanitized no-`DATABASE_URL` built-module smoke.
- Round-36 `pnpm -C autobyteus-web transpile-electron`: passed.
- Round-36 focused Electron suite: 2 files / 14 tests passed for exact-base server manager and AppData/reset behavior.
- Round-36 web boundary/localization guards: `guard:web-boundary`, `guard:localization-boundary`, and `audit:localization-literals` all passed; the audit reported zero unresolved findings.
- Round-36 `pnpm -C autobyteus-web build`: passed; only the existing large-chunk warning remains.
- Round-36 `git diff --check`, exact-base byte comparisons, obsolete-symbol scans, and changed-source size audit passed.
- The two durable provider/restart E2E files were structurally reconciled to remove obsolete deletion operations, but implementation engineering did not execute or claim API/E2E coverage.
- Round-35 focused server suite: 4 files / 54 tests passed for AppConfig full projection/write rejection, legacy-source non-authority/current-v2 runtime, Claude selector/environment/vault timing, and preserved Claude session behavior.
- Round-35 focused core launcher suite: 6 files / 29 tests passed for stdio MCP and terminal/shell/PTY environment behavior; focused messaging supervisor suite: 1 file / 3 tests passed.
- Round-35 structural checks: Codex client is byte-identical to `origin/personal`; all ten affected concrete launcher files are exact to `origin/personal`; removed-filter/auth-policy residue scans and `git diff --check` passed.
- Round-35 `pnpm -C autobyteus-ts build`: passed, including runtime dependency verification.
- Round-35 `pnpm -C autobyteus-server-ts build`: passed, including shared/core builds, Prisma 5.22.0 generation, server TypeScript, built-in bootstrap smoke, and sanitized no-`DATABASE_URL` built-module smoke.
- Round-35 `pnpm -C autobyteus-server-ts typecheck`: attempted and reached the existing repository configuration failure where `tsconfig.json` includes `tests` under `rootDir: src`, producing repository-wide `TS6059` diagnostics. Focused Vitest compilation and the production build are green.
- CR-030 focused migration regression: 1 file / 14 tests passed, including aged zero-byte legacy-lock reclamation and non-reclamation of an equally aged live positive-PID lock.
- CR-030 server build TypeScript no-emit check passed; `git diff --check` passed. The delta is limited to the lock-owner classifier and its focused tests.
- Round-33 focused custom-provider migration/vault/provider/legacy/runner suite: 6 files / 75 tests passed. It proves all-or-nothing create-missing persistence, exact unchanged-row compensation, fixed-path lock serialization and dead-owner recovery, complete v2 publication, collision/interruption handling, database/stage/publish/reset failures, v2-only runtime, and built-in Settings containment.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false`: passed after the Round-33 delta.
- `pnpm -C autobyteus-server-ts build`: passed after the Round-33 delta, including shared/core builds, Prisma 5.22.0 generation, server TypeScript, built-in bootstrap smoke, and sanitized no-`DATABASE_URL` built-module smoke.
- Round-33 `git diff --check`, v1-runtime/error-residue scans, migration API caller scans, dependency-preservation checks, and changed-source effective-size checks passed.
- Server focused unit suite: 16 files / 188 tests passed, including vault lifecycle/inspection/importer/AppConfig/Gemini/provider/custom compensation/Claude/Prisma policy.
- CR-023 focused rerun: 3 files / 17 tests passed. It proves stale/terminated key-only recovery, live-initializer serialization before key inspection, one key/domain pair, and established-domain missing-key fail-closed behavior.
- CR-024 focused rerun: 3 files / 18 tests passed. It additionally proves established restart preserves metadata values, root-key bytes/stat, main DB and WAL/SHM/journal bytes/stat/absence, and an independent observer's `PRAGMA data_version`.
- Round-30 focused importer/config/migration/vault suite: 6 files / 69 tests passed. It proves the exact raw/domain request shapes, one absolute-URL conversion, absence of downstream raw/duplicate authority, same-object inspection/confirmation/execution, invalid URL/option rejection, source immutability, read-only inspection, and existing vault lifecycle behavior.
- Sanitized built-CLI explicit-target dry-run: passed. With an empty-base environment and a synthetic private assignment source, it reported `INITIALIZATION_REQUIRED` for the explicit target while leaving the DB, key, and sidecars absent.
- CR-025 focused importer/config/migration/vault suite: 6 files / 71 tests passed. It adds deterministic decoded-NUL target rejection before importer service construction or source/target access.
- CR-025 sanitized built-CLI malformed-target probe: passed. With an empty-base environment and a deliberately nonexistent source, `file:///tmp/review%00target.db` exited 1 with exactly `LOCAL_SECRET_IMPORT_FAILED IMPORT_OPTIONS_INVALID`, emitted no control byte, and did not access the source or target.
- Core LLM/media/provider suite: 76 files / 364 tests passed.
- Web/Electron focused suite: 9 files / 70 tests passed.
- `pnpm -C autobyteus-ts build`: passed, including runtime dependency verification.
- `pnpm -C autobyteus-server-ts build`: passed, including Prisma generation, TypeScript, built-in bootstrap smoke, and sanitized no-`DATABASE_URL` built-module smoke.
- `pnpm -C autobyteus-server-ts typecheck`: attempted; the existing project configuration includes `tests` while retaining `rootDir: src`, producing repository-wide `TS6059` diagnostics before changed-code checking. Focused Vitest compilation and the production build are green.
- The server production build and sanitized bootstrap smoke were rerun after CR-023 and passed.
- `pnpm -C autobyteus-web build`: passed; only the existing large-chunk warning remains.
- `pnpm -C autobyteus-web guard:web-boundary`: passed.
- `pnpm -C autobyteus-web guard:localization-boundary`: passed.
- `pnpm -C autobyteus-web audit:localization-literals`: passed with zero unresolved findings.
- CR-027 focused server suite: 3 files / 25 tests passed, covering exact provider-group composition and orphan rejection, value-free configured projection, tight custom commands, AutoByteus invalidation, and specialized Gemini commands/GraphQL mapping.
- CR-027 focused web suite: 8 files / 39 tests passed, covering grouped store/refetch behavior, exact provider-ID isolation, assembled Apollo/Pinia Settings behavior, configured OpenAI with subordinate audio/image models, ordinary/custom/Gemini commands, pending-state fences, and rendered component states.
- CR-028/CR-029 focused web suite: 4 files / 22 tests passed. The normal Pinia store regression loads Codex and Claude catalogs around Settings initialization and an OpenAI save, proves every `providerSettings` request remains AutoByteus, proves the fixed cache identity is independent from `modelRuntimeKind`, and preserves full media/custom groups. The Settings runtime test also proves all/provider reload commands explicitly target AutoByteus.
- GraphQL schema/codegen: generated from the built server schema; the resulting schema exposes `[ProviderSettingsGroup!]!`, four `[ModelDetail!]!` fields, one non-null `apiKeyConfigured`, tight custom operations, and specialized Gemini state operations with no obsolete credential-status or generic-operation symbols.
- CR-027 `pnpm -C autobyteus-web build`: passed after regenerated GraphQL types.
- CR-028/CR-029 `pnpm -C autobyteus-web build`: passed; the existing large-chunk warning remains. `guard:web-boundary` and `guard:localization-boundary` also passed.
- `git diff --check`, dependency/lock/patch scans, removed-path/environment/custom-update residue scans, Docker-diff scan, and changed-source size checks passed.
- Repository-wide `pnpm -C autobyteus-web exec nuxi typecheck`: attempted with an 8 GiB heap and remained non-green on the existing unrelated/generated/test baseline; the CR-028/CR-029 rerun contains no diagnostics for the five changed files. It is not claimed as passed.
- No API/E2E, real-provider, Docker daemon, canonical database/Store, or packaged-application execution was performed or claimed by implementation engineering.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Settings -> API Key Management -> Gemini, including the three connection options, configured/unconfigured state, active-mode selection, option editing, Save/overwrite, first-time Save-and-use, and Use-this-mode.
- Approved UI/UX, interaction, requirement, or design references: BEH-001/004/006/008, REQ-001, the round-32 provider-centric design, `gemini-setup-ui-ux-spec.md`, and the user's implementation-stage visual feedback.
- Existing design system, shared components, and adjacent product surfaces reviewed: provider sidebar status dots/counts, compact list rows, blue selection treatment, key-editor controls, focus treatment, touch-target sizing, spacing, and the established Settings layout.
- Project development / preview instructions and rendered surface used: the existing project-supported `pnpm dev:test` browser runtime at `http://127.0.0.1:3000/settings`, plus the Nuxt test harness and production build. The attempted launcher correctly reported that the runtime was already active, so inspection used the existing instance rather than disrupting it.
- States, layouts, viewports, and interactions inspected: collapsed configured inactive AI Studio, configured active Vertex Express, unconfigured Vertex Project; expanded AI Studio API-key editor and Vertex Project fields; initial focus; visibility icon; active/inactive mode icons; 430px content width; and a 320px narrow container with no horizontal overflow.
- Visual or interaction issues found and corrected: removed the redundant Connection options card, repeated `Configured` and `Active` pills, large text buttons, per-option descriptive text, and excessive vertical padding. Replaced them with a compact active-mode bar, plain green configured dots, radio-style selection, pencil/chevron controls with native titles and accessible labels, and responsive editor layout. Live inspection also caught non-rendering icon-font classes, which were replaced with deterministic inline SVG.
- Supporting evidence and remaining unverified states or limitations:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/execution-evidence/357-implementation-gemini-compact-ui.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/execution-evidence/358-implementation-gemini-expanded-editor.png`
  - No credential was entered, saved, read, or exposed during implementation inspection. Real GraphQL persistence and independent browser/API coverage remain downstream API/E2E work.

## Downstream Coverage Hints / Suggested Scenarios

- Run packaged existing-user custom-provider-v1 upgrade with one and multiple synthetic providers. Prove startup migration records `SUCCEEDED`, preserves exact ID/name/base URL, exposes only secret-free v2, resolves encrypted credentials at point of use, and survives restart without reprocessing.
- Force invalid, collision, DB/stage/publish, interruption, and canonical-file deletion-failure paths. Prove no partial v2/current-secret overwrite, exact same-process compensation only, `SUCCEEDED_WITH_WARNINGS` or `FAILED` as specified, built-in provider Settings availability, custom omission/runtime clearing, and normal New Provider create/list/use/delete with a new ID after successful reset.
- Reconcile the round-28 `.env.test` and shared test-runtime bootstrap without changing the normal built server’s `<data-dir>/.env` contract; prove tracked template byte identity and removal of separate Store/scenario-manifest behavior.
- Run a pre-feature DB migration and verify ordinary application records plus the two new tables; run fresh create/save/replace/remove/restart/tamper/missing-key/wrong-key/unsupported-version cases.
- Prove `pnpm secrets:import` is the sole command; invalid/missing/duplicate/relative URLs fail before target access; parent/AppConfig/source/cwd cannot redirect it; preview is byte-for-byte non-mutating for absent, pre-feature, ready, and every closed state; then confirm migration/bootstrap/atomic create-skip-replace against only the exact URL-selected DB.
- Rerun `SCSP-E2E-BROWSER-REAL-STATUS-001` first: configured OpenAI plus OpenAI audio/image rows must show one Configured state and Save/create-or-overwrite control with no standalone Remove action, exact provider-ID isolation, and no Apollo overwrite; then cover missing/unavailable states without credential-dependent catalog disappearance.
- Run Gemini option save/overwrite, first-time save-and-use, use-mode, partial-stage retry, restart, exact SDK constructor, selected-slot-only, metadata provenance, no-fallback, and absence of a standalone removal action.
- Exercise custom provider probe/create/list/use/idempotent delete and partial-failure retry; verify no update mutation exists.
- Re-run AutoByteus replacement/discovery races, all three Claude modes (including zero-lookup `auto`/`cli` and one-lookup explicit `api-key`), external Codex continuity, restored child inheritance plus separately approved file-root/redaction checks, and real OpenAI/Anthropic/Gemini/media/search capabilities where configured.
- Run unchanged Docker same-volume DB/key restart/removal and the isolated full packaged Electron lifecycle without making a child-environment or process-isolation claim.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. CR-031 and the Round-36 exhaustive scope reset are complete at implementation scope, on top of the retained provider-centric Settings, vault, importer, Gemini, and custom-provider transition. The cumulative package must pass implementation-source re-review first. Only then may `api_e2e_engineer` rerun the failed packaged existing-user custom-provider Delete scenario first, followed by the real browser provider-status/Save-only journey, existing-user upgrade/reset scenarios, restored production child/Claude/Codex behavior, and the broader configured-provider/importer/restart/Docker/Electron matrix before proportional test-code review.
