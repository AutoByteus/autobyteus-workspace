# Solution Design Impact Rework

## Meta

- Source role: `solution_designer`
- Date: 2026-06-27
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll`
- Branch: `codex/token-meter-team-table-scroll`
- Trigger artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/api-e2e-design-impact-reroute.md`
- Classification addressed: `Design Impact`

## User Direction Resolved

The user selected Option B: group each token amount with its corresponding cost because it reads more naturally.

This supersedes the earlier five-column contract `[Member, Gross Input, Output, Total Tokens, Cost]`.

## Updated Target UX Contract

The Team token usage table now has four logical columns:

1. `Member`
2. `Gross Input`
3. `Output`
4. `Total`

Each metric cell groups token count and matching cost:

| Column | Token value | Cost value |
| --- | --- | --- |
| `Gross Input` | `grossInputTokens` | `estimatedApiInputCost` |
| `Output` | `outputTokens` | `estimatedApiOutputCost` |
| `Total` | `totalTokens` | `estimatedApiTotalCost` plus compact `apiCostStatus` |

The design explicitly removes the standalone final `Cost` column and the prior `In … · Out …` split in that standalone cost cell.

## Artifacts Updated

- Requirements doc updated to `Refined`: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/requirements.md`
- Investigation notes updated with current implementation state, reroute evidence, and Option B field mapping: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/investigation-notes.md`
- Design spec rewritten for grouped token+cost metric columns: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/design-spec.md`

## Downstream Impact

Implementation must revise the current five-column semantic table in:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/autobyteus-web/components/workspace/usage/TeamTokenUsageSummary.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts`

Likely additional implementation files if a precise `Total` header key is added:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/autobyteus-web/localization/messages/en/shell.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/autobyteus-web/localization/messages/zh-CN/shell.ts`
- generated localization artifacts, if required by the repo workflow

API/E2E must re-investigate and re-run browser validation because previous passing evidence validated the stale Cost-last layout.

Delivery docs sync must update the currently modified docs from five-column wording to grouped metric wording:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/autobyteus-web/docs/agent_execution_architecture.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/autobyteus-web/docs/settings.md`

## Open Risks

- Grouped metric cell spacing and table minimum width need visual tuning.
- If a new `Total` localization key is added, localization/generated catalog consistency must be preserved.
- Existing docs changes in the worktree are stale until delivery updates them after revised implementation/testing.

## Compact status copy refinement

After reviewing the Option B table mockup, the user challenged whether any normal estimate wording is needed in each row. The refined design now removes visible `Estimate` / `Complete estimate` copy from normal Team table rows. The Team subtitle should explain once that displayed costs are estimated API costs and that Total cost is input cost plus output cost. More specific exceptional statuses such as partial, missing price, local/no-bill, and mixed price data may still appear when needed to avoid misleading users. This is a presentation-copy refinement only; data and price status semantics do not change.
