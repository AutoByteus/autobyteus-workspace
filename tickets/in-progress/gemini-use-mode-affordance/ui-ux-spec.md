# UI/UX Specification — Gemini activation affordance

## Status

`Refined` — narrow intended-behavior supplement; part of the requirements basis.

## Goal

Make the icon-only action for a configured, non-active Gemini mode read as “select/apply this mode,” not “cycle/reload.”

## Visual decision

- Replace the empty circular ring with the outline `heroicons:check-circle` glyph.
- Use the existing blue action color (`text-blue-700`) and button container unchanged.
- Keep the active row’s filled radio-like marker unchanged. The visual contrast is intentional: check-circle means “select this,” while the blue filled marker means “currently active.”
- Do not use circular arrows, refresh, shuffle, or power symbols; those imply cycling, reloading, randomization, or global on/off rather than choosing one configured mode.

## States

| State | Visual | Interaction / accessibility |
|---|---|---|
| Configured, non-active, idle | Blue outline check-circle inside current 44×44 button. | Existing title/ARIA label identify `Use this mode: <mode>`; click emits `activate`. |
| Configured, non-active, hover/focus | Existing hover background and focus ring. | Keyboard activation unchanged. |
| Configured, non-active, activating | Existing CSS spinner replaces the icon. | Existing disabled state and live `Activating…` announcement remain. |
| Active | Existing active marker; no activation button. | Existing `Active` text alternative remains. |
| Not configured / unavailable | No activation button; existing Configure/status behavior remains. | No new controls or messaging. |

## Responsive / accessibility constraints

- Keep button size and spacing unchanged; minimum hit target remains 44×44px.
- Keep the icon `aria-hidden` and retain the localized text alternatives.
- Keep the explicit button semantics rather than changing the whole row to a selector.

