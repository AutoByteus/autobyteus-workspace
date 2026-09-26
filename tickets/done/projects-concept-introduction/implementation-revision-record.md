# Implementation Revision Record

Package: `PROJ-CONCEPT-20260926-001` — `projects-concept-introduction`. The current code and `implementation-handoff.md` remain authoritative; this record indexes implementation rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `/architecture_reviewer` — `design-review-report.md` round 2 (`ARCH-REV-002`, Pass) | N/A | `Initial Baseline` | `SR-001`, `SR-003`, `ARCH-REV-002`; `CRR-*` N/A; `API-REV-*` N/A; `DR-*` N/A | Slice 1 implemented in commits `6563fd69f` (server) and `816fd4db5` (web); ready for code review |
| IR-002 | `/code_reviewer` — `code-review-report.md` round 2 (`CRR-002`, failure-origin review of `API-F-001` / E2E-007) | `CR-001` | `Local Fix` | `SR-001`, `SR-003`, `ARCH-REV-002`, `CRR-001`, `CRR-002`, `API-REV-001`; `DR-*` N/A | `SearchableSelect` keyboard support in commit `63e6fb0e4`; back to code review |

## Revision Entries

### IR-001 — Initial implementation of feature-flagged Projects (slice 1)

- Triggering role, report path, and round: `/architecture_reviewer`, `design-review-report.md`, round 2 (`ARCH-REV-002` Pass)
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: Implementation complete for design-spec Change / Refactor Sequence steps 1–6. Step 7 (browser E2E) belongs to `api_e2e_engineer`; step 8 (docs) belongs to delivery docs-sync.
- Related solution revision IDs: `SR-001` (requirements), `SR-003` (design)
- Related architecture-review revision IDs: `ARCH-REV-002` (resolves `AR-001`, `AR-002` of `ARCH-REV-001`)
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation handoff.
- Approved behavior or requirement IDs affected: `BEH-001`–`BEH-006`; `REQ-001`–`REQ-014`; `AC-001`–`AC-012`; `QR-001`, `QR-003`.
- Implementation delta: see `implementation-handoff.md` › Reviewed Behavior Implementation Trace and Key Files.
- Changed files or areas: `autobyteus-server-ts/src/{projects/**,services/server-settings-service.ts,application-capability/services/*,skill-improvement/services/skill-improvement-capability-service.ts,api/graphql/{schema.ts,types/projects*.ts}}`; `autobyteus-web/{stores/capabilities/**,stores/*CapabilityStore.ts,stores/projectStore.ts,stores/serverSettings.ts,components/settings/*FeatureToggleCard.vue,components/projects/**,pages/projects/**,components/workspace/config/WorkspaceSelector.vue,middleware/feature-flags.global.ts,composables/useShellPrimaryNavigation.ts,utils/{mobileFeatureGates.ts,projects/**},graphql/**/project*.ts,generated/graphql.ts,types/project.ts,localization/**}` plus tests.
- Local validation and result: server targeted suites 7 files / 83 tests pass for the changed areas; web targeted suites 35 files / 169 tests pass; localization guard and literal audit pass; server `tsc -p tsconfig.build.json --noEmit` clean; rendered-result check in dev app (en + zh-CN) done. Failures that also occur on the unchanged base: 1 server Skill Improvement resolver test, 2 server workspace-manager tests, 3 server `skill-improvement-target-notification-service` tests (factual correction from `CRR-001`), and 13 web tests in 6 files.
- Next recipient or routing: per `get_handoff_rules` (Large/High → code review).
- Remaining limitations or risks: see `implementation-handoff.md` › Known Risks.
- Downstream review status: `CRR-001` Pass (round 1, no findings); package routed by `/code_reviewer` to `/api_e2e_engineer`.

### IR-002 — Keyboard-operable SearchableSelect inside the link dialog (CR-001)

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md` › Failure-Origin Analysis — API-F-001, round 2 (`CRR-002`); originating API/E2E failure `API-F-001` (E2E-007, `API-REV-001`)
- Triggering finding IDs: `CR-001` (High; blocks `AC-011`, `REQ-013`, `QR-003`)
- Classification: `Local Fix`
- Prior authoritative result: `IR-001`. `SearchableSelect` teleported its popover to `body` and focused the search input there, so focus left `ProjectDialogFrame`. The options were `<li @click>` with no role or key handling. Result: a keyboard-only user couldn't select a workspace, Tab escaped the modal, and Escape did nothing.
- Current authoritative result: `SearchableSelect` implements the combobox/listbox pattern:
  - The trigger has `aria-haspopup="listbox"`, `aria-expanded` and `aria-controls`, and ArrowDown/ArrowUp open the popover.
  - The search input is `role="combobox"` with `aria-controls` and `aria-activedescendant`.
  - The list is `role="listbox"`; options are `role="option"` with `aria-selected` and a visible active highlight.
  - ArrowUp/Down (wrapping), Home and End move the active option. The active option starts at the selected item, otherwise the first; it resets to the first match when filtering and scrolls into view.
  - Enter selects the active option.
  - Escape closes only the popover (preventDefault + stopPropagation) and returns focus to the trigger.
  - Tab and Shift+Tab close the popover and return focus to the trigger (preventDefault + stopPropagation), where the enclosing dialog's trap takes over.
  - Selecting an option (keyboard or pointer) returns focus to the trigger.
- Related solution revision IDs: `SR-001`, `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `CRR-001` (Pass, superseded for this area by the failure-origin review), `CRR-002` (`CR-001`)
- Related API/E2E revision IDs: `API-REV-001` (`API-F-001`)
- Related delivery revision IDs: N/A
- Why this revision is recorded: local fix for `CR-001`.
- Approved behavior or requirement IDs affected: `AC-011`, `REQ-013`, `QR-003` (restored); `SCN-003`, `AC-005` keyboard path.
- Implementation delta:
  - `SearchableSelect.vue`, additive only:
    - adds a trigger ref, keydown handlers, ARIA attributes, the active-index state and a module-level id sequence for listbox and option ids;
    - leaves the teleport, positioning, click-outside handling, filtering, props and emitted values untouched.
  - `ProjectDialogFrame`, `WorkspaceSelector` and `ProjectWorkspaceLinkDialog` are unchanged. Neither `ProjectDialogFrame` nor `SearchableSelect` knows about the other or about Projects.
  - The one change a pointer user can see: after a mouse selection, focus returns to the trigger instead of dropping to `body`. This follows `CR-001`'s "selecting an option returns focus to the trigger" and keeps focus inside an enclosing dialog.
- Changed files or areas: `autobyteus-web/components/common/SearchableSelect.vue`; new `autobyteus-web/components/common/__tests__/SearchableSelect.keyboard.spec.ts` (8 tests); new `autobyteus-web/components/projects/__tests__/ProjectWorkspaceLinkDialog.keyboard.spec.ts` (3 tests; real `ProjectDialogFrame` + `WorkspaceSelector` + `SearchableSelect` attached to the document).
- Local validation and result:
  - Web: `components/projects`, `components/common`, `components/workspace/config` and `components/applications`: 29 files / 221 tests pass. This includes unchanged `WorkspaceSelector.spec.ts`, `WorkspaceSelector.candidates.spec.ts`, the run-config specs and the application setup launch-profile editor specs.
  - Both localization guards pass.
  - Live dev-app check (dispatched key events) in the link dialog:
    - ArrowDown on the trigger opens the listbox with focus on the combobox.
    - ArrowDown moves the highlighted active option.
    - Enter selects, focus returns to the trigger, and Save becomes enabled.
    - Escape in the listbox closes only the listbox; the dialog stays open and focus is on the trigger.
    - Tab in the listbox returns focus to the trigger inside the dialog panel.
    - Escape on the trigger closes the dialog.
- Next recipient or routing: `get_handoff_rules`, Large/High local-fix rule → `/code_reviewer`.
- Remaining limitations or risks:
  - The live check used dispatched key events, not OS-level keystrokes; native Tab movement between controls is the browser's. The API/E2E probe `E2E-007` is the real-keyboard confirmation.
  - The API/E2E durable test files are deliberately left uncommitted and untouched: `autobyteus-server-ts/tests/e2e/projects/`, `autobyteus-web/tests/e2e/projects-feature-probe.mjs`, and the `package.json` script.
- Downstream review status: `CRR-003` Pass (round 3 delta review; `CR-001` resolved); package routed by `/code_reviewer` to `/api_e2e_engineer` (E2E-007 first).
