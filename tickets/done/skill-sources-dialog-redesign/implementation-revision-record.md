# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates and explains each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer / `handoff-to-implementation.md` / initial | N/A | `Initial Baseline` | SR-002, SR-003; ARCH-REV `N/A`; CRR `N/A`; API-REV `N/A`; DR `N/A` | Implementation complete; ready for direct API/E2E validation |
| IR-002 | Code Reviewer failure-origin review / `code-review-report.md` / API/E2E round 1 | CR-001 (= API/E2E F-001; J-10, J-13) | `Local Fix` | SR-003; CRR-001; API-REV-001; ARCH-REV `N/A`; DR `N/A` | Focus lifecycle fixed in `SkillSourcesModal.vue`; ready for API/E2E round 2 |

## Revision Entries

### IR-001 — Skill sources dialog redesign, initial implementation (SR-003 text-only chips included)

- Triggering role, report path, and round: Solution Designer, `tickets/in-progress/skill-sources-dialog-redesign/handoff-to-implementation.md`, initial round.
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: the redesigned popup is implemented per SR-003. Local checks pass, and the package is ready for direct API/E2E validation.
- Related solution revision IDs:
  - SR-002: the approved baseline.
  - SR-003: the row chips are text-only. During this round, the user asked to remove the chip icon. I raised a Requirement Gap with the Solution Designer, which recorded the change as SR-003.
- Related architecture-review revision IDs: N/A (direct route).
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: it is the initial implementation handoff.
- Approved behavior or requirement IDs affected:
  - BEH-001..BEH-007;
  - REQ-001..REQ-010;
  - AC-001..AC-007 (AC-008 is the user's verification).
- Implementation delta:
  - Ported `SkillSourcesModal.vue`, `SkillSourceRow.vue`, `utils/skills/skillSourceDisplay.ts` and the new en/zh-CN strings from design commit `6810fc8`. No `prototype/**` or design `apolloClient` code was ported.
  - SR-003: removed the `heroicons:arrow-up-circle` and `heroicons:arrow-path` icons from the Update and Retry removal chips, and the now-unneeded chip `gap`.
  - Removed 44 unused localization key entries (12 in each `skills.ts`, 10 in each `skills.generated.ts`). Each removal was confirmed by re-grepping, with the dynamic `skills.sources.status.*` construction checked; details are in the handoff.
  - Rewrote `SkillSourcesModal.spec.ts`.
  - Added `SkillSourceRow.spec.ts` and `utils/skills/__tests__/skillSourceDisplay.spec.ts`.
  - Updated the selectors of `tests/e2e/github-skill-sources-probe.mjs` for the new markup.
  - Updated `docs/skills.md`.
- Changed files or areas: `autobyteus-web/components/skills/*`, `autobyteus-web/utils/skills/*`, `autobyteus-web/localization/messages/{en,zh-CN}/skills{,.generated}.ts`, `autobyteus-web/tests/e2e/github-skill-sources-probe.mjs` and `autobyteus-web/docs/skills.md`.
- Local validation and result:
  - Skills, localization and store tests: 142/142 pass.
  - Localization guard and audit pass.
  - Changed files have 0 type errors.
  - GitHub skill sources probe: 8/8 pass.
  - Rendered check: R01–R08 pass (see the handoff).
- Next recipient or routing: `/software_engineering_team/api_e2e_engineer`, per the direct API/E2E rule.
- Remaining limitations or risks:
  - The native Browse… dialog was not exercised in the desktop app; the Browse… layout was rendered with a stubbed IPC.
  - The Electron shell was not run.
  - Both are covered by API/E2E and the user's verification (AC-008).

### IR-002 — Keep focus, Esc and the Tab cycle in the dialog after confirmations and operations (CR-001)

- Triggering role, report path, and round: Code Reviewer failure-origin review, `code-review-report.md`, CRR-001, after API/E2E round 1 (API-REV-001).
- Triggering finding IDs: CR-001 (= API/E2E F-001; cases J-10 and J-13).
- Classification: `Local Fix`. The route is unchanged: Medium/Low, direct to API/E2E.
- Prior authoritative result: IR-001. Its Esc and Tab trap were bound only to the panel `<section>`. Focus fell out of the panel in three cases:
  - after a confirmation (the panel becomes `inert`);
  - after a confirmed remove (the row is removed);
  - after a keyboard add or check (`:disabled="busy"`).
  Nothing returned it, so Tab reached the sidebar behind the `aria-modal` dialog and Esc did nothing.
- Current authoritative result: when nothing else is open, focus that leaves the panel is brought back in, and Esc and the Tab cycle work regardless of where focus is. Both stay inactive while a confirmation or the skill-name conflict dialog is open.
- Related solution revision IDs: SR-003 (unchanged).
- Related architecture-review revision IDs: N/A.
- Related code-review revision IDs: CRR-001.
- Related API/E2E revision IDs: API-REV-001.
- Related delivery revision IDs: N/A.
- Why this implementation revision is recorded: CR-001 found that REQ-008, AC-007 and QR-001 were violated in normal keyboard flows.
- Approved behavior or requirement IDs affected: BEH-007, REQ-008, AC-007, QR-001. Approved behavior is unchanged; the fix restores the required behavior.
- Implementation delta (`autobyteus-web/components/skills/SkillSourcesModal.vue` only):
  - `handleKeydown` moved from the panel's `@keydown` to a `document` listener, added on mount and removed on unmount.
    - It does nothing while `overlayOpen`, that is, while a confirmation is open (the panel is inert and Esc stays ignored, per AC-007) or while `skillNames.conflicts` is non-empty (the shared conflict dialog handles its own Esc on `window`).
    - Otherwise Esc closes the popup. Tab and Shift+Tab with focus outside the panel move to the first or last control in the panel; the existing wrap-around is kept.
  - A `watch` on "blocked" (`overlayOpen || busy`):
    - When a block starts, before the DOM update, it records the focused control inside the panel.
    - When the block ends, after `nextTick`, and only if focus is outside the panel, it focuses that control if it is still connected, in the panel and enabled. Otherwise it focuses the add input, and failing that the panel.
  - "Outside the panel", rather than "on `<body>`", is deliberate. In Chrome, `ConfirmationModal`'s `<Transition name="modal-fade">` keeps focus on the fading Cancel/confirm button for 0.3 s after the confirmation closes. A first attempt that checked only for `<body>` still failed J-10/J-13 in the real browser (`implementation-evidence/ir-002-dialog-journey-run1/`).
  - `ConfirmationModal`, the stores and the design are unchanged, so no Design Impact.
- Changed files or areas:
  - `autobyteus-web/components/skills/SkillSourcesModal.vue` (+41/−11; 253 non-empty lines);
  - `autobyteus-web/components/skills/SkillSourcesModal.spec.ts` (+7 tests, 41 total).
- Durable test additions. Clicks in VTU don't move focus, so the tests focus the control first. They then reproduce the browser's focus loss: a blur to `<body>`, or focus on an element outside the panel that stands in for the fading confirmation.
  - After Cancel, focus returns to the trash button. Esc is ignored while the confirmation is open and closes the popup after Cancel.
  - After a confirmed remove whose row is gone, focus moves to the add input, and Esc closes.
  - After an Enter-add that disabled the input, focus returns to the input, and Esc closes.
  - When Try again disappears after the check, focus falls back to the add input.
  - A stray Tab or Shift+Tab, from `<body>` or from an element outside the panel, lands on Close or Done, and a stray Esc closes.
  - While a skill-name conflict is open, Esc and Tab are left alone; when it is dismissed, focus returns to the input.
  - The document listener is removed on unmount.
- Local validation and result:
  - Web tests (`components/skills utils/skills stores/__tests__/skill{Store,SourcesStore}.spec.ts localization`): 149/149 pass.
  - Mutation checks, each reverted:
    - no restore → 5 tests fail;
    - listener only on the panel → 1 test fails;
    - no overlay guard → 3 tests fail;
    - the `<body>`-only stray check → 3 tests fail.
  - Localization guard and audit pass. 0 type errors in the touched files.
  - The API/E2E dialog journey (`api-e2e-evidence/skill-sources-dialog-journey.mjs`), re-run as an implementation check into `implementation-evidence/ir-002-dialog-journey/`: J-01..J-13 all Pass, 0 page errors, clean cleanup.
    - J-10: `focusAfterCancel` is the trash button, `focusAfterCancelTab` is Copy path, `escAfterCancelClosed` is true.
    - J-13: focus is on the input after Enter-add and after a keyboard remove, and `escAfterRemoveFromInputClosed` is true.
- Next recipient or routing: `/software_engineering_team/api_e2e_engineer` (direct-route Local Fix rule), for API/E2E round 2.
- Remaining limitations or risks: O-001 (`ConfirmationModal` neither moves focus into itself nor handles Esc) is unchanged and out of scope; Esc stays ignored while a confirmation is open. While the confirmation is open, the inert panel's trash button can keep focus in Chrome; that comes from the shared component's behavior.
