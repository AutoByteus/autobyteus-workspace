# Latest `origin/personal` Refresh Report — Token Usage

Refreshed/revalidated worktree against latest `origin/personal` on 2026-06-24.

- `origin/personal`: `5bd521ba83e4a2df852be5e8914915959149137d`
- `HEAD`: `5bd521ba83e4a2df852be5e8914915959149137d`
- branch/worktree: `codex/token-usage-transparency-analysis` at `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis`

## What changed versus the earlier analysis?

The latest branch still has the same core token-accounting gap, but the business framing is now clearer:

- Tokens should be treated as the platform meter, like water/electricity.
- API models use token-metered cost.
- Codex/Claude runtimes should use the same estimated API-price cost metric when their model exists in the shared catalog; otherwise store token-only usage.
- The storage model must distinguish token usage from cost interpretation.

## Current answer

- Normal AutoByteus LLM responses can carry token usage.
- Existing server storage exists but is optional and lossy.
- Codex token usage is parsed into in-memory thread state but not persisted.
- Claude currently contributes compaction `pre_tokens`, not complete usage accounting.
- Frontend still does not use live `ASSISTANT_COMPLETE.usage`.
- Run history/memory still does not preserve token usage as a business ledger.
- Price config exists for many API models, but current persistence does not store pricing basis or reliable cost status.

## Correct first feature

Build a server-side durable token usage ledger.

The ledger should be the business source of truth. Dashboards, run summaries, cost transparency, forecasts, context pressure views, token budgets, and quota enforcement should all be later projections.

## Most important semantic point

Provider `usage` is normally per API call, not cumulative conversation usage.

But `prompt_tokens` means the full prompt/context sent in that call. If history is resent, those history tokens are billed again and should be counted again for cost accounting.

Codex needs special handling because current code reads `tokenUsage.last` then falls back to `tokenUsage.total`. Store raw payload and explicit usage scope so future aggregation does not accidentally sum cumulative snapshots as deltas.


## 2026-06-24 later refresh

After the draft design work started, `origin/personal` advanced to `46acf801847780d936796f3adf493e5ac2378700` (`chore: archive self-evolution ticket`). The worktree was reset to that commit and a quick token-path scan found no change to the token accounting conclusions: old optional `TokenUsagePersistenceProcessor`, Codex `thread/tokenUsage/updated` parsing without persistence, frontend `usage` ignored, and no `TOKEN_USAGE_UPDATED` event yet.

## 2026-06-24 final refresh before frontend-placement design update

`origin/personal` advanced again to `5bd521ba83e4a2df852be5e8914915959149137d` (`chore(release): bump workspace release version to 1.3.75`). The ticket branch was fast-forwarded with `git merge --ff-only origin/personal`. The untracked token-usage design artifacts were preserved. The additional upstream commits are release/ticket-finalization and self-evolution/message-noise changes; they do not alter the token usage storage/UI conclusions found in this artifact set.
