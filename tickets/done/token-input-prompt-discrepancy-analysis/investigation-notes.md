# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete.
- Current Status: Analysis complete; live two-round provider/runtime probe matrix complete for all in-scope paid paths except user-excluded Mistral/MiniMax; design authorized by user on 2026-06-25.
- Investigation Goal: Determine why frontend input tokens are much higher than compaction-budget `prompt_tokens`, classify whether this is expected semantics or a bug, and define any required fix.
- Scope Classification (`Small`/`Medium`/`Large`): Large.
- Scope Classification Rationale: Initial GLM screenshot accounting was correct, but provider probes found cross-provider pricing/accounting gaps that require canonical usage semantics, pricing-policy refinement, summary/API expansion, and Token Meter UI redesign.
- Scope Summary: Analyze Daily Assistant token usage display and compaction-budget relationship, then design provider-aware token/cost accounting and cache-explainability improvements.
- Primary Questions To Resolve:
  - What source feeds the frontend Token Meter input/output totals? Answer: ledger accounting deltas summed by run/team/member.
  - What source feeds `compaction_budget_evaluated.prompt_tokens`? Answer: current/latest LLM call token usage observation (`tokenUsage.input_tokens`).
  - Are the two values supposed to represent different scopes? Answer: yes.
  - If expected, are labels/log fields misleading? Answer: yes, likely.
  - If a bug, which owner should be authoritative? No core count bug; optional observability fix should keep token usage ledger as cumulative owner and compaction budget as active-context owner.

## Request Context

User observed a Daily Assistant run where the frontend Token Meter showed input 115,908 tokens, output 5,979 tokens, total 121,887 tokens, while the app log compaction-budget evaluation showed `prompt_tokens: 12625`. User expected frontend input tokens to match prompt tokens and asked whether the huge difference indicates a bug. Screenshots provided:
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_3bfb710bd2ed4b3d8574f0087becc11e/solution_designer_1efc385b44d347698819e1020318639f/context_files/ctx_ce52ea9e1bca__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_3bfb710bd2ed4b3d8574f0087becc11e/solution_designer_1efc385b44d347698819e1020318639f/context_files/ctx_54277953885b__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis`
- Current Branch: `codex/token-input-prompt-discrepancy-analysis`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-06-25.
- Task Branch: `codex/token-input-prompt-discrepancy-analysis`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: This may end as explanation-only. If user requests a fix, prefer UI/log semantic clarity and optionally native AutoByteus context-pressure exposure. Do not change compaction to cumulative token accounting.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-25 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && ls -la` | Identify repository root and working tree state before bootstrap. | Current shared checkout is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` on `personal` with unrelated untracked article files. | No |
| 2026-06-25 | Command | `git remote -v && git symbolic-ref --quiet refs/remotes/origin/HEAD && git branch --show-current && git worktree list --porcelain` | Resolve base branch and reusable worktrees. | Remote default points to `origin/personal`; no exact worktree existed for this task. | No |
| 2026-06-25 | Command | `git fetch origin --prune` | Refresh remote refs before creating task worktree. | Completed successfully. | No |
| 2026-06-25 | Command | `git worktree add -b codex/token-input-prompt-discrepancy-analysis /Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis origin/personal` | Create dedicated task worktree/branch. | Worktree created at latest `origin/personal` (`1f80dc4f`). | No |
| 2026-06-25 | Log | User screenshot `/Users/normy/.autobyteus/.../ctx_ce52ea9e1bca__image.png` | Capture compaction-budget log evidence. | `prompt_tokens: 12625`, input budget ~871k, compaction not required. | No |
| 2026-06-25 | Data | User screenshot `/Users/normy/.autobyteus/.../ctx_54277953885b__image.png` | Capture frontend token meter evidence. | Input 115,908, output 5,979, total 121,887, 10 events. | No |
| 2026-06-25 | Code | `autobyteus-ts/src/agent/loop/llm-phase.ts` | Find native AutoByteus token usage and compaction call sequence. | `LlmPhase` emits `notifyAgentTokenUsageUpdated(...)` from one `tokenUsage` observation, then calls `evaluateLlmPhaseCompaction(...)` using the same `tokenUsage`. | No |
| 2026-06-25 | Code | `autobyteus-ts/src/agent/loop/llm-phase-compaction.ts` | Determine compaction prompt-token source. | `prompt_tokens` in logs is `tokenUsage.input_tokens ?? 0`; compaction compares that per-call value against `budget.inputBudget`. | No |
| 2026-06-25 | Code | `autobyteus-ts/src/memory/policies/compaction-policy.ts` | Verify compaction threshold semantics. | `shouldCompact(promptTokens, inputBudget)` uses active prompt tokens compared to `triggerRatio * inputBudget`; it is not cumulative-spend logic. | No |
| 2026-06-25 | Code | `autobyteus-ts/src/llm/api/openai-compatible-token-usage-normalizer.ts` | Determine GLM/OpenAI-compatible provider usage mapping. | Provider `prompt_tokens` maps to `inputTokens`; raw usage is preserved. | No |
| 2026-06-25 | Code | `autobyteus-server-ts/src/token-usage/projections/token-usage-snapshot-delta-normalizer.ts` | Determine whether meter deltas are per event. | `per_call`/`per_turn` reported tokens become accounting/meter deltas. | No |
| 2026-06-25 | Code | `autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts` | Determine GraphQL summary aggregation. | Run summary sums `accounting_input_tokens`, `accounting_output_tokens`, and `accounting_total_tokens` across events; latest context fields come only from latest event if present. | No |
| 2026-06-25 | Code | `autobyteus-web/stores/tokenUsageMeterStore.ts` | Determine live frontend aggregation. | Store adds `meter_delta_*`/`accounting_*` deltas into `inputTokens`, `outputTokens`, and `totalTokens`, and increments `eventCount`. | No |
| 2026-06-25 | Code | `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Inspect UI labels and context-pressure rendering. | Panel labels cards as Input/Output/Total; context pressure renders only if context fields are numeric. | Yes, if implementing clarity fix. |
| 2026-06-25 | Doc | `autobyteus-server-ts/docs/modules/token_usage.md` | Verify intended token usage semantics. | Docs identify ledger as source of truth, frontend as display-only, and summaries as accounting deltas. | Maybe update if implementing semantics clarification. |
| 2026-06-25 | Data | `sqlite3 /Users/normy/.autobyteus/server-data/db/production.db ... token_usage_ledger_events WHERE run_id='daily_assistant_8cd560e03a494393a5df01ca127a149c'` | Reconcile screenshot numbers with actual persisted usage events. | First 10 events sum exactly to screenshot: input 115,908; output 5,979; total 121,887; cost 0.479892 CNY. Call sequence 6 has raw `prompt_tokens:12625`. | No |
| 2026-06-25 | Log | `rg -n "daily_assistant_8cd560e03a494393a5df01ca127a149c|compaction_budget_evaluated" /Users/normy/.autobyteus/logs/app.log` | Cross-check app log timing. | Multiple compaction checks occur after each model call; e.g. prompt tokens rise per call (12,625 at call 6, then 13,206 by call 10, etc.). | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Native AutoByteus `LlmPhase` receives a provider usage observation at the end of each streamed LLM call.
- Current execution flow:
  1. Provider returns raw usage for a single LLM call, e.g. GLM raw `prompt_tokens`, `completion_tokens`, and `total_tokens`.
  2. `createOpenAICompatibleTokenUsageObservation(...)` maps raw `prompt_tokens` to canonical `input_tokens` for that call.
  3. `LlmPhase` emits `agent_token_usage_updated`/`TOKEN_USAGE_UPDATED` for ledger/cost/UI accounting.
  4. Server token usage enrichment normalizes per-call readings into accounting deltas.
  5. Ledger summaries and frontend store add those deltas cumulatively across run events.
  6. `LlmPhase` then calls `evaluateLlmPhaseCompaction(...)` with the same single-call `tokenUsage`.
  7. Compaction logs `prompt_tokens` as the latest per-call `tokenUsage.input_tokens` and compares it to input budget / trigger threshold.
- Ownership or boundary observations:
  - Token usage ledger/store owns cumulative usage/cost accounting.
  - `LlmPhase`/compaction budget owns active prompt/context pressure and compaction triggering.
  - Frontend Token Meter consumes cumulative accounting summaries and only shows context pressure when server events provide context fields.
- Current behavior summary: The frontend `Input` value and compaction log `prompt_tokens` intentionally represent different scopes, but the naming does not make that obvious.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Clarification / UX Observability Fix.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue for user-visible semantics; no core arithmetic/accounting defect found.
- Refactor posture evidence summary: Existing owners are mostly correct. No broad refactor is needed if the fix is labeling. If latest context pressure is surfaced, extend the existing token usage/compaction event boundary rather than duplicating counting in the frontend.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| SQLite first 10 events | `SUM(accounting_input_tokens)=115908`, `SUM(accounting_output_tokens)=5979`, `COUNT=10`. | Frontend Token Meter cumulative arithmetic matches persisted accounting. | No |
| SQLite event 6 raw usage | Raw usage contains `prompt_tokens:12625`; compaction screenshot shows `prompt_tokens:12625` at the same timestamp. | Compaction log is per-call/latest prompt input, not cumulative run input. | No |
| `llm-phase-compaction.ts` | Compaction compares `tokenUsage.input_tokens` against `budget.inputBudget`. | Correct active-context pressure model; should not use cumulative token spend. | No |
| `TokenUsageMeterPanel.vue` | UI card says `Input` and `10 events`, but does not explain cumulative semantics. | User confusion is expected; UI copy/tooltip should be clearer. | Yes if implementing fix |
| `tokenUsageMeterStore.ts` and `TokenUsageLedgerStore` | Both aggregate accounting deltas by adding events. | The Token Meter is a run summary, not the active prompt counter. | No |
| `rg latest_context_input_tokens` | Native AutoByteus path does not emit latest context fields; UI hides context pressure when fields are absent. | Optional observability gap: active context pressure exists in compaction logs but not in Token Meter for this runtime. | Yes if implementing fix |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | Native AutoByteus LLM call orchestration and event emission. | Emits token usage from one provider call and then evaluates compaction with that same observation. | Correct place to carry latest prompt/context data if event payload needs extension. |
| `autobyteus-ts/src/agent/loop/llm-phase-compaction.ts` | Compaction-budget evaluation after each LLM phase. | Logs `prompt_tokens` from `tokenUsage.input_tokens`; computes compaction required. | Active-context pressure owner. Do not replace with cumulative usage. |
| `autobyteus-ts/src/agent/token-budget.ts` | Resolves effective context/input budget and trigger threshold. | Produces `inputBudget` and `triggerThresholdTokens`. | Correct source for budget fields if context pressure is exposed. |
| `autobyteus-ts/src/memory/policies/compaction-policy.ts` | Compaction trigger rule. | `shouldCompact(promptTokens, inputBudget)` uses current prompt tokens. | Confirms compaction is context-window based. |
| `autobyteus-ts/src/llm/api/openai-compatible-token-usage-normalizer.ts` | Provider raw usage normalization. | Maps `prompt_tokens` to canonical `input_tokens`, preserves raw usage and cache/reasoning details. | Provider usage is per-call. |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-snapshot-delta-normalizer.ts` | Converts usage readings to accounting deltas. | For `per_call`, reported tokens become accounting/meter deltas. | Cumulative meter uses deltas, not snapshots. |
| `autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts` | Builds run/team/member token summaries. | Sums accounting token deltas over all events; carries latest context fields if present. | Authoritative cumulative usage owner. |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` | Live frontend token summary state. | Adds deltas into summary and increments event count. | Frontend is presentation-only; no local accounting policy. |
| `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Token Meter UI. | Labels cumulative fields as Input/Output/Total and shows context pressure only if fields exist. | UI should clarify cumulative vs latest context if implemented. |
| `autobyteus-server-ts/docs/modules/token_usage.md` | Long-lived token usage docs. | Already documents ledger/cumulative semantics but not this specific confusion. | Docs update optional if code/copy changes. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-25 | Data probe | `sqlite3 -header -column /Users/normy/.autobyteus/server-data/db/production.db "WITH first10 AS (...) SELECT COUNT(*), SUM(accounting_input_tokens), SUM(accounting_output_tokens), SUM(accounting_total_tokens), SUM(estimated_api_total_cost) FROM first10;"` | First ten events: `10`, `115908`, `5979`, `121887`, `0.479892 CNY`. | Exact match to Token Meter screenshot; frontend cumulative accounting is correct. |
| 2026-06-25 | Data probe | `sqlite3 ... SELECT call_sequence, observed_at, accounting_input_tokens, cumulative_input, accounting_output_tokens, cumulative_output ... WHERE call_sequence <= 10;` | Cumulative input reaches 63,884 at call 6 and 115,908 at call 10. | `12625` is just call 6's prompt/input delta inside a growing cumulative run total. |
| 2026-06-25 | Data probe | `sqlite3 -json ... SELECT call_sequence, raw_usage_json ... call_sequence IN (6,10);` | Call 6 raw usage: `{"prompt_tokens":12625,"completion_tokens":98,"total_tokens":12723,...}`. Call 10 raw usage: `prompt_tokens:13206`. | Compaction log uses provider per-call prompt tokens. |

### Screenshot Run First 10 Events

| Call sequence | Observed UTC | Per-call input | Cumulative input | Per-call output | Cumulative output |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | 2026-06-25 15:42:18 | 7,043 | 7,043 | 57 | 57 |
| 2 | 2026-06-25 15:44:09 | 7,127 | 14,170 | 5,112 | 5,169 |
| 3 | 2026-06-25 15:44:16 | 12,257 | 26,427 | 55 | 5,224 |
| 4 | 2026-06-25 15:44:23 | 12,371 | 38,798 | 32 | 5,256 |
| 5 | 2026-06-25 15:44:31 | 12,461 | 51,259 | 38 | 5,294 |
| 6 | 2026-06-25 15:44:49 | 12,625 | 63,884 | 98 | 5,392 |
| 7 | 2026-06-25 15:45:18 | 12,712 | 76,596 | 299 | 5,691 |
| 8 | 2026-06-25 15:45:41 | 12,973 | 89,569 | 133 | 5,824 |
| 9 | 2026-06-25 15:45:57 | 13,133 | 102,702 | 16 | 5,840 |
| 10 | 2026-06-25 15:46:14 | 13,206 | 115,908 | 139 | 5,979 |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None consulted.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: Investigation was fully local to product code and persisted run data.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Existing local persisted production SQLite database and app log were sufficient.
- Required config, feature flags, env vars, or accounts: None.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation only.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

### Core conclusion

No core counting bug was found. The frontend number and the compaction log are different because they answer different questions:

- Frontend Token Meter `Input`: "How many input tokens has this run consumed cumulatively across model calls?"
- Compaction log `prompt_tokens`: "How large was the latest model-call prompt / active context, and is that close to the context budget?"

### Why this matters for compaction

Compression/compaction should be driven by active context pressure, not cumulative spend. A long tool loop can consume many cumulative input tokens by repeatedly sending a ~12k-token prompt. That can cost money and accumulate in the Token Meter, but it does not imply the current context is 115k tokens. In the screenshot run, the current prompt at call 6 was 12,625 tokens and the compaction threshold was 697,395 tokens, so compaction correctly stayed off.

### Product clarity gap

The current UI/log labels make the two scopes easy to conflate. The Token Meter displays `Input` and `10 events`; the compaction log displays `prompt_tokens`. Neither directly says "cumulative run input" vs "latest per-call prompt/context". Also, native AutoByteus currently does not populate the Token Meter's latest context-pressure fields, even though the compaction path has the needed numbers.

## Constraints / Dependencies / Compatibility Facts

- Token cost accounting and compaction context-budget accounting are related but intentionally not identical.
- Cumulative token usage should remain the source for spend/cost summaries.
- Compaction should remain based on current/latest active prompt or rendered context size.
- Frontend should remain display-only and should not compute authoritative pricing or compaction policy.
- Any implementation should avoid dual authoritative token definitions.

## Open Unknowns / Risks

- Product decision: explanation only, UI/log copy fix, or full context-pressure display fix?
- Product copy choice: `Cumulative input`, `Run input`, or another label.
- Log migration choice: add clearer fields while keeping `prompt_tokens`, or rename the log field outright.
- If context-pressure display is added, ensure the emitted latest prompt/context value is exactly the compaction-driving number and not a separately estimated frontend value.

## Notes For Architect Reviewer

If user approves implementation, likely design scope:
- Primary spine 1: `Provider usage -> LlmPhase -> TokenUsageUpdated event -> Server ledger summary -> Token Meter cumulative usage`.
- Primary spine 2: `Provider usage -> LlmPhase -> Compaction budget evaluator -> Compaction policy/status/log`.
- Clarify two owners instead of merging them. Ledger owns cumulative spend; compaction owns active context pressure.
- Likely no broad refactor needed; optional event-boundary extension from compaction budget into token usage summary must preserve ownership and avoid frontend recomputation.

## Cost Calculation Follow-Up — 2026-06-25

### User Follow-Up Question

User asked whether the cost calculation is really correct if most prompt tokens are cached.

### Additional Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-25 | Code | `autobyteus-server-ts/src/token-usage/pricing/token-cost-calculator.ts` | Verify formula used for cached vs uncached input. | Cost formula uses `inputTokens = billable_input_tokens ?? accounting_input_tokens`, then `standardInputTokens = inputTokens - cache_read_input_tokens - cache_creation_input_tokens`; prices standard, cache-read, cache-write, and output separately. | No for GLM/DeepSeek; maybe improve UI breakdown. |
| 2026-06-25 | Code | `autobyteus-ts/src/llm/api/openai-compatible-token-usage-normalizer.ts` | Verify provider cache token extraction. | Maps `prompt_tokens_details.cached_tokens`, top-level `cached_tokens`, or `prompt_cache_hit_tokens` to `cache_read_input_tokens`. | No |
| 2026-06-25 | Code | `autobyteus-ts/src/llm/supported-model-definitions.ts` | Verify in-repo pricing catalog for GLM and DeepSeek. | GLM-5.2 BigModel endpoint configured as CNY 8/M input, CNY 2/M cached input read, CNY 28/M output. DeepSeek V4 Flash configured USD 0.14/M miss, USD 0.0028/M hit, USD 0.28/M output; V4 Pro configured USD 0.435/M miss, USD 0.003625/M hit, USD 0.87/M output. | Check provider docs freshness periodically. |
| 2026-06-25 | Data | `sqlite3 ... SELECT call_sequence, reported_input_tokens, cache_read_input_tokens, estimated_api_* FROM token_usage_ledger_events WHERE run_id='daily_assistant_8cd560e03a494393a5df01ca127a149c' AND call_sequence <= 10` | Verify real persisted GLM row calculations. | Rows split gross input into standard and cache-read components. Example call 6: 12,625 gross input, 12,416 cached, 209 uncached, standard input cost CNY 0.001672, cache-read cost CNY 0.024832, input cost CNY 0.026504. | No |
| 2026-06-25 | Data | `sqlite3 ... WITH first10 AS (...) SELECT SUM(reported_input_tokens), SUM(cache_read_input_tokens), SUM(estimated_api_*) ...` | Verify screenshot aggregate cost breakdown. | First 10 events: gross input 115,908; cached input 102,464; uncached input 13,444; standard input cost CNY 0.107552; cache-read cost CNY 0.204928; input cost CNY 0.31248; output cost CNY 0.167412; total CNY 0.479892. | No |
| 2026-06-25 | Web | `https://api-docs.deepseek.com/quick_start/pricing` | Verify current official DeepSeek prices. | Official DeepSeek pricing page lists prices per 1M tokens and says billing is by input/output tokens. It lists V4 Flash cache hit $0.0028, cache miss $0.14, output $0.28; V4 Pro cache hit $0.003625, cache miss $0.435, output $0.87. | No |
| 2026-06-25 | Web | `https://api-docs.deepseek.com/guides/kv_cache` | Verify DeepSeek context cache semantics and fields. | DeepSeek cache is automatic; subsequent overlapping prefixes can be cache hits; usage fields include `prompt_cache_hit_tokens` and `prompt_cache_miss_tokens`. | No |
| 2026-06-25 | Web | `https://docs.z.ai/guides/overview/pricing` | Verify current Z.AI global GLM pricing. | Z.AI global docs list GLM-5.2 prices per 1M tokens: $1.4 input, $0.26 cached input, output $4.4. This differs in currency/amount from BigModel CN pricing used by current GLM endpoint; endpoint selection matters. | Potential config issue only if using global Z.AI endpoint with CN pricing catalog. |
| 2026-06-25 | Web | `https://docs.z.ai/guides/capabilities/cache` | Verify Z.AI cache semantics and field. | Z.AI docs state cache tokens are billed at discounted prices and usage exposes `usage.prompt_tokens_details.cached_tokens`. | No |

### Cost Formula Assessment

The cost calculator is structurally correct for OpenAI-compatible GLM and DeepSeek cache-hit semantics:

`standard_input = gross_input - cache_read_input - cache_creation_input`

`input_cost = standard_input * input_price + cache_read_input * cached_input_read_price + cache_creation_input * cached_input_write_price`

`total_cost = input_cost + output_cost`

For the screenshot GLM run, this formula was applied. The frontend `Input` token number is gross cumulative input, but the displayed input cost is cache-aware, not gross input multiplied by full input price.

### Confirmed Correctness For Screenshot Run

First 10 events aggregate:

- Gross input tokens: `115,908`
- Cached input tokens: `102,464`
- Uncached input tokens: `13,444`
- Standard input cost: `0.107552 CNY`
- Cache-read input cost: `0.204928 CNY`
- Total input cost: `0.31248 CNY`
- Output tokens: `5,979`
- Output cost: `0.167412 CNY`
- Total cost: `0.479892 CNY`

This matches the screenshot UI total estimate `0,4799 ¥` after rounding.

### Correctness Classification

- Core GLM/DeepSeek cache-aware cost math: Correct based on inspected code, persisted rows, and provider docs.
- Token count label: Misleading. UI shows gross cumulative input tokens, not full-price input tokens.
- Price catalog risk: Medium ongoing risk because pricing pages can change. DeepSeek current official prices match code exactly. Z.AI global USD pricing differs from the BigModel CN CNY pricing used by current GLM implementation; this is not a bug for the CN endpoint but must be explicit if supporting both endpoints.
- UI transparency gap: The Token Meter should expose cached input and/or uncached input cost breakdown so a large gross input count with a lower-than-expected cost does not look suspicious.

## Expanded Product Direction — 2026-06-25

User clarified that if the application provides token/cost accounting, it should be accurate and transparent across providers, not a simplified `Input` number plus cost with hidden cache math. The requirements were expanded from explanation-only into a medium feature: expose cache-aware token and cost breakdowns in server summaries and frontend Token Meter.

### Current API/UI Gap Confirmed

`TokenUsageUpdatedPayload` and persisted ledger rows already carry component fields:

- `cache_read_input_tokens`
- `cache_creation_input_tokens`
- `estimated_api_standard_input_cost`
- `estimated_api_cache_read_input_cost`
- `estimated_api_cache_creation_input_cost`

However, `TokenUsageRunSummaryPayload`, `TokenUsageRunSummaryGraphql`, `autobyteus-web/types/tokenUsageMeter.ts`, `tokenUsageMeterStore.ts`, and `TokenUsageMeterPanel.vue` expose/render only broad `inputTokens`, `outputTokens`, `totalTokens`, reasoning, and total input/output costs. The summary boundary is therefore too narrow for the feature's accuracy/transparency promise.

### Provider Field Mapping Inventory

- OpenAI-compatible / GLM / DeepSeek / Kimi-style path: `openai-compatible-token-usage-normalizer.ts` maps `prompt_tokens_details.cached_tokens`, top-level `cached_tokens`, or `prompt_cache_hit_tokens` to `cache_read_input_tokens`.
- Anthropic native path: `anthropic-token-usage-normalizer.ts` maps `cache_creation_input_tokens` / `cache_creation_tokens` and `cache_read_input_tokens` / `cache_read_tokens`.
- Claude Agent SDK path: `claude-session-token-usage.ts` maps snake_case/camelCase cache creation/read fields from terminal SDK usage/modelUsage.
- Gemini path: `gemini-token-usage-normalizer.ts` maps cached content token count to `cache_read_input_tokens` and billable output reasoning semantics.
- Codex app-server path: `codex-thread-token-usage.ts` maps `cachedInputTokens` to `cache_read_input_tokens`.

### Design Implication

The authoritative accounting owner should remain the server token-usage ledger/projection layer. The target change should extend the summary contract and frontend display, not create frontend pricing logic. The main semantic tightening needed is to expose component token counts and costs and avoid ambiguous interpretation of `inputTokens` as full-price input or active prompt size.

## Frontend Explainability Direction — 2026-06-25

User clarified that the Token Meter should be designed from the user's perspective, not only as raw accounting output. The UI should help users answer:

- Why is the gross input token number high?
- How much of that input was discounted by provider cache?
- What cache hit rate did this provider/run achieve?
- How much input cost came from full-price input versus cache-hit input versus cache-write input?
- Is the displayed price complete and trusted, partial, missing, local/no API bill, or mixed/incompatible?
- What does the `events` counter mean?
- Is this cumulative spend/usage or the latest active prompt/context size?

### Proposed User-Facing Metric Set

The design should prefer understandable labels and groupings over exposing raw field names directly:

| User-facing label | Server/accounting meaning | Why it helps |
| --- | --- | --- |
| Gross input / total input sent | Cumulative input tokens sent/reported across usage events. For gross-style providers this is provider prompt/input including cached tokens; for additive providers it should be base input + cache read/write buckets. | Explains the big headline number without implying full-price cost. |
| Uncached input / full-price input | Input tokens charged at standard input/miss price. | Answers what the user paid full input price for. |
| Cache hits / cached input | Input tokens served/priced as cache read/hit. | Explains why cost can be lower than gross input times full price. |
| Cache writes / cache creation | Tokens charged for creating provider-side cache entries when the provider bills writes separately. | Makes Anthropic/Qwen-style cache creation visible. |
| Cache hit rate | Cache-read input tokens divided by gross input tokens when meaningful. | Gives an intuitive percentage, e.g. the GLM screenshot achieved ~88.4% cache-hit input. |
| Effective input cost | Actual priced input cost after cache components. | Ties token breakdown to money. |
| Saved vs no-cache input | Difference between hypothetical all-standard input cost and actual cache-aware input cost when all prices are trusted. | Optional but high-value for user insight; should be hidden when price data is incomplete. |
| Output | Provider output/completion tokens. | Existing output metric. |
| Thinking/reasoning | Subset of output tokens where provider reports reasoning/thinking. | Existing but should be clear it is not extra beyond output total unless provider semantics differ. |
| Usage events / model usage reports | Number of token usage updates included in the summary. Usually one model call/turn usage report, not one user message. | Clarifies the confusing `4 events`/`10 events` label. |

### Cache State Vocabulary Needed

A zero cache count is ambiguous unless the summary also carries state. Suggested states:

- `positive`: positive cache tokens were reported.
- `zero_reported`: provider/runtime reported cache-capable fields and value was zero.
- `not_reported`: provider/runtime response did not include cache fields.
- `unsupported_or_local`: provider/runtime has no applicable paid provider-side cache concept for this run.
- `unknown`: current event/source does not let the system classify cache support.

This prevents misleading UI such as showing `0% cache` for a provider that simply did not report cache tokens, or showing `$0` for a paid endpoint without pricing.

## Provider Pricing and Cache Audit — 2026-06-25

### Source Log Additions

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-25 | Code | `autobyteus-ts/src/llm/providers.ts` | Enumerate supported providers. | Providers: `OPENAI`, `OPENAI_COMPATIBLE`, `ANTHROPIC`, `MISTRAL`, `GEMINI`, `OLLAMA`, `DEEPSEEK`, `GROK`, `AUTOBYTEUS`, `KIMI`, `QWEN`, `LMSTUDIO`, `GLM`, `MINIMAX`. | Audit all in design. |
| 2026-06-25 | Code | `autobyteus-ts/src/llm/supported-model-definitions.ts` | Inspect current pricing catalog. | Catalog includes pricing for many OpenAI, Anthropic, Mistral, Grok, DeepSeek, Gemini, Kimi, GLM, and MiniMax models; Qwen models lack pricing; several cache/tier dimensions are missing. | Correct stale/missing entries or mark price missing/partial. |
| 2026-06-25 | Code | `autobyteus-server-ts/src/token-usage/pricing/token-cost-calculator.ts` | Inspect pricing formula. | Calculator subtracts cache read/write tokens from `billable_input_tokens ?? accounting_input_tokens` to derive standard input, then prices standard/cache-read/cache-write/output components separately. | Make formula provider-semantics-aware; current global subtraction is unsafe for additive input semantics like Anthropic. |
| 2026-06-25 | Code | `autobyteus-ts/src/llm/api/anthropic-token-usage-normalizer.ts`; `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-token-usage.ts` | Verify Anthropic/Claude cache mapping. | Normalizers map `input_tokens` plus separate `cache_creation_input_tokens`/`cache_read_input_tokens`. Anthropic docs treat these as separate billing buckets, so `input_tokens` appears to be base/non-cache input, not gross input. | Add canonical input semantic and cache-write subtype handling. |
| 2026-06-25 | Code | `autobyteus-ts/src/llm/api/openai-compatible-token-usage-normalizer.ts` | Verify OpenAI-compatible cache mapping. | Maps `prompt_tokens_details.cached_tokens`, top-level `cached_tokens`, or `prompt_cache_hit_tokens` to `cache_read_input_tokens`. This path fits gross-prompt semantics for OpenAI-compatible providers such as GLM/DeepSeek/Kimi. | Preserve, but document gross semantics. |
| 2026-06-25 | Code | `autobyteus-ts/src/llm/api/gemini-token-usage-normalizer.ts` | Verify Gemini cache mapping. | Maps cached content token counts into `cache_read_input_tokens`; output/thoughts semantics handled separately. | Pricing catalog lacks cache prices for inspected Gemini models. |
| 2026-06-25 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts` | Verify Codex cache mapping. | Maps Codex `cachedInputTokens` into canonical cache-read field and provider is OpenAI. | UI should show cache for Codex runs too. |
| 2026-06-25 | Code | `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue`; `autobyteus-web/stores/tokenUsageMeterStore.ts`; `autobyteus-web/types/tokenUsageMeter.ts` | Inspect frontend summary shape. | UI/store/types only expose broad input/output/total costs and reasoning. Cache component fields and cost components are not rendered/hydrated in run summaries. | Expand GraphQL/types/store/UI. |
| 2026-06-25 | Web | `https://openai.com/api/pricing/` | Verify OpenAI current top-level model prices. | Page lists GPT-5.5 input $5/M, cached input $0.50/M, output $30/M; GPT-5.4 input $2.50/M, cached $0.25/M, output $15/M; GPT-5.4 mini input $0.75/M, cached $0.075/M, output $4.50/M. | Current catalog broadly matches top-level page; watch detailed long-context page differences. |
| 2026-06-25 | Web | `https://platform.claude.com/docs/en/about-claude/models/overview` | Verify Anthropic base model pricing. | Claude Opus 4.8/4.7: $5/M input, $25/M output. Claude Sonnet 4.6: $3/M input, $15/M output. | Catalog base/read mostly matches; cache write missing. |
| 2026-06-25 | Web | `https://platform.claude.com/docs/en/build-with-claude/prompt-caching` | Verify Anthropic prompt cache billing. | Anthropic cache write is priced separately: 5-minute writes are 1.25x base input, 1-hour writes are 2x base input, cache reads are 0.1x base input. Example rates include Opus 4.8 read $0.50/M and Sonnet 4.6 read $0.30/M. | Add cache-write pricing and TTL subtype fields or mark partial when TTL is unknown. |
| 2026-06-25 | Web | `https://ai.google.dev/gemini-api/docs/pricing` | Verify Gemini current pricing/cache pricing. | Gemini 3.1 Pro Preview page lists input $2.25/M <=200k and $4.50/M >200k, output including thinking $18/M <=200k and $27/M >200k, context caching $0.225/M and $0.45/M. Gemini 3.5 Flash lists input $1.50/M, output including thinking $9/M, context caching $0.15/M. | Current catalog appears stale/missing cache prices for inspected Gemini models. |
| 2026-06-25 | Web | `https://ai.google.dev/gemini-api/docs/caching` | Verify Gemini cache reporting. | Implicit caching is enabled for Gemini 2.5+ and usage metadata includes cache hit tokens; minimum token thresholds apply. | UI should distinguish zero vs not reported. |
| 2026-06-25 | Web | `https://mistral.ai/pricing/` | Verify Mistral pricing shape. | Mistral pricing is per million tokens processed; Mistral Large lists $2/M input and $6/M output. | Catalog Mistral Large matches; Devstral should be periodically audited. |
| 2026-06-25 | Web | `https://docs.x.ai/developers/models/grok-4.3`; `https://docs.x.ai/developers/models/grok-build-0.1` | Verify Grok prices. | Grok-4.3: $1.25/M input, $0.20/M cached input, $2.50/M output. Grok Build 0.1: $1/M input, $0.20/M cached input, $2/M output. Both docs mention higher context pricing beyond lower tiers. | Catalog base prices match; context-length tiers missing. |
| 2026-06-25 | Web | `https://api-docs.deepseek.com/quick_start/pricing`; `https://api-docs.deepseek.com/guides/kv_cache` | Verify DeepSeek prices/cache fields. | DeepSeek V4 Flash cache hit $0.0028/M, miss $0.14/M, output $0.28/M; V4 Pro cache hit $0.003625/M, miss $0.435/M, output $0.87/M. Cache is automatic and usage includes `prompt_cache_hit_tokens`/`prompt_cache_miss_tokens`. | Current catalog matches inspected docs. |
| 2026-06-25 | Web | `https://docs.z.ai/guides/overview/pricing`; `https://docs.bigmodel.cn/cn/guide/capabilities/cache` | Verify GLM/Z.AI pricing/cache. | Global Z.AI docs list GLM-5.2 USD pricing ($1.4/M input, $0.26/M cached input, $4.4/M output). BigModel China cache docs show automatic cache and `usage.prompt_tokens_details.cached_tokens`; current app endpoint/logs appear to use BigModel China CNY pricing. | Need explicit pricing identity/endpoint distinction to avoid applying CN CNY pricing to global Z.AI. |
| 2026-06-25 | Web/Curl | `https://platform.kimi.ai/docs/pricing/chat-k26.md`; `https://platform.kimi.ai/docs/pricing/chat-k27-code.md` | Verify Kimi prices. | Kimi K2.6: cache hit $0.16/M, miss $0.95/M, output $4/M. Kimi K2.7 Code: cache hit $0.19/M, miss $0.95/M, output $4/M. Kimi K2.7 Code Highspeed: cache hit $0.38/M, miss $1.90/M, output $8/M. | Add highspeed pricing or mark missing; standard K2.6/K2.7 match. |
| 2026-06-25 | Web | `https://www.alibabacloud.com/help/en/model-studio/model-pricing`; `https://www.alibabacloud.com/help/en/model-studio/context-cache` | Verify Qwen pricing/cache. | Alibaba pricing is region- and context-tier-dependent. Examples: Qwen3.7-max International/Singapore 0-1M input tier $2.5/M input and $7.5/M output; Qwen3-max International/Singapore tiers include $1.2/$6 for <=32k, $2.4/$12 for <=128k, $3/$15 for <=256k. Context cache docs state explicit cache creation is 125% of standard input and hits are 10% of standard input. | Current Qwen catalog has no pricing. Need region/tier/cache policy or mark missing/partial. |
| 2026-06-25 | Web | `https://platform.minimax.io/docs/guides/pricing-paygo` | Verify MiniMax prices. | MiniMax-M3 Standard <=512k: $0.30/M input, $0.06/M cached input, $1.20/M output; >512k: $0.60/M input, $0.12/M cached input, $2.40/M output. Priority tier is 1.5x Standard. | Catalog Standard matches; Priority tier missing if runtime uses it. |

### Provider-by-Provider Assessment

| Provider / runtime | Current status | Risk / bug classification | Required design response |
| --- | --- | --- | --- |
| OpenAI / Codex | Cache-read pricing and Codex cached input mapping exist. UI hides cache. | Mostly UI/summary gap; catalog freshness/tier complexity risk. | Expose cache components; keep server authoritative; record source/date and context-tier assumption. |
| OpenAI-compatible custom | Custom endpoint models default to trusted zero price. | Correctness bug for arbitrary paid endpoints. | Require explicit trusted pricing or show price missing/no estimate. |
| Anthropic / Claude SDK | Base input/output and cache-read price exist; cache-write price missing; additive input semantics likely not represented. | Pricing and semantic bug: global subtraction can undercount standard input; cache creation may be partial. | Add input semantic metadata; preserve cache creation TTL buckets or mark partial when ambiguous. |
| Mistral | Mistral Large price matches inspected official page; no cache mapping noted. | Low for Large; catalog freshness risk for other models. | Keep no-cache/local state clear; source metadata. |
| Gemini | Normalizer captures cache; catalog lacks cache prices and Gemini 3.1 Pro Preview appears stale versus official docs. | Pricing catalog bug/staleness; cache pricing missing. | Update pricing/tier/cache dimensions or mark partial/missing. |
| Ollama / LMStudio | Local providers use trusted zero. | UI semantics risk, not API cost bug. | Label local/no API bill instead of paid-provider `$0 est`. |
| DeepSeek | Cache-hit/miss/output pricing and cache fields match official docs. | Low. | Expose cache and hit rate; preserve current formula for gross prompt semantics. |
| Grok | Base cache/input/output prices present; higher-context tiers absent. | Partial tiering risk. | Add tier policy or mark partial when request exceeds tier assumptions. |
| AutoByteus | Pricing may come from remote model config. | Depends on remote config completeness and no visible cache dimensions. | Preserve remote pricing status; avoid claiming complete cache-aware price if cache dimensions absent. |
| Kimi | K2.6/K2.7 standard pricing matches docs; highspeed missing. | Catalog bug for highspeed. | Add highspeed pricing and expose cache; avoid fallback to wrong standard price. |
| Qwen | Pricing absent; official pricing depends on region/tier/cache. | Price missing/correctness gap. | Add configurable region/tier/cache pricing policy or mark price missing/partial. |
| GLM | Current CNY BigModel pricing matches observed calculation; global Z.AI USD differs. | Endpoint/pricing identity risk. | Keep BigModel CN pricing tied to endpoint/provider identity; do not reuse for global Z.AI. |
| MiniMax | Standard tier pricing matches docs; Priority tier missing. | Service-tier pricing gap. | Include service tier in pricing identity if used, or mark partial/missing. |

### Key Accounting Design Finding

The current `TokenCostCalculator` formula is correct for gross-prompt providers such as GLM and DeepSeek, where the provider reports total prompt/input tokens and a nested cached-token subset. It is unsafe as a universal invariant because some providers expose base input and cache buckets as separate additive billing dimensions.

Needed canonical distinction:

1. `input_count_semantic = gross_includes_cache`
   - Example: OpenAI-compatible style `prompt_tokens=12,625`, `cached_tokens=12,416`.
   - Standard input = `gross - cache_read - cache_creation`.
   - Gross input = `prompt_tokens`.

2. `input_count_semantic = base_excludes_cache`
   - Example: Anthropic-style `input_tokens=100`, `cache_read_input_tokens=900`.
   - Standard input = `input_tokens`.
   - Gross input = `input_tokens + cache_read + cache_creation`.

Without this distinction, the system can accidentally subtract cache tokens twice or undercount gross input/cache rate for Anthropic/Claude.

### Frontend Information Architecture Recommendation

A user-friendly Token Meter can stay compact while exposing the important data:

1. Top summary cards:
   - `Gross input` with a small subline: `88.4% cache hit · 13.4k uncached` when applicable.
   - `Output` with reasoning/thinking chip when present.
   - `Total estimate` with status: complete, partial, missing, mixed, or local/no API bill.

2. Expandable `Input breakdown`:
   - Uncached/full-price tokens and cost.
   - Cache hits tokens, cache hit rate, and cost.
   - Cache writes tokens and cost when present.
   - Optional saved-vs-no-cache estimate when all needed prices are trusted.

3. Expandable `Pricing status`:
   - provider/model/runtime;
   - usage event count with tooltip;
   - pricing source/status;
   - missing dimensions if partial;
   - currency/mixed-currency grouping if applicable.

4. Copy rule:
   - Avoid showing just `Input` because users infer it means full-price input or latest prompt.
   - Prefer `Gross input` / `Total input sent` and pair it with cache rate.

### Design Implication Update

The target design should not only pass existing cache component fields through to the frontend. It must tighten the authoritative accounting boundary:

- Provider normalizers must declare or produce the canonical input semantic.
- The server projection/cost summary must compute gross, standard, cache-read, cache-write, cache rates, component costs, and cost status centrally.
- The GraphQL/websocket contract must expose those server-owned fields.
- The frontend must render and explain them without recomputing price.
- The provider pricing catalog must not silently claim complete estimates for missing dimensions, wrong endpoint/currency, unsupported tiers, or unconfigured custom endpoints.

## Pricing Strategy and Event-Count UX Refinement — 2026-06-25

User clarified two additional product/design constraints:

1. If cache is used, the real price should usually be lower than a naive gross-input-times-standard-price calculation, but the exact discount must come from the provider's actual pricing policy. The design should therefore not assume one universal formula across providers.
2. The raw `events` number in the Token Meter is not inherently user valuable. If users do not need to care about token-usage event internals, the primary UI should hide or demote it rather than showing an unexplained implementation count.

### Pricing Strategy Implication

A provider/model/runtime pricing policy should own the following dimensions:

- standard input / cache miss price;
- cache read / cache hit price;
- cache creation / cache write price, including subtype or TTL where providers price subtypes differently;
- output price;
- reasoning/thinking cost inclusion rule;
- context-length tiers and tier selection basis;
- service tier, endpoint, region, and currency;
- trusted/missing/partial/local-no-bill status;
- source metadata and last-audited date where practical.

The cost calculator should consume canonical usage plus a selected pricing policy and return a structured pricing result. It should not silently make missing dimensions zero. Examples:

- GLM/DeepSeek/OpenAI-compatible gross prompt semantics: standard input is gross prompt minus cached prompt subset.
- Anthropic additive semantics: standard input is `input_tokens`; gross input is `input_tokens + cache_read + cache_creation`; cache writes need TTL-specific pricing or partial status.
- Qwen: region/context tier/cache policy is required; if region/tier is unknown, a complete estimate is unsafe.
- Custom OpenAI-compatible endpoints: no trusted price unless configured; show price missing, not `$0 est`.

### Event Count UX Implication

Current UI phrase `4 events` is implementation-oriented. It can be useful to developers as calculation provenance, but it does not directly explain price to normal users. Recommended target behavior:

- Primary Token Meter should focus on money/token insight: gross input, cache hit rate, uncached input, output, total estimate/status.
- Hide event count from the primary status line unless product decides it has user value.
- If retained, move it to `Calculation details` and label it `usage reports` or `model calls`, with copy like: `Token usage reports included in this summary. Usually one report is emitted for each model call or model turn.`
- Avoid raw `events` because users can confuse it with chat messages, UI events, tool events, or provider billing units.

## Live Experiment Protocol — 2026-06-25

User requires 100% clarity for every in-scope paid/managed provider/runtime response before marking that provider/runtime confirmed.

### Confirmation Rule

A provider/runtime is **not confirmed** from docs alone. It can only be marked confirmed after an experiment captures real usage fields from the provider API or runtime SDK path and the investigation notes record the interpretation.

After each individual experiment, immediately append an investigation entry with:

- provider/runtime/model tested;
- endpoint or SDK path used;
- prompt/cache setup used to create a cache opportunity;
- sanitized raw usage payload or exact returned usage fields;
- gross/base input tokens;
- cache-read/cache-hit tokens;
- cache-miss/uncached tokens;
- cache-write/cache-creation tokens;
- output tokens;
- reasoning/thinking tokens if present;
- concluded input-token semantic (`gross_includes_cache`, `base_excludes_cache`, or a provider-specific alternative);
- component pricing formula and example calculation;
- remaining uncertainty, if any.

### Key / Access Escalation Rule

If an API key, account, model access, or cache feature access is missing, do not infer from docs and do not mark the provider confirmed. Record the provider as `blocked_pending_key_or_access` and ask the user for the exact missing credential/access.

### Initial Experiment Matrix

| Provider/runtime path | Live experiment required? | Notes |
| --- | --- | --- |
| OpenAI provider | Yes | Include cache field and current pricing semantics. |
| Codex app-server usage mapping | Yes | Capture runtime usage payload/mapping, especially `cachedInputTokens` and reasoning. |
| Anthropic provider | Yes | Validate additive cache/input semantics and cache creation fields. |
| Claude Agent SDK usage mapping | Yes | Capture SDK usage payload shape separately from direct Anthropic API. |
| Mistral | Yes | Confirm usage payload and absence/presence of cache fields. |
| Gemini | Yes | Confirm cached content fields and thoughts/reasoning usage fields. |
| DeepSeek | Yes | Confirm `prompt_cache_hit_tokens`/miss fields. |
| Grok/xAI | Yes | Confirm cached input field shape and context-tier usage behavior if exposed. |
| Kimi | Yes | Confirm OpenAI-compatible cache fields and highspeed model usage if accessible. |
| Qwen | Yes | Confirm usage payload, cache fields, and region/tier assumptions. |
| GLM / BigModel CN / Z.AI path in product | Yes | Confirm endpoint/currency identity and `cached_tokens` field. |
| MiniMax | Yes | Confirm cache-read fields and service-tier behavior. |
| Ollama / LMStudio | No | Local/no provider API bill; UI should show local/no API bill. |
| Arbitrary OpenAI-compatible custom endpoints | No generic experiment | Cannot exhaustively validate unknown endpoints. Must require configured pricing or show price missing. |
| Remote AutoByteus provider config path | No generic experiment in this task | Depends on remote pricing metadata; safe status handling still required. |

## Experiment Scope Update — 2026-06-25

User confirmed API keys have been configured for the remaining providers and instructed that MiniMax does not need live testing in this task. MiniMax remains in docs/catalog/status handling scope, but live usage-payload confirmation is explicitly excluded unless later re-prioritized.

Next experiment pass should run small, cost-bounded probes for the remaining paid/managed provider/runtime paths. If any key/access/model is missing or rejected, record that provider as `blocked_pending_key_or_access` and ask the user for the exact missing item.

### Live Experiment Result — DeepSeek — 2026-06-25

- Status: **confirmed from live payload**.
- Evidence file: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/experiment-evidence/2026-06-25T17-13-27-750Z-deepseek-two-call.json`
- Provider/runtime/model tested: DeepSeek API via `autobyteus-ts` `DeepSeekLLM`, model `deepseek-v4-flash`.
- Probe shape: two calls with the same ~9.9k-token stable system prefix and a small changed user suffix.
- Probe call raw usage fields:
  - `prompt_tokens: 9920`
  - `completion_tokens: 2`
  - `total_tokens: 9922`
  - `prompt_tokens_details.cached_tokens: 9856`
  - `prompt_cache_hit_tokens: 9856`
  - `prompt_cache_miss_tokens: 64`
- Normalized usage from current `autobyteus-ts` path:
  - `input_tokens: 9920`
  - `cache_read_input_tokens: 9856`
  - `output_tokens: 2`
  - `total_tokens: 9922`
- Concluded input-token semantic: **gross_includes_cache**. `prompt_tokens` is gross prompt input; cached/hit tokens are a subset; miss/uncached tokens are `prompt_cache_miss_tokens` and also equal `prompt_tokens - cached_tokens` for this payload.
- Cache hit rate for probe call: `9856 / 9920 = 99.35%`.
- Pricing policy applied from current official DeepSeek V4 Flash docs/catalog:
  - cache miss/standard input: `$0.14 / 1M`
  - cache hit/read input: `$0.0028 / 1M`
  - output: `$0.28 / 1M`
- Probe call component cost:
  - standard input: `64 * 0.14 / 1_000_000 = $0.00000896`
  - cache read: `9856 * 0.0028 / 1_000_000 = $0.0000275968`
  - output: `2 * 0.28 / 1_000_000 = $0.00000056`
  - total: `$0.0000371168`
- Current implementation note: `openai-compatible-token-usage-normalizer.ts` captures `cached_tokens` / `prompt_cache_hit_tokens` correctly, but it does **not** preserve `prompt_cache_miss_tokens` as an explicit canonical field. Current calculator can infer miss tokens as `gross - cached - cache_creation` for gross-style providers; design should decide whether to preserve provider-reported miss tokens for audit/explainability.
- Remaining uncertainty: none for DeepSeek gross/cache-hit response semantics in this path.

### Live Experiment Result — GLM / BigModel CN Endpoint — 2026-06-25

- Status: **confirmed from live payload**.
- Evidence file: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/experiment-evidence/2026-06-25T17-14-01-577Z-glm-two-call.json`
- Provider/runtime/model tested: GLM via `autobyteus-ts` `GlmLLM`, endpoint `https://open.bigmodel.cn/api/coding/paas/v4/`, model `glm-5.2`.
- Probe shape: two calls with same stable prefix and small changed user suffix.
- Probe call raw usage fields:
  - `prompt_tokens: 8491`
  - `completion_tokens: 3`
  - `total_tokens: 8494`
  - `prompt_tokens_details.cached_tokens: 8448`
  - `completion_tokens_details.reasoning_tokens: 0`
- Normalized usage from current `autobyteus-ts` path:
  - `input_tokens: 8491`
  - `cache_read_input_tokens: 8448`
  - `output_tokens: 3`
  - `reasoning_output_tokens: 0`
  - `total_tokens: 8494`
- Concluded input-token semantic: **gross_includes_cache**. `prompt_tokens` is gross prompt input and `prompt_tokens_details.cached_tokens` is a cached subset.
- Cache hit rate for probe call: `8448 / 8491 = 99.49%`.
- Pricing policy applied from current app catalog for BigModel CN endpoint:
  - standard input: `¥8 / 1M`
  - cache read: `¥2 / 1M`
  - output: `¥28 / 1M`
- Probe call component cost:
  - standard input: `(8491 - 8448) * 8 / 1_000_000 = ¥0.000344`
  - cache read: `8448 * 2 / 1_000_000 = ¥0.016896`
  - output: `3 * 28 / 1_000_000 = ¥0.000084`
  - total: `¥0.017324`
- Current implementation note: GLM cache fields are correctly mapped by the OpenAI-compatible normalizer. Endpoint/pricing identity remains important because global Z.AI USD pricing differs from BigModel CN CNY pricing; the live product path tested here is the BigModel CN endpoint configured in `GlmLLM`.
- Remaining uncertainty: none for GLM BigModel CN response/cache semantics in this path.

### Live Experiment Result — Kimi — 2026-06-25

- Status: **confirmed from live payload**.
- Evidence file: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/experiment-evidence/2026-06-25T17-14-30-238Z-kimi-two-call.json`
- Provider/runtime/model tested: Kimi via `autobyteus-ts` `KimiLLM`, model `kimi-k2.7-code`.
- Probe shape: two calls with the same stable prefix and small changed user suffix.
- Probe call raw usage fields:
  - `prompt_tokens: 8627`
  - `completion_tokens: 16`
  - `total_tokens: 8643`
  - top-level `cached_tokens: 8448`
  - `prompt_tokens_details.cached_tokens: 8448`
- Normalized usage from current `autobyteus-ts` path:
  - `input_tokens: 8627`
  - `cache_read_input_tokens: 8448`
  - `output_tokens: 16`
  - `total_tokens: 8643`
- Concluded input-token semantic: **gross_includes_cache**. `prompt_tokens` is gross prompt input and `cached_tokens`/`prompt_tokens_details.cached_tokens` is a cached subset.
- Cache hit rate for probe call: `8448 / 8627 = 97.92%`.
- Pricing policy applied from current official Kimi K2.7 Code docs/catalog:
  - cache miss/standard input: `$0.95 / 1M`
  - cache hit/read input: `$0.19 / 1M`
  - output: `$4.00 / 1M`
- Probe call component cost:
  - standard input: `(8627 - 8448) * 0.95 / 1_000_000 = $0.00017005`
  - cache read: `8448 * 0.19 / 1_000_000 = $0.00160512`
  - output: `16 * 4 / 1_000_000 = $0.000064`
  - total: `$0.00183917`
- Current implementation note: OpenAI-compatible normalizer correctly maps Kimi cache fields for standard `kimi-k2.7-code`. Separate catalog issue remains for `kimi-k2.7-code-highspeed`: official highspeed prices exist but current model catalog lacks pricing.
- Remaining uncertainty: none for standard Kimi OpenAI-compatible response/cache semantics in this path. Highspeed model pricing/catalog still requires correction or explicit missing status.

### Live Experiment Result — Qwen / DashScope International Endpoint — 2026-06-25

- Status: **confirmed from live payload** for response/cache semantics; pricing interpretation is endpoint/tier-specific.
- Evidence file: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/experiment-evidence/2026-06-25T17-15-02-158Z-qwen-two-call.json`
- Provider/runtime/model tested: Qwen via `autobyteus-ts` `QwenLLM`, endpoint `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`, model `qwen3.7-max`. Probe script mapped `QWEN_API_KEY` to the class-required `DASHSCOPE_API_KEY` only in process memory.
- Probe shape: two calls with same stable prefix and small changed user suffix.
- Probe call raw usage fields:
  - `prompt_tokens: 9153`
  - `completion_tokens: 18`
  - `completion_tokens_details.reasoning_tokens: 16`
  - `prompt_tokens_details.cached_tokens: 8448`
  - `total_tokens: 9171`
- Normalized usage from current `autobyteus-ts` path:
  - `input_tokens: 9153`
  - `cache_read_input_tokens: 8448`
  - `output_tokens: 18`
  - `reasoning_output_tokens: 16`
  - `total_tokens: 9171`
- Concluded input-token semantic: **gross_includes_cache**. `prompt_tokens` is gross prompt input and `prompt_tokens_details.cached_tokens` is a cached subset.
- Cache hit rate for probe call: `8448 / 9153 = 92.30%`.
- Pricing policy interpretation for the tested endpoint/model from Alibaba Cloud Model Studio docs:
  - endpoint is DashScope International-compatible mode;
  - model `qwen3.7-max` falls in the `0 < input tokens <= 1M` tier for this probe;
  - standard input listed as `$2.50 / 1M` and output as `$7.50 / 1M` for International/Singapore;
  - context cache docs state cache hits are charged at `10%` of standard input, so cache-read input is interpreted as `$0.25 / 1M` for this tier.
- Probe call component cost under that policy:
  - standard input: `(9153 - 8448) * 2.5 / 1_000_000 = $0.0017625`
  - cache read: `8448 * 0.25 / 1_000_000 = $0.002112`
  - output: `18 * 7.5 / 1_000_000 = $0.000135`
  - total: `$0.0040095`
- Current implementation note: Qwen currently has no trusted pricing config in `supported-model-definitions.ts`, despite live usage exposing cache and reasoning fields. The design must add endpoint/region/tier/cache-aware pricing policy or mark Qwen price missing/partial.
- Remaining uncertainty: no uncertainty for response cache field semantics in this path. Pricing must remain tied to endpoint/region/tier; a complete estimate is only safe when that pricing identity is known.

### Live Experiment Result — Grok / xAI — 2026-06-25

- Status: **confirmed from live payload**, with a current implementation bug identified.
- Evidence file: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/experiment-evidence/2026-06-25T17-15-40-733Z-grok-two-call.json`
- Provider/runtime/model tested: Grok via `autobyteus-ts` `GrokLLM`, model `grok-build-0.1`.
- Probe shape: two calls with same stable prefix and small changed user suffix.
- Probe call raw usage fields:
  - `prompt_tokens: 8223`
  - `completion_tokens: 2`
  - `completion_tokens_details.reasoning_tokens: 277`
  - `total_tokens: 8502`
  - `prompt_tokens_details.cached_tokens: 64`
  - `prompt_tokens_details.text_tokens: 8223`
  - `cost_in_usd_ticks: 87298000`
- Normalized usage from current `autobyteus-ts` path:
  - `input_tokens: 8223`
  - `cache_read_input_tokens: 64`
  - `output_tokens: 2`
  - `reasoning_output_tokens: 277`
  - `total_tokens: 8502`
- Concluded input-token semantic: **gross_includes_cache**. `prompt_tokens` is gross prompt input and `prompt_tokens_details.cached_tokens` is a cached subset.
- Output/reasoning semantic: **reasoning tokens are billable output tokens for this xAI response**. Evidence: `total_tokens = 8223 + 2 + 277 = 8502`, and provider `cost_in_usd_ticks` matches pricing when reasoning is included in output cost.
- Cache hit rate for probe call: `64 / 8223 = 0.78%`.
- Pricing policy applied from xAI `grok-build-0.1` docs/catalog:
  - standard input: `$1.00 / 1M`
  - cache read: `$0.20 / 1M`
  - output/reasoning: `$2.00 / 1M`
- Probe call component cost:
  - standard input: `(8223 - 64) * 1 / 1_000_000 = $0.008159`
  - cache read: `64 * 0.2 / 1_000_000 = $0.0000128`
  - output including reasoning: `(2 + 277) * 2 / 1_000_000 = $0.000558`
  - total: `$0.0087298`
  - This corresponds to raw `cost_in_usd_ticks: 87298000` if ticks are interpreted as 1e-10 USD units.
- Current implementation bug: `openai-compatible-token-usage-normalizer.ts` records `output_tokens = completion_tokens = 2` and `reasoning_output_tokens = 277`, but does **not** set `billable_output_tokens = completion_tokens + reasoning_tokens`. A cost calculator that prices only `reported_output_tokens` will undercharge xAI reasoning output. The target design must carry billable output semantics or provider-specific output semantics.
- Remaining uncertainty: no uncertainty for Grok response/cache/reasoning semantics in this path. Higher-context tier selection still needs policy support if requests exceed documented tier thresholds.

### Live Experiment Result — OpenAI Responses API — 2026-06-25

- Status: **confirmed from live payload**.
- Evidence file: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/experiment-evidence/2026-06-25T17-20-36-099Z-openai-two-call.json`
- Provider/runtime/model tested: OpenAI via `autobyteus-ts` `OpenAILLM` / Responses API path, model `gpt-5.4-mini`.
- Probe shape: two calls with the same ~8.9k-token stable system prefix and a small changed user suffix.
- Probe call raw usage fields:
  - `input_tokens: 8886`
  - `input_tokens_details.cached_tokens: 8448`
  - `output_tokens: 6`
  - `output_tokens_details.reasoning_tokens: 0`
  - `total_tokens: 8892`
- Normalized usage from current `autobyteus-ts` path:
  - `input_tokens: 8886`
  - `cache_read_input_tokens: 8448`
  - `output_tokens: 6`
  - `reasoning_output_tokens: 0`
  - `total_tokens: 8892`
- Concluded input-token semantic: **gross_includes_cache**. `input_tokens` is gross prompt/input and `input_tokens_details.cached_tokens` is a cached subset.
- Output/reasoning semantic for this payload: `output_tokens` is the billable output total and `output_tokens_details.reasoning_tokens` is a subset/breakdown. Historical OpenAI probes in `/tickets/done/token-usage-pricing-ui/probe-results/` also showed nonzero reasoning tokens included inside `output_tokens`.
- Cache hit rate for probe call: `8448 / 8886 = 95.07%`.
- Pricing policy applied from current app catalog for `gpt-5.4-mini`:
  - standard input: `$0.75 / 1M`
  - cache read: `$0.075 / 1M`
  - output: `$4.50 / 1M`
- Probe call component cost:
  - standard input: `(8886 - 8448) * 0.75 / 1_000_000 = $0.0003285`
  - cache read: `8448 * 0.075 / 1_000_000 = $0.0006336`
  - output: `6 * 4.5 / 1_000_000 = $0.000027`
  - total: `$0.0009891`
- Current implementation note: OpenAI Responses usage is correctly mapped by `openai-compatible-token-usage-normalizer.ts` for gross input, cache-read input, output, and reasoning subset. Unlike Grok/xAI, OpenAI reasoning is already included in `output_tokens`; no separate `billable_output_tokens` override is needed for this OpenAI payload.
- Historical comparison: Previous done-ticket probes confirmed the same Responses API usage shape for non-stream and stream, but with `cached_tokens: 0`. This run adds positive cache-hit evidence.
- Remaining uncertainty: none for OpenAI Responses API usage/cache semantics in this path.

## Two-Round Cache Probe Rule — 2026-06-25

User clarified that all LLM cache experiments must use at least two rounds/calls. This is now a hard protocol rule.

Rationale:

- A single call usually has nothing provider-side to reuse unless the provider already has a shared/common prefix cache outside the experiment.
- To confirm cache behavior, the experiment must first send a stable repeated prefix, then send a second call/turn with the same prefix and a small changed suffix.
- The first call can warm/create cache; the second or later call is the meaningful cache-read/cache-hit observation.
- Single-call historical probes are useful for response field-shape reconnaissance, but they cannot mark cache behavior 100% confirmed.

Current status under this rule:

- Confirmed by two-call current probes: OpenAI, DeepSeek, GLM, Kimi, Qwen, Grok, Gemini.
- Historical one-shot evidence only / not enough for cache confirmation: Anthropic direct, Claude Agent SDK runtime, Mistral, older Gemini/OpenAI small-prompt files.
- MiniMax remains excluded from live probes by user instruction.

The probe harness now uses two calls for every provider. Provider-specific caveat found during Gemini probing: Gemini's renderer skips `MessageRole.SYSTEM`, so the repeated prefix must be included in user content or `LLMConfig.systemMessage`; the successful Gemini cache probe used a two-call repeated user-prefix setup.

### Live Experiment Result — Gemini / Vertex API-Key Runtime — 2026-06-25

- Status: **confirmed from live two-call payload**, with a current normalizer gap identified.
- Evidence file: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/experiment-evidence/2026-06-25T17-22-00-848Z-gemini-two-call.json`
- Provider/runtime/model tested: Gemini via `autobyteus-ts` `GeminiLLM`, runtime initialized from `VERTEX_AI_API_KEY`, model `gemini-3-flash-preview`.
- Probe shape: two calls with the same stable repeated prefix and a small changed suffix. Gemini-specific correction: because `GeminiPromptRenderer` skips `MessageRole.SYSTEM`, the repeated prefix was placed in user content for this confirmed run.
- Probe call raw usage fields:
  - `promptTokenCount: 9925`
  - `cachedContentTokenCount: 8168`
  - `cacheTokensDetails: [{ modality: "TEXT", tokenCount: 8168 }]`
  - `totalTokenCount: 9937`
  - `thoughtsTokenCount: 12`
  - `trafficType: "ON_DEMAND"`
  - `promptTokensDetails: [{ modality: "TEXT", tokenCount: 9925 }]`
  - no `candidatesTokenCount` was present in this payload.
- Normalized usage from current `autobyteus-ts` path:
  - `input_tokens: 9925`
  - `cache_read_input_tokens: 8168`
  - `output_tokens: null`
  - `reasoning_output_tokens: 12`
  - `billable_output_tokens: null`
  - `total_tokens: 9937`
  - quality flag: `output_tokens_missing`
- Concluded input-token semantic: **gross_includes_cache**. `promptTokenCount` is gross prompt input and `cachedContentTokenCount` / `cacheTokensDetails` is a cached subset.
- Cache hit rate for probe call: `8168 / 9925 = 82.30%`.
- Output/thinking semantic: this payload has `thoughtsTokenCount: 12` and `totalTokenCount - promptTokenCount = 12`, but no `candidatesTokenCount`. Therefore the billable output total for this response appears to be the thoughts token count, even though the current normalizer marks `output_tokens`/`billable_output_tokens` missing because `candidatesTokenCount` is absent.
- Current implementation bug/gap: `gemini-token-usage-normalizer.ts` should handle Gemini payloads where `thoughtsTokenCount` is present and `candidatesTokenCount` is absent. At minimum, it should set billable output from `totalTokenCount - promptTokenCount` or provider-specific output calculation when safe, and keep visible text output separate from billable output. It already captures `cachedContentTokenCount` correctly.
- Pricing policy implication: Gemini cache pricing must be model/tier-aware and current catalog lacks cache-read prices for inspected models. For `gemini-3-flash-preview`, cost status should remain partial/missing until model-current cache pricing is configured; for models with official cache pricing, use cache-read component pricing.
- Remaining uncertainty: no uncertainty for Gemini gross/cache field semantics in this two-call path. Output/billable-token normalization needs implementation correction for `thoughtsTokenCount`-only payloads.

## Experiment Scope Update — Mistral Excluded — 2026-06-25

User explicitly excluded Mistral from live probing on 2026-06-25. Mistral remains in provider pricing/catalog audit scope and should have safe status handling, but it does not need a live two-round cache/pricing experiment in this task. Remaining live experiment targets are Anthropic direct API, Claude Agent SDK runtime, and Codex runtime, because OpenAI/DeepSeek/GLM/Kimi/Qwen/Grok/Gemini are already confirmed from two-round probes and MiniMax is also excluded.

### Live Experiment Result — Anthropic Direct API — 2026-06-25

- Status: **confirmed from live two-call payload**.
- Evidence file: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/experiment-evidence/2026-06-25T17-27-56-521Z-anthropic-anthropic-cache.json`
- Provider/runtime/model tested: Anthropic direct Messages API via `autobyteus-ts` `AnthropicLLM`, model `claude-sonnet-4-6`.
- Probe shape: two calls with same large stable prefix in Anthropic `system` blocks using explicit `{ cache_control: { type: "ephemeral" } }`, and a small changed user suffix.
- Probe call raw usage fields:
  - `input_tokens: 11`
  - `cache_creation_input_tokens: 0`
  - `cache_read_input_tokens: 10436`
  - `cache_creation.ephemeral_5m_input_tokens: 0`
  - `cache_creation.ephemeral_1h_input_tokens: 0`
  - `output_tokens: 5`
  - `service_tier: "standard"`
  - `inference_geo: "global"`
- Warmup call raw usage fields showed cache write/create:
  - `input_tokens: 11`
  - `cache_creation_input_tokens: 10436`
  - `cache_read_input_tokens: 0`
  - `cache_creation.ephemeral_5m_input_tokens: 10436`
  - `cache_creation.ephemeral_1h_input_tokens: 0`
  - `output_tokens: 5`
- Normalized usage from current `autobyteus-ts` path for probe call:
  - `input_tokens: 11`
  - `cache_read_input_tokens: 10436`
  - `cache_creation_input_tokens: 0`
  - `output_tokens: 5`
  - `total_tokens: 16`
- Concluded input-token semantic: **base_excludes_cache / additive provider buckets**. Anthropic `input_tokens` is base/non-cache input, while `cache_read_input_tokens` and `cache_creation_input_tokens` are separate additive prompt-cache buckets. Gross input for the probe call is `11 + 10436 + 0 = 10447`; cache hit rate is `10436 / 10447 = 99.89%`.
- Pricing policy applied from Anthropic prompt caching docs for Claude Sonnet 4.6:
  - base input: `$3.00 / 1M`
  - 5-minute cache write: `$3.75 / 1M` (1.25x base)
  - 1-hour cache write: `$6.00 / 1M` (2x base)
  - cache read: `$0.30 / 1M` (0.1x base)
  - output: `$15.00 / 1M`
- Probe call component cost:
  - base input: `11 * 3 / 1_000_000 = $0.000033`
  - cache read: `10436 * 0.30 / 1_000_000 = $0.0031308`
  - cache write: `0`
  - output: `5 * 15 / 1_000_000 = $0.000075`
  - total: `$0.0032388`
- Warmup call cache-write cost under the same policy:
  - base input: `11 * 3 / 1_000_000 = $0.000033`
  - 5-minute cache write: `10436 * 3.75 / 1_000_000 = $0.039135`
  - output: `5 * 15 / 1_000_000 = $0.000075`
  - total: `$0.039243`
- Current implementation bugs/gaps:
  - `anthropic-token-usage-normalizer.ts` captures total `cache_creation_input_tokens` and `cache_read_input_tokens`, but current canonical usage lacks subtype fields for `cache_creation.ephemeral_5m_input_tokens` vs `ephemeral_1h_input_tokens`. Anthropic write pricing cannot be correct without preserving those subtypes or marking cache-write pricing partial when subtype is unknown.
  - Current global cost formula `standard = input_tokens - cache_read - cache_creation` is wrong for Anthropic additive semantics. For the probe call it would clamp standard input to zero and undercount the base `11` input tokens. The target calculator must use provider/input semantic metadata.
  - Current normalized `total_tokens` becomes `input_tokens + output_tokens = 16`, which hides gross prompt/cache volume. Target summary must expose both provider/base input and gross input including cache buckets.
- Remaining uncertainty: none for Anthropic direct response/cache semantics in this path. Cache-write subtype preservation is required for accurate pricing.

### Live Experiment Result — Claude Agent SDK Runtime — 2026-06-25

- Status: **confirmed from live two-round runtime payload** for the tested SDK path.
- Evidence file: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/experiment-evidence/2026-06-25T17-29-53-376Z-claude-agent-sdk-two-round.json`
- Provider/runtime/model tested: `@anthropic-ai/claude-agent-sdk` `query()` runtime, model `claude-sonnet-4-6`, API-key auth mode.
- Probe shape: two sequential SDK queries with the same large stable prefix. The first query used a generated `sessionId`; the second query resumed that SDK session and repeated the stable prefix with a changed marker suffix. Built-in tools were disabled (`tools: []`) and thinking was disabled for a minimal accounting signal.
- Warmup terminal `result.usage`:
  - `input_tokens: 10298`
  - `cache_creation_input_tokens: 0`
  - `cache_read_input_tokens: 0`
  - `cache_creation.ephemeral_1h_input_tokens: 0`
  - `cache_creation.ephemeral_5m_input_tokens: 0`
  - `output_tokens: 30`
  - `service_tier: "standard"`
- Probe/resumed terminal `result.usage`:
  - `input_tokens: 20480`
  - `cache_creation_input_tokens: 0`
  - `cache_read_input_tokens: 0`
  - `cache_creation.ephemeral_1h_input_tokens: 0`
  - `cache_creation.ephemeral_5m_input_tokens: 0`
  - `output_tokens: 27`
  - `service_tier: "standard"`
- Probe/resumed `modelUsage["claude-sonnet-4-6"]`:
  - `inputTokens: 20480`
  - `outputTokens: 27`
  - `cacheReadInputTokens: 0`
  - `cacheCreationInputTokens: 0`
  - `costUSD: 0.103075`
  - `contextWindow: 200000`
  - `maxOutputTokens: 32000`
- Concluded runtime accounting source: **terminal `result.usage` / `result.modelUsage` only**. Assistant rows can carry partial/duplicate usage and should not be summed for canonical accounting.
- Concluded cache behavior for tested SDK runtime path: **no provider cache read/write was reported**, even on the resumed second turn with a repeated stable prefix. Cache state should be `zero_reported` for the observed terminal usage fields, not `positive`.
- Concluded input-token semantic for this runtime payload: **base/input tokens reported as the SDK terminal total for the turn/session payload; cache buckets are separate fields but zero in this probe**. If future SDK payloads report positive `cacheReadInputTokens`/`cacheCreationInputTokens`, the same Anthropic additive semantic should be used rather than gross subtraction.
- Pricing/cost note:
  - Public Anthropic API Sonnet 4.6 pricing would price the probe turn as `20480 * $3/M + 27 * $15/M = $0.061845` with no cache.
  - SDK `modelUsage.costUSD` reports `$0.103075`, which equals `20480 * $5/M + 27 * $25/M`, i.e. Opus-style pricing, despite the modelUsage key being `claude-sonnet-4-6`.
  - Therefore `modelUsage.costUSD` should be preserved as raw diagnostic/provider-runtime-reported data but should not replace canonical server-side estimated pricing unless the product explicitly chooses to display SDK-reported cost separately with a clear source/status.
- Current implementation implication: `claude-session-token-usage.ts` is correct to use terminal result usage/modelUsage as the event source and preserve raw modelUsage diagnostics. The new pricing-policy design must still handle additive cache fields if future SDK runtime output reports positive cache tokens.
- Remaining uncertainty: no uncertainty for the tested Claude Agent SDK runtime response/cache fields. The meaning/source of SDK `modelUsage.costUSD` differs from public API pricing and must be treated as a separate raw diagnostic, not canonical price truth.

### Live Experiment Result — Codex App Server Runtime — 2026-06-25

- Status: **confirmed from live two-round runtime payload**.
- Evidence file: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/experiment-evidence/2026-06-25T17-33-27-472Z-codex-runtime-two-round.json`
- Probe harness: ticket probe source at `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/scripts/codex-runtime-two-round-probe.test.ts`; temporarily copied into the server test tree for Vitest module resolution and removed after execution.
- Provider/runtime/model tested: AutoByteus real `codex_app_server` runtime, model `gpt-5.4-mini`, in-process GraphQL/WebSocket harness, two sequential user messages in the same agent run.
- Probe shape: two user messages with the same 260-line stable prefix and different marker suffixes. Captured runtime `TOKEN_USAGE_UPDATED` payloads from the normal app WebSocket/ledger pipeline.
- Warmup event key raw fields:
  - runtime: `codex_app_server`
  - ingestion: `codex_thread_token_usage`
  - usage scope: `per_turn`
  - `reported_input_tokens/accounting_input_tokens: 18378`
  - `cache_read_input_tokens: 4480`
  - `reported_output_tokens/accounting_output_tokens: 31`
  - `reasoning_output_tokens: 22`
  - `reported_total_tokens/accounting_total_tokens: 18409`
  - `effective_context_budget_tokens: 258400`
  - raw usage selected from Codex `tokenUsage.last`.
- Probe/second event key raw fields:
  - runtime: `codex_app_server`
  - ingestion: `codex_thread_token_usage`
  - usage scope: `per_turn`
  - `reported_input_tokens/accounting_input_tokens: 26469`
  - `cache_read_input_tokens: 18304`
  - `reported_output_tokens/accounting_output_tokens: 22`
  - `reasoning_output_tokens: 14`
  - `reported_total_tokens/accounting_total_tokens: 26491`
  - `effective_context_budget_tokens: 258400`
  - raw event also included cumulative `tokenUsage.total` `{ inputTokens: 44847, cachedInputTokens: 22784, outputTokens: 53, reasoningOutputTokens: 36, totalTokens: 44900 }`.
- Concluded input-token semantic: **gross_includes_cache**. Codex `tokenUsage.last.inputTokens` is gross per-turn input and `cachedInputTokens` is a cached subset. For cumulative snapshots, `tokenUsage.total` is cumulative gross and cumulative cached subset; the runtime adapter should prefer `last` when present and use snapshot delta logic only when only `total` is available.
- Cache hit rate:
  - warmup: `4480 / 18378 = 24.38%` (Codex/OpenAI runtime already had some reusable prefix/tool/runtime cache even on the first app turn).
  - probe/second turn: `18304 / 26469 = 69.15%`.
- Output/reasoning semantic: Codex `reasoningOutputTokens` is a subset of output tokens. Evidence: second turn `totalTokens = inputTokens + outputTokens = 26469 + 22 = 26491`; reasoning `14` is not additive on top of output.
- Pricing policy applied from OpenAI/catalog for `gpt-5.4-mini`:
  - standard input: `$0.75 / 1M`
  - cache read: `$0.075 / 1M`
  - output: `$4.50 / 1M`
- Probe/second event component cost from emitted server payload:
  - standard input tokens: `26469 - 18304 = 8165`
  - standard input cost: `$0.00612375`
  - cache-read cost: `$0.0013728`
  - output cost: `$0.000099`
  - total: `$0.00759555`
- Run summary after two events:
  - input tokens: `44847`
  - output tokens: `53`
  - total tokens: `44900`
  - reasoning output tokens: `36`
  - event count: `2`
  - total estimated cost: `$0.01849455`
- Current implementation note: Codex runtime adapter is correctly mapping first-class `cachedInputTokens`, `reasoningOutputTokens`, `modelContextWindow`, and `last` vs `total` semantics into the canonical token usage pipeline. The frontend still needs better cache-aware presentation and should not expose raw `eventCount` as unexplained user-facing `events`.
- Remaining uncertainty: none for Codex App Server runtime token usage/cache/reasoning fields in this two-round path.

## Final Live Probe Matrix — 2026-06-25

A consolidated provider/runtime probe matrix was written to:

`/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/provider-probe-matrix.md`

Final live probe status:

- Confirmed from two-round evidence: OpenAI Responses API, Codex App Server runtime, Anthropic direct API, Claude Agent SDK runtime, Gemini, DeepSeek, Grok/xAI, Kimi, Qwen, GLM.
- Explicitly excluded by user from live probes: Mistral, MiniMax.
- Out of live paid-provider probe scope: Ollama, LMStudio, arbitrary OpenAI-compatible custom endpoints, remote AutoByteus provider config path.

The probe matrix is now the design input for provider-specific pricing/accounting strategy.

## Frontend Context-Size Refinement — 2026-06-25

User clarified that the frontend should show current prompt/context-size statistics only, not a compaction/compression decision message.

Desired UI concept:

- A separate section from cumulative usage/cost.
- Shows the latest/current prompt size over the effective context window.
- Shows the ratio/percent used.
- Does not need copy like `compression not needed`, `compaction required`, or other policy/status wording.

Implementation implication:

- Reuse or complete existing summary fields where possible:
  - `latest_context_input_tokens`
  - `effective_context_window_tokens` / existing `effective_context_budget_tokens` if it is confirmed to mean total context window
  - `context_pressure_percent`
- Ensure the values are populated consistently from the same backend owner that knows the rendered/latest prompt/context size.
- Frontend should label this as statistics, for example `Current prompt` or `Current context`, not as a compaction status. The denominator should be the effective context window, not the input budget after output reservation/safety margin.


### Current Prompt / Context Window Source Clarification

The simple frontend statistic should use these canonical meanings:

- `latestPromptTokens`: the latest model-call prompt/input size, using gross prompt tokens when cache buckets are reported separately.
- `effectiveContextWindowTokens`: the effective total context window for the selected runtime/model, not the input budget after output reservation or safety margin.
- `contextWindowUsagePercent`: `latestPromptTokens / effectiveContextWindowTokens * 100` when both values are known.

Runtime source mapping:

- Codex app-server runtime: `latestPromptTokens = tokenUsage.last.inputTokens`; `effectiveContextWindowTokens = tokenUsage.modelContextWindow`.
- Claude Agent SDK runtime: `latestPromptTokens = input_tokens + cache_read_input_tokens + cache_creation_input_tokens`; `effectiveContextWindowTokens = modelUsage[model].contextWindow` when present, else trusted model catalog context window.
- Native AutoByteus runtime: derive `latestPromptTokens` from the normalized provider usage observation's gross prompt/input tokens, and derive `effectiveContextWindowTokens` from `resolveTokenBudget(...).effectiveContextCapacity` in the LLM phase. Do not use `inputBudget` as the denominator for this simple UI statistic.
