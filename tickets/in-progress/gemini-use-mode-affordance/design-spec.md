# Design Spec — Gemini “Use this mode” affordance

## Status

`Implementation Ready`

## Design summary

Make the configured, non-active Gemini mode activation affordance use the existing Iconify heroicons convention with `heroicons:check-circle` instead of the current empty circular ring. This is a local presentation-only correction. The button remains an explicit activation command; no state, API, persistence, or label behavior changes.

## Approved basis

- Requirements: [`requirements.md`](./requirements.md), status `Design-ready`.
- Investigation: [`investigation-notes.md`](./investigation-notes.md).
- Intended-behavior supplement: [`ui-ux-spec.md`](./ui-ux-spec.md), status `Refined`; approval applies with the requirements basis.
- User screenshot: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_9b6d1ec946e4474e935f7b1804444b71/solution_designer_efb56117daf54e35b1a6265173a3aa30/context_files/ctx_ac26f8a835f8__image.png`.

## Relevant behavior and production-path map

| Behavior ID / use case | Approved change or preserved outcome | Target production path | Spine IDs |
|---|---|---|---|
| `BEH-001` / `UC-001` recognize activation | Replace only the idle glyph with `heroicons:check-circle`; preserve title, ARIA name, test ID, and button semantics. | Settings API Key Management → Gemini setup → `GeminiSetupForm` → `GeminiConfigurationOptionCard` render. | `SP-UI-001` |
| `BEH-001` / `UC-002` activate mode | Preserve click routing and exact option payload; only the visual child changes. | User click → button `@click` → `emit('activate', option)` → existing parent/store/GraphQL activation path. | `SP-UI-001`, `SP-ACT-001` |
| `BEH-002` / `AC-003` pending activation | Preserve spinner substitution, disabled state, and live announcement. | Parent `activating` prop → card `actionsDisabled` → spinner/disabled render. | `SP-UI-002` |
| `BEH-003` / `UC-003` active contrast | Preserve active marker and omission of the activation button. | `active` prop → active marker branch; `v-if="configured && !active"` remains false. | `SP-UI-003` |
| `BEH-004` / `AC-002` testable interaction | Extend the existing focused component assertion to verify the new symbol without changing event assertions. | `GeminiSetupForm.spec.ts` mount → configured rows → DOM assertion/click assertion. | `SP-TEST-001` |

## Data-flow spines

### `SP-UI-001` — Render activation affordance

`GeminiSetupForm.geminiSetup` → `isConfigured(option)` / `active` props → `GeminiConfigurationOptionCard` conditional action → Iconify check-circle glyph + existing accessible metadata.

### `SP-ACT-001` — Preserve activation command

User click → `GeminiConfigurationOptionCard` button handler → `emit('activate', option)` → existing `GeminiSetupForm` parent handler → existing store mutation/refresh path. This task does not modify nodes after the component boundary.

### `SP-UI-002` — Pending state

Parent `activating` → `actionsDisabled` → spinner branch + disabled button → existing `aria-live` status.

### `SP-UI-003` — Active-state contrast

Parent `active` → active marker branch and activation-button guard → active marker only.

### `SP-TEST-001` — Durable verification

`GeminiSetupForm.spec.ts` → configured non-active row → activation button DOM → icon assertion and existing accessible/event assertions.

## Ownership and boundaries

- Governing owner: `GeminiConfigurationOptionCard.vue` owns the activation control’s visual presentation and accessible metadata.
- Upstream owner: `GeminiSetupForm.vue` owns option iteration and state projection; unchanged.
- Downstream owner: existing provider store/API path owns activation semantics; unchanged and out of scope.
- No new coordinator, shared icon wrapper, abstraction, or compatibility alias is justified for one local glyph substitution.

## File and interface design

### Implementation file

`autobyteus-web/components/settings/providerApiKey/GeminiConfigurationOptionCard.vue`

- Import `Icon` from `@iconify/vue` alongside the existing localization import.
- In the non-activating branch of the existing activation button, render `<Icon icon="heroicons:check-circle" class="h-5 w-5" aria-hidden="true" />`.
- Leave spinner branch unchanged.
- Leave button classes, `title`, `aria-label`, `data-testid`, `@click`, and disabled logic unchanged.

### Test file

`autobyteus-web/components/settings/providerApiKey/__tests__/GeminiSetupForm.spec.ts`

- Mock `@iconify/vue` with a small test component that exposes the requested icon name (following existing repository test patterns where needed).
- Add an assertion that the non-active configured activation button contains the `heroicons:check-circle` icon.
- Preserve existing click/event, active-state, pending-state, and unavailable-option assertions.

### No-change files

- `GeminiSetupForm.vue`: no change.
- `llmProviderConfig` store/composables, GraphQL, generated types, localization, backend, Electron/preload: no change.

## Dependency and encapsulation rules

- Reuse `@iconify/vue` already present in the frontend; do not add a dependency.
- Keep the icon decorative (`aria-hidden`) because the button’s localized title and ARIA label are the accessible name.
- Do not encode activation state in the icon alone or remove the existing textual status/active marker.
- Do not alter activation event or infer state from visual output.

## Change sequence

1. Import the existing `Icon` component in `GeminiConfigurationOptionCard.vue`.
2. Replace the idle empty-ring span with `heroicons:check-circle` at the same 20px visual size.
3. Extend focused `GeminiSetupForm.spec.ts` coverage for icon identity and retain existing interaction assertions.
4. Run focused Vitest plus frontend localization and web-boundary guards; report any environment limitation.

## Removal / decommissioning

- Remove the empty-ring span from the idle branch; no compatibility wrapper or dual-render fallback.
- Do not remove the active marker; it serves a different semantic state.
- No data migration, rollout flag, API deprecation, or persisted-state cleanup.

## Task design health assessment

`No refactor needed.` The current component is the narrow owner of the button, its input props and emitted event are already semantically correct, Iconify is an established frontend dependency/convention, and the requested behavior is presentation-only. Changing a shared abstraction or runtime boundary would add scope without addressing a demonstrated issue.

## Implementation readiness validation

1. Every approved use case (`UC-001`–`UC-003`) appears in the behavior map and is supported by repository evidence; no mechanically invented use case was added.
2. Each mapped behavior has a complete target path and the required UI/action/test spine IDs (`SP-UI-001`, `SP-ACT-001`, `SP-UI-002`, `SP-UI-003`, `SP-TEST-001`).
3. The design was revalidated against the available shared workflow principles: behavior-first scope, existing owner reuse, explicit boundaries, no unnecessary refactor, clean replacement, accessibility preservation, and proportional verification. The referenced external principles file was unavailable in the installed skill directory and is recorded as a non-blocking environment gap in investigation notes.

**Result: implementation-ready.**

