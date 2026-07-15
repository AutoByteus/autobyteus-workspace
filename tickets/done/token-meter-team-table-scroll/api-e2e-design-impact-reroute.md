# API/E2E Design Impact Reroute

## Reroute Meta

- Source role: `api_e2e_engineer`
- Date: 2026-06-27
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll`
- Branch: `codex/token-meter-team-table-scroll`
- Classification: `Design Impact`
- Recommended recipient: `solution_designer`

## Trigger

After API/E2E passed and the package was handed to delivery, the user reconsidered the Team usage table column semantics. The user agreed that Option B is the best layout: put token amount and corresponding cost together in the same column, rather than keeping all cost details in a separate final Cost column.

Relevant user direction:

> “Yeah, I think option B is the best. It's pretty simple, right? Because you put the token and the cost together. And yeah, it's very natural. When people read it, it's the most natural way, I would say.”

## Why This Is A Design Impact

The approved requirements and reviewed design currently require this column order:

1. Member
2. Gross Input
3. Output
4. Total Tokens
5. Cost

That design makes the last column a combined cost summary containing total estimated cost plus input/output cost split. The new user-preferred layout changes the semantic grouping to pair each token count with its corresponding cost. A likely target table shape is:

| Member | Gross Input | Output | Total |
| --- | ---: | ---: | ---: |
| Lead | input tokens + input cost | output tokens + output cost | total tokens + total estimated cost |

This is not a minor API/E2E tuning issue because it changes the accepted UX contract, column naming, acceptance criteria, component assertions, browser validation expectations, and documentation wording.

## Impacted Current Artifacts / Assumptions

- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/requirements.md`
  - REQ-001/REQ-002/AC-001/AC-002/AC-004 currently name Cost as the last column.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/design-spec.md`
  - Intended Change and design examples currently define five columns with Cost last.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/autobyteus-web/components/workspace/usage/TeamTokenUsageSummary.vue`
  - Current implementation renders five columns and a last Cost cell with total cost plus input/output split.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts`
  - Current durable test asserts headers `[Member, Gross input, Output, Total tokens, Cost]` and Cost as final data cell.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/api-e2e-coverage-investigation.md`
  - Coverage decisions and temporary browser plan are based on the previous five-column Cost-last contract.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/api-e2e-execution-coverage-report.md`
  - Passing browser evidence is valid for the previous approved design, not for the newly preferred token+cost grouped layout.

## Recommended Design Reset Questions

1. Should the target table become four logical columns: `Member`, `Gross Input`, `Output`, `Total`, where each metric column shows token count and cost subline?
2. Should `Gross Input` use `estimatedApiInputCost`, `Output` use `estimatedApiOutputCost`, and `Total` use `estimatedApiTotalCost`?
3. How should statuses such as `partial_price_missing`, `price_missing`, `local_no_api_bill`, and `mixed` appear when costs are colocated under token columns?
4. Should the table still use horizontal scrolling at narrow widths? Likely yes, but the minimum width/column widths should be recalibrated for the new four-column layout.
5. Should the Team total row follow the same token+cost per column pattern? Likely yes.

## API/E2E Recommendation

Pause delivery for this branch and return to `solution_designer` for a requirements/design update. After implementation and code review for the revised layout, API/E2E should re-investigate coverage and rerun browser validation against the new grouped token+cost contract.
