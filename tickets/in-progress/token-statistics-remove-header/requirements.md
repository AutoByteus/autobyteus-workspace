# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

The Settings > Token Statistics page currently displays a visible page-level `Token Statistics` heading directly beside a left settings navigation item that already identifies the selected page as `Token Statistics`. This duplicates the label and consumes vertical space above the date-range/search controls and results table. The requested improvement is to remove the redundant visible in-page header so the token statistics controls and content move upward and use the page space more effectively.

## Investigation Findings

- The user-provided screenshot shows the duplicate visual label: the left settings navigation highlights `Token Statistics`, and the main content also renders a large `Token Statistics` heading above the controls.
- `autobyteus-web/pages/settings.vue` owns the settings shell and sidebar. Lines 33-42 render the `token-usage` nav button and visible `settings.page.sections.tokenUsage` label, so page identity remains visible when the main header is removed.
- `autobyteus-web/pages/settings.vue` lines 209-210 render `<TokenUsageStatistics v-if="activeSection === 'token-usage'" />` in the content area.
- `autobyteus-web/components/settings/TokenUsageStatistics.vue` lines 2-7 show the redundant header is local to the Token Usage Statistics component: a root container, then a `flex ... px-8 pt-8 pb-4 flex-shrink-0` wrapper containing an `<h2>` with the `token_usage_statistics` translation, then the scrollable content begins with `p-8`.
- Removing only that local header wrapper should move the date-range/search card up while leaving the existing scroll content, date controls, tabs, empty states, loading/error states, and task/model tables intact.
- Existing `TokenUsageStatistics` component unit tests cover default fetching, usage-period affordance, tab switching, date edits, and empty states, but do not assert the page heading. They should be extended to guard that no visible heading wrapper remains and that the controls still render.
- The codebase already has settings sections without a page-level heading, for example `MessagingSetupManager.vue` starts directly with content cards inside a `p-8` scroll region. `NodeManager.spec.ts` also has a test asserting a settings manager can intentionally render without an `h2`, so removing this heading is compatible with existing settings UI patterns.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UI Cleanup
- Initial design issue signal (`Yes`/`No`/`Unclear`): No
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed
- Evidence basis: The duplicated visible label is produced by one local wrapper in `TokenUsageStatistics.vue`; settings shell and token-statistics state ownership remain coherent and do not need boundary changes.
- Requirement or scope impact: Requirements should stay narrowly focused on removing the visible local token statistics header wrapper and preserving page behavior.

## Recommendations

Implement a targeted UI-only change in `autobyteus-web/components/settings/TokenUsageStatistics.vue`: remove the visible header wrapper containing the `Token Statistics` `<h2>` and allow the existing `flex-1 overflow-auto p-8` content region to become the first child under the root container. Add or update the component unit test to assert the redundant heading is not rendered while the date controls, fetch button, and tabs remain available. Do not change token usage data fetching, aggregation, table rows, sidebar labels, or other settings sections.

## Scope Classification (`Small`/`Medium`/`Large`)

Small

## In-Scope Use Cases

- UC-001: A user opens Settings and selects `Token Statistics`; the main content begins with the token statistics controls instead of a repeated visible page heading.
- UC-002: A user continues to use the token statistics date-range controls, fetch action, tabs, and results table after the header removal.

## Out of Scope

- Changing token statistics data fetching, aggregation, cost calculations, or table column definitions.
- Renaming the left settings navigation item.
- Redesigning other settings pages or removing page headers globally.
- Changing generated localization catalogs unless the implementation deliberately removes now-unused generated strings as part of an established regeneration workflow.
- Broad responsive layout redesign beyond preserving the existing behavior after the header removal.

## Functional Requirements

- FR-001: The Token Statistics settings page must not render the redundant visible in-page `Token Statistics` header above the date-range/search controls.
- FR-002: The left settings navigation must continue to show and highlight the selected `Token Statistics` item.
- FR-003: The token statistics controls must remain functionally unchanged, including date range selection, usage-period label or info affordance, fetch action, task/model tabs, loading/error states, empty states, and statistics table behavior.
- FR-004: The removal must let the token statistics controls and table occupy the vertical space previously consumed by the page header, without adding a replacement blank spacer.
- FR-005: The change must be scoped to the Token Statistics settings component; other settings pages must keep their current headers/layout unless explicitly changed by their own components.
- FR-006: Automated component coverage must guard the visible-heading removal and confirm the existing controls still render.

## Acceptance Criteria

- AC-001: When Settings > Token Statistics is selected, the main content does not show a visible large `Token Statistics` heading above the date range/search controls.
- AC-002: The highlighted left navigation item still reads `Token Statistics`, preserving visible page identity for the user.
- AC-003: The date range/search controls appear higher than in the referenced screenshot because no empty header block remains above them.
- AC-004: Fetching statistics and switching between `By Task` and `By Model` continue to work as before.
- AC-005: Other settings pages are not unintentionally changed by the token statistics header removal.
- AC-006: The relevant component test fails if a visible token statistics `<h2>`/header wrapper is reintroduced above the controls.

## Constraints / Dependencies

- Must use the existing settings page architecture and styling conventions.
- Must avoid introducing compatibility wrappers, dual render paths, feature flags, or retained legacy header behavior.
- Must preserve the `TokenUsageStatistics` component as the owner of date inputs, fetch behavior, tab state, and table selection.
- The visible left navigation item is the requested visible page identifier after the heading removal.

## Assumptions

- The visible left settings navigation item is sufficient visible context for the selected Token Statistics page.
- The page header is intentionally removable because it is local to the `TokenUsageStatistics.vue` component and not imposed by a shared settings layout.
- The user wants a visible-space improvement, not a data/statistics behavior change.

## Risks / Open Questions

- Very low risk: a user relying on page-level headings may lose a semantic heading on this screen. Existing settings patterns already include screens without a top-level visible heading; the primary requested visible context remains the selected sidebar item.
- Low risk: generated localization files contain extracted `token_usage_statistics` keys. Because the source translation file already uses `settings.page.sections.tokenUsage` for the sidebar and generated catalogs may include stale extracted keys, implementation should avoid manually editing generated localization unless the repo has a clear regeneration step in scope.

## Requirement-To-Use-Case Coverage

| Requirement | Covers Use Case(s) |
| --- | --- |
| FR-001 | UC-001 |
| FR-002 | UC-001 |
| FR-003 | UC-002 |
| FR-004 | UC-001 |
| FR-005 | UC-001, UC-002 |
| FR-006 | UC-001, UC-002 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Verifies visible duplicate page title removal. |
| AC-002 | Verifies the left navigation remains the visible page identifier. |
| AC-003 | Verifies the requested vertical-space improvement is realized, not replaced by blank space. |
| AC-004 | Verifies token statistics functionality remains unchanged. |
| AC-005 | Guards against broad unintended settings layout regressions. |
| AC-006 | Guards the UI cleanup against regression in component-level coverage. |

## Approval Status

Approved by user on 2026-06-30; user requested direct implementation and commit for this small UI cleanup.
