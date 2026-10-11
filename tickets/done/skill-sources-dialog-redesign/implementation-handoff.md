# Implementation Handoff — skill-sources-dialog-redesign

## Upstream Artifact Package

All paths are in `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-sources-dialog-redesign/tickets/in-progress/skill-sources-dialog-redesign/` unless absolute.

- Upstream review applicability and handoff-rule result:
  - Direct route: `task_size=Medium`, `architectural_risk=Low`; there was no independent architecture review.
  - `get_handoff_rules` matches "implementation complete … Small or Medium and Low … direct API/E2E validation" → `/software_engineering_team/api_e2e_engineer`.
- Requirements doc: `requirements-doc.md` (SR-003, Approved).
- Investigation notes: `investigation-notes.md`.
- Solution revision record: `solution-revision-record.md` (SR-001..SR-003).
- Design spec: `design-spec.md` (SR-003).
- Supplemental task artifacts:
  - Product UI/UX spec and visual references (read-only; Product-owned):
    - `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/skill-sources-dialog-redesign/ui-ux-spec.md`
    - `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/skill-sources-dialog-redesign/visual-references/VIS-001..VIS-023`
  - The SR-003 deviation in `requirements-doc.md` overrides the chip icons that the Product spec and VIS-001/VIS-003 show.
  - `handoff-to-implementation.md`, `product-design-request.md`, `design-reference/00-current-user-screenshot.png`.
- Design review report: `N/A — not applicable`.
- Architecture review revision record: `N/A — not applicable`.
- Triggering rework report:
  - `code-review-report.md` + `code-review-revision-record.md` (CRR-001, CR-001: failure-origin review of API/E2E F-001);
  - `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md` (API-REV-001), `api-e2e-test-case-ledger.md`, and `api-e2e-evidence/dialog-journey/result.json` (J-10, J-13).

## Current Implementation Summary

- Implementation cycle: `Rework`. IR-002 is a Local Fix for CR-001; see `implementation-revision-record.md` for the delta.
- Implementation revision record: `implementation-revision-record.md`.
- Current implementation revision ID: `IR-002` (IR-001 is the initial baseline).
- Related solution revision IDs:
  - SR-002: approved baseline.
  - SR-003: GitHub row chips are text-only. The user decided this during implementation, I raised it as a Requirement Gap, and the Solution Designer resolved it.
- Related architecture-review revision IDs: `N/A`.
- Related code-review revision IDs: `CRR-001`.
- Related API/E2E revision IDs: `API-REV-001`.
- Related delivery revision IDs: `N/A`.
- Triggering finding IDs: `CR-001` (= API/E2E `F-001`; J-10, J-13).

The popup is replaced by the approved design:
- a fixed header, add area and footer, with only the list scrolling;
- compact rows: icon tile, display name, Default badge, count, truncated path/URL with copy, trash;
- GitHub rows with one status line, a text-only **Update** chip, **Try again** only on *Check failed*, and a text-only **Retry removal** chip;
- the revision details in the status tooltip and in the Update confirmation;
- one add input that imports a URL and adds anything else as a folder, with the trust hint for a URL and **Browse…** where the desktop folder picker is available;
- a source card in the confirmation body;
- focus moved in on open, trapped on Tab and returned on close; Esc is ignored while a confirmation is open;
- IR-002: Esc and the Tab cycle are handled at the document level, so they also work when focus has left the panel. Focus is brought back into the panel when a confirmation, an operation or a skill-name conflict ends: to the originating control if it is still usable, otherwise to the add input or the panel.

Store calls are identical to before.

## Routing Classification (Mandatory)

- Task size: `Medium`.
- Architecture risk: `Low`.
- Design classification section / evidence reference: `design-spec.md` §Task Size And Architectural Risk.
- Classification confirmed or changed: `Confirmed`.
- Evidence and rationale:
  - The change is presentation-only: 2 components, 1 pure helper, 4 catalogs, tests, a probe selector update and docs.
  - There is no store, GraphQL, server, persistence, IPC or ownership change.
  - Browse… reuses `canUseLocalFolderPicker` + `pickFolderPath`. `ConfirmationModal` is unchanged and used only through its slot.
  - SR-003 is a visual-only change.
- Selected route: `Direct API/E2E`.
- Lightweight implementation self-review completed for the direct route: `Yes`. The self-review covered:
  - store-call parity with the base;
  - the boundary rules (the row imports no stores; the modal never calls `window.electronAPI.showFolderDialog` directly);
  - no prototype imports;
  - file sizes;
  - the dead-key re-grep;
  - mutation checks that the tests fail when DC-017 detection, the Esc guard or the SR-003 chip icon are changed.
- New design impact or escalation trigger: `None`.
  - The SR-003 Requirement Gap is resolved.
  - IR-002 is confined to `SkillSourcesModal.vue` and its spec, with no `ConfirmationModal`, store or design change. The classification was rechecked and stays Medium/Low.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Compact rows. Display name per `skillSourceDisplayName`. Count `No skills` (with hint) / `1 skill` / `N skills`. Truncated location with `title` and copy. Kind for screen readers only. Default first, then by path | `SkillSourceRow.vue`, `utils/skills/skillSourceDisplay.ts`, `SkillSourcesModal.vue` (`sources` sort) | Done; R01, R07 |
| BEH-002/003 | One input. DC-017 `/^\s*(https?:\/\/\|www\.\|github\.com\/)/i` → `githubOperation('import', undefined, v)`, else `addSkillSource(v)`, both inside `runWithSkillNameChecks`. Trust hint for a URL. Input cleared on success, kept on failure. Browse… fills the input and never submits | `SkillSourcesModal.vue` `handleAdd`, `isRepositoryUrl`, `pickerEligible`, `browse` | Done; R03, R04, R08, success add |
| BEH-004 | Trash (`Remove {name}`), never on Default or on a REMOVING row → danger confirmation with a source card → `removeSkillSource(path)` / `githubOperation('remove', id)`, then refresh | `SkillSourceRow.vue`, `SkillSourcesModal.vue` `confirmAction` (unchanged) | Done; R05, R06 + retry |
| BEH-005 | Status line for every status. Update chip on UPDATE_AVAILABLE/UPDATE_FAILED. Try again on CHECK_FAILED only. Retry removal on REMOVING. Version details in the tooltip and the Update confirmation. Automatic check on open. **SR-003: text-only chips** | `SkillSourceRow.vue` (`statusLabel`, `canUpdate`, `canCheck`, `versionDetails`), modal confirmation body | Done; R02, R06; Update → *Updating…* → *Up to date* observed |
| BEH-006 | Same busy rules (`loading` / `scanning` / any `pending` disables all actions and the add form). Alerts directly above the add form | `SkillSourcesModal.vue` `busy`, alert block | Done; R04 |
| BEH-007 | ×, Done, overlay and Esc close; Esc is ignored while confirming. Focus in on open, Tab trap, focus returned on unmount. Dialog labelled, `aria-busy`, `inert` while confirming. IR-002: Esc and the Tab cycle also work when focus has left the panel, and focus returns into the panel after confirmations, operations and conflicts | `SkillSourcesModal.vue` document-level `handleKeydown` (inactive while `overlayOpen`), the blocked-state `watch` focus restore, `onMounted`/`onBeforeUnmount` | Done; browser: Esc closed the dialog and focus returned to **Sources**; IR-002 journey J-10/J-13 Pass |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. The SR-003 change was routed as a Requirement Gap and approved.

## Key Files Or Areas

- `autobyteus-web/components/skills/SkillSourcesModal.vue` (rewritten; 253 non-empty lines after IR-002)
- `autobyteus-web/components/skills/SkillSourceRow.vue` (rewritten; 130 non-empty lines; SR-003 chips)
- `autobyteus-web/utils/skills/skillSourceDisplay.ts` (new)
- `autobyteus-web/localization/messages/{en,zh-CN}/skills.ts` (new keys added; unused keys removed)
- `autobyteus-web/localization/messages/{en,zh-CN}/skills.generated.ts` (dead keys removed)
- Tests:
  - `autobyteus-web/components/skills/SkillSourcesModal.spec.ts` (rewritten; 41 tests after IR-002 added 7 focus-lifecycle tests)
  - `autobyteus-web/components/skills/SkillSourceRow.spec.ts` (new, 27 tests; colocated per the folder's convention)
  - `autobyteus-web/utils/skills/__tests__/skillSourceDisplay.spec.ts` (new, 11 tests)
- `autobyteus-web/tests/e2e/github-skill-sources-probe.mjs`: selectors only. The rows are now `li[data-testid^="skill-source-row-"]`, the single input + **Add** replaces the GitHub mode / Import repository controls, and the row trash button is named `Remove api-e2e/skills`.
- `autobyteus-web/docs/skills.md`: the Local and GitHub Sources section and the module structure.

## Important Assumptions

- Copy the full location with `navigator.clipboard`. If the clipboard is unavailable, the copy fails silently and the full value is still in the tooltip, as in the reference.
- The narrow-layout breakpoint for the wrapping input row is the reference's `520px` CSS media query (approved reference code). Tailwind `sm` (640px) governs the row grid and the icon tile.

## Known Risks

- The new Iconify names (`mdi:github`, `heroicons:shield-exclamation`) load online, like every icon in the app (accepted).
- `gitlab.com/x` without a scheme is treated as a folder path (accepted). A tested case confirms this.
- The version tooltip is a native `title` and works with a pointer only; the same details are in the Update confirmation.
- O-001 (out of scope; shared component): `ConfirmationModal` neither moves focus into itself nor handles Esc. While a confirmation is open, Esc is ignored, as AC-007 requires, and the keyboard user must Tab to its buttons. The popup's own focus is restored when the confirmation closes (IR-002).
- Server behavior, unchanged by this work: after a real permission-denied GitHub removal, the server reports `REMOVING` with `lastError: null`. The error therefore appears as the dialog's red alert, not as a row error line. The row renders `lastError` whenever the server provides it (unit-tested).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change (UI redesign with approved interaction changes).
- Reviewed root-cause classification: No Design Issue Found.
- Reviewed refactor decision: `No Refactor Needed`.
- Implementation matched the reviewed assessment: `Yes`.
- If challenged, routed as `Design Impact`: `N/A`.
- Evidence / notes:
  - The modal remains the single dialog owner, the row only emits intents, and the helper is pure.
  - The inline copy button is kept instead of `CopyButton`, per the design.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No`. The mode switch, kind badge, metadata `<dl>`, always-visible Check again and old scoped CSS are gone.
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. 44 key entries were removed after a re-grep that excluded the catalogs and checked for dynamic construction:
  - `skills.ts` (en + zh-CN, 12 each):
    - `skills.sources.sourceType`, `repositoryUrl`, `import`, `check`, `status.REMOVING`. `status.REMOVING` is no longer reached because the row uses `REMOVING_SHORT`. The other `status.*` keys are built dynamically and kept.
    - `SkillSourcesModal.default`, `custom`, `scanning`, `remove_message`, `remove_confirm`, `add_success`.
    - `SkillDetail.read_only`, which was already dead in a touched catalog.
  - `skills.generated.ts` (en + zh-CN, 10 each):
    - `SkillSourcesModal.absolute_path_to_skills_folder`, `add_folder`, `add_new_source_folder`, `and_times`, `enter_the_absolute_path_to_a`, `scanning_directory_for_skills_please_wait`, `skills_found`, `source_path`.
    - `SkillCard.skill_description`, `skill_name` (already dead).
  - The en/zh-CN key sets stay identical. The localization guard, the literal audit and the catalog tests pass.
- Dead code found elsewhere, listed as follow-up: None.
- Shared structures remain tight: `Yes`. The helper takes `Pick<SkillSource, 'path' | 'github'>`, and the row's props and emits are unchanged.
- Canonical shared design guidance reapplied: `Yes`.
- Changed source files within size guardrails: `Yes`. All are under 500 effective lines, and the per-file delta is at most 143 added lines.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (design-spec §Persisted Data). No store or schema change.

## Environment Or Dependency Notes

- The worktree needed `pnpm install`, `pnpm -C autobyteus-web exec nuxt prepare`, and `pnpm -C autobyteus-server-ts prebuild && build` (for the probe and the render stack).
- `autobyteus-web` has no `typecheck` or `lint` script and no `vue-tsc` dependency. I ran the design repo's `vue-tsc` binary against `autobyteus-web/tsconfig.json`; it reported 0 errors in the touched files. The project has existing errors elsewhere: 387 in the final run, and the count varies with build state. This is a discrepancy to record, not a project-defined check.
- The untracked SDK `dist/` folders come from the server build and are not committed.

## Local Implementation Checks Run

These are implementation-scoped checks, not API/E2E sign-off. Run from the worktree.

IR-002, current:
- `pnpm -C autobyteus-web test:nuxt components/skills utils/skills stores/__tests__/skillStore.spec.ts stores/__tests__/skillSourcesStore.spec.ts localization --run` → 25 files, 149 tests pass. `SkillSourcesModal.spec.ts` has 41 tests.
- Mutation checks of the IR-002 fix, each reverted:
  - no focus restore → 5 tests fail;
  - keydown listener on the panel only → 1 test fails;
  - no overlay guard → 3 tests fail;
  - a stray check for `<body>` only → 3 tests fail.
- Localization guard and literal audit pass. 0 type errors in the touched files (design repo `vue-tsc`, as below).
- `node tickets/in-progress/skill-sources-dialog-redesign/api-e2e-evidence/skill-sources-dialog-journey.mjs <ticket>/implementation-evidence/ir-002-dialog-journey` (the API/E2E temporary journey) → J-01..J-13 all Pass, 0 page errors, browser closed and stack cleaned.
  - The first IR-002 attempt (`ir-002-dialog-journey-run1/`) failed J-13. It is kept as evidence of the `ConfirmationModal` fade-out focus case that the final fix handles.
- Not re-run for IR-002: the GitHub skill sources probe. Its selectors are untouched, and API/E2E round 2 owns the re-run.

IR-001 checks (initial baseline):
- `pnpm -C autobyteus-web test:nuxt components/skills utils/skills stores/__tests__/skillStore.spec.ts stores/__tests__/skillSourcesStore.spec.ts localization --run` → 25 files, 142 tests pass.
- Mutation checks, each reverted after the run:
  - dropping `github.com/` from DC-017 fails the import case;
  - removing the Esc guard fails the Esc test;
  - restoring the Update chip icon fails the 2 SR-003 tests.
- `pnpm -C autobyteus-web guard:localization-boundary` → Passed. `pnpm -C autobyteus-web audit:localization-literals` → Passed with zero unresolved findings.
- `node autobyteus-web/tests/e2e/github-skill-sources-probe.mjs <ticket>/implementation-evidence/github-skill-sources-probe` (TESTING.md §GitHub Skill Sources Regression) → `Pass`, 8/8 cases. Cleanup: browser closed, children stopped, ports released, data removed. I ran it to confirm the selector update; it ran before the SR-003 chip edit, which does not affect its selectors. API/E2E owns its result.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Skills → Sources popup (UIS-001..003), UXJ-001..006.
- Approved references: requirements SR-003 (including the text-only chip deviation), the Product `ui-ux-spec.md` and VIS-001..023.
- Existing design system and adjacent surfaces reviewed:
  - `ConfirmationModal` (unchanged);
  - the folder-picker gating used by `ChatWorkspaceMenu`;
  - `SkillsList`, where the **Sources** opener is.
- Surface used (TESTING.md: renderer UI → browser dev-path):
  - `implementation-evidence/render-check-stack.mjs` provides a disposable built backend, with outbound GitHub controlled by the probe's existing `github-skill-upstream.mjs` fixture, and the worktree's Nuxt dev server.
  - Real store, GraphQL and filesystem.
  - It was driven in the AutoByteus browser at 899×738, plus a 390×844 same-origin iframe for the narrow layout.
- States and interactions inspected (screenshots in `implementation-evidence/render/`):
  - R01: populated list with 12 sources; only the list scrolls and the panel is capped at 90vh. Focus is on the panel on open.
  - R02: *Update available* with the text-only Update chip.
  - *Check failed* + Try again + error line, and the version tooltip text. Try again led to *Update available*.
  - Update confirmation with `main aaaaaaaaaa → bbbbbbbbbb`; confirming showed *Updating…* → *Up to date* + success alert.
  - R03: URL typed → shield trust hint, Add enabled.
  - R04: missing folder → red alert above the form, input kept.
  - Successful add → green alert, input cleared, new row.
  - R05: local remove confirmation; confirming removed the row with a success alert.
  - R06: real permission-denied GitHub removal → *Removal incomplete* + text-only Retry removal, no trash. After restoring permissions, Retry removal completed.
  - Re-import through the single input as a URL.
  - R07: narrow layout with no icon tile and full-width input/Add.
  - R08: Browse… layout; `showFolderDialog` stubbed in the page fills the input, focuses it and does not submit.
  - Esc closed the dialog and focus returned to **Sources**.
- Visual or interaction issues found and corrected: the user asked to remove the chip icons. That was implemented as SR-003 after the Requirement Gap round-trip. No other defects were found.
- Remaining unverified states or limitations:
  - The native OS folder dialog and the Electron desktop shell were not run; Browse… was rendered with a stubbed IPC.
  - The transient *Checking…* was not caught visually because the local check is too fast (covered by unit tests).
  - zh-CN rendering (VIS-021) was not inspected visually; the strings exist and the catalog tests pass.
  - The keyboard focus ring (VIS-017) was not inspected visually.
  - Native tooltip appearance is out of scope.
  - The user's desktop verification is AC-008.

## Downstream Coverage Hints / Suggested Scenarios

- Run the GitHub skill sources probe again on the final tree; its selectors are updated.
- Browse… in an isolated desktop instance (`pnpm --silent isolated-app start --build`): the button is visible, the native picker fills the input and Add is not triggered. Also check that Browse… is absent for a remote node.
- zh-CN rendering of the new strings (VIS-021).
- Keyboard-only journey: Tab cycle inside the panel, the focus ring on the trash button (VIS-017), Esc while the confirmation is open.
- Short window (1024×700) and many sources: only the list scrolls (AC-005).
- Duplicate-skill-name conflict from the single input (VIS-016): the input is kept and the conflict dialog appears over the popup.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- API/E2E owns independent validation of AC-001..AC-007 on the final tree, including the desktop-context Browse… and the executable coverage decisions.
- AC-008 (the user's verification in the desktop app) remains with Delivery.
