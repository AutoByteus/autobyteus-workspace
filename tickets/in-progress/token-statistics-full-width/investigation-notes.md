# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Design-reset investigation complete; round-3 requirement/geometry gaps resolved; revised package awaiting architecture review round 4.
- Investigation Goal: Preserve the original Settings presentation while replacing the fixed desktop separator with a manual 0..256px splitter and removing the rejected collapsed-header implementation.
- Scope Classification: `Medium`
- Scope Rationale: The target behavior is frontend-shell-local, but the existing rejected commit must be cleanly removed and pointer, keyboard, responsive-focus, state-preservation, and browser geometry behavior require explicit coverage.
- Scope Summary: Original Settings UI at rest; manual desktop separator resizing; no automatic Token Statistics behavior or top header.

## Request And Decision History

1. Original report: the persistent 256px Settings navigation reduced width available to Token Statistics.
2. Earlier discussion selected a contextual collapse with an active-category header.
3. Commit `530587a707a48567d9bcf0a04736c091453f51fb` implemented that direction and passed source review.
4. Browser evidence at 1440×900 showed a separate top row with a panel icon and `Token Statistics`; the user strongly rejected its vertical-space consumption and unexpected content hierarchy.
5. API/E2E also found `BROWSER-002-RESIZE`: focus changed from the desktop-only header toggle to `BODY` when crossing below `md`.
6. The user approved the reset direction on 2026-07-15: the original `personal` Settings UI remains visually the same, and only its navigation/content separator becomes draggable so the menu is manually slid left.

## Environment / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width`
- Current Branch: `codex/token-statistics-full-width`
- Current HEAD / rejected implementation: `530587a707a48567d9bcf0a04736c091453f51fb`
- Bootstrap Base: refreshed `origin/personal` at `9fda25eac8fc70df97599758760b47f25620cec8`
- Expected Base / Finalization Target: `personal`
- Bootstrap Blockers: None
- Working-tree note: downstream API/E2E and review artifacts/evidence are currently untracked; they are authoritative cumulative evidence and must not be discarded during rework.

## Supplemental Solution Artifact Inventory

| Artifact Path | Purpose | Related IDs | Status | Follow-Up |
| --- | --- | --- | --- | --- |
| `tickets/in-progress/token-statistics-full-width/ui-ux-spec.md` | Approved manual resizable-separator states and interactions | `REQ-001`–`REQ-012`, `AC-001`–`AC-015` | `Refined`; approved 2026-07-15 | Architecture review |
| `proposed-settings-drawer-*` and collapsed-header screenshots/evidence | Historical rejected alternatives | N/A | Superseded/rejected | Preserve as evidence; do not implement |

## Source / Evidence Log

| Date | Type | Exact Source / Command | Finding | Consequence |
| --- | --- | --- | --- | --- |
| 2026-07-15 | User screenshot | `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_f8725fbb062147e9891e697e68f17792/solution_designer_ed329018cc164d68b422f11ab3a501d5/context_files/ctx_3607e2b4471a__image.png` | Original Settings menu subtracts 256px before the data table receives width | Shell width allocation is the correct pressure point |
| 2026-07-15 | Rejected UI screenshot | `execution-evidence/desktop-token-statistics-1440x900.png` and user review screenshot `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_f8725fbb062147e9891e697e68f17792/code_reviewer_c9d89a6c65b84621a20464a0929d82d6/context_files/ctx_75ac82785837__image.png` | Header icon/label row pushes statistics controls/table down | Remove the entire collapsed-header direction |
| 2026-07-15 | Execution report | `api-e2e-execution-coverage-report.md`; `execution-evidence/browser-validation-results.json` | `BROWSER-002-RESIZE` observed focused header button becoming hidden and focus landing on `BODY` | Revised desktop-only separator needs explicit narrow-breakpoint focus recovery |
| 2026-07-15 | Git | `git diff 9fda25eac..530587a70`; `git log` | Rejected implementation added navigation model/components, shared icon, localization, Nuxt scan exception, page policy, and tests | Rework must remove rejected source/tests/config cleanly, not layer the splitter over them |
| 2026-07-15 | Base code | `git show 9fda25eac:autobyteus-web/pages/settings.vue` | Original page owns inline navigation, fixed `md:w-64`, `md:border-r`, content, route normalization, and manager mounting | Restore this behavior and change only the desktop boundary/width mechanism |
| 2026-07-15 | Current code | `autobyteus-web/pages/settings.vue`; `components/settings/{SettingsNavigation,SettingsCollapsedHeader}.vue`; `settingsNavigation.ts` | Current HEAD is structurally tied to automatic section collapse and top-header presentation | Not reusable for approved target except as removal evidence |
| 2026-07-15 | Existing resize patterns | `composables/useHorizontalSplitResize.ts`; `components/workspace/team/{TeamCommunicationPanel,TeamDelegatedTasksSection}.vue` | Existing app uses 1px/4px `col-resize` vertical separators and window mouse listeners | Reuse interaction language, not the limited composable contract |
| 2026-07-15 | Existing lifecycle pattern | `composables/useAppLeftPanelSectionResize.ts` | Project pattern restores cursor and listeners on stop/unmount and optionally persists state | Reuse cleanup discipline; intentionally omit persistence |
| 2026-07-15 | Tables | `TokenUsageStatistics.vue`; task/model table components | Table overflow and purposeful columns remain correctly local | No table/API/data change |
| 2026-07-15 | Prior browser evidence | `tickets/done/token-statistics-table-ux/api-e2e-round3-token-table-browser-initial.png` | Current columns fit when content receives approximately 1216px | Manual shrink to 0 can solve width pressure without table redesign |
| 2026-07-15 | Design authority | Solution designer `design-principles.md` | Keep the page as governing shell owner and isolate pointer/lifecycle mechanics | Add one focused Settings resize composable; avoid generic drawer/navigation framework |
| 2026-07-15 | Architecture review | `design-review-report.md`, round 3, findings `AR-005`/`AR-006` | Overflow clipping alone leaves 0px navigation controls focusable/AT-visible; a 1px sibling consumes an extra pixel and the hit target lacked exact stacking | Add desktop-zero `inert`/`aria-hidden` with narrow restoration/focus transfer; change separator to zero-width anchored overlay with exact coordinates/z-order |
| 2026-07-15 | User clarification | User confirmed incomplete menu text while sliding left is acceptable | Partial widths may clip text/content without an icon-only transformation | Keep navigation interactive at every width above 0; reserve unavailable state for exactly 0px |

## Current Execution Spine And Ownership

- Base target spine: `/settings route -> settings.vue activeSection/server mode -> inline navigation + content flex row -> active manager`.
- Current rejected spine: route/selection -> extracted navigation resolver -> automatic collapse -> collapsed header -> manager.
- Revised target spine: route/selection remains base behavior; independently, `separator input -> SettingsPage/useSettingsNavigationResize -> navigationWidth -> CSS width + content flex`.
- `settings.vue` remains governing owner for shell geometry and manager mounting.
- A focused `useSettingsNavigationResize` composable owns width clamping, pointer lifecycle, keyboard steps, breakpoint-focus recovery setup, and cleanup.
- The existing navigation and every manager remain content/presentation owners; no active-section mapping or category header is required.

## Design Health Assessment Evidence

- Change posture: `Behavior Change`
- Root cause classification: `No Design Issue Found`
- Refactor decision: remove the rejected implementation and apply a bounded local resize behavior; do not retain its navigation extraction merely because it exists in the current branch.
- Evidence: the base page's owner/boundary/API/data shape remain correct. The fixed width is simply the former behavior. A focused composable prevents pointer and lifecycle mechanics from enlarging the page's existing responsibilities.
- Deferred condition: the base page retains long inline navigation markup. Since the revised task does not add destination/context policy, refactoring it would increase risk without supporting the splitter requirement.

## Exact Behavioral Findings

1. Default/max width should be the original `md:w-64` value: 16rem = 256px.
2. The user needs only more content width, so the supported range can be `0..256px`; widening beyond the original is unnecessary.
3. A normal one-pixel sibling would shift the original content origin from 256px to 257px because the base border is inside the 256px box. The separator therefore needs a zero-width relative flex anchor; at nonzero width its absolute one-pixel line overlays x=`width-1..width`, preserving the original boundary.
4. The transparent target is exactly 8px. Its global left coordinate is `max(0, boundary-4)`, so it is centered for widths >=4 and remains `0..8` at near-zero/zero widths without extending negative. A defined z-index keeps it above adjacent panes without consuming layout width.
5. The navigation must use desktop `width` from a CSS custom property and `overflow-x: hidden`; narrow CSS continues to force `width: 100%`. Partially clipped text is approved and all navigation remains interactive above 0px.
6. At desktop exactly 0px, overflow is insufficient for accessibility: bind `inert` and `aria-hidden=true` to remove invisible descendants from Tab/AT while keeping DOM/state mounted. Reactive media-query state removes those attributes below `md` even while the remembered desktop width remains 0.
7. No section selection changes width. A direct Token Statistics route therefore starts at 256px like all other fresh Settings routes.
8. At 0px, the separator must remain outside the zero-width navigation; otherwise pointer recovery becomes unavailable.
9. Width is page-local memory. Navigation among sections keeps it because the page remains mounted; leaving/remounting resets it.
10. Pointer cleanup must cover up/cancel/unmount and restore body cursor/user selection even after interruption.
11. Breakpoint focus is bidirectional at retained 0px: desktop separator -> narrow Back; narrow navigation descendant -> desktop separator before/when navigation becomes inert. CSS still owns layout; JavaScript owns only interaction availability and focus safety.

## Persisted Data Transition Evidence

- Decision: `Not Affected`.
- No local/session storage, route query, store, API, or schema field is introduced.
- Existing statistics and Settings data readers/writers are untouched.

## Risks / Unknowns

- No requirement unknown remains after the user's clarified direction.
- Browser validation must confirm exact default/zero/partial nav, content, line, anchor, and 8px target coordinates; target hitability/z-order; and no document overflow.
- Browser validation must confirm desktop-zero Tab and accessibility-tree exclusion plus narrow restoration at retained width 0.
- Browser validation must confirm actual table fit after manual resize rather than assuming zero-width geometry.
- Focus recovery must be validated in a real browser because the prior unit-level design missed the `BUTTON -> BODY` transition.

## Handoff Notes

- The prior architecture round-2 Pass applies only to the rejected header design and is historical, not authorization for revised implementation.
- Implementation must not begin until the revised package passes a new architecture-review round.
- The downstream package must retain the existing implementation/code/API-E2E reports and screenshots as rework/removal evidence.
