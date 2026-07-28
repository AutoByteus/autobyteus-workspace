# UI/UX Specification — Gemini activation affordance

## Status

`Refined` — narrow intended-behavior supplement; part of the requirements basis.

## Goal

Make the configured/non-active action read as “select/apply this mode” with a plain checkmark, and make the current active state immediately recognizable with visible text.

## Visual decision

- Render a plain `heroicons:check` glyph in the activation button. The existing localized title/ARIA label (`Use this mode: <mode>`) is the authoritative explanation; no circular glyph is used.
- Use the existing blue action color (`text-blue-700`) with the original compact icon-button treatment and existing hover/focus styling. Keep the 44×44px hit target.
- Replace the active row’s radio-like visual marker with a compact visible `Active` badge/text treatment. Use the existing active localization key; keep the active row blue background/left accent and `data-testid`.
- Keep the configured green dot and icon-only edit/configure control unchanged; they communicate status and editing respectively and retain their current accessible labels/tooltips.
- Do not use circular arrows, refresh, shuffle, power, radio, or check-circle symbols; those imply cycling or a competing state marker. The plain checkmark is the only activation glyph.

## States

| State | Visual | Interaction / accessibility |
|---|---|---|
| Configured, non-active, idle | Plain checkmark inside the blue icon button. | Existing title/ARIA label identify `Use this mode: <mode>`; click emits `activate`. |
| Configured, non-active, hover/focus | Existing hover background and focus ring around the icon button. | Keyboard activation unchanged; button remains 44×44px. |
| Configured, non-active, activating | Existing CSS spinner replaces the checkmark; the control remains disabled. | Existing disabled state and live `Activating…` announcement remain. |
| Active | Visible compact `Active` badge/text; no activation button. | Existing active test hook/title and screen-reader status remain. |
| Not configured / unavailable | No activation button; existing Configure/status behavior remains. | No new controls or messaging. |

## Responsive / accessibility constraints

- Keep the icon button at 44×44px.
- Retain the localized accessible name and title because the glyph is decorative and the action text is not visible.
- Keep the explicit button semantics rather than changing the whole row to a selector.
- Ensure `Active` is visible text and not conveyed by color or a circular marker alone.
