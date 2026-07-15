# Requirements Doc

## Status

`Refined` — revised and approved by the user on 2026-07-15 after rejection of the collapsed-header implementation.

## Goal / Problem Statement

Preserve the original `personal`-branch Settings page appearance and behavior while making the existing vertical separator between Settings navigation and page content horizontally draggable at desktop widths. Users manually drag the separator left to give data-dense pages such as Token Statistics more width, or right to restore the menu. The change must add no category header, icon rail, automatic section-specific collapse, or visible control inside the content area.

## User Decision And Superseded Direction

- The user reviewed the implemented 1440×900 result and explicitly rejected the separate top row containing the panel icon and `Token Statistics` label because it consumed vertical space and pushed content downward.
- The user then selected the simpler split-pane direction: keep the original Settings UI visually unchanged and make its existing separator draggable.
- The earlier normally-open/contextually-auto-collapsed header design is no longer approved and must be removed rather than patched.
- Token Statistics receives no special automatic layout rule. Resizing is manual and applies to the overall Settings shell.

## Supplemental Solution Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Authoritative Relationship |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/ui-ux-spec.md` | UI/UX specification for the visually unchanged, manually resizable Settings split pane | `REQ-001`–`REQ-012` | `AC-001`–`AC-015` | `Refined`; revised direction approved on 2026-07-15 | Clarifies observable interaction; this requirements doc remains authoritative |
| `proposed-settings-drawer-closed.png`, `proposed-settings-drawer-open.png`, `proposed-settings-drawer.html`, and the collapsed-header browser screenshots/evidence in this ticket | Superseded visual and implementation evidence | N/A for target behavior | N/A for target behavior | Rejected/superseded | Historical evidence only; must not drive implementation |

## Design Health Assessment

- Change posture: `Behavior Change`
- Root cause classification: `No Design Issue Found`
- Refactor posture: `Bounded local replacement required`; no navigation-model refactor is needed for the revised behavior.
- Evidence: the original Settings page has the correct route, navigation, manager, and responsive ownership. Its fixed 256px desktop allocation was a valid prior product choice; the new request adds manual width allocation rather than repairing a violated invariant.
- Current implementation impact: commit `530587a707a48567d9bcf0a04736c091453f51fb` implements the now-rejected header/auto-collapse direction and must be cleanly removed before the splitter behavior is added.
- Residual design note: the original inline navigation is long, but the revised behavior neither duplicates nor changes its destination policy. Refactoring it is intentionally out of scope.

## In-Scope Use Cases

- `UC-001` — Open Settings and see the original 256px desktop menu and original content position.
- `UC-002` — Drag the existing separator left to continuously increase content width, including to zero menu width.
- `UC-003` — Drag the separator right to restore any width up to the original 256px.
- `UC-004` — Resize while viewing Token Statistics without resetting or refetching it.
- `UC-005` — Navigate between Settings sections while retaining the current width for that mounted Settings-page session.
- `UC-006` — Resize the separator with keyboard and assistive technology.
- `UC-007` — Retain the original stacked narrow layout below `md`.

## Out Of Scope

- Automatic collapse when selecting/direct-linking Token Statistics or any other section.
- A top collapsed-state header, active-category label, panel icon, narrow icon menu rail, overlay, backdrop, `×`, or chevrons.
- Widening the navigation beyond its original 256px.
- Persisting width in local storage, user settings, route state, or backend data.
- Changing navigation destinations, labels, icons, Back behavior, Server Settings modes, managers, table columns, APIs, or statistics queries.
- Generalizing the splitter for other application panes in this task.

## Functional Requirements

- `REQ-001` — On every new Settings-page mount at `md` and wider, the navigation shall have its original 256px width and all original navigation/content visual structure shall remain unchanged at rest.
- `REQ-002` — The existing one-pixel vertical boundary between navigation and content shall become the visual track for a horizontal resize separator with a larger transparent interaction hit area and `col-resize` cursor. The line and hit target shall overlay a zero-width layout anchor so the original 256px navigation/content boundary remains at exactly 256px rather than shifting to 257px.
- `REQ-003` — Pointer dragging shall resize navigation continuously from `0px` through `256px`; dragging left increases content width and dragging right restores navigation width.
- `REQ-004` — At desktop `0px`, navigation content shall be clipped/hidden, marked `aria-hidden="true"`, and made `inert` so its Back/destination controls are absent from sequential focus and the accessibility tree. The mounted navigation state remains intact, and the one-pixel separator plus its interaction hit area remains operable at the far left. No icon rail or header shall appear.
- `REQ-005` — Resizing shall be wholly manual. Section selection, route initialization, Server Settings fallback, and Token Statistics direct links shall not modify navigation width.
- `REQ-006` — The current width shall remain stable when selecting other Settings sections during the same mounted page session and shall reset to `256px` only after the Settings page is remounted.
- `REQ-007` — Resizing shall change only shell geometry; the active manager shall stay mounted and shall not reset, refetch, mutate data, or lose its relevant scroll/interaction state solely due to resizing.
- `REQ-008` — No top row/header, page/category label, panel toggle icon, compact navigation rail, overlay, or extra vertical content offset shall be introduced.
- `REQ-009` — The separator shall be keyboard-focusable with `role="separator"`, `aria-orientation="vertical"`, localized accessible name, and `aria-valuemin="0"`, `aria-valuemax="256"`, and current `aria-valuenow`. At every nonzero desktop width, the partially clipped original navigation remains interactive; only exactly `0px` invokes the unavailable/inert contract.
- `REQ-010` — Keyboard behavior shall use Left/Right Arrow in 16px steps, Home for `0px`, and End for `256px`, with a visible focus indication.
- `REQ-011` — Below `md`, the separator shall not be presented and the original full-width stacked navigation capped at `38dvh` shall remain fully visible, focusable, and exposed to assistive technology even when the retained in-session desktop width is `0px`; desktop-only `inert`/`aria-hidden` shall be removed. If the desktop separator owns focus while crossing narrow, focus moves to Back to Workspace rather than `BODY`. When returning to desktop at retained width `0px`, focus moves from any navigation descendant that is becoming inert to the separator; otherwise breakpoint changes do not steal focus.
- `REQ-012` — Browser and Electron shall share the same renderer behavior; existing route normalization, embedded-server defaults, localization, Back action, Server Settings modes, managers, forms, statistics, and API contracts shall remain unchanged.

## Acceptance Criteria

- `AC-001` — At 1440×900 on a fresh Settings mount, the menu measures 256px, the navigation right edge and content left edge both resolve to x=256 relative to the Settings shell, and the page is visually equivalent to the original `personal` branch: no one-pixel horizontal shift, new header, label, icon, rail, or vertical displacement.
- `AC-002` — The resting separator is an overlaid one-pixel gray line occupying x=255..256 at the default width; its zero-width flex anchor does not consume layout space. The 8px hit target is centered over boundaries at least 4px from the viewport edge and clamps its left edge to x=0 for widths below 4px. Hover/focus/drag may reveal a subtle interaction highlight without adding a persistent visible control.
- `AC-003` — Dragging left updates menu width continuously and correspondingly expands content without whole-page horizontal overflow.
- `AC-004` — The menu can reach 0px; at desktop no menu content is visible or reachable by Tab/assistive technology, no replacement header/rail appears, content begins at x=0, and the separator target remains operable at x=0..8 without increasing document scroll width.
- `AC-005` — Dragging right from 0px restores the menu, up to exactly 256px, with its original contents and active styling intact.
- `AC-006` — Selecting/direct-linking Token Statistics initially leaves the menu at 256px; only a user resize changes it.
- `AC-007` — After manually resizing while on Token Statistics, all columns through Created Time are visible without horizontal table scrolling at 1440×900 when sufficient width is reclaimed.
- `AC-008` — Resizing does not add statistics requests or reset grouping, dates, sorting, expanded rows, detail state, loaded values, or relevant scroll state.
- `AC-009` — The chosen width remains unchanged while navigating among API Keys, Token Statistics, and other sections in the same Settings mount.
- `AC-010` — Pointer-up, pointer-cancel, unmount, and interrupted-drag paths remove listeners/capture and restore body cursor/user-selection styles.
- `AC-011` — The keyboard and ARIA contract in `REQ-009`–`REQ-010` is observable, current width is announced through `aria-valuenow`, and Tab skips all navigation descendants at desktop 0px while retaining the separator as the recovery control.
- `AC-012` — At 390×844 the original stacked navigation/content containment is unchanged, the separator is absent from the accessibility tree, any retained 0px desktop state does not leave navigation inert/hidden, and no vertical rail appears.
- `AC-013` — Desktop-to-narrow with separator focus moves focus to Back, not `BODY`; narrow-to-desktop at retained 0px moves focus from a navigation descendant to the separator before/when that navigation becomes inert; other viewport changes do not steal focus.
- `AC-014` — Back to Workspace, Server Settings Basics/Advanced/Migrations, legacy route normalization, embedded defaults, loading/error/empty/form states, Browser, and Electron retain current behavior.
- `AC-015` — Durable tests and browser evidence cover default coordinate equivalence, overlay line/hit-target coordinates and z-order hitability, pointer bounds, zero-width Tab/AT removal and recovery, keyboard/ARIA, section-session continuity, data/request preservation, narrow restoration, breakpoint focus recovery, and unchanged document width.

## Constraints / Dependencies

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width`
- Branch: `codex/token-statistics-full-width`; current rejected implementation commit `530587a707a48567d9bcf0a04736c091453f51fb`; base/final target `origin/personal`/`personal` at bootstrap commit `9fda25eac8fc70df97599758760b47f25620cec8`.
- Desktop breakpoint remains Tailwind `md` (`768px`).
- Desktop width range is exactly `0..256px`; no persistence.
- English and Simplified Chinese accessible labels are required.

## Persisted Data Outcome

- Required outcome: `Not Affected`
- Width is ephemeral component state and is not written to browser storage or application data.
- All Settings/statistics data remains unchanged.

## Requirement-To-Use-Case Coverage

| Requirements | Use Cases |
| --- | --- |
| `REQ-001`–`REQ-006` | `UC-001`–`UC-005` |
| `REQ-007`, `REQ-012` | `UC-004`, `UC-005` |
| `REQ-008` | `UC-001`–`UC-005` |
| `REQ-009`, `REQ-010` | `UC-006` |
| `REQ-011` | `UC-007` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| `AC-001`–`AC-006` | Original appearance plus manual pointer resizing and recovery. |
| `AC-007`–`AC-010` | Statistics width benefit, state continuity, and drag cleanup. |
| `AC-011`–`AC-013` | Keyboard, ARIA, narrow layout, and breakpoint focus. |
| `AC-014`, `AC-015` | Existing behavior and durable/live regression evidence. |

## Approval Status

Approved on 2026-07-15. The user explicitly directed that the original `personal`-branch Settings UI remain the same and only the separator become draggable so they can manually slide the menu left for more content space. This approval supersedes the earlier collapsed-header/automatic Token Statistics design.
