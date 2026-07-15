# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete; requirements/UI supplement approved; design revised after architecture review round 1 and awaiting round 2.
- Investigation Goal: Identify the Settings shell/navigation owner, quantify Token Statistics width pressure, and define a normally-open sidebar with contextual zero-width collapse.
- Scope Classification: `Medium`
- Scope Classification Rationale: The code change is local to frontend layout/navigation, but adds contextual open/collapsed state, focus-preserving transitions, responsive containment, and accessibility coverage.
- Scope Summary: Preserve the normally-open Settings sidebar, auto-collapse it for Token Statistics, allow manual zero-width collapse/reopen, and preserve every section's internal behavior.
- Primary Questions Resolved:
  1. Which component owns the Settings rail/content split? `autobyteus-web/pages/settings.vue`.
  2. Which component owns table overflow? Each table component owns a local `overflow-x-auto` wrapper; the page/component ancestors are already `min-w-0`.
  3. Is the table itself unnecessarily wide? The task table has nine purposeful current columns and a deliberate 20rem task/run minimum; prior work already removed redundant columns. This task should not remove more data.
  4. Can the table fit if sidebar width is reclaimed? Existing 1440×900 validation evidence shows the table fitting in an approximately 1216px region. Reclaiming 16rem from the Settings shell provides at least that region at wide desktop sizes.
  5. Is a platform fork required? No. Browser and Electron share the Nuxt Settings page.
  6. Should the opener be placed independently inside every manager? No. Existing managers have heterogeneous headers or no header, so the Settings shell should own one shared header.

## Request Context

The user initially reported that the persistent Settings menu consumes width needed by the many-column Token Statistics table. Through discussion, the user clarified that the sidebar remains normally open and only collapses in special cases such as Token Statistics or explicit user action.

Reference screenshot:

`/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_f8725fbb062147e9891e697e68f17792/solution_designer_ed329018cc164d68b422f11ab3a501d5/context_files/ctx_3607e2b4471a__image.png`

The image is 1980×1250. Its visible layout shows the Settings navigation on the left, a wide content surface, and the task table clipped after `Total Cost`; `Created Time` is outside the visible table area.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width`
- Current Branch: `codex/token-statistics-full-width`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch --prune origin` succeeded on 2026-07-15; task branch and remote base both resolved to `9fda25eac8fc70df97599758760b47f25620cec8`.
- Task Branch: `codex/token-statistics-full-width`
- Expected Base Branch: `personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: The shared checkout had unrelated untracked files and was not used. All authoritative work must remain in this dedicated worktree.

## Supplemental Solution Artifact Inventory

| Artifact Path | Purpose | Evidence Or Decision Captured | Related IDs | Status | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/ui-ux-spec.md` | Define normally-open/contextually-collapsible Settings navigation | Preserves current sidebar for ordinary pages; Token Statistics auto-collapses to zero width; same Agents icon toggles | `REQ-001`–`REQ-012`, `AC-001`–`AC-014` | `Refined`; approved | None |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/proposed-settings-drawer-{closed,open}.png` with `proposed-settings-drawer.html` | Earlier visual exploration | Shows a superseded always-hidden/off-canvas option | N/A after clarification | Superseded | Do not implement |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-15 | Other | Supplied screenshot at the path recorded above; inspected at original detail | Confirm the reported layout pressure | Persistent navigation reserves substantial width; current table extends beyond visible content despite a wide window | No |
| 2026-07-15 | Command | `git status --short --branch`; `git remote -v`; `git worktree list --porcelain`; `git symbolic-ref refs/remotes/origin/HEAD` | Resolve repository/bootstrap context | Remote default and expected integration/finalization base are `personal`; shared checkout is not task-isolated | No |
| 2026-07-15 | Setup | `git fetch --prune origin`; `git worktree add -b codex/token-statistics-full-width ... origin/personal` | Create isolated current-base task workspace | Dedicated worktree created at refreshed base `9fda25eac...` | No |
| 2026-07-15 | Doc | Solution designer `design-principles.md` and mandatory/supplement templates | Apply team design and artifact requirements | Local ownership and clean-cut state behavior should remain explicit; UI supplement is warranted | No |
| 2026-07-15 | Review | `tickets/in-progress/token-statistics-full-width/design-review-report.md`, architecture review round 1 | Recheck design-health evidence, metadata ownership, and accessibility boundaries | Review confirmed governing page/responsive direction but required responsibility-drift classification, one exact navigation/context resolver, typed visible-only focus APIs, and stable ARIA region contracts | Addressed in revised cumulative package for round 2 |
| 2026-07-15 | Code | `autobyteus-web/pages/settings.vue` | Identify layout/navigation owner | Page always renders navigation with `md:w-64`; content is `min-w-0 flex-1`; active section is already page-owned state | No |
| 2026-07-15 | Code | `autobyteus-web/components/settings/TokenUsageStatistics.vue` | Inspect content padding, states, and toolbar | Inner scroller uses `p-8`; toolbar is a wrapping flex row; page delegates task/model tables | No |
| 2026-07-15 | Code | `autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue` | Inspect table column pressure and overflow boundary | Nine current columns; task/run cell has `min-w-[20rem]`; horizontal overflow is correctly table-local | No |
| 2026-07-15 | Code | `autobyteus-web/components/settings/token-usage/TokenUsageModelStatisticsTable.vue` | Inspect alternate grouping | Ten current columns with table-local `overflow-x-auto` | No |
| 2026-07-15 | Test | `autobyteus-web/pages/__tests__/settings.spec.ts`; focused Settings manager specs; Token Statistics/task/model specs | Identify durable coverage owners | Open/collapsed shell lifecycle belongs primarily in the page suite; focused manager suites protect unchanged section content behavior | No |
| 2026-07-15 | Doc | `tickets/done/token-statistics-table-ux/{requirements.md,investigation-notes.md,design-spec.md}` | Avoid undoing prior UX decisions | Prior task already removed redundant Type/Status columns and confirmed current table/data ownership; this task should solve shell width instead | No |
| 2026-07-15 | Image | `tickets/done/token-statistics-table-ux/api-e2e-round3-token-table-browser-initial.png` (1440×900) | Check whether current table can fit when given width | Current nine-column task table fits in an approximately 1216px fixture table region | Downstream browser validation at actual Settings page required |
| 2026-07-15 | Command | `git log`, `git blame` for `pages/settings.vue`; `rg` for settings/collapse/expand/overflow/localization | Understand recency and reuse options | Responsive shell classes were updated on 2026-07-14; Iconify and localization catalogs are available | No |
| 2026-07-15 | Code | `autobyteus-web/components/AppLeftPanel.vue`; `autobyteus-web/components/layout/LeftSidebarStrip.vue`; `autobyteus-web/composables/useLeftPanel.ts` | Investigate the user's requested homepage technique | Homepage collapses its expanded panel to a 50px icon strip using a panel-outline control; compact items keep active styling and hover/accessibility labels | Reuse visual/interaction language, not global state |
| 2026-07-15 | Other | User-supplied panel-icon screenshot `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_f8725fbb062147e9891e697e68f17792/solution_designer_ed329018cc164d68b422f11ab3a501d5/context_files/ctx_a0998bdfbb45__image.png` | Confirm the exact requested opener | User prefers the familiar panel-outline icon inside the active Settings page rather than a permanent icon rail | No |
| 2026-07-15 | Other | User-supplied Agents navigation screenshot `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_f8725fbb062147e9891e697e68f17792/solution_designer_ed329018cc164d68b422f11ab3a501d5/context_files/ctx_66a59c19ae88__image.png` | Resolve open/close icon consistency | Use the exact existing left-sidebar panel icon beside `Agents` as the Settings opener and closer; do not add an `×` icon | No |
| 2026-07-15 | Other | User clarification about open-sidebar placement | Avoid a redundant Settings title row | Place the panel toggle as a separate far-right button in the existing Back to Workspace row | No |
| 2026-07-15 | Code | `autobyteus-web/layouts/settings.vue`; Electron `workspace-shell-window.ts` | Confirm host/container constraints | Settings layout is a shared full-viewport slot; Electron default window is 1200px but users can run wider; no platform-specific settings shell | No |
| 2026-07-15 | Code | Top-level templates of `ProviderAPIKeyManager.vue`, `MessagingSetupManager.vue`, `DisplaySettingsManager.vue`, `LanguageSettingsManager.vue`, `ServerSettingsManager.vue`, `ExtensionsManager.vue`, `AboutSettingsManager.vue`, package managers, and `ToolsManagementWorkspace.vue` | Decide where an overall opener can live | Section components use heterogeneous headers, content cards, and padding; copying the opener into each would create inconsistent placement and ownership | No |

## Current Behavior / Current Flow

- Current entrypoint: `/settings` page with optional `section` query; active section defaults to API Keys or is normalized on mount.
- Current primary flow: `Settings route -> settings.vue activeSection -> persistent navigation + content flex row -> TokenUsageStatistics.vue -> tokenUsageStatisticsStore fetch -> task/model table local overflow wrapper`.
- Current navigation flow: Section buttons mutate `activeSection` directly; the navigation is always in normal document/flex flow.
- Current statistics local flow: page mount initializes the last-seven-days range, fetches both projections, and renders grouping-specific table/states.
- Ownership observations:
  - `settings.vue` correctly owns shell layout and section transitions.
  - `TokenUsageStatistics.vue` correctly owns its toolbar and display states.
  - Table components correctly own table presentation and contained overflow.
  - No API/store/backend change is justified.
- Current behavior summary: The shell uses one persistent-navigation rule for both compact settings forms and the data-dense statistics section. At desktop widths the 16rem navigation is always subtracted before the table receives space.

## Design Health Assessment Evidence

- Change posture: `Behavior Change`
- Root cause classification: `File Placement Or Responsibility Drift`
- Refactor posture evidence summary: No broad refactor is needed. A bounded local navigation-model/component refactor is required to centralize destination identity, selection policy, toggle state, and the exact reusable panel icon while reducing the current long inline page markup.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `settings.vue` | Owns `activeSection` and all section-selection handlers | Correct authority already exists for page-specific layout behavior | No |
| `settings.vue` layout classes | Fixed `md:w-64` navigation for every active section implements the prior always-open behavior consistently | The new contextual-collapse behavior is a product change, not evidence of an already-broken local invariant | No |
| `settings.vue` inline navigation | Route policy, direct section mutation, Back action, every label/icon, Server submodes, and shell layout are colocated in the governing page | Adding contextual state directly would deepen responsibility drift; extract the presentational model while retaining the page as policy owner | No |
| Table components | Correct local overflow boundaries and current purposeful columns | Do not move shell concern into table or remove data to mask the issue | No |
| Prior completed table UX package | Redundant columns were already intentionally removed | Current pressure is shell allocation, not stale table clutter | No |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/pages/settings.vue` | Settings shell, navigation list, active section | Always reserves 16rem desktop nav | Primary open/collapsed state and navigation owner |
| Collapsed Settings shell header (new, likely focused component) | Reopen navigation and show active context only while collapsed | No current collapsed state exists | Own panel button and active section/mode label without altering managers |
| `autobyteus-web/components/settings/TokenUsageStatistics.vue` | Statistics controls/states/table selection | No longer needs a special opener when shell header is global | Preserve statistics ownership unchanged |
| `autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue` | Nine-column task table and interactions | Local overflow correct; first column deliberately wide | Reuse unchanged except tests if layout fixture integration requires |
| `autobyteus-web/components/settings/token-usage/TokenUsageModelStatisticsTable.vue` | Ten-column model table and chart | Local overflow correct | Reuse unchanged |
| `autobyteus-web/pages/__tests__/settings.spec.ts` | Settings routing/layout tests | Existing responsive class assertion | Extend for default-open sections, contextual statistics collapse, manual reopen/collapse, Server modes, narrow containment, and focus |
| Focused Settings manager specs | Section-owned behavior | Managers currently mount without shell header | Remain regression coverage; do not require per-manager opener tests |
| `autobyteus-web/localization/messages/{en,zh-CN}/settings.ts` | Settings copy | No Settings menu open/close labels today | Add localized open/close labels |
| `autobyteus-web/docs/settings.md` | Durable Settings behavior documentation | Describes Token Statistics toolbar and current sidebar identity | Delivery should document contextual collapse behavior |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-15 | Image inspection | Supplied 1980×1250 screenshot at original detail | `Created Time` is not visible; left navigation remains present | Reproduces user-visible pressure |
| 2026-07-15 | Historical browser evidence | Viewed 1440×900 prior task table probe PNG | Current task table fits inside ~1216px when isolated from Settings sidebar | Reclaiming shell width is a viable solution; actual page must be revalidated downstream |

No live runtime was started during solution design. The dedicated worktree has no local `autobyteus-web/node_modules`; the shared checkout does, but task isolation was not compromised by linking it during design. The API/E2E engineer owns realistic browser execution after implementation.

## External / Public Source Findings

Not required. The behavior is entirely within current local UI ownership and established HTML accessibility semantics. Downstream implementation/review should use platform semantics rather than a custom external dependency.

## Reproduction / Environment Setup

- Required services for full live reproduction: existing web frontend plus statistics API or representative mocked browser route.
- Relevant viewport targets: 1440×900 default-font wide case; 390×844 narrow case; user screenshot at 1980×1250.
- No external repositories or downloaded artifacts.
- No temporary setup requiring cleanup.

## Findings From Code / Docs / Data / Logs

1. The width loss occurs before the table: the Settings flex row subtracts 16rem for navigation.
2. Whole-page overflow protection is already present (`min-w-0`, contained scrollers), so the target change should preserve those invariants.
3. The toolbar uses `flex-wrap`, but current managers have heterogeneous header structures; the approved control therefore belongs in a separate shell-owned collapsed header rather than in the statistics toolbar.
4. Current managers do not share one header contract. The shell should add a lightweight navigation/context header rather than rewriting content-owned headings or inserting controls into each manager.
5. The existing navigation is a long inline list. The extracted navigation should use one authoritative destination model/selection path.
6. The homepage's `useLeftPanel` is global workspace-shell state and should not be reused directly. Settings collapse state is ephemeral and local to the Settings page.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject: token-usage ledger data and user display preferences exist elsewhere, but neither shape nor reader/writer changes.
- Relevant change: Layout/navigation state is ephemeral page state only.
- Required semantics and invariants preserved by direct use: Yes; data paths are untouched.
- Decision: `Not Affected`.

## Constraints / Dependencies / Compatibility Facts

- Base/finalization branch is `personal`.
- Browser and Electron render the same Nuxt page.
- English and Simplified Chinese localization boundaries are enforced by project guards.
- Existing global font-size preferences can increase width pressure; the solution must preserve readability and permit table-local scrolling rather than compressing below legible widths.
- Legacy query normalization (`about`, `server-status`) and server-not-running default behavior must remain intact.

## Open Unknowns / Risks

- The user clarified and approved the final technique: Settings remains normally open, Token Statistics contextually auto-collapses it to zero width, no compact rail/overlay is used, and the exact existing Agents panel icon toggles both states.
- Exact motion timing is implementation detail; behavior must remain clear with reduced motion.
- Actual Settings-page 1440px fit requires browser validation with representative table data after implementation.

## Notes For Architecture Reviewer

Requirements basis is approved. The design should keep the Settings shell as navigation/layout owner, avoid per-manager toggle injection, establish one destination/selection model, and leave every manager's internal data/content ownership unchanged.
