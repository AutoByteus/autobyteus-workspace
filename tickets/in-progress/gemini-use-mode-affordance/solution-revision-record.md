# Solution Revision Record

## SR-001 — Broaden activation affordance into a clarity pass

- **Trigger:** `implementation_engineer` Design Impact / Requirement Gap report after live Settings inspection; screenshot `/Users/normy/.autobyteus/browser-artifacts/526f15-1785227527287.png`; initial implementation `a00dc0ee2`.
- **Finding:** The initial check-circle replacement improved the empty ring but left the action and state visually ambiguous because the non-active action still used a circle and the active state used a radio-like circle. The icon-only contract required users to infer meaning from tooltip/ARIA text.
- **Decision:** Revise intended behavior from icon substitution to explicit visible text. Non-active configured rows show the existing localized `Use this mode` label in a text button. Active rows show visible `Active` text/badge. Keep configured dot, edit control, action event, accessible labels, test IDs, pending state, active row accent/background, and all backend/state behavior unchanged.
- **Artifacts revised:** `requirements.md`, `investigation-notes.md`, `ui-ux-spec.md`, `design-spec.md`.
- **Implementation impact:** Supersedes the initial Iconify check-circle change. Remove the Iconify import/test mock and update `GeminiConfigurationOptionCard.vue` plus focused `GeminiSetupForm.spec.ts`. The implementation branch must re-enter source review after this corrected package.
- **Readiness recheck:** All use cases map to `SP-UI-001`, `SP-ACT-001`, `SP-UI-002`, `SP-UI-003`, and `SP-TEST-001`; no API/persistence boundary changes; no refactor needed; responsive and accessibility requirements now explicitly cover visible activation/state text.
- **Remaining risk:** Final text-button wrapping and badge treatment require downstream browser/rendered validation at wide and narrow card widths.
