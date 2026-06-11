# Requirements: Agent Team Row Disclosure Affordance

## Status
Design-ready

## Goal / Problem Statement
Users can miss that individual agent-team run rows in the left Agents sidebar are foldable/unfoldable because the nested run-row chevrons are tiny, gray, and visually indistinct. Improve the frontend team-run row disclosure affordance so users can clearly recognize expandable team runs without altering the parent team-definition row, existing selection, history, or backend behavior.

## Source Evidence
- User report: the chevron/arrow on the agent team row is too small and not noticeable; users may not realize the row can be folded/unfolded.
- Screenshot references:
  - `/Users/normy/.autobyteus/server-data/memory/agents/35270b84-0ec1-47da-905c-ba017b4d996b/context_files/ctx_14225b672c0d__image.png`
  - `/Users/normy/.autobyteus/server-data/memory/agents/35270b84-0ec1-47da-905c-ba017b4d996b/context_files/ctx_a2b5cd4660f5__image.png`
- Investigation artifact: `tickets/in-progress/agent-team-chevron-affordance/investigation-notes.md`.

## Confirmed Scope Classification
- **Small.** Localized frontend presentation/accessibility update in `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`, plus focused tests/visual verification. No backend contract, store, routing, or data-shape change is intended.

## Requirements
| requirement_id | Requirement | Expected Outcome |
| --- | --- | --- |
| REQ-001 | Make individual agent-team run disclosure affordances visibly noticeable in the Agents sidebar without changing the parent team-definition row treatment. | Team run rows use the same compact chevron shape, size, and gray color as the parent team-definition row; no blue, larger, square, bordered, or background wrapper is introduced. |
| REQ-002 | Preserve existing row behavior and layout hierarchy. | Team definition rows still expand/collapse their grouped runs; team run rows still select/expand/toggle using existing state/action flow; members remain nested under expanded teams. |
| REQ-003 | Expose team run disclosure state consistently to assistive technology and tests. | Team run row buttons include an `aria-expanded` value reflecting `state.isTeamExpanded(team.teamRunId)`, matching existing team-definition row disclosure semantics. |
| REQ-004 | Validate the change with automated checks and local visual inspection. | Focused Nuxt/Vitest coverage passes, and a local frontend is visually inspected in browser against the Electron-started backend when reachable. |

## In-Scope Use Cases
| use_case_id | Use Case | Source Requirement(s) |
| --- | --- | --- |
| UC-001 | A user sees a team-definition row such as `Software Engineering Team (13)` and it retains the original compact disclosure control rather than a new square/bordered control. | REQ-001, REQ-002 |
| UC-002 | A user sees child team run rows and can identify which rows can unfold to show members. | REQ-001, REQ-002, REQ-003 |
| UC-003 | A user clicks the same rows as before and the sidebar expands/collapses/selects without behavioral regression. | REQ-002 |
| UC-004 | A developer verifies the visual/accessibility update through tests and local browser inspection. | REQ-004 |

## Acceptance Criteria
| acceptance_criteria_id | Acceptance Criterion | Expected Outcome |
| --- | --- | --- |
| AC-001 | Team-definition row disclosure visual is not changed into a square/bordered affordance. | The parent team-definition row keeps the compact standalone chevron treatment and has no `workspace-team-definition-disclosure` wrapper. |
| AC-002 | Team-run row disclosure visual matches the parent team-definition chevron exactly in size, shape, and color, without using a surrounding square/bordered wrapper. | Child team run rows use the same compact gray standalone chevron treatment as the parent team-definition row and no border/background/shadow wrapper. |
| AC-003 | Expanded/collapsed state remains visually clear. | The chevron continues rotating between expanded and collapsed states, and hover/focus states reinforce that it is interactive. |
| AC-004 | Existing expansion/selection behavior remains intact. | Existing component tests for workspace/team definition/team run expansion and selection continue to pass. |
| AC-005 | Team run row disclosure state is accessible. | Team run row buttons expose `aria-expanded="true"` when expanded and `aria-expanded="false"` when collapsed. |
| AC-006 | Local visual verification is attempted with the Electron backend. | Nuxt dev frontend is opened in browser against the default/Electron backend URL; result and any environment limitation are recorded. |

## Constraints / Dependencies
- Use the currently available Electron-started backend as the backend for browser testing where possible; Nuxt dev defaults to proxying API requests to `http://localhost:8000`.
- Preserve the existing row data-test selectors used by tests.
- Prefer a focused style/markup improvement in the existing component rather than a broader tree/sidebar redesign.
- Do not introduce new backend APIs, store state, or compatibility wrappers.

## Assumptions
- The affected UI is the workspace history sidebar rendered by `WorkspaceHistoryWorkspaceSection.vue`.
- Tailwind utility classes are the established styling mechanism for this component.
- A small internal helper class or repeated utility-string pattern is acceptable if it stays localized and readable.

## Open Questions / Risks
- Live backend data may not contain the exact team rows shown in the screenshots; visual verification can still validate the affordance if similar team rows are present, while automated tests cover deterministic structure.
- The Nuxt dev server may need existing workspace/backend state to show real history rows.

## Requirement-to-Use-Case Coverage
| requirement_id | Covered Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-002 |
| REQ-002 | UC-001, UC-002, UC-003 |
| REQ-003 | UC-002, UC-004 |
| REQ-004 | UC-004 |

## Acceptance-Criteria-to-Stage-7 Scenario Intent
| acceptance_criteria_id | Intended Scenario(s) |
| --- | --- |
| AC-001 | SCN-001 component render inspection confirms no parent team-definition square/bordered disclosure wrapper; SCN-003 browser visual inspection. |
| AC-002 | SCN-002 component render/class inspection for non-square team-run disclosure; SCN-003 browser visual inspection. |
| AC-003 | SCN-001/SCN-002 assert row expanded state remains tied to chevron rotation/aria. |
| AC-004 | Existing WorkspaceAgentRunsTreePanel tests plus focused test run. |
| AC-005 | SCN-002 assert `aria-expanded` on team run row before/after expansion. |
| AC-006 | SCN-003 local browser visual inspection against default backend target. |


## User Verification Clarification - 2026-06-11

- The parent agent-team definition row (for example, `Software Engineering Team (13)`) already had an acceptable/original disclosure style and must not receive a bordered or square chevron treatment.
- The requested improvement applies to each individual agent-team run row under that parent.
- The team-run affordance must be more noticeable without adding a surrounding square/bordered button around the chevron.
