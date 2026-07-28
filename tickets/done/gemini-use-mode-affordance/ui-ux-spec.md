# UI/UX Specification — Gemini activation affordance

## Status

`Refined` — narrow intended-behavior supplement; part of the requirements basis.

## Goal

Make the configured/non-active action read as “select/apply this mode” with visible `Activate` text, and make the current active state immediately recognizable with visible `Active` text.

## Visual decision

- Render the localized `activate_mode` text (`Activate` in English, `启用` in Chinese) visibly in the activation button. The existing localized title/ARIA label (`Use this mode: <mode>`) remains the accessible action contract.
- Style `Active` as an emerald status badge: `border-emerald-200 bg-emerald-100 text-emerald-700`. This fits the existing configured-dot and success/ready palette.
- Style `Activate` as a blue outlined action: `border-blue-200 bg-blue-50 text-blue-700`; hover uses `bg-blue-100 text-blue-800`; retain the visible `focus:ring-blue-500` ring and disabled opacity/cursor treatment. The blue focus ring reinforces keyboard focus, not current state.
- Keep a minimum 44px height; the button may widen to fit the label.
- Replace the active row’s radio-like visual marker with a compact visible `Active` badge/text treatment. Use the existing active localization key; keep the active row blue background/left accent and `data-testid`.
- Keep the configured green dot and icon-only edit/configure control unchanged; they communicate status and editing respectively and retain their current accessible labels/tooltips.
- Do not use circular arrows, refresh, shuffle, power, radio, check-circle, or plain checkmark symbols as the primary activation explanation; they can be interpreted as current selection rather than an action.

## States

| State | Visual | Interaction / accessibility |
|---|---|---|
| Configured, non-active, idle | Visible localized `Activate` text inside the blue action button. | Existing title/ARIA label identify `Use this mode: <mode>`; click emits `activate`. |
| Configured, non-active, hover/focus | Existing hover background and focus ring around the text button. | Keyboard activation unchanged; button remains at least 44px high and can widen within the row. |
| Configured, non-active, activating | Existing CSS spinner plus localized `Activating…` text; the control remains disabled. | Existing disabled state and live announcement remain. |
| Active | Visible compact `Active` badge/text; no activation button. | Existing active test hook/title and screen-reader status remain. |
| Not configured / unavailable | No activation button; existing Configure/status behavior remains. | No new controls or messaging. |

## Responsive / accessibility constraints

- Keep the visible text button at a minimum 44px height and provide enough horizontal padding for the label.
- Retain the localized accessible name and title even though the action text is visible, so tooltip and screen-reader wording remain stable.
- Keep the explicit button semantics rather than changing the whole row to a selector.
- Ensure `Active` is visible text and not conveyed by color or a circular marker alone.

## Color and contrast decision

| Meaning | Idle treatment | Hover/focus | Pending/disabled |
|---|---|---|---|
| Current state (`Active`) | Emerald badge: `border-emerald-200 bg-emerald-100 text-emerald-700`. | No action hover; active row styling remains. | State badge remains visible. |
| Available action (`Activate`) | Blue outlined button: `border-blue-200 bg-blue-50 text-blue-700`. | `bg-blue-100 text-blue-800`; retain the visible `focus:ring-blue-500` ring. | Same blue action variant with disabled opacity/cursor treatment; spinner and `Activating…` remain visible. |

The words `Active` and `Activate` remain visible, so the distinction does not depend on color. `text-emerald-700` on `bg-emerald-100` and `text-blue-700` on `bg-blue-50`/white are the intended contrast-safe shades; focus must remain visibly outlined and disabled/pending states must remain readable.

## Localization decision

- Add `settings.components.settings.ProviderAPIKeyManager.activate_mode` to the supported English and Simplified Chinese settings catalogs: `Activate` / `启用`.
- Keep `settings.components.settings.ProviderAPIKeyManager.use_this_mode` unchanged for the button title, ARIA label construction, and existing partial-activation recovery message. Do not overload that longer phrase as the visible compact action label.
