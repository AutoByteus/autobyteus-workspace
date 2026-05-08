# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Add a first-class Server Settings → Basics configuration card for `AUTOBYTEUS_STREAM_PARSER` so users can enable the XML streaming parser override without manually adding/editing the raw key in Advanced settings.

Today the product already supports `AUTOBYTEUS_STREAM_PARSER=xml`, but the only frontend path is the Advanced key/value table. The requested Basics card should follow the existing card-grid conventions and expose the common decision as a single on/off toggle: XML parser override on vs default/non-XML behavior off.

## Investigation Findings

- `autobyteus-web/components/settings/ServerSettingsManager.vue` owns Server Settings → Basics today and renders endpoint quick setup cards, standalone behavior cards, Web Search, Compaction, and Advanced raw settings.
- `CodexFullAccessCard.vue` is the closest existing pattern for this feature: it maps a friendly boolean toggle to a string-valued env/server setting (`CODEX_APP_SERVER_SANDBOX`), treats non-target values as off, preserves unsaved local edits across settings refresh, and saves through `serverSettingsStore.updateServerSetting(...)`.
- `autobyteus-web/stores/serverSettings.ts` is the frontend authoritative settings boundary. It reads raw server settings through `GET_SERVER_SETTINGS`, writes through `UPDATE_SERVER_SETTING`, and reloads the settings after a successful mutation.
- `autobyteus-server-ts/src/services/server-settings-service.ts` is the backend authoritative settings metadata/validation/persistence boundary. Predefined settings are editable but non-deletable, can validate/normalize values, and still appear in Advanced with a typed description.
- `AUTOBYTEUS_STREAM_PARSER` is currently consumed by `autobyteus-ts/src/utils/tool-call-format.ts`. Valid runtime values are `xml`, `json`, `sentinel`, and `api_tool_call`; unset/invalid resolves to `api_tool_call` in the main tool-call format resolver.
- Because this is now a first-class setting, the backend should register `AUTOBYTEUS_STREAM_PARSER` as a predefined editable setting with validation/normalization instead of continuing to treat it as an opaque custom setting.
- Code review round 1 found a design-impact source-size blocker: direct composition edits leave changed `ServerSettingsManager.vue` at `886` effective non-empty lines, above the hard `500` line gate. The design must now include a source-size-safe split before API/E2E validation.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes, after code-review re-entry
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): File Placement Or Responsibility Drift
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: The functional feature fits existing settings boundaries, but code review found direct edits to `ServerSettingsManager.vue` leave a changed source implementation file at `886` effective non-empty lines, above the hard `500` line gate.
- Requirement or scope impact: Product behavior remains unchanged, but implementation scope now includes extracting focused Basics settings components so changed source files comply with source-size limits before API/E2E validation.

## Recommendations

1. Add a new `StreamingParserCard.vue` in `autobyteus-web/components/settings/` and render it in the Server Settings → Basics card grid near other runtime behavior cards.
2. Use a single switch plus save button, mirroring `CodexFullAccessCard`:
   - On = persist `AUTOBYTEUS_STREAM_PARSER=xml`.
   - Off = persist `AUTOBYTEUS_STREAM_PARSER=api_tool_call` as the canonical default/non-XML value when saving from an XML state.
   - Absent, invalid, `api_tool_call`, `json`, and `sentinel` values render as off; only trimmed case-insensitive `xml` renders on.
3. Register `AUTOBYTEUS_STREAM_PARSER` as a predefined editable/non-deletable server setting with allowed values `xml`, `json`, `sentinel`, and `api_tool_call`, normalizing persisted values to lowercase.
4. Preserve the Advanced settings path for expert values (`json`, `sentinel`, `api_tool_call`) while making the Basics toggle intentionally two-state.
5. Add focused frontend component tests, ServerSettingsManager placement coverage, backend settings-service validation tests, and GraphQL e2e coverage for the predefined setting.
6. Resolve the code-review source-size design impact by extracting Basics ownership out of `ServerSettingsManager.vue` into focused components before returning to code review.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: User opens Server Settings → Basics and sees a Streaming parser card.
- UC-002: User enables the XML parser override from Basics.
- UC-003: User disables the XML parser override from Basics and returns to canonical default/non-XML behavior.
- UC-004: User who configured `AUTOBYTEUS_STREAM_PARSER=xml` through Advanced sees the Basics toggle on.
- UC-005: User who uses Advanced for non-XML parser values still sees a coherent Basics card without losing Advanced control unless they explicitly save a Basics toggle change.

## Out of Scope

- Changing streaming parser runtime behavior or adding a new parser strategy.
- Adding a full parser mode selector to Basics.
- Removing Advanced settings support for `AUTOBYTEUS_STREAM_PARSER`.
- Mutating already-active streams or already-constructed streaming handlers in place.
- Broad Server Settings layout redesign.

## Functional Requirements

- FR-001: Provide a Server Settings → Basics card titled/described for the streaming parser setting.
- FR-002: The card must expose one accessible switch for enabling/disabling the XML parser override.
- FR-003: The switch must initialize on only when the current `AUTOBYTEUS_STREAM_PARSER` value is `xml` after trimming and case-normalization.
- FR-004: The switch must initialize off when the setting is absent, invalid, blank, `api_tool_call`, `json`, or `sentinel`.
- FR-005: Saving the card while on must persist `AUTOBYTEUS_STREAM_PARSER=xml` through `serverSettingsStore.updateServerSetting(...)`.
- FR-006: Saving the card while off after an XML state must persist `AUTOBYTEUS_STREAM_PARSER=api_tool_call` as the canonical default/non-XML behavior.
- FR-007: The card must preserve unsaved local toggle edits when the raw settings store refreshes, matching the existing Codex full-access card behavior.
- FR-008: Backend settings metadata must treat `AUTOBYTEUS_STREAM_PARSER` as predefined, editable, non-deletable, and validated against the runtime-supported values.
- FR-009: Advanced settings must continue to support the full runtime value set: `xml`, `json`, `sentinel`, and `api_tool_call`.
- FR-010: UI copy must clarify that Basics controls the XML override and that changes apply to future/new streamed agent responses, not already-active streams.

## Acceptance Criteria

- AC-001: Server Settings → Basics contains a Streaming parser card in the standalone card grid.
- AC-002: With no `AUTOBYTEUS_STREAM_PARSER` configured, the Streaming parser toggle renders off and no dirty/unsaved state is shown.
- AC-003: With `AUTOBYTEUS_STREAM_PARSER=xml` configured through Advanced or persisted server settings, the toggle renders on.
- AC-004: With `AUTOBYTEUS_STREAM_PARSER` set to `api_tool_call`, `json`, `sentinel`, blank, or an invalid value, the toggle renders off.
- AC-005: Enabling the toggle and saving calls the existing settings mutation with key `AUTOBYTEUS_STREAM_PARSER` and value `xml`; after reload, Advanced shows the normalized value and typed predefined description.
- AC-006: Disabling the toggle from an XML state and saving calls the existing settings mutation with key `AUTOBYTEUS_STREAM_PARSER` and value `api_tool_call`; after reload, Advanced shows the normalized default/non-XML value and typed predefined description.
- AC-007: Advanced rejects unsupported `AUTOBYTEUS_STREAM_PARSER` values through the backend settings boundary and does not persist invalid replacements.
- AC-008: Existing Basics cards still render and save as before.
- AC-009: Focused frontend and backend tests cover initialization, save values, placement, backend validation, and GraphQL persistence.

## Constraints / Dependencies

- Must reuse `serverSettingsStore` for frontend reads/writes and must not issue direct Apollo mutations from the new card.
- Must reuse `ServerSettingsService` for backend metadata, validation, normalization, and persistence.
- Must preserve runtime semantics from `autobyteus-ts`: `xml`, `json`, `sentinel`, `api_tool_call`, with `api_tool_call` as the default tool-call format when unset/invalid in the main resolver.
- Must not add a parallel frontend store, localStorage setting, or runtime-specific config path.
- Must respect the bound-backend readiness/cache behavior already implemented in `serverSettingsStore`.
- Changed source implementation files must remain at or below `500` effective non-empty lines. In particular, adding the streaming parser card must not leave `ServerSettingsManager.vue` as a changed oversized file.

## Assumptions

- The desired Basics UX is intentionally a two-state XML override toggle, not a full parser strategy selector.
- `api_tool_call` is the correct canonical saved value for disabling XML from this card because it is the documented default/non-XML provider-native mode.
- Non-XML Advanced values (`json`, `sentinel`) should display as off in the Basics toggle and should remain untouched unless the user explicitly saves a toggle change.
- Changes affect future/new streamed responses/handler construction; active streams are not mutated.

## Risks / Open Questions

- If product later wants Basics to expose all parser strategies, this two-state card may need to become a selector; out of scope for this request.
- Server Settings UI extraction must preserve current endpoint quick setup, Web Search, Advanced raw table, and standalone card behavior while moving ownership into smaller files.
- Existing installations may already have uppercase or invalid custom `AUTOBYTEUS_STREAM_PARSER` values. The card should render uppercase XML as on, invalid values as off, and backend validation should normalize/reject on the next save.
- Persisting `api_tool_call` on disable means Advanced will show an explicit non-XML value after a user saves off; this is intentional and matches the Codex full-access card’s explicit default-value save pattern.

## Requirement-To-Use-Case Coverage

- UC-001 → FR-001, FR-002, FR-010
- UC-002 → FR-003, FR-005, FR-007, FR-008
- UC-003 → FR-004, FR-006, FR-007, FR-008
- UC-004 → FR-003, FR-008, FR-009
- UC-005 → FR-004, FR-009, FR-010

## Acceptance-Criteria-To-Scenario Intent

- Default/off rendering: AC-002, AC-004
- Existing XML rendering: AC-003
- Enable save path: AC-005
- Disable save path: AC-006
- Backend/Advanced validation: AC-007
- Regression and coverage: AC-008, AC-009

## Approval Status

Design-ready from explicit user request; no unresolved product decision blocks architecture review. User-facing copy/name can still be adjusted during implementation if product wording preferences emerge.
