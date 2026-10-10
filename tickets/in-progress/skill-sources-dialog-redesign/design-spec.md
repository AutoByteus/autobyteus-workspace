# Design Spec — Manage Skill Sources popup redesign

## Solution And Approval Basis

- Current solution revision ID: `SR-003`
- Approved requirements baseline: `requirements-doc.md` SR-003 (SR-003 makes the row chips text-only, as the user approved on 2026-10-10). Before that, SR-002: The user approved it on 2026-10-10 through the Product design review (round-3 decisions; round-4 "approved").
- Behavior-defining supplements: Product UI/UX package `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/skill-sources-dialog-redesign/ui-ux-spec.md` (Approved) with VIS-001–VIS-023. Design repo `personal` @ `dd89b84`; validated design commit `6810fc8`.
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-sources-dialog-redesign/tickets/in-progress/skill-sources-dialog-redesign/investigation-notes.md`
- Authorities read (2026-10-10): `references/architecture-design.md`, `references/design-principles.md`, project `DESIGN.md` (repo root); `autobyteus-web/AGENTS.md`; `TESTING.md` is referenced for validation. `references/design-examples.md` was not needed.
- Project design-principle conflicts / discrepancies: None.

## Current-State Read

The Skills page (`components/skills/SkillsList.vue`) toggles `SkillSourcesModal` with `showSourcesDialog`. `SkillSourcesModal.vue` owns:
- the dialog shell;
- load-on-open (`fetchSkillSources` then `checkGitHubSources`);
- the add form, with a Local/GitHub mode switch;
- alerts;
- the remove/update confirmation via `ConfirmationModal`;
- catalog refresh after operations.

`SkillSourceRow.vue` renders one source and emits `check` / `update` / `remove`. All behaviour lives in `stores/skillSourcesStore.ts`; the components only orchestrate UI. The existing ownership is healthy. The problem is purely presentational, plus three user-approved interaction changes: the single add input, Try again only after a failed check, and version details in the tooltip.

The design repo contains a validated, production-shaped implementation of both components plus `utils/skills/skillSourceDisplay.ts` and the en/zh-CN strings (`6810fc8`). It uses only production APIs:
- `useWindowNodeContextStore`
- `canUseLocalFolderPicker`
- `pickFolderPath`
- `useSkillSourcesStore`, `useSkillStore`, `useSkillNamesStore`
- `ConfirmationModal`
- `@iconify/vue`

Prototype fixture hooks live only in the design repo's `utils/apolloClient.ts` and `prototype/`, and are **not** ported. The design repo's baseline copies of the touched production files are byte-identical to `origin/personal@d28c56d5d` (Product currency check), so the design version can be ported directly.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: two Vue components rewritten, one small new pure helper, four localization catalogs (en/zh-CN `skills.ts`, plus removal of dead keys from `skills.generated.ts` where applicable), a component spec update and two new focused tests, and a docs update (`docs/skills.md`). Everything stays inside the existing skills UI ownership.
- Architectural risk: `Low`
- Risk rationale: presentation-only. No store, GraphQL, server, persistence, security, concurrency, deployment or ownership-boundary change. It reuses existing folder-picker gating and IPC. The only interaction-logic changes are approved and local to the modal: URL detection selects which existing store operation runs, and Try-again visibility changes.
- Escalation trigger: return a Design Impact to the Solution Designer if implementation needs a store/GraphQL change, or if the folder-picker gating or the `ConfirmationModal` must change. Also return one if the approved visuals cannot be met without changing shared components.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision supported |
| --- | --- | --- | --- |
| Code | `autobyteus-web/components/skills/SkillSourcesModal.vue`, `SkillSourceRow.vue` | Current UI owners | Modify in place |
| Code | `autobyteus-web/stores/skillSourcesStore.ts` | All operations exist (`addSkillSource`, `removeSkillSource`, `githubOperation`, `checkGitHubSources`, `pending`) | No store change |
| Code | `autobyteus-web/utils/mobileFeatureGates.ts:72` `canUseLocalFolderPicker`; `composables/useNativeFolderDialog.ts:3` `pickFolderPath`; `stores/windowNodeContextStore.ts:55` `isEmbeddedWindow` | Existing picker gating used by workspaces | Reuse for Browse… |
| Code | `components/projects/ProjectDialogFrame.vue` | Newer dialog frame language referenced by the spec | Visual consistency only; no shared extraction needed |
| Design repo | `git show 6810fc8:components/skills/{SkillSourcesModal,SkillSourceRow}.vue`, `utils/skills/skillSourceDisplay.ts`, `localization/messages/{en,zh-CN}/skills.ts` | Production-shaped reference implementation, with no prototype imports | Port as the implementation basis |
| Command | key-usage grep (investigation notes) | Keys made unused by the change, and keys that are already dead in the touched catalogs | Removal plan |
| Code | `components/skills/SkillSourcesModal.spec.ts` | Selectors tied to the old markup (`.input-modes`, `.remove`, `.input-group input`) | Spec update |

## Intended Change

Replace the popup's presentation with the approved design:
- a fixed header, add area and footer, with only the list scrolling;
- compact rows with a display name and count, a truncated path/URL with copy, and a trash icon;
- GitHub status lines with an Update chip, Try again only on Check failed, a Retry removal chip, and version details in a tooltip;
- one add input with URL detection and Browse… where the picker is available;
- a source card in the confirmation body, with the version change for Update;
- focus management.

Store calls stay identical.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Approved change / preserved outcome | Target path / spine |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001/002/003/006, AC-001/002/005 | Skills → Sources | Compact rows, display name, count labels; list-only scroll | DS-001 |
| BEH-002/003 | User | REQ-005, AC-004 | Add | Single input; URL → import, else → add folder; Browse… | DS-002 |
| BEH-004 | User | REQ-004, AC-003 | Trash / Retry removal | Same confirmation + source card | DS-003 |
| BEH-005 | User/System | REQ-007, AC-006 | Open (auto check), Update, Try again | Status line rules; tooltip; update confirmation version line | DS-001, DS-003, DS-004 |
| BEH-006 | User | REQ-009 | Any operation | Busy disabling, alerts above form | DS-002..004 |
| BEH-007 | User | REQ-008, AC-007 | ×/Done/overlay/Esc, Tab | Focus in/trap/return; Esc ignored while confirming | DS-005 |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| Product `ui-ux-spec.md` + `visual-references/VIS-001..023` | Normative visuals/copy/states | REQ-001..010 | Implementation must match | Approved |
| Design repo commit `6810fc8` components/helper/strings | Reference implementation | REQ-001..010 | Port source (minus prototype hooks) | Validated by Product (20/20) |
| `design-reference/00-current-user-screenshot.png` | Before state | BEH-001 | Evidence | Final |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (UI redesign with approved interaction changes)
- Current design issue found: `No`
- Structural triggers considered:
  - Responsibility overload: the modal stays a single dialog owner. The display-name rule is extracted to a pure helper because both the row and the confirmation card use it.
  - Capability-area reuse: Browse… reuses `canUseLocalFolderPicker` + `pickFolderPath` rather than calling `window.electronAPI` directly.
  - Legacy cleanup: the mode switch and its strings are removed (no dual add UI).
  - Shared-folder trigger: no new `common/` component. The copy button is row-specific; its 1.5 s copied state differs from `CopyButton`'s styling, and the spec's icon sizes apply.
  - None of these triggers requires a refactor.
- Root cause classification: `No Design Issue Found`
- Refactor needed now: `No`
- Evidence: the store owns all behaviour, and the components are presentation and orchestration only (investigation notes).
- Design response: modify both components in place; add `utils/skills/skillSourceDisplay.ts`.
- Intentional deferrals: none.

## Terminology

- Display name: the row's leading label (see REQ-002).
- Repository URL detection (DC-017): `/^\s*(https?:\/\/|www\.|github\.com\/)/i`.

## Legacy Removal Policy (Mandatory)

- Obsolete in scope: the Local/GitHub mode switch (`mode` ref, `.input-modes` group), mode-specific labels/placeholders/buttons, the row's kind badge, the always-visible Check again button, and the row-level metadata `<dl>`.
- Compatibility wrappers / dual paths kept: `None`.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Decision: `Not Affected`. This is a presentation-only change, with no stored data read or written differently.

## Data-Flow Spine Inventory

| Spine | Scope | Behaviors | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001, BEH-005 | Sources button | Rendered rows with status | `SkillSourcesModal` | Load + auto-check + render |
| DS-002 | Primary | BEH-002/003 | Add submit | New row + alert | `SkillSourcesModal` | Operation selection by input |
| DS-003 | Primary | BEH-004/005 | Trash / Update / Retry removal | Store mutation + refresh | `SkillSourcesModal` | Confirmed mutations |
| DS-004 | Primary | BEH-005 | Try again | New status | `SkillSourcesModal` | Manual check after failure |
| DS-005 | Bounded local | BEH-007 | Mount / keydown / unmount | Focus in / trap / return | `SkillSourcesModal` | Accessibility |

## Primary Execution Spine(s)

- DS-001: `SkillsList (Sources) -> SkillSourcesModal.onMounted -> skillSourcesStore.fetchSkillSources -> checkGitHubSources -> GraphQL server -> SkillSourceRow render`
- DS-002: `Add input submit -> SkillSourcesModal.handleAdd (URL? import : add) -> skillNamesStore.runWithSkillNameChecks -> skillSourcesStore.githubOperation('import') | addSkillSource -> server -> refreshCatalog (skillStore.fetchAllSkills + skillNames.fetchIssues) -> alert/new row`
- DS-003: `SkillSourceRow emit(remove|update) -> SkillSourcesModal.confirmation -> ConfirmationModal confirm -> confirmAction -> runWithSkillNameChecks -> store.removeSkillSource | githubOperation(remove|update) -> refreshCatalog`
- DS-004: `SkillSourceRow emit(check) [CHECK_FAILED only] -> SkillSourcesModal.check -> githubOperation('check', id) -> row status`

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner | Off-spine |
| --- | --- | --- | --- |
| DS-001 | Opening fetches sources, then checks GitHub sources. Rows show *Checking…* (all disabled) until done, and the list renders sorted, Default first. | Modal | Display name helper, count labels |
| DS-002 | `handleAdd` trims the input, then decides import vs folder add with the DC-017 rule. Both go through the skill-name checks. On success the input clears, the success alert shows and the catalog refreshes; on failure the input is kept. | Modal | Browse… fills the input only |
| DS-003 | The row emits intent. The modal holds `confirmation` and makes the dialog inert. Confirming runs the same store call as today, then refreshes. | Modal | Confirmation source card |
| DS-004 | Try again is visible only for CHECK_FAILED and calls the existing check operation. | Modal | — |
| DS-005 | On mount, the modal records the active element and focuses the panel. Keydown handles Esc (close unless confirming) and the Tab cycle. On unmount, focus returns to the recorded element. | Modal | — |

## Spine Actors / Main-Line Nodes

`SkillsList` (opener), `SkillSourcesModal` (dialog owner), `SkillSourceRow` (row view), `skillSourcesStore` / `skillNamesStore` / `skillStore` (behaviour, unchanged).

## Ownership Map

- `SkillSourcesModal`: dialog lifecycle, focus, add-input state and operation selection, confirmation state, alerts, busy computation, catalog refresh.
- `SkillSourceRow`: presentation of one source (name, count, location + copy, status line, tooltip text, action visibility) and emitting intents. It must not call stores.
- `skillSourceDisplayName`: pure derivation of the display name.
- Stores: unchanged authoritative behaviour.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why unnecessary | Replaced by | Scope |
| --- | --- | --- | --- |
| `mode` ref + `.input-modes` buttons in `SkillSourcesModal.vue` | Single input (REQ-005) | `isRepositoryUrl` computed | In This Change |
| Row kind badge, metadata `<dl>`, always-visible Check again | REQ-002/007 | Icon tile + sr-only kind; status tooltip; Try again on CHECK_FAILED | In This Change |
| Strings `skills.sources.sourceType`, `skills.sources.repositoryUrl`, `skills.sources.import`, `skills.sources.check`, `skills.sources.status.REMOVING` (en + zh-CN `skills.ts`) | Made unused by this change (key grep: only the modal / catalogs reference them) | New keys per UI spec | In This Change |
| `skills.components.skills.SkillSourcesModal.add_new_source_folder`, `.absolute_path_to_skills_folder`, `.add_folder`, `.enter_the_absolute_path_to_a` (en + zh-CN `skills.generated.ts`) | Made unused (only the modal references them) | `skills.sources.addSource` / `inputPlaceholder` / `add` / `inputHint` | In This Change |
| `SkillSourcesModal.default`, `.custom`, `.remove_message`, `.remove_confirm`, `.add_success` (en + zh-CN `skills.ts`); `.scanning` (both `skills.ts` and `skills.generated.ts`) | Dead: already referenced by no component (grep shows catalogs only) | — | In This Change (touched catalogs) |
| Old scoped CSS in both components | Replaced by Tailwind classes from the reference | — | In This Change |

Implementation must re-run the key grep (including dynamic `t('skills.sources.status.' + …)` construction) before deleting. Keep `skills.sources.status.REMOVE`, `CHECK` and `UPDATE`, which are used dynamically for pending states, and keep every `status.<GitHubStatus>` key except `REMOVING`. `REMOVING` is replaced by `REMOVING_SHORT` in the row; verify that the store/other code doesn't use `REMOVING` for text. Respect `pnpm guard:localization-boundary` and `pnpm audit:localization-literals`.

## Return Or Event Spine(s) (If Applicable)

Row → modal emits (`check`, `update`, `remove`): unchanged event contract.

## Bounded Local / Internal Spines (If Applicable)

DS-005 (focus) inside `SkillSourcesModal`: `mount → record opener → focus panel → keydown(Tab/Esc) → unmount → restore focus`.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility |
| --- | --- | --- | --- |
| `skillSourceDisplayName` | DS-001, DS-003 | Row + confirmation card | Display name |
| Folder picker gating (`canUseLocalFolderPicker`, `pickFolderPath`) | DS-002 | Modal | Browse… availability and picking |
| Clipboard copy | DS-001 | Row | Copy location, 1.5 s copied state |

## Ownership Boundaries

The components call stores only through their public actions. Browse… goes only through `pickFolderPath`; it never calls `window.electronAPI` directly. The row never calls stores.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden bypass |
| --- | --- | --- | --- |
| `skillSourcesStore` | GraphQL operations | Modal | Modal calling Apollo directly |
| `pickFolderPath` | Electron IPC | Modal | `window.electronAPI.showFolderDialog()` in the modal (the gating check `typeof … === 'function'` mirrors `ChatWorkspaceMenu` and is allowed) |

## Dependency Rules

- `SkillSourceRow` → `skillSourceDisplay`, localization, Iconify. No store imports.
- `SkillSourcesModal` → stores, `skillSourceDisplay`, `mobileFeatureGates`, `useNativeFolderDialog`, `windowNodeContextStore`, `ConfirmationModal`, `SkillSourceRow`.
- No imports from the design repo's `prototype/`.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity |
| --- | --- | --- | --- |
| `SkillSourceRow` props `{ source, pending?, disabled }`, emits `check \| update \| remove` | One source | Render + intents | `SkillSource` object (unchanged) |
| `skillSourceDisplayName(source: Pick<SkillSource,'path'\|'github'>): string` | Source label | Pure derivation | — |

## Interface Boundary Check

| Interface | Singular | Explicit identity | Risk |
| --- | --- | --- | --- |
| Row props/emits | Yes | Yes | Low |
| `skillSourceDisplayName` | Yes | Yes | Low |

## Main Domain Subject Naming Check

| Name | Natural | Note |
| --- | --- | --- |
| `skillSourceDisplayName` | Yes | — |
| `isRepositoryUrl` | Yes | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Folder picker | `useNativeFolderDialog` + `canUseLocalFolderPicker` | Reuse |
| Confirmation | `ConfirmationModal` | Reuse (slot content only) |
| Copy | `CopyButton` | Not reused. Its 20 px icon, grey hover and "Copy source code" default don't match the spec (14 px icon in a 24 px button, emerald check, "Copy path/URL/Copied"); a small inline button in the row is clearer than widening `CopyButton`'s API |
| Spinner | `svg-spinners:ring-resize` (already used) | Reuse |

## Subsystem / Capability-Area Allocation

Skills UI (`components/skills`, `utils/skills`), localization catalogs: Extend.

## Draft File Responsibility Mapping / Final File Responsibility Mapping

| File | Change | Concern |
| --- | --- | --- |
| `autobyteus-web/components/skills/SkillSourcesModal.vue` | Modify (port `6810fc8`) | Dialog shell, add input + detection + Browse…, alerts, confirmation body, focus |
| `autobyteus-web/components/skills/SkillSourceRow.vue` | Modify (port `6810fc8`) | Row presentation, status line, tooltip, copy |
| `autobyteus-web/utils/skills/skillSourceDisplay.ts` | Add (port `6810fc8`) | Display name rule |
| `autobyteus-web/localization/messages/{en,zh-CN}/skills.ts` | Modify | Add new keys (UI spec §Content; port `6810fc8`, ensure zh-CN has every new key); remove unused/dead keys |
| `autobyteus-web/localization/messages/{en,zh-CN}/skills.generated.ts` | Modify | Remove unused/dead keys listed above |
| `autobyteus-web/components/skills/SkillSourcesModal.spec.ts` | Modify | Update selectors; cover AC-003/004/006/007 |
| `autobyteus-web/components/skills/__tests__/SkillSourceRow.spec.ts` (or colocated per folder convention) | Add | AC-001/002/006 row rendering |
| `autobyteus-web/utils/skills/__tests__/skillSourceDisplay.spec.ts` | Add | Display name cases |
| `autobyteus-web/docs/skills.md` | Modify | Update the UI description (single input, Try again after failed check, trash icon, Browse…) |

## Reusable Owned Structures Check / Shared Structure Tightness Check

Only `skillSourceDisplayName`, which is shared by the row and the confirmation card. It is tight and has no fields.

## Applied Patterns (If Any)

None.

## Target Subsystem / Folder / File Mapping

As in the file mapping above. The layout follows existing folders (`components/skills`, `utils/skills`, `localization/messages`).

## Folder Boundary Check

| Path | Depth | Clear | Risk |
| --- | --- | --- | --- |
| `utils/skills/` | Off-spine concern | Yes | Low (existing folder with `skillNames.ts`) |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoid |
| --- | --- | --- |
| Operation selection | `isRepositoryUrl ? store.githubOperation('import', undefined, v) : store.addSkillSource(v)` inside `runWithSkillNameChecks` | Keeping a hidden mode ref alongside detection |
| Display name | `/Users/a/.codex/skills` → `.codex/skills`; `/x/skills-library` → `skills-library`; `https://github.com/acme/docs-skills(.git)` → `acme/docs-skills` | Showing the full path as the name |
| Browse… | `pickerEligible = canUseLocalFolderPicker({ isEmbeddedWindow, hasElectronFolderDialog })`; `pickFolderPath()` fills `newPath`, focus back to input | Auto-submitting after picking |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep Local/GitHub switch as fallback | Familiarity | Rejected | Single input (approved) |
| Keep "Check again" on all GitHub rows | Previous behaviour | Rejected (user-approved change) | Auto check on open + Try again on failure |
| Keep old string keys | Avoid catalog churn | Rejected | Remove unused keys |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Add `utils/skills/skillSourceDisplay.ts` + test.
2. Add the new localization keys (en + zh-CN) from the UI spec / `6810fc8`.
3. Port `SkillSourceRow.vue` and `SkillSourcesModal.vue` from `6810fc8`. Verify there are no prototype imports and that `Icon` usage matches the production pattern (explicit `import { Icon } from '@iconify/vue'`).
4. Update and add component tests; run the targeted tests.
5. Remove unused/dead localization keys after re-grepping; run `guard:localization-boundary`, `audit:localization-literals`, and typecheck/lint as available.
6. Update `docs/skills.md`.
7. Render-check the popup against VIS-001..023 (TESTING.md browser probe / isolated desktop instance), including the many-sources scroll and Browse… in the desktop context.

## Key Tradeoffs

- Porting the Product reference code rather than re-authoring it gives the highest fidelity to the approved visuals at the lowest risk. The cost is Tailwind arbitrary values (`text-[13px]`, `max-w-[45rem]`), which already appear elsewhere in the app.
- An inline copy button instead of `CopyButton`: a small duplication versus widening a common component's API for one use.

## Risks

- Icons load through Iconify online, as for all icons in the app. `mdi:github` and `heroicons:shield-exclamation` are new names (`heroicons:arrow-up-circle` is no longer used after SR-003) but use the same mechanism; if they are offline they degrade like every other icon. Accepted.
- Input such as `gitlab.com/x` (no scheme) is treated as a folder path; the user accepted this.
- The native `title` tooltip is pointer-only. The same information appears in the Update confirmation (spec limitation).

## Guidance For Implementation

- SR-003: the Update and Retry removal chips are text-only. This deviates from the design repo `6810fc8` code and from VIS-001/VIS-003; the requirements-doc UI section is authoritative.

- The normative source is the Product `ui-ux-spec.md` + VIS-001..023. The reference code is `git -C /Users/normy/autobyteus_org/autobyteus-web-design show 6810fc8:autobyteus-web-relative-path`; the paths in that repo are app-root-relative (e.g. `components/skills/SkillSourcesModal.vue`).
- Do not port `prototype/**` or the design repo's `utils/apolloClient.ts` changes.
- Keep store calls exactly as today, and keep `confirmAction`'s `runWithSkillNameChecks` wrapping.
- Tests must assert outcomes (store calls, visible labels, aria names, visibility rules), not Tailwind class strings.
- The product validation script list (V01–V20 in the design repo's `prototype/skill-sources/review-scripts/validate.mjs`) is a useful checklist for component tests.
