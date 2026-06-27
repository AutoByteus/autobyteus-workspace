# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Design-impact reset complete for user-selected Option B; requirements/design updated for grouped token+cost metric columns.
- Investigation Goal: Record the current implementation state, the API/E2E design-impact reroute, and the refined grouped token+cost layout requirements before downstream work resumes.
- Scope Classification (`Small`/`Medium`/`Large`): Medium-small
- Scope Classification Rationale: The task remains a frontend presentation change in an existing Token tab component plus colocated tests and downstream docs/coverage updates. It is a design-impact reset because the accepted UX contract changed after implementation/API-E2E validation.
- Scope Summary: Replace the previously implemented five-column Cost-last Team usage table with a four-logical-column grouped metric table: `Member`, `Gross Input`, `Output`, `Total`, where each metric column shows token count plus corresponding cost subline.
- Primary Questions To Resolve:
  - Which component owns the affected UI? Resolved: `TeamTokenUsageSummary.vue`.
  - Does Option B require data/API changes? Resolved: no; needed values already exist on `TokenUsageRunSummary`.
  - Which cost maps to which metric? Resolved by design assumption: Gross Input -> `estimatedApiInputCost`; Output -> `estimatedApiOutputCost`; Total -> `estimatedApiTotalCost`.
  - Should horizontal scroll remain? Resolved: yes, scoped to Team table wrapper with recalibrated width.

## Request Context

Original user request: the Token tab's team token usage UI is clear when wide but unclear when narrow. The user wanted a stable table layout with horizontal scrolling instead of stacked cards.

After implementation and API/E2E validation of the first design, the user refined the table semantics and selected Option B: group token amount and corresponding cost in the same metric column rather than using a separate final Cost column.

Relevant reroute quote from user, recorded by API/E2E:

> “Yeah, I think option B is the best. It's pretty simple, right? Because you put the token and the cost together. And yeah, it's very natural. When people read it, it's the most natural way, I would say.”

Original reference screenshots supplied by user:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_c53b47f3b658462fac8385368189fe3e/solution_designer_3e776bea4a5e411fa57f17f6a5acd07d/context_files/ctx_2dbebdc82f5a__image.png`
  - Shows narrow right-side Token tab with Team comparison collapsed into stacked per-member card rows.
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_c53b47f3b658462fac8385368189fe3e/solution_designer_3e776bea4a5e411fa57f17f6a5acd07d/context_files/ctx_7203421f7105__image.png`
  - Shows wide Token tab with table headers and aligned rows. This informed the stable table requirement, but the latest Option B refines the column grouping.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll`
- Current Branch: `codex/token-meter-team-table-scroll`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-06-27 during original bootstrap.
- Task Branch: `codex/token-meter-team-table-scroll` created from `origin/personal`.
- Expected Base Branch (if known): `personal` / `origin/personal`
- Expected Finalization Target (if known): `personal` unless downstream/user specifies otherwise.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: This is an existing dedicated task worktree. At design-impact reset time, branch was ahead of `origin/personal` and had delivery-stage docs modifications plus new reroute/delivery artifacts. Do not discard downstream work; revise from the current implementation state.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-27 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch --show-current && git symbolic-ref refs/remotes/origin/HEAD` | Original bootstrap current repository state. | Root checkout was Git repo on `personal`, tracking `origin/personal`; unrelated untracked article files present. | No |
| 2026-06-27 | Command | `git fetch origin --prune` | Original remote refresh before task branch creation. | Fetch completed successfully. | No |
| 2026-06-27 | Command | `git worktree add -b codex/token-meter-team-table-scroll /Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll origin/personal` | Create mandatory dedicated task worktree/branch. | Worktree and branch created successfully. | No |
| 2026-06-27 | Other | User request and supplied screenshots | Understand reported UI problem and target scroll/table direction. | Narrow stacked rows were unclear; wide table was preferred. | Superseded only on column grouping, not on stable table/scroll direction. |
| 2026-06-27 | Code | `autobyteus-web/components/layout/RightSideTabs.vue` | Verify Token tab entrypoint. | Active right-side tab `usage` mounts `TokenUsageMeterPanel`. | No |
| 2026-06-27 | Code | `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Verify Token tab component boundary and delegation. | Panel delegates Team comparison to `TeamTokenUsageSummary` and stays presentation-only. | No |
| 2026-06-27 | Code | `autobyteus-web/composables/useTokenUsageWorkspaceScope.ts` | Verify data ownership. | Composable owns `teamRows`, focused member primary summary, and `teamTotalSummary`. No layout behavior here. | No |
| 2026-06-27 | Code | `autobyteus-web/components/workspace/usage/TeamTokenUsageSummary.vue` before first implementation | Inspect original narrow/wide layout. | Original component used hidden header + card/list default and wide-only table-like layout. | Already addressed by previous implementation. |
| 2026-06-27 | Code | `autobyteus-web/components/workspace/usage/TeamTokenUsageSummary.vue` current state during design-impact reset | Inspect current implementation after first implementation/API-E2E. | Current component renders semantic five-column table with `Member`, `Gross input`, `Output`, `Total tokens`, `Cost`. Last Cost cell contains total cost, status, and input/output cost split. This is now stale under Option B. | Yes: implementation must change to grouped metric columns and remove separate Cost column. |
| 2026-06-27 | Code | `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` current state | Inspect current durable component assertions. | Test asserts five headers `[Member, Gross input, Output, Total tokens, Cost]`, five cells per summary row, Cost as final cell, and absence of old card labels. | Yes: update for four logical headers, grouped token+cost cells, and absence of standalone Cost column. |
| 2026-06-27 | Code | `autobyteus-web/components/workspace/usage/tokenUsageFormatting.ts` | Verify formatter behavior for grouped cost sublines/statuses. | `formatCost(value, currency, status)` handles local/mixed statuses globally and null costs as `price missing`; `formatStatus` supplies estimated/partial/missing/local/mixed labels. | No; reuse unchanged. |
| 2026-06-27 | Type | `autobyteus-web/types/tokenUsageMeter.ts` | Verify data fields available for Option B. | `TokenUsageRunSummary` has `grossInputTokens`, `outputTokens`, `totalTokens`, `estimatedApiInputCost`, `estimatedApiOutputCost`, `estimatedApiTotalCost`, `currency`, and `apiCostStatus`. | No data/API changes needed. |
| 2026-06-27 | Artifact | `tickets/in-progress/token-meter-team-table-scroll/design-review-report.md` | Confirm original design review result. | First design passed architecture review for five-column Cost-last semantic table. | Superseded by design-impact reset. |
| 2026-06-27 | Artifact | `tickets/in-progress/token-meter-team-table-scroll/implementation-handoff.md` | Understand implemented state. | Implementation replaced old card branch with five-column table and tests. | Superseded by Option B layout semantics. |
| 2026-06-27 | Artifact | `tickets/in-progress/token-meter-team-table-scroll/code-review-report.md` | Understand review state. | Code review passed previous implementation. | New implementation after this reset must return through review. |
| 2026-06-27 | Artifact | `tickets/in-progress/token-meter-team-table-scroll/api-e2e-coverage-investigation.md` | Understand coverage basis. | Coverage investigation was for five-column Cost-last layout. | Needs re-investigation after revised implementation. |
| 2026-06-27 | Artifact | `tickets/in-progress/token-meter-team-table-scroll/api-e2e-execution-coverage-report.md` | Understand execution result. | API/E2E passed previous five-column table and real browser scroll to Cost column. | Stale for Option B; rerun against grouped contract. |
| 2026-06-27 | Artifact | `tickets/in-progress/token-meter-team-table-scroll/api-e2e-design-impact-reroute.md` | Consume design-impact reroute from API/E2E. | User selected Option B; reroute recommends requirements/design reset and maps cost fields to confirm. | Addressed in refined requirements/design. |
| 2026-06-27 | Doc Diff | `git diff -- autobyteus-web/docs/agent_execution_architecture.md autobyteus-web/docs/settings.md` | Inspect delivery-stage docs changes before reset. | Docs had been updated for the five-column Cost-last layout and are now stale for Option B. | Delivery must revise after new implementation. |
| 2026-06-27 | Command | `git status --short --branch` | Confirm current worktree state during reroute. | Branch `codex/token-meter-team-table-scroll` ahead of `origin/personal`; docs modified; reroute/delivery artifacts untracked. | Do not discard downstream changes. |
| 2026-06-27 | User Feedback | Follow-up question on refined design: user asked whether any `Estimate` wording is needed in each row because the Team header can explain that costs are estimates. | Refine compact status copy for grouped table. | Normal Team table rows should show no `Estimate` or `Complete estimate` text; the Team subtitle should explain once that costs are estimated API costs and Total cost is input cost plus output cost. | Yes: implementation/tests should remove normal estimate-status text from row cells and update subtitle copy. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: User selects the right-side `Token` tab. `RightSideTabs.vue` maps user-visible Token tab to internal tab id `usage` and mounts `TokenUsageMeterPanel.vue`.
- Current execution flow:
  1. `RightSideTabs.vue` mounts `TokenUsageMeterPanel.vue` in the right-side content shell.
  2. `TokenUsageMeterPanel.vue` calls `useTokenUsageWorkspaceScope()`.
  3. `useTokenUsageWorkspaceScope.ts` resolves current context, focused leaf team member, per-member rows, loading/error state, and team total summary from stores/GraphQL hydration.
  4. `TokenUsageMeterPanel.vue` renders primary focused-run usage sections and passes team rows/total props to `TeamTokenUsageSummary.vue` for team workspaces.
  5. `TeamTokenUsageSummary.vue` renders the Team comparison and formats each cell via `tokenUsageFormatting`.
- Current implementation state before reset:
  - Old stacked/card narrow branch is already gone.
  - Component now has a semantic table and scoped scroll wrapper.
  - The table still uses the now-stale five-column contract: `Member`, `Gross input`, `Output`, `Total tokens`, `Cost`.
  - The last Cost cell contains total cost/status and `In … · Out …` cost split.
- Target behavior after reset:
  - Keep semantic table and scoped scroll wrapper.
  - Change to four logical columns: `Member`, `Gross Input`, `Output`, `Total`.
  - Each metric cell pairs token count with the matching cost subline.
  - Remove separate standalone `Cost` header/cell.
  - In normal rows, do not show `Estimate` or `Complete estimate`; preserve specific exceptional labels only when needed for partial, missing, local/no-bill, or mixed price states.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found
- Refactor posture evidence summary: Existing ownership boundaries remain appropriate. The design-impact reset changes presentation grouping inside `TeamTokenUsageSummary.vue` and its tests only.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User Option B direction | User explicitly prefers token amount and cost together as the most natural reading flow. | Approved UX contract changed; requirements/design must reset. | Yes: revise implementation/tests/coverage/docs. |
| Current `TeamTokenUsageSummary.vue` | All needed values are already in each row summary, but current table has a standalone Cost column. | Local presentation change; no data-boundary issue. | Yes: remove Cost column and group values. |
| `TokenUsageRunSummary` type | Contains token and matching cost fields for input, output, total. | No backend/API/store changes needed. | No |
| `tokenUsageFormatting.ts` | Existing formatter handles cost nulls/statuses. | Reuse avoids duplicate status formatting. | No |
| Current docs diff | Docs were already synced to previous five-column behavior. | Docs now stale under Option B. | Delivery docs sync after implementation. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/layout/RightSideTabs.vue` | Right-side tab shell and Token tab mount. | Mounts `TokenUsageMeterPanel` under active tab `usage`. | Do not change for this reset. |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Token Meter hierarchy and team summary delegation. | Presentation-only; passes data props to `TeamTokenUsageSummary`. | Do not expand responsibilities. |
| `autobyteus-web/components/workspace/usage/TeamTokenUsageSummary.vue` | Team comparison presentation. | Current semantic table is correct structurally but wrong semantically: five columns with standalone Cost. | Primary implementation owner for grouped metric cells. |
| `autobyteus-web/composables/useTokenUsageWorkspaceScope.ts` | Token tab data boundary for selected run/team. | Computes `teamRows` and `teamTotalSummary`. | No changes expected. |
| `autobyteus-web/components/workspace/usage/tokenUsageFormatting.ts` | Formatting helpers for token/cost/status display. | Supports grouped sublines/statuses. | Reuse unchanged. |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | Component coverage for Token Meter. | Current assertions encode stale five-column contract. | Update after implementation. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Durable docs for Token Usage Meter architecture/behavior. | Delivery-stage diff mentions five columns and Cost last. | Delivery revise after new implementation. |
| `autobyteus-web/docs/settings.md` | Duplicated durable docs/settings narrative. | Same stale five-column wording. | Delivery revise after new implementation. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-27 | Probe | Visual inspection of original supplied screenshots via `view_image` during first design | Narrow card layout was unclear; wide table was clearer. | Stable table and scoped horizontal scroll remain valid. |
| 2026-06-27 | API/E2E Artifact | `api-e2e-execution-coverage-report.md` | Previous API/E2E passed five-column Cost-last layout, including browser scroll to Cost column. | Evidence is stale for Option B; new validation needed after revised implementation. |
| 2026-06-27 | Design-impact Artifact | `api-e2e-design-impact-reroute.md` | User selected Option B after API/E2E and delivery handoff. | Reset requirements/design before delivery continues. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: This is an internal frontend presentation change; no external reference needed.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: For component tests, existing Vitest/Nuxt frontend test environment. For visual confirmation, a running web/electron app or temporary browser probe with representative `TeamTokenUsageSummary` rows.
- Required config, feature flags, env vars, or accounts: None identified for component-level change.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation described above.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- `TeamTokenUsageSummary.vue` remains the right owner. It should keep the semantic table and scroll wrapper from the first implementation but revise the column model.
- The target grouped layout can be implemented without changing props or stores:
  - Gross Input cell: `formatCompactInteger(summary.grossInputTokens)` + `formatCost(summary.estimatedApiInputCost, summary.currency, summary.apiCostStatus)`.
  - Output cell: `formatCompactInteger(summary.outputTokens)` + `formatCost(summary.estimatedApiOutputCost, summary.currency, summary.apiCostStatus)`.
  - Total cell: `formatCompactInteger(summary.totalTokens)` + `formatCost(summary.estimatedApiTotalCost, summary.currency, summary.apiCostStatus)` with no normal estimate-status text; show exceptional status text only when needed to avoid misleading users.
- The separate Cost column and input/output split are now the stale path to remove.
- Existing current docs updates are stale and should be refreshed downstream once implementation and validation settle.

## Constraints / Dependencies / Compatibility Facts

- Preserve existing token usage data, cost estimation semantics, status labels, and formatting helpers.
- Do not introduce provider pricing metadata or recalculation into frontend presentation components.
- Do not change team member identity/focus resolution.
- Replace the stale Cost-last table contract cleanly; do not keep a dual five-column/four-column compatibility mode.
- API/E2E must re-investigate coverage after revised implementation because previous passing evidence targeted the old contract.

## Open Unknowns / Risks

- Exact minimum table width and grouped metric subline spacing may need visual tuning during implementation.
- Component tests cannot measure real CSS overflow/scrollbars. Downstream visual/API-E2E investigation should validate constrained-width grouped table behavior.
- Delivery-stage docs changes currently in the worktree mention the stale Cost-last layout and must be updated later.

## Notes For Architect Reviewer

- This is a `Design Impact` reset triggered by explicit user preference, not an implementation bug or data-boundary issue.
- The new target is still presentation-only and local to `TeamTokenUsageSummary.vue` plus colocated tests.
- Key design decision to review: use four logical columns (`Member`, `Gross Input`, `Output`, `Total`) with token+cost grouped in each metric cell; remove the separate standalone Cost column.
- The previous design review, implementation handoff, code review, and API/E2E reports are still useful history but are stale for the UX contract. Downstream work should resume from the updated requirements/design.
