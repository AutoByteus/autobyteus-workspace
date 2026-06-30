# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; dedicated task worktree and branch created.
- Current Status: Expanded clean filter-control requirements approved; design spec produced for architecture review.
- Investigation Goal: Define the correct Token Statistics control-surface layout after the user expanded scope: keep the duplicate header removal and decide whether `By Task` / `By Model` should move into the filter/search controls as a grouping selector.
- Scope Classification (`Small`/`Medium`/`Large`): Medium-small
- Scope Classification Rationale: The implementation remains localized to the Token Statistics component/tests/localization/docs, but the user expanded the request from duplicate-title cleanup to the semantic layout of the grouping selector and filter/control surface.
- Scope Summary: Keep the redundant visible page-header removal, then replace the separate `By Task` / `By Model` tab row with a select/dropdown at the start of the top filter/control card, followed by date range and fetch action while preserving token statistics behavior.
- Primary Questions To Resolve:
  - Where is the visible `Token Statistics` page heading rendered? Resolved for prior scope: it was local to `autobyteus-web/components/settings/TokenUsageStatistics.vue` and has been removed in the current branch.
  - Is the heading local to the token statistics page or emitted by a shared settings wrapper? Resolved: it was local to `TokenUsageStatistics.vue`.
  - Are there tests/snapshots that need design consideration because they assert the heading? Resolved for prior scope: component coverage was updated for heading absence.
  - Is there an existing accessibility pattern for hidden page headings if the visible heading is removed? Resolved enough for scope: repo uses `sr-only` in some controls, but settings screens already exist without a top-level visible heading; no hidden replacement is required by current patterns.
  - What is `By Task` / `By Model` semantically? New scope finding: it is a local result grouping/presentation selector, not page navigation.
  - Where should the grouping selector live? Recommended: inside the top token statistics controls/filter card with date range and fetch action.
  - What stale structure should be removed? Recommended: remove the separate lower tab row/divider/spacing and the redundant `Usage during period ⓘ` helper.

## Request Context

User first provided a screenshot of the desktop app settings screen showing `Token Statistics` selected in the left settings menu and a duplicate large `Token Statistics` heading in the right main content area. User clarified that removing the heading should allow the search/filter area and page content to move upward and make better use of space. After that direct cleanup was implemented and delivery started, the user expanded the scope: `By Task` / `By Model` feels like a filter/grouping control, and because date range is also a filter, the grouping selector should live together with the date filter/search controls instead of remaining as a separate row below the filter card.

Reference image path supplied by user:
`/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_2d4b4516771e4e2c8c1496e5d66e3cf3/solution_designer_2a97e44a79934d3b8b25bfdc310990c3/context_files/ctx_f58af7cdebe4__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-remove-header`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-remove-header/tickets/in-progress/token-statistics-remove-header`
- Current Branch: `codex/token-statistics-remove-header`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-remove-header`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-06-30 before worktree creation.
- Task Branch: `codex/token-statistics-remove-header` created from `origin/personal` at `b3a2b15393bbf16fefccce9174b982a641bd42dc`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Authoritative artifacts and future code changes must be made in the dedicated task worktree, not `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-30 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch --show-current && git symbolic-ref refs/remotes/origin/HEAD` from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Bootstrap repo and branch context | Repo root is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; current shared branch was `personal` tracking `origin/personal`; remote is `git@github.com-ryan:AutoByteus/autobyteus-workspace.git`; remote default points to `origin/personal`. | No |
| 2026-06-30 | Command | `git worktree list --porcelain && git fetch origin --prune` | Check existing worktrees and refresh remote refs before creating task worktree | Many existing worktrees; no matching `token-statistics-remove-header` worktree observed; fetch completed successfully. | No |
| 2026-06-30 | Command | `git show-ref --verify --quiet refs/heads/codex/token-statistics-remove-header; git ls-remote --heads origin codex/token-statistics-remove-header` | Ensure task branch does not already exist | No local or remote task branch found. | No |
| 2026-06-30 | Command | `git worktree add -b codex/token-statistics-remove-header /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-remove-header origin/personal` | Create dedicated task branch/worktree | Dedicated worktree created at base commit `b3a2b153...`; branch tracks `origin/personal`. | No |
| 2026-06-30 | Data | User screenshot path `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_2d4b4516771e4e2c8c1496e5d66e3cf3/solution_designer_2a97e44a79934d3b8b25bfdc310990c3/context_files/ctx_f58af7cdebe4__image.png` | Understand visual issue | Shows `Token Statistics` selected in sidebar and duplicate visible `Token Statistics` heading in main page above controls. | No |
| 2026-06-30 | Command | `rg -n "Token Statistics|token statistics|tokenStatistics|TokenStatistics|statistics" autobyteus-web src applications package.json` | Locate token statistics UI code | Found `TokenUsageStatistics.vue`, component tests, store docs, generated localization keys, and settings page section translation. `src` did not exist at repo root; relevant code is in `autobyteus-web`. | No |
| 2026-06-30 | Code | `autobyteus-web/components/settings/TokenUsageStatistics.vue` lines 1-120 | Identify visible heading source and adjacent controls | Lines 3-4 render local header wrapper and `<h2>` with `settings.components.settings.TokenUsageStatistics.token_usage_statistics`; line 7 starts scroll content with date range controls, tabs, loading/error/empty states, and tables. | Remove only local header wrapper in implementation. |
| 2026-06-30 | Code | `autobyteus-web/pages/settings.vue` lines 33-42 and 209-210 | Verify sidebar identity and component mount point | Sidebar token-usage nav button renders `settings.page.sections.tokenUsage`; content area mounts `TokenUsageStatistics` when active section is `token-usage`. | Preserve sidebar and mount behavior. |
| 2026-06-30 | Code | `autobyteus-web/components/settings/__tests__/TokenUsageStatistics.spec.ts` lines 1-143 | Check current durable coverage | Tests cover date defaults/fetching, usage-period affordance, tabs, edited ranges, and empty states; no assertion requires the visible heading. | Add regression assertion that visible heading wrapper is absent while controls remain. |
| 2026-06-30 | Code | `autobyteus-web/components/settings/MessagingSetupManager.vue` lines 1-20 and `autobyteus-web/components/settings/__tests__/NodeManager.spec.ts` lines 193-202 | Check settings precedent for no top-level page heading | Messaging starts directly with content cards in `p-8`; NodeManager test explicitly expects no `h2` for its default tabbed layout. | Supports no-refactor local UI cleanup. |
| 2026-06-30 | Command | `rg -n "sr-only|visually-hidden|aria-labelledby|aria-label" autobyteus-web/components autobyteus-web/pages | head -100` | Check accessibility conventions | `sr-only` exists for controls; settings screens also use `aria-label` where needed. No mandatory shared page-heading pattern found for settings managers. | No hidden replacement required unless architecture review requests one. |
| 2026-06-30 | Code | `autobyteus-web/components/settings/TokenUsageStatistics.vue` and `autobyteus-web/components/settings/__tests__/TokenUsageStatistics.spec.ts` | Apply direct approved UI change | Removed local visible header wrapper; added component regression assertions that no `h2`/`Token Statistics` visible text is rendered while date controls remain. | No |
| 2026-06-30 | Command | `pnpm -C autobyteus-web exec nuxi prepare && pnpm -C autobyteus-web exec vitest run components/settings/__tests__/TokenUsageStatistics.spec.ts` | Validate focused component behavior after UI change | Passed: 1 test file, 3 tests. Warning observed: KaTeX quirks-mode warning from test setup. | No |
| 2026-06-30 | Command | `rg -n "TokenUsageStatistics\.token_usage_statistics|token_usage_statistics|settings\.pages\.settings\.token_usage_statistics|settings\.page\.sections\.tokenUsage" autobyteus-web --glob '!node_modules' --glob '!.nuxt' --glob '!dist'` | Investigate stale translation keys after header removal | Found stale generated title keys in `en/settings.generated.ts` and `zh-CN/settings.generated.ts`; found stale unit-test mock message; confirmed sidebar `settings.page.sections.tokenUsage` remains used and must stay. | Clean stale generated title keys and mock. |
| 2026-06-30 | Code | `autobyteus-web/localization/messages/en/settings.generated.ts`, `autobyteus-web/localization/messages/zh-CN/settings.generated.ts`, `autobyteus-web/components/settings/__tests__/TokenUsageStatistics.spec.ts` | Remove stale translation artifacts | Removed unused `settings.components.settings.TokenUsageStatistics.token_usage_statistics`, unused `settings.pages.settings.token_usage_statistics`, and the now-unused unit test mock. Kept `settings.page.sections.tokenUsage` for the sidebar. | No |
| 2026-06-30 | Command | `pnpm -C autobyteus-web exec vitest run components/settings/__tests__/TokenUsageStatistics.spec.ts localization/messages/__tests__/zhCnGlossaryConsistency.spec.ts localization/messages/__tests__/zhCnActionLabelConsistency.spec.ts` | Check component and nearby localization tests | TokenUsageStatistics and zh-CN action-label tests passed. zh-CN glossary consistency failed on unrelated existing compaction settings text containing deprecated `代理`; not caused by this change. | Delivery should note unrelated existing glossary failure if broad localization tests are considered. |
| 2026-06-30 | Command | `pnpm -C autobyteus-web exec vitest run components/settings/__tests__/TokenUsageStatistics.spec.ts && pnpm -C autobyteus-web audit:localization-literals` | Validate focused component behavior and localization literal audit after cleanup | Passed focused component test: 1 file, 3 tests. Localization literal audit passed with zero unresolved findings. Non-blocking warnings observed: KaTeX quirks-mode warning and package `type: module` warning during audit. | No |
| 2026-06-30 | Data | User follow-up with screenshot path `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_2d4b4516771e4e2c8c1496e5d66e3cf3/solution_designer_2a97e44a79934d3b8b25bfdc310990c3/context_files/ctx_203adb2a783a__image.png` | Analyze expanded UI request | User identified `By Task` / `By Model` as conceptually similar to filters and asked whether they should live with the date filter/search area. Screenshot shows date controls in a card, separate `By Task` / `By Model` tab row below, then table. | Update requirements and produce design spec after approval. |
| 2026-06-30 | Code | `autobyteus-web/components/settings/TokenUsageStatistics.vue` current branch | Re-read current token statistics layout after header cleanup | Root content starts with date controls card; separate lower tab row still renders `By Task` / `By Model`; `activeTab` is local presentation state selecting task vs model results. | Move grouping selector into controls card in target design. |
| 2026-06-30 | Other | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-remove-header/tickets/in-progress/token-statistics-remove-header/delivery-pause-report.md` | Incorporate delivery pause state | Delivery paused finalization before push/merge/release; delivery reverted local docs-sync edits and removed stale delivery reports; local unsigned Electron build succeeded for prior candidate. | Include pause artifact in future handoffs. |
| 2026-06-30 | Other | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-remove-header/tickets/in-progress/token-statistics-remove-header/scope-expansion-rework.md` | Record design re-entry | Rework artifact records the scope expansion and marks prior delivery conclusions as superseded until updated. | Include in revised package. |
| 2026-06-30 | Other | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-remove-header/tickets/in-progress/token-statistics-remove-header/text-ui-filter-control-design.md` | Create text UI reference requested by user | Documents current layout to replace, target desktop/wrapped layouts, grouping-control shape, and explicit avoid-list for the old separate tab row. | Use as design input and include in architecture review package. |
| 2026-06-30 | Data | User clean UI feedback | Refine visible-copy requirements | User emphasized clean UI and no redundant words. This changes grouping copy from a visible `Group by:` label to only the existing `By Task` / `By Model` visible labels, with any accessibility label non-visible if needed. | Update text UI and requirements. |
| 2026-06-30 | Data | User dropdown/order/usage-helper feedback | Refine clean filter layout | User proposed putting `By Task` / `By Model` into a normal selection/dropdown, placing it before the date range, and removing `Usage during period ⓘ` as obvious/redundant. | Update text UI and requirements; design spec should use grouping select -> date range -> fetch. |
| 2026-06-30 | Data | User clean option-label feedback | Refine grouping option copy | User suggested removing `By` from `By Task` / `By Model` because the select/filter context already communicates the relation. Target visible options are now `Task` and `Model`. | Update text UI and requirements. |
| 2026-06-30 | Data | User approval for expanded clean filter-control layout | Lock requirements for design | User approved the final clean approach: `Task` / `Model` dropdown first, date range second, fetch action last, no redundant helper labels. | Produce design spec and hand off to architecture reviewer. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Desktop/web settings UI, Token Statistics settings menu item.
- Current execution flow on current branch: User opens Settings -> selects `Token Statistics` from left menu -> `pages/settings.vue` sets `activeSection = 'token-usage'` -> content renders `TokenUsageStatistics` -> component renders the top date-range/fetch controls card -> component renders a separate `By Task` / `By Model` tab row -> component renders loading/error/empty/table content for the selected grouping.
- Ownership or boundary observations: `pages/settings.vue` owns settings navigation and active section selection. `TokenUsageStatistics.vue` owns token statistics controls, local grouping state, fetch action, and table selection. The old duplicate visible heading was local and has been removed. The remaining separate tab row misrepresents local grouping state as page-tab structure, even though it is part of the token statistics query/presentation controls.
- Current behavior summary: The page identity duplication has been fixed in the current branch, but the `By Task` / `By Model` selector still sits outside the filter card and `Usage during period ⓘ` remains visible even though the date range already communicates period scope.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UI Cleanup
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture evidence summary: Local UI-structure refactor needed. The existing data/store/query ownership remains healthy, but the grouping selector should be a select/dropdown owned visually by the token statistics controls card, and redundant usage-period helper copy should be removed.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshot | Duplicate page label appears in sidebar and main heading. | Narrow UI cleanup likely sufficient. | No |
| `TokenUsageStatistics.vue` lines 3-4 | Heading is one local wrapper/h2 before content. | Local component edit can remove duplication. | No |
| `pages/settings.vue` lines 33-42 | Sidebar remains visible and labels selected page. | Visible page identity is preserved outside the heading. | No |
| `TokenUsageStatistics.spec.ts` | Existing tests covered behavior but not heading absence. | Regression assertion added for no visible duplicate heading and continued date-control rendering; stale mock entry removed. | No |
| `By Task` / `By Model` separate tab row | Selector is controlled by local `activeTab` state and chooses result projection, not route/page section. | It belongs as the first select/dropdown in the token statistics controls card rather than a separate page-tab row. | Replace with grouping select at the start of the controls card. |
| Date range controls card | Already owns the date filter and fetch action for the same token statistics query, but still includes redundant `Usage during period ⓘ`. | Cohesive clean control surface should include grouping first, then dates, then fetch, without redundant helper copy. | Replace helper/tab row with compact controls. |
| `MessagingSetupManager.vue`, `NodeManager.spec.ts` | Settings UI can intentionally omit a visible page-level heading. | No shared settings redesign needed. | No |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/pages/settings.vue` | Settings shell, sidebar navigation, active section mounting | Owns selected `Token Statistics` sidebar label and mounts `TokenUsageStatistics` for `token-usage` | Preserve unchanged; no shell-level layout change needed. |
| `autobyteus-web/components/settings/TokenUsageStatistics.vue` | Token statistics page controls, fetch action, grouping state, table/empty/loading/error rendering | Current branch has no duplicate heading, but still renders a separate `By Task` / `By Model` tab row below the date controls card and still renders `Usage during period ⓘ` inside the card. | Replace tab row with a grouping select at the start of the controls card and remove the usage-period helper. |
| `autobyteus-web/components/settings/__tests__/TokenUsageStatistics.spec.ts` | Component behavior coverage for token statistics page | Currently verifies heading absence, default grouping, grouping switch, date edits, fetch calls, and empty states; it does not yet assert grouping is inside the controls card or that the old separate tab row is absent. | Update coverage for new grouping-control placement. |
| `autobyteus-web/localization/messages/en/settings.generated.ts` and `zh-CN/settings.generated.ts` | Generated localization catalogs | Contained stale generated title keys for the deleted visible heading; no source references remained after header removal. | Removed stale generated title keys; kept active sidebar translation keys. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-30 | Visual Evidence | User-provided screenshot inspected via `view_image` | Visible duplicate `Token Statistics` heading; controls start lower than necessary. | Requirements should require removal of visible heading and no replacement blank space. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: This is a local UI change.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: For component coverage, existing Vitest component test environment should be sufficient. Full visual verification may use the app if downstream API/E2E decides it is warranted.
- Required config, feature flags, env vars, or accounts: None identified for component-level verification.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated git worktree creation only.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

Current branch already removed the duplicate visible heading and stale heading translations. The expanded implementation path should now treat the top card as the governing token statistics filter surface ordered as grouping select -> date range -> fetch action. It should replace the lower `By Task` / `By Model` tab row with a compact select/dropdown, remove `Usage during period ⓘ`, and avoid redundant visible labels such as `Group by:` or `Select Date Range:`. Do not move token-statistics behavior into the settings shell and do not change store/query/table code.

## Constraints / Dependencies / Compatibility Facts

- Dedicated task branch/worktree is required for all further work.
- Preserve token statistics behavior; only visible layout/control placement should change.
- Avoid broad settings page redesign.
- Avoid compatibility switches or dual old/new header behavior.
- Preserve existing localization system; no new visible copy is needed, and stale generated heading keys have been removed.

## Open Unknowns / Risks

- Visible filter copy should stay minimal: use a `Task` / `Model` select, date values with `to`, and `Fetch Statistics`; do not add visible `Group by:`, `Select Date Range:`, or `Usage during period` text.
- Control row wrapping should be checked for narrower settings content widths.
- Delivery-generated Electron build artifacts from the prior candidate are now only prior-scope evidence; delivery should rebuild after the expanded implementation lands if user verification needs a packaged app.

## Notes For Architect Reviewer

Scope expanded after the earlier direct implementation. Delivery is paused. Requirements are approved for a clean top filter card ordered as grouping select -> date range -> fetch; design spec is ready for architecture review.
