# Design Spec

## Current-State Read

The Skills route is rendered by `autobyteus-web/pages/skills.vue`. In list mode, the page renders `SkillsList`; in detail mode, it renders `SkillDetail`. The redundant header is not part of shared shell navigation and is not owned by the route wrapper. It is local markup in `autobyteus-web/components/skills/SkillsList.vue`.

Current Skills list flow:

`Sidebar / route navigation -> pages/skills.vue list mode -> SkillsList.vue -> skillStore.fetchAllSkills() -> toolbar/filter/card grid`

`SkillsList.vue` currently renders a `.skills-header` containing two different concerns:

1. Duplicate page identification: `.header-left` with `<h2>Skills</h2>` and subtitle text.
2. Actual list toolbar: search input, `Sources`, `Reload`, and `Create Skill` actions.

`AgentList.vue` and `AgentTeamList.vue` provide the requested sibling pattern: list content starts with the search/action toolbar and does not render a standalone duplicate page title/subtitle above it.

No store, API, route, or data-model issue was found. The current owner (`SkillsList.vue`) can absorb the change cleanly.

## Intended Change

Make the Skills list view toolbar-first by removing the redundant title/subtitle block from `SkillsList.vue`, while preserving all toolbar controls, list states, cards, dialogs, and handlers. Convert the header-oriented wrapper/styling into a toolbar-only structure so the layout does not reserve title/subtitle spacing.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / Behavior Change
- Current design issue found (`Yes`/`No`/`Unclear`): No
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No
- Evidence: The duplicate title/subtitle are local markup and CSS in `SkillsList.vue`. The sibling pages already show the intended toolbar-first pattern. `pages/skills.vue`, `skillStore.ts`, and GraphQL contracts remain correctly owned and unaffected.
- Design response: Perform a local component presentation cleanup in `SkillsList.vue`; remove header-only localization keys if unused; add focused component regression coverage.
- Refactor rationale: No broader refactor is needed because ownership, boundaries, API shape, file placement, and data structures remain healthy. The existing `SkillsList.vue` owner is the right place for Skills list presentation.
- Intentional deferrals and residual risk, if any: Durable docs wording (`docs/skills.md` refers to “Skills list header”) can be resolved during delivery docs sync after implementation is integrated. Residual risk is only minor visual spacing, to be checked by frontend smoke/visual verification.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the obsolete title/subtitle markup and any styles/localization keys that exist only for that removed UI.
- No feature flag, compatibility wrapper, or alternate legacy header path is allowed.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User opens Skills sidebar/route | Skills list toolbar and skill cards render without redundant header copy | `SkillsList.vue` list presentation owner behind `pages/skills.vue` route wrapper | Captures the visible behavior being changed. |
| DS-002 | Bounded Local | User enters a Skills search query | Filtered skill cards / empty filtered state render | `SkillsList.vue` | Confirms header removal must not disturb existing filtering/list-state behavior. |
| DS-003 | Bounded Local | User activates toolbar action (`Sources`, `Reload`, `Create Skill`) | Existing modal/reload/create behavior executes | `SkillsList.vue` with `skillStore` for data operations | Confirms toolbar controls remain intact after removing adjacent header markup. |

## Primary Execution Spine(s)

`Sidebar / /skills route -> pages/skills.vue list mode -> SkillsList.vue toolbar-first render -> skillStore-backed list state -> SkillCard grid / state panel`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The user navigates to Skills. The route wrapper chooses list mode. `SkillsList.vue` renders the list toolbar first, then renders loading/error/empty/card-grid content from the skill store. | Route wrapper, Skills list, Skill catalog view | `SkillsList.vue` for list presentation; `pages/skills.vue` only for mode switching | Localization labels, skill store data, card components |
| DS-002 | Search remains local component state. Removing the header does not change the computed filter or the empty-filter state. | Search input, filter computed, list content | `SkillsList.vue` | Localized placeholder and empty text |
| DS-003 | Toolbar button handlers remain attached to the same actions. Removing the title/subtitle changes only adjacent presentation markup. | Toolbar button, modal/reload/create handler, store operation | `SkillsList.vue` | `SkillSourcesModal`, `ConfirmationModal`, `skillStore` |

## Spine Actors / Main-Line Nodes

- Sidebar / `/skills` route: initiates navigation to Skills.
- `pages/skills.vue`: selects list or detail mode.
- `SkillsList.vue`: governs list presentation, toolbar, filtering, and card actions.
- `skillStore`: supplies skill catalog data and operations.
- `SkillCard` / state panels: render list content below the toolbar.

## Ownership Map

- `pages/skills.vue` owns list/detail mode state (`selectedSkillName`) and reset when selected skill disappears.
- `SkillsList.vue` owns the Skills list layout, toolbar controls, local search state, reload feedback, create/source/delete UI state, and skill card event handling.
- `skillStore.ts` owns skill data fetching and mutations.
- `AgentList.vue` and `AgentTeamList.vue` are reference implementations only; they must not become shared owners for this task.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `pages/skills.vue` | `SkillsList.vue` for list presentation; `SkillDetail.vue` for detail presentation | Route-level mode switching | Toolbar layout, filtering, skill card behavior |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `<div class="header-left">` in `SkillsList.vue` | It renders duplicate page identity above the toolbar. | Toolbar-first `SkillsList.vue` layout | In This Change | Delete, do not hide with CSS. |
| `<h2>{{ $t('skills.components.skills.SkillsList.title') }}</h2>` | Redundant main-content heading. | Sidebar selection + toolbar-first layout | In This Change | Do not move this title elsewhere. |
| Subtitle `<p class="subtitle">...manage_and_create...</p>` | Redundant explanatory copy. | Toolbar-first layout | In This Change | Do not retain as visually hidden text unless an accessibility requirement is discovered. |
| `.header-left h2` and `.subtitle` styles | Only support removed markup. | Toolbar-only styles | In This Change | Remove dead CSS. |
| Header-only localization keys (`SkillsList.title`, `SkillsList.manage_and_create_file_based_capabilities`) | No active UI references should remain. | None | In This Change | Remove from en/zh catalogs if `rg` confirms no remaining references. |
| Docs phrase “Skills list header” in `autobyteus-web/docs/skills.md` | May become stale after toolbar-only UI. | Docs sync wording “toolbar” | Follow-up during delivery docs sync | Delivery owns durable docs update/no-impact after integrated state. |

## Return Or Event Spine(s) (If Applicable)

Not applicable. This is a synchronous UI rendering cleanup; no event propagation contract changes.

## Bounded Local / Internal Spines (If Applicable)

- `SkillsList.vue` search/filter local spine: `Search input -> searchQuery ref -> filteredSkills computed -> grid/empty state`.
- `SkillsList.vue` reload local spine: `Reload button -> handleReloadCatalog -> skillStore.reloadSkillCatalog -> success/error message`.

These local spines remain unchanged except for their toolbar placement.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Localization catalogs | DS-001, DS-002, DS-003 | `SkillsList.vue` UI labels | Provide translated labels/placeholders/messages | Product UI uses localization boundary | Inline strings or stale keys could violate localization cleanup expectations. |
| Focused component tests | DS-001, DS-003 | Skills list owner | Prevent regression of redundant header and toolbar behavior | Small UI cleanup needs durable coverage | Without tests, duplicate title/subtitle can return unnoticed. |
| Visual smoke/manual check | DS-001 | Skills list owner | Confirm toolbar-first spacing looks consistent | Layout task is visual | Pure unit tests may miss awkward spacing. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Skills list presentation | `components/skills/SkillsList.vue` | Reuse | It already owns list toolbar and card rendering. | N/A |
| Skills data operations | `stores/skillStore.ts` | Reuse unchanged | Data behavior is not part of the defect. | N/A |
| Sibling layout reference | `components/agents/AgentList.vue`, `components/agentTeams/AgentTeamList.vue` | Reuse as pattern only | They demonstrate toolbar-first behavior. | N/A |
| Test coverage | Existing Vitest component specs | Extend | Current test suite already mounts `SkillsList.vue`. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Skills frontend module | Skills list toolbar, list states, skill cards, create/source/reload/delete UI | DS-001, DS-002, DS-003 | `SkillsList.vue` | Extend locally | Remove header-only markup; no module split. |
| Localization catalogs | Translated labels/copy | DS-001, DS-003 | Skills UI | Reuse / clean up | Remove header-only keys if unused. |
| Frontend test suite | Component/page regression tests | DS-001, DS-003 | Skills UI | Extend | Add absence/preservation assertions. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/skills/SkillsList.vue` | Skills frontend module | Skills list presentation | Remove duplicate header and convert header wrapper to toolbar-only structure/styles | Existing owner of the affected UI | Existing skill types/store only |
| `autobyteus-web/components/skills/SkillsList.spec.ts` | Frontend test suite | Skills list component tests | Assert redundant header/subtitle absence and toolbar preservation | Existing focused tests for component | Existing test fixtures |
| `autobyteus-web/localization/messages/en/skills.ts` | Localization catalogs | English Skills messages | Remove `SkillsList.title` if unused | Header-only key cleanup | N/A |
| `autobyteus-web/localization/messages/zh-CN/skills.ts` | Localization catalogs | zh-CN Skills messages | Remove `SkillsList.title` if unused | Header-only key cleanup | N/A |
| `autobyteus-web/localization/messages/en/skills.generated.ts` | Localization catalogs | English generated Skills messages | Remove `manage_and_create_file_based_capabilities` if unused | Header-only key cleanup | N/A |
| `autobyteus-web/localization/messages/zh-CN/skills.generated.ts` | Localization catalogs | zh-CN generated Skills messages | Remove `manage_and_create_file_based_capabilities` if unused | Header-only key cleanup | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | No repeated structure is introduced or changed. | Yes | Yes | A generic page-header abstraction |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Skill data models | Yes | N/A | Low | No data model change. |
| Localization keys | Yes after cleanup | Yes | Low | Remove header-only keys if unused. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/skills/SkillsList.vue` | Skills frontend module | Skills list presentation | Toolbar-first Skills list layout; preserve search/actions/list states | One local UI owner; no need to split | Existing store/types |
| `autobyteus-web/components/skills/SkillsList.spec.ts` | Frontend test suite | Skills list component coverage | Regression coverage for removed header/subtitle and existing toolbar behavior | Existing focused spec | Existing fixtures/stubs |
| `autobyteus-web/localization/messages/en/skills.ts` | Localization catalogs | English Skills manual messages | Remove unused title key if confirmed unused | Catalog cleanup | N/A |
| `autobyteus-web/localization/messages/zh-CN/skills.ts` | Localization catalogs | zh-CN Skills manual messages | Remove unused title key if confirmed unused | Catalog cleanup | N/A |
| `autobyteus-web/localization/messages/en/skills.generated.ts` | Localization catalogs | English Skills generated messages | Remove unused subtitle key if confirmed unused | Catalog cleanup | N/A |
| `autobyteus-web/localization/messages/zh-CN/skills.generated.ts` | Localization catalogs | zh-CN Skills generated messages | Remove unused subtitle key if confirmed unused | Catalog cleanup | N/A |

## Ownership Boundaries

- `SkillsList.vue` is the authoritative owner for list presentation. Upstream route code should not duplicate or compensate for list toolbar layout.
- `skillStore.ts` remains the authoritative owner for skill catalog operations. UI cleanup must not bypass or alter store behavior.
- Localization catalogs remain the authoritative source for visible product strings. Do not replace removed localized strings with inline literals.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `SkillsList.vue` | Search/filter state, toolbar actions, cards/states | `pages/skills.vue` | Route wrapper manually adding/removing Skills list toolbar/header pieces | Adjust `SkillsList.vue` presentation |
| `skillStore.ts` | Fetch/reload/create/delete/enable/disable skill operations | `SkillsList.vue` | UI component directly invoking GraphQL for this cleanup | Keep store calls unchanged |
| Localization runtime/catalogs | Translated UI copy | Vue templates/scripts | Inline replacement strings for toolbar labels | Use existing keys or catalog cleanup |

## Dependency Rules

- `pages/skills.vue` may render `SkillsList` and handle `viewDetail`; it must not own toolbar markup.
- `SkillsList.vue` may depend on `skillStore`, `SkillCard`, `SkillSourcesModal`, `ConfirmationModal`, `Icon`, and localization as it already does.
- `SkillsList.vue` must not import or depend on `AgentList.vue` / `AgentTeamList.vue`; those are reference patterns only.
- Do not add a shared page-header component or compatibility prop for the removed header.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `SkillsList` `viewDetail` emit | Skill selection | Notify page wrapper to show detail | `skillName: string` | Unchanged. |
| `skillStore.fetchAllSkills()` | Skill catalog | Initial list load | None | Unchanged. |
| `skillStore.reloadSkillCatalog()` | Skill catalog reload | Toolbar reload action | None | Unchanged. |
| `skillStore.createSkill(payload)` | Skill creation | Create dialog submit | `{ name, description, content }` | Unchanged. |
| `skillStore.deleteSkill(name)` | Skill deletion | Delete confirmation | `skillName: string` | Unchanged. |
| `skillStore.enableSkill/disableSkill(name)` | Skill disabled state | Card toggle action | `skillName: string` | Unchanged. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `viewDetail` emit | Yes | Yes | Low | None. |
| Skill store methods | Yes | Yes | Low | None. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Skills list component | `SkillsList.vue` | Yes | Low | Keep. |
| Header wrapper | `.skills-header` -> toolbar-only name such as `.skills-toolbar` | Yes if renamed | Medium if old name remains | Prefer rename to communicate new responsibility. |
| Toolbar actions | `.header-actions` -> may remain or become `.toolbar-actions` | Yes if renamed | Low/Medium | Rename if touching styles for clarity; avoid dead “header” semantics. |

## Applied Patterns (If Any)

No new architecture pattern. This is local component presentation cleanup.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/skills/SkillsList.vue` | File | Skills list presentation | Toolbar-first list layout; no duplicate title/subtitle | Existing owner of list UI | Route-level mode logic, backend/API changes, shared Agent/Team code |
| `autobyteus-web/components/skills/SkillsList.spec.ts` | File | Skills list component tests | Regression tests for removed header/subtitle and toolbar behavior | Existing focused spec | Broad E2E concerns |
| `autobyteus-web/localization/messages/en/skills.ts` | File | English Skills messages | Remove unused title message if no references remain | Existing catalog owner | Inline UI behavior |
| `autobyteus-web/localization/messages/zh-CN/skills.ts` | File | zh-CN Skills messages | Remove unused title message if no references remain | Existing catalog owner | Inline UI behavior |
| `autobyteus-web/localization/messages/en/skills.generated.ts` | File | English generated Skills messages | Remove unused subtitle message if no references remain | Existing catalog owner | Component logic |
| `autobyteus-web/localization/messages/zh-CN/skills.generated.ts` | File | zh-CN generated Skills messages | Remove unused subtitle message if no references remain | Existing catalog owner | Component logic |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/skills` | Main-Line Domain-Control / UI feature | Yes | Low | Existing Skills UI folder is correct for this local presentation cleanup. |
| `localization/messages` | Off-Spine Concern | Yes | Low | Existing catalog folder owns translated copy. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Skills list top layout | `SkillsList -> toolbar row -> list state/cards` | `SkillsList -> duplicate page title/subtitle -> toolbar row -> list state/cards` | Captures the requested simplification and sibling Agents/Teams pattern. |
| Markup removal | Delete header-left markup and obsolete styles | Hide subtitle/title with `display:none` while retaining keys/classes | Removal should be clean-cut, not legacy retention. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Feature flag to show old Skills header | Could preserve old UI | Rejected | Delete redundant header markup. |
| CSS-only hiding of `.header-left` | Quick visual removal | Rejected | Remove markup, dead styles, and unused localization keys instead. |
| Shared optional page-header prop | Could generalize page title behavior | Rejected | Sibling pages intentionally avoid duplicate page-level titles; no abstraction needed. |

## Derived Layering (If Useful)

Not needed. The existing UI component/store layering remains unchanged:

`Page wrapper -> SkillsList component -> skillStore -> GraphQL/backend`

Only the component presentation layer changes.

## Migration / Refactor Sequence

1. In `SkillsList.vue`, remove `.header-left` title/subtitle markup.
2. Rename or repurpose the wrapper from header semantics to toolbar semantics (for example `.skills-toolbar`) and keep the search/actions as first content.
3. Adjust toolbar spacing from header-oriented spacing to compact list-toolbar spacing; preserve responsive wrapping.
4. Remove obsolete `.header-left h2` and `.subtitle` CSS.
5. Run `rg` for `SkillsList.title` and `manage_and_create_file_based_capabilities`; remove corresponding en/zh localization keys if no references remain.
6. Update `SkillsList.spec.ts` with assertions that the redundant title/subtitle block is absent and toolbar controls remain present/usable. Keep existing reload tests passing.
7. Run focused tests if dependencies are available, preferably from `autobyteus-web`:
   - `pnpm test:nuxt -- components/skills/SkillsList.spec.ts pages/__tests__/skills.spec.ts --run`
   - If unavailable due to missing dependencies, record the exact blocker in the implementation handoff.
8. Perform visual smoke verification of `/skills` list mode if a local frontend can be launched.

## Key Tradeoffs

- Local cleanup over shared abstraction: chosen because the issue is isolated and sibling pages already implement the desired pattern without a shared page-header system.
- Remove obsolete localization keys rather than leave dead copy: chosen to keep catalogs aligned with active UI behavior.
- Avoid route wrapper changes initially: chosen because the duplicate header is wholly inside `SkillsList.vue`; page wrapper changes should only happen if visual verification proves toolbar spacing remains inconsistent.

## Risks

- Minor spacing mismatch could remain if the existing page/list padding still feels unlike Agents/Teams after header removal. Mitigation: visual smoke and small local spacing adjustment in `SkillsList.vue`; avoid broad shell rewrites unless necessary.
- Test execution may require dependency setup in the dedicated worktree. Mitigation: implementation records exact test command/result or setup blocker.

## Guidance For Implementation

- Keep the change small and local.
- Do not touch `skillStore.ts`, GraphQL files, or backend code.
- Preserve the order and behavior of search, `Sources`, `Reload`, and `Create Skill`.
- Prefer semantic cleanup (`skills-toolbar`, `toolbar-actions`) over retaining old `header` names when practical.
- Do not add a new shared header component.
- Include exact test results and any visual verification notes in the implementation handoff.
