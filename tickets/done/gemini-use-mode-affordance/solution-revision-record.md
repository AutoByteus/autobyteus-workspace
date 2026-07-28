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

## SR-003 — Use words for both activation and active state

- **Trigger:** Explicit user-approved direction relayed by `implementation_engineer` after the plain-check implementation round; follow-up screenshot `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_9b6d1ec946e4474e935f7b1804444b71/implementation_engineer_1b4b3fa3c9a4497cab046400834e25be/context_files/ctx_bb7aa67ab473__image.png`.
- **Finding:** The plain check beside AI Studio still reads as selected state even though Vertex Express separately says `Active`. An icon-only action remains ambiguous.
- **Decision:** Supersede SR-002. Use a visible localized `Activate` text button for configured/non-active modes and retain visible `Active` text/badge for the active mode. Add `activate_mode` (`Activate` / `启用`) to the two supported hand-authored locale catalogs. Keep `use_this_mode` unchanged for title/ARIA and recovery copy.
- **Artifacts revised:** `requirements.md`, `investigation-notes.md`, `ui-ux-spec.md`, `design-spec.md`.
- **Implementation impact:** Replace plain-check icon-only UI with a minimum-44px text button; update/remove Iconify test assertions; add locale-key test translations and visible-copy assertions; preserve event, test ID, title/ARIA, spinner/disabled, configured dot, active badge, and all backend/state behavior.
- **Readiness recheck:** `UC-001`–`UC-003` map to `SP-UI-001`, `SP-ACT-001`, `SP-UI-002`, `SP-UI-003`, and `SP-TEST-001`; localization ownership and narrow responsive behavior are explicit; no API/persistence boundary changes; no refactor needed.
- **Remaining risk:** Downstream rendered validation must confirm `Activate` and `Active` remain visually distinct and usable at narrow card widths and in both supported locales.

## SR-004 — Distinguish action and state by color variant

- **Trigger:** `implementation_engineer` Design Impact report after rendered inspection; screenshot `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_9b6d1ec946e4474e935f7b1804444b71/implementation_engineer_1b4b3fa3c9a4497cab046400834e25be/context_files/ctx_9398db22c56c__image.png`.
- **Finding:** Visible words resolved icon ambiguity, but blue `Activate` and blue `Active` still visually resemble the same kind of status/control.
- **Decision:** Keep `Active` as the blue status badge. Style `Activate` as a neutral outlined action (`border-gray-300 bg-white text-gray-700`, hover `bg-gray-50 text-gray-900`, existing focus ring and disabled opacity/cursor). Keep visible words as the semantic signal; color is reinforcing, not sole meaning. Pending `Activating…` uses the neutral action variant with the existing spinner.
- **Artifacts revised:** `requirements.md`, `investigation-notes.md`, `ui-ux-spec.md`, `design-spec.md`.
- **Implementation impact:** Update only the activation button variant/classes and its pending visual styling as needed; preserve `activate_mode` localization, title/ARIA, test ID, event, minimum 44px height, configured dot, Active badge/styling, and all state/API/persistence behavior.
- **Readiness recheck:** `UC-001`–`UC-003` and `BEH-007` map to `SP-UI-001`, `SP-ACT-001`, `SP-UI-002`, `SP-UI-003`, `SP-UI-004`, and `SP-TEST-001`; contrast, focus, disabled, and responsive states are explicit; no API/persistence boundary changes; no refactor needed.
- **Remaining risk:** Downstream rendered validation must confirm neutral outlined `Activate` and blue `Active` remain distinguishable in both supported locales and narrow layouts.

## SR-005 — Approved exploratory green-status / blue-action palette

- **Trigger:** User-authorized exploratory visual iteration and implementation-engineer rendered comparison; selected evidence `/Users/normy/.autobyteus/browser-artifacts/8a0e34-1785233322746.png`.
- **Finding:** The prior neutral outlined `Activate` / blue `Active` treatment separated semantics but did not match the user’s preferred semantic palette. Iteration found that blue clearly reads as an actionable control and emerald clearly reads as current/ready status.
- **Decision:** Canonical target is blue outlined `Activate`: `border-blue-200 bg-blue-50 text-blue-700`, blue hover (`bg-blue-100 text-blue-800`), visible focus ring, and readable disabled/pending treatment. Canonical `Active` badge/text is emerald: `border-emerald-200 bg-emerald-100 text-emerald-700`. Keep visible words as the semantic signal; color reinforces rather than replaces them. Configured green dot and active-row styling remain unchanged.
- **Artifacts revised:** `requirements.md`, `investigation-notes.md`, `ui-ux-spec.md`, `design-spec.md`.
- **Implementation impact:** Candidate source changes are uncommitted on top of `62d5b7dcf`; finalize the activation/active color classes and retain existing localization, test ID, event, accessibility, spinner/disabled, responsive, and state/API/persistence contracts.
- **Readiness recheck:** `UC-001`–`UC-003`, `BEH-007`, and `BEH-008` map to `SP-UI-001`, `SP-ACT-001`, `SP-UI-002`, `SP-UI-003`, `SP-UI-004`, and `SP-TEST-001`; emerald matches existing configured/success palette, blue matches existing interactive palette, contrast/focus/pending/responsive requirements are explicit, and no refactor or API/persistence change is needed.
- **Remaining risk:** Downstream source review and API/E2E/rendered validation should confirm both supported locales and narrow layouts after the candidate is committed.
