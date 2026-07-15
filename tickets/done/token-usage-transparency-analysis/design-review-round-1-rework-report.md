# Design Review Round 1 Rework Report

## Context

Architecture review round 1 failed with `Design Impact` findings AR-001 through AR-004. This rework updates the authoritative requirements, investigation notes, design spec, and analysis report in the ticket worktree.

## Updated Artifacts

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/design-spec.md`
- Analysis report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/analysis-report.md`
- Round 1 review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/done/token-usage-transparency-analysis/design-review-report.md`

## AR-001 Resolution: Native Raw Usage Preservation

Revised design now requires a native `LlmTokenUsageObservation` shape in `autobyteus-ts` before lossy response normalization. Provider adapters own mapping raw OpenAI-compatible/Anthropic/etc usage into normalized counts plus `raw_usage_json`, cache buckets, reasoning detail buckets, usage scope, and quality flags.

Concrete file responsibilities were added for:

- `autobyteus-ts/src/llm/utils/llm-token-usage-observation.ts`
- `autobyteus-ts/src/llm/api/openai-compatible-token-usage-normalizer.ts`
- `autobyteus-ts/src/llm/api/anthropic-token-usage-normalizer.ts`
- `autobyteus-ts/src/llm/utils/response-types.ts`
- assistant stream payload parsing and `LlmPhase` emission.

The old prompt/completion/cost-only `TokenUsage` shape is explicitly not authoritative accounting input.

## AR-002 Resolution: Trusted Pricing Contract

Revised design requires shared model pricing lookup to return:

- `pricing_status = trusted | missing | placeholder`,
- nullable price dimensions,
- trusted dimension flags,
- source/version/price config identity,
- missing reason.

Server cost calculation can set `api_cost_status = estimated` only when pricing is trusted for the needed dimensions. Constructor/default zero, local runtime zero, placeholder, missing, or unaudited prices produce null cost with `price_missing`/`partial_price_missing`, never `$0 estimated`.

## AR-003 Resolution: Canonical Context Identity Enrichment

Revised design adds a `TokenUsageContextEnricher` in the server event pipeline. Canonical sources are now specified:

- `AgentRunContext.runId` for `run_id`,
- `AgentRunConfig.agentDefinitionId`, `workspaceId`, and `runtimeKind`,
- `AgentRunConfig.memberTeamContext` for root team/member identity,
- `TeamRunEvent`/team runtime context as confirmation for team envelope/source path,
- websocket aliases are display-only and not ledger authority.

Event, ledger, and summary shapes now include root team run id, team path, member agent run id, member path/route key, agent definition id, workspace id, and nullable task-agent identity fields.

## AR-004 Resolution: Mixed Usage-Scope Aggregation

Revised design defines one server-owned rule:

- ledger stores `reported_*_tokens` and `accounting_*_tokens`,
- summaries/cost/frontend totals sum only `accounting_*`,
- `per_call` and `per_turn` use reported counts as the accounting delta,
- `cumulative_snapshot` is diffed against the previous snapshot for the same `snapshot_series_key`,
- Codex `last` is `per_turn`,
- Codex `total` fallback is `cumulative_snapshot` and cannot be summed directly.

A concrete Codex example documents totals `1000 -> 1400` producing accounting deltas `1000 -> 400`, not `2400`.

## No-Legacy Direction Preserved

The rework keeps the user-approved no-legacy policy:

- old `token_usage_records` is not a live compatibility source,
- old `TokenUsagePersistenceProcessor` is not the authoritative writer,
- local token estimation/tracking is removed/demoted from persisted accounting,
- frontend does not calculate prices.
