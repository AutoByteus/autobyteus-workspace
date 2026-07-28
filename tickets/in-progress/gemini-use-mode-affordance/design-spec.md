# Design Spec — Gemini “Use this mode” clarity pass

## Status

`Implementation Ready` (revised after downstream Design Impact)

## Design summary

Make the configured, non-active Gemini mode activation affordance a visible localized `Activate` text button and keep the active mode as a visible `Active` badge/text. Rendered inspection showed that icon-only check, check-circle, and radio-like markers can all be interpreted as selection state. Words explicitly separate action from state. The button remains an explicit activation command; no state, API, persistence, or activation event behavior changes.

## Approved basis

- Requirements: [`requirements.md`](./requirements.md), status `Design-ready` (revised).
- Investigation: [`investigation-notes.md`](./investigation-notes.md).
- Intended-behavior supplement: [`ui-ux-spec.md`](./ui-ux-spec.md), status `Refined`; approval applies with the requirements basis.
- User screenshot: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_9b6d1ec946e4474e935f7b1804444b71/solution_designer_efb56117daf54e35b1a6265173a3aa30/context_files/ctx_ac26f8a835f8__image.png`.
- Downstream rendered-surface screenshot: `/Users/normy/.autobyteus/browser-artifacts/526f15-1785227527287.png`.
- Follow-up rendered evidence: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_9b6d1ec946e4474e935f7b1804444b71/implementation_engineer_1b4b3fa3c9a4497cab046400834e25be/context_files/ctx_bb7aa67ab473__image.png`.

## Relevant behavior and production-path map

| Behavior ID / use case | Approved change or preserved outcome | Target production path | Spine IDs |
|---|---|---|---|
| `BEH-001` / `UC-001` recognize activation | Render visible localized `Activate` text; no icon-only activation affordance. Preserve title, ARIA name, test ID, and button semantics. | Settings API Key Management → Gemini setup → `GeminiSetupForm` → `GeminiConfigurationOptionCard` render. | `SP-UI-001` |
| `BEH-001` / `UC-002` activate mode | Preserve click routing and exact option payload; only the button presentation changes. | User click → button `@click` → `emit('activate', option)` → existing parent/store/GraphQL activation path. | `SP-UI-001`, `SP-ACT-001` |
| `BEH-002` / `AC-003` pending activation | Preserve spinner substitution, disabled state, and live announcement; show localized `Activating…` text within the pending button if present in the current implementation. | Parent `activating` prop → card `actionsDisabled` → spinner/text/disabled render. | `SP-UI-002` |
| `BEH-003` / `UC-003` active contrast | Keep visible `Active` text/badge and omit the activation button. Preserve active row styling, title, test ID, and accessible status. | `active` prop → visible active badge branch; `v-if="configured && !active"` remains false. | `SP-UI-003` |
| `BEH-006` / `UC-001`, `UC-003` visual distinction | Separate action and state through visible `Activate` versus visible `Active`; configured dot/edit control remain unchanged. | Card status/action cluster → visible activation text button or visible active badge. | `SP-UI-001`, `SP-UI-003` |
| `BEH-004` / `AC-002` testable interaction | Extend focused component assertions for localized action/state text without changing event assertions. | `GeminiSetupForm.spec.ts` mount → configured/active rows → DOM and click assertions. | `SP-TEST-001` |

## Data-flow spines

### `SP-UI-001` — Render explicit activation affordance

`GeminiSetupForm.geminiSetup` → `isConfigured(option)` / `active` props → `GeminiConfigurationOptionCard` conditional action → localized `activate_mode` text + existing accessible metadata.

### `SP-ACT-001` — Preserve activation command

User click → `GeminiConfigurationOptionCard` button handler → `emit('activate', option)` → existing `GeminiSetupForm` parent handler → existing store mutation/refresh path. This task does not modify nodes after the component boundary.

### `SP-UI-002` — Pending state

Parent `activating` → `actionsDisabled` → spinner + localized `activating` text + disabled button → existing `aria-live` status.

### `SP-UI-003` — Active-state contrast

Parent `active` → visible `Active` badge/text branch and activation-button guard → clearly labeled active state only.

### `SP-TEST-001` — Durable verification

`GeminiSetupForm.spec.ts` → configured non-active/active rows → visible action/state DOM assertions and existing accessible/event assertions.

## Ownership and boundaries

- Governing owner: `GeminiConfigurationOptionCard.vue` owns the activation control and active-state visual presentation.
- Upstream owner: `GeminiSetupForm.vue` owns option iteration and state projection; unchanged.
- Downstream owner: existing provider store/API path owns activation semantics; unchanged and out of scope.
- Localization owners: `autobyteus-web/localization/messages/en/settings.ts` and `autobyteus-web/localization/messages/zh-CN/settings.ts` own the new visible action copy; generated catalogs remain derived/merged.
- No new coordinator, shared button wrapper, abstraction, or compatibility alias is justified for this local template/style and copy change.

## File and interface design

### Implementation file

`autobyteus-web/components/settings/providerApiKey/GeminiConfigurationOptionCard.vue`

- Change the activation button from icon-only `h-11 w-11` to a compact text-button layout with minimum `h-11`, horizontal padding, and existing blue hover/focus/disabled classes.
- Render `t('settings.components.settings.ProviderAPIKeyManager.activate_mode')` visibly in the idle branch.
- Keep the activating spinner and render existing localized `activating` text while pending so the visible control remains understandable.
- Keep active `Active` badge/text branch, configured dot, edit/configure control, title, ARIA label, data-testid, click event, and disabled logic unchanged.
- Do not add a new icon or alter any parent/store/API code.

### Localization files

- `autobyteus-web/localization/messages/en/settings.ts`: add `settings.components.settings.ProviderAPIKeyManager.activate_mode: 'Activate'`.
- `autobyteus-web/localization/messages/zh-CN/settings.ts`: add the corresponding localized value `启用`.
- Keep `use_this_mode` unchanged for title/ARIA construction and existing recovery copy. The new key is specifically the concise visible action label.

### Test file

`autobyteus-web/components/settings/providerApiKey/__tests__/GeminiSetupForm.spec.ts`

- Remove/update the obsolete `@iconify/vue` check-icon expectation as appropriate; no activation icon assertion remains authoritative.
- Add `activate_mode` to test translations and assert configured non-active activation buttons visibly contain `Activate`.
- Assert active options visibly contain `Active` within their existing active test hook and still render no activation button.
- Preserve existing click/event, pending-state, unavailable-option, accessibility-label, and active-state assertions.

### No-change files

- `GeminiSetupForm.vue`: no change.
- `llmProviderConfig` store/composables, GraphQL, generated types, backend, Electron/preload: no change.

## Dependency and encapsulation rules

- Do not add an icon dependency; visible localized text is the authoritative affordance.
- Retain localized title/ARIA metadata even though the action text is visible, preserving the existing command contract.
- Keep active state as visible text, not color alone.
- Do not alter activation event or provider state ownership.

## Responsive and accessibility treatment

- The activation button remains a real button with a minimum 44px height, horizontal padding, visible focus ring, and enough width for `Activate` / `启用`.
- At narrow card widths, the row may wrap; the mode label, status, action, and edit control must remain readable and independently targetable.
- The active badge remains visible text and retains its existing title/screen-reader status.
- `Activate` is visible, while `Use this mode: <option>` remains the accessible name and tooltip; this is intentional and preserves the precise action context for assistive technology.

## Change sequence

1. Add the new `activate_mode` key to both supported hand-authored locale catalogs.
2. Replace the superseded plain-check icon-only activation branch with a visible localized `Activate` text button and retain visible active badge/text.
3. Update focused `GeminiSetupForm.spec.ts` translations/assertions and retain interaction/state coverage.
4. Run focused Vitest plus frontend localization and web-boundary guards; report any environment limitation.

## Removal / decommissioning

- Remove the plain-check/check-circle/empty-ring activation glyph from the activation branch; no compatibility wrapper or dual-render fallback.
- Retain the visible `Active` badge; it is the state indicator, not an activation control.
- No data migration, rollout flag, API deprecation, or persisted-state cleanup.

## Task design health assessment

`No refactor needed.` The current component remains the narrow owner of both the activation control and active-state presentation; its props and emitted event are semantically correct. The revised correction is still a local template/style/copy change, and changing a shared abstraction or runtime boundary would add scope without addressing the demonstrated ambiguity.

## Implementation readiness validation

1. Every approved use case (`UC-001`–`UC-003`) and visual distinction behavior (`BEH-006`) appears in the behavior map and is supported by repository evidence, downstream rendered inspection, and the user-approved follow-up direction; no mechanically invented use case was added.
2. Each mapped behavior has a complete target path and the required UI/action/test spine IDs (`SP-UI-001`, `SP-ACT-001`, `SP-UI-002`, `SP-UI-003`, `SP-TEST-001`).
3. The design was revalidated against the available shared workflow principles: behavior-first scope, existing owner reuse, explicit boundaries, no unnecessary refactor, clean replacement, accessibility preservation, responsive text treatment, localized copy ownership, and proportional verification. The referenced external principles file was unavailable in the installed skill directory and is recorded as a non-blocking environment gap in investigation notes.

**Result: implementation-ready.**
