# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)
Design-ready

## Goal / Problem Statement

Simplify the Memory UI by removing page/header text that repeats information already supplied by the active navigation state or the selected memory subject.

The current Memory Home shows a top `Memory` heading and descriptive subtitle even though the left navigation already has `Memory` selected. The current agent and team memory detail pages also show a large subject summary card above the actual runs list. For short names such as `Codex`, that top card consumes substantial vertical space while mostly restating the selected subject. The detail list then uses a generic `Runs` heading, forcing the real subject name to live in the wasteful summary card.

Target direction: make the primary content card carry the useful identity directly. On Memory Home, remove the redundant page title/subtitle and let the tab/search/card panel start the view. On detail pages, remove the oversized subject summary card and replace the generic `Runs` heading with the selected agent/team name itself.

## Investigation Findings

- User-provided detail screenshots show the page path: `Back to Memory`, a large `AGENT / Codex / 56 runs · ID: codex` summary card, then a separate runs card headed `Runs` with search controls.
- User-provided home screenshot shows the left navigation already highlights `Memory`, while the content repeats `Memory` as a page title plus `Inspect stored agent and team memories.` before the functional tab/search/card panel.
- `autobyteus-web/components/memory/AgentMemoryDetail.vue` renders the large agent summary block and generic `Runs` header.
- `autobyteus-web/components/memory/AgentTeamMemoryDetail.vue` renders the same summary-card/generic-runs pattern for team detail pages.
- `autobyteus-web/components/memory/MemoryHome.vue` renders the redundant top `Memory` heading and subtitle.
- Existing Memory explorer store and GraphQL list contracts already provide the selected subject names and list entries; no backend or state-model change is needed.
- Targeted Nuxt test execution could not run in the fresh dedicated worktree because `autobyteus-web/node_modules` is absent there (`cross-env: command not found`). This is an environment setup issue, not a code-path finding.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UI Cleanup
- Initial design issue signal (`Yes`/`No`/`Unclear`): No broad design issue; narrow presentation cleanup
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed
- Evidence basis: The affected code is localized to existing Vue presentation components. Current store, route, GraphQL, and memory data boundaries remain correct; the issue is redundant visual hierarchy and copy.
- Requirement or scope impact: Update only UI presentation, related localization keys/tests, and Memory documentation if docs still describe the removed headings.

## Recommendations

- Remove the Memory Home page-level heading/subtitle. Keep the tab/search/card section as the first meaningful content after the page padding.
- Remove the top subject summary cards from both agent and team memory detail pages for consistency.
- Replace the detail card's generic `Runs` title with the selected subject name (`Codex`, `Software Engineering Team`, etc.). Keep `Search runs...` because the input action still searches runs inside that subject.
- Do not add a replacement metadata block. The list cards, breadcrumbs/back labels, route state, and home cards already provide enough context. If implementation keeps any count/ID metadata, it must be compact and inline, not a separate card; however the preferred target is to remove the old summary metadata entirely.
- Remove or stop using now-obsolete localization keys for detail subject labels/generic run headings, and update tests that were asserting those old labels.

## Scope Classification (`Small`/`Medium`/`Large`)

Small

## In-Scope Use Cases

- UC-MEM-COMPACT-001: User opens Memory Home from the left navigation and immediately sees the functional memory browser tabs/search/cards without a redundant `Memory` page title/subtitle.
- UC-MEM-COMPACT-002: User opens an agent memory detail page and sees the selected agent name as the run list heading without a separate large `AGENT` summary card.
- UC-MEM-COMPACT-003: User opens an agent team memory detail page and sees the selected team name as the team-run list heading without a separate large `Agent Team` summary card.
- UC-MEM-COMPACT-004: User searches and pages through runs/team runs after the layout cleanup with unchanged behavior.
- UC-MEM-COMPACT-005: User selects a run/member target after the layout cleanup with unchanged inspector routing.

## Out of Scope

- Changing Memory explorer GraphQL APIs, backend memory grouping, stored memory layout, search semantics, pagination semantics, or inspector payload loading.
- Redesigning Memory card content, memory badges, run cards, member buttons, raw traces, or the sidebar navigation.
- Introducing new agent/team metadata or changing route query identity shapes.
- Changing the global shell navigation labels.

## Functional Requirements

- FR-MEM-COMPACT-001: Memory Home must not render the redundant top `Memory` page heading or the `Inspect stored agent and team memories.` subtitle above the memory browser panel.
- FR-MEM-COMPACT-002: Memory Home must keep the existing Agents/Agent Teams tab controls, tab-specific search placeholder, search action, cards, loading/empty/error states, and pagination behavior.
- FR-MEM-COMPACT-003: Agent Memory Detail must not render the large standalone subject summary card that contains the `Agent` label, selected agent name, run count, and ID metadata.
- FR-MEM-COMPACT-004: Agent Memory Detail must render the selected agent display name as the primary heading inside the run-list card where the generic `Runs` heading currently appears.
- FR-MEM-COMPACT-005: Agent Memory Detail must keep existing back navigation, run search, run-card rendering, memory badges, pagination, retry, empty/loading/error states, and inspect-run emission behavior.
- FR-MEM-COMPACT-006: Agent Team Memory Detail must not render the large standalone subject summary card that contains the `Agent Team` label, selected team name, run count, and ID metadata.
- FR-MEM-COMPACT-007: Agent Team Memory Detail must render the selected team name as the primary heading inside the team-run-list card where the generic `Runs` heading currently appears.
- FR-MEM-COMPACT-008: Agent Team Memory Detail must keep existing back navigation, team-run search, team-run card rendering, member memory buttons, memory badges, pagination, retry, empty/loading/error states, and inspect-member emission behavior.
- FR-MEM-COMPACT-009: The UI must not introduce a second replacement title block for the removed home or detail headers; the simplification must reduce visible vertical redundancy.
- FR-MEM-COMPACT-010: Tests and documentation that describe or assert the removed headings must be updated to the compact layout.

## Acceptance Criteria

- AC-MEM-COMPACT-001: On Memory Home, visible text no longer includes a standalone page title `Memory` or subtitle `Inspect stored agent and team memories.` above the tab/search/card panel, while the left sidebar still shows the selected `Memory` navigation item.
- AC-MEM-COMPACT-002: On Memory Home, the Agents and Agent Teams tabs, search input, Search button, memory cards, badges, and pagination remain visible and function as before.
- AC-MEM-COMPACT-003: On an agent detail page for `Codex`, the large `AGENT` summary card is absent.
- AC-MEM-COMPACT-004: On an agent detail page for `Codex`, the run-list card heading is `Codex` rather than `Runs`.
- AC-MEM-COMPACT-005: On an agent detail page, the removed summary metadata (`ID: <agent id>` and the separate summary-card run count line) is not rendered as a standalone block.
- AC-MEM-COMPACT-006: Agent detail search, retry, empty/loading/error states, pagination, run card click, and inspector route payload are unchanged by the layout cleanup.
- AC-MEM-COMPACT-007: On a team detail page, the large `Agent Team` summary card is absent and the team-run-list card heading is the selected team name rather than `Runs`.
- AC-MEM-COMPACT-008: Team detail search, retry, empty/loading/error states, pagination, member button click, and inspector route payload are unchanged by the layout cleanup.
- AC-MEM-COMPACT-009: Targeted frontend component/page tests assert the compact headings and absence of the removed redundant labels.
- AC-MEM-COMPACT-010: Any Memory documentation that still says detail pages use a `Runs` heading or that Memory Home starts with a `Memory` title is updated.

## Constraints / Dependencies

- Existing Memory explorer store/state APIs must remain the source of selected agent/team names.
- Existing route query behavior and inspector targets must remain unchanged.
- Existing localization infrastructure must remain valid; unused generated keys may be removed or left only if project generation rules require retention, but tests must not depend on removed UI copy.
- Worktree dependency installation may be required before executing Nuxt tests in the dedicated task worktree.

## Assumptions

- The desired simplification applies to both agent and team detail pages because they share the same redundant summary-card pattern. This keeps Memory detail views consistent.
- Removing the home page title is acceptable because the left navigation, active tab labels, and card content provide enough orientation.
- The phrase `Search runs...` remains acceptable because it labels the input action, not the page hierarchy.

## Risks / Open Questions

- If product later wants visible run count/ID on detail pages, it should return as compact inline metadata, not as a separate large summary card. This is outside the preferred target for this change.
- If localization generated files are regenerated from an external source, implementation must follow that repository's generation workflow rather than hand-editing generated output incorrectly.

## Requirement-To-Use-Case Coverage

| Use Case | Requirements |
| --- | --- |
| UC-MEM-COMPACT-001 | FR-MEM-COMPACT-001, FR-MEM-COMPACT-002, FR-MEM-COMPACT-009, FR-MEM-COMPACT-010 |
| UC-MEM-COMPACT-002 | FR-MEM-COMPACT-003, FR-MEM-COMPACT-004, FR-MEM-COMPACT-005, FR-MEM-COMPACT-009, FR-MEM-COMPACT-010 |
| UC-MEM-COMPACT-003 | FR-MEM-COMPACT-006, FR-MEM-COMPACT-007, FR-MEM-COMPACT-009, FR-MEM-COMPACT-010 |
| UC-MEM-COMPACT-004 | FR-MEM-COMPACT-002, FR-MEM-COMPACT-005, FR-MEM-COMPACT-008 |
| UC-MEM-COMPACT-005 | FR-MEM-COMPACT-005, FR-MEM-COMPACT-008 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-MEM-COMPACT-001 | Verifies Memory Home removes redundant selected-nav title copy. |
| AC-MEM-COMPACT-002 | Guards against breaking the existing memory browser controls. |
| AC-MEM-COMPACT-003 | Verifies agent detail removes the wasteful summary card. |
| AC-MEM-COMPACT-004 | Verifies the selected agent name replaces the generic list heading. |
| AC-MEM-COMPACT-005 | Verifies removed summary metadata does not reappear as another block. |
| AC-MEM-COMPACT-006 | Guards against behavior regressions in agent detail. |
| AC-MEM-COMPACT-007 | Verifies the same compact detail pattern for teams. |
| AC-MEM-COMPACT-008 | Guards against behavior regressions in team detail. |
| AC-MEM-COMPACT-009 | Ensures durable frontend coverage reflects the compact layout. |
| AC-MEM-COMPACT-010 | Ensures docs do not keep stale UI descriptions. |

## Approval Status

User direction incorporated from the initial request and follow-up screenshot/comment. Ready for architecture review.
