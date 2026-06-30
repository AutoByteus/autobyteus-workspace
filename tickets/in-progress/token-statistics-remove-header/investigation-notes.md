# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; dedicated task worktree and branch created.
- Current Status: Direct implementation applied after user approval; stale translation cleanup completed; focused component test and localization literal audit passed.
- Investigation Goal: Locate the Token Statistics settings page header source, determine the narrowest safe UI change to remove the redundant visible heading, and capture any accessibility/test implications.
- Scope Classification (`Small`/`Medium`/`Large`): Small
- Scope Classification Rationale: User request targets one visible heading on one settings page; no token data behavior changes are requested.
- Scope Summary: Remove the redundant visible `Token Statistics` page header so controls and content move upward while preserving the left navigation selected item and token statistics page functionality.
- Primary Questions To Resolve:
  - Where is the visible `Token Statistics` page heading rendered? Resolved: `autobyteus-web/components/settings/TokenUsageStatistics.vue` lines 3-4.
  - Is the heading local to the token statistics page or emitted by a shared settings wrapper? Resolved: it is local to `TokenUsageStatistics.vue`.
  - Are there tests/snapshots that need design consideration because they assert the heading? Resolved: current `TokenUsageStatistics.spec.ts` does not assert the heading; it should be expanded to assert heading absence and control preservation.
  - Is there an existing accessibility pattern for hidden page headings if the visible heading is removed? Resolved enough for scope: repo uses `sr-only` in some controls, but settings screens already exist without a top-level visible heading; no hidden replacement is required by current patterns.

## Request Context

User provided a screenshot of the desktop app settings screen showing `Token Statistics` selected in the left settings menu and a duplicate large `Token Statistics` heading in the right main content area. User clarified that removing the heading should allow the search/filter area and page content to move upward and make better use of space.

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

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Desktop/web settings UI, Token Statistics settings menu item.
- Current execution flow: User opens Settings -> selects `Token Statistics` from left menu -> `pages/settings.vue` sets `activeSection = 'token-usage'` -> content renders `TokenUsageStatistics` -> component renders visible local `Token Statistics` `<h2>` wrapper -> component renders date range/search controls -> tabs -> loading/error/empty/table content.
- Ownership or boundary observations: `pages/settings.vue` owns settings navigation and active section selection. `TokenUsageStatistics.vue` owns token statistics page state and controls. The duplicate heading is a local visual element within the token statistics component; no cross-boundary ownership issue is present.
- Current behavior summary: The selected navigation item and main content heading redundantly identify the page, consuming vertical space above the useful controls and table.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UI Cleanup
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found
- Refactor posture evidence summary: No refactor needed. The existing settings shell and token statistics component responsibilities remain healthy; the change removes one local visual wrapper without altering data flow or ownership boundaries.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshot | Duplicate page label appears in sidebar and main heading. | Narrow UI cleanup likely sufficient. | No |
| `TokenUsageStatistics.vue` lines 3-4 | Heading is one local wrapper/h2 before content. | Local component edit can remove duplication. | No |
| `pages/settings.vue` lines 33-42 | Sidebar remains visible and labels selected page. | Visible page identity is preserved outside the heading. | No |
| `TokenUsageStatistics.spec.ts` | Existing tests covered behavior but not heading absence. | Regression assertion added for no visible duplicate heading and continued date-control rendering; stale mock entry removed. | No |
| `MessagingSetupManager.vue`, `NodeManager.spec.ts` | Settings UI can intentionally omit a visible page-level heading. | No shared settings redesign needed. | No |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/pages/settings.vue` | Settings shell, sidebar navigation, active section mounting | Owns selected `Token Statistics` sidebar label and mounts `TokenUsageStatistics` for `token-usage` | Preserve unchanged; no shell-level layout change needed. |
| `autobyteus-web/components/settings/TokenUsageStatistics.vue` | Token statistics page controls, fetch action, tabs, table/empty/loading/error rendering | Contains redundant visible header wrapper at lines 3-4 before useful content begins at line 7 | Modify locally by removing header wrapper. |
| `autobyteus-web/components/settings/__tests__/TokenUsageStatistics.spec.ts` | Component behavior coverage for token statistics page | Does not assert the visible heading; already verifies functional controls | Extend with heading-absence/control-presence assertion. |
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

The implementation path is narrow: remove the `<div class="flex items-center justify-between px-8 pt-8 pb-4 flex-shrink-0">` wrapper and its `<h2>` child from `TokenUsageStatistics.vue`. Leave the existing `flex-1 overflow-auto p-8` content region as the first content child so the date range/search card moves upward while retaining normal page padding. Do not move token-statistics behavior into the settings shell and do not change store/query/table code. After removal, also delete stale translation artifacts that existed only for the removed heading: `settings.components.settings.TokenUsageStatistics.token_usage_statistics`, `settings.pages.settings.token_usage_statistics`, and the obsolete unit-test mock entry. Keep `settings.page.sections.tokenUsage` because it is still the active sidebar label.

## Constraints / Dependencies / Compatibility Facts

- Dedicated task branch/worktree is required for all further work.
- Preserve token statistics behavior; only visible layout/title should change.
- Avoid broad settings page redesign.
- Avoid compatibility switches or dual old/new header behavior.
- Preserve existing localization system; no new visible copy is needed, and stale generated heading keys have been removed.

## Open Unknowns / Risks

- Whether downstream API/E2E will require visual screenshot evidence or component tests only. Functional scope suggests component tests plus possibly a focused UI smoke check are enough.
- Whether architecture reviewer prefers a hidden semantic title. Current evidence does not require it; adding hidden text may complicate the explicit “remove duplicate words” requirement, so the design should avoid it unless requested.

## Notes For Architect Reviewer

User approved direct implementation and commit for this small UI cleanup. Change is local to `TokenUsageStatistics.vue`; no refactor, no settings shell changes, token usage behavior preserved, component regression coverage added, stale heading translations removed.
