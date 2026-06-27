# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/design-review-report.md`
- API/E2E Design Impact reroute: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/api-e2e-design-impact-reroute.md`
- Solution design-impact rework / latest copy refinement: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/solution-design-impact-rework.md`

## What Changed

- Revised the Team usage table to the refined four-logical-column Option B contract while preserving the semantic table and scoped horizontal-scroll wrapper.
- Kept stable hooks:
  - `data-test="team-token-table-scroll"`
  - `data-test="team-token-table"`
  - `data-test="team-token-row"`
  - `data-focused`
  - `data-member-route-key`
  - `data-test="team-token-total-row"`
- Kept the table headers as `Member`, `Gross input`, `Output`, and `Total`.
- Kept the standalone `Cost` column/cell and old final-cell `In … · Out …` split removed.
- Grouped each token value with the matching cost in the same metric cell:
  - Gross Input: `grossInputTokens` + `estimatedApiInputCost`
  - Output: `outputTokens` + `estimatedApiOutputCost`
  - Total: `totalTokens` + `estimatedApiTotalCost`
- Implemented the latest copy refinement:
  - Normal `estimated` rows no longer show visible `Estimate` / `Complete estimate` / `Estimated` status copy in the Team table metric cells.
  - Normal estimated Total cost titles now contain only the formatted cost, not status text.
  - Exceptional statuses still render when status is not `estimated` (for example partial, missing price, local/no-bill, mixed) to avoid misleading users.
  - Team subtitle now explains once that the table shows estimated API costs and that Total cost is input cost plus output cost.
- Kept empty/no-summary rows spanning the three metric columns after `Member`.
- Kept localized `shell.tokenUsage.totalMetric` in English and zh-CN for the `Total` header.
- Updated English and zh-CN `shell.tokenUsage.teamSubtitle` copy.
- Updated colocated component coverage for grouped headers, absence of standalone Cost header, four cells per row, focused row attributes, grouped token+cost contents, clean normal estimated rows, exceptional status rendering, Team total final row, and scroll wrapper.

## Key Files Or Areas

- Modified: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/autobyteus-web/components/workspace/usage/TeamTokenUsageSummary.vue`
- Modified: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts`
- Modified: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/autobyteus-web/localization/messages/en/shell.ts`
- Modified: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/autobyteus-web/localization/messages/zh-CN/shell.ts`
- Updated artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/implementation-handoff.md`

Existing worktree docs changes from the prior delivery pass remain present and stale for Option B; implementation did not revise docs because delivery owns durable docs sync after updated code review/API-E2E.

## Important Assumptions

- `Gross Input` cost maps to `estimatedApiInputCost`, `Output` cost maps to `estimatedApiOutputCost`, and `Total` cost maps to `estimatedApiTotalCost`.
- Normal `apiCostStatus === 'estimated'` rows should stay visually clean and not show per-row estimate status text.
- Non-`estimated` statuses should remain visible in the Total metric cell so partial/missing/local/mixed states are not hidden.
- Existing source localization catalogs are runtime-merged after generated shell catalogs; updating manual `shell.ts`/`zh-CN/shell.ts` keys is sufficient for this workflow.
- A `42rem` minimum table width remains the implementation starting point for the four-column grouped table; browser validation may tune it.

## Known Risks

- JSDOM coverage verifies structure and hooks but cannot prove real rendered horizontal overflow behavior.
- Grouped metric subline spacing and the `42rem` table minimum width may need browser visual tuning.
- If cost status is `mixed` or `local_no_api_bill`, existing `formatCost` can produce longer text in multiple metric cells; downstream browser validation should check readability.
- Existing docs modifications in the worktree still describe the superseded five-column Cost-last behavior and must be revised by delivery after revised validation.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change
- Reviewed root-cause classification: No Design Issue Found
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): No architecture refactor needed; local presentation/test/localization revision only.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A
- Evidence / notes: The implementation stayed inside `TeamTokenUsageSummary.vue`, the existing colocated Token Meter component spec, and source localization catalogs. No `useTokenUsageWorkspaceScope.ts`, stores, GraphQL/backend types, token accounting, or price calculations were changed.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: `TeamTokenUsageSummary.vue` is 366 total lines / 328 non-empty lines after this refinement. Diff since the previous committed implementation is 74 insertions / 65 deletions for the component. No split/refactor or design reroute was needed.

## Environment Or Dependency Notes

- Dependencies and `.nuxt` artifacts were already available in this worktree from the earlier implementation pass.
- Generated/ignored local artifacts (`node_modules/`, `.nuxt/`, etc.) are not part of this handoff.
- The branch/worktree currently includes pre-existing design-impact/delivery artifact and docs changes from upstream/downstream stages. This pass only intentionally changed the component, component spec, localization catalogs, and this handoff artifact.

## Local Implementation Checks Run

Record only implementation-scoped checks here. No API/E2E sign-off is claimed.

- `pnpm test:nuxt --run components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts localization/messages/__tests__/shellCatalog.spec.ts` from `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/autobyteus-web` — passed; 2 files / 5 tests.
- `pnpm guard:localization-boundary` from `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/autobyteus-web` — passed.
- `git diff --check` from `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll` — passed.
- Source line-count guard via `python3` — passed; changed source implementation file remains under 500 non-empty lines.

Prior known attempted check from the previous Option B handoff remains relevant context:

- `pnpm test:nuxt --run components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts localization/messages/__tests__/shellCatalog.spec.ts localization/messages/__tests__/zhCnGlossaryConsistency.spec.ts` — component and shell catalog tests passed, but `zhCnGlossaryConsistency.spec.ts` failed on a pre-existing unrelated settings catalog value containing deprecated term `代理`: `settings.components.settings.CompactionConfigCard.description`. This failure is not introduced by the Team table changes.

## Downstream Coverage Hints / Suggested Scenarios

- API/E2E must re-investigate coverage because prior browser evidence validated the stale Cost-last contract.
- In a constrained-width Token tab, confirm the Team table region scrolls horizontally and all grouped metric columns remain reachable/readable.
- Confirm the Team table headers are `Member`, `Gross input`, `Output`, `Total` and there is no standalone `Cost` header or fifth Cost cell.
- Confirm the Team subtitle explains that costs are estimated API costs and Total cost is input cost plus output cost.
- Confirm normal estimated rows have four cells (`th + 3 td`) with grouped values and no visible `Estimate` / `Complete estimate` / `Estimated` text in metric cells.
- Confirm exceptional status rows still surface status text such as partial estimate / missing price / local / mixed where applicable.
- Confirm grouped values are paired correctly:
  - Gross Input cell: input token count + input cost.
  - Output cell: output token count + output cost.
  - Total cell: total token count + total estimated cost.
- Confirm missing summary states (`loading`, `unavailable`, `no usage`) span the three metric columns without breaking row identity.
- Confirm focused row highlighting and `data-focused` / `data-member-route-key` remain intact.
- Confirm Team total remains the final row and uses the same grouped metric pattern.
- Delivery docs sync should revise the existing stale docs changes in:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/autobyteus-web/docs/agent_execution_architecture.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/autobyteus-web/docs/settings.md`

## API / E2E / Executable Coverage Investigation And Execution Still Required

API/E2E/browser coverage investigation and execution are still required downstream. Prior API/E2E/browser results targeted the superseded Cost-last layout and should be treated as history only, not validation for this grouped metric implementation and latest copy refinement.
