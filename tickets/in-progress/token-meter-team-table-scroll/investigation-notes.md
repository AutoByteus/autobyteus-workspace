# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Deep investigation complete; design-ready requirements prepared.
- Investigation Goal: Locate the Token tab Team usage UI, understand current wide/narrow layout behavior, and design a scoped change to keep a tabular layout with horizontal scrolling at constrained widths.
- Scope Classification (`Small`/`Medium`/`Large`): Medium-small
- Scope Classification Rationale: Expected frontend presentation change in an existing Token tab component, with colocated test updates and likely documentation impact. No backend/API/data-flow changes found.
- Scope Summary: Replace unclear narrow stacked/card layout for team token usage with one authoritative horizontally scrollable table layout.
- Primary Questions To Resolve:
  - Which frontend component owns the Token tab Team section? Resolved: `TeamTokenUsageSummary.vue`.
  - How is the current responsive collapse implemented? Resolved: scoped CSS default card-like grid plus `@container (min-width: 46rem)` table switch.
  - Does horizontal overflow need to be enabled on a table wrapper, card, or parent right-pane container? Resolved: use a scoped Team table wrapper inside `TeamTokenUsageSummary.vue`, not the whole Token tab.
  - What existing tests or stories cover the Token tab? Resolved: colocated `TokenUsageMeterPanel.spec.ts` covers team rows/focused state; no story found in search.

## Request Context

User reports that the Token tab's team token usage UI is clear when the tab is wide but becomes unclear when narrow. The screenshots show a wide table-style Team section and a narrow stacked/card-like per-member view. User asks to analyze using a column/table layout: first column member name, then Gross Input, Output, Total Tokens, and last column Cost, with horizontal scrolling when width is too small.

Reference screenshots supplied by user:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_c53b47f3b658462fac8385368189fe3e/solution_designer_3e776bea4a5e411fa57f17f6a5acd07d/context_files/ctx_2dbebdc82f5a__image.png`
  - Shows narrow right-side Token tab with Team comparison collapsed into stacked per-member card rows. Header is absent. Cost details wrap into each member block and scanning across columns is difficult.
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_c53b47f3b658462fac8385368189fe3e/solution_designer_3e776bea4a5e411fa57f17f6a5acd07d/context_files/ctx_7203421f7105__image.png`
  - Shows wide Token tab with desired Team table headers: Member, Gross Input, Output, Total Tokens, Cost. Rows align well, with Team total final row.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll`
- Current Branch: `codex/token-meter-team-table-scroll`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-06-27.
- Task Branch: `codex/token-meter-team-table-scroll` created from `origin/personal`.
- Expected Base Branch (if known): `personal` / `origin/personal`
- Expected Finalization Target (if known): `personal` unless downstream/user specifies otherwise.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Root checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` had unrelated untracked `.article-work/` and `docs/articles/`; authoritative task work is isolated in the dedicated worktree above.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-27 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch --show-current && git symbolic-ref refs/remotes/origin/HEAD` | Bootstrap current repository state. | Root checkout is Git repo on `personal`, tracking `origin/personal`; unrelated untracked article files present. | No |
| 2026-06-27 | Command | `git fetch origin --prune` | Refresh tracked remote refs before task branch creation. | Fetch completed successfully. | No |
| 2026-06-27 | Command | `git worktree list --porcelain` and branch existence checks | Check for existing dedicated worktree/branch. | No `codex/token-meter-team-table-scroll` worktree/branch existed. Related historical token worktrees exist but do not match this task. | No |
| 2026-06-27 | Command | `git worktree add -b codex/token-meter-team-table-scroll /Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll origin/personal` | Create mandatory dedicated task worktree/branch. | Worktree and branch created successfully at `820bce31`. | No |
| 2026-06-27 | Other | User request and supplied screenshots | Understand reported UI problem and desired target behavior. | Narrow layout stacks per-member card rows and makes comparison/cost column unclear; wide layout table is preferred. | No |
| 2026-06-27 | Command | `rg -n "Token Meter|Per-member token|Gross Input|gross input|TOTAL TOKENS|price missing|token and cost" autobyteus-web -S` | Locate Token tab UI and text. | Found `TokenUsageMeterPanel.vue`, `TeamTokenUsageSummary.vue`, localization messages, docs, and component tests. | No |
| 2026-06-27 | Code | `autobyteus-web/components/layout/RightSideTabs.vue` | Verify Token tab entrypoint. | Active right-side tab `usage` mounts `TokenUsageMeterPanel` inside `h-full min-h-0`; outer tab shell uses `overflow-hidden`. | No |
| 2026-06-27 | Code | `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Verify Token tab component boundary and delegation. | Panel owns top-level Token Meter sections and delegates team comparison to `TeamTokenUsageSummary` only when `isTeamContext` is true. It receives rows and team total state from `useTokenUsageWorkspaceScope`. | No |
| 2026-06-27 | Code | `autobyteus-web/composables/useTokenUsageWorkspaceScope.ts` | Verify data ownership. | Composable owns resolving `teamRows`, focused team member primary summary, and `teamTotalSummary`; no layout behavior here. This boundary remains healthy. | No |
| 2026-06-27 | Code | `autobyteus-web/components/workspace/usage/TeamTokenUsageSummary.vue` | Inspect current narrow/wide team comparison layout. | Component uses `container-type: inline-size`. Header is hidden by default. Rows default to card/list grid (`repeat(3, minmax(0, 1fr))`) with member and cost spanning full width. `@container (min-width: 46rem)` switches to table-like grid columns and hides per-cell labels. This is the exact obsolete behavior. | No |
| 2026-06-27 | Code | `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | Identify durable frontend coverage. | Tests cover Token Meter hierarchy, focused team member primary selection, team rows, focused row attributes, status labels, and Team total. Team-row label expectations may need updating if semantic table headers replace per-row labels. | Yes: implementation should update tests for table headers and scroll wrapper. |
| 2026-06-27 | Code | `autobyteus-web/localization/messages/en/shell.ts` | Check existing labels. | Existing messages already cover required headers: Member, Gross input, Output, Total tokens, Cost, Focused, Team total, loading/error/no usage, cost short labels. No new localization appears required. | No |
| 2026-06-27 | Doc | `autobyteus-web/docs/agent_execution_architecture.md` lines around Token Usage Meter | Check documented Token tab boundaries. | Docs confirm `TokenUsageMeterPanel.vue` is presentation-only, `useTokenUsageWorkspaceScope.ts` owns Token tab subject boundary, and `TeamTokenUsageSummary.vue` renders subordinate team comparison. One line references previous proof for compact team rows without horizontal overflow, which will become stale. | Yes: delivery docs sync should update. |
| 2026-06-27 | Doc | `autobyteus-web/docs/settings.md` matching Token Usage Meter section | Check duplicated documented behavior. | Same Token Usage Meter documentation is duplicated in settings docs and will need sync if behavior changes. | Yes: delivery docs sync should update. |
| 2026-06-27 | Command | `test -d node_modules && ...; test -d autobyteus-web/node_modules && ...` | Check local test-readiness before considering probe test execution. | No root or `autobyteus-web` `node_modules` present in new worktree. No tests run during design investigation. | Downstream implementation/test stages should install/reuse dependencies as appropriate. |
| 2026-06-27 | Command | `cat autobyteus-web/AGENTS.md`, `cat package.json`, `cat pnpm-workspace.yaml` | Read local developer/testing instructions and workspace shape. | Web docs say colocated tests, use `pnpm test:nuxt --run` to avoid watch mode, never `git add .`; workspace includes `autobyteus-web`. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: User selects the right-side `Token` tab. `RightSideTabs.vue` maps user-visible Token tab to internal tab id `usage` and mounts `TokenUsageMeterPanel.vue`.
- Current execution flow:
  1. `RightSideTabs.vue` mounts `TokenUsageMeterPanel.vue` in the right-side content shell.
  2. `TokenUsageMeterPanel.vue` calls `useTokenUsageWorkspaceScope()`.
  3. `useTokenUsageWorkspaceScope.ts` resolves current context, focused leaf team member, per-member rows, loading/error state, and team total summary from stores/GraphQL hydration.
  4. `TokenUsageMeterPanel.vue` renders primary focused-run usage sections and passes team rows/total props to `TeamTokenUsageSummary.vue` for team workspaces.
  5. `TeamTokenUsageSummary.vue` renders the Team comparison and formats each cell via `tokenUsageFormatting`.
- Ownership or boundary observations:
  - `useTokenUsageWorkspaceScope.ts` is the data/subscription/hydration boundary and should not receive layout concerns.
  - `TokenUsageMeterPanel.vue` owns the Token tab hierarchy and remains presentation-only.
  - `TeamTokenUsageSummary.vue` is the proper owner for the Team comparison layout and the only file that should need structural/CSS changes for this request.
  - `tokenUsageFormatting` owns formatting helpers and should be reused, not duplicated.
- Current behavior summary:
  - Wide containers (`@container (min-width: 46rem)`) show a table-like grid with header and aligned columns.
  - Narrow containers hide the header and use stacked/card-like rows with per-cell labels and a full-width cost row. This matches the user's unclear screenshot and is now the behavior to replace.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found
- Refactor posture evidence summary: Existing ownership boundaries are appropriate. A local presentation markup/CSS replacement in `TeamTokenUsageSummary.vue` should satisfy the request without architectural refactor.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `TeamTokenUsageSummary.vue` | The responsive card/list behavior is entirely local CSS and markup inside the Team comparison presentation owner. | No broader boundary problem; replace the obsolete local responsive branch. | No |
| `useTokenUsageWorkspaceScope.ts` | Data rows and focused/total summaries are already computed cleanly and passed as props. | No data model/API changes needed. | No |
| `TokenUsageMeterPanel.vue` | Token tab delegates team comparison to the correct child component. | Parent hierarchy remains healthy. | No |
| Existing docs | Docs explicitly separate Token tab data boundary and presentation components. | Design should preserve that separation. | Delivery docs sync should update stale horizontal-overflow wording. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/layout/RightSideTabs.vue` | Right-side tab shell and Token tab mount. | Mounts `TokenUsageMeterPanel` under active tab `usage`; shell clips overflow at tab content level. | Do not change for this task. Contain horizontal scroll inside Team table. |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Token Meter hierarchy and team summary delegation. | Presentation-only; no pricing recalculation. Passes data props to `TeamTokenUsageSummary`. | Do not expand responsibilities. |
| `autobyteus-web/components/workspace/usage/TeamTokenUsageSummary.vue` | Team comparison presentation. | Current default/narrow CSS causes stacked cards; wide container query provides desired table-like layout. | Primary implementation owner. Replace card/list branch with always-table layout and scoped overflow. |
| `autobyteus-web/composables/useTokenUsageWorkspaceScope.ts` | Token tab data boundary for selected run/team. | Computes `teamRows` and `teamTotalSummary`. | No changes expected. |
| `autobyteus-web/components/workspace/usage/tokenUsageFormatting` | Formatting helpers for token/cost/status display. | Already used by `TeamTokenUsageSummary`. | Reuse existing helpers; no duplicate formatting. |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | Component coverage for Token Meter. | Tests currently cover team rows and focused state, but should be adjusted/expanded for table headers and scroll wrapper. | Modify colocated tests. |
| `autobyteus-web/localization/messages/en/shell.ts` | English Token tab labels. | Required labels already exist. | No changes expected. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Durable docs for Token Usage Meter architecture/behavior. | Contains now-stale wording about proof for compact rows without horizontal overflow. | Delivery docs sync should update. |
| `autobyteus-web/docs/settings.md` | Duplicated durable docs/settings narrative. | Same Token Usage Meter wording appears here. | Delivery docs sync should update. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-27 | Probe | Visual inspection of supplied screenshots via `view_image` | Narrow screenshot shows stacked Team rows with labels and full-width cost; wide screenshot shows table header and aligned columns. | Confirms user-reported behavior and maps directly to CSS container query threshold. |
| 2026-06-27 | Probe | `test -d node_modules` and `test -d autobyteus-web/node_modules` | No dependencies installed in the dedicated worktree. | No test execution during design; implementation/API-E2E stages should prepare environment if needed. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: This is an internal frontend presentation change; no external reference needed.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: For component tests, existing Vitest/Nuxt frontend test environment. For visual confirmation, a running web/electron app with a team workspace and Token tab data or mocked summaries.
- Required config, feature flags, env vars, or accounts: None identified for the component-level change.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation described above.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- The desired wide table already exists as a CSS branch, not a separate data path. The implementation can reuse the same display values and formatting currently used in wide mode.
- The root cause of unclear narrow UI is the default/narrow CSS branch in `TeamTokenUsageSummary.vue`, especially hidden header, row grid with member/cost spanning full width, visible per-cell labels, and wrapping cost split.
- A clean solution is to remove the responsive card/list branch and make table semantics authoritative across widths, with a table wrapper controlling horizontal overflow.
- The parent Token tab already has vertical `overflow-auto`; horizontal scroll should be nested in the Team section to avoid causing the entire right panel to scroll sideways.
- Existing tests can be updated in JSDOM for structure, but real scrollbar behavior requires browser/visual evidence downstream.

## Constraints / Dependencies / Compatibility Facts

- Preserve existing token usage data, cost estimation semantics, status labels, and formatting helpers.
- Do not introduce provider pricing metadata or recalculation into frontend presentation components.
- Do not change team member identity/focus resolution.
- Replace the narrow stacked/card behavior cleanly; do not keep a compatibility dual rendering path for old narrow cards.
- `autobyteus-web/AGENTS.md` says to use colocated tests and `pnpm test:nuxt --run` for frontend tests; no `git add .`.

## Open Unknowns / Risks

- Exact minimum table width and cost column min-width may need visual tuning during implementation.
- Component tests cannot measure real CSS overflow/scrollbars. Downstream visual/API-E2E investigation should validate in a constrained-width Token tab.
- If implementation converts to semantic table markup, existing row `.text()` label assertions should be intentionally updated so tests no longer require duplicated per-row labels.

## Notes For Architect Reviewer

- This is a presentation-only behavior change. The existing data-flow boundary remains healthy.
- Recommended architecture decision: no broad refactor; local replacement of `TeamTokenUsageSummary.vue` narrow responsive branch with one scrollable table presentation.
- Watch for accidental data-flow expansion. The component should continue receiving rows/summary props and using existing formatters only.
- Watch for compatibility pressure: old stacked/card narrow behavior should be removed, not preserved behind another breakpoint.
