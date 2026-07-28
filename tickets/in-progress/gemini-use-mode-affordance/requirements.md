# Requirements — Gemini “Use this mode” affordance

## Status

`Design-ready` — revised after the user-approved follow-up direction: retain a visible `Active` state and use a visible localized `Activate` action for non-active configured modes.

## Request

In Settings → API Key Management → Gemini, icon-only activation controls are ambiguous even when rendered as a plain checkmark because users can read the check as a selected state. Separate action and state with words: show a visible localized `Activate` action for configured, non-active modes and a visible `Active` badge/text for the current mode.

## Scope

- In scope: the configured, non-active Gemini option action in `GeminiConfigurationOptionCard.vue`, its visible localized `Activate` label, accessible naming/tooltip, and durable component tests.
- In scope: the active Gemini option’s visible `Active` state presentation, while retaining its existing active-state test hook and semantics.
- In scope: visual states for idle, hover/focus, disabled, and activating, including responsive wrapping of the visible action label.
- Out of scope: Gemini setup persistence, GraphQL contracts, active-mode rules, save actions, or any unrelated provider controls.

## Use cases

| Use case ID | User goal | Expected outcome |
|---|---|---|
| `UC-001` | Recognize how to make a configured Gemini mode active | The non-active configured row presents a visible localized `Activate` action, while the current row presents visible `Active` state text. |
| `UC-002` | Activate a configured non-active mode | Clicking the affordance emits the same `activate` event for the same mode and preserves pending/disabled behavior. |
| `UC-003` | Understand the active mode state | The active row shows a visible `Active` badge/text and does not show a redundant activation action. |

## Behavior basis

| Behavior ID | Current supported behavior | Desired behavior | Must remain unchanged |
|---|---|---|---|
| `BEH-001` | `GeminiConfigurationOptionCard` renders an icon-only activation button only when `configured && !active`; its title/ARIA label are localized `Use this mode: <option>`, and click emits `activate`. | Render a visible localized `Activate` label inside the button. Retain the existing title/ARIA name and event. | Configured/active distinction, operation serialization, and test ID. |
| `BEH-002` | While activating, the symbol becomes a spinner; disabled states use existing opacity/cursor styles. | Keep the spinner, focus ring, disabled behavior, and 44px hit area. | No change to runtime or persistence. |
| `BEH-003` | Active rows show a blue radio-like marker and no activate button; the active text alternative is screen-reader-only. | Replace the radio-like visual marker with a clearly labeled visible `Active` badge/text. Keep the active test hook, title, and accessible status. | Exactly one explicit active mode; active row styling and left accent remain. |
| `BEH-006` | The configured status dot, activation control, active marker, and edit control all use compact icon-heavy presentation. | Use visible `Activate` action text and visible `Active` state text; retain the compact configured dot and icon-only edit control, whose meanings are established by their labels/tooltips. | Provider list and all non-Gemini controls remain unchanged. |

## Requirements

| Requirement ID | Requirement |
|---|---|
| `REQ-001` | The idle configured, non-active control must render a visible localized `Activate` action label. Add the localized key `settings.components.settings.ProviderAPIKeyManager.activate_mode` with English value `Activate` and Chinese value `启用`. The existing `use_this_mode` key remains for title/ARIA and recovery copy. |
| `REQ-002` | The activation control must remain a real button with the existing title/ARIA name (`Use this mode: <option>`), `data-testid`, event payload, disabled semantics, focus treatment, spinner, and minimum 44px height. Its width may expand to fit the visible action label and must remain usable at narrow widths. |
| `REQ-003` | The active mode must show visible localized `Active` text in a compact badge or text treatment. The existing active `data-testid`, title, active row background/left accent, and screen-reader status must remain available. The active row must not show an activation button. |
| `REQ-004` | Keep the configured/not-configured status semantics and edit/configure control behavior unchanged. |
| `REQ-005` | No API, state, persistence, or non-Gemini UI behavior may change. Existing localization keys may be reused; add no new copy unless repository localization requires it. |

## Acceptance criteria

| Acceptance criteria ID | Verifiable outcome | Scenario intent |
|---|---|---|
| `AC-001` | For every configured non-active option, the activation button visibly contains the localized `Activate` label and does not depend on an icon to communicate the action. | `GeminiSetupForm` configured non-active option render. |
| `AC-002` | The button retains `aria-label="Use this mode: <option>"`, the localized title, `data-testid="gemini-activate-<option>"`, and emits the same option on click. | Existing activation interaction. |
| `AC-003` | When `activating` is true, the spinner remains rendered and the button remains disabled; no idle activation glyph is shown during the operation. | Pending activation. |
| `AC-004` | Active options visibly show localized `Active` text, retain the active test hook/title and active row styling, and show no activation button; other status/action states remain unchanged. | Active/non-active contrast. |
| `AC-005` | Focus/hover styling, keyboard focus, visible action text, minimum button hit area, and active badge remain accessible and usable at wide and narrow card widths. | Keyboard/focus and responsive control regression. |
| `AC-006` | Focused Nuxt/Vitest component tests pass, and repository localization/web-boundary guards pass if required by the changed files. | Local implementation validation. |

## Persisted data

`Directly Usable — No Migration.` This is presentation-only; no persisted data or contracts change.

## Approval / readiness

The user’s follow-up authorizes this revised clarity direction: visible `Activate` action plus visible `Active` state. The requirements basis is refined from repository evidence, downstream rendered-surface inspection, and the user-approved design correction in the investigation notes; the revised design spec is implementation-ready.
