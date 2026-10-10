# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003`
- Package identifier: `skill-sources-dialog-redesign`
- Request / ticket: Project Task `project_task_957c30cd-001d-4766-9bbe-47ee71700ef1`
- Requirements owner: Solution Designer
- Date: 2026-10-10
- Approval state and reference: Approved by the user on 2026-10-10 through the Product Team design review. The user's round-3 decisions were "what is your suggestion, as long as its still clear. i think clean ui is the goal" and then "lets go then". The user's round-4 decision was "approved". Sources: `ui-ux-spec.md` §Status And User Confirmation and `review-round-3.md`/`review-round-4.md` in `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/skill-sources-dialog-redesign/`. `/project_task_manager` relayed the result on 2026-10-10. The approved spec explicitly lists the three wording deltas integrated in SR-002 (§Open Decisions And Risks). The user approved those exact behaviours, so SR-002 records them; it adds no new intent.
- Exact approved requirements baseline: SR-003 (this document). SR-003 changes one visual detail, approved by the user on 2026-10-10 during implementation review, as relayed by the Implementation Engineer. The user's words: "Just remove the icon. I think the icon, because with the words, it's already clear. The icon makes it look not so clean. Yeah, you decide."
- Behavior-defining supplements and approved versions: Product UI/UX package `skill-sources-dialog-redesign` in design repo `/Users/normy/autobyteus_org/autobyteus-web-design`, `personal` @ `dd89b84` (validated design commit `6810fc8`): `ui-ux-spec.md` (Status `Approved`) and VIS-001–VIS-023.

## Problem And Desired Outcome

- Problem: The "Manage Skill Sources" popup uses one large grey card per source. Each card has a dominant, wrapping full path and a repeated full-width red "Remove" button, and the dialog has a large blue "Done". With four sources the list already scrolls and the add form falls below the fold. The popup does not match the app's other dialogs.
- Desired outcome: A compact, clean popup in the app's newer dialog language that keeps the existing functionality, as specified by the approved UI/UX spec.
- Observable definition of success: The implemented popup matches the approved visual references. All source operations still work, and the user verifies this in the desktop app.

## Relevant Current And Desired Behavior

| Behavior ID | Current | Desired (approved) | Preserved |
| --- | --- | --- | --- |
| BEH-001 List | Grey card per source; kind badge + count + wrapping full path | Compact divided rows: icon tile (folder / GitHub mark), display name (+ Default badge), right-aligned count (`No skills` / `1 skill` / `N skills`), secondary truncated path/URL with tooltip + copy. No visible kind word (screen-reader kind kept) | Ordering (Default first, then path); counts |
| BEH-002/003 Add | Local/GitHub mode switch, mode-specific input, Add Folder / Import repository | One always-visible "Add skill source" input. Values matching `^\s*(https?://\|www\.\|github\.com/)` (case-insensitive) are imported as GitHub; all other values are added as a local folder. The hint switches to the trust warning for a URL. **Browse…** (native picker; fills input, never submits) appears only where the desktop folder picker is available | Same store operations, skill-name conflict checks, input kept on failure, cleared on success, success/warning alerts |
| BEH-004 Remove | Full-width "Remove" → confirmation | Trash icon button (aria "Remove {name}") → same danger confirmation with a source card | Confirmation required; local = unlink, GitHub = delete managed copy; never on Default |
| BEH-005 GitHub | Status text + installed/latest/checked metadata on the row; Check again always; Update; Retry removal | One status line with a coloured dot. **Update** chip appears on Update available / Update failed. **Try again** (manual check) appears only on Check failed. **Retry removal** chip appears on Removal incomplete. The row shows the error line. Revision/branch/checked details appear only in the status tooltip and the Update confirmation (`branch installed → latest`). Automatic check on every open | All statuses, errors, update, retry removal; automatic check on open |
| BEH-006 Busy/feedback | Disabled controls; alerts in scroll area | Same busy rules; alerts directly above the add form (fixed area) | Same messages |
| BEH-007 Close / a11y | ×, Done, overlay, Esc | Same. Focus moves into the dialog on open, Tab is trapped, focus returns to the opener on close. The dialog is labelled and `aria-busy`; the dialog is inert while a confirmation is open | Same close paths |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| AutoByteus user | Manage where skills come from | Scan sources/counts/update state quickly, add/remove/update safely | No behaviour regressions |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | Review sources, counts and update state | SCN-001 |
| UC-002 | Add a local folder / import a GitHub repository from one input | SCN-002 |
| UC-003 | Remove a non-default source with confirmation | SCN-003 |
| UC-004 | Update / retry check / retry removal for GitHub sources | SCN-004 |
| UC-005 | Close the popup | SCN-001 |

### Out Of Scope

Store/GraphQL/server behaviour; Settings → Agent Packages; the skills grid; an app-wide dark theme; a redesign of `ConfirmationModal` or the skill-name conflict dialog.

### Non-Goals

No new source types, no reordering/renaming of sources, no bulk actions. Non-GitHub hosts given without a scheme (e.g. `gitlab.com/x`) are treated as folder paths; the user accepted this risk.

### Preserved Behavior Boundary

The "Preserved" column of BEH-001..BEH-007. The `skillSourcesStore` contract stays unchanged.

### Review Authority

Blocking findings must cite an approved REQ/AC/BEH ID or a normative detail of the approved UI/UX spec. Scope additions are Requirement Gaps and need user approval.

## Requirements

| ID | Requirement | Behaviors | Source |
| --- | --- | --- | --- |
| REQ-001 | Sources are shown as compact divided rows in the newer dialog frame, per the approved spec. | BEH-001 | SR-001; UI spec |
| REQ-002 | Each row leads with the display name and skill count. GitHub rows show `owner/repo`. Folder rows show the last segment, or `parent/skills` when the last segment is `skills`. The full path/URL is a secondary truncated line with tooltip and a copy button. The kind is conveyed by the icon tile and the path/URL; there is no visible kind word, and the kind is kept for screen readers. | BEH-001 | SR-002 (UI spec approved change) |
| REQ-003 | A source with 0 skills shows a grey "No skills" with an explanatory hint tooltip; 1 shows "1 skill". | BEH-001 | UI spec |
| REQ-004 | Remove is a trash icon button with confirmation and never appears on the Default source. A row at Removal incomplete shows Retry removal instead of the trash button. | BEH-004 | UI spec |
| REQ-005 | One always-visible add input handles both kinds. The input value determines the operation: a URL (DC-017 rule) runs a GitHub import, anything else adds a local folder. The trust hint is shown while a URL is typed. Browse… appears only where the desktop folder picker is available; it fills the input and never submits. | BEH-002, BEH-003 | SR-002 (UI spec approved change; DEC-002 included) |
| REQ-006 | The header, add area and footer stay fixed; only the list scrolls. | BEH-001, BEH-007 | UI spec |
| REQ-007 | GitHub rows show one status line for every status, plus the error line. Row action chips (Update, Retry removal) are text-only (SR-003). Update appears on Update available / Update failed. The manual check (Try again) is offered only on Check failed, and sources are checked automatically on every open. Retry removal appears on Removal incomplete. Revision/branch/checked details appear only in the status tooltip and the Update confirmation. | BEH-005 | SR-002 (UI spec approved change) |
| REQ-008 | Keyboard and accessibility: focus moves into the dialog on open and Tab is trapped. Focus returns to the opener on close. Icon buttons have accessible names, and focus is visible. Esc closes the dialog unless a confirmation is open. The dialog is labelled. | BEH-007 | UI spec |
| REQ-009 | All other existing behaviour (store operations, conflict checks, busy disabling, alert messages, Default not removable, ordering) is unchanged. | BEH-001..007 | SR-001 |
| REQ-010 | New strings exist in en and zh-CN as specified; strings no longer used are removed. | — | UI spec §Content |

## Acceptance Criteria

| ID | REQ | Outcome | Verification |
| --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | Rows show icon tile, display name (+ Default badge), count, and truncated path/URL with full value in `title` and a copy button. No visible "Local folder"/"GitHub" word; a visually hidden kind exists | Component tests; visual comparison with VIS-001 |
| AC-002 | REQ-003 | count 0 → "No skills" with hint tooltip; 1 → "1 skill"; n → "n skills" | Component test |
| AC-003 | REQ-004 | No trash on Default. Trash on other rows opens the confirmation. Cancel makes no call; confirm calls `removeSkillSource(path)` (local) or `githubOperation('remove', id)` (GitHub) | Component test |
| AC-004 | REQ-005 | Path input → `addSkillSource(path)` through `runWithSkillNameChecks`. GitHub URL → `githubOperation('import', undefined, url)` through `runWithSkillNameChecks`. The trust hint shows for a URL. The input is kept on failure and cleared on success. Browse… is shown only when the picker is eligible, fills the input and does not submit | Component tests |
| AC-005 | REQ-006 | With many sources only the list region scrolls | Visual check / user verification (VIS-004, VIS-023) |
| AC-006 | REQ-007 | Each GitHub status renders its approved status line. The Update and Retry removal chips show their label with no icon. Update opens the update confirmation, and confirming calls `githubOperation('update', id)`. Try again appears only on CHECK_FAILED and calls `githubOperation('check', id)`. Retry removal appears on REMOVING. Version details appear in the status tooltip and the update confirmation | Component tests |
| AC-007 | REQ-008 | Icon buttons have accessible names. Esc closes when no confirmation is open and is ignored otherwise. Focus returns to the opener | Component tests |
| AC-008 | REQ-001..010 | The user verifies in the desktop app that the popup matches the approved design and all operations work | User verification |

## Relevant Scenarios And Journeys

| ID | Trigger | Steps | Outcome | Validity |
| --- | --- | --- | --- | --- |
| SCN-001 | Skills page → Sources | Open; GitHub checked automatically; scan list (Default, local 0/1/n, GitHub statuses, many sources); close via ×/Done/Esc/overlay | Clear overview | Supported Normal |
| SCN-002 | Add | Type/paste path or URL (or Browse… in desktop); Add; success / conflict / error | Source added or error shown, input kept | Supported Normal |
| SCN-003 | Remove | Trash or Retry removal → confirm/cancel | Unlinked/deleted or unchanged | Supported Normal |
| SCN-004 | GitHub maintenance | Update (confirm), Try again after Check failed, Retry removal | New status | Supported Normal |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX supplement: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/skill-sources-dialog-redesign/ui-ux-spec.md`
- Runnable UI reference: design repo `/Users/normy/autobyteus_org/autobyteus-web-design` (`personal`). Run `corepack pnpm dev --port <port> --host 127.0.0.1`, open `/skills` → Sources. The scenario is set via `localStorage['autobyteus.prototype.scenario']`.
- Product ticket record: `.../tickets/done/skill-sources-dialog-redesign/product-ticket.md` (externally owned)
- Design repository revision: `personal` @ `dd89b84`; validated design commit `6810fc8`
- UI/UX user-confirmation reference: 2026-10-10, round 4 "approved" (see Document Status)
- Approved visual-reference baseline: VIS-001–VIS-023 in `.../visual-references/`
- Normative details: every visible detail in VIS-001–VIS-023 and the spec, except the items the spec marks as illustrative.
- **Approved deviation from the Product visual references (SR-003, overrides `ui-ux-spec.md` §Visual Language → Controls, VIS-001 and VIS-003):** the GitHub row chips are text-only.
  - **Update** has no leading `heroicons:arrow-up-circle`.
  - **Retry removal** has no leading `heroicons:arrow-path`.
  - Chip size, colours, border, hover/focus/disabled states, labels and behaviour are unchanged.
  - The primary **Add** button keeps its `+` icon.
  - Basis: the user asked to remove the Update icon and left the extent to the implementer ("you decide"). Retry removal was included for consistency between the two row chips.
- Illustrative / permitted variation: fixture names, paths, counts, revisions, dates, error texts, background page; native tooltip appearance; Browse… only where the picker exists.
- Light/dark: light only (ASM-001 confirmed by the user).
- Unresolved product decisions: none.

## Quality And Non-Functional Requirements

| ID | Related | Area | Requirement |
| --- | --- | --- | --- |
| QR-001 | REQ-008, AC-007 | Accessibility | Keyboard-operable; visible focus; labelled icon buttons; labelled dialog; hint `aria-live="polite"` |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`

## External Contracts And Dependencies

| Contract | Constraint | Evidence |
| --- | --- | --- |
| `skillSourcesStore` (`fetchSkillSources`, `checkGitHubSources`, `addSkillSource`, `removeSkillSource`, `githubOperation`) | Unchanged | `stores/skillSourcesStore.ts` |
| `window.electronAPI.showFolderDialog` via `pickFolderPath`, gated by `canUseLocalFolderPicker` | Reused as-is | `composables/useNativeFolderDialog.ts`, `utils/mobileFeatureGates.ts` |

## Supplemental Artifacts

| Path | Purpose | Status | Approval |
| --- | --- | --- | --- |
| `design-reference/00-current-user-screenshot.png` | Current-state evidence | Final | N/A |
| `product-design-request.md` | Product Team request | Completed | N/A |
| Product `ui-ux-spec.md` + VIS-001–023 (external) | Normative UI design | Approved | User-approved 2026-10-10 |

## Assumptions

| ID | Assumption | Status |
| --- | --- | --- |
| ASM-001 | Light-only design is sufficient (no app-wide dark theme) | Confirmed by the user (round 3) |

## Open Decisions And Questions

| ID | Question | Status |
| --- | --- | --- |
| DEC-001 | Which design | Resolved: Product UI/UX spec (approved) |
| DEC-002 | Browse… folder picker | Resolved: included, desktop folder-picker contexts only |

## Traceability

| REQ | UC | BEH | AC | SCN | UI evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-008 | SCN-001 | VIS-001, VIS-004 |
| REQ-002 | UC-001 | BEH-001 | AC-001 | SCN-001 | VIS-001, VIS-018 |
| REQ-003 | UC-001 | BEH-001 | AC-002 | SCN-001 | VIS-001 |
| REQ-004 | UC-003 | BEH-004 | AC-003 | SCN-003 | VIS-010, VIS-011, VIS-017 |
| REQ-005 | UC-002 | BEH-002/003 | AC-004 | SCN-002 | VIS-005..009, VIS-015, VIS-016, VIS-022 |
| REQ-006 | UC-001, UC-005 | BEH-001/007 | AC-005 | SCN-001 | VIS-004, VIS-023 |
| REQ-007 | UC-004 | BEH-005 | AC-006 | SCN-004 | VIS-001..003, VIS-012, VIS-013 |
| REQ-008 | UC-005 | BEH-007 | AC-007 | SCN-001 | VIS-017 |
| REQ-009 | all | all | AC-003..008 | all | — |
| REQ-010 | all | — | AC-008 | — | VIS-021 |

## Architecture Phase Input

- The change is presentation-only: `SkillSourcesModal.vue`, `SkillSourceRow.vue`, a display-name helper, localization (en/zh-CN) and specs. The design repo already contains a validated, production-shaped implementation (`6810fc8`) that can be ported.
- The store, GraphQL and server stay unchanged.

## Readiness Check

### Content Ready For Approval

- All items: `Yes`

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-10-10, via the approved UI/UX spec)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
