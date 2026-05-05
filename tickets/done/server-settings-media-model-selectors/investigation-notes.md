# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; dedicated task worktree and branch created.
- Current Status: Requirements approved by user on 2026-05-05; design spec being produced for architecture review.
- Investigation Goal: Locate the server basic settings UI, current advanced environment variable settings flow, model default settings ownership, model option source(s), and existing polished toggle component so a concrete design can be produced.
- Scope Classification (`Small`/`Medium`/`Large`): Medium.
- Scope Classification Rationale: The change spans UI controls, settings persistence mapping, backend settings metadata, and existing model catalog consumption, but remains localized to server settings and model-list reuse.
- Scope Summary: Add basic-settings dropdown controls for default image edit, image generation, and speech generation models; replace Codex full-access checkbox UI with toggle styling aligned with the Applications card.
- Primary Questions To Resolve:
  - Which frontend files render basic server settings cards and advanced environment variable rows? Resolved.
  - Which backend/API files own persisted server settings and environment variable updates? Resolved.
  - Is there an existing model registry/list-model API for image and speech model options? Resolved.
  - Which reusable toggle component/style renders the Applications toggle shown by the user? Resolved.

## Request Context

User requested converting advanced environment-variable configuration for default image editing, image generation, and speech generation models into easier basic server setting dropdowns in the server settings card area. User also requested replacing the Codex runtime/full-access checkbox UI in basic server settings with the polished toggle UI used by the Applications setting. User provided screenshots of the current advanced rows for `DEFAULT_IMAGE_EDIT_MODEL`, `DEFAULT_IMAGE_GENERATION_MODEL`, `DEFAULT_SPEECH_GENERATION_MODEL`, and a reference Applications card toggle.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-settings-media-model-selectors`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-settings-media-model-selectors/tickets/done/server-settings-media-model-selectors`.
- Current Branch: `codex/server-settings-media-model-selectors`.
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-settings-media-model-selectors`.
- Bootstrap Base Branch: `origin/personal`.
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-05-05 before worktree creation; `origin/personal` at `18f75c903eb3fe07949a18d5dd044e09f2147cb6`.
- Task Branch: `codex/server-settings-media-model-selectors`, created from `origin/personal`.
- Expected Base Branch (if known): `origin/personal`.
- Expected Finalization Target (if known): `personal`.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Work must proceed in the dedicated worktree above, not the shared `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` checkout.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-05 | Command | `pwd`; `ls -la`; `git status --short --branch`; `git remote show origin`; `git fetch origin --prune`; `git worktree add -b codex/server-settings-media-model-selectors /Users/normy/autobyteus_org/autobyteus-worktrees/server-settings-media-model-selectors origin/personal` | Bootstrap repository, base branch, and dedicated worktree context | Source repo is git, remote default branch is `personal`, task worktree created from current `origin/personal` | No |
| 2026-05-05 | Other | User screenshots in chat prompt | Understand current pain and desired UI reference | Advanced env rows expose exact keys and text inputs; Applications card uses desirable switch UI | No |
| 2026-05-05 | Code | `autobyteus-web/components/settings/ServerSettingsManager.vue` | Find basic/advanced server settings entrypoint | Quick tab renders card grids and imports typed cards. Advanced tab renders raw `store.settings` key/value table. Quick endpoint fields are hard-coded in `quickSetupFields`. | Use as integration point for media defaults card |
| 2026-05-05 | Code | `autobyteus-web/components/settings/CodexFullAccessCard.vue` | Inspect current Codex UI | Main control is native checkbox (`input type="checkbox"`) with local dirty/save state. Enabled maps to `danger-full-access`; disabled maps to `workspace-write`. | Replace checkbox markup with switch; preserve behavior |
| 2026-05-05 | Code | `autobyteus-web/components/settings/ApplicationsFeatureToggleCard.vue` | Inspect desired toggle shape | Uses `button role="switch"`, `aria-checked`, rounded track/thumb classes, disabled state, and status label. | Reuse or mirror this switch styling |
| 2026-05-05 | Code | `autobyteus-web/stores/serverSettings.ts`; `autobyteus-web/graphql/queries/server_settings_queries.ts`; `autobyteus-web/graphql/mutations/server_settings_mutations.ts` | Trace frontend settings persistence | Store fetches settings, updates via `UPDATE_SERVER_SETTING`, then reloads settings. Binding watcher invalidates state on bound-node changes. | Reuse existing store action |
| 2026-05-05 | Code | `autobyteus-server-ts/src/api/graphql/types/server-settings.ts`; `autobyteus-server-ts/src/services/server-settings-service.ts`; `autobyteus-server-ts/src/config/app-config.ts` | Trace backend settings persistence | GraphQL resolver delegates `updateServerSetting` to service. Service validates predefined metadata only where configured. `AppConfig.set` updates `configData`, `process.env`, and `.env` file. | Register media keys metadata; no new persistence path needed |
| 2026-05-05 | Code | `autobyteus-ts/src/tools/multimedia/image-tools.ts`; `autobyteus-ts/src/tools/multimedia/audio-tools.ts` | Confirm env keys and defaults | Image generation and edit tools use env vars with default `gpt-image-1.5`; speech tool uses env var with default `gemini-2.5-flash-tts`. Image tool instances cache selected model/client after first execution. | UI defaults should align; do not overpromise active-run switch |
| 2026-05-05 | Code | `autobyteus-server-ts/src/llm-management/services/model-catalog-service.ts`; `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts`; `autobyteus-web/graphql/queries/llm_provider_queries.ts`; `autobyteus-web/stores/llmProviderConfig.ts` | Find model option source | Existing GraphQL query returns LLM, audio, and image provider/model groups. Store exposes `audioProvidersWithModels`, `imageProvidersWithModels`, and getters. Audio/image catalogs only return non-empty for `autobyteus` runtime. | Reuse store/model catalog for dropdown options |
| 2026-05-05 | Code | `autobyteus-web/components/agentTeams/SearchableGroupedSelect.vue`; `autobyteus-web/utils/modelSelectionLabel.ts` | Find dropdown component and labels | Existing searchable grouped select supports provider grouping and selected labels. Model labels already handle custom OpenAI-compatible display. | Reuse for media model dropdowns |
| 2026-05-05 | Code | `autobyteus-ts/src/multimedia/image/image-model.ts`; `autobyteus-ts/src/multimedia/audio/audio-model.ts` | Check media model shape | `ImageModel` has no flag separating generation-only vs edit-capable models. `modelIdentifier` includes `@host` for Autobyteus remote models. | Both image selectors should use same image option set; preserve stale `@host` values |
| 2026-05-05 | Doc | `autobyteus-web/docs/settings.md` | Check current docs expectations | Docs already describe Codex full-access card, compaction card, advanced raw table, and Applications toggle. | Update docs after implementation |
| 2026-05-05 | Test | `autobyteus-web/components/settings/__tests__/ServerSettingsManager.spec.ts`; `CodexFullAccessCard.spec.ts`; `ApplicationsFeatureToggleCard.spec.ts`; `autobyteus-server-ts/tests/unit/services/server-settings-service.test.ts` | Identify required test updates | Existing tests cover quick cards, Codex checkbox behavior, Applications switch, and predefined server settings metadata. | Add media card tests and update Codex toggle expectations |
| 2026-05-05 | Other | User chat approval: “Yeah, approve. Now you can kick off the ticket now” | Confirm requirements approval | Requirements approved for downstream design/implementation workflow | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Server Settings page chooses `ServerSettingsManager` with `sectionMode` `quick` or `advanced`.
- Current execution flow:
  - Basic card flow: `Settings page -> ServerSettingsManager quick tab -> typed card/component or quick field -> useServerSettingsStore.updateServerSetting -> GraphQL updateServerSetting -> ServerSettingsResolver -> ServerSettingsService -> appConfigProvider.config.set -> process.env/.env`.
  - Advanced raw flow: `Settings page -> ServerSettingsManager advanced raw table -> text input per setting -> save/delete button -> same server settings store/GraphQL/service/config path`.
  - Model catalog flow: `Frontend store useLLMProviderConfigStore.fetchProvidersWithModels('autobyteus') -> GraphQL availableAudioProvidersWithModels/availableImageProvidersWithModels -> ModelCatalogService -> AudioModelService/ImageModelService -> AudioClientFactory/ImageClientFactory`.
  - Current Codex card flow: `CodexFullAccessCard checkbox -> local dirty state -> save -> updateServerSetting('CODEX_APP_SERVER_SANDBOX', danger-full-access|workspace-write)`.
- Ownership or boundary observations:
  - `ServerSettingsManager` owns layout/orchestration of the settings page but individual typed cards own their specific UI mapping.
  - `useServerSettingsStore` is the correct frontend persistence owner for generic env-backed settings.
  - `ServerSettingsService` is the backend metadata/validation owner for known server setting keys.
  - `useLLMProviderConfigStore` and `ModelCatalogService` are the existing model catalog owners; no new model-list boundary is needed.
- Current behavior summary:
  - Media model defaults are configurable only through raw Advanced keys when users know the key names.
  - Codex full-access uses a native checkbox rather than the app’s nicer switch visual.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature + UI behavior change.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found for core architecture; minor local UI drift between checkbox and switch patterns.
- Refactor posture evidence summary: Existing owners are sufficient. A small reusable switch component may be useful to avoid duplicated switch markup, but no broad settings/model refactor is required.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `ServerSettingsManager.vue` | Basic page already supports typed cards (`ApplicationsFeatureToggleCard`, `CodexFullAccessCard`, `CompactionConfigCard`) | Adding `MediaDefaultModelsCard` fits existing card ownership and avoids expanding raw table logic | Yes, design/implement card |
| `serverSettings.ts` + GraphQL/server service | Existing update path writes settings and reloads store | No new persistence API needed for env-backed defaults | No |
| `llmProviderConfig.ts` + GraphQL/model catalog | Existing store already contains audio/image provider groups | No new model catalog owner needed | No |
| `CodexFullAccessCard.vue` vs `ApplicationsFeatureToggleCard.vue` | Checkbox vs switch visual mismatch | Local UI consistency issue; can be fixed locally or via small reusable switch | Yes |
| `ImageModel` shape | No capability flag for generation vs editing | Avoid over-designing separate filters; same image dropdown options for both image defaults | No |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/settings/ServerSettingsManager.vue` | Server settings layout, quick fields, advanced raw table, search config card | Quick view has card grids; advanced table edits all settings as text | Add media defaults as a typed card, not by expanding advanced table |
| `autobyteus-web/components/settings/CodexFullAccessCard.vue` | Basic Codex full-access setting UI and value mapping | Uses native checkbox; value mapping and explicit save are correct | Replace only control presentation; preserve persistence semantics |
| `autobyteus-web/components/settings/ApplicationsFeatureToggleCard.vue` | Applications runtime capability card | Contains desired accessible switch styling | Source of switch behavior/style to reuse or mirror |
| `autobyteus-web/stores/serverSettings.ts` | Bound-node aware frontend server settings persistence | `updateServerSetting` reloads settings; Applications refresh special case exists | Reuse for media default saves; no new store necessary unless card state helper is desired |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | Backend predefined setting metadata/validation and generic setting update/delete | Media model keys are not predefined | Register three media keys as editable, non-deletable predefined settings |
| `autobyteus-server-ts/src/config/app-config.ts` | Runtime config and env file persistence | `set` writes `configData`, `process.env`, and `.env` | Existing env-backed persistence is adequate |
| `autobyteus-web/stores/llmProviderConfig.ts` | Frontend provider/model catalog store | Already fetches audio and image provider groups | Use for dropdown options |
| `autobyteus-server-ts/src/llm-management/services/model-catalog-service.ts` | Backend model catalog owner | Lists audio/image models for `autobyteus` runtime only | Fetch catalogs with runtime kind `autobyteus` |
| `autobyteus-web/components/agentTeams/SearchableGroupedSelect.vue` | Searchable grouped dropdown UI | Already supports provider-grouped model selection | Reuse for media model selectors |
| `autobyteus-ts/src/tools/multimedia/image-tools.ts` | Generate/edit image tool env defaults and client creation | Defaults are `gpt-image-1.5`; tool instances cache model/client | UI fallback should match; copy should avoid promising immediate active-run switch |
| `autobyteus-ts/src/tools/multimedia/audio-tools.ts` | Speech generation tool env default and client creation | Default is `gemini-2.5-flash-tts`; client may be cached per instance | UI fallback should match |
| `autobyteus-web/docs/settings.md` | User-facing settings documentation | Existing sections describe quick cards and Codex full access | Update after implementation |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-05 | Code trace | Static read of settings/model paths listed above | Existing GraphQL/store/service boundaries already cover the required data and persistence flows | No runtime server needed for requirements-level analysis |

## External / Public Source Findings

No external sources consulted. This investigation used local repository sources only.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for analysis. Implementation validation should use unit tests and optionally local Settings page browser smoke testing.
- Required config, feature flags, env vars, or accounts: Existing media model env keys may be set to test current/stale values; no API keys required for unit tests.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin --prune`; `git worktree add -b codex/server-settings-media-model-selectors ... origin/personal`.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- Basic settings cards are already the product-facing boundary for common env-backed controls. Media model defaults are good candidates for the same pattern.
- Advanced settings should remain generic, but backend metadata should stop classifying known media defaults as deletable custom settings when they are present.
- The model dropdown should use model identifiers, not model values, because the multimedia tools and factories resolve by `modelIdentifier`/name. Remote Autobyteus models can include `@host` in the identifier.
- Since `ImageModel` does not encode generation/edit support, filtering edit dropdowns by guessed support would be unsafe.
- Existing tests will need updates because Codex tests currently assert a checkbox and use `setValue` on the checkbox.

## Constraints / Dependencies / Compatibility Facts

- No backwards-compatibility wrapper is needed. The raw env var keys remain the canonical persisted keys; the new basic card is a friendlier editor over those same keys.
- The Advanced table remains available and should continue using `updateServerSetting`/`deleteServerSetting` semantics.
- Do not add static allowed-value validation for dynamic media model keys in `ServerSettingsService`, because model catalogs can be dynamic and remote-host-specific.
- Active tool instances may not pick up default model changes until a new tool instance/client is created; this is pre-existing behavior from tool client caching.

## Open Unknowns / Risks

- Whether to include a model catalog reload button inside the new card is a product choice. It is useful but not required for first pass.
- If the current saved model is no longer in the catalog, the UI must show it clearly enough that users understand it may be stale/unavailable.
- If users expect immediate mid-run model switch, separate tool lifecycle work would be needed and should be scoped explicitly.

## Notes For Architect Reviewer

Requirements are approved. Design should focus on reusing existing settings and model catalog boundaries, adding a single typed media-defaults card, registering backend metadata, and fixing Codex toggle presentation with minimal local UI refactor before architecture review handoff.
