# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready / Approved

## Goal / Problem Statement

Improve the desktop/web team run configuration form so global run settings are discoverable, long member override sections are visibly collapsible, and expanded member override forms feel less visually overwhelming.

The user-reported pain points are:

1. `Auto approve tools` is a global team-run setting but currently appears after the Team Members Override section, so it can be pushed below a long member list and missed by new users.
2. `Team Members Override` is clickable, but the current affordance is missing or invisible in the actual UI screenshot, so users do not know it expands/collapses.
3. Expanded member override rows produce too many close borders/lines, especially with six or more members, making the form feel heavy and overwhelming.

## Investigation Findings

- `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` owns the affected surface.
- Team-level `autoExecuteTools` already exists on `TeamRunConfig`, is rendered by `TeamRunConfigForm.vue`, and is propagated to leaf member launch records through `buildTeamRunMemberConfigRecords(...)`. No backend or data-model change is needed.
- `AgentRunConfigForm.vue` already places `Auto approve tools` immediately after `WorkspaceSelector`, so the team form can be brought into parity by moving the existing team auto-approve row above Team Members Override.
- Team Members Override already has local disclosure state (`overridesExpanded`) and a clickable button, but the button lacks `aria-expanded`/`aria-controls` and uses an `i-heroicons-chevron-right-20-solid` CSS class. The project primarily uses `@iconify/vue` or inline SVG for visible chevrons; the user screenshot confirms this chevron is not visible in practice.
- Current Team Members Override default state is `ref(true)` in source, while screenshots show collapsed/expanded states inconsistently. The desired target should explicitly default collapsed on initial render so the global settings remain visible and the form starts less dense.
- `MemberOverrideTree.vue` and `MemberOverrideItem.vue` create visual density through separate bordered white cards (`border-gray-200`) in a tight `space-y-2` list plus nested group borders/left borders. The expanded state needs lighter grouping/separation rather than repeated full-strength card outlines.
- Existing docs state selected/read-only team configs keep member overrides inspectable. The redesigned collapsed section must preserve inspectability by expansion, not remove controls or mutate historical configs.
- Member override labels currently repeat the word `Override` (`Runtime Override`, `LLM Model Override`) and inherited placeholders are verbose (`Use global runtime default`, `Use global model (default)`). Since the enclosing section is already Team Members Override, the row copy can be shortened without losing meaning.
- A targeted Vitest probe could not run in the new worktree because dependencies are not installed there (`Command "vitest" not found`). Downstream implementation should run focused tests in an environment with dependencies installed.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UX Cleanup
- Initial design issue signal (`Yes`/`No`/`Unclear`): No broad architecture issue found
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local Implementation Defect
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed
- Evidence basis: The existing `TeamRunConfigForm.vue` is the correct owner for composition/order, and the existing `TeamRunConfig`/member-config propagation already owns the configuration semantics. The problem is local presentation order, missing/invisible disclosure affordance, and overly heavy local styling.
- Requirement or scope impact: Keep all run configuration semantics and stores intact; retune only the team form layout/disclosure/styling and associated component tests/docs if impacted.

## Recommendations

- Move the existing team `Auto approve tools` row to immediately follow the workspace selector, before Team Members Override.
- Make Team Members Override a proper disclosure header with a real visible chevron (`@iconify/vue` `Icon` or inline SVG), `aria-expanded`, `aria-controls`, and keyboard/click accessibility.
- Default Team Members Override collapsed on initial render. The header should remain visible and include the leaf-member count; if practical, include a small nonintrusive active-override count when any member has an explicit override so collapsed state does not hide that fact.
- Preserve all existing member override controls and config mutation behavior when expanded.
- Retune expanded member override styling to reduce the “double border”/many-lines effect by treating the members as one connected list surface: use one outer border and one shared separator line between adjacent members, rather than separate bordered cards with gaps.
- Use stable `data-test` selectors for the auto-approve row and override disclosure so tests do not depend on class names such as `button.w-full`.
- Shorten member override row copy: use `Runtime`, `LLM Model`, and concise inherited/default option text such as `Global default`; avoid repeating `Override` inside every row because the section header already establishes override context.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: A user opens a new/editable team run configuration and needs to find global Auto approve tools without scrolling through long team member overrides.
- UC-002: A user sees the Team Members Override section and can immediately understand it is expandable/collapsible because a visible chevron is shown.
- UC-003: A user works with teams that have many members and should not be overwhelmed by all member override controls expanded at once.
- UC-004: A user expands Team Members Override and reviews/edits per-member override details without changing existing configuration semantics.
- UC-005: A user views selected/historical/read-only team configuration; global controls and member overrides remain read-only, and member overrides remain inspectable after expansion.

## Out of Scope

- Changing the underlying `TeamRunConfig` or `MemberConfigOverride` data model.
- Changing backend team launch, approval, or member config semantics.
- Adding new configuration options beyond layout/disclosure/styling and optional collapsed-summary text.
- Redesigning the entire run config panel, agent run config form, workspace selector, model selection widgets, or right-side Team tab.
- Adding per-member collapsible rows unless implementation determines it is necessary to meet the visual-density acceptance criteria without destabilizing existing member override behavior.

## Functional Requirements

- REQ-TRC-001: The team run configuration form MUST render the team-level `Auto approve tools` control directly after `WorkspaceSelector` and before Team Members Override.
- REQ-TRC-002: The moved team-level `Auto approve tools` control MUST keep the same binding to `config.autoExecuteTools`, label/help text, disabled/read-only behavior, and no-op update behavior when locked/read-only.
- REQ-TRC-003: When the selected team has at least one leaf member, the form MUST render a Team Members Override disclosure header with a visible chevron on the section header.
- REQ-TRC-004: The Team Members Override disclosure header MUST expose accessible state (`aria-expanded`, `aria-controls`) and support pointer and keyboard activation through a native button.
- REQ-TRC-005: Team Members Override content MUST default collapsed on initial render so member override controls do not push global settings downward or overwhelm the first view.
- REQ-TRC-006: Expanding Team Members Override MUST reveal the existing member override tree and preserve all current member override behavior: runtime override, model override, tri-state auto-execute override, inherited/effective model config display, advanced model config handling, pruning on global runtime/model changes, and read-only no-ops.
- REQ-TRC-007: Collapsing or expanding Team Members Override MUST NOT mutate `config.memberOverrides`, `config.autoExecuteTools`, runtime/model fields, workspace fields, or historical/read-only config data.
- REQ-TRC-008: The expanded member override tree MUST reduce visual density compared with the current repeated close-bordered cards. Adjacent sibling member rows SHOULD share a single border/separator at the same location, not render two nearby card borders separated by a gap.
- REQ-TRC-009: The implementation MUST keep the team form's state ownership local to `TeamRunConfigForm.vue` and existing child presentation components; it MUST NOT introduce duplicate approval state, backend aliases, or compatibility wrappers.
- REQ-TRC-010: The implementation MUST add or update focused frontend component tests for ordering, disclosure affordance/default state, expansion behavior, read-only behavior, and at least one existing member override edit path after expansion.
- REQ-TRC-011: Member override row copy MUST be concise and avoid repeating `Override` in every field label when the parent section already establishes override context. At minimum, `Runtime Override` should become `Runtime`, `LLM Model Override` should become `LLM Model`, inherited/default option copy should use concise wording such as `Global default`, and member auto-approval copy should align with the global `Auto approve tools` label rather than legacy `Auto-execute` wording.

## Acceptance Criteria

- AC-TRC-001: Given a team run config with six leaf members, when the form first renders, the `Auto approve tools` row appears before the `Team Members Override` header in DOM and visual order.
- AC-TRC-002: Given the same initial render, the Team Members Override panel content is collapsed/hidden and the header remains visible with the leaf-member count.
- AC-TRC-003: Given Team Members Override is collapsed, its section header includes a visible chevron icon and reports `aria-expanded="false"`.
- AC-TRC-004: When the user activates the Team Members Override header, the chevron visibly changes orientation, `aria-expanded` becomes `true`, and the member override tree becomes visible.
- AC-TRC-005: When the user activates the header again, the content hides, `aria-expanded` becomes `false`, and no config fields are mutated by the collapse action.
- AC-TRC-006: Given the form is editable and expanded, changing a member runtime/model/auto-execute/model config still updates `config.memberOverrides` exactly through the existing meaningful-override rules.
- AC-TRC-007: Given the form is read-only or locked, the moved Auto approve control and member override controls are disabled/no-op, while the Team Members Override disclosure itself can still open for inspection.
- AC-TRC-008: Given the expanded member list contains adjacent members, the visual boundary between two sibling members appears as one separator/border line, not two close full-strength card borders; the list remains scannable.
- AC-TRC-009: Given a nested team group appears inside Team Members Override, nested grouping remains understandable but does not add heavy competing borders that obscure parent/child hierarchy.
- AC-TRC-010: Focused tests in `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` cover the new order, collapsed default, visible/accessibility disclosure state, expansion, and read-only inspectability.
- AC-TRC-011: No backend tests require updates solely because of this UI retune; `TeamRunConfig`, `MemberConfigOverride`, and `buildTeamRunMemberConfigRecords(...)` semantics remain unchanged.
- AC-TRC-012: Given the override section is expanded, member row labels show concise copy (`Runtime`, `LLM Model`, `Auto approve`, `Global default`-style inherited options) and do not repeat `Override` in each field label or legacy `Auto-execute` wording.

## Constraints / Dependencies

- Must respect the existing Vue/Nuxt/Tailwind component patterns.
- Must keep current configuration save/read-only behavior intact.
- Must account for both editable new run configuration and selected historical/read-only run configuration states.
- Must use actual rendered icons (`@iconify/vue` `Icon` or inline SVG), not unsupported icon CSS utility classes for the mandatory chevron.
- Must keep localization boundaries intact for any new user-facing text.
- Must not add backend/API work for this UI-only change.

## Assumptions

- The referenced screenshots are from the current Autobyteus desktop/web Team Configuration surface.
- `TeamRunConfigForm.vue` remains the correct composition owner for ordering global and member override controls.
- Default-collapsing Team Members Override is acceptable as long as a clear header, count, and accessible expansion remain available.

## Risks / Open Questions

- If a team run is seeded from an existing run with explicit member overrides, default-collapsed content could hide important differences. Mitigation: show an active-override count/badge in the header when nonzero, if implementation can do so cleanly with existing `hasMeaningfulMemberOverride(...)`.
- If member override content is kept mounted under `v-show`, initial hidden controls may still do model-selection work. If implementation wants to avoid hidden work, it may switch to `v-if` plus a once-expanded guard, but it must preserve user edits and test behavior.
- The exact visual-density styling should be finalized in implementation with screenshots/browser verification because component tests cannot judge perceived visual noise.

## Requirement-To-Use-Case Coverage

| Use Case | Covered Requirements |
| --- | --- |
| UC-001 | REQ-TRC-001, REQ-TRC-002, REQ-TRC-005 |
| UC-002 | REQ-TRC-003, REQ-TRC-004 |
| UC-003 | REQ-TRC-005, REQ-TRC-008, REQ-TRC-011 |
| UC-004 | REQ-TRC-006, REQ-TRC-007, REQ-TRC-009, REQ-TRC-011 |
| UC-005 | REQ-TRC-002, REQ-TRC-006, REQ-TRC-007 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-TRC-001 | Global auto-approve discoverability and ordering |
| AC-TRC-002 | Initial density reduction |
| AC-TRC-003 | Visible collapsed disclosure affordance |
| AC-TRC-004 | Expand affordance and accessibility state |
| AC-TRC-005 | Collapse behavior does not mutate config |
| AC-TRC-006 | Existing editable member override semantics survive |
| AC-TRC-007 | Existing read-only/locked semantics survive while inspectability remains |
| AC-TRC-008 | Sibling member card visual-density problem is reduced |
| AC-TRC-009 | Nested team visual hierarchy remains understandable without heavy lines |
| AC-TRC-010 | Durable frontend test coverage for requested behavior |
| AC-TRC-011 | Confirms UI-only scope and backend/data model stability |
| AC-TRC-012 | Concise text reduces repeated override wording in dense member rows |

## Approval Status

Approved by user on 2026-07-08 after reviewing the text UI wireframes and confirming the concise-copy direction. User asked to “kick off the ticket.”
