# Requirements Doc

## Status

`Design-ready` — approved through the user's explicit task kickoff after iterative UI review.

## Goal / Problem Statement

Add one consistent collapsible Settings-sidebar behavior without making Settings navigation hidden by default. Most Settings pages keep the current labeled sidebar open. Token Statistics automatically collapses it to gain the complete content width. When collapsed, no icon rail remains; the existing left-sidebar panel icon moves into a lightweight page header and can reopen the same sidebar.

## Investigation Findings

- `autobyteus-web/pages/settings.vue` owns the current 16rem persistent sidebar, active section, Server Settings modes, and content layout.
- The user clarified that the menu should normally remain open. The intended technique is not an always-hidden off-canvas drawer.
- The existing panel icon beside `Agents` in `AppLeftPanel.vue` is the required visual/interaction reference.
- When the Settings sidebar is open, the same icon can occupy the far-right side of the existing `Back to Workspace` top row and collapse the sidebar. It remains a separate button from the back action.
- When collapsed, the sidebar should have zero reserved width and no compact icon strip. A shell-owned lightweight header exposes the same icon plus active section context.
- Selecting Token Statistics is the primary contextual auto-collapse trigger. Other sections retain/recover the normally open sidebar.
- This behavior belongs to the Settings shell; individual managers retain their current internal headers/content.

## Supplemental Solution Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Authoritative Relationship |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/ui-ux-spec.md` | UI/UX specification for normally-open/contextually-collapsible Settings navigation | `REQ-001`–`REQ-012` | `AC-001`–`AC-014` | `Refined`; approved on 2026-07-15 | Clarifies observable interaction; this requirements doc remains authoritative |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/proposed-settings-drawer-closed.png`, `proposed-settings-drawer-open.png`, and HTML source | Earlier off-canvas visual exploration | N/A after clarification | N/A after clarification | Superseded | Preserved as discussion evidence; not target behavior |

## Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`
- Initial design issue signal: `No` broad issue; `Yes` local missing adaptive-layout behavior.
- Root cause classification: `File Placement Or Responsibility Drift`
- Refactor posture: `Likely Needed` within the Settings shell to centralize destinations and sidebar state.
- Evidence basis: `settings.vue` already owns the correct governing policy boundary, but it also carries the complete navigation presentation and direct destination mutations. The prior always-open behavior is not an established defect against an earlier invariant; the design pressure comes from adding contextual layout policy without further overloading or duplicating that inline responsibility. Statistics/table/store/API owners remain correct.
- Requirement or scope impact: Settings shell/navigation, shared collapsed header, localization, tests, and docs; section internals remain unchanged.

## Recommendations

Use a **normally-open, contextually collapsible sidebar**:

- Non-statistics Settings pages: current 16rem labeled sidebar remains open.
- Open sidebar: existing left-sidebar panel icon appears at the far right of the `Back to Workspace` row, matching the familiar right-aligned placement beside Agents; clicking collapses it.
- Token Statistics entry: sidebar collapses automatically.
- Collapsed state: zero-width sidebar, no rail, full-width content, and the same icon in a small shell header.
- Clicking the header icon: restores the persistent sidebar; no overlay, backdrop, `×`, or chevrons.
- Selecting a non-statistics destination leaves/restores the normally open sidebar.

## Scope Classification

`Medium`

The change is frontend-shell-local but includes navigation state, contextual transitions, responsive behavior, focus, localization, and browser layout coverage.

## In-Scope Use Cases

- `UC-001` — Use ordinary Settings pages with the current labeled sidebar open.
- `UC-002` — Manually collapse/reopen the sidebar using the existing panel icon.
- `UC-003` — Enter Token Statistics and receive automatic full-width layout.
- `UC-004` — Reopen the sidebar temporarily from Token Statistics and navigate elsewhere.
- `UC-005` — Preserve active section/mode/data state during toggle.
- `UC-006` — Use controls by keyboard/assistive technology.
- `UC-007` — Preserve current narrow responsive behavior.

## Out of Scope

- Always-hidden or overlay/off-canvas menu.
- Permanent compact icon rail.
- Generic `×`, `[»]`, or `[«]` controls.
- Persisting sidebar state across app restarts or sharing homepage `useLeftPanel` state.
- Internal Settings-page or backend/API redesign.

## Functional Requirements

- `REQ-001` — The Settings navigation shall remain open by default for non-Token-Statistics sections, preserving the current labeled 16rem sidebar layout.
- `REQ-002` — The open sidebar shall use the exact existing left-sidebar panel toggle icon/visual treatment from beside `Agents`, placed as a separate far-right button in the existing `Back to Workspace` row, to collapse it. No additional `Settings` title row is required.
- `REQ-003` — Selecting or directly opening Token Statistics at the desktop breakpoint shall automatically collapse the sidebar.
- `REQ-004` — The collapsed state shall reserve zero sidebar width and shall not render a compact icon rail.
- `REQ-005` — When collapsed, the Settings shell shall render a lightweight header with the same panel icon and localized active-section label; managers shall not each implement their own toggle.
- `REQ-006` — Activating the collapsed-header icon shall restore the normal persistent sidebar in layout flow; no overlay/backdrop or alternate close icon shall be used.
- `REQ-007` — Selecting a non-statistics section shall render that section with the normally open sidebar; Server Settings mode behavior shall remain intact.
- `REQ-008` — Toggling shall not reset/refetch/mutate active content solely because sidebar state changed and shall preserve relevant scroll/interaction state where the DOM remains mounted.
- `REQ-009` — Open/close controls shall expose localized names, expanded/controlled state, visible focus, and deliberate focus transfer between the corresponding toggle locations.
- `REQ-010` — Below the desktop breakpoint, retain the current stacked Settings navigation behavior unless implementation evidence requires a separate bounded responsive adjustment; do not introduce a narrow vertical rail.
- `REQ-011` — One authoritative destination/selection model shall own labels, icons, active state, availability, Back to Workspace, and Server Settings submodes.
- `REQ-012` — Existing route normalization, embedded-server defaults, section data/forms/statistics, localization semantics, and backend/API contracts shall remain unchanged.

## Acceptance Criteria

- `AC-001` — API Keys and every non-statistics section initially show the current labeled sidebar at desktop widths.
- `AC-002` — The open sidebar shows the exact existing panel icon as a separate right-aligned control in the `Back to Workspace` row, renders no redundant `Settings` label, and adds no `×`/chevron control.
- `AC-003` — Activating that icon removes the entire sidebar from layout, displays no compact rail, expands content to full width, and exposes the same icon in the collapsed page header.
- `AC-004` — Activating the header icon restores the persistent 16rem sidebar and removes the collapsed-only header treatment as designed.
- `AC-005` — Selecting/direct-linking Token Statistics automatically produces the collapsed/full-width state.
- `AC-006` — At 1440×900/default font with representative task data, collapsed Token Statistics shows all columns through Created Time without horizontal table scrolling.
- `AC-007` — Reopening the sidebar on Token Statistics does not refetch/reset grouping, dates, sorting, expanded rows, details, or loaded values solely because of the toggle.
- `AC-008` — Selecting another destination from the reopened sidebar leaves that destination with the sidebar open.
- `AC-009` — Back to Workspace and Server Settings Basics/Advanced/Migrations retain current behavior.
- `AC-010` — Toggle buttons use `Open Settings menu`/`Close Settings menu`, `aria-expanded`, appropriate control relationship, visible focus, and correct focus movement.
- `AC-011` — Loading/error/empty/form states remain usable during sidebar toggling.
- `AC-012` — At 390×844, current stacked navigation/content containment remains usable and no vertical icon rail appears.
- `AC-013` — Browser and Electron share the same behavior with no persisted state or platform fork.
- `AC-014` — Durable tests/browser evidence verify default-open sections, contextual statistics collapse, manual toggle/focus, section navigation, narrow behavior, and unchanged data/API behavior.

## Constraints / Dependencies

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width`
- Branch: `codex/token-statistics-full-width` from refreshed `origin/personal` `9fda25eac8fc70df97599758760b47f25620cec8`.
- Reuse/extract the exact Agents left-sidebar panel-toggle UI; do not invent a similar substitute.
- Support English and Simplified Chinese.

## Persisted Data Outcome

- Required outcome: `Not Affected`
- Sidebar state is ephemeral; no migration or persisted preference.
- All Settings/statistics data must remain unchanged.

## Assumptions

- “Normally open” applies to ordinary desktop Settings pages.
- Token Statistics is the current explicit automatic-collapse section.
- The reopened menu participates in layout like the current sidebar rather than overlaying content.

## Risks / Open Questions

- Opening the sidebar temporarily narrows Token Statistics; this is intentional and reversible.
- Implementation must preserve the approved desktop-only focus transfer and stable controlled-region contract; the design spec defines the exact child APIs and visibility behavior. No requirement question remains open.

## Requirement-To-Use-Case Coverage

| Requirements | Use Cases |
| --- | --- |
| `REQ-001`, `REQ-002` | `UC-001`, `UC-002` |
| `REQ-003`–`REQ-007` | `UC-002`–`UC-004` |
| `REQ-008`, `REQ-012` | `UC-005` |
| `REQ-009` | `UC-006` |
| `REQ-010` | `UC-007` |
| `REQ-011` | `UC-001`–`UC-007` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| `AC-001`–`AC-004` | Normal open state and exact icon-driven manual toggle. |
| `AC-005`–`AC-008` | Statistics contextual collapse and navigation away. |
| `AC-009`–`AC-011` | Existing behavior/accessibility remains correct. |
| `AC-012`–`AC-014` | Responsive/platform/durable evidence. |

## Approval Status

Approved on 2026-07-15. The user confirmed the final UI direction and explicitly requested task kickoff: sidebar normally open; Token Statistics auto-collapses it; no compact rail; the exact existing Agents left-sidebar panel icon toggles both states; the open-state icon is a separate right-aligned control in the `Back to Workspace` row; no redundant `Settings` label, `×`, or chevrons.
