# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/code-review-report.md`
- Current Investigation Round: 2
- Trigger: Code-review Round 2 pass handoff for the grouped metric + clean normal-status Team usage table implementation.
- Prior Investigation Reviewed: Round 1 in this same canonical file was reviewed as stale historical evidence for the superseded five-column Cost-last contract.
- Latest Authoritative Investigation: Round 2

## Current Requirement And Design Basis

The latest approved behavior supersedes the earlier five-column Cost-last table. The Team section must now render one semantic table with four logical columns: `Member`, `Gross Input`, `Output`, and `Total`. The three metric columns must pair a token count with the corresponding cost in the same cell:

- `Gross Input`: `grossInputTokens` + `estimatedApiInputCost`.
- `Output`: `outputTokens` + `estimatedApiOutputCost`.
- `Total`: `totalTokens` + `estimatedApiTotalCost`.

The table must not render a standalone `Cost` header, fifth Cost cell, or old `In … · Out …` split in a final cost-only cell. Normal `estimated` rows should not show visible `Estimate`, `Estimated`, or `Complete estimate` copy inside Team metric cells; the Team subtitle explains once that costs are estimated API costs and that Total cost is input cost plus output cost. Exceptional statuses such as partial estimate, price missing, local/no-bill, and mixed must remain visible where needed to avoid misleading users. At narrow widths, the old stacked/card branch must stay removed and horizontal scrolling must stay scoped to the Team table wrapper. Focused row styling, member row identity hooks, missing/loading/unavailable/no-usage rows, and Team total final-row placement must be preserved. Store, composable, backend/API, GraphQL, token accounting, and price calculation boundaries remain out of scope and unchanged.

The implementation handoff's `Legacy / Compatibility Removal Check` was reviewed for Round 2. It reports no backward-compatibility mechanism, no retained old behavior, and removal of stale five-column Cost-last source/test paths. Source inspection matches this: `TeamTokenUsageSummary.vue` renders four `<col>` entries, headers `Member`, `Gross input`, `Output`, `Total`, three metric `<td>` cells per summary row, missing-summary cells with `colspan="3"`, and no `team-token-cost-cell` / `team-token-column-cost` selectors.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Team table semantic contract | Changed | Refined requirements REQ-001 through REQ-005; solution-design-impact rework; code review Round 2 | Validate four headers and four row cells; prior five-column assertions are obsolete. |
| Standalone final `Cost` column and `In … · Out …` split | Removed | REQ-011/AC-007; design legacy-removal plan; code review Round 2 | Verify no `Cost` header/fifth cell and no stale cost-cell source path in current component/browser output. |
| Grouped metric token+cost cells | Added/Changed | REQ-002 through REQ-005; implementation handoff | Validate Gross Input, Output, and Total cells each contain the correct token count and matching cost. |
| Clean normal estimated-row copy | Changed | REQ-005/REQ-013 and AC-006/AC-013; solution rework compact status copy refinement | Validate normal `estimated` Team metric cells and normal Total cost title do not contain `Estimated`, `Estimate`, or `Complete estimate`. |
| Exceptional status visibility | Preserved/Changed | REQ-010/AC-009; implementation handoff | Validate partial/missing/local/mixed statuses remain visible/readable in grouped table cells. |
| Scoped horizontal overflow | Preserved | REQ-006/AC-003 | Browser probe must show horizontal overflow is on the Team table wrapper, not the whole page/mock Token tab shell. |
| Focused row affordance and identity hooks | Preserved | REQ-007/AC-008; DS-002 | Existing durable coverage and browser probe must confirm `data-focused`, row route key, badge/highlight. |
| Team total final row | Preserved/Changed cell shape | REQ-008; AC-010/AC-011 | Validate final row follows the same grouped metric pattern and remains final. |
| Missing/loading/unavailable/no-usage rows | Preserved/Changed colspan | REQ-009/AC-009 | Validate rows remain table rows and status cell spans three metric columns. |
| Token/cost source data and backend/API/accounting boundaries | Preserved | REQ-010/AC-014; code review Round 2 | No API/backend E2E needed; run focused component/localization coverage and browser probe for presentation. |
| Localization subtitle/header copy | Changed | REQ-012/AC-012; implementation handoff | Validate shell catalog coverage and localization boundary guard. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | Mounts Token Usage Meter in team context and asserts grouped headers, absence of standalone Cost header, scroll/table hooks, subtitle copy, four cells per row, focused row attributes, grouped token+cost values, clean normal estimated rows, exceptional partial/missing rendering, and Team total final row. | AC-001 through AC-014, especially AC-003/AC-004/AC-005/AC-006/AC-007/AC-008/AC-011/AC-012/AC-013 | Still Valid | Source inspection shows assertions match current reviewed Round 2 behavior. Code review already passed this updated durable coverage. | Run as final focused durable component coverage. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/autobyteus-web/localization/messages/__tests__/shellCatalog.spec.ts` | Verifies shell localization catalog consistency including new/updated token usage shell labels. | REQ-012/AC-012 and localization source changes | Still Valid | Code review Round 2 ran this with the component spec and it passed. | Run as final focused durable localization coverage. |
| `pnpm guard:localization-boundary` | Guards localization usage/source boundary. | Localization changes for subtitle/header key | Still Valid | Code review Round 2 passed the guard; changed files include source localization catalogs. | Run final guard. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/autobyteus-web/localization/messages/__tests__/zhCnGlossaryConsistency.spec.ts` | Broad zh-CN glossary consistency. | Not specific to Team table; implementation handoff notes a pre-existing unrelated failure in settings compaction description. | Out Of Scope | Prior attempted check failed on unrelated settings key `settings.components.settings.CompactionConfigCard.description`, not introduced by Team table changes. Code review intentionally used focused shell catalog coverage and localization guard. | Do not run as final blocker for this task; record as unrelated if encountered. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` | Store token usage summaries and accounting state behavior. | AC-010/AC-014 only indirectly; implementation must not alter store/API accounting. | Out Of Scope | No store source changed; refined design forbids data/accounting changes. | Do not run for layout-specific API/E2E unless a data-flow issue is discovered. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/autobyteus-web/components/layout/__tests__/RightSideTabs.spec.ts` | Right-side tab mounting/navigation shell behavior. | DS-001 entry mount only. | Out Of Scope | `RightSideTabs.vue` unchanged; scoped overflow is local to `TeamTokenUsageSummary.vue`. | No action. |
| Workspace/team/agent token header chip tests | Token usage chip/header visibility in workspace views. | Not part of Team table grouped layout. | Out Of Scope | Search found no grouped Team table assertions and no changed source in those views. | No action. |
| Browser/E2E suite under `autobyteus-web/e2e` or app Playwright config | Would provide durable browser layout coverage if present. | AC-003 real scroll/readability residual risk. | Out Of Scope / Not Present | Repository search found no `autobyteus-web/e2e` directory or app Playwright layout suite in this scope. | Use a temporary executable browser probe only. |
| Prior `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/api-e2e-execution-coverage-report.md` Round 1 scenarios | Validated old five-column Cost-last table and scroll-to-Cost behavior. | Superseded by Option B. | Stale / Replace | Code review Round 2 and refined requirements explicitly state prior API/E2E evidence is historical only. | Replace with Round 2 execution in the same canonical report; do not use Round 1 as current pass evidence. |

## Stale Or Obsolete Coverage Decisions

Use this section before deleting or disabling existing durable coverage.

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Prior Round 1 API/E2E browser scenario in this canonical investigation/report | Scroll to standalone Cost column; headers `Member`, `Gross input`, `Output`, `Total tokens`, `Cost`; Cost as fifth cell. | User selected Option B and refined requirements now require grouped token+cost cells and no standalone Cost column. | `api-e2e-design-impact-reroute.md`, `solution-design-impact-rework.md`, refined `requirements.md`, code review Round 2. | New Round 2 browser probe will validate grouped columns and scroll/readability across the grouped table. | N/A |
| Pre-Round-2 component expectations for Cost-last layout | Cost-last header/cell assertions. | Current durable component spec was already updated before Round 2 code review. | Code review Round 2 reports stale Cost-last assertions removed. | Current `TokenUsageMeterPanel.spec.ts` grouped assertions. | N/A |

No repository-resident durable coverage deletion is needed during API/E2E; stale Cost-last durable assertions were already changed by implementation and reviewed by code review Round 2.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None. | N/A | Existing updated component/localization coverage is adequate for durable repository-resident coverage. | N/A | Adding new app/browser E2E infrastructure would be disproportionate for a leaf presentation change where no existing app browser layout suite exists. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None during API/E2E. | N/A | N/A | N/A | Required durable coverage updates were already performed by implementation before code review Round 2 and passed review. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None during API/E2E. | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEST-001 | `pnpm test:nuxt --run components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts localization/messages/__tests__/shellCatalog.spec.ts` from `autobyteus-web`. | Current durable component and shell catalog coverage pass against the grouped metric contract. | Existing durable coverage execution; no new durable code. |
| TEST-002 | `pnpm guard:localization-boundary` from `autobyteus-web`. | Localization boundary remains valid for the updated subtitle/header keys. | Existing guard execution; no new durable code. |
| STATIC-001 | `git diff --check` from repository worktree root. | No whitespace errors in source/artifacts. | Standard executable hygiene check. |
| BROW-001 | Temporary Vite + Playwright Chromium probe importing the actual `TeamTokenUsageSummary.vue`, mounting representative rows in a constrained mock Token tab shell. | Wrapper has horizontal overflow at constrained width, table remains wider than wrapper, and document/mock Token tab shell do not become horizontal scrollers. | One-off browser/CSS measurement; current durable component tests already guard structure. |
| BROW-002 | Same browser probe, scroll the Team table wrapper to the right edge and inspect rendered cells. | Headers are `Member`, `Gross input`, `Output`, `Total`; no standalone `Cost`; all grouped metric columns remain reachable/readable after scroll. | Browser layout evidence for this delivery, not durable test infrastructure. |
| BROW-003 | Same probe with normal estimated, partial/missing, local/no-bill, mixed, zero usage, loading, unavailable, no-usage, focused row, and Team total rows. | Normal rows omit visible estimate status in metric cells; exceptional statuses remain visible; missing rows span three metric columns; focused row and Team total final row persist. | Same as above. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full live application Token tab with real backend/team run hydration | Approved change is presentation-only; no backend/API/data-flow source changed; no existing browser E2E app harness/login/seed flow was found. | Low for this task because the actual component is mounted with representative rows and current component tests cover data-flow integration at the component/store boundary. | None for API/E2E unless browser probe exposes a component defect. |
| Native Electron packaged rendering | No Electron shell/package/lifecycle code changed; relevant rendering engine behavior is covered by Chromium probe. | Low. | None. |
| OS-specific visible scrollbar chrome | Scrollbar paint varies by platform/user settings. | Low-medium discoverability risk. | Validate scrollability/reachability by measurement rather than visible scrollbar paint. |
| Broad zh-CN glossary suite | Known unrelated pre-existing failure in settings glossary noted by implementation handoff. | Low for this task; targeted shell catalog and localization boundary guard cover changed localization scope. | Not a blocker for this API/E2E pass; route only if changed token usage keys cause a failure. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None identified before Round 2 execution. | N/A | Refined requirements/design explicitly define grouped columns, normal status-copy behavior, exceptional status visibility, and no data-boundary changes. Code review Round 2 found no findings. | N/A |

## Execution Plan

1. Run final focused durable checks:
   - `pnpm test:nuxt --run components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts localization/messages/__tests__/shellCatalog.spec.ts`
   - `pnpm guard:localization-boundary`
   - `git diff --check`
2. Attempt the in-app Browser connection according to the browser skill. If unavailable, record that and use standalone Playwright Chromium as the practical browser validation surface.
3. Run a temporary Vite + Playwright browser probe outside repository-resident source changes. The probe will import the actual `TeamTokenUsageSummary.vue`, mount representative grouped rows at constrained width, measure wrapper/table/document scroll geometry, scroll the wrapper to the right edge, verify grouped cell content/status behavior/focus/state rows/team total, capture screenshots to the ticket artifact folder, and remove temporary scaffolding afterward.
4. Update `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/api-e2e-execution-coverage-report.md` with Round 2 history, stale Round 1 resolution, command outcomes, and browser evidence.
5. If execution passes and API/E2E does not add/update/remove repository-resident durable coverage, hand off the cumulative package to `delivery_engineer`. If API/E2E changes durable coverage, route back to `code_reviewer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Round 1 evidence is stale for the current contract. Round 2 will replace it with focused durable checks plus fresh browser validation of grouped metric cells and clean normal-status behavior.
