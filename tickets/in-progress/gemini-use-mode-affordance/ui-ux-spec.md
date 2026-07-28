# UI/UX Specification — Gemini activation affordance

## Status

`Refined` — narrow intended-behavior supplement; part of the requirements basis.

## Goal

Make the configured/non-active action read as “select/apply this mode,” and make the current active state immediately recognizable without comparing circular glyphs.

## Visual decision

- Render the existing localized `Use this mode` label visibly inside the activation button. The visible text, not an icon, is the authoritative affordance.
- Use the existing blue action color (`text-blue-700`) with a compact text-button treatment and existing hover/focus styling. The control may expand beyond the former icon-only width.
- Replace the active row’s radio-like visual marker with a compact visible `Active` badge/text treatment. Use the existing active localization key; keep the active row blue background/left accent and `data-testid`.
- Keep the configured green dot and icon-only edit/configure control unchanged; they communicate status and editing respectively and retain their current accessible labels/tooltips.
- Do not use circular arrows, refresh, shuffle, power, or check-circle symbols as the primary activation/state explanation; these were the source of the ambiguity observed in the rendered surface.

## States

| State | Visual | Interaction / accessibility |
|---|---|---|
| Configured, non-active, idle | Visible `Use this mode` text in the blue action button; no circular glyph required. | Existing title/ARIA label identify `Use this mode: <mode>`; click emits `activate`. |
| Configured, non-active, hover/focus | Existing hover background and focus ring around the text button. | Keyboard activation unchanged; button remains at least 44px high. |
| Configured, non-active, activating | Existing CSS spinner replaces the action text, or appears with the existing busy treatment; the control remains disabled and does not imply another action. | Existing disabled state and live `Activating…` announcement remain. |
| Active | Visible compact `Active` badge/text; no activation button. | Existing active test hook/title and screen-reader status remain. |
| Not configured / unavailable | No activation button; existing Configure/status behavior remains. | No new controls or messaging. |

## Responsive / accessibility constraints

- Keep minimum button height and spacing sufficient for a 44px touch target; the visible text button may be wider than 44px.
- Retain the localized accessible name and title even though the action text is visible.
- Keep the explicit button semantics rather than changing the whole row to a selector.
- Ensure `Active` is visible text and not conveyed by color or a circular marker alone.
