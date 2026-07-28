# Solution Revision Record

## SR-001 — Broaden activation affordance into a clarity pass

- **Trigger:** `implementation_engineer` Design Impact / Requirement Gap report after live Settings inspection; screenshot `/Users/normy/.autobyteus/browser-artifacts/526f15-1785227527287.png`; initial implementation `a00dc0ee2`.
- **Finding:** The initial check-circle replacement improved the empty ring but left the action and state visually ambiguous because the non-active action still used a circle and the active state used a radio-like circle. The icon-only contract required users to infer meaning from tooltip/ARIA text.
- **Decision:** Revise intended behavior from icon substitution to explicit visible text. Non-active configured rows show the existing localized `Use this mode` label in a text button. Active rows show visible `Active` text/badge. Keep configured dot, edit control, action event, accessible labels, test IDs, pending state, active row accent/background, and all backend/state behavior unchanged.
- **Artifacts revised:** `requirements.md`, `investigation-notes.md`, `ui-ux-spec.md`, `design-spec.md`.
- **Implementation impact:** Supersedes the initial Iconify check-circle change. Remove the Iconify import/test mock and update `GeminiConfigurationOptionCard.vue` plus focused `GeminiSetupForm.spec.ts`. The implementation branch must re-enter source review after this corrected package.
- **Readiness recheck:** All use cases map to `SP-UI-001`, `SP-ACT-001`, `SP-UI-002`, `SP-UI-003`, and `SP-TEST-001`; no API/persistence boundary changes; no refactor needed; responsive and accessibility requirements now explicitly cover visible activation/state text.
- **Remaining risk:** Final text-button wrapping and badge treatment require downstream browser/rendered validation at wide and narrow card widths.

## SR-002 — Restore plain check icon for activation

- **Trigger:** User-approved follow-up direction relayed by `implementation_engineer` after the visible-text implementation round.
- **Finding:** The user prefers the active state to remain explicit as visible `Active` text, while the non-active action returns to a compact icon-only control. The circular check/radio visual language is rejected; a plain checkmark is preferred for apply/select.
- **Decision:** Use Iconify `heroicons:check` in the configured/non-active icon-only activation button. Restore the original 44×44px button geometry and keep the existing `Use this mode: <option>` title/ARIA name. Retain the visible `Active` badge/text from SR-001. No circular activation glyph, active radio marker, visible action text, or backend/state change.
- **Artifacts revised:** `requirements.md`, `investigation-notes.md`, `ui-ux-spec.md`, `design-spec.md`.
- **Implementation impact:** Supersedes the temporary visible-text activation part of SR-001. Retain the Iconify test mock, change the expected icon from `heroicons:check-circle` to `heroicons:check`, remove visible activation text, restore `h-11 w-11`, and retain active badge assertions.
- **Readiness recheck:** `UC-001`–`UC-003` map to `SP-UI-001`, `SP-ACT-001`, `SP-UI-002`, `SP-UI-003`, and `SP-TEST-001`; active state is visibly labeled; icon-only control retains accessible text alternatives; no API/persistence boundary changes; no refactor needed.
- **Remaining risk:** Downstream rendered validation must confirm the plain checkmark is visually distinct from the visible Active badge and the compact icon button remains discoverable through its title/ARIA label.
