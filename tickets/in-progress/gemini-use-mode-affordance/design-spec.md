# Design Spec — Gemini “Use this mode” clarity pass

## Status

`Implementation Ready` (revised after downstream Design Impact)

## Design summary

Make the configured, non-active Gemini mode activation affordance a visible `Use this mode` text button and make the active mode a visible `Active` badge/text. Rendered inspection showed that the initial check-circle replacement still left the action and state visually ambiguous because both used circular visual language. The button remains an explicit activation command; no state, API, persistence, or command-label behavior changes.

## Approved basis

- Requirements: [`requirements.md`](./requirements.md), status `Design-ready` (revised).
- Investigation: [`investigation-notes.md`](./investigation-notes.md).
- Intended-behavior supplement: [`ui-ux-spec.md`](./ui-ux-spec.md), status `Refined`; approval applies with the requirements basis.
- User screenshot: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_9b6d1ec946e4474e935f7b1804444b71/solution_designer_efb56117daf54e35b1a6265173a3aa30/context_files/ctx_ac26f8a835f8__image.png`.
- Downstream rendered-surface screenshot: `/Users/normy/.autobyteus/browser-artifacts/526f15-1785227527287.png`.

## Relevant behavior and production-path map

| Behavior ID / use case | Approved change or preserved outcome | Target production path | Spine IDs |
|---|---|---|---|
| `BEH-001` / `UC-001` recognize activation | Render visible `Use this mode` text; no icon-only activation affordance. Preserve title, ARIA name, test ID, and button semantics. | Settings API Key Management → Gemini setup → `GeminiSetupForm` → `GeminiConfigurationOptionCard` render. | `SP-UI-001` |
| `BEH-001` / `UC-002` activate mode | Preserve click routing and exact option payload; only the visible button presentation changes. | User click → button `@click` → `emit('activate', option)` → existing parent/store/GraphQL activation path. | `SP-UI-001`, `SP-ACT-001` |
| `BEH-002` / `AC-003` pending activation | Preserve spinner substitution, disabled state, and live announcement. | Parent `activating` prop → card `actionsDisabled` → spinner/disabled render. | `SP-UI-002` |
| `BEH-003` / `UC-003` active contrast | Replace the radio-like marker with visible `Active` text/badge and omit the activation button. Preserve active row styling, title, test ID, and accessible status. | `active` prop → visible active badge branch; `v-if="configured && !active"` remains false. | `SP-UI-003` |
| `BEH-006` / `UC-001`, `UC-003` visual distinction | Separate action and state through text rather than similar circular glyphs; configured dot/edit control remain unchanged. | Card status/action cluster → visible activation text or visible active badge. | `SP-UI-001`, `SP-UI-003` |
| `BEH-004` / `AC-002` testable interaction | Extend focused component assertions for visible action/state text without changing event assertions. | `GeminiSetupForm.spec.ts` mount → configured/active rows → DOM and click assertions. | `SP-TEST-001` |

## Data-flow spines

### `SP-UI-001` — Render explicit activation affordance

`GeminiSetupForm.geminiSetup` → `isConfigured(option)` / `active` props → `GeminiConfigurationOptionCard` conditional action → visible localized `Use this mode` text + existing accessible metadata.

### `SP-ACT-001` — Preserve activation command

User click → `GeminiConfigurationOptionCard` button handler → `emit('activate', option)` → existing `GeminiSetupForm` parent handler → existing store mutation/refresh path. This task does not modify nodes after the component boundary.

### `SP-UI-002` — Pending state

Parent `activating` → `actionsDisabled` → spinner branch + disabled button → existing `aria-live` status.

### `SP-UI-003` — Active-state contrast

Parent `active` → visible `Active` badge/text branch and activation-button guard → clearly labeled active state only.

### `SP-TEST-001` — Durable verification

`GeminiSetupForm.spec.ts` → configured non-active/active rows → visible action/state DOM assertions and existing accessible/event assertions.

## Ownership and boundaries

- Governing owner: `GeminiConfigurationOptionCard.vue` owns the activation control and active-state visual presentation.
- Upstream owner: `GeminiSetupForm.vue` owns option iteration and state projection; unchanged.
- Downstream owner: existing provider store/API path owns activation semantics; unchanged and out of scope.
- No new coordinator, shared text-button wrapper, abstraction, or compatibility alias is justified for this local template/style correction.

## File and interface design

### Implementation file

`autobyteus-web/components/settings/providerApiKey/GeminiConfigurationOptionCard.vue`

- Remove the now-unneeded `Icon` import from `@iconify/vue`.
- Change the activation button from fixed `h-11 w-11` icon-only layout to a compact text-button layout with at least `h-11`, horizontal padding, and the existing blue hover/focus/disabled classes.
- Render the existing localized `use_this_mode` text visibly in the idle branch. Keep the activating spinner and render the existing localized `activating` text while pending so the visible control remains understandable.
- Change the active branch from the radio-like circle marker to a compact visible badge/text using the existing localized `active` key. Keep `data-testid`, `title`, and screen-reader status.
- Leave the button condition, title, `aria-label`, `data-testid`, `@click`, and disabled logic unchanged.

### Test file

`autobyteus-web/components/settings/providerApiKey/__tests__/GeminiSetupForm.spec.ts`

- Remove the no-longer-needed `@iconify/vue` test mock.
- Assert that a configured non-active activation button visibly contains `Use this mode` and does not depend on an icon-only child.
- Assert that the active option visibly contains `Active` within its existing active test hook and still renders no activation button.
- Preserve existing click/event, pending-state, and unavailable-option assertions.

### No-change files

- `GeminiSetupForm.vue`: no change.
- `llmProviderConfig` store/composables, GraphQL, generated types, localization, backend, Electron/preload: no change.

## Dependency and encapsulation rules

- Do not add or retain an icon dependency for this action; visible text is the authoritative affordance.
- Retain localized title/ARIA metadata because the action must remain robust to layout and assistive technology.
- Do not encode activation state in the icon alone or infer state from visual output.
- Do not alter activation event or provider state ownership.

## Change sequence

1. Revise `GeminiConfigurationOptionCard.vue` to use a visible activation text button and visible active badge/text.
2. Remove the superseded Iconify check-circle implementation and its test mock/assertions.
3. Extend focused `GeminiSetupForm.spec.ts` coverage for visible action/state text and retain existing interaction assertions.
4. Run focused Vitest plus frontend localization and web-boundary guards; report any environment limitation.

## Removal / decommissioning

- Remove the empty-ring/check-circle idle glyph from the activation branch; no compatibility wrapper or dual-render fallback.
- Remove the radio-like active marker; visible `Active` text is the replacement semantic state.
- No data migration, rollout flag, API deprecation, or persisted-state cleanup.

## Task design health assessment

`No refactor needed.` The current component remains the narrow owner of both the activation control and active-state presentation; its props and emitted event are semantically correct. The broader correction is still a local template/style change, and changing a shared abstraction or runtime boundary would add scope without addressing the demonstrated ambiguity.

## Implementation readiness validation

1. Every approved use case (`UC-001`–`UC-003`) and the revised visual distinction behavior (`BEH-006`) appears in the behavior map and is supported by repository evidence plus the downstream rendered screenshot; no mechanically invented use case was added.
2. Each mapped behavior has a complete target path and the required UI/action/test spine IDs (`SP-UI-001`, `SP-ACT-001`, `SP-UI-002`, `SP-UI-003`, `SP-TEST-001`).
3. The design was revalidated against the available shared workflow principles: behavior-first scope, existing owner reuse, explicit boundaries, no unnecessary refactor, clean replacement, accessibility preservation, responsive text treatment, and proportional verification. The referenced external principles file was unavailable in the installed skill directory and is recorded as a non-blocking environment gap in investigation notes.

**Result: implementation-ready.**
