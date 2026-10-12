# Implementation Handoff — remove-autobyteus-remote-provider

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Independent architecture review was selected (Large/High). The result is ARCH-REV-001 `Pass`, routed to the implementation engineer.
- Requirements doc (Approved, SR-002 basis): `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/solution-revision-record.md`
- Design spec (SR-003): `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/design-spec.md`
- Designer handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/handoff-architecture-design-complete.md`
- Supplemental task artifacts: N/A. None are behavior-defining. Product Design artifacts: N/A — not applicable.
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/architecture-review-revision-record.md`
- Triggering rework report: N/A (initial implementation)

## Current Implementation Summary

The remote AutoByteus LLM, image and audio provider is removed as a clean cut across `autobyteus-ts`, `autobyteus-server-ts`, `autobyteus-web`, Docker and the live-E2E harness. This covers the adapters, discovery, client, enums, catalog/availability branches, credential paths, the AutoByteus-only preprocessor, Settings surfaces, tests and current docs. Saved data is not migrated (DEC-002). The released token-usage backfill migration now reads a frozen, migration-owned display-name table. That change landed first, in its own commit. The native `RuntimeKind.AUTOBYTEUS` runtime is untouched.

Branch `codex/remove-autobyteus-remote-provider` (base `origin/personal` @ `beb6b3b49`). Development commits:

1. `4196f55a5` refactor(app-data-migrations): freeze released LLM provider display names for the token-usage backfill
2. `fdb7635f3` refactor!: remove the remote AutoByteus LLM/image/audio provider
3. `ac3868577` docs: remove the remote AutoByteus provider from current docs
4. `403eb2784` refactor(multimedia): remove the single-valued MultimediaRuntime (IR-002 / SR-004, CR-001)

- Implementation cycle: `Rework` (IR-002, SR-004 delta; IR-001 is the baseline)
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: `SR-003`, `SR-004`
- Related architecture-review revision IDs: `ARCH-REV-001`, `ARCH-REV-002`
- Related code-review revision IDs: `CRR-001` (Pass on IR-001, superseded); `CRR-003` (Design Impact CR-001); `CRR-005` — `Pass` on IR-002, CR-001 resolved (informational; `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/code-review-report.md`). The reviewer routed the package to `/software_engineering_team/api_e2e_engineer` for the rerun.
- Related API/E2E revision IDs: `API-REV-002` (prior pass; rerun required for IR-002)
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A` (R-001/R-002/R-003 are non-blocking. They were applied as guidance: no freeze for `custom-provider-readable-id`, and no GraphQL `modelKind` reshaping.)

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` → "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - Deletion spans 3 packages plus Docker, the live-E2E harness and docs. The code commit changes 108 files (+338/−5424).
  - Shared exported enums and the root `clients` export shrink, as do the GraphQL provider list and the secret consumer union.
  - A released migration is repointed.
  - No new owner, migration, concurrency or deployment-ordering change was introduced.
- Selected route: `Code Review`
- Lightweight implementation self-review for the direct route: `Not Applicable` (Large/High route)
- New design impact or escalation trigger: `None`. Each escalation trigger was checked:
  - No external consumer of the removed exports is in the repository.
  - No persisted reader rejects the leftovers. The `.env` key is listed as custom, the vault row is never resolved, and remote identifiers resolve to unavailable.
  - `RuntimeKind` is unchanged.
  - `custom-provider-readable-id-app-data-migration.ts` was deliberately left alone, per R-001/PRM-001.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | No remote LLM discovery/adapter/provider | Deleted: `autobyteus-ts/src/llm/{api/autobyteus-llm.ts, api/autobyteus-conversation-payload.ts, api/autobyteus-token-usage-normalizer.ts, autobyteus-provider.ts, prompt-renderers/autobyteus-prompt-renderer.ts}`, `src/clients/`. Removed `LLMRuntime.AUTOBYTEUS`/`LLMProvider.AUTOBYTEUS` and the display name. `models.ts` host-scoped runtimes are Ollama/LM Studio only. Server `autobyteus-remote-model-discovery-service.ts` is deleted. `ModelCatalogService` lists built-ins plus Ollama/LM Studio/custom only, and ensure/reload go through `ensureLlmSource`. | Done |
| BEH-002 | No remote image/audio discovery/clients (IR-002: `MultimediaRuntime` and the media `runtime` field also removed; GraphQL media rows emit `runtime: 'api'`) | Deleted the media providers/clients and `multimedia/model-identifier.ts`. Removed `MultimediaRuntime/MultimediaProvider.AUTOBYTEUS`, the media `hostUrl`, and the source-model registry in the audio/image factories. Catalog media rows are filtered by provider from the factories' built-ins. | Done. `MultimediaRuntime` removed in IR-002. |
| BEH-003 | No "AutoByteus" provider anywhere in Settings | The provider list is server-driven from `BUILT_IN_LLM_PROVIDER_IDS`, so AUTOBYTEUS disappears with the enum. Web `types/llm.ts` member removed. `built-in-llm-provider-catalog.ts` DISCOVERED clause trimmed. | Rendered check: provider nav lists no AutoByteus |
| BEH-004 | "AutoByteus LLM Hosts" card gone | `ServerSettingsEndpointCards.vue` quick-setup field removed. `ServerSettingsService` predefined setting and refresh clause removed. Web `stores/serverSettings.ts` target removed. | Rendered check: cards are LM Studio, Ollama, AutoByteus VNC Hosts |
| BEH-005 | Credential paths and enum members removed | `secret-id.ts`: `modelDiscovery` variant and serializer case. `provider-credential-catalog.ts`: AUTOBYTEUS binding and `modelDiscovery`/media AUTOBYTEUS branches; the media consumer now allows OPENAI (+ the Gemini slots, unchanged). `local-import-credential-alias-registry.ts`: `AUTOBYTEUS_API_KEY`. Readiness adapter: `LLMRuntime.AUTOBYTEUS` case (method `resolveAutoByteusAuthority` kept). `LlmProviderService.setProviderApiKey`: notify branch. `ModelCatalogService`: `notifyCredentialRevision`/`credentialRevisions`; custom fingerprint is now `${id}\|${baseUrl}`. Web post-save AUTOBYTEUS refresh removed. | Done |
| BEH-006 | AutoByteus-only preprocessor removed | `media-input-path-normalization-preprocessor.ts` and its `.test.ts`/`.test.js` deleted. The registration and the then-dead `registerToolInvocationPreprocessor` helper (plus the unused `logger.warn`) are removed from `startup/agent-customization-loader.ts`. | Saved definitions that name it are skipped by the existing unknown-name path (UNK-002) |
| BEH-007 | Saved remote selections show unavailable; no migration | `parseHostScopedLlmModelIdentifier('x:autobyteus@h')` → `null`. `ModelAvailabilityService` resolves dynamic providers for LLM only, and media is available iff `hasRegisteredModel`. Result: `MODEL_IDENTIFIER_NOT_AVAILABLE`. | Unit tests added (AC-004) |
| BEH-008 | Leftover `.env` host and vault key inert | No code. The tolerant settings reader lists the unknown key as custom/deletable. The vault row has no binding, so it is never resolved, and the import alias is skipped. | Unit test plus rendered check (listed, then deleted via UI) |
| BEH-009 | History preserved; released migration unchanged | New `src/app-data-migrations/legacy/released-llm-provider-display-names.ts`, the base table verbatim (all built-ins except `OPENAI_COMPATIBLE`, including `AUTOBYTEUS: 'AutoByteus'`). The backfill migration imports only it and compares against the literal `'OPENAI_COMPATIBLE'`. | AC-006 classification test added. The display projection is unchanged. |
| BEH-010 | Native runtime unchanged | No edits to `RuntimeKind`, `DEFAULT_RUNTIME_KIND`, `normalizeRuntime`, run history, fixtures, `AUTOBYTEUS_SERVER_HOST`, VNC hosts or the gateway client | Full server/web suites green |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- **autobyteus-ts src:**
  - `llm/{runtimes,providers,provider-display-names,models,llm-factory}.ts` — `syncRuntimeModels`/`retainSourceModels` removed from `llm-factory.ts`
  - `llm/prompt-renderers/index.ts`
  - `multimedia/{runtimes,providers,index}.ts`
  - `multimedia/{audio,image,video}/*-model.ts`
  - `multimedia/{audio,image}/*-client-factory.ts` (source registry removed)
  - `multimedia/{audio,image}/api/index.ts`
  - `src/index.ts`
  - Deleted files are listed under BEH-001/BEH-002.
- **Server src:**
  - `llm-management/services/{model-catalog-service,model-availability-service}.ts`
  - `llm-management/llm-providers/{services/llm-provider-service,builtins/built-in-llm-provider-catalog}.ts`
  - `services/server-settings-service.ts`
  - `secret-management/{domain/secret-id,catalog/provider-credential-catalog,provisioning/local-import-credential-alias-registry}.ts`
  - `application-platform/launch-configuration/application-provider-credential-readiness-adapter.ts`
  - `startup/agent-customization-loader.ts`
  - `api/graphql/types/llm-provider-model-catalog.ts` — media `hostUrl: null`
  - `app-data-migrations/{legacy/released-llm-provider-display-names.ts (new), migrations/token-usage-provider-name-snapshot-backfill-migration.ts}`
- **Web:**
  - `components/settings/ServerSettingsEndpointCards.vue`
  - `components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts`
  - `stores/{serverSettings,llmProviderConfig,llmProviderConfigSupport}.ts` — `modelKinds` removed; convergence uses the module constant `DISCOVERY_SETTING_MODEL_KINDS = {'LLM'}`
  - `types/llm.ts`
- **Ops/test-support:**
  - `docker/{allinone-start-server.sh,remote-server-entrypoint.sh,compose.personal-test.yml}`
  - `test-support/live-e2e/{live-e2e-scenarios.mjs,live-e2e-scenarios.d.mts,live-e2e-harness.ts}` — also dropped the scenario `hosts` field, which only the remote scenarios used
- **Tests retargeted (per DEC-003 and the design list):**
  - autobyteus-ts:
    - `llm-phase-summary-port` — the remote-session block now uses a scripted session LLM with the same assertions
    - `compaction-single-attempt-transport` and `nonstreaming-finish` — RPA-only cases removed
    - `token-usage-normalizers`
    - `dynamic-model-identifiers` — media case removed; asserts that `:autobyteus@` no longer parses
    - `multimedia/{providers,runtimes}`
  - Server:
    - `model-catalog-service`, `model-availability-service` and `llm-provider-service` (now Ollama/LM Studio)
    - `graphql llm-provider`
    - `readiness-adapter` and `current-model-selection-policy` — AUTOBYTEUS rows removed
    - `user-input-context-building-processor` `.ts`/`.js` — now Anthropic/OpenAI
    - `agent-customization-loader` — asserts that no tool preprocessor is registered
    - `grok-build-runtime-registration` — constructor arity
    - `live-e2e-harness`
    - `server-settings-service` — AC-005 case added
    - e2e: secret lifecycle (both, now LM Studio), `server-owned-media-tools` mocks (`hasRegisteredModel`), and the four env-line removals
  - Web:
    - `llmProviderConfigStore` — LM Studio; the convergence test now asserts the LLM-only reset
    - `useProviderApiKeySectionRuntime` — LM Studio; the post-save case now asserts no model action
    - `ProviderModelBrowser` — sample error code
    - `ServerSettingsEndpointCards` — the leftover fixture asserts the card is absent
    - `ServerSettingsManager` — the leftover key is a deletable custom row
    - `serverSettingsStore` — Ollama convergence; the leftover key does not converge
    - `serverRuntimeEnv` — sample key is now the VNC hosts setting
- **Test files renamed rather than deleted:** `tests/unit/secret-management/secret-catalog-autobyteus.test.ts` → `provider-credential-catalog.test.ts`. It held the only generic `ProviderCredentialCatalog` mapping coverage, so it keeps those cases. Its AUTOBYTEUS cases now assert rejection, and it asserts that the old secret ID is unknown.
- **Remote-only tests deleted, per the design list:**
  - autobyteus-ts: `tests/unit/clients/*`, the client media-staging integration test, LLM unit/integration, gateway routing (LLM/media), provider, prompt renderer, model providers and media client tests
  - Server: the discovery-service test and the preprocessor tests

## Important Assumptions

- ASM-002 holds: no in-repo importer of `AutobyteusClient`/`CertificateError` outside `autobyteus-ts`. The server typecheck and builds pass.
- The frozen table copies the display names at base `beb6b3b49`. This follows the design: identical output for the same input as the code being replaced.

## Known Risks

- AC-001 static search: the remaining matches are false positives or intentional mentions:
  - **False positives:** native-runtime `runtimeKind: 'AUTOBYTEUS'`, the `AutoByteusLlmFactory` type, and `*-model-identifier` prop names.
  - **Intentional test fixtures** (tests of the approved leftover behavior, AC-003/004/005/006):
    - server: `model-catalog-service.test.ts`, `model-availability-service.test.ts`, `provider-credential-catalog.test.ts`, `server-settings-service.test.ts`, the backfill migration test
    - autobyteus-ts: `dynamic-model-identifiers.test.ts`
    - web: `ServerSettingsEndpointCards.spec.ts`, `ServerSettingsManager.spec.ts`, `serverSettingsStore.test.ts`
  - **Intentional doc notes** about leftover data, naming the old key so users know what to delete: `autobyteus-server-ts/docs/modules/{llm_management,multimedia_management,secret_management}.md`, `autobyteus-web/docs/settings.md`.
  - **Migration-owned:** the frozen table.
- The VNC Hosts card now sits alone in the second row of the two-column quick-setup grid. That is the expected outcome of removing one card; order and styling are unchanged.
- RSK-003: whichever of this ticket and anthropic-incomplete-content-block lands second must rebase. `autobyteus-llm.ts` is deleted here.
- Token-usage rows with neither a snapshot nor a backfill fill render `Unknown Provider (AUTOBYTEUS)` (accepted in the design review).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Cleanup (feature removal)
- Reviewed root-cause classification: No Design Issue Found
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: every seam was removed within its existing owner; no owner changed shape.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. The frozen table is migration-owned and imported only by the backfill migration.
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. Removed beyond the design list:
  - `registerToolInvocationPreprocessor` and its imports/types, plus the unused `logger.warn` in `agent-customization-loader.ts` (no other caller)
  - the always-true `runtime === MultimediaRuntime.API` filter in `ModelCatalogService.snapshotFor`
  - the media `hasRegisteredModel` methods are now used by `ModelAvailabilityService` instead of `listModels().find`
- Dead code found elsewhere, listed as follow-up:
  1. `BaseLLM.releaseConversation` (default no-op) and the bounded release machinery in `LlmPhaseSummaryPort.release`. `AutobyteusLLM` was the only override (`rg "releaseConversation" autobyteus-ts/src` shows only `base.ts` and the port), so the release step no longer has an effect in production. It is kept, because the hook is part of the compaction-port contract and outside this design's removal list. Test coverage was retargeted to a scripted session LLM.
  2. The `logicalConversationId` kwarg that `LlmPhase` passes is now consumed only by the deny-list filter in `provider-request-kwargs.ts`.
  3. Resolved in IR-002: `MultimediaRuntime`, the media `runtime` field and the always-true runtime checks are removed. Still a design Follow-up: server dynamic-source and GraphQL `ModelSourceStatus.modelKind` (R-003), which the web reads.
  4. The multi-source freshness aggregation in `useProviderApiKeySectionRuntime` remains generic over source kinds. Dynamic providers now emit only LLM sources.
- Shared structures remain tight: `Yes` (`DiscoverySettingCatalogTarget` reduced to `ownerProviderId`)
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`. Every changed source file shrank; the new file has 22 lines.
- Notes: R-001 was applied: `custom-provider-readable-id-app-data-migration.ts` is not frozen.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration` for the `.env` key, vault row, saved identifiers and ledger rows. Separately, the released backfill migration's classifier is frozen (a code repoint, not a data transition).
- Design-spec decision reference: "Persisted Data / State Transition Decision" and the §2 checklist
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence:
  - The rendered check started the built server with `AUTOBYTEUS_LLM_SERVER_HOSTS` left in `.env`. Startup was normal, and GraphQL listed the key as `Custom user-defined setting`, editable and deletable. The UI deleted it.
  - Unit tests cover unavailable remote identifiers, an unknown secret ID, and that the AUTOBYTEUS consumer is rejected.
- Migration implementation: N/A. The backfill migration ID and SQL are unchanged; only the classifier source moved to `legacy/`.
- Deviation: `None`

## Environment Or Dependency Notes

- Worktree had no `node_modules`; ran `pnpm install --frozen-lockfile`.
- Untracked build outputs (SDK/app `dist/` folders) were created by `prebuild`/`test:integration:prepare` and are not staged.

## Local Implementation Checks Run

IR-002 (SR-004 delta) checks:
- `git grep MultimediaRuntime`: nothing found outside tickets and historical build logs.
- autobyteus-ts build typecheck: pass. Full `tsconfig.json`: no new errors.
- Server typecheck and build: pass.
- autobyteus-ts unit: 297 files pass.
- Server `test:unit`: 665 files / 5230 tests pass.
- Clean-env e2e `server-owned-media-tools`, `removed-remote-provider-leftover-startup` and `removed-remote-provider-saved-selection-graphql`: 3 files / 10 tests pass.
- Web code is unchanged by IR-002.

IR-001 checks:

All run on the worktree. These are implementation-scoped checks only, not API/E2E sign-off.

- `pnpm -C autobyteus-ts exec tsc --noEmit -p tsconfig.build.json` → pass. `-p tsconfig.json` (src+tests) leaves only pre-existing test-type errors; none were introduced in changed files.
- `pnpm -C autobyteus-ts exec vitest run tests/unit` → 298 files / 2011 tests pass. A rerun of the affected `llm`, `multimedia` and summary-port tests after the final edit → 87 files / 670 tests pass.
- `pnpm -C autobyteus-server-ts typecheck` → pass.
- `pnpm -C autobyteus-server-ts build` → pass, including the bootstrap smoke.
- `pnpm -C autobyteus-server-ts test:unit` → 665 passed / 4 skipped files, 5228 tests pass.
- `test:integration:prepare` + `test:integration` → 71 files pass. 2 tests fail in `tests/integration/agent/agent-status-websocket.integration.test.ts`; TESTING.md lists exactly these two content-cadence cases as the known baseline exception.
- Affected server e2e, clean env (`env -i PATH HOME TMPDIR … vitest run …`) → 7 files / 22 tests pass:
  - llm-management custom-provider-metadata, metadata-provenance, qwen-lifecycle
  - media server-owned-media-tools
  - secret provider-lifecycle, server-restart-lifecycle
  - token-usage-model-list
  - `real-e2e-provider-capabilities` skipped (gated)
- `pnpm -C autobyteus-web test:nuxt --run` → 601 files / 4174 tests pass.
- `pnpm -C autobyteus-web test:electron` → 36 files / 191 tests pass.
- `guard:web-boundary`, `guard:localization-boundary` and `audit:localization-literals` → pass.
- `bash -n` on both Docker entrypoints → pass.
- AC-001 static search (`git grep` of the AC-001 symbol list, excluding tickets, ui-prototypes and test-results) → only the intentional or false-positive matches listed under Known Risks.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Settings → API Keys provider list; Settings → Server Settings → Basics (quick-setup endpoint cards); Server Settings → Advanced (raw settings table, deleting a leftover key).
- Approved references: requirements "UI, Interaction, And Experience Requirements" — the card and the provider row disappear; the remaining cards and rows keep their layout and order.
- Design system / adjacent surfaces reviewed: existing `ServerSettingsEndpointCards`, `ProviderModelBrowser` and `ServerSettingsManager`; no new UI.
- Surface used: the TESTING.md browser-probe pattern.
  - Self-check script: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/implementation-checks/settings-removal-check.mjs`
  - Setup: the built worktree server on a probe-owned data root and temp DB, with the `.env` leftover `AUTOBYTEUS_LLM_SERVER_HOSTS` and Ollama/LM Studio hosts pointed at a closed port; Nuxt dev; headless Chrome at 1440×900; clean env.
- States and interactions inspected:
  - Provider nav: Anthropic … Qwen and New Provider; no AutoByteus.
  - Quick setup: LM Studio, Ollama and AutoByteus VNC Hosts cards only, with no "AutoByteus LLM Hosts" text.
  - Advanced: the leftover key renders as a custom row with Remove. Clicking Remove deletes it on the backend, and the row detaches.
  - Server GraphQL: no AUTOBYTEUS in credential settings or snapshots; `ensureProviderModelCatalog('AUTOBYTEUS')` → `UNKNOWN_MODEL_PROVIDER`; `saveProviderApiKey('AUTOBYTEUS')` → `Unsupported built-in provider 'AUTOBYTEUS'.`
- Visual or interaction issues found and corrected: none. The VNC card now occupies the second grid row alone, which is expected.
- Evidence:
  - Result: `.../implementation-checks/settings-removal-run-1/result.json` (Pass, 0 browser errors, owned processes terminated, temp root removed)
  - Screenshots: `api-keys.png`, `server-settings-quick.png`, `server-settings-advanced-leftover.png`, `server-settings-advanced-after-delete.png`
- Remaining limitations: the Electron shell was not exercised (web-equivalent only). Saved remote selections in definition/run/launch-profile editors were not rendered; that uses the existing unavailable UI path and was covered at the availability-service level.

## Downstream Coverage Hints / Suggested Scenarios

- AC-004 end-to-end: a saved agent definition, launch profile or media default with `gpt-4o:autobyteus@host:8000` or `imagen@host:8000` shows unavailable and blocks launch/generation without clearing the value.
- AC-005 with a vault row: import or insert `provider.autobyteus.api-key` into a test-owned vault (this is not possible through the importer anymore). Confirm that startup and other providers work and that the row is never read.
- AC-006 on a real DB: run the backfill migration against ledger rows with `model_provider='AUTOBYTEUS'` and an empty `provider_name` → `AutoByteus`.
- AC-007: launch and resume native AutoByteus runtime runs with API, Ollama, LM Studio and custom models in an isolated desktop instance; check the "AutoByteus" runtime label.
- AC-008: Docker images and compose start without writing `AUTOBYTEUS_LLM_SERVER_HOSTS`.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Owned by `api_e2e_engineer`:
  - broader executable validation of AC-002..AC-008
  - isolated desktop-instance user journeys (AC-002, AC-007)
  - Docker start
  - any gated live suites the engineer judges relevant
- No API/E2E sign-off is claimed here.
