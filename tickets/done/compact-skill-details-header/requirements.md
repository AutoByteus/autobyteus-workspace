# Requirements: Compact Skill Details Header

Status: Refined

## Goal / Problem Statement

The skill details page currently uses a tall top header/hero for skill identity, full description, and versioning actions. This permanently consumes vertical space and pushes the file workspace downward. Redesign the skill details header into a compact two-line layout so users can see more of the file tree, tabs, and main document content while still retaining skill identity, versioning controls, and access to the full description.

## Confirmed Scope Classification

**Small**

Rationale: The change is localized to the `SkillDetail.vue` view-level header, plus localized strings and component tests. It does not alter server APIs, storage, routing, skill workspace behavior, or versioning behavior.

## Re-entry Revision Log

| Date | Source | Classification | Change |
| --- | --- | --- | --- |
| 2026-06-13 | Stage 7 user validation screenshot/feedback | Requirement Gap | Replaced the rejected overlay/popover description disclosure with inline `More`/`Less` expand-collapse behavior. |

## Requirements

| requirement_id | Requirement | Expected Outcome |
| --- | --- | --- |
| REQ-001 | Replace the tall skill detail hero with a compact two-line header. | The skill details workspace starts closer to the top of the page because the header no longer has a separate back row, oversized title, and multi-line paragraph by default. |
| REQ-002 | Preserve core skill identity and actions in the compact header. | Back navigation, skill name, disabled badge when applicable, version status, and versioning actions remain visible and usable. |
| REQ-003 | Render the skill description as a one-line summary by default. | The description is displayed in a single line with ellipsis/truncation instead of occupying multiple persistent lines. |
| REQ-004 | Expose the full description on demand without overlaying the workspace. | A `More` control expands the description inline in the header area; a `Less` control collapses it back to one line. No overlay/popover should cover file explorer or editor content. |
| REQ-005 | Preserve the existing main workspace behavior. | `SkillWorkspaceLoader`, `FileExplorer`, `FileExplorerTabs`, file tabs, toolbar, and document content continue to render through their current boundaries. |
| REQ-006 | Support localization and accessibility for new controls. | New visible text and ARIA labels use localization keys; the inline disclosure exposes expanded/collapsed state with accessible labels. |
| REQ-007 | Validate behavior with component-level tests and a browser/Electron frontend check. | Unit tests cover the new header/description interaction; Stage 7 includes executable UI verification against the available frontend runtime. |

## In-Scope Use Cases

| use_case_id | Source Requirement(s) | Use Case | Primary Path | Fallback / Edge Path |
| --- | --- | --- | --- | --- |
| UC-001 | REQ-001, REQ-002, REQ-005 | User opens a skill details page. | The compact two-line header appears, core actions are in row 1, and the existing workspace appears directly below row 2. | Skill is missing: existing recoverable error state remains unchanged. |
| UC-002 | REQ-003, REQ-004, REQ-006 | User wants to read the full skill description. | User sees one-line summary, clicks `More`, reads the full description expanded inline below the summary, then clicks `Less` to collapse it. | Empty description: no `More`/`Less` disclosure is required; summary can use existing no-description copy. |
| UC-003 | REQ-007 | Developer verifies the compact header. | Unit tests and browser/Electron frontend inspection confirm the header and workspace behavior. | Running frontend may point at a different worktree; if so, record the constraint and use this worktree's dev server for implementation validation. |

## Acceptance Criteria

| acceptance_criteria_id | Requirement(s) | Expected Result | Verification Intent |
| --- | --- | --- | --- |
| AC-001 | REQ-001 | The skill detail header has two persistent rows: row 1 for back/title/actions, row 2 for the description summary. | Component test and browser visual inspection. |
| AC-002 | REQ-002 | Back navigation, skill title, disabled badge, and versioning panel remain rendered in the compact header. | Component test for rendering and existing tests for back error state. |
| AC-003 | REQ-003 | The description summary is one-line truncated by CSS (`white-space: nowrap`, overflow hidden, ellipsis or equivalent). | Source inspection plus component test for summary element. |
| AC-004 | REQ-004 | Clicking `More` expands the full description inline in normal document flow; it must not render as an overlay/popover and must not cover workspace content. | Component test and browser visual inspection. |
| AC-005 | REQ-004 | Clicking `Less` collapses the inline description back to the one-line compact summary. | Component test or browser interaction. |
| AC-006 | REQ-005 | Main workspace component structure remains unchanged below the header. | Source inspection and browser visual inspection. |
| AC-007 | REQ-006 | New visible/ARIA text is localized in English and Chinese catalogs. | Localization guard/audit or source inspection. |
| AC-008 | REQ-007 | Relevant unit tests pass. | `pnpm`/Vitest command targeting skill detail tests. |
| AC-009 | REQ-007 | Skill details page is visually tested through the available Electron/frontend runtime or documented fallback dev server. | Browser screenshot/DOM inspection evidence in Stage 7. |

## Requirement Coverage Map To Use Cases

| requirement_id | Covered Use Cases |
| --- | --- |
| REQ-001 | UC-001 |
| REQ-002 | UC-001 |
| REQ-003 | UC-002 |
| REQ-004 | UC-002 |
| REQ-005 | UC-001 |
| REQ-006 | UC-002 |
| REQ-007 | UC-003 |

## Acceptance-Criteria Coverage Map To Stage 7 Scenario Intent

| acceptance_criteria_id | Planned Stage 7 Scenario(s) |
| --- | --- |
| AC-001 | SCN-001 component/unit compact header rendering; SCN-003 browser/Electron visual check |
| AC-002 | SCN-001 component/unit compact header rendering |
| AC-003 | SCN-001 component/unit summary rendering; SCN-003 browser/Electron visual check |
| AC-004 | SCN-002 component/unit More/Less inline expansion interaction; SCN-003 browser/Electron visual check |
| AC-005 | SCN-002 component/unit More/Less inline expansion interaction |
| AC-006 | SCN-001 component/unit render check; SCN-003 browser/Electron visual check |
| AC-007 | SCN-004 localization/static validation |
| AC-008 | SCN-001, SCN-002 unit tests |
| AC-009 | SCN-003 browser/Electron visual check |

## Constraints / Dependencies

- Implementation must stay within the existing Vue/Nuxt frontend architecture.
- Avoid changes to backend GraphQL APIs, skill data model, or workspace loader/file explorer logic.
- Reuse `SkillVersioningPanel` compact mode instead of duplicating versioning UI.
- Do not introduce overlay/popover behavior for the description; current scope only needs local inline disclosure behavior in the skill-detail header.
- Use localized strings for new visible text and ARIA labels.
- In Stage 7, use the already-started Electron/frontend runtime when possible for skill detail page testing.

## Assumptions

- The currently running frontend can load the Skills page and at least one skill detail.
- Component-level unit tests are sufficient durable coverage for the local inline disclosure behavior; browser validation is additional executable evidence.
- A one-line summary plus inline expand/collapse satisfies the requested UX better than an overlay because it never covers the workspace and returns to a compact header after collapse.

## Open Questions / Risks

- The already-started Electron/frontend runtime may not serve this new worktree's code. If it does not, Stage 7 should record that constraint and use a local dev server from this worktree to validate the change while still inspecting the available runtime when useful.
- Very narrow viewport layouts may require wrapping the header actions; source design should include responsive behavior so actions do not overlap the title/description. Expanded description may temporarily push the workspace down, but only while explicitly expanded and never as an overlay.
