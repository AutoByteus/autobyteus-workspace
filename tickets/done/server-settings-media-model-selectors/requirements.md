# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready / Approved by user on 2026-05-05.

## Goal / Problem Statement

Make high-value media-model defaults configurable from the Server Settings **Basics** card area instead of forcing users into **Advanced** raw environment-variable rows whose keys they do not know. The basic UI must expose dropdown selectors for:

- `DEFAULT_IMAGE_EDIT_MODEL`
- `DEFAULT_IMAGE_GENERATION_MODEL`
- `DEFAULT_SPEECH_GENERATION_MODEL`

Also improve the basic Codex runtime/full-access setting by replacing the current checkbox presentation with the polished switch/toggle UI pattern used by the Applications settings card, while preserving the existing save semantics and persisted setting values.

## Investigation Findings

- `autobyteus-web/components/settings/ServerSettingsManager.vue` owns the Server Settings quick/basic and advanced views. The quick view already has a card grid and imports typed cards such as `ApplicationsFeatureToggleCard`, `CodexFullAccessCard`, and `CompactionConfigCard`.
- The advanced table renders every `store.settings` row as a raw key/value text input. User-provided screenshots show the media model keys currently appear there as raw custom settings with `Custom user-defined setting` descriptions.
- `autobyteus-web/components/settings/CodexFullAccessCard.vue` currently renders the Codex full-access control as `<input type="checkbox">`, while `ApplicationsFeatureToggleCard.vue` uses an accessible `button role="switch"` with rounded track/thumb styling.
- `autobyteus-server-ts/src/services/server-settings-service.ts` currently registers predefined metadata for endpoint, compaction, Applications, and Codex sandbox settings, but not for the three media model default keys. Unregistered keys fall back to `Custom user-defined setting` and are deletable.
- `autobyteus-ts/src/tools/multimedia/image-tools.ts` defines `DEFAULT_IMAGE_GENERATION_MODEL` and `DEFAULT_IMAGE_EDIT_MODEL` with fallback `gpt-image-1.5`; `autobyteus-ts/src/tools/multimedia/audio-tools.ts` defines `DEFAULT_SPEECH_GENERATION_MODEL` with fallback `gemini-2.5-flash-tts`.
- The frontend already has a model catalog owner: `useLLMProviderConfigStore` fetches `availableAudioProvidersWithModels` and `availableImageProvidersWithModels` via GraphQL. The backend `ModelCatalogService` serves audio/image model catalogs for the `autobyteus` runtime through `AudioModelService` and `ImageModelService`.
- `appConfigProvider.config.set(...)` updates both in-memory config and `process.env`, then updates the `.env` file when available. Therefore the existing `updateServerSetting` mutation is the right persistence path for the three default model env vars.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature + UI behavior change.
- Initial design issue signal (`Yes`/`No`/`Unclear`): No major architecture issue; localized UI/model-mapping improvement.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found for settings persistence/model catalog ownership. Minor local UI drift exists because Codex and Applications controls use different switch presentations.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely small local UI extraction or reuse only; no broad backend refactor needed.
- Evidence basis: Current code paths show existing owners for quick settings cards, generic server-setting persistence, model catalogs, and Applications switch styling.
- Requirement or scope impact: Add one typed media-defaults card and update one existing Codex card; register metadata for the three media model keys; reuse existing settings and model-catalog boundaries.

## Recommendations

- Add a new basic card, tentatively `MediaDefaultModelsCard.vue`, to the second quick grid near Applications/Codex/Compaction cards.
- Use the existing `SearchableGroupedSelect` model dropdown pattern and `useLLMProviderConfigStore` model catalog data rather than creating a separate model API.
- Use image model groups for both image-generation and image-edit defaults because the current `ImageModel` domain type does not expose separate generation/edit capability flags.
- Use audio model groups for the speech generation default.
- Preserve unknown/stale current values in the dropdown display as a current custom/stale option so existing user settings are not silently blanked or overwritten.
- Register the three default media model env vars as predefined editable, non-deletable settings in `ServerSettingsService` with clear descriptions. Do not introduce static allowed-value validation there because the valid catalog can include dynamic Autobyteus-hosted models.
- Replace `CodexFullAccessCard` checkbox markup with an accessible `button role="switch"` visual toggle matching Applications. Keep the explicit save button and current value mapping (`on => danger-full-access`, `off => workspace-write`).
- Prefer extracting a small reusable settings switch component if the implementation updates both Applications and Codex switch markup; otherwise keep the Codex change local but visually identical.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium.

Rationale: The change is localized, but it crosses frontend settings UI, frontend model catalog consumption, backend settings metadata, and tests/docs.

## In-Scope Use Cases

- UC-001: User configures the default image editing model from Server Settings Basics without knowing the `DEFAULT_IMAGE_EDIT_MODEL` key.
- UC-002: User configures the default image generation model from Server Settings Basics without knowing the `DEFAULT_IMAGE_GENERATION_MODEL` key.
- UC-003: User configures the default speech generation/audio model from Server Settings Basics without knowing the `DEFAULT_SPEECH_GENERATION_MODEL` key.
- UC-004: User toggles Codex full filesystem access in Server Settings Basics using the same polished switch UI pattern as the Applications card.
- UC-005: Advanced users can still inspect/edit the raw keys in Advanced, but the rows are described as predefined settings rather than opaque custom rows.

## Out of Scope

- Adding new image/audio model providers or changing model factory registrations.
- Adding separate image-generation vs image-edit capability metadata to `ImageModel`.
- Changing provider API key setup flows.
- Guaranteeing that already-running agent sessions or already-created media tool client instances switch model immediately mid-run.
- Removing the Advanced raw settings table.
- Changing the semantic meaning of Codex sandbox values.

## Functional Requirements

- FR-001: Server Settings Basics must render a first-class card for default media models.
- FR-002: The card must expose one dropdown for `DEFAULT_IMAGE_EDIT_MODEL`, one for `DEFAULT_IMAGE_GENERATION_MODEL`, and one for `DEFAULT_SPEECH_GENERATION_MODEL`.
- FR-003: Image dropdown options must come from the existing image model catalog (`availableImageProvidersWithModels`) grouped by provider.
- FR-004: Speech/audio dropdown options must come from the existing audio model catalog (`availableAudioProvidersWithModels`) grouped by provider.
- FR-005: If a setting is absent, the card must display the current tool fallback default: `gpt-image-1.5` for image generation/editing and `gemini-2.5-flash-tts` for speech generation.
- FR-006: If the explicit current setting value is not present in the loaded catalog, the card must preserve and display that current value as an explicit current/stale/custom option rather than clearing it.
- FR-007: Saving a changed dropdown must persist through the existing `updateServerSetting(key, value)` store action using the exact env var key and selected model identifier.
- FR-008: The card must show loading, unsaved-changes, save-in-progress, success, and error states consistently with existing quick settings cards.
- FR-009: Backend settings metadata must register the three media model default keys as predefined, editable, non-deletable settings with clear descriptions.
- FR-010: Advanced raw settings must remain available and must still allow precise editing of the three model keys.
- FR-011: `CodexFullAccessCard` must replace the checkbox with an accessible switch/toggle UI matching the Applications toggle presentation.
- FR-012: Codex full-access persistence semantics must remain unchanged: enabled saves `danger-full-access`; disabled saves `workspace-write`; changes apply to future/new Codex sessions as today.
- FR-013: Settings must remain bound-node aware through the existing server settings store behavior.
- FR-014: The change must add/update frontend unit tests, backend settings service tests, and user-facing settings documentation.

## Acceptance Criteria

- AC-001: In Server Settings Basics, users see a `Default media models` (or equivalent) card with three labeled model selectors: Image editing, Image generation, and Speech generation.
- AC-002: Opening the image selectors shows model choices grouped by provider from the existing image model catalog.
- AC-003: Opening the speech selector shows model choices grouped by provider from the existing audio model catalog.
- AC-004: With no explicit media model env var set, the card displays `gpt-image-1.5` for image defaults and `gemini-2.5-flash-tts` for speech by default.
- AC-005: With an explicit current value such as `nano-banana-pro-app-rpa@host` that is not in the catalog, the card still displays that value and does not overwrite it until the user chooses and saves another option.
- AC-006: Changing each selector and saving calls `updateServerSetting` with the correct key/value pair and then reflects the saved value after server settings reload.
- AC-007: The Advanced settings table describes `DEFAULT_IMAGE_EDIT_MODEL`, `DEFAULT_IMAGE_GENERATION_MODEL`, and `DEFAULT_SPEECH_GENERATION_MODEL` as predefined, editable, non-deletable settings rather than custom deletable rows when present.
- AC-008: The Codex full-access card contains no visible/native checkbox for the main control and exposes a `role="switch"` toggle with correct `aria-checked` behavior.
- AC-009: Toggling Codex full access on/off and pressing save persists `danger-full-access`/`workspace-write` respectively, matching existing behavior.
- AC-010: Existing Applications toggle behavior is not regressed.
- AC-011: Targeted tests pass for `ServerSettingsManager`, the new media model card, `CodexFullAccessCard`, and `ServerSettingsService`.

## Constraints / Dependencies

- Existing persistence path: `useServerSettingsStore.updateServerSetting` -> GraphQL `updateServerSetting` -> `ServerSettingsService.updateSetting` -> `appConfigProvider.config.set`.
- Existing model option source: `useLLMProviderConfigStore.fetchProvidersWithModels('autobyteus')`, which fills `audioProvidersWithModels` and `imageProvidersWithModels`.
- Existing dropdown component: `autobyteus-web/components/agentTeams/SearchableGroupedSelect.vue`.
- Existing switch UI reference: `autobyteus-web/components/settings/ApplicationsFeatureToggleCard.vue`.
- The `ImageModel` domain currently has no generation/edit capability discriminator, so both image selectors use the same image model option set.
- Current media tools may cache clients inside already-created tool instances; do not promise mid-run active-session switching unless implementation explicitly changes tool lifecycle.

## Assumptions

- “cart area” in the user request means the basic settings card area.
- The default media model settings are intended for the AutoByteus multimedia tools that already read these env vars.
- Users benefit more from provider-grouped searchable dropdowns than from plain raw text inputs.
- Advanced editing remains useful for power users and should not be removed.

## Risks / Open Questions

- Open question: Should the card include a small “reload models” action, or rely on the existing Provider/API Key model reload flow? Recommendation: include a lightweight refresh in the card only if implementation can reuse the existing reload action cleanly; otherwise keep out of first pass.
- Risk: Dynamic Autobyteus-hosted model identifiers can disappear if the remote host is offline. Mitigation: preserve unknown current value as a stale/custom option.
- Risk: Current image catalog does not distinguish edit-capable vs generation-only models. Mitigation: use the shared image catalog for both selectors and do not introduce incomplete capability guesses.
- Risk: Users may expect existing active runs to switch model immediately after saving. Mitigation: copy should say defaults apply to future/new media tool use or sessions unless tool lifecycle is updated.

## Requirement-To-Use-Case Coverage

- UC-001: FR-001, FR-002, FR-003, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010.
- UC-002: FR-001, FR-002, FR-003, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010.
- UC-003: FR-001, FR-002, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010.
- UC-004: FR-011, FR-012, FR-013.
- UC-005: FR-009, FR-010.

## Acceptance-Criteria-To-Scenario Intent

- AC-001 to AC-006 validate the basic media model selection workflow.
- AC-007 validates advanced metadata cleanup without removing advanced power-user control.
- AC-008 to AC-010 validate the Codex toggle UI replacement and non-regression of existing toggle semantics.
- AC-011 validates implementation quality across frontend and backend ownership boundaries.

## Approval Status

Approved by user in chat on 2026-05-05. Ready for design/architecture handoff.
